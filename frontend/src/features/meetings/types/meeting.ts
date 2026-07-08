export interface Speaker {
  id: string;
  speaker_number: number;
  speaker_tag: string;
  display_name: string;
  is_confirmed: boolean;
  confidence: number | null;
  contribution_percentage?: number | null;
  has_conflict?: boolean;
  conflict_details?: string | null;
}

export interface TranscriptSegment {
  id: string;
  speaker_id?: string | null;
  speaker_tag: string;
  start_time: number;
  end_time: number;
  start_ms: number;
  end_ms: number;
  text: string;
}

export interface MeetingDetail {
  id: string;
  title: string;
  meeting_date: string;
  duration_seconds: number | null;
  platform: string | null;
  status: "Pending" | "Processing" | "Completed" | "Failed";
  recording_url: string | null;
  original_filename: string | null;
  file_size: number | null;
  content_type: string | null;
  executive_summary: string | null;
  key_themes: string[] | null;
  main_takeaways: string[] | null;
  important_quotes: any[] | null;
  language: string | null;
  transcripts: TranscriptSegment[] | null;
  agenda_items: any[] | null;
  action_items: any[] | null;
  decisions: any[] | null;
  risks: any[] | null;
  technical_context: any | null;
  speakers: Speaker[] | null;
  speaker_status?: string | null;
  ai_status?: string | null;
  embedding_status?: string | null;
  kg_status?: string | null;
}
