"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Brain, Loader2 } from "lucide-react";
import { getApiUrl } from "../../../config";

// Feature custom hooks
import { useMeeting } from "@/features/meetings/hooks/useMeeting";

// Feature components
import { MeetingHeader } from "@/features/meetings/components/MeetingHeader";
import { MeetingPlayer } from "@/features/meetings/components/MeetingPlayer";
import { MeetingTabs } from "@/features/meetings/components/MeetingTabs";
import { MeetingSummary } from "@/features/meetings/components/MeetingSummary";
import { MeetingTimeline } from "@/features/meetings/components/MeetingTimeline";
import { MeetingActionItems } from "@/features/meetings/components/MeetingActionItems";
import { MeetingDecisions } from "@/features/meetings/components/MeetingDecisions";
import { MeetingRisks } from "@/features/meetings/components/MeetingRisks";
import { MeetingTechnical } from "@/features/meetings/components/MeetingTechnical";
import { FullTranscript } from "@/features/meetings/components/FullTranscript";
import { RecordingUploadZone } from "@/features/meetings/components/RecordingUploadZone";
import { IngestionPipelineTracker } from "@/features/meetings/components/IngestionPipelineTracker";
import { ChatWindow } from "@/features/chat/components/ChatWindow";

export default function MeetingDetail({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);

  const {
    meetingDetail,
    activeTab,
    setActiveTab,
    selectedFile,
    setSelectedFile,
    uploadingFile,
    transcribing,
    isPlaying,
    currentTime,
    activeDuration,
    audioRef,
    jiraSyncing,
    jiraStatus,
    handleMediaUpload,
    handleTranscribe,
    handleJiraSync,
    togglePlay,
    handleTimeUpdate,
    handleLoadedMetadata,
    handleScrub
  } = useMeeting(id);

  if (!meetingDetail) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
        <div className="p-3 bg-[#0f766e] rounded-2xl shadow-lg shadow-[#0f766e]/15 animate-bounce">
          <Brain className="w-8 h-8 text-white" />
        </div>
        <div className="flex items-center gap-2">
          <Loader2 className="w-5 h-5 text-[#0f766e] animate-spin" />
          <span className="font-outfit text-sm font-medium text-slate-500">Loading meeting insights...</span>
        </div>
      </div>
    );
  }

  const audioSrc = meetingDetail.recording_url
    ? (meetingDetail.recording_url.startsWith("http") ? meetingDetail.recording_url : getApiUrl(meetingDetail.recording_url))
    : "";

  // Normalize status to handle both "Completed" and "COMPLETED" from backend
  const statusNorm = (meetingDetail.status || "").toUpperCase();
  const isCompleted = statusNorm === "COMPLETED";

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 flex flex-col gap-6 selection:bg-[#0f766e] selection:text-white text-[#0f172a]">
      {/* Header Bar */}
      <header className="flex items-center justify-between pb-4 border-b border-slate-200">
        <button
          onClick={() => router.push("/dashboard")}
          className="flex items-center gap-2 text-slate-500 hover:text-[#0f172a] text-sm font-semibold transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
      </header>

      {/* Main Grid Workspace */}
      <main className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: Meeting Intelligence & Tabs */}
        <section className="lg:col-span-7 flex flex-col gap-6">
          <MeetingHeader detail={meetingDetail} />

          {/* No recording yet — show upload zone */}
          {!meetingDetail.recording_url && (
            <RecordingUploadZone
              selectedFile={selectedFile}
              uploadingFile={uploadingFile}
              onFileSelect={setSelectedFile}
              onUpload={handleMediaUpload}
            />
          )}

          {/* Recording present but pipeline not complete — show tracker */}
          {meetingDetail.recording_url && !isCompleted && (
            <IngestionPipelineTracker
              detail={meetingDetail}
              transcribing={transcribing}
              onTranscribe={handleTranscribe}
            />
          )}

          {/* Pipeline complete — show player and content tabs */}
          {meetingDetail.recording_url && isCompleted && (
            <>
              <MeetingPlayer
                audioRef={audioRef}
                audioSrc={audioSrc}
                isPlaying={isPlaying}
                currentTime={currentTime}
                activeDuration={activeDuration}
                onPlayPause={togglePlay}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onScrub={handleScrub}
              />

              <div className="flex flex-col gap-4 mt-2">
                <MeetingTabs activeTab={activeTab} setActiveTab={setActiveTab} />
                {activeTab === "summary" && (
                  <>
                    <MeetingSummary detail={meetingDetail} />
                    <FullTranscript detail={meetingDetail} />
                  </>
                )}
                {activeTab === "timeline" && <MeetingTimeline detail={meetingDetail} />}
                {activeTab === "actions" && (
                  <MeetingActionItems
                    detail={meetingDetail}
                    jiraSyncing={jiraSyncing}
                    jiraStatus={jiraStatus}
                    onJiraSync={handleJiraSync}
                  />
                )}
                {activeTab === "decisions" && <MeetingDecisions detail={meetingDetail} />}
                {activeTab === "risks" && <MeetingRisks detail={meetingDetail} />}
                {activeTab === "technical" && <MeetingTechnical detail={meetingDetail} audioSrc={audioSrc} />}
              </div>
            </>
          )}
        </section>

        {/* Right Side: RAG Chat Panel */}
        <ChatWindow meetingId={id} status={meetingDetail.status} />
      </main>
    </div>
  );
}
