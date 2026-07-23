"use client";

import React from "react";
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from "lucide-react";
import { useToastStore, ToastItem } from "@/store/useToastStore";

const toastStyles = {
  success: {
    bg: "bg-[#113229] border-[#1f5244] text-white",
    icon: <CheckCircle2 className="w-5 h-5 text-[#64E0AA] shrink-0" />,
    progress: "bg-[#64E0AA]",
  },
  error: {
    bg: "bg-rose-950 border-rose-800 text-rose-100",
    icon: <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />,
    progress: "bg-rose-500",
  },
  warning: {
    bg: "bg-amber-950 border-amber-800 text-amber-100",
    icon: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />,
    progress: "bg-amber-500",
  },
  info: {
    bg: "bg-slate-900 border-slate-700 text-slate-100",
    icon: <Info className="w-5 h-5 text-blue-400 shrink-0" />,
    progress: "bg-blue-400",
  },
};

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed top-5 right-5 z-[9999] flex flex-col gap-3 max-w-md w-full pointer-events-none px-4 sm:px-0"
    >
      {toasts.map((toast: ToastItem) => {
        const style = toastStyles[toast.type] || toastStyles.info;
        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center justify-between gap-3 p-4 rounded-2xl border shadow-xl backdrop-blur-md transition-all duration-300 transform translate-y-0 animate-fade-in-up ${style.bg}`}
          >
            <div className="flex items-center gap-3 min-w-0">
              {style.icon}
              <span className="text-xs font-semibold leading-relaxed font-outfit truncate max-w-[300px] sm:max-w-xs">
                {toast.message}
              </span>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="p-1 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors shrink-0"
              aria-label="Close notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
