import React from "react";
import { CheckSquare, RefreshCw, Check } from "lucide-react";
import { MeetingDetail } from "../types/meeting";

interface MeetingActionItemsProps {
  detail: MeetingDetail;
  jiraSyncing: Record<string, boolean>;
  jiraStatus: Record<string, string>;
  onJiraSync: (id: string) => void;
}

export const MeetingActionItems: React.FC<MeetingActionItemsProps> = ({
  detail,
  jiraSyncing,
  jiraStatus,
  onJiraSync
}) => {
  return (
    <div className="flex flex-col gap-4">
      {detail.action_items ? detail.action_items.map((item: any, idx: number) => {
        const actionId = item.id || `action-${idx}`;
        const isSyncing = jiraSyncing[actionId];
        const syncStatus = jiraStatus[actionId];

        return (
          <div key={idx} className="p-4 rounded-2xl bg-white border border-slate-200 flex justify-between items-start shadow-sm gap-4">
            <div className="flex flex-col gap-1 flex-1">
              <span className="text-xs font-bold text-[#0f172a] font-outfit flex items-center gap-1.5">
                <CheckSquare className="w-4 h-4 text-[#0f766e]" /> {item.action_text}
              </span>
              <div className="flex items-center gap-4 text-[10px] text-slate-500 font-semibold mt-1">
                <span>
                  <span className="text-slate-400">Owner:</span> {item.owner || "Unassigned"}
                </span>
                <span>
                  <span className="text-slate-400">Deadline:</span> {item.deadline || "TBD"}
                </span>
              </div>
            </div>
            
            <button
              onClick={() => onJiraSync(actionId)}
              disabled={isSyncing || !!syncStatus}
              className={`px-3 py-1.5 rounded-xl border text-[10px] font-bold flex items-center gap-1.5 transition-all shadow-sm ${
                syncStatus
                  ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                  : "bg-white border-slate-200 text-slate-500 hover:border-[#0f766e] hover:text-[#0f766e]"
              }`}
            >
              {isSyncing ? (
                <>
                  <RefreshCw className="w-3 h-3 animate-spin text-[#0f766e]" /> Syncing...
                </>
              ) : syncStatus ? (
                <>
                  <Check className="w-3 h-3 text-emerald-600" /> Synced ({syncStatus})
                </>
              ) : (
                <>
                  <RefreshCw className="w-3 h-3" /> Sync to Jira
                </>
              )}
            </button>
          </div>
        );
      }) : (
        <div className="text-xs text-slate-400">No action items detected</div>
      )}
    </div>
  );
};
