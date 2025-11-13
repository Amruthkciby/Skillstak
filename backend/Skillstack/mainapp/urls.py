from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .views import (
    CourseImportView,
    LearningActivityViewSet,
    LearningGoalViewSet,
    NoteSummarizationView,
    ProfileView,
    RegisterView,
    ResourceRecommendationView,
    WeeklySummaryView,
    hello_api,
)

router = DefaultRouter()
router.register(r'learning-goals', LearningGoalViewSet, basename='learning-goal')
router.register(r'learning-activities', LearningActivityViewSet, basename='learning-activity')

urlpatterns = [
    path('hello/', hello_api, name='hello_api'),
    path('register/', RegisterView.as_view(), name='register'),
    path('profile/', ProfileView.as_view(), name='profile'),
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('course-import/', CourseImportView.as_view(), name='course_import'),
    path('learning-summary/send-weekly/', WeeklySummaryView.as_view(), name='weekly_summary'),
    path('ai/resource-recommendations/', ResourceRecommendationView.as_view(), name='resource_recommendations'),
    path('ai/note-summarization/', NoteSummarizationView.as_view(), name='note_summarization'),
    path('', include(router.urls)),
]
