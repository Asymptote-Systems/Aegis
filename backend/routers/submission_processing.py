from fastapi import APIRouter, HTTPException, BackgroundTasks, Body, Depends
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
import uuid
import aiohttp
import asyncio
from ..services.submission_processor import submission_processor
from ..auth.dependencies import get_current_user
from ..models import (
    User, Activity, ActivitySubmission, ActivityCodeSubmission,
    ActivityFinalSubmission, ActivityQuestion
)
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from ..database import get_db
import os

router = APIRouter()

# Request models
class RunCodeRequest(BaseModel):
    source_code: str
    language: str
    stdin: Optional[str] = ""

class UpdateMarksRequest(BaseModel):
    marks: float

# Configuration for run code limits
RUN_CODE_CONFIG = {
    "cpu_time_limit": 5,  # 5 seconds
    "memory_limit": 128000,  # 128MB in kb
    "max_processes_and_or_threads": 60,
    "enable_per_process_and_thread_time_limit": True,
    "enable_per_process_and_thread_memory_limit": True,
    "max_file_size": 1024  # 1MB
}

def get_language_id(language: str) -> int:
    """Map language string to Judge0 language ID"""
    language_map = {
        "python3": 71,
        "python": 71,
        "java": 62,
        "cpp": 54,
        "c": 50,
        "javascript": 63
    }
    return language_map.get(language.lower(), 71)  # Default to Python

@router.post("/submissions/execute")
async def execute_code(request: RunCodeRequest):
    """Execute code using Judge0 API"""
    try:
        # Judge0 API endpoint
        judge0_url = os.getenv("JUDGE0_URL", "http://localhost:2358")
        
        async with aiohttp.ClientSession() as session:
            # Create submission
            async with session.post(
                f"{judge0_url}/submissions",
                json={
                    "source_code": request.source_code,
                    "language_id": get_language_id(request.language),
                    "stdin": request.stdin,
                    **RUN_CODE_CONFIG
                }
            ) as response:
                submission = await response.json()
                token = submission.get("token")

                if not token:
                    raise HTTPException(status_code=500, detail="Failed to create submission")

            # Wait for results
            while True:
                await asyncio.sleep(1)  # Polling interval
                async with session.get(
                    f"{judge0_url}/submissions/{token}"
                ) as response:
                    result = await response.json()
                    if result.get("status", {}).get("id") not in [1, 2]:  # Not queued or processing
                        break

            return {
                "status": result.get("status", {}).get("description", "Unknown"),
                "output": result.get("stdout", ""),
                "error": result.get("stderr", ""),
                "compile_output": result.get("compile_output", ""),
                "time": result.get("time", "0"),
                "memory": result.get("memory", "0")
            }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/activities/{activity_id}/submissions")
