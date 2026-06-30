"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, Calendar, Clock, User, CheckSquare, 
  AlertTriangle, ShieldAlert, Code2, MessageSquare, 
  Send, Sparkles, Plus, Loader2, Play, Pause, RefreshCw
} from "lucide-react";

export default function MeetingDetail({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);

  const [activeTab, setActiveTab] = useState("summary");
  const [isPlaying, setIsPlaying] = useState(false);
  const [playProgress, setPlayProgress] = useState(12); // Initial timeline play progress
  
  const [meetingDetail, setMeetingDetail] = useState<any>(null);

  // Chat state
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<any[]>([
    { role: "assistant", text: "Hi! I am the meeting intelligence assistant. Ask me anything about this discussion." }
  ]);
  const [chatLoading, setChatLoading] = useState(false);

  // Jira sync simulation state
  const [jiraSyncing, setJiraSyncing] = useState<Record<string, boolean>>({});
  const [jiraStatus, setJiraStatus] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchMeetingDetail();
  }, [id]);

  const fetchMeetingDetail = async () => {
    try {
      const res = await fetch(`http://localhost:8000/api/v1/meetings/${id}`, {
        credentials: "include"
      });
      if (res.ok) {
        const data = await res.json();
        setMeetingDetail(data);
        return;
      } else if (res.status === 401) {
        localStorage.clear();
        router.push("/");
      }
    } catch (e) {
      console.warn("Backend not reachable. Using fallback meeting detail.");
    }
    setMeetingDetail(mockMeetingDetail);
  };

  // Mock details data representation matching the vision
  const mockMeetingDetail = {
    id: "meet-1",
    title: "Authentication Architecture & Security Review",
    status: "Completed",
    platform: "Google Meet",
    recording_url: "https://example.com/mock-audio.mp3",
    duration_seconds: 2400,
    meeting_date: "2026-06-30T10:00:00",
    executive_summary: "In this session, the team resolved to replace our custom authentication solution with Auth.js/Clerk. Vivek Sharma will oversee the database modifications, ensuring organization segregation, while Alex Rivera will migrate the frontend components. We flagged risks around migrating legacy passwords and set a firm launch date for the staging release.",
    one_minute_read: "We are migrating from custom auth to Auth.js/Clerk for multi-tenancy support. Vivek Sharma owns database schemas, Alex Rivera owns frontend code. Staging release is targeted for Friday. Multi-tenancy isolation is enforced at the PostgreSQL layer via tenant ID checks.",
    followup_email: "Hi team,\n\nFollowing up on our authentication session today, we've finalized our migration plan to Auth.js/Clerk.\n\nKey Action Items:\n- DB multi-tenant schema edits (Vivek Sharma) - Due: July 3\n- Frontend OAuth and Clerk setup (Alex Rivera) - Due: July 5\n\nThanks,\nMeetingMind AI Workspace Admin",
    sentiment_summary: "High collaboration. Vivek Sharma showed urgency about database tenant protection. Agreement reached on Auth.js rather than self-hosting Redis.",
    speakers: [
      { speaker_tag: "SPEAKER_00", display_name: "Vivek Sharma" },
      { speaker_tag: "SPEAKER_01", display_name: "Alex Rivera" }
    ],
    transcripts: [
      { start_ms: 0, end_ms: 12000, speaker_tag: "SPEAKER_00", text: "Okay, let's start the security review. We need to decide if we are sticking with our self-hosted token authentication or migrating to a managed service." },
      { start_ms: 12000, end_ms: 32000, speaker_tag: "SPEAKER_01", text: "Migrating to Clerk or Auth.js would save us a lot of code complexity. It supports SAML and OAuth out of the box, which is a major requirement for our enterprise leads." },
      { start_ms: 32000, end_ms: 54000, speaker_tag: "SPEAKER_00", text: "Agreed. But we must ensure organization tenant isolation at the PostgreSQL layer. I will create a new tenant column in every table and write database helper utilities. Let's aim to have schemas ready by Friday." },
      { start_ms: 54000, end_ms: 78000, speaker_tag: "SPEAKER_01", text: "Great. I will handle the frontend auth logic. We can store the session tokens in Zustand and use TanStack Query for refetching." }
    ],
    action_items: [
      { id: "act-1", description: "Design PostgreSQL tenant isolation schemas & foreign key constraints", priority: "High", due_date: "2026-07-03", assigned_to: "Vivek Sharma", confidence_score: 0.98 },
      { id: "act-2", description: "Integrate Clerk / Auth.js in Next.js 15 routing files", priority: "High", due_date: "2026-07-05", assigned_to: "Alex Rivera", confidence_score: 0.94 }
    ],
    decisions: [
      { id: "dec-1", decision_text: "Migrate auth strategy from self-hosted token DB to Auth.js/Clerk", rationale: "Saves maintenance time and easily supports enterprise SAML/OAuth", confidence_score: 0.96 }
    ],
    risks: [
      { id: "risk-1", risk_text: "Legacy password migration conflict", mitigation: "Require password reset or implement custom hashing middleware", severity: "High" }
    ],
    questions: [
      { id: "q-1", question_text: "Do we need self-hosted Redis for token rate limiting?" }
    ],
    technical_context: {
      repositories: ["github.com/meetingmind/backend", "github.com/meetingmind/frontend"],
      files: ["backend/app/models.py", "frontend/src/app/layout.tsx"],
      apis: ["POST /api/v1/auth/token", "GET /api/v1/meetings"],
      database_tables: ["organizations", "users", "meetings"],
      services: ["Auth Service", "Worker Service"],
      libraries: ["PyJWT", "Zustand", "pgvector"]
    },
    timeline: [
      { time: "10:02", title: "Authentication discussion", desc: "Speaker_00 started reviewing custom token weaknesses" },
      { time: "10:12", title: "Migration debate", desc: "Speaker_01 proposed Clerk and Auth.js" },
      { time: "10:24", title: "Decision taken", desc: "Decision to move to Auth.js/Clerk finalized" },
      { time: "10:41", title: "Action assigned", desc: "Vivek Sharma assigned database architecture task" }
    ]
  };

  const handleJiraSync = (actionId: string) => {
    setJiraSyncing(prev => ({ ...prev, [actionId]: true }));
    // Simulate Jira API post
    setTimeout(() => {
      setJiraSyncing(prev => ({ ...prev, [actionId]: false }));
      const key = `MM-${Math.floor(Math.random() * 800) + 100}`;
      setJiraStatus(prev => ({ ...prev, [actionId]: key }));
    }, 1200);
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput) return;

    const userMsg = { role: "user", text: chatInput };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput("");
    setChatLoading(true);

    // Call FastAPI or run simulation
    try {
      const response = await fetch("http://localhost:8000/api/v1/search/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          meeting_id: id,
          question: chatInput
        }),
        credentials: "include"
      });
      if (response.ok) {
        const data = await response.json();
        setChatMessages(prev => [...prev, { role: "assistant", text: data.answer }]);
        setChatLoading(false);
        return;
      } else if (response.status === 401) {
        localStorage.clear();
        router.push("/");
      }
    } catch (e) {
      console.warn("Backend not active, simulating RAG response.");
    }

    setTimeout(() => {
      let reply = "I analyzed the transcript. ";
      if (chatInput.toLowerCase().includes("database") || chatInput.toLowerCase().includes("vivek")) {
        reply += "Vivek Sharma is responsible for designing the database tenant isolation schemas. The target completion date is July 3, 2026. The confidence score of this extraction is 98%.";
      } else if (chatInput.toLowerCase().includes("clerk") || chatInput.toLowerCase().includes("auth")) {
        reply += "The decision was made to migrate to Auth.js/Clerk to bypass token database complexity and support enterprise requirements. Alex Rivera will implement Next.js routing integrations.";
      } else {
        reply += "No direct mentions of that topic was found in this specific session. It was mainly centered around Auth.js, Clerk database isolation, and migration tasks.";
      }
      setChatMessages(prev => [...prev, { role: "assistant", text: reply }]);
      setChatLoading(false);
    }, 1000);
  };

  if (!meetingDetail) {
    return (
      <div className="bg-[#09090b] text-white min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-2 text-zinc-400">
          <Loader2 className="w-5 h-5 animate-spin text-violet-500" />
          <span>Loading meeting details...</span>
        </div>
      </div>
    );
  }

  const detail = meetingDetail || mockMeetingDetail;

  return (
    <div className="bg-[#09090b] text-[#fafafa] min-h-screen flex flex-col selection:bg-violet-500 selection:text-white">
      {/* Header Navigation */}
      <header className="px-8 py-4 border-b border-zinc-800 flex items-center justify-between">
        <button 
          onClick={() => router.push("/dashboard")}
          className="flex items-center gap-2 text-zinc-400 hover:text-white text-sm font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>

        <span className="text-xs text-zinc-500">ID: {id}</span>
      </header>

      {/* Main Workspace Layout */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 p-8 overflow-hidden max-w-7xl w-full mx-auto">
        {/* Left Side: Media player & tabs */}
        <section className="lg:col-span-8 flex flex-col gap-6 overflow-y-auto pr-2">
          {/* Title and metadata */}
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-bold font-outfit text-white">{detail.title}</h1>
            <div className="flex items-center gap-4 text-xs text-zinc-400">
              <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> June 30, 2026</span>
              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> 40 minutes duration</span>
              <span className="px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-400 font-semibold text-[10px]">
                {detail.platform || "Upload"}
              </span>
            </div>
          </div>

          {/* Audio Player Simulator */}
          <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-center gap-4">
            <button 
              onClick={() => setIsPlaying(!isPlaying)}
              className="w-10 h-10 rounded-full bg-violet-600 hover:bg-violet-500 flex items-center justify-center text-white transition-colors"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>
            <div className="flex-1 flex flex-col gap-1.5">
              <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-violet-500 rounded-full transition-all" style={{ width: `${playProgress}%` }} />
              </div>
              <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                <span>04:48</span>
                <span>40:00</span>
              </div>
            </div>
          </div>

          {/* Details Content Tabs */}
          <div className="flex border-b border-zinc-800 gap-1">
            {["summary", "timeline", "action-items", "decisions", "risks", "technical"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2.5 text-xs font-semibold border-b-2 capitalize transition-colors ${
                  activeTab === tab ? "border-violet-500 text-white" : "border-transparent text-zinc-400 hover:text-white"
                }`}
              >
                {tab.replace("-", " ")}
              </button>
            ))}
          </div>

          {/* Tab contents */}
          <div className="min-h-[250px]">
            {activeTab === "summary" && (
              <div className="flex flex-col gap-6">
                <div>
                  <h3 className="text-sm font-bold text-white mb-2">Executive Summary</h3>
                  <p className="text-sm text-zinc-400 leading-relaxed bg-zinc-950 p-4 rounded-xl border border-zinc-850">
                    {detail.executive_summary}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white mb-2">One Minute Read</h3>
                  <p className="text-sm text-zinc-400 leading-relaxed bg-zinc-950 p-4 rounded-xl border border-zinc-850">
                    {detail.one_minute_read}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white mb-2">Sentiment & Dynamic Tone</h3>
                  <p className="text-sm text-zinc-400 leading-relaxed bg-zinc-950 p-4 rounded-xl border border-zinc-850">
                    {detail.sentiment_summary}
                  </p>
                </div>
              </div>
            )}

            {activeTab === "timeline" && (
              <div className="flex flex-col gap-4 pl-4 border-l border-zinc-800 ml-2">
                {detail.timeline ? detail.timeline.map((item: any, idx: number) => (
                  <div key={idx} className="relative flex flex-col gap-1">
                    <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-violet-500" />
                    <div className="flex gap-2 items-baseline">
                      <span className="font-mono text-xs font-semibold text-violet-400">{item.time}</span>
                      <span className="font-bold text-white text-xs">{item.title}</span>
                    </div>
                    <p className="text-xs text-zinc-400 pl-8">{item.desc}</p>
                  </div>
                )) : (
                  <div className="text-xs text-zinc-500">Timeline loading or empty</div>
                )}
              </div>
            )}

            {activeTab === "action-items" && (
              <div className="flex flex-col gap-4">
                {detail.action_items ? detail.action_items.map((item: any, idx: number) => (
                  <div key={idx} className="p-4 rounded-xl bg-zinc-950 border border-zinc-850 flex items-center justify-between gap-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-semibold text-white">{item.description}</span>
                      <div className="flex gap-3 text-[10px] text-zinc-500">
                        <span className="flex items-center gap-1"><User className="w-3 h-3" /> {item.assigned_to || "Unassigned"}</span>
                        <span>Due: {item.due_date ? new Date(item.due_date).toLocaleDateString() : "No deadline"}</span>
                        <span className="text-violet-400">Confidence: {Math.round(item.confidence_score * 100)}%</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {jiraStatus[item.id] ? (
                        <span className="px-2.5 py-1 rounded bg-zinc-900 border border-violet-500/30 text-[10px] text-violet-300 font-semibold">
                          Synced: {jiraStatus[item.id]}
                        </span>
                      ) : (
                        <button
                          onClick={() => handleJiraSync(item.id)}
                          disabled={jiraSyncing[item.id]}
                          className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-[10px] text-white border border-zinc-850 hover:border-violet-500/50 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                        >
                          {jiraSyncing[item.id] ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
                          ) : "Sync Jira"}
                        </button>
                      )}
                    </div>
                  </div>
                )) : (
                  <div className="text-xs text-zinc-500">No action items found</div>
                )}
              </div>
            )}

            {activeTab === "decisions" && (
              <div className="flex flex-col gap-4">
                {detail.decisions ? detail.decisions.map((dec: any, idx: number) => (
                  <div key={idx} className="p-4 rounded-xl bg-violet-600/5 border border-violet-500/20 flex flex-col gap-2">
                    <div className="flex justify-between items-baseline">
                      <span className="text-sm font-bold text-white">{dec.decision_text}</span>
                      <span className="text-[10px] text-violet-400 font-semibold">{Math.round(dec.confidence_score * 100)}% confidence</span>
                    </div>
                    <div className="text-xs text-zinc-400">
                      <span className="font-semibold text-zinc-500">Rationale:</span> {dec.rationale}
                    </div>
                  </div>
                )) : (
                  <div className="text-xs text-zinc-500">No decisions detected</div>
                )}
              </div>
            )}

            {activeTab === "risks" && (
              <div className="flex flex-col gap-4">
                {detail.risks ? detail.risks.map((risk: any, idx: number) => (
                  <div key={idx} className="p-4 rounded-xl bg-red-500/5 border border-red-500/20 flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-white flex items-center gap-1.5"><ShieldAlert className="w-4 h-4 text-red-400" /> {risk.risk_text}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">{risk.severity} Severity</span>
                    </div>
                    <div className="text-xs text-zinc-400">
                      <span className="font-semibold text-zinc-500">Mitigation:</span> {risk.mitigation}
                    </div>
                  </div>
                )) : (
                  <div className="text-xs text-zinc-500">No risks detected</div>
                )}
              </div>
            )}

            {activeTab === "technical" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-850 flex flex-col gap-2">
                  <h4 className="text-xs font-bold text-zinc-400 flex items-center gap-1.5"><Code2 className="w-3.5 h-3.5 text-violet-400" /> Repositories & Files</h4>
                  <ul className="text-xs text-zinc-500 flex flex-col gap-1">
                    {detail.technical_context?.repositories.map((repo: string, idx: number) => <li key={idx} className="text-violet-300">{repo}</li>) || <li className="text-zinc-600">None</li>}
                    {detail.technical_context?.files.map((file: string, idx: number) => <li key={idx}>{file}</li>) || <li className="text-zinc-600">None</li>}
                  </ul>
                </div>
                <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-850 flex flex-col gap-2">
                  <h4 className="text-xs font-bold text-zinc-400 flex items-center gap-1.5">APIs & Tables</h4>
                  <ul className="text-xs text-zinc-500 flex flex-col gap-1">
                    {detail.technical_context?.apis.map((api: string, idx: number) => <li key={idx} className="font-mono text-[10px] bg-zinc-900 px-1 py-0.5 rounded w-fit">{api}</li>) || <li className="text-zinc-600">None</li>}
                    {detail.technical_context?.database_tables.map((table: string, idx: number) => <li key={idx} className="text-zinc-400">{table}</li>) || <li className="text-zinc-600">None</li>}
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* Transcript Dialogue */}
          <div className="flex flex-col gap-4 mt-6">
            <h3 className="text-sm font-bold text-white">Full Transcript</h3>
            <div className="flex flex-col gap-4 bg-zinc-950 p-6 rounded-xl border border-zinc-850 max-h-[350px] overflow-y-auto">
              {detail.transcripts ? detail.transcripts.map((t: any, idx: number) => (
                <div key={idx} className="flex flex-col gap-1 text-xs">
                  <span className="font-bold text-violet-300">
                    {detail.speakers?.find((s: any) => s.speaker_tag === t.speaker_tag)?.display_name || t.speaker_tag}
                  </span>
                  <p className="text-zinc-400 leading-relaxed">{t.text}</p>
                </div>
              )) : (
                <div className="text-xs text-zinc-500">No transcripts found</div>
              )}
            </div>
          </div>
        </section>

        {/* Right Side: RAG Chat Panel */}
        <section className="lg:col-span-4 p-6 rounded-xl bg-zinc-900/40 border border-zinc-800 flex flex-col justify-between max-h-[600px] h-full">
          <div className="flex flex-col gap-4 flex-1 overflow-hidden">
            <h3 className="font-bold text-sm text-white flex items-center gap-2 border-b border-zinc-800 pb-3">
              <MessageSquare className="w-4 h-4 text-violet-400" /> Chat with Meeting
            </h3>
            
            {/* Messages box */}
            <div className="flex-grow overflow-y-auto flex flex-col gap-3 pr-2 scrollbar">
              {chatMessages.map((msg, idx) => (
                <div 
                  key={idx} 
                  className={`p-3 rounded-lg text-xs leading-relaxed max-w-[85%] ${
                    msg.role === "user" 
                      ? "bg-violet-600/20 text-violet-100 border border-violet-500/20 self-end" 
                      : "bg-zinc-950 text-zinc-300 border border-zinc-850 self-start"
                  }`}
                >
                  {msg.text}
                </div>
              ))}
              
              {chatLoading && (
                <div className="flex items-center gap-2 text-zinc-500 text-xs self-start">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-400" /> AI thinking...
                </div>
              )}
            </div>
          </div>

          <form onSubmit={handleChatSubmit} className="flex items-center gap-2 mt-4 pt-3 border-t border-zinc-800">
            <input 
              type="text" 
              placeholder="Ask a question..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              className="flex-grow px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs focus:outline-none focus:border-violet-500 text-zinc-200"
            />
            <button 
              type="submit"
              className="p-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
