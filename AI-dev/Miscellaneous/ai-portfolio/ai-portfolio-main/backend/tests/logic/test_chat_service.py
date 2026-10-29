import pytest
import json
import time
from unittest.mock import Mock, MagicMock, AsyncMock
from app.logic.chat_service import ChatService
from app.models.data_structures import ChatRequest, Message, DocumentChunk

# ============================================================================
# FIXTURES
# ============================================================================

@pytest.fixture
def mock_llm_client():
    """Create a mock OpenAI client"""
    client = Mock()
    client.chat.completions.create = Mock()
    return client

@pytest.fixture
def mock_db_handler():
    """Create a mock DatabaseHandler"""
    handler = Mock()
    handler.log_chat = AsyncMock()
    handler.search_similar_chunks = AsyncMock()
    return handler

@pytest.fixture
def mock_embeddings():
    """Create a mock OpenAIEmbeddings"""
    embeddings = Mock()
    embeddings.embed_query = Mock(return_value=[0.1, 0.2, 0.3])
    return embeddings

@pytest.fixture
def chat_service(mock_llm_client, mock_db_handler, mock_embeddings):
    """Create a ChatService with mock dependencies"""
    return ChatService(
        llm_client=mock_llm_client,
        db_handler=mock_db_handler,
        embeddings=mock_embeddings,
        llm_model="gpt-4"
    )

@pytest.fixture
def sample_chat_request():
    """Create a sample ChatRequest for testing"""
    return ChatRequest(
        message="Hello, how are you?",
        messages=[
            Message(role="user", content="Hello, how are you?")
        ],
        session_id="test-session",
        timestamp=time.time()
    )

@pytest.fixture
def sample_document_chunks():
    """Create sample document chunks for testing context retrieval"""
    return [
        DocumentChunk(
            id=1,
            content="This is the first chunk of context.",
            embedding=[0.1, 0.2, 0.3],
            doc_metadata={"source": "test1.txt"}
        ),
        DocumentChunk(
            id=2,
            content="This is the second chunk of context.",
            embedding=[0.4, 0.5, 0.6],
            doc_metadata={"source": "test2.txt"}
        )
    ]

# ============================================================================
# TESTS FOR HELPER METHODS
# ============================================================================

@pytest.mark.unit
async def test_fetch_relevant_context_with_results(chat_service, mock_db_handler, sample_document_chunks):
    """Test that _fetch_relevant_context returns concatenated content when chunks are found"""
    mock_db_handler.search_similar_chunks.return_value = sample_document_chunks
    
    context = await chat_service._fetch_relevant_context("test query")
    
    mock_db_handler.search_similar_chunks.assert_called_once()
    assert "This is the first chunk of context." in context
    assert "This is the second chunk of context." in context

@pytest.mark.unit
async def test_fetch_relevant_context_no_results(chat_service, mock_db_handler):
    """Test that _fetch_relevant_context returns empty string when no chunks are found"""
    mock_db_handler.search_similar_chunks.return_value = []
    
    context = await chat_service._fetch_relevant_context("test query")
    
    mock_db_handler.search_similar_chunks.assert_called_once()
    assert context == ""

@pytest.mark.unit
async def test_fetch_relevant_context_exception(chat_service, mock_embeddings):
    """Test that _fetch_relevant_context handles exceptions gracefully"""
    mock_embeddings.embed_query.side_effect = Exception("Embedding error")
    
    context = await chat_service._fetch_relevant_context("test query")
    
    assert context == ""

@pytest.mark.unit
def test_build_system_prompt_with_context(chat_service):
    """Test that _build_system_prompt includes context when provided"""
    context = "This is some context."
    
    prompt = chat_service._build_system_prompt(context)
    
    assert "professional AI assistant" in prompt
    assert "Use the following context to inform your responses" in prompt
    assert context in prompt

@pytest.mark.unit
def test_build_system_prompt_without_context(chat_service):
    """Test that _build_system_prompt handles empty context"""
    prompt = chat_service._build_system_prompt("")
    
    assert "professional AI assistant" in prompt
    assert "No additional document context is available" in prompt

@pytest.mark.unit
def test_build_messages(chat_service, sample_chat_request):
    """Test that _build_messages correctly formats messages"""
    system_prompt = "You are an AI assistant."
    
    messages = chat_service._build_messages(system_prompt, sample_chat_request)
    
    assert len(messages) == 3  # System prompt + message from history + current message
    assert messages[0]["role"] == "system"
    assert messages[0]["content"] == system_prompt
    assert messages[1]["role"] == "user"
    assert messages[1]["content"] == "Hello, how are you?"
    assert messages[2]["role"] == "user"
    assert messages[2]["content"] == sample_chat_request.message

@pytest.mark.unit
def test_build_messages_with_history(chat_service):
    """Test that _build_messages includes conversation history"""
    system_prompt = "You are an AI assistant."
    chat_request = ChatRequest(
        message="What's the weather?",
        messages=[
            Message(role="user", content="Hello"),
            Message(role="assistant", content="Hi there!"),
            Message(role="user", content="What's the weather?")
        ],
        session_id="test-session",
        timestamp=time.time()
    )
    
    messages = chat_service._build_messages(system_prompt, chat_request)
    
    assert len(messages) == 5  # System prompt + 3 conversation messages + current message
    assert messages[0]["role"] == "system"
    assert messages[0]["content"] == system_prompt
    assert messages[1]["role"] == "user"
    assert messages[1]["content"] == "Hello"
    assert messages[2]["role"] == "assistant"
    assert messages[2]["content"] == "Hi there!"
    assert messages[3]["role"] == "user"
    assert messages[3]["content"] == "What's the weather?"
    assert messages[4]["role"] == "user"
    assert messages[4]["content"] == "What's the weather?"

# ============================================================================
# TESTS FOR STREAM_CHAT
# ============================================================================

@pytest.mark.unit
async def test_stream_chat_success(chat_service, mock_llm_client, mock_db_handler, sample_chat_request):
    """Test successful streaming chat response"""
    # Mock the streaming response from OpenAI
    mock_chunk1, mock_chunk2 = MagicMock(), MagicMock()
    mock_chunk1.choices = [MagicMock()]
    mock_chunk1.choices[0].delta.content = "Hello"
    mock_chunk2.choices = [MagicMock()]
    mock_chunk2.choices[0].delta.content = " there!"
    mock_llm_client.chat.completions.create.return_value = [mock_chunk1, mock_chunk2]
    
    response_generator = chat_service.stream_chat(sample_chat_request)
    response_chunks = [chunk async for chunk in response_generator]
    
    mock_llm_client.chat.completions.create.assert_called_once()
    assert len(response_chunks) == 2
    assert json.loads(response_chunks[0].split(':', 1)[1]) == "Hello"
    assert json.loads(response_chunks[1].split(':', 1)[1]) == " there!"
    
    # Verify chat was logged
    mock_db_handler.log_chat.assert_called_once_with(
        user_message=sample_chat_request.message,
        assistant_message="Hello there!",
        session_id=sample_chat_request.session_id,
        timestamp=sample_chat_request.timestamp
    )

@pytest.mark.unit
async def test_stream_chat_exception(chat_service, mock_llm_client, sample_chat_request):
    """Test error handling in stream_chat"""
    mock_llm_client.chat.completions.create.side_effect = Exception("API error")
    
    with pytest.raises(Exception) as exc_info:
        async for _ in chat_service.stream_chat(sample_chat_request):
            pass
    
    assert "An error occurred while processing your request" in str(exc_info.value)
