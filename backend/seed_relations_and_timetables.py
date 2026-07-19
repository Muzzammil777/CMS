import asyncio
import os
import random
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

# Load environment variables
load_dotenv(dotenv_path=Path(__file__).resolve().parent / ".env")
load_dotenv(dotenv_path=Path(__file__).resolve().parent.parent / ".env")

MONGODB_URI = os.getenv("MONGODB_URI")
if not MONGODB_URI:
    raise RuntimeError("MONGODB_URI is not set. Please set it in your .env file.")

# Dept Mapping dictionary to standardize
DEPT_MAPPING = {
    "Computer Science": "CSE",
    "Electronics": "Medical Laboratory Technology",
    "Mechanical": "Operation Theatre and Anesthesia Technology",
    "Civil": "Radiography and Imaging Technology",
    # Faculty original depts
    "Electronics & Communication": "Medical Laboratory Technology",
    "Mechanical Engineering": "Operation Theatre and Anesthesia Technology",
    "Civil Engineering": "Radiography and Imaging Technology",
    "Biotechnology": "Medical Laboratory Technology"
}

COURSES_BY_DEPT = {
    "CSE": [
        {"code": "CS-301", "name": "Data Structures & Algorithms", "credits": 4},
        {"code": "CS-306", "name": "Database Management Systems", "credits": 4},
        {"code": "CS-401", "name": "Computer Networks", "credits": 4},
        {"code": "CS-202", "name": "Operating Systems", "credits": 3}
    ],
    "Medical Laboratory Technology": [
        {"code": "MLT-101", "name": "Human Anatomy & Physiology I", "credits": 4},
        {"code": "MLT-102", "name": "Biochemistry & Clinical Pathology", "credits": 4},
        {"code": "MLT-203", "name": "Hematology & Blood Banking", "credits": 3}
    ],
    "Operation Theatre and Anesthesia Technology": [
        {"code": "OTT-101", "name": "Anesthesia Techniques & Equipment", "credits": 4},
        {"code": "OTT-102", "name": "Sterilization & Disinfection Procedures", "credits": 3},
        {"code": "OTT-204", "name": "Surgical Procedures & Care", "credits": 4}
    ],
    "Radiography and Imaging Technology": [
        {"code": "RIT-101", "name": "Radiographic Physics & Darkroom Techniques", "credits": 4},
        {"code": "RIT-102", "name": "Advanced Medical Imaging Equipment", "credits": 4}
    ]
}

PERIOD_SLOTS = [
    "08:00-09:00",
    "09:00-10:00",
    "10:00-11:00",
    "11:15-12:15",
    "12:15-13:15",
    "14:00-15:00",
    "15:00-16:00"
]

BREAK_ITEMS = [
    {"id": "break-1", "label": "Break 11:00-11:15", "afterPeriod": 3, "tone": "slate"},
    {"id": "break-2", "label": "Lunch 13:15-14:00", "afterPeriod": 5, "tone": "amber"}
]

THEMES = ["blue", "purple", "emerald", "rose", "cyan", "indigo"]

