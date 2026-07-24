"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Search, Brain, ShieldAlert, Loader2, ChevronRight, Calendar, Clock, Video, Archive
} from "lucide-react";
import { parseUTCDate } from "../../config";
import Pagination from "../../components/Pagination";
import { MeetingDetail } from "@/features/meetings/types/meeting";
import { meetingService } from "@/features/meetings/services/meeting.service";
import { IngestMeetingCard } from "@/features/meetings/components/IngestMeetingCard";

const getMeetingStatusInfo = (m: MeetingDetail) => {
  const now = new Date();
  const meetingDate = parseUTCDate(m.meeting_date);
  const statusNorm = (m.status || "").toUpperCase();
  const isCompleted = statusNorm === "COMPLETED";
  const isFailed = statusNorm === "FAILED" || statusNorm === "ERROR";

  // Check if media file has been uploaded
  const hasMedia = !!(m.recording_url || m.original_filename);

  // If completed or failed, return that directly
  if (isCompleted) {
    return {
      statusLabel: "Completed",
      badgeClass: "bg-teal-50 text-teal-850 border-teal-200",
      iconClass: "bg-teal-50 text-teal-700",
      showProcessing: false,
      summaryText: "insights ready",
      hasMedia
    };
  }
  if (isFailed) {
    return {
      statusLabel: "Failed",
      badgeClass: "bg-rose-50 text-rose-850 border-rose-250",
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
      badgeClass: "bg-amber-50 text-amber-850 border-amber-250 animate-pulse",
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
      badgeClass: "bg-blue-50 text-blue-850 border-blue-250",
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
        badgeClass: "bg-slate-100 text-slate-700 border-slate-300",
        iconClass: "bg-slate-50 text-slate-500",
        showProcessing: false,
        summaryText: "Meeting ended — awaiting recording upload",
        hasMedia
      };
    } else {
      return {
        statusLabel: "Ongoing",
        badgeClass: "bg-emerald-50 text-emerald-850 border-emerald-250 animate-pulse",
        iconClass: "bg-emerald-50 text-emerald-600",
        showProcessing: false,
        summaryText: "Ongoing meeting",
        hasMedia
      };
    }
  }
};

