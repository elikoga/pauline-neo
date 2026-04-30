from fastapi import APIRouter

from app.routes.api_v1.endpoints import courses, semesters, admin, accounts, calendar, preferences

api_router = APIRouter()
api_router.include_router(courses.router, prefix="/courses", tags=["courses"])
api_router.include_router(semesters.router, prefix="/semesters", tags=["semesters"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
api_router.include_router(accounts.router, prefix="/accounts", tags=["accounts"])
api_router.include_router(calendar.router, prefix="/calendar", tags=["calendar"])
api_router.include_router(preferences.router, prefix="/preferences", tags=["preferences"])
