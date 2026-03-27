import mongoose from "mongoose";

const playlistSchema = new mongoose.Schema({
  _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
  name: { type: String, required: true },
  songs: [{ type: mongoose.Schema.Types.ObjectId, ref: "Song" }]
}, { _id: true });

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  playlists: [playlistSchema],
  favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: "Song" }],
  recentlyPlayed: [{
    song: { type: mongoose.Schema.Types.ObjectId, ref: "Song" },
    playedAt: { type: Date, default: Date.now }
  }]
});

export default mongoose.model("User", userSchema);
