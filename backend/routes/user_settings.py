"""
User Settings API — Migrated from frontend/server.js (Express) to FastAPI.

Handles per-user settings for all roles: profile, notifications, appearance,
language, privacy, accessibility, sessions, login-history, password, export,
delete-request, and faculty teaching preferences.

Data is stored in MongoDB Atlas collection 'user_settings'.
"""

from __future__ import annotations

from copy import deepcopy
from datetime import datetime, timezone
import random
from typing import Any, Optional
from uuid import uuid4

from fastapi import APIRouter, HTTPException, UploadFile, File

from backend.db import get_db

router = APIRouter(prefix="/api/settings", tags=["user-settings"])


# ── File Upload — MUST be defined BEFORE wildcard /{role}/{user_id} routes ──────

@router.post("/upload")
async def upload_settings_file(file: UploadFile = File(...)):
    from pathlib import Path

    # Absolute path: backend/routes/ -> backend/ -> backend/static/uploads
    _BACKEND_DIR = Path(__file__).resolve().parent.parent
    upload_path = _BACKEND_DIR / "static" / "uploads"
    upload_path.mkdir(parents=True, exist_ok=True)

    clean_name = Path(file.filename).name
    target_path = upload_path / clean_name

    contents = await file.read()
    target_path.write_bytes(contents)

    return {"fileName": clean_name, "url": f"/uploads/{clean_name}"}


# ── Admin System Settings ─────────────────────────────────────────────────────
# These MUST come before any wildcard /{role}/{user_id} routes in FastAPI.

@router.get("/general")
async def get_general_settings():
    db = get_db()
    col = db["system_settings"]
    doc = await col.find_one({"type": "general"})
    if doc:
        doc.pop("_id", None)
        doc.pop("type", None)
        return doc
    defaults = {
        "portalName": "MIT Connect",
        "language": "English",
        "timezone": "Asia/Kolkata",
        "dateFormat": "DD/MM/YYYY",
        "theme": "Ocean Blue",
    }
    await col.insert_one({"type": "general", **defaults})
    return defaults


@router.put("/general")
async def update_general_settings(body: dict):
    db = get_db()
    col = db["system_settings"]
    await col.update_one({"type": "general"}, {"$set": body}, upsert=True)
    doc = await col.find_one({"type": "general"})
    doc.pop("_id", None)
    doc.pop("type", None)
    return doc


@router.get("/academic")
async def get_academic_settings():
    db = get_db()
    col = db["system_settings"]
    doc = await col.find_one({"type": "academic"})
    if doc:
        doc.pop("_id", None)
        doc.pop("type", None)
        return doc
    defaults = {
        "currentYear": "2025-2026",
        "semesters": 2,
        "creditSystem": "CBCS",
        "attendanceRule": "Minimum 75% attendance is mandatory.",
        "gradeRule": "A+ >= 90, A >= 80, B >= 70, C >= 60",
    }
    await col.insert_one({"type": "academic", **defaults})
    return defaults


@router.put("/academic")
async def update_academic_settings(body: dict):
    db = get_db()
    col = db["system_settings"]
    await col.update_one({"type": "academic"}, {"$set": body}, upsert=True)
    doc = await col.find_one({"type": "academic"})
    doc.pop("_id", None)
    doc.pop("type", None)
    return doc


@router.get("/finance")
async def get_finance_settings():
    db = get_db()
    col = db["system_settings"]
    doc = await col.find_one({"type": "finance"})
    if doc:
        doc.pop("_id", None)
        doc.pop("type", None)
        return doc
    defaults = {
        "tuitionFee": 50000,
        "lateFeePercent": 5,
        "scholarshipEnabled": True,
        "paymentPlan": "Semester Split",
        "scholarshipRule": "Merit based scholarship for top 10% students.",
        "payrollCycle": "Monthly",
        "salaryComponents": "Basic, HRA, DA, Performance Allowance",
        "invoiceTemplate": "MIT Standard Invoice v2",
        "paymentGateway": "Razorpay",
    }
    await col.insert_one({"type": "finance", **defaults})
    return defaults


@router.put("/finance")
async def update_finance_settings(body: dict):
    db = get_db()
    col = db["system_settings"]
    await col.update_one({"type": "finance"}, {"$set": body}, upsert=True)
    doc = await col.find_one({"type": "finance"})
    doc.pop("_id", None)
    doc.pop("type", None)
    return doc


@router.get("/notifications")
async def get_system_notification_settings():
    db = get_db()
    col = db["system_settings"]
    doc = await col.find_one({"type": "notifications"})
    if doc:
        doc.pop("_id", None)
        doc.pop("type", None)
        return doc
    defaults = {
        "emailTemplate": "Dear {{name}}, your portal update is available.",
        "smsTemplate": "MIT Connect alert: {{event}}",
        "pushEnabled": True,
        "announcementRule": "Send urgent announcements to all users instantly.",
    }
    await col.insert_one({"type": "notifications", **defaults})
    return defaults


@router.put("/notifications")
async def update_system_notification_settings(body: dict):
    db = get_db()
    col = db["system_settings"]
    await col.update_one({"type": "notifications"}, {"$set": body}, upsert=True)
    doc = await col.find_one({"type": "notifications"})
    doc.pop("_id", None)
    doc.pop("type", None)
    return doc


@router.get("/security")
async def get_security_settings():
    db = get_db()
    col = db["system_settings"]
    doc = await col.find_one({"type": "security"})
    if doc:
        doc.pop("_id", None)
        doc.pop("type", None)
        return doc
    defaults = {
        "minPasswordLength": 8,
        "requireUppercase": True,
        "mfaEnabled": False,
        "maxLoginAttempts": 5,
        "sessionTimeout": 30,
        "ipRestrictions": "Allow campus network + VPN",
    }
    await col.insert_one({"type": "security", **defaults})
    return defaults


@router.put("/security")
async def update_security_settings(body: dict):
    db = get_db()
    col = db["system_settings"]
    await col.update_one({"type": "security"}, {"$set": body}, upsert=True)
    doc = await col.find_one({"type": "security"})
    doc.pop("_id", None)
    doc.pop("type", None)
    return doc


