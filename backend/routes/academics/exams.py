from __future__ import annotations

from datetime import datetime
from uuid import uuid4
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, HTTPException
from pymongo import ReturnDocument

from backend.db import get_db
from backend.dev_store import DEV_STORE
from backend.dev_store import create_exam as create_dev_exam
from backend.dev_store import delete_exam as delete_dev_exam
from backend.dev_store import list_items
from backend.dev_store import update_exam as update_dev_exam
from backend.schemas.academics import ExamCreate, ExamUpdate
from backend.utils.mongo import serialize_doc
from backend.utils.notify import send_notification

router = APIRouter(prefix="/api/exams", tags=["academics:exams"])


def get_student_id_val(student: dict) -> str:
    if not student:
        return ""
    return student.get("rollNumber") or student.get("roll_number") or student.get("student_id") or student.get("id") or str(student.get("_id"))


def _id_query(id_value: str):
    query = {"id": id_value}
    if ObjectId.is_valid(id_value):
        query = {"$or": [{"_id": ObjectId(id_value)}, {"id": id_value}]}
    return query


def _now_iso():
    return datetime.utcnow().isoformat()


def _new_id(prefix: str):
    return f"{prefix}_{uuid4().hex[:12]}"


def _dev_list(key: str):
    return DEV_STORE.setdefault(key, [])


def _dev_get(key: str, item_id: str):
    return next((item for item in _dev_list(key) if str(item.get("id")) == str(item_id)), None)


def is_department_match(dept1: Optional[str], dept2: Optional[str]) -> bool:
    d1 = str(dept1 or "").strip().lower()
    d2 = str(dept2 or "").strip().lower()
    if not d1 or not d2:
        return False
    if d1 == d2:
        return True
    clean = lambda d: d.replace("and", "").replace("&", "").replace("engineering", "").replace("eng.", "").replace(" ", "").replace("-", "").strip()
    c1, c2 = clean(d1), clean(d2)
    if not c1 or not c2:
        return d1 in d2 or d2 in d1
    return c1 == c2 or c1 in c2 or c2 in c1 or d1 in d2 or d2 in d1


def is_year_match(year1, year2) -> bool:
    y1 = str(year1 or "").strip().lower()
    y2 = str(year2 or "").strip().lower()
    if not y1 or not y2:
        return False
    if y1 == y2:
        return True
    
    def normalize_year(y_str):
        import re
        digit_match = re.search(r'\d+', y_str)
        if digit_match:
            return digit_match.group()
        if "first" in y_str or "1st" in y_str:
            return "1"
        if "second" in y_str or "2nd" in y_str:
            return "2"
        if "third" in y_str or "3rd" in y_str:
            return "3"
        if "fourth" in y_str or "4th" in y_str:
            return "4"
        return y_str
        
    return normalize_year(y1) == normalize_year(y2)


def is_exam_class_match(exam, assigned_classes) -> bool:
    if not assigned_classes:
        return False
    
    exam_dept = exam.get("department", "")
    exam_year = exam.get("year", "")
    
    for ac in assigned_classes:
        ac_norm = str(ac).strip().lower()
        if not ac_norm:
            continue
        
        clean = lambda d: str(d or "").replace("and", "").replace("&", "").replace("engineering", "").replace("eng.", "").replace(" ", "").replace("-", "").strip().lower()
        exam_dept_clean = clean(exam_dept)
        ac_clean = clean(ac_norm)
        
        if exam_dept_clean and (exam_dept_clean in ac_clean or ac_clean in exam_dept_clean):
            if is_year_match(exam_year, ac_norm):
                return True
    return False


async def find_students_for_exam(db, exam, use_db: bool):
    norm_code = lambda c: str(c or '').replace('-', '').replace(' ', '').upper().strip()
    exam_code = exam.get("code")
    exam_name = exam.get("name")
    exam_dept = exam.get("department")
    exam_sem = exam.get("semester")
    exam_year = exam.get("year")
    
    matched = []
    
    if use_db:
        async for s in db["students"].find():
            student = serialize_doc(s)
            
            # 1. Subject code/name match
            subject_match = False
            for sub in student.get("subjects", []):
                sub_code = sub.get("code")
                sub_name = sub.get("name")
                
                if sub_code and exam_code and norm_code(sub_code) == norm_code(exam_code):
                    subject_match = True
                    break
                if sub_name and exam_name:
                    n1 = str(sub_name).lower().strip()
                    n2 = str(exam_name).lower().strip()
                    if n1 == n2 or n1 in n2 or n2 in n1:
                        subject_match = True
                        break
            
            if subject_match:
                matched.append(student)
                continue
                
            # 2. Class match
            if exam_dept and exam_sem and exam_year:
                is_class_match = (
                    is_department_match(student.get("department"), exam_dept) and
                    str(student.get("semester", "")) == str(exam_sem) and
                    is_year_match(student.get("year"), exam_year)
                )
                if is_class_match:
                    matched.append(student)
                    continue
    else:
        from backend.routes.students import _seed_dev_students
        _seed_dev_students()
        from backend.dev_store import list_items
        for student in list_items("students"):
            # 1. Subject code/name match
            subject_match = False
            for sub in student.get("subjects", []):
                sub_code = sub.get("code")
                sub_name = sub.get("name")
                
                if sub_code and exam_code and norm_code(sub_code) == norm_code(exam_code):
                    subject_match = True
                    break
                if sub_name and exam_name:
                    n1 = str(sub_name).lower().strip()
                    n2 = str(exam_name).lower().strip()
                    if n1 == n2 or n1 in n2 or n2 in n1:
                        subject_match = True
                        break
            
            if subject_match:
                matched.append(student)
                continue
                
            # 2. Class match
            if exam_dept and exam_sem and exam_year:
                is_class_match = (
                    is_department_match(student.get("department"), exam_dept) and
                    str(student.get("semester", "")) == str(exam_sem) and
                    is_year_match(student.get("year"), exam_year)
                )
                if is_class_match:
                    matched.append(student)
                    continue
                    
    return matched


