"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
  Search, Upload, Plus, Calendar, CheckSquare, 
  AlertTriangle, ShieldAlert, Award, TrendingUp, ChevronRight,
  Sparkles, FileText, BarChart3, Network, Loader2
} from "lucide-react";
import { getApiUrl } from "../../config";

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
  const [meetingUrl, setMeetingUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchMeetings();
  }, []);

  const eraseCookie = (name: string) => {
    if (typeof document === "undefined") return;
    document.cookie = `${name}=; max-age=0; path=/; SameSite=Lax`;
  };

  const fetchMeetings = async () => {
    try {
      const res = await fetch(getApiUrl("/api/v1/meetings/"), {
        credentials: "include"
      });
      if (res.ok) {
        const data = await res.json();
        setMeetings(data);
        return;
      } else if (res.status === 401) {
        eraseCookie("isAuthenticated");
        router.push("/");
      }
    } catch (e) {
      console.warn("Backend not active.");
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

  const filteredMeetings = meetings.filter(m => 
    m.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <main className="p-8 flex flex-col gap-8 max-w-7xl mx-auto">
      {/* Top bar */}
      <div className="flex justify-between items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-[#8c8377]" />
          <input 
            type="text" 
            placeholder="Search meetings, decisions, or action items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-white/80 border border-[#d8cfc2] text-sm focus:outline-none focus:border-[#2f7c8f] text-[#18161f] shadow-sm"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#2f7c8f]/10 border border-[#2f7c8f]/20 text-[#205866] text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" /> AI Ready
          </div>
        </div>
      </div>

      {/* Overview Stats Cards */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="p-6 rounded-[24px] soft-card flex flex-col gap-1">
          <span className="text-xs text-[#6d6473] uppercase tracking-wider font-semibold">Productivity Score</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-bold font-outfit text-[#18161f]">92</span>
            <span className="text-xs text-emerald-700 flex items-center"><TrendingUp className="w-3 h-3 mr-0.5" /> +4.2%</span>
          </div>
          <p className="text-[10px] text-[#6d6473] mt-2">Action item completion velocity is strong</p>
        </div>

        <div className="p-6 rounded-[24px] soft-card flex flex-col gap-1">
          <span className="text-xs text-[#6d6473] uppercase tracking-wider font-semibold">Important Decisions</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-bold font-outfit text-[#18161f]">14</span>
          </div>
          <p className="text-[10px] text-[#6d6473] mt-2">Logged in the current sprint lifecycle</p>
        </div>

        <div className="p-6 rounded-[24px] soft-card flex flex-col gap-1">
          <span className="text-xs text-[#6d6473] uppercase tracking-wider font-semibold">Pending Action Items</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-bold font-outfit text-[#18161f]">5</span>
            <span className="text-xs text-[#205866]">Assigned to you</span>
          </div>
          <p className="text-[10px] text-[#6d6473] mt-2">2 approaching deadline</p>
        </div>

        <div className="p-6 rounded-[24px] soft-card flex flex-col gap-1">
          <span className="text-xs text-[#6d6473] uppercase tracking-wider font-semibold">Risks Detected</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-bold font-outfit text-[#18161f]">3</span>
            <span className="text-xs text-amber-600 flex items-center"><ShieldAlert className="w-3.5 h-3.5 ml-1" /></span>
          </div>
          <p className="text-[10px] text-[#6d6473] mt-2">1 blocker requires attention</p>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left panel: meetings table */}
        <section className="lg:col-span-8 flex flex-col gap-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold font-outfit text-[#18161f]">Recent Meetings</h2>
            <div className="flex gap-2">
              <button 
                onClick={() => setActiveTab("all")}
                className={`text-xs px-3 py-1.5 rounded-full transition-colors ${activeTab === "all" ? "bg-[#205866] text-white" : "text-[#6d6473] hover:text-[#18161f]"}`}
              >
                All
              </button>
              <button 
                onClick={() => setActiveTab("processing")}
                className={`text-xs px-3 py-1.5 rounded-full transition-colors ${activeTab === "processing" ? "bg-[#205866] text-white" : "text-[#6d6473] hover:text-[#18161f]"}`}
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
                  router.push(`/meetings/${meeting.id}`);
                }}
                className="p-5 rounded-[24px] soft-card hover:border-[#2f7c8f]/40 cursor-pointer transition-all flex flex-col gap-3 group relative overflow-hidden"
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="flex flex-col gap-1">
                    <h3 className="font-bold text-[#18161f] group-hover:text-[#205866] transition-colors">
                      {meeting.title}
                    </h3>
                    <span className="text-xs text-[#6d6473]">
                      {new Date(meeting.meeting_date).toLocaleDateString("en-US", {
                        weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
                      })}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white border border-[#d8cfc2] text-[#6d6473] font-semibold">
                      {meeting.platform || "Upload"}
                    </span>
                    {meeting.status === "Processing" && (
                      <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 font-semibold animate-pulse">
                        Monitor Live
                      </span>
                    )}
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                      meeting.status === "Completed" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : 
                      meeting.status === "Processing" ? "bg-[#2f7c8f]/10 text-[#205866] border border-[#2f7c8f]/20" : 
                      "bg-red-50 text-red-700 border border-red-200"
                    }`}>
                      {meeting.status}
                    </span>
                    <ChevronRight className="w-4 h-4 text-[#8c8377] group-hover:text-[#205866] transition-colors" />
                  </div>
                </div>

                <p className="text-xs text-[#5f5767] line-clamp-2">
                  {meeting.executive_summary}
                </p>
                {meeting.meeting_url && (
                  <p className="text-[10px] text-[#6d6473] truncate">
                    Link: {meeting.meeting_url}
                  </p>
                )}
              </div>
            ))}

            {filteredMeetings.length === 0 && (
              <div className="p-12 text-center border border-dashed border-[#d8cfc2] rounded-[24px] text-[#6d6473] text-sm bg-white/60">
                No meetings found matching your search.
              </div>
            )}
          </div>
        </section>

        {/* Right panel: Upload meeting & AI suggestions */}
        <section className="lg:col-span-4 flex flex-col gap-8">
          {/* Upload meeting box */}
          <div className="p-6 rounded-[24px] soft-card flex flex-col gap-4">
            <h3 className="font-bold text-sm text-[#18161f] flex items-center gap-2">
              <Upload className="w-4 h-4 text-[#205866]" /> Ingest Meeting
            </h3>
            <form onSubmit={handleUpload} className="flex flex-col gap-3">
              <input 
                type="text" 
                placeholder="Meeting Title (e.g. API Gateway Sync)"
                value={meetingTitle}
                onChange={(e) => setMeetingTitle(e.target.value)}
                className="px-3.5 py-2 rounded-xl bg-white border border-[#d8cfc2] text-xs focus:outline-none focus:border-[#2f7c8f] text-[#18161f]"
                required
              />

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-[#6d6473]">Meeting Platform</label>
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-[#d8cfc2] text-xs focus:outline-none focus:border-[#2f7c8f] text-[#18161f] cursor-pointer"
                >
                  <option value="Upload">Upload File (Audio / Video)</option>
                  <option value="Google Meet">Google Meet Sync</option>
                  <option value="Teams">Microsoft Teams Sync</option>
                  <option value="Jira">Jira Attachment</option>
                </select>
              </div>
              
              {(platform === "Teams" || platform === "Google Meet") ? (
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold text-[#6d6473]">Meeting Invite URL</label>
                  <input 
                    type="url" 
                    placeholder={platform === "Teams" ? "e.g., https://teams.microsoft.com/l/meetup-join/..." : "e.g., https://meet.google.com/abc-defg-hij"}
                    value={meetingUrl}
                    onChange={(e) => setMeetingUrl(e.target.value)}
                    className="px-3.5 py-2 rounded-xl bg-white border border-[#d8cfc2] text-xs focus:outline-none focus:border-[#2f7c8f] text-[#18161f]"
                    required
                  />
                </div>
              ) : (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border border-dashed border-[#d8cfc2] hover:border-[#2f7c8f]/50 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors bg-white/60"
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
                  <Plus className="w-5 h-5 text-[#8c8377]" />
                  {selectedFile ? (
                    <span className="text-[10px] text-[#205866] font-medium truncate max-w-full">
                      Selected: {selectedFile.name}
                    </span>
                  ) : (
                    <span className="text-[10px] text-[#6d6473]">Drag & Drop Audio / Video (mp3, wav, mp4, mkv, etc.)</span>
                  )}
                </div>
              )}

              {(platform === "Teams" || platform === "Google Meet") && (
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold text-[#6d6473]">Scheduled Start</label>
                  <input 
                    type="datetime-local"
                    value={scheduledStart}
                    onChange={(e) => setScheduledStart(e.target.value)}
                    className="px-3.5 py-2 rounded-xl bg-white border border-[#d8cfc2] text-xs focus:outline-none focus:border-[#2f7c8f] text-[#18161f]"
                  />
                </div>
              )}

              <button 
                type="submit" 
                disabled={uploading}
                className="w-full py-2 rounded-xl bg-[#205866] hover:bg-[#2f7c8f] text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
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
          <div className="p-6 rounded-[24px] soft-card flex flex-col gap-4">
            <h3 className="font-bold text-sm text-[#18161f] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#205866]" /> AI Suggestions
            </h3>
            <div className="flex flex-col gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-white border border-[#d8cfc2] flex flex-col gap-1.5">
                <span className="font-semibold text-[#205866]">Authentication Blocker</span>
                <p className="text-[#5f5767] leading-relaxed">
                  Vivek Sharma needs to approve database schemas before Friday to unblock the OAuth migration.
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-white border border-[#d8cfc2] flex flex-col gap-1.5">
                <span className="font-semibold text-[#205866]">Payment Gateway Risk</span>
                <p className="text-[#5f5767] leading-relaxed">
                  Ledger consistency check was mentioned but no owner was assigned. Consider creating a Jira ticket.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
