from typing import Optional
from fastapi import APIRouter, HTTPException, Body

from backend.schemas.settings import (
    ChangePasswordPayload,
    DeleteRequestPayload,
    LogoutAllPayload,
    PartialSettingsPayload,
    UpdateEmailPayload,
)
from backend.stores.settings_store import (
    create_delete_request,
    export_user_data,
    get_credential,
    get_login_history,
    get_section,
    get_sessions,
    get_user_record,
    infer_role_by_user_id,
    logout_all_sessions,
    normalize_role,
    update_credential,
    update_section,
)

router = APIRouter(prefix="/api/settings", tags=["settings"])


def _require_role(role: str) -> str:
    normalized = normalize_role(role)
    if not normalized:
        raise HTTPException(status_code=400, detail="Invalid role. Allowed values: student, faculty, finance, admin.")
    return normalized


def _resolve_user_role(role: Optional[str], user_id: str) -> str:
    if role:
        return _require_role(role)
    inferred = infer_role_by_user_id(user_id)
    if not inferred:
        raise HTTPException(status_code=404, detail="User not found.")
    return inferred


@router.post("/change-password")
async def change_password(payload: ChangePasswordPayload):
    existing = get_credential(payload.userId)
    if not existing:
        raise HTTPException(status_code=404, detail="User account not found.")
    if existing != payload.oldPassword:
        raise HTTPException(status_code=400, detail="Current password is incorrect.")
    if len(payload.newPassword) < 8:
        raise HTTPException(status_code=400, detail="New password must contain at least 8 characters.")

    update_credential(payload.userId, payload.newPassword)
    return {"message": "Password changed successfully."}


@router.put("/email")
async def update_email(payload: UpdateEmailPayload):
    role = normalize_role(payload.role) or infer_role_by_user_id(payload.userId)
    if not role:
        raise HTTPException(status_code=404, detail="User account not found for email update.")

    updated = update_section(role, payload.userId, "profile", {"email": payload.email})
    if not updated:
        raise HTTPException(status_code=404, detail="Profile not found for email update.")
    return {"message": "Email updated successfully.", "data": {"email": updated.get("email", "")}}


@router.get("/faculty/{user_id}/teaching")
async def get_teaching_preferences(user_id: str):
    teaching = get_section("faculty", user_id, "teachingPreferences")
    if not teaching:
        raise HTTPException(status_code=404, detail="Teaching preferences not found for faculty user.")
    return teaching


@router.put("/faculty/{user_id}/teaching")
async def update_teaching_preferences(user_id: str, payload: PartialSettingsPayload):
    updated = update_section("faculty", user_id, "teachingPreferences", payload.as_dict())
    if not updated:
        raise HTTPException(status_code=404, detail="Teaching preferences not found for faculty user.")
    return {"message": "Teaching preferences updated successfully", "data": updated}


@router.get("/{role}/{user_id}/profile")
async def get_profile_by_role(role: str, user_id: str):
    profile = get_section(_require_role(role), user_id, "profile")
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found for user.")
    return profile


@router.put("/{role}/{user_id}/profile")
async def update_profile_by_role(role: str, user_id: str, payload: PartialSettingsPayload):
    updated = update_section(_require_role(role), user_id, "profile", payload.as_dict())
    if not updated:
        raise HTTPException(status_code=404, detail="Profile not found for user.")
    return {"message": "Profile updated successfully", "data": updated}


# ===== DEPARTMENTS MANAGEMENT =====

@router.get("/departments")
async def get_departments():
    try:
        from backend.db import get_db
        db = get_db()
        collection = db["departments"]
        depts = []
        async for doc in collection.find({}):
            doc["id"] = str(doc.get("_id", doc.get("id")))
            doc.pop("_id", None)
            depts.append(doc)
        if depts:
            return depts
    except Exception:
        pass

    from backend.dev_store import DEV_STORE
    return DEV_STORE.setdefault("departments", [
        { "id": 'DEPT-MLT', "name": 'Medical Laboratory Technology', "code": 'MLT', "head": 'Department Head', "email": 'mlt@dschs.edu.in', "phone": '+91 98765 43210', "office_location": 'Health Sciences Block, Room 101', "totalFaculty": 0, "totalStudents": 0, "courses": 1, "description": "B.Sc. Medical Laboratory Technology (3 Years + 1 Year Internship)" },
        { "id": 'DEPT-OTAT', "name": 'Operation Theatre & Anaesthesia Technology', "code": 'OTAT', "head": 'Department Head', "email": 'otat@dschs.edu.in', "phone": '+91 98765 43211', "office_location": 'Operation Theatre Complex, Block B', "totalFaculty": 0, "totalStudents": 0, "courses": 1, "description": "B.Sc. Operation Theatre and Anaesthesia Technology (3 Years + 1 Year Internship)" },
        { "id": 'DEPT-RIT', "name": 'Radiography & Imaging Technology', "code": 'RIT', "head": 'Department Head', "email": 'rit@dschs.edu.in', "phone": '+91 98765 43212', "office_location": 'Department of Radiology, Block C', "totalFaculty": 0, "totalStudents": 0, "courses": 1, "description": "B.Sc. Radiography and Imaging Technology (3 Years + 1 Year Internship)" },
    ])

