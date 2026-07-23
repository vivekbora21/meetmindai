"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Video, 
  Users, 
  Calendar, 
  Link as LinkIcon, 
  Sparkles, 
  Plus, 
  X, 
  Check, 
  Play, 
  Loader2, 
  ShieldCheck, 
  Globe, 
  Bot,
  ArrowRight
} from "lucide-react";
import { meetingService } from "@/features/meetings/services/meeting.service";
import { getApiUrl } from "@/app/config";
import { toast } from "@/store/useToastStore";

interface ProviderOption {
  id: string;
  name: string;
  platform: string;
  description: string;
  badge: string;
  badgeBg: string;
  iconColor: string;
  isNative?: boolean;
}

const PROVIDERS: ProviderOption[] = [
  {
    id: "google_meet",
    name: "Google Meet",
    platform: "Google Meet",
    description: "Connect via automated Google Meet AI agent bot.",
    badge: "External Bot",
    badgeBg: "bg-red-50 text-red-700 border-red-200",
    iconColor: "text-red-600"
  },
  {
    id: "teams",
    name: "Microsoft Teams",
    platform: "Teams",
    description: "Join MS Teams calls with auto-recording & transcription.",
    badge: "Enterprise Bot",
    badgeBg: "bg-indigo-50 text-indigo-700 border-indigo-200",
    iconColor: "text-indigo-600"
  },
  {
    id: "zoom",
    name: "Zoom Workplace",
    platform: "Zoom",
    description: "Dispatch AI assistant to Zoom meeting IDs or links.",
    badge: "SDK Agent",
    badgeBg: "bg-blue-50 text-blue-700 border-blue-200",
    iconColor: "text-blue-600"
  }
];