@router.get("")
async def list_exams(role: Optional[str] = None, userId: Optional[str] = None):
    try:
        db = get_db()
        use_db = True
    except HTTPException as error:
        if error.status_code == 503:
            use_db = False
        else:
            raise

    exams = []
    if use_db:
        async for exam in db["exams"].find().sort("date", 1):
            exams.append(serialize_doc(exam))
    else:
        exams = list_items("exams")

    # Filter based on role and userId
    if not role or not userId:
        return {"success": True, "data": exams}

    filtered_exams = []
    norm_code = lambda c: str(c or '').replace('-', '').replace(' ', '').upper()
    if role == "student":
        student = None
        if use_db:
            student = await db["students"].find_one({"$or": [{"id": userId}, {"rollNumber": userId}]})
        else:
            from backend.routes.students import _seed_dev_students
            _seed_dev_students()
            student = next((s for s in list_items("students") if s.get("id") == userId or s.get("rollNumber") == userId), None)
        
        if student:
            enrolled_codes = {norm_code(s.get("code")) for s in student.get("subjects", []) if s.get("code")}
            enrolled_names = {str(s.get("name") or "").strip().lower() for s in student.get("subjects", []) if s.get("name")}
            for exam in exams:
                exam_code = norm_code(exam.get("code"))
                exam_name = str(exam.get("name") or "").strip().lower()
                
                subject_match = exam_code in enrolled_codes
                if not subject_match and exam_name:
                    for sname in enrolled_names:
                        if exam_name == sname or exam_name in sname or sname in exam_name:
                            subject_match = True
                            break
                            
                is_class_match = (
                    is_department_match(student.get("department", ""), exam.get("department", "")) and
                    str(student.get("semester", "")) == str(exam.get("semester", "")) and
                    is_year_match(student.get("year", ""), exam.get("year", ""))
                )
                if subject_match or is_class_match:
                    filtered_exams.append(exam)
        return {"success": True, "data": filtered_exams}

    elif role == "faculty":
        faculty = None
        if use_db:
            faculty = await db["faculty"].find_one({"$or": [{"employeeId": userId}, {"id": userId}]})
        else:
            faculty = next((f for f in list_items("faculty") if f.get("employeeId") == userId or f.get("id") == userId), None)
            
        if faculty:
            courses = faculty.get("courses") or []
            if isinstance(courses, str):
                courses = [c.strip() for c in courses.split(",") if c.strip()]
            courses_set = {c.lower() for c in courses}
            
            faculty_id = faculty.get("employeeId") or faculty.get("id") or str(faculty.get("_id", ""))
            faculty_name = faculty.get("name") or faculty.get("fullName") or ""
            
            assigned_classes = faculty.get("assignedClasses") or faculty.get("classes") or []
            if isinstance(assigned_classes, str):
                assigned_classes = [c.strip() for c in assigned_classes.split(",") if c.strip()]
            
            for exam in exams:
                ex_code = exam.get("code", "").lower()
                ex_name = exam.get("name", "").lower()
                match = False
                for c in courses_set:
                    if c in ex_code or c in ex_name or ex_code in c or ex_name in c:
                        match = True
                        break
                
                class_match = is_exam_class_match(exam, assigned_classes)
                
                is_invigilator = (
                    str(exam.get("invigilatorEmployeeId", "")).lower() == str(faculty_id).lower() or
                    str(exam.get("invigilatorName", "")).lower() == str(faculty_name).lower()
                )
                if match or class_match or is_invigilator:
                    filtered_exams.append(exam)
        return {"success": True, "data": filtered_exams}

    return {"success": True, "data": exams}


def _get_time_range(time_str: str, duration_mins: int):
    try:
        hours, minutes = map(int, time_str.split(":"))
        start_min = hours * 60 + minutes
        end_min = start_min + duration_mins
        return start_min, end_min
    except Exception:
        return 0, 0


@router.post("/schedule-preview")
async def schedule_preview(payload: dict):
    try:
        db = get_db()
        use_db = True
    except HTTPException as error:
        if error.status_code == 503:
            use_db = False
        else:
            raise

    default_facilities = [
        {"name": "Hall A", "status": "Available", "capacity": 100},
        {"name": "Hall B", "status": "Available", "capacity": 80},
        {"name": "Lab 1", "status": "Available", "capacity": 40},
        {"name": "Lab 2", "status": "Available", "capacity": 40},
        {"name": "Room 101", "status": "Available", "capacity": 60},
    ]
    facilities = []
    if use_db:
        async for f in db["academic_facilities"].find({"status": {"$ne": "Maintenance"}}):
            facilities.append(serialize_doc(f))
    else:
        facilities = [f for f in list_items("facilities") if f.get("status") != "Maintenance"]
    if not facilities:
        facilities = default_facilities

    default_faculties = [
        {"employeeId": "FAC001", "name": "Dr. Rajesh Kumar"},
        {"employeeId": "FAC002", "name": "Prof. Anjali Sharma"},
        {"employeeId": "FAC003", "name": "Dr. Priya Verma"},
        {"employeeId": "FAC005", "name": "Dr. Meera Patel"},
        {"employeeId": "FAC006", "name": "Prof. Sanjay Gupta"},
    ]
    faculties = []
    if use_db:
        async for fac in db["faculty"].find():
            faculties.append(serialize_doc(fac))
    else:
        faculties = list_items("faculty")
    if not faculties:
        faculties = default_faculties

    existing_exams = []
    existing_invigilators = []
    if use_db:
        async for ex in db["exams"].find():
            existing_exams.append(serialize_doc(ex))
        async for inv in db["exam_invigilators"].find():
            existing_invigilators.append(serialize_doc(inv))
    else:
        existing_exams = list_items("exams")
        existing_invigilators = list_items("exam_invigilators")

    room_busy = {}
    faculty_busy = {}

    for ex in existing_exams:
        ex_room = ex.get("room")
        ex_date = ex.get("date")
        ex_time = ex.get("time")
        ex_dur = int(ex.get("duration") or 120)
        if ex_room and ex_date and ex_time:
            s_min, e_min = _get_time_range(ex_time, ex_dur)
            room_busy.setdefault(ex_room, []).append((ex_date, s_min, e_min))
            
            ex_inv_id = ex.get("invigilatorId") or ex.get("invigilatorEmployeeId")
            if ex_inv_id:
                faculty_busy.setdefault(ex_inv_id, []).append((ex_date, s_min, e_min))

    for inv in existing_invigilators:
        ex_id = inv.get("examId")
        fac_id = inv.get("facultyId")
        ex = next((e for e in existing_exams if str(e.get("id")) == str(ex_id) or str(e.get("_id")) == str(ex_id)), None)
        if ex and fac_id:
            ex_date = ex.get("date")
            ex_time = ex.get("time")
            ex_dur = int(ex.get("duration") or 120)
            s_min, e_min = _get_time_range(ex_time, ex_dur)
            faculty_busy.setdefault(fac_id, []).append((ex_date, s_min, e_min))

    batch_duration = int(payload.get("duration") or 120)
    new_exams = payload.get("exams", [])
    allocated_exams = []
    local_room_busy = {}
    local_faculty_busy = {}

    for new_ex in new_exams:
        ex_code = new_ex.get("code")
        ex_name = new_ex.get("name")
        ex_date = new_ex.get("date")
        ex_time = new_ex.get("time")
        
        start_min, end_min = _get_time_range(ex_time, batch_duration)
        
        assigned_room = None
        for r in facilities:
            r_name = r.get("name")
            busy = False
            for b_date, b_start, b_end in room_busy.get(r_name, []):
                if b_date == ex_date and start_min < b_end and b_start < end_min:
                    busy = True
                    break
            if not busy:
                for b_date, b_start, b_end in local_room_busy.get(r_name, []):
                    if b_date == ex_date and start_min < b_end and b_start < end_min:
                        busy = True
                        break
            if not busy:
                assigned_room = r_name
                break
        if not assigned_room:
            assigned_room = facilities[0].get("name")
            
        local_room_busy.setdefault(assigned_room, []).append((ex_date, start_min, end_min))

        assigned_faculty = None
        for f in faculties:
            f_id = f.get("employeeId") or f.get("id") or str(f.get("_id"))
            f_name = f.get("name")
            busy = False
            for b_date, b_start, b_end in faculty_busy.get(f_id, []):
                if b_date == ex_date and start_min < b_end and b_start < end_min:
                    busy = True
                    break
            if not busy:
                for b_date, b_start, b_end in local_faculty_busy.get(f_id, []):
                    if b_date == ex_date and start_min < b_end and b_start < end_min:
                        busy = True
                        break
            if not busy:
                assigned_faculty = {"employeeId": f_id, "name": f_name}
                break
        if not assigned_faculty:
            f_fallback = faculties[0]
            assigned_faculty = {
                "employeeId": f_fallback.get("employeeId") or f_fallback.get("id") or str(f_fallback.get("_id")),
                "name": f_fallback.get("name")
            }
            
        local_faculty_busy.setdefault(assigned_faculty["employeeId"], []).append((ex_date, start_min, end_min))
        
        allocated_exams.append({
            "code": ex_code,
            "name": ex_name,
            "date": ex_date,
            "time": ex_time,
            "room": assigned_room,
            "invigilatorEmployeeId": assigned_faculty["employeeId"],
            "invigilatorName": assigned_faculty["name"]
        })

    return {"success": True, "data": allocated_exams}


