"use client";

import { useState, useEffect } from "react";
import { BarChart3, TrendingUp, Users, Target, Activity, Loader2, ShieldAlert, Scale, ClipboardCheck } from "lucide-react";
import { getApiUrl } from "../../config";

interface OverviewStats {
  total_meetings: number;
  completed_action_items: number;
  pending_action_items: number;
  total_decisions: number;
  active_risks: number;
  productivity_score: number;
  decision_velocity: number;
}

interface SpeakerMetric {
  name: string;
  minutes_spoken: number;
  percentage: number;
}

interface TopicMetric {
  topic: string;
  count: number;
}

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [overview, setOverview] = useState<OverviewStats>({
    total_meetings: 0,
    completed_action_items: 0,
    pending_action_items: 0,
    total_decisions: 0,
    active_risks: 0,
    productivity_score: 100,
    decision_velocity: 0.0,
  });
  
  const [speakers, setSpeakers] = useState<SpeakerMetric[]>([]);
  const [topics, setTopics] = useState<TopicMetric[]>([]);
  const [weeklyVelocity, setWeeklyVelocity] = useState<{ label: string; dateRange: string; hours: number }[]>([]);
  const [meetings, setMeetings] = useState<any[]>([]);

  // Weekly colors for charts
  const speakerColors = ["#113229", "#0D241E", "#14b8a6", "#2dd4bf", "#99f6e4", "#cbd5e1"];
  const topicColors = ["#113229", "#0D241E", "#14b8a6", "#2dd4bf", "#99f6e4", "#cbd5e1"];

  const calculateWeeklyVelocity = (meetingsList: any[]) => {
    const now = new Date();
    const weeks = Array.from({ length: 7 }, (_, i) => {
      const end = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
      const start = new Date(now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000);
      
      const startStr = start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const endStr = end.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      
      return { 
        start, 
        end, 
        label: `Wk ${7 - i}`, 
        dateRange: `${startStr} - ${endStr}`,
        hours: 0 
      };
    });

    meetingsList.forEach(m => {
      if (!m.meeting_date) return;
      const mDate = new Date(m.meeting_date);
      const durationHours = (m.duration_seconds || 0) / 3600;

      for (const week of weeks) {
        if (mDate >= week.start && mDate < week.end) {
          week.hours += durationHours;
          break;
        }
      }
    });

    return weeks.reverse().map(w => ({
      label: w.label,
      dateRange: w.dateRange,
      hours: parseFloat(w.hours.toFixed(1))
    }));
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [overviewRes, speakersRes, topicsRes, meetingsRes] = await Promise.all([
          fetch(getApiUrl("/api/v1/analytics/overview"), { credentials: "include" }),
          fetch(getApiUrl("/api/v1/analytics/speakers"), { credentials: "include" }),
          fetch(getApiUrl("/api/v1/analytics/topics"), { credentials: "include" }),
          fetch(getApiUrl("/api/v1/meetings/"), { credentials: "include" })
        ]);

        if (overviewRes.ok) {
          const overviewData = await overviewRes.json();
          setOverview(overviewData);
        }

        if (speakersRes.ok) {
          const speakersData = await speakersRes.json();
          setSpeakers(speakersData);
        }

        if (topicsRes.ok) {
          const topicsData = await topicsRes.json();
          // Filter out the empty fallback topic if there are real topics
          const filteredTopics = topicsData.filter((t: any) => t.topic !== "No topics discussed yet" || t.count > 0);
          setTopics(filteredTopics);
        }

        if (meetingsRes.ok) {
          const meetingsData = await meetingsRes.json();
          setMeetings(meetingsData);
          const velocity = calculateWeeklyVelocity(meetingsData);
          setWeeklyVelocity(velocity);
        }
      } catch (err) {
        console.error("Error fetching analytics data:", err);
        setError("Failed to connect to the analytics server.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Compute stats details
  const totalActionItems = overview.completed_action_items + overview.pending_action_items;
  const actionCompletionRate = totalActionItems > 0 
    ? Math.round((overview.completed_action_items / totalActionItems) * 100) 
    : 100;

  // Decision velocity per meeting hour
  const totalMeetingDurationHours = meetings.reduce((sum, m) => sum + (m.duration_seconds || 0), 0) / 3600;
  const decisionsPerHour = totalMeetingDurationHours > 0 
    ? (overview.total_decisions / totalMeetingDurationHours).toFixed(1) 
    : "0.0";

  // Calculate meeting health score letter grade
  // A+ (no active risks), down by 10 points for each risk
  let healthScore = 100;
  if (overview.total_meetings > 0) {
    healthScore = Math.max(40, 100 - (overview.active_risks * 10));
  }
  
  let healthGrade = "N/A";
  let healthSubtext = "No meetings analyzed yet";
  
  if (overview.total_meetings > 0) {
    if (healthScore >= 95) {
      healthGrade = "A+";
      healthSubtext = "Minimal conflict, high consensus";
    } else if (healthScore >= 85) {
      healthGrade = "A";
      healthSubtext = "Healthy discussions, low risk";
    } else if (healthScore >= 75) {
      healthGrade = "B";
      healthSubtext = "Moderate conflict, some active risks";
    } else if (healthScore >= 60) {
      healthGrade = "C";
      healthSubtext = "High risk, review mitigation plans";
    } else {
      healthGrade = "D";
      healthSubtext = "Critical risks and blockers detected";
    }
  }

  // Max weekly hours for velocity scaling
  const maxWeeklyHours = Math.max(...weeklyVelocity.map(w => w.hours), 1);

  // Max topic count for progress bar scaling
  const maxTopicCount = Math.max(...topics.map(t => t.count), 1);

  if (loading) {
    return (
      <div className="p-8 max-w-9xl w-full mx-auto flex flex-col min-h-full text-[#102C23]">
        <header className="w-full flex items-center justify-between border-b border-slate-200 pb-6 mb-8">
          <div className="h-7 w-52 bg-slate-200 rounded animate-pulse" />
          <div className="h-8 w-44 bg-slate-200 rounded-full animate-pulse" />
        </header>

        <main className="max-w-9xl w-full mx-auto grid grid-cols-1 md:grid-cols-12 gap-8 flex-grow">
          {/* Stats Skeletons */}
          <section className="md:col-span-12 grid grid-cols-1 sm:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-6 rounded-2xl bg-white border border-slate-200 flex flex-col gap-3.5 shadow-sm animate-pulse">
                <div className="h-3 w-28 bg-slate-100 rounded" />
                <div className="h-8 w-16 bg-slate-200 rounded mt-1" />
                <div className="h-3 w-40 bg-slate-100 rounded mt-1" />
              </div>
            ))}
          </section>

          {/* Speakers Skeleton */}
          <section className="md:col-span-6 p-6 rounded-2xl bg-white border border-slate-200 flex flex-col gap-4 shadow-sm animate-pulse">
            <div className="h-4 w-40 bg-slate-200 rounded" />
            <div className="flex flex-col gap-5 mt-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex flex-col gap-2">
                  <div className="flex justify-between">
                    <div className="h-3 w-24 bg-slate-100 rounded" />
                    <div className="h-3 w-16 bg-slate-100 rounded" />
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full" />
                </div>
              ))}
            </div>
          </section>

          {/* Topics Skeleton */}
          <section className="md:col-span-6 p-6 rounded-2xl bg-white border border-slate-200 flex flex-col gap-4 shadow-sm animate-pulse">
            <div className="h-4 w-40 bg-slate-200 rounded" />
            <div className="flex flex-col gap-5 mt-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex flex-col gap-2">
                  <div className="flex justify-between">
                    <div className="h-3 w-28 bg-slate-100 rounded" />
                    <div className="h-3 w-12 bg-slate-100 rounded" />
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full" />
                </div>
              ))}
            </div>
          </section>

          {/* Weekly Velocity Skeleton */}
          <section className="md:col-span-12 p-6 rounded-2xl bg-white border border-slate-200 flex flex-col gap-4 shadow-sm animate-pulse">
            <div className="h-4 w-48 bg-slate-200 rounded" />
            <div className="h-48 w-full flex items-end justify-between gap-4 mt-6 pt-6 border-b border-slate-200">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full bg-slate-150 rounded-t" style={{ height: "40px" }} />
                  <div className="h-3 w-8 bg-slate-100 rounded" />
                </div>
              ))}
            </div>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-9xl w-full mx-auto flex flex-col min-h-full text-[#102C23]">
      {/* Header */}
      <header className="w-full flex items-center justify-between border-b border-slate-200 pb-6 mb-8">
        <h1 className="text-lg font-bold font-outfit text-[#102C23]">Organizational Analytics</h1>
        <span className="text-xs text-[#113229] font-bold flex items-center gap-1.5 bg-teal-50 px-3 py-1.5 rounded-full border border-teal-100 shadow-sm">
          <BarChart3 className="w-4 h-4 text-[#113229]" /> Organizational Insights
        </span>
      </header>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-600" />
          <span>{error} Showing offline/cached metrics.</span>
        </div>
      )}

      {/* Main Grid */}
      <main className="max-w-9xl w-full mx-auto grid grid-cols-1 md:grid-cols-12 gap-8 flex-grow">
        {/* Metric Cards */}
        <section className="md:col-span-12 grid grid-cols-1 sm:grid-cols-4 gap-6">
          {/* Productivity / Effectiveness */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 flex flex-col gap-1 shadow-sm hover:shadow-md transition-all group">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Overall Effectiveness</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-extrabold font-outfit text-[#102C23]">{overview.productivity_score}%</span>
              {overview.productivity_score > 80 && (
                <span className="text-xs text-emerald-600 font-bold flex items-center">
                  <TrendingUp className="w-3.5 h-3.5 mr-0.5" /> High
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-500 mt-2 font-medium">Calculated via action conversion rate</p>
          </div>

          {/* Decision Velocity */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 flex flex-col gap-1 shadow-sm hover:shadow-md transition-all group">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold flex items-center gap-1">
              Decision Velocity
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-extrabold font-outfit text-[#102C23]">{decisionsPerHour} / hr</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-2 font-medium">Avg {overview.decision_velocity} decisions per meeting</p>
          </div>

          {/* Action Completion Rate */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 flex flex-col gap-1 shadow-sm hover:shadow-md transition-all group">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Action Completion Rate</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-extrabold font-outfit text-[#102C23]">{actionCompletionRate}%</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-2 font-medium">{overview.completed_action_items} of {totalActionItems} items closed</p>
          </div>

          {/* Meeting Health */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 flex flex-col gap-1 shadow-sm hover:shadow-md transition-all group">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Meeting Health Score</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-extrabold font-outfit text-[#102C23]">{healthGrade}</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-2 font-medium">{healthSubtext}</p>
          </div>
        </section>

        {/* Speakers Distribution */}
        <section className="md:col-span-6 p-6 rounded-2xl bg-white border border-slate-200 flex flex-col gap-4 shadow-sm">
          <h3 className="text-sm font-bold text-[#102C23] flex items-center gap-1.5">
            <Users className="w-4 h-4 text-[#113229]" /> Active Speakers Distribution
          </h3>

          <div className="flex flex-col gap-4 mt-2 flex-grow justify-center">
            {speakers.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400 min-h-[160px]">
                <Users className="w-8 h-8 text-slate-300 mb-2" />
                <p className="text-xs font-semibold">No speaker data available</p>
                <p className="text-[10px] text-slate-400 mt-1">Transcripts with diarization will populate speaker metrics.</p>
              </div>
            ) : (
              speakers.slice(0, 5).map((spk, idx) => (
                <div key={spk.name}>
                  <div className="flex justify-between text-xs text-slate-500 mb-1 font-medium">
                    <span className="text-slate-700 font-bold">{spk.name}</span>
                    <span>{spk.minutes_spoken} mins ({spk.percentage}%)</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-500" 
                      style={{ 
                        width: `${spk.percentage}%`, 
                        backgroundColor: speakerColors[idx % speakerColors.length] 
                      }} 
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Topics Distribution */}
        <section className="md:col-span-6 p-6 rounded-2xl bg-white border border-slate-200 flex flex-col gap-4 shadow-sm">
          <h3 className="text-sm font-bold text-[#102C23] flex items-center gap-1.5">
            <Target className="w-4 h-4 text-[#113229]" /> Topic Distribution
          </h3>

          <div className="flex flex-col gap-4 mt-2 flex-grow justify-center">
            {topics.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400 min-h-[160px]">
                <Target className="w-8 h-8 text-slate-300 mb-2" />
                <p className="text-xs font-semibold">No topics identified</p>
                <p className="text-[10px] text-slate-400 mt-1">Once meetings are analyzed, top themes will appear here.</p>
              </div>
            ) : (
              topics.map((t, idx) => {
                const pct = maxTopicCount > 0 ? (t.count / maxTopicCount) * 100 : 0;
                return (
                  <div key={t.topic}>
                    <div className="flex justify-between text-xs text-slate-500 mb-1 font-medium">
                      <span className="text-slate-700 font-bold">{t.topic}</span>
                      <span>{t.count === 1 ? "1 mention" : `${t.count} mentions`}</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500" 
                        style={{ 
                          width: `${pct}%`, 
                          backgroundColor: topicColors[idx % topicColors.length] 
                        }} 
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Meeting Velocity */}
        <section className="md:col-span-12 p-6 rounded-2xl bg-white border border-slate-200 flex flex-col gap-4 shadow-sm">
          <h3 className="text-sm font-bold text-[#102C23] flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-[#113229]" /> Meeting Velocity (Weekly)
          </h3>

          <div className="h-48 w-full flex items-end justify-between gap-4 mt-4 pt-6 border-b border-slate-200">
            {weeklyVelocity.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs font-medium">
                No meeting hours logged in the last 7 weeks.
              </div>
            ) : (
              weeklyVelocity.map((val, idx) => {
                const heightPct = maxWeeklyHours > 0 ? (val.hours / maxWeeklyHours) * 140 : 4;
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-2 group relative" title={val.dateRange}>
                    {/* Tooltip with Date Range */}
                    <div className="absolute bottom-full mb-2 bg-slate-800 text-white text-[9px] px-2 py-1 rounded shadow opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                      {val.dateRange}
                    </div>
                    
                    <span className="text-[10px] text-slate-500 font-bold">{val.hours} hrs</span>
                    <div
                      className="w-full rounded-t transition-all duration-300 cursor-pointer hover:opacity-85"
                      style={{ 
                        height: `${heightPct}px`, 
                        background: "linear-gradient(180deg, #0D241E 0%, #113229 100%)" 
                      }}
                    />
                    <span className="text-[10px] text-slate-400 font-bold mt-1">{val.label}</span>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
