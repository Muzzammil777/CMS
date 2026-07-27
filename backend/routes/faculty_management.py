from fastapi import APIRouter, HTTPException, Query, Body, Path
from typing import List, Optional, Dict, Any
from bson import ObjectId
from datetime import datetime, timedelta
from pydantic import BaseModel
from uuid import uuid4

from backend.db import get_db
from backend.utils.mongo import serialize_doc
from backend.models.faculty_leave import LeaveRequest, LeaveBalance
from backend.models.faculty_evaluation import PerformanceEvaluation, EvaluationTemplate
from backend.models.faculty_notification import FacultyWorkload, WorkloadAlert, Notification
from backend.dev_store import DEV_STORE, create_notification

router = APIRouter(prefix="/api/faculty", tags=["faculty-management"])

# Helper functions
async def get_collection(collection_name: str):
    db = get_db()
    return db[collection_name]

# ===== LEAVE MANAGEMENT =====

@router.get("/{faculty_id}/leaves")
async def get_faculty_leaves(
    faculty_id: str = Path(...),
    status: Optional[str] = Query(None),
    year: Optional[str] = Query(None)
):
    """Get all leave requests for a faculty member"""
    try:
        db = get_db()
        use_db = True
    except HTTPException as error:
        if error.status_code == 503:
            use_db = False
        else:
            raise

    query = {"facultyId": faculty_id}
    if status:
        query["status"] = status

    if use_db:
        collection = db["faculty_leaves"]
        if year:
            query["$or"] = [
                {
                    "requested_date": {
                        "$gte": datetime(int(year), 1, 1),
                        "$lt": datetime(int(year) + 1, 1, 1)
                    }
                },
                {
                    "appliedOn": {
                        "$gte": datetime(int(year), 1, 1).isoformat(),
                        "$lt": datetime(int(year) + 1, 1, 1).isoformat()
                    }
                }
            ]
        
        leaves = []
        async for doc in collection.find(query).sort("appliedOn", -1):
            leaves.append(serialize_doc(doc))
        return leaves
    else:
        leaves = DEV_STORE.setdefault("faculty_leaves", [])
        filtered_leaves = [l for l in leaves if l.get("facultyId") == faculty_id]
        if status:
            filtered_leaves = [l for l in filtered_leaves if l.get("status") == status]
        if year:
            filtered_leaves = [
                l for l in filtered_leaves 
                if str(l.get("startDate", l.get("appliedOn", ""))).startswith(year)
            ]
        filtered_leaves = sorted(filtered_leaves, key=lambda l: l.get("appliedOn", ""), reverse=True)
        return filtered_leaves


@router.post("/{faculty_id}/leaves")
async def request_leave(
    faculty_id: str = Path(...),
    leave_request: LeaveRequest = Body(...)
):
    """Request a new leave"""
    # Calculate days
    start = datetime.fromisoformat(leave_request.start_date)
    end = datetime.fromisoformat(leave_request.end_date)
    days = (end - start).days + 1
    
    # Validate dates
    if end < start:
        raise HTTPException(status_code=400, detail="End date must be after start date")
    
    leave_dict = leave_request.dict(by_alias=True)
    leave_dict["facultyId"] = faculty_id
    leave_dict["no_of_days"] = days
    
    # Ensure appliedOn is a string ISO timestamp
    if isinstance(leave_dict.get("appliedOn"), datetime):
        leave_dict["appliedOn"] = leave_dict["appliedOn"].isoformat()
    elif not leave_dict.get("appliedOn"):
        leave_dict["appliedOn"] = datetime.utcnow().isoformat()
        
    try:
        db = get_db()
        use_db = True
    except HTTPException as error:
        if error.status_code == 503:
            use_db = False
        else:
            raise

    if use_db:
        collection = db["faculty_leaves"]
        result = await collection.insert_one(leave_dict)
        created = await collection.find_one({"_id": result.inserted_id})
        
        # Create notification
        notif_collection = db["notifications"]
        await notif_collection.insert_one({
            "recipient_id": faculty_id,
            "recipient_type": "faculty",
            "title": "Leave Request Submitted",
            "message": f"Your {leave_request.leave_type} leave request for {days} days has been submitted",
            "notification_type": "LeaveApproval",
            "reference_id": str(result.inserted_id),
            "is_read": False,
            "created_date": datetime.utcnow()
        })
        return serialize_doc(created)
    else:
        leave_id = f"leave_{uuid4().hex[:12]}"
        leave_dict["id"] = leave_id
        leave_dict["_id"] = leave_id
        DEV_STORE.setdefault("faculty_leaves", []).append(leave_dict)
        
        # Create notification
        create_notification({
            "title": "Leave Request Submitted",
            "message": f"Your {leave_request.leave_type} leave request for {days} days has been submitted",
            "senderRole": "system",
            "receiverRole": "faculty",
            "module": "Academic",
            "priority": "Medium",
            "status": "unread",
            "createdAt": datetime.utcnow().isoformat() + "Z"
        })
        return leave_dict


