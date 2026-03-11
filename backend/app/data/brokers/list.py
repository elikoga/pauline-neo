from typing import List

from app import schemas
from app.data.brokers.broker import Broker
from app.data.storage import ListStorage


class ListBroker(Broker):
    __courses: List[schemas.Semester] = []

    def __init__(self, list_storage: ListStorage):
        self.__storage = list_storage.get_data()

    def find_course_by_id(self, semester_name: str, course_id: str) -> schemas.Course:
        for course in self.__storage:
            if course.cid == course_id:
                return course
        else:
            return None

    def find_course_by_name(self, semester_name: str, course_name: str) -> schemas.Course:
        for semester in self.__storage:
            for course in semester.courses:
                if course.name == course_name and semester.name == semester_name:
                    return course
        else:
            return None

    def find_courses_by_name(self, semester_name: str, course_name: str) -> List[schemas.Course]:
        courses = []
        for semester in self.__storage:
            for course in semester.courses:
                if course_name.lower() in course.name.lower() and semester.name == semester_name:
                    courses.append(course)

        return courses

    def get_courses(self, semester_name: str) -> List[schemas.Course]:
        for semester in self.__storage:
            if semester.name == semester_name:
                return semester.courses
