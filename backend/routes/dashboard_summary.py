

"""Dashboard Summary API - KPI endpoints for admin and faculty dashboards"""

from datetime import datetime, timezone
from typing import Any
from fastapi import APIRouter, HTTPException
from backend.db import get_db
from backend.utils.mongo import serialize_doc
from backend.routes.academics.exams import is_department_match, is_year_match

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


async def compute_attendance_trends(db, use_db):
    trends = []
    days = ["Mon", "Tue", "Wed", "Thu", "Fri"]
    day_counts = {day: {"present": 0, "total": 0} for day in days}
    
    markings = []
    if use_db:
        try:
            cursor = db["academic_attendance_markings"].find({})
            async for m in cursor:
                markings.append(m)
        except Exception:
            pass
    else:
        from backend.dev_store import DEV_STORE
        markings = list(DEV_STORE.get("attendance_markings", {}).values())

    for m in markings:
        date_str = m.get("date")
        try:
            dt = datetime.strptime(date_str, "%Y-%m-%d")
            day_name = dt.strftime("%a")
            if day_name in day_counts:
                for entry in m.get("entries", []):
                    day_counts[day_name]["total"] += 1
                    if entry.get("status") in ["Present", "On Duty"]:
                        day_counts[day_name]["present"] += 1
        except Exception:
            pass

    for day in days:
        present = day_counts[day]["present"]
        total = day_counts[day]["total"]
        pct = int(round((present / total) * 100)) if total > 0 else 0
        trends.append({"day": day, "attendance": pct})

    # Fallback to dev_store seeded week if all zero in dev mode
    if all(t["attendance"] == 0 for t in trends) and not use_db:
        from backend.dev_store import list_weekly_attendance
        trends = list_weekly_attendance()
        
    return trends


