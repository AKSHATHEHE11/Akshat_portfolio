// Song search for the music island: /api/music/search?q=blinding lights → up to 8 Spotify songs.
// Needs SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET (a free app at developer.spotify.com/dashboard)
// in .env.local and in Vercel's environment variables. Without them it answers 503.
// ponytail: no rate limit of our own; answers are CDN-cached per query for a day. Add one if bots abuse it.

let token = { value: "", until: 0 };

async function accessToken(): Promise<string | null> {
  const id = process.env.SPOTIFY_CLIENT_ID;
  const secret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!id || !secret) return null;
  if (Date.now() < token.until) return token.value;
  const r = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    cache: "no-store",
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!r.ok) throw new Error(`token ${r.status}`); // wrong keys: say so, don't look like "not set up"
  const j = await r.json();
  token = { value: j.access_token, until: Date.now() + (j.expires_in - 60) * 1000 };
  return token.value;
}

type Hit = {
  uri: string;
  name: string;
  duration_ms: number;
  artists: { name: string }[];
  album: { images: { url: string }[] };
};

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim().slice(0, 100);
  if (!q || q.length < 2) return Response.json({ tracks: [] }); // the island searches from 2 letters; don't spend Spotify calls on less
  try {
    const auth = await accessToken();
    if (!auth) return Response.json({ error: "search is not set up" }, { status: 503 });

    const r = await fetch(`https://api.spotify.com/v1/search?${new URLSearchParams({ q, type: "track", limit: "8" })}`, {
      cache: "no-store",
      headers: { Authorization: `Bearer ${auth}` },
    });
    if (r.status === 401) token = { value: "", until: 0 };
    if (!r.ok) throw new Error(`search ${r.status}`);
    const items: Hit[] = (await r.json()).tracks?.items ?? [];
    const tracks = items.map((t) => ({
      uri: t.uri,
      title: t.name,
      artist: t.artists.map((a) => a.name).join(", "),
      ms: t.duration_ms,
      cover: (t.album.images.at(-2) ?? t.album.images[0])?.url ?? null, // ~300px, else the only one
    }));
    return Response.json({ tracks }, { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" } });
  } catch (err) {
    console.error("music: Spotify search failed", err);
    return Response.json({ error: err instanceof Error ? `spotify: ${err.message}` : "spotify" }, { status: 502 });
  }
}
