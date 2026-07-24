import os
import logging
import time
import asyncio
from typing import Dict, Any, Optional
from openai import (
    OpenAI,
    AsyncOpenAI,
    OpenAIError,
    APIConnectionError,
    APITimeoutError,
    RateLimitError,
    AuthenticationError,
    BadRequestError,
)

logger = logging.getLogger(__name__)


class LLMProvider:
    def __init__(
        self,
        provider_name: str,
        model_name: str,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        extra_headers: Optional[Dict[str, str]] = None,
    ):
        self.provider_name = provider_name
        self.model_name = model_name
        self.api_key = api_key
        self.base_url = base_url
        self.extra_headers = extra_headers or {}

        logger.info(
            f"Initializing {self.provider_name.capitalize()} client. Using model: {self.model_name}"
        )

        self.models = [model_name]
        self.client = OpenAI(
            api_key=self.api_key or "mock-key",
            base_url=self.base_url,
            default_headers=self.extra_headers,
        )
        self.async_client = AsyncOpenAI(
            api_key=self.api_key or "mock-key",
            base_url=self.base_url,
            default_headers=self.extra_headers,
        )

    def generate_completion(
        self,
        messages: list,
        temperature: float = 0.0,
        max_retries: int = 3,
        **extra_args,
    ) -> Any:
        """
        Generates a chat completion, automatically cascading through the self.models list
        if a failure occurs.
        """
        last_exception = None
        for idx, model in enumerate(self.models):
            logger.info(
                f"LLMProvider | Attempting completion with model '{model}' (Cascade step {idx+1}/{len(self.models)})"
            )
            try:
                start_time = time.time()
                response = execute_with_retry(
                    self.client.chat.completions.create,
                    max_retries=max_retries,
                    model=model,
                    messages=messages,
                    temperature=temperature,
                    **extra_args,
                )
                latency = time.time() - start_time
                self.model_name = model

                # Log usage
                try:
                    usage = getattr(response, "usage", None)
                    p_tok = usage.prompt_tokens if usage else None
                    c_tok = usage.completion_tokens if usage else None
                    from app.services.llm.tracker import log_llm_usage

                    log_llm_usage(
                        provider=self.provider_name,
                        model_name=model,
                        prompt_tokens=p_tok,
                        completion_tokens=c_tok,
                        latency_seconds=latency,
                    )
                except Exception as ex:
                    logger.warning(f"Failed to log usage in generate_completion: {ex}")

                return response
            except Exception as e:
                logger.warning(
                    f"LLMProvider | Model '{model}' failed: {e}. Trying next model in cascade..."
                )
                last_exception = e

        logger.error("LLMProvider | All models in cascade failed.")
        if last_exception is None:
            raise RuntimeError("All models in cascade failed.")
        raise last_exception

    def generate_completion_stream(
        self,
        messages: list,
        temperature: float = 0.0,
        max_retries: int = 3,
        **extra_args,
    ) -> Any:
        """
        Generates a streaming completion, automatically cascading through the self.models list
        if the initial request fails.
        """
        last_exception = None
        for idx, model in enumerate(self.models):
            logger.info(
                f"LLMProvider | Attempting streaming completion with model '{model}' (Cascade step {idx+1}/{len(self.models)})"
            )
            try:
                start_time = time.time()
                stream = execute_with_retry(
                    self.client.chat.completions.create,
                    max_retries=max_retries,
                    model=model,
                    messages=messages,
                    temperature=temperature,
                    stream=True,
                    **extra_args,
                )
                self.model_name = model

                def stream_wrapper(stream_obj, model_used, start_time_val):
                    # Fallback token estimates based on characters
                    p_chars = sum(
                        len(m.get("content", ""))
                        for m in messages
                        if isinstance(m, dict)
                    )
                    prompt_tokens_estimated = int(p_chars / 4) if p_chars > 0 else 0
                    completion_tokens_count = 0
                    try:
                        for chunk in stream_obj:
                            usage = getattr(chunk, "usage", None)
                            if usage:
                                prompt_tokens_estimated = usage.prompt_tokens
                                completion_tokens_count = usage.completion_tokens
                            else:
                                choices = getattr(chunk, "choices", [])
                                if choices:
                                    delta = getattr(choices[0], "delta", None)
                                    content = getattr(delta, "content", None)
                                    if content:
                                        # Standard rough token estimation: ~1.3 tokens per word
                                        completion_tokens_count += (
                                            int(len(content.split()) * 1.3) or 1
                                        )
                            yield chunk
                    finally:
                        latency = time.time() - start_time_val
                        try:
                            from app.services.llm.tracker import log_llm_usage

                            log_llm_usage(
                                provider=self.provider_name,
                                model_name=model_used,
                                prompt_tokens=prompt_tokens_estimated,
                                completion_tokens=completion_tokens_count,
                                latency_seconds=latency,
                            )
                        except Exception as ex:
                            logger.warning(
                                f"Failed to log usage in generate_completion_stream wrapper: {ex}"
                            )

                return stream_wrapper(stream, model, start_time)
            except Exception as e:
                logger.warning(
                    f"LLMProvider | Streaming with model '{model}' failed: {e}. Trying next model in cascade..."
                )
                last_exception = e

        logger.error("LLMProvider | All models in streaming cascade failed.")
        if last_exception is None:
            raise RuntimeError("All models in streaming cascade failed.")
        raise last_exception

    async def generate_async_completion(
        self,
        messages: list,
        temperature: float = 0.0,
        max_retries: int = 3,
        **extra_args,
    ) -> Any:
        """
        Generates an async chat completion, automatically cascading through self.models.
        """
        last_exception = None
        for idx, model in enumerate(self.models):
            logger.info(
                f"LLMProvider | Attempting async completion with model '{model}' (Cascade step {idx+1}/{len(self.models)})"
            )
            try:
                start_time = time.time()
                response = await execute_async_with_retry(
                    self.async_client.chat.completions.create,
                    max_retries=max_retries,
                    model=model,
                    messages=messages,
                    temperature=temperature,
                    **extra_args,
                )
                latency = time.time() - start_time
                self.model_name = model

                # Log usage
                try:
                    usage = getattr(response, "usage", None)
                    p_tok = usage.prompt_tokens if usage else None
                    c_tok = usage.completion_tokens if usage else None
                    from app.services.llm.tracker import log_llm_usage

                    log_llm_usage(
                        provider=self.provider_name,
                        model_name=model,
                        prompt_tokens=p_tok,
                        completion_tokens=c_tok,
                        latency_seconds=latency,
                    )
                except Exception as ex:
                    logger.warning(
                        f"Failed to log usage in generate_async_completion: {ex}"
                    )

                return response
            except Exception as e:
                logger.warning(
                    f"LLMProvider | Async model '{model}' failed: {e}. Trying next model in cascade..."
                )
                last_exception = e

        logger.error("LLMProvider | All async models in cascade failed.")
        if last_exception is None:
            raise RuntimeError("All async models in cascade failed.")
        raise last_exception

    def validate(self) -> None:
        """Validate if the required configuration (like API keys) is set."""
        pass


