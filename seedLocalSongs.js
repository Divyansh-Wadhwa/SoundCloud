import dotenv from "dotenv";
dotenv.config();
import db from "./models/index.js";
const { Song, sequelize } = db;

const localSongs = [
  {
    title: "For A Reason",
    artist: "Karan Aujla",
    file: "/uploads/songs/For-A-Reason-Mp3-Song-by-Karan-Aujla(PagalWorldi.com.co).mp3",
    thumbnail: "/uploads/thumbnails/For-A-Reason.webp",
    language: "Punjabi"
  },
  {
    title: "Gulabi Aankhen",
    artist: "Sanam",
    file: "/uploads/songs/Gulabi Aankhen _ Sanam(KoshalWorld.Com).mp3",
    thumbnail: "/uploads/thumbnails/download (1).jpg",
    language: "Hindi"
  },
  {
    title: "Haseen",
    artist: "Talwiinder",
    file: "/uploads/songs/Haseen-Mp3-Song-by-Talwiinder(PagalWorldi.com.co).mp3",
    thumbnail: "/uploads/thumbnails/Haseen.webp",
    language: "Punjabi"
  },
  {
    title: "Ishq Jalakar",
    artist: "Irshad Kamil",
    file: "/uploads/songs/Ishq-Jalakar-Mp3-Song-by-Irshad-Kamil(PagalWorldi.com.co).mp3",
    thumbnail: "/uploads/thumbnails/Ishq-Jalakar.webp",
    language: "Hindi"
  },
  {
    title: "Pal Pal",
    artist: "Afusic",
    file: "/uploads/songs/Pal-Pal-Mp3-Song-by-Afusic(PagalWorldi.com.co).mp3",
    thumbnail: "/uploads/thumbnails/palpal.webp",
    language: "Hindi"
  },
  {
    title: "Yes or No",
    artist: "Jass Manak",
    file: "/uploads/songs/Yes-or-No-Mp3-Song-by-Jass-Manak(PagalWorldi.com.co).mp3",
    thumbnail: "/uploads/thumbnails/Yes-or-No.webp",
    language: "Punjabi"
  },
  {
    title: "My Recording",
    artist: "Unknown",
    file: "/uploads/songs/20-05-2025 02.54 pm.m4a",
    thumbnail: "/uploads/thumbnails/wp9178555-demon-slayer-4k-desktop-wallpapers.jpg",
    language: "Other"
  },
  {
    title: "Track 1",
    artist: "Unknown",
    file: "/uploads/songs/song1.mp3",
    thumbnail: "/uploads/thumbnails/song1.jpg",
    language: "Other"
  }
];

async function seed() {
  try {
    await sequelize.authenticate();
    await sequelize.sync();

    let imported = 0;
    for(const track of localSongs) {
      const exists = await Song.findOne({ where: { title: track.title, artist: track.artist } });
      if (!exists) {
        await Song.create({
          title: track.title,
          artist: track.artist,
          file: track.file,
          thumbnail: track.thumbnail,
          language: track.language
        });
        imported++;
      }
    }
    console.log(`✅ Successfully seeded ${imported} original local tracks!`);
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error(error);
    await sequelize.close();
    process.exit(1);
  }
}
seed();
