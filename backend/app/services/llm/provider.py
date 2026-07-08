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
        extra_headers: Optional[Dict[str, str]] = None
    ):
        self.provider_name = provider_name
        self.model_name = model_name
        self.api_key = api_key
        self.base_url = base_url
        self.extra_headers = extra_headers or {}
        
        logger.info(f"Initializing {self.provider_name.capitalize()} client. Using model: {self.model_name}")
        
        self.models = [model_name]
        self.client = OpenAI(
            api_key=self.api_key or "mock-key",
            base_url=self.base_url,
            default_headers=self.extra_headers
        )
        self.async_client = AsyncOpenAI(
            api_key=self.api_key or "mock-key",
            base_url=self.base_url,
            default_headers=self.extra_headers
        )

    def generate_completion(
        self,
        messages: list,
        temperature: float = 0.0,
        max_retries: int = 3,
        **extra_args
    ) -> Any:
        """
        Generates a chat completion, automatically cascading through the self.models list
        if a failure occurs.
        """
        last_exception = None
        for idx, model in enumerate(self.models):
            logger.info(f"LLMProvider | Attempting completion with model '{model}' (Cascade step {idx+1}/{len(self.models)})")
            try:
                response = execute_with_retry(
                    self.client.chat.completions.create,
                    max_retries=max_retries,
                    model=model,
                    messages=messages,
                    temperature=temperature,
                    **extra_args
                )
                self.model_name = model
                return response
            except Exception as e:
                logger.warning(f"LLMProvider | Model '{model}' failed: {e}. Trying next model in cascade...")
                last_exception = e
                
        logger.error("LLMProvider | All models in cascade failed.")
        raise last_exception

    def generate_completion_stream(
        self,
        messages: list,
        temperature: float = 0.0,
        max_retries: int = 3,
        **extra_args
    ) -> Any:
        """
        Generates a streaming completion, automatically cascading through the self.models list
        if the initial request fails.
        """
        last_exception = None
        for idx, model in enumerate(self.models):
            logger.info(f"LLMProvider | Attempting streaming completion with model '{model}' (Cascade step {idx+1}/{len(self.models)})")
            try:
                stream = execute_with_retry(
                    self.client.chat.completions.create,
                    max_retries=max_retries,
                    model=model,
                    messages=messages,
                    temperature=temperature,
                    stream=True,
                    **extra_args
                )
                self.model_name = model
                return stream
            except Exception as e:
                logger.warning(f"LLMProvider | Streaming with model '{model}' failed: {e}. Trying next model in cascade...")
                last_exception = e
                
        logger.error("LLMProvider | All models in streaming cascade failed.")
        raise last_exception

    async def generate_async_completion(
        self,
        messages: list,
        temperature: float = 0.0,
        max_retries: int = 3,
        **extra_args
    ) -> Any:
        """
        Generates an async chat completion, automatically cascading through self.models.
        """
        last_exception = None
        for idx, model in enumerate(self.models):
            logger.info(f"LLMProvider | Attempting async completion with model '{model}' (Cascade step {idx+1}/{len(self.models)})")
            try:
                response = await execute_async_with_retry(
                    self.async_client.chat.completions.create,
                    max_retries=max_retries,
                    model=model,
                    messages=messages,
                    temperature=temperature,
                    **extra_args
                )
                self.model_name = model
                return response
            except Exception as e:
                logger.warning(f"LLMProvider | Async model '{model}' failed: {e}. Trying next model in cascade...")
                last_exception = e
                
        logger.error("LLMProvider | All async models in cascade failed.")
        raise last_exception

    def validate(self) -> None:
        """Validate if the required configuration (like API keys) is set."""
        pass


def execute_with_retry(func, max_retries=3, initial_delay=1.0, backoff_factor=2.0, *args, **kwargs):
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
            logger.error(f"LLM Client Authentication Error: Please check your API key. Details: {e}")
            raise e
        except BadRequestError as e:
            if "model" in str(e).lower() or "not found" in str(e).lower():
                logger.error(f"LLM Client Model Not Found Error: The selected model is invalid. Details: {e}")
            else:
                logger.error(f"LLM Client Bad Request: {e}")
            raise e
        except RateLimitError as e:
            logger.warning(f"LLM Client Rate Limit Error (Attempt {attempt}/{max_retries}): {e}. Retrying in {delay}s...")
            last_exception = e
        except APIConnectionError as e:
            logger.warning(f"LLM Client Network Connection Error (Attempt {attempt}/{max_retries}): {e}. Retrying in {delay}s...")
            last_exception = e
        except APITimeoutError as e:
            logger.warning(f"LLM Client Timeout Error (Attempt {attempt}/{max_retries}): {e}. Retrying in {delay}s...")
            last_exception = e
        except OpenAIError as e:
            logger.warning(f"LLM Client API Status Error (Attempt {attempt}/{max_retries}): {e}. Retrying in {delay}s...")
            last_exception = e
        except Exception as e:
            logger.warning(f"LLM Client Unexpected Error (Attempt {attempt}/{max_retries}): {e}. Retrying in {delay}s...")
            last_exception = e
            
        if attempt < max_retries:
            time.sleep(delay)
            delay *= backoff_factor
            
    logger.error(f"LLM Client: All {max_retries} attempts failed. Last exception: {last_exception}")
    raise last_exception


async def execute_async_with_retry(func, max_retries=3, initial_delay=1.0, backoff_factor=2.0, *args, **kwargs):
    """
    Executes an async function with exponential backoff.
    """
    delay = initial_delay
    last_exception = None
    
    for attempt in range(1, max_retries + 1):
        try:
            return await func(*args, **kwargs)
        except AuthenticationError as e:
            logger.error(f"LLM Client Authentication Error: Please check your API key. Details: {e}")
            raise e
        except BadRequestError as e:
            if "model" in str(e).lower() or "not found" in str(e).lower():
                logger.error(f"LLM Client Model Not Found Error: The selected model is invalid. Details: {e}")
            else:
                logger.error(f"LLM Client Bad Request: {e}")
            raise e
        except RateLimitError as e:
            logger.warning(f"LLM Client Rate Limit Error (Attempt {attempt}/{max_retries}): {e}. Retrying in {delay}s...")
            last_exception = e
        except APIConnectionError as e:
            logger.warning(f"LLM Client Network Connection Error (Attempt {attempt}/{max_retries}): {e}. Retrying in {delay}s...")
            last_exception = e
        except APITimeoutError as e:
            logger.warning(f"LLM Client Timeout Error (Attempt {attempt}/{max_retries}): {e}. Retrying in {delay}s...")
            last_exception = e
        except OpenAIError as e:
            logger.warning(f"LLM Client API Status Error (Attempt {attempt}/{max_retries}): {e}. Retrying in {delay}s...")
            last_exception = e
        except Exception as e:
            logger.warning(f"LLM Client Unexpected Error (Attempt {attempt}/{max_retries}): {e}. Retrying in {delay}s...")
            last_exception = e
            
        if attempt < max_retries:
            await asyncio.sleep(delay)
            delay *= backoff_factor
            
    logger.error(f"LLM Client: All {max_retries} attempts failed. Last exception: {last_exception}")
    raise last_exception
