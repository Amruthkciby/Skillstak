import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const API_BASE_URL = 'http://127.0.0.1:8000/mainapp/learning-goals/'
const COURSE_IMPORT_URL = 'http://127.0.0.1:8000/mainapp/course-import/'
const LEARNING_ACTIVITIES_URL = 'http://127.0.0.1:8000/mainapp/learning-activities/'
const WEEKLY_SUMMARY_URL = 'http://127.0.0.1:8000/mainapp/learning-summary/send-weekly/'

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

export default function Dashboard() {
	// ---------------------------- State & Model ----------------------------
	const navigate = useNavigate()
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
	const pendingUpdates = useRef({})
	const authRedirectScheduled = useRef(false)

	function handleAuthError(response, data) {
		if (response.status === 401 || response.status === 403) {
			const detail =
				typeof data === 'string'
					? data
					: data?.detail || 'Session expired. Please log in again.'
			setApiError(detail)
			setSyncError(detail)
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

		loadGoals()
		loadActivities()

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

	async function triggerWeeklySummary() {
		setWeeklySummaryState({ loading: true, error: '', data: null })
		try {
			const response = await fetch(WEEKLY_SUMMARY_URL, {
				method: 'POST',
				headers: getAuthHeaders(true),
				body: JSON.stringify({})
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
		localStorage.removeItem('access_token')
		localStorage.removeItem('refresh_token')
		navigate('/login', { replace: true })
	}

	// ---------------------------- Insights ----------------------------
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
		const totalHoursRaw = goals.reduce((sum, goal) => sum + (Number(goal.hours) || 0), 0)
		const totalHours = Math.round(totalHoursRaw * 10) / 10
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
			totalHours,
			averageDifficulty,
			completionRate,
			byResourceType,
			byPlatform,
			bySkill
		}
	}, [goals])

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
			background: '#0b1020',
			minHeight: '100vh',
			color: '#e6e8ef',
			fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif'
		},
		header: {
			display: 'flex',
			alignItems: 'center',
			justifyContent: 'space-between',
			marginBottom: '16px'
		},
		headerLeft: { display: 'flex', flexDirection: 'column', gap: '4px' },
		headerActions: { display: 'flex', alignItems: 'center', gap: '10px' },
		title: { margin: 0, fontWeight: 700, letterSpacing: '0.2px' },
		subtitle: { margin: 0, opacity: 0.7, fontSize: '12px' },
		alert: {
			marginBottom: '16px',
			padding: '12px 16px',
			borderRadius: '12px',
			fontSize: '0.95rem',
			border: '1px solid transparent'
		},
		alertError: {
			background: 'rgba(248,113,113,0.18)',
			borderColor: 'rgba(248,113,113,0.35)',
			color: '#fecaca'
		},
		grid: {
			display: 'grid',
			gridTemplateColumns: '1fr',
			gap: '16px'
		},
		sectionGrid: {
			display: 'grid',
			gridTemplateColumns: '1fr',
			gap: '16px'
		},
		card: {
			background: 'linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
			border: '1px solid rgba(255,255,255,0.12)',
			borderRadius: '14px',
			padding: '16px',
			boxShadow: '0 10px 30px rgba(0,0,0,0.25)'
		},
		formGrid: {
			display: 'grid',
			gridTemplateColumns: 'repeat(12, 1fr)',
			gap: '12px',
			alignItems: 'end'
		},
		formGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
		label: { fontSize: '12px', opacity: 0.8 },
		input: {
			background: 'rgba(10, 14, 30, 0.8)',
			border: '1px solid rgba(255,255,255,0.15)',
			borderRadius: '10px',
			padding: '10px 12px',
			color: '#e6e8ef',
			outline: 'none'
		},
		select: {
			background: 'rgba(10, 14, 30, 0.8)',
			border: '1px solid rgba(255,255,255,0.15)',
			borderRadius: '10px',
			padding: '10px 12px',
			color: '#e6e8ef',
			outline: 'none'
		},
		textarea: {
			background: 'rgba(10, 14, 30, 0.8)',
			border: '1px solid rgba(255,255,255,0.15)',
			borderRadius: '10px',
			padding: '10px 12px',
			color: '#e6e8ef',
			outline: 'none',
			resize: 'vertical'
		},
		button: {
			background: 'linear-gradient(180deg, #7c5cff, #6246ea)',
			border: 'none',
			color: '#fff',
			borderRadius: '10px',
			padding: '10px 14px',
			cursor: 'pointer',
			fontWeight: 600
		},
		logoutButton: {
			background: 'transparent',
			color: '#f8fafc',
			border: '1px solid rgba(255,255,255,0.25)',
			borderRadius: '999px',
			padding: '8px 16px',
			fontWeight: 600,
			cursor: 'pointer',
			transition: 'all 0.25s ease',
			boxShadow: '0 6px 18px rgba(124,92,255,0.25)'
		},
		statsGrid: {
			display: 'grid',
			gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
			gap: '12px'
		},
		statCard: {
			background: 'rgba(255,255,255,0.04)',
			border: '1px solid rgba(255,255,255,0.1)',
			borderRadius: '12px',
			padding: '12px'
		},
		statLabel: { fontSize: '12px', opacity: 0.7 },
		statValue: { fontSize: '22px', fontWeight: 700 },
		table: {
			width: '100%',
			borderCollapse: 'separate',
			borderSpacing: '0 10px'
		},
		row: {
			background: 'rgba(255,255,255,0.04)'
		},
		cell: {
			padding: '10px 12px',
			borderTop: '1px solid rgba(255,255,255,0.08)',
			borderBottom: '1px solid rgba(255,255,255,0.08)'
		},
		cellFirst: {
			padding: '10px 12px',
			borderTop: '1px solid rgba(255,255,255,0.08)',
			borderBottom: '1px solid rgba(255,255,255,0.08)',
			borderLeft: '1px solid rgba(255,255,255,0.08)',
			borderTopLeftRadius: '10px',
			borderBottomLeftRadius: '10px'
		},
		cellLast: {
			padding: '10px 12px',
			borderTop: '1px solid rgba(255,255,255,0.08)',
			borderBottom: '1px solid rgba(255,255,255,0.08)',
			borderRight: '1px solid rgba(255,255,255,0.08)',
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
		badgeStarted: { background: 'rgba(255, 193, 7, 0.15)', color: '#ffd670' },
		badgeProgress: { background: 'rgba(13, 110, 253, 0.15)', color: '#89b4ff' },
		badgeCompleted: { background: 'rgba(25, 135, 84, 0.2)', color: '#73e2a7' },
		legend: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
		legendItem: {
			display: 'inline-flex',
			alignItems: 'center',
			gap: '6px',
			background: 'rgba(255,255,255,0.05)',
			border: '1px solid rgba(255,255,255,0.08)',
			padding: '6px 8px',
			borderRadius: '999px',
			fontSize: '12px'
		},
		removeBtn: {
			background: 'transparent',
			border: '1px solid rgba(255,255,255,0.2)',
			color: '#e6e8ef',
			borderRadius: '8px',
			padding: '6px 10px',
			cursor: 'pointer'
		},
		courseList: {
			display: 'grid',
			gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
			gap: '12px',
			marginTop: '12px'
		},
		courseCard: {
			background: 'rgba(15, 23, 42, 0.65)',
			border: '1px solid rgba(255,255,255,0.08)',
			borderRadius: '12px',
			padding: '12px',
			display: 'flex',
			flexDirection: 'column',
			gap: '8px'
		},
		courseTitle: { fontWeight: 600, fontSize: '0.95rem' },
		courseProvider: {
			fontSize: '0.8rem',
			opacity: 0.7,
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
			background: 'rgba(124,92,255,0.35)'
		},
		timelineDot: {
			position: 'absolute',
			left: 0,
			top: '4px',
			width: '12px',
			height: '12px',
			borderRadius: '999px',
			background: 'linear-gradient(180deg, #7c5cff, #6246ea)',
			boxShadow: '0 0 0 4px rgba(124,92,255,0.25)'
		},
		timelineDate: {
			fontWeight: 600,
			marginBottom: '8px',
			fontSize: '0.9rem'
		},
		timelineItem: {
			background: 'rgba(255,255,255,0.04)',
			border: '1px solid rgba(255,255,255,0.08)',
			borderRadius: '10px',
			padding: '10px 12px',
			marginBottom: '8px'
		},
		timelineGoal: {
			fontWeight: 600,
			fontSize: '0.95rem',
			marginBottom: '4px'
		},
		timelineMeta: {
			fontSize: '0.8rem',
			opacity: 0.75,
			display: 'flex',
			gap: '12px',
			flexWrap: 'wrap'
		}
	}

	// ---------------------------- UI ----------------------------
  return (
		<div style={styles.page}>
			<div style={styles.header}>
				<div style={styles.headerLeft}>
					<h3 style={styles.title}>Learning Goals Dashboard</h3>
					<p style={styles.subtitle}>Track goals, progress, time, and insights</p>
				</div>
				<div style={styles.headerActions}>
					<button
						type="button"
						style={styles.logoutButton}
						onMouseEnter={event => {
							event.target.style.background = 'rgba(124,92,255,0.18)'
							event.target.style.color = '#dbe4ff'
						}}
						onMouseLeave={event => {
							event.target.style.background = 'transparent'
							event.target.style.color = '#f8fafc'
						}}
						onClick={handleLogout}
					>
						Logout
					</button>
				</div>
			</div>

			{apiError && (
				<div style={{ ...styles.alert, ...styles.alertError }}>{apiError}</div>
			)}
			{syncError && (
				<div style={{ ...styles.alert, ...styles.alertError }}>{syncError}</div>
			)}
			{activitiesError && (
				<div style={{ ...styles.alert, ...styles.alertError }}>{activitiesError}</div>
			)}
			{courseImportState.error && (
				<div style={{ ...styles.alert, ...styles.alertError }}>{courseImportState.error}</div>
			)}
			{weeklySummaryState.error && (
				<div style={{ ...styles.alert, ...styles.alertError }}>{weeklySummaryState.error}</div>
			)}

			<div style={styles.grid}>
				{/* Add Goal */}
				<section style={styles.card}>
					<h4 style={{ marginTop: 0, marginBottom: '12px' }}>Add Learning Goal</h4>
					<form onSubmit={addGoal}>
						<div style={styles.formGrid}>
							<div style={{ ...styles.formGroup, gridColumn: 'span 3' }}>
								<label style={styles.label}>Skill name</label>
								<input
									style={styles.input}
									type="text"
									name="skillName"
									placeholder="e.g., React, DS&A, SQL"
									value={form.skillName}
									onChange={handleFormChange}
									required
								/>
							</div>
							<div style={{ ...styles.formGroup, gridColumn: 'span 2' }}>
								<label style={styles.label}>Resource type</label>
								<select
									style={styles.select}
									name="resourceType"
									value={form.resourceType}
									onChange={handleFormChange}
								>
									{RESOURCE_OPTIONS.map(option => (
										<option key={option.value} value={option.value}>{option.label}</option>
									))}
								</select>
							</div>
							<div style={{ ...styles.formGroup, gridColumn: 'span 2' }}>
								<label style={styles.label}>Platform</label>
								<select
									style={styles.select}
									name="platform"
									value={form.platform}
									onChange={handleFormChange}
								>
									{PLATFORM_OPTIONS.map(p => (
										<option key={p} value={p}>{p}</option>
									))}
								</select>
							</div>
							<div style={{ ...styles.formGroup, gridColumn: 'span 2' }}>
								<label style={styles.label}>Progress</label>
								<select
									style={styles.select}
									name="status"
									value={form.status}
									onChange={handleFormChange}
								>
									{STATUS_OPTIONS.map(option => (
										<option key={option.value} value={option.value}>{option.label}</option>
									))}
								</select>
							</div>
							<div style={{ ...styles.formGroup, gridColumn: 'span 1' }}>
								<label style={styles.label}>Hours</label>
								<input
									style={styles.input}
									type="number"
									min="0"
									step="0.5"
									name="hours"
									value={form.hours}
									onChange={handleFormChange}
								/>
							</div>
							<div style={{ ...styles.formGroup, gridColumn: 'span 2' }}>
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
								/>
							</div>
							<div style={{ gridColumn: 'span 12', display: 'flex', justifyContent: 'flex-end' }}>
								<button type="submit" style={styles.button}>Add Goal</button>
							</div>
						</div>
					</form>
				</section>

				{/* Import Course */}
				<section style={styles.card}>
					<h4 style={{ marginTop: 0, marginBottom: '12px' }}>Import Course From URL</h4>
					<form onSubmit={submitCourseImport}>
						<div style={styles.formGrid}>
							<div style={{ ...styles.formGroup, gridColumn: 'span 9' }}>
								<label style={styles.label}>Course URL</label>
								<input
									style={styles.input}
									type="url"
									name="importUrl"
									placeholder="https://..."
									value={courseImportState.url}
									onChange={handleCourseImportChange}
									required
								/>
							</div>
							<div style={{ gridColumn: 'span 3', display: 'flex', justifyContent: 'flex-end' }}>
								<button type="submit" style={styles.button} disabled={courseImportState.loading}>
									{courseImportState.loading ? 'Importing…' : 'Import Course'}
								</button>
							</div>
						</div>
					</form>
					{courseImportState.latest && (
						<div style={{ marginTop: '16px' }}>
							<h5 style={{ margin: '0 0 8px' }}>Latest import</h5>
							<div style={styles.courseCard}>
								<div style={styles.courseProvider}>{courseImportState.latest.provider}</div>
								<div style={styles.courseTitle}>{courseImportState.latest.title}</div>
								{courseImportState.latest.description && (
									<p style={{ margin: 0, opacity: 0.75, fontSize: '0.85rem' }}>
										{courseImportState.latest.description.slice(0, 160)}
										{courseImportState.latest.description.length > 160 ? '…' : ''}
									</p>
								)}
								<a href={courseImportState.latest.url} target="_blank" rel="noreferrer" style={{ fontSize: '0.85rem', color: '#89b4ff' }}>
									Open course
								</a>
							</div>
						</div>
					)}
					{importedCourses.length > 0 && (
						<div style={{ marginTop: '16px' }}>
							<h5 style={{ margin: '0 0 8px' }}>Recent imports</h5>
							<div style={styles.courseList}>
								{importedCourses.map(course => (
									<div key={course.id} style={styles.courseCard}>
										<div style={styles.courseProvider}>{course.provider}</div>
										<div style={styles.courseTitle}>{course.title}</div>
										<a href={course.url} target="_blank" rel="noreferrer" style={{ fontSize: '0.85rem', color: '#89b4ff' }}>
											View course
										</a>
									</div>
								))}
							</div>
						</div>
					)}
				</section>

				{/* Weekly summary */}
				<section style={styles.card}>
					<h4 style={{ marginTop: 0, marginBottom: '12px' }}>Weekly Summary Email (Mock)</h4>
					<p style={{ marginTop: 0, marginBottom: '12px', opacity: 0.75, fontSize: '0.9rem' }}>
						Generate a weekly digest of progress. The backend logs this to the server console to simulate an email send.
					</p>
					<button
						type="button"
						style={styles.button}
						onClick={triggerWeeklySummary}
						disabled={weeklySummaryState.loading}
					>
						{weeklySummaryState.loading ? 'Generating…' : 'Send Weekly Summary'}
					</button>
					{weeklySummaryState.data && (
						<div style={{ marginTop: '16px' }}>
							<div style={{ fontSize: '0.85rem', opacity: 0.7 }}>
								Generated {formatDisplayDate(weeklySummaryState.data.generated_at)}
							</div>
							<ul style={{ paddingLeft: '20px', margin: '8px 0', fontSize: '0.9rem' }}>
								<li>Goals updated: {weeklySummaryState.data.goals_updated}</li>
								<li>Activities logged: {weeklySummaryState.data.activities_logged}</li>
								<li>Total hours: {formatDecimalHours(weeklySummaryState.data.hours_logged)}</li>
							</ul>
							{weeklySummaryState.data.recent_goals?.length > 0 && (
								<div style={{ fontSize: '0.85rem', opacity: 0.75 }}>
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
				</section>

				{/* Activity timeline */}
				<section style={styles.card}>
					<h4 style={{ marginTop: 0, marginBottom: '12px' }}>Timeline & Activity Log</h4>
					<form onSubmit={submitActivity}>
						<div style={styles.formGrid}>
							<div style={{ ...styles.formGroup, gridColumn: 'span 4' }}>
								<label style={styles.label}>Goal</label>
								<select
									style={styles.select}
									name="goalId"
									value={activityForm.goalId}
									onChange={handleActivityFormChange}
								>
									<option value="">Select goal</option>
									{goals.map(goal => (
										<option key={goal.id} value={goal.id}>
											{goal.skillName}
										</option>
									))}
								</select>
							</div>
							<div style={{ ...styles.formGroup, gridColumn: 'span 3' }}>
								<label style={styles.label}>Date</label>
								<input
									style={styles.input}
									type="date"
									name="performedOn"
									value={activityForm.performedOn}
									onChange={handleActivityFormChange}
									required
								/>
							</div>
							<div style={{ ...styles.formGroup, gridColumn: 'span 2' }}>
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
								/>
							</div>
							<div style={{ gridColumn: 'span 12', display: 'flex', justifyContent: 'flex-end' }}>
								<button type="submit" style={styles.button}>Log Activity</button>
							</div>
						</div>
					</form>
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

				{/* Insights */}
				<section style={styles.card}>
					<h4 style={{ marginTop: 0, marginBottom: '12px' }}>Skill Growth Insights</h4>
					<div style={styles.statsGrid}>
						<div style={styles.statCard}>
							<div style={styles.statLabel}>Total Goals</div>
							<div style={styles.statValue}>{insights.total}</div>
						</div>
						<div style={styles.statCard}>
							<div style={styles.statLabel}>Completed</div>
							<div style={styles.statValue}>{insights.completed} ({insights.completionRate}%)</div>
						</div>
						<div style={styles.statCard}>
							<div style={styles.statLabel}>Total Hours</div>
							<div style={styles.statValue}>{insights.totalHours}</div>
						</div>
						<div style={styles.statCard}>
							<div style={styles.statLabel}>Avg. Difficulty</div>
							<div style={styles.statValue}>{insights.averageDifficulty}</div>
						</div>
					</div>

					<div style={{ height: '12px' }} />

					<div style={styles.sectionGrid}>
						<div style={{ ...styles.card, padding: '12px' }}>
							<div style={{ fontSize: '12px', opacity: 0.8, marginBottom: '8px' }}>By Resource Type</div>
							<div style={styles.legend}>
								{RESOURCE_OPTIONS.map(option => (
									<span key={option.value} style={styles.legendItem}>
										<span style={{ opacity: 0.8 }}>{option.label}</span>
										<strong>{insights.byResourceType[option.value] || 0}</strong>
									</span>
								))}
							</div>
						</div>
						<div style={{ ...styles.card, padding: '12px' }}>
							<div style={{ fontSize: '12px', opacity: 0.8, marginBottom: '8px' }}>By Platform</div>
							<div style={styles.legend}>
								{PLATFORM_OPTIONS.map(platform => (
									<span key={platform} style={styles.legendItem}>
										<span style={{ opacity: 0.8 }}>{platform}</span>
										<strong>{insights.byPlatform[platform] || 0}</strong>
									</span>
								))}
								{Object.entries(insights.byPlatform)
									.filter(([platform]) => !PLATFORM_OPTIONS.includes(platform))
									.map(([platform, count]) => (
										<span key={platform} style={styles.legendItem}>
											<span style={{ opacity: 0.8 }}>{platform}</span>
											<strong>{count}</strong>
										</span>
									))}
							</div>
						</div>
						{Object.keys(insights.bySkill).length > 0 && (
							<div style={{ ...styles.card, padding: '12px' }}>
								<div style={{ fontSize: '12px', opacity: 0.8, marginBottom: '8px' }}>By Skill</div>
								<div style={styles.legend}>
									{Object.entries(insights.bySkill).map(([skill, count]) => (
										<span key={skill} style={styles.legendItem}>
											<span style={{ opacity: 0.8 }}>{skill}</span>
											<strong>{count}</strong>
										</span>
									))}
								</div>
							</div>
						)}
					</div>
				</section>

				{/* Goal List */}
				<section style={styles.card}>
					<h4 style={{ marginTop: 0, marginBottom: '12px' }}>Goals</h4>
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
									<th style={styles.cell}>Hours</th>
									<th style={styles.cell}>Difficulty</th>
									<th style={styles.cell}>Notes</th>
									<th style={{ ...styles.cellLast, textAlign: 'right' }}>Actions</th>
								</tr>
							</thead>
							<tbody>
								{goals.map(goal => (
									<tr key={goal.id} style={styles.row}>
										<td style={styles.cellFirst}>{goal.skillName}</td>
										<td style={styles.cell}>{RESOURCE_LABEL_MAP[goal.resourceType] || goal.resourceType}</td>
										<td style={styles.cell}>{goal.platform}</td>
										<td style={styles.cell}>
											<select
												style={styles.select}
												value={goal.status}
												onChange={e => updateGoalField(goal.id, 'status', e.target.value, true)}
											>
												{STATUS_OPTIONS.map(option => (
													<option key={option.value} value={option.value}>{option.label}</option>
												))}
											</select>
											{' '}
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
												onBlur={() => void persistGoal(goal.id)}
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
												onBlur={() => void persistGoal(goal.id)}
											/>
										</td>
										<td style={styles.cell}>
											<input
												style={{ ...styles.input, width: '100%' }}
												type="text"
												value={goal.notes}
												onChange={e => updateGoalField(goal.id, 'notes', e.target.value)}
												onBlur={() => void persistGoal(goal.id)}
												placeholder="Notes..."
											/>
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
								))}
							</tbody>
						</table>
					)}
				</section>
			</div>
    </div>
  )
}
