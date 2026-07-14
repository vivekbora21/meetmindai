"use client";

import React from "react";

interface PersonalizationInfo {
  theme: string;
  accent_color: string;
  date_format: string;
  time_format: string;
  compact_mode: boolean;
}

interface PersonalizationSectionProps {
  personalization: PersonalizationInfo;
  setPersonalization: React.Dispatch<React.SetStateAction<PersonalizationInfo>>;
  markDirty: () => void;
}

export default function PersonalizationSection({
  personalization,
  setPersonalization,
  markDirty
}: PersonalizationSectionProps) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-bold text-[#102C23]">Personalization & Theme Settings</h2>
        <p className="text-xs text-slate-550 font-semibold">Adjust the visual aesthetics of the dashboard application.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-500 uppercase">Aesthetic Theme</label>
          <select
            value={personalization.theme}
            onChange={(e) => { setPersonalization({ ...personalization, theme: e.target.value }); markDirty(); }}
            className="w-full px-4 py-2.5 border border-[#DEDDDA]/60 rounded-xl focus:ring-2 focus:ring-[#113229]/10 focus:border-[#113229] text-sm bg-white cursor-pointer"
          >
            <option value="System Theme">System Theme (Auto)</option>
            <option value="Dark Mode">Slate Teal (Dark Mode)</option>
            <option value="Light Mode">Pure White (Light Mode)</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-500 uppercase">Accent branding color</label>
          <select
            value={personalization.accent_color}
            onChange={(e) => { setPersonalization({ ...personalization, accent_color: e.target.value }); markDirty(); }}
            className="w-full px-4 py-2.5 border border-[#DEDDDA]/60 rounded-xl focus:ring-2 focus:ring-[#113229]/10 focus:border-[#113229] text-sm bg-white cursor-pointer"
          >
            <option value="Teal">Teal (Recommended)</option>
            <option value="Indigo">Indigo</option>
            <option value="Purple">Purple</option>
            <option value="Blue">Blue</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-500 uppercase">Date formatting</label>
          <select
            value={personalization.date_format}
            onChange={(e) => { setPersonalization({ ...personalization, date_format: e.target.value }); markDirty(); }}
            className="w-full px-4 py-2.5 border border-[#DEDDDA]/60 rounded-xl focus:ring-2 focus:ring-[#113229]/10 focus:border-[#113229] text-sm bg-white cursor-pointer"
          >
            <option value="YYYY-MM-DD">YYYY-MM-DD (2026-07-07)</option>
            <option value="DD/MM/YYYY">DD/MM/YYYY (07/07/2026)</option>
            <option value="MM/DD/YYYY">MM/DD/YYYY (07/07/2026)</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-500 uppercase">Time formatting</label>
          <select
            value={personalization.time_format}
            onChange={(e) => { setPersonalization({ ...personalization, time_format: e.target.value }); markDirty(); }}
            className="w-full px-4 py-2.5 border border-[#DEDDDA]/60 rounded-xl focus:ring-2 focus:ring-[#113229]/10 focus:border-[#113229] text-sm bg-white cursor-pointer"
          >
            <option value="12h">12 Hour (6:25 PM)</option>
            <option value="24h">24 Hour (18:25)</option>
          </select>
        </div>

        <div className="space-y-1.5 flex items-center justify-between p-3 border border-[#DEDDDA]/60 rounded-xl hover:bg-[#F9F8F6] cursor-pointer">
          <div>
            <span className="text-xs font-semibold text-slate-800 block">Compact UI layout mode</span>
            <span className="text-[10px] text-slate-400 font-medium font-semibold">Reduces padding to increase information density.</span>
          </div>
          <input
            type="checkbox"
            checked={personalization.compact_mode}
            onChange={(e) => { setPersonalization({ ...personalization, compact_mode: e.target.checked }); markDirty(); }}
            className="w-4.5 h-4.5 text-[#113229] border-[#DEDDDA]/60 rounded focus:ring-[#113229] cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
}
