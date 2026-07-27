from __future__ import annotations

import re
from datetime import datetime, timezone
from uuid import uuid4
from typing import Optional
from fastapi import APIRouter, HTTPException
from pymongo import ReturnDocument

from backend.db import get_db
from backend.utils.notify import send_notification
from backend.dev_store import create_attendance as create_dev_attendance
from backend.dev_store import create_od_request as create_dev_od_request
from backend.dev_store import list_attendance as list_dev_attendance
from backend.dev_store import list_attendance_markings as list_dev_attendance_markings
from backend.dev_store import list_od_requests as list_dev_od_requests
from backend.dev_store import list_weekly_attendance
from backend.dev_store import delete_od_request as delete_dev_od_request
from backend.dev_store import update_od_request as update_dev_od_request
from backend.dev_store import update_od_request_status as update_dev_od_request_status
from backend.dev_store import upsert_attendance_marking as upsert_dev_attendance_marking
from backend.schemas.academics import (
    AttendanceRecord, WeeklyAttendancePoint, AttendanceMarkRecord, 
    OdRequestPayload, OdRequestStatusUpdate, FacultyAttendanceMarkRecord
)
from backend.utils.mongo import serialize_doc
from backend.utils.attendance_utils import compute_student_attendance_stats
from backend.dev_store import DEV_STORE

router = APIRouter(prefix="/api/academics/attendance", tags=["academics:attendance"])


def _new_id(prefix: str):
    return f"{prefix}_{uuid4().hex[:12]}"


def _now_iso():
    return datetime.utcnow().isoformat()


def _dev_list(key: str):
    return DEV_STORE.setdefault(key, [])


@router.get("")
async def list_attendance(role: Optional[str] = None, person_id: Optional[str] = None):
    try:
        db = get_db()
        use_db = True
    except HTTPException as error:
        if error.status_code == 503:
            use_db = False
        else:
            raise

    if not use_db:
        from backend.routes.students import _seed_dev_students
        _seed_dev_students()
        records = []
        if not role or role == "student":
            for student in DEV_STORE.get("students", []):
                student_id = student.get("id") or student.get("rollNumber")
                if person_id and student_id != person_id:
                    continue
                present, total, pct = await compute_student_attendance_stats(student, db=None)
                records.append({
                    "id": student_id,
                    "personId": student_id,
                    "name": student.get("name", "Unknown Student"),
                    "role": "student",
                    "courseOrDepartment": student.get("department", "Computer Science"),
                    "present": present,
                    "total": total
                })
        if not role or role == "staff":
            records.extend(list_dev_attendance("staff", person_id))
        return {"success": True, "data": records}

    records = []

    # If role is student or not specified, read from "students"
    if not role or role == "student":
        student_query = {}
        if person_id:
            student_query["$or"] = [
                {"id": person_id},
                {"rollNumber": person_id},
                {"student_id": person_id}
            ]

        async for student in db["students"].find(student_query):
            present, total, pct = await compute_student_attendance_stats(student, db=db)

            records.append({
                "id": student.get("id") or student.get("rollNumber") or str(student["_id"]),
                "personId": student.get("id") or student.get("rollNumber") or str(student["_id"]),
                "name": student.get("name", "Unknown Student"),
                "role": "student",
                "courseOrDepartment": student.get("department", "Computer Science"),
                "present": present,
                "total": total
            })

    # If role is staff or not specified, read from "faculty"
    if not role or role == "staff":
        faculty_query = {}
        if person_id:
            faculty_query["$or"] = [
                {"employeeId": person_id},
                {"id": person_id}
            ]

        async for member in db["faculty"].find(faculty_query):
            rate = member.get("attendance_rate")
            if rate is not None:
                total = 20
                present = int(round(total * rate / 100))
            else:
                total = 20
                present = 18

            records.append({
                "id": member.get("employeeId") or str(member["_id"]),
                "personId": member.get("employeeId") or str(member["_id"]),
                "name": member.get("name", "Unknown Staff"),
                "role": "staff",
                "courseOrDepartment": member.get("departmentId") or member.get("department", "Computer Science"),
                "present": present,
                "total": total
            })

    # Legacy fallback: Query the custom academic_attendance collection if any manual entries exist
    attendance_query = {}
    if role:
        attendance_query["role"] = role
    if person_id:
        attendance_query["personId"] = person_id

    async for record in db["academic_attendance"].find(attendance_query):
        records.append(serialize_doc(record))

    # Sort records by name
    records = sorted(records, key=lambda r: r.get("name", "").lower())
    return {"success": True, "data": records}


@router.post("")
async def create_attendance(payload: AttendanceRecord):
    try:
        db = get_db()
    except HTTPException as error:
        if error.status_code == 503:
            return {"success": True, "data": create_dev_attendance(payload.model_dump())}
        raise
    result = await db["academic_attendance"].insert_one(payload.model_dump())
    created = await db["academic_attendance"].find_one({"_id": result.inserted_id})
    return {"success": True, "data": serialize_doc(created)}


@router.get("/weekly")
async def get_weekly_attendance(role: Optional[str] = None):
    try:
        db = get_db()
    except HTTPException as error:
        if error.status_code == 503:
            return {"success": True, "data": list_weekly_attendance()}
        raise
    query = {"role": role} if role else {}
    points = []
    async for point in db["academic_attendance_weekly"].find(query).sort("day", 1):
        points.append(serialize_doc(point))

    if points:
        return {"success": True, "data": points}

    default_points = [
        WeeklyAttendancePoint(day="Mon", attendance=92).model_dump(),
        WeeklyAttendancePoint(day="Tue", attendance=88).model_dump(),
        WeeklyAttendancePoint(day="Wed", attendance=90).model_dump(),
        WeeklyAttendancePoint(day="Thu", attendance=86).model_dump(),
        WeeklyAttendancePoint(day="Fri", attendance=94).model_dump(),
    ]
    return {"success": True, "data": default_points}


@router.get("/markings")
async def list_attendance_markings(
    class_id: Optional[str] = None,
    date: Optional[str] = None,
    hour: Optional[str] = None,
    student_id: Optional[str] = None,
):
    try:
        db = get_db()
        use_db = True
    except HTTPException as error:
        if error.status_code == 503:
            use_db = False
        else:
            raise

    if not use_db:
        rows = list_dev_attendance_markings(class_id, date, hour, student_id)
        return {"success": True, "data": rows}

    query = {}
    if class_id:
        query["classId"] = class_id
    if date:
        query["date"] = date
    if hour:
        query["hour"] = hour
    if student_id:
        query["entries.studentId"] = student_id

    rows = []
    async for row in db["academic_attendance_markings"].find(query).sort("date", -1):
        rows.append(serialize_doc(row))
    return {"success": True, "data": rows}


