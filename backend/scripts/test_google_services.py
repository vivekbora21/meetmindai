import asyncio
import sys
import os
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch

# Ensure backend root is in python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database.connection import SessionLocal
from app.models.models import ConnectedAccount, Meeting, Provider, User, Organization
from app.utils.encryption import encrypt_value, decrypt_value
from app.services.google_oauth import GoogleOAuthService
from app.services.google_calendar import GoogleCalendarService
from app.services.scheduler import BackgroundSchedulerService


def test_encryption():
    print("\n--- Testing Encryption/Decryption ---")
    secret = "my-super-secret-oauth-token-12345"
    encrypted = encrypt_value(secret)
    print(f"Original: {secret}")
    print(f"Encrypted: {encrypted}")
    decrypted = decrypt_value(encrypted)
    print(f"Decrypted: {decrypted}")
    assert secret == decrypted, "Decrypted token does not match original!"
    
    # Test fallback
    fallback = "unencrypted-plain-text"
    assert decrypt_value(fallback) == fallback, "Fallback decryption failed!"
    print("Encryption/Decryption verification: SUCCESS")


def test_oauth_url():
    print("\n--- Testing Google OAuth URL Generation ---")
    service = GoogleOAuthService()
    # Mock settings
    service.client_id = "test-client-id"
    service.redirect_uri = "http://localhost:8000/api/auth/google/callback"
    
    state = service.generate_state()
    auth_url = service.get_authorization_url(state)
    print(f"Generated OAuth State: {state}")
    print(f"Generated Authorization URL: {auth_url}")
    assert "client_id=test-client-id" in auth_url
    assert "state=" in auth_url
    assert "prompt=consent" in auth_url
    print("OAuth URL Generation verification: SUCCESS")


