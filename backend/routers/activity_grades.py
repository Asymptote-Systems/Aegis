"""
Activity Grades Router
Handles grading operations for activities with draft/publish workflow
"""
from fastapi import APIRouter, HTTPException, Depends, status
from typing import List, Optional
from datetime import datetime
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, func
from uuid import UUID

from ..models import (
    User, Activity, ActivityGrade, ActivitySubmission, 
    ActivityAssignment, Notification, GradeStatus, NotificationType,
    UserRole
)
from ..schemas import (
    ActivityGradeCreate, ActivityGradeUpdate, ActivityGrade as ActivityGradeSchema,
    ActivityGradeWithStudent, GradingStatusResponse, NotificationCreate
)
from ..auth.dependencies import get_current_user
from ..database import get_db

router = APIRouter(prefix="/activity-grades", tags=["activity-grades"])


@router.post("/", response_model=ActivityGradeSchema, status_code=status.HTTP_201_CREATED)
async def create_grade(
    grade_data: ActivityGradeCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create or update a draft grade for a student's activity submission.
    Only accessible to teachers/admins.
    """
    # Check if user is authorized (teacher or admin)
    if current_user.role not in [UserRole.TEACHER, UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only teachers and admins can grade activities"
        )
    
    # Verify activity exists
    activity = db.query(Activity).filter(Activity.id == grade_data.activity_id).first()
    if not activity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Activity not found"
        )
    
    # Verify student exists
    student = db.query(User).filter(User.id == grade_data.student_id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found"
        )
    
    # Check if grade already exists
    existing_grade = db.query(ActivityGrade).filter(
        and_(
            ActivityGrade.student_id == grade_data.student_id,
            ActivityGrade.activity_id == grade_data.activity_id
        )
    ).first()
    
    if existing_grade:
        # Update existing grade
        existing_grade.score = grade_data.score
        existing_grade.max_score = grade_data.max_score
        existing_grade.comments = grade_data.comments
        existing_grade.submission_id = grade_data.submission_id
        existing_grade.graded_by = current_user.id
        existing_grade.graded_at = datetime.utcnow()
        db.commit()
        db.refresh(existing_grade)
        return existing_grade
    
    # Create new grade (always starts as draft)
    new_grade = ActivityGrade(
        student_id=grade_data.student_id,
        activity_id=grade_data.activity_id,
        submission_id=grade_data.submission_id,
        score=grade_data.score,
        max_score=grade_data.max_score,
        comments=grade_data.comments,
        graded_by=current_user.id,
        status=GradeStatus.DRAFT
    )
    
    db.add(new_grade)
    db.commit()
    db.refresh(new_grade)
    
    return new_grade


@router.get("/{grade_id}", response_model=ActivityGradeSchema)
async def get_grade(
    grade_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get a specific grade by ID.
    Students can only see their own published grades.
    Teachers/admins can see all grades.
    """
    grade = db.query(ActivityGrade).filter(ActivityGrade.id == grade_id).first()
    
    if not grade:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Grade not found"
        )
    
    # Authorization check
    if current_user.role == UserRole.STUDENT:
        # Students can only see their own published grades
        if grade.student_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only view your own grades"
            )
        if grade.status != GradeStatus.PUBLISHED:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Grade not available yet"
            )
    
    return grade


