import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const getImageUrl = (image) => {
  if (!image) return '/images/default-cover.png';
  if (image.startsWith('http')) return image;
  return `http://localhost:5000${image}`;
};

export default function Album({ user, queue, setQueue, currentSongIndex, setCurrentSongIndex, isPlaying, setIsPlaying }) {
  const { albumId } = useParams();
  const navigate = useNavigate();
  const [album, setAlbum] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAlbum = async () => {
      try {
        console.log('Fetching album:', albumId);
        const res = await axios.get(`/api/albums/${albumId}`);
        console.log('Album response:', res.data);
        setAlbum(res.data);
      } catch (error) {
        console.error('Error fetching album:', error);
        console.error('Error response:', error.response);
        
        // Don't redirect immediately, show error state
        if (error.response?.status === 404) {
          console.log('Album not found, showing error state');
        } else {
          console.log('Server error, showing error state');
        }
      } finally {
        setLoading(false);
      }
    };

    if (albumId) {
      fetchAlbum();
    }
  }, [albumId]);

  const playSong = (song) => {
    if (!song || !album?.songs?.length) return;
    
    const idx = album.songs.findIndex(s => s.id === song.id);
    if (idx !== -1) {
      setQueue(album.songs);
      setCurrentSongIndex(idx);
      setIsPlaying(true);
    }
  };

  const playAllSongs = () => {
    if (album?.songs?.length > 0) {
      setQueue(album.songs);
      setCurrentSongIndex(0);
      setIsPlaying(true);
    }
  };

  const shufflePlay = () => {
    if (album?.songs?.length > 0) {
      const shuffled = [...album.songs].sort(() => Math.random() - 0.5);
      setQueue(shuffled);
      setCurrentSongIndex(0);
      setIsPlaying(true);
    }
  };

  if (loading) {
    return (
      <div className="content-section-new">
        <div className="container-fluid">
          <div style={{textAlign: 'center', padding: '60px 20px'}}>
            <i className="fas fa-spinner fa-spin" style={{fontSize: '3rem', color: 'var(--text-secondary)', marginBottom: '20px'}}></i>
            <p style={{color: 'var(--text-secondary)', fontSize: '1.2rem'}}>Loading album...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!album) {
    return (
      <div className="content-section-new">
        <div className="container-fluid">
          <div style={{textAlign: 'center', padding: '60px 20px'}}>
            <i className="fas fa-compact-disc" style={{fontSize: '4rem', color: 'var(--text-secondary)', marginBottom: '20px'}}></i>
            <h3 style={{color: 'var(--text-primary)', marginBottom: '10px'}}>Album not found</h3>
            <p style={{color: 'var(--text-secondary)', marginBottom: '20px'}}>This album doesn't exist or has been removed.</p>
            <button 
              onClick={() => navigate('/')}
              className="search-btn-new"
              style={{padding: '12px 24px', borderRadius: '8px'}}
            >
              Go Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="content-section-new">
      <div className="container-fluid">
        {/* Album Header */}
        <div style={{
          padding: '40px 0',
          borderBottom: '1px solid var(--border-color)',
          marginBottom: '40px'
        }}>
          <div style={{display: 'flex', gap: '40px', alignItems: 'center'}}>
            {/* Album Cover */}
            <div style={{
              width: '280px',
              height: '280px',
              borderRadius: '12px',
              overflow: 'hidden',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              flexShrink: 0
            }}>
              <img 
                src={getImageUrl(album.cover)} 
                alt={album.name}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
              />
            </div>

            {/* Album Info */}
            <div style={{flex: 1}}>
              <h1 style={{
                color: 'var(--text-primary)',
                fontSize: '3rem',
                fontWeight: 'bold',
                margin: '0 0 12px 0'
              }}>
                {album.name}
              </h1>
              <p style={{
                color: 'var(--text-secondary)',
                fontSize: '1.5rem',
                margin: '0 0 24px 0'
              }}>
                {album.artist}
              </p>
              
              <div style={{
                color: 'var(--text-secondary)',
                fontSize: '1rem',
                margin: '0 0 32px 0'
              }}>
                {album.songs?.length || 0} {album.songs?.length === 1 ? 'song' : 'songs'}
              </div>

              {/* Playback Controls */}
              {album.songs?.length > 0 && (
                <div style={{display: 'flex', gap: '16px', alignItems: 'center'}}>
                  <button
                    onClick={playAllSongs}
                    className="search-btn-new"
                    style={{
                      padding: '12px 32px',
                      borderRadius: '24px',
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      fontSize: '1rem',
                      background: 'var(--accent-1)',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 12px rgba(29, 185, 84, 0.3)'
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
                      padding: '12px 32px',
                      borderRadius: '24px',
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      fontSize: '1rem',
                      background: 'var(--accent-1)',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 12px rgba(29, 185, 84, 0.3)'
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
          </div>
        </div>

        {/* Songs List */}
        <div>
          <h2 style={{
            color: 'var(--text-primary)',
            marginBottom: '24px',
            fontSize: '2rem',
            fontWeight: 'bold'
          }}>
            Songs
          </h2>
          
          {album.songs?.length > 0 ? (
            <div style={{display: 'grid', gap: '12px'}}>
              {album.songs.map((song, index) => (
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
                  {/* Song Number */}
                  <div style={{
                    width: '40px',
                    textAlign: 'center',
                    color: 'var(--text-secondary)',
                    fontSize: '1rem',
                    fontWeight: 'bold'
                  }}>
                    {index + 1}
                  </div>

                  {/* Song Thumbnail */}
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

                  {/* Song Info */}
                  <div style={{flex: 1}}>
                    <h5 style={{
                      color: 'var(--text-primary)',
                      margin: '0 0 4px 0',
                      fontSize: '1.1rem',
                      fontWeight: '500'
                    }}>
                      {song.title}
                    </h5>
                    <p style={{
                      color: 'var(--text-secondary)',
                      margin: 0,
                      fontSize: '0.95rem'
                    }}>
                      {song.artist} • {song.language}
                    </p>
                  </div>

                  {/* Play Button */}
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
                </div>
              ))}
            </div>
          ) : (
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
                No songs in this album yet.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
