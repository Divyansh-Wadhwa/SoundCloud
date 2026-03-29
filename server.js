import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import session from "express-session";
import pgSession from "connect-pg-simple";
import pg from "pg";
import path from "path";
import { fileURLToPath } from "url";
import fileUpload from "express-fileupload";
import fs from "fs";
import { Op } from "sequelize";

import sequelize from "./config/database.js";
import db from "./models/index.js";
const { User, Album, Song, Playlist, RecentlyPlayed } = db;
import { encrypt, decrypt } from "./utils/encryption.js";

// Test database connection and sync models
sequelize.authenticate()
  .then(() => {
    console.log('Database connected successfully');
    return sequelize.sync({ alter: true }); // Syncs models without dropping tables if possible
  })
  .then(() => console.log('Database synced'))
  .catch(err => console.error('Database connection failed:', err));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadsDir = path.join(__dirname, "uploads");
const songsDir = path.join(uploadsDir, "songs");
const thumbnailsDir = path.join(uploadsDir, "thumbnails");
const albumCoversDir = path.join(uploadsDir, "album-covers");
[songsDir, thumbnailsDir, albumCoversDir].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: function(origin, callback) {
    if (!origin || origin.startsWith("http://localhost:")) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(fileUpload());

// API ROUTES
app.get("/api/albums/:albumId", async (req, res) => {
  try {
    const album = await Album.findByPk(req.params.albumId, {
      include: [{ 
        model: Song,
        as: 'songs'
      }],
      order: [[{ model: Song, as: 'songs' }, 'createdAt', 'ASC']]
    });
    
    if (!album) {
      return res.status(404).json({ error: "Album not found" });
    }
    res.json(album);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch album" });
  }
});

// Serve built React frontend first so it overrides any legacy assets
app.use(express.static(path.join(__dirname, "frontend", "dist")));

// Fallback to legacy static file serving
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(__dirname, "frontend", "dist", "index.html"));
});

// SESSION MIDDLEWARE
const PgSessionStore = pgSession(session);
const pgPool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { require: true, rejectUnauthorized: false }});

app.use(
  session({
    store: new PgSessionStore({
      pool: pgPool,
      tableName: "session"
    }),
    secret: process.env.SESSION_SECRET || "soundcloud_secret",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 },
  })
);

function requireLogin(req, res, next) {
  if (!req.session.user) return res.status(401).json({ error: "Unauthorized" });
  next();
}
function requireAdmin(req, res, next) {
  if (!req.session.admin) return res.status(401).json({ error: "Unauthorized admin" });
  next();
}

app.get('/api/me', async (req, res) => {
  if (req.session.user) {
    if (req.session.admin) {
      return res.json({ user: req.session.user, isAdmin: true });
    }
    const user = await User.findByPk(req.session.user.id, {
      include: [
        { 
          model: RecentlyPlayed, 
          as: 'recentlyPlayed',
          include: [{ model: Song, as: 'song' }], 
        },
        {
          model: Song,
          as: 'favorites',
          through: { attributes: [] }
        }
      ],
      order: [[{ model: RecentlyPlayed, as: 'recentlyPlayed' }, 'playedAt', 'DESC']],
      // We limit to fetching some history. Since Sequelize doesn't allow easy nested order limits,
      // it might fetch all history, but we slice it in the frontend or here.
    });
    
    res.json({ user, isAdmin: false });
  } else {
    res.json({ user: null });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
    req.session.admin = true;
    req.session.user = { id: "0", username: 'Admin', email: process.env.ADMIN_EMAIL, isAdmin: true };
    return req.session.save(() => res.json({ success: true, user: req.session.user }));
  }

  const user = await User.findOne({ where: { email } });
  if (!user) return res.status(400).json({ error: "Invalid email or password" });

  try {
    const decrypted = decrypt(user.password);
    if (decrypted !== password) return res.status(400).json({ error: "Invalid email or password" });
    
    req.session.user = { id: user.id, username: user.username, email: user.email };
    return req.session.save(() => res.json({ success: true, user: req.session.user }));
  } catch (e) {
    return res.status(400).json({ error: "Invalid email or password" });
  }
});

