import React from "react";
import { Plus, Lock } from "lucide-react";
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
    <div className="w-36 flex-shrink-0 flex flex-col gap-2 border-r border-slate-200 pr-2.5">
      <button
        onClick={onNewChat}
        className="w-full py-1.5 px-2 rounded-xl bg-[#0f766e] hover:bg-[#0d9488] text-white text-[10px] font-bold transition-all flex items-center justify-center gap-1 shadow-sm shadow-[#0f766e]/10 hover:shadow-md"
      >
        <Plus className="w-3 h-3" /> New Chat
      </button>

      <div className="flex-grow overflow-y-auto flex flex-col gap-1.5 select-none scrollbar">
        <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-450 mt-1 pl-1">Recent Chats</span>
        {sessions.length === 0 ? (
          <span className="text-[10px] text-slate-450 italic pl-1">No chats yet</span>
        ) : (
          sessions.map((sess) => {
            const isActive = sess.id === activeSessionId;
            return (
              <button
                key={sess.id}
                onClick={() => onSelectSession(sess.id, sess)}
                className={`w-full text-left px-2 py-1.5 rounded-lg text-[10px] font-semibold transition-all truncate flex items-center justify-between gap-1 group ${
                  isActive
                    ? "bg-[#e6f4f1] text-[#0f766e] border border-teal-100 font-bold"
                    : "text-slate-500 hover:bg-slate-50 hover:text-[#0f172a]"
                }`}
              >
                <span className="truncate flex-1">{sess.title}</span>
                {sess.is_archived && <Lock className="w-2.5 h-2.5 text-slate-400 flex-shrink-0" />}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
