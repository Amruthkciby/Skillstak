from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .models import CourseResource, LearningActivity, LearningGoal


class RegisterSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    confirm_password = serializers.CharField(write_only=True)

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("Username already taken.")
        return value

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Email already registered.")
        return value

    def validate(self, data):
        if data["password"] != data["confirm_password"]:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
        validate_password(data["password"])
        return data

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data["username"],
            email=validated_data["email"],
            password=validated_data["password"],
        )
        return user


class LearningGoalSerializer(serializers.ModelSerializer):
    class Meta:
        model = LearningGoal
        fields = [
            "id",
            "skill_name",
            "resource_type",
            "platform",
            "status",
            "hours_spent",
            "difficulty_rating",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_hours_spent(self, value):
        if value < 0:
            raise serializers.ValidationError("Hours spent must be zero or greater.")
        return value

    def validate_difficulty_rating(self, value):
        if not 1 <= value <= 5:
            raise serializers.ValidationError("Difficulty rating must be between 1 and 5.")
        return value


class CourseImportSerializer(serializers.Serializer):
    url = serializers.URLField()


class CourseResourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = CourseResource
        fields = [
            "id",
            "url",
            "title",
            "description",
            "provider",
            "metadata",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class LearningActivitySerializer(serializers.ModelSerializer):
    goal_details = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = LearningActivity
        fields = [
            "id",
            "goal",
            "goal_details",
            "performed_on",
            "hours_spent",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "goal_details", "created_at", "updated_at"]

    def validate_hours_spent(self, value):
        if value < 0:
            raise serializers.ValidationError("Hours must be zero or greater.")
        if value > 500:
            raise serializers.ValidationError("Hours value is unrealistically high.")
        return value

    def get_goal_details(self, obj):
        goal = obj.goal
        return {
            "id": goal.id,
            "skill_name": goal.skill_name,
            "status": goal.status,
            "platform": goal.platform,
        }
