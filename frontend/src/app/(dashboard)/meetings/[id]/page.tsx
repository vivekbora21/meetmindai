"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Brain, Loader2, Mail, AlertCircle } from "lucide-react";
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
    runningAiAnalysis,
    sendingEmail,
    handleSendMomEmail,
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
  const isFailed = statusNorm === "FAILED" || statusNorm === "ERROR";
  const showNote = !isCompleted && !isFailed && !meetingDetail.executive_summary;
  const transcriptReady = Boolean(meetingDetail.transcripts?.length);
  const canShowWorkspace = Boolean(meetingDetail.recording_url) && (transcriptReady || isCompleted);

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
        {canShowWorkspace && (
          <button
            onClick={handleSendMomEmail}
            disabled={sendingEmail}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#113229] hover:bg-[#102C23] text-white text-xs font-bold transition-all shadow-sm hover:shadow disabled:opacity-50"
          >
            {sendingEmail ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Sending Email...
              </>
            ) : (
              <>
                <Mail className="w-4 h-4" />
                Send MOM Email
              </>
            )}
          </button>
        )}
      </header>

      {/* Main Workspace */}
      <main className="w-full flex flex-col gap-8 items-start">
        {/* Meeting Intelligence & Tabs */}
        <section className="w-full flex flex-col gap-6">
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

          {/* Recording present but transcript not ready yet — show tracker */}
          {meetingDetail.recording_url && !canShowWorkspace && (
            <IngestionPipelineTracker
              detail={meetingDetail}
              transcribing={transcribing}
              onTranscribe={handleTranscribe}
            />
          )}

          {/* Transcript ready or pipeline complete — show the workspace progressively */}
          {canShowWorkspace && (
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

              {isFailed && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100/60 flex items-center gap-3.5 shadow-sm mt-2">
                  <div className="p-2 bg-rose-100 rounded-xl text-rose-700 flex-shrink-0 animate-pulse">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-bold text-rose-950 font-outfit uppercase tracking-wider">
                      Processing Issues Encountered
                    </span>
                    <span className="text-[11px] text-rose-800/80 font-semibold leading-relaxed">
                      Some stages of the AI ingestion pipeline failed. Insights may be incomplete. You can trigger a retry below or restart the full pipeline in the dashboard.
                    </span>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-4 mt-2">
                <MeetingTabs activeTab={activeTab} setActiveTab={setActiveTab} />
                {activeTab === "summary" && (
                  <>
                    {showNote ? (
                      <div className="flex flex-col gap-4">
                        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow transition-all duration-300">
                          <div className="p-3 bg-[#113229]/5 rounded-xl flex items-center justify-center flex-shrink-0">
                            <Loader2 className="w-5 h-5 text-[#113229] animate-spin" />
                          </div>
                          <div className="flex flex-col gap-0.5">
                            <h4 className="text-xs font-bold text-[#102C23] font-outfit uppercase tracking-wider">
                              Transcription in Progress
                            </h4>
                            <p className="text-xs text-slate-500 leading-relaxed font-semibold font-outfit">
                              Transcription is taking place. AI summary will be shown after completion.
                            </p>
                          </div>
                        </div>
                        <FullTranscript detail={meetingDetail} />
                      </div>
                    ) : (
                      <>
                        {/* Show banner if AI analysis is still running or not started */}
                        {!meetingDetail.executive_summary && (
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
                  </>
                )}
                {activeTab === "timeline" && (
                  showNote ? (
                    <div className="flex flex-col gap-4">
                      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow transition-all duration-300">
                        <div className="p-3 bg-[#113229]/5 rounded-xl flex items-center justify-center flex-shrink-0">
                          <Loader2 className="w-5 h-5 text-[#113229] animate-spin" />
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <h4 className="text-xs font-bold text-[#102C23] font-outfit uppercase tracking-wider">
                            Transcription in Progress
                          </h4>
                          <p className="text-xs text-slate-500 leading-relaxed font-semibold font-outfit">
                            Transcription is taking place. AI summary will be shown after completion.
                          </p>
                        </div>
                      </div>
                      <FullTranscript detail={meetingDetail} />
                    </div>
                  ) : (
                    <MeetingTimeline detail={meetingDetail} />
                  )
                )}
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
                  showNote ? (
                    <div className="flex flex-col gap-4">
                      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow transition-all duration-300">
                        <div className="p-3 bg-[#113229]/5 rounded-xl flex items-center justify-center flex-shrink-0">
                          <Loader2 className="w-5 h-5 text-[#113229] animate-spin" />
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <h4 className="text-xs font-bold text-[#102C23] font-outfit uppercase tracking-wider">
                            Transcription in Progress
                          </h4>
                          <p className="text-xs text-slate-500 leading-relaxed font-semibold font-outfit">
                            Transcription is taking place. AI summary will be shown after completion.
                          </p>
                        </div>
                      </div>
                      <FullTranscript detail={meetingDetail} />
                    </div>
                  ) : (
                    <MeetingActionItems
                      detail={meetingDetail}
                      jiraSyncing={jiraSyncing}
                      jiraStatus={jiraStatus}
                      onJiraSync={handleJiraSync}
                    />
                  )
                )}
                {activeTab === "decisions_risks" && (
                  showNote ? (
                    <div className="flex flex-col gap-4">
                      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow transition-all duration-300">
                        <div className="p-3 bg-[#113229]/5 rounded-xl flex items-center justify-center flex-shrink-0">
                          <Loader2 className="w-5 h-5 text-[#113229] animate-spin" />
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <h4 className="text-xs font-bold text-[#102C23] font-outfit uppercase tracking-wider">
                            Transcription in Progress
                          </h4>
                          <p className="text-xs text-slate-500 leading-relaxed font-semibold font-outfit">
                            Transcription is taking place. AI summary will be shown after completion.
                          </p>
                        </div>
                      </div>
                      <FullTranscript detail={meetingDetail} />
                    </div>
                  ) : (
                    <div className="flex flex-col gap-6">
                      <MeetingDecisions detail={meetingDetail} />
                      <MeetingRisks detail={meetingDetail} />
                    </div>
                  )
                )}
                {activeTab === "technical" && (
                  showNote ? (
                    <div className="flex flex-col gap-4">
                      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow transition-all duration-300">
                        <div className="p-3 bg-[#113229]/5 rounded-xl flex items-center justify-center flex-shrink-0">
                          <Loader2 className="w-5 h-5 text-[#113229] animate-spin" />
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <h4 className="text-xs font-bold text-[#102C23] font-outfit uppercase tracking-wider">
                            Transcription in Progress
                          </h4>
                          <p className="text-xs text-slate-500 leading-relaxed font-semibold font-outfit">
                            Transcription is taking place. AI summary will be shown after completion.
                          </p>
                        </div>
                      </div>
                      <FullTranscript detail={meetingDetail} />
                    </div>
                  ) : (
                    <MeetingTechnical detail={meetingDetail} audioSrc={audioSrc} />
                  )
                )}
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
