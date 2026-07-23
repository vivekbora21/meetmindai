"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { 
  User, Link, Brain, Calendar, Database, Shield, Bell, CreditCard, Users, 
  Palette, History, Search, ShieldAlert, Activity
} from "lucide-react";
import { getApiUrl } from "../../config";
import { toast as globalToast } from "@/store/useToastStore";

// Modular sub-section imports
import ProfileSection from "./components/ProfileSection";
import IntegrationsSection from "./components/IntegrationsSection";
import MeetingsSection from "./components/MeetingsSection";
import AISection from "./components/AISection";
import StorageSection from "./components/StorageSection";
import SecuritySection from "./components/SecuritySection";
import NotificationsSection from "./components/NotificationsSection";
import BillingSection from "./components/BillingSection";
import OrganizationSection from "./components/OrganizationSection";
import PersonalizationSection from "./components/PersonalizationSection";
import PrivacySection from "./components/PrivacySection";
import ActivitySection from "./components/ActivitySection";
import DashboardSection from "./components/DashboardSection";

// Interface Definitions
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

interface MeetingPreferences {
  default_language: string;
  enable_speaker_id: boolean;
  enable_translation: boolean;
  enable_subtitles: boolean;
  transcript_format: string;
  default_category: string;
  recording_retention_days: number;
  auto_delete_recordings: boolean;
  meeting_privacy: string;
  auto_import_meetings: boolean;
  auto_import_recordings: boolean;
  auto_generate_transcript: boolean;
  auto_generate_summary: boolean;
  auto_create_action_items: boolean;
  auto_create_risks: boolean;
  auto_create_kg: boolean;
  auto_create_tech_analysis: boolean;
  auto_create_decisions: boolean;
  calendar_sync_frequency: string;
  recording_preference: string;
}

interface NotificationChannel {
  email: boolean;
  browser: boolean;
  push: boolean;
  slack: boolean;
  teams: boolean;
}

interface NotificationSettings {
  meeting_started: NotificationChannel;
  transcript_ready: NotificationChannel;
  summary_generated: NotificationChannel;
  action_items_assigned: NotificationChannel;
  risk_detected: NotificationChannel;
  calendar_sync: NotificationChannel;
  oauth_expired: NotificationChannel;
  weekly_reports: NotificationChannel;
}

interface Personalization {
  theme: string;
  accent_color: string;
  compact_mode: boolean;
  date_format: string;
  time_format: string;
}

interface Privacy {
  data_retention_days: number;
  ai_training_opt_out: boolean;
}

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

