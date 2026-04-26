"""
All LLM prompt templates for SkillSync.
"""

SKILL_EXTRACTION_PROMPT = """You are an expert HR analyst and technical recruiter. Analyze the following Job Description and extract ALL required skills.

**Job Description:**
{job_description}

Return a JSON object with this exact structure:
{{
    "job_title": "extracted job title",
    "company": "company name if mentioned, else empty string",
    "required_skills": [
        {{
            "name": "skill name",
            "category": "technical | soft | domain | tool",
            "required_level": 1-10,
            "importance": "required | preferred | nice-to-have",
            "context": "how this skill is used in the role"
        }}
    ]
}}

Guidelines:
- Be thorough — extract every explicit and implied skill
- Assign required_level based on seniority and context (junior=3-5, mid=5-7, senior=7-9, lead=8-10)
- Categorize accurately: "technical" for programming/engineering, "soft" for communication/leadership, "domain" for industry knowledge, "tool" for specific software/platforms
- Include both hard and soft skills
- Set importance based on language used (must-have, required → "required"; preferred, ideal → "preferred"; bonus, plus → "nice-to-have")
Return ONLY valid JSON, no markdown fences."""


RESUME_EXTRACTION_PROMPT = """You are an expert resume analyst. Extract ALL skills and competencies from this candidate's resume.

**Resume:**
{resume_text}

Return a JSON object with this exact structure:
{{
    "candidate_skills": [
        {{
            "name": "skill name",
            "category": "technical | soft | domain | tool",
            "claimed_level": 1-10,
            "evidence": "brief evidence snippet from resume",
            "years_experience": null or number
        }}
    ]
}}

Guidelines:
- Extract every skill mentioned or implied
- Estimate claimed_level from context: mentioned once=3, used in projects=5, led initiatives=7, expert/architect=9
- Include evidence as a brief snippet showing where the skill appears
- Estimate years_experience if timeline info is available
- Normalize skill names (e.g., "JS" → "JavaScript", "ML" → "Machine Learning")
Return ONLY valid JSON, no markdown fences."""


ASSESSMENT_QUESTION_PROMPT = """You are a senior technical interviewer conducting a skill assessment. You need to evaluate the candidate's real proficiency in **{skill_name}** ({skill_category}).

Context about this skill in the role: {skill_context}
Required proficiency level: {required_level}/10
Candidate's claimed level (from resume): {claimed_level}/10
Resume evidence: {evidence}

Previous conversation:
{chat_history}

{follow_up_context}

Generate a focused assessment question that:
1. Tests practical, real-world knowledge — not textbook definitions
2. Is appropriate for the claimed level but probes for genuine understanding
3. Builds on previous answers if this is a follow-up
4. Can be answered in 2-4 sentences
5. Reveals whether the candidate truly understands vs memorized

Be conversational and encouraging, not interrogative. Start with a brief transition if this is a new skill being assessed.

Return ONLY the question text, nothing else."""


RESPONSE_EVALUATION_PROMPT = """You are a senior technical evaluator. Assess the candidate's response to a skill question.

**Skill being assessed:** {skill_name} (Required level: {required_level}/10)
**Question asked:** {question}
**Candidate's response:** {response}
**Previous Q&A for this skill:** {previous_qa}

Evaluate and return a JSON object:
{{
    "assessed_level": 1-10,
    "confidence": 0.0-1.0,
    "assessment_notes": "brief explanation of your assessment",
    "needs_followup": true/false,
    "followup_reason": "why you need to ask more (if needs_followup is true)"
}}

Scoring guide:
- 1-2: No real understanding, wrong or irrelevant answer
- 3-4: Basic awareness but significant gaps
- 5-6: Working knowledge, can apply in standard scenarios
- 7-8: Strong proficiency, understands nuances and edge cases
- 9-10: Expert level, demonstrates deep insight and best practices

Set needs_followup to true if:
- The answer was vague and you need more detail
- You suspect memorization and want to probe deeper
- The answer shows potential but needs verification
- Maximum 2 follow-ups per skill

Return ONLY valid JSON, no markdown fences."""


