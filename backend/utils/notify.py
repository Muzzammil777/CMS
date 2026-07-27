"""
notify.py — Utility helper for sending preference-gated notifications.

Usage:
    from backend.utils.notify import send_notification

    await send_notification(
        db=db,
        receiver_role="student",
        event_key="feeReminder",        # must match the key in settings notifications
        title="Fees Assigned",
        message="Your semester fees have been assigned.",
        sender_role="admin",
        module="Finance",
        priority="High",
        related_data={"studentId": "STU-2024-1547", "amount": 75000},
        # Optionally target a specific user — if omitted, notification goes to all in the role
        receiver_user_id="STU-2024-1547",
    )

If `receiver_user_id` is provided, the preference for that specific user is checked first.
If the preference toggle is False the notification is suppressed for that user.
If `receiver_user_id` is None, the notification is broadcast to the entire role
(preference-per-user filtering is delegated to the frontend/notification center).
"""
from __future__ import annotations

from datetime import datetime
from typing import Optional


async def send_notification(
    db,
    receiver_role: str,
    event_key: str,
    title: str,
    message: str,
    *,
    sender_role: str = "system",
    module: str = "Academic",
    priority: str = "Medium",
    related_data: Optional[dict] = None,
    receiver_user_id: Optional[str] = None,
) -> bool:
    """
    Insert a notification into db["notifications"] if the recipient's preference allows it.

    Returns True if notification was sent, False if it was suppressed by preferences.
    """
    # Check preference only if we know which specific user this is for
    if receiver_user_id:
        doc = await db["user_settings"].find_one({"userId": receiver_user_id})
        if doc and "notifications" in doc:
            prefs = doc["notifications"]
            # If the preference key exists and is explicitly False, suppress
            if event_key in prefs and not prefs[event_key]:
                return False

    doc = {
        "title": title,
        "message": message,
        "senderRole": sender_role,
        "receiverRole": receiver_role,
        "module": module,
        "priority": priority,
        "status": "unread",
        "createdAt": datetime.utcnow().isoformat(),
        "relatedData": related_data or {},
    }
    if receiver_user_id:
        doc["receiverUserId"] = receiver_user_id

    await db["notifications"].insert_one(doc)
    return True