@router.put("/{faculty_id}/leaves/{leave_id}")
async def update_leave_status(
    faculty_id: str = Path(...),
    leave_id: str = Path(...),
    updates: Dict[str, Any] = Body(...)
):
    """Update leave request status (admin only)"""
    try:
        db = get_db()
        use_db = True
    except HTTPException as error:
        if error.status_code == 503:
            use_db = False
        else:
            raise

    if "_id" in updates:
        del updates["_id"]
    
    updates["approval_date"] = datetime.utcnow().isoformat()
    status_msg = "approved" if updates.get("status") == "Approved" else "rejected"

    if use_db:
        collection = db["faculty_leaves"]
        try:
            query = {"_id": ObjectId(leave_id), "facultyId": faculty_id}
        except:
            query = {"_id": leave_id, "facultyId": faculty_id}
            
        result = await collection.update_one(query, {"$set": updates})
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Leave request not found")
        
        updated = await collection.find_one(query)
        
        # Create notification
        notif_collection = db["notifications"]
        await notif_collection.insert_one({
            "recipient_id": faculty_id,
            "recipient_type": "faculty",
            "title": f"Leave Request {status_msg.title()}",
            "message": f"Your leave request has been {status_msg}",
            "notification_type": "LeaveApproval",
            "reference_id": str(updated["_id"]),
            "is_read": False,
            "created_date": datetime.utcnow()
        })
        return serialize_doc(updated)
    else:
        leaves = DEV_STORE.setdefault("faculty_leaves", [])
        leave_req = next((l for l in leaves if (l.get("id") == leave_id or l.get("_id") == leave_id) and l.get("facultyId") == faculty_id), None)
        if not leave_req:
            raise HTTPException(status_code=404, detail="Leave request not found")
        
        leave_req.update(updates)
        
        # Create notification
        create_notification({
            "title": f"Leave Request {status_msg.title()}",
            "message": f"Your leave request has been {status_msg}",
            "senderRole": "admin",
            "receiverRole": "faculty",
            "module": "Academic",
            "priority": "High",
            "status": "unread",
            "createdAt": datetime.utcnow().isoformat() + "Z"
        })
        return leave_req


@router.get("/{faculty_id}/leave-balance")
async def get_leave_balance(
    faculty_id: str = Path(...),
    academic_year: str = Query(...)
):
    """Get leave balance for a faculty member"""
    try:
        db = get_db()
        use_db = True
    except HTTPException as error:
        if error.status_code == 503:
            use_db = False
        else:
            raise

    default_balance = {
        "facultyId": faculty_id,
        "academic_year": academic_year,
        "sick_leave": 10,
        "casual_leave": 15,
        "academic_leave": 5,
        "maternity_leave": 90,
        "used_sick": 0,
        "used_casual": 0,
        "used_academic": 0,
        "used_maternity": 0
    }

    if use_db:
        collection = db["faculty_leave_balance"]
        balance = await collection.find_one({
            "facultyId": faculty_id,
            "academic_year": academic_year
        })
        if not balance:
            result = await collection.insert_one(default_balance)
            balance = await collection.find_one({"_id": result.inserted_id})
        return serialize_doc(balance)
    else:
        balances = DEV_STORE.setdefault("faculty_leave_balance", {})
        key = f"{faculty_id}::{academic_year}"
        if key not in balances:
            balances[key] = default_balance
        return balances[key]

