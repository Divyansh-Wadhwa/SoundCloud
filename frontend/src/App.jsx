import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Player from './components/Player';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Playlists from './pages/Playlists';
import Favorites from './pages/Favorites';
import AdminPanel from './pages/AdminPanel';
import Search from './pages/Search';
import Modal from './components/Modal';

// Styles are imported via index.html linking to public/css/style.css 
import './index.css';

function App() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Global player state
  const [queue, setQueue] = useState([]);
  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    fetch('/api/me')
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          setUser(data.user);
          setIsAdmin(data.isAdmin);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return null; // or a spinner

  return (
    <Router>
      <div className={`app ${user && !isAdmin ? 'with-player' : ''}`}>
        <Navbar user={user} isAdmin={isAdmin} setUser={setUser} />
        
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home user={user} setQueue={setQueue} setCurrentSongIndex={setCurrentSongIndex} setIsPlaying={setIsPlaying} />} />
            <Route path="/login" element={<Login setUser={setUser} setIsAdmin={setIsAdmin} />} />
            <Route path="/register" element={<Register />} />
            <Route path="/dashboard" element={<Dashboard user={user} setUser={setUser} />} />
            <Route path="/playlists" element={<Playlists user={user} />} />
            <Route path="/favorites" element={<Favorites user={user} />} />
            <Route path="/admin" element={<AdminPanel user={user} />} />
            <Route path="/search" element={<Search user={user} setQueue={setQueue} setCurrentSongIndex={setCurrentSongIndex} setIsPlaying={setIsPlaying} />} />
          </Routes>
        </main>

        {user && !isAdmin && (
          <Player 
            queue={queue} 
            index={currentSongIndex} 
            setIndex={setCurrentSongIndex}
            isPlaying={isPlaying}
            setIsPlaying={setIsPlaying}
          />
        )}
        
        <Modal />
      </div>
    </Router>
  );
}

export default App;
