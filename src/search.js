import ytdlp from "yt-dlp-exec";

export async function searchYouTube(query) {
  const result = await ytdlp(`ytsearch:${query}`, {
    dumpSingleJson: true,
    noWarnings: true,
    noCheckCertificates: true,
    preferFreeFormats: true,
  });

  if (!result || !result.entries || result.entries.length === 0) return null;

  return result.entries[0].url;
}

export async function getPlaylist(url) {
  const result = await ytdlp(url, {
    dumpSingleJson: true,
    noWarnings: true,
    noCheckCertificates: true,
    preferFreeFormats: true,
  });

  if (!result || !result.entries) return null;

  return result.entries.map((e) => e.url);
}
