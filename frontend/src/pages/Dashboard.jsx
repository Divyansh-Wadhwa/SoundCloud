import React, { useState } from 'react';
import axios from 'axios';

export default function Dashboard({ user, setUser }) {
  const [username, setUsername] = useState(user?.username || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');

  if (!user) return <div className="content-section-new"><h1>Please login</h1></div>;

  const updateUsername = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/dashboard/update-username', { username });
      setUser(res.data.user);
      setMessage('Username updated successfully');
    } catch(err) {
      setMessage(err.response?.data?.error || 'Failed to update username');
    }
  };

  const updatePassword = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/dashboard/update-password', { currentPassword, newPassword });
      setMessage('Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
    } catch(err) {
      setMessage(err.response?.data?.error || 'Failed to update password');
    }
  };
//
  return (
    <div className="content-section-new">
      <div className="container-fluid">
        <h2>Dashboard</h2>
        {message && <div style={{padding:'10px',background:'rgba(255,255,255,0.1)',marginBottom:'20px'}}>{message}</div>}

        <div style={{display:'flex',gap:'40px',flexWrap:'wrap'}}>
          <div className="login-card" style={{margin:0, flex:1, minWidth:'300px'}}>
            <h3>Update Username</h3>
            <form onSubmit={updateUsername} className="login-form">
              <input type="text" value={username} onChange={e=>setUsername(e.target.value)} className="form-input" style={{marginBottom:'10px'}}/>
              <button className="btn-login" type="submit">Save</button>
            </form>
          </div>

          <div className="login-card" style={{margin:0, flex:1, minWidth:'300px'}}>
            <h3>Update Password</h3>
            <form onSubmit={updatePassword} className="login-form">
              <input type="password" placeholder="Current Password" value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)} className="form-input" style={{marginBottom:'10px'}} required/>
              <input type="password" placeholder="New Password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} className="form-input" style={{marginBottom:'10px'}} required/>
              <button className="btn-login" type="submit">Save</button>
            </form>
          </div>
        </div>

        <h3 style={{marginTop:'40px'}}>Recently Played</h3>
        <div className="tracks-grid-new">
          {user.recentlyPlayed?.map((rp, idx) => (
             <div key={idx} className="track-card-new">
                <div className="track-cover-new">
                  <img src={rp.song.thumbnail || '/images/default-cover.png'} alt="cover" />
                </div>
                <div className="track-info-new">
                  <h4 className="track-title-new">{rp.song.title}</h4>
                  <p className="track-artist-new">{rp.song.artist}</p>
                </div>
             </div>
          ))}
        </div>
      </div>
    </div>
  );
}
