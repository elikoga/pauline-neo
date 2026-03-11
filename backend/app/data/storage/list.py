from typing import List

from app import schemas


class ListStorage:
    __data: List[schemas.Semester] = None

    def __init__(self, data: List[schemas.Semester] = None):
        self.__data = data

    def get_data(self) -> List[schemas.Semester]:
        return self.__data
