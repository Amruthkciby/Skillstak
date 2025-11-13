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
        
        activity = serializer.save()
        
        # Append activity notes to goal notes if activity has notes
        if activity.notes.strip():
            from datetime import datetime
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")
            new_entry = f"[{timestamp}] {activity.notes}"
            
            if goal.notes.strip():
                goal.notes = f"{goal.notes}\n\n{new_entry}"
            else:
                goal.notes = new_entry
            
            goal.save(update_fields=['notes', 'updated_at'])

    def perform_update(self, serializer):
        instance = serializer.instance
        if instance.goal.owner_id != self.request.user.id:
            raise PermissionDenied("You do not have permission to update this activity.")
        goal = serializer.validated_data.get("goal", instance.goal)
        if goal.owner_id != self.request.user.id:
            raise PermissionDenied("You do not have permission to assign this goal.")
        
        # Check if notes were updated
        old_notes = instance.notes
        new_notes = serializer.validated_data.get("notes", old_notes)
        
        activity = serializer.save()
        
        # If activity notes changed, update goal notes
        if old_notes != new_notes and new_notes.strip():
            from datetime import datetime
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")
            updated_entry = f"[{timestamp}] (updated) {new_notes}"
            
            # Remove old entry if it exists, add new one
            goal = activity.goal
            if goal.notes and old_notes and old_notes in goal.notes:
                goal.notes = goal.notes.replace(old_notes, new_notes)
            elif goal.notes.strip():
                goal.notes = f"{goal.notes}\n\n{updated_entry}"
            else:
                goal.notes = updated_entry
            
            goal.save(update_fields=['notes', 'updated_at'])

    def perform_destroy(self, instance):
        if instance.goal.owner_id != self.request.user.id:
            raise PermissionDenied("You do not have permission to delete this activity.")
        
        goal = instance.goal
        activity_notes = instance.notes
        
        instance.delete()
        
        # Remove activity notes from goal notes if present
        if activity_notes.strip() and goal.notes:
            # Remove entries containing this activity's notes
            lines = goal.notes.split('\n')
            filtered_lines = [line for line in lines if activity_notes not in line]
            goal.notes = '\n'.join(filtered_lines).strip()
            goal.save(update_fields=['notes', 'updated_at'])


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


