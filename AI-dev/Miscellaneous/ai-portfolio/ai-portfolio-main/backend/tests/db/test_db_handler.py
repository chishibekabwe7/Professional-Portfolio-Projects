import pytest
from unittest.mock import Mock, MagicMock, patch
from datetime import datetime
import numpy as np
from sqlalchemy.sql.elements import TextClause
from sqlmodel import Session

from app.db.db_handler import DatabaseHandler
from app.db.db_config import PostgresConfig
from app.models.data_structures import ChatLog, DocumentChunk

# ============================================================================
# FIXTURES AND HELPERS
# ============================================================================

@pytest.fixture
def mock_db_config():
    """Create a mock PostgresConfig"""
    return PostgresConfig(
        db_name="testdb",
        user="testuser",
        password="testpass"
    )

@pytest.fixture
def mock_session():
    """Create a mock SQLModel session"""
    session = MagicMock(spec=Session)
    session.exec = MagicMock()
    session.add = MagicMock()
    session.commit = MagicMock()
    session.rollback = MagicMock()
    session.close = MagicMock()
    return session

@pytest.fixture
def patched_db_handler(mock_db_config, mock_session):
    """Fixture that creates a DatabaseHandler with patched dependencies"""
    with patch('app.db.db_handler.create_engine') as mock_create_engine:
        mock_engine = MagicMock()
        mock_create_engine.return_value = mock_engine
        
        with patch.object(DatabaseHandler, '_DatabaseHandler__setup_vector_extension'):
            with patch.object(DatabaseHandler, '_DatabaseHandler__setup_database'):
                with patch.object(DatabaseHandler, 'get_session') as mock_get_session:
                    # Setup the context manager to return our mock session
                    mock_get_session.return_value.__enter__.return_value = mock_session
                    handler = DatabaseHandler(mock_db_config)
                    yield handler

# ============================================================================
# INITIALIZATION TESTS
# ============================================================================

@pytest.mark.unit
def test_database_handler_initialization(mock_db_config):
    """Test that DatabaseHandler initializes with proper configuration"""
    with patch('app.db.db_handler.create_engine') as mock_create_engine:
        with patch.object(DatabaseHandler, '_DatabaseHandler__setup_vector_extension'):
            with patch.object(DatabaseHandler, '_DatabaseHandler__setup_database'):
                # when
                handler = DatabaseHandler(mock_db_config)
                
                # then
                mock_create_engine.assert_called_once()
                connection_url = mock_db_config.get_connection_url()
                assert mock_create_engine.call_args[0][0] == connection_url

@pytest.mark.unit
def test_setup_vector_extension(mock_db_config, mock_session):
    """Test that vector extension setup is called during initialization"""
    with patch('app.db.db_handler.create_engine'):
        with patch.object(DatabaseHandler, '_DatabaseHandler__setup_database'):
            with patch.object(DatabaseHandler, 'get_session') as mock_get_session:
                # Setup the context manager
                mock_get_session.return_value.__enter__.return_value = mock_session
                
                # when
                handler = DatabaseHandler(mock_db_config)
                
                # then
                mock_session.exec.assert_called_once()
                sql_text = mock_session.exec.call_args[0][0]
                assert isinstance(sql_text, TextClause)
                assert "CREATE EXTENSION IF NOT EXISTS vector" in str(sql_text)
                mock_session.commit.assert_called_once()

@pytest.mark.unit
def test_setup_database(mock_db_config):
    """Test that database setup is called during initialization"""
    with patch('app.db.db_handler.create_engine'):
        with patch.object(DatabaseHandler, '_DatabaseHandler__setup_vector_extension'):
            with patch('app.db.db_handler.SQLModel.metadata.create_all') as mock_create_all:
                # when
                handler = DatabaseHandler(mock_db_config)
                
                # then
                mock_create_all.assert_called_once()

# ============================================================================
# SESSION MANAGEMENT TESTS
# ============================================================================

@pytest.mark.unit
def test_get_session_success():
    """Test that get_session yields a session and commits on success"""
    # given
    mock_engine = MagicMock()
    mock_session = MagicMock()
    
    with patch('app.db.db_handler.create_engine', return_value=mock_engine):
        with patch('app.db.db_handler.Session', return_value=mock_session):
            with patch.object(DatabaseHandler, '_DatabaseHandler__setup_vector_extension'):
                with patch.object(DatabaseHandler, '_DatabaseHandler__setup_database'):
                    handler = DatabaseHandler(Mock())
                    
                    # when
                    with handler.get_session() as session:
                        # Simulate successful operation
                        pass
                    
                    # then
                    mock_session.commit.assert_called_once()
                    mock_session.rollback.assert_not_called()
                    mock_session.close.assert_called_once()

@pytest.mark.unit
def test_get_session_exception():
    """Test that get_session rolls back on exception"""
    # given
    mock_engine = MagicMock()
    mock_session = MagicMock()
    test_exception = RuntimeError("Test exception")
    
    with patch('app.db.db_handler.create_engine', return_value=mock_engine):
        with patch('app.db.db_handler.Session', return_value=mock_session):
            with patch.object(DatabaseHandler, '_DatabaseHandler__setup_vector_extension'):
                with patch.object(DatabaseHandler, '_DatabaseHandler__setup_database'):
                    handler = DatabaseHandler(Mock())
                    
                    # when
                    with pytest.raises(RuntimeError):
                        with handler.get_session():
                            # Simulate operation that raises exception
                            raise test_exception
                    
                    # then
                    mock_session.commit.assert_not_called()
                    mock_session.rollback.assert_called_once()
                    mock_session.close.assert_called_once()

