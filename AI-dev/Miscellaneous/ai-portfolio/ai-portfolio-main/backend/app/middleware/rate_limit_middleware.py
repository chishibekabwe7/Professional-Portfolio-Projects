from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from app.middleware.rate_limiter import RateLimiter

class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, rate_limiter: RateLimiter):
        super().__init__(app)
        self.rate_limiter = rate_limiter

    async def dispatch(self, request: Request, call_next):
        # Check rate limits
        rate_limit_response = await self.rate_limiter.check_rate_limit(request, None)
        if rate_limit_response:
            return rate_limit_response

        # Proceed with the request if within limits
        response = await call_next(request)
        return response 