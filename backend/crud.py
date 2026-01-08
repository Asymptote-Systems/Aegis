"crud.py"
"""
CRUD operations for Online Exam System
Generated from SQLAlchemy models
"""

from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc, func
from datetime import datetime, timedelta
from typing import List, Optional
from uuid import UUID
import uuid
from . import models
from . import schemas
from backend.auth.passwords import hash_password

# User CRUD operations
def get_user(db: Session, id: UUID) -> Optional[models.User]:
    return db.query(models.User).filter(models.User.id == id).first()

def get_users(db: Session, skip: int = 0, limit: int = 100) -> List[models.User]:
    return db.query(models.User).offset(skip).limit(limit).all()

def create_user(db: Session, obj_in: schemas.UserCreate) -> models.User:
    db_user = models.User(
        email=obj_in.email,
        role=obj_in.role,
        is_active=obj_in.is_active,
        extra_data=obj_in.extra_data,
        password_hash=hash_password(obj_in.password)  # hash here
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def update_user(db: Session, db_obj: models.User, obj_in: schemas.UserUpdate) -> models.User:
    update_data = obj_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_obj, field, value)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def delete_user(db: Session, id: UUID) -> Optional[models.User]:
    db_obj = db.query(models.User).filter(models.User.id == id).first()
    if db_obj:
        db.delete(db_obj)
        db.commit()
    return db_obj

# UserSession CRUD operations
def get_user_session(db: Session, id: UUID) -> Optional[models.UserSession]:
    return db.query(models.UserSession).filter(models.UserSession.id == id).first()

def get_user_sessions(db: Session, skip: int = 0, limit: int = 100) -> List[models.UserSession]:
    return db.query(models.UserSession).offset(skip).limit(limit).all()

def create_user_session(db: Session, obj_in: schemas.UserSessionCreate) -> models.UserSession:
    db_obj = models.UserSession(**obj_in.dict())
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def update_user_session(db: Session, db_obj: models.UserSession, obj_in: schemas.UserSessionUpdate) -> models.UserSession:
    update_data = obj_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_obj, field, value)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def delete_user_session(db: Session, id: UUID) -> Optional[models.UserSession]:
    db_obj = db.query(models.UserSession).filter(models.UserSession.id == id).first()
    if db_obj:
        db.delete(db_obj)
        db.commit()
    return db_obj

# UserToken CRUD operations
def get_user_token(db: Session, id: UUID) -> Optional[models.UserToken]:
    return db.query(models.UserToken).filter(models.UserToken.id == id).first()

def get_user_tokens(db: Session, skip: int = 0, limit: int = 100) -> List[models.UserToken]:
    return db.query(models.UserToken).offset(skip).limit(limit).all()

def create_user_token(db: Session, obj_in: schemas.UserTokenCreate) -> models.UserToken:
    db_obj = models.UserToken(**obj_in.dict())
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def update_user_token(db: Session, db_obj: models.UserToken, obj_in: schemas.UserTokenUpdate) -> models.UserToken:
    update_data = obj_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_obj, field, value)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def delete_user_token(db: Session, id: UUID) -> Optional[models.UserToken]:
    db_obj = db.query(models.UserToken).filter(models.UserToken.id == id).first()
    if db_obj:
        db.delete(db_obj)
        db.commit()
    return db_obj

# StudentProfile CRUD operations
def get_student_profile(db: Session, id: UUID) -> Optional[models.StudentProfile]:
    return db.query(models.StudentProfile).filter(models.StudentProfile.id == id).first()

def get_student_profiles(db: Session, skip: int = 0, limit: int = 100) -> List[models.StudentProfile]:
    return db.query(models.StudentProfile).offset(skip).limit(limit).all()

def create_student_profile(db: Session, obj_in: schemas.StudentProfileCreate) -> models.StudentProfile:
    db_obj = models.StudentProfile(**obj_in.dict())
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def update_student_profile(db: Session, db_obj: models.StudentProfile, obj_in: schemas.StudentProfileUpdate) -> models.StudentProfile:
    update_data = obj_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_obj, field, value)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def delete_student_profile(db: Session, id: UUID) -> Optional[models.StudentProfile]:
    db_obj = db.query(models.StudentProfile).filter(models.StudentProfile.id == id).first()
    if db_obj:
        db.delete(db_obj)
        db.commit()
    return db_obj

def get_student_profile_by_user_id(db: Session, user_id: UUID) -> Optional[models.StudentProfile]:
    return db.query(models.StudentProfile).filter(models.StudentProfile.user_id == user_id).first()

# StudentExamQuestion CRUD operations
def get_student_exam_question(db: Session, id: UUID) -> Optional[models.StudentExamQuestion]:
    return db.query(models.StudentExamQuestion).filter(models.StudentExamQuestion.id == id).first()

def get_student_exam_questions(db: Session, skip: int = 0, limit: int = 100) -> List[models.StudentExamQuestion]:
    return db.query(models.StudentExamQuestion).offset(skip).limit(limit).all()

def create_student_exam_question(db: Session, obj_in: schemas.StudentExamQuestionCreate) -> models.StudentExamQuestion:
    db_obj = models.StudentExamQuestion(**obj_in.dict())
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def update_student_exam_question(db: Session, db_obj: models.StudentExamQuestion, obj_in: schemas.StudentExamQuestionUpdate) -> models.StudentExamQuestion:
    update_data = obj_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_obj, field, value)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def delete_student_exam_question(db: Session, id: UUID) -> Optional[models.StudentExamQuestion]:
    db_obj = db.query(models.StudentExamQuestion).filter(models.StudentExamQuestion.id == id).first()
    if db_obj:
        db.delete(db_obj)
        db.commit()
    return db_obj

# TeacherProfile CRUD operations
def get_teacher_profile(db: Session, id: UUID) -> Optional[models.TeacherProfile]:
    return db.query(models.TeacherProfile).filter(models.TeacherProfile.user_id == id).first()

def get_teacher_profiles(db: Session, skip: int = 0, limit: int = 100) -> List[models.TeacherProfile]:
    return db.query(models.TeacherProfile).offset(skip).limit(limit).all()

def create_teacher_profile(db: Session, obj_in: schemas.TeacherProfileCreate) -> models.TeacherProfile:
    db_obj = models.TeacherProfile(**obj_in.dict())
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def update_teacher_profile(db: Session, db_obj: models.TeacherProfile, obj_in: schemas.TeacherProfileUpdate) -> models.TeacherProfile:
    update_data = obj_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_obj, field, value)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def delete_teacher_profile(db: Session, id: UUID) -> Optional[models.TeacherProfile]:
    db_obj = db.query(models.TeacherProfile).filter(models.TeacherProfile.id == id).first()
    if db_obj:
        db.delete(db_obj)
        db.commit()
    return db_obj

# QuestionCategory CRUD operations
def get_question_category(db: Session, id: UUID) -> Optional[models.QuestionCategory]:
    return db.query(models.QuestionCategory).filter(models.QuestionCategory.id == id).first()

def get_question_categories(db: Session, skip: int = 0, limit: int = 100) -> List[models.QuestionCategory]:
    return db.query(models.QuestionCategory).offset(skip).limit(limit).all()

def create_question_category(db: Session, obj_in: schemas.QuestionCategoryCreate) -> models.QuestionCategory:
    db_obj = models.QuestionCategory(**obj_in.dict())
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def update_question_category(db: Session, db_obj: models.QuestionCategory, obj_in: schemas.QuestionCategoryUpdate) -> models.QuestionCategory:
    update_data = obj_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_obj, field, value)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def delete_question_category(db: Session, id: UUID) -> Optional[models.QuestionCategory]:
    db_obj = db.query(models.QuestionCategory).filter(models.QuestionCategory.id == id).first()
    if db_obj:
        db.delete(db_obj)
        db.commit()
    return db_obj

# Question CRUD operations
def get_question(db: Session, id: UUID) -> Optional[models.Question]:
    return db.query(models.Question).filter(models.Question.id == id).first()

# Question CRUD operations - UPDATE this function
def get_questions(db: Session, skip: int = 0, limit: int = 100, has_solution: Optional[bool] = None) -> List[models.Question]:
    query = db.query(models.Question)
    
    # Add filter for has_solution if specified
    if has_solution is not None:
        query = query.filter(models.Question.has_solution == has_solution)
    
    return query.offset(skip).limit(limit).all()

# Update the create_question function in crud.py
def create_question(db: Session, obj_in: schemas.QuestionCreate, user_id: UUID) -> models.Question:
    # Extract PDF data before creating the object
    pdf_data = getattr(obj_in, 'pdf_data', None)
    solution_pdf_data = getattr(obj_in, 'solution_pdf_data', None)
    
    obj_dict = obj_in.dict(exclude={'pdf_data', 'solution_pdf_data'})
    db_obj = models.Question(**obj_dict, created_by=user_id)
    
    # Set PDF data if provided
    if pdf_data:
        db_obj.pdf_statement = pdf_data
    
    # Set solution PDF data if provided
    if solution_pdf_data:
        db_obj.solution_pdf = solution_pdf_data

    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