def is_class_assigned_py(class_id: str, class_label: str, assigned_classes: list) -> bool:
    if not assigned_classes:
        return False
        
    normalized_label = class_label.lower()
    normalized_id = class_id.lower()
    
    dept_codes = {
        'cse': ['computer science', 'computer science & engineering', 'computer science and engineering'],
        'ece': ['electronics', 'electronics & communication', 'electronics and communication'],
        'me': ['mechanical', 'mechanical engineering'],
        'ce': ['civil', 'civil engineering'],
        'it': ['information technology'],
        'eee': ['electrical', 'electrical engineering', 'electrical & electronics', 'electrical and electronics']
    }
    
    for ac in assigned_classes:
        normalized_ac = ac.strip().lower()
        if not normalized_ac:
            continue
            
        if normalized_ac in normalized_label or normalized_ac in normalized_id:
            return True
            
        parts = re.split(r'[-_\s]+', normalized_ac)
        if len(parts) >= 2:
            first = parts[0]
            last = parts[-1]
            if len(last) == 1 and last.isalpha():
                student_sec = normalized_id.split('-')[-1]
                if student_sec == last:
                    if first in ['cs', 'cse']:
                        if 'computer-science' in normalized_id or 'cse' in normalized_id:
                            return True
                    for code, names in dept_codes.items():
                        if first == code:
                            if any(name.replace(' ', '-') in normalized_id for name in names):
                                return True
                                
        match_num = re.search(r'\d+', normalized_ac)
        if match_num:
            num = match_num.group()
            year_words = {
                '1': ['1st', '1', 'first'],
                '2': ['2nd', '2', 'second'],
                '3': ['3rd', '3', 'third'],
                '4': ['4th', '4', 'fourth']
            }
            if num in year_words:
                if any(w in normalized_id for w in year_words[num]):
                    return True
                    
    return False


async def check_faculty_attendance_permission(db, faculty_id: str, class_id: str, date_str: str, hour_str: str, class_label: str = ""):
    faculty = await db["faculty"].find_one({"$or": [{"employeeId": faculty_id}, {"id": faculty_id}]})
    if not faculty:
        return
        
    assigned_classes = faculty.get("assignedClasses") or faculty.get("classes") or []
    if isinstance(assigned_classes, str):
        assigned_classes = [c.strip() for c in assigned_classes.split(",") if c.strip()]
        
    if not class_label:
        marking = await db["academic_attendance_markings"].find_one({"classId": class_id})
        if marking:
            class_label = marking.get("classLabel") or ""
        else:
            parts = class_id.split("-")
            class_label = " ".join([p.capitalize() for p in parts])
            
    # Direct class assignment check
    class_directly_assigned = is_class_assigned_py(class_id, class_label, assigned_classes)
    
    if not class_directly_assigned:
        # Fallback: Check if the classId belongs to a timetable that maps to the
        # faculty's assigned classes via department abbreviation matching (e.g. CSE-A -> CO-S6A)
        dept_abbrev_map = {
            'cse': ['computer science', 'computer science & engineering', 'computer science and engineering'],
            'cs': ['computer science', 'computer science & engineering', 'computer science and engineering'],
            'co': ['computer science', 'computer science & engineering', 'computer science and engineering'],
            'ece': ['electronics', 'electronics and communication', 'electronics & communication'],
            'me': ['mechanical', 'mechanical engineering'],
            'ce': ['civil', 'civil engineering'],
            'it': ['information technology'],
            'eee': ['electrical', 'electrical engineering', 'electrical & electronics'],
        }
        
        timetable_match = False
        tt = await db["academic_timetables"].find_one({"classId": class_id})
        if tt:
            tt_dept = str(tt.get("dept") or tt.get("department", "")).strip().lower()
            tt_sem = tt.get("semester") or ""
            tt_sec = str(tt.get("section") or "").strip().lower()
            faculty_dept = str(faculty.get("department", "")).strip().lower()
            
            for ac in assigned_classes:
                ac_lower = ac.strip().lower()
                if "-" in ac_lower:
                    parts = ac_lower.split("-")
                    ac_dept_code = parts[0].strip()
                    ac_section = parts[-1].strip()
                    dept_names = dept_abbrev_map.get(ac_dept_code, [])
                    dept_ok = any(dn in tt_dept or tt_dept in dn for dn in dept_names) or \
                              any(dn in faculty_dept or faculty_dept in dn for dn in dept_names)
                    sec_ok = ac_section in tt_sec or tt_sec in ac_section
                    if dept_ok and sec_ok:
                        timetable_match = True
                        break
                elif ac_lower.startswith("year"):
                    year_match = re.search(r'\d+', ac_lower)
                    if year_match:
                        year_num = int(year_match.group())
                        sem_num_str = str(tt_sem).replace("Semester", "").strip()
                        if sem_num_str.isdigit():
                            sem_num = int(sem_num_str)
                            if sem_num in [year_num * 2 - 1, year_num * 2]:
                                if faculty_dept and (faculty_dept in tt_dept or tt_dept in faculty_dept):
                                    timetable_match = True
                                    break
        
        if not timetable_match:
            raise HTTPException(status_code=403, detail=f"Class '{class_label}' is not assigned to you.")
        
    try:
        dt = datetime.strptime(date_str, "%Y-%m-%d")
        weekday = dt.strftime("%a")
    except Exception:
        return
        
    timetable = await db["academic_timetables"].find_one({"classId": class_id})
    if not timetable:
        return
        
    # Check if this faculty or their courses exist anywhere in this timetable.
    # If they do not appear anywhere in the timetable at all, it's a fallback mapping
    # where the faculty is marking an assigned course not explicitly timetabled.
    # In such cases, we bypass slot-level scheduling checks.
    faculty_in_timetable = False
    faculty_name = faculty.get("name") or faculty.get("fullName") or ""
    faculty_courses = faculty.get("courses") or []
    if isinstance(faculty_courses, str):
        faculty_courses = [c.strip() for c in faculty_courses.split(",") if c.strip()]
        
    slots = timetable.get("slots") or []
    for row in slots:
        for slot in row:
            if slot:
                instructor = str(slot.get("instructor") or "").lower()
                code = str(slot.get("code") or "").lower()
                name = str(slot.get("name") or "").lower()
                if faculty_id.lower() in instructor or (faculty_name and faculty_name.lower() in instructor):
                    faculty_in_timetable = True
                    break
                if any(c.lower() in code or c.lower() in name for c in faculty_courses):
                    faculty_in_timetable = True
                    break
        if faculty_in_timetable:
            break
            
    if not faculty_in_timetable:
        return
        
    hour_map = {f"Hour {i}": i-1 for i in range(1, 9)}
    hour_idx = hour_map.get(hour_str)
    if hour_idx is None or hour_idx < 0:
        return
        
    weekday_map = {"Mon": 0, "Tue": 1, "Wed": 2, "Thu": 3, "Fri": 4}
    day_idx = weekday_map.get(weekday)
    if day_idx is None:
        return
        
    if len(slots) > hour_idx:
        day_slots = slots[hour_idx]
        if len(day_slots) > day_idx:
            slot_entry = day_slots[day_idx]
            if slot_entry:
                instructor = slot_entry.get("instructor", "")
                subject_name = slot_entry.get("name", "")
                subject_code = slot_entry.get("code", "")
                
                if instructor and (faculty_id.lower() in instructor.lower() or faculty_name.lower() in instructor.lower()):
                    return
                if subject_name and any(c.lower() in subject_name.lower() for c in faculty_courses):
                    return
                if subject_code and any(c.lower() in subject_code.lower() for c in faculty_courses):
                    return
                
                raise HTTPException(status_code=403, detail=f"This hour is scheduled for {subject_name or subject_code} with {instructor or 'another instructor'}. You are not assigned to this hour.")


