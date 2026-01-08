# activities.py - Clean and organized activity endpoints
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
from ..models import User, Activity, ActivityAssignment, ActivitySubmission, ActivityQuestion
from ..auth.dependencies import get_current_user
from sqlalchemy.orm import Session, joinedload
from ..database import get_db
import uuid
import json

router = APIRouter(
    tags=["Activities Management"]
)

# ==================== PYDANTIC SCHEMAS ====================

class ActivityCreate(BaseModel):
    title: str
    description: str
    start_date: datetime
    end_date: datetime
    total_marks: float
    pdf_url: str

class QuestionSubmission(BaseModel):
    question_number: str
    title: str
    context: str
    language: str
    code: str

class ActivitySubmissionCreate(BaseModel):
    activity_id: str
    student_id: Optional[str] = None
    questions: List[QuestionSubmission]

# ==================== HELPER FUNCTIONS ====================

def convert_to_uuid(value, field_name="ID"):
    """Convert string to UUID with proper error handling"""
    if isinstance(value, uuid.UUID):
        return value
    try:
        return uuid.UUID(str(value))
    except (ValueError, TypeError, AttributeError):
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid {field_name} format: {value}. Must be a valid UUID."
        )

def get_activity_max_score(activity) -> float:
    """Get max_score from activity with fallback"""
    max_score = 100.0
    possible_score_fields = ['total_marks', 'max_marks', 'total_score', 'max_score', 'marks', 'score']
    
    for field in possible_score_fields:
        if hasattr(activity, field):
            field_value = getattr(activity, field)
            if field_value is not None:
                return float(field_value)
    
    return max_score

# ==================== ACTIVITY CRUD ENDPOINTS ====================

