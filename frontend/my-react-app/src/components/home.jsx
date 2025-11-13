import React, { useEffect, useState } from 'react';
import Navbarhome from './navbarhome';
import { useTheme } from '../themeContext';

export default function Home() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [apiData, setApiData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('http://127.0.0.1:8000/mainapp/hello/')
      .then((response) => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json();
      })
      .then((data) => setApiData(data))
      .catch((err) => setError(err.message));
  }, []);

  const palette = {
    pageBg: isDark ? '#0f172a' : '#f8fafc',
    textPrimary: isDark ? '#e2e8f0' : '#0f172a',
    subText: isDark ? 'rgba(226, 232, 240, 0.75)' : '#64748b',
    cardBg: isDark ? 'rgba(15, 23, 42, 0.82)' : '#ffffff',
    cardBorder: isDark ? 'rgba(148, 163, 184, 0.18)' : 'rgba(15, 23, 42, 0.08)',
    cardShadow: isDark ? '0 24px 65px rgba(15, 23, 42, 0.55)' : '0 24px 65px rgba(15, 23, 42, 0.08)',
    badgeBg: isDark ? 'rgba(99, 102, 241, 0.14)' : 'rgba(37, 99, 235, 0.12)',
    badgeText: isDark ? '#dbe4ff' : '#1d4ed8',
  };

  const containerStyle = {
    minHeight: '100vh',
    background: palette.pageBg,
    padding: '0 24px 40px',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    display: 'flex',
    flexDirection: 'column',
    transition: 'background 0.3s ease',
    position: 'relative',
    overflow: 'hidden',
  };

  const backgroundPatternStyle = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: isDark ? 0.1 : 0.15,
    zIndex: 0,
    pointerEvents: 'none',
  };

  const contentWrapperStyle = {
    position: 'relative',
    zIndex: 1,
  };

  const centerStyle = {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 0',
  };

  const cardStyle = {
    background: palette.cardBg,
    border: `1px solid ${palette.cardBorder}`,
    borderRadius: '20px',
    padding: '48px 52px',
    boxShadow: palette.cardShadow,
    textAlign: 'center',
    color: palette.textPrimary,
    maxWidth: '580px',
  };

  const animatedTextStyle = {
    fontSize: '4rem',
    fontWeight: 800,
    letterSpacing: '-1.2px',
    background: 'linear-gradient(90deg, #22d3ee, #6366f1, #a855f7, #22d3ee)',
    backgroundSize: '300% 300%',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    animation: 'gradientShift 8s linear infinite, floaty 3.2s ease-in-out infinite',
    marginBottom: '12px',
  };

  const subTextStyle = {
    marginTop: '12px',
    color: palette.subText,
    fontWeight: 500,
  };

  const badgeStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '0.9rem',
    padding: '10px 16px',
    borderRadius: '999px',
    background: palette.badgeBg,
    color: palette.badgeText,
    marginTop: '20px',
  };

  return (
    <div style={containerStyle}>
      <svg style={backgroundPatternStyle} viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="skillGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={isDark ? '#2563eb' : '#0ea5e9'} />
            <stop offset="50%" stopColor={isDark ? '#7c3aed' : '#6366f1'} />
            <stop offset="100%" stopColor={isDark ? '#ec4899' : '#a855f7'} />
          </linearGradient>
        </defs>
        <rect x="50" y="100" width="180" height="8" fill="url(#skillGradient)" opacity="0.6" rx="4" />
        <rect x="80" y="140" width="150" height="8" fill="url(#skillGradient)" opacity="0.5" rx="4" />
        <rect x="60" y="180" width="170" height="8" fill="url(#skillGradient)" opacity="0.4" rx="4" />
        <circle cx="950" cy="150" r="35" fill="none" stroke="url(#skillGradient)" strokeWidth="2" opacity="0.6" />
        <circle cx="950" cy="150" r="25" fill="none" stroke="url(#skillGradient)" strokeWidth="1.5" opacity="0.4" />
        <circle cx="1050" cy="250" r="40" fill="none" stroke="url(#skillGradient)" strokeWidth="2" opacity="0.5" />
        <g opacity="0.5">
          <line x1="300" y1="500" x2="350" y2="450" stroke="url(#skillGradient)" strokeWidth="3" strokeLinecap="round" />
          <polygon points="350,450 345,460 360,455" fill="url(#skillGradient)" />
        </g>
        <circle cx="200" cy="650" r="20" fill="url(#skillGradient)" opacity="0.6" />
        <circle cx="280" cy="680" r="18" fill="url(#skillGradient)" opacity="0.5" />
        <circle cx="150" cy="730" r="16" fill="url(#skillGradient)" opacity="0.4" />
        <rect x="700" y="600" width="12" height="12" fill="url(#skillGradient)" opacity="0.6" rx="2" />
        <rect x="780" y="580" width="12" height="12" fill="url(#skillGradient)" opacity="0.5" rx="2" />
        <rect x="850" y="620" width="12" height="12" fill="url(#skillGradient)" opacity="0.4" rx="2" />
        <line x1="712" y1="606" x2="786" y2="586" stroke="url(#skillGradient)" strokeWidth="1.5" opacity="0.3" />
        <line x1="792" y1="586" x2="856" y2="626" stroke="url(#skillGradient)" strokeWidth="1.5" opacity="0.3" />
      </svg>
      <Navbarhome />
      <style>
        {`
          @keyframes gradientShift {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
          @keyframes floaty {
            0% { transform: translateY(0px); }
            50% { transform: translateY(-8px); }
            100% { transform: translateY(0px); }
          }
        `}
      </style>
      <div style={{...centerStyle, ...contentWrapperStyle}}>
        <div style={cardStyle}>
          <div style={animatedTextStyle}>SkillTrack</div>
          <div style={subTextStyle}>A skill tracking platform — Best in the market</div>
     {/*     <div style={badgeStyle}>
            <span>{error ? 'API unreachable' : apiData?.status || 'Platform ready'}</span>
            <span>{apiData?.message || 'Stay aligned with your goals'}</span>
          </div> */}
        </div>
      </div>
    </div>
  );
}
