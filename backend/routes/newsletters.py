from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, HTTPException

from backend.db import get_db
from backend.dev_store import list_newsletters as list_dev_newsletters
from backend.dev_store import create_newsletter as create_dev_newsletter
from backend.dev_store import create_notification as create_dev_notification
from backend.schemas.newsletter import NewsletterCreate
from backend.utils.mongo import parse_object_id, serialize_doc

router = APIRouter(prefix="/api/newsletters", tags=["newsletters"])

@router.get("")
async def get_newsletters(role: str):
    try:
        db = get_db()
    except HTTPException as error:
        if error.status_code == 503:
            items = list_dev_newsletters(role)
            return {"success": True, "data": items}
        raise

    # Match newsletters where targetRoles contains "ALL" or the user's role
    query = {
        "$or": [
            {"targetRoles": "ALL"},
            {"targetRoles": role}
        ]
    }
    
    cursor = db["newsletters"].find(query).sort("publishedAt", -1)
    
    data = []
    async for row in cursor:
        data.append(serialize_doc(row))
        
    return {
        "success": True,
        "data": data
    }

@router.post("")
async def add_newsletter(payload: NewsletterCreate):
    doc = payload.model_dump()
    doc["publishedAt"] = datetime.utcnow().isoformat() + "Z"
    
    try:
        db = get_db()
    except HTTPException as error:
        if error.status_code == 503:
            created = create_dev_newsletter(doc)
            # Trigger notifications in dev store fallback
            notif_title = f"New Chronicle: {doc['title']}"
            notif_message = doc['summary']
            for role_target in doc.get('targetRoles', ['ALL']):
                notif_payload = {
                    "title": notif_title,
                    "message": notif_message,
                    "senderRole": doc.get("author", "admin"),
                    "receiverRole": role_target,
                    "module": "System",
                    "priority": "Medium",
                    "createdAt": doc["publishedAt"],
                    "status": "unread"
                }
                create_dev_notification(notif_payload)
            return {"success": True, "message": "Newsletter published in dev store", "data": created}
        raise

    result = await db["newsletters"].insert_one(doc)
    created = await db["newsletters"].find_one({"_id": result.inserted_id})
    
    # Trigger notifications in MongoDB
    notif_title = f"New Chronicle: {doc['title']}"
    notif_message = doc['summary']
    for role_target in doc.get('targetRoles', ['ALL']):
        notif_payload = {
            "title": notif_title,
            "message": notif_message,
            "senderRole": doc.get("author", "admin"),
            "receiverRole": role_target,
            "module": "System",
            "priority": "Medium",
            "createdAt": doc["publishedAt"],
            "status": "unread"
        }
        await db["notifications"].insert_one(notif_payload)
        
    return {"success": True, "message": "Newsletter published successfully", "data": serialize_doc(created)}

