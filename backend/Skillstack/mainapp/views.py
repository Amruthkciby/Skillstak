import logging
from datetime import timedelta
from urllib.parse import urlparse

import requests
from bs4 import BeautifulSoup
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import api_view
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import CourseResource, LearningActivity, LearningGoal
from .serializers import (
    CourseImportSerializer,
    CourseResourceSerializer,
    LearningActivitySerializer,
    LearningGoalSerializer,
    RegisterSerializer,
)

logger = logging.getLogger(__name__)


@api_view(["GET"])
def hello_api(request):
    data = {
        "message": "Hello from Django REST API 👋",
        "status": "success",
    }
    return Response(data)


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({"message": "User created successfully."}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LearningGoalViewSet(viewsets.ModelViewSet):
    """
    CRUD endpoints for the dashboard learning goals.
    """

    serializer_class = LearningGoalSerializer
    queryset = LearningGoal.objects.all().order_by("-created_at")
    permission_classes = [AllowAny]


def _scrape_course_metadata(url: str) -> dict:
    """Attempt to pull metadata from a course URL."""
    metadata = {
        "title": "",
        "description": "",
        "provider": "",
        "metadata": {},
    }

    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
    except Exception as exc:  # pragma: no cover - best effort
        logger.warning("Failed to fetch course url %s: %s", url, exc)
        metadata["title"] = url
        metadata["description"] = "Unable to fetch course details automatically."
        parsed = urlparse(url)
        metadata["provider"] = parsed.netloc.replace("www.", "")
        return metadata

    soup = BeautifulSoup(response.text, "html.parser")

    title = soup.find("meta", property="og:title")
    if title and title.get("content"):
        metadata["title"] = title["content"]
    elif soup.title:
        metadata["title"] = soup.title.string.strip()
    else:
        metadata["title"] = url

    description = soup.find("meta", property="og:description") or soup.find("meta", attrs={"name": "description"})
    if description and description.get("content"):
        metadata["description"] = description["content"].strip()

    parsed = urlparse(url)
    metadata["provider"] = parsed.netloc.replace("www.", "") if parsed.netloc else ""

    metadata["metadata"] = {
        "fetched_at": timezone.now().isoformat(),
        "content_type": response.headers.get("Content-Type"),
    }
    return metadata


class CourseImportView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = CourseImportSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        url = serializer.validated_data["url"]

        metadata = _scrape_course_metadata(url)
        course, created = CourseResource.objects.update_or_create(
            url=url,
            defaults=metadata,
        )
        output = CourseResourceSerializer(course)
        status_code = status.HTTP_201_CREATED if created else status.HTTP_200_OK
        logger.info("Imported course %s (created=%s)", url, created)
        return Response(output.data, status=status_code)


class LearningActivityViewSet(viewsets.ModelViewSet):
    serializer_class = LearningActivitySerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        queryset = LearningActivity.objects.select_related("goal").all()
        goal_id = self.request.query_params.get("goal")
        if goal_id:
            queryset = queryset.filter(goal_id=goal_id)
        return queryset.order_by("-performed_on", "-created_at")


class WeeklySummaryView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        now = timezone.now()
        start = now - timedelta(days=7)

        recent_goals = LearningGoal.objects.filter(updated_at__gte=start)
        recent_activities = LearningActivity.objects.filter(performed_on__gte=start.date())

        summary = {
            "generated_at": now.isoformat(),
            "goals_updated": recent_goals.count(),
            "activities_logged": recent_activities.count(),
            "hours_logged": float(sum(activity.hours_spent for activity in recent_activities)),
            "recent_goals": [
                {
                    "skill_name": goal.skill_name,
                    "status": goal.status,
                    "platform": goal.platform,
                }
                for goal in recent_goals[:10]
            ],
        }

        logger.info("Weekly learning summary: %s", summary)
        print("Weekly learning summary (mock email):", summary)  # noqa: T201

        return Response(summary, status=status.HTTP_200_OK)