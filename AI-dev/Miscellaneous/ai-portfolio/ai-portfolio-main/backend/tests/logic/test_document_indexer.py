import pytest
import hashlib
import tempfile
import os
from unittest.mock import Mock, patch, mock_open

from app.logic.document_indexer import DocumentIndexer

# ============================================================================
# FIXTURES
# ============================================================================

@pytest.fixture
def mock_embeddings():
    """Create a mock OpenAIEmbeddings"""
    embeddings = Mock()
    embeddings.embed_documents = Mock(return_value=[[0.1, 0.2, 0.3], [0.4, 0.5, 0.6]])
    return embeddings

@pytest.fixture
def document_indexer(mock_embeddings):
    """Create a DocumentIndexer with mock dependencies"""
    return DocumentIndexer(embeddings=mock_embeddings)

@pytest.fixture
def sample_markdown_content():
    """Sample markdown content for testing"""
    return """# Test Document
    
This is a test markdown document.

## Section 1

Some content in section 1.

## Section 2

Some content in section 2.
"""

# ============================================================================
# TESTS
# ============================================================================

@pytest.mark.unit
def test_calculate_content_hash(document_indexer):
    """Test that content hash is calculated correctly"""
    content = "Test content"
    expected_hash = hashlib.md5(content.encode('utf-8')).hexdigest()
    
    result = document_indexer.calculate_content_hash(content)
    
    assert result == expected_hash

@pytest.mark.unit
def test_process_markdown(document_indexer, mock_embeddings, sample_markdown_content):
    """Test processing markdown file into chunks with embeddings"""
    # Mock file operations
    with patch("builtins.open", mock_open(read_data=sample_markdown_content)):
        # Mock text splitter to return predictable chunks
        with patch.object(document_indexer.text_splitter, "split_text") as mock_split:
            mock_split.return_value = ["Chunk 1", "Chunk 2"]
            
            result = document_indexer.process_markdown("test.md")
            
            # Verify file was read
            mock_split.assert_called_once_with(sample_markdown_content)
            
            # Verify embeddings were generated
            mock_embeddings.embed_documents.assert_called_once_with(["Chunk 1", "Chunk 2"])
            
            # Verify result structure
            assert len(result) == 2
            assert result[0]["content"] == "Chunk 1"
            assert result[0]["embedding"] == [0.1, 0.2, 0.3]
            assert result[0]["metadata"]["source"] == "test.md"
            assert "content_hash" in result[0]["metadata"]
            assert result[1]["content"] == "Chunk 2"
            assert result[1]["embedding"] == [0.4, 0.5, 0.6]
            assert result[1]["metadata"]["source"] == "test.md"
            assert result[1]["metadata"]["content_hash"] == result[0]["metadata"]["content_hash"]

@pytest.mark.unit
def test_process_markdown_with_real_file():
    """Test processing an actual markdown file (integration test)"""
    # Create a temporary markdown file
    with tempfile.NamedTemporaryFile(suffix=".md", delete=False) as temp_file:
        temp_file.write(b"# Test Document\n\nThis is a test.")
        temp_path = temp_file.name
    
    try:
        # Create a mock embeddings object
        mock_embeddings = Mock()
        mock_embeddings.embed_documents = Mock(return_value=[[0.1, 0.2, 0.3]])
        
        # Create indexer with the mock
        indexer = DocumentIndexer(embeddings=mock_embeddings)
        
        # Process the file
        result = indexer.process_markdown(temp_path)
        
        # Verify basic structure
        assert len(result) == 1
        assert "# Test Document" in result[0]["content"]
        assert "This is a test." in result[0]["content"]
        assert result[0]["embedding"] == [0.1, 0.2, 0.3]
        assert result[0]["metadata"]["source"] == temp_path
        assert "content_hash" in result[0]["metadata"]
    finally:
        # Clean up the temporary file
        os.unlink(temp_path)

@pytest.mark.unit
def test_text_splitter_configuration(document_indexer):
    """Test that text splitter is configured correctly"""
    assert document_indexer.text_splitter._chunk_size == 1000
    assert document_indexer.text_splitter._chunk_overlap == 200
