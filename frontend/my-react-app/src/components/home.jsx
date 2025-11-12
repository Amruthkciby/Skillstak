import React, { useEffect, useState } from 'react';
import Navbarhome from './navbarhome';

export default function Home() {
  const [apiData, setApiData] = useState(null);   // store API response
  const [error, setError] = useState(null);       // store any error

  useEffect(() => {
    // Fetch the data from Django REST API
    fetch('http://127.0.0.1:8000/mainapp/hello/')   // <-- your Django endpoint
      .then((response) => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json();
      })
      .then((data) => setApiData(data))
      .catch((err) => setError(err.message));
  }, []); // empty array = run once on component mount

  const containerStyle = {
    minHeight: '100vh',
    background: 'radial-gradient(circle at top left, #8b5cf6 0%, #312e81 40%, #0f172a 100%)',
    padding: '0 48px 64px',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
  };

  const mainLayoutStyle = {
    maxWidth: '1200px',
    margin: '120px auto 60px',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '48px',
    alignItems: 'stretch'
  };

  const heroStyle = {
    background: 'rgba(15, 23, 42, 0.78)',
    borderRadius: '24px',
    padding: '48px 42px',
    color: '#f8fafc',
    boxShadow: '0 32px 80px rgba(15, 23, 42, 0.55)',
    border: '1px solid rgba(148, 163, 184, 0.18)'
  };

  const titleStyle = {
    fontSize: '3.4rem',
    fontWeight: 700,
    lineHeight: 1.1,
    marginBottom: '18px',
    background: 'linear-gradient(135deg, #f97316, #f472b6, #38bdf8)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    letterSpacing: '-1.5px'
  };

  const subtitleStyle = {
    fontSize: '1.1rem',
    opacity: 0.8,
    lineHeight: 1.6,
    marginBottom: '30px'
  };

  const highlightListStyle = {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'grid',
    gap: '14px',
    fontSize: '0.98rem'
  };

  const highlightItemStyle = {
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-start',
    background: 'rgba(59, 130, 246, 0.12)',
    borderRadius: '14px',
    padding: '14px 18px',
    border: '1px solid rgba(59, 130, 246, 0.25)'
  };

  const statusCardStyle = {
    background: 'rgba(15, 23, 42, 0.92)',
    borderRadius: '24px',
    padding: '42px 36px',
    color: '#f8fafc',
    boxShadow: '0 28px 70px rgba(15, 23, 42, 0.6)',
    border: '1px solid rgba(148, 163, 184, 0.16)',
    display: 'flex',
    flexDirection: 'column',
    gap: '22px'
  };

  const statusHeaderStyle = {
    fontSize: '1.2rem',
    fontWeight: 600,
    letterSpacing: '0.3px',
    opacity: 0.85
  };

  const messageStyle = {
    fontSize: '2rem',
    fontWeight: 700,
    lineHeight: 1.3
  };

  const statusStyle = {
    fontSize: '1rem',
    opacity: 0.85,
    background: 'rgba(255, 255, 255, 0.08)',
    padding: '12px 20px',
    borderRadius: '18px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '10px'
  };

  const errorStyle = {
    background: 'rgba(248, 113, 113, 0.2)',
    color: '#fecaca',
    border: '1px solid rgba(248, 113, 113, 0.4)',
    padding: '16px 22px',
    borderRadius: '14px',
    fontSize: '1rem',
    fontWeight: 500,
    boxShadow: '0 22px 50px rgba(248, 113, 113, 0.22)'
  };

  const loadingStyle = {
    fontSize: '1.1rem',
    color: '#60a5fa',
    fontWeight: 500,
    letterSpacing: '0.6px'
  };

  return (
    <div style={containerStyle}>
      <Navbarhome/>
      <div style={mainLayoutStyle}>
        <section style={heroStyle}>
          <h1 style={titleStyle}>Skill growth meets powerful tracking</h1>
          <p style={subtitleStyle}>
            Connect your React learning experience directly with your Django backend. Track new goals,
            log your sessions, and visualise your progress across platforms with real‑time insights.
          </p>
          <ul style={highlightListStyle}>
            <li style={highlightItemStyle}>
              <span style={{ fontWeight: 700, color: '#93c5fd' }}>01</span>
              <span> Capture every learning goal, annotate resources, and keep your timeline up to date.</span>
            </li>
            <li style={highlightItemStyle}>
              <span style={{ fontWeight: 700, color: '#93c5fd' }}>02</span>
              <span> Import courses instantly by pasting links—metadata is grabbed automatically.</span>
            </li>
            <li style={highlightItemStyle}>
              <span style={{ fontWeight: 700, color: '#93c5fd' }}>03</span>
              <span> Generate a weekly summary to review logged hours and celebrate progress.</span>
            </li>
          </ul>
        </section>

        <aside style={statusCardStyle}>
          <div style={statusHeaderStyle}>Current backend status</div>
          {error && <div style={errorStyle}>Error: {error}</div>}
          {apiData ? (
            <>
              <div style={messageStyle}>{apiData.message}</div>
              <div style={statusStyle}>
                <span style={{ width: '10px', height: '10px', borderRadius: '999px', background: '#34d399' }} />
                Status: {apiData.status}
              </div>
            </>
          ) : (
            <div style={loadingStyle}>Contacting Django API…</div>
          )}
        </aside>
      </div>
    </div>
  );
}
