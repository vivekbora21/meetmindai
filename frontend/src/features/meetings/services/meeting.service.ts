import { getApiUrl } from "@/app/config";
import { MeetingDetail } from "../types/meeting";
import { API_ENDPOINTS } from "@/app/api.endpoints";

export const meetingService = {
  async getMeetings(): Promise<MeetingDetail[]> {
    const res = await fetch(getApiUrl(API_ENDPOINTS.MEETINGS.BASE), {
      credentials: "include"
    });
    if (!res.ok) {
      if (res.status === 401) {
        throw new Error("Unauthorized");
      }
      throw new Error("Failed to fetch meetings");
    }
    return res.json();
  },

  async joinMeetingByLink(title: string, platform: string, meetingUrl: string, scheduledStart?: string): Promise<MeetingDetail> {
    const res = await fetch(getApiUrl(API_ENDPOINTS.MEETINGS.JOIN_LINK), {
      method: "POST",
      headers: { 
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        title,
        platform,
        meeting_url: meetingUrl,
        scheduled_start: scheduledStart
      }),
      credentials: "include"
    });
    if (!res.ok) throw new Error("Failed to join meeting by link");
    return res.json();
  },

  async uploadMeeting(title: string, platform: string, file: File | Blob): Promise<MeetingDetail> {
    const formData = new FormData();
    formData.append("title", title);
    formData.append("platform", platform);
    formData.append("file", file);
    
    const res = await fetch(getApiUrl(API_ENDPOINTS.MEETINGS.UPLOAD), {
      method: "POST",
      body: formData,
      credentials: "include"
    });
    if (!res.ok) throw new Error("Failed to upload meeting file");
    return res.json();
  },

  async getMeetingDetail(id: string): Promise<MeetingDetail> {
    const res = await fetch(getApiUrl(API_ENDPOINTS.MEETINGS.DETAIL(id)), {
      credentials: "include"
    });
    if (!res.ok) throw new Error("Failed to fetch meeting details");
    return res.json();
  },

  async getMeetingDetailSilent(id: string): Promise<MeetingDetail> {
    const res = await fetch(getApiUrl(API_ENDPOINTS.MEETINGS.DETAIL(id)), {
      credentials: "include"
    });
    if (!res.ok) throw new Error("Failed to fetch meeting details silently");
    return res.json();
  },

  async uploadMedia(id: string, file: File): Promise<MeetingDetail> {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(getApiUrl(API_ENDPOINTS.MEETINGS.UPLOAD_MEDIA(id)), {
      method: "POST",
      body: formData,
      credentials: "include"
    });
    if (!res.ok) throw new Error("Failed to upload recording");
    return res.json();
  },

  async triggerTranscription(id: string): Promise<MeetingDetail> {
    const res = await fetch(getApiUrl(API_ENDPOINTS.MEETINGS.TRANSCRIBE(id)), {
      method: "POST",
      credentials: "include"
    });
    if (!res.ok) throw new Error("Failed to trigger transcription");
    return res.json();
  },

  async renameSpeaker(meetingId: string, speakerId: string, displayName: string): Promise<MeetingDetail> {
    const res = await fetch(getApiUrl(API_ENDPOINTS.MEETINGS.SPEAKER(meetingId, speakerId)), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ display_name: displayName }),
      credentials: "include"
    });
    if (!res.ok) throw new Error("Failed to rename speaker");
    return res.json();
  },

  async retryStage(meetingId: string, stage: string): Promise<MeetingDetail> {
    const res = await fetch(getApiUrl(API_ENDPOINTS.MEETINGS.RETRY(meetingId, stage)), {
      method: "POST",
      credentials: "include"
    });
    if (!res.ok) throw new Error(`Failed to retry stage ${stage}`);
    return res.json();
  },

  async triggerAiAnalysis(meetingId: string): Promise<MeetingDetail> {
    const res = await fetch(getApiUrl(API_ENDPOINTS.MEETINGS.RETRY(meetingId, "ai_analysis")), {
      method: "POST",
      credentials: "include"
    });
    if (!res.ok) throw new Error("Failed to trigger AI analysis");
    return res.json();
  },

  async sendMomEmail(meetingId: string): Promise<{ status: string; message: string }> {
    const res = await fetch(getApiUrl(API_ENDPOINTS.MEETINGS.SEND_MOM(meetingId)), {
      method: "POST",
      credentials: "include"
    });
    if (!res.ok) throw new Error("Failed to send MOM email");
    return res.json();
  }
};
