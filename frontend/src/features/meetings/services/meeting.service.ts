import { getApiUrl } from "@/app/config";

export const meetingService = {
  async getMeetingDetail(id: string): Promise<any> {
    const res = await fetch(getApiUrl(`/api/v1/meetings/${id}`), {
      credentials: "include"
    });
    if (!res.ok) throw new Error("Failed to fetch meeting details");
    return res.json();
  },

  async getMeetingDetailSilent(id: string): Promise<any> {
    const res = await fetch(getApiUrl(`/api/v1/meetings/${id}`), {
      credentials: "include"
    });
    if (!res.ok) throw new Error("Failed to fetch meeting details silently");
    return res.json();
  },

  async uploadMedia(id: string, file: File): Promise<any> {
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

  async triggerTranscription(id: string): Promise<any> {
    const res = await fetch(getApiUrl(`/api/v1/meetings/${id}/transcribe`), {
      method: "POST",
      credentials: "include"
    });
    if (!res.ok) throw new Error("Failed to trigger transcription");
    return res.json();
  }
};