@router.post("/departments")
async def create_department(payload: dict = Body(...)):
    from backend.dev_store import DEV_STORE
    depts = DEV_STORE.setdefault("departments", [
        { "id": 'DEPT-MLT', "name": 'Medical Laboratory Technology', "code": 'MLT', "head": 'Department Head', "email": 'mlt@dschs.edu.in', "phone": '+91 98765 43210', "office_location": 'Health Sciences Block, Room 101', "totalFaculty": 0, "totalStudents": 0, "courses": 1, "description": "B.Sc. Medical Laboratory Technology (3 Years + 1 Year Internship)" },
        { "id": 'DEPT-OTAT', "name": 'Operation Theatre & Anaesthesia Technology', "code": 'OTAT', "head": 'Department Head', "email": 'otat@dschs.edu.in', "phone": '+91 98765 43211', "office_location": 'Operation Theatre Complex, Block B', "totalFaculty": 0, "totalStudents": 0, "courses": 1, "description": "B.Sc. Operation Theatre and Anaesthesia Technology (3 Years + 1 Year Internship)" },
        { "id": 'DEPT-RIT', "name": 'Radiography & Imaging Technology', "code": 'RIT', "head": 'Department Head', "email": 'rit@dschs.edu.in', "phone": '+91 98765 43212', "office_location": 'Department of Radiology, Block C', "totalFaculty": 0, "totalStudents": 0, "courses": 1, "description": "B.Sc. Radiography and Imaging Technology (3 Years + 1 Year Internship)" },
    ])
    from uuid import uuid4
    dept_id = payload.get("id") or f"DEPT-{uuid4().hex[:8].upper()}"
    payload["id"] = dept_id
    
    # DEV_STORE sync
    existing_idx = next((i for i, d in enumerate(depts) if d.get("id") == dept_id or d.get("code") == payload.get("code")), None)
    if existing_idx is not None:
        depts[existing_idx] = payload
    else:
        depts.append(payload)

    # MongoDB sync if available
    try:
        from backend.db import get_db
        db = get_db()
        await db["departments"].update_one({"id": dept_id}, {"$set": payload}, upsert=True)
    except Exception:
        pass

    return payload

@router.put("/departments/{dept_id}")
async def update_department(dept_id: str, payload: dict = Body(...)):
    from backend.dev_store import DEV_STORE
    depts = DEV_STORE.setdefault("departments", [])
    payload["id"] = dept_id
    
    updated = False
    for i, d in enumerate(depts):
        if d.get("id") == dept_id or d.get("code") == payload.get("code"):
            depts[i] = payload
            updated = True
            break
    if not updated:
        depts.append(payload)
        
    try:
        from backend.db import get_db
        db = get_db()
        await db["departments"].update_one({"id": dept_id}, {"$set": payload}, upsert=True)
    except Exception:
        pass

    return payload

@router.delete("/departments/{dept_id}")
async def delete_department(dept_id: str):
    from backend.dev_store import DEV_STORE
    depts = DEV_STORE.setdefault("departments", [])
    DEV_STORE["departments"] = [d for d in depts if d.get("id") != dept_id]
    
    try:
        from backend.db import get_db
        db = get_db()
        await db["departments"].delete_one({"id": dept_id})
    except Exception:
        pass

    return {"message": "Department deleted"}


@router.get("/{role}/{user_id}/notifications")
async def get_notifications_by_role(role: str, user_id: str):
    resolved_role = _require_role(role)
    notifications = get_section(resolved_role, user_id, "notifications")
    if notifications is None:
        from backend.stores.settings_store import _student_seed, _faculty_seed, _finance_seed, _admin_seed
        if resolved_role == "student":
            return _student_seed()["notifications"]
        elif resolved_role == "faculty":
            return _faculty_seed()["notifications"]
        elif resolved_role == "finance":
            return _finance_seed()["notifications"]
        elif resolved_role == "admin":
            return _admin_seed()["notifications"]
        else:
            return {}
    return notifications


