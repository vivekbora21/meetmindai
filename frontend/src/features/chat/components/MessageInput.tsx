import React from "react";
import { Send, Lock, Unlock, Sparkles } from "lucide-react";

interface MessageInputProps {
  chatInput: string;
  setChatInput: (val: string) => void;
  chatLoading: boolean;
  isArchived: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onReopen: () => void;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  chatInput,
  setChatInput,
  chatLoading,
  isArchived,
  onSubmit,
  onReopen
}) => {
  if (isArchived) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", textAlign: "center", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "12px 16px" }}>
        <span style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "#64748b", fontWeight: 600, fontFamily: "'Inter', sans-serif" }}>
          <Lock size={13} color="#94a3b8" />
          This chat session is closed.
        </span>
        <button
          onClick={onReopen}
          style={{ display: "flex", alignItems: "center", gap: "6px", padding: "5px 14px", borderRadius: "8px", border: "1px solid #e2e8f0", background: "#fff", fontSize: "11px", fontWeight: 700, color: "#113229", cursor: "pointer", fontFamily: "'Inter', sans-serif" }}
        >
          <Unlock size={12} color="#113229" />
          Reopen Session
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        background: "#f8fafc",
        border: "1.5px solid #e2e8f0",
        borderRadius: "14px",
        padding: "8px 12px",
        transition: "border-color 0.15s, background 0.15s",
      }}
      onFocus={() => {}}
    >
      <Sparkles size={14} color="#cbd5e1" style={{ flexShrink: 0 }} />
      <input
        type="text"
        placeholder="Ask anything about this meeting..."
        value={chatInput}
        onChange={(e) => setChatInput(e.target.value)}
        disabled={chatLoading}
        style={{
          flex: 1,
          background: "transparent",
          border: "none",
          outline: "none",
          fontSize: "13px",
          color: "#102C23",
          fontFamily: "'Inter', sans-serif",
          fontWeight: 450,
        }}
        onFocus={(e) => {
          const form = e.currentTarget.closest("form");
          if (form) {
            (form as HTMLElement).style.borderColor = "#113229";
            (form as HTMLElement).style.background = "#fff";
          }
        }}
        onBlur={(e) => {
          const form = e.currentTarget.closest("form");
          if (form) {
            (form as HTMLElement).style.borderColor = "#e2e8f0";
            (form as HTMLElement).style.background = "#f8fafc";
          }
        }}
      />
      <button
        type="submit"
        disabled={chatLoading || !chatInput.trim()}
        style={{
          padding: "7px",
          borderRadius: "10px",
          background: chatLoading || !chatInput.trim() ? "#94a3b8" : "linear-gradient(135deg, #113229, #0D241E)",
          border: "none",
          cursor: chatLoading || !chatInput.trim() ? "not-allowed" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          transition: "all 0.15s",
          boxShadow: chatInput.trim() ? "0 2px 8px rgba(15,118,110,0.3)" : "none",
        }}
      >
        <Send size={14} color="#fff" />
      </button>
    </form>
  );
};
