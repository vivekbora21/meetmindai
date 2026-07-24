"use client";

import React from "react";
import { X, RefreshCw } from "lucide-react";
import { parseUTCDate } from "../../../config";

interface IntegrationItem {
  id: string;
  provider: string;
  email: string;
  connection_status: string;
  reconnect_required: boolean;
  last_sync: string | null;
  sync_errors: string | null;
  auto_sync: boolean;
  recording_import: boolean;
  calendar_sync: boolean;
}

interface IntegrationsSectionProps {
  integrations: IntegrationItem[];
  setIntegrations: React.Dispatch<React.SetStateAction<IntegrationItem[]>>;
  connect: (provider: string) => void;
  handleDisconnectIntegration: (id: string, name: string) => Promise<void>;
  handleSyncIntegration: (id: string, name: string) => Promise<void>;
  connectProvider: string | null;
  setConnectProvider: (provider: string | null) => void;
  connectEmail: string;
  setConnectEmail: (email: string) => void;
  handleConnectIntegration: () => Promise<void>;
  markDirty: () => void;
}

export default function IntegrationsSection({
  integrations,
  setIntegrations,
  connect,
  handleDisconnectIntegration,
  handleSyncIntegration,
  connectProvider,
  setConnectProvider,
  connectEmail,
  setConnectEmail,
  handleConnectIntegration,
  markDirty
}: IntegrationsSectionProps) {
  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#102C23]">Connected Integration Platforms</h2>
          <p className="text-xs text-slate-550 font-semibold">Link your meeting accounts, calendars, and chats for auto ingestion.</p>
        </div>
      </div>

      {/* Provider Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[
          { key: "googlemeet", name: "Google Meet", bg: "bg-teal-50 border-teal-200 text-teal-700", label: "Meet", icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          )},
          { key: "googlecalendar", name: "Google Calendar", bg: "bg-blue-50 border-blue-200 text-blue-700", label: "Cal", icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          )},
          { key: "msteams", name: "Microsoft Teams", bg: "bg-indigo-50 border-indigo-200 text-indigo-700", label: "Teams", icon: (
            <span className="text-sm font-black font-mono">T</span>
          )},
          { key: "outlook", name: "Microsoft Outlook Calendar", bg: "bg-blue-100 border-blue-300 text-blue-800", label: "Outlook", icon: (
            <span className="text-sm font-black font-mono">O</span>
          )},
          { key: "zoom", name: "Zoom Meetings", bg: "bg-blue-600 border-blue-700 text-white shadow-sm", label: "Zoom", icon: (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M16 16v-3.5l4.5 3.5v-8L16 11.5V8c0-.55-.45-1-1-1H3c-.55 0-1 .45-1 1v8c0 .55.45 1 1 1h12c.55 0 1-.45 1-1z" />
            </svg>
          )},
          { key: "slack", name: "Slack Workspaces", bg: "bg-amber-50 border-amber-200 text-amber-700", label: "Slack", icon: (
            <span className="text-sm font-bold font-mono">#</span>
          )},
          { key: "discord", name: "Discord Servers", bg: "bg-indigo-600 border-indigo-750 text-white shadow-sm", label: "Discord", icon: (
            <span className="text-sm font-black font-mono">D</span>
          )},
          { key: "webex", name: "Cisco Webex", bg: "bg-slate-100 border-slate-200 text-slate-700", label: "Webex", icon: (
            <span className="text-sm font-bold font-mono">W</span>
          )},
          { key: "applecalendar", name: "Apple Calendar", bg: "bg-red-50 border-red-200 text-red-700", label: "Apple", icon: (
            <span className="text-sm font-black font-mono">A</span>
          )}
        ].map(platform => {
          const conn = integrations.find(item => item.provider === platform.key);
          const needsReconnect = conn?.reconnect_required || conn?.connection_status === "needs_reauthorization";
          return (
            <div key={platform.key} className={`border rounded-2xl p-5 hover:shadow-md transition-all space-y-4 ${
              needsReconnect
                ? "border-amber-300 bg-amber-50/40"
                : "border-[#DEDDDA]/60 bg-white"
            }`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${platform.bg}`}>
                    {platform.icon}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">{platform.name}</h3>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      needsReconnect
                        ? "bg-amber-100 text-amber-805 border border-amber-200"
                        : conn
                          ? "bg-[#E8F3F0] text-[#113229] border border-[#113229]/15"
                          : "bg-slate-100 text-slate-500 border border-slate-200"
                    }`}>
                      {needsReconnect ? "⚠ Needs Reconnect" : conn ? "Connected" : "Disconnected"}
                    </span>
                  </div>
                </div>
                {conn ? (
                  <button 
                    onClick={() => handleDisconnectIntegration(conn.id, platform.name)}
                    className="text-xs font-semibold text-red-600 hover:text-red-700"
                  >
                    Disconnect
                  </button>
                ) : (
                  <button 
                    onClick={() => connect(platform.key)}
                    className="px-3 py-1 bg-[#113229] hover:bg-[#102C23] text-white text-xs font-bold rounded-lg transition-colors"
                  >
                    Connect
                  </button>
                )}
              </div>

              {/* Reauthorization warning banner */}
              {needsReconnect && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 space-y-1.5">
                  <p className="font-semibold">⚠ Action required: reconnect your account</p>
                  <p className="text-amber-700 leading-relaxed">
                    The access token for this integration is missing required permissions.
                    Please reconnect to grant the necessary access.
                  </p>
                  <button
                    onClick={() => connect(platform.key)}
                    className="mt-1 w-full px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold rounded-lg transition-colors text-center block"
                  >
                    Reconnect {platform.name}
                  </button>
                </div>
              )}

              {conn && !needsReconnect && (
                <div className="border-t border-[#DEDDDA]/40 pt-3 space-y-2 text-xs text-slate-500">
                  <div className="flex justify-between">
                    <span>Account email:</span>
                    <span className="font-semibold text-slate-700">{conn.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Last sync:</span>
                    <span>{conn.last_sync ? parseUTCDate(conn.last_sync).toLocaleString() : "Never"}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-[#F9F8F6] pt-2">
                    <span className="font-semibold text-slate-700">Auto synchronization</span>
                    <input
                      type="checkbox"
                      checked={conn.auto_sync}
                      onChange={async (e) => {
                        markDirty();
                        conn.auto_sync = e.target.checked;
                        setIntegrations([...integrations]);
                      }}
                      className="w-4 h-4 text-[#113229] focus:ring-[#113229] border-[#DEDDDA]/60 rounded cursor-pointer"
                    />
                  </div>
                  <div className="flex justify-between gap-2 pt-2">
                    <button 
                      onClick={() => handleSyncIntegration(conn.id, platform.name)}
                      className="flex items-center gap-1 text-[11px] font-bold text-[#113229] bg-[#E8F3F0] hover:bg-[#D4E8E2] px-2 py-1 rounded-md transition-colors"
                    >
                      <RefreshCw className="w-3 h-3" /> Sync Now
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Connect Integration Modal / Dialog */}
      {connectProvider && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full border border-[#DEDDDA]/60 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-md font-bold text-[#102C23] capitalize">Connect {connectProvider}</h3>
              <button onClick={() => setConnectProvider(null)}><X className="w-5 h-5 text-slate-405" /></button>
            </div>
            <p className="text-xs text-slate-500 font-semibold">Provide the email address associated with your external account to connect OAuth authentication.</p>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Account Email</label>
              <input
                type="email"
                placeholder="user@organization.com"
                value={connectEmail}
                onChange={(e) => setConnectEmail(e.target.value)}
                className="w-full px-3 py-2 border border-[#DEDDDA]/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#113229]/10 focus:border-[#113229] bg-white"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button 
                onClick={() => setConnectProvider(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-55 rounded-lg"
              >
                Cancel
              </button>
              <button 
                onClick={handleConnectIntegration}
                className="px-4 py-1.5 text-xs font-bold bg-[#113229] text-white hover:bg-[#102C23] rounded-lg shadow"
              >
                Proceed to Connect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