app.post("/api/auth/register", async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const existing = await User.findOne({ 
      where: { 
        [Op.or]: [{ email }, { username }] 
      } 
    });
    if (existing) return res.status(400).json({ error: "Email or username already used" });

    const encryptedPassword = encrypt(password);
    const user = await User.create({ username, email, password: encryptedPassword });
    res.json({ success: true, user: { id: user.id, username: user.username, email: user.email } });
  } catch (err) {
    res.status(500).json({ error: "Registration failed" });
  }
});

app.post("/api/auth/logout", (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
});

// DASHBOARD
app.post("/api/dashboard/update-username", requireLogin, async (req, res) => {
  const { username } = req.body;
  try {
    const existing = await User.findOne({ 
      where: { 
        username, 
        id: { [Op.ne]: req.session.user.id } 
      } 
    });
    if (existing) return res.status(400).json({ error: "Username already taken" });

    await User.update({ username }, { where: { id: req.session.user.id } });
    req.session.user.username = username;
    res.json({ success: true, user: req.session.user });
  } catch (err) {
    res.status(500).json({ error: "Failed to update" });
  }
});
app.post("/api/dashboard/update-password", requireLogin, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  try {
    const user = await User.findByPk(req.session.user.id);
    const decrypted = decrypt(user.password);
    if (decrypted !== currentPassword) return res.status(400).json({ error: "Current password incorrect" });

    const encryptedPassword = encrypt(newPassword);
    await User.update({ password: encryptedPassword }, { where: { id: req.session.user.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to update" });
  }
});

app.get("/api/search", async (req, res) => {
  const { q } = req.query;
  if (!q) return res.json({ songs: [], albums: [] });

  const searchFilter = { [Op.iLike]: `%${q}%` };
  
  const songs = await Song.findAll({
    where: {
      [Op.or]: [
        { title: searchFilter },
        { artist: searchFilter },
        { language: searchFilter }
      ]
    },
    include: [{ model: Album, as: 'album' }]
  });

  const albums = await Album.findAll({
    where: {
      [Op.or]: [
        { name: searchFilter },
        { artist: searchFilter }
      ]
    },
    include: [{ model: Song, as: 'songs' }]
  });

  res.json({ songs, albums });
});

// FAVORITES
app.get("/api/favorites", requireLogin, async (req, res) => {
  try {
    const user = await User.findByPk(req.session.user.id, {
      include: [{
        model: Song,
        as: 'favorites',
        include: [{ model: Album, as: 'album' }],
        through: { attributes: [] }
      }]
    });
    res.json({ favorites: user ? user.favorites : [] });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch favorites" });
  }
});

app.get("/api/favorites/check/:id", requireLogin, async (req, res) => {
  try {
    const user = await User.findByPk(req.session.user.id);
    const hasFavorite = await user.hasFavorite(req.params.id);
    res.json({ isFavorite: hasFavorite });
  } catch (err) {
    res.json({ isFavorite: false });
  }
});

app.post("/api/favorites/add/:id", requireLogin, async (req, res) => {
  try {
    const user = await User.findByPk(req.session.user.id);
    await user.addFavorite(req.params.id);
    res.json({ success: true, message: "Added to favorites" });
  } catch (err) {
    res.status(500).json({ error: "Failed to add favorite" });
  }
});

app.post("/api/favorites/remove/:id", requireLogin, async (req, res) => {
  try {
    const user = await User.findByPk(req.session.user.id);
    await user.removeFavorite(req.params.id);
    res.json({ success: true, message: "Removed from favorites" });
  } catch (err) {
    res.status(500).json({ error: "Failed to remove favorite" });
  }
});

// PUBLIC DATA
app.get("/api/songs", async (req, res) => {
  const { lang } = req.query;
  const where = lang ? { language: lang } : {};
  let songs = await Song.findAll({ where, order: [['createdAt', 'DESC']], include: [{ model: Album, as: 'album' }] });
  songs = songs.sort(() => Math.random() - 0.5);
  res.json({ songs });
});

app.get("/api/home", async (req, res) => {
  const bestHindi = await Song.findAll({ where: { language: 'Hindi' }, order: [['createdAt', 'DESC']], limit: 5, include: [{ model: Album, as: 'album' }] });
  const bestPunjabi = await Song.findAll({ where: { language: 'Punjabi' }, order: [['createdAt', 'DESC']], limit: 5, include: [{ model: Album, as: 'album' }] });
  const bestEnglish = await Song.findAll({ where: { language: 'English' }, order: [['createdAt', 'DESC']], limit: 5, include: [{ model: Album, as: 'album' }] });
  const albums = await Album.findAll({ include: [{ model: Song, as: 'songs' }] });
  res.json({ bestHindi, bestPunjabi, bestEnglish, albums });
});

// PLAYLISTS
app.get("/api/playlists", requireLogin, async (req, res) => {
  const playlists = await Playlist.findAll({ 
    where: { userId: req.session.user.id },
    include: [{ model: Song, as: 'songs' }]
  });
  res.json({ playlists });
});
app.post("/api/playlists", requireLogin, async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "Name required" });
  const playlist = await Playlist.create({ name, userId: req.session.user.id });
  res.json({ success: true, playlist });
});
app.post("/api/playlists/:playlistId/add/:songId", requireLogin, async (req, res) => {
  try {
    const { playlistId, songId } = req.params;
    const playlist = await Playlist.findOne({ where: { id: playlistId, userId: req.session.user.id } });
    if (playlist) {
      await playlist.addSong(songId);
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.post("/api/playlists/:playlistId/remove/:songId", requireLogin, async (req, res) => {
  try {
    const { playlistId, songId } = req.params;
    const playlist = await Playlist.findOne({ where: { id: playlistId, userId: req.session.user.id } });
    if (playlist) {
      await playlist.removeSong(songId);
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.delete("/api/playlists/:playlistId", requireLogin, async (req, res) => {
  try {
    await Playlist.destroy({ where: { id: req.params.playlistId, userId: req.session.user.id } });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// FAVORITES
app.get("/api/favorites", requireLogin, async (req, res) => {
  const user = await User.findByPk(req.session.user.id, {
    include: [{ model: Song, as: 'favorites' }]
  });
  res.json({ favorites: user ? user.favorites : [] });
});
app.post("/api/favorites/add/:songId", requireLogin, async (req, res) => {
  try {
    const user = await User.findByPk(req.session.user.id);
    if (user) {
      await user.addFavorite(req.params.songId);
    }
    const reloadedUser = await User.findByPk(req.session.user.id, { include: [{ model: Song, as: 'favorites' }] });
    res.json({ success: true, favorites: reloadedUser.favorites.map(f => f.id) });
  } catch (e) {
    res.status(500).json({ success: false });
  }
});
app.post("/api/favorites/remove/:songId", requireLogin, async (req, res) => {
  try {
    const user = await User.findByPk(req.session.user.id);
    if (user) {
      await user.removeFavorite(req.params.songId);
    }
    const reloadedUser = await User.findByPk(req.session.user.id, { include: [{ model: Song, as: 'favorites' }] });
    res.json({ success: true, favorites: reloadedUser.favorites.map(f => f.id) });
  } catch (e) {
    res.status(500).json({ success: false });
  }
});

app.post("/api/history/add/:songId", requireLogin, async (req, res) => {
    try {
        await RecentlyPlayed.create({
            userId: req.session.user.id,
            songId: req.params.songId
        });
        res.json({ success: true });
    } catch(e) {
        res.status(500).json({ success: false });
    }
});

// ADMIN
app.get("/api/admin/data", requireAdmin, async (req, res) => {
  const users = await User.findAll();
  const albums = await Album.findAll({ include: [{ model: Song, as: 'songs' }] });
  const allSongs = await Song.findAll({ order: [['createdAt', 'DESC']] });
  res.json({ users, albums, allSongs });
});

app.post("/api/admin/albums", requireAdmin, async (req, res) => {
  try {
    const { name, artist } = req.body;
    let coverPath = null;
    
    if (req.files?.cover) {
      const coverFile = req.files.cover;
      const coverFileName = `${Date.now()}-${coverFile.name}`;
      coverPath = `/uploads/album-covers/${coverFileName}`;
      await coverFile.mv(path.join(albumCoversDir, coverFileName));
    }
    
    const album = await Album.create({ 
      name, 
      artist,
      ...(coverPath && { cover: coverPath })
    });
    
    res.json({ success: true, album });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create album', details: error.message });
  }
});

app.put("/api/admin/albums/:albumId/cover", requireAdmin, async (req, res) => {
  if (!req.files?.cover) {
    return res.status(400).json({ error: "No cover file provided" });
  }
  
  const album = await Album.findByPk(req.params.albumId);
  if (!album) {
    return res.status(404).json({ error: "Album not found" });
  }
  
  if (album.cover) {
    try { fs.unlinkSync(path.join(__dirname, album.cover)); } catch(e){}
  }
  
  const coverFile = req.files.cover;
  const coverFileName = `${Date.now()}-${coverFile.name}`;
  const coverPath = `/uploads/album-covers/${coverFileName}`;
  await coverFile.mv(path.join(albumCoversDir, coverFileName));
  
  await Album.update({ cover: coverPath }, { where: { id: req.params.albumId } });
  const updatedAlbum = await Album.findByPk(req.params.albumId);
  
  res.json({ success: true, album: updatedAlbum });
});
app.delete("/api/admin/albums/:albumId", requireAdmin, async (req, res) => {
  const album = await Album.findByPk(req.params.albumId, { include: [{ model: Song, as: 'songs' }] });
  if (album) {
    if (album.cover) {
      try { fs.unlinkSync(path.join(__dirname, album.cover)); } catch(e){}
    }
    for (const song of album.songs) {
      if (song.file) try { fs.unlinkSync(path.join(__dirname, song.file)); } catch(e){}
      if (song.thumbnail) try { fs.unlinkSync(path.join(__dirname, song.thumbnail)); } catch(e){}
    }
  }
  await Song.destroy({ where: { albumId: req.params.albumId } });
  await Album.destroy({ where: { id: req.params.albumId } });
  res.json({ success: true });
});

app.post("/api/admin/songs", requireAdmin, async (req, res) => {
  const { title, artist, albumId, language } = req.body;
  if (!title || !artist || !req.files?.audio || !req.files?.thumbnail)
    return res.status(400).json({ error: "All fields required" });

  const audioFile = req.files.audio;
  const thumbnailFile = req.files.thumbnail;

  const audioPath = path.join(songsDir, audioFile.name);
  const thumbnailPath = path.join(thumbnailsDir, thumbnailFile.name);

  await audioFile.mv(audioPath);
  await thumbnailFile.mv(thumbnailPath);

  const data = {
    title, artist, language,
    file: "/uploads/songs/" + audioFile.name,
    thumbnail: "/uploads/thumbnails/" + thumbnailFile.name
  };
  if (albumId && albumId !== "none") data.albumId = albumId;
  const song = await Song.create(data);
  res.json({ success: true, song });
});
app.put("/api/admin/songs/:songId", requireAdmin, async (req, res) => {
  const { title, artist, language } = req.body;
  let data = { title, artist, language };

  const old = await Song.findByPk(req.params.songId);
  if (req.files?.audio) {
    await req.files.audio.mv(path.join(songsDir, req.files.audio.name));
    if (old.file) try { fs.unlinkSync(path.join(__dirname, old.file)); } catch(e){}
    data.file = "/uploads/songs/" + req.files.audio.name;
  }
  if (req.files?.thumbnail) {
    await req.files.thumbnail.mv(path.join(thumbnailsDir, req.files.thumbnail.name));
    if (old.thumbnail) try { fs.unlinkSync(path.join(__dirname, old.thumbnail)); } catch(e){}
    data.thumbnail = "/uploads/thumbnails/" + req.files.thumbnail.name;
  }

  await Song.update(data, { where: { id: req.params.songId } });
  const song = await Song.findByPk(req.params.songId);
  res.json({ success: true, song });
});
app.delete("/api/admin/songs/:songId", requireAdmin, async (req, res) => {
  const song = await Song.findByPk(req.params.songId);
  if (song) {
    if (song.file) try { fs.unlinkSync(path.join(__dirname, song.file)); } catch(e){}
    if (song.thumbnail) try { fs.unlinkSync(path.join(__dirname, song.thumbnail)); } catch(e){}
    await Song.destroy({ where: { id: req.params.songId } });
  }
  res.json({ success: true });
});

app.post("/api/admin/albums/:albumId/add/:songId", requireAdmin, async (req, res) => {
  await Song.update({ albumId: req.params.albumId }, { where: { id: req.params.songId } });
  res.json({ success: true });
});
app.post("/api/admin/albums/:albumId/remove/:songId", requireAdmin, async (req, res) => {
  await Song.update({ albumId: null }, { where: { id: req.params.songId } });
  res.json({ success: true });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  res.status(500).json({ error: 'Internal server error', details: err.message });
});

// 404 handler
app.use((req, res) => {
  console.log('404 - Route not found:', req.method, req.url);
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => console.log(`Server API running on port ${PORT}`));
