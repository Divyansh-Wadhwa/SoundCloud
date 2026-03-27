import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function Playlists({ user }) {
  const [playlists, setPlaylists] = useState([]);
  const [name, setName] = useState('');

  useEffect(() => {
    if (user) {
      axios.get('/api/playlists').then(res => setPlaylists(res.data.playlists));
    }
  }, [user]);

  const createPlaylist = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      const res = await axios.post('/api/playlists', { name });
      setPlaylists([...playlists, {...res.data.playlist, songs: []}]);
      setName('');
    } catch(err) {}
  };

  const deletePlaylist = async (id) => {
    try {
      await axios.delete(`/api/playlists/${id}`);
      setPlaylists(playlists.filter(p => p.id !== id));
    } catch (e) {}
  };

  if (!user) return <div className="content-section-new"><h1>Please login</h1></div>;

  return (
    <div className="content-section-new">
      <div className="container-fluid">
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <h2>Your Playlists</h2>
          <form onSubmit={createPlaylist} style={{display:'flex',gap:'10px'}}>
            <input type="text" value={name} onChange={e=>setName(e.target.value)} placeholder="New playlist name" className="form-input" style={{width:'200px'}} />
            <button type="submit" className="search-btn-new" style={{padding:'8px 16px', borderRadius:'8px'}}>Create</button>
          </form>
        </div>

        <div className="albums-grid-new" style={{marginTop:'30px'}}>
          {playlists.map(p => (
            <div key={p.id} className="album-card-new">
              <div className="album-cover-new">
                <img src={p.songs?.length ? p.songs[0].thumbnail : '/images/default-cover.png'} alt={p.name} />
                <div className="album-overlay">
                  <button onClick={() => deletePlaylist(p.id)} style={{background:'red',color:'white',border:'none',padding:'10px',borderRadius:'50%',cursor:'pointer'}}><i className="fas fa-trash"></i></button>
                </div>
                <div className="album-tracks-badge"><i className="fas fa-music"></i> {p.songs?.length || 0}</div>
              </div>
              <div className="album-info-new">
                <h3 className="album-title-new">{p.name}</h3>
              </div>
            </div>
          ))}
          {playlists.length === 0 && <p className="empty-text-new">No playlists yet.</p>}
        </div>
      </div>
    </div>
  );
}
