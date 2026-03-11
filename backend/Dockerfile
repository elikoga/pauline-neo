FROM python:3.9

WORKDIR /backend

COPY poetry.lock /backend
COPY pyproject.toml /backend
COPY app /backend/app
COPY alembic /backend/alembic
COPY alembic.ini /backend

RUN pip3 install --upgrade pip
RUN pip3 install poetry

RUN poetry config virtualenvs.create false

RUN poetry install --no-dev

RUN pip install uvicorn

CMD ["uvicorn", "app.api:app", "--host", "0.0.0.0"]