# Update the update_question function in crud.py
def update_question(db: Session, db_obj: models.Question, obj_in: schemas.QuestionUpdate) -> models.Question:
    pdf_data = getattr(obj_in, 'pdf_data', None)
    solution_pdf_data = getattr(obj_in, 'solution_pdf_data', None)
    
    update_data = obj_in.dict(exclude_unset=True, exclude={'pdf_data', 'solution_pdf_data'})
    
    for field, value in update_data.items():
        setattr(db_obj, field, value)
    
    # Update PDF data if provided
    if pdf_data:
        db_obj.pdf_statement = pdf_data
    
    # Update solution PDF data if provided
    if solution_pdf_data:
        db_obj.solution_pdf = solution_pdf_data

    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def delete_question(db: Session, id: UUID) -> Optional[models.Question]:
    db_obj = db.query(models.Question).filter(models.Question.id == id).first()
    if db_obj:
        db.delete(db_obj)
        db.commit()
    return db_obj

# QuestionTestCase CRUD operations
def get_question_test_case(db: Session, id: UUID) -> Optional[models.QuestionTestCase]:
    return db.query(models.QuestionTestCase).filter(models.QuestionTestCase.id == id).first()

def get_question_test_cases(db: Session, skip: int = 0, limit: int = 100) -> List[models.QuestionTestCase]:
    return db.query(models.QuestionTestCase).offset(skip).limit(limit).all()

def create_question_test_case(db: Session, obj_in: schemas.QuestionTestCaseCreate) -> models.QuestionTestCase:
    db_obj = models.QuestionTestCase(**obj_in.dict())
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def update_question_test_case(db: Session, db_obj: models.QuestionTestCase, obj_in: schemas.QuestionTestCaseUpdate) -> models.QuestionTestCase:
    update_data = obj_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_obj, field, value)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def delete_question_test_case(db: Session, id: UUID) -> Optional[models.QuestionTestCase]:
    db_obj = db.query(models.QuestionTestCase).filter(models.QuestionTestCase.id == id).first()
    if db_obj:
        db.delete(db_obj)
        db.commit()
    return db_obj

def get_test_cases_for_question(db: Session, question_id: UUID):
    return db.query(models.QuestionTestCase).filter(models.QuestionTestCase.question_id == question_id).all()

def get_question_test_case(db: Session, id: UUID):
    return db.query(models.QuestionTestCase).filter(models.QuestionTestCase.id == id).first()

def create_question_test_case(db: Session, obj_in: schemas.QuestionTestCaseCreate):
    db_obj = models.QuestionTestCase(**obj_in.dict())
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def update_question_test_case(db: Session, db_obj: models.QuestionTestCase, obj_in: schemas.QuestionTestCaseUpdate):
    for field, value in obj_in.dict(exclude_unset=True).items():
        setattr(db_obj, field, value)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def delete_question_test_case(db: Session, id: UUID):
    db_obj = db.query(models.QuestionTestCase).filter(models.QuestionTestCase.id == id).first()
    if db_obj:
        db.delete(db_obj)
        db.commit()
    return db_obj

def delete_test_cases_by_question(db: Session, question_id: UUID):
    test_cases = db.query(models.QuestionTestCase).filter(models.QuestionTestCase.question_id == question_id).all()
    if not test_cases:
        return None
    for tc in test_cases:
        db.delete(tc)
    db.commit()
    return test_cases


# Exam CRUD operations
def get_exam(db: Session, id: UUID) -> Optional[models.Exam]:
    return db.query(models.Exam).filter(models.Exam.id == id).first()

def get_exams(db: Session, skip: int = 0, limit: int = 100, course_id: Optional[UUID] = None) -> List[models.Exam]:
    query = db.query(models.Exam)
    if course_id:
        query = query.filter(models.Exam.course_id == course_id)
    return query.offset(skip).limit(limit).all()

def create_exam(db: Session, obj_in: schemas.ExamCreate, user_id: UUID) -> models.Exam:
    # Validate that the course exists
    course = db.query(models.Course).filter(models.Course.id == obj_in.course_id).first()
    if not course:
        raise ValueError("Course not found")
    
    db_obj = models.Exam(**obj_in.dict(), created_by=user_id)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def get_exams_by_course(db: Session, course_id: UUID, skip: int = 0, limit: int = 100) -> List[models.Exam]:
    return db.query(models.Exam).filter(
        models.Exam.course_id == course_id
    ).offset(skip).limit(limit).all()

# ADD: Get exam with course details
def get_exam_with_course(db: Session, exam_id: UUID) -> Optional[models.Exam]:
    return db.query(models.Exam).options(
        # This will eagerly load the course relationship
        db.query(models.Exam).join(models.Course)
    ).filter(models.Exam.id == exam_id).first()

def update_exam(db: Session, db_obj: models.Exam, obj_in: schemas.ExamUpdate) -> models.Exam:
    update_data = obj_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_obj, field, value)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def delete_exam(db: Session, id: UUID) -> Optional[models.Exam]:
    db_obj = db.query(models.Exam).filter(models.Exam.id == id).first()
    if db_obj:
        db.delete(db_obj)
        db.commit()
    return db_obj

# ExamQuestion CRUD operations
def get_exam_question(db: Session, id: UUID) -> Optional[models.ExamQuestion]:
    return db.query(models.ExamQuestion).filter(models.ExamQuestion.id == id).first()

def get_exam_questions(db: Session, skip: int = 0, limit: int = 100) -> List[models.ExamQuestion]:
    return db.query(models.ExamQuestion).offset(skip).limit(limit).all()

def create_exam_question(db: Session, obj_in: schemas.ExamQuestionCreate) -> models.ExamQuestion:
    db_obj = models.ExamQuestion(**obj_in.dict())
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def update_exam_question(db: Session, db_obj: models.ExamQuestion, obj_in: schemas.ExamQuestionUpdate) -> models.ExamQuestion:
    update_data = obj_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_obj, field, value)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def delete_exam_question(db: Session, id: UUID) -> Optional[models.ExamQuestion]:
    db_obj = db.query(models.ExamQuestion).filter(models.ExamQuestion.id == id).first()
    if db_obj:
        db.delete(db_obj)
        db.commit()
    return db_obj

# ExamRegistration CRUD operations
def get_exam_registration(db: Session, id: UUID) -> Optional[models.ExamRegistration]:
    return db.query(models.ExamRegistration).filter(models.ExamRegistration.id == id).first()

def get_exam_registrations(db: Session, skip: int = 0, limit: int = 100) -> List[models.ExamRegistration]:
    return db.query(models.ExamRegistration).offset(skip).limit(limit).all()

def create_exam_registration(db: Session, obj_in: schemas.ExamRegistrationCreate) -> models.ExamRegistration:
    db_obj = models.ExamRegistration(**obj_in.dict())
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def update_exam_registration(db: Session, db_obj: models.ExamRegistration, obj_in: schemas.ExamRegistrationUpdate) -> models.ExamRegistration:
    update_data = obj_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_obj, field, value)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def delete_exam_registration(db: Session, id: UUID) -> Optional[models.ExamRegistration]:
    db_obj = db.query(models.ExamRegistration).filter(models.ExamRegistration.id == id).first()
    if db_obj:
        db.delete(db_obj)
        db.commit()
    return db_obj

# ExamSession CRUD operations
def get_exam_session(db: Session, id: UUID) -> Optional[models.ExamSession]:
    return db.query(models.ExamSession).filter(models.ExamSession.id == id).first()

def get_exam_sessions(db: Session, skip: int = 0, limit: int = 100) -> List[models.ExamSession]:
    return db.query(models.ExamSession).offset(skip).limit(limit).all()

def create_exam_session(db: Session, obj_in: schemas.ExamSessionCreate, student_id: UUID) -> models.ExamSession:
    db_obj = models.ExamSession(exam_id=obj_in.exam_id, student_id=student_id)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def update_exam_session(db: Session, db_obj: models.ExamSession, obj_in: schemas.ExamSessionUpdate) -> models.ExamSession:
    update_data = obj_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_obj, field, value)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def delete_exam_session(db: Session, id: UUID) -> Optional[models.ExamSession]:
    db_obj = db.query(models.ExamSession).filter(models.ExamSession.id == id).first()
    if db_obj:
        db.delete(db_obj)
        db.commit()
    return db_obj

# Submission CRUD operations
def get_submission(db: Session, id: UUID) -> Optional[models.Submission]:
    return db.query(models.Submission).filter(models.Submission.id == id).first()

def get_submissions(db: Session, skip: int = 0, limit: int = 100) -> List[models.Submission]:
    return db.query(models.Submission).offset(skip).limit(limit).all()

# exam_session_id: UUID
def create_submission(db: Session, obj_in: schemas.SubmissionCreate, student_id: UUID) -> models.Submission:
    # validate that exam_session belongs to this exam
    #exam_session = db.query(models.ExamSession).filter(models.ExamSession.id == obj_in.exam_session_id).first()
    # if not exam_session:
    #     raise ValueError("Invalid exam_session_id")
    # if exam_session.exam_id != obj_in.exam_id:
    #     raise ValueError("exam_id does not match the exam_id of the given exam_session")
    db_obj = models.Submission(**obj_in.dict(exclude={"student_id"}), student_id=student_id)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def update_submission(db: Session, db_obj: models.Submission, obj_in: schemas.SubmissionUpdate) -> models.Submission:
    update_data = obj_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_obj, field, value)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def delete_submission(db: Session, id: UUID) -> Optional[models.Submission]:
    db_obj = db.query(models.Submission).filter(models.Submission.id == id).first()
    if db_obj:
        db.delete(db_obj)
        db.commit()
    return db_obj

