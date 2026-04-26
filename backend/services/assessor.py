"""
Conversational assessment service — manages multi-turn skill evaluation via Gemini.
"""

import json
import os
from google import genai
from models.schemas import (
    AssessmentSession, ChatMessage, AssessedSkill,
    RequiredSkill, CandidateSkill, SkillCategory
)
from utils.prompts import (
    ASSESSMENT_QUESTION_PROMPT,
    RESPONSE_EVALUATION_PROMPT,
    ASSESSMENT_INTRO_PROMPT,
)

_client = None
MODEL = "gemini-2.5-flash"


def _get_client():
    global _client
    if _client is None:
        _client = genai.Client(api_key=os.environ.get("GOOGLE_API_KEY"))
    return _client


def _parse_json_response(text: str) -> dict:
    """Parse JSON from LLM response."""
    text = text.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        text = "\n".join(lines[1:-1])
    return json.loads(text)


def _find_candidate_skill(candidate_skills: list[CandidateSkill], skill_name: str) -> CandidateSkill | None:
    """Find matching candidate skill by name (fuzzy)."""
    skill_lower = skill_name.lower()
    for cs in candidate_skills:
        if cs.name.lower() == skill_lower or skill_lower in cs.name.lower() or cs.name.lower() in skill_lower:
            return cs
    return None


def _format_chat_history(messages: list[ChatMessage], limit: int = 10) -> str:
    """Format recent chat history for prompt context."""
    recent = messages[-limit:] if len(messages) > limit else messages
    if not recent:
        return "No previous conversation."
    
    lines = []
    for msg in recent:
        role_label = "Interviewer" if msg.role == "assistant" else "Candidate"
        lines.append(f"{role_label}: {msg.content}")
    return "\n".join(lines)


async def generate_intro(session: AssessmentSession) -> str:
    """Generate the opening message for the assessment."""
    if not session.required_skills:
        return "I don't see any skills to assess. Please go back and provide a job description."
    
    first_skill = session.required_skills[0]
    candidate_summary = ", ".join([s.name for s in session.candidate_skills[:10]])
    
    prompt = ASSESSMENT_INTRO_PROMPT.format(
        job_title=session.job_title or "the role",
        candidate_summary=candidate_summary or "various technologies",
        first_skill=first_skill.name,
        required_level=first_skill.required_level,
    )
    
    response = _get_client().models.generate_content(model=MODEL, contents=prompt)
    return response.text


async def generate_intro_stream(session: AssessmentSession):
    """Generate the opening message as a stream."""
    if not session.required_skills:
        yield "I don't see any skills to assess. Please go back and provide a job description."
        return
    
    first_skill = session.required_skills[0]
    candidate_summary = ", ".join([s.name for s in session.candidate_skills[:10]])
    
    prompt = ASSESSMENT_INTRO_PROMPT.format(
        job_title=session.job_title or "the role",
        candidate_summary=candidate_summary or "various technologies",
        first_skill=first_skill.name,
        required_level=first_skill.required_level,
    )
    
    for chunk in _get_client().models.generate_content_stream(model=MODEL, contents=prompt):
        if chunk.text:
            yield chunk.text


async def ask_question_stream(session: AssessmentSession):
    """Generate the next assessment question as a stream."""
    idx = session.current_skill_index
    if idx >= len(session.required_skills):
        yield "We've covered all the skills! Let me prepare your assessment report."
        return
    
    skill = session.required_skills[idx]
    candidate_skill = _find_candidate_skill(session.candidate_skills, skill.name)
    
    # Determine if this is a follow-up question
    skill_questions = [
        m for m in session.chat_history
        if m.role == "assistant" and skill.name.lower() in m.content.lower()
    ]
    
    follow_up_context = ""
    if skill_questions:
        follow_up_context = "This is a FOLLOW-UP question. Ask something deeper based on their previous answer."
    else:
        follow_up_context = "This is the FIRST question for this skill. Introduce the topic naturally."
    
    prompt = ASSESSMENT_QUESTION_PROMPT.format(
        skill_name=skill.name,
        skill_category=skill.category.value,
        skill_context=skill.context,
        required_level=skill.required_level,
        claimed_level=candidate_skill.claimed_level if candidate_skill else 5,
        evidence=candidate_skill.evidence if candidate_skill else "No specific evidence in resume",
        chat_history=_format_chat_history(session.chat_history),
        follow_up_context=follow_up_context,
    )
    
    for chunk in _get_client().models.generate_content_stream(model=MODEL, contents=prompt):
        if chunk.text:
            yield chunk.text


async def evaluate_response(session: AssessmentSession, user_response: str) -> dict:
    """Evaluate the candidate's response to an assessment question."""
    idx = session.current_skill_index
    if idx >= len(session.required_skills):
        return {
            "assessed_level": 0,
            "confidence": 0,
            "assessment_notes": "Assessment complete",
            "needs_followup": False,
            "followup_reason": "",
        }
    
    skill = session.required_skills[idx]
    
    # Get the last assistant message as the question
    last_question = ""
    for msg in reversed(session.chat_history):
        if msg.role == "assistant":
            last_question = msg.content
            break
    
    # Get previous Q&A for this skill
    previous_qa = _format_chat_history(session.chat_history[-6:])
    
    prompt = RESPONSE_EVALUATION_PROMPT.format(
        skill_name=skill.name,
        required_level=skill.required_level,
        question=last_question,
        response=user_response,
        previous_qa=previous_qa,
    )
    
    response = _get_client().models.generate_content(model=MODEL, contents=prompt)
    evaluation = _parse_json_response(response.text)
    
    # Determine if we should move to the next skill
    needs_followup = evaluation.get("needs_followup", False)
    
    # Count questions asked for current skill
    questions_for_skill = sum(
        1 for m in session.chat_history
        if m.role == "assistant" and m != session.chat_history[0]  # Exclude intro
    )
    
    # Max 3 questions per skill (including follow-ups)
    if questions_for_skill >= 3:
        needs_followup = False
    
    if not needs_followup:
        # Record the assessed skill and move on
        candidate_skill = _find_candidate_skill(session.candidate_skills, skill.name)
        assessed = AssessedSkill(
            name=skill.name,
            category=skill.category,
            required_level=skill.required_level,
            claimed_level=candidate_skill.claimed_level if candidate_skill else 5,
            assessed_level=min(max(int(evaluation.get("assessed_level", 5)), 1), 10),
            confidence=min(max(float(evaluation.get("confidence", 0.7)), 0), 1),
            assessment_notes=evaluation.get("assessment_notes", ""),
            questions_asked=questions_for_skill + 1,
        )
        session.assessed_skills.append(assessed)
        session.current_skill_index += 1
        
        if session.current_skill_index >= len(session.required_skills):
            session.is_complete = True
    
    return {
        **evaluation,
        "needs_followup": needs_followup,
        "skill_complete": not needs_followup,
        "current_skill": skill.name,
        "skills_assessed": len(session.assessed_skills),
        "total_skills": len(session.required_skills),
        "is_complete": session.is_complete,
    }
