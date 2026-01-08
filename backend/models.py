"models.py"
"""
FastAPI SQLAlchemy Models for Online Exam System
Generated from Mermaid ER Diagram
"""

from sqlalchemy import (
    Column, String, Text, Boolean, Integer, Float, DateTime, JSON,
    ForeignKey, UniqueConstraint, Index, Enum as SQLEnum, ARRAY, DECIMAL
)
from sqlalchemy.dialects.postgresql import UUID, INET, JSONB, ENUM as SQLEnum
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
import enum
from datetime import datetime
from typing import Optional
from sqlalchemy import LargeBinary
from .database import Base

# Enums
class UserRole(enum.Enum):
    ADMIN = "admin"
    TEACHER = "teacher"
    STUDENT = "student"

class Department(enum.Enum):
    CSE_A = "cse_a"
    CSE_B = "cse_b" 
    CSE_C = "cse_c"
    RAI = "rai"
    AI = "ai"
    CYS = "cys"
    CCE = "cce"
    ECE = "ece"

class Difficulty(enum.Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"

class ExamType(enum.Enum):
    PRACTICE = "practice"
    ASSIGNMENT = "assignment"
    MIDTERM = "midterm"
    FINAL = "final"
    QUIZ = "quiz"

class ExamStatus(enum.Enum):
    DRAFT = "draft"
    SCHEDULED = "scheduled"
    ACTIVE = "active"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class RegistrationStatus(enum.Enum):
    PENDING = "pending"
    SUBMITTED = "submitted"
    REJECTED = "rejected"
    CANCELLED = "cancelled"

class SessionStatus(enum.Enum):
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"
    TERMINATED = "terminated"

class SubmissionStatus(enum.Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    ERROR = "error"

class ExecutionStatus(enum.Enum):
    PENDING = "pending"
    RUNNING = "running"
    ACCEPTED = "accepted"
    WRONG_ANSWER = "wrong_answer"
    TIME_LIMIT_EXCEEDED = "time_limit_exceeded"
    COMPILATION_ERROR = "compilation_error"
    RUNTIME_ERROR = "runtime_error"
    INTERNAL_ERROR = "internal_error"

class EventType(enum.Enum):
    SESSION_START = "session_start"
    SESSION_END = "session_end"
    SUBMISSION_CREATE = "submission_create"
    SUBMISSION_UPDATE = "submission_update"
    TAB_SWITCH = "tab_switch"
    WINDOW_BLUR = "window_blur"
    COPY_PASTE = "copy_paste"
    BROWSER_REFRESH = "browser_refresh"

class EnrollmentStatus(enum.Enum):
    ENROLLED = "enrolled"
    DROPPED = "dropped"
    COMPLETED = "completed"
    WITHDRAWN = "withdrawn"

class ActivityStatus(enum.Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    COMPLETED = "completed"
    ARCHIVED = "archived"

class AssignmentStatus(enum.Enum):
    ASSIGNED = "assigned"
    STARTED = "started"
    COMPLETED = "completed"
    OVERDUE = "overdue"

class SubmissionType(enum.Enum):
    COMPLETION = "completion"
    FILE_UPLOAD = "file_upload"
    TEXT = "text"
    CODE = "code"

class GradeStatus(enum.Enum):
    DRAFT = "draft"
    PUBLISHED = "published"

class NotificationType(enum.Enum):
    GRADE_PUBLISHED = "grade_published"
    ACTIVITY_ASSIGNED = "activity_assigned"
    SUBMISSION_RECEIVED = "submission_received"
    GENERAL = "general"

# Core Models
class User(Base):
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(SQLEnum(UserRole), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=False), default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=False), default=func.now(), onupdate=func.now(), nullable=False)
    extra_data = Column(JSONB, default=dict)
    
    # Relationships
    user_sessions = relationship("UserSession", back_populates="user", cascade="all, delete-orphan")
    user_tokens = relationship("UserToken", back_populates="user", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="user", cascade="all, delete-orphan")
    exam_registrations = relationship("ExamRegistration", foreign_keys="ExamRegistration.student_id", back_populates="student", cascade="all, delete-orphan")
    submissions = relationship("Submission", back_populates="student", cascade="all, delete-orphan")
    student_profile = relationship("StudentProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    teacher_profile = relationship("TeacherProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    created_questions = relationship("Question", foreign_keys="Question.created_by", back_populates="creator", cascade="all, delete-orphan")
    created_exams = relationship("Exam", foreign_keys="Exam.created_by", back_populates="creator", cascade="all, delete-orphan")
    approved_registrations = relationship("ExamRegistration", foreign_keys="ExamRegistration.approved_by", back_populates="approver")
    
    assigned_questions = relationship("StudentExamQuestion", back_populates="student")
    created_mcqs = relationship("MCQ", foreign_keys="MCQ.created_by", back_populates="creator", cascade="all, delete-orphan")
    assigned_mcqs = relationship("StudentExamMCQ", back_populates="student")
    mcq_submissions = relationship("MCQSubmission", back_populates="student", cascade="all, delete-orphan")

    created_activities = relationship("Activity", foreign_keys="Activity.created_by", back_populates="creator", cascade="all, delete-orphan")
    activity_assignments = relationship("ActivityAssignment", foreign_keys="ActivityAssignment.student_id", back_populates="student", cascade="all, delete-orphan")
    activity_submissions = relationship("ActivitySubmission", foreign_keys="ActivitySubmission.student_id", back_populates="student", cascade="all, delete-orphan")
    assessment_submissions = relationship("AssessmentSubmission", back_populates="student", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_users_email", "email"),
        Index("idx_users_role", "role"),
        Index("idx_users_is_active", "is_active"),
    )

class UserSession(Base):
    __tablename__ = "user_sessions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    session_token = Column(String(255), unique=True, nullable=False)
    ip_address = Column(INET)
    user_agent = Column(String(500))
    expires_at = Column(DateTime(timezone=False), nullable=False)
    created_at = Column(DateTime(timezone=False), default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=False), default=func.now(), onupdate=func.now(), nullable=False)
    extra_data = Column(JSONB, default=dict)
    
    # Relationships
    user = relationship("User", back_populates="user_sessions")
    
    __table_args__ = (
        Index("idx_user_sessions_user_id", "user_id"),
        Index("idx_user_sessions_expires_at", "expires_at"),
        Index("idx_user_sessions_token", "session_token"),
    )

class UserToken(Base):
    __tablename__ = "user_tokens"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    token_type = Column(String(50), nullable=False)
    token_hash = Column(String(255), unique=True, nullable=False)
    expires_at = Column(DateTime(timezone=False), nullable=False)
    is_revoked = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=False), default=func.now(), nullable=False)
    extra_data = Column(JSONB, default=dict)
    
    # Relationships
    user = relationship("User", back_populates="user_tokens")
    
    __table_args__ = (
        Index("idx_user_tokens_user_id", "user_id"),
        Index("idx_user_tokens_type", "token_type"),
        Index("idx_user_tokens_expires_at", "expires_at"),
    )