@router.put("/markings")
async def upsert_attendance_marking(payload: AttendanceMarkRecord):
    data = payload.model_dump()
    query = {
        "classId": data["classId"],
        "date": data["date"],
        "hour": data["hour"],
    }

    try:
        db = get_db()
        use_db = True
    except HTTPException as error:
        if error.status_code == 503:
            use_db = False
        else:
            raise

    marked_by = data.get("markedBy", "")

    # 1. Duplicate Marking Validation (Prevent multiple submissions for same class/date/hour)
    # Put is an upsert, which naturally updates. But if we try to mark the exact same slot that is locked, we block it.
    
    # 2. Lock check: Admin locked markings cannot be edited by faculty
    existing = None
    if use_db:
        existing = await db["academic_attendance_markings"].find_one(query)
    else:
        existing = next((item for item in _dev_list("academic_attendance_markings")
                         if item.get("classId") == data["classId"] and
                         item.get("date") == data["date"] and
                         item.get("hour") == data["hour"]), None)

    if existing and existing.get("locked"):
        raise HTTPException(status_code=403, detail="Attendance is locked by Admin and cannot be modified.")

    # 3. Edit Window check (24-hour limit for non-admin edits)
    if existing and existing.get("markedAt") and marked_by != "admin":
        try:
            marked_at_str = existing.get("markedAt").replace("Z", "+00:00")
            marked_at_dt = datetime.fromisoformat(marked_at_str)
            if marked_at_dt.tzinfo is None:
                marked_at_dt = marked_at_dt.replace(tzinfo=timezone.utc)
            
            diff = datetime.now(timezone.utc) - marked_at_dt
            if diff.total_seconds() > 24 * 3600:
                raise HTTPException(status_code=403, detail="Editing is only allowed within the 24-hour window.")
        except Exception as e:
            if isinstance(e, HTTPException):
                raise

    if use_db and marked_by and marked_by != "admin":
        await check_faculty_attendance_permission(
            db,
            faculty_id=marked_by,
            class_id=data["classId"],
            date_str=data["date"],
            hour_str=data["hour"],
            class_label=data.get("classLabel", "")
        )

    if not data.get("markedAt"):
        data["markedAt"] = datetime.utcnow().isoformat()

    # 4. Save History log
    history_doc = {
        "id": _new_id("hist"),
        "classId": data["classId"],
        "date": data["date"],
        "hour": data["hour"],
        "subjectCode": data.get("subjectCode"),
        "subjectName": data.get("subjectName"),
        "updatedBy": marked_by,
        "updatedAt": datetime.utcnow().isoformat(),
        "previousEntries": existing.get("entries") if existing else [],
        "newEntries": data["entries"]
    }

    # 5. Log Faculty compliance log activity
    activity_doc = {
        "id": _new_id("act"),
        "facultyId": marked_by,
        "date": data["date"],
        "timestamp": datetime.utcnow().isoformat(),
        "classId": data["classId"],
        "hour": data["hour"],
        "subjectCode": data.get("subjectCode"),
        "subjectName": data.get("subjectName")
    }

    if use_db:
        await db["academic_attendance_history"].insert_one(history_doc)
        if marked_by and marked_by != "admin":
            await db["faculty_attendance_activity"].insert_one(activity_doc)

        updated = await db["academic_attendance_markings"].find_one_and_update(
            query,
            {"$set": data},
            upsert=True,
            return_document=ReturnDocument.AFTER,
        )
        return {"success": True, "data": serialize_doc(updated)}
    else:
        _dev_list("academic_attendance_history").append(history_doc)
        if marked_by and marked_by != "admin":
            _dev_list("faculty_attendance_activity").append(activity_doc)

        updated = upsert_dev_attendance_marking(data)
        return {"success": True, "data": updated}


# --- NEW ENDPOINTS ---