@router.get("/integrations")
async def get_integration_settings():
    db = get_db()
    col = db["system_settings"]
    doc = await col.find_one({"type": "integrations"})
    if doc:
        doc.pop("_id", None)
        doc.pop("type", None)
        return doc
    defaults = {
        "smtpHost": "smtp.mitconnect.edu",
        "smtpPort": 587,
        "smtpUser": "no-reply@mitconnect.edu",
        "paymentGatewayProvider": "Razorpay",
        "webhookUrl": "https://mitconnect.edu/hooks/events",
        "externalApiBaseUrl": "https://api.university-services.edu",
        "externalApiToken": "demo-token-123",
    }
    await col.insert_one({"type": "integrations", **defaults})
    return defaults


@router.put("/integrations")
async def update_integration_settings(body: dict):
    db = get_db()
    col = db["system_settings"]
    await col.update_one({"type": "integrations"}, {"$set": body}, upsert=True)
    doc = await col.find_one({"type": "integrations"})
    doc.pop("_id", None)
    doc.pop("type", None)
    return doc


@router.get("/data-management")
async def get_data_management_settings():
    db = get_db()
    col = db["system_settings"]
    doc = await col.find_one({"type": "data-management"})
    if doc:
        doc.pop("_id", None)
        doc.pop("type", None)
        return doc
    defaults = {
        "retentionDays": 365,
        "autoBackupEnabled": True,
        "exportFormat": "CSV",
        "lastBackupId": "BKP-2026-0311-001",
    }
    await col.insert_one({"type": "data-management", **defaults})
    return defaults


@router.put("/data-management")
async def update_data_management_settings(body: dict):
    db = get_db()
    col = db["system_settings"]
    await col.update_one({"type": "data-management"}, {"$set": body}, upsert=True)
    doc = await col.find_one({"type": "data-management"})
    doc.pop("_id", None)
    doc.pop("type", None)
    return doc


# ── Default seeds ──────────────────────────────────────────────────────────────

def _student_defaults() -> dict:
    return {
        "profile": {
            "name": "",
            "email": "",
            "phone": "",
            "bio": "",
            "address": "",
        },
        "notifications": {
            "odStatusUpdate": True,
            "feeReminder": True,
            "internalMarks": True,
        },
        "appearance": {
            "theme": "dark",
            "fontSize": "medium",
            "accentColor": "blue",
            "layoutDensity": "comfortable",
        },
        "language": {
            "language": "English",
            "region": "India",
            "timezone": "Asia/Kolkata",
            "dateFormat": "DD/MM/YYYY",
        },
        "privacy": {
            "profileVisible": True,
            "searchable": True,
            "allowDirectMessages": True,
        },
        "accessibility": {
            "highContrast": False,
            "reduceMotion": False,
            "textToSpeech": False,
            "largeClickTargets": False,
        },
    }


def _faculty_defaults() -> dict:
    return {
        "profile": {
            "name": "",
            "email": "",
            "department": "",
            "phone": "",
            "bio": "",
        },
        "notifications": {
            "salaryCredit": True,
            "odRequests": True,
            "placementAlerts": True,
        },
        "appearance": {
            "theme": "light",
            "fontSize": "medium",
            "accentColor": "teal",
            "layoutDensity": "comfortable",
        },
        "language": {
            "language": "English",
            "region": "India",
            "timezone": "Asia/Kolkata",
            "dateFormat": "DD/MM/YYYY",
        },
        "privacy": {
            "profileVisible": True,
            "searchable": True,
            "allowDirectMessages": True,
        },
        "accessibility": {
            "highContrast": False,
            "reduceMotion": False,
            "textToSpeech": False,
            "largeClickTargets": False,
        },
        "teachingPreferences": {
            "preferredMode": "Hybrid",
            "officeHours": "10 AM - 12 PM",
            "autoPublishGrades": False,
        },
    }


def _finance_defaults() -> dict:
    return {
        "profile": {
            "name": "",
            "email": "",
            "phone": "",
            "bio": "",
        },
        "notifications": {
            "feePayments": True,
        },
        "appearance": {
            "theme": "light",
            "fontSize": "medium",
            "accentColor": "blue",
            "layoutDensity": "comfortable",
        },
        "language": {
            "language": "English",
            "region": "India",
            "timezone": "Asia/Kolkata",
            "dateFormat": "DD/MM/YYYY",
        },
        "privacy": {
            "profileVisible": True,
            "searchable": True,
            "allowDirectMessages": True,
        },
        "accessibility": {
            "highContrast": False,
            "reduceMotion": False,
            "textToSpeech": False,
            "largeClickTargets": False,
        },
    }


def _admin_defaults() -> dict:
    return {
        "profile": {
            "name": "",
            "email": "",
            "phone": "",
            "bio": "",
        },
        "notifications": {
            "feePayments": True,
            "placementAlerts": True,
        },
        "appearance": {
            "theme": "light",
            "fontSize": "medium",
            "accentColor": "blue",
            "layoutDensity": "comfortable",
        },
        "language": {
            "language": "English",
            "region": "India",
            "timezone": "Asia/Kolkata",
            "dateFormat": "DD/MM/YYYY",
        },
        "privacy": {
            "profileVisible": True,
            "searchable": True,
            "allowDirectMessages": True,
        },
        "accessibility": {
            "highContrast": False,
            "reduceMotion": False,
            "textToSpeech": False,
            "largeClickTargets": False,
        },
    }


def merge_defaults(role: str, existing_settings: dict) -> dict:
    if role == "faculty":
        defaults = _faculty_defaults()
    elif role == "finance":
        defaults = _finance_defaults()
    elif role == "admin":
        defaults = _admin_defaults()
    else:
        defaults = _student_defaults()

    merged = deepcopy(defaults)
    for section_key, val in existing_settings.items():
        if section_key == "_id":
            merged["_id"] = val
            continue
        if isinstance(val, dict) and section_key in merged:
            merged[section_key].update(val)
        else:
            merged[section_key] = val
    return merged


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ── Helpers ────────────────────────────────────────────────────────────────────

def _normalize_role(role: str) -> Optional[str]:
    v = role.lower()
    if v in ("student", "students"):
        return "student"
    if v == "faculty":
        return "faculty"
    if v == "admin":
        return "admin"
    if v == "finance":
        return "finance"
    return None


