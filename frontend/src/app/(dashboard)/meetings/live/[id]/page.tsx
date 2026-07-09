"use client";

import { useState, useEffect, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, Users, MessageSquare, AlertCircle, 
  CheckCircle2, Sparkles, Loader2, Mic, Play, ShieldAlert
} from "lucide-react";
import { getApiUrl, getWsUrl } from "../../../../config";

export default function LiveMeeting({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);

  // States
  const [sessionStatus, setSessionStatus] = useState("Idle"); // Idle, Connecting, Live, Completed
  const [participants, setParticipants] = useState<string[]>([]);
  const [activeSpeaker, setActiveSpeaker] = useState<string | null>(null);
  const [currentText, setCurrentText] = useState("");
  const [transcriptSegments, setTranscriptSegments] = useState<Array<{ speaker: string, text: string }>>([]);
  const [insights, setInsights] = useState<any[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);

  const socketRef = useRef<WebSocket | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Connect to WebSocket backend
    const wsUrl = getWsUrl(`/api/v1/agent/live/${id}`);
    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onopen = () => {
      console.log("[WS] Connected to live meeting channel.");
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      console.log("[WS] Message received:", msg);

      if (msg.event === "agent_connected") {
        setSessionStatus(msg.data.status);
        if (msg.data.participants) {
          setParticipants(msg.data.participants);
        }
      } else if (msg.event === "speaker_changed") {
        setActiveSpeaker(msg.data.speaker);
        setCurrentText(msg.data.text);

        if (msg.data.is_final) {
          setTranscriptSegments(prev => [...prev, { speaker: msg.data.speaker, text: msg.data.text }]);
          setCurrentText("");
        }
      } else if (msg.event === "insight_detected") {
        setInsights(prev => [msg.data, ...prev]);
      } else if (msg.event === "agent_disconnected") {
        setSessionStatus("Completed");
        setActiveSpeaker(null);
      }
    };

    ws.onclose = () => {
      console.log("[WS] Connection closed.");
    };

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [id]);

  useEffect(() => {
    // Scroll transcript to bottom on update
    if (transcriptEndRef.current) {
      transcriptEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [transcriptSegments, currentText]);

  const handleStartSimulation = async () => {
    setIsSimulating(true);
    setTranscriptSegments([]);
    setInsights([]);
    setParticipants([]);
    setSessionStatus("Connecting");
    
    try {
      const res = await fetch(getApiUrl("/api/v1/agent/simulate"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meeting_id: id, platform: "Google Meet" }),
        credentials: "include"
      });
      if (!res.ok) {
        throw new Error("Simulation endpoint returned error status");
      }
    } catch (e) {
      console.warn("Backend API not reachable. Triggering client-side simulation fallback.");
      runClientSideSimulation();
    }
  };

  const runClientSideSimulation = async () => {
    setSessionStatus("Connecting");
    await new Promise(r => setTimeout(r, 2000));
    setSessionStatus("Live");
    setParticipants(["Vivek Sharma", "Alex Rivera"]);
    await new Promise(r => setTimeout(r, 1500));

    const steps = [
      {
        speaker: "Vivek Sharma",
        text: "Hello team, let's establish the multi-platform meeting agent design.",
        duration: 3000
      },
      {
        speaker: "Alex Rivera",
        text: "Hi Vivek. We should build an abstract class that handles Teams, Meet, and Zoom connectors.",
        duration: 4500
      },
      {
        speaker: "Vivek Sharma",
        text: "Correct. Let's make sure the audio streams are processed in real-time.",
        duration: 3000
      },
      {
        speaker: "Alex Rivera",
        text: "Perfect, we'll implement it. I'll open a ticket in Jira and sync it. Let's set a due date for Friday.",
        duration: 5000,
        insight: {
          type: "Action Item",
          description: "Implement Abstract MeetingConnector class and verify WebRTC audio packet feeds",
          assigned_to: "Alex Rivera",
          due_date: "2026-07-03",
          confidence_score: 0.98
        }
      },
      {
        speaker: "Vivek Sharma",
        text: "Excellent decision. Let's start building it today.",
        duration: 2500,
        insight: {
          type: "Decision",
          decision_text: "Establish common MeetingConnector base schema for all ingestion services",
          rationale: "Ensures clean expansion to future platforms like Webex and Slack Huddles",
          confidence_score: 0.96
        }
      }
    ];

    for (const step of steps) {
      setActiveSpeaker(step.speaker);
      setCurrentText(step.text);
      await new Promise(r => setTimeout(r, step.duration));
      
      setTranscriptSegments(prev => [...prev, { speaker: step.speaker, text: step.text }]);
      setCurrentText("");

      if (step.insight) {
        setInsights(prev => [step.insight, ...prev]);
      }
      await new Promise(r => setTimeout(r, 1500));
    }

    setSessionStatus("Completed");
    setActiveSpeaker(null);
  };

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <header className="px-8 py-4 border-b border-zinc-800 flex items-center justify-between">
        <button 
          onClick={() => router.push("/dashboard")}
          className="flex items-center gap-2 text-zinc-400 hover:text-white text-sm font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Exit Session
        </button>

        <div className="flex items-center gap-3">
          {sessionStatus === "Live" && (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-semibold animate-pulse">
              <span className="w-2 h-2 rounded-full bg-red-500" /> Live Ingesting
            </span>
          )}
          <span className="text-xs text-zinc-500 font-mono">Session: {id}</span>
        </div>
      </header>

      {/* Main Layout */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 p-8 max-w-9xl w-full mx-auto overflow-hidden">
        {/* Left Area: Live Transcript & Bot Monitor */}
        <section className="lg:col-span-8 flex flex-col gap-6 h-full overflow-hidden justify-between">
          
          {/* Active Speaker Status */}
          <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 ${
                sessionStatus === "Live" 
                  ? "bg-violet-600 shadow-[0_0_20px_rgba(124,58,237,0.3)] animate-pulse" 
                  : "bg-zinc-800"
              }`}>
                {sessionStatus === "Live" ? (
                  <Mic className="w-5 h-5 text-white" />
                ) : (
                  <Loader2 className={`w-5 h-5 ${sessionStatus === "Connecting" ? "animate-spin text-violet-400" : "text-zinc-500"}`} />
                )}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-white font-outfit">
                  {sessionStatus === "Idle" && "AI Meeting Agent ready to start"}
                  {sessionStatus === "Connecting" && "Agent connecting WebRTC stream..."}
                  {sessionStatus === "Live" && (activeSpeaker ? `Active Speaker: ${activeSpeaker}` : "Listening to conversation...")}
                  {sessionStatus === "Completed" && "Meeting session ended successfully"}
                </span>
                <span className="text-xs text-zinc-500">
                  Status: <span className="font-semibold text-violet-400 capitalize">{sessionStatus}</span>
                </span>
              </div>
            </div>

            {sessionStatus === "Idle" && (
              <button 
                onClick={handleStartSimulation}
                className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition-all flex items-center gap-2 hover:shadow-[0_0_20px_rgba(124,58,237,0.3)]"
              >
                <Play className="w-3.5 h-3.5" /> Launch Autonomous Agent
              </button>
            )}
          </div>

          {/* Transcript Log Container */}
          <div className="flex-1 flex flex-col gap-4 bg-zinc-950/80 border border-zinc-900 rounded-2xl p-6 overflow-y-auto min-h-[350px]">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Live Transcript</h3>
            
            <div className="flex-grow flex flex-col gap-4 overflow-y-auto pr-2">
              {transcriptSegments.map((segment, index) => (
                <div key={index} className="flex flex-col gap-1 text-xs">
                  <span className="font-bold text-violet-300">{segment.speaker}</span>
                  <p className="text-zinc-400 leading-relaxed bg-zinc-900/30 p-3 rounded-xl border border-zinc-800/40 w-fit max-w-[85%]">
                    {segment.text}
                  </p>
                </div>
              ))}

              {activeSpeaker && currentText && (
                <div className="flex flex-col gap-1 text-xs animate-pulse">
                  <span className="font-bold text-violet-400">{activeSpeaker} <span className="text-[10px] text-zinc-600 font-normal italic">speaking...</span></span>
                  <p className="text-zinc-300 leading-relaxed bg-violet-950/20 p-3 rounded-xl border border-violet-800/20 w-fit max-w-[85%]">
                    {currentText}
                  </p>
                </div>
              )}

              {transcriptSegments.length === 0 && !activeSpeaker && (
                <div className="flex-grow flex flex-col items-center justify-center text-zinc-600 gap-2">
                  <Sparkles className="w-8 h-8 text-zinc-800" />
                  <span className="text-xs">No active conversation feed yet. Trigger the simulation.</span>
                </div>
              )}

              <div ref={transcriptEndRef} />
            </div>
          </div>
        </section>

        {/* Right Area: Participants & Insights Ticker */}
        <section className="lg:col-span-4 flex flex-col gap-6 overflow-hidden">
          
          {/* Participants */}
          <div className="p-5 rounded-2xl bg-zinc-900/40 border border-zinc-800 flex flex-col gap-4">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-violet-400" /> Active Attendees
            </h3>
            <div className="flex flex-wrap gap-2">
              {participants.map((p, idx) => (
                <span key={idx} className="px-2.5 py-1 rounded bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> {p}
                </span>
              ))}
              <span className="px-2.5 py-1 rounded bg-violet-950/30 border border-violet-800/30 text-xs text-violet-300 flex items-center gap-1.5 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400" /> MeetingMind Bot (Muted)
              </span>
            </div>
          </div>

          {/* Live AI Insights Ticker */}
          <div className="flex-1 p-5 rounded-2xl bg-zinc-900/40 border border-zinc-800 flex flex-col gap-4 overflow-hidden">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-violet-400 animate-pulse" /> Live AI Insights
            </h3>
            
            <div className="flex-grow overflow-y-auto flex flex-col gap-3 pr-1">
              {insights.map((insight, idx) => (
                <div 
                  key={idx} 
                  className={`p-4 rounded-xl border flex flex-col gap-2 transition-all duration-500 ${
                    insight.type === "Action Item" 
                      ? "bg-violet-950/20 border-violet-800/40" 
                      : "bg-emerald-950/10 border-emerald-800/30"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      insight.type === "Action Item" ? "bg-violet-900/50 text-violet-300" : "bg-emerald-900/40 text-emerald-300"
                    }`}>
                      {insight.type}
                    </span>
                    <span className="text-[10px] text-zinc-500 font-mono">Conf: {Math.round(insight.confidence_score * 100)}%</span>
                  </div>
                  <p className="text-xs font-semibold text-white leading-relaxed">
                    {insight.description || insight.decision_text}
                  </p>
                  {insight.assigned_to && (
                    <div className="flex items-center justify-between text-[10px] text-zinc-400 border-t border-zinc-800/50 pt-2">
                      <span>Owner: {insight.assigned_to}</span>
                      <span>Due: {insight.due_date}</span>
                    </div>
                  )}
                  {insight.rationale && (
                    <div className="text-[10px] text-zinc-500 italic border-t border-zinc-850/50 pt-2">
                      Rationale: {insight.rationale}
                    </div>
                  )}
                </div>
              ))}

              {insights.length === 0 && (
                <div className="flex-grow flex flex-col items-center justify-center text-zinc-600 gap-1.5 py-12">
                  <AlertCircle className="w-5 h-5 text-zinc-800" />
                  <span className="text-[10px]">No real-time insights captured yet.</span>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
