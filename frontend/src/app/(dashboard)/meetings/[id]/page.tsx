"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Brain, Loader2, MessageSquare, MessageSquareOff } from "lucide-react";
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
import { ParticipantsPanel } from "@/features/meetings/components/ParticipantsPanel";
import { RecordingUploadZone } from "@/features/meetings/components/RecordingUploadZone";
import { IngestionPipelineTracker } from "@/features/meetings/components/IngestionPipelineTracker";
import { AiAnalysisBanner } from "@/features/meetings/components/AiAnalysisBanner";
import { ChatWindow } from "@/features/chat/components/ChatWindow";

export default function MeetingDetail({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const [showChat, setShowChat] = useState(true);

  const {
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
  } = useMeeting(id);

  if (!meetingDetail) {
    return (
      <div className="min-h-screen bg-[#F9F8F6] flex flex-col items-center justify-center gap-4">
        <div className="p-3 bg-[#113229] rounded-2xl shadow-lg shadow-[#113229]/15 animate-bounce">
          <Brain className="w-8 h-8 text-white" />
        </div>
        <div className="flex items-center gap-2">
          <Loader2 className="w-5 h-5 text-[#113229] animate-spin" />
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
    <div className="min-h-screen bg-[#F9F8F6] p-4 md:p-8 flex flex-col gap-6 selection:bg-[#113229] selection:text-white text-[#102C23]">
      {/* Header Bar */}
      <header className="flex items-center justify-between pb-4 border-b border-slate-200">
        <button
          onClick={() => router.push("/dashboard")}
          className="flex items-center gap-2 text-slate-500 hover:text-[#102C23] text-sm font-semibold transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        {meetingDetail.recording_url && isCompleted && (
          <button
            onClick={() => setShowChat(!showChat)}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold font-outfit border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors text-slate-700 bg-white shadow-sm"
          >
            {showChat ? (
              <>
                <MessageSquareOff className="w-4 h-4 text-slate-500" />
                <span>Full Screen (Hide Chat)</span>
              </>
            ) : (
              <>
                <MessageSquare className="w-4 h-4 text-[#113229]" />
                <span>Split Screen (Show Chat)</span>
              </>
            )}
          </button>
        )}
      </header>

      {/* Main Grid Workspace */}
      <main className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: Meeting Intelligence & Tabs */}
        <section className={`${showChat ? "lg:col-span-7" : "lg:col-span-12"} flex flex-col gap-6 transition-all duration-300`}>
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
                    {/* Show banner if AI analysis is missing, skipped or failed */}
                    {(!meetingDetail.executive_summary ||
                      meetingDetail.ai_status === "FAILED" ||
                      meetingDetail.ai_status === "SKIPPED" ||
                      (!meetingDetail.ai_status && !meetingDetail.executive_summary)) && (
                      <AiAnalysisBanner
                        aiStatus={meetingDetail.ai_status}
                        onRun={handleRunAiAnalysis}
                        isRunning={runningAiAnalysis}
                      />
                    )}
                    <MeetingSummary detail={meetingDetail} />
                    <FullTranscript detail={meetingDetail} />
                  </>
                )}
                {activeTab === "timeline" && <MeetingTimeline detail={meetingDetail} />}
                {activeTab === "participants" && (
                  <ParticipantsPanel
                    detail={meetingDetail}
                    onRefresh={(updatedMeeting) => {
                      if (updatedMeeting) {
                        setMeetingDetail(updatedMeeting);
                      } else {
                        fetchMeetingDetail();
                      }
                    }}
                  />
                )}
                {activeTab === "actions" && (
                  <MeetingActionItems
                    detail={meetingDetail}
                    jiraSyncing={jiraSyncing}
                    jiraStatus={jiraStatus}
                    onJiraSync={handleJiraSync}
                  />
                )}
                {activeTab === "decisions_risks" && (
                  <div className="flex flex-col gap-6">
                    <MeetingDecisions detail={meetingDetail} />
                    <MeetingRisks detail={meetingDetail} />
                  </div>
                )}
                {activeTab === "technical" && <MeetingTechnical detail={meetingDetail} audioSrc={audioSrc} />}
              </div>
            </>
          )}
        </section>

        {/* Right Side: RAG Chat Panel */}
        {showChat && (
          <ChatWindow meetingId={id} status={meetingDetail.status} />
        )}
      </main>
    </div>
  );
}