def _settings_collection():
    return get_db()["user_settings"]


def _sessions_collection():
    return get_db()["user_sessions"]


def _login_history_collection():
    return get_db()["login_history"]


def _delete_requests_collection():
    return get_db()["delete_requests"]


def _credentials_collection():
    return get_db()["user_credentials"]


async def _get_or_create_settings(role: str, user_id: str) -> dict:
    """Fetch user settings from MongoDB, or create with defaults if not found."""
    col = _settings_collection()
    doc = await col.find_one({"userId": user_id})
    if doc:
        doc["_id"] = str(doc["_id"])
        return merge_defaults(role, doc)

    # Seed defaults based on role
    if role == "faculty":
        defaults = _faculty_defaults()
    elif role == "finance":
        defaults = _finance_defaults()
    elif role == "admin":
        defaults = _admin_defaults()
    else:
        defaults = _student_defaults()

    record = {
        "userId": user_id,
        "role": role,
        "createdAt": _now_iso(),
        **defaults,
    }
    await col.insert_one(record)
    record["_id"] = str(record.get("_id", ""))
    return record


async def _get_section(role: str, user_id: str, section: str):
    settings = await _get_or_create_settings(role, user_id)
    return settings.get(section)


async def _update_section(role: str, user_id: str, section: str, data: dict):
    col = _settings_collection()
    # Get current settings first to merge
    settings = await _get_or_create_settings(role, user_id)
    current = settings.get(section, {})
    if isinstance(current, dict):
        merged = {**current, **data}
    else:
        merged = data

    await col.update_one(
        {"userId": user_id},
        {"$set": {section: merged, "updatedAt": _now_iso()}}
    )
    return merged


# ── Profile ────────────────────────────────────────────────────────────────────

@router.get("/{role}/{user_id}/profile")
async def get_profile(role: str, user_id: str):
    r = _normalize_role(role)
    if not r:
        raise HTTPException(status_code=400, detail="Invalid role")
    data = await _get_section(r, user_id, "profile")
    if not data:
        raise HTTPException(status_code=404, detail="Profile not found")
    return data


@router.put("/{role}/{user_id}/profile")
async def update_profile(role: str, user_id: str, body: dict):
    r = _normalize_role(role)
    if not r:
        raise HTTPException(status_code=400, detail="Invalid role")
    updated = await _update_section(r, user_id, "profile", body)
    
    # Propagate to primary collection
    db = get_db()
    name = body.get("name")
    email = body.get("email")
    phone = body.get("phone")
    bio = body.get("bio")
    
    if r == "student":
        address = body.get("address")
        await db["students"].update_many(
            {"$or": [{"id": user_id}, {"rollNumber": user_id}]},
            {"$set": {"name": name, "email": email, "phone": phone, "bio": bio, "address": address}}
        )
    elif r == "faculty":
        dept = body.get("department")
        await db["faculty"].update_many(
            {"$or": [{"employee_id": user_id}, {"faculty_id": user_id}, {"id": user_id}]},
            {"$set": {"name": name, "email": email, "phone": phone, "bio": bio, "department": dept, "departmentId": dept}}
        )
        await db["staff_Details"].update_many(
            {"$or": [{"staffId": user_id}, {"employee_id": user_id}, {"id": user_id}]},
            {"$set": {"staffName": name, "email": email, "phone": phone}}
        )
    elif r == "admin":
        await db["admin_users"].update_many(
            {"$or": [{"userId": user_id}, {"id": user_id}]},
            {"$set": {"name": name, "email": email}}
        )
    elif r == "finance":
        await db["finance_users"].update_many(
            {"$or": [{"userId": user_id}, {"id": user_id}]},
            {"$set": {"name": name, "email": email}}
        )
        
    return {"message": "Profile updated successfully", "data": updated}


# ── Notifications Preferences ──────────────────────────────────────────────────

@router.get("/{role}/{user_id}/notifications")
async def get_notification_prefs(role: str, user_id: str):
    r = _normalize_role(role)
    if not r:
        raise HTTPException(status_code=400, detail="Invalid role")
    data = await _get_section(r, user_id, "notifications")
    if not data:
        raise HTTPException(status_code=404, detail="Notification preferences not found")
    return data


@router.put("/{role}/{user_id}/notifications")
async def update_notification_prefs(role: str, user_id: str, body: dict):
    r = _normalize_role(role)
    if not r:
        raise HTTPException(status_code=400, detail="Invalid role")
    updated = await _update_section(r, user_id, "notifications", body)
    return {"message": "Notification preferences updated successfully", "data": updated}


# ── Appearance ─────────────────────────────────────────────────────────────────

@router.get("/{role}/{user_id}/appearance")
async def get_appearance(role: str, user_id: str):
    r = _normalize_role(role)
    if not r:
        raise HTTPException(status_code=400, detail="Invalid role")
    data = await _get_section(r, user_id, "appearance")
    return data or {}


@router.put("/{role}/{user_id}/appearance")
async def update_appearance(role: str, user_id: str, body: dict):
    r = _normalize_role(role)
    if not r:
        raise HTTPException(status_code=400, detail="Invalid role")
    updated = await _update_section(r, user_id, "appearance", body)
    return {"message": "Appearance settings updated successfully.", "data": updated}


@router.get("/{user_id}/appearance")
async def get_appearance_by_userid(user_id: str):
    data = await _get_section("student", user_id, "appearance")
    return data or {}


@router.put("/{user_id}/appearance")
async def update_appearance_by_userid(user_id: str, body: dict):
    updated = await _update_section("student", user_id, "appearance", body)
    return {"message": "Appearance settings updated successfully.", "data": updated}


# ── Language ───────────────────────────────────────────────────────────────────

@router.get("/{role}/{user_id}/language")
async def get_language(role: str, user_id: str):
    r = _normalize_role(role)
    if not r:
        raise HTTPException(status_code=400, detail="Invalid role")
    data = await _get_section(r, user_id, "language")
    return data or {}


@router.put("/{role}/{user_id}/language")
async def update_language(role: str, user_id: str, body: dict):
    r = _normalize_role(role)
    if not r:
        raise HTTPException(status_code=400, detail="Invalid role")
    updated = await _update_section(r, user_id, "language", body)
    return {"message": "Language & region settings updated successfully.", "data": updated}


