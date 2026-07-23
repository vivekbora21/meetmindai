import React from "react";

interface MeetingTabsProps {
  activeTab: string;
  setActiveTab: (tab: "summary" | "timeline" | "actions" | "decisions" | "risks" | "technical" | "participants" | "decisions_risks") => void;
}

export const MeetingTabs: React.FC<MeetingTabsProps> = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: "summary", label: "Summary" },
    { id: "timeline", label: "Timeline" },
    { id: "participants", label: "Participants" },
    { id: "actions", label: "Action Items" },
    { id: "decisions_risks", label: "Decisions & Risks" },
    { id: "technical", label: "Technical Analysis" }
  ] as const;

  return (
    <div className="flex border-b border-slate-200 gap-1 overflow-x-auto pb-1 scrollbar">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={`px-4 py-2 text-xs font-bold font-outfit rounded-t-xl transition-all whitespace-nowrap ${
            activeTab === tab.id
              ? "bg-white border-t border-x border-slate-200 text-[#113229] -mb-[1px]"
              : "text-slate-500 hover:text-[#102C23] hover:bg-white/40"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};
