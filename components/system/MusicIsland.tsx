"use client";
import "./music/music.css";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Music, Pause, Play, Search, SkipBack, SkipForward, X } from "lucide-react";
import { site } from "@/data/site";

/*
  The music island: a black notch on the top edge of the screen, above the nav. Empty while
  nothing plays; wider with the song's cover and a level meter while one plays; on hover (tap on
  touch) it grows into a player — cover, title, artist, progress, previous / play / next.

  Sound comes from Spotify's own player (its iFrame API), kept out of sight inside the island and
  loaded only when someone first reaches for it. Visitors logged in to Spotify in that browser hear
  full songs, everyone else Spotify's 30-second previews. Where a browser refuses to start sound
  from outside Spotify's player (Safari, phones), the island shows that player for one tap.
  The song list is the live Spotify playlist (/api/music/playlist, refreshed hourly; data/playlist.json
  from `node scripts/playlist.mjs` is the fallback). The magnifier searches all of Spotify
  (/api/music/search) and slots the picked song in next.
*/

type Track = { uri: string; title: string; artist: string; ms: number; cover: string | null };
type Update = { data: { playingURI?: string; isPaused: boolean; isBuffering: boolean; position: number; duration: number } };
type Controller = {
  addListener(event: "ready", cb: () => void): void;
  addListener(event: "playback_update", cb: (e: Update) => void): void;
  play(): void;
  pause(): void;
  resume(): void;
  seek(seconds: number): void;
  restart(): void;
  loadUri(uri: string): void;
};
type IFrameAPI = {
  createController(el: HTMLElement, options: { uri: string; width: string; height: number }, cb: (c: Controller) => void): void;
};
declare global {
  interface Window {
    onSpotifyIframeApiReady?: (api: IFrameAPI) => void;
  }
}

let api: Promise<IFrameAPI> | null = null;
function loadApi() {
  api ??= new Promise<IFrameAPI>((resolve, reject) => {
    window.onSpotifyIframeApiReady = resolve;
    const s = document.createElement("script");
    s.src = "https://open.spotify.com/embed/iframe-api/v1";
    s.async = true;
    s.onerror = () => {
      api = null;
      s.remove();
      reject(new Error("Spotify iFrame API did not load"));
    };
    document.body.appendChild(s);
  });
  return api;
}

const clock = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

type Phase = "idle" | "loading" | "ready" | "error";

