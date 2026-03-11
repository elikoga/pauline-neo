import typer

from app.data.brokers import ListBroker
from app.data.storage import PlainJSONStorage

courses_command = typer.Typer()


@courses_command.command()
def find(semester: str, name: str):
    pjs = PlainJSONStorage()
    pjs.init_data()
    broker = ListBroker(pjs)
    courses = broker.find_courses_by_name(semester, name)

    for c in courses:
        print("--------------")
        print("name:", c.name)
        print("id:", c.cid)
    print("--------------")
