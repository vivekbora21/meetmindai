export const API_ENDPOINTS = {
  MEETINGS: {
    BASE: "/api/v1/meetings/",
    UPLOAD: "/api/v1/meetings/upload",
    JOIN_LINK: "/api/v1/meetings/join-link",
    DETAIL: (id: string) => `/api/v1/meetings/${id}`,
    UPLOAD_MEDIA: (id: string) => `/api/v1/meetings/${id}/upload-media`,
    TRANSCRIBE: (id: string) => `/api/v1/meetings/${id}/transcribe`,
    SPEAKER: (meetingId: string, speakerId: string) => `/api/v1/meetings/${meetingId}/speakers/${speakerId}`,
    RETRY: (meetingId: string, stage: string) => `/api/v1/meetings/${meetingId}/retry?stage=${stage}`,
    SEND_MOM: (id: string) => `/api/v1/meetings/${id}/send-mom`,
  },
  CHAT: {
    HISTORY: (meetingId: string) => `/api/v1/search/meetings/${meetingId}/chat-history`,
    GLOBAL_HISTORY: "/api/v1/search/chats/global",
    DETAIL: (sessionId: string) => `/api/v1/search/chat/${sessionId}`,
    NEW: (meetingId: string) => `/api/v1/search/meetings/${meetingId}/chat/new`,
    GLOBAL_NEW: "/api/v1/search/chats/global/new",
    MESSAGES: (sessionId: string) => `/api/v1/search/chat/${sessionId}/messages`,
    ARCHIVE: (sessionId: string) => `/api/v1/search/chat/${sessionId}/archive`,
    TITLE: (sessionId: string) => `/api/v1/search/chat/${sessionId}/title`,
    MESSAGE: (sessionId: string) => `/api/v1/search/chat/${sessionId}/message`,
  },
  AUTH: {
    ME: "/api/v1/auth/me",
    LOGOUT: "/api/v1/auth/logout",
    TOKEN: "/api/v1/auth/token",
    REGISTER: "/api/v1/auth/register",
    SOCIAL_LOGIN: (provider: string) => `/api/v1/auth/social/${provider}/login`,
  },
  ANALYTICS: {
    OVERVIEW: "/api/v1/analytics/overview",
    SPEAKERS: "/api/v1/analytics/speakers",
    TOPICS: "/api/v1/analytics/topics",
  },
  AGENT: {
    LIVE_WS: (id: string) => `/api/v1/agent/live/${id}`,
    SIMULATE: "/api/v1/agent/simulate",
  }
};
