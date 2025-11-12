from django.conf import settings
from django.db import models


class LearningGoal(models.Model):
    """Persistent record for dashboard learning goals."""

    class ResourceType(models.TextChoices):
        VIDEO = "video", "Video"
        COURSE = "course", "Course"
        ARTICLE = "article", "Article"
        OTHER = "other", "Other"

    class Status(models.TextChoices):
        STARTED = "started", "Started"
        IN_PROGRESS = "in_progress", "In Progress"
        COMPLETED = "completed", "Completed"

    skill_name = models.CharField(max_length=150)
    resource_type = models.CharField(
        max_length=20,
        choices=ResourceType.choices,
        default=ResourceType.VIDEO,
    )
    platform = models.CharField(max_length=100, blank=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.STARTED,
    )
    hours_spent = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    difficulty_rating = models.PositiveSmallIntegerField(default=3)
    notes = models.TextField(blank=True)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="learning_goals",
        blank=True,
        null=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return f"{self.skill_name} ({self.platform or 'Unknown platform'})"


class CourseResource(models.Model):
    """Imported course metadata fetched from external URLs."""

    url = models.URLField(unique=True)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    provider = models.CharField(max_length=150, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return self.title or self.url


class LearningActivity(models.Model):
    """Timeline events representing progress on a learning goal."""

    goal = models.ForeignKey(
        LearningGoal,
        related_name="activities",
        on_delete=models.CASCADE,
    )
    performed_on = models.DateField()
    hours_spent = models.DecimalField(max_digits=5, decimal_places=2)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-performed_on", "-created_at")

    def __str__(self) -> str:
        return f"{self.goal.skill_name} on {self.performed_on}"
