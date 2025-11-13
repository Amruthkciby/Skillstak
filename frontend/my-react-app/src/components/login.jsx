import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbarhome from './navbarhome';
import { useTheme } from '../themeContext';

export default function Login() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const palette = {
    pageBg: isDark ? '#0f172a' : '#f3f4f6',
    cardBg: isDark ? 'rgba(15, 23, 42, 0.92)' : '#ffffff',
    cardBorder: isDark ? 'rgba(148, 163, 184, 0.18)' : 'rgba(15, 23, 42, 0.08)',
    cardShadow: isDark ? '0 32px 80px rgba(15, 23, 42, 0.6)' : '0 24px 60px rgba(15, 23, 42, 0.08)',
    textPrimary: isDark ? '#e2e8f0' : '#0f172a',
    textSecondary: isDark ? 'rgba(226, 232, 240, 0.78)' : '#64748b',
    inputBg: isDark ? 'rgba(15, 23, 42, 0.6)' : '#f8fafc',
    inputBorder: isDark ? 'rgba(148, 163, 184, 0.35)' : '#cbd5f5',
    inputText: isDark ? '#f8fafc' : '#0f172a',
    accent: '#2563eb',
    accentGradient: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 50%, #9333ea 100%)',
    focusShadow: isDark ? '0 0 0 3px rgba(59, 130, 246, 0.35)' : '0 0 0 3px rgba(59, 130, 246, 0.2)',
    helperLink: isDark ? '#c084fc' : '#2563eb',
    helperText: isDark ? 'rgba(226, 232, 240, 0.74)' : '#64748b',
    errorBg: isDark ? 'rgba(248, 113, 113, 0.18)' : 'rgba(248, 113, 113, 0.12)',
    errorBorder: isDark ? 'rgba(248, 113, 113, 0.4)' : 'rgba(248, 113, 113, 0.24)',
    errorText: isDark ? '#fecaca' : '#b91c1c',
  };

  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState(null);
  const navigate = useNavigate?.() || (() => {});

  const handleChange = (event) => setForm({ ...form, [event.target.name]: event.target.value });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    try {
      const response = await fetch('http://127.0.0.1:8000/mainapp/token/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (response.ok) {
        localStorage.setItem('access_token', data.access);
        localStorage.setItem('refresh_token', data.refresh);
        navigate('/dashboard');
      } else {
        setError(data.detail || JSON.stringify(data));
      }
    } catch (err) {
      setError('Network error');
    }
  };

  const handleInputFocus = (event) => {
    event.target.style.borderColor = palette.accent;
    event.target.style.boxShadow = palette.focusShadow;
  };

  const handleInputBlur = (event) => {
    event.target.style.borderColor = palette.inputBorder;
    event.target.style.boxShadow = 'none';
  };

  const containerStyle = {
    minHeight: '100vh',
    background: palette.pageBg,
    fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', sans-serif",
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
    opacity: isDark ? 0.08 : 0.12,
    zIndex: 0,
    pointerEvents: 'none',
  };

  const contentWrapperStyle = {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 24px',
    position: 'relative',
    zIndex: 1,
  };

  const cardStyle = {
    width: '100%',
    maxWidth: '420px',
    background: palette.cardBg,
    borderRadius: '18px',
    padding: '40px 36px',
    boxShadow: palette.cardShadow,
    border: `1px solid ${palette.cardBorder}`,
    color: palette.textPrimary,
    transition: 'background 0.3s ease, border 0.3s ease, color 0.3s ease',
  };

  const titleStyle = {
    fontSize: '1.9rem',
    fontWeight: 700,
    marginBottom: '24px',
    textAlign: 'center',
    letterSpacing: '-0.5px',
  };

  const inputGroupStyle = {
    marginBottom: '18px',
  };

  const labelStyle = {
    display: 'block',
    fontSize: '0.95rem',
    fontWeight: 600,
    color: palette.textSecondary,
    marginBottom: '8px',
    letterSpacing: '0.2px',
  };

  const inputStyle = {
    width: '100%',
    padding: '12px 14px',
    fontSize: '1rem',
    border: `1px solid ${palette.inputBorder}`,
    borderRadius: '10px',
    outline: 'none',
    transition: 'all 0.25s ease',
    boxSizing: 'border-box',
    background: palette.inputBg,
    color: palette.inputText,
  };

  const buttonStyle = {
    width: '100%',
    padding: '12px',
    fontSize: '1rem',
    fontWeight: 600,
    color: '#ffffff',
    background: palette.accentGradient,
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'transform 0.25s ease, box-shadow 0.25s ease',
    marginTop: '6px',
    boxShadow: isDark ? '0 18px 36px rgba(79, 70, 229, 0.45)' : '0 15px 30px rgba(79, 70, 229, 0.25)',
  };

  const helperStyle = {
    marginTop: '20px',
    textAlign: 'center',
    fontSize: '0.95rem',
    color: palette.helperText,
  };

  const helperLinkStyle = {
    color: palette.helperLink,
    textDecoration: 'none',
    fontWeight: 600,
  };

  const errorStyle = {
    background: palette.errorBg,
    color: palette.errorText,
    border: `1px solid ${palette.errorBorder}`,
    padding: '14px 18px',
    borderRadius: '12px',
    marginBottom: '22px',
    fontSize: '0.95rem',
    fontWeight: 500,
    textAlign: 'center',
    boxShadow: '0 10px 25px rgba(248, 113, 113, 0.18)',
  };

  return (
    <div style={containerStyle}>
      <svg style={backgroundPatternStyle} viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="loginGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={isDark ? '#2563eb' : '#0ea5e9'} />
            <stop offset="50%" stopColor={isDark ? '#7c3aed' : '#6366f1'} />
            <stop offset="100%" stopColor={isDark ? '#ec4899' : '#a855f7'} />
          </linearGradient>
        </defs>
        <g opacity="0.5">
          <circle cx="150" cy="150" r="40" fill="none" stroke="url(#loginGradient)" strokeWidth="2" />
          <circle cx="150" cy="150" r="30" fill="none" stroke="url(#loginGradient)" strokeWidth="1.5" />
          <circle cx="150" cy="150" r="20" fill="url(#loginGradient)" />
        </g>
        <g opacity="0.4">
          <rect x="350" y="100" width="200" height="6" fill="none" stroke="url(#loginGradient)" strokeWidth="2" rx="3" />
          <rect x="350" y="100" width="150" height="6" fill="url(#loginGradient)" rx="3" />
        </g>
        <g opacity="0.35">
          <rect x="350" y="130" width="200" height="6" fill="none" stroke="url(#loginGradient)" strokeWidth="2" rx="3" />
          <rect x="350" y="130" width="120" height="6" fill="url(#loginGradient)" rx="3" />
        </g>
        <g opacity="0.5">
          <polygon points="900,200 910,225 935,225 915,240 925,265 900,250 875,265 885,240 865,225 890,225" fill="url(#loginGradient)" />
        </g>
        <g opacity="0.35">
          <polygon points="1000,300 1008,322 1032,322 1014,337 1022,359 1000,344 978,359 986,337 968,322 992,322" fill="url(#loginGradient)" />
        </g>
        <circle cx="100" cy="650" r="25" fill="none" stroke="url(#loginGradient)" strokeWidth="2" opacity="0.4" />
        <circle cx="100" cy="650" r="15" fill="none" stroke="url(#loginGradient)" strokeWidth="1.5" opacity="0.3" />
        <circle cx="1050" cy="600" r="8" fill="url(#loginGradient)" opacity="0.5" />
        <circle cx="1000" cy="650" r="8" fill="url(#loginGradient)" opacity="0.4" />
        <circle cx="1080" cy="680" r="8" fill="url(#loginGradient)" opacity="0.35" />
      </svg>
      <Navbarhome />
      <div style={contentWrapperStyle}>
        <div style={cardStyle}>
          <h2 style={titleStyle}>Login</h2>
          {error && <div style={errorStyle}>{error}</div>}
          <form onSubmit={handleSubmit}>
            <div style={inputGroupStyle}>
              <label style={labelStyle} htmlFor="username">
                Username
              </label>
              <input
                id="username"
                name="username"
                value={form.username}
                onChange={handleChange}
                required
                style={inputStyle}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
              />
            </div>
            <div style={inputGroupStyle}>
              <label style={labelStyle} htmlFor="password">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                required
                style={inputStyle}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
              />
            </div>
            <button
              type="submit"
              style={buttonStyle}
              onMouseEnter={(event) => {
                event.currentTarget.style.transform = 'translateY(-2px)';
                event.currentTarget.style.boxShadow = isDark
                  ? '0 24px 44px rgba(79, 70, 229, 0.55)'
                  : '0 20px 40px rgba(79, 70, 229, 0.35)';
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.transform = 'translateY(0)';
                event.currentTarget.style.boxShadow = buttonStyle.boxShadow;
              }}
            >
              Login
            </button>
          </form>
          <div style={helperStyle}>
            No account yet?{' '}
            <a href="/register" style={helperLinkStyle}>
              Register now
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
