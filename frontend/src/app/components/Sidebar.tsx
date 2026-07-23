"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { 
  LayoutDashboard, 
  Network, 
  BarChart3, 
  Settings, 
  HelpCircle, 
  LogOut, 
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Video,
  Sparkles,
  Calendar,
  Loader2,
  PlusCircle
} from "lucide-react";

interface SidebarProps {
  userName: string;
  userRole: string;
  loading: boolean;
  onLogout: () => Promise<void> | void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function Sidebar({ 
  userName, 
  userRole, 
  loading, 
  onLogout,
  isCollapsed = false,
  onToggleCollapse
}: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const isDashboardActive = pathname === "/dashboard";
  const isMeetingsActive = pathname.startsWith("/meetings");
  const isAIWorkspaceActive = pathname.startsWith("/ai-workspace");
  const isKnowledgeActive = pathname.startsWith("/knowledge");
  const isAnalyticsActive = pathname.startsWith("/analytics");
  const isCalendarActive = pathname.startsWith("/calendar");

  return (
    <aside className={`border-r border-[#DEDDDA]/60 flex flex-col justify-between bg-white transition-all duration-300 ease-in-out h-full flex-shrink-0 relative z-30 ${
      isCollapsed ? "w-20 p-3" : "w-72 p-6"
    }`}>
      
      {/* Floating Collapse/Expand Button at Sidebar & Navbar Edge Intersection */}
      {onToggleCollapse && (
        <button
          onClick={onToggleCollapse}
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          aria-label={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          className="absolute top-1 -right-3.5 z-40 w-7 h-7 rounded-full bg-white border border-[#DEDDDA] hover:border-[#113229] shadow-sm hover:shadow-md flex items-center justify-center text-slate-500 hover:text-[#113229] transition-all hover:scale-105 active:scale-90 cursor-pointer"
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" aria-hidden="true" />
          ) : (
            <ChevronLeft className="w-4 h-4" aria-hidden="true" />
          )}
        </button>
      )}

      <div className="flex flex-col gap-6">
        {/* Navigation Section */}
        <nav className="flex flex-col gap-1.5 pt-2" aria-label="Main Sidebar Navigation">
          
          {/* Dashboard link */}
          <Link 
            href="/dashboard"
            title="Dashboard"
            className={`group relative flex items-center ${
              isCollapsed ? "justify-center w-11 h-11 mx-auto" : "gap-3 px-3.5 py-2.5"
            } rounded-xl text-xs font-semibold transition-all duration-200 ${
              isDashboardActive 
                ? "bg-[#113229] text-white shadow-md shadow-[#113229]/20 font-bold" 
                : "text-slate-600 hover:text-[#0F172A] hover:bg-slate-100/80"
            }`}
          >
            {isDashboardActive && !isCollapsed && (
              <span className="absolute left-0 top-2.5 bottom-2.5 w-1 rounded-r-full bg-[#D98A44]" />
            )}
            <LayoutDashboard className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 group-hover:scale-110 ${
              isDashboardActive ? "text-[#D98A44]" : "text-slate-400 group-hover:text-[#113229]"
            }`} aria-hidden="true" />
            {!isCollapsed && <span className="truncate">Dashboard</span>}
          </Link>
          
          {/* Meetings link */}
          <Link 
            href="/meetings"
            title="Meetings"
            className={`group relative flex items-center ${
              isCollapsed ? "justify-center w-11 h-11 mx-auto" : "gap-3 px-3.5 py-2.5"
            } rounded-xl text-xs font-semibold transition-all duration-200 ${
              isMeetingsActive 
                ? "bg-[#113229] text-white shadow-md shadow-[#113229]/20 font-bold" 
                : "text-slate-600 hover:text-[#0F172A] hover:bg-slate-100/80"
            }`}
          >
            {isMeetingsActive && !isCollapsed && (
              <span className="absolute left-0 top-2.5 bottom-2.5 w-1 rounded-r-full bg-[#D98A44]" />
            )}
            <Video className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 group-hover:scale-110 ${
              isMeetingsActive ? "text-[#D98A44]" : "text-slate-400 group-hover:text-[#113229]"
            }`} aria-hidden="true" />
            {!isCollapsed && <span className="truncate">Meetings</span>}
          </Link>

