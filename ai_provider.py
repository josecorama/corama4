"""
AI Provider Abstraction Layer

This module provides a unified interface for AI model inference,
supporting both OpenAI API and HuggingFace Inference Endpoints.

The provider can be configured via environment variables:
- AI_PROVIDER: 'openai' (default) or 'huggingface'
- HF_INFERENCE_ENDPOINT: URL of the HuggingFace Inference Endpoint
- HF_API_TOKEN: HuggingFace API token for authentication

For specific features, you can override the provider:
- TOP_FIVE_MATCHES_PROVIDER: Provider for Top 5 Matches re-ranking
- AI_ASSISTANT_PROVIDER: Provider for AI Assistant
- CONTRACT_ANALYSIS_PROVIDER: Provider for Contract Analysis
- PROPOSAL_GENERATION_PROVIDER: Provider for Proposal Generation
"""

import os
import json
import logging
import requests
from typing import Optional, List, Dict, Any, Union
from dataclasses import dataclass
from enum import Enum

# Try to import OpenAI, but don't fail if not available
try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False
    OpenAI = None


class AIProvider(Enum):
    OPENAI = "openai"
    HUGGINGFACE = "huggingface"


@dataclass
class ChatMessage:
    """Represents a chat message."""
    role: str  # 'system', 'user', or 'assistant'
    content: str


@dataclass
class ChatCompletion:
    """Represents a chat completion response."""
    content: str
    model: str
    usage: Optional[Dict[str, int]] = None
    raw_response: Optional[Any] = None


