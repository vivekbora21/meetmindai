import React from "react";
import { Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { MeetingDetail } from "../types/meeting";

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
  const isPending = statusNorm === "PENDING";

  const getPipelineStep = () => {
    if (isCompleted) return 5;
    if (isFailed) return -1;
    // Map backend statuses to pipeline steps
    if (statusNorm === "UPLOADED" || isPending) return 1;
    if (statusNorm === "PROCESSING" || statusNorm === "TRANSCRIBING") return 2;
    if (!detail.transcripts || detail.transcripts.length === 0) return 2;
    if (statusNorm === "TRANSCRIBED" || statusNorm === "ANALYZING") return 3;
    if (!detail.executive_summary) return 3;
    return 4;
  };

  const currentStep = getPipelineStep();

  return (
    <div className="p-8 rounded-2xl bg-white border border-slate-200 flex flex-col gap-6 shadow-sm">
      <div className="flex flex-col gap-1">
        {isFailed ? (
          <h3 className="font-bold text-sm text-rose-700 font-outfit">Processing failed</h3>
        ) : (
          <h3 className="font-bold text-sm text-[#0f172a] font-outfit">AI processing in progress</h3>
        )}
        <p className="text-xs text-slate-500 font-medium">
          {isFailed
            ? "An error occurred during processing. You can retry below."
            : "MeetingMind AI is transcribing and building the knowledge graph for your meeting."}
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {[
          { step: 1, label: "File Ingested", active: currentStep >= 1, done: currentStep > 1 },
          { step: 2, label: "Transcribing Audio", active: currentStep >= 2, done: currentStep > 2, loading: currentStep === 2 },
          { step: 3, label: "Extracting Insights (Summary & Action Items)", active: currentStep >= 3, done: currentStep > 3, loading: currentStep === 3 },
          { step: 4, label: "Seeding Knowledge Graph", active: currentStep >= 4, done: currentStep > 4, loading: currentStep === 4 }
        ].map((s) => (
          <div key={s.step} className="flex items-center gap-3">
            {s.done ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            ) : s.loading ? (
              <Loader2 className="w-5 h-5 text-[#0f766e] animate-spin flex-shrink-0" />
            ) : (
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                s.active ? "border-[#0f766e] text-[#0f766e]" : "border-slate-200 text-slate-400"
              }`}>
                {s.step}
              </div>
            )}
            <span className={`text-xs font-semibold ${
              s.active ? "text-[#0f172a]" : "text-slate-400"
            }`}>
              {s.label}
            </span>
          </div>
        ))}
      </div>

      {isFailed && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex flex-col gap-2">
          <span className="text-xs font-bold text-rose-800 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4" /> Processing failed
          </span>
          <p className="text-[11px] text-rose-700 leading-relaxed font-medium">
            An error occurred while transcribing or generating insights for this meeting. You can try triggering the transcription again.
          </p>
          <button
            onClick={onTranscribe}
            disabled={transcribing}
            className="w-full mt-1 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            {transcribing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Retry Processing"}
          </button>
        </div>
      )}

      {isPending && (
        <button
          onClick={onTranscribe}
          disabled={transcribing}
          className="py-2 rounded-xl bg-[#0f766e] hover:bg-[#0d9488] text-white text-xs font-bold transition-all shadow-md shadow-[#0f766e]/10 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {transcribing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Trigger Transcription"}
        </button>
      )}
    </div>
  );
};
