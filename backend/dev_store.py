from typing import Optional
from copy import deepcopy
from datetime import datetime
from uuid import uuid4


def _make_id(prefix: str) -> str:
    return f"{prefix}_{uuid4().hex[:12]}"


DEV_STORE = {
    "exams": [],
    "timetables": {},
    "placements": [],
    "facilities": [],
    "facility_bookings": [],
    "attendance": [],
    "attendance_markings": {},
    "attendance_weekly": [
        {"day": "Mon", "attendance": 92},
        {"day": "Tue", "attendance": 88},
        {"day": "Wed", "attendance": 90},
        {"day": "Thu", "attendance": 86},
        {"day": "Fri", "attendance": 94},
    ],
    "notifications": [
        {
            "id": "notif_fin_001",
            "title": "Semester Fee Collection Active",
            "message": "Fee collection for Semester 4 (2025-26) is now open. Please start tracking student payments.",
            "senderRole": "admin",
            "receiverRole": "finance",
            "module": "Finance",
            "priority": "High",
            "status": "unread",
            "createdAt": "2026-04-19T08:30:00Z",
            "relatedData": {
                "semester": "Semester 4",
                "total_target": "₹45,00,000"
            }
        },
        {
            "id": "notif_fin_002",
            "title": "Payroll Disbursed - Staff",
            "message": "Monthly salary for all teaching and non-teaching staff has been credited to accounts.",
            "senderRole": "system",
            "receiverRole": "finance",
            "module": "Finance",
            "priority": "Medium",
            "status": "read",
            "createdAt": "2026-04-18T16:45:00Z",
            "relatedData": {
                "month": "March 2026",
                "staff_count": 142
            }
        },
        {
            "id": "notif_fin_003",
            "title": "Audit Report Overdue",
            "message": "The internal audit report for Q3 is overdue. Please submit it by Friday EOD.",
            "senderRole": "admin",
            "receiverRole": "finance",
            "module": "Administrative",
            "priority": "Critical",
            "status": "unread",
            "createdAt": "2026-04-19T09:15:00Z"
        },
        {
            "id": "notif_fin_004",
            "title": "Scholarship Approval Needed",
            "message": "15 new merit scholarship applications are awaiting financial verification.",
            "senderRole": "system",
            "receiverRole": "finance",
            "module": "Finance",
            "priority": "High",
            "status": "unread",
            "createdAt": "2026-04-19T07:20:00Z"
        },
        {
            "id": "notif_fin_005",
            "title": "Vendor Payment Pending",
            "message": "Payment for lab equipment maintenance (Invoice #INV-2942) is pending for 3 days.",
            "senderRole": "system",
            "receiverRole": "finance",
            "module": "Alerts",
            "priority": "Medium",
            "status": "unread",
            "createdAt": "2026-04-17T11:00:00Z"
        },
        {
            "id": "notif_sys_001",
            "title": "System Maintenance",
            "message": "The Finance portal will be down for scheduled maintenance on Sunday, April 20th, from 02:00 AM to 04:00 AM.",
            "senderRole": "admin",
            "receiverRole": "ALL",
            "module": "System",
            "priority": "Medium",
            "status": "unread",
            "createdAt": "2026-04-19T05:00:00Z"
        }
    ],
    "students": [],
    "od_requests": [],
    "invoices": [],
    "newsletters": [
        {
            "id": "news_001",
            "title": "Placement Drive: TechCorp Recruitment 2026",
            "summary": "TechCorp is visiting campus for a mega placement drive for CS, IT and ECE graduates. registrations close this Friday.",
            "content": "### Mega Placement Drive by TechCorp\n\nWe are pleased to announce that TechCorp, a global software leader, is visiting our campus for a placement drive.\n\n- **Role**: Associate Software Engineer\n- **Eligibility**: final year B.Tech/M.Tech (CS, IT, ECE) with CGPA >= 7.5\n- **Salary Package**: ₹12,00,000 per annum\n- **Selection Process**: Online Coding Test followed by Technical & HR Interviews\n- **Date**: May 15, 2026\n- **Registration Deadline**: April 24, 2026, EOD\n\nEligible students must register via the Placement Portal and upload their updated resumes immediately. Contact the Placement Cell for any queries.",
            "category": "Placement",
            "author": "Campus Placement Cell",
            "targetRoles": ["ALL"],
            "publishedAt": "2026-04-18T09:00:00Z"
        },
        {
            "id": "news_002",
            "title": "Annual Cultural Fest 'MILANGE 2026' Announced",
            "summary": "Get ready for the biggest event of the year! Milange 2026 will be held from May 5th to May 7th. Registrations for events are open.",
            "content": "### MILANGE 2026: The Cultural Extravaganza\n\nThe Department of Student Affairs is thrilled to announce the dates for **Milange 2026**, our annual cultural festival. Join us for three days of music, dance, coding battles, drama, and culinary arts!\n\n- **Dates**: May 5th to May 7th, 2026\n- **Highlights**: Rock Show, Hack-a-thon, Street Play, and Fashion Show\n- **Chief Guest**: Renowned Director Vikram Sen\n- **Event Registrations**: Open from April 20th onwards on the Student Portal\n\nLet us come together to celebrate talent, creativity, and college spirit! Volunteers can register at the Student Council desk in Room 302.",
            "category": "Event",
            "author": "Student Council Office",
            "targetRoles": ["student", "faculty"],
            "publishedAt": "2026-04-17T14:30:00Z"
        },
        {
            "id": "news_003",
            "title": "New Research Grants & Facility Expansion",
            "summary": "The administration has received new grants to expand our robotics lab facilities and support research projects.",
            "content": "### Expansion of Campus Research Infrastructure\n\nWe are proud to share that MIT Connect has been awarded a research grant of ₹50,00,000 by the National Research Council. \n\nThis grant will be directed towards:\n1. **Advanced Robotics Lab Expansion**: Purchasing high-performance compute units and edge AI devices.\n2. **Faculty-led Research Fellowships**: Financial support for ongoing research projects in sustainable engineering.\n\nFaculty members interested in applying for project funding can submit their proposals to the Dean of Research by April 30, 2026.",
            "category": "Academic",
            "author": "Office of the Dean",
            "targetRoles": ["faculty", "admin"],
            "publishedAt": "2026-04-16T11:00:00Z"
        }
    ],
    "faculty_leaves": [],
    "faculty_leave_balance": {},
    "faculty_attendance_markings": {},
}


