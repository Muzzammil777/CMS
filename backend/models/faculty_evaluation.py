from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class PerformanceEvaluation(BaseModel):
    faculty_id: Optional[str] = Field(None, alias="facultyId")
    semester: str = "Fall 2026"
    academic_year: str = "2026"
    evaluator_id: Optional[str] = "admin"
    evaluation_date: Optional[str] = None
    
    # Teaching Quality (1-5)
    course_content: float = 0
    teaching_methodology: float = 0
    student_engagement: float = 0
    feedback_responsiveness: float = 0
    
    # Research & Publication (1-5)
    research_output: float = 0
    publication_quality: float = 0
    research_collaboration: float = 0
    
    # Administrative (1-5)
    meeting_attendance: float = 0
    committee_participation: float = 0
    documentation: float = 0
    
    # Student Feedback (1-5)
    student_satisfaction: float = 0
    course_effectiveness: float = 0
    availability: float = 0
    
    # Summary
    overall_rating: float = 0
    strengths: Optional[str] = None
    areas_for_improvement: Optional[str] = None
    recommendations: Optional[str] = None
    status: str = "Completed"  # Pending, InProgress, Completed
    
    class Config:
        populate_by_name = True

class EvaluationTemplate(BaseModel):
    name: str
    department: str
    criteria: List[dict]  # List of {name, weight, maxScore}
    academic_year: str
    created_date: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        populate_by_name = True
