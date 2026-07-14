import uuid
import os
import shutil
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database.connection import get_db
from app.models.models import (
    User,
    Organization,
    UserProfile,
    ConnectedAccount,
    Provider,
    AIPreference,
    MeetingPreference,
    NotificationSetting,
    UserSecuritySetting,
    UserSession,
    APIKey,
    StorageUsage,
    PersonalizationSetting,
    PrivacySetting,
    ActivityLog,
    Meeting,
    ActionItem,
    Decision,
    Risk,
)
from app.helpers.auth import (
    get_current_user,
    get_password_hash,
    verify_password,
)
from app.helpers.profile import log_activity, ensure_user_settings_initialized
from app.schemas.profile import (
    ProfileUpdate,
    PasswordChange,
    AIPreferenceUpdate,
    MeetingPreferenceUpdate,
    NotificationSettingUpdate,
    PersonalizationUpdate,
    PrivacyUpdate,
    APIKeyCreate,
    IntegrationConnect,
)

router = APIRouter()

# --- Endpoints ---


@router.get("/full-profile")
def get_full_profile(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    ensure_user_settings_initialized(db, current_user)

    # Format and return all details
    user_integrations = []
    for integration in current_user.integrations:
        if integration.provider == Provider.MICROSOFT:
            for virtual_provider in ["msteams", "outlook"]:
                user_integrations.append(
                    {
                        "id": integration.id,
                        "provider": virtual_provider,
                        "email": integration.email,
                        "connection_status": integration.connection_status,
                        "last_sync": (
                            integration.last_sync.isoformat()
                            if integration.last_sync
                            else None
                        ),
                        "sync_errors": integration.sync_errors,
                        "auto_sync": integration.auto_sync,
                        "recording_import": integration.recording_import,
                        "calendar_sync": integration.calendar_sync,
                    }
                )
        elif (
            integration.provider == Provider.GOOGLE or integration.provider == "google"
        ):
            for virtual_provider in ["googlemeet", "googlecalendar"]:
                user_integrations.append(
                    {
                        "id": integration.id,
                        "provider": virtual_provider,
                        "email": integration.email,
                        "connection_status": integration.connection_status,
                        "last_sync": (
                            integration.last_sync.isoformat()
                            if integration.last_sync
                            else None
                        ),
                        "sync_errors": integration.sync_errors,
                        "auto_sync": integration.auto_sync,
                        "recording_import": integration.recording_import,
                        "calendar_sync": integration.calendar_sync,
                    }
                )
        else:
            user_integrations.append(
                {
                    "id": integration.id,
                    "provider": integration.provider,
                    "email": integration.email,
                    "connection_status": integration.connection_status,
                    "last_sync": (
                        integration.last_sync.isoformat()
                        if integration.last_sync
                        else None
                    ),
                    "sync_errors": integration.sync_errors,
                    "auto_sync": integration.auto_sync,
                    "recording_import": integration.recording_import,
                    "calendar_sync": integration.calendar_sync,
                }
            )

    # Fetch default profile settings
    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "role": current_user.role,
        "created_at": current_user.created_at.isoformat(),
        "organization": (
            {
                "id": current_user.organization.id,
                "name": current_user.organization.name,
                "domain": current_user.organization.domain,
            }
            if current_user.organization
            else None
        ),
        "profile": {
            "profile_picture": current_user.profile.profile_picture,
            "username": current_user.profile.username,
            "phone_number": current_user.profile.phone_number,
            "job_title": current_user.profile.job_title,
            "company_name": current_user.profile.company_name,
            "department": current_user.profile.department,
            "country": current_user.profile.country,
            "time_zone": current_user.profile.time_zone,
            "preferred_language": current_user.profile.preferred_language,
            "last_login": (
                current_user.profile.last_login.isoformat()
                if current_user.profile.last_login
                else None
            ),
            "account_status": current_user.profile.account_status,
            "subscription_plan": current_user.profile.subscription_plan,
            "email_verified": current_user.profile.email_verified,
        },
        "ai_preferences": {
            "preferred_provider": current_user.ai_preference.preferred_provider,
            "fallback_provider": current_user.ai_preference.fallback_provider,
            "preferred_model": current_user.ai_preference.preferred_model,
            "temperature": current_user.ai_preference.temperature,
            "summary_length": current_user.ai_preference.summary_length,
            "response_style": current_user.ai_preference.response_style,
            "enable_chat_memory": current_user.ai_preference.enable_chat_memory,
            "enable_semantic_search": current_user.ai_preference.enable_semantic_search,
            "enable_context_retrieval": current_user.ai_preference.enable_context_retrieval,
            "enable_kg_generation": current_user.ai_preference.enable_kg_generation,
            "enable_speaker_intelligence": current_user.ai_preference.enable_speaker_intelligence,
            "enable_automatic_insights": current_user.ai_preference.enable_automatic_insights,
        },
        "meeting_preferences": {
            "default_language": current_user.meeting_preference.default_language,
            "enable_speaker_id": current_user.meeting_preference.enable_speaker_id,
            "enable_translation": current_user.meeting_preference.enable_translation,
            "enable_subtitles": current_user.meeting_preference.enable_subtitles,
            "transcript_format": current_user.meeting_preference.transcript_format,
            "default_category": current_user.meeting_preference.default_category,
            "recording_retention_days": current_user.meeting_preference.recording_retention_days,
            "auto_delete_recordings": current_user.meeting_preference.auto_delete_recordings,
            "meeting_privacy": current_user.meeting_preference.meeting_privacy,
            "auto_import_meetings": current_user.meeting_preference.auto_import_meetings,
            "auto_import_recordings": current_user.meeting_preference.auto_import_recordings,
            "auto_generate_transcript": current_user.meeting_preference.auto_generate_transcript,
            "auto_generate_summary": current_user.meeting_preference.auto_generate_summary,
            "auto_create_action_items": current_user.meeting_preference.auto_create_action_items,
            "auto_create_risks": current_user.meeting_preference.auto_create_risks,
            "auto_create_kg": current_user.meeting_preference.auto_create_kg,
            "auto_create_tech_analysis": current_user.meeting_preference.auto_create_tech_analysis,
            "auto_create_decisions": current_user.meeting_preference.auto_create_decisions,
            "calendar_sync_frequency": current_user.meeting_preference.calendar_sync_frequency,
            "recording_preference": current_user.meeting_preference.recording_preference,
        },
        "notification_settings": {
            "meeting_uploaded": current_user.notification_setting.meeting_uploaded,
            "transcript_ready": current_user.notification_setting.transcript_ready,
            "ai_summary_ready": current_user.notification_setting.ai_summary_ready,
            "kg_ready": current_user.notification_setting.kg_ready,
            "action_items_ready": current_user.notification_setting.action_items_ready,
            "failed_processing": current_user.notification_setting.failed_processing,
            "calendar_sync": current_user.notification_setting.calendar_sync,
            "oauth_expired": current_user.notification_setting.oauth_expired,
            "weekly_reports": current_user.notification_setting.weekly_reports,
        },
        "personalization": {
            "theme": current_user.personalization.theme,
            "accent_color": current_user.personalization.accent_color,
            "compact_mode": current_user.personalization.compact_mode,
            "date_format": current_user.personalization.date_format,
            "time_format": current_user.personalization.time_format,
            "default_landing_page": current_user.personalization.default_landing_page,
            "sidebar_expanded": current_user.personalization.sidebar_expanded,
        },
        "privacy": {
            "data_retention_days": current_user.privacy_setting.data_retention_days,
            "ai_training_opt_out": current_user.privacy_setting.ai_training_opt_out,
        },
        "integrations": user_integrations,
    }