# SubmissionResult CRUD operations
def get_submission_result(db: Session, id: UUID) -> Optional[models.SubmissionResult]:
    return db.query(models.SubmissionResult).filter(models.SubmissionResult.id == id).first()

def get_submission_results(db: Session, skip: int = 0, limit: int = 100) -> List[models.SubmissionResult]:
    return db.query(models.SubmissionResult).offset(skip).limit(limit).all()

def get_submissions_by_exam_id(db: Session, exam_id: UUID, skip: int = 0, limit: int = 100) -> List[models.Submission]:
    return (
        db.query(models.Submission)
        .filter(models.Submission.exam_id == exam_id)
        .offset(skip)
        .limit(limit)
        .all()
    )

def get_submission_result_by_submission_id(db: Session, submission_id: UUID):
    """
    Get submission result by submission_id
    Returns the first submission result matching the submission_id
    """
    return db.query(models.SubmissionResult).filter(
        models.SubmissionResult.submission_id == submission_id
    ).first()


def create_submission_result(db: Session, obj_in: schemas.SubmissionResultCreate) -> models.SubmissionResult:
    db_obj = models.SubmissionResult(**obj_in.dict())
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def update_submission_result(db: Session, db_obj: models.SubmissionResult, obj_in: schemas.SubmissionResultUpdate) -> models.SubmissionResult:
    update_data = obj_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_obj, field, value)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def delete_submission_result(db: Session, id: UUID) -> Optional[models.SubmissionResult]:
    db_obj = db.query(models.SubmissionResult).filter(models.SubmissionResult.id == id).first()
    if db_obj:
        db.delete(db_obj)
        db.commit()
    return db_obj

# SubmissionEvent CRUD operations
def get_submission_event(db: Session, id: UUID) -> Optional[models.SubmissionEvent]:
    return db.query(models.SubmissionEvent).filter(models.SubmissionEvent.id == id).first()

def get_submission_events(db: Session, skip: int = 0, limit: int = 100) -> List[models.SubmissionEvent]:
    return db.query(models.SubmissionEvent).offset(skip).limit(limit).all()

def create_submission_event(db: Session, obj_in: schemas.SubmissionEventCreate) -> models.SubmissionEvent:
    db_obj = models.SubmissionEvent(**obj_in.dict())
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def update_submission_event(db: Session, db_obj: models.SubmissionEvent, obj_in: schemas.SubmissionEventUpdate) -> models.SubmissionEvent:
    update_data = obj_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_obj, field, value)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def delete_submission_event(db: Session, id: UUID) -> Optional[models.SubmissionEvent]:
    db_obj = db.query(models.SubmissionEvent).filter(models.SubmissionEvent.id == id).first()
    if db_obj:
        db.delete(db_obj)
        db.commit()
    return db_obj

# ExamEvent CRUD operations
def get_exam_event(db: Session, id: UUID) -> Optional[models.ExamEvent]:
    return db.query(models.ExamEvent).filter(models.ExamEvent.id == id).first()

def get_exam_events(db: Session, skip: int = 0, limit: int = 100) -> List[models.ExamEvent]:
    return db.query(models.ExamEvent).offset(skip).limit(limit).all()

def create_exam_event(db: Session, obj_in: schemas.ExamEventCreate) -> models.ExamEvent:
    db_obj = models.ExamEvent(**obj_in.dict())
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def update_exam_event(db: Session, db_obj: models.ExamEvent, obj_in: schemas.ExamEventUpdate) -> models.ExamEvent:
    update_data = obj_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_obj, field, value)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def delete_exam_event(db: Session, id: UUID) -> Optional[models.ExamEvent]:
    db_obj = db.query(models.ExamEvent).filter(models.ExamEvent.id == id).first()
    if db_obj:
        db.delete(db_obj)
        db.commit()
    return db_obj

# AuditLog CRUD operations
def get_audit_log(db: Session, id: UUID) -> Optional[models.AuditLog]:
    return db.query(models.AuditLog).filter(models.AuditLog.id == id).first()

def get_audit_logs(db: Session, skip: int = 0, limit: int = 100) -> List[models.AuditLog]:
    return db.query(models.AuditLog).offset(skip).limit(limit).all()

def create_audit_log(db: Session, obj_in: schemas.AuditLogCreate) -> models.AuditLog:
    db_obj = models.AuditLog(**obj_in.dict())
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def update_audit_log(db: Session, db_obj: models.AuditLog, obj_in: schemas.AuditLogUpdate) -> models.AuditLog:
    update_data = obj_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_obj, field, value)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def delete_audit_log(db: Session, id: UUID) -> Optional[models.AuditLog]:
    db_obj = db.query(models.AuditLog).filter(models.AuditLog.id == id).first()
    if db_obj:
        db.delete(db_obj)
        db.commit()
    return db_obj

def get_student_exam_questions_by_exam_and_student(db: Session, exam_id: UUID, student_id: UUID) -> List[models.StudentExamQuestion]:
    """Get all assigned questions for a specific student in a specific exam"""
    return db.query(models.StudentExamQuestion).filter(
        models.StudentExamQuestion.exam_id == exam_id,
        models.StudentExamQuestion.student_id == student_id
    ).order_by(models.StudentExamQuestion.question_order).all()

def get_students_for_exam(db: Session, exam_id: UUID) -> List[models.StudentExamQuestion]:
    """Get all students assigned to a specific exam with their questions"""
    return db.query(models.StudentExamQuestion).filter(
        models.StudentExamQuestion.exam_id == exam_id
    ).order_by(models.StudentExamQuestion.student_id, models.StudentExamQuestion.question_order).all()

def get_exam_questions_for_student(db: Session, student_id: UUID, exam_id: UUID) -> List[models.StudentExamQuestion]:
    """Get questions assigned to a student for a specific exam with full question details"""
    return db.query(models.StudentExamQuestion).join(
        models.Question
    ).filter(
        models.StudentExamQuestion.student_id == student_id,
        models.StudentExamQuestion.exam_id == exam_id
    ).order_by(models.StudentExamQuestion.question_order).all()

def get_student_exam_questions_by_exam(db: Session, exam_id: UUID) -> List[models.StudentExamQuestion]:
    """Get all question assignments for a specific exam"""
    return db.query(models.StudentExamQuestion).filter(
        models.StudentExamQuestion.exam_id == exam_id
    ).order_by(
        models.StudentExamQuestion.student_id, 
        models.StudentExamQuestion.question_order
    ).all()

def assign_question_to_student(db: Session, exam_id: UUID, student_id: UUID, question_id: UUID, question_order: int, points: int = 0) -> models.StudentExamQuestion:
    """Assign a question to a student for an exam"""
    db_obj = models.StudentExamQuestion(
        exam_id=exam_id,
        student_id=student_id,
        question_id=question_id,
        question_order=question_order,
        points=points
    )
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def bulk_assign_questions_to_students(db: Session, assignments: List[dict]) -> List[models.StudentExamQuestion]:
    """Bulk assign questions to students
    assignments format: [{'exam_id': UUID, 'student_id': UUID, 'question_id': UUID, 'question_order': int, 'points': int}, ...]
    """
    db_objects = []
    for assignment in assignments:
        db_obj = models.StudentExamQuestion(**assignment)
        db.add(db_obj)
        db_objects.append(db_obj)
    
    db.commit()
    for obj in db_objects:
        db.refresh(obj)
    
    return db_objects

# --- append these helper functions to backend/crud.py ---

from sqlalchemy.orm import Session
from uuid import UUID

from backend import models
from backend import schemas as app_schemas  # your existing schemas module


def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()


def get_user_by_id(db: Session, id):
    # id may be UUID or string
    return db.query(models.User).filter(models.User.id == id).first()


def update_user_password(db: Session, user: models.User, new_password_hash: str):
    user.password_hash = new_password_hash
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


# Refresh token bookkeeping using user.extra_data JSONB
def set_user_refresh_jti(db: Session, user: models.User, jti: str):
    d = user.extra_data or {}
    d["refresh_jti"] = jti
    user.extra_data = d
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def get_user_refresh_jti(user: models.User):
    d = user.extra_data or {}
    return d.get("refresh_jti")


def set_user_csrf_token(db: Session, user: models.User, csrf: str):
    d = user.extra_data or {}
    d["csrf_token"] = csrf
    user.extra_data = d
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def get_user_csrf_token(user: models.User):
    d = user.extra_data or {}
    return d.get("csrf_token")


def clear_user_refresh_jti(db: Session, user: models.User):
    d = user.extra_data or {}
    d.pop("refresh_jti", None)
    d.pop("csrf_token", None)
    user.extra_data = d
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

