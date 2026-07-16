import React from "react";
import { CheckSquare, RefreshCw, Check, Loader2 } from "lucide-react";
import { MeetingDetail, ActionItem } from "../types/meeting";
import { InsightSkeleton } from "./InsightSkeleton";

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
  const status = (detail.action_items_status || detail.ai_status || "").toUpperCase();
  const isLoading = !detail.action_items && !["COMPLETED", "SUCCESS", "FAILED", "ERROR", "SKIPPED"].includes(status);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4">
        <InsightSkeleton title="Action Items" hint="Searching the transcript for commitments and owners." accentClassName="bg-amber-200" />
        <div className="flex items-center gap-2 text-[11px] text-slate-400 font-medium">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Action items are being extracted independently.
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {detail.action_items ? detail.action_items.map((item: ActionItem, idx: number) => {
        const actionId = item.id || `action-${idx}`;
        const isSyncing = jiraSyncing[actionId];
        const syncStatus = jiraStatus[actionId];

        return (
          <div key={idx} className="p-4 rounded-2xl bg-white border border-slate-200 flex justify-between items-start shadow-sm gap-4">
            <div className="flex flex-col gap-1 flex-1">
              <span className="text-xs font-bold text-[#102C23] font-outfit flex items-center gap-1.5">
                <CheckSquare className="w-4 h-4 text-[#113229]" aria-hidden="true" /> {item.action_text}
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
              aria-label={syncStatus ? `Synced ${item.action_text} to Jira with key ${syncStatus}` : `Sync action item: ${item.action_text} to Jira`}
              className={`px-3 py-1.5 rounded-xl border text-[10px] font-bold flex items-center gap-1.5 transition-all shadow-sm ${
                syncStatus
                  ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                  : "bg-white border-slate-200 text-slate-500 hover:border-[#113229] hover:text-[#113229]"
              }`}
            >
              {isSyncing ? (
                <>
                  <RefreshCw className="w-3 h-3 animate-spin text-[#113229]" aria-hidden="true" /> Syncing...
                </>
              ) : syncStatus ? (
                <>
                  <Check className="w-3 h-3 text-emerald-600" aria-hidden="true" /> Synced ({syncStatus})
                </>
              ) : (
                <>
                  <RefreshCw className="w-3 h-3" aria-hidden="true" /> Sync to Jira
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
