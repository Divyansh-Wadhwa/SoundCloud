import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function Login({ setUser, setIsAdmin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/auth/login', { email, password });
      if (res.data.success) {
        setUser(res.data.user);
        setIsAdmin(res.data.user.isAdmin || false);
        navigate('/');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h2>Login</h2>
        <form onSubmit={handleLogin} className="login-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input 
              type="email" id="email" 
              placeholder="Email" required 
              className="form-input"
              value={email} onChange={e => setEmail(e.target.value)} 
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input 
              type="password" id="password" 
              placeholder="Password" required 
              className="form-input"
              value={password} onChange={e => setPassword(e.target.value)} 
            />
          </div>
          <button type="submit" className="btn-login">Login</button>
        </form>
        {error && (
          <div className="error-message">
            <span className="error-icon">❌</span>
            <span className="error-text">{error}</span>
          </div>
        )}
        <p className="auth-link">Don't have an account? <Link to="/register">Register here</Link></p>
      </div>
    </div>
  );
}