@router.post("/schedule-bulk")
async def schedule_bulk(payload: dict):
    try:
        db = get_db()
        use_db = True
    except HTTPException as error:
        if error.status_code == 503:
            use_db = False
        else:
            raise

    dept = payload.get("dept")
    semester = payload.get("semester")
    year = payload.get("year")
    exam_type = payload.get("type")
    duration = payload.get("duration")
    max_marks = payload.get("maxMarks")
    exams_list = payload.get("exams", [])

    created_exams = []
    
    for ex in exams_list:
        exam_id = _new_id("exam")
        exam_doc = {
            "id": exam_id,
            "code": ex.get("code"),
            "name": ex.get("name"),
            "date": ex.get("date"),
            "time": ex.get("time"),
            "room": ex.get("room"),
            "type": exam_type,
            "status": "Upcoming",
            "duration": duration,
            "maxMarks": max_marks,
            "department": dept,
            "semester": semester,
            "year": year,
            "resultsPublished": False,
            "createdAt": _now_iso(),
            "updatedAt": _now_iso(),
        }
        
        if use_db:
            await db["exams"].insert_one(exam_doc)
            exam_doc = serialize_doc(exam_doc)
            inv_id = _new_id("inv")
            inv_doc = {
                "id": inv_id,
                "examId": exam_id,
                "facultyId": ex.get("invigilatorEmployeeId"),
                "facultyName": ex.get("invigilatorName"),
                "assignedBy": "Admin",
                "assignedAt": _now_iso(),
            }
            await db["exam_invigilators"].insert_one(inv_doc)
            
            matched_students = await find_students_for_exam(db, ex, use_db=True)
            for student in matched_students:
                student_id = get_student_id_val(student)
                await send_notification(
                    db=db,
                    receiver_role="student",
                    event_key="examReminder",
                    title="New Exam Scheduled",
                    message=f"A new exam '{ex.get('name')}' ({ex.get('code')}) has been scheduled for {ex.get('date')} at {ex.get('time')} in {ex.get('room')}.",
                    sender_role="admin",
                    module="Academic",
                    priority="High",
                    related_data={"examId": exam_id},
                    receiver_user_id=student_id,
                )
                if exam_type != "End-Sem":
                    dup = await db["exam_registrations"].find_one({"examId": exam_id, "studentId": student_id})
                    if not dup:
                        await db["exam_registrations"].insert_one({
                            "id": _new_id("reg"),
                            "examId": exam_id,
                            "studentId": student_id,
                            "studentName": student.get("name") or student_id,
                            "status": "Registered",
                            "registeredAt": _now_iso(),
                        })
        else:
            from backend.dev_store import create_notification
            DEV_STORE["exams"].append(exam_doc)
            inv_id = _new_id("inv")
            inv_doc = {
                "id": inv_id,
                "examId": exam_id,
                "facultyId": ex.get("invigilatorEmployeeId"),
                "facultyName": ex.get("invigilatorName"),
                "assignedBy": "Admin",
                "assignedAt": _now_iso(),
            }
            DEV_STORE.setdefault("exam_invigilators", []).append(inv_doc)
            
            matched_students = await find_students_for_exam(None, ex, use_db=False)
            for s in matched_students:
                student_id = get_student_id_val(s)
                create_notification({
                    "title": "New Exam Scheduled",
                    "message": f"A new exam '{ex.get('name')}' ({ex.get('code')}) has been scheduled for {ex.get('date')} at {ex.get('time')} in {ex.get('room')}.",
                    "senderRole": "admin",
                    "receiverRole": "student",
                    "receiverUserId": student_id,
                    "module": "Academic",
                    "priority": "High",
                    "createdAt": _now_iso(),
                    "relatedData": {"examId": exam_id}
                })
                if exam_type != "End-Sem":
                    regs = _dev_list("exam_registrations")
                    dup = next((item for item in regs if str(item.get("examId")) == str(exam_id) and str(item.get("studentId")) == str(student_id)), None)
                    if not dup:
                        regs.append({
                            "id": _new_id("reg"),
                            "examId": exam_id,
                            "studentId": student_id,
                            "studentName": s.get("name") or student_id,
                            "status": "Registered",
                            "registeredAt": _now_iso(),
                        })
        created_exams.append(exam_doc)

    return {"success": True, "data": created_exams}


@router.get("/{exam_id}/enrolled-students")
async def get_enrolled_students(exam_id: str):
    try:
        db = get_db()
        use_db = True
    except HTTPException as error:
        if error.status_code == 503:
            use_db = False
        else:
            raise

    if use_db:
        exam = await db["exams"].find_one(_id_query(exam_id))
        if not exam:
            raise HTTPException(status_code=404, detail="Exam not found")
        
        exam_id_str = str(exam.get("_id"))
        exam_id_val = exam.get("id")
        
        # 1. Active registrations inside exam_registrations
        registered_student_ids = set()
        async for reg in db["exam_registrations"].find({"examId": {"$in": [exam_id_str, exam_id_val]}}):
            if reg.get("studentId"):
                registered_student_ids.add(str(reg.get("studentId")))
                
        # 2. Get students matching exam subject or class details
        matched_students = await find_students_for_exam(db, exam, use_db=True)
        
        # 3. Add registered students who might not match the subject/class anymore
        for sid in registered_student_ids:
            already_matched = any(get_student_id_val(s) == sid for s in matched_students)
            if not already_matched:
                s_doc = await db["students"].find_one({"$or": [{"id": sid}, {"rollNumber": sid}, {"_id": ObjectId(sid) if ObjectId.is_valid(sid) else None}]})
                if s_doc:
                    matched_students.append(serialize_doc(s_doc))
    else:
        from backend.dev_store import list_items
        from backend.routes.students import _seed_dev_students
        _seed_dev_students()
        exams = list_items("exams")
        exam = next((e for e in exams if str(e.get("id")) == str(exam_id) or str(e.get("_id")) == str(exam_id)), None)
        if not exam:
            raise HTTPException(status_code=404, detail="Exam not found")
            
        exam_id_str = str(exam.get("id") or exam.get("_id"))
        
        regs = [item for item in _dev_list("exam_registrations") if str(item.get("examId")) == exam_id_str]
        registered_student_ids = {str(r.get("studentId")) for r in regs if r.get("studentId")}
        
        matched_students = await find_students_for_exam(None, exam, use_db=False)
        
        for sid in registered_student_ids:
            already_matched = any(get_student_id_val(s) == sid for s in matched_students)
            if not already_matched:
                s_doc = next((s for s in list_items("students") if str(s.get("id")) == sid or str(s.get("rollNumber")) == sid or str(s.get("_id")) == sid), None)
                if s_doc:
                    matched_students.append(s_doc)

    mapped_students = []
    seen_ids = set()
    for s in matched_students:
        sid = get_student_id_val(s)
        if sid in seen_ids:
            continue
        seen_ids.add(sid)
        sname = s.get("name") or s.get("fullName") or sid
        mapped_students.append({
            "id": sid,
            "studentId": sid,
            "studentName": sname
        })

    return {"success": True, "data": mapped_students}


