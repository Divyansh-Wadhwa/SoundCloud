
// Usage: node printAllSongs.js
// Make sure to install mongoose: npm install mongoose

import mongoose from 'mongoose';

// Update this with your MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/soundcloud';

const songSchema = new mongoose.Schema({}, { strict: false, collection: 'songs' });
const Song = mongoose.model('Song', songSchema);

async function main() {
  try {
    await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    const songs = await Song.find();
    if (songs.length === 0) {
      console.log('No songs found.');
    } else {
      songs.forEach(song => {
        console.log('------------------------------');
        console.log(`ID: ${song._id}`);
        console.log(`Title: ${song.title}`);
        console.log(`Artist: ${song.artist}`);
        if (song.language) console.log(`Language: ${song.language}`);
        if (song.album) console.log(`Album: ${song.album}`);
        // Print more fields as needed
      });
      console.log('------------------------------');
      console.log(`Total songs: ${songs.length}`);
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    mongoose.disconnect();
  }
}

main();
