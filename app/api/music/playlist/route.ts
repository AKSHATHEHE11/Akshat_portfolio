import { site } from "@/data/site";
import saved from "@/data/playlist.json";

// The music island's song list, read from the live Spotify playlist and refreshed every hour, so a
// song Akshat adds to (or removes from) the playlist on Spotify shows up on the site by itself.
// Falls back to data/playlist.json (node scripts/playlist.mjs) if Spotify's embed page can't be read.
export const revalidate = 3600;

type Item = { uri?: string; title: string; subtitle: string; duration: number; isPlayable: boolean };

export async function GET() {
  try {
    const html = await (await fetch(`https://open.spotify.com/embed/playlist/${site.music.playlist}`)).text();
    const json = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)?.[1];
    const list: Item[] = json ? JSON.parse(json).props.pageProps.state.data.entity.trackList : [];
    const songs = list.filter((t) => t.isPlayable && t.uri?.startsWith("spotify:track:"));
    if (!songs.length) throw new Error("no songs on the embed page");

    const known = new Map(saved.tracks.map((t) => [t.uri, t.cover]));
    const tracks = await Promise.all(
      songs.map(async (t) => ({
        uri: t.uri!,
        title: t.title,
        artist: t.subtitle,
        ms: t.duration,
        cover: known.get(t.uri!) ?? (await coverOf(t.uri!)),
      })),
    );
    return Response.json({ tracks });
  } catch (err) {
    console.error("music: live playlist unavailable, using the saved one", err);
    return Response.json({ tracks: saved.tracks });
  }
}

async function coverOf(uri: string): Promise<string | null> {
  const r = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(uri)}`).catch(() => null);
  return r?.ok ? ((await r.json()).thumbnail_url ?? null) : null;
}