interface APIKeyItem {
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

interface BillingUsage {
  meeting_minutes_used: number;
  meeting_minutes_limit: number;
  storage_gb_used: number;
  storage_gb_limit: number;
  ai_credits_used: number;
  ai_credits_limit: number;
}

interface InvoiceItem {
  invoice_id: string;
  date: string;
  amount: number;
  status: string;
}

interface BillingData {
  current_plan: string;
  usage: BillingUsage;
  payment_methods: Array<{ id: string; brand: string; last4: string; expiry: string; is_default: boolean }>;
  billing_history: InvoiceItem[];
}

interface OrgMember {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface OrgData {
  organization_name: string;
  members: OrgMember[];
}

interface ActivityLogItem {
  id: string;
  action: string;
  details: string;
  ip_address: string;
  created_at: string;
}

interface DashboardSummary {
  total_meetings: number;
  hours_processed: number;
  ai_reports: number;
  knowledge_graphs: number;
  action_items: number;
  risks: number;
  most_used_platform: string;
  average_meeting_duration_minutes: number;
}

export default function SettingsPage() {
  // Navigation / Tabs
  const [activeTab, setActiveTab] = useState("profile");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Unsaved changes state tracking
  const [isDirty, setIsDirty] = useState(false);

  // File upload ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Settings State variables
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [profile, setProfile] = useState<ProfileInfo>({
    profile_picture: null,
    username: "",
    phone_number: "",
    job_title: "",
    company_name: "",
    department: "",
    country: "",
    time_zone: "UTC",
    preferred_language: "en",
    last_login: null,
    account_status: "Active",
    subscription_plan: "Free",
    email_verified: false
  });

  const [aiPreferences, setAiPreferences] = useState<AIPreferences>({
    preferred_provider: "Gemini",
    fallback_provider: "OpenAI",
    preferred_model: "gemini-1.5-flash",
    temperature: 0.7,
    summary_length: "Medium",
    response_style: "Professional",
    enable_chat_memory: true,
    enable_semantic_search: true,
    enable_context_retrieval: true,
    enable_kg_generation: true,
    enable_speaker_intelligence: true,
    enable_automatic_insights: true
  });

  const [meetingPreferences, setMeetingPreferences] = useState<MeetingPreferences>({
    default_language: "en",
    enable_speaker_id: true,
    enable_translation: false,
    enable_subtitles: false,
    transcript_format: "TXT",
    default_category: "General",
    recording_retention_days: 30,
    auto_delete_recordings: false,
    meeting_privacy: "Private",
    auto_import_meetings: true,
    auto_import_recordings: true,
    auto_generate_transcript: true,
    auto_generate_summary: true,
    auto_create_action_items: true,
    auto_create_risks: true,
    auto_create_kg: true,
    auto_create_tech_analysis: true,
    auto_create_decisions: true,
    calendar_sync_frequency: "Every 15 Minutes",
    recording_preference: "Ask Before Import"
  });

  const [notifications, setNotifications] = useState<NotificationSettings>({
    meeting_started: { email: true, browser: true, push: false, slack: false, teams: false },
    transcript_ready: { email: false, browser: true, push: false, slack: false, teams: false },
    summary_generated: { email: true, browser: true, push: true, slack: false, teams: false },
    action_items_assigned: { email: false, browser: true, push: false, slack: false, teams: false },
    risk_detected: { email: true, browser: true, push: true, slack: false, teams: false },
    calendar_sync: { email: false, browser: false, push: false, slack: false, teams: false },
    oauth_expired: { email: true, browser: true, push: false, slack: false, teams: false },
    weekly_reports: { email: true, browser: false, push: false, slack: false, teams: false }
  });

  const [personalization, setPersonalization] = useState<Personalization>({
    theme: "System Theme",
    accent_color: "Teal",
    compact_mode: false,
    date_format: "YYYY-MM-DD",
    time_format: "12h"
  });

  const [privacy, setPrivacy] = useState<Privacy>({
    data_retention_days: 365,
    ai_training_opt_out: true
  });

  // Integrations, API keys, sessions, billing, org, activity log lists
  const [integrations, setIntegrations] = useState<IntegrationItem[]>([]);
  const [apiKeys, setApiKeys] = useState<APIKeyItem[]>([]);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [billingData, setBillingData] = useState<BillingData | null>(null);
  const [orgData, setOrgData] = useState<OrgData | null>(null);
  const [activityLogs, setActivityLogs] = useState<ActivityLogItem[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardSummary | null>(null);

  // Security passwords
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  // Dev api details
  const [newKeyName, setNewKeyName] = useState("");
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<{ name: string; key: string } | null>(null);

  // Connect dialog integration mock details
  const [connectProvider, setConnectProvider] = useState<string | null>(null);
  const [connectEmail, setConnectEmail] = useState("");

  // Toast trigger
  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    if (type === "error") {
      globalToast.error(message);
    } else {
      globalToast.success(message);
    }
  }, []);

