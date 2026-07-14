"use client";

import React from "react";
import { Copy, Laptop } from "lucide-react";

interface ApiKeyItem {
  id: string;
  name: string;
  key_prefix: string;
  created_at: string;
  expires_at: string | null;
  last_used_at: string | null;
}

interface SessionItem {
  id: string;
  device: string;
  ip_address: string;
  location: string;
  created_at: string;
  is_active: boolean;
}

interface SecuritySectionProps {
  newKeyName: string;
  setNewKeyName: (val: string) => void;
  handleCreateAPIKey: () => Promise<void>;
  newlyCreatedKey: { name: string; key: string } | null;
  copyToClipboard: (text: string) => void;
  apiKeys: ApiKeyItem[];
  handleRevokeAPIKey: (id: string, name: string) => Promise<void>;
  sessions: SessionItem[];
  handleRevokeSession: (id: string) => Promise<void>;
  handleLogoutAllSessions: () => Promise<void>;
}

export default function SecuritySection({
  newKeyName,
  setNewKeyName,
  handleCreateAPIKey,
  newlyCreatedKey,
  copyToClipboard,
  apiKeys,
  handleRevokeAPIKey,
  sessions,
  handleRevokeSession,
  handleLogoutAllSessions
}: SecuritySectionProps) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-bold text-[#102C23]">Security, Sessions & API Tokens</h2>
        <p className="text-xs text-slate-550 font-semibold">Monitor active browser session terminals, toggle 2FA and generate developer API keys.</p>
      </div>

      {/* Two Factor Authentication */}
      <div className="pb-6 border-b border-[#DEDDDA]/40 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Two Factor Authentication (2FA)</h3>
            <p className="text-xs text-slate-500 font-semibold">Enforce authentication codes via Google Authenticator app.</p>
          </div>
          <button className="px-3 py-1.5 bg-[#113229] hover:bg-[#102C23] text-white rounded-xl text-xs font-bold transition-colors">
            Enable 2FA
          </button>
        </div>
      </div>

      {/* Developer API Keys */}
      <div className="pb-6 border-b border-[#DEDDDA]/40 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-800">Developer API Keys</h3>
          <p className="text-xs text-slate-500 font-semibold">Create secrets to access MeetingMind programmatically.</p>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Key nickname (e.g. Jenkins Client)"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            className="flex-1 px-4 py-2.5 border border-[#DEDDDA]/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#113229]/10 focus:border-[#113229] bg-white"
          />
          <button 
            onClick={handleCreateAPIKey}
            className="px-4 py-2.5 bg-[#113229] hover:bg-[#102C23] text-white rounded-xl text-xs font-bold transition-colors"
          >
            Generate Key
          </button>
        </div>

        {newlyCreatedKey && (
          <div className="bg-[#E8F3F0] border border-[#113229]/20 text-[#113229] p-4 rounded-xl space-y-2">
            <span className="text-xs font-bold block">Key created! Copy it now. It won&apos;t be displayed again:</span>
            <div className="flex items-center justify-between gap-4 bg-white/80 p-2 rounded-lg border border-[#113229]/10">
              <code className="text-xs break-all select-all font-mono font-bold">{newlyCreatedKey.key}</code>
              <button onClick={() => copyToClipboard(newlyCreatedKey.key)} className="text-[#113229] hover:text-[#102C23]"><Copy className="w-4 h-4" /></button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {apiKeys.map(key => (
            <div key={key.id} className="flex items-center justify-between p-3 border border-[#DEDDDA]/60 rounded-xl text-xs font-medium bg-white">
              <div>
                <span className="font-bold text-slate-800 block">{key.name}</span>
                <span className="font-mono text-slate-400 font-semibold">Prefix: {key.key_prefix}xxxx</span>
              </div>
              <button 
                onClick={() => handleRevokeAPIKey(key.id, key.name)}
                className="text-xs font-bold text-red-650 hover:text-red-700"
              >
                Revoke Key
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Active Sessions */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Active Device Terminals</h3>
            <p className="text-xs text-slate-500 font-semibold">Revoke sessions connected from other locations.</p>
          </div>
          <button 
            onClick={handleLogoutAllSessions}
            className="text-xs font-bold text-red-600 hover:text-red-700"
          >
            Logout All Other Devices
          </button>
        </div>

        <div className="space-y-3">
          {sessions.map(sess => (
            <div key={sess.id} className="flex items-center justify-between p-4 border border-[#DEDDDA]/60 rounded-xl text-xs bg-white">
              <div className="flex items-center gap-3">
                <Laptop className="w-5 h-5 text-slate-400" />
                <div>
                  <span className="font-bold text-slate-800 block">{sess.device}</span>
                  <span className="text-slate-400 font-semibold">IP: {sess.ip_address} • Location: {sess.location}</span>
                </div>
              </div>
              <button 
                onClick={() => handleRevokeSession(sess.id)}
                className="px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:bg-slate-55 border border-slate-200 rounded-lg transition-colors"
              >
                Revoke
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
