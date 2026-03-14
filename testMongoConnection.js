// Usage: node testMongoConnection.js
// Loads .env, connects to MongoDB, fetches all songs, prints errors if any
import 'dotenv/config';
import mongoose from 'mongoose';

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('MONGODB_URI not set in .env');
  process.exit(1);
}

const songSchema = new mongoose.Schema({}, { strict: false, collection: 'songs' });
const Song = mongoose.model('Song', songSchema);

async function main() {
  try {
    await mongoose.connect(uri);
    const songs = await Song.find();
    if (songs.length === 0) {
    } else {
      songs.forEach(song => {
      });
    }
  } catch (err) {
    console.error('MongoDB error:', err);
  } finally {
    mongoose.disconnect();
  }
}

main();
