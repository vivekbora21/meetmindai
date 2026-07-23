import React from "react";
import { Play, Pause } from "lucide-react";

interface MeetingPlayerProps {
  audioRef: React.RefObject<HTMLAudioElement | null>;
  audioSrc: string;
  isPlaying: boolean;
  currentTime: number;
  activeDuration: number;
  onPlayPause: () => void;
  onTimeUpdate: () => void;
  onLoadedMetadata: () => void;
  onScrub: (e: React.MouseEvent<HTMLDivElement>) => void;
}

export const MeetingPlayer: React.FC<MeetingPlayerProps> = ({
  audioRef,
  audioSrc,
  isPlaying,
  currentTime,
  activeDuration,
  onPlayPause,
  onTimeUpdate,
  onLoadedMetadata,
  onScrub
}) => {
  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const progressPercent = activeDuration > 0 ? (currentTime / activeDuration) * 100 : 0;

  return (
    <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col gap-3">
      <audio
        ref={audioRef}
        src={audioSrc}
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={onLoadedMetadata}
        onEnded={onPlayPause}
      />
      <div className="flex items-center gap-4">
        <button
          onClick={onPlayPause}
          className="w-10 h-10 rounded-xl bg-[#113229] hover:bg-[#0D241E] text-white flex items-center justify-center transition-colors shadow-md shadow-[#113229]/10"
        >
          {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
        </button>
        <div className="flex-1 flex flex-col gap-1">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Audio playback</span>
          <div
            onClick={onScrub}
            className="h-2 w-full bg-slate-100 rounded-full cursor-pointer overflow-hidden relative"
          >
            <div
              className="h-full bg-[#113229] rounded-full transition-all duration-75"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(activeDuration)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
