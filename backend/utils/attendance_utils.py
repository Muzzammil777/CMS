from datetime import datetime, timedelta
from typing import Tuple

def list_date_range(from_date_str: str, to_date_str: str) -> list[str]:
    try:
        f_date = from_date_str.split('T')[0] if from_date_str else ""
        t_date = to_date_str.split('T')[0] if to_date_str else ""
        start = datetime.strptime(f_date, "%Y-%m-%d")
        end = datetime.strptime(t_date, "%Y-%m-%d")
        delta = end - start
        if delta.days < 0:
            return []
        return [(start + timedelta(days=i)).strftime("%Y-%m-%d") for i in range(delta.days + 1)]
    except Exception:
        return []

def normalize_id(val: str) -> str:
    return str(val or '').replace('#', '').strip().upper()

async def compute_student_attendance_stats(student: dict, db=None) -> Tuple[int, int, int]:
    """
    Computes (present, total, attendancePct) for a student.
    If db is provided, reads from MongoDB.
    Otherwise, reads from DEV_STORE in-memory.
    """
    student_id = student.get("id") or student.get("rollNumber")
    if not student_id:
        return 0, 0, 0
        
    norm_id = normalize_id(student_id)
    
    # 1. Base counts from student's seeded attendanceMonthly
    monthly = student.get("attendanceMonthly") or []
    base_present = sum(m.get("present", 0) for m in monthly)
    base_total = sum(m.get("total", 0) for m in monthly)
    
    # Fallback base if monthly is empty
    if base_total == 0:
        pct = student.get("attendancePct")
        if pct is not None:
            base_total = 100
            base_present = int(round(base_total * pct / 100))
        else:
            base_total = 24
            base_present = 22
            
    # 2. Approved OD requests
    approved_od_slots = set()
    if db is not None:
        query = {
            "studentId": {"$in": [student_id, norm_id]},
            "status": "Approved"
        }
        async for od in db["academic_od_requests"].find(query):
            from_date = od.get("fromDate") or od.get("date")
            to_date = od.get("toDate") or od.get("date")
            hours = od.get("hours") or []
            for d in list_date_range(from_date, to_date):
                for h in hours:
                    approved_od_slots.add(f"{d}::{h}")
    else:
        from backend.dev_store import DEV_STORE
        for od in DEV_STORE.get("od_requests", []):
            od_student_id = od.get("studentId")
            if od.get("status") == "Approved" and normalize_id(od_student_id) == norm_id:
                from_date = od.get("fromDate") or od.get("date")
                to_date = od.get("toDate") or od.get("date")
                hours = od.get("hours") or []
                for d in list_date_range(from_date, to_date):
                    for h in hours:
                        approved_od_slots.add(f"{d}::{h}")
                        
    # 3. Incremental markings from attendance markings
    inc_present = 0
    inc_total = 0
    
    if db is not None:
        query = {
            "entries.studentId": {"$in": [student_id, norm_id]}
        }
        async for marking in db["academic_attendance_markings"].find(query):
            date = marking.get("date")
            hour = marking.get("hour")
            entries = marking.get("entries") or []
            for entry in entries:
                entry_sid = entry.get("studentId")
                if entry_sid and normalize_id(entry_sid) == norm_id:
                    inc_total += 1
                    status = entry.get("status", "Present")
                    cell_key = f"{date}::{hour}"
                    if status in ("Present", "On Duty") or cell_key in approved_od_slots:
                        inc_present += 1
                    break
    else:
        from backend.dev_store import DEV_STORE
        for marking in DEV_STORE.get("attendance_markings", {}).values():
            date = marking.get("date")
            hour = marking.get("hour")
            entries = marking.get("entries") or []
            for entry in entries:
                entry_sid = entry.get("studentId")
                if entry_sid and normalize_id(entry_sid) == norm_id:
                    inc_total += 1
                    status = entry.get("status", "Present")
                    cell_key = f"{date}::{hour}"
                    if status in ("Present", "On Duty") or cell_key in approved_od_slots:
                        inc_present += 1
                    break
                    
    total = base_total + inc_total
    present = base_present + inc_present
    pct = int(round((present / total) * 100)) if total > 0 else 0
    return present, total, pct
