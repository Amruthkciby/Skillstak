import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../themeContext'

const API_BASE_URL = 'http://127.0.0.1:8000/mainapp/learning-goals/'
const COURSE_IMPORT_URL = 'http://127.0.0.1:8000/mainapp/course-import/'
const LEARNING_ACTIVITIES_URL = 'http://127.0.0.1:8000/mainapp/learning-activities/'
const WEEKLY_SUMMARY_URL = 'http://127.0.0.1:8000/mainapp/learning-summary/send-weekly/'
const PROFILE_URL = 'http://127.0.0.1:8000/mainapp/profile/'

const RESOURCE_OPTIONS = [
	{ value: 'video', label: 'Video' },
	{ value: 'course', label: 'Course' },
	{ value: 'article', label: 'Article' },
	{ value: 'other', label: 'Other' }
]

const PLATFORM_OPTIONS = ['Udemy', 'YouTube', 'Coursera', 'Other']

const STATUS_OPTIONS = [
	{ value: 'started', label: 'Started' },
	{ value: 'in_progress', label: 'In Progress' },
	{ value: 'completed', label: 'Completed' }
]

const INITIAL_FORM_STATE = {
	skillName: '',
	resourceType: RESOURCE_OPTIONS[0].value,
	platform: PLATFORM_OPTIONS[0],
	status: STATUS_OPTIONS[0].value,
	hours: '',
	difficulty: '3',
	notes: ''
}

const FIELD_MAP = {
	skillName: 'skill_name',
	resourceType: 'resource_type',
	platform: 'platform',
	status: 'status',
	hours: 'hours_spent',
	difficulty: 'difficulty_rating',
	notes: 'notes'
}

const STATUS_LABEL_MAP = STATUS_OPTIONS.reduce((acc, option) => {
	acc[option.value] = option.label
	return acc
}, {})

const RESOURCE_LABEL_MAP = RESOURCE_OPTIONS.reduce((acc, option) => {
	acc[option.value] = option.label
	return acc
}, {})

function mapApiActivity(activity) {
	return {
		id: activity.id,
		goalId: activity.goal,
		goal: activity.goal_details || null,
		performedOn: activity.performed_on,
		hours: typeof activity.hours_spent === 'number' ? activity.hours_spent : Number(activity.hours_spent || 0),
		notes: activity.notes || '',
		createdAt: activity.created_at
	}
}

function mapApiGoalToState(goal) {
	return {
		id: goal.id,
		skillName: goal.skill_name,
		resourceType: goal.resource_type,
		platform: goal.platform || 'Other',
		status: goal.status,
		hours: goal.hours_spent === null ? '' : Number(goal.hours_spent),
		difficulty: goal.difficulty_rating === null ? 3 : Number(goal.difficulty_rating),
		notes: goal.notes || '',
		createdAt: goal.created_at
	}
}

function formToApiPayload(form) {
	return {
		skill_name: form.skillName.trim(),
		resource_type: form.resourceType,
		platform: form.platform,
		status: form.status,
		hours_spent: form.hours === '' ? 0 : Number(form.hours),
		difficulty_rating: form.difficulty === '' ? 1 : Number(form.difficulty),
		notes: form.notes.trim()
	}
}

function partialToApiPayload(partial) {
	return Object.entries(partial).reduce((payload, [key, value]) => {
		if (!(key in FIELD_MAP)) return payload

		if (key === 'hours') {
			payload[FIELD_MAP[key]] = value === '' ? 0 : Number(value)
		} else if (key === 'difficulty') {
			payload[FIELD_MAP[key]] = value === '' ? 1 : Number(value)
		} else if (key === 'notes') {
			payload[FIELD_MAP[key]] = (value || '').trim()
		} else if (key === 'skillName') {
			payload[FIELD_MAP[key]] = (value || '').trim()
		} else {
			payload[FIELD_MAP[key]] = value
		}
		return payload
	}, {})
}

function getAuthHeaders(includeJson = false) {
	const headers = {}
	const token = localStorage.getItem('access_token')
	if (token) {
		headers.Authorization = `Bearer ${token}`
	}
	if (includeJson) {
		headers['Content-Type'] = 'application/json'
		headers.Accept = 'application/json'
	}
	return headers
}

function toISODateInput(value = new Date()) {
	const date = value instanceof Date ? value : new Date(value)
	return date.toISOString().slice(0, 10)
}

function formatDisplayDate(value) {
	if (!value) return 'Unknown date'
	const date = value.includes('T') ? new Date(value) : new Date(`${value}T00:00:00`)
	return new Intl.DateTimeFormat('en-US', {
		weekday: 'short',
		month: 'short',
		day: 'numeric',
		year: 'numeric'
	}).format(date)
}

function formatDecimalHours(value) {
	const num = Number(value || 0)
	return `${Math.round(num * 10) / 10}h`
}

function parseGoalNotes(notesText) {
	/**
	 * Parse goal notes into activity entries with timestamps and main notes
	 * Format: [YYYY-MM-DD HH:MM] note text
	 */
	if (!notesText || !notesText.trim()) {
		return { entries: [], mainNotes: '' }
	}

	const lines = notesText.split('\n\n').map(s => s.trim()).filter(Boolean)
	const entries = []
	const mainNotes = []

	lines.forEach(line => {
		const match = line.match(/^\[(\d{4}-\d{2}-\d{2}\s\d{2}:\d{2})\]\s*(.*)$/)
		if (match) {
			const timestamp = match[1]
			const text = match[2]
			entries.push({ timestamp, text, isUpdate: text.includes('(updated)') })
		} else {
			mainNotes.push(line)
		}
	})

	return {
		entries: entries.sort((a, b) => new Date(`${b.timestamp}`) - new Date(`${a.timestamp}`)),
		mainNotes: mainNotes.join('\n')
	}
}