async def get_activity_submissions(
    activity_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all submissions for an activity"""
    try:
        submissions = db.query(ActivityFinalSubmission)\
            .filter(ActivityFinalSubmission.activity_id == activity_id)\
            .all()

        return [{
            "id": str(sub.id),
            "student_id": str(sub.student_id),
            "student_name": sub.student.student_profile.full_name,
            "submitted_at": sub.submitted_at,
            "status": sub.status,
            "score": sub.total_marks,
            "questions": [
                {
                    "number": q.question_number,
                    "context": q.context,
                    "code": q.code,
                    "language": q.language,
                    "marks": q.marks
                }
                for q in db.query(ActivityQuestion)\
                    .filter(ActivityQuestion.submission_id == sub.id)\
                    .all()
            ]
        } for sub in submissions]

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/submissions/{submission_id}/question/{question_number}")
async def update_question_marks(
    submission_id: str,
    question_number: int,
    request: UpdateMarksRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update marks for a specific question in a submission"""
    try:
        # Verify user is a teacher
        if current_user.role != "teacher":
            raise HTTPException(status_code=403, detail="Only teachers can update marks")

        # Update question marks
        question = db.query(ActivityQuestion)\
            .filter(
                ActivityQuestion.submission_id == submission_id,
                ActivityQuestion.question_number == question_number
            )\
            .first()

        if not question:
            raise HTTPException(status_code=404, detail="Question not found")

        question.marks = request.marks
        db.commit()

        # Update total marks in final submission
        submission = db.query(ActivityFinalSubmission)\
            .filter(ActivityFinalSubmission.id == submission_id)\
            .first()

        if submission:
            total_marks = db.query(func.sum(ActivityQuestion.marks))\
                .filter(ActivityQuestion.submission_id == submission_id)\
                .scalar() or 0
            
            submission.total_marks = total_marks
            db.commit()

        return {"message": "Marks updated successfully"}

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/exams/{exam_id}/run-code")
async def run_code(
    exam_id: str,
    request: RunCodeRequest
):
    """
    Run user code during exam with immediate feedback
    This is a stateless operation - results are not saved
    """
    try:
        # Validate inputs
        if not request.source_code.strip():
            raise HTTPException(status_code=400, detail="Source code cannot be empty")
        
        if not request.language:
            raise HTTPException(status_code=400, detail="Language must be specified")

        # Prepare Judge0 submission
        language_id = get_language_id(request.language)
        
        # Get Judge0 API URL (use service name for Docker)
        judge0_api_url = os.getenv("JUDGE0_API_URL", "http://server:2358/")
        
        submission_payload = {
            "source_code": request.source_code,
            "language_id": language_id,
            "stdin": request.stdin or "",
            "cpu_time_limit": RUN_CODE_CONFIG["cpu_time_limit"],
            "memory_limit": RUN_CODE_CONFIG["memory_limit"],
            "max_processes_and_or_threads": RUN_CODE_CONFIG["max_processes_and_or_threads"],
            "enable_per_process_and_thread_time_limit": RUN_CODE_CONFIG["enable_per_process_and_thread_time_limit"],
            "enable_per_process_and_thread_memory_limit": RUN_CODE_CONFIG["enable_per_process_and_thread_memory_limit"],
            "max_file_size": RUN_CODE_CONFIG["max_file_size"]
        }

        async with aiohttp.ClientSession() as session:
            # Submit to Judge0 with wait=true for synchronous response
            async with session.post(
                f"{judge0_api_url}submissions?wait=true",
                json=submission_payload,
                headers={"Content-Type": "application/json"}
            ) as response:
                
                if response.status not in [200, 201]:
                    error_text = await response.text()
                    raise HTTPException(
                        status_code=response.status, 
                        detail=f"Judge0 execution error: {error_text}"
                    )
                
                result = await response.json()
                
                # Extract status information
                status_info = result.get("status", {})
                status_id = status_info.get("id") if isinstance(status_info, dict) else None
                status_description = status_info.get("description") if isinstance(status_info, dict) else "Unknown"
                
                # Prepare response
                execution_result = {
                    "success": True,
                    "stdout": result.get("stdout", ""),
                    "stderr": result.get("stderr", ""),
                    "compile_output": result.get("compile_output", ""),
                    "exit_code": result.get("exit_code", 0),
                    "status_id": status_id,
                    "status": status_description,
                    "execution_time": float(result.get("time", 0)) if result.get("time") else 0,
                    "memory_used": int(result.get("memory", 0)) if result.get("memory") else 0,
                    "language": request.language,
                    "message": get_user_friendly_message(status_id, status_description)
                }
                
                return execution_result
                
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Internal server error during code execution: {str(e)}"
        )

def get_user_friendly_message(status_id: int, status_description: str) -> str:
    """Convert Judge0 status to user-friendly message"""
    status_messages = {
        1: "Code is being processed...",
        2: "Code is running...",
        3: "✅ Code executed successfully!",
        4: "❌ Wrong Answer - Code ran but output doesn't match expected result",
        5: "⏱️ Time Limit Exceeded - Code took too long to execute",
        6: "🔨 Compilation Error - There are syntax or compilation errors in your code",
        7: "💥 Runtime Error (SIGSEGV) - Code crashed during execution",
        8: "💥 Runtime Error (SIGXFSZ) - Code tried to create a file that's too large",
        9: "💥 Runtime Error (SIGFPE) - Code has a division by zero or floating point error",
        10: "💥 Runtime Error (SIGABRT) - Code was aborted during execution",
        11: "💥 Runtime Error (NZEC) - Code exited with non-zero status",
        12: "💥 Runtime Error - Code crashed during execution",
        13: "🔧 Internal Error - Server error occurred while running your code",
        14: "🔧 Exec Format Error - There was an issue with the executable format"
    }
    
    return status_messages.get(status_id, f"Status: {status_description}")

@router.post("/exams/{exam_id}/process-submissions")
async def process_submissions(
    exam_id: str,
    background_tasks: BackgroundTasks
):
    """Start processing submissions for an exam"""
    try:
        # Fetch submissions for the exam
        async with aiohttp.ClientSession() as session:
            host_ip = os.getenv("VITE_HOST_IP")
            async with session.get(
                f"http://{host_ip}:8000/exams/{exam_id}/submissions?skip=0&limit=1000"
            ) as response:
                if response.status != 200:
                    raise HTTPException(
                        status_code=400, 
                        detail="Failed to fetch submissions"
                    )
                submissions = await response.json()
        
        if not submissions:
            raise HTTPException(
                status_code=404, 
                detail="No submissions found for this exam"
            )
        
        # Generate job ID
        job_id = str(uuid.uuid4())
        
        # Start background processing
        background_tasks.add_task(
            submission_processor.process_submissions_batch,
            exam_id,
            submissions,
            job_id
        )
        
        return {
            "job_id": job_id,
            "message": f"Started processing {len(submissions)} submissions",
            "total_submissions": len(submissions)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/processing-jobs/{job_id}/status")
async def get_processing_status(job_id: str):
    """Get processing job status"""
    status = submission_processor.get_job_status(job_id)
    
    if not status:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return status

@router.delete("/processing-jobs/{job_id}")
async def cleanup_processing_job(job_id: str):
    """Clean up completed processing job"""
    submission_processor.cleanup_job(job_id)
    return {"message": "Job cleaned up successfully"}
