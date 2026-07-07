"use client";

import { BarChart3, TrendingUp, Users, Target, Activity } from "lucide-react";

export default function Analytics() {
  return (
    <div className="p-8 max-w-7xl w-full mx-auto flex flex-col min-h-full text-[#0f172a]">
      <header className="w-full flex items-center justify-between border-b border-slate-200 pb-6 mb-8">
        <h1 className="text-lg font-bold font-outfit text-[#0f172a]">Organizational Analytics</h1>
        <span className="text-xs text-[#0f766e] font-bold flex items-center gap-1.5 bg-teal-50 px-3 py-1.5 rounded-full border border-teal-100 shadow-sm">
          <BarChart3 className="w-4 h-4 text-[#0f766e]" /> Organizational Insights
        </span>
      </header>

      <main className="max-w-7xl w-full mx-auto grid grid-cols-1 md:grid-cols-12 gap-8 flex-grow">
        <section className="md:col-span-12 grid grid-cols-1 sm:grid-cols-4 gap-6">
          <div className="p-6 rounded-2xl bg-white border border-slate-200 flex flex-col gap-1 shadow-sm">
            <span className="text-xs text-slate-400 uppercase tracking-wider font-bold">Overall Effectiveness</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-bold font-outfit text-[#0f172a]">88%</span>
              <span className="text-xs text-emerald-600 font-semibold"><TrendingUp className="w-3.5 h-3.5 inline mr-0.5" /> +2%</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">Calculated via action conversion rate</p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200 flex flex-col gap-1 shadow-sm">
            <span className="text-xs text-slate-400 uppercase tracking-wider font-bold">Decision Velocity</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-bold font-outfit text-[#0f172a]">4.2 / hr</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">Average decisions taken per meeting hour</p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200 flex flex-col gap-1 shadow-sm">
            <span className="text-xs text-slate-400 uppercase tracking-wider font-bold">Action Completion Rate</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-bold font-outfit text-[#0f172a]">74.5%</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">9 items closed this week</p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200 flex flex-col gap-1 shadow-sm">
            <span className="text-xs text-slate-400 uppercase tracking-wider font-bold">Meeting Health Score</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-bold font-outfit text-[#0f172a]">A+</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">Minimal conflict, high consensus</p>
          </div>
        </section>

        <section className="md:col-span-6 p-6 rounded-2xl bg-white border border-slate-200 flex flex-col gap-4 shadow-sm">
          <h3 className="text-sm font-bold text-[#0f172a] flex items-center gap-1.5">
            <Users className="w-4 h-4 text-[#0f766e]" /> Active Speakers Distribution
          </h3>

          <div className="flex flex-col gap-4 mt-2">
            {[
              ["Vivek Singh Bora", "45.2 mins (45%)", 45, "#0f766e"],
              ["Sarah Connor", "30.1 mins (30%)", 30, "#0d9488"],
              ["Alex Rivera", "25.0 mins (25%)", 25, "#14b8a6"],
            ].map(([name, value, pct, color]) => (
              <div key={name as string}>
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                  <span>{name}</span>
                  <span>{value}</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color as string }} />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="md:col-span-6 p-6 rounded-2xl bg-white border border-slate-200 flex flex-col gap-4 shadow-sm">
          <h3 className="text-sm font-bold text-[#0f172a] flex items-center gap-1.5">
            <Target className="w-4 h-4 text-[#0f766e]" /> Topic Distribution
          </h3>

          <div className="flex flex-col gap-4 mt-2">
            {[
              ["Authentication System", "8 meetings", 66, "#0f766e"],
              ["Database Migration", "5 meetings", 41, "#0d9488"],
              ["Jira Integration Setup", "3 meetings", 25, "#14b8a6"],
            ].map(([topic, value, pct, color]) => (
              <div key={topic as string}>
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                  <span>{topic}</span>
                  <span>{value}</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color as string }} />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="md:col-span-12 p-6 rounded-2xl bg-white border border-slate-200 flex flex-col gap-4 shadow-sm">
          <h3 className="text-sm font-bold text-[#0f172a] flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-[#0f766e]" /> Meeting Velocity (Weekly)
          </h3>

          <div className="h-48 w-full flex items-end justify-between gap-4 mt-4 pt-6 border-b border-slate-200">
            {[4, 6, 8, 3, 5, 7, 9].map((val, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                <span className="text-[10px] text-slate-400">{val} hrs</span>
                <div
                  className="w-full rounded-t transition-all cursor-pointer hover:opacity-90"
                  style={{ height: `${(val / 10) * 150}px`, background: "linear-gradient(180deg, #0d9488 0%, #0f766e 100%)" }}
                />
                <span className="text-[10px] text-slate-400 mt-1">Wk {idx + 1}</span>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
