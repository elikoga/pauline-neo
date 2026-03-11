from fastapi import APIRouter, Depends, HTTPException

from app import schemas
from app.data.brokers import DatabaseBroker
from app.routes.api_dependencies import check_api_key
from app.routes.dependencies import get_database_broker

router = APIRouter(
    dependencies=[Depends(check_api_key)]
)


@router.post('/semester', status_code=201)
def create_semester(semester: schemas.Semester, broker: DatabaseBroker = Depends(get_database_broker)):
    """
    Create a new semester
    """
    broker.create_semester(semester)


@router.delete('/semester')
def delete_semester(semesterId: int, broker: DatabaseBroker = Depends(get_database_broker)):
    """
    Delete a semester
    """
    if not broker.delete_semester(semesterId):
        raise HTTPException(status_code=404, detail="Semester not found")
