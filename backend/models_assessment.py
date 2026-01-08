from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Float, JSON, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import uuid
from .database import Base
from enum import Enum as PyEnum

class SubmissionStatus(str, PyEnum):
    COMPLETED = "completed"
    PARTIAL = "partial"
    ATTEMPTED = "attempted"

class CompletionStatus(str, PyEnum):
    COMPLETED = "completed"
    IN_PROGRESS = "in_progress"
    EXPIRED = "expired"

class AssessmentSubmission(Base):
    __tablename__ = "assessment_submissions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    activity_id = Column(UUID(as_uuid=True), ForeignKey("activities.id"))
    student_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    class_id = Column(UUID(as_uuid=True), ForeignKey("courses.id"), nullable=True)
    submission_timestamp = Column(DateTime, default=datetime.utcnow)
    
    # Student work data
    questions = Column(JSON)  # List of QuestionSubmission
    
    # Analytics
    total_time_spent = Column(Integer)  # seconds
    question_completion_rate = Column(Float)
    
    # Activity completion data
    started_at = Column(DateTime)
    completed_at = Column(DateTime, nullable=True)
    completion_status = Column(Enum(CompletionStatus))
    
    # Relationships
    activity = relationship("Activity", back_populates="assessment_submissions")
    student = relationship("User", back_populates="assessment_submissions")
    course = relationship("Course", back_populates="assessment_submissions")

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class QuestionAnalytics(Base):
    __tablename__ = "question_analytics"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    activity_id = Column(UUID(as_uuid=True), ForeignKey("activities.id"))
    question_number = Column(Integer)
    completion_rate = Column(Float)
    average_time_spent = Column(Float)
    submission_count = Column(Integer)
    languages_used = Column(JSON)  # List of LanguageUsageStats
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    activity = relationship("Activity", back_populates="question_analytics")