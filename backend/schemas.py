"schemas.py"
"""
Pydantic schemas for Online Exam System
Generated from SQLAlchemy models
"""

from pydantic import BaseModel, validator, Field, ConfigDict
from typing import Optional, Dict, Any, List, Union
from datetime import datetime
from uuid import UUID, uuid4
from decimal import Decimal
import uuid
from enum import Enum
from .models import (
    UserRole, Difficulty, ExamType, ExamStatus, RegistrationStatus,
    SessionStatus, SubmissionStatus, ExecutionStatus, EventType, Department,
    EnrollmentStatus, ActivityStatus, AssignmentStatus, SubmissionType,
    GradeStatus, NotificationType, ProgrammingLanguage, TaskStatus, NoteCategory
)

# Base schemas with common fields

class UserBase(BaseModel):
    email: str
    role: UserRole
    is_active: Optional[bool] = True
    extra_data: Optional[Dict[str, Any]] = {}

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    email: Optional[str] = None
    password_hash: Optional[str] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None
    extra_data: Optional[Dict[str, Any]] = None

class User(UserBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True

# UserSession schemas
class UserSessionBase(BaseModel):
    #session_token: str
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    expires_at: datetime
    extra_data: Optional[Dict[str, Any]] = {}

class UserSessionCreate(UserSessionBase):
    user_id: UUID

class UserSessionUpdate(BaseModel):
    #session_token: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    expires_at: Optional[datetime] = None
    extra_data: Optional[Dict[str, Any]] = None

class UserSession(UserSessionBase):
    id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True

# UserToken schemas
class UserTokenBase(BaseModel):
    token_type: str
    token_hash: str
    expires_at: datetime
    is_revoked: Optional[bool] = False
    extra_data: Optional[Dict[str, Any]] = {}

class UserTokenCreate(UserTokenBase):
    user_id: UUID

class UserTokenUpdate(BaseModel):
    token_type: Optional[str] = None
    token_hash: Optional[str] = None
    expires_at: Optional[datetime] = None
    is_revoked: Optional[bool] = None
    extra_data: Optional[Dict[str, Any]] = None

class UserToken(UserTokenBase):
    id: UUID
    user_id: UUID
    created_at: datetime

    class Config:
        orm_mode = True

# StudentProfile schemas
class StudentProfileBase(BaseModel):
    first_name: str
    last_name: str
    batch_year: int
    department: Department
    extra_data: Optional[Dict[str, Any]] = {}

class StudentProfileCreate(StudentProfileBase):
    user_id: UUID

class StudentProfileUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    batch_year: Optional[int] = None
    department: Optional[Department] = None
    extra_data: Optional[Dict[str, Any]] = None

class StudentProfile(StudentProfileBase):
    id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True

# StudentExamQuestion schemas
class StudentExamQuestionBase(BaseModel):
    question_order: int
    points: Optional[int] = 0
    extra_data: Optional[Dict[str, Any]] = {}

class StudentExamQuestionCreate(StudentExamQuestionBase):
    exam_id: UUID
    student_id: UUID
    question_id: UUID

class StudentExamQuestionUpdate(BaseModel):
    question_order: Optional[int] = None
    points: Optional[int] = None
    extra_data: Optional[Dict[str, Any]] = None

class StudentExamQuestion(StudentExamQuestionBase):
    id: UUID
    exam_id: UUID
    student_id: UUID
    question_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True

# TeacherProfile schemas
class TeacherProfileBase(BaseModel):
    employee_id: str
    first_name: str
    last_name: str
    department: str
    designation: Optional[str] = None
    courses: List[str] = []
    extra_data: Optional[Dict[str, Any]] = {}

class TeacherProfileCreate(TeacherProfileBase):
    user_id: UUID

class TeacherProfileUpdate(BaseModel):
    employee_id: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    department: str
    designation: Optional[str] = None
    courses: List[str] = []
    extra_data: Optional[Dict[str, Any]] = None

class TeacherProfile(TeacherProfileBase):
    id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True

# QuestionCategory schemas
class QuestionCategoryBase(BaseModel):
    name: str
    description: Optional[str] = None
    is_active: Optional[bool] = True
    extra_data: Optional[Dict[str, Any]] = {}

class QuestionCategoryCreate(QuestionCategoryBase):
    pass

class QuestionCategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    extra_data: Optional[Dict[str, Any]] = None

class QuestionCategory(QuestionCategoryBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True

#QuestionBase class
class QuestionBase(BaseModel):
    title: str
    description: Optional[str] = None
    problem_statement: str
    difficulty: Difficulty
    constraints: Optional[Dict[str, Any]] = {}
    starter_code: Optional[Dict[str, Any]] = {}
    max_score: int
    time_limit_seconds: Optional[int] = 30
    is_active: Optional[bool] = True
    statement_type: Optional[str] = 'html'
    pdf_filename: Optional[str] = None
    pdf_filesize: Optional[int] = None
    
    # Solution fields (NEW)
    has_solution: Optional[bool] = False
    solution_type: Optional[str] = 'html'
    solution_text: Optional[str] = None
    solution_pdf_filename: Optional[str] = None
    solution_pdf_filesize: Optional[int] = None
    
    extra_data: Optional[Dict[str, Any]] = {}

class QuestionCreate(QuestionBase):
    category_id: UUID
    pdf_data: Optional[bytes] = None
    solution_pdf_data: Optional[bytes] = None  # NEW

class QuestionUpdate(BaseModel):
    category_id: Optional[UUID] = None
    title: Optional[str] = None
    description: Optional[str] = None
    problem_statement: Optional[str] = None
    difficulty: Optional[Difficulty] = None
    constraints: Optional[Dict[str, Any]] = None
    starter_code: Optional[Dict[str, Any]] = None
    max_score: Optional[int] = None
    time_limit_seconds: Optional[int] = None
    is_active: Optional[bool] = None
    statement_type: Optional[str] = None
    pdf_filename: Optional[str] = None
    pdf_filesize: Optional[int] = None
    pdf_data: Optional[bytes] = None
    
    # Solution fields (NEW)
    has_solution: Optional[bool] = None
    solution_type: Optional[str] = None
    solution_text: Optional[str] = None
    solution_pdf_filename: Optional[str] = None
    solution_pdf_filesize: Optional[int] = None
    solution_pdf_data: Optional[bytes] = None
    
    extra_data: Optional[Dict[str, Any]] = None

class Question(QuestionBase):
    id: UUID
    category_id: UUID
    created_by: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True

# QuestionTestCase schemas
class QuestionTestCaseBase(BaseModel):
    input_data: str
    expected_output: str
    is_sample: Optional[bool] = False
    is_hidden: Optional[bool] = False
    weight: Optional[int] = 1
    extra_data: Optional[Dict[str, Any]] = {}

class QuestionTestCaseCreate(QuestionTestCaseBase):
    question_id: UUID

class QuestionTestCaseUpdate(BaseModel):
    input_data: Optional[str] = None
    expected_output: Optional[str] = None
    is_sample: Optional[bool] = None
    is_hidden: Optional[bool] = None
    weight: Optional[int] = None
    extra_data: Optional[Dict[str, Any]] = None

class QuestionTestCase(QuestionTestCaseBase):
    id: UUID
    question_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True

# Exam schemas
class ExamBase(BaseModel):
    course_id: UUID  # ADD THIS LINE
    title: str
    description: Optional[str] = None
    start_time: datetime
    end_time: datetime
    duration_minutes: int
    exam_type: ExamType
    shuffle_questions: Optional[bool] = False
    max_attempts: Optional[int] = 1
    settings: Optional[Dict[str, Any]] = {}
    status: Optional[ExamStatus] = ExamStatus.DRAFT
    extra_data: Optional[Dict[str, Any]] = {}

class ExamCreate(ExamBase):
    pass

class ExamUpdate(BaseModel):
    course_id: Optional[UUID] = None  # ADD THIS LINE
    title: Optional[str] = None
    description: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    exam_type: Optional[ExamType] = None
    shuffle_questions: Optional[bool] = None
    max_attempts: Optional[int] = None
    settings: Optional[Dict[str, Any]] = None
    status: Optional[ExamStatus] = None
    extra_data: Optional[Dict[str, Any]] = None

class Exam(ExamBase):
    id: UUID
    created_by: UUID
    created_at: datetime
    updated_at: datetime
    
    class Config:
        orm_mode = True

# ExamQuestion schemas
class ExamQuestionBase(BaseModel):
    question_order: int
    points: int
    extra_data: Optional[Dict[str, Any]] = {}

class ExamQuestionCreate(ExamQuestionBase):
    exam_id: UUID
    question_id: UUID

class ExamQuestionUpdate(BaseModel):
    question_order: Optional[int] = None
    points: Optional[int] = None
    extra_data: Optional[Dict[str, Any]] = None

class ExamQuestion(ExamQuestionBase):
    id: UUID
    exam_id: UUID
    question_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True

# ExamRegistration schemas
class ExamRegistrationBase(BaseModel):
    status: Optional[RegistrationStatus] = RegistrationStatus.PENDING
    approved_at: Optional[datetime] = None
    extra_data: Optional[Dict[str, Any]] = {}

class ExamRegistrationCreate(ExamRegistrationBase):
    exam_id: UUID
    student_id: UUID
    approved_by: Optional[UUID] = None

class ExamRegistrationUpdate(BaseModel):
    status: Optional[RegistrationStatus] = None
    approved_at: Optional[datetime] = None
    approved_by: Optional[UUID] = None
    extra_data: Optional[Dict[str, Any]] = None

class ExamRegistration(ExamRegistrationBase):
    id: UUID
    exam_id: UUID
    student_id: UUID
    approved_by: Optional[UUID] = None
    registered_at: datetime
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True

# ExamSession schemas
class ExamSessionBase(BaseModel):
    #session_token: UUID
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    last_activity_at: Optional[datetime] = None
    status: Optional[SessionStatus] = SessionStatus.ACTIVE
    browser_info: Optional[Dict[str, Any]] = {}
    ip_address: Optional[str] = None
    extra_data: Optional[Dict[str, Any]] = {}

class ExamSessionCreate(ExamSessionBase):
    exam_id: UUID

class ExamSessionUpdate(BaseModel):
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    last_activity_at: Optional[datetime] = None
    status: Optional[SessionStatus] = None
    browser_info: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = None
    extra_data: Optional[Dict[str, Any]] = None

class ExamSession(ExamSessionBase):
    id: UUID
    exam_id: UUID
    student_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True

# Submission schemas
class SubmissionBase(BaseModel):
    source_code: str
    language: str
    status: Optional[SubmissionStatus] = SubmissionStatus.PENDING
    attempt_number: Optional[int] = 1
    extra_data: Optional[Dict[str, Any]] = {}

class SubmissionCreate(SubmissionBase):
    exam_id: UUID
    question_id: UUID

class SubmissionUpdate(BaseModel):
    source_code: Optional[str] = None
    language: Optional[str] = None
    status: Optional[SubmissionStatus] = None
    attempt_number: Optional[int] = None
    extra_data: Optional[Dict[str, Any]] = None

class Submission(SubmissionBase):
    id: UUID
    exam_id: UUID
    question_id: UUID
    student_id: UUID
    submitted_at: datetime
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True

# SubmissionResult schemas
class SubmissionResultBase(BaseModel):
    judge0_token: Optional[str] = None
    status: ExecutionStatus
    stdout: Optional[str] = None
    stderr: Optional[str] = None
    compile_output: Optional[str] = None
    exit_code: Optional[int] = None
    execution_time: Optional[float] = None
    memory_used: Optional[int] = None
    score: Optional[int] = 0
    max_score: int
    test_results: Optional[Dict[str, Any]] = {}
    extra_data: Optional[Dict[str, Any]] = {}

class SubmissionResultCreate(SubmissionResultBase):
    submission_id: UUID

class SubmissionResultUpdate(BaseModel):
    judge0_token: Optional[str] = None
    status: Optional[ExecutionStatus] = None
    stdout: Optional[str] = None
    stderr: Optional[str] = None
    compile_output: Optional[str] = None
    exit_code: Optional[int] = None
    execution_time: Optional[float] = None
    memory_used: Optional[int] = None
    score: Optional[int] = None
    max_score: Optional[int] = None
    test_results: Optional[Dict[str, Any]] = None
    extra_data: Optional[Dict[str, Any]] = None

class SubmissionResult(SubmissionResultBase):
    id: UUID
    submission_id: UUID
    evaluated_at: datetime
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True

# SubmissionEvent schemas
class SubmissionEventBase(BaseModel):
    event_type: EventType
    event_data: Optional[Dict[str, Any]] = {}
    extra_data: Optional[Dict[str, Any]] = {}

class SubmissionEventCreate(SubmissionEventBase):
    submission_id: UUID

class SubmissionEventUpdate(BaseModel):
    event_type: Optional[EventType] = None
    event_data: Optional[Dict[str, Any]] = None
    extra_data: Optional[Dict[str, Any]] = None

class SubmissionEvent(SubmissionEventBase):
    id: UUID
    submission_id: UUID
    created_at: datetime

    class Config:
        orm_mode = True

# ExamEvent schemas
class ExamEventBase(BaseModel):
    event_type: EventType
    event_data: Optional[Dict[str, Any]] = {}
    extra_data: Optional[Dict[str, Any]] = {}

class ExamEventCreate(ExamEventBase):
    exam_session_id: UUID

class ExamEventUpdate(BaseModel):
    event_type: Optional[EventType] = None
    event_data: Optional[Dict[str, Any]] = None
    extra_data: Optional[Dict[str, Any]] = None

class ExamEvent(ExamEventBase):
    id: UUID
    exam_session_id: UUID
    created_at: datetime

    class Config:
        orm_mode = True

# AuditLog schemas
class AuditLogBase(BaseModel):
    action: str
    resource_type: str
    resource_id: Optional[UUID] = None
    old_values: Optional[Dict[str, Any]] = {}
    new_values: Optional[Dict[str, Any]] = {}
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    extra_data: Optional[Dict[str, Any]] = {}

class AuditLogCreate(AuditLogBase):
    user_id: Optional[UUID] = None

class AuditLogUpdate(BaseModel):
    action: Optional[str] = None
    resource_type: Optional[str] = None
    resource_id: Optional[UUID] = None
    old_values: Optional[Dict[str, Any]] = None
    new_values: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    extra_data: Optional[Dict[str, Any]] = None

class AuditLog(AuditLogBase):
    id: UUID
    user_id: Optional[UUID] = None
    created_at: datetime

    class Config:
        orm_mode = True

# Schema for bulk assignment
class StudentExamQuestionAssignment(BaseModel):
    exam_id: UUID
    student_id: UUID
    question_id: UUID
    question_order: int
    points: Optional[int] = 0

class BulkStudentExamQuestionCreate(BaseModel):
    assignments: List[StudentExamQuestionAssignment]

# Schema for student exam questions with question details
class StudentExamQuestionWithQuestion(StudentExamQuestionBase):
    id: UUID
    exam_id: UUID
    student_id: UUID
    question_id: UUID
    created_at: datetime
    updated_at: datetime
    question: Question  # Include the full question details

    class Config:
        orm_mode = True

# Schema for student exam questions with student profile
class StudentExamQuestionWithStudent(StudentExamQuestionBase):
    id: UUID
    exam_id: UUID
    student_id: UUID
    question_id: UUID
    created_at: datetime
    updated_at: datetime
    student: StudentProfile  # Include student profile details

    class Config:
        orm_mode = True
# MCQ schemas
class MCQBase(BaseModel):
    title: str
    description: Optional[str] = None
    question_text: str
    difficulty: Difficulty
    options: List[str]  # ["Option A", "Option B", "Option C", "Option D"]
    correct_answer: int  # 1, 2, 3, or 4
    shuffle_options: Optional[bool] = False
    explanation: Optional[str] = None
    max_score: int
    partial_scoring: Optional[bool] = False
    is_active: Optional[bool] = True
    extra_data: Optional[Dict[str, Any]] = {}

class MCQCreate(MCQBase):
    category_id: UUID

class MCQUpdate(BaseModel):
    category_id: Optional[UUID] = None
    title: Optional[str] = None
    description: Optional[str] = None
    question_text: Optional[str] = None
    difficulty: Optional[Difficulty] = None
    options: Optional[List[str]] = None
    correct_answer: Optional[int] = None
    shuffle_options: Optional[bool] = None
    explanation: Optional[str] = None
    max_score: Optional[int] = None
    partial_scoring: Optional[bool] = None
    is_active: Optional[bool] = None
    extra_data: Optional[Dict[str, Any]] = None

class MCQ(MCQBase):
    id: UUID
    category_id: UUID
    created_by: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True

# ExamMCQ schemas
class ExamMCQBase(BaseModel):
    question_order: int
    points: int
    extra_data: Optional[Dict[str, Any]] = {}

class ExamMCQCreate(ExamMCQBase):
    exam_id: UUID
    mcq_id: UUID

class ExamMCQUpdate(BaseModel):
    question_order: Optional[int] = None
    points: Optional[int] = None
    extra_data: Optional[Dict[str, Any]] = None

class ExamMCQ(ExamMCQBase):
    id: UUID
    exam_id: UUID
    mcq_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True

# StudentExamMCQ schemas
class StudentExamMCQBase(BaseModel):
    question_order: int
    points: Optional[int] = 0
    extra_data: Optional[Dict[str, Any]] = {}

class StudentExamMCQCreate(StudentExamMCQBase):
    exam_id: UUID
    student_id: UUID
    mcq_id: UUID

class StudentExamMCQUpdate(BaseModel):
    question_order: Optional[int] = None
    points: Optional[int] = None
    extra_data: Optional[Dict[str, Any]] = None

class StudentExamMCQ(StudentExamMCQBase):
    id: UUID
    exam_id: UUID
    student_id: UUID
    mcq_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True

# MCQSubmission schemas
class MCQSubmissionBase(BaseModel):
    selected_answer: int  # 1, 2, 3, or 4
    attempt_number: Optional[int] = 1
    extra_data: Optional[Dict[str, Any]] = {}

class MCQSubmissionCreate(MCQSubmissionBase):
    exam_id: UUID
    mcq_id: UUID

class MCQSubmissionUpdate(BaseModel):
    selected_answer: Optional[int] = None
    attempt_number: Optional[int] = None
    extra_data: Optional[Dict[str, Any]] = None

class MCQSubmission(MCQSubmissionBase):
    id: UUID
    exam_id: UUID
    mcq_id: UUID
    student_id: UUID
    is_correct: bool
    score: int
    submitted_at: datetime
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True

# Schema with MCQ details
class StudentExamMCQWithMCQ(StudentExamMCQBase):
    id: UUID
    exam_id: UUID
    student_id: UUID
    mcq_id: UUID
    created_at: datetime
    updated_at: datetime
    mcq: MCQ  # Include the full MCQ details

    class Config:
        orm_mode = True

# Bulk assignment schema
class StudentExamMCQAssignment(BaseModel):
    exam_id: UUID
    student_id: UUID
    mcq_id: UUID
    question_order: int
    points: Optional[int] = 0

class BulkStudentExamMCQCreate(BaseModel):
    assignments: List[StudentExamMCQAssignment]


# Course schemas
class CourseBase(BaseModel):
    course_code: str
    course_name: str
    description: Optional[str] = None
    credits: int

class CourseCreate(CourseBase):
    pass

class CourseUpdate(BaseModel):
    course_code: Optional[str] = None
    course_name: Optional[str] = None
    description: Optional[str] = None
    credits: Optional[int] = None

class Course(CourseBase):
    id: UUID  # Changed from UUID4 to UUID
    created_at: datetime
    updated_at: datetime
    
    class Config:
        orm_mode = True  # Changed from from_attributes = True

# Course Enrollment schemas
class CourseEnrollmentBase(BaseModel):
    course_id: UUID  # Changed from UUID4 to UUID
    student_id: UUID  # Changed from UUID4 to UUID
    status: EnrollmentStatus = EnrollmentStatus.ENROLLED

class CourseEnrollmentCreate(CourseEnrollmentBase):
    pass

class CourseEnrollmentUpdate(BaseModel):  # This was missing!
    course_id: Optional[UUID] = None
    student_id: Optional[UUID] = None
    status: Optional[EnrollmentStatus] = None
    dropped_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

class CourseEnrollment(CourseEnrollmentBase):
    id: UUID  # Changed from UUID4 to UUID
    enrolled_at: datetime
    dropped_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        orm_mode = True  # Changed from from_attributes = True

# NEW: Exam with course information included
class ExamWithCourse(ExamBase):
    id: UUID
    created_by: UUID
    course: Course  # Now Course is properly defined above
    created_at: datetime
    updated_at: datetime
    
    class Config:
        orm_mode = True

# Activity schemas
class ActivityBase(BaseModel):
    title: str
    description: Optional[str] = None
    start_time: datetime
    end_time: datetime
    max_attempts: Optional[int] = 1
    max_score: Optional[int] = 100
    settings: Optional[Dict[str, Any]] = {}
    extra_data: Optional[Dict[str, Any]] = {}

class ActivityCreate(ActivityBase):
    course_id: UUID
    pdf_data: Optional[bytes] = None

class ActivityUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    max_attempts: Optional[int] = None
    max_score: Optional[int] = None
    settings: Optional[Dict[str, Any]] = None
    status: Optional[ActivityStatus] = None
    pdf_data: Optional[bytes] = None
    extra_data: Optional[Dict[str, Any]] = None

class Activity(ActivityBase):
    id: UUID
    course_id: UUID
    created_by: UUID
    status: ActivityStatus
    pdf_filename: Optional[str] = None
    pdf_filesize: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        orm_mode = True

# Activity Assignment schemas
class ActivityAssignmentBase(BaseModel):
    status: Optional[AssignmentStatus] = AssignmentStatus.ASSIGNED
    score: Optional[int] = 0
    extra_data: Optional[Dict[str, Any]] = {}

class ActivityAssignmentCreate(ActivityAssignmentBase):
    activity_id: UUID
    student_id: UUID

class ActivityAssignmentUpdate(BaseModel):
    status: Optional[AssignmentStatus] = None
    score: Optional[int] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    extra_data: Optional[Dict[str, Any]] = None

class ActivityAssignment(ActivityAssignmentBase):
    id: UUID
    activity_id: UUID
    student_id: UUID
    assigned_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        orm_mode = True

# Activity Submission schemas
class ActivitySubmissionBase(BaseModel):
    submission_type: SubmissionType = SubmissionType.COMPLETION
    submission_data: Optional[Dict[str, Any]] = {}
    submitted_text: Optional[str] = None
    submitted_code: Optional[str] = None
    attempt_number: Optional[int] = 1
    extra_data: Optional[Dict[str, Any]] = {}

class ActivitySubmissionCreate(ActivitySubmissionBase):
    activity_assignment_id: UUID
    max_score: int
    file_data: Optional[bytes] = None

class ActivitySubmissionUpdate(BaseModel):
    submission_type: Optional[SubmissionType] = None
    submission_data: Optional[Dict[str, Any]] = None
    submitted_text: Optional[str] = None
    submitted_code: Optional[str] = None
    score: Optional[int] = None
    is_evaluated: Optional[bool] = None
    evaluated_at: Optional[datetime] = None
    extra_data: Optional[Dict[str, Any]] = None

class ActivitySubmission(ActivitySubmissionBase):
    id: UUID
    activity_assignment_id: UUID
    activity_id: UUID
    student_id: UUID
    submitted_filename: Optional[str] = None
    submitted_filesize: Optional[int] = None
    score: int
    max_score: int
    is_evaluated: bool
    submitted_at: datetime
    evaluated_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        orm_mode = True

# Bulk assignment schemas
class BulkActivityAssignmentCreate(BaseModel):
    student_ids: List[UUID]  # Make sure it's student_ids not studentids
    
    class Config:
        orm_mode = True

# Activity with related data
class ActivityWithAssignments(Activity):
    activity_assignments: List[ActivityAssignment] = []
    
    class Config:
        orm_mode = True

# Student assignment with activity details
class ActivityAssignmentWithActivity(ActivityAssignment):
    activity: Activity
    
    class Config:
        orm_mode = True

# ActivityQuestion schemas
class ActivityQuestionBase(BaseModel):
    question_number: int
    question_title: str
    question_description: Optional[str] = None
    max_score: Optional[int] = 10

class ActivityQuestionCreate(ActivityQuestionBase):
    activity_id: UUID

class ActivityQuestionUpdate(BaseModel):
    question_number: Optional[int] = None
    question_title: Optional[str] = None
    question_description: Optional[str] = None
    max_score: Optional[int] = None

class ActivityQuestion(ActivityQuestionBase):
    id: UUID
    activity_id: UUID
    created_at: datetime
    updated_at: datetime
    
    class Config:
        orm_mode = True

# ActivityCodeSubmission schemas
class ActivityCodeSubmissionBase(BaseModel):
    source_code: str
    language: str
    question_context: Optional[str] = None
    output: Optional[str] = None
    execution_time: Optional[float] = None
    memory_used: Optional[int] = None
    status: Optional[str] = 'completed'
    score: Optional[int] = 0
    is_final: Optional[bool] = False
    attempt_number: Optional[int] = 1
    extra_data: Optional[Dict[str, Any]] = {}

class ActivityCodeSubmissionCreate(ActivityCodeSubmissionBase):
    activity_assignment_id: UUID
    activity_question_id: UUID

class ActivityCodeSubmissionUpdate(BaseModel):
    source_code: Optional[str] = None
    language: Optional[str] = None
    question_context: Optional[str] = None
    output: Optional[str] = None
    execution_time: Optional[float] = None
    memory_used: Optional[int] = None
    status: Optional[str] = None
    score: Optional[int] = None
    is_final: Optional[bool] = None
    attempt_number: Optional[int] = None
    extra_data: Optional[Dict[str, Any]] = None

class ActivityCodeSubmission(ActivityCodeSubmissionBase):
    id: UUID
    activity_assignment_id: UUID
    activity_question_id: UUID
    student_id: UUID
    submitted_at: datetime
    created_at: datetime
    updated_at: datetime
    
    class Config:
        orm_mode = True

# Enhanced Activity schema with questions
class ActivityWithQuestions(Activity):
    activity_questions: List[ActivityQuestion] = []
    
    class Config:
        orm_mode = True

class ActivityFinalSubmissionBase(BaseModel):
    total_questions: int
    submission_data: Dict[str, Any]  # Contains all question data
    is_late: Optional[bool] = False
    extra_data: Optional[Dict[str, Any]] = {}

class ActivityFinalSubmissionCreate(ActivityFinalSubmissionBase):
    activity_id: UUID
    activity_assignment_id: UUID

class ActivityFinalSubmissionUpdate(BaseModel):
    total_questions: Optional[int] = None
    submission_data: Optional[Dict[str, Any]] = None
    total_score: Optional[int] = None
    is_processed: Optional[bool] = None
    processed_at: Optional[datetime] = None
    extra_data: Optional[Dict[str, Any]] = None

class ActivityFinalSubmission(ActivityFinalSubmissionBase):
    id: UUID
    activity_id: UUID
    student_id: UUID
    activity_assignment_id: UUID
    submitted_at: datetime
    total_score: int
    max_possible_score: int
    is_processed: bool
    processed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        orm_mode = True

class ActivityFinalSubmissionWithDetails(ActivityFinalSubmission):
    activity: Activity
    student: User
    activity_assignment: ActivityAssignment
    
    class Config:
        orm_mode = True

# Update ActivityAssignmentUpdate schema
class ActivityAssignmentUpdate(BaseModel):
    status: Optional[AssignmentStatus] = None
    score: Optional[int] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    has_final_submission: Optional[bool] = None  # Add this
    final_submitted_at: Optional[datetime] = None  # Add this
    extra_data: Optional[Dict[str, Any]] = None

# Add these imports at the top if not already present
from pydantic import BaseModel, Field
from typing import Optional

# Add these new schema classes
class Judge0ExecutionRequest(BaseModel):
    source_code: str = Field(..., description="Source code to execute")
    language: str = Field(..., description="Programming language (e.g., python, java, cpp)")
    stdin: Optional[str] = Field(default="", description="Standard input for the program")
    time_limit: Optional[float] = Field(default=5.0, description="Time limit in seconds")

class CodeExecutionResult(BaseModel):
    success: bool = Field(..., description="Whether the execution was successful")
    status_id: int = Field(..., description="Judge0 status ID")
    stdout: Optional[str] = Field(None, description="Standard output")
    stderr: Optional[str] = Field(None, description="Standard error output")
    execution_time: Optional[float] = Field(None, description="Execution time in seconds")
    memory_used: Optional[int] = Field(None, description="Memory used in bytes")
    message: Optional[str] = Field(None, description="Additional message or error details")
    compilation_successful: Optional[bool] = Field(None, description="Whether compilation was successful")
    score: Optional[int] = Field(None, description="Score for this execution")

    class Config:
        schema_extra = {
            "example": {
                "success": True,
                "status_id": 3,
                "stdout": "Hello World\n",
                "stderr": "",
                "execution_time": 0.123,
                "memory_used": 1024,
                "message": "Code executed successfully",
                "compilation_successful": True,
                "score": 10
            }
        }

# Add after your existing ActivityFinalSubmission related schemas

class ActivityFinalSubmissionForTeacher(BaseModel):
    id: UUID
    activity_id: UUID
    student_id: UUID
    student: Optional["UserBase"] = None
    submitted_at: datetime
    is_late: bool = False
    score: Optional[int] = None
    max_score: Optional[int] = None
    status: SubmissionStatus
    submission_data: Optional[Dict[str, Any]] = None
    feedback: Optional[str] = None
    graded_by: Optional[UUID] = None
    graded_at: Optional[datetime] = None
    extra_data: Optional[Dict[str, Any]] = {}
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True
        schema_extra = {
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "activity_id": "123e4567-e89b-12d3-a456-426614174001",
                "student_id": "123e4567-e89b-12d3-a456-426614174002",
                "student": {
                    "id": "123e4567-e89b-12d3-a456-426614174002",
                    "email": "student@example.com",
                    "full_name": "John Doe"
                },
                "submitted_at": "2025-09-14T15:30:00Z",
                "is_late": False,
                "score": 85,
                "max_score": 100,
                "status": "completed",
                "submission_data": {
                    "questions": [
                        {
                            "question_id": 1,
                            "answer": "print('Hello World')",
                            "language": "python"
                        }
                    ]
                },
                "feedback": "Good work!",
                "graded_by": "123e4567-e89b-12d3-a456-426614174003",
                "graded_at": "2025-09-14T16:00:00Z",
                "extra_data": {},
                "created_at": "2025-09-14T15:30:00Z",
                "updated_at": "2025-09-14T16:00:00Z"
            }
        }

# Add these after your existing schemas

class TeacherGradingCreate(BaseModel):
    teacher_score: int
    teacher_feedback: str

class ActivityStatistics(BaseModel):
    total_submissions: int
    graded_submissions: int
    average_score: float
    completion_rate: float
    on_time_submissions: int
    late_submissions: int
    submission_details: Dict[str, Any]

class GradingQueueItem(BaseModel):
    submission_id: UUID
    activity_title: str
    student_name: str
    student_email: str
    submitted_at: datetime
    total_questions: int
    auto_score: Optional[int]
    max_score: int
    is_late: bool
    priority: str  # "high", "medium", "low"

class StudentSubmissionDetail(BaseModel):
    submission_id: UUID
    student: User
    student_profile: Optional[StudentProfile]
    activity: Activity
    submitted_at: datetime
    total_questions: int
    total_score: Optional[int]
    max_possible_score: int
    is_late: bool
    question_submissions: List[Dict[str, Any]]
    teacher_graded: bool
    teacher_score: Optional[int]
    teacher_feedback: Optional[str]

    class Config:
        orm_mode = True

class PaginationResponse(BaseModel):
    items: List[Any]
    total: int
    page: int
    per_page: int
    total_pages: int
    has_next: bool
    has_prev: bool

class SuccessResponse(BaseModel):
    success: bool = True
    message: str
    data: Optional[Dict[str, Any]] = None

class ErrorResponse(BaseModel):
    success: bool = False
    error: str
    details: Optional[Dict[str, Any]] = None

class ActivityWithCourse(Activity):
    course: Course

    class Config:
        orm_mode = True

class ActivitySubmissionResponse(BaseModel):
    id: UUID
    student_id: UUID
    activity_id: UUID
    submitted_at: datetime
    status: str
    score: Optional[int]
    feedback: Optional[str]
    submission_data: Dict[str, Any]

    class Config:
        orm_mode = True

class ActivityExportRow(BaseModel):
    student_name: str
    student_email: str
    submitted_at: Optional[datetime]
    status: str
    score: Optional[int]
    max_score: int
    is_late: bool
    feedback: Optional[str]

class ActivityReport(BaseModel):
    activity_id: UUID
    activity_title: str
    total_submissions: int
    average_score: float
    submissions: List[ActivityExportRow]

    class Config:
        orm_mode = True

# Add these schemas for the admin dashboard
class DashboardStats(BaseModel):
    total_students: int
    total_activities: int
    total_submissions: int
    pending_grading: int
    recent_activities: List[Activity]
    recent_submissions: List[ActivitySubmission]

    class Config:
        orm_mode = True

# Add this for file uploads
class FileUpload(BaseModel):
    filename: str
    content_type: str
    file_size: int
    file_data: bytes

class FileUploadResponse(BaseModel):
    filename: str
    file_size: int
    upload_date: datetime
    file_url: str

# Add this for student performance analysis
class StudentPerformanceStats(BaseModel):
    student_id: UUID
    total_activities: int
    completed_activities: int
    average_score: float
    on_time_submission_rate: float
    activity_scores: List[Dict[str, Any]]
    improvement_trend: Optional[float]

    class Config:
        orm_mode = True

# Add this for course progress tracking
class CourseProgress(BaseModel):
    course_id: UUID
    course_name: str
    total_activities: int
    completed_activities: int
    current_score: float
    required_score: float
    is_passing: bool
    remaining_activities: List[Activity]

    class Config:
        orm_mode = True


# Activity Grade Schemas
class ActivityGradeBase(BaseModel):
    score: int
    max_score: int
    comments: Optional[str] = None

class ActivityGradeCreate(ActivityGradeBase):
    student_id: UUID
    activity_id: UUID
    submission_id: Optional[UUID] = None

class ActivityGradeUpdate(BaseModel):
    score: Optional[int] = None
    max_score: Optional[int] = None
    comments: Optional[str] = None

class ActivityGrade(ActivityGradeBase):
    id: UUID
    student_id: UUID
    activity_id: UUID
    submission_id: Optional[UUID]
    graded_by: UUID
    graded_at: datetime
    status: GradeStatus
    published_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True

class ActivityGradeWithStudent(ActivityGrade):
    student_email: str
    student_first_name: Optional[str]
    student_last_name: Optional[str]

    class Config:
        orm_mode = True

class GradingStatusResponse(BaseModel):
    activity_id: UUID
    total_assigned_students: int
    total_graded_students: int
    published_count: int
    all_graded: bool
    all_published: bool
    can_publish: bool


# Notification Schemas
class NotificationBase(BaseModel):
    type: NotificationType
    title: str
    message: str
    activity_id: Optional[UUID] = None
    grade_id: Optional[UUID] = None

class NotificationCreate(NotificationBase):
    user_id: UUID

class Notification(NotificationBase):
    id: UUID
    user_id: UUID
    is_read: bool
    read_at: Optional[datetime]
    created_at: datetime
    extra_data: Optional[Dict[str, Any]] = {}

    class Config:
        orm_mode = True

class NotificationUpdate(BaseModel):
    is_read: Optional[bool] = None
# Code Snippet Schemas
class CodeSnippetBase(BaseModel):
    topic: str = Field(..., min_length=1, max_length=255)
    sub_topic: Optional[str] = Field(None, max_length=255)
    notes: Optional[str] = None
    language: ProgrammingLanguage
    code_content: str = Field(..., min_length=1)

class CodeSnippetCreate(CodeSnippetBase):
    pass

class CodeSnippetUpdate(BaseModel):
    topic: Optional[str] = Field(None, min_length=1, max_length=255)
    sub_topic: Optional[str] = Field(None, max_length=255)
    notes: Optional[str] = None
    language: Optional[ProgrammingLanguage] = None
    code_content: Optional[str] = Field(None, min_length=1)

class CodeSnippet(CodeSnippetBase):
    class Config:
        orm_mode = True
    
    id: uuid.UUID
    teacher_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

# Lesson Schemas
class LessonBase(BaseModel):
    course_id: uuid.UUID
    teacher_id: uuid.UUID
    title: str
    content: Optional[str] = None
    lesson_order: Optional[int] = None

class LessonCreate(LessonBase):
    pass

class LessonUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    content: Optional[str] = Field(None, min_length=1)
    department: Optional[Department] = None
    batch_year: Optional[int] = Field(None, ge=2020, le=2030)

class Lesson(LessonBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True

class CourseDevelopmentPlanBase(BaseModel):
    course_id: uuid.UUID
    teacher_id: uuid.UUID

class CourseDevelopmentPlan(CourseDevelopmentPlanBase):
    id: uuid.UUID
    cdp_filename: Optional[str] = None
    uploaded_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True

class CourseWithDetails(BaseModel):
    id: uuid.UUID
    course_code: str
    course_name: str
    description: Optional[str] = None
    credits: int
    created_at: datetime
    updated_at: datetime
    cdp: Optional[CourseDevelopmentPlan] = None
    lessons: List[Lesson] = []

    class Config:
        orm_mode = True

# Kanban Task Schemas
class KanbanTaskBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    status: TaskStatus = TaskStatus.TODO
    department: Department
    batch_year: int = Field(..., ge=2020, le=2030)
    priority: Optional[int] = Field(0, ge=0)
    due_date: Optional[datetime] = None

class KanbanTaskCreate(KanbanTaskBase):
    pass

class KanbanTaskUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    status: Optional[TaskStatus] = None
    department: Optional[Department] = None
    batch_year: Optional[int] = Field(None, ge=2020, le=2030)
    priority: Optional[int] = Field(None, ge=0)
    due_date: Optional[datetime] = None

class KanbanTask(KanbanTaskBase):
    class Config:
        orm_mode = True
    
    id: uuid.UUID
    teacher_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

# Class Schedule Schemas
class ClassScheduleBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    start_time: datetime
    end_time: datetime
    department: Department
    batch_year: int = Field(..., ge=2020, le=2030)
    location: Optional[str] = Field(None, max_length=255)

class ClassScheduleCreate(ClassScheduleBase):
    pass

class ClassScheduleUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    department: Optional[Department] = None
    batch_year: Optional[int] = Field(None, ge=2020, le=2030)
    location: Optional[str] = Field(None, max_length=255)

class ClassSchedule(ClassScheduleBase):
    class Config:
        orm_mode = True
    
    id: uuid.UUID
    teacher_id: uuid.UUID
    is_notified: bool
    created_at: datetime
    updated_at: datetime

# Diagram File Schemas
class DiagramFileUpload(BaseModel):
    filename: str = Field(..., min_length=1, max_length=255)

class DiagramFile(BaseModel):
    class Config:
        orm_mode = True
    
    id: uuid.UUID
    teacher_id: uuid.UUID
    filename: str
    content_type: str
    created_at: datetime
    updated_at: datetime
    
# NEW: Teacher-course relationship schemas
class TeacherCourseResponse(BaseModel):
    """Response schema for teacher with basic info (used in course teachers endpoint)"""
    id: str
    email: str
    employee_id: str
    first_name: str
    last_name: str
    department: str
    designation: str
    created_at: datetime
    is_active: bool

    class Config:
        orm_mode = True  # Pydantic v1 syntax

class CourseTeachersResponse(BaseModel):
    """Response schema for GET /courses/{course_id}/teachers"""
    course_id: str
    teachers: List[TeacherCourseResponse]

class TeacherCoursesResponse(BaseModel):
    """Response schema for GET /teachers/{teacher_id}/courses"""
    teacher_id: str
    courses: List[Course]

class UpdateTeacherCoursesRequest(BaseModel):
    """Request schema for updating teacher courses"""
    course_ids: List[str] = []
    
    @validator('course_ids')
    def validate_course_ids(cls, v):
        # Ensure all items are strings (UUIDs as strings)
        return [str(course_id) for course_id in v]

class UpdateTeacherCoursesResponse(BaseModel):
    """Response schema for updating teacher courses"""
    message: str
    teacher_id: str
    courses: List[str]

# NEW: Enhanced teacher profile schemas for course management
class TeacherProfileWithCourses(BaseModel):
    """Teacher profile with course details"""
    id: str
    user_id: str
    employee_id: str
    first_name: str
    last_name: str
    department: str
    designation: str
    courses: List[Course] = []  # Full course objects, not just IDs
    extra_data: dict = {}
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True

class TeacherProfileResponse(BaseModel):
    id: str
    user_id: str
    employee_id: str
    first_name: str
    last_name: str
    department: Optional[str] = None  # Make optional
    designation: Optional[str] = None  # Make optional
    courses: Optional[List[str]] = []  # Make optional with default
    extra_data: Optional[dict] = {}  # Make optional with default
    created_at: Optional[datetime] = None  # Make optional
    updated_at: Optional[datetime] = None  # Make optional

    class Config:
        orm_mode = True  # For Pydantic v1

class NoteFileBase(BaseModel):
    filename: str
    original_filename: str
    content_type: str
    file_size: int

class NoteFile(NoteFileBase):
    class Config:
        orm_mode = True
    
    id: uuid.UUID
    note_id: uuid.UUID
    created_at: datetime

class CourseInfo(BaseModel):
    class Config:
        orm_mode = True
    
    id: uuid.UUID
    course_code: str
    course_name: str
    description: Optional[str] = None
    credits: int

class UploadedNoteBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    course_id: uuid.UUID
    category: NoteCategory
    tags: Optional[List[str]] = Field(default_factory=list)
    is_public: bool = False

class UploadedNoteCreate(UploadedNoteBase):
    pass

class UploadedNoteUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    course_id: Optional[uuid.UUID] = None
    category: Optional[NoteCategory] = None
    tags: Optional[List[str]] = None
    is_public: Optional[bool] = None

class UploadedNote(UploadedNoteBase):
    class Config:
        orm_mode = True
    
    id: uuid.UUID
    teacher_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    course: Optional[CourseInfo] = None
    note_files: List[NoteFile] = []

class UploadedNoteWithStats(UploadedNote):
    file_count: int
    total_file_size: int

class BulkDeleteRequest(BaseModel):
    """
    Schema for bulk delete requests containing a list of note UUIDs
    """
    note_ids: List[uuid.UUID] = Field(
        ..., 
        description="List of note UUIDs to delete/download",
        example=[
            "3fa85f64-5717-4562-b3fc-2c963f66afa6", 
            "94a58f1b-e502-415c-aae2-ebc1df44f123",
            "f18bc59d-ff25-47eb-9270-d88bed31a3a4"
        ]
    )

    class Config:
        schema_extra = {
            "example": {
                "note_ids": [
                    "3fa85f64-5717-4562-b3fc-2c963f66afa6",
                    "94a58f1b-e502-415c-aae2-ebc1df44f123"
                ]
            }
        }

class BulkDownloadRequest(BaseModel):
    """
    Schema for bulk download requests containing a list of note UUIDs
    """
    note_ids: List[uuid.UUID] = Field(
        ..., 
        description="List of note UUIDs to download"
    )

class TeacherTimetableBase(BaseModel):
    teacher_id: uuid.UUID

class TeacherTimetable(TeacherTimetableBase):
    id: uuid.UUID
    timetable_filename: Optional[str] = None
    uploaded_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True

class TeacherTimetableResponse(BaseModel):
    id: uuid.UUID
    teacher_id: uuid.UUID
    timetable_filename: Optional[str] = None
    uploaded_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True

class CourseDevelopmentPlanResponse(BaseModel):
    id: uuid.UUID
    course_id: uuid.UUID
    teacher_id: uuid.UUID
    cdp_filename: Optional[str] = None
    uploaded_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True