class StudentProfile(Base):
    __tablename__ = "student_profiles"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)    
    # New fields for academic information
    batch_year = Column(Integer, nullable=False)  # e.g., 2024
    department = Column(SQLEnum(Department), nullable=False)
    created_at = Column(DateTime(timezone=False), default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=False), default=func.now(), onupdate=func.now(), nullable=False)
    extra_data = Column(JSONB, default=dict)

    # Relationships
    user = relationship("User", back_populates="student_profile")

    __table_args__ = (
        Index("idx_student_profiles_user_id", "user_id"),
        Index("idx_student_profiles_batch_year", "batch_year"),
        Index("idx_student_profiles_department", "department"),
    )

class StudentExamQuestion(Base):
    __tablename__ = "student_exam_questions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    exam_id = Column(UUID(as_uuid=True), ForeignKey("exams.id"), nullable=False)
    student_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    question_id = Column(UUID(as_uuid=True), ForeignKey("questions.id"), nullable=False)
    question_order = Column(Integer, nullable=False)
    points = Column(Integer, default=0, nullable=False)

    created_at = Column(DateTime(timezone=False), default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=False), default=func.now(), onupdate=func.now(), nullable=False)
    extra_data = Column(JSONB, default=dict)

    # Relationships
    student = relationship("User", back_populates="assigned_questions")
    exam = relationship("Exam", back_populates="assigned_questions")
    question = relationship("Question", back_populates="assigned_students")

    __table_args__ = (
        UniqueConstraint("exam_id", "student_id", "question_id", name="uq_student_exam_question"),
        Index("idx_student_exam_questions_exam_id", "exam_id"),
        Index("idx_student_exam_questions_student_id", "student_id"),
        Index("idx_student_exam_questions_question_id", "question_id"),
    )


# Question Bank Models
class QuestionCategory(Base):
    __tablename__ = "question_categories"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(Text)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=False), default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=False), default=func.now(), onupdate=func.now(), nullable=False)
    extra_data = Column(JSONB, default=dict)
    
    # Relationships
    questions = relationship("Question", back_populates="category", cascade="all, delete-orphan")
    # Add to QuestionCategory model relationships
    mcqs = relationship("MCQ", back_populates="category", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_question_categories_name", "name"),
        Index("idx_question_categories_is_active", "is_active"),
    )

class Question(Base):
    __tablename__ = "questions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    category_id = Column(UUID(as_uuid=True), ForeignKey("question_categories.id"), nullable=False)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    problem_statement = Column(Text, nullable=False)
    difficulty = Column(SQLEnum(Difficulty), nullable=False)
    constraints = Column(JSONB, default=dict)
    starter_code = Column(JSONB, default=dict)
    max_score = Column(Integer, nullable=False)
    time_limit_seconds = Column(Integer, default=30)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=False), default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=False), default=func.now(), onupdate=func.now(), nullable=False)
    pdf_statement = Column(LargeBinary)  # Store PDF as binary data
    pdf_filename = Column(String(255))  # Original filename
    pdf_filesize = Column(Integer)  # File size in bytes
    statement_type = Column(String(20), default='html')  # 'html' or 'pdf'
    has_solution = Column(Boolean, default=False, nullable=False)
    solution_type = Column(String(20), default='html')  # 'html' or 'pdf'
    solution_text = Column(Text)  # For HTML solutions
    solution_pdf = Column(LargeBinary)  # Store PDF as binary data
    solution_pdf_filename = Column(String(255))  # Original filename
    solution_pdf_filesize = Column(Integer)  # File size in bytes
    extra_data = Column(JSONB, default=dict)
    
    # Relationships
    category = relationship("QuestionCategory", back_populates="questions")
    creator = relationship("User", foreign_keys=[created_by], back_populates="created_questions")
    exam_questions = relationship("ExamQuestion", back_populates="question", cascade="all, delete-orphan")
    submissions = relationship("Submission", back_populates="question", cascade="all, delete-orphan")
    test_cases = relationship("QuestionTestCase", back_populates="question", cascade="all, delete-orphan")
    assigned_students = relationship("StudentExamQuestion", back_populates="question")

    __table_args__ = (
        Index("idx_questions_category_id", "category_id"),
        Index("idx_questions_created_by", "created_by"),
        Index("idx_questions_difficulty", "difficulty"),
        Index("idx_questions_is_active", "is_active"),
    )

class QuestionTestCase(Base):
    __tablename__ = "question_test_cases"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    question_id = Column(UUID(as_uuid=True), ForeignKey("questions.id"), nullable=False)
    input_data = Column(Text, nullable=False)
    expected_output = Column(Text, nullable=False)
    is_sample = Column(Boolean, default=False, nullable=False)
    is_hidden = Column(Boolean, default=False, nullable=False)
    weight = Column(Integer, default=1, nullable=False)
    created_at = Column(DateTime(timezone=False), default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=False), default=func.now(), onupdate=func.now(), nullable=False)
    extra_data = Column(JSONB, default=dict)
    
    # Relationships
    question = relationship("Question", back_populates="test_cases")
    
    __table_args__ = (
        Index("idx_question_test_cases_question_id", "question_id"),
        Index("idx_question_test_cases_is_sample", "is_sample"),
    )
