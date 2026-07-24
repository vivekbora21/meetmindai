"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { 
  Sparkles, 
  MessageSquare, 
  Trash2, 
  SlidersHorizontal, 
  User, 
  Briefcase, 
  Layers, 
  Send, 
  Check, 
  Copy, 
  RefreshCw, 
  Bot, 
  ChevronRight, 
  Clock,
  ExternalLink,
  X,
  Plus,
  Loader2,
  AlertCircle
} from "lucide-react";
import { getApiUrl, parseUTCDate } from "../../config";

interface Source {
  chunk_id: string;
  meeting_id: string;
  meeting_title: string;
  meeting_date: string;
  platform: string;
  chunk_index: number;
  chunk_text: string;
  speaker: string;
  timestamp_start: number;
  timestamp_end: number;
  rerank_score?: number;
}

interface Message {
  id?: string;
  role: "user" | "assistant";
  text: string;
  sources?: Source[];
  confidence_score?: number;
  suggested_questions?: string[];
  isLoading?: boolean;
}

interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  is_archived: boolean;
}

interface MeetingItem {
  id: string;
  title: string;
  meeting_date?: string;
  platform?: string;
}

interface ChatFilters {
  platform?: string;
  date_start?: string;
  date_end?: string;
  meeting_id?: string;
  project?: string;
  participants?: string[];
}

const defaultSuggestions = [
  "When was the deadline for the Recruitease project Vivek was working on?",
  "What tasks were assigned to Rahul?",
  "What decisions were made regarding the UI redesign?",
  "Summarize all risks discussed in meetings this month"
];

