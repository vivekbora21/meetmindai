import { useState, useEffect } from "react";
import { chatService } from "../services/chat.service";
import { ChatMessage, ChatSession } from "../types/chat";

export function useChat(meetingId: string) {
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatStatus, setChatStatus] = useState<"idle" | "thinking" | "searching" | "generating">("idle");
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [newTitleVal, setNewTitleVal] = useState("");
  const [showExportMenu, setShowExportMenu] = useState(false);

  const fetchChatSession = async (sessionId: string) => {
    try {
      const data = await chatService.getSessionDetails(sessionId);
      setActiveSession(data);
      if (data.messages && data.messages.length > 0) {
        setChatMessages(data.messages.map((m: any) => ({ role: m.role, text: m.text })));
      } else {
        setChatMessages([]);
      }
    } catch (e) {
      console.error("Failed to fetch session messages", e);
    }
  };

  const fetchSessionsListSilent = async () => {
    try {
      const data = await chatService.getSessions(meetingId);
      setSessions(data);
      if (activeSessionId) {
        const current = data.find((s: any) => s.id === activeSessionId);
        if (current) setActiveSession(current);
      }
    } catch (e) {
      console.warn("Silent sessions fetch failed:", e);
    }
  };

  const initializeSessions = async () => {
    try {
      const data = await chatService.getSessions(meetingId);
      setSessions(data);
      if (data && data.length > 0) {
        const latestSession = data[0];
        setActiveSessionId(latestSession.id);
        setActiveSession(latestSession);
        fetchChatSession(latestSession.id);
      } else {
        const newData = await chatService.createSession(meetingId, "New Chat");
        setSessions([newData]);
        setActiveSessionId(newData.id);
        setActiveSession(newData);
        setChatMessages([]);
      }
    } catch (e) {
      console.error("Initialization of sessions failed:", e);
    }
  };

  useEffect(() => {
    if (meetingId) {
      initializeSessions();
    }
  }, [meetingId]);

  const handleNewChat = async () => {
    try {
      const data = await chatService.createSession(meetingId, "New Chat");
      setSessions(prev => [data, ...prev]);
      setActiveSessionId(data.id);
      setActiveSession(data);
      setChatMessages([]);
    } catch (e) {
      console.error("Failed to create new chat session", e);
    }
  };

  const handleClearChat = async () => {
    if (!activeSessionId) return;
    if (!confirm("Are you sure you want to clear this session's history?")) return;
    try {
      const ok = await chatService.clearSessionMessages(activeSessionId);
      if (ok) {
        setChatMessages([]);
      }
    } catch (e) {
      console.error("Failed to clear chat messages", e);
    }
  };

  const handleToggleArchive = async (archiveVal: boolean) => {
    if (!activeSessionId) return;
    try {
      const data = await chatService.updateArchiveStatus(activeSessionId, archiveVal);
      setActiveSession(data);
      setSessions(prev => prev.map(s => s.id === data.id ? data : s));
    } catch (e) {
      console.error("Failed to toggle archive status", e);
    }
  };

  const handleRenameTitle = async () => {
    if (!activeSessionId || !newTitleVal.trim()) return;
    try {
      const data = await chatService.updateTitle(activeSessionId, newTitleVal.trim());
      setActiveSession(data);
      setSessions(prev => prev.map(s => s.id === data.id ? data : s));
      setIsEditingTitle(false);
    } catch (e) {
      console.error("Failed to rename chat session", e);
    }
  };

  const submitChatQuestion = async (questionVal: string) => {
    if (!questionVal.trim() || !activeSessionId) return;

    const userMsg: ChatMessage = { role: "user", text: questionVal.trim() };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput("");
    setChatLoading(true);
    setChatStatus("searching");

    try {
      const response = await fetch(chatService.getSendMessageUrl(activeSessionId), {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          question: questionVal.trim()
        }),
        credentials: "include"
      });

      if (response.ok) {
        if (!response.body) {
          throw new Error("No response body received for streaming.");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let done = false;
        let accumulated = "";

        setChatMessages(prev => [...prev, { role: "assistant", text: "" }]);
        setChatStatus("generating");

        while (!done) {
          const { value, done: doneReading } = await reader.read();
          done = doneReading;
          const chunkValue = decoder.decode(value);
          accumulated += chunkValue;

          setChatMessages(prev => {
            const copy = [...prev];
            if (copy.length > 0) {
              copy[copy.length - 1] = { role: "assistant", text: accumulated };
            }
            return copy;
          });
        }

        setChatStatus("idle");
        setChatLoading(false);

        fetchChatSession(activeSessionId);
        fetchSessionsListSilent();
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert(errorData.detail || "Failed to get AI answer.");
        setChatLoading(false);
        setChatStatus("idle");
      }
    } catch (e) {
      console.error("Streaming error:", e);
      setChatStatus("generating");
      setTimeout(() => {
        const reply = "I apologize, but I encountered a network error while connecting to the AI assistant. Please try again.";
        setChatMessages(prev => [...prev, { role: "assistant", text: reply }]);
        setChatStatus("idle");
        setChatLoading(false);
      }, 500);
    }
  };

  const handleSuggestedQuestionClick = (question: string) => {
    submitChatQuestion(question);
  };

  const copyToClipboard = () => {
    const formatted = chatMessages
      .map(m => `${m.role === "user" ? "User" : "MeetingMind AI"}: ${m.text}`)
      .join("\n\n");
    navigator.clipboard.writeText(formatted);
    alert("Chat history copied to clipboard!");
  };

  const exportMarkdown = () => {
    let mdContent = `# Chat Session: ${activeSession?.title || "Discussion"}\n\n`;
    chatMessages.forEach(msg => {
      mdContent += `### ${msg.role === "user" ? "User" : "MeetingMind AI"}\n${msg.text}\n\n`;
    });
    const blob = new Blob([mdContent], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(activeSession?.title || "chat_history").toLowerCase().replace(/\s+/g, "_")}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    let html = `<html><head><title>${activeSession?.title || "Chat History"}</title>`;
    html += `<style>body{font-family:sans-serif;padding:40px;color:#102C23;} h1{color:#113229;} .msg{margin-bottom:20px;padding:15px;border-radius:10px;} .user{background:#e6f4f1;border-left:4px solid #113229;} .assistant{background:#f8fafc;border-left:4px solid #94a3b8;} .role{font-weight:bold;margin-bottom:5px;font-size:12px;text-transform:uppercase;color:#64748b;}</style></head><body>`;
    html += `<h1>${activeSession?.title || "Meeting Chat Session"}</h1>`;
    chatMessages.forEach(msg => {
      html += `<div class="msg ${msg.role === "user" ? "user" : "assistant"}">`;
      html += `<div class="role">${msg.role === "user" ? "User" : "MeetingMind AI"}</div>`;
      html += `<div>${msg.text}</div>`;
      html += `</div>`;
    });
    html += `</body></html>`;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  };

  return {
    chatInput,
    setChatInput,
    chatMessages,
    chatLoading,
    chatStatus,
    sessions,
    activeSessionId,
    setActiveSessionId,
    activeSession,
    isEditingTitle,
    setIsEditingTitle,
    newTitleVal,
    setNewTitleVal,
    showExportMenu,
    setShowExportMenu,
    handleNewChat,
    handleClearChat,
    handleToggleArchive,
    handleRenameTitle,
    submitChatQuestion,
    handleSuggestedQuestionClick,
    copyToClipboard,
    exportMarkdown,
    exportPDF,
    fetchChatSession
  };
}
