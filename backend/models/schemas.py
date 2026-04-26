"""
Pydantic models for SkillSync API request/response schemas.
"""

from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum
import uuid
from datetime import datetime


# ─── Enums ───────────────────────────────────────────────────────────────

class SkillCategory(str, Enum):
    TECHNICAL = "technical"
    SOFT = "soft"
    DOMAIN = "domain"
    TOOL = "tool"


class GapSeverity(str, Enum):
    CRITICAL = "critical"
    MODERATE = "moderate"
    MINOR = "minor"


class Difficulty(str, Enum):
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"


# ─── Skill Models ────────────────────────────────────────────────────────

class RequiredSkill(BaseModel):
    """A skill extracted from the Job Description."""
    name: str = Field(..., description="Skill name")
    category: SkillCategory = Field(..., description="Skill category")
    required_level: int = Field(..., ge=1, le=10, description="Required proficiency 1-10")
    importance: str = Field(default="required", description="required | preferred | nice-to-have")
    context: str = Field(default="", description="How this skill is used in the role")


class CandidateSkill(BaseModel):
    """A skill extracted from the candidate's resume."""
    name: str = Field(..., description="Skill name")
    category: SkillCategory = Field(..., description="Skill category")
    claimed_level: int = Field(default=5, ge=1, le=10, description="Estimated proficiency from resume")
    evidence: str = Field(default="", description="Evidence snippet from resume")
    years_experience: Optional[float] = Field(default=None, description="Years of experience if mentioned")


class AssessedSkill(BaseModel):
    """A skill after conversational assessment."""
    name: str
    category: SkillCategory
    required_level: int = Field(ge=1, le=10)
    claimed_level: int = Field(ge=1, le=10)
    assessed_level: int = Field(ge=1, le=10)
    confidence: float = Field(ge=0, le=1, description="AI confidence in assessment")
    assessment_notes: str = Field(default="", description="AI's evaluation notes")
    questions_asked: int = Field(default=0)


# ─── Request / Response Models ───────────────────────────────────────────

class AnalyzeRequest(BaseModel):
    """Request to analyze JD + Resume."""
    job_description: str = Field(..., min_length=50, description="Full job description text")
    resume_text: str = Field(default="", description="Resume as plain text (alternative to file upload)")


class AnalyzeResponse(BaseModel):
    """Response from skill extraction."""
    session_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    job_title: str = Field(default="")
    company: str = Field(default="")
    required_skills: list[RequiredSkill] = []
    candidate_skills: list[CandidateSkill] = []
    initial_match_score: float = Field(default=0.0, ge=0, le=100)
    skill_overlap: list[str] = Field(default_factory=list, description="Skills found in both JD and resume")
    missing_skills: list[str] = Field(default_factory=list, description="Required skills not in resume")


class ChatRequest(BaseModel):
    """User message during assessment."""
    session_id: str
    message: str = Field(..., min_length=1)


class ChatResponse(BaseModel):
    """AI response during assessment."""
    message: str
    current_skill: Optional[str] = None
    skills_assessed: int = 0
    total_skills: int = 0
    is_complete: bool = False


class SkillGap(BaseModel):
    """A single skill gap."""
    skill_name: str
    category: SkillCategory
    required_level: int
    assessed_level: int
    gap_delta: int = Field(description="required - assessed")
    severity: GapSeverity
    adjacent_skills: list[str] = Field(default_factory=list, description="Related skills candidate already has")
    transferable_experience: str = Field(default="")


class GapReport(BaseModel):
    """Full gap analysis report."""
    session_id: str
    overall_readiness: float = Field(ge=0, le=100, description="Overall job readiness percentage")
    strengths: list[str] = []
    assessed_skills: list[AssessedSkill] = []
    gaps: list[SkillGap] = []
    summary: str = ""


class LearningResource(BaseModel):
    """A single learning resource."""
    title: str
    url: str
    platform: str = Field(description="e.g. Coursera, YouTube, Udemy, Docs")
    resource_type: str = Field(description="course | tutorial | documentation | project | book")
    is_free: bool = True
    estimated_hours: float = Field(default=0)


class LearningItem(BaseModel):
    """Learning plan for a single skill gap."""
    skill_name: str
    current_level: int
    target_level: int
    difficulty: Difficulty
    estimated_weeks: float
    estimated_hours: float
    is_quick_win: bool = Field(default=False, description="Achievable in < 1 week")
    adjacent_skills_to_leverage: list[str] = []
    learning_approach: str = Field(default="", description="Recommended strategy")
    resources: list[LearningResource] = []
    milestones: list[str] = Field(default_factory=list, description="Key milestones to track progress")


class LearningPlan(BaseModel):
    """Complete personalized learning plan."""
    session_id: str
    candidate_summary: str = ""
    total_estimated_weeks: float = 0
    total_estimated_hours: float = 0
    quick_wins: list[LearningItem] = []
    core_learning: list[LearningItem] = []
    stretch_goals: list[LearningItem] = []
    weekly_schedule_suggestion: str = ""


# ─── Session State ───────────────────────────────────────────────────────

class ChatMessage(BaseModel):
    """A single chat message."""
    role: str = Field(description="user | assistant | system")
    content: str
    timestamp: datetime = Field(default_factory=datetime.now)


class AssessmentSession(BaseModel):
    """In-memory session state for an assessment."""
    session_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    job_description: str = ""
    resume_text: str = ""
    job_title: str = ""
    company: str = ""
    required_skills: list[RequiredSkill] = []
    candidate_skills: list[CandidateSkill] = []
    assessed_skills: list[AssessedSkill] = []
    chat_history: list[ChatMessage] = []
    current_skill_index: int = 0
    is_complete: bool = False
    initial_match_score: float = 0.0