@router.post("/activities", summary="Create a new activity")
async def create_activity(
    activity: ActivityCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new activity sheet for students. **Teacher only endpoint**"""
    try:
        if current_user.role != "teacher":
            raise HTTPException(status_code=403, detail="Only teachers can create activities")

        new_activity = Activity(
            id=uuid.uuid4(),
            title=activity.title,
            description=activity.description,
            start_date=activity.start_date,
            end_date=activity.end_date,
            total_marks=activity.total_marks,
            pdf_url=activity.pdf_url,
            created_by=current_user.id,
            status="active"
        )

        db.add(new_activity)
        db.commit()
        db.refresh(new_activity)

        return {
            "id": str(new_activity.id),
            "title": new_activity.title,
            "message": "Activity created successfully"
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/activities", summary="List all activities")
async def list_activities(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get list of activities. Teachers see their own, Students see active activities."""
    try:
        if current_user.role == "teacher":
            activities = db.query(Activity).filter(Activity.created_by == current_user.id).all()
        else:
            activities = db.query(Activity).filter(Activity.status == "active").all()

        result = []
        for activity in activities:
            max_score = get_activity_max_score(activity)
            result.append({
                "id": str(activity.id),
                "title": activity.title,
                "description": activity.description,
                "start_date": activity.start_date,
                "end_date": activity.end_date,
                "total_marks": max_score,
                "status": activity.status,
                "created_at": activity.created_at
            })

        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/activities/{activity_id}", summary="Get activity details")
async def get_activity(
    activity_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get detailed information about a specific activity."""
    activity_uuid = convert_to_uuid(activity_id, "activity ID")
    
    activity = db.query(Activity).filter(Activity.id == activity_uuid).first()
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")

    max_score = get_activity_max_score(activity)

    return {
        "id": str(activity.id),
        "title": activity.title,
        "description": activity.description,
        "start_date": activity.start_date,
        "end_date": activity.end_date,
        "total_marks": max_score,
        "pdf_url": activity.pdf_url,
        "status": activity.status,
        "created_by": str(activity.created_by),
        "created_at": activity.created_at
    }

# ==================== SUBMISSION ENDPOINTS ====================

@router.post("/submit", summary="Submit an activity")
async def submit_activity_universal(
    submission: ActivitySubmissionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Submit student's work for an activity. Prevents duplicate submissions."""
    try:
        print(f"\n🚀 SUBMISSION STARTED - Activity: {submission.activity_id}, User: {current_user.email}")

        activity_uuid = convert_to_uuid(submission.activity_id, "activity ID")
        activity = db.query(Activity).filter(Activity.id == activity_uuid).first()
        if not activity:
            raise HTTPException(status_code=404, detail="Activity not found")

        student_uuid = convert_to_uuid(current_user.id, "student ID")
        max_score = get_activity_max_score(activity)

        # Check for existing submission
        existing_submission = db.query(ActivitySubmission).filter(
            ActivitySubmission.activity_id == activity_uuid,
            ActivitySubmission.student_id == student_uuid
        ).first()

        if existing_submission:
            raise HTTPException(
                status_code=409, 
                detail=f"You have already submitted this activity on {existing_submission.submitted_at}"
            )

        # Find or create activity assignment
        activity_assignment = db.query(ActivityAssignment).filter(
            ActivityAssignment.activity_id == activity_uuid,
            ActivityAssignment.student_id == student_uuid
        ).first()

        if not activity_assignment:
            from sqlalchemy import inspect
            assignment_inspector = inspect(ActivityAssignment)
            assignment_columns = [col.name for col in assignment_inspector.columns]
            
            assignment_data = {
                'id': uuid.uuid4(),
                'activity_id': activity_uuid,
                'student_id': student_uuid,
            }
            
            current_time = datetime.utcnow()
            optional_fields = {
                'assigned_at': current_time,
                'created_at': current_time,
                'updated_at': current_time,
                'score': 0,
                'extra_data': '{}',
                'has_final_submission': False
            }
            
            for field, value in optional_fields.items():
                if field in assignment_columns:
                    assignment_data[field] = value
            
            for status_value in ['ASSIGNED', 'PENDING', 'ACTIVE', None]:
                try:
                    test_data = assignment_data.copy()
                    if status_value and 'status' in assignment_columns:
                        test_data['status'] = status_value
                    
                    activity_assignment = ActivityAssignment(**test_data)
                    db.add(activity_assignment)
                    db.flush()
                    break
                except:
                    db.rollback()
                    continue

        # Prepare submission data
        questions_data = [{
            "question_number": str(q.question_number),
            "title": str(q.title),
            "context": str(q.context),
            "language": str(q.language),
            "code": str(q.code)
        } for q in submission.questions]

        # Create submission
        new_submission = ActivitySubmission(
            id=uuid.uuid4(),
            activity_assignment_id=activity_assignment.id,
            activity_id=activity_uuid,
            student_id=student_uuid,
            submission_type='COMPLETION',
            submission_data=json.dumps({"questions": questions_data}),
            score=0,
            max_score=max_score,
            is_evaluated=False,
            submitted_at=datetime.utcnow(),
            attempt_number=1,
            extra_data=json.dumps({})
        )

        db.add(new_submission)
        db.flush()

        # Questions are already stored in submission_data JSON
        # No need to create separate ActivityQuestion records for submissions
        
        db.commit()
        db.refresh(new_submission)
        
        print(f"✅ SUBMISSION SUCCESS - ID: {new_submission.id}")

        return {
            "message": "Activity submitted successfully",
            "submission_id": str(new_submission.id),
            "assignment_id": str(activity_assignment.id),
            "student_id": str(student_uuid),
            "activity_id": str(activity_uuid),
            "questions_count": len(submission.questions),
            "max_score": max_score,
            "status": "success"
        }

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        print(f"💥 SUBMISSION ERROR: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Submission failed: {str(e)}")

@router.get("/activities/{activity_id}/my-submission-status", summary="Check submission status")
async def check_my_submission_status(
    activity_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Check if the current user has already submitted this activity."""
    try:
        activity_uuid = convert_to_uuid(activity_id, "activity ID")
        student_uuid = convert_to_uuid(current_user.id, "student ID")
        
        existing_submission = db.query(ActivitySubmission).filter(
            ActivitySubmission.activity_id == activity_uuid,
            ActivitySubmission.student_id == student_uuid
        ).first()
        
        return {
            "activity_id": str(activity_uuid),
            "student_id": str(student_uuid),
            "student_email": current_user.email,
            "has_submitted": existing_submission is not None,
            "submission_id": str(existing_submission.id) if existing_submission else None,
            "submission_time": existing_submission.submitted_at if existing_submission else None,
            "score": existing_submission.score if existing_submission else None
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/activities/{activity_id}/submissions", summary="Get activity submissions")
async def get_submissions(
    activity_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all submissions for an activity. Teachers see all, Students see only their own."""
    try:
        activity_uuid = convert_to_uuid(activity_id, "activity ID")
        
        activity = db.query(Activity).filter(Activity.id == activity_uuid).first()
        if not activity:
            raise HTTPException(status_code=404, detail="Activity not found")

        query = db.query(ActivitySubmission).filter(ActivitySubmission.activity_id == activity_uuid)
        
        if current_user.role == "student":
            user_uuid = convert_to_uuid(current_user.id, "user ID")
            query = query.filter(ActivitySubmission.student_id == user_uuid)

        submissions = query.all()

        result = []
        for submission in submissions:
            student = db.query(User).options(joinedload(User.student_profile)).filter(User.id == submission.student_id).first()
            
            student_name = 'Unknown'
            student_email = None
            if student:
                student_email = student.email
                if hasattr(student, 'student_profile') and student.student_profile:
                    first_name = getattr(student.student_profile, 'first_name', '')
                    last_name = getattr(student.student_profile, 'last_name', '')
                    if first_name and last_name:
                        student_name = f"{first_name} {last_name}"
            
            questions = []
            try:
                submission_data = json.loads(submission.submission_data or '{}')
                questions = submission_data.get('questions', [])
            except:
                pass

            result.append({
                "submission_id": str(submission.id),
                "student_id": str(submission.student_id),
                "user_id": str(submission.student_id),
                "student_name": student_name,
                "student_email": student_email,
                "submission_time": submission.submitted_at,
                "score": submission.score,
                "max_score": submission.max_score,
                "is_evaluated": submission.is_evaluated,
                "questions": questions
            })

        return {
            "activity_id": str(activity_uuid),
            "activity_title": activity.title,
            "submissions": result
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/activities/{activity_id}/submissions/{submission_id}", summary="Delete a submission")
async def delete_submission(
    activity_id: str,
    submission_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a submission. Teachers/Admins can delete any, Students only their own."""
    try:
        if current_user.role not in ['teacher', 'admin']:
            submission_uuid = convert_to_uuid(submission_id, "submission ID")
            submission = db.query(ActivitySubmission).filter(ActivitySubmission.id == submission_uuid).first()
            
            if not submission or str(submission.student_id) != str(current_user.id):
                raise HTTPException(status_code=403, detail="You can only delete your own submissions")
        
        submission_uuid = convert_to_uuid(submission_id, "submission ID")
        submission = db.query(ActivitySubmission).filter(ActivitySubmission.id == submission_uuid).first()
        
        if not submission:
            raise HTTPException(status_code=404, detail="Submission not found")
        
        student_email = "Unknown"
        student = db.query(User).filter(User.id == submission.student_id).first()
        if student:
            student_email = student.email
        
        db.delete(submission)
        db.commit()
        
        print(f"✅ Deleted submission {submission_id} by {student_email}")
        
        return {
            "message": "Submission deleted successfully",
            "submission_id": str(submission_uuid),
            "student_email": student_email
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
