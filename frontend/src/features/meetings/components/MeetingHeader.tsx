import React from "react";
import { Calendar, Clock } from "lucide-react";
import { MeetingDetail } from "../types/meeting";

interface MeetingHeaderProps {
  detail: MeetingDetail;
}

export const MeetingHeader: React.FC<MeetingHeaderProps> = ({ detail }) => {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-3xl font-bold font-outfit text-[#102C23] tracking-tight">{detail.title}</h1>
      <div className="flex items-center gap-4 text-xs text-slate-500 font-medium">
        <span className="flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5" />
          {new Date(detail.meeting_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          {Math.floor((detail.duration_seconds || 0) / 60)} Mins {Math.floor((detail.duration_seconds || 0) % 60)} Secs
        </span>
        <span className="px-2.5 py-0.5 rounded-full bg-[#e6f4f1] border border-teal-150 text-[#113229] font-semibold text-[10px] shadow-sm">
          {detail.platform || "Upload"}
        </span>
      </div>
    </div>
  );
};
