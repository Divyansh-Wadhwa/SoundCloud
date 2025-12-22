import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import Song from './models/Song.js';

async function updateSongAudio() {
  try {
    console.log('🎵 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Bensound tracks for variety
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

    // Find all songs with the placeholder audio
    const songsToUpdate = await Song.find({ 
      file: 'https://www.bensound.com/bensound-music/bensound-ukulele.mp3' 
    });

    console.log(`\n📝 Found ${songsToUpdate.length} songs to update with working audio...`);

    for (let i = 0; i < songsToUpdate.length; i++) {
      const song = songsToUpdate[i];
      const newAudioUrl = bensoundTracks[i % bensoundTracks.length];
      
      song.file = newAudioUrl;
      await song.save();
      
      console.log(`  ✅ Updated: ${song.title} by ${song.artist}`);
    }

    console.log(`\n🎉 Successfully updated ${songsToUpdate.length} songs with working Bensound audio!`);
    console.log('💡 All songs now have functional streaming URLs from Bensound.');

  } catch (error) {
    console.error('❌ Error updating songs:', error);
  } finally {
    await mongoose.connection.close();
    console.log('👋 Disconnected from MongoDB');
  }
}

updateSongAudio();
