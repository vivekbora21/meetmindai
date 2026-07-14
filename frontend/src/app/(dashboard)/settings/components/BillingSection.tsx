"use client";

import React from "react";
import { CreditCard } from "lucide-react";

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

interface BillingSectionProps {
  billingData: BillingInfo | null;
}

export default function BillingSection({ billingData }: BillingSectionProps) {
  if (!billingData) return null;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-bold text-[#102C23]">Billing, Plans & Credits</h2>
        <p className="text-xs text-slate-550 font-semibold">Control payment subscriptions, view invoices, and analyze usage meters.</p>
      </div>

      {/* Billing Usage Meters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="border border-[#DEDDDA]/60 rounded-2xl p-5 space-y-3 bg-white">
          <span className="text-xs font-bold text-slate-400 uppercase">Meeting Minutes</span>
          <h3 className="text-2xl font-bold text-slate-800">
            {billingData.usage.meeting_minutes_used} <span className="text-sm text-slate-400 font-semibold">/ {billingData.usage.meeting_minutes_limit} mins</span>
          </h3>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div className="bg-[#113229] h-full" style={{ width: `${(billingData.usage.meeting_minutes_used / billingData.usage.meeting_minutes_limit) * 100}%` }} />
          </div>
        </div>

        <div className="border border-[#DEDDDA]/60 rounded-2xl p-5 space-y-3 bg-white">
          <span className="text-xs font-bold text-slate-400 uppercase">Storage Limit</span>
          <h3 className="text-2xl font-bold text-slate-800">
            {billingData.usage.storage_gb_used} <span className="text-sm text-slate-400 font-semibold">/ {billingData.usage.storage_gb_limit} GB</span>
          </h3>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div className="bg-indigo-600 h-full" style={{ width: `${(billingData.usage.storage_gb_used / billingData.usage.storage_gb_limit) * 100}%` }} />
          </div>
        </div>

        <div className="border border-[#DEDDDA]/60 rounded-2xl p-5 space-y-3 bg-white">
          <span className="text-xs font-bold text-slate-400 uppercase">AI Token Credits</span>
          <h3 className="text-2xl font-bold text-slate-800">
            {billingData.usage.ai_credits_used} <span className="text-sm text-slate-400 font-semibold">/ {billingData.usage.ai_credits_limit} credits</span>
          </h3>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div className="bg-amber-600 h-full" style={{ width: `${(billingData.usage.ai_credits_used / billingData.usage.ai_credits_limit) * 100}%` }} />
          </div>
        </div>
      </div>

      {/* Payment Info */}
      <div className="border-t border-[#DEDDDA]/40 pt-6 space-y-4">
        <h3 className="text-sm font-bold text-slate-800">Payment Cards</h3>
        {billingData.payment_methods.map(card => (
          <div key={card.id} className="flex items-center justify-between p-4 border border-[#DEDDDA]/60 rounded-xl text-xs font-medium bg-white">
            <div className="flex items-center gap-3">
              <CreditCard className="w-6 h-6 text-slate-400" />
              <div>
                <span className="font-bold text-slate-800 block">{card.brand} •••• {card.last4}</span>
                <span className="text-slate-400">Expires: {card.expiry}</span>
              </div>
            </div>
            {card.is_default && <span className="text-[10px] font-bold text-[#113229] bg-[#E8F3F0] border border-[#113229]/15 px-2 py-0.5 rounded-full">Default</span>}
          </div>
        ))}
      </div>

      {/* Invoice History */}
      <div className="border-t border-[#DEDDDA]/40 pt-6 space-y-4">
        <h3 className="text-sm font-bold text-slate-800">Billing History</h3>
        <div className="space-y-2">
          {billingData.billing_history.map(inv => (
            <div key={inv.invoice_id} className="flex items-center justify-between p-3 border border-[#F9F8F6] hover:bg-[#F9F8F6] rounded-xl text-xs font-medium">
              <div>
                <span className="font-bold text-slate-800 block">{inv.invoice_id}</span>
                <span className="text-slate-400">{inv.date}</span>
              </div>
              <div className="text-right">
                <span className="font-bold text-slate-800 block">${inv.amount.toFixed(2)}</span>
                <span className="text-[#113229] font-semibold">{inv.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