@router.put("/{grade_id}", response_model=ActivityGradeSchema)
async def update_grade(
    grade_id: UUID,
    grade_update: ActivityGradeUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update an existing grade.
    Only accessible to teachers/admins.
    Can update both draft and published grades (re-grading).
    """
    # Check authorization
    if current_user.role not in [UserRole.TEACHER, UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only teachers and admins can update grades"
        )
    
    grade = db.query(ActivityGrade).filter(ActivityGrade.id == grade_id).first()
    
    if not grade:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Grade not found"
        )
    
    # Update fields if provided
    if grade_update.score is not None:
        grade.score = grade_update.score
    if grade_update.max_score is not None:
        grade.max_score = grade_update.max_score
    if grade_update.comments is not None:
        grade.comments = grade_update.comments
    
    grade.graded_by = current_user.id
    grade.graded_at = datetime.utcnow()
    
    db.commit()
    db.refresh(grade)
    
    return grade


@router.delete("/{grade_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_grade(
    grade_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete a grade (only allowed for draft grades).
    Only accessible to teachers/admins.
    """
    if current_user.role not in [UserRole.TEACHER, UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only teachers and admins can delete grades"
        )
    
    grade = db.query(ActivityGrade).filter(ActivityGrade.id == grade_id).first()
    
    if not grade:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Grade not found"
        )
    
    if grade.status == GradeStatus.PUBLISHED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete published grades. Use update to modify instead."
        )
    
    db.delete(grade)
    db.commit()
    
    return None


@router.get("/activity/{activity_id}/grades", response_model=List[ActivityGradeWithStudent])
async def get_activity_grades(
    activity_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all grades for a specific activity.
    Only accessible to teachers/admins.
    Returns grades with student information.
    """
    if current_user.role not in [UserRole.TEACHER, UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only teachers and admins can view activity grades"
        )
    
    # Verify activity exists
    activity = db.query(Activity).filter(Activity.id == activity_id).first()
    if not activity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Activity not found"
        )
    
    # Get all grades with student information
    grades = db.query(ActivityGrade).options(
        joinedload(ActivityGrade.student).joinedload(User.student_profile)
    ).filter(ActivityGrade.activity_id == activity_id).all()
    
    # Format response with student info
    result = []
    for grade in grades:
        grade_dict = {
            "id": grade.id,
            "student_id": grade.student_id,
            "activity_id": grade.activity_id,
            "submission_id": grade.submission_id,
            "score": grade.score,
            "max_score": grade.max_score,
            "comments": grade.comments,
            "graded_by": grade.graded_by,
            "graded_at": grade.graded_at,
            "status": grade.status,
            "published_at": grade.published_at,
            "created_at": grade.created_at,
            "updated_at": grade.updated_at,
            "student_email": grade.student.email,
            "student_first_name": grade.student.student_profile.first_name if grade.student.student_profile else None,
            "student_last_name": grade.student.student_profile.last_name if grade.student.student_profile else None,
        }
        result.append(grade_dict)
    
    return result


@router.get("/student/my-grades", response_model=List[ActivityGradeSchema])
async def get_my_grades(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all published grades for the current student.
    Only shows grades with status = PUBLISHED.
    """
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This endpoint is only for students"
        )
    
    grades = db.query(ActivityGrade).filter(
        and_(
            ActivityGrade.student_id == current_user.id,
            ActivityGrade.status == GradeStatus.PUBLISHED
        )
    ).all()
    
    return grades


