import unittest
import datetime

from app.scraper.paul import parse_date


class DateTest(unittest.TestCase):
    def test_date(self):
        date = parse_date("Do, 12. Aug. 2021", "09:00")
        self.assertEqual(date, datetime.datetime(day=12, month=8, year=2021, hour=9, minute=0))

    def test_date_24Uhr(self):
        date = parse_date("Do, 12. Aug. 2021", "24:00")
        self.assertEqual(date, datetime.datetime(day=12, month=8, year=2021, hour=23, minute=59))

    def test_months(self):
        months = {
            'Jan': 1, 'Feb': 2, 'Mrz': 3, 'Mär': 3, 'Apr': 4, 'Mai': 5, 'Jun': 6, 'Jul': 7, 'Aug': 8,
            'Sep': 9, 'Okt': 10, 'Nov': 11, 'Dez': 12
        }
        for month, month_index in months.items():
            date = parse_date("Mo, 12. {}. 2021".format(month), "11:00")
            self.assertEqual(date, datetime.datetime(day=12, month=month_index, year=2021, hour=11, minute=00))


if __name__ == '__main__':
    unittest.main()
