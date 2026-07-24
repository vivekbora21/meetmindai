"use client";

import React, { useState, useEffect } from "react";
import { X, Mail, Loader2, RefreshCw, Layers, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { MeetingDetail } from "../types/meeting";
import { meetingService } from "../services/meeting.service";
import { getApiUrl } from "../../../app/config";
import { API_ENDPOINTS } from "../../../app/api.endpoints";

interface SendMomModalProps {
  isOpen: boolean;
  onClose: () => void;
  meeting: MeetingDetail;
}

export function SendMomModal({ isOpen, onClose, meeting }: SendMomModalProps) {
  const [to, setTo] = useState<string>("");
  const [cc, setCc] = useState<string>("");
  const [bcc, setBcc] = useState<string>("svivek431@gmail.com");
  const [subject, setSubject] = useState<string>(`Minutes of Meeting: ${meeting.title}`);
  const [templateType, setTemplateType] = useState<string>("standard");
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [loadingPreview, setLoadingPreview] = useState<boolean>(false);
  const [sending, setSending] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);

  // Initialize To list from attendees and organizer
  useEffect(() => {
    if (!isOpen) return;
    
    const emails = new Set<string>();
    
    // Add organizer if present
    if (meeting.organizer_email) {
      emails.add(meeting.organizer_email);
    }
    
    // Add attendees
    if (meeting.attendees) {
      meeting.attendees.forEach((att) => {
        if (typeof att === "string" && att.includes("@")) {
          emails.add(att);
        } else if (att && typeof att === "object") {
          const email = att.email || att.address;
          if (email && email.includes("@")) {
            emails.add(email);
          }
        }
      });
    }
    
    setTo(Array.from(emails).join(", "));
    setSubject(`Minutes of Meeting: ${meeting.title}`);
  }, [isOpen, meeting.organizer_email, meeting.attendees, meeting.title]);

  // Fetch HTML preview when templateType changes
  useEffect(() => {
    if (!isOpen) return;

    const fetchPreview = async () => {
      setLoadingPreview(true);
      try {
        const url = getApiUrl(API_ENDPOINTS.MEETINGS.MOM_PREVIEW(meeting.id, templateType));
        const res = await fetch(url, { credentials: "include" });
        if (res.ok) {
          const html = await res.text();
          setPreviewHtml(html);
        }
      } catch (err) {
        console.error("Error fetching MOM preview", err);
      } finally {
        setLoadingPreview(false);
      }
    };

    fetchPreview();
  }, [isOpen, meeting.id, templateType]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);

    const toList = to.split(",").map(e => e.trim()).filter(Boolean);
    const ccList = cc.split(",").map(e => e.trim()).filter(Boolean);
    const bccList = bcc.split(",").map(e => e.trim()).filter(Boolean);

    try {
      await meetingService.sendMomEmail(meeting.id, {
        to: toList,
        cc: ccList.length > 0 ? ccList : undefined,
        bcc: bccList.length > 0 ? bccList : undefined,
        subject,
        template_type: templateType
      });
      
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 2000);
    } catch (err) {
      console.error("Error sending MOM email", err);
      alert("Failed to send MOM email. Please verify configuration and SMTP credentials.");
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-[#FBFBFA] border border-slate-200 rounded-2xl shadow-2xl max-w-6xl w-full h-[85vh] flex flex-col md:flex-row overflow-hidden"
          role="dialog"
          aria-modal="true"
        >
          {/* Left panel: Form Controls */}
          <div className="w-full md:w-1/2 p-6 flex flex-col border-b md:border-b-0 md:border-r border-slate-200 overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-[#113229]/10 rounded-xl text-[#113229]">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">Send MOM Email</h3>
                  <p className="text-xs text-slate-500 font-medium">Customize details and choose a template</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-700 transition-colors p-1.5 hover:bg-slate-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {success ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 gap-4">
                <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center animate-bounce">
                  <CheckCircle className="w-10 h-10" />
                </div>
                <h4 className="text-lg font-bold text-slate-800">MOM Email Dispatched!</h4>
                <p className="text-sm text-slate-500 max-w-sm">The email request has been successfully queued for delivery to the recipients.</p>
              </div>
            ) : (
              <form onSubmit={handleSend} className="flex-1 flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">To (Recipients)</label>
                  <input
                    type="text"
                    required
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    placeholder="recipient1@domain.com, recipient2@domain.com"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-[#113229] transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">CC</label>
                  <input
                    type="text"
                    value={cc}
                    onChange={(e) => setCc(e.target.value)}
                    placeholder="cc1@domain.com, cc2@domain.com"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-[#113229] transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">BCC</label>
                  <input
                    type="text"
                    value={bcc}
                    onChange={(e) => setBcc(e.target.value)}
                    placeholder="bcc1@domain.com"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-[#113229] transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Subject</label>
                  <input
                    type="text"
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Email subject line"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-[#113229] transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Template Style</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "standard", name: "Standard", desc: "Full summary & items" },
                      { id: "executive", name: "Executive", desc: "Summary & Decisions" },
                      { id: "action_focused", name: "Action Focused", desc: "Just tasks & owners" }
                    ].map((tpl) => (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => setTemplateType(tpl.id)}
                        className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                          templateType === tpl.id
                            ? "bg-[#113229]/5 border-[#113229] text-[#113229] font-semibold"
                            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <span className="text-sm font-semibold">{tpl.name}</span>
                        <span className="text-[10px] text-slate-400 mt-1">{tpl.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-auto pt-6 flex justify-end gap-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl text-sm font-semibold hover:bg-slate-100 transition-colors text-slate-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={sending}
                    className="px-5 py-2.5 rounded-xl bg-[#113229] hover:bg-[#102C23] text-white text-sm font-bold transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center gap-2"
                  >
                    {sending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="w-4 h-4" />
                        Send Email
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Right panel: Live Preview */}
          <div className="w-full md:w-1/2 bg-slate-100 p-4 flex flex-col h-[40vh] md:h-auto overflow-hidden">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 mb-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" /> HTML Email Live Preview
              </span>
              {loadingPreview && <RefreshCw className="w-3.5 h-3.5 text-slate-400 animate-spin" />}
            </div>
            
            <div className="flex-1 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-inner relative">
              {loadingPreview && !previewHtml ? (
                <div className="absolute inset-0 flex items-center justify-center bg-white/70">
                  <Loader2 className="w-8 h-8 text-[#113229] animate-spin" />
                </div>
              ) : null}
              {previewHtml ? (
                <iframe
                  srcDoc={previewHtml}
                  title="MOM Email Preview"
                  className="w-full h-full border-none"
                  sandbox="allow-same-origin"
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
                  <Mail className="w-8 h-8" />
                  <span className="text-xs font-medium">Generating email preview...</span>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
