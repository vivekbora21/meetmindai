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
    <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-3">
      <div className="flex-1 min-w-0 pr-2">
        {isEditingTitle ? (
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={newTitleVal}
              onChange={(e) => setNewTitleVal(e.target.value)}
              className="px-2 py-0.5 border border-[#0f766e] rounded text-xs focus:outline-none w-full text-[#0f172a]"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRenameTitle();
                if (e.key === "Escape") setIsEditingTitle(false);
              }}
              autoFocus
            />
            <button onClick={handleRenameTitle} className="text-[#0f766e] hover:text-[#0d9488]">
              <Check className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 group cursor-pointer" onClick={() => {
            setNewTitleVal(title || "New Chat");
            setIsEditingTitle(true);
          }}>
            <h3 className="font-bold text-sm text-[#0f172a] font-outfit truncate">
              {title || "New Chat"}
            </h3>
            <Edit3 className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5 relative">
        {isArchived ? (
          <button
            onClick={() => handleToggleArchive(false)}
            title="Reopen Conversation"
            className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/50 transition-colors"
          >
            <Unlock className="w-3.5 h-3.5" />
          </button>
        ) : (
          <button
            onClick={() => handleToggleArchive(true)}
            title="End Session"
            className="p-1.5 rounded-lg hover:bg-slate-50 text-slate-500 hover:text-red-650 transition-colors border border-slate-200"
          >
            <Lock className="w-3.5 h-3.5" />
          </button>
        )}

        <button
          onClick={handleClearChat}
          title="Clear current session messages"
          className="p-1.5 rounded-lg hover:bg-slate-50 text-slate-500 hover:text-[#0f172a] transition-colors border border-slate-200"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>

        <div className="relative">
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            title="Export Chat"
            className="p-1.5 rounded-lg hover:bg-slate-50 text-slate-500 hover:text-[#0f766e] transition-colors border border-slate-200"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          {showExportMenu && (
            <div className="absolute right-0 mt-1.5 w-40 bg-white border border-slate-200 rounded-xl shadow-lg z-20 py-1 overflow-hidden animate-in fade-in slide-in-from-top-1">
              <button
                onClick={() => { copyToClipboard(); setShowExportMenu(false); }}
                className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 text-slate-500 hover:text-[#0f172a] flex items-center gap-2"
              >
                <Copy className="w-3.5 h-3.5" /> Copy to Clipboard
              </button>
              <button
                onClick={() => { exportMarkdown(); setShowExportMenu(false); }}
                className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 text-slate-500 hover:text-[#0f172a] flex items-center gap-2"
              >
                <FileText className="w-3.5 h-3.5" /> Export Markdown
              </button>
              <button
                onClick={() => { exportPDF(); setShowExportMenu(false); }}
                className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 text-slate-500 hover:text-[#0f172a] flex items-center gap-2"
              >
                <FileText className="w-3.5 h-3.5" /> Print / Export PDF
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
