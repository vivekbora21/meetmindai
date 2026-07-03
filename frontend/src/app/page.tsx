"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Brain, Cpu, MessageSquare, Shield, Activity, Network, CheckCircle, ArrowRight, Loader2 } from "lucide-react";
import { getApiUrl } from "./config";

const setCookie = (name: string, value: string, maxAgeSeconds: number = 86400) => {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${value}; max-age=${maxAgeSeconds}; path=/; SameSite=Lax`;
};

const eraseCookie = (name: string) => {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; max-age=0; path=/; SameSite=Lax`;
};

export default function Home() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [organization, setOrganization] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const router = useRouter();

  const getCookie = (name: string): string | null => {
    if (typeof document === "undefined") return null;
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    if (match) return match[2];
    return null;
  };

  useEffect(() => {
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

    const endpoint = isLogin ? "/api/v1/auth/token" : "/api/v1/auth/register";
    const body = isLogin 
      ? new URLSearchParams({ username: email, password: password }) 
      : JSON.stringify({ name, email, password, organization_name: organization });

    const headers = isLogin 
      ? { "Content-Type": "application/x-www-form-urlencoded" }
      : { "Content-Type": "application/json" };

    try {
      if (email === "" || password === "") {
        throw new Error("Please enter credentials");
      }

      // Simulate API call for local testing or hit actual backend if running
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
            // Automatically log in after registration
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
        // Fallback developer login bypass
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

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-[#fffaf4] flex flex-col items-center justify-center gap-4">
        <div className="p-3 bg-[#205866] rounded-2xl shadow-lg shadow-[#205866]/15 animate-bounce">
          <Brain className="w-8 h-8 text-[#fffaf4]" />
        </div>
        <div className="flex items-center gap-2">
          <Loader2 className="w-5 h-5 text-[#205866] animate-spin" />
          <span className="font-outfit text-sm font-medium text-[#6d6473]">
            Verifying session...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-between selection:bg-[#2f7c8f] selection:text-white text-[#18161f]">
      {/* Header */}
      <header className="w-full max-w-7xl px-6 py-6 flex items-center justify-between border-b border-[#d8cfc2]">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl flex items-center justify-center bg-[#205866] shadow-lg shadow-[#205866]/20">
            <Brain className="w-6 h-6 text-[#fffaf4]" />
          </div>
          <span className="font-bold text-xl tracking-tight font-outfit text-[#18161f]">
            MeetingMind AI
          </span>
        </div>
        <div className="flex items-center gap-4">
          <a href="#features" className="text-[#6d6473] hover:text-[#18161f] text-sm transition-colors">Features</a>
          <a href="#architecture" className="text-[#6d6473] hover:text-[#18161f] text-sm transition-colors">Architecture</a>
        </div>
      </header>

      {/* Hero Section */}
      <main className="w-full max-w-7xl px-6 py-16 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center flex-grow">
        {/* Left Side: Product description */}
        <div className="lg:col-span-7 flex flex-col gap-6 text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#2f7c8f]/10 border border-[#2f7c8f]/20 text-[#205866] text-xs font-medium w-fit">
            <Cpu className="w-3.5 h-3.5" /> Next-Generation Organizational Memory
          </div>
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight font-outfit leading-none text-[#18161f]">
            The AI that remembers what your team decided.
          </h1>
          <p className="text-[#5f5767] text-lg max-w-xl">
            MeetingMind AI goes beyond transcription. It extracts decisions, maps connections, maintains long-term memory, and acts as an intelligent partner for your company's knowledge base.
          </p>

          {/* Key metrics / Trust signals */}
          <div className="grid grid-cols-3 gap-6 pt-6 border-t border-[#d8cfc2] max-w-lg">
            <div>
              <div className="text-2xl font-bold text-[#18161f]">99.8%</div>
              <div className="text-xs text-[#6d6473]">Diarization Accuracy</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-[#18161f]">&lt; 3 mins</div>
              <div className="text-xs text-[#6d6473]">Processing Time</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-[#18161f]">100%</div>
              <div className="text-xs text-[#6d6473]">GDPR Compliance</div>
            </div>
          </div>
        </div>

        {/* Right Side: Auth widget */}
        <div className="lg:col-span-5 flex justify-center lg:justify-end">
          <div className="w-full max-w-md p-8 rounded-[28px] soft-card flex flex-col gap-6">
            <div className="flex flex-col gap-1">
              <h2 className="text-2xl font-bold tracking-tight font-outfit text-[#18161f]">
                {isLogin ? "Welcome back" : "Create an account"}
              </h2>
              <p className="text-xs text-[#6d6473]">
                {isLogin ? "Sign in to access organizational memory" : "Set up your company space in seconds"}
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleAuth} className="flex flex-col gap-4">
              {!isLogin && (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-zinc-400">Full Name</label>
                    <input 
                      type="text" 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Vivek Sharma" 
                    className="px-4 py-2 rounded-xl bg-white border border-[#d8cfc2] focus:outline-none focus:border-[#2f7c8f] text-sm transition-colors"
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-zinc-400">Organization Name</label>
                    <input 
                      type="text" 
                      value={organization}
                      onChange={(e) => setOrganization(e.target.value)}
                      placeholder="Acme Corp" 
                    className="px-4 py-2 rounded-xl bg-white border border-[#d8cfc2] focus:outline-none focus:border-[#2f7c8f] text-sm transition-colors"
                      required
                    />
                  </div>
                </>
              )}

              <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-[#6d6473]">Work Email</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vivek@company.com" 
                  className="px-4 py-2 rounded-lg bg-zinc-950 border border-zinc-800 focus:outline-none focus:border-violet-500 text-sm transition-colors"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-[#6d6473]">Password</label>
                  {isLogin && <a href="#" className="text-[10px] text-[#2f7c8f] hover:underline">Forgot password?</a>}
                </div>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" 
                  className="px-4 py-2 rounded-xl bg-white border border-[#d8cfc2] focus:outline-none focus:border-[#2f7c8f] text-sm transition-colors"
                  required
                />
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-[#205866] hover:bg-[#2f7c8f] text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2 mt-2 disabled:opacity-50 shadow-lg shadow-[#205866]/15"
              >
                {loading ? "Authenticating..." : isLogin ? "Sign In" : "Sign Up"}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <div className="text-center">
              <button 
                onClick={() => setIsLogin(!isLogin)} 
                className="text-xs text-[#6d6473] hover:text-[#18161f] transition-colors"
              >
                {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Feature Grid */}
      <section id="features" className="w-full py-20 flex justify-center">
        <div className="w-full max-w-7xl px-6 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 rounded-[24px] soft-card flex flex-col gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#2f7c8f]/10 border border-[#2f7c8f]/20 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-[#205866]" />
            </div>
            <h3 className="text-lg font-bold font-outfit text-[#18161f]">Interactive Memory Chat</h3>
            <p className="text-[#5f5767] text-sm">
              Query past meetings directly with AI Chat. Ask who owns specific items, what deployment blockers exist, or when choices were made.
            </p>
          </div>
          <div className="p-6 rounded-[24px] soft-card flex flex-col gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#c57b57]/10 border border-[#c57b57]/20 flex items-center justify-center">
              <Network className="w-5 h-5 text-[#9a5431]" />
            </div>
            <h3 className="text-lg font-bold font-outfit text-[#18161f]">Organizational Knowledge Graph</h3>
            <p className="text-[#5f5767] text-sm">
              Connect people, projects, repositories, choices, and technologies dynamically. See exactly how your engineering systems interlock.
            </p>
          </div>
          <div className="p-6 rounded-[24px] soft-card flex flex-col gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#2f7c8f]/10 border border-[#2f7c8f]/20 flex items-center justify-center">
              <Activity className="w-5 h-5 text-[#205866]" />
            </div>
            <h3 className="text-lg font-bold font-outfit text-[#18161f]">Analytics & Health Trends</h3>
            <p className="text-[#5f5767] text-sm">
              Monitor decision velocity, active risk scores, meeting duration distributions, and overall organizational alignment metrics.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full max-w-7xl px-6 py-8 flex flex-col sm:flex-row items-center justify-between text-[#6d6473] text-xs border-t border-[#d8cfc2] gap-4">
        <span>© 2026 MeetingMind AI. All rights reserved.</span>
        <div className="flex gap-4">
          <a href="#" className="hover:text-zinc-300">Privacy Policy</a>
          <a href="#" className="hover:text-zinc-300">Terms of Service</a>
          <a href="#" className="hover:text-zinc-300">Security Architecture</a>
        </div>
      </footer>
    </div>
  );
}
