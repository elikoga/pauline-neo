from fastapi import Depends

from app.data.brokers import ListBroker, DatabaseBroker
from app.data.storage import PlainJSONStorage
from app.database import get_session


def get_plain_json_storage() -> PlainJSONStorage:
    pjs = PlainJSONStorage()
    pjs.init_data()
    return pjs


def get_list_broker(pjs: PlainJSONStorage = Depends(get_plain_json_storage)) -> ListBroker:
    return ListBroker(pjs)


def get_database_broker(session=Depends(get_session)) -> DatabaseBroker:
    return DatabaseBroker(session)
