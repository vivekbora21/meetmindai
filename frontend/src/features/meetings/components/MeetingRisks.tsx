import React from "react";
import { ShieldAlert } from "lucide-react";
import { MeetingDetail } from "../types/meeting";

interface MeetingRisksProps {
  detail: MeetingDetail;
}

export const MeetingRisks: React.FC<MeetingRisksProps> = ({ detail }) => {
  return (
    <div className="flex flex-col gap-4">
      {detail.risks ? detail.risks.map((risk: any, idx: number) => (
        <div key={idx} className="p-4 rounded-2xl bg-rose-50/30 border border-rose-200/60 flex flex-col gap-2 shadow-sm">
          <div className="flex justify-between items-center">
            <span className="text-sm font-bold text-[#102C23] font-outfit flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-rose-600" /> {risk.risk_text}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 font-semibold capitalize">
              {risk.severity} Severity
            </span>
          </div>
          <div className="text-xs text-slate-650">
            <span className="font-semibold text-slate-400">Mitigation:</span> {risk.mitigation}
          </div>
        </div>
      )) : (
        <div className="text-xs text-slate-400">No risks detected</div>
      )}
    </div>
  );
};
