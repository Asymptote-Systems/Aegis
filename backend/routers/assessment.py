from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..auth.dependencies import get_current_user
from ..schemas_assessment import (
    AssessmentSubmission, ActivityOverview, ClassPerformance,
    DetailedStudentSubmission, StudentSubmissionSummary, QuestionAnalytics
)
from ..models_assessment import AssessmentSubmission as AssessmentSubmissionModel
from ..models import User, Activity, Course
from datetime import datetime
import uuid
from sqlalchemy import and_

router = APIRouter(prefix="/assessments", tags=["assessments"])

@router.post("/activities/{activity_id}/submit")
async def submit_assessment(
    activity_id: str,
    submission: AssessmentSubmission,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        activity_uuid = uuid.UUID(activity_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid activity ID format"
        )

    # Verify activity exists and student has access
    activity = db.query(Activity).filter(Activity.id == activity_uuid).first()
    if not activity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Activity not found"
        )

    # Verify the course exists if class_id is provided
    class_id = submission.assessment_data.class_id
    if class_id:
        course = db.query(Course).filter(Course.id == class_id).first()
        if not course:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Course not found"
            )

    # Create new submission record
    try:
        db_submission = AssessmentSubmissionModel(
            id=uuid.uuid4(),
            activity_id=activity_uuid,
            student_id=current_user.id,
            class_id=class_id,
            submission_timestamp=datetime.utcnow(),
            questions=submission.student_work.dict()["questions"],
            total_time_spent=submission.submission_analytics.total_time_spent,
            question_completion_rate=submission.submission_analytics.question_completion_rate,
            started_at=submission.submission_analytics.activity_completion.started_at,
            completed_at=submission.submission_analytics.activity_completion.completed_at,
            completion_status=submission.submission_analytics.activity_completion.completion_status
        )

        # Add to database and commit
        db.add(db_submission)
        db.commit()
        db.refresh(db_submission)

        return {"status": "success", "submission_id": str(db_submission.id)}

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create submission: {str(e)}"
        )

    try:
        db.add(db_submission)
        db.commit()
        db.refresh(db_submission)
        return {"message": "Submission successful", "submission_id": db_submission.id}
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save submission: {str(e)}"
        )

@router.get("/activities/{activity_id}/overview", response_model=ActivityOverview)
async def get_activity_overview(
    activity_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Verify user has permission to view activity data
    if current_user.role not in ["teacher", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view activity overview"
        )
    
    submissions = db.query(AssessmentSubmissionModel).filter(
        AssessmentSubmissionModel.activity_id == activity_id
    ).all()
    
    if not submissions:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No submissions found for this activity"
        )
    
    # Calculate overview statistics
    total_submissions = len(submissions)
    avg_completion_rate = sum(s.question_completion_rate for s in submissions) / total_submissions
    submission_timeline = [s.submission_timestamp for s in submissions]
    
    # Calculate question statistics
    question_stats = calculate_question_stats(submissions)
    
    return ActivityOverview(
        activity_id=activity_id,
        title=submissions[0].activity.title,
        total_submissions=total_submissions,
        average_completion_rate=avg_completion_rate,
        submission_timeline=submission_timeline,
        question_stats=question_stats
    )

