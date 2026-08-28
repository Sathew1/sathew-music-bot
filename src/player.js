import {
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  NoSubscriberBehavior,
  StreamType
} from "@discordjs/voice";

import ytdlp from "yt-dlp-exec";
import { spawn } from "child_process";

export class MusicPlayer {
  constructor() {
    this.queue = [];
    this.player = createAudioPlayer({
      behaviors: {
        noSubscriber: NoSubscriberBehavior.Pause
      }
    });

    this.connection = null;
    this.currentProcess = null;
    this.currentTitle = null;
    this.currentUrl = null;

    this.player.on(AudioPlayerStatus.Playing, () => {
      console.log(`▶️ Reproduciendo: ${this.currentTitle || this.currentUrl}`);
    });

    this.player.on(AudioPlayerStatus.Idle, () => {
      console.log("⏹️ Reproductor en estado Idle.");

      this.cleanupProcesses();

      if (this.queue.length > 0) {
        this.queue.shift();
      }

      if (this.queue.length > 0) {
        const next = this.queue[0];

        this.play(next.url, this.connection, next.title).catch((error) => {
          console.error("❌ Error reproduciendo siguiente canción:");
          console.error(error);
        });
      } else {
        console.log("🎵 Cola terminada. Desconectando.");

        this.currentTitle = null;
        this.currentUrl = null;

        if (this.connection) {
          this.connection.destroy();
          this.connection = null;
        }
      }
    });

    this.player.on("error", (error) => {
      console.error("❌ Error del AudioPlayer:");
      console.error(error);
    });
  }

  async play(url, connection, title = null) {
    this.connection = connection;
    this.currentUrl = url;
    this.currentTitle = title || "Canción desconocida";

    console.log("========================================");
    console.log("🎵 Iniciando reproducción");
    console.log(`Título: ${this.currentTitle}`);
    console.log(`URL: ${url}`);
    console.log("========================================");

    this.cleanupProcesses();

    try {
      /*
       * yt-dlp obtiene solamente el audio.
       *
       * La salida se manda por stdout.
       */
      const ytdlpProcess = ytdlp(url, {
        output: "-",
        format: "bestaudio/best",
        noWarnings: true,
        noCheckCertificates: true,
        preferFreeFormats: true,
        quiet: true
      });

      this.currentYtdlpProcess = ytdlpProcess;

      ytdlpProcess.stderr?.on("data", (data) => {
        const message = data.toString().trim();

        if (message) {
          console.log(`yt-dlp: ${message}`);
        }
      });

      ytdlpProcess.on("error", (error) => {
        console.error("❌ Error ejecutando yt-dlp:");
        console.error(error);
      });

      /*
       * ffmpeg convierte el audio a PCM crudo:
       *
       * 48 kHz
       * 2 canales
       * signed 16-bit little endian
       *
       * Este formato es ideal para Discord Voice.
       */
      const ffmpeg = spawn(
        "ffmpeg",
        [
          "-hide_banner",
          "-loglevel",
          "error",

          "-i",
          "pipe:0",

          "-f",
          "s16le",
          "-ar",
          "48000",
          "-ac",
          "2",

          "pipe:1"
        ],
        {
          stdio: ["pipe", "pipe", "pipe"]
        }
      );

      this.currentFfmpegProcess = ffmpeg;

      ffmpeg.stderr.on("data", (data) => {
        const message = data.toString().trim();

        if (message) {
          console.error(`ffmpeg: ${message}`);
        }
      });

      ffmpeg.on("error", (error) => {
        console.error("❌ Error ejecutando ffmpeg:");
        console.error(error);
      });

      ffmpeg.on("close", (code) => {
        console.log(`ffmpeg finalizó con código ${code}`);
      });

      /*
       * yt-dlp → ffmpeg
       */
      ytdlpProcess.stdout.pipe(ffmpeg.stdin);

      /*
       * ffmpeg → Discord Voice
       */
      const resource = createAudioResource(ffmpeg.stdout, {
        inputType: StreamType.Raw
      });

      /*
       * Suscribir el reproductor a la conexión.
       */
      connection.subscribe(this.player);

      /*
       * Comenzar reproducción.
       */
      this.player.play(resource);

      console.log("🎧 Audio enviado al AudioPlayer.");
    } catch (error) {
      console.error("❌ Error iniciando reproducción:");
      console.error(error);

      this.cleanupProcesses();

      throw error;
    }
  }

  addToQueue(url, connection, title = null) {
    const wasEmpty = this.queue.length === 0;

    this.queue.push({
      url,
      title: title || "Canción desconocida"
    });

    console.log(
      `➕ Agregada a la cola: ${title || url}`
    );

    console.log(`📋 Canciones en cola: ${this.queue.length}`);

    if (wasEmpty) {
      return this.play(
        this.queue[0].url,
        connection,
        this.queue[0].title
      );
    }

    return Promise.resolve();
  }

  skip() {
    if (this.queue.length > 1) {
      console.log("⏭️ Saltando canción.");

      this.cleanupProcesses();
      this.player.stop();

      return true;
    }

    return false;
  }

  pause() {
    console.log("⏸️ Pausando reproducción.");
    return this.player.pause();
  }

  resume() {
    console.log("▶️ Reanudando reproducción.");
    return this.player.unpause();
  }

  getQueue() {
    return this.queue.map((item, index) => {
      return `${index + 1}. ${item.title}`;
    });
  }

  getCurrentSong() {
    return this.currentTitle;
  }

  cleanupProcesses() {
    if (this.currentYtdlpProcess) {
      try {
        this.currentYtdlpProcess.kill("SIGKILL");
      } catch {
        // El proceso ya puede haber terminado.
      }

      this.currentYtdlpProcess = null;
    }

    if (this.currentFfmpegProcess) {
      try {
        this.currentFfmpegProcess.kill("SIGKILL");
      } catch {
        // El proceso ya puede haber terminado.
      }

      this.currentFfmpegProcess = null;
    }
  }
}
