from pydantic import BaseModel, field_validator
from datetime import datetime, timezone
from typing import Optional, List
from sqlmodel import SQLModel, Field
from sqlalchemy import Column
from sqlalchemy.dialects.postgresql import JSONB
from pgvector.sqlalchemy import Vector
from datetime import datetime


class Message(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    messages: List[Message]
    session_id: str
    timestamp: float

    @field_validator('timestamp')
    def convert_timestamp(cls, v: float) -> datetime:
        # Convert Unix timestamp to datetime
        return datetime.fromtimestamp(v, tz=timezone.utc)


class ChatLog(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    session_id: str = Field(index=True)
    user_message: str = Field(index=True)
    assistant_message: str = Field(default="")
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    class Config:
        json_encoders = {
            datetime: lambda dt: dt.isoformat()
        }


class RateLimitResponse(BaseModel):
    """Response structure for rate limit exceeded cases"""
    detail: str
    type: str
    limit: str
    retry_after: int  # seconds until the limit resets
    friendly_message: str  # user-friendly message about when they can retry

    class Config:
        json_schema_extra = {
            "example": {
                "detail": "Rate limit exceeded",
                "type": "chat_rate_limit_exceeded",
                "limit": "60/minute",
                "retry_after": 30,
                "friendly_message": "You're sending messages too quickly! You can send another message in 30 seconds."
            }
        }
        
class DocumentChunk(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    content: str = Field(nullable=False)
    embedding: List[float] = Field(sa_column=Column(Vector(1536)))
    doc_metadata: dict = Field(
        default_factory=dict, 
        sa_column=Column("doc_metadata", JSONB)
    )
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        nullable=False
    ) 