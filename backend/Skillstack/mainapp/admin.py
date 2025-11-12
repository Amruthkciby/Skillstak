from django.contrib import admin

from .models import CourseResource, LearningActivity, LearningGoal


@admin.register(LearningGoal)
class LearningGoalAdmin(admin.ModelAdmin):
    list_display = (
        "skill_name",
        "platform",
        "resource_type",
        "status",
        "hours_spent",
        "difficulty_rating",
        "created_at",
    )
    list_filter = ("resource_type", "platform", "status", "difficulty_rating")
    search_fields = ("skill_name", "platform", "notes")


@admin.register(CourseResource)
class CourseResourceAdmin(admin.ModelAdmin):
    list_display = ("title", "provider", "url", "created_at")
    search_fields = ("title", "provider", "url")
    list_filter = ("provider",)


@admin.register(LearningActivity)
class LearningActivityAdmin(admin.ModelAdmin):
    list_display = ("goal", "performed_on", "hours_spent", "created_at")
    search_fields = ("goal__skill_name", "notes")
    list_filter = ("performed_on",)
