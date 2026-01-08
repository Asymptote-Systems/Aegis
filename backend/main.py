"main.py"
"""
FastAPI main application for Online Exam System
Generated routes for all models
"""
from datetime import datetime
from typing import List, Optional
from uuid import UUID
import os

from fastapi import FastAPI, Depends, HTTPException, status, Request, Response, Body, Form, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from fastapi import UploadFile, File, Form, Query
from fastapi.responses import Response, StreamingResponse, FileResponse
from jose import jwt, JWTError
import uuid
from datetime import datetime
import pandas as pd
#from backend.config import settings
import io
import zipfile
import logging
import time
from sqlalchemy import desc, or_, and_, func  # <-- Add func import
from backend.database import Base, engine, get_db, SessionLocal

# Set up logger
logger = logging.getLogger(__name__)
from backend import crud, schemas
from backend.wait_for_db import wait_for_db
from backend.auth.router import router as auth_router
from .routers import submission_processing
from .routers.activities import router as activities_router
from .routers.assessment import router as assessment_router
from .routers.activity_grades import router as activity_grades_router
from .routers.notifications import router as notifications_router

from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from backend.auth.dependencies import require_role, get_current_user
from backend import models as dbmodels

from backend import models, schemas, crud

from backend.auth.passwords import hash_password

from backend.importers.leetcode_jsonl_import import import_from_jsonl_files

from backend.bootstrap import bootstrap_admin

try:
    import pandas as pd
    PANDAS_AVAILABLE = True
except ImportError:
    PANDAS_AVAILABLE = False
    pd = None


import io

import logging
from datetime import datetime, timedelta
from sqlalchemy import func, desc, and_, or_
import json
from collections import Counter, defaultdict

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- App init ---
app = FastAPI(title="Online Exam System API", version="1.0.0", openapi_url=None, docs_url=None, redoc_url=None,)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Ideally, you'd want to specify your frontend URL here
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

STUDENT_EMAIL_DOMAIN = "ch.students.amrita.edu"  # Change this as needed

# --- Security headers middleware (basic hardening) ---
@app.middleware("http")
async def set_security_headers(request: Request, call_next):
    # Handle OPTIONS requests first
    if request.method == "OPTIONS":
        response = Response()
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "*"
        response.headers["Access-Control-Allow-Credentials"] = "true"
        return response
    
    response: Response = await call_next(request)
    
    # Add security headers for non-OPTIONS requests
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-XSS-Protection", "0")
    response.headers.setdefault("Referrer-Policy", "no-referrer")
    response.headers.setdefault("Permissions-Policy", "geolocation=(), microphone=()")
    
    return response


base_origins = [
    "http://localhost:5173",   # Your main frontend
    "http://localhost:3000",   # Logforge frontend  
    "http://localhost:8080",   # Adminer (if it makes API calls)
    "http://127.0.0.1:5173",   # Alternative localhost
    "http://127.0.0.1:3000",   # Alternative localhost
    "http://127.0.0.1:8080"    # Alternative localhost
]

host_ip = os.getenv("VITE_HOST_IP")
if host_ip:
    base_origins.extend([
        f"http://{host_ip}:5173",  # Your main frontend via IP
        f"http://{host_ip}:3000",  # Logforge frontend via IP
        f"http://{host_ip}:8080"   # Adminer via IP (if needed)
    ])

