import React, { useRef, useEffect } from "react";
import { MessageSquare, Loader2, Bot } from "lucide-react";
import { useChat } from "../hooks/useChat";
import { ChatHeader } from "./ChatHeader";
import { ChatHistory } from "./ChatHistory";
import { ChatBubble } from "./ChatBubble";
import { SuggestedQuestions } from "./SuggestedQuestions";
import { MessageInput } from "./MessageInput";

interface ChatWindowProps {
  meetingId: string;
  status: string;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ meetingId, status }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
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
  } = useChat(meetingId);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, chatLoading]);

  const statusNorm = (status || "").toUpperCase();
  const isReadyForChat = statusNorm === "COMPLETED" || statusNorm === "TRANSCRIBED" || statusNorm === "ANALYZING";
  const isFailed = statusNorm === "FAILED" || statusNorm === "ERROR";

  const placeholderStyles: React.CSSProperties = {
    gridColumn: "span 5",
    padding: "24px",
    borderRadius: "16px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    height: "700px",
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    boxShadow: "0 1px 6px rgba(15,23,42,0.06)",
    overflow: "hidden",
  };

  if (isFailed) {
    return (
      <section className="lg:col-span-5" style={placeholderStyles}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: "16px", textAlign: "center" }}>
          <div style={{ width: 52, height: 52, borderRadius: "14px", background: "#fff1f2", border: "1px solid #fecdd3", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <MessageSquare size={22} color="#f43f5e" />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <h3 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: "14px", color: "#0f172a", margin: 0 }}>Chat Unavailable</h3>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "12px", color: "#64748b", maxWidth: 220, lineHeight: 1.6, margin: 0 }}>
              Meeting processing failed. No transcript or insights are available.
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "#fff1f2", border: "1px solid #fecdd3", padding: "6px 12px", borderRadius: "99px" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#f43f5e", display: "inline-block" }} />
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "10px", fontWeight: 700, color: "#e11d48" }}>Processing failed</span>
          </div>
        </div>
      </section>
    );
  }

  if (!isReadyForChat) {
    return (
      <section className="lg:col-span-5" style={placeholderStyles}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: "16px", textAlign: "center" }}>
          <div style={{ width: 52, height: 52, borderRadius: "14px", background: "#f0fdfb", border: "1px solid #99f6e4", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Bot size={22} color="#0f766e" />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <h3 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: "14px", color: "#0f172a", margin: 0 }}>Meeting Chat</h3>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "12px", color: "#64748b", maxWidth: 200, lineHeight: 1.6, margin: 0 }}>
              Available once AI finishes processing the transcript.
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "#f0fdfb", border: "1px solid #99f6e4", padding: "6px 12px", borderRadius: "99px" }}>
            <Loader2 size={12} color="#0f766e" className="animate-spin" />
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "10px", fontWeight: 700, color: "#0f766e" }}>AI Pipeline running...</span>
          </div>
        </div>
      </section>
    );
  }

  const hasMessages = chatMessages.length > 0;

  return (
    <section
      className="lg:col-span-5"
      style={{
        borderRadius: "16px",
        display: "flex",
        flexDirection: "column",
        height: "700px",
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        boxShadow: "0 1px 6px rgba(15,23,42,0.06)",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Top teal accent */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "linear-gradient(90deg, #0f766e, #5eead4, #0d9488)", zIndex: 10 }} />

      <div style={{ display: "flex", flexDirection: "column", height: "100%", paddingTop: "3px", overflow: "hidden" }}>
        {/* Header */}
        <div style={{ padding: "16px 20px 0 20px", flexShrink: 0 }}>
          <ChatHeader
            title={activeSession?.title || "New Chat"}
            isArchived={!!activeSession?.is_archived}
            isEditingTitle={isEditingTitle}
            newTitleVal={newTitleVal}
            showExportMenu={showExportMenu}
            setNewTitleVal={setNewTitleVal}
            setIsEditingTitle={setIsEditingTitle}
            setShowExportMenu={setShowExportMenu}
            handleRenameTitle={handleRenameTitle}
            handleToggleArchive={handleToggleArchive}
            handleClearChat={handleClearChat}
            copyToClipboard={copyToClipboard}
            exportMarkdown={exportMarkdown}
            exportPDF={exportPDF}
          />
        </div>

        {/* Body: sidebar + messages */}
        <div style={{ display: "flex", flex: 1, overflow: "hidden", minHeight: 0 }}>
          {/* Sidebar */}
          <div
            style={{
              width: "244px",
              minWidth: "244px",
              padding: "16px 12px 16px 16px",
              flexShrink: 0,
              borderRight: "1px solid #e2e8f0",
              boxSizing: "border-box",
              display: "flex",
              flexDirection: "column",
              height: "100%",
            }}
          >
            <ChatHistory
              sessions={sessions}
              activeSessionId={activeSessionId}
              onSelectSession={(id) => {
                setActiveSessionId(id);
                fetchChatSession(id);
              }}
              onNewChat={handleNewChat}
            />
          </div>

          {/* Messages area */}
          <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
            {/* Scrollable messages */}
            <div
              className="scrollbar"
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "20px 20px 8px 20px",
                display: "flex",
                flexDirection: "column",
                gap: "16px",
              }}
            >
              {/* Empty state */}
              {!hasMessages && (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px", flex: 1, justifyContent: "center" }}>
                  {/* Greeting bubble */}
                  <div style={{ display: "flex", gap: "10px", alignItems: "flex-end" }}>
                    <div style={{ width: 30, height: 30, borderRadius: "50%", background: "linear-gradient(135deg, #1e293b, #334155)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Bot size={14} color="#fff" />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      <span style={{ fontSize: "9px", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "'Inter', sans-serif" }}>MeetMind AI</span>
                      <div style={{ position: "relative", background: "#fff", border: "1px solid #e2e8f0", padding: "12px 16px", borderRadius: "18px 18px 18px 4px", fontSize: "13px", color: "#334155", lineHeight: 1.6, fontWeight: 450, fontFamily: "'Inter', sans-serif", boxShadow: "0 1px 6px rgba(15,23,42,0.06)", overflow: "hidden", maxWidth: "78%" }}>
                        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg, #0f766e, #5eead4)" }} />
                        <p style={{ margin: 0 }}>👋 Hi! I've read through the meeting. Ask me anything or pick a suggested question below.</p>
                      </div>
                    </div>
                  </div>
                  <SuggestedQuestions onQuestionClick={handleSuggestedQuestionClick} />
                </div>
              )}

              {/* Chat messages */}
              {chatMessages.map((msg, idx) => (
                <ChatBubble key={idx} message={msg} />
              ))}

              {/* Typing indicator */}
              {chatLoading && (
                <div style={{ display: "flex", alignItems: "flex-end", gap: "10px" }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg, #1e293b, #334155)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Bot size={13} color="#fff" />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <span style={{ fontSize: "9px", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "'Inter', sans-serif" }}>MeetMind AI</span>
                    <div style={{ background: "#fff", border: "1px solid #e2e8f0", padding: "12px 16px", borderRadius: "18px 18px 18px 4px", display: "flex", alignItems: "center", gap: "10px", boxShadow: "0 1px 6px rgba(15,23,42,0.06)" }}>
                      <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                        {[0, 150, 300].map((delay, i) => (
                          <span
                            key={i}
                            style={{ width: 6, height: 6, borderRadius: "50%", background: "#0f766e", display: "inline-block", animationDelay: `${delay}ms` }}
                            className="animate-bounce"
                          />
                        ))}
                      </div>
                      <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 500, fontFamily: "'Inter', sans-serif" }}>
                        {chatStatus === "searching" ? "Searching transcript..." : chatStatus === "generating" ? "Generating answer..." : "Thinking..."}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div style={{ padding: "8px 16px 16px 16px", flexShrink: 0 }}>
              <MessageInput
                chatInput={chatInput}
                setChatInput={setChatInput}
                chatLoading={chatLoading}
                isArchived={!!activeSession?.is_archived}
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!chatInput.trim()) return;
                  submitChatQuestion(chatInput);
                }}
                onReopen={() => handleToggleArchive(false)}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