@router.get("/activities/{activity_id}/course/{class_id}", response_model=ClassPerformance)
async def get_class_performance(
    activity_id: uuid.UUID,
    class_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Verify user has permission to view class data
    if current_user.role not in ["teacher", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view course performance"
        )
    
    submissions = db.query(AssessmentSubmissionModel).filter(
        AssessmentSubmissionModel.activity_id == activity_id,
        AssessmentSubmissionModel.class_id == class_id
    ).all()
    
    course = db.query(Course).filter(Course.id == class_id).first()
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    
    student_submissions = [
        create_student_submission_summary(submission)
        for submission in submissions
    ]
    
    # Get enrolled students through course enrollments
    enrolled_students = [enrollment.student for enrollment in course.enrollments]
    
    return ClassPerformance(
        class_id=class_id,
        class_name=course.title,
        student_count=len(enrolled_students),
        submission_count=len(submissions),
        average_completion_rate=calculate_average_completion_rate(submissions),
        student_submissions=student_submissions
    )

@router.get("/activities/{activity_id}/students/{student_id}", response_model=DetailedStudentSubmission)
async def get_student_submission(
    activity_id: uuid.UUID,
    student_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Verify user has permission to view student data
    if current_user.role not in ["teacher", "admin"] and current_user.id != student_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this submission"
        )
    
    submission = db.query(AssessmentSubmissionModel).filter(
        AssessmentSubmissionModel.activity_id == activity_id,
        AssessmentSubmissionModel.student_id == student_id
    ).first()
    
    if not submission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Submission not found"
        )
    
    student = db.query(User).filter(User.id == student_id).first()
    
    return DetailedStudentSubmission(
        student_id=student_id,
        student_name=f"{student.first_name} {student.last_name}",
        submission_details=submission
    )

@router.get("/activities/{activity_id}/questions/{question_number}", response_model=List[DetailedStudentSubmission])
async def get_question_submissions(
    activity_id: uuid.UUID,
    question_number: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Verify user has permission to view submissions
    if current_user.role not in ["teacher", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view submissions"
        )
    
    submissions = db.query(AssessmentSubmissionModel).filter(
        AssessmentSubmissionModel.activity_id == activity_id
    ).all()
    
    # Filter submissions for specific question
    question_submissions = []
    for submission in submissions:
        question_data = next(
            (q for q in submission.questions if q["number"] == question_number),
            None
        )
        if question_data:
            student = db.query(User).filter(User.id == submission.student_id).first()
            question_submissions.append(
                DetailedStudentSubmission(
                    student_id=student.id,
                    student_name=f"{student.first_name} {student.last_name}",
                    submission_details=submission
                )
            )
    
    return question_submissions

# Helper functions for statistics calculation
def calculate_question_stats(submissions: List[AssessmentSubmissionModel]) -> List[QuestionAnalytics]:
    if not submissions:
        return []
    
    # Get all unique question numbers
    question_numbers = set()
    for sub in submissions:
        for q in sub.questions:
            question_numbers.add(q["number"])
    
    stats = []
    for qnum in sorted(question_numbers):
        # Get all submissions for this question
        q_submissions = []
        total_time = 0
        languages = {}
        
        for sub in submissions:
            q_sub = next((q for q in sub.questions if q["number"] == qnum), None)
            if q_sub:
                q_submissions.append(q_sub)
                total_time += q_sub["progress_tracking"]["time_spent"]
                lang = q_sub["submission"]["language"]
                languages[lang] = languages.get(lang, 0) + 1
        
        # Calculate statistics
        completion_rate = len(q_submissions) / len(submissions) * 100
        avg_time = total_time / len(q_submissions) if q_submissions else 0
        
        # Calculate language usage stats
        lang_stats = []
        total_lang_count = sum(languages.values())
        for lang, count in languages.items():
            percentage = (count / total_lang_count) * 100
            lang_stats.append(LanguageUsageStats(
                language=lang,
                count=count,
                percentage=percentage
            ))
        
        stats.append(QuestionAnalytics(
            question_number=qnum,
            title=q_submissions[0]["title"] if q_submissions else f"Question {qnum}",
            completion_rate=completion_rate,
            average_time_spent=avg_time,
            submission_count=len(q_submissions),
            languages_used=lang_stats
        ))
    
    return stats

def calculate_average_completion_rate(submissions: List[AssessmentSubmissionModel]) -> float:
    if not submissions:
        return 0.0
    
    total_rate = sum(sub.question_completion_rate for sub in submissions)
    return total_rate / len(submissions)

def create_student_submission_summary(submission: AssessmentSubmissionModel) -> StudentSubmissionSummary:
    return StudentSubmissionSummary(
        student_id=submission.student_id,
        student_name=f"{submission.student.first_name} {submission.student.last_name}",
        completion_rate=submission.question_completion_rate,
        total_time_spent=submission.total_time_spent,
        submission_timestamp=submission.submission_timestamp,
        status=submission.completion_status
    )