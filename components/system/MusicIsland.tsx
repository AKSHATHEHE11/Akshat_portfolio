"use client";
import "./music/music.css";
import { useEffect, useRef, useState } from "react";
import { Music } from "lucide-react";
import { site } from "@/data/site";
import { useCoarse } from "@/lib/hooks";

/*
  The music island: a black pill under the nav, top centre. An oval while nothing plays, a wider
  rounded rectangle (cover + level bars) while a song plays; hover (tap on touch) opens it into
  Spotify's own player with the song, artist, progress and controls.

  Playback is Spotify's embed, driven by its iFrame API, loaded only once someone reaches for the
  island. Visitors logged in to Spotify in that browser hear full songs; everyone else gets Spotify's
  30-second previews. The embed's own play button starts it, so it works in every browser
  (Safari blocks play() started from outside the player).
*/

type Update = { data: { playingURI?: string; isPaused: boolean } };
type Controller = {
  addListener(event: "ready", cb: () => void): void;
  addListener(event: "playback_update", cb: (e: Update) => void): void;
};
type IFrameAPI = {
  createController(el: HTMLElement, options: { uri: string; width: string; height: number }, cb: (c: Controller) => void): void;
};
declare global {
  interface Window {
    onSpotifyIframeApiReady?: (api: IFrameAPI) => void;
  }
}

const PLAYLIST = `spotify:playlist:${site.music.playlist}`;

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

/** a song's cover art, from Spotify's public oEmbed endpoint (CORS-open) */
const covers = new Map<string, Promise<string | null>>();
function coverOf(uri: string) {
  if (!covers.has(uri))
    covers.set(
      uri,
      fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(uri)}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((j: { thumbnail_url?: string } | null) => j?.thumbnail_url ?? null)
        .catch(() => null),
    );
  return covers.get(uri)!;
}

type Phase = "idle" | "loading" | "ready" | "error";

export default function MusicIsland() {
  const coarse = useCoarse();
  const root = useRef<HTMLDivElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const phaseRef = useRef<Phase>("idle");
  const closeTimer = useRef(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [open, setOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [cover, setCover] = useState<string | null>(null);

  // load Spotify's player the first time someone reaches for the island
  const warm = () => {
    if (phaseRef.current !== "idle") return;
    phaseRef.current = "loading";
    setPhase("loading");
    loadApi().then(
      (spotify) => {
        const el = host.current;
        if (!el) return;
        const mount = document.createElement("div"); // the API swaps this for its iframe
        el.appendChild(mount);
        spotify.createController(mount, { uri: PLAYLIST, width: "100%", height: 152 }, (c) => {
          let song = "";
          c.addListener("ready", () => {
            phaseRef.current = "ready";
            setPhase("ready");
          });
          c.addListener("playback_update", ({ data }) => {
            setPlaying(!data.isPaused);
            if (data.playingURI && data.playingURI !== song) {
              song = data.playingURI;
              coverOf(song).then((u) => u && song === data.playingURI && setCover(u));
            }
          });
        });
      },
      () => {
        phaseRef.current = "idle"; // a later hover tries again
        setPhase("error");
      },
    );
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
  useEffect(() => () => window.clearTimeout(closeTimer.current), []);

  // touch: a tap anywhere else closes it (taps inside Spotify's player never reach this page)
  useEffect(() => {
    if (!open || !coarse) return;
    const away = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [open, coarse]);

  return (
    <div
      ref={root}
      className="mi"
      data-open={open || undefined}
      data-playing={playing || undefined}
      style={{ viewTransitionName: "music-island" }}
      onPointerEnter={coarse ? undefined : show}
      onPointerLeave={coarse ? undefined : hide}
      onFocus={show}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) hide();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) {
          setOpen(false);
          root.current?.querySelector("button")?.focus();
        }
      }}
    >
      <button
        type="button"
        className="mi-pill"
        aria-expanded={open}
        aria-controls="mi-panel"
        aria-label={playing ? `Music playing from ${site.music.title}. Show the player` : `Music: ${site.music.title}. Show the player`}
        data-cursor="hover"
        onClick={() => (open ? setOpen(false) : show())}
      >
        {playing && cover ? (
          // eslint-disable-next-line @next/next/no-img-element -- Spotify's cover art, 22px
          <img src={cover} alt="" width={22} height={22} className="mi-cover" />
        ) : (
          <Music size={14} strokeWidth={2.2} aria-hidden />
        )}
        <span className="mi-bars" aria-hidden>
          <i />
          <i />
          <i />
          <i />
        </span>
      </button>

      <div id="mi-panel" className="mi-panel" inert={!open}>
        <div ref={host} className="mi-host" />
        {phase !== "ready" && (
          <p className="mi-note">
            {phase === "error" ? (
              <>
                Spotify didn&apos;t load.{" "}
                <a href={`https://open.spotify.com/playlist/${site.music.playlist}`} target="_blank" rel="noreferrer">
                  Open the playlist
                </a>
              </>
            ) : (
              "Tuning in…"
            )}
          </p>
        )}
      </div>
    </div>
  );
}
