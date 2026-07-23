import React from "react";
import { Edit2, Shield, User, Mic } from "lucide-react";
import { Speaker } from "../types/meeting";

interface SpeakerCardProps {
  speaker: Speaker;
  contributions: number;
  speakingSeconds: number;
  percentage: number;
  onRenameClick: () => void;
}

export const SpeakerCard: React.FC<SpeakerCardProps> = ({
  speaker,
  contributions,
  speakingSeconds,
  percentage,
  onRenameClick
}) => {
  const formatTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = Math.floor(totalSecs % 60);
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  };

  const confidencePercentage = speaker.confidence 
    ? Math.round(speaker.confidence * 100) 
    : null;

  return (
    <div className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
      {/* Decorative gradient background glow on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-teal-50/0 to-teal-50/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

      <div className="relative flex flex-col gap-4">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-teal-50 text-[#113229] shadow-sm">
              <User className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-[#102C23] font-outfit leading-tight">
                {speaker.display_name}
              </span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-outfit mt-0.5">
                {speaker.speaker_tag}
              </span>
            </div>
          </div>

          {/* Action: Rename */}
          <button
            onClick={onRenameClick}
            className="p-2 rounded-xl text-slate-400 hover:text-[#113229] hover:bg-teal-50 transition-all border border-transparent hover:border-teal-100"
            title="Rename Speaker"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Status & Confidence Badge */}
        <div className="flex flex-wrap gap-2">
          {speaker.is_confirmed ? (
            <span className="text-[10px] font-bold text-[#15803d] bg-green-50 border border-green-100 px-2.5 py-1 rounded-full flex items-center gap-1">
              <Shield className="w-3 h-3 fill-[#15803d]/10" /> Confirmed
            </span>
          ) : (
            <span className="text-[10px] font-bold text-slate-500 bg-[#F9F8F6] border border-slate-200/60 px-2.5 py-1 rounded-full flex items-center gap-1">
              Unconfirmed
            </span>
          )}

          {confidencePercentage !== null && (
            <span className="text-[10px] font-bold text-[#113229] bg-teal-50 border border-teal-100 px-2.5 py-1 rounded-full flex items-center gap-1">
              <Mic className="w-3 h-3" /> {confidencePercentage}% voice match
            </span>
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-slate-100" />

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-outfit">
              Speaking Time
            </span>
            <span className="text-xs font-bold text-[#102C23] font-outfit">
              {formatTime(speakingSeconds)}
            </span>
          </div>

          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-outfit">
              Contributions
            </span>
            <span className="text-xs font-bold text-[#102C23] font-outfit">
              {contributions}
            </span>
          </div>

          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-outfit">
              Share
            </span>
            <span className="text-xs font-bold text-[#113229] font-outfit bg-teal-50/70 py-0.5 px-1 rounded-lg">
              {percentage}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
