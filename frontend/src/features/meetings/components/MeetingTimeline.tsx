import React from "react";
import { Clock } from "lucide-react";
import { MeetingDetail, AgendaItem } from "../types/meeting";

interface MeetingTimelineProps {
  detail: MeetingDetail;
}

export const MeetingTimeline: React.FC<MeetingTimelineProps> = ({ detail }) => {
  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = Math.floor(sec % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="flex flex-col gap-4">
      {detail.agenda_items ? detail.agenda_items.map((item: AgendaItem, idx: number) => (
        <div key={idx} className="p-4 rounded-2xl bg-white border border-slate-200 flex flex-col gap-2 shadow-sm">
          <div className="flex justify-between items-center">
            <span className="text-sm font-bold text-[#102C23] font-outfit">{item.topic}</span>
            <span className="text-[10px] text-[#113229] font-bold bg-teal-50 border border-teal-100 px-2 py-1 rounded-lg flex items-center gap-1 shadow-sm">
              <Clock className="w-3 h-3" /> {formatSeconds(item.start_time)} - {formatSeconds(item.end_time)}
            </span>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed font-medium">{item.summary}</p>
        </div>
      )) : (
        <div className="text-xs text-slate-400">No timeline detected</div>
      )}
    </div>
  );
};
