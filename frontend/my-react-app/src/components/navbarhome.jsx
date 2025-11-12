import React from 'react'
import { Link } from 'react-router-dom'

export default function Navbarhome() {
	const styles = {
		wrapper: {
			position: 'sticky',
			top: 0,
			width: '100%',
			zIndex: 50,
			display: 'flex',
			justifyContent: 'center',
			padding: '16px 0'
		},
		nav: {
			width: 'min(960px, 92%)',
			display: 'flex',
			alignItems: 'center',
			justifyContent: 'space-between',
			padding: '14px 24px',
			borderRadius: '16px',
			border: '1px solid rgba(255, 255, 255, 0.15)',
			background: 'rgba(15, 18, 45, 0.65)',
			backdropFilter: 'blur(12px)',
			boxShadow: '0 12px 35px rgba(22, 32, 68, 0.3)',
			color: '#f5f7ff',
			fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', sans-serif"
		},
		brand: {
			fontWeight: 700,
			letterSpacing: '0.3px',
			fontSize: '1.1rem'
		},
		links: {
			display: 'flex',
			alignItems: 'center',
			gap: '14px'
		},
		link: {
			color: '#f5f7ff',
			textDecoration: 'none',
			fontWeight: 500,
			padding: '8px 14px',
			borderRadius: '999px',
			transition: 'all 0.25s ease'
		}
	}

	const linkHover = {
		background: 'rgba(99, 102, 241, 0.18)',
		color: '#cdd6ff'
	}

	function handleMouseEnter(event) {
		Object.assign(event.target.style, linkHover)
	}

	function handleMouseLeave(event) {
		Object.assign(event.target.style, styles.link)
	}

	return (
		<header style={styles.wrapper}>
			<nav style={styles.nav}>
				<div style={styles.brand}>SkillTrack</div>
				<div style={styles.links}>
					<Link
						to="/"
						style={styles.link}
						onMouseEnter={handleMouseEnter}
						onMouseLeave={handleMouseLeave}
					>
						Home
					</Link>
					<Link
						to="/login"
						style={styles.link}
						onMouseEnter={handleMouseEnter}
						onMouseLeave={handleMouseLeave}
					>
						Login
					</Link>
					<Link
						to="/register"
						style={styles.link}
						onMouseEnter={handleMouseEnter}
						onMouseLeave={handleMouseLeave}
					>
						Register
					</Link>
				</div>
			</nav>
		</header>
	)
}
