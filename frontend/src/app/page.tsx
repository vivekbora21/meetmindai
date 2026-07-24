"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Brain,
  Shield,
  Clock,
  Search,
  Network,
  CheckCircle2,
  ChevronRight,
  Sparkles,
} from "lucide-react";

const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');`;

interface LogoProps {
  dark?: boolean;
}

function Logo({ dark = false }: LogoProps) {
  return (
    <Link href="/" className="flex items-center gap-2.5 group">
      <span
        className={`flex h-8 w-8 items-center justify-center rounded-lg ${
          dark ? "bg-[#64E0AA]" : "bg-[#102C23]"
        } transition-all duration-300 group-hover:-rotate-6 shadow-sm`}
      >
        <Image 
          src="/new_logo.png" 
          alt="MeetingMind Logo" 
          width={18}
          height={18}
          className={`h-4.5 w-auto object-contain transition-transform ${dark ? "invert" : ""}`}
        />
      </span>
      <span
        className={`font-outfit font-extrabold text-[17px] tracking-tight ${
          dark ? "text-white" : "text-[#101915]"
        }`}
      >
        MeetingMind <span className="text-[#4B967D]">AI</span>
      </span>
    </Link>
  );
}

// The signature moment: a transcript stream that resolves into a decision.
function TranscriptToDecision() {
  const lines = [
    { speaker: "R. Alvarez", text: "so where does that leave the Q3 rollout timeline" },
    { speaker: "T. Osei", text: "I think we push it two weeks, wait for the vendor" },
    { speaker: "R. Alvarez", text: "agreed — let's lock that in before we close" },
  ];
  const [step, setStep] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setStep((s) => (s + 1) % 5);
    }, 1800);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative rounded-2xl border border-white/10 bg-[#0A1712] p-6 shadow-2xl transition-all duration-500 hover:border-[#64E0AA]/30 hover:shadow-emerald-950/20">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#E8785A]/70" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#E8785A]" />
          </span>
          <span className="font-[IBM_Plex_Mono] text-[11px] uppercase tracking-widest text-[#9DB2AA]">
            live transcript
          </span>
        </div>
        <span className="font-[IBM_Plex_Mono] text-[11px] text-[#5A7268]">04:12</span>
      </div>

      <div className="space-y-3 min-h-[104px]">
        {lines.map((l, i) => (
          <p
            key={i}
            className="font-[IBM_Plex_Mono] text-[12.5px] leading-relaxed transition-all duration-700"
            style={{
              opacity: step > i ? 1 : 0.2,
              color: step > i && i === 2 ? "#64E0AA" : "#C7D3CC",
              transform: step > i ? "translateY(0)" : "translateY(4px)",
            }}
          >
            <span className="text-[#5A7268]">{l.speaker}:</span> {l.text}
          </p>
        ))}
      </div>

      <div
        className="mt-5 flex items-center gap-2 font-[IBM_Plex_Mono] text-[11px] text-[#5A7268] transition-opacity duration-500"
        style={{ opacity: step >= 3 ? 1 : 0 }}
      >
        <div className="h-px flex-1 bg-white/10" />
        AI extraction
        <div className="h-px flex-1 bg-white/10" />
      </div>

      <div
        className="mt-4 flex items-start gap-3 rounded-xl border border-[#64E0AA]/20 bg-[#64E0AA]/[0.05] p-4 transition-all duration-700 shadow-inner"
        style={{
          opacity: step >= 4 ? 1 : 0,
          transform: step >= 4 ? "translateY(0) scale(1)" : "translateY(6px) scale(0.98)",
        }}
      >
        <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#64E0AA] shadow-sm">
          <CheckCircle2 className="h-3.5 w-3.5 text-[#0A1712]" strokeWidth={3} />
        </div>
        <div>
          <p className="font-[IBM_Plex_Mono] text-[10px] uppercase tracking-widest text-[#64E0AA] font-bold">
            decision logged
          </p>
          <p className="mt-1 font-sans text-[13.5px] font-medium text-white leading-snug">
            Q3 rollout delayed 2 weeks, pending vendor confirmation
          </p>
        </div>
      </div>
    </div>
  );
}

interface WaveDividerProps {
  flip?: boolean;
}

