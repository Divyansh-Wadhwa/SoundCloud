import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import SongUpload from '../components/SongUpload';
import EditSongModal from '../components/EditSongModal';
import '../styles/admin.css';

export default function AdminPanel({ user }) {
  const [songs, setSongs] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [users, setUsers] = useState([]);
  const [editingSong, setEditingSong] = useState(null);
  const [selectedAlbum, setSelectedAlbum] = useState(null);
  const [showAddSongsModal, setShowAddSongsModal] = useState(false);
  const [showCreateAlbum, setShowCreateAlbum] = useState(false);
  const [newAlbum, setNewAlbum] = useState({ name: '', artist: '' });
  const [albumCoverFile, setAlbumCoverFile] = useState(null);

  useEffect(() => {
    if (user?.isAdmin) {
      axios.get('/api/admin/data').then(res => {
        setSongs(res.data.allSongs);
        setAlbums(res.data.albums);
        setUsers(res.data.users);
      });
    }
  }, [user]);

  const handleSongAdded = (newSong) => {
    setSongs(prev => [newSong, ...prev]);
  };

  const handleSongUpdated = (updatedSong) => {
    setSongs(prev => prev.map(song => 
      song.id === updatedSong.id ? updatedSong : song
    ));
    setEditingSong(null);
  };

  const handleCreateAlbum = async () => {
    if (!newAlbum.name || !newAlbum.artist) {
      alert('Please fill all album fields');
      return;
    }
    
    try {
      const formData = new FormData();
      formData.append('name', newAlbum.name);
      formData.append('artist', newAlbum.artist);
      if (albumCoverFile) {
        formData.append('cover', albumCoverFile);
      }
      
      const response = await axios.post('/api/admin/albums', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      setAlbums(prev => [...prev, response.data.album]);
      setNewAlbum({ name: '', artist: '' });
      setAlbumCoverFile(null);
      setShowCreateAlbum(false);
    } catch (error) {
      alert('Error creating album: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleDeleteSong = async (songId) => {
    if (confirm('Are you sure you want to delete this song?')) {
      try {
        await axios.delete(`/api/admin/songs/${songId}`);
        setSongs(prev => prev.filter(song => song.id !== songId));
      } catch (error) {
        alert('Error deleting song: ' + (error.response?.data?.error || error.message));
      }
    }
  };

  const handleDeleteAlbum = async (albumId) => {
    const album = albums.find(a => a.id === albumId);
    if (album && (album.songs?.length || 0) > 0) {
      alert(`Cannot delete album "${album.name}" because it contains ${album.songs?.length || 0} songs. Remove songs first.`);
      return;
    }
    
    if (confirm('Are you sure you want to delete this album?')) {
      try {
        await axios.delete(`/api/admin/albums/${albumId}`);
        setAlbums(prev => prev.filter(album => album.id !== albumId));
      } catch (error) {
        alert('Error deleting album: ' + (error.response?.data?.error || error.message));
      }
    }
  };

  const handleAddSongsToAlbum = (album) => {
    setSelectedAlbum(album);
    setShowAddSongsModal(true);
  };

  const handleAddSongToAlbum = async (songId) => {
    try {
      await axios.post(`/api/admin/albums/${selectedAlbum.id}/add/${songId}`);
      // Refresh data
      const res = await axios.get('/api/admin/data');
      setAlbums(res.data.albums);
      setSongs(res.data.allSongs);
    } catch (error) {
      alert('Error adding song to album: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleRemoveSongFromAlbum = async (songId) => {
    try {
      await axios.post(`/api/admin/albums/${selectedAlbum.id}/remove/${songId}`);
      // Refresh data
      const res = await axios.get('/api/admin/data');
      setAlbums(res.data.albums);
      setSongs(res.data.allSongs);
    } catch (error) {
      alert('Error removing song from album: ' + (error.response?.data?.error || error.message));
    }
  };

  if (!user?.isAdmin) return <div className="content-section-new"><h1>Unauthorized Admin Segment</h1></div>;

  return (
    <div className="content-section-new" style={{paddingTop:'40px'}}>
      <div className="container-fluid">
        <h2>Admin Panel</h2>
        
        <SongUpload albums={albums} onSongAdded={handleSongAdded} />
        
        <div className="admin-actions">
          <div className="action-section">
            <h3>Quick Actions</h3>
            <div className="action-buttons">
              <button 
                className="action-btn"
                onClick={() => setShowCreateAlbum(!showCreateAlbum)}
              >
                <i className="fas fa-plus-circle"></i>
                Create New Album
              </button>
            </div>
            
            {showCreateAlbum && (
              <div className="create-album-form">
                <h4>Create New Album</h4>
                <div className="form-row">
                  <input
                    type="text"
                    placeholder="Album Name"
                    value={newAlbum.name}
                    onChange={(e) => setNewAlbum(prev => ({ ...prev, name: e.target.value }))}
                  />
                  <input
                    type="text"
                    placeholder="Artist Name"
                    value={newAlbum.artist}
                    onChange={(e) => setNewAlbum(prev => ({ ...prev, artist: e.target.value }))}
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Album Cover (Optional)</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setAlbumCoverFile(e.target.files[0])}
                    />
                    {albumCoverFile && (
                      <div className="file-info">
                        <i className="fas fa-image"></i>
                        {albumCoverFile.name}
                      </div>
                    )}
                  </div>
                </div>
                <div className="form-actions">
                  <button onClick={handleCreateAlbum} className="save-btn">
                    <i className="fas fa-save"></i>
                    Create Album
                  </button>
                  <button onClick={() => {
                    setShowCreateAlbum(false);
                    setNewAlbum({ name: '', artist: '' });
                    setAlbumCoverFile(null);
                  }} className="cancel-btn">
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="content-grid">
           <div className="content-section">
             <div className="section-header">
               <h3>Songs ({songs.length})</h3>
               <div className="section-stats">
                 <span className="stat-item">Total: {songs.length}</span>
               </div>
             </div>
             <div className="songs-grid">
               {songs.map(s => (
                 <div key={s.id} className="song-card">
                   <div className="song-info">
                     <div className="song-thumbnail">
                       { s.thumbnail ? (
                         <img src={`http://localhost:5000${s.thumbnail}`} alt={s.title} />
                       ) : (
                         <div className="thumbnail-placeholder">
                           <i className="fas fa-music"></i>
                         </div>
                       )}
                     </div>
                     <div className="song-details">
                       <h4>{s.title}</h4>
                       <p className="artist">{s.artist}</p>
                       <p className="meta">
                         {s.language} • {s.album?.name || 'No Album'}
                       </p>
                     </div>
                   </div>
                   <div className="song-actions">
                     <button 
                       className="edit-btn"
                       onClick={() => setEditingSong(s)}
                       title="Edit song"
                     >
                       <i className="fas fa-edit"></i>
                     </button>
                     <button 
                       className="delete-btn"
                       onClick={() => handleDeleteSong(s.id)}
                       title="Delete song"
                     >
                       <i className="fas fa-trash"></i>
                     </button>
                   </div>
                 </div>
               ))}
               {songs.length === 0 && (
                 <div className="empty-state">
                   <i className="fas fa-music"></i>
                   <p>No songs uploaded yet</p>
                   <small>Use the upload form above to add your first song</small>
                 </div>
               )}
             </div>
           </div>

           <div className="content-section">
             <div className="section-header">
               <h3>Albums ({albums.length})</h3>
               <div className="section-stats">
                 <span className="stat-item">Total: {albums.length}</span>
               </div>
             </div>
             <div className="albums-grid">
               {albums.map(a => (
                 <div key={a.id} className="album-card">
                   <div className="album-info">
                     <div className="album-thumbnail">
                       {a.cover ? (
                         <img src={`http://localhost:5000${a.cover}`} alt={a.name} />
                       ) : (
                         <div className="album-icon">
                           <i className="fas fa-compact-disc"></i>
                         </div>
                       )}
                     </div>
                     <div className="album-details">
                       <h4>{a.name}</h4>
                       <p className="artist">{a.artist}</p>
                       <p className="meta">{a.songs?.length || 0} songs</p>
                     </div>
                   </div>
                   <div className="album-actions">
                    <button 
                      className="edit-btn"
                      onClick={() => handleAddSongsToAlbum(a)}
                      title="Add songs to album"
                    >
                      <i className="fas fa-plus"></i>
                    </button>
                    <button 
                      className="delete-btn"
                      onClick={() => handleDeleteAlbum(a.id)}
                      title="Delete album"
                      disabled={(a.songs?.length || 0) > 0}
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                  </div>
                 </div>
               ))}
               {albums.length === 0 && (
                 <div className="empty-state">
                   <i className="fas fa-compact-disc"></i>
                   <p>No albums created yet</p>
                   <small>Create your first album using the button above</small>
                 </div>
               )}
             </div>
           </div>
        </div>
        
        {editingSong && (
          <EditSongModal 
            song={editingSong}
            albums={albums}
            onSave={handleSongUpdated}
            onClose={() => setEditingSong(null)}
          />
        )}

        {/* Add Songs to Album Modal */}
        {showAddSongsModal && selectedAlbum && (
          <div className="modal-overlay">
            <div className="modal-content" style={{maxWidth: '800px', maxHeight: '80vh'}}>
              <div className="modal-header">
                <h3>Add Songs to Album: {selectedAlbum.name}</h3>
                <button className="close-btn" onClick={() => setShowAddSongsModal(false)}>
                  <i className="fas fa-times"></i>
                </button>
              </div>
              <div className="modal-body" style={{maxHeight: '60vh', overflowY: 'auto'}}>
                <div className="album-info" style={{background: 'var(--bg-secondary)', padding: '15px', borderRadius: '8px', marginBottom: '20px'}}>
                  <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
                    {selectedAlbum.cover ? (
                      <img src={`http://localhost:5000${selectedAlbum.cover}`} alt={selectedAlbum.name} style={{width: '60px', height: '60px', borderRadius: '8px', objectFit: 'cover'}} />
                    ) : (
                      <div style={{width: '60px', height: '60px', borderRadius: '8px', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                        <i className="fas fa-compact-disc" style={{fontSize: '24px', color: 'var(--text-secondary)'}}></i>
                      </div>
                    )}
                    <div>
                      <h4 style={{margin: '0 0 5px 0', color: 'var(--text-primary)'}}>{selectedAlbum.name}</h4>
                      <p style={{margin: 0, color: 'var(--text-secondary)'}}>{selectedAlbum.artist}</p>
                      <p style={{margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem'}}>
                        {selectedAlbum.songs?.length || 0} songs in album
                      </p>
                    </div>
                  </div>
                </div>

                <h4 style={{marginBottom: '15px', color: 'var(--text-primary)'}}>
                  <i className="fas fa-music" style={{marginRight: '8px'}}></i>
                  Available Songs
                </h4>
                
                <div className="songs-list">
                  {songs.filter(song => !song.albumId || song.albumId !== selectedAlbum.id).map(song => (
                    <div key={song.id} className="song-item" style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '12px',
                      background: 'var(--bg-secondary)',
                      borderRadius: '8px',
                      marginBottom: '10px',
                      border: '1px solid var(--border-color)'
                    }}>
                      <div style={{width: '40px', textAlign: 'center', color: 'var(--text-secondary)'}}>
                        {song.thumbnail ? (
                          <img src={`http://localhost:5000${song.thumbnail}`} alt={song.title} style={{width: '40px', height: '40px', borderRadius: '4px', objectFit: 'cover'}} />
                        ) : (
                          <i className="fas fa-music"></i>
                        )}
                      </div>
                      <div style={{flex: 1, marginLeft: '15px'}}>
                        <h5 style={{margin: '0 0 3px 0', color: 'var(--text-primary)', fontSize: '0.95rem'}}>{song.title}</h5>
                        <p style={{margin: 0, color: 'var(--text-secondary)', fontSize: '0.85rem'}}>{song.artist} • {song.language}</p>
                      </div>
                      <button 
                        className="add-btn"
                        onClick={() => handleAddSongToAlbum(song.id)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '4px',
                          border: 'none',
                          background: 'var(--accent-1)',
                          color: 'white',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px'
                        }}
                      >
                        <i className="fas fa-plus"></i>
                        Add
                      </button>
                    </div>
                  ))}
                  
                  {songs.filter(song => !song.albumId || song.albumId !== selectedAlbum.id).length === 0 && (
                    <div style={{textAlign: 'center', padding: '40px', color: 'var(--text-secondary)'}}>
                      <i className="fas fa-music" style={{fontSize: '2rem', marginBottom: '10px'}}></i>
                      <p>All songs are already in this album</p>
                    </div>
                  )}
                </div>

                {selectedAlbum.songs?.length > 0 && (
                  <>
                    <h4 style={{margin: '25px 0 15px 0', color: 'var(--text-primary)'}}>
                      <i className="fas fa-list" style={{marginRight: '8px'}}></i>
                      Songs in Album
                    </h4>
                    <div className="songs-list">
                      {selectedAlbum.songs.map(song => (
                        <div key={song.id} className="song-item" style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '12px',
                          background: 'var(--bg-secondary)',
                          borderRadius: '8px',
                          marginBottom: '10px',
                          border: '1px solid var(--border-color)',
                          opacity: 0.7
                        }}>
                          <div style={{width: '40px', textAlign: 'center', color: 'var(--text-secondary)'}}>
                            {song.thumbnail ? (
                              <img src={`http://localhost:5000${song.thumbnail}`} alt={song.title} style={{width: '40px', height: '40px', borderRadius: '4px', objectFit: 'cover'}} />
                            ) : (
                              <i className="fas fa-music"></i>
                            )}
                          </div>
                          <div style={{flex: 1, marginLeft: '15px'}}>
                            <h5 style={{margin: '0 0 3px 0', color: 'var(--text-primary)', fontSize: '0.95rem'}}>{song.title}</h5>
                            <p style={{margin: 0, color: 'var(--text-secondary)', fontSize: '0.85rem'}}>{song.artist} • {song.language}</p>
                          </div>
                          <button 
                            className="remove-btn"
                            onClick={() => handleRemoveSongFromAlbum(song.id)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '4px',
                              border: 'none',
                              background: 'rgba(239, 68, 68, 0.9)',
                              color: 'white',
                              cursor: 'pointer',
                              fontSize: '0.85rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '5px'
                            }}
                          >
                            <i className="fas fa-minus"></i>
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

