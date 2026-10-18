from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class SignupBody(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: str = Field(min_length=3, max_length=200)
    password: str = Field(min_length=6, max_length=200)

class LoginBody(BaseModel):
    email: str
    password: str

class QuestionBody(BaseModel):
    text: str = Field(min_length=3, max_length=2000)

class NotesGenerateBody(BaseModel):
    topic: str = Field(min_length=2, max_length=500)
    mode: str = Field("detailed", pattern="^(?i)(short|detailed|exam)$")

class QuizGenerateBody(BaseModel):
    topic: str = Field(min_length=2, max_length=500)
    notes_content: Optional[str] = None

class QuizSubmitBody(BaseModel):
    score: int
    max_score: int
    answers: List[int]

class FlashcardGenerateBody(BaseModel):
    topic: str = Field(min_length=2, max_length=500)
    notes_content: Optional[str] = None

class FlashcardLearnBody(BaseModel):
    card_index: int
    is_learned: bool

class DoubtMessage(BaseModel):
    role: str = Field(pattern="^(?i)(user|model|assistant)$")
    text: str

class DoubtChatBody(BaseModel):
    topic: str = Field(min_length=2, max_length=500)
    messages: List[DoubtMessage]
    use_rag: Optional[bool] = False
    retrieved_context: Optional[str] = None

class RoadmapGenerateBody(BaseModel):
    subject: str = Field(min_length=2, max_length=500)

class RoadmapProgressBody(BaseModel):
    level_idx: int
    module_idx: int
    is_completed: bool

class InterviewGenerateBody(BaseModel):
    topic: str = Field(min_length=2, max_length=500)
    level: str = Field("intermediate", pattern="^(?i)(beginner|intermediate|advanced)$")

class CodingGenerateBody(BaseModel):
    topic: str = Field(min_length=2, max_length=500)

class CodeExecutionRequest(BaseModel):
    language: str = Field(pattern="^(?i)(python|java)$")
    code: str
    stdin: Optional[str] = ""
    input_data: Optional[str] = ""

class GoalCreateBody(BaseModel):
    title: str = Field(min_length=1, max_length=500)
    description: Optional[str] = ""
    target_date: Optional[str] = None # ISO format

class CodeSaveBody(BaseModel):
    language: str = Field(pattern="^(?i)(python|java)$")
    code: str
    stdin: Optional[str] = ""
    topic: Optional[str] = ""
    title: Optional[str] = ""

