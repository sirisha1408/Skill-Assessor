"""
SkillSync — AI Skill Assessment Agent
FastAPI backend with SSE streaming, session management, and Gemini integration.
"""

import json
import os
import asyncio
from contextlib import asynccontextmanager
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sse_starlette.sse import EventSourceResponse

from models.schemas import (
    AnalyzeRequest, AnalyzeResponse, ChatRequest, ChatResponse,
    AssessmentSession, ChatMessage, GapReport, LearningPlan,
)
from services.skill_extractor import analyze
from services.assessor import (
    generate_intro_stream, ask_question_stream, evaluate_response
)
from services.gap_analyzer import analyze_gaps
from services.learning_plan import generate_learning_plan
from utils.pdf_parser import extract_text_from_pdf


# ─── In-memory session store ────────────────────────────────────────────
sessions: dict[str, AssessmentSession] = {}
gap_reports: dict[str, GapReport] = {}


# ─── App Setup ───────────────────────────────────────────────────────────

app = FastAPI(
    title="SkillSync API",
    description="AI-powered skill assessment and learning plan agent",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Health Check ────────────────────────────────────────────────────────

@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "SkillSync"}


# ─── Analyze Endpoint ───────────────────────────────────────────────────

@app.post("/api/analyze", response_model=AnalyzeResponse)
async def analyze_endpoint(
    job_description: str = Form(...),
    resume_text: str = Form(default=""),
    resume_file: UploadFile | None = File(default=None),
):
    """
    Extract skills from JD and resume, create assessment session.
    Accepts either resume_text or resume_file (PDF).
    """
    # Get resume text
    final_resume_text = resume_text
    
    if resume_file and resume_file.filename:
        if not resume_file.filename.lower().endswith(".pdf"):
            raise HTTPException(400, "Only PDF files are supported")
        
        pdf_bytes = await resume_file.read()
        if len(pdf_bytes) == 0:
            raise HTTPException(400, "Empty file uploaded")
        
        try:
            final_resume_text = extract_text_from_pdf(pdf_bytes)
        except ValueError as e:
            raise HTTPException(400, str(e))
    
    if not final_resume_text.strip():
        raise HTTPException(400, "Resume text is required (paste text or upload PDF)")
    
    if len(job_description.strip()) < 50:
        raise HTTPException(400, "Job description is too short (min 50 characters)")
    
    try:
        result = await analyze(job_description, final_resume_text)
    except Exception as e:
        raise HTTPException(500, f"Analysis failed: {str(e)}")
    
    # Create session
    session = AssessmentSession(
        session_id=result.session_id,
        job_description=job_description,
        resume_text=final_resume_text,
        job_title=result.job_title,
        company=result.company,
        required_skills=result.required_skills,
        candidate_skills=result.candidate_skills,
        initial_match_score=result.initial_match_score,
    )
    sessions[session.session_id] = session
    
    return result


# ─── Chat SSE Endpoint ──────────────────────────────────────────────────

@app.get("/api/chat/start")
async def chat_start(session_id: str = Query(...)):
    """Start the assessment conversation with an intro message (SSE stream)."""
    session = sessions.get(session_id)
    if not session:
        raise HTTPException(404, "Session not found")
    
    async def event_generator():
        full_text = ""
        async for chunk in _async_wrapper(generate_intro_stream(session)):
            full_text += chunk
            yield {
                "event": "chunk",
                "data": json.dumps({"text": chunk})
            }
        
        # Save to chat history
        session.chat_history.append(ChatMessage(role="assistant", content=full_text))
        
        yield {
            "event": "done",
            "data": json.dumps({
                "current_skill": session.required_skills[0].name if session.required_skills else None,
                "skills_assessed": 0,
                "total_skills": len(session.required_skills),
                "is_complete": False,
            })
        }
    
    return EventSourceResponse(event_generator())


