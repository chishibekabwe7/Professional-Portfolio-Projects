import pytest
from unittest.mock import Mock, patch, AsyncMock, mock_open
from pathlib import Path

from app.startup.documents.init_documents import init_documents

# ============================================================================
# FIXTURES
# ============================================================================

@pytest.fixture
def mock_document_indexer():
    """Create a mock DocumentIndexer"""
    indexer = Mock()
    indexer.calculate_content_hash = Mock(return_value="test_hash_123")
    indexer.process_markdown = Mock(return_value=[
        {
            "content": "Test chunk content",
            "embedding": [0.1, 0.2, 0.3],
            "metadata": {"source": "test.md", "page": 1}
        }
    ])
    return indexer

@pytest.fixture
def mock_db_handler():
    """Create a mock DatabaseHandler with async methods"""
    handler = AsyncMock()
    handler.document_exists = AsyncMock()
    handler.get_document_hash = AsyncMock()
    handler.delete_document_chunks = AsyncMock()
    handler.store_document_chunk = AsyncMock()
    return handler

# ============================================================================
# TESTS
# ============================================================================

@pytest.mark.unit
async def test_init_documents_directory_not_exists(mock_document_indexer, mock_db_handler):
    """Test when the docs directory doesn't exist"""
    with patch("pathlib.Path.__new__") as mock_path_new:
        # Setup mock docs_dir
        mock_docs_dir = Mock()
        mock_docs_dir.exists.return_value = False
        mock_docs_dir.__truediv__ = Mock(return_value=mock_docs_dir)
        
        # Setup mock path
        mock_path = Mock()
        mock_path.resolve.return_value = Mock()
        mock_path.resolve.return_value.parents = {3: mock_docs_dir}
        
        # Return mock_path when Path is instantiated
        mock_path_new.return_value = mock_path
        
        # Call the function
        await init_documents(mock_document_indexer, mock_db_handler)
        
        # Verify no further processing occurred
        mock_docs_dir.glob.assert_not_called()
        mock_document_indexer.calculate_content_hash.assert_not_called()
        mock_db_handler.document_exists.assert_not_called()

@pytest.mark.unit
async def test_init_documents_no_files(mock_document_indexer, mock_db_handler):
    """Test when the docs directory exists but contains no markdown files"""
    with patch("pathlib.Path.__new__") as mock_path_new, \
         patch("builtins.open", mock_open(read_data="Test markdown content")):
        
        # Setup mock docs_dir
        mock_docs_dir = Mock()
        mock_docs_dir.exists.return_value = True
        mock_docs_dir.glob.return_value = []  # No files found
        mock_docs_dir.__truediv__ = Mock(return_value=mock_docs_dir)
        
        # Setup mock path
        mock_path = Mock()
        mock_path.resolve.return_value = Mock()
        mock_path.resolve.return_value.parents = {3: mock_docs_dir}
        
        # Return mock_path when Path is instantiated
        mock_path_new.return_value = mock_path
        
        # Call the function
        await init_documents(mock_document_indexer, mock_db_handler)
        
        # Verify glob was called but no further processing occurred
        mock_docs_dir.glob.assert_called_once_with("*.md")
        mock_document_indexer.calculate_content_hash.assert_not_called()
        mock_db_handler.document_exists.assert_not_called()

@pytest.mark.unit
async def test_init_documents_new_file(mock_document_indexer, mock_db_handler):
    """Test processing a new markdown file that doesn't exist in the database"""
    with patch("pathlib.Path.__new__") as mock_path_new, \
         patch("builtins.open", mock_open(read_data="Test markdown content")):
        
        # Create a mock file path
        mock_file_path = Mock()
        mock_file_path.__str__ = Mock()
        mock_file_path.__str__.return_value = "/path/to/test.md"
        
        # Setup mock docs_dir
        mock_docs_dir = Mock()
        mock_docs_dir.exists.return_value = True
        mock_docs_dir.glob.return_value = [mock_file_path]
        mock_docs_dir.__truediv__ = Mock(return_value=mock_docs_dir)
        
        # Setup mock path
        mock_path = Mock()
        mock_path.resolve.return_value = Mock()
        mock_path.resolve.return_value.parents = {3: mock_docs_dir}
        
        # Return mock_path when Path is instantiated
        mock_path_new.return_value = mock_path
        
        # Setup db_handler to indicate file doesn't exist in DB
        mock_db_handler.document_exists.return_value = False
        
        # Call the function
        await init_documents(mock_document_indexer, mock_db_handler)
        
        # Verify correct processing for a new file
        mock_document_indexer.calculate_content_hash.assert_called_once_with("Test markdown content")
        mock_db_handler.document_exists.assert_called_once_with("/path/to/test.md")
        mock_db_handler.get_document_hash.assert_not_called()
        mock_db_handler.delete_document_chunks.assert_not_called()
        mock_document_indexer.process_markdown.assert_called_once_with("/path/to/test.md")
        mock_db_handler.store_document_chunk.assert_called_once()

