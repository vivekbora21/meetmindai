"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Calendar as CalendarIcon, 
  RefreshCw, 
  Video, 
  ChevronRight, 
  ChevronLeft,
  X,
  ExternalLink,
  Loader2,
  CalendarCheck,
  Sparkles,
  Brain,
  CheckSquare,
  Zap,
  User,
  Plus
} from "lucide-react";
import { getApiUrl } from "../../config";

interface AttendeeObj {
  name?: string | null;
  email?: string | null;
}
type Attendee = string | AttendeeObj;

interface Integration {
  provider: string;
  email: string;
  connection_status: string;
  [key: string]: unknown;
}

interface ProcessedMeeting {
  id: string;
  title?: string | null;
  platform?: string | null;
  meeting_date?: string | null;
  duration_seconds?: number | null;
  organization_id?: string | null;
  description?: string | null;
  executive_summary?: string | null;
  organizer_email?: string | null;
  meeting_url?: string | null;
  status?: string | null;
  created_at?: string | null;
  action_items_count?: number | null;
  decisions_count?: number | null;
  attendees?: Attendee[] | null;
}

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
  executive_summary?: string | null;
  action_items_count?: number;
  decisions_count?: number;
  attendees?: Attendee[] | null;
}

const getBaseProviderKey = (provider: string) => {
  const p = provider.toLowerCase();
  if (p === "msteams" || p === "outlook" || p === "microsoft") return "microsoft";
  if (p === "googlemeet" || p === "googlecalendar" || p === "google") return "google";
  return p;
};

const getPlatformInfo = (provider: string) => {
  switch (getBaseProviderKey(provider)) {
    case "microsoft":
      return {
        name: "Microsoft",
        Icon: Video,
        bgClass: "bg-indigo-50 border border-indigo-100",
        textClass: "text-[#5b5fc7]",
        dotColor: "bg-[#5b5fc7]",
      };
    case "google":
      return {
        name: "Google",
        Icon: Video,
        bgClass: "bg-emerald-50 border border-emerald-100",
        textClass: "text-[#0f9d58]",
        dotColor: "bg-[#0f9d58]",
      };
    case "zoom":
      return {
        name: "Zoom",
        Icon: Video,
        bgClass: "bg-blue-50 border border-blue-100",
        textClass: "text-[#2d8cff]",
        dotColor: "bg-[#2d8cff]",
      };
    default:
      return {
        name: provider.charAt(0).toUpperCase() + provider.slice(1),
        Icon: Video,
        bgClass: "bg-[#F9F8F6] border border-slate-200",
        textClass: "text-slate-600",
        dotColor: "bg-[#F9F8F6]0",
      };
  }
};

const cleanEventDescription = (desc: string | null | undefined): string => {
  if (!desc) return "No description available.";
  
  // Remove HTML tags
  let clean = desc.replace(/<[^>]*>/g, "");
  
  // Remove Outlook horizontal line divider (10 or more underscores)
  clean = clean.replace(/_{10,}/g, "");
  
  // Remove online meeting join boilerplates
  const joinBoilerplateIndicators = [
    "Microsoft Teams meeting",
    "Join on your computer",
    "Google Meet",
    "Join with Google Meet",
    "Or dial:",
    "Join Zoom Meeting"
  ];
  
  for (const indicator of joinBoilerplateIndicators) {
    const idx = clean.indexOf(indicator);
    if (idx !== -1) {
      clean = clean.substring(0, idx);
    }
  }
  
  clean = clean.trim();
  return clean || "No description available.";
};

const getStatusDetails = (status: string | null | undefined) => {
  const s = (status || "Scheduled").toUpperCase();
  if (s === "COMPLETED" || s === "SUCCESS") {
    return {
      label: "Completed",
      classes: "bg-emerald-50 text-emerald-700 border-emerald-100"
    };
  }
  if (s === "FAILED" || s === "CANCELLED" || s === "DECLINED") {
    return {
      label: s === "DECLINED" ? "Declined" : s === "CANCELLED" ? "Cancelled" : "Failed",
      classes: "bg-rose-50 text-rose-700 border-rose-100"
    };
  }
  if (s === "BUSY" || s === "TENTATIVE") {
    return {
      label: s === "BUSY" ? "Busy" : "Tentative",
      classes: "bg-amber-50 text-amber-700 border-amber-100"
    };
  }
  return {
    label: s === "UPLOADED" ? "Uploaded" : s === "SCHEDULED" ? "Scheduled" : s.charAt(0) + s.slice(1).toLowerCase(),
    classes: "bg-teal-50 text-teal-700 border-teal-100"
  };
};

