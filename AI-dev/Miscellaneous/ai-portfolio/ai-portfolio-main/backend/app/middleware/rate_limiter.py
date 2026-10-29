from typing import Optional, Tuple
from fastapi import Request, Response
from redis import Redis
from slowapi import Limiter
from slowapi.util import get_remote_address
from app.logs.logger import get_logger
from app.models.data_structures import RateLimitResponse

logger = get_logger(__name__)

class RateLimiter:
    def __init__(self, redis_client: Redis, limiter: Limiter, global_rate: str, chat_rate: str):
        self.redis = redis_client
        self.limiter = limiter
        self.global_rate = global_rate
        self.chat_rate = chat_rate
        logger.info(f"Initializing RateLimiter with global_rate={global_rate}, chat_rate={chat_rate}")

    async def check_rate_limit(self, request: Request, response: Response) -> Optional[Response]:
        """Main rate limiting logic entry point"""
        try:
            if self._is_health_check(request):
                return None

            client_ip = get_remote_address(request)
            logger.debug(f"Checking rate limits for IP: {client_ip}")

            # Check global rate limit
            global_limit_response = await self._check_global_limit()
            if global_limit_response:
                return global_limit_response

            # Check chat-specific rate limit
            if self._is_chat_endpoint(request):
                chat_limit_response = await self._check_chat_limit(client_ip)
                if chat_limit_response:
                    return chat_limit_response

            return None

        except Exception as e:
            logger.error(f"Rate limiting error: {str(e)}")
            return None  # Fail open

    def _is_health_check(self, request: Request) -> bool:
        """Check if the request is for health check endpoints"""
        return request.url.path in ["/", "/health"]

    def _is_chat_endpoint(self, request: Request) -> bool:
        """Check if the request is for chat endpoints"""
        return request.url.path.startswith("/chat")

    async def _check_global_limit(self) -> Optional[Response]:
        """Check global rate limit"""
        global_key = "rate_limit:global"
        is_allowed, retry_after = await self._check_limit(global_key, self.global_rate)
        
        if not is_allowed:
            logger.warning(f"Global rate limit exceeded. Key: {global_key}")
            return self._create_limit_response(
                detail="Global rate limit exceeded",
                type="rate_limit_exceeded",
                limit=self.global_rate,
                retry_after=retry_after,
                friendly_message=f"You've reached the global rate limit. Please try again in {retry_after} seconds."
            )
        return None

    async def _check_chat_limit(self, client_ip: str) -> Optional[Response]:
        """Check chat-specific rate limit"""
        chat_key = f"rate_limit:chat:{client_ip}"
        is_allowed, retry_after = await self._check_limit(chat_key, self.chat_rate)
        
        if not is_allowed:
            logger.warning(f"Chat rate limit exceeded for IP: {client_ip}. Key: {chat_key}")
            return self._create_limit_response(
                detail="Chat rate limit exceeded",
                type="chat_rate_limit_exceeded",
                limit=self.chat_rate,
                retry_after=retry_after,
                friendly_message="You're sending messages too quickly! Please wait before sending another message."
            )
        return None

    def _create_limit_response(self, detail: str, type: str, limit: str, 
                             retry_after: int, friendly_message: str) -> Response:
        """Create a standardized rate limit response"""
        response_data = RateLimitResponse(
            detail=detail,
            type=type,
            limit=limit,
            retry_after=retry_after,
            friendly_message=friendly_message
        )
        return Response(
            content=response_data.model_dump_json(),
            media_type="application/json",
            status_code=429
        )

    async def _check_limit(self, key: str, limit: str) -> Tuple[bool, int]:
        """
        Check if the request is within rate limits
        Returns (is_allowed, retry_after_seconds)
        """
        count, period = self._parse_limit(limit)
        period_seconds = self._convert_period_to_seconds(period)
            
        # Use Redis for atomic increment and expire
        current = self.redis.incr(key)
        logger.debug(f"Rate limit check - Key: {key}, Current: {current}, Limit: {count}")
        
        if current == 1:
            self.redis.expire(key, period_seconds)
            logger.debug(f"Set expiry for key {key} to {period_seconds} seconds")
        
        # If we've exceeded the limit, get the TTL
        if current > count:
            retry_after = self.redis.ttl(key)
            logger.debug(f"Rate limit exceeded for key {key}. Retry after: {retry_after} seconds")
            return False, max(0, retry_after)
            
        return True, 0

    def _parse_limit(self, limit: str) -> Tuple[int, str]:
        """Parse rate limit string into count and period"""
        count, period = limit.split("/")
        return int(count), period

    def _convert_period_to_seconds(self, period: str) -> int:
        """Convert time period to seconds"""
        period_map = {
            "second": 1,
            "minute": 60,
            "hour": 3600,
            "day": 86400
        }
        return period_map.get(period, 86400)  # default to day if unknown period 