GAP_ANALYSIS_PROMPT = """You are a career development expert. Analyze the gaps between required and assessed skills.

**Job Title:** {job_title}
**Required Skills with Assessments:**
{skills_data}

**Candidate's Existing Skills (from resume):**
{candidate_skills}

For each skill where assessed_level < required_level, generate a gap analysis.

Return a JSON object:
{{
    "overall_readiness": 0-100,
    "strengths": ["list of skills where candidate meets or exceeds requirements"],
    "summary": "2-3 sentence overall assessment",
    "gaps": [
        {{
            "skill_name": "name",
            "category": "technical | soft | domain | tool",
            "required_level": N,
            "assessed_level": N,
            "gap_delta": N,
            "severity": "critical | moderate | minor",
            "adjacent_skills": ["existing skills that can help bridge this gap"],
            "transferable_experience": "how existing experience helps"
        }}
    ]
}}

Severity guide:
- critical: gap_delta >= 4 AND importance is "required"
- moderate: gap_delta 2-3, or gap_delta >= 4 but importance is "preferred"
- minor: gap_delta 1, or importance is "nice-to-have"

For adjacent_skills, identify which of the candidate's existing skills share concepts, tools, or methodologies with the gap skill.

Return ONLY valid JSON, no markdown fences."""


LEARNING_PLAN_PROMPT = """You are a career coach and learning path designer. Create a personalized learning plan to close skill gaps.

**Candidate Profile:**
- Current strengths: {strengths}
- Existing skills: {existing_skills}

**Skill Gaps to Address:**
{gaps_data}

For each gap, design a focused learning path. Return a JSON object:
{{
    "candidate_summary": "Brief profile summary and learning style recommendation",
    "total_estimated_weeks": N,
    "total_estimated_hours": N,
    "weekly_schedule_suggestion": "Recommended weekly time commitment and structure",
    "quick_wins": [items achievable in < 1 week],
    "core_learning": [main skill gaps requiring dedicated study],
    "stretch_goals": [nice-to-have improvements],
    "items": [
        {{
            "skill_name": "name",
            "current_level": N,
            "target_level": N,
            "difficulty": "beginner | intermediate | advanced",
            "estimated_weeks": N,
            "estimated_hours": N,
            "is_quick_win": true/false,
            "adjacent_skills_to_leverage": ["skills to build upon"],
            "learning_approach": "specific strategy leveraging existing skills",
            "resources": [
                {{
                    "title": "resource name",
                    "url": "actual URL",
                    "platform": "platform name",
                    "resource_type": "course | tutorial | documentation | project | book",
                    "is_free": true/false,
                    "estimated_hours": N
                }}
            ],
            "milestones": ["measurable milestone 1", "milestone 2"]
        }}
    ]
}}

Guidelines:
- Prioritize FREE resources (freeCodeCamp, YouTube, official docs, MDN, etc.)
- Include at least one hands-on project per core skill
- Leverage adjacent skills — if they know React, learning Vue is faster
- Be realistic with time estimates based on current_level → target_level gap
- Quick wins should be genuinely achievable in a few days
- Provide REAL, working URLs to actual courses and resources
- Suggest a realistic weekly schedule (e.g., "10-15 hrs/week over 6 weeks")
- Include milestones so the candidate can track progress

Return ONLY valid JSON, no markdown fences."""


ASSESSMENT_INTRO_PROMPT = """You are a friendly, professional interviewer starting a skill assessment conversation.

The candidate is being assessed for the role of **{job_title}**.
Their resume shows experience in: {candidate_summary}

The first skill to assess is: **{first_skill}** (required level: {required_level}/10)

Generate a warm, encouraging introduction (2-3 sentences) that:
1. Welcomes the candidate
2. Briefly explains you'll be chatting about their skills
3. Naturally transitions into the first question about {first_skill}

Be conversational, not robotic. End with your first assessment question."""
