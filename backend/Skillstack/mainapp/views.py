import logging
from datetime import timedelta
from urllib.parse import urlparse

import requests
from bs4 import BeautifulSoup
from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import api_view
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import AllowAny, IsAuthenticated
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


class ProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        return Response(
            {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
            }
        )


class LearningGoalViewSet(viewsets.ModelViewSet):
    """
    CRUD endpoints for the dashboard learning goals.
    """

    serializer_class = LearningGoalSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return LearningGoal.objects.filter(owner=self.request.user).order_by("-created_at")

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    def perform_update(self, serializer):
        if serializer.instance.owner_id != self.request.user.id:
            raise PermissionDenied("You do not have permission to update this goal.")
        serializer.save(owner=self.request.user)

    def perform_destroy(self, instance):
        if instance.owner_id != self.request.user.id:
            raise PermissionDenied("You do not have permission to delete this goal.")
        instance.delete()


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
    permission_classes = [IsAuthenticated]

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
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = LearningActivity.objects.select_related("goal", "goal__owner").filter(
            goal__owner=self.request.user
        )
        goal_id = self.request.query_params.get("goal")
        if goal_id:
            queryset = queryset.filter(goal_id=goal_id)
        return queryset.order_by("-performed_on", "-created_at")

    def perform_create(self, serializer):
        goal = serializer.validated_data.get("goal")
        if goal.owner_id != self.request.user.id:
            raise PermissionDenied("You do not have permission to log activity for this goal.")
        serializer.save()

    def perform_update(self, serializer):
        instance = serializer.instance
        if instance.goal.owner_id != self.request.user.id:
            raise PermissionDenied("You do not have permission to update this activity.")
        goal = serializer.validated_data.get("goal", instance.goal)
        if goal.owner_id != self.request.user.id:
            raise PermissionDenied("You do not have permission to assign this goal.")
        serializer.save()

    def perform_destroy(self, instance):
        if instance.goal.owner_id != self.request.user.id:
            raise PermissionDenied("You do not have permission to delete this activity.")
        instance.delete()


class WeeklySummaryView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        now = timezone.now()
        start = now - timedelta(days=7)

        recent_goals = LearningGoal.objects.filter(updated_at__gte=start, owner=request.user)
        recent_activities = LearningActivity.objects.filter(
            performed_on__gte=start.date(), goal__owner=request.user
        )

        target_email = request.user.email or ''
        send_email_raw = request.data.get("send_email", False)
        if isinstance(send_email_raw, bool):
            send_email_flag = send_email_raw
        elif isinstance(send_email_raw, str):
            send_email_flag = send_email_raw.lower() in {"1", "true", "yes", "on"}
        elif isinstance(send_email_raw, int):
            send_email_flag = send_email_raw == 1
        else:
            send_email_flag = False

        summary = {
            "generated_at": now.isoformat(),
            "goals_updated": recent_goals.count(),
            "activities_logged": recent_activities.count(),
            "hours_logged": float(sum(activity.hours_spent for activity in recent_activities)),
            "sent_to": target_email or "not-configured",
            "email_requested": send_email_flag,
            "recent_goals": [
                {
                    "skill_name": goal.skill_name,
                    "status": goal.status,
                    "platform": goal.platform,
                }
                for goal in recent_goals[:10]
            ],
        }

        if send_email_flag and target_email:
            subject = "Skillstack Weekly Learning Summary"
            body_lines = [
                f"Hi {request.user.username or 'there'},",
                "",
                "Here is your Skillstack summary for the last 7 days:",
                f"- Goals updated: {summary['goals_updated']}",
                f"- Activities logged: {summary['activities_logged']}",
                f"- Total hours logged: {summary['hours_logged']}h",
            ]
            if summary["recent_goals"]:
                body_lines.append("")
                body_lines.append("Recent updates:")
                for goal in summary["recent_goals"]:
                    platform = f" on {goal['platform']}" if goal["platform"] else ""
                    body_lines.append(f"• {goal['skill_name']} — {goal['status']}{platform}")
            body_lines.extend(
                [
                    "",
                    "Keep learning!",
                    "— Skillstack",
                ]
            )
            email_body = "\n".join(body_lines)

            try:
                send_mail(
                    subject=subject,
                    message=email_body,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[target_email],
                    fail_silently=False,
                )
                logger.info("Weekly summary email sent to %s", target_email)
            except Exception as exc:  # pragma: no cover
                logger.exception("Failed to send weekly summary email to %s: %s", target_email, exc)
        elif send_email_flag:
            logger.warning("Weekly summary email skipped: user %s has no email.", request.user.id)

        logger.info("Weekly learning summary payload: %s", summary)

        return Response(summary, status=status.HTTP_200_OK)