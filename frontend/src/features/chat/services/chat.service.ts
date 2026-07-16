import { getApiUrl } from "@/app/config";
import { ChatSession, ChatSessionDetail } from "../types/chat";
import { API_ENDPOINTS } from "@/app/api.endpoints";

export const chatService = {
  async getSessions(meetingId: string | null): Promise<ChatSession[]> {
    const url = meetingId 
      ? getApiUrl(API_ENDPOINTS.CHAT.HISTORY(meetingId))
      : getApiUrl(API_ENDPOINTS.CHAT.GLOBAL_HISTORY);
    const res = await fetch(url, {
      credentials: "include"
    });
    if (!res.ok) throw new Error("Failed to fetch chat sessions");
    return res.json();
  },

  async getSessionDetails(sessionId: string): Promise<ChatSessionDetail> {
    const res = await fetch(getApiUrl(API_ENDPOINTS.CHAT.DETAIL(sessionId)), {
      credentials: "include"
    });
    if (!res.ok) throw new Error("Failed to fetch chat session details");
    return res.json();
  },

  async createSession(meetingId: string | null, title: string = "New Chat"): Promise<ChatSession> {
    const url = meetingId
      ? getApiUrl(API_ENDPOINTS.CHAT.NEW(meetingId))
      : getApiUrl(API_ENDPOINTS.CHAT.GLOBAL_NEW);
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
      credentials: "include"
    });
    if (!res.ok) throw new Error("Failed to create new chat session");
    return res.json();
  },

  async clearSessionMessages(sessionId: string): Promise<boolean> {
    const res = await fetch(getApiUrl(API_ENDPOINTS.CHAT.MESSAGES(sessionId)), {
      method: "DELETE",
      credentials: "include"
    });
    return res.ok;
  },

  async updateArchiveStatus(sessionId: string, isArchived: boolean): Promise<ChatSession> {
    const res = await fetch(getApiUrl(API_ENDPOINTS.CHAT.ARCHIVE(sessionId)), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_archived: isArchived }),
      credentials: "include"
    });
    if (!res.ok) throw new Error("Failed to update archive status");
    return res.json();
  },

  async updateTitle(sessionId: string, title: string): Promise<ChatSession> {
    const res = await fetch(getApiUrl(API_ENDPOINTS.CHAT.TITLE(sessionId)), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
      credentials: "include"
    });
    if (!res.ok) throw new Error("Failed to rename title");
    return res.json();
  },

  getSendMessageUrl(sessionId: string): string {
    return getApiUrl(API_ENDPOINTS.CHAT.MESSAGE(sessionId));
  }
};
