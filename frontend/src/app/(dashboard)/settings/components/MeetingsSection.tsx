"use client";

import React from "react";

interface MeetingPreferences {
  default_language: string;
  enable_speaker_id: boolean;
  enable_translation: boolean;
  enable_subtitles: boolean;
  transcript_format: string;
  default_category: string;
  recording_retention_days: number;
  auto_delete_recordings: boolean;
  meeting_privacy: string;
  auto_import_meetings: boolean;
  auto_import_recordings: boolean;
  auto_generate_transcript: boolean;
  auto_generate_summary: boolean;
  auto_create_action_items: boolean;
  auto_create_risks: boolean;
  auto_create_kg: boolean;
  auto_create_tech_analysis: boolean;
  auto_create_decisions: boolean;
  calendar_sync_frequency: string;
  recording_preference: string;
}

interface MeetingsSectionProps {
  meetingPreferences: MeetingPreferences;
  setMeetingPreferences: React.Dispatch<React.SetStateAction<MeetingPreferences>>;
  markDirty: () => void;
}

export default function MeetingsSection({
  meetingPreferences,
  setMeetingPreferences,
  markDirty
}: MeetingsSectionProps) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-bold text-[#102C23]">Calendar & Meeting Sync Preferences</h2>
        <p className="text-xs text-slate-550 font-semibold">Configure how platform meetings and local files are analyzed by AI engines.</p>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase">Calendar Sync Frequency</label>
            <select
              value={meetingPreferences.calendar_sync_frequency}
              onChange={(e) => { setMeetingPreferences({ ...meetingPreferences, calendar_sync_frequency: e.target.value }); markDirty(); }}
              className="w-full px-4 py-2 border border-[#DEDDDA]/60 rounded-xl focus:ring-2 focus:ring-[#113229]/10 focus:border-[#113229] text-sm bg-white cursor-pointer"
            >
              <option value="Real Time">Real Time</option>
              <option value="Every 5 Minutes">Every 5 Minutes</option>
              <option value="Every 15 Minutes">Every 15 Minutes</option>
              <option value="Every Hour">Every Hour</option>
              <option value="Daily">Daily</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase">Meeting Recording Preferences</label>
            <select
              value={meetingPreferences.recording_preference}
              onChange={(e) => { setMeetingPreferences({ ...meetingPreferences, recording_preference: e.target.value }); markDirty(); }}
              className="w-full px-4 py-2 border border-[#DEDDDA]/60 rounded-xl focus:ring-2 focus:ring-[#113229]/10 focus:border-[#113229] text-sm bg-white cursor-pointer"
            >
              <option value="Always Import">Always Import</option>
              <option value="Ask Before Import">Ask Before Import</option>
              <option value="Never Import">Never Import</option>
            </select>
          </div>
        </div>

        <div className="border-t border-[#DEDDDA]/40 pt-6 space-y-4">
          <h3 className="text-sm font-semibold text-slate-800">Auto Ingestion Pipelines</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { key: "auto_import_meetings", label: "Auto-import meetings from connected calendars" },
              { key: "auto_import_recordings", label: "Auto-import cloud recording files" },
              { key: "auto_generate_transcript", label: "Auto-generate transcripts using Whisper AI" },
              { key: "auto_generate_summary", label: "Auto-generate executive AI summaries" },
              { key: "auto_create_action_items", label: "Auto-extract action items" },
              { key: "auto_create_risks", label: "Auto-extract meeting risks" },
              { key: "auto_create_kg", label: "Auto-generate knowledge graph entities" },
              { key: "auto_create_tech_analysis", label: "Auto-generate technical analysis" },
              { key: "auto_create_decisions", label: "Auto-extract key decisions" }
            ].map(item => (
              <label key={item.key} className="flex items-center gap-3 p-3 border border-[#DEDDDA]/40 rounded-xl hover:bg-[#F9F8F6] cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={meetingPreferences[item.key as keyof MeetingPreferences] as boolean}
                  onChange={(e) => { 
                    setMeetingPreferences({ ...meetingPreferences, [item.key]: e.target.checked }); 
                    markDirty(); 
                  }}
                  className="w-4.5 h-4.5 text-[#113229] border-[#DEDDDA]/60 rounded focus:ring-[#113229] cursor-pointer"
                />
                <span className="text-xs text-slate-700 font-semibold">{item.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
