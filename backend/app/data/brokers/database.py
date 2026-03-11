import datetime
from typing import List, Dict

from sqlalchemy import func, and_
from sqlalchemy.orm import Session

from app import schemas
from app.data.brokers.broker import Broker
from app.data.storage import models
from app.processing import mapper


class DatabaseBroker(Broker):
    session: Session

    def __init__(self, session: Session):
        self.session = session

    def find_course_by_id(self, semester_id: int, course_id: str) -> schemas.Course:
        return self.session.query(models.Course).join(models.Semester).filter(models.Semester.id == semester_id,
                                                                              models.Course.cid == course_id).first()

    def find_course_by_name(self, semester_id: int, course_name: str) -> schemas.Course:
        return self.session.query(models.Course).join(models.Semester).filter(models.Semester.id == semester_id,
                                                                              models.Course.name == course_name).first()

    def find_courses_by_name(self, semester_id: int, course_name: str) -> List[schemas.Course]:
        return self.session.query(models.Course).join(models.Semester).filter(models.Semester.id == semester_id,
                                                                              models.Course.name.ilike(
                                                                                  f"%{course_name}%")).all()

    def get_courses(self, semester_id: int) -> List[schemas.Course]:
        return self.session.query(models.Course).join(models.Semester).filter(
            models.Semester.name == semester_id).all()

    def get_semesters(self) -> List[schemas.SemesterWithoutCoursesButId]:
        return self.session.query(models.Semester).all()

    def get_newest_semesters(self) -> List[schemas.SemesterWithoutCoursesButId]:
        semesters: List[schemas.SemesterWithoutCoursesButId] = self.session.query(models.Semester).all()
        semester_map: Dict[str, schemas.SemesterWithoutCoursesButId] = {}
        for semester in semesters:
            if (semester_map.get(semester.name) and semester.id > semester_map[semester.name].id)\
                    or not semester_map.get(semester.name):
                semester_map[semester.name] = semester
        return list(semester_map.values())

    def get_all_courses_of_semester(self, semester_id: int) -> List[schemas.CourseWithoutAppointments]:
        return self.session.query(models.Course).join(models.Semester).filter(models.Semester.id == semester_id).all()

    def create_semester(self, semester: schemas.Semester):
        if semester.created is None:
            semester.created = datetime.datetime.now()

        db_semester = mapper.map_semester(semester)
        self.session.add(db_semester)
        self.session.commit()

    def delete_semester(self, semester_id: int) -> bool:
        db_semester = self.session.query(models.Semester).filter(models.Semester.id == semester_id).first()
        if db_semester:
            self.session.delete(db_semester)
            self.session.commit()
            return True
        else:
            return False