def list_items(key: str):
    return deepcopy(DEV_STORE[key])


def get_exam(exam_id: str):
    return next((item for item in DEV_STORE["exams"] if item["id"] == exam_id), None)


def create_exam(data: dict):
    item = {"id": _make_id("exam"), **deepcopy(data)}
    DEV_STORE["exams"].append(item)
    return deepcopy(item)


def update_exam(exam_id: str, patch: dict):
    item = get_exam(exam_id)
    if not item:
        return None
    item.update(deepcopy(patch))
    return deepcopy(item)


def delete_exam(exam_id: str):
    index = next((i for i, item in enumerate(DEV_STORE["exams"]) if item["id"] == exam_id), None)
    if index is None:
        return False
    del DEV_STORE["exams"][index]
    return True


def list_timetables():
    return deepcopy(list(DEV_STORE["timetables"].values()))


def get_timetable(class_id: str):
    record = DEV_STORE["timetables"].get(class_id)
    return deepcopy(record) if record else None


def upsert_timetable(class_id: str, data: dict):
    payload = deepcopy(data)
    payload["classId"] = class_id
    DEV_STORE["timetables"][class_id] = payload
    return deepcopy(payload)


def list_placements(
    status: Optional[str] = None,
    search: Optional[str] = None,
    person_id: Optional[str] = None,
):
    items = deepcopy(DEV_STORE["placements"])
    if status and status != "All":
        items = [item for item in items if item.get("status") == status]
    if person_id:
        items = [item for item in items if item.get("ownerId") == person_id]
    if search:
        needle = search.lower()
        items = [item for item in items if needle in item.get("name", "").lower() or needle in item.get("company", "").lower()]
    return items


def create_placement(data: dict):
    item = {"id": _make_id("placement"), **deepcopy(data)}
    DEV_STORE["placements"].append(item)
    return deepcopy(item)


def update_placement(placement_id: str, data: dict):
    item = next((entry for entry in DEV_STORE["placements"] if entry["id"] == placement_id), None)
    if not item:
        return None
    item.update(deepcopy(data))
    return deepcopy(item)


