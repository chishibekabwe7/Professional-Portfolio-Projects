import pytest
from unittest.mock import Mock, patch, MagicMock
from fastapi import Request, Response
from redis import Redis

from app.middleware.rate_limiter import RateLimiter
from app.models.data_structures import RateLimitResponse

# ============================================================================
# FIXTURES
# ============================================================================

@pytest.fixture
def mock_redis():
    """Create a mock Redis client"""
    redis = Mock(spec=Redis)
    redis.incr = Mock(return_value=1)  # First request, under limit
    redis.expire = Mock()
    redis.ttl = Mock(return_value=30)  # 30 seconds remaining
    return redis

@pytest.fixture
def mock_limiter():
    """Create a mock Limiter"""
    return Mock()

@pytest.fixture
def rate_limiter(mock_redis, mock_limiter):
    """Create a RateLimiter with mock dependencies"""
    return RateLimiter(
        redis_client=mock_redis,
        limiter=mock_limiter,
        global_rate="100/minute",
        chat_rate="10/minute"
    )

@pytest.fixture
def mock_request():
    """Create a mock Request"""
    request = Mock(spec=Request)
    request.url = Mock()
    request.url.path = "/chat"
    request.client = Mock()
    request.client.host = "127.0.0.1"
    return request

@pytest.fixture
def mock_response():
    """Create a mock Response"""
    return Mock(spec=Response)

# ============================================================================
# TESTS
# ============================================================================

@pytest.mark.unit
def test_initialization(mock_redis, mock_limiter):
    """Test that RateLimiter initializes with proper configuration"""
    limiter = RateLimiter(
        redis_client=mock_redis,
        limiter=mock_limiter,
        global_rate="100/minute",
        chat_rate="10/minute"
    )
    
    assert limiter.redis == mock_redis
    assert limiter.limiter == mock_limiter
    assert limiter.global_rate == "100/minute"
    assert limiter.chat_rate == "10/minute"

@pytest.mark.unit
def test_is_health_check():
    """Test health check endpoint detection"""
    limiter = RateLimiter(Mock(), Mock(), "100/minute", "10/minute")
    
    health_request = Mock(spec=Request)
    health_request.url = Mock()
    
    # Test health endpoint
    health_request.url.path = "/health"
    assert limiter._is_health_check(health_request) is True
    
    # Test root endpoint
    health_request.url.path = "/"
    assert limiter._is_health_check(health_request) is True
    
    # Test non-health endpoint
    health_request.url.path = "/chat"
    assert limiter._is_health_check(health_request) is False

@pytest.mark.unit
def test_is_chat_endpoint():
    """Test chat endpoint detection"""
    limiter = RateLimiter(Mock(), Mock(), "100/minute", "10/minute")
    
    request = Mock(spec=Request)
    request.url = Mock()
    
    # Test chat endpoint
    request.url.path = "/chat"
    assert limiter._is_chat_endpoint(request) is True
    
    # Test chat subpath
    request.url.path = "/chat/stream"
    assert limiter._is_chat_endpoint(request) is True
    
    # Test non-chat endpoint
    request.url.path = "/api/data"
    assert limiter._is_chat_endpoint(request) is False

@pytest.mark.unit
def test_parse_limit():
    """Test parsing rate limit strings"""
    limiter = RateLimiter(Mock(), Mock(), "100/minute", "10/minute")
    
    count, period = limiter._parse_limit("100/minute")
    assert count == 100
    assert period == "minute"
    
    count, period = limiter._parse_limit("5/second")
    assert count == 5
    assert period == "second"
    
    count, period = limiter._parse_limit("1000/day")
    assert count == 1000
    assert period == "day"

@pytest.mark.unit
def test_convert_period_to_seconds():
    """Test converting time periods to seconds"""
    limiter = RateLimiter(Mock(), Mock(), "100/minute", "10/minute")
    
    assert limiter._convert_period_to_seconds("second") == 1
    assert limiter._convert_period_to_seconds("minute") == 60
    assert limiter._convert_period_to_seconds("hour") == 3600
    assert limiter._convert_period_to_seconds("day") == 86400
    assert limiter._convert_period_to_seconds("unknown") == 86400  # Default to day

@pytest.mark.unit
async def test_check_limit_under_limit(rate_limiter, mock_redis):
    """Test checking rate limit when under the limit"""
    mock_redis.incr.return_value = 5  # Under the limit of 10
    
    is_allowed, retry_after = await rate_limiter._check_limit("test_key", "10/minute")
    
    assert is_allowed is True
    assert retry_after == 0
    mock_redis.incr.assert_called_once_with("test_key")