@router.get("/summary")
async def get_dashboard_summary():
    """
    Get comprehensive KPI summary for Admin Dashboard.
    Supports graceful fallbacks.
    """
    try:
        db = get_db()
        use_db = True
    except HTTPException:
        use_db = False

    try:
        total_students = 0
        total_faculty = 0
        fee_collection = {"demanded": 0.0, "collected": 0.0, "percentage": 0.0}
        todays_classes_count = 0
        upcoming_exams_count = 0
        new_admissions_count = 0
        unread_notifications_count = 0

        if use_db:
            # 1. Count Total Students
            try:
                total_students = await db["students"].count_documents({"status": {"$in": ["Approved", "Active"]}})
            except Exception:
                total_students = 0

            # 2. Count Total Faculty
            try:
                total_faculty = await db["faculty"].count_documents({
                    "$or": [
                        {"employment_status": {"$in": ["Approved", "Active"]}},
                        {"status": {"$in": ["Approved", "Active"]}}
                    ]
                })
            except Exception:
                total_faculty = 0

            # 3. Fee Collection Status
            try:
                cursor = db["invoices"].find({})
                demanded = 0.0
                collected = 0.0
                async for invoice in cursor:
                    total_val = float(invoice.get("total", invoice.get("amount", 0.0)))
                    demanded += total_val
                    if invoice.get("payment_status", invoice.get("status", "")).lower() == "paid":
                        collected += total_val
                if demanded > 0:
                    percentage = round((collected / demanded) * 100, 1)
                    fee_collection = {"demanded": demanded, "collected": collected, "percentage": percentage}
            except Exception:
                pass

            # 4. Today's Classes Count
            try:
                today_day = datetime.now(timezone.utc).strftime("%A")
                weekday_map = {"Monday": 0, "Tuesday": 1, "Wednesday": 2, "Thursday": 3, "Friday": 4,
                               "Mon": 0, "Tue": 1, "Wed": 2, "Thu": 3, "Fri": 4}
                day_idx = weekday_map.get(today_day)
                count = 0
                if day_idx is not None:
                    async for timetable in db["academic_timetables"].find({}):
                        slots = timetable.get("slots", [])
                        for slot_row in slots:
                            if slot_row and len(slot_row) > day_idx:
                                slot = slot_row[day_idx]
                                if slot and (slot.get("subject") or slot.get("code")):
                                    count += 1
                todays_classes_count = count
            except Exception:
                pass

            # 5. Upcoming Exams Count
            try:
                upcoming_exams_count = await db["exams"].count_documents({"status": {"$in": ["Scheduled", "Active", "Upcoming"]}})
            except Exception:
                pass

            # 6. New Admissions (Pending status in admissions collection)
            try:
                new_admissions_count = await db["admissions"].count_documents({"status": "Pending"})
            except Exception:
                pass

            # 7. Unread Notifications
            try:
                unread_notifications_count = await db["notifications"].count_documents({"status": "unread"})
            except Exception:
                pass

        else:
            # Using dev store fallbacks
            from backend.dev_store import list_items, list_timetables
            try:
                total_students = len(list_items("students"))
            except KeyError:
                total_students = 0

            try:
                total_faculty = len(list_items("faculty"))
            except KeyError:
                total_faculty = 0

            # Dev store fee collection calculation from invoices
            try:
                invoices = list_items("invoices")
                demanded = sum(float(inv.get("total", 0)) for inv in invoices)
                collected = sum(float(inv.get("total", 0)) for inv in invoices if inv.get("payment_status", "").lower() == "paid")
                pct = round((collected / demanded) * 100, 1) if demanded > 0 else 0.0
                fee_collection = {"demanded": demanded, "collected": collected, "percentage": pct}
            except Exception:
                fee_collection = {"demanded": 1250000.0, "collected": 950000.0, "percentage": 76.0}

            try:
                today_day = datetime.now(timezone.utc).strftime("%A")
                weekday_map = {"Monday": 0, "Tuesday": 1, "Wednesday": 2, "Thursday": 3, "Friday": 4,
                               "Mon": 0, "Tue": 1, "Wed": 2, "Thu": 3, "Fri": 4}
                day_idx = weekday_map.get(today_day)
                count = 0
                if day_idx is not None:
                    for timetable in list_timetables():
                        slots = timetable.get("slots", [])
                        for slot_row in slots:
                            if slot_row and len(slot_row) > day_idx:
                                slot = slot_row[day_idx]
                                if slot and (slot.get("subject") or slot.get("code")):
                                    count += 1
                todays_classes_count = count
            except Exception:
                todays_classes_count = 0

            try:
                upcoming_exams_count = len([e for e in list_items("exams") if e.get("status") in ["Scheduled", "Active", "Upcoming"]])
            except KeyError:
                upcoming_exams_count = 0

            try:
                unread_notifications_count = sum(1 for n in list_items("notifications") if n.get("status") == "unread")
            except KeyError:
                unread_notifications_count = 0

            try:
                new_admissions_count = sum(1 for a in list_items("admissions") if a.get("status") == "Pending")
            except KeyError:
                new_admissions_count = 0

        attendance_trends = await compute_attendance_trends(db if use_db else None, use_db)

        return {
            "success": True,
            "data": {
                "total_students": total_students,
                "total_faculty": total_faculty,
                "fee_collection": fee_collection,
                "todays_classes_count": todays_classes_count,
                "upcoming_exams_count": upcoming_exams_count,
                "new_admissions_count": new_admissions_count,
                "attendance_trends": attendance_trends,
                "unread_notifications_count": unread_notifications_count
            }
        }

    except Exception as e:
        print(f"Error fetching dashboard summary: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch dashboard summary: {str(e)}")


