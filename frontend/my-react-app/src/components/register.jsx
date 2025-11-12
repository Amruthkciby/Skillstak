import React, { useState } from 'react';
import Navbarhome from './navbarhome';
import { useTheme } from '../themeContext';

export default function Register() {
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
    accent: '#0ea5e9',
    accentGradient: 'linear-gradient(135deg, #0ea5e9 0%, #22d3ee 40%, #6366f1 100%)',
    focusShadow: isDark ? '0 0 0 3px rgba(14, 165, 233, 0.35)' : '0 0 0 3px rgba(14, 165, 233, 0.18)',
    helperLink: isDark ? '#38bdf8' : '#0ea5e9',
    helperText: isDark ? 'rgba(226, 232, 240, 0.74)' : '#64748b',
    messageBg: isDark ? 'rgba(14, 165, 233, 0.18)' : 'rgba(14, 165, 233, 0.12)',
    messageBorder: isDark ? 'rgba(14, 165, 233, 0.35)' : 'rgba(14, 165, 233, 0.24)',
    messageText: isDark ? '#bae6fd' : '#0369a1',
    errorBg: isDark ? 'rgba(248, 113, 113, 0.18)' : 'rgba(248, 113, 113, 0.12)',
    errorBorder: isDark ? 'rgba(248, 113, 113, 0.4)' : 'rgba(248, 113, 113, 0.24)',
    errorText: isDark ? '#fecaca' : '#b91c1c',
  };

  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    confirm_password: '',
  });
  const [msg, setMsg] = useState(null);
  const [errors, setErrors] = useState(null);

  const handleChange = (event) => setForm({ ...form, [event.target.name]: event.target.value });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMsg(null);
    setErrors(null);
    try {
      const response = await fetch('http://127.0.0.1:8000/mainapp/register/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (response.ok) {
        setMsg(data.message || 'Registered successfully. You can login now.');
        setForm({ username: '', email: '', password: '', confirm_password: '' });
      } else {
        setErrors(data);
      }
    } catch (err) {
      setErrors({ detail: 'Network error' });
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
  };

  const contentWrapperStyle = {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 24px',
  };

  const cardStyle = {
    width: '100%',
    maxWidth: '480px',
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

  const submitStyle = {
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
    marginTop: '8px',
    boxShadow: isDark ? '0 18px 36px rgba(56, 189, 248, 0.45)' : '0 15px 30px rgba(14, 165, 233, 0.25)',
  };

  const messageStyle = {
    background: palette.messageBg,
    border: `1px solid ${palette.messageBorder}`,
    color: palette.messageText,
    padding: '14px 18px',
    borderRadius: '12px',
    marginBottom: '18px',
    fontSize: '0.95rem',
    textAlign: 'center',
    boxShadow: '0 12px 26px rgba(14, 165, 233, 0.16)',
  };

  const errorStyle = {
    background: palette.errorBg,
    border: `1px solid ${palette.errorBorder}`,
    color: palette.errorText,
    padding: '14px 18px',
    borderRadius: '12px',
    marginBottom: '18px',
    fontSize: '0.95rem',
    whiteSpace: 'pre-wrap',
    boxShadow: '0 12px 30px rgba(248, 113, 113, 0.2)',
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

  return (
    <div style={containerStyle}>
      <Navbarhome />
      <div style={contentWrapperStyle}>
        <div style={cardStyle}>
          <h2 style={titleStyle}>Create Account</h2>
          {msg && <div style={messageStyle}>{msg}</div>}
          {errors && <div style={errorStyle}>{JSON.stringify(errors, null, 2)}</div>}
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
              <label style={labelStyle} htmlFor="email">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={form.email}
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
            <div style={inputGroupStyle}>
              <label style={labelStyle} htmlFor="confirm_password">
                Confirm Password
              </label>
              <input
                id="confirm_password"
                name="confirm_password"
                type="password"
                value={form.confirm_password}
                onChange={handleChange}
                required
                style={inputStyle}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
              />
            </div>
            <button
              type="submit"
              style={submitStyle}
              onMouseEnter={(event) => {
                event.currentTarget.style.transform = 'translateY(-2px)';
                event.currentTarget.style.boxShadow = isDark
                  ? '0 22px 44px rgba(56, 189, 248, 0.55)'
                  : '0 20px 40px rgba(14, 165, 233, 0.35)';
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.transform = 'translateY(0)';
                event.currentTarget.style.boxShadow = submitStyle.boxShadow;
              }}
            >
              Register
            </button>
          </form>
          <div style={helperStyle}>
            Already have an account?{' '}
            <a href="/login" style={helperLinkStyle}>
              Login instead
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
