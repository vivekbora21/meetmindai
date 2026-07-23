export interface ChatSession {
  id: string;
  meeting_id: string;
  title: string;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

export interface ChatSessionDetail extends ChatSession {
  messages: ChatMessage[];
}
