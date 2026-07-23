import React from "react";
import { Edit3, Check, Unlock, Lock, Trash2, Download, Copy, FileText } from "lucide-react";

interface ChatHeaderProps {
  title: string;
  isArchived: boolean;
  isEditingTitle: boolean;
  newTitleVal: string;
  showExportMenu: boolean;
  setNewTitleVal: (val: string) => void;
  setIsEditingTitle: (val: boolean) => void;
  setShowExportMenu: (val: boolean) => void;
  handleRenameTitle: () => void;
  handleToggleArchive: (archive: boolean) => void;
  handleClearChat: () => void;
  copyToClipboard: () => void;
  exportMarkdown: () => void;
  exportPDF: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  title,
  isArchived,
  isEditingTitle,
  newTitleVal,
  showExportMenu,
  setNewTitleVal,
  setIsEditingTitle,
  setShowExportMenu,
  handleRenameTitle,
  handleToggleArchive,
  handleClearChat,
  copyToClipboard,
  exportMarkdown,
  exportPDF
}) => {
  return (
    <div className="flex items-center justify-between border-b border-[#e2e8f0]/80 pb-3 mb-3 w-full box-border font-outfit">
      <div className="flex-1 min-w-0 pr-2">
        {isEditingTitle ? (
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={newTitleVal}
              onChange={(e) => setNewTitleVal(e.target.value)}
              aria-label="Edit chat title"
              className="px-2.5 py-1 border-[1.5px] border-[#113229] rounded-lg text-xs outline-none w-full text-[#102C23] font-sans font-medium bg-[#F9F8F6]/30 focus:bg-white transition-colors"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRenameTitle();
                if (e.key === "Escape") setIsEditingTitle(false);
              }}
              autoFocus
            />
            <button
              onClick={handleRenameTitle}
              aria-label="Confirm rename"
              className="bg-none border-none cursor-pointer text-[#113229] flex items-center justify-center p-1 hover:scale-105 transition-transform"
            >
              <Check size={16} className="stroke-[2.5]" aria-hidden="true" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              setNewTitleVal(title || "New Chat");
              setIsEditingTitle(true);
            }}
            aria-label={`Rename conversation: ${title || "New Chat"}`}
            className="flex items-center gap-1.5 cursor-pointer group bg-transparent border-0 p-0 text-left focus:outline-none"
          >
            <h3 className="m-0 font-extrabold text-[13px] text-[#102C23] font-outfit whitespace-nowrap overflow-hidden text-ellipsis group-hover:text-[#113229] transition-colors">
              {title || "New Chat"}
            </h3>
            <Edit3
              size={12}
              className="text-slate-400 opacity-60 transition-opacity flex-shrink-0 group-hover:opacity-100"
              aria-hidden="true"
            />
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 relative">
        {isArchived ? (
          <button
            onClick={() => handleToggleArchive(false)}
            title="Reopen Conversation"
            aria-label="Reopen Conversation"
            className="p-1.5 rounded-lg bg-teal-50 text-teal-600 border border-teal-200 cursor-pointer flex items-center justify-center transition-all hover:bg-teal-100"
          >
            <Unlock size={13} aria-hidden="true" />
          </button>
        ) : (
          <button
            onClick={() => handleToggleArchive(true)}
            title="End Session"
            aria-label="End Session"
            className="p-1.5 rounded-lg bg-white text-slate-500 border border-slate-200 cursor-pointer flex items-center justify-center transition-all hover:bg-rose-50 hover:text-rose-600 hover:border-rose-300"
          >
            <Lock size={13} aria-hidden="true" />
          </button>
        )}

        <button
          onClick={handleClearChat}
          title="Clear current session messages"
          aria-label="Clear current session messages"
          className="p-1.5 rounded-lg bg-white text-slate-500 border border-slate-200 cursor-pointer flex items-center justify-center transition-all hover:bg-slate-50 hover:text-slate-800 hover:border-slate-300"
        >
          <Trash2 size={13} aria-hidden="true" />
        </button>

        <div className="relative">
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            title="Export Chat"
            aria-label="Export Chat options"
            aria-expanded={showExportMenu}
            className={`p-1.5 rounded-lg border cursor-pointer flex items-center justify-center transition-all ${
              showExportMenu 
                ? "bg-teal-50 text-[#113229] border-teal-200" 
                : "bg-white text-slate-500 border-slate-200 hover:bg-[#e6f4f1]/50 hover:text-[#113229] hover:border-[#113229]/30"
            }`}
          >
            <Download size={13} aria-hidden="true" />
          </button>
          {showExportMenu && (
            <div 
              role="menu"
              aria-label="Export Chat options"
              className="absolute right-0 mt-1.5 w-40 bg-white border border-[#e2e8f0]/85 rounded-xl shadow-lg z-20 py-1 overflow-hidden animate-fade-in-up"
            >
              <button
                role="menuitem"
                onClick={() => {
                  copyToClipboard();
                  setShowExportMenu(false);
                }}
                className="w-full text-left px-3 py-2 text-xs bg-none border-none cursor-pointer text-slate-600 flex items-center gap-2 font-sans font-medium hover:bg-slate-50 hover:text-slate-800 transition-colors"
              >
                <Copy size={13} aria-hidden="true" /> Copy to Clipboard
              </button>
              <button
                role="menuitem"
                onClick={() => {
                  exportMarkdown();
                  setShowExportMenu(false);
                }}
                className="w-full text-left px-3 py-2 text-xs bg-none border-none cursor-pointer text-slate-600 flex items-center gap-2 font-sans font-medium hover:bg-slate-50 hover:text-slate-800 transition-colors"
              >
                <FileText size={13} aria-hidden="true" /> Export Markdown
              </button>
              <button
                role="menuitem"
                onClick={() => {
                  exportPDF();
                  setShowExportMenu(false);
                }}
                className="w-full text-left px-3 py-2 text-xs bg-none border-none cursor-pointer text-slate-600 flex items-center gap-2 font-sans font-medium hover:bg-slate-50 hover:text-slate-800 transition-colors"
              >
                <FileText size={13} aria-hidden="true" /> Print / Export PDF
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