@router.put("/{role}/{user_id}/notifications")
async def update_notifications_by_role(role: str, user_id: str, payload: PartialSettingsPayload):
    resolved_role = _require_role(role)
    updated = update_section(resolved_role, user_id, "notifications", payload.as_dict())
    if not updated:
        raise HTTPException(status_code=404, detail="Notification preferences not found for user.")
    return {"message": "Notification preferences updated successfully", "data": updated}


@router.get("/{user_id}/sessions")
@router.get("/{role}/{user_id}/sessions")
async def get_user_sessions(user_id: str, role: Optional[str] = None):
    _resolve_user_role(role, user_id)
    return get_sessions(user_id)


@router.post("/logout-all")
async def logout_all(payload: LogoutAllPayload):
    _resolve_user_role(payload.role, payload.userId)
    sessions = logout_all_sessions(payload.userId)
    return {"message": "All devices logged out successfully.", "data": sessions}


@router.get("/{user_id}/login-history")
@router.get("/{role}/{user_id}/login-history")
async def get_user_login_history(user_id: str, role: Optional[str] = None):
    _resolve_user_role(role, user_id)
    return get_login_history(user_id)


@router.get("/{user_id}/appearance")
@router.get("/{role}/{user_id}/appearance")
async def get_appearance(user_id: str, role: Optional[str] = None):
    resolved_role = _resolve_user_role(role, user_id)
    user = get_user_record(resolved_role, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    return user["record"].get("appearance", {})


@router.put("/{user_id}/appearance")
@router.put("/{role}/{user_id}/appearance")
async def update_appearance(user_id: str, payload: PartialSettingsPayload, role: Optional[str] = None):
    resolved_role = _resolve_user_role(role, user_id)
    updated = update_section(resolved_role, user_id, "appearance", payload.as_dict())
    return {"message": "Appearance settings updated successfully.", "data": updated}


@router.get("/{user_id}/language")
@router.get("/{role}/{user_id}/language")
async def get_language(user_id: str, role: Optional[str] = None):
    resolved_role = _resolve_user_role(role, user_id)
    user = get_user_record(resolved_role, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    return user["record"].get("language", {})


@router.put("/{user_id}/language")
@router.put("/{role}/{user_id}/language")
async def update_language(user_id: str, payload: PartialSettingsPayload, role: Optional[str] = None):
    resolved_role = _resolve_user_role(role, user_id)
    updated = update_section(resolved_role, user_id, "language", payload.as_dict())
    return {"message": "Language & region settings updated successfully.", "data": updated}


@router.get("/{user_id}/privacy")
@router.get("/{role}/{user_id}/privacy")
async def get_privacy(user_id: str, role: Optional[str] = None):
    resolved_role = _resolve_user_role(role, user_id)
    user = get_user_record(resolved_role, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    return user["record"].get("privacy", {})


@router.put("/{user_id}/privacy")
@router.put("/{role}/{user_id}/privacy")
async def update_privacy(user_id: str, payload: PartialSettingsPayload, role: Optional[str] = None):
    resolved_role = _resolve_user_role(role, user_id)
    updated = update_section(resolved_role, user_id, "privacy", payload.as_dict())
    return {"message": "Privacy settings updated successfully.", "data": updated}


@router.get("/{user_id}/accessibility")
@router.get("/{role}/{user_id}/accessibility")
async def get_accessibility(user_id: str, role: Optional[str] = None):
    resolved_role = _resolve_user_role(role, user_id)
    user = get_user_record(resolved_role, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    return user["record"].get("accessibility", {})


@router.put("/{user_id}/accessibility")
@router.put("/{role}/{user_id}/accessibility")
async def update_accessibility(user_id: str, payload: PartialSettingsPayload, role: Optional[str] = None):
    resolved_role = _resolve_user_role(role, user_id)
    updated = update_section(resolved_role, user_id, "accessibility", payload.as_dict())
    return {"message": "Accessibility settings updated successfully.", "data": updated}


@router.get("/{user_id}/export-data")
@router.get("/{role}/{user_id}/export-data")
async def export_data(user_id: str, role: Optional[str] = None):
    _resolve_user_role(role, user_id)
    data = export_user_data(user_id)
    if not data:
        raise HTTPException(status_code=404, detail="User not found.")
    return {"fileName": f"{user_id}-settings-export.json", "data": data}


@router.post("/{user_id}/delete-request")
@router.post("/{role}/{user_id}/delete-request")
async def request_account_deletion(user_id: str, payload: DeleteRequestPayload, role: Optional[str] = None):
    resolved_role = _resolve_user_role(role, user_id)
    entry = create_delete_request(user_id, resolved_role, payload.reason)
    return {"message": "Account deletion request submitted.", "data": entry}