@pytest.mark.unit
async def test_check_limit_over_limit(rate_limiter, mock_redis):
    """Test checking rate limit when over the limit"""
    mock_redis.incr.return_value = 11  # Over the limit of 10
    mock_redis.ttl.return_value = 45  # 45 seconds remaining
    
    is_allowed, retry_after = await rate_limiter._check_limit("test_key", "10/minute")
    
    assert is_allowed is False
    assert retry_after == 45
    mock_redis.incr.assert_called_once_with("test_key")
    mock_redis.ttl.assert_called_once_with("test_key")

@pytest.mark.unit
async def test_check_global_limit_allowed(rate_limiter, mock_redis):
    """Test global rate limit check when allowed"""
    mock_redis.incr.return_value = 50  # Under the global limit
    
    response = await rate_limiter._check_global_limit()
    
    assert response is None
    mock_redis.incr.assert_called_once()
    assert "rate_limit:global" in mock_redis.incr.call_args[0]

@pytest.mark.unit
async def test_check_global_limit_exceeded(rate_limiter, mock_redis):
    """Test global rate limit check when exceeded"""
    mock_redis.incr.return_value = 101  # Over the global limit
    mock_redis.ttl.return_value = 30
    
    response = await rate_limiter._check_global_limit()
    
    assert response is not None
    assert response.status_code == 429
    mock_redis.incr.assert_called_once()
    mock_redis.ttl.assert_called_once()

@pytest.mark.unit
async def test_check_chat_limit_allowed(rate_limiter, mock_redis):
    """Test chat rate limit check when allowed"""
    mock_redis.incr.return_value = 5  # Under the chat limit
    
    response = await rate_limiter._check_chat_limit("127.0.0.1")
    
    assert response is None
    mock_redis.incr.assert_called_once()
    assert "rate_limit:chat:127.0.0.1" in mock_redis.incr.call_args[0]

@pytest.mark.unit
async def test_check_chat_limit_exceeded(rate_limiter, mock_redis):
    """Test chat rate limit check when exceeded"""
    mock_redis.incr.return_value = 11  # Over the chat limit
    mock_redis.ttl.return_value = 30
    
    response = await rate_limiter._check_chat_limit("127.0.0.1")
    
    assert response is not None
    assert response.status_code == 429
    mock_redis.incr.assert_called_once()
    mock_redis.ttl.assert_called_once()

@pytest.mark.unit
def test_create_limit_response(rate_limiter):
    """Test creating a rate limit response"""
    response = rate_limiter._create_limit_response(
        detail="Test limit exceeded",
        type="test_limit_exceeded",
        limit="10/minute",
        retry_after=30,
        friendly_message="Please try again later"
    )
    
    assert response.status_code == 429
    assert response.media_type == "application/json"
    assert "Test limit exceeded" in response.body.decode()
    assert "Please try again later" in response.body.decode()
    assert "30" in response.body.decode()  # retry_after value

@pytest.mark.unit
async def test_check_rate_limit_health_endpoint(rate_limiter, mock_request, mock_response):
    """Test that health check endpoints bypass rate limiting"""
    mock_request.url.path = "/health"
    
    response = await rate_limiter.check_rate_limit(mock_request, mock_response)
    
    assert response is None  # No rate limit response means allowed

@pytest.mark.unit
async def test_check_rate_limit_global_exceeded(rate_limiter, mock_request, mock_response, mock_redis):
    """Test main rate limit check when global limit is exceeded"""
    mock_redis.incr.return_value = 101  # Over the global limit
    mock_redis.ttl.return_value = 30
    
    response = await rate_limiter.check_rate_limit(mock_request, mock_response)
    
    assert response is not None
    assert response.status_code == 429
    assert "Global rate limit exceeded" in response.body.decode()

@pytest.mark.unit
async def test_check_rate_limit_chat_exceeded(rate_limiter, mock_request, mock_response, mock_redis):
    """Test main rate limit check when chat limit is exceeded"""
    # First call for global limit check (allowed)
    # Second call for chat limit check (exceeded)
    mock_redis.incr.side_effect = [50, 11]
    mock_redis.ttl.return_value = 30
    
    response = await rate_limiter.check_rate_limit(mock_request, mock_response)
    
    assert response is not None
    assert response.status_code == 429
    assert "Chat rate limit exceeded" in response.body.decode()

@pytest.mark.unit
async def test_check_rate_limit_exception_handling(rate_limiter, mock_request, mock_response, mock_redis):
    """Test that exceptions in rate limiting are handled gracefully"""
    mock_redis.incr.side_effect = Exception("Redis connection error")
    
    response = await rate_limiter.check_rate_limit(mock_request, mock_response)
    
    assert response is None  # Fail open on exceptions
