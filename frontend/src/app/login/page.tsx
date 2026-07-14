"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Loader2, Eye, EyeOff, Network, GitBranch, Calendar, Video, MessageSquare, Bot, Zap } from "lucide-react";
import { Logo } from "../components/Logo";
import { getApiUrl } from "../config";


const setCookie = (name: string, value: string, maxAgeSeconds: number = 86400) => {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${value}; max-age=${maxAgeSeconds}; path=/; SameSite=Lax`;
};

const eraseCookie = (name: string) => {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; max-age=0; path=/; SameSite=Lax`;
};

export default function Home() {
  const [isLogin, setIsLogin] = useState(false); // Default to registration based on image
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [organization, setOrganization] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState<"graph" | "stream" | "apps">("graph");
  const [streamStep, setStreamStep] = useState(0);
  const router = useRouter();

  useEffect(() => {
    if (activeTab !== "stream") return;
    const interval = setInterval(() => {
      setStreamStep((prev) => (prev + 1) % 4);
    }, 4000);
    return () => clearInterval(interval);
  }, [activeTab]);

  useEffect(() => {
    setEmail("");
    setPassword("");
    setFirstName("");
    setLastName("");
    setOrganization("");
    setError("");
    setShowPassword(false);
  }, [isLogin]);

  const getCookie = (name: string): string | null => {
    if (typeof document === "undefined") return null;
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    if (match) return match[2];
    return null;
  };

  useEffect(() => {
    // Check URL parameters for initial tab selection and errors
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const mode = params.get("mode");
      if (mode === "login") {
        setIsLogin(true);
      } else if (mode === "signup") {
        setIsLogin(false);
      }
      const errorParam = params.get("error");
      if (errorParam) {
        setError(errorParam);
      }
    }

    const isMockMode = getCookie("mock_mode") === "true";
    const hasAuthCookie = getCookie("isAuthenticated") === "true";

    if (!isMockMode && !hasAuthCookie) {
      setCheckingAuth(false);
      return;
    }

    const checkAuth = async () => {
      if (isMockMode) {
        router.push("/dashboard");
        return;
      }
      try {
        const res = await fetch(getApiUrl("/api/v1/auth/me"), {
          credentials: "include"
        });
        if (res.ok) {
          router.push("/dashboard");
          return;
        } else {
          eraseCookie("isAuthenticated");
        }
      } catch (e) {
        // Backend not active, bypass auto-redirect
      }
      setCheckingAuth(false);
    };
    checkAuth();
  }, [router]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const name = `${firstName} ${lastName}`.trim();

    const endpoint = isLogin ? "/api/v1/auth/token" : "/api/v1/auth/register";
    const body = isLogin 
      ? new URLSearchParams({ username: email, password: password }) 
      : JSON.stringify({ name, email, password, organization_name: organization || "Personal Workspace" });

    const headers = isLogin 
      ? { "Content-Type": "application/x-www-form-urlencoded" }
      : { "Content-Type": "application/json" };

    try {
      if (email === "" || password === "") {
        throw new Error("Please enter credentials");
      }

      let isBackendReachable = true;
      let response;
      try {
        response = await fetch(getApiUrl(endpoint), {
          method: "POST",
          headers,
          body,
          credentials: "include",
        });
      } catch (err: any) {
        console.warn("Backend not reachable. Logging in with developer mock environment...", err);
        isBackendReachable = false;
      }

      if (isBackendReachable && response) {
        if (response.ok) {
          const data = await response.json();
          let tokenData = data;
          
          if (!isLogin) {
            const tokenResponse = await fetch(getApiUrl("/api/v1/auth/token"), {
              method: "POST",
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
              body: new URLSearchParams({ username: email, password: password }),
              credentials: "include",
            });
            if (tokenResponse.ok) {
              tokenData = await tokenResponse.json();
            } else {
              const errorData = await tokenResponse.json().catch(() => ({}));
              throw new Error(errorData.detail || "Registration succeeded but auto-login failed. Please sign in.");
            }
          }

          if (tokenData && tokenData.access_token) {
            eraseCookie("mock_mode");
            setCookie("isAuthenticated", "true", 86400);
            router.push("/dashboard");
            return;
          }
        } else {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.detail || "Authentication failed");
        }
      } else {
        setCookie("mock_mode", "true");
        setCookie("isAuthenticated", "true", 86400);
        router.push("/dashboard");
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = (provider: "google" | "microsoft") => {
    setError("");
    window.location.href = getApiUrl(`/api/v1/auth/social/${provider}/login`);
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-[#FDFCF8] flex flex-col items-center justify-center gap-4">
        <div className="p-3 bg-[#0B251F] rounded-2xl shadow-lg animate-bounce">
          <Network className="w-8 h-8 text-[#64E0AA]" />
        </div>
        <div className="flex items-center gap-2">
          <Loader2 className="w-5 h-5 text-[#0B251F] animate-spin" />
          <span className="text-sm font-medium text-slate-500">
            Verifying session...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex bg-[#F9F8F6] text-gray-900 font-sans overflow-hidden relative">
      
      {/* Left Side: Product Showcase (Dark Green) */}
      <div className="hidden md:flex md:w-1/2 bg-[#102C23] p-8 sm:p-12 lg:p-16 flex-col justify-between relative h-full border-r border-[#1f4538] shadow-[10px_0_30px_-10px_rgba(16,44,35,0.3)] z-10 overflow-hidden">
        {/* Spotlights and patterns for rich aesthetics */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#16392e_1px,transparent_1px),linear-gradient(to_bottom,#16392e_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-30"></div>
        <div className="absolute -right-20 top-20 w-[300px] h-[300px] bg-[#64E0AA]/10 rounded-full blur-3xl"></div>
        
        {/* Floating Logo (inside column, no header block) */}
        <div className="relative z-20">
          <Link href="/">
            <Logo invert />
          </Link>
        </div>

        {/* Content Showcase */}
        <div className="relative z-20 my-auto py-2 max-w-xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#183d31] border border-[#275949] w-fit animate-fade-in-up">
            <div className="w-1.5 h-1.5 rounded-full bg-[#64E0AA]"></div>
            <span className="text-[#64E0AA] text-[10px] font-bold tracking-widest uppercase">
              Next-Generation Organizational Memory
            </span>
          </div>

          <h1 className="text-2xl lg:text-3xl xl:text-4xl font-extrabold tracking-tight leading-[1.1] text-white animate-fade-in-up delay-100">
            The AI that remembers<br/>
            <span className="text-[#64E0AA]">what your team</span><br/>
            decided.
          </h1>

          <p className="text-[#9DB2AA] text-xs leading-relaxed max-w-md animate-fade-in-up delay-200">
            MeetingMind AI extracts decisions, maps connections, and holds long-term memory of every conversation — so nothing your team agreed on gets lost.
          </p>

          {/* Interactive Showcase Tabs Switcher */}
          <div className="flex bg-[#14352b] p-1 rounded-xl border border-[#1f4538] w-fit animate-fade-in-up delay-250">
            <button
              onClick={() => setActiveTab("graph")}
              type="button"
              className={`px-3 py-1.5 rounded-lg text-[9px] font-bold tracking-wider uppercase transition-all duration-300 ${
                activeTab === "graph"
                  ? "bg-[#64E0AA] text-[#102C23] shadow-sm"
                  : "text-[#9DB2AA] hover:text-white"
              }`}
            >
              Memory Map
            </button>
            <button
              onClick={() => setActiveTab("stream")}
              type="button"
              className={`px-3 py-1.5 rounded-lg text-[9px] font-bold tracking-wider uppercase transition-all duration-300 ${
                activeTab === "stream"
                  ? "bg-[#64E0AA] text-[#102C23] shadow-sm"
                  : "text-[#9DB2AA] hover:text-white"
              }`}
            >
              Live Stream
            </button>
            <button
              onClick={() => setActiveTab("apps")}
              type="button"
              className={`px-3 py-1.5 rounded-lg text-[9px] font-bold tracking-wider uppercase transition-all duration-300 ${
                activeTab === "apps"
                  ? "bg-[#64E0AA] text-[#102C23] shadow-sm"
                  : "text-[#9DB2AA] hover:text-white"
              }`}
            >
              Integrations
            </button>
          </div>

          {/* Tab Content Panels */}
          <div className="h-[250px] w-full flex flex-col justify-center select-none relative z-20">
            {activeTab === "graph" && (
              <div className="relative w-full h-full flex items-center justify-center animate-fade-in-up">
                <svg width="100%" height="100%" viewBox="0 0 400 240" className="overflow-visible animate-float">
                  {/* Lines */}
                  <line x1="50" y1="50" x2="190" y2="120" stroke="#2D5B4B" strokeWidth="1.5" className="animate-draw" />
                  <line x1="50" y1="50" x2="110" y2="200" stroke="#2D5B4B" strokeWidth="1.5" className="animate-draw" style={{ animationDelay: '0.2s' }} />
                  <line x1="110" y1="200" x2="190" y2="120" stroke="#2D5B4B" strokeWidth="1.5" className="animate-draw" style={{ animationDelay: '0.4s' }} />
                  
                  <line x1="190" y1="120" x2="340" y2="50" stroke="#2D5B4B" strokeWidth="1.5" className="animate-draw" style={{ animationDelay: '0.1s' }} />
                  <line x1="190" y1="120" x2="300" y2="200" stroke="#2D5B4B" strokeWidth="1.5" className="animate-draw" style={{ animationDelay: '0.3s' }} />
                  <line x1="340" y1="50" x2="300" y2="200" stroke="#2D5B4B" strokeWidth="1.5" className="animate-draw" style={{ animationDelay: '0.5s' }} />
                  
                  {/* Nodes Backgrounds */}
                  <circle cx="50" cy="50" r="18" fill="none" stroke="#204A3C" strokeWidth="4" className="animate-pulse-node" style={{ animationDelay: '0s' }} />
                  <circle cx="110" cy="200" r="18" fill="none" stroke="#204A3C" strokeWidth="4" className="animate-pulse-node" style={{ animationDelay: '0.5s' }} />
                  <circle cx="340" cy="50" r="18" fill="none" stroke="#204A3C" strokeWidth="4" className="animate-pulse-node" style={{ animationDelay: '1s' }} />
                  <circle cx="300" cy="200" r="18" fill="none" stroke="#204A3C" strokeWidth="4" className="animate-pulse-node" style={{ animationDelay: '1.5s' }} />
                  
                  {/* Center Node Background */}
                  <circle cx="190" cy="120" r="22" fill="none" stroke="#4A3C20" strokeWidth="4" className="animate-pulse-node" style={{ animationDelay: '2s' }} />
                  
                  {/* Inner Nodes */}
                  <circle cx="50" cy="50" r="8" fill="#4B967D" />
                  <circle cx="110" cy="200" r="8" fill="#4B967D" />
                  <circle cx="340" cy="50" r="8" fill="#4B967D" />
                  <circle cx="300" cy="200" r="8" fill="#4B967D" />
                  
                  {/* Center Inner Node */}
                  <circle cx="190" cy="120" r="10" fill="#D98A44" />
                  
                  {/* Labels */}
                  <text x="50" y="25" fill="#71988B" fontSize="9" fontWeight="bold" textAnchor="middle" letterSpacing="1">PERSON</text>
                  <text x="110" y="232" fill="#71988B" fontSize="9" fontWeight="bold" textAnchor="middle" letterSpacing="1">RISK</text>
                  <text x="340" y="25" fill="#71988B" fontSize="9" fontWeight="bold" textAnchor="middle" letterSpacing="1">REPO</text>
                  <text x="300" y="232" fill="#71988B" fontSize="9" fontWeight="bold" textAnchor="middle" letterSpacing="1">PROJECT</text>
                  <text x="190" y="88" fill="#9CA8A3" fontSize="9" fontWeight="bold" textAnchor="middle" letterSpacing="1">DECISION</text>
                </svg>

                {/* Floating micro glassmorphism details */}
                <div className="absolute top-2 left-2 bg-white/10 backdrop-blur-md border border-white/10 rounded-xl p-2.5 shadow-lg max-w-[125px] animate-fade-in-up">
                  <div className="flex items-center gap-1 mb-0.5">
                    <Bot className="w-3 h-3 text-[#64E0AA]" />
                    <span className="text-[8px] font-bold text-white uppercase tracking-wider">AI Map</span>
                  </div>
                  <p className="text-[9px] text-[#C1D2CA] leading-snug">Auto-linked decision node to main project repo.</p>
                </div>

                <div className="absolute bottom-2 right-2 bg-white/10 backdrop-blur-md border border-white/10 rounded-xl p-2.5 shadow-lg max-w-[125px] animate-fade-in-up delay-200">
                  <div className="flex items-center gap-1 mb-0.5">
                    <Zap className="w-3 h-3 text-[#D98A44]" />
                    <span className="text-[8px] font-bold text-white uppercase tracking-wider">Active</span>
                  </div>
                  <p className="text-[9px] text-[#C1D2CA] leading-snug">"Deploy frontend via Vercel" approved by Team.</p>
                </div>
              </div>
            )}

            {activeTab === "stream" && (
              <div className="bg-[#14352b]/60 border border-[#1f4538] rounded-xl p-4 h-[240px] flex flex-col justify-between animate-fade-in-up">
                {/* Header bar */}
                <div>
                  <div className="flex items-center justify-between border-b border-[#1f4538] pb-2">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                      </span>
                      <span className="text-[10px] font-bold text-white tracking-wider uppercase">Syncing Microsoft Teams Audio</span>
                    </div>
                    {/* Audio Waveform simulation */}
                    <div className="flex items-end gap-[3px] h-3">
                      <div className="w-[3px] bg-[#64E0AA] rounded-full animate-wave-bar" style={{ animationDelay: "0.1s" }}></div>
                      <div className="w-[3px] bg-[#64E0AA] rounded-full animate-wave-bar" style={{ animationDelay: "0.3s" }}></div>
                      <div className="w-[3px] bg-[#64E0AA] rounded-full animate-wave-bar" style={{ animationDelay: "0.5s" }}></div>
                      <div className="w-[3px] bg-[#64E0AA] rounded-full animate-wave-bar" style={{ animationDelay: "0.2s" }}></div>
                      <div className="w-[3px] bg-[#64E0AA] rounded-full animate-wave-bar" style={{ animationDelay: "0.4s" }}></div>
                    </div>
                  </div>
                  {/* Transcript speech bubbles */}
                  <div className="mt-2.5 bg-[#183d31] border border-[#275949] rounded-lg p-2">
                    <span className="text-[8px] font-bold text-[#64E0AA] uppercase tracking-wider block mb-0.5">
                      {streamStep === 0 || streamStep === 1 ? "Vivek Singh" : streamStep === 2 ? "Alex Kumar" : "Sarah Chen"}
                    </span>
                    <p className="text-[11px] text-white italic leading-snug">
                      {streamStep === 0 || streamStep === 1 
                        ? '"Let\'s go ahead with PostgreSQL for storing our session states."' 
                        : streamStep === 2 
                        ? '"We also need Sarah to design the dashboard schema by Friday."' 
                        : '"Agreed. Just watch out for potential connection pool limits."'}
                    </p>
                  </div>
                </div>

                {/* AI Extracted items stack */}
                <div className="mt-3 flex-1 flex flex-col justify-end gap-1.5 overflow-hidden">
                  <div className="text-[9px] font-bold text-[#8A9F96] uppercase tracking-wider flex items-center gap-1.5">
                    <Bot className="w-3.5 h-3.5 text-[#64E0AA]" />
                    <span>MeetingMind AI Extraction</span>
                  </div>

                  {streamStep >= 1 && (
                    <div className="flex items-center gap-2 bg-[#183d31]/80 border border-[#275949] rounded-lg px-2.5 py-1.5 animate-fade-in-up">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#64E0AA] shrink-0"></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-[8px] font-bold text-[#64E0AA] uppercase tracking-wider">DECISION</span>
                          <span className="text-[7px] text-[#8A9F96]">Just now</span>
                        </div>
                        <p className="text-[10px] text-white font-medium truncate">Use PostgreSQL for session caching</p>
                      </div>
                    </div>
                  )}

                  {streamStep >= 2 && (
                    <div className="flex items-center gap-2 bg-[#183d31]/80 border border-[#275949] rounded-lg px-2.5 py-1.5 animate-fade-in-up">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#D98A44] shrink-0"></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-[8px] font-bold text-[#D98A44] uppercase tracking-wider">TASK ASSIGNED</span>
                          <span className="text-[7px] text-[#8A9F96]">Just now</span>
                        </div>
                        <p className="text-[10px] text-white font-medium truncate">@Sarah to design database schema by Friday</p>
                      </div>
                    </div>
                  )}

                  {streamStep >= 3 && (
                    <div className="flex items-center gap-2 bg-[#183d31]/80 border border-[#275949] rounded-lg px-2.5 py-1.5 animate-fade-in-up">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0"></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-[8px] font-bold text-red-400 uppercase tracking-wider">RISK IDENTIFIED</span>
                          <span className="text-[7px] text-[#8A9F96]">Just now</span>
                        </div>
                        <p className="text-[10px] text-white font-medium truncate">Potential database connection pool limits</p>
                      </div>
                    </div>
                  )}

                  {streamStep === 0 && (
                    <div className="flex items-center justify-center py-2 text-[10px] text-[#8A9F96] gap-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#64E0AA]" />
                      <span>Analyzing spoken decisions...</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "apps" && (
              <div className="grid grid-cols-2 gap-2.5 animate-fade-in-up">
                {/* Google Meet */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 flex items-center gap-2.5 hover:border-white/15 transition-all">
                  <div className="p-1.5 bg-white/10 rounded-lg shrink-0">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-bold text-white truncate">Google Meet</div>
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#64E0AA] animate-pulse"></div>
                      <span className="text-[8px] text-[#8A9F96]">Linked & Syncing</span>
                    </div>
                  </div>
                </div>

                {/* MS Teams */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 flex items-center gap-2.5 hover:border-white/15 transition-all">
                  <div className="p-1.5 bg-white/10 rounded-lg shrink-0">
                    <svg width="14" height="14" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M10 0H0V10H10V0Z" fill="#F25022"/>
                      <path d="M21 0H11V10H21V0Z" fill="#7FBA00"/>
                      <path d="M10 11H0V21H10V11Z" fill="#00A4EF"/>
                      <path d="M21 11H11V21H21V11Z" fill="#FFB900"/>
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-bold text-white truncate">MS Teams</div>
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#64E0AA] animate-pulse"></div>
                      <span className="text-[8px] text-[#8A9F96]">Linked</span>
                    </div>
                  </div>
                </div>

                {/* Zoom */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 flex items-center gap-2.5 hover:border-white/15 transition-all">
                  <div className="p-1.5 bg-white/10 rounded-lg shrink-0">
                    <Video className="w-3.5 h-3.5 text-[#64E0AA]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-bold text-white truncate">Zoom Rooms</div>
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#64E0AA] animate-pulse"></div>
                      <span className="text-[8px] text-[#8A9F96]">Linked & Syncing</span>
                    </div>
                  </div>
                </div>

                {/* Slack */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 flex items-center gap-2.5 hover:border-white/15 transition-all">
                  <div className="p-1.5 bg-white/10 rounded-lg shrink-0">
                    <MessageSquare className="w-3.5 h-3.5 text-purple-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-bold text-white truncate">Slack Webhook</div>
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#64E0AA] animate-pulse"></div>
                      <span className="text-[8px] text-[#8A9F96]">Linked</span>
                    </div>
                  </div>
                </div>

                {/* GitHub */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 flex items-center gap-2.5 hover:border-white/15 transition-all">
                  <div className="p-1.5 bg-white/10 rounded-lg shrink-0">
                    <GitBranch className="w-3.5 h-3.5 text-pink-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-bold text-white truncate">GitHub Issues</div>
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#64E0AA] animate-pulse"></div>
                      <span className="text-[8px] text-[#8A9F96]">Linked</span>
                    </div>
                  </div>
                </div>

                {/* Google Calendar */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 flex items-center gap-2.5 hover:border-white/15 transition-all">
                  <div className="p-1.5 bg-white/10 rounded-lg shrink-0">
                    <Calendar className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-bold text-white truncate">GCal Sync</div>
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#64E0AA] animate-pulse"></div>
                      <span className="text-[8px] text-[#8A9F96]">Linked & Syncing</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Stats */}
        <div className="relative z-20 mt-auto pt-6 border-t border-[#1F4538] grid grid-cols-3 gap-6 animate-fade-in-up delay-400">
          <div>
            <div className="text-2xl font-extrabold text-white mb-1">99.8%</div>
            <div className="text-xs text-[#8A9F96] font-semibold uppercase tracking-wider">Accuracy</div>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-white mb-1">&lt;3 min</div>
            <div className="text-xs text-[#8A9F96] font-semibold uppercase tracking-wider">Processing</div>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-white mb-1">100%</div>
            <div className="text-xs text-[#8A9F96] font-semibold uppercase tracking-wider">Secure</div>
          </div>
        </div>
      </div>

      {/* Right Side: Auth Form (Light Warm Background) */}
      <div className="w-full md:w-1/2 p-6 sm:p-10 lg:p-16 flex flex-col justify-between h-full relative bg-[#F9F8F6] overflow-hidden">
        {/* Soft background glow to match and blend */}
        <div className="absolute bottom-0 right-0 translate-y-1/4 translate-x-1/4 w-[400px] h-[400px] bg-[#64E0AA]/10 rounded-full blur-3xl"></div>
        <div className="absolute top-0 left-0 -translate-y-1/4 -translate-x-1/4 w-[400px] h-[400px] bg-[#102C23]/5 rounded-full blur-3xl"></div>
        
        {/* Back to Home floating top right */}
        <div className="flex justify-end relative z-20">
          <Link 
            href="/" 
            className="text-slate-600 hover:text-slate-900 text-sm font-semibold transition-colors flex items-center gap-1.5"
          >
            &larr; Back to Home
          </Link>
        </div>

        {/* Form Container */}
        <div className="w-full max-w-[400px] mx-auto my-auto py-4 relative z-20 flex flex-col justify-center animate-fade-in-up delay-100">
          {/* Toggle Switch */}
          <div className="flex bg-slate-200/50 p-1.5 rounded-xl mb-4 border border-slate-200/50 backdrop-blur-sm">
            <button 
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2 text-xs rounded-lg transition-all duration-300 font-bold ${isLogin ? 'bg-white shadow-sm text-[#102C23]' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Sign in
            </button>
            <button 
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2 text-xs rounded-lg transition-all duration-300 font-bold ${!isLogin ? 'bg-white shadow-sm text-[#102C23]' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Create account
            </button>
          </div>

          <div className="mb-4 flex flex-col gap-1.5">
            <h2 className="text-2xl lg:text-3xl font-extrabold font-outfit text-[#102C23] tracking-tight">
              {isLogin ? "Welcome back" : "Create your account"}
            </h2>
            <p className="text-slate-500 text-xs font-medium leading-relaxed">
              {isLogin ? "Sign in to access your organization's memory." : "Give your team a memory that never forgets a decision."}
            </p>
          </div>

          {error && (
            <div className="p-3 mb-4 rounded-lg bg-red-50 border border-red-100 text-red-600 text-xs font-semibold">
              {error}
            </div>
          )}

          <form onSubmit={handleAuth} className="flex flex-col gap-3">
            {!isLogin && (
              <div className="flex gap-4">
                <div className="flex-1 flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">First name</label>
                  <input 
                    key="signup-firstname"
                    type="text" 
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Vivek" 
                    autoComplete="given-name"
                    className="w-full px-3.5 py-2 rounded-lg bg-white border border-slate-200 focus:outline-none focus:border-[#102C23] focus:ring-1 focus:ring-[#102C23] text-sm text-gray-900 shadow-sm transition-all placeholder:text-slate-400"
                    required={!isLogin}
                  />
                </div>
                <div className="flex-1 flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Last name</label>
                  <input 
                    key="signup-lastname"
                    type="text" 
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Singh" 
                    autoComplete="family-name"
                    className="w-full px-3.5 py-2 rounded-lg bg-white border border-slate-200 focus:outline-none focus:border-[#102C23] focus:ring-1 focus:ring-[#102C23] text-sm text-gray-900 shadow-sm transition-all placeholder:text-slate-400"
                    required={!isLogin}
                  />
                </div>
              </div>
            )}

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Work email</label>
              {isLogin ? (
                <input 
                  key="login-email"
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com" 
                  autoComplete="username"
                  className="w-full px-3.5 py-2 rounded-lg bg-white border border-slate-200 focus:outline-none focus:border-[#102C23] focus:ring-1 focus:ring-[#102C23] text-sm text-gray-900 shadow-sm transition-all placeholder:text-slate-400"
                  required
                />
              ) : (
                <input 
                  key="signup-email"
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com" 
                  autoComplete="email"
                  className="w-full px-3.5 py-2 rounded-lg bg-white border border-slate-200 focus:outline-none focus:border-[#102C23] focus:ring-1 focus:ring-[#102C23] text-sm text-gray-900 shadow-sm transition-all placeholder:text-slate-400"
                  required
                />
              )}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Password</label>
              <div className="relative">
                {isLogin ? (
                  <input 
                    key="login-password"
                    type={showPassword ? "text" : "password"} 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters" 
                    autoComplete="current-password"
                    className="w-full px-3.5 py-2 rounded-lg bg-white border border-slate-200 focus:outline-none focus:border-[#102C23] focus:ring-1 focus:ring-[#102C23] text-sm text-gray-900 shadow-sm transition-all placeholder:text-slate-400 pr-10"
                    required
                  />
                ) : (
                  <input 
                    key="signup-password"
                    type={showPassword ? "text" : "password"} 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters" 
                    autoComplete="new-password"
                    className="w-full px-3.5 py-2 rounded-lg bg-white border border-slate-200 focus:outline-none focus:border-[#102C23] focus:ring-1 focus:ring-[#102C23] text-sm text-gray-900 shadow-sm transition-all placeholder:text-slate-400 pr-10"
                    required
                  />
                )}
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>  
            </div>

            {isLogin && (
              <div className="text-right text-xs">
                <a 
                  href="#" 
                  onClick={(e) => {
                    e.preventDefault();
                    setError("Password reset functionality is not configured. Please contact your organization administrator.");
                  }}
                  className="text-[#113229] font-semibold hover:underline"
                >
                  Forgot your password?
                </a>
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-[#113229] hover:bg-[#0D241E] text-white font-bold text-sm transition-all duration-300 flex items-center justify-center gap-2 mt-1.5 disabled:opacity-50 hover:-translate-y-0.5 hover:shadow-lg shadow-black/10"
            >
              {loading ? "Please wait..." : isLogin ? "Sign in" : "Create account"}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="my-4 flex items-center before:flex-1 before:border-t before:border-slate-200 after:flex-1 after:border-t after:border-slate-200">
            <span className="px-4 text-[10px] text-slate-400 uppercase font-bold tracking-wider">or continue with</span>
          </div>

          <div className="flex gap-4 mb-4">
            <button 
              type="button"
              onClick={() => handleSocialLogin("google")}
              className="flex-1 flex items-center justify-center gap-2 bg-white border border-slate-200 rounded-lg py-2.5 text-xs font-bold text-[#0f172a] hover:bg-slate-50 transition-all duration-300 shadow-sm hover:shadow-md hover:-translate-y-0.5"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Google
            </button>
            <button 
              type="button"
              onClick={() => handleSocialLogin("microsoft")}
              className="flex-1 flex items-center justify-center gap-2 bg-white border border-slate-200 rounded-lg py-2.5 text-xs font-bold text-[#0f172a] hover:bg-slate-50 transition-all duration-300 shadow-sm hover:shadow-md hover:-translate-y-0.5"
            >
              <svg width="16" height="16" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 0H0V10H10V0Z" fill="#F25022"/>
                <path d="M21 0H11V10H21V0Z" fill="#7FBA00"/>
                <path d="M10 11H0V21H10V11Z" fill="#00A4EF"/>
                <path d="M21 11H11V21H21V11Z" fill="#FFB900"/>
              </svg>
              Microsoft
            </button>
          </div>

          <p className="text-[10px] text-slate-400 text-center leading-relaxed max-w-sm mx-auto">
            By creating an account, you agree to MeetingMind AI's <a href="#" className="font-bold text-[#0f172a] hover:underline">Terms</a> and <a href="#" className="font-bold text-[#0f172a] hover:underline">Privacy Policy</a>.
          </p>

          <div className="mt-4 text-center text-xs">
            <span className="text-slate-400 font-medium">
              {isLogin ? "Don't have an account? " : "Already have an account? "}
            </span>
            <button 
              onClick={() => setIsLogin(!isLogin)} 
              className="font-bold text-[#102C23] hover:underline ml-0.5"
            >
              {isLogin ? "Create account" : "Sign in"}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="w-full text-center text-[10px] text-slate-400 font-medium relative z-20">
          © {new Date().getFullYear()} MeetingMind AI. All rights reserved.
        </div>
      </div>
    </div>
  );
}
