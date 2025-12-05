from pydantic import BaseModel
from typing import Optional

class LLMMessage(BaseModel):
    role: str
    content: str


class Actor(BaseModel):
    name: str
    bio: str
    personality: str
    context1: str
    secret: str
    violation: str
    messages: list[LLMMessage]
    hurt: Optional[str] = None


class InvocationRequest(BaseModel):
    global_story: str
    actor: Actor
    session_id: str
    character_file_version: str


class InvocationResponse(BaseModel):
    original_response: str
    critique_response: str
    problems_detected: bool
    final_response: str
    refined_response: str | None