@router.get("/faculty/{faculty_id}/subjects")
async def get_faculty_subjects(faculty_id: str):
    try:
        db = get_db()
        use_db = True
    except HTTPException:
        use_db = False

    assigned_subjects = []
    faculty_courses = []
    faculty_classes = []

    # 1. Fetch Faculty profile data
    faculty = None
    if use_db:
        faculty = await db["faculty"].find_one({"$or": [{"employeeId": faculty_id}, {"id": faculty_id}]})
    else:
        faculty = next((f for f in _dev_list("faculty") if f.get("employeeId") == faculty_id or f.get("id") == faculty_id), None)

    if faculty:
        raw_courses = faculty.get("courses") or []
        if isinstance(raw_courses, str):
            faculty_courses = [c.strip() for c in raw_courses.split(",") if c.strip()]
        elif isinstance(raw_courses, list):
            faculty_courses = raw_courses

        raw_classes = faculty.get("assignedClasses") or faculty.get("classes") or []
        if isinstance(raw_classes, str):
            faculty_classes = [c.strip() for c in raw_classes.split(",") if c.strip()]
        elif isinstance(raw_classes, list):
            faculty_classes = raw_classes

    # 2. Scan timetables for matches
    timetables = []
    if use_db:
        async for tt in db["academic_timetables"].find({}):
            timetables.append(tt)
    else:
        timetables = _dev_list("timetables")
        if not timetables:
            # Fallback to dev_store list
            from backend.dev_store import list_timetables
            timetables = list_timetables()

    seen_subjects = set()
    norm_text = lambda t: str(t or "").strip().lower()

    for tt in timetables:
        class_id = tt.get("classId", "")
        dept = tt.get("dept") or tt.get("department", "Computer Science")
        sem = tt.get("semester") or "Semester 4"
        sec = tt.get("section") or "A"

        # Check slots
        slots = tt.get("slots") or []
        for slot_row in slots:
            for slot in slot_row:
                if slot:
                    instructor = slot.get("instructor") or ""
                    subject_code = slot.get("code") or ""
                    subject_name = slot.get("subject") or slot.get("name") or ""

                    # Match condition
                    match = False
                    if faculty:
                        fac_name = faculty.get("name", "")
                        if fac_name and norm_text(fac_name) in norm_text(instructor):
                            match = True
                        elif norm_text(faculty_id) in norm_text(instructor):
                            match = True
                    
                    if not match and subject_code and faculty_courses:
                        if any(norm_text(c) in norm_text(subject_code) or norm_text(c) in norm_text(subject_name) for c in faculty_courses):
                            match = True

                    if match and subject_code:
                        key = (class_id, subject_code)
                        if key not in seen_subjects:
                            seen_subjects.add(key)
                            assigned_subjects.append({
                                "code": subject_code,
                                "name": subject_name,
                                "classId": class_id,
                                "department": dept,
                                "semester": sem,
                                "section": sec
                            })

    # 3. Fallback: If no matches found in timetables, try to map assigned classes to real timetable classIds
    if not assigned_subjects and faculty_courses:
        # Build a mapping of dept abbreviations to timetable info
        dept_abbrev_map = {
            'cse': ['computer science', 'computer science & engineering', 'computer science and engineering'],
            'cs': ['computer science', 'computer science & engineering', 'computer science and engineering'],
            'co': ['computer science', 'computer science & engineering', 'computer science and engineering'],
            'ece': ['electronics', 'electronics and communication', 'electronics & communication'],
            'me': ['mechanical', 'mechanical engineering'],
            'ce': ['civil', 'civil engineering'],
            'it': ['information technology'],
            'eee': ['electrical', 'electrical engineering', 'electrical & electronics'],
        }

        faculty_dept = norm_text(faculty.get("department", "")) if faculty else ""

        for cls_label in faculty_classes:
            # Parse assigned class label, e.g. "CSE-A" -> dept_code="cse", section="A"
            # or "Year 3" -> year="3"
            cls_lower = cls_label.strip().lower()
            parsed_section = None
            parsed_dept_code = None
            parsed_year = None

            if "-" in cls_lower:
                parts = cls_lower.split("-")
                parsed_dept_code = parts[0].strip()
                parsed_section = parts[-1].strip().upper()
            elif cls_lower.startswith("year"):
                year_match = re.search(r'\d+', cls_lower)
                if year_match:
                    parsed_year = int(year_match.group())

            # Try to match this assigned class to actual timetables
            for tt in timetables:
                tt_class_id = tt.get("classId", "")
                tt_dept = norm_text(tt.get("dept") or tt.get("department", ""))
                tt_sem = tt.get("semester") or ""
                tt_sec = norm_text(tt.get("section") or "")

                # Check department match
                dept_match = False
                if parsed_dept_code:
                    dept_names = dept_abbrev_map.get(parsed_dept_code, [])
                    if any(dn in tt_dept or tt_dept in dn for dn in dept_names):
                        dept_match = True
                    elif any(dn in faculty_dept or faculty_dept in dn for dn in dept_names):
                        dept_match = True
                elif parsed_year:
                    # "Year 3" -> Semesters 5-6; check if timetable semester matches
                    sem_num_str = str(tt_sem).replace("Semester", "").strip()
                    if sem_num_str.isdigit():
                        sem_num = int(sem_num_str)
                        if sem_num in [parsed_year * 2 - 1, parsed_year * 2]:
                            # Also check if faculty dept matches timetable dept
                            if faculty_dept and (faculty_dept in tt_dept or tt_dept in faculty_dept):
                                dept_match = True

                # Check section match
                sec_match = True  # default true if no section parsed
                if parsed_section:
                    sec_match = parsed_section.lower() in tt_sec or tt_sec in parsed_section.lower()

                if dept_match and sec_match:
                    # Found a matching timetable; add all faculty courses for this class
                    tt_dept_display = tt.get("dept") or tt.get("department", "Computer Science")
                    tt_sem_display = tt.get("semester") or "Semester 6"
                    tt_sec_display = tt.get("section") or "A"

                    for c in faculty_courses:
                        key = (tt_class_id, c)
                        if key not in seen_subjects:
                            seen_subjects.add(key)
                            assigned_subjects.append({
                                "code": c,
                                "name": c,
                                "classId": tt_class_id,
                                "department": tt_dept_display,
                                "semester": tt_sem_display,
                                "section": tt_sec_display
                            })

        # Ultimate fallback if still nothing found: use raw assigned classes
        if not assigned_subjects:
            for c in faculty_courses:
                for cls in faculty_classes:
                    sec = "A"
                    if "-" in cls:
                        sec = cls.split('-')[-1].strip()
                    assigned_subjects.append({
                        "code": c,
                        "name": c,
                        "classId": cls,
                        "department": faculty.get("department", "Computer Science") if faculty else "Computer Science",
                        "semester": "Semester 6",
                        "section": sec
                    })

    return {"success": True, "data": assigned_subjects}


@router.get("/students")
async def list_students_for_attendance(
    dept: Optional[str] = None,
    semester: Optional[str] = None,
    section: Optional[str] = None,
):
    try:
        db = get_db()
        use_db = True
    except HTTPException:
        use_db = False

    students_list = []
    if use_db:
        and_conditions = []
        if dept:
            # Use regex for fuzzy department matching to handle
            # "Computer Science" vs "Computer Science & Engineering" etc.
            # Extract the core department name (first two words) for matching
            dept_escaped = re.escape(dept.split('&')[0].split('and')[0].strip())
            and_conditions.append({"department": {"$regex": dept_escaped, "$options": "i"}})
        if semester:
            # handle both int and string representation
            sem_str = str(semester).replace("Semester", "").strip()
            if sem_str.isdigit():
                and_conditions.append({"$or": [
                    {"semester": int(sem_str)},
                    {"semester": f"Semester {sem_str}"},
                    {"semester": semester}
                ]})
            else:
                and_conditions.append({"semester": semester})
        if section:
            # Match A or Section A
            sec_val = str(section).replace("Section", "").strip()
            and_conditions.append({"$or": [
                {"section": section},
                {"section": sec_val},
                {"section": f"Section {sec_val}"}
            ]})

        query = {"$and": and_conditions} if and_conditions else {}
        async for s in db["students"].find(query):
            students_list.append(serialize_doc(s))
    else:
        from backend.routes.students import _seed_dev_students
        _seed_dev_students()
        students_list = _dev_list("students")
        if dept:
            students_list = [s for s in students_list if str(s.get("department")).lower() == dept.lower()]
        if semester:
            sem_str = str(semester).lower().replace("semester", "").strip()
            students_list = [s for s in students_list if sem_str in str(s.get("semester")).lower()]
        if section:
            sec_str = str(section).lower().replace("section", "").strip()
            students_list = [s for s in students_list if sec_str in str(s.get("section")).lower()]

    result = []
    for s in students_list:
        # Prefer rollNumber as the canonical student identifier for attendance
        sid = s.get("rollNumber") or s.get("id") or str(s.get("_id"))
        result.append({
            "id": sid,
            "rollNumber": sid,
            "name": s.get("name") or "Student"
        })
    return {"success": True, "data": result}


