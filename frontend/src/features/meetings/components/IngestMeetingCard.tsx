"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Upload, Download, Loader2, Link as LinkIcon } from "lucide-react";
import { MeetingDetail } from "../types/meeting";
import { meetingService } from "../services/meeting.service";

interface IngestMeetingCardProps {
  onMeetingAdded?: (meeting: MeetingDetail) => void;
}

export const IngestMeetingCard: React.FC<IngestMeetingCardProps> = ({ onMeetingAdded }) => {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [meetingTitle, setMeetingTitle] = useState("");
  const [platform, setPlatform] = useState("Upload"); // "Upload", "Google Meet", "Teams"
  const [ingestTab, setIngestTab] = useState<"file" | "link">("file");
  const [scheduledStart, setScheduledStart] = useState("");
  const [meetingUrl, setMeetingUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync platform select value with selected ingest tab
  useEffect(() => {
    if (ingestTab === "file") {
      setPlatform("Upload");
    } else {
      setPlatform("Google Meet");
    }
  }, [ingestTab]);

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetingTitle) return;
    setUploading(true);

    const isLinkJoin = platform === "Teams" || platform === "Google Meet";

    try {
      let responseData: MeetingDetail | null = null;
      if (isLinkJoin) {
        responseData = await meetingService.joinMeetingByLink(
          meetingTitle,
          platform,
          meetingUrl,
          scheduledStart ? new Date(scheduledStart).toISOString() : undefined
        );
      } else {
        const fileToUpload = selectedFile || new Blob([""], { type: "audio/wav" });
        responseData = await meetingService.uploadMeeting(
          meetingTitle,
          platform,
          fileToUpload
        );
      }

      if (responseData) {
        if (onMeetingAdded) {
          onMeetingAdded(responseData);
        }
        if (responseData.id) {
          router.push(`/meetings/${responseData.id}`);
        }
      }
    } catch {
      console.warn("Could not sync upload to backend.");
    } finally {
      setMeetingTitle("");
      setMeetingUrl("");
      setSelectedFile(null);
      setUploading(false);
    }
  };

  return (
    <div className="p-6 rounded-2xl bg-white border border-[#DEDDDA]/60 shadow-sm flex flex-col gap-5 font-outfit">
      <div className="flex flex-col gap-1">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sync Desk</span>
        <h3 className="font-bold text-md text-[#102C23] flex items-center gap-2">
          <Download className="w-4 h-4 text-[#113229] transform rotate-180" /> Ingest Meeting Data
        </h3>
      </div>

      {/* Tab Controllers */}
      <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-200 gap-1">
        <button
          type="button"
          onClick={() => setIngestTab("file")}
          className={`flex-1 text-[11px] font-bold py-2 rounded-lg transition-all ${
            ingestTab === "file"
              ? "bg-[#113229] text-white shadow-sm"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          Upload File
        </button>
        <button
          type="button"
          onClick={() => setIngestTab("link")}
          className={`flex-1 text-[11px] font-bold py-2 rounded-lg transition-all ${
            ingestTab === "link"
              ? "bg-[#113229] text-white shadow-sm"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          Join Live URL
        </button>
      </div>

      <form onSubmit={handleUpload} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Meeting Title</label>
          <input
            type="text"
            placeholder="e.g., API gateway review"
            value={meetingTitle}
            onChange={(e) => setMeetingTitle(e.target.value)}
            className="px-3.5 py-2.5 rounded-xl bg-[#F9F8F6] border border-slate-200 focus:bg-white text-xs focus:outline-none focus:border-[#113229] focus:ring-1 focus:ring-[#113229] text-[#102C23] shadow-inner w-full font-medium"
            required
          />
        </div>

        {ingestTab === "link" ? (
          <>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Sync Platform</label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F9F8F6] border border-slate-200 text-xs focus:outline-none focus:border-[#113229] text-[#102C23] cursor-pointer shadow-sm font-medium"
              >
                <option value="Google Meet">Google Meet Sync</option>
                <option value="Teams">Microsoft Teams Sync</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Meeting Invite URL</label>
              <input
                type="url"
                placeholder={platform === "Teams" ? "https://teams.microsoft.com/l/meetup-join/..." : "https://meet.google.com/abc-defg-hij"}
                value={meetingUrl}
                onChange={(e) => setMeetingUrl(e.target.value)}
                className="px-3.5 py-2.5 rounded-xl bg-[#F9F8F6] border border-slate-200 focus:bg-white text-xs focus:outline-none focus:border-[#113229] focus:ring-1 focus:ring-[#113229] text-[#102C23] shadow-inner font-medium"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Scheduled Start Time</label>
              <input
                type="datetime-local"
                value={scheduledStart}
                onChange={(e) => setScheduledStart(e.target.value)}
                className="px-3.5 py-2.5 rounded-xl bg-[#F9F8F6] border border-slate-200 focus:bg-white text-xs focus:outline-none focus:border-[#113229] text-[#102C23] shadow-inner font-medium"
              />
            </div>
          </>
        ) : (
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Audio / Video File</label>
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all ${
                isDragging
                  ? "border-[#113229] bg-[#113229]/5 ring-4 ring-[#113229]/10"
                  : "border-slate-200 hover:border-[#113229]/50 bg-[#F9F8F6]/50 hover:bg-[#F9F8F6]"
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    setSelectedFile(e.target.files[0]);
                  }
                }}
                accept="audio/*,video/*"
                className="hidden"
              />

              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm text-[#113229]">
                <Upload className={`w-5 h-5 ${isDragging ? "animate-bounce" : ""}`} />
              </div>

              {selectedFile ? (
                <div className="text-center w-full max-w-xs flex flex-col gap-1">
                  <span className="text-[11px] text-[#113229] font-bold truncate max-w-full">
                    {selectedFile.name}
                  </span>
                  <span className="text-[9px] text-slate-400 font-bold">
                    ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
                  </span>
                </div>
              ) : (
                <div className="text-center flex flex-col gap-1">
                  <p className="text-[11px] text-[#102C23] font-bold">Drag & drop your recording here</p>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">or browse local files</p>
                  <span className="text-[9px] text-[#D98A44] font-bold bg-[#D98A44]/10 px-2 py-0.5 rounded-full mt-1.5 self-center">
                    MP3, WAV, MP4, MKV
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={uploading}
          className="w-full py-3 rounded-xl bg-[#113229] hover:bg-[#0D241E] text-white font-extrabold text-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-md hover:shadow-lg mt-2"
        >
          {uploading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Ingesting Audio Stream...
            </>
          ) : (
            <>
              {ingestTab === "link" ? (
                <>
                  <LinkIcon className="w-3.5 h-3.5" /> Sync Remote Meeting Invite
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5" /> Transcribe & Analyze File
                </>
              )}
            </>
          )}
        </button>
      </form>
    </div>
  );
};
