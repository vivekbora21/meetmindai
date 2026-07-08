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
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottom: "1px solid #e2e8f0",
        paddingBottom: "12px",
        marginBottom: "12px",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      <div style={{ flex: 1, minWidth: 0, paddingRight: "8px" }}>
        {isEditingTitle ? (
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <input
              type="text"
              value={newTitleVal}
              onChange={(e) => setNewTitleVal(e.target.value)}
              style={{
                padding: "4px 8px",
                border: "1.5px solid #0f766e",
                borderRadius: "8px",
                fontSize: "12px",
                outline: "none",
                width: "100%",
                color: "#0f172a",
                fontFamily: "'Inter', sans-serif",
                fontWeight: 500,
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRenameTitle();
                if (e.key === "Escape") setIsEditingTitle(false);
              }}
              autoFocus
            />
            <button
              onClick={handleRenameTitle}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#0f766e",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "4px",
              }}
            >
              <Check size={16} strokeWidth={2.5} />
            </button>
          </div>
        ) : (
          <div
            style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}
            onClick={() => {
              setNewTitleVal(title || "New Chat");
              setIsEditingTitle(true);
            }}
            className="group"
          >
            <h3
              style={{
                margin: 0,
                fontWeight: 750,
                fontSize: "13px",
                color: "#0f172a",
                fontFamily: "'Outfit', sans-serif",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {title || "New Chat"}
            </h3>
            <Edit3
              size={12}
              style={{
                color: "#94a3b8",
                opacity: 0.6,
                transition: "opacity 0.2s",
                flexShrink: 0,
              }}
              className="group-hover:opacity-100"
            />
          </div>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "8px", position: "relative" }}>
        {isArchived ? (
          <button
            onClick={() => handleToggleArchive(false)}
            title="Reopen Conversation"
            style={{
              padding: "6px",
              borderRadius: "8px",
              background: "#ecfdf5",
              color: "#059669",
              border: "1px solid #a7f3d0",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#d1fae5";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#ecfdf5";
            }}
          >
            <Unlock size={13} />
          </button>
        ) : (
          <button
            onClick={() => handleToggleArchive(true)}
            title="End Session"
            style={{
              padding: "6px",
              borderRadius: "8px",
              background: "#fff",
              color: "#64748b",
              border: "1px solid #e2e8f0",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#fef2f2";
              e.currentTarget.style.color = "#ef4444";
              e.currentTarget.style.borderColor = "#fca5a5";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#fff";
              e.currentTarget.style.color = "#64748b";
              e.currentTarget.style.borderColor = "#e2e8f0";
            }}
          >
            <Lock size={13} />
          </button>
        )}

        <button
          onClick={handleClearChat}
          title="Clear current session messages"
          style={{
            padding: "6px",
            borderRadius: "8px",
            background: "#fff",
            color: "#64748b",
            border: "1px solid #e2e8f0",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#f8fafc";
            e.currentTarget.style.color = "#0f172a";
            e.currentTarget.style.borderColor = "#cbd5e1";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "#fff";
            e.currentTarget.style.color = "#64748b";
            e.currentTarget.style.borderColor = "#e2e8f0";
          }}
        >
          <Trash2 size={13} />
        </button>

        <div style={{ position: "relative" }}>
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            title="Export Chat"
            style={{
              padding: "6px",
              borderRadius: "8px",
              background: "#fff",
              color: "#64748b",
              border: "1px solid #e2e8f0",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#f0fdfa";
              e.currentTarget.style.color = "#0f766e";
              e.currentTarget.style.borderColor = "#99f6e4";
            }}
            onMouseLeave={(e) => {
              if (!showExportMenu) {
                e.currentTarget.style.background = "#fff";
                e.currentTarget.style.color = "#64748b";
                e.currentTarget.style.borderColor = "#e2e8f0";
              }
            }}
          >
            <Download size={13} />
          </button>
          {showExportMenu && (
            <div
              style={{
                position: "absolute",
                right: 0,
                marginTop: "6px",
                width: "160px",
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "12px",
                boxShadow:
                  "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
                zIndex: 20,
                padding: "4px 0",
                overflow: "hidden",
              }}
            >
              <button
                onClick={() => {
                  copyToClipboard();
                  setShowExportMenu(false);
                }}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "8px 12px",
                  fontSize: "12px",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#475569",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontFamily: "'Inter', sans-serif",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#f8fafc";
                  e.currentTarget.style.color = "#0f172a";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "none";
                  e.currentTarget.style.color = "#475569";
                }}
              >
                <Copy size={13} /> Copy to Clipboard
              </button>
              <button
                onClick={() => {
                  exportMarkdown();
                  setShowExportMenu(false);
                }}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "8px 12px",
                  fontSize: "12px",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#475569",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontFamily: "'Inter', sans-serif",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#f8fafc";
                  e.currentTarget.style.color = "#0f172a";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "none";
                  e.currentTarget.style.color = "#475569";
                }}
              >
                <FileText size={13} /> Export Markdown
              </button>
              <button
                onClick={() => {
                  exportPDF();
                  setShowExportMenu(false);
                }}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "8px 12px",
                  fontSize: "12px",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#475569",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontFamily: "'Inter', sans-serif",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#f8fafc";
                  e.currentTarget.style.color = "#0f172a";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "none";
                  e.currentTarget.style.color = "#475569";
                }}
              >
                <FileText size={13} /> Print / Export PDF
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
