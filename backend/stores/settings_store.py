from typing import Optional, Union
from copy import deepcopy
from datetime import datetime, timezone


def _utc_now() -> str:
    return datetime.now(tz=timezone.utc).isoformat().replace("+00:00", "Z")


def _student_seed(overrides: Optional[dict] = None) -> dict:
    data = {
        "profile": {
            "name": "Arun Kumar",
            "email": "arun@student.edu",
            "phone": "9876543210",
            "bio": "Computer Science Student",
            "address": "Chennai",
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
    if overrides:
        data.update(overrides)
    return data


def _faculty_seed(overrides: Optional[dict] = None) -> dict:
    data = {
        "profile": {
            "name": "Dr. Ravi",
            "email": "ravi@faculty.edu",
            "department": "Computer Science",
            "phone": "9123456789",
            "bio": "Associate Professor - Distributed Systems",
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
    if overrides:
        data.update(overrides)
    return data


def _finance_seed(overrides: Optional[dict] = None) -> dict:
    data = {
        "profile": {
            "name": "Finance Officer",
            "email": "finance@mit.edu",
            "department": "Finance",
            "phone": "",
            "bio": "Finance Department",
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
    if overrides:
        data.update(overrides)
    return data

def _admin_seed(overrides: Optional[dict] = None) -> dict:
    data = {
        "profile": {
            "name": "Admin",
            "email": "admin@mit.edu",
            "department": "Administration",
            "phone": "",
            "bio": "System Administrator",
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
    if overrides:
        data.update(overrides)
    return data


_now = _utc_now()

SETTINGS_DB = {
    "students": {
        "stu_101": _student_seed(),
        "STU-2024-1547": _student_seed(
            {
                "profile": {
                    "name": "John Anderson",
                    "email": "john@student.edu",
                    "phone": "9876543211",
                    "bio": "Final Year CSE Student",
                    "address": "Coimbatore",
                }
            }
        ),
    },
    "faculty": {
        "fac_201": _faculty_seed(),
        "FAC-204": _faculty_seed(
            {
                "profile": {
                    "name": "Dr. Rajesh Iyer",
                    "email": "rajesh@faculty.edu",
                    "department": "School of Engineering",
                    "phone": "9123456790",
                    "bio": "Faculty Coordinator - Software Engineering",
                },
                "teachingPreferences": {
                    "preferredMode": "Offline",
                    "officeHours": "2 PM - 4 PM",
                    "autoPublishGrades": True,
                },
            }
        ),
    },
    "finance": {
        "FIN-880": _finance_seed(),
        "fin_001": _finance_seed(),  # legacy alias
    },
    "admin": {
        "ADM-0001": _admin_seed(),
        "admin_001": _admin_seed(),  # legacy alias
    },
    "credentials": {
        "stu_101": "student123",
        "STU-2024-1547": "student123",
        "fac_201": "faculty123",
        "FAC-204": "faculty123",
    },
    "sessions": {
        "stu_101": [
            {"id": "sess-stu-1", "device": "Chrome on Windows", "location": "Chennai", "active": True, "lastSeen": _now},
            {"id": "sess-stu-2", "device": "Android App", "location": "Chennai", "active": False, "lastSeen": "2026-03-09T08:00:00Z"},
        ],
        "STU-2024-1547": [
            {"id": "sess-stu-3", "device": "Edge on Windows", "location": "Coimbatore", "active": True, "lastSeen": _now}
        ],
        "fac_201": [
            {"id": "sess-fac-1", "device": "Safari on Mac", "location": "Bengaluru", "active": True, "lastSeen": _now}
        ],
        "FAC-204": [
            {"id": "sess-fac-2", "device": "Chrome on Windows", "location": "Chennai", "active": True, "lastSeen": _now}
        ],
    },
    "loginHistory": {
        "stu_101": [
            {"timestamp": _now, "status": "success", "ip": "10.10.2.45"},
            {"timestamp": "2026-03-10T17:22:00Z", "status": "success", "ip": "10.10.2.45"},
            {"timestamp": "2026-03-08T12:10:00Z", "status": "failed", "ip": "10.10.2.45"},
        ],
        "STU-2024-1547": [
            {"timestamp": _now, "status": "success", "ip": "10.10.3.76"},
            {"timestamp": "2026-03-09T09:15:00Z", "status": "success", "ip": "10.10.3.76"},
        ],
        "fac_201": [
            {"timestamp": _now, "status": "success", "ip": "10.10.6.25"},
            {"timestamp": "2026-03-10T08:52:00Z", "status": "success", "ip": "10.10.6.25"},
        ],
        "FAC-204": [
            {"timestamp": _now, "status": "success", "ip": "10.10.5.89"},
            {"timestamp": "2026-03-09T07:40:00Z", "status": "failed", "ip": "10.10.5.89"},
        ],
    },
    "deleteRequests": [],
}


def normalize_role(role: Optional[str]) -> Optional[str]:
    if not role:
        return None
    lowered = role.lower()
    if lowered in {"student", "students"}:
        return "student"
    if lowered == "faculty":
        return "faculty"
    if lowered in {"finance", "admin"}:
        return lowered
    return None


def infer_role_by_user_id(user_id: str) -> Optional[str]:
    if user_id in SETTINGS_DB["students"]:
        return "student"
    if user_id in SETTINGS_DB["faculty"]:
        return "faculty"
    if user_id in SETTINGS_DB.get("finance", {}):
        return "finance"
    if user_id in SETTINGS_DB.get("admin", {}):
        return "admin"
    return None


def get_user_record(role: Optional[str], user_id: str) -> Optional[dict]:
    resolved_role = normalize_role(role) or infer_role_by_user_id(user_id)
    if not resolved_role:
        return None
    if resolved_role == "faculty":
        bucket = SETTINGS_DB["faculty"]
    elif resolved_role == "finance":
        bucket = SETTINGS_DB.setdefault("finance", {})
    elif resolved_role == "admin":
        bucket = SETTINGS_DB.setdefault("admin", {})
    else:
        bucket = SETTINGS_DB["students"]
    record = bucket.get(user_id)
    if not record:
        # Auto-create default settings for unknown user
        if resolved_role == "student":
            bucket[user_id] = _student_seed()
        elif resolved_role == "faculty":
            bucket[user_id] = _faculty_seed()
        elif resolved_role == "finance":
            bucket[user_id] = _finance_seed()
        elif resolved_role == "admin":
            bucket[user_id] = _admin_seed()
        else:
            return None
        record = bucket[user_id]
    return {"role": resolved_role, "record": record}


def get_section(role: Optional[str], user_id: str, section: str) -> Union[dict, Optional[list]]:
    user = get_user_record(role, user_id)
    if not user:
        return None
    value = user["record"].get(section)
    return deepcopy(value) if value is not None else None


def update_section(role: Optional[str], user_id: str, section: str, payload: dict) -> Optional[dict]:
    user = get_user_record(role, user_id)
    if not user:
        return None
    current = user["record"].get(section, {})
    merged = {**current, **(payload or {})}
    user["record"][section] = merged
    return deepcopy(merged)


def get_notification_prefs(role: str, user_id: str) -> dict:
    """Return notification preferences for a user. Falls back to empty dict (all enabled)."""
    prefs = get_section(role, user_id, "notifications")
    return prefs or {}


def get_credential(user_id: str) -> Optional[str]:
    return SETTINGS_DB["credentials"].get(user_id)


def update_credential(user_id: str, password: str) -> None:
    SETTINGS_DB["credentials"][user_id] = password


def get_sessions(user_id: str) -> list[dict]:
    return deepcopy(SETTINGS_DB["sessions"].get(user_id, []))


def logout_all_sessions(user_id: str) -> list[dict]:
    sessions = SETTINGS_DB["sessions"].get(user_id, [])
    SETTINGS_DB["sessions"][user_id] = [{**entry, "active": False, "lastSeen": _utc_now()} for entry in sessions]
    return deepcopy(SETTINGS_DB["sessions"][user_id])


def get_login_history(user_id: str) -> list[dict]:
    return deepcopy(SETTINGS_DB["loginHistory"].get(user_id, []))


def create_delete_request(user_id: str, role: str, reason: Optional[str] = None) -> dict:
    entry = {
        "id": f"DEL-{int(datetime.now(tz=timezone.utc).timestamp())}",
        "userId": user_id,
        "role": role,
        "reason": reason or "User requested account deletion",
        "requestedAt": _utc_now(),
        "status": "pending",
    }
    SETTINGS_DB["deleteRequests"].append(entry)
    return deepcopy(entry)


def export_user_data(user_id: str) -> Optional[dict]:
    role = infer_role_by_user_id(user_id)
    if not role:
        return None
    user = get_user_record(role, user_id)
    if not user:
        return None
    return {
        "userId": user_id,
        "role": role,
        "exportedAt": _utc_now(),
        "settings": deepcopy(user["record"]),
        "sessions": get_sessions(user_id),
        "loginHistory": get_login_history(user_id),
    }
