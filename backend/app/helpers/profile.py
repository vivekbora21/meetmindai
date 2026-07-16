import uuid
from sqlalchemy.orm import Session
from app.models.models import (
    User,
    UserProfile,
    AIPreference,
    MeetingPreference,
    NotificationSetting,
    UserSecuritySetting,
    StorageUsage,
    PersonalizationSetting,
    PrivacySetting,
    ActivityLog,
)


def log_activity(
    db: Session, user_id: str, action: str, details: str | None = None, ip: str = "127.0.0.1"
) -> None:
    activity = ActivityLog(
        user_id=user_id, action=action, details=details, ip_address=ip
    )
    db.add(activity)
    db.commit()


def ensure_user_settings_initialized(db: Session, user: User) -> None:
    """Ensure all profile & setting sub-tables exist for a user."""
    # 1. Profile
    if not user.profile:
        profile = UserProfile(
            user_id=user.id,
            username=user.email.split("@")[0] + "_" + str(uuid.uuid4())[:4],
            company_name=user.organization.name if user.organization else None,
            time_zone="UTC",
            preferred_language="en",
            account_status="Active",
            subscription_plan="Free",
            email_verified=False,
        )
        db.add(profile)

    # 2. AI Preferences
    if not user.ai_preference:
        ai_pref = AIPreference(user_id=user.id)
        db.add(ai_pref)

    # 3. Meeting Preferences
    if not user.meeting_preference:
        meet_pref = MeetingPreference(user_id=user.id)
        db.add(meet_pref)

    # 4. Notification Settings
    if not user.notification_setting:
        notif = NotificationSetting(user_id=user.id)
        db.add(notif)

    # 5. Security Settings
    if not user.security_setting:
        sec = UserSecuritySetting(user_id=user.id)
        db.add(sec)

    # 6. Storage Usage
    if not user.storage_usage:
        storage = StorageUsage(
            user_id=user.id,
            recordings_bytes=4.5 * 1024 * 1024 * 1024,  # mock seed
            transcripts_bytes=150 * 1024 * 1024,
            kg_bytes=25 * 1024 * 1024,
            embeddings_bytes=80 * 1024 * 1024,
            reports_bytes=45 * 1024 * 1024,
            chat_bytes=10 * 1024 * 1024,
            total_limit_bytes=10.0 * 1024 * 1024 * 1024,
        )
        db.add(storage)

    # 7. Personalization
    if not user.personalization:
        pers = PersonalizationSetting(user_id=user.id)
        db.add(pers)

    # 8. Privacy
    if not user.privacy_setting:
        priv = PrivacySetting(user_id=user.id)
        db.add(priv)

    db.commit()
    db.refresh(user)