@router.get("/{user_id}/language")
async def get_language_by_userid(user_id: str):
    data = await _get_section("student", user_id, "language")
    return data or {}


@router.put("/{user_id}/language")
async def update_language_by_userid(user_id: str, body: dict):
    updated = await _update_section("student", user_id, "language", body)
    return {"message": "Language & region settings updated successfully.", "data": updated}


# ── Privacy ────────────────────────────────────────────────────────────────────

@router.get("/{role}/{user_id}/privacy")
async def get_privacy(role: str, user_id: str):
    r = _normalize_role(role)
    if not r:
        raise HTTPException(status_code=400, detail="Invalid role")
    data = await _get_section(r, user_id, "privacy")
    return data or {}


@router.put("/{role}/{user_id}/privacy")
async def update_privacy(role: str, user_id: str, body: dict):
    r = _normalize_role(role)
    if not r:
        raise HTTPException(status_code=400, detail="Invalid role")
    updated = await _update_section(r, user_id, "privacy", body)
    return {"message": "Privacy settings updated successfully.", "data": updated}


@router.get("/{user_id}/privacy")
async def get_privacy_by_userid(user_id: str):
    data = await _get_section("student", user_id, "privacy")
    return data or {}


@router.put("/{user_id}/privacy")
async def update_privacy_by_userid(user_id: str, body: dict):
    updated = await _update_section("student", user_id, "privacy", body)
    return {"message": "Privacy settings updated successfully.", "data": updated}


# ── Accessibility ──────────────────────────────────────────────────────────────

@router.get("/{role}/{user_id}/accessibility")
async def get_accessibility(role: str, user_id: str):
    r = _normalize_role(role)
    if not r:
        raise HTTPException(status_code=400, detail="Invalid role")
    data = await _get_section(r, user_id, "accessibility")
    return data or {}


@router.put("/{role}/{user_id}/accessibility")
async def update_accessibility(role: str, user_id: str, body: dict):
    r = _normalize_role(role)
    if not r:
        raise HTTPException(status_code=400, detail="Invalid role")
    updated = await _update_section(r, user_id, "accessibility", body)
    return {"message": "Accessibility settings updated successfully.", "data": updated}


@router.get("/{user_id}/accessibility")
async def get_accessibility_by_userid(user_id: str):
    data = await _get_section("student", user_id, "accessibility")
    return data or {}


@router.put("/{user_id}/accessibility")
async def update_accessibility_by_userid(user_id: str, body: dict):
    updated = await _update_section("student", user_id, "accessibility", body)
    return {"message": "Accessibility settings updated successfully.", "data": updated}


# ── Teaching Preferences (Faculty only) ────────────────────────────────────────

@router.get("/faculty/{user_id}/teaching")
async def get_teaching_prefs(user_id: str):
    data = await _get_section("faculty", user_id, "teachingPreferences")
    if not data:
        raise HTTPException(status_code=404, detail="Teaching preferences not found")
    return data


@router.put("/faculty/{user_id}/teaching")
async def update_teaching_prefs(user_id: str, body: dict):
    updated = await _update_section("faculty", user_id, "teachingPreferences", body)
    return {"message": "Teaching preferences updated successfully", "data": updated}


# ── Password ───────────────────────────────────────────────────────────────────

@router.post("/change-password")
async def change_password(body: dict):
    user_id = body.get("userId")
    old_password = body.get("oldPassword")
    new_password = body.get("newPassword")

    if not user_id or not old_password or not new_password:
        raise HTTPException(status_code=400, detail="userId, oldPassword, and newPassword are required.")

    if len(str(new_password)) < 8:
        raise HTTPException(status_code=400, detail="New password must contain at least 8 characters.")

    db = get_db()
    
    # 1. Verify current password
    verified = False
    
    # Check user_credentials
    col = _credentials_collection()
    cred = await col.find_one({"userId": user_id})
    if cred:
        if cred.get("password") == old_password:
            verified = True
    else:
        # Fallback to role collections
        student = await db["students"].find_one({"$or": [{"id": user_id}, {"rollNumber": user_id}]})
        if student:
            stored_pw = student.get("password") or student.get("rollNumber") or student.get("id")
            if stored_pw == old_password:
                verified = True
        else:
            faculty = await db["faculty"].find_one({"$or": [{"employee_id": user_id}, {"faculty_id": user_id}, {"id": user_id}]})
            if not faculty:
                faculty = await db["staff_Details"].find_one({"$or": [{"staffId": user_id}, {"employee_id": user_id}, {"id": user_id}]})
            if faculty:
                stored_pw = faculty.get("password") or faculty.get("employee_id") or faculty.get("faculty_id") or faculty.get("staffId") or faculty.get("id")
                if stored_pw == old_password:
                    verified = True
            else:
                admin = await db["admin_users"].find_one({"$or": [{"userId": user_id}, {"id": user_id}]})
                if admin:
                    stored_pw = admin.get("password") or admin.get("userId") or admin.get("id")
                    if stored_pw == old_password:
                        verified = True
                else:
                    finance = await db["finance_users"].find_one({"$or": [{"userId": user_id}, {"id": user_id}]})
                    if finance:
                        stored_pw = finance.get("password") or finance.get("userId") or finance.get("id")
                        if stored_pw == old_password:
                            verified = True

    if not verified:
        raise HTTPException(status_code=400, detail="Current password is incorrect.")

    # 2. Update password everywhere
    await col.update_one({"userId": user_id}, {"$set": {"password": new_password, "updatedAt": _now_iso()}}, upsert=True)
    await db["students"].update_many({"$or": [{"id": user_id}, {"rollNumber": user_id}]}, {"$set": {"password": new_password}})
    await db["faculty"].update_many({"$or": [{"employee_id": user_id}, {"faculty_id": user_id}, {"id": user_id}]}, {"$set": {"password": new_password}})
    await db["staff_Details"].update_many({"$or": [{"staffId": user_id}, {"employee_id": user_id}, {"id": user_id}]}, {"$set": {"password": new_password}})
    await db["admin_users"].update_many({"$or": [{"userId": user_id}, {"id": user_id}]}, {"$set": {"password": new_password}})
    await db["finance_users"].update_many({"$or": [{"userId": user_id}, {"id": user_id}]}, {"$set": {"password": new_password}})

    return {"message": "Password changed successfully."}


