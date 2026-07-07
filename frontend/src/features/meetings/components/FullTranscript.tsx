import React, { useState } from "react";
import { MeetingDetail } from "../types/meeting";
import { ChevronDown, ChevronUp, FileText, User } from "lucide-react";

interface FullTranscriptProps {
  detail: MeetingDetail;
}

const PAGE_SIZE = 10;

const SPEAKER_COLORS = [
  { bg: "#f0fdfb", text: "#0f766e", border: "#99f6e4" },
  { bg: "#f5f3ff", text: "#7c3aed", border: "#ddd6fe" },
  { bg: "#fffbeb", text: "#b45309", border: "#fde68a" },
  { bg: "#fff1f2", text: "#be123c", border: "#fecdd3" },
  { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" },
];

function getSpeakerColor(tag: string) {
  const idx = (tag?.charCodeAt((tag?.length ?? 1) - 1) || 0) % SPEAKER_COLORS.length;
  return SPEAKER_COLORS[idx];
}

export const FullTranscript: React.FC<FullTranscriptProps> = ({ detail }) => {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const transcripts = detail.transcripts ?? [];
  const total = transcripts.length;
  const visible = transcripts.slice(0, visibleCount);
  const hasMore = visibleCount < total;

  const getSpeakerName = (t: any) =>
    detail.speakers?.find((s: any) => s.speaker_tag === t.speaker_tag)?.display_name ||
    t.speaker_tag ||
    "Unknown";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "24px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h3 style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", fontWeight: 700, color: "#0f172a", fontFamily: "'Inter', sans-serif", margin: 0 }}>
          <FileText size={15} color="#0f766e" />
          Full Transcript
        </h3>
        {total > 0 && (
          <span style={{ fontSize: "10px", fontWeight: 600, color: "#94a3b8", background: "#f1f5f9", padding: "2px 10px", borderRadius: "99px", fontFamily: "'Inter', sans-serif" }}>
            {Math.min(visibleCount, total)} / {total} segments
          </span>
        )}
      </div>

      {/* Card */}
      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "16px", boxShadow: "0 1px 6px rgba(15,23,42,0.05)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {/* Scrollable list */}
        <div
          className="scrollbar"
          style={{
            overflowY: "auto",
            maxHeight: "420px",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {total === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 16px", gap: "12px", textAlign: "center" }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <FileText size={18} color="#94a3b8" />
              </div>
              <p style={{ fontSize: "12px", color: "#94a3b8", fontWeight: 500, fontFamily: "'Inter', sans-serif", margin: 0 }}>No transcript segments found</p>
            </div>
          ) : (
            visible.map((t: any, idx: number) => {
              const speakerName = getSpeakerName(t);
              const color = getSpeakerColor(speakerName);
              const timestamp =
                t.start_time != null
                  ? `${Math.floor(t.start_time / 60)}:${String(Math.round(t.start_time % 60)).padStart(2, "0")}`
                  : null;

              return (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    gap: "12px",
                    padding: "14px 20px",
                    borderBottom: idx < visible.length - 1 ? "1px solid #f1f5f9" : "none",
                    transition: "background 0.12s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#fafafa")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  {/* Avatar */}
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      background: color.bg,
                      border: `1px solid ${color.border}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      marginTop: "1px",
                    }}
                  >
                    <User size={13} color={color.text} />
                  </div>

                  <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "4px" }}>
                    {/* Speaker row */}
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "11px", fontWeight: 700, color: color.text, fontFamily: "'Inter', sans-serif" }}>
                        {speakerName}
                      </span>
                      {timestamp && (
                        <span style={{ fontSize: "9px", fontWeight: 600, color: "#94a3b8", background: "#f1f5f9", padding: "1px 7px", borderRadius: "99px", fontFamily: "'Inter', sans-serif" }}>
                          {timestamp}
                        </span>
                      )}
                    </div>
                    {/* Text */}
                    <p style={{ fontSize: "12px", color: "#475569", lineHeight: 1.65, fontWeight: 400, fontFamily: "'Inter', sans-serif", margin: 0, wordBreak: "break-word" }}>
                      {t.text}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer: View More / View Less */}
        {(hasMore || visibleCount > PAGE_SIZE) && (
          <div style={{ borderTop: "1px solid #f1f5f9", padding: "10px 20px", background: "#fafafa", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "10px", fontWeight: 600, color: "#94a3b8", fontFamily: "'Inter', sans-serif" }}>
              {hasMore
                ? `${total - visibleCount} more segment${total - visibleCount !== 1 ? "s" : ""} remaining`
                : `All ${total} segments loaded`}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              {/* View Less — always show when expanded past PAGE_SIZE */}
              {visibleCount > PAGE_SIZE && (
                <button
                  onClick={() => setVisibleCount(PAGE_SIZE)}
                  style={{
                    display: "flex", alignItems: "center", gap: "4px",
                    fontSize: "12px", fontWeight: 700, color: "#64748b",
                    background: "none", border: "1px solid transparent",
                    borderRadius: "8px", padding: "4px 10px",
                    cursor: "pointer", fontFamily: "'Inter', sans-serif",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = "#f1f5f9";
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "#e2e8f0";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = "none";
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "transparent";
                  }}
                >
                  <ChevronUp size={13} />
                  View Less
                </button>
              )}
              {/* View More — only when more remain */}
              {hasMore && (
                <button
                  onClick={() => setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, total))}
                  style={{
                    display: "flex", alignItems: "center", gap: "4px",
                    fontSize: "12px", fontWeight: 700, color: "#0f766e",
                    background: "none", border: "1px solid transparent",
                    borderRadius: "8px", padding: "4px 10px",
                    cursor: "pointer", fontFamily: "'Inter', sans-serif",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = "#f0fdfb";
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "#99f6e4";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = "none";
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "transparent";
                  }}
                >
                  View More
                  <ChevronDown size={13} />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
