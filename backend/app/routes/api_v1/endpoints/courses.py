from threading import Lock
from typing import List

from cachetools import TTLCache, cached
from fastapi import APIRouter, Depends, Query, Path, HTTPException

from app import schemas
from app.data.brokers import DatabaseBroker
from app.routes.dependencies import get_database_broker

router = APIRouter()


@router.get("/search", response_model=List[schemas.CourseWithoutAppointments])
def list_and_search_courses_by_name(
    semesterId: int = Query(..., example=1),
    title: str = Query(..., example="Systemsoftware und"),
    broker: DatabaseBroker = Depends(get_database_broker),
):
    """
    List and search courses by name.
    """
    return broker.find_courses_by_name(semesterId, title)


@router.get("/all", response_model=List[schemas.CourseWithoutAppointments])
@cached(
    cache=TTLCache(maxsize=1024, ttl=600),
    key=lambda semesterId, broker: semesterId,
    lock=Lock(),
)
def list_all_courses_of_semester(
    semesterId: int = Query(..., example=1),
    broker: DatabaseBroker = Depends(get_database_broker),
):
    """
    List all courses of a semester.
    """
    return broker.get_all_courses_of_semester(semesterId)


@router.get(
    "/{courseId}",
    response_model=schemas.Course,
    responses={404: {"model": schemas.DetailMessage}},
)
def retrieve_information_of_a_course(
    semesterId: int = Query(..., example=1),
    courseId: str = Path(..., example="L.079.05401"),
    broker: DatabaseBroker = Depends(get_database_broker),
):
    """
    Querries course by id with all small groups and appointments.
    """
    course = broker.find_course_by_id(semesterId, courseId)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return course