# ============================================================================
# DATABASE OPERATIONS TESTS
# ============================================================================

@pytest.mark.unit
async def test_log_chat(patched_db_handler, mock_session):
    """Test that log_chat adds a ChatLog to the session"""
    # given
    handler = patched_db_handler
    user_message = "Hello"
    assistant_message = "Hi there!"
    session_id = "test-session"
    timestamp = datetime.now()
    
    # Mock ChatLog to avoid NULL identity key error
    chat_log = ChatLog(
        id=1,  # Add an ID to avoid NULL identity key error
        user_message=user_message,
        assistant_message=assistant_message,
        session_id=session_id,
        timestamp=timestamp
    )
    
    # Mock the ChatLog creation
    with patch('app.models.data_structures.ChatLog', return_value=chat_log):
        # when
        await handler.log_chat(user_message, assistant_message, session_id, timestamp)
        
        # then
        mock_session.add.assert_called_once()
        added_chat_log = mock_session.add.call_args[0][0]
        assert added_chat_log.user_message == user_message
        assert added_chat_log.assistant_message == assistant_message
        assert added_chat_log.session_id == session_id
        assert added_chat_log.timestamp == timestamp

@pytest.mark.unit
async def test_log_chat_exception(patched_db_handler, mock_session):
    """Test that log_chat handles exceptions properly"""
    # given
    handler = patched_db_handler
    mock_session.add.side_effect = Exception("Database error")
    
    # when/then
    with pytest.raises(RuntimeError) as exc_info:
        await handler.log_chat("Hello", "Hi", "test-session", datetime.now())
    
    assert "Failed to log chat to database" in str(exc_info.value)

@pytest.mark.unit
async def test_store_document_chunk(patched_db_handler, mock_session):
    """Test that store_document_chunk adds a DocumentChunk to the session"""
    # given
    handler = patched_db_handler
    content = "Test content"
    embedding = [0.1, 0.2, 0.3]
    metadata = {"source": "test.txt"}
    
    # Mock DocumentChunk to avoid NULL identity key error
    document_chunk = DocumentChunk(
        id=1,  # Add an ID to avoid NULL identity key error
        content=content,
        embedding=embedding,
        doc_metadata=metadata
    )
    
    # Mock the DocumentChunk creation
    with patch('app.models.data_structures.DocumentChunk', return_value=document_chunk):
        # when
        await handler.store_document_chunk(content, embedding, metadata)
        
        # then
        mock_session.add.assert_called_once()
        added_chunk = mock_session.add.call_args[0][0]
        assert added_chunk.content == content
        assert added_chunk.embedding == embedding
        assert added_chunk.doc_metadata == metadata

@pytest.mark.unit
async def test_search_similar_chunks(patched_db_handler, mock_session):
    """Test that search_similar_chunks executes the correct query"""
    # given
    handler = patched_db_handler
    query_embedding = [0.1, 0.2, 0.3]
    limit = 5
    mock_results = MagicMock()
    mock_session.exec.return_value = mock_results
    
    # when
    result = await handler.search_similar_chunks(query_embedding, limit)
    
    # then
    mock_session.exec.assert_called_once()
    # Check that the query is a text object
    assert isinstance(mock_session.exec.call_args[0][0], TextClause)
    # Check that the parameters are correct
    params = mock_session.exec.call_args[1]['params']
    assert np.array_equal(np.array(params['embedding']), np.array(query_embedding))
    assert params['limit'] == limit
    mock_results.all.assert_called_once()

@pytest.mark.unit
async def test_document_operations(patched_db_handler, mock_session):
    """Test document existence, hash retrieval, and deletion operations"""
    # given
    handler = patched_db_handler
    file_path = "test.txt"
    
    # Setup mock returns for each operation
    mock_exists_result = MagicMock()
    mock_exists_result.first.return_value = (True,)
    
    mock_hash_result = MagicMock()
    mock_hash_result.first.return_value = ("abc123",)
    
    mock_delete_result = MagicMock()
    mock_delete_result.rowcount = 1
    
    # Configure mock_session.exec to return different results for different calls
    mock_session.exec.side_effect = [mock_exists_result, mock_hash_result, mock_delete_result]
    
    # Test document_exists
    result = await handler.document_exists(file_path)
    assert result is True
    
    # Test get_document_hash
    result = await handler.get_document_hash(file_path)
    assert result == "abc123"
    
    # Test delete_document_chunks
    result = await handler.delete_document_chunks(file_path)
    assert result is True
    mock_session.commit.assert_called()

@pytest.mark.unit
async def test_error_handling(patched_db_handler, mock_session):
    """Test error handling in database operations"""
    # given
    handler = patched_db_handler
    mock_session.exec.side_effect = Exception("Database error")
    
    # Test search_similar_chunks error handling
    result = await handler.search_similar_chunks([0.1, 0.2, 0.3], 5)
    assert result == []
    
    # Reset side_effect for next test
    mock_session.exec.side_effect = Exception("Database error")
    
    # Test document_exists error handling
    result = await handler.document_exists("test.txt")
    assert result is False
    
    # Reset side_effect for next test
    mock_session.exec.side_effect = Exception("Database error")
    
    # Test get_document_hash error handling
    result = await handler.get_document_hash("test.txt")
    assert result is None
    
    # Reset side_effect for next test
    mock_session.exec.side_effect = Exception("Database error")
    
    # Test delete_document_chunks error handling
    result = await handler.delete_document_chunks("test.txt")
    assert result is False