@router.get("/admin/overview")
async def get_admin_attendance_overview(
    department: Optional[str] = None,
    semester: Optional[str] = None,
    section: Optional[str] = None,
    subject: Optional[str] = None,
    faculty: Optional[str] = None,
    startDate: Optional[str] = None,
    endDate: Optional[str] = None,
):
    try:
        db = get_db()
        use_db = True
    except HTTPException:
        use_db = False

    # Get student pool matching filters
    students_list = []
    if use_db:
        sq_conditions = []
        if department:
            dept_escaped = re.escape(department.split('&')[0].split('and')[0].strip())
            sq_conditions.append({"department": {"$regex": dept_escaped, "$options": "i"}})
        if semester:
            sem_str = str(semester).replace("Semester", "").strip()
            if sem_str.isdigit():
                sq_conditions.append({"$or": [{"semester": int(sem_str)}, {"semester": f"Semester {sem_str}"}, {"semester": semester}]})
            else:
                sq_conditions.append({"semester": semester})
        if section:
            sec_val = str(section).replace("Section", "").strip()
            sq_conditions.append({"$or": [{"section": section}, {"section": sec_val}, {"section": f"Section {sec_val}"}]})
        sq = {"$and": sq_conditions} if sq_conditions else {}
        async for s in db["students"].find(sq):
            students_list.append(serialize_doc(s))
    else:
        from backend.routes.students import _seed_dev_students
        _seed_dev_students()
        students_list = _dev_list("students")
        if department:
            students_list = [s for s in students_list if str(s.get("department")).lower() == department.lower()]
        if semester:
            sem_str = str(semester).lower().replace("semester", "").strip()
            students_list = [s for s in students_list if sem_str in str(s.get("semester")).lower()]
        if section:
            sec_str = str(section).lower().replace("section", "").strip()
            students_list = [s for s in students_list if sec_str in str(s.get("section")).lower()]

    total_students = len(students_list)
    student_ids = {s.get("rollNumber") or s.get("id") for s in students_list if s.get("rollNumber") or s.get("id")}

    # Get markings matching filters
    markings = []
    if use_db:
        mq = {}
        if startDate or endDate:
            date_q = {}
            if startDate: date_q["$gte"] = startDate
            if endDate: date_q["$lte"] = endDate
            mq["date"] = date_q
        if subject:
            mq["$or"] = [{"subjectCode": subject}, {"subjectName": subject}]
        if faculty:
            mq["markedBy"] = faculty
        
        async for m in db["academic_attendance_markings"].find(mq):
            markings.append(serialize_doc(m))
    else:
        markings = _dev_list("academic_attendance_markings")
        if startDate: markings = [m for m in markings if m.get("date") >= startDate]
        if endDate: markings = [m for m in markings if m.get("date") <= endDate]
        if subject: markings = [m for m in markings if m.get("subjectCode") == subject or m.get("subjectName") == subject]
        if faculty: markings = [m for m in markings if m.get("markedBy") == faculty]

    # Calculate sessions and attendance counts per student
    total_sessions = len(markings)
    
    student_attendance = {sid: {"present": 0, "total": 0} for sid in student_ids}
    
    for m in markings:
        entries = m.get("entries") or []
        for entry in entries:
            sid = entry.get("studentId")
            if sid in student_attendance:
                student_attendance[sid]["total"] += 1
                if entry.get("status") in {"Present", "On Duty"}:
                    student_attendance[sid]["present"] += 1

    # Aggregates
    total_pct_sum = 0.0
    students_below_threshold = 0
    count_students_with_records = 0

    for sid, counts in student_attendance.items():
        if counts["total"] > 0:
            pct = (counts["present"] / counts["total"]) * 100
            total_pct_sum += pct
            count_students_with_records += 1
            if pct < 75.0:
                students_below_threshold += 1

    avg_attendance = round(total_pct_sum / count_students_with_records, 1) if count_students_with_records > 0 else 0.0
    
    # Fallback to dev_store defaults if zero records
    if avg_attendance == 0.0 and total_sessions == 0:
        avg_attendance = 89.2

    return {
        "success": True,
        "data": {
            "totalStudents": total_students,
            "totalSessions": total_sessions,
            "averageAttendance": avg_attendance,
            "belowThresholdCount": students_below_threshold
        }
    }


@router.get("/admin/records")
async def list_admin_records(
    department: Optional[str] = None,
    semester: Optional[str] = None,
    section: Optional[str] = None,
    subject: Optional[str] = None,
    faculty: Optional[str] = None,
    startDate: Optional[str] = None,
    endDate: Optional[str] = None,
    search: Optional[str] = None,
):
    try:
        db = get_db()
        use_db = True
    except HTTPException:
        use_db = False

    markings = []
    if use_db:
        mq = {}
        if startDate or endDate:
            date_q = {}
            if startDate: date_q["$gte"] = startDate
            if endDate: date_q["$lte"] = endDate
            mq["date"] = date_q
        if subject:
            mq["$or"] = [{"subjectCode": subject}, {"subjectName": subject}]
        if faculty:
            mq["markedBy"] = faculty
        
        async for m in db["academic_attendance_markings"].find(mq).sort("date", -1):
            markings.append(serialize_doc(m))
    else:
        markings = _dev_list("academic_attendance_markings")
        if startDate: markings = [m for m in markings if m.get("date") >= startDate]
        if endDate: markings = [m for m in markings if m.get("date") <= endDate]
        if subject: markings = [m for m in markings if m.get("subjectCode") == subject or m.get("subjectName") == subject]
        if faculty: markings = [m for m in markings if m.get("markedBy") == faculty]

    # Resolve class labels to check department, semester, section filters
    records_list = []
    
    for m in markings:
        entries = m.get("entries") or []
        present_count = sum(1 for e in entries if e.get("status") in {"Present", "On Duty"})
        absent_count = sum(1 for e in entries if e.get("status") == "Absent")
        total = len(entries)
        pct = round((present_count / total) * 100, 1) if total > 0 else 0.0

        # Extract class info
        label = m.get("classLabel") or ""
        # E.g. "Computer Science - Semester 6 - Section A" or "CO-S6A"
        dept = m.get("department") or "Computer Science"
        sem = m.get("semester") or "Semester 6"
        sec = m.get("section") or "Section A"

        if department and department.lower() not in dept.lower() and department.lower() not in label.lower():
            continue
        if semester and str(semester).lower() not in sem.lower() and str(semester).lower() not in label.lower():
            continue
        if section and section.lower() not in sec.lower() and section.lower() not in label.lower():
            continue

        if search:
            s_term = search.lower()
            if s_term not in str(m.get("subjectName", "")).lower() and s_term not in str(m.get("subjectCode", "")).lower() and s_term not in str(m.get("markedBy", "")).lower():
                continue

        records_list.append({
            "id": m.get("id") or str(m.get("_id")),
            "classId": m.get("classId"),
            "classLabel": label,
            "date": m.get("date"),
            "hour": m.get("hour"),
            "subjectCode": m.get("subjectCode") or "N/A",
            "subjectName": m.get("subjectName") or "Subject",
            "faculty": m.get("markedBy") or "System",
            "department": dept,
            "semester": sem,
            "section": sec,
            "presentCount": present_count,
            "absentCount": absent_count,
            "attendancePct": pct,
            "locked": m.get("locked") or False,
            "entries": entries
        })

    return {"success": True, "data": records_list}


