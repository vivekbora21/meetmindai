"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Network, 
  BarChart3, 
  Settings, 
  HelpCircle, 
  LogOut, 
  ChevronDown,
  Video,
  Sparkles,
  Calendar
} from "lucide-react";

interface SidebarProps {
  userName: string;
  userRole: string;
  loading: boolean;
  onLogout: () => Promise<void> | void;
  isCollapsed?: boolean;
}

export default function Sidebar({ 
  userName, 
  userRole, 
  loading, 
  onLogout,
  isCollapsed = false 
}: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const isDashboardActive = pathname === "/dashboard";
  const isMeetingsActive = pathname.startsWith("/meetings");
  const isAIWorkspaceActive = pathname.startsWith("/ai-workspace");
  const isKnowledgeActive = pathname.startsWith("/knowledge");
  const isAnalyticsActive = pathname.startsWith("/analytics");
  const isCalendarActive = pathname.startsWith("/calendar");

  return (
    <aside className={`border-r border-[#e2e8f0] flex flex-col justify-between bg-white transition-all duration-300 ease-in-out h-full flex-shrink-0 ${
      isCollapsed ? "w-20 p-3" : "w-72 p-6"
    }`}>
      <div className="flex flex-col gap-6">
        {/* Navigation Section */}
        <nav className="flex flex-col gap-1.5 pt-2">
          <button 
            onClick={() => router.push("/dashboard")}
            title="Dashboard"
            className={`group flex items-center ${
              isCollapsed ? "justify-center w-12 h-12 mx-auto" : "gap-3 px-4 py-2.5"
            } rounded-xl text-sm font-medium transition-all duration-200 ${
              isDashboardActive 
                ? "bg-[#e6f4f1] text-[#0f766e]" 
                : "text-[#64748b] hover:text-[#0f172a] hover:bg-slate-50/80"
            }`}
          >
            <LayoutDashboard className={`w-5 h-5 flex-shrink-0 transition-transform duration-200 group-hover:scale-110 ${
              isDashboardActive ? "text-[#0f766e]" : "text-[#64748b] group-hover:text-[#0f172a]"
            }`} />
            {!isCollapsed && <span className="truncate">Dashboard</span>}
          </button>
          
          <button 
            onClick={() => router.push("/meetings")}
            title="Meetings"
            className={`group flex items-center ${
              isCollapsed ? "justify-center w-12 h-12 mx-auto" : "gap-3 px-4 py-2.5"
            } rounded-xl text-sm font-medium transition-all duration-200 ${
              isMeetingsActive 
                ? "bg-[#e6f4f1] text-[#0f766e]" 
                : "text-[#64748b] hover:text-[#0f172a] hover:bg-slate-50/80"
            }`}
          >
            <Video className={`w-5 h-5 flex-shrink-0 transition-transform duration-200 group-hover:scale-110 ${
              isMeetingsActive ? "text-[#0f766e]" : "text-[#64748b] group-hover:text-[#0f172a]"
            }`} />
            {!isCollapsed && <span className="truncate">Meetings</span>}
          </button>

          <button 
            onClick={() => router.push("/calendar")}
            title="Calendar"
            className={`group flex items-center ${
              isCollapsed ? "justify-center w-12 h-12 mx-auto" : "gap-3 px-4 py-2.5"
            } rounded-xl text-sm font-medium transition-all duration-200 ${
              isCalendarActive 
                ? "bg-[#e6f4f1] text-[#0f766e]" 
                : "text-[#64748b] hover:text-[#0f172a] hover:bg-slate-50/80"
            }`}
          >
            <Calendar className={`w-5 h-5 flex-shrink-0 transition-transform duration-200 group-hover:scale-110 ${
              isCalendarActive ? "text-[#0f766e]" : "text-[#64748b] group-hover:text-[#0f172a]"
            }`} />
            {!isCollapsed && <span className="truncate">Calendar</span>}
          </button>

          <button 
            onClick={() => router.push("/ai-workspace")}
            title="AI Workspace"
            className={`group flex items-center ${
              isCollapsed ? "justify-center w-12 h-12 mx-auto" : "gap-3 px-4 py-2.5"
            } rounded-xl text-sm font-medium transition-all duration-200 ${
              isAIWorkspaceActive 
                ? "bg-[#e6f4f1] text-[#0f766e]" 
                : "text-[#64748b] hover:text-[#0f172a] hover:bg-slate-50/80"
            }`}
          >
            <Sparkles className={`w-5 h-5 flex-shrink-0 transition-transform duration-200 group-hover:scale-110 ${
              isAIWorkspaceActive ? "text-[#0f766e]" : "text-[#64748b] group-hover:text-[#0f172a]"
            }`} />
            {!isCollapsed && <span className="truncate">AI Workspace</span>}
          </button>

          <button 
            onClick={() => router.push("/knowledge")}
            title="Knowledge Graph"
            className={`group flex items-center ${
              isCollapsed ? "justify-center w-12 h-12 mx-auto" : "gap-3 px-4 py-2.5"
            } rounded-xl text-sm font-medium transition-all duration-200 ${
              isKnowledgeActive 
                ? "bg-[#e6f4f1] text-[#0f766e]" 
                : "text-[#64748b] hover:text-[#0f172a] hover:bg-slate-50/80"
            }`}
          >
            <Network className={`w-5 h-5 flex-shrink-0 transition-transform duration-200 group-hover:scale-110 ${
              isKnowledgeActive ? "text-[#0f766e]" : "text-[#64748b] group-hover:text-[#0f172a]"
            }`} />
            {!isCollapsed && <span className="truncate">Knowledge Graph</span>}
          </button>
          
          <button 
            onClick={() => router.push("/analytics")}
            title="Analytics"
            className={`group flex items-center ${
              isCollapsed ? "justify-center w-12 h-12 mx-auto" : "gap-3 px-4 py-2.5"
            } rounded-xl text-sm font-medium transition-all duration-200 ${
              isAnalyticsActive 
                ? "bg-[#e6f4f1] text-[#0f766e]" 
                : "text-[#64748b] hover:text-[#0f172a] hover:bg-slate-50/80"
            }`}
          >
            <BarChart3 className={`w-5 h-5 flex-shrink-0 transition-transform duration-200 group-hover:scale-110 ${
              isAnalyticsActive ? "text-[#0f766e]" : "text-[#64748b] group-hover:text-[#0f172a]"
            }`} />
            {!isCollapsed && <span className="truncate">Analytics</span>}
          </button>
        </nav>
      </div>

      <div className="flex flex-col gap-4">
        {/* Help & Insights card (only when expanded) */}
        {!isCollapsed && (
          <div className="relative w-full overflow-hidden rounded-2xl p-4 bg-gradient-to-br from-[#0f766e]/5 to-[#0f766e]/10 border border-[#0f766e]/10">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1 rounded-lg bg-[#e6f4f1]">
                <Sparkles className="w-3.5 h-3.5 text-[#0f766e]" />
              </div>
              <span className="text-xs font-bold text-[#0f766e]">MeetingMind AI</span>
            </div>
            <p className="text-[11px] text-[#64748b] leading-relaxed font-semibold">
              Your meeting intelligence assistant is active and ready to transcribe and analyze.
            </p>
          </div>
        )}

        {/* Footer links in sidebar */}
        <div className="flex flex-col gap-1">
          <button 
            onClick={() => router.push("/help")}
            title="Help & Support"
            className={`group flex items-center ${
              isCollapsed ? "justify-center w-12 h-12 mx-auto" : "gap-3 px-4 py-2.5"
            } rounded-xl text-[#64748b] hover:text-[#0f172a] hover:bg-slate-50/80 text-sm font-medium transition-all duration-200 w-full text-left`}
          >
            <HelpCircle className="w-5 h-5 flex-shrink-0 transition-transform duration-200 group-hover:scale-110 text-[#64748b] group-hover:text-[#0f172a]" /> 
            {!isCollapsed && <span className="truncate">Help & Support</span>}
          </button>
        </div>

        {/* Profile Card / User section */}
        {loading ? (
          <div className={`flex items-center ${isCollapsed ? "justify-center" : "gap-3 px-3 py-2.5"} rounded-xl bg-white border border-[#e2e8f0] animate-pulse`}>
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
                <div className={`absolute bottom-full mb-2 z-20 bg-white border border-slate-200 rounded-xl shadow-lg p-1.5 flex flex-col gap-0.5 min-w-[180px] ${
                  isCollapsed ? "left-2" : "left-0 right-0"
                }`}>
                  <button
                    onClick={() => {
                      setIsDropdownOpen(false);
                      router.push("/settings");
                    }}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-[#64748b] hover:text-[#0f172a] hover:bg-slate-50 transition-colors w-full text-left"
                  >
                    <Settings className="w-4 h-4 text-[#64748b]" />
                    Settings
                  </button>
                  <button
                    onClick={() => {
                      setIsDropdownOpen(false);
                      onLogout();
                    }}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50/50 transition-colors w-full text-left"
                  >
                    <LogOut className="w-4 h-4 text-rose-500" />
                    Sign Out
                  </button>
                </div>
              </>
            )}

            {/* Profile Card Trigger */}
            <div 
              title={`${userName} (${userRole})`}
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className={`flex items-center ${
                isCollapsed 
                  ? "justify-center w-12 h-12 mx-auto p-0 border-0 bg-transparent hover:bg-slate-50 rounded-full" 
                  : "justify-between px-3 py-2.5 rounded-xl bg-white border border-[#e2e8f0] hover:bg-slate-50"
              } transition-all duration-200 cursor-pointer group`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-[#0f766e] flex items-center justify-center text-xs font-bold text-white uppercase shadow-sm flex-shrink-0 ring-2 ring-transparent group-hover:ring-[#0f766e]/20 transition-all duration-200">
                  {userName ? userName.split(" ").map((n) => n[0]).join("").slice(0, 2) : "VS"}
                </div>
                {!isCollapsed && (
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-[#0f172a] truncate max-w-[140px]">{userName}</span>
                    <span className="text-[10px] text-[#64748b] capitalize">{userRole}</span>
                  </div>
                )}
              </div>
              {!isCollapsed && <ChevronDown className={`w-4 h-4 text-[#64748b] group-hover:text-[#0f172a] transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : ""}`} />}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
