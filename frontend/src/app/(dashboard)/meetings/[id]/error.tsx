"use client";

import React, { useEffect } from "react";
import { AlertCircle, RotateCcw, Home } from "lucide-react";
import { useRouter } from "next/navigation";

export default function MeetingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error("Meeting Workspace Error:", error);
  }, [error]);

  return (
    <div className="min-h-[400px] py-12 px-6 flex flex-col items-center justify-center text-[#102C23]">
      <div className="max-w-md w-full p-8 rounded-3xl bg-white border border-slate-200 shadow-xl flex flex-col items-center text-center gap-6">
        {/* Warning Icon */}
        <div className="p-4 bg-rose-50 rounded-2xl shadow-inner animate-bounce">
          <AlertCircle className="w-10 h-10 text-rose-600" />
        </div>

        {/* Text Details */}
        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-bold font-outfit text-slate-800">
            Workspace Render Error
          </h2>
          <p className="text-sm text-slate-500 font-medium leading-relaxed">
            Something went wrong while rendering the meeting workspace. This can happen due to temporary connection drops or parsing issues.
          </p>
          {error.message && (
            <div className="mt-2 p-3 bg-slate-50 border border-slate-100 rounded-xl text-left w-full">
              <span className="text-[10px] uppercase font-bold text-slate-400 block font-outfit">
                Error details
              </span>
              <code className="text-xs text-rose-600 font-mono break-all leading-tight block mt-0.5">
                {error.message}
              </code>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 w-full mt-2">
          <button
            onClick={() => reset()}
            className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#113229] hover:bg-[#102C23] text-white text-xs font-bold transition-all shadow-md hover:shadow"
          >
            <RotateCcw className="w-4 h-4" /> Try Again
          </button>
          <button
            onClick={() => router.push("/dashboard")}
            className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-slate-600 hover:text-slate-800 text-xs font-bold transition-all shadow-sm"
          >
            <Home className="w-4 h-4" /> Go Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