# Course CRUD operations
def get_course(db: Session, course_id: UUID) -> Optional[models.Course]:
    return db.query(models.Course).filter(models.Course.id == course_id).first()

def get_course_by_code(db: Session, course_code: str) -> Optional[models.Course]:
    return db.query(models.Course).filter(models.Course.course_code == course_code).first()

def get_courses(db: Session, skip: int = 0, limit: int = 100) -> List[models.Course]:
    return db.query(models.Course).offset(skip).limit(limit).all()

def create_course(db: Session, obj_in: schemas.CourseCreate) -> models.Course:
    db_obj = models.Course(**obj_in.dict())
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def update_course(db: Session, course_id: UUID, course_update: schemas.CourseUpdate) -> Optional[models.Course]:
    # First get the course object
    db_course = db.query(models.Course).filter(models.Course.id == course_id).first()
    if not db_course:
        return None
    
    # Update the course
    update_data = course_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_course, field, value)
    
    db.add(db_course)
    db.commit()
    db.refresh(db_course)
    return db_course


def delete_course(db: Session, course_id: UUID) -> Optional[models.Course]:
    db_obj = db.query(models.Course).filter(models.Course.id == course_id).first()
    if db_obj:
        db.delete(db_obj)
        db.commit()
    return db_obj

# Course Enrollment CRUD operations  
def get_course_enrollment(db: Session, enrollment_id: UUID) -> Optional[models.CourseEnrollment]:
    return db.query(models.CourseEnrollment).filter(models.CourseEnrollment.id == enrollment_id).first()

def create_course_enrollment(db: Session, obj_in: schemas.CourseEnrollmentCreate) -> models.CourseEnrollment:
    db_obj = models.CourseEnrollment(**obj_in.dict())
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def get_student_enrollments(db: Session, student_id: UUID) -> List[models.CourseEnrollment]:
    return db.query(models.CourseEnrollment).filter(
        models.CourseEnrollment.student_id == student_id,
        models.CourseEnrollment.status == models.EnrollmentStatus.ENROLLED
    ).all()

def get_course_enrollments(db: Session, course_id: UUID) -> List[models.CourseEnrollment]:
    return db.query(models.CourseEnrollment).filter(models.CourseEnrollment.course_id == course_id).all()

def update_course_enrollment(db: Session, db_obj: models.CourseEnrollment, obj_in: schemas.CourseEnrollmentUpdate) -> models.CourseEnrollment:
    update_data = obj_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_obj, field, value)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj
# MCQ CRUD operations
def get_mcq(db: Session, id: UUID) -> Optional[models.MCQ]:
    return db.query(models.MCQ).filter(models.MCQ.id == id).first()

def get_mcqs(db: Session, skip: int = 0, limit: int = 100) -> List[models.MCQ]:
    return db.query(models.MCQ).offset(skip).limit(limit).all()

def create_mcq(db: Session, obj_in: schemas.MCQCreate, user_id: UUID) -> models.MCQ:
    db_obj = models.MCQ(**obj_in.dict(), created_by=user_id)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def update_mcq(db: Session, db_obj: models.MCQ, obj_in: schemas.MCQUpdate) -> models.MCQ:
    update_data = obj_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_obj, field, value)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def delete_mcq(db: Session, id: UUID) -> Optional[models.MCQ]:
    db_obj = db.query(models.MCQ).filter(models.MCQ.id == id).first()
    if db_obj:
        db.delete(db_obj)
        db.commit()
    return db_obj

# ExamMCQ CRUD operations
def get_exam_mcq(db: Session, id: UUID) -> Optional[models.ExamMCQ]:
    return db.query(models.ExamMCQ).filter(models.ExamMCQ.id == id).first()

def get_exam_mcqs(db: Session, skip: int = 0, limit: int = 100) -> List[models.ExamMCQ]:
    return db.query(models.ExamMCQ).offset(skip).limit(limit).all()

def create_exam_mcq(db: Session, obj_in: schemas.ExamMCQCreate) -> models.ExamMCQ:
    db_obj = models.ExamMCQ(**obj_in.dict())
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def update_exam_mcq(db: Session, db_obj: models.ExamMCQ, obj_in: schemas.ExamMCQUpdate) -> models.ExamMCQ:
    update_data = obj_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_obj, field, value)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def delete_exam_mcq(db: Session, id: UUID) -> Optional[models.ExamMCQ]:
    db_obj = db.query(models.ExamMCQ).filter(models.ExamMCQ.id == id).first()
    if db_obj:
        db.delete(db_obj)
        db.commit()
    return db_obj

# StudentExamMCQ CRUD operations
def get_student_exam_mcq(db: Session, id: UUID) -> Optional[models.StudentExamMCQ]:
    return db.query(models.StudentExamMCQ).filter(models.StudentExamMCQ.id == id).first()

def get_student_exam_mcqs(db: Session, skip: int = 0, limit: int = 100) -> List[models.StudentExamMCQ]:
    return db.query(models.StudentExamMCQ).offset(skip).limit(limit).all()

def create_student_exam_mcq(db: Session, obj_in: schemas.StudentExamMCQCreate) -> models.StudentExamMCQ:
    db_obj = models.StudentExamMCQ(**obj_in.dict())
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def update_student_exam_mcq(db: Session, db_obj: models.StudentExamMCQ, obj_in: schemas.StudentExamMCQUpdate) -> models.StudentExamMCQ:
    update_data = obj_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_obj, field, value)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def delete_student_exam_mcq(db: Session, id: UUID) -> Optional[models.StudentExamMCQ]:
    db_obj = db.query(models.StudentExamMCQ).filter(models.StudentExamMCQ.id == id).first()
    if db_obj:
        db.delete(db_obj)
        db.commit()
    return db_obj

# MCQSubmission CRUD operations
def get_mcq_submission(db: Session, id: UUID) -> Optional[models.MCQSubmission]:
    return db.query(models.MCQSubmission).filter(models.MCQSubmission.id == id).first()

def get_mcq_submissions(db: Session, skip: int = 0, limit: int = 100) -> List[models.MCQSubmission]:
    return db.query(models.MCQSubmission).offset(skip).limit(limit).all()

def create_mcq_submission(db: Session, obj_in: schemas.MCQSubmissionCreate, student_id: UUID) -> models.MCQSubmission:
    # Get the MCQ to check correct answer
    mcq = db.query(models.MCQ).filter(models.MCQ.id == obj_in.mcq_id).first()
    if not mcq:
        raise ValueError("MCQ not found")
    
    # Calculate score
    is_correct = obj_in.selected_answer == mcq.correct_answer
    score = mcq.max_score if is_correct else 0
    
    db_obj = models.MCQSubmission(
        **obj_in.dict(exclude={"student_id"}), 
        student_id=student_id,
        is_correct=is_correct,
        score=score
    )
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def update_mcq_submission(db: Session, db_obj: models.MCQSubmission, obj_in: schemas.MCQSubmissionUpdate) -> models.MCQSubmission:
    update_data = obj_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_obj, field, value)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def delete_mcq_submission(db: Session, id: UUID) -> Optional[models.MCQSubmission]:
    db_obj = db.query(models.MCQSubmission).filter(models.MCQSubmission.id == id).first()
    if db_obj:
        db.delete(db_obj)
        db.commit()
    return db_obj

# Helper functions for MCQ assignments (similar to questions)
def get_student_exam_mcqs_by_exam_and_student(db: Session, exam_id: UUID, student_id: UUID) -> List[models.StudentExamMCQ]:
    return db.query(models.StudentExamMCQ).filter(
        models.StudentExamMCQ.exam_id == exam_id,
        models.StudentExamMCQ.student_id == student_id
    ).order_by(models.StudentExamMCQ.question_order).all()

def get_exam_mcqs_for_student(db: Session, student_id: UUID, exam_id: UUID) -> List[models.StudentExamMCQ]:
    return db.query(models.StudentExamMCQ).join(
        models.MCQ
    ).filter(
        models.StudentExamMCQ.student_id == student_id,
        models.StudentExamMCQ.exam_id == exam_id
    ).order_by(models.StudentExamMCQ.question_order).all()

def bulk_assign_mcqs_to_students(db: Session, assignments: List[dict]) -> List[models.StudentExamMCQ]:
    db_objects = []
    for assignment in assignments:
        db_obj = models.StudentExamMCQ(**assignment)
        db.add(db_obj)
        db_objects.append(db_obj)
    db.commit()
    for obj in db_objects:
        db.refresh(obj)
    return db_objects

# Activity CRUD operations
def get_activity(db: Session, id: UUID) -> Optional[models.Activity]:
    return db.query(models.Activity).filter(models.Activity.id == id).first()

def get_activities(db: Session, skip: int = 0, limit: int = 100, course_id: Optional[UUID] = None) -> List[models.Activity]:
    query = db.query(models.Activity)
    if course_id:
        query = query.filter(models.Activity.course_id == course_id)
    return query.offset(skip).limit(limit).all()

