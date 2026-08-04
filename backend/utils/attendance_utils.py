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


async def compute_bulk_student_attendance_stats(students: list[dict], db=None) -> dict[str, Tuple[int, int, int]]:
    """
    Bulk computes (present, total, attendancePct) for a list of students in ONLY 2 database queries
    instead of 2N queries.
    """
    if not students:
        return {}

    student_map = {}
    all_candidate_ids = set()

    for s in students:
        key = s.get("id") or s.get("rollNumber") or s.get("student_id") or (str(s.get("_id")) if s.get("_id") else None)
        if not key:
            continue
        norm = normalize_id(key)
        all_candidate_ids.add(key)
        all_candidate_ids.add(norm)
        if norm not in student_map:
            student_map[norm] = []
        student_map[norm].append(key)

    base_counts = {}
    for s in students:
        key = s.get("id") or s.get("rollNumber") or s.get("student_id") or (str(s.get("_id")) if s.get("_id") else None)
        if not key:
            continue
        monthly = s.get("attendanceMonthly") or []
        bp = sum(m.get("present", 0) for m in monthly)
        bt = sum(m.get("total", 0) for m in monthly)
        if bt == 0:
            pct = s.get("attendancePct")
            if pct is not None:
                bt = 100
                bp = int(round(bt * pct / 100))
            else:
                bt = 24
                bp = 22
        base_counts[key] = (bp, bt)

    approved_od_slots_by_student = {norm: set() for norm in student_map}
    candidate_id_list = list(all_candidate_ids)

    if db is not None:
        od_query = {
            "studentId": {"$in": candidate_id_list},
            "status": "Approved"
        }
        async for od in db["academic_od_requests"].find(od_query):
            od_student_id = od.get("studentId")
            norm_sid = normalize_id(od_student_id)
            if norm_sid in approved_od_slots_by_student:
                from_date = od.get("fromDate") or od.get("date")
                to_date = od.get("toDate") or od.get("date")
                hours = od.get("hours") or []
                for d in list_date_range(from_date, to_date):
                    for h in hours:
                        approved_od_slots_by_student[norm_sid].add(f"{d}::{h}")
    else:
        from backend.dev_store import DEV_STORE
        for od in DEV_STORE.get("od_requests", []):
            if od.get("status") == "Approved":
                norm_sid = normalize_id(od.get("studentId"))
                if norm_sid in approved_od_slots_by_student:
                    from_date = od.get("fromDate") or od.get("date")
                    to_date = od.get("toDate") or od.get("date")
                    hours = od.get("hours") or []
                    for d in list_date_range(from_date, to_date):
                        for h in hours:
                            approved_od_slots_by_student[norm_sid].add(f"{d}::{h}")

    inc_present_map = {norm: 0 for norm in student_map}
    inc_total_map = {norm: 0 for norm in student_map}

    if db is not None:
        markings_query = {
            "entries.studentId": {"$in": candidate_id_list}
        }
        async for marking in db["academic_attendance_markings"].find(markings_query):
            date = marking.get("date")
            hour = marking.get("hour")
            entries = marking.get("entries") or []
            cell_key = f"{date}::{hour}"
            for entry in entries:
                entry_sid = entry.get("studentId")
                if entry_sid:
                    norm_sid = normalize_id(entry_sid)
                    if norm_sid in student_map:
                        inc_total_map[norm_sid] += 1
                        status = entry.get("status", "Present")
                        student_od_slots = approved_od_slots_by_student.get(norm_sid, set())
                        if status in ("Present", "On Duty") or cell_key in student_od_slots:
                            inc_present_map[norm_sid] += 1
    else:
        from backend.dev_store import DEV_STORE
        for marking in DEV_STORE.get("attendance_markings", {}).values():
            date = marking.get("date")
            hour = marking.get("hour")
            entries = marking.get("entries") or []
            cell_key = f"{date}::{hour}"
            for entry in entries:
                entry_sid = entry.get("studentId")
                if entry_sid:
                    norm_sid = normalize_id(entry_sid)
                    if norm_sid in student_map:
                        inc_total_map[norm_sid] += 1
                        status = entry.get("status", "Present")
                        student_od_slots = approved_od_slots_by_student.get(norm_sid, set())
                        if status in ("Present", "On Duty") or cell_key in student_od_slots:
                            inc_present_map[norm_sid] += 1

    results = {}
    for s in students:
        key = s.get("id") or s.get("rollNumber") or s.get("student_id") or (str(s.get("_id")) if s.get("_id") else None)
        if not key:
            continue
        norm = normalize_id(key)
        bp, bt = base_counts.get(key, (0, 0))
        ip = inc_present_map.get(norm, 0)
        it = inc_total_map.get(norm, 0)
        tot = bt + it
        pres = bp + ip
        pct = int(round((pres / tot) * 100)) if tot > 0 else 0
        results[key] = (pres, tot, pct)

    return results