# MCQ Models
class MCQ(Base):
    __tablename__ = "mcqs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    category_id = Column(UUID(as_uuid=True), ForeignKey("question_categories.id"), nullable=False)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    question_text = Column(Text, nullable=False)
    difficulty = Column(SQLEnum(Difficulty), nullable=False)
    
    # MCQ-specific fields
    options = Column(JSONB, nullable=False)  # ["Option A", "Option B", "Option C", "Option D"]
    correct_answer = Column(Integer, nullable=False)  # 1, 2, 3, or 4
    shuffle_options = Column(Boolean, default=False, nullable=False)
    explanation = Column(Text)  # Optional explanation for correct answer
    
    # Scoring
    max_score = Column(Integer, nullable=False)
    partial_scoring = Column(Boolean, default=False, nullable=False)
    
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=False), default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=False), default=func.now(), onupdate=func.now(), nullable=False)
    extra_data = Column(JSONB, default=dict)

    # Relationships
    category = relationship("QuestionCategory", back_populates="mcqs")
    creator = relationship("User", foreign_keys=[created_by], back_populates="created_mcqs")
    exam_mcqs = relationship("ExamMCQ", back_populates="mcq", cascade="all, delete-orphan")
    mcq_submissions = relationship("MCQSubmission", back_populates="mcq", cascade="all, delete-orphan")
    assigned_students = relationship("StudentExamMCQ", back_populates="mcq")

    __table_args__ = (
        Index("idx_mcqs_category_id", "category_id"),
        Index("idx_mcqs_created_by", "created_by"),
        Index("idx_mcqs_difficulty", "difficulty"),
        Index("idx_mcqs_is_active", "is_active"),
    )

class ExamMCQ(Base):
    __tablename__ = "exam_mcqs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    exam_id = Column(UUID(as_uuid=True), ForeignKey("exams.id"), nullable=False)
    mcq_id = Column(UUID(as_uuid=True), ForeignKey("mcqs.id"), nullable=False)
    question_order = Column(Integer, nullable=False)
    points = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=False), default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=False), default=func.now(), onupdate=func.now(), nullable=False)
    extra_data = Column(JSONB, default=dict)

    # Relationships
    exam = relationship("Exam", back_populates="exam_mcqs")
    mcq = relationship("MCQ", back_populates="exam_mcqs")

    __table_args__ = (
        UniqueConstraint("exam_id", "mcq_id", name="uq_exam_mcqs_exam_mcq"),
        UniqueConstraint("exam_id", "question_order", name="uq_exam_mcqs_exam_order"),
        Index("idx_exam_mcqs_exam_id", "exam_id"),
        Index("idx_exam_mcqs_mcq_id", "mcq_id"),
    )

class StudentExamMCQ(Base):
    __tablename__ = "student_exam_mcqs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    exam_id = Column(UUID(as_uuid=True), ForeignKey("exams.id"), nullable=False)
    student_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    mcq_id = Column(UUID(as_uuid=True), ForeignKey("mcqs.id"), nullable=False)
    question_order = Column(Integer, nullable=False)
    points = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime(timezone=False), default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=False), default=func.now(), onupdate=func.now(), nullable=False)
    extra_data = Column(JSONB, default=dict)

    # Relationships
    student = relationship("User", back_populates="assigned_mcqs")
    exam = relationship("Exam", back_populates="assigned_mcqs")
    mcq = relationship("MCQ", back_populates="assigned_students")

    __table_args__ = (
        UniqueConstraint("exam_id", "student_id", "mcq_id", name="uq_student_exam_mcq"),
        Index("idx_student_exam_mcqs_exam_id", "exam_id"),
        Index("idx_student_exam_mcqs_student_id", "student_id"),
        Index("idx_student_exam_mcqs_mcq_id", "mcq_id"),
    )

class MCQSubmission(Base):
    __tablename__ = "mcq_submissions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    exam_id = Column(UUID(as_uuid=True), ForeignKey("exams.id"), nullable=False)
    mcq_id = Column(UUID(as_uuid=True), ForeignKey("mcqs.id"), nullable=False)
    student_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    selected_answer = Column(Integer, nullable=False)  # 1, 2, 3, or 4
    is_correct = Column(Boolean, nullable=False)
    score = Column(Integer, default=0, nullable=False)
    submitted_at = Column(DateTime(timezone=False), default=func.now(), nullable=False)
    attempt_number = Column(Integer, default=1, nullable=False)
    created_at = Column(DateTime(timezone=False), default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=False), default=func.now(), onupdate=func.now(), nullable=False)
    extra_data = Column(JSONB, default=dict)

    # Relationships
    exam = relationship("Exam", back_populates="mcq_submissions")
    mcq = relationship("MCQ", back_populates="mcq_submissions")
    student = relationship("User", foreign_keys=[student_id], back_populates="mcq_submissions")

    __table_args__ = (
        Index("idx_mcq_submissions_exam_id", "exam_id"),
        Index("idx_mcq_submissions_mcq_id", "mcq_id"),
        Index("idx_mcq_submissions_student_id", "student_id"),
        Index("idx_mcq_submissions_submitted_at", "submitted_at"),
    )


# Exam Models
class Exam(Base):
    __tablename__ = "exams"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    course_id = Column(UUID(as_uuid=True), ForeignKey("courses.id"), nullable=False)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    start_time = Column(DateTime(timezone=False), nullable=False)
    end_time = Column(DateTime(timezone=False), nullable=False)
    duration_minutes = Column(Integer, nullable=False)
    exam_type = Column(SQLEnum(ExamType), nullable=False)
    shuffle_questions = Column(Boolean, default=False, nullable=False)
    max_attempts = Column(Integer, default=1, nullable=False)
    settings = Column(JSONB, default=dict)
    status = Column(SQLEnum(ExamStatus), default=ExamStatus.DRAFT, nullable=False)
    created_at = Column(DateTime(timezone=False), default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=False), default=func.now(), onupdate=func.now(), nullable=False)
    extra_data = Column(JSONB, default=dict)
    
    # Relationships
    course = relationship("Course", back_populates="exams")
    submissions = relationship("Submission", back_populates="exam", cascade="all, delete-orphan")
    creator = relationship("User", foreign_keys=[created_by], back_populates="created_exams")
    exam_questions = relationship("ExamQuestion", back_populates="exam", cascade="all, delete-orphan")
    exam_registrations = relationship("ExamRegistration", back_populates="exam", cascade="all, delete-orphan")
    exam_sessions = relationship("ExamSession", back_populates="exam", cascade="all, delete-orphan")
    assigned_questions = relationship("StudentExamQuestion", back_populates="exam", cascade="all, delete-orphan")  # FIXED: Added cascade
    # Add to Exam model relationships
    exam_mcqs = relationship("ExamMCQ", back_populates="exam", cascade="all, delete-orphan")
    assigned_mcqs = relationship("StudentExamMCQ", back_populates="exam", cascade="all, delete-orphan")
    mcq_submissions = relationship("MCQSubmission", back_populates="exam", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_exams_course_id", "course_id"),
        Index("idx_exams_created_by", "created_by"),
        Index("idx_exams_start_time", "start_time"),
        Index("idx_exams_end_time", "end_time"),
        Index("idx_exams_status", "status"),
        Index("idx_exams_exam_type", "exam_type"),
    )


