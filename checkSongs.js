import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import Song from './models/Song.js';

async function checkSongs() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const songs = await Song.find().limit(5);
    
    songs.forEach((song, idx) => {
    });


  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
  }
}

checkSongs();