def delete_placement(placement_id: str):
    index = next((i for i, item in enumerate(DEV_STORE["placements"]) if item["id"] == placement_id), None)
    if index is None:
        return False
    del DEV_STORE["placements"][index]
    return True


def list_facilities(status: Optional[str] = None, search: Optional[str] = None):
    items = deepcopy(DEV_STORE["facilities"])
    if status and status != "All":
        items = [item for item in items if item.get("status") == status]
    if search:
        needle = search.lower()
        items = [item for item in items if needle in item.get("name", "").lower()]
    return items


def create_facility(data: dict):
    item = {"id": _make_id("facility"), **deepcopy(data)}
    DEV_STORE["facilities"].append(item)
    return deepcopy(item)


def update_facility(facility_id: str, data: dict):
    item = next((entry for entry in DEV_STORE["facilities"] if entry["id"] == facility_id), None)
    if not item:
        return None
    item.update(deepcopy(data))
    return deepcopy(item)


def delete_facility(facility_id: str):
    index = next((i for i, item in enumerate(DEV_STORE["facilities"]) if item["id"] == facility_id), None)
    if index is None:
        return False
    del DEV_STORE["facilities"][index]
    return True


def list_bookings(room: Optional[str] = None):
    items = deepcopy(DEV_STORE["facility_bookings"])
    if room:
        items = [item for item in items if item.get("room") == room]
    return items


def create_booking(data: dict):
    item = {"id": _make_id("booking"), **deepcopy(data)}
    DEV_STORE["facility_bookings"].append(item)
    return deepcopy(item)


def list_attendance(role: Optional[str] = None, person_id: Optional[str] = None):
    items = deepcopy(DEV_STORE["attendance"])
    if role:
        items = [item for item in items if item.get("role") == role]
    if person_id:
        items = [item for item in items if item.get("personId") == person_id]
    return items


def create_attendance(data: dict):
    item = {"id": _make_id("attendance"), **deepcopy(data)}
    DEV_STORE["attendance"].append(item)
    return deepcopy(item)


def _marking_key(class_id: str, date: str, hour: str):
    return f"{class_id}::{date}::{hour}"


def list_attendance_markings(
    class_id: Optional[str] = None,
    date: Optional[str] = None,
    hour: Optional[str] = None,
    student_id: Optional[str] = None,
):
    items = deepcopy(list(DEV_STORE["attendance_markings"].values()))
    if class_id:
        items = [item for item in items if item.get("classId") == class_id]
    if date:
        items = [item for item in items if item.get("date") == date]
    if hour:
        items = [item for item in items if item.get("hour") == hour]
    if student_id:
        items = [
            item for item in items
            if any(str(entry.get("studentId")) == str(student_id) for entry in item.get("entries", []))
        ]
    return items


def upsert_attendance_marking(data: dict):
    payload = deepcopy(data)
    key = _marking_key(payload.get("classId", ""), payload.get("date", ""), payload.get("hour", ""))
    existing = DEV_STORE["attendance_markings"].get(key)
    payload["id"] = existing.get("id") if existing else _make_id("marking")
    DEV_STORE["attendance_markings"][key] = payload
    return deepcopy(payload)


def list_od_requests(student_id: Optional[str] = None, status: Optional[str] = None):
    items = deepcopy(DEV_STORE["od_requests"])
    if student_id:
        items = [item for item in items if item.get("studentId") == student_id]
    if status and status != "All":
        items = [item for item in items if item.get("status") == status]
    return items


def create_od_request(data: dict):
    payload = deepcopy(data)
    request_id = payload.get("requestId") or _make_id("od")
    payload["requestId"] = request_id
    payload["id"] = request_id
    if not payload.get("createdAt"):
        payload["createdAt"] = datetime.utcnow().isoformat()
    DEV_STORE["od_requests"].append(payload)
    return deepcopy(payload)


def update_od_request(request_id: str, data: dict):
    item = next(
        (
            entry for entry in DEV_STORE["od_requests"]
            if entry.get("requestId") == request_id or entry.get("id") == request_id
        ),
        None,
    )
    if not item:
        return None
    item.update(deepcopy(data))
    item["requestId"] = item.get("requestId") or request_id
    item["id"] = item.get("id") or item["requestId"]
    item["updatedAt"] = datetime.utcnow().isoformat()
    return deepcopy(item)


