import dotenv from "dotenv";
dotenv.config();
import https from "https";
import db from "./models/index.js";
const { Song, sequelize } = db;

function searchArtist(artistName) {
  return new Promise((resolve, reject) => {
    const url = `https://www.theaudiodb.com/api/v1/json/123/search.php?s=${encodeURIComponent(artistName)}`;
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.artists && json.artists.length > 0) resolve(json.artists[0]);
          else resolve(null);
        } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

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
        } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

async function seedSongs() {
  try {
    await sequelize.authenticate();
    await sequelize.sync();

    const artists = ['Coldplay', 'Queen', 'The Beatles', 'Linkin Park', 'Imagine Dragons'];
    let totalImported = 0;

    for (const artistName of artists) {
      try {
        const artist = await searchArtist(artistName);
        if (!artist) continue;

        const tracks = await getTopTracks(artistName);

        for (const track of tracks.slice(0, 5)) {
          try {
            const existing = await Song.findOne({ 
              where: { title: track.strTrack, artist: track.strArtist }
            });
            if (existing) continue;

            const thumbnail = track.strTrackThumb || track.strTrack3DCase || artist.strArtistThumb || '/images/default-cover.png';
            const bensoundTracks = [
              'https://www.bensound.com/bensound-music/bensound-slowmotion.mp3',
              'https://www.bensound.com/bensound-music/bensound-creativeminds.mp3',
              'https://www.bensound.com/bensound-music/bensound-acousticbreeze.mp3',
              'https://www.bensound.com/bensound-music/bensound-sunny.mp3',
              'https://www.bensound.com/bensound-music/bensound-energy.mp3',
              'https://www.bensound.com/bensound-music/bensound-happiness.mp3'
            ];

            await Song.create({
              title: track.strTrack,
              artist: track.strArtist,
              file: bensoundTracks[totalImported % bensoundTracks.length],
              thumbnail: thumbnail,
              language: 'English'
            });
            totalImported++;
            await new Promise(resolve => setTimeout(resolve, 2500));
          } catch (err) {
            console.error(`  ❌ Error importing ${track.strTrack}:`, err.message);
          }
        }
      } catch (err) {
        console.error(`❌ Error processing ${artistName}:`, err.message);
      }
    }

    console.log(`✅ Successfully seeded ${totalImported} songs from TheAudioDB into PostgreSQL!`);
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await sequelize.close();
    process.exit(1);
  }
}

seedSongs();
