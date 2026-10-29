"""
Pytest configuration file containing shared fixtures.
"""
import pytest
from unittest.mock import Mock
from app.logic.chat_service import ChatService
from app.controllers.chat_router import ChatRouter

@pytest.fixture
def mock_chat_service():
    """
    Creates a mock ChatService for testing.
    """
    mock = Mock(spec=ChatService)
    return mock

@pytest.fixture
def chat_router(mock_chat_service):
    """
    Creates a ChatRouter instance with mock dependencies.
    """
    return ChatRouter(chat_service=mock_chat_service) 