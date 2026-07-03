import os
import re
import json
import time
import logging
from typing import Dict, Any, List
from openai import OpenAI
from app.config.settings import get_env

logger = logging.getLogger(__name__)


class OpenRouterService:
    def __init__(self):
        self.provider = get_env("LLM_PROVIDER", "qwen").lower()
        openrouter_key = get_env("OPENROUTER_API_KEY", "")

        if self.provider == "openrouter" or (
            openrouter_key and self.provider not in ("local", "ollama")
        ):
            self.provider = "openrouter"
            self.api_key = openrouter_key
            self.base_url = get_env("QWEN_BASE_URL") or "https://openrouter.ai/api/v1"
            if "localhost" in self.base_url or "127.0.0.1" in self.base_url:
                self.base_url = "https://openrouter.ai/api/v1"
        else:
            self.api_key = get_env("QWEN_API_KEY", "") or get_env("OPENAI_API_KEY", "")
            self.base_url = get_env("QWEN_BASE_URL", "http://localhost:11434/v1")

        # Load models
        env_models = get_env("OPENROUTER_MODELS", "")
        if env_models:
            self.models = [m.strip() for m in env_models.split(",") if m.strip()]
        else:
            self.models = [
                "google/gemma-2-9b-it:free",
                "meta-llama/llama-3-8b-instruct:free",
                "meta-llama/llama-3.3-70b-instruct:free",
                "nvidia/nemotron-3-ultra-550b-a55b:free",
                "qwen/qwen-2-7b-instruct:free",
            ]

    def extract_meeting_insights(self, transcript_text: str) -> Dict[str, Any]:
        """
        Extracts structured insights from meeting transcripts.
        Attempts fallback across multiple models if provider is OpenRouter.
        """
        if not transcript_text:
            logger.info(
                "OpenRouterService | Transcript is empty. Returning empty schema."
            )
            return self._get_ultimate_fallback_data()

        system_prompt = (
            "You are an expert project manager and software architect AI.\n"
            "Analyze the meeting transcript and output a JSON dictionary containing:\n"
            "- executive_summary (paragraph summarizing main goals/results)\n"
            "- one_minute_read (list of 3 bullet point strings)\n"
            "- decisions (list of dicts with decision_text, rationale, confidence_score)\n"
            "- action_items (list of dicts with description, assigned_to, priority, confidence_score)\n"
            "- risks (list of dicts with risk_text, mitigation, severity)\n"
            "- questions (list of unresolved question strings)\n"
            "- technical_context (dict with keys: repositories, files, apis, database_tables, services, libraries)\n\n"
            "CRITICAL: Output ONLY valid raw JSON. Do not include conversational text or explanations. Do not wrap in markdown tags if possible, but if you do, format it as ```json <content> ```."
        )
        user_content = f"Transcript:\n{transcript_text}"

        if self.provider == "openrouter":
            return self._execute_openrouter_fallback(system_prompt, user_content)
        else:
            return self._execute_local_llm(system_prompt, user_content)

    def generate_answer(self, question: str, context: str) -> str:
        """
        Generates an answer to a question based on retrieved meeting context.
        """
        if not context:
            return "No matching references found in the meetings database."

        system_prompt = (
            "You are a helpful meeting assistant. Answer the user's question using ONLY the provided meeting context. "
            "If the context does not contain the answer, say that you cannot find the answer. Be concise and professional."
        )
        user_content = f"Context:\n{context}\n\nQuestion: {question}"

        if self.provider == "openrouter":
            attempt = 0
            for model in self.models:
                attempt += 1
                try:
                    client = OpenAI(api_key=self.api_key, base_url=self.base_url)
                    response = client.chat.completions.create(
                        model=model,
                        messages=[
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_content},
                        ],
                        temperature=0.2,
                        timeout=20.0,
                    )
                    content = response.choices[0].message.content
                    if content:
                        return content.strip()
                except Exception as e:
                    logger.warning(
                        f"OpenRouterService | generate_answer model failure: {model} | Error: {e}"
                    )
                    if attempt < len(self.models):
                        time.sleep(1)
        else:
            try:
                client = OpenAI(
                    api_key=self.api_key or "no-key", base_url=self.base_url
                )
                response = client.chat.completions.create(
                    model=get_env("QWEN_MODEL", "qwen2.5:latest"),
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_content},
                    ],
                    temperature=0.2,
                )
                content = response.choices[0].message.content
                if content:
                    return content.strip()
            except Exception as e:
                logger.error(
                    f"OpenRouterService | generate_answer Local LLM failure: {e}"
                )

        return "Could not generate answer due to LLM unavailability."

    def _execute_openrouter_fallback(
        self, system_prompt: str, user_content: str
    ) -> Dict[str, Any]:
        attempt = 0
        total_models = len(self.models)

        for i, model in enumerate(self.models):
            attempt += 1
            logger.info(
                f"OpenRouterService | Trying model: {model} | Attempt: {attempt}"
            )
            start_time = time.time()

            try:
                client = OpenAI(api_key=self.api_key, base_url=self.base_url)
                response = client.chat.completions.create(
                    model=model,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_content},
                    ],
                    temperature=0.1,
                    timeout=30.0,
                )

                raw_content = response.choices[0].message.content
                if not raw_content:
                    raise ValueError("Empty response received from OpenRouter LLM.")

                lower_content = raw_content.lower()
                error_keywords = [
                    "no endpoints found",
                    "provider unavailable",
                    "rate limited",
                    "too many requests",
                    "internal server error",
                ]
                for kw in error_keywords:
                    if kw in lower_content:
                        raise ValueError(
                            f"OpenRouter returned error keyword in text: '{kw}'"
                        )

                parsed_json = self._parse_json_response(raw_content)
                duration = time.time() - start_time
                logger.info(
                    f"OpenRouterService | Success | Model: {model} | Duration: {duration:.2f}s"
                )
                return parsed_json

            except Exception as e:
                duration = time.time() - start_time
                logger.warning(
                    f"OpenRouterService | Model failure: {model} | Error: {e} | Duration: {duration:.2f}s"
                )

                if i < total_models - 1:
                    wait_time = 2**attempt
                    logger.info(
                        f"OpenRouterService | Waiting {wait_time}s before trying next model..."
                    )
                    time.sleep(wait_time)
                else:
                    logger.error("OpenRouterService | All fallback models exhausted.")

        return self._get_ultimate_fallback_data()

    def _execute_local_llm(
        self, system_prompt: str, user_content: str
    ) -> Dict[str, Any]:
        logger.info(
            f"OpenRouterService | Using Local/Direct LLM | Base URL: {self.base_url}"
        )
        try:
            client = OpenAI(api_key=self.api_key or "no-key", base_url=self.base_url)
            response = client.chat.completions.create(
                model=get_env("QWEN_MODEL", "qwen2.5:latest"),
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_content},
                ],
                temperature=0.1,
            )
            raw_content = response.choices[0].message.content
            return self._parse_json_response(raw_content)
        except Exception as e:
            logger.error(f"OpenRouterService | Local LLM failure: {e}")
            return self._get_ultimate_fallback_data()

    def _parse_json_response(self, content: str) -> Dict[str, Any]:
        content = content.strip()
        json_match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", content, re.DOTALL)
        if json_match:
            content = json_match.group(1)

        try:
            return json.loads(content)
        except json.JSONDecodeError as e:
            fallback_match = re.search(r"(\{.*\})", content, re.DOTALL)
            if fallback_match:
                try:
                    return json.loads(fallback_match.group(1))
                except Exception:
                    pass
            raise e

    def _get_ultimate_fallback_data(self) -> Dict[str, Any]:
        return {
            "summary": "",
            "executive_summary": "",
            "one_minute_read": [],
            "decisions": [],
            "action_items": [],
            "risks": [],
            "questions": [],
            "participants": [],
            "topics": [],
            "follow_ups": [],
            "technical_context": {
                "repositories": [],
                "files": [],
                "apis": [],
                "database_tables": [],
                "services": [],
                "libraries": [],
            },
            "status": "LLM temporarily unavailable",
        }
