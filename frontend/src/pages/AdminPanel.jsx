import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

export default function AdminPanel({ user }) {
  const [songs, setSongs] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [users, setUsers] = useState([]);

  const [importMessage, setImportMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (user?.isAdmin) {
      axios.get('/api/admin/data').then(res => {
        setSongs(res.data.allSongs);
        setAlbums(res.data.albums);
        setUsers(res.data.users);
      });
    }
  }, [user]);

  const handleBulkImport = async (e) => {
    e.preventDefault();
    const file = fileInputRef.current?.files[0];
    if (!file) return;

    setLoading(true);
    setImportMessage('Processing file with SQLizer.io...');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await axios.post('/api/admin/sqlizer-import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      setImportMessage(`Success! Started conversion. Download URL: ${res.data.url}`);
    } catch (err) {
      setImportMessage(`Error: ${err.response?.data?.details || err.message}`);
    }
    setLoading(false);
  };

  if (!user?.isAdmin) return <div className="content-section-new"><h1>Unauthorized Admin Segment</h1></div>;

  return (
    <div className="content-section-new" style={{paddingTop:'40px'}}>
      <div className="container-fluid">
        <h2>Admin Panel</h2>
        
        <div className="login-card" style={{margin:'40px 0', maxWidth:'600px', width:'100%'}}>
           <h3>SQLizer.io Bulk Data Import</h3>
           <p style={{color:'var(--text-muted)', fontSize:'13px', marginBottom:'20px'}}>Upload a CSV or JSON file containing songs to convert them to PostgreSQL instructions using SQLizer.io.</p>
           <form onSubmit={handleBulkImport}>
             <input type="file" ref={fileInputRef} accept=".csv,.json" className="form-input" style={{marginBottom:'10px'}} required/>
             <button type="submit" className="search-btn-new" disabled={loading}>{loading ? 'Uploading...' : 'Convert to SQL'}</button>
           </form>
           {importMessage && <div style={{marginTop:'15px', color:'var(--accent-1)'}}>{importMessage}</div>}
        </div>

        <div style={{display:'flex', gap:'40px'}}>
           <div style={{flex:1}}>
             <h3>Songs List ({songs.length})</h3>
             <ul style={{listStyle:'none', padding:0}}>
               {songs.map(s => (
                 <li key={s.id} style={{padding:'10px', background:'rgba(255,255,255,0.05)', marginBottom:'5px', borderRadius:'8px', display:'flex', justifyContent:'space-between'}}>
                   <span>{s.title} - {s.artist}</span>
                   <button onClick={async() => {
                      if(confirm('Delete?')) {
                        await axios.delete(`/api/admin/songs/${s.id}`);
                        setSongs(songs.filter(ss=>ss.id!==s.id));
                      }
                   }} style={{background:'transparent',border:'none',color:'red',cursor:'pointer'}}><i className="fas fa-trash"></i></button>
                 </li>
               ))}
               {songs.length===0 && <li>No songs</li>}
             </ul>
           </div>

           <div style={{flex:1}}>
             <h3>Albums List ({albums.length})</h3>
             <ul style={{listStyle:'none', padding:0}}>
               {albums.map(a => (
                 <li key={a.id} style={{padding:'10px', background:'rgba(255,255,255,0.05)', marginBottom:'5px', borderRadius:'8px', display:'flex', justifyContent:'space-between'}}>
                   <span>{a.name} ({a.songs.length} songs)</span>
                   <button onClick={async() => {
                      if(confirm('Delete?')) {
                        await axios.delete(`/api/admin/albums/${a.id}`);
                        setAlbums(albums.filter(aa=>aa.id!==a.id));
                      }
                   }} style={{background:'transparent',border:'none',color:'red',cursor:'pointer'}}><i className="fas fa-trash"></i></button>
                 </li>
               ))}
               {albums.length===0 && <li>No albums</li>}
             </ul>
           </div>
        </div>
      </div>
    </div>
  );
}
