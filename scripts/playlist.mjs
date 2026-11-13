// Saves the music island's playlist (data/site.ts → music.playlist) as data/playlist.json:
// every song's Spotify URI, title, artist, length and cover. Re-run after changing the playlist:
//   node scripts/playlist.mjs
// Titles/artists come from the playlist's public Spotify embed page; covers from Spotify's oEmbed.
import { readFileSync, writeFileSync } from "node:fs";

const id = readFileSync("data/site.ts", "utf8").match(/playlist:\s*"([A-Za-z0-9]+)"/)?.[1];
if (!id) throw new Error("no music.playlist id in data/site.ts");

const html = await (await fetch(`https://open.spotify.com/embed/playlist/${id}`)).text();
const json = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)?.[1];
if (!json) throw new Error("Spotify's embed page changed: no __NEXT_DATA__");
const entity = JSON.parse(json).props.pageProps.state.data.entity;

const coverOf = async (uri) => {
  const r = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(uri)}`);
  return r.ok ? (await r.json()).thumbnail_url : null;
};

const tracks = [];
for (const t of entity.trackList.filter((t) => t.isPlayable && t.uri?.startsWith("spotify:track:"))) {
  tracks.push({ uri: t.uri, title: t.title, artist: t.subtitle, ms: t.duration, cover: await coverOf(t.uri) });
}

writeFileSync("data/playlist.json", JSON.stringify({ id, title: entity.name ?? entity.title, tracks }, null, 2) + "\n");
console.log(`data/playlist.json: "${entity.name ?? entity.title}", ${tracks.length} songs, ${tracks.filter((t) => t.cover).length} covers`);