@router.get("/activity/{activity_id}/grading-status", response_model=GradingStatusResponse)
async def get_grading_status(
    activity_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Check grading status for an activity.
    Returns whether all assigned students have been graded.
    Only accessible to teachers/admins.
    """
    if current_user.role not in [UserRole.TEACHER, UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only teachers and admins can check grading status"
        )
    
    # Get total assigned students (count distinct student IDs to avoid duplicates)
    total_assigned = db.query(func.count(func.distinct(ActivityAssignment.student_id))).filter(
        ActivityAssignment.activity_id == activity_id
    ).scalar()
    
    # Get total graded students (count distinct student IDs with any grade status)
    total_graded = db.query(func.count(func.distinct(ActivityGrade.student_id))).filter(
        ActivityGrade.activity_id == activity_id
    ).scalar()
    
    # Check if any grades are published
    published_count = db.query(func.count(func.distinct(ActivityGrade.student_id))).filter(
        and_(
            ActivityGrade.activity_id == activity_id,
            ActivityGrade.status == GradeStatus.PUBLISHED
        )
    ).scalar()
    
    all_graded = total_graded >= total_assigned if total_assigned > 0 else False
    all_published = published_count >= total_assigned if total_assigned > 0 else False
    
    return {
        "activity_id": activity_id,
        "total_assigned_students": total_assigned,
        "total_graded_students": total_graded,
        "published_count": published_count,
        "all_graded": all_graded,
        "all_published": all_published,
        "can_publish": all_graded and not all_published
    }


@router.post("/activity/{activity_id}/publish-all", status_code=status.HTTP_200_OK)
async def publish_all_grades(
    activity_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Publish all draft grades for an activity.
    Only allowed if all assigned students have been graded.
    Creates notifications for students.
    Only accessible to teachers/admins.
    """
    if current_user.role not in [UserRole.TEACHER, UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only teachers and admins can publish grades"
        )
    
    # Verify activity exists
    activity = db.query(Activity).filter(Activity.id == activity_id).first()
    if not activity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Activity not found"
        )
    
    # Check if all students are graded
    grading_status = await get_grading_status(activity_id, current_user, db)
    
    if not grading_status["can_publish"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot publish. Only {grading_status['total_graded_students']} out of {grading_status['total_assigned_students']} students have been graded."
        )
    
    # Get all draft grades for this activity
    draft_grades = db.query(ActivityGrade).filter(
        and_(
            ActivityGrade.activity_id == activity_id,
            ActivityGrade.status == GradeStatus.DRAFT
        )
    ).all()
    
    published_count = 0
    notification_count = 0
    
    # Publish all draft grades
    for grade in draft_grades:
        grade.status = GradeStatus.PUBLISHED
        grade.published_at = datetime.utcnow()
        published_count += 1
        
        # Create notification for student
        notification = Notification(
            user_id=grade.student_id,
            type=NotificationType.GRADE_PUBLISHED,
            title=f"Grade Published: {activity.title}",
            message=f"Your grade for '{activity.title}' has been published. Score: {grade.score}/{grade.max_score}",
            activity_id=activity_id,
            grade_id=grade.id
        )
        db.add(notification)
        notification_count += 1
    
    db.commit()
    
    return {
        "message": f"Successfully published {published_count} grades",
        "published_count": published_count,
        "notifications_created": notification_count,
        "activity_id": str(activity_id),
        "activity_title": activity.title
    }


@router.post("/cleanup-duplicate-assignments", status_code=status.HTTP_200_OK)
async def cleanup_duplicate_assignments(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Admin endpoint to clean up duplicate activity assignments.
    Keeps only the oldest assignment for each (activity_id, student_id) pair.
    """
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can run cleanup operations"
        )
    
    # Find duplicates using SQLAlchemy
    from sqlalchemy import text
    
    # Get count of duplicates before cleanup
    check_query = text("""
        SELECT COUNT(*) FROM (
            SELECT activity_id, student_id, COUNT(*) as count
            FROM activity_assignments
            GROUP BY activity_id, student_id
            HAVING COUNT(*) > 1
        ) AS duplicates;
    """)
    
    duplicate_pairs = db.execute(check_query).scalar()
    
    if duplicate_pairs == 0:
        return {
            "message": "No duplicate assignments found",
            "duplicates_found": 0,
            "records_deleted": 0
        }
    
    # Delete duplicates, keeping oldest
    cleanup_query = text("""
        DELETE FROM activity_assignments
        WHERE id IN (
            SELECT id
            FROM (
                SELECT id,
                       ROW_NUMBER() OVER (
                           PARTITION BY activity_id, student_id 
                           ORDER BY assigned_at ASC, created_at ASC
                       ) AS rn
                FROM activity_assignments
            ) t
            WHERE t.rn > 1
        );
    """)
    
    result = db.execute(cleanup_query)
    deleted_count = result.rowcount
    db.commit()
    
    return {
        "message": f"Successfully cleaned up {deleted_count} duplicate assignment(s)",
        "duplicates_found": duplicate_pairs,
        "records_deleted": deleted_count
    }
