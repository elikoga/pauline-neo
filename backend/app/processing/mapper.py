from app import schemas
from app.data.storage import models


# TODO : recursive algorithm

def map_appointment(appointment: schemas.Appointment) -> models.Appointment:
    return models.Appointment(
        start_time=appointment.start_time,
        end_time=appointment.end_time,
        room=appointment.room,
        instructors=appointment.instructors,
    )


def map_small_group(small_group: schemas.SmallGroup) -> models.SmallGroup:
    return models.SmallGroup(
        name=small_group.name,
        appointments=[map_appointment(appointment) for appointment in small_group.appointments],
    )


def map_course(course: schemas.Course) -> models.Course:
    return models.Course(
        cid=course.cid,
        name=course.name,
        description=course.description,
        small_groups=[map_small_group(small_group) for small_group in course.small_groups],
        appointments=[map_appointment(appointment) for appointment in course.appointments],
        instructors=course.instructors,
        ou=course.ou,
    )


def map_semester(semester: schemas.Semester) -> models.Semester:
    return models.Semester(
        name=semester.name,
        courses=[map_course(course) for course in semester.courses],
        created=semester.created,
    )
