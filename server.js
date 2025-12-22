
// ...existing code...

// ...existing code...
// ...existing code...

import dotenv from "dotenv";
dotenv.config();
import express from "express";

console.log("Loaded ENV →", {
  USE_REDIS: process.env.USE_REDIS,
  REDIS_URL: process.env.REDIS_URL,
});

import expressLayouts from "express-ejs-layouts";
import mongoose from "mongoose";
import session from "express-session";
import MongoStore from "connect-mongo";
import path from "path";
import { fileURLToPath } from "url";
import fileUpload from "express-fileupload";
import fs from "fs";

import User from "./models/User.js";
import Song from "./models/Song.js";
import Album from "./models/Album.js";
import { initRedis, isLocked, incrementAttempts, resetAttempts } from "./utils/redisLock.js";
import { encrypt, decrypt } from "./utils/encryption.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure upload directories exist
const uploadsDir = path.join(__dirname, "uploads");
const songsDir = path.join(uploadsDir, "songs");
const thumbnailsDir = path.join(uploadsDir, "thumbnails");
[songsDir, thumbnailsDir].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const app = express();
const PORT = process.env.PORT || 5000;

// EJS
app.use(expressLayouts);
app.set("layout", "layout");
app.set("view engine", "ejs");

// Middleware
app.use(express.urlencoded({ extended: true }));
// Parse JSON bodies for API endpoints (used by fetch requests)
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(fileUpload());

// Session 
// In test environment, avoid creating a persistent Mongo-backed session store
const sessionStore = process.env.NODE_ENV === 'test' ? undefined : MongoStore.create({ mongoUrl: process.env.MONGODB_URI });
app.use(
  session({
    secret: process.env.SESSION_SECRET || "soundcloud_secret",
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: { maxAge: 1000 * 60 * 60 },
  })
);


initRedis()
  .then(() => console.log("Redis initialized"))
  .catch(err => console.log("Redis init failed:", err));

// MongoDB
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB connected ✅"))
  .catch((err) => console.log(err));

// Note: Redis will be used on-demand inside helpers. We avoid forcing a connection
// at startup so the app can run even if Redis is unreachable (helpers fail-open).

// Expose user/admin/albums
app.use(async (req, res, next) => {
  res.locals.user = req.session.user;
  res.locals.admin = req.session.admin;

  try {
    res.locals.albums = await Album.find().populate("songs");
  } catch {
    res.locals.albums = [];
  }

  next();
});

// Protect routes
function requireLogin(req, res, next) {
  if (!req.session.user) return res.redirect("/login");
  next();
}
function requireAdmin(req, res, next) {
  if (!req.session.admin) return res.redirect("/login");
  next();
}

// ================= LOGIN / REGISTER =================
app.get("/login", (req, res) => res.render("login", { title: "Login" }));
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  // Admin login
  if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
    req.session.admin = true;
    req.session.user = {
      username: 'Admin',
      email: process.env.ADMIN_EMAIL,
      isAdmin: true
    };
    return req.session.save((err) => {
      if (err) console.error('Session save error:', err);
      res.redirect("/admin");
    });
  }

  // Check if account is locked (by Redis)
  try {
    const lockTtl = await isLocked(email);
    if (lockTtl && lockTtl > 0) {
      return res.status(200).render("login", {
        title: "Login",
        error: `Account locked due to too many failed attempts. Try again in ${lockTtl} seconds.`,
        email: email || "",
        lockTtl: Number(lockTtl),
      });
    }
  } catch (err) {
    // ignore Redis errors and proceed (fail open)
    console.warn("Redis lock check failed:", err && err.message ? err.message : err);
  }

  // User login
  const user = await User.findOne({ email });
  if (!user) {
    // If the email is not registered, show inline error (no attempt increment)
    return res.status(200).render("login", {
      title: "Login",
      error: "This email address does not exist. Please register first.",
      email: email || "",
    });
  }

  // If user exists, compare decrypted password using AES encryption
  let validPassword = false;
  try {
    const decrypted = decrypt(user.password);
    validPassword = decrypted && decrypted === password;
  } catch (e) {
    console.warn('Password check error:', e && e.message ? e.message : e);
    validPassword = false;
  }

  if (validPassword) {
    // successful login -> reset attempts and continue
    try {
      await resetAttempts(email);
    } catch (err) {
      console.warn("Failed to reset login attempts:", err && err.message ? err.message : err);
    }
    // Store a plain object in session to avoid attaching Mongoose document methods
    try {
      req.session.user = {
        _id: user._id,
        username: user.username,
        email: user.email,
      };
    } catch (e) {
      req.session.user = user;
    }
    // Ensure session is persisted before redirecting to avoid race conditions
    return req.session.save((err) => {
      if (err) console.error('Session save after login failed:', err);
      return res.redirect('/');
    });
  }

  // failed login -> increment attempts and possibly lock
  try {
    const { attempts, locked, ttl } = await incrementAttempts(email);
    if (locked) {
      return res.status(200).render("login", {
        title: "Login",
        error: `Account locked due to too many failed attempts. Try again in ${ttl} seconds.`,
        email: email || "",
        lockTtl: Number(ttl),
      });
    }
    const remaining = Math.max(0, 5 - attempts);
    return res.status(200).render("login", {
      title: "Login",
      error: `Invalid email or password. ${remaining} attempts left before temporary lock.`,
      email: email || "",
    });
  } catch (err) {
    console.warn("Failed to increment login attempts:", err && err.message ? err.message : err);
    return res.status(200).render("login", {
      title: "Login",
      error: "Invalid email or password",
      email: email || "",
    });
  }
});

