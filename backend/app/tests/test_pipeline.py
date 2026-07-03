import unittest
from unittest.mock import MagicMock, patch
from app.services.qwen_service import QwenService, OpenRouterModelManager
from app.tasks.meeting_tasks import analyze_transcript_ai
from app.models.models import Meeting, TranscriptSegment, User


class TestPipeline(unittest.TestCase):
    @patch("app.services.openrouter_service.time.sleep")
    @patch("app.services.openrouter_service.OpenAI")
    def test_openrouter_model_manager_falls_back_and_retries(
        self, mock_openai, mock_sleep
    ):
        """
        Verify that OpenRouterModelManager tries models in order,
        sleeps with exponential backoff on failure, and moves to the next model.
        """
        manager = OpenRouterModelManager(
            api_key="test-key", base_url="https://openrouter.ai/api/v1"
        )
        # Configure a small subset of models for testing
        manager.models = ["model-1", "model-2", "model-3"]

        # Configure the mock OpenAI clients to fail for model-1 and model-2, but succeed for model-3
        client_mock = MagicMock()
        mock_openai.return_value = client_mock

        # We simulate the first completion returning ValueError (or OpenRouter error),
        # the second raising an Exception, and the third succeeding
        resp_mock = MagicMock()
        resp_mock.choices = [MagicMock()]
        resp_mock.choices[0].message.content = (
            '{"executive_summary": "Success at last"}'
        )

        # completions.create side_effect
        client_mock.chat.completions.create.side_effect = [
            Exception("API error 429 Too Many Requests"),
            Exception("No endpoints found"),
            resp_mock,
        ]

        result = manager.execute_with_fallback("system prompt", "user content")

        # Verify it retried through the list and succeeded on model-3
        self.assertEqual(result["executive_summary"], "Success at last")

        # Verify exponential backoff sleeps occurred:
        # First retry (after model-1 failed): 2 ** 1 = 2 seconds
        # Second retry (after model-2 failed): 2 ** 2 = 4 seconds
        mock_sleep.assert_any_call(2)
        mock_sleep.assert_any_call(4)
        self.assertEqual(mock_sleep.call_count, 2)

    @patch("app.services.openrouter_service.time.sleep")
    @patch("app.services.openrouter_service.OpenAI")
    def test_openrouter_model_manager_exhausts_and_returns_empty_dict(
        self, mock_openai, mock_sleep
    ):
        """
        Verify that OpenRouterModelManager returns the correct empty dictionary
        without mock data or fabricated insights if all models fail.
        """
        manager = OpenRouterModelManager(
            api_key="test-key", base_url="https://openrouter.ai/api/v1"
        )
        manager.models = ["model-1", "model-2"]

        client_mock = MagicMock()
        mock_openai.return_value = client_mock
        client_mock.chat.completions.create.side_effect = Exception(
            "General connection timeout"
        )

        result = manager.execute_with_fallback("system prompt", "user content")

        # Verify the structure matches requirement 5
        self.assertEqual(result["status"], "LLM temporarily unavailable")
        self.assertEqual(result["summary"], "")
        self.assertEqual(result["executive_summary"], "")
        self.assertEqual(result["action_items"], [])
        self.assertEqual(result["decisions"], [])

        # Verify it slept 2 seconds on the first retry
        mock_sleep.assert_called_once_with(2)

    @patch("app.tasks.meeting_tasks.SessionLocal")
    @patch("app.tasks.meeting_tasks.generate_embeddings")
    def test_analyze_transcript_ai_failure_preserves_transcript(
        self, mock_generate_embeddings, mock_session_local
    ):
        """
        Verify that if the AI insight extraction fails/exceptions out,
        the actual transcript segments are preserved, empty AI fields are saved,
        and the meeting status is NOT set to 'Failed' (so it continues to completed).
        """
        # Mock database session
        db_mock = MagicMock()
        mock_session_local.return_value = db_mock

        # Mock meeting in DB
        meeting = Meeting(
            id="test-meeting-id",
            organization_id="test-org-id",
            title="Sprint Sync",
            status="Processing",
            executive_summary=None,
        )
        db_mock.query.return_value.filter.return_value.first.side_effect = [
            meeting,
            None,
        ]  # first meeting, then no user matching assigned_to

        # Mock transcript segments in DB
        segment = TranscriptSegment(
            meeting_id="test-meeting-id",
            start_ms=0,
            end_ms=5000,
            speaker_tag="SPEAKER_00",
            text="Let's build the auth system.",
        )
        db_mock.query.return_value.filter.return_value.order_by.return_value.all.return_value = [
            segment
        ]

        # Force QwenService extract_meeting_insights to return fallback empty data
        with patch.object(QwenService, "extract_meeting_insights") as mock_extract:
            mock_extract.return_value = {
                "summary": "",
                "executive_summary": "",
                "action_items": [],
                "decisions": [],
                "status": "LLM temporarily unavailable",
            }

            analyze_transcript_ai("test-meeting-id")

        # Verify database save confirmation for empty AI fields
        self.assertEqual(meeting.executive_summary, "AI analysis unavailable.")
        self.assertEqual(meeting.one_minute_read, "")
        self.assertEqual(meeting.sentiment_summary, "AI analysis unavailable.")

        # Verify the transcript segment is untouched/preserved in the session
        self.assertNotEqual(meeting.status, "Failed")
        db_mock.commit.assert_called()
        mock_generate_embeddings.delay.assert_called_with("test-meeting-id", {})


if __name__ == "__main__":
    unittest.main()
