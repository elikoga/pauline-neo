import os
from typing import List

from fastapi import APIRouter, Depends

from app import schemas
from app.data.brokers import DatabaseBroker
from app.routes.dependencies import get_database_broker

router = APIRouter()


@router.get("/available", response_model=List[schemas.SemesterWithoutCoursesButId])
def see_all_available_semesters(broker: DatabaseBroker = Depends(get_database_broker)):
    """
    Returns all available semesters.
    """
    return broker.get_semesters()


@router.get("/newest", response_model=List[schemas.SemesterWithoutCoursesButId])
def see_newest_semesters(broker: DatabaseBroker = Depends(get_database_broker)):
    """
    Returns newest semester of all semesters with same name.
    """
    return broker.get_newest_semesters()


@router.get("/revision", response_model=int)
def see_current_data_revision():
    return os.environ.get("REVISION", 1)