@router.patch("/markings/lock")
async def toggle_attendance_lock(payload: dict):
    class_id = payload.get("classId")
    date = payload.get("date")
    hour = payload.get("hour")
    locked = payload.get("locked", False)

    if not class_id or not date or not hour:
        raise HTTPException(status_code=400, detail="classId, date, and hour are required")

    query = {
        "classId": class_id,
        "date": date,
        "hour": hour
    }

    try:
        db = get_db()
        use_db = True
    except HTTPException:
        use_db = False

    if use_db:
        updated = await db["academic_attendance_markings"].find_one_and_update(
            query,
            {"$set": {"locked": locked}},
            return_document=ReturnDocument.AFTER
        )
        if not updated:
            raise HTTPException(status_code=404, detail="Attendance marking session not found")
        return {"success": True, "data": serialize_doc(updated)}
    else:
        regs = _dev_list("academic_attendance_markings")
        session = next((s for s in regs if s.get("classId") == class_id and s.get("date") == date and s.get("hour") == hour), None)
        if not session:
            raise HTTPException(status_code=404, detail="Attendance marking session not found")
        session["locked"] = locked
        return {"success": True, "data": session}


@router.get("/markings/{class_id}/{date}/{hour}/history")
async def get_marking_history(class_id: str, date: str, hour: str):
    try:
        db = get_db()
        use_db = True
    except HTTPException:
        use_db = False

    query = {
        "classId": class_id,
        "date": date,
        "hour": hour
    }

    history = []
    if use_db:
        async for log in db["academic_attendance_history"].find(query).sort("updatedAt", -1):
            history.append(serialize_doc(log))
    else:
        history = [h for h in _dev_list("academic_attendance_history")
                   if h.get("classId") == class_id and h.get("date") == date and h.get("hour") == hour]
        history = sorted(history, key=lambda x: x.get("updatedAt", ""), reverse=True)

    return {"success": True, "data": history}


@router.get("/student/{student_id}/summary")
async def get_student_summary(student_id: str):
    try:
        db = get_db()
        use_db = True
    except HTTPException:
        use_db = False

    # Get student record
    student = None
    if use_db:
        student = await db["students"].find_one({"$or": [{"id": student_id}, {"rollNumber": student_id}]})
    else:
        from backend.routes.students import _seed_dev_students
        _seed_dev_students()
        student = next((s for s in _dev_list("students") if s.get("id") == student_id or s.get("rollNumber") == student_id), None)

    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    student_roll = student.get("rollNumber") or student_id

    # Fetch markings containing this student
    markings = []
    if use_db:
        async for m in db["academic_attendance_markings"].find({"entries.studentId": student_roll}):
            markings.append(serialize_doc(m))
    else:
        markings = [m for m in _dev_list("academic_attendance_markings")
                    if any(str(e.get("studentId")) == str(student_roll) for e in m.get("entries", []))]

    # Compute statistics
    total_classes = len(markings)
    classes_attended = 0
    classes_missed = 0
    classes_leave = 0
    classes_od = 0

    subject_wise = {}
    detailed_log = []

    for m in markings:
        entries = m.get("entries") or []
        student_entry = next((e for e in entries if str(e.get("studentId")) == str(student_roll)), None)
        if student_entry:
            status = student_entry.get("status", "Present")
            remarks = student_entry.get("remarks") or ""

            if status in {"Present", "On Duty"}:
                classes_attended += 1
            if status == "Absent":
                classes_missed += 1
            elif status == "Leave":
                classes_leave += 1
            elif status == "On Duty":
                classes_od += 1

            sub_code = m.get("subjectCode") or "N/A"
            sub_name = m.get("subjectName") or "Subject"

            if sub_code not in subject_wise:
                subject_wise[sub_code] = {
                    "subject": sub_name,
                    "code": sub_code,
                    "present": 0,
                    "absent": 0,
                    "leave": 0,
                    "od": 0,
                    "total": 0
                }

            subject_wise[sub_code]["total"] += 1
            if status == "Present": subject_wise[sub_code]["present"] += 1
            elif status == "Absent": subject_wise[sub_code]["absent"] += 1
            elif status == "Leave": subject_wise[sub_code]["leave"] += 1
            elif status == "On Duty": subject_wise[sub_code]["od"] += 1

            detailed_log.append({
                "date": m.get("date"),
                "period": m.get("hour"),
                "subjectName": sub_name,
                "subjectCode": sub_code,
                "status": status,
                "remarks": remarks
            })

    overall_pct = round((classes_attended / total_classes) * 100, 1) if total_classes > 0 else 100.0

    # Default mock statistics for seed verification if new student
    if total_classes == 0:
        overall_pct = 92.0
        classes_attended = 46
        classes_missed = 4
        subject_wise = {
            "CS301": {"subject": "Data Structures", "code": "CS301", "present": 18, "absent": 2, "leave": 0, "od": 0, "total": 20, "attendancePct": 90.0},
            "CS302": {"subject": "Operating Systems", "code": "CS302", "present": 19, "absent": 1, "leave": 0, "od": 0, "total": 20, "attendancePct": 95.0}
        }

    # Format subject-wise details
    subject_list = []
    for k, v in subject_wise.items():
        v_total = v["total"]
        v_present = v["present"] + v["od"] # OD counts as present
        v["attendancePct"] = round((v_present / v_total) * 100, 1) if v_total > 0 else 100.0
        subject_list.append(v)

    # Sort detailed log by date descending
    detailed_log = sorted(detailed_log, key=lambda x: x.get("date", ""), reverse=True)

    return {
        "success": True,
        "data": {
            "overallAttendancePct": overall_pct,
            "totalClassesAttended": classes_attended,
            "totalClassesMissed": classes_missed,
            "subjectWise": subject_list,
            "detailedLog": detailed_log
        }
    }