@router.post("")
async def create_exam(payload: ExamCreate):
    try:
        db = get_db()
        use_db = True
    except HTTPException as error:
        if error.status_code == 503:
            use_db = False
        else:
            raise

    exam_data = payload.model_dump()
    if use_db:
        result = await db["exams"].insert_one(exam_data)
        created = await db["exams"].find_one({"_id": result.inserted_id})
        exam_doc = serialize_doc(created)
    else:
        exam_doc = create_dev_exam(exam_data)

    exam_type = exam_doc.get("type")
    exam_id = exam_doc.get("id") or str(exam_doc.get("_id"))
    code = exam_doc.get("code")
    
    if exam_type != "End-Sem" and code:
        if use_db:
            matched_students = await find_students_for_exam(db, exam_doc, use_db=True)
            for student in matched_students:
                student_id = get_student_id_val(student)
                dup = await db["exam_registrations"].find_one({"examId": exam_id, "studentId": student_id})
                if not dup:
                    await db["exam_registrations"].insert_one({
                        "id": _new_id("reg"),
                        "examId": exam_id,
                        "studentId": student_id,
                        "studentName": student.get("name") or student_id,
                        "status": "Registered",
                        "registeredAt": _now_iso(),
                    })
        else:
            matched_students = await find_students_for_exam(None, exam_doc, use_db=False)
            for s in matched_students:
                student_id = get_student_id_val(s)
                regs = _dev_list("exam_registrations")
                dup = next((item for item in regs if str(item.get("examId")) == str(exam_id) and str(item.get("studentId")) == str(student_id)), None)
                if not dup:
                    regs.append({
                        "id": _new_id("reg"),
                        "examId": exam_id,
                        "studentId": student_id,
                        "studentName": s.get("name") or student_id,
                        "status": "Registered",
                        "registeredAt": _now_iso(),
                    })

    return {"success": True, "data": exam_doc}






@router.delete("/{exam_id}")
async def delete_exam(exam_id: str):
    try:
        db = get_db()
    except HTTPException as error:
        if error.status_code == 503:
            deleted = delete_dev_exam(exam_id)
            if not deleted:
                raise HTTPException(status_code=404, detail="Exam not found")
            return {"success": True, "message": "Exam deleted"}
        raise
    result = await db["exams"].delete_one(_id_query(exam_id))
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Exam not found")
    return {"success": True, "message": "Exam deleted"}