class ExamQuestion(Base):
    __tablename__ = "exam_questions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    exam_id = Column(UUID(as_uuid=True), ForeignKey("exams.id"), nullable=False)
    question_id = Column(UUID(as_uuid=True), ForeignKey("questions.id"), nullable=False)
    question_order = Column(Integer, nullable=False)
    points = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=False), default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=False), default=func.now(), onupdate=func.now(), nullable=False)
    extra_data = Column(JSONB, default=dict)
    
    # Relationships
    exam = relationship("Exam", back_populates="exam_questions")
    question = relationship("Question", back_populates="exam_questions")
    
    __table_args__ = (
        UniqueConstraint("exam_id", "question_id", name="uq_exam_questions_exam_question"),
        UniqueConstraint("exam_id", "question_order", name="uq_exam_questions_exam_order"),
        Index("idx_exam_questions_exam_id", "exam_id"),
        Index("idx_exam_questions_question_id", "question_id"),
    )

class ExamRegistration(Base):
    __tablename__ = "exam_registrations"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    exam_id = Column(UUID(as_uuid=True), ForeignKey("exams.id"), nullable=False)
    student_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    status = Column(SQLEnum(RegistrationStatus), default=RegistrationStatus.PENDING, nullable=False)
    registered_at = Column(DateTime(timezone=False), default=func.now(), nullable=False)
    approved_at = Column(DateTime(timezone=False))
    approved_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=False), default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=False), default=func.now(), onupdate=func.now(), nullable=False)
    extra_data = Column(JSONB, default=dict)
    
    # Relationships
    exam = relationship("Exam", back_populates="exam_registrations")
    student = relationship("User", foreign_keys=[student_id], back_populates="exam_registrations")
    approver = relationship("User", foreign_keys=[approved_by], back_populates="approved_registrations")
    
    __table_args__ = (
        UniqueConstraint("exam_id", "student_id", name="uq_exam_registrations_exam_student"),
        Index("idx_exam_registrations_exam_id", "exam_id"),
        Index("idx_exam_registrations_student_id", "student_id"),
        Index("idx_exam_registrations_status", "status"),
    )

class ExamSession(Base):
    __tablename__ = "exam_sessions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    exam_id = Column(UUID(as_uuid=True), ForeignKey("exams.id"), nullable=False)
    student_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    session_token = Column(UUID(as_uuid=True), default=uuid.uuid4, unique=True, nullable=False)
    started_at = Column(DateTime(timezone=False))
    ended_at = Column(DateTime(timezone=False))
    last_activity_at = Column(DateTime(timezone=False))
    status = Column(SQLEnum(SessionStatus), default=SessionStatus.ACTIVE, nullable=False)
    browser_info = Column(JSONB, default=dict)
    ip_address = Column(INET)
    created_at = Column(DateTime(timezone=False), default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=False), default=func.now(), onupdate=func.now(), nullable=False)
    extra_data = Column(JSONB, default=dict)
    
    # Relationships
    exam = relationship("Exam", back_populates="exam_sessions")
    student = relationship("User", foreign_keys=[student_id])
    exam_events = relationship("ExamEvent", back_populates="exam_session", cascade="all, delete-orphan")
    
    __table_args__ = (
        Index("idx_exam_sessions_exam_id", "exam_id"),
        Index("idx_exam_sessions_student_id", "student_id"),
        Index("idx_exam_sessions_status", "status"),
        Index("idx_exam_sessions_token", "session_token"),
    )

# Submission Models
class Submission(Base):
    __tablename__ = "submissions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    exam_id = Column(UUID(as_uuid=True), ForeignKey("exams.id"), nullable=False)   # NEW
    question_id = Column(UUID(as_uuid=True), ForeignKey("questions.id"), nullable=False)
    student_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    source_code = Column(Text, nullable=False)
    language = Column(String(50), nullable=False)
    status = Column(SQLEnum(SubmissionStatus), default=SubmissionStatus.PENDING, nullable=False)
    submitted_at = Column(DateTime(timezone=False), default=func.now(), nullable=False)
    attempt_number = Column(Integer, default=1, nullable=False)
    created_at = Column(DateTime(timezone=False), default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=False), default=func.now(), onupdate=func.now(), nullable=False)
    extra_data = Column(JSONB, default=dict)

    # Relationships
    exam = relationship("Exam", back_populates="submissions")   # NEW
    question = relationship("Question", back_populates="submissions")
    student = relationship("User", foreign_keys=[student_id], back_populates="submissions")
    submission_results = relationship("SubmissionResult", back_populates="submission", cascade="all, delete-orphan")
    submission_events = relationship("SubmissionEvent", back_populates="submission", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_submissions_exam_id", "exam_id"),   # NEW index
        Index("idx_submissions_question_id", "question_id"),
        Index("idx_submissions_student_id", "student_id"),
        Index("idx_submissions_status", "status"),
        Index("idx_submissions_submitted_at", "submitted_at"),
    )


class SubmissionResult(Base):
    __tablename__ = "submission_results"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    submission_id = Column(UUID(as_uuid=True), ForeignKey("submissions.id"), nullable=False)
    judge0_token = Column(String(255))
    status = Column(SQLEnum(ExecutionStatus), nullable=False)
    stdout = Column(Text)
    stderr = Column(Text)
    compile_output = Column(Text)
    exit_code = Column(Integer)
    execution_time = Column(Float)
    memory_used = Column(Integer)
    score = Column(Integer, default=0, nullable=False)
    max_score = Column(Integer, nullable=False)
    test_results = Column(JSONB, default=dict)
    evaluated_at = Column(DateTime(timezone=False), default=func.now(), nullable=False)
    created_at = Column(DateTime(timezone=False), default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=False), default=func.now(), onupdate=func.now(), nullable=False)
    extra_data = Column(JSONB, default=dict)
    
    # Relationships
    submission = relationship("Submission", back_populates="submission_results")
    
    __table_args__ = (
        Index("idx_submission_results_submission_id", "submission_id"),
        Index("idx_submission_results_status", "status"),
        Index("idx_submission_results_evaluated_at", "evaluated_at"),
    )

