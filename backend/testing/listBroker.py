import unittest

from app.data.brokers import ListBroker
from app.data.storage import ListStorage
from app.schemas import Course


class ListBrokerTester(unittest.TestCase):
    def test_find_course_by_id(self):
        courses = [
            Course(cid="L.001.00001", name="Test1"),
            Course(cid="L.001.00002", name="Test2"),
            Course(cid="L.001.00003", name="Test3")
        ]
        storage = ListStorage(courses)
        list_broker = ListBroker(storage)
        self.assertEqual(courses[0], list_broker.find_course_by_id("L.001.00001"))
        self.assertEqual(courses[1], list_broker.find_course_by_id("L.001.00002"))
        self.assertEqual(courses[2], list_broker.find_course_by_id("L.001.00003"))

    def test_find_course_by_id_not_contained(self):
        courses = [
            Course(cid="L.001.00001", name="Test1"),
        ]
        storage = ListStorage(courses)
        list_broker = ListBroker(storage)
        self.assertEqual(None, list_broker.find_course_by_id("L.001.00005"))

    def test_find_course_by_name(self):
        courses = [
            Course(cid="L.001.00001", name="Test1"),
            Course(cid="L.001.00002", name="Test2"),
            Course(cid="L.001.00003", name="Test3")
        ]
        storage = ListStorage(courses)
        list_broker = ListBroker(storage)
        self.assertEqual(courses[0], list_broker.find_course_by_name("Test1"))
        self.assertEqual(courses[1], list_broker.find_course_by_name("Test2"))
        self.assertEqual(courses[2], list_broker.find_course_by_name("Test3"))

    def test_find_course_by_name_not_contained(self):
        courses = [
            Course(cid="L.001.00001", name="Test1"),
        ]
        storage = ListStorage(courses)
        list_broker = ListBroker(storage)
        self.assertEqual(None, list_broker.find_course_by_name("Test5"))

    def test_get_data(self):
        courses = [
            Course(cid="L.001.00001", name="Test1"),
        ]
        storage = ListStorage(courses)
        list_broker = ListBroker(storage)
        self.assertEqual(storage.get_data(), list_broker.get_courses())


if __name__ == '__main__':
    unittest.main()
