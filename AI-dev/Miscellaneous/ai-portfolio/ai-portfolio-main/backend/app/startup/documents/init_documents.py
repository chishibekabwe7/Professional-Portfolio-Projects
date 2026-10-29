from pathlib import Path
from app.logs.logger import get_logger
from app.db.db_handler import DatabaseHandler
from app.logic.document_indexer import DocumentIndexer

logger = get_logger(__name__)


async def init_documents(document_indexer: DocumentIndexer, db_handler: DatabaseHandler):
    """
    Process markdown documents found in the docs folder by reading each file,
    chunking it with DocumentService and storing it into the database.
    Updates existing documents if their content has changed.
    """

    docs_dir = Path(__file__).resolve().parents[3] / "docs"

    logger.info(f"Looking for documents in: {docs_dir}")

    if not docs_dir.exists():
        logger.error(f"Docs directory {docs_dir} does not exist.")
        return

    for file_path in docs_dir.glob("*.md"):
        str_path = str(file_path)
        logger.info(f"Checking file: {str_path}")
        
        # Read the current file content and calculate its hash
        with open(str_path, 'r') as file:
            content = file.read()
        current_hash = document_indexer.calculate_content_hash(content)
        
        # Check if document exists and get its stored hash
        if await db_handler.document_exists(str_path):
            stored_hash = await db_handler.get_document_hash(str_path)
            
            if stored_hash == current_hash:
                logger.debug(f"Skipping unchanged file: {str_path}")
                continue
                
            logger.info(f"Updating modified file: {str_path}")
            # Delete existing chunks before processing updated content
            await db_handler.delete_document_chunks(str_path)
        else:
            logger.info(f"Processing new file: {str_path}")
        
        # Process and store the document chunks
        chunks = document_indexer.process_markdown(str_path)
        for chunk in chunks:
            await db_handler.store_document_chunk(
                content=chunk['content'],
                embedding=chunk['embedding'],
                metadata=chunk['metadata']
            ) 