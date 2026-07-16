import React from "react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

interface ChartDataItem {
  name: string;
  meetingsCount: number;
  decisionsCount: number;
  actionsCount: number;
  durationMinutes: number;
}

interface ActivityChartProps {
  chartData: ChartDataItem[];
}

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

export default function ActivityChart({ chartData }: ActivityChartProps) {
  return (
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
  );
}
