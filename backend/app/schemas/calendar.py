from typing import Dict, List

from pydantic import BaseModel, validator

from .course import Course, SmallGroup


class CalendarSmallGroup(SmallGroup):
    cid: str


class CalendarCourse(Course):
    pass


class SavedTimetable(BaseModel):
    id: str
    name: str
    semesterName: str
    appointments: List[CalendarCourse | CalendarSmallGroup] = []
    updatedAt: str
    order: int | None = None
    deleted: bool = False
    @validator("appointments", pre=True)
    def parse_appointment_collections(cls, appointments):
        return [parse_calendar_appointment(appointment) for appointment in appointments]

    class Config:
        smart_union = True


def parse_calendar_appointment(raw_appointment):
    if isinstance(raw_appointment, (CalendarCourse, CalendarSmallGroup)):
        return raw_appointment
    if "description" in raw_appointment or "small_groups" in raw_appointment:
        return CalendarCourse.parse_obj(raw_appointment)
    return CalendarSmallGroup.parse_obj(raw_appointment)


class CalendarState(BaseModel):
    activeTimetableIds: Dict[str, str] = {}
    timetables: List[SavedTimetable] = []



class CalendarStateUpdate(CalendarState):
    pass
