from typing import Optional
from fastapi import APIRouter, HTTPException
from pymongo import ReturnDocument

from backend.db import get_db
from backend.dev_store import create_placement as create_dev_placement
from backend.dev_store import delete_placement as delete_dev_placement
from backend.dev_store import list_placements as list_dev_placements
from backend.dev_store import update_placement as update_dev_placement
from backend.schemas.academics import PlacementEntry
from backend.utils.mongo import parse_object_id, serialize_doc
from backend.utils.notify import send_notification

router = APIRouter(prefix="/api/academics/placement", tags=["academics:placement"])


@router.get("")
async def list_placements(
    status: Optional[str] = None,
    search: Optional[str] = None,
    person_id: Optional[str] = None,
):
    try:
        db = get_db()
    except HTTPException as error:
        if error.status_code == 503:
            return {"success": True, "data": list_dev_placements(status, search, person_id)}
        raise
    query = {}
    if status and status != "All":
        query["status"] = status
    if person_id:
        query["ownerId"] = person_id
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"company": {"$regex": search, "$options": "i"}},
        ]

    rows = []
    async for row in db["academic_placements"].find(query).sort("date", -1):
        rows.append(serialize_doc(row))
    return {"success": True, "data": rows}


@router.post("")
async def create_placement(payload: PlacementEntry):
    try:
        db = get_db()
    except HTTPException as error:
        if error.status_code == 503:
            return {"success": True, "data": create_dev_placement(payload.model_dump())}
        raise
    result = await db["academic_placements"].insert_one(payload.model_dump())
    created = await db["academic_placements"].find_one({"_id": result.inserted_id})

    # Notify faculty and admin about the new placement
    data = payload.model_dump()
    student_name = data.get("name") or data.get("studentName") or "A student"
    company = data.get("company") or "a company"
    role_title = data.get("role") or data.get("jobRole") or "a position"
    package = data.get("package") or data.get("salary") or ""
    package_str = f" with package ₹{package:,.0f}" if isinstance(package, (int, float)) and package else ""

    notif_title = "New Placement Added"
    notif_message = f"{student_name} has been placed at {company} as {role_title}{package_str}."

    # Notify faculty
    await send_notification(
        db=db,
        receiver_role="faculty",
        event_key="placementAlerts",
        title=notif_title,
        message=notif_message,
        sender_role="student",
        module="Academic",
        priority="Medium",
        related_data={"company": company, "role": role_title},
    )
    # Notify admin
    await send_notification(
        db=db,
        receiver_role="admin",
        event_key="placementAlerts",
        title=notif_title,
        message=notif_message,
        sender_role="student",
        module="Academic",
        priority="Medium",
        related_data={"company": company, "role": role_title},
    )

    return {"success": True, "data": serialize_doc(created)}


@router.put("/{placement_id}")
async def update_placement(placement_id: str, payload: PlacementEntry):
    try:
        db = get_db()
    except HTTPException as error:
        if error.status_code == 503:
            updated = update_dev_placement(placement_id, payload.model_dump())
            if not updated:
                raise HTTPException(status_code=404, detail="Placement entry not found")
            return {"success": True, "data": updated}
        raise
    updated = await db["academic_placements"].find_one_and_update(
        {"_id": parse_object_id(placement_id)},
        {"$set": payload.model_dump()},
        return_document=ReturnDocument.AFTER,
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Placement entry not found")
    return {"success": True, "data": serialize_doc(updated)}


@router.delete("/{placement_id}")
async def delete_placement(placement_id: str):
    try:
        db = get_db()
    except HTTPException as error:
        if error.status_code == 503:
            deleted = delete_dev_placement(placement_id)
            if not deleted:
                raise HTTPException(status_code=404, detail="Placement entry not found")
            return {"success": True, "message": "Placement entry deleted"}
        raise
    result = await db["academic_placements"].delete_one({"_id": parse_object_id(placement_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Placement entry not found")
    return {"success": True, "message": "Placement entry deleted"}
