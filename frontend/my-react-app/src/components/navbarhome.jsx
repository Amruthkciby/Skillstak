import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../themeContext';

export default function Navbarhome() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  const palette = {
    navBg: isDark ? 'rgba(15, 18, 45, 0.85)' : 'rgba(255, 255, 255, 0.86)',
    navBorder: isDark ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid rgba(15, 23, 42, 0.08)',
    navShadow: isDark ? '0 12px 35px rgba(22, 32, 68, 0.35)' : '0 12px 35px rgba(15, 23, 42, 0.12)',
    text: isDark ? '#f5f7ff' : '#1e293b',
    linkHoverBg: isDark ? 'rgba(99, 102, 241, 0.2)' : 'rgba(37, 99, 235, 0.12)',
    linkHoverText: isDark ? '#cdd6ff' : '#1d4ed8',
    toggleBg: isDark ? 'rgba(99, 102, 241, 0.18)' : 'rgba(37, 99, 235, 0.12)',
    toggleText: isDark ? '#e0e7ff' : '#1d4ed8',
  };

  const styles = {
    wrapper: {
      position: 'sticky',
      top: 0,
      width: '100%',
      zIndex: 50,
      display: 'flex',
      justifyContent: 'center',
      padding: '16px 0',
    },
    nav: {
      width: 'min(960px, 92%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '14px 24px',
      borderRadius: '16px',
      border: palette.navBorder,
      background: palette.navBg,
      backdropFilter: 'blur(12px)',
      boxShadow: palette.navShadow,
      color: palette.text,
      fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', sans-serif",
      transition: 'background 0.25s ease, border 0.25s ease, color 0.25s ease',
    },
    brand: {
      fontWeight: 700,
      letterSpacing: '0.3px',
      fontSize: '1.1rem',
    },
    links: {
      display: 'flex',
      alignItems: 'center',
      gap: '14px',
    },
    link: {
      color: palette.text,
      textDecoration: 'none',
      fontWeight: 500,
      padding: '8px 14px',
      borderRadius: '999px',
      transition: 'all 0.25s ease',
    },
    toggle: {
      border: 'none',
      background: palette.toggleBg,
      color: palette.toggleText,
      padding: '8px 14px',
      borderRadius: '999px',
      fontWeight: 600,
      cursor: 'pointer',
      transition: 'transform 0.2s ease',
    },
  };

  const linkHover = {
    background: palette.linkHoverBg,
    color: palette.linkHoverText,
  };

  function handleMouseEnter(event) {
    Object.assign(event.target.style, linkHover);
  }

  function handleMouseLeave(event) {
    Object.assign(event.target.style, styles.link);
  }

  return (
    <header style={styles.wrapper}>
      <nav style={styles.nav}>
        <div style={styles.brand}>SkillTrack</div>
        <div style={styles.links}>
          <Link to="/" style={styles.link} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
            Home
          </Link>
          <Link to="/login" style={styles.link} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
            Login
          </Link>
          <Link to="/register" style={styles.link} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
            Register
          </Link>
          <button
            type="button"
            aria-label="Toggle theme"
            style={styles.toggle}
            onClick={toggleTheme}
            onMouseDown={(event) => {
              event.currentTarget.style.transform = 'scale(0.96)';
            }}
            onMouseUp={(event) => {
              event.currentTarget.style.transform = 'scale(1)';
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.transform = 'scale(1)';
            }}
          >
            {isDark ? '☀️ Light' : '🌙 Dark'}
          </button>
        </div>
      </nav>
    </header>
  );
}
