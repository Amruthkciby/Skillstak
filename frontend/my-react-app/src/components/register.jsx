import React, { useState } from 'react';
import Navbarhome from './navbarhome';

export default function Register() {
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    confirm_password: ''
  });
  const [msg, setMsg] = useState(null);
  const [errors, setErrors] = useState(null);

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg(null);
    setErrors(null);
    try {
      const res = await fetch('http://127.0.0.1:8000/mainapp/register/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        setMsg(data.message || 'Registered successfully. You can login now.');
        setForm({ username:'', email:'', password:'', confirm_password:'' });
      } else {
        setErrors(data);
      }
    } catch (err) {
      setErrors({ detail: 'Network error' });
    }
  };

  const handleInputFocus = (event) => {
    event.target.style.borderColor = '#22d3ee';
    event.target.style.boxShadow = '0 0 0 3px rgba(45, 212, 191, 0.2)';
  };

  const handleInputBlur = (event) => {
    event.target.style.borderColor = '#e2e8f0';
    event.target.style.boxShadow = 'none';
  };

  const containerStyle = {
    minHeight: '100vh',
    background: 'linear-gradient(140deg, #082f49 0%, #1e293b 55%, #0f172a 100%)',
    fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', sans-serif",
    display: 'flex',
    flexDirection: 'column',
    padding: '0 64px 80px'
  };

  const contentWrapperStyle = {
    flex: 1,
    display: 'grid',
    alignItems: 'stretch',
    gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
    gap: '52px',
    maxWidth: '1240px',
    margin: '100px auto 70px'
  };

  const infoPanelStyle = {
    background: 'rgba(15, 23, 42, 0.75)',
    borderRadius: '28px',
    padding: '56px 52px',
    color: '#e2e8f0',
    boxShadow: '0 38px 90px rgba(15, 23, 42, 0.55)',
    border: '1px solid rgba(148, 163, 184, 0.16)',
    display: 'flex',
    flexDirection: 'column',
    gap: '22px'
  };

  const infoTitleStyle = {
    fontSize: '2.7rem',
    fontWeight: 700,
    letterSpacing: '-0.9px',
    lineHeight: 1.2
  };

  const infoListStyle = {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'grid',
    gap: '14px',
    fontSize: '0.98rem'
  };

  const infoItemStyle = {
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-start',
    background: 'rgba(45, 212, 191, 0.1)',
    borderRadius: '16px',
    padding: '14px 18px',
    border: '1px solid rgba(45, 212, 191, 0.25)'
  };

  const cardStyle = {
    width: '100%',
    background: 'rgba(15, 23, 42, 0.92)',
    borderRadius: '26px',
    padding: '56px 52px',
    boxShadow: '0 38px 90px rgba(15, 23, 42, 0.58)',
    border: '1px solid rgba(148, 163, 184, 0.18)',
    color: '#e2e8f0',
    backdropFilter: 'blur(18px)'
  };

  const titleStyle = {
    fontSize: '2.5rem',
    fontWeight: 700,
    marginBottom: '26px',
    textAlign: 'center',
    letterSpacing: '-0.5px',
    background: 'linear-gradient(135deg, #22d3ee 0%, #34d399 45%, #6366f1 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent'
  };

  const inputGroupStyle = {
    marginBottom: '20px'
  };

  const labelStyle = {
    display: 'block',
    fontSize: '0.95rem',
    fontWeight: 600,
    color: 'rgba(226, 232, 240, 0.88)',
    marginBottom: '10px',
    letterSpacing: '0.3px'
  };

  const inputStyle = {
    width: '100%',
    padding: '14px 16px',
    fontSize: '1rem',
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    outline: 'none',
    transition: 'all 0.25s ease',
    boxSizing: 'border-box',
    background: 'rgba(15, 23, 42, 0.6)',
    color: '#f8fafc'
  };

  const submitStyle = {
    width: '100%',
    padding: '14px',
    fontSize: '1.05rem',
    fontWeight: 600,
    color: '#0f172a',
    background: 'linear-gradient(135deg, #22d3ee 0%, #34d399 50%, #a855f7 100%)',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.25s ease',
    marginTop: '12px',
    boxShadow: '0 18px 40px rgba(45, 212, 191, 0.35)'
  };

  const messageStyle = {
    background: 'rgba(34, 211, 238, 0.18)',
    border: '1px solid rgba(34, 211, 238, 0.35)',
    color: '#bae6fd',
    padding: '14px 18px',
    borderRadius: '12px',
    marginBottom: '18px',
    fontSize: '0.95rem',
    textAlign: 'center',
    boxShadow: '0 12px 30px rgba(34, 211, 238, 0.18)'
  };

  const errorStyle = {
    background: 'rgba(248, 113, 113, 0.18)',
    border: '1px solid rgba(248, 113, 113, 0.4)',
    color: '#fecaca',
    padding: '14px 18px',
    borderRadius: '12px',
    marginBottom: '18px',
    fontSize: '0.95rem',
    whiteSpace: 'pre-wrap',
    boxShadow: '0 12px 30px rgba(248, 113, 113, 0.2)'
  };

  const helperStyle = {
    marginTop: '20px',
    textAlign: 'center',
    fontSize: '0.95rem',
    color: 'rgba(148, 163, 184, 0.75)'
  };

  const helperLinkStyle = {
    color: '#22d3ee',
    textDecoration: 'none',
    fontWeight: 600
  };

  return (
    <div style={containerStyle}>
      <Navbarhome/>
      <div style={contentWrapperStyle}>
        <aside style={infoPanelStyle}>
          <div style={infoTitleStyle}>Create your SkillTrack workspace</div>
          <p style={{ fontSize: '1.05rem', opacity: 0.78, lineHeight: 1.7 }}>
            A single dashboard unifies goals, resources, timelines, and weekly insights. Set up your account
            and start capturing your learning momentum.
          </p>
          <ul style={infoListStyle}>
            <li style={infoItemStyle}>
              <span style={{ fontWeight: 700, color: '#a7f3d0' }}>Own your roadmap</span>
              <span>Define goals per skill, record target hours, and let the dashboard visualise progress.</span>
            </li>
            <li style={infoItemStyle}>
              <span style={{ fontWeight: 700, color: '#a7f3d0' }}>Track proactively</span>
              <span>Log daily activities, import courses with a link, and annotate what you learned.</span>
            </li>
            <li style={infoItemStyle}>
              <span style={{ fontWeight: 700, color: '#a7f3d0' }}>Review weekly</span>
              <span>Generate mock summary emails that highlight hours logged and goals touched.</span>
            </li>
          </ul>
        </aside>
        <div style={cardStyle}>
          <h2 style={titleStyle}>Create Account</h2>
          {msg && <div style={messageStyle}>{msg}</div>}
          {errors && (
            <div style={errorStyle}>{JSON.stringify(errors, null, 2)}</div>
          )}
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
              <label style={labelStyle}>Email</label>
              <input
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
            <div style={inputGroupStyle}>
              <label style={labelStyle}>Confirm Password</label>
              <input
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
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 22px 44px rgba(45, 212, 191, 0.45)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 18px 40px rgba(45, 212, 191, 0.35)';
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