def create_activity(db: Session, obj_in: schemas.ActivityCreate, user_id: UUID) -> models.Activity:
    # Extract PDF data
    pdf_data = getattr(obj_in, 'pdf_data', None)
    obj_dict = obj_in.dict(exclude={'pdf_data'})
    
    db_obj = models.Activity(**obj_dict, created_by=user_id)
    
    # Set PDF data if provided
    if pdf_data:
        db_obj.activity_sheet_pdf = pdf_data
    
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj


def update_activity(db: Session, db_obj: models.Activity, obj_in: schemas.ActivityUpdate) -> models.Activity:
    pdf_data = getattr(obj_in, 'pdf_data', None)
    update_data = obj_in.dict(exclude_unset=True, exclude={'pdf_data'})
    
    for field, value in update_data.items():
        setattr(db_obj, field, value)
    
    # Update PDF data if provided
    if pdf_data:
        db_obj.activity_sheet_pdf = pdf_data
    
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def delete_activity(db: Session, id: UUID) -> Optional[models.Activity]:
    db_obj = db.query(models.Activity).filter(models.Activity.id == id).first()
    if db_obj:
        db.delete(db_obj)
        db.commit()
    return db_obj

# Activity Assignment CRUD operations
def get_activity_assignment(db: Session, id: UUID) -> Optional[models.ActivityAssignment]:
    return db.query(models.ActivityAssignment).filter(models.ActivityAssignment.id == id).first()

def get_activity_assignments(db: Session, skip: int = 0, limit: int = 100, activity_id: Optional[UUID] = None, student_id: Optional[UUID] = None) -> List[models.ActivityAssignment]:
    query = db.query(models.ActivityAssignment)
    if activity_id:
        query = query.filter(models.ActivityAssignment.activity_id == activity_id)
    if student_id:
        query = query.filter(models.ActivityAssignment.student_id == student_id)
    return query.offset(skip).limit(limit).all()

def create_activity_assignment(db: Session, obj_in: schemas.ActivityAssignmentCreate) -> models.ActivityAssignment:
    db_obj = models.ActivityAssignment(**obj_in.dict())
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def bulk_assign_activity_to_students(db: Session, activity_id: UUID, student_ids: List[UUID]) -> List[models.ActivityAssignment]:
    db_objects = []
    for student_id in student_ids:
        # Check if assignment already exists
        existing = db.query(models.ActivityAssignment).filter(
            models.ActivityAssignment.activity_id == activity_id,
            models.ActivityAssignment.student_id == student_id
        ).first()
        
        if not existing:
            db_obj = models.ActivityAssignment(
                activity_id=activity_id,
                student_id=student_id
            )
            db.add(db_obj)
            db_objects.append(db_obj)
    
    if db_objects:
        db.commit()
        for obj in db_objects:
            db.refresh(obj)
    
    return db_objects

def assign_activity_to_course_students(db: Session, activity_id: UUID, course_id: UUID) -> List[models.ActivityAssignment]:
    # Get all enrolled students in the course
    enrolled_students = db.query(models.CourseEnrollment).filter(
        models.CourseEnrollment.course_id == course_id,
        models.CourseEnrollment.status == models.EnrollmentStatus.ENROLLED
    ).all()
    
    student_ids = [enrollment.student_id for enrollment in enrolled_students]
    return bulk_assign_activity_to_students(db, activity_id, student_ids)

def update_activity_assignment(db: Session, db_obj: models.ActivityAssignment, obj_in: schemas.ActivityAssignmentUpdate) -> models.ActivityAssignment:
    update_data = obj_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_obj, field, value)
    
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

# Activity Submission CRUD operations
def get_activity_submission(db: Session, id: UUID) -> Optional[models.ActivitySubmission]:
    return db.query(models.ActivitySubmission).filter(models.ActivitySubmission.id == id).first()

def get_activity_submissions(db: Session, skip: int = 0, limit: int = 100, activity_id: Optional[UUID] = None, student_id: Optional[UUID] = None) -> List[models.ActivitySubmission]:
    query = db.query(models.ActivitySubmission)
    if activity_id:
        query = query.filter(models.ActivitySubmission.activity_id == activity_id)
    if student_id:
        query = query.filter(models.ActivitySubmission.student_id == student_id)
    return query.offset(skip).limit(limit).all()

def create_activity_submission(db: Session, obj_in: schemas.ActivitySubmissionCreate, student_id: UUID, activity_id: UUID) -> models.ActivitySubmission:
    file_data = getattr(obj_in, 'file_data', None)
    obj_dict = obj_in.dict(exclude={'file_data'})
    
    db_obj = models.ActivitySubmission(
        **obj_dict,
        student_id=student_id,
        activity_id=activity_id
    )
    
    # Set file data if provided
    if file_data:
        db_obj.submitted_file = file_data
    
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def update_activity_submission(db: Session, db_obj: models.ActivitySubmission, obj_in: schemas.ActivitySubmissionUpdate) -> models.ActivitySubmission:
    update_data = obj_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_obj, field, value)
    
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

# Helper functions for student dashboard
def get_student_activity_assignments(db: Session, student_id: UUID) -> List[models.ActivityAssignment]:
    return db.query(models.ActivityAssignment).join(
        models.Activity
    ).filter(
        models.ActivityAssignment.student_id == student_id,
        models.Activity.status == models.ActivityStatus.ACTIVE
    ).all()

# Helper functions for reports
def get_activity_statistics(db: Session, activity_id: UUID):
    from sqlalchemy import func
    
    stats = db.query(
        func.count(models.ActivityAssignment.id).label("total_assignments"),
        func.count(models.ActivitySubmission.id).label("total_submissions"),
        func.avg(models.ActivitySubmission.score).label("avg_score"),
        func.count(
            func.distinct(
                func.case(
                    [(models.ActivityAssignment.status == models.AssignmentStatus.COMPLETED, models.ActivityAssignment.student_id)],
                    else_=None
                )
            )
        ).label("completed_count")
    ).outerjoin(
        models.ActivitySubmission,
        models.ActivityAssignment.id == models.ActivitySubmission.activity_assignment_id
    ).filter(
        models.ActivityAssignment.activity_id == activity_id
    ).first()
    
    return {
        "activity_id": activity_id,
        "total_assignments": stats.total_assignments or 0,
        "total_submissions": stats.total_submissions or 0,
        "completed_assignments": stats.completed_count or 0,
        "average_score": float(stats.avg_score) if stats.avg_score else 0.0,
        "completion_rate": (stats.completed_count / stats.total_assignments * 100) if stats.total_assignments > 0 else 0
    }

# Activity Question CRUD operations
def get_activity_question(db: Session, id: UUID) -> Optional[models.ActivityQuestion]:
    return db.query(models.ActivityQuestion).filter(models.ActivityQuestion.id == id).first()

def get_activity_questions(db: Session, activity_id: UUID) -> List[models.ActivityQuestion]:
    return db.query(models.ActivityQuestion).filter(
        models.ActivityQuestion.activity_id == activity_id
    ).order_by(models.ActivityQuestion.question_number).all()

def create_activity_question(db: Session, obj_in: schemas.ActivityQuestionCreate) -> models.ActivityQuestion:
    db_obj = models.ActivityQuestion(**obj_in.dict())
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def update_activity_question(db: Session, db_obj: models.ActivityQuestion, obj_in: schemas.ActivityQuestionUpdate) -> models.ActivityQuestion:
    update_data = obj_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_obj, field, value)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def delete_activity_question(db: Session, id: UUID) -> Optional[models.ActivityQuestion]:
    db_obj = db.query(models.ActivityQuestion).filter(models.ActivityQuestion.id == id).first()
    if db_obj:
        db.delete(db_obj)
        db.commit()
    return db_obj

# Activity Code Submission CRUD operations
def get_activity_code_submission(db: Session, id: UUID) -> Optional[models.ActivityCodeSubmission]:
    return db.query(models.ActivityCodeSubmission).filter(models.ActivityCodeSubmission.id == id).first()

def get_student_code_submissions(db: Session, assignment_id: UUID, student_id: UUID) -> List[models.ActivityCodeSubmission]:
    return db.query(models.ActivityCodeSubmission).filter(
        models.ActivityCodeSubmission.activity_assignment_id == assignment_id,
        models.ActivityCodeSubmission.student_id == student_id
    ).order_by(models.ActivityCodeSubmission.submitted_at.desc()).all()

def get_latest_code_submission(db: Session, assignment_id: UUID, question_id: UUID, student_id: UUID) -> Optional[models.ActivityCodeSubmission]:
    return db.query(models.ActivityCodeSubmission).filter(
        models.ActivityCodeSubmission.activity_assignment_id == assignment_id,
        models.ActivityCodeSubmission.activity_question_id == question_id,
        models.ActivityCodeSubmission.student_id == student_id
    ).order_by(models.ActivityCodeSubmission.submitted_at.desc()).first()

def create_activity_code_submission(db: Session, obj_in: schemas.ActivityCodeSubmissionCreate, student_id: UUID) -> models.ActivityCodeSubmission:
    # Increment attempt number
    latest = get_latest_code_submission(db, obj_in.activity_assignment_id, obj_in.activity_question_id, student_id)
    attempt_number = (latest.attempt_number + 1) if latest else 1
    
    db_obj = models.ActivityCodeSubmission(
        **obj_in.dict(),
        student_id=student_id,
        attempt_number=attempt_number
    )
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def update_activity_code_submission(db: Session, db_obj: models.ActivityCodeSubmission, obj_in: schemas.ActivityCodeSubmissionUpdate) -> models.ActivityCodeSubmission:
    update_data = obj_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_obj, field, value)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

