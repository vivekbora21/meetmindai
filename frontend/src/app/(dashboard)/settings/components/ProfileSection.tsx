"use client";

import React from "react";
import Image from "next/image";
import { User, Upload, Check } from "lucide-react";
import { getApiUrl } from "../../../config";

interface ProfileInfo {
  profile_picture: string | null;
  username: string;
  phone_number: string;
  job_title: string;
  company_name: string;
  department: string;
  country: string;
  time_zone: string;
  preferred_language: string;
  last_login: string | null;
  account_status: string;
  subscription_plan: string;
  email_verified: boolean;
}

interface ProfileSectionProps {
  userName: string;
  setUserName: (val: string) => void;
  userEmail: string;
  profile: ProfileInfo;
  setProfile: React.Dispatch<React.SetStateAction<ProfileInfo>>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleRemoveProfilePicture: () => void;
  handleVerifyEmail: () => void;
  currentPassword: string;
  setCurrentPassword: (val: string) => void;
  newPassword: string;
  setNewPassword: (val: string) => void;
  handleResetPassword: () => void;
  markDirty: () => void;
}

export default function ProfileSection({
  userName,
  setUserName,
  userEmail,
  profile,
  setProfile,
  fileInputRef,
  handleFileChange,
  handleRemoveProfilePicture,
  handleVerifyEmail,
  currentPassword,
  setCurrentPassword,
  newPassword,
  setNewPassword,
  handleResetPassword,
  markDirty
}: ProfileSectionProps) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-bold text-[#102C23]">Profile Details</h2>
        <p className="text-xs text-slate-500 font-semibold">Update your basic details, profile photo, and password information.</p>
      </div>

      {/* Profile Picture Upload & Crop representation */}
      <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-[#DEDDDA]/40">
        <div className="relative group cursor-pointer w-24 h-24 rounded-full overflow-hidden bg-slate-100 border border-[#DEDDDA]/60 flex items-center justify-center">
          {profile.profile_picture ? (
            <Image 
              src={getApiUrl(profile.profile_picture)} 
              alt="Profile Picture" 
              className="w-full h-full object-cover"
              width={96}
              height={96}
              unoptimized
            />
          ) : (
            <User className="w-10 h-10 text-slate-400" />
          )}
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="absolute inset-0 bg-black/45 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Upload className="w-5 h-5 text-white" />
          </div>
        </div>
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          className="hidden" 
          accept="image/*"
        />
        <div className="space-y-2 text-center sm:text-left">
          <h3 className="text-sm font-semibold text-slate-800">Your profile picture</h3>
          <p className="text-xs text-slate-500 font-semibold">Supports JPG, PNG or WEBP formats. Crop photo by adjusting dimensions.</p>
          <div className="flex items-center justify-center sm:justify-start gap-3">
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 text-xs font-bold text-[#113229] bg-[#E8F3F0] hover:bg-[#D4E8E2] border border-[#113229]/20 rounded-lg transition-colors"
            >
              Upload new photo
            </button>
            {profile.profile_picture && (
              <button 
                onClick={handleRemoveProfilePicture}
                className="px-3 py-1.5 text-xs font-semibold text-red-700 hover:text-red-800 hover:bg-red-55/40 rounded-lg transition-colors"
              >
                Remove
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Profile Edit Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-500 uppercase">Full Name</label>
          <input
            type="text"
            value={userName}
            onChange={(e) => { setUserName(e.target.value); markDirty(); }}
            className="w-full px-4 py-2.5 border border-[#DEDDDA]/60 rounded-xl focus:ring-2 focus:ring-[#113229]/10 focus:border-[#113229] focus:outline-none text-sm transition-all bg-white"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-500 uppercase">Username</label>
          <input
            type="text"
            value={profile.username}
            onChange={(e) => { setProfile({ ...profile, username: e.target.value }); markDirty(); }}
            className="w-full px-4 py-2.5 border border-[#DEDDDA]/60 rounded-xl focus:ring-2 focus:ring-[#113229]/10 focus:border-[#113229] focus:outline-none text-sm transition-all bg-white"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-500 uppercase">Email Address</label>
          <div className="flex gap-2">
            <input
              type="email"
              value={userEmail}
              disabled
              className="w-full px-4 py-2.5 border border-[#DEDDDA]/60 rounded-xl bg-[#F9F8F6] text-slate-400 text-sm focus:outline-none cursor-not-allowed"
            />
            {profile.email_verified ? (
              <span className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-[#113229] bg-[#E8F3F0] border border-[#113229]/15 rounded-xl shrink-0">
                <Check className="w-3.5 h-3.5" /> Verified
              </span>
            ) : (
              <button 
                onClick={handleVerifyEmail}
                className="px-3 py-2 text-xs font-bold text-amber-850 bg-amber-50 hover:bg-amber-100 border border-amber-200/50 rounded-xl transition-colors shrink-0"
              >
                Verify Email
              </button>
            )}
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-500 uppercase">Phone Number</label>
          <input
            type="text"
            value={profile.phone_number || ""}
            placeholder="+1 (555) 019-2834"
            onChange={(e) => { setProfile({ ...profile, phone_number: e.target.value }); markDirty(); }}
            className="w-full px-4 py-2.5 border border-[#DEDDDA]/60 rounded-xl focus:ring-2 focus:ring-[#113229]/10 focus:border-[#113229] focus:outline-none text-sm transition-all bg-white"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-500 uppercase">Job Title</label>
          <input
            type="text"
            value={profile.job_title || ""}
            onChange={(e) => { setProfile({ ...profile, job_title: e.target.value }); markDirty(); }}
            className="w-full px-4 py-2.5 border border-[#DEDDDA]/60 rounded-xl focus:ring-2 focus:ring-[#113229]/10 focus:border-[#113229] focus:outline-none text-sm transition-all bg-white"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-500 uppercase">Company Name</label>
          <input
            type="text"
            value={profile.company_name || ""}
            onChange={(e) => { setProfile({ ...profile, company_name: e.target.value }); markDirty(); }}
            className="w-full px-4 py-2.5 border border-[#DEDDDA]/60 rounded-xl focus:ring-2 focus:ring-[#113229]/10 focus:border-[#113229] focus:outline-none text-sm transition-all bg-white"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-500 uppercase">Department</label>
          <input
            type="text"
            value={profile.department || ""}
            onChange={(e) => { setProfile({ ...profile, department: e.target.value }); markDirty(); }}
            className="w-full px-4 py-2.5 border border-[#DEDDDA]/60 rounded-xl focus:ring-2 focus:ring-[#113229]/10 focus:border-[#113229] focus:outline-none text-sm transition-all bg-white"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-500 uppercase">Country</label>
          <input
            type="text"
            value={profile.country || ""}
            onChange={(e) => { setProfile({ ...profile, country: e.target.value }); markDirty(); }}
            className="w-full px-4 py-2.5 border border-[#DEDDDA]/60 rounded-xl focus:ring-2 focus:ring-[#113229]/10 focus:border-[#113229] focus:outline-none text-sm transition-all bg-white"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-500 uppercase">Time Zone</label>
          <select
            value={profile.time_zone}
            onChange={(e) => { setProfile({ ...profile, time_zone: e.target.value }); markDirty(); }}
            className="w-full px-4 py-2.5 border border-[#DEDDDA]/60 rounded-xl focus:ring-2 focus:ring-[#113229]/10 focus:border-[#113229] focus:outline-none text-sm bg-white cursor-pointer transition-all"
          >
            <option value="UTC">UTC</option>
            <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
            <option value="America/New_York">America/New_York (EST)</option>
            <option value="Europe/London">Europe/London (GMT)</option>
            <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-500 uppercase">Preferred Language</label>
          <select
            value={profile.preferred_language}
            onChange={(e) => { setProfile({ ...profile, preferred_language: e.target.value }); markDirty(); }}
            className="w-full px-4 py-2.5 border border-[#DEDDDA]/60 rounded-xl focus:ring-2 focus:ring-[#113229]/10 focus:border-[#113229] focus:outline-none text-sm bg-white cursor-pointer transition-all"
          >
            <option value="en">English</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
            <option value="de">German</option>
            <option value="ja">Japanese</option>
          </select>
        </div>
      </div>

      {/* Metadata fields readonly */}
      <div className="bg-[#F9F8F6] rounded-2xl p-5 border border-[#DEDDDA]/40 flex flex-wrap gap-x-8 gap-y-3 text-xs text-slate-500 font-medium">
        <div>Account Status: <span className="text-[#113229] font-bold capitalize">{profile.account_status}</span></div>
        <div>Plan Type: <span className="text-indigo-755 font-bold capitalize">{profile.subscription_plan}</span></div>
        {profile.last_login && <div>Last Login: <span>{new Date(profile.last_login).toLocaleString()}</span></div>}
      </div>

      {/* Change Password Block */}
      <div className="border-t border-[#DEDDDA]/40 pt-8 space-y-5">
        <div>
          <h3 className="text-sm font-bold text-[#102C23]">Change Password</h3>
          <p className="text-xs text-slate-550 font-semibold">Provide your current credentials to change password.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <input
            type="password"
            placeholder="Current password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="px-4 py-2.5 border border-[#DEDDDA]/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#113229]/10 focus:border-[#113229] bg-white"
          />
          <input
            type="password"
            placeholder="New password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="px-4 py-2.5 border border-[#DEDDDA]/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#113229]/10 focus:border-[#113229] bg-white"
          />
        </div>
        <button
          onClick={handleResetPassword}
          className="px-4 py-2 bg-[#113229] hover:bg-[#102C23] text-white rounded-xl text-xs font-bold transition-colors"
        >
          Update Password
        </button>
      </div>
    </div>
  );
}
