"use client";

import { useRouter, usePathname } from "next/navigation";
import { Brain, Calendar, Network, BarChart3, LogOut } from "lucide-react";

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

  return (
    <aside className="w-72 border-r border-[#d8cfc2] flex flex-col justify-between p-6 h-screen sticky top-0 bg-[rgba(255,250,244,0.82)] backdrop-blur-xl">
      <div className="flex flex-col gap-8">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-[#205866] rounded-lg shadow-lg shadow-[#205866]/15">
            <Brain className="w-5 h-5 text-[#fffaf4]" />
          </div>
          <span className="font-bold tracking-tight font-outfit text-[#18161f]">MeetingMind AI</span>
        </div>

        <nav className="flex flex-col gap-1">
          <button 
            onClick={() => router.push("/dashboard")}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              isDashboardActive 
                ? "bg-[#205866]/10 text-[#205866]" 
                : "text-[#6d6473] hover:text-[#18161f]"
            }`}
          >
            <Calendar className={`w-4 h-4 ${isDashboardActive ? "text-[#205866]" : ""}`} /> Dashboard
          </button>
          <button 
            onClick={() => router.push("/knowledge")}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              isKnowledgeActive 
                ? "bg-[#205866]/10 text-[#205866]" 
                : "text-[#6d6473] hover:text-[#18161f]"
            }`}
          >
            <Network className={`w-4 h-4 ${isKnowledgeActive ? "text-[#205866]" : ""}`} /> Knowledge Graph
          </button>
          <button 
            onClick={() => router.push("/analytics")}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              isAnalyticsActive 
                ? "bg-[#205866]/10 text-[#205866]" 
                : "text-[#6d6473] hover:text-[#18161f]"
            }`}
          >
            <BarChart3 className={`w-4 h-4 ${isAnalyticsActive ? "text-[#205866]" : ""}`} /> Analytics
          </button>
        </nav>
      </div>

      <div className="flex flex-col gap-4">
        {loading ? (
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/80 border border-[#d8cfc2] animate-pulse">
            <div className="w-8 h-8 rounded-full bg-[#205866]/10" />
            <div className="flex flex-col gap-1.5 flex-1">
              <div className="h-2.5 bg-[#205866]/10 rounded w-20" />
              <div className="h-2 bg-[#205866]/10 rounded w-12" />
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/80 border border-[#d8cfc2]">
            <div className="w-8 h-8 rounded-full bg-[#c57b57] flex items-center justify-center text-xs font-bold text-white uppercase">
              {userName ? userName.split(" ").map((n: string) => n[0]).join("").slice(0, 2) : "VS"}
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-[#18161f] truncate max-w-[120px]">{userName}</span>
              <span className="text-[10px] text-[#6d6473] capitalize">{userRole}</span>
            </div>
          </div>
        )}
        <button 
          onClick={onLogout}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-[#6d6473] hover:text-red-600 text-sm font-medium transition-colors w-full text-left"
        >
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </div>
    </aside>
  );
}