app.get("/register", (req, res) => res.render("register", { title: "Register" }));
app.post("/register", async (req, res) => {
  const { username, email, password } = req.body;
  // Validate duplicate email
  const existing = await User.findOne({ email });
  if (existing) {
    return res.status(200).render("register", {
      title: "Register",
      error: "This email is already in use — please register with another email.",
      username: username || "",
      email: email || "",
    });
  }

  // Encrypt the password before saving (note: reversible encryption)
  const encryptedPassword = encrypt(password);
  const newUser = new User({ username, email, password: encryptedPassword, playlists: [] });
  await newUser.save();
  res.redirect("/login");
});

app.get("/logout", (req, res) => req.session.destroy(() => res.redirect("/login")));

// ================= DASHBOARD ROUTES =================
app.get("/dashboard", requireLogin, async (req, res) => {
  try {
    const user = await User.findById(req.session.user._id)
      .populate({
        path: 'recentlyPlayed.song',
        model: 'Song'
      })
      .lean();
    
    // Sort recently played by date (most recent first) and limit to 12
    const recentlyPlayed = (user.recentlyPlayed || [])
      .sort((a, b) => new Date(b.playedAt) - new Date(a.playedAt))
      .slice(0, 12)
      .filter(item => item.song); // Filter out any null songs

    res.render("dashboard", { 
      title: "Dashboard", 
      user: user,
      recentlyPlayed: recentlyPlayed
    });
  } catch (err) {
    console.error("Dashboard error:", err);
    res.render("dashboard", { 
      title: "Dashboard", 
      user: req.session.user,
      recentlyPlayed: []
    });
  }
});

app.post("/dashboard/update-username", requireLogin, async (req, res) => {
  const { username } = req.body;
  
  try {
    // Check if username is already taken by another user
    const existingUser = await User.findOne({ username, _id: { $ne: req.session.user._id } });
    if (existingUser) {
      const user = await User.findById(req.session.user._id).populate('recentlyPlayed.song').lean();
      const recentlyPlayed = (user.recentlyPlayed || []).sort((a, b) => new Date(b.playedAt) - new Date(a.playedAt)).slice(0, 12).filter(item => item.song);
      return res.render("dashboard", { 
        title: "Dashboard", 
        user: user,
        recentlyPlayed: recentlyPlayed,
        error: "Username already taken" 
      });
    }

    // Update username
    await User.findByIdAndUpdate(req.session.user._id, { username });
    req.session.user.username = username;
    
    const user = await User.findById(req.session.user._id).populate('recentlyPlayed.song').lean();
    const recentlyPlayed = (user.recentlyPlayed || []).sort((a, b) => new Date(b.playedAt) - new Date(a.playedAt)).slice(0, 12).filter(item => item.song);
    
    res.render("dashboard", { 
      title: "Dashboard", 
      user: user,
      recentlyPlayed: recentlyPlayed,
      success: "Username updated successfully" 
    });
  } catch (err) {
    console.error("Update username error:", err);
    const user = await User.findById(req.session.user._id).populate('recentlyPlayed.song').lean();
    const recentlyPlayed = (user.recentlyPlayed || []).sort((a, b) => new Date(b.playedAt) - new Date(a.playedAt)).slice(0, 12).filter(item => item.song);
    res.render("dashboard", { 
      title: "Dashboard", 
      user: user,
      recentlyPlayed: recentlyPlayed,
      error: "Failed to update username" 
    });
  }
});

