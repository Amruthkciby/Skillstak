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
    background: 'linear-gradient(135deg, #0f172a 0%, #312e81 50%, #1f2937 100%)',
    fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', sans-serif",
    display: 'flex',
    flexDirection: 'column'
  };

  const contentWrapperStyle = {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '32px 16px'
  };

  const cardStyle = {
    width: 'min(440px, 100%)',
    background: 'rgba(15, 23, 42, 0.9)',
    borderRadius: '22px',
    padding: '48px 40px',
    boxShadow: '0 25px 65px rgba(15, 23, 42, 0.45)',
    border: '1px solid rgba(148, 163, 184, 0.15)',
    color: '#e2e8f0',
    backdropFilter: 'blur(16px)'
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