export default function MusicIsland() {
  const root = useRef<HTMLDivElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const ctrl = useRef<Controller | null>(null);
  const tracksRef = useRef<Track[]>([]);
  const iRef = useRef(0);
  const phaseRef = useRef<Phase>("idle");
  const wantPlay = useRef(false); // play as soon as the player is ready (first press, or a new song loading)
  const endedUri = useRef("");
  const loaded = useRef(""); // the song Spotify's player has loaded
  const findInput = useRef<HTMLInputElement>(null);
  const closeTimer = useRef(0);
  const tapTimer = useRef(0);

  const [phase, setPhase] = useState<Phase>("idle");
  const [tracks, setTracks] = useState<Track[]>([]);
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(0);
  const [dur, setDur] = useState(0);
  const [open, setOpen] = useState(false);
  const [needsTap, setNeedsTap] = useState(false);
  const [finding, setFinding] = useState(false);
  const [q, setQ] = useState("");
  const [found, setFound] = useState<{ q: string; tracks: Track[] | "error" } | null>(null);

  const track: Track | undefined = tracks[i];

  // ask for sound; if the browser refuses sound started from outside Spotify's player, show that player
  const start = (c: Controller, fromTop: boolean) => {
    if (fromTop) c.play();
    else c.resume();
    window.clearTimeout(tapTimer.current);
    tapTimer.current = window.setTimeout(() => setNeedsTap(true), 4000);
  };

  const load = (n: number) => {
    const list = tracksRef.current;
    if (!list.length) return;
    const k = (n + list.length) % list.length;
    iRef.current = k;
    setI(k);
    setPos(0);
    setDur(0);
    wantPlay.current = true; // played when the player says it's ready
    if (ctrl.current) {
      loaded.current = list[k].uri;
      ctrl.current.loadUri(list[k].uri);
    }
  };

  const warm = () => {
    if (phaseRef.current !== "idle") return;
    phaseRef.current = "loading";
    setPhase("loading");
    const songs = fetch("/api/music/playlist")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .catch(() => import("@/data/playlist.json"))
      .then((p: { tracks: Track[] }) => p.tracks);
    Promise.all([songs, loadApi()]).then(
      ([list, spotify]) => {
        tracksRef.current = list;
        setTracks(list);
        const el = host.current;
        if (!el || !list.length) return;
        const mount = document.createElement("div"); // the API swaps this for its iframe
        el.appendChild(mount);
        loaded.current = list[0].uri;
        spotify.createController(mount, { uri: list[0].uri, width: "100%", height: 80 }, (c) => {
          ctrl.current = c;
          c.addListener("ready", () => {
            phaseRef.current = "ready";
            setPhase("ready");
            // a song was picked before the player was ready: load it (ready fires again after)
            const want = tracksRef.current[iRef.current]?.uri;
            if (want && want !== loaded.current) {
              loaded.current = want;
              c.loadUri(want);
              return;
            }
            if (wantPlay.current) {
              wantPlay.current = false;
              start(c, true);
            }
          });
          c.addListener("playback_update", ({ data }) => {
            const k = data.playingURI ? tracksRef.current.findIndex((t) => t.uri === data.playingURI) : -1;
            if (k >= 0 && k !== iRef.current) {
              iRef.current = k;
              setI(k);
            }
            const ended = data.duration > 0 && data.position >= data.duration - 300;
            setPos(data.position);
            setDur(data.duration);
            setPlaying(!data.isPaused && !ended);
            if (!data.isPaused && !data.isBuffering) {
              window.clearTimeout(tapTimer.current);
              setNeedsTap(false);
            }
            // Spotify's player just stops at the end of a song: move on to the next one
            if (ended && data.playingURI && endedUri.current !== data.playingURI) {
              endedUri.current = data.playingURI;
              load(iRef.current + 1);
            }
            if (!ended) endedUri.current = "";
          });
        });
      },
      () => {
        phaseRef.current = "idle"; // a later hover tries again
        setPhase("error");
      },
    );
  };

  const toggle = () => {
    const c = ctrl.current;
    if (!c || phaseRef.current !== "ready") {
      wantPlay.current = true;
      warm();
      return;
    }
    if (playing) c.pause();
    else if (dur > 0 && pos >= dur - 300) c.restart();
    else start(c, pos === 0 && dur === 0);
  };
  const prev = () => (pos > 3000 ? ctrl.current?.restart() : load(iRef.current - 1));
  const next = () => load(iRef.current + 1);

  // a song from the search: play it now, then carry on with the playlist
  const pick = (t: Track) => {
    const list = tracksRef.current;
    const at = list.findIndex((x) => x.uri === t.uri);
    if (at >= 0) load(at);
    else {
      const k = Math.min(iRef.current + 1, list.length);
      const grown = [...list.slice(0, k), t, ...list.slice(k)];
      tracksRef.current = grown;
      setTracks(grown);
      load(k);
    }
    setFinding(false);
    setQ("");
    window.requestAnimationFrame(() => root.current?.querySelector<HTMLButtonElement>(".mi-play")?.focus());
  };

  const term = q.trim();
  useEffect(() => {
    if (!finding || term.length < 2) return;
    const ac = new AbortController();
    const wait = window.setTimeout(() => {
      fetch(`/api/music/search?q=${encodeURIComponent(term)}`, { signal: ac.signal })
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
        .then(
          (j: { tracks: Track[] }) => setFound({ q: term, tracks: j.tracks }),
          () => !ac.signal.aborted && setFound({ q: term, tracks: "error" }),
        );
    }, 300);
    return () => {
      window.clearTimeout(wait);
      ac.abort();
    };
  }, [finding, term]);
  useEffect(() => {
    if (finding) findInput.current?.focus();
  }, [finding]);
  const stopFinding = () => {
    setFinding(false);
    setQ("");
    window.requestAnimationFrame(() => root.current?.querySelector<HTMLButtonElement>(".mi-find")?.focus());
  };

  const show = () => {
    window.clearTimeout(closeTimer.current);
    warm();
    setOpen(true);
  };
  const hide = () => {
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setOpen(false), 280);
  };
  useEffect(
    () => () => {
      window.clearTimeout(closeTimer.current);
      window.clearTimeout(tapTimer.current);
    },
    [],
  );

  // a tap or click anywhere else closes it (taps inside Spotify's player never reach this page)
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) {
        setOpen(false);
        setFinding(false);
      }
    };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [open]);

  const total = dur || track?.ms || 0;
  const title = track ? `${track.title} — ${track.artist}` : site.music.title;

  return (
    <div
      ref={root}
      className="mi"
      data-open={open || undefined}
      data-playing={playing || undefined}
      data-tap={(open && needsTap && !finding) || undefined}
      data-search={(open && finding) || undefined}
      style={{ viewTransitionName: "music-island" }}
      // hover is a mouse thing: a finger lifting counts as leaving, which would shut it straight away
      onPointerEnter={(e) => e.pointerType === "mouse" && show()}
      onPointerLeave={(e) => e.pointerType === "mouse" && !finding && hide()} // typing a search: stay open
      // keyboard focus opens it; a tap focuses too, but there the click opens it (else it would open and shut at once)
      onFocus={(e) => {
        if ((e.target as HTMLElement).matches(":focus-visible")) show();
      }}
      // close when focus moves on to something else on the page (not when the focused button is hidden)
      onBlur={(e) => {
        if (e.relatedTarget && !e.currentTarget.contains(e.relatedTarget as Node)) hide();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) {
          setOpen(false);
          setFinding(false);
          root.current?.querySelector<HTMLButtonElement>(".mi-notch")?.focus();
        }
      }}
    >
      {/* the notch */}
      <button
        type="button"
        className="mi-notch"
        aria-expanded={open}
        aria-controls="mi-card"
        aria-label={playing ? `Now playing: ${title}. Show the player` : `Music: ${site.music.title}. Show the player`}
        data-cursor="hover"
        onClick={() => (open ? setOpen(false) : show())}
      >
        {playing && track?.cover ? (
          // eslint-disable-next-line @next/next/no-img-element -- Spotify's cover art, 18px
          <img src={track.cover} alt="" width={18} height={18} className="mi-thumb" />
        ) : (
          <Music size={12} strokeWidth={2.2} aria-hidden className="mi-note-icon" />
        )}
        <Meter />
      </button>

      {/* the player */}
      <div id="mi-card" role="group" className="mi-card" inert={!open} aria-label="Music player">
        {phase === "error" ? (
          <p className="mi-msg">
            Spotify didn&apos;t load.{" "}
            <a href={`https://open.spotify.com/playlist/${site.music.playlist}`} target="_blank" rel="noreferrer">
              Open the playlist ↗
            </a>
          </p>
        ) : finding ? (
          <>
            <form className="mi-search" role="search" onSubmit={(e) => e.preventDefault()}>
              <Search size={14} aria-hidden />
              <input
                ref={findInput}
                type="search"
                placeholder="Search any song on Spotify"
                aria-label="Search Spotify for a song"
                enterKeyHint="search"
                autoComplete="off"
                value={q}
                onChange={(e) => setQ(e.currentTarget.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    e.stopPropagation();
                    stopFinding();
                  }
                }}
              />
              <button type="button" aria-label="Back to the player" onClick={stopFinding} data-cursor="hover">
                <X size={14} />
              </button>
            </form>
            <div className="mi-results" data-lenis-prevent aria-live="polite">
              {term.length < 2 ? (
                <p className="mi-hint">Type a song or an artist. The one you pick plays next.</p>
              ) : found?.q !== term ? (
                <p className="mi-hint">Searching…</p>
              ) : found.tracks === "error" ? (
                <p className="mi-hint">Search isn&apos;t working right now.</p>
              ) : !found.tracks.length ? (
                <p className="mi-hint">Nothing found for “{term}”.</p>
              ) : (
                <ul>
                  {found.tracks.map((t) => (
                    <li key={t.uri}>
                      <button type="button" onClick={() => pick(t)} data-cursor="hover">
                        {t.cover ? (
                          // eslint-disable-next-line @next/next/no-img-element -- Spotify's cover art, 36px
                          <img src={t.cover} alt="" width={36} height={36} loading="lazy" />
                        ) : (
                          <span className="mi-art-empty" aria-hidden>
                            <Music size={14} />
                          </span>
                        )}
                        <span className="mi-meta">
                          <span className="mi-title">{t.title}</span>
                          <span className="mi-artist">
                            {t.artist} · {clock(t.ms)}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="mi-head">
              {track?.cover ? (
                // eslint-disable-next-line @next/next/no-img-element -- Spotify's cover art, 48px
                <img src={track.cover} alt="" width={48} height={48} className="mi-art" />
              ) : (
                <span className="mi-art mi-art-empty" aria-hidden>
                  <Music size={18} />
                </span>
              )}
              <div className="mi-meta" aria-live="polite">
                <p className="mi-title">{track?.title ?? "Tuning in…"}</p>
                <p className="mi-artist">{track?.artist ?? site.music.title}</p>
              </div>
              <Meter />
            </div>

            <div className="mi-time">
              <span>{clock(pos)}</span>
              <input
                type="range"
                className="mi-seek"
                aria-label="Position in the song"
                min={0}
                max={total || 1}
                step={1000}
                value={Math.min(pos, total)}
                disabled={!total || phase !== "ready"}
                style={{ "--p": total ? Math.min(1, pos / total) : 0 } as CSSProperties}
                onChange={(e) => ctrl.current?.seek(Number(e.currentTarget.value) / 1000)}
              />
              <span>-{clock(total - pos)}</span>
            </div>

            <div className="mi-controls">
              <button type="button" className="mi-find" aria-label="Search for a song" onClick={() => setFinding(true)} data-cursor="hover">
                <Search size={16} />
              </button>
              <button type="button" aria-label="Previous song" onClick={prev} disabled={!tracks.length} data-cursor="hover">
                <SkipBack size={20} fill="currentColor" />
              </button>
              <button type="button" className="mi-play" aria-label={playing ? "Pause" : "Play"} onClick={toggle} data-cursor="hover">
                {playing ? <Pause size={26} fill="currentColor" /> : <Play size={26} fill="currentColor" />}
              </button>
              <button type="button" aria-label="Next song" onClick={next} disabled={!tracks.length} data-cursor="hover">
                <SkipForward size={20} fill="currentColor" />
              </button>
              <a
                className="mi-spotify"
                href={track ? `https://open.spotify.com/track/${track.uri.split(":")[2]}` : `https://open.spotify.com/playlist/${site.music.playlist}`}
                target="_blank"
                rel="noreferrer"
                aria-label="Open in Spotify"
                data-cursor="hover"
              >
                Spotify ↗
              </a>
            </div>
          </>
        )}

        {/* Spotify's player: out of sight, unless the browser needs a tap on it to start the sound */}
        <div className="mi-embed" inert={!needsTap}>
          <p className="mi-tap">Tap play in Spotify&apos;s player to start</p>
          <div ref={host} className="mi-host" />
        </div>
      </div>
    </div>
  );
}

function Meter() {
  return (
    <span className="mi-meter" aria-hidden>
      <i />
      <i />
      <i />
      <i />
      <i />
    </span>
  );
}