@router.get("/admin/widgets")
async def get_admin_dashboard_widgets():
    try:
        db = get_db()
        use_db = True
    except HTTPException:
        use_db = False

    today_day = datetime.now(timezone.utc).strftime("%A")
    weekday_map = {"Monday": 0, "Tuesday": 1, "Wednesday": 2, "Thursday": 3, "Friday": 4,
                   "Mon": 0, "Tue": 1, "Wed": 2, "Thu": 3, "Fri": 4}
    day_idx = weekday_map.get(today_day)
    
    HOUR_SLOT_TIMINGS = {
        0: "09:00 AM - 09:50 AM",
        1: "09:50 AM - 10:40 AM",
        2: "10:55 AM - 11:45 AM",
        3: "11:45 AM - 12:35 PM",
        4: "01:20 PM - 02:10 PM",
        5: "02:10 PM - 03:00 PM",
        6: "03:10 PM - 04:00 PM",
        7: "04:00 PM - 04:50 PM",
    }
    
    # 1. Today's Classes
    today_classes = []
    if day_idx is not None:
        if use_db:
            try:
                async for tt in db["academic_timetables"].find({}):
                    class_id = tt.get("classId", "N/A")
                    slots = tt.get("slots", [])
                    for hour_idx, slot_row in enumerate(slots):
                        if slot_row and len(slot_row) > day_idx:
                            slot = slot_row[day_idx]
                            if slot and (slot.get("code") or slot.get("subject")):
                                today_classes.append({
                                    "code": slot.get("code") or slot.get("subject") or "N/A",
                                    "name": slot.get("subject") or slot.get("name") or "Class",
                                    "time": slot.get("time") or HOUR_SLOT_TIMINGS.get(hour_idx, "N/A"),
                                    "room": slot.get("room") or "N/A",
                                    "faculty": slot.get("instructor") or slot.get("faculty") or "N/A",
                                    "classId": class_id
                                })
            except Exception:
                pass
        else:
            from backend.dev_store import list_timetables
            for tt in list_timetables():
                class_id = tt.get("classId", "N/A")
                slots = tt.get("slots", [])
                for hour_idx, slot_row in enumerate(slots):
                    if slot_row and len(slot_row) > day_idx:
                        slot = slot_row[day_idx]
                        if slot and (slot.get("code") or slot.get("subject")):
                            today_classes.append({
                                "code": slot.get("code") or slot.get("subject") or "N/A",
                                "name": slot.get("subject") or slot.get("name") or "Class",
                                "time": slot.get("time") or HOUR_SLOT_TIMINGS.get(hour_idx, "N/A"),
                                "room": slot.get("room") or "N/A",
                                "faculty": slot.get("instructor") or slot.get("faculty") or "N/A",
                                "classId": class_id
                            })

    # 2. Upcoming Exams
    upcoming_exams = []
    if use_db:
        try:
            async for exam in db["exams"].find({"status": {"$in": ["Scheduled", "Active", "Upcoming"]}}).sort("date", 1).limit(5):
                upcoming_exams.append(serialize_doc(exam))
        except Exception:
            pass
    else:
        from backend.dev_store import list_items
        try:
            exams = list_items("exams")
            upcoming_exams = [e for e in exams if e.get("status") in ["Scheduled", "Active", "Upcoming"]][:5]
        except KeyError:
            upcoming_exams = []

    # 3. Recent Notifications
    recent_notifications = []
    if use_db:
        try:
            async for notif in db["notifications"].find({"$or": [{"receiverRole": "admin"}, {"receiverRole": "ALL"}]}).sort("createdAt", -1).limit(5):
                recent_notifications.append(serialize_doc(notif))
        except Exception:
            pass
    else:
        from backend.dev_store import list_notifications
        try:
            notifs, _ = list_notifications("admin", limit=5)
            recent_notifications = notifs
        except Exception:
            recent_notifications = []

    return {
        "success": True,
        "data": {
            "today_classes": today_classes,
            "upcoming_exams": upcoming_exams,
            "recent_notifications": recent_notifications
        }
    }