# ===== PERFORMANCE EVALUATION =====

@router.get("/{faculty_id}/evaluations")
async def get_faculty_evaluations(
    faculty_id: str = Path(...),
    semester: Optional[str] = Query(None),
    academic_year: Optional[str] = Query(None)
):
    """Get evaluations for a faculty member"""
    collection = await get_collection("faculty_evaluations")
    
    query = {"facultyId": faculty_id}
    if semester:
        query["semester"] = semester
    if academic_year:
        query["academic_year"] = academic_year
    
    evaluations = []
    async for doc in collection.find(query).sort("evaluation_date", -1):
        evaluations.append(serialize_doc(doc))
    return evaluations

@router.post("/{faculty_id}/evaluations")
async def create_evaluation(
    faculty_id: str = Path(...),
    evaluation: PerformanceEvaluation = Body(...)
):
    """Create a new evaluation for a faculty member"""
    collection = await get_collection("faculty_evaluations")
    
    # Calculate overall rating
    scores = [
        evaluation.course_content,
        evaluation.teaching_methodology,
        evaluation.student_engagement,
        evaluation.research_output,
        evaluation.meeting_attendance,
        evaluation.student_satisfaction
    ]
    overall = sum(s for s in scores if s > 0) / len([s for s in scores if s > 0]) if scores else 0
    
    eval_dict = evaluation.dict(by_alias=True)
    eval_dict["facultyId"] = faculty_id
    eval_dict["overall_rating"] = round(overall, 2)
    eval_dict["evaluation_date"] = datetime.utcnow()
    
    result = await collection.insert_one(eval_dict)
    created = await collection.find_one({"_id": result.inserted_id})
    
    # Create notification
    notif_collection = await get_collection("notifications")
    await notif_collection.insert_one({
        "recipient_id": faculty_id,
        "recipient_type": "faculty",
        "title": "Performance Evaluation Completed",
        "message": f"Your performance evaluation for {evaluation.semester} has been completed. Overall Rating: {overall:.1f}/5.0",
        "notification_type": "Performance",
        "reference_id": str(result.inserted_id),
        "is_read": False,
        "created_date": datetime.utcnow()
    })
    
    return serialize_doc(created)

@router.get("/{faculty_id}/evaluation-summary")
async def get_evaluation_summary(
    faculty_id: str = Path(...),
    academic_year: Optional[str] = Query(None)
):
    """Get performance summary for a faculty"""
    collection = await get_collection("faculty_evaluations")
    
    query = {"facultyId": faculty_id}
    if academic_year:
        query["academic_year"] = academic_year
    
    evaluations = []
    async for doc in collection.find(query):
        evaluations.append(serialize_doc(doc))
    
    if not evaluations:
        return {"message": "No evaluations found", "average_rating": "N/A"}
    
    avg_rating = sum(e.get("overall_rating", 0) for e in evaluations) / len(evaluations)
    
    return {
        "total_evaluations": len(evaluations),
        "average_rating": round(avg_rating, 2),
        "latest_evaluation": evaluations[0] if evaluations else None,
        "trend": "Improving" if len(evaluations) > 1 and evaluations[0].get("overall_rating", 0) > evaluations[-1].get("overall_rating", 0) else "Stable"
    }

# ===== WORKLOAD MANAGEMENT =====

