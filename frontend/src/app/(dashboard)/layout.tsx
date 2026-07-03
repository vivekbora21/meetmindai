"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Brain, Loader2 } from "lucide-react";
import { getApiUrl } from "../config";
import Sidebar from "../components/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  
  const [userName, setUserName] = useState("");
  const [userRole, setUserRole] = useState("");
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

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

  useEffect(() => {
    const isMockMode = getCookie("mock_mode") === "true";
    if (isMockMode) {
      setUserName("Vivek Sharma");
      setUserRole("Admin");
      setIsAuthenticated(true);
      setLoading(false);
    } else {
      fetchProfile();
    }
  }, []);

  const fetchProfile = async () => {
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
    } catch (e) {
      console.warn("Backend not active. Falling back to mock details.");
      setUserName("Vivek Sharma");
      setUserRole("Admin");
      setIsAuthenticated(true);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch(getApiUrl("/api/v1/auth/logout"), {
        method: "POST",
        credentials: "include"
      });
    } catch (e) {
      console.warn("Could not reach logout endpoint on backend.");
    }
    eraseCookie("mock_mode");
    eraseCookie("isAuthenticated");
    setIsAuthenticated(false);
    router.push("/");
  };

  if (isAuthenticated !== true) {
    return (
      <div className="min-h-screen bg-[#fffaf4] flex flex-col items-center justify-center gap-4">
        <div className="p-3 bg-[#205866] rounded-2xl shadow-lg shadow-[#205866]/15 animate-bounce">
          <Brain className="w-8 h-8 text-[#fffaf4]" />
        </div>
        <div className="flex items-center gap-2">
          <Loader2 className="w-5 h-5 text-[#205866] animate-spin" />
          <span className="font-outfit text-sm font-medium text-[#6d6473]">
            {isAuthenticated === false ? "Redirecting to login..." : "Verifying session..."}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex selection:bg-[#2f7c8f] selection:text-white text-[#18161f]">
      <Sidebar 
        userName={userName} 
        userRole={userRole} 
        loading={loading} 
        onLogout={handleLogout} 
      />

      {/* Main Workspace - Controlled height and independent scrolling */}
      <div className="flex-1 overflow-y-auto h-screen">
        {children}
      </div>
    </div>
  );
}