export default function AIWorkspacePage() {
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // State
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>("new");
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [sidebarLoading, setSidebarLoading] = useState<boolean>(true);
  
  // Filters
  const [platform, setPlatform] = useState<string>("");
  const [dateStart, setDateStart] = useState<string>("");
  const [dateEnd, setDateEnd] = useState<string>("");
  const [selectedMeetingId, setSelectedMeetingId] = useState<string>("");
  const [participants, setParticipants] = useState<string>("");
  const [project, setProject] = useState<string>("");
  const [showFilters, setShowFilters] = useState<boolean>(true);
  
  // Available meetings for filter / manual indexing
  const [meetings, setMeetings] = useState<MeetingItem[]>([]);
  const [indexingMeetingId, setIndexingMeetingId] = useState<string>("");
  const [indexStatus, setIndexStatus] = useState<{ message: string; type: "success" | "error" | "info" | null }>({ message: "", type: null });
  const [indexLoading, setIndexLoading] = useState<boolean>(false);

  // Active source detail view
  const [activeSource, setActiveSource] = useState<Source | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  
  // Suggested Questions
  const [currentSuggestions, setCurrentSuggestions] = useState<string[]>(defaultSuggestions);

  const fetchSessions = useCallback(async () => {
    setSidebarLoading(true);
    try {
      const res = await fetch(getApiUrl("/api/ai/history"), {
        credentials: "include"
      });
      if (res.ok) {
        const data = await res.json();
        setSessions(data);
      }
    } catch (e) {
      console.error("Failed to load chat history:", e);
    } finally {
      setSidebarLoading(false);
    }
  }, []);

  const fetchMeetings = useCallback(async () => {
    try {
      const res = await fetch(getApiUrl("/api/v1/meetings/"), {
        credentials: "include"
      });
      if (res.ok) {
        const data = await res.json();
        setMeetings(data);
      }
    } catch (e) {
      console.error("Failed to fetch meetings list:", e);
    }
  }, []);

  const generateSuggestedQuestions = useCallback((srcList: Source[]) => {
    const text = srcList.map(s => s.chunk_text).join(" ").toLowerCase();
    const list: string[] = [];
    if (text.includes("action") || text.includes("todo") || text.includes("assign")) {
      list.push("What are the key action items and who owns them?");
    }
    if (text.includes("deadline") || text.includes("due") || text.includes("date")) {
      list.push("When are the project deadlines?");
    }
    if (text.includes("decision") || text.includes("agree")) {
      list.push("What key decisions were reached during these discussions?");
    }
    if (text.includes("risk") || text.includes("block") || text.includes("issue")) {
      list.push("What blockers or risks were identified?");
    }
    
    // Fill up with defaults
    defaultSuggestions.forEach(ds => {
      if (list.length < 4 && !list.includes(ds)) {
        list.push(ds);
      }
    });
    setCurrentSuggestions(list.slice(0, 4));
  }, []);

  const fetchSessionMessages = useCallback(async (sid: string) => {
    if (sid === "new") {
      setMessages([]);
      setCurrentSuggestions(defaultSuggestions);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(getApiUrl(`/api/v1/search/session/${sid}`), {
        credentials: "include"
      });
      if (res.ok) {
        const data = await res.json();
        // Adapt schema from standard backend chat message if necessary
        const formatted = data.map((msg: { role: "user" | "assistant"; text: string; sources?: Source[] }) => ({
          role: msg.role,
          text: msg.text,
          sources: msg.sources || []
        }));
        setMessages(formatted);
        
        // Extract sources to generate recommendations
        const allSources = formatted.reduce((acc: Source[], m: Message) => {
          if (m.sources) acc.push(...m.sources);
          return acc;
        }, []);
        if (allSources.length > 0) {
          generateSuggestedQuestions(allSources);
        } else {
          setCurrentSuggestions(defaultSuggestions);
        }
      }
    } catch (e) {
      console.error("Failed to fetch messages for session:", e);
    } finally {
      setLoading(false);
    }
  }, [generateSuggestedQuestions]);

  // Fetch initial data
  useEffect(() => {
    fetchSessions();
    fetchMeetings();
    
    // Check if session ID is present in URL
    const params = new URLSearchParams(window.location.search);
    const urlSessionId = params.get("session");
    if (urlSessionId) {
      setActiveSessionId(urlSessionId);
      fetchSessionMessages(urlSessionId);
    }
  }, [fetchSessions, fetchMeetings, fetchSessionMessages]);

  const handleNewChat = () => {
    setActiveSessionId("new");
    setMessages([]);
    setCurrentSuggestions(defaultSuggestions);
    router.push("/ai-workspace");
  };

  const handleClearHistory = async () => {
    if (!confirm("Are you sure you want to delete all workspace chat history?")) return;
    try {
      const res = await fetch(getApiUrl("/api/ai/history"), {
        method: "DELETE",
        credentials: "include"
      });
      if (res.ok) {
        setSessions([]);
        handleNewChat();
      }
    } catch (e) {
      console.error("Failed to clear history:", e);
    }
  };

  const handleSelectSession = (sid: string) => {
    setActiveSessionId(sid);
    fetchSessionMessages(sid);
    router.push(`/ai-workspace?session=${sid}`);
  };

  const formatSeconds = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const triggerManualIndexing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!indexingMeetingId) {
      setIndexStatus({ message: "Please select a meeting to index.", type: "error" });
      return;
    }

    setIndexLoading(true);
    setIndexStatus({ message: "Submitting indexing task to Celery background worker...", type: "info" });
    
    try {
      const res = await fetch(getApiUrl("/api/meetings/index"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ meeting_id: indexingMeetingId }),
        credentials: "include"
      });

      if (res.ok) {
        setIndexStatus({ 
          message: "Indexing started successfully. This process runs in the background. The meeting status will update shortly.", 
          type: "success" 
        });
        fetchMeetings(); // Refresh meeting list statuses
      } else {
        const errData = await res.json();
        setIndexStatus({ message: errData.detail || "Failed to trigger indexing.", type: "error" });
      }
    } catch {
      setIndexStatus({ message: "Network error occurred while connecting to backend.", type: "error" });
    } finally {
      setIndexLoading(false);
    }
  };

  const handleSendMessage = async (textToSend: string) => {
    const query = textToSend.trim();
    if (!query) return;

    setChatInput("");
    setLoading(true);

    // 1. Append user message to state
    const userMsg: Message = { role: "user", text: query };
    setMessages(prev => [...prev, userMsg]);

    // 2. Append empty AI loading message to state
    const aiPlaceholder: Message = { role: "assistant", text: "", isLoading: true };
    setMessages(prev => [...prev, aiPlaceholder]);

    // 3. Build filters object
    const filtersObj: ChatFilters = {};
    if (platform) filtersObj.platform = platform;
    if (dateStart) filtersObj.date_start = dateStart;
    if (dateEnd) filtersObj.date_end = dateEnd;
    if (selectedMeetingId) filtersObj.meeting_id = selectedMeetingId;
    if (project) filtersObj.project = project;
    if (participants) {
      filtersObj.participants = participants.split(",").map(p => p.trim()).filter(Boolean);
    }

    try {
      const response = await fetch(getApiUrl("/api/ai/chat"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          question: query,
          filters: filtersObj,
          session_id: activeSessionId === "new" ? null : activeSessionId,
          stream: true
        }),
        credentials: "include"
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body reader available");
      }

      const decoder = new TextDecoder();
      let done = false;
      let rawText = "";

      let extractedSessionId = activeSessionId;

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        const chunk = decoder.decode(value, { stream: !done });
        rawText += chunk;

        // Process custom text protocol
        let mainAnswer = rawText;
        let metadata = null;

        // Extract session ID if present at start
        if (mainAnswer.startsWith("__SESSION_ID__:")) {
          const nlIdx = mainAnswer.indexOf("\n");
          if (nlIdx !== -1) {
            const sidLine = mainAnswer.substring(0, nlIdx);
            extractedSessionId = sidLine.split(":")[1].trim();
            mainAnswer = mainAnswer.substring(nlIdx + 1);
          }
        }

        // Extract trailing metadata JSON block
        const sepIdx = mainAnswer.indexOf("__METADATA_SEPARATOR__");
        if (sepIdx !== -1) {
          const metadataStr = mainAnswer.substring(sepIdx + 23).trim(); // Length of "__METADATA_SEPARATOR__\n" is 23
          mainAnswer = mainAnswer.substring(0, sepIdx).trim();
          try {
            metadata = JSON.parse(metadataStr);
          } catch (e) {
            console.error("Metadata parsing error", e);
          }
        }

        // Update active messages in state
        setMessages(prev => {
          const updated = [...prev];
          const lastIdx = updated.length - 1;
          if (lastIdx >= 0 && updated[lastIdx].role === "assistant") {
            updated[lastIdx] = {
              role: "assistant",
              text: mainAnswer,
              isLoading: !done,
              sources: metadata?.sources || [],
              confidence_score: metadata?.confidence_score,
              suggested_questions: metadata?.suggested_questions
            };
          }
          return updated;
        });

        if (done && extractedSessionId !== activeSessionId) {
          setActiveSessionId(extractedSessionId);
          fetchSessions(); // Refresh list to show newly created session
          router.push(`/ai-workspace?session=${extractedSessionId}`);
        }

        // Generate follow-ups if done
        if (done && metadata?.sources) {
          generateSuggestedQuestions(metadata.sources);
        }
      }

    } catch (err) {
      console.error(err);
      setMessages(prev => {
        const updated = [...prev];
        const lastIdx = updated.length - 1;
        if (lastIdx >= 0 && updated[lastIdx].role === "assistant") {
          updated[lastIdx] = {
            role: "assistant",
            text: "❌ I encountered a connection error. Please verify the backend is active.",
            isLoading: false
          };
        }
        return updated;
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async () => {
    if (messages.length < 2 || loading) return;
    
    // Find last user query
    let lastUserQuery = "";
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "user") {
        lastUserQuery = messages[i].text;
        break;
      }
    }

    if (!lastUserQuery) return;

    // Remove the old AI response and show placeholder loading
    setMessages(prev => {
      const copy = [...prev];
      if (copy[copy.length - 1].role === "assistant") {
        copy.pop(); // Remove assistant
      }
      return [...copy, { role: "assistant", text: "", isLoading: true }];
    });

    setLoading(true);

    const filtersObj: ChatFilters = {};
    if (platform) filtersObj.platform = platform;
    if (dateStart) filtersObj.date_start = dateStart;
    if (dateEnd) filtersObj.date_end = dateEnd;
    if (selectedMeetingId) filtersObj.meeting_id = selectedMeetingId;
    if (project) filtersObj.project = project;
    if (participants) {
      filtersObj.participants = participants.split(",").map(p => p.trim()).filter(Boolean);
    }

    try {
      const response = await fetch(getApiUrl("/api/ai/regenerate"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          session_id: activeSessionId,
          filters: filtersObj,
          stream: true
        }),
        credentials: "include"
      });

      if (!response.ok) {
        throw new Error("Failed to regenerate");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader");

      const decoder = new TextDecoder();
      let done = false;
      let rawText = "";

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        const chunk = decoder.decode(value, { stream: !done });
        rawText += chunk;

        let mainAnswer = rawText;
        let metadata = null;

        const sepIdx = mainAnswer.indexOf("__METADATA_SEPARATOR__");
        if (sepIdx !== -1) {
          const metadataStr = mainAnswer.substring(sepIdx + 23).trim();
          mainAnswer = mainAnswer.substring(0, sepIdx).trim();
          try {
            metadata = JSON.parse(metadataStr);
          } catch {}
        }

        setMessages(prev => {
          const updated = [...prev];
          const lastIdx = updated.length - 1;
          if (lastIdx >= 0 && updated[lastIdx].role === "assistant") {
            updated[lastIdx] = {
              role: "assistant",
              text: mainAnswer,
              isLoading: !done,
              sources: metadata?.sources || [],
              confidence_score: metadata?.confidence_score,
              suggested_questions: metadata?.suggested_questions
            };
          }
          return updated;
        });

        if (done && metadata?.sources) {
          generateSuggestedQuestions(metadata.sources);
        }
      }
    } catch (e) {
      console.error(e);
      setMessages(prev => {
        const updated = [...prev];
        const lastIdx = updated.length - 1;
        if (lastIdx >= 0 && updated[lastIdx].role === "assistant") {
          updated[lastIdx] = {
            role: "assistant",
            text: "❌ Regeneration failed. Connection error.",
            isLoading: false
          };
        }
        return updated;
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopyMessage = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 1800);
  };

  // Custom Inline Markdown CITATION renderer
  const renderInlineContent = (line: string, sources?: Source[]) => {
    const inlineRegex = /(\*\*.*?\*\*|\[\d+\])/g;
    const parts: React.ReactNode[] = [];
    let match;
    let lastIndex = 0;
    let matchIdx = 0;
    
    while ((match = inlineRegex.exec(line)) !== null) {
      const start = match.index;
      const text = match[0];
      
      if (start > lastIndex) {
        parts.push(line.substring(lastIndex, start));
      }
      
      if (text.startsWith("**") && text.endsWith("**")) {
        const boldText = text.substring(2, text.length - 2);
        parts.push(<strong key={`b-${matchIdx}`} className="font-bold text-[#102C23]">{boldText}</strong>);
      } else if (text.startsWith("[") && text.endsWith("]")) {
        const numStr = text.substring(1, text.length - 1);
        const num = parseInt(numStr, 10);
        const source = sources && sources[num - 1];
        
        parts.push(
          <button
            key={`cit-${matchIdx}`}
            onClick={() => source && setActiveSource(source)}
            className="px-1.5 py-0.5 mx-0.5 rounded bg-[#e6f4f1] text-[#113229] text-xs font-bold border border-[#b2e2db]/30 hover:bg-[#113229] hover:text-white transition-all cursor-pointer shadow-sm focus:outline-none"
            title={source ? `Meeting: ${source.meeting_title}` : `Citation ${num}`}
          >
            [{num}]
          </button>
        );
      }
      
      lastIndex = inlineRegex.lastIndex;
      matchIdx++;
    }
    
    if (lastIndex < line.length) {
      parts.push(line.substring(lastIndex));
    }
    
    return parts.length === 0 ? line : parts;
  };

  const renderMarkdown = (text: string, sources?: Source[]) => {
    if (!text) return null;
    const lines = text.split("\n");
    return lines.map((line, idx) => {
      if (line.startsWith("### ")) {
        return <h4 key={idx} className="text-sm font-bold text-slate-800 mt-3 mb-1.5 font-outfit">{renderInlineContent(line.substring(4), sources)}</h4>;
      }
      if (line.startsWith("## ")) {
        return <h3 key={idx} className="text-base font-bold text-slate-800 mt-4 mb-2 font-outfit">{renderInlineContent(line.substring(3), sources)}</h3>;
      }
      if (line.startsWith("# ")) {
        return <h2 key={idx} className="text-lg font-bold text-[#113229] mt-4 mb-2 font-outfit">{renderInlineContent(line.substring(2), sources)}</h2>;
      }
      if (line.startsWith("- ") || line.startsWith("* ")) {
        return (
          <li key={idx} className="ml-5 list-disc text-xs text-slate-600 leading-relaxed mb-1">
            {renderInlineContent(line.substring(2), sources)}
          </li>
        );
      }
      const numMatch = line.match(/^(\d+)\.\s(.*)/);
      if (numMatch) {
        return (
          <li key={idx} className="ml-5 list-decimal text-xs text-slate-600 leading-relaxed mb-1">
            {renderInlineContent(numMatch[2], sources)}
          </li>
        );
      }
      if (line.trim() === "") return <div key={idx} className="h-2" />;
      return (
        <p key={idx} className="text-xs text-slate-600 leading-relaxed mb-1.5">
          {renderInlineContent(line, sources)}
        </p>
      );
    });
  };

  return (
    <div className="flex h-full overflow-hidden bg-[#F9F8F6] relative font-outfit">
         {/* 1. LEFT SIDEBAR: Conversational History */}
      <aside className="w-72 border-r border-[#e2e8f0] bg-white flex flex-col h-full flex-shrink-0 shadow-[4px_0_24px_rgba(0,0,0,0.01)] z-10">
        
        {/* Sidebar Header */}
        <div className="p-4 border-b border-[#e2e8f0]/80">
          <button 
            onClick={handleNewChat}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#113229] to-[#0D241E] hover:from-[#0D241E] hover:to-[#113229] text-white text-xs font-bold shadow-md shadow-[#113229]/15 transition-all duration-350 active:scale-[0.98]"
          >
            <Plus size={14} className="stroke-[2.5]" /> New Conversation
          </button>
        </div>

        {/* Workspace Sessions List */}
        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-1.5">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest px-2.5 mb-1.5 block">Workspace History</span>
          
          {sidebarLoading ? (
            <div className="flex flex-col gap-2.5 p-2">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-12 bg-[#F9F8F6] border border-slate-100 rounded-xl animate-pulse flex items-center gap-3 px-3">
                  <div className="w-4 h-4 bg-slate-200 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-2.5 bg-slate-200 rounded w-5/6" />
                    <div className="h-2 bg-slate-100 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : sessions.length === 0 ? (
            <div className="p-8 text-center bg-[#F9F8F6]/30 rounded-2xl border border-dashed border-slate-200/60 m-2">
              <MessageSquare size={20} className="mx-auto text-slate-350 mb-2.5" />
              <p className="text-[11px] font-bold text-slate-500 leading-relaxed">No conversations yet.</p>
              <p className="text-[9px] text-slate-400 mt-1">Start questioning below.</p>
            </div>
          ) : (
            sessions.map(s => {
              const isActive = activeSessionId === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => handleSelectSession(s.id)}
                  className={`w-full flex items-start gap-3 p-3 rounded-xl transition-all duration-200 text-left group border relative ${
                    isActive 
                      ? "bg-[#e6f4f1]/80 border-[#b2e2db]/40 text-[#113229] shadow-sm" 
                      : "border-transparent text-slate-600 hover:bg-[#F9F8F6] hover:text-[#102C23] hover:border-slate-200/50"
                  }`}
                >
                  {/* Active Indicator Line */}
                  {isActive && (
                    <div className="absolute left-0 top-3 bottom-3 w-[3px] bg-[#D98A44] rounded-r-full" />
                  )}
                  
                  <MessageSquare size={13} className={`mt-0.5 flex-shrink-0 ${isActive ? "text-[#113229]" : "text-slate-400 group-hover:text-slate-650"}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-bold truncate pr-2 ${isActive ? "text-[#113229]" : "text-slate-750"}`}>{s.title}</p>
                    <span className="text-[9px] text-slate-400 font-bold mt-1 block">
                      {parseUTCDate(s.updated_at).toLocaleDateString()} at {parseUTCDate(s.updated_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', timeZoneName: 'short'})}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Sidebar Footer */}
        {sessions.length > 0 && (
          <div className="p-3.5 border-t border-[#e2e8f0]/80 bg-[#F9F8F6]/30">
            <button
              onClick={handleClearHistory}
              className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-[10px] font-bold text-red-600 hover:text-red-700 hover:bg-red-50/50 hover:border-red-200 transition-all border border-red-200/30"
            >
              <Trash2 size={12} /> Clear Workspace History
            </button>
          </div>
        )}
      </aside>

      {/* 2. MAIN WORKSPACE / CHAT INTERFACE */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-[#F9F8F6]">
        
        {/* Chat Title / Action Bar */}
        <header className="h-16 border-b border-[#e2e8f0]/80 bg-white flex items-center justify-between px-6 flex-shrink-0 shadow-[0_1px_3px_rgba(0,0,0,0.01)] z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#e6f4f1] rounded-xl text-[#113229] shadow-sm">
              <Sparkles size={15} className="animate-pulse" />
            </div>
            <div>
              <h1 className="text-xs sm:text-sm font-extrabold text-[#102C23] tracking-tight">
                {activeSessionId === "new" ? "New AI Query Session" : sessions.find(s => s.id === activeSessionId)?.title || "Querying organizational memory..."}
              </h1>
              <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider mt-0.5">Enterprise Semantic Workspace</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Active filters summary */}
            {(platform || dateStart || dateEnd || selectedMeetingId || participants || project) && (
              <span className="hidden sm:inline-flex items-center gap-1 text-[9px] font-extrabold px-2 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200/50 animate-pulse">
                Filters Active
              </span>
            )}
            
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all duration-200 active:scale-95 shadow-sm ${
                showFilters 
                  ? "bg-[#e6f4f1] border-[#113229]/30 text-[#113229]" 
                  : "bg-white border-[#e2e8f0] text-slate-650 hover:bg-[#F9F8F6]"
              }`}
            >
              <SlidersHorizontal size={12} /> 
              <span>{showFilters ? "Hide Filters" : "Show Filters"}</span>
            </button>
          </div>
        </header>

        {/* Message Feed container */}
        <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-6">
          
          {/* Welcoming state when empty */}
          {messages.length === 0 && (
            <div className="max-w-2xl mx-auto w-full my-auto flex flex-col items-center gap-8 relative py-8 px-4">
              
              {/* Background Glow */}
              <div className="absolute -z-10 w-64 h-64 bg-gradient-to-br from-[#113229]/5 to-[#D98A44]/5 rounded-full blur-3xl" />
              
              <div className="p-5 bg-gradient-to-br from-[#113229] to-[#0D241E] text-white rounded-3xl shadow-xl shadow-[#113229]/15 flex items-center justify-center transform hover:scale-105 transition-transform duration-300">
                <Sparkles size={36} className="stroke-[1.5]" />
              </div>
              
              <div className="text-center max-w-lg">
                <h2 className="text-xl font-extrabold text-[#102C23] tracking-tight mb-2 font-outfit">Ask anything about your meetings</h2>
                <p className="text-xs text-slate-500 leading-relaxed max-w-md mx-auto font-medium">
                  Query project tasks, search decisions, identify risks, and retrieve specific action items across all recorded calls.
                </p>
              </div>

              {/* Suggestions Grid */}
              <div className="w-full flex flex-col gap-3 mt-4">
                <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest text-center">Suggested queries</span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full">
                  {currentSuggestions.map((s, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(s)}
                      className="p-4 text-left bg-white border border-[#e2e8f0]/80 hover:border-[#113229]/30 hover:shadow-md hover:shadow-[#113229]/3 rounded-2xl transition-all duration-300 group flex items-start gap-3 hover:-translate-y-0.5"
                    >
                      <div className="p-1 bg-[#F9F8F6] group-hover:bg-[#e6f4f1] rounded-lg text-[#113229] transition-colors flex-shrink-0 mt-0.5">
                        <ChevronRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                      </div>
                      <span className="text-[11px] font-bold text-slate-600 group-hover:text-slate-800 leading-normal">{s}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Chat Messages */}
          {messages.map((m, idx) => {
            const isUser = m.role === "user";
            return (
              <div key={idx} className={`flex gap-4 max-w-3xl w-full ${isUser ? "ml-auto flex-row-reverse" : "mr-auto"}`}>
                
                {/* Avatar */}
                <div className={`w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm border ${
                  isUser 
                    ? "bg-gradient-to-br from-[#113229] to-[#0D241E] border-[#113229]/10 text-white" 
                    : "bg-slate-800 border-slate-700 text-white"
                }`}>
                  {isUser ? <User size={14} className="stroke-[2.5]" /> : <Bot size={14} />}
                </div>

                {/* Message Bubble */}
                <div className="flex-1 flex flex-col gap-1.5 max-w-[85%]">
                  
                  <div className={`rounded-2xl p-4.5 shadow-sm border relative overflow-hidden ${
                    isUser 
                      ? "bg-gradient-to-br from-white to-[#F9F8F6]/20 border-slate-200/80" 
                      : "bg-white border-[#e2e8f0]/80"
                  }`}>
                    
                    {/* Top gradient accent for AI responses */}
                    {!isUser && (
                      <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#113229] via-[#0D241E] to-[#D98A44]" />
                    )}

                    {/* Chat Text */}
                    {isUser ? (
                      <p className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap font-medium">{m.text}</p>
                    ) : (
                      <div className="prose-chat">
                        {m.isLoading && !m.text ? (
                          <div className="flex items-center gap-3 text-slate-400 py-2">
                            <Loader2 size={14} className="animate-spin text-[#113229]" />
                            <span className="text-[11.5px] font-extrabold tracking-tight">Scanning corporate memory...</span>
                          </div>
                        ) : (
                          renderMarkdown(m.text, m.sources)
                        )}
                      </div>
                    )}

                    {/* Footer Actions (Copy, Regenerate, Confidence Score) */}
                    {!isUser && !m.isLoading && m.text && (
                      <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between">
                        
                        {/* Copy / Regenerate */}
                        <div className="flex items-center gap-3.5">
                          <button
                            onClick={() => handleCopyMessage(m.text, idx)}
                            className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 hover:text-slate-600 transition-colors"
                          >
                            {copiedIndex === idx ? <Check size={11} className="text-emerald-600 stroke-[3px]" /> : <Copy size={11} />}
                            <span>{copiedIndex === idx ? "Copied" : "Copy"}</span>
                          </button>

                          {idx === messages.length - 1 && (
                            <button
                              onClick={handleRegenerate}
                              className="flex items-center gap-1.5 text-[10px] font-bold text-[#113229] hover:text-[#0D241E] transition-colors"
                            >
                              <RefreshCw size={11} />
                              <span>Regenerate</span>
                            </button>
                          )}
                        </div>

                        {/* Confidence Score Pill */}
                        {m.confidence_score !== undefined && (
                          <div className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold border shadow-sm ${
                            m.confidence_score >= 0.8 
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                              : m.confidence_score >= 0.5 
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-red-50 text-red-700 border-red-200"
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              m.confidence_score >= 0.8 ? "bg-emerald-500" : m.confidence_score >= 0.5 ? "bg-amber-500" : "bg-red-500"
                            }`} />
                            <span>{Math.round(m.confidence_score * 100)}% Confident</span>
                          </div>
                        )}

                      </div>
                    )}
                  </div>

                  {/* Citation list below bubble */}
                  {!isUser && m.sources && m.sources.length > 0 && (
                    <div className="mt-2 flex flex-col gap-2 pl-1">
                      <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block">Retrieved Sources</span>
                      <div className="flex flex-col gap-1.5">
                        {m.sources.map((src, sIdx) => (
                          <button
                            key={sIdx}
                            onClick={() => setActiveSource(src)}
                            className="w-full flex items-center justify-between p-3 rounded-xl bg-white border border-[#e2e8f0]/80 hover:border-[#113229]/40 hover:shadow-sm transition-all text-left group"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="text-[10px] font-extrabold text-[#113229] bg-[#e6f4f1] px-2 py-0.5 rounded-lg border border-[#b2e2db]/30 flex-shrink-0">
                                [{sIdx + 1}]
                              </span>
                              <div className="min-w-0">
                                <p className="text-[11px] font-bold text-slate-700 truncate group-hover:text-slate-800">{src.meeting_title}</p>
                                <p className="text-[9px] text-slate-400 font-bold mt-0.5">
                                  {src.meeting_date} • Speaker: {src.speaker} • Timeline: {formatSeconds(src.timestamp_start)}-{formatSeconds(src.timestamp_end)}
                                </p>
                              </div>
                            </div>
                            <ExternalLink size={10} className="text-slate-400 group-hover:text-slate-600 flex-shrink-0 ml-2" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              </div>
            );
          })}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested follow-ups on the active session */}
        {messages.length > 0 && !loading && (
          <div className="px-6 py-2.5 bg-[#F9F8F6] border-t border-[#e2e8f0]/80 flex flex-wrap gap-2 justify-center">
            {currentSuggestions.map((s, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(s)}
                className="px-3.5 py-1 rounded-full bg-white hover:bg-[#e6f4f1] text-[#113229] border border-[#e2e8f0] hover:border-[#113229]/40 text-[10px] font-bold transition-all shadow-sm active:scale-[0.98]"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Input Bar Section */}
        <div className="p-4 bg-white border-t border-[#e2e8f0]/80 flex-shrink-0 shadow-[0_-4px_24px_rgba(0,0,0,0.01)]">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage(chatInput);
            }}
            className="max-w-3xl mx-auto w-full relative flex items-center bg-[#F9F8F6] border border-slate-200/80 focus-within:border-[#113229]/40 focus-within:ring-4 focus-within:ring-[#113229]/5 rounded-2xl p-2.5 transition-all duration-300"
          >
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              disabled={loading}
              placeholder="Ask anything about your meetings... (e.g. Action items, deadlines)"
              className="flex-1 bg-transparent border-0 outline-none ring-0 text-xs text-slate-800 placeholder-slate-400 px-3.5"
            />
            
            <button
              type="submit"
              disabled={loading || !chatInput.trim()}
              className="p-2.5 bg-[#113229] hover:bg-[#0D241E] disabled:bg-slate-200 text-white disabled:text-slate-400 rounded-xl transition-all shadow-sm active:scale-95 flex-shrink-0"
            >
              {loading ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} className="stroke-[2.5]" />}
            </button>
          </form>
          <div className="max-w-3xl mx-auto w-full mt-2.5 flex items-center justify-between text-[9px] font-bold text-slate-400 px-3.5">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              RAG Pipeline Active (BAAI/bge-small-en-v1.5)
            </span>
            <span>Gemini 2.5 Flash / Llama 3</span>
          </div>
        </div>

      </main>

      {/* 3. RIGHT FILTER PANEL */}
      {showFilters && (
        <aside className="w-80 border-l border-[#e2e8f0] bg-white flex flex-col h-full flex-shrink-0 shadow-[-4px_0_24px_rgba(0,0,0,0.01)] z-10 overflow-y-auto">
          
          {/* Header */}
          <div className="p-4 border-b border-[#e2e8f0]/80 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <SlidersHorizontal size={13} className="text-[#113229]" />
              <h2 className="text-[10px] font-extrabold text-[#102C23] uppercase tracking-widest">Search Filters</h2>
            </div>
            <button 
              onClick={() => setShowFilters(false)}
              className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={14} />
            </button>
          </div>

          {/* Filter Options */}
          <div className="p-4 flex flex-col gap-4 border-b border-[#e2e8f0]/80 flex-shrink-0">
            
            {/* Platform */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">Platform</label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="w-full p-2.5 text-xs border border-slate-200/80 rounded-xl outline-none focus:border-[#113229]/40 bg-[#F9F8F6]/30 text-slate-700 font-medium cursor-pointer"
              >
                <option value="">All Platforms</option>
                <option value="Microsoft Teams">Microsoft Teams</option>
                <option value="Zoom">Zoom</option>
                <option value="Google Meet">Google Meet</option>
                <option value="Uploaded File">Uploaded Audio/Video</option>
              </select>
            </div>

            {/* Date Range */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">Date Range</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={dateStart}
                  onChange={(e) => setDateStart(e.target.value)}
                  className="p-2 text-xs border border-slate-200/80 rounded-xl outline-none focus:border-[#113229]/40 bg-[#F9F8F6]/30 text-slate-700 font-medium"
                />
                <input
                  type="date"
                  value={dateEnd}
                  onChange={(e) => setDateEnd(e.target.value)}
                  className="p-2 text-xs border border-slate-200/80 rounded-xl outline-none focus:border-[#113229]/40 bg-[#F9F8F6]/30 text-slate-700 font-medium"
                />
              </div>
            </div>

            {/* Specific Meeting */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">Specific Meeting</label>
              <select
                value={selectedMeetingId}
                onChange={(e) => setSelectedMeetingId(e.target.value)}
                className="w-full p-2.5 text-xs border border-slate-200/80 rounded-xl outline-none focus:border-[#113229]/40 bg-[#F9F8F6]/30 text-slate-700 font-medium cursor-pointer max-w-[288px] truncate"
              >
                <option value="">All Meetings</option>
                {meetings.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Speaker / Participants */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">Participants</label>
              <div className="relative">
                <input
                  type="text"
                  value={participants}
                  onChange={(e) => setParticipants(e.target.value)}
                  placeholder="e.g. Vivek, Rahul"
                  className="w-full p-2.5 pl-9 text-xs border border-slate-200/80 rounded-xl outline-none focus:border-[#113229]/40 bg-[#F9F8F6]/30 text-slate-700 font-medium placeholder-slate-400"
                />
                <User size={11} className="absolute left-3 top-3.5 text-slate-400" />
              </div>
            </div>

            {/* Project Keyword */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">Project / Keyword</label>
              <div className="relative">
                <input
                  type="text"
                  value={project}
                  onChange={(e) => setProject(e.target.value)}
                  placeholder="e.g. Recruitease, UI Redesign"
                  className="w-full p-2.5 pl-9 text-xs border border-slate-200/80 rounded-xl outline-none focus:border-[#113229]/40 bg-[#F9F8F6]/30 text-slate-700 font-medium placeholder-slate-400"
                />
                <Briefcase size={11} className="absolute left-3 top-3.5 text-slate-400" />
              </div>
            </div>

            {/* Reset Filters */}
            {(platform || dateStart || dateEnd || selectedMeetingId || participants || project) && (
              <button
                onClick={() => {
                  setPlatform("");
                  setDateStart("");
                  setDateEnd("");
                  setSelectedMeetingId("");
                  setParticipants("");
                  setProject("");
                }}
                className="w-full text-center py-2 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-bold transition-all mt-1"
              >
                Reset Filter Settings
              </button>
            )}

          </div>

          {/* 4. MANUAL INDEXING INTERACTIVE UTILITY */}
          <div className="p-4 flex flex-col gap-4">
            <div className="flex items-center gap-1.5">
              <Layers size={13} className="text-[#113229]" />
              <h2 className="text-[10px] font-extrabold text-[#102C23] uppercase tracking-widest">Manual Indexing</h2>
            </div>
            
            <p className="text-[10px] text-slate-500 font-medium leading-relaxed bg-[#F9F8F6] p-3 rounded-xl border border-slate-100">
              If new transcripts or media audio have been added, index them manually here to populate the pgvector pipeline.
            </p>

            <form onSubmit={triggerManualIndexing} className="flex flex-col gap-3">
              <select
                value={indexingMeetingId}
                onChange={(e) => setIndexingMeetingId(e.target.value)}
                className="w-full p-2.5 text-xs border border-slate-200/80 rounded-xl outline-none focus:border-[#113229]/40 bg-[#F9F8F6]/30 text-slate-700 font-medium cursor-pointer"
                required
              >
                <option value="">Select Meeting to Index...</option>
                {meetings.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.title}
                  </option>
                ))}
              </select>

              <button
                type="submit"
                disabled={indexLoading || !indexingMeetingId}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#113229] hover:bg-[#0D241E] disabled:bg-slate-200 text-white disabled:text-slate-400 text-xs font-bold transition-all shadow-sm active:scale-[0.98]"
              >
                {indexLoading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                <span>Trigger Manual Indexing</span>
              </button>
            </form>

            {indexStatus.message && (
              <div className={`p-3.5 rounded-xl border text-[10px] font-semibold leading-relaxed flex gap-2 ${
                indexStatus.type === "success" 
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
                  : indexStatus.type === "error"
                    ? "bg-red-50 border-red-200 text-red-800"
                    : "bg-blue-50 border-blue-200 text-blue-800"
              }`}>
                <AlertCircle size={12} className="flex-shrink-0 mt-0.5 text-current" />
                <span>{indexStatus.message}</span>
              </div>
            )}
          </div>

        </aside>
      )}

      {/* 5. OVERLAY CITATION SOURCE DETAILS PANEL */}
      {activeSource && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden border border-[#e2e8f0] flex flex-col max-h-[85vh] relative">
            
            {/* Top Teal Accent */}
            <div className="h-1 bg-gradient-to-r from-[#113229] to-[#0D241E]" />

            {/* Header */}
            <div className="p-5 border-b border-[#e2e8f0]/80 flex items-start justify-between bg-[#F9F8F6]/40">
              <div className="min-w-0">
                <span className="text-[9px] font-extrabold text-[#113229] bg-[#e6f4f1] px-2.5 py-0.5 rounded-lg border border-[#b2e2db]/35 uppercase tracking-wider">
                  Citation Details
                </span>
                <h3 className="text-xs sm:text-sm font-extrabold text-slate-800 truncate mt-2 tracking-tight">{activeSource.meeting_title}</h3>
                <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                  Platform: {activeSource.platform} • Recorded Date: {activeSource.meeting_date}
                </p>
              </div>
              <button
                onClick={() => setActiveSource(null)}
                className="p-1 hover:bg-slate-200/60 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={15} />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-4.5">
              
              {/* Speaker & Timestamp Info */}
              <div className="grid grid-cols-2 gap-4 bg-[#F9F8F6] p-4 rounded-2xl border border-slate-100">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">Speaker</span>
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mt-0.5">
                    <User size={12} className="text-[#113229]" />
                    {activeSource.speaker}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">Timestamp range</span>
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mt-0.5">
                    <Clock size={12} className="text-[#113229]" />
                    {formatSeconds(activeSource.timestamp_start)} - {formatSeconds(activeSource.timestamp_end)}
                  </span>
                </div>
              </div>

              {/* Exact Segment Text */}
              <div className="flex flex-col gap-2">
                <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">Transcript segment</span>
                <div className="bg-slate-900 text-slate-200 p-4.5 rounded-2xl font-mono text-[10px] leading-relaxed whitespace-pre-wrap border border-slate-800 shadow-inner max-h-60 overflow-y-auto">
                  {activeSource.chunk_text}
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="p-5 border-t border-[#e2e8f0]/80 flex items-center justify-between bg-[#F9F8F6]/40">
              <button
                onClick={() => router.push(`/meetings/${activeSource.meeting_id}`)}
                className="flex items-center gap-1.5 text-[10px] font-bold text-[#113229] hover:text-[#0D241E] transition-colors"
              >
                <ExternalLink size={12} />
                <span>Open Full Meeting Transcript</span>
              </button>
              
              <button
                onClick={() => setActiveSource(null)}
                className="py-2 px-5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-[10px] font-bold transition-all active:scale-[0.98]"
              >
                Close View
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