app.post("/dashboard/update-password", requireLogin, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  
  try {
    const user = await User.findById(req.session.user._id);
    const decryptedPassword = decrypt(user.password);
    
    // Verify current password
    if (decryptedPassword !== currentPassword) {
      const userWithRecent = await User.findById(req.session.user._id).populate('recentlyPlayed.song').lean();
      const recentlyPlayed = (userWithRecent.recentlyPlayed || []).sort((a, b) => new Date(b.playedAt) - new Date(a.playedAt)).slice(0, 12).filter(item => item.song);
      return res.render("dashboard", { 
        title: "Dashboard", 
        user: userWithRecent,
        recentlyPlayed: recentlyPlayed,
        error: "Current password is incorrect" 
      });
    }

    // Update password
    const encryptedPassword = encrypt(newPassword);
    await User.findByIdAndUpdate(req.session.user._id, { password: encryptedPassword });
    
    const userWithRecent = await User.findById(req.session.user._id).populate('recentlyPlayed.song').lean();
    const recentlyPlayed = (userWithRecent.recentlyPlayed || []).sort((a, b) => new Date(b.playedAt) - new Date(a.playedAt)).slice(0, 12).filter(item => item.song);
    
    res.render("dashboard", { 
      title: "Dashboard", 
      user: userWithRecent,
      recentlyPlayed: recentlyPlayed,
      success: "Password updated successfully" 
    });
  } catch (err) {
    console.error("Update password error:", err);
    const userWithRecent = await User.findById(req.session.user._id).populate('recentlyPlayed.song').lean();
    const recentlyPlayed = (userWithRecent.recentlyPlayed || []).sort((a, b) => new Date(b.playedAt) - new Date(a.playedAt)).slice(0, 12).filter(item => item.song);
    res.render("dashboard", { 
      title: "Dashboard", 
      user: userWithRecent,
      recentlyPlayed: recentlyPlayed,
      error: "Failed to update password" 
    });
  }
});

// ================= ADMIN ROUTES =================
app.get("/admin", requireAdmin, async (req, res) => {
  const users = await User.find();
  const albums = await Album.find().populate("songs");
  const allSongs = await Song.find().sort({ createdAt: -1 });
  console.log('Admin route - req.session.user:', req.session.user);
  console.log('Admin route - res.locals.user:', res.locals.user);
  res.render("admin-panel", { title: "Admin Panel", user: req.session.user, users, albums, allSongs, layout: false });
});

// Create album
app.get("/admin/albums/create", requireAdmin, (req, res) =>
  res.render("admin-album-create", { title: "Add Album", user: req.session.user, layout: false })
);
app.post("/admin/albums/create", requireAdmin, async (req, res) => {
  const { name, artist } = req.body;
  if (!name || !artist) return res.send("Album name and artist required");

  const album = new Album({ name, artist, songs: [] });
  await album.save();
  res.redirect("/admin");
});

// Delete album (with cleanup)
app.post("/admin/albums/delete/:albumId", requireAdmin, async (req, res) => {
  const { albumId } = req.params;
  const album = await Album.findById(albumId).populate("songs");
  if (!album) return res.send("Album not found");

  for (const song of album.songs) {
    // Delete files
    [song.file, song.thumbnail].forEach(filePath => {
      if (!filePath) return;
      const fullPath = path.join(__dirname, filePath);
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    });

    // Remove from playlists
    await User.updateMany(
      { "playlists.songs": song._id },
      { $pull: { "playlists.$[].songs": song._id } }
    );

    await Song.findByIdAndDelete(song._id);
  }

  await Album.findByIdAndDelete(albumId);
  res.redirect("/admin");
});