app.add_middleware(
    CORSMiddleware,
    allow_origins=base_origins,  
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

limiter = Limiter(
    key_func=get_remote_address,  # Rate limit by IP address
    default_limits=["100/minute"]  # Global limit: 100 requests per minute
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

app.include_router(auth_router)
app.include_router(activities_router, prefix="/activities")  # Grouped as "Activities Management" in Swagger
app.include_router(assessment_router, prefix="/api", tags=["assessments"])
app.include_router(activity_grades_router, prefix="/api", tags=["activity-grades"])
app.include_router(notifications_router, prefix="/api", tags=["notifications"])
app.include_router(
    submission_processing.router,
    prefix="",
    tags=["submission-processing"]
)

# --- Startup: wait for DB & create tables ---
@app.on_event("startup")
def on_startup():
    wait_for_db(engine, timeout=60)
    # Import models so Base is populated
    import backend.models 
    Base.metadata.create_all(bind=engine)
    bootstrap_admin()

# --- Health check ---
@app.get("/health", tags=["health"])
def health() -> dict:
    return {"status": "ok"}


# User routes
@app.get("/users/", response_model=List[schemas.User])
def read_users(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    users = crud.get_users(db, skip=skip, limit=limit)
    return users

@app.get("/users/me", response_model=schemas.User)
def get_current_user_info(current_user: dbmodels.User = Depends(get_current_user)):
    """Get current authenticated user information"""
    return current_user

@app.get("/users/{user_id}", response_model=schemas.User)
def read_user(user_id: UUID, db: Session = Depends(get_db)):
    db_user = crud.get_user(db, id=user_id)
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user

@app.post("/users/", response_model=schemas.User)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    return crud.create_user(db=db, obj_in=user)

@app.put("/users/{user_id}", response_model=schemas.User)
def update_user(user_id: UUID, user: schemas.UserUpdate, db: Session = Depends(get_db)):
    db_user = crud.get_user(db, id=user_id)
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return crud.update_user(db=db, db_obj=db_user, obj_in=user)

@app.delete("/users/{user_id}", response_model=schemas.User)
def delete_user(user_id: UUID, db: Session = Depends(get_db)):
    db_user = crud.delete_user(db, id=user_id)
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user

# UserSession routes
@app.get("/user-sessions/", response_model=List[schemas.UserSession])
def read_user_sessions(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    user_sessions = crud.get_user_sessions(db, skip=skip, limit=limit)
    return user_sessions

@app.get("/user-sessions/{session_id}", response_model=schemas.UserSession)
def read_user_session(session_id: UUID, db: Session = Depends(get_db)):
    db_session = crud.get_user_session(db, id=session_id)
    if db_session is None:
        raise HTTPException(status_code=404, detail="User session not found")
    return db_session

@app.post("/user-sessions/", response_model=schemas.UserSession)
def create_user_session(session: schemas.UserSessionCreate, db: Session = Depends(get_db)):
    return crud.create_user_session(db=db, obj_in=session)

@app.put("/user-sessions/{session_id}", response_model=schemas.UserSession)
def update_user_session(session_id: UUID, session: schemas.UserSessionUpdate, db: Session = Depends(get_db)):
    db_session = crud.get_user_session(db, id=session_id)
    if db_session is None:
        raise HTTPException(status_code=404, detail="User session not found")
    return crud.update_user_session(db=db, db_obj=db_session, obj_in=session)

@app.delete("/user-sessions/{session_id}", response_model=schemas.UserSession)
def delete_user_session(session_id: UUID, db: Session = Depends(get_db)):
    db_session = crud.delete_user_session(db, id=session_id)
    if db_session is None:
        raise HTTPException(status_code=404, detail="User session not found")
    return db_session

# UserToken routes
@app.get("/user-tokens/", response_model=List[schemas.UserToken])
def read_user_tokens(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    user_tokens = crud.get_user_tokens(db, skip=skip, limit=limit)
    return user_tokens

@app.get("/user-tokens/{token_id}", response_model=schemas.UserToken)
def read_user_token(token_id: UUID, db: Session = Depends(get_db)):
    db_token = crud.get_user_token(db, id=token_id)
    if db_token is None:
        raise HTTPException(status_code=404, detail="User token not found")
    return db_token

@app.post("/user-tokens/", response_model=schemas.UserToken)
def create_user_token(token: schemas.UserTokenCreate, db: Session = Depends(get_db)):
    return crud.create_user_token(db=db, obj_in=token)

@app.put("/user-tokens/{token_id}", response_model=schemas.UserToken)
def update_user_token(token_id: UUID, token: schemas.UserTokenUpdate, db: Session = Depends(get_db)):
    db_token = crud.get_user_token(db, id=token_id)
    if db_token is None:
        raise HTTPException(status_code=404, detail="User token not found")
    return crud.update_user_token(db=db, db_obj=db_token, obj_in=token)

@app.delete("/user-tokens/{token_id}", response_model=schemas.UserToken)
def delete_user_token(token_id: UUID, db: Session = Depends(get_db)):
    db_token = crud.delete_user_token(db, id=token_id)
    if db_token is None:
        raise HTTPException(status_code=404, detail="User token not found")
    return db_token

# StudentProfile routes
@app.get("/student-profiles/", response_model=List[schemas.StudentProfile])
def read_student_profiles(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    student_profiles = crud.get_student_profiles(db, skip=skip, limit=limit)
    return student_profiles

@app.get("/student-profiles/{profile_id}", response_model=schemas.StudentProfile)
def read_student_profile(profile_id: UUID, db: Session = Depends(get_db)):
    db_profile = crud.get_student_profile(db, id=profile_id)
    if db_profile is None:
        raise HTTPException(status_code=404, detail="Student profile not found")
    return db_profile

@app.post("/student-profiles/", response_model=schemas.StudentProfile)
def create_student_profile(profile: schemas.StudentProfileCreate, db: Session = Depends(get_db)):
    return crud.create_student_profile(db=db, obj_in=profile)

@app.put("/student-profiles/{profile_id}", response_model=schemas.StudentProfile)
def update_student_profile(profile_id: UUID, profile: schemas.StudentProfileUpdate, db: Session = Depends(get_db)):
    db_profile = crud.get_student_profile(db, id=profile_id)
    if db_profile is None:
        raise HTTPException(status_code=404, detail="Student profile not found")
    return crud.update_student_profile(db=db, db_obj=db_profile, obj_in=profile)

@app.delete("/student-profiles/{profile_id}", response_model=schemas.StudentProfile)
def delete_student_profile(profile_id: UUID, db: Session = Depends(get_db)):
    db_profile = crud.delete_student_profile(db, id=profile_id)
    if db_profile is None:
        raise HTTPException(status_code=404, detail="Student profile not found")
    return db_profile

@app.get("/student-profiles/by-user/{user_id}", response_model=schemas.StudentProfile)
def get_student_profile_by_user_id(user_id: UUID, db: Session = Depends(get_db)):
    db_profile = db.query(models.StudentProfile).filter(models.StudentProfile.user_id == user_id).first()
    if db_profile is None:
        raise HTTPException(status_code=404, detail="Student profile not found for this user")
    return db_profile

@app.put("/student-profiles/by-user/{user_id}", response_model=schemas.StudentProfile)
def update_student_profile_by_user_id(user_id: UUID, profile: schemas.StudentProfileUpdate, db: Session = Depends(get_db)):
    db_profile = crud.get_student_profile_by_user_id(db, user_id=user_id)
    if db_profile is None:
        raise HTTPException(status_code=404, detail="Student profile not found for this user")
    return crud.update_student_profile(db=db, db_obj=db_profile, obj_in=profile)

# StudentExamQuestion routes
@app.get("/student-exam-questions/", response_model=List[schemas.StudentExamQuestion])
def read_student_exam_questions(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    student_exam_questions = crud.get_student_exam_questions(db, skip=skip, limit=limit)
    return student_exam_questions

@app.get("/student-exam-questions/{question_id}", response_model=schemas.StudentExamQuestion)
def read_student_exam_question(question_id: UUID, db: Session = Depends(get_db)):
    db_question = crud.get_student_exam_question(db, id=question_id)
    if db_question is None:
        raise HTTPException(status_code=404, detail="Student exam question not found")
    return db_question

@app.post("/student-exam-questions/", response_model=schemas.StudentExamQuestion)
def create_student_exam_question(question: schemas.StudentExamQuestionCreate, db: Session = Depends(get_db)):
    return crud.create_student_exam_question(db=db, obj_in=question)

@app.put("/student-exam-questions/{question_id}", response_model=schemas.StudentExamQuestion)
def update_student_exam_question(question_id: UUID, question: schemas.StudentExamQuestionUpdate, db: Session = Depends(get_db)):
    db_question = crud.get_student_exam_question(db, id=question_id)
    if db_question is None:
        raise HTTPException(status_code=404, detail="Student exam question not found")
    return crud.update_student_exam_question(db=db, db_obj=db_question, obj_in=question)

@app.delete("/student-exam-questions/{question_id}", response_model=schemas.StudentExamQuestion)
def delete_student_exam_question(question_id: UUID, db: Session = Depends(get_db)):
    db_question = crud.delete_student_exam_question(db, id=question_id)
    if db_question is None:
        raise HTTPException(status_code=404, detail="Student exam question not found")
    return db_question

# TeacherProfile routes
@app.get("/teacher-profiles/", response_model=List[schemas.TeacherProfile])
def read_teacher_profiles(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    teacher_profiles = crud.get_teacher_profiles(db, skip=skip, limit=limit)
    return teacher_profiles

@app.get("/teacher-profiles/{profile_id}", response_model=schemas.TeacherProfile)
def read_teacher_profile(profile_id: UUID, db: Session = Depends(get_db)):
    db_profile = crud.get_teacher_profile(db, id=profile_id)
    if db_profile is None:
        raise HTTPException(status_code=404, detail="Teacher profile not found")
    return db_profile

@app.post("/teacher-profiles/", response_model=schemas.TeacherProfile)
def create_teacher_profile(profile: schemas.TeacherProfileCreate, db: Session = Depends(get_db)):
    return crud.create_teacher_profile(db=db, obj_in=profile)

@app.put("/teacher-profiles/{profile_id}", response_model=schemas.TeacherProfile)
def update_teacher_profile(profile_id: UUID, profile: schemas.TeacherProfileUpdate, db: Session = Depends(get_db)):
    db_profile = crud.get_teacher_profile(db, id=profile_id)
    if db_profile is None:
        raise HTTPException(status_code=404, detail="Teacher profile not found")
    return crud.update_teacher_profile(db=db, db_obj=db_profile, obj_in=profile)

@app.delete("/teacher-profiles/{profile_id}", response_model=schemas.TeacherProfile)
def delete_teacher_profile(profile_id: UUID, db: Session = Depends(get_db)):
    db_profile = crud.delete_teacher_profile(db, id=profile_id)
    if db_profile is None:
        raise HTTPException(status_code=404, detail="Teacher profile not found")
    return db_profile

# QuestionCategory routes
@app.get("/question-categories/", response_model=List[schemas.QuestionCategory])
def read_question_categories(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    question_categories = crud.get_question_categories(db, skip=skip, limit=limit)
    return question_categories

@app.get("/question-categories/{category_id}", response_model=schemas.QuestionCategory)
def read_question_category(category_id: UUID, db: Session = Depends(get_db)):
    db_category = crud.get_question_category(db, id=category_id)
    if db_category is None:
        raise HTTPException(status_code=404, detail="Question category not found")
    return db_category

@app.post("/question-categories/", response_model=schemas.QuestionCategory)
def create_question_category(category: schemas.QuestionCategoryCreate, db: Session = Depends(get_db)):
    return crud.create_question_category(db=db, obj_in=category)

@app.put("/question-categories/{category_id}", response_model=schemas.QuestionCategory)
def update_question_category(category_id: UUID, category: schemas.QuestionCategoryUpdate, db: Session = Depends(get_db)):
    db_category = crud.get_question_category(db, id=category_id)
    if db_category is None:
        raise HTTPException(status_code=404, detail="Question category not found")
    return crud.update_question_category(db=db, db_obj=db_category, obj_in=category)

@app.delete("/question-categories/{category_id}", response_model=schemas.QuestionCategory)
def delete_question_category(category_id: UUID, db: Session = Depends(get_db)):
    db_category = crud.delete_question_category(db, id=category_id)
    if db_category is None:
        raise HTTPException(status_code=404, detail="Question category not found")
    return db_category

# Question routes
@app.get("/questions/", response_model=List[schemas.Question], dependencies=[Depends(require_role(dbmodels.UserRole.ADMIN, dbmodels.UserRole.TEACHER))])
def read_questions(
    skip: int = 0, 
    limit: int = 100, 
    has_solution: Optional[bool] = None,  # NEW: Add has_solution filter
    db: Session = Depends(get_db)
):
    questions = crud.get_questions(db, skip=skip, limit=limit, has_solution=has_solution)
    return questions



@app.get("/questions/{question_id}", response_model=schemas.Question)
def read_question(question_id: UUID, db: Session = Depends(get_db)):
    db_question = crud.get_question(db, id=question_id)
    if db_question is None:
        raise HTTPException(status_code=404, detail="Question not found")
    return db_question

@app.post("/questions/", response_model=schemas.Question)
def create_question(question: schemas.QuestionCreate, db: Session = Depends(get_db),current_user: models.User = Depends(get_current_user),):
    return crud.create_question(db=db, obj_in=question, user_id=current_user.id)

@app.put("/questions/{question_id}", response_model=schemas.Question)
def update_question(question_id: UUID, question: schemas.QuestionUpdate, db: Session = Depends(get_db)):
    db_question = crud.get_question(db, id=question_id)
    if db_question is None:
        raise HTTPException(status_code=404, detail="Question not found")
    return crud.update_question(db=db, db_obj=db_question, obj_in=question)

@app.delete("/questions/{question_id}", response_model=schemas.Question)
def delete_question(question_id: UUID, db: Session = Depends(get_db)):
    db_question = crud.delete_question(db, id=question_id)
    if db_question is None:
        raise HTTPException(status_code=404, detail="Question not found")
    return db_question

# QuestionTestCase routes
@app.get("/question-test-cases/", response_model=List[schemas.QuestionTestCase])
def read_question_test_cases(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    test_cases = crud.get_question_test_cases(db, skip=skip, limit=limit)
    return test_cases

@app.get("/question-test-cases/{test_case_id}", response_model=schemas.QuestionTestCase)
def read_question_test_case(test_case_id: UUID, db: Session = Depends(get_db)):
    db_test_case = crud.get_question_test_case(db, id=test_case_id)
    if db_test_case is None:
        raise HTTPException(status_code=404, detail="Question test case not found")
    return db_test_case

@app.post("/question-test-cases/", response_model=schemas.QuestionTestCase)
def create_question_test_case(test_case: schemas.QuestionTestCaseCreate, db: Session = Depends(get_db)):
    return crud.create_question_test_case(db=db, obj_in=test_case)

@app.put("/question-test-cases/{test_case_id}", response_model=schemas.QuestionTestCase)
def update_question_test_case(test_case_id: UUID, test_case: schemas.QuestionTestCaseUpdate, db: Session = Depends(get_db)):
    db_test_case = crud.get_question_test_case(db, id=test_case_id)
    if db_test_case is None:
        raise HTTPException(status_code=404, detail="Question test case not found")
    return crud.update_question_test_case(db=db, db_obj=db_test_case, obj_in=test_case)

@app.delete("/question-test-cases/{test_case_id}", response_model=schemas.QuestionTestCase)
def delete_question_test_case(test_case_id: UUID, db: Session = Depends(get_db)):
    db_test_case = crud.delete_question_test_case(db, id=test_case_id)
    if db_test_case is None:
        raise HTTPException(status_code=404, detail="Question test case not found")
    return db_test_case

# Get all test cases for a specific question
@app.get("/questions/{question_id}/test-cases/", response_model=List[schemas.QuestionTestCase])
def read_test_cases_for_question(question_id: UUID, db: Session = Depends(get_db)):
    test_cases = crud.get_test_cases_for_question(db, question_id=question_id)
    if not test_cases:
        raise HTTPException(status_code=404, detail="No test cases found for this question")
    return test_cases

# Update a test case
@app.put("/question-test-cases/{test_case_id}", response_model=schemas.QuestionTestCase)
def update_question_test_case(
    test_case_id: UUID,
    test_case: schemas.QuestionTestCaseUpdate,
    db: Session = Depends(get_db),
):
    db_test_case = crud.get_question_test_case(db, id=test_case_id)
    if not db_test_case:
        raise HTTPException(status_code=404, detail="Question test case not found")
    return crud.update_question_test_case(db=db, db_obj=db_test_case, obj_in=test_case)

# Delete a test case
@app.delete("/question-test-cases/{test_case_id}", response_model=schemas.QuestionTestCase)
def delete_question_test_case(test_case_id: UUID, db: Session = Depends(get_db)):
    db_test_case = crud.get_question_test_case(db, id=test_case_id)
    if not db_test_case:
        raise HTTPException(status_code=404, detail="Question test case not found")
    return crud.delete_question_test_case(db, id=test_case_id)

@app.delete("/questions/{question_id}/test-cases", response_model=List[schemas.QuestionTestCase])
def delete_all_test_cases_for_question(question_id: UUID, db: Session = Depends(get_db)):
    deleted_test_cases = crud.delete_test_cases_by_question(db=db, question_id=question_id)
    if deleted_test_cases is None:
        raise HTTPException(status_code=404, detail="No test cases found for this question")
    return deleted_test_cases


# Exam routes (Updated)
@app.get("/exams/", response_model=List[schemas.Exam])
def read_exams(
    skip: int = 0, 
    limit: int = 100, 
    course_id: Optional[UUID] = None,  # ADD course filtering
    db: Session = Depends(get_db)
):
    """Get exams, optionally filtered by course_id"""
    exams = crud.get_exams(db, skip=skip, limit=limit, course_id=course_id)
    return exams

@app.get("/exams/{exam_id}", response_model=schemas.ExamWithCourse)  # CHANGE response model
def read_exam(exam_id: UUID, db: Session = Depends(get_db)):
    """Get exam with course information"""
    db_exam = crud.get_exam(db, id=exam_id)
    if db_exam is None:
        raise HTTPException(status_code=404, detail="Exam not found")
    return db_exam

@app.post("/exams/", response_model=schemas.Exam)
def create_exam(
    exam: schemas.ExamCreate, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    """Create exam - course_id is now required"""
    # Validate course exists and user has access (optional)
    course = crud.get_course(db, exam.course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    return crud.create_exam(db=db, obj_in=exam, user_id=current_user.id)

@app.put("/exams/{exam_id}", response_model=schemas.Exam)
def update_exam(exam_id: UUID, exam: schemas.ExamUpdate, db: Session = Depends(get_db)):
    db_exam = crud.get_exam(db, id=exam_id)
    if db_exam is None:
        raise HTTPException(status_code=404, detail="Exam not found")
    
    # If course_id is being updated, validate the new course exists
    if exam.course_id and exam.course_id != db_exam.course_id:
        course = crud.get_course(db, exam.course_id)
        if not course:
            raise HTTPException(status_code=400, detail="New course not found")
    
    return crud.update_exam(db=db, db_obj=db_exam, obj_in=exam)

# NEW: Get exams by course
@app.get("/courses/{course_id}/exams/", response_model=List[schemas.Exam])
def get_exams_by_course(
    course_id: UUID, 
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db)
):
    """Get all exams for a specific course"""
    # Validate course exists
    course = crud.get_course(db, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    exams = crud.get_exams_by_course(db, course_id=course_id, skip=skip, limit=limit)
    return exams


@app.delete("/exams/{exam_id}", response_model=schemas.Exam)
def delete_exam(exam_id: UUID, db: Session = Depends(get_db)):
    db_exam = crud.delete_exam(db, id=exam_id)
    if db_exam is None:
        raise HTTPException(status_code=404, detail="Exam not found")
    return db_exam

# ExamQuestion routes
@app.get("/exam-questions/", response_model=List[schemas.ExamQuestion])
def read_exam_questions(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    exam_questions = crud.get_exam_questions(db, skip=skip, limit=limit)
    return exam_questions

@app.get("/exam-questions/{exam_question_id}", response_model=schemas.ExamQuestion)
def read_exam_question(exam_question_id: UUID, db: Session = Depends(get_db)):
    db_exam_question = crud.get_exam_question(db, id=exam_question_id)
    if db_exam_question is None:
        raise HTTPException(status_code=404, detail="Exam question not found")
    return db_exam_question

@app.post("/exam-questions/", response_model=schemas.ExamQuestion)
def create_exam_question(exam_question: schemas.ExamQuestionCreate, db: Session = Depends(get_db)):
    return crud.create_exam_question(db=db, obj_in=exam_question)

@app.put("/exam-questions/{exam_question_id}", response_model=schemas.ExamQuestion)
def update_exam_question(exam_question_id: UUID, exam_question: schemas.ExamQuestionUpdate, db: Session = Depends(get_db)):
    db_exam_question = crud.get_exam_question(db, id=exam_question_id)
    if db_exam_question is None:
        raise HTTPException(status_code=404, detail="Exam question not found")
    return crud.update_exam_question(db=db, db_obj=db_exam_question, obj_in=exam_question)

@app.delete("/exam-questions/{exam_question_id}", response_model=schemas.ExamQuestion)
def delete_exam_question(exam_question_id: UUID, db: Session = Depends(get_db)):
    db_exam_question = crud.delete_exam_question(db, id=exam_question_id)
    if db_exam_question is None:
        raise HTTPException(status_code=404, detail="Exam question not found")
    return db_exam_question

# ExamRegistration routes
@app.get("/exam-registrations/", response_model=List[schemas.ExamRegistration])
def read_exam_registrations(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    exam_registrations = crud.get_exam_registrations(db, skip=skip, limit=limit)
    return exam_registrations

@app.get("/exam-registrations/{registration_id}", response_model=schemas.ExamRegistration)
def read_exam_registration(registration_id: UUID, db: Session = Depends(get_db)):
    db_registration = crud.get_exam_registration(db, id=registration_id)
    if db_registration is None:
        raise HTTPException(status_code=404, detail="Exam registration not found")
    return db_registration

@app.post("/exam-registrations/", response_model=schemas.ExamRegistration)
def create_exam_registration(registration: schemas.ExamRegistrationCreate, db: Session = Depends(get_db)):
    return crud.create_exam_registration(db=db, obj_in=registration)

@app.put("/exam-registrations/{registration_id}", response_model=schemas.ExamRegistration)
def update_exam_registration(registration_id: UUID, registration: schemas.ExamRegistrationUpdate, db: Session = Depends(get_db)):
    db_registration = crud.get_exam_registration(db, id=registration_id)
    if db_registration is None:
        raise HTTPException(status_code=404, detail="Exam registration not found")
    return crud.update_exam_registration(db=db, db_obj=db_registration, obj_in=registration)

@app.delete("/exam-registrations/{registration_id}", response_model=schemas.ExamRegistration)
def delete_exam_registration(registration_id: UUID, db: Session = Depends(get_db)):
    db_registration = crud.delete_exam_registration(db, id=registration_id)
    if db_registration is None:
        raise HTTPException(status_code=404, detail="Exam registration not found")
    return db_registration

# ExamSession routes
@app.get("/exam-sessions/", response_model=List[schemas.ExamSession])
def read_exam_sessions(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    exam_sessions = crud.get_exam_sessions(db, skip=skip, limit=limit)
    return exam_sessions

@app.get("/exam-sessions/{session_id}", response_model=schemas.ExamSession)
def read_exam_session(session_id: UUID, db: Session = Depends(get_db)):
    db_session = crud.get_exam_session(db, id=session_id)
    if db_session is None:
        raise HTTPException(status_code=404, detail="Exam session not found")
    return db_session

@app.post("/exam-sessions/", response_model=schemas.ExamSession)
def create_exam_session(session: schemas.ExamSessionCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user),):
    return crud.create_exam_session(db=db, obj_in=session, student_id=current_user.id)

@app.put("/exam-sessions/{session_id}", response_model=schemas.ExamSession)
def update_exam_session(session_id: UUID, session: schemas.ExamSessionUpdate, db: Session = Depends(get_db)):
    db_session = crud.get_exam_session(db, id=session_id)
    if db_session is None:
        raise HTTPException(status_code=404, detail="Exam session not found")
    return crud.update_exam_session(db=db, db_obj=db_session, obj_in=session)

@app.delete("/exam-sessions/{session_id}", response_model=schemas.ExamSession)
def delete_exam_session(session_id: UUID, db: Session = Depends(get_db)):
    db_session = crud.delete_exam_session(db, id=session_id)
    if db_session is None:
        raise HTTPException(status_code=404, detail="Exam session not found")
    return db_session

# Submission routes
@app.get("/submissions/", response_model=List[schemas.Submission])
def read_submissions(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    submissions = crud.get_submissions(db, skip=skip, limit=limit)
    return submissions

@app.get("/submissions/{submission_id}", response_model=schemas.Submission)
def read_submission(submission_id: UUID, db: Session = Depends(get_db)):
    db_submission = crud.get_submission(db, id=submission_id)
    if db_submission is None:
        raise HTTPException(status_code=404, detail="Submission not found")
    return db_submission

@app.post("/submissions/", response_model=schemas.Submission)
def create_submission(submission: schemas.SubmissionCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user),):
    # Find the exam session for this user & exam
    exam_session = db.query(models.ExamSession).filter_by(
        exam_id=submission.exam_id,
        student_id=current_user.id
    ).first()

    if not exam_session:
        raise HTTPException(status_code=400, detail="No active exam session found for this exam")

    
    return crud.create_submission(db=db, obj_in=submission, student_id=current_user.id)

@app.put("/submissions/{submission_id}", response_model=schemas.Submission)
def update_submission(submission_id: UUID, submission: schemas.SubmissionUpdate, db: Session = Depends(get_db)):
    db_submission = crud.get_submission(db, id=submission_id)
    if db_submission is None:
        raise HTTPException(status_code=404, detail="Submission not found")
    return crud.update_submission(db=db, db_obj=db_submission, obj_in=submission)

@app.delete("/submissions/{submission_id}", response_model=schemas.Submission)
def delete_submission(submission_id: UUID, db: Session = Depends(get_db)):
    db_submission = crud.delete_submission(db, id=submission_id)
    if db_submission is None:
        raise HTTPException(status_code=404, detail="Submission not found")
    return db_submission

# SubmissionResult routes
@app.get("/submission-results/", response_model=List[schemas.SubmissionResult])
def read_submission_results(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    submission_results = crud.get_submission_results(db, skip=skip, limit=limit)
    return submission_results

@app.get("/submission-results/by-submission/{submission_id}", response_model=schemas.SubmissionResult)
def get_submission_result_by_submission_id(
    submission_id: UUID,
    db: Session = Depends(get_db)
):
    """
    Get submission result by submission_id
    """
    result = crud.get_submission_result_by_submission_id(db, submission_id=submission_id)
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Submission result for submission_id {submission_id} not found"
        )
    
    return result

@app.get("/submission-results/{result_id}", response_model=schemas.SubmissionResult)
def read_submission_result(result_id: UUID, db: Session = Depends(get_db)):
    db_result = crud.get_submission_result(db, id=result_id)
    if db_result is None:
        raise HTTPException(status_code=404, detail="Submission result not found")
    return db_result

@app.post("/submission-results/", response_model=schemas.SubmissionResult)
def create_submission_result(result: schemas.SubmissionResultCreate, db: Session = Depends(get_db)):
    return crud.create_submission_result(db=db, obj_in=result)

@app.put("/submission-results/{result_id}", response_model=schemas.SubmissionResult)
def update_submission_result(result_id: UUID, result: schemas.SubmissionResultUpdate, db: Session = Depends(get_db)):
    db_result = crud.get_submission_result(db, id=result_id)
    if db_result is None:
        raise HTTPException(status_code=404, detail="Submission result not found")
    return crud.update_submission_result(db=db, db_obj=db_result, obj_in=result)

@app.delete("/submission-results/{result_id}", response_model=schemas.SubmissionResult)
def delete_submission_result(result_id: UUID, db: Session = Depends(get_db)):
    db_result = crud.delete_submission_result(db, id=result_id)
    if db_result is None:
        raise HTTPException(status_code=404, detail="Submission result not found")
    return db_result

# SubmissionEvent routes
@app.get("/submission-events/", response_model=List[schemas.SubmissionEvent])
def read_submission_events(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    submission_events = crud.get_submission_events(db, skip=skip, limit=limit)
    return submission_events

@app.get("/submission-events/{event_id}", response_model=schemas.SubmissionEvent)
def read_submission_event(event_id: UUID, db: Session = Depends(get_db)):
    db_event = crud.get_submission_event(db, id=event_id)
    if db_event is None:
        raise HTTPException(status_code=404, detail="Submission event not found")
    return db_event

@app.post("/submission-events/", response_model=schemas.SubmissionEvent)
def create_submission_event(event: schemas.SubmissionEventCreate, db: Session = Depends(get_db)):
    return crud.create_submission_event(db=db, obj_in=event)

@app.put("/submission-events/{event_id}", response_model=schemas.SubmissionEvent)
def update_submission_event(event_id: UUID, event: schemas.SubmissionEventUpdate, db: Session = Depends(get_db)):
    db_event = crud.get_submission_event(db, id=event_id)
    if db_event is None:
        raise HTTPException(status_code=404, detail="Submission event not found")
    return crud.update_submission_event(db=db, db_obj=db_event, obj_in=event)

@app.delete("/submission-events/{event_id}", response_model=schemas.SubmissionEvent)
def delete_submission_event(event_id: UUID, db: Session = Depends(get_db)):
    db_event = crud.delete_submission_event(db, id=event_id)
    if db_event is None:
        raise HTTPException(status_code=404, detail="Submission event not found")
    return db_event

# ExamEvent routes
@app.get("/exam-events/", response_model=List[schemas.ExamEvent])
def read_exam_events(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    exam_events = crud.get_exam_events(db, skip=skip, limit=limit)
    return exam_events

@app.get("/exam-events/{event_id}", response_model=schemas.ExamEvent)
def read_exam_event(event_id: UUID, db: Session = Depends(get_db)):
    db_event = crud.get_exam_event(db, id=event_id)
    if db_event is None:
        raise HTTPException(status_code=404, detail="Exam event not found")
    return db_event

@app.post("/exam-events/", response_model=schemas.ExamEvent)
def create_exam_event(event: schemas.ExamEventCreate, db: Session = Depends(get_db)):
    return crud.create_exam_event(db=db, obj_in=event)

@app.put("/exam-events/{event_id}", response_model=schemas.ExamEvent)
def update_exam_event(event_id: UUID, event: schemas.ExamEventUpdate, db: Session = Depends(get_db)):
    db_event = crud.get_exam_event(db, id=event_id)
    if db_event is None:
        raise HTTPException(status_code=404, detail="Exam event not found")
    return crud.update_exam_event(db=db, db_obj=db_event, obj_in=event)

@app.delete("/exam-events/{event_id}", response_model=schemas.ExamEvent)
def delete_exam_event(event_id: UUID, db: Session = Depends(get_db)):
    db_event = crud.delete_exam_event(db, id=event_id)
    if db_event is None:
        raise HTTPException(status_code=404, detail="Exam event not found")
    return db_event

# AuditLog routes
@app.get("/audit-logs/", response_model=List[schemas.AuditLog], dependencies=[Depends(require_role(dbmodels.UserRole.ADMIN, dbmodels.UserRole.TEACHER))])
def read_audit_logs(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    audit_logs = crud.get_audit_logs(db, skip=skip, limit=limit)
    return audit_logs

@app.get("/audit-logs/{log_id}", response_model=schemas.AuditLog)
def read_audit_log(log_id: UUID, db: Session = Depends(get_db)):
    db_log = crud.get_audit_log(db, id=log_id)
    if db_log is None:
        raise HTTPException(status_code=404, detail="Audit log not found")
    return db_log

@app.post("/audit-logs/", response_model=schemas.AuditLog)
def create_audit_log(log: schemas.AuditLogCreate, db: Session = Depends(get_db)):
    return crud.create_audit_log(db=db, obj_in=log)

@app.put("/audit-logs/{log_id}", response_model=schemas.AuditLog)
def update_audit_log(log_id: UUID, log: schemas.AuditLogUpdate, db: Session = Depends(get_db)):
    db_log = crud.get_audit_log(db, id=log_id)
    if db_log is None:
        raise HTTPException(status_code=404, detail="Audit log not found")
    return crud.update_audit_log(db=db, db_obj=db_log, obj_in=log)

@app.delete("/audit-logs/{log_id}", response_model=schemas.AuditLog)
def delete_audit_log(log_id: UUID, db: Session = Depends(get_db)):
    db_log = crud.delete_audit_log(db, id=log_id)
    if db_log is None:
        raise HTTPException(status_code=404, detail="Audit log not found")
    return db_log

# Root endpoint
@app.get("/")
def read_root():
    return {"message": "Online Exam System API", "version": "1.0.0"}

# Get assigned questions for a specific student in a specific exam
@app.get("/exams/{exam_id}/students/{student_id}/questions/", response_model=List[schemas.StudentExamQuestion])
def get_student_questions_for_exam(exam_id: UUID, student_id: UUID, db: Session = Depends(get_db)):
    """Get all questions assigned to a specific student for a specific exam"""
    questions = crud.get_student_exam_questions_by_exam_and_student(db, exam_id=exam_id, student_id=student_id)
    if not questions:
        raise HTTPException(status_code=404, detail="No questions found for this student in this exam")
    return questions

# Get all students and their assigned questions for a specific exam
@app.get("/exams/{exam_id}/student-questions/", response_model=List[schemas.StudentExamQuestion])
def get_all_student_questions_for_exam(exam_id: UUID, db: Session = Depends(get_db)):
    """Get all student question assignments for a specific exam"""
    assignments = crud.get_student_exam_questions_by_exam(db, exam_id=exam_id)
    if not assignments:
        raise HTTPException(status_code=404, detail="No question assignments found for this exam")
    return assignments

# Get questions with full question details for a student in an exam
@app.get(
    "/exams/{exam_id}/questions-with-details/",
    response_model=List[schemas.StudentExamQuestionWithQuestion]
)
def get_student_questions_with_details(
    exam_id: UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)  # get logged-in student
):
    """Get questions assigned to the logged-in student for this exam"""
    student_id = current_user.id  # ✅ automatically take from logged-in user

    questions = crud.get_exam_questions_for_student(db, student_id=student_id, exam_id=exam_id)
    if not questions:
        raise HTTPException(
            status_code=404,
            detail="No questions found for this student in this exam"
        )
    return questions

@app.get(
    "/exams/{exam_id}/students/{student_id}/questions-with-details/",
    response_model=List[schemas.StudentExamQuestionWithQuestion],
    dependencies=[Depends(require_role(dbmodels.UserRole.ADMIN, dbmodels.UserRole.TEACHER))]
)
def get_questions_for_specific_student(
    exam_id: UUID,
    student_id: UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)  # whoever is logged in
):
    """Get questions assigned to a specific student in a given exam (for teachers/admins)."""
    questions = crud.get_exam_questions_for_student(
        db, student_id=student_id, exam_id=exam_id
    )

    if not questions:
        raise HTTPException(
            status_code=404,
            detail="No questions found for this student in this exam"
        )
    return questions

# Assign a single question to a student
@app.post("/exams/{exam_id}/students/{student_id}/assign-question/", response_model=schemas.StudentExamQuestion)
def assign_question_to_student(
    exam_id: UUID, 
    student_id: UUID, 
    question_assignment: schemas.StudentExamQuestionCreate, 
    db: Session = Depends(get_db)
):
    """Assign a question to a student for an exam"""
    # Validate that the exam_id and student_id in the URL match the request body
    if question_assignment.exam_id != exam_id or question_assignment.student_id != student_id:
        raise HTTPException(status_code=400, detail="Exam ID or Student ID mismatch")
    
    return crud.create_student_exam_question(db=db, obj_in=question_assignment)

# Bulk assign questions to students
@app.post("/student-exam-questions/bulk-assign/", response_model=List[schemas.StudentExamQuestion])
def bulk_assign_questions(
    bulk_assignment: schemas.BulkStudentExamQuestionCreate, 
    db: Session = Depends(get_db)
):
    """Bulk assign questions to students"""
    try:
        assignments = [assignment.dict() for assignment in bulk_assignment.assignments]
        return crud.bulk_assign_questions_to_students(db=db, assignments=assignments)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error in bulk assignment: {str(e)}")

# Get all exams where a specific student has assigned questions
@app.get("/me/registered-exams/", response_model=List[schemas.ExamRegistration])
def get_my_registered_exams(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get all exams the logged-in student is registered for"""
    registrations = db.query(models.ExamRegistration).filter(
        models.ExamRegistration.student_id == current_user.id
    ).all()

    # Return empty list instead of 404 when no registrations found
    return registrations



@app.get("/students/{student_id}/assigned-exams/", response_model=List[schemas.StudentExamQuestion])
def get_student_assigned_exams_admin(student_id: UUID, db: Session = Depends(get_db)):
    """Admin/teacher endpoint: get assigned exams for a given student_id"""
    return db.query(models.StudentExamQuestion).filter(
        models.StudentExamQuestion.student_id == student_id
    ).all()

# Check if a student has questions assigned for a specific exam
@app.get("/exams/{exam_id}/students/{student_id}/has-questions/")
def check_student_has_questions(exam_id: UUID, student_id: UUID, db: Session = Depends(get_db)):
    """Check if a student has questions assigned for a specific exam"""
    count = db.query(models.StudentExamQuestion).filter(
        models.StudentExamQuestion.exam_id == exam_id,
        models.StudentExamQuestion.student_id == student_id
    ).count()
    
    return {
        "has_questions": count > 0,
        "question_count": count,
        "exam_id": exam_id,
        "student_id": student_id
    }

@app.get("/exams/{exam_id}/submissions", response_model=List[schemas.Submission])
def read_submissions_by_exam(
    exam_id: UUID, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)
):
    submissions = crud.get_submissions_by_exam_id(db, exam_id=exam_id, skip=skip, limit=limit)
    return submissions


# Get question statistics for an exam
@app.get("/exams/{exam_id}/question-stats/")
def get_exam_question_stats(exam_id: UUID, db: Session = Depends(get_db)):
    """Get statistics about question assignments for an exam"""
    
    stats = db.query(
        func.count(models.StudentExamQuestion.id).label("total_assignments"),
        func.count(func.distinct(models.StudentExamQuestion.student_id)).label("students_count"),
        func.count(func.distinct(models.StudentExamQuestion.question_id)).label("unique_questions"),
        func.avg(models.StudentExamQuestion.points).label("avg_points")
    ).filter(
        models.StudentExamQuestion.exam_id == exam_id
    ).first()
    
    if not stats or stats.total_assignments == 0:
        raise HTTPException(status_code=404, detail="No question assignments found for this exam")
    
    return {
        "exam_id": exam_id,
        "total_assignments": stats.total_assignments,
        "students_with_questions": stats.students_count,
        "unique_questions_used": stats.unique_questions,
        "average_points_per_question": float(stats.avg_points) if stats.avg_points else 0
    }

@app.post("/admin/import-leetcode-jsonl/")
def import_leetcode_jsonl(payload: dict = Body(...), db: Session = Depends(get_db)):
    """Import LeetCode data from JSONL files (HumanEval format)"""
    file_paths = payload.get("file_paths", [])
    overwrite = bool(payload.get("overwrite", False))
    
    if not file_paths:
        raise HTTPException(status_code=400, detail="file_paths is required")
    
    try:
        result = import_from_jsonl_files(db, file_paths, overwrite=overwrite)
        return {"status": "ok", **result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Course routes
@app.post("/courses/", response_model=schemas.Course)
def create_course_endpoint(course: schemas.CourseCreate, db: Session = Depends(get_db)):
    # Check if course code already exists
    existing = crud.get_course_by_code(db, course.course_code)
    if existing:
        raise HTTPException(status_code=400, detail="Course code already exists")
    return crud.create_course(db=db, obj_in=course)

@app.get("/courses/", response_model=List[schemas.Course])
def get_courses_endpoint(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_courses(db, skip=skip, limit=limit)

@app.get("/courses/{course_id}", response_model=schemas.Course)
def get_course_endpoint(course_id: UUID, db: Session = Depends(get_db)):
    course = crud.get_course(db, course_id=course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return course

@app.put("/courses/{course_id}", response_model=schemas.Course)
def update_course_endpoint(course_id: UUID, course_update: schemas.CourseUpdate, db: Session = Depends(get_db)):
    course = crud.update_course(db, course_id=course_id, course_update=course_update)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return course

# Course enrollment routes
@app.post("/courses/{course_id}/enroll", response_model=schemas.CourseEnrollment)
def enroll_in_course_endpoint(course_id: UUID, student_id: UUID, db: Session = Depends(get_db)):
    # Validate course and student exist
    course = crud.get_course(db, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    enrollment = schemas.CourseEnrollmentCreate(course_id=course_id, student_id=student_id)
    return crud.create_course_enrollment(db=db, obj_in=enrollment)

@app.get("/students/{student_id}/courses", response_model=List[schemas.CourseEnrollment])
def get_student_courses_endpoint(student_id: UUID, db: Session = Depends(get_db)):
    return crud.get_student_enrollments(db, student_id=student_id)

@app.delete("/courses/{course_id}")
def delete_course_endpoint(course_id: UUID, db: Session = Depends(get_db)):
    course = crud.get_course(db, course_id=course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    # Delete the course (cascade will handle enrollments)
    crud.delete_course(db, course_id=course_id)
    return {"message": "Course deleted successfully"}

@app.put("/courses/{course_id}/enrollments/{enrollment_id}", response_model=schemas.CourseEnrollment)
def update_course_enrollment_endpoint(
    course_id: UUID,
    enrollment_id: UUID,
    enrollment_update: schemas.CourseEnrollmentUpdate,
    db: Session = Depends(get_db)
):
    enrollment = crud.get_course_enrollment(db, enrollment_id)
    if not enrollment or enrollment.course_id != course_id:
        raise HTTPException(status_code=404, detail="Enrollment not found for this course")
    
    updated_enrollment = crud.update_course_enrollment(db, db_obj=enrollment, obj_in=enrollment_update)
    return updated_enrollment

@app.delete("/courses/{course_id}/enrollments")
def delete_course_enrollment_by_student_endpoint(
    course_id: UUID,
    student_id: UUID,
    db: Session = Depends(get_db)
):
    enrollment = db.query(models.CourseEnrollment).filter(
        models.CourseEnrollment.course_id == course_id,
        models.CourseEnrollment.student_id == student_id
    ).first()

    if not enrollment:
        raise HTTPException(status_code=404, detail="Enrollment not found for this course and student")

    db.delete(enrollment)
    db.commit()
    return {"message": "Enrollment deleted successfully"}

@app.get("/courses/{course_id}/students", response_model=List[schemas.CourseEnrollment])
def get_course_enrollments_endpoint(course_id: UUID, db: Session = Depends(get_db)):
    enrollments = crud.get_course_enrollments(db, course_id=course_id)
    return enrollments


# MCQ routes
@app.get("/mcqs/", response_model=List[schemas.MCQ], dependencies=[Depends(require_role(dbmodels.UserRole.ADMIN, dbmodels.UserRole.TEACHER))])
def read_mcqs(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    mcqs = crud.get_mcqs(db, skip=skip, limit=limit)
    return mcqs

@app.get("/mcqs/{mcq_id}", response_model=schemas.MCQ)
def read_mcq(mcq_id: UUID, db: Session = Depends(get_db)):
    db_mcq = crud.get_mcq(db, id=mcq_id)
    if db_mcq is None:
        raise HTTPException(status_code=404, detail="MCQ not found")
    return db_mcq

@app.post("/mcqs/", response_model=schemas.MCQ)
def create_mcq(mcq: schemas.MCQCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return crud.create_mcq(db=db, obj_in=mcq, user_id=current_user.id)

@app.put("/mcqs/{mcq_id}", response_model=schemas.MCQ)
def update_mcq(mcq_id: UUID, mcq: schemas.MCQUpdate, db: Session = Depends(get_db)):
    db_mcq = crud.get_mcq(db, id=mcq_id)
    if db_mcq is None:
        raise HTTPException(status_code=404, detail="MCQ not found")
    return crud.update_mcq(db=db, db_obj=db_mcq, obj_in=mcq)

@app.delete("/mcqs/{mcq_id}", response_model=schemas.MCQ)
def delete_mcq(mcq_id: UUID, db: Session = Depends(get_db)):
    db_mcq = crud.delete_mcq(db, id=mcq_id)
    if db_mcq is None:
        raise HTTPException(status_code=404, detail="MCQ not found")
    return db_mcq

# ExamMCQ routes
@app.get("/exam-mcqs/", response_model=List[schemas.ExamMCQ])
def read_exam_mcqs(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    exam_mcqs = crud.get_exam_mcqs(db, skip=skip, limit=limit)
    return exam_mcqs

@app.post("/exam-mcqs/", response_model=schemas.ExamMCQ)
def create_exam_mcq(exam_mcq: schemas.ExamMCQCreate, db: Session = Depends(get_db)):
    return crud.create_exam_mcq(db=db, obj_in=exam_mcq)

@app.put("/exam-mcqs/{exam_mcq_id}", response_model=schemas.ExamMCQ)
def update_exam_mcq(exam_mcq_id: UUID, exam_mcq: schemas.ExamMCQUpdate, db: Session = Depends(get_db)):
    db_exam_mcq = crud.get_exam_mcq(db, id=exam_mcq_id)
    if db_exam_mcq is None:
        raise HTTPException(status_code=404, detail="Exam MCQ not found")
    return crud.update_exam_mcq(db=db, db_obj=db_exam_mcq, obj_in=exam_mcq)

@app.delete("/exam-mcqs/{exam_mcq_id}", response_model=schemas.ExamMCQ)
def delete_exam_mcq(exam_mcq_id: UUID, db: Session = Depends(get_db)):
    db_exam_mcq = crud.delete_exam_mcq(db, id=exam_mcq_id)
    if db_exam_mcq is None:
        raise HTTPException(status_code=404, detail="Exam MCQ not found")
    return db_exam_mcq

# MCQ Submission routes
@app.get("/mcq-submissions/", response_model=List[schemas.MCQSubmission])
def read_mcq_submissions(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    submissions = crud.get_mcq_submissions(db, skip=skip, limit=limit)
    return submissions

@app.post("/mcq-submissions/", response_model=schemas.MCQSubmission)
def create_mcq_submission(submission: schemas.MCQSubmissionCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return crud.create_mcq_submission(db=db, obj_in=submission, student_id=current_user.id)

# Student MCQ assignment routes (similar to questions)
@app.get("/exams/{exam_id}/students/{student_id}/mcqs/", response_model=List[schemas.StudentExamMCQ])
def get_student_mcqs_for_exam(exam_id: UUID, student_id: UUID, db: Session = Depends(get_db)):
    mcqs = crud.get_student_exam_mcqs_by_exam_and_student(db, exam_id=exam_id, student_id=student_id)
    if not mcqs:
        raise HTTPException(status_code=404, detail="No MCQs found for this student in this exam")
    return mcqs

@app.get("/exams/{exam_id}/mcqs-with-details/", response_model=List[schemas.StudentExamMCQWithMCQ])
def get_student_mcqs_with_details_for_exam(
    exam_id: UUID, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    """Get MCQs assigned to the logged-in student for this exam"""
    mcqs = crud.get_exam_mcqs_for_student(db, student_id=current_user.id, exam_id=exam_id)
    if not mcqs:
        raise HTTPException(
            status_code=404,
            detail="No MCQs found for this student in this exam"
        )
    return mcqs

@app.post("/student-exam-mcqs/bulk-assign/", response_model=List[schemas.StudentExamMCQ])
def bulk_assign_mcqs(bulk_assignment: schemas.BulkStudentExamMCQCreate, db: Session = Depends(get_db)):
    try:
        assignments = [assignment.dict() for assignment in bulk_assignment.assignments]
        return crud.bulk_assign_mcqs_to_students(db=db, assignments=assignments)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error in bulk MCQ assignment: {str(e)}")
    
# Add MCQ student assignment endpoints
@app.get("/exams/{exam_id}/student-mcqs/", response_model=List[schemas.StudentExamMCQ])
def get_all_student_mcqs_for_exam(exam_id: UUID, db: Session = Depends(get_db)):
    """Get all student MCQ assignments for a specific exam"""
    assignments = db.query(models.StudentExamMCQ).filter(
        models.StudentExamMCQ.exam_id == exam_id
    ).order_by(
        models.StudentExamMCQ.student_id,
        models.StudentExamMCQ.question_order
    ).all()
    
    if not assignments:
        raise HTTPException(status_code=404, detail="No MCQ assignments found for this exam")
    
    return assignments

# Upload PDF for question
@app.post("/questions/{question_id}/upload-pdf/", response_model=schemas.Question)
async def upload_question_pdf(
    question_id: UUID, 
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Validate file type
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    
    # Check file size (limit to 10MB)
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size must be less than 10MB")
    
    # Get existing question
    db_question = crud.get_question(db, id=question_id)
    if not db_question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    # Update question with PDF data
    update_data = schemas.QuestionUpdate(
        statement_type="pdf",
        pdf_filename=file.filename,
        pdf_filesize=len(content),
        pdf_data=content
    )
    
    return crud.update_question(db=db, db_obj=db_question, obj_in=update_data)

# Create question with PDF upload
@app.post("/questions/create-with-pdf/", response_model=schemas.Question)
async def create_question_with_pdf(
    title: str,
    category_id: UUID,
    difficulty: str,
    max_score: int,
    description: Optional[str] = None,
    time_limit_seconds: Optional[int] = 30,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Validate file type
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    
    # Check file size (limit to 10MB)
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size must be less than 10MB")
    
    # Create question data
    question_data = schemas.QuestionCreate(
        title=title,
        category_id=category_id,
        difficulty=difficulty,
        max_score=max_score,
        description=description or "",
        problem_statement="",  # Empty for PDF questions
        statement_type="pdf",
        pdf_filename=file.filename,
        pdf_filesize=len(content),
        time_limit_seconds=time_limit_seconds,
        pdf_data=content
    )
    
    return crud.create_question(db=db, obj_in=question_data, user_id=current_user.id)

# Download PDF for question
@app.get("/questions/{question_id}/pdf/")
async def get_question_pdf(
    question_id: UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Serve the PDF file for a specific question"""
    
    # Get the question
    question = db.query(models.Question).filter(models.Question.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    # Check if user has access (you can modify this logic as needed)
    if current_user.role == models.UserRole.STUDENT:
        # Check if student has assignment for the activity containing this question
        activity = db.query(models.Activity).filter(models.Activity.id == question.activity_id).first()
        if activity:
            assignment = db.query(models.ActivityAssignment).filter(
                models.ActivityAssignment.activity_id == activity.id,
                models.ActivityAssignment.student_id == current_user.id
            ).first()
            if not assignment:
                raise HTTPException(status_code=403, detail="Access denied")
    
    # For now, redirect to activity PDF - you can modify this to serve question-specific PDFs
    # if you have them stored separately
    if question.activity_id:
        activity = db.query(models.Activity).filter(models.Activity.id == question.activity_id).first()
        if activity and activity.activity_sheet_pdf:
            file_path = activity.activity_sheet_pdf
            if os.path.exists(file_path):
                return FileResponse(
                    path=file_path,
                    media_type='application/pdf',
                    filename=f"question_{question_id}.pdf",
                    headers={
                        "Content-Disposition": "inline; filename=question.pdf",
                        "Cache-Control": "public, max-age=300",
                        "X-Content-Type-Options": "nosniff"
                    }
                )
    
    raise HTTPException(status_code=404, detail="PDF file not found for this question")

# DEBUG: Check if PDF data exists for question
@app.get("/debug/questions/{question_id}/pdf-info/")
async def debug_question_pdf_info(question_id: UUID, db: Session = Depends(get_db)):
    db_question = crud.get_question(db, id=question_id)
    if not db_question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    return {
        "question_id": str(question_id),
        "statement_type": db_question.statement_type,
        "pdf_filename": db_question.pdf_filename,
        "pdf_filesize": db_question.pdf_filesize,
        "has_pdf_statement": bool(db_question.pdf_statement),
        "pdf_statement_size": len(db_question.pdf_statement) if db_question.pdf_statement else 0
    }

# Add these new endpoints to main.py

# Upload solution PDF for question
@app.post("/questions/{question_id}/upload-solution-pdf/", response_model=schemas.Question)
async def upload_question_solution_pdf(
    question_id: UUID,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Validate file type
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")

    # Check file size (limit to 10MB)
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size must be less than 10MB")

    # Get existing question
    db_question = crud.get_question(db, id=question_id)
    if not db_question:
        raise HTTPException(status_code=404, detail="Question not found")

    # Update question with solution PDF data
    update_data = schemas.QuestionUpdate(
        has_solution=True,
        solution_type="pdf",
        solution_pdf_filename=file.filename,
        solution_pdf_filesize=len(content),
        solution_pdf_data=content
    )

    return crud.update_question(db=db, db_obj=db_question, obj_in=update_data)

# Download solution PDF for question
@app.get("/questions/{question_id}/solution-pdf/")
async def download_question_solution_pdf(question_id: UUID, db: Session = Depends(get_db)):
    db_question = crud.get_question(db, id=question_id)
    if not db_question:
        raise HTTPException(status_code=404, detail="Question not found")

    # Check if solution PDF data exists
    if not db_question.has_solution or db_question.solution_type != "pdf" or not db_question.solution_pdf:
        raise HTTPException(status_code=404, detail="No solution PDF available for this question")

    # Return PDF with proper headers
    return Response(
        content=db_question.solution_pdf,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"inline; filename={db_question.solution_pdf_filename or 'solution.pdf'}",
            "Cache-Control": "public, max-age=3600"
        }
    )

# Create question with solution PDF upload
@app.post("/questions/create-with-solution-pdf/", response_model=schemas.Question)
async def create_question_with_solution_pdf(
    title: str,
    category_id: UUID,
    difficulty: str,
    max_score: int,
    description: Optional[str] = None,
    problem_statement: Optional[str] = "",
    time_limit_seconds: Optional[int] = 30,
    statement_file: Optional[UploadFile] = File(None),
    solution_file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Validate solution file
    if not solution_file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Solution file must be a PDF")

    solution_content = await solution_file.read()
    if len(solution_content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Solution file size too large (max 10MB)")

    # Handle statement file if provided
    statement_content = None
    statement_type = 'html'
    pdf_filename = None
    pdf_filesize = None
    
    if statement_file:
        if not statement_file.filename.lower().endswith('.pdf'):
            raise HTTPException(status_code=400, detail="Statement file must be a PDF")
        statement_content = await statement_file.read()
        if len(statement_content) > 10 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="Statement file size too large (max 10MB)")
        statement_type = 'pdf'
        pdf_filename = statement_file.filename
        pdf_filesize = len(statement_content)

    # Create question data
    question_data = schemas.QuestionCreate(
        title=title,
        category_id=category_id,
        difficulty=difficulty,
        max_score=max_score,
        description=description or "",
        problem_statement=problem_statement or "",
        statement_type=statement_type,
        pdf_filename=pdf_filename,
        pdf_filesize=pdf_filesize,
        time_limit_seconds=time_limit_seconds,
        has_solution=True,
        solution_type="pdf",
        solution_pdf_filename=solution_file.filename,
        solution_pdf_filesize=len(solution_content),
        pdf_data=statement_content,
        solution_pdf_data=solution_content
    )

    return crud.create_question(db=db, obj_in=question_data, user_id=current_user.id)

# Code Snippet Endpoints
@app.get("/code-snippets", response_model=List[schemas.CodeSnippet])
def get_code_snippets(
    skip: int = 0,
    limit: int = 100,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    teacher_profile = crud.get_teacher_profile(db, current_user.id)
    if not teacher_profile:
        raise HTTPException(status_code=404, detail="Teacher profile not found")
    
    return crud.get_code_snippets(db, teacher_profile.id, skip, limit)

@app.get("/code-snippets/{snippet_id}", response_model=schemas.CodeSnippet)
def get_code_snippet(
    snippet_id: uuid.UUID,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    teacher_profile = crud.get_teacher_profile(db, current_user.id)
    if not teacher_profile:
        raise HTTPException(status_code=404, detail="Teacher profile not found")
    
    snippet = crud.get_code_snippet(db, snippet_id, teacher_profile.id)
    if not snippet:
        raise HTTPException(status_code=404, detail="Code snippet not found")
    
    return snippet

@app.post("/code-snippets", response_model=schemas.CodeSnippet)  
def create_code_snippet(
    obj_in: schemas.CodeSnippetCreate,
    current_user=Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    teacher_profile = crud.get_teacher_profile(db, current_user.id)
    if not teacher_profile:
        raise HTTPException(status_code=404, detail="Teacher profile not found")
    
    return crud.create_code_snippet(db, obj_in=obj_in, teacher_id=teacher_profile.id)

@app.put("/code-snippets/{snippet_id}", response_model=schemas.CodeSnippet)
def update_code_snippet(
    snippet_id: uuid.UUID,
    snippet_update: schemas.CodeSnippetUpdate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    teacher_profile = crud.get_teacher_profile(db, current_user.id)
    if not teacher_profile:
        raise HTTPException(status_code=404, detail="Teacher profile not found")
    
    updated_snippet = crud.update_code_snippet(db, snippet_id, teacher_profile.id, snippet_update)
    if not updated_snippet:
        raise HTTPException(status_code=404, detail="Code snippet not found")
    
    return updated_snippet

@app.delete("/code-snippets/{snippet_id}")
def delete_code_snippet(
    snippet_id: uuid.UUID,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    teacher_profile = crud.get_teacher_profile(db, current_user.id)
    if not teacher_profile:
        raise HTTPException(status_code=404, detail="Teacher profile not found")
    
    success = crud.delete_code_snippet(db, snippet_id, teacher_profile.id)
    if not success:
        raise HTTPException(status_code=404, detail="Code snippet not found")
    
    return {"message": "Code snippet deleted successfully"}

# Lesson Endpoints
@app.get("/lessons", response_model=List[schemas.Lesson])
def get_lessons(
    skip: int = 0,
    limit: int = 100,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    teacher_profile = crud.get_teacher_profile(db, current_user.id)
    if not teacher_profile:
        raise HTTPException(status_code=404, detail="Teacher profile not found")
    
    return crud.get_lessons(db, teacher_profile.id, skip, limit)

@app.get("/lessons/{lesson_id}", response_model=schemas.Lesson)
def get_lesson(
    lesson_id: uuid.UUID,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    teacher_profile = crud.get_teacher_profile(db, current_user.id)
    if not teacher_profile:
        raise HTTPException(status_code=404, detail="Teacher profile not found")
    
    lesson = crud.get_lesson(db, lesson_id, teacher_profile.id)
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    
    return lesson

@app.post("/lessons", response_model=schemas.Lesson)
def create_lesson(
    lesson: schemas.LessonCreate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    teacher_profile = crud.get_teacher_profile(db, current_user.id)
    if not teacher_profile:
        raise HTTPException(status_code=404, detail="Teacher profile not found")
    
    return crud.create_lesson(db, lesson, teacher_profile.id)

@app.put("/lessons/{lesson_id}", response_model=schemas.Lesson)
def update_lesson(
    lesson_id: uuid.UUID,
    lesson_update: schemas.LessonUpdate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    teacher_profile = crud.get_teacher_profile(db, current_user.id)
    if not teacher_profile:
        raise HTTPException(status_code=404, detail="Teacher profile not found")
    
    updated_lesson = crud.update_lesson(db, lesson_id, teacher_profile.id, lesson_update)
    if not updated_lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    
    return updated_lesson

@app.delete("/lessons/{lesson_id}")
def delete_lesson(
    lesson_id: uuid.UUID,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    teacher_profile = crud.get_teacher_profile(db, current_user.id)
    if not teacher_profile:
        raise HTTPException(status_code=404, detail="Teacher profile not found")
    
    success = crud.delete_lesson(db, lesson_id, teacher_profile.id)
    if not success:
        raise HTTPException(status_code=404, detail="Lesson not found")
    
    return {"message": "Lesson deleted successfully"}

@app.post("/lessons/{lesson_id}/upload-pdf/{pdf_type}")
def upload_lesson_pdf(
    lesson_id: uuid.UUID,
    pdf_type: str,
    file: UploadFile = File(...),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if pdf_type not in ["cdp", "timetable"]:
        raise HTTPException(status_code=400, detail="PDF type must be 'cdp' or 'timetable'")
    
    if not file.content_type == "application/pdf":
        raise HTTPException(status_code=400, detail="File must be a PDF")
    
    teacher_profile = crud.get_teacher_profile(db, current_user.id)
    if not teacher_profile:
        raise HTTPException(status_code=404, detail="Teacher profile not found")
    
    file_data = file.file.read()
    updated_lesson = crud.update_lesson_pdf(db, lesson_id, teacher_profile.id, pdf_type, file_data, file.filename)
    
    if not updated_lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    
    return {"message": f"{pdf_type.upper()} PDF uploaded successfully"}

@app.get("/lessons/{lesson_id}/pdf/{pdf_type}")
def get_lesson_pdf(
    lesson_id: uuid.UUID,
    pdf_type: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if pdf_type not in ["cdp", "timetable"]:
        raise HTTPException(status_code=400, detail="PDF type must be 'cdp' or 'timetable'")
    
    teacher_profile = crud.get_teacher_profile(db, current_user.id)
    if not teacher_profile:
        raise HTTPException(status_code=404, detail="Teacher profile not found")
    
    lesson = crud.get_lesson(db, lesson_id, teacher_profile.id)
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    
    pdf_data = None
    filename = None
    
    if pdf_type == "cdp":
        pdf_data = lesson.cdp_pdf
        filename = lesson.cdp_pdf_filename
    elif pdf_type == "timetable":
        pdf_data = lesson.timetable_pdf
        filename = lesson.timetable_pdf_filename
    
    if not pdf_data:
        raise HTTPException(status_code=404, detail=f"{pdf_type.upper()} PDF not found")
    
    return StreamingResponse(
        io.BytesIO(pdf_data),
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename={filename}"}
    )

# Kanban Task Endpoints
@app.get("/kanban-tasks", response_model=List[schemas.KanbanTask])
def get_kanban_tasks(
    department: Optional[str] = None,
    batch_year: Optional[int] = None,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    teacher_profile = crud.get_teacher_profile(db, current_user.id)
    if not teacher_profile:
        raise HTTPException(status_code=404, detail="Teacher profile not found")
    
    return crud.get_kanban_tasks(db, teacher_profile.id, department, batch_year)

@app.get("/kanban-tasks/{task_id}", response_model=schemas.KanbanTask)
def get_kanban_task(
    task_id: uuid.UUID,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    teacher_profile = crud.get_teacher_profile(db, current_user.id)
    if not teacher_profile:
        raise HTTPException(status_code=404, detail="Teacher profile not found")
    
    task = crud.get_kanban_task(db, task_id, teacher_profile.id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    return task

@app.post("/kanban-tasks", response_model=schemas.KanbanTask)
def create_kanban_task(
    task: schemas.KanbanTaskCreate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    teacher_profile = crud.get_teacher_profile(db, current_user.id)
    if not teacher_profile:
        raise HTTPException(status_code=404, detail="Teacher profile not found")
    
    return crud.create_kanban_task(db, task, teacher_profile.id)

@app.put("/kanban-tasks/{task_id}", response_model=schemas.KanbanTask)
def update_kanban_task(
    task_id: uuid.UUID,
    task_update: schemas.KanbanTaskUpdate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    teacher_profile = crud.get_teacher_profile(db, current_user.id)
    if not teacher_profile:
        raise HTTPException(status_code=404, detail="Teacher profile not found")
    
    updated_task = crud.update_kanban_task(db, task_id, teacher_profile.id, task_update)
    if not updated_task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    return updated_task

@app.delete("/kanban-tasks/{task_id}")
def delete_kanban_task(
    task_id: uuid.UUID,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    teacher_profile = crud.get_teacher_profile(db, current_user.id)
    if not teacher_profile:
        raise HTTPException(status_code=404, detail="Teacher profile not found")
    
    success = crud.delete_kanban_task(db, task_id, teacher_profile.id)
    if not success:
        raise HTTPException(status_code=404, detail="Task not found")
    
    return {"message": "Task deleted successfully"}

# Class Schedule Endpoints
@app.get("/class-schedules", response_model=List[schemas.ClassSchedule])
def get_class_schedules(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    teacher_profile = crud.get_teacher_profile(db, current_user.id)
    if not teacher_profile:
        raise HTTPException(status_code=404, detail="Teacher profile not found")
    
    return crud.get_class_schedules(db, teacher_profile.id, start_date, end_date)

@app.get("/upcoming-schedules", response_model=List[schemas.ClassSchedule])
def get_upcoming_schedules(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    teacher_profile = crud.get_teacher_profile(db, current_user.id)
    if not teacher_profile:
        raise HTTPException(status_code=404, detail="Teacher profile not found")
    
    schedules = crud.get_upcoming_schedules(db, teacher_profile.id)
    
    # Mark as notified
    for schedule in schedules:
        crud.mark_schedule_notified(db, schedule.id)
    
    return schedules

@app.get("/class-schedules/{schedule_id}", response_model=schemas.ClassSchedule)
def get_class_schedule(
    schedule_id: uuid.UUID,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    teacher_profile = crud.get_teacher_profile(db, current_user.id)
    if not teacher_profile:
        raise HTTPException(status_code=404, detail="Teacher profile not found")
    
    schedule = crud.get_class_schedule(db, schedule_id, teacher_profile.id)
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    
    return schedule

@app.post("/class-schedules", response_model=schemas.ClassSchedule)
def create_class_schedule(
    schedule: schemas.ClassScheduleCreate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    teacher_profile = crud.get_teacher_profile(db, current_user.id)
    if not teacher_profile:
        raise HTTPException(status_code=404, detail="Teacher profile not found")
    
    return crud.create_class_schedule(db, schedule, teacher_profile.id)

@app.put("/class-schedules/{schedule_id}", response_model=schemas.ClassSchedule)
def update_class_schedule(
    schedule_id: uuid.UUID,
    schedule_update: schemas.ClassScheduleUpdate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    teacher_profile = crud.get_teacher_profile(db, current_user.id)
    if not teacher_profile:
        raise HTTPException(status_code=404, detail="Teacher profile not found")
    
    updated_schedule = crud.update_class_schedule(db, schedule_id, teacher_profile.id, schedule_update)
    if not updated_schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    
    return updated_schedule

@app.delete("/class-schedules/{schedule_id}")
def delete_class_schedule(
    schedule_id: uuid.UUID,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    teacher_profile = crud.get_teacher_profile(db, current_user.id)
    if not teacher_profile:
        raise HTTPException(status_code=404, detail="Teacher profile not found")
    
    success = crud.delete_class_schedule(db, schedule_id, teacher_profile.id)
    if not success:
        raise HTTPException(status_code=404, detail="Schedule not found")
    
    return {"message": "Schedule deleted successfully"}

# Diagram File Endpoints
@app.post("/diagram-files", response_model=schemas.DiagramFile)
def upload_diagram_file(
    file: UploadFile = File(...),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    teacher_profile = crud.get_teacher_profile(db, current_user.id)
    if not teacher_profile:
        raise HTTPException(status_code=404, detail="Teacher profile not found")
    
    file_data = file.file.read()
    db_file = crud.create_diagram_file(db, teacher_profile.id, file.filename, file_data, file.content_type)
    
    return schemas.DiagramFile.model_validate(db_file)

@app.get("/diagram-files", response_model=List[schemas.DiagramFile])
def get_diagram_files(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    teacher_profile = crud.get_teacher_profile(db, current_user.id)
    if not teacher_profile:
        raise HTTPException(status_code=404, detail="Teacher profile not found")
    
    files = crud.get_diagram_files(db, teacher_profile.id)
    return [schemas.DiagramFile.model_validate(f) for f in files]

@app.get("/diagram-files/{file_id}")
def download_diagram_file(
    file_id: uuid.UUID,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    teacher_profile = crud.get_teacher_profile(db, current_user.id)
    if not teacher_profile:
        raise HTTPException(status_code=404, detail="Teacher profile not found")
    
    db_file = crud.get_diagram_file(db, file_id, teacher_profile.id)
    if not db_file:
        raise HTTPException(status_code=404, detail="File not found")
    
    return StreamingResponse(
        io.BytesIO(db_file.file_data),
        media_type=db_file.content_type,
        headers={"Content-Disposition": f"attachment; filename={db_file.filename}"}
    )

@app.delete("/diagram-files/{file_id}")
def delete_diagram_file(
    file_id: uuid.UUID,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    teacher_profile = crud.get_teacher_profile(db, current_user.id)
    if not teacher_profile:
        raise HTTPException(status_code=404, detail="Teacher profile not found")
    
    success = crud.delete_diagram_file(db, file_id, teacher_profile.id)
    if not success:
        raise HTTPException(status_code=404, detail="File not found")
    
    return {"message": "File deleted successfully"}

@app.get("/teachers/{teacher_id}/courses", response_model=schemas.TeacherCoursesResponse)
async def get_teacher_courses_endpoint(teacher_id: str, db: Session = Depends(get_db)):
    """Get courses taught by a specific teacher"""
    courses = crud.get_teacher_courses(db, teacher_id)
    return schemas.TeacherCoursesResponse(
        teacher_id=teacher_id,
        courses=courses
    )

@app.get("/courses/{course_id}/teachers", response_model=List[schemas.TeacherCourseResponse])
async def get_course_teachers_endpoint(course_id: str, db: Session = Depends(get_db)):
    """Get teachers teaching a specific course"""
    teachers = crud.get_course_teachers(db, course_id)
    return teachers

@app.put("/teachers/{teacher_id}/courses", response_model=schemas.UpdateTeacherCoursesResponse)
async def update_teacher_courses_endpoint(
    teacher_id: str, 
    request: schemas.UpdateTeacherCoursesRequest,
    db: Session = Depends(get_db)
):
    """Update courses taught by a teacher"""
    try:
        updated_profile = crud.update_teacher_courses(db, teacher_id, request.course_ids)
        if not updated_profile:
            raise HTTPException(status_code=404, detail="Teacher profile not found")
        
        return schemas.UpdateTeacherCoursesResponse(
            message="Courses updated successfully",
            teacher_id=teacher_id,
            courses=updated_profile.courses
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/teacher-profiles/by-user/{user_id}")
async def get_teacher_profile_by_user_id(user_id: str, db: Session = Depends(get_db)):
    """Get teacher profile by user ID"""
    try:
        import uuid
        
        # Convert string to UUID
        try:
            user_uuid = uuid.UUID(user_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid user ID format")
        
        teacher_profile = db.query(models.TeacherProfile).filter(
            models.TeacherProfile.user_id == user_uuid
        ).first()
        
        if not teacher_profile:
            raise HTTPException(status_code=404, detail="Teacher profile not found")
        
        # Return as dict to avoid Pydantic validation issues
        return {
            "id": str(teacher_profile.id),
            "user_id": str(teacher_profile.user_id), 
            "employee_id": teacher_profile.employee_id,
            "first_name": teacher_profile.first_name,
            "last_name": teacher_profile.last_name,
            "department": teacher_profile.department,
            "designation": teacher_profile.designation,
            "courses": teacher_profile.courses or [],
            "extra_data": teacher_profile.extra_data or {},
            "created_at": teacher_profile.created_at.isoformat() if teacher_profile.created_at else None,
            "updated_at": teacher_profile.updated_at.isoformat() if teacher_profile.updated_at else None
        }
        
    except HTTPException:
        raise  # Re-raise HTTP exceptions
    except Exception as e:
        logger.error(f"Error fetching teacher profile: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.put("/teacher-profiles/by-user/{user_id}")
async def update_teacher_profile_by_user_id(
    user_id: str, 
    profile_data: schemas.TeacherProfileUpdate,  # Create this schema
    db: Session = Depends(get_db)
):
    """Update teacher profile by user ID"""
    try:
        # Find the teacher profile
        teacher_profile = db.query(models.TeacherProfile).filter(
            models.TeacherProfile.user_id == user_id
        ).first()
        
        if not teacher_profile:
            raise HTTPException(status_code=404, detail="Teacher profile not found")
        
        # Update the profile fields
        for field, value in profile_data.dict(exclude_unset=True).items():
            setattr(teacher_profile, field, value)
        
        db.commit()
        db.refresh(teacher_profile)
        
        return teacher_profile
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    
# Upload Notes Endpoints
@app.get("/upload-notes", response_model=List[schemas.UploadedNote])
def get_upload_notes(
    # Pagination
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(50, ge=1, le=100, description="Maximum number of records to return"),
    
    # Filtering
    course_ids: Optional[str] = Query(None, description="Comma-separated list of course IDs"),
    course_id: Optional[uuid.UUID] = Query(None, description="Single course ID (for backward compatibility)"),
    category: Optional[str] = Query(None, description="Filter by note category"),
    search: Optional[str] = Query(None, description="Search in title and description"),
    tags: Optional[str] = Query(None, description="Comma-separated list of tags to filter by"),
    
    # Sorting
    sort_by: Optional[str] = Query("created_at", description="Sort by: created_at, updated_at, title"),
    sort_order: Optional[str] = Query("desc", description="Sort order: asc, desc"),
    
    # User context
    current_user=Depends(get_current_user),  # Add user context
    db: Session = Depends(get_db)
):
    """
    Get notes based on user role:
    - Teachers: See all their created notes (ignore is_public)
    - Students: See only public notes from enrolled courses
    """
    try:
        # Check if user is a teacher
        teacher_profile = crud.get_teacher_profile(db, current_user.id)
        
        if teacher_profile:
            # TEACHER VIEW: Show all notes created by this teacher
            query = db.query(models.UploadedNote).filter(
                models.UploadedNote.teacher_id == teacher_profile.id
            )
        else:
            # STUDENT VIEW: Show only public notes
            query = db.query(models.UploadedNote).filter(
                models.UploadedNote.is_public == True
            )
        
        # Apply course filtering
        if course_ids:
            course_id_list = [uuid.UUID(cid.strip()) for cid in course_ids.split(',') if cid.strip()]
            if course_id_list:
                query = query.filter(models.UploadedNote.course_id.in_(course_id_list))
        elif course_id:
            query = query.filter(models.UploadedNote.course_id == course_id)
        
        # Apply category filtering
        if category:
            try:
                if hasattr(models, 'NoteCategory'):
                    category_enum = models.NoteCategory(category)
                    query = query.filter(models.UploadedNote.category == category_enum)
                else:
                    query = query.filter(models.UploadedNote.category == category)
            except ValueError as e:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Invalid category value: {category}"
                )
        
        # Apply search filtering
        if search:
            search_term = f"%{search.lower()}%"
            query = query.filter(
                or_(
                    func.lower(models.UploadedNote.title).contains(search_term),
                    func.lower(models.UploadedNote.description).contains(search_term)
                )
            )
        
        # Apply tags filtering
        if tags:
            tag_list = [tag.strip() for tag in tags.split(',') if tag.strip()]
            for tag in tag_list:
                query = query.filter(models.UploadedNote.tags.contains([tag]))
        
        # Apply sorting
        if sort_by == "title":
            order_column = models.UploadedNote.title
        elif sort_by == "updated_at":
            order_column = models.UploadedNote.updated_at
        else:
            order_column = models.UploadedNote.created_at
        
        if sort_order == "desc":
            order_column = desc(order_column)
        
        # Execute query with pagination
        notes = query.order_by(order_column).offset(skip).limit(limit).all()
        
        return notes
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"Error in get_upload_notes: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail=f"Error retrieving notes: {str(e)}"
        )


@app.get("/upload-notes/{note_id}", response_model=schemas.UploadedNote)
def get_uploaded_note(
    note_id: uuid.UUID,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    teacher_profile = crud.get_teacher_profile(db, current_user.id)
    if not teacher_profile:
        raise HTTPException(status_code=404, detail="Teacher profile not found")
    
    note = crud.get_uploaded_note(db, note_id, teacher_profile.id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    
    return note

@app.post("/upload-notes", response_model=schemas.UploadedNote)
def create_uploaded_note(
    obj_in: schemas.UploadedNoteCreate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    teacher_profile = crud.get_teacher_profile(db, current_user.id)
    if not teacher_profile:
        raise HTTPException(status_code=404, detail="Teacher profile not found")
    
    return crud.create_uploaded_note(db, obj_in=obj_in, teacher_id=teacher_profile.id)

@app.put("/upload-notes/{note_id}", response_model=schemas.UploadedNote)
def update_uploaded_note(
    note_id: uuid.UUID,
    obj_in: schemas.UploadedNoteUpdate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    teacher_profile = crud.get_teacher_profile(db, current_user.id)
    if not teacher_profile:
        raise HTTPException(status_code=404, detail="Teacher profile not found")
    
    result = crud.update_uploaded_note(db, note_id, teacher_profile.id, obj_in)
    if not result:
        raise HTTPException(status_code=404, detail="Note not found")
    return result

@app.delete("/upload-notes/{note_id}")
def delete_uploaded_note(
    note_id: uuid.UUID,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    teacher_profile = crud.get_teacher_profile(db, current_user.id)
    if not teacher_profile:
        raise HTTPException(status_code=404, detail="Teacher profile not found")
    
    success = crud.delete_uploaded_note(db, note_id, teacher_profile.id)
    if not success:
        raise HTTPException(status_code=404, detail="Note not found")
    
    return {"message": "Note deleted successfully"}

@app.delete("/upload-notes/bulk-delete")
def bulk_delete_notes(
    bulk_request: schemas.BulkDeleteRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    teacher_profile = crud.get_teacher_profile(db, current_user.id)
    if not teacher_profile:
        raise HTTPException(status_code=404, detail="Teacher profile not found")
    
    count = crud.delete_multiple_notes(db, bulk_request.note_ids, teacher_profile.id)
    return {"message": f"{count} notes deleted successfully"}

# File Management Endpoints
@app.post("/upload-notes/{note_id}/files")
def upload_note_files(
    note_id: uuid.UUID,
    files: List[UploadFile] = File(...),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    teacher_profile = crud.get_teacher_profile(db, current_user.id)
    if not teacher_profile:
        raise HTTPException(status_code=404, detail="Teacher profile not found")
    
    # Verify note belongs to teacher
    note = crud.get_uploaded_note(db, note_id, teacher_profile.id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    
    uploaded_files = []
    for file in files:
        file_data = file.file.read()
        file_size = len(file_data)
        
        # Generate unique filename while preserving original
        filename = f"{uuid.uuid4()}_{file.filename}"
        
        db_file = crud.create_note_file(
            db, note_id, filename, file.filename, file_data, file.content_type, file_size
        )
        uploaded_files.append({
            "id": db_file.id,
            "filename": db_file.filename,
            "original_filename": db_file.original_filename,
            "size": db_file.file_size
        })
    
    return {"message": f"{len(uploaded_files)} files uploaded successfully", "files": uploaded_files}

@app.get("/upload-notes/{note_id}/files", response_model=List[schemas.NoteFile])
def get_note_files(
    note_id: uuid.UUID,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    teacher_profile = crud.get_teacher_profile(db, current_user.id)
    if not teacher_profile:
        raise HTTPException(status_code=404, detail="Teacher profile not found")
    
    files = crud.get_note_files(db, note_id, teacher_profile.id)
    return files

@app.get("/upload-notes/files/{file_id}")
def get_public_file(
    file_id: uuid.UUID,
    db: Session = Depends(get_db)
):
    try:
        # Verify file belongs to a public note
        file_record = db.query(models.NoteFile).join(
            models.UploadedNote
        ).filter(
            and_(
                models.NoteFile.id == file_id,
                models.UploadedNote.is_public == True  # Only public files
            )
        ).first()
        
        if not file_record:
            raise HTTPException(status_code=404, detail="File not found or not public")
        
        return Response(
            content=file_record.file_data,
            media_type=file_record.content_type,
            headers={
                "Content-Type": file_record.content_type,
                "Content-Disposition": f"inline; filename=\"{file_record.original_filename}\"",
                "Accept-Ranges": "bytes"
            }
        )
        
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving file: {str(e)}"
        )

@app.delete("/upload-notes/files/{file_id}")
def delete_note_file(
    file_id: uuid.UUID,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    teacher_profile = crud.get_teacher_profile(db, current_user.id)
    if not teacher_profile:
        raise HTTPException(status_code=404, detail="Teacher profile not found")
    
    success = crud.delete_note_file(db, file_id, teacher_profile.id)
    if not success:
        raise HTTPException(status_code=404, detail="File not found")
    
    return {"message": "File deleted successfully"}

@app.get("/upload-notes/{note_id}/download-all")
def download_all_files(
    note_id: uuid.UUID,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    teacher_profile = crud.get_teacher_profile(db, current_user.id)
    if not teacher_profile:
        raise HTTPException(status_code=404, detail="Teacher profile not found")
    
    note = crud.get_uploaded_note(db, note_id, teacher_profile.id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    
    files = crud.get_note_files(db, note_id, teacher_profile.id)
    if not files:
        raise HTTPException(status_code=404, detail="No files found")
    
    # Create ZIP file
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
        for file in files:
            zip_file.writestr(file.original_filename, file.file_data)
    
    zip_buffer.seek(0)
    
    return StreamingResponse(
        io.BytesIO(zip_buffer.getvalue()),
        media_type="application/zip",
        headers={
            "Content-Disposition": f"attachment; filename={note.title}_files.zip"
        }
    )

@app.get("/courses", response_model=List[schemas.CourseInfo])
def get_courses(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db)
    ):
    return crud.get_courses(db, skip=skip, limit=limit)

@app.get("/upload-notes/stats")
def get_note_stats(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    teacher_profile = crud.get_teacher_profile(db, current_user.id)
    if not teacher_profile:
        raise HTTPException(status_code=404, detail="Teacher profile not found")
    
    return crud.get_note_stats(db, teacher_profile.id)

@app.get("/upload-notes", response_model=List[schemas.UploadedNote])
def get_upload_notes_public(
    # Pagination
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(50, ge=1, le=100, description="Maximum number of records to return"),
    
    # Filtering
    course_id: Optional[uuid.UUID] = Query(None, description="Filter by specific course ID"),
    category: Optional[str] = Query(None, description="Filter by note category"),
    search: Optional[str] = Query(None, description="Search in title and description"),
    tags: Optional[str] = Query(None, description="Comma-separated list of tags to filter by"),
    
    # Sorting
    sort_by: Optional[str] = Query("created_at", description="Sort by: created_at, updated_at, title"),
    sort_order: Optional[str] = Query("desc", description="Sort order: asc, desc"),
    
    db: Session = Depends(get_db)
):
    """
    Get public notes - no authentication required
    
    Returns all notes that are marked as public (is_public=True)
    with optional filtering and sorting capabilities.
    """
    try:
        # Base query - only public notes
        query = db.query(models.UploadedNote).filter(
            models.UploadedNote.is_public == True
        )
        
        # Apply filters
        if course_id:
            query = query.filter(models.UploadedNote.course_id == course_id)
        
        if category:
            query = query.filter(models.UploadedNote.category == category)
        
        if search:
            search_term = f"%{search.lower()}%"
            query = query.filter(
                or_(
                    func.lower(models.UploadedNote.title).contains(search_term),
                    func.lower(models.UploadedNote.description).contains(search_term)
                )
            )
        
        if tags:
            tag_list = [tag.strip() for tag in tags.split(',') if tag.strip()]
            for tag in tag_list:
                query = query.filter(models.UploadedNote.tags.contains([tag]))
        
        # Apply sorting
        if sort_by == "title":
            order_column = models.UploadedNote.title
        elif sort_by == "updated_at":
            order_column = models.UploadedNote.updated_at
        else:
            order_column = models.UploadedNote.created_at
        
        if sort_order == "desc":
            order_column = desc(order_column)
        
        # Execute query with pagination
        notes = query.order_by(order_column).offset(skip).limit(limit).all()
        
        return notes
        
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Error retrieving public notes: {str(e)}"
        )

@app.get("/courses", response_model=List[schemas.CourseInfo])
def get_courses_public(db: Session = Depends(get_db)):
    """
    Get all courses - no authentication required
    """
    try:
        courses = db.query(models.Course).all()
        return courses
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving courses: {str(e)}"
        )

@app.get("/upload-notes/files/{file_id}")
def get_public_file(
    file_id: uuid.UUID,
    db: Session = Depends(get_db)
):
    """
    Download public note file - no authentication required
    """
    try:
        # Verify file belongs to a public note
        file_record = db.query(models.NoteFile).join(
            models.UploadedNote
        ).filter(
            and_(
                models.NoteFile.id == file_id,
                models.UploadedNote.is_public == True
            )
        ).first()
        
        if not file_record:
            raise HTTPException(status_code=404, detail="File not found or not public")
        
        # Return file using Response
        return Response(
            content=file_record.file_data,
            media_type=file_record.content_type,
            headers={
                "Content-Type": file_record.content_type,
                "Content-Disposition": f"inline; filename=\"{file_record.original_filename}\"",
                "Accept-Ranges": "bytes"
            }
        )
        
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving file: {str(e)}"
        )

@app.delete("/upload-notes/bulk-delete")
def bulk_download_public_notes(
    bulk_request: schemas.BulkDeleteRequest,  # Reuse schema for note IDs
    db: Session = Depends(get_db)
):
    """
    Bulk download public notes - no authentication required
    """
    try:
        # Get only public notes from the requested IDs
        notes = db.query(models.UploadedNote).filter(
            and_(
                models.UploadedNote.id.in_(bulk_request.note_ids),
                models.UploadedNote.is_public == True
            )
        ).all()
        
        if not notes:
            raise HTTPException(status_code=404, detail="No public notes found")
        
        # Create ZIP file
        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            for note in notes:
                files = db.query(models.NoteFile).filter(
                    models.NoteFile.note_id == note.id
                ).all()
                
                for file in files:
                    # Create organized folder structure
                    course = db.query(models.Course).filter(
                        models.Course.id == note.course_id
                    ).first()
                    
                    course_name = course.course_code if course else 'Unknown'
                    folder_path = f"{course_name}/{note.title}/"
                    file_path = folder_path + file.original_filename
                    
                    zip_file.writestr(file_path, file.file_data)
        
        zip_buffer.seek(0)
        
        return StreamingResponse(
            io.BytesIO(zip_buffer.getvalue()),
            media_type="application/zip",
            headers={
                "Content-Disposition": f"attachment; filename=public_notes_{int(time.time())}.zip"
            }
        )
        
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=500,
            detail=f"Error creating download: {str(e)}"
        )

@app.post("/upload-notes/bulk-download")  # Changed from @app.delete
def bulk_download_public_notes(
    bulk_request: schemas.BulkDownloadRequest,  # Can reuse the same schema
    db: Session = Depends(get_db)
):
    try:
        # Get only public notes from the requested IDs
        notes = db.query(models.UploadedNote).filter(
            and_(
                models.UploadedNote.id.in_(bulk_request.note_ids),
                models.UploadedNote.is_public == True
            )
        ).all()
        
        if not notes:
            raise HTTPException(status_code=404, detail="No public notes found")
        
        # Create ZIP file
        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            for note in notes:
                files = db.query(models.NoteFile).filter(
                    models.NoteFile.note_id == note.id
                ).all()
                
                for file in files:
                    course = db.query(models.Course).filter(
                        models.Course.id == note.course_id
                    ).first()
                    
                    course_name = course.course_code if course else 'Unknown'
                    folder_path = f"{course_name}/{note.title}/"
                    file_path = folder_path + file.original_filename
                    
                    zip_file.writestr(file_path, file.file_data)
        
        zip_buffer.seek(0)
        
        return StreamingResponse(
            io.BytesIO(zip_buffer.getvalue()),
            media_type="application/zip",
            headers={
                "Content-Disposition": f"attachment; filename=public_notes_{int(time.time())}.zip"
            }
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
# Teacher Timetable Endpoints
@app.post("/teachers/{user_id}/timetable", response_model=schemas.TeacherTimetableResponse) # Changed from teacher_id to user_id
def upload_teacher_timetable(
    user_id: uuid.UUID,  # Changed parameter name
    file: UploadFile = File(...),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    print(f"Current user ID: {current_user.id}")
    print(f"Requested user ID: {user_id}")
    
    # Check if current user matches the requested user
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Access denied: Cannot modify other user's timetable")
    
    # Verify teacher profile exists for this user
    teacher_profile = crud.get_teacher_profile(db, current_user.id)
    if not teacher_profile:
        raise HTTPException(status_code=403, detail="Teacher profile not found")
    
    if not file.content_type.startswith('application/pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    
    file_data = file.file.read()
    
    # Store timetable using user_id instead of teacher_profile.id
    timetable = crud.create_or_update_teacher_timetable(
        db, current_user.id, file.filename, file_data  # Use user_id here
    )
    
    return timetable

@app.get("/teachers/{user_id}/timetable")  # Changed from teacher_id to user_id
def get_teacher_timetable_pdf(
    user_id: uuid.UUID,  # Changed parameter name
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Check access
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    timetable = crud.get_teacher_timetable(db, user_id)  # Pass user_id
    if not timetable or not timetable.timetable_data:
        raise HTTPException(status_code=404, detail="Timetable not found")
    
    return Response(
        content=timetable.timetable_data,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"inline; filename=\"{timetable.timetable_filename}\""
        }
    )


# Course CDP Endpoints
@app.post("/courses/{course_id}/cdp", response_model=schemas.CourseDevelopmentPlanResponse)
def upload_course_cdp(
    course_id: uuid.UUID,
    file: UploadFile = File(...),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    teacher_profile = crud.get_teacher_profile(db, current_user.id)
    if not teacher_profile:
        raise HTTPException(status_code=403, detail="Teacher profile required")
    
    if not file.content_type.startswith('application/pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    
    try:
        file_data = file.file.read()  # This returns bytes directly
        
        # Create or update CDP record
        cdp = crud.create_or_update_course_cdp(
            db, course_id, teacher_profile.id, file.filename, file_data
        )
        
        return cdp
        
    except Exception as e:
        print(f"Error processing file: {str(e)}")
        raise HTTPException(status_code=500, detail="Error processing file upload")

@app.get("/courses/{course_id}/cdp")
def get_course_cdp_pdf(
    course_id: uuid.UUID,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    teacher_profile = crud.get_teacher_profile(db, current_user.id)
    if not teacher_profile:
        raise HTTPException(status_code=403, detail="Teacher profile required")
    
    cdp = crud.get_course_cdp(db, course_id, teacher_profile.id)
    if not cdp or not cdp.cdp_data:
        raise HTTPException(status_code=404, detail="CDP not found")
    
    return Response(
        content=cdp.cdp_data,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"inline; filename=\"{cdp.cdp_filename}\""
        }
    )

# Course Lessons Endpoints
@app.get("/courses/{course_id}/lessons", response_model=List[schemas.Lesson])
def get_course_lessons(
    course_id: uuid.UUID,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    teacher_profile = crud.get_teacher_profile(db, current_user.id)
    if not teacher_profile:
        raise HTTPException(status_code=403, detail="Teacher profile required")
    
    lessons = crud.get_course_lessons(db, course_id, teacher_profile.id)
    return lessons

@app.post("/courses/{course_id}/lessons", response_model=schemas.Lesson)
def create_course_lesson(
    course_id: uuid.UUID,
    lesson: schemas.LessonCreate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    teacher_profile = crud.get_teacher_profile(db, current_user.id)
    if not teacher_profile:
        raise HTTPException(status_code=403, detail="Teacher profile required")
    
    # Ensure the lesson belongs to the correct course and teacher
    lesson.course_id = course_id
    lesson.teacher_id = teacher_profile.id
    
    new_lesson = crud.create_lesson(db, lesson)
    return new_lesson

@app.put("/lessons/{lesson_id}", response_model=schemas.Lesson)
def update_lesson(
    lesson_id: uuid.UUID,
    lesson_update: schemas.LessonCreate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    teacher_profile = crud.get_teacher_profile(db, current_user.id)
    if not teacher_profile:
        raise HTTPException(status_code=403, detail="Teacher profile required")
    
    lesson_update.teacher_id = teacher_profile.id
    updated_lesson = crud.update_lesson(db, lesson_id, lesson_update)
    
    if not updated_lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    
    return updated_lesson

@app.delete("/lessons/{lesson_id}")
def delete_lesson(
    lesson_id: uuid.UUID,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    teacher_profile = crud.get_teacher_profile(db, current_user.id)
    if not teacher_profile:
        raise HTTPException(status_code=403, detail="Teacher profile required")
    
    success = crud.delete_lesson(db, lesson_id, teacher_profile.id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Lesson not found")
    
    return {"message": "Lesson deleted successfully"}

@app.get("/teachers/me/profile", response_model=schemas.TeacherProfile)
def get_my_teacher_profile(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    teacher_profile = crud.get_teacher_profile(db, user_id=current_user.id)
    if not teacher_profile:
        raise HTTPException(status_code=404, detail="Teacher profile not found")
    return teacher_profile

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

# Activity routes
@app.get("/activities/", response_model=List[schemas.Activity])
def read_activities(
    skip: int = 0,
    limit: int = 100,
    course_id: Optional[UUID] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(models.UserRole.ADMIN, models.UserRole.TEACHER))
):
    activities = crud.get_activities(db, skip=skip, limit=limit, course_id=course_id)
    return activities

@app.get("/activities/{activity_id}", response_model=schemas.Activity)
def read_activity(activity_id: UUID, db: Session = Depends(get_db)):
    db_activity = crud.get_activity(db, id=activity_id)
    if db_activity is None:
        raise HTTPException(status_code=404, detail="Activity not found")
    return db_activity

# Activity routes - CORRECTED VERSION
@app.post("/activities/", response_model=schemas.Activity)
async def create_activity(
    title: str = Form(...),
    description: str = Form(""),
    course_id: UUID = Form(...),
    start_time: str = Form(...),  # Will be converted to datetime
    end_time: str = Form(...),    # Will be converted to datetime
    max_attempts: int = Form(1),
    max_score: int = Form(100),
    file: UploadFile = File(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Create activity with file upload support"""
    try:
        # Parse datetime strings
        start_dt = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
        end_dt = datetime.fromisoformat(end_time.replace('Z', '+00:00'))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid datetime format: {str(e)}")
    
    # Validate course exists
    course = crud.get_course(db, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    # Handle file upload
    pdf_data = None
    pdf_filename = None
    pdf_filesize = None
    
    if file and file.filename:
        # Validate file type
        if not file.filename.lower().endswith('.pdf'):
            raise HTTPException(status_code=400, detail="Only PDF files are allowed")
        
        # Read file content
        pdf_data = await file.read()
        if len(pdf_data) > 10 * 1024 * 1024:  # 10MB limit
            raise HTTPException(status_code=400, detail="File size must be less than 10MB")
        
        pdf_filename = file.filename
        pdf_filesize = len(pdf_data)
    
    # Create activity data object
    activity_data = schemas.ActivityCreate(
        course_id=course_id,
        title=title,
        description=description,
        start_time=start_dt,
        end_time=end_dt,
        max_attempts=max_attempts,
        max_score=max_score,
        pdf_data=pdf_data
    )
    
    # Create the activity
    db_activity = crud.create_activity(db=db, obj_in=activity_data, user_id=current_user.id)
    
    # Set additional PDF metadata if file was uploaded
    if pdf_data:
        db_activity.pdf_filename = pdf_filename
        db_activity.pdf_filesize = pdf_filesize
        db.commit()
        db.refresh(db_activity)
    
    return db_activity

@app.put("/activities/{activity_id}", response_model=schemas.Activity)
async def update_activity(
    activity_id: UUID,
    title: str = Form(None),
    description: str = Form(None),
    start_time: str = Form(None),
    end_time: str = Form(None),
    max_attempts: int = Form(None),
    max_score: int = Form(None),
    file: UploadFile = File(None),
    db: Session = Depends(get_db)
):
    """Update activity with file upload support"""
    db_activity = crud.get_activity(db, id=activity_id)
    if db_activity is None:
        raise HTTPException(status_code=404, detail="Activity not found")
    
    # Prepare update data
    update_data = {}
    
    if title is not None:
        update_data["title"] = title
    if description is not None:
        update_data["description"] = description
    if max_attempts is not None:
        update_data["max_attempts"] = max_attempts
    if max_score is not None:
        update_data["max_score"] = max_score
    
    # Handle datetime parsing
    if start_time is not None:
        try:
            update_data["start_time"] = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid start_time format")
    
    if end_time is not None:
        try:
            update_data["end_time"] = datetime.fromisoformat(end_time.replace('Z', '+00:00'))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid end_time format")
    
    # Handle file upload
    if file and file.filename:
        if not file.filename.lower().endswith('.pdf'):
            raise HTTPException(status_code=400, detail="Only PDF files are allowed")
        
        pdf_data = await file.read()
        if len(pdf_data) > 10 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="File size must be less than 10MB")
        
        update_data["pdf_data"] = pdf_data
        # Update metadata directly on the db object
        db_activity.pdf_filename = file.filename
        db_activity.pdf_filesize = len(pdf_data)
    
    # Create update schema
    activity_update = schemas.ActivityUpdate(**update_data)
    
    # Update the activity
    updated_activity = crud.update_activity(db=db, db_obj=db_activity, obj_in=activity_update)
    
    return updated_activity


@app.delete("/activities/{activity_id}", response_model=schemas.Activity)
def delete_activity(activity_id: UUID, db: Session = Depends(get_db)):
    db_activity = crud.delete_activity(db, id=activity_id)
    if db_activity is None:
        raise HTTPException(status_code=404, detail="Activity not found")
    return db_activity

# Enhanced Activity Endpoints with Judge0 Integration

# PDF Serving
@app.get("/activities/{activity_id}/pdf/")
async def get_activity_pdf(
    activity_id: UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Serve the original PDF for an activity"""
    activity = crud.get_activity(db, activity_id)
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")
    
    # Check access permissions
    if current_user.role == models.UserRole.STUDENT:
        assignment = db.query(models.ActivityAssignment).filter(
            models.ActivityAssignment.activity_id == activity_id,
            models.ActivityAssignment.student_id == current_user.id
        ).first()
        if not assignment:
            raise HTTPException(status_code=403, detail="Access denied")
    
    if not activity.activity_sheet_pdf:
        raise HTTPException(status_code=404, detail="PDF not found")
    
    return Response(
        content=activity.activity_sheet_pdf,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"inline; filename={activity.pdf_filename or 'activity.pdf'}",
            "Cache-Control": "public, max-age=3600"
        }
    )

# Teacher Grading Interface - Statistics
@app.get("/activities/{activity_id}/statistics/", response_model=schemas.ActivityStatistics)
def get_activity_statistics(
    activity_id: UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(models.UserRole.ADMIN, models.UserRole.TEACHER))
):
    """Get comprehensive statistics for an activity"""
    activity = crud.get_activity(db, activity_id)
    if not activity or activity.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    stats = crud.get_activity_statistics_for_teacher(db, activity_id)
    return schemas.ActivityStatistics(**stats)

# Add OPTIONS handler for CORS preflight
@app.options("/activities/{activity_id}/pdf/")
async def pdf_options(activity_id: UUID):
    """Handle preflight requests for PDF endpoint"""
    return Response(
        status_code=200,
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
            "Access-Control-Allow-Headers": "Authorization, Content-Type, Accept",
        }
    )


# Activity Assignment routes
@app.post("/activities/{activity_id}/assign/")
def assign_activity_to_students(
    activity_id: UUID, 
    assignment_data: schemas.BulkActivityAssignmentCreate, 
    db: Session = Depends(get_db)
):
    """Activity Assignment routes"""
    # Check if activity exists
    activity = crud.get_activity(db, activity_id)
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")
    
    # Assign to students
    assignments = crud.bulk_assign_activity_to_students(
        db, activity_id, assignment_data.student_ids  # Fixed: use student_ids not studentids
    )
    
    # Update activity status to active if it has assignments
    if assignments and activity.status == models.ActivityStatus.DRAFT:
        crud.update_activity(
            db, 
            activity, 
            schemas.ActivityUpdate(status=models.ActivityStatus.ACTIVE)
        )
    
    return {
        "message": f"Activity assigned to {len(assignments)} students", 
        "assignments": len(assignments)
    }


@app.post("/activities/{activity_id}/assign-course/")
def assign_activity_to_course(
    activity_id: UUID,
    db: Session = Depends(get_db)
):
    activity = crud.get_activity(db, activity_id)
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")
    
    assignments = crud.assign_activity_to_course_students(db, activity_id, activity.course_id)
    
    # Update activity status to active
    if assignments and activity.status == models.ActivityStatus.DRAFT:
        crud.update_activity(db, activity, schemas.ActivityUpdate(status=models.ActivityStatus.ACTIVE))
    
    return {"message": f"Activity assigned to {len(assignments)} course students", "assignments": len(assignments)}

# Activity Excel Report
@app.get("/activities/{activity_id}/report/excel/")
def export_activity_excel_report(activity_id: UUID, db: Session = Depends(get_db)):
    if not PANDAS_AVAILABLE:
        raise HTTPException(
            status_code=501, 
            detail="Excel export not available. Please install pandas and openpyxl: pip install pandas openpyxl"
        )
    
    activity = crud.get_activity(db, activity_id)
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")

    # Get assignments and submissions
    assignments = crud.get_activity_assignments(db, activity_id=activity_id, limit=1000)
    submissions = crud.get_activity_submissions(db, activity_id=activity_id, limit=1000)
    
    # Create Excel data
    data = []
    for assignment in assignments:
        # Find related submissions
        student_submissions = [s for s in submissions if s.student_id == assignment.student_id]
        
        data.append({
            'Student ID': str(assignment.student_id),
            'Assignment Status': assignment.status.value,
            'Assigned At': assignment.assigned_at.isoformat() if assignment.assigned_at else '',
            'Started At': assignment.started_at.isoformat() if assignment.started_at else '',
            'Completed At': assignment.completed_at.isoformat() if assignment.completed_at else '',
            'Score': assignment.score,
            'Submissions Count': len(student_submissions),
            'Latest Submission': student_submissions[-1].submitted_at.isoformat() if student_submissions else ''
        })
    
    # Create Excel file
    df = pd.DataFrame(data)
    
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, sheet_name='Activity Report', index=False)
    
    output.seek(0)
    
    return StreamingResponse(
        io.BytesIO(output.read()),
        media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        headers={'Content-Disposition': f'attachment; filename=activity_{activity_id}_report.xlsx'}
    )

# Student Activity Routes
@app.get("/me/assignments/", response_model=List[schemas.ActivityAssignmentWithActivity])
def get_my_activity_assignments(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    assignments = crud.get_student_activity_assignments(db, current_user.id)
    return assignments

@app.get("/api/dashboard")
async def analytics_dashboard(db: Session = Depends(get_db)):
    """
    Enhanced Live Analytics dashboard with 4 additional charts
    """
    try:
        now = datetime.now()
        logger.info("🚀 Starting enhanced analytics dashboard calculation")
        
        # ✅ EXISTING: Get real metrics prioritizing SubmissionResult data
        total_submissions = db.query(func.count(models.Submission.id)).scalar() or 0
        total_results = db.query(func.count(models.SubmissionResult.id)).scalar() or 0
        total_questions = db.query(func.count(models.Question.id)).scalar() or 0
        total_categories = db.query(func.count(models.QuestionCategory.id)).scalar() or 0
        
        active_students = db.query(func.count(models.User.id)).filter(
            models.User.role == models.UserRole.STUDENT,
            models.User.is_active == True
        ).scalar() or 0
        
        completed_exams = db.query(func.count(models.Exam.id)).filter(
            models.Exam.status == models.ExamStatus.COMPLETED
        ).scalar() or 0

        logger.info(f"📊 DB Stats: submissions={total_submissions}, results={total_results}, questions={total_questions}, categories={total_categories}, active_students={active_students}")

        # ✅ EXISTING: Calculate analytics data using SubmissionResult as primary source
        topic_performance = calculate_topic_performance_working(db)
        time_trends = calculate_time_trends_working(db)
        failed_problems = get_frequently_failed_problems_working(db)
        leaderboard = get_student_leaderboard_working(db)
        activity = get_daily_activity_working(db)
        avg_score = calculate_average_scores_working(db)
        avg_time = calculate_average_time_working(db)
        submission_rate = calculate_submission_rate_working(db)
        alerts = generate_alerts_working(db)

        # ✅ NEW: Additional enhanced analytics data
        difficulty_distribution = calculate_difficulty_distribution_working(db)
        student_progress = calculate_student_progress_working(db)
        status_breakdown = calculate_submission_status_breakdown_working(db)
        performance_heatmap = calculate_weekly_performance_heatmap_working(db)

        return {
            # ✅ EXISTING: Original analytics data (unchanged)
            "topic_data": topic_performance,
            "time_data": time_trends,
            "failed_problems": failed_problems,
            "leaderboard": leaderboard,
            "activity_data": activity,
            "metrics": {
                "avg_score": avg_score,
                "active_students": active_students,
                "total_submissions": total_submissions,
                "completed_exams": completed_exams,
                "avg_time": avg_time,
                "submission_rate": submission_rate
            },
            "recent_exam_results": [],
            "alerts": alerts,
            
            # ✅ NEW: Enhanced chart data for 4 additional widgets
            "difficulty_distribution": difficulty_distribution,
            "student_progress": student_progress,
            "status_breakdown": status_breakdown,
            "performance_heatmap": performance_heatmap,
            
            "last_updated": now.isoformat(),
            "debug_info": {
                "total_results": total_results,
                "total_questions": total_questions,
                "total_categories": total_categories
            }
        }

    except Exception as e:
        logger.error(f"❌ Enhanced Analytics API error: {str(e)}", exc_info=True)
        return {
            # ✅ EXISTING: Original error structure (unchanged)
            "topic_data": [],
            "time_data": [],
            "failed_problems": [],
            "leaderboard": [],
            "activity_data": [],
            "metrics": {
                "avg_score": 0,
                "active_students": 0,
                "total_submissions": 0,
                "completed_exams": 0,
                "avg_time": 0,
                "submission_rate": 0
            },
            "recent_exam_results": [],
            "alerts": [{
                "id": "api_error",
                "type": "danger",
                "title": "Enhanced API Error",
                "message": f"Error loading enhanced analytics data: {str(e)}",
                "timestamp": datetime.now().isoformat(),
                "priority": "high"
            }],
            
            # ✅ NEW: Empty enhanced chart data on error
            "difficulty_distribution": [],
            "student_progress": [],
            "status_breakdown": [],
            "performance_heatmap": [],
            
            "last_updated": datetime.now().isoformat()
        }


# ✅ NEW: Enhanced Analytics Helper Functions (ADD THESE AFTER YOUR EXISTING FUNCTIONS)

def calculate_difficulty_distribution_working(db: Session):
    """Calculate question difficulty distribution - NEW CHART 1"""
    try:
        logger.info("📊 Calculating difficulty distribution from SubmissionResult")
        
        query = db.query(
            models.Question.extra_data,
            func.count(models.SubmissionResult.id).label('attempt_count')
        ).select_from(models.SubmissionResult)\
        .join(models.Submission, models.Submission.id == models.SubmissionResult.submission_id)\
        .join(models.Question, models.Question.id == models.Submission.question_id)\
        .filter(models.Question.extra_data.isnot(None))\
        .group_by(models.Question.id, models.Question.extra_data)
        
        results = query.all()
        
        if not results:
            return []
        
        difficulty_stats = {"Easy": 0, "Medium": 0, "Hard": 0}
        
        for row in results:
            try:
                extra_data = json.loads(row.extra_data)
                tags = extra_data.get('tags', [])
                attempts = int(row.attempt_count or 0)
                
                # Determine difficulty from tags
                if any(easy_tag in tags for easy_tag in ["array", "hash-table", "string", "math"]):
                    difficulty_stats["Easy"] += attempts
                elif any(hard_tag in tags for hard_tag in ["dynamic-programming", "backtracking", "graph", "tree"]):
                    difficulty_stats["Hard"] += attempts
                else:
                    difficulty_stats["Medium"] += attempts
                    
            except json.JSONDecodeError:
                difficulty_stats["Medium"] += int(row.attempt_count or 0)
        
        # Convert to chart format
        result = []
        total_attempts = sum(difficulty_stats.values())
        for difficulty, count in difficulty_stats.items():
            if count > 0:
                result.append({
                    "difficulty": difficulty,
                    "count": count,
                    "percentage": round((count / total_attempts) * 100, 1) if total_attempts > 0 else 0
                })
        
        logger.info(f"📊 Difficulty distribution: {result}")
        return result
        
    except Exception as e:
        logger.error(f"❌ Error in calculate_difficulty_distribution_working: {e}")
        return []

def calculate_student_progress_working(db: Session):
    """Calculate student progress over time - NEW CHART 2"""
    try:
        logger.info("📈 Calculating student progress over time from SubmissionResult")
        
        # Get submissions from last 30 days
        start_date = datetime.now() - timedelta(days=30)
        
        query = db.query(
            models.User.id.label('student_id'),
            func.coalesce(models.StudentProfile.first_name, 'Student').label('first_name'),
            func.coalesce(models.StudentProfile.last_name, '').label('last_name'),
            func.date(models.Submission.submitted_at).label('submission_date'),
            func.count(models.SubmissionResult.id).label('total_attempts'),
            func.count(
                func.case(
                    (models.SubmissionResult.status == models.ExecutionStatus.ACCEPTED, 1)
                )
            ).label('successful_attempts')
        ).select_from(models.SubmissionResult)\
        .join(models.Submission, models.Submission.id == models.SubmissionResult.submission_id)\
        .join(models.User, models.User.id == models.Submission.student_id)\
        .outerjoin(models.StudentProfile, models.StudentProfile.user_id == models.User.id)\
        .filter(
            models.User.role == models.UserRole.STUDENT,
            models.Submission.submitted_at >= start_date
        ).group_by(
            models.User.id, 
            models.StudentProfile.first_name, 
            models.StudentProfile.last_name,
            func.date(models.Submission.submitted_at)
        ).order_by(
            models.User.id,
            func.date(models.Submission.submitted_at)
        )
        
        results = query.all()
        
        if not results:
            return []
        
        # Group by student and create progress data
        student_progress = {}
        for row in results:
            student_key = f"{row.first_name} {row.last_name}".strip()
            if student_key not in student_progress:
                student_progress[student_key] = []
            
            success_rate = (row.successful_attempts / row.total_attempts * 100) if row.total_attempts > 0 else 0
            student_progress[student_key].append({
                "date": row.submission_date.strftime("%Y-%m-%d"),
                "success_rate": round(success_rate, 1),
                "attempts": row.total_attempts
            })
        
        # Return top 5 most active students
        result = []
        for student, progress_data in sorted(student_progress.items(), 
                                           key=lambda x: len(x[1]), reverse=True)[:5]:
            result.append({
                "student_name": student,
                "progress_data": progress_data
            })
        
        logger.info(f"📈 Student progress calculated for {len(result)} students")
        return result
        
    except Exception as e:
        logger.error(f"❌ Error in calculate_student_progress_working: {e}")
        return []

def calculate_submission_status_breakdown_working(db: Session):
    """Calculate submission status breakdown - NEW CHART 3"""
    try:
        logger.info("🔄 Calculating submission status breakdown from SubmissionResult")
        
        query = db.query(
            models.SubmissionResult.status,
            func.count(models.SubmissionResult.id).label('count')
        ).group_by(models.SubmissionResult.status)\
        .order_by(desc('count'))
        
        results = query.all()
        
        if not results:
            return []
        
        # Map status to readable names
        status_names = {
            models.ExecutionStatus.ACCEPTED: "Accepted",
            models.ExecutionStatus.RUNTIME_ERROR: "Runtime Error",
            models.ExecutionStatus.TIME_LIMIT_EXCEEDED: "Time Limit Exceeded",
            models.ExecutionStatus.COMPILATION_ERROR: "Compilation Error",
            models.ExecutionStatus.WRONG_ANSWER: "Wrong Answer",
            models.ExecutionStatus.MEMORY_LIMIT_EXCEEDED: "Memory Limit Exceeded"
        }
        
        total_count = sum(row.count for row in results)
        result = []
        
        for row in results:
            status_name = status_names.get(row.status, str(row.status))
            count = int(row.count or 0)
            percentage = (count / total_count * 100) if total_count > 0 else 0
            
            result.append({
                "status": status_name,
                "count": count,
                "percentage": round(percentage, 1)
            })
        
        logger.info(f"🔄 Status breakdown: {len(result)} different statuses")
        return result
        
    except Exception as e:
        logger.error(f"❌ Error in calculate_submission_status_breakdown_working: {e}")
        return []

def calculate_weekly_performance_heatmap_working(db: Session):
    """Calculate weekly performance heatmap data - NEW CHART 4"""
    try:
        logger.info("🗓 Calculating weekly performance heatmap from SubmissionResult")
        
        # Get data from last 8 weeks
        start_date = datetime.now() - timedelta(weeks=8)
        
        query = db.query(
            func.extract('dow', models.Submission.submitted_at).label('day_of_week'),
            func.extract('week', models.Submission.submitted_at).label('week_number'),
            func.count(models.SubmissionResult.id).label('total_submissions'),
            func.count(
                func.case(
                    (models.SubmissionResult.status == models.ExecutionStatus.ACCEPTED, 1)
                )
            ).label('successful_submissions')
        ).select_from(models.SubmissionResult)\
        .join(models.Submission, models.Submission.id == models.SubmissionResult.submission_id)\
        .filter(models.Submission.submitted_at >= start_date)\
        .group_by(
            func.extract('dow', models.Submission.submitted_at),
            func.extract('week', models.Submission.submitted_at)
        ).order_by('week_number', 'day_of_week')
        
        results = query.all()
        
        if not results:
            return []
        
        # Create heatmap data
        days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
        heatmap_data = []
        
        for row in results:
            day_name = days[int(row.day_of_week)]
            week_num = int(row.week_number)
            total = int(row.total_submissions or 0)
            successful = int(row.successful_submissions or 0)
            success_rate = (successful / total * 100) if total > 0 else 0
            
            heatmap_data.append({
                "day": day_name,
                "week": f"W{week_num}",
                "success_rate": round(success_rate, 1),
                "total_submissions": total,
                "intensity": min(success_rate / 20, 5)  # Scale 0-5 for color intensity
            })
        
        logger.info(f"🗓 Heatmap data points: {len(heatmap_data)}")
        return heatmap_data
        
    except Exception as e:
        logger.error(f"❌ Error in calculate_weekly_performance_heatmap_working: {e}")
        return []


# ✅ EXISTING: Keep all your current analytics helper functions unchanged below this line
# (calculate_topic_performance_working, get_student_leaderboard_working, etc.)

def calculate_topic_performance_working(db: Session):
    """Calculate performance by question tags from extra_data - PRIMARY SOURCE: SubmissionResult"""
    try:
        logger.info("🏷 Starting tag-based topic performance calculation from SubmissionResult")
        
        # ✅ FIXED: Start from SubmissionResult, join to get question tags
        query = db.query(
            models.Question.extra_data,
            models.SubmissionResult.id.label('result_id'),
            models.SubmissionResult.status
        ).select_from(models.SubmissionResult)\
        .join(models.Submission, models.Submission.id == models.SubmissionResult.submission_id)\
        .join(models.Question, models.Question.id == models.Submission.question_id)\
        .filter(models.Question.extra_data.isnot(None))

        results = query.all()
        logger.info(f"📋 Found {len(results)} submission-result pairs")
        
        if not results:
            logger.warning("⚠ No submission results with question extra_data found")
            return []

        # Aggregate by tags
        tag_data = defaultdict(lambda: {
            'total_results': 0,
            'accepted_results': 0,
            'questions_count': 0
        })
        
        processed_questions = set()
        
        for row in results:
            try:
                # Parse JSON from extra_data
                extra_data = json.loads(row.extra_data)
                tags = extra_data.get('tags', [])
                
                for tag in tags:
                    # Count results for this tag
                    tag_data[tag]['total_results'] += 1
                    
                    # Count successful results
                    if row.status and row.status == models.ExecutionStatus.ACCEPTED:
                        tag_data[tag]['accepted_results'] += 1
                    
                    # Count unique questions (avoid double-counting)
                    question_tag_key = f"{row.result_id}_{tag}"
                    if question_tag_key not in processed_questions:
                        processed_questions.add(question_tag_key)
                        
            except json.JSONDecodeError as e:
                logger.error(f"❌ Error parsing extra_data JSON: {e}")
                continue

        # Convert to result format
        result = []
        for tag, data in tag_data.items():
            success_rate = (data['accepted_results'] / data['total_results'] * 100) if data['total_results'] > 0 else 0
            
            topic_data = {
                "topic": tag.replace('-', ' ').title(),  # Format: "hash-table" → "Hash Table"
                "total": data['total_results'],
                "solved": data['accepted_results'], 
                "avg_score": round(success_rate, 1)
            }
            result.append(topic_data)

        # Sort by total results descending
        result.sort(key=lambda x: x['total'], reverse=True)
        
        logger.info(f"📊 Returning {len(result)} tag categories")
        for item in result[:5]:  # Log top 5
            logger.info(f"📈 Tag '{item['topic']}': {item}")

        return result

    except Exception as e:
        logger.error(f"❌ Error in calculate_topic_performance_working: {e}")
        return []

def get_student_leaderboard_working(db: Session):
    """Get student leaderboard - PRIMARY SOURCE: SubmissionResult"""
    try:
        logger.info("🏆 Starting leaderboard calculation from SubmissionResult")
        
        # Check for students and results
        students_count = db.query(func.count(models.User.id)).filter(
            models.User.role == models.UserRole.STUDENT
        ).scalar() or 0
        
        results_count = db.query(func.count(models.SubmissionResult.id)).scalar() or 0
        
        logger.info(f"👥 Students: {students_count}, SubmissionResults: {results_count}")
        
        if students_count == 0 or results_count == 0:
            logger.warning("⚠ No students or submission results found")
            return []

        # ✅ FIXED: Get students with results using SubmissionResult as primary source
        query = db.query(
            models.User.id,
            func.coalesce(models.StudentProfile.first_name, 'Student').label('first_name'),
            func.coalesce(models.StudentProfile.last_name, '').label('last_name'),
            func.count(models.SubmissionResult.id).label('total_results'),
            func.count(
                func.case(
                    (models.SubmissionResult.status == models.ExecutionStatus.ACCEPTED, 1)
                )
            ).label('successful_results')
        ).select_from(models.User)\
        .outerjoin(models.StudentProfile, models.StudentProfile.user_id == models.User.id)\
        .join(models.Submission, models.Submission.student_id == models.User.id)\
        .join(models.SubmissionResult, models.SubmissionResult.submission_id == models.Submission.id)\
        .filter(models.User.role == models.UserRole.STUDENT)\
        .group_by(models.User.id, models.StudentProfile.first_name, models.StudentProfile.last_name)\
        .having(func.count(models.SubmissionResult.id) > 0)\
        .order_by(desc('successful_results'), desc('total_results'))\
        .limit(10)

        results = query.all()
        logger.info(f"🎯 Leaderboard query returned {len(results)} students")

        result = []
        for i, row in enumerate(results, 1):
            success_rate = (row.successful_results / row.total_results * 100) if row.total_results > 0 else 0
            student_data = {
                "id": str(row.id),
                "name": f"{row.first_name} {row.last_name}".strip(),
                "score": round(success_rate, 1),
                "total_submissions": int(row.total_results or 0),
                "last_active": datetime.now().isoformat(),
                "rank": i
            }
            result.append(student_data)
            logger.info(f"🥇 Rank {i}: {student_data['name']} - {student_data['score']}%")

        return result

    except Exception as e:
        logger.error(f"❌ Error in get_student_leaderboard_working: {e}")
        return []

def get_frequently_failed_problems_working(db: Session):
    """Get problems with highest failure rates - PRIMARY SOURCE: SubmissionResult"""
    try:
        logger.info("⚠ Starting failed problems calculation from SubmissionResult")
        
        # ✅ FIXED: Start from SubmissionResult, join to get question data
        query = db.query(
            models.Question.extra_data,
            models.Question.title,
            func.count(models.SubmissionResult.id).label('total_attempts'),
            func.count(
                func.case(
                    [(models.SubmissionResult.status != models.ExecutionStatus.ACCEPTED, 1)],
                    else_=None
                )
            ).label('failed_attempts')
        ).select_from(models.SubmissionResult)\
        .join(models.Submission, models.Submission.id == models.SubmissionResult.submission_id)\
        .join(models.Question, models.Question.id == models.Submission.question_id)\
        .filter(models.Question.extra_data.isnot(None))\
        .group_by(models.Question.id, models.Question.extra_data, models.Question.title)\
        .having(func.count(models.SubmissionResult.id) >= 2)\
        .order_by(desc('failed_attempts'))\
        .limit(10)

        results = query.all()
        logger.info(f"💥 Failed problems query returned {len(results)} questions")

        result = []
        for row in results:
            try:
                extra_data = json.loads(row.extra_data)
                task_id = extra_data.get('task_id', 'Unknown')
                tags = extra_data.get('tags', [])
                
                total = int(row.total_attempts or 0)
                failed = int(row.failed_attempts or 0)
                failure_rate = (failed / total * 100) if total > 0 else 0
                
                # Determine difficulty from tags
                difficulty = "Medium"  # Default
                if any(easy_tag in tags for easy_tag in ["array", "hash-table", "string"]):
                    difficulty = "Easy"
                elif any(hard_tag in tags for hard_tag in ["dynamic-programming", "backtracking", "graph"]):
                    difficulty = "Hard"
                
                problem_data = {
                    "name": task_id.replace('-', ' ').title(),
                    "failure_rate": round(failure_rate, 1),
                    "attempts": total,
                    "difficulty": difficulty
                }
                result.append(problem_data)
                logger.info(f"💔 Problem '{task_id}': {failure_rate:.1f}% failure rate ({failed}/{total})")
                
            except json.JSONDecodeError:
                # Fallback to original title
                total = int(row.total_attempts or 0)
                failed = int(row.failed_attempts or 0)
                failure_rate = (failed / total * 100) if total > 0 else 0
                
                result.append({
                    "name": row.title,
                    "failure_rate": round(failure_rate, 1),
                    "attempts": total,
                    "difficulty": "Unknown"
                })

        return result

    except Exception as e:
        logger.error(f"❌ Error in get_frequently_failed_problems_working: {e}")
        return []

def calculate_time_trends_working(db: Session):
    """Calculate time trends - PRIMARY SOURCE: SubmissionResult execution_time"""
    try:
        logger.info("⏰ Starting time trends calculation from SubmissionResult")
        
        end_date = datetime.now()
        start_date = end_date - timedelta(weeks=8)
        
        # ✅ FIXED: Query execution_time directly from SubmissionResult
        results_in_range = db.query(func.count(models.SubmissionResult.id))\
        .join(models.Submission, models.Submission.id == models.SubmissionResult.submission_id)\
        .filter(models.Submission.submitted_at >= start_date).scalar() or 0
        
        logger.info(f"📅 SubmissionResults in last 8 weeks: {results_in_range}")
        
        if results_in_range == 0:
            logger.warning("⚠ No submission results found in date range")
            return []

        query = db.query(
            func.extract('week', models.Submission.submitted_at).label('week_num'),
            func.count(models.SubmissionResult.id).label('result_count'),
            func.avg(func.coalesce(models.SubmissionResult.execution_time, 0)).label('avg_time')
        ).select_from(models.SubmissionResult)\
        .join(models.Submission, models.Submission.id == models.SubmissionResult.submission_id)\
        .filter(models.Submission.submitted_at >= start_date)\
        .group_by(func.extract('week', models.Submission.submitted_at))\
        .order_by('week_num')

        results = query.all()
        logger.info(f"📈 Time trends query returned {len(results)} weeks")

        result = []
        for row in results:
            week_data = {
                "week": f"Week {int(row.week_num)}",
                "submissions": int(row.result_count or 0),
                "avg_time": round(float(row.avg_time or 0), 1)
            }
            result.append(week_data)
            logger.info(f"📊 Week {int(row.week_num)}: {week_data}")

        return result

    except Exception as e:
        logger.error(f"❌ Error in calculate_time_trends_working: {e}")
        return []

def get_daily_activity_working(db: Session):
    """Get daily activity data - ENHANCED: Include SubmissionResult data"""
    try:
        logger.info("📊 Starting daily activity calculation including SubmissionResult data")
        
        end_date = datetime.now()
        start_date = end_date - timedelta(days=7)
        
        # ✅ ENHANCED: Include both submission and result counts
        query = db.query(
            func.extract('dow', models.Submission.submitted_at).label('day_of_week'),
            func.count(models.Submission.id).label('submission_count'),
            func.count(models.SubmissionResult.id).label('result_count'),
            func.count(func.distinct(models.Submission.student_id)).label('active_users')
        ).select_from(models.Submission)\
        .outerjoin(models.SubmissionResult, models.SubmissionResult.submission_id == models.Submission.id)\
        .filter(models.Submission.submitted_at >= start_date)\
        .group_by(func.extract('dow', models.Submission.submitted_at))

        results = query.all()
        logger.info(f"📅 Daily activity query returned {len(results)} days with data")

        days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
        result = [{"day": day, "submissions": 0, "active_users": 0} for day in days]
        
        for row in results:
            day_index = int(row.day_of_week)
            if 0 <= day_index < 7:
                result[day_index] = {
                    "day": days[day_index],
                    "submissions": int(row.result_count or 0),  # ✅ Use result count for accuracy
                    "active_users": int(row.active_users or 0)
                }
                logger.info(f"📈 {days[day_index]}: {row.result_count} results, {row.active_users} users")

        return result

    except Exception as e:
        logger.error(f"❌ Error in get_daily_activity_working: {e}")
        return []

def calculate_average_scores_working(db: Session):
    """Calculate average scores across all submissions"""
    try:
        logger.info("🎯 Calculating average scores")
        
        total_results = db.query(func.count(models.SubmissionResult.id)).filter(
            models.SubmissionResult.max_score > 0,
            models.SubmissionResult.score.isnot(None)
        ).scalar() or 0
        
        logger.info(f"📊 Valid submission results: {total_results}")
        
        if total_results == 0:
            return 0.0

        result = db.query(
            func.avg(
                models.SubmissionResult.score * 100.0 / models.SubmissionResult.max_score
            )
        ).filter(
            models.SubmissionResult.max_score > 0,
            models.SubmissionResult.score.isnot(None)
        ).scalar()

        avg = round(float(result or 0), 1)
        logger.info(f"🎯 Average score: {avg}%")
        return avg

    except Exception as e:
        logger.error(f"❌ Error in calculate_average_scores_working: {e}")
        return 0.0

def calculate_average_time_working(db: Session):
    """Calculate average execution time"""
    try:
        logger.info("⏱ Calculating average execution time")
        
        valid_times = db.query(func.count(models.SubmissionResult.id)).filter(
            models.SubmissionResult.execution_time.isnot(None),
            models.SubmissionResult.execution_time > 0
        ).scalar() or 0
        
        logger.info(f"⏱ Valid execution times: {valid_times}")
        
        if valid_times == 0:
            return 0.0

        result = db.query(
            func.avg(models.SubmissionResult.execution_time)
        ).filter(
            models.SubmissionResult.execution_time.isnot(None),
            models.SubmissionResult.execution_time > 0
        ).scalar()

        avg = round(float(result or 0), 1)
        logger.info(f"⏱ Average execution time: {avg}ms")
        return avg

    except Exception as e:
        logger.error(f"❌ Error in calculate_average_time_working: {e}")
        return 0.0

def calculate_submission_rate_working(db: Session):
    """Calculate submission success rate - PRIMARY SOURCE: SubmissionResult"""
    try:
        logger.info("📈 Calculating submission success rate from SubmissionResult")
        
        total = db.query(func.count(models.SubmissionResult.id)).scalar() or 0
        if total == 0:
            logger.info("📈 No submission results found")
            return 0.0
            
        successful = db.query(func.count(models.SubmissionResult.id))\
            .filter(models.SubmissionResult.status == models.ExecutionStatus.ACCEPTED)\
            .scalar() or 0

        rate = (successful / total * 100) if total > 0 else 0
        logger.info(f"📈 Success rate: {successful}/{total} = {rate:.1f}%")
        return round(rate, 1)

    except Exception as e:
        logger.error(f"❌ Error in calculate_submission_rate_working: {e}")
        return 0.0

def generate_alerts_working(db: Session):
    """Generate alerts - ENHANCED: Include SubmissionResult analysis"""
    try:
        logger.info("🚨 Generating alerts including SubmissionResult analysis")
        
        alerts = []
        week_ago = datetime.now() - timedelta(days=7)

        total_students = db.query(func.count(models.User.id)).filter(
            models.User.role == models.UserRole.STUDENT
        ).scalar() or 0

        if total_students == 0:
            return alerts

        # ✅ ENHANCED: Check both submissions and results
        active_students = db.query(
            func.count(func.distinct(models.Submission.student_id))
        ).filter(
            models.Submission.submitted_at > week_ago
        ).scalar() or 0

        inactive_students = total_students - active_students

        # ✅ NEW: Check failure rate from SubmissionResult
        total_results = db.query(func.count(models.SubmissionResult.id)).scalar() or 0
        failed_results = db.query(func.count(models.SubmissionResult.id))\
            .filter(models.SubmissionResult.status != models.ExecutionStatus.ACCEPTED)\
            .scalar() or 0
            
        failure_rate = (failed_results / total_results * 100) if total_results > 0 else 0

        logger.info(f"👥 Students: {total_students} total, {active_students} active, {inactive_students} inactive")
        logger.info(f"📊 Results: {total_results} total, {failed_results} failed, {failure_rate:.1f}% failure rate")

        if inactive_students > 0:
            alerts.append({
                "id": "inactive_students",
                "type": "warning",
                "title": "Inactive Students Alert",
                "message": f"{inactive_students} students haven't submitted any solutions in the past week.",
                "timestamp": datetime.now().isoformat(),
                "priority": "medium"
            })

        # ✅ NEW: High failure rate alert
        if failure_rate > 70:
            alerts.append({
                "id": "high_failure_rate",
                "type": "danger",
                "title": "High Failure Rate Alert",
                "message": f"Current failure rate is {failure_rate:.1f}% - students may need additional support.",
                "timestamp": datetime.now().isoformat(),
                "priority": "high"
            })

        logger.info(f"🚨 Generated {len(alerts)} alerts")
        return alerts

    except Exception as e:
        logger.error(f"❌ Error in generate_alerts_working: {e}")
        return []

# ✅ EXISTING: Keep all your debug and test data endpoints unchanged
@app.get("/api/debug")
async def debug_analytics_data(db: Session = Depends(get_db)):
    """Debug endpoint to check database state"""
    try:
        counts = {
            "users": db.query(func.count(models.User.id)).scalar() or 0,
            "students": db.query(func.count(models.User.id)).filter(models.User.role == models.UserRole.STUDENT).scalar() or 0,
            "student_profiles": db.query(func.count(models.StudentProfile.id)).scalar() or 0,
            "questions": db.query(func.count(models.Question.id)).scalar() or 0,
            "categories": db.query(func.count(models.QuestionCategory.id)).scalar() or 0,
            "submissions": db.query(func.count(models.Submission.id)).scalar() or 0,
            "submission_results": db.query(func.count(models.SubmissionResult.id)).scalar() or 0,
            "exams": db.query(func.count(models.Exam.id)).scalar() or 0,
        }
        
        return {
            "table_counts": counts,
            "status": "debug_complete",
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        return {"error": str(e), "status": "debug_failed"}

@app.get("/api/tag-statistics")
async def get_tag_statistics(db: Session = Depends(get_db)):
    """Get comprehensive statistics about question tags from extra_data"""
    try:
        questions = db.query(models.Question.extra_data).filter(
            models.Question.extra_data.isnot(None)
        ).all()
        
        if not questions:
            return {"tag_counts": [], "total_questions": 0}
        
        all_tags = []
        valid_questions = 0
        
        for question in questions:
            try:
                extra_data = json.loads(question.extra_data)
                tags = extra_data.get('tags', [])
                all_tags.extend(tags)
                valid_questions += 1
            except json.JSONDecodeError:
                continue
        
        tag_counter = Counter(all_tags)
        
        tag_counts = [
            {
                "tag": tag, 
                "count": count, 
                "percentage": round(count/valid_questions*100, 1)
            }
            for tag, count in tag_counter.most_common()
        ]
        
        return {
            "tag_counts": tag_counts,
            "total_questions": valid_questions,
            "unique_tags": len(tag_counter),
            "most_common_tag": tag_counts[0] if tag_counts else None,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"❌ Error in get_tag_statistics: {e}")
        return {"error": str(e), "tag_counts": []}

@app.post("/api/create-comprehensive-test-data") 
async def create_comprehensive_test_data(db: Session = Depends(get_db)):
    """Create comprehensive test data for ALL analytics widgets"""
    try:
        # Get required entities
        exam = db.query(models.Exam).first()
        if exam is None:
            return {"error": "No exam found. Create an exam first."}
        
        students = db.query(models.User).filter(models.User.role == models.UserRole.STUDENT).all()
        questions = db.query(models.Question).filter(models.Question.extra_data.isnot(None)).limit(20).all()
        
        if len(students) < 2 or len(questions) < 10:
            return {"error": "Need at least 2 students and 10 questions with extra_data"}
        
        created_submissions = 0
        
        # Create MORE submissions (50 instead of 20) with varied data
        for i in range(50):  
            student = students[i % len(students)]  
            question = questions[i % len(questions)]  
            
            # Create submission
            submission = models.Submission(
                exam_id=exam.id,
                student_id=student.id,
                question_id=question.id,
                source_code=f"# Test solution {i+1}\nprint('solution {i+1}')",
                submitted_at=datetime.now() - timedelta(days=i % 14, hours=i % 24),  # Spread over 2 weeks
                language="python",
                attempt_number=(i % 3) + 1  # 1-3 attempts
            )
            db.add(submission)
            db.commit()
            
            # Create varied results with different success rates
            success_patterns = [
                True, True, False,   # 66% success for first pattern
                True, False, False,  # 33% success for second pattern  
                True, True, True,    # 100% success for third pattern
                False, False, False  # 0% success for fourth pattern
            ]
            is_success = success_patterns[i % len(success_patterns)]
            
            result = models.SubmissionResult(
                submission_id=submission.id,
                status=models.ExecutionStatus.ACCEPTED if is_success else models.ExecutionStatus.RUNTIME_ERROR,
                score=85 + (i % 15) if is_success else (i % 20),  # Varied scores
                max_score=100,
                execution_time=100 + (i * 15) + (student.id.int % 100)  # Varied execution times
            )
            db.add(result)
            db.commit()
            
            created_submissions += 1
        
        # Create some profile data for students if missing
        for student in students:
            existing_profile = db.query(models.StudentProfile).filter(
                models.StudentProfile.user_id == student.id
            ).first()
            
            if not existing_profile:
                profile = models.StudentProfile(
                    user_id=student.id,
                    first_name=f"Student{student.id.hex[:4]}",
                    last_name=f"Test{student.id.hex[-4:]}",
                    student_id=f"STU{student.id.hex[:6]}"
                )
                db.add(profile)
                db.commit()
        
        return {
            "message": f"Created {created_submissions} comprehensive test submissions",
            "submissions_total": db.query(func.count(models.Submission.id)).scalar(),
            "results_total": db.query(func.count(models.SubmissionResult.id)).scalar(),
            "students_with_profiles": db.query(func.count(models.StudentProfile.id)).scalar(),
            "exam_used": str(exam.id)
        }
        
    except Exception as e:
        logger.error(f"Error creating comprehensive test data: {e}")
        return {
            "error": str(e)
        }
