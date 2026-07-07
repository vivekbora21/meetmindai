import { getApiUrl } from "@/app/config";

export const chatService = {
  async getSessions(meetingId: string): Promise<any[]> {
    const res = await fetch(getApiUrl(`/api/v1/search/meetings/${meetingId}/chat-history`), {
      credentials: "include"
    });
    if (!res.ok) throw new Error("Failed to fetch chat sessions");
    return res.json();
  },

  async getSessionDetails(sessionId: string): Promise<any> {
    const res = await fetch(getApiUrl(`/api/v1/search/chat/${sessionId}`), {
      credentials: "include"
    });
    if (!res.ok) throw new Error("Failed to fetch chat session details");
    return res.json();
  },

  async createSession(meetingId: string, title: string = "New Chat"): Promise<any> {
    const res = await fetch(getApiUrl(`/api/v1/search/meetings/${meetingId}/chat/new`), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
      credentials: "include"
    });
    if (!res.ok) throw new Error("Failed to create new chat session");
    return res.json();
  },

  async clearSessionMessages(sessionId: string): Promise<boolean> {
    const res = await fetch(getApiUrl(`/api/v1/search/chat/${sessionId}/messages`), {
      method: "DELETE",
      credentials: "include"
    });
    return res.ok;
  },

  async updateArchiveStatus(sessionId: string, isArchived: boolean): Promise<any> {
    const res = await fetch(getApiUrl(`/api/v1/search/chat/${sessionId}/archive`), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_archived: isArchived }),
      credentials: "include"
    });
    if (!res.ok) throw new Error("Failed to update archive status");
    return res.json();
  },

  async updateTitle(sessionId: string, title: string): Promise<any> {
    const res = await fetch(getApiUrl(`/api/v1/search/chat/${sessionId}/title`), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
      credentials: "include"
    });
    if (!res.ok) throw new Error("Failed to rename title");
    return res.json();
  },

  getSendMessageUrl(sessionId: string): string {
    return getApiUrl(`/api/v1/search/chat/${sessionId}/message`);
  }
};
