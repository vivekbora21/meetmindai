"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Brain, 
  PanelLeftClose, 
  PanelLeftOpen, 
  Bell, 
  Sparkles, 
  ChevronDown, 
  LogOut, 
  Settings, 
  User 
} from "lucide-react";
import { Logo } from "./Logo";

interface NavbarProps {
  userName: string;
  userRole: string;
  loading: boolean;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onLogout: () => Promise<void> | void;
}

export default function Navbar({ 
  userName, 
  userRole, 
  loading, 
  isCollapsed, 
  onToggleCollapse,
  onLogout
}: NavbarProps) {
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
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
    <header className="h-16 border-b border-[#e2e8f0] bg-white w-full flex-shrink-0 z-50 flex items-center justify-between px-6 select-none">
      {/* Left side: Logo, Company name, Sidebar Toggle */}
      <div className="flex items-center gap-4">
        <Logo />

        {/* Sidebar Collapse Toggle Button */}
        <button 
          onClick={onToggleCollapse} 
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition-colors ml-2 flex items-center justify-center"
        >
          {isCollapsed ? (
            <PanelLeftOpen className="w-5 h-5 text-[#113229]" />
          ) : (
            <PanelLeftClose className="w-5 h-5 text-slate-500" />
          )}
        </button>
      </div>

      {/* Right side: Global Actions and Profile */}
      <div className="flex items-center gap-5">
        {/* AI Ready Badge */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#e6f4f1] text-[#113229] text-xs font-bold border border-teal-100 shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-[#113229]" /> AI Ready
        </div>

        {/* Notification Bell */}
        <button className="p-2 text-slate-500 hover:text-[#102C23] transition-colors relative rounded-lg hover:bg-[#F9F8F6]">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#113229] rounded-full border border-white" />
        </button>

        {/* User Profile Dropdown */}
        <div className="relative" ref={dropdownRef}>
          {loading ? (
            <div className="flex items-center gap-2 border-l border-slate-200 pl-5 animate-pulse">
              <div className="w-9 h-9 rounded-full bg-slate-100" />
              <div className="hidden md:flex flex-col gap-1">
                <div className="h-3 bg-slate-100 rounded w-16" />
                <div className="h-2 bg-slate-100 rounded w-10" />
              </div>
            </div>
          ) : (
            <button 
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2.5 border-l border-slate-200 pl-5 cursor-pointer group focus:outline-none"
            >
              <div className="w-9 h-9 rounded-full bg-[#113229] flex items-center justify-center text-xs font-bold text-white uppercase shadow-sm">
                {userName ? userName.split(" ").map((n) => n[0]).join("").slice(0, 2) : "VS"}
              </div>
              <div className="hidden md:flex flex-col text-left">
                <span className="text-xs font-bold text-[#102C23] leading-tight group-hover:text-[#113229] transition-colors">
                  {userName}
                </span>
                <span className="text-[10px] text-slate-400 font-semibold leading-tight capitalize">
                  {userRole}
                </span>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-650 transition-colors" />
            </button>
          )}

          {/* Dropdown Menu */}
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white border border-slate-200 shadow-lg py-2 z-50 animate-in fade-in slide-in-from-top-1 duration-100">
              <div className="px-4 py-2 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-800">{userName}</p>
                <p className="text-[10px] text-slate-400 font-medium capitalize mt-0.5">{userRole} Account</p>
              </div>
              
              <div className="p-1.5 flex flex-col gap-0.5">
                <button 
                  onClick={() => {
                    setDropdownOpen(false);
                    router.push("/settings");
                  }}
                  className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-left text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-[#F9F8F6] transition-colors"
                >
                  <Settings className="w-4 h-4 text-slate-400" /> Settings
                </button>
                <button 
                  onClick={onLogout}
                  className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-left text-xs font-semibold text-red-600 hover:bg-red-50/50 transition-colors"
                >
                  <LogOut className="w-4 h-4 text-red-500" /> Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
