"use client";

import React from "react";

interface OrgMember {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface OrgInfo {
  organization_name: string;
  members: OrgMember[];
}

interface OrganizationSectionProps {
  orgData: OrgInfo | null;
}

export default function OrganizationSection({ orgData }: OrganizationSectionProps) {
  if (!orgData) return null;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-bold text-[#102C23]">Organization Settings</h2>
        <p className="text-xs text-slate-550 font-semibold">Configure members directory, role permissions, and invites under {orgData.organization_name}.</p>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-bold text-slate-800">Members Directory</h3>
        <div className="divide-y divide-[#DEDDDA]/40 border border-[#DEDDDA]/60 rounded-2xl overflow-hidden">
          {orgData.members.map(member => (
            <div key={member.id} className="flex items-center justify-between p-4 bg-white hover:bg-[#F9F8F6] transition-colors text-xs">
              <div>
                <span className="font-bold text-slate-850 block">{member.name}</span>
                <span className="text-slate-400 font-semibold">{member.email}</span>
              </div>
              <div>
                <span className="px-2 py-1 bg-slate-100 text-slate-650 rounded-lg font-bold">{member.role}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-[#DEDDDA]/40 pt-6 space-y-4">
        <h3 className="text-sm font-bold text-slate-800">Invite Colleagues</h3>
        <div className="flex gap-2">
          <input
            type="email"
            placeholder="colleague@company.com"
            className="flex-1 px-4 py-2.5 border border-[#DEDDDA]/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#113229]/10 focus:border-[#113229] bg-white"
          />
          <button className="px-4 py-2.5 bg-[#113229] hover:bg-[#102C23] text-white rounded-xl text-xs font-bold transition-colors">
            Send Invite
          </button>
        </div>
      </div>
    </div>
  );
}