class SubmissionEvent(Base):
    __tablename__ = "submission_events"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    submission_id = Column(UUID(as_uuid=True), ForeignKey("submissions.id"), nullable=False)
    event_type = Column(SQLEnum(EventType), nullable=False)
    event_data = Column(JSONB, default=dict)
    created_at = Column(DateTime(timezone=False), default=func.now(), nullable=False)
    extra_data = Column(JSONB, default=dict)
    
    # Relationships
    submission = relationship("Submission", back_populates="submission_events")
    
    __table_args__ = (
        Index("idx_submission_events_submission_id", "submission_id"),
        Index("idx_submission_events_event_type", "event_type"),
        Index("idx_submission_events_created_at", "created_at"),
    )

class ExamEvent(Base):
    __tablename__ = "exam_events"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    exam_session_id = Column(UUID(as_uuid=True), ForeignKey("exam_sessions.id"), nullable=False)
    event_type = Column(SQLEnum(EventType), nullable=False)
    event_data = Column(JSONB, default=dict)
    created_at = Column(DateTime(timezone=False), default=func.now(), nullable=False)
    extra_data = Column(JSONB, default=dict)
    
    # Relationships
    exam_session = relationship("ExamSession", back_populates="exam_events")
    
    __table_args__ = (
        Index("idx_exam_events_exam_session_id", "exam_session_id"),
        Index("idx_exam_events_event_type", "event_type"),
        Index("idx_exam_events_created_at", "created_at"),
    )

# Audit Model
class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"))  # ← Allow NULL when user is deleted
    action = Column(String(100), nullable=False)
    resource_type = Column(String(100), nullable=False)
    resource_id = Column(UUID(as_uuid=True))  # This can become orphaned, which is fine
    old_values = Column(JSONB, default=dict)
    new_values = Column(JSONB, default=dict)
    ip_address = Column(INET)
    user_agent = Column(String(500))
    created_at = Column(DateTime(timezone=False), default=func.now(), nullable=False)
    extra_data = Column(JSONB, default=dict)
    
    # Relationships
    user = relationship("User", back_populates="audit_logs")
    
    __table_args__ = (
        Index("idx_audit_logs_user_id", "user_id"),
        Index("idx_audit_logs_action", "action"),
        Index("idx_audit_logs_resource_type", "resource_type"),
        Index("idx_audit_logs_created_at", "created_at"),
    )

class Course(Base):
    __tablename__ = "courses"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    course_code = Column(String(20), unique=True, nullable=False)
    course_name = Column(String(255), nullable=False)
    description = Column(Text)
    credits = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=False), default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=False), default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    enrollments = relationship("CourseEnrollment", back_populates="course", cascade="all, delete-orphan")
    exams = relationship("Exam", back_populates="course", cascade="all, delete-orphan")
    cdp = relationship("CourseDevelopmentPlan", back_populates="course", uselist=False)
    lessons = relationship("Lesson", back_populates="course")
    activities = relationship("Activity", back_populates="course", cascade="all, delete-orphan")
    assessment_submissions = relationship("AssessmentSubmission", back_populates="course", cascade="all, delete-orphan")
    __table_args__ = (
        Index("idx_courses_course_code", "course_code"),
        Index("idx_courses_course_name", "course_name"),
    )


class CourseEnrollment(Base):
    __tablename__ = "course_enrollments"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    course_id = Column(UUID(as_uuid=True), ForeignKey("courses.id"), nullable=False)
    student_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    status = Column(SQLEnum(EnrollmentStatus), default=EnrollmentStatus.ENROLLED, nullable=False)
    enrolled_at = Column(DateTime(timezone=False), default=func.now(), nullable=False)
    dropped_at = Column(DateTime(timezone=False))
    completed_at = Column(DateTime(timezone=False))
    created_at = Column(DateTime(timezone=False), default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=False), default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    course = relationship("Course", back_populates="enrollments")
    student = relationship("User", foreign_keys=[student_id])
    
    __table_args__ = (
        UniqueConstraint("course_id", "student_id", name="uq_course_enrollments_course_student"),
        Index("idx_course_enrollments_course_id", "course_id"),
        Index("idx_course_enrollments_student_id", "student_id"),
        Index("idx_course_enrollments_status", "status"),
    )

class Activity(Base):
    __tablename__ = "activities"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    course_id = Column(UUID(as_uuid=True), ForeignKey("courses.id"), nullable=False)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    
    # Activity sheet PDF storage
    activity_sheet_pdf = Column(LargeBinary)
    pdf_filename = Column(String(255))
    pdf_filesize = Column(Integer)
    
    # Time management
    start_time = Column(DateTime(timezone=False), nullable=False)
    end_time = Column(DateTime(timezone=False), nullable=False)
    
    # Activity settings
    status = Column(SQLEnum(ActivityStatus), default=ActivityStatus.DRAFT, nullable=False)
    max_attempts = Column(Integer, default=1, nullable=False)
    settings = Column(JSONB, default=dict)
    
    # Scoring
    max_score = Column(Integer, default=100, nullable=False)
    created_at = Column(DateTime(timezone=False), default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=False), default=func.now(), onupdate=func.now(), nullable=False)
    extra_data = Column(JSONB, default=dict)
    
    # Relationships
    assessment_submissions = relationship("AssessmentSubmission", back_populates="activity")
    question_analytics = relationship("QuestionAnalytics", back_populates="activity", cascade="all, delete-orphan")
    course = relationship("Course", back_populates="activities")
    creator = relationship("User", foreign_keys=[created_by], back_populates="created_activities")
    
    # Relationships
    course = relationship("Course", back_populates="activities")
    creator = relationship("User", foreign_keys=[created_by], back_populates="created_activities")
    activity_assignments = relationship("ActivityAssignment", back_populates="activity", cascade="all, delete-orphan")
    activity_submissions = relationship("ActivitySubmission", back_populates="activity", cascade="all, delete-orphan")
    activity_questions = relationship("ActivityQuestion", back_populates="activity", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_activities_course_id", "course_id"),
        Index("idx_activities_created_by", "created_by"),
        Index("idx_activities_status", "status"),
        Index("idx_activities_start_time", "start_time"),
        Index("idx_activities_end_time", "end_time"),
    )


