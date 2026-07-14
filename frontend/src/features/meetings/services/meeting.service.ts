import { getApiUrl } from "@/app/config";
import { MeetingDetail } from "../types/meeting";

export const meetingService = {
  async getMeetingDetail(id: string): Promise<MeetingDetail> {
    const res = await fetch(getApiUrl(`/api/v1/meetings/${id}`), {
      credentials: "include"
    });
    if (!res.ok) throw new Error("Failed to fetch meeting details");
    return res.json();
  },

  async getMeetingDetailSilent(id: string): Promise<MeetingDetail> {
    const res = await fetch(getApiUrl(`/api/v1/meetings/${id}`), {
      credentials: "include"
    });
    if (!res.ok) throw new Error("Failed to fetch meeting details silently");
    return res.json();
  },

  async uploadMedia(id: string, file: File): Promise<MeetingDetail> {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(getApiUrl(`/api/v1/meetings/${id}/upload-media`), {
      method: "POST",
      body: formData,
      credentials: "include"
    });
    if (!res.ok) throw new Error("Failed to upload recording");
    return res.json();
  },

  async triggerTranscription(id: string): Promise<MeetingDetail> {
    const res = await fetch(getApiUrl(`/api/v1/meetings/${id}/transcribe`), {
      method: "POST",
      credentials: "include"
    });
    if (!res.ok) throw new Error("Failed to trigger transcription");
    return res.json();
  },

  async renameSpeaker(meetingId: string, speakerId: string, displayName: string): Promise<MeetingDetail> {
    const res = await fetch(getApiUrl(`/api/v1/meetings/${meetingId}/speakers/${speakerId}`), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ display_name: displayName }),
      credentials: "include"
    });
    if (!res.ok) throw new Error("Failed to rename speaker");
    return res.json();
  },

  async retryStage(meetingId: string, stage: string): Promise<MeetingDetail> {
    const res = await fetch(getApiUrl(`/api/v1/meetings/${meetingId}/retry?stage=${stage}`), {
      method: "POST",
      credentials: "include"
    });
    if (!res.ok) throw new Error(`Failed to retry stage ${stage}`);
    return res.json();
  },

  async triggerAiAnalysis(meetingId: string): Promise<MeetingDetail> {
    const res = await fetch(getApiUrl(`/api/v1/meetings/${meetingId}/retry?stage=ai_analysis`), {
      method: "POST",
      credentials: "include"
    });
    if (!res.ok) throw new Error("Failed to trigger AI analysis");
    return res.json();
  }
};
