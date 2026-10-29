from langchain.text_splitter import MarkdownTextSplitter
from langchain_openai import OpenAIEmbeddings
from typing import List
import hashlib

class DocumentIndexer:
    def __init__(self, embeddings: OpenAIEmbeddings):
        self.embeddings = embeddings
        self.text_splitter = MarkdownTextSplitter(
            chunk_size=1000,
            chunk_overlap=200
        )

    def calculate_content_hash(self, content: str) -> str:
        """Calculate MD5 hash of document content"""
        return hashlib.md5(content.encode('utf-8')).hexdigest()

    def process_markdown(self, file_path: str) -> List[dict]:
        """Process markdown file into chunks with embeddings"""
        with open(file_path, 'r') as file:
            content = file.read()
            
        content_hash = self.calculate_content_hash(content)
        chunks = self.text_splitter.split_text(content)
        embeddings = self.embeddings.embed_documents(chunks)
        
        return [{
            'content': chunk,
            'embedding': embedding,
            'metadata': {
                'source': file_path,
                'content_hash': content_hash
            }
        } for chunk, embedding in zip(chunks, embeddings)] 