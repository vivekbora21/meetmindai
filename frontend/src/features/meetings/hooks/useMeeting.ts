import { useState, useEffect, useRef } from "react";
import { meetingService } from "../services/meeting.service";
import { MeetingDetail } from "../types/meeting";

export function useMeeting(meetingId: string) {
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

  // Audio playing state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [activeDuration, setActiveDuration] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const fetchMeetingDetail = async () => {
    try {
      const data = await meetingService.getMeetingDetail(meetingId);
      setMeetingDetail(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchMeetingDetailSilent = async () => {
    try {
      const data = await meetingService.getMeetingDetailSilent(meetingId);
      setMeetingDetail(data);
    } catch (e) {
      console.warn("Silent fetch failed");
    }
  };

  useEffect(() => {
    if (meetingId) {
      fetchMeetingDetail();
    }
  }, [meetingId]);

  // Polling for processing status
  // Terminal statuses where polling should stop
  const TERMINAL_STATUSES = ["Completed", "COMPLETED", "Failed", "FAILED", "Error", "ERROR"];

  useEffect(() => {
    let intervalId: any;
    if (meetingDetail && !TERMINAL_STATUSES.includes(meetingDetail.status)) {
      intervalId = setInterval(() => {
        fetchMeetingDetailSilent();
      }, 3000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [meetingDetail?.status]);

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
      alert("Error uploading file.");
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
      alert("Error triggering transcription.");
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
      alert("Error triggering AI analysis. Please try again.");
    } finally {
      setRunningAiAnalysis(false);
    }
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
    isPlaying,
    currentTime,
    activeDuration,
    audioRef,
    jiraSyncing,
    jiraStatus,
    setMeetingDetail,
    fetchMeetingDetail,
    handleMediaUpload,
    handleTranscribe,
    handleRunAiAnalysis,
    handleJiraSync,
    togglePlay,
    handleTimeUpdate,
    handleLoadedMetadata,
    handleScrub
  };
}