# ── Email ──────────────────────────────────────────────────────────────────────

@router.put("/email")
async def update_email(body: dict):
    user_id = body.get("userId")
    email = body.get("email")
    role = body.get("role")

    if not user_id or not email:
        raise HTTPException(status_code=400, detail="userId and email are required.")

    r = _normalize_role(role) if role else "student"
    updated = await _update_section(r, user_id, "profile", {"email": email})
    
    # Propagate to primary collections
    db = get_db()
    if r == "student":
        await db["students"].update_many({"$or": [{"id": user_id}, {"rollNumber": user_id}]}, {"$set": {"email": email}})
    elif r == "faculty":
        await db["faculty"].update_many({"$or": [{"employee_id": user_id}, {"faculty_id": user_id}, {"id": user_id}]}, {"$set": {"email": email}})
        await db["staff_Details"].update_many({"$or": [{"staffId": user_id}, {"employee_id": user_id}, {"id": user_id}]}, {"$set": {"email": email}})
    elif r == "admin":
        await db["admin_users"].update_many({"$or": [{"userId": user_id}, {"id": user_id}]}, {"$set": {"email": email}})
    elif r == "finance":
        await db["finance_users"].update_many({"$or": [{"userId": user_id}, {"id": user_id}]}, {"$set": {"email": email}})
        
    return {"message": "Email updated successfully.", "data": {"email": updated.get("email")}}


# ── Sessions ───────────────────────────────────────────────────────────────────

@router.get("/{role}/{user_id}/sessions")
async def get_sessions(role: str, user_id: str):
    r = _normalize_role(role)
    if not r:
        raise HTTPException(status_code=400, detail="Invalid role")
    col = _sessions_collection()
    sessions = []
    async for s in col.find({"userId": user_id}):
        s["_id"] = str(s["_id"])
        sessions.append(s)

    if not sessions:
        # Return a default current session
        return [{"id": f"sess-{uuid4().hex[:8]}", "device": "Current Browser", "location": "Unknown", "active": True, "lastSeen": _now_iso()}]
    return sessions


@router.get("/{user_id}/sessions")
async def get_sessions_by_userid(user_id: str):
    return await get_sessions("student", user_id)


@router.post("/logout-all")
async def logout_all(body: dict):
    user_id = body.get("userId")
    if not user_id:
        raise HTTPException(status_code=400, detail="userId is required.")

    col = _sessions_collection()
    result = await col.update_many(
        {"userId": user_id},
        {"$set": {"active": False, "lastSeen": _now_iso()}}
    )
    return {"message": "All devices logged out successfully.", "data": []}


# ── Login History ──────────────────────────────────────────────────────────────

@router.get("/{role}/{user_id}/login-history")
async def get_login_history(role: str, user_id: str):
    r = _normalize_role(role)
    if not r:
        raise HTTPException(status_code=400, detail="Invalid role")
    col = _login_history_collection()
    history = []
    async for h in col.find({"userId": user_id}).sort("timestamp", -1).limit(20):
        h["_id"] = str(h["_id"])
        history.append(h)

    if not history:
        return [{"timestamp": _now_iso(), "status": "success", "ip": "127.0.0.1"}]
    return history


@router.get("/{user_id}/login-history")
async def get_login_history_by_userid(user_id: str):
    return await get_login_history("student", user_id)


# ── Export Data ────────────────────────────────────────────────────────────────

@router.get("/{role}/{user_id}/export-data")
async def export_data(role: str, user_id: str):
    r = _normalize_role(role)
    if not r:
        raise HTTPException(status_code=400, detail="Invalid role")
    settings = await _get_or_create_settings(r, user_id)
    settings.pop("_id", None)
    return {
        "fileName": f"{user_id}-settings-export.json",
        "data": {
            "userId": user_id,
            "role": r,
            "exportedAt": _now_iso(),
            "settings": settings,
        }
    }


@router.get("/{user_id}/export-data")
async def export_data_by_userid(user_id: str):
    return await export_data("student", user_id)


# ── Delete Request ─────────────────────────────────────────────────────────────

@router.post("/{role}/{user_id}/delete-request")
async def create_delete_request(role: str, user_id: str, body: dict = None):
    r = _normalize_role(role)
    if not r:
        raise HTTPException(status_code=400, detail="Invalid role")

    col = _delete_requests_collection()
    entry = {
        "id": f"DEL-{int(datetime.now(timezone.utc).timestamp())}",
        "userId": user_id,
        "role": r,
        "reason": (body or {}).get("reason", "User requested account deletion"),
        "requestedAt": _now_iso(),
        "status": "pending",
    }
    await col.insert_one(entry)
    entry.pop("_id", None)
    return {"message": "Account deletion request submitted.", "data": entry}


@router.post("/{user_id}/delete-request")
async def create_delete_request_by_userid(user_id: str, body: dict = None):
    return await create_delete_request("student", user_id, body)


# ── Admin System Settings (from mockBackend.js) ───────────────────────────────
# NOTE: moved to top of file — before wildcard routes — to avoid FastAPI shadowing.


# ── System endpoints (backup, restore, export, monitoring) ─────────────────────

@router.get("/system/export")  
async def system_export():
    import time
    return {
        "fileName": f"mit-connect-export-{int(time.time())}.csv",
        "url": "/downloads/mit-connect-export.csv",
    }


@router.post("/system/backup")
async def system_backup():
    backup_id = f"BKP-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{int(datetime.now(timezone.utc).timestamp())}"
    db = get_db()
    col = db["system_settings"]
    await col.update_one(
        {"type": "data-management"},
        {"$set": {"lastBackupId": backup_id}},
        upsert=True
    )
    return {"success": True, "backupId": backup_id}


@router.post("/system/restore")
async def system_restore(body: dict = None):
    backup_id = (body or {}).get("backupId", "BKP-unknown")
    return {"success": True, "restoredFrom": backup_id}