@app.post("/api/chat/message")
async def chat_message(request: ChatRequest):
    """
    Process user's response and return evaluation + next question via SSE.
    """
    session = sessions.get(request.session_id)
    if not session:
        raise HTTPException(404, "Session not found")
    
    if session.is_complete:
        raise HTTPException(400, "Assessment already complete")
    
    # Save user message
    session.chat_history.append(ChatMessage(role="user", content=request.message))
    
    # Evaluate the response
    try:
        evaluation = await evaluate_response(session, request.message)
    except Exception as e:
        raise HTTPException(500, f"Evaluation failed: {str(e)}")
    
    # If assessment is complete, return completion signal
    if evaluation.get("is_complete"):
        return {
            "evaluation": evaluation,
            "message": "Assessment complete! You can now generate your gap analysis and learning plan.",
            "is_complete": True,
            "skills_assessed": evaluation.get("skills_assessed", 0),
            "total_skills": evaluation.get("total_skills", 0),
        }
    
    return {
        "evaluation": evaluation,
        "is_complete": False,
        "skills_assessed": evaluation.get("skills_assessed", 0),
        "total_skills": evaluation.get("total_skills", 0),
        "current_skill": evaluation.get("current_skill", ""),
    }


@app.get("/api/chat/next-question")
async def chat_next_question(session_id: str = Query(...)):
    """Stream the next assessment question via SSE."""
    session = sessions.get(session_id)
    if not session:
        raise HTTPException(404, "Session not found")
    
    async def event_generator():
        full_text = ""
        async for chunk in _async_wrapper(ask_question_stream(session)):
            full_text += chunk
            yield {
                "event": "chunk",
                "data": json.dumps({"text": chunk})
            }
        
        session.chat_history.append(ChatMessage(role="assistant", content=full_text))
        
        current_skill = None
        if session.current_skill_index < len(session.required_skills):
            current_skill = session.required_skills[session.current_skill_index].name
        
        yield {
            "event": "done",
            "data": json.dumps({
                "current_skill": current_skill,
                "skills_assessed": len(session.assessed_skills),
                "total_skills": len(session.required_skills),
                "is_complete": session.is_complete,
            })
        }
    
    return EventSourceResponse(event_generator())


# ─── Report Endpoints ───────────────────────────────────────────────────

@app.post("/api/report/gaps", response_model=GapReport)
async def generate_gap_report(session_id: str = Query(...)):
    """Generate gap analysis report from completed assessment."""
    session = sessions.get(session_id)
    if not session:
        raise HTTPException(404, "Session not found")
    
    if not session.assessed_skills:
        raise HTTPException(400, "No skills have been assessed yet")
    
    try:
        report = await analyze_gaps(session)
        gap_reports[session_id] = report
        return report
    except Exception as e:
        raise HTTPException(500, f"Gap analysis failed: {str(e)}")


@app.post("/api/report/learning-plan", response_model=LearningPlan)
async def generate_learning_plan_endpoint(session_id: str = Query(...)):
    """Generate personalized learning plan from gap analysis."""
    session = sessions.get(session_id)
    if not session:
        raise HTTPException(404, "Session not found")
    
    report = gap_reports.get(session_id)
    if not report:
        raise HTTPException(400, "Generate gap analysis first")
    
    try:
        plan = await generate_learning_plan(session, report)
        return plan
    except Exception as e:
        raise HTTPException(500, f"Learning plan generation failed: {str(e)}")


@app.get("/api/session/{session_id}")
async def get_session(session_id: str):
    """Get current session state."""
    session = sessions.get(session_id)
    if not session:
        raise HTTPException(404, "Session not found")
    
    return {
        "session_id": session.session_id,
        "job_title": session.job_title,
        "company": session.company,
        "skills_total": len(session.required_skills),
        "skills_assessed": len(session.assessed_skills),
        "current_skill_index": session.current_skill_index,
        "is_complete": session.is_complete,
        "initial_match_score": session.initial_match_score,
    }


# ─── Helpers ─────────────────────────────────────────────────────────────

async def _async_wrapper(sync_gen):
    """Wrap a sync generator to async."""
    for item in sync_gen:
        yield item
        await asyncio.sleep(0)


# ─── Run ─────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
