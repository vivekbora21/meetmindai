import React from "react";
import { Plus, MessageSquare, Lock } from "lucide-react";
import { ChatSession } from "../types/chat";

interface ChatHistoryProps {
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string, sess: ChatSession) => void;
  onNewChat: () => void;
}

export const ChatHistory: React.FC<ChatHistoryProps> = ({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewChat
}) => {
  return (
    <div
      style={{
        width: "220px",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        height: "100%",
        userSelect: "none",
      }}
    >
      {/* New Chat Button */}
      <button
        onClick={onNewChat}
        style={{
          width: "100%",
          padding: "10px 14px",
          borderRadius: "12px",
          background: "linear-gradient(135deg, #0f766e 0%, #0d9488 100%)",
          color: "#ffffff",
          fontSize: "12px",
          fontWeight: 650,
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
          boxShadow: "0 2px 8px rgba(15, 118, 110, 0.2)",
          transition: "all 0.2s ease",
          fontFamily: "'Inter', sans-serif",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-1px)";
          e.currentTarget.style.boxShadow = "0 4px 12px rgba(15, 118, 110, 0.3)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "none";
          e.currentTarget.style.boxShadow = "0 2px 8px rgba(15, 118, 110, 0.2)";
        }}
      >
        <Plus size={14} strokeWidth={2.5} />
        New Chat
      </button>

      {/* Sessions List */}
      <div
        className="scrollbar"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "4px",
          flex: 1,
          overflowY: "auto",
          paddingRight: "4px",
        }}
      >
        <span
          style={{
            fontSize: "10px",
            fontWeight: 700,
            color: "#94a3b8",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            paddingLeft: "8px",
            marginBottom: "4px",
            fontFamily: "'Inter', sans-serif",
          }}
        >
          Recent Chats
        </span>
        {sessions.length === 0 ? (
          <span
            style={{
              fontSize: "11px",
              color: "#94a3b8",
              fontStyle: "italic",
              paddingLeft: "8px",
              fontFamily: "'Inter', sans-serif",
            }}
          >
            No chats yet
          </span>
        ) : (
          sessions.map((sess) => {
            const isActive = sess.id === activeSessionId;
            return (
              <button
                key={sess.id}
                onClick={() => onSelectSession(sess.id, sess)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "9px 12px",
                  borderRadius: "10px",
                  fontSize: "12px",
                  fontWeight: isActive ? 600 : 500,
                  background: isActive ? "#f0fdfa" : "transparent",
                  color: isActive ? "#0f766e" : "#475569",
                  border: isActive ? "1px solid #ccfbf1" : "1px solid transparent",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "8px",
                  transition: "all 0.15s ease",
                  fontFamily: "'Inter', sans-serif",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = "#f8fafc";
                    e.currentTarget.style.color = "#0f172a";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "#475569";
                  }
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    overflow: "hidden",
                    flex: 1,
                  }}
                >
                  <MessageSquare
                    size={13}
                    style={{ flexShrink: 0, opacity: isActive ? 1 : 0.6 }}
                  />
                  <span
                    style={{
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      flex: 1,
                    }}
                  >
                    {sess.title}
                  </span>
                </div>
                {sess.is_archived && (
                  <Lock size={11} style={{ flexShrink: 0, color: "#94a3b8" }} />
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
