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
    # Ordered cascade of free OpenRouter models — best first
    OPENROUTER_MODEL_CASCADE = [
        m.strip() for m in os.getenv("OPENROUTER_MODELS", "").split(",") if m.strip()
    ] or [
        "meta-llama/llama-3.3-70b-instruct:free",
        "meta-llama/llama-3-8b-instruct:free",
        "google/gemma-2-9b-it:free",
        "qwen/qwen-2.5-72b-instruct:free",
    ]

    # Ordered cascade of Groq models
    GROQ_MODEL_CASCADE = [
        m.strip() for m in os.getenv("GROQ_MODELS", "").split(",") if m.strip()
    ] or [
        "llama-3.3-70b-versatile",
        "mixtral-8x7b-32768",
        "llama-3.1-8b-instant",
    ]

    def __init__(self):
        self.google_key = ai_config.GOOGLE_API_KEY
        self.groq_key = os.getenv("GROQ_API_KEY", "")
        self.openrouter_key = os.getenv("OPENROUTER_API_KEY", "")

        self._openrouter_model_idx = 0
        self._groq_model_idx = 0

        self.last_prompt_tokens = 0
        self.last_completion_tokens = 0

        # Choose the initial provider based on what keys are configured
        if self.google_key:
            self._setup_provider("gemini")
        elif self.groq_key:
            self._setup_provider("groq")
        elif self.openrouter_key:
            self._setup_provider("openrouter")
        else:
            # Fallback to Gemini if no keys are found (will fail gracefully or use mock)
            self._setup_provider("gemini")

    def _setup_provider(self, provider_name: str):
        """Set up the active LLM provider and initialize the clients using LLMFactory."""
        self.current_provider = provider_name
        self.use_openrouter = provider_name == "openrouter"

        from app.services.llm.factory import LLMFactory

        provider_instance = LLMFactory.get_provider(provider_name)

        self.client = provider_instance.client
        self.async_client = provider_instance.async_client

        if provider_name == "gemini":
            self.api_key = provider_instance.api_key
            self.base_url = provider_instance.base_url
            self.model_name = provider_instance.model_name
        elif provider_name == "groq":
            self.api_key = provider_instance.api_key
            self.base_url = provider_instance.base_url
            self._groq_model_idx = 0
            self.model_name = self.GROQ_MODEL_CASCADE[0]
        elif provider_name == "openrouter":
            self.api_key = provider_instance.api_key
            self.base_url = provider_instance.base_url
            self._openrouter_model_idx = 0
            self.model_name = self.OPENROUTER_MODEL_CASCADE[0]

        logger.info(
            f"GeminiService | Provider set to: {self.current_provider} | Model: {self.model_name}"
        )

    def _openrouter_headers(self) -> dict:
        return {
            "HTTP-Referer": "https://meetingmind.ai",
            "X-Title": "MeetingMind AI",
        }

    def _next_openrouter_model(self) -> bool:
        """Advance to the next model in the cascade. Returns False if exhausted."""
        self._openrouter_model_idx += 1
        if self._openrouter_model_idx < len(self.OPENROUTER_MODEL_CASCADE):
            self.model_name = self.OPENROUTER_MODEL_CASCADE[self._openrouter_model_idx]
            logger.info(
                f"GeminiService | Cascading to next OpenRouter model: {self.model_name}"
            )
            return True
        return False

    def _next_groq_model(self) -> bool:
        """Advance to the next model in the cascade. Returns False if exhausted."""
        self._groq_model_idx += 1
        if self._groq_model_idx < len(self.GROQ_MODEL_CASCADE):
            self.model_name = self.GROQ_MODEL_CASCADE[self._groq_model_idx]
            logger.info(
                f"GeminiService | Cascading to next Groq model: {self.model_name}"
            )
            return True
        return False

    def _build_messages(
        self,
        system_instruction: str,
        user_content: str,
        response_format: str,
    ) -> list:
        """
        For OpenRouter/Groq free/fallback models we embed a strict JSON reminder in the user turn
        instead of using response_format (many free/non-native models reject that parameter).
        """
        if (
            self.current_provider in ("openrouter", "groq")
            and response_format == "json"
        ):
            suffix = (
                "\n\n---\nCRITICAL INSTRUCTION: Your reply must be ONLY a single, valid JSON object. "
                "Do NOT include markdown fences (```json), explanations, or any text outside the JSON. "
                "Start your reply with '{' and end with '}'."
            )
            return [
                {"role": "system", "content": system_instruction},
                {"role": "user", "content": user_content + suffix},
            ]
        return [
            {"role": "system", "content": system_instruction},
            {"role": "user", "content": user_content},
        ]

    def _execute_with_retry(
        self, system_instruction: str, user_content: str, response_format: str = "text"
    ) -> str:
        """
        Synchronous execution with:
        1. Gemini → Groq → OpenRouter dynamic fallback
        2. Model cascades for Groq and OpenRouter
        3. No response_format for non-Gemini models (prompt-based enforcement instead)
        """
        attempt = 0
        backoff = 1.5

        while True:
            attempt += 1
            start_time = time.time()
            try:
                extra_args: dict = {}

                # Only send response_format for Gemini that natively support it
                if response_format == "json" and self.current_provider == "gemini":
                    extra_args["response_format"] = {"type": "json_object"}

                if self.current_provider == "openrouter":
                    extra_args["extra_headers"] = self._openrouter_headers()

                messages = self._build_messages(
                    system_instruction, user_content, response_format
                )

                from app.services.llm.provider import execute_with_retry

                response = execute_with_retry(
                    self.client.chat.completions.create,
                    model=self.model_name,
                    messages=messages,
                    temperature=ai_config.TEMPERATURE,
                    top_p=ai_config.TOP_P,
                    max_tokens=ai_config.MAX_OUTPUT_TOKENS,
                    timeout=ai_config.TIMEOUT,
                    **extra_args,
                )

                duration = time.time() - start_time
                usage = getattr(response, "usage", None)
                if usage:
                    self.last_prompt_tokens += usage.prompt_tokens
                    self.last_completion_tokens += usage.completion_tokens
                tokens_log = (
                    f"Tokens: P={usage.prompt_tokens}, C={usage.completion_tokens}"
                    if usage
                    else "Tokens: N/A"
                )
                logger.info(
                    f"GeminiService | Success | Provider: {self.current_provider} "
                    f"| Model: {self.model_name} | Duration: {duration:.2f}s | {tokens_log}"
                )
                return response.choices[0].message.content or ""

            except Exception as e:
                duration = time.time() - start_time
                logger.warning(
                    f"GeminiService | Attempt {attempt} failed | "
                    f"Provider: {self.current_provider} | Model: {self.model_name} "
                    f"| Error: {e} | Duration: {duration:.2f}s"
                )

                # --- Fallback Chain: gemini -> groq -> openrouter ---
                if self.current_provider == "gemini":
                    if self.groq_key:
                        logger.info(
                            "GeminiService | Falling back from Gemini to Groq..."
                        )
                        self._setup_provider("groq")
                        attempt = 0
                        time.sleep(1.0)
                        continue
                    elif self.openrouter_key:
                        logger.info(
                            "GeminiService | Falling back from Gemini to OpenRouter..."
                        )
                        self._setup_provider("openrouter")
                        attempt = 0
                        time.sleep(1.0)
                        continue

                elif self.current_provider == "groq":
                    if self._next_groq_model():
                        attempt = 0
                        time.sleep(0.5)
                        continue
                    elif self.openrouter_key:
                        logger.info(
                            "GeminiService | Falling back from Groq to OpenRouter..."
                        )
                        self._setup_provider("openrouter")
                        attempt = 0
                        time.sleep(1.0)
                        continue

                elif self.current_provider == "openrouter":
                    if self._next_openrouter_model():
                        attempt = 0
                        time.sleep(0.5)
                        continue

                # All providers and models exhausted
                if attempt > ai_config.MAX_RETRIES:
                    logger.error(
                        "GeminiService | All retry attempts, providers and model cascades exhausted."
                    )
                    raise e

                time.sleep(backoff)
                backoff *= 2

    async def _execute_async_with_retry(
        self, system_instruction: str, user_content: str, response_format: str = "text"
    ) -> str:
        """
        Async version with the same cascade logic.
        """
        attempt = 0
        backoff = 1.5

        while True:
            attempt += 1
            start_time = time.time()
            try:
                extra_args: dict = {}

                if response_format == "json" and self.current_provider == "gemini":
                    extra_args["response_format"] = {"type": "json_object"}

                if self.current_provider == "openrouter":
                    extra_args["extra_headers"] = self._openrouter_headers()

                messages = self._build_messages(
                    system_instruction, user_content, response_format
                )

                from app.services.llm.provider import execute_async_with_retry

                response = await execute_async_with_retry(
                    self.async_client.chat.completions.create,
                    model=self.model_name,
                    messages=messages,
                    temperature=ai_config.TEMPERATURE,
                    top_p=ai_config.TOP_P,
                    max_tokens=ai_config.MAX_OUTPUT_TOKENS,
                    timeout=ai_config.TIMEOUT,
                    **extra_args,
                )

                duration = time.time() - start_time
                usage = getattr(response, "usage", None)
                if usage:
                    self.last_prompt_tokens += usage.prompt_tokens
                    self.last_completion_tokens += usage.completion_tokens
                tokens_log = (
                    f"Tokens: P={usage.prompt_tokens}, C={usage.completion_tokens}"
                    if usage
                    else "Tokens: N/A"
                )
                logger.info(
                    f"GeminiService (Async) | Success | Provider: {self.current_provider} "
                    f"| Model: {self.model_name} | Duration: {duration:.2f}s | {tokens_log}"
                )
                return response.choices[0].message.content or ""

            except Exception as e:
                duration = time.time() - start_time
                logger.warning(
                    f"GeminiService (Async) | Attempt {attempt} failed | "
                    f"Provider: {self.current_provider} | Model: {self.model_name} "
                    f"| Error: {e} | Duration: {duration:.2f}s"
                )

                if self.current_provider == "gemini":
                    if self.groq_key:
                        logger.info(
                            "GeminiService (Async) | Falling back from Gemini to Groq..."
                        )
                        self._setup_provider("groq")
                        attempt = 0
                        await asyncio.sleep(1.0)
                        continue
                    elif self.openrouter_key:
                        logger.info(
                            "GeminiService (Async) | Falling back from Gemini to OpenRouter..."
                        )
                        self._setup_provider("openrouter")
                        attempt = 0
                        await asyncio.sleep(1.0)
                        continue

                elif self.current_provider == "groq":
                    if self._next_groq_model():
                        attempt = 0
                        await asyncio.sleep(0.5)
                        continue
                    elif self.openrouter_key:
                        logger.info(
                            "GeminiService (Async) | Falling back from Groq to OpenRouter..."
                        )
                        self._setup_provider("openrouter")
                        attempt = 0
                        await asyncio.sleep(1.0)
                        continue

                elif self.current_provider == "openrouter":
                    if self._next_openrouter_model():
                        attempt = 0
                        await asyncio.sleep(0.5)
                        continue

                if attempt > ai_config.MAX_RETRIES:
                    logger.error(
                        "GeminiService (Async) | All retry attempts, providers and model cascades exhausted."
                    )
                    raise e

                await asyncio.sleep(backoff)
                backoff *= 2

    def _parse_json(self, raw_text: str) -> Dict[str, Any]:
        """Helper to clean and parse JSON response from LLM"""
        raw_text = raw_text.strip()
        try:
            return json.loads(raw_text)
        except Exception:
            pass

        # Try to locate JSON bounds
        start_idx = raw_text.find("{")
        end_idx = raw_text.rfind("}")
        if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
            json_str = raw_text[start_idx : end_idx + 1]
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

    def _get_insights_system_prompt(self) -> str:
        return (
            "You are an expert project manager and software architect AI.\n"
            "Analyze the meeting transcript and output a JSON dictionary containing the following keys. "
            "CRITICAL: Be highly faithful to the meeting transcript. Do NOT assume, extrapolate, or invent information. "
            'If any specific information is not mentioned in the transcript, you MUST return "Not discussed" for that field, '
            "or an empty list if the field expects a list of objects or strings, instead of hallucinating details.\n\n"
            "JSON Structure to return:\n"
            "{\n"
            '  "meeting_title": "(string) An appropriate, descriptive title for the meeting based on the topics discussed.",\n'
            '  "executive_summary": "(string) A concise, factual, and chronological paragraph summarizing the main goals, discussion flow, and results. Set to \'Not discussed\' if no summary can be made.",\n'
            '  "one_minute_read": ["Exactly 3-5 key bullet point highlights representing actual discussion points."],\n'
            '  "sentiment_summary": "(string) Cohesive assessment of meeting mood, tone, and collaboration dynamics.",\n'
            '  "key_themes": ["Key themes identified during the meeting. ONLY include topics that were discussed multiple times. If none, return an empty list."],\n'
            '  "main_takeaways": ["Key takeaways from the meeting that represent actual discussion. If none, return an empty list."],\n'
            '  "important_quotes": [\n'
            "     {\n"
            '       "quote": "(string) The exact quote text. Choose the most meaningful, important statements instead of random lines.",\n'
            '       "speaker": "(string) The name of the speaker who said it."\n'
            "     }\n"
            "  ],\n"
            '  "decisions": [\n'
            "     {\n"
            '       "decision_text": "(string) The decision that was explicitly agreed upon.",\n'
            '       "rationale": "(string) The rationale discussed for this decision. If not mentioned, set to \'Not discussed\'.",\n'
            '       "confidence_score": (float) Confidence level (0.0 to 1.0) of this extraction.\n'
            "     }\n"
            "  ],\n"
            '  "action_items": [\n'
            "     {\n"
            '       "description": "(string) The task description (Task).",\n'
            '       "assigned_to": "(string) The owner (Owner) of the task. If not explicitly assigned to a participant, set to \'Not discussed\'.",\n'
            '       "priority": "(string) The priority (High, Medium, Low). If not mentioned, set to \'Not discussed\'.",\n'
            '       "deadline": "(string) The deadline or due date for the task. If not discussed, set to \'Not discussed\'.",\n'
            '       "status": "(string) The status of the task (e.g., Pending, In Progress, Blocked). If not discussed, set to \'Pending\'.",\n'
            '       "confidence_score": (float) Confidence level (0.0 to 1.0) of this extraction.\n'
            "     }\n"
            "  ],\n"
            '  "risks": [\n'
            "     {\n"
            '       "risk_text": "(string) A genuine risk explicitly discussed.",\n'
            '       "mitigation": "(string) The mitigation strategy discussed. If not discussed, set to \'Not discussed\'.",\n'
            '       "severity": "(string) Severity of risk (Critical, High, Medium, Low). If not discussed, set to \'Not discussed\'."\n'
            "     }\n"
            "  ],\n"
            '  "questions": ["Unresolved questions raised during the session. If none, return an empty list."],\n'
            '  "agenda_items": [\n'
            "     {\n"
            '       "topic": "(string) Time-sequenced topic discussed.",\n'
            '       "start_time": (int) start time in seconds relative to meeting,\n'
            '       "end_time": (int) end time in seconds relative to meeting,\n'
            '       "summary": "(string) Summary of this topic discussion."\n'
            "     }\n"
            "  ],\n"
            '  "technical_context": {\n'
            '     "architecture": "(string) Technical architecture details discussed. Return \'Not discussed\' if not mentioned.",\n'
            '     "backend": "(string) Backend technical details. Return \'Not discussed\' if not mentioned.",\n'
            '     "frontend": "(string) Frontend technical details. Return \'Not discussed\' if not mentioned.",\n'
            '     "database": "(string) Database details. Return \'Not discussed\' if not mentioned.",\n'
            '     "infrastructure": "(string) Infrastructure details. Return \'Not discussed\' if not mentioned.",\n'
            '     "api": "(string) API details. Return \'Not discussed\' if not mentioned.",\n'
            '     "performance": "(string) Performance aspects mentioned. Return \'Not discussed\' if not mentioned.",\n'
            '     "security": "(string) Security considerations mentioned. Return \'Not discussed\' if not mentioned.",\n'
            '     "deployment": "(string) Deployment details. Return \'Not discussed\' if not mentioned.",\n'
            '     "repositories": [],\n'
            '     "files": [],\n'
            '     "apis": [],\n'
            '     "database_tables": [],\n'
            '     "services": [],\n'
            '     "libraries": []\n'
            "  },\n"
            '  "knowledge_graph": {\n'
            '     "nodes": [\n'
            "        {\n"
            '          "name": "(string) Node name (e.g. Person, Project, Technology, Repositories).",\n'
            '          "entity_type": "(string) Type of entity.",\n'
            '          "description": "(string) Brief description."\n'
            "        }\n"
            "     ],\n"
            '     "edges": [\n'
            "        {\n"
            '          "source_node": "(string) Source node name.",\n'
            '          "target_node": "(string) Target node name.",\n'
            '          "relationship_type": "(string) Relationship type."\n'
            "        }\n"
            "     ]\n"
            "  }\n"
            "}\n\n"
            "CRITICAL RULES:\n"
            "1. Output ONLY a valid JSON. Do not write markdown blocks (```json ... ```) or any extra text. Start directly with '{' and end with '}'.\n"
            '2. Never invent decisions, action items, risks, technical discussions, participants, or timelines. If not explicitly discussed in the meeting, return "Not discussed" or an empty list.\n'
            "3. Executive summary must be chronological and factual.\n"
            "4. Key themes must only represent topics discussed multiple times.\n"
            '5. Action items must only be included if explicitly discussed. If a task has no owner, set owner to "Not assigned" or "Not discussed".'
        )

    def _chunk_and_retrieve_for_insights(self, transcript: str) -> Dict[str, Any]:
        logger.info(
            "GeminiService | Transcript length exceeds threshold. Applying semantic chunking & RAG pipeline."
        )
        chunks = []
        lines = transcript.split("\n")
        current_chunk = []
        current_length = 0
        for line in lines:
            line_len = len(line)
            if current_length + line_len > 8000:
                chunks.append("\n".join(current_chunk))
                overlap_lines = []
                overlap_len = 0
                for ol in reversed(current_chunk):
                    if overlap_len + len(ol) < 1500:
                        overlap_lines.insert(0, ol)
                        overlap_len += len(ol)
                    else:
                        break
                current_chunk = overlap_lines
                current_length = overlap_len
            current_chunk.append(line)
            current_length += line_len
        if current_chunk:
            chunks.append("\n".join(current_chunk))

        logger.info(f"GeminiService | Split transcript into {len(chunks)} chunks.")

        from app.services.embedding_service import EmbeddingService

        emb_service = EmbeddingService()
        chunk_embeddings = []
        for i, chunk in enumerate(chunks):
            try:
                emb = emb_service.generate_embedding(chunk[:1000])
                chunk_embeddings.append(emb)
            except Exception as e:
                logger.warning(f"Error generating embedding for chunk {i}: {e}")
                chunk_embeddings.append([0.0] * 1536)

        def cosine_similarity(v1, v2):
            import math

            dot_product = sum(a * b for a, b in zip(v1, v2))
            magnitude1 = math.sqrt(sum(a * a for a in v1))
            magnitude2 = math.sqrt(sum(b * b for b in v2))
            if magnitude1 == 0 or magnitude2 == 0:
                return 0.0
            return dot_product / (magnitude1 * magnitude2)

        def retrieve_top_chunks(query_text: str, top_n: int = 3) -> str:
            try:
                query_emb = emb_service.generate_embedding(query_text)
                scores = []
                for idx, chunk_emb in enumerate(chunk_embeddings):
                    sim = cosine_similarity(query_emb, chunk_emb)
                    scores.append((sim, idx))
                scores.sort(key=lambda x: x[0], reverse=True)
                selected_indices = [idx for _, idx in scores[:top_n]]
                selected_indices.sort()
                return "\n\n---\n\n".join(chunks[i] for i in selected_indices)
            except Exception as e:
                logger.error(f"Error in retrieve_top_chunks: {e}")
                return "\n\n".join(chunks[:top_n])

        summary_context = retrieve_top_chunks(
            "overall meeting summary, key themes, main takeaways, project status, overview",
            top_n=3,
        )
        actions_context = retrieve_top_chunks(
            "action items, tasks, responsibilities, assignments, next steps, todos, decisions, agreements, consensus",
            top_n=3,
        )
        risks_context = retrieve_top_chunks(
            "risks, issues, blockages, problems, concerns, mitigations, severity",
            top_n=3,
        )
        technical_context = retrieve_top_chunks(
            "technical analysis, architecture, backend, frontend, database, infrastructure, deployment, api services, libraries",
            top_n=3,
        )

        system_prompt = self._get_insights_system_prompt()

        # Step A: Get Summary and General Insights
        logger.info("GeminiService | Extracting meeting summary context...")
        summary_res = self._execute_with_retry(
            system_prompt
            + "\nCRITICAL: Extract only the keys: meeting_title, executive_summary, one_minute_read, sentiment_summary, key_themes, main_takeaways, agenda_items, knowledge_graph.",
            f"Transcript Context:\n{summary_context}",
            response_format="json",
        )
        logger.info("AI generated | Stage: Summary context")
        summary_data = self._parse_json(summary_res)
        logger.info("AI parsed | Stage: Summary context")

        # Step B: Get Actions & Decisions
        logger.info("GeminiService | Extracting actions and decisions context...")
        actions_res = self._execute_with_retry(
            system_prompt
            + "\nCRITICAL: Extract only the keys: action_items, decisions, questions.",
            f"Transcript Context:\n{actions_context}",
            response_format="json",
        )
        logger.info("AI generated | Stage: Actions & Decisions")
        actions_data = self._parse_json(actions_res)
        logger.info("AI parsed | Stage: Actions & Decisions")

        # Step C: Get Risks
        logger.info("GeminiService | Extracting risks context...")
        risks_res = self._execute_with_retry(
            system_prompt + "\nCRITICAL: Extract only the keys: risks.",
            f"Transcript Context:\n{risks_context}",
            response_format="json",
        )
        logger.info("AI generated | Stage: Risks")
        risks_data = self._parse_json(risks_res)
        logger.info("AI parsed | Stage: Risks")

        # Step D: Get Technical Context and Quotes
        logger.info("GeminiService | Extracting technical context and quotes...")
        tech_res = self._execute_with_retry(
            system_prompt
            + "\nCRITICAL: Extract only the keys: technical_context, important_quotes.",
            f"Transcript Context:\n{technical_context}",
            response_format="json",
        )
        logger.info("AI generated | Stage: Technical & Quotes")
        tech_data = self._parse_json(tech_res)
        logger.info("AI parsed | Stage: Technical & Quotes")

        merged_insights = {
            "meeting_title": summary_data.get("meeting_title", "Meeting Analysis"),
            "executive_summary": summary_data.get("executive_summary", ""),
            "one_minute_read": summary_data.get("one_minute_read", []),
            "sentiment_summary": summary_data.get("sentiment_summary", ""),
            "key_themes": summary_data.get("key_themes", []),
            "main_takeaways": summary_data.get("main_takeaways", []),
            "important_quotes": tech_data.get("important_quotes", []),
            "decisions": actions_data.get("decisions", []),
            "action_items": actions_data.get("action_items", []),
            "risks": risks_data.get("risks", []),
            "questions": actions_data.get("questions", []),
            "agenda_items": summary_data.get("agenda_items", []),
            "technical_context": tech_data.get("technical_context", {}),
            "knowledge_graph": summary_data.get(
                "knowledge_graph", {"nodes": [], "edges": []}
            ),
        }
        return merged_insights

    def extract_meeting_insights(self, transcript: str) -> Dict[str, Any]:
        """
        Centralized method to perform a single call to Gemini to extract all structured insights.
        Avoids making duplicate Gemini API calls.
        """
        self.last_prompt_tokens = 0
        self.last_completion_tokens = 0
        if not transcript:
            return self._get_ultimate_fallback_data(transcript)

        if len(transcript) > 30000:
            return self._chunk_and_retrieve_for_insights(transcript)

        system_prompt = self._get_insights_system_prompt()

        try:
            raw_response = self._execute_with_retry(
                system_prompt, f"Transcript:\n{transcript}", response_format="json"
            )
            logger.info("AI generated")
            parsed_data = self._parse_json(raw_response)
            logger.info("AI parsed")
            return parsed_data
        except Exception as e:
            logger.error(f"GeminiService | extract_meeting_insights failed: {e}")
            return self._get_ultimate_fallback_data(transcript)

    # Reusable interfaces requested by architecture

    def generate_summary(self, transcript: str) -> Dict[str, Any]:
        """Extracts summary elements (Executive Summary, One Minute Read, Sentiment)"""
        system_instruction = (
            SUMMARY_SYSTEM_INSTRUCTION
            + "\nReturn ONLY a JSON with keys: executive_summary, one_minute_read, sentiment_summary."
        )
        try:
            res = self._execute_with_retry(
                system_instruction, transcript, response_format="json"
            )
            return self._parse_json(res)
        except Exception as e:
            logger.error(f"GeminiService | generate_summary failed: {e}")
            return {
                "executive_summary": "",
                "one_minute_read": [],
                "sentiment_summary": "",
            }

    def generate_action_items(self, transcript: str) -> List[Dict[str, Any]]:
        """Extracts Action Items"""
        system_instruction = (
            ACTION_ITEM_SYSTEM_INSTRUCTION
            + "\nReturn ONLY a JSON list of objects under key 'action_items'."
        )
        try:
            res = self._execute_with_retry(
                system_instruction, transcript, response_format="json"
            )
            return self._parse_json(res).get("action_items", [])
        except Exception as e:
            logger.error(f"GeminiService | generate_action_items failed: {e}")
            return []

    def generate_decisions(self, transcript: str) -> List[Dict[str, Any]]:
        """Extracts Decisions"""
        system_instruction = (
            DECISION_SYSTEM_INSTRUCTION
            + "\nReturn ONLY a JSON list of objects under key 'decisions'."
        )
        try:
            res = self._execute_with_retry(
                system_instruction, transcript, response_format="json"
            )
            return self._parse_json(res).get("decisions", [])
        except Exception as e:
            logger.error(f"GeminiService | generate_decisions failed: {e}")
            return []

    def generate_risks(self, transcript: str) -> List[Dict[str, Any]]:
        """Extracts Risks"""
        system_instruction = (
            RISK_SYSTEM_INSTRUCTION
            + "\nReturn ONLY a JSON list of objects under key 'risks'."
        )
        try:
            res = self._execute_with_retry(
                system_instruction, transcript, response_format="json"
            )
            return self._parse_json(res).get("risks", [])
        except Exception as e:
            logger.error(f"GeminiService | generate_risks failed: {e}")
            return []

    def generate_timeline(self, transcript: str) -> List[Dict[str, Any]]:
        """Generates Timeline/Agenda items"""
        system_instruction = (
            TIMELINE_SYSTEM_INSTRUCTION
            + "\nReturn ONLY a JSON list of objects under key 'agenda_items'."
        )
        try:
            res = self._execute_with_retry(
                system_instruction, transcript, response_format="json"
            )
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
        Includes robust fallback cascades (Gemini -> Groq -> OpenRouter) and retries.
        """
        instruction = system_prompt or CHAT_SYSTEM_INSTRUCTION
        attempt = 0
        backoff = 1.0

        while True:
            attempt += 1
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
                extra_args = {}
                if self.current_provider == "openrouter":
                    extra_args["extra_headers"] = self._openrouter_headers()

                response = self.client.chat.completions.create(
                    model=self.model_name,
                    messages=messages,
                    temperature=ai_config.TEMPERATURE,
                    timeout=ai_config.TIMEOUT,
                    **extra_args,
                )
                return response.choices[0].message.content or ""
            except Exception as e:
                logger.warning(
                    f"GeminiService | Chat attempt {attempt} failed | "
                    f"Provider: {self.current_provider} | Model: {self.model_name} | Error: {e}"
                )

                if self.current_provider == "gemini":
                    if self.groq_key:
                        logger.info(
                            "GeminiService | Falling back from Gemini to Groq for chat..."
                        )
                        self._setup_provider("groq")
                        attempt = 0
                        time.sleep(1.0)
                        continue
                    elif self.openrouter_key:
                        logger.info(
                            "GeminiService | Falling back from Gemini to OpenRouter for chat..."
                        )
                        self._setup_provider("openrouter")
                        attempt = 0
                        time.sleep(1.0)
                        continue
                elif self.current_provider == "groq":
                    if self._next_groq_model():
                        attempt = 0
                        time.sleep(0.5)
                        continue
                    elif self.openrouter_key:
                        logger.info(
                            "GeminiService | Falling back from Groq to OpenRouter for chat..."
                        )
                        self._setup_provider("openrouter")
                        attempt = 0
                        time.sleep(1.0)
                        continue
                elif self.current_provider == "openrouter":
                    if self._next_openrouter_model():
                        attempt = 0
                        time.sleep(0.5)
                        continue

                if attempt > ai_config.MAX_RETRIES:
                    logger.error("GeminiService | All chat retry providers exhausted.")
                    return (
                        "Using backup AI model... I encountered an issue communicating with the primary AI model. Here is a backup summary of context: "
                        + context[:200]
                        + "..."
                    )

                time.sleep(backoff)
                backoff *= 1.5

    def generate_chat_response_stream(
        self,
        question: str,
        context: str,
        chat_history: List[Dict[str, str]] = None,
        system_prompt: str = None,
    ) -> Generator[str, None, None]:
        """
        Yields tokens for streaming chat responses. Includes robust fallback cascades.
        """
        instruction = system_prompt or CHAT_SYSTEM_INSTRUCTION
        attempt = 0
        backoff = 1.0
        yielded_any = False

        while True:
            attempt += 1
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
                extra_args = {}
                if self.current_provider == "openrouter":
                    extra_args["extra_headers"] = self._openrouter_headers()

                response = self.client.chat.completions.create(
                    model=self.model_name,
                    messages=messages,
                    temperature=ai_config.TEMPERATURE,
                    timeout=ai_config.TIMEOUT,
                    stream=True,
                    **extra_args,
                )
                for chunk in response:
                    if chunk.choices and len(chunk.choices) > 0:
                        delta = chunk.choices[0].delta
                        if delta and delta.content:
                            yielded_any = True
                            yield delta.content
                break
            except Exception as e:
                logger.warning(
                    f"GeminiService | Chat stream attempt {attempt} failed | "
                    f"Provider: {self.current_provider} | Model: {self.model_name} | Error: {e}"
                )

                if yielded_any:
                    yield "\n\n[Using backup AI model...]\n"
                else:
                    yield "Using backup AI model...\n"

                if self.current_provider == "gemini":
                    if self.groq_key:
                        logger.info(
                            "GeminiService | Falling back from Gemini to Groq for chat stream..."
                        )
                        self._setup_provider("groq")
                        attempt = 0
                        time.sleep(1.0)
                        continue
                    elif self.openrouter_key:
                        logger.info(
                            "GeminiService | Falling back from Gemini to OpenRouter for chat stream..."
                        )
                        self._setup_provider("openrouter")
                        attempt = 0
                        time.sleep(1.0)
                        continue
                elif self.current_provider == "groq":
                    if self._next_groq_model():
                        attempt = 0
                        time.sleep(0.5)
                        continue
                    elif self.openrouter_key:
                        logger.info(
                            "GeminiService | Falling back from Groq to OpenRouter for chat stream..."
                        )
                        self._setup_provider("openrouter")
                        attempt = 0
                        time.sleep(1.0)
                        continue
                elif self.current_provider == "openrouter":
                    if self._next_openrouter_model():
                        attempt = 0
                        time.sleep(0.5)
                        continue

                if attempt > ai_config.MAX_RETRIES:
                    logger.error(
                        "GeminiService | All chat stream retry providers exhausted."
                    )
                    if not yielded_any:
                        yield "I apologize, but I encountered an error communicating with Gemini. The meeting summary: " + context[
                            :200
                        ] + "..."
                    break

                time.sleep(backoff)
                backoff *= 1.5

    def generate_follow_up_questions(self, transcript: str) -> List[str]:
        """Extracts follow-up questions or suggested questions based on transcript"""
        system_instruction = "Analyze the meeting transcript and suggest 3-4 interesting follow-up questions that team members might want to ask. Return ONLY a JSON list of strings under key 'suggested_questions'."
        try:
            res = self._execute_with_retry(
                system_instruction, transcript, response_format="json"
            )
            return self._parse_json(res).get("suggested_questions", [])
        except Exception as e:
            logger.error(f"GeminiService | generate_follow_up_questions failed: {e}")
            return []

    def generate_knowledge_graph(self, transcript: str) -> Dict[str, Any]:
        """Generates Knowledge Graph nodes and edges"""
        system_instruction = (
            KNOWLEDGE_GRAPH_SYSTEM_INSTRUCTION
            + "\nReturn ONLY a JSON with keys: nodes (list of dicts with entity_type, name, description) and edges (list of dicts with source, target, relationship_type)."
        )
        try:
            res = self._execute_with_retry(
                system_instruction, transcript, response_format="json"
            )
            return self._parse_json(res)
        except Exception as e:
            logger.error(f"GeminiService | generate_knowledge_graph failed: {e}")
            return {"nodes": [], "edges": []}

    def extract_entities(self, transcript: str) -> Dict[str, Any]:
        """Extracts technical context (repositories, files, database tables, etc.)"""
        system_instruction = (
            TECHNICAL_SYSTEM_INSTRUCTION
            + "\nReturn ONLY a JSON object matching the keys: repositories, files, apis, database_tables, services, libraries."
        )
        try:
            res = self._execute_with_retry(
                system_instruction, transcript, response_format="json"
            )
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

    def diarize_transcript(
        self, segments: List[Dict[str, Any]], known_users: List[str] = None
    ) -> Dict[str, Any]:
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
                sample_text += f'  - "{utt}"\n'

        known_users_str = ", ".join(known_users) if known_users else "None"

        system_prompt = (
            "You are an expert meeting transcription assistant.\n"
            "Below are sample utterances from each detected speaker in a meeting transcript.\n"
            f"Known organization members: {known_users_str}.\n"
            "Your task: identify the real name of each speaker based on what they say, how they introduce themselves, and context clues.\n"
            "Map each speaker tag to their most likely real name. If you cannot determine their name, use a readable label like 'Presenter', 'Participant 1', etc.\n\n"
            "Output ONLY a JSON object with a single key 'speakers' mapping each speaker tag to their name.\n"
            'Example: {"speakers": {"SPEAKER_00": "Alice Johnson", "SPEAKER_01": "Bob Smith"}}\n'
            "CRITICAL: Output ONLY valid raw JSON. No markdown, no extra text."
        )

        user_content = f"Speaker samples:\n{sample_text}"

        try:
            res = self._execute_with_retry(
                system_prompt, user_content, response_format="json"
            )
            parsed = self._parse_json(res)
            speakers = parsed.get("speakers", {})
            if not isinstance(speakers, dict):
                speakers = {}
            return {"speakers": speakers, "segment_speakers": []}
        except Exception as e:
            logger.error(f"GeminiService | Diarization failed: {e}")
            return {"speakers": {}, "segment_speakers": []}

    def identify_speaker_names(
        self,
        transcript_text: str,
        current_speakers: List[str],
        known_members: List[str] = None,
    ) -> Dict[str, str]:
        """
        Uses LLM to analyze the transcript and map generic speaker names (e.g., 'Speaker 1')
        to their actual real names if they introduce themselves or are referred to.
        """
        if not transcript_text or not current_speakers:
            return {}

        known_str = ", ".join(known_members) if known_members else "None"
        speakers_str = ", ".join(current_speakers)

        system_instruction = (
            "You are an expert meeting transcription assistant.\n"
            "Below is a meeting transcript where speakers are labeled with generic tags (like 'Speaker 1', 'Speaker 2', etc.).\n"
            f"Currently identified generic speakers: {speakers_str}.\n"
            f"Known organization members: {known_str}.\n\n"
            "Your task is to analyze the conversation to identify the real names of the speakers who have these generic tags.\n"
            "Guidelines:\n"
            "1. Look for introductions: e.g., 'Hi, I'm John' or 'This is Alice'.\n"
            "2. Look for addressable context: e.g., 'Speaker 1: Hey Bob' -> 'Speaker 2: Yes?' implies Speaker 2 is Bob.\n"
            "3. If a known organization member name closely matches the identified name, map it to the full name from the known organization members list.\n"
            "4. Only map a speaker if you are highly confident. If not, do not include them in the mapping.\n"
            "5. Return ONLY a JSON object mapping the generic speaker label to their real name.\n"
            "Example output format:\n"
            "{\n"
            '  "Speaker 1": "John Doe",\n'
            '  "Speaker 2": "Alice Smith"\n'
            "}\n"
            "CRITICAL: Output ONLY a valid JSON. Do not include markdown blocks or any other explanation."
        )

        user_content = f"Transcript:\n{transcript_text[:20000]}"

        try:
            res = self._execute_with_retry(
                system_instruction, user_content, response_format="json"
            )
            parsed = self._parse_json(res)
            if isinstance(parsed, dict):
                cleaned = {}
                for k, v in parsed.items():
                    if (
                        k in current_speakers
                        and isinstance(v, str)
                        and v.strip()
                        and v.lower() != "unknown"
                        and "speaker" not in v.lower()
                    ):
                        cleaned[k] = v.strip()
                return cleaned
            return {}
        except Exception as e:
            logger.error(f"GeminiService | identify_speaker_names failed: {e}")
            return {}

    def _get_ultimate_fallback_data(self, transcript: str = "") -> Dict[str, Any]:
        import re

        lines = []
        if transcript:
            lines = [line.strip() for line in transcript.split("\n") if line.strip()]

        speaker_texts = []
        speakers = set()
        for line in lines:
            match = re.match(r"^\[?([^\]\:]+)\]?\s*\:\s*(.+)$", line)
            if match:
                spk, txt = match.groups()
                spk = spk.strip()
                txt = txt.strip()
                speakers.add(spk)
                speaker_texts.append((spk, txt))
            else:
                speaker_texts.append(("Speaker", line))

        full_text = " ".join([txt for _, txt in speaker_texts])
        words = full_text.split()

        title = "Meeting Analysis"
        if len(words) >= 4:
            title = " ".join(words[:4]).rstrip(".,;:!? ")
            title = title.title()

        summary = "Collaborative team session discussing project status, plans, and technical details."
        if len(speaker_texts) >= 3:
            summary = " ".join([txt for _, txt in speaker_texts[:3]])
        elif len(words) > 10:
            summary = " ".join(words[:30]) + "..."

        bullets = [
            "Project status review and alignment on next steps.",
            "Discussion of key tasks, responsibilities, and assignments.",
            "Technical architecture and integration considerations.",
        ]
        if len(speaker_texts) >= 5:
            bullets = []
            for spk, txt in speaker_texts[:4]:
                if len(txt) > 20 and len(bullets) < 4:
                    bullets.append(f"{spk} shared updates on: {txt[:80]}...")
            if not bullets:
                bullets = ["Discussed general project alignment and coordination."]

        sentiment = (
            "Collaborative and productive with active participation from all members."
        )

        themes = ["General Status", "Coordination", "Tasks"]
        tech_keywords = {
            "api": "API Integration",
            "database": "Database Schema",
            "frontend": "Frontend Development",
            "backend": "Backend Optimization",
            "test": "Testing & QA",
            "deploy": "Deployment",
            "git": "Version Control",
        }
        for kw, th in tech_keywords.items():
            if kw in full_text.lower():
                themes.append(th)
        themes = list(set(themes))[:4]

        takeaways = [
            "Ensure core task responsibilities are clearly defined.",
            "Follow up on scheduled milestones and review points.",
        ]
        if len(speaker_texts) > 5:
            takeaways = []
            for spk, txt in speaker_texts:
                if (
                    any(w in txt.lower() for w in ["need to", "must", "should", "will"])
                    and len(takeaways) < 3
                ):
                    takeaways.append(f"{spk}: {txt[:100]}")
            if not takeaways:
                takeaways = ["Maintain focus on core milestones and deliverables."]

        quotes = []
        for spk, txt in speaker_texts:
            if len(txt) > 40 and len(quotes) < 3:
                quotes.append({"quote": txt, "speaker": spk})

        decisions = []
        for spk, txt in speaker_texts:
            if (
                any(w in txt.lower() for w in ["decide", "agree", "resolve", "confirm"])
                and len(decisions) < 3
            ):
                decisions.append(
                    {
                        "decision_text": f"Agreed to: {txt[:100]}",
                        "rationale": f"Proposed by {spk}",
                        "confidence_score": 0.8,
                    }
                )
        if not decisions:
            decisions = [
                {
                    "decision_text": "Agreed to proceed with scheduled project timeline.",
                    "rationale": "Consensus among team members",
                    "confidence_score": 0.75,
                }
            ]

        action_items = []
        for spk, txt in speaker_texts:
            if (
                any(w in txt.lower() for w in ["will do", "assign", "action", "todo"])
                and len(action_items) < 3
            ):
                action_items.append(
                    {
                        "description": txt[:100],
                        "assigned_to": spk,
                        "priority": "Medium",
                        "confidence_score": 0.8,
                    }
                )
        if not action_items:
            action_items = [
                {
                    "description": "Coordinate follow-up meetings and task reviews.",
                    "assigned_to": list(speakers)[0] if speakers else "Unassigned",
                    "priority": "Medium",
                    "confidence_score": 0.7,
                }
            ]

        risks = []
        for spk, txt in speaker_texts:
            if (
                any(
                    w in txt.lower()
                    for w in ["risk", "issue", "block", "problem", "concern"]
                )
                and len(risks) < 3
            ):
                risks.append(
                    {
                        "risk_text": txt[:100],
                        "mitigation": "To be monitored by team",
                        "severity": "Medium",
                    }
                )
        if not risks:
            risks = [
                {
                    "risk_text": "Potential timeline delays due to integration overhead.",
                    "mitigation": "Schedule early alignment sessions",
                    "severity": "Low",
                }
            ]

        questions = []
        for spk, txt in speaker_texts:
            if "?" in txt and len(questions) < 3:
                questions.append(txt)

        agenda_items = [
            {
                "topic": "Status Review",
                "start_time": 0,
                "end_time": 30,
                "summary": "Opening remarks and updates.",
            }
        ]

        tech_context = {
            "repositories": [],
            "files": [],
            "apis": [],
            "database_tables": [],
            "services": [],
            "libraries": [],
        }
        tech_words = re.findall(
            r"\b\w+\.(?:py|js|json|sql|ts|tsx|html|css)\b", full_text.lower()
        )
        if tech_words:
            tech_context["files"] = list(set(tech_words))[:5]

        nodes = []
        for spk in speakers:
            nodes.append(
                {
                    "name": spk,
                    "entity_type": "Person",
                    "description": "Participant in the meeting",
                }
            )
        edges = []
        spk_list = list(speakers)
        if len(spk_list) > 1:
            for i in range(len(spk_list) - 1):
                edges.append(
                    {
                        "source": spk_list[i],
                        "target": spk_list[i + 1],
                        "relationship_type": "Collaborator",
                    }
                )

        return {
            "meeting_title": title,
            "summary": summary,
            "executive_summary": summary,
            "one_minute_read": bullets,
            "sentiment_summary": sentiment,
            "key_themes": themes,
            "main_takeaways": takeaways,
            "important_quotes": quotes,
            "decisions": decisions,
            "action_items": action_items,
            "risks": risks,
            "questions": questions,
            "agenda_items": agenda_items,
            "technical_context": tech_context,
            "knowledge_graph": {
                "nodes": nodes,
                "edges": edges,
            },
            "status": "Fallback local rule-based processing applied",
        }
