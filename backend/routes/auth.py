"""
Unified Authentication API.

Single login endpoint for all 4 roles: student, admin, faculty, finance.
Replaces the per-role login endpoints in students.py and faculty.py.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from backend.db import get_db

router = APIRouter(prefix="/api/auth", tags=["authentication"])


class LoginRequest(BaseModel):
    role: str
    userId: str
    password: str


class LoginResponse(BaseModel):
    status: str
    user: dict
    role: str


async def _find_student(db, user_id: str, password: str) -> dict | None:
    """Look up a student by various ID fields."""
    students = db["students"]
    user = await students.find_one({
        "$or": [
            {"rollNumber": user_id},
            {"roll_number": user_id},
            {"id": user_id},
            {"student_id": user_id},
            {"email": user_id},
        ]
    })

    if not user:
        if user_id == "STU-2024-1547":
            default_student = {
                "id": "STU-2024-1547",
                "rollNumber": "STU-2024-1547",
                "roll_number": "STU-2024-1547",
                "name": "John Anderson",
                "email": "john.anderson@mit.edu",
                "phone": "+91 90123 45678",
                "department": "Computer Science",
                "year": "3rd Year",
                "semester": 6,
                "section": "A",
                "cgpa": 8.7,
                "attendancePct": 92,
                "feeStatus": "Pending",
                "status": "Active",
                "enrollDate": "2022-08-01",
                "address": "18, Lake View Road, Bangalore, Karnataka",
                "guardian": "Michael Anderson",
                "guardianPhone": "+91 90123 45000",
                "avatar": "https://ui-avatars.com/api/?name=John+Anderson&background=2563eb&color=fff&size=128",
                "subjects": [],
                "fees": [
                    {"id": "FEE-101", "type": "Tuition Fee", "amount": 75000, "paid": 75000, "due": 0, "date": "2024-07-15", "status": "Paid"},
                    {"id": "FEE-102", "type": "Hostel Fee", "amount": 45000, "paid": 30000, "due": 15000, "date": "2024-07-20", "status": "Partial"},
                    {"id": "FEE-103", "type": "Exam Fee", "amount": 5000, "paid": 0, "due": 5000, "date": "-", "status": "Unpaid"},
                ],
                "documents": [
                    {"id": "DOC-101", "name": "10th Marksheet", "type": "pdf", "uploadDate": "2022-08-01", "size": "1.1 MB"},
                    {"id": "DOC-102", "name": "12th Marksheet", "type": "pdf", "uploadDate": "2022-08-01", "size": "1.3 MB"},
                    {"id": "DOC-103", "name": "Aadhar Card", "type": "pdf", "uploadDate": "2022-08-02", "size": "0.8 MB"},
                    {"id": "DOC-104", "name": "Passport Photo", "type": "image", "uploadDate": "2022-08-02", "size": "0.4 MB"},
                ],
                "attendanceMonthly": [
                    {"month": "Jul", "present": 22, "total": 24},
                    {"month": "Aug", "present": 23, "total": 26},
                ],
                "password": "student123",
                "role": "student",
            }
            await students.insert_one(default_student)
            user = default_student
        else:
            return None



    # Check password — stored password, or fallback to rollNumber/id as default password
    stored_password = (
        user.get("password")
        or user.get("rollNumber")
        or user.get("roll_number")
        or user.get("id")
    )

    if str(password) != str(stored_password):
        return None

    # Serialize for response
    user["_id"] = str(user.get("_id", ""))
    return {
        "userId": user.get("rollNumber") or user.get("roll_number") or user.get("id"),
        "name": user.get("name", ""),
        "email": user.get("email", ""),
        "department": user.get("department", user.get("department_id", "")),
        "avatar": user.get("avatar"),
        "role": "student",
    }


async def _find_faculty(db, user_id: str, password: str) -> dict | None:
    """Look up a faculty member."""
    faculty = db["faculty"]
    user = await faculty.find_one({
        "$or": [
            {"employee_id": user_id},
            {"faculty_id": user_id},
            {"id": user_id},
            {"email": user_id},
        ]
    })

    if not user:
        # Also try staff_Details
        staff = db["staff_Details"]
        user = await staff.find_one({
            "$or": [
                {"staffId": user_id},
                {"employee_id": user_id},
                {"id": user_id},
            ]
        })

    if not user:
        if user_id == "FAC-204":
            default_faculty = {
                "name": "Dr. Rajesh Iyer",
                "employeeId": "FAC-204",
                "id": "FAC-204",
                "email": "rajesh.iyer@mit.edu",
                "phone": "+91-9876543299",
                "designation": "Professor",
                "subject": "Cloud Computing",
                "department_id": "CS",
                "departmentId": "Computer Science",
                "qualification": "Ph.D. in Computer Science",
                "employment_status": "Active",
                "joining_date": datetime(2010, 8, 15),
                "experience_years": 15,
                "attendance_rate": 91,
                "pass_rate": 93,
                "specialization": "Distributed Systems",
                "status": "Top",
                "cgpa": 8.4,
                "office_location": "Building A, Room 402",
                "password": "faculty123",
                "role": "faculty",
                "teaching_load": [
                    {"courseCode": "CS-303", "courseName": "Data Structures", "credits": 4},
                    {"courseCode": "CS-306", "courseName": "Database Systems", "credits": 4},
                    {"courseCode": "CS-309", "courseName": "Web Development", "credits": 3}
                ]
            }
            await faculty.insert_one(default_faculty)
            user = default_faculty
        else:
            return None

    stored_password = (
        user.get("password")
        or user.get("employee_id")
        or user.get("faculty_id")
        or user.get("staffId")
        or user.get("id")
    )

    if str(password) != str(stored_password):
        return None

    user["_id"] = str(user.get("_id", ""))
    return {
        "userId": user.get("employee_id") or user.get("faculty_id") or user.get("staffId") or user.get("id"),
        "name": user.get("name") or user.get("staffName", ""),
        "email": user.get("email", ""),
        "department": user.get("department") or user.get("department_id", ""),
        "role": "faculty",
    }


async def _find_admin(db, user_id: str, password: str) -> dict | None:
    """Look up an admin user."""
    admins = db["admin_users"]
    user = await admins.find_one({
        "$or": [
            {"userId": user_id},
            {"id": user_id},
            {"email": user_id},
        ]
    })

    if not user:
        # If collection is empty, seed default admin
        count = await admins.count_documents({})
        if count == 0:
            await _seed_default_admins(db)
            user = await admins.find_one({"userId": user_id})

    if not user:
        return None

    if str(password) != str(user.get("password", "")):
        return None

    user["_id"] = str(user.get("_id", ""))
    return {
        "userId": user.get("userId") or user.get("id"),
        "name": user.get("name", "Admin"),
        "email": user.get("email", ""),
        "role": "admin",
    }


async def _find_finance(db, user_id: str, password: str) -> dict | None:
    """Look up a finance user."""
    finance = db["finance_users"]
    user = await finance.find_one({
        "$or": [
            {"userId": user_id},
            {"id": user_id},
            {"email": user_id},
        ]
    })

    if not user:
        count = await finance.count_documents({})
        if count == 0:
            await _seed_default_finance(db)
            user = await finance.find_one({"userId": user_id})

    if not user:
        return None

    if str(password) != str(user.get("password", "")):
        return None

    user["_id"] = str(user.get("_id", ""))
    return {
        "userId": user.get("userId") or user.get("id"),
        "name": user.get("name", "Finance Officer"),
        "email": user.get("email", ""),
        "role": "finance",
    }


async def _seed_default_admins(db):
    """Seed default admin users if collection is empty."""
    admins = db["admin_users"]
    defaults = [
        {
            "userId": "ADM-0001",
            "id": "ADM-0001",
            "name": "Admin User",
            "email": "admin@mitconnect.edu",
            "password": "admin123",
            "role": "admin",
            "createdAt": datetime.now(timezone.utc).isoformat(),
        },
    ]
    await admins.insert_many(defaults)
    print("[SEED] Created default admin users")


async def _seed_default_finance(db):
    """Seed default finance users if collection is empty."""
    finance = db["finance_users"]
    defaults = [
        {
            "userId": "FIN-880",
            "id": "FIN-880",
            "name": "Finance Officer",
            "email": "finance@mitconnect.edu",
            "password": "finance123",
            "role": "finance",
            "createdAt": datetime.now(timezone.utc).isoformat(),
        },
    ]
    await finance.insert_many(defaults)
    print("[SEED] Created default finance users")


@router.post("/login")
async def unified_login(body: LoginRequest):
    """
    Unified login endpoint for all roles.
    Accepts { role, userId, password } and returns user data.
    """
    role = body.role.lower().strip()
    user_id = body.userId.strip()
    password = body.password

    if role not in ("student", "admin", "faculty", "finance"):
        raise HTTPException(status_code=400, detail="Invalid role. Must be one of: student, admin, faculty, finance")

    try:
        db = get_db()
    except HTTPException:
        raise HTTPException(status_code=503, detail="Database unavailable")

    lookup_fn = {
        "student": _find_student,
        "faculty": _find_faculty,
        "admin": _find_admin,
        "finance": _find_finance,
    }

    user_data = await lookup_fn[role](db, user_id, password)

    if not user_data:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Log the login
    try:
        login_history = db["login_history"]
        await login_history.insert_one({
            "userId": user_data["userId"],
            "role": role,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "status": "success",
            "ip": "unknown",
        })
    except Exception:
        pass  # Non-critical

    return {
        "status": "success",
        "user": user_data,
        "role": role,
    }


@router.post("/seed")
async def seed_role_users():
    """Seed default admin and finance users. Idempotent."""
    try:
        db = get_db()
    except HTTPException:
        raise HTTPException(status_code=503, detail="Database unavailable")

    admin_count = await db["admin_users"].count_documents({})
    finance_count = await db["finance_users"].count_documents({})

    seeded = []
    if admin_count == 0:
        await _seed_default_admins(db)
        seeded.append("admin")
    if finance_count == 0:
        await _seed_default_finance(db)
        seeded.append("finance")

    return {
        "message": f"Seeded: {', '.join(seeded) if seeded else 'nothing (already seeded)'}",
        "admin_count": admin_count or 1,
        "finance_count": finance_count or 1,
    }