class HuggingFaceInferenceClient:
    """Client for HuggingFace Inference Endpoints with OpenAI-compatible API."""
    
    def __init__(self, endpoint_url: str, api_token: Optional[str] = None):
        """
        Initialize the HuggingFace Inference client.
        
        Args:
            endpoint_url: The URL of the HuggingFace Inference Endpoint
            api_token: Optional HuggingFace API token for authentication
        """
        self.endpoint_url = endpoint_url.rstrip('/')
        self.api_token = api_token
        self.logger = logging.getLogger(__name__)
        
        # Check if endpoint supports OpenAI-compatible API
        self.openai_compatible = self._check_openai_compatible()
    
    def _check_openai_compatible(self) -> bool:
        """Check if the endpoint supports OpenAI-compatible API."""
        # Most HF Inference Endpoints with TGI or vLLM support OpenAI-compatible API
        # at /v1/chat/completions
        return True  # Assume compatible, will fall back if not
    
    def _get_headers(self) -> Dict[str, str]:
        """Get request headers."""
        headers = {
            "Content-Type": "application/json"
        }
        if self.api_token:
            headers["Authorization"] = f"Bearer {self.api_token}"
        return headers
    
    def chat_completions_create(
        self,
        messages: List[Dict[str, str]],
        model: str = "tgi",
        temperature: float = 0.7,
        max_tokens: int = 1024,
        top_p: float = 0.95,
        stream: bool = False,
        **kwargs
    ) -> ChatCompletion:
        """
        Create a chat completion using the HuggingFace Inference Endpoint.
        
        This method mimics the OpenAI chat.completions.create() interface.
        
        Args:
            messages: List of message dicts with 'role' and 'content'
            model: Model name (ignored for HF endpoints, uses deployed model)
            temperature: Sampling temperature
            max_tokens: Maximum tokens to generate
            top_p: Top-p sampling parameter
            stream: Whether to stream the response (not yet supported)
            **kwargs: Additional parameters
            
        Returns:
            ChatCompletion object with the response
        """
        if stream:
            self.logger.warning("Streaming not yet supported for HuggingFace endpoints")
        
        # Try OpenAI-compatible endpoint first
        try:
            return self._call_openai_compatible(
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                top_p=top_p,
                **kwargs
            )
        except Exception as e:
            self.logger.warning(f"OpenAI-compatible API failed, trying native API: {e}")
            return self._call_native_api(
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                top_p=top_p,
                **kwargs
            )
    
    def _call_openai_compatible(
        self,
        messages: List[Dict[str, str]],
        temperature: float,
        max_tokens: int,
        top_p: float,
        **kwargs
    ) -> ChatCompletion:
        """Call the OpenAI-compatible endpoint."""
        url = f"{self.endpoint_url}/v1/chat/completions"
        
        payload = {
            "model": "tgi",  # TGI uses this as a placeholder
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "top_p": top_p,
            "stream": False
        }
        
        # Add any additional parameters
        for key, value in kwargs.items():
            if key not in payload:
                payload[key] = value
        
        response = requests.post(
            url,
            headers=self._get_headers(),
            json=payload,
            timeout=120
        )
        response.raise_for_status()
        
        data = response.json()
        
        # Parse OpenAI-compatible response
        content = data["choices"][0]["message"]["content"]
        usage = data.get("usage", {})
        
        return ChatCompletion(
            content=content,
            model=data.get("model", "huggingface"),
            usage=usage,
            raw_response=data
        )
    
    def _call_native_api(
        self,
        messages: List[Dict[str, str]],
        temperature: float,
        max_tokens: int,
        top_p: float,
        **kwargs
    ) -> ChatCompletion:
        """Call the native HuggingFace Inference API."""
        # Format messages into a prompt using ChatML format (Qwen2 style)
        prompt = self._format_messages_to_prompt(messages)
        
        payload = {
            "inputs": prompt,
            "parameters": {
                "temperature": temperature,
                "max_new_tokens": max_tokens,
                "top_p": top_p,
                "do_sample": temperature > 0,
                "return_full_text": False
            }
        }
        
        response = requests.post(
            self.endpoint_url,
            headers=self._get_headers(),
            json=payload,
            timeout=120
        )
        response.raise_for_status()
        
        data = response.json()
        
        # Parse native HF response
        if isinstance(data, list):
            content = data[0].get("generated_text", "")
        else:
            content = data.get("generated_text", "")
        
        return ChatCompletion(
            content=content,
            model="huggingface",
            usage=None,
            raw_response=data
        )
    
    def _format_messages_to_prompt(self, messages: List[Dict[str, str]]) -> str:
        """
        Format messages into a prompt string using ChatML format.
        
        This is the format used by Qwen2 models:
        <|im_start|>system
        {system_message}<|im_end|>
        <|im_start|>user
        {user_message}<|im_end|>
        <|im_start|>assistant
        """
        prompt_parts = []
        
        for message in messages:
            role = message.get("role", "user")
            content = message.get("content", "")
            prompt_parts.append(f"<|im_start|>{role}\n{content}<|im_end|>")
        
        # Add the assistant prompt to start generation
        prompt_parts.append("<|im_start|>assistant\n")
        
        return "\n".join(prompt_parts)