@router.patch("/{exam_id}/publish-results")
async def publish_exam_results(exam_id: str):
    patch = {"resultsPublished": True, "status": "Completed", "updatedAt": _now_iso()}
    try:
        db = get_db()
    except HTTPException as error:
        if error.status_code == 503:
            updated = update_dev_exam(exam_id, patch)
            if not updated:
                raise HTTPException(status_code=404, detail="Exam not found")
            return {"success": True, "data": updated}
        raise

    updated = await db["exams"].find_one_and_update(
        _id_query(exam_id),
        {"$set": patch},
        return_document=ReturnDocument.AFTER,
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Exam not found")

    # Send notification to student role
    await db["notifications"].insert_one({
        "title": "Exam Results Published",
        "message": f"The final results for exam '{updated.get('name') or exam_id}' have been published.",
        "senderRole": "faculty",
        "receiverRole": "student",
        "module": "Academic",
        "priority": "High",
        "status": "unread",
        "createdAt": _now_iso(),
        "relatedData": {"examId": exam_id}
    })

    return {"success": True, "data": serialize_doc(updated)}


@router.get("/registrations")
async def list_registrations(exam_id: Optional[str] = None, student_id: Optional[str] = None):
    try:
        db = get_db()
    except HTTPException as error:
        if error.status_code == 503:
            items = _dev_list("exam_registrations")
            if exam_id:
                items = [item for item in items if str(item.get("examId")) == str(exam_id)]
            if student_id:
                items = [item for item in items if str(item.get("studentId")) == str(student_id)]
            return {"success": True, "data": items}
        raise

    query = {}
    if exam_id:
        query["examId"] = exam_id
    if student_id:
        query["studentId"] = student_id
    rows = []
    async for row in db["exam_registrations"].find(query).sort("registeredAt", -1):
        rows.append(serialize_doc(row))
    return {"success": True, "data": rows}


@router.post("/registrations")
async def create_registration(payload: dict):
    exam_id = payload.get("examId")
    student_id = payload.get("studentId")
    student_name = payload.get("studentName", "")
    if not exam_id or not student_id:
        raise HTTPException(status_code=400, detail="examId and studentId are required")

    data = {
        "id": payload.get("id") or _new_id("reg"),
        "examId": exam_id,
        "studentId": student_id,
        "studentName": student_name,
        "status": payload.get("status") or "Registered",
        "registeredAt": payload.get("registeredAt") or _now_iso(),
    }

    try:
        db = get_db()
    except HTTPException as error:
        if error.status_code == 503:
            items = _dev_list("exam_registrations")
            duplicate = next((item for item in items if str(item.get("examId")) == str(exam_id) and str(item.get("studentId")) == str(student_id)), None)
            if duplicate:
                raise HTTPException(status_code=400, detail="Already registered for this exam")
            items.append(data)
            return {"success": True, "data": data}
        raise

    duplicate = await db["exam_registrations"].find_one({"examId": exam_id, "studentId": student_id})
    if duplicate:
        raise HTTPException(status_code=400, detail="Already registered for this exam")

    await db["exam_registrations"].insert_one(data)
    return {"success": True, "data": serialize_doc(data)}


@router.get("/marks")
async def list_marks(exam_id: Optional[str] = None, student_id: Optional[str] = None):
    try:
        db = get_db()
    except HTTPException as error:
        if error.status_code == 503:
            items = _dev_list("exam_marks")
            if exam_id:
                items = [item for item in items if str(item.get("examId")) == str(exam_id)]
            if student_id:
                items = [item for item in items if str(item.get("studentId")) == str(student_id)]
            return {"success": True, "data": items}
        raise

    query = {}
    if exam_id:
        query["examId"] = exam_id
    if student_id:
        query["studentId"] = student_id
    rows = []
    async for row in db["exam_marks"].find(query).sort("updatedAt", -1):
        rows.append(serialize_doc(row))
    return {"success": True, "data": rows}


import re

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
            
        # 1. Substring match
        if normalized_ac in normalized_label or normalized_ac in normalized_id:
            return True
            
        # 2. Abbreviation match, e.g. "CSE-A"
        parts = re.split(r'[-_\s]+', normalized_ac)
        if len(parts) >= 2:
            first = parts[0]
            last = parts[-1]
            if len(last) == 1 and last.isalpha():
                # check if student section matches
                student_sec = normalized_id.split('-')[-1]
                if student_sec == last:
                    if first in ['cs', 'cse']:
                        if 'computer-science' in normalized_id or 'cse' in normalized_id:
                            return True
                    for code, names in dept_codes.items():
                        if first == code:
                            if any(name.replace(' ', '-') in normalized_id for name in names):
                                return True
                                
        # 3. Year match
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

async def validate_faculty_exam_permission(db, entered_by: str, exam_id: str, student_id: str):
    if not entered_by:
        return
        
    faculty = await db["faculty"].find_one({"$or": [{"employeeId": entered_by}, {"id": entered_by}]})
    if not faculty:
        # Not a faculty member, allow (could be admin or system)
        return
        
    # 1. Check subject/course assignment
    exam = await db["exams"].find_one(_id_query(exam_id))
    if exam:
        exam_code = exam.get("code", "")
        exam_name = exam.get("name", "")
        
        faculty_courses = faculty.get("courses") or []
        if isinstance(faculty_courses, str):
            faculty_courses = [c.strip() for c in faculty_courses.split(",") if c.strip()]
            
        course_match = False
        for fc in faculty_courses:
            fc_norm = fc.lower()
            if (exam_code and fc_norm in exam_code.lower()) or \
               (exam_name and fc_norm in exam_name.lower()) or \
               (exam_code and exam_code.lower() in fc_norm) or \
               (exam_name and exam_name.lower() in fc_norm):
                course_match = True
                break

        assigned_classes = faculty.get("assignedClasses") or faculty.get("classes") or []
        if isinstance(assigned_classes, str):
            assigned_classes = [c.strip() for c in assigned_classes.split(",") if c.strip()]
        class_match = is_exam_class_match(exam, assigned_classes)

        if not course_match and not class_match:
            raise HTTPException(status_code=403, detail="You are not assigned to this exam's subject or class.")
            
    # 2. Check student class assignment
    student = await db["students"].find_one({"$or": [{"id": student_id}, {"rollNumber": student_id}, {"student_id": student_id}]})
    if student:
        student_dept = student.get("department", "General")
        student_year = student.get("year", "Year")
        student_sec = student.get("section", "A")
        student_class_label = f"{student_dept} - {student_year} - Sec {student_sec}"
        
        student_class_id = f"{student_dept}__{student_year}__{student_sec}"
        student_class_id = re.sub(r'[^a-z0-9]+', '-', student_class_id.lower()).strip('-')
        
        assigned_classes = faculty.get("assignedClasses") or faculty.get("classes") or []
        if isinstance(assigned_classes, str):
            assigned_classes = [c.strip() for c in assigned_classes.split(",") if c.strip()]
            
        if not is_class_assigned_py(student_class_id, student_class_label, assigned_classes):
            raise HTTPException(status_code=403, detail=f"Student {student_id} is in class '{student_class_label}', which is not assigned to you.")

@router.put("/marks")
async def upsert_mark(payload: dict):
    exam_id = payload.get("examId")
    student_id = payload.get("studentId")
    if not exam_id or not student_id:
        raise HTTPException(status_code=400, detail="examId and studentId are required")

    data = {
        "examId": exam_id,
        "studentId": student_id,
        "marks": payload.get("marks"),
        "grade": payload.get("grade"),
        "enteredBy": payload.get("enteredBy", ""),
        "maxMarks": payload.get("maxMarks"),
        "updatedAt": _now_iso(),
    }

    try:
        db = get_db()
    except HTTPException as error:
        if error.status_code == 503:
            items = _dev_list("exam_marks")
            existing = next((item for item in items if str(item.get("examId")) == str(exam_id) and str(item.get("studentId")) == str(student_id)), None)
            if existing:
                existing.update(data)
                existing["id"] = existing.get("id") or _new_id("mark")
                existing["enteredAt"] = existing.get("enteredAt") or _now_iso()
                return {"success": True, "data": existing}
            created = {"id": _new_id("mark"), "enteredAt": _now_iso(), **data}
            items.append(created)
            return {"success": True, "data": created}
        raise

    # Validate faculty assignment permission
    entered_by = data.get("enteredBy", "")
    if entered_by:
        await validate_faculty_exam_permission(db, entered_by, exam_id, student_id)

    updated = await db["exam_marks"].find_one_and_update(
        {"examId": exam_id, "studentId": student_id},
        {"$set": data, "$setOnInsert": {"id": _new_id("mark"), "enteredAt": _now_iso()}},
        upsert=True,
        return_document=ReturnDocument.AFTER,
    )
    return {"success": True, "data": serialize_doc(updated)}


@router.get("/internal-marks")
async def list_internal_marks(exam_id: Optional[str] = None, student_id: Optional[str] = None, entered_by: Optional[str] = None):
    try:
        db = get_db()
    except HTTPException as error:
        if error.status_code == 503:
            items = _dev_list("exam_internal_marks")
            if exam_id:
                items = [item for item in items if str(item.get("examId")) == str(exam_id)]
            if student_id:
                items = [item for item in items if str(item.get("studentId")) == str(student_id)]
            return {"success": True, "data": items}
        raise

    query = {}
    if exam_id:
        query["examId"] = exam_id
    if student_id:
        query["studentId"] = student_id
    rows = []
    async for row in db["exam_internal_marks"].find(query).sort("updatedAt", -1):
        rows.append(serialize_doc(row))

    faculty = None
    if entered_by:
        faculty = await db["faculty"].find_one({"$or": [{"employeeId": entered_by}, {"id": entered_by}]})
        
    if faculty:
        assigned_classes = faculty.get("assignedClasses") or faculty.get("classes") or []
        if isinstance(assigned_classes, str):
            assigned_classes = [c.strip() for c in assigned_classes.split(",") if c.strip()]
            
        # Get all students to map classId/classLabel
        students_cursor = db["students"].find()
        student_class_map = {}
        async for s in students_cursor:
            student_dept = s.get("department", "General")
            student_year = s.get("year", "Year")
            student_sec = s.get("section", "A")
            s_class_label = f"{student_dept} - {student_year} - Sec {student_sec}"
            
            s_class_id = f"{student_dept}__{student_year}__{student_sec}"
            s_class_id = re.sub(r'[^a-z0-9]+', '-', s_class_id.lower()).strip('-')
            
            student_class_map[get_student_id_val(s)] = (s_class_id, s_class_label)
            
        filtered_rows = []
        for row in rows:
            sid = row.get("studentId")
            if sid in student_class_map:
                c_id, c_label = student_class_map[sid]
                if is_class_assigned_py(c_id, c_label, assigned_classes):
                    filtered_rows.append(row)
            else:
                pass
        return {"success": True, "data": filtered_rows}

    return {"success": True, "data": rows}


@router.put("/internal-marks")
async def upsert_internal_mark(payload: dict):
    exam_id = payload.get("examId")
    student_id = payload.get("studentId")
    if not exam_id or not student_id:
        raise HTTPException(status_code=400, detail="examId and studentId are required")

    data = {
        "examId": exam_id,
        "studentId": student_id,
        "internalMarks": payload.get("internalMarks"),
        "maxInternal": payload.get("maxInternal"),
        "enteredBy": payload.get("enteredBy", ""),
        "updatedAt": _now_iso(),
    }

    try:
        db = get_db()
    except HTTPException as error:
        if error.status_code == 503:
            items = _dev_list("exam_internal_marks")
            existing = next((item for item in items if str(item.get("examId")) == str(exam_id) and str(item.get("studentId")) == str(student_id)), None)
            if existing:
                existing.update(data)
                existing["id"] = existing.get("id") or _new_id("imark")
                existing["enteredAt"] = existing.get("enteredAt") or _now_iso()
                return {"success": True, "data": existing}
            created = {"id": _new_id("imark"), "enteredAt": _now_iso(), **data}
            items.append(created)
            return {"success": True, "data": created}
        raise

    # Validate faculty assignment permission
    entered_by = data.get("enteredBy", "")
    if entered_by:
        await validate_faculty_exam_permission(db, entered_by, exam_id, student_id)

    updated = await db["exam_internal_marks"].find_one_and_update(
        {"examId": exam_id, "studentId": student_id},
        {"$set": data, "$setOnInsert": {"id": _new_id("imark"), "enteredAt": _now_iso()}},
        upsert=True,
        return_document=ReturnDocument.AFTER,
    )

    # Send notification to the specific student (gated by their internalMarks preference)
    await send_notification(
        db=db,
        receiver_role="student",
        event_key="internalMarks",
        title="Internal Marks Published",
        message=(
            f"Your internal marks for exam '{updated.get('examId')}' have been published: "
            f"{payload.get('internalMarks')}/{payload.get('maxInternal')}."
        ),
        sender_role="faculty",
        module="Academic",
        priority="Medium",
        related_data={"studentId": student_id, "examId": exam_id},
        receiver_user_id=student_id,
    )

    return {"success": True, "data": serialize_doc(updated)}


@router.get("/attendance")
async def list_exam_attendance(exam_id: Optional[str] = None):
    try:
        db = get_db()
    except HTTPException as error:
        if error.status_code == 503:
            items = _dev_list("exam_attendance")
            if exam_id:
                items = [item for item in items if str(item.get("examId")) == str(exam_id)]
            return {"success": True, "data": items}
        raise

    query = {"examId": exam_id} if exam_id else {}
    rows = []
    async for row in db["exam_attendance"].find(query).sort("updatedAt", -1):
        rows.append(serialize_doc(row))
    return {"success": True, "data": rows}


@router.put("/attendance")
async def upsert_exam_attendance(payload: dict):
    exam_id = payload.get("examId")
    student_id = payload.get("studentId")
    if not exam_id or not student_id:
        raise HTTPException(status_code=400, detail="examId and studentId are required")

    data = {
        "examId": exam_id,
        "studentId": student_id,
        "status": payload.get("status") or "Present",
        "markedBy": payload.get("markedBy", ""),
        "updatedAt": _now_iso(),
    }

    try:
        db = get_db()
    except HTTPException as error:
        if error.status_code == 503:
            items = _dev_list("exam_attendance")
            existing = next((item for item in items if str(item.get("examId")) == str(exam_id) and str(item.get("studentId")) == str(student_id)), None)
            if existing:
                existing.update(data)
                existing["id"] = existing.get("id") or _new_id("eatt")
                existing["markedAt"] = existing.get("markedAt") or _now_iso()
                return {"success": True, "data": existing}
            created = {"id": _new_id("eatt"), "markedAt": _now_iso(), **data}
            items.append(created)
            return {"success": True, "data": created}
        raise

    updated = await db["exam_attendance"].find_one_and_update(
        {"examId": exam_id, "studentId": student_id},
        {"$set": data, "$setOnInsert": {"id": _new_id("eatt"), "markedAt": _now_iso()}},
        upsert=True,
        return_document=ReturnDocument.AFTER,
    )
    return {"success": True, "data": serialize_doc(updated)}


@router.get("/invigilators")
async def list_invigilators(exam_id: Optional[str] = None):
    try:
        db = get_db()
    except HTTPException as error:
        if error.status_code == 503:
            items = _dev_list("exam_invigilators")
            if exam_id:
                items = [item for item in items if str(item.get("examId")) == str(exam_id)]
            return {"success": True, "data": items}
        raise

    query = {"examId": exam_id} if exam_id else {}
    rows = []
    async for row in db["exam_invigilators"].find(query).sort("assignedAt", -1):
        rows.append(serialize_doc(row))
    return {"success": True, "data": rows}


@router.post("/invigilators")
async def assign_invigilator(payload: dict):
    exam_id = payload.get("examId")
    faculty_id = payload.get("facultyId")
    if not exam_id or not faculty_id:
        raise HTTPException(status_code=400, detail="examId and facultyId are required")

    data = {
        "id": payload.get("id") or _new_id("inv"),
        "examId": exam_id,
        "facultyId": faculty_id,
        "facultyName": payload.get("facultyName", ""),
        "assignedBy": payload.get("assignedBy", ""),
        "assignedAt": payload.get("assignedAt") or _now_iso(),
    }

    try:
        db = get_db()
    except HTTPException as error:
        if error.status_code == 503:
            items = _dev_list("exam_invigilators")
            duplicate = next((item for item in items if str(item.get("examId")) == str(exam_id) and str(item.get("facultyId")) == str(faculty_id)), None)
            if duplicate:
                raise HTTPException(status_code=400, detail="Faculty already assigned to this exam")
            items.append(data)
            return {"success": True, "data": data}
        raise

    duplicate = await db["exam_invigilators"].find_one({"examId": exam_id, "facultyId": faculty_id})
    if duplicate:
        raise HTTPException(status_code=400, detail="Faculty already assigned to this exam")

    await db["exam_invigilators"].insert_one(data)
    return {"success": True, "data": serialize_doc(data)}


@router.delete("/invigilators/{assignment_id}")
async def remove_invigilator(assignment_id: str):
    try:
        db = get_db()
    except HTTPException as error:
        if error.status_code == 503:
            items = _dev_list("exam_invigilators")
            index = next((i for i, item in enumerate(items) if str(item.get("id")) == str(assignment_id)), None)
            if index is None:
                raise HTTPException(status_code=404, detail="Assignment not found")
            del items[index]
            return {"success": True, "message": "Invigilator removed"}
        raise

    result = await db["exam_invigilators"].delete_one(_id_query(assignment_id))
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Assignment not found")
    return {"success": True, "message": "Invigilator removed"}


@router.get("/revaluations")
async def list_revaluations(student_id: Optional[str] = None, exam_id: Optional[str] = None):
    try:
        db = get_db()
    except HTTPException as error:
        if error.status_code == 503:
            items = _dev_list("exam_revaluations")
            if student_id:
                items = [item for item in items if str(item.get("studentId")) == str(student_id)]
            if exam_id:
                items = [item for item in items if str(item.get("examId")) == str(exam_id)]
            return {"success": True, "data": items}
        raise

    query = {}
    if student_id:
        query["studentId"] = student_id
    if exam_id:
        query["examId"] = exam_id
    rows = []
    async for row in db["exam_revaluations"].find(query).sort("appliedAt", -1):
        rows.append(serialize_doc(row))
    return {"success": True, "data": rows}


@router.post("/revaluations")
async def create_revaluation(payload: dict):
    exam_id = payload.get("examId")
    student_id = payload.get("studentId")
    if not exam_id or not student_id:
        raise HTTPException(status_code=400, detail="examId and studentId are required")

    data = {
        "id": payload.get("id") or _new_id("reval"),
        "examId": exam_id,
        "studentId": student_id,
        "studentName": payload.get("studentName", ""),
        "reason": payload.get("reason", ""),
        "status": payload.get("status") or "Pending",
        "appliedAt": payload.get("appliedAt") or _now_iso(),
    }

    try:
        db = get_db()
    except HTTPException as error:
        if error.status_code == 503:
            items = _dev_list("exam_revaluations")
            duplicate = next((item for item in items if str(item.get("examId")) == str(exam_id) and str(item.get("studentId")) == str(student_id)), None)
            if duplicate:
                raise HTTPException(status_code=400, detail="Already applied for revaluation")
            items.append(data)
            return {"success": True, "data": data}
        raise

    duplicate = await db["exam_revaluations"].find_one({"examId": exam_id, "studentId": student_id})
    if duplicate:
        raise HTTPException(status_code=400, detail="Already applied for revaluation")

    await db["exam_revaluations"].insert_one(data)
    return {"success": True, "data": serialize_doc(data)}


@router.get("/halls")
async def list_exam_halls():
    default_halls = [
        {"id": "hall_a", "name": "Hall A", "capacity": 100, "building": "Main Block"},
        {"id": "hall_b", "name": "Hall B", "capacity": 80, "building": "Main Block"},
        {"id": "lab_1", "name": "Lab 1", "capacity": 40, "building": "CS Block"},
        {"id": "lab_2", "name": "Lab 2", "capacity": 40, "building": "CS Block"},
        {"id": "room_101", "name": "Room 101", "capacity": 60, "building": "Admin Block"},
    ]
    try:
        db = get_db()
    except HTTPException as error:
        if error.status_code == 503:
            halls = _dev_list("exam_halls")
            if not halls:
                DEV_STORE["exam_halls"] = default_halls
                halls = DEV_STORE["exam_halls"]
            return {"success": True, "data": halls}
        raise

    rows = []
    async for row in db["academic_facilities"].find({"status": {"$ne": "Maintenance"}}).sort("name", 1):
        rows.append(serialize_doc(row))
    return {"success": True, "data": rows if rows else default_halls}


@router.get("/seats")
async def list_seat_assignments(exam_id: Optional[str] = None, student_id: Optional[str] = None):
    try:
        db = get_db()
    except HTTPException as error:
        if error.status_code == 503:
            items = _dev_list("exam_seat_assignments")
            if exam_id:
                items = [item for item in items if str(item.get("examId")) == str(exam_id)]
            if student_id:
                items = [item for item in items if str(item.get("studentId")) == str(student_id)]
            return {"success": True, "data": items}
        raise

    query = {}
    if exam_id:
        query["examId"] = exam_id
    if student_id:
        query["studentId"] = student_id
    rows = []
    async for row in db["exam_seat_assignments"].find(query).sort("updatedAt", -1):
        rows.append(serialize_doc(row))
    return {"success": True, "data": rows}


@router.put("/seats")
async def upsert_seat_assignment(payload: dict):
    exam_id = payload.get("examId")
    student_id = payload.get("studentId")
    if not exam_id or not student_id:
        raise HTTPException(status_code=400, detail="examId and studentId are required")

    data = {
        "examId": exam_id,
        "studentId": student_id,
        "seatNumber": payload.get("seatNumber", ""),
        "hallName": payload.get("hallName", ""),
        "updatedAt": _now_iso(),
    }

    try:
        db = get_db()
    except HTTPException as error:
        if error.status_code == 503:
            items = _dev_list("exam_seat_assignments")
            existing = next((item for item in items if str(item.get("examId")) == str(exam_id) and str(item.get("studentId")) == str(student_id)), None)
            if existing:
                existing.update(data)
                existing["id"] = existing.get("id") or _new_id("seat")
                return {"success": True, "data": existing}
            created = {"id": _new_id("seat"), **data}
            items.append(created)
            return {"success": True, "data": created}
        raise

    updated = await db["exam_seat_assignments"].find_one_and_update(
        {"examId": exam_id, "studentId": student_id},
        {"$set": data, "$setOnInsert": {"id": _new_id("seat")}},
        upsert=True,
        return_document=ReturnDocument.AFTER,
    )
    return {"success": True, "data": serialize_doc(updated)}


@router.put("/{exam_id}")
async def update_exam(exam_id: str, payload: ExamUpdate):
    update_data = {key: value for key, value in payload.model_dump().items() if value is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields provided for update")

    try:
        db = get_db()
    except HTTPException as error:
        if error.status_code == 503:
            updated = update_dev_exam(exam_id, update_data)
            if not updated:
                raise HTTPException(status_code=404, detail="Exam not found")
            return {"success": True, "data": updated}
        raise

    updated = await db["exams"].find_one_and_update(
        _id_query(exam_id),
        {"$set": update_data},
        return_document=ReturnDocument.AFTER,
    )

    if not updated:
        raise HTTPException(status_code=404, detail="Exam not found")

    return {"success": True, "data": serialize_doc(updated)}


@router.post("/seats/auto-assign")
async def auto_assign_seats(payload: dict):
    exam_id = payload.get("examId")
    hall_name = payload.get("hallName")
    if not exam_id or not hall_name:
        raise HTTPException(status_code=400, detail="examId and hallName are required")

    try:
        db = get_db()
    except HTTPException as error:
        if error.status_code == 503:
            regs = [item for item in _dev_list("exam_registrations") if str(item.get("examId")) == str(exam_id)]
            seats = _dev_list("exam_seat_assignments")
            assigned = 0
            seat_no = 1
            for reg in regs:
                existing = next((item for item in seats if str(item.get("examId")) == str(exam_id) and str(item.get("studentId")) == str(reg.get("studentId"))), None)
                if existing:
                    continue
                seats.append({
                    "id": _new_id("seat"),
                    "examId": exam_id,
                    "studentId": reg.get("studentId"),
                    "seatNumber": f"{hall_name[:1]}-{seat_no}",
                    "hallName": hall_name,
                    "updatedAt": _now_iso(),
                })
                assigned += 1
                seat_no += 1
            return {"success": True, "data": {"assigned": assigned}}
        raise

    regs = []
    async for row in db["exam_registrations"].find({"examId": exam_id}):
        regs.append(serialize_doc(row))

    assigned = 0
    seat_no = 1
    for reg in regs:
        student_id = reg.get("studentId")
        if not student_id:
            continue
        existing = await db["exam_seat_assignments"].find_one({"examId": exam_id, "studentId": student_id})
        if existing:
            continue
        await db["exam_seat_assignments"].insert_one({
            "id": _new_id("seat"),
            "examId": exam_id,
            "studentId": student_id,
            "seatNumber": f"{hall_name[:1]}-{seat_no}",
            "hallName": hall_name,
            "updatedAt": _now_iso(),
        })
        assigned += 1
        seat_no += 1

    return {"success": True, "data": {"assigned": assigned}}


@router.get("/sessions")
async def list_exam_sessions():
    try:
        db = get_db()
    except HTTPException as error:
        if error.status_code == 503:
            return {"success": True, "data": _dev_list("exam_sessions")}
        raise

    rows = []
    async for row in db["exam_sessions"].find().sort("createdAt", -1):
        rows.append(serialize_doc(row))
    return {"success": True, "data": rows}


@router.post("/sessions")
async def create_exam_session(payload: dict):
    data = {"id": payload.get("id") or _new_id("session"), "createdAt": _now_iso(), **payload}
    try:
        db = get_db()
    except HTTPException as error:
        if error.status_code == 503:
            _dev_list("exam_sessions").append(data)
            return {"success": True, "data": data}
        raise

    await db["exam_sessions"].insert_one(data)
    return {"success": True, "data": serialize_doc(data)}


@router.put("/sessions/{session_id}")
async def update_exam_session(session_id: str, payload: dict):
    patch = {**payload, "updatedAt": _now_iso()}
    try:
        db = get_db()
    except HTTPException as error:
        if error.status_code == 503:
            item = _dev_get("exam_sessions", session_id)
            if not item:
                raise HTTPException(status_code=404, detail="Session not found")
            item.update(patch)
            return {"success": True, "data": item}
        raise

    updated = await db["exam_sessions"].find_one_and_update(
        _id_query(session_id),
        {"$set": patch},
        return_document=ReturnDocument.AFTER,
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"success": True, "data": serialize_doc(updated)}


@router.get("/timetable-drafts")
async def list_timetable_drafts():
    try:
        db = get_db()
    except HTTPException as error:
        if error.status_code == 503:
            return {"success": True, "data": _dev_list("exam_timetable_drafts")}
        raise

    rows = []
    async for row in db["exam_timetable_drafts"].find().sort("createdAt", -1):
        rows.append(serialize_doc(row))
    return {"success": True, "data": rows}


@router.post("/timetable-drafts")
async def create_timetable_draft(payload: dict):
    data = {
        "id": payload.get("id") or _new_id("tdraft"),
        "session": payload.get("session", ""),
        "semester": payload.get("semester", ""),
        "academicYear": payload.get("academicYear", ""),
        "exams": payload.get("exams") or [],
        "createdBy": payload.get("createdBy", ""),
        "status": payload.get("status") or "Draft",
        "createdAt": payload.get("createdAt") or _now_iso(),
    }
    try:
        db = get_db()
    except HTTPException as error:
        if error.status_code == 503:
            _dev_list("exam_timetable_drafts").append(data)
            return {"success": True, "data": data}
        raise

    await db["exam_timetable_drafts"].insert_one(data)
    return {"success": True, "data": serialize_doc(data)}


@router.patch("/timetable-drafts/{draft_id}/status")
async def update_timetable_draft_status(draft_id: str, payload: dict):
    patch = {
        "status": payload.get("status"),
        "reviewedBy": payload.get("reviewedBy"),
        "remarks": payload.get("remarks", ""),
        "reviewedAt": _now_iso(),
    }
    try:
        db = get_db()
    except HTTPException as error:
        if error.status_code == 503:
            item = _dev_get("exam_timetable_drafts", draft_id)
            if not item:
                raise HTTPException(status_code=404, detail="Draft not found")
            item.update(patch)
            return {"success": True, "data": item}
        raise

    updated = await db["exam_timetable_drafts"].find_one_and_update(
        _id_query(draft_id),
        {"$set": patch},
        return_document=ReturnDocument.AFTER,
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Draft not found")
    return {"success": True, "data": serialize_doc(updated)}


@router.get("/notifications")
async def list_exam_notifications(student_id: Optional[str] = None):
    try:
        db = get_db()
    except HTTPException as error:
        if error.status_code == 503:
            items = _dev_list("exam_notifications")
            if student_id:
                items = [item for item in items if str(item.get("studentId")) == str(student_id)]
            items = sorted(items, key=lambda item: item.get("createdAt", ""), reverse=True)
            return {"success": True, "data": items}
        raise

    query = {"studentId": student_id} if student_id else {}
    rows = []
    async for row in db["exam_notifications"].find(query).sort("createdAt", -1):
        rows.append(serialize_doc(row))
    return {"success": True, "data": rows}


@router.post("/notifications")
async def create_exam_notification(payload: dict):
    data = {
        "id": payload.get("id") or _new_id("notif"),
        "studentId": payload.get("studentId"),
        "message": payload.get("message", ""),
        "type": payload.get("type") or "info",
        "read": False,
        "createdAt": payload.get("createdAt") or _now_iso(),
    }
    if not data["studentId"]:
        raise HTTPException(status_code=400, detail="studentId is required")

    try:
        db = get_db()
    except HTTPException as error:
        if error.status_code == 503:
            _dev_list("exam_notifications").append(data)
            return {"success": True, "data": data}
        raise

    await db["exam_notifications"].insert_one(data)
    return {"success": True, "data": serialize_doc(data)}


@router.patch("/notifications/{notification_id}/read")
async def mark_notification_as_read(notification_id: str):
    patch = {"read": True, "updatedAt": _now_iso()}
    try:
        db = get_db()
    except HTTPException as error:
        if error.status_code == 503:
            item = _dev_get("exam_notifications", notification_id)
            if not item:
                raise HTTPException(status_code=404, detail="Notification not found")
            item.update(patch)
            return {"success": True, "data": item}
        raise

    updated = await db["exam_notifications"].find_one_and_update(
        _id_query(notification_id),
        {"$set": patch},
        return_document=ReturnDocument.AFTER,
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"success": True, "data": serialize_doc(updated)}


@router.patch("/notifications/mark-all-read")
async def mark_all_notifications_as_read(payload: dict):
    student_id = payload.get("studentId")
    if not student_id:
        raise HTTPException(status_code=400, detail="studentId is required")

    try:
        db = get_db()
    except HTTPException as error:
        if error.status_code == 503:
            items = _dev_list("exam_notifications")
            for item in items:
                if str(item.get("studentId")) == str(student_id):
                    item["read"] = True
                    item["updatedAt"] = _now_iso()
            return {"success": True, "message": "Notifications marked as read"}
        raise

    await db["exam_notifications"].update_many(
        {"studentId": student_id},
        {"$set": {"read": True, "updatedAt": _now_iso()}},
    )
    return {"success": True, "message": "Notifications marked as read"}
