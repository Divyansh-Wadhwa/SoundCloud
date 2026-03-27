import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function Favorites({ user }) {
  const [favorites, setFavorites] = useState([]);

  useEffect(() => {
    if (user) {
      axios.get('/api/favorites').then(res => setFavorites(res.data.favorites));
    }
  }, [user]);

  const removeFav = async (id) => {
    await axios.post(`/api/favorites/remove/${id}`);
    setFavorites(favorites.filter(f => f.id !== id));
  };

  if (!user) return <div className="content-section-new"><h1>Please login</h1></div>;

  return (
    <div className="content-section-new">
      <div className="container-fluid">
        <h2>Your Favorites</h2>
        <div className="tracks-grid-new" style={{marginTop:'30px'}}>
          {favorites.map(f => (
            <div key={f.id} className="track-card-new">
              <div className="track-cover-new">
                <img src={f.thumbnail || '/images/default-cover.png'} alt={f.title} />
                <div className="track-overlay">
                   <button onClick={() => removeFav(f.id)} className="fav-btn-new active"><i className="fas fa-heart"></i></button>
                </div>
              </div>
              <div className="track-info-new">
                <h3 className="track-title-new">{f.title}</h3>
                <p className="track-artist-new">{f.artist}</p>
              </div>
            </div>
          ))}
          {favorites.length === 0 && <p className="empty-text-new">No favorite songs yet.</p>}
        </div>
      </div>
    </div>
  );
}
