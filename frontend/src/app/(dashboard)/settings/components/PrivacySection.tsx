"use client";

import React from "react";

interface PrivacyInfo {
  data_retention_days: number;
  ai_training_opt_out: boolean;
}

interface PrivacySectionProps {
  privacy: PrivacyInfo;
  setPrivacy: React.Dispatch<React.SetStateAction<PrivacyInfo>>;
  handleClearHistory: (category: string) => Promise<void>;
  markDirty: () => void;
}

export default function PrivacySection({
  privacy,
  setPrivacy,
  handleClearHistory,
  markDirty
}: PrivacySectionProps) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-bold text-[#102C23]">Privacy & Data Opt-out Settings</h2>
        <p className="text-xs text-slate-550 font-semibold">Retain granular control over organizational intelligence parameters.</p>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase">Data Retention (Days)</label>
            <input
              type="number"
              value={privacy.data_retention_days}
              onChange={(e) => { setPrivacy({ ...privacy, data_retention_days: parseInt(e.target.value) }); markDirty(); }}
              className="w-full px-4 py-2.5 border border-[#DEDDDA]/60 rounded-xl focus:ring-2 focus:ring-[#113229]/10 focus:border-[#113229] text-sm bg-white"
            />
          </div>

          <div className="flex items-center justify-between p-4 border border-[#DEDDDA]/60 rounded-2xl hover:bg-[#F9F8F6] cursor-pointer">
            <div>
              <span className="text-xs font-bold text-[#102C23] block">Opt out of AI model training</span>
              <span className="text-[10px] text-slate-450 font-semibold leading-relaxed">Prevent engines from parsing transcripts to refine proprietary models.</span>
            </div>
            <input
              type="checkbox"
              checked={privacy.ai_training_opt_out}
              onChange={(e) => { setPrivacy({ ...privacy, ai_training_opt_out: e.target.checked }); markDirty(); }}
              className="w-4.5 h-4.5 text-[#113229] border-[#DEDDDA]/60 rounded focus:ring-[#113229] cursor-pointer"
            />
          </div>
        </div>

        <div className="border-t border-[#DEDDDA]/40 pt-6 space-y-4">
          <h3 className="text-sm font-bold text-red-750">Danger Zone</h3>
          <div className="border border-red-200/50 rounded-2xl p-4 bg-red-50/20 space-y-4 text-xs font-medium">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <span className="font-bold text-slate-800 block">Delete Meeting & Transcription History</span>
                <span className="text-[10px] text-slate-500 font-semibold">Permanently purge all audio recordings and textual summaries.</span>
              </div>
              <button 
                onClick={() => handleClearHistory("meetings")}
                className="px-3 py-1.5 bg-red-650 hover:bg-red-705 text-white font-bold rounded-xl transition-colors"
              >
                Delete History
              </button>
            </div>
            <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-red-200/20">
              <div>
                <span className="font-bold text-slate-800 block">Permanently Close Account</span>
                <span className="text-[10px] text-slate-500 font-semibold">Deletes user login credentials, profile, keys and workspace mappings.</span>
              </div>
              <button className="px-3 py-1.5 bg-red-700 hover:bg-red-800 text-white font-bold rounded-xl transition-colors">
                Delete Account
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
