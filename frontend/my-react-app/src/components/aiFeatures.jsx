import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTheme } from '../themeContext'

const AI_RECOMMENDATIONS_URL = 'http://127.0.0.1:8000/mainapp/ai/resource-recommendations/'
const AI_SUMMARIZATION_URL = 'http://127.0.0.1:8000/mainapp/ai/note-summarization/'
const LEARNING_GOALS_URL = 'http://127.0.0.1:8000/mainapp/learning-goals/'
const PROFILE_URL = 'http://127.0.0.1:8000/mainapp/profile/'

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

async function readJsonSafely(response) {
	try {
		return await response.json()
	} catch {
		return null
	}
}

export default function AIFeatures() {
	const navigate = useNavigate()
	const [searchParams] = useSearchParams()
	const { theme } = useTheme()
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
		accent: '#2563eb',
		accentSoft: isDark ? 'rgba(99, 102, 241, 0.18)' : 'rgba(37, 99, 235, 0.15)',
		accentGradient: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 45%, #9333ea 100%)',
		buttonShadow: isDark ? '0 16px 40px rgba(79, 70, 229, 0.45)' : '0 16px 36px rgba(79, 70, 229, 0.25)',
		alertBg: isDark ? 'rgba(248,113,113,0.18)' : 'rgba(248,113,113,0.12)',
		alertBorder: isDark ? 'rgba(248,113,113,0.35)' : 'rgba(248,113,113,0.22)',
		alertText: isDark ? '#fecaca' : '#b91c1c',
		muted: isDark ? 'rgba(226, 232, 240, 0.7)' : '#64748b',
		successGradient: 'linear-gradient(135deg, #22c55e 0%, #4ade80 100%)',
	}

	const [profile, setProfile] = useState({ username: '', email: '' })
	const [goals, setGoals] = useState([])
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState('')
	const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'recommendations')
	const [recommendationsData, setRecommendationsData] = useState(null)
	const [summarizationData, setSummarizationData] = useState(null)
	const [selectedGoalId, setSelectedGoalId] = useState('')

	const authRedirectScheduled = useRef(false)

	const handleAuthError = (response, data) => {
		if (response.status === 401 || response.status === 403) {
			setError('Session expired. Please log in again.')
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

	useEffect(() => {
		let isMounted = true

		const loadData = async () => {
			setLoading(true)
			setError('')

			// Load profile
			try {
				const profileResponse = await fetch(PROFILE_URL, {
					headers: getAuthHeaders()
				})
				const profileData = await readJsonSafely(profileResponse)
				if (!profileResponse.ok) {
					if (handleAuthError(profileResponse, profileData)) return
					throw new Error('Failed to load profile')
				}
				if (isMounted) {
					setProfile({
						username: profileData?.username || '',
						email: profileData?.email || ''
					})
				}
			} catch (err) {
				console.warn('Profile load error:', err)
			}

			// Load goals
			try {
				const goalsResponse = await fetch(LEARNING_GOALS_URL, {
					headers: getAuthHeaders()
				})
				const goalsData = await readJsonSafely(goalsResponse)
				if (!goalsResponse.ok) {
					if (handleAuthError(goalsResponse, goalsData)) return
					throw new Error('Failed to load goals')
				}
				if (isMounted) {
					setGoals(Array.isArray(goalsData) ? goalsData : [])
					if (goalsData && goalsData.length > 0) {
						setSelectedGoalId(goalsData[0].id)
					}
				}
			} catch (err) {
				if (isMounted) {
					setError(err.message || 'Failed to load learning goals')
				}
			}

			if (isMounted) {
				setLoading(false)
			}
		}

		loadData()

		return () => {
			isMounted = false
		}
	}, [])

	const loadRecommendations = async () => {
		setLoading(true)
		setError('')
		try {
			const response = await fetch(AI_RECOMMENDATIONS_URL, {
				method: 'POST',
				headers: getAuthHeaders(true),
				body: JSON.stringify({})
			})
			const data = await readJsonSafely(response)
			if (!response.ok) {
				if (handleAuthError(response, data)) {
					setLoading(false)
					return
				}
				throw new Error(data?.error || 'Failed to load recommendations')
			}
			setRecommendationsData(data)
		} catch (err) {
			setError(err.message || 'Unable to load recommendations')
		} finally {
			setLoading(false)
		}
	}

	const loadSummarization = async () => {
		setLoading(true)
		setError('')
		try {
			const payload = selectedGoalId ? { goal_id: parseInt(selectedGoalId) } : {}
			const response = await fetch(AI_SUMMARIZATION_URL, {
				method: 'POST',
				headers: getAuthHeaders(true),
				body: JSON.stringify(payload)
			})
			const data = await readJsonSafely(response)
			if (!response.ok) {
				if (handleAuthError(response, data)) {
					setLoading(false)
					return
				}
				throw new Error(data?.error || 'Failed to load summarization')
			}
			setSummarizationData(data)
		} catch (err) {
			setError(err.message || 'Unable to load summarization')
		} finally {
			setLoading(false)
		}
	}

	const handlePrimaryHoverEnter = (event) => {
		event.currentTarget.style.transform = 'translateY(-2px)'
		event.currentTarget.style.boxShadow = isDark
			? '0 24px 44px rgba(79, 70, 229, 0.55)'
			: '0 20px 40px rgba(79, 70, 229, 0.32)'
	}

	const handlePrimaryHoverLeave = (event) => {
		event.currentTarget.style.transform = 'translateY(0)'
		event.currentTarget.style.boxShadow = palette.buttonShadow
	}

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
			marginBottom: '24px',
			gap: '16px'
		},
		backButton: {
			background: 'transparent',
			border: `1px solid ${palette.cardBorder}`,
			color: palette.textPrimary,
			borderRadius: '8px',
			padding: '8px 14px',
			cursor: 'pointer',
			fontWeight: 600,
			fontSize: '0.9rem'
		},
		title: {
			margin: 0,
			fontWeight: 700,
			letterSpacing: '0.2px',
			color: palette.textPrimary,
			fontSize: '1.8rem'
		},
		subtitle: {
			margin: '8px 0 0 0',
			color: palette.muted,
			fontSize: '0.95rem'
		},
		card: {
			background: palette.cardBg,
			border: `1px solid ${palette.cardBorder}`,
			borderRadius: '14px',
			padding: '20px',
			boxShadow: palette.cardShadow,
			marginBottom: '20px'
		},
		tabs: {
			display: 'flex',
			gap: '8px',
			marginBottom: '20px',
			borderBottom: `2px solid ${palette.cardBorder}`,
			paddingBottom: '0'
		},
		tab: {
			background: 'transparent',
			border: 'none',
			borderBottom: '3px solid transparent',
			padding: '12px 20px',
			cursor: 'pointer',
			fontSize: '1rem',
			fontWeight: '600',
			color: palette.textSecondary,
			transition: 'all 0.3s ease'
		},
		tabActive: {
			borderBottomColor: palette.accent,
			color: palette.accent
		},
		button: {
			background: palette.accentGradient,
			border: 'none',
			color: '#fff',
			borderRadius: '10px',
			padding: '12px 20px',
			cursor: 'pointer',
			fontWeight: 600,
			boxShadow: palette.buttonShadow,
			transition: 'transform 0.25s ease, box-shadow 0.25s ease'
		},
		alert: {
			marginBottom: '16px',
			padding: '12px 16px',
			borderRadius: '12px',
			fontSize: '0.95rem',
			border: `1px solid ${palette.alertBorder}`,
			background: palette.alertBg,
			color: palette.alertText
		},
		recommendationCard: {
			background: isDark ? 'rgba(15, 23, 42, 0.6)' : '#f8fafc',
			border: `1px solid ${palette.cardBorder}`,
			borderRadius: '12px',
			padding: '16px',
			marginBottom: '12px'
		},
		recommendationHeader: {
			display: 'flex',
			alignItems: 'center',
			gap: '12px',
			marginBottom: '8px'
		},
		recommendationTitle: {
			fontWeight: 600,
			fontSize: '1rem',
			color: palette.textPrimary,
			margin: 0
		},
		recommendationDesc: {
			fontSize: '0.9rem',
			color: palette.textSecondary,
			margin: '8px 0 0 40px',
			lineHeight: '1.5'
		},
		analysisGrid: {
			display: 'grid',
			gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
			gap: '12px',
			marginTop: '16px'
		},
		analysisStat: {
			background: palette.accentSoft,
			padding: '12px',
			borderRadius: '10px',
			textAlign: 'center'
		},
		analysisStat_Label: {
			fontSize: '0.75rem',
			color: palette.textSecondary,
			textTransform: 'uppercase',
			marginBottom: '4px'
		},
		analysisStat_Value: {
			fontSize: '1.5rem',
			fontWeight: 700,
			color: palette.accent
		},
		summarySection: {
			background: isDark ? 'rgba(15, 23, 42, 0.6)' : '#f8fafc',
			border: `1px solid ${palette.cardBorder}`,
			borderRadius: '12px',
			padding: '16px',
			marginBottom: '12px'
		},
		summaryTitle: {
			fontWeight: 600,
			fontSize: '1.1rem',
			color: palette.textPrimary,
			margin: '0 0 12px 0'
		},
		keyPointsList: {
			listStyle: 'none',
			padding: 0,
			margin: 0
		},
		keyPointItem: {
			padding: '8px 12px',
			borderLeft: `3px solid ${palette.accent}`,
			marginBottom: '8px',
			fontSize: '0.9rem',
			color: palette.textSecondary
		},
		topicTag: {
			display: 'inline-block',
			background: palette.accentSoft,
			padding: '6px 12px',
			borderRadius: '999px',
			fontSize: '0.85rem',
			color: palette.accent,
			marginRight: '8px',
			marginBottom: '8px'
		},
		select: {
			background: palette.inputBg,
			border: `1px solid ${palette.inputBorder}`,
			borderRadius: '10px',
			padding: '10px 12px',
			color: palette.textPrimary,
			outline: 'none',
			transition: 'border 0.2s ease, box-shadow 0.2s ease'
		}
	}

	return (
		<div style={styles.page}>
			{/* Header */}
			<div style={styles.header}>
				<div>
					<h1 style={styles.title}>🤖 AI-Powered Learning</h1>
					<p style={styles.subtitle}>Get personalized recommendations and summaries based on your learning journey</p>
				</div>
				<button
					type="button"
					style={styles.backButton}
					onClick={() => navigate('/dashboard')}
				>
					← Back to Dashboard
				</button>
			</div>

			{/* Error Alert */}
			{error && <div style={styles.alert}>{error}</div>}

			{/* Tabs */}
			<div style={styles.tabs}>
				<button
					type="button"
					style={{
						...styles.tab,
						...(activeTab === 'recommendations' && styles.tabActive)
					}}
					onClick={() => {
						setActiveTab('recommendations')
						if (!recommendationsData) {
							loadRecommendations()
						}
					}}
				>
					📚 Resource Recommendations
				</button>
				<button
					type="button"
					style={{
						...styles.tab,
						...(activeTab === 'summarization' && styles.tabActive)
					}}
					onClick={() => {
						setActiveTab('summarization')
						if (!summarizationData) {
							loadSummarization()
						}
					}}
				>
					📝 Note Summarization
				</button>
			</div>

			{/* Recommendations Tab */}
			{activeTab === 'recommendations' && (
				<div>
					<div style={styles.card}>
						<h3 style={{ margin: '0 0 16px 0', color: palette.textPrimary }}>
							Personalized Resource Recommendations
						</h3>
						<p style={{ color: palette.textSecondary, marginBottom: '16px' }}>
							Based on your learning patterns, here are tailored resources and learning paths to accelerate your growth.
						</p>
						<button
							type="button"
							style={styles.button}
							onClick={loadRecommendations}
							disabled={loading}
							onMouseEnter={handlePrimaryHoverEnter}
							onMouseLeave={handlePrimaryHoverLeave}
						>
							{loading ? 'Analyzing...' : 'Generate Recommendations'}
						</button>
					</div>

					{recommendationsData && (
						<>
							{/* Analysis Stats */}
							{recommendationsData.analysis && (
								<div style={styles.card}>
									<h4 style={{ margin: '0 0 16px 0', color: palette.textPrimary }}>Your Learning Profile</h4>
									<div style={styles.analysisGrid}>
										<div style={styles.analysisStat}>
											<div style={styles.analysisStat_Label}>Total Goals</div>
											<div style={styles.analysisStat_Value}>{recommendationsData.analysis.total_goals}</div>
										</div>
										<div style={styles.analysisStat}>
											<div style={styles.analysisStat_Label}>Activities</div>
											<div style={styles.analysisStat_Value}>{recommendationsData.analysis.total_activities}</div>
										</div>
										<div style={styles.analysisStat}>
											<div style={styles.analysisStat_Label}>Unique Skills</div>
											<div style={styles.analysisStat_Value}>{recommendationsData.analysis.unique_skills}</div>
										</div>
										<div style={styles.analysisStat}>
											<div style={styles.analysisStat_Label}>Avg Difficulty</div>
											<div style={styles.analysisStat_Value}>{recommendationsData.analysis.average_difficulty}</div>
										</div>
										<div style={styles.analysisStat}>
											<div style={styles.analysisStat_Label}>Top Platform</div>
											<div style={{ ...styles.analysisStat_Value, fontSize: '0.9rem' }}>
												{recommendationsData.analysis.preferred_platform}
											</div>
										</div>
									</div>
								</div>
							)}

							{/* Recommendations */}
							{recommendationsData.recommendations && recommendationsData.recommendations.length > 0 && (
								<div style={styles.card}>
									<h4 style={{ margin: '0 0 16px 0', color: palette.textPrimary }}>
										Personalized Recommendations
									</h4>
									{recommendationsData.recommendations.map((rec, idx) => (
										<div key={idx} style={styles.recommendationCard}>
											<div style={styles.recommendationHeader}>
												<span style={{ fontSize: '1.5rem' }}>{rec.icon}</span>
												<h5 style={styles.recommendationTitle}>{rec.title}</h5>
											</div>
											<p style={styles.recommendationDesc}>{rec.description}</p>
											{rec.suggested_skills && rec.suggested_skills.length > 0 && (
												<div style={{ marginTop: '12px' }}>
													<strong style={{ color: palette.textPrimary }}>Skills:</strong>
													<div style={{ marginTop: '8px' }}>
														{rec.suggested_skills.map((skill, sidx) => (
															<span key={sidx} style={styles.topicTag}>{skill}</span>
														))}
													</div>
												</div>
											)}
											{rec.suggested_types && rec.suggested_types.length > 0 && (
												<div style={{ marginTop: '12px' }}>
													<strong style={{ color: palette.textPrimary }}>Try these formats:</strong>
													<div style={{ marginTop: '8px' }}>
														{rec.suggested_types.map((type, sidx) => (
															<span key={sidx} style={styles.topicTag}>{type}</span>
														))}
													</div>
												</div>
											)}
										</div>
									))}
								</div>
							)}
						</>
					)}
				</div>
			)}

			{/* Summarization Tab */}
			{activeTab === 'summarization' && (
				<div>
					<div style={styles.card}>
						<h3 style={{ margin: '0 0 16px 0', color: palette.textPrimary }}>
							🤖 AI-Generated Learning Summaries
						</h3>
						<p style={{ color: palette.textSecondary, marginBottom: '16px' }}>
							Get concise summaries of your learning notes and key takeaways based on your skill context and activity notes.
						</p>
						<div style={{ marginBottom: '16px' }}>
							<label style={{ display: 'block', marginBottom: '8px', color: palette.textSecondary, fontSize: '0.9rem' }}>
								Select Goal (Optional - leave empty for all goals):
							</label>
							<select
								style={styles.select}
								value={selectedGoalId}
								onChange={(e) => setSelectedGoalId(e.target.value)}
							>
								<option value="">All Goals</option>
								{goals.map((goal) => (
									<option key={goal.id} value={goal.id}>
										{goal.skill_name}
									</option>
								))}
							</select>
						</div>
						<button
							type="button"
							style={styles.button}
							onClick={loadSummarization}
							disabled={loading}
							onMouseEnter={handlePrimaryHoverEnter}
							onMouseLeave={handlePrimaryHoverLeave}
						>
							{loading ? 'Generating Summary...' : '✨ Generate AI Summary'}
						</button>
					</div>

					{summarizationData && (
						<>
							{/* Goal Context & Notes Analysis */}
							{summarizationData.goal_notes && (
								<div style={styles.card}>
									<h4 style={{ margin: '0 0 16px 0', color: palette.textPrimary, display: 'flex', alignItems: 'center', gap: '8px' }}>
										📚 Goal Notes Analysis
									</h4>
									
									{summarizationData.goal_notes.main_notes && (
										<div style={{ marginBottom: '20px' }}>
											<h5 style={{ margin: '0 0 10px 0', color: palette.textSecondary, fontSize: '0.9rem', fontWeight: 600 }}>
												Main Notes
											</h5>
											<div style={{ padding: '12px', background: palette.inputBg, borderRadius: '8px', borderLeft: `3px solid ${palette.accent}`, marginBottom: '12px' }}>
												<p style={{ margin: 0, color: palette.textPrimary, lineHeight: 1.6, fontSize: '0.9rem', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
													{summarizationData.goal_notes.main_notes}
												</p>
											</div>
											{summarizationData.goal_notes.analysis && (
												<div>
													<div style={{ fontSize: '0.85rem', color: palette.textSecondary, marginBottom: '8px' }}>
														<strong>Analysis:</strong> {summarizationData.goal_notes.analysis.content_length} content
													</div>
													{summarizationData.goal_notes.analysis.themes && summarizationData.goal_notes.analysis.themes.length > 0 && (
														<div style={{ marginBottom: '8px' }}>
															<div style={{ fontSize: '0.85rem', color: palette.textSecondary, marginBottom: '4px' }}>
																<strong>Learning Themes:</strong>
															</div>
															<div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
																{summarizationData.goal_notes.analysis.themes.map((theme, idx) => (
																	<span key={idx} style={styles.topicTag}>{theme}</span>
																))}
															</div>
														</div>
													)}
													{summarizationData.goal_notes.analysis.key_phrases && summarizationData.goal_notes.analysis.key_phrases.length > 0 && (
														<div>
															<div style={{ fontSize: '0.85rem', color: palette.textSecondary, marginBottom: '4px' }}>
																<strong>Key Concepts:</strong>
															</div>
															<div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
																{summarizationData.goal_notes.analysis.key_phrases.map((phrase, idx) => (
																	<span key={idx} style={{ ...styles.topicTag, background: palette.accentSoft, borderColor: palette.accent }}>
																		{phrase}
																	</span>
																))}
															</div>
														</div>
													)}
												</div>
											)}
										</div>
									)}

									{summarizationData.goal_notes.activity_entries && summarizationData.goal_notes.activity_entries.length > 0 && (
										<div>
											<h5 style={{ margin: '0 0 10px 0', color: palette.textSecondary, fontSize: '0.9rem', fontWeight: 600 }}>
												Activity Notes ({summarizationData.goal_notes.activity_entries.length})
											</h5>
											<div style={{ maxHeight: '300px', overflowY: 'auto', borderLeft: `2px solid ${palette.accent}`, paddingLeft: '12px', marginLeft: '4px' }}>
												{summarizationData.goal_notes.activity_entries.map((entry, idx) => (
													<div key={idx} style={{ marginBottom: '12px', paddingBottom: '12px', borderBottom: idx < summarizationData.goal_notes.activity_entries.length - 1 ? `1px solid ${palette.cardBorder}` : 'none' }}>
														<div style={{ fontSize: '0.8rem', color: palette.accent, fontFamily: 'monospace', fontWeight: 600, marginBottom: '4px' }}>
															{entry.timestamp}
														</div>
														<p style={{ margin: 0, color: palette.textPrimary, fontSize: '0.9rem', lineHeight: 1.5 }}>
															{entry.text}
														</p>
													</div>
												))}
											</div>
										</div>
									)}
								</div>
							)}

						{/* Summary Overview */}
						{summarizationData.summary && (
							<div style={styles.card}>
								<h4 style={{ margin: '0 0 16px 0', color: palette.textPrimary }}>
									📊 {summarizationData.summary.title}
								</h4>

								{/* Concise Summary */}
								{summarizationData.summary.concise_summary && (
									<div style={{
										background: palette.accentSoft,
										border: `1px solid ${palette.inputBorder}`,
										borderRadius: '10px',
										padding: '12px',
										marginBottom: '16px',
										fontSize: '0.95rem',
										lineHeight: '1.6',
										color: palette.textPrimary
									}}>
										<p style={{ margin: 0 }}>
											<strong>📌 Summary:</strong> {summarizationData.summary.concise_summary}
										</p>
									</div>
								)}

								{/* Stats Grid - Only show if there are actual activities (hours > 0) */}
								{summarizationData.summary.total_hours_spent > 0 && (
									<div style={styles.analysisGrid}>
										<div style={styles.analysisStat}>
											<div style={styles.analysisStat_Label}>Total Hours</div>
											<div style={styles.analysisStat_Value}>
												{summarizationData.summary.total_hours_spent}h
											</div>
										</div>
										<div style={styles.analysisStat}>
											<div style={styles.analysisStat_Label}>Sessions</div>
											<div style={styles.analysisStat_Value}>
												{summarizationData.summary.total_sessions}
											</div>
										</div>
										<div style={styles.analysisStat}>
											<div style={styles.analysisStat_Label}>Avg Per Session</div>
											<div style={styles.analysisStat_Value}>
												{summarizationData.summary.average_hours_per_session}h
											</div>
										</div>
										<div style={styles.analysisStat}>
											<div style={styles.analysisStat_Label}>Learning Intensity</div>
											<div style={styles.analysisStat_Value}>
												{summarizationData.summary.learning_intensity}
											</div>
										</div>
									</div>
								)}

								{/* Learning Period - Only show if there are activities */}
								{summarizationData.summary.period && summarizationData.summary.total_hours_spent > 0 && (
									<div style={{ marginTop: '16px', padding: '12px', background: palette.accentSoft, borderRadius: '10px' }}>
										<p style={{ margin: '0 0 6px 0', fontSize: '0.9rem', color: palette.textSecondary }}>
											<strong>Learning Period:</strong> {summarizationData.summary.period.duration_days} days
										</p>
										{summarizationData.summary.period.earliest && (
											<p style={{ margin: 0, fontSize: '0.85rem', color: palette.textSecondary }}>
												From {summarizationData.summary.period.earliest.split('T')[0]} to {summarizationData.summary.period.latest.split('T')[0]}
											</p>
										)}
									</div>
								)}
							</div>
						)}

						{/* Main Topics - Only show if there are actual topics with meaningful data */}
						{summarizationData.topics_covered && summarizationData.topics_covered.length > 0 && 
							summarizationData.summary && summarizationData.summary.total_hours_spent > 0 && (
							<div style={styles.card}>
								<h4 style={{ margin: '0 0 16px 0', color: palette.textPrimary }}>🎯 Main Topics Covered</h4>
								<div>
									{summarizationData.topics_covered.map((topic, idx) => (
										<span key={idx} style={styles.topicTag}>{topic}</span>
									))}
								</div>
							</div>
						)}

						{/* Key Learnings - Only show if there are activities */}
						{summarizationData.key_points && summarizationData.key_points.length > 0 && 
							summarizationData.summary && summarizationData.summary.total_hours_spent > 0 && (
							<div style={styles.card}>
								<h4 style={{ margin: '0 0 16px 0', color: palette.textPrimary }}>💡 Key Learnings</h4>
								<ul style={styles.keyPointsList}>
									{summarizationData.key_points.slice(0, 8).map((point, idx) => (
										<li key={idx} style={styles.keyPointItem}>
											<strong>{point.skill}</strong> ({point.hours}h)
											<br />
											<span style={{ color: palette.textSecondary, fontSize: '0.85rem' }}>
												{point.content}
											</span>
										</li>
									))}
								</ul>
							</div>
						)}

						{/* Detailed Notes Timeline - Only show if there are activities */}
						{summarizationData.detailed_notes && summarizationData.detailed_notes.length > 0 && 
							summarizationData.summary && summarizationData.summary.total_hours_spent > 0 && (
							<div style={styles.card}>
								<h4 style={{ margin: '0 0 16px 0', color: palette.textPrimary }}>📅 Learning Timeline</h4>
									{summarizationData.detailed_notes.map((note, idx) => (
										<div key={idx} style={styles.summarySection}>
											<p style={{ margin: '0 0 8px 0', fontSize: '0.85rem', color: palette.textSecondary }}>
												<strong>{note.goal}</strong> • {note.date.split('T')[0]} • {note.hours}h
											</p>
											<p style={{ margin: 0, fontSize: '0.9rem', color: palette.textPrimary }}>
												{note.notes}
											</p>
										</div>
									))}
								</div>
							)}
						</>
					)}
				</div>
			)}
		</div>
	)
}
