import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function Navbar({ user, isAdmin, setUser }) {
  const [userDropdown, setUserDropdown] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    fetch('/api/auth/logout', { method: 'POST' })
      .then(() => {
        setUser(null);
        navigate('/login');
      });
  };

  return (
    <nav className="top-navbar" id="topNavbar">
      <Link to="/" className="nav-brand">
        <img src="/images/logo.svg" alt="SoundCloud Logo" className="brand-icon" />
        <span className="brand-text">SoundCloud</span>
      </Link>

      <div className="nav-menu">
        <Link to="/" className="menu-link">
          <i className="fas fa-house"></i>
          <span>Home</span>
        </Link>
        {user && !isAdmin && (
          <>
            <Link to="/playlists" className="menu-link">
              <i className="fas fa-list"></i>
              <span>Playlists</span>
            </Link>
            <Link to="/favorites" className="menu-link">
              <i className="fas fa-heart"></i>
              <span>Favorites</span>
            </Link>
          </>
        )}
      </div>

      <div className="nav-actions">
        {user ? (
          <div className="user-dropdown">
            <button className="user-avatar-btn" onClick={() => setUserDropdown(!userDropdown)}>
              <img src={`https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${user.username}`} alt={user.username} className="user-avatar-img" />
            </button>
            {userDropdown && (
              <div className="user-dropdown-menu active" style={{ display: 'block', right: 0 }}>
                <div className="dropdown-header">
                  <div className="dropdown-avatar">
                    <img src={`https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${user.username}`} alt={user.username} className="user-avatar-img" />
                  </div>
                  <div className="dropdown-user-info">
                    <span className="dropdown-username">{user.username}</span>
                    <span className="dropdown-email">{user.email}</span>
                  </div>
                </div>
                <div className="dropdown-divider"></div>
                <Link to={isAdmin ? "/admin" : "/dashboard"} className="dropdown-item" onClick={() => setUserDropdown(false)}>
                  <i className="fas fa-home"></i>
                  <span>Dashboard</span>
                </Link>
                {!isAdmin && (
                  <Link to="/playlists" className="dropdown-item" onClick={() => setUserDropdown(false)}>
                    <i className="fas fa-list"></i>
                    <span>My Playlists</span>
                  </Link>
                )}
                <div className="dropdown-divider"></div>
                <button onClick={handleLogout} className="dropdown-item logout-item" style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer' }}>
                  <i className="fas fa-power-off"></i>
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            <Link to="/login" className="action-btn login-btn">
              <i className="fas fa-sign-in-alt"></i>
              <span>Login</span>
            </Link>
            <Link to="/register" className="action-btn register-btn">
              <i className="fas fa-user-plus"></i>
              <span>Sign Up</span>
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