export default function CalendarPage() {
  const router = useRouter();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // Integration state
  const [integrations, setIntegrations] = useState<Integration[]>([]);

  // Calendar Specific States
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  // Time state for live clock/header
  const [currentDate, setCurrentDate] = useState<string>("");
  const [currentTime, setCurrentTime] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      setCurrentTime(d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }));
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const updateDate = () => {
      const d = new Date();
      setCurrentDate(d.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" }));
    };
    updateDate();
    const interval = setInterval(updateDate, 60000);
    return () => clearInterval(interval);
  }, []);

  // Map a meeting platform string to the base provider key used by integrations
  const getMeetingBaseProvider = (platform: string): string => {
    const p = (platform || "").toLowerCase();
    if (p.includes("zoom")) return "zoom";
    if (p.includes("google") || p.includes("meet")) return "google";
    if (p.includes("teams") || p.includes("microsoft") || p.includes("outlook")) return "microsoft";
    // Locally uploaded meetings don't belong to an external integration
    return "upload";
  };

  const loadAllEvents = useCallback(async (showSyncIndicator = false) => {
    if (showSyncIndicator) setSyncing(true);
    else setLoading(true);

    try {
      const ensureUTCSuffix = (isoStr: string | null | undefined): string => {
        if (!isoStr) return new Date().toISOString();
        if (!isoStr.endsWith("Z") && !isoStr.match(/[+-]\d{2}:?\d{2}$/)) {
          return isoStr + "Z";
        }
        return isoStr;
      };

      // 1. Fetch current integrations first so we know which providers are connected
      let currentIntegrations: Integration[] = [];
      try {
        const res = await fetch(getApiUrl("/api/v1/profile/integrations"), { credentials: "include" });
        if (res.ok) {
          currentIntegrations = await res.json();
          setIntegrations(currentIntegrations);
        }
      } catch {
        console.warn("Could not fetch integrations during event load.");
      }

      // Build a set of connected base provider keys (e.g. {"microsoft", "google"})
      const connectedProviderKeys = new Set<string>(
        currentIntegrations
          .filter((i: Integration) => i.connection_status === "Connected")
          .map((i: Integration) => getBaseProviderKey(i.provider))
      );

      // 2. Fetch calendar events (backend already filters by connected provider)
      let calendarEvents: CalendarEvent[] = [];
      try {
        const res = await fetch(getApiUrl("/api/calendar/events"), { credentials: "include" });
        if (res.ok) {
          const rawEvents = await res.json();
          calendarEvents = rawEvents.map((e: CalendarEvent) => ({
            ...e,
            start_time: ensureUTCSuffix(e.start_time),
            end_time: ensureUTCSuffix(e.end_time)
          }));
        }
      } catch {
        console.warn("Failed to fetch calendar events from backend.");
      }

      // 3. Fetch processed meetings
      let processedMeetings: ProcessedMeeting[] = [];
      try {
        const res = await fetch(getApiUrl("/api/v1/meetings/?include_future=true"), { credentials: "include" });
        if (res.ok) {
          processedMeetings = await res.json();
        }
      } catch {
        console.warn("Failed to fetch processed meetings from backend.");
      }

      // 4. Map processed meetings — only include those from connected platforms
      //    (or locally uploaded meetings which are platform-agnostic)
      const mappedMeetings: CalendarEvent[] = processedMeetings
      .filter((m: ProcessedMeeting) => {
        const baseProvider = getMeetingBaseProvider(m.platform || "upload");
        // Always show uploaded/local meetings; hide platform-specific ones if not connected
        if (baseProvider === "upload") return true;
        return connectedProviderKeys.has(baseProvider);
      })
      .map((m: ProcessedMeeting) => {
        const startDateStr = ensureUTCSuffix(m.meeting_date);
        const durationSec = m.duration_seconds || 1800;
        const endDateStr = new Date(new Date(startDateStr).getTime() + durationSec * 1000).toISOString();
        
        return {
          id: m.id,
          user_id: m.organization_id || "",
          provider: m.platform || "meetingmind",
          provider_event_id: m.id,
          title: m.title || "Untitled Meeting",
          description: m.description || m.executive_summary || "No description available.",
          start_time: startDateStr,
          end_time: endDateStr,
          timezone: "UTC",
          organizer_email: m.organizer_email || null,
          join_url: m.meeting_url || null,
          meeting_provider: m.platform || null,
          is_online_meeting: !!m.meeting_url,
          status: m.status || "Completed",
          created_at: m.created_at || startDateStr,
          updated_at: m.created_at || startDateStr,
          executive_summary: m.executive_summary || null,
          action_items_count: m.action_items_count || 0,
          decisions_count: m.decisions_count || 0,
          attendees: m.attendees || null
        };
      });

      // 4. Combine and de-duplicate
      const combinedMap = new Map<string, CalendarEvent>();
      calendarEvents.forEach(e => combinedMap.set(e.id, e));
      mappedMeetings.forEach(e => {
        if (!combinedMap.has(e.id)) {
          combinedMap.set(e.id, e);
        }
      });

      const allMerged = Array.from(combinedMap.values());
      allMerged.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
      setEvents(allMerged);

      // Auto-select date key
      const today = new Date();
      const todayKey = getCalendarDayKey(today.getFullYear(), today.getMonth(), today.getDate());
      
      const grouped: { [key: string]: CalendarEvent[] } = {};
      allMerged.forEach(event => {
        const d = new Date(event.start_time);
        const key = getCalendarDayKey(d.getFullYear(), d.getMonth(), d.getDate());
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(event);
      });

      if (grouped[todayKey] && grouped[todayKey].length > 0) {
        setSelectedDateKey(todayKey);
      } else {
        let bestKey = todayKey;
        let maxEventsCount = 0;
        Object.keys(grouped).forEach(key => {
          if (grouped[key].length > maxEventsCount) {
            maxEventsCount = grouped[key].length;
            bestKey = key;
          }
        });
        setSelectedDateKey(bestKey);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  }, []);

  useEffect(() => {
    loadAllEvents();
  }, [loadAllEvents]);

  const formatEventTime = (isoString: string) => {
    const d = new Date(isoString);
    // Display in local timezone - isoString already has Z suffix (UTC), so
    // toLocaleTimeString will correctly convert to the user's local time.
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
  };

  const getCalendarDayKey = (year: number, month: number, day: number) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  // Group events by date key using LOCAL date so the calendar cell matches
  // what the user sees in their timezone.
  // start_time has a Z suffix (UTC), so new Date() parses it correctly,
  // and getFullYear/Month/Date return the local-timezone day.
  const eventsByDate: { [key: string]: CalendarEvent[] } = {};
  events.forEach(event => {
    const d = new Date(event.start_time);
    const key = getCalendarDayKey(d.getFullYear(), d.getMonth(), d.getDate());
    if (!eventsByDate[key]) eventsByDate[key] = [];
    eventsByDate[key].push(event);
  });

  const getCalendarCells = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const prevMonthTotalDays = new Date(year, month, 0).getDate();

    const cells = [];

    // Prev month days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const day = prevMonthTotalDays - i;
      const prevMonth = month === 0 ? 11 : month - 1;
      const prevYear = month === 0 ? year - 1 : year;
      cells.push({
        day,
        month: prevMonth,
        year: prevYear,
        isCurrentMonth: false,
        dateKey: getCalendarDayKey(prevYear, prevMonth, day)
      });
    }

    // Current month days
    for (let i = 1; i <= totalDays; i++) {
      cells.push({
        day: i,
        month,
        year,
        isCurrentMonth: true,
        dateKey: getCalendarDayKey(year, month, i)
      });
    }

    // Next month days
    const remainingCells = 42 - cells.length;
    for (let i = 1; i <= remainingCells; i++) {
      const nextMonth = month === 11 ? 0 : month + 1;
      const nextYear = month === 11 ? year + 1 : year;
      cells.push({
        day: i,
        month: nextMonth,
        year: nextYear,
        isCurrentMonth: false,
        dateKey: getCalendarDayKey(nextYear, nextMonth, i)
      });
    }

    return cells;
  };

  const prevMonth = () => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  const goToToday = () => {
    const today = new Date();
    setCurrentMonth(today);
    setSelectedDateKey(getCalendarDayKey(today.getFullYear(), today.getMonth(), today.getDate()));
  };

  const handleDayClick = (dateKey: string) => {
    setSelectedDateKey(selectedDateKey === dateKey ? null : dateKey);
  };

  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  };

  const formatSelectedDateHeader = (dateKey: string) => {
    const parts = dateKey.split("-");
    const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
  };

  const getDurationText = (start: string, end: string) => {
    const durationMs = new Date(end).getTime() - new Date(start).getTime();
    const durationMin = Math.round(durationMs / (1000 * 60));
    if (durationMin >= 60) {
      const hours = Math.floor(durationMin / 60);
      const mins = durationMin % 60;
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    return `${durationMin}m`;
  };

  const getEventCategory = (title: string) => {
    const t = title.toLowerCase();
    if (t.includes("standup") || t.includes("sprint") || t.includes("planning") || t.includes("sync") || t.includes("retro")) {
      return { 
        name: "Team", 
        color: "purple", 
        dot: "bg-indigo-500", 
        border: "border-indigo-100", 
        text: "text-indigo-700",
        pillBg: "bg-indigo-50/80 hover:bg-indigo-100/50 border border-indigo-100/60" 
      };
    }
    if (t.includes("client") || t.includes("demo") || t.includes("customer") || t.includes("sales") || t.includes("call")) {
      return { 
        name: "Client", 
        color: "orange", 
        dot: "bg-amber-500", 
        border: "border-amber-100", 
        text: "text-amber-700",
        pillBg: "bg-amber-50/80 hover:bg-amber-100/50 border border-amber-100/60" 
      };
    }
    if (t.includes("review") || t.includes("1:1") || t.includes("feedback") || t.includes("one on one") || t.includes("manager")) {
      return { 
        name: "Review", 
        color: "blue", 
        dot: "bg-sky-500", 
        border: "border-sky-100", 
        text: "text-sky-700",
        pillBg: "bg-sky-50/80 hover:bg-sky-100/50 border border-sky-100/60" 
      };
    }
    return { 
      name: "Personal", 
      color: "green", 
      dot: "bg-emerald-500", 
      border: "border-emerald-100", 
      text: "text-emerald-700",
      pillBg: "bg-emerald-50/80 hover:bg-emerald-100/50 border border-emerald-100/60" 
    };
  };

  const getParticipantsAvatars = (event: CalendarEvent) => {
    const list: Array<{ initial: string; bg: string; name?: string }> = [];
    let extraCount = 0;
    const avatarColors = [
      "bg-[#113229] text-white",
      "bg-indigo-650 text-white",
      "bg-amber-600 text-white",
      "bg-rose-500 text-white",
      "bg-[#2d8cff] text-white"
    ];

    if (event.attendees && Array.isArray(event.attendees) && event.attendees.length > 0) {
      const displayLimit = 3;
      event.attendees.slice(0, displayLimit).forEach((att) => {
        let name = "";
        let email = "";
        if (typeof att === "string") {
          email = att;
          name = att.split("@")[0];
        } else if (att && typeof att === "object") {
          name = att.name || att.email?.split("@")[0] || "User";
          email = att.email || "";
        }

        const cleanName = name.replace(/[^a-zA-Z\s]/g, "").trim();
        const parts = cleanName.split(/\s+/);
        let initial = "";
        if (parts.length > 1 && parts[0] && parts[parts.length - 1]) {
          initial = (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        } else if (parts[0]) {
          initial = parts[0].slice(0, 2).toUpperCase();
        } else {
          initial = "U";
        }
        
        const hashInput = name + email;
        const charSum = hashInput.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const bg = avatarColors[charSum % avatarColors.length];
        list.push({ initial, bg, name });
      });

      if (event.attendees.length > displayLimit) {
        extraCount = event.attendees.length - displayLimit;
      }
    } else {
      const hash = event.title.length + event.start_time.length;
      const count = (hash % 2) + 2; 
      const startIndex = hash % avatarColors.length;
      for (let i = 0; i < count; i++) {
        list.push({
          initial: String.fromCharCode(65 + ((startIndex + i) % 26)) + String.fromCharCode(65 + ((startIndex + i + 3) % 26)),
          bg: avatarColors[(startIndex + i) % avatarColors.length]
        });
      }
      extraCount = (hash % 3);
    }
    return { list, extraCount };
  };

  const todayStr = getCalendarDayKey(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
  const todaysEvents = eventsByDate[todayStr] || [];
  const todaysEventsCount = todaysEvents.length;

  const getYesterdayDifference = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = getCalendarDayKey(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
    const yesterdayEventsCount = eventsByDate[yesterdayStr]?.length || 0;
    const diff = todaysEventsCount - yesterdayEventsCount;
    return { diff: Math.abs(diff), isGreater: diff >= 0 };
  };
  const diffInfo = getYesterdayDifference();

  const totalDurationHours = events.reduce((sum, event) => {
    const start = new Date(event.start_time).getTime();
    const end = new Date(event.end_time).getTime();
    return sum + (end - start) / (1000 * 60 * 60);
  }, 0);
  const formattedHours = totalDurationHours > 0 ? totalDurationHours.toFixed(1) : "0.0";

  const weekdayCounts: { [key: string]: number } = {};
  events.forEach(event => {
    const dayName = new Date(event.start_time).toLocaleDateString("en-US", { weekday: "long" });
    weekdayCounts[dayName] = (weekdayCounts[dayName] || 0) + 1;
  });
  let busiestDay = "None";
  let maxCount = 0;
  Object.keys(weekdayCounts).forEach(day => {
    if (weekdayCounts[day] > maxCount) {
      maxCount = weekdayCounts[day];
      busiestDay = day;
    }
  });
  const avgDurationMin = events.length > 0 
    ? Math.round(events.reduce((sum, event) => {
        const start = new Date(event.start_time).getTime();
        const end = new Date(event.end_time).getTime();
        return sum + (end - start) / (1000 * 60);
      }, 0) / events.length)
    : 0;

  const getFocusTimeWindow = (eventList: CalendarEvent[]) => {
    if (eventList.length === 0) return "10:00 AM - 12:00 PM";
    const windows = [
      { start: 9, label: "09:00 AM - 11:00 AM" },
      { start: 10, label: "10:00 AM - 12:00 PM" },
      { start: 11, label: "11:00 AM - 01:00 PM" },
      { start: 12, label: "12:00 PM - 02:00 PM" },
      { start: 13, label: "01:00 PM - 03:00 PM" },
      { start: 14, label: "02:00 PM - 04:00 PM" },
      { start: 15, label: "03:00 PM - 05:00 PM" },
    ];
    const overlapCounts = windows.map(w => {
      let count = 0;
      eventList.forEach(e => {
        const startHour = new Date(e.start_time).getHours();
        if (startHour >= w.start && startHour < w.start + 2) count++;
      });
      return { label: w.label, count };
    });
    overlapCounts.sort((a, b) => a.count - b.count);
    return overlapCounts[0].label;
  };
  const focusTimeWindow = getFocusTimeWindow(events);

  const uniqueIntegrations = Array.from(
    new Map(
      integrations
        .filter(i => i.connection_status === "Connected")
        .map(i => [`${getBaseProviderKey(i.provider)}-${i.email}`, i])
    ).values()
  );

  const renderDrawerContent = () => {
    if (!selectedDateKey) return null;
    return (
      <>
        {/* Decorative glass highlight */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/5 rounded-full blur-2xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 flex-shrink-0">
          <div>
            <h3 className="font-extrabold text-sm text-slate-900 font-outfit leading-tight">
              {formatSelectedDateHeader(selectedDateKey)}
            </h3>
            <span className="text-[9.5px] text-slate-400 font-bold uppercase tracking-wider block mt-0.5">
              {(eventsByDate[selectedDateKey] || []).length} Meetings Scheduled
            </span>
          </div>
          
          <button
            onClick={() => setSelectedDateKey(null)}
            className="p-1.5 bg-[#F9F8F6] hover:bg-slate-100 text-slate-400 hover:text-slate-800 rounded-xl transition-all border border-slate-200 active:scale-95 cursor-pointer"
            aria-label="Close details"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Inner timeline scroll wrapper */}
        <div className="flex-1 min-h-0 overflow-y-auto pr-1 scrollbar flex flex-col gap-5 pt-6 pb-6 relative">
          
          {(eventsByDate[selectedDateKey] || []).length > 0 && (
            <div className="absolute left-[54px] top-8 bottom-8 w-0.5 bg-slate-100" />
          )}

          {(eventsByDate[selectedDateKey] || []).length > 0 ? (
            (eventsByDate[selectedDateKey] || []).map((event) => {
              const hasJoinUrl = !!event.join_url;
              const duration = getDurationText(event.start_time, event.end_time);
              const category = getEventCategory(event.title);
              const avatars = getParticipantsAvatars(event);
              const isProcessed = event.provider !== "microsoft" || !!event.executive_summary;

              // Accent colored cards
              const categoryBorder = 
                category.name === "Team" ? "border-l-indigo-500 bg-indigo-50/10 hover:bg-indigo-50/20" :
                category.name === "Client" ? "border-l-amber-500 bg-amber-50/10 hover:bg-amber-50/20" :
                category.name === "Review" ? "border-l-sky-500 bg-sky-50/10 hover:bg-[#2d8cff]/5" :
                "border-l-emerald-500 bg-emerald-50/10 hover:bg-emerald-50/20";

              return (
                <div key={event.id} className="flex gap-3 relative items-start group">
                  
                  {/* Time & Duration Column */}
                  <div className="w-[42px] text-right flex-shrink-0 pt-1">
                    <span className="text-[10px] font-bold text-slate-800 block leading-tight">
                      {formatEventTime(event.start_time).replace(" ", "\n")}
                    </span>
                    <span className="text-[8px] text-slate-400 font-bold uppercase block mt-1">
                      {duration}
                    </span>
                  </div>

                  {/* Bullet Circle dot on timeline */}
                  <div className="relative z-10 flex items-center justify-center w-6 h-6 rounded-full bg-white border border-slate-200 mt-1 transition-all group-hover:scale-110 shadow-sm">
                    <span className={`w-2 h-2 rounded-full ${category.dot}`} />
                  </div>

                  {/* Meeting description card block */}
                  <div className={`flex-1 border border-slate-200/70 rounded-2xl p-3.5 transition-all flex flex-col gap-3 hover:shadow-md border-l-4 ${categoryBorder}`}>
                    
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between gap-1 flex-wrap">
                        <div className="flex items-center gap-1">
                          <span className={`text-[7.5px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider ${category.pillBg} ${category.text}`}>
                            {category.name}
                          </span>
                          {event.is_online_meeting && (
                            <span className="bg-[#F9F8F6] border border-slate-200 text-slate-500 text-[7.5px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider flex items-center gap-0.5">
                              <Video className="w-2 h-2" />
                              {event.meeting_provider || "Online"}
                            </span>
                          )}
                        </div>
                        
                        {(() => {
                          const statusDetails = getStatusDetails(event.status);
                          return (
                            <span className={`text-[7.5px] font-bold px-1.5 py-0.5 border rounded-md uppercase tracking-wider ${statusDetails.classes}`}>
                              {statusDetails.label}
                            </span>
                          );
                        })()}
                      </div>

                      <h4 
                        onClick={() => { if (isProcessed) router.push(`/meetings/${event.id}`); }}
                        className={`font-bold text-[12.5px] text-slate-900 leading-tight font-outfit mt-1.5 transition-colors ${
                          isProcessed ? "cursor-pointer hover:text-[#113229] hover:underline" : ""
                        }`}
                      >
                        {event.title}
                      </h4>

                      {event.organizer_email && (
                        <span className="text-[9px] text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                          <User className="w-2.5 h-2.5 text-slate-300" />
                          By: {event.organizer_email}
                        </span>
                      )}

                      {/* AI Executive Summary or Description */}
                      {event.executive_summary ? (
                        <div className="bg-white/95 rounded-xl p-2.5 border border-slate-200/60 mt-2 text-[10px] text-slate-650 leading-relaxed font-medium shadow-sm">
                          <div className="flex items-center gap-1 mb-1 text-teal-800 font-black text-[8px] uppercase tracking-wider">
                            <Sparkles className="w-3 h-3 text-teal-600 animate-pulse" />
                            AI Intelligence Summary
                          </div>
                          <p className="italic font-normal text-slate-600">
                            &quot;{event.executive_summary}&quot;
                          </p>
                          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                            {event.action_items_count !== undefined && event.action_items_count > 0 && (
                              <span className="bg-indigo-50 border border-indigo-100 text-indigo-700 text-[8px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5">
                                <CheckSquare className="w-2.5 h-2.5 text-indigo-500" />
                                {event.action_items_count} Action{event.action_items_count > 1 ? 's' : ''}
                              </span>
                            )}
                            {event.decisions_count !== undefined && event.decisions_count > 0 && (
                              <span className="bg-amber-50 border border-amber-100 text-amber-700 text-[8px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5">
                                <Zap className="w-2.5 h-2.5 text-amber-500" />
                                {event.decisions_count} Decision{event.decisions_count > 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <p className="text-slate-500 text-[9.5px] font-medium leading-relaxed mt-1 line-clamp-2">
                          {cleanEventDescription(event.description)}
                        </p>
                      )}
                    </div>

                    {/* Footer attendees overlapping stack + Join CTAs */}
                    <div className="flex items-center justify-between border-t border-slate-100 pt-3.5 mt-1">
                      <div className="flex -space-x-1.5 overflow-hidden">
                        {avatars.list.map((av, avIdx) => (
                          <span 
                            key={avIdx}
                            title={av.name || "Participant"}
                            className={`inline-block h-5 w-5 rounded-full ring-2 ring-white text-[8px] font-extrabold flex items-center justify-center select-none ${av.bg}`}
                          >
                            {av.initial}
                          </span>
                        ))}
                        {avatars.extraCount > 0 && (
                          <span className="inline-block h-5 w-5 rounded-full ring-2 ring-white bg-slate-100 text-[8px] font-bold flex items-center justify-center text-slate-500">
                            +{avatars.extraCount}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        {isProcessed ? (
                          <button
                            onClick={() => router.push(`/meetings/${event.id}`)}
                            className="bg-white hover:bg-[#F9F8F6] text-[#113229] px-2.5 py-1.5 rounded-xl text-[9px] font-bold border border-teal-200/50 flex items-center gap-1 active:scale-95 transition-all shadow-sm cursor-pointer"
                          >
                            <Brain className="w-3 h-3 text-[#113229]" />
                            Insights
                          </button>
                        ) : (
                          <button
                            disabled
                            className="bg-[#F9F8F6] text-slate-400 px-2.5 py-1.5 rounded-xl text-[9px] font-bold border border-slate-200 flex items-center gap-1 opacity-60 cursor-not-allowed select-none"
                            title="AI Insights are processing"
                          >
                            <Brain className="w-3 h-3 text-slate-400" />
                            Insights
                          </button>
                        )}

                        {hasJoinUrl ? (
                          <a
                            href={event.join_url!}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-[#113229] hover:bg-[#115e59] text-white px-2.5 py-1.5 rounded-xl text-[9px] font-bold flex items-center gap-1 active:scale-95 transition-all shadow-sm"
                          >
                            <ExternalLink className="w-3 h-3 text-white" />
                            Join
                          </a>
                        ) : (
                          <span className="bg-[#F9F8F6] text-slate-400 px-2.5 py-1.5 rounded-xl text-[9px] font-bold border border-slate-200 flex items-center gap-1 opacity-60 cursor-not-allowed select-none">
                            No link
                          </span>
                        )}
                      </div>
                    </div>

                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-16 px-4 text-center flex flex-col items-center justify-center gap-3">
              <div className="p-3.5 bg-[#F9F8F6] text-slate-400 rounded-full border border-slate-100">
                <CalendarCheck className="w-6 h-6 text-slate-400" />
              </div>
              <div>
                <span className="font-extrabold text-slate-800 text-xs">Clear Agenda</span>
                <p className="text-[10px] text-slate-400 max-w-[190px] leading-relaxed mt-1 font-bold mx-auto">
                  No active sync points or meetings scheduled for this date slot.
                </p>
              </div>
            </div>
          )}
        </div>
      </>
    );
  };

  return (
    <main className="relative p-6 flex flex-col gap-6 w-full h-[calc(100vh-4rem)] max-h-[calc(100vh-4rem)] overflow-hidden text-slate-800 bg-[#F9F8F6]/50">
      
      {/* Blurred decorative ambient light spots */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 right-12 h-96 w-96 rounded-full bg-teal-500/5 blur-[120px]" />
        <div className="absolute top-1/2 left-0 h-96 w-96 rounded-full bg-indigo-500/5 blur-[120px]" />
      </div>

      {/* Main Glassmorphic Top Header */}
      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-200/60 pb-5 flex-shrink-0">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white shadow-sm rounded-2xl border border-slate-200/80 text-[#113229] flex items-center justify-center">
              <CalendarIcon className="w-5.5 h-5.5" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold font-outfit text-slate-900 tracking-tight flex items-center gap-2">
                Calendar Hub
                <span className="text-[12px] font-semibold bg-[#e6f4f1] text-[#113229] px-2 py-0.5 rounded-full border border-teal-100">
                  {currentDate} - {currentTime}
                </span>
              </h1>
              <p className="text-slate-500 text-xs mt-0.5 font-medium">
                Unified schedule intelligence, smart insights, and platform sync
              </p>
            </div>
          </div>
        </div>

        {/* Sync Controls & Active Integrations */}
        <div className="flex items-center gap-3 flex-wrap justify-end">
          {uniqueIntegrations.length > 0 ? (
            uniqueIntegrations.map((integration, idx) => {
              const info = getPlatformInfo(integration.provider);
              return (
                <div key={idx} className="flex items-center gap-2.5 bg-white border border-slate-200/80 rounded-2xl p-1.5 pl-3 pr-3.5 shadow-sm transition-all hover:border-slate-300">
                  <span className={`w-2 h-2 rounded-full ${info.dotColor} animate-pulse`} />
                  <div className="flex flex-col text-left">
                    <span className="text-[10px] font-bold text-slate-800 leading-none">
                      {info.name}
                    </span>
                    <span className="text-[8.5px] text-slate-400 font-semibold mt-0.5 leading-none">
                      {integration.email}
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex items-center gap-2 bg-white border border-slate-200/80 rounded-2xl p-1.5 px-3 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
              <span className="text-[10px] font-semibold text-slate-500">No active accounts</span>
            </div>
          )}

          <button
            onClick={() => loadAllEvents(true)}
            disabled={loading || syncing}
            className="flex items-center gap-2 bg-[#113229] hover:bg-[#115e59] active:scale-95 disabled:opacity-55 text-white px-4 py-2.5 rounded-2xl text-[11px] font-bold transition-all shadow-sm hover:shadow-md cursor-pointer select-none"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
            Sync Calendar
          </button>
        </div>
      </div>

      {/* Main Grid View */}
      {loading && !syncing ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-[#113229] animate-spin" />
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Hydrating Calendar Intel...</span>
        </div>
      ) : (
        <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden relative">
          
          {/* LEFT/CENTER CALENDAR COLUMN */}
          <div className="flex-1 h-full min-w-0 flex flex-col overflow-hidden">
            
            {/* Calendar Control Board */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 flex-shrink-0 bg-white border border-slate-200/80 rounded-[22px] p-3 shadow-sm">
              <div className="flex items-center gap-3">
                {/* Chevrons */}
                <div className="flex items-center border border-slate-200/70 rounded-xl overflow-hidden bg-[#F9F8F6] shadow-inner">
                  <button
                    onClick={prevMonth}
                    className="p-2 hover:bg-white text-slate-500 hover:text-slate-800 transition-all border-r border-slate-200/70 active:scale-95"
                    aria-label="Prev month"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={nextMonth}
                    className="p-2 hover:bg-white text-slate-500 hover:text-slate-800 transition-all active:scale-95"
                    aria-label="Next month"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <button
                  onClick={goToToday}
                  className="px-3.5 py-2 bg-[#F9F8F6] hover:bg-white text-slate-700 hover:text-slate-900 border border-slate-200 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-sm"
                >
                  Today
                </button>

                {/* Date label */}
                <h2 className="text-lg font-bold font-outfit text-slate-800 tracking-tight pl-2">
                  {formatMonthYear(currentMonth)}
                </h2>
              </div>

              {/* Advanced Category Filters */}
              <div className="flex items-center gap-2 flex-wrap">
                {["All", "Team", "Client", "Review", "Personal"].map(cat => {
                  const isActive = (cat === "All" && !selectedCategory) || selectedCategory === cat;
                  return (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat === "All" ? null : cat)}
                      className={`px-3 py-1.5 rounded-xl text-[10px] font-bold border transition-all active:scale-95 ${
                        isActive 
                          ? "bg-slate-900 text-white border-slate-950 shadow-sm" 
                          : "bg-[#F9F8F6]/80 text-slate-500 border-slate-200/70 hover:bg-slate-100"
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Grid Header Days */}
            <div className="grid grid-cols-7 gap-1.5 mb-1.5 text-center flex-shrink-0">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, idx) => (
                <div key={idx} className="text-slate-400 font-bold text-[10px] uppercase tracking-widest py-1">
                  {day}
                </div>
              ))}
            </div>

            {/* The Main Dynamic Grid */}
            <div className="flex-1 min-h-0 grid grid-cols-7 grid-rows-6 gap-1.5 bg-slate-200/30 border border-slate-200/70 rounded-[28px] p-1.5 overflow-hidden shadow-inner bg-white/70">
              {getCalendarCells().map((cell, idx) => {
                const dayEvents = eventsByDate[cell.dateKey] || [];
                const filteredEvents = selectedCategory 
                  ? dayEvents.filter(e => getEventCategory(e.title).name === selectedCategory)
                  : dayEvents;
                const hasEvents = filteredEvents.length > 0;
                const isSelected = selectedDateKey === cell.dateKey;
                const isToday = cell.dateKey === todayStr;

                // Design: Dynamic warmth gradient for high meeting days
                let cellClasses = "relative rounded-[20px] p-2 flex flex-col justify-between min-h-0 h-full overflow-hidden text-left focus:outline-none transition-all duration-200 select-none border cursor-pointer ";
                
                if (isSelected) {
                  cellClasses += "bg-[#113229]/5 border-[#113229] ring-1.5 ring-[#113229] shadow-md z-10";
                } else if (isToday) {
                  cellClasses += "bg-teal-50/50 border-teal-400 shadow-md ring-2 ring-teal-400/25";
                } else if (!cell.isCurrentMonth) {
                  cellClasses += "bg-[#F9F8F6]/40 border-transparent text-slate-350 opacity-60";
                } else {
                  cellClasses += hasEvents
                    ? "bg-white border-slate-200/80 hover:bg-[#F9F8F6] hover:border-slate-300 hover:shadow-sm"
                    : "bg-white border-slate-150 hover:bg-[#F9F8F6]/50";
                }

                // Heat map intensity style
                const heatStyle = filteredEvents.length >= 3 
                  ? "border-t-3 border-t-amber-500/70"
                  : filteredEvents.length === 2
                  ? "border-t-3 border-t-[#113229]/50"
                  : "border-t-3 border-t-slate-200/20";

                return (
                  <button
                    key={idx}
                    onClick={() => handleDayClick(cell.dateKey)}
                    className={`${cellClasses} ${heatStyle}`}
                  >
                    {/* Day number & today marker */}
                    <div className="flex items-center justify-between w-full">
                      {isToday ? (
                        <span className="text-[10px] font-black leading-none bg-[#113229] text-white px-2 py-1 rounded-full shadow-sm select-none">
                          {cell.day}
                        </span>
                      ) : (
                        <span className={`text-xs font-bold leading-none ${
                          isSelected 
                            ? "text-[#113229]" 
                            : isToday 
                            ? "text-[#113229]" 
                            : cell.isCurrentMonth 
                            ? "text-slate-800" 
                            : "text-slate-400"
                        }`}>
                          {cell.day}
                        </span>
                      )}
                      {isToday && (
                        <span className="text-[8px] font-black text-teal-800 bg-teal-100/90 px-2 py-0.5 rounded-md uppercase tracking-wider select-none border border-teal-200/50">
                          Today
                        </span>
                      )}
                    </div>

                    {/* Micro event pills list inside calendar cell */}
                    {hasEvents && (
                      <div className="w-full mt-2 flex flex-col gap-1 overflow-hidden flex-1 justify-start">
                        {filteredEvents.slice(0, selectedDateKey ? 1 : 2).map((event, evIdx) => {
                          const category = getEventCategory(event.title);
                          return (
                            <div
                              key={evIdx}
                              className={`text-[9px] font-bold px-1.5 py-1 rounded-xl truncate flex items-center gap-1 transition-all ${category.pillBg} ${category.text}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${category.dot} flex-shrink-0`} />
                              <span className="truncate leading-none">{event.title}</span>
                            </div>
                          );
                        })}
                        {filteredEvents.length > (selectedDateKey ? 1 : 2) && (
                          <div className="text-[8.5px] font-extrabold text-[#113229] pl-1.5 mt-0.5 flex items-center gap-1">
                            <Plus className="w-2 h-2" /> {filteredEvents.length - (selectedDateKey ? 1 : 2)} more
                          </div>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Bottom Status bar / Legends */}
            <div className="flex items-center justify-between mt-4 bg-white border border-slate-200/80 rounded-[20px] p-3 shadow-sm text-xs text-slate-500 font-bold flex-shrink-0">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                  <span>Team Syncs</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span>Client Meetings</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
                  <span>Reviews</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span>Personal</span>
                </div>
              </div>
              <div className="flex items-center gap-1 bg-[#e6f4f1] text-[#113229] px-2.5 py-1 rounded-full border border-teal-100 text-[10px]">
                <span>{events.length} dynamic slots active</span>
              </div>
            </div>
          </div>

          {/* RIGHT SIDE DETAILS AND TIMELINE PANEL */}
          <AnimatePresence>
            {selectedDateKey && (
              <>
                {/* Desktop Side Drawer (Resizes grid smoothly with width animation) */}
                <motion.div 
                  initial={{ width: 0, opacity: 0, marginLeft: 0 }}
                  animate={{ width: 480, opacity: 1, marginLeft: 24 }}
                  exit={{ width: 0, opacity: 0, marginLeft: 0 }}
                  transition={{ type: "spring", stiffness: 280, damping: 30 }}
                  className="hidden lg:flex flex-col h-full overflow-hidden flex-shrink-0"
                >
                  <div className="w-[480px] h-full bg-white border border-slate-200 rounded-[28px] p-5 shadow-md flex flex-col overflow-hidden text-left relative">
                    {renderDrawerContent()}
                  </div>
                </motion.div>

                {/* Mobile Slide-up Overlay Drawer */}
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="lg:hidden fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex justify-end"
                  onClick={() => setSelectedDateKey(null)}
                >
                  <motion.div 
                    initial={{ x: "100%" }}
                    animate={{ x: 0 }}
                    exit={{ x: "100%" }}
                    transition={{ type: "spring", stiffness: 300, damping: 32 }}
                    className="w-full max-w-[380px] h-full bg-white p-5 shadow-2xl flex flex-col overflow-hidden text-left relative"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {renderDrawerContent()}
                  </motion.div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Stats and AI Analytics Insights Row */}
      {!loading && (
        <div className="relative z-10 flex flex-col gap-3 flex-shrink-0 text-left">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-[#e6f4f1] text-[#113229] rounded-xl border border-teal-100/50 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <h3 className="font-extrabold text-xs text-slate-800 tracking-wider uppercase">Schedule Intelligence & Health</h3>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            
            {/* Today Stats */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-3 shadow-sm hover:shadow-md transition-all">
              <span className="text-[8.5px] font-bold text-slate-400 uppercase tracking-widest block">Today&apos;s Agenda</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-xl font-bold text-slate-900 leading-none">{todaysEventsCount}</span>
                <span className="text-[9px] text-[#113229] font-bold leading-none bg-[#e6f4f1] px-1.5 py-0.5 rounded-md border border-teal-100">
                  {diffInfo.isGreater ? `+${diffInfo.diff}` : `-${diffInfo.diff}`} v. yesterday
                </span>
              </div>
            </div>

            {/* Busiest Week Day */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-3 shadow-sm hover:shadow-md transition-all">
              <span className="text-[8.5px] font-bold text-slate-400 uppercase tracking-widest block">Busiest Day</span>
              <span className="text-sm font-bold text-slate-800 block mt-1.5 truncate">{busiestDay}</span>
              <span className="text-[9px] text-slate-400 font-semibold block mt-0.5">{maxCount} load points</span>
            </div>

            {/* Total Duration slots */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-3 shadow-sm hover:shadow-md transition-all">
              <span className="text-[8.5px] font-bold text-slate-400 uppercase tracking-widest block">Total Duration</span>
              <span className="text-sm font-bold text-slate-800 block mt-1.5">{formattedHours} hours</span>
              <span className="text-[9px] text-slate-400 font-semibold block mt-0.5">30-day forecast</span>
            </div>

            {/* Avg Meeting Duration */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-3 shadow-sm hover:shadow-md transition-all">
              <span className="text-[8.5px] font-bold text-slate-400 uppercase tracking-widest block">Avg Duration</span>
              <span className="text-sm font-bold text-slate-800 block mt-1.5">{avgDurationMin} mins</span>
              <span className="text-[9px] text-slate-400 font-semibold block mt-0.5">Per meeting segment</span>
            </div>

            {/* Focus Window slot */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-3 shadow-sm hover:shadow-md transition-all col-span-1 lg:col-span-2 flex items-center justify-between">
              <div>
                <span className="text-[8.5px] font-bold text-slate-400 uppercase tracking-widest block">Focus Window</span>
                <span className="text-[11px] font-bold text-[#113229] block mt-1.5">{focusTimeWindow}</span>
                <span className="text-[9px] text-slate-400 font-semibold block mt-0.5">Maximum productivity window</span>
              </div>
              <div className="p-2 bg-[#e6f4f1]/50 border border-teal-150 rounded-xl text-[#113229] hidden md:block">
                <Brain className="w-5 h-5" />
              </div>
            </div>

          </div>
        </div>
      )}
    </main>
  );
}
