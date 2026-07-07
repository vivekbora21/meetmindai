"use client";

import { useRouter, usePathname } from "next/navigation";
import { Brain, LayoutDashboard, Network, BarChart3, Settings, HelpCircle, LogOut, ChevronDown } from "lucide-react";

interface SidebarProps {
  userName: string;
  userRole: string;
  loading: boolean;
  onLogout: () => Promise<void> | void;
}

export default function Sidebar({ userName, userRole, loading, onLogout }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();

  const isDashboardActive = pathname === "/dashboard";
  const isKnowledgeActive = pathname.startsWith("/knowledge");
  const isAnalyticsActive = pathname.startsWith("/analytics");
  const isSettingsActive = pathname.startsWith("/settings");

  return (
    <aside className="w-72 border-r border-[#e2e8f0] flex flex-col justify-between p-6 h-screen sticky top-0 bg-white">
      <div className="flex flex-col gap-8">
        {/* Logo Section */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#0f766e] rounded-xl flex items-center justify-center shadow-sm">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <span className="font-bold tracking-tight font-outfit text-[#0f172a] text-lg">MeetingMind AI</span>
        </div>

        {/* Navigation Section */}
        <nav className="flex flex-col gap-1.5">
          <button 
            onClick={() => router.push("/dashboard")}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              isDashboardActive 
                ? "bg-[#e6f4f1] text-[#0f766e]" 
                : "text-[#64748b] hover:text-[#0f172a] hover:bg-slate-50"
            }`}
          >
            <LayoutDashboard className={`w-4 h-4 ${isDashboardActive ? "text-[#0f766e]" : "text-[#64748b]"}`} /> Dashboard
          </button>
          <button 
            onClick={() => router.push("/knowledge")}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              isKnowledgeActive 
                ? "bg-[#e6f4f1] text-[#0f766e]" 
                : "text-[#64748b] hover:text-[#0f172a] hover:bg-slate-50"
            }`}
          >
            <Network className={`w-4 h-4 ${isKnowledgeActive ? "text-[#0f766e]" : "text-[#64748b]"}`} /> Knowledge Graph
          </button>
          <button 
            onClick={() => router.push("/analytics")}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              isAnalyticsActive 
                ? "bg-[#e6f4f1] text-[#0f766e]" 
                : "text-[#64748b] hover:text-[#0f172a] hover:bg-slate-50"
            }`}
          >
            <BarChart3 className={`w-4 h-4 ${isAnalyticsActive ? "text-[#0f766e]" : "text-[#64748b]"}`} /> Analytics
          </button>
          <button 
            onClick={() => router.push("/settings")}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              isSettingsActive 
                ? "bg-[#e6f4f1] text-[#0f766e]" 
                : "text-[#64748b] hover:text-[#0f172a] hover:bg-slate-50"
            }`}
          >
            <Settings className={`w-4 h-4 ${isSettingsActive ? "text-[#0f766e]" : "text-[#64748b]"}`} /> Settings
          </button>
        </nav>
      </div>

      <div className="flex flex-col gap-4">
        {/* Brain network illustration from the theme image */}
        <div className="relative w-full aspect-square max-h-[160px] rounded-2xl overflow-hidden flex items-center justify-center p-2">
          <img 
            src="/brain_illustration.png" 
            alt="AI Brain Illustration" 
            className="w-full h-full object-contain mix-blend-multiply opacity-90" 
          />
        </div>

        {/* Profile Card / User section */}
        {loading ? (
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white border border-[#e2e8f0] animate-pulse">
            <div className="w-9 h-9 rounded-full bg-slate-100" />
            <div className="flex flex-col gap-1.5 flex-1">
              <div className="h-3 bg-slate-100 rounded w-20" />
              <div className="h-2.5 bg-slate-100 rounded w-12" />
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-white border border-[#e2e8f0] hover:bg-slate-50 transition-colors cursor-pointer group">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#0f766e] flex items-center justify-center text-xs font-bold text-white uppercase shadow-sm">
                {userName ? userName.split(" ").map((n: string) => n[0]).join("").slice(0, 2) : "VS"}
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-[#0f172a] truncate max-w-[110px]">{userName}</span>
                <span className="text-[10px] text-[#64748b] capitalize">{userRole}</span>
              </div>
            </div>
            <ChevronDown className="w-4 h-4 text-[#64748b] group-hover:text-[#0f172a] transition-colors" />
          </div>
        )}

        {/* Footer links in sidebar */}
        <div className="flex flex-col gap-1">
          <button 
            onClick={() => router.push("/help")}
            className="flex items-center gap-3 px-4 py-2 rounded-xl text-[#64748b] hover:text-[#0f172a] hover:bg-slate-50 text-sm font-medium transition-colors w-full text-left"
          >
            <HelpCircle className="w-4 h-4" /> Help & Support
          </button>
          <button 
            onClick={onLogout}
            className="flex items-center gap-3 px-4 py-2 rounded-xl text-[#64748b] hover:text-red-600 hover:bg-red-50/50 text-sm font-medium transition-colors w-full text-left"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </div>
    </aside>
  );
}
