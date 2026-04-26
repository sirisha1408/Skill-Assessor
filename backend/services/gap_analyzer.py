"""
Gap analysis service — compares required vs assessed skills, identifies gaps and adjacent skills.
"""

import json
import os
from google import genai
from models.schemas import (
    AssessmentSession, GapReport, SkillGap,
    GapSeverity, AssessedSkill
)
from utils.prompts import GAP_ANALYSIS_PROMPT

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


def _normalize_severity(severity: str) -> GapSeverity:
    """Normalize severity string to enum."""
    severity = severity.lower().strip()
    mapping = {
        "critical": GapSeverity.CRITICAL,
        "moderate": GapSeverity.MODERATE,
        "minor": GapSeverity.MINOR,
    }
    return mapping.get(severity, GapSeverity.MODERATE)


async def analyze_gaps(session: AssessmentSession) -> GapReport:
    """Generate comprehensive gap analysis from assessment results."""
    
    # Format skills data for the prompt
    skills_data_lines = []
    for skill in session.assessed_skills:
        skills_data_lines.append(
            f"- {skill.name} ({skill.category.value}): "
            f"Required={skill.required_level}, Assessed={skill.assessed_level}, "
            f"Notes: {skill.assessment_notes}"
        )
    
    # Also include required skills that weren't assessed (treated as level 1)
    assessed_names = {s.name.lower() for s in session.assessed_skills}
    for req_skill in session.required_skills:
        if req_skill.name.lower() not in assessed_names:
            skills_data_lines.append(
                f"- {req_skill.name} ({req_skill.category.value}): "
                f"Required={req_skill.required_level}, Assessed=1 (not assessed), "
                f"Notes: Candidate was not assessed on this skill"
            )
    
    candidate_skills_lines = []
    for cs in session.candidate_skills:
        candidate_skills_lines.append(
            f"- {cs.name} ({cs.category.value}): Level={cs.claimed_level}, "
            f"Evidence: {cs.evidence}"
        )
    
    prompt = GAP_ANALYSIS_PROMPT.format(
        job_title=session.job_title or "the role",
        skills_data="\n".join(skills_data_lines),
        candidate_skills="\n".join(candidate_skills_lines),
    )
    
    response = _get_client().models.generate_content(model=MODEL, contents=prompt)
    data = _parse_json_response(response.text)
    
    # Build gap objects
    gaps = []
    for gap in data.get("gaps", []):
        gaps.append(SkillGap(
            skill_name=gap["skill_name"],
            category=gap.get("category", "technical"),
            required_level=int(gap.get("required_level", 5)),
            assessed_level=int(gap.get("assessed_level", 1)),
            gap_delta=int(gap.get("gap_delta", 0)),
            severity=_normalize_severity(gap.get("severity", "moderate")),
            adjacent_skills=gap.get("adjacent_skills", []),
            transferable_experience=gap.get("transferable_experience", ""),
        ))
    
    return GapReport(
        session_id=session.session_id,
        overall_readiness=float(data.get("overall_readiness", 50)),
        strengths=data.get("strengths", []),
        assessed_skills=session.assessed_skills,
        gaps=gaps,
        summary=data.get("summary", ""),
    )
