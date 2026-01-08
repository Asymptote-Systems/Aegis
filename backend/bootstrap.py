import os
from sqlalchemy.orm import Session

from backend import models, schemas
from backend.crud import create_user
from backend.database import SessionLocal


def bootstrap_admin() -> None:
    admin_email = os.getenv("DEFAULT_ADMIN_EMAIL")
    admin_password = os.getenv("DEFAULT_ADMIN_PASSWORD")
    admin_role = os.getenv("DEFAULT_ADMIN_ROLE", "admin")

    if not admin_email or not admin_password:
        # Missing config → do nothing (safe for prod)
        return

    db: Session = SessionLocal()
    try:
        # Check if admin already exists
        admin = (
            db.query(models.User)
            .filter(models.User.email == admin_email)
            .first()
        )

        if admin:
            return  # ✅ already bootstrapped

        admin_in = schemas.UserCreate(
            email=admin_email,
            password=admin_password,
            role=admin_role,
            is_active=True,
            extra_data={
                "bootstrap": True
            },
        )

        create_user(db, admin_in)

    finally:
        db.close()