@pytest.mark.unit
async def test_init_documents_unchanged_file(mock_document_indexer, mock_db_handler):
    """Test skipping an unchanged file (hash matches)"""
    with patch("pathlib.Path.__new__") as mock_path_new, \
         patch("builtins.open", mock_open(read_data="Test markdown content")):
        
        # Create a mock file path
        mock_file_path = Mock()
        mock_file_path.__str__ = Mock()
        mock_file_path.__str__.return_value = "/path/to/test.md"
        
        # Setup mock docs_dir
        mock_docs_dir = Mock()
        mock_docs_dir.exists.return_value = True
        mock_docs_dir.glob.return_value = [mock_file_path]
        mock_docs_dir.__truediv__ = Mock(return_value=mock_docs_dir)
        
        # Setup mock path
        mock_path = Mock()
        mock_path.resolve.return_value = Mock()
        mock_path.resolve.return_value.parents = {3: mock_docs_dir}
        
        # Return mock_path when Path is instantiated
        mock_path_new.return_value = mock_path
        
        # Setup db_handler to indicate file exists with matching hash
        mock_db_handler.document_exists.return_value = True
        mock_db_handler.get_document_hash.return_value = "test_hash_123"  # Same as mock_document_indexer returns
        
        # Call the function
        await init_documents(mock_document_indexer, mock_db_handler)
        
        # Verify file was skipped due to matching hash
        mock_document_indexer.calculate_content_hash.assert_called_once_with("Test markdown content")
        mock_db_handler.document_exists.assert_called_once_with("/path/to/test.md")
        mock_db_handler.get_document_hash.assert_called_once_with("/path/to/test.md")
        mock_db_handler.delete_document_chunks.assert_not_called()
        mock_document_indexer.process_markdown.assert_not_called()
        mock_db_handler.store_document_chunk.assert_not_called()

@pytest.mark.unit
async def test_init_documents_modified_file(mock_document_indexer, mock_db_handler):
    """Test processing a modified file (hash differs)"""
    with patch("pathlib.Path.__new__") as mock_path_new, \
         patch("builtins.open", mock_open(read_data="Test markdown content")):
        
        # Create a mock file path
        mock_file_path = Mock()
        mock_file_path.__str__ = Mock()
        mock_file_path.__str__.return_value = "/path/to/test.md"
        
        # Setup mock docs_dir
        mock_docs_dir = Mock()
        mock_docs_dir.exists.return_value = True
        mock_docs_dir.glob.return_value = [mock_file_path]
        mock_docs_dir.__truediv__ = Mock(return_value=mock_docs_dir)
        
        # Setup mock path
        mock_path = Mock()
        mock_path.resolve.return_value = Mock()
        mock_path.resolve.return_value.parents = {3: mock_docs_dir}
        
        # Return mock_path when Path is instantiated
        mock_path_new.return_value = mock_path
        
        # Setup db_handler to indicate file exists with different hash
        mock_db_handler.document_exists.return_value = True
        mock_db_handler.get_document_hash.return_value = "different_hash_456"
        
        # Call the function
        await init_documents(mock_document_indexer, mock_db_handler)
        
        # Verify modified file was processed correctly
        mock_document_indexer.calculate_content_hash.assert_called_once_with("Test markdown content")
        mock_db_handler.document_exists.assert_called_once_with("/path/to/test.md")
        mock_db_handler.get_document_hash.assert_called_once_with("/path/to/test.md")
        mock_db_handler.delete_document_chunks.assert_called_once_with("/path/to/test.md")
        mock_document_indexer.process_markdown.assert_called_once_with("/path/to/test.md")
        mock_db_handler.store_document_chunk.assert_called_once()

@pytest.mark.unit
async def test_init_documents_multiple_files(mock_document_indexer, mock_db_handler):
    """Test processing multiple files with different states"""
    with patch("pathlib.Path.__new__") as mock_path_new, \
         patch("builtins.open", mock_open(read_data="Test markdown content")):
        
        # Create mock file paths
        mock_file_path1 = Mock()
        mock_file_path1.__str__ = Mock()
        mock_file_path1.__str__.return_value = "/path/to/new.md"
        
        mock_file_path2 = Mock()
        mock_file_path2.__str__ = Mock()
        mock_file_path2.__str__.return_value = "/path/to/unchanged.md"
        
        mock_file_path3 = Mock()
        mock_file_path3.__str__ = Mock()
        mock_file_path3.__str__.return_value = "/path/to/modified.md"
        
        # Setup mock docs_dir
        mock_docs_dir = Mock()
        mock_docs_dir.exists.return_value = True
        mock_docs_dir.glob.return_value = [mock_file_path1, mock_file_path2, mock_file_path3]
        mock_docs_dir.__truediv__ = Mock(return_value=mock_docs_dir)
        
        # Setup mock path
        mock_path = Mock()
        mock_path.resolve.return_value = Mock()
        mock_path.resolve.return_value.parents = {3: mock_docs_dir}
        
        # Return mock_path when Path is instantiated
        mock_path_new.return_value = mock_path
        
        # Setup document_exists to return different values for each file
        mock_db_handler.document_exists.side_effect = [False, True, True]
        
        # Setup get_document_hash to return values for the second and third files
        mock_db_handler.get_document_hash.side_effect = ["test_hash_123", "different_hash_456"]
        
        # Call the function
        await init_documents(mock_document_indexer, mock_db_handler)
        
        # Verify correct number of calls
        assert mock_document_indexer.calculate_content_hash.call_count == 3
        assert mock_db_handler.document_exists.call_count == 3
        assert mock_db_handler.get_document_hash.call_count == 2
        assert mock_db_handler.delete_document_chunks.call_count == 1
        assert mock_document_indexer.process_markdown.call_count == 2
        assert mock_db_handler.store_document_chunk.call_count == 2
