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

import pkg from '@prisma/client';
const { PrismaClient } = pkg;
import { encrypt, decrypt } from "./utils/encryption.js";
import { SQLizerFile } from "sqlizer-client";

const prisma = new PrismaClient();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadsDir = path.join(__dirname, "uploads");
const songsDir = path.join(uploadsDir, "songs");
const thumbnailsDir = path.join(uploadsDir, "thumbnails");
[songsDir, thumbnailsDir].forEach(dir => {
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
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const PgSessionStore = pgSession(session);
const pgPool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

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
    const user = await prisma.user.findUnique({
      where: { id: req.session.user.id },
      include: { recentlyPlayed: { include: { song: true }, orderBy: { playedAt: 'desc' }, take: 12 } }
    });
    res.json({ user, isAdmin: false });
  } else {
    res.json({ user: null });
  }
});

// AUTH
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
    req.session.admin = true;
    req.session.user = { id: "0", username: 'Admin', email: process.env.ADMIN_EMAIL, isAdmin: true };
    return req.session.save(() => res.json({ success: true, user: req.session.user }));
  }

  const user = await prisma.user.findUnique({ where: { email } });
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
    const existing = await prisma.user.findFirst({ where: { OR: [{ email }, { username }] } });
    if (existing) return res.status(400).json({ error: "Email or username already used" });

    const encryptedPassword = encrypt(password);
    const user = await prisma.user.create({
      data: { username, email, password: encryptedPassword }
    });
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
    const existing = await prisma.user.findFirst({ where: { username, NOT: { id: req.session.user.id } } });
    if (existing) return res.status(400).json({ error: "Username already taken" });

    await prisma.user.update({ where: { id: req.session.user.id }, data: { username } });
    req.session.user.username = username;
    res.json({ success: true, user: req.session.user });
  } catch (err) {
    res.status(500).json({ error: "Failed to update" });
  }
});
app.post("/api/dashboard/update-password", requireLogin, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { id: req.session.user.id } });
    const decrypted = decrypt(user.password);
    if (decrypted !== currentPassword) return res.status(400).json({ error: "Current password incorrect" });

    const encryptedPassword = encrypt(newPassword);
    await prisma.user.update({ where: { id: req.session.user.id }, data: { password: encryptedPassword } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to update" });
  }
});

app.get("/api/search", async (req, res) => {
  const { q } = req.query;
  if (!q) return res.json({ songs: [], albums: [] });

  const searchFilter = { contains: q, mode: 'insensitive' };
  
  const songs = await prisma.song.findMany({
    where: {
      OR: [
        { title: searchFilter },
        { artist: searchFilter },
        { language: searchFilter }
      ]
    },
    include: { album: true }
  });

  const albums = await prisma.album.findMany({
    where: {
      OR: [
        { name: searchFilter },
        { artist: searchFilter }
      ]
    },
    include: { songs: true }
  });

  res.json({ songs, albums });
});

// PUBLIC DATA
app.get("/api/songs", async (req, res) => {
  const { lang } = req.query;
  const where = lang ? { language: lang } : {};
  let songs = await prisma.song.findMany({ where, orderBy: { createdAt: 'desc' }, include: { album: true } });
  // Shuffle songs
  songs = songs.sort(() => Math.random() - 0.5);
  res.json({ songs });
});

app.get("/api/home", async (req, res) => {
  const bestHindi = await prisma.song.findMany({ where: { language: 'Hindi' }, orderBy: { createdAt: 'desc' }, take: 5, include: { album: true } });
  const bestPunjabi = await prisma.song.findMany({ where: { language: 'Punjabi' }, orderBy: { createdAt: 'desc' }, take: 5, include: { album: true } });
  const bestEnglish = await prisma.song.findMany({ where: { language: 'English' }, orderBy: { createdAt: 'desc' }, take: 5, include: { album: true } });
  const albums = await prisma.album.findMany({ include: { songs: true } });
  res.json({ bestHindi, bestPunjabi, bestEnglish, albums });
});

