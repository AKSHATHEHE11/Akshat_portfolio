// Can a project's site run inside the portfolio? Reads the site's OWN framing rules.
//   node scripts/check-embeds.mjs https://project-one.com https://shop.example.in --origin=https://your-portfolio.com
//
// EMBED OK   → set project.live.mode = "embed"
// BLOCKED    → the site owner (you, for your own sites) adds one header that allows the portfolio
//              (docs/LIVE-SITES.md), or use mode "capture" / "link".
// Framing is the site owner's decision. This project never bypasses it (no proxies, no mirroring,
// no header stripping).
const args = process.argv.slice(2);
const origin = args.find((a) => a.startsWith("--origin="))?.slice("--origin=".length) ?? null;
const urls = args.filter((a) => !a.startsWith("--"));
if (!urls.length) {
  console.log("usage: node scripts/check-embeds.mjs <url> [<url> …] [--origin=https://your-portfolio.com]");
  process.exit(1);
}

/** Does a CSP host-source (e.g. "https://*.akshat.dev", "akshat.dev", "*") allow `origin`? */
function sourceAllows(src, embedder) {
  if (!embedder) return false;
  if (src === "*") return true;
  let u;
  try {
    u = new URL(embedder);
  } catch {
    return false;
  }
  const m = src.match(/^(?:([a-z][a-z0-9+.-]*):\/\/)?([^/:]+)(?::(\d+|\*))?/i);
  if (!m) return false;
  const [, scheme, host, port] = m;
  if (scheme && `${scheme}:` !== u.protocol) return false;
  if (port && port !== "*" && port !== (u.port || (u.protocol === "https:" ? "443" : "80"))) return false;
  if (host.startsWith("*.")) return u.hostname.endsWith(host.slice(1));
  return u.hostname === host;
}

function verdict(headers, finalUrl) {
  const csp = headers.get("content-security-policy") ?? "";
  const fa = csp
    .split(/[;,]/)
    .map((d) => d.trim())
    .find((d) => d.toLowerCase().startsWith("frame-ancestors"));
  if (fa) {
    // When CSP frame-ancestors is present, browsers ignore X-Frame-Options.
    const sources = fa.split(/\s+/).slice(1);
    if (sources.includes("'none'")) return ["BLOCKED", `CSP ${fa}`];
    if (sources.includes("*")) return ["EMBED OK", `CSP ${fa}`];
    const others = sources.filter((s) => s !== "'self'");
    if (origin && others.some((s) => sourceAllows(s, origin))) return ["EMBED OK", `CSP allows ${origin}`];
    if (others.length) return [origin ? "BLOCKED" : "ALLOWED FOR LISTED ORIGINS", `CSP ${fa}`];
    return ["BLOCKED", `CSP ${fa} (same-site only)`];
  }
  const xfo = (headers.get("x-frame-options") ?? "").trim().toUpperCase();
  if (xfo === "DENY") return ["BLOCKED", "X-Frame-Options: DENY"];
  if (xfo === "SAMEORIGIN") return ["BLOCKED", "X-Frame-Options: SAMEORIGIN"];
  if (xfo.startsWith("ALLOW-FROM")) return ["BLOCKED", `${xfo} (obsolete, ignored by modern browsers → treat as blocked)`];
  return ["EMBED OK", `no framing restrictions (${new URL(finalUrl).host})`];
}

for (const url of urls) {
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
      headers: { "user-agent": "Mozilla/5.0 (portfolio embed check)", accept: "text/html" },
    });
    const [v, why] = verdict(res.headers, res.url);
    const mark = v === "EMBED OK" ? "✓" : v === "BLOCKED" ? "✗" : "~";
    console.log(`${mark} ${v.padEnd(26)} ${url}${res.url !== url ? `  → ${res.url}` : ""}\n    ${res.status} · ${why}`);
  } catch (e) {
    console.log(`? UNREACHABLE              ${url}\n    ${e.message}`);
  }
}
