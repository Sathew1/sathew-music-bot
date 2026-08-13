import {
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
} from "@discordjs/voice";
import ytdlp from "yt-dlp-exec";

export class MusicPlayer {
  constructor() {
    this.queue = [];
    this.player = createAudioPlayer();
    this.connection = null;

    this.player.on(AudioPlayerStatus.Idle, () => {
      this.queue.shift();
      if (this.queue.length > 0) {
        this.play(this.queue[0].url, this.connection);
      } else {
        this.connection?.destroy();
      }
    });
  }

  async play(url, connection) {
    this.connection = connection;

    const stream = ytdlp(url, {
      output: "-",
      format: "bestaudio",
    });

    const resource = createAudioResource(stream.stdout);
    this.player.play(resource);
    connection.subscribe(this.player);
  }

  addToQueue(url, connection) {
    this.queue.push({ url });
    if (this.queue.length === 1) {
      this.play(url, connection);
    }
  }

  skip() {
    if (this.queue.length > 1) {
      this.player.stop();
      return true;
    }
    return false;
  }

  pause() {
    return this.player.pause();
  }

  resume() {
    return this.player.unpause();
  }

  getQueue() {
    return this.queue.map((item, i) => `${i + 1}. ${item.url}`);
  }
}
