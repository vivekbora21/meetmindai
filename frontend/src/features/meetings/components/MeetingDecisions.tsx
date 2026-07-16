import React from "react";
import { CheckSquare } from "lucide-react";
import { MeetingDetail, Decision } from "../types/meeting";
import { InsightSkeleton } from "./InsightSkeleton";

interface MeetingDecisionsProps {
  detail: MeetingDetail;
}

export const MeetingDecisions: React.FC<MeetingDecisionsProps> = ({ detail }) => {
  const status = (detail.decisions_status || detail.ai_status || "").toUpperCase();
  const isLoading = !detail.decisions && !["COMPLETED", "SUCCESS", "FAILED", "ERROR", "SKIPPED"].includes(status);

  if (isLoading) {
    return <InsightSkeleton title="Decisions" hint="Pulling out the decisions and resolutions discussed." accentClassName="bg-emerald-200" />;
  }

  return (
    <div className="flex flex-col gap-4">
      {detail.decisions ? detail.decisions.map((dec: Decision, idx: number) => (
        <div key={idx} className="p-4 rounded-2xl bg-teal-50/20 border border-teal-100 flex flex-col gap-2 shadow-sm">
          <span className="text-xs font-bold text-[#102C23] font-outfit flex items-center gap-1.5">
            <CheckSquare className="w-4 h-4 text-[#113229]" /> {dec.decision_text}
          </span>
          <div className="text-xs text-slate-500">
            <span className="font-semibold text-slate-400">Rationale:</span> {dec.rationale}
          </div>
        </div>
      )) : (
        <div className="text-xs text-slate-400">No decisions detected</div>
      )}
    </div>
  );
};