export default function CreateMeetingPage() {
  const router = useRouter();

  // Form State
  const [title, setTitle] = useState("");
  const [selectedProvider, setSelectedProvider] = useState<ProviderOption>(PROVIDERS[0]);
  const [meetingUrl, setMeetingUrl] = useState("");
  const [isImmediate, setIsImmediate] = useState(true);
  const [scheduledStart, setScheduledStart] = useState("");
  const [botName, setBotName] = useState("MeetMind AI Assistant");

  // Member invites state
  const [memberInput, setMemberInput] = useState("");
  const [members, setMembers] = useState<string[]>([
    "alex.dev@organization.com",
    "sarah.design@organization.com"
  ]);

  const [loading, setLoading] = useState(false);

  const handleSelectProvider = (prov: ProviderOption) => {
    setSelectedProvider(prov);
  };

  const handleAddMember = (emailToAdd?: string) => {
    const email = (emailToAdd || memberInput).trim();
    if (!email) return;
    if (members.includes(email)) {
      toast.warning("Member is already invited.");
      return;
    }
    setMembers([...members, email]);
    setMemberInput("");
  };

  const handleRemoveMember = (email: string) => {
    setMembers(members.filter((m) => m !== email));
  };

  const [createdMeetingModal, setCreatedMeetingModal] = useState<{
    open: boolean;
    meetingUrl: string;
    meetingId?: string;
    title: string;
    isNative: boolean;
  } | null>(null);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Invite link copied to clipboard!");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.warning("Please enter a meeting title.");
      return;
    }

    if (!selectedProvider.isNative && !meetingUrl.trim()) {
      toast.warning("Please provide a meeting URL for external providers.");
      return;
    }

    setLoading(true);

    try {
      const finalMeetingUrl = meetingUrl;

      // 1. Create meeting record in backend
      const createdMeeting = await meetingService.joinMeetingByLink(
        title,
        selectedProvider.platform,
        finalMeetingUrl,
        isImmediate ? new Date().toISOString() : scheduledStart ? new Date(scheduledStart).toISOString() : undefined,
        selectedProvider.id,
        members,
        botName
      );

      // 2. Dispatch Live Bot if Immediate and meetingUrl provided
      if (isImmediate && finalMeetingUrl) {
        try {
          await fetch(getApiUrl("/api/v1/meetings/join"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              meeting_url: finalMeetingUrl,
              bot_name: botName
            }),
            credentials: "include"
          });
        } catch {
          console.warn("Bot dispatcher request initiated.");
        }
      }

      toast.success("Meeting created successfully!");

      setCreatedMeetingModal({
        open: true,
        meetingUrl: finalMeetingUrl,
        meetingId: createdMeeting?.id,
        title,
        isNative: false
      });
    } catch (err: unknown) {
      console.error("Create meeting error:", err);
      toast.error("Failed to create meeting. Please check inputs.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-9xl w-full mx-auto flex flex-col gap-8 text-[#102C23] animate-fade-in-up font-outfit">
      
      {/* Header Banner */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#113229] to-[#0D241E] p-8 text-white shadow-xl shadow-[#113229]/10">
        <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-[#D98A44]/15 blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 w-80 h-80 rounded-full bg-[#113229]/40 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#D98A44] bg-[#D98A44]/15 border border-[#D98A44]/30 px-3 py-1 rounded-full">
                Instant Room & Bot Join
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Create & Launch Meeting</h1>
            <p className="text-slate-350 text-xs md:text-sm max-w-2xl font-medium">
              Schedule or launch an immediate video session, select your provider, invite team members, and start collaborating directly from MeetMind AI.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md border border-white/15 px-4 py-3 rounded-2xl">
            <Bot className="w-6 h-6 text-[#D98A44] animate-pulse" />
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-300 font-bold uppercase">AI Bot Agent</span>
              <span className="text-xs font-bold text-white">Auto Dispatch Ready</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Form Layout */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Primary Config & Members (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* Card 1: Basic Information */}
          <div className="p-6 rounded-2xl bg-white border border-[#DEDDDA]/60 shadow-sm flex flex-col gap-5">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Video className="w-5 h-5 text-[#113229]" />
              <h2 className="font-bold text-sm md:text-base text-[#102C23]">Meeting Details</h2>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                Meeting Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Q3 Architecture & Product Sprint Review"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="px-4 py-3 rounded-xl bg-[#F9F8F6] border border-slate-200 text-sm focus:outline-none focus:border-[#113229] focus:ring-1 focus:ring-[#113229] text-[#102C23] font-medium shadow-inner"
                required
              />
            </div>

            {/* Launch Timing Toggle */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => setIsImmediate(true)}
                className={`p-3.5 rounded-xl border flex items-center justify-center gap-2.5 font-bold text-xs transition-all ${
                  isImmediate
                    ? "bg-[#113229] text-white border-[#113229] shadow-md"
                    : "bg-[#F9F8F6] text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <Play className={`w-4 h-4 ${isImmediate ? "text-[#D98A44]" : ""}`} />
                <span>Start & Join Instantly</span>
              </button>

              <button
                type="button"
                onClick={() => setIsImmediate(false)}
                className={`p-3.5 rounded-xl border flex items-center justify-center gap-2.5 font-bold text-xs transition-all ${
                  !isImmediate
                    ? "bg-[#113229] text-white border-[#113229] shadow-md"
                    : "bg-[#F9F8F6] text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <Calendar className={`w-4 h-4 ${!isImmediate ? "text-[#D98A44]" : ""}`} />
                <span>Schedule for Later</span>
              </button>
            </div>

            {!isImmediate && (
              <div className="flex flex-col gap-2 pt-2 animate-fade-in-up">
                <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                  Scheduled Start Time
                </label>
                <input
                  type="datetime-local"
                  value={scheduledStart}
                  onChange={(e) => setScheduledStart(e.target.value)}
                  className="px-4 py-3 rounded-xl bg-[#F9F8F6] border border-slate-200 text-xs focus:outline-none focus:border-[#113229] text-[#102C23] font-medium shadow-inner"
                  required={!isImmediate}
                />
              </div>
            )}
          </div>

          {/* Card 2: Select Provider */}
          <div className="p-6 rounded-2xl bg-white border border-[#DEDDDA]/60 shadow-sm flex flex-col gap-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-[#113229]" />
                <h2 className="font-bold text-sm md:text-base text-[#102C23]">Select Meeting Provider</h2>
              </div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                {selectedProvider.name}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {PROVIDERS.map((prov) => {
                const isSelected = selectedProvider.id === prov.id;
                return (
                  <div
                    key={prov.id}
                    onClick={() => handleSelectProvider(prov)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col gap-3 relative ${
                      isSelected
                        ? "border-[#113229] bg-[#113229]/5 ring-2 ring-[#113229]"
                        : "border-slate-200 bg-[#F9F8F6]/60 hover:bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-md border ${prov.badgeBg}`}>
                        {prov.badge}
                      </span>
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-[#113229] text-white flex items-center justify-center">
                          <Check className="w-3 h-3" />
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-1">
                      <h3 className="font-bold text-sm text-[#102C23] flex items-center gap-2">
                        {prov.name}
                      </h3>
                      <p className="text-xs text-slate-500 font-medium leading-relaxed">
                        {prov.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Provider URL Input */}
            <div className="flex flex-col gap-2 pt-2">
              <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>{selectedProvider.isNative ? "In-App Room Link (Auto Generated)" : "Meeting Invite Link"}</span>
                {!selectedProvider.isNative && <span className="text-rose-500">*</span>}
              </label>
              <div className="relative">
                <LinkIcon className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="url"
                  placeholder={
                    selectedProvider.id === "google_meet"
                      ? "https://meet.google.com/abc-defg-hij"
                      : selectedProvider.id === "teams"
                      ? "https://teams.microsoft.com/l/meetup-join/..."
                      : selectedProvider.id === "zoom"
                      ? "https://zoom.us/j/123456789"
                      : "https://meetmind.ai/live/room-id"
                  }
                  value={meetingUrl}
                  onChange={(e) => setMeetingUrl(e.target.value)}
                  readOnly={selectedProvider.isNative}
                  className={`w-full pl-10 pr-4 py-3 rounded-xl border text-xs focus:outline-none font-medium shadow-inner ${
                    selectedProvider.isNative
                      ? "bg-emerald-50/50 border-emerald-200 text-emerald-900 font-semibold"
                      : "bg-[#F9F8F6] border-slate-200 focus:border-[#113229] text-[#102C23]"
                  }`}
                  required={!selectedProvider.isNative}
                />
              </div>
            </div>
          </div>

          {/* Card 3: Invite Team Members */}
          <div className="p-6 rounded-2xl bg-white border border-[#DEDDDA]/60 shadow-sm flex flex-col gap-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-[#113229]" />
                <h2 className="font-bold text-sm md:text-base text-[#102C23]">Invite Members & Participants</h2>
              </div>
              <span className="text-xs text-[#113229] font-bold bg-[#113229]/10 px-2.5 py-0.5 rounded-full">
                {members.length} Invited
              </span>
            </div>

            {/* Input to add email */}
            <div className="flex items-center gap-2">
              <input
                type="email"
                placeholder="Enter colleague's email address..."
                value={memberInput}
                onChange={(e) => setMemberInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddMember();
                  }
                }}
                className="flex-1 px-4 py-2.5 rounded-xl bg-[#F9F8F6] border border-slate-200 text-xs focus:outline-none focus:border-[#113229] text-[#102C23] font-medium"
              />
              <button
                type="button"
                onClick={() => handleAddMember()}
                className="px-4 py-2.5 rounded-xl bg-[#113229] text-white font-bold text-xs hover:bg-[#0D241E] transition-all flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Add
              </button>
            </div>

            {/* Member Badges */}
            <div className="flex flex-wrap gap-2 pt-1">
              {members.map((email) => (
                <div
                  key={email}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#F9F8F6] border border-slate-200 text-xs font-semibold text-[#102C23]"
                >
                  <div className="w-5 h-5 rounded-full bg-[#113229] text-white flex items-center justify-center text-[10px] font-bold uppercase">
                    {email[0]}
                  </div>
                  <span>{email}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveMember(email)}
                    className="text-slate-400 hover:text-rose-500 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Dispatch Action & Summary (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          <div className="p-6 rounded-2xl bg-gradient-to-br from-[#113229] to-[#0D241E] text-white shadow-xl flex flex-col gap-6 border border-[#113229]">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <span className="text-xs font-bold text-[#D98A44] uppercase tracking-wider">Summary</span>
              <ShieldCheck className="w-5 h-5 text-[#D98A44]" />
            </div>

            <div className="flex flex-col gap-4 text-xs font-medium">
              <div className="flex justify-between items-center text-slate-300">
                <span>Provider:</span>
                <span className="font-bold text-white bg-white/10 px-2.5 py-1 rounded-md border border-white/10">
                  {selectedProvider.name}
                </span>
              </div>

              <div className="flex justify-between items-center text-slate-300">
                <span>Timing:</span>
                <span className="font-bold text-white">
                  {isImmediate ? "Immediate Launch" : "Scheduled"}
                </span>
              </div>

              <div className="flex justify-between items-center text-slate-300">
                <span>Invited Members:</span>
                <span className="font-bold text-[#D98A44]">{members.length} team members</span>
              </div>

              {/* Bot Name Config */}
              <div className="flex flex-col gap-1.5 pt-2 border-t border-white/10">
                <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">
                  AI Bot Dispatcher Name
                </label>
                <input
                  type="text"
                  value={botName}
                  onChange={(e) => setBotName(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-white/10 border border-white/15 text-xs text-white focus:outline-none focus:border-[#D98A44]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-[#D98A44] hover:bg-[#c47b3b] text-[#102C23] font-black text-sm transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#102C23]" />
                  <span>Launching Meeting...</span>
                </>
              ) : (
                <>
                  {selectedProvider.isNative ? (
                    <>
                      <Play className="w-4 h-4 fill-current" />
                      <span>Join In-App Room Now</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Create & Dispatch Bot</span>
                    </>
                  )}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          {/* Helper Tips Card */}
          <div className="p-5 rounded-2xl bg-white border border-[#DEDDDA]/60 shadow-sm flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#D98A44]" />
              <h4 className="font-bold text-xs text-[#102C23]">How Joining Works</h4>
            </div>
            <p className="text-[11.5px] text-slate-500 leading-relaxed font-medium">
              When you launch an external meeting (Google Meet, Teams, Zoom), our AI Bot automatically joins the call as a participant, transcribes real-time audio, and syncs key takeaways back to your MeetMind dashboard.
            </p>
          </div>

        </div>

      </form>

      {/* Share / Created Meeting Modal */}
      {createdMeetingModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl border border-slate-100 flex flex-col gap-6 animate-fade-in-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
                  <Check className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-[#102C23]">Meeting Created!</h3>
                  <p className="text-xs text-slate-500 font-medium">Share your invite link with members</p>
                </div>
              </div>
              <button 
                onClick={() => setCreatedMeetingModal(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                Meeting Invite Link
              </label>
              <div className="flex items-center gap-2 bg-[#F9F8F6] p-2.5 rounded-xl border border-slate-200">
                <input 
                  type="text" 
                  readOnly 
                  value={createdMeetingModal.meetingUrl}
                  className="bg-transparent border-0 text-xs font-mono font-medium text-[#102C23] flex-1 focus:outline-none truncate"
                />
                <button
                  onClick={() => copyToClipboard(createdMeetingModal.meetingUrl)}
                  className="px-3.5 py-2 bg-[#113229] hover:bg-[#0D241E] text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 flex-shrink-0"
                >
                  <LinkIcon className="w-3.5 h-3.5" />
                  Copy
                </button>
              </div>
            </div>

            {members.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                  Invited Participants ({members.length})
                </span>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                  {members.map(m => (
                    <span key={m} className="text-[11px] font-medium bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md">
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => {
                  const link = createdMeetingModal.meetingUrl;
                  const title = encodeURIComponent(createdMeetingModal.title);
                  window.open(`mailto:?subject=${title}&body=Join meeting: ${encodeURIComponent(link)}`);
                }}
                className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-all text-center"
              >
                Share via Email
              </button>
              <button
                onClick={() => {
                  if (createdMeetingModal.meetingId) {
                    router.push(`/meetings/${createdMeetingModal.meetingId}`);
                  } else {
                    router.push("/meetings");
                  }
                }}
                className="flex-1 py-3 rounded-xl bg-[#113229] hover:bg-[#0D241E] text-white font-extrabold text-xs transition-all text-center flex items-center justify-center gap-1.5"
              >
                <span>Proceed to Room</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
