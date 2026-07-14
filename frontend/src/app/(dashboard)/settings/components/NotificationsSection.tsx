"use client";

import React from "react";

interface NotificationChannel {
  email: boolean;
  browser: boolean;
  push: boolean;
  slack: boolean;
  teams: boolean;
}

interface NotificationSettings {
  meeting_started: NotificationChannel;
  transcript_ready: NotificationChannel;
  summary_generated: NotificationChannel;
  action_items_assigned: NotificationChannel;
  risk_detected: NotificationChannel;
  calendar_sync: NotificationChannel;
  oauth_expired: NotificationChannel;
  weekly_reports: NotificationChannel;
}

interface NotificationsSectionProps {
  notifications: NotificationSettings;
  setNotifications: React.Dispatch<React.SetStateAction<NotificationSettings>>;
  markDirty: () => void;
}

export default function NotificationsSection({
  notifications,
  setNotifications,
  markDirty
}: NotificationsSectionProps) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-bold text-[#102C23]">Notification Channels & Rules</h2>
        <p className="text-xs text-slate-550 font-semibold">Decide which system updates and AI analysis digests trigger alerts across your channels.</p>
      </div>

      <div className="border border-[#DEDDDA]/60 rounded-2xl overflow-hidden text-xs">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-[#DEDDDA]/60 font-bold text-slate-500">
              <th className="py-3 px-4">Notification Trigger</th>
              <th className="py-3 px-2 text-center">Email</th>
              <th className="py-3 px-2 text-center">Browser</th>
              <th className="py-3 px-2 text-center">Mobile Push</th>
              <th className="py-3 px-2 text-center">Slack</th>
              <th className="py-3 px-2 text-center">MS Teams</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#DEDDDA]/40 font-medium">
            {[
              { key: "meeting_started", label: "Meeting starts / joins" },
              { key: "transcript_ready", label: "Whisper transcript compilation" },
              { key: "summary_generated", label: "AI summary ready" },
              { key: "action_items_assigned", label: "Action items assignments" },
              { key: "risk_detected", label: "Urgent risks identified" },
              { key: "calendar_sync", label: "Calendar sync events" },
              { key: "oauth_expired", label: "OAuth token expirations" },
              { key: "weekly_reports", label: "Weekly activity synthesis reports" }
            ].map(row => (
              <tr key={row.key} className="hover:bg-slate-55/30 transition-colors">
                <td className="py-3 px-4 font-semibold text-slate-800">{row.label}</td>
                {["email", "browser", "push", "slack", "teams"].map(channel => (
                  <td key={channel} className="py-3 px-2 text-center">
                    <input
                      type="checkbox"
                      checked={notifications[row.key as keyof NotificationSettings]?.[channel as keyof NotificationChannel] || false}
                      onChange={(e) => {
                        markDirty();
                        const key = row.key as keyof NotificationSettings;
                        const channelKey = channel as keyof NotificationChannel;
                        setNotifications({
                          ...notifications,
                          [key]: {
                            ...notifications[key],
                            [channelKey]: e.target.checked,
                          },
                        });
                      }}
                      className="w-4 h-4 text-[#113229] border-[#DEDDDA]/60 rounded focus:ring-[#113229] cursor-pointer"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
