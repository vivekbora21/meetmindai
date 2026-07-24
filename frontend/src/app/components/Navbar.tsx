"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Sparkles,
  ChevronDown,
  LogOut,
  Settings,
  Loader2
} from "lucide-react";
import { Logo } from "./Logo";

interface NavbarProps {
  userName: string;
  userRole: string;
  loading: boolean;
  onLogout: () => Promise<void> | void;
}

export default function Navbar({
  userName,
  userRole,
  loading,
  onLogout
}: NavbarProps) {
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <header className="h-16 border-b border-slate-200/80 bg-white/95 backdrop-blur-md w-full flex-shrink-0 z-50 flex items-center justify-between px-6 select-none shadow-xs">
      {/* Left side: Logo */}
      <div className="flex items-center gap-4">
        <Logo />
      </div>

      {/* Right side: Global Actions and Profile */}
      <div className="flex items-center gap-4 sm:gap-5">

        {/* AI Ready Badge */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#113229]/5 text-[#113229] text-xs font-bold border border-[#113229]/15 shadow-xs">
          <Sparkles className="w-3.5 h-3.5 text-[#D98A44] animate-pulse" />
          <span>AI Active</span>
        </div>

        {/* Notification Bell */}
        <button
          aria-label="View notifications"
          className="p-2 text-slate-500 hover:text-[#113229] transition-colors relative rounded-xl hover:bg-slate-100/80"
        >
          <Bell className="w-4.5 h-4.5" aria-hidden="true" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#D98A44] rounded-full ring-2 ring-white" />
        </button>

        {/* User Profile Dropdown */}
        <div className="relative" ref={dropdownRef}>
          {loading ? (
            <div className="flex items-center gap-2 border-l border-slate-200 pl-4 animate-pulse">
              <div className="w-8.5 h-8.5 rounded-full bg-slate-200" />
              <div className="hidden md:flex flex-col gap-1">
                <div className="h-3 bg-slate-200 rounded w-16" />
                <div className="h-2 bg-slate-200 rounded w-10" />
              </div>
            </div>
          ) : (
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              aria-haspopup="true"
              aria-expanded={dropdownOpen}
              aria-label="User account options menu"
              className="flex items-center gap-2.5 border-l border-slate-200/80 pl-4 cursor-pointer group focus:outline-none"
            >
              <div className="w-8.5 h-8.5 rounded-full bg-gradient-to-tr from-[#113229] to-[#1E4D40] flex items-center justify-center text-xs font-bold text-white uppercase shadow-sm group-hover:scale-105 transition-transform">
                {userName ? userName.split(" ").map((n) => n[0]).join("").slice(0, 2) : "VS"}
              </div>
              <div className="hidden md:flex flex-col text-left">
                <span className="text-xs font-bold text-[#0F172A] leading-tight group-hover:text-[#113229] transition-colors">
                  {userName}
                </span>
                <span className="text-[10px] text-slate-500 font-semibold leading-tight capitalize">
                  {userRole}
                </span>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition-colors" aria-hidden="true" />
            </button>
          )}

          {/* Dropdown Menu */}
          {dropdownOpen && (
            <div
              role="menu"
              aria-label="User account options"
              className="absolute right-0 mt-2 w-56 rounded-2xl bg-white border border-slate-200 shadow-lg py-2 z-50 animate-in fade-in slide-in-from-top-1 duration-100"
            >
              <div className="px-4 py-2 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-800">{userName}</p>
                <p className="text-[10px] text-slate-400 font-medium capitalize mt-0.5">{userRole} Account</p>
              </div>

              <div className="p-1.5 flex flex-col gap-0.5">
                <button
                  role="menuitem"
                  onClick={() => {
                    setDropdownOpen(false);
                    router.push("/settings");
                  }}
                  className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-left text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-[#F9F8F6] transition-colors"
                >
                  <Settings className="w-4 h-4 text-slate-400" aria-hidden="true" /> Settings
                </button>
                <button
                  role="menuitem"
                  disabled={isLoggingOut}
                  onClick={async () => {
                    setIsLoggingOut(true);
                    try {
                      await onLogout();
                    } finally {
                      setIsLoggingOut(false);
                      setDropdownOpen(false);
                    }
                  }}
                  className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-left text-xs font-semibold text-red-600 hover:bg-red-50/50 transition-colors disabled:opacity-60 cursor-pointer"
                >
                  {isLoggingOut ? (
                    <Loader2 className="w-4 h-4 text-red-500 animate-spin" aria-hidden="true" />
                  ) : (
                    <LogOut className="w-4 h-4 text-red-500" aria-hidden="true" />
                  )}
                  <span>{isLoggingOut ? "Signing out..." : "Sign Out"}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
