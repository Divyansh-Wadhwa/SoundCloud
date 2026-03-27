import React, { useState, useEffect, useRef } from 'react';

export default function Player({ queue, index, setIndex, isPlaying, setIsPlaying }) {
  const audioRef = useRef(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [collapsed, setCollapsed] = useState(false);
  
  const currentSong = queue[index] || null;

  useEffect(() => {
    if (audioRef.current && currentSong) {
      if (isPlaying) {
        audioRef.current.play().catch(e => console.error(e));
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, currentSong, index]);

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
    const time = (e.target.value / 100) * duration;
    audioRef.current.currentTime = time;
    setCurrentTime(time);
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
      <audio 
        ref={audioRef}
        src={currentSong.file}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onLoadedMetadata={handleTimeUpdate}
      />

      {!collapsed ? (
        <div className="bottom-player" id="globalBottomPlayer">
          <div className="bp-left">
            <img id="bp-cover" src={currentSong.thumbnail || '/images/default-cover.png'} alt="cover" />
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
              <input 
                type="range" 
                id="bp-slider" 
                min="0" max="100" 
                value={pct} 
                step="0.1" 
                style={{ verticalAlign: 'middle', '--pct': `${pct}%` }} 
                onChange={handleSeek}
              />
              <span id="bp-duration">{fmt(duration)}</span>
            </div>
          </div>
          <div className="bp-right">
            <button className="bp-btn bp-favorite" title="Add to favorites" onClick={() => {
               // Global favorite logic mock, ideally calls API
               fetch(`/api/favorites/add/${currentSong.id}`, {method: 'POST'})
                 .then(res => res.json())
                 .then((data) => {
                    const btn = document.getElementById('bpFavoriteBtn');
                    if(btn) {
                        btn.classList.toggle('active');
                        btn.style.animation = 'heartPop 0.3s ease';
                        setTimeout(() => btn.style.animation = '', 300);
                    }
                 });
            }} id="bpFavoriteBtn">
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