// Create song
app.get("/admin/songs/create", requireAdmin, async (req, res) => {
  const albums = await Album.find();
  res.render("admin-song-create", { title: "Add Song", user: req.session.user, albums, layout: true, admin: true });
});
app.post("/admin/songs/create", requireAdmin, async (req, res) => {
  const { title, artist, albumId, language } = req.body;
  if (!title || !artist || !language || !req.files?.audio || !req.files?.thumbnail)
    return res.send("All fields required");

  const audioFile = req.files.audio;
  const thumbnailFile = req.files.thumbnail;

  const audioPath = path.join(songsDir, audioFile.name);
  const thumbnailPath = path.join(thumbnailsDir, thumbnailFile.name);

  await audioFile.mv(audioPath);
  await thumbnailFile.mv(thumbnailPath);

  const song = new Song({
    title,
    artist,
    file: "/uploads/songs/" + audioFile.name,
    thumbnail: "/uploads/thumbnails/" + thumbnailFile.name,
    language,
  });
  await song.save();

  if (albumId) {
    try {
      const album = await Album.findById(albumId);
      if (album) {
        album.songs.push(song._id);
        await album.save();
      }
    } catch (e) {
      console.warn('Could not attach song to album:', e && e.message);
    }
  }

  res.redirect("/admin");
});

// Edit song - render form
app.get("/admin/songs/edit/:songId", requireAdmin, async (req, res) => {
  try {
    const { songId } = req.params;
    const song = await Song.findById(songId);
    if (!song) return res.redirect('/admin');
    res.render('admin-song-edit', { title: 'Edit Song', user: req.session.user, song, layout: true, admin: true });
  } catch (err) {
    console.error('Error rendering edit form:', err);
    res.redirect('/admin');
  }
});

// Edit song - handle form submission
app.post('/admin/songs/edit/:songId', requireAdmin, async (req, res) => {
  try {
    const { songId } = req.params;
    const { title, artist, language } = req.body;
    const song = await Song.findById(songId);
    if (!song) return res.redirect('/admin');

    if (title) song.title = title;
    if (artist) song.artist = artist;
    if (language) song.language = language;

    // Handle optional file replacements
    if (req.files && req.files.audio) {
      const audioFile = req.files.audio;
      const audioPath = path.join(songsDir, audioFile.name);
      await audioFile.mv(audioPath);
      // remove old file if exists
      if (song.file) {
        const oldPath = path.join(__dirname, song.file);
        try { if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath); } catch(e){}
      }
      song.file = '/uploads/songs/' + audioFile.name;
    }

    if (req.files && req.files.thumbnail) {
      const thumbnailFile = req.files.thumbnail;
      const thumbPath = path.join(thumbnailsDir, thumbnailFile.name);
      await thumbnailFile.mv(thumbPath);
      if (song.thumbnail) {
        const oldThumb = path.join(__dirname, song.thumbnail);
        try { if (fs.existsSync(oldThumb)) fs.unlinkSync(oldThumb); } catch(e){}
      }
      song.thumbnail = '/uploads/thumbnails/' + thumbnailFile.name;
    }

    await song.save();
    res.redirect('/admin');
  } catch (err) {
    console.error('Error saving edited song:', err);
    res.redirect('/admin');
  }
});

// Delete song
app.post("/admin/songs/delete/:songId", requireAdmin, async (req, res) => {
  const { songId } = req.params;
  const song = await Song.findById(songId);
  if (song) {
    [song.file, song.thumbnail].forEach(filePath => {
      if (!filePath) return;
      const fullPath = path.join(__dirname, filePath);
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    });

    await Album.updateMany({ songs: songId }, { $pull: { songs: songId } });
    await User.updateMany(
      { "playlists.songs": songId },
      { $pull: { "playlists.$[].songs": songId } }
    );

    await Song.findByIdAndDelete(songId);
  }
  res.redirect("/admin");
});

// Remove song from album only
app.post("/admin/albums/:albumId/remove/:songId", requireAdmin, async (req, res) => {
  const { albumId, songId } = req.params;
  const album = await Album.findById(albumId);
  if (!album) return res.send("Album not found");
  album.songs.pull(songId);
  await album.save();
  res.redirect("/admin");
});

