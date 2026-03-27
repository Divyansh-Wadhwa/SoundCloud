
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
    } else {
      songs.forEach(song => {
        // Print more fields as needed
      });
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    mongoose.disconnect();
  }
}

main();
