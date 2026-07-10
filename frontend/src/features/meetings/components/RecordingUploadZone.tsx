import React from "react";
import { FileAudio, Loader2 } from "lucide-react";

interface RecordingUploadZoneProps {
  selectedFile: File | null;
  uploadingFile: boolean;
  onFileSelect: (file: File | null) => void;
  onUpload: (e: React.FormEvent) => void;
}

export const RecordingUploadZone: React.FC<RecordingUploadZoneProps> = ({
  selectedFile,
  uploadingFile,
  onFileSelect,
  onUpload
}) => {
  return (
    <div className="p-8 rounded-2xl bg-white border border-slate-200 flex flex-col items-center justify-center text-center shadow-sm">
      <div className="p-4 rounded-full bg-teal-50 text-[#113229] mb-4">
        <FileAudio className="w-8 h-8" />
      </div>
      <h3 className="font-bold text-sm text-[#102C23] font-outfit mb-1">No meeting audio</h3>
      <p className="text-xs text-slate-500 font-medium max-w-[240px] mb-4">
        Upload your audio or video recording to transcribe, extract action items, and build your meeting knowledge graph.
      </p>
      
      <form onSubmit={onUpload} className="flex flex-col items-center gap-3">
        <label className="px-4 py-2 rounded-xl bg-white border border-slate-200 hover:border-[#113229] text-xs font-bold text-slate-500 hover:text-[#102C23] transition-all cursor-pointer shadow-sm">
          <span>{selectedFile ? selectedFile.name : "Select Audio / Video"}</span>
          <input
            type="file"
            accept="audio/*,video/*"
            onChange={(e) => onFileSelect(e.target.files ? e.target.files[0] : null)}
            className="hidden"
            disabled={uploadingFile}
          />
        </label>
        {selectedFile && (
          <button
            type="submit"
            disabled={uploadingFile}
            className="px-4 py-2 rounded-xl bg-[#113229] hover:bg-[#0D241E] text-white text-xs font-bold transition-all shadow-md shadow-[#113229]/10 flex items-center gap-2"
          >
            {uploadingFile ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading...
              </>
            ) : (
              "Upload and Transcribe"
            )}
          </button>
        )}
      </form>
    </div>
  );
};
