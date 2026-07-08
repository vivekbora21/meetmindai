"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  User, Link, Brain, Calendar, Database, Shield, Bell, CreditCard, Users, Code, 
  Palette, History, Search, Upload, CheckCircle2, AlertCircle, Trash2, Key, 
  RefreshCw, LogOut, ChevronDown, Check, X, ShieldAlert, KeyRound, Copy, Activity, Laptop
} from "lucide-react";
import { getApiUrl } from "../../config";

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

interface NotificationSettings {
  meeting_uploaded: Record<string, boolean>;
  transcript_ready: Record<string, boolean>;
  ai_summary_ready: Record<string, boolean>;
  kg_ready: Record<string, boolean>;
  action_items_ready: Record<string, boolean>;
  failed_processing: Record<string, boolean>;
  calendar_sync: Record<string, boolean>;
  oauth_expired: Record<string, boolean>;
  weekly_reports: Record<string, boolean>;
}

interface Personalization {
  theme: string;
  accent_color: string;
  compact_mode: boolean;
  date_format: string;
  time_format: string;
  default_landing_page: string;
  sidebar_expanded: boolean;
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
  status: string;
}

interface OrgData {
  organization_name: string;
  members: OrgMember[];
  pending_invites: Array<{ id: string; email: string; role: string; sent_at: string }>;
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
  monthly_usage: {
    meetings_limit: number;
    meetings_used: number;
    hours_limit: number;
    hours_used: number;
  };
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

