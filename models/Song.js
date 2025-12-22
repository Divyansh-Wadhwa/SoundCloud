import mongoose from "mongoose";

const songSchema = new mongoose.Schema({
  title: { type: String, required: true },
  artist: { type: String, required: true },
  file: { type: String, required: true },
  album: { type: mongoose.Schema.Types.ObjectId, ref: "Album" },
  thumbnail: String,   // path to image
  language: { type: String, enum: ["Hindi", "Punjabi", "English", "Other"], default: "Other" },
});

export default mongoose.model("Song", songSchema);
