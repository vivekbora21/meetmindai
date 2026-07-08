"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Calendar as CalendarIcon, 
  RefreshCw, 
  Video, 
  User, 
  Clock, 
  MapPin, 
  ChevronRight, 
  ExternalLink,
  Loader2,
  CalendarCheck,
  AlertCircle,
  HelpCircle,
  ArrowRight
} from "lucide-react";
import { getApiUrl } from "../../config";

interface CalendarEvent {
  id: string;
  user_id: string;
  provider: string;
  provider_event_id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  timezone: string | null;
  organizer_email: string | null;
  join_url: string | null;
  meeting_provider: string | null;
  is_online_meeting: boolean;
  status: string | null;
  created_at: string;
  updated_at: string;
}

export default function CalendarPage() {
  const router = useRouter();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = async (showSyncIndicator = false) => {
    if (showSyncIndicator) setSyncing(true);
    else setLoading(true);
    
    setError(null);
    try {
      const res = await fetch(getApiUrl("/api/calendar/events"), {
        credentials: "include"
      });
      if (res.ok) {
        const data = await res.json();
        setEvents(data);
      } else {
        const errData = await res.json();
        const detail = errData.detail || "Failed to fetch calendar events.";
        setError(detail);
      }
    } catch (e) {
      console.error(e);
      setError("Unable to connect to the backend server.");
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const formatEventTime = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    });
  };

  const formatEventDate = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric"
    });
  };

  // Group events by date
  const groupedEvents: { [key: string]: CalendarEvent[] } = {};
  events.forEach(event => {
    const dateKey = new Date(event.start_time).toDateString();
    if (!groupedEvents[dateKey]) {
      groupedEvents[dateKey] = [];
    }
    groupedEvents[dateKey].push(event);
  });

  return (
    <main className="p-8 flex flex-col gap-8 max-w-7xl mx-auto text-[#0f172a] animate-in fade-in duration-300">
      {/* Header section with Sync action */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold font-outfit text-slate-900 tracking-tight flex items-center gap-3">
            <div className="p-2 bg-[#0f766e]/10 text-[#0f766e] rounded-xl">
              <CalendarIcon className="w-6 h-6" />
            </div>
            Integrated Teams Calendar
          </h1>
          <p className="text-slate-500 text-xs mt-1 font-medium">
            Syncing upcoming events for the next 30 days directly from Microsoft Graph.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchEvents(true)}
            disabled={loading || syncing}
            className="flex items-center gap-2 bg-white border border-slate-200 hover:border-[#0f766e]/40 hover:text-[#0f766e] px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin text-[#0f766e]" : ""}`} />
            {syncing ? "Syncing with Microsoft..." : "Sync Calendar"}
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-5 rounded-2xl bg-rose-50 border border-rose-100 flex items-start gap-3.5 text-rose-800">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-600" />
          <div className="flex-1 flex flex-col gap-2">
            <span className="font-bold text-sm">Connection Issue</span>
            <p className="text-xs text-rose-700 font-medium leading-relaxed">
              {error}
            </p>
            {error.includes("not connected") && (
              <button
                onClick={() => router.push("/settings")}
                className="mt-1 flex items-center gap-1 text-xs font-bold text-[#0f766e] hover:text-[#0d9488] transition-all self-start"
              >
                Go to Settings to Connect <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading && !syncing && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="w-8 h-8 text-[#0f766e] animate-spin" />
          <span className="text-xs font-bold text-slate-500">Fetching Microsoft Calendar events...</span>
        </div>
      )}

      {/* Calendar content */}
      {!loading && events.length === 0 && !error && (
        <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-3xl text-slate-400 bg-white flex flex-col items-center gap-4 max-w-lg mx-auto mt-10">
          <div className="p-4 bg-slate-50 text-slate-400 rounded-full">
            <CalendarCheck className="w-8 h-8" />
          </div>
          <div className="flex flex-col gap-1.5">
            <h3 className="font-bold text-slate-800 text-sm">No Upcoming Meetings</h3>
            <p className="text-xs text-slate-450 leading-relaxed font-medium">
              We couldn't find any scheduled events for the next 30 days on your Outlook / Teams calendar.
            </p>
          </div>
          <button
            onClick={() => fetchEvents(true)}
            className="bg-[#0f766e] hover:bg-[#0d9488] text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-md active:scale-95"
          >
            Force Sync Now
          </button>
        </div>
      )}

      {/* Events timeline list */}
      {!loading && events.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8 flex flex-col gap-8">
            {Object.keys(groupedEvents).map(dateStr => (
              <div key={dateStr} className="flex flex-col gap-4">
                {/* Sticky date header */}
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider sticky top-0 bg-slate-50 py-1 z-10">
                  {formatEventDate(groupedEvents[dateStr][0].start_time)}
                </h3>

                <div className="flex flex-col gap-4">
                  {groupedEvents[dateStr].map(event => {
                    const hasJoinUrl = !!event.join_url;
                    
                    return (
                      <div 
                        key={event.id}
                        className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-md transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm"
                      >
                        <div className="flex flex-col gap-2 min-w-0">
                          {/* Top Badges */}
                          <div className="flex flex-wrap items-center gap-2">
                            {event.is_online_meeting && (
                              <span className="bg-teal-50 text-[#0f766e] text-[9px] font-bold px-2 py-0.5 rounded-lg border border-teal-100 uppercase tracking-wider flex items-center gap-1">
                                <Video className="w-2.5 h-2.5" />
                                Online
                              </span>
                            )}
                            {event.status && (
                              <span className="bg-slate-50 text-slate-600 text-[9px] font-bold px-2 py-0.5 rounded-lg border border-slate-250 capitalize">
                                Status: {event.status}
                              </span>
                            )}
                          </div>

                          {/* Meeting Title */}
                          <h4 className="font-extrabold text-[15px] text-slate-900 leading-tight">
                            {event.title}
                          </h4>

                          {/* Description bodyPreview */}
                          {event.description && (
                            <p className="text-slate-450 text-xs font-medium leading-relaxed max-w-xl truncate">
                              {event.description}
                            </p>
                          )}

                          {/* Meta Details */}
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-slate-500 font-semibold mt-1">
                            <span className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-slate-450" />
                              {formatEventTime(event.start_time)} - {formatEventTime(event.end_time)}
                            </span>
                            {event.timezone && (
                              <span className="text-slate-400">({event.timezone})</span>
                            )}
                            {event.organizer_email && (
                              <span className="flex items-center gap-1.5 border-l border-slate-200 pl-4">
                                <User className="w-3.5 h-3.5 text-slate-450" />
                                <span className="truncate max-w-[150px]">{event.organizer_email}</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Join meeting button */}
                        {hasJoinUrl ? (
                          <a
                            href={event.join_url!}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full md:w-auto bg-[#0f766e] hover:bg-[#0d9488] text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-md hover:shadow-lg active:scale-95 flex-shrink-0"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            Join Teams Meeting
                          </a>
                        ) : (
                          <span className="text-slate-400 text-xs font-medium italic select-none pr-2">
                            No Link Available
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Right sidebar instructions */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col gap-4">
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-[#0f766e]" /> Calendar Sync Info
              </h3>
              
              <div className="flex flex-col gap-3.5 text-xs leading-relaxed text-slate-500 font-medium">
                <p>
                  Your calendar is linked with Microsoft Teams and Outlook. Upcoming online meetings are listed on this page.
                </p>
                <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl flex flex-col gap-2">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <span>Sync Status</span>
                    <span className="text-emerald-600">Active</span>
                  </div>
                  <span className="text-slate-700 font-bold">Microsoft Graph v1.0</span>
                </div>
                <p>
                  Any meeting with an online join URL has a direct integration button. Clicking it redirects you to the Microsoft Teams web or desktop client.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