@router.get("/system/monitoring")
async def system_monitoring():
    import random
    return {
        "activeUsers": 342 + random.randint(0, 5),
        "failedLogins": 5 + random.randint(0, 2),
        "uptime": "99.9%",
        "errorLogs": 2,
        "polledAt": _now_iso(),
    }


# ── Users & Departments (admin settings page) ─────────────────────────────────

@router.get("/users")
async def list_users():
    db = get_db()
    seen_emails = set()
    users = []

    def add_user(uid, name, email, role, active):
        if not email:
            return
        email_lower = email.lower().strip()
        if email_lower in seen_emails:
            return
        seen_emails.add(email_lower)
        users.append({
            "id": uid,
            "name": name,
            "role": role,
            "email": email,
            "active": active
        })

    # 1. Query admin_users
    async for a in db["admin_users"].find():
        add_user(
            uid=a.get("userId") or str(a.get("_id")),
            name=a.get("name") or "Admin User",
            email=a.get("email"),
            role="admin",
            active=a.get("active", True)
        )

    # 2. Query finance_users
    async for fn in db["finance_users"].find():
        add_user(
            uid=fn.get("userId") or str(fn.get("_id")),
            name=fn.get("name") or "Finance User",
            email=fn.get("email"),
            role="finance",
            active=fn.get("active", True)
        )

    # 3. Query faculty
    async for f in db["faculty"].find():
        status = f.get("status") or f.get("employment_status") or "Active"
        add_user(
            uid=f.get("employee_id") or f.get("id") or str(f.get("_id")),
            name=f.get("name") or "Faculty User",
            email=f.get("email"),
            role="faculty",
            active=status == "Active"
        )

    # 4. Query students
    async for s in db["students"].find():
        status = s.get("status", "Active")
        add_user(
            uid=s.get("id") or s.get("rollNumber") or str(s.get("_id")),
            name=s.get("name") or "Student User",
            email=s.get("email"),
            role="student",
            active=status == "Active"
        )

    # 5. Query system_users (fallback/legacy)
    async for u in db["system_users"].find():
        add_user(
            uid=u.get("id") or str(u.get("_id")),
            name=u.get("name") or "System User",
            email=u.get("email"),
            role=u.get("role") or "student",
            active=u.get("active", True)
        )

    if not users:
        defaults = [
            {"id": 1, "name": "John", "role": "student", "email": "john@student.mitconnect.edu", "active": True},
            {"id": 2, "name": "Sara", "role": "faculty", "email": "sara@mitconnect.edu", "active": True},
            {"id": 3, "name": "Admin", "role": "admin", "email": "admin@mitconnect.edu", "active": True},
        ]
        await db["system_users"].insert_many(defaults)
        return defaults

    return users


@router.post("/users")
async def create_user(body: dict):
    db = get_db()
    col = db["system_users"]
    max_id = 0
    async for u in col.find().sort("id", -1).limit(1):
        max_id = u.get("id", 0)
    new_user = {
        "id": max_id + 1,
        "name": body.get("name", "New User"),
        "role": body.get("role", "student"),
        "email": body.get("email", f"user{max_id + 1}@mitconnect.edu"),
        "active": body.get("active", True),
    }
    await col.insert_one(new_user)
    new_user.pop("_id", None)
    return new_user


def _get_default_departments():
    return [
        {"id": 1, "name": "Computer Science & Engineering", "code": "CSE", "head": "Prof. Dr. Amjad Khan", "hod": "Prof. Dr. Amjad Khan", "totalFaculty": 24, "totalStudents": 312, "courses": 45, "email": "cse@mit.edu", "phone": "+91-9876543210", "location": "Building A, Floor 3", "description": "Excellence in computer science education and research", "mappedStaff": 24},
        {"id": 2, "name": "Electrical Engineering", "code": "EEE", "head": "Prof. K.V. Rao", "hod": "Prof. K.V. Rao", "totalFaculty": 18, "totalStudents": 256, "courses": 38, "email": "eee@mit.edu", "phone": "+91-9876543211", "location": "Building B, Floor 2", "description": "Power systems, control systems, and renewable energy focus", "mappedStaff": 18},
        {"id": 3, "name": "Mechanical Engineering", "code": "ME", "head": "Prof. S. Natarajan", "hod": "Prof. S. Natarajan", "totalFaculty": 22, "totalStudents": 298, "courses": 42, "email": "me@mit.edu", "phone": "+91-9876543212", "location": "Building C, Floor 1", "description": "Thermal engineering, manufacturing, and design specializations", "mappedStaff": 22},
        {"id": 4, "name": "Civil Engineering", "code": "CE", "head": "Prof. Ramesh Gupta", "hod": "Prof. Ramesh Gupta", "totalFaculty": 16, "totalStudents": 224, "courses": 35, "email": "ce@mit.edu", "phone": "+91-9876543213", "location": "Building D, Floor 2", "description": "Infrastructure, structures, and environmental engineering", "mappedStaff": 16},
        {"id": 5, "name": "Medicine & Health Sciences", "code": "MED", "head": "Prof. Dr. Sarah Johnson", "hod": "Prof. Dr. Sarah Johnson", "totalFaculty": 30, "totalStudents": 400, "courses": 50, "email": "medicine@mit.edu", "phone": "+91-9876543214", "location": "Medical Block, Floor 1", "description": "MBBS, Nursing, and Allied Health Sciences", "mappedStaff": 30},
        {"id": 6, "name": "Arts & Humanities", "code": "ART", "head": "Prof. Dr. Maya Sen", "hod": "Prof. Dr. Maya Sen", "totalFaculty": 15, "totalStudents": 220, "courses": 30, "email": "arts@mit.edu", "phone": "+91-9876543215", "location": "Arts Block, Floor 2", "description": "Literature, history, sociology and fine arts education", "mappedStaff": 15},
        {"id": 7, "name": "Business & Commerce", "code": "BUS", "head": "Prof. Dr. Rajesh Kumar", "hod": "Prof. Dr. Rajesh Kumar", "totalFaculty": 20, "totalStudents": 350, "courses": 40, "email": "business@mit.edu", "phone": "+91-9876543216", "location": "Management Block, Floor 3", "description": "Commerce, finance, and business administration programs", "mappedStaff": 20},
        {"id": 8, "name": "Science & Technology", "code": "SCI", "head": "Prof. Dr. Amit Verma", "hod": "Prof. Dr. Amit Verma", "totalFaculty": 18, "totalStudents": 280, "courses": 35, "email": "science@mit.edu", "phone": "+91-9876543217", "location": "Science Block, Floor 1", "description": "Physics, chemistry, mathematics, and biotechnology programs", "mappedStaff": 18},
    ]