@router.get("/{faculty_id}/workload")
async def get_faculty_workload(
    faculty_id: str = Path(...),
    semester: Optional[str] = Query(None),
    academic_year: Optional[str] = Query(None)
):
    """Get current workload for a faculty member"""
    collection = await get_collection("faculty_workload")
    
    query = {"facultyId": faculty_id}
    if semester:
        query["semester"] = semester
    if academic_year:
        query["academic_year"] = academic_year
    
    workload = await collection.find_one(query)
    
    if not workload:
        raise HTTPException(status_code=404, detail="Workload record not found")
    
    return serialize_doc(workload)

@router.post("/{faculty_id}/workload")
async def record_workload(
    faculty_id: str = Path(...),
    workload: FacultyWorkload = Body(...)
):
    """Record/update workload for a faculty member"""
    collection = await get_collection("faculty_workload")
    
    # Calculate workload percentage
    base_load = workload.total_credit_hours * 5  # Assume 5% per credit hour
    research_load = workload.research_hours * 2
    admin_load = (workload.committee_roles * 10) + (workload.mentoring_students * 3)
    
    total_workload = min(base_load + research_load + admin_load, 100)
    
    workload_dict = workload.dict(by_alias=True)
    workload_dict["facultyId"] = faculty_id
    workload_dict["workload_percentage"] = total_workload
    workload_dict["status"] = "Overloaded" if total_workload > 90 else "Underloaded" if total_workload < 60 else "Normal"
    
    result = await collection.update_one(
        {"facultyId": faculty_id, "semester": workload.semester, "academic_year": workload.academic_year},
        {"$set": workload_dict},
        upsert=True
    )
    
    # If overloaded, create alert
    if total_workload > 90:
        alert_collection = await get_collection("workload_alerts")
        await alert_collection.insert_one({
            "facultyId": faculty_id,
            "semester": workload.semester,
            "academic_year": workload.academic_year,
            "alert_type": "Overload",
            "current_workload": total_workload,
            "threshold": 90,
            "message": f"Faculty workload is {total_workload:.1f}%, exceeding recommended 90%",
            "status": "Active",
            "created_date": datetime.utcnow()
        })
        
        # Notify admin
        notif_collection = await get_collection("notifications")
        await notif_collection.insert_one({
            "recipient_id": "admin",
            "recipient_type": "admin",
            "title": "Faculty Workload Alert",
            "message": f"Faculty {faculty_id} has exceeded workload threshold ({total_workload:.1f}%)",
            "notification_type": "WorkloadAlert",
            "reference_id": faculty_id,
            "is_read": False,
            "created_date": datetime.utcnow()
        })
    
    return {"status": "success", "workload_percentage": total_workload}

# ===== NOTIFICATIONS =====

@router.get("/{faculty_id}/notifications")
async def get_notifications(
    faculty_id: str = Path(...),
    unread_only: bool = Query(False)
):
    """Get notifications for a faculty member"""
    collection = await get_collection("notifications")
    
    query = {"recipient_id": faculty_id}
    if unread_only:
        query["is_read"] = False
    
    notifications = []
    async for doc in collection.find(query).sort("created_date", -1).limit(50):
        notifications.append(serialize_doc(doc))
    
    return notifications

@router.put("/{faculty_id}/notifications/{notification_id}")
async def mark_notification_read(
    faculty_id: str = Path(...),
    notification_id: str = Path(...)
):
    """Mark notification as read"""
    collection = await get_collection("notifications")
    
    try:
        query = {"_id": ObjectId(notification_id), "recipient_id": faculty_id}
    except:
        query = {"_id": notification_id, "recipient_id": faculty_id}
    
    result = await collection.update_one(query, {"$set": {"is_read": True}})
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    return {"status": "success", "message": "Marked as read"}

@router.get("/{faculty_id}/notifications/count")
async def get_unread_count(faculty_id: str = Path(...)):
    """Get count of unread notifications"""
    collection = await get_collection("notifications")
    
    count = await collection.count_documents({
        "recipient_id": faculty_id,
        "is_read": False
    })
    
    return {"unread_count": count}
