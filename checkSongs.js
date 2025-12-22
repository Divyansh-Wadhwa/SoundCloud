import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import Song from './models/Song.js';

async function checkSongs() {
  try {
    console.log('🎵 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const songs = await Song.find().limit(5);
    
    console.log('\n📋 Sample songs in database:');
    songs.forEach((song, idx) => {
      console.log(`\n${idx + 1}. ${song.title} by ${song.artist}`);
      console.log(`   Audio URL: ${song.file}`);
      console.log(`   Thumbnail: ${song.thumbnail}`);
      console.log(`   ID: ${song._id}`);
    });

    console.log(`\n📊 Total songs: ${await Song.countDocuments()}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

checkSongs();
