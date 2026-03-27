import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const localSongs = [
  {
    title: "For A Reason",
    artist: "Karan Aujla",
    file: "http://localhost:5000/uploads/songs/For-A-Reason-Mp3-Song-by-Karan-Aujla(PagalWorldi.com.co).mp3",
    thumbnail: "http://localhost:5000/uploads/thumbnails/For-A-Reason.webp",
    language: "Punjabi"
  },
  {
    title: "Gulabi Aankhen",
    artist: "Sanam",
    file: "http://localhost:5000/uploads/songs/Gulabi Aankhen _ Sanam(KoshalWorld.Com).mp3",
    thumbnail: "http://localhost:5000/uploads/thumbnails/download+(1).jpg",
    language: "Hindi"
  },
  {
    title: "Haseen",
    artist: "Talwiinder",
    file: "http://localhost:5000/uploads/songs/Haseen-Mp3-Song-by-Talwiinder(PagalWorldi.com.co).mp3",
    thumbnail: "http://localhost:5000/uploads/thumbnails/Haseen.webp",
    language: "Punjabi"
  },
  {
    title: "Ishq Jalakar",
    artist: "Irshad Kamil",
    file: "http://localhost:5000/uploads/songs/Ishq-Jalakar-Mp3-Song-by-Irshad-Kamil(PagalWorldi.com.co).mp3",
    thumbnail: "http://localhost:5000/uploads/thumbnails/Ishq-Jalakar.webp",
    language: "Hindi"
  },
  {
    title: "Pal Pal",
    artist: "Afusic",
    file: "http://localhost:5000/uploads/songs/Pal-Pal-Mp3-Song-by-Afusic(PagalWorldi.com.co).mp3",
    thumbnail: "http://localhost:5000/uploads/thumbnails/palpal.webp",
    language: "Hindi"
  },
  {
    title: "Yes or No",
    artist: "Jass Manak",
    file: "http://localhost:5000/uploads/songs/Yes-or-No-Mp3-Song-by-Jass-Manak(PagalWorldi.com.co).mp3",
    thumbnail: "http://localhost:5000/uploads/thumbnails/Yes-or-No.webp",
    language: "Punjabi"
  },
  {
    title: "My Recording",
    artist: "Unknown",
    file: "http://localhost:5000/uploads/songs/20-05-2025 02.54 pm.m4a",
    thumbnail: "http://localhost:5000/uploads/thumbnails/wp9178555-demon-slayer-4k-desktop-wallpapers.jpg",
    language: "Other"
  },
  {
    title: "Track 1",
    artist: "Unknown",
    file: "http://localhost:5000/uploads/songs/song1.mp3",
    thumbnail: "http://localhost:5000/uploads/thumbnails/song1.jpg",
    language: "Other"
  }
];

async function seed() {
  try {
    await prisma.song.deleteMany({}); // Delete placeholders
    let imported = 0;
    for(const track of localSongs) {
      await prisma.song.create({
        data: {
          title: track.title,
          artist: track.artist,
          file: track.file,
          thumbnail: track.thumbnail, // If it doesn't exist, browser will fall back, but we can set default later
          language: track.language
        }
      });
      imported++;
    }
    console.log(`✅ Successfully seeded ${imported} original local tracks!`);
    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  }
}
seed();
