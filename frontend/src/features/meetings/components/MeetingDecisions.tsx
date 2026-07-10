import React from "react";
import { CheckSquare } from "lucide-react";
import { MeetingDetail } from "../types/meeting";

interface MeetingDecisionsProps {
  detail: MeetingDetail;
}

export const MeetingDecisions: React.FC<MeetingDecisionsProps> = ({ detail }) => {
  return (
    <div className="flex flex-col gap-4">
      {detail.decisions ? detail.decisions.map((dec: any, idx: number) => (
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