@router.get("/finance/eligibility")
async def get_finance_eligibility(
    department: Optional[str] = None,
    semester: Optional[str] = None,
    section: Optional[str] = None,
    search: Optional[str] = None,
):
    try:
        db = get_db()
        use_db = True
    except HTTPException:
        use_db = False

    # Get student pool matching filters
    students_list = []
    if use_db:
        sq_conditions = []
        if department:
            dept_escaped = re.escape(department.split('&')[0].split('and')[0].strip())
            sq_conditions.append({"department": {"$regex": dept_escaped, "$options": "i"}})
        if semester:
            sem_str = str(semester).replace("Semester", "").strip()
            if sem_str.isdigit():
                sq_conditions.append({"$or": [{"semester": int(sem_str)}, {"semester": f"Semester {sem_str}"}, {"semester": semester}]})
            else:
                sq_conditions.append({"semester": semester})
        if section:
            sec_val = str(section).replace("Section", "").strip()
            sq_conditions.append({"$or": [{"section": section}, {"section": sec_val}, {"section": f"Section {sec_val}"}]})
        sq = {"$and": sq_conditions} if sq_conditions else {}
        
        async for s in db["students"].find(sq):
            students_list.append(serialize_doc(s))
    else:
        from backend.routes.students import _seed_dev_students
        _seed_dev_students()
        students_list = _dev_list("students")
        if department:
            students_list = [s for s in students_list if str(s.get("department")).lower() == department.lower()]
        if semester:
            sem_str = str(semester).lower().replace("semester", "").strip()
            students_list = [s for s in students_list if sem_str in str(s.get("semester")).lower()]
        if section:
            sec_str = str(section).lower().replace("section", "").strip()
            students_list = [s for s in students_list if sec_str in str(s.get("section")).lower()]

    result = []
    for s in students_list:
        sid = s.get("rollNumber") or s.get("id") or str(s.get("_id"))
        sname = s.get("name") or "Student"
        sdept = s.get("department") or "Computer Science"
        ssem = s.get("semester") or "Semester 6"

        if search:
            s_term = search.lower()
            if s_term not in sname.lower() and s_term not in sid.lower():
                continue

        # Get markings counts dynamically
        markings = []
        if use_db:
            async for m in db["academic_attendance_markings"].find({"entries.studentId": sid}):
                markings.append(serialize_doc(m))
        else:
            markings = [m for m in _dev_list("academic_attendance_markings")
                        if any(str(e.get("studentId")) == str(sid) for e in m.get("entries", []))]

        total_classes = len(markings)
        classes_attended = sum(1 for m in markings if any(str(e.get("studentId")) == str(sid) and e.get("status") in {"Present", "On Duty"} for e in m.get("entries", [])))

        db_pct = s.get("attendancePct")
        db_pct = db_pct if db_pct is not None else 100.0
        overall_pct = round((classes_attended / total_classes) * 100, 1) if total_classes > 0 else db_pct

        # Eligibility Status Mapping
        if overall_pct >= 75.0:
            status = "Eligible"
        elif overall_pct >= 60.0:
            status = "Warning"
        else:
            status = "Not Eligible"

        result.append({
            "rollNumber": sid,
            "studentName": sname,
            "department": sdept,
            "semester": ssem,
            "attendancePct": overall_pct,
            "eligibilityStatus": status
        })

    return {"success": True, "data": result}


# --- LEGACY OD REQUEST ENDPOINTS ---

@router.get("/od-requests")
async def list_od_requests(student_id: Optional[str] = None, status: Optional[str] = None):
    try:
        db = get_db()
    except HTTPException as error:
        if error.status_code == 503:
            return {"success": True, "data": list_dev_od_requests(student_id, status)}
        raise

    query = {}
    if student_id:
        query["studentId"] = student_id
    if status and status != "All":
        query["status"] = status

    rows = []
    async for row in db["academic_od_requests"].find(query).sort("createdAt", -1):
        rows.append(serialize_doc(row))
    return {"success": True, "data": rows}


@router.post("/od-requests")
async def create_od_request(payload: OdRequestPayload):
    data = payload.model_dump()
    request_id = data.get("requestId") or f"od-{uuid4().hex[:12]}"
    data["requestId"] = request_id
    if not data.get("createdAt"):
        data["createdAt"] = datetime.utcnow().isoformat()

    try:
        db = get_db()
    except HTTPException as error:
        if error.status_code == 503:
            return {"success": True, "data": create_dev_od_request(data)}
        raise

    result = await db["academic_od_requests"].insert_one(data)
    created = await db["academic_od_requests"].find_one({"_id": result.inserted_id})

    # Send notification to faculty (gated by faculty settings)
    await send_notification(
        db=db,
        receiver_role="faculty",
        event_key="odRequests",
        title="New OD Request Submitted",
        message=f"Student {data.get('studentId')} has submitted a new OD request for {data.get('fromDate')}.",
        sender_role="student",
        module="Academic",
        priority="Medium",
        related_data={"studentId": data.get("studentId"), "requestId": request_id}
    )

    # Send notification to student (gated by student settings and targeted to specific student)
    student_id = data.get("studentId")
    await send_notification(
        db=db,
        receiver_role="student",
        event_key="odStatusUpdate",
        title="OD Request Submitted",
        message=f"Your OD request for {data.get('fromDate')} has been submitted and is pending faculty approval.",
        sender_role="system",
        module="Academic",
        priority="Low",
        related_data={"studentId": student_id, "requestId": request_id},
        receiver_user_id=student_id
    )

    return {"success": True, "data": serialize_doc(created)}


@router.put("/od-requests/{request_id}")
async def update_od_request(request_id: str, payload: OdRequestPayload):
    data = payload.model_dump()
    data["requestId"] = request_id
    data["updatedAt"] = datetime.utcnow().isoformat()

    try:
        db = get_db()
    except HTTPException as error:
        if error.status_code == 503:
            updated = update_dev_od_request(request_id, data)
            if not updated:
                raise HTTPException(status_code=404, detail="OD request not found")
            return {"success": True, "data": updated}
        raise

    updated = await db["academic_od_requests"].find_one_and_update(
        {"requestId": request_id},
        {"$set": data},
        return_document=ReturnDocument.AFTER,
    )
    if not updated:
        raise HTTPException(status_code=404, detail="OD request not found")
    return {"success": True, "data": serialize_doc(updated)}


