from typing import List, Optional, Dict
from pydantic import BaseModel
from datetime import datetime
from uuid import UUID
from enum import Enum

class SubmissionStatus(str, Enum):
    COMPLETED = "completed"
    PARTIAL = "partial"
    ATTEMPTED = "attempted"

class CompletionStatus(str, Enum):
    COMPLETED = "completed"
    IN_PROGRESS = "in_progress"
    EXPIRED = "expired"

class CodeSubmission(BaseModel):
    code: str
    language: str
    context: str

class ProgressTracking(BaseModel):
    status: SubmissionStatus
    time_spent: int  # in seconds
    save_count: int
    last_modified: datetime

class QuestionSubmission(BaseModel):
    number: int
    title: str
    submission: CodeSubmission
    progress_tracking: ProgressTracking

class ActivityCompletionData(BaseModel):
    started_at: datetime
    completed_at: Optional[datetime]
    completion_status: CompletionStatus

class SubmissionAnalytics(BaseModel):
    total_time_spent: int  # in seconds
    question_completion_rate: float  # percentage 0-100
    activity_completion: ActivityCompletionData

class AssessmentData(BaseModel):
    activity_id: UUID
    student_id: UUID
    class_id: UUID
    submission_timestamp: datetime

class StudentWork(BaseModel):
    questions: List[QuestionSubmission]

class AssessmentSubmission(BaseModel):
    assessment_data: AssessmentData
    student_work: StudentWork
    submission_analytics: SubmissionAnalytics

    class Config:
        orm_mode = True

# Response models for teacher views
class StudentSubmissionSummary(BaseModel):
    student_id: UUID
    student_name: str
    completion_rate: float
    total_time_spent: int
    submission_timestamp: datetime
    status: CompletionStatus

class LanguageUsageStats(BaseModel):
    language: str
    count: int
    percentage: float

class QuestionAnalytics(BaseModel):
    question_number: int
    title: str
    completion_rate: float
    average_time_spent: float
    submission_count: int
    languages_used: List[LanguageUsageStats]

class ActivityOverview(BaseModel):
    activity_id: UUID
    title: str
    total_submissions: int
    average_completion_rate: float
    submission_timeline: List[datetime]
    question_stats: List[QuestionAnalytics]

class ClassPerformance(BaseModel):
    class_id: UUID
    class_name: str
    student_count: int
    submission_count: int
    average_completion_rate: float
    student_submissions: List[StudentSubmissionSummary]

class DetailedStudentSubmission(BaseModel):
    student_id: UUID
    student_name: str
    submission_details: AssessmentSubmission