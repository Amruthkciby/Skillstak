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
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '20px',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
  };

  const contentStyle = {
    maxWidth: '800px',
    margin: '100px auto 40px',
    background: 'rgba(255, 255, 255, 0.95)',
    borderRadius: '20px',
    padding: '50px 40px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
    textAlign: 'center'
  };

  const titleStyle = {
    fontSize: '3rem',
    fontWeight: '700',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    marginBottom: '20px',
    letterSpacing: '-1px'
  };

  const cardStyle = {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    borderRadius: '15px',
    padding: '30px',
    marginTop: '30px',
    color: 'white',
    boxShadow: '0 10px 30px rgba(102, 126, 234, 0.4)'
  };

  const messageStyle = {
    fontSize: '1.8rem',
    fontWeight: '600',
    marginBottom: '15px'
  };

  const statusStyle = {
    fontSize: '1.1rem',
    opacity: 0.9,
    background: 'rgba(255, 255, 255, 0.2)',
    padding: '10px 20px',
    borderRadius: '25px',
    display: 'inline-block',
    marginTop: '10px'
  };

  const errorStyle = {
    background: '#ff4757',
    color: 'white',
    padding: '15px 25px',
    borderRadius: '10px',
    marginTop: '20px',
    fontSize: '1rem',
    fontWeight: '500',
    boxShadow: '0 5px 15px rgba(255, 71, 87, 0.3)'
  };

  const loadingStyle = {
    fontSize: '1.2rem',
    color: '#667eea',
    fontWeight: '500',
    marginTop: '20px'
  };

  return (
    <div style={containerStyle}>
      <Navbarhome/>
      <div style={contentStyle}>
        <h1 style={titleStyle}>React ↔ Django Test</h1>
        
        {error && <div style={errorStyle}>Error: {error}</div>}
        
        {apiData ? (
          <div style={cardStyle}>
            <h2 style={messageStyle}>{apiData.message}</h2>
            <div style={statusStyle}>Status: {apiData.status}</div>
          </div>
        ) : (
          <div style={loadingStyle}>Loading...</div>
        )}
      </div>
    </div>
  );
}
