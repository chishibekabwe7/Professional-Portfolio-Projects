from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse

from app.factory import chat_service
from app.logic.chat_service import ChatService
from app.logs.logger import get_logger
from app.models.data_structures import ChatRequest

logger = get_logger(__name__)


class ChatRouter:
    def __init__(self, 
                 chat_service: ChatService = Depends(chat_service)
                 ):
        self.router = APIRouter()
        self.chat_service = chat_service
        self.add_routes()

    async def _home(self):
        """Home endpoint"""
        return {"Data": "Working!"}

    async def _health_check(self):
        """Health check endpoint"""
        return {"status": "healthy"}

    async def _chat(self, chat_request: ChatRequest) -> StreamingResponse:
        """Chat endpoint that streams responses"""
        try:
            response = StreamingResponse(
                self.chat_service.stream_chat(chat_request),
                media_type="text/event-stream"
            )
            return response

        except Exception:
            logger.exception("Unexpected error during chat")
            raise HTTPException(
                status_code=500,
                detail="An internal server error occurred."
            )

    def add_routes(self):
        self.router.add_api_route("/", self._home, methods=["GET"])
        self.router.add_api_route("/health", self._health_check, methods=["GET"])
        self.router.add_api_route("/chat", self._chat, methods=["POST"])
