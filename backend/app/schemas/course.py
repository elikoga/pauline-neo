import datetime
from typing import List, Optional

from pydantic import BaseModel


class Appointment(BaseModel):
    start_time: datetime.datetime
    end_time: datetime.datetime
    room: str
    instructors: str

    class Config:
        orm_mode = True

        schema_extra = {
            "example": {
                "start_time": "2020-01-01T12:00:00",
                "end_time": "2020-01-01T13:00:00",
                "room": "C1",
                "instructors": "Prof. Dr. Holger Karl"
            }
        }


class SmallGroup(BaseModel):
    name: str
    appointments: List[Appointment] = []

    class Config:
        orm_mode = True

        schema_extra = {
            "example": {
                "name": "Gruppe 1",
                "appointments": [
                    Appointment.Config.schema_extra["example"]
                ]
            }
        }


class CourseWithoutAppointments(BaseModel):
    cid: str
    name: str
    description: Optional[str]
    ou: Optional[str]
    instructors: Optional[str]

    class Config:
        orm_mode = True

        schema_extra = {
            "example": {
                "cid": "L.079.05401",
                "name": "Systemsoftware und systemnahe Programmierung",
                "description": ""
            }
        }


class Course(CourseWithoutAppointments):
    small_groups: List[SmallGroup] = []
    appointments: List[Appointment] = []

    class Config:
        orm_mode = True

        schema_extra = {
            "example": {
                "cid": "L.079.05401",
                "name": "Systemsoftware und systemnahe Programmierung",
                "description": "",
                "small_groups": [SmallGroup.Config.schema_extra["example"]],
                "appointments": [Appointment.Config.schema_extra["example"]]
            }
        }


class CourseList(BaseModel):
    __root__: List[Course]


class SemesterWithoutCourses(BaseModel):
    name: str
    created: Optional[datetime.datetime] = datetime.datetime.now()

    class Config:
        orm_mode = True

        schema_extra = {
            "example": {
                "name": "Sommer 2022"
            }
        }


class SemesterWithoutCoursesButId(SemesterWithoutCourses):
    id: int


class Semester(SemesterWithoutCourses):
    courses: List[Course] = []

    class Config:
        orm_mode = True


class SemesterList(BaseModel):
    __root__: List[Semester]
