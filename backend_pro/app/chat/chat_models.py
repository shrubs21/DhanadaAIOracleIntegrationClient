from pydantic import BaseModel

class ChatRequest(BaseModel):
    conversationId: str
    message: str
    userId: int