class ActivityAssignment(Base):
    __tablename__ = "activity_assignments"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    activity_id = Column(UUID(as_uuid=True), ForeignKey("activities.id"), nullable=False)
    student_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    assigned_at = Column(DateTime(timezone=False), default=func.now(), nullable=False)
    started_at = Column(DateTime(timezone=False))
    completed_at = Column(DateTime(timezone=False))
    status = Column(SQLEnum(AssignmentStatus), default=AssignmentStatus.ASSIGNED, nullable=False)
    score = Column(Integer, default=0)
    
    created_at = Column(DateTime(timezone=False), default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=False), default=func.now(), onupdate=func.now(), nullable=False)
    extra_data = Column(JSONB, default=dict)
    has_final_submission = Column(Boolean, default=False, nullable=False)
    final_submitted_at = Column(DateTime(timezone=False))


    # Relationships
    activity = relationship("Activity", back_populates="activity_assignments")
    student = relationship("User", foreign_keys=[student_id], back_populates="activity_assignments")
    activity_submissions = relationship("ActivitySubmission", back_populates="activity_assignment", cascade="all, delete-orphan")
    code_submissions = relationship("ActivityCodeSubmission", back_populates="activity_assignment", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("activity_id", "student_id", name="uq_activity_assignments_activity_student"),
        Index("idx_activity_assignments_activity_id", "activity_id"),
        Index("idx_activity_assignments_student_id", "student_id"),
        Index("idx_activity_assignments_status", "status"),
    )

class ActivitySubmission(Base):
    __tablename__ = "activity_submissions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    activity_assignment_id = Column(UUID(as_uuid=True), ForeignKey("activity_assignments.id"), nullable=False)
    activity_id = Column(UUID(as_uuid=True), ForeignKey("activities.id"), nullable=False)
    student_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    submission_type = Column(SQLEnum(SubmissionType), default=SubmissionType.COMPLETION, nullable=False)
    submission_data = Column(JSONB, default=dict)
    
    # File submission support
    submitted_file = Column(LargeBinary)
    submitted_filename = Column(String(255))
    submitted_filesize = Column(Integer)
    
    # Text/Code submission
    submitted_text = Column(Text)
    submitted_code = Column(Text)
    
    # Scoring and evaluation
    score = Column(Integer, default=0)
    max_score = Column(Integer, nullable=False)
    is_evaluated = Column(Boolean, default=False, nullable=False)
    
    submitted_at = Column(DateTime(timezone=False), default=func.now(), nullable=False)
    evaluated_at = Column(DateTime(timezone=False))
    attempt_number = Column(Integer, default=1, nullable=False)
    
    created_at = Column(DateTime(timezone=False), default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=False), default=func.now(), onupdate=func.now(), nullable=False)
    extra_data = Column(JSONB, default=dict)
    
    # Relationships
    activity_assignment = relationship("ActivityAssignment", back_populates="activity_submissions")
    activity = relationship("Activity", back_populates="activity_submissions")
    student = relationship("User", foreign_keys=[student_id], back_populates="activity_submissions")
    
    __table_args__ = (
        Index("idx_activity_submissions_assignment_id", "activity_assignment_id"),
        Index("idx_activity_submissions_activity_id", "activity_id"),
        Index("idx_activity_submissions_student_id", "student_id"),
        Index("idx_activity_submissions_submitted_at", "submitted_at"),
    )

# Add this to the existing models.py file

class ActivityQuestion(Base):
    __tablename__ = "activity_questions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    activity_id = Column(UUID(as_uuid=True), ForeignKey("activities.id"), nullable=False)
    question_number = Column(Integer, nullable=False)
    question_title = Column(String(255), nullable=False)
    question_description = Column(Text)
    max_score = Column(Integer, default=10, nullable=False)
    created_at = Column(DateTime(timezone=False), default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=False), default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    activity = relationship("Activity", back_populates="activity_questions")
    code_submissions = relationship("ActivityCodeSubmission", back_populates="activity_question", cascade="all, delete-orphan")
    
    __table_args__ = (
        UniqueConstraint("activity_id", "question_number", name="uq_activity_questions_activity_number"),
        Index("idx_activity_questions_activity_id", "activity_id"),
        Index("idx_activity_questions_number", "question_number"),
    )

class ActivityCodeSubmission(Base):
    __tablename__ = "activity_code_submissions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    activity_assignment_id = Column(UUID(as_uuid=True), ForeignKey("activity_assignments.id"), nullable=False)
    activity_question_id = Column(UUID(as_uuid=True), ForeignKey("activity_questions.id"), nullable=False)
    student_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    # Code submission data
    source_code = Column(Text, nullable=False)
    language = Column(String(50), nullable=False)
    question_context = Column(Text)  # Student's description/context
    
    # Execution results
    output = Column(Text)
    execution_time = Column(Float)
    memory_used = Column(Integer)
    status = Column(String(50), default='completed')
    
    # Scoring and metadata
    score = Column(Integer, default=0)
    is_final = Column(Boolean, default=False)  # Whether this is the final submission
    attempt_number = Column(Integer, default=1)
    submitted_at = Column(DateTime(timezone=False), default=func.now(), nullable=False)
    created_at = Column(DateTime(timezone=False), default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=False), default=func.now(), onupdate=func.now(), nullable=False)
    extra_data = Column(JSONB, default=dict)
    
    # Relationships
    activity_assignment = relationship("ActivityAssignment", back_populates="code_submissions")
    activity_question = relationship("ActivityQuestion", back_populates="code_submissions")
    student = relationship("User", foreign_keys=[student_id])
    
    __table_args__ = (
        Index("idx_activity_code_submissions_assignment_id", "activity_assignment_id"),
        Index("idx_activity_code_submissions_question_id", "activity_question_id"),
        Index("idx_activity_code_submissions_student_id", "student_id"),
        Index("idx_activity_code_submissions_submitted_at", "submitted_at"),
    )
    
