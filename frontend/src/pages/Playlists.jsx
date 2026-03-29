import React, { useState, useEffect } from 'react';
import axios from 'axios';

const getImageUrl = (image) => {
  if (!image) return '/images/default-cover.png';
  if (image.startsWith('http')) return image;
  return `http://localhost:5000${image}`;
};

export default function Playlists({ user, queue, setQueue, currentSongIndex, setCurrentSongIndex, isPlaying, setIsPlaying }) {
  const [playlists, setPlaylists] = useState([]);
  const [name, setName] = useState('');
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [allSongs, setAllSongs] = useState([]);
  const [showAddSongs, setShowAddSongs] = useState(false);

  useEffect(() => {
    if (user) {
      axios.get('/api/playlists').then(res => setPlaylists(res.data.playlists || []));
      // Fetch all songs for adding to playlists
      axios.get('/api/songs').then(res => setAllSongs(Array.isArray(res.data.songs) ? res.data.songs : [])).catch(() => setAllSongs([]));
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

  const openPlaylist = (playlist) => {
    setSelectedPlaylist(playlist);
    setShowAddSongs(true);
  };

  const addSongToPlaylist = async (songId) => {
    try {
      await axios.post(`/api/playlists/${selectedPlaylist.id}/add/${songId}`);
      // Refresh playlists to show updated song count
      const res = await axios.get('/api/playlists');
      setPlaylists(res.data.playlists);
      // Update selected playlist with new songs
      const updated = res.data.playlists.find(p => p.id === selectedPlaylist.id);
      setSelectedPlaylist(updated);
    } catch (e) {}
  };

  const removeSongFromPlaylist = async (songId) => {
    try {
      await axios.post(`/api/playlists/${selectedPlaylist.id}/remove/${songId}`);
      const res = await axios.get('/api/playlists');
      setPlaylists(res.data.playlists);
      const updated = res.data.playlists.find(p => p.id === selectedPlaylist.id);
      setSelectedPlaylist(updated);
    } catch (e) {}
  };

  const isSongInPlaylist = (songId) => {
    return selectedPlaylist?.songs?.some(song => song.id === songId);
  };

  const playSong = (song, songsList = selectedPlaylist?.songs || []) => {
    if (!song || !songsList.length) return;
    
    const idx = songsList.findIndex(s => s.id === song.id);
    if (idx !== -1) {
      setQueue(songsList);
      setCurrentSongIndex(idx);
      setIsPlaying(true);
    }
  };

  const playAllSongs = () => {
    if (selectedPlaylist?.songs?.length > 0) {
      setQueue(selectedPlaylist.songs);
      setCurrentSongIndex(0);
      setIsPlaying(true);
    }
  };

  const shufflePlay = () => {
    if (selectedPlaylist?.songs?.length > 0) {
      const shuffled = [...selectedPlaylist.songs].sort(() => Math.random() - 0.5);
      setQueue(shuffled);
      setCurrentSongIndex(0);
      setIsPlaying(true);
    }
  };

  if (!user) return <div className="content-section-new"><h1>Please login</h1></div>;

  return (
    <div className="content-section-new">
      <div className="container-fluid">
        {!showAddSongs ? (
          <>
            {/* Header */}
            <div style={{
              padding: '40px 0',
              borderBottom: '1px solid var(--border-color)'
            }}>
              <h1 style={{
                color: 'var(--text-primary)',
                fontSize: '3rem',
                fontWeight: 'bold',
                margin: '0 0 8px 0'
              }}>
                <i className="fas fa-list-music" style={{marginRight: '15px', color: 'var(--accent-1)'}}></i>
                Your Playlists
              </h1>
              <p style={{color: 'var(--text-secondary)', fontSize: '1rem', margin: 0}}>
                Create and manage your personal music collections
              </p>
            </div>

            {/* Create Playlist Section */}
            <div style={{
              padding: '40px 0',
              borderBottom: '1px solid var(--border-color)'
            }}>
              <div style={{
                background: 'linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-primary) 100%)',
                borderRadius: '12px',
                padding: '24px',
                border: '1px solid var(--border-color)'
              }}>
                <h3 style={{color: 'var(--text-primary)', marginBottom: '20px', fontSize: '1.5rem'}}>
                  Create New Playlist
                </h3>
                <form onSubmit={createPlaylist} style={{display:'flex',gap:'15px', alignItems: 'center'}}>
                  <input 
                    type="text" 
                    value={name} 
                    onChange={e=>setName(e.target.value)} 
                    placeholder="Give your playlist a name..." 
                    className="form-input"
                    style={{
                      flex: 1,
                      maxWidth: '400px',
                      padding: '14px 20px',
                      borderRadius: '8px',
                      border: '2px solid var(--border-color)',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      fontSize: '1rem',
                      outline: 'none',
                      transition: 'border-color 0.2s'
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'var(--accent-1)'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                  />
                  <button 
                    type="submit" 
                    className="search-btn-new"
                    style={{
                      padding: '14px 32px',
                      borderRadius: '8px',
                      background: 'var(--accent-1)',
                      border: 'none',
                      color: '#ffffff',
                      fontWeight: 'bold',
                      fontSize: '1rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      boxShadow: '0 4px 12px rgba(29, 185, 84, 0.3)'
                    }}
                    onMouseOver={(e) => e.target.style.background = 'var(--accent-2)'}
                    onMouseOut={(e) => e.target.style.background = 'var(--accent-1)'}
                  >
                    <i className="fas fa-plus" style={{marginRight: '8px'}}></i>
                    Create
                  </button>
                </form>
              </div>
            </div>

            {/* Playlists Grid */}
            <div style={{padding: '40px 0'}}>
              <h2 style={{color: 'var(--text-primary)', marginBottom: '30px', fontSize: '2rem'}}>
                {playlists.length} {playlists.length === 1 ? 'Playlist' : 'Playlists'}
              </h2>
              
              <div className="albums-grid-new" style={{marginTop:'30px'}}>
                {playlists.map(p => (
                  <div 
                    key={p.id} 
                    className="album-card-new"
                    style={{
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      position: 'relative'
                    }}
                    onClick={() => openPlaylist(p)}
                    onMouseOver={(e) => {
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                    }}
                  >
                    {/* Playlist Cover */}
                    <div className="album-cover-new" style={{position: 'relative'}}>
                      <div style={{
                        width: '100%',
                        height: '200px',
                        background: 'linear-gradient(135deg, var(--accent-1) 0%, var(--accent-2) 100%)',
                        borderRadius: '8px',
                        marginBottom: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                        overflow: 'hidden'
                      }}>
                        {p.songs?.length > 0 ? (
                          <img 
                            src={getImageUrl(p.songs[0].thumbnail)} 
                            alt={p.name}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              borderRadius: '8px'
                            }}
                          />
                        ) : (
                          <i className="fas fa-music" style={{fontSize: '3rem', color: '#ffffff', opacity: 0.8}}></i>
                        )}
                        
                        {/* Hover Overlay */}
                        <div className="album-overlay" style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          background: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.8) 100%)',
                          display: 'flex',
                          alignItems: 'flex-end',
                          justifyContent: 'space-between',
                          padding: '20px',
                          opacity: 0,
                          transition: 'opacity 0.3s ease'
                        }}>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              deletePlaylist(p.id);
                            }}
                            style={{
                              background: 'rgba(239, 68, 68, 0.9)',
                              color: 'white',
                              border: 'none',
                              padding: '10px',
                              borderRadius: '50%',
                              cursor: 'pointer',
                              width: '40px',
                              height: '40px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            <i className="fas fa-trash"></i>
                          </button>
                          <div style={{color: 'white', fontSize: '14px'}}>
                            <i className="fas fa-music"></i> {p.songs?.length || 0} songs
                          </div>
                        </div>
                      </div>
                      
                      <div className="album-tracks-badge" style={{
                        position: 'absolute',
                        top: '10px',
                        right: '10px',
                        background: 'var(--accent-1)',
                        color: 'white',
                        padding: '6px 12px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: 'bold'
                      }}>
                        <i className="fas fa-music"></i> {p.songs?.length || 0}
                      </div>
                    </div>

                    {/* Playlist Info */}
                    <div className="album-info-new">
                      <h3 
                        className="album-title-new"
                        style={{
                          color: 'var(--text-primary)',
                          fontSize: '1rem',
                          fontWeight: 'bold',
                          marginBottom: '8px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {p.name}
                      </h3>
                      <p style={{
                        color: 'var(--text-secondary)',
                        fontSize: '0.875rem',
                        margin: 0
                      }}>
                        {p.songs?.length || 0} {p.songs?.length === 1 ? 'song' : 'songs'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {playlists.length === 0 && (
                <div style={{
                  textAlign: 'center',
                  padding: '80px 20px',
                  background: 'var(--bg-secondary)',
                  borderRadius: '12px',
                  border: '1px solid var(--border-color)'
                }}>
                  <i className="fas fa-list-music" style={{
                    fontSize: '4rem', 
                    color: 'var(--text-secondary)', 
                    marginBottom: '20px'
                  }}></i>
                  <h3 style={{
                    color: 'var(--text-primary)',
                    fontSize: '1.5rem',
                    marginBottom: '10px'
                  }}>
                    No playlists yet
                  </h3>
                  <p style={{color: 'var(--text-secondary)', fontSize: '1rem'}}>
                    Create your first playlist to start organizing your music
                  </p>
                </div>
              )}
            </div>
          </>
        ) : (
          /* Modal with website colors */
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div style={{
              background: 'var(--bg-primary)',
              borderRadius: '16px',
              width: '90%',
              maxWidth: '900px',
              maxHeight: '85vh',
              overflow: 'hidden',
              border: '1px solid var(--border-color)',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
            }}>
              {/* Modal Header */}
              <div style={{
                padding: '24px 32px',
                borderBottom: '1px solid var(--border-color)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-primary) 100%)'
              }}>
                <div style={{flex: 1}}>
                  <h3 style={{
                    color: 'var(--text-primary)',
                    fontSize: '1.5rem',
                    fontWeight: 'bold',
                    margin: '0 0 4px 0'
                  }}>
                    <i className="fas fa-list-music" style={{
                      marginRight: '12px',
                      color: 'var(--accent-1)'
                    }}></i>
                    {selectedPlaylist?.name}
                  </h3>
                  <p style={{
                    color: 'var(--text-secondary)',
                    fontSize: '0.875rem',
                    margin: '0 0 16px 0'
                  }}>
                    {selectedPlaylist?.songs?.length || 0} {selectedPlaylist?.songs?.length === 1 ? 'song' : 'songs'} in this playlist
                  </p>
                  
                  {/* Playback Controls */}
                  {selectedPlaylist?.songs?.length > 0 && (
                    <div style={{display: 'flex', gap: '12px', alignItems: 'center'}}>
                      <button
                        onClick={playAllSongs}
                        className="search-btn-new"
                        style={{
                          padding: '8px 16px',
                          borderRadius: '20px',
                          border: 'none',
                          cursor: 'pointer',
                          fontWeight: 'bold',
                          fontSize: '0.875rem',
                          background: 'var(--accent-1)',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                        onMouseOver={(e) => e.target.style.background = 'var(--accent-2)'}
                        onMouseOut={(e) => e.target.style.background = 'var(--accent-1)'}
                      >
                        <i className="fas fa-play"></i>
                        Play
                      </button>
                      <button
                        onClick={shufflePlay}
                        className="search-btn-new"
                        style={{
                          padding: '8px 16px',
                          borderRadius: '20px',
                          border: 'none',
                          cursor: 'pointer',
                          fontWeight: 'bold',
                          fontSize: '0.875rem',
                          background: 'var(--accent-1)',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                        onMouseOver={(e) => e.target.style.background = 'var(--accent-2)'}
                        onMouseOut={(e) => e.target.style.background = 'var(--accent-1)'}
                      >
                        <i className="fas fa-random"></i>
                        Shuffle
                      </button>
                    </div>
                  )}
                </div>
                <button 
                  onClick={() => setShowAddSongs(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    fontSize: '1.5rem',
                    cursor: 'pointer',
                    padding: '8px',
                    borderRadius: '8px',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => {
                    e.target.style.background = 'var(--bg-secondary)';
                    e.target.style.color = 'var(--text-primary)';
                  }}
                  onMouseOut={(e) => {
                    e.target.style.background = 'none';
                    e.target.style.color = 'var(--text-secondary)';
                  }}
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
              
              {/* Modal Content */}
              <div style={{padding: '32px', maxHeight: '60vh', overflowY: 'auto'}}>
                <h4 style={{
                  color: 'var(--text-primary)',
                  marginBottom: '24px',
                  fontSize: '1.25rem',
                  fontWeight: 'bold'
                }}>
                  <i className="fas fa-music" style={{marginRight: '10px', color: 'var(--accent-1)'}}></i>
                  Available Songs
                </h4>
                
                <div style={{display: 'grid', gap: '12px'}}>
                  {/* Show songs already in playlist */}
                  {selectedPlaylist?.songs?.length > 0 && (
                    <>
                      <h5 style={{
                        color: 'var(--text-primary)',
                        marginBottom: '16px',
                        fontSize: '1.1rem',
                        fontWeight: 'bold'
                      }}>
                        <i className="fas fa-music" style={{marginRight: '8px', color: 'var(--accent-1)'}}></i>
                        Songs in Playlist
                      </h5>
                      {selectedPlaylist.songs.map(song => (
                        <div 
                          key={song.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '16px',
                            background: 'var(--bg-secondary)',
                            borderRadius: '12px',
                            border: '1px solid var(--border-color)',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseOver={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                          onMouseOut={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
                        >
                          <img 
                            src={getImageUrl(song.thumbnail)} 
                            alt={song.title}
                            style={{
                              width: '56px',
                              height: '56px',
                              borderRadius: '8px',
                              marginRight: '16px',
                              objectFit: 'cover'
                            }}
                          />
                          <div style={{flex: 1}}>
                            <h5 style={{
                              color: 'var(--text-primary)',
                              margin: '0 0 4px 0',
                              fontSize: '1rem',
                              fontWeight: '500'
                            }}>
                              {song.title}
                            </h5>
                            <p style={{
                              color: 'var(--text-secondary)',
                              margin: 0,
                              fontSize: '0.875rem'
                            }}>
                              {song.artist}
                            </p>
                          </div>
                          <div style={{display: 'flex', gap: '8px'}}>
                            <button
                              onClick={() => playSong(song)}
                              className="search-btn-new"
                              style={{
                                padding: '8px 16px',
                                borderRadius: '20px',
                                border: 'none',
                                cursor: 'pointer',
                                fontWeight: 'bold',
                                fontSize: '0.875rem',
                                background: 'var(--accent-1)',
                                color: '#ffffff',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                              }}
                              onMouseOver={(e) => e.target.style.background = 'var(--accent-2)'}
                              onMouseOut={(e) => e.target.style.background = 'var(--accent-1)'}
                            >
                              <i className="fas fa-play"></i>
                              Play
                            </button>
                            <button
                              onClick={() => removeSongFromPlaylist(song.id)}
                              style={{
                                padding: '8px 12px',
                                borderRadius: '20px',
                                border: 'none',
                                cursor: 'pointer',
                                fontWeight: 'bold',
                                fontSize: '0.875rem',
                                background: 'rgba(239, 68, 68, 0.9)',
                                color: '#ffffff'
                              }}
                              onMouseOver={(e) => e.target.style.background = 'rgba(220, 38, 38, 0.9)'}
                              onMouseOut={(e) => e.target.style.background = 'rgba(239, 68, 68, 0.9)'}
                            >
                              <i className="fas fa-minus"></i>
                            </button>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                  
                  {/* Available songs to add */}
                  <h5 style={{
                    color: 'var(--text-primary)',
                    marginBottom: '16px',
                    fontSize: '1.1rem',
                    fontWeight: 'bold',
                    marginTop: selectedPlaylist?.songs?.length > 0 ? '24px' : '0'
                  }}>
                    <i className="fas fa-plus-circle" style={{marginRight: '8px', color: 'var(--accent-1)'}}></i>
                    Available Songs to Add
                  </h5>
                  {Array.isArray(allSongs) && allSongs.filter(song => !isSongInPlaylist(song.id)).map(song => (
                    <div 
                      key={song.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '16px',
                        background: 'var(--bg-secondary)',
                        borderRadius: '12px',
                        border: '1px solid var(--border-color)',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                      onMouseOut={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
                    >
                      <img 
                        src={getImageUrl(song.thumbnail)} 
                        alt={song.title}
                        style={{
                          width: '56px',
                          height: '56px',
                          borderRadius: '8px',
                          marginRight: '16px',
                          objectFit: 'cover'
                        }}
                      />
                      <div style={{flex: 1}}>
                        <h5 style={{
                          color: 'var(--text-primary)',
                          margin: '0 0 4px 0',
                          fontSize: '1rem',
                          fontWeight: '500'
                        }}>
                          {song.title}
                        </h5>
                        <p style={{
                          color: 'var(--text-secondary)',
                          margin: 0,
                          fontSize: '0.875rem'
                        }}>
                          {song.artist}
                        </p>
                      </div>
                      <button
                        onClick={() => addSongToPlaylist(song.id)}
                        className="search-btn-new"
                        style={{
                          padding: '10px 20px',
                          borderRadius: '20px',
                          border: 'none',
                          cursor: 'pointer',
                          fontWeight: 'bold',
                          fontSize: '0.875rem',
                          transition: 'all 0.2s',
                          background: 'var(--accent-1)',
                          color: '#ffffff'
                        }}
                        onMouseOver={(e) => e.target.style.background = 'var(--accent-2)'}
                        onMouseOut={(e) => e.target.style.background = 'var(--accent-1)'}
                      >
                        <i className="fas fa-plus" style={{marginRight: '6px'}}></i>
                        Add
                      </button>
                    </div>
                  ))}
                </div>
                
                {(!Array.isArray(allSongs) || allSongs.length === 0) && (
                  <div style={{
                    textAlign: 'center',
                    padding: '60px 20px',
                    background: 'var(--bg-secondary)',
                    borderRadius: '12px',
                    border: '1px solid var(--border-color)'
                  }}>
                    <i className="fas fa-music" style={{
                      fontSize: '3rem',
                      color: 'var(--text-secondary)',
                      marginBottom: '16px'
                    }}></i>
                    <p style={{color: 'var(--text-secondary)', fontSize: '1rem'}}>
                      No songs available to add
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
