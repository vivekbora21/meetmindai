"use client";

import React from "react";

interface DashboardStatsInfo {
  total_meetings: number;
  hours_processed: number;
  ai_reports: number;
  knowledge_graphs: number;
  action_items: number;
  risks: number;
  most_used_platform: string;
  average_meeting_duration_minutes: number;
}

interface DashboardSectionProps {
  dashboardStats: DashboardStatsInfo | null;
}

export default function DashboardSection({ dashboardStats }: DashboardSectionProps) {
  if (!dashboardStats) return null;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-bold text-[#102C23]">Workspace Statistics & Dashboard</h2>
        <p className="text-xs text-slate-550 font-semibold">High-level operational metrics representing organizational intelligence assets.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
        {[
          { label: "Meetings Processed", val: dashboardStats.total_meetings },
          { label: "Hours Transcribed", val: `${dashboardStats.hours_processed} hrs` },
          { label: "AI Insights Compiled", val: dashboardStats.ai_reports },
          { label: "Mapped Entities", val: dashboardStats.knowledge_graphs },
          { label: "Action Items extracted", val: dashboardStats.action_items },
          { label: "Identified Risks", val: dashboardStats.risks }
        ].map((item, idx) => (
          <div key={idx} className="bg-[#F9F8F6] p-5 rounded-2xl border border-[#DEDDDA]/60 space-y-2 hover:shadow-md transition-shadow">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{item.label}</span>
            <h3 className="text-3xl font-extrabold text-[#102C23]">{item.val}</h3>
          </div>
        ))}
      </div>

      <div className="border-t border-[#DEDDDA]/40 pt-6 grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs font-semibold text-slate-500">
        <div>
          <span>Preferred platform:</span>
          <span className="font-bold text-[#113229] ml-2">{dashboardStats.most_used_platform}</span>
        </div>
        <div>
          <span>Average meeting duration:</span>
          <span className="font-bold text-[#113229] ml-2">{dashboardStats.average_meeting_duration_minutes} minutes</span>
        </div>
      </div>
    </div>
  );
}
