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
from app.services.zoom_oauth import ZoomOAuthService
from app.services.zoom_calendar import ZoomCalendarService
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
    print("Encryption/Decryption verification: SUCCESS")


def test_oauth_url():
    print("\n--- Testing Zoom OAuth URL Generation ---")
    service = ZoomOAuthService()
    # Mock settings
    service.client_id = "test-zoom-client-id"
    service.redirect_uri = "http://localhost:8000/api/auth/zoom/callback"
    
    state = service.generate_state()
    auth_url = service.get_authorization_url(state)
    print(f"Generated OAuth State: {state}")
    print(f"Generated Authorization URL: {auth_url}")
    assert "client_id=test-zoom-client-id" in auth_url
    assert "state=" in auth_url
    print("OAuth URL Generation verification: SUCCESS")


async def test_calendar_sync_and_scheduler():
    print("\n--- Testing Zoom Calendar Sync and Background Scheduler ---")
    db = SessionLocal()
    try:
        # Create a test organization and user
        org = db.query(Organization).filter(Organization.name == "Test Org").first()
        if not org:
            org = Organization(name="Test Org")
            db.add(org)
            db.commit()
            db.refresh(org)

        user = db.query(User).filter(User.email == "test_zoom@company.com").first()
        if not user:
            user = User(
                name="Test Zoom User",
                email="test_zoom@company.com",
                hashed_password="hashed_password",
                organization_id=org.id,
                role="User"
            )
            db.add(user)
            db.commit()
            db.refresh(user)

        # Clear previous test data
        db.query(ConnectedAccount).filter(ConnectedAccount.user_id == user.id).delete()
        db.query(Meeting).filter(Meeting.organization_id == org.id, Meeting.provider == "zoom").delete()
        db.commit()

        # Add Zoom ConnectedAccount
        acc = ConnectedAccount(
            user_id=user.id,
            provider=Provider.ZOOM,
            provider_user_id="zoom-user-123",
            email="test_zoom@company.com",
            display_name="Test Zoom",
            access_token=encrypt_value("initial-zoom-access-token"),
            refresh_token=encrypt_value("initial-zoom-refresh-token"),
            expires_at=datetime.utcnow() + timedelta(hours=1),
            connection_status="Connected",
            auto_sync=True
        )
        db.add(acc)
        db.commit()
        db.refresh(acc)

        # Mocking Zoom API response
        mock_meetings = {
            "meetings": [
                {
                    "id": 987654321,
                    "topic": "Sprint Sync",
                    "agenda": "Weekly sprint sync meeting",
                    "join_url": "https://zoom.us/j/987654321",
                    "start_time": (datetime.utcnow() + timedelta(minutes=4)).isoformat() + "Z",
                    "duration": 30
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
            if "meetings" in url:
                return MockResponse(200, mock_meetings)
            return MockResponse(404, {})

        with patch("httpx.AsyncClient.get", side_effect=mock_get):
            cal_service = ZoomCalendarService()
            synced = await cal_service.sync_calendar_events(db, user.id)
            print(f"Synced {len(synced)} Zoom meetings.")
            assert len(synced) == 1, "Expected exactly 1 synced Zoom meeting!"
            meeting = synced[0]
            print(f"Synced Meeting Title: {meeting.title}")
            print(f"Synced Meeting Date: {meeting.meeting_date}")
            print(f"Synced Meeting URL: {meeting.meeting_url}")
            print(f"Synced Meeting Join Status: {meeting.join_status}")
            assert meeting.title == "Sprint Sync"
            assert meeting.join_status == "Scheduled"

        # Now test the Background Scheduler
        print("\n--- Testing Scheduler Jobs ---")
        # Let's set the ConnectedAccount token to expired
        acc.expires_at = datetime.utcnow() - timedelta(minutes=1)
        db.commit()

        # Mock oauth refresh token response
        async def mock_refresh(refresh_token):
            return {
                "access_token": "new-refreshed-zoom-access-token",
                "expires_in": 3600,
                "token_type": "Bearer"
            }

        scheduler = BackgroundSchedulerService(db)
        
        with patch("app.services.zoom_oauth.ZoomOAuthService.refresh_tokens", side_effect=mock_refresh), \
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
            assert decrypt_value(acc.access_token) == "new-refreshed-zoom-access-token", "Access token was not refreshed!"
            assert meeting.join_status == "Ready to Join", "Meeting should be READY_TO_JOIN since it starts in 4 mins!"
            assert meeting.status == "PROCESSING", "Meeting status should be set to PROCESSING!"

        print("Scheduler Jobs verification: SUCCESS")

    finally:
        # Clean up database
        db.query(ConnectedAccount).filter(ConnectedAccount.user_id == user.id).delete()
        db.query(Meeting).filter(Meeting.organization_id == org.id, Meeting.provider == "zoom").delete()
        db.commit()
        db.close()


if __name__ == "__main__":
    test_encryption()
    test_oauth_url()
    asyncio.run(test_calendar_sync_and_scheduler())
    print("\nALL ZOOM INTEGRATION SERVICES TESTED SUCCESSFULLY!")
