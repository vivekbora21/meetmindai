"use client";

import { useState, useEffect } from "react";
import { 
  BarChart3, TrendingUp, Users, Target, Activity, Loader2, Scale, 
  ClipboardCheck, Award, AlertCircle
} from "lucide-react";
import { 
  ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, Tooltip as RechartsTooltip, CartesianGrid 
} from "recharts";
import { getApiUrl, parseUTCDate } from "../../config";

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

interface TooltipPayloadItem {
  name: string;
  value: number;
  color?: string;
}

interface TooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}

interface MeetingSimple {
  id: string;
  title: string;
  meeting_date?: string;
  duration_seconds?: number;
}

const AnalyticsTooltip = ({ active, payload, label }: TooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-slate-200 shadow-lg rounded-xl text-xs flex flex-col gap-1">
        <p className="font-bold text-slate-800">{label}</p>
        {payload.map((p) => (
          <p key={p.name} className="font-semibold text-slate-600">
            <span className="inline-block w-2.5 h-2.5 rounded-full mr-1.5" style={{ backgroundColor: p.color || "#113229" }}></span>
            Meeting Hours: <span className="text-slate-900 font-extrabold">{p.value} hrs</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  
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
  const [meetings, setMeetings] = useState<MeetingSimple[]>([]);

  // Weekly colors for charts
  const speakerColors = ["#113229", "#0D241E", "#D98A44", "#e9a15f", "#6B7280", "#DEDDDA"];
  const topicColors = ["#113229", "#0D241E", "#D98A44", "#e9a15f", "#6B7280", "#DEDDDA"];

  const calculateWeeklyVelocity = (meetingsList: MeetingSimple[]) => {
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
      const mDate = parseUTCDate(m.meeting_date);
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
    setMounted(true);
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
          const filteredTopics = topicsData.filter((t: TopicMetric) => t.topic !== "No topics discussed yet" || t.count > 0);
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
        </main>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-9xl w-full mx-auto flex flex-col min-h-full text-[#102C23] animate-fade-in-up">
      {/* Top Banner / Hero Header */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#113229] to-[#0D241E] p-8 text-white shadow-xl shadow-[#113229]/10 mb-8">
        <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-[#D98A44]/10 blur-3xl"></div>
        <div className="absolute -left-20 -bottom-20 w-80 h-80 rounded-full bg-[#113229]/40 blur-3xl"></div>

        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div className="flex flex-col gap-1.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold font-outfit tracking-tight">Organizational Analytics</h1>
            <p className="text-slate-350 text-xs sm:text-sm max-w-xl font-medium">
              Analyze organizational efficiency, conversational distributions, decision velocity, and topic trends.
            </p>
          </div>
          <span className="text-xs text-[#e9a15f] bg-[#D98A44]/15 border border-[#D98A44]/35 px-4 py-2 rounded-2xl font-bold flex items-center gap-1.5">
            <BarChart3 className="w-4 h-4" /> Operational Intelligence
          </span>
        </div>
      </section>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600" />
          <span>{error} Showing offline/cached metrics.</span>
        </div>
      )}

      {/* Main Grid */}
      <main className="max-w-9xl w-full mx-auto grid grid-cols-1 md:grid-cols-12 gap-8 flex-grow">
        
        {/* KPI Cards Grid */}
        <section className="md:col-span-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Productivity */}
          <div className="p-6 rounded-2xl bg-white border border-[#DEDDDA]/60 flex flex-col gap-4 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 group">
            <div className="flex justify-between items-start">
              <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110">
                <TrendingUp className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-outfit">
                Conversion
              </span>
            </div>
            <div className="flex flex-col mt-1">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Overall Effectiveness</span>
              <span className="text-3xl font-extrabold font-outfit text-[#102C23] mt-0.5">
                {overview.productivity_score}%
              </span>
              <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
                <div 
                  className="bg-emerald-600 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${overview.productivity_score}%` }}
                ></div>
              </div>
              <p className="text-[10px] text-slate-400 mt-2 font-medium">
                Conversion of action items from meetings.
              </p>
            </div>
          </div>

          {/* Decision Velocity */}
          <div className="p-6 rounded-2xl bg-white border border-[#DEDDDA]/60 flex flex-col gap-4 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 group">
            <div className="flex justify-between items-start">
              <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110">
                <Scale className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-extrabold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full font-outfit">
                Velocity
              </span>
            </div>
            <div className="flex flex-col mt-1">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Decision Velocity</span>
              <span className="text-3xl font-extrabold font-outfit text-[#102C23] mt-0.5">
                {decisionsPerHour}/hr
              </span>
              <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
                <div 
                  className="bg-blue-600 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${Math.min(100, parseFloat(decisionsPerHour) * 20)}%` }}
                ></div>
              </div>
              <p className="text-[10px] text-slate-400 mt-2 font-medium">
                Avg {overview.decision_velocity} decisions per meeting hour.
              </p>
            </div>
          </div>

          {/* Action Completion Rate */}
          <div className="p-6 rounded-2xl bg-white border border-[#DEDDDA]/60 flex flex-col gap-4 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 group">
            <div className="flex justify-between items-start">
              <div className="w-11 h-11 rounded-xl bg-amber-50 text-[#D98A44] flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110">
                <ClipboardCheck className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-extrabold text-[#D98A44] bg-amber-50 px-2 py-0.5 rounded-full font-outfit">
                Completion
              </span>
            </div>
            <div className="flex flex-col mt-1">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Action Completion Rate</span>
              <span className="text-3xl font-extrabold font-outfit text-[#102C23] mt-0.5">
                {actionCompletionRate}%
              </span>
              <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
                <div 
                  className="bg-[#D98A44] h-full rounded-full transition-all duration-500" 
                  style={{ width: `${actionCompletionRate}%` }}
                ></div>
              </div>
              <p className="text-[10px] text-slate-400 mt-2 font-medium">
                {overview.completed_action_items} of {totalActionItems} action items resolved.
              </p>
            </div>
          </div>

          {/* Meeting Health */}
          <div className="p-6 rounded-2xl bg-white border border-[#DEDDDA]/60 flex flex-col gap-4 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 group">
            <div className="flex justify-between items-start">
              <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110">
                <Award className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-extrabold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full font-outfit">
                Consensus
              </span>
            </div>
            <div className="flex flex-col mt-1">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Meeting Health Grade</span>
              <span className="text-3xl font-extrabold font-outfit text-[#102C23] mt-0.5">
                {healthGrade}
              </span>
              <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
                <div 
                  className="bg-rose-600 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${healthScore}%` }}
                ></div>
              </div>
              <p className="text-[10px] text-slate-400 mt-2 font-medium">
                {healthSubtext}
              </p>
            </div>
          </div>
        </section>

        {/* Speakers Distribution Card */}
        <section className="md:col-span-6 p-6 rounded-2xl bg-white border border-[#DEDDDA]/60 flex flex-col gap-5 shadow-sm">
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Conversational Share</span>
            <h3 className="text-sm font-bold text-[#102C23] flex items-center gap-1.5">
              <Users className="w-4 h-4 text-[#113229]" /> Active Speakers Distribution
            </h3>
          </div>

          <div className="flex flex-col gap-4 mt-2 flex-grow justify-center">
            {speakers.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400 min-h-[160px]">
                <Users className="w-8 h-8 text-slate-300 mb-2 animate-pulse" />
                <p className="text-xs font-semibold">No active speaker share data</p>
                <p className="text-[10px] text-slate-400 mt-1 max-w-[250px]">Transcripts with speaker tags will compile share distributions.</p>
              </div>
            ) : (
              speakers.slice(0, 5).map((spk, idx) => (
                <div key={spk.name} className="group">
                  <div className="flex justify-between text-xs text-slate-500 mb-1.5 font-semibold">
                    <span className="text-slate-800 font-bold group-hover:text-[#113229] transition-colors">{spk.name}</span>
                    <span>{spk.minutes_spoken} mins ({spk.percentage}%)</span>
                  </div>
                  <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-50">
                    <div 
                      className="h-full rounded-full transition-all duration-500 shadow-sm" 
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

        {/* Topics Distribution Card */}
        <section className="md:col-span-6 p-6 rounded-2xl bg-white border border-[#DEDDDA]/60 flex flex-col gap-5 shadow-sm">
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Semantic Analysis</span>
            <h3 className="text-sm font-bold text-[#102C23] flex items-center gap-1.5">
              <Target className="w-4 h-4 text-[#113229]" /> Topic Classification distribution
            </h3>
          </div>

          <div className="flex flex-col gap-4 mt-2 flex-grow justify-center">
            {topics.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400 min-h-[160px]">
                <Target className="w-8 h-8 text-slate-300 mb-2 animate-pulse" />
                <p className="text-xs font-semibold">No themes identified yet</p>
                <p className="text-[10px] text-slate-400 mt-1 max-w-[250px]">As transcripts process, dominant themes will map here.</p>
              </div>
            ) : (
              topics.map((t, idx) => {
                const pct = maxTopicCount > 0 ? (t.count / maxTopicCount) * 100 : 0;
                return (
                  <div key={t.topic} className="group">
                    <div className="flex justify-between text-xs text-slate-500 mb-1.5 font-semibold">
                      <span className="text-slate-805 font-bold group-hover:text-[#113229] transition-colors">{t.topic}</span>
                      <span>{t.count === 1 ? "1 mention" : `${t.count} mentions`}</span>
                    </div>
                    <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-50">
                      <div 
                        className="h-full rounded-full transition-all duration-500 shadow-sm" 
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

        {/* Meeting Velocity Recharts Card */}
        <section className="md:col-span-12 p-6 rounded-2xl bg-white border border-[#DEDDDA]/60 shadow-sm flex flex-col gap-6">
          <div className="flex justify-between items-center">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sync Frequency</span>
              <h3 className="text-md font-bold font-outfit text-[#102C23] mt-0.5 flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-[#113229]" /> Meeting Velocity (Weekly Distribution)
              </h3>
            </div>
            <span className="text-[10px] font-bold text-slate-450 bg-[#F9F8F6] border border-slate-205 px-3 py-1 rounded-lg">
              Rolling 7 Weeks
            </span>
          </div>

          <div className="h-[220px] w-full relative">
            {mounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyVelocity} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis 
                    dataKey="label" 
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
                  <RechartsTooltip content={<AnalyticsTooltip />} />
                  <Bar dataKey="hours" radius={[6, 6, 0, 0]} maxBarSize={45}>
                    {weeklyVelocity.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={index % 2 === 0 ? "#113229" : "#D98A44"} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin text-[#113229]" />
              </div>
            )}
          </div>

          <div className="flex justify-center items-center gap-6 border-t border-slate-100 pt-4 text-xs font-bold">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#113229]"></span>
              <span className="text-slate-500">Core Sync hours</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#D98A44]"></span>
              <span className="text-slate-500">Peak operations hours</span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
