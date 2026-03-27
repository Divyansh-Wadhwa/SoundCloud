import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';

export default function Search({ setQueue, setCurrentSongIndex, setIsPlaying, user }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [songs, setSongs] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query) return;
    setLoading(true);
    axios.get(`/api/search?q=${encodeURIComponent(query)}`)
      .then(res => {
        setSongs(res.data.songs);
        setAlbums(res.data.albums);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [query]);

  const handleSearch = (e) => {
    e.preventDefault();
    const val = e.target.elements.q.value;
    if (val.trim()) setSearchParams({ q: val.trim() });
  };

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

  return (
    <div className="content-section-new" style={{paddingTop: '120px'}}>
      <div className="container-fluid">
        <div className="hero-search-bar" style={{marginBottom: '40px'}}>
          <form onSubmit={handleSearch} className="hero-search-form-new" style={{margin:0}}>
            <div className="search-input-wrapper">
              <i className="fas fa-search search-icon-new"></i>
              <input 
                type="text" 
                name="q" 
                defaultValue={query}
                placeholder="Search songs, artists, albums, playlists..." 
                className="search-input-new"
                autoComplete="off"
              />
            </div>
            <button type="submit" className="search-btn-new">
              <span>Search</span>
              <i className="fas fa-arrow-right"></i>
            </button>
          </form>
        </div>

        {loading ? (
          <h2>Loading...</h2>
        ) : query ? (
          <>
            <h2 className="section-title-new" style={{marginBottom:'20px'}}>Search Results for "{query}"</h2>
            
            <h3 style={{marginBottom:'15px', color:'var(--text-muted)'}}>Songs ({songs.length})</h3>
            <div className="tracks-grid-new" style={{marginBottom:'40px'}}>
              {songs.map(song => (
                <div key={song.id} className="track-card-new" onClick={() => playSong(song.id)}>
                  <div className="track-cover-new">
                    <img src={song.thumbnail || '/images/default-cover.png'} alt={song.title} loading="lazy" />
                    <div className="track-overlay">
                      <button className="play-btn-new"><i className="fas fa-play"></i></button>
                    </div>
                  </div>
                  <div className="track-info-new">
                    <h3 className="track-title-new">{song.title}</h3>
                    <p className="track-artist-new">{song.artist}</p>
                  </div>
                </div>
              ))}
              {songs.length === 0 && <p className="empty-text-new">No songs found.</p>}
            </div>

            <h3 style={{marginBottom:'15px', color:'var(--text-muted)'}}>Albums ({albums.length})</h3>
            <div className="albums-grid-new">
              {albums.map((al) => {
                const albumCover = al.songs?.length > 0 ? al.songs[0].thumbnail : '/images/default-cover.png';
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
              {albums.length === 0 && <p className="empty-text-new">No albums found.</p>}
            </div>
          </>
        ) : (
          <h2>Please enter a search query above.</h2>
        )}
      </div>
    </div>
  );
}