def execute_with_retry(
    func, max_retries=3, initial_delay=1.0, backoff_factor=2.0, *args, **kwargs
):
    """
    Executes a function (usually OpenAI chat completions) with exponential backoff for transient failures.
    Catches specific OpenAI error types and logs descriptive, helpful messages.
    """
    delay = initial_delay
    last_exception = None

    for attempt in range(1, max_retries + 1):
        try:
            return func(*args, **kwargs)
        except AuthenticationError as e:
            logger.error(
                f"LLM Client Authentication Error: Please check your API key. Details: {e}"
            )
            raise e
        except BadRequestError as e:
            if "model" in str(e).lower() or "not found" in str(e).lower():
                logger.error(
                    f"LLM Client Model Not Found Error: The selected model is invalid. Details: {e}"
                )
            else:
                logger.error(f"LLM Client Bad Request: {e}")
            raise e
        except RateLimitError as e:
            logger.warning(
                f"LLM Client Rate Limit Error (Attempt {attempt}/{max_retries}): {e}. Retrying in {delay}s..."
            )
            last_exception = e
        except APIConnectionError as e:
            logger.warning(
                f"LLM Client Network Connection Error (Attempt {attempt}/{max_retries}): {e}. Retrying in {delay}s..."
            )
            last_exception = e
        except APITimeoutError as e:
            logger.warning(
                f"LLM Client Timeout Error (Attempt {attempt}/{max_retries}): {e}. Retrying in {delay}s..."
            )
            last_exception = e
        except OpenAIError as e:
            logger.warning(
                f"LLM Client API Status Error (Attempt {attempt}/{max_retries}): {e}. Retrying in {delay}s..."
            )
            last_exception = e
        except Exception as e:
            logger.warning(
                f"LLM Client Unexpected Error (Attempt {attempt}/{max_retries}): {e}. Retrying in {delay}s..."
            )
            last_exception = e

        if attempt < max_retries:
            time.sleep(delay)
            delay *= backoff_factor

    logger.error(
        f"LLM Client: All {max_retries} attempts failed. Last exception: {last_exception}"
    )
    if last_exception is None:
        raise RuntimeError("All attempts failed.")
    raise last_exception


async def execute_async_with_retry(
    func, max_retries=3, initial_delay=1.0, backoff_factor=2.0, *args, **kwargs
):
    """
    Executes an async function with exponential backoff.
    """
    delay = initial_delay
    last_exception = None

    for attempt in range(1, max_retries + 1):
        try:
            return await func(*args, **kwargs)
        except AuthenticationError as e:
            logger.error(
                f"LLM Client Authentication Error: Please check your API key. Details: {e}"
            )
            raise e
        except BadRequestError as e:
            if "model" in str(e).lower() or "not found" in str(e).lower():
                logger.error(
                    f"LLM Client Model Not Found Error: The selected model is invalid. Details: {e}"
                )
            else:
                logger.error(f"LLM Client Bad Request: {e}")
            raise e
        except RateLimitError as e:
            logger.warning(
                f"LLM Client Rate Limit Error (Attempt {attempt}/{max_retries}): {e}. Retrying in {delay}s..."
            )
            last_exception = e
        except APIConnectionError as e:
            logger.warning(
                f"LLM Client Network Connection Error (Attempt {attempt}/{max_retries}): {e}. Retrying in {delay}s..."
            )
            last_exception = e
        except APITimeoutError as e:
            logger.warning(
                f"LLM Client Timeout Error (Attempt {attempt}/{max_retries}): {e}. Retrying in {delay}s..."
            )
            last_exception = e
        except OpenAIError as e:
            logger.warning(
                f"LLM Client API Status Error (Attempt {attempt}/{max_retries}): {e}. Retrying in {delay}s..."
            )
            last_exception = e
        except Exception as e:
            logger.warning(
                f"LLM Client Unexpected Error (Attempt {attempt}/{max_retries}): {e}. Retrying in {delay}s..."
            )
            last_exception = e

        if attempt < max_retries:
            await asyncio.sleep(delay)
            delay *= backoff_factor

    logger.error(
        f"LLM Client: All {max_retries} attempts failed. Last exception: {last_exception}"
    )
    if last_exception is None:
        raise RuntimeError("All attempts failed.")
    raise last_exception
