from functools import lru_cache
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db.db_handler import DatabaseHandler, PostgresConfig
from openai import OpenAI
from app.logic.chat_service import ChatService
from langchain_openai import OpenAIEmbeddings
from app.logic.document_indexer import DocumentIndexer
from redis import Redis
from app.middleware.rate_limiter import RateLimiter
from app.middleware.rate_limit_middleware import RateLimitMiddleware
from slowapi import Limiter
from slowapi.util import get_remote_address

def create_app() -> FastAPI:
    """Creates and configures the FastAPI application with all middleware"""
    app = FastAPI()
    
    rate_limiter_instance = rate_limiter()
    app.add_middleware(RateLimitMiddleware, rate_limiter=rate_limiter_instance)
    
    frontend_url = os.getenv("FRONTEND_URL")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[frontend_url, "http://localhost"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    return app

# Database Configuration
def get_db_config() -> PostgresConfig:
    """Creates database configuration from environment variables"""
    return PostgresConfig(
        server=os.getenv("POSTGRES_SERVER", "localhost"),
        port=int(os.getenv("POSTGRES_PORT", "5432")),
        db_name=os.getenv("POSTGRES_DB"),
        user=os.getenv("POSTGRES_USER"),
        password=os.getenv("POSTGRES_PASSWORD")
    )

@lru_cache()
def database_handler() -> DatabaseHandler:
    """Creates and caches database handler instance"""
    return DatabaseHandler(get_db_config())

@lru_cache()
def redis_client() -> Redis:
    """Creates and caches Redis client instance"""
    redis_url = os.getenv("REDIS_URL")
    return Redis.from_url(redis_url, decode_responses=True)

@lru_cache()
def create_limiter(redis_client: Redis) -> Limiter:
    """Creates and caches Limiter instance"""
    redis_params = redis_client.connection_pool.connection_kwargs
    redis_url = f"redis://{redis_params['host']}:{redis_params['port']}"
    return Limiter(
        key_func=get_remote_address,
        storage_uri=redis_url,
        strategy="fixed-window"
    )

@lru_cache()
def rate_limiter() -> RateLimiter:
    """Creates and caches RateLimiter instance"""
    redis = redis_client()
    return RateLimiter(
        redis_client=redis,
        limiter=create_limiter(redis),
        global_rate=os.getenv("GLOBAL_RATE_LIMIT"),
        chat_rate=os.getenv("CHAT_RATE_LIMIT")
    )

@lru_cache()
def openai_client() -> OpenAI:
    """Creates OpenAI-compatible client instance"""
    return OpenAI(
        base_url=os.getenv("LLM_ROUTER_URL"),
        api_key=os.getenv("LLM_ROUTER_API_KEY")
    )

@lru_cache()
def embeddings() -> OpenAIEmbeddings:
    """Creates and caches embeddings instance"""
    return OpenAIEmbeddings(
        model=os.getenv("EMBEDDING_MODEL"),
        openai_api_key=os.getenv("OPENAI_API_KEY")
    )

@lru_cache()
def chat_service() -> ChatService:
    """Creates and caches chat service instance"""
    return ChatService(
        llm_client=openai_client(),
        db_handler=database_handler(),
        embeddings=embeddings(),
        llm_model=os.getenv("LLM_MODEL")
    )

@lru_cache()
def document_indexer() -> DocumentIndexer:
    """Creates and caches document indexer instance"""
    return DocumentIndexer(
        embeddings=embeddings()
    )
