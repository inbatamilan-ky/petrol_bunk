"""
Creates (or resets the password of) an admin user for logging in.

Usage:
    python create_admin.py <username> <password> [full_name]

Example:
    python create_admin.py admin admin123 "Bunk Owner"
"""
import sys

from app import models
from app.database import SessionLocal
from app.security import hash_password


def main():
    if len(sys.argv) < 3:
        print("Usage: python create_admin.py <username> <password> [full_name]")
        sys.exit(1)

    username = sys.argv[1]
    password = sys.argv[2]
    full_name = sys.argv[3] if len(sys.argv) > 3 else "Administrator"

    db = SessionLocal()
    try:
        user = db.query(models.User).filter(models.User.username == username).first()
        if user:
            user.hashed_password = hash_password(password)
            user.role = 1
            user.is_active = True
            print(f"Updated existing user '{username}' -> role=1 (Owner), password reset.")
        else:
            user = models.User(
                username=username,
                hashed_password=hash_password(password),
                full_name=full_name,
                role=1,
                is_active=True,
            )
            db.add(user)
            print(f"Created owner user '{username}' with role=1.")
        db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    main()
