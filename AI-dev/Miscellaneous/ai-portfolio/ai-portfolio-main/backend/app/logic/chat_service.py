import os
import json
from typing import AsyncGenerator, List

from openai import OpenAI
from fastapi import HTTPException

from app.logs.logger import get_logger
from app.models.data_structures import ChatRequest, DocumentChunk
from app.db.db_handler import DatabaseHandler
from openai.types.chat.chat_completion_message_param import ChatCompletionMessageParam
from langchain_openai import OpenAIEmbeddings



logger = get_logger(__name__)


class ChatService:
    def __init__(self, llm_client: OpenAI, db_handler: DatabaseHandler, embeddings: OpenAIEmbeddings, llm_model: str):
        self.llm_client = llm_client
        self.db_handler = db_handler
        self.embeddings = embeddings
        self.llm_model = llm_model
        self.max_context_messages = 10  

    async def stream_chat(self, chat_request: ChatRequest) -> AsyncGenerator[str, None]:
        try:
            context = await self._fetch_relevant_context(chat_request.message)
            system_prompt = self._build_system_prompt(context)
            messages = self._build_messages(system_prompt, chat_request)
            
            stream = self.llm_client.chat.completions.create(
                model=self.llm_model,
                messages=messages,
                stream=True,
                temperature=0,
            )
            
            complete_response = ""
            for chunk in stream:
                delta = chunk.choices[0].delta
                if delta.content:
                    content = delta.content
                    complete_response += content
                    yield f'0:{json.dumps(content)}\n'
            
            await self.db_handler.log_chat(
                user_message=chat_request.message,
                assistant_message=complete_response,
                session_id=chat_request.session_id,
                timestamp=chat_request.timestamp
            )
        
        except Exception as e:
            logger.error(f"Error in stream_chat: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail="An error occurred while processing your request"
            )
            
    async def _fetch_relevant_context(self, user_message: str) -> str:
        """
        Fetch relevant context for the user's query using semantic search.
        Returns concatenated content from the most relevant chunks.
        """
        try:
            logger.info(f"Fetching relevant context for query: {user_message}")
            query_embedding: List[float] = self.embeddings.embed_query(user_message)
            chunks: List[DocumentChunk] = await self.db_handler.search_similar_chunks(
                query_embedding,
                limit=4
            )
            
            if not chunks:
                logger.info("No relevant context found for query")
                return ""
            
            context = ""
            for chunk in chunks:    
                logger.info(f"Chunk: {chunk.content}")
                context += f"{chunk.content}\n\n"
            logger.info(f"Found {len(chunks)} relevant chunks for context")
            
            return context
            
        except Exception as e:
            logger.error(f"Error fetching context: {str(e)}")
            return ""
        
        
    
    def _build_system_prompt(self, context: str) -> str:
        base_prompt: str = f"""
            "You are a professional AI assistant, designed to provide engaging, "
            "personalized interactions based on my experiences and writings. Your responses should:\n"
            "1. Be accurate, and rely solely on verified information from the given context or previous conversations when relevant.\n"
            "2. Be concise, direct and clear and avoid unnecessary verbosity.\n"
            "3. Maintain continuity by referencing previous exchanges where applicable.\n"
            "4. Show personality while remaining professional and courteous.\n"
            "5. Clearly indicate when you are uncertain rather than guessing.\n"
            "6. Decline to share sensitive information or generate harmful content.\n"
            "7. When constructing a response message, always use proper markdown formatting.\n"
            "8. When listing items, always use proper markdown formatting.\n"
        """

        if context:
            base_prompt += (
                f"\nUse the following context to inform your responses:\n{context}\n"
                "While you can reference this context, maintain a natural conversational flow. "
                "If you're unsure about something, acknowledge it explicitly. "
            )
        else:
            base_prompt += (
                "\nNo additional document context is available. If the current conversation or previous messages "
                "do not provide sufficient context to answer a query, do not hallucinate or fabricate information. "
                "Instead, clearly indicate that you lack sufficient context to provide an accurate response."
            )
        logger.debug(f"System prompt length: {len(base_prompt)} characters")
        return base_prompt
    
    def _build_messages(self, system_prompt: str, chat_request: ChatRequest) -> List[ChatCompletionMessageParam]:
        messages = [{"role": "system", "content": system_prompt}]
        recent_messages = chat_request.messages[-self.max_context_messages:] if chat_request.messages else []
        messages.extend({"role": msg.role, "content": msg.content} for msg in recent_messages)
        messages.append({"role": "user", "content": chat_request.message})
        return messages

