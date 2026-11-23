// Checks the music island's API on a running server (default http://localhost:3000):
//   npm run check:music [-- http://localhost:3100]
// The playlist must return songs; search must return songs, or 503 when the Spotify keys aren't set.
const base = (process.argv[2] || "http://localhost:3000").replace(/\/$/, "");
let failed = false;
const fail = (msg) => {
  failed = true;
  console.log(`✗ ${msg}`);
};

const pl = await fetch(`${base}/api/music/playlist`);
const { tracks = [] } = pl.ok ? await pl.json() : {};
if (!tracks.length) fail(`playlist: ${pl.status}, no songs`);
else if (tracks.some((t) => !t.uri?.startsWith("spotify:track:") || !t.title)) fail("playlist: a song is missing its uri or title");
else console.log(`✓ playlist: ${tracks.length} songs, ${tracks.filter((t) => t.cover).length} covers`);

const one = await (await fetch(`${base}/api/music/search?q=a`)).json();
if (one.tracks?.length !== 0) fail("search: a one-letter query should return nothing");
else console.log("✓ search: one-letter query ignored");

const s = await fetch(`${base}/api/music/search?q=weeknd`);
if (s.status === 503) console.log("· search: off (set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET to turn it on)");
else if (!s.ok) fail(`search: ${s.status} ${JSON.stringify(await s.json().catch(() => ({})))}`);
else {
  const r = await s.json();
  if (!r.tracks?.length) fail("search: no songs for “weeknd”");
  else console.log(`✓ search: ${r.tracks.length} songs, first “${r.tracks[0].title}” by ${r.tracks[0].artist}`);
}

process.exitCode = failed ? 1 : 0; // not process.exit(): on Windows it can abort while fetch's sockets close