def update_od_request_status(request_id: str, status: str, reviewed_by: Optional[str] = None):
    item = next(
        (
            entry for entry in DEV_STORE["od_requests"]
            if entry.get("requestId") == request_id or entry.get("id") == request_id
        ),
        None,
    )
    if not item:
        return None
    item["status"] = status
    item["reviewedBy"] = reviewed_by or item.get("reviewedBy")
    item["reviewedAt"] = datetime.utcnow().isoformat()
    item["updatedAt"] = datetime.utcnow().isoformat()
    return deepcopy(item)


def delete_od_request(request_id: str):
    index = next(
        (
            i for i, item in enumerate(DEV_STORE["od_requests"])
            if item.get("requestId") == request_id or item.get("id") == request_id
        ),
        None,
    )
    if index is None:
        return False
    del DEV_STORE["od_requests"][index]
    return True


def list_weekly_attendance():
    return deepcopy(DEV_STORE["attendance_weekly"])


def list_notifications(
    role: str,
    limit: Optional[int] = None,
    search: Optional[str] = None,
    category: Optional[str] = None,
    priority: Optional[str] = None,
    status: Optional[str] = None,
):
    items = [
        item for item in DEV_STORE["notifications"]
        if item.get("receiverRole") in {role, "ALL"} or item.get("senderRole") == role
    ]
    if search:
        needle = search.lower()
        items = [item for item in items if needle in item.get("title", "").lower() or needle in item.get("message", "").lower()]
        
    if category:
        items = [item for item in items if item.get("module") == category]
    if priority:
        items = [item for item in items if item.get("priority") == priority]
        
    unread = sum(1 for item in items if item.get("status") == "unread")
    
    if status:
        items = [item for item in items if item.get("status") == status]
        
    items = sorted(items, key=lambda item: item.get("createdAt", ""), reverse=True)
    if limit and limit > 0:
        items = items[:limit]
    
    return deepcopy(items), unread


def unread_notifications(role: str):
    return sum(
        1 for item in DEV_STORE["notifications"]
        if (item.get("receiverRole") in {role, "ALL"} or item.get("senderRole") == role) and item.get("status") == "unread"
    )


def create_notification(data: dict):
    item = {"id": _make_id("notification"), "status": "unread", **deepcopy(data)}
    DEV_STORE["notifications"].append(item)
    return deepcopy(item)


def mark_notification_read(notification_id: str):
    item = next((entry for entry in DEV_STORE["notifications"] if entry["id"] == notification_id), None)
    if not item:
        return None
    item["status"] = "read"
    return deepcopy(item)


def mark_role_notifications_read(role: str):
    count = 0
    for item in DEV_STORE["notifications"]:
        if item.get("receiverRole") in {role, "ALL"} and item.get("status") == "unread":
            item["status"] = "read"
            count += 1
    return count


def delete_notification(notification_id: str):
    index = next((i for i, item in enumerate(DEV_STORE["notifications"]) if item["id"] == notification_id), None)
    if index is None:
        return False
    del DEV_STORE["notifications"][index]
    return True


def clear_notifications(role: str):
    before = len(DEV_STORE["notifications"])
    DEV_STORE["notifications"] = [
        item for item in DEV_STORE["notifications"]
        if item.get("receiverRole") not in {role, "ALL"}
    ]
    return before - len(DEV_STORE["notifications"])


def list_newsletters(role: str):
    if "newsletters" not in DEV_STORE:
        DEV_STORE["newsletters"] = []
    items = [
        item for item in DEV_STORE["newsletters"]
        if "ALL" in item.get("targetRoles", []) or role in item.get("targetRoles", [])
    ]
    return sorted(items, key=lambda x: x.get("publishedAt", ""), reverse=True)


def create_newsletter(data: dict):
    if "newsletters" not in DEV_STORE:
        DEV_STORE["newsletters"] = []
    item = {
        "id": _make_id("news"),
        "publishedAt": datetime.utcnow().isoformat() + "Z",
        **deepcopy(data)
    }
    DEV_STORE["newsletters"].append(item)
    return deepcopy(item)