@router.get("/student/{student_id}/widgets")
async def get_student_dashboard_widgets(student_id: str):
    try:
        db = get_db()
        use_db = True
    except HTTPException:
        use_db = False

    today_day = datetime.now(timezone.utc).strftime("%A")
    weekday_map = {"Monday": 0, "Tuesday": 1, "Wednesday": 2, "Thursday": 3, "Friday": 4,
                   "Mon": 0, "Tue": 1, "Wed": 2, "Thu": 3, "Fri": 4}
    day_idx = weekday_map.get(today_day)
    
    HOUR_SLOT_TIMINGS = {
        0: "09:00 AM - 09:50 AM",
        1: "09:50 AM - 10:40 AM",
        2: "10:55 AM - 11:45 AM",
        3: "11:45 AM - 12:35 PM",
        4: "01:20 PM - 02:10 PM",
        5: "02:10 PM - 03:00 PM",
        6: "03:10 PM - 04:00 PM",
        7: "04:00 PM - 04:50 PM",
    }
    
    # 1. Fetch Student Details
    student = None
    if use_db:
        try:
            student = await db["students"].find_one({"$or": [{"id": student_id}, {"rollNumber": student_id}]})
        except Exception:
            pass
    else:
        from backend.dev_store import list_items
        from backend.routes.students import _seed_dev_students
        _seed_dev_students()
        try:
            students = list_items("students")
            student = next((s for s in students if s.get("id") == student_id or s.get("rollNumber") == student_id), None)
        except KeyError:
            student = None

    enrolled_courses = []
    section = "A"
    if student:
        enrolled_courses = student.get("subjects", [])
        section = student.get("section", "A")

    # 2. Filter Today's Classes for Student
    today_classes = []
    all_timetables = []
    if use_db:
        try:
            async for tt in db["academic_timetables"].find({}):
                all_timetables.append(tt)
        except Exception:
            pass
    else:
        from backend.dev_store import list_timetables
        try:
            all_timetables = list_timetables()
        except Exception:
            all_timetables = []

    norm_code = lambda c: str(c or '').replace('-', '').replace(' ', '').upper()
    enrolled_codes = {norm_code(c.get("code")) for c in enrolled_courses if c.get("code")}
    if day_idx is not None:
        for tt in all_timetables:
            class_id = tt.get("classId", "N/A")
            is_student_class = section.lower() in class_id.lower() or student_id.lower() in class_id.lower()
            slots = tt.get("slots", [])
            for hour_idx, slot_row in enumerate(slots):
                if slot_row and len(slot_row) > day_idx:
                    slot = slot_row[day_idx]
                    if slot and (slot.get("code") or slot.get("subject")):
                        sub_code = slot.get("code") or slot.get("subject")
                        if is_student_class or (sub_code and sub_code in enrolled_codes):
                            today_classes.append({
                                "code": sub_code or "N/A",
                                "name": slot.get("subject") or slot.get("name") or "Class",
                                "time": slot.get("time") or HOUR_SLOT_TIMINGS.get(hour_idx, "N/A"),
                                "room": slot.get("room") or "N/A",
                                "faculty": slot.get("instructor") or slot.get("faculty") or "N/A",
                                "classId": class_id
                            })

    # 3. Upcoming Assessments
    upcoming_tasks = []
    if use_db:
        try:
            async for exam in db["exams"].find({"status": {"$in": ["Scheduled", "Active", "Upcoming"]}}).sort("date", 1):
                exam_code = exam.get("code")
                is_class_match = (
                    is_department_match(student.get("department", ""), exam.get("department", "")) and
                    str(student.get("semester", "")) == str(exam.get("semester", "")) and
                    is_year_match(student.get("year", ""), exam.get("year", ""))
                )
                if not enrolled_codes or norm_code(exam_code) in enrolled_codes or is_class_match:
                    upcoming_tasks.append({
                        "title": exam.get("name", "Exam"),
                        "course": exam_code or "N/A",
                        "date": exam.get("date", "—"),
                        "status": exam.get("status", "Upcoming")
                    })
        except Exception:
            pass
    else:
        from backend.dev_store import list_items
        try:
            exams = list_items("exams")
            for exam in exams:
                if exam.get("status") in ["Scheduled", "Active", "Upcoming"]:
                    exam_code = exam.get("code")
                    is_class_match = (
                        is_department_match(student.get("department", ""), exam.get("department", "")) and
                        str(student.get("semester", "")) == str(exam.get("semester", "")) and
                        is_year_match(student.get("year", ""), exam.get("year", ""))
                    )
                    if not enrolled_codes or norm_code(exam_code) in enrolled_codes or is_class_match:
                        upcoming_tasks.append({
                            "title": exam.get("name", "Exam"),
                            "course": exam_code or "N/A",
                            "date": exam.get("date", "—"),
                            "status": exam.get("status", "Upcoming")
                        })
        except KeyError:
            pass

    return {
        "success": True,
        "data": {
            "enrolled_courses": enrolled_courses,
            "today_classes": today_classes,
            "upcoming_tasks": upcoming_tasks
        }
    }