// Add song to album
app.post("/admin/albums/:albumId/add-song", requireAdmin, async (req, res) => {
  const { albumId } = req.params;
  const { title, artist } = req.body;
  if (!title || !artist || !req.files?.audio || !req.files?.thumbnail)
    return res.send("All fields required");

  const audioFile = req.files.audio;
  const thumbnailFile = req.files.thumbnail;

  const audioPath = path.join(songsDir, audioFile.name);
  const thumbnailPath = path.join(thumbnailsDir, thumbnailFile.name);

  await audioFile.mv(audioPath);
  await thumbnailFile.mv(thumbnailPath);

  const song = new Song({
    title,
    artist,
    file: "/uploads/songs/" + audioFile.name,
    thumbnail: "/uploads/thumbnails/" + thumbnailFile.name,
  });
  await song.save();

  const album = await Album.findById(albumId);
  album.songs.push(song._id);
  await album.save();

  res.redirect("/admin");
});

// Add existing song to album
app.post("/admin/songs/:songId/add-to-album/:albumId", requireAdmin, async (req, res) => {
  try {
    const { songId, albumId } = req.params;
    const album = await Album.findById(albumId);
    if (!album) return res.status(404).send("Album not found");
    
    if (!album.songs.includes(songId)) {
      album.songs.push(songId);
      await album.save();
    }
    res.redirect("/admin");
  } catch (err) {
    console.error("Error adding song to album:", err);
    res.status(500).send("Error adding song to album: " + err.message);
  }
});

// ================= USER ROUTES =================

app.get("/", requireLogin, async (req, res) => {
  const albums = await Album.find().populate("songs");

  // language filter support
  const selectedLang = req.query.lang || '';

  // Get ALL songs - sort by creation date first
  let allSongsQuery = {};
  if (selectedLang) {
    allSongsQuery.language = selectedLang;
  }
  let allSongs = await Song.find(allSongsQuery).sort({ createdAt: -1 });

  // Remove duplicates by ID (in case same song exists multiple times)
  const uniqueSongs = [];
  const seenIds = new Set();
  for (const song of allSongs) {
    const id = song._id.toString();
    if (!seenIds.has(id)) {
      seenIds.add(id);
      uniqueSongs.push(song);
    }
  }

  // Shuffle the unique songs array
  const songs = uniqueSongs.sort(() => Math.random() - 0.5);

  // Charts: Top 5 by language (latest for now)
  const bestHindi = await Song.find({ language: "Hindi" }).sort({ createdAt: -1 }).limit(5);
  const bestPunjabi = await Song.find({ language: "Punjabi" }).sort({ createdAt: -1 }).limit(5);
  const bestEnglish = await Song.find({ language: "English" }).sort({ createdAt: -1 }).limit(5);

  res.render("index", {
    title: "SoundCloud",
    songs,
    albums,
    bestHindi: bestHindi || [],
    bestPunjabi: bestPunjabi || [],
    bestEnglish: bestEnglish || []
    , selectedLang: selectedLang
  });
});

// Playlists
app.post("/playlists", requireLogin, async (req, res) => {
  const { name } = req.body;
  if (!name) return res.send("Playlist name required");

  try {
    const user = await User.findById(req.session.user._id);
    if (!user) return res.send("User not found");
    
    user.playlists.push({ name, songs: [] });
    await user.save();
    res.redirect("/playlists");
  } catch (err) {
    console.error("Error creating playlist:", err);
    res.status(500).send("Error creating playlist: " + err.message);
  }
});

app.get("/playlists", requireLogin, async (req, res) => {
  const user = await User.findById(req.session.user._id);
  const songs = await Song.find();
  const playlistsWithSongs = user.playlists.map((pl) => ({
    _id: pl._id,
    name: pl.name,
    songs: pl.songs
      .map((songId) => songs.find((s) => s._id.toString() === songId.toString()))
      .filter(song => song != null), // Filter out undefined songs
  }));
  res.render("playlists", { title: "Your Playlists", playlists: playlistsWithSongs, songs });
});

