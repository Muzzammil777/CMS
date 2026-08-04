from fastapi import APIRouter, HTTPException, Query, Body, Path
from typing import List, Optional, Dict, Any
from bson import ObjectId
from datetime import datetime
from pydantic import BaseModel
from copy import deepcopy

from backend.db import get_db
from backend.utils.mongo import serialize_doc
from backend.models.faculty import Faculty
from backend.models.faculty_activity import (
    CourseAssignment,
    PerformanceMetric,
    ProfessionalDevelopment,
    FacultyMentorship,
    ResearchProject,
)
from backend.models.faculty_leave import FacultyLeave
from backend.models.faculty_feedback import PeerReview
from backend.models.faculty_notification import Notification
from backend.dev_store import DEV_STORE

router = APIRouter(prefix="/api/faculty", tags=["faculty"])


# Helper functions
async def get_faculty_collection():
    db = get_db()
    return db["faculty"]


async def get_faculty_activity_collection(collection_name: str):
    db = get_db()
    return db[collection_name]


# -----------------
# Seed Data Route
# -----------------


@router.post("/seed/data")
async def seed_faculty_data():
    """Seed the database with sample faculty data with detailed metrics"""
    collection = await get_faculty_collection()

    # Sample faculty data with detailed information matching analytics
    faculty_data = [
        # Computer Science Department
        {
            "name": "Dr. Ramesh Kumar",
            "employeeId": "FAC001",
            "email": "ramesh.kumar@mit.edu",
            "phone": "+91-9876543210",
            "designation": "Professor",
            "subject": "Database Systems",
            "department_id": "CS",
            "departmentId": "Computer Science",
            "qualification": "Ph.D. in Computer Science",
            "employment_status": "Active",
            "joining_date": datetime(2012, 8, 15),
            "experience_years": 12,
            "attendance_rate": 91,
            "pass_rate": 93,
            "specialization": "Database Management",
            "status": "Top",
            "cgpa": 8.4,
            "office_location": "Building A, Room 301",
        },
        {
            "name": "Prof. Lakshmi Nair",
            "employeeId": "FAC002",
            "email": "lakshmi.nair@mit.edu",
            "phone": "+91-9876543211",
            "designation": "Associate Professor",
            "subject": "Data Structures",
            "department_id": "CS",
            "departmentId": "Computer Science",
            "qualification": "Ph.D. in Software Engineering",
            "employment_status": "Active",
            "joining_date": datetime(2016, 7, 1),
            "experience_years": 8,
            "attendance_rate": 88,
            "pass_rate": 90,
            "specialization": "Algorithms",
            "status": "Top",
            "cgpa": 8.3,
            "office_location": "Building A, Room 302",
        },
        {
            "name": "Dr. Anil Verma",
            "employeeId": "FAC003",
            "email": "anil.verma@mit.edu",
            "phone": "+91-9876543212",
            "designation": "Assistant Professor",
            "subject": "OS & Networks",
            "department_id": "CS",
            "departmentId": "Computer Science",
            "qualification": "Ph.D. in Computer Networks",
            "employment_status": "Active",
            "joining_date": datetime(2020, 1, 15),
            "experience_years": 5,
            "attendance_rate": 85,
            "pass_rate": 87,
            "specialization": "Networking",
            "status": "Good",
            "cgpa": 8.1,
            "office_location": "Building A, Room 303",
        },
        # Electronics Department
        {
            "name": "Dr. Sunita Sharma",
            "employeeId": "FAC004",
            "email": "sunita.sharma@mit.edu",
            "phone": "+91-9876543213",
            "designation": "Professor",
            "subject": "Quantum Mechanics",
            "department_id": "ECE",
            "departmentId": "Electronics & Communication",
            "qualification": "Ph.D. in Electronics",
            "employment_status": "Active",
            "joining_date": datetime(2011, 6, 1),
            "experience_years": 14,
            "attendance_rate": 89,
            "pass_rate": 86,
            "specialization": "Quantum Engineering",
            "status": "Good",
            "cgpa": 8.2,
            "office_location": "Building B, Room 201",
        },
        {
            "name": "Prof. Vikram Iyer",
            "employeeId": "FAC005",
            "email": "vikram.iyer@mit.edu",
            "phone": "+91-9876543214",
            "designation": "Associate Professor",
            "subject": "Thermodynamics",
            "department_id": "ECE",
            "departmentId": "Electronics & Communication",
            "qualification": "Ph.D. in Signal Processing",
            "employment_status": "Active",
            "joining_date": datetime(2017, 9, 1),
            "experience_years": 9,
            "attendance_rate": 84,
            "pass_rate": 82,
            "specialization": "Signal Processing",
            "status": "Good",
            "cgpa": 8.0,
            "office_location": "Building B, Room 202",
        },
        {
            "name": "Dr. Meena Pillai",
            "employeeId": "FAC006",
            "email": "meena.pillai@mit.edu",
            "phone": "+91-9876543215",
            "designation": "Assistant Professor",
            "subject": "Electromagnetism",
            "department_id": "ECE",
            "departmentId": "Electronics & Communication",
            "qualification": "Ph.D. in Electronics",
            "employment_status": "Active",
            "joining_date": datetime(2019, 1, 15),
            "experience_years": 4,
            "attendance_rate": 80,
            "pass_rate": 79,
            "specialization": "EMC Design",
            "status": "Watch",
            "cgpa": 7.8,
            "office_location": "Building B, Room 203",
        },
        # Physics Department
        {
            "name": "Prof. Suresh Babu",
            "employeeId": "FAC007",
            "email": "suresh.babu@mit.edu",
            "phone": "+91-9876543216",
            "designation": "Professor",
            "subject": "VLSI Design",
            "department_id": "ECE",
            "departmentId": "Electronics & Communication",
            "qualification": "Ph.D. in VLSI",
            "employment_status": "Active",
            "joining_date": datetime(2010, 5, 1),
            "experience_years": 13,
            "attendance_rate": 92,
            "pass_rate": 92,
            "specialization": "Chip Design",
            "status": "Top",
            "cgpa": 8.5,
            "office_location": "Building B, Room 210",
        },
        {
            "name": "Prof. Rekha Joshi",
            "employeeId": "FAC008",
            "email": "rekha.joshi@mit.edu",
            "phone": "+91-9876543217",
            "designation": "Associate Professor",
            "subject": "Signal Processing",
            "department_id": "ECE",
            "departmentId": "Electronics & Communication",
            "qualification": "Ph.D. in DSP",
            "employment_status": "Active",
            "joining_date": datetime(2015, 9, 1),
            "experience_years": 9,
            "attendance_rate": 89,
            "pass_rate": 89,
            "specialization": "Digital Filters",
            "status": "Top",
            "cgpa": 8.3,
            "office_location": "Building B, Room 211",
        },
        # Mathematics Department
        {
            "name": "Dr. Deepak Gupta",
            "employeeId": "FAC009",
            "email": "deepak.gupta@mit.edu",
            "phone": "+91-9876543218",
            "designation": "Professor",
            "subject": "Linear Algebra",
            "department_id": "MATH",
            "departmentId": "Mathematics",
            "qualification": "Ph.D. in Mathematics",
            "employment_status": "Active",
            "joining_date": datetime(2013, 8, 1),
            "experience_years": 11,
            "attendance_rate": 87,
            "pass_rate": 88,
            "specialization": "Matrix Theory",
            "status": "Good",
            "cgpa": 8.1,
            "office_location": "Building C, Room 301",
        },
        {
            "name": "Prof. Anjali Mehta",
            "employeeId": "FAC010",
            "email": "anjali.mehta@mit.edu",
            "phone": "+91-9876543219",
            "designation": "Associate Professor",
            "subject": "Calculus",
            "department_id": "MATH",
            "departmentId": "Mathematics",
            "qualification": "Ph.D. in Pure Mathematics",
            "employment_status": "Active",
            "joining_date": datetime(2017, 7, 1),
            "experience_years": 7,
            "attendance_rate": 85,
            "pass_rate": 85,
            "specialization": "Analysis",
            "status": "Good",
            "cgpa": 8.0,
            "office_location": "Building C, Room 302",
        },
        {
            "name": "Ms. Divya Krishnan",
            "employeeId": "FAC011",
            "email": "divya.krishnan@mit.edu",
            "phone": "+91-9876543220",
            "designation": "Assistant Professor",
            "subject": "Statistics",
            "department_id": "MATH",
            "departmentId": "Mathematics",
            "qualification": "M.Phil in Statistics",
            "employment_status": "Active",
            "joining_date": datetime(2021, 1, 15),
            "experience_years": 3,
            "attendance_rate": 81,
            "pass_rate": 81,
            "specialization": "Probability",
            "status": "Watch",
            "cgpa": 7.9,
            "office_location": "Building C, Room 303",
        },
        # Mechanical Engineering Department
        {
            "name": "Dr. Venkat Reddy",
            "employeeId": "FAC012",
            "email": "venkat.reddy@mit.edu",
            "phone": "+91-9876543221",
            "designation": "Professor",
            "subject": "Thermofluids",
            "department_id": "ME",
            "departmentId": "Mechanical Engineering",
            "qualification": "Ph.D. in Thermal Engineering",
            "employment_status": "Active",
            "joining_date": datetime(2010, 8, 1),
            "experience_years": 10,
            "attendance_rate": 88,
            "pass_rate": 88,
            "specialization": "Heat Transfer",
            "status": "Top",
            "cgpa": 8.3,
            "office_location": "Building D, Room 301",
        },
        {
            "name": "Prof. Smitha Das",
            "employeeId": "FAC013",
            "email": "smitha.das@mit.edu",
            "phone": "+91-9876543222",
            "designation": "Associate Professor",
            "subject": "Machine Design",
            "department_id": "ME",
            "departmentId": "Mechanical Engineering",
            "qualification": "Ph.D. in Mechanical Design",
            "employment_status": "Active",
            "joining_date": datetime(2016, 9, 1),
            "experience_years": 8,
            "attendance_rate": 84,
            "pass_rate": 85,
            "specialization": "CAD/CAM",
            "status": "Good",
            "cgpa": 8.1,
            "office_location": "Building D, Room 302",
        },
        {
            "name": "Dr. Rahul Nair",
            "employeeId": "FAC014",
            "email": "rahul.nair@mit.edu",
            "phone": "+91-9876543223",
            "designation": "Assistant Professor",
            "subject": "Manufacturing",
            "department_id": "ME",
            "departmentId": "Mechanical Engineering",
            "qualification": "Ph.D. in Manufacturing",
            "employment_status": "Active",
            "joining_date": datetime(2020, 1, 15),
            "experience_years": 4,
            "attendance_rate": 81,
            "pass_rate": 82,
            "specialization": "Additive Manufacturing",
            "status": "Watch",
            "cgpa": 7.9,
            "office_location": "Building D, Room 303",
        },
        # Additional Computer Science Faculty
        {
            "name": "Prof. Rajesh Gupta",
            "employeeId": "FAC015",
            "email": "rajesh.gupta@mit.edu",
            "phone": "+91-9876543224",
            "designation": "Professor",
            "subject": "Artificial Intelligence",
            "department_id": "CS",
            "departmentId": "Computer Science",
            "qualification": "Ph.D. in AI/ML",
            "employment_status": "Active",
            "joining_date": datetime(2008, 3, 15),
            "experience_years": 16,
            "attendance_rate": 93,
            "pass_rate": 94,
            "specialization": "Deep Learning",
            "status": "Top",
            "cgpa": 8.6,
            "office_location": "Building A, Room 401",
        },
        {
            "name": "Dr. Priya Sharma",
            "employeeId": "FAC016",
            "email": "priya.sharma@mit.edu",
            "phone": "+91-9876543225",
            "designation": "Associate Professor",
            "subject": "Web Development",
            "department_id": "CS",
            "departmentId": "Computer Science",
            "qualification": "Ph.D. in Computer Science",
            "employment_status": "Active",
            "joining_date": datetime(2015, 6, 1),
            "experience_years": 9,
            "attendance_rate": 89,
            "pass_rate": 91,
            "specialization": "Full Stack Development",
            "status": "Top",
            "cgpa": 8.4,
            "office_location": "Building A, Room 305",
        },
        {
            "name": "Mr. Arjun Singh",
            "employeeId": "FAC017",
            "email": "arjun.singh@mit.edu",
            "phone": "+91-9876543226",
            "designation": "Assistant Professor",
            "subject": "Cybersecurity",
            "department_id": "CS",
            "departmentId": "Computer Science",
            "qualification": "M.Tech in Cybersecurity",
            "employment_status": "Active",
            "joining_date": datetime(2021, 8, 15),
            "experience_years": 2,
            "attendance_rate": 86,
            "pass_rate": 84,
            "specialization": "Network Security",
            "status": "Good",
            "cgpa": 8.2,
            "office_location": "Building A, Room 306",
        },
        # Additional ECE Faculty
        {
            "name": "Prof. Harsha Kapoor",
            "employeeId": "FAC018",
            "email": "harsha.kapoor@mit.edu",
            "phone": "+91-9876543227",
            "designation": "Professor",
            "subject": "Power Systems",
            "department_id": "ECE",
            "departmentId": "Electronics & Communication",
            "qualification": "Ph.D. in Power Electronics",
            "employment_status": "Active",
            "joining_date": datetime(2009, 5, 1),
            "experience_years": 15,
            "attendance_rate": 90,
            "pass_rate": 88,
            "specialization": "Renewable Energy",
            "status": "Top",
            "cgpa": 8.3,
            "office_location": "Building B, Room 401",
        },
        {
            "name": "Dr. Neha Kapadia",
            "employeeId": "FAC019",
            "email": "neha.kapadia@mit.edu",
            "phone": "+91-9876543228",
            "designation": "Associate Professor",
            "subject": "Communications",
            "department_id": "ECE",
            "departmentId": "Electronics & Communication",
            "qualification": "Ph.D. in Wireless Communications",
            "employment_status": "Active",
            "joining_date": datetime(2016, 7, 1),
            "experience_years": 8,
            "attendance_rate": 87,
            "pass_rate": 86,
            "specialization": "5G Networks",
            "status": "Good",
            "cgpa": 8.2,
            "office_location": "Building B, Room 405",
        },
        {
            "name": "Ms. Sneha Patel",
            "employeeId": "FAC020",
            "email": "sneha.patel@mit.edu",
            "phone": "+91-9876543229",
            "designation": "Assistant Professor",
            "subject": "Embedded Systems",
            "department_id": "ECE",
            "departmentId": "Electronics & Communication",
            "qualification": "M.Tech in Electronics",
            "employment_status": "Active",
            "joining_date": datetime(2020, 9, 1),
            "experience_years": 3,
            "attendance_rate": 83,
            "pass_rate": 80,
            "specialization": "IoT Devices",
            "status": "Watch",
            "cgpa": 7.9,
            "office_location": "Building B, Room 406",
        },
        # Additional Mathematics Faculty
        {
            "name": "Prof. Vijay Kumar",
            "employeeId": "FAC021",
            "email": "vijay.kumar@mit.edu",
            "phone": "+91-9876543230",
            "designation": "Professor",
            "subject": "Complex Analysis",
            "department_id": "MATH",
            "departmentId": "Mathematics",
            "qualification": "Ph.D. in Mathematics",
            "employment_status": "Active",
            "joining_date": datetime(2011, 4, 1),
            "experience_years": 13,
            "attendance_rate": 88,
            "pass_rate": 87,
            "specialization": "Mathematical Analysis",
            "status": "Good",
            "cgpa": 8.2,
            "office_location": "Building C, Room 401",
        },
        {
            "name": "Dr. Meera Singh",
            "employeeId": "FAC022",
            "email": "meera.singh@mit.edu",
            "phone": "+91-9876543231",
            "designation": "Associate Professor",
            "subject": "Numerical Methods",
            "department_id": "MATH",
            "departmentId": "Mathematics",
            "qualification": "Ph.D. in Computational Mathematics",
            "employment_status": "Active",
            "joining_date": datetime(2017, 8, 1),
            "experience_years": 7,
            "attendance_rate": 86,
            "pass_rate": 84,
            "specialization": "Scientific Computing",
            "status": "Good",
            "cgpa": 8.1,
            "office_location": "Building C, Room 405",
        },
        # Additional Mechanical Engineering Faculty
        {
            "name": "Prof. Ashok Verma",
            "employeeId": "FAC023",
            "email": "ashok.verma@mit.edu",
            "phone": "+91-9876543232",
            "designation": "Professor",
            "subject": "Robotics",
            "department_id": "ME",
            "departmentId": "Mechanical Engineering",
            "qualification": "Ph.D. in Mechanical Engineering",
            "employment_status": "Active",
            "joining_date": datetime(2009, 9, 1),
            "experience_years": 14,
            "attendance_rate": 89,
            "pass_rate": 90,
            "specialization": "Industrial Automation",
            "status": "Top",
            "cgpa": 8.4,
            "office_location": "Building D, Room 401",
        },
        {
            "name": "Dr. Divya Menon",
            "employeeId": "FAC024",
            "email": "divya.menon@mit.edu",
            "phone": "+91-9876543233",
            "designation": "Associate Professor",
            "subject": "Fluid Mechanics",
            "department_id": "ME",
            "departmentId": "Mechanical Engineering",
            "qualification": "Ph.D. in Fluid Dynamics",
            "employment_status": "Active",
            "joining_date": datetime(2016, 5, 1),
            "experience_years": 8,
            "attendance_rate": 85,
            "pass_rate": 83,
            "specialization": "Aerodynamics",
            "status": "Good",
            "cgpa": 8.0,
            "office_location": "Building D, Room 405",
        },
        {
            "name": "Mr. Karan Reddy",
            "employeeId": "FAC025",
            "email": "karan.reddy@mit.edu",
            "phone": "+91-9876543234",
            "designation": "Lecturer",
            "subject": "Materials Science",
            "department_id": "ME",
            "departmentId": "Mechanical Engineering",
            "qualification": "B.Tech in Mechanical Engineering",
            "employment_status": "Active",
            "joining_date": datetime(2022, 1, 15),
            "experience_years": 1,
            "attendance_rate": 92,
            "pass_rate": 88,
            "specialization": "Material Testing",
            "status": "Good",
            "cgpa": 8.0,
            "office_location": "Building D, Room 406",
        },
        # Additional ECE Faculty
        {
            "name": "Prof. Ravi Teja",
            "employeeId": "FAC026",
            "email": "ravi.teja@mit.edu",
            "phone": "+91-9876543235",
            "designation": "Professor",
            "subject": "Control Systems",
            "department_id": "ECE",
            "departmentId": "Electronics & Communication",
            "qualification": "Ph.D. in Control Systems",
            "employment_status": "Active",
            "joining_date": datetime(2010, 2, 1),
            "experience_years": 14,
            "attendance_rate": 91,
            "pass_rate": 89,
            "specialization": "Process Control",
            "status": "Top",
            "cgpa": 8.3,
            "office_location": "Building B, Room 407",
        },
        {
            "name": "Dr. Anjana Das",
            "employeeId": "FAC027",
            "email": "anjana.das@mit.edu",
            "phone": "+91-9876543236",
            "designation": "Associate Professor",
            "subject": "Microelectronics",
            "department_id": "ECE",
            "departmentId": "Electronics & Communication",
            "qualification": "Ph.D. in Electronics",
            "employment_status": "Active",
            "joining_date": datetime(2015, 10, 1),
            "experience_years": 8,
            "attendance_rate": 88,
            "pass_rate": 87,
            "specialization": "Semiconductor Devices",
            "status": "Good",
            "cgpa": 8.2,
            "office_location": "Building B, Room 408",
        },
        # Additional Computer Science Faculty
        {
            "name": "Prof. Suresh Nair",
            "employeeId": "FAC028",
            "email": "suresh.nair@mit.edu",
            "phone": "+91-9876543237",
            "designation": "Professor",
            "subject": "Cloud Computing",
            "department_id": "CS",
            "departmentId": "Computer Science",
            "qualification": "Ph.D. in Computer Science",
            "employment_status": "Active",
            "joining_date": datetime(2007, 7, 1),
            "experience_years": 17,
            "attendance_rate": 92,
            "pass_rate": 91,
            "specialization": "Distributed Systems",
            "status": "Top",
            "cgpa": 8.5,
            "office_location": "Building A, Room 307",
        },
        {
            "name": "Dr. Swati Varma",
            "employeeId": "FAC029",
            "email": "swati.varma@mit.edu",
            "phone": "+91-9876543238",
            "designation": "Associate Professor",
            "subject": "Mobile Computing",
            "department_id": "CS",
            "departmentId": "Computer Science",
            "qualification": "Ph.D. in Software Engineering",
            "employment_status": "Active",
            "joining_date": datetime(2016, 3, 1),
            "experience_years": 8,
            "attendance_rate": 87,
            "pass_rate": 89,
            "specialization": "Android Development",
            "status": "Good",
            "cgpa": 8.2,
            "office_location": "Building A, Room 308",
        },
        {
            "name": "Ms. Priya Dutta",
            "employeeId": "FAC030",
            "email": "priya.dutta@mit.edu",
            "phone": "+91-9876543239",
            "designation": "Assistant Professor",
            "subject": "Data Mining",
            "department_id": "CS",
            "departmentId": "Computer Science",
            "qualification": "M.Tech in Computer Science",
            "employment_status": "Active",
            "joining_date": datetime(2021, 1, 1),
            "experience_years": 3,
            "attendance_rate": 84,
            "pass_rate": 82,
            "specialization": "Big Data Analytics",
            "status": "Good",
            "cgpa": 8.1,
            "office_location": "Building A, Room 309",
        },
    ]

    try:
        # Delete existing data
        await collection.delete_many({})

        # Insert new data
        result = await collection.insert_many(faculty_data)

        return {
            "status": "success",
            "message": f"Inserted {len(result.inserted_ids)} faculty members with detailed metrics",
            "count": len(result.inserted_ids),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# -----------------
# Faculty CRUD
# -----------------


@router.get("")
async def list_faculty(
    department: Optional[str] = None,
    department_id: Optional[str] = Query(None, alias="departmentId"),
    designation: Optional[str] = None,
    employment_status: Optional[str] = Query(None, alias="employmentStatus"),
    search: Optional[str] = None,
):
    try:
        collection = await get_faculty_collection()
        perf_col = await get_faculty_activity_collection("faculty_performance")
        leave_col = await get_faculty_activity_collection("faculty_leave")
        career_col = await get_faculty_activity_collection("career_pathways")

        query = {}
        dept_val = department or department_id
        if dept_val:
            query["$or"] = [
                {"departmentId": {"$regex": dept_val, "$options": "i"}},
                {"department": {"$regex": dept_val, "$options": "i"}},
                {"department_id": {"$regex": dept_val, "$options": "i"}},
            ]
        if designation:
            query["designation"] = designation
        if employment_status:
            query["employment_status"] = employment_status
        if search:
            query["$or"] = [
                {"name": {"$regex": search, "$options": "i"}},
                {"employeeId": {"$regex": search, "$options": "i"}},
                {"email": {"$regex": search, "$options": "i"}},
            ]

        projection = {
            "_id": 1,
            "id": 1,
            "employeeId": 1,
            "name": 1,
            "email": 1,
            "phone": 1,
            "department": 1,
            "departmentId": 1,
            "department_id": 1,
            "designation": 1,
            "qualification": 1,
            "employment_status": 1,
            "status": 1,
            "experience_years": 1,
            "yearsOfExperience": 1,
            "attendance_rate": 1,
            "pass_rate": 1,
            "avatar": 1,
            "joining_date": 1,
            "office_location": 1,
            "subject": 1,
            "specialization": 1,
        }

        cursor = collection.find(query, projection)
        faculty_list = []
        async for doc in cursor:
            faculty_list.append(serialize_doc(doc))

        emp_ids = [f.get("employeeId") for f in faculty_list if f.get("employeeId")]

        perf_map = {}
        leave_map = {}
        career_map = {}

        if emp_ids:
            perf_docs = await perf_col.find({"facultyId": {"$in": emp_ids}}).to_list(None)
            for p in perf_docs:
                fid = p.get("facultyId")
                if fid:
                    perf_map.setdefault(fid, []).append(p)

            leave_docs = await leave_col.find({"facultyId": {"$in": emp_ids}}).to_list(None)
            for leave_doc in leave_docs:
                fid = leave_doc.get("facultyId")
                if fid:
                    leave_map.setdefault(fid, []).append(leave_doc)

            career_docs = await career_col.find({"faculty_id": {"$in": emp_ids}}).to_list(None)
            for c in career_docs:
                fid = c.get("faculty_id")
                if fid:
                    if fid not in career_map or c.get("status") == "Active":
                        career_map[fid] = c

        for faculty_doc in faculty_list:
            emp_id = faculty_doc.get("employeeId")
            if emp_id:
                performance_records = perf_map.get(emp_id, [])
                leave_records = leave_map.get(emp_id, [])
                career_path = career_map.get(emp_id)

                avg_feedback = 0
                if performance_records:
                    scored = [
                        float(record.get("student_feedback_score", 0) or 0)
                        for record in performance_records
                    ]
                    avg_feedback = round(sum(scored) / len(scored), 2)

                approved_leaves = [
                    record
                    for record in leave_records
                    if str(record.get("status", "")).lower() == "approved"
                ]
                pending_leaves = [
                    record
                    for record in leave_records
                    if str(record.get("status", "")).lower() == "pending"
                ]

                total_leave_days = 0
                for leave in approved_leaves:
                    try:
                        start_date = leave.get("start_date")
                        end_date = leave.get("end_date")
                        if isinstance(start_date, datetime) and isinstance(end_date, datetime):
                            total_leave_days += max((end_date - start_date).days + 1, 0)
                        else:
                            total_leave_days += int(leave.get("number_of_days", 0) or 0)
                    except Exception:
                        continue

                next_role = None
                designation_str = str(faculty_doc.get("designation", "")).lower()
                if designation_str:
                    if "assistant" in designation_str:
                        next_role = "Associate Professor"
                    elif "associate" in designation_str:
                        next_role = "Professor"
                    elif "professor" in designation_str:
                        next_role = "HOD / Dean Track"
                    else:
                        next_role = "Senior Faculty"

                faculty_doc["performance_summary"] = {
                    "overall_status": faculty_doc.get("status", "Good"),
                    "pass_rate": faculty_doc.get("pass_rate", 0),
                    "attendance_rate": faculty_doc.get("attendance_rate", 0),
                    "avg_feedback_score": avg_feedback,
                    "records_count": len(performance_records),
                }

                faculty_doc["career_path_summary"] = {
                    "current_designation": faculty_doc.get("designation"),
                    "next_role": (career_path or {}).get("target_designation") or next_role,
                    "status": (career_path or {}).get("status") or "Not Started",
                    "target_years": (career_path or {}).get("target_years"),
                }

                faculty_doc["leave_attendance_summary"] = {
                    "employment_status": faculty_doc.get("employment_status", "Active"),
                    "attendance_rate": faculty_doc.get("attendance_rate", 0),
                    "leave_requests_count": len(leave_records),
                    "approved_leaves": len(approved_leaves),
                    "pending_leaves": len(pending_leaves),
                    "total_leave_days": total_leave_days,
                }

        if faculty_list:
            return faculty_list

        if faculty_list:
            return faculty_list

    except Exception as e:
        print(f"MongoDB list_faculty error, serving fallback data: {e}")

    # Fallback default faculty sample data
    fallback_faculty = [
        {"id": "FAC001", "employeeId": "FAC001", "name": "Dr. Ramesh Kumar", "email": "ramesh.kumar@mit.edu", "department": "Computer Science", "designation": "Professor", "employment_status": "Active", "experience_years": 12, "qualification": "Ph.D. CS", "phone": "+91 98765 43210"},
        {"id": "FAC002", "employeeId": "FAC002", "name": "Prof. Lakshmi Nair", "email": "lakshmi.nair@mit.edu", "department": "Computer Science", "designation": "Associate Professor", "employment_status": "Active", "experience_years": 8, "qualification": "Ph.D. SE", "phone": "+91 98765 43211"},
        {"id": "FAC003", "employeeId": "FAC003", "name": "Dr. Anil Verma", "email": "anil.verma@mit.edu", "department": "Computer Science", "designation": "Assistant Professor", "employment_status": "Active", "experience_years": 5, "qualification": "Ph.D. Networks", "phone": "+91 98765 43212"},
        {"id": "FAC004", "employeeId": "FAC004", "name": "Dr. Sunita Sharma", "email": "sunita.sharma@mit.edu", "department": "Electronics", "designation": "Professor", "employment_status": "Active", "experience_years": 14, "qualification": "Ph.D. ECE", "phone": "+91 98765 43213"},
        {"id": "FAC005", "employeeId": "FAC005", "name": "Prof. Vikram Iyer", "email": "vikram.iyer@mit.edu", "department": "Electronics", "designation": "Associate Professor", "employment_status": "Active", "experience_years": 9, "qualification": "Ph.D. DSP", "phone": "+91 98765 43214"},
        {"id": "FAC006", "employeeId": "FAC006", "name": "Dr. Meena Pillai", "email": "meena.pillai@mit.edu", "department": "Electronics", "designation": "Assistant Professor", "employment_status": "Active", "experience_years": 4, "qualification": "Ph.D. ECE", "phone": "+91 98765 43215"},
        {"id": "FAC007", "employeeId": "FAC007", "name": "Prof. Suresh Babu", "email": "suresh.babu@mit.edu", "department": "Mechanical", "designation": "Professor", "employment_status": "Active", "experience_years": 13, "qualification": "Ph.D. Thermal", "phone": "+91 98765 43216"},
        {"id": "FAC008", "employeeId": "FAC008", "name": "Prof. Rekha Joshi", "email": "rekha.joshi@mit.edu", "department": "Mathematics", "designation": "Associate Professor", "employment_status": "On Leave", "experience_years": 9, "qualification": "Ph.D. Math", "phone": "+91 98765 43217"},
    ]
    return fallback_faculty


@router.get("/dropdown")
async def list_faculty_dropdown(department: Optional[str] = None):
    """
    Highly optimized, lightweight backend endpoint for HOD selection & dropdown lists.
    Projects only essential identity fields (id, name, designation, department, email, phone).
    """
    try:
        collection = await get_faculty_collection()
        query = {}
        if department:
            query["$or"] = [
                {"department": department},
                {"departmentId": department},
                {"department_id": department}
            ]

        projection = {
            "_id": 1,
            "id": 1,
            "employeeId": 1,
            "name": 1,
            "fullName": 1,
            "email": 1,
            "phone": 1,
            "contactNumber": 1,
            "designation": 1,
            "department": 1,
            "departmentId": 1,
            "department_id": 1,
        }

        cursor = collection.find(query, projection)
        faculty_list = []
        async for doc in cursor:
            fac_doc = serialize_doc(doc)
            # Ensure name property exists
            if not fac_doc.get("name") and fac_doc.get("fullName"):
                fac_doc["name"] = fac_doc["fullName"]
            faculty_list.append(fac_doc)

        if faculty_list:
            return faculty_list

    except Exception as e:
        print(f"Error fetching faculty dropdown: {e}")

    # Standard HOD Faculty fallback list
    return [
        {"id": "FAC001", "employeeId": "FAC001", "name": "Dr. Ramesh Kumar", "designation": "Professor", "department": "Computer Science", "email": "ramesh.kumar@mit.edu", "phone": "+91 98765 43210"},
        {"id": "FAC002", "employeeId": "FAC002", "name": "Prof. Lakshmi Nair", "designation": "Associate Professor", "department": "Computer Science", "email": "lakshmi.nair@mit.edu", "phone": "+91 98765 43211"},
        {"id": "FAC004", "employeeId": "FAC004", "name": "Dr. Sunita Sharma", "designation": "Professor", "department": "Electronics & Communication", "email": "sunita.sharma@mit.edu", "phone": "+91 98765 43213"},
        {"id": "FAC009", "employeeId": "FAC009", "name": "Dr. Deepak Gupta", "designation": "Professor", "department": "Mathematics", "email": "deepak.gupta@mit.edu", "phone": "+91 98765 43218"},
        {"id": "FAC012", "employeeId": "FAC012", "name": "Dr. Venkat Reddy", "designation": "Professor", "department": "Mechanical Engineering", "email": "venkat.reddy@mit.edu", "phone": "+91 98765 43221"},
        {"id": "FAC015", "employeeId": "FAC015", "name": "Prof. Rajesh Gupta", "designation": "Professor", "department": "Computer Science", "email": "rajesh.gupta@mit.edu", "phone": "+91 98765 43224"},
        {"id": "FAC018", "employeeId": "FAC018", "name": "Dr. Geetha V", "designation": "Professor", "department": "Information Technology", "email": "geetha.v@mit.edu", "phone": "+91 98765 43230"},
        {"id": "FAC026", "employeeId": "FAC026", "name": "Dr. K. Rahini", "designation": "Professor", "department": "Medical Laboratory Technology", "email": "rahini.k@mit.edu", "phone": "+91 98765 43240"},
    ]


@router.post("")
async def create_faculty(faculty: Faculty):
    collection = await get_faculty_collection()

    # Check if employee_id already exists
    existing = await collection.find_one({"employeeId": faculty.employee_id})
    if existing:
        raise HTTPException(status_code=400, detail="Employee ID already exists")

    faculty_dict = faculty.dict(by_alias=True)
    result = await collection.insert_one(faculty_dict)

    # Send welcome email asynchronously
    try:
        from backend.utils.mailer import send_email
        email_to = faculty_dict.get("email")
        if email_to:
            emp_id = faculty_dict.get("employeeId") or faculty_dict.get("employee_id")
            subject = "Welcome to CMS"
            html_body = f"""
            <html>
            <body>
                <h2>Welcome to CMS!</h2>
                <p>Dear {faculty_dict.get("name", "Faculty Member")},</p>
                <p>Your faculty account has been created successfully.</p>
                <p>Here are your account details to log in:</p>
                <ul>
                    <li><strong>Role:</strong> Faculty</li>
                    <li><strong>Employee ID/Username:</strong> {emp_id}</li>
                    <li><strong>Password:</strong> {faculty_dict.get("password") or emp_id}</li>
                </ul>
                <p>Best regards,<br>College Management System (CMS) Support</p>
            </body>
            </html>
            """
            import asyncio
            asyncio.create_task(send_email(email_to, subject, html_body))
        else:
            print("[EMAIL WARNING] No email address found for faculty, skipping welcome email.")
    except Exception as email_err:
        print(f"[EMAIL ERROR] Failed to trigger welcome email for faculty: {str(email_err)}")

    created_doc = await collection.find_one({"_id": result.inserted_id})
    return serialize_doc(created_doc)


async def _get_next_faculty_id():
    db = get_db()
    collection = db["faculty"]
    # Scan ALL existing FAC-NNN ids and find the true numeric maximum.
    # The old code used last_id[3:] which kept the dash → int("-203") = -203,
    # breaking arithmetic and always falling back to FAC001 (causing duplicates).
    max_num = 200  # start from FAC-201 for new installs
    cursor = collection.find(
        {"employeeId": {"$regex": "^FAC-\\d+$"}}, {"employeeId": 1}
    )
    async for doc in cursor:
        last_id = doc.get("employeeId", "")
        try:
            # Format is FAC-NNN; split on dash to get the numeric part
            num = int(last_id.split("-", 1)[1])
            if num > max_num:
                max_num = num
        except (ValueError, IndexError):
            pass

    # Loop until we find an ID not already in use (guards against races)
    candidate_num = max_num + 1
    while True:
        candidate = f"FAC-{candidate_num}"
        existing = await collection.find_one({"employeeId": candidate})
        if not existing:
            return candidate
        candidate_num += 1


def get_role_from_designation(designation: str) -> str:
    """Map designation to system role"""
    if not designation:
        return "faculty"

    designation = designation.lower()
    if any(
        keyword in designation
        for keyword in ["admin", "principal", "dean", "registrar"]
    ):
        return "admin"
    if any(keyword in designation for keyword in ["accountant", "finance", "bursar"]):
        return "finance"
    if "student" in designation:
        return "student"
    return "faculty"


@router.post("/admission/submit")
async def submit_faculty_admission(faculty_data: dict = Body(...)):
    """Submit faculty admission from modal form"""
    try:
        # Log incoming data
        print(f"📤 [Faculty Admission] Received payload: {faculty_data}")

        # Validate required fields
        required_fields = [
            "fullName",
            "name",
            "email",
            "phone",
            "dateOfBirth",
            "department",
        ]
        missing_fields = [
            field for field in required_fields if not faculty_data.get(field)
        ]

        if missing_fields:
            error_msg = f"Missing required fields: {', '.join(missing_fields)}"
            print(f"❌ [Faculty Admission] Validation error: {error_msg}")
            raise HTTPException(status_code=400, detail=error_msg)

        # Validate email format
        email = faculty_data.get("email", "").strip()
        if "@" not in email or "." not in email.split("@")[-1]:
            error_msg = "Invalid email format"
            print(f"❌ [Faculty Admission] {error_msg}: {email}")
            raise HTTPException(status_code=400, detail=error_msg)

        # Validate phone (10 digits)
        phone = str(faculty_data.get("phone", "")).replace(" ", "").replace("-", "")
        if not phone.isdigit() or len(phone) != 10:
            error_msg = f"Phone number must be exactly 10 digits (got {len(phone)})"
            print(f"❌ [Faculty Admission] {error_msg}: {faculty_data.get('phone')}")
            raise HTTPException(
                status_code=400, detail="Phone number must be exactly 10 digits"
            )

        collection = await get_faculty_collection()

        # Check if email already exists
        existing_email = await collection.find_one({"email": email})
        if existing_email:
            error_msg = "Faculty with this email already exists"
            print(f"❌ [Faculty Admission] {error_msg}: {email}")
            raise HTTPException(status_code=400, detail=error_msg)

        # Generate unique employeeId
        employee_id = await _get_next_faculty_id()
        print(f"✅ [Faculty Admission] Generated Employee ID: {employee_id}")

        # Determine role from designation
        designation = faculty_data.get("designation", "Faculty")
        role = get_role_from_designation(designation)

        # Prepare faculty document
        faculty_doc = {
            **faculty_data,
            "employeeId": employee_id,
            "id": employee_id,
            "password": faculty_data.get("password") or employee_id,
            "created_at": datetime.now(),
            "status": "Pending",
            "type": "faculty",
            "role": role,
        }

        # Remove None/empty values for cleaner storage
        faculty_doc = {k: v for k, v in faculty_doc.items() if v is not None}

        # Insert into faculty collection
        result = await collection.insert_one(faculty_doc)
        print(
            f"✅ [Faculty Admission] Document inserted with MongoDB ID: {result.inserted_id}"
        )

        # Send welcome email asynchronously
        try:
            from backend.utils.mailer import send_email
            email_to = faculty_doc.get("email")
            if email_to:
                subject = "Welcome to CMS"
                html_body = f"""
                <html>
                <body>
                    <h2>Welcome to CMS!</h2>
                    <p>Dear {faculty_doc.get("name") or faculty_doc.get("fullName") or "Faculty Member"},</p>
                    <p>Your faculty admission/account request has been submitted successfully.</p>
                    <p>Here are your account details to log in (pending review/activation):</p>
                    <ul>
                        <li><strong>Role:</strong> Faculty</li>
                        <li><strong>Employee ID/Username:</strong> {employee_id}</li>
                        <li><strong>Password:</strong> {faculty_doc.get("password") or employee_id}</li>
                    </ul>
                    <p>Best regards,<br>College Management System (CMS) Support</p>
                </body>
                </html>
                """
                import asyncio
                asyncio.create_task(send_email(email_to, subject, html_body))
            else:
                print(f"[EMAIL WARNING] No email address found for faculty admission {employee_id}, skipping welcome email.")
        except Exception as email_err:
            print(f"[EMAIL ERROR] Failed to trigger welcome email for faculty admission {employee_id}: {str(email_err)}")

        created_doc = await collection.find_one({"_id": result.inserted_id})
        response = serialize_doc(created_doc)
        print(
            f"✅ [Faculty Admission] Successfully created faculty admission for {email}"
        )
        return response

    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        print(f"❌ [Faculty Admission] Unhandled error: {error_msg}")
        import traceback

        traceback.print_exc()
        raise HTTPException(
            status_code=500, detail=f"Failed to process faculty admission: {error_msg}"
        )


@router.get("/{faculty_id}")
async def get_faculty(faculty_id: str = Path(...)):
    collection = await get_faculty_collection()
    try:
        obj_id = ObjectId(faculty_id)
        doc = await collection.find_one({"_id": obj_id})
    except Exception:
        doc = await collection.find_one({"employeeId": faculty_id})

    if not doc:
        # Fallback to check admin_users collection if requested ID belongs to an admin
        db = get_db()
        doc = await db["admin_users"].find_one(
            {"$or": [{"userId": faculty_id}, {"id": faculty_id}]}
        )
        if not doc:
            raise HTTPException(status_code=404, detail="Faculty not found")

        # Format admin as a faculty record
        doc_serialized = serialize_doc(doc)
        emp_id = doc_serialized.get("userId") or doc_serialized.get("id") or faculty_id
        doc_serialized["employeeId"] = emp_id
        doc_serialized["id"] = emp_id
        doc_serialized["designation"] = "Administrator"
        doc_serialized["departmentId"] = "Administration"
        doc_serialized["employment_status"] = "Active"
        doc_serialized["office_location"] = "Main Block, Room 101"

        # Load additional fields from user_settings if available
        settings_col = db["user_settings"]
        settings_doc = await settings_col.find_one({"userId": emp_id})
        if settings_doc and "profile" in settings_doc:
            profile = settings_doc["profile"]
            doc_serialized["phone"] = profile.get(
                "phone", doc_serialized.get("phone", "")
            )
            doc_serialized["bio"] = profile.get("bio", doc_serialized.get("bio", ""))
            doc_serialized["office_location"] = profile.get(
                "address", doc_serialized.get("office_location", "Main Block, Room 101")
            )
            doc_serialized["qualification"] = profile.get(
                "qualification", doc_serialized.get("qualification", "")
            )
            doc_serialized["gender"] = profile.get(
                "gender", doc_serialized.get("gender", "")
            )
            doc_serialized["dob"] = profile.get("dob", doc_serialized.get("dob", ""))
            doc_serialized["college"] = profile.get(
                "college", doc_serialized.get("college", "")
            )
            doc_serialized["university"] = profile.get(
                "university", doc_serialized.get("university", "")
            )
            doc_serialized["nationality"] = profile.get(
                "nationality", doc_serialized.get("nationality", "")
            )

        doc_serialized["teaching_load"] = []
        doc_serialized["performance_metrics"] = []
        doc_serialized["professional_development"] = []
        doc_serialized["leave_requests"] = []
        doc_serialized["mentorships"] = []
        doc_serialized["research_projects"] = []
        doc_serialized["peer_reviews"] = []
        return doc_serialized

    # Fetch related data
    doc_serialized = serialize_doc(doc)
    emp_id = doc_serialized.get("employeeId")

    # Courses
    courses_col = await get_faculty_activity_collection("faculty_courses")
    courses = []
    if emp_id:
        async for c in courses_col.find({"facultyId": emp_id}):
            courses.append(serialize_doc(c))
    doc_serialized["teaching_load"] = courses

    # Performance
    perf_col = await get_faculty_activity_collection("faculty_performance")
    performance = []
    if emp_id:
        async for p in perf_col.find({"facultyId": emp_id}):
            performance.append(serialize_doc(p))
    doc_serialized["performance_metrics"] = performance

    # Development
    dev_col = await get_faculty_activity_collection("faculty_development")
    devs = []
    if emp_id:
        async for d in dev_col.find({"facultyId": emp_id}):
            devs.append(serialize_doc(d))
    doc_serialized["professional_development"] = devs

    # Leave Requests
    leave_col = await get_faculty_activity_collection("faculty_leave")
    leaves = []
    if emp_id:
        async for leave_req in leave_col.find({"facultyId": emp_id}):
            leaves.append(serialize_doc(leave_req))
    doc_serialized["leave_requests"] = leaves

    # Mentorships
    mentor_col = await get_faculty_activity_collection("faculty_mentorship")
    mentorships = []
    if emp_id:
        async for m in mentor_col.find(
            {"$or": [{"mentorId": emp_id}, {"menteeId": emp_id}]}
        ):
            mentorships.append(serialize_doc(m))
    doc_serialized["mentorships"] = mentorships

    # Research Projects
    research_col = await get_faculty_activity_collection("faculty_research")
    research = []
    if emp_id:
        async for r in research_col.find(
            {"$or": [{"leadFacultyId": emp_id}, {"collaboratorIds": emp_id}]}
        ):
            research.append(serialize_doc(r))
    doc_serialized["research_projects"] = research

    # Peer Reviews
    review_col = await get_faculty_activity_collection("faculty_peer_reviews")
    reviews = []
    if emp_id:
        async for pr in review_col.find({"revieweeId": emp_id}):
            reviews.append(serialize_doc(pr))
    doc_serialized["peer_reviews"] = reviews

    return doc_serialized


@router.put("/{faculty_id}")
async def update_faculty(faculty_id: str, updates: Dict[str, Any] = Body(...)):
    collection = await get_faculty_collection()
    try:
        query = {"_id": ObjectId(faculty_id)}
    except Exception:
        query = {"employeeId": faculty_id}

    db = get_db()
    is_admin = await db["admin_users"].find_one(
        {"$or": [{"userId": faculty_id}, {"id": faculty_id}]}
    )

    if is_admin:
        # Update admin_users collection
        await db["admin_users"].update_many(
            {"$or": [{"userId": faculty_id}, {"id": faculty_id}]},
            {"$set": {"name": updates.get("name"), "email": updates.get("email")}},
        )
        # Update user_settings collection
        settings_col = db["user_settings"]
        settings_doc = await settings_col.find_one({"userId": faculty_id})
        if settings_doc:
            await settings_col.update_one(
                {"userId": faculty_id},
                {
                    "$set": {
                        "profile.name": updates.get("name"),
                        "profile.email": updates.get("email"),
                        "profile.phone": updates.get("phone", ""),
                        "profile.bio": updates.get("bio", ""),
                        "profile.address": updates.get("office_location", ""),
                        "profile.qualification": updates.get("qualification", ""),
                        "profile.gender": updates.get("gender", ""),
                        "profile.dob": updates.get("dob", ""),
                        "profile.college": updates.get("college", ""),
                        "profile.university": updates.get("university", ""),
                        "profile.nationality": updates.get("nationality", ""),
                    }
                },
            )
        else:
            # Seed defaults
            from backend.routes.user_settings import _admin_defaults

            defaults = _admin_defaults()
            defaults["profile"].update(
                {
                    "name": updates.get("name"),
                    "email": updates.get("email"),
                    "phone": updates.get("phone", ""),
                    "bio": updates.get("bio", ""),
                    "address": updates.get("office_location", ""),
                    "qualification": updates.get("qualification", ""),
                    "gender": updates.get("gender", ""),
                    "dob": updates.get("dob", ""),
                    "college": updates.get("college", ""),
                    "university": updates.get("university", ""),
                    "nationality": updates.get("nationality", ""),
                }
            )
            await settings_col.insert_one(
                {
                    "userId": faculty_id,
                    "role": "admin",
                    "createdAt": datetime.now().isoformat(),
                    **defaults,
                }
            )

        updated_admin = await db["admin_users"].find_one(
            {"$or": [{"userId": faculty_id}, {"id": faculty_id}]}
        )
        doc_serialized = serialize_doc(updated_admin)
        emp_id = doc_serialized.get("userId") or doc_serialized.get("id") or faculty_id
        doc_serialized["employeeId"] = emp_id
        doc_serialized["id"] = emp_id
        doc_serialized["designation"] = "Administrator"
        doc_serialized["departmentId"] = "Administration"
        doc_serialized["employment_status"] = "Active"

        # Load from settings
        settings_doc = await settings_col.find_one({"userId": emp_id})
        if settings_doc and "profile" in settings_doc:
            profile = settings_doc["profile"]
            doc_serialized["phone"] = profile.get("phone", "")
            doc_serialized["bio"] = profile.get("bio", "")
            doc_serialized["office_location"] = profile.get(
                "address", "Main Block, Room 101"
            )
            doc_serialized["qualification"] = profile.get("qualification", "")
            doc_serialized["gender"] = profile.get("gender", "")
            doc_serialized["dob"] = profile.get("dob", "")
            doc_serialized["college"] = profile.get("college", "")
            doc_serialized["university"] = profile.get("university", "")
            doc_serialized["nationality"] = profile.get("nationality", "")

        return doc_serialized

    # Prevent updating _id or core immutable fields if needed
    if "_id" in updates:
        del updates["_id"]

    result = await collection.update_one(query, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Faculty not found")

    updated_doc = await collection.find_one(query)
    return serialize_doc(updated_doc)


@router.delete("/{faculty_id}")
async def delete_faculty(faculty_id: str):
    collection = await get_faculty_collection()
    try:
        query = {"_id": ObjectId(faculty_id)}
    except Exception:
        query = {"employeeId": faculty_id}

    result = await collection.delete_one(query)
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Faculty not found")

    return {"status": "success", "message": "Faculty deleted"}


# -----------------
# Faculty Course Mapping
# -----------------


@router.post("/{faculty_id}/courses")
async def assign_course(faculty_id: str, assignment: CourseAssignment):
    collection = await get_faculty_activity_collection("faculty_courses")

    # Validate faculty exists
    fac_col = await get_faculty_collection()
    try:
        query = {"_id": ObjectId(faculty_id)}
    except Exception:
        query = {"employeeId": faculty_id}
    if not await fac_col.find_one(query):
        raise HTTPException(status_code=404, detail="Faculty not found")

    # Ensure facultyId matches
    assignment_dict = assignment.dict(by_alias=True)
    if assignment_dict["facultyId"] != faculty_id:
        if assignment_dict["facultyId"] == "string":  # Default swagger value
            assignment_dict["facultyId"] = faculty_id
        else:
            raise HTTPException(status_code=400, detail="Faculty ID mismatch")

    result = await collection.insert_one(assignment_dict)
    doc = await collection.find_one({"_id": result.inserted_id})
    return serialize_doc(doc)


# -----------------
# Faculty Performance
# -----------------


@router.post("/{faculty_id}/performance")
async def add_performance_metric(faculty_id: str, metric: PerformanceMetric):
    collection = await get_faculty_activity_collection("faculty_performance")

    metric_dict = metric.dict(by_alias=True)
    if metric_dict["facultyId"] != faculty_id:
        if metric_dict["facultyId"] == "string":
            metric_dict["facultyId"] = faculty_id
        else:
            raise HTTPException(status_code=400, detail="Faculty ID mismatch")

    result = await collection.insert_one(metric_dict)
    doc = await collection.find_one({"_id": result.inserted_id})
    return serialize_doc(doc)


# -----------------
# Professional Development
# -----------------


@router.post("/{faculty_id}/development")
async def add_development_record(faculty_id: str, dev: ProfessionalDevelopment):
    collection = await get_faculty_activity_collection("faculty_development")

    dev_dict = dev.dict(by_alias=True)
    if dev_dict["facultyId"] != faculty_id:
        if dev_dict["facultyId"] == "string":
            dev_dict["facultyId"] = faculty_id
        else:
            raise HTTPException(status_code=400, detail="Faculty ID mismatch")

    result = await collection.insert_one(dev_dict)
    doc = await collection.find_one({"_id": result.inserted_id})
    return serialize_doc(doc)


# -----------------
# Leave Management
# -----------------


@router.post("/{faculty_id}/leave")
async def request_leave(faculty_id: str, leave: FacultyLeave):
    collection = await get_faculty_activity_collection("faculty_leave")

    leave_dict = leave.dict(by_alias=True)
    if leave_dict["facultyId"] != faculty_id:
        if leave_dict["facultyId"] == "string":
            leave_dict["facultyId"] = faculty_id
        else:
            raise HTTPException(status_code=400, detail="Faculty ID mismatch")

    result = await collection.insert_one(leave_dict)
    doc = await collection.find_one({"_id": result.inserted_id})
    return serialize_doc(doc)


@router.get("/{faculty_id}/leave")
async def get_leave_requests(faculty_id: str):
    collection = await get_faculty_activity_collection("faculty_leave")

    requests = []
    async for req in collection.find({"facultyId": faculty_id}):
        requests.append(serialize_doc(req))
    return requests


@router.put("/leave/{leave_id}")
async def update_leave_status(leave_id: str, updates: Dict[str, Any] = Body(...)):
    collection = await get_faculty_activity_collection("faculty_leave")

    result = await collection.update_one({"_id": ObjectId(leave_id)}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Leave request not found")

    updated_doc = await collection.find_one({"_id": ObjectId(leave_id)})
    return serialize_doc(updated_doc)


# -----------------
# Mentorship
# -----------------


@router.post("/{faculty_id}/mentorship")
async def add_mentorship(faculty_id: str, mentorship: FacultyMentorship):
    collection = await get_faculty_activity_collection("faculty_mentorship")
    mentorship_dict = mentorship.dict(by_alias=True)
    if (
        mentorship_dict["mentorId"] != faculty_id
        and mentorship_dict["menteeId"] != faculty_id
    ):
        if mentorship_dict["mentorId"] == "string":
            mentorship_dict["mentorId"] = faculty_id
        else:
            raise HTTPException(status_code=400, detail="Faculty ID mismatch")

    result = await collection.insert_one(mentorship_dict)
    doc = await collection.find_one({"_id": result.inserted_id})
    return serialize_doc(doc)


@router.get("/{faculty_id}/mentorship")
async def get_mentorships(faculty_id: str):
    collection = await get_faculty_activity_collection("faculty_mentorship")
    mentorships = []
    async for m in collection.find(
        {"$or": [{"mentorId": faculty_id}, {"menteeId": faculty_id}]}
    ):
        mentorships.append(serialize_doc(m))
    return mentorships


# -----------------
# Research Collaboration
# -----------------


@router.post("/research")
async def add_research_project(project: ResearchProject):
    collection = await get_faculty_activity_collection("faculty_research")
    project_dict = project.dict(by_alias=True)
    result = await collection.insert_one(project_dict)
    doc = await collection.find_one({"_id": result.inserted_id})
    return serialize_doc(doc)


@router.get("/{faculty_id}/research")
async def get_research_projects(faculty_id: str):
    collection = await get_faculty_activity_collection("faculty_research")
    projects = []
    async for p in collection.find(
        {"$or": [{"leadFacultyId": faculty_id}, {"collaboratorIds": faculty_id}]}
    ):
        projects.append(serialize_doc(p))
    return projects


# -----------------
# Peer Review
# -----------------


@router.post("/{faculty_id}/peer-review")
async def add_peer_review(faculty_id: str, review: PeerReview):
    collection = await get_faculty_activity_collection("faculty_peer_reviews")
    review_dict = review.dict(by_alias=True)
    if (
        review_dict["reviewerId"] != faculty_id
        and review_dict["revieweeId"] != faculty_id
    ):
        if review_dict["reviewerId"] == "string":
            review_dict["reviewerId"] = faculty_id
        else:
            raise HTTPException(status_code=400, detail="Faculty ID mismatch")

    result = await collection.insert_one(review_dict)
    doc = await collection.find_one({"_id": result.inserted_id})
    return serialize_doc(doc)


@router.get("/{faculty_id}/peer-review")
async def get_peer_reviews(faculty_id: str):
    collection = await get_faculty_activity_collection("faculty_peer_reviews")
    reviews = []
    async for r in collection.find({"revieweeId": faculty_id}):
        reviews.append(serialize_doc(r))
    return reviews


# -----------------
# Compliance & Notifications
# -----------------


@router.get("/{faculty_id}/notifications")
async def get_notifications(faculty_id: str):
    collection = await get_faculty_activity_collection("faculty_notifications")
    notifications = []
    async for n in collection.find({"recipient_id": faculty_id}):
        notifications.append(serialize_doc(n))
    return notifications


@router.post("/check-compliance")
async def check_compliance():
    faculty_col = await get_faculty_collection()
    notices_col = await get_faculty_activity_collection("faculty_notifications")

    current_date = datetime.utcnow()
    count = 0

    # Check all active faculty
    async for f in faculty_col.find({"employment_status": "Active"}):
        contract_end = f.get("contract_end_date")
        if contract_end:
            try:
                # Assuming YYYY-MM-DD
                end_date = datetime.strptime(contract_end, "%Y-%m-%d")
                days_left = (end_date - current_date).days

                if days_left <= 30 and days_left > 0:
                    # Create notification if it doesn't exist for this period
                    notif = Notification(
                        recipient_id=f.get("employeeId", str(f["_id"])),
                        recipient_type="faculty",
                        title="Contract Renewal Upcoming",
                        message=f"Your contract will expire in {days_left} days on {contract_end}.",
                        notification_type="System",
                    )

                    # Prevent exact duplicate notification
                    existing = await notices_col.find_one(
                        {
                            "recipient_id": notif.recipient_id,
                            "title": notif.title,
                            "is_read": False,
                        }
                    )

                    if not existing:
                        await notices_col.insert_one(notif.dict())
                        count += 1

            except ValueError:
                pass  # ignore poorly formatted dates

    return {"status": "success", "notifications_generated": count}


class BulkFacultyImportPayload(BaseModel):
    faculty: List[dict]
    defaultPassword: Optional[str] = None


@router.post("/bulk-import")
async def bulk_import_faculty(payload: BulkFacultyImportPayload):
    try:
        db = get_db()
        collection = db["faculty"]
        use_db = True
    except HTTPException as error:
        if error.status_code == 503:
            use_db = False
        else:
            raise

    imported_count = 0
    records = []

    for index, f in enumerate(payload.faculty):
        # Generate employeeId/facultyId if not provided
        timestamp_part = int(datetime.now().timestamp() * 1000) % 10000
        employee_id = (
            f.get("employeeId") or f.get("id") or f"FAC-{timestamp_part + index:04d}"
        )

        # Determine password
        password = payload.defaultPassword or f.get("password") or employee_id

        # Determine designation and role
        designation = f.get("designation", f.get("role", "Assistant Professor"))
        role = get_role_from_designation(designation)

        faculty_doc = {
            "name": f.get("name") or f.get("fullName") or "",
            "fullName": f.get("fullName") or f.get("name") or "",
            "email": f.get("email", ""),
            "phone": f.get("phone", ""),
            "dateOfBirth": f.get("dateOfBirth") or f.get("dob") or "",
            "gender": f.get("gender", "Male"),
            "role": role,
            "designation": designation,
            "department": f.get("department", "Computer Science"),
            "department_id": f.get("department_id")
            or f.get("department", "Computer Science"),
            "departmentId": f.get("departmentId")
            or f.get("department", "Computer Science"),
            "yearsOfExperience": int(f.get("yearsOfExperience") or 0),
            "highestQualification": f.get("highestQualification")
            or f.get("qualification")
            or "",
            "qualification": f.get("qualification")
            or f.get("highestQualification")
            or "",
            "specialization": f.get("specialization", ""),
            "university": f.get("university", ""),
            "employmentType": f.get("employmentType", "Full-Time"),
            "employeeId": employee_id,
            "id": employee_id,
            "password": password,
            "created_at": datetime.now(),
            "status": "Pending",
            "type": "faculty",
        }

        records.append(faculty_doc)

    if use_db:
        if records:
            await collection.insert_many(records)
            imported_count = len(records)
    else:
        if "faculty" not in DEV_STORE:
            DEV_STORE["faculty"] = []
        for r in records:
            DEV_STORE["faculty"].insert(0, deepcopy(r))
        imported_count = len(records)

    return {
        "status": "success",
        "message": f"Successfully imported {imported_count} faculty admission requests.",
        "count": imported_count,
    }