@router.get("/finance/widgets")
async def get_finance_dashboard_widgets():
    try:
        db = get_db()
        use_db = True
    except HTTPException:
        use_db = False

    collection_trends = []
    monthly_totals = {
        "Jan": 0.0, "Feb": 0.0, "Mar": 0.0, "Apr": 0.0, "May": 0.0,
        "Jun": 0.0, "Jul": 0.0, "Aug": 0.0, "Sep": 0.0, "Oct": 0.0,
        "Nov": 0.0, "Dec": 0.0
    }
    
    invoices = []
    if use_db:
        try:
            async for inv in db["invoices"].find({}):
                invoices.append(inv)
        except Exception:
            pass
    else:
        from backend.dev_store import list_items
        try:
            invoices = list_items("invoices")
        except KeyError:
            invoices = []

    active_months = set()
    for inv in invoices:
        status = inv.get("payment_status", inv.get("status", ""))
        if status.lower() == "paid":
            date_str = inv.get("generated_date", inv.get("date", ""))
            try:
                dt = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
                month_name = dt.strftime("%b")
                amount = float(inv.get("total", inv.get("amount", 0.0)))
                monthly_totals[month_name] += amount
                active_months.add(month_name)
            except Exception:
                pass

    month_order = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    for m in month_order:
        total_m = monthly_totals[m]
        if total_m > 0 or m in ["Jan", "Feb", "Mar", "Apr", "May"]:
            amount_str = f"₹{total_m/100000:.1f}L" if total_m >= 100000 else f"₹{total_m:,.0f}"
            collection_trends.append({
                "month": m,
                "amount": amount_str,
                "percent": min(100, int((total_m / 1000000.0) * 100)) if total_m > 0 else 0
            })

    collection_trends = collection_trends[-5:]

    # 2. Recent Invoices
    recent_invoices = []
    sorted_invs = sorted(invoices, key=lambda x: x.get("generated_date", x.get("date", "")), reverse=True)[:5]
    for inv in sorted_invs:
        recent_invoices.append({
            "id": inv.get("invoice_id", "INV-N/A"),
            "student": inv.get("student_name", inv.get("studentId", "Unknown")),
            "amount": f"₹{float(inv.get('total', 0)):,.0f}",
            "type": inv.get("generated_from", "Fee Invoice"),
            "status": inv.get("payment_status", inv.get("status", "Pending"))
        })

    # 3. Payroll summary list from payroll collection
    payroll_summary = []
    payroll_records = []
    if use_db:
        try:
            async for p in db["payroll"].find({}):
                payroll_records.append(p)
        except Exception:
            pass
    else:
        from backend.dev_store import list_items
        try:
            payroll_records = list_items("payroll")
        except KeyError:
            payroll_records = []

    pay_groups = {}
    for p in payroll_records:
        cat = p.get("category", p.get("staffType", "Staff"))
        status = p.get("status", "Pending")
        if cat not in pay_groups:
            pay_groups[cat] = {"total": 0, "processed": 0}
        pay_groups[cat]["total"] += 1
        if status.lower() == "paid":
            pay_groups[cat]["processed"] += 1

    for cat, counts in pay_groups.items():
        payroll_summary.append({
            "category": cat,
            "processed": f"{counts['processed']}/{counts['total']}",
            "status": "Complete" if counts["processed"] == counts["total"] else "Processing"
        })

    if not payroll_summary:
        payroll_summary = [
            {"category": "Teaching Staff", "processed": "0/0", "status": "Pending"},
            {"category": "Non-Teaching", "processed": "0/0", "status": "Pending"}
        ]

    # 4. Recent Notifications
    recent_notifications = []
    if use_db:
        try:
            async for notif in db["notifications"].find({"$or": [{"receiverRole": "finance"}, {"receiverRole": "ALL"}]}).sort("createdAt", -1).limit(5):
                recent_notifications.append(serialize_doc(notif))
        except Exception:
            pass
    else:
        from backend.dev_store import list_notifications
        try:
            notifs, _ = list_notifications("finance", limit=5)
            recent_notifications = notifs
        except Exception:
            recent_notifications = []

    return {
        "success": True,
        "data": {
            "collection_trends": collection_trends,
            "recent_invoices": recent_invoices,
            "payroll_summary": payroll_summary,
            "recent_notifications": recent_notifications
        }
    }
