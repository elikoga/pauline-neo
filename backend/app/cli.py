import typer
import sys
sys.path.append('./')

from app import cli

app = typer.Typer()

app.add_typer(cli.courses_command, name="courses")

if __name__ == "__main__":
    app()
