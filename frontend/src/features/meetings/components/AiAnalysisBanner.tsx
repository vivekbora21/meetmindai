import React from "react";
import { Sparkles, Loader2, AlertCircle, RefreshCw } from "lucide-react";

interface AiAnalysisBannerProps {
  aiStatus: string | null | undefined;
  onRun: () => void;
  isRunning: boolean;
}

/**
 * Shown on the Summary tab when AI analysis is absent, failed, or skipped.
 * Provides a clear CTA to trigger the AI analysis Celery task on demand.
 */
export const AiAnalysisBanner: React.FC<AiAnalysisBannerProps> = ({
  aiStatus,
  onRun,
  isRunning,
}) => {
  const isFailed = aiStatus === "FAILED";
  const isSkipped = aiStatus === "SKIPPED";
  const isRunningRemotely = aiStatus === "RUNNING";

  const statusMessage = isFailed
    ? "AI analysis failed during processing."
    : isSkipped
    ? "AI analysis was skipped because no transcript was found at that time."
    : "AI analysis hasn't been generated yet for this meeting.";

  const buttonLabel = isFailed ? "Retry AI Analysis" : isSkipped ? "Run AI Analysis" : "Generate AI Analysis";

  return (
    <div
      style={{
        background: "linear-gradient(135deg, #f0fdf9 0%, #f8fafc 60%, #f0fdf4 100%)",
        border: "1.5px dashed #99f6e4",
        borderRadius: "1.25rem",
        padding: "2rem 1.75rem",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "1.25rem",
        textAlign: "center",
        boxShadow: "0 2px 16px 0 rgba(15,118,110,0.06)",
      }}
    >
      {/* Icon */}
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: "1rem",
          background: isFailed
            ? "linear-gradient(135deg, #fef2f2 0%, #fff5f5 100%)"
            : "linear-gradient(135deg, #ccfbf1 0%, #f0fdf9 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: isFailed
            ? "0 4px 16px rgba(239,68,68,0.12)"
            : "0 4px 16px rgba(15,118,110,0.12)",
        }}
      >
        {isFailed ? (
          <AlertCircle style={{ width: 26, height: 26, color: "#ef4444" }} />
        ) : (
          <Sparkles style={{ width: 26, height: 26, color: "#0f766e" }} />
        )}
      </div>

      {/* Text block */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
        <h3
          style={{
            fontSize: "0.9rem",
            fontWeight: 700,
            color: "#0f172a",
            fontFamily: "Outfit, sans-serif",
            margin: 0,
          }}
        >
          {isFailed ? "AI Analysis Failed" : "No AI Analysis Yet"}
        </h3>
        <p
          style={{
            fontSize: "0.78rem",
            color: "#64748b",
            margin: 0,
            lineHeight: 1.6,
            maxWidth: 380,
          }}
        >
          {statusMessage}
          <br />
          Click below to generate insights — summary, action items, decisions, risks and more.
        </p>
      </div>

      {/* CTA Button */}
      {isRunningRemotely ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.625rem 1.5rem",
            background: "rgba(15,118,110,0.07)",
            borderRadius: "0.875rem",
            fontSize: "0.8rem",
            fontWeight: 600,
            color: "#0f766e",
            fontFamily: "Outfit, sans-serif",
          }}
        >
          <Loader2
            style={{
              width: 15,
              height: 15,
              color: "#0f766e",
              animation: "spin 1s linear infinite",
            }}
          />
          Analysing transcript…
        </div>
      ) : (
        <button
          id="run-ai-analysis-btn"
          onClick={onRun}
          disabled={isRunning}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.625rem 1.5rem",
            background: isRunning
              ? "rgba(15,118,110,0.08)"
              : isFailed
              ? "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)"
              : "linear-gradient(135deg, #0f766e 0%, #0d9488 100%)",
            color: isRunning ? "#0f766e" : "#fff",
            border: "none",
            borderRadius: "0.875rem",
            fontSize: "0.8rem",
            fontWeight: 700,
            fontFamily: "Outfit, sans-serif",
            cursor: isRunning ? "not-allowed" : "pointer",
            boxShadow: isRunning
              ? "none"
              : isFailed
              ? "0 4px 14px rgba(220,38,38,0.25)"
              : "0 4px 14px rgba(15,118,110,0.25)",
            transition: "all 0.2s ease",
            letterSpacing: "0.025em",
          }}
          onMouseEnter={e => {
            if (!isRunning) {
              (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)";
              (e.currentTarget as HTMLButtonElement).style.boxShadow = isFailed
                ? "0 6px 20px rgba(220,38,38,0.32)"
                : "0 6px 20px rgba(15,118,110,0.32)";
            }
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
            (e.currentTarget as HTMLButtonElement).style.boxShadow = isRunning
              ? "none"
              : isFailed
              ? "0 4px 14px rgba(220,38,38,0.25)"
              : "0 4px 14px rgba(15,118,110,0.25)";
          }}
        >
          {isRunning ? (
            <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} />
          ) : isFailed ? (
            <RefreshCw style={{ width: 14, height: 14 }} />
          ) : (
            <Sparkles style={{ width: 14, height: 14 }} />
          )}
          {isRunning ? "Queueing…" : buttonLabel}
        </button>
      )}

      {/* Hint */}
      <p
        style={{
          fontSize: "0.7rem",
          color: "#94a3b8",
          margin: 0,
          fontFamily: "Outfit, sans-serif",
        }}
      >
        This runs the AI pipeline in the background. The page will update automatically.
      </p>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
