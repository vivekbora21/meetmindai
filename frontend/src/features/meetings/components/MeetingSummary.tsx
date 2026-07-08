import React from "react";
import { Sparkles, CheckCircle2, Quote } from "lucide-react";
import { MeetingDetail } from "../types/meeting";

interface MeetingSummaryProps {
  detail: MeetingDetail;
}

export const MeetingSummary: React.FC<MeetingSummaryProps> = ({ detail }) => {
  return (
    <div className="flex flex-col gap-6">
      {detail.executive_summary && (
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-[#0f172a] uppercase tracking-wider flex items-center gap-1.5 font-outfit">
              <Sparkles className="w-4 h-4 text-[#0f766e]" /> Executive Summary
            </h4>
            {detail.language && (
              <span className="px-2.5 py-0.5 text-[10px] font-bold bg-[#0f766e]/10 text-[#0f766e] rounded-lg border border-[#0f766e]/20 uppercase tracking-wider font-outfit">
                Language: {detail.language}
              </span>
            )}
          </div>
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
    </div>
  );
};