app.get("/playlists/view/:playlistId", requireLogin, async (req, res) => {
  const { playlistId } = req.params;
  const user = await User.findById(req.session.user._id);
  const playlist = user.playlists.id(playlistId);
  if (!playlist) return res.send("Playlist not found");

  const songs = await Song.find();
  const playlistSongs = playlist.songs.map((songId) =>
    songs.find((s) => s._id.toString() === songId.toString())
  );
  res.render("playlist-view", {
    title: playlist.name,
    playlist: { _id: playlist._id, name: playlist.name, songs: playlistSongs },
    songs,
  });
});

app.post("/playlists/:playlistId/add/:songId", requireLogin, async (req, res) => {
  const { playlistId, songId } = req.params;
  try {
    const user = await User.findById(req.session.user._id);
    if (!user) return res.send("User not found");
    
    const playlist = user.playlists.id(playlistId);
    if (!playlist) return res.send("Playlist not found");
    
    if (!playlist.songs.includes(songId)) playlist.songs.push(songId);
    await user.save();
    res.redirect("/playlists/view/" + playlistId);
  } catch (err) {
    console.error("Error adding song to playlist:", err);
    res.status(500).send("Error adding song: " + err.message);
  }
});

app.post("/playlists/:playlistId/remove/:songId", requireLogin, async (req, res) => {
  const { playlistId, songId } = req.params;
  try {
    const user = await User.findById(req.session.user._id);
    if (!user) return res.send("User not found");
    
    const playlist = user.playlists.id(playlistId);
    if (!playlist) return res.send("Playlist not found");
    
    playlist.songs.pull(songId);
    await user.save();
    res.redirect("/playlists/view/" + playlistId);
  } catch (err) {
    console.error("Error removing song from playlist:", err);
    res.status(500).send("Error removing song: " + err.message);
  }
});

// Delete entire playlist
app.post("/playlists/:playlistId/delete", requireLogin, async (req, res) => {
  const { playlistId } = req.params;
  try {
    const user = await User.findById(req.session.user._id);
    if (!user) return res.send("User not found");
    
    user.playlists.pull(playlistId);
    await user.save();
    res.redirect("/playlists");
  } catch (err) {
    console.error("Error deleting playlist:", err);
    res.status(500).send("Error deleting playlist: " + err.message);
  }
});

// ================= FAVORITES =================
app.get("/favorites", requireLogin, async (req, res) => {
  try {
    const user = await User.findById(req.session.user._id).populate('favorites');
    if (!user) return res.redirect('/login');
    
    // Initialize favorites if it doesn't exist
    if (!user.favorites) {
      user.favorites = [];
      await user.save();
      req.session.user = user;
    }
    
    res.render("favorites", { 
      title: "My Favorites", 
      favorites: user.favorites || []
    });
  } catch (error) {
    console.error('Favorites page error:', error);
    res.render("favorites", { title: "My Favorites", favorites: [] });
  }
});

app.post("/favorites/add/:songId", requireLogin, async (req, res) => {
  try {
    const user = await User.findById(req.session.user._id);
    const songId = req.params.songId;
    
    // Initialize favorites if it doesn't exist
    if (!user.favorites) {
      user.favorites = [];
    }
    
    // Check if already in favorites
    if (!user.favorites.includes(songId)) {
      user.favorites.push(songId);
      await user.save();
      req.session.user = user;
    }
    
    // Return JSON for AJAX requests
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      return res.json({ success: true, favorites: user.favorites });
    }
    
    res.redirect('back');
  } catch (error) {
    console.error(error);
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      return res.status(500).json({ success: false, error: 'Failed to add to favorites' });
    }
    res.redirect('back');
  }
});

app.post("/favorites/remove/:songId", requireLogin, async (req, res) => {
  try {
    const user = await User.findById(req.session.user._id);
    const songId = req.params.songId;
    
    // Initialize favorites if it doesn't exist
    if (!user.favorites) {
      user.favorites = [];
    }
    
    user.favorites = user.favorites.filter(f => f.toString() !== songId);
    await user.save();
    req.session.user = user;
    
    // Return JSON for AJAX requests
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      return res.json({ success: true, favorites: user.favorites });
    }
    
    res.redirect('back');
  } catch (error) {
    console.error(error);
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      return res.status(500).json({ success: false, error: 'Failed to remove from favorites' });
    }
    res.redirect('back');
  }
});

