"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Brain, Loader2, MessageSquare, X } from "lucide-react";
import { getApiUrl } from "../config";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import dynamic from "next/dynamic";
import { toast } from "@/store/useToastStore";

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
  const logoutToastShownRef = useRef(false);
  
  const [userName, setUserName] = useState("");
  const [userRole, setUserRole] = useState("");
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [activeMeetingStatus, setActiveMeetingStatus] = useState<string>("COMPLETED");

  const meetingMatch = pathname ? pathname.match(/^\/meetings\/([^\/]+)$/) : null;
  const activeMeetingId = meetingMatch ? meetingMatch[1] : null;
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
        eraseCookie("mock_mode");
        eraseCookie("isAuthenticated");
        setIsAuthenticated(false);
        toast.error("Session expired. Please sign in again.");
        router.push("/login");
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
    const hasAuthCookie = getCookie("isAuthenticated") === "true";

    if (!isMockMode && !hasAuthCookie) {
      eraseCookie("mock_mode");
      eraseCookie("isAuthenticated");
      setIsAuthenticated(false);
      toast.error("No authentication found. Please sign in.");
      router.push("/login");
      setLoading(false);
      return;
    }

    if (isMockMode) {
      setUserName("Vivek Singh Bora");
      setUserRole("Admin");
      setIsAuthenticated(true);
      setLoading(false);
    } else {
      fetchProfile();
    }
  }, [fetchProfile, router]);

  useEffect(() => {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);
        if (response.status === 401 || response.status === 403) {
          const urlString = typeof args[0] === 'string' ? args[0] : (args[0] instanceof Request ? args[0].url : '');
          const isBackendApi = urlString.includes('/api/v1/') || urlString.includes(':8000/api/');
          if (isBackendApi && !urlString.includes('/api/v1/auth/logout') && !urlString.includes('/api/v1/auth/me')) {
            eraseCookie("mock_mode");
            eraseCookie("isAuthenticated");
            setIsAuthenticated(false);
            
            if (!logoutToastShownRef.current) {
              logoutToastShownRef.current = true;
              toast.error("Session expired. Please sign in again.");
              setTimeout(() => {
                logoutToastShownRef.current = false;
              }, 5000);
            }
            router.push("/login");
          }
        }
        return response;
      } catch (error) {
        throw error;
      }
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [router]);

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
    toast.success("Signed out successfully.");
    router.push("/login");
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
    <div className="h-screen flex flex-col selection:bg-[#113229] selection:text-white text-[#0F172A] bg-[#F8FAFC] overflow-hidden relative">
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
        <div className={`flex-1 h-full bg-[#F8FAFC] ${isAIWorkspaceActive ? "overflow-hidden" : "overflow-y-auto"}`}>
          {children}
        </div>
      </div>

      {/* Floating Chatbot Toggle Button */}
      <button
        onClick={() => setIsChatOpen(!isChatOpen)}
        aria-label={isChatOpen ? "Close AI Chat Assistant" : "Open AI Chat Assistant"}
        aria-expanded={isChatOpen}
        className="fixed bottom-8 right-8 z-50 p-4 bg-gradient-to-r from-[#113229] to-[#1E4D40] hover:from-[#1A4B3D] hover:to-[#255D4E] text-white rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 flex items-center justify-center border border-white/20 ring-4 ring-[#113229]/10 cursor-pointer"
        title="Open Chat Assistant"
      >
        {isChatOpen ? (
          <X className="w-5.5 h-5.5 text-white" aria-hidden="true" />
        ) : (
          <MessageSquare className="w-5.5 h-5.5 text-white animate-pulse" aria-hidden="true" />
        )}
      </button>

      {/* Floating Chatbot Window */}
      {isChatOpen && (
        <div 
          role="dialog"
          aria-label="AI Chat Assistant"
          className="fixed bottom-24 right-8 z-50 w-[750px] max-w-[calc(100vw-3rem)] h-[600px] max-h-[calc(100vh-8rem)] rounded-3xl bg-white border border-slate-200/80 shadow-2xl overflow-hidden flex flex-col animate-fade-in-up"
        >
          <ChatWindow meetingId={activeMeetingId} status={activeMeetingStatus} />
        </div>
      )}
    </div>
  );
}

