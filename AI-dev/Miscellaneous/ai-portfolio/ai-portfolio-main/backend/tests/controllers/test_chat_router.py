import pytest
from fastapi.responses import StreamingResponse
import time
from unittest.mock import Mock
from fastapi import HTTPException

from app.models.data_structures import ChatRequest, Message


# Fixtures
@pytest.fixture
def chat_request():
    """Fixture for creating a valid ChatRequest object"""
    return ChatRequest(
        message="Hello",
        messages=[Message(role="user", content="Hello")],
        session_id="test-session",
        timestamp=time.time()
    )

# Tests
@pytest.mark.unit
async def test_home_endpoint(chat_router):
    """Test the home endpoint returns correct response"""
    response = await chat_router._home()
    assert response == {"Data": "Working!"}

@pytest.mark.unit
async def test_health_check_endpoint(chat_router):
    """Test the health check endpoint returns correct response"""
    response = await chat_router._health_check()
    assert response == {"status": "healthy"}

@pytest.mark.unit
async def test_chat_endpoint_success(chat_router, mock_chat_service, chat_request):
    """Test successful chat endpoint response"""
    async def mock_stream():
        yield b"data: test\n\n"
    mock_chat_service.stream_chat.return_value = mock_stream()
    
    response = await chat_router._chat(chat_request)
    
    assert isinstance(response, StreamingResponse)
    assert response.media_type == "text/event-stream"
    mock_chat_service.stream_chat.assert_called_once_with(chat_request)

@pytest.mark.unit
async def test_chat_endpoint_unexpected_error(chat_router, mock_chat_service, chat_request):
    """Test chat endpoint handles unexpected errors correctly"""
    mock_chat_service.stream_chat = Mock(side_effect=Exception("Unexpected error"))
    
    with pytest.raises(HTTPException) as exc_info:
        await chat_router._chat(chat_request)
    
    assert exc_info.value.status_code == 500
    assert exc_info.value.detail == "An internal server error occurred."

@pytest.mark.unit
def test_router_initialization(chat_router):
    """Test that routes are properly added during initialization"""
    routes = chat_router.router.routes
    assert len(routes) == 3
    
    route_paths = {route.path for route in routes}
    assert route_paths == {"/", "/health", "/chat"}
    
    route_methods = {
        route.path: [method for method in route.methods]
        for route in routes
    }
    assert route_methods["/"] == ["GET"]
    assert route_methods["/health"] == ["GET"]
    assert route_methods["/chat"] == ["POST"] 