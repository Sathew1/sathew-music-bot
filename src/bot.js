import {
  Client,
  GatewayIntentBits
} from "discord.js";

import {
  joinVoiceChannel,
  entersState,
  VoiceConnectionStatus
} from "@discordjs/voice";

import dotenv from "dotenv";

import { MusicPlayer } from "./player.js";
import {
  searchYouTube,
  getPlaylist
} from "./search.js";

dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const player = new MusicPlayer();

client.once("ready", () => {
  console.log("========================================");
  console.log(`🤖 Sathew Music Bot conectado como ${client.user.tag}`);
  console.log("🎵 Sistema de música listo.");
  console.log("========================================");
});

client.on("messageCreate", async (msg) => {
  try {
    /*
     * Ignorar otros bots.
     */
    if (msg.author.bot) return;

    const content = msg.content.trim();

    /*
     * PLAY
     */
    if (content.startsWith(".play")) {
      const query = content
        .replace(".play", "")
        .trim();

      if (!query) {
        return msg.reply(
          "❌ Debes escribir un nombre de canción o una URL."
        );
      }

      const voiceChannel = msg.member?.voice?.channel;

      if (!voiceChannel) {
        return msg.reply(
          "❌ Debes estar en un canal de voz."
        );
      }

      /*
       * Conectar al canal de voz.
       */
      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: msg.guild.id,
        adapterCreator: msg.guild.voiceAdapterCreator
      });

      try {
        /*
         * Esperar a que Discord confirme
         * que la conexión está realmente lista.
         */
        await entersState(
          connection,
          VoiceConnectionStatus.Ready,
          15_000
        );

        console.log(
          `🔊 Conectado al canal de voz: ${voiceChannel.name}`
        );
      } catch (error) {
        console.error(
          "❌ La conexión de voz no llegó a Ready:"
        );

        console.error(error);

        connection.destroy();

        return msg.reply(
          "❌ No pude establecer la conexión de voz con Discord."
        );
      }

      /*
       * PLAYLIST
       */
      if (
        query.includes("playlist") ||
        query.includes("list=")
      ) {
        const playlist = await getPlaylist(query);

        if (!playlist || playlist.length === 0) {
          return msg.reply(
            "❌ No pude leer la playlist."
          );
        }

        for (const item of playlist) {
          await player.addToQueue(
            item.url,
            connection,
            item.title
          );
        }

        return msg.reply(
          `🎶 Playlist agregada: **${playlist.length} canciones**.`
        );
      }

      /*
       * URL DIRECTA
       */
      if (query.startsWith("http")) {
        try {
          await player.addToQueue(
            query,
            connection,
            "Canción desde URL"
          );

          return msg.reply(
            "🎵 Canción agregada a la cola."
          );
        } catch (error) {
          console.error(
            "❌ Error reproduciendo URL:"
          );

          console.error(error);

          return msg.reply(
            "❌ No pude reproducir esa URL."
          );
        }
      }

      /*
       * BÚSQUEDA EN YOUTUBE
       */
      const result = await searchYouTube(query);

      if (!result) {
        return msg.reply(
          "❌ No encontré nada en YouTube."
        );
      }

      try {
        await player.addToQueue(
          result.url,
          connection,
          result.title
        );

        return msg.reply(
          `🎵 **${result.title}** agregada a la cola.`
        );
      } catch (error) {
        console.error(
          "❌ Error reproduciendo canción:"
        );

        console.error(error);

        return msg.reply(
          "❌ Encontré la canción, pero no pude iniciar la reproducción."
        );
      }
    }

    /*
     * SKIP
     */
    if (content === ".skip") {
      if (player.skip()) {
        return msg.reply(
          "⏭️ Canción saltada."
        );
      }

      return msg.reply(
        "❌ No hay otra canción en la cola."
      );
    }

    /*
     * PAUSE
     */
    if (content === ".pause") {
      const paused = player.pause();

      if (paused) {
        return msg.reply(
          "⏸️ Música pausada."
        );
      }

      return msg.reply(
        "❌ No hay música reproduciéndose."
      );
    }

    /*
     * RESUME
     */
    if (content === ".resume") {
      const resumed = player.resume();

      if (resumed) {
        return msg.reply(
          "▶️ Música reanudada."
        );
      }

      return msg.reply(
        "❌ No hay música pausada."
      );
    }

    /*
     * QUEUE
     */
    if (content === ".queue") {
      const queue = player.getQueue();

      if (queue.length === 0) {
        return msg.reply(
          "🎵 La cola está vacía."
        );
      }

      return msg.reply(
        "🎶 **Cola actual:**\n" +
        queue.join("\n")
      );
    }

  } catch (error) {
    console.error(
      "❌ Error procesando comando:"
    );

    console.error(error);

    try {
      await msg.reply(
        "❌ Ocurrió un error procesando el comando."
      );
    } catch {
      // No se pudo responder al mensaje.
    }
  }
});

client.login(process.env.DISCORD_TOKEN);N);
