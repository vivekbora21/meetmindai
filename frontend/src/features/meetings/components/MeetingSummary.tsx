import React from "react";
import { Sparkles } from "lucide-react";
import { MeetingDetail } from "../types/meeting";
import { InsightSkeleton } from "./InsightSkeleton";

interface MeetingSummaryProps {
  detail: MeetingDetail;
}

export const MeetingSummary: React.FC<MeetingSummaryProps> = ({ detail }) => {
  const summaryStatus = (detail.executive_summary_status || detail.ai_status || "").toUpperCase();
  const themeStatus = (detail.key_themes_status || detail.ai_status || "").toUpperCase();
  const isSummaryLoading = !detail.executive_summary && !["COMPLETED", "SUCCESS", "FAILED", "ERROR", "SKIPPED"].includes(summaryStatus);
  const isThemeLoading = (!detail.key_themes || detail.key_themes.length === 0) && !["COMPLETED", "SUCCESS", "FAILED", "ERROR", "SKIPPED"].includes(themeStatus);

  return (
    <div className="flex flex-col gap-6">
      {detail.executive_summary ? (
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-[#102C23] uppercase tracking-wider flex items-center gap-1.5 font-outfit">
              <Sparkles className="w-4 h-4 text-[#113229]" /> Executive Summary
            </h4>
            {detail.language && (
              <span className="px-2.5 py-0.5 text-[10px] font-bold bg-[#113229]/10 text-[#113229] rounded-lg border border-[#113229]/20 uppercase tracking-wider font-outfit">
                Language: {detail.language}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-700 leading-relaxed font-medium">{detail.executive_summary}</p>
        </div>
      ) : isSummaryLoading ? (
        <InsightSkeleton
          title="Executive Summary"
          hint="Generating summary from the transcript in the background."
          accentClassName="bg-teal-200"
        />
      ) : null}

      {detail.key_themes && detail.key_themes.length > 0 ? (
        <div className="flex flex-col gap-2">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-outfit pl-1">Key Themes</h4>
          <div className="flex flex-wrap gap-2">
            {detail.key_themes.map((theme: string, idx: number) => (
              <span key={idx} className="px-3 py-1 rounded-xl bg-teal-50/50 border border-teal-100 text-xs text-[#113229] font-semibold shadow-sm">
                {theme}
              </span>
            ))}
          </div>
        </div>
      ) : isThemeLoading ? (
        <InsightSkeleton
          title="Key Themes"
          hint="Detecting repeated topics and framing the main themes."
          accentClassName="bg-emerald-200"
        />
      ) : null}
    </div>
  );
};
