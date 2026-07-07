import os
import json
import time
import logging
import asyncio
from typing import Dict, Any, List, Generator
from openai import OpenAI, AsyncOpenAI

from app.config import ai_config
from app.prompts.summary_prompt import SUMMARY_SYSTEM_INSTRUCTION
from app.prompts.action_item_prompt import ACTION_ITEM_SYSTEM_INSTRUCTION
from app.prompts.decision_prompt import DECISION_SYSTEM_INSTRUCTION
from app.prompts.risk_prompt import RISK_SYSTEM_INSTRUCTION
from app.prompts.timeline_prompt import TIMELINE_SYSTEM_INSTRUCTION
from app.prompts.technical_prompt import TECHNICAL_SYSTEM_INSTRUCTION
from app.prompts.knowledge_graph_prompt import KNOWLEDGE_GRAPH_SYSTEM_INSTRUCTION
from app.prompts.chat_prompt import CHAT_SYSTEM_INSTRUCTION

logger = logging.getLogger(__name__)

class GeminiService:
    def __init__(self):
        self.api_key = ai_config.GOOGLE_API_KEY
        self.base_url = "https://generativelanguage.googleapis.com/v1beta/openai/"
        self.model_name = ai_config.MODEL_NAME

        if not self.api_key:
            logger.error("GeminiService | GOOGLE_API_KEY environment variable is not set.")
            # We degrade gracefully, but log the critical error
        
        # Instantiate clients for connection reuse
        self.client = OpenAI(api_key=self.api_key or "mock-key", base_url=self.base_url)
        self.async_client = AsyncOpenAI(api_key=self.api_key or "mock-key", base_url=self.base_url)

    def _execute_with_retry(self, system_instruction: str, user_content: str, response_format: str = "text") -> str:
        """
        Synchronous wrapper around request execution with retries and timeout handling.
        """
        if not self.api_key:
            raise ValueError("GOOGLE_API_KEY is missing. Please configure it in your environment.")

        attempt = 0
        backoff = 1.5

        while attempt <= ai_config.MAX_RETRIES:
            attempt += 1
            start_time = time.time()
            try:
                extra_args = {}
                if response_format == "json":
                    extra_args["response_format"] = {"type": "json_object"}

                response = self.client.chat.completions.create(
                    model=self.model_name,
                    messages=[
                        {"role": "system", "content": system_instruction},
                        {"role": "user", "content": user_content}
                    ],
                    temperature=ai_config.TEMPERATURE,
                    top_p=ai_config.TOP_P,
                    max_tokens=ai_config.MAX_OUTPUT_TOKENS,
                    timeout=ai_config.TIMEOUT,
                    **extra_args
                )

                duration = time.time() - start_time
                usage = getattr(response, "usage", None)
                tokens_log = f"Tokens: P={usage.prompt_tokens}, C={usage.completion_tokens}" if usage else "Tokens: N/A"

                logger.info(
                    f"GeminiService | Success | Model: {self.model_name} | Duration: {duration:.2f}s | {tokens_log}"
                )
                return response.choices[0].message.content or ""

            except Exception as e:
                duration = time.time() - start_time
                logger.warning(
                    f"GeminiService | Attempt {attempt} failed | Error: {e} | Duration: {duration:.2f}s"
                )
                if attempt > ai_config.MAX_RETRIES:
                    logger.error("GeminiService | All retry attempts exhausted.")
                    raise e
                time.sleep(backoff)
                backoff *= 2

        return ""

    async def _execute_async_with_retry(self, system_instruction: str, user_content: str, response_format: str = "text") -> str:
        """
        Asynchronous requests execution with retries and timeout handling.
        """
        if not self.api_key:
            raise ValueError("GOOGLE_API_KEY is missing. Please configure it in your environment.")

        attempt = 0
        backoff = 1.5

        while attempt <= ai_config.MAX_RETRIES:
            attempt += 1
            start_time = time.time()
            try:
                extra_args = {}
                if response_format == "json":
                    extra_args["response_format"] = {"type": "json_object"}

                response = await self.async_client.chat.completions.create(
                    model=self.model_name,
                    messages=[
                        {"role": "system", "content": system_instruction},
                        {"role": "user", "content": user_content}
                    ],
                    temperature=ai_config.TEMPERATURE,
                    top_p=ai_config.TOP_P,
                    max_tokens=ai_config.MAX_OUTPUT_TOKENS,
                    timeout=ai_config.TIMEOUT,
                    **extra_args
                )

                duration = time.time() - start_time
                usage = getattr(response, "usage", None)
                tokens_log = f"Tokens: P={usage.prompt_tokens}, C={usage.completion_tokens}" if usage else "Tokens: N/A"

                logger.info(
                    f"GeminiService (Async) | Success | Model: {self.model_name} | Duration: {duration:.2f}s | {tokens_log}"
                )
                return response.choices[0].message.content or ""

            except Exception as e:
                duration = time.time() - start_time
                logger.warning(
                    f"GeminiService (Async) | Attempt {attempt} failed | Error: {e} | Duration: {duration:.2f}s"
                )
                if attempt > ai_config.MAX_RETRIES:
                    logger.error("GeminiService (Async) | All retry attempts exhausted.")
                    raise e
                await asyncio.sleep(backoff)
                backoff *= 2

        return ""

    def _parse_json(self, raw_text: str) -> Dict[str, Any]:
        """ Helper to clean and parse JSON response from LLM """
        raw_text = raw_text.strip()
        try:
            return json.loads(raw_text)
        except Exception:
            pass

        # Try to locate JSON bounds
        start_idx = raw_text.find('{')
        end_idx = raw_text.rfind('}')
        if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
            json_str = raw_text[start_idx:end_idx + 1]
            try:
                return json.loads(json_str)
            except Exception:
                pass

        # Strip markdown fences
        if "```" in raw_text:
            parts = raw_text.split("```")
            for part in parts:
                clean_part = part.strip()
                if clean_part.startswith("json"):
                    clean_part = clean_part[4:].strip()
                if clean_part.startswith("{") and clean_part.endswith("}"):
                    try:
                        return json.loads(clean_part)
                    except Exception:
                        pass
        raise ValueError(f"Failed to parse text as JSON: {raw_text[:200]}")

    def extract_meeting_insights(self, transcript: str) -> Dict[str, Any]:
        """
        Centralized method to perform a single call to Gemini to extract all structured insights.
        Avoids making duplicate Gemini API calls.
        """
        if not transcript:
            return self._get_ultimate_fallback_data()

        system_prompt = (
            "You are an expert project manager and software architect AI.\n"
            "Analyze the meeting transcript and output a JSON dictionary containing:\n"
            "- executive_summary: (string) A comprehensive paragraph summarizing the main goals, discussion flow, and results.\n"
            "- one_minute_read: (list of strings) Exactly 3-5 key bullet point highlights.\n"
            "- sentiment_summary: (string) Cohesive assessment of meeting mood, tone, and collaboration dynamics.\n"
            "- decisions: (list of dicts) Each with keys: decision_text, rationale, confidence_score.\n"
            "- action_items: (list of dicts) Each with keys: description, assigned_to, priority, confidence_score.\n"
            "- risks: (list of dicts) Each with keys: risk_text, mitigation, severity.\n"
            "- questions: (list of strings) Unresolved questions raised during the session.\n"
            "- agenda_items: (list of dicts) Time-sequenced topics discussed. Keys: topic, start_time (seconds), end_time (seconds), summary.\n"
            "- technical_context: (dict) Structured code mentions with keys: repositories (list), files (list), apis (list), database_tables (list), services (list), libraries (list).\n\n"
            "CRITICAL: Output ONLY valid raw JSON. Do not include markdown wraps or conversational text. Return a clean, parsable JSON."
        )

        try:
            raw_response = self._execute_with_retry(system_prompt, f"Transcript:\n{transcript}", response_format="json")
            parsed_data = self._parse_json(raw_response)
            return parsed_data
        except Exception as e:
            logger.error(f"GeminiService | extract_meeting_insights failed: {e}")
            return self._get_ultimate_fallback_data()

    # Reusable interfaces requested by architecture

    def generate_summary(self, transcript: str) -> Dict[str, Any]:
        """Extracts summary elements (Executive Summary, One Minute Read, Sentiment)"""
        system_instruction = SUMMARY_SYSTEM_INSTRUCTION + "\nReturn ONLY a JSON with keys: executive_summary, one_minute_read, sentiment_summary."
        try:
            res = self._execute_with_retry(system_instruction, transcript, response_format="json")
            return self._parse_json(res)
        except Exception as e:
            logger.error(f"GeminiService | generate_summary failed: {e}")
            return {"executive_summary": "", "one_minute_read": [], "sentiment_summary": ""}

    def generate_action_items(self, transcript: str) -> List[Dict[str, Any]]:
        """Extracts Action Items"""
        system_instruction = ACTION_ITEM_SYSTEM_INSTRUCTION + "\nReturn ONLY a JSON list of objects under key 'action_items'."
        try:
            res = self._execute_with_retry(system_instruction, transcript, response_format="json")
            return self._parse_json(res).get("action_items", [])
        except Exception as e:
            logger.error(f"GeminiService | generate_action_items failed: {e}")
            return []

    def generate_decisions(self, transcript: str) -> List[Dict[str, Any]]:
        """Extracts Decisions"""
        system_instruction = DECISION_SYSTEM_INSTRUCTION + "\nReturn ONLY a JSON list of objects under key 'decisions'."
        try:
            res = self._execute_with_retry(system_instruction, transcript, response_format="json")
            return self._parse_json(res).get("decisions", [])
        except Exception as e:
            logger.error(f"GeminiService | generate_decisions failed: {e}")
            return []

    def generate_risks(self, transcript: str) -> List[Dict[str, Any]]:
        """Extracts Risks"""
        system_instruction = RISK_SYSTEM_INSTRUCTION + "\nReturn ONLY a JSON list of objects under key 'risks'."
        try:
            res = self._execute_with_retry(system_instruction, transcript, response_format="json")
            return self._parse_json(res).get("risks", [])
        except Exception as e:
            logger.error(f"GeminiService | generate_risks failed: {e}")
            return []

    def generate_timeline(self, transcript: str) -> List[Dict[str, Any]]:
        """Generates Timeline/Agenda items"""
        system_instruction = TIMELINE_SYSTEM_INSTRUCTION + "\nReturn ONLY a JSON list of objects under key 'agenda_items'."
        try:
            res = self._execute_with_retry(system_instruction, transcript, response_format="json")
            return self._parse_json(res).get("agenda_items", [])
        except Exception as e:
            logger.error(f"GeminiService | generate_timeline failed: {e}")
            return []

    def generate_chat_response(
        self,
        question: str,
        context: str,
        chat_history: List[Dict[str, str]] = None,
        system_prompt: str = None,
    ) -> str:
        """
        Generates chat completion response using context, history, and CHAT_SYSTEM_INSTRUCTION.
        """
        instruction = system_prompt or CHAT_SYSTEM_INSTRUCTION
        messages = [
            {"role": "system", "content": f"{instruction}\n\nContext:\n{context}"}
        ]

        if chat_history:
            for msg in chat_history:
                role = "assistant" if msg.get("role") == "assistant" else "user"
                content = msg.get("text") or msg.get("content") or ""
                if content:
                    messages.append({"role": role, "content": content})

        messages.append({"role": "user", "content": question})

        try:
            response = self.client.chat.completions.create(
                model=self.model_name,
                messages=messages,
                temperature=ai_config.TEMPERATURE,
                timeout=ai_config.TIMEOUT
            )
            return response.choices[0].message.content or ""
        except Exception as e:
            logger.error(f"GeminiService | generate_chat_response failed: {e}")
            return "I apologize, but I encountered an error communicating with Gemini."

    def generate_chat_response_stream(
        self,
        question: str,
        context: str,
        chat_history: List[Dict[str, str]] = None,
        system_prompt: str = None,
    ) -> Generator[str, None, None]:
        """
        Yields tokens for streaming chat responses.
        """
        instruction = system_prompt or CHAT_SYSTEM_INSTRUCTION
        messages = [
            {"role": "system", "content": f"{instruction}\n\nContext:\n{context}"}
        ]

        if chat_history:
            for msg in chat_history:
                role = "assistant" if msg.get("role") == "assistant" else "user"
                content = msg.get("text") or msg.get("content") or ""
                if content:
                    messages.append({"role": role, "content": content})

        messages.append({"role": "user", "content": question})

        try:
            response = self.client.chat.completions.create(
                model=self.model_name,
                messages=messages,
                temperature=ai_config.TEMPERATURE,
                timeout=ai_config.TIMEOUT,
                stream=True
            )
            for chunk in response:
                if chunk.choices and len(chunk.choices) > 0:
                    delta = chunk.choices[0].delta
                    if delta and delta.content:
                        yield delta.content
        except Exception as e:
            logger.error(f"GeminiService | generate_chat_response_stream failed: {e}")
            yield "I apologize, but I encountered an error communicating with Gemini."

    def generate_follow_up_questions(self, transcript: str) -> List[str]:
        """Extracts follow-up questions or suggested questions based on transcript"""
        system_instruction = "Analyze the meeting transcript and suggest 3-4 interesting follow-up questions that team members might want to ask. Return ONLY a JSON list of strings under key 'suggested_questions'."
        try:
            res = self._execute_with_retry(system_instruction, transcript, response_format="json")
            return self._parse_json(res).get("suggested_questions", [])
        except Exception as e:
            logger.error(f"GeminiService | generate_follow_up_questions failed: {e}")
            return []

    def generate_knowledge_graph(self, transcript: str) -> Dict[str, Any]:
        """Generates Knowledge Graph nodes and edges"""
        system_instruction = KNOWLEDGE_GRAPH_SYSTEM_INSTRUCTION + "\nReturn ONLY a JSON with keys: nodes (list of dicts with entity_type, name, description) and edges (list of dicts with source, target, relationship_type)."
        try:
            res = self._execute_with_retry(system_instruction, transcript, response_format="json")
            return self._parse_json(res)
        except Exception as e:
            logger.error(f"GeminiService | generate_knowledge_graph failed: {e}")
            return {"nodes": [], "edges": []}

    def extract_entities(self, transcript: str) -> Dict[str, Any]:
        """Extracts technical context (repositories, files, database tables, etc.)"""
        system_instruction = TECHNICAL_SYSTEM_INSTRUCTION + "\nReturn ONLY a JSON object matching the keys: repositories, files, apis, database_tables, services, libraries."
        try:
            res = self._execute_with_retry(system_instruction, transcript, response_format="json")
            return self._parse_json(res)
        except Exception as e:
            logger.error(f"GeminiService | extract_entities failed: {e}")
            return {
                "repositories": [],
                "files": [],
                "apis": [],
                "database_tables": [],
                "services": [],
                "libraries": [],
            }

    def generate_title(self, question: str) -> str:
        """Generates chat session title based on first query"""
        system_instruction = (
            "Generate an extremely concise 2-4 word title for a chat session based on the user's question. "
            "Return ONLY the plain title without any quotes, surrounding text, or punctuation."
        )
        try:
            res = self._execute_with_retry(system_instruction, question)
            return res.strip().strip('"').strip("'").rstrip(".")
        except Exception as e:
            logger.error(f"GeminiService | generate_title failed: {e}")
            return "New Chat"

    def diarize_transcript(self, segments: List[Dict[str, Any]], known_users: List[str] = None) -> Dict[str, Any]:
        """
        Uses Gemini to map Whisper speaker tags (e.g. SPEAKER_00) to real names.
        """
        if not segments:
            return {"speakers": {}, "segment_speakers": []}

        # Build samples
        speaker_samples: Dict[str, List[str]] = {}
        for seg in segments:
            tag = seg.get("speaker_tag", "SPEAKER_00")
            if tag not in speaker_samples:
                speaker_samples[tag] = []
            if len(speaker_samples[tag]) < 3:
                speaker_samples[tag].append(seg["text"].strip())

        sample_text = ""
        for tag, utterances in speaker_samples.items():
            sample_text += f"\n{tag}:\n"
            for utt in utterances:
                sample_text += f"  - \"{utt}\"\n"

        known_users_str = ", ".join(known_users) if known_users else "None"

        system_prompt = (
            "You are an expert meeting transcription assistant.\n"
            "Below are sample utterances from each detected speaker in a meeting transcript.\n"
            f"Known organization members: {known_users_str}.\n"
            "Your task: identify the real name of each speaker based on what they say, how they introduce themselves, and context clues.\n"
            "Map each speaker tag to their most likely real name. If you cannot determine their name, use a readable label like 'Presenter', 'Participant 1', etc.\n\n"
            "Output ONLY a JSON object with a single key 'speakers' mapping each speaker tag to their name.\n"
            "Example: {\"speakers\": {\"SPEAKER_00\": \"Alice Johnson\", \"SPEAKER_01\": \"Bob Smith\"}}\n"
            "CRITICAL: Output ONLY valid raw JSON. No markdown, no extra text."
        )

        user_content = f"Speaker samples:\n{sample_text}"

        try:
            res = self._execute_with_retry(system_prompt, user_content, response_format="json")
            parsed = self._parse_json(res)
            speakers = parsed.get("speakers", {})
            if not isinstance(speakers, dict):
                speakers = {}
            return {"speakers": speakers, "segment_speakers": []}
        except Exception as e:
            logger.error(f"GeminiService | Diarization failed: {e}")
            return {"speakers": {}, "segment_speakers": []}

    def _get_ultimate_fallback_data(self) -> Dict[str, Any]:
        return {
            "summary": "",
            "executive_summary": "",
            "one_minute_read": [],
            "sentiment_summary": "",
            "decisions": [],
            "action_items": [],
            "risks": [],
            "questions": [],
            "agenda_items": [],
            "technical_context": {
                "repositories": [],
                "files": [],
                "apis": [],
                "database_tables": [],
                "services": [],
                "libraries": [],
            },
            "status": "Gemini service temporarily unavailable",
        }
