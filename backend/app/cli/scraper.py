import asyncio

import typer

from app import scraper, schemas
from app.data.storage import PlainJSONStorage
from app.scraper import scrape_newest_semester, scrape_specific_semester

scraper_command = typer.Typer()


@scraper_command.command("json", help="Parse the newest semester and save it to a JSON file.")
def json(file: str = typer.Option("scrape.json", help="File name"),
         name: str = typer.Option(None, help="Name of the semester")):
    """
    Scrape newest semester and save as JSON.
    :return:
    """
    url = "https://paul.uni-paderborn.de" \
          "/scripts/mgrqispi.dll?APPNAME=CampusNet&PRGNAME=EXTERNALPAGES&ARGUMENTS=-N000000000000001,-N000442,-Avvz"
    if name:
        s = asyncio.run(scrape_specific_semester(url, name))
    else:
        s = asyncio.run(scrape_newest_semester(url))

    with open(file, "w") as f:
        f.write(s.json())


@scraper_command.command()
def catalogue(
        site_path: str = "/scripts"
                   "/mgrqispi.dll?APPNAME=CampusNet&PRGNAME=ACTION&ARGUMENTS=-Aw4X-HTjVOMBlmBSUTe9-qpm-CTFZM5L4VFRII~T"
                   "VpBwL-Ksp5ziG76TDT76rB~ohmwaUjm4E~Xsti0bQpGf6z4TrJzvIRZLLjXsR1zg1J34q6K3YuQE9~0HRkF1dE2758ES3GPq6F"
                   "hHezpty9X~is7wsOr5RJg4t-Sh2mKAKrXtzVq2FCTQiUvvlig__",
        verbose: bool = typer.Option(False, "--verbose", "-v")):
    typer.echo(f"Parsing on {site_path}")
    data = asyncio.run(scraper.find_and_parse_courses(site_path))
    if verbose:
        print(data)

    PlainJSONStorage.save_data(data)
    print("Saved to plain JSON storage.")


@scraper_command.command()
def courses(url: str = None, interactive: bool = typer.Option(True, "--no-interactive"),
            verbose: bool = typer.Option(False, "--verbose", "-v")):
    if not url:
        scrape_result = scraper.parse_semesters("https://paul.uni-paderborn.de/scripts"
                                                 "/mgrqispi.dll?APPNAME=CampusNet&PRGNAME=EXTERNALPAGES"
                                                 "&ARGUMENTS=-N000000000000001,-N000442,-Avvz")
        semester_name = list(scrape_result.keys())[0]
        site_path = scrape_result[semester_name]
    else:
        site_path = url.replace("https://paul.uni-paderborn.de", "")
        semester_name = "Custom"

    course_list = scraper.parse_courses_on_site(site_path)
    if interactive:
        user_input = "1"
        while user_input and course_list:
            for index, c in enumerate(course_list):
                print(index + 1, c[0])
            print("Which subdirectory should be viewed? Enter nothing for parsing courses: ", end="")

            valid_input = False
            while not valid_input:
                user_input = input()
                if not user_input:
                    break
                elif not user_input.isnumeric() or int(user_input) < 1 or int(user_input) > len(course_list):
                    print("Invalid number! Select a value between 1 and", len(course_list), ": ", end="")
                else:
                    valid_input = True
                    site_path = course_list[int(user_input) - 1][1]
                    course_list = scraper.parse_courses_on_site(course_list[int(user_input) - 1][1])

    print("Parsing..")
    data = asyncio.run(scraper.find_and_parse_courses(site_path))
    if verbose:
        print(data)

    PlainJSONStorage.save_data([schemas.Semester(name=semester_name, courses=data)])
    print("Saved to plain JSON storage.")
