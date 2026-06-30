"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Brain, Search, Upload, Plus, Calendar, CheckSquare, 
  AlertTriangle, ShieldAlert, Award, TrendingUp, ChevronRight,
  Sparkles, FileText, BarChart3, Network, LogOut, Loader2
} from "lucide-react";

export default function Dashboard() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [uploading, setUploading] = useState(false);
  const [meetingTitle, setMeetingTitle] = useState("");
  const [platform, setPlatform] = useState("Upload");
  const [activeTab, setActiveTab] = useState("all");
  const [scheduledStart, setScheduledStart] = useState("");
  
  const [userName, setUserName] = useState("Vivek Sharma");
  const [userRole, setUserRole] = useState("Admin");
  const [meetingUrl, setMeetingUrl] = useState("");

  // Mock initial meetings for instant working demonstration
  const mockMeetings = [
    {
      id: "meet-1",
      title: "Authentication Architecture & Security Review",
      status: "Completed",
      platform: "Google Meet",
      duration_seconds: 2400,
      meeting_date: "2026-06-30T10:00:00",
      executive_summary: "Discussed migrating to Auth.js/Clerk, database structure for tenant isolation, and pgvector schema configurations.",
    },
    {
      id: "meet-2",
      title: "RecruitEase Pro Pipeline Integration Sync",
      status: "Completed",
      platform: "Teams",
      duration_seconds: 1800,
      meeting_date: "2026-06-29T14:30:00",
      executive_summary: "Reviewed candidate matching, career portal updates, and webhook callbacks from external HR services.",
    },
    {
      id: "meet-3",
      title: "Sprint Planning & Payment Gateway Rewrite",
      status: "Processing",
      platform: "Jira",
      duration_seconds: 3200,
      meeting_date: "2026-06-30T11:30:00",
      executive_summary: "Initial discussion about Stripe migration, refund workers, and ledger consistency checks.",
    }
  ];

  useEffect(() => {
    const isMockMode = localStorage.getItem("mock_mode") === "true";
    const storedToken = localStorage.getItem("token");
    
    // In mock mode, we require the mock token in localStorage
    if (isMockMode && !storedToken) {
      router.push("/");
      return;
    }
    
    const storedName = localStorage.getItem("user_name");
    const storedRole = localStorage.getItem("role");
    if (storedName) setUserName(storedName);
    if (storedRole) setUserRole(storedRole);

    fetchProfile();
    fetchMeetings();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await fetch("http://localhost:8000/api/v1/auth/me", {
        credentials: "include"
      });
      if (res.ok) {
        const profile = await res.json();
        setUserName(profile.name);
        setUserRole(profile.role);
        localStorage.setItem("user_name", profile.name);
        localStorage.setItem("role", profile.role);
      } else if (res.status === 401) {
        localStorage.clear();
        router.push("/");
      }
    } catch (e) {
      console.warn("Backend not active. Using cached profile details.");
    }
  };

  const fetchMeetings = async () => {
    try {
      const res = await fetch("http://localhost:8000/api/v1/meetings/", {
        credentials: "include"
      });
      if (res.ok) {
        const data = await res.json();
        if (data.length > 0) {
          setMeetings(data);
          return;
        }
      } else if (res.status === 401) {
        localStorage.clear();
        router.push("/");
      }
    } catch (e) {
      console.warn("Backend not active. Using mock meetings.");
    }
    setMeetings(mockMeetings);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetingTitle) return;
    setUploading(true);

    const isLinkJoin = platform === "Teams" || platform === "Google Meet";

    // Simulate upload delay
    setTimeout(async () => {
      const newMeeting = {
        id: `meet-${Date.now()}`,
        title: meetingTitle,
        platform: platform,
        status: isLinkJoin ? "Processing" : "Completed",
        meeting_url: isLinkJoin ? meetingUrl : null,
        executive_summary: isLinkJoin
          ? "Autonomous Agent is connecting to the call link..."
          : "Meeting is currently being transcribed and analyzed by AI pipeline...",
      };
      
      setMeetings([newMeeting, ...meetings]);
      setMeetingTitle("");
      setMeetingUrl("");
      setUploading(false);

      // In production, build FormData or post JSON parameters to FastAPI
      try {
        if (isLinkJoin) {
          await fetch("http://localhost:8000/api/v1/meetings/join-link", {
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
        } else {
          const formData = new FormData();
          formData.append("title", meetingTitle);
          formData.append("platform", platform);
          // Append dummy file
          const blob = new Blob(["mock-audio"], { type: "audio/wav" });
          formData.append("file", blob, "meeting.wav");
          
          await fetch("http://localhost:8000/api/v1/meetings/upload", {
            method: "POST",
            body: formData,
            credentials: "include"
          });
        }
      } catch (e) {
        console.warn("Could not sync upload to backend.");
      }
    }, 1500);
  };

  const handleLogout = async () => {
    try {
      await fetch("http://localhost:8000/api/v1/auth/logout", {
        method: "POST",
        credentials: "include"
      });
    } catch (e) {
      console.warn("Could not reach logout endpoint on backend.");
    }
    localStorage.clear();
    router.push("/");
  };

  const filteredMeetings = meetings.filter(m => 
    m.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="bg-[#09090b] text-[#fafafa] min-h-screen flex selection:bg-violet-500 selection:text-white">
      {/* Navigation Sidebar */}
      <aside className="w-64 border-r border-zinc-800 flex flex-col justify-between p-6">
        <div className="flex flex-col gap-8">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-violet-600 rounded-md">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold tracking-tight font-outfit text-white">MeetingMind AI</span>
          </div>

          <nav className="flex flex-col gap-1">
            <button className="flex items-center gap-3 px-3 py-2 rounded-lg bg-zinc-800/60 text-white text-sm font-medium transition-colors">
              <Calendar className="w-4 h-4 text-violet-400" /> Dashboard
            </button>
            <button 
              onClick={() => router.push("/knowledge")}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-zinc-400 hover:text-white text-sm font-medium transition-colors"
            >
              <Network className="w-4 h-4" /> Knowledge Graph
            </button>
            <button 
              onClick={() => router.push("/analytics")}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-zinc-400 hover:text-white text-sm font-medium transition-colors"
            >
              <BarChart3 className="w-4 h-4" /> Analytics
            </button>
          </nav>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-zinc-900/60 border border-zinc-800/80">
            <div className="w-8 h-8 rounded-full bg-violet-500 flex items-center justify-center text-xs font-bold text-white uppercase">
              {userName ? userName.split(" ").map((n: string) => n[0]).join("").slice(0, 2) : "VS"}
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-white">{userName}</span>
              <span className="text-[10px] text-zinc-500 capitalize">{userRole}</span>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-zinc-500 hover:text-red-400 text-sm font-medium transition-colors"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Workspace */}
      <main className="flex-1 p-8 overflow-y-auto flex flex-col gap-8 max-w-7xl mx-auto">
        {/* Top bar */}
        <div className="flex justify-between items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
            <input 
              type="text" 
              placeholder="Search meetings, decisions, or action items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-sm focus:outline-none focus:border-violet-500 text-zinc-200"
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" /> AI Ready
            </div>
          </div>
        </div>

        {/* Overview Stats Cards */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="p-6 rounded-xl bg-zinc-900/50 border border-zinc-800 flex flex-col gap-1">
            <span className="text-xs text-zinc-400 uppercase tracking-wider font-semibold">Productivity Score</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-bold font-outfit text-white">92</span>
              <span className="text-xs text-emerald-400 flex items-center"><TrendingUp className="w-3 h-3 mr-0.5" /> +4.2%</span>
            </div>
            <p className="text-[10px] text-zinc-500 mt-2">Action item completion velocity is strong</p>
          </div>

          <div className="p-6 rounded-xl bg-zinc-900/50 border border-zinc-800 flex flex-col gap-1">
            <span className="text-xs text-zinc-400 uppercase tracking-wider font-semibold">Important Decisions</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-bold font-outfit text-white">14</span>
            </div>
            <p className="text-[10px] text-zinc-500 mt-2">Logged in the current sprint lifecycle</p>
          </div>

          <div className="p-6 rounded-xl bg-zinc-900/50 border border-zinc-800 flex flex-col gap-1">
            <span className="text-xs text-zinc-400 uppercase tracking-wider font-semibold">Pending Action Items</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-bold font-outfit text-white">5</span>
              <span className="text-xs text-violet-400">Assigned to you</span>
            </div>
            <p className="text-[10px] text-zinc-500 mt-2">2 approaching deadline</p>
          </div>

          <div className="p-6 rounded-xl bg-zinc-900/50 border border-zinc-800 flex flex-col gap-1">
            <span className="text-xs text-zinc-400 uppercase tracking-wider font-semibold">Risks Detected</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-bold font-outfit text-white">3</span>
              <span className="text-xs text-amber-500 flex items-center"><ShieldAlert className="w-3.5 h-3.5 ml-1" /></span>
            </div>
            <p className="text-[10px] text-zinc-500 mt-2">1 blocker requires attention</p>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left panel: meetings table */}
          <section className="lg:col-span-8 flex flex-col gap-6">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold font-outfit text-white">Recent Meetings</h2>
              <div className="flex gap-2">
                <button 
                  onClick={() => setActiveTab("all")}
                  className={`text-xs px-3 py-1.5 rounded-md transition-colors ${activeTab === "all" ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-white"}`}
                >
                  All
                </button>
                <button 
                  onClick={() => setActiveTab("processing")}
                  className={`text-xs px-3 py-1.5 rounded-md transition-colors ${activeTab === "processing" ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-white"}`}
                >
                  Processing
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              {filteredMeetings.map((meeting) => (
                <div 
                  key={meeting.id}
                  onClick={() => {
                    if (meeting.status === "Processing") {
                      router.push(`/meetings/live/${meeting.id}`);
                    } else {
                      router.push(`/meetings/${meeting.id}`);
                    }
                  }}
                  className="p-5 rounded-xl bg-zinc-900/40 border border-zinc-850 hover:border-violet-500/50 cursor-pointer transition-all flex flex-col gap-3 group relative overflow-hidden"
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex flex-col gap-1">
                      <h3 className="font-bold text-white group-hover:text-violet-400 transition-colors">
                        {meeting.title}
                      </h3>
                      <span className="text-xs text-zinc-500">
                        {new Date(meeting.meeting_date).toLocaleDateString("en-US", {
                          weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
                        })}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-850 border border-zinc-800 text-zinc-400 font-semibold">
                        {meeting.platform || "Upload"}
                      </span>
                      {meeting.status === "Processing" && (
                        <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 font-semibold animate-pulse">
                          Monitor Live
                        </span>
                      )}
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                        meeting.status === "Completed" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : 
                        meeting.status === "Processing" ? "bg-violet-500/10 text-violet-400 border border-violet-500/20" : 
                        "bg-red-500/10 text-red-400 border border-red-500/20"
                      }`}>
                        {meeting.status}
                      </span>
                      <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-white transition-colors" />
                    </div>
                  </div>

                  <p className="text-xs text-zinc-400 line-clamp-2">
                    {meeting.executive_summary}
                  </p>
                  {meeting.meeting_url && (
                    <p className="text-[10px] text-zinc-500 truncate">
                      Link: {meeting.meeting_url}
                    </p>
                  )}
                </div>
              ))}

              {filteredMeetings.length === 0 && (
                <div className="p-12 text-center border border-dashed border-zinc-800 rounded-xl text-zinc-500 text-sm">
                  No meetings found matching your search.
                </div>
              )}
            </div>
          </section>

          {/* Right panel: Upload meeting & AI suggestions */}
          <section className="lg:col-span-4 flex flex-col gap-8">
            {/* Upload meeting box */}
            <div className="p-6 rounded-xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur flex flex-col gap-4">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Upload className="w-4 h-4 text-violet-400" /> Ingest Meeting
              </h3>
              <form onSubmit={handleUpload} className="flex flex-col gap-3">
                <input 
                  type="text" 
                  placeholder="Meeting Title (e.g. API Gateway Sync)"
                  value={meetingTitle}
                  onChange={(e) => setMeetingTitle(e.target.value)}
                  className="px-3.5 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs focus:outline-none focus:border-violet-500 text-zinc-200"
                  required
                />

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold text-zinc-500">Meeting Platform</label>
                  <select
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs focus:outline-none focus:border-violet-500 text-zinc-200 cursor-pointer"
                  >
                    <option value="Upload">Upload File (Local Audio)</option>
                    <option value="Google Meet">Google Meet Sync</option>
                    <option value="Teams">Microsoft Teams Sync</option>
                    <option value="Jira">Jira Attachment</option>
                  </select>
                </div>
                
                {(platform === "Teams" || platform === "Google Meet") ? (
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-semibold text-zinc-500">Meeting Invite URL</label>
                    <input 
                      type="url" 
                      placeholder={platform === "Teams" ? "e.g., https://teams.microsoft.com/l/meetup-join/..." : "e.g., https://meet.google.com/abc-defg-hij"}
                      value={meetingUrl}
                      onChange={(e) => setMeetingUrl(e.target.value)}
                      className="px-3.5 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs focus:outline-none focus:border-violet-500 text-zinc-200"
                      required
                    />
                  </div>
                ) : (
                  <div className="border border-dashed border-zinc-800 hover:border-violet-500/50 rounded-lg p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors bg-zinc-950/40">
                    <Plus className="w-5 h-5 text-zinc-400" />
                    <span className="text-[10px] text-zinc-400">Drag & Drop Audio (mp3, wav, m4a)</span>
                  </div>
                )}

                {(platform === "Teams" || platform === "Google Meet") && (
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-semibold text-zinc-500">Scheduled Start</label>
                    <input 
                      type="datetime-local"
                      value={scheduledStart}
                      onChange={(e) => setScheduledStart(e.target.value)}
                      className="px-3.5 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs focus:outline-none focus:border-violet-500 text-zinc-200"
                    />
                  </div>
                )}

                <button 
                  type="submit" 
                  disabled={uploading}
                  className="w-full py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Ingesting audio...
                    </>
                  ) : "Upload Recording"}
                </button>
              </form>
            </div>

            {/* AI suggestion box */}
            <div className="p-6 rounded-xl bg-zinc-900/40 border border-zinc-850 flex flex-col gap-4">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-violet-400" /> AI Suggestions
              </h3>
              <div className="flex flex-col gap-3 text-xs">
                <div className="p-3.5 rounded-lg bg-zinc-950 border border-zinc-800/80 flex flex-col gap-1.5">
                  <span className="font-semibold text-violet-300">Authentication Blocker</span>
                  <p className="text-zinc-400 leading-relaxed">
                    Vivek Sharma needs to approve database schemas before Friday to unblock the OAuth migration.
                  </p>
                </div>
                <div className="p-3.5 rounded-lg bg-zinc-950 border border-zinc-800/80 flex flex-col gap-1.5">
                  <span className="font-semibold text-violet-300">Payment Gateway Risk</span>
                  <p className="text-zinc-400 leading-relaxed">
                    Ledger consistency check was mentioned but no owner was assigned. Consider creating a Jira ticket.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
