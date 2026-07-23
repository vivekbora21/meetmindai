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
      <div className="flex flex-col items-center gap-2 text-center bg-slate-50 border border-slate-200 rounded-xl p-4 font-outfit">
        <span className="flex items-center gap-1.5 text-xs text-slate-500 font-bold font-sans">
          <Lock size={13} className="text-slate-400" aria-hidden="true" />
          This chat session is closed.
        </span>
        <button
          onClick={onReopen}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-[#113229] cursor-pointer font-sans hover:bg-slate-50 transition-colors"
        >
          <Unlock size={12} className="text-[#113229]" aria-hidden="true" />
          Reopen Session
        </button>
      </div>
    );
  }

  const isButtonDisabled = chatLoading || !chatInput.trim();

  return (
    <form
      onSubmit={onSubmit}
      className="flex items-center gap-2 bg-slate-50 border-[1.5px] border-slate-200 rounded-xl px-3.5 py-2 transition-all duration-150 focus-within:border-[#113229] focus-within:bg-white font-outfit"
    >
      <label htmlFor="chat-message-query-input" className="sr-only">
        Ask anything about this meeting
      </label>
      <Sparkles size={14} className="text-slate-350 flex-shrink-0" aria-hidden="true" />
      <input
        id="chat-message-query-input"
        type="text"
        placeholder="Ask anything about this meeting..."
        value={chatInput}
        onChange={(e) => setChatInput(e.target.value)}
        disabled={chatLoading}
        className="flex-1 bg-transparent border-none outline-none text-xs text-[#102C23] font-sans font-medium placeholder-slate-400 disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={isButtonDisabled}
        aria-label="Send message"
        className={`p-1.5 rounded-lg border-none flex items-center justify-center flex-shrink-0 transition-all ${
          isButtonDisabled 
            ? "bg-slate-300 text-white cursor-not-allowed shadow-none" 
            : "bg-gradient-to-br from-[#113229] to-[#0D241E] text-white cursor-pointer hover:scale-103 shadow-md shadow-[#113229]/20"
        }`}
      >
        <Send size={14} className="text-white" aria-hidden="true" />
      </button>
    </form>
  );
};
