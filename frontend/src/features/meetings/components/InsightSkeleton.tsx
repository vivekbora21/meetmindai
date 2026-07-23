import React from "react";

interface InsightSkeletonProps {
  title: string;
  hint: string;
  accentClassName?: string;
}

export const InsightSkeleton: React.FC<InsightSkeletonProps> = ({
  title,
  hint,
  accentClassName = "bg-slate-200",
}) => {
  return (
    <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="h-3.5 w-32 rounded-full bg-slate-100 animate-pulse" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{title}</span>
        </div>
        <div className={`h-2.5 w-16 rounded-full animate-pulse ${accentClassName}`} />
      </div>
      <div className="flex flex-col gap-2">
        <div className="h-3 w-5/6 rounded-full bg-slate-100 animate-pulse" />
        <div className="h-3 w-11/12 rounded-full bg-slate-100 animate-pulse" />
        <div className="h-3 w-3/4 rounded-full bg-slate-100 animate-pulse" />
      </div>
      <p className="text-[11px] text-slate-400 font-medium">{hint}</p>
    </div>
  );
};
