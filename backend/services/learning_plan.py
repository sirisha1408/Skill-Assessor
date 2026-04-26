"""
Learning plan generation service — creates personalized, resource-rich learning paths.
"""

import json
import os
from google import genai
from models.schemas import (
    AssessmentSession, GapReport, LearningPlan,
    LearningItem, LearningResource, Difficulty, SkillGap
)
from utils.prompts import LEARNING_PLAN_PROMPT

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


def _normalize_difficulty(diff: str) -> Difficulty:
    """Normalize difficulty string to enum."""
    diff = diff.lower().strip()
    mapping = {
        "beginner": Difficulty.BEGINNER,
        "intermediate": Difficulty.INTERMEDIATE,
        "advanced": Difficulty.ADVANCED,
    }
    return mapping.get(diff, Difficulty.INTERMEDIATE)


def _build_learning_item(item_data: dict) -> LearningItem:
    """Build a LearningItem from raw JSON data."""
    resources = []
    for res in item_data.get("resources", []):
        resources.append(LearningResource(
            title=res.get("title", ""),
            url=res.get("url", "#"),
            platform=res.get("platform", ""),
            resource_type=res.get("resource_type", "course"),
            is_free=res.get("is_free", True),
            estimated_hours=float(res.get("estimated_hours", 0)),
        ))
    
    return LearningItem(
        skill_name=item_data.get("skill_name", ""),
        current_level=int(item_data.get("current_level", 1)),
        target_level=int(item_data.get("target_level", 5)),
        difficulty=_normalize_difficulty(item_data.get("difficulty", "intermediate")),
        estimated_weeks=float(item_data.get("estimated_weeks", 1)),
        estimated_hours=float(item_data.get("estimated_hours", 10)),
        is_quick_win=bool(item_data.get("is_quick_win", False)),
        adjacent_skills_to_leverage=item_data.get("adjacent_skills_to_leverage", []),
        learning_approach=item_data.get("learning_approach", ""),
        resources=resources,
        milestones=item_data.get("milestones", []),
    )


async def generate_learning_plan(
    session: AssessmentSession,
    gap_report: GapReport,
) -> LearningPlan:
    """Generate a personalized learning plan from gap analysis."""
    
    # Format data for the prompt
    strengths = ", ".join(gap_report.strengths) if gap_report.strengths else "None identified"
    
    existing_skills = ", ".join([
        f"{s.name} (level {s.claimed_level})"
        for s in session.candidate_skills[:20]
    ])
    
    gaps_lines = []
    for gap in gap_report.gaps:
        gaps_lines.append(
            f"- {gap.skill_name} ({gap.category}): "
            f"Current={gap.assessed_level}, Required={gap.required_level}, "
            f"Gap={gap.gap_delta}, Severity={gap.severity.value}, "
            f"Adjacent skills: {', '.join(gap.adjacent_skills) if gap.adjacent_skills else 'none'}"
        )
    
    prompt = LEARNING_PLAN_PROMPT.format(
        strengths=strengths,
        existing_skills=existing_skills or "Various technical skills",
        gaps_data="\n".join(gaps_lines) if gaps_lines else "No significant gaps identified",
    )
    
    response = _get_client().models.generate_content(model=MODEL, contents=prompt)
    data = _parse_json_response(response.text)
    
    # Build learning items from the combined items list
    all_items = [_build_learning_item(item) for item in data.get("items", [])]
    
    # Separate into categories
    quick_wins = [item for item in all_items if item.is_quick_win]
    core_learning = [item for item in all_items if not item.is_quick_win and item.estimated_weeks <= 8]
    stretch_goals = [item for item in all_items if not item.is_quick_win and item.estimated_weeks > 8]
    
    # Also check if the API returned pre-categorized items
    if data.get("quick_wins"):
        quick_wins = [_build_learning_item(item) for item in data["quick_wins"]]
    if data.get("core_learning"):
        core_learning = [_build_learning_item(item) for item in data["core_learning"]]
    if data.get("stretch_goals"):
        stretch_goals = [_build_learning_item(item) for item in data["stretch_goals"]]
    
    return LearningPlan(
        session_id=session.session_id,
        candidate_summary=data.get("candidate_summary", ""),
        total_estimated_weeks=float(data.get("total_estimated_weeks", 0)),
        total_estimated_hours=float(data.get("total_estimated_hours", 0)),
        quick_wins=quick_wins,
        core_learning=core_learning,
        stretch_goals=stretch_goals,
        weekly_schedule_suggestion=data.get("weekly_schedule_suggestion", ""),
    )
