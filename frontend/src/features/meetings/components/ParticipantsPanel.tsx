import React, { useState, useMemo } from "react";
import { Users, Info, BarChart2 } from "lucide-react";
import { MeetingDetail, Speaker } from "../types/meeting";
import { SpeakerCard } from "./SpeakerCard";
import { RenameSpeakerDialog } from "./RenameSpeakerDialog";

interface ParticipantsPanelProps {
  detail: MeetingDetail;
  onRefresh: (updatedMeeting?: MeetingDetail) => void;
}

export const ParticipantsPanel: React.FC<ParticipantsPanelProps> = ({ detail, onRefresh }) => {
  const [editingSpeaker, setEditingSpeaker] = useState<Speaker | null>(null);

  // 1. Calculate stats for each speaker from the transcripts
  const speakerStats = useMemo(() => {
    const stats: Record<string, { contributions: number; speakingSeconds: number }> = {};
    let totalSecs = 0;

    // Initialize stats for each speaker in the detail
    detail.speakers?.forEach((s) => {
      stats[s.id] = { contributions: 0, speakingSeconds: 0 };
    });

    // Populate stats from transcripts
    detail.transcripts?.forEach((t) => {
      // Find the speaker by tag or id
      const speaker = detail.speakers?.find(
        (s) => s.id === t.speaker_id || s.speaker_tag === t.speaker_tag
      );
      if (speaker) {
        const duration = Math.max(0, t.end_time - t.start_time);
        stats[speaker.id].contributions += 1;
        stats[speaker.id].speakingSeconds += duration;
        totalSecs += duration;
      }
    });

    return { stats, totalSecs };
  }, [detail.speakers, detail.transcripts]);

  // 2. Map and sort speakers
  const processedSpeakers = useMemo(() => {
    if (!detail.speakers) return [];
    
    const mapped = detail.speakers.map((s) => {
      const sStat = speakerStats.stats[s.id] || { contributions: 0, speakingSeconds: 0 };
      const percentage = speakerStats.totalSecs > 0
        ? Math.round((sStat.speakingSeconds / speakerStats.totalSecs) * 100)
        : 0;

      return {
        speaker: s,
        contributions: sStat.contributions,
        speakingSeconds: sStat.speakingSeconds,
        percentage
      };
    });

    // Sort by speaking seconds descending
    return mapped.sort((a, b) => b.speakingSeconds - a.speakingSeconds);
  }, [detail.speakers, speakerStats]);

  if (!detail.speakers || detail.speakers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-white border border-slate-200 rounded-3xl gap-3 text-center">
        <Users className="w-8 h-8 text-slate-300" />
        <span className="text-sm font-semibold text-slate-400 font-outfit">
          No participants detected in this meeting.
        </span>
      </div>
    );
  }

  // Curated premium HSL colors for the distribution chart
  const speakerColors = [
    "bg-teal-600",
    "bg-indigo-500",
    "bg-sky-400",
    "bg-emerald-500",
    "bg-violet-500",
    "bg-amber-400",
    "bg-rose-500"
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Conversation Distribution Visualization */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col gap-4">
        <div className="flex items-center gap-2 text-sm font-bold text-[#102C23] font-outfit">
          <BarChart2 className="w-4 h-4 text-[#113229]" />
          Conversation Distribution
        </div>

        {/* Multi-segmented Progress Bar */}
        <div className="h-3 w-full rounded-full bg-slate-100 flex overflow-hidden">
          {processedSpeakers.map((item, idx) => {
            if (item.percentage === 0) return null;
            const colorClass = speakerColors[idx % speakerColors.length];
            return (
              <div
                key={item.speaker.id}
                style={{ width: `${item.percentage}%` }}
                className={`${colorClass} transition-all h-full`}
                title={`${item.speaker.display_name}: ${item.percentage}%`}
              />
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-x-5 gap-y-2 mt-1">
          {processedSpeakers.map((item, idx) => {
            if (item.percentage === 0) return null;
            const colorClass = speakerColors[idx % speakerColors.length];
            return (
              <div key={item.speaker.id} className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${colorClass}`} />
                <span className="text-xs font-semibold text-slate-600">
                  {item.speaker.display_name} ({item.percentage}%)
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Grid of Speaker Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {processedSpeakers.map((item) => (
          <SpeakerCard
            key={item.speaker.id}
            speaker={item.speaker}
            contributions={item.contributions}
            speakingSeconds={item.speakingSeconds}
            percentage={item.percentage}
            onRenameClick={() => setEditingSpeaker(item.speaker)}
          />
        ))}
      </div>

      {/* Inline info card about automatic voice profiles */}
      <div className="flex items-start gap-3 rounded-2xl bg-teal-50/50 border border-teal-100 p-4">
        <Info className="w-4 h-4 text-[#113229] shrink-0 mt-0.5" />
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-bold text-[#113229] font-outfit">
            Automatic Voice Recognition
          </span>
          <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
            Renaming and confirming a speaker trains the voice profile analyzer. Returning speakers in future meetings will be recognized and labeled automatically.
          </p>
        </div>
      </div>

      {/* Dialog for renaming speaker */}
      <RenameSpeakerDialog
        isOpen={editingSpeaker !== null}
        onClose={() => setEditingSpeaker(null)}
        speaker={editingSpeaker}
        meetingId={detail.id}
        onSaved={onRefresh}
      />
    </div>
  );
};
