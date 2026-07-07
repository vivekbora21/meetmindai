"use client";

import Link from "next/link";
import { Brain, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 selection:bg-[#0f766e] selection:text-white">
      <div className="max-w-md w-full text-center flex flex-col items-center gap-6 bg-white p-8 rounded-2xl border border-slate-200 shadow-xl">
        <div className="p-4 bg-teal-50 rounded-2xl flex items-center justify-center text-[#0f766e] shadow-sm">
          <Brain className="w-12 h-12" />
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl font-extrabold tracking-tight font-outfit text-[#0f172a]">404</h1>
          <h2 className="text-lg font-bold text-slate-700 font-outfit">Page Not Found</h2>
          <p className="text-slate-500 text-sm leading-relaxed mt-2">
            The page you are looking for doesn't exist or has been moved. You can return to the safety of your meeting memory.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#0f766e] hover:bg-[#0d9488] text-white text-sm font-bold shadow-md shadow-[#0f766e]/10 transition-all w-full"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
