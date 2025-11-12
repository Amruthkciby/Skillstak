import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // if using react-router
import Navbarhome from './navbarhome';

export default function Login() {
  const [form, setForm] = useState({ username: '', password: ''});
  const [error, setError] = useState(null);
  const navigate = useNavigate?.() || (() => {});

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch('http://127.0.0.1:8000/mainapp/token/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
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
    event.target.style.borderColor = '#667eea';
    event.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.2)';
  };

  const handleInputBlur = (event) => {
    event.target.style.borderColor = '#e0e0e0';
    event.target.style.boxShadow = 'none';
  };

  const containerStyle = {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 45%, #0c4a6e 100%)',
    fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', sans-serif",
    display: 'flex',
    flexDirection: 'column',
    padding: '0 60px 80px'
  };

  const contentWrapperStyle = {
    flex: 1,
    display: 'grid',
    alignItems: 'stretch',
    gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
    gap: '48px',
    maxWidth: '1200px',
    margin: '100px auto 60px'
  };

  const infoPanelStyle = {
    background: 'rgba(15, 23, 42, 0.72)',
    borderRadius: '28px',
    padding: '52px 48px',
    color: '#f8fafc',
    boxShadow: '0 38px 90px rgba(15, 23, 42, 0.55)',
    border: '1px solid rgba(148, 163, 184, 0.18)',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  };

  const infoTitleStyle = {
    fontSize: '2.6rem',
    fontWeight: 700,
    letterSpacing: '-1px',
    lineHeight: 1.2
  };

  const infoListStyle = {
    listStyle: 'none',
    padding: 0,
    margin: '0',
    display: 'grid',
    gap: '14px',
    fontSize: '0.95rem',
    opacity: 0.9
  };

  const infoBulletStyle = {
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-start',
    background: 'rgba(59, 130, 246, 0.12)',
    borderRadius: '16px',
    padding: '14px 18px',
    border: '1px solid rgba(59, 130, 246, 0.22)'
  };

  const cardStyle = {
    width: '100%',
    background: 'rgba(15, 23, 42, 0.92)',
    borderRadius: '24px',
    padding: '56px 48px',
    boxShadow: '0 32px 90px rgba(15, 23, 42, 0.6)',
    border: '1px solid rgba(148, 163, 184, 0.18)',
    color: '#e2e8f0',
    backdropFilter: 'blur(18px)'
  };

  const titleStyle = {
    fontSize: '2.4rem',
    fontWeight: 700,
    marginBottom: '28px',
    textAlign: 'center',
    letterSpacing: '-0.5px',
    background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 50%, #38bdf8 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent'
  };

  const inputGroupStyle = {
    marginBottom: '22px'
  };

  const labelStyle = {
    display: 'block',
    fontSize: '0.95rem',
    fontWeight: 600,
    color: 'rgba(226, 232, 240, 0.9)',
    marginBottom: '10px',
    letterSpacing: '0.3px'
  };

  const inputStyle = {
    width: '100%',
    padding: '14px 16px',
    fontSize: '1rem',
    border: '2px solid #e0e0e0',
    borderRadius: '12px',
    outline: 'none',
    transition: 'all 0.25s ease',
    boxSizing: 'border-box',
    background: 'rgba(15, 23, 42, 0.6)',
    color: '#f1f5f9'
  };

  const buttonStyle = {
    width: '100%',
    padding: '14px',
    fontSize: '1.05rem',
    fontWeight: 600,
    color: '#f8fafc',
    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%)',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.25s ease',
    marginTop: '6px',
    boxShadow: '0 15px 35px rgba(99, 102, 241, 0.35)'
  };

  const helperStyle = {
    marginTop: '20px',
    textAlign: 'center',
    fontSize: '0.95rem',
    color: 'rgba(148, 163, 184, 0.75)'
  };

  const helperLinkStyle = {
    color: '#a855f7',
    textDecoration: 'none',
    fontWeight: 600
  };

  const errorStyle = {
    background: 'rgba(248, 113, 113, 0.18)',
    color: '#fecaca',
    border: '1px solid rgba(248, 113, 113, 0.4)',
    padding: '14px 18px',
    borderRadius: '12px',
    marginBottom: '22px',
    fontSize: '0.95rem',
    fontWeight: 500,
    textAlign: 'center',
    boxShadow: '0 10px 25px rgba(248, 113, 113, 0.18)'
  };

  return (
    <div style={containerStyle}>
      <Navbarhome/>
      <div style={contentWrapperStyle}>
        <aside style={infoPanelStyle}>
          <div style={infoTitleStyle}>Welcome back to SkillTrack</div>
          <p style={{ fontSize: '1.05rem', opacity: 0.75, lineHeight: 1.7 }}>
            Sign in to resume logging your learning hours, capture new courses, and discover how your
            skills have evolved over time.
          </p>
          <ul style={infoListStyle}>
            <li style={infoBulletStyle}>
              <span style={{ fontWeight: 700, color: '#bfdbfe' }}>Secure</span>
              <span>JSON Web Token authentication keeps your progress safe and session-aware.</span>
            </li>
            <li style={infoBulletStyle}>
              <span style={{ fontWeight: 700, color: '#bfdbfe' }}>Fast</span>
              <span>React and Django pair up for responsive updates and real-time timelines.</span>
            </li>
            <li style={infoBulletStyle}>
              <span style={{ fontWeight: 700, color: '#bfdbfe' }}>Insightful</span>
              <span>Track hours vs targets, import resources, and access weekly summaries instantly.</span>
            </li>
          </ul>
        </aside>
        <div style={cardStyle}>
          <h2 style={titleStyle}>Login</h2>
          {error && <div style={errorStyle}>{error}</div>}
          <form onSubmit={handleSubmit}>
            <div style={inputGroupStyle}>
              <label style={labelStyle}>Username</label>
              <input
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
              <label style={labelStyle}>Password</label>
              <input
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
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 20px 40px rgba(99, 102, 241, 0.45)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 15px 35px rgba(99, 102, 241, 0.35)';
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