// API endpoints for AJAX requests
app.get("/api/user/favorites", requireLogin, async (req, res) => {
  try {
    const user = await User.findById(req.session.user._id);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ favorites: user.favorites || [] });
  } catch (err) {
    res.status(500).json({ error: "Error fetching favorites" });
  }
});

// Dashboard stats API for live updates
app.get('/api/dashboard-stats', requireLogin, async (req, res) => {
  try {
    const user = await User.findById(req.session.user._id).lean();
    const recentlyPlayed = (user.recentlyPlayed || [])
      .sort((a, b) => new Date(b.playedAt) - new Date(a.playedAt))
      .slice(0, 12)
      .filter(item => item.song);

    const playlistsCount = (user.playlists || []).length;
    const favoritesCount = (user.favorites || []).length;

    // Populate song details for recentlyPlayed items
    const songIds = recentlyPlayed.map(rp => rp.song);
    const songs = await Song.find({ _id: { $in: songIds } }).lean();
    const songMap = new Map(songs.map(s => [s._id.toString(), s]));

    const rp = recentlyPlayed.map(item => ({
      song: songMap.get(item.song.toString()) || null,
      playedAt: item.playedAt
    })).filter(x => x.song);

    res.json({
      playlistsCount,
      favoritesCount,
      recentlyPlayed: rp
    });
  } catch (err) {
    console.error('Error in /api/dashboard-stats:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

// Record recently played
app.post('/api/recently-played', requireLogin, async (req, res) => {
  try {
    const songId = req.body && req.body.songId ? req.body.songId : null;
    if (!songId) return res.status(400).json({ error: 'songId required' });

    const user = await User.findById(req.session.user._id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Remove existing entry for same song (if present)
    user.recentlyPlayed = (user.recentlyPlayed || []).filter(rp => rp.song.toString() !== songId.toString());

    // Add to front
    user.recentlyPlayed.unshift({ song: songId, playedAt: new Date() });

    // Keep only latest 50 entries
    if (user.recentlyPlayed.length > 50) user.recentlyPlayed = user.recentlyPlayed.slice(0, 50);

    await user.save();
    return res.json({ success: true });
  } catch (err) {
    console.error('Error recording recently played:', err);
    res.status(500).json({ error: 'Failed to record recently played' });
  }
});

app.get("/api/song/:id", requireLogin, async (req, res) => {
  try {
    const song = await Song.findById(req.params.id);
    if (!song) return res.status(404).json({ error: "Song not found" });
    res.json(song);
  } catch (err) {
    res.status(500).json({ error: "Error fetching song" });
  }
});

app.get("/api/songs", requireLogin, async (req, res) => {
  try {
    const songs = await Song.find().sort({ createdAt: -1 });
    res.json(songs);
  } catch (err) {
    res.status(500).json({ error: "Error fetching songs" });
  }
});

// Player
app.get("/player/:id", requireLogin, async (req, res) => {
  const song = await Song.findById(req.params.id);
  if (!song) return res.send("Song not found");
  const songs = await Song.find();
  res.render("player", { 
    title: song.title, 
    song, 
    songs,
    user: req.session.user,
    layout: false 
  });
});

// Search
app.get("/search", requireLogin, async (req, res) => {
  const query = req.query.q;
  let songs;
  if (typeof query === 'undefined' || query === null) {
    songs = await Song.find(); // Show all songs if no query param
  } else if (query === "") {
    songs = await Song.find(); // Show all songs if query is empty string
  } else {
    songs = await Song.find({ title: { $regex: query, $options: "i" } });
  }
  res.render("search", { title: `Search: ${query || ''}` , songs });
});

// Album view
app.get("/album/:id", requireLogin, async (req, res) => {
  const album = await Album.findById(req.params.id).populate("songs");
  if (!album) return res.send("Album not found");
  res.render("album-view", { 
    title: album.name, 
    album,
    user: req.session.user,
    layout: false 
  });
});

// Start server


console.log("USE_REDIS =", process.env.USE_REDIS);
console.log("REDIS_URL =", process.env.REDIS_URL);

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}

export default app;