  // Notification Toast State
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // File upload ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Settings State variables
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userRole, setUserRole] = useState("");
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
    meeting_uploaded: { email: true, browser: true, push: false, slack: false, teams: false },
    transcript_ready: { email: false, browser: true, push: false, slack: false, teams: false },
    ai_summary_ready: { email: true, browser: true, push: true, slack: false, teams: false },
    kg_ready: { email: false, browser: true, push: false, slack: false, teams: false },
    action_items_ready: { email: true, browser: true, push: true, slack: false, teams: false },
    failed_processing: { email: true, browser: true, push: false, slack: false, teams: false },
    calendar_sync: { email: false, browser: false, push: false, slack: false, teams: false },
    oauth_expired: { email: true, browser: true, push: false, slack: false, teams: false },
    weekly_reports: { email: true, browser: false, push: false, slack: false, teams: false }
  });

  const [personalization, setPersonalization] = useState<Personalization>({
    theme: "System Theme",
    accent_color: "Teal",
    compact_mode: false,
    date_format: "YYYY-MM-DD",
    time_format: "12h",
    default_landing_page: "Dashboard",
    sidebar_expanded: true
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
  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch full settings data
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(getApiUrl("/api/v1/profile/full-profile"), {
        credentials: "include"
      });
      if (res.ok) {
        const data = await res.json();
        setUserName(data.name || "");
        setUserEmail(data.email || "");
        setUserRole(data.role || "");
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
    } catch (e) {
      console.warn("Backend not active, using default mock details.");
    } finally {
      setIsLoading(false);
    }
  };

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
  }, []);

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
      } catch (e) {
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
    } catch (e) {
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
    } catch (e) {
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
    } catch (e) {
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
    } catch (e) {
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
    } catch (e) {
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
    } catch (e) {
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
    } catch (e) {
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
    } catch (e) {
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
    } catch (err) {
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
    } catch (e) {
      showToast("Error connecting to server.", "error");
    }
  };

  // Integration connect logic
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
        // Reload integrations list
        const resList = await fetch(getApiUrl("/api/v1/profile/integrations"), { credentials: "include" });
        if (resList.ok) setIntegrations(await resList.json());
      }
    } catch (e) {
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
        const data = await res.json();
        showToast(`Synchronized ${name} data!`);
        // Reload list
        const resList = await fetch(getApiUrl("/api/v1/profile/integrations"), { credentials: "include" });
        if (resList.ok) setIntegrations(await resList.json());
      }
    } catch (e) {
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
    } catch (e) {
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
        // reload storage data
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
    } catch (e) {
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
    } catch (e) {
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
    } catch (e) {
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
        // Reload list
        const resList = await fetch(getApiUrl("/api/v1/profile/security/api-keys"), { credentials: "include" });
        if (resList.ok) setApiKeys(await resList.json());
      }
    } catch (e) {
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
    } catch (e) {
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
    } catch (e) {
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
    } catch (e) {
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
    <div className="flex flex-col min-h-screen bg-slate-50 font-outfit text-slate-800">
      
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border transition-all animate-slide-in ${
          toast.type === "success" 
            ? "bg-teal-50 border-teal-200 text-teal-800" 
            : "bg-red-50 border-red-200 text-red-800"
        }`}>
          {toast.type === "success" ? <CheckCircle2 className="w-5 h-5 text-teal-600" /> : <AlertCircle className="w-5 h-5 text-red-600" />}
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}

      {/* Top Header & Search */}
      <header className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-slate-200 px-8 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 z-20">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Account Settings</h1>
          <p className="text-xs text-slate-500">Manage your profile, platform integrations, security keys, and workspace preferences.</p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search settings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-100/80 hover:bg-slate-100 border-none rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-600/20 focus:outline-none transition-all"
          />
        </div>
      </header>

      {/* Main Settings Panel */}
      <div className="flex-1 flex flex-col lg:flex-row p-8 gap-8 max-w-7xl mx-auto w-full mb-24">
        
        {/* Settings Sidebar Navigation */}
        <aside className="w-full lg:w-64 shrink-0 flex flex-col gap-1">
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
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all text-left shrink-0 lg:shrink-1 ${
                    activeTab === tab.id
                      ? "bg-teal-50 text-teal-800 shadow-sm border border-teal-100/50"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
                  }`}
                >
                  <TabIcon className={`w-4.5 h-4.5 ${activeTab === tab.id ? "text-teal-700" : "text-slate-400"}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Settings Content Area */}
        <main className="flex-1 bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-sm">
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
              {/* Tab 1: PROFILE OVERVIEW */}
              {activeTab === "profile" && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Profile Details</h2>
                    <p className="text-xs text-slate-500">Update your basic details, profile photo, and password information.</p>
                  </div>

                  {/* Profile Picture Upload & Crop representation */}
                  <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-slate-100">
                    <div className="relative group cursor-pointer w-24 h-24 rounded-full overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center">
                      {profile.profile_picture ? (
                        <img 
                          src={getApiUrl(profile.profile_picture)} 
                          alt="Profile Picture" 
                          className="w-full h-full object-cover"
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
                      <p className="text-xs text-slate-500">Supports JPG, PNG or WEBP formats. Crop photo by adjusting dimensions.</p>
                      <div className="flex items-center justify-center sm:justify-start gap-3">
                        <button 
                          onClick={() => fileInputRef.current?.click()}
                          className="px-3 py-1.5 text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200/50 rounded-lg transition-colors"
                        >
                          Upload new photo
                        </button>
                        {profile.profile_picture && (
                          <button 
                            onClick={handleRemoveProfilePicture}
                            className="px-3 py-1.5 text-xs font-semibold text-red-700 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
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
                        className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-600/10 focus:border-teal-600 focus:outline-none text-sm transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase">Username</label>
                      <input
                        type="text"
                        value={profile.username}
                        onChange={(e) => { setProfile({ ...profile, username: e.target.value }); markDirty(); }}
                        className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-600/10 focus:border-teal-600 focus:outline-none text-sm transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase">Email Address</label>
                      <div className="flex gap-2">
                        <input
                          type="email"
                          value={userEmail}
                          disabled
                          className="w-full px-4 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-400 text-sm focus:outline-none cursor-not-allowed"
                        />
                        {profile.email_verified ? (
                          <span className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-teal-800 bg-teal-50 border border-teal-200/50 rounded-xl">
                            <Check className="w-3.5 h-3.5" /> Verified
                          </span>
                        ) : (
                          <button 
                            onClick={handleVerifyEmail}
                            className="px-3 py-2 text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200/50 rounded-xl transition-colors shrink-0"
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
                        className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-600/10 focus:border-teal-600 focus:outline-none text-sm transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase">Job Title</label>
                      <input
                        type="text"
                        value={profile.job_title || ""}
                        onChange={(e) => { setProfile({ ...profile, job_title: e.target.value }); markDirty(); }}
                        className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-600/10 focus:border-teal-600 focus:outline-none text-sm transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase">Company Name</label>
                      <input
                        type="text"
                        value={profile.company_name || ""}
                        onChange={(e) => { setProfile({ ...profile, company_name: e.target.value }); markDirty(); }}
                        className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-600/10 focus:border-teal-600 focus:outline-none text-sm transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase">Department</label>
                      <input
                        type="text"
                        value={profile.department || ""}
                        onChange={(e) => { setProfile({ ...profile, department: e.target.value }); markDirty(); }}
                        className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-600/10 focus:border-teal-600 focus:outline-none text-sm transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase">Country</label>
                      <input
                        type="text"
                        value={profile.country || ""}
                        onChange={(e) => { setProfile({ ...profile, country: e.target.value }); markDirty(); }}
                        className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-600/10 focus:border-teal-600 focus:outline-none text-sm transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase">Time Zone</label>
                      <select
                        value={profile.time_zone}
                        onChange={(e) => { setProfile({ ...profile, time_zone: e.target.value }); markDirty(); }}
                        className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-600/10 focus:border-teal-600 focus:outline-none text-sm bg-white cursor-pointer transition-all"
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
                        className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-600/10 focus:border-teal-600 focus:outline-none text-sm bg-white cursor-pointer transition-all"
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
                  <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 flex flex-wrap gap-x-8 gap-y-3 text-xs text-slate-500 font-medium">
                    <div>Account Status: <span className="text-teal-700 font-bold capitalize">{profile.account_status}</span></div>
                    <div>Plan Type: <span className="text-indigo-700 font-bold capitalize">{profile.subscription_plan}</span></div>
                    {profile.last_login && <div>Last Login: <span>{new Date(profile.last_login).toLocaleString()}</span></div>}
                  </div>

                  {/* Change Password Block */}
                  <div className="border-t border-slate-100 pt-8 space-y-5">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Change Password</h3>
                      <p className="text-xs text-slate-500">Provide your current credentials to change password.</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <input
                        type="password"
                        placeholder="Current password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-600/10 focus:border-teal-600"
                      />
                      <input
                        type="password"
                        placeholder="New password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-600/10 focus:border-teal-600"
                      />
                    </div>
                    <button
                      onClick={handleResetPassword}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors"
                    >
                      Update Password
                    </button>
                  </div>
                </div>
              )}

              {/* Tab 2: CONNECTED INTEGRATIONS */}
              {activeTab === "integrations" && (
                <div className="space-y-8">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">Connected Integration Platforms</h2>
                      <p className="text-xs text-slate-500">Link your meeting accounts, calendars, and chats for auto ingestion.</p>
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
                      return (
                        <div key={platform.key} className="border border-slate-200 rounded-2xl p-5 hover:shadow-md transition-all space-y-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${platform.bg}`}>
                                {platform.icon}
                              </div>
                              <div>
                                <h3 className="text-sm font-bold text-slate-800">{platform.name}</h3>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  conn ? "bg-teal-50 text-teal-800 border border-teal-100" : "bg-slate-100 text-slate-500 border border-slate-200"
                                }`}>
                                  {conn ? "Connected" : "Disconnected"}
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
                                onClick={() => {
                                  if (platform.key === "msteams" || platform.key === "outlook") {
                                    window.location.href = getApiUrl("/api/auth/microsoft/login");
                                  } else if (platform.key === "googlemeet" || platform.key === "googlecalendar") {
                                    window.location.href = getApiUrl("/api/auth/google/login");
                                  } else {
                                    setConnectProvider(platform.key);
                                  }
                                }}
                                className="px-3 py-1 bg-teal-800 hover:bg-teal-700 text-white text-xs font-bold rounded-lg transition-colors"
                              >
                                Connect
                              </button>

                            )}
                          </div>

                          {conn && (
                            <div className="border-t border-slate-100 pt-3 space-y-2 text-xs text-slate-500">
                              <div className="flex justify-between">
                                <span>Account email:</span>
                                <span className="font-semibold text-slate-700">{conn.email}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Last sync:</span>
                                <span>{conn.last_sync ? new Date(conn.last_sync).toLocaleString() : "Never"}</span>
                              </div>
                              <div className="flex items-center justify-between border-t border-slate-50 pt-2">
                                <span className="font-semibold text-slate-700">Auto synchronization</span>
                                <input
                                  type="checkbox"
                                  checked={conn.auto_sync}
                                  onChange={async (e) => {
                                    markDirty();
                                    // mock save instantly
                                    conn.auto_sync = e.target.checked;
                                    setIntegrations([...integrations]);
                                  }}
                                  className="w-4 h-4 text-teal-600 focus:ring-teal-500 border-slate-300 rounded cursor-pointer"
                                />
                              </div>
                              <div className="flex justify-between gap-2 pt-2">
                                <button 
                                  onClick={() => handleSyncIntegration(conn.id, platform.name)}
                                  className="flex items-center gap-1 text-[11px] font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 px-2 py-1 rounded-md transition-colors"
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
                      <div className="bg-white rounded-2xl p-6 max-w-sm w-full border border-slate-200 shadow-xl space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-md font-bold text-slate-900 capitalize">Connect {connectProvider}</h3>
                          <button onClick={() => setConnectProvider(null)}><X className="w-5 h-5 text-slate-400" /></button>
                        </div>
                        <p className="text-xs text-slate-500">Provide the email address associated with your external account to connect OAuth authentication.</p>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Account Email</label>
                          <input
                            type="email"
                            placeholder="user@organization.com"
                            value={connectEmail}
                            onChange={(e) => setConnectEmail(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-600/10 focus:border-teal-600"
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
                            className="px-4 py-1.5 text-xs font-bold bg-teal-800 text-white hover:bg-teal-700 rounded-lg shadow"
                          >
                            Proceed to Connect
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: CALENDAR & MEETING SETTINGS */}
              {activeTab === "meetings" && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Calendar & Meeting Sync Preferences</h2>
                    <p className="text-xs text-slate-500">Configure how platform meetings and local files are analyzed by AI engines.</p>
                  </div>

                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase">Calendar Sync Frequency</label>
                        <select
                          value={meetingPreferences.calendar_sync_frequency}
                          onChange={(e) => { setMeetingPreferences({ ...meetingPreferences, calendar_sync_frequency: e.target.value }); markDirty(); }}
                          className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-600/10 focus:border-teal-600 text-sm bg-white cursor-pointer"
                        >
                          <option value="Real Time">Real Time</option>
                          <option value="Every 5 Minutes">Every 5 Minutes</option>
                          <option value="Every 15 Minutes">Every 15 Minutes</option>
                          <option value="Every Hour">Every Hour</option>
                          <option value="Daily">Daily</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase">Meeting Recording Preferences</label>
                        <select
                          value={meetingPreferences.recording_preference}
                          onChange={(e) => { setMeetingPreferences({ ...meetingPreferences, recording_preference: e.target.value }); markDirty(); }}
                          className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-600/10 focus:border-teal-600 text-sm bg-white cursor-pointer"
                        >
                          <option value="Always Import">Always Import</option>
                          <option value="Ask Before Import">Ask Before Import</option>
                          <option value="Never Import">Never Import</option>
                        </select>
                      </div>
                    </div>

                    <div className="border-t border-slate-100 pt-6 space-y-4">
                      <h3 className="text-sm font-semibold text-slate-800">Auto Ingestion Pipelines</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                          { key: "auto_import_meetings", label: "Auto-import meetings from connected calendars" },
                          { key: "auto_import_recordings", label: "Auto-import cloud recording files" },
                          { key: "auto_generate_transcript", label: "Auto-generate transcripts using Whisper AI" },
                          { key: "auto_generate_summary", label: "Auto-generate executive AI summaries" },
                          { key: "auto_create_action_items", label: "Auto-extract action items" },
                          { key: "auto_create_risks", label: "Auto-extract meeting risks" },
                          { key: "auto_create_kg", label: "Auto-generate knowledge graph entities" },
                          { key: "auto_create_tech_analysis", label: "Auto-generate technical analysis" },
                          { key: "auto_create_decisions", label: "Auto-extract key decisions" }
                        ].map(item => (
                          <label key={item.key} className="flex items-center gap-3 p-3 border border-slate-100 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors">
                            <input
                              type="checkbox"
                              checked={meetingPreferences[item.key as keyof MeetingPreferences] as boolean}
                              onChange={(e) => { 
                                setMeetingPreferences({ ...meetingPreferences, [item.key]: e.target.checked }); 
                                markDirty(); 
                              }}
                              className="w-4.5 h-4.5 text-teal-600 border-slate-300 rounded focus:ring-teal-500"
                            />
                            <span className="text-xs text-slate-700 font-medium">{item.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 4: AI PREFERENCES */}
              {activeTab === "ai" && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">AI Engine Preferences</h2>
                    <p className="text-xs text-slate-500">Fine-tune the primary LLM provider, temperature, and formatting styles for analysis.</p>
                  </div>

                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase">Preferred AI Provider</label>
                        <select
                          value={aiPreferences.preferred_provider}
                          onChange={(e) => { setAiPreferences({ ...aiPreferences, preferred_provider: e.target.value }); markDirty(); }}
                          className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-600/10 focus:border-teal-600 text-sm bg-white cursor-pointer"
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
                          className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-600/10 focus:border-teal-600 text-sm bg-white cursor-pointer"
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
                          className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-600/10 focus:border-teal-600 text-sm"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between">
                          <label className="text-xs font-bold text-slate-500 uppercase">Temperature (Creativity)</label>
                          <span className="text-xs font-bold text-teal-800">{aiPreferences.temperature}</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="1.2"
                          step="0.1"
                          value={aiPreferences.temperature}
                          onChange={(e) => { setAiPreferences({ ...aiPreferences, temperature: parseFloat(e.target.value) }); markDirty(); }}
                          className="w-full accent-teal-700 cursor-pointer"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase">Summary Length</label>
                        <select
                          value={aiPreferences.summary_length}
                          onChange={(e) => { setAiPreferences({ ...aiPreferences, summary_length: e.target.value }); markDirty(); }}
                          className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-600/10 focus:border-teal-600 text-sm bg-white cursor-pointer"
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
                          className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-600/10 focus:border-teal-600 text-sm bg-white cursor-pointer"
                        >
                          <option value="Executive">Executive Summary style</option>
                          <option value="Professional">Professional & Formal</option>
                          <option value="Technical">Technical Context</option>
                          <option value="Developer">Developer friendly (Markdown)</option>
                          <option value="Simple">Simple & Concise</option>
                        </select>
                      </div>
                    </div>

                    <div className="border-t border-slate-100 pt-6 space-y-4">
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
                          <label key={item.key} className="flex items-center gap-3 p-3 border border-slate-100 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors">
                            <input
                              type="checkbox"
                              checked={aiPreferences[item.key as keyof AIPreferences] as boolean}
                              onChange={(e) => { 
                                setAiPreferences({ ...aiPreferences, [item.key]: e.target.checked }); 
                                markDirty(); 
                              }}
                              className="w-4.5 h-4.5 text-teal-600 border-slate-300 rounded focus:ring-teal-500"
                            />
                            <span className="text-xs text-slate-700 font-medium">{item.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 5: STORAGE MANAGEMENT */}
              {activeTab === "storage" && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Storage Settings & Allocations</h2>
                    <p className="text-xs text-slate-500">Monitor space used by meeting assets and clear historical cache.</p>
                  </div>

                  {/* Storage Progress meters */}
                  <div className="space-y-4">
                    <div className="flex justify-between text-sm font-semibold">
                      <span>Total space used</span>
                      <span className="text-teal-800">4.8 GB of 10.0 GB</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden flex">
                      <div className="bg-teal-600 h-full" style={{ width: "45%" }} title="Recordings" />
                      <div className="bg-indigo-500 h-full" style={{ width: "3%" }} title="Transcripts" />
                      <div className="bg-amber-500 h-full" style={{ width: "0.2%" }} title="Graphs" />
                      <div className="bg-purple-500 h-full" style={{ width: "0.8%" }} title="Embeddings" />
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-semibold pt-2 text-slate-500">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-teal-600" />
                        <span>Recordings: 4.5 GB</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                        <span>Transcripts: 150 MB</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                        <span>Knowledge Graphs: 25 MB</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                        <span>Embeddings: 80 MB</span>
                      </div>
                    </div>
                  </div>

                  {/* Cache and clean settings */}
                  <div className="border-t border-slate-100 pt-6 space-y-6">
                    <h3 className="text-sm font-bold text-slate-800">Cleanup Utility Tool</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="border border-slate-200 rounded-2xl p-4 text-center space-y-3">
                        <h4 className="text-xs font-bold uppercase text-slate-500">Audio/Video Recordings</h4>
                        <p className="text-[10px] text-slate-400">Purge offline media assets while keeping text summary metadata.</p>
                        <button 
                          onClick={() => handleStorageCleanup("recordings")}
                          className="w-full py-1.5 bg-red-50 text-red-700 hover:bg-red-100 text-xs font-bold rounded-lg border border-red-200/40"
                        >
                          Purge Recordings
                        </button>
                      </div>

                      <div className="border border-slate-200 rounded-2xl p-4 text-center space-y-3">
                        <h4 className="text-xs font-bold uppercase text-slate-500">Whisper Transcripts</h4>
                        <p className="text-[10px] text-slate-400">Delete underlying diarization transcript text database.</p>
                        <button 
                          onClick={() => handleStorageCleanup("transcripts")}
                          className="w-full py-1.5 bg-red-50 text-red-700 hover:bg-red-100 text-xs font-bold rounded-lg border border-red-200/40"
                        >
                          Purge Transcripts
                        </button>
                      </div>

                      <div className="border border-slate-200 rounded-2xl p-4 text-center space-y-3">
                        <h4 className="text-xs font-bold uppercase text-slate-500">AI Analysis Reports</h4>
                        <p className="text-[10px] text-slate-400">Remove executive summary cache to force LLM re-run on demand.</p>
                        <button 
                          onClick={() => handleStorageCleanup("reports")}
                          className="w-full py-1.5 bg-red-50 text-red-700 hover:bg-red-100 text-xs font-bold rounded-lg border border-red-200/40"
                        >
                          Purge AI Reports
                        </button>
                      </div>
                    </div>

                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/60 flex items-center justify-between flex-wrap gap-4 text-xs font-medium">
                      <div>
                        <h4 className="font-bold text-slate-800">Download Account Archive</h4>
                        <p className="text-[11px] text-slate-500">Acquire a consolidated zip download containing meetings, action items, transcripts and graphs.</p>
                      </div>
                      <button 
                        onClick={handleExportData}
                        className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl"
                      >
                        Request Archive
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 6: SECURITY & API KEYS */}
              {activeTab === "security" && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Security, Sessions & API Tokens</h2>
                    <p className="text-xs text-slate-500">Monitor active browser session terminals, toggle 2FA and generate developer API keys.</p>
                  </div>

                  {/* Two Factor Authentication */}
                  <div className="pb-6 border-b border-slate-100 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-slate-800">Two Factor Authentication (2FA)</h3>
                        <p className="text-xs text-slate-500">Enforce authentication codes via Google Authenticator app.</p>
                      </div>
                      <button className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold">
                        Enable 2FA
                      </button>
                    </div>
                  </div>

                  {/* Developer API Keys */}
                  <div className="pb-6 border-b border-slate-100 space-y-4">
                    <div>
                      <h3 className="text-sm font-bold text-slate-800">Developer API Keys</h3>
                      <p className="text-xs text-slate-500">Create secrets to access MeetingMind programmatically.</p>
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Key nickname (e.g. Jenkins Client)"
                        value={newKeyName}
                        onChange={(e) => setNewKeyName(e.target.value)}
                        className="flex-1 px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-600/10 focus:border-teal-600"
                      />
                      <button 
                        onClick={handleCreateAPIKey}
                        className="px-4 py-2 bg-teal-850 hover:bg-teal-700 bg-[#0f766e] text-white rounded-xl text-xs font-bold"
                      >
                        Generate Key
                      </button>
                    </div>

                    {newlyCreatedKey && (
                      <div className="bg-teal-50 border border-teal-200 text-teal-800 p-4 rounded-xl space-y-2">
                        <span className="text-xs font-bold block">Key created! Copy it now. It won't be displayed again:</span>
                        <div className="flex items-center justify-between gap-4 bg-white/80 p-2 rounded-lg border border-teal-100">
                          <code className="text-xs break-all select-all font-mono font-bold">{newlyCreatedKey.key}</code>
                          <button onClick={() => copyToClipboard(newlyCreatedKey.key)} className="text-teal-700 hover:text-teal-900"><Copy className="w-4 h-4" /></button>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      {apiKeys.map(key => (
                        <div key={key.id} className="flex items-center justify-between p-3 border border-slate-100 rounded-xl text-xs font-medium">
                          <div>
                            <span className="font-bold text-slate-800 block">{key.name}</span>
                            <span className="font-mono text-slate-400">Prefix: {key.key_prefix}xxxx</span>
                          </div>
                          <button 
                            onClick={() => handleRevokeAPIKey(key.id, key.name)}
                            className="text-xs font-semibold text-red-600 hover:text-red-700"
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
                        <p className="text-xs text-slate-500">Revoke sessions connected from other locations.</p>
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
                        <div key={sess.id} className="flex items-center justify-between p-4 border border-slate-100 rounded-xl text-xs">
                          <div className="flex items-center gap-3">
                            <Laptop className="w-5 h-5 text-slate-400" />
                            <div>
                              <span className="font-bold text-slate-800 block">{sess.device}</span>
                              <span className="text-slate-400 font-medium">IP: {sess.ip_address} • Location: {sess.location}</span>
                            </div>
                          </div>
                          <button 
                            onClick={() => handleRevokeSession(sess.id)}
                            className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
                          >
                            Revoke
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 7: NOTIFICATIONS */}
              {activeTab === "notifications" && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Notification Channels</h2>
                    <p className="text-xs text-slate-500">Configure triggers for pipeline outcomes across channels.</p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase">
                          <th className="py-3 px-2">Notification Event Trigger</th>
                          <th className="py-3 px-2 text-center">Email</th>
                          <th className="py-3 px-2 text-center">Browser</th>
                          <th className="py-3 px-2 text-center">Push (App)</th>
                          <th className="py-3 px-2 text-center">Slack</th>
                          <th className="py-3 px-2 text-center">MS Teams</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                        {[
                          { key: "meeting_uploaded", label: "Meeting recording uploaded" },
                          { key: "transcript_ready", label: "Diarized transcript compiled" },
                          { key: "ai_summary_ready", label: "AI summaries and key points ready" },
                          { key: "kg_ready", label: "Knowledge Graph mapping generated" },
                          { key: "action_items_ready", label: "Action items extracted" },
                          { key: "failed_processing", label: "Processing failures or exceptions" },
                          { key: "calendar_sync", label: "Calendar sync events" },
                          { key: "oauth_expired", label: "OAuth token expirations" },
                          { key: "weekly_reports", label: "Weekly activity synthesis reports" }
                        ].map(row => (
                          <tr key={row.key} className="hover:bg-slate-55/30">
                            <td className="py-3 px-2 font-semibold text-slate-800">{row.label}</td>
                            {["email", "browser", "push", "slack", "teams"].map(channel => (
                              <td key={channel} className="py-3 px-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={notifications[row.key as keyof NotificationSettings]?.[channel] || false}
                                  onChange={(e) => {
                                    markDirty();
                                    const trigger = notifications[row.key as keyof NotificationSettings];
                                    trigger[channel] = e.target.checked;
                                    setNotifications({ ...notifications });
                                  }}
                                  className="w-4 h-4 text-teal-600 border-slate-300 rounded focus:ring-teal-500"
                                />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Tab 8: BILLING */}
              {activeTab === "billing" && billingData && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Billing, Plans & Credits</h2>
                    <p className="text-xs text-slate-500">Control payment subscriptions, view invoices, and analyze usage meters.</p>
                  </div>

                  {/* Billing Usage Meters */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="border border-slate-200 rounded-2xl p-5 space-y-3">
                      <span className="text-xs font-bold text-slate-400 uppercase">Meeting Minutes</span>
                      <h3 className="text-2xl font-bold text-slate-800">
                        {billingData.usage.meeting_minutes_used} <span className="text-sm text-slate-400 font-semibold">/ {billingData.usage.meeting_minutes_limit} mins</span>
                      </h3>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div className="bg-teal-600 h-full" style={{ width: `${(billingData.usage.meeting_minutes_used / billingData.usage.meeting_minutes_limit) * 100}%` }} />
                      </div>
                    </div>

                    <div className="border border-slate-200 rounded-2xl p-5 space-y-3">
                      <span className="text-xs font-bold text-slate-400 uppercase">Storage Limit</span>
                      <h3 className="text-2xl font-bold text-slate-800">
                        {billingData.usage.storage_gb_used} <span className="text-sm text-slate-400 font-semibold">/ {billingData.usage.storage_gb_limit} GB</span>
                      </h3>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div className="bg-indigo-600 h-full" style={{ width: `${(billingData.usage.storage_gb_used / billingData.usage.storage_gb_limit) * 100}%` }} />
                      </div>
                    </div>

                    <div className="border border-slate-200 rounded-2xl p-5 space-y-3">
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
                  <div className="border-t border-slate-100 pt-6 space-y-4">
                    <h3 className="text-sm font-bold text-slate-800">Payment Cards</h3>
                    {billingData.payment_methods.map(card => (
                      <div key={card.id} className="flex items-center justify-between p-4 border border-slate-100 rounded-xl text-xs font-medium">
                        <div className="flex items-center gap-3">
                          <CreditCard className="w-6 h-6 text-slate-400" />
                          <div>
                            <span className="font-bold text-slate-800 block">{card.brand} •••• {card.last4}</span>
                            <span className="text-slate-400">Expires: {card.expiry}</span>
                          </div>
                        </div>
                        {card.is_default && <span className="text-[10px] font-bold text-teal-800 bg-teal-50 border border-teal-200/50 px-2 py-0.5 rounded-full">Default</span>}
                      </div>
                    ))}
                  </div>

                  {/* Invoice History */}
                  <div className="border-t border-slate-100 pt-6 space-y-4">
                    <h3 className="text-sm font-bold text-slate-800">Billing History</h3>
                    <div className="space-y-2">
                      {billingData.billing_history.map(inv => (
                        <div key={inv.invoice_id} className="flex items-center justify-between p-3 border border-slate-50 hover:bg-slate-50 rounded-xl text-xs font-medium">
                          <div>
                            <span className="font-bold text-slate-800 block">{inv.invoice_id}</span>
                            <span className="text-slate-400">{inv.date}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-slate-800 block">${inv.amount.toFixed(2)}</span>
                            <span className="text-teal-700 font-semibold">{inv.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 9: ORGANIZATION */}
              {activeTab === "organization" && orgData && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Organization Settings</h2>
                    <p className="text-xs text-slate-500">Configure members directory, role permissions, and invites under {orgData.organization_name}.</p>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-800">Members Directory</h3>
                    <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden">
                      {orgData.members.map(member => (
                        <div key={member.id} className="flex items-center justify-between p-4 bg-white hover:bg-slate-50 transition-colors text-xs">
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

                  <div className="border-t border-slate-100 pt-6 space-y-4">
                    <h3 className="text-sm font-bold text-slate-800">Invite Colleagues</h3>
                    <div className="flex gap-2">
                      <input
                        type="email"
                        placeholder="colleague@company.com"
                        className="flex-1 px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-600/10 focus:border-teal-600"
                      />
                      <button className="px-4 py-2 bg-teal-850 hover:bg-teal-700 bg-[#0f766e] text-white rounded-xl text-xs font-bold">
                        Send Invite
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 10: PERSONALIZATION */}
              {activeTab === "personalization" && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Personalization & Theme Settings</h2>
                    <p className="text-xs text-slate-500">Adjust the visual aesthetics of the dashboard application.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase">Aesthetic Theme</label>
                      <select
                        value={personalization.theme}
                        onChange={(e) => { setPersonalization({ ...personalization, theme: e.target.value }); markDirty(); }}
                        className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-600/10 focus:border-teal-600 text-sm bg-white cursor-pointer"
                      >
                        <option value="System Theme">System Theme (Auto)</option>
                        <option value="Dark Mode">Slate Teal (Dark Mode)</option>
                        <option value="Light Mode">Pure White (Light Mode)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase">Accent branding color</label>
                      <select
                        value={personalization.accent_color}
                        onChange={(e) => { setPersonalization({ ...personalization, accent_color: e.target.value }); markDirty(); }}
                        className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-600/10 focus:border-teal-600 text-sm bg-white cursor-pointer"
                      >
                        <option value="Teal">Teal (Recommended)</option>
                        <option value="Indigo">Indigo</option>
                        <option value="Purple">Purple</option>
                        <option value="Blue">Blue</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase">Date formatting</label>
                      <select
                        value={personalization.date_format}
                        onChange={(e) => { setPersonalization({ ...personalization, date_format: e.target.value }); markDirty(); }}
                        className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-600/10 focus:border-teal-600 text-sm bg-white cursor-pointer"
                      >
                        <option value="YYYY-MM-DD">YYYY-MM-DD (2026-07-07)</option>
                        <option value="DD/MM/YYYY">DD/MM/YYYY (07/07/2026)</option>
                        <option value="MM/DD/YYYY">MM/DD/YYYY (07/07/2026)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase">Time formatting</label>
                      <select
                        value={personalization.time_format}
                        onChange={(e) => { setPersonalization({ ...personalization, time_format: e.target.value }); markDirty(); }}
                        className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-600/10 focus:border-teal-600 text-sm bg-white cursor-pointer"
                      >
                        <option value="12h">12 Hour (6:25 PM)</option>
                        <option value="24h">24 Hour (18:25)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5 flex items-center justify-between p-3 border border-slate-100 rounded-xl hover:bg-slate-50 cursor-pointer">
                      <div>
                        <span className="text-xs font-semibold text-slate-800 block">Compact UI layout mode</span>
                        <span className="text-[10px] text-slate-400 font-medium">Reduces padding to increase information density.</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={personalization.compact_mode}
                        onChange={(e) => { setPersonalization({ ...personalization, compact_mode: e.target.checked }); markDirty(); }}
                        className="w-4.5 h-4.5 text-teal-600 border-slate-300 rounded focus:ring-teal-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 11: PRIVACY */}
              {activeTab === "privacy" && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Privacy & Data Opt-out Settings</h2>
                    <p className="text-xs text-slate-500">Retain granular control over organizational intelligence parameters.</p>
                  </div>

                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase">Data Retention (Days)</label>
                        <input
                          type="number"
                          value={privacy.data_retention_days}
                          onChange={(e) => { setPrivacy({ ...privacy, data_retention_days: parseInt(e.target.value) }); markDirty(); }}
                          className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-600/10 focus:border-teal-600 text-sm"
                        />
                      </div>

                      <div className="flex items-center justify-between p-4 border border-slate-150 rounded-2xl hover:bg-slate-50 cursor-pointer">
                        <div>
                          <span className="text-xs font-bold text-slate-850 block">Opt out of AI model training</span>
                          <span className="text-[10px] text-slate-450 font-medium">Prevent engines from parsing transcripts to refine proprietary models.</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={privacy.ai_training_opt_out}
                          onChange={(e) => { setPrivacy({ ...privacy, ai_training_opt_out: e.target.checked }); markDirty(); }}
                          className="w-4.5 h-4.5 text-teal-600 border-slate-300 rounded focus:ring-teal-500"
                        />
                      </div>
                    </div>

                    <div className="border-t border-slate-100 pt-6 space-y-4">
                      <h3 className="text-sm font-bold text-red-750">Danger Zone</h3>
                      <div className="border border-red-200/50 rounded-2xl p-4 bg-red-50/20 space-y-4 text-xs font-medium">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div>
                            <span className="font-bold text-slate-800 block">Delete Meeting & Transcription History</span>
                            <span className="text-[10px] text-slate-500">Permanently purge all audio recordings and textual summaries.</span>
                          </div>
                          <button 
                            onClick={() => handleClearHistory("meetings")}
                            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl"
                          >
                            Delete History
                          </button>
                        </div>
                        <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-red-200/20">
                          <div>
                            <span className="font-bold text-slate-800 block">Permanently Close Account</span>
                            <span className="text-[10px] text-slate-500">Deletes user login credentials, profile, keys and workspace mappings.</span>
                          </div>
                          <button className="px-3 py-1.5 bg-red-700 hover:bg-red-800 text-white font-bold rounded-xl">
                            Delete Account
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 12: ACTIVITY LOG */}
              {activeTab === "activity" && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Security Audit Logs & Timeline</h2>
                    <p className="text-xs text-slate-500">Detailed historical audit trails of configuration updates, integrations, and uploads.</p>
                  </div>

                  <div className="relative border-l-2 border-slate-200 ml-3 pl-6 space-y-6">
                    {activityLogs.map(log => (
                      <div key={log.id} className="relative">
                        <div className="absolute -left-[31px] top-1 bg-white p-1 rounded-full border border-slate-200 flex items-center justify-center">
                          <div className="w-2.5 h-2.5 bg-teal-600 rounded-full" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-bold text-slate-800">{log.action}</span>
                            <span className="text-[10px] text-slate-400 font-semibold">{new Date(log.created_at).toLocaleString()}</span>
                          </div>
                          <p className="text-xs text-slate-500">{log.details}</p>
                          <span className="text-[9px] font-mono text-slate-400">Terminal Address: {log.ip_address}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab 13: DASHBOARD SUMMARY STATS */}
              {activeTab === "dashboard" && dashboardStats && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Workspace Statistics & Dashboard</h2>
                    <p className="text-xs text-slate-500">High-level operational metrics representing organizational intelligence assets.</p>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-2">
                      <span className="text-xs font-bold text-slate-400 uppercase">Meetings Processed</span>
                      <h3 className="text-3xl font-extrabold text-slate-850">{dashboardStats.total_meetings}</h3>
                    </div>
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-2">
                      <span className="text-xs font-bold text-slate-400 uppercase">Hours Transcribed</span>
                      <h3 className="text-3xl font-extrabold text-slate-850">{dashboardStats.hours_processed} hrs</h3>
                    </div>
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-2">
                      <span className="text-xs font-bold text-slate-400 uppercase">AI Insights Compiled</span>
                      <h3 className="text-3xl font-extrabold text-slate-850">{dashboardStats.ai_reports}</h3>
                    </div>
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-2">
                      <span className="text-xs font-bold text-slate-400 uppercase">Mapped Entities</span>
                      <h3 className="text-3xl font-extrabold text-slate-850">{dashboardStats.knowledge_graphs}</h3>
                    </div>
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-2">
                      <span className="text-xs font-bold text-slate-400 uppercase">Action Items extracted</span>
                      <h3 className="text-3xl font-extrabold text-slate-850">{dashboardStats.action_items}</h3>
                    </div>
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-2">
                      <span className="text-xs font-bold text-slate-400 uppercase">Identified Risks</span>
                      <h3 className="text-3xl font-extrabold text-slate-850">{dashboardStats.risks}</h3>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-6 grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs font-semibold text-slate-600">
                    <div>
                      <span>Preferred platform:</span>
                      <span className="font-bold text-slate-800 ml-2">{dashboardStats.most_used_platform}</span>
                    </div>
                    <div>
                      <span>Average meeting duration:</span>
                      <span className="font-bold text-slate-800 ml-2">{dashboardStats.average_meeting_duration_minutes} minutes</span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Sticky Save Changes Bar */}
      {isDirty && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 py-4 px-8 flex items-center justify-between shadow-2xl z-30 animate-slide-up">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-50 rounded-xl border border-amber-200 text-amber-800">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-850 block">Unsaved changes detected</span>
              <span className="text-[10px] text-slate-500 font-medium">Save updates before leaving the panel to prevent loss.</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => { setIsDirty(false); fetchData(); }}
              className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold rounded-xl transition-colors"
            >
              Reset
            </button>
            <button 
              onClick={handleMasterSave}
              className="px-5 py-2 bg-teal-800 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-teal-750/10 transition-colors"
            >
              Save Settings
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