// PLAYLISTS
app.get("/api/playlists", requireLogin, async (req, res) => {
  const playlists = await prisma.playlist.findMany({ 
    where: { userId: req.session.user.id },
    include: { songs: true }
  });
  res.json({ playlists });
});
app.post("/api/playlists", requireLogin, async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "Name required" });
  const playlist = await prisma.playlist.create({
    data: { name, userId: req.session.user.id }
  });
  res.json({ success: true, playlist });
});
app.post("/api/playlists/:playlistId/add/:songId", requireLogin, async (req, res) => {
  try {
    const { playlistId, songId } = req.params;
    await prisma.playlist.update({
      where: { id: playlistId, userId: req.session.user.id },
      data: { songs: { connect: { id: songId } } }
    });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.post("/api/playlists/:playlistId/remove/:songId", requireLogin, async (req, res) => {
  try {
    const { playlistId, songId } = req.params;
    await prisma.playlist.update({
      where: { id: playlistId, userId: req.session.user.id },
      data: { songs: { disconnect: { id: songId } } }
    });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.delete("/api/playlists/:playlistId", requireLogin, async (req, res) => {
  try {
    await prisma.playlist.delete({ where: { id: req.params.playlistId, userId: req.session.user.id } });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// FAVORITES
app.get("/api/favorites", requireLogin, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.session.user.id },
    include: { favorites: true }
  });
  res.json({ favorites: user.favorites });
});
app.post("/api/favorites/add/:songId", requireLogin, async (req, res) => {
  try {
    await prisma.user.update({
      where: { id: req.session.user.id },
      data: { favorites: { connect: { id: req.params.songId } } }
    });
    const user = await prisma.user.findUnique({ where: { id: req.session.user.id }, include: { favorites: true } });
    res.json({ success: true, favorites: user.favorites.map(f => f.id) });
  } catch (e) {
    res.status(500).json({ success: false });
  }
});
app.post("/api/favorites/remove/:songId", requireLogin, async (req, res) => {
  try {
    await prisma.user.update({
      where: { id: req.session.user.id },
      data: { favorites: { disconnect: { id: req.params.songId } } }
    });
    const user = await prisma.user.findUnique({ where: { id: req.session.user.id }, include: { favorites: true } });
    res.json({ success: true, favorites: user.favorites.map(f => f.id) });
  } catch (e) {
    res.status(500).json({ success: false });
  }
});

app.post("/api/history/add/:songId", requireLogin, async (req, res) => {
    try {
        await prisma.recentlyPlayed.create({
            data: {
                userId: req.session.user.id,
                songId: req.params.songId
            }
        });
        res.json({ success: true });
    } catch(e) {
        res.status(500).json({ success: false });
    }
});

// ADMIN
app.get("/api/admin/data", requireAdmin, async (req, res) => {
  const users = await prisma.user.findMany();
  const albums = await prisma.album.findMany({ include: { songs: true } });
  const allSongs = await prisma.song.findMany({ orderBy: { createdAt: 'desc' } });
  res.json({ users, albums, allSongs });
});

app.post("/api/admin/albums", requireAdmin, async (req, res) => {
  const { name, artist } = req.body;
  const album = await prisma.album.create({ data: { name, artist } });
  res.json({ success: true, album });
});
app.delete("/api/admin/albums/:albumId", requireAdmin, async (req, res) => {
  const album = await prisma.album.findUnique({ where: { id: req.params.albumId }, include: { songs: true } });
  if (album) {
    for (const song of album.songs) {
      if (song.file) try { fs.unlinkSync(path.join(__dirname, song.file)); } catch(e){}
      if (song.thumbnail) try { fs.unlinkSync(path.join(__dirname, song.thumbnail)); } catch(e){}
    }
  }
  await prisma.song.deleteMany({ where: { albumId: req.params.albumId } });
  await prisma.album.delete({ where: { id: req.params.albumId } });
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
  const song = await prisma.song.create({ data });
  res.json({ success: true, song });
});
app.put("/api/admin/songs/:songId", requireAdmin, async (req, res) => {
  const { title, artist, language } = req.body;
  let data = { title, artist, language };

  const old = await prisma.song.findUnique({ where: { id: req.params.songId } });
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

  const song = await prisma.song.update({ where: { id: req.params.songId }, data });
  res.json({ success: true, song });
});
app.delete("/api/admin/songs/:songId", requireAdmin, async (req, res) => {
  const song = await prisma.song.findUnique({ where: { id: req.params.songId } });
  if (song) {
    if (song.file) try { fs.unlinkSync(path.join(__dirname, song.file)); } catch(e){}
    if (song.thumbnail) try { fs.unlinkSync(path.join(__dirname, song.thumbnail)); } catch(e){}
    await prisma.song.delete({ where: { id: req.params.songId } });
  }
  res.json({ success: true });
});

app.post("/api/admin/albums/:albumId/add/:songId", requireAdmin, async (req, res) => {
  await prisma.song.update({
    where: { id: req.params.songId },
    data: { albumId: req.params.albumId }
  });
  res.json({ success: true });
});
app.post("/api/admin/albums/:albumId/remove/:songId", requireAdmin, async (req, res) => {
  await prisma.song.update({
    where: { id: req.params.songId },
    data: { albumId: null }
  });
  res.json({ success: true });
});

// SQLIZER BULK IMPORT
app.post("/api/admin/sqlizer-import", requireAdmin, async (req, res) => {
  if (!req.files || !req.files.file) return res.status(400).json({ error: "No file provided" });
  const file = req.files.file;
  const tempPath = path.join(__dirname, "uploads", file.name);
  await file.mv(tempPath);

  try {
    // SQLizer configuration
    const sqlizer = new SQLizerFile({
      ApiKey: process.env.SQLIZER_API_KEY || "dummy_key",
      File: tempPath,
      FileType: file.name.endsWith('.json') ? 'JSON' : 'CSV',
      DatabaseType: 'PostgreSQL',
      TableName: 'Song', // Default
    });

    const sqlUrl = await sqlizer.convert();
    console.log("SQLizer converted file URL:", sqlUrl);

    // cleanup
    fs.unlinkSync(tempPath);

    res.json({ success: true, message: "Started SQLizer conversion", url: sqlUrl });
  } catch (err) {
    res.status(500).json({ error: "Failed SQLizer import", details: err.message });
  }
});

app.listen(PORT, () => console.log(`Server API running on port ${PORT}`));
