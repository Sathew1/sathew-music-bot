import { Client, GatewayIntentBits } from "discord.js";
import { joinVoiceChannel } from "@discordjs/voice";
import dotenv from "dotenv";
import { MusicPlayer } from "./player.js";
import { searchYouTube, getPlaylist } from "./search.js";

dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const player = new MusicPlayer();

client.on("messageCreate", async (msg) => {
  const content = msg.content;

  // PLAY
  if (content.startsWith(".play")) {
    const query = content.replace(".play", "").trim();
    if (!query) return msg.reply("Debes escribir un nombre o URL.");

    const voiceChannel = msg.member.voice.channel;
    if (!voiceChannel) return msg.reply("Debes estar en un canal de voz.");

    const connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: msg.guild.id,
      adapterCreator: msg.guild.voiceAdapterCreator,
    });

    // Playlist
    if (query.includes("playlist") || query.includes("list=")) {
      const urls = await getPlaylist(query);
      if (!urls) return msg.reply("No pude leer la playlist.");

      urls.forEach((url) => player.addToQueue(url, connection));
      return msg.reply(`Playlist agregada: ${urls.length} canciones 🎶`);
    }

    // URL directa
    if (query.startsWith("http")) {
      player.addToQueue(query, connection);
      return msg.reply("Canción agregada 🎵");
    }

    // Búsqueda en YouTube
    const url = await searchYouTube(query);
    if (!url) return msg.reply("No encontré nada en YouTube.");

    player.addToQueue(url, connection);
    return msg.reply(`Agregada: ${query}`);
  }

  // SKIP
  if (content === ".skip") {
    if (player.skip()) msg.reply("⏭ Canción saltada.");
    else msg.reply("No hay más canciones en la cola.");
  }

  // PAUSE
  if (content === ".pause") {
    player.pause();
    msg.reply("⏸ Música pausada.");
  }

  // RESUME
  if (content === ".resume") {
    player.resume();
    msg.reply("▶ Música reanudada.");
  }

  // QUEUE
  if (content === ".queue") {
    const q = player.getQueue();
    if (q.length === 0) return msg.reply("La cola está vacía.");
    msg.reply("🎶 **Cola actual:**\n" + q.join("\n"));
  }
});

client.login(process.env.DISCORD_TOKEN);
