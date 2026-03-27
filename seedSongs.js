import dotenv from "dotenv";
dotenv.config();
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const sampleSongs = [
  { title: "Chill Vibes", artist: "Bensound", file: "https://www.bensound.com/bensound-music/bensound-slowmotion.mp3", thumbnail: "https://www.bensound.com/bensound-img/slowmotion.jpg" },
  { title: "Acoustic Breeze", artist: "Bensound", file: "https://www.bensound.com/bensound-music/bensound-acousticbreeze.mp3", thumbnail: "https://www.bensound.com/bensound-img/acousticbreeze.jpg" },
  { title: "Summer Days", artist: "Bensound", file: "https://www.bensound.com/bensound-music/bensound-summer.mp3", thumbnail: "https://www.bensound.com/bensound-img/summer.jpg" },
  { title: "Sunny Morning", artist: "Bensound", file: "https://www.bensound.com/bensound-music/bensound-sunny.mp3", thumbnail: "https://www.bensound.com/bensound-img/sunny.jpg" },
  { title: "Creative Minds", artist: "Bensound", file: "https://www.bensound.com/bensound-music/bensound-creativeminds.mp3", thumbnail: "https://www.bensound.com/bensound-img/creativeminds.jpg" },
  { title: "Dreams", artist: "Bensound", file: "https://www.bensound.com/bensound-music/bensound-dreams.mp3", thumbnail: "https://www.bensound.com/bensound-img/dreams.jpg" },
  { title: "Energy", artist: "Bensound", file: "https://www.bensound.com/bensound-music/bensound-energy.mp3", thumbnail: "https://www.bensound.com/bensound-img/energy.jpg" },
  { title: "Happiness", artist: "Bensound", file: "https://www.bensound.com/bensound-music/bensound-happiness.mp3", thumbnail: "https://www.bensound.com/bensound-img/happiness.jpg" },
  { title: "Hip Jazz", artist: "Bensound", file: "https://www.bensound.com/bensound-music/bensound-hipjazz.mp3", thumbnail: "https://www.bensound.com/bensound-img/hipjazz.jpg" },
  { title: "Inspiring", artist: "Bensound", file: "https://www.bensound.com/bensound-music/bensound-inspiring.mp3", thumbnail: "https://www.bensound.com/bensound-img/inspiring.jpg" },
  { title: "Jazz Comedy", artist: "Bensound", file: "https://www.bensound.com/bensound-music/bensound-jazzcomedy.mp3", thumbnail: "https://www.bensound.com/bensound-img/jazzcomedy.jpg" },
  { title: "Little Idea", artist: "Bensound", file: "https://www.bensound.com/bensound-music/bensound-littleidea.mp3", thumbnail: "https://www.bensound.com/bensound-img/littleidea.jpg" },
  { title: "Memories", artist: "Bensound", file: "https://www.bensound.com/bensound-music/bensound-memories.mp3", thumbnail: "https://www.bensound.com/bensound-img/memories.jpg" },
  { title: "Retro Soul", artist: "Bensound", file: "https://www.bensound.com/bensound-music/bensound-retrosoul.mp3", thumbnail: "https://www.bensound.com/bensound-img/retrosoul.jpg" },
  { title: "Romantic", artist: "Bensound", file: "https://www.bensound.com/bensound-music/bensound-romantic.mp3", thumbnail: "https://www.bensound.com/bensound-img/romantic.jpg" },
  { title: "Tenderness", artist: "Bensound", file: "https://www.bensound.com/bensound-music/bensound-tenderness.mp3", thumbnail: "https://www.bensound.com/bensound-img/tenderness.jpg" },
  { title: "The Lounge", artist: "Bensound", file: "https://www.bensound.com/bensound-music/bensound-thelounge.mp3", thumbnail: "https://www.bensound.com/bensound-img/thelounge.jpg" },
  { title: "Ukulele", artist: "Bensound", file: "https://www.bensound.com/bensound-music/bensound-ukulele.mp3", thumbnail: "https://www.bensound.com/bensound-img/ukulele.jpg" },
  { title: "Once Again", artist: "Bensound", file: "https://www.bensound.com/bensound-music/bensound-onceagain.mp3", thumbnail: "https://www.bensound.com/bensound-img/onceagain.jpg" },
  { title: "Better Days", artist: "Bensound", file: "https://www.bensound.com/bensound-music/bensound-betterdays.mp3", thumbnail: "https://www.bensound.com/bensound-img/betterdays.jpg" }
];

async function seedSongs() {
  try {
    await prisma.song.deleteMany({});
    let imported = 0;
    
    for (const track of sampleSongs) {
      try {
        await prisma.song.create({
          data: {
            title: track.title,
            artist: track.artist,
            file: track.file,
            thumbnail: track.thumbnail,
            language: "Other"
          }
        });
        imported++;
      } catch (err) {
        console.error(`  ❌ Error adding ${track.title}:`, err.message);
      }
    }

    console.log(`✅ Successfully seeded ${imported} songs into PostgreSQL!`);
    await prisma.$disconnect();
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

seedSongs();
