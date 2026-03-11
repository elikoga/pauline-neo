import json
import os
from json import JSONDecodeError

from typing import List

from app import schemas
from app.data.storage.list import ListStorage


class PlainJSONStorage(ListStorage):
    __file_path = os.path.abspath("data/plain_data.json")
    __data: List[schemas.Semester] = None
    __initialized: bool = False

    def get_data(self):
        if not self.__initialized:
            self.init_data()
        return self.__data

    def init_data(self):
        try:
            with open(self.__file_path, 'r') as file:
                data = json.load(file)
        except FileNotFoundError as e:
            raise FileNotFoundError("JSON storage file not found")
        except JSONDecodeError as e:
            raise JSONDecodeError("JSON-file is not valid", e.doc, e.pos)

        cl = schemas.SemesterList(__root__=data)

        self.__data = cl.__root__
        self.__initialized = True

    def check_file_exists(self):
        return os.path.isfile(self.__file_path)

    @staticmethod
    def save_data(semesters: List[schemas.Semester]):
        if not os.path.isdir("data"):
            os.mkdir("data")
        with open(PlainJSONStorage.__file_path, 'w') as file:
            file.write(schemas.SemesterList(__root__=semesters).json())


plain_json_storage = PlainJSONStorage()
