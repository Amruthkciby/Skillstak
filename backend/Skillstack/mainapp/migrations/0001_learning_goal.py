from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="LearningGoal",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("skill_name", models.CharField(max_length=150)),
                (
                    "resource_type",
                    models.CharField(
                        choices=[
                            ("video", "Video"),
                            ("course", "Course"),
                            ("article", "Article"),
                            ("other", "Other"),
                        ],
                        default="video",
                        max_length=20,
                    ),
                ),
                ("platform", models.CharField(blank=True, max_length=100)),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("started", "Started"),
                            ("in_progress", "In Progress"),
                            ("completed", "Completed"),
                        ],
                        default="started",
                        max_length=20,
                    ),
                ),
                ("hours_spent", models.DecimalField(decimal_places=2, default=0, max_digits=6)),
                ("difficulty_rating", models.PositiveSmallIntegerField(default=3)),
                ("notes", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
        ),
    ]
