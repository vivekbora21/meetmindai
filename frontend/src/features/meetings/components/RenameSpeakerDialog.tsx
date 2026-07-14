import React, { useState, useEffect } from "react";
import { X, Check, Loader2 } from "lucide-react";
import { Speaker, MeetingDetail } from "../types/meeting";
import { meetingService } from "../services/meeting.service";

interface RenameSpeakerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  speaker: Speaker | null;
  meetingId: string;
  onSaved: (updatedMeeting: MeetingDetail) => void;
}

export const RenameSpeakerDialog: React.FC<RenameSpeakerDialogProps> = ({
  isOpen,
  onClose,
  speaker,
  meetingId,
  onSaved
}) => {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (speaker) {
      setName(speaker.display_name);
      setError(null);
    }
  }, [speaker, isOpen]);

  if (!isOpen || !speaker) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Speaker name cannot be empty");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const updatedMeeting = await meetingService.renameSpeaker(meetingId, speaker.id, name.trim());
      onSaved(updatedMeeting);
      onClose();
    } catch (e) {
      console.error(e);
      setError("Failed to rename speaker. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose} 
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/20 bg-white/80 p-6 shadow-2xl backdrop-blur-xl transition-all animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200/55 mb-4">
          <h3 className="text-base font-bold font-outfit text-[#102C23]">
            Rename Speaker
          </h3>
          <button 
            onClick={onClose} 
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider font-outfit">
              Current Label: <span className="text-[#113229]">{speaker.speaker_tag}</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:border-[#113229] focus:ring focus:ring-[#113229]/10 outline-none text-sm font-medium transition-all bg-white"
              placeholder="e.g. Vivek George"
              disabled={saving}
              autoFocus
            />
            {error && (
              <span className="text-xs text-rose-500 font-semibold mt-1">
                {error}
              </span>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end gap-3 mt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2.5 rounded-2xl border border-slate-200 text-slate-500 hover:bg-[#F9F8F6] text-xs font-bold font-outfit transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-2xl bg-[#113229] text-white hover:bg-[#0d625b] text-xs font-bold font-outfit shadow-lg shadow-[#113229]/15 flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" /> Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
