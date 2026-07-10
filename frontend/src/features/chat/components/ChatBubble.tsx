import React, { useState } from "react";
import { ChatMessage } from "../types/chat";
import { Bot, User, Copy, Check } from "lucide-react";

interface ChatBubbleProps {
  message: ChatMessage;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({ message }) => {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";

  const handleCopy = () => {
    navigator.clipboard.writeText(message.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  if (isUser) {
    return (
      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "flex-end", gap: "8px", marginBottom: "4px" }} className="group">
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px", maxWidth: "78%" }}>
          <div
            style={{
              background: "linear-gradient(135deg, #113229 0%, #0D241E 100%)",
              color: "#fff",
              padding: "10px 16px",
              borderRadius: "18px 18px 4px 18px",
              fontSize: "13px",
              lineHeight: "1.6",
              fontWeight: 500,
              fontFamily: "'Inter', sans-serif",
              boxShadow: "0 2px 12px rgba(15, 118, 110, 0.25)",
              wordBreak: "break-word",
            }}
          >
            {message.text}
          </div>
          <button
            onClick={handleCopy}
            style={{
              display: "flex", alignItems: "center", gap: "4px",
              fontSize: "10px", color: "#94a3b8", fontWeight: 600,
              background: "none", border: "none", cursor: "pointer",
              opacity: 0, transition: "opacity 0.15s",
              fontFamily: "'Inter', sans-serif",
            }}
            className="group-hover:!opacity-100"
          >
            {copied ? <Check size={10} color="#10b981" /> : <Copy size={10} />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        {/* User Avatar */}
        <div
          style={{
            width: 28, height: 28, borderRadius: "50%",
            background: "linear-gradient(135deg, #113229, #0D241E)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0, marginBottom: "18px",
            boxShadow: "0 2px 8px rgba(15,118,110,0.25)",
          }}
        >
          <User size={13} color="#fff" />
        </div>
      </div>
    );
  }

  // AI message
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: "8px", marginBottom: "4px" }} className="group">
      {/* Bot Avatar */}
      <div
        style={{
          width: 28, height: 28, borderRadius: "50%",
          background: "linear-gradient(135deg, #1e293b, #334155)",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0, marginBottom: "18px",
          boxShadow: "0 2px 8px rgba(15,23,42,0.18)",
        }}
      >
        <Bot size={13} color="#fff" />
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "4px", maxWidth: "78%" }}>
        <span style={{ fontSize: "9px", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", paddingLeft: "2px", fontFamily: "'Inter', sans-serif" }}>
          MeetMind AI
        </span>

        {/* Bubble */}
        <div
          style={{
            position: "relative",
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            color: "#334155",
            padding: "12px 16px",
            borderRadius: "18px 18px 18px 4px",
            fontSize: "13px",
            lineHeight: "1.65",
            fontWeight: 450,
            fontFamily: "'Inter', sans-serif",
            boxShadow: "0 1px 6px rgba(15,23,42,0.06)",
            wordBreak: "break-word",
            overflow: "hidden",
          }}
        >
          {/* Top accent bar */}
          <div
            style={{
              position: "absolute", top: 0, left: 0, right: 0, height: "2px",
              background: "linear-gradient(90deg, #113229, #5eead4)",
              borderRadius: "2px 2px 0 0",
            }}
          />
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {message.text.split(/\n+/).map((para, i) =>
              para.trim() ? <p key={i} style={{ margin: 0 }}>{para}</p> : null
            )}
          </div>
        </div>

        <button
          onClick={handleCopy}
          style={{
            display: "flex", alignItems: "center", gap: "4px",
            fontSize: "10px", color: "#94a3b8", fontWeight: 600,
            background: "none", border: "none", cursor: "pointer",
            opacity: 0, transition: "opacity 0.15s", paddingLeft: "2px",
            fontFamily: "'Inter', sans-serif",
          }}
          className="group-hover:!opacity-100"
        >
          {copied ? <Check size={10} color="#10b981" /> : <Copy size={10} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
};