@router.patch("/od-requests/{request_id}/status")
async def update_od_request_status(request_id: str, payload: OdRequestStatusUpdate):
    status = payload.status
    if status not in {"Pending", "Approved", "Rejected"}:
        raise HTTPException(status_code=400, detail="Invalid OD status")

    patch = {
        "status": status,
        "reviewedBy": payload.reviewedBy,
        "reviewedAt": datetime.utcnow().isoformat(),
        "updatedAt": datetime.utcnow().isoformat(),
    }

    try:
        db = get_db()
    except HTTPException as error:
        if error.status_code == 503:
            updated = update_dev_od_request_status(request_id, status, payload.reviewedBy)
            if not updated:
                raise HTTPException(status_code=404, detail="OD request not found")
            return {"success": True, "data": updated}
        raise

    updated = await db["academic_od_requests"].find_one_and_update(
        {"requestId": request_id},
        {"$set": patch},
        return_document=ReturnDocument.AFTER,
    )
    if not updated:
        raise HTTPException(status_code=404, detail="OD request not found")

    # Send notification to student (gated by student settings and targeted to specific student)
    student_id = updated.get("studentId")
    await send_notification(
        db=db,
        receiver_role="student",
        event_key="odStatusUpdate",
        title=f"OD Request {status}",
        message=f"Your OD request for {updated.get('fromDate')} has been {status.lower()}.",
        sender_role="faculty",
        module="Academic",
        priority="Medium",
        related_data={"studentId": student_id, "requestId": request_id},
        receiver_user_id=student_id
    )

    # Send notification to faculty reviewer (gated by faculty settings)
    reviewer_id = payload.reviewedBy or updated.get("reviewedBy")
    if reviewer_id:
        await send_notification(
            db=db,
            receiver_role="faculty",
            event_key="odRequests",
            title="OD Request Reviewed",
            message=f"You have {status.lower()} the OD request for student {updated.get('studentId')}.",
            sender_role="system",
            module="Academic",
            priority="Low",
            related_data={"studentId": updated.get("studentId"), "requestId": request_id},
            receiver_user_id=reviewer_id
        )

    return {"success": True, "data": serialize_doc(updated)}


@router.delete("/od-requests/{request_id}")
async def delete_od_request(request_id: str):
    try:
        db = get_db()
    except HTTPException as error:
        if error.status_code == 503:
            deleted = delete_dev_od_request(request_id)
            if not deleted:
                raise HTTPException(status_code=404, detail="OD request not found")
            return {"success": True, "message": "OD request deleted"}
        raise

    result = await db["academic_od_requests"].delete_one({"requestId": request_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="OD request not found")
    return {"success": True, "message": "OD request deleted"}


@router.get("/faculty/markings")
async def get_faculty_attendance_markings(date: str):
    """Get daily attendance marking list for faculty, checking approved leaves if no record exists"""
    try:
        db = get_db()
        use_db = True
    except HTTPException as error:
        if error.status_code == 503:
            use_db = False
        else:
            raise

    # 1. Look for existing daily marking record
    existing = None
    if use_db:
        existing = await db["faculty_attendance_markings"].find_one({"date": date})
    else:
        from backend.dev_store import DEV_STORE
        existing = DEV_STORE.setdefault("faculty_attendance_markings", {}).get(date)

    if existing:
        if use_db:
            return {"success": True, "data": serialize_doc(existing)}
        else:
            return {"success": True, "data": existing}

    # 2. If no marking exists, fetch all faculty
    faculty_list = []
    if use_db:
        async for f in db["faculty"].find({"employment_status": "Active"}):
            faculty_list.append(serialize_doc(f))
    else:
        from backend.dev_store import DEV_STORE
        faculty_list = DEV_STORE.get("faculty", [])

    # 3. Fetch all approved leave requests that might cover the selected date
    try:
        selected_date = datetime.strptime(date, "%Y-%m-%d").date()
    except Exception:
        selected_date = datetime.utcnow().date()

    approved_leaves = []
    if use_db:
        async for doc in db["faculty_leaves"].find({"status": "Approved"}):
            approved_leaves.append(serialize_doc(doc))
    else:
        from backend.dev_store import DEV_STORE
        approved_leaves = [l for l in DEV_STORE.setdefault("faculty_leaves", []) if l.get("status") == "Approved"]

    # Map approved leaves by facultyId
    leaves_by_faculty = {}
    for leave in approved_leaves:
        f_id = leave.get("facultyId")
        try:
            # Parse dates (strip potential timezone suffix for simple parsing)
            start_str = leave.get("startDate", "").replace("Z", "")
            end_str = leave.get("endDate", "").replace("Z", "")
            start = datetime.fromisoformat(start_str).date()
            end = datetime.fromisoformat(end_str).date()
            if start <= selected_date <= end:
                leaves_by_faculty[f_id] = True
        except Exception:
            continue

    # 4. Construct the default list of markings
    entries = []
    for f in faculty_list:
        f_id = f.get("employeeId") or str(f.get("_id"))
        status = "On Leave" if leaves_by_faculty.get(f_id) else "Present"
        entries.append({
            "facultyId": f_id,
            "name": f.get("name") or f.get("fullName") or "Faculty",
            "department": f.get("departmentId") or f.get("department") or "General",
            "designation": f.get("designation") or "Lecturer",
            "status": status,
            "remarks": ""
        })

    # Sort entries by name
    entries = sorted(entries, key=lambda e: e.get("name", "").lower())

    default_record = {
        "date": date,
        "markedBy": "admin",
        "markedAt": None,
        "entries": entries
    }

    return {"success": True, "data": default_record}


@router.put("/faculty/markings")
async def upsert_faculty_attendance_markings(payload: FacultyAttendanceMarkRecord):
    data = payload.model_dump()
    date = data["date"]
    data["markedAt"] = datetime.utcnow().isoformat()

    try:
        db = get_db()
        use_db = True
    except HTTPException as error:
        if error.status_code == 503:
            use_db = False
        else:
            raise

    if use_db:
        updated = await db["faculty_attendance_markings"].find_one_and_update(
            {"date": date},
            {"$set": data},
            upsert=True,
            return_document=ReturnDocument.AFTER
        )
        return {"success": True, "data": serialize_doc(updated)}
    else:
        from backend.dev_store import DEV_STORE
        DEV_STORE.setdefault("faculty_attendance_markings", {})[date] = data
        return {"success": True, "data": data}
