"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, BarChart3, TrendingUp, Users, Target, Activity } from "lucide-react";

export default function Analytics() {
  const router = useRouter();

  return (
    <div className="bg-[#09090b] text-[#fafafa] min-h-screen flex flex-col p-8 selection:bg-violet-500 selection:text-white">
      {/* Top Header */}
      <header className="max-w-7xl w-full mx-auto flex items-center justify-between border-b border-zinc-800 pb-6 mb-8">
        <button 
          onClick={() => router.push("/dashboard")}
          className="flex items-center gap-2 text-zinc-400 hover:text-white text-sm font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>
        <span className="text-xs text-zinc-500 font-semibold flex items-center gap-1.5"><BarChart3 className="w-4 h-4 text-violet-400" /> Organizational Insights</span>
      </header>

      {/* Main Grid */}
      <main className="max-w-7xl w-full mx-auto grid grid-cols-1 md:grid-cols-12 gap-8 flex-grow">
        {/* KPI Panel */}
        <section className="md:col-span-12 grid grid-cols-1 sm:grid-cols-4 gap-6">
          <div className="p-6 rounded-xl bg-zinc-900/40 border border-zinc-800 flex flex-col gap-1">
            <span className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Overall Effectiveness</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-bold font-outfit text-white">88%</span>
              <span className="text-xs text-emerald-400"><TrendingUp className="w-3 h-3 inline mr-0.5" /> +2%</span>
            </div>
            <p className="text-[10px] text-zinc-500 mt-1">Calculated via action conversion rate</p>
          </div>

          <div className="p-6 rounded-xl bg-zinc-900/40 border border-zinc-800 flex flex-col gap-1">
            <span className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Decision Velocity</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-bold font-outfit text-white">4.2 / hr</span>
            </div>
            <p className="text-[10px] text-zinc-500 mt-1">Average decisions taken per meeting hour</p>
          </div>

          <div className="p-6 rounded-xl bg-zinc-900/40 border border-zinc-800 flex flex-col gap-1">
            <span className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Action Completion Rate</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-bold font-outfit text-white">74.5%</span>
            </div>
            <p className="text-[10px] text-zinc-500 mt-1">9 items closed this week</p>
          </div>

          <div className="p-6 rounded-xl bg-zinc-900/40 border border-zinc-800 flex flex-col gap-1">
            <span className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Meeting Health Score</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-bold font-outfit text-white">A+</span>
            </div>
            <p className="text-[10px] text-zinc-500 mt-1">Minimal conflict, high consensus</p>
          </div>
        </section>

        {/* Chart row 1 */}
        <section className="md:col-span-6 p-6 rounded-xl bg-zinc-900/40 border border-zinc-800 flex flex-col gap-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-1.5"><Users className="w-4 h-4 text-violet-400" /> Active Speakers Distribution</h3>
          
          <div className="flex flex-col gap-4 mt-2">
            <div>
              <div className="flex justify-between text-xs text-zinc-400 mb-1">
                <span>Vivek Sharma</span>
                <span>45.2 mins (45%)</span>
              </div>
              <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-violet-500 rounded-full" style={{ width: "45%" }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs text-zinc-400 mb-1">
                <span>Sarah Connor</span>
                <span>30.1 mins (30%)</span>
              </div>
              <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-violet-400 rounded-full" style={{ width: "30%" }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs text-zinc-400 mb-1">
                <span>Alex Rivera</span>
                <span>25.0 mins (25%)</span>
              </div>
              <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-violet-300 rounded-full" style={{ width: "25%" }} />
              </div>
            </div>
          </div>
        </section>

        <section className="md:col-span-6 p-6 rounded-xl bg-zinc-900/40 border border-zinc-800 flex flex-col gap-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-1.5"><Target className="w-4 h-4 text-violet-400" /> Topic Distribution</h3>
          
          <div className="flex flex-col gap-4 mt-2">
            <div>
              <div className="flex justify-between text-xs text-zinc-400 mb-1">
                <span>Authentication System</span>
                <span>8 meetings</span>
              </div>
              <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full" style={{ width: "66%" }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs text-zinc-400 mb-1">
                <span>Database Migration</span>
                <span>5 meetings</span>
              </div>
              <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-400 rounded-full" style={{ width: "41%" }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs text-zinc-400 mb-1">
                <span>Jira Integration Setup</span>
                <span>3 meetings</span>
              </div>
              <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-300 rounded-full" style={{ width: "25%" }} />
              </div>
            </div>
          </div>
        </section>

        {/* Chart row 2 */}
        <section className="md:col-span-12 p-6 rounded-xl bg-zinc-900/40 border border-zinc-800 flex flex-col gap-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-1.5"><Activity className="w-4 h-4 text-violet-400" /> Meeting Velocity (Weekly)</h3>
          
          <div className="h-48 w-full flex items-end justify-between gap-4 mt-4 pt-6 border-b border-zinc-800">
            {[4, 6, 8, 3, 5, 7, 9].map((val, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                <span className="text-[10px] text-zinc-500">{val} hrs</span>
                <div 
                  className="w-full bg-violet-600/80 hover:bg-violet-500 rounded-t transition-all cursor-pointer"
                  style={{ height: `${(val / 10) * 150}px` }} 
                />
                <span className="text-[10px] text-zinc-400 mt-1">Wk {idx + 1}</span>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
