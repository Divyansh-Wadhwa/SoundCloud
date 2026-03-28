import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';

export default function Home({ user, setQueue, setCurrentSongIndex, setIsPlaying }) {
  const [searchParams] = useSearchParams();
  const selectedLang = searchParams.get('lang') || '';
  
  const [songs, setSongs] = useState([]);
  const [bestHindi, setBestHindi] = useState([]);
  const [bestPunjabi, setBestPunjabi] = useState([]);
  const [bestEnglish, setBestEnglish] = useState([]);
  const [albums, setAlbums] = useState([]);

  useEffect(() => {
    // Typing text effect logic could be placed here if desired
    const fetchData = async () => {
      try {
        const [songsRes, homeRes] = await Promise.all([
          axios.get(`/api/songs${selectedLang ? `?lang=${selectedLang}` : ''}`),
          axios.get('/api/home')
        ]);
        setSongs(songsRes.data.songs);
        setBestHindi(homeRes.data.bestHindi);
        setBestPunjabi(homeRes.data.bestPunjabi);
        setBestEnglish(homeRes.data.bestEnglish);
        setAlbums(homeRes.data.albums);
      } catch (err) {
        console.error(err);
      }
    };
    fetchData();
  }, [selectedLang]);

  const playSong = (songId) => {
    const idx = songs.findIndex(s => s.id === songId);
    if (idx !== -1) {
      setQueue(songs);
      setCurrentSongIndex(idx);
      setIsPlaying(true);
      if (user) {
        axios.post(`/api/history/add/${songId}`);
      }
    }
  };

  const toggleFavorite = async (songId) => {
    // simplified favorite toggle
    try {
      await axios.post(`/api/favorites/add/${songId}`);
      // real logic would optimistically update state or refetch
    } catch(e) {}
  };

  return (
    <>
      <section className="hero-banner-epic">
        <div className="hero-animated-bg">
          <div className="gradient-orb orb-1"></div>
          <div className="gradient-orb orb-2"></div>
          <div className="gradient-orb orb-3"></div>
        </div>
        <div className="hero-content-wrapper">
          <div className="music-visualizer">
            {[0, 0.1, 0.2, 0.3, 0.4, 0.2, 0.1, 0.3, 0].map((delay, i) => (
              <div key={i} className="visualizer-bar" style={{ animationDelay: `${delay}s` }}></div>
            ))}
          </div>
          <h1 className="typing-text">
            <span>Welcome to SoundCloud</span>
            <span className="typing-cursor">|</span>
          </h1>
          <div className="hero-search-bar">
            {/* Search left simple for now */}
          </div>
        </div>
      </section>

      <section className="quick-categories">
        <div className="container-fluid">
          <div className="categories-grid">
            {['Pop', 'Rock', 'Hip-Hop', 'Electronic', 'Jazz', 'Classical'].map(cat => (
              <Link to={`/search?q=${cat.toLowerCase()}`} className="category-card" key={cat}>
                <i className={`fas fa-music`}></i>
                <span>{cat}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="content-section-new latest-tracks-section">
        <div className="container-fluid">
          <div className="section-header-new">
            <div className="section-title-wrapper">
              <h2 className="section-title-new">
                <i className="fas fa-bolt"></i> Latest Tracks
              </h2>
              <p className="section-subtitle">Fresh releases from artists around the globe</p>
            </div>
            <div className="lang-cards">
              {['', 'Hindi', 'Punjabi', 'English', 'Other'].map(lang => (
                <Link key={lang} to={lang ? `/?lang=${lang}` : '/'} className={`lang-card ${selectedLang === lang ? 'active' : ''}`}>
                  {lang || 'All'}
                </Link>
              ))}
            </div>
          </div>
          
          <div className="tracks-grid-new">
            {songs.slice(0, 12).map((song, idx) => (
              <div key={song.id} className="track-card-new" onClick={() => playSong(song.id)}>
                <div className="track-cover-new">
                  <img src={song.thumbnail ? `http://localhost:5000${song.thumbnail}` : '/images/default-cover.png'} alt={song.title} loading="lazy" />
                  <div className="track-overlay">
                    <button className="play-btn-new">
                      <i className="fas fa-play"></i>
                    </button>
                  </div>
                </div>
                <div className="track-info-new">
                  <h3 className="track-title-new">{song.title}</h3>
                  <p className="track-artist-new">{song.artist}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="content-section-new albums-section">
        <div className="container-fluid">
          <div className="section-header-new">
            <div className="section-title-wrapper">
              <h2 className="section-title-new">
                <i className="fas fa-compact-disc"></i> Featured Albums
              </h2>
            </div>
          </div>
          <div className="albums-grid-new">
            {albums.map((al) => {
              const albumCover = al.songs?.length > 0 ? `http://localhost:5000${al.songs[0].thumbnail}` : '/images/default-cover.png';
              return (
                <Link key={al.id} to={`/album/${al.id}`} className="album-card-new">
                  <div className="album-cover-new">
                    <img src={albumCover} alt={al.name} loading="lazy" />
                    <div className="album-overlay">
                      <button className="album-play-btn"><i className="fas fa-play"></i></button>
                    </div>
                  </div>
                  <div className="album-info-new">
                    <h3 className="album-title-new">{al.name}</h3>
                    <p className="album-artist-new">{al.artist}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}
