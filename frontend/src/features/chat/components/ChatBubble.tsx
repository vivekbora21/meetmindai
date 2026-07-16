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
      <div className="flex justify-end items-end gap-2 mb-1 group font-outfit">
        <div className="flex flex-col items-end gap-1 max-w-[78%]">
          <div className="bg-gradient-to-br from-[#113229] to-[#0D241E] text-white px-4 py-2.5 rounded-2xl rounded-br-sm text-xs leading-relaxed font-medium shadow-sm word-break shadow-[#113229]/10">
            {message.text}
          </div>
          <button
            onClick={handleCopy}
            aria-label="Copy user message to clipboard"
            className="flex items-center gap-1 text-[10px] text-slate-400 font-bold bg-none border-none cursor-pointer opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100 group-focus-within:opacity-100 font-sans focus:outline-none focus:ring-1 focus:ring-[#113229] rounded px-1"
          >
            {copied ? (
              <Check size={10} className="text-emerald-500 stroke-[3px]" aria-hidden="true" />
            ) : (
              <Copy size={10} aria-hidden="true" />
            )}
            <span>{copied ? "Copied" : "Copy"}</span>
          </button>
        </div>
        {/* User Avatar */}
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#113229] to-[#0D241E] flex items-center justify-center flex-shrink-0 mb-4 shadow-sm shadow-[#113229]/20 border border-[#113229]/10">
          <User size={13} className="text-white" aria-hidden="true" />
        </div>
      </div>
    );
  }

  // AI message
  return (
    <div className="flex items-end gap-2 mb-1 group font-outfit">
      {/* Bot Avatar */}
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center flex-shrink-0 mb-4 shadow-sm border border-slate-700">
        <Bot size={13} className="text-white" aria-hidden="true" />
      </div>

      <div className="flex flex-col items-start gap-1 max-w-[78%]">
        <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest pl-0.5 font-sans">
          MeetMind AI
        </span>

        {/* Bubble */}
        <div className="relative bg-white border border-[#e2e8f0] text-slate-700 px-4 py-3 rounded-2xl rounded-bl-sm text-xs leading-relaxed font-sans shadow-sm overflow-hidden animate-fade-in-up">
          {/* Top accent bar */}
          <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-[#113229] via-[#D98A44] to-[#0D241E]" />
          <div className="flex flex-col gap-1.5">
            {message.text.split(/\n+/).map((para, i) =>
              para.trim() ? <p key={i} className="m-0 font-medium">{para}</p> : null
            )}
          </div>
        </div>

        <button
          onClick={handleCopy}
          aria-label="Copy AI message to clipboard"
          className="flex items-center gap-1 text-[10px] text-slate-400 font-bold bg-none border-none cursor-pointer opacity-0 transition-opacity pl-0.5 group-hover:opacity-100 focus:opacity-100 group-focus-within:opacity-100 font-sans focus:outline-none focus:ring-1 focus:ring-[#113229] rounded px-1"
        >
          {copied ? (
            <Check size={10} className="text-emerald-500 stroke-[3px]" aria-hidden="true" />
          ) : (
            <Copy size={10} aria-hidden="true" />
          )}
          <span>{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>
    </div>
  );
};
