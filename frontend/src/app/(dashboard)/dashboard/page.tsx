"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { 
  Search, Upload, AlertTriangle, ShieldAlert, TrendingUp, ChevronRight, Brain, 
  Sparkles, Loader2, Scale, ClipboardCheck, Download, ArrowRight,
  Calendar, Clock, Video, Link as LinkIcon, Sparkle, CheckCircle2, 
  Activity, XCircle, ArrowUpRight
} from "lucide-react";
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid 
} from "recharts";
import { getApiUrl } from "../../config";
import { MeetingDetail } from "@/features/meetings/types/meeting";

const getMeetingStatusInfo = (m: MeetingDetail) => {
  const now = new Date();
  const meetingDate = new Date(m.meeting_date);
  const statusNorm = (m.status || "").toUpperCase();
  const isCompleted = statusNorm === "COMPLETED";
  const isFailed = statusNorm === "FAILED" || statusNorm === "ERROR";

  // Check if media file has been uploaded
  const hasMedia = !!(m.recording_url || m.original_filename);

  // If completed or failed, return that directly
  if (isCompleted) {
    return {
      statusLabel: "Completed",
      badgeClass: "bg-teal-50 text-teal-800 border-teal-200",
      iconClass: "bg-teal-50 text-teal-700",
      showProcessing: false,
      summaryText: "insights ready",
      hasMedia
    };
  }
  if (isFailed) {
    return {
      statusLabel: "Failed",
      badgeClass: "bg-rose-50 text-rose-800 border-rose-200",
      iconClass: "bg-rose-50 text-rose-600",
      showProcessing: false,
      summaryText: m.error_message || "Processing failed — audio file corrupted",
      hasMedia
    };
  }

  // If backend status is actively processing (not UPLOADED)
  const isActivelyProcessingInBackend = ["PROCESSING", "TRANSCRIBED", "ANALYZING"].includes(statusNorm);

  if (isActivelyProcessingInBackend || (statusNorm === "UPLOADED" && hasMedia)) {
    return {
      statusLabel: "Processing",
      badgeClass: "bg-amber-50 text-amber-800 border-amber-250 animate-pulse",
      iconClass: "bg-amber-50 text-amber-600",
      showProcessing: true,
      summaryText: "Processing transcription and insights...",
      hasMedia
    };
  }

  // At this point, the meeting status in backend is UPLOADED (or similar) and hasMedia is false.
  // This means it's a scheduled meeting from calendar sync or manually entered link.
  const isFuture = meetingDate > now;
  
  if (isFuture) {
    return {
      statusLabel: "Scheduled",
      badgeClass: "bg-blue-50 text-blue-800 border-blue-200",
      iconClass: "bg-blue-50 text-blue-600",
      showProcessing: false,
      summaryText: "Meeting scheduled",
      hasMedia
    };
  } else {
    // Current time is past meeting start time, but no media uploaded yet.
    // Check if it is ongoing (within 1 hour duration or duration_seconds)
    const duration = m.duration_seconds || 3600; // default 1 hour
    const hasEnded = now.getTime() > meetingDate.getTime() + duration * 1000;

    if (hasEnded) {
      return {
        statusLabel: "Ended",
        badgeClass: "bg-slate-100 text-slate-600 border-slate-300",
        iconClass: "bg-slate-50 text-slate-500",
        showProcessing: false,
        summaryText: "Meeting ended — awaiting recording upload",
        hasMedia
      };
    } else {
      return {
        statusLabel: "Ongoing",
        badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-250 animate-pulse",
        iconClass: "bg-emerald-50 text-emerald-600",
        showProcessing: false,
        summaryText: "Ongoing meeting",
        hasMedia
      };
    }
  }
};

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-slate-200 shadow-lg rounded-xl text-xs flex flex-col gap-1">
        <p className="font-bold text-slate-800">{label}</p>
        {payload.map((p) => (
          <p key={p.name} className="font-semibold text-slate-600">
            <span className="inline-block w-2.5 h-2.5 rounded-full mr-1.5" style={{ backgroundColor: p.color }}></span>
            {p.name === "meetingsCount" ? "Meetings: " : p.name === "durationMinutes" ? "Duration: " : p.name === "decisionsCount" ? "Decisions: " : "Actions: "}
            <span className="text-slate-900 font-bold">{p.value}</span>
            {p.name === "durationMinutes" ? " mins" : ""}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

interface DashboardStats {
  productivity_score: number;
  total_decisions: number;
  pending_action_items: number;
  active_risks: number;
}

export default function Dashboard() {
  const router = useRouter();
  const [meetings, setMeetings] = useState<MeetingDetail[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [uploading, setUploading] = useState(false);
  const [meetingTitle, setMeetingTitle] = useState("");
  const [platform, setPlatform] = useState("Upload"); // "Upload", "Google Meet", "Teams"
  const [activeTab, setActiveTab] = useState("all"); // "all", "processing"
  const [ingestTab, setIngestTab] = useState<"file" | "link">("file");
  const [scheduledStart, setScheduledStart] = useState("");
  const [meetingUrl, setMeetingUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [userName, setUserName] = useState("Vivek Singh Bora");
  const [mounted, setMounted] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    productivity_score: 100,
    total_decisions: 0,
    pending_action_items: 0,
    active_risks: 0
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(getApiUrl("/api/v1/analytics/overview"), {
        credentials: "include"
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch {
      console.warn("Backend not active for analytics fetch.");
    }
  }, []);

  const eraseCookie = (name: string) => {
    if (typeof document === "undefined") return;
    document.cookie = `${name}=; max-age=0; path=/; SameSite=Lax`;
  };

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch(getApiUrl("/api/v1/auth/me"), {
        credentials: "include"
      });
      if (res.ok) {
        const profile = await res.json();
        setUserName(profile.name);
      }
    } catch {
      console.warn("Backend not active for profile fetch.");
    }
  }, []);

  const fetchMeetings = useCallback(async () => {
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
    } catch {
      console.warn("Backend not active for meetings fetch.");
    }
    setMeetings([]);
  }, [router]);

  useEffect(() => {
    setMounted(true);
    fetchMeetings();
    fetchProfile();
    fetchStats();
  }, [fetchMeetings, fetchProfile, fetchStats]);

  // Update platform value based on active ingest tab
  useEffect(() => {
    if (ingestTab === "file") {
      setPlatform("Upload");
    } else {
      setPlatform("Google Meet");
    }
  }, [ingestTab]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetingTitle) return;
    setUploading(true);

    const isLinkJoin = platform === "Teams" || platform === "Google Meet";

    try {
      let responseData: MeetingDetail | null = null;
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
        setMeetings(prev => [responseData as MeetingDetail, ...prev]);
        if (responseData.id) {
          router.push(`/meetings/${responseData.id}`);
        }
      }
    } catch {
      console.warn("Could not sync upload to backend.");
    } finally {
      setMeetingTitle("");
      setMeetingUrl("");
      setSelectedFile(null);
      setUploading(false);
    }
  };

  // Drag and Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const filteredMeetings = meetings.filter(m => {
    const matchesSearch = m.title.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    const statusInfo = getMeetingStatusInfo(m);
    
    // Hide scheduled future meetings from dashboard recent list
    if (statusInfo.statusLabel === "Scheduled") return false;

    if (activeTab === "all") return true;
    if (activeTab === "processing") return statusInfo.showProcessing;
    return true;
  });

  const displayedMeetings = filteredMeetings.slice(0, 5);

  const getMeetingSummaryText = (m: MeetingDetail) => {
    const actionsCount = m.action_items?.length || 0;
    const decisionsCount = m.decisions?.length || 0;
    return `${actionsCount} action items, ${decisionsCount} decisions logged`;
  };

  const getGreeting = () => {
    const hrs = new Date().getHours();
    if (hrs < 12) return "Good morning";
    if (hrs < 17) return "Good afternoon";
    return "Good evening";
  };

  // Generate chart data dynamically based on meetings, or fall back to simulated dataset
  const chartData = (() => {
    const today = new Date();
    const last7Days = Array.from({ length: 7 }).map((_, idx) => {
      const d = new Date();
      d.setDate(today.getDate() - (6 - idx));
      return {
        name: d.toLocaleDateString("en-US", { weekday: "short" }),
        dateObj: d,
        meetingsCount: 0,
        decisionsCount: 0,
        actionsCount: 0,
        durationMinutes: 0
      };
    });

    meetings.forEach(m => {
      const mDate = new Date(m.meeting_date);
      const matchIdx = last7Days.findIndex(day => 
        day.dateObj.getDate() === mDate.getDate() &&
        day.dateObj.getMonth() === mDate.getMonth() &&
        day.dateObj.getFullYear() === mDate.getFullYear()
      );
      if (matchIdx !== -1) {
        last7Days[matchIdx].meetingsCount += 1;
        last7Days[matchIdx].decisionsCount += (m.decisions?.length || 0);
        last7Days[matchIdx].actionsCount += (m.action_items?.length || 0);
        last7Days[matchIdx].durationMinutes += Math.round((m.duration_seconds || 1800) / 60);
      }
    });

    const hasAnyActivity = last7Days.some(d => d.meetingsCount > 0);
    if (!hasAnyActivity) {
      // Return high-fidelity fallback demo data matching the color styles
      return [
        { name: "Mon", meetingsCount: 2, decisionsCount: 4, actionsCount: 6, durationMinutes: 90 },
        { name: "Tue", meetingsCount: 1, decisionsCount: 2, actionsCount: 3, durationMinutes: 45 },
        { name: "Wed", meetingsCount: 3, decisionsCount: 7, actionsCount: 11, durationMinutes: 120 },
        { name: "Thu", meetingsCount: 1, decisionsCount: 1, actionsCount: 4, durationMinutes: 30 },
        { name: "Fri", meetingsCount: 4, decisionsCount: 9, actionsCount: 14, durationMinutes: 195 },
        { name: "Sat", meetingsCount: 0, decisionsCount: 0, actionsCount: 0, durationMinutes: 0 },
        { name: "Sun", meetingsCount: 1, decisionsCount: 3, actionsCount: 5, durationMinutes: 60 }
      ];
    }
    return last7Days;
  })();

  const formattedDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });

  return (
    <main className="p-8 flex flex-col gap-8 max-w-9xl mx-auto text-[#102C23] animate-fade-in-up">
      {/* Top Banner / Hero Greeting */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#113229] to-[#0D241E] p-8 text-white shadow-xl shadow-[#113229]/10">
        {/* Glow decorative shapes */}
        <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-[#D98A44]/15 blur-3xl"></div>
        <div className="absolute -left-20 -bottom-20 w-80 h-80 rounded-full bg-[#113229]/40 blur-3xl"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="bg-[#D98A44]/20 border border-[#D98A44]/30 text-[#e9a15f] text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full tracking-wider flex items-center gap-1">
                <Sparkle className="w-3 h-3 text-[#D98A44]" /> MeetMind Engine Active
              </span>
            </div>
            <h1 className="text-3xl font-extrabold font-outfit tracking-tight md:text-4xl mt-1">
              {getGreeting()}, <span className="text-[#e9a15f]">{userName}</span>
            </h1>
            <p className="text-slate-350 text-xs md:text-sm max-w-xl font-medium mt-1">
              MeetMind AI has synthesized your latest operations. You have <span className="text-white font-bold">{stats.pending_action_items} action items</span> pending review.
            </p>
          </div>

          <div className="flex flex-col items-end gap-1.5 bg-[#FFFFFF]/5 backdrop-blur-md border border-[#FFFFFF]/10 p-4 rounded-2xl md:min-w-[200px]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300">System Time</span>
            <span className="font-outfit text-sm font-bold text-white">{formattedDate}</span>
            <div className="flex items-center gap-1.5 mt-2 text-[10px] text-teal-400 font-bold bg-[#113229]/60 px-2.5 py-1 rounded-lg border border-teal-900/30">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse"></span>
              All services operational
            </div>
          </div>
        </div>
      </section>

      {/* Overview Stats KPI Cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Productivity Score */}
        <div className="p-6 rounded-2xl bg-white border border-[#DEDDDA]/60 flex flex-col gap-4 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 group">
          <div className="flex justify-between items-start">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110">
              <TrendingUp className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-outfit">
              Active Focus
            </span>
          </div>
          <div className="flex flex-col mt-1">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Productivity Score</span>
            <span className="text-3xl font-extrabold font-outfit text-[#102C23] mt-0.5">
              {stats.productivity_score}%
            </span>
            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
              <div 
                className="bg-emerald-600 h-full rounded-full transition-all duration-500" 
                style={{ width: `${stats.productivity_score}%` }}
              ></div>
            </div>
            <p className="text-[10px] text-slate-400 mt-2 font-medium">
              Calculated based on completed action items ratio.
            </p>
          </div>
        </div>

        {/* Important Decisions */}
        <div className="p-6 rounded-2xl bg-white border border-[#DEDDDA]/60 flex flex-col gap-4 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 group">
          <div className="flex justify-between items-start">
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110">
              <Scale className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-extrabold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full font-outfit">
              Logged
            </span>
          </div>
          <div className="flex flex-col mt-1">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Important Decisions</span>
            <span className="text-3xl font-extrabold font-outfit text-[#102C23] mt-0.5">
              {stats.total_decisions}
            </span>
            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
              <div 
                className="bg-blue-600 h-full rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(100, stats.total_decisions * 5)}%` }}
              ></div>
            </div>
            <p className="text-[10px] text-slate-400 mt-2 font-medium">
              Decisions archived across all analyzed syncs.
            </p>
          </div>
        </div>

        {/* Pending Action Items */}
        <div className="p-6 rounded-2xl bg-white border border-[#DEDDDA]/60 flex flex-col gap-4 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 group">
          <div className="flex justify-between items-start">
            <div className="w-11 h-11 rounded-xl bg-amber-50 text-[#D98A44] flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110">
              <ClipboardCheck className="w-5 h-5" />
            </div>
            {stats.pending_action_items > 0 && (
              <span className="text-[10px] font-extrabold text-[#D98A44] bg-[#D98A44]/10 px-2 py-0.5 rounded-full font-outfit animate-pulse">
                Needs Attention
              </span>
            )}
          </div>
          <div className="flex flex-col mt-1">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Pending Action Items</span>
            <span className="text-3xl font-extrabold font-outfit text-[#102C23] mt-0.5">
              {stats.pending_action_items}
            </span>
            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
              <div 
                className="bg-[#D98A44] h-full rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(100, stats.pending_action_items * 10)}%` }}
              ></div>
            </div>
            <p className="text-[10px] text-slate-400 mt-2 font-medium">
              Items assigned to team members awaiting resolution.
            </p>
          </div>
        </div>

        {/* Risks Detected */}
        <div className="p-6 rounded-2xl bg-white border border-[#DEDDDA]/60 flex flex-col gap-4 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 group">
          <div className="flex justify-between items-start">
            <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110">
              <ShieldAlert className="w-5 h-5" />
            </div>
            {stats.active_risks > 0 && (
              <span className="text-[10px] font-extrabold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full font-outfit">
                High Risk
              </span>
            )}
          </div>
          <div className="flex flex-col mt-1">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Risks Detected</span>
            <span className="text-3xl font-extrabold font-outfit text-[#102C23] mt-0.5">
              {stats.active_risks}
            </span>
            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
              <div 
                className="bg-rose-600 h-full rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(100, stats.active_risks * 20)}%` }}
              ></div>
            </div>
            <p className="text-[10px] text-slate-400 mt-2 font-medium">
              Active project anomalies detected by AI.
            </p>
          </div>
        </div>
      </section>

      {/* Main Grid Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Chart and Recent Meetings */}
        <section className="lg:col-span-8 flex flex-col gap-8">
          
          {/* Recharts Analytics Section */}
          <div className="p-6 rounded-2xl bg-white border border-[#DEDDDA]/60 shadow-sm flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Weekly Activity</span>
                <h3 className="text-md font-bold font-outfit text-[#102C23] mt-0.5">
                  Meeting Hours & Productivity Metrics
                </h3>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] bg-slate-50 border border-slate-200 rounded-lg p-1 font-bold text-slate-500">
                <span className="px-2.5 py-1 rounded-md bg-white shadow-sm text-[#113229] flex items-center gap-1">
                  <Activity className="w-3 h-3 text-[#113229]" /> Focus Metrics
                </span>
                <span className="px-2.5 py-1">Last 7 Days</span>
              </div>
            </div>

            {/* Render the chart safely only on the client */}
            <div className="h-[220px] w-full relative">
              {mounted ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorMeetings" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#113229" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#113229" stopOpacity={0.01}/>
                      </linearGradient>
                      <linearGradient id="colorDuration" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#D98A44" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#D98A44" stopOpacity={0.01}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis 
                      dataKey="name" 
                      stroke="#94A3B8" 
                      fontSize={10} 
                      fontWeight={700}
                      tickLine={false} 
                      axisLine={false} 
                    />
                    <YAxis 
                      stroke="#94A3B8" 
                      fontSize={10} 
                      fontWeight={700}
                      tickLine={false} 
                      axisLine={false} 
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area 
                      type="monotone" 
                      dataKey="durationMinutes" 
                      name="durationMinutes"
                      stroke="#D98A44" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorDuration)" 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="actionsCount" 
                      name="actionsCount"
                      stroke="#113229" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorMeetings)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin text-[#113229]" />
                </div>
              )}
            </div>

            <div className="flex justify-center items-center gap-6 border-t border-slate-100 pt-4 text-xs font-bold">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#D98A44]"></span>
                <span className="text-slate-500">Meeting Duration (Minutes)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#113229]"></span>
                <span className="text-slate-500">Action Items Logged</span>
              </div>
            </div>
          </div>

          {/* Recent Meetings Section */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div className="flex items-baseline gap-2">
                <h2 className="text-lg font-extrabold font-outfit text-[#102C23]">Recent Meeting Activity</h2>
                <span className="text-slate-400 text-xs font-semibold">({filteredMeetings.length} records)</span>
              </div>
              
              <div className="flex items-center gap-3">
                {/* Search Bar inside recent list header for sleekness */}
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Search syncs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-4 py-1.5 rounded-full bg-white border border-slate-200 text-xs focus:outline-none focus:border-[#113229] text-slate-800 shadow-sm w-44 sm:w-56 transition-all focus:w-64"
                  />
                </div>

                <div className="flex bg-slate-100/80 p-0.5 rounded-full gap-0.5 border border-slate-200">
                  <button 
                    onClick={() => setActiveTab("all")}
                    className={`text-[10px] px-3.5 py-1 rounded-full font-bold transition-colors ${
                      activeTab === "all" 
                        ? "bg-[#113229] text-white shadow-sm" 
                        : "text-slate-500 hover:text-[#102C23]"
                    }`}
                  >
                    All
                  </button>
                  <button 
                    onClick={() => setActiveTab("processing")}
                    className={`text-[10px] px-3.5 py-1 rounded-full font-bold transition-colors ${
                      activeTab === "processing" 
                        ? "bg-[#113229] text-white shadow-sm" 
                        : "text-slate-500 hover:text-[#102C23]"
                    }`}
                  >
                    Processing
                  </button>
                </div>
              </div>
            </div>

            {/* List Container */}
            <div className="flex flex-col gap-4">
              {displayedMeetings.map((meeting) => {
                const statusInfo = getMeetingStatusInfo(meeting);
                const isCompleted = statusInfo.statusLabel === "Completed";
                const isFailed = statusInfo.statusLabel === "Failed";
                const isProcessing = statusInfo.statusLabel === "Processing";
                const isOngoing = statusInfo.statusLabel === "Ongoing";
                const isScheduled = statusInfo.statusLabel === "Scheduled";
                const isEnded = statusInfo.statusLabel === "Ended";

                const isGoogleMeet = meeting.platform === "Google Meet";
                const isTeams = meeting.platform === "Teams";

                return (
                  <div 
                    key={meeting.id}
                    onClick={() => {
                      router.push(`/meetings/${meeting.id}`);
                    }}
                    className="p-5 bg-white border border-[#DEDDDA]/60 hover:border-[#113229]/40 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:shadow-md transition-all duration-300 group"
                  >
                    <div className="flex items-start gap-4 min-w-0">
                      {/* Platform / Status Circle Icon */}
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105 ${statusInfo.iconClass} border border-slate-100`}>
                        {isCompleted && <Brain className="w-5 h-5" />}
                        {isFailed && <ShieldAlert className="w-5 h-5 text-rose-600" />}
                        {isProcessing && <Loader2 className="w-5 h-5 animate-spin text-amber-600" />}
                        {isOngoing && <Video className="w-5 h-5 text-emerald-600 animate-pulse" />}
                        {isScheduled && <Calendar className="w-5 h-5 text-blue-500" />}
                        {isEnded && <Clock className="w-5 h-5 text-slate-500" />}
                      </div>
  
                      <div className="flex flex-col min-w-0 gap-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-bold text-[#102C23] text-sm md:text-[14.5px] leading-snug truncate max-w-[200px] sm:max-w-xs md:max-w-md group-hover:text-[#113229] transition-colors">
                            {meeting.title}
                          </h3>
                          
                          {/* Platform badge */}
                          <span className={`text-[9px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider border ${
                            isGoogleMeet ? "bg-red-50 text-red-700 border-red-100" :
                            isTeams ? "bg-indigo-50 text-indigo-700 border-indigo-100" :
                            "bg-[#F9F8F6] text-slate-500 border-slate-200"
                          }`}>
                            {meeting.platform}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(meeting.meeting_date).toLocaleDateString("en-US", {
                              weekday: "short", month: "short", day: "numeric"
                            })}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(meeting.meeting_date).toLocaleTimeString("en-US", {
                              hour: "2-digit", minute: "2-digit", hour12: true
                            })}
                          </span>
                          {meeting.duration_seconds && (
                            <>
                              <span>•</span>
                              <span className="bg-slate-50 px-2 py-0.5 rounded text-slate-500 font-bold border border-slate-100">
                                {Math.floor(meeting.duration_seconds / 60)} mins
                              </span>
                            </>
                          )}
                        </div>
  
                        {/* Summary details */}
                        <div className="flex items-center gap-1.5 text-xs mt-2 border-t border-slate-50 pt-2">
                          {isCompleted ? (
                            <span className="text-slate-600 flex items-center gap-2 font-medium">
                              <CheckCircle2 className="w-4 h-4 text-[#113229]" />
                              {getMeetingSummaryText(meeting)}
                            </span>
                          ) : isFailed ? (
                            <span className="text-rose-600 flex items-center gap-2 font-semibold">
                              <XCircle className="w-4 h-4 text-rose-500" />
                              {statusInfo.summaryText}
                            </span>
                          ) : isProcessing ? (
                            <span className="text-amber-700 flex items-center gap-2 font-semibold animate-pulse">
                              <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                              {statusInfo.summaryText}
                            </span>
                          ) : isOngoing ? (
                            <span className="text-emerald-700 flex items-center gap-2 font-bold animate-pulse">
                              <Video className="w-4 h-4 text-emerald-500" />
                              Ongoing meeting is currently syncing...
                            </span>
                          ) : (
                            <span className="text-slate-500 flex items-center gap-2 font-medium">
                              <Clock className="w-4 h-4 text-slate-400" />
                              {statusInfo.summaryText}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
  
                    <div className="flex items-center justify-between md:justify-end gap-4 border-t border-slate-50 pt-3 md:pt-0 md:border-0">
                      {/* Status Pill */}
                      <span className={`text-[10px] px-3 py-1 rounded-full font-bold border capitalize tracking-wide ${statusInfo.badgeClass}`}>
                        {statusInfo.statusLabel}
                      </span>
  
                      <div className="flex items-center gap-1 text-slate-350 group-hover:text-[#113229] transition-all transform group-hover:translate-x-1">
                        <span className="text-[10px] font-extrabold uppercase opacity-0 group-hover:opacity-100 transition-opacity">View Insights</span>
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                );
              })}
  
              {filteredMeetings.length === 0 && (
                <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 text-sm bg-white">
                  No meetings found matching your search query.
                </div>
              )}
            </div>

            {/* View More Meetings */}
            {filteredMeetings.length > 5 && (
              <div className="flex justify-center mt-3">
                <button 
                  onClick={() => router.push("/meetings")}
                  className="flex items-center gap-1.5 text-white bg-[#113229] hover:bg-[#0D241E] px-6 py-2 rounded-full text-xs font-bold shadow-md hover:shadow-lg transition-all"
                >
                  Explore All Meetings <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Right Column: Ingest Meeting and AI Suggestions */}
        <section className="lg:col-span-4 flex flex-col gap-8">
          
          {/* Tabbed Ingest Meeting Card */}
          <div className="p-6 rounded-2xl bg-white border border-[#DEDDDA]/60 shadow-sm flex flex-col gap-5">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sync Desk</span>
              <h3 className="font-bold text-md text-[#102C23] flex items-center gap-2">
                <Download className="w-4 h-4 text-[#113229] transform rotate-180" /> Ingest Meeting Data
              </h3>
            </div>

            {/* Tab Controllers */}
            <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-200 gap-1">
              <button
                onClick={() => setIngestTab("file")}
                className={`flex-1 text-[11px] font-bold py-2 rounded-lg transition-all ${
                  ingestTab === "file"
                    ? "bg-[#113229] text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Upload File
              </button>
              <button
                onClick={() => setIngestTab("link")}
                className={`flex-1 text-[11px] font-bold py-2 rounded-lg transition-all ${
                  ingestTab === "link"
                    ? "bg-[#113229] text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Join Live URL
              </button>
            </div>
            
            <form onSubmit={handleUpload} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Meeting Title</label>
                <input 
                  type="text" 
                  placeholder="e.g., API gateway review"
                  value={meetingTitle}
                  onChange={(e) => setMeetingTitle(e.target.value)}
                  className="px-3.5 py-2.5 rounded-xl bg-[#F9F8F6] border border-slate-200 focus:bg-white text-xs focus:outline-none focus:border-[#113229] focus:ring-1 focus:ring-[#113229] text-[#102C23] shadow-inner w-full font-medium"
                  required
                />
              </div>

              {ingestTab === "link" ? (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Sync Platform</label>
                    <select
                      value={platform}
                      onChange={(e) => setPlatform(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#F9F8F6] border border-slate-200 text-xs focus:outline-none focus:border-[#113229] text-[#102C23] cursor-pointer shadow-sm font-medium"
                    >
                      <option value="Google Meet">Google Meet Sync</option>
                      <option value="Teams">Microsoft Teams Sync</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Meeting Invite URL</label>
                    <input 
                      type="url" 
                      placeholder={platform === "Teams" ? "https://teams.microsoft.com/l/meetup-join/..." : "https://meet.google.com/abc-defg-hij"}
                      value={meetingUrl}
                      onChange={(e) => setMeetingUrl(e.target.value)}
                      className="px-3.5 py-2.5 rounded-xl bg-[#F9F8F6] border border-slate-200 focus:bg-white text-xs focus:outline-none focus:border-[#113229] focus:ring-1 focus:ring-[#113229] text-[#102C23] shadow-inner font-medium"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Scheduled Start Time</label>
                    <input 
                      type="datetime-local"
                      value={scheduledStart}
                      onChange={(e) => setScheduledStart(e.target.value)}
                      className="px-3.5 py-2.5 rounded-xl bg-[#F9F8F6] border border-slate-200 focus:bg-white text-xs focus:outline-none focus:border-[#113229] text-[#102C23] shadow-inner font-medium"
                    />
                  </div>
                </>
              ) : (
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Audio / Video File</label>
                  
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all ${
                      isDragging 
                        ? "border-[#113229] bg-[#113229]/5 ring-4 ring-[#113229]/10" 
                        : "border-slate-200 hover:border-[#113229]/50 bg-[#F9F8F6]/50 hover:bg-[#F9F8F6]"
                    }`}
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
                    
                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm text-[#113229]">
                      <Upload className={`w-5 h-5 ${isDragging ? "animate-bounce" : ""}`} />
                    </div>

                    {selectedFile ? (
                      <div className="text-center w-full max-w-xs flex flex-col gap-1">
                        <span className="text-[11px] text-[#113229] font-bold truncate max-w-full">
                          {selectedFile.name}
                        </span>
                        <span className="text-[9px] text-slate-400 font-bold">
                          ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
                        </span>
                      </div>
                    ) : (
                      <div className="text-center flex flex-col gap-1">
                        <p className="text-[11px] text-[#102C23] font-bold">Drag & drop your recording here</p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">or browse local files</p>
                        <span className="text-[9px] text-[#D98A44] font-bold bg-[#D98A44]/10 px-2 py-0.5 rounded-full mt-1.5 self-center">
                          MP3, WAV, MP4, MKV
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <button 
                type="submit" 
                disabled={uploading}
                className="w-full py-3 rounded-xl bg-[#113229] hover:bg-[#0D241E] text-white font-extrabold text-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-md hover:shadow-lg mt-2"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Ingesting Audio Stream...
                  </>
                ) : (
                  <>
                    {ingestTab === "link" ? (
                      <>
                        <LinkIcon className="w-3.5 h-3.5" /> Sync Remote Meeting Invite
                      </>
                    ) : (
                      <>
                        <Upload className="w-3.5 h-3.5" /> Transcribe & Analyze File
                      </>
                    )}
                  </>
                )}
              </button>
            </form>
          </div>

          {/* AI Suggestions Desk */}
          <div className="p-6 rounded-2xl bg-white border border-[#DEDDDA]/60 shadow-sm flex flex-col gap-5">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">AI Copilot</span>
              <h3 className="font-bold text-md text-[#102C23] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#113229]" /> Smart Recommendations
              </h3>
            </div>
            
            <div className="flex flex-col gap-4">
              {/* Suggestion 1 */}
              <div className="p-3.5 rounded-xl bg-[#F9F8F6]/85 border border-slate-150 flex gap-3 hover:border-amber-250 transition-all duration-300">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center flex-shrink-0 mt-0.5 border border-amber-100">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div className="flex flex-col gap-1 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-[#102C23] font-outfit">Authentication blocker</span>
                    <span className="bg-amber-100 text-amber-800 text-[8px] font-extrabold px-1.5 py-0.2 rounded uppercase">Urgent</span>
                  </div>
                  <p className="text-slate-500 leading-normal font-medium text-[11px]">
                    Vivek needs to approve database schemas before Friday to avoid delay on the OAuth migration.
                  </p>
                </div>
              </div>

              {/* Suggestion 2 */}
              <div className="p-3.5 rounded-xl bg-[#F9F8F6]/85 border border-slate-150 flex gap-3 hover:border-rose-200 transition-all duration-300">
                <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center flex-shrink-0 mt-0.5 border border-rose-100">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div className="flex flex-col gap-1 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-[#102C23] font-outfit">Payment gateway risk</span>
                    <span className="bg-rose-150 text-rose-800 text-[8px] font-extrabold px-1.5 py-0.2 rounded uppercase">Critical</span>
                  </div>
                  <p className="text-slate-500 leading-normal font-medium text-[11px]">
                    Ledger consistency check is unresolved. Recommend assigning a task ticket to the operations lead.
                  </p>
                </div>
              </div>
            </div>

            {/* Smart Interaction Panel */}
            <div className="bg-gradient-to-r from-[#113229] to-[#1a4136] text-white p-4 rounded-xl flex flex-col gap-2 mt-2 shadow-inner">
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-350">Quick Query Assistant</span>
              <p className="text-[10px] text-slate-200 leading-relaxed font-semibold">
                &quot;Draft follow-up tasks from the last database architecture meeting&quot;
              </p>
              <button 
                onClick={() => router.push("/ai-workspace")}
                className="w-full mt-1.5 py-1.5 rounded-lg bg-[#D98A44] hover:bg-[#c97b37] text-white font-extrabold text-[10px] transition-colors flex items-center justify-center gap-1"
              >
                Ask Copilot <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>

            {/* View All Suggestions */}
            <div className="flex justify-center mt-1 border-t border-slate-100 pt-3">
              <button 
                onClick={() => router.push("/suggestions")}
                className="flex items-center gap-1 text-[#113229] hover:text-[#0D241E] text-xs font-extrabold transition-all"
              >
                View all system suggestions <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
