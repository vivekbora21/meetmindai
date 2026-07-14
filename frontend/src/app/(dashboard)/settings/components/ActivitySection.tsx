"use client";

import React from "react";

interface ActivityLogItem {
  id: string;
  action: string;
  details: string;
  ip_address: string;
  created_at: string;
}

interface ActivitySectionProps {
  activityLogs: ActivityLogItem[];
}

export default function ActivitySection({ activityLogs }: ActivitySectionProps) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-bold text-[#102C23]">Security Audit Logs & Timeline</h2>
        <p className="text-xs text-slate-550 font-semibold">Detailed historical audit trails of configuration updates, integrations, and uploads.</p>
      </div>

      <div className="relative border-l-2 border-slate-200 ml-3 pl-6 space-y-6">
        {activityLogs.map(log => (
          <div key={log.id} className="relative">
            <div className="absolute -left-[31px] top-1 bg-white p-1 rounded-full border border-slate-250 flex items-center justify-center">
              <div className="w-2.5 h-2.5 bg-[#113229] rounded-full" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-800">{log.action}</span>
                <span className="text-[10px] text-slate-400 font-semibold">{new Date(log.created_at).toLocaleString()}</span>
              </div>
              <p className="text-xs text-slate-550 font-semibold">{log.details}</p>
              <span className="text-[9px] font-mono text-slate-400">Terminal Address: {log.ip_address}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
