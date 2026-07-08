"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
  Search, Upload, AlertTriangle, ShieldAlert, TrendingUp, ChevronRight, Brain, 
  Sparkles,Loader2, Scale, ClipboardCheck, Bell, ChevronDown, Download, ArrowRight
} from "lucide-react";
import { getApiUrl } from "../../config";

export default function Dashboard() {
  const router = useRouter();
  const [meetings, setMeetings] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [uploading, setUploading] = useState(false);
  const [meetingTitle, setMeetingTitle] = useState("");
  const [platform, setPlatform] = useState("Upload");
  const [activeTab, setActiveTab] = useState("all");
  const [scheduledStart, setScheduledStart] = useState("");
  const [meetingUrl, setMeetingUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [userName, setUserName] = useState("Vivek Singh Bora");
  const [userRole, setUserRole] = useState("Admin");
  const [stats, setStats] = useState<any>({
    productivity_score: 100,
    total_decisions: 0,
    pending_action_items: 0,
    active_risks: 0
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchMeetings();
    fetchProfile();
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch(getApiUrl("/api/v1/analytics/overview"), {
        credentials: "include"
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (e) {
      console.warn("Backend not active for analytics fetch.");
    }
  };

  const eraseCookie = (name: string) => {
    if (typeof document === "undefined") return;
    document.cookie = `${name}=; max-age=0; path=/; SameSite=Lax`;
  };

  const fetchProfile = async () => {
    try {
      const res = await fetch(getApiUrl("/api/v1/auth/me"), {
        credentials: "include"
      });
      if (res.ok) {
        const profile = await res.json();
        setUserName(profile.name);
        setUserRole(profile.role);
      }
    } catch (e) {
      console.warn("Backend not active for profile fetch.");
    }
  };

  const fetchMeetings = async () => {
    try {
      const res = await fetch(getApiUrl("/api/v1/meetings/"), {
        credentials: "include"
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          setMeetings(data);
          return;
        }
      } else if (res.status === 401) {
        eraseCookie("isAuthenticated");
        router.push("/");
      }
    } catch (e) {
      console.warn("Backend not active for meetings fetch.");
    }
    setMeetings([]);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetingTitle) return;
    setUploading(true);

    const isLinkJoin = platform === "Teams" || platform === "Google Meet";

    try {
      let responseData: any = null;
      if (isLinkJoin) {
        const res = await fetch(getApiUrl("/api/v1/meetings/join-link"), {
          method: "POST",
          headers: { 
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            title: meetingTitle,
            platform: platform,
            meeting_url: meetingUrl,
            scheduled_start: scheduledStart ? new Date(scheduledStart).toISOString() : undefined
          }),
          credentials: "include"
        });
        if (res.ok) responseData = await res.json();
      } else {
        const formData = new FormData();
        formData.append("title", meetingTitle);
        formData.append("platform", platform);
        if (selectedFile) {
          formData.append("file", selectedFile);
        } else {
          // Append empty placeholder file
          const blob = new Blob([""], { type: "audio/wav" });
          formData.append("file", blob, "meeting.wav");
        }
        
        const res = await fetch(getApiUrl("/api/v1/meetings/upload"), {
          method: "POST",
          body: formData,
          credentials: "include"
        });
        if (res.ok) responseData = await res.json();
      }

      if (responseData) {
        setMeetings(prev => [responseData, ...prev]);
        if (responseData.id) {
          router.push(`/meetings/${responseData.id}`);
        }
      }
    } catch (err) {
      console.warn("Could not sync upload to backend.");
    } finally {
      setMeetingTitle("");
      setMeetingUrl("");
      setSelectedFile(null);
      setUploading(false);
    }
  };

  const filteredMeetings = meetings.filter(m => {
    const matchesSearch = m.title.toLowerCase().includes(searchQuery.toLowerCase());
    if (activeTab === "all") return matchesSearch;
    const s = (m.status || "").toUpperCase();
    const isTerminal = s === "COMPLETED" || s === "FAILED" || s === "ERROR";
    return matchesSearch && !isTerminal;
  });

  const displayedMeetings = filteredMeetings.slice(0, 5);

  const getMeetingSummaryText = (m: any) => {
    const actionsCount = m.action_items?.length || 0;
    const decisionsCount = m.decisions?.length || 0;
    return `${actionsCount} action items, ${decisionsCount} decisions logged`;
  };

  return (
    <main className="p-8 flex flex-col gap-8 max-w-9xl mx-auto text-[#0f172a]">
      {/* Top Bar */}
      <div className="flex justify-between items-center gap-4">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-xl">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search meetings, decisions, or action items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-16 py-2.5 rounded-xl bg-white border border-slate-200 text-sm focus:outline-none focus:border-[#0f766e] text-slate-800 shadow-sm"
          />
          <kbd className="text-[10px] font-semibold text-slate-400 bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 select-none absolute right-3 top-3">
            ⌘ K
          </kbd>
        </div>
      </div>

      {/* Overview Stats Cards matching image layout */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Card 1: Productivity Score */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 flex flex-col gap-3.5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Productivity Score</span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-3xl font-extrabold font-outfit text-slate-900 leading-none">
                  {stats.productivity_score}
                </span>
              </div>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 font-semibold leading-normal pl-0.5">
            Based on completed action items ratio.
          </p>
        </div>

        {/* Card 2: Important Decisions */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 flex flex-col gap-3.5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
              <Scale className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Important Decisions</span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-3xl font-extrabold font-outfit text-slate-900 leading-none">
                  {stats.total_decisions}
                </span>
              </div>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 font-semibold leading-normal pl-0.5">
            Total decisions logged across all meetings.
          </p>
        </div>

        {/* Card 3: Pending Action Items */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 flex flex-col gap-3.5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pending Action Items</span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-3xl font-extrabold font-outfit text-slate-900 leading-none">
                  {stats.pending_action_items}
                </span>
              </div>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 font-semibold leading-normal pl-0.5">
            Action items awaiting completion.
          </p>
        </div>

        {/* Card 4: Risks Detected */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 flex flex-col gap-3.5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center flex-shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Risks Detected</span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-3xl font-extrabold font-outfit text-slate-900 leading-none">
                  {stats.active_risks}
                </span>
              </div>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 font-semibold leading-normal pl-0.5">
            Active risks needing mitigation.
          </p>
        </div>
      </section>

      {/* Main Grid Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left column: Recent Meetings */}
        <section className="lg:col-span-8 flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold font-outfit text-[#0f172a]">Recent meetings</h2>
            <div className="flex bg-slate-100/80 p-1 rounded-full gap-1 border border-slate-200">
              <button 
                onClick={() => setActiveTab("all")}
                className={`text-xs px-4 py-1.5 rounded-full font-bold transition-colors ${
                  activeTab === "all" 
                    ? "bg-[#0f766e] text-white shadow-sm" 
                    : "text-slate-500 hover:text-[#0f172a]"
                }`}
              >
                All
              </button>
              <button 
                onClick={() => setActiveTab("processing")}
                className={`text-xs px-4 py-1.5 rounded-full font-bold transition-colors ${
                  activeTab === "processing" 
                    ? "bg-[#0f766e] text-white shadow-sm" 
                    : "text-slate-500 hover:text-[#0f172a]"
                }`}
              >
                Processing
              </button>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            {displayedMeetings.map((meeting, index) => {
              const statusNorm = (meeting.status || "").toUpperCase();
              const isCompleted = statusNorm === "COMPLETED";
              const isFailed = statusNorm === "FAILED" || statusNorm === "ERROR";
              const isProcessing = !isCompleted && !isFailed;

              return (
                <div 
                  key={meeting.id}
                  onClick={() => {
                    router.push(`/meetings/${meeting.id}`);
                  }}
                  className={`p-5 flex justify-between items-center gap-4 cursor-pointer hover:bg-slate-50/50 transition-all ${
                    index < displayedMeetings.length - 1 ? "border-b border-slate-100" : ""
                  }`}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    {/* Status Circle Icon */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      isCompleted ? "bg-teal-50 text-[#0f766e]" :
                      isFailed ? "bg-rose-50 text-rose-600" :
                      "bg-amber-50 text-amber-600"
                    }`}>
                      {isCompleted && <Brain className="w-5 h-5" />}
                      {isFailed && <ShieldAlert className="w-5 h-5" />}
                      {isProcessing && <Loader2 className="w-5 h-5 animate-spin" />}
                    </div>

                    <div className="flex flex-col min-w-0">
                      <h3 className="font-bold text-[#0f172a] text-[13.5px] leading-tight truncate">
                        {meeting.title}
                      </h3>
                      
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold mt-1">
                        <span>
                          {new Date(meeting.meeting_date).toLocaleDateString("en-US", {
                            weekday: "short", month: "short", day: "numeric"
                          })}
                        </span>
                        <span>•</span>
                        <span>
                          {new Date(meeting.meeting_date).toLocaleTimeString("en-US", {
                            hour: "2-digit", minute: "2-digit", hour12: true
                          })}
                        </span>
                        {meeting.duration_seconds && (
                          <>
                            <span>•</span>
                            <span>{Math.floor(meeting.duration_seconds / 60)} min</span>
                          </>
                        )}
                      </div>

                      {/* Bullet Summaries */}
                      <div className="flex items-center gap-1 text-[11px] font-bold mt-2">
                        {isCompleted ? (
                          <span className="text-slate-500 flex items-center gap-1.5">
                            <span className="text-[#0f766e] font-extrabold text-xs">✓</span>{" "}
                            {getMeetingSummaryText(meeting)}
                          </span>
                        ) : isFailed ? (
                          <span className="text-rose-600 flex items-center gap-1.5 font-semibold">
                            <span className="font-extrabold text-xs">⊗</span> {meeting.error_message || "Processing failed — audio file corrupted"}
                          </span>
                        ) : (
                          <span className="text-slate-400 flex items-center gap-1.5 font-semibold">
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0f766e]" /> Processing transcription and insights...
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    {/* Status Pill */}
                    <span className={`text-[10px] px-2.5 py-0.5 rounded-lg font-bold border capitalize ${
                      isCompleted ? "bg-teal-50/50 text-[#0f766e] border-teal-100" : 
                      isFailed ? "bg-rose-50/50 text-rose-650 border-rose-100" : 
                      "bg-amber-50/50 text-amber-600 border-amber-100 animate-pulse"
                    }`}>
                      {meeting.status}
                    </span>

                    <ChevronRight className="w-4 h-4 text-slate-300" />
                  </div>
                </div>
              );
            })}

            {filteredMeetings.length === 0 && (
              <div className="p-12 text-center border border-dashed border-slate-200 rounded-2xl text-slate-400 text-sm bg-white">
                No meetings found matching your search.
              </div>
            )}
          </div>

          {/* View More Meetings Centered */}
          {filteredMeetings.length > 5 && (
            <div className="flex justify-center mt-2">
              <button 
                onClick={() => router.push("/meetings")}
                className="flex items-center gap-1 text-[#0f766e] hover:text-[#0d9488] text-xs font-bold transition-all"
              >
                View more <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
              </button>
            </div>
          )}
        </section>

        {/* Right column: Ingest Meeting & AI Suggestions */}
        <section className="lg:col-span-4 flex flex-col gap-6">
          {/* Ingest Meeting Card */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 flex flex-col gap-4 shadow-sm">
            <h3 className="font-bold text-sm text-[#0f172a] flex items-center gap-2">
              <Download className="w-4 h-4 text-[#0f766e] transform rotate-180" /> Ingest meeting
            </h3>
            
            <form onSubmit={handleUpload} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Meeting title</label>
                <input 
                  type="text" 
                  placeholder="API gateway sync"
                  value={meetingTitle}
                  onChange={(e) => setMeetingTitle(e.target.value)}
                  className="px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs focus:outline-none focus:border-[#0f766e] text-[#0f172a] shadow-sm w-full"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Meeting platform</label>
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs focus:outline-none focus:border-[#0f766e] text-[#0f172a] cursor-pointer shadow-sm"
                >
                  <option value="Upload">Upload file (audio / video)</option>
                  <option value="Google Meet">Google Meet Sync</option>
                  <option value="Teams">Microsoft Teams Sync</option>
                  <option value="Jira">Jira Attachment</option>
                </select>
              </div>
              
              {(platform === "Teams" || platform === "Google Meet") ? (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Meeting Invite URL</label>
                  <input 
                    type="url" 
                    placeholder={platform === "Teams" ? "e.g., https://teams.microsoft.com/l/meetup-join/..." : "e.g., https://meet.google.com/abc-defg-hij"}
                    value={meetingUrl}
                    onChange={(e) => setMeetingUrl(e.target.value)}
                    className="px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs focus:outline-none focus:border-[#0f766e] text-[#0f172a] shadow-sm"
                    required
                  />
                </div>
              ) : (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border border-dashed border-slate-250 hover:border-[#0f766e]/50 rounded-2xl p-6 flex flex-col items-center justify-center gap-2.5 cursor-pointer transition-all bg-slate-50/50 hover:bg-slate-50"
                >
                  <input 
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        setSelectedFile(e.target.files[0]);
                      }
                    }}
                    accept="audio/*,video/*"
                    className="hidden"
                  />
                  <Upload className="w-5 h-5 text-[#0f766e]" />
                  {selectedFile ? (
                    <span className="text-[10px] text-[#0f766e] font-semibold truncate max-w-full">
                      Selected: {selectedFile.name}
                    </span>
                  ) : (
                    <div className="text-center flex flex-col gap-0.5">
                      <p className="text-[11px] text-slate-800 font-bold">Drag and drop a recording</p>
                      <p className="text-[9px] text-slate-400 font-semibold">mp3, wav, mp4, mkv</p>
                    </div>
                  )}
                </div>
              )}

              {(platform === "Teams" || platform === "Google Meet") && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Scheduled Start</label>
                  <input 
                    type="datetime-local"
                    value={scheduledStart}
                    onChange={(e) => setScheduledStart(e.target.value)}
                    className="px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs focus:outline-none focus:border-[#0f766e] text-[#0f172a] shadow-sm"
                  />
                </div>
              )}

              <button 
                type="submit" 
                disabled={uploading}
                className="w-full py-2.5 rounded-xl bg-[#0f766e] hover:bg-[#0d9488] text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Ingesting audio...
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5" /> Upload recording
                  </>
                )}
              </button>
            </form>
          </div>

          {/* AI Suggestions Card */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 flex flex-col gap-5 shadow-sm">
            <h3 className="font-bold text-sm text-[#0f172a] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#0f766e]" /> AI suggestions
            </h3>
            
            <div className="flex flex-col gap-4">
              {/* Suggestion 1 */}
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div className="flex flex-col gap-1 text-xs">
                  <span className="font-bold text-[#0f172a] font-outfit">Authentication blocker</span>
                  <p className="text-slate-500 leading-relaxed font-medium text-[11px]">
                    Vivek needs to approve database schemas before Friday to unblock the OAuth migration.
                  </p>
                </div>
              </div>

              {/* Suggestion 2 */}
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div className="flex flex-col gap-1 text-xs">
                  <span className="font-bold text-[#0f172a] font-outfit">Payment gateway risk</span>
                  <p className="text-slate-500 leading-relaxed font-medium text-[11px]">
                    A ledger consistency check was mentioned with no owner assigned. Consider opening a Jira ticket.
                  </p>
                </div>
              </div>
            </div>

            {/* View All Suggestions Centered Link */}
            <div className="flex justify-center mt-2">
              <button 
                onClick={() => router.push("/suggestions")}
                className="flex items-center gap-1 text-[#0f766e] hover:text-[#0d9488] text-xs font-bold transition-all"
              >
                View all suggestions <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