# Activity Final Submission CRUD operations
def get_activity_final_submission(db: Session, id: UUID) -> Optional[models.ActivityFinalSubmission]:
    return db.query(models.ActivityFinalSubmission).filter(models.ActivityFinalSubmission.id == id).first()

def get_activity_final_submissions(
    db: Session, 
    skip: int = 0, 
    limit: int = 100, 
    activity_id: Optional[UUID] = None,
    student_id: Optional[UUID] = None
) -> List[models.ActivityFinalSubmission]:
    query = db.query(models.ActivityFinalSubmission)
    if activity_id:
        query = query.filter(models.ActivityFinalSubmission.activity_id == activity_id)
    if student_id:
        query = query.filter(models.ActivityFinalSubmission.student_id == student_id)
    return query.offset(skip).limit(limit).all()

def get_student_final_submission_for_activity(
    db: Session, 
    activity_id: UUID, 
    student_id: UUID
) -> Optional[models.ActivityFinalSubmission]:
    return db.query(models.ActivityFinalSubmission).filter(
        models.ActivityFinalSubmission.activity_id == activity_id,
        models.ActivityFinalSubmission.student_id == student_id
    ).first()

def create_activity_final_submission(
    db: Session, 
    obj_in: schemas.ActivityFinalSubmissionCreate, 
    student_id: UUID
) -> models.ActivityFinalSubmission:
    # Get activity for max score calculation
    activity = db.query(models.Activity).filter(models.Activity.id == obj_in.activity_id).first()
    if not activity:
        raise ValueError("Activity not found")
    
    # Check if final submission already exists
    existing = get_student_final_submission_for_activity(db, obj_in.activity_id, student_id)
    if existing:
        raise ValueError("Final submission already exists for this student and activity")
    
    # Check if activity deadline has passed
    from datetime import datetime
    is_late = datetime.utcnow() > activity.end_time.replace(tzinfo=None) if activity.end_time else False
    
    # Calculate total questions and max possible score
    total_questions = len(obj_in.submission_data.get('questions', []))
    max_possible_score = total_questions * 10  # Assuming 10 points per question, adjust as needed
    
    db_obj = models.ActivityFinalSubmission(
        **obj_in.dict(),
        student_id=student_id,
        is_late=is_late,
        max_possible_score=max_possible_score
    )
    
    db.add(db_obj)
    
    # Update activity assignment status
    assignment = db.query(models.ActivityAssignment).filter(
        models.ActivityAssignment.id == obj_in.activity_assignment_id
    ).first()
    if assignment:
        assignment.status = models.AssignmentStatus.COMPLETED
        assignment.has_final_submission = True
        assignment.final_submitted_at = datetime.utcnow()
        assignment.completed_at = datetime.utcnow()
    
    db.commit()
    db.refresh(db_obj)
    return db_obj

def update_activity_final_submission(
    db: Session, 
    db_obj: models.ActivityFinalSubmission, 
    obj_in: schemas.ActivityFinalSubmissionUpdate
) -> models.ActivityFinalSubmission:
    update_data = obj_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_obj, field, value)
    
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def delete_activity_final_submission(db: Session, id: UUID) -> Optional[models.ActivityFinalSubmission]:
    db_obj = db.query(models.ActivityFinalSubmission).filter(models.ActivityFinalSubmission.id == id).first()
    if db_obj:
        db.delete(db_obj)
        db.commit()
    return db_obj

def process_final_submission_scoring(db: Session, final_submission_id: UUID) -> models.ActivityFinalSubmission:
    """Process and score a final submission"""
    final_submission = get_activity_final_submission(db, final_submission_id)
    if not final_submission:
        raise ValueError("Final submission not found")
    
    total_score = 0
    questions = final_submission.submission_data.get('questions', [])
    
    # Simple scoring logic - can be enhanced based on your needs
    for question in questions:
        if question.get('source_code', '').strip():  # If code is provided
            total_score += 5  # Base points for attempting
            if len(question.get('source_code', '')) > 50:  # If substantial code
                total_score += 3  # Additional points
            if question.get('question_context', '').strip():  # If context provided
                total_score += 2  # Additional points
    
    # Update final submission
    final_submission.total_score = total_score
    final_submission.is_processed = True
    final_submission.processed_at = datetime.utcnow()
    
    # Update activity assignment score
    assignment = final_submission.activity_assignment
    if assignment:
        assignment.score = total_score
    
    db.commit()
    db.refresh(final_submission)
    return final_submission

# Code Snippet CRUD
def get_code_snippets(db: Session, teacher_id: uuid.UUID, skip: int = 0, limit: int = 100) -> List[models.CodeSnippet]:
    return db.query(models.CodeSnippet).filter(
        models.CodeSnippet.teacher_id == teacher_id
    ).order_by(desc(models.CodeSnippet.updated_at)).offset(skip).limit(limit).all()

def get_code_snippet(db: Session, snippet_id: uuid.UUID, teacher_id: uuid.UUID) -> Optional[models.CodeSnippet]:
    return db.query(models.CodeSnippet).filter(
        and_(models.CodeSnippet.id == snippet_id, models.CodeSnippet.teacher_id == teacher_id)
    ).first()

def create_code_snippet(db: Session, obj_in: schemas.CodeSnippetCreate, teacher_id: uuid.UUID) -> models.CodeSnippet:
    obj_data = obj_in.dict()
    obj_data["teacher_id"] = teacher_id
    db_obj = models.CodeSnippet(**obj_data)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def update_code_snippet(db: Session, snippet_id: uuid.UUID, teacher_id: uuid.UUID, snippet_update: schemas.CodeSnippetUpdate) -> Optional[models.CodeSnippet]:
    db_snippet = db.query(models.CodeSnippet).filter(
        and_(models.CodeSnippet.id == snippet_id, models.CodeSnippet.teacher_id == teacher_id)
    ).first()
    
    if not db_snippet:
        return None
    
    update_data = snippet_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_snippet, field, value)
    
    db.commit()
    db.refresh(db_snippet)
    return db_snippet

def delete_code_snippet(db: Session, snippet_id: uuid.UUID, teacher_id: uuid.UUID) -> bool:
    db_snippet = db.query(models.CodeSnippet).filter(
        and_(models.CodeSnippet.id == snippet_id, models.CodeSnippet.teacher_id == teacher_id)
    ).first()
    
    if not db_snippet:
        return False
    
    db.delete(db_snippet)
    db.commit()
    return True

# Lesson CRUD
def get_lessons(db: Session, teacher_id: uuid.UUID, skip: int = 0, limit: int = 100) -> List[models.Lesson]:
    return db.query(models.Lesson).filter(
        models.Lesson.teacher_id == teacher_id
    ).order_by(desc(models.Lesson.updated_at)).offset(skip).limit(limit).all()

def get_lesson(db: Session, lesson_id: uuid.UUID, teacher_id: uuid.UUID) -> Optional[models.Lesson]:
    return db.query(models.Lesson).filter(
        and_(models.Lesson.id == lesson_id, models.Lesson.teacher_id == teacher_id)
    ).first()

def create_lesson(db: Session, lesson: schemas.LessonCreate, teacher_id: uuid.UUID) -> models.Lesson:
    db_lesson = models.Lesson(**lesson.dict(), teacher_id=teacher_id)
    db.add(db_lesson)
    db.commit()
    db.refresh(db_lesson)
    return db_lesson

def update_lesson(db: Session, lesson_id: uuid.UUID, teacher_id: uuid.UUID, lesson_update: schemas.LessonUpdate) -> Optional[models.Lesson]:
    db_lesson = db.query(models.Lesson).filter(
        and_(models.Lesson.id == lesson_id, models.Lesson.teacher_id == teacher_id)
    ).first()
    
    if not db_lesson:
        return None
    
    update_data = lesson_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_lesson, field, value)
    
    db.commit()
    db.refresh(db_lesson)
    return db_lesson

def delete_lesson(db: Session, lesson_id: uuid.UUID, teacher_id: uuid.UUID) -> bool:
    db_lesson = db.query(models.Lesson).filter(
        and_(models.Lesson.id == lesson_id, models.Lesson.teacher_id == teacher_id)
    ).first()
    
    if not db_lesson:
        return False
    
    db.delete(db_lesson)
    db.commit()
    return True

def update_lesson_pdf(db: Session, lesson_id: uuid.UUID, teacher_id: uuid.UUID, pdf_type: str, file_data: bytes, filename: str) -> Optional[models.Lesson]:
    db_lesson = db.query(models.Lesson).filter(
        and_(models.Lesson.id == lesson_id, models.Lesson.teacher_id == teacher_id)
    ).first()
    
    if not db_lesson:
        return None
    
    if pdf_type == "cdp":
        db_lesson.cdp_pdf = file_data
        db_lesson.cdp_pdf_filename = filename
    elif pdf_type == "timetable":
        db_lesson.timetable_pdf = file_data
        db_lesson.timetable_pdf_filename = filename
    
    db.commit()
    db.refresh(db_lesson)
    return db_lesson

