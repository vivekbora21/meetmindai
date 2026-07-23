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
    <div className="w-[220px] flex flex-col gap-4 h-full select-none font-outfit">
      {/* New Chat Button */}
      <button
        onClick={onNewChat}
        className="w-full py-2.5 px-3.5 rounded-xl bg-gradient-to-r from-[#113229] to-[#0D241E] text-white text-xs font-bold border-none cursor-pointer flex items-center justify-center gap-2 shadow-sm shadow-[#113229]/20 transition-all duration-200 hover:-translate-y-0.5 active:scale-98"
      >
        <Plus size={14} className="stroke-[2.5]" aria-hidden="true" />
        <span>New Chat</span>
      </button>

      {/* Sessions List */}
      <nav aria-label="Recent chats" className="scrollbar flex flex-col gap-1 flex-1 overflow-y-auto pr-1">
        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest pl-2 mb-1 block font-sans">
          Recent Chats
        </span>
        {sessions.length === 0 ? (
          <span className="text-xs text-slate-400 italic pl-2 font-sans font-medium">
            No chats yet
          </span>
        ) : (
          <ul className="flex flex-col gap-1 m-0 p-0 list-none">
            {sessions.map((sess) => {
              const isActive = sess.id === activeSessionId;
              return (
                <li key={sess.id}>
                  <button
                    onClick={() => onSelectSession(sess.id, sess)}
                    aria-current={isActive ? "true" : undefined}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs cursor-pointer flex items-center justify-between gap-2 transition-all duration-150 border ${
                      isActive 
                        ? "bg-[#e6f4f1]/80 text-[#113229] border-[#b2e2db]/40 font-bold shadow-sm" 
                        : "bg-transparent text-slate-500 border-transparent hover:bg-slate-50 hover:text-slate-800"
                    }`}
                  >
                    <div className="flex items-center gap-2 overflow-hidden flex-1">
                      <MessageSquare
                        size={13}
                        className={`flex-shrink-0 transition-opacity ${isActive ? "opacity-100" : "opacity-60"}`}
                        aria-hidden="true"
                      />
                      <span className="white-space-nowrap overflow-hidden text-ellipsis flex-1">
                        {sess.title}
                      </span>
                    </div>
                    {sess.is_archived && (
                      <Lock size={11} className="flex-shrink-0 text-slate-400" aria-hidden="true" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </nav>
    </div>
  );
};