class ResourceRecommendationView(APIView):
    """
    AI-powered endpoint that analyzes user's learning history and recommends
    resources based on skills, platforms, and completion patterns.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        
        # Get all user's learning goals
        goals = LearningGoal.objects.filter(owner=user).order_by('-created_at')
        activities = LearningActivity.objects.filter(goal__owner=user)
        
        if not goals.exists():
            return Response(
                {
                    "message": "No learning goals found. Start by creating some learning goals!",
                    "recommendations": []
                },
                status=status.HTTP_200_OK
            )
        
        # Analyze patterns
        skill_frequencies = {}
        platform_preferences = {}
        difficulty_levels = {}
        resource_types = {}
        completion_status = {}
        
        for goal in goals:
            # Track skills
            skill = goal.skill_name
            skill_frequencies[skill] = skill_frequencies.get(skill, 0) + 1
            
            # Track platforms
            platform = goal.platform or "Other"
            platform_preferences[platform] = platform_preferences.get(platform, 0) + 1
            
            # Track difficulty
            difficulty = goal.difficulty_rating
            difficulty_levels[difficulty] = difficulty_levels.get(difficulty, 0) + 1
            
            # Track resource types
            res_type = goal.resource_type
            resource_types[res_type] = resource_types.get(res_type, 0) + 1
            
            # Track completion
            status_key = goal.status
            completion_status[status_key] = completion_status.get(status_key, 0) + 1
        
        # Generate recommendations
        recommendations = []
        
        # Recommendation 1: Popular skills
        top_skills = sorted(skill_frequencies.items(), key=lambda x: x[1], reverse=True)[:3]
        if top_skills:
            recommendations.append({
                "type": "popular_skills",
                "title": "Continue Learning Your Top Skills",
                "description": f"You've been focusing on {', '.join([s[0] for s in top_skills])}. Consider deepening your knowledge with advanced courses or specialized projects.",
                "suggested_skills": [s[0] for s in top_skills],
                "icon": "📚",
                "priority": "high"
            })
        
        # Recommendation 2: Platform expertise
        best_platform = max(platform_preferences.items(), key=lambda x: x[1]) if platform_preferences else None
        if best_platform:
            recommendations.append({
                "type": "platform_expertise",
                "title": f"Leverage {best_platform[0]} for Consistency",
                "description": f"You've found success with {best_platform[0]}. Explore more courses from this platform for a consistent learning experience and community support.",
                "preferred_platform": best_platform[0],
                "icon": "⭐",
                "priority": "high"
            })
        
        # Recommendation 3: Difficulty progression
        avg_difficulty = sum(difficulty_levels.keys()) / len(difficulty_levels) if difficulty_levels else 0
        if avg_difficulty < 3:
            recommendations.append({
                "type": "difficulty_progression",
                "title": "Challenge Yourself",
                "description": f"Your average difficulty is {avg_difficulty:.1f}/5. Try intermediate to advanced courses to accelerate growth and build stronger foundations.",
                "suggested_difficulty": "intermediate",
                "current_level": round(avg_difficulty, 1),
                "icon": "🚀",
                "priority": "medium"
            })
        elif avg_difficulty >= 4:
            recommendations.append({
                "type": "difficulty_progression",
                "title": "Master Advanced Topics",
                "description": f"You're tackling challenging topics (avg: {avg_difficulty:.1f}/5). Consider specialized or expert-level resources and hands-on projects.",
                "suggested_difficulty": "advanced",
                "current_level": round(avg_difficulty, 1),
                "icon": "🎓",
                "priority": "medium"
            })
        
        # Recommendation 4: Resource type diversity
        if len(resource_types) < 4:
            missing_types = set(['video', 'course', 'article', 'other']) - set(resource_types.keys())
            if missing_types:
                recommendations.append({
                    "type": "resource_diversity",
                    "title": "Diversify Your Learning Methods",
                    "description": f"You're learning through {len(resource_types)} resource types. Try {', '.join(list(missing_types)[:2])} to suit different learning styles.",
                    "suggested_types": list(missing_types)[:2],
                    "icon": "🎯",
                    "priority": "low"
                })
        
        # Recommendation 5: Completion acceleration
        completion_rate = (completion_status.get('completed', 0) / len(goals) * 100) if goals else 0
        if completion_rate < 50:
            recommendations.append({
                "type": "completion",
                "title": "Accelerate Your Completion Rate",
                "description": f"Only {completion_rate:.0f}% of your goals are completed. Focus on completing 2-3 goals this week to build momentum.",
                "current_completion_rate": round(completion_rate, 1),
                "suggested_action": "Complete 2-3 goals",
                "icon": "⚡",
                "priority": "high"
            })
        
        # Recommendation 6: Consistency boost
        recent_goals = goals.filter(created_at__gte=timezone.now() - timedelta(days=30)).count()
        if recent_goals < 3:
            recommendations.append({
                "type": "consistency",
                "title": "Boost Your Learning Consistency",
                "description": "Set at least 3 new learning goals this month to maintain momentum and track progress effectively.",
                "suggested_goal_count": 3,
                "current_goals_this_month": recent_goals,
                "icon": "📅",
                "priority": "medium"
            })
        
        logger.info("Generated %d recommendations for user %s", len(recommendations), user.id)
        
        return Response(
            {
                "success": True,
                "recommendations": recommendations,
                "analysis": {
                    "total_goals": goals.count(),
                    "total_activities": activities.count(),
                    "unique_skills": len(skill_frequencies),
                    "average_difficulty": round(avg_difficulty, 2),
                    "preferred_platform": best_platform[0] if best_platform else "None",
                    "completion_rate": round(completion_rate, 1),
                    "resource_type_diversity": len(resource_types),
                    "skill_breakdown": skill_frequencies
                }
            },
            status=status.HTTP_200_OK
        )


class NoteSummarizationView(APIView):
    """
    AI-powered endpoint that summarizes learning notes from activities
    and goal notes to create concise key takeaways and important points.
    """
    permission_classes = [IsAuthenticated]

    def _extract_main_and_activity_notes(self, goal_notes):
        """
        Parse goal notes to separate main notes from activity notes.
        Activity notes follow pattern: [YYYY-MM-DD HH:MM] note_text
        """
        if not goal_notes or not goal_notes.strip():
            return "", []
        
        import re
        lines = goal_notes.split('\n')
        main_notes = []
        activity_entries = []
        
        timestamp_pattern = r'^\[\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}\]'
        
        for line in lines:
            if line.strip():
                if re.match(timestamp_pattern, line.strip()):
                    # Activity note with timestamp
                    match = re.search(r'^\[([^\]]+)\]\s*(.*)', line.strip())
                    if match:
                        timestamp = match.group(1)
                        note_text = match.group(2)
                        activity_entries.append({
                            "timestamp": timestamp,
                            "text": note_text
                        })
                else:
                    # Main note
                    main_notes.append(line)
        
        main_notes_text = '\n'.join(main_notes).strip()
        return main_notes_text, activity_entries

    def _generate_concise_summary(self, text, skill_name=""):
        """Generate a short, meaningful summary from notes (2-3 sentences max)."""
        if not text or not text.strip():
            return "No notes available for summarization."
        
        sentences = []
        # Split by periods, exclamation marks, and question marks
        import re
        raw_sentences = re.split(r'[.!?]\s+', text.strip())
        
        # Clean and filter sentences
        for sent in raw_sentences:
            sent = sent.strip()
            if sent and len(sent) > 10:  # Minimum sentence length
                sentences.append(sent)
        
        if not sentences:
            return text[:150] + "..." if len(text) > 150 else text
        
        # Strategy: Select 1-3 most informative sentences
        # Prioritize sentences with action verbs and specific content
        action_verbs = ['learned', 'completed', 'understood', 'mastered', 'implemented', 
                       'fixed', 'solved', 'created', 'built', 'deployed', 'optimized',
                       'discovered', 'integrated', 'configured', 'practiced', 'improved', 'enhanced']
        
        scored_sentences = []
        for sent in sentences:
            score = 0
            sent_lower = sent.lower()
            
            # Boost score if contains action verbs
            for verb in action_verbs:
                if verb in sent_lower:
                    score += 2
            
            # Boost score for sentences with specific terms or numbers
            if any(char.isdigit() for char in sent):
                score += 1
            
            # Boost score for longer sentences (more content)
            score += len(sent.split()) / 10
            
            scored_sentences.append((score, sent))
        
        # Sort by score and take top 2-3 sentences
        sorted_sentences = sorted(scored_sentences, key=lambda x: x[0], reverse=True)
        
        # Take top sentences (max 3, minimum 1)
        num_sentences = min(3, max(1, len(sentences) // 4 + 1))
        top_sentences = sorted_sentences[:num_sentences]
        
        # Sort by original order
        top_sentences_ordered = sorted(
            top_sentences, 
            key=lambda x: sentences.index(x[1])
        )
        
        # Join and create summary
        summary = ". ".join([sent[1] for sent in top_sentences_ordered])
        if not summary.endswith(('.', '!', '?')):
            summary += "."
        
        return summary

    def _analyze_text_content(self, text):
        """Extract themes, concepts, and learning points from text."""
        if not text or not text.strip():
            return {"themes": [], "concepts": [], "sentiment": "neutral"}
        
        text_lower = text.lower()
        
        # Learning concepts based on keywords
        concepts = []
        concept_keywords = {
            "fundamentals": ["basic", "foundation", "concept", "theory", "principle"],
            "practical": ["implement", "build", "create", "code", "practice", "exercise"],
            "problem-solving": ["fix", "debug", "solve", "issue", "error", "bug"],
            "optimization": ["optimize", "improve", "enhance", "performance", "efficiency"],
            "integration": ["integrate", "connect", "link", "API", "database", "external"],
            "testing": ["test", "unit", "integration", "validation", "verify"],
            "deployment": ["deploy", "production", "release", "live", "production"],
        }
        
        for concept, keywords in concept_keywords.items():
            if any(kw in text_lower for kw in keywords):
                concepts.append(concept)
        
        # Extract important phrases (capitalized or quoted)
        important_phrases = []
        words = text.split()
        for i, word in enumerate(words):
            if len(word) > 3 and word[0].isupper():
                important_phrases.append(word.rstrip('.,!?;:'))
        
        return {
            "themes": concepts[:5],
            "key_phrases": list(set(important_phrases))[:5],
            "word_count": len(text.split()),
            "content_length": "comprehensive" if len(text.split()) > 100 else "moderate" if len(text.split()) > 30 else "brief"
        }

    def post(self, request):
        user = request.user
        goal_id = request.data.get("goal_id")
        
        # Get activities for specific goal or all goals
        if goal_id:
            activities = LearningActivity.objects.filter(goal_id=goal_id, goal__owner=user)
            goal = LearningGoal.objects.filter(id=goal_id, owner=user).first()
            if not goal:
                return Response(
                    {"error": "Goal not found or permission denied"},
                    status=status.HTTP_404_NOT_FOUND
                )
        else:
            activities = LearningActivity.objects.filter(goal__owner=user).order_by('-performed_on')
            goal = None
        
        if not activities.exists() and (not goal or not goal.notes):
            return Response(
                {
                    "success": False,
                    "message": "No learning activities or notes found. Start logging activities and adding notes!",
                    "summary": {},
                    "key_points": []
                },
                status=status.HTTP_200_OK
            )
        
        # Aggregate notes with enhanced analysis
        all_notes = []
        date_range = {
            "earliest": None,
            "latest": None,
            "duration_days": 0
        }
        
        for activity in activities:
            if activity.notes:
                all_notes.append({
                    "date": activity.performed_on.isoformat(),
                    "hours": float(activity.hours_spent),
                    "notes": activity.notes,
                    "goal": activity.goal.skill_name,
                    "goal_id": activity.goal.id
                })
            
            # Keep as date objects for comparison
            if not date_range["latest"] or activity.performed_on > date_range["latest"]:
                date_range["latest"] = activity.performed_on
            if not date_range["earliest"] or activity.performed_on < date_range["earliest"]:
                date_range["earliest"] = activity.performed_on
        
        # Calculate duration and convert to ISO format for response
        if date_range["earliest"] and date_range["latest"]:
            date_range["duration_days"] = (date_range["latest"] - date_range["earliest"]).days
            # Convert to ISO format for API response
            date_range["earliest"] = date_range["earliest"].isoformat()
            date_range["latest"] = date_range["latest"].isoformat()
        else:
            # Ensure ISO format if they're still None
            date_range["earliest"] = None
            date_range["latest"] = None
        
        # Parse goal notes if available
        goal_main_notes = ""
        goal_activity_entries = []
        goal_notes_analysis = None
        combined_notes_text = ""
        
        if goal and goal.notes:
            goal_main_notes, goal_activity_entries = self._extract_main_and_activity_notes(goal.notes)
            # Combine main notes with all activity entries for comprehensive analysis
            combined_parts = [goal_main_notes]
            for entry in goal_activity_entries:
                combined_parts.append(entry["text"])
            combined_notes_text = " ".join(combined_parts)
            # Analyze the combined text
            goal_notes_analysis = self._analyze_text_content(combined_notes_text)
        
        # Also combine with activity notes from database for topic extraction
        all_activity_notes_text = " ".join([a["notes"] for a in all_notes])
        combined_all_text = f"{combined_notes_text} {all_activity_notes_text}"
        
        # Create summary based on keywords and patterns from BOTH goal notes and activity notes
        key_points = []
        topics_mentioned = {}
        total_hours = sum(a["hours"] for a in all_notes) if all_notes else 0
        
        # Combine all text sources for comprehensive analysis
        all_text_sources = []
        
        # Add goal main notes and activity entries
        if goal_main_notes:
            all_text_sources.append(goal_main_notes)
        for entry in goal_activity_entries:
            all_text_sources.append(entry["text"])
        # Add all activity notes from database
        for note_item in all_notes:
            all_text_sources.append(note_item["notes"])
        
        combined_text = " ".join(all_text_sources)
        
        # Extract key points from ALL sources with improved logic
        action_keywords = ['learned', 'completed', 'understood', 'mastered', 'implemented', 
                          'fixed', 'solved', 'created', 'built', 'deployed', 'optimized',
                          'discovered', 'integrated', 'configured', 'practiced', 'improved', 'enhanced']
        
        # Extract from goal notes entries
        for entry in goal_activity_entries:
            entry_text = entry["text"].lower()
            for keyword in action_keywords:
                if keyword in entry_text:
                    key_points.append({
                        "date": entry["timestamp"],
                        "content": entry["text"][:150],
                        "hours": 0,
                        "skill": "Goal Context"
                    })
                    break
        
        # Extract from activity notes
        for note_item in all_notes:
            notes_text = note_item["notes"].lower()
            
            # Simple keyword extraction
            for keyword in action_keywords:
                if keyword in notes_text:
                    # Add complete sentence or note
                    key_points.append({
                        "date": note_item["date"],
                        "content": note_item["notes"][:150],
                        "hours": note_item["hours"],
                        "skill": note_item["goal"]
                    })
                    break
            
            # Topic extraction from activity notes
            words = note_item['notes'].split()
            for word in words:
                # Filter meaningful words (length > 4, skip common words)
                if len(word) > 4 and word.lower() not in ['this', 'that', 'with', 'from', 'into', 'have', 'about', 'where', 'which']:
                    clean_word = word.strip('.,!?;:').lower()
                    if clean_word and len(clean_word) > 3:
                        topics_mentioned[clean_word] = topics_mentioned.get(clean_word, 0) + 1
        
        # Also extract topics from goal notes and activity entries
        words_from_combined = combined_text.split()
        for word in words_from_combined:
            if len(word) > 4 and word.lower() not in ['this', 'that', 'with', 'from', 'into', 'have', 'about', 'where', 'which', 'there', 'would', 'could', 'should', 'been', 'more']:
                clean_word = word.strip('.,!?;:').lower()
                if clean_word and len(clean_word) > 3 and not clean_word.endswith('ing'):
                    topics_mentioned[clean_word] = topics_mentioned.get(clean_word, 0) + 1
        
        # Get top topics
        top_topics = sorted(topics_mentioned.items(), key=lambda x: x[1], reverse=True)[:6]
        topics = [t[0] for t in top_topics]
        
        # Skill-specific summaries with comprehensive note analysis
        skill_summaries = {}
        for activity in activities:
            goal_name = activity.goal.skill_name
            if goal_name not in skill_summaries:
                skill_summaries[goal_name] = {
                    "total_hours": 0,
                    "sessions": 0,
                    "key_notes": [],
                    "goal_id": activity.goal.id,
                    "status": activity.goal.status,
                    "main_notes": "",
                    "notes_analysis": None
                }
            skill_summaries[goal_name]["total_hours"] += float(activity.hours_spent)
            skill_summaries[goal_name]["sessions"] += 1
            if activity.notes:
                skill_summaries[goal_name]["key_notes"].append(activity.notes[:80])
            
            # Add comprehensive notes analysis for this goal
            if activity.goal.notes:
                goal_main, goal_activities = self._extract_main_and_activity_notes(activity.goal.notes)
                # Combine main notes with activity entries
                all_goal_notes_parts = [goal_main]
                for gentry in goal_activities:
                    all_goal_notes_parts.append(gentry["text"])
                combined_goal_text = " ".join(all_goal_notes_parts)
                
                if goal_main:
                    skill_summaries[goal_name]["main_notes"] = goal_main[:200]
                # Analyze combined notes
                skill_summaries[goal_name]["notes_analysis"] = self._analyze_text_content(combined_goal_text)
        
        # Generate meaningful summary text
        summary_text = ""
        if goal:
            summary_text = f"Learning Summary for {goal.skill_name}"
        else:
            summary_text = "Overall Learning Summary"
            if len(skill_summaries) > 0:
                top_skill = max(skill_summaries.items(), key=lambda x: x[1]["total_hours"])[0]
                summary_text += f" (Focus: {top_skill})"
        
        # Generate concise summary from combined notes
        concise_summary = self._generate_concise_summary(combined_text, goal.skill_name if goal else "Learning")
        
        # Create AI-powered summary combining all sources
        ai_summary = {
            "title": summary_text,
            "concise_summary": concise_summary,  # Add short 2-3 sentence summary
            "period": date_range,
            "total_hours_spent": round(total_hours, 2),
            "total_sessions": len(all_notes),
            "average_hours_per_session": round(total_hours / len(all_notes), 2) if all_notes else 0,
            "main_topics": topics,
            "key_learnings": key_points[:8],
            "by_skill": skill_summaries if not goal else None,
            "learning_intensity": "high" if total_hours > 20 else "medium" if total_hours > 10 else "low",
            "goal_context": {
                "has_main_notes": bool(goal_main_notes),
                "main_notes_preview": goal_main_notes[:200] if goal_main_notes else None,
                "notes_analysis": goal_notes_analysis
            } if goal else None
        }
        
        logger.info("Generated comprehensive summary for user %s with %d activities", user.id, len(all_notes))
        
        return Response(
            {
                "success": True,
                "summary": ai_summary,
                "key_points": key_points[:12],
                "topics_covered": topics,
                "detailed_notes": all_notes[:25],
                "notes_count": len(all_notes),
                "words_analyzed": sum(len(note["notes"].split()) for note in all_notes),
                "goal_notes": {
                    "main_notes": goal_main_notes,
                    "activity_entries": goal_activity_entries,
                    "analysis": goal_notes_analysis
                } if goal else None
            },
            status=status.HTTP_200_OK
        )