async def test_calendar_sync_and_scheduler():
    print("\n--- Testing Calendar Sync and Background Scheduler ---")
    db = SessionLocal()
    try:
        # Create a test organization and user
        org = db.query(Organization).filter(Organization.name == "Test Org").first()
        if not org:
            org = Organization(name="Test Org")
            db.add(org)
            db.commit()
            db.refresh(org)

        user = db.query(User).filter(User.email == "test_google@company.com").first()
        if not user:
            user = User(
                name="Test Google User",
                email="test_google@company.com",
                hashed_password="hashed_password",
                organization_id=org.id,
                role="User"
            )
            db.add(user)
            db.commit()
            db.refresh(user)

        # Clear previous test data
        db.query(ConnectedAccount).filter(ConnectedAccount.user_id == user.id).delete()
        db.query(Meeting).filter(Meeting.organization_id == org.id, Meeting.provider == "google").delete()
        db.commit()

        # Add Google ConnectedAccount
        acc = ConnectedAccount(
            user_id=user.id,
            provider=Provider.GOOGLE,
            provider_user_id="google-user-123",
            email="test_google@company.com",
            display_name="Test Google",
            access_token=encrypt_value("initial-access-token"),
            refresh_token=encrypt_value("initial-refresh-token"),
            expires_at=datetime.utcnow() + timedelta(hours=1),
            connection_status="Connected",
            auto_sync=True
        )
        db.add(acc)
        db.commit()
        db.refresh(acc)

        # Mocking Google Calendar API response
        mock_events = {
            "items": [
                {
                    "id": "event-1",
                    "status": "confirmed",
                    "summary": "Weekly Planning",
                    "description": "Weekly alignment meeting",
                    "hangoutLink": "https://meet.google.com/abc-defg-hij",
                    "organizer": {"email": "organizer@company.com"},
                    "attendees": [{"email": "test_google@company.com"}, {"email": "external@gmail.com"}],
                    "start": {"dateTime": (datetime.utcnow() + timedelta(minutes=4)).isoformat() + "Z"},
                    "end": {"dateTime": (datetime.utcnow() + timedelta(minutes=34)).isoformat() + "Z"},
                },
                {
                    "id": "event-2",
                    "status": "confirmed",
                    "summary": "External Sync",
                    "description": "Sync with clients",
                    # No hangoutLink (should be ignored)
                    "organizer": {"email": "client@client.com"},
                    "start": {"dateTime": (datetime.utcnow() + timedelta(days=1)).isoformat() + "Z"},
                    "end": {"dateTime": (datetime.utcnow() + timedelta(days=1, hours=1)).isoformat() + "Z"},
                }
            ]
        }

        # Mock httpx.AsyncClient response
        class MockResponse:
            def __init__(self, status_code, json_data, text=""):
                self.status_code = status_code
                self._json_data = json_data
                self.text = text
            def json(self):
                return self._json_data


        async def mock_get(url, *args, **kwargs):
            if "events" in url:
                return MockResponse(200, mock_events)
            return MockResponse(404, {})

        with patch("httpx.AsyncClient.get", side_effect=mock_get):
            cal_service = GoogleCalendarService()
            synced = await cal_service.sync_calendar_events(db, user.id)
            print(f"Synced {len(synced)} Google meetings.")
            assert len(synced) == 1, "Expected exactly 1 synced Google Meet meeting!"
            meeting = synced[0]
            print(f"Synced Meeting Title: {meeting.title}")
            print(f"Synced Meeting Date: {meeting.meeting_date}")
            print(f"Synced Meeting URL: {meeting.meeting_url}")
            print(f"Synced Meeting Join Status: {meeting.join_status}")
            assert meeting.title == "Weekly Planning"
            assert meeting.join_status == "Scheduled"

        # Now test the Background Scheduler
        print("\n--- Testing Scheduler Jobs ---")
        # Let's set the ConnectedAccount token to expired
        acc.expires_at = datetime.utcnow() - timedelta(minutes=1)
        db.commit()

        # Mock oauth refresh token response
        async def mock_refresh(refresh_token):
            return {
                "access_token": "new-refreshed-access-token",
                "expires_in": 3600,
                "token_type": "Bearer"
            }

        scheduler = BackgroundSchedulerService(db)
        
        with patch("app.services.google_oauth.GoogleOAuthService.refresh_tokens", side_effect=mock_refresh), \
             patch("httpx.AsyncClient.get", side_effect=mock_get):
            
            # Execute run_jobs
            await scheduler.run_jobs()
            
            db.refresh(acc)
            db.refresh(meeting)
            
            print(f"After Scheduler Run | Account Expires At: {acc.expires_at}")
            print(f"After Scheduler Run | Account Connection Status: {acc.connection_status}")
            print(f"After Scheduler Run | Meeting Join Status: {meeting.join_status}")
            print(f"After Scheduler Run | Meeting status: {meeting.status}")
            
            assert acc.connection_status == "Connected", "Account should be connected after refresh!"
            assert decrypt_value(acc.access_token) == "new-refreshed-access-token", "Access token was not refreshed!"
            assert meeting.join_status == "Ready to Join", "Meeting should be READY_TO_JOIN since it starts in 4 mins!"
            assert meeting.status == "PROCESSING", "Meeting status should be set to PROCESSING!"

        # Let's test duplication cleanup
        print("\n--- Testing Duplicate Meeting Cleanup ---")
        # Add a duplicate meeting
        dup_meeting = Meeting(
            organization_id=org.id,
            title="Weekly Planning (Duplicate)",
            meeting_url=meeting.meeting_url,
            platform="Google Meet",
            meeting_date=meeting.meeting_date,
            status="UPLOADED",
            provider="google",
            provider_event_id=meeting.provider_event_id,
            calendar_id=meeting.calendar_id,
            sync_status="synced",
            last_synced_at=datetime.utcnow() - timedelta(minutes=1),
            join_status="Scheduled"
        )
        db.add(dup_meeting)
        db.commit()
        
        total_meetings = db.query(Meeting).filter(
            Meeting.organization_id == org.id,
            Meeting.provider == "google",
            Meeting.provider_event_id == meeting.provider_event_id
        ).count()
        print(f"Before Cleanup Duplicate Count: {total_meetings}")
        assert total_meetings == 2

        # Run duplication cleanup job
        await scheduler.cleanup_duplicate_meetings()
        
        total_meetings_after = db.query(Meeting).filter(
            Meeting.organization_id == org.id,
            Meeting.provider == "google",
            Meeting.provider_event_id == meeting.provider_event_id
        ).count()
        print(f"After Cleanup Duplicate Count: {total_meetings_after}")
        assert total_meetings_after == 1
        
        print("Scheduler Jobs verification: SUCCESS")

    finally:
        # Clean up database
        db.query(ConnectedAccount).filter(ConnectedAccount.user_id == user.id).delete()
        db.query(Meeting).filter(Meeting.organization_id == org.id, Meeting.provider == "google").delete()
        db.commit()
        db.close()


if __name__ == "__main__":
    test_encryption()
    test_oauth_url()
    asyncio.run(test_calendar_sync_and_scheduler())
    print("\nALL GOOGLE INTEGRATION SERVICES TESTED SUCCESSFULLY!")
