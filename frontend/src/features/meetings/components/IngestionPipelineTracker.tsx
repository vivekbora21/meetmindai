import React, { useState } from "react";
import { Loader2, AlertTriangle, CheckCircle2, RotateCw } from "lucide-react";
import { MeetingDetail } from "../types/meeting";
import { meetingService } from "../services/meeting.service";

interface IngestionPipelineTrackerProps {
  detail: MeetingDetail;
  transcribing: boolean;
  onTranscribe: () => void;
}

export const IngestionPipelineTracker: React.FC<IngestionPipelineTrackerProps> = ({
  detail,
  transcribing,
  onTranscribe
}) => {
  const statusNorm = (detail.status || "").toUpperCase();
  const isFailed = statusNorm === "FAILED" || statusNorm === "ERROR";
  const isCompleted = statusNorm === "COMPLETED";
  const isPending = statusNorm === "PENDING" || statusNorm === "UPLOADED";

  const [retryingStage, setRetryingStage] = useState<string | null>(null);

  const handleRetryStage = async (stage: string) => {
    setRetryingStage(stage);
    try {
      await meetingService.retryStage(detail.id, stage);
      // Trigger a poll/refresh
      onTranscribe();
    } catch (err) {
      console.error("Error retrying stage:", err);
    } finally {
      setRetryingStage(null);
    }
  };

  // Helper to map and resolve statuses for each stage
  const getStageStatus = (stage: string): { status: "pending" | "running" | "completed" | "failed" | "skipped" } => {
    if (isFailed && statusNorm === "FAILED" && !detail.transcripts?.length && stage === "transcription") {
      return { status: "failed" };
    }

    switch (stage) {
      case "transcription":
        if (statusNorm === "TRANSCRIBED" || statusNorm === "ANALYZING" || isCompleted) {
          return { status: "completed" };
        }
        if (statusNorm === "PROCESSING" || transcribing) {
          return { status: "running" };
        }
        return { status: "pending" };

      case "diarization":
        const spkStat = (detail.speaker_status || "").toUpperCase();
        if (spkStat === "COMPLETED" || spkStat === "SUCCESS" || isCompleted) {
          return { status: "completed" };
        }
        if (spkStat === "RUNNING") {
          return { status: "running" };
        }
        if (spkStat === "FAILED") {
          return { status: "failed" };
        }
        if (spkStat === "SKIPPED") {
          return { status: "skipped" };
        }
        return { status: "pending" };

      case "embedding":
        const embStat = (detail.embedding_status || "").toUpperCase();
        if (embStat === "SUCCESS" || embStat === "COMPLETED" || isCompleted) {
          return { status: "completed" };
        }
        if (embStat === "RUNNING") {
          return { status: "running" };
        }
        if (embStat === "FAILED") {
          return { status: "failed" };
        }
        return { status: "pending" };

      case "analysis":
        const aiStat = (detail.ai_status || "").toUpperCase();
        if (aiStat === "SUCCESS" || aiStat === "COMPLETED" || isCompleted) {
          return { status: "completed" };
        }
        if (aiStat === "RUNNING") {
          return { status: "running" };
        }
        if (aiStat === "FAILED") {
          return { status: "failed" };
        }
        if (aiStat === "SKIPPED") {
          return { status: "skipped" };
        }
        return { status: "pending" };

      case "knowledge_graph":
        const kgStat = (detail.kg_status || "").toUpperCase();
        if (kgStat === "SUCCESS" || kgStat === "COMPLETED" || isCompleted) {
          return { status: "completed" };
        }
        if (kgStat === "RUNNING") {
          return { status: "running" };
        }
        if (kgStat === "FAILED") {
          return { status: "failed" };
        }
        if (kgStat === "SKIPPED") {
          return { status: "skipped" };
        }
        return { status: "pending" };

      default:
        return { status: "pending" };
    }
  };

  const steps = [
    { id: "transcription", label: "Audio Transcription" },
    { id: "diarization", label: "Speaker Diarization & Mapping" },
    { id: "embedding", label: "Vector Embeddings Generation" },
    { id: "analysis", label: "AI Insights Extraction" },
    { id: "knowledge_graph", label: "Knowledge Graph Integration" },
  ];

  return (
    <div className="p-8 rounded-2xl bg-white border border-slate-200 flex flex-col gap-6 shadow-sm">
      <div className="flex flex-col gap-1">
        {isFailed ? (
          <h3 className="font-bold text-sm text-rose-700 font-outfit">Processing encountered issues</h3>
        ) : (
          <h3 className="font-bold text-sm text-[#102C23] font-outfit">AI processing in progress</h3>
        )}
        <p className="text-xs text-slate-500 font-medium">
          {isFailed
            ? "One or more pipeline stages failed. You can retry them independently below."
            : "MeetingMind AI is processing your meeting through our modular pipeline."}
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {steps.map((s, index) => {
          const { status } = getStageStatus(s.id);
          const isCurrentRetrying = retryingStage === s.id;

          return (
            <div key={s.id} className="flex items-center justify-between py-1 border-b border-[#F9F8F6] last:border-0">
              <div className="flex items-center gap-3">
                {status === "completed" ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                ) : status === "running" ? (
                  <Loader2 className="w-5 h-5 text-[#113229] animate-spin flex-shrink-0" />
                ) : status === "failed" ? (
                  <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
                ) : status === "skipped" ? (
                  <div className="w-5 h-5 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center text-[8px] font-bold text-slate-400 flex-shrink-0">
                    S
                  </div>
                ) : (
                  <div className="w-5 h-5 rounded-full border-2 border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-400 flex-shrink-0">
                    {index + 1}
                  </div>
                )}
                <span className={`text-xs font-semibold ${
                  status === "running" ? "text-[#113229]" : status === "completed" ? "text-[#102C23]" : status === "failed" ? "text-rose-700" : "text-slate-400"
                }`}>
                  {s.label}
                </span>
              </div>

              {status === "failed" && (
                <button
                  onClick={() => handleRetryStage(s.id)}
                  disabled={isCurrentRetrying || transcribing}
                  className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold text-rose-700 hover:text-white bg-rose-50 hover:bg-rose-600 rounded-md transition-all border border-rose-200"
                >
                  {isCurrentRetrying ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <RotateCw className="w-3 h-3" />
                  )}
                  Retry Stage
                </button>
              )}
            </div>
          );
        })}
      </div>

      {isFailed && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex flex-col gap-2">
          <span className="text-xs font-bold text-rose-800 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4" /> Global processing halted
          </span>
          <p className="text-[11px] text-rose-700 leading-relaxed font-medium">
            Some stages did not complete successfully. You can retry the failed stages individually, or trigger a full re-transcription.
          </p>
          <button
            onClick={onTranscribe}
            disabled={transcribing || retryingStage !== null}
            className="w-full mt-1 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            {transcribing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Full Restart Pipeline"}
          </button>
        </div>
      )}

      {isPending && (
        <button
          onClick={onTranscribe}
          disabled={transcribing || retryingStage !== null}
          className="py-2 rounded-xl bg-[#113229] hover:bg-[#0D241E] text-white text-xs font-bold transition-all shadow-md shadow-[#113229]/10 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {transcribing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Trigger Transcription"}
        </button>
      )}
    </div>
  );
};
