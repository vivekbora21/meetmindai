"use client";

import React from "react";

interface AIPreferences {
  preferred_provider: string;
  fallback_provider: string;
  preferred_model: string;
  temperature: number;
  summary_length: string;
  response_style: string;
  enable_chat_memory: boolean;
  enable_semantic_search: boolean;
  enable_context_retrieval: boolean;
  enable_kg_generation: boolean;
  enable_speaker_intelligence: boolean;
  enable_automatic_insights: boolean;
}

interface AISectionProps {
  aiPreferences: AIPreferences;
  setAiPreferences: React.Dispatch<React.SetStateAction<AIPreferences>>;
  markDirty: () => void;
}

export default function AISection({
  aiPreferences,
  setAiPreferences,
  markDirty
}: AISectionProps) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-bold text-[#102C23]">AI Engine Preferences</h2>
        <p className="text-xs text-slate-550 font-semibold">Fine-tune the primary LLM provider, temperature, and formatting styles for analysis.</p>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase">Preferred AI Provider</label>
            <select
              value={aiPreferences.preferred_provider}
              onChange={(e) => { setAiPreferences({ ...aiPreferences, preferred_provider: e.target.value }); markDirty(); }}
              className="w-full px-4 py-2 border border-[#DEDDDA]/60 rounded-xl focus:ring-2 focus:ring-[#113229]/10 focus:border-[#113229] text-sm bg-white cursor-pointer"
            >
              <option value="OpenAI">OpenAI</option>
              <option value="Gemini">Gemini</option>
              <option value="Groq">Groq</option>
              <option value="Claude">Claude</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase">Fallback AI Provider</label>
            <select
              value={aiPreferences.fallback_provider}
              onChange={(e) => { setAiPreferences({ ...aiPreferences, fallback_provider: e.target.value }); markDirty(); }}
              className="w-full px-4 py-2 border border-[#DEDDDA]/60 rounded-xl focus:ring-2 focus:ring-[#113229]/10 focus:border-[#113229] text-sm bg-white cursor-pointer"
            >
              <option value="OpenAI">OpenAI</option>
              <option value="Gemini">Gemini</option>
              <option value="Groq">Groq</option>
              <option value="Claude">Claude</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase">Preferred Model</label>
            <input
              type="text"
              value={aiPreferences.preferred_model}
              onChange={(e) => { setAiPreferences({ ...aiPreferences, preferred_model: e.target.value }); markDirty(); }}
              className="w-full px-4 py-2 border border-[#DEDDDA]/60 rounded-xl focus:ring-2 focus:ring-[#113229]/10 focus:border-[#113229] text-sm bg-white"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between">
              <label className="text-xs font-bold text-slate-500 uppercase">Temperature (Creativity)</label>
              <span className="text-xs font-bold text-[#D98A44]">{aiPreferences.temperature}</span>
            </div>
            <input
              type="range"
              min="0"
              max="1.2"
              step="0.1"
              value={aiPreferences.temperature}
              onChange={(e) => { setAiPreferences({ ...aiPreferences, temperature: parseFloat(e.target.value) }); markDirty(); }}
              className="w-full accent-[#113229] cursor-pointer"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase">Summary Length</label>
            <select
              value={aiPreferences.summary_length}
              onChange={(e) => { setAiPreferences({ ...aiPreferences, summary_length: e.target.value }); markDirty(); }}
              className="w-full px-4 py-2 border border-[#DEDDDA]/60 rounded-xl focus:ring-2 focus:ring-[#113229]/10 focus:border-[#113229] text-sm bg-white cursor-pointer"
            >
              <option value="Short">Short (Bullet Points)</option>
              <option value="Medium">Medium (Balanced)</option>
              <option value="Detailed">Detailed (Full Context)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase">Response Style</label>
            <select
              value={aiPreferences.response_style}
              onChange={(e) => { setAiPreferences({ ...aiPreferences, response_style: e.target.value }); markDirty(); }}
              className="w-full px-4 py-2 border border-[#DEDDDA]/60 rounded-xl focus:ring-2 focus:ring-[#113229]/10 focus:border-[#113229] text-sm bg-white cursor-pointer"
            >
              <option value="Executive">Executive Summary style</option>
              <option value="Professional">Professional & Formal</option>
              <option value="Technical">Technical Context</option>
              <option value="Developer">Developer friendly (Markdown)</option>
              <option value="Simple">Simple & Concise</option>
            </select>
          </div>
        </div>

        <div className="border-t border-[#DEDDDA]/40 pt-6 space-y-4">
          <h3 className="text-sm font-semibold text-slate-800">Advanced AI Engine Capabilities</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { key: "enable_chat_memory", label: "AI Chat Memory (cross-session memory)" },
              { key: "enable_semantic_search", label: "Semantic Vector Search" },
              { key: "enable_context_retrieval", label: "RAG Context Retrieval" },
              { key: "enable_kg_generation", label: "Knowledge Graph entities mapping" },
              { key: "enable_speaker_intelligence", label: "Speaker voice identification" },
              { key: "enable_automatic_insights", label: "Autonomous meeting pattern insights" }
            ].map(item => (
              <label key={item.key} className="flex items-center gap-3 p-3 border border-[#DEDDDA]/40 rounded-xl hover:bg-[#F9F8F6] cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={aiPreferences[item.key as keyof AIPreferences] as boolean}
                  onChange={(e) => { 
                    setAiPreferences({ ...aiPreferences, [item.key]: e.target.checked }); 
                    markDirty(); 
                  }}
                  className="w-4.5 h-4.5 text-[#113229] border-[#DEDDDA]/60 rounded focus:ring-[#113229] cursor-pointer"
                />
                <span className="text-xs text-slate-700 font-semibold">{item.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