export default function MeetingsPage() {
  const router = useRouter();
  const [meetings, setMeetings] = useState<MeetingDetail[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  useEffect(() => {
    fetchMeetings();
  }, []);

  // Reset to first page when search or tab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeTab]);

  const fetchMeetings = async () => {
    try {
      const data = await meetingService.getMeetings();
      if (data && data.length > 0) {
        setMeetings(data);
        return;
      }
    } catch {
      console.warn("Backend not active for meetings fetch.");
    }
    setMeetings([]);
  };

  const getMeetingSummaryText = (m: MeetingDetail) => {
    const actionsCount = m.action_items?.length || 0;
    const decisionsCount = m.decisions?.length || 0;
    return `${actionsCount} action items, ${decisionsCount} decisions logged`;
  };

  // Filter meetings based on search query and active tab
  const filteredMeetings = meetings.filter(m => {
    const matchesSearch = m.title.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    const statusInfo = getMeetingStatusInfo(m);
    
    // Scheduled meetings are hidden from the meetings list
    if (statusInfo.statusLabel === "Scheduled") return false;

    if (activeTab === "all") return true;
    if (activeTab === "completed") return statusInfo.statusLabel === "Completed";
    if (activeTab === "processing") return statusInfo.showProcessing;
    if (activeTab === "failed") return statusInfo.statusLabel === "Failed";
    return true;
  });

  // Calculate pagination
  const totalItems = filteredMeetings.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedMeetings = filteredMeetings.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="p-8 max-w-9xl w-full mx-auto flex flex-col min-h-full text-[#102C23] animate-fade-in-up">
      {/* Top Banner / Hero Header */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#113229] to-[#0D241E] p-8 text-white shadow-xl shadow-[#113229]/10 mb-8">
        <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-[#D98A44]/10 blur-3xl"></div>
        <div className="absolute -left-20 -bottom-20 w-80 h-80 rounded-full bg-[#113229]/40 blur-3xl"></div>

        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div className="flex flex-col gap-1.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold font-outfit tracking-tight">Meetings Archive</h1>
            <p className="text-slate-350 text-xs sm:text-sm max-w-xl font-medium">
              Browse, search, and audit your organization&apos;s recorded meeting transcripts and AI insights.
            </p>
          </div>
          <span className="text-xs text-[#e9a15f] bg-[#D98A44]/15 border border-[#D98A44]/35 px-4 py-2 rounded-2xl font-bold flex items-center gap-1.5">
            <Archive className="w-4 h-4" /> {totalItems} Meetings Total
          </span>
        </div>
      </section>

      {/* Main Grid Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Archive list */}
        <section className="lg:col-span-8 flex flex-col gap-4">
          {/* Controls Container */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search meetings by title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-16 py-2.5 rounded-xl bg-white border border-slate-200 text-sm focus:outline-none focus:border-[#113229] text-slate-800 shadow-sm"
              />
              <kbd className="text-[10px] font-semibold text-slate-400 bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 select-none absolute right-3 top-3">
                ⌘ K
              </kbd>
            </div>

            {/* Tabs / Filter Buttons */}
            <div className="flex bg-slate-100/85 p-1 rounded-full gap-0.5 border border-slate-200 self-start sm:self-auto">
              {[
                { id: "all", label: "All" },
                { id: "completed", label: "Completed" },
                { id: "processing", label: "Processing" },
                { id: "failed", label: "Failed" }
              ].map((tab) => (
                <button 
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`text-xs px-4 py-1.5 rounded-full font-bold transition-all ${
                    activeTab === tab.id 
                      ? "bg-[#113229] text-white shadow-sm" 
                      : "text-slate-500 hover:text-[#102C23]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Meetings List Feed */}
          <div className="flex flex-col gap-4 mb-6">
            {paginatedMeetings.map((meeting) => {
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
                    {/* Status Circle Icon */}
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105 border border-slate-100 ${statusInfo.iconClass}`}>
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
                          isGoogleMeet ? "bg-red-50 text-red-705 border-red-100" :
                          isTeams ? "bg-indigo-50 text-indigo-705 border-indigo-100" :
                          "bg-[#F9F8F6] text-slate-500 border-slate-200"
                        }`}>
                          {meeting.platform}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {parseUTCDate(meeting.meeting_date).toLocaleDateString("en-US", {
                            weekday: "short", month: "short", day: "numeric"
                          })}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {parseUTCDate(meeting.meeting_date).toLocaleTimeString("en-US", {
                            hour: "2-digit", minute: "2-digit", hour12: true, timeZoneName: "short"
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

                      {/* Summary Details */}
                      <div className="flex items-center gap-1.5 text-xs mt-2 border-t border-slate-50 pt-2">
                        {isCompleted ? (
                          <span className="text-slate-650 flex items-center gap-2 font-medium">
                            <span className="text-[#113229] font-extrabold text-xs">✓</span>{" "}
                            {getMeetingSummaryText(meeting)}
                          </span>
                        ) : isFailed ? (
                          <span className="text-rose-600 flex items-center gap-2 font-semibold">
                            <span className="font-extrabold text-xs">⊗</span> {statusInfo.summaryText}
                          </span>
                        ) : isProcessing ? (
                          <span className="text-amber-700 flex items-center gap-2 font-semibold animate-pulse">
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" /> {statusInfo.summaryText}
                          </span>
                        ) : isOngoing ? (
                          <span className="text-emerald-700 flex items-center gap-2 font-semibold animate-pulse">
                            <Video className="w-3.5 h-3.5 text-emerald-600" /> Ongoing meeting...
                          </span>
                        ) : (
                          <span className="text-slate-500 flex items-center gap-2 font-medium">
                            <Clock className="w-3.5 h-3.5 text-slate-450" /> {statusInfo.summaryText}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-4 border-t border-slate-50 pt-3 md:pt-0 md:border-0">
                    {/* Status Pill */}
                    <span className={`text-[10px] px-2.5 py-0.5 rounded-lg font-bold border capitalize ${statusInfo.badgeClass}`}>
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

            {paginatedMeetings.length === 0 && (
              <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 text-sm bg-white">
                No meetings archived.
              </div>
            )}
          </div>

          {/* Pagination component */}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={(page) => setCurrentPage(page)}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
          />
        </section>

        {/* Right Column: Ingest Meeting */}
        <section className="lg:col-span-4 flex flex-col gap-8">
          {/* Tabbed Ingest Meeting Card */}
          <IngestMeetingCard
            onMeetingAdded={(newMeeting) => {
              setMeetings(prev => [newMeeting, ...prev]);
            }}
          />
        </section>
      </div>
    </div>
  );
}
