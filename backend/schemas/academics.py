from datetime import date
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


class ExamBase(BaseModel):
    model_config = ConfigDict(extra='ignore')

    code: str
    name: str
    date: str
    time: str
    room: str
    type: str
    status: str = "Upcoming"
    duration: str
    maxMarks: str
    senderRole: Optional[str] = "faculty"


class ExamCreate(ExamBase):
    pass


class ExamUpdate(BaseModel):
    model_config = ConfigDict(extra='ignore')

    code: Optional[str] = None
    name: Optional[str] = None
    date: Optional[str] = None
    time: Optional[str] = None
    room: Optional[str] = None
    type: Optional[str] = None
    status: Optional[str] = None
    duration: Optional[str] = None
    maxMarks: Optional[str] = None
    senderRole: Optional[str] = None


class TimetableEntry(BaseModel):
    code: str = ""
    name: str = ""
    room: str = ""
    instructor: str = ""
    credits: int = 1
    type: str = "Lecture"
    theme: str = "blue"
    color: str = ""
    textColor: str = ""
    label: str = ""


class TimetableBreakItem(BaseModel):
    id: str
    label: str
    afterPeriod: int
    tone: str = "slate"


class TimetableRecord(BaseModel):
    classId: str
    label: str
    dept: str
    semester: str
    section: str
    slots: List[List[Optional[TimetableEntry]]] = Field(default_factory=list)
    periodSlots: List[str] = Field(default_factory=list)
    breakItems: List[TimetableBreakItem] = Field(default_factory=list)


class AttendanceRecord(BaseModel):
    personId: str
    name: str
    role: str
    courseOrDepartment: str
    present: int
    total: int


class WeeklyAttendancePoint(BaseModel):
    day: str
    attendance: float


class AttendanceMarkEntry(BaseModel):
    studentId: str
    rollNumber: str = ""
    name: str = ""
    status: str = "Present"


class AttendanceMarkRecord(BaseModel):
    classId: str
    classLabel: str = ""
    date: str
    hour: str
    subjectCode: str = ""
    subjectName: str = ""
    markedBy: str = ""
    markedAt: Optional[str] = None
    entries: List[AttendanceMarkEntry] = Field(default_factory=list)
    locked: bool = False


class FacultyAttendanceMarkEntry(BaseModel):
    facultyId: str
    name: str
    department: str = ""
    designation: str = ""
    status: str = "Present"
    remarks: str = ""


class FacultyAttendanceMarkRecord(BaseModel):
    date: str
    markedBy: str = "admin"
    markedAt: Optional[str] = None
    entries: List[FacultyAttendanceMarkEntry] = Field(default_factory=list)


class OdRequestPayload(BaseModel):
    studentId: str
    fromDate: str
    toDate: str
    hours: List[str] = Field(default_factory=list)
    reason: str
    proofImageData: str = ""
    proofImageName: str = ""
    status: str = "Pending"
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None
    reviewedBy: Optional[str] = None
    reviewedAt: Optional[str] = None


class OdRequestStatusUpdate(BaseModel):
    status: str
    reviewedBy: Optional[str] = None


class PlacementEntry(BaseModel):
    name: str
    company: str
    role: str
    package: str
    status: str = "Process"
    date: str
    ownerId: Optional[str] = None


class FacilityRecord(BaseModel):
    name: str
    type: str
    capacity: int
    status: str = "Available"
    amenities: List[str] = Field(default_factory=list)


class FacilityBooking(BaseModel):
    room: str
    date: date
    timeFrom: str
    timeTo: str
    purpose: str
    requestedBy: Optional[str] = None
