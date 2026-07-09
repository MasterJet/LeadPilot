from celery import Celery
from .config import settings

celery = Celery(
    "tasks",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=[
        "tasks.scraper_tasks",
        "tasks.analyzer_tasks",
        "tasks.scoring_tasks"
    ]
)

celery.conf.task_routes = {
    "tasks.scraper.*": {"queue": "scraper"},
    "tasks.analyzer.*": {"queue": "analyzer"},
}

celery.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)