function WaveDivider({ flip = false }: WaveDividerProps) {
  return (
    <svg
      viewBox="0 0 1200 40"
      preserveAspectRatio="none"
      className={`h-6 w-full ${flip ? "rotate-180" : ""}`}
    >
      {Array.from({ length: 60 }).map((_, i) => {
        const h = 6 + Math.abs(Math.sin(i * 0.5)) * 22;
        return (
          <rect
            key={i}
            x={i * 20 + 4}
            y={20 - h / 2}
            width="6"
            height={h}
            rx="3"
            className="fill-[#102C23]/10"
          />
        );
      })}
    </svg>
  );
}

const FEATURES = [
  {
    icon: Brain,
    tag: "memory",
    title: "Contextual recall",
    body: "Every decision, rationale, and open question is captured the moment it's spoken, tied to the meeting it came from.",
  },
  {
    icon: Search,
    tag: "search",
    title: "Ask it anything",
    body: "“What did we decide about the Q3 budget?” Search across every meeting your org has ever had, in plain language.",
  },
  {
    icon: Network,
    tag: "connections",
    title: "Knowledge graph",
    body: "MeetingMind links topics, projects, and people across time, so patterns and repeated discussions surface on their own.",
  },
  {
    icon: Clock,
    tag: "speed",
    title: "Notes before you've left",
    body: "Structured summaries and action items are ready within minutes of a meeting ending. No transcription queue to wait on.",
  },
];