class ActivityFinalSubmission(Base):
    __tablename__ = "activity_final_submissions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    activity_id = Column(UUID(as_uuid=True), ForeignKey("activities.id"), nullable=False)
    student_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    activity_assignment_id = Column(UUID(as_uuid=True), ForeignKey("activity_assignments.id"), nullable=False)
    
    # Submission data
    total_questions = Column(Integer, nullable=False)
    submission_data = Column(JSONB, nullable=False)  # Contains all question submissions
    
    # Metadata
    submitted_at = Column(DateTime(timezone=False), default=func.now(), nullable=False)
    total_score = Column(Integer, default=0)
    max_possible_score = Column(Integer, nullable=False)
    is_late = Column(Boolean, default=False, nullable=False)
    
    # Status tracking
    is_processed = Column(Boolean, default=False, nullable=False)
    processed_at = Column(DateTime(timezone=False))
    
    created_at = Column(DateTime(timezone=False), default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=False), default=func.now(), onupdate=func.now(), nullable=False)
    extra_data = Column(JSONB, default=dict)
    
    # Relationships
    activity = relationship("Activity", backref="final_submissions")
    student = relationship("User", foreign_keys=[student_id])
    activity_assignment = relationship("ActivityAssignment", backref="final_submission", uselist=False)
    
    __table_args__ = (
        UniqueConstraint("activity_id", "student_id", name="uq_activity_final_submission_activity_student"),
        Index("idx_activity_final_submissions_activity_id", "activity_id"),
        Index("idx_activity_final_submissions_student_id", "student_id"),
        Index("idx_activity_final_submissions_submitted_at", "submitted_at"),
    )


class ActivityGrade(Base):
    __tablename__ = "activity_grades"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    activity_id = Column(UUID(as_uuid=True), ForeignKey("activities.id"), nullable=False)
    submission_id = Column(UUID(as_uuid=True), ForeignKey("activity_submissions.id"), nullable=True)
    
    score = Column(Integer, nullable=False)
    max_score = Column(Integer, nullable=False)
    comments = Column(Text, nullable=True)
    
    graded_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    graded_at = Column(DateTime(timezone=False), default=func.now(), nullable=False)
    
    status = Column(SQLEnum(GradeStatus), default=GradeStatus.DRAFT, nullable=False)
    published_at = Column(DateTime(timezone=False), nullable=True)
    
    created_at = Column(DateTime(timezone=False), default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=False), default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    student = relationship("User", foreign_keys=[student_id], backref="activity_grades_received")
    activity = relationship("Activity", backref="grades")
    submission = relationship("ActivitySubmission", backref="grade", uselist=False)
    grader = relationship("User", foreign_keys=[graded_by], backref="activity_grades_given")
    
    __table_args__ = (
        UniqueConstraint("student_id", "activity_id", name="uq_activity_grade_student_activity"),
        Index("idx_activity_grades_student_id", "student_id"),
        Index("idx_activity_grades_activity_id", "activity_id"),
        Index("idx_activity_grades_status", "status"),
    )


class Notification(Base):
    __tablename__ = "notifications"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    type = Column(SQLEnum(NotificationType), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    
    # Optional references to related entities
    activity_id = Column(UUID(as_uuid=True), ForeignKey("activities.id"), nullable=True)
    grade_id = Column(UUID(as_uuid=True), ForeignKey("activity_grades.id"), nullable=True)
    
    is_read = Column(Boolean, default=False, nullable=False)
    read_at = Column(DateTime(timezone=False), nullable=True)
    
    created_at = Column(DateTime(timezone=False), default=func.now(), nullable=False)
    extra_data = Column(JSONB, default=dict)
    
    # Relationships
    user = relationship("User", backref="notifications")
    activity = relationship("Activity", backref="notifications")
    grade = relationship("ActivityGrade", backref="notifications")
    
    __table_args__ = (
        Index("idx_notifications_user_id", "user_id"),
        Index("idx_notifications_is_read", "is_read"),
        Index("idx_notifications_created_at", "created_at"),
    )


class ProgrammingLanguage(enum.Enum):
    PYTHON = "python"
    JAVASCRIPT = "javascript" 
    JAVA = "java"
    CPP = "cpp"
    CSHARP = "csharp"

class TaskStatus(enum.Enum):
    TODO = "todo"
    IN_PROGRESS = "in_progress"
    DONE = "done"

class TeacherProfile(Base):
    __tablename__ = "teacher_profiles"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    employee_id = Column(String(50), unique=True, nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    department = Column(String(50), nullable=False)
    courses = Column(ARRAY(String), default=list, nullable=False)
    designation = Column(String(100))
    created_at = Column(DateTime(timezone=False), default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=False), default=func.now(), onupdate=func.now(), nullable=False)
    extra_data = Column(JSONB, default=dict)
    
    # Relationships
    user = relationship("User", back_populates="teacher_profile")
    code_snippets = relationship("CodeSnippet", back_populates="teacher", cascade="all, delete-orphan")
    lessons = relationship("Lesson", back_populates="teacher", cascade="all, delete-orphan")
    tasks = relationship("KanbanTask", back_populates="teacher", cascade="all, delete-orphan")
    schedules = relationship("ClassSchedule", back_populates="teacher", cascade="all, delete-orphan")
    uploaded_notes = relationship("UploadedNote", back_populates="teacher", cascade="all, delete-orphan")
    timetable = relationship("TeacherTimetable", back_populates="teacher", uselist=False, cascade="all, delete-orphan")
    cdps = relationship("CourseDevelopmentPlan", back_populates="teacher", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_teacher_profiles_user_id", "user_id"),
        Index("idx_teacher_profiles_employee_id", "employee_id"),
        Index("idx_teacher_profiles_department", "department"),
        Index("idx_teacher_profiles_courses", "courses", postgresql_using="gin"),
    )

class CodeSnippet(Base):
    __tablename__ = "code_snippets"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    teacher_id = Column(UUID(as_uuid=True), ForeignKey("teacher_profiles.id"), nullable=False)
    topic = Column(String(255), nullable=False)
    sub_topic = Column(String(255), nullable=True)
    notes = Column(Text, nullable=True)
    language = Column(SQLEnum(ProgrammingLanguage, name="programminglanguage"), nullable=False)
    code_content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=False), default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=False), default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    teacher = relationship("TeacherProfile", back_populates="code_snippets")
    
    __table_args__ = (
        Index("idx_code_snippets_teacher_id", "teacher_id"),
        Index("idx_code_snippets_topic", "topic"),
        Index("idx_code_snippets_language", "language"),
    )

