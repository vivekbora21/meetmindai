"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Search, Brain, ShieldAlert, Loader2, ChevronRight, Sparkles 
} from "lucide-react";
import { getApiUrl } from "../../config";
import Pagination from "../../../components/Pagination";

export default function MeetingsPage() {
  const router = useRouter();
  const [meetings, setMeetings] = useState<any[]>([]);
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
      const res = await fetch(getApiUrl("/api/v1/meetings/"), {
        credentials: "include"
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          setMeetings(data);
          return;
        }
      }
    } catch (e) {
      console.warn("Backend not active for meetings fetch.");
    }
    setMeetings([]);
  };

  const getMeetingSummaryText = (m: any) => {
    const actionsCount = m.action_items?.length || 0;
    const decisionsCount = m.decisions?.length || 0;
    return `${actionsCount} action items, ${decisionsCount} decisions logged`;
  };

  // Filter meetings based on search query and active tab
  const filteredMeetings = meetings.filter(m => {
    const matchesSearch = m.title.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    const statusNorm = (m.status || "").toUpperCase();
    const isCompleted = statusNorm === "COMPLETED";
    const isFailed = statusNorm === "FAILED" || statusNorm === "ERROR";
    const isProcessing = !isCompleted && !isFailed;

    if (activeTab === "all") return true;
    if (activeTab === "completed") return isCompleted;
    if (activeTab === "processing") return isProcessing;
    if (activeTab === "failed") return isFailed;
    return true;
  });

  // Calculate pagination
  const totalItems = filteredMeetings.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedMeetings = filteredMeetings.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="p-8 max-w-7xl w-full mx-auto flex flex-col min-h-full text-[#0f172a]">
      {/* Page Header */}
      <header className="w-full flex items-center justify-between border-b border-slate-200 pb-6 mb-8">
        <div>
          <h1 className="text-xl font-bold font-outfit text-[#0f172a]">Meetings Archive</h1>
          <p className="text-xs text-slate-400 font-semibold mt-1">
            Browse and search all your analyzed meetings and session transcripts
          </p>
        </div>
        <span className="text-xs text-[#0f766e] font-bold flex items-center gap-1.5 bg-[#e6f4f1] px-3 py-1.5 rounded-full border border-teal-150 shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-[#0f766e]" /> {totalItems} Meetings
        </span>
      </header>

      {/* Controls Container */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search meetings by title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-slate-200 text-sm focus:outline-none focus:border-[#0f766e] text-slate-800 shadow-sm"
          />
        </div>

        {/* Tabs / Filter Buttons */}
        <div className="flex bg-slate-100/80 p-1 rounded-full gap-1 border border-slate-200 self-start md:self-auto">
          {[
            { id: "all", label: "All" },
            { id: "completed", label: "Completed" },
            { id: "processing", label: "Processing" },
            { id: "failed", label: "Failed" }
          ].map((tab) => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`text-xs px-4 py-1.5 rounded-full font-bold transition-colors ${
                activeTab === tab.id 
                  ? "bg-[#0f766e] text-white shadow-sm" 
                  : "text-slate-500 hover:text-[#0f172a]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Meetings List */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm mb-6">
        {paginatedMeetings.map((meeting, index) => {
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
                index < paginatedMeetings.length - 1 ? "border-b border-slate-100" : ""
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
                  "bg-amber-50/50 text-amber-600 border-amber-100"
                }`}>
                  {meeting.status}
                </span>

                <ChevronRight className="w-4 h-4 text-slate-300" />
              </div>
            </div>
          );
        })}

        {paginatedMeetings.length === 0 && (
          <div className="p-12 text-center text-slate-400 text-sm bg-white">
            No meetings found.
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
    </div>
  );
}