  // Fetch full settings data
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(getApiUrl("/api/v1/profile/full-profile"), {
        credentials: "include"
      });
      if (res.ok) {
        const data = await res.json();
        setUserName(data.name || "");
        setUserEmail(data.email || "");
        setProfile(data.profile);
        setAiPreferences(data.ai_preferences);
        setMeetingPreferences(data.meeting_preferences);
        setNotifications(data.notification_settings);
        setPersonalization(data.personalization);
        setPrivacy(data.privacy);
        setIntegrations(data.integrations || []);
      } else {
        showToast("Failed to fetch settings from server.", "error");
      }
    } catch {
      console.warn("Backend not active, using default mock details.");
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  // Fetch individual list states on active tab change
  useEffect(() => {
    fetchData();
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const syncStatus = params.get("sync");
      if (syncStatus === "success") {
        showToast("Connected account successfully!");
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (syncStatus === "error") {
        const detail = params.get("detail") || "An error occurred during authentication.";
        showToast(`Failed to connect: ${detail}`, "error");
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, [fetchData, showToast]);

  useEffect(() => {
    const fetchTabSpecificData = async () => {
      try {
        if (activeTab === "integrations" || activeTab === "meetings") {
          const res = await fetch(getApiUrl("/api/v1/profile/integrations"), { credentials: "include" });
          if (res.ok) setIntegrations(await res.json());
        }
        if (activeTab === "security") {
          const resKeys = await fetch(getApiUrl("/api/v1/profile/security/api-keys"), { credentials: "include" });
          if (resKeys.ok) setApiKeys(await resKeys.json());
          const resSess = await fetch(getApiUrl("/api/v1/profile/security/sessions"), { credentials: "include" });
          if (resSess.ok) setSessions(await resSess.json());
        }
        if (activeTab === "billing") {
          const res = await fetch(getApiUrl("/api/v1/profile/billing"), { credentials: "include" });
          if (res.ok) setBillingData(await res.json());
        }
        if (activeTab === "organization") {
          const res = await fetch(getApiUrl("/api/v1/profile/organization"), { credentials: "include" });
          if (res.ok) setOrgData(await res.json());
        }
        if (activeTab === "activity") {
          const res = await fetch(getApiUrl("/api/v1/profile/activity-log"), { credentials: "include" });
          if (res.ok) setActivityLogs(await res.json());
        }
        if (activeTab === "dashboard") {
          const res = await fetch(getApiUrl("/api/v1/profile/dashboard-summary"), { credentials: "include" });
          if (res.ok) setDashboardStats(await res.json());
        }
      } catch {
        console.warn("Tab data loading failed, using simulated local state.");
      }
    };
    fetchTabSpecificData();
  }, [activeTab]);

  // Dirty state listener
  const markDirty = () => {
    setIsDirty(true);
  };

  // Profile Save
  const handleSaveProfile = async () => {
    try {
      const res = await fetch(getApiUrl("/api/v1/profile/profile"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: userName,
          username: profile.username,
          phone_number: profile.phone_number,
          job_title: profile.job_title,
          company_name: profile.company_name,
          department: profile.department,
          country: profile.country,
          time_zone: profile.time_zone,
          preferred_language: profile.preferred_language
        }),
        credentials: "include"
      });

      if (res.ok) {
        showToast("Profile settings saved successfully!");
        setIsDirty(false);
      } else {
        const err = await res.json();
        showToast(err.detail || "Error saving profile", "error");
      }
    } catch {
      showToast("Backend connection failed.", "error");
    }
  };

  // AI preferences Save
  const handleSaveAIPreferences = async () => {
    try {
      const res = await fetch(getApiUrl("/api/v1/profile/ai-preferences"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(aiPreferences),
        credentials: "include"
      });

      if (res.ok) {
        showToast("AI preferences updated successfully!");
        setIsDirty(false);
      } else {
        showToast("Error updating AI preferences.", "error");
      }
    } catch {
      showToast("Backend connection error.", "error");
    }
  };

  // Meeting & calendar Save
  const handleSaveMeetingPreferences = async () => {
    try {
      const res = await fetch(getApiUrl("/api/v1/profile/meeting-preferences"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(meetingPreferences),
        credentials: "include"
      });

      if (res.ok) {
        showToast("Meeting & calendar settings saved!");
        setIsDirty(false);
      } else {
        showToast("Failed to update meeting preferences.", "error");
      }
    } catch {
      showToast("Backend connection error.", "error");
    }
  };

  // Notification preferences Save
  const handleSaveNotifications = async () => {
    try {
      const res = await fetch(getApiUrl("/api/v1/profile/notification-settings"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(notifications),
        credentials: "include"
      });

      if (res.ok) {
        showToast("Notification channels updated!");
        setIsDirty(false);
      } else {
        showToast("Error updating notifications.", "error");
      }
    } catch {
      showToast("Backend connection error.", "error");
    }
  };

  // Personalization settings Save
  const handleSavePersonalization = async () => {
    try {
      const res = await fetch(getApiUrl("/api/v1/profile/personalization"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(personalization),
        credentials: "include"
      });

      if (res.ok) {
        showToast("Personalization details saved!");
        setIsDirty(false);
      } else {
        showToast("Error updating personalization.", "error");
      }
    } catch {
      showToast("Backend connection error.", "error");
    }
  };

  // Privacy settings Save
  const handleSavePrivacy = async () => {
    try {
      const res = await fetch(getApiUrl("/api/v1/profile/privacy"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(privacy),
        credentials: "include"
      });

      if (res.ok) {
        showToast("Privacy settings updated!");
        setIsDirty(false);
      } else {
        showToast("Error updating privacy settings.", "error");
      }
    } catch {
      showToast("Backend connection error.", "error");
    }
  };

  // Master Global Save
  const handleMasterSave = () => {
    if (activeTab === "profile") handleSaveProfile();
    else if (activeTab === "ai") handleSaveAIPreferences();
    else if (activeTab === "meetings") handleSaveMeetingPreferences();
    else if (activeTab === "notifications") handleSaveNotifications();
    else if (activeTab === "personalization") handleSavePersonalization();
    else if (activeTab === "privacy") handleSavePrivacy();
    else {
      setIsDirty(false);
      showToast("Settings sync completed");
    }
  };

  // Password reset handler
  const handleResetPassword = async () => {
    if (!currentPassword || !newPassword) {
      showToast("Please fill all password fields", "error");
      return;
    }
    try {
      const res = await fetch(getApiUrl("/api/v1/profile/change-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
        credentials: "include"
      });

      if (res.ok) {
        showToast("Password updated successfully!");
        setCurrentPassword("");
        setNewPassword("");
      } else {
        const data = await res.json();
        showToast(data.detail || "Error changing password", "error");
      }
    } catch {
      showToast("Backend connection error.", "error");
    }
  };

  // Trigger Email verification
  const handleVerifyEmail = async () => {
    try {
      const res = await fetch(getApiUrl("/api/v1/profile/verify-email"), {
        method: "POST",
        credentials: "include"
      });
      if (res.ok) {
        setProfile(prev => ({ ...prev, email_verified: true }));
        showToast("Email verification complete!");
      }
    } catch {
      showToast("Backend connection error.", "error");
    }
  };

  // Profile pic upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(getApiUrl("/api/v1/profile/profile-picture"), {
        method: "POST",
        body: formData,
        credentials: "include"
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(prev => ({ ...prev, profile_picture: data.url }));
        showToast("Profile picture uploaded successfully!");
      } else {
        showToast("Failed to upload profile picture.", "error");
      }
    } catch {
      showToast("Error connecting to server.", "error");
    }
  };

  // Profile pic delete
  const handleRemoveProfilePicture = async () => {
    try {
      const res = await fetch(getApiUrl("/api/v1/profile/profile-picture"), {
        method: "DELETE",
        credentials: "include"
      });
      if (res.ok) {
        setProfile(prev => ({ ...prev, profile_picture: null }));
        showToast("Profile picture removed.");
      }
    } catch {
      showToast("Error connecting to server.", "error");
    }
  };

  // Generic OAuth connect — maps virtual provider keys to real OAuth providers.
  const PROVIDER_OAUTH_MAP: Record<string, string> = {
    msteams: "microsoft",
    outlook: "microsoft",
    googlemeet: "google",
    googlecalendar: "google",
    zoom: "zoom",
  };

  const connect = (providerKey: string) => {
    const oauthProvider = PROVIDER_OAUTH_MAP[providerKey];
    if (oauthProvider) {
      window.location.href = getApiUrl(`/api/auth/${oauthProvider}/login`);
    } else {
      setConnectProvider(providerKey);
    }
  };

  // Integration connect logic (non-OAuth fallback modal)
  const handleConnectIntegration = async () => {
    if (!connectEmail) {
      showToast("Please enter an email account", "error");
      return;
    }
    try {
      const res = await fetch(getApiUrl("/api/v1/profile/integrations/connect"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: connectProvider,
          email: connectEmail,
          auto_sync: true,
          recording_import: true,
          calendar_sync: true
        }),
        credentials: "include"
      });
      if (res.ok) {
        showToast(`Connected ${connectProvider} integration successfully!`);
        setConnectProvider(null);
        setConnectEmail("");
        const resList = await fetch(getApiUrl("/api/v1/profile/integrations"), { credentials: "include" });
        if (resList.ok) setIntegrations(await resList.json());
      }
    } catch {
      showToast("Error connecting integration.", "error");
    }
  };

  // Integration Sync trigger
  const handleSyncIntegration = async (id: string, name: string) => {
    try {
      const res = await fetch(getApiUrl(`/api/v1/profile/integrations/${id}/sync`), {
        method: "POST",
        credentials: "include"
      });
      if (res.ok) {
        showToast(`Synchronized ${name} data!`);
        const resList = await fetch(getApiUrl("/api/v1/profile/integrations"), { credentials: "include" });
        if (resList.ok) setIntegrations(await resList.json());
      }
    } catch {
      showToast("Sync failed.", "error");
    }
  };

  // Integration Disconnect
  const handleDisconnectIntegration = async (id: string, name: string) => {
    try {
      const res = await fetch(getApiUrl(`/api/v1/profile/integrations/${id}/disconnect`), {
        method: "POST",
        credentials: "include"
      });
      if (res.ok) {
        showToast(`Disconnected ${name} integration.`);
        setIntegrations(prev => prev.filter(item => item.id !== id));
      }
    } catch {
      showToast("Disconnect failed.", "error");
    }
  };

  // Storage Cleanup
  const handleStorageCleanup = async (category: string) => {
    try {
      const formData = new FormData();
      formData.append("category", category);
      const res = await fetch(getApiUrl("/api/v1/profile/storage/cleanup"), {
        method: "POST",
        body: formData,
        credentials: "include"
      });
      if (res.ok) {
        showToast(`Cleaned up ${category} storage successfully!`);
        const resStore = await fetch(getApiUrl("/api/v1/profile/storage"), { credentials: "include" });
        if (resStore.ok) {
          const storeData = await resStore.json();
          if (billingData) {
            setBillingData({
              ...billingData,
              usage: {
                ...billingData.usage,
                storage_gb_used: storeData.used / 1024 / 1024 / 1024
              }
            });
          }
        }
      }
    } catch {
      showToast("Cleanup failed.", "error");
    }
  };

  // Revoke security session
  const handleRevokeSession = async (id: string) => {
    try {
      const res = await fetch(getApiUrl(`/api/v1/profile/security/sessions/${id}/revoke`), {
        method: "POST",
        credentials: "include"
      });
      if (res.ok) {
        showToast("Active device session revoked.");
        setSessions(prev => prev.filter(item => item.id !== id));
      }
    } catch {
      showToast("Revoke failed.", "error");
    }
  };

  // Revoke all sessions
  const handleLogoutAllSessions = async () => {
    try {
      const res = await fetch(getApiUrl("/api/v1/profile/security/logout-all"), {
        method: "POST",
        credentials: "include"
      });
      if (res.ok) {
        showToast("Logged out from all other devices.");
        setSessions([]);
      }
    } catch {
      showToast("Logout failed.", "error");
    }
  };

  // Generate API keys
  const handleCreateAPIKey = async () => {
    if (!newKeyName) {
      showToast("Please enter a name for the API key", "error");
      return;
    }
    try {
      const res = await fetch(getApiUrl("/api/v1/profile/security/api-keys"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newKeyName }),
        credentials: "include"
      });
      if (res.ok) {
        const data = await res.json();
        setNewlyCreatedKey({ name: data.name, key: data.key });
        setNewKeyName("");
        showToast("API Key created. Copy it immediately!");
        const resList = await fetch(getApiUrl("/api/v1/profile/security/api-keys"), { credentials: "include" });
        if (resList.ok) setApiKeys(await resList.json());
      }
    } catch {
      showToast("API Key creation failed.", "error");
    }
  };

  // Revoke API key
  const handleRevokeAPIKey = async (id: string, name: string) => {
    try {
      const res = await fetch(getApiUrl(`/api/v1/profile/security/api-keys/${id}`), {
        method: "DELETE",
        credentials: "include"
      });
      if (res.ok) {
        showToast(`Revoked API key: ${name}`);
        setApiKeys(prev => prev.filter(item => item.id !== id));
      }
    } catch {
      showToast("Revoke failed.", "error");
    }
  };

  // Export User Data
  const handleExportData = async () => {
    try {
      const res = await fetch(getApiUrl("/api/v1/profile/privacy/export"), {
        method: "POST",
        credentials: "include"
      });
      if (res.ok) {
        showToast("Data export initiated. Download link emailed!");
      }
    } catch {
      showToast("Export failed.", "error");
    }
  };

  // Clear all history
  const handleClearHistory = async (category: string) => {
    if (!confirm(`Are you sure you want to delete your entire ${category} history? This cannot be undone.`)) return;
    try {
      const formData = new FormData();
      formData.append("category", category);
      const res = await fetch(getApiUrl("/api/v1/profile/privacy/delete-history"), {
        method: "POST",
        body: formData,
        credentials: "include"
      });
      if (res.ok) {
        showToast(`Deleted all ${category} records successfully.`);
      }
    } catch {
      showToast("History purge failed.", "error");
    }
  };

  // Copy helper
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast("Copied to clipboard!");
  };

  // Tabs layout configuration
  const sidebarTabs = [
    { id: "profile", label: "Profile", icon: User, keywords: "name username email phone picture crop country time zone language" },
    { id: "integrations", label: "Connected Integrations", icon: Link, keywords: "oauth teams zoom meet google calendar outlook slack discord connection status sync" },
    { id: "meetings", label: "Calendar & Settings", icon: Calendar, keywords: "auto import recordings summary risks action items decisions sync frequency" },
    { id: "ai", label: "AI Preferences", icon: Brain, keywords: "openai gemini groq claude model temperature style summary detail memory search kg speaker intelligence" },
    { id: "storage", label: "Storage Management", icon: Database, keywords: "bytes space size recordings transcript knowledge graph chat archive cache cleanup" },
    { id: "security", label: "Security & Keys", icon: Shield, keywords: "password two factor 2fa sessions devices revoke api key webhook developer token" },
    { id: "notifications", label: "Notifications", icon: Bell, keywords: "email browser push notification slack teams events weekly reports channels" },
    { id: "billing", label: "Billing & Plans", icon: CreditCard, keywords: "plan pricing minutes limit credits payment card invoice visa cancel upgrade" },
    { id: "organization", label: "Organization", icon: Users, keywords: "workspace team department role permissions domains member invite details" },
    { id: "personalization", label: "Personalization", icon: Palette, keywords: "theme dark mode light system accent color compact date time format page sidebar" },
    { id: "privacy", label: "Privacy & Data", icon: ShieldAlert, keywords: "export history download retention opt-out training delete account" },
    { id: "activity", label: "Activity Log", icon: History, keywords: "timeline logs audit history records modifications transactions actions audit trace" },
    { id: "dashboard", label: "Stats Dashboard", icon: Activity, keywords: "meetings duration metrics charts performance graphs total hours risks decisions" }
  ];

  // Filtering tabs by search
  const filteredTabs = sidebarTabs.filter(tab => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return tab.label.toLowerCase().includes(query) || tab.keywords.includes(query);
  });

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC] font-outfit text-slate-800 relative overflow-hidden">
      
      {/* Top Header & Search */}
      <header className="shrink-0 bg-[#F9F8F6]/80 border-b border-[#DEDDDA]/60 px-8 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4 z-20">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#102C23]">Settings</h1>
          <p className="text-xs text-slate-550 font-semibold">Manage your profile, platform integrations, security keys, and workspace preferences.</p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-405" />
          <input
            type="text"
            placeholder="Search settings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-xs font-semibold bg-white border border-[#DEDDDA]/60 rounded-xl focus:ring-2 focus:ring-[#113229]/10 focus:border-[#113229] focus:outline-none transition-all placeholder-slate-400"
          />
        </div>
      </header>

      {/* Main Settings Panel */}
      <div className="flex-1 flex flex-col lg:flex-row p-8 gap-8 max-w-9xl mx-auto w-full min-h-0 overflow-hidden">
        
        {/* Settings Sidebar Navigation */}
        <aside className="w-full lg:w-64 shrink-0 flex flex-col gap-1 overflow-x-auto lg:overflow-x-visible lg:overflow-y-auto max-h-full pr-2">
          <span className="px-3 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Categories</span>
          <div className="flex lg:flex-col overflow-x-auto lg:overflow-visible gap-1 py-2 lg:py-0">
            {filteredTabs.map(tab => {
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    if (isDirty) {
                      showToast("Keep in mind you have unsaved changes below!", "error");
                    }
                  }}
                  className={`group flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 text-left shrink-0 lg:shrink-1 ${
                    activeTab === tab.id
                      ? "bg-[#113229] text-white shadow-md shadow-[#113229]/15"
                      : "text-[#64748b] hover:text-[#102C23] hover:bg-[#F9F8F6]/80 hover:translate-x-0.5"
                  }`}
                >
                  <TabIcon className={`w-4.5 h-4.5 transition-transform duration-200 group-hover:scale-110 ${activeTab === tab.id ? "text-[#D98A44]" : "text-[#64748b] group-hover:text-[#102C23]"}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Settings Content Area */}
        <main className="flex-1 bg-white border border-[#DEDDDA]/60 rounded-2xl p-6 md:p-8 shadow-sm overflow-y-auto h-full min-h-0">
          {isLoading ? (
            <div className="space-y-6 animate-pulse">
              <div className="h-8 bg-slate-100 rounded w-1/3" />
              <div className="h-4 bg-slate-100 rounded w-2/3" />
              <div className="h-24 bg-slate-100 rounded" />
              <div className="space-y-3">
                <div className="h-10 bg-slate-100 rounded" />
                <div className="h-10 bg-slate-100 rounded" />
                <div className="h-10 bg-slate-100 rounded" />
              </div>
            </div>
          ) : (
            <>
              {activeTab === "profile" && (
                <ProfileSection
                  userName={userName}
                  setUserName={setUserName}
                  userEmail={userEmail}
                  profile={profile}
                  setProfile={setProfile}
                  fileInputRef={fileInputRef}
                  handleFileChange={handleFileChange}
                  handleRemoveProfilePicture={handleRemoveProfilePicture}
                  handleVerifyEmail={handleVerifyEmail}
                  currentPassword={currentPassword}
                  setCurrentPassword={setCurrentPassword}
                  newPassword={newPassword}
                  setNewPassword={setNewPassword}
                  handleResetPassword={handleResetPassword}
                  markDirty={markDirty}
                />
              )}

              {activeTab === "integrations" && (
                <IntegrationsSection
                  integrations={integrations}
                  setIntegrations={setIntegrations}
                  connect={connect}
                  handleDisconnectIntegration={handleDisconnectIntegration}
                  handleSyncIntegration={handleSyncIntegration}
                  connectProvider={connectProvider}
                  setConnectProvider={setConnectProvider}
                  connectEmail={connectEmail}
                  setConnectEmail={setConnectEmail}
                  handleConnectIntegration={handleConnectIntegration}
                  markDirty={markDirty}
                />
              )}

              {activeTab === "meetings" && (
                <MeetingsSection
                  meetingPreferences={meetingPreferences}
                  setMeetingPreferences={setMeetingPreferences}
                  markDirty={markDirty}
                />
              )}

              {activeTab === "ai" && (
                <AISection
                  aiPreferences={aiPreferences}
                  setAiPreferences={setAiPreferences}
                  markDirty={markDirty}
                />
              )}

              {activeTab === "storage" && (
                <StorageSection
                  billingData={billingData}
                  handleStorageCleanup={handleStorageCleanup}
                  handleExportData={handleExportData}
                />
              )}

              {activeTab === "security" && (
                <SecuritySection
                  newKeyName={newKeyName}
                  setNewKeyName={setNewKeyName}
                  handleCreateAPIKey={handleCreateAPIKey}
                  newlyCreatedKey={newlyCreatedKey}
                  copyToClipboard={copyToClipboard}
                  apiKeys={apiKeys}
                  handleRevokeAPIKey={handleRevokeAPIKey}
                  sessions={sessions}
                  handleRevokeSession={handleRevokeSession}
                  handleLogoutAllSessions={handleLogoutAllSessions}
                />
              )}

              {activeTab === "notifications" && (
                <NotificationsSection
                  notifications={notifications}
                  setNotifications={setNotifications}
                  markDirty={markDirty}
                />
              )}

              {activeTab === "billing" && (
                <BillingSection
                  billingData={billingData}
                />
              )}

              {activeTab === "organization" && (
                <OrganizationSection
                  orgData={orgData}
                />
              )}

              {activeTab === "personalization" && (
                <PersonalizationSection
                  personalization={personalization}
                  setPersonalization={setPersonalization}
                  markDirty={markDirty}
                />
              )}

              {activeTab === "privacy" && (
                <PrivacySection
                  privacy={privacy}
                  setPrivacy={setPrivacy}
                  handleClearHistory={handleClearHistory}
                  markDirty={markDirty}
                />
              )}

              {activeTab === "activity" && (
                <ActivitySection
                  activityLogs={activityLogs}
                />
              )}

              {activeTab === "dashboard" && (
                <DashboardSection
                  dashboardStats={dashboardStats}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Sticky Save Changes Bar */}
      {isDirty && (
        <div className="sticky bottom-0 left-0 right-0 bg-white border-t border-[#DEDDDA]/60 py-4 px-8 flex items-center justify-between shadow-[0_-8px_30px_rgba(0,0,0,0.06)] z-30 animate-slide-up w-full mt-auto">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-50 rounded-xl border border-amber-200 text-amber-800">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-850 block">Unsaved changes detected</span>
              <span className="text-[10px] text-slate-500 font-semibold">Save updates before leaving the panel to prevent loss.</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => { setIsDirty(false); fetchData(); }}
              className="px-4 py-2 border border-[#DEDDDA]/60 text-slate-700 hover:bg-[#F9F8F6]/80 text-xs font-bold rounded-xl transition-colors"
            >
              Reset
            </button>
            <button 
              onClick={handleMasterSave}
              className="px-5 py-2 bg-[#113229] hover:bg-[#102C23] text-white text-xs font-bold rounded-xl shadow-lg transition-colors"
            >
              Save Settings
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