def get_matching_dept_code(dept_val: str, dept_list: list) -> str:
    if not dept_val:
        return None
    val = dept_val.lower().strip()
    
    # 1. Exact match on code
    for d in dept_list:
        if d.get("code", "").lower() == val:
            return d.get("code")
            
    # 2. Exact match on name
    for d in dept_list:
        if d.get("name", "").lower() == val:
            return d.get("code")
            
    # 3. Partial match on name / code
    for d in dept_list:
        name = d.get("name", "").lower()
        code = d.get("code", "").lower()
        if val and (val in name or name in val or val in code or code in val):
            return d.get("code")
            
    # 4. Fallback check for standard code patterns, but only if they exist in active departments
    valid_codes = {d.get("code").upper() for d in dept_list if d.get("code")}
    
    if ("computer" in val or "cse" in val or "cs" in val) and "CSE" in valid_codes:
        return "CSE"
    if ("electrical" in val or "electronics" in val or "eee" in val or "ece" in val) and "EEE" in valid_codes:
        return "EEE"
    if ("mechanical" in val or "me" in val or "mech" in val) and "ME" in valid_codes:
        return "ME"
    if ("civil" in val or "ce" in val) and "CE" in valid_codes:
        return "CE"
    if ("medicine" in val or "med" in val or "mbbs" in val or "health" in val) and "MED" in valid_codes:
        return "MED"
    if ("arts" in val or "humanities" in val or "art" in val) and "ART" in valid_codes:
        return "ART"
    if ("business" in val or "commerce" in val or "bus" in val or "com" in val) and "BUS" in valid_codes:
        return "BUS"
    if ("science" in val or "sci" in val) and "SCI" in valid_codes:
        return "SCI"
        
    return None

@router.get("/departments")
async def list_departments():
    try:
        db = get_db()
        use_db = True
    except Exception:
        db = None
        use_db = False

    if use_db:
        col = db["system_departments"]
        depts = []
        async for d in col.find():
            d["_id"] = str(d["_id"])
            depts.append(d)
        if not depts:
            depts = _get_default_departments()
            await col.insert_many(deepcopy(depts))
    else:
        depts = _get_default_departments()

    student_counts = {}
    faculty_counts = {}
    course_counts = {}

    if use_db:
        # Collect counts & courses from students
        async for s in db["students"].find({}, {"department": 1, "subjects": 1}):
            dept_code = get_matching_dept_code(s.get("department"), depts)
            if dept_code:
                student_counts[dept_code] = student_counts.get(dept_code, 0) + 1
                subjects = s.get("subjects") or []
                if dept_code not in course_counts:
                    course_counts[dept_code] = set()
                for sub in subjects:
                    sub_code = sub.get("code") or sub.get("name")
                    if sub_code:
                        course_counts[dept_code].add(str(sub_code))
                        
        # Collect counts & courses from faculty
        async for f in db["faculty"].find({}, {"department": 1, "departmentId": 1, "department_id": 1, "courses": 1, "teaching_load": 1}):
            dept = f.get("department") or f.get("departmentId") or f.get("department_id")
            dept_code = get_matching_dept_code(dept, depts)
            if dept_code:
                faculty_counts[dept_code] = faculty_counts.get(dept_code, 0) + 1
                
                f_courses = f.get("courses") or []
                t_load = f.get("teaching_load") or []
                
                if dept_code not in course_counts:
                    course_counts[dept_code] = set()
                    
                for c in f_courses:
                    if isinstance(c, dict):
                        c_code = c.get("courseCode") or c.get("course_code") or c.get("courseName")
                    else:
                        c_code = c
                    if c_code:
                        course_counts[dept_code].add(str(c_code))
                        
                for t in t_load:
                    if isinstance(t, dict):
                        t_code = t.get("courseCode") or t.get("course_code") or t.get("subject") or t.get("course")
                        if t_code:
                            course_counts[dept_code].add(str(t_code))
    else:
        from backend.dev_store import DEV_STORE
        # Collect counts & courses from DEV_STORE students
        for s in DEV_STORE.get("students", []):
            dept_code = get_matching_dept_code(s.get("department"), depts)
            if dept_code:
                student_counts[dept_code] = student_counts.get(dept_code, 0) + 1
                subjects = s.get("subjects") or []
                if dept_code not in course_counts:
                    course_counts[dept_code] = set()
                for sub in subjects:
                    sub_code = sub.get("code") or sub.get("name")
                    if sub_code:
                        course_counts[dept_code].add(str(sub_code))
                        
        # Collect counts & courses from DEV_STORE faculty
        for f in DEV_STORE.get("faculty", []):
            dept = f.get("department") or f.get("departmentId") or f.get("department_id")
            dept_code = get_matching_dept_code(dept, depts)
            if dept_code:
                faculty_counts[dept_code] = faculty_counts.get(dept_code, 0) + 1
                
                f_courses = f.get("courses") or []
                t_load = f.get("teaching_load") or []
                
                if dept_code not in course_counts:
                    course_counts[dept_code] = set()
                    
                for c in f_courses:
                    if isinstance(c, dict):
                        c_code = c.get("courseCode") or c.get("course_code") or c.get("courseName")
                    else:
                        c_code = c
                    if c_code:
                        course_counts[dept_code].add(str(c_code))
                        
                for t in t_load:
                    if isinstance(t, dict):
                        t_code = t.get("courseCode") or t.get("course_code") or t.get("subject") or t.get("course")
                        if t_code:
                            course_counts[dept_code].add(str(t_code))

    for d in depts:
        code = d.get("code")
        d["totalStudents"] = student_counts.get(code, 0)
        d["totalFaculty"] = faculty_counts.get(code, 0)
        d["mappedStaff"] = faculty_counts.get(code, 0)
        d["courses"] = len(course_counts[code]) if code in course_counts else 0

    return depts


