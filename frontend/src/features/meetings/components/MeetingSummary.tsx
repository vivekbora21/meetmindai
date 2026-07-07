import React from "react";
import { Sparkles, CheckCircle2 } from "lucide-react";
import { MeetingDetail } from "../types/meeting";

interface MeetingSummaryProps {
  detail: MeetingDetail;
}

export const MeetingSummary: React.FC<MeetingSummaryProps> = ({ detail }) => {
  return (
    <div className="flex flex-col gap-6">
      {detail.executive_summary && (
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col gap-3">
          <h4 className="text-xs font-bold text-[#0f172a] uppercase tracking-wider flex items-center gap-1.5 font-outfit">
            <Sparkles className="w-4 h-4 text-[#0f766e]" /> Executive Summary
          </h4>
          <p className="text-xs text-slate-700 leading-relaxed font-medium">{detail.executive_summary}</p>
        </div>
      )}

      {detail.key_themes && detail.key_themes.length > 0 && (
        <div className="flex flex-col gap-2">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-outfit pl-1">Key Themes</h4>
          <div className="flex flex-wrap gap-2">
            {detail.key_themes.map((theme: string, idx: number) => (
              <span key={idx} className="px-3 py-1 rounded-xl bg-teal-50/50 border border-teal-100 text-xs text-[#0f766e] font-semibold shadow-sm">
                {theme}
              </span>
            ))}
          </div>
        </div>
      )}

      {detail.main_takeaways && detail.main_takeaways.length > 0 && (
        <div className="flex flex-col gap-3">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-outfit pl-1">Main Takeaways</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {detail.main_takeaways.map((takeaway: string, idx: number) => (
              <div key={idx} className="p-3 rounded-2xl bg-white border border-slate-200 flex gap-3 items-start shadow-sm">
                <CheckCircle2 className="w-4 h-4 text-[#0f766e] flex-shrink-0 mt-0.5" />
                <span className="text-xs text-[#0f172a] font-medium leading-relaxed">{takeaway}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