async def seed():
    print("Connecting to MongoDB database...")
    client = AsyncIOMotorClient(MONGODB_URI, serverSelectionTimeoutMS=30000)
    
    if "mongodb.net" in str(MONGODB_URI):
        db = client["College_db"]
    else:
        db = client.get_database()
        
    if db.name == "test" and "mongodb.net" not in str(MONGODB_URI):
        db = client["College_db"]
        
    print(f"Connected successfully to database: {db.name}")

    # 1. Standardize Student Departments
    print("\nStandardizing student departments to match registered system departments...")
    students_collection = db["students"]
    updated_students_count = 0
    
    async for s in students_collection.find():
        dept = s.get("department")
        new_dept = DEPT_MAPPING.get(dept, dept)
        
        # Make sure student department is updated
        update_doc = {}
        if dept != new_dept:
            update_doc["department"] = new_dept
            
        # Ensure student_id / rollNumber are synced
        if not s.get("student_id"):
            update_doc["student_id"] = s.get("id") or s.get("rollNumber")
        if not s.get("rollNumber"):
            update_doc["rollNumber"] = s.get("student_id") or s.get("id")
        if not s.get("id"):
            update_doc["id"] = s.get("student_id") or s.get("rollNumber")
            
        if update_doc:
            await students_collection.update_one({"_id": s["_id"]}, {"$set": update_doc})
            updated_students_count += 1
            
    print(f"Updated/Standardized {updated_students_count} student documents.")

    # 2. Standardize Faculty Departments
    print("\nStandardizing faculty departments...")
    faculty_collection = db["faculty"]
    updated_faculty_count = 0
    
    async for f in faculty_collection.find():
        dept_id = f.get("departmentId") or f.get("department")
        new_dept = DEPT_MAPPING.get(dept_id, dept_id)
        
        # Fallback mapping if not in registered
        if new_dept not in COURSES_BY_DEPT:
            new_dept = "CSE"
            
        update_doc = {}
        if f.get("departmentId") != new_dept:
            update_doc["departmentId"] = new_dept
        if f.get("department_id") != ("CS" if new_dept == "CSE" else "MLT" if new_dept == "Medical Laboratory Technology" else "OTT" if new_dept == "Operation Theatre and Anesthesia Technology" else "RIT"):
            update_doc["department_id"] = "CS" if new_dept == "CSE" else "MLT" if new_dept == "Medical Laboratory Technology" else "OTT" if new_dept == "Operation Theatre and Anesthesia Technology" else "RIT"
        
        # Ensure password & role are set for login compatibility
        if not f.get("password"):
            update_doc["password"] = "faculty123"
        if not f.get("role"):
            update_doc["role"] = "faculty"
        if not f.get("id"):
            update_doc["id"] = f.get("employeeId")
            
        if update_doc:
            await faculty_collection.update_one({"_id": f["_id"]}, {"$set": update_doc})
            updated_faculty_count += 1
            
    print(f"Updated/Standardized {updated_faculty_count} faculty documents.")

    # Fetch all standardized students and faculty for mapping
    students = await students_collection.find({"status": "Active"}).to_list(None)
    faculty_list = await faculty_collection.find().to_list(None)

    # 3. Seed Faculty Courses
    print("\nSeeding faculty_courses assignments...")
    faculty_courses_col = db["faculty_courses"]
    await faculty_courses_col.delete_many({}) # Clear old course maps
    
    faculty_by_dept = {}
    for f in faculty_list:
        dept = f.get("departmentId")
        if dept not in faculty_by_dept:
            faculty_by_dept[dept] = []
        faculty_by_dept[dept].append(f)
        
    course_assignments = []
    for dept, courses in COURSES_BY_DEPT.items():
        dept_faculties = faculty_by_dept.get(dept, [])
        if not dept_faculties:
            # Fallback if no faculty in this dept, assign to anyone
            dept_faculties = faculty_list
            
        for course in courses:
            # Pick a faculty member from the department
            assigned_fac = random.choice(dept_faculties)
            course_assignments.append({
                "facultyId": assigned_fac.get("employeeId") or assigned_fac.get("id"),
                "courseId": course["code"],
                "course_name": course["name"],
                "semester": "1" if "101" in course["code"] or "102" in course["code"] else "2",
                "academic_year": "2025-2026",
                "credits": course["credits"],
                "assigned_date": datetime.now()
            })
            
    if course_assignments:
        await faculty_courses_col.insert_many(course_assignments)
        print(f"SUCCESS: Assigned {len(course_assignments)} courses to faculty members.")

    # Update Teaching Load list on faculty documents
    for f in faculty_list:
        fac_id = f.get("employeeId") or f.get("id")
        fac_courses = [c for c in course_assignments if c["facultyId"] == fac_id]
        teaching_load = [
            {"courseCode": c["courseId"], "courseName": c["course_name"], "credits": c["credits"]}
            for c in fac_courses
        ]
        await faculty_collection.update_one({"_id": f["_id"]}, {"$set": {"teaching_load": teaching_load}})

    # 4. Seed Faculty Mentorship (Assign Students to Mentors)
    print("\nAssigning students to faculty mentors...")
    mentorship_col = db["faculty_mentorship"]
    await mentorship_col.delete_many({}) # Clear old mentorship documents
    
    mentorships = []
    for s in students:
        s_id = s.get("rollNumber") or s.get("id")
        dept = s.get("department")
        dept_faculties = faculty_by_dept.get(dept, [])
        
        if not dept_faculties:
            dept_faculties = faculty_list
            
        if dept_faculties:
            assigned_mentor = random.choice(dept_faculties)
            mentor_id = assigned_mentor.get("employeeId") or assigned_mentor.get("id")
            
            mentorships.append({
                "mentorId": mentor_id,
                "menteeId": s_id,
                "start_date": datetime.now().date().isoformat(),
                "goals": f"Academic guidance, career growth, and success plan in {dept}",
                "status": "Active",
                "created_date": datetime.now()
            })
            
    if mentorships:
        await mentorship_col.insert_many(mentorships)
        print(f"SUCCESS: Set up mentorship mappings for {len(mentorships)} students.")

    # 5. Seed Academic Timetables (Classes/Schedules)
    print("\nGenerating weekly timetables for all classes...")
    timetable_col = db["academic_timetables"]
    await timetable_col.delete_many({}) # Clear old timetables
    
    # Let's map unique combinations of (department, semester, section) from students
    classes = set()
    for s in students:
        dept = s.get("department")
        sem = str(s.get("semester") or 1)
        sec = s.get("section") or "A"
        classes.add((dept, sem, sec))
        
    # Also add standard fallback/empty classes to ensure full dashboard coverage
    for dept in COURSES_BY_DEPT.keys():
        classes.add((dept, "1", "A"))
        classes.add((dept, "6", "A"))
        
    timetables_seeded = 0
    for dept, sem, sec in sorted(classes):
        # Build normalized classId
        normalized_dept_slug = dept.lower().replace(" ", "-").replace("&", "and")
        class_id = f"{normalized_dept_slug}-{sem}-{sec.lower()}"
        class_label = f"{dept} - Sem {sem} - Sec {sec}"
        
        # Get courses for this department
        dept_courses = COURSES_BY_DEPT.get(dept, COURSES_BY_DEPT["CSE"])
        
        # Find faculty in this department
        dept_faculties = faculty_by_dept.get(dept, faculty_list)
        
        # 5 days (Mon-Fri) x 7 periods
        slots = []
        for day in range(5):
            day_slots = []
            for period in range(7):
                # Put a random course, room and instructor, or sometimes None (free slot)
                if random.random() > 0.15:
                    course = random.choice(dept_courses)
                    instructor = random.choice(dept_faculties)
                    
                    day_slots.append({
                        "code": course["code"],
                        "name": course["name"],
                        "room": f"Room {100 + int(sem)*10 + random.randint(1,9)}",
                        "instructor": instructor["name"],
                        "credits": course["credits"],
                        "type": "Lecture" if period != 6 else "Lab / Practical",
                        "theme": random.choice(THEMES),
                        "color": "",
                        "textColor": "",
                        "label": ""
                    })
                else:
                    day_slots.append(None)
            slots.append(day_slots)
            
        timetable_doc = {
            "classId": class_id,
            "label": class_label,
            "dept": dept,
            "semester": sem,
            "section": sec,
            "slots": slots,
            "periodSlots": PERIOD_SLOTS,
            "breakItems": BREAK_ITEMS
        }
        
        await timetable_col.update_one({"classId": class_id}, {"$set": timetable_doc}, upsert=True)
        timetables_seeded += 1
        
    print(f"SUCCESS: Seeded {timetables_seeded} weekly class timetables.")

    # 6. Seed Student Fees Structure
    print("\nEnsuring all students have fee structures...")
    fees_col = db["fees_structure"]
    
    fees_added_count = 0
    for s in students:
        s_id = s.get("rollNumber") or s.get("id")
        name = s.get("name")
        dept = s.get("department")
        sem = s.get("semester") or 1
        
        existing_fee = await fees_col.find_one({"student_id": s_id})
        if not existing_fee:
            total_fee = random.choice([75000, 85000, 95000])
            status = s.get("feeStatus") or "Paid"
            paid = total_fee if status == "Paid" else (total_fee // 2 if status == "Partial" else 0)
            due = total_fee - paid
            
            fee_doc = {
                "student_id": s_id,
                "student_name": name,
                "course": dept,
                "semester": f"Semester {sem}",
                "first_graduate": random.choice([True, False]),
                "hostel_required": random.choice([True, False]),
                "fee_breakdown": {
                    "semester_fee": total_fee - 10000,
                    "book_fee": 4000,
                    "exam_fee": 1000,
                    "hostel_fee": 15000 if status == "Paid" and random.random() > 0.5 else 0,
                    "misc_fee": 5000,
                    "total": total_fee
                },
                "total_fee": total_fee,
                "assigned_date": datetime.now(),
                "payment_status": status,
                "paid_date": datetime.now() if status == "Paid" else None,
                "payment_method": random.choice(["Net Banking", "UPI", "Card"]) if status != "Pending" else "",
                "transaction_id": f"TXN-{dept[:3].upper()}-2026-{random.randint(100,999)}" if status != "Pending" else ""
            }
            
            await fees_col.insert_one(fee_doc)
            fees_added_count += 1
            
    print(f"SUCCESS: Assigned fee structures to {fees_added_count} students.")
    
    client.close()
    print("\nDatabase relations, course assignments, timetables, and mentorship linkages seeded successfully!")

if __name__ == "__main__":
    asyncio.run(seed())