class Lesson(Base):
    __tablename__ = "lessons"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    course_id = Column(UUID(as_uuid=True), ForeignKey("courses.id"), nullable=False)
    teacher_id = Column(UUID(as_uuid=True), ForeignKey("teacher_profiles.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False)
    content = Column(Text, nullable=True)
    lesson_order = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    course = relationship("Course", back_populates="lessons")
    teacher = relationship("TeacherProfile", back_populates="lessons")
    
    __table_args__ = (
        Index("idx_lessons_teacher_id", "teacher_id"),
    )

class KanbanTask(Base):
    __tablename__ = "kanban_tasks"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    teacher_id = Column(UUID(as_uuid=True), ForeignKey("teacher_profiles.id"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(SQLEnum(TaskStatus, name="taskstatus"), nullable=False, default=TaskStatus.TODO)
    department = Column(SQLEnum(Department), nullable=False)
    batch_year = Column(Integer, nullable=False)
    priority = Column(Integer, default=0)  # For ordering
    due_date = Column(DateTime(timezone=False), nullable=True)
    created_at = Column(DateTime(timezone=False), default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=False), default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    teacher = relationship("TeacherProfile", back_populates="tasks")
    
    __table_args__ = (
        Index("idx_kanban_tasks_teacher_id", "teacher_id"),
        Index("idx_kanban_tasks_department", "department"),
        Index("idx_kanban_tasks_batch_year", "batch_year"),
        Index("idx_kanban_tasks_status", "status"),
    )

class ClassSchedule(Base):
    __tablename__ = "class_schedules"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    teacher_id = Column(UUID(as_uuid=True), ForeignKey("teacher_profiles.id"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    start_time = Column(DateTime(timezone=False), nullable=False)
    end_time = Column(DateTime(timezone=False), nullable=False)
    department = Column(SQLEnum(Department), nullable=False)
    batch_year = Column(Integer, nullable=False)
    location = Column(String(255), nullable=True)
    is_notified = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=False), default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=False), default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    teacher = relationship("TeacherProfile", back_populates="schedules")
    
    __table_args__ = (
        Index("idx_class_schedules_teacher_id", "teacher_id"),
        Index("idx_class_schedules_start_time", "start_time"),
        Index("idx_class_schedules_department", "department"),
        Index("idx_class_schedules_batch_year", "batch_year"),
    )

class DiagramFile(Base):
    __tablename__ = "diagram_files"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    teacher_id = Column(UUID(as_uuid=True), ForeignKey("teacher_profiles.id"), nullable=False)
    filename = Column(String(255), nullable=False)
    file_data = Column(LargeBinary, nullable=False)
    content_type = Column(String(100), nullable=False)
    created_at = Column(DateTime(timezone=False), default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=False), default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    teacher = relationship("TeacherProfile")
    
    __table_args__ = (
        Index("idx_diagram_files_teacher_id", "teacher_id"),
    )

class NoteCategory(enum.Enum):
    LECTURE_NOTES = "lecture_notes"
    ASSIGNMENT_SOLUTIONS = "assignment_solutions" 
    REFERENCE_MATERIALS = "reference_materials"
    EXAM_PAPERS = "exam_papers"
    STUDY_GUIDES = "study_guides"
    PRESENTATIONS = "presentations"
    OTHER = "other"

class UploadedNote(Base):
    __tablename__ = "uploaded_notes"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    teacher_id = Column(UUID(as_uuid=True), ForeignKey("teacher_profiles.id"), nullable=False)
    course_id = Column(UUID(as_uuid=True), ForeignKey("courses.id"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(SQLEnum(NoteCategory), nullable=False)
    tags = Column(JSONB, default=list)  # Store tags as JSON array
    is_public = Column(Boolean, default=False)  # For student access
    created_at = Column(DateTime(timezone=False), default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=False), default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    teacher = relationship("TeacherProfile", back_populates="uploaded_notes")
    course = relationship("Course")
    note_files = relationship("NoteFile", back_populates="note", cascade="all, delete-orphan")
    
    __table_args__ = (
        Index("idx_uploaded_notes_teacher_id", "teacher_id"),
        Index("idx_uploaded_notes_course_id", "course_id"),
        Index("idx_uploaded_notes_category", "category"),
        Index("idx_uploaded_notes_created_at", "created_at"),
    )

class NoteFile(Base):
    __tablename__ = "note_files"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    note_id = Column(UUID(as_uuid=True), ForeignKey("uploaded_notes.id"), nullable=False)
    filename = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False)
    file_data = Column(LargeBinary, nullable=False)
    content_type = Column(String(100), nullable=False)
    file_size = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=False), default=func.now(), nullable=False)
    
    # Relationships
    note = relationship("UploadedNote", back_populates="note_files")
    
    __table_args__ = (
        Index("idx_note_files_note_id", "note_id"),
    )

class TeacherTimetable(Base):
    __tablename__ = "teacher_timetables"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    teacher_id = Column(UUID(as_uuid=True), ForeignKey("teacher_profiles.id", ondelete="CASCADE"), nullable=False)
    timetable_filename = Column(String, nullable=True)
    timetable_data = Column(LargeBinary, nullable=True)
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship
    teacher = relationship("TeacherProfile", back_populates="timetable")

class CourseDevelopmentPlan(Base):
    __tablename__ = "course_development_plans"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    course_id = Column(UUID(as_uuid=True), ForeignKey("courses.id"), nullable=False)
    teacher_id = Column(UUID(as_uuid=True), ForeignKey("teacher_profiles.id", ondelete="CASCADE"), nullable=False)
    cdp_filename = Column(String, nullable=True)
    cdp_data = Column(LargeBinary, nullable=True)
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    course = relationship("Course", back_populates="cdp")
    teacher = relationship("TeacherProfile", back_populates="cdps")