class AIProviderManager:
    """
    Manages AI providers and provides a unified interface for AI inference.
    
    This class handles the selection of AI providers based on configuration
    and provides methods that mirror the OpenAI API interface.
    """
    
    def __init__(self):
        """Initialize the AI Provider Manager."""
        self.logger = logging.getLogger(__name__)
        
        # Load configuration from environment
        self.default_provider = AIProvider(
            os.getenv("AI_PROVIDER", "openai").lower()
        )
        
        # HuggingFace configuration
        self.hf_endpoint_url = os.getenv("HF_INFERENCE_ENDPOINT", "")
        self.hf_api_token = os.getenv("HF_API_TOKEN", "")
        
        # Feature-specific provider overrides
        self.feature_providers = {
            "top_five_matches": AIProvider(
                os.getenv("TOP_FIVE_MATCHES_PROVIDER", self.default_provider.value).lower()
            ),
            "ai_assistant": AIProvider(
                os.getenv("AI_ASSISTANT_PROVIDER", self.default_provider.value).lower()
            ),
            "contract_analysis": AIProvider(
                os.getenv("CONTRACT_ANALYSIS_PROVIDER", self.default_provider.value).lower()
            ),
            "proposal_generation": AIProvider(
                os.getenv("PROPOSAL_GENERATION_PROVIDER", self.default_provider.value).lower()
            ),
            "category_prediction": AIProvider(
                os.getenv("CATEGORY_PREDICTION_PROVIDER", self.default_provider.value).lower()
            ),
            "capability_builder": AIProvider(
                os.getenv("CAPABILITY_BUILDER_PROVIDER", self.default_provider.value).lower()
            ),
        }
        
        # Initialize clients
        self._openai_clients: Dict[str, Any] = {}
        self._hf_client: Optional[HuggingFaceInferenceClient] = None
        
        self._initialize_clients()
    
    def _initialize_clients(self):
        """Initialize AI clients based on configuration."""
        # Initialize HuggingFace client if endpoint is configured
        if self.hf_endpoint_url:
            self._hf_client = HuggingFaceInferenceClient(
                endpoint_url=self.hf_endpoint_url,
                api_token=self.hf_api_token
            )
            self.logger.info(f"Initialized HuggingFace client with endpoint: {self.hf_endpoint_url}")
        
        # OpenAI clients are initialized lazily or passed in
    
    def register_openai_client(self, name: str, client: Any):
        """
        Register an OpenAI client for use by the provider manager.
        
        Args:
            name: Name identifier for the client (e.g., 'smart_search', 'cs_builder')
            client: OpenAI client instance
        """
        self._openai_clients[name] = client
        self.logger.info(f"Registered OpenAI client: {name}")
    
    def get_provider_for_feature(self, feature: str) -> AIProvider:
        """
        Get the configured provider for a specific feature.
        
        Args:
            feature: Feature name (e.g., 'top_five_matches', 'ai_assistant')
            
        Returns:
            AIProvider enum value
        """
        return self.feature_providers.get(feature, self.default_provider)
    
    def is_huggingface_available(self) -> bool:
        """Check if HuggingFace inference is available."""
        return self._hf_client is not None
    
    def chat_completion(
        self,
        messages: List[Dict[str, str]],
        feature: str = "default",
        openai_client_name: str = "smart_search",
        model: str = "gpt-4o-mini",
        temperature: float = 0.7,
        max_tokens: int = 1024,
        **kwargs
    ) -> ChatCompletion:
        """
        Create a chat completion using the appropriate provider.
        
        Args:
            messages: List of message dicts with 'role' and 'content'
            feature: Feature name to determine which provider to use
            openai_client_name: Name of the OpenAI client to use if provider is OpenAI
            model: Model name for OpenAI (ignored for HuggingFace)
            temperature: Sampling temperature
            max_tokens: Maximum tokens to generate
            **kwargs: Additional parameters
            
        Returns:
            ChatCompletion object with the response
        """
        provider = self.get_provider_for_feature(feature)
        
        if provider == AIProvider.HUGGINGFACE and self._hf_client:
            self.logger.info(f"Using HuggingFace provider for feature: {feature}")
            return self._hf_client.chat_completions_create(
                messages=messages,
                model=model,
                temperature=temperature,
                max_tokens=max_tokens,
                **kwargs
            )
        else:
            # Fall back to OpenAI
            self.logger.info(f"Using OpenAI provider for feature: {feature}")
            return self._call_openai(
                client_name=openai_client_name,
                messages=messages,
                model=model,
                temperature=temperature,
                max_tokens=max_tokens,
                **kwargs
            )
    
    def _call_openai(
        self,
        client_name: str,
        messages: List[Dict[str, str]],
        model: str,
        temperature: float,
        max_tokens: int,
        **kwargs
    ) -> ChatCompletion:
        """Call OpenAI API using the specified client."""
        client = self._openai_clients.get(client_name)
        
        if not client:
            raise ValueError(f"OpenAI client '{client_name}' not registered")
        
        response = client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
            **kwargs
        )
        
        content = response.choices[0].message.content
        usage = {
            "prompt_tokens": response.usage.prompt_tokens if response.usage else 0,
            "completion_tokens": response.usage.completion_tokens if response.usage else 0,
            "total_tokens": response.usage.total_tokens if response.usage else 0
        }
        
        return ChatCompletion(
            content=content,
            model=response.model,
            usage=usage,
            raw_response=response
        )
    
    def rerank_contracts(
        self,
        query: str,
        contracts: List[Dict[str, Any]],
        capability_statement: Optional[str] = None,
        top_k: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Re-rank contracts using the AI model.
        
        This is specifically for the Top 5 Matches feature where:
        1. Qdrant provides initial candidates
        2. The AI model re-ranks them based on relevance
        
        Args:
            query: The search query or capability statement summary
            contracts: List of contract dicts from Qdrant
            capability_statement: Optional full capability statement text
            top_k: Number of top contracts to return
            
        Returns:
            Re-ranked list of contracts
        """
        if not contracts:
            return []
        
        # Build the prompt for re-ranking
        system_prompt = """You are an expert at matching government contracts to company capabilities.
Given a company's capability statement and a list of contracts, rank the contracts by relevance.
Consider factors like:
- Industry alignment (NAICS codes, services offered)
- Contract size and company capacity
- Geographic relevance
- Past performance requirements
- Technical requirements match

Return a JSON array of contract IDs in order of relevance (most relevant first).
Only return the JSON array, no other text."""

        contracts_text = "\n".join([
            f"Contract {i+1} (ID: {c.get('id', i)}):\n"
            f"  Title: {c.get('name', c.get('title', 'N/A'))}\n"
            f"  Description: {c.get('description', 'N/A')[:500]}\n"
            f"  NAICS: {c.get('naics_code', c.get('naicsCode', 'N/A'))}\n"
            f"  Category: {c.get('category', 'N/A')}\n"
            for i, c in enumerate(contracts[:20])  # Limit to 20 for context
        ])
        
        user_prompt = f"""Company Capability Statement:
{capability_statement or query}

Contracts to rank:
{contracts_text}

Return the contract IDs in order of relevance as a JSON array."""

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]
        
        try:
            response = self.chat_completion(
                messages=messages,
                feature="top_five_matches",
                model="gpt-4o-mini",
                temperature=0.3,
                max_tokens=500
            )
            
            # Parse the response to get ranked IDs
            content = response.content.strip()
            # Try to extract JSON array from response
            if "[" in content and "]" in content:
                json_str = content[content.index("["):content.rindex("]")+1]
                ranked_ids = json.loads(json_str)
                
                # Reorder contracts based on ranking
                id_to_contract = {c.get('id', i): c for i, c in enumerate(contracts)}
                ranked_contracts = []
                for rid in ranked_ids[:top_k]:
                    if rid in id_to_contract:
                        ranked_contracts.append(id_to_contract[rid])
                
                # Add any remaining contracts not in the ranking
                for c in contracts:
                    if c not in ranked_contracts and len(ranked_contracts) < top_k:
                        ranked_contracts.append(c)
                
                return ranked_contracts[:top_k]
            
        except Exception as e:
            self.logger.error(f"Error re-ranking contracts: {e}")
        
        # Fall back to original order
        return contracts[:top_k]


# Global instance
_ai_provider_manager: Optional[AIProviderManager] = None


def get_ai_provider_manager() -> AIProviderManager:
    """Get the global AI Provider Manager instance."""
    global _ai_provider_manager
    if _ai_provider_manager is None:
        _ai_provider_manager = AIProviderManager()
    return _ai_provider_manager


def initialize_ai_provider(
    openai_clients: Optional[Dict[str, Any]] = None
) -> AIProviderManager:
    """
    Initialize the AI Provider Manager with OpenAI clients.
    
    Args:
        openai_clients: Dict mapping client names to OpenAI client instances
        
    Returns:
        Initialized AIProviderManager instance
    """
    manager = get_ai_provider_manager()
    
    if openai_clients:
        for name, client in openai_clients.items():
            manager.register_openai_client(name, client)
    
    return manager
