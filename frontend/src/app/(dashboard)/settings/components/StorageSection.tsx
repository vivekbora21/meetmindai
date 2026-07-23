"use client";

import React from "react";
import { HardDrive, Download, Trash } from "lucide-react";

interface BillingInfo {
  usage: {
    meeting_minutes_used: number;
    meeting_minutes_limit: number;
    storage_gb_used: number;
    storage_gb_limit: number;
    ai_credits_used: number;
    ai_credits_limit: number;
  };
  payment_methods: Array<{
    id: string;
    brand: string;
    last4: string;
    expiry: string;
    is_default: boolean;
  }>;
  billing_history: Array<{
    invoice_id: string;
    date: string;
    amount: number;
    status: string;
  }>;
}

interface StorageSectionProps {
  billingData: BillingInfo | null;
  handleStorageCleanup: (category: string) => Promise<void>;
  handleExportData: () => Promise<void>;
}

export default function StorageSection({
  billingData,
  handleStorageCleanup,
  handleExportData
}: StorageSectionProps) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-bold text-[#102C23]">Storage & Assets Management</h2>
        <p className="text-xs text-slate-550 font-semibold">Track media uploads, transcript files, cached LLM weights, and purge assets.</p>
      </div>

      {billingData && (
        <div className="space-y-6">
          {/* Storage Bar Breakdown */}
          <div className="border border-[#DEDDDA]/60 rounded-2xl p-5 space-y-4 bg-[#F9F8F6]">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-500 uppercase tracking-wide">Usage breakdown</span>
              <span className="text-[#113229] font-bold">
                {billingData.usage.storage_gb_used} GB of {billingData.usage.storage_gb_limit} GB
              </span>
            </div>
            <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden flex">
              {/* Fake breakdown representation */}
              <div className="bg-[#113229] h-full" style={{ width: "45%" }} title="Recordings" />
              <div className="bg-[#D98A44] h-full" style={{ width: "20%" }} title="Transcripts" />
              <div className="bg-indigo-650 h-full" style={{ width: "10%" }} title="Vector DB Cache" />
            </div>
            <div className="flex flex-wrap gap-4 text-xs font-semibold pt-2 text-slate-500">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-[#113229]" />
                <span>Audio Recordings (4.5 GB)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-[#D98A44]" />
                <span>Text Transcripts (2.0 GB)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                <span>Vector Cache (1.0 GB)</span>
              </div>
            </div>
          </div>

          {/* Granular Table controls */}
          <div className="border border-[#DEDDDA]/60 rounded-2xl overflow-hidden text-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-[#DEDDDA]/60 font-bold text-slate-500">
                  <th className="py-3 px-4">Storage Category</th>
                  <th className="py-3 px-4">Total Files</th>
                  <th className="py-3 px-4">Space Used</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DEDDDA]/40 font-medium">
                {[
                  { key: "recordings", label: "Media Recordings", count: 85, size: "4.5 GB" },
                  { key: "transcripts", label: "Whisper Transcripts JSON", count: 243, size: "2.0 GB" },
                  { key: "embeddings", label: "AI Embedding Matrices", count: 1250, size: "1.0 GB" },
                  { key: "cache", label: "System Cache & Metadata", count: 9812, size: "0.3 GB" }
                ].map(row => (
                  <tr key={row.key} className="hover:bg-slate-55/30 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-800 flex items-center gap-2">
                      <HardDrive className="w-4 h-4 text-slate-400" />
                      {row.label}
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-semibold">{row.count} items</td>
                    <td className="py-3 px-4 text-slate-805 font-bold">{row.size}</td>
                    <td className="py-3 px-4 text-right">
                      <button 
                        onClick={() => handleStorageCleanup(row.key)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded-lg transition-colors inline-flex items-center gap-1 font-bold"
                      >
                        <Trash className="w-3.5 h-3.5" /> Purge
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Export utility */}
          <div className="border-t border-[#DEDDDA]/40 pt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-[#102C23]">Export Workspace Data</h3>
              <p className="text-xs text-slate-550 font-semibold">Download a complete zip file containing transcripts, meeting audio, and AI logs.</p>
            </div>
            <button 
              onClick={handleExportData}
              className="flex items-center gap-2 px-4 py-2 bg-[#113229] hover:bg-[#102C23] text-white text-xs font-bold rounded-xl shadow-lg transition-all"
            >
              <Download className="w-4 h-4" /> Export All Data
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
