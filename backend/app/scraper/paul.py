import asyncio
import datetime
from typing import List, Dict, Tuple

import aiohttp
import bs4
import chardet
import requests
from bs4 import BeautifulSoup
from tqdm import tqdm

from app import schemas


async def get(url, session):
    async with session.get(url=url) as response:
        return (await response.read()).decode("utf-8").replace("\xa0", " "), url


async def __find_courses(links: List[str], depth):
    urls = ['https://paul.uni-paderborn.de' + link for link in links]
    course_links = []

    async with aiohttp.ClientSession() as session:
        ret = await asyncio.gather(*[get(url, session) for url in urls])

    for html, url in tqdm(ret, disable=depth != 1):
        soup = BeautifulSoup(html, 'html.parser')

        registration_links = soup.find(id="auditRegistration_list")
        if registration_links:
            found_registration_links = [link.attrs['href'] for link in registration_links.find_all('a')]
            course_links.extend(await __find_courses(found_registration_links, depth + 1))

        table = soup.find('table', attrs={'class': 'nb eventTable'})
        if not table and 'COURSEOFFERINGCLUSTER' in url:
            table = soup.find('ul', attrs={'class': 'dl-ul-listview'})

        if table:
            for link in table.find_all('a'):
                if 'COURSEOFFERINGCLUSTER' in link.attrs['href']:
                    course_links.extend(await __find_courses([link.attrs['href']], depth + 1))
                elif 'COURSEDETAILS' in link.attrs['href']:
                    course_links.append(link.attrs['href'])

    return course_links


def __parse_appointment(soup: BeautifulSoup) -> List[schemas.Appointment]:
    appointments: List[schemas.Appointment] = []

    tables: List[bs4.element.Tag] = soup.find_all('table')
    for table in tables:
        caption = table.find('caption')
        if caption and caption.text == 'Termine':
            rows: List[bs4.element.Tag] = table.find_all('tr')

            for row in rows[1:]:
                columns = [column.text.strip() for column in row.find_all('td')]

                if len(columns) != 6:
                    continue

                # check if the date is a reference to a course appointment
                # course appointments are marked with a '*'
                if '*' in columns[1]:
                    continue

                appointments.append(schemas.Appointment(
                    start_time=parse_date(columns[1], columns[2]),
                    end_time=parse_date(columns[1], columns[3]),
                    room=' '.join(columns[4].split()),
                    instructors=columns[5]
                ))

    return appointments


async def __parse_small_groups(soup: BeautifulSoup) -> List[schemas.SmallGroup]:
    small_groups: List[schemas.SmallGroup] = []

    tables: List[bs4.element.Tag] = soup.find_all('div', attrs={'class': 'tb'})
    for table in tables:
        caption = table.find('div', attrs={'class': 'tbhead'})
        if caption and caption.text == 'Kleingruppe(n)':
            urls: List[str] = ['https://paul.uni-paderborn.de' + link.attrs['href'] for link in table.find_all('a')]
            async with aiohttp.ClientSession() as session:
                ret = await asyncio.gather(*[get(url, session) for url in urls])

            for html, url in ret:
                soup = BeautifulSoup(html, 'html.parser')
                title = soup.find('form', attrs={'name': 'courseform'}).find('h2').text.strip()

                small_groups.append(schemas.SmallGroup(
                    name=title.replace('Kleingruppe: ', ''),
                    appointments=__parse_appointment(soup)
                ))

    return small_groups