@router.put("/profile")
def update_profile(
    data: ProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ensure_user_settings_initialized(db, current_user)

    if data.name is not None:
        current_user.name = data.name

    profile = current_user.profile
    if data.username is not None:
        # Check uniqueness
        dup = (
            db.query(UserProfile)
            .filter(
                UserProfile.username == data.username,
                UserProfile.user_id != current_user.id,
            )
            .first()
        )
        if dup:
            raise HTTPException(status_code=400, detail="Username already taken")
        profile.username = data.username

    if data.phone_number is not None:
        profile.phone_number = data.phone_number
    if data.job_title is not None:
        profile.job_title = data.job_title
    if data.company_name is not None:
        profile.company_name = data.company_name
    if data.department is not None:
        profile.department = data.department
    if data.country is not None:
        profile.country = data.country
    if data.time_zone is not None:
        profile.time_zone = data.time_zone
    if data.preferred_language is not None:
        profile.preferred_language = data.preferred_language

    db.commit()
    log_activity(db, current_user.id, "Settings Changed", "Updated profile settings")
    return {"status": "success", "message": "Profile updated successfully"}


@router.post("/profile-picture")
async def upload_profile_picture(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ensure_user_settings_initialized(db, current_user)

    uploads_dir = os.path.join("app", "uploads", "profile_pics")
    os.makedirs(uploads_dir, exist_ok=True)

    file_ext = os.path.splitext(file.filename)[1]
    filename = f"{current_user.id}_{int(datetime.utcnow().timestamp())}{file_ext}"
    file_path = os.path.join(uploads_dir, filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    relative_url = f"/uploads/profile_pics/{filename}"
    current_user.profile.profile_picture = relative_url
    db.commit()

    log_activity(
        db, current_user.id, "Settings Changed", "Uploaded new profile picture"
    )
    return {"status": "success", "url": relative_url}


@router.delete("/profile-picture")
def remove_profile_picture(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    ensure_user_settings_initialized(db, current_user)
    current_user.profile.profile_picture = None
    db.commit()
    log_activity(db, current_user.id, "Settings Changed", "Removed profile picture")
    return {"status": "success", "message": "Profile picture removed"}


@router.post("/change-password")
def change_password(
    data: PasswordChange,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(data.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect current password")

    current_user.hashed_password = get_password_hash(data.new_password)
    db.commit()
    log_activity(db, current_user.id, "Password Changed", "Updated account password")
    return {"status": "success", "message": "Password changed successfully"}


@router.post("/verify-email")
def request_email_verification(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    ensure_user_settings_initialized(db, current_user)
    current_user.profile.email_verified = True  # Mock toggle auto-verification for demo
    db.commit()
    log_activity(db, current_user.id, "Settings Changed", "Verified email address")
    return {"status": "success", "message": "Email verified successfully"}


# --- Integrations & OAuth ---


@router.get("/integrations")
def list_integrations(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    accounts = (
        db.query(ConnectedAccount)
        .filter(ConnectedAccount.user_id == current_user.id)
        .all()
    )

    def _build_entry(acc, virtual_provider: str) -> dict:
        needs_reauth = acc.connection_status == "needs_reauthorization"
        return {
            "id": acc.id,
            "provider": virtual_provider,
            "email": acc.email,
            "connection_status": acc.connection_status,
            # Convenience flag the frontend can use to show a "Reconnect" button.
            "reconnect_required": needs_reauth,
            "last_sync": acc.last_sync.isoformat() if acc.last_sync else None,
            "sync_errors": acc.sync_errors,
            "auto_sync": acc.auto_sync,
            "recording_import": acc.recording_import,
            "calendar_sync": acc.calendar_sync,
        }

    # Project microsoft into msteams and outlook for frontend compatibility
    projected = []
    for acc in accounts:
        if acc.provider == Provider.MICROSOFT:
            for virtual_provider in ["msteams", "outlook"]:
                projected.append(_build_entry(acc, virtual_provider))
        elif acc.provider == Provider.GOOGLE or acc.provider == "google":
            for virtual_provider in ["googlemeet", "googlecalendar"]:
                projected.append(_build_entry(acc, virtual_provider))
        else:
            projected.append(_build_entry(acc, acc.provider))
    return projected


@router.post("/integrations/connect")
def connect_integration(
    data: IntegrationConnect,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if data.provider in [
        "msteams",
        "outlook",
        "microsoft",
        "googlemeet",
        "googlecalendar",
        "google",
        "zoom",
    ]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Microsoft, Google, and Zoom integrations must be connected via the secure OAuth flow.",
        )

    # Simulates OAuth connection success for non-Microsoft (e.g. other mock/demo apps)
    integration = (
        db.query(ConnectedAccount)
        .filter(
            ConnectedAccount.user_id == current_user.id,
            ConnectedAccount.provider == data.provider,
        )
        .first()
    )

    if not integration:
        integration = ConnectedAccount(
            user_id=current_user.id,
            provider=data.provider,
        )
        db.add(integration)

    integration.email = data.email
    integration.provider_user_id = str(uuid.uuid4())
    integration.access_token = f"mock_access_token_{uuid.uuid4().hex}"
    integration.refresh_token = f"mock_refresh_token_{uuid.uuid4().hex}"
    integration.expires_at = datetime.utcnow() + timedelta(hours=1)
    integration.connection_status = "Connected"
    integration.last_sync = datetime.utcnow()
    integration.sync_errors = None
    integration.auto_sync = data.auto_sync
    integration.recording_import = data.recording_import
    integration.calendar_sync = data.calendar_sync

    db.commit()
    log_activity(
        db,
        current_user.id,
        "Integration Connected",
        f"Connected {data.provider} ({data.email})",
    )
    return {
        "status": "success",
        "message": f"Connected to {data.provider} successfully",
    }


@router.post("/integrations/{id}/sync")
async def sync_integration(
    id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    integration = (
        db.query(ConnectedAccount)
        .filter(ConnectedAccount.id == id, ConnectedAccount.user_id == current_user.id)
        .first()
    )

    if not integration:
        raise HTTPException(status_code=404, detail="Integration not found")

    from app.integrations.service import IntegrationService

    await IntegrationService().sync_integration(db, integration, current_user.id)

    integration.last_sync = datetime.utcnow()
    integration.sync_errors = None
    db.commit()
    log_activity(
        db,
        current_user.id,
        "Settings Changed",
        f"Triggered sync for {integration.provider}",
    )
    return {
        "status": "success",
        "message": "Synchronized integration successfully",
        "last_sync": integration.last_sync.isoformat(),
    }


@router.post("/integrations/{id}/disconnect")
def disconnect_integration(
    id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    integration = (
        db.query(ConnectedAccount)
        .filter(ConnectedAccount.id == id, ConnectedAccount.user_id == current_user.id)
        .first()
    )

    if not integration:
        raise HTTPException(status_code=404, detail="Integration not found")

    provider = integration.provider
    db.delete(integration)
    db.commit()
    log_activity(
        db, current_user.id, "Settings Changed", f"Disconnected integration {provider}"
    )
    return {"status": "success", "message": "Disconnected integration successfully"}


# --- Sub-Settings Update Endpoints ---


@router.put("/ai-preferences")
def update_ai_preferences(
    data: AIPreferenceUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ensure_user_settings_initialized(db, current_user)
    pref = current_user.ai_preference

    pref.preferred_provider = data.preferred_provider
    pref.fallback_provider = data.fallback_provider
    pref.preferred_model = data.preferred_model
    pref.temperature = data.temperature
    pref.summary_length = data.summary_length
    pref.response_style = data.response_style
    pref.enable_chat_memory = data.enable_chat_memory
    pref.enable_semantic_search = data.enable_semantic_search
    pref.enable_context_retrieval = data.enable_context_retrieval
    pref.enable_kg_generation = data.enable_kg_generation
    pref.enable_speaker_intelligence = data.enable_speaker_intelligence
    pref.enable_automatic_insights = data.enable_automatic_insights

    db.commit()
    log_activity(db, current_user.id, "Settings Changed", "Updated AI preferences")
    return {"status": "success", "message": "AI preferences updated"}


@router.put("/meeting-preferences")
def update_meeting_preferences(
    data: MeetingPreferenceUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ensure_user_settings_initialized(db, current_user)
    pref = current_user.meeting_preference

    pref.default_language = data.default_language
    pref.enable_speaker_id = data.enable_speaker_id
    pref.enable_translation = data.enable_translation
    pref.enable_subtitles = data.enable_subtitles
    pref.transcript_format = data.transcript_format
    pref.default_category = data.default_category
    pref.recording_retention_days = data.recording_retention_days
    pref.auto_delete_recordings = data.auto_delete_recordings
    pref.meeting_privacy = data.meeting_privacy
    pref.auto_import_meetings = data.auto_import_meetings
    pref.auto_import_recordings = data.auto_import_recordings
    pref.auto_generate_transcript = data.auto_generate_transcript
    pref.auto_generate_summary = data.auto_generate_summary
    pref.auto_create_action_items = data.auto_create_action_items
    pref.auto_create_risks = data.auto_create_risks
    pref.auto_create_kg = data.auto_create_kg
    pref.auto_create_tech_analysis = data.auto_create_tech_analysis
    pref.auto_create_decisions = data.auto_create_decisions
    pref.calendar_sync_frequency = data.calendar_sync_frequency
    pref.recording_preference = data.recording_preference

    db.commit()
    log_activity(
        db,
        current_user.id,
        "Settings Changed",
        "Updated meeting and calendar preferences",
    )
    return {"status": "success", "message": "Meeting & calendar settings updated"}


@router.put("/notification-settings")
def update_notification_settings(
    data: NotificationSettingUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ensure_user_settings_initialized(db, current_user)
    pref = current_user.notification_setting

    pref.meeting_uploaded = data.meeting_uploaded
    pref.transcript_ready = data.transcript_ready
    pref.ai_summary_ready = data.ai_summary_ready
    pref.kg_ready = data.kg_ready
    pref.action_items_ready = data.action_items_ready
    pref.failed_processing = data.failed_processing
    pref.calendar_sync = data.calendar_sync
    pref.oauth_expired = data.oauth_expired
    pref.weekly_reports = data.weekly_reports

    db.commit()
    log_activity(
        db, current_user.id, "Settings Changed", "Updated notification channels"
    )
    return {"status": "success", "message": "Notification preferences updated"}


@router.put("/personalization")
def update_personalization(
    data: PersonalizationUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ensure_user_settings_initialized(db, current_user)
    pref = current_user.personalization

    pref.theme = data.theme
    pref.accent_color = data.accent_color
    pref.compact_mode = data.compact_mode
    pref.date_format = data.date_format
    pref.time_format = data.time_format
    pref.default_landing_page = data.default_landing_page
    pref.sidebar_expanded = data.sidebar_expanded

    db.commit()
    log_activity(
        db,
        current_user.id,
        "Settings Changed",
        f"Updated personalization theme: {data.theme}",
    )
    return {"status": "success", "message": "Personalization settings saved"}


@router.put("/privacy")
def update_privacy(
    data: PrivacyUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ensure_user_settings_initialized(db, current_user)
    pref = current_user.privacy_setting

    pref.data_retention_days = data.data_retention_days
    pref.ai_training_opt_out = data.ai_training_opt_out

    db.commit()
    log_activity(db, current_user.id, "Settings Changed", "Updated privacy preferences")
    return {"status": "success", "message": "Privacy settings updated"}


# --- Storage ---


@router.get("/storage")
def get_storage_usage(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    ensure_user_settings_initialized(db, current_user)
    usage = current_user.storage_usage

    used = (
        usage.recordings_bytes
        + usage.transcripts_bytes
        + usage.kg_bytes
        + usage.embeddings_bytes
        + usage.reports_bytes
        + usage.chat_bytes
    )

    return {
        "used": used,
        "limit": usage.total_limit_bytes,
        "breakdown": {
            "recordings": usage.recordings_bytes,
            "transcripts": usage.transcripts_bytes,
            "knowledge_graphs": usage.kg_bytes,
            "embeddings": usage.embeddings_bytes,
            "ai_reports": usage.reports_bytes,
            "chat_history": usage.chat_bytes,
        },
    }


@router.post("/storage/cleanup")
def cleanup_storage(
    category: str = Form(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ensure_user_settings_initialized(db, current_user)
    usage = current_user.storage_usage

    cleaned = 0.0
    if category == "recordings":
        cleaned = usage.recordings_bytes
        usage.recordings_bytes = 0.0
    elif category == "transcripts":
        cleaned = usage.transcripts_bytes
        usage.transcripts_bytes = 0.0
    elif category == "reports":
        cleaned = usage.reports_bytes
        usage.reports_bytes = 0.0
    elif category == "all":
        cleaned = (
            usage.recordings_bytes
            + usage.transcripts_bytes
            + usage.reports_bytes
            + usage.chat_bytes
        )
        usage.recordings_bytes = 0.0
        usage.transcripts_bytes = 0.0
        usage.reports_bytes = 0.0
        usage.chat_bytes = 0.0

    db.commit()
    log_activity(
        db,
        current_user.id,
        "Settings Changed",
        f"Cleaned up storage category: {category}",
    )
    return {
        "status": "success",
        "message": f"Cleaned up {cleaned / 1024 / 1024:.2f} MB",
    }


# --- Security, Sessions & API Keys ---


@router.get("/security/sessions")
def list_sessions(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    # Initialize some mock sessions if none exist
    sessions = (
        db.query(UserSession)
        .filter(UserSession.user_id == current_user.id, UserSession.is_active == True)
        .all()
    )
    if not sessions:
        sess1 = UserSession(
            user_id=current_user.id,
            session_token=uuid.uuid4().hex,
            device="Chrome / macOS (Active Session)",
            ip_address="192.168.1.45",
            location="San Francisco, USA",
            expires_at=datetime.utcnow() + timedelta(days=7),
            is_active=True,
        )
        sess2 = UserSession(
            user_id=current_user.id,
            session_token=uuid.uuid4().hex,
            device="Firefox / Windows",
            ip_address="204.85.12.10",
            location="New York, USA",
            expires_at=datetime.utcnow() + timedelta(days=2),
            is_active=True,
        )
        db.add_all([sess1, sess2])
        db.commit()
        sessions = [sess1, sess2]

    return sessions


@router.post("/security/sessions/{id}/revoke")
def revoke_session(
    id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    sess = (
        db.query(UserSession)
        .filter(UserSession.id == id, UserSession.user_id == current_user.id)
        .first()
    )
    if not sess:
        raise HTTPException(status_code=404, detail="Session not found")
    sess.is_active = False
    db.commit()
    log_activity(
        db,
        current_user.id,
        "Settings Changed",
        f"Revoked active device session ({sess.device})",
    )
    return {"status": "success", "message": "Session revoked"}


@router.post("/security/logout-all")
def logout_all_devices(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    db.query(UserSession).filter(UserSession.user_id == current_user.id).update(
        {"is_active": False}
    )
    db.commit()
    log_activity(
        db, current_user.id, "Settings Changed", "Logged out all device sessions"
    )
    return {"status": "success", "message": "Logged out all other sessions"}


@router.get("/security/api-keys")
def list_api_keys(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    return (
        db.query(APIKey)
        .filter(APIKey.user_id == current_user.id, APIKey.is_active == True)
        .all()
    )


@router.post("/security/api-keys")
def generate_api_key(
    data: APIKeyCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    raw_key = f"mm_live_{uuid.uuid4().hex[:32]}"
    key_prefix = "mm_live_"
    hashed = get_password_hash(raw_key)  # Secure storage simulation

    new_key = APIKey(
        user_id=current_user.id,
        name=data.name,
        key_hash=hashed,
        key_prefix=key_prefix,
        expires_at=datetime.utcnow() + timedelta(days=365),
        is_active=True,
    )
    db.add(new_key)
    db.commit()

    log_activity(
        db, current_user.id, "API Usage", f"Generated new API Key: {data.name}"
    )

    return {
        "id": new_key.id,
        "name": new_key.name,
        "prefix": key_prefix,
        "key": raw_key,  # Returned once on creation
        "created_at": new_key.created_at.isoformat(),
        "expires_at": new_key.expires_at.isoformat(),
    }


@router.delete("/security/api-keys/{id}")
def revoke_api_key(
    id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    key = (
        db.query(APIKey)
        .filter(APIKey.id == id, APIKey.user_id == current_user.id)
        .first()
    )
    if not key:
        raise HTTPException(status_code=404, detail="API key not found")
    key.is_active = False
    db.commit()
    log_activity(db, current_user.id, "API Usage", f"Revoked API Key: {key.name}")
    return {"status": "success", "message": "API key revoked"}


# --- Billing & Workspace Organization ---


@router.get("/billing")
def get_billing_data(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    ensure_user_settings_initialized(db, current_user)

    return {
        "current_plan": current_user.profile.subscription_plan,
        "usage": {
            "meeting_minutes_used": 420,
            "meeting_minutes_limit": 1000,
            "storage_gb_used": 4.8,
            "storage_gb_limit": 10.0,
            "ai_credits_used": 180,
            "ai_credits_limit": 500,
        },
        "payment_methods": [
            {
                "id": "pm_1",
                "brand": "Visa",
                "last4": "4242",
                "expiry": "12/28",
                "is_default": True,
            }
        ],
        "billing_history": [
            {
                "invoice_id": "INV-2026-001",
                "date": "2026-07-01",
                "amount": 29.00,
                "status": "Paid",
            },
            {
                "invoice_id": "INV-2026-002",
                "date": "2026-06-01",
                "amount": 29.00,
                "status": "Paid",
            },
        ],
    }


@router.get("/organization")
def get_organization_data(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    if not current_user.organization:
        return {"members": [], "pending_invites": []}

    members = (
        db.query(User)
        .filter(User.organization_id == current_user.organization_id)
        .all()
    )

    return {
        "organization_name": current_user.organization.name,
        "members": [
            {
                "id": m.id,
                "name": m.name,
                "email": m.email,
                "role": m.role,
                "status": "Active",
            }
            for m in members
        ],
        "pending_invites": [
            {
                "id": "inv_1",
                "email": "colleague@company.com",
                "role": "Member",
                "sent_at": "2026-07-05T12:00:00",
            }
        ],
    }


# --- Privacy Data Operations ---


@router.post("/privacy/export")
def export_data(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    # Simulates data compilation and download link creation
    log_activity(
        db,
        current_user.id,
        "Settings Changed",
        "Requested profile and meeting data export",
    )
    return {
        "status": "success",
        "message": "Export compiled successfully. A download link has been sent to your email.",
        "download_url": "/uploads/exports/meetingmind_export_latest.zip",
    }


@router.post("/privacy/delete-history")
def delete_all_history(
    category: str = Form(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if category in ("meetings", "all"):
        # delete meetings logic or simulate
        db.query(Meeting).filter(
            Meeting.organization_id == current_user.organization_id
        ).delete()
    if category in ("chat", "all"):
        # delete chat logic
        pass
    db.commit()
    log_activity(
        db, current_user.id, "Settings Changed", f"Deleted history category: {category}"
    )
    return {"status": "success", "message": f"Successfully deleted {category} history"}


@router.delete("/privacy/delete-account")
def delete_account(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    user_id = current_user.id
    db.delete(current_user)
    db.commit()
    return {"status": "success", "message": "Account permanently deleted"}


# --- Activity Log & Dashboard Statistics ---


@router.get("/activity-log")
def get_activity_log(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    # Return last 30 activities
    logs = (
        db.query(ActivityLog)
        .filter(ActivityLog.user_id == current_user.id)
        .order_by(ActivityLog.created_at.desc())
        .limit(30)
        .all()
    )
    # If no logs, seed some mock logs for display
    if not logs:
        log1 = ActivityLog(
            user_id=current_user.id,
            action="Login",
            details="Logged in from Chrome / macOS",
            created_at=datetime.utcnow() - timedelta(hours=2),
        )
        log2 = ActivityLog(
            user_id=current_user.id,
            action="Settings Changed",
            details="Updated theme preference to Dark Mode",
            created_at=datetime.utcnow() - timedelta(hours=5),
        )
        log3 = ActivityLog(
            user_id=current_user.id,
            action="Meeting Uploaded",
            details="Uploaded meeting: 'Product Strategy Review'",
            created_at=datetime.utcnow() - timedelta(days=1),
        )
        log4 = ActivityLog(
            user_id=current_user.id,
            action="Integration Connected",
            details="Connected Google Calendar integration",
            created_at=datetime.utcnow() - timedelta(days=2),
        )
        db.add_all([log1, log2, log3, log4])
        db.commit()
        logs = [log1, log2, log3, log4]

    return [
        {
            "id": log.id,
            "action": log.action,
            "details": log.details,
            "ip_address": log.ip_address,
            "created_at": log.created_at.isoformat(),
        }
        for log in logs
    ]


@router.get("/dashboard-summary")
def get_dashboard_summary(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    # Calculate statistics based on actual meetings & items in org
    org_id = current_user.organization_id
    total_meetings = db.query(Meeting).filter(Meeting.organization_id == org_id).count()

    # Calculate hours processed
    total_duration = (
        db.query(func.sum(Meeting.duration_seconds))
        .filter(Meeting.organization_id == org_id)
        .scalar()
        or 0
    )
    hours_processed = round(total_duration / 3600.0, 1)

    # AI Reports completed
    ai_reports = (
        db.query(Meeting)
        .filter(Meeting.organization_id == org_id, Meeting.ai_status == "SUCCESS")
        .count()
    )

    # Knowledge Graphs
    kg_nodes = (
        db.query(Meeting)
        .filter(Meeting.organization_id == org_id, Meeting.kg_status == "COMPLETED")
        .count()
    )

    # Action Items
    action_items = (
        db.query(ActionItem)
        .join(Meeting)
        .filter(Meeting.organization_id == org_id)
        .count()
    )

    # Risks
    risks = (
        db.query(Risk).join(Meeting).filter(Meeting.organization_id == org_id).count()
    )

    return {
        "total_meetings": max(total_meetings, 12),  # Default mock baseline if empty
        "hours_processed": max(hours_processed, 15.4),
        "ai_reports": max(ai_reports, 10),
        "knowledge_graphs": max(kg_nodes, 4),
        "action_items": max(action_items, 28),
        "risks": max(risks, 6),
        "monthly_usage": {
            "meetings_limit": 50,
            "meetings_used": max(total_meetings, 12),
            "hours_limit": 100,
            "hours_used": max(hours_processed, 15.4),
        },
        "most_used_platform": "Google Meet",
        "average_meeting_duration_minutes": 45,
    }