# Kanban Task CRUD
def get_kanban_tasks(db: Session, teacher_id: uuid.UUID, department: Optional[str] = None, batch_year: Optional[int] = None) -> List[models.KanbanTask]:
    query = db.query(models.KanbanTask).filter(models.KanbanTask.teacher_id == teacher_id)
    
    if department:
        query = query.filter(models.KanbanTask.department == department)
    if batch_year:
        query = query.filter(models.KanbanTask.batch_year == batch_year)
    
    return query.order_by(models.KanbanTask.priority.desc(), models.KanbanTask.created_at).all()

def get_kanban_task(db: Session, task_id: uuid.UUID, teacher_id: uuid.UUID) -> Optional[models.KanbanTask]:
    return db.query(models.KanbanTask).filter(
        and_(models.KanbanTask.id == task_id, models.KanbanTask.teacher_id == teacher_id)
    ).first()

def create_kanban_task(db: Session, task: schemas.KanbanTaskCreate, teacher_id: uuid.UUID) -> models.KanbanTask:
    db_task = models.KanbanTask(**task.dict(), teacher_id=teacher_id)
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task

def update_kanban_task(db: Session, task_id: uuid.UUID, teacher_id: uuid.UUID, task_update: schemas.KanbanTaskUpdate) -> Optional[models.KanbanTask]:
    db_task = db.query(models.KanbanTask).filter(
        and_(models.KanbanTask.id == task_id, models.KanbanTask.teacher_id == teacher_id)
    ).first()
    
    if not db_task:
        return None
    
    update_data = task_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_task, field, value)
    
    db.commit()
    db.refresh(db_task)
    return db_task

def delete_kanban_task(db: Session, task_id: uuid.UUID, teacher_id: uuid.UUID) -> bool:
    db_task = db.query(models.KanbanTask).filter(
        and_(models.KanbanTask.id == task_id, models.KanbanTask.teacher_id == teacher_id)
    ).first()
    
    if not db_task:
        return False
    
    db.delete(db_task)
    db.commit()
    return True

# Class Schedule CRUD
def get_class_schedules(db: Session, teacher_id: uuid.UUID, start_date: Optional[datetime] = None, end_date: Optional[datetime] = None) -> List[models.ClassSchedule]:
    query = db.query(models.ClassSchedule).filter(models.ClassSchedule.teacher_id == teacher_id)
    
    if start_date:
        query = query.filter(models.ClassSchedule.start_time >= start_date)
    if end_date:
        query = query.filter(models.ClassSchedule.end_time <= end_date)
    
    return query.order_by(models.ClassSchedule.start_time).all()

def get_upcoming_schedules(db: Session, teacher_id: uuid.UUID, minutes_ahead: int = 15) -> List[models.ClassSchedule]:
    now = datetime.utcnow()
    upcoming_time = now + timedelta(minutes=minutes_ahead)
    
    return db.query(models.ClassSchedule).filter(
        and_(
            models.ClassSchedule.teacher_id == teacher_id,
            models.ClassSchedule.start_time <= upcoming_time,
            models.ClassSchedule.start_time > now,
            models.ClassSchedule.is_notified == False
        )
    ).all()

def get_class_schedule(db: Session, schedule_id: uuid.UUID, teacher_id: uuid.UUID) -> Optional[models.ClassSchedule]:
    return db.query(models.ClassSchedule).filter(
        and_(models.ClassSchedule.id == schedule_id, models.ClassSchedule.teacher_id == teacher_id)
    ).first()

def create_class_schedule(db: Session, schedule: schemas.ClassScheduleCreate, teacher_id: uuid.UUID) -> models.ClassSchedule:
    db_schedule = models.ClassSchedule(**schedule.dict(), teacher_id=teacher_id)
    db.add(db_schedule)
    db.commit()
    db.refresh(db_schedule)
    return db_schedule

def update_class_schedule(db: Session, schedule_id: uuid.UUID, teacher_id: uuid.UUID, schedule_update: schemas.ClassScheduleUpdate) -> Optional[models.ClassSchedule]:
    db_schedule = db.query(models.ClassSchedule).filter(
        and_(models.ClassSchedule.id == schedule_id, models.ClassSchedule.teacher_id == teacher_id)
    ).first()
    
    if not db_schedule:
        return None
    
    update_data = schedule_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_schedule, field, value)
    
    db.commit()
    db.refresh(db_schedule)
    return db_schedule

def delete_class_schedule(db: Session, schedule_id: uuid.UUID, teacher_id: uuid.UUID) -> bool:
    db_schedule = db.query(models.ClassSchedule).filter(
        and_(models.ClassSchedule.id == schedule_id, models.ClassSchedule.teacher_id == teacher_id)
    ).first()
    
    if not db_schedule:
        return False
    
    db.delete(db_schedule)
    db.commit()
    return True

def mark_schedule_notified(db: Session, schedule_id: uuid.UUID) -> bool:
    db_schedule = db.query(models.ClassSchedule).filter(models.ClassSchedule.id == schedule_id).first()
    
    if not db_schedule:
        return False
    
    db_schedule.is_notified = True
    db.commit()
    return True

# Diagram File CRUD
def create_diagram_file(db: Session, teacher_id: uuid.UUID, filename: str, file_data: bytes, content_type: str) -> models.DiagramFile:
    db_file = models.DiagramFile(
        teacher_id=teacher_id,
        filename=filename,
        file_data=file_data,
        content_type=content_type
    )
    db.add(db_file)
    db.commit()
    db.refresh(db_file)
    return db_file

def get_diagram_files(db: Session, teacher_id: uuid.UUID) -> List[models.DiagramFile]:
    return db.query(models.DiagramFile).filter(
        models.DiagramFile.teacher_id == teacher_id
    ).order_by(desc(models.DiagramFile.created_at)).all()

def get_diagram_file(db: Session, file_id: uuid.UUID, teacher_id: uuid.UUID) -> Optional[models.DiagramFile]:
    return db.query(models.DiagramFile).filter(
        and_(models.DiagramFile.id == file_id, models.DiagramFile.teacher_id == teacher_id)
    ).first()

def delete_diagram_file(db: Session, file_id: uuid.UUID, teacher_id: uuid.UUID) -> bool:
    db_file = db.query(models.DiagramFile).filter(
        and_(models.DiagramFile.id == file_id, models.DiagramFile.teacher_id == teacher_id)
    ).first()
    
    if not db_file:
        return False
    
    db.delete(db_file)
    db.commit()
    return True

# NEW: Teacher-Course relationship CRUD operations
def get_teacher_courses(db: Session, teacher_id: str) -> List[models.Course]:
    """Get all courses taught by a specific teacher"""
    # First get the teacher profile
    teacher_profile = db.query(models.TeacherProfile).filter(
        models.TeacherProfile.user_id == teacher_id
    ).first()
    
    if not teacher_profile or not teacher_profile.courses:
        return []
    
    # Get courses by IDs stored in teacher profile
    courses = db.query(models.Course).filter(
        models.Course.id.in_(teacher_profile.courses)
    ).all()
    
    return courses

def get_course_teachers(db: Session, course_id: str) -> List[dict]:
    """Get all teachers teaching a specific course"""
    # Find teacher profiles that have this course in their courses array
    teacher_profiles = db.query(models.TeacherProfile).filter(
        models.TeacherProfile.courses.any(course_id)  # PostgreSQL array contains
    ).all()
    
    if not teacher_profiles:
        return []
    
    # Get user details for each teacher and combine with profile data
    result = []
    for profile in teacher_profiles:
        user = db.query(models.User).filter(models.User.id == profile.user_id).first()
        if user:
            result.append({
                "id": str(user.id),
                "email": user.email,
                "employee_id": profile.employee_id,
                "first_name": profile.first_name,
                "last_name": profile.last_name,
                "department": profile.department,
                "designation": profile.designation,
                "created_at": user.created_at,
                "is_active": user.is_active
            })
    
    return result

def update_teacher_courses(db: Session, teacher_id: str, course_ids: List[str]) -> Optional[models.TeacherProfile]:
    """Update the courses taught by a teacher"""
    teacher_profile = db.query(models.TeacherProfile).filter(
        models.TeacherProfile.user_id == teacher_id
    ).first()
    
    if not teacher_profile:
        return None
    
    # Validate that all course IDs exist
    existing_courses = db.query(models.Course).filter(
        models.Course.id.in_(course_ids)
    ).all()
    
    existing_course_ids = [str(course.id) for course in existing_courses]
    invalid_ids = set(course_ids) - set(existing_course_ids)
    
    if invalid_ids:
        raise ValueError(f"Invalid course IDs: {list(invalid_ids)}")
    
    # Update teacher profile with new course list
    teacher_profile.courses = course_ids
    db.commit()
    db.refresh(teacher_profile)
    
    return teacher_profile

def get_teacher_profile_by_user_id(db: Session, user_id: str) -> Optional[models.TeacherProfile]:
    """Get teacher profile by user ID - helper function"""
    return db.query(models.TeacherProfile).filter(
        models.TeacherProfile.user_id == user_id
    ).first()