          {/* Create Meeting link */}
          <Link 
            href="/create-meeting"
            title="Create & Join Meeting"
            className={`group relative flex items-center ${
              isCollapsed ? "justify-center w-11 h-11 mx-auto" : "gap-3 px-3.5 py-2.5"
            } rounded-xl text-xs font-semibold transition-all duration-200 ${
              pathname.startsWith("/create-meeting")
                ? "bg-[#113229] text-white shadow-md shadow-[#113229]/20 font-bold" 
                : "text-slate-600 hover:text-[#0F172A] hover:bg-slate-100/80"
            }`}
          >
            {pathname.startsWith("/create-meeting") && !isCollapsed && (
              <span className="absolute left-0 top-2.5 bottom-2.5 w-1 rounded-r-full bg-[#D98A44]" />
            )}
            <PlusCircle className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 group-hover:scale-110 ${
              pathname.startsWith("/create-meeting") ? "text-[#D98A44]" : "text-slate-400 group-hover:text-[#113229]"
            }`} aria-hidden="true" />
            {!isCollapsed && <span className="truncate">Create & Join</span>}
          </Link>

          {/* Calendar link */}
          <Link 
            href="/calendar"
            title="Calendar"
            className={`group relative flex items-center ${
              isCollapsed ? "justify-center w-11 h-11 mx-auto" : "gap-3 px-3.5 py-2.5"
            } rounded-xl text-xs font-semibold transition-all duration-200 ${
              isCalendarActive 
                ? "bg-[#113229] text-white shadow-md shadow-[#113229]/20 font-bold" 
                : "text-slate-600 hover:text-[#0F172A] hover:bg-slate-100/80"
            }`}
          >
            {isCalendarActive && !isCollapsed && (
              <span className="absolute left-0 top-2.5 bottom-2.5 w-1 rounded-r-full bg-[#D98A44]" />
            )}
            <Calendar className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 group-hover:scale-110 ${
              isCalendarActive ? "text-[#D98A44]" : "text-slate-400 group-hover:text-[#113229]"
            }`} aria-hidden="true" />
            {!isCollapsed && <span className="truncate">Calendar</span>}
          </Link>

          {/* AI Workspace link */}
          <Link 
            href="/ai-workspace"
            title="AI Workspace"
            className={`group relative flex items-center ${
              isCollapsed ? "justify-center w-11 h-11 mx-auto" : "gap-3 px-3.5 py-2.5"
            } rounded-xl text-xs font-semibold transition-all duration-200 ${
              isAIWorkspaceActive 
                ? "bg-[#113229] text-white shadow-md shadow-[#113229]/20 font-bold" 
                : "text-slate-600 hover:text-[#0F172A] hover:bg-slate-100/80"
            }`}
          >
            {isAIWorkspaceActive && !isCollapsed && (
              <span className="absolute left-0 top-2.5 bottom-2.5 w-1 rounded-r-full bg-[#D98A44]" />
            )}
            <Sparkles className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 group-hover:scale-110 ${
              isAIWorkspaceActive ? "text-[#D98A44]" : "text-slate-400 group-hover:text-[#113229]"
            }`} aria-hidden="true" />
            {!isCollapsed && <span className="truncate">AI Workspace</span>}
          </Link>

          {/* Knowledge Graph link */}
          <Link 
            href="/knowledge"
            title="Knowledge Graph"
            className={`group relative flex items-center ${
              isCollapsed ? "justify-center w-11 h-11 mx-auto" : "gap-3 px-3.5 py-2.5"
            } rounded-xl text-xs font-semibold transition-all duration-200 ${
              isKnowledgeActive 
                ? "bg-[#113229] text-white shadow-md shadow-[#113229]/20 font-bold" 
                : "text-slate-600 hover:text-[#0F172A] hover:bg-slate-100/80"
            }`}
          >
            {isKnowledgeActive && !isCollapsed && (
              <span className="absolute left-0 top-2.5 bottom-2.5 w-1 rounded-r-full bg-[#D98A44]" />
            )}
            <Network className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 group-hover:scale-110 ${
              isKnowledgeActive ? "text-[#D98A44]" : "text-slate-400 group-hover:text-[#113229]"
            }`} aria-hidden="true" />
            {!isCollapsed && <span className="truncate">Knowledge Graph</span>}
          </Link>
          
          {/* Analytics link */}
          <Link 
            href="/analytics"
            title="Analytics"
            className={`group relative flex items-center ${
              isCollapsed ? "justify-center w-11 h-11 mx-auto" : "gap-3 px-3.5 py-2.5"
            } rounded-xl text-xs font-semibold transition-all duration-200 ${
              isAnalyticsActive 
                ? "bg-[#113229] text-white shadow-md shadow-[#113229]/20 font-bold" 
                : "text-slate-600 hover:text-[#0F172A] hover:bg-slate-100/80"
            }`}
          >
            {isAnalyticsActive && !isCollapsed && (
              <span className="absolute left-0 top-2.5 bottom-2.5 w-1 rounded-r-full bg-[#D98A44]" />
            )}
            <BarChart3 className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 group-hover:scale-110 ${
              isAnalyticsActive ? "text-[#D98A44]" : "text-slate-400 group-hover:text-[#113229]"
            }`} aria-hidden="true" />
            {!isCollapsed && <span className="truncate">Analytics</span>}
          </Link>
        </nav>
      </div>

      <div className="flex flex-col gap-4">
        {/* Help & Insights Premium Card */}
        {!isCollapsed && (
          <div className="relative w-full overflow-hidden rounded-2xl p-4 bg-gradient-to-br from-[#113229] via-[#0D261F] to-[#071914] text-white shadow-lg border border-[#113229]/30 group">
            {/* Glow blur element */}
            <div className="absolute -right-6 -bottom-6 w-20 h-20 rounded-full bg-[#D98A44]/20 blur-xl pointer-events-none group-hover:bg-[#D98A44]/30 transition-all duration-300" />
            
            <div className="flex items-center gap-2 mb-2 relative z-10">
              <div className="p-1 rounded-lg bg-[#D98A44]/20 border border-[#D98A44]/30">
                <Sparkles className="w-3.5 h-3.5 text-[#D98A44] animate-pulse" aria-hidden="true" />
              </div>
              <span className="text-[10px] font-black text-[#D98A44] uppercase tracking-wider">MeetMind Memory</span>
            </div>
            <p className="text-[11px] text-slate-200 leading-relaxed font-medium relative z-10">
              AI engine connected & syncing organizational context in real time.
            </p>
          </div>
        )}

        {/* Footer links in sidebar */}
        <div className="flex flex-col gap-1">
          <Link 
            href="/help"
            title="Help & Support"
            className={`group flex items-center ${
              isCollapsed ? "justify-center w-12 h-12 mx-auto" : "gap-3 px-4 py-2.5"
            } rounded-xl text-[#64748b] hover:text-[#102C23] hover:bg-[#F9F8F6]/80 text-xs font-bold transition-all duration-250 w-full`}
          >
            <HelpCircle className="w-4.5 h-4.5 flex-shrink-0 transition-transform duration-250 group-hover:scale-110 text-[#64748b] group-hover:text-[#102C23]" aria-hidden="true" /> 
            {!isCollapsed && <span className="truncate">Help & Support</span>}
          </Link>
        </div>

        {/* Profile Card / User section */}
        {loading ? (
          <div className={`flex items-center ${isCollapsed ? "justify-center" : "gap-3 px-3 py-2.5"} rounded-xl bg-white border border-[#DEDDDA]/60 animate-pulse`}>
            <div className="w-9 h-9 rounded-full bg-slate-100 flex-shrink-0" />
            {!isCollapsed && (
              <div className="flex flex-col gap-1.5 flex-1">
                <div className="h-3 bg-slate-100 rounded w-20" />
                <div className="h-2.5 bg-slate-100 rounded w-12" />
              </div>
            )}
          </div>
        ) : (
          <div className="relative">
            {/* Dropdown Menu (Dropup) */}
            {isDropdownOpen && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setIsDropdownOpen(false)}
                />
                <div 
                  role="menu"
                  aria-label="User settings options"
                  className={`absolute bottom-full mb-2.5 z-20 bg-white border border-[#DEDDDA]/60 rounded-2xl shadow-lg p-1.5 flex flex-col gap-0.5 min-w-[190px] ${
                    isCollapsed ? "left-2" : "left-0 right-0"
                  }`}
                >
                  <button
                    role="menuitem"
                    onClick={() => {
                      setIsDropdownOpen(false);
                      router.push("/settings");
                    }}
                    className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold text-[#64748b] hover:text-[#113229] hover:bg-[#F9F8F6] transition-colors w-full text-left"
                  >
                    <Settings className="w-4 h-4 text-[#64748b]" aria-hidden="true" />
                    Settings
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
                        setIsDropdownOpen(false);
                      }
                    }}
                    className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50/50 transition-colors w-full text-left border-t border-slate-50 mt-1 pt-2 disabled:opacity-60 cursor-pointer"
                  >
                    {isLoggingOut ? (
                      <Loader2 className="w-4 h-4 text-rose-500 animate-spin" aria-hidden="true" />
                    ) : (
                      <LogOut className="w-4 h-4 text-rose-500" aria-hidden="true" />
                    )}
                    <span>{isLoggingOut ? "Signing out..." : "Sign Out"}</span>
                  </button>
                </div>
              </>
            )}

            {/* Profile Card Trigger */}
            <button 
              type="button"
              title={`${userName} (${userRole})`}
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              aria-haspopup="true"
              aria-expanded={isDropdownOpen}
              aria-label="User profile menu"
              className={`flex items-center w-full ${
                isCollapsed 
                  ? "justify-center w-12 h-12 mx-auto p-0 border-0 bg-transparent hover:bg-[#F9F8F6] rounded-full" 
                  : "justify-between px-3.5 py-2.5 rounded-2xl bg-white border border-[#DEDDDA]/60 hover:bg-[#F9F8F6]"
              } transition-all duration-250 cursor-pointer group text-left`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-[#113229] flex items-center justify-center text-xs font-bold text-white uppercase shadow-sm flex-shrink-0 ring-2 ring-transparent group-hover:ring-[#113229]/20 transition-all duration-250">
                  {userName ? userName.split(" ").map((n) => n[0]).join("").slice(0, 2) : "VS"}
                </div>
                {!isCollapsed && (
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-[#102C23] truncate max-w-[140px]">{userName}</span>
                    <span className="text-[10px] text-[#64748b] capitalize font-medium">{userRole}</span>
                  </div>
                )}
              </div>
              {!isCollapsed && <ChevronDown className={`w-4 h-4 text-[#64748b] group-hover:text-[#102C23] transition-transform duration-250 ${isDropdownOpen ? "rotate-180" : ""}`} aria-hidden="true" />}
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