export default function Dashboard() {
	// ---------------------------- State & Model ----------------------------
	const navigate = useNavigate()
	const { theme, toggleTheme } = useTheme()
	const isDark = theme === 'dark'
	const palette = {
		pageBg: isDark ? '#0f172a' : '#f3f4f6',
		textPrimary: isDark ? '#e2e8f0' : '#0f172a',
		textSecondary: isDark ? 'rgba(226, 232, 240, 0.74)' : '#475569',
		cardBg: isDark ? 'rgba(15, 23, 42, 0.88)' : '#ffffff',
		cardBorder: isDark ? 'rgba(148, 163, 184, 0.22)' : 'rgba(15, 23, 42, 0.08)',
		cardShadow: isDark ? '0 22px 65px rgba(15, 23, 42, 0.55)' : '0 22px 60px rgba(15, 23, 42, 0.1)',
		inputBg: isDark ? 'rgba(15, 23, 42, 0.6)' : '#f8fafc',
		inputBorder: isDark ? 'rgba(148, 163, 184, 0.32)' : 'rgba(148, 163, 184, 0.28)',
		inputText: isDark ? '#f8fafc' : '#0f172a',
		accent: '#2563eb',
		accentSoft: isDark ? 'rgba(99, 102, 241, 0.18)' : 'rgba(37, 99, 235, 0.15)',
		accentGradient: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 45%, #9333ea 100%)',
		successGradient: 'linear-gradient(135deg, #22c55e 0%, #4ade80 100%)',
		warningBg: isDark ? 'rgba(255, 193, 7, 0.18)' : 'rgba(255, 193, 7, 0.14)',
		progressBg: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(148, 163, 184, 0.18)',
		tableRow: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(15, 23, 42, 0.04)',
		muted: isDark ? 'rgba(226, 232, 240, 0.7)' : '#64748b',
		legendBg: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(15, 23, 42, 0.06)',
		legendBorder: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(148, 163, 184, 0.22)',
		buttonShadow: isDark ? '0 16px 40px rgba(79, 70, 229, 0.45)' : '0 16px 36px rgba(79, 70, 229, 0.25)',
		alertBg: isDark ? 'rgba(248,113,113,0.18)' : 'rgba(248,113,113,0.12)',
		alertBorder: isDark ? 'rgba(248,113,113,0.35)' : 'rgba(248,113,113,0.22)',
		alertText: isDark ? '#fecaca' : '#b91c1c',
		timelineBorder: isDark ? 'rgba(124,92,255,0.35)' : 'rgba(99,102,241,0.28)',
		timelineDot: isDark ? 'linear-gradient(180deg, #7c5cff, #6246ea)' : 'linear-gradient(180deg, #6366f1, #4f46e5)',
		themeToggleBg: isDark ? 'rgba(99,102,241,0.2)' : 'rgba(37, 99, 235, 0.12)',
		themeToggleText: isDark ? '#dbe4ff' : '#1d4ed8'
	}

	const handleFieldFocus = event => {
		event.currentTarget.style.borderColor = palette.accent
		event.currentTarget.style.boxShadow = isDark
			? '0 0 0 3px rgba(37, 99, 235, 0.35)'
			: '0 0 0 3px rgba(37, 99, 235, 0.18)'
	}

	const handleFieldBlur = event => {
		event.currentTarget.style.borderColor = palette.inputBorder
		event.currentTarget.style.boxShadow = 'none'
	}

	const handlePrimaryHoverEnter = event => {
		event.currentTarget.style.transform = 'translateY(-2px)'
		event.currentTarget.style.boxShadow = isDark
			? '0 24px 44px rgba(79, 70, 229, 0.55)'
			: '0 20px 40px rgba(79, 70, 229, 0.32)'
	}

	const handlePrimaryHoverLeave = event => {
		event.currentTarget.style.transform = 'translateY(0)'
		event.currentTarget.style.boxShadow = palette.buttonShadow
	}
	const [profile, setProfile] = useState({ username: '', email: '' })
	const [menuOpen, setMenuOpen] = useState(false)
	const [goals, setGoals] = useState([])
	const [form, setForm] = useState({ ...INITIAL_FORM_STATE })
	const [loadingGoals, setLoadingGoals] = useState(true)
	const [apiError, setApiError] = useState('')
	const [syncError, setSyncError] = useState('')
	const [activities, setActivities] = useState([])
	const [loadingActivities, setLoadingActivities] = useState(true)
	const [activitiesError, setActivitiesError] = useState('')
	const [importedCourses, setImportedCourses] = useState([])
	const [courseImportState, setCourseImportState] = useState({
		url: '',
		loading: false,
		error: '',
		latest: null
	})
	const [activityForm, setActivityForm] = useState({
		goalId: '',
		performedOn: toISODateInput(),
		hours: '1',
		notes: ''
	})
	const [weeklySummaryState, setWeeklySummaryState] = useState({
		loading: false,
		error: '',
		data: null
	})
	const [expandedSections, setExpandedSections] = useState({
		addGoal: false,
		logActivity: false,
		courseImport: false,
		weeklySummary: false
	})
	const [viewingGoalNotes, setViewingGoalNotes] = useState(null)
	const menuRef = useRef(null)
	const weeklySummaryRef = useRef(null)
	const courseImportRef = useRef(null)
	const pendingUpdates = useRef({})
	const authRedirectScheduled = useRef(false)
	const displayName = useMemo(() => {
		if (profile.username) return profile.username
		if (profile.email) return profile.email.split('@')[0]
		return 'User'
	}, [profile])
	const displayEmail = useMemo(() => profile.email || 'Email not provided', [profile])
	const initials = useMemo(() => {
		const source = (profile.username || profile.email || 'User').trim()
		if (!source) return 'US'
		const cleaned = source.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
		if (cleaned.length >= 2) return cleaned.slice(0, 2)
		if (cleaned.length === 1) return `${cleaned}•`
		return 'US'
	}, [profile])
	useEffect(() => {
		function handleDocumentClick(event) {
			if (menuRef.current && !menuRef.current.contains(event.target)) {
				setMenuOpen(false)
			}
		}
		document.addEventListener('mousedown', handleDocumentClick)
		return () => document.removeEventListener('mousedown', handleDocumentClick)
	}, [])

	function handleAuthError(response, data) {
		if (response.status === 401 || response.status === 403) {
			const detail =
				typeof data === 'string'
					? data
					: data?.detail || 'Session expired. Please log in again.'
			setApiError(detail)
			setSyncError(detail)
			setProfile({ username: '', email: '' })
			setMenuOpen(false)
			localStorage.removeItem('access_token')
			localStorage.removeItem('refresh_token')
			if (!authRedirectScheduled.current) {
				authRedirectScheduled.current = true
				setTimeout(() => {
					navigate('/login', { replace: true })
				}, 1500)
			}
			return true
		}
		return false
	}

	async function readJsonSafely(response) {
		try {
			return await response.json()
		} catch {
			return null
		}
	}

	useEffect(() => {
		let isMounted = true

		async function loadGoals() {
			setLoadingGoals(true)
			try {
				const response = await fetch(API_BASE_URL, {
					headers: getAuthHeaders()
				})
				const data = await readJsonSafely(response)
				if (!response.ok) {
					if (handleAuthError(response, data)) return
					const message =
						(typeof data === 'string' && data) ||
						data?.detail ||
						'Failed to load goals.'
					throw new Error(message)
				}
				if (isMounted) {
					const mappedGoals = Array.isArray(data) ? data.map(mapApiGoalToState) : []
					setGoals(mappedGoals)
					setApiError('')
				}
			} catch (error) {
				if (isMounted) {
					setApiError(error.message || 'Unable to load goals.')
				}
			} finally {
				if (isMounted) {
					setLoadingGoals(false)
				}
			}
		}

		async function loadActivities() {
			setLoadingActivities(true)
			try {
				const response = await fetch(LEARNING_ACTIVITIES_URL, {
					headers: getAuthHeaders()
				})
				const data = await readJsonSafely(response)
				if (!response.ok) {
					if (handleAuthError(response, data)) return
					const message =
						(typeof data === 'string' && data) ||
						data?.detail ||
						'Failed to load activities.'
					throw new Error(message)
				}
				if (isMounted) {
					const mappedActivities = Array.isArray(data) ? data.map(mapApiActivity) : []
					setActivities(mappedActivities)
					setActivitiesError('')
				}
			} catch (error) {
				if (isMounted) {
					setActivitiesError(error.message || 'Unable to load activities.')
				}
			} finally {
				if (isMounted) {
					setLoadingActivities(false)
				}
			}
		}

		async function loadProfile() {
			try {
				const response = await fetch(PROFILE_URL, {
					headers: getAuthHeaders()
				})
				const data = await readJsonSafely(response)
				if (!response.ok) {
					if (handleAuthError(response, data)) return
					const message =
						(typeof data === 'string' && data) ||
						data?.detail ||
						'Failed to load profile.'
					throw new Error(message)
				}
				if (isMounted) {
					setProfile({
						username: data?.username || '',
						email: data?.email || ''
					})
				}
			} catch (error) {
				// Silently log profile failures without blocking dashboard load
				console.warn('Unable to load profile.', error)
			}
		}

		loadGoals()
		loadActivities()
		loadProfile()

		return () => {
			isMounted = false
		}
	}, [])

	useEffect(() => {
		if (goals.length === 0) return
		setActivityForm(prev => {
			if (prev.goalId) return prev
			return { ...prev, goalId: goals[0].id }
		})
	}, [goals])

	// ---------------------------- Handlers ----------------------------
	function handleFormChange(event) {
		const { name, value } = event.target
		setForm(prev => ({ ...prev, [name]: value }))
	}

	function handleCourseImportChange(event) {
		const { value } = event.target
		setCourseImportState(prev => ({ ...prev, url: value, error: '' }))
	}

	function handleActivityFormChange(event) {
		const { name, value } = event.target
		setActivityForm(prev => ({ ...prev, [name]: value }))
	}

	async function addGoal(event) {
		event.preventDefault()
		if (!form.skillName.trim()) return

		setSyncError('')
		try {
			const response = await fetch(API_BASE_URL, {
				method: 'POST',
				headers: getAuthHeaders(true),
				body: JSON.stringify(formToApiPayload(form))
			})
			const data = await readJsonSafely(response)
			if (!response.ok) {
				if (handleAuthError(response, data)) return
				const message =
					(typeof data === 'string' && data) ||
					data?.detail ||
					'Failed to create goal.'
				throw new Error(message)
			}
			const mappedGoal = mapApiGoalToState(data)
			setGoals(prev => [mappedGoal, ...prev])
			setActivityForm(prev => (prev.goalId ? prev : { ...prev, goalId: mappedGoal.id }))
			setForm({ ...INITIAL_FORM_STATE })
		} catch (error) {
			setSyncError(error.message || 'Unable to create goal.')
		}
	}

	function updateGoalField(goalId, field, value, persistImmediately = false) {
		setGoals(prev =>
			prev.map(goal => (goal.id === goalId ? { ...goal, [field]: value } : goal))
		)
		pendingUpdates.current[goalId] = {
			...(pendingUpdates.current[goalId] || {}),
			[field]: value
		}
		if (persistImmediately) {
			void persistGoal(goalId)
		}
	}

	async function persistGoal(goalId) {
		const pending = pendingUpdates.current[goalId]
		if (!pending || Object.keys(pending).length === 0) return

		delete pendingUpdates.current[goalId]
		setSyncError('')

		const payload = partialToApiPayload(pending)
		if (Object.keys(payload).length === 0) return

		try {
			const response = await fetch(`${API_BASE_URL}${goalId}/`, {
				method: 'PATCH',
				headers: getAuthHeaders(true),
				body: JSON.stringify(payload)
			})
			const data = response.status === 204 ? null : await readJsonSafely(response)
			if (!response.ok) {
				if (handleAuthError(response, data)) {
					pendingUpdates.current[goalId] = {
						...pending,
						...(pendingUpdates.current[goalId] || {})
					}
					return
				}
				const message =
					(typeof data === 'string' && data) ||
					data?.detail ||
					'Failed to update goal.'
				throw new Error(message)
			}
			if (data) {
				const mappedGoal = mapApiGoalToState(data)
				setGoals(prev =>
					prev.map(goal => (goal.id === goalId ? mappedGoal : goal))
				)
			}
		} catch (error) {
			setSyncError(error.message || 'Unable to save changes.')
			pendingUpdates.current[goalId] = {
				...pending,
				...(pendingUpdates.current[goalId] || {})
			}
		}
	}

	async function removeGoal(goalId) {
		setSyncError('')
		try {
			const response = await fetch(`${API_BASE_URL}${goalId}/`, {
				method: 'DELETE',
				headers: getAuthHeaders()
			})
			if (!response.ok) {
				const data = await readJsonSafely(response)
				if (handleAuthError(response, data)) return
				const message =
					(typeof data === 'string' && data) ||
					data?.detail ||
					'Failed to delete goal.'
				throw new Error(message)
			}
			setGoals(prev => prev.filter(goal => goal.id !== goalId))
			setActivities(prev => prev.filter(activity => activity.goalId !== goalId))
			delete pendingUpdates.current[goalId]
		} catch (error) {
			setSyncError(error.message || 'Unable to delete goal.')
		}
	}

	async function submitCourseImport(event) {
		event.preventDefault()
		if (!courseImportState.url.trim()) return

		setCourseImportState(prev => ({ ...prev, loading: true, error: '' }))
		try {
			const response = await fetch(COURSE_IMPORT_URL, {
				method: 'POST',
				headers: getAuthHeaders(true),
				body: JSON.stringify({ url: courseImportState.url.trim() })
			})
			const data = await readJsonSafely(response)
			if (!response.ok) {
				if (handleAuthError(response, data)) {
					setCourseImportState(prev => ({ ...prev, loading: false }))
					return
				}
				const message =
					(typeof data === 'string' && data) ||
					data?.detail ||
					'Failed to import course.'
				throw new Error(message)
			}
			const course = data
			setImportedCourses(prev => {
				const filtered = prev.filter(item => item.id !== course.id)
				return [course, ...filtered].slice(0, 6)
			})
			setCourseImportState({
				url: '',
				loading: false,
				error: '',
				latest: course
			})
		} catch (error) {
			setCourseImportState(prev => ({
				...prev,
				loading: false,
				error: error.message || 'Unable to import course.'
			}))
		}
	}

	async function submitActivity(event) {
		event.preventDefault()
		if (!activityForm.goalId) {
			setActivitiesError('Select a goal before logging an activity.')
			return
		}
		const hoursValue = activityForm.hours === '' ? 0 : Number(activityForm.hours)
		if (Number.isNaN(hoursValue)) {
			setActivitiesError('Enter a valid number of hours.')
			return
		}
		setActivitiesError('')
		try {
			const payload = {
				goal: Number(activityForm.goalId),
				performed_on: activityForm.performedOn,
				hours_spent: hoursValue,
				notes: activityForm.notes.trim()
			}
			const response = await fetch(LEARNING_ACTIVITIES_URL, {
				method: 'POST',
				headers: getAuthHeaders(true),
				body: JSON.stringify(payload)
			})
			const data = await readJsonSafely(response)
			if (!response.ok) {
				if (handleAuthError(response, data)) {
					setActivitiesError('Session expired. Please log in again.')
					return
				}
				const message =
					(typeof data === 'string' && data) ||
					data?.detail ||
					'Failed to log activity.'
				throw new Error(message)
			}
			const mapped = mapApiActivity(data)
			setActivities(prev => [mapped, ...prev])
			setActivityForm(prev => ({
				...prev,
				hours: '1',
				notes: '',
				performedOn: prev.performedOn || toISODateInput()
			}))
		} catch (error) {
			setActivitiesError(error.message || 'Unable to save learning activity.')
		}
	}

	async function triggerWeeklySummary(sendEmail = false) {
		setWeeklySummaryState({ loading: true, error: '', data: null })
		try {
			const response = await fetch(WEEKLY_SUMMARY_URL, {
				method: 'POST',
				headers: getAuthHeaders(true),
				body: JSON.stringify({ send_email: sendEmail })
			})
			const data = await readJsonSafely(response)
			if (!response.ok) {
				if (handleAuthError(response, data)) {
					setWeeklySummaryState({ loading: false, error: '', data: null })
					return
				}
				const message =
					(typeof data === 'string' && data) ||
					data?.detail ||
					'Failed to generate weekly summary.'
				throw new Error(message)
			}
			setWeeklySummaryState({ loading: false, error: '', data })
		} catch (error) {
			setWeeklySummaryState({ loading: false, error: error.message || 'Unable to send summary.', data: null })
		}
	}

	function handleLogout() {
		setMenuOpen(false)
		setProfile({ username: '', email: '' })
		localStorage.removeItem('access_token')
		localStorage.removeItem('refresh_token')
		navigate('/login', { replace: true })
	}

	// ---------------------------- Insights ----------------------------
	const activityHoursByGoal = useMemo(() => {
		return activities.reduce((acc, activity) => {
			const key = activity.goalId
			acc[key] = (acc[key] || 0) + (Number(activity.hours) || 0)
			return acc
		}, {})
	}, [activities])

	const insights = useMemo(() => {
		const total = goals.length
		const statusCounts = goals.reduce((acc, goal) => {
			const key = goal.status
			acc[key] = (acc[key] || 0) + 1
			return acc
		}, {})
		const completed = statusCounts.completed || 0
		const inProgress = statusCounts.in_progress || 0
		const started = statusCounts.started || 0
		const totalPlannedHoursRaw = goals.reduce((sum, goal) => sum + (Number(goal.hours) || 0), 0)
		const totalPlannedHours = Math.round(totalPlannedHoursRaw * 10) / 10
		const totalLoggedHoursRaw = activities.reduce((sum, activity) => sum + (Number(activity.hours) || 0), 0)
		const totalLoggedHours = Math.round(totalLoggedHoursRaw * 10) / 10
		const averageDifficulty = total === 0
			? 0
			: Math.round((goals.reduce((sum, goal) => sum + (Number(goal.difficulty) || 0), 0) / total) * 10) / 10
		const completionRate = total === 0 ? 0 : Math.round((completed / total) * 100)

		const byResourceType = RESOURCE_OPTIONS.reduce((acc, option) => {
			acc[option.value] = goals.filter(goal => goal.resourceType === option.value).length
			return acc
		}, {})
		const platformBase = PLATFORM_OPTIONS.reduce((acc, platform) => {
			acc[platform] = 0
			return acc
		}, {})
		const byPlatform = goals.reduce((acc, goal) => {
			const key = goal.platform || 'Other'
			acc[key] = (acc[key] || 0) + 1
			return acc
		}, { ...platformBase })
		const bySkill = goals.reduce((acc, goal) => {
			const key = goal.skillName || 'Unnamed'
			acc[key] = (acc[key] || 0) + 1
			return acc
		}, {})

		return {
			total,
			completed,
			inProgress,
			started,
			totalPlannedHours,
			totalLoggedHours,
			averageDifficulty,
			completionRate,
			byResourceType,
			byPlatform,
			bySkill
		}
	}, [goals, activities])

	const timelineGroups = useMemo(() => {
		const grouped = activities.reduce((acc, activity) => {
			const key = activity.performedOn || activity.createdAt || 'Unknown'
			acc[key] = acc[key] || []
			acc[key].push(activity)
			return acc
		}, {})
		return Object.entries(grouped)
			.sort((a, b) => new Date(b[0]) - new Date(a[0]))
			.map(([date, items]) => ({
				date,
				items: items.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
			}))
	}, [activities])

	// ---------------------------- Styles ----------------------------
	const styles = {
		page: {
			padding: '24px',
			background: palette.pageBg,
			minHeight: '100vh',
			color: palette.textPrimary,
			fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif'
		},
		header: {
			display: 'flex',
			alignItems: 'center',
			justifyContent: 'space-between',
			marginBottom: '16px'
		},
		headerLeft: { display: 'flex', flexDirection: 'column', gap: '4px' },
		headerActions: { display: 'flex', alignItems: 'center', gap: '14px' },
		themeButton: {
			border: 'none',
			borderRadius: '999px',
			padding: '8px 14px',
			fontWeight: 600,
			cursor: 'pointer',
			background: palette.themeToggleBg,
			color: palette.themeToggleText,
			transition: 'transform 0.2s ease, box-shadow 0.2s ease'
		},
		title: { margin: 0, fontWeight: 700, letterSpacing: '0.2px', color: palette.textPrimary },
		subtitle: { margin: 0, color: palette.muted, fontSize: '12px' },
		alert: {
			marginBottom: '16px',
			padding: '12px 16px',
			borderRadius: '12px',
			fontSize: '0.95rem',
			border: `1px solid ${palette.alertBorder}`,
			background: palette.alertBg,
			color: palette.alertText
		},
		grid: {
			display: 'grid',
			gridTemplateColumns: '1fr',
			gap: '16px'
		},
		sectionGrid: {
			display: 'grid',
			gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
			gap: '16px'
		},
		card: {
			background: palette.cardBg,
			border: `1px solid ${palette.cardBorder}`,
			borderRadius: '14px',
			padding: '16px',
			boxShadow: palette.cardShadow,
			color: palette.textPrimary,
			transition: 'background 0.3s ease, border 0.3s ease, color 0.3s ease'
		},
		formGrid: {
			display: 'grid',
			gridTemplateColumns: 'repeat(12, 1fr)',
			gap: '12px',
			alignItems: 'end'
		},
		formGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
		label: { fontSize: '12px', color: palette.textSecondary },
		input: {
			background: palette.inputBg,
			border: `1px solid ${palette.inputBorder}`,
			borderRadius: '10px',
			padding: '10px 12px',
			color: palette.inputText,
			outline: 'none',
			transition: 'border 0.2s ease, box-shadow 0.2s ease'
		},
		select: {
			background: palette.inputBg,
			border: `1px solid ${palette.inputBorder}`,
			borderRadius: '10px',
			padding: '10px 12px',
			color: palette.inputText,
			outline: 'none',
			transition: 'border 0.2s ease, box-shadow 0.2s ease'
		},
		textarea: {
			background: palette.inputBg,
			border: `1px solid ${palette.inputBorder}`,
			borderRadius: '10px',
			padding: '10px 12px',
			color: palette.inputText,
			outline: 'none',
			resize: 'vertical'
		},
		button: {
			background: palette.accentGradient,
			border: 'none',
			color: '#fff',
			borderRadius: '10px',
			padding: '10px 14px',
			cursor: 'pointer',
			fontWeight: 600,
			boxShadow: palette.buttonShadow,
			transition: 'transform 0.25s ease, box-shadow 0.25s ease'
		},
		logoutButton: {
			background: isDark ? 'transparent' : 'rgba(37, 99, 235, 0.08)',
			color: isDark ? '#f8fafc' : palette.accent,
			border: `1px solid ${isDark ? 'rgba(255,255,255,0.25)' : 'rgba(37, 99, 235, 0.2)'}`,
			borderRadius: '999px',
			padding: '8px 16px',
			fontWeight: 600,
			cursor: 'pointer',
			transition: 'all 0.25s ease',
			boxShadow: isDark ? '0 6px 18px rgba(124,92,255,0.25)' : '0 6px 18px rgba(37, 99, 235, 0.18)'
		},
		userMenu: {
			position: 'relative',
			display: 'flex',
			alignItems: 'center'
		},
		avatarButton: {
			display: 'flex',
			alignItems: 'center',
			gap: '10px',
			background: isDark ? 'rgba(30, 41, 59, 0.65)' : '#ffffff',
			border: `1px solid ${palette.cardBorder}`,
			borderRadius: '999px',
			padding: '6px 12px 6px 6px',
			cursor: 'pointer',
			color: palette.textPrimary,
			boxShadow: palette.cardShadow,
			transition: 'transform 0.25s ease, box-shadow 0.25s ease, background 0.25s ease',
			outline: 'none'
		},
		avatarCircle: {
			width: '38px',
			height: '38px',
			borderRadius: '50%',
			display: 'flex',
			alignItems: 'center',
			justifyContent: 'center',
			fontWeight: 700,
			fontSize: '1rem',
			background: palette.accentSoft,
			color: palette.accent
		},
		userDetails: {
			display: 'flex',
			flexDirection: 'column',
			alignItems: 'flex-start',
			lineHeight: 1.2
		},
		userName: {
			fontWeight: 600,
			color: palette.textPrimary,
			fontSize: '0.95rem'
		},
		userEmail: {
			fontSize: '0.75rem',
			color: palette.textSecondary
		},
		caret: {
			marginLeft: '6px',
			fontSize: '0.8rem',
			color: palette.textSecondary
		},
		dropdown: {
			position: 'absolute',
			top: 'calc(100% + 8px)',
			right: 0,
			minWidth: '220px',
			background: palette.cardBg,
			border: `1px solid ${palette.cardBorder}`,
			borderRadius: '14px',
			boxShadow: palette.cardShadow,
			padding: '12px',
			display: 'flex',
			flexDirection: 'column',
			gap: '12px',
			zIndex: 80
		},
		dropdownHeader: {
			display: 'flex',
			flexDirection: 'column',
			gap: '4px'
		},
		dropdownName: {
			fontWeight: 600,
			color: palette.textPrimary,
			fontSize: '0.95rem'
		},
		dropdownEmail: {
			fontSize: '0.8rem',
			color: palette.textSecondary
		},
		dropdownAction: {
			border: 'none',
			borderRadius: '10px',
			padding: '10px 12px',
			background: palette.accentGradient,
			color: '#ffffff',
			fontWeight: 600,
			cursor: 'pointer',
			boxShadow: palette.buttonShadow,
			transition: 'transform 0.25s ease, box-shadow 0.25s ease'
		},
		statsGrid: {
			display: 'grid',
			gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
			gap: '12px'
		},
		statCard: {
			background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(15, 23, 42, 0.05)',
			border: `1px solid ${palette.cardBorder}`,
			borderRadius: '12px',
			padding: '12px',
			color: palette.textPrimary
		},
		statLabel: { fontSize: '12px', color: palette.textSecondary },
		statValue: { fontSize: '22px', fontWeight: 700, color: palette.textPrimary },
		statMeta: { fontSize: '12px', color: palette.textSecondary, marginTop: '4px' },
		table: {
			width: '100%',
			borderCollapse: 'separate',
			borderSpacing: '0 10px'
		},
		row: {
			background: palette.tableRow
		},
		cell: {
			padding: '10px 12px',
			borderTop: `1px solid ${palette.cardBorder}`,
			borderBottom: `1px solid ${palette.cardBorder}`
		},
		cellFirst: {
			padding: '10px 12px',
			borderTop: `1px solid ${palette.cardBorder}`,
			borderBottom: `1px solid ${palette.cardBorder}`,
			borderLeft: `1px solid ${palette.cardBorder}`,
			borderTopLeftRadius: '10px',
			borderBottomLeftRadius: '10px'
		},
		cellLast: {
			padding: '10px 12px',
			borderTop: `1px solid ${palette.cardBorder}`,
			borderBottom: `1px solid ${palette.cardBorder}`,
			borderRight: `1px solid ${palette.cardBorder}`,
			borderTopRightRadius: '10px',
			borderBottomRightRadius: '10px'
		},
		badge: {
			padding: '4px 8px',
			borderRadius: '999px',
			fontSize: '12px',
			fontWeight: 600,
			display: 'inline-block'
		},
		badgeStarted: { background: palette.warningBg, color: isDark ? '#ffe08a' : '#a16207' },
		badgeProgress: { background: palette.accentSoft, color: isDark ? '#cdd6ff' : palette.accent },
		badgeCompleted: { background: 'rgba(34, 197, 94, 0.18)', color: isDark ? '#bbf7d0' : '#166534' },
		legend: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
		legendItem: {
			display: 'inline-flex',
			alignItems: 'center',
			gap: '6px',
			background: palette.legendBg,
			border: `1px solid ${palette.legendBorder}`,
			padding: '6px 8px',
			borderRadius: '999px',
			fontSize: '12px'
		},
		removeBtn: {
			background: 'transparent',
			border: `1px solid ${palette.cardBorder}`,
			color: palette.textPrimary,
			borderRadius: '8px',
			padding: '6px 10px',
			cursor: 'pointer'
		},
		progressSelectRow: {
			display: 'flex',
			alignItems: 'center',
			gap: '8px',
			marginBottom: '8px'
		},
		progressTrack: {
			height: '6px',
			background: palette.progressBg,
			borderRadius: '999px',
			overflow: 'hidden',
			position: 'relative'
		},
		progressFill: {
			height: '100%',
			background: 'linear-gradient(90deg, #38bdf8, #6366f1, #a855f7)',
			transition: 'width 0.3s ease'
		},
		progressMeta: {
			display: 'flex',
			justifyContent: 'space-between',
			fontSize: '0.75rem',
			color: palette.textSecondary,
			marginTop: '6px'
		},
		courseList: {
			display: 'grid',
			gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
			gap: '12px',
			marginTop: '12px'
		},
		courseCard: {
			background: isDark ? 'rgba(15, 23, 42, 0.7)' : '#f8fafc',
			border: `1px solid ${palette.cardBorder}`,
			borderRadius: '12px',
			padding: '12px',
			display: 'flex',
			flexDirection: 'column',
			gap: '8px'
		},
		courseTitle: { fontWeight: 600, fontSize: '0.95rem', color: palette.textPrimary },
		courseProvider: {
			fontSize: '0.8rem',
			color: palette.textSecondary,
			textTransform: 'uppercase',
			letterSpacing: '0.5px'
		},
		timelineGroup: {
			position: 'relative',
			paddingLeft: '18px',
			marginBottom: '16px'
		},
		timelineLine: {
			position: 'absolute',
			left: '6px',
			top: '8px',
			bottom: '-8px',
			width: '2px',
			background: palette.timelineBorder
		},
		timelineDot: {
			position: 'absolute',
			left: 0,
			top: '4px',
			width: '12px',
			height: '12px',
			borderRadius: '999px',
			background: palette.timelineDot,
			boxShadow: '0 0 0 4px rgba(124,92,255,0.2)'
		},
		timelineDate: {
			fontWeight: 600,
			marginBottom: '8px',
			fontSize: '0.9rem',
			color: palette.textPrimary
		},
		timelineItem: {
			background: palette.tableRow,
			border: `1px solid ${palette.cardBorder}`,
			borderRadius: '10px',
			padding: '10px 12px',
			marginBottom: '8px'
		},
		timelineGoal: {
			fontWeight: 600,
			fontSize: '0.95rem',
			marginBottom: '4px',
			color: palette.textPrimary
		},
		timelineMeta: {
			fontSize: '0.8rem',
			color: palette.textSecondary,
			display: 'flex',
			gap: '12px',
			flexWrap: 'wrap'
		}
	}

	// ---------------------------- UI ----------------------------
  return (
		<div style={styles.page}>
			{/* Header Section */}
			<div style={styles.header}>
				<div style={styles.headerLeft}>
					<h3 style={styles.title}>Learning Goals Dashboard</h3>
					<p style={styles.subtitle}>Track goals, progress, time, and insights</p>
				</div>
				<div style={styles.headerActions}>
					<button
						type="button"
						style={styles.themeButton}
						onClick={toggleTheme}
						onMouseDown={event => {
							event.currentTarget.style.transform = 'scale(0.97)'
						}}
						onMouseUp={event => {
							event.currentTarget.style.transform = 'scale(1)'
						}}
						onMouseLeave={event => {
							event.currentTarget.style.transform = 'scale(1)'
						}}
					>
						{isDark ? '☀️ Light' : '🌙 Dark'}
					</button>
					<div style={styles.userMenu} ref={menuRef}>
						<button
							type="button"
							style={styles.avatarButton}
							onClick={() => setMenuOpen(prev => !prev)}
							onMouseEnter={event => {
								event.currentTarget.style.boxShadow = isDark
									? '0 20px 44px rgba(15, 23, 42, 0.55)'
									: '0 20px 44px rgba(37, 99, 235, 0.18)'
							}}
							onMouseLeave={event => {
								event.currentTarget.style.boxShadow = palette.cardShadow
								event.currentTarget.style.transform = 'scale(1)'
							}}
							onMouseDown={event => {
								event.currentTarget.style.transform = 'scale(0.98)'
							}}
							onMouseUp={event => {
								event.currentTarget.style.transform = 'scale(1)'
							}}
						>
							<div style={styles.userDetails}>
								<span style={styles.userName}>{displayName}</span>
							</div>
							<span style={styles.caret}>{menuOpen ? '▴' : '▾'}</span>
						</button>
						{menuOpen && (
							<div style={styles.dropdown}>
								<div style={styles.dropdownHeader}>
									<span style={styles.dropdownName}>{displayName}</span>
									<span style={styles.dropdownEmail}>{displayEmail}</span>
								</div>
								<button
									type="button"
									style={styles.dropdownAction}
									onClick={handleLogout}
									onMouseEnter={handlePrimaryHoverEnter}
									onMouseLeave={handlePrimaryHoverLeave}
								>
									Logout
								</button>
							</div>
						)}
					</div>
				</div>
			</div>

			{/* Error Alerts */}
			{(apiError || syncError || activitiesError || courseImportState.error || weeklySummaryState.error) && (
				<div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
					{apiError && <div style={styles.alert}>{apiError}</div>}
					{syncError && <div style={styles.alert}>{syncError}</div>}
					{activitiesError && <div style={styles.alert}>{activitiesError}</div>}
					{courseImportState.error && <div style={styles.alert}>{courseImportState.error}</div>}
					{weeklySummaryState.error && <div style={styles.alert}>{weeklySummaryState.error}</div>}
				</div>
			)}

			{/* Quick Stats Overview - Hero Section */}
			<div style={{ marginBottom: '24px' }}>
				<div style={styles.statsGrid}>
					<div style={{
						...styles.statCard,
						background: isDark 
							? 'linear-gradient(135deg, rgba(37, 99, 235, 0.25), rgba(79, 70, 229, 0.15))' 
							: 'linear-gradient(135deg, rgba(37, 99, 235, 0.12), rgba(79, 70, 229, 0.08))',
						border: `1px solid ${isDark ? 'rgba(99, 102, 241, 0.3)' : 'rgba(37, 99, 235, 0.2)'}`
					}}>
						<div style={styles.statLabel}>Total Goals</div>
						<div style={{ ...styles.statValue, background: palette.accentGradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
							{insights.total}
						</div>
					</div>
					<div style={{
						...styles.statCard,
						background: isDark 
							? 'linear-gradient(135deg, rgba(34, 197, 94, 0.25), rgba(74, 222, 128, 0.15))' 
							: 'linear-gradient(135deg, rgba(34, 197, 94, 0.12), rgba(74, 222, 128, 0.08))',
						border: `1px solid ${isDark ? 'rgba(34, 197, 94, 0.3)' : 'rgba(34, 197, 94, 0.2)'}`
					}}>
						<div style={styles.statLabel}>Completed</div>
						<div style={{ ...styles.statValue, background: palette.successGradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
							{insights.completed}
						</div>
						<div style={styles.statMeta}>{insights.completionRate}% completion rate</div>
					</div>
					<div style={{
						...styles.statCard,
						background: isDark 
							? 'linear-gradient(135deg, rgba(139, 92, 246, 0.25), rgba(168, 85, 247, 0.15))' 
							: 'linear-gradient(135deg, rgba(139, 92, 246, 0.12), rgba(168, 85, 247, 0.08))',
						border: `1px solid ${isDark ? 'rgba(139, 92, 246, 0.3)' : 'rgba(139, 92, 246, 0.2)'}`
					}}>
						<div style={styles.statLabel}>Logged Hours</div>
						<div style={{ ...styles.statValue, background: 'linear-gradient(135deg, #8b5cf6, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
							{insights.totalLoggedHours}
						</div>
						<div style={styles.statMeta}>Planned: {insights.totalPlannedHours}h</div>
					</div>
					<div style={{
						...styles.statCard,
						background: isDark 
							? 'linear-gradient(135deg, rgba(251, 146, 60, 0.25), rgba(249, 115, 22, 0.15))' 
							: 'linear-gradient(135deg, rgba(251, 146, 60, 0.12), rgba(249, 115, 22, 0.08))',
						border: `1px solid ${isDark ? 'rgba(251, 146, 60, 0.3)' : 'rgba(251, 146, 60, 0.2)'}`
					}}>
						<div style={styles.statLabel}>Avg. Difficulty</div>
						<div style={{ ...styles.statValue, background: 'linear-gradient(135deg, #fb923c, #f97316)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
							{insights.averageDifficulty}
						</div>
						<div style={styles.statMeta}>Out of 5</div>
					</div>
				</div>
			</div>

			{/* Insights Section - Moved to Top */}
			<section style={{ ...styles.card, marginBottom: '24px' }}>
				<h4 style={{ 
					marginTop: 0, 
					marginBottom: '16px',
					display: 'flex',
					alignItems: 'center',
					gap: '8px'
				}}>
					<span style={{ fontSize: '1.2rem' }}>📈</span>
					Skill Growth Insights
				</h4>
				<div style={styles.sectionGrid}>
					<div style={{ ...styles.card, padding: '16px', background: isDark ? 'rgba(37, 99, 235, 0.08)' : 'rgba(37, 99, 235, 0.05)' }}>
						<div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px', color: palette.textPrimary }}>Resource Type</div>
						{/* Pie Chart */}
						<div style={{ marginBottom: '12px', height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
							<svg width="100" height="100" style={{ transform: 'rotate(-90deg)' }}>
								{RESOURCE_OPTIONS.map((option, index) => {
									const count = insights.byResourceType[option.value] || 0
									const total = Object.values(insights.byResourceType).reduce((sum, val) => sum + val, 0)
									if (total === 0) return null
									const angle = (count / total) * 360
									const startAngle = RESOURCE_OPTIONS.slice(0, index).reduce((sum, opt) => sum + ((insights.byResourceType[opt.value] || 0) / total) * 360, 0)
									const colors = ['#2563eb', '#8b5cf6', '#22c55e', '#f59e0b']
									const radius = 40
									const centerX = 50
									const centerY = 50
									const startAngleRad = (startAngle * Math.PI) / 180
									const endAngleRad = ((startAngle + angle) * Math.PI) / 180
									const x1 = centerX + radius * Math.cos(startAngleRad)
									const y1 = centerY + radius * Math.sin(startAngleRad)
									const x2 = centerX + radius * Math.cos(endAngleRad)
									const y2 = centerY + radius * Math.sin(endAngleRad)
									const largeArcFlag = angle > 180 ? 1 : 0
									const pathData = [
										`M ${centerX} ${centerY}`,
										`L ${x1} ${y1}`,
										`A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
										'Z'
									].join(' ')
									return (
										<path
											key={option.value}
											d={pathData}
											fill={colors[index % colors.length]}
											opacity={0.8}
										/>
									)
								})}
								<circle cx="50" cy="50" r="25" fill={palette.cardBg} />
								<text
									x="50"
									y="50"
									textAnchor="middle"
									dominantBaseline="middle"
									fill={palette.textPrimary}
									fontSize="12"
									fontWeight="600"
									style={{ transform: 'rotate(90deg)', transformOrigin: '50px 50px' }}
								>
									{Object.values(insights.byResourceType).reduce((sum, val) => sum + val, 0)}
								</text>
							</svg>
						</div>
						<div style={styles.legend}>
							{RESOURCE_OPTIONS.map((option, index) => {
								const colors = ['#2563eb', '#8b5cf6', '#22c55e', '#f59e0b']
								return (
									<span key={option.value} style={{ ...styles.legendItem, borderLeft: `3px solid ${colors[index % colors.length]}` }}>
										<span style={{ opacity: 0.8 }}>{option.label}</span>
										<strong>{insights.byResourceType[option.value] || 0}</strong>
									</span>
								)
							})}
						</div>
					</div>
					<div style={{ ...styles.card, padding: '16px', background: isDark ? 'rgba(139, 92, 246, 0.08)' : 'rgba(139, 92, 246, 0.05)' }}>
						<div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px', color: palette.textPrimary }}>Platform</div>
						{/* Pie Chart */}
						<div style={{ marginBottom: '12px', height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
							<svg width="100" height="100" style={{ transform: 'rotate(-90deg)' }}>
								{(() => {
									const allPlatforms = [...PLATFORM_OPTIONS, ...Object.keys(insights.byPlatform).filter(p => !PLATFORM_OPTIONS.includes(p))]
									const total = allPlatforms.reduce((sum, p) => sum + (insights.byPlatform[p] || 0), 0)
									if (total === 0) return null
									let currentAngle = 0
									const colors = ['#8b5cf6', '#a855f7', '#6366f1', '#4f46e5', '#2563eb']
									return allPlatforms.map((platform, index) => {
										const count = insights.byPlatform[platform] || 0
										if (count === 0) return null
										const angle = (count / total) * 360
										const startAngle = currentAngle
										currentAngle += angle
										const radius = 40
										const centerX = 50
										const centerY = 50
										const startAngleRad = (startAngle * Math.PI) / 180
										const endAngleRad = (currentAngle * Math.PI) / 180
										const x1 = centerX + radius * Math.cos(startAngleRad)
										const y1 = centerY + radius * Math.sin(startAngleRad)
										const x2 = centerX + radius * Math.cos(endAngleRad)
										const y2 = centerY + radius * Math.sin(endAngleRad)
										const largeArcFlag = angle > 180 ? 1 : 0
										const pathData = [
											`M ${centerX} ${centerY}`,
											`L ${x1} ${y1}`,
											`A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
											'Z'
										].join(' ')
										return (
											<path
												key={platform}
												d={pathData}
												fill={colors[index % colors.length]}
												opacity={0.8}
											/>
										)
									})
								})()}
								<circle cx="50" cy="50" r="25" fill={palette.cardBg} />
								<text
									x="50"
									y="50"
									textAnchor="middle"
									dominantBaseline="middle"
									fill={palette.textPrimary}
									fontSize="12"
									fontWeight="600"
									style={{ transform: 'rotate(90deg)', transformOrigin: '50px 50px' }}
								>
									{(() => {
										const allPlatforms = [...PLATFORM_OPTIONS, ...Object.keys(insights.byPlatform).filter(p => !PLATFORM_OPTIONS.includes(p))]
										return allPlatforms.reduce((sum, p) => sum + (insights.byPlatform[p] || 0), 0)
									})()}
								</text>
							</svg>
						</div>
						<div style={styles.legend}>
							{PLATFORM_OPTIONS.map((platform, index) => {
								const colors = ['#8b5cf6', '#a855f7', '#6366f1', '#4f46e5']
								return (
									<span key={platform} style={{ ...styles.legendItem, borderLeft: `3px solid ${colors[index % colors.length]}` }}>
										<span style={{ opacity: 0.8 }}>{platform}</span>
										<strong>{insights.byPlatform[platform] || 0}</strong>
									</span>
								)
							})}
							{Object.entries(insights.byPlatform)
								.filter(([platform]) => !PLATFORM_OPTIONS.includes(platform))
								.map(([platform, count], index) => {
									const colors = ['#8b5cf6', '#a855f7', '#6366f1', '#4f46e5']
									return (
										<span key={platform} style={{ ...styles.legendItem, borderLeft: `3px solid ${colors[(PLATFORM_OPTIONS.length + index) % colors.length]}` }}>
											<span style={{ opacity: 0.8 }}>{platform}</span>
											<strong>{count}</strong>
										</span>
									)
								})}
						</div>
					</div>
					{Object.keys(insights.bySkill).length > 0 && (
						<div style={{ ...styles.card, padding: '16px', background: isDark ? 'rgba(34, 197, 94, 0.08)' : 'rgba(34, 197, 94, 0.05)' }}>
							<div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px', color: palette.textPrimary }}>By Skill</div>
							{/* Pie Chart Visualization using SVG */}
							<div style={{ marginBottom: '12px', height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
								<svg width="100" height="100" style={{ transform: 'rotate(-90deg)' }}>
									{Object.entries(insights.bySkill).map(([skill, count], index) => {
										const total = Object.values(insights.bySkill).reduce((sum, val) => sum + val, 0)
										const percentage = (count / total) * 100
										const angle = (count / total) * 360
										const startAngle = Object.values(insights.bySkill).slice(0, index).reduce((sum, val) => sum + (val / total) * 360, 0)
										const colors = ['#2563eb', '#8b5cf6', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4']
										const radius = 40
										const centerX = 50
										const centerY = 50
										const startAngleRad = (startAngle * Math.PI) / 180
										const endAngleRad = ((startAngle + angle) * Math.PI) / 180
										const x1 = centerX + radius * Math.cos(startAngleRad)
										const y1 = centerY + radius * Math.sin(startAngleRad)
										const x2 = centerX + radius * Math.cos(endAngleRad)
										const y2 = centerY + radius * Math.sin(endAngleRad)
										const largeArcFlag = angle > 180 ? 1 : 0
										const pathData = [
											`M ${centerX} ${centerY}`,
											`L ${x1} ${y1}`,
											`A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
											'Z'
										].join(' ')
										return (
											<path
												key={skill}
												d={pathData}
												fill={colors[index % colors.length]}
												opacity={0.8}
											/>
										)
									})}
									<circle cx="50" cy="50" r="25" fill={palette.cardBg} />
									<text
										x="50"
										y="50"
										textAnchor="middle"
										dominantBaseline="middle"
										fill={palette.textPrimary}
										fontSize="12"
										fontWeight="600"
										style={{ transform: 'rotate(90deg)', transformOrigin: '50px 50px' }}
									>
										{Object.values(insights.bySkill).reduce((sum, val) => sum + val, 0)}
									</text>
								</svg>
							</div>
							<div style={styles.legend}>
								{Object.entries(insights.bySkill).map(([skill, count], index) => {
									const colors = ['#2563eb', '#8b5cf6', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4']
									return (
										<span key={skill} style={{ ...styles.legendItem, borderLeft: `3px solid ${colors[index % colors.length]}` }}>
											<span style={{ opacity: 0.8 }}>{skill}</span>
											<strong>{count}</strong>
										</span>
									)
								})}
							</div>
						</div>
					)}
				</div>
			</section>

			{/* Goals Table - Moved to Top */}
			<section style={{ ...styles.card, marginBottom: '24px' }}>
				<h4 style={{ 
					marginTop: 0, 
					marginBottom: '16px',
					display: 'flex',
					alignItems: 'center',
					gap: '8px'
				}}>
					<span style={{ fontSize: '1.2rem' }}>🎯</span>
					Your Learning Goals
				</h4>
				{loadingGoals ? (
					<p style={{ opacity: 0.7, margin: 0 }}>Loading goals...</p>
				) : goals.length === 0 ? (
					<p style={{ opacity: 0.7, margin: 0 }}>No goals yet. Add your first one above.</p>
				) : (
					<table style={styles.table}>
						<thead>
							<tr>
								<th style={{ ...styles.cellFirst, textAlign: 'left' }}>Skill</th>
								<th style={styles.cell}>Type</th>
								<th style={styles.cell}>Platform</th>
								<th style={styles.cell}>Progress</th>
								<th style={styles.cell}>Target Hours</th>
								<th style={styles.cell}>Difficulty</th>
								<th style={styles.cell}>Notes</th>
								<th style={{ ...styles.cellLast, textAlign: 'right' }}>Actions</th>
							</tr>
						</thead>
						<tbody>
							{goals.map(goal => {
								const targetHours = Number(goal.hours) || 0
								const loggedHours = activityHoursByGoal[goal.id] || 0
								const percentRaw = targetHours > 0
									? Math.round((loggedHours / targetHours) * 100)
									: (loggedHours > 0 ? 100 : 0)
								const progressPercent = Math.max(0, percentRaw)
								const progressFillPercent = Math.max(0, Math.min(100, progressPercent))
								const progressFillStyle = {
									...styles.progressFill,
									width: `${progressFillPercent}%`,
									background: progressPercent >= 100
										? 'linear-gradient(90deg, #22c55e, #4ade80)'
										: styles.progressFill.background
								}
								const targetLabel = targetHours > 0
									? `${formatDecimalHours(targetHours)} target`
									: 'No target set'
								return (
									<tr key={goal.id} style={styles.row}>
									<td style={styles.cellFirst}>{goal.skillName}</td>
									<td style={styles.cell}>{RESOURCE_LABEL_MAP[goal.resourceType] || goal.resourceType}</td>
									<td style={styles.cell}>{goal.platform}</td>
									<td style={styles.cell}>
										<div style={styles.progressSelectRow}>
											<select
												style={styles.select}
												value={goal.status}
												onChange={e => updateGoalField(goal.id, 'status', e.target.value, true)}
												onFocus={handleFieldFocus}
												onBlur={handleFieldBlur}
											>
												{STATUS_OPTIONS.map(option => (
													<option key={option.value} value={option.value}>{option.label}</option>
												))}
											</select>
											<span
												style={{
													...styles.badge,
													...(goal.status === 'completed'
														? styles.badgeCompleted
														: goal.status === 'in_progress'
														? styles.badgeProgress
														: styles.badgeStarted)
												}}
											>
												{STATUS_LABEL_MAP[goal.status] || goal.status}
											</span>
										</div>
										<div style={styles.progressTrack}>
											<div style={progressFillStyle} />
										</div>
										<div style={styles.progressMeta}>
											<span>{formatDecimalHours(loggedHours)} logged</span>
											<span>{targetLabel}</span>
											<span>{progressPercent}%</span>
										</div>
									</td>
									<td style={styles.cell}>
										<input
											style={{ ...styles.input, width: '90px' }}
											type="number"
											min="0"
											step="0.5"
											value={goal.hours}
											onChange={e => {
												const value = e.target.value
												updateGoalField(goal.id, 'hours', value === '' ? '' : Number(value))
											}}
											onBlur={event => {
												handleFieldBlur(event)
												void persistGoal(goal.id)
											}}
											onFocus={handleFieldFocus}
										/>
									</td>
									<td style={styles.cell}>
										<input
											style={{ ...styles.input, width: '80px' }}
											type="number"
											min="1"
											max="5"
											step="1"
											value={goal.difficulty}
											onChange={e => {
												const value = e.target.value
												updateGoalField(goal.id, 'difficulty', value === '' ? '' : Number(value))
											}}
											onBlur={event => {
												handleFieldBlur(event)
												void persistGoal(goal.id)
											}}
											onFocus={handleFieldFocus}
										/>
									</td>
									<td style={styles.cell}>
										<button
											type="button"
											style={{
												...styles.button,
												width: '100%',
												padding: '8px 12px',
												fontSize: '0.85rem',
												height: 'auto',
												background: goal.notes ? palette.accentSoft : palette.inputBg,
												border: `1px solid ${goal.notes ? palette.accent : palette.inputBorder}`,
												color: palette.textPrimary,
												cursor: 'pointer',
												borderRadius: '8px',
												transition: 'all 0.2s ease'
											}}
											onClick={() => setViewingGoalNotes(goal)}
											title={goal.notes ? 'View and edit notes' : 'Add notes'}
										>
											{goal.notes ? '📝 View Notes' : '+ Add Notes'}
										</button>
									</td>
									<td style={{ ...styles.cellLast, textAlign: 'right' }}>
										<button
											type="button"
											style={styles.removeBtn}
											onClick={() => void removeGoal(goal.id)}
										>
											Remove
										</button>
									</td>
								</tr>
								)
							})}
						</tbody>
					</table>
				)}
			</section>

			{/* AI-Powered Learning Features Section */}
			<section style={{ ...styles.card, marginBottom: '24px' }}>
				<h4 style={{ 
					marginTop: 0, 
					marginBottom: '16px',
					display: 'flex',
					alignItems: 'center',
					gap: '8px'
				}}>
					<span style={{ fontSize: '1.2rem' }}>🤖</span>
					AI-Powered Learning Tools
				</h4>
				<p style={{ color: palette.textSecondary, marginBottom: '16px' }}>
					Leverage artificial intelligence to get personalized recommendations and intelligent summaries based on your learning journey.
				</p>
				<div style={{
					display: 'grid',
					gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
					gap: '16px'
				}}>
					{/* Resource Recommendations Button */}
					<div style={{
						...styles.card,
						padding: '20px',
						display: 'flex',
						flexDirection: 'column',
						gap: '12px',
						cursor: 'pointer',
						transition: 'all 0.3s ease',
						border: `1px solid ${palette.cardBorder}`,
						background: isDark ? 'rgba(99, 102, 241, 0.08)' : 'rgba(37, 99, 235, 0.05)'
					}}
					onMouseEnter={e => {
						e.currentTarget.style.transform = 'translateY(-4px)'
						e.currentTarget.style.boxShadow = palette.cardShadow
						e.currentTarget.style.borderColor = palette.accent
					}}
					onMouseLeave={e => {
						e.currentTarget.style.transform = 'translateY(0)'
						e.currentTarget.style.boxShadow = 'none'
						e.currentTarget.style.borderColor = palette.cardBorder
					}}
					>
						<h5 style={{ margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '10px', color: palette.textPrimary, fontSize: '1rem' }}>
							<span style={{ fontSize: '1.6rem' }}>📚</span>
							Smart Resource Recommendations
						</h5>
						<p style={{ margin: 0, fontSize: '0.9rem', color: palette.textSecondary, lineHeight: '1.5' }}>
							Get AI-powered suggestions for learning resources based on your past activities, skill level, difficulty progression, and platform preferences.
						</p>
						<button
							type="button"
							style={{
								...styles.button,
								marginTop: '12px',
								alignSelf: 'flex-start',
								fontSize: '0.9rem',
								padding: '10px 16px'
							}}
							onClick={() => navigate('/ai-features?tab=recommendations')}
							onMouseEnter={handlePrimaryHoverEnter}
							onMouseLeave={handlePrimaryHoverLeave}
						>
							Generate Recommendations →
						</button>
					</div>

					{/* Note Summarization Button */}
					<div style={{
						...styles.card,
						padding: '20px',
						display: 'flex',
						flexDirection: 'column',
						gap: '12px',
						cursor: 'pointer',
						transition: 'all 0.3s ease',
						border: `1px solid ${palette.cardBorder}`,
						background: isDark ? 'rgba(168, 85, 247, 0.08)' : 'rgba(168, 85, 247, 0.05)'
					}}
					onMouseEnter={e => {
						e.currentTarget.style.transform = 'translateY(-4px)'
						e.currentTarget.style.boxShadow = palette.cardShadow
						e.currentTarget.style.borderColor = palette.accent
					}}
					onMouseLeave={e => {
						e.currentTarget.style.transform = 'translateY(0)'
						e.currentTarget.style.boxShadow = 'none'
						e.currentTarget.style.borderColor = palette.cardBorder
					}}
					>
						<h5 style={{ margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '10px', color: palette.textPrimary, fontSize: '1rem' }}>
							<span style={{ fontSize: '1.6rem' }}>📝</span>
							Intelligent Note Summarization
						</h5>
						<p style={{ margin: 0, fontSize: '0.9rem', color: palette.textSecondary, lineHeight: '1.5' }}>
							Automatically generate concise summaries and extract key takeaways from your learning notes to reinforce knowledge and identify gaps.
						</p>
						<button
							type="button"
							style={{
								...styles.button,
								marginTop: '12px',
								alignSelf: 'flex-start',
								fontSize: '0.9rem',
								padding: '10px 16px'
							}}
							onClick={() => navigate('/ai-features?tab=summarization')}
							onMouseEnter={handlePrimaryHoverEnter}
							onMouseLeave={handlePrimaryHoverLeave}
						>
							Summarize Notes →
						</button>
					</div>
				</div>
			</section>

			{/* Main Content Grid - Two Column Layout */}
			<div style={{
				display: 'grid',
				gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
				gap: '20px',
				marginBottom: '24px'
			}}>
				{/* Left Column: Creation Actions */}
				<div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
					{/* Add Goal Form */}
				<section style={styles.card}>
						<button
							type="button"
							onClick={() => setExpandedSections(prev => ({ ...prev, addGoal: !prev.addGoal }))}
							style={{
								width: '100%',
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'space-between',
								background: 'transparent',
								border: 'none',
								padding: 0,
								marginBottom: expandedSections.addGoal ? '16px' : 0,
								cursor: 'pointer',
								color: palette.textPrimary
							}}
						>
							<h4 style={{ 
								margin: 0,
								display: 'flex',
								alignItems: 'center',
								gap: '8px'
							}}>
								<span style={{ fontSize: '1.2rem' }}>✨</span>
								Add Learning Goal
							</h4>
							<span style={{ fontSize: '1.2rem', transition: 'transform 0.3s ease', transform: expandedSections.addGoal ? 'rotate(180deg)' : 'rotate(0deg)' }}>
								▼
							</span>
						</button>
						{expandedSections.addGoal && (
					<form onSubmit={addGoal}>
						<div style={styles.formGrid}>
								<div style={{ ...styles.formGroup, gridColumn: 'span 12' }}>
								<label style={styles.label}>Skill name</label>
								<input
									style={styles.input}
									type="text"
									name="skillName"
									placeholder="e.g., React, DS&A, SQL"
									value={form.skillName}
									onChange={handleFormChange}
									required
									onFocus={handleFieldFocus}
									onBlur={handleFieldBlur}
								/>
							</div>
								<div style={{ ...styles.formGroup, gridColumn: 'span 6' }}>
								<label style={styles.label}>Resource type</label>
								<select
									style={styles.select}
									name="resourceType"
									value={form.resourceType}
									onChange={handleFormChange}
									onFocus={handleFieldFocus}
									onBlur={handleFieldBlur}
								>
									{RESOURCE_OPTIONS.map(option => (
										<option key={option.value} value={option.value}>{option.label}</option>
									))}
								</select>
							</div>
								<div style={{ ...styles.formGroup, gridColumn: 'span 6' }}>
								<label style={styles.label}>Platform</label>
								<select
									style={styles.select}
									name="platform"
									value={form.platform}
									onChange={handleFormChange}
									onFocus={handleFieldFocus}
									onBlur={handleFieldBlur}
								>
									{PLATFORM_OPTIONS.map(p => (
										<option key={p} value={p}>{p}</option>
									))}
								</select>
							</div>
								<div style={{ ...styles.formGroup, gridColumn: 'span 4' }}>
								<label style={styles.label}>Progress</label>
								<select
									style={styles.select}
									name="status"
									value={form.status}
									onChange={handleFormChange}
									onFocus={handleFieldFocus}
									onBlur={handleFieldBlur}
								>
									{STATUS_OPTIONS.map(option => (
										<option key={option.value} value={option.value}>{option.label}</option>
									))}
								</select>
							</div>
								<div style={{ ...styles.formGroup, gridColumn: 'span 4' }}>
								<label style={styles.label}>Target hours</label>
								<input
									style={styles.input}
									type="number"
									min="0"
									step="0.5"
									name="hours"
									value={form.hours}
									onChange={handleFormChange}
									onFocus={handleFieldFocus}
									onBlur={handleFieldBlur}
								/>
							</div>
								<div style={{ ...styles.formGroup, gridColumn: 'span 4' }}>
								<label style={styles.label}>Difficulty (1-5)</label>
								<input
									style={styles.input}
									type="number"
									min="1"
									max="5"
									step="1"
									name="difficulty"
									value={form.difficulty}
									onChange={handleFormChange}
									onFocus={handleFieldFocus}
									onBlur={handleFieldBlur}
								/>
							</div>
							<div style={{ ...styles.formGroup, gridColumn: 'span 12' }}>
								<label style={styles.label}>Notes</label>
								<textarea
									style={styles.textarea}
									name="notes"
									rows={2}
									placeholder="Optional notes..."
									value={form.notes}
									onChange={handleFormChange}
									onFocus={handleFieldFocus}
									onBlur={handleFieldBlur}
								/>
							</div>
							<div style={{ gridColumn: 'span 12', display: 'flex', justifyContent: 'flex-end' }}>
								<button
									type="submit"
									style={styles.button}
									onMouseEnter={handlePrimaryHoverEnter}
									onMouseLeave={handlePrimaryHoverLeave}
								>
									Add Goal
								</button>
							</div>
						</div>
					</form>
						)}
				</section>

				{/* Import Course */}
					<section style={styles.card} ref={courseImportRef}>
						<button
							type="button"
							onClick={() => setExpandedSections(prev => ({ ...prev, courseImport: !prev.courseImport }))}
							style={{
								width: '100%',
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'space-between',
								background: 'transparent',
								border: 'none',
								padding: 0,
								marginBottom: expandedSections.courseImport ? '16px' : 0,
								cursor: 'pointer',
								color: palette.textPrimary
							}}
						>
							<h4 style={{ 
								margin: 0,
								display: 'flex',
								alignItems: 'center',
								gap: '8px'
							}}>
								<span style={{ fontSize: '1.2rem' }}>📚</span>
								Import Course From URL
							</h4>
							<span style={{ fontSize: '1.2rem', transition: 'transform 0.3s ease', transform: expandedSections.courseImport ? 'rotate(180deg)' : 'rotate(0deg)' }}>
								▼
							</span>
						</button>
						{expandedSections.courseImport && (
							<>
					<form onSubmit={submitCourseImport}>
						<div style={styles.formGrid}>
								<div style={{ ...styles.formGroup, gridColumn: 'span 12' }}>
								<label style={styles.label}>Course URL</label>
								<input
									style={styles.input}
									type="url"
									name="importUrl"
									placeholder="https://..."
									value={courseImportState.url}
									onChange={handleCourseImportChange}
									required
									onFocus={handleFieldFocus}
									onBlur={handleFieldBlur}
								/>
							</div>
								<div style={{ gridColumn: 'span 12', display: 'flex', justifyContent: 'flex-end' }}>
								<button
									type="submit"
									style={styles.button}
									disabled={courseImportState.loading}
									onMouseEnter={handlePrimaryHoverEnter}
									onMouseLeave={handlePrimaryHoverLeave}
								>
									{courseImportState.loading ? 'Importing…' : 'Import Course'}
								</button>
							</div>
						</div>
					</form>
					{courseImportState.latest && (
							<div style={{ marginTop: '16px', padding: '12px', background: palette.accentSoft, borderRadius: '10px' }}>
								<h5 style={{ margin: '0 0 8px', fontSize: '0.9rem', color: palette.textSecondary }}>Latest import</h5>
							<div style={styles.courseCard}>
								<div style={styles.courseProvider}>{courseImportState.latest.provider}</div>
								<div style={styles.courseTitle}>{courseImportState.latest.title}</div>
								{courseImportState.latest.description && (
									<p style={{ margin: 0, opacity: 0.75, fontSize: '0.85rem' }}>
										{courseImportState.latest.description.slice(0, 160)}
										{courseImportState.latest.description.length > 160 ? '…' : ''}
									</p>
								)}
								<a
									href={courseImportState.latest.url}
									target="_blank"
									rel="noreferrer"
										style={{ fontSize: '0.85rem', color: palette.accent, textDecoration: 'none', fontWeight: 600 }}
								>
										Open course →
								</a>
							</div>
						</div>
					)}
					{importedCourses.length > 0 && (
						<div style={{ marginTop: '16px' }}>
								<h5 style={{ margin: '0 0 12px', fontSize: '0.9rem', color: palette.textSecondary }}>Recent imports</h5>
							<div style={styles.courseList}>
								{importedCourses.map(course => (
									<div key={course.id} style={styles.courseCard}>
										<div style={styles.courseProvider}>{course.provider}</div>
										<div style={styles.courseTitle}>{course.title}</div>
										<a
											href={course.url}
											target="_blank"
											rel="noreferrer"
												style={{ fontSize: '0.85rem', color: palette.accent, textDecoration: 'none', fontWeight: 600 }}
										>
												View course →
										</a>
									</div>
								))}
							</div>
						</div>
					)}
						</>
						)}
				</section>
				</div>

				{/* Right Column: Activity & Summary */}
				<div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
					{/* Activity Log Form */}
				<section style={styles.card}>
					<button
						type="button"
							onClick={() => setExpandedSections(prev => ({ ...prev, logActivity: !prev.logActivity }))}
							style={{
								width: '100%',
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'space-between',
								background: 'transparent',
								border: 'none',
								padding: 0,
								marginBottom: expandedSections.logActivity ? '16px' : 0,
								cursor: 'pointer',
								color: palette.textPrimary
							}}
						>
							<h4 style={{ 
								margin: 0,
								display: 'flex',
								alignItems: 'center',
								gap: '8px'
							}}>
								<span style={{ fontSize: '1.2rem' }}>📝</span>
								Log Learning Activity
							</h4>
							<span style={{ fontSize: '1.2rem', transition: 'transform 0.3s ease', transform: expandedSections.logActivity ? 'rotate(180deg)' : 'rotate(0deg)' }}>
								▼
							</span>
					</button>
						{expandedSections.logActivity && (
					<form onSubmit={submitActivity}>
						<div style={styles.formGrid}>
								<div style={{ ...styles.formGroup, gridColumn: 'span 12' }}>
								<label style={styles.label}>Goal</label>
								<select
									style={styles.select}
									name="goalId"
									value={activityForm.goalId}
									onChange={handleActivityFormChange}
									onFocus={handleFieldFocus}
									onBlur={handleFieldBlur}
								>
									<option value="">Select goal</option>
									{goals.map(goal => (
										<option key={goal.id} value={goal.id}>
											{goal.skillName}
										</option>
									))}
								</select>
							</div>
								<div style={{ ...styles.formGroup, gridColumn: 'span 6' }}>
								<label style={styles.label}>Date</label>
								<input
									style={styles.input}
									type="date"
									name="performedOn"
									value={activityForm.performedOn}
									onChange={handleActivityFormChange}
									required
									onFocus={handleFieldFocus}
									onBlur={handleFieldBlur}
								/>
							</div>
								<div style={{ ...styles.formGroup, gridColumn: 'span 6' }}>
								<label style={styles.label}>Hours</label>
								<input
									style={styles.input}
									type="number"
									min="0"
									step="0.25"
									name="hours"
									value={activityForm.hours}
									onChange={handleActivityFormChange}
									required
									onFocus={handleFieldFocus}
									onBlur={handleFieldBlur}
								/>
							</div>
							<div style={{ ...styles.formGroup, gridColumn: 'span 12' }}>
								<label style={styles.label}>Notes</label>
								<textarea
									style={styles.textarea}
									name="notes"
									rows={2}
									placeholder="What did you work on?"
									value={activityForm.notes}
									onChange={handleActivityFormChange}
									onFocus={handleFieldFocus}
									onBlur={handleFieldBlur}
								/>
							</div>
							<div style={{ gridColumn: 'span 12', display: 'flex', justifyContent: 'flex-end' }}>
								<button
									type="submit"
									style={styles.button}
									onMouseEnter={handlePrimaryHoverEnter}
									onMouseLeave={handlePrimaryHoverLeave}
								>
									Log Activity
								</button>
							</div>
						</div>
					</form>
						)}
					</section>

					{/* Weekly Summary */}
					<section style={styles.card} ref={weeklySummaryRef}>
						<button
							type="button"
							onClick={() => setExpandedSections(prev => ({ ...prev, weeklySummary: !prev.weeklySummary }))}
							style={{
								width: '100%',
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'space-between',
								background: 'transparent',
								border: 'none',
								padding: 0,
								marginBottom: expandedSections.weeklySummary ? '12px' : 0,
								cursor: 'pointer',
								color: palette.textPrimary
							}}
						>
							<h4 style={{ 
								margin: 0,
								display: 'flex',
								alignItems: 'center',
								gap: '8px'
							}}>
								<span style={{ fontSize: '1.2rem' }}>📊</span>
								Weekly Summary
							</h4>
							<span style={{ fontSize: '1.2rem', transition: 'transform 0.3s ease', transform: expandedSections.weeklySummary ? 'rotate(180deg)' : 'rotate(0deg)' }}>
								▼
							</span>
						</button>
						{expandedSections.weeklySummary && (
							<>
							<p style={{ marginTop: 0, marginBottom: '16px', opacity: 0.75, fontSize: '0.9rem' }}>
								Preview your past 7 days of activity or send the summary to your registered email address.
							</p>
							<div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
							<button
								type="button"
								style={styles.button}
								onClick={() => triggerWeeklySummary(false)}
								disabled={weeklySummaryState.loading}
								onMouseEnter={handlePrimaryHoverEnter}
								onMouseLeave={handlePrimaryHoverLeave}
							>
								{weeklySummaryState.loading ? 'Generating…' : 'Preview Weekly Summary'}
							</button>
							<button
								type="button"
								style={{ ...styles.button, background: palette.successGradient }}
								onClick={() => triggerWeeklySummary(true)}
								disabled={weeklySummaryState.loading}
								onMouseEnter={handlePrimaryHoverEnter}
								onMouseLeave={handlePrimaryHoverLeave}
							>
								{weeklySummaryState.loading ? 'Sending…' : 'Send Summary Email'}
							</button>
							</div>
							{weeklySummaryState.data && (
								<div style={{ marginTop: '16px', padding: '12px', background: palette.accentSoft, borderRadius: '10px' }}>
									<div style={{ fontSize: '0.85rem', opacity: 0.7, marginBottom: '8px' }}>
										Generated {formatDisplayDate(weeklySummaryState.data.generated_at)}
									</div>
									<div style={{ fontSize: '0.85rem', color: palette.textSecondary, marginBottom: '8px' }}>
										{weeklySummaryState.data.email_requested
											? weeklySummaryState.data.sent_to === 'not-configured'
												? 'Email delivery requested, but no registered email is configured.'
												: (
													<>
														Summary emailed to{' '}
														<strong style={{ color: palette.textPrimary }}>{weeklySummaryState.data.sent_to}</strong>
													</>
												)
											: 'Email delivery was not requested.'}
									</div>
									<ul style={{ paddingLeft: '20px', margin: '8px 0', fontSize: '0.9rem' }}>
										<li>Goals updated: {weeklySummaryState.data.goals_updated}</li>
										<li>Activities logged: {weeklySummaryState.data.activities_logged}</li>
										<li>Total hours: {formatDecimalHours(weeklySummaryState.data.hours_logged)}</li>
									</ul>
									{weeklySummaryState.data.recent_goals?.length > 0 && (
										<div style={{ fontSize: '0.85rem', opacity: 0.75, marginTop: '8px' }}>
											<strong>Highlights:</strong>
											<ul style={{ paddingLeft: '18px', margin: '6px 0' }}>
												{weeklySummaryState.data.recent_goals.map((goal, index) => (
													<li key={`${goal.skill_name}-${index}`}>
														{goal.skill_name} — {STATUS_LABEL_MAP[goal.status] || goal.status}{' '}
														{goal.platform ? `on ${goal.platform}` : ''}
													</li>
												))}
											</ul>
										</div>
									)}
								</div>
							)}
							</>
						)}
					</section>
				</div>
			</div>

			{/* Activity Timeline - Full Width */}
			<section style={{ ...styles.card, marginBottom: '24px' }}>
				<h4 style={{ 
					marginTop: 0, 
					marginBottom: '16px',
					display: 'flex',
					alignItems: 'center',
					gap: '8px'
				}}>
					<span style={{ fontSize: '1.2rem' }}>⏱️</span>
					Activity Timeline
				</h4>
					<div style={{ marginTop: '18px' }}>
						{loadingActivities ? (
							<p style={{ opacity: 0.7, margin: 0 }}>Loading timeline…</p>
						) : timelineGroups.length === 0 ? (
							<p style={{ opacity: 0.7, margin: 0 }}>No activities yet. Log your first update above.</p>
						) : (
							timelineGroups.map(group => (
								<div key={group.date} style={styles.timelineGroup}>
									<div style={styles.timelineDot} />
									<div style={styles.timelineLine} />
									<div style={styles.timelineDate}>{formatDisplayDate(group.date)}</div>
									{group.items.map(item => (
										<div key={item.id} style={styles.timelineItem}>
											<div style={styles.timelineGoal}>{item.goal?.skill_name || 'Goal removed'}</div>
											<div style={styles.timelineMeta}>
												<span>{formatDecimalHours(item.hours)}</span>
												{item.goal?.platform && <span>{item.goal.platform}</span>}
												{item.goal?.status && <span>{STATUS_LABEL_MAP[item.goal.status] || item.goal.status}</span>}
											</div>
											{item.notes && (
												<p style={{ marginTop: '6px', opacity: 0.85 }}>{item.notes}</p>
											)}
										</div>
									))}
								</div>
							))
						)}
					</div>
				</section>

			{/* Goal Notes Modal */}
			{viewingGoalNotes && (() => {
				const { entries, mainNotes } = parseGoalNotes(viewingGoalNotes.notes)
				const hasActivityNotes = entries.length > 0

				return (
					<div style={{
						position: 'fixed',
						top: 0,
						left: 0,
						right: 0,
						bottom: 0,
						background: 'rgba(0, 0, 0, 0.5)',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						zIndex: 1000,
						backdropFilter: 'blur(4px)'
					}}>
						<div style={{
							background: palette.cardBg,
							border: `1px solid ${palette.cardBorder}`,
							borderRadius: '16px',
							padding: '32px',
							maxWidth: '600px',
							width: '90%',
							maxHeight: '80vh',
							overflowY: 'auto',
							boxShadow: palette.cardShadow
						}}>
							<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
								<h3 style={{ margin: 0, fontSize: '1.3rem' }}>
									📝 {viewingGoalNotes.skillName} Notes
								</h3>
								<button
									type="button"
									style={{
										background: 'transparent',
										border: 'none',
										fontSize: '1.5rem',
										cursor: 'pointer',
										color: palette.textSecondary,
										padding: '0',
										width: '32px',
										height: '32px',
										display: 'flex',
										alignItems: 'center',
										justifyContent: 'center'
									}}
									onClick={() => setViewingGoalNotes(null)}
								>
									✕
								</button>
							</div>

							{/* Main Notes Section */}
							<div style={{ marginBottom: '24px' }}>
								<label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: '8px', color: palette.textSecondary }}>
									Main Notes
								</label>
								<textarea
									style={{
										...styles.textarea,
										width: '100%',
										minHeight: '100px',
										fontFamily: "'Segoe UI', sans-serif",
										fontSize: '0.95rem'
									}}
									value={mainNotes}
									onChange={e => {
										const newNotes = hasActivityNotes
											? `${e.target.value}\n\n${entries.map(entry => `[${entry.timestamp}] ${entry.text}`).join('\n\n')}`
											: e.target.value
										updateGoalField(viewingGoalNotes.id, 'notes', newNotes)
									}}
									onBlur={() => void persistGoal(viewingGoalNotes.id)}
									placeholder="Write your main notes here..."
								/>
								<p style={{ fontSize: '0.8rem', color: palette.textSecondary, marginTop: '4px', margin: 0 }}>
									These are your personal notes. Activity notes are automatically added below.
								</p>
							</div>

							{/* Activity Notes Timeline */}
							{hasActivityNotes && (
								<div>
									<h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '12px', color: palette.textSecondary, margin: '0 0 12px' }}>
										Activity Notes ({entries.length})
									</h4>
									<div style={{
										background: palette.inputBg,
										border: `1px solid ${palette.inputBorder}`,
										borderRadius: '12px',
										padding: '12px',
										maxHeight: '300px',
										overflowY: 'auto'
									}}>
										{entries.map((entry, idx) => (
											<div key={idx} style={{
												paddingBottom: '12px',
												marginBottom: '12px',
												borderBottom: idx < entries.length - 1 ? `1px solid ${palette.cardBorder}` : 'none',
												fontSize: '0.9rem'
											}}>
												<div style={{
													display: 'flex',
													justifyContent: 'space-between',
													alignItems: 'flex-start',
													marginBottom: '4px'
												}}>
													<span style={{
														fontWeight: 600,
														color: palette.accent,
														fontFamily: 'monospace',
														fontSize: '0.85rem'
													}}>
														{entry.timestamp}
													</span>
													{entry.isUpdate && (
														<span style={{
															background: palette.warningBg,
															color: palette.alertText,
															padding: '2px 6px',
															borderRadius: '4px',
															fontSize: '0.75rem',
															fontWeight: 600
														}}>
															Updated
														</span>
													)}
												</div>
												<p style={{
													margin: 0,
													color: palette.textPrimary,
													lineHeight: 1.5,
													wordBreak: 'break-word'
												}}>
													{entry.text.replace('(updated)', '').trim()}
												</p>
											</div>
										))}
									</div>
									<p style={{
										fontSize: '0.8rem',
										color: palette.textSecondary,
										marginTop: '8px',
										margin: '8px 0 0'
									}}>
										Notes are automatically added when you log learning activities.
									</p>
								</div>
							)}

							{/* Action Buttons */}
							<div style={{
								display: 'flex',
								gap: '10px',
								marginTop: '20px',
								justifyContent: 'flex-end'
							}}>
								<button
									type="button"
									style={{
										...styles.button,
										background: palette.inputBg,
										border: `1px solid ${palette.inputBorder}`,
										color: palette.textPrimary
									}}
									onClick={() => setViewingGoalNotes(null)}
									onMouseEnter={e => {
										e.currentTarget.style.background = palette.accentSoft
									}}
									onMouseLeave={e => {
										e.currentTarget.style.background = palette.inputBg
									}}
								>
									Close
								</button>
								<button
									type="button"
									style={styles.button}
									onMouseEnter={handlePrimaryHoverEnter}
									onMouseLeave={handlePrimaryHoverLeave}
									onClick={() => {
										void persistGoal(viewingGoalNotes.id)
										setViewingGoalNotes(null)
									}}
								>
									Save & Close
								</button>
							</div>
						</div>
					</div>
				)
			})()}

    </div>
  )
}
