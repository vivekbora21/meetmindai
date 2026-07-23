"use client";

import Link from "next/link";
import { ArrowRight, Brain, Shield, Clock, Search, Network, CheckCircle2 } from "lucide-react";
import { Logo } from "./components/Logo";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#F9F8F6] font-sans text-slate-900 selection:bg-[#64E0AA]/30 overflow-x-hidden">
      {/* Navbar */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#F9F8F6]/80 backdrop-blur-md border-b border-slate-200/50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Logo />
          
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">Features</a>
            <a href="#how-it-works" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">How it Works</a>
            <a href="#security" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">Security</a>
          </nav>

          <div className="flex items-center gap-4">
            <Link 
              href="/login?mode=login" 
              className="text-sm font-bold text-slate-700 hover:text-slate-900 transition-colors"
            >
              Sign in
            </Link>
            <Link 
              href="/login?mode=signup" 
              className="text-sm font-bold bg-[#113229] hover:bg-[#0D241E] text-white px-4 py-2 rounded-lg transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      <main className="pt-16">
        {/* Hero Section */}
        <section className="relative pt-24 pb-32 overflow-hidden">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 -translate-y-12 translate-x-1/3 w-[800px] h-[800px] bg-[#64E0AA]/10 rounded-full blur-3xl -z-10"></div>
          <div className="absolute bottom-0 left-0 translate-y-1/3 -translate-x-1/3 w-[600px] h-[600px] bg-[#102C23]/5 rounded-full blur-3xl -z-10"></div>

          <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
            <div className="flex flex-col gap-8 max-w-2xl animate-fade-in-up">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#102C23]/5 border border-[#102C23]/10 w-fit">
                <span className="flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-[#102C23] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#102C23]"></span>
                </span>
                <span className="text-[#102C23] text-xs font-bold tracking-widest uppercase">
                  MeetingMind AI 2.0 is live
                </span>
              </div>
              
              <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight leading-[1.1] text-[#0f172a]">
                The AI that remembers <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#102C23] to-[#4B967D]">
                  what your team
                </span><br/>
                decided.
              </h1>
              
              <p className="text-lg text-slate-600 leading-relaxed max-w-lg">
                Stop losing track of decisions. MeetingMind automatically diarizes, extracts action items, and connects insights across all your conversations—giving your organization a flawless long-term memory.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Link 
                  href="/login?mode=signup" 
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-[#113229] hover:bg-[#0D241E] text-white font-bold text-base transition-all shadow-lg shadow-[#113229]/20 hover:shadow-xl hover:-translate-y-1"
                >
                  Start your free workspace
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <a 
                  href="#features" 
                  className="inline-flex items-center justify-center px-8 py-4 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-slate-700 font-bold text-base transition-all hover:bg-slate-50"
                >
                  See how it works
                </a>
              </div>
              
              <div className="flex items-center gap-6 pt-4 text-sm text-slate-500 font-medium">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#64E0AA]" /> No credit card required
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#64E0AA]" /> Setup in 2 minutes
                </div>
              </div>
            </div>

            {/* Hero Graphic */}
            <div className="relative animate-fade-in-up" style={{ animationDelay: "200ms" }}>
              <div className="absolute inset-0 bg-gradient-to-tr from-[#102C23] to-[#4B967D] rounded-2xl transform rotate-3 scale-[1.02] opacity-20 blur-xl"></div>
              <div className="relative bg-[#102C23] rounded-2xl p-8 shadow-2xl overflow-hidden border border-white/10">
                {/* Decorative dots */}
                <div className="flex gap-2 mb-6">
                  <div className="w-3 h-3 rounded-full bg-red-400/80"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-400/80"></div>
                  <div className="w-3 h-3 rounded-full bg-green-400/80"></div>
                </div>
                
                {/* Simulated UI */}
                <div className="space-y-4">
                  <div className="h-8 w-1/3 bg-white/10 rounded-md"></div>
                  <div className="h-32 w-full bg-white/5 rounded-lg border border-white/5 p-4 flex flex-col gap-3">
                    <div className="h-4 w-1/4 bg-[#64E0AA]/40 rounded"></div>
                    <div className="h-4 w-3/4 bg-white/20 rounded"></div>
                    <div className="h-4 w-2/3 bg-white/20 rounded"></div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="h-24 bg-white/5 rounded-lg border border-white/5 p-4 flex items-center justify-center">
                      <Network className="w-8 h-8 text-[#64E0AA]/50" />
                    </div>
                    <div className="h-24 bg-white/5 rounded-lg border border-white/5 p-4 flex flex-col gap-2">
                      <div className="h-3 w-1/2 bg-white/10 rounded"></div>
                      <div className="h-3 w-full bg-white/20 rounded"></div>
                      <div className="h-3 w-4/5 bg-white/20 rounded"></div>
                    </div>
                  </div>
                </div>

                {/* Floating elements */}
                <div className="absolute -right-4 top-20 bg-white p-3 rounded-xl shadow-xl border border-slate-100 flex items-center gap-3 animate-float">
                  <div className="w-8 h-8 rounded-full bg-[#102C23] flex items-center justify-center">
                    <Brain className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800">Decision Extracted</div>
                    <div className="text-[10px] text-slate-500">&quot;Launch Q3 marketing campaign&quot;</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Logos Section */}
        <section className="py-10 border-y border-slate-200/50 bg-white">
          <div className="max-w-7xl mx-auto px-6">
            <p className="text-center text-sm font-bold text-slate-400 uppercase tracking-widest mb-8">
              Trusted by innovative teams worldwide
            </p>
            <div className="flex flex-wrap justify-center items-center gap-12 sm:gap-24 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
              <svg width="120" height="40" viewBox="0 0 120 40" fill="currentColor" className="text-slate-800">
                <rect x="10" y="10" width="20" height="20" rx="4" />
                <text x="40" y="25" fontSize="16" fontWeight="bold">Acme Corp</text>
              </svg>
              <svg width="120" height="40" viewBox="0 0 120 40" fill="currentColor" className="text-slate-800">
                <circle cx="20" cy="20" r="10" />
                <text x="40" y="25" fontSize="16" fontWeight="bold">Globex</text>
              </svg>
              <svg width="120" height="40" viewBox="0 0 120 40" fill="currentColor" className="text-slate-800">
                <polygon points="20,10 30,30 10,30" />
                <text x="40" y="25" fontSize="16" fontWeight="bold">Soylent</text>
              </svg>
              <svg width="120" height="40" viewBox="0 0 120 40" fill="currentColor" className="text-slate-800">
                <rect x="10" y="10" width="20" height="20" transform="rotate(45 20 20)" />
                <text x="40" y="25" fontSize="16" fontWeight="bold">Initech</text>
              </svg>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-24 bg-[#F9F8F6]">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-[#0f172a] mb-4">
                Everything you need to never forget a thing
              </h2>
              <p className="text-lg text-slate-600">
                MeetingMind is built to run quietly in the background, surfacing insights only when you need them.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow group">
                <div className="w-12 h-12 bg-[#102C23]/5 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-[#102C23] transition-all">
                  <Brain className="w-6 h-6 text-[#102C23] group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">Contextual Memory</h3>
                <p className="text-slate-600 leading-relaxed">
                  Automatically extracts and stores decisions, ideas, and action items from every meeting with perfect 99.8% accuracy.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow group">
                <div className="w-12 h-12 bg-[#102C23]/5 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-[#102C23] transition-all">
                  <Search className="w-6 h-6 text-[#102C23] group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">Semantic Search</h3>
                <p className="text-slate-600 leading-relaxed">
                  &quot;What did we decide about the Q3 budget?&quot; Search across your entire organization&apos;s meeting history instantly.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow group">
                <div className="w-12 h-12 bg-[#102C23]/5 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-[#102C23] transition-all">
                  <Network className="w-6 h-6 text-[#102C23] group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">Knowledge Graph</h3>
                <p className="text-slate-600 leading-relaxed">
                  See how decisions connect. MeetingMind maps relationships between topics, projects, and people over time.
                </p>
              </div>
              
              {/* Feature 4 */}
              <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow group">
                <div className="w-12 h-12 bg-[#102C23]/5 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-[#102C23] transition-all">
                  <Clock className="w-6 h-6 text-[#102C23] group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">Real-time Processing</h3>
                <p className="text-slate-600 leading-relaxed">
                  Meeting insights are generated in under 3 minutes after your call ends. You&apos;ll never wait for notes again.
                </p>
              </div>
              
              {/* Feature 5 */}
              <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow group md:col-span-2 lg:col-span-2 flex flex-col sm:flex-row gap-8 items-center">
                <div className="flex-1">
                  <div className="w-12 h-12 bg-[#102C23]/5 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-[#102C23] transition-all">
                    <Shield className="w-6 h-6 text-[#102C23] group-hover:text-white transition-colors" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">Enterprise Security</h3>
                  <p className="text-slate-600 leading-relaxed">
                    100% GDPR compliant. End-to-end encryption for all your transcripts and generated insights. Your data is never used to train external models.
                  </p>
                </div>
                <div className="w-full sm:w-1/3 aspect-square bg-[#102C23] rounded-xl p-4 flex flex-col justify-between">
                  <div className="text-[#64E0AA] text-sm font-bold uppercase tracking-wider">Security Score</div>
                  <div className="text-5xl font-bold text-white">100<span className="text-2xl text-[#9DB2AA]">/100</span></div>
                  <div className="text-[#9DB2AA] text-xs">SOC2 Type II Certified</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 bg-[#102C23] relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
          <div className="max-w-4xl mx-auto px-6 relative z-10 text-center">
            <h2 className="text-4xl md:text-6xl font-extrabold text-white tracking-tight mb-6">
              Give your team a memory that never fades.
            </h2>
            <p className="text-xl text-[#9DB2AA] mb-10 max-w-2xl mx-auto">
              Join thousands of forward-thinking teams using MeetingMind to preserve their most valuable asset: organizational knowledge.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link 
                href="/login?mode=signup" 
                className="inline-flex items-center justify-center px-8 py-4 rounded-xl bg-[#64E0AA] hover:bg-[#52c997] text-[#102C23] font-extrabold text-lg transition-all shadow-lg hover:shadow-xl hover:-translate-y-1"
              >
                Create free account
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 mb-16">
            <div className="col-span-2 lg:col-span-2">
              <Logo />
              <p className="mt-6 text-slate-500 text-sm max-w-xs leading-relaxed">
                The intelligent organizational memory platform for modern, distributed teams. Never lose a decision again.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 mb-4">Product</h4>
              <ul className="space-y-3">
                <li><a href="#" className="text-slate-500 hover:text-[#102C23] text-sm transition-colors">Features</a></li>
                <li><a href="#" className="text-slate-500 hover:text-[#102C23] text-sm transition-colors">Integrations</a></li>
                <li><a href="#" className="text-slate-500 hover:text-[#102C23] text-sm transition-colors">Pricing</a></li>
                <li><a href="#" className="text-slate-500 hover:text-[#102C23] text-sm transition-colors">Changelog</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 mb-4">Company</h4>
              <ul className="space-y-3">
                <li><a href="#" className="text-slate-500 hover:text-[#102C23] text-sm transition-colors">About Us</a></li>
                <li><a href="#" className="text-slate-500 hover:text-[#102C23] text-sm transition-colors">Careers</a></li>
                <li><a href="#" className="text-slate-500 hover:text-[#102C23] text-sm transition-colors">Blog</a></li>
                <li><a href="#" className="text-slate-500 hover:text-[#102C23] text-sm transition-colors">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 mb-4">Legal</h4>
              <ul className="space-y-3">
                <li><a href="#" className="text-slate-500 hover:text-[#102C23] text-sm transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="text-slate-500 hover:text-[#102C23] text-sm transition-colors">Terms of Service</a></li>
                <li><a href="#" className="text-slate-500 hover:text-[#102C23] text-sm transition-colors">Security</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-200 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-slate-400 text-sm">
              © {new Date().getFullYear()} MeetingMind AI. All rights reserved.
            </p>
            <div className="flex gap-4">
              <a href="#" className="text-slate-400 hover:text-[#102C23] transition-colors">
                <span className="sr-only">Twitter</span>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84"/></svg>
              </a>
              <a href="#" className="text-slate-400 hover:text-[#102C23] transition-colors">
                <span className="sr-only">GitHub</span>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd"/></svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
