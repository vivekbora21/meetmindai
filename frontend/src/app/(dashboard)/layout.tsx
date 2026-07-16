"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Brain, Loader2, MessageSquare, X } from "lucide-react";
import { getApiUrl } from "../config";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import dynamic from "next/dynamic";

const ChatWindow = dynamic(
  () => import("@/features/chat/components/ChatWindow").then((mod) => mod.ChatWindow),
  {
    loading: () => (
      <div className="h-full w-full flex flex-col items-center justify-center bg-white gap-2">
        <Loader2 className="w-8 h-8 animate-spin text-[#113229]" />
        <span className="text-xs text-slate-500 font-medium">Loading Assistant...</span>
      </div>
    ),
    ssr: false,
  }
);

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  
  const [userName, setUserName] = useState("");
  const [userRole, setUserRole] = useState("");
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [activeMeetingStatus, setActiveMeetingStatus] = useState<string>("COMPLETED");

  const meetingMatch = pathname ? pathname.match(/^\/meetings\/([^\/]+)$/) : null;
  const activeMeetingId = meetingMatch && meetingMatch[1] !== "live" ? meetingMatch[1] : null;
  const isAIWorkspaceActive = pathname ? pathname.startsWith("/ai-workspace") : false;

  useEffect(() => {
    if (activeMeetingId) {
      fetch(getApiUrl(`/api/v1/meetings/${activeMeetingId}`), { credentials: "include" })
        .then(res => {
          if (res.ok) return res.json();
          throw new Error();
        })
        .then(data => {
          setActiveMeetingStatus(data.status || "COMPLETED");
        })
        .catch(() => {
          setActiveMeetingStatus("COMPLETED");
        });
    } else {
      setActiveMeetingStatus("COMPLETED");
    }
  }, [activeMeetingId]);

  const getCookie = (name: string): string | null => {
    if (typeof document === "undefined") return null;
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    if (match) return match[2];
    return null;
  };

  const setCookie = (name: string, value: string, maxAgeSeconds: number = 86400) => {
    if (typeof document === "undefined") return;
    document.cookie = `${name}=${value}; max-age=${maxAgeSeconds}; path=/; SameSite=Lax`;
  };

  const eraseCookie = (name: string) => {
    if (typeof document === "undefined") return;
    document.cookie = `${name}=; max-age=0; path=/; SameSite=Lax`;
  };

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch(getApiUrl("/api/v1/auth/me"), {
        credentials: "include"
      });
      if (res.ok) {
        const profile = await res.json();
        setUserName(profile.name);
        setUserRole(profile.role);
        setCookie("isAuthenticated", "true", 86400);
        setIsAuthenticated(true);
      } else {
        eraseCookie("isAuthenticated");
        setIsAuthenticated(false);
        router.push("/");
      }
    } catch {
      console.warn("Backend not active. Falling back to mock details.");
      setUserName("Vivek Singh Bora");
      setUserRole("Admin");
      setIsAuthenticated(true);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const isMockMode = getCookie("mock_mode") === "true";
    if (isMockMode) {
      setUserName("Vivek Singh Bora");
      setUserRole("Admin");
      setIsAuthenticated(true);
      setLoading(false);
    } else {
      fetchProfile();
    }
  }, [fetchProfile]);

  const handleLogout = async () => {
    try {
      await fetch(getApiUrl("/api/v1/auth/logout"), {
        method: "POST",
        credentials: "include"
      });
    } catch {
      console.warn("Could not reach logout endpoint on backend.");
    }
    eraseCookie("mock_mode");
    eraseCookie("isAuthenticated");
    setIsAuthenticated(false);
    router.push("/");
  };

  if (isAuthenticated !== true) {
    return (
      <div className="min-h-screen bg-[#F9F8F6] flex flex-col items-center justify-center gap-4">
        <div className="p-3 bg-[#113229] rounded-2xl shadow-lg shadow-[#113229]/15 animate-bounce">
          <Brain className="w-8 h-8 text-white" />
        </div>
        <div className="flex items-center gap-2">
          <Loader2 className="w-5 h-5 text-[#113229] animate-spin" />
          <span className="font-outfit text-sm font-medium text-slate-500">
            {isAuthenticated === false ? "Redirecting to login..." : "Verifying session..."}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col selection:bg-[#113229] selection:text-white text-[#102C23] bg-[#F9F8F6] overflow-hidden relative">
      {/* Top Navbar */}
      <Navbar 
        userName={userName} 
        userRole={userRole} 
        loading={loading} 
        onLogout={handleLogout} 
      />

      <div className="flex flex-1 overflow-hidden h-[calc(100vh-4rem)]">
        {/* Sidebar */}
        <Sidebar 
          userName={userName} 
          userRole={userRole} 
          loading={loading} 
          onLogout={handleLogout} 
          isCollapsed={isCollapsed}
          onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
        />

        {/* Main Workspace - Controlled height and independent scrolling */}
        <div className={`flex-1 h-full bg-[#F9F8F6] ${isAIWorkspaceActive ? "overflow-hidden" : "overflow-y-auto"}`}>
          {children}
        </div>
      </div>

      {/* Floating Chatbot Toggle Button */}
      <button
        onClick={() => setIsChatOpen(!isChatOpen)}
        aria-label={isChatOpen ? "Close AI Chat Assistant" : "Open AI Chat Assistant"}
        aria-expanded={isChatOpen}
        className="fixed bottom-24 right-6 z-50 p-4 bg-[#113229] hover:bg-[#1a4d3f] text-white rounded-full shadow-2xl transition-all duration-300 transform hover:scale-110 flex items-center justify-center border border-[#2a6656]/20"
        title="Open Chat Assistant"
      >
        {isChatOpen ? (
          <X className="w-6 h-6" aria-hidden="true" />
        ) : (
          <MessageSquare className="w-6 h-6 animate-pulse" aria-hidden="true" />
        )}
      </button>

      {/* Floating Chatbot Window */}
      {isChatOpen && (
        <div 
          role="dialog"
          aria-label="AI Chat Assistant"
          className="fixed bottom-40 right-6 z-50 w-[750px] max-w-[calc(100vw-3rem)] h-[600px] max-h-[calc(100vh-8rem)] rounded-2xl bg-white border border-[#DEDDDA]/60 shadow-2xl overflow-hidden flex flex-col animate-fade-in-up"
        >
          <ChatWindow meetingId={activeMeetingId} status={activeMeetingStatus} />
        </div>
      )}
    </div>
  );
}