# Uploaded Notes CRUD
def get_uploaded_notes(
    db: Session, 
    teacher_id: uuid.UUID, 
    skip: int = 0, 
    limit: int = 100,
    course_id: Optional[uuid.UUID] = None,
    category: Optional[str] = None,
    search: Optional[str] = None,
    tags: Optional[List[str]] = None
) -> List[models.UploadedNote]:
    query = db.query(models.UploadedNote).filter(models.UploadedNote.teacher_id == teacher_id)
    
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
        for tag in tags:
            query = query.filter(models.UploadedNote.tags.contains([tag]))
    
    return query.order_by(desc(models.UploadedNote.created_at)).offset(skip).limit(limit).all()

def get_uploaded_note(db: Session, note_id: uuid.UUID, teacher_id: uuid.UUID) -> Optional[models.UploadedNote]:
    return db.query(models.UploadedNote).filter(
        and_(models.UploadedNote.id == note_id, models.UploadedNote.teacher_id == teacher_id)
    ).first()

def create_uploaded_note(db: Session, obj_in: schemas.UploadedNoteCreate, teacher_id: uuid.UUID) -> models.UploadedNote:
    obj_data = obj_in.dict()
    obj_data["teacher_id"] = teacher_id
    db_obj = models.UploadedNote(**obj_data)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def update_uploaded_note(
    db: Session, 
    note_id: uuid.UUID, 
    teacher_id: uuid.UUID, 
    obj_in: schemas.UploadedNoteUpdate
) -> Optional[models.UploadedNote]:
    db_obj = db.query(models.UploadedNote).filter(
        and_(models.UploadedNote.id == note_id, models.UploadedNote.teacher_id == teacher_id)
    ).first()
    
    if not db_obj:
        return None
    
    update_data = obj_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_obj, field, value)
    
    db.commit()
    db.refresh(db_obj)
    return db_obj

def delete_uploaded_note(db: Session, note_id: uuid.UUID, teacher_id: uuid.UUID) -> bool:
    db_obj = db.query(models.UploadedNote).filter(
        and_(models.UploadedNote.id == note_id, models.UploadedNote.teacher_id == teacher_id)
    ).first()
    
    if not db_obj:
        return False
    
    db.delete(db_obj)
    db.commit()
    return True

def delete_multiple_notes(db: Session, note_ids: List[uuid.UUID], teacher_id: uuid.UUID) -> int:
    count = db.query(models.UploadedNote).filter(
        and_(
            models.UploadedNote.id.in_(note_ids),
            models.UploadedNote.teacher_id == teacher_id
        )
    ).delete(synchronize_session=False)
    db.commit()
    return count

# Note File CRUD
def create_note_file(
    db: Session, 
    note_id: uuid.UUID, 
    filename: str, 
    original_filename: str,
    file_data: bytes, 
    content_type: str, 
    file_size: int
) -> models.NoteFile:
    db_file = models.NoteFile(
        note_id=note_id,
        filename=filename,
        original_filename=original_filename,
        file_data=file_data,
        content_type=content_type,
        file_size=file_size
    )
    db.add(db_file)
    db.commit()
    db.refresh(db_file)
    return db_file

def get_note_file(db: Session, file_id: uuid.UUID, teacher_id: uuid.UUID) -> Optional[models.NoteFile]:
    return db.query(models.NoteFile).join(models.UploadedNote).filter(
        and_(
            models.NoteFile.id == file_id,
            models.UploadedNote.teacher_id == teacher_id
        )
    ).first()

def get_note_files(db: Session, note_id: uuid.UUID, teacher_id: uuid.UUID) -> List[models.NoteFile]:
    return db.query(models.NoteFile).join(models.UploadedNote).filter(
        and_(
            models.NoteFile.note_id == note_id,
            models.UploadedNote.teacher_id == teacher_id
        )
    ).all()

def delete_note_file(db: Session, file_id: uuid.UUID, teacher_id: uuid.UUID) -> bool:
    db_file = db.query(models.NoteFile).join(models.UploadedNote).filter(
        and_(
            models.NoteFile.id == file_id,
            models.UploadedNote.teacher_id == teacher_id
        )
    ).first()
    
    if not db_file:
        return False
    
    db.delete(db_file)
    db.commit()
    return True

# Course CRUD (if not already exists)
def get_courses(db: Session, skip: int = 0, limit: int = 100) -> List[models.Course]:
    return db.query(models.Course).offset(skip).limit(limit).all()

def get_note_stats(db: Session, teacher_id: uuid.UUID) -> dict:
    stats = db.query(
        func.count(models.UploadedNote.id).label('total_notes'),
        func.count(models.NoteFile.id).label('total_files'),
        func.sum(models.NoteFile.file_size).label('total_size')
    ).join(
        models.NoteFile, models.UploadedNote.id == models.NoteFile.note_id, isouter=True
    ).filter(
        models.UploadedNote.teacher_id == teacher_id
    ).first()
    
    return {
        'total_notes': stats.total_notes or 0,
        'total_files': stats.total_files or 0,
        'total_size': stats.total_size or 0
    }

def get_teacher_timetable(db: Session, teacher_id: uuid.UUID):
    return db.query(models.TeacherTimetable).filter(
        models.TeacherTimetable.teacher_id == teacher_id
    ).first()

def create_or_update_teacher_timetable(
    db: Session, 
    user_id: uuid.UUID,  # Changed from teacher_id to user_id
    filename: str, 
    file_data: bytes
):
    # Get teacher profile first
    teacher_profile = get_teacher_profile(db, user_id)
    if not teacher_profile:
        raise ValueError("Teacher profile not found")
    
    # Check if timetable exists for this teacher profile
    timetable = db.query(models.TeacherTimetable).filter(
        models.TeacherTimetable.teacher_id == teacher_profile.id  # Use teacher_profile.id for DB
    ).first()
    
    if timetable:
        timetable.timetable_filename = filename
        timetable.timetable_data = file_data
        timetable.uploaded_at = datetime.utcnow()
        timetable.updated_at = datetime.utcnow()
    else:
        timetable = models.TeacherTimetable(
            teacher_id=teacher_profile.id,  # Store teacher_profile.id in DB
            timetable_filename=filename,
            timetable_data=file_data
        )
        db.add(timetable)
    
    db.commit()
    db.refresh(timetable)
    return timetable

def get_teacher_timetable(db: Session, user_id: uuid.UUID):
    # Get teacher profile first
    teacher_profile = get_teacher_profile(db, user_id)
    if not teacher_profile:
        return None
        
    return db.query(models.TeacherTimetable).filter(
        models.TeacherTimetable.teacher_id == teacher_profile.id
    ).first()


def get_course_cdp(db: Session, course_id: uuid.UUID, teacher_id: uuid.UUID):
    return db.query(models.CourseDevelopmentPlan).filter(
        and_(
            models.CourseDevelopmentPlan.course_id == course_id,
            models.CourseDevelopmentPlan.teacher_id == teacher_id
        )
    ).first()

def create_or_update_course_cdp(
    db: Session, 
    course_id: uuid.UUID, 
    teacher_id: uuid.UUID, 
    filename: str, 
    file_data: bytes  # This should be bytes, not str
):
    cdp = get_course_cdp(db, course_id, teacher_id)
    
    if cdp:
        cdp.cdp_filename = filename
        cdp.cdp_data = file_data  # Store bytes directly
        cdp.uploaded_at = datetime.utcnow()
        cdp.updated_at = datetime.utcnow()
    else:
        cdp = models.CourseDevelopmentPlan(
            course_id=course_id,
            teacher_id=teacher_id,
            cdp_filename=filename,
            cdp_data=file_data  # Store bytes directly
        )
        db.add(cdp)
    
    db.commit()
    db.refresh(cdp)
    return cdp

def get_course_lessons(db: Session, course_id: uuid.UUID, teacher_id: uuid.UUID):
    return db.query(models.Lesson).filter(
        and_(
            models.Lesson.course_id == course_id,
            models.Lesson.teacher_id == teacher_id
        )
    ).order_by(models.Lesson.lesson_order.asc(), models.Lesson.created_at.asc()).all()

def create_lesson(db: Session, lesson: schemas.LessonCreate):
    db_lesson = models.Lesson(**lesson.dict())
    db.add(db_lesson)
    db.commit()
    db.refresh(db_lesson)
    return db_lesson

def update_lesson(db: Session, lesson_id: uuid.UUID, lesson_update: schemas.LessonCreate):
    lesson = db.query(models.Lesson).filter(models.Lesson.id == lesson_id).first()
    if lesson:
        for key, value in lesson_update.dict().items():
            setattr(lesson, key, value)
        lesson.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(lesson)
    return lesson

def delete_lesson(db: Session, lesson_id: uuid.UUID, teacher_id: uuid.UUID):
    lesson = db.query(models.Lesson).filter(
        and_(
            models.Lesson.id == lesson_id,
            models.Lesson.teacher_id == teacher_id
        )
    ).first()
    
    if lesson:
        db.delete(lesson)
        db.commit()
        return True
    return False
