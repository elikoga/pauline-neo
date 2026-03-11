from typing import List

from app import schemas


class Broker:

    def find_course_by_id(self, semester_id: int, course_id: str) -> schemas.Course:
        pass

    def find_course_by_name(self, semester_id: int, course_name: str) -> schemas.Course:
        pass

    def find_courses_by_name(self, semester_id: int, course_name: str) -> List[schemas.Course]:
        pass

    def get_courses(self, semester_id: int) -> List[schemas.Course]:
        pass

    def get_semesters(self) -> List[schemas.SemesterWithoutCourses]:
        pass
