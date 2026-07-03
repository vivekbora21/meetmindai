"use client";

import { useState, useEffect, use, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, Calendar, Clock, User, CheckSquare, 
  AlertTriangle, ShieldAlert, Code2, MessageSquare, 
  Send, Sparkles, Plus, Loader2, Play, Pause, RefreshCw,
  Upload, CheckCircle2, XCircle, FileAudio
} from "lucide-react";
import { getApiUrl } from "../../../config";

export default function MeetingDetail({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);

  const [activeTab, setActiveTab] = useState("summary");
  const [isPlaying, setIsPlaying] = useState(false);
  const [playProgress, setPlayProgress] = useState(12); // Initial timeline play progress
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const [meetingDetail, setMeetingDetail] = useState<any>(null);

  // Real audio playback sync logic
  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(err => console.log("Audio play failed:", err));
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying]);

  const audioSrc = meetingDetail?.recording_url 
    ? (meetingDetail.recording_url.startsWith("http") ? meetingDetail.recording_url : getApiUrl(meetingDetail.recording_url))
    : "";

  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
  }, [audioSrc]);

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs === null || secs === undefined) return "00:00";
    const minutes = Math.floor(secs / 60);
    const seconds = Math.floor(secs % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const audioToUse = audioRef.current;
    const activeDuration = duration || meetingDetail?.duration_seconds || 0;
    if (!audioToUse || activeDuration === 0) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const newTime = (clickX / width) * activeDuration;
    
    audioToUse.currentTime = newTime;
    setCurrentTime(newTime);
  };

  // Chat state
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<any[]>([
    { role: "assistant", text: "Hi! I am the meeting intelligence assistant. Ask me anything about this discussion." }
  ]);
  const [chatLoading, setChatLoading] = useState(false);

  // Jira sync simulation state
  const [jiraSyncing, setJiraSyncing] = useState<Record<string, boolean>>({});
  const [jiraStatus, setJiraStatus] = useState<Record<string, string>>({});

  // Ingestion and media state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [transcribing, setTranscribing] = useState(false);

  useEffect(() => {
    fetchMeetingDetail();
  }, [id]);

  // Polling for processing status
  useEffect(() => {
    let intervalId: any;
    if (meetingDetail && meetingDetail.status === "Processing") {
      intervalId = setInterval(() => {
        fetchMeetingDetailSilent();
      }, 3000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [id, meetingDetail?.status]);

  const fetchMeetingDetail = async () => {
    try {
      const res = await fetch(getApiUrl(`/api/v1/meetings/${id}`), {
        credentials: "include"
      });
      if (res.ok) {
        const data = await res.json();
        setMeetingDetail(data);
        return;
      } else if (res.status === 401) {
        router.push("/");
      }
    } catch (e) {
      console.warn("Backend not reachable.");
    }
  };

  const fetchMeetingDetailSilent = async () => {
    try {
      const res = await fetch(getApiUrl(`/api/v1/meetings/${id}`), {
        credentials: "include"
      });
      if (res.ok) {
        const data = await res.json();
        setMeetingDetail(data);
      }
    } catch (e) {
      console.warn("Silent fetch failed");
    }
  };

  const getCookie = (name: string): string | null => {
    if (typeof document === "undefined") return null;
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    if (match) return match[2];
    return null;
  };

  const handleMediaUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;
    setUploadingFile(true);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const res = await fetch(getApiUrl(`/api/v1/meetings/${id}/upload-media`), {
        method: "POST",
        body: formData,
        credentials: "include"
      });

      if (res.ok) {
        const data = await res.json();
        setMeetingDetail(data);
        setSelectedFile(null);
      } else {
        alert("Failed to upload recording.");
      }
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
      const res = await fetch(getApiUrl(`/api/v1/meetings/${id}/transcribe`), {
        method: "POST",
        credentials: "include"
      });
      if (res.ok) {
        const data = await res.json();
        setMeetingDetail(data);
      } else {
        alert("Failed to trigger transcription.");
      }
    } catch (e) {
      console.error("Transcription trigger error", e);
      alert("Error triggering transcription.");
    } finally {
      setTranscribing(false);
    }
  };

  const handleJiraSync = (actionId: string) => {
    setJiraSyncing(prev => ({ ...prev, [actionId]: true }));
    // Simulate Jira API post
    setTimeout(() => {
      setJiraSyncing(prev => ({ ...prev, [actionId]: false }));
      const key = `MM-${Math.floor(Math.random() * 800) + 100}`;
      setJiraStatus(prev => ({ ...prev, [actionId]: key }));
    }, 1200);
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput) return;

    const userMsg = { role: "user", text: chatInput };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput("");
    setChatLoading(true);

    // Call FastAPI or run simulation
    try {
      const response = await fetch(getApiUrl("/api/v1/search/chat"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          meeting_id: id,
          question: chatInput
        }),
        credentials: "include"
      });
      if (response.ok) {
        const data = await response.json();
        setChatMessages(prev => [...prev, { role: "assistant", text: data.answer }]);
        setChatLoading(false);
        return;
      } else if (response.status === 401) {
        router.push("/");
      }
    } catch (e) {
      console.warn("Backend not active, simulating RAG response.");
    }

    setTimeout(() => {
      let reply = "I analyzed the transcript. ";
      if (chatInput.toLowerCase().includes("database") || chatInput.toLowerCase().includes("vivek")) {
        reply += "Vivek Sharma is responsible for designing the database tenant isolation schemas. The target completion date is July 3, 2026. The confidence score of this extraction is 98%.";
      } else if (chatInput.toLowerCase().includes("clerk") || chatInput.toLowerCase().includes("auth")) {
        reply += "The decision was made to migrate to Auth.js/Clerk to bypass token database complexity and support enterprise requirements. Alex Rivera will implement Next.js routing integrations.";
      } else {
        reply += "No direct mentions of that topic was found in this specific session. It was mainly centered around Auth.js, Clerk database isolation, and migration tasks.";
      }
      setChatMessages(prev => [...prev, { role: "assistant", text: reply }]);
      setChatLoading(false);
    }, 1000);
  };

  const getPipelineStep = () => {
    if (!meetingDetail) return 0;
    if (meetingDetail.status === "Completed") return 5;
    if (meetingDetail.status === "Failed") return -1;
    
    // Processing stages
    if (!meetingDetail.transcripts || meetingDetail.transcripts.length === 0) {
      return 2; // Transcribing
    }
    if (!meetingDetail.executive_summary) {
      return 3; // Extracting Insights
    }
    return 4; // Seeding Knowledge Graph
  };

  const getStepStatus = (step: number) => {
    const currentStep = getPipelineStep();
    if (currentStep === -1) return "failed";
    if (currentStep === 5) return "completed";
    if (step < currentStep) return "completed";
    if (step === currentStep) return "processing";
    return "waiting";
  };

  if (!meetingDetail) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-2 text-[#6d6473]">
          <Loader2 className="w-5 h-5 animate-spin text-[#2f7c8f]" />
          <span className="font-outfit font-medium">Loading meeting details...</span>
        </div>
      </div>
    );
  }

  const detail = meetingDetail;

  return (
    <div className="flex flex-col min-h-screen text-[#18161f]">
      {/* Header Navigation */}
      <header className="px-8 py-4 border-b border-[#d8cfc2] flex items-center justify-between bg-white/40 backdrop-blur-sm">
        <button 
          onClick={() => router.push("/dashboard")}
          className="flex items-center gap-2 text-[#6d6473] hover:text-[#18161f] text-sm font-semibold transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>

        <span className="text-xs text-[#8c8377] font-mono">ID: {id}</span>
      </header>

      {/* Main Workspace Layout */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 p-8 max-w-7xl w-full mx-auto">
        {/* Left Side: Media player & tabs */}
        <section className="lg:col-span-8 flex flex-col gap-6 overflow-y-auto pr-2">
          {/* Title and metadata */}
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold font-outfit text-[#18161f] tracking-tight">{detail.title}</h1>
            <div className="flex items-center gap-4 text-xs text-[#6d6473] font-medium">
              <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> June 30, 2026</span>
              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> 40 minutes duration</span>
              <span className="px-2.5 py-0.5 rounded-full bg-[#2f7c8f]/10 border border-[#2f7c8f]/20 text-[#205866] font-semibold text-[10px]">
                {detail.platform || "Upload"}
              </span>
            </div>
          </div>

          {detail.status === "Processing" ? (
            <div className="flex flex-col gap-6 items-center justify-center p-8 rounded-[24px] soft-card backdrop-blur-md max-w-xl mx-auto my-8">
              <div className="w-16 h-16 rounded-full bg-[#2f7c8f]/10 flex items-center justify-center text-[#205866] mb-2 relative">
                <Sparkles className="w-8 h-8 animate-pulse text-[#2f7c8f]" />
                <div className="absolute inset-0 rounded-full border border-[#2f7c8f]/30 animate-ping" />
              </div>
              <h2 className="text-xl font-bold font-outfit text-[#18161f]">AI Processing in Progress</h2>
              <p className="text-xs text-[#6d6473] text-center max-w-sm">
                MeetingMind AI is extracting meeting data by analyzing and transcribing the audio and video.
              </p>

              <div className="w-full flex flex-col gap-4 mt-4 bg-white/80 p-6 rounded-2xl border border-[#d8cfc2] shadow-sm">
                {[
                  { step: 1, label: "Ingest Media File" },
                  { step: 2, label: "Speech-to-Text Transcription" },
                  { step: 3, label: "AI Summarization & Insight Extraction" },
                  { step: 4, label: "Semantic Seeding & Knowledge Mapping" }
                ].map((s) => {
                  const status = getStepStatus(s.step);
                  return (
                    <div key={s.step} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {status === "completed" && <CheckCircle2 className="w-4.5 h-4.5 text-emerald-655 text-emerald-600" />}
                        {status === "processing" && <Loader2 className="w-4.5 h-4.5 animate-spin text-[#2f7c8f]" />}
                        {status === "waiting" && <div className="w-4.5 h-4.5 rounded-full border border-[#d8cfc2]" />}
                        {status === "failed" && <XCircle className="w-4.5 h-4.5 text-rose-600" />}
                        <span className={`text-xs ${
                          status === "completed" ? "text-[#6d6473] line-through" :
                          status === "processing" ? "text-[#18161f] font-bold" : "text-[#8c8377]"
                        }`}>{s.label}</span>
                      </div>
                      <span className="text-[10px] uppercase font-bold tracking-wider">
                        {status === "completed" && <span className="text-emerald-600">Done</span>}
                        {status === "processing" && <span className="text-[#2f7c8f] animate-pulse">Running</span>}
                        {status === "waiting" && <span className="text-[#8c8377]">Pending</span>}
                      </span>
                    </div>
                  );
                })}
              </div>
              
              <div className="flex items-center gap-2 text-[10px] text-[#6d6473] font-medium">
                <Loader2 className="w-3 h-3 animate-spin text-[#2f7c8f]" /> Updates dynamically
              </div>
            </div>
          ) : detail.status === "Failed" ? (
            <div className="flex flex-col gap-6 items-center justify-center p-8 rounded-[24px] soft-card backdrop-blur-md max-w-xl mx-auto my-8">
              <div className="w-16 h-16 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mb-2">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold font-outfit text-[#18161f]">AI Processing Failed</h2>
              <p className="text-xs text-[#6d6473] text-center max-w-sm">
                An error occurred during audio extraction or speech transcription. Please check the logs or retry.
              </p>

              <button
                onClick={handleTranscribe}
                disabled={transcribing}
                className="w-full mt-4 py-2.5 rounded-xl bg-[#205866] hover:bg-[#2f7c8f] text-xs font-bold text-white transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-[#205866]/15"
              >
                {transcribing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Retrying...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" /> Retry Transcription
                  </>
                )}
              </button>
            </div>
          ) : (!detail.transcripts || detail.transcripts.length === 0) ? (
            <div className="flex flex-col gap-6 items-center justify-center p-8 rounded-[24px] soft-card backdrop-blur-md max-w-xl mx-auto my-8">
              <div className="w-16 h-16 rounded-full bg-[#2f7c8f]/10 flex items-center justify-center text-[#205866] mb-2">
                <Upload className="w-8 h-8 text-[#2f7c8f]" />
              </div>
              <h2 className="text-xl font-bold font-outfit text-[#18161f]">Media Ingestion & Transcription</h2>
              <p className="text-xs text-[#6d6473] text-center max-w-sm">
                Upload an audio or video recording file for this meeting, or start the AI processing pipeline directly.
              </p>
              
              <form onSubmit={handleMediaUpload} className="w-full flex flex-col gap-4 mt-2">
                <div className="border border-dashed border-[#d8cfc2] hover:border-[#2f7c8f] bg-white/50 rounded-xl p-6 text-center cursor-pointer transition-colors relative w-full">
                  <input 
                    type="file" 
                    accept="audio/*,video/*" 
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  {selectedFile ? (
                    <div className="flex items-center justify-center gap-2 text-[#205866]">
                      <FileAudio className="w-5 h-5" />
                      <span className="text-xs font-semibold truncate max-w-[200px]">{selectedFile.name}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-[#8c8377]">Drag & drop or click to select media</span>
                  )}
                </div>
                
                <button
                  type="submit"
                  disabled={!selectedFile || uploadingFile}
                  className="w-full py-2.5 rounded-xl bg-[#205866] hover:bg-[#2f7c8f] text-xs font-bold text-white transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-[#205866]/15"
                >
                  {uploadingFile ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Uploading media...
                    </>
                  ) : (
                    "Upload & Transcribe"
                  )}
                </button>
              </form>

              <div className="w-full flex items-center gap-3 my-2">
                <div className="h-[1px] bg-[#d8cfc2] flex-grow" />
                <span className="text-[10px] text-[#8c8377] uppercase tracking-wider font-semibold">Or</span>
                <div className="h-[1px] bg-[#d8cfc2] flex-grow" />
              </div>

              <button
                onClick={handleTranscribe}
                disabled={transcribing}
                className="w-full py-2.5 rounded-xl bg-white border border-[#d8cfc2] hover:border-[#2f7c8f] text-xs font-bold text-[#6d6473] hover:text-[#18161f] transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm"
              >
                {transcribing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Starting pipeline...
                  </>
                ) : (
                  "Trigger Quick AI Extraction (Demo)"
                )}
              </button>
            </div>
          ) : (
            <>
              {/* Audio Player */}
              {audioSrc && (
                <audio
                  ref={audioRef}
                  src={audioSrc}
                  onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                  onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
                  onEnded={() => setIsPlaying(false)}
                />
              )}

              {/* Audio Player UI */}
              <div className="p-4 rounded-2xl soft-card flex items-center gap-4">
                <button 
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="w-10 h-10 rounded-full bg-[#205866] hover:bg-[#2f7c8f] flex items-center justify-center text-white transition-colors shadow-md shadow-[#205866]/15"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                </button>
                <div className="flex-1 flex flex-col gap-1.5">
                  <div 
                    onClick={handleProgressClick}
                    className="h-2 w-full bg-[#d8cfc2] rounded-full overflow-hidden cursor-pointer relative"
                  >
                    <div 
                      className="h-full bg-[#2f7c8f] rounded-full transition-all" 
                      style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }} 
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-[#8c8377] font-mono select-none">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration || detail.duration_seconds || 0)}</span>
                  </div>
                </div>
              </div>

              {/* Details Content Tabs */}
              <div className="flex border-b border-[#d8cfc2] gap-1">
                {["summary", "timeline", "action-items", "decisions", "risks", "technical"].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2.5 text-xs font-semibold border-b-2 capitalize transition-colors ${
                      activeTab === tab ? "border-[#2f7c8f] text-[#205866] font-bold" : "border-transparent text-[#6d6473] hover:text-[#18161f]"
                    }`}
                  >
                    {tab.replace("-", " ")}
                  </button>
                ))}
              </div>

              {/* Tab contents */}
              <div className="min-h-[250px]">
                {activeTab === "summary" && (
                  <div className="flex flex-col gap-6">
                    <div>
                      <h3 className="text-sm font-bold text-[#18161f] mb-2 font-outfit">Executive Summary</h3>
                      <p className="text-sm text-[#18161f] leading-relaxed bg-white/80 p-4 rounded-2xl border border-[#d8cfc2] shadow-sm">
                        {detail.executive_summary}
                      </p>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[#18161f] mb-2 font-outfit">One Minute Read</h3>
                      <p className="text-sm text-[#18161f] leading-relaxed bg-white/80 p-4 rounded-2xl border border-[#d8cfc2] shadow-sm">
                        {detail.one_minute_read}
                      </p>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[#18161f] mb-2 font-outfit">Sentiment & Dynamic Tone</h3>
                      <p className="text-sm text-[#18161f] leading-relaxed bg-white/80 p-4 rounded-2xl border border-[#d8cfc2] shadow-sm">
                        {detail.sentiment_summary}
                      </p>
                    </div>
                  </div>
                )}

                {activeTab === "timeline" && (
                  <div className="flex flex-col gap-4 pl-4 border-l border-[#d8cfc2] ml-2">
                    {detail.timeline ? detail.timeline.map((item: any, idx: number) => (
                      <div key={idx} className="relative flex flex-col gap-1">
                        <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-[#2f7c8f]" />
                        <div className="flex gap-2 items-baseline">
                          <span className="font-mono text-xs font-semibold text-[#2f7c8f]">{item.time}</span>
                          <span className="font-bold text-[#18161f] text-xs font-outfit">{item.title}</span>
                        </div>
                        <p className="text-xs text-[#6d6473] pl-8">{item.desc}</p>
                      </div>
                    )) : (
                      <div className="text-xs text-[#8c8377]">Timeline loading or empty</div>
                    )}
                  </div>
                )}

                {activeTab === "action-items" && (
                  <div className="flex flex-col gap-4">
                    {detail.action_items ? detail.action_items.map((item: any, idx: number) => (
                      <div key={idx} className="p-4 rounded-2xl bg-white border border-[#d8cfc2] flex items-center justify-between gap-4 shadow-sm">
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-semibold text-[#18161f] font-outfit">{item.description}</span>
                          <div className="flex gap-3 text-[10px] text-[#6d6473] font-medium">
                            <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" /> {item.assigned_to || "Unassigned"}</span>
                            <span>Due: {item.due_date ? new Date(item.due_date).toLocaleDateString() : "No deadline"}</span>
                            <span className="text-[#2f7c8f] font-semibold">Confidence: {Math.round(item.confidence_score * 100)}%</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {jiraStatus[item.id] ? (
                            <span className="px-2.5 py-1 rounded bg-[#2f7c8f]/10 border border-[#2f7c8f]/20 text-[10px] text-[#205866] font-semibold">
                              Synced: {jiraStatus[item.id]}
                            </span>
                          ) : (
                            <button
                              onClick={() => handleJiraSync(item.id)}
                              disabled={jiraSyncing[item.id]}
                              className="px-3 py-1.5 rounded-lg bg-white hover:bg-zinc-50 text-[10px] text-[#6d6473] font-semibold border border-[#d8cfc2] hover:border-[#2f7c8f] transition-colors flex items-center gap-1.5 disabled:opacity-50"
                            >
                              {jiraSyncing[item.id] ? (
                                <RefreshCw className="w-3 h-3 animate-spin text-[#2f7c8f]" />
                              ) : "Sync Jira"}
                            </button>
                          )}
                        </div>
                      </div>
                    )) : (
                      <div className="text-xs text-[#8c8377]">No action items found</div>
                    )}
                  </div>
                )}

                {activeTab === "decisions" && (
                  <div className="flex flex-col gap-4">
                    {detail.decisions ? detail.decisions.map((dec: any, idx: number) => (
                      <div key={idx} className="p-4 rounded-2xl bg-[#2f7c8f]/5 border border-[#2f7c8f]/20 flex flex-col gap-2 shadow-sm">
                        <div className="flex justify-between items-baseline">
                          <span className="text-sm font-bold text-[#18161f] font-outfit">{dec.decision_text}</span>
                          <span className="text-[10px] text-[#205866] font-semibold">{Math.round(dec.confidence_score * 100)}% confidence</span>
                        </div>
                        <div className="text-xs text-[#6d6473]">
                          <span className="font-semibold text-[#8c8377]">Rationale:</span> {dec.rationale}
                        </div>
                      </div>
                    )) : (
                      <div className="text-xs text-[#8c8377]">No decisions detected</div>
                    )}
                  </div>
                )}

                {activeTab === "risks" && (
                  <div className="flex flex-col gap-4">
                    {detail.risks ? detail.risks.map((risk: any, idx: number) => (
                      <div key={idx} className="p-4 rounded-2xl bg-rose-50/50 border border-rose-200 flex flex-col gap-2 shadow-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-bold text-[#18161f] font-outfit flex items-center gap-1.5">
                            <ShieldAlert className="w-4 h-4 text-rose-600" /> {risk.risk_text}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 font-semibold">
                            {risk.severity} Severity
                          </span>
                        </div>
                        <div className="text-xs text-[#6d6473]">
                          <span className="font-semibold text-[#8c8377]">Mitigation:</span> {risk.mitigation}
                        </div>
                      </div>
                    )) : (
                      <div className="text-xs text-[#8c8377]">No risks detected</div>
                    )}
                  </div>
                )}

                {activeTab === "technical" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {detail.recording_url && (
                      <div className="p-4 rounded-2xl bg-white border border-[#d8cfc2] flex flex-col gap-2 shadow-sm md:col-span-2">
                        <h4 className="text-xs font-bold text-[#18161f] flex items-center gap-1.5 font-outfit">
                          <FileAudio className="w-3.5 h-3.5 text-[#2f7c8f]" /> Uploaded File Details
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-[#6d6473] font-medium">
                          <div>
                            <span className="font-semibold text-[#8c8377]">Original Name:</span> {detail.original_filename || "N/A"}
                          </div>
                          <div>
                            <span className="font-semibold text-[#8c8377]">Content Type:</span> {detail.content_type || "N/A"}
                          </div>
                          <div>
                            <span className="font-semibold text-[#8c8377]">File Size:</span> {detail.file_size ? `${(detail.file_size / (1024 * 1024)).toFixed(2)} MB` : "N/A"}
                          </div>
                          <div>
                            <span className="font-semibold text-[#8c8377]">File URL:</span> <a href={audioSrc} target="_blank" rel="noreferrer" className="text-[#2f7c8f] hover:underline break-all">{detail.recording_url}</a>
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="p-4 rounded-2xl bg-white border border-[#d8cfc2] flex flex-col gap-2 shadow-sm">
                      <h4 className="text-xs font-bold text-[#18161f] flex items-center gap-1.5 font-outfit">
                        <Code2 className="w-3.5 h-3.5 text-[#2f7c8f]" /> Repositories & Files
                      </h4>
                      <ul className="text-xs text-[#6d6473] flex flex-col gap-1">
                        {detail.technical_context?.repositories?.map((repo: string, idx: number) => <li key={idx} className="text-[#2f7c8f] font-medium">{repo}</li>) || <li className="text-[#8c8377]">None</li>}
                        {detail.technical_context?.files?.map((file: string, idx: number) => <li key={idx} className="font-mono text-[11px] text-[#6d6473]">{file}</li>) || <li className="text-[#8c8377]">None</li>}
                      </ul>
                    </div>
                    <div className="p-4 rounded-2xl bg-white border border-[#d8cfc2] flex flex-col gap-2 shadow-sm">
                      <h4 className="text-xs font-bold text-[#18161f] flex items-center gap-1.5 font-outfit">APIs & Tables</h4>
                      <ul className="text-xs text-[#6d6473] flex flex-col gap-1">
                        {detail.technical_context?.apis?.map((api: string, idx: number) => <li key={idx} className="font-mono text-[10px] bg-[#fffaf4] border border-[#d8cfc2] px-1 py-0.5 rounded w-fit text-[#6d6473]">{api}</li>) || <li className="text-[#8c8377]">None</li>}
                        {detail.technical_context?.database_tables?.map((table: string, idx: number) => <li key={idx} className="text-[#18161f] font-medium">{table}</li>) || <li className="text-[#8c8377]">None</li>}
                      </ul>
                    </div>
                  </div>
                )}
              </div>

              {/* Transcript Dialogue */}
              <div className="flex flex-col gap-4 mt-6">
                <h3 className="text-sm font-bold text-[#18161f] font-outfit">Full Transcript</h3>
                <div className="flex flex-col gap-4 bg-white/80 p-6 rounded-2xl border border-[#d8cfc2] max-h-[350px] overflow-y-auto shadow-sm">
                  {detail.transcripts ? detail.transcripts.map((t: any, idx: number) => (
                    <div key={idx} className="flex flex-col gap-1 text-xs">
                      <span className="font-bold text-[#205866] font-outfit">
                        {detail.speakers?.find((s: any) => s.speaker_tag === t.speaker_tag)?.display_name || t.speaker_tag}
                      </span>
                      <p className="text-[#18161f] leading-relaxed font-medium">{t.text}</p>
                    </div>
                  )) : (
                    <div className="text-xs text-[#8c8377]">No transcripts found</div>
                  )}
                </div>
              </div>
            </>
          )}
        </section>

        {/* Right Side: RAG Chat Panel */}
        <section className="lg:col-span-4 p-6 rounded-[24px] soft-card flex flex-col justify-between max-h-[600px] h-full">
          <div className="flex flex-col gap-4 flex-grow overflow-hidden">
            <h3 className="font-bold text-sm text-[#18161f] flex items-center gap-2 border-b border-[#d8cfc2] pb-3 font-outfit">
              <MessageSquare className="w-4 h-4 text-[#2f7c8f]" /> Chat with Meeting
            </h3>
            
            {/* Messages box */}
            <div className="flex-grow overflow-y-auto flex flex-col gap-3 pr-2 scrollbar font-outfit">
              {detail.status !== "Completed" ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-4">
                  <Sparkles className="w-8 h-8 text-[#8c8377] mb-2 animate-pulse" />
                  <p className="text-xs text-[#6d6473] font-medium">Chat is unavailable while AI extracts data.</p>
                </div>
              ) : (
                <>
                  {chatMessages.map((msg, idx) => (
                    <div 
                      key={idx} 
                      className={`p-3 rounded-2xl text-xs leading-relaxed max-w-[85%] ${
                        msg.role === "user" 
                          ? "bg-[#2f7c8f]/10 text-[#205866] border border-[#2f7c8f]/20 self-end" 
                          : "bg-white text-[#18161f] border border-[#d8cfc2] self-start"
                      }`}
                    >
                      {msg.text}
                    </div>
                  ))}
                  
                  {chatLoading && (
                    <div className="flex items-center gap-2 text-[#6d6473] text-xs self-start">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#2f7c8f]" /> AI thinking...
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <form onSubmit={handleChatSubmit} className="flex items-center gap-2 mt-4 pt-3 border-t border-[#d8cfc2]">
            <input 
              type="text" 
              placeholder={detail.status === "Completed" ? "Ask a question..." : "Waiting for transcription..."}
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              disabled={detail.status !== "Completed"}
              className="flex-grow px-3 py-2 rounded-xl bg-white border border-[#d8cfc2] text-xs focus:outline-none focus:border-[#2f7c8f] text-[#18161f] disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <button 
              type="submit"
              disabled={detail.status !== "Completed" || !chatInput}
              className="p-2 rounded-xl bg-[#205866] hover:bg-[#2f7c8f] text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-[#205866]/10"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