export default function LandingPage() {
  return (
    <div
      id="top"
      className="min-h-screen bg-[#F9F8F6] text-[#101915] selection:bg-[#64E0AA]/30 overflow-x-hidden"
      style={{ fontFamily: "var(--font-inter), sans-serif" }}
    >
      <style>{`
        ${FONT_IMPORT}
        .font-display { font-family: 'Sora', sans-serif; }
        @keyframes floatSlow { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        .float-slow { animation: floatSlow 5s ease-in-out infinite; }
      `}</style>

      {/* Navbar */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-[#101915]/[0.06] bg-[#F9F8F6]/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Logo />
          <nav className="hidden items-center gap-8 md:flex">
            {["Features", "How it works", "Security"].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase().replace(/\s+/g, "-")}`}
                className="font-sans text-[13.5px] font-semibold text-[#101915]/65 transition-colors hover:text-[#102C23]"
              >
                {item}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-5">
            <Link 
              href="/login?mode=login" 
              className="font-sans text-[13.5px] font-bold text-[#101915]/75 transition-colors hover:text-[#102C23]"
            >
              Sign in
            </Link>
            <Link
              href="/login?mode=signup"
              className="rounded-xl bg-[#102C23] px-4 py-2.5 font-sans text-[13.5px] font-bold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-[#0D241E] hover:shadow-md"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      <main className="pt-16">
        {/* Hero */}
        <section className="relative overflow-hidden pb-28 pt-24">
          <div className="pointer-events-none absolute right-0 top-0 -z-10 h-[700px] w-[700px] -translate-y-16 translate-x-1/3 rounded-full bg-[#64E0AA]/10 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 left-0 -z-10 h-[500px] w-[500px] translate-y-1/3 -translate-x-1/3 rounded-full bg-[#102C23]/[0.04] blur-3xl" />

          <div className="mx-auto grid max-w-7xl items-center gap-16 px-6 lg:grid-cols-2">
            <div className="flex max-w-2xl flex-col gap-7">
              <div className="flex w-fit items-center gap-2 rounded-full border border-[#102C23]/10 bg-[#102C23]/[0.04] px-3.5 py-1.5 shadow-sm">
                <Sparkles className="h-3.5 w-3.5 text-[#4B967D]" />
                <span className="font-[IBM_Plex_Mono] text-[11px] font-semibold uppercase tracking-widest text-[#102C23]">
                  now extracting decisions in real time
                </span>
              </div>

              <h1 className="font-display text-5xl font-extrabold leading-[1.08] tracking-tight text-[#0f172a] lg:text-[64px]">
                Nobody remembers
                <br />
                what was <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#102C23] to-[#4B967D]">said.</span>
                <br />
                Everybody remembers
                <br />
                what was <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#4B967D] to-[#64E0AA]">decided.</span>
              </h1>

              <p className="max-w-lg font-sans text-[17px] leading-relaxed text-[#101915]/65">
                MeetingMind listens to every call, pulls out the decisions and
                commitments buried in the conversation, and turns them into a
                searchable memory your whole org can draw on.
              </p>

              <div className="flex flex-col gap-4 pt-2 sm:flex-row">
                <Link
                  href="/login?mode=signup"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#113229] px-7 py-3.5 font-sans text-[15px] font-bold text-white shadow-lg shadow-[#113229]/20 transition-all hover:-translate-y-1 hover:bg-[#0D241E] hover:shadow-xl"
                >
                  Start your free workspace
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <a
                  href="#how-it-works"
                  className="inline-flex items-center justify-center rounded-xl border border-[#101915]/15 bg-white px-7 py-3.5 font-sans text-[15px] font-bold text-[#101915]/80 transition-all hover:border-[#101915]/25 hover:bg-[#101915]/[0.02]"
                >
                  See how it works
                </a>
              </div>

              <div className="flex items-center gap-6 pt-2 font-sans text-[13px] font-medium text-[#101915]/50">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-[#4B967D]" /> No credit card
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-[#4B967D]" /> Live in 2 minutes
                </span>
              </div>
            </div>

            <div className="relative float-slow">
              <div className="absolute inset-0 -z-10 scale-[1.03] rotate-2 rounded-2xl bg-gradient-to-tr from-[#102C23] to-[#4B967D] opacity-25 blur-2xl" />
              <TranscriptToDecision />
            </div>
          </div>
        </section>

        <WaveDivider />

        {/* Where it fits */}
        <section className="border-y border-[#101915]/[0.06] bg-white py-10">
          <div className="mx-auto max-w-7xl px-6">
            <p className="mb-6 text-center font-[IBM_Plex_Mono] text-[11px] uppercase tracking-widest text-[#101915]/35 font-bold">
              wherever your team already talks
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              {["Engineering standups", "Sales calls", "Board reviews", "Product syncs", "Customer interviews"].map(
                (item) => (
                  <span
                    key={item}
                    className="rounded-full border border-[#101915]/10 px-4 py-2 font-sans text-[13px] font-semibold text-[#101915]/60 hover:border-[#102C23]/30 hover:text-[#102C23] transition-all cursor-default bg-slate-50/50"
                  >
                    {item}
                  </span>
                )
              )}
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="bg-[#F9F8F6] py-24">
          <div className="mx-auto max-w-7xl px-6">
            <div className="mx-auto mb-16 max-w-2xl text-center">
              <h2 className="font-display text-3xl font-extrabold tracking-tight text-[#0f172a] md:text-4xl">
                Built to run quietly, surface loudly
              </h2>
              <p className="mt-4 font-sans text-[16px] text-[#101915]/60 leading-relaxed">
                It stays out of the way during the meeting, then hands you exactly what matters after.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map(({ icon: Icon, tag, title, body }) => (
                <div
                  key={title}
                  className="group rounded-2xl border border-[#101915]/[0.08] bg-white p-6 shadow-sm hover:shadow-md hover:border-[#102C23]/25 transition-all duration-300 hover:-translate-y-1"
                >
                  <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-[#102C23]/[0.05] transition-all group-hover:bg-[#102C23] group-hover:scale-110">
                    <Icon className="h-5 w-5 text-[#102C23] transition-colors group-hover:text-[#64E0AA]" />
                  </div>
                  <p className="mb-2 font-[IBM_Plex_Mono] text-[10px] uppercase tracking-widest text-[#4B967D] font-bold">
                    {tag}
                  </p>
                  <h3 className="mb-2 font-display text-[17px] font-bold text-[#0f172a] group-hover:text-[#102C23] transition-colors">{title}</h3>
                  <p className="font-sans text-[14px] leading-relaxed text-[#101915]/60">{body}</p>
                </div>
              ))}
            </div>

            {/* Security spotlight */}
            <div
              id="security"
              className="mt-8 flex flex-col gap-8 rounded-2xl border border-[#101915]/[0.08] bg-white p-8 sm:flex-row sm:items-center shadow-sm hover:shadow-md hover:border-[#102C23]/25 transition-all duration-300"
            >
              <div className="flex-1">
                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-[#E8B564]/15">
                  <Shield className="h-5 w-5 text-[#B8863A]" />
                </div>
                <h3 className="mb-2 font-display text-[19px] font-bold text-[#0f172a]">
                  Your transcripts stay yours
                </h3>
                <p className="max-w-lg font-sans text-[14.5px] leading-relaxed text-[#101915]/60">
                  End-to-end encryption on every recording and transcript.
                  GDPR compliant by design. Nothing you say is ever used to
                  train a model outside your workspace.
                </p>
              </div>
              <div className="flex w-full flex-col justify-between gap-4 rounded-xl bg-[#102C23] p-5 sm:w-60 shadow-lg">
                <span className="font-[IBM_Plex_Mono] text-[10px] uppercase tracking-widest text-[#64E0AA] font-bold">
                  compliance
                </span>
                <div className="flex flex-wrap gap-2">
                  {["SOC 2", "GDPR", "E2E encryption"].map((b) => (
                    <span
                      key={b}
                      className="rounded-md bg-white/5 px-2.5 py-1 font-[IBM_Plex_Mono] text-[11px] text-[#C7D3CC] border border-white/5"
                    >
                      {b}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="bg-white py-24">
          <div className="mx-auto max-w-7xl px-6">
            <div className="mx-auto mb-16 max-w-2xl text-center">
              <h2 className="font-display text-3xl font-extrabold tracking-tight text-[#0f172a] md:text-4xl">
                From conversation to record
              </h2>
            </div>
            <div className="grid gap-8 md:grid-cols-3">
              {[
                { title: "Join the call", body: "MeetingMind sits in quietly, no bot dance required, and starts listening the moment the meeting begins." },
                { title: "Understand the room", body: "Speakers are separated, the discussion is followed in real time, and the moments that matter get flagged." },
                { title: "Leave with a record", body: "Decisions, owners, and follow-ups land in your workspace, linked back to the exact moment they were said." },
              ].map((step, i) => (
                <div key={step.title} className="relative rounded-2xl border border-[#101915]/[0.08] p-7 hover:border-[#102C23]/25 transition-all duration-300 bg-slate-50/30">
                  <span className="font-[IBM_Plex_Mono] text-[13px] text-[#4B967D] font-bold">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-3 mb-2 font-display text-[17px] font-bold text-[#0f172a]">{step.title}</h3>
                  <p className="font-sans text-[14px] leading-relaxed text-[#101915]/60">{step.body}</p>
                  {i < 2 && (
                    <ChevronRight className="absolute -right-4 top-1/2 hidden h-6 w-6 -translate-y-1/2 text-[#101915]/15 md:block" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        <WaveDivider flip />

        {/* CTA */}
        <section className="relative overflow-hidden bg-[#102C23] py-24">
          <div className="mx-auto max-w-4xl px-6 text-center">
            <h2 className="font-display text-4xl font-extrabold tracking-tight text-white md:text-5xl">
              Give your team a memory that never fades.
            </h2>
            <p className="mx-auto mt-6 max-w-2xl font-sans text-[17px] text-[#9DB2AA]">
              Join the teams that stopped re-litigating decisions they already made.
            </p>
            <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
              <Link
                href="/login?mode=signup"
                className="inline-flex items-center justify-center rounded-xl bg-[#64E0AA] px-8 py-4 font-sans text-[16px] font-extrabold text-[#102C23] shadow-lg transition-all hover:-translate-y-1 hover:bg-[#52c997] hover:shadow-xl"
              >
                Create free account
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#101915]/[0.08] bg-white pb-8 pt-16">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-14 grid grid-cols-2 gap-8 md:grid-cols-4 lg:grid-cols-5">
            <div className="col-span-2 lg:col-span-2">
              <Logo />
              <p className="mt-5 max-w-xs font-sans text-[13.5px] leading-relaxed text-[#101915]/50">
                The organizational memory layer for teams that talk a lot and
                want to remember what they agreed on.
              </p>
            </div>
            {[
              { title: "Product", items: ["Features", "Integrations", "Pricing", "Changelog"] },
              { title: "Company", items: ["About", "Careers", "Blog", "Contact"] },
              { title: "Legal", items: ["Privacy", "Terms", "Security"] },
            ].map((col) => (
              <div key={col.title}>
                <h4 className="mb-4 font-sans text-[13.5px] font-bold text-[#0f172a]">{col.title}</h4>
                <ul className="space-y-3">
                  {col.items.map((item) => (
                    <li key={item}>
                      <a href="#" className="font-sans text-[13.5px] text-[#101915]/50 hover:text-[#102C23] transition-colors">
                        {item}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="flex flex-col items-center justify-between gap-4 border-t border-[#101915]/[0.08] pt-8 md:flex-row">
            <p className="font-sans text-[13px] text-[#101915]/35">
              © {new Date().getFullYear()} MeetingMind AI. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
