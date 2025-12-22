console.log("SoundCloud Loaded ♪");

// Log when a song is clicked
document.querySelectorAll(".song").forEach(song => {
  song.addEventListener("click", () => {
    console.log("Clicked:", song.querySelector("p").innerText);
  });
});

// Optional: Highlight song when added to playlist
document.querySelectorAll(".song form button").forEach(button => {
  button.addEventListener("click", (e) => {
    // e.preventDefault(); // Don't prevent submit if you want backend to handle
    const songDiv = e.target.closest(".song");
    songDiv.style.backgroundColor = "#222"; // Simple visual feedback
    songDiv.style.color = "#fff";
  });
});

const createPlaylistLink = document.getElementById("createPlaylistSidebar");
  if(createPlaylistLink){
    createPlaylistLink.addEventListener("click", () => {
      window.showModal({
        title: 'Create Playlist',
        message: 'Enter a name for your new playlist:',
        input: true,
        placeholder: 'My Awesome Playlist',
        confirmText: 'Create',
        onConfirm: (name) => {
          if(name){
            const form = document.createElement("form");
            form.method = "POST";
            form.action = "/playlists";
            const input = document.createElement("input");
            input.type = "hidden";
            input.name = "name";
            input.value = name;
            form.appendChild(input);
            document.body.appendChild(form);
            form.submit();
          }
        }
      });
    });
  }

// Playlist creation handled in EJS using prompt
// No additional JS needed since form is dynamically created and submitted

// Theme toggle: persist in localStorage and apply via data-theme on <html>
(function(){
  const KEY = 'soundcloud_theme';
  const btn = document.getElementById('themeToggle');
  const icon = document.getElementById('themeIcon');
  if(!btn) return;

  function setTheme(t){
    if(t === 'light') document.documentElement.setAttribute('data-theme','light'); else document.documentElement.removeAttribute('data-theme');
    localStorage.setItem(KEY, t);
    // change icon: sun for light, moon for dark
    if(icon){
      if(t === 'light'){
        icon.innerHTML = '<path d="M12 3v2m0 14v2m9-9h-2M5 12H3m15.364-6.364l-1.414 1.414M7.05 16.95l-1.414 1.414M18.364 18.364l-1.414-1.414M7.05 7.05L5.636 5.636" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>'; 
      } else {
        icon.innerHTML = '<path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" fill="currentColor"/>';
      }
    }
  }

  // init
  const pref = localStorage.getItem(KEY) || (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  setTheme(pref === 'light' ? 'light' : 'dark');

  btn.addEventListener('click', ()=>{
    const cur = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    const next = cur === 'light' ? 'dark' : 'light';
    setTheme(next);
  });
})();

// Delegated click handlers: ensure `.track-card-new` and `.play-btn-new` trigger playback
document.addEventListener('click', function(e){
  try {
    const playBtn = e.target.closest('.play-btn-new');
    if(playBtn){
      const card = playBtn.closest('.track-card-new');
      const id = card && card.dataset ? card.dataset.songId : null;
      if(id){
        e.preventDefault();
        e.stopPropagation();
        if(typeof window.playSongInBottomBar === 'function'){
          window.playSongInBottomBar(id);
        } else {
          // Save playback state before navigating
          try {
            var audio = document.querySelector('audio');
            if(audio) {
              localStorage.setItem('player_resume', JSON.stringify({
                songId: id,
                currentTime: audio.currentTime,
                paused: audio.paused
              }));
            }
          } catch(e) { console.warn('Could not save player state', e); }
          window.location.href = '/player/' + id;
        }
        return;
      }
    }

    const card = e.target.closest('.track-card-new');
    if(card){
      const id = card.dataset ? card.dataset.songId : null;
      if(id){
        if(typeof window.playSongInBottomBar === 'function'){
          window.playSongInBottomBar(id);
        } else {
          window.location.href = '/player/' + id;
        }
      }
    }
  } catch (err) {
    console.error('Playback click handler error:', err);
  }
});
