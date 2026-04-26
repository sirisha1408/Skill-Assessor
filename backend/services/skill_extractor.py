"""
Skill extraction service — uses Gemini to parse JD and Resume into structured skill profiles.
"""

import json
import os
from google import genai
from models.schemas import (
    RequiredSkill, CandidateSkill, SkillCategory, AnalyzeResponse
)
from utils.prompts import SKILL_EXTRACTION_PROMPT, RESUME_EXTRACTION_PROMPT

_client = None
MODEL = "gemini-2.5-flash"


def _get_client():
    global _client
    if _client is None:
        _client = genai.Client(api_key=os.environ.get("GOOGLE_API_KEY"))
    return _client


def _parse_json_response(text: str) -> dict:
    """Parse JSON from LLM response, handling potential markdown fences."""
    text = text.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        # Remove first and last lines (fences)
        text = "\n".join(lines[1:-1])
    return json.loads(text)


def _normalize_category(cat: str) -> SkillCategory:
    """Normalize category string to enum."""
    cat = cat.lower().strip()
    mapping = {
        "technical": SkillCategory.TECHNICAL,
        "soft": SkillCategory.SOFT,
        "domain": SkillCategory.DOMAIN,
        "tool": SkillCategory.TOOL,
    }
    return mapping.get(cat, SkillCategory.TECHNICAL)


async def extract_skills_from_jd(job_description: str) -> dict:
    """Extract required skills from a job description."""
    prompt = SKILL_EXTRACTION_PROMPT.format(job_description=job_description)
    
    response = _get_client().models.generate_content(
        model=MODEL,
        contents=prompt,
    )
    
    data = _parse_json_response(response.text)
    
    required_skills = []
    for skill in data.get("required_skills", []):
        required_skills.append(RequiredSkill(
            name=skill["name"],
            category=_normalize_category(skill.get("category", "technical")),
            required_level=min(max(int(skill.get("required_level", 5)), 1), 10),
            importance=skill.get("importance", "required"),
            context=skill.get("context", ""),
        ))
    
    return {
        "job_title": data.get("job_title", ""),
        "company": data.get("company", ""),
        "required_skills": required_skills,
    }


async def extract_skills_from_resume(resume_text: str) -> list[CandidateSkill]:
    """Extract candidate skills from resume text."""
    prompt = RESUME_EXTRACTION_PROMPT.format(resume_text=resume_text)
    
    response = _get_client().models.generate_content(
        model=MODEL,
        contents=prompt,
    )
    
    data = _parse_json_response(response.text)
    
    candidate_skills = []
    for skill in data.get("candidate_skills", []):
        candidate_skills.append(CandidateSkill(
            name=skill["name"],
            category=_normalize_category(skill.get("category", "technical")),
            claimed_level=min(max(int(skill.get("claimed_level", 5)), 1), 10),
            evidence=skill.get("evidence", ""),
            years_experience=skill.get("years_experience"),
        ))
    
    return candidate_skills


def compute_initial_match(
    required_skills: list[RequiredSkill],
    candidate_skills: list[CandidateSkill],
) -> tuple[float, list[str], list[str]]:
    """
    Compute initial match score between required and candidate skills.
    Returns (match_percentage, overlapping_skills, missing_skills).
    """
    required_names = {s.name.lower() for s in required_skills}
    candidate_names = {s.name.lower() for s in candidate_skills}
    
    # Fuzzy matching — check for substring matches too
    overlap = set()
    for req in required_names:
        for cand in candidate_names:
            if req in cand or cand in req or _are_similar(req, cand):
                overlap.add(req)
                break
    
    missing = required_names - overlap
    
    match_pct = (len(overlap) / len(required_names) * 100) if required_names else 0
    
    # Get original case names
    overlap_names = [s.name for s in required_skills if s.name.lower() in overlap]
    missing_names = [s.name for s in required_skills if s.name.lower() in missing]
    
    return round(match_pct, 1), overlap_names, missing_names


def _are_similar(a: str, b: str) -> bool:
    """Simple similarity check for skill names."""
    # Handle common aliases
    aliases = {
        "javascript": ["js", "ecmascript"],
        "typescript": ["ts"],
        "python": ["py"],
        "machine learning": ["ml"],
        "artificial intelligence": ["ai"],
        "natural language processing": ["nlp"],
        "amazon web services": ["aws"],
        "google cloud platform": ["gcp"],
        "microsoft azure": ["azure"],
        "react": ["reactjs", "react.js"],
        "node": ["nodejs", "node.js"],
        "vue": ["vuejs", "vue.js"],
        "angular": ["angularjs", "angular.js"],
        "postgresql": ["postgres"],
        "mongodb": ["mongo"],
        "kubernetes": ["k8s"],
        "continuous integration": ["ci/cd", "ci"],
        "docker": ["containerization"],
    }
    
    for canonical, alt_list in aliases.items():
        names = [canonical] + alt_list
        if a in names and b in names:
            return True
    
    return False


async def analyze(job_description: str, resume_text: str) -> AnalyzeResponse:
    """
    Full analysis pipeline: extract skills from both JD and resume,
    compute initial match, and return structured response.
    """
    jd_data = await extract_skills_from_jd(job_description)
    candidate_skills = await extract_skills_from_resume(resume_text)
    
    match_pct, overlap, missing = compute_initial_match(
        jd_data["required_skills"], candidate_skills
    )
    
    return AnalyzeResponse(
        job_title=jd_data["job_title"],
        company=jd_data["company"],
        required_skills=jd_data["required_skills"],
        candidate_skills=candidate_skills,
        initial_match_score=match_pct,
        skill_overlap=overlap,
        missing_skills=missing,
    )
