from pydantic import BaseModel, Field
from typing import List, Optional

class NewsletterCreate(BaseModel):
    title: str
    summary: str
    content: str
    category: str = Field(default="General", description="Category: Placement, Event, Academic, General")
    author: str = Field(default="Campus Editorial Board")
    targetRoles: List[str] = Field(default_factory=lambda: ["ALL"])