@router.post("/departments")
async def create_department(body: dict):
    db = get_db()
    col = db["system_departments"]
    max_id = 0
    async for d in col.find().sort("id", -1).limit(1):
        max_id = d.get("id", 0)
    new_dept = {
        "id": max_id + 1,
        "name": body.get("name", "New Department"),
        "code": body.get("code", f"DEP-{max_id + 1}"),
        "head": body.get("head", body.get("hod", "TBD")),
        "hod": body.get("hod", body.get("head", "TBD")),
        "totalFaculty": body.get("totalFaculty", 0),
        "totalStudents": body.get("totalStudents", 0),
        "courses": body.get("courses", 0),
        "email": body.get("email", ""),
        "phone": body.get("phone", ""),
        "location": body.get("location", ""),
        "description": body.get("description", ""),
        "mappedStaff": body.get("mappedStaff", body.get("totalFaculty", 0)),
    }
    await col.insert_one(new_dept)
    new_dept.pop("_id", None)
    return new_dept


@router.put("/departments/{dept_id}")
async def update_department(dept_id: int, body: dict):
    db = get_db()
    col = db["system_departments"]
    # Remove fields that shouldn't be overwritten
    body.pop("_id", None)
    body.pop("id", None)
    result = await col.find_one_and_update(
        {"id": dept_id},
        {"$set": body},
        return_document=True
    )
    if not result:
        raise HTTPException(status_code=404, detail="Department not found")
    result["_id"] = str(result["_id"])
    return result


@router.delete("/departments/{dept_id}")
async def delete_department(dept_id: int):
    db = get_db()
    col = db["system_departments"]
    result = await col.delete_one({"id": dept_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Department not found")
    return {"message": "Department deleted"}


@router.put("/users")
async def replace_users(body: list[dict]):
    db = get_db()
    col = db["system_users"]
    
    # 1. Fetch previous list of users to identify deletions
    prev_users = []
    async for pu in col.find():
        prev_users.append(pu)
        
    # 2. Re-create system_users collection content
    await col.delete_many({})
    for u in body:
        u.pop("_id", None)
    if body:
        await col.insert_many(body)
        
    # 3. Synchronize deletions
    new_emails = {u.get("email") for u in body if u.get("email")}
    for pu in prev_users:
        p_email = pu.get("email")
        p_role = pu.get("role")
        if p_email and p_email not in new_emails:
            if p_role == "student":
                await db["students"].delete_many({"email": p_email})
            elif p_role == "faculty":
                await db["faculty"].delete_many({"email": p_email})
                await db["staff_Details"].delete_many({"email": p_email})
            elif p_role == "admin":
                await db["admin_users"].delete_many({"email": p_email})
            elif p_role == "finance":
                await db["finance_users"].delete_many({"email": p_email})
                
    # 4. Synchronize additions / updates
    for u in body:
        name = u.get("name")
        email = u.get("email")
        role = u.get("role")
        active = u.get("active", True)
        
        if not email:
            continue
            
        if role == "student":
            student = await db["students"].find_one({"email": email})
            if student:
                await db["students"].update_many(
                    {"email": email},
                    {"$set": {"name": name, "status": "Active" if active else "Suspended"}}
                )
            else:
                uid = f"STU-{datetime.now(timezone.utc).year}-{random.randint(1000, 9999)}"
                new_stu = {
                    "id": uid,
                    "rollNumber": uid,
                    "roll_number": uid,
                    "name": name,
                    "email": email,
                    "status": "Active" if active else "Suspended",
                    "password": "student123",
                    "department": "Computer Science",
                    "subjects": [],
                    "fees": [],
                    "documents": [],
                    "cgpa": 0.0,
                    "attendancePct": 100,
                }
                await db["students"].insert_one(new_stu)
                
        elif role == "faculty":
            faculty = await db["faculty"].find_one({"email": email})
            if faculty:
                await db["faculty"].update_many(
                    {"email": email},
                    {"$set": {"name": name, "employment_status": "Active" if active else "Suspended"}}
                )
                await db["staff_Details"].update_many(
                    {"email": email},
                    {"$set": {"staffName": name}}
                )
            else:
                uid = f"FAC-{random.randint(100, 999)}"
                new_fac = {
                    "id": uid,
                    "employeeId": uid,
                    "employee_id": uid,
                    "name": name,
                    "email": email,
                    "status": "Active" if active else "Suspended",
                    "employment_status": "Active" if active else "Suspended",
                    "password": "faculty123",
                    "department_id": "CS",
                    "departmentId": "Computer Science",
                    "designation": "Assistant Professor",
                }
                await db["faculty"].insert_one(new_fac)
                
        elif role == "admin":
            admin = await db["admin_users"].find_one({"email": email})
            if admin:
                await db["admin_users"].update_many(
                    {"email": email},
                    {"$set": {"name": name}}
                )
            else:
                uid = f"ADM-{random.randint(1000, 9999)}"
                new_adm = {
                    "userId": uid,
                    "id": uid,
                    "name": name,
                    "email": email,
                    "password": "admin123",
                    "role": "admin",
                    "createdAt": datetime.now(timezone.utc).isoformat(),
                }
                await db["admin_users"].insert_one(new_adm)
                
        elif role == "finance":
            finance = await db["finance_users"].find_one({"email": email})
            if finance:
                await db["finance_users"].update_many(
                    {"email": email},
                    {"$set": {"name": name}}
                )
            else:
                uid = f"FIN-{random.randint(100, 999)}"
                new_fin = {
                    "userId": uid,
                    "id": uid,
                    "name": name,
                    "email": email,
                    "password": "finance123",
                    "role": "finance",
                    "createdAt": datetime.now(timezone.utc).isoformat(),
                }
                await db["finance_users"].insert_one(new_fin)

    return {"message": "User directory replaced successfully."}


@router.put("/departments")
async def replace_departments(body: list[dict]):
    db = get_db()
    col = db["system_departments"]
    await col.delete_many({})
    for d in body:
        d.pop("_id", None)
    if body:
        await col.insert_many(body)
    return {"message": "Departments replaced successfully."}

