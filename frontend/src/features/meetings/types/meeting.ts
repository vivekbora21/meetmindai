export interface Speaker {
  speaker_tag: string;
  display_name: string;
}

export interface TranscriptSegment {
  speaker_tag: string;
  start_time: number;
  end_time: number;
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
  transcripts: TranscriptSegment[] | null;
  agenda_items: any[] | null;
  action_items: any[] | null;
  decisions: any[] | null;
  risks: any[] | null;
  technical_context: any | null;
  speakers: Speaker[] | null;
}
