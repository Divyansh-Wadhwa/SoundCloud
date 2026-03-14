import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import Song from "./models/Song.js";
import https from "https";

// Search artist from TheAudioDB
function searchArtist(artistName) {
  return new Promise((resolve, reject) => {
    const url = `https://www.theaudiodb.com/api/v1/json/123/search.php?s=${encodeURIComponent(artistName)}`;
    
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.artists && json.artists.length > 0) {
            resolve(json.artists[0]);
          } else {
            resolve(null);
          }
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

// Get top tracks for an artist
function getTopTracks(artistName) {
  return new Promise((resolve, reject) => {
    const url = `https://www.theaudiodb.com/api/v1/json/123/track-top10.php?s=${encodeURIComponent(artistName)}`;
    
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json.track || []);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function seedSongs() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    
    // Popular artists to fetch
    const artists = [
      'Coldplay',
      'Queen',
      'The Beatles',
      'Linkin Park',
      'Imagine Dragons'
    ];

    let totalImported = 0;

    for (const artistName of artists) {
      try {
        
        // Get artist info first
        const artist = await searchArtist(artistName);
        if (!artist) {
          continue;
        }

        
        // Get top tracks
        const tracks = await getTopTracks(artistName);

        // Import tracks (limit to 5 per artist)
        for (const track of tracks.slice(0, 5)) {
          try {
            // Check if song already exists
            const existing = await Song.findOne({ 
              title: track.strTrack,
              artist: track.strArtist 
            });
            
            if (existing) {
              continue;
            }

            // Use track's MV thumbnail or artist thumb as fallback
            const thumbnail = track.strTrackThumb || track.strTrack3DCase || artist.strArtistThumb || '/images/default-cover.png';

            // Rotate through different Bensound tracks for variety
            const bensoundTracks = [
              'https://www.bensound.com/bensound-music/bensound-slowmotion.mp3',
              'https://www.bensound.com/bensound-music/bensound-creativeminds.mp3',
              'https://www.bensound.com/bensound-music/bensound-acoustic.mp3',
              'https://www.bensound.com/bensound-music/bensound-sunny.mp3',
              'https://www.bensound.com/bensound-music/bensound-energy.mp3',
              'https://www.bensound.com/bensound-music/bensound-funkyelement.mp3',
              'https://www.bensound.com/bensound-music/bensound-straight.mp3',
              'https://www.bensound.com/bensound-music/bensound-jazzcomedy.mp3',
              'https://www.bensound.com/bensound-music/bensound-ukulele.mp3',
              'https://www.bensound.com/bensound-music/bensound-happiness.mp3'
            ];

            const song = new Song({
              title: track.strTrack,
              artist: track.strArtist,
              file: bensoundTracks[totalImported % bensoundTracks.length],
              thumbnail: thumbnail
            });

            await song.save();
            totalImported++;

            // Add delay to avoid rate limiting (30 requests per minute for free tier)
            await new Promise(resolve => setTimeout(resolve, 2500));

          } catch (err) {
            console.error(`  ❌ Error importing ${track.strTrack}:`, err.message);
          }
        }
      } catch (err) {
        console.error(`❌ Error processing ${artistName}:`, err.message);
      }
    }

    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

seedSongs();
