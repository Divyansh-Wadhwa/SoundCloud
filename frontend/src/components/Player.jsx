import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

export default function Player({ queue, index, setIndex, isPlaying, setIsPlaying }) {
  const audioRef = useRef(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [collapsed, setCollapsed] = useState(false);
  const [volume, setVolume] = useState(1);
  const [previousVolume, setPreviousVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isFavAnimating, setIsFavAnimating] = useState(false);
  
  const currentSong = queue[index] || null;

  useEffect(() => {
    if (currentSong) {
      axios.get(`/api/favorites/check/${currentSong.id}`)
        .then(res => setIsFavorite(res.data.isFavorite))
        .catch(() => setIsFavorite(false));
    }
  }, [currentSong]);

  const toggleFavorite = async () => {
    if (!currentSong) return;
    const newFavState = !isFavorite;
    // Optimistic fast UI update
    setIsFavorite(newFavState);
    setIsFavAnimating(true);
    setTimeout(() => setIsFavAnimating(false), 200);

    try {
      if (newFavState) {
        await axios.post(`/api/favorites/add/${currentSong.id}`);
      } else {
        await axios.post(`/api/favorites/remove/${currentSong.id}`);
      }
    } catch (e) {
      // Revert if API fails
      setIsFavorite(!newFavState);
    }
  };

  useEffect(() => {
    if (audioRef.current && currentSong) {
      if (isPlaying) {
        audioRef.current.play().catch(e => console.error('Play error:', e));
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, currentSong, index]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const togglePlay = () => {
    if(!currentSong) return;
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    setCurrentTime(audioRef.current.currentTime);
    setDuration(audioRef.current.duration || 0);
  };

  const handleEnded = () => {
    if (index < queue.length - 1) {
      setIndex(index + 1);
    } else {
      setIsPlaying(false);
    }
  };

  const handleSeek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newPct = Math.max(0, Math.min(clickX / rect.width, 1));
    const time = newPct * duration;
    if (audioRef.current) audioRef.current.currentTime = time;
    setCurrentTime(time);
  };

  const handleSeekDrag = (e) => {
    if (e.buttons === 1) handleSeek(e);
  };

  const handleVolumeChange = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newVolume = Math.max(0, Math.min(clickX / rect.width, 1));
    setVolume(newVolume);
    if (newVolume > 0 && isMuted) {
      setIsMuted(false);
    }
  };

  const handleVolumeDrag = (e) => {
    if (e.buttons === 1) handleVolumeChange(e);
  };

  const toggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      setVolume(previousVolume);
    } else {
      setIsMuted(true);
      setPreviousVolume(volume);
      setVolume(0);
    }
  };

  const fmt = (s) => {
    if (!isFinite(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  };

  if (!currentSong) return null;

  const pct = duration ? (currentTime / duration) * 100 : 0;

  return (
    <>
      <style>{`
        .custom-range-track {
          position: relative;
          height: 8px;
          background: rgba(255, 255, 255, 0.15);
          border-radius: 999px;
          cursor: pointer;
          touch-action: none; /* Prevent scroll on drag */
          transition: height 0.2s ease, background 0.3s ease;
        }
        .custom-range-track:hover {
          height: 10px;
          background: rgba(255, 255, 255, 0.25);
        }
        .custom-range-fill {
          position: absolute;
          top: 0;
          left: 0;
          height: 100%;
          border-radius: 999px;
          pointer-events: none;
        }
        .custom-range-thumb {
          position: absolute;
          top: 50%;
          width: 16px;
          height: 16px;
          background: #fff;
          border-radius: 50%;
          transform: translate(-50%, -50%);
          pointer-events: none;
          transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        .custom-range-track:hover .custom-range-thumb {
          transform: translate(-50%, -50%) scale(1.4);
        }
        @keyframes fastHeartPop {
          0% { transform: scale(1); }
          50% { transform: scale(1.4); }
          100% { transform: scale(1); }
        }
        .animating-heart {
          animation: fastHeartPop 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275) !important;
        }
      `}</style>
      <audio 
        ref={audioRef}
        src={`http://localhost:5000${currentSong.file}`}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onLoadedMetadata={handleTimeUpdate}
      />

      {!collapsed ? (
        <div className="bottom-player" id="globalBottomPlayer">
          <div className="bp-left">
            <img id="bp-cover" src={currentSong.thumbnail ? `http://localhost:5000${currentSong.thumbnail}` : '/images/default-cover.png'} alt="cover" />
            <div className="bp-meta">
              <div id="bp-title">{currentSong.title}</div>
              <div id="bp-artist">{currentSong.artist}</div>
            </div>
          </div>
          <div className="bp-center">
            <div className="bp-controls">
              <button className="bp-btn" onClick={() => index > 0 && setIndex(index - 1)}>⏮</button>
              <button className="bp-btn bp-play" onClick={togglePlay}>{isPlaying ? '⏸' : '▶'}</button>
              <button className="bp-btn" onClick={() => index < queue.length - 1 && setIndex(index + 1)}>⏭</button>
            </div>
            <div className="bp-progress-wrap">
              <span id="bp-curtime">{fmt(currentTime)}</span>
              <div 
                className="custom-range-track"
                onPointerDown={handleSeek}
                onPointerMove={handleSeekDrag}
                style={{ flex: 1, margin: '0 8px' }}
              >
                <div className="custom-range-fill" style={{ width: `${pct || 0}%`, background: 'linear-gradient(90deg, #FF3CAC 0%, #f093fb 100%)' }}></div>
                <div className="custom-range-thumb" style={{ left: `${pct || 0}%`, border: '3px solid #f093fb', boxShadow: '0 0 10px #f093fb' }}></div>
              </div>
              <span id="bp-duration">{fmt(duration)}</span>
            </div>
          </div>
          <div className="bp-right">
            <div className="volume-control">
              <button className="bp-btn" onClick={toggleMute} title={isMuted ? "Unmute" : "Mute"}>
                <i className={`fas ${isMuted || volume === 0 ? 'fa-volume-mute' : volume < 0.5 ? 'fa-volume-down' : 'fa-volume-up'}`}></i>
              </button>
              <div 
                className="custom-range-track"
                onPointerDown={handleVolumeChange}
                onPointerMove={handleVolumeDrag}
                style={{ width: '90px' }}
              >
                <div className="custom-range-fill" style={{ width: `${(isMuted ? 0 : volume) * 100}%`, background: 'linear-gradient(90deg, #4facfe 0%, #00f2fe 100%)' }}></div>
                <div className="custom-range-thumb" style={{ left: `${(isMuted ? 0 : volume) * 100}%`, border: '3px solid #4facfe', boxShadow: '0 0 10px #4facfe' }}></div>
              </div>
            </div>
            <button 
              className={`bp-btn bp-favorite ${isFavorite ? 'active' : ''} ${isFavAnimating ? 'animating-heart' : ''}`} 
              title={isFavorite ? "Remove from favorites" : "Add to favorites"} 
              onClick={toggleFavorite}
              style={{ color: isFavorite ? '#ff6b6b' : '', transformOrigin: 'center' }}
            >
              <i className="fas fa-heart"></i>
            </button>
            <button className="bp-btn bp-collapse" title="Collapse player" onClick={() => setCollapsed(true)}>
              <i className="fas fa-chevron-down"></i>
            </button>
          </div>
        </div>
      ) : (
        <div className={`disc-player ${isPlaying ? 'playing' : ''}`} id="discPlayer" title="Click to expand" onClick={() => setCollapsed(false)}>
          <div className="disc-rotating">
            <i className="fas fa-compact-disc"></i>
          </div>
        </div>
      )}
    </>
  );
}