async def parse_courses(links: List[str]) -> List[schemas.Course]:
    urls = ['https://paul.uni-paderborn.de' + link for link in links]
    parsed_courses: List[schemas.Course] = []

    async with aiohttp.ClientSession() as session:
        ret = await asyncio.gather(*[get(url, session) for url in urls])

    for html, url in tqdm(ret):
        soup = BeautifulSoup(html, 'html.parser')
        title = soup.find('form', attrs={'name': 'courseform'}).find('h1').text.strip()
        split_title = title.splitlines()

        instructors_entry = None
        instructors_element = soup.find('span', attrs={'id': 'dozenten'})
        if instructors_element:
            instructors_entry = instructors_element.text.strip()

        ou_entry = soup.find('span', attrs={'name': 'courseOrgUnit'}).text.strip()

        parsed_courses.append(schemas.Course(
            cid=split_title[0],
            name=split_title[1],
            instructors=instructors_entry,
            ou=ou_entry,
            appointments=__parse_appointment(soup),
            small_groups=await __parse_small_groups(soup)
        ))

    return parsed_courses


def parse_date(date_str: str, time: str) -> datetime.datetime:
    """
    Converts a date_str matching '%a, %d. %b. %Y'
    :param date_str: date_str matching '%a, %d. %b. %Y'
    :param time: time matching (24h) %H:%M
    :return: datetime
    """

    month_dict = {
        'Jan': 1, 'Feb': 2, 'Mrz': 3, 'Mär': 3, 'Apr': 4, 'Mai': 5, 'Jun': 6, 'Jul': 7, 'Aug': 8, 'Sep': 9, 'Okt': 10,
        'Nov': 11, 'Dez': 12
    }

    split_date = date_str.strip().split(" ")
    day = int(split_date[1].replace(".", ""))
    month = month_dict[split_date[2].replace(".", "")]
    year = int(split_date[3])

    if time == '24:00':
        time = '23:59'
    split_time = time.split(":")
    hour = int(split_time[0])
    minute = int(split_time[1])

    return datetime.datetime(day=day, month=month, year=year, hour=hour, minute=minute)


def parse_semesters(course_catalogue_url: str) -> Dict[str, str]:
    """
    Parses PAUL-url of semester links
    :param course_catalogue_url: URL of PAUL's course catalouge
    :return: dict with semesters as keys and links as values
    """
    r = requests.get(course_catalogue_url)
    soup = BeautifulSoup(r.content.decode("utf-8"), 'html.parser')

    semester_links: List[bs4.element.Tag] = soup.find_all('a')
    semesters = {}
    for semester_link in semester_links:
        if 'Sommer' in semester_link.text or 'Winter' in semester_link.text:
            semesters[semester_link.text] = \
                semester_link.attrs['href']

    return semesters


async def scrape_newest_semester(course_catalogue_url: str) -> schemas.Semester:
    semesters = parse_semesters(course_catalogue_url)
    newest_semester = list(semesters.keys())[0]
    newest_course_entry = semesters[newest_semester]
    course_links = await __find_courses([newest_course_entry], 0)
    courses = await parse_courses(course_links)
    return schemas.Semester(name=newest_semester, courses=__deduplicate(courses))


async def scrape_specific_semester(course_catalogue_url: str, semester_name: str) -> schemas.Semester:
    semesters = parse_semesters(course_catalogue_url)
    course_entry = semesters.get(semester_name)
    course_links = await __find_courses([course_entry], 0)
    courses = await parse_courses(course_links)
    return schemas.Semester(name=semester_name, courses=__deduplicate(courses))


def parse_courses_on_site(site_path: str) -> List[Tuple[str, str]]:
    r = requests.get("https://paul.uni-paderborn.de" + site_path)
    soup = BeautifulSoup(r.content.decode("utf-8"), 'html.parser')

    try:
        registration_links: bs4.element.Tag = soup.find(id="auditRegistration_list")
    except AttributeError as e:
        return []

    if registration_links:
        return [(rl.text, rl.attrs['href']) for rl
                in
                registration_links.find_all('a')]
    else:
        return []


async def find_and_parse_courses(site_path: str):
    course_links = await __find_courses([site_path], 0)
    courses = await parse_courses(course_links)
    return __deduplicate(courses)


def __deduplicate(courses: List[schemas.Course]):
    d = {}
    for c in courses:
        d[c.cid] = c
    return list(d.values())
