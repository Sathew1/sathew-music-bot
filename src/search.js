import ytdlp from "yt-dlp-exec";

/**
 * Busca una canción en YouTube.
 * Devuelve información básica de la primera coincidencia.
 */
export async function searchYouTube(query) {
  try {
    const result = await ytdlp(`ytsearch1:${query}`, {
      dumpSingleJson: true,
      noWarnings: true,
      noCheckCertificates: true,
      preferFreeFormats: true,
      skipDownload: true
    });

    if (!result || !result.entries || result.entries.length === 0) {
      return null;
    }

    const video = result.entries[0];

    return {
      url: video.webpage_url || video.original_url || video.url,
      title: video.title || query,
      duration: video.duration || 0,
      thumbnail: video.thumbnail || null
    };
  } catch (error) {
    console.error("❌ Error buscando en YouTube:");
    console.error(error);

    return null;
  }
}

/**
 * Obtiene los videos de una playlist.
 */
export async function getPlaylist(url) {
  try {
    const result = await ytdlp(url, {
      dumpSingleJson: true,
      noWarnings: true,
      noCheckCertificates: true,
      preferFreeFormats: true,
      flatPlaylist: true,
      skipDownload: true
    });

    if (!result || !result.entries) {
      return null;
    }

    return result.entries
      .filter((entry) => entry && (entry.webpage_url || entry.url))
      .map((entry) => ({
        url: entry.webpage_url || entry.url,
        title: entry.title || "Canción desconocida"
      }));
  } catch (error) {
    console.error("❌ Error leyendo playlist:");
    console.error(error);

    return null;
  }
}
