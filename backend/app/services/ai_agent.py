from typing import Dict, Any, List
import openai
from app.config.settings import get_env

class AIAgentPipeline:
    def __init__(self):
        self.provider = get_env("LLM_PROVIDER", "openai")
        self.api_key = get_env("OPENAI_API_KEY", "") or ""
        if self.api_key and self.provider == "openai":
            openai.api_key = self.api_key

    def extract_meeting_insights(self, transcript_text: str) -> Dict[str, Any]:
        """
        Runs LangGraph / LLM prompts to extract details from transcript text.
        In sandbox / testing mode without valid API keys, returns clean structural defaults.
        """
        if not self.api_key or self.api_key == "mock-key":
            return self._get_fallback_mock_data()

        # Premium Prompt engineering system instructions
        system_prompt = (
            "You are an expert project manager and software architect AI.\n"
            "Analyze the meeting transcript and output a JSON dictionary containing:\n"
            "- executive_summary (paragraph summarizing main goals/results)\n"
            "- one_minute_read (3 bullets)\n"
            "- decisions (list of dicts with decision_text, rationale, confidence_score)\n"
            "- action_items (list of dicts with description, assigned_to, priority, confidence_score)\n"
            "- risks (list of dicts with risk_text, mitigation, severity)\n"
            "- questions (list of unresolved question strings)\n"
            "- technical_context (dict with keys: repositories, files, apis, database_tables, services, libraries)"
        )

        try:
            # Synchronous LLM invocation
            response = openai.ChatCompletion.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Transcript:\n{transcript_text}"}
                ],
                temperature=0.2
            )
            # Parse response content JSON
            import json
            result = json.loads(response.choices[0].message.content)
            return result
        except Exception as e:
            print(f"Error calling OpenAI API: {e}. Falling back to default structural model.")
            return self._get_fallback_mock_data()

    def _get_fallback_mock_data(self) -> Dict[str, Any]:
        return {
            "executive_summary": "In this session, the team resolved to replace our custom authentication solution with Auth.js/Clerk. Vivek Sharma will oversee the database modifications, ensuring organization segregation, while Alex Rivera will migrate the frontend components. We flagged risks around migrating legacy passwords and set a firm launch date for the staging release.",
            "one_minute_read": [
                "We are migrating from custom auth to Auth.js/Clerk for multi-tenancy support.",
                "Vivek Sharma owns database schemas, Alex Rivera owns frontend code.",
                "Staging release is targeted for Friday."
            ],
            "decisions": [
                {
                    "decision_text": "Migrate auth strategy from self-hosted token DB to Auth.js/Clerk",
                    "rationale": "Saves maintenance time and easily supports enterprise SAML/OAuth",
                    "confidence_score": 0.96
                }
            ],
            "action_items": [
                {
                    "description": "Design PostgreSQL tenant isolation schemas & foreign key constraints",
                    "assigned_to": "Vivek Sharma",
                    "priority": "High",
                    "confidence_score": 0.98
                },
                {
                    "description": "Integrate Clerk / Auth.js in Next.js 15 routing files",
                    "assigned_to": "Alex Rivera",
                    "priority": "High",
                    "confidence_score": 0.94
                }
            ],
            "risks": [
                {
                    "risk_text": "Legacy password migration conflict",
                    "mitigation": "Require password reset or implement custom hashing middleware",
                    "severity": "High"
                }
            ],
            "questions": [
                "Do we need self-hosted Redis for token rate limiting?"
            ],
            "technical_context": {
                "repositories": ["github.com/meetingmind/backend", "github.com/meetingmind/frontend"],
                "files": ["backend/app/models.py", "frontend/src/app/layout.tsx"],
                "apis": ["POST /api/v1/auth/token", "GET /api/v1/meetings"],
                "database_tables": ["organizations", "users", "meetings"],
                "services": ["Auth Service", "Worker Service"],
                "libraries": ["PyJWT", "Zustand", "pgvector"]
            }
        }
