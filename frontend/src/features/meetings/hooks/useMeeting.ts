import { useState, useEffect, useRef, useCallback } from "react";
import { useModalStore } from "@/store/useModalStore";
import { meetingService } from "../services/meeting.service";
import { MeetingDetail } from "../types/meeting";

const isInsightStillRunning = (detail: MeetingDetail | null) => {
  if (!detail) return false;
  const statusFields = [
    detail.status,
    detail.speaker_status,
    detail.ai_status,
    detail.embedding_status,
    detail.kg_status,
    detail.transcript_status,
    detail.executive_summary_status,
    detail.action_items_status,
    detail.decisions_status,
    detail.risks_status,
    detail.technical_status,
    detail.key_themes_status,
  ].filter(Boolean);

  return statusFields.some((status) => {
    const norm = String(status).toUpperCase();
    return !["COMPLETED", "SUCCESS", "FAILED", "ERROR", "SKIPPED", "CANCELLED"].includes(norm);
  });
};

export function useMeeting(meetingId: string) {
  const { showModal } = useModalStore();
  const [meetingDetail, setMeetingDetail] = useState<MeetingDetail | null>(null);
  const [activeTab, setActiveTab] = useState<"summary" | "timeline" | "actions" | "decisions" | "risks" | "technical" | "participants" | "decisions_risks">("summary");
  
  // Jira sync simulation state
  const [jiraSyncing, setJiraSyncing] = useState<Record<string, boolean>>({});
  const [jiraStatus, setJiraStatus] = useState<Record<string, string>>({});

  // Ingestion and media state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [runningAiAnalysis, setRunningAiAnalysis] = useState(false);
  const [sendingEmail] = useState(false);

  // Audio playing state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [activeDuration, setActiveDuration] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const fetchMeetingDetail = useCallback(async () => {
    try {
      const data = await meetingService.getMeetingDetail(meetingId);
      setMeetingDetail(data);
    } catch (e) {
      console.error(e);
    }
  }, [meetingId]);

  const fetchMeetingDetailSilent = useCallback(async () => {
    try {
      const data = await meetingService.getMeetingDetailSilent(meetingId);
      setMeetingDetail(data);
    } catch {
      console.warn("Silent fetch failed");
    }
  }, [meetingId]);

  useEffect(() => {
    if (meetingId) {
      fetchMeetingDetail();
    }
  }, [meetingId, fetchMeetingDetail]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab");
      if (tab && ["summary", "timeline", "actions", "decisions", "risks", "technical", "participants", "decisions_risks"].includes(tab)) {
        setActiveTab(tab as "summary" | "timeline" | "actions" | "decisions" | "risks" | "technical" | "participants" | "decisions_risks");
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && meetingDetail) {
      const params = new URLSearchParams(window.location.search);
      if (params.get("print") === "true") {
        setTimeout(() => {
          window.print();
        }, 1200);
      }
    }
  }, [meetingDetail]);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | undefined = undefined;
    if (isInsightStillRunning(meetingDetail) || (meetingDetail?.recording_url && !meetingDetail?.transcripts?.length)) {
      intervalId = setInterval(() => {
        fetchMeetingDetailSilent();
      }, 3000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [meetingDetail, fetchMeetingDetailSilent]);

  const handleMediaUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;
    setUploadingFile(true);
    try {
      const data = await meetingService.uploadMedia(meetingId, selectedFile);
      setMeetingDetail(data);
      setSelectedFile(null);
    } catch (e) {
      console.error("Upload error", e);
      showModal({
        title: "Upload Failed",
        message: "Error uploading file.",
        type: "error"
      });
    } finally {
      setUploadingFile(false);
    }
  };

  const handleTranscribe = async () => {
    setTranscribing(true);
    try {
      const data = await meetingService.triggerTranscription(meetingId);
      setMeetingDetail(data);
    } catch (e) {
      console.error("Transcription trigger error", e);
      showModal({
        title: "Transcription Failed",
        message: "Error triggering transcription.",
        type: "error"
      });
    } finally {
      setTranscribing(false);
    }
  };

  const handleJiraSync = (actionId: string) => {
    setJiraSyncing(prev => ({ ...prev, [actionId]: true }));
    setTimeout(() => {
      setJiraSyncing(prev => ({ ...prev, [actionId]: false }));
      const key = `MM-${Math.floor(Math.random() * 800) + 100}`;
      setJiraStatus(prev => ({ ...prev, [actionId]: key }));
    }, 1200);
  };

  const handleRunAiAnalysis = async () => {
    setRunningAiAnalysis(true);
    try {
      await meetingService.triggerAiAnalysis(meetingId);
      // Start polling by briefly flipping status so polling effect re-runs
      setMeetingDetail(prev => prev ? { ...prev, ai_status: "RUNNING" } : prev);
      await fetchMeetingDetailSilent();
    } catch (e) {
      console.error("AI analysis trigger error", e);
      showModal({
        title: "Analysis Failed",
        message: "Error triggering AI analysis. Please try again.",
        type: "error"
      });
    } finally {
      setRunningAiAnalysis(false);
    }
  };

  const [isSendMomModalOpen, setIsSendMomModalOpen] = useState(false);

  const handleSendMomEmail = () => {
    setIsSendMomModalOpen(true);
  };

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(e => console.warn("Audio playback failed", e));
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    const audio = audioRef.current;
    if (!audio) return;
    setCurrentTime(audio.currentTime);
  };

  const handleLoadedMetadata = () => {
    const audio = audioRef.current;
    if (!audio) return;
    setActiveDuration(audio.duration);
  };

  const handleScrub = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || activeDuration === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const newTime = (clickX / width) * activeDuration;
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  return {
    meetingDetail,
    activeTab,
    setActiveTab,
    selectedFile,
    setSelectedFile,
    uploadingFile,
    transcribing,
    runningAiAnalysis,
    sendingEmail,
    isPlaying,
    currentTime,
    activeDuration,
    audioRef,
    jiraSyncing,
    jiraStatus,
    isSendMomModalOpen,
    setIsSendMomModalOpen,
    setMeetingDetail,
    fetchMeetingDetail,
    handleMediaUpload,
    handleTranscribe,
    handleRunAiAnalysis,
    handleSendMomEmail,
    handleJiraSync,
    togglePlay,
    handleTimeUpdate,
    handleLoadedMetadata,
    handleScrub
  };
}
