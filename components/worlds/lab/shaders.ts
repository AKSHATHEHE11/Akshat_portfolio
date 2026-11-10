// GLSL for the field. Three programs share one set of field functions:
//  FIELD    — the field at fat-pixel resolution, mixed with its own last frame (feedback) → render target
//  DISPLAY  — that target to the screen: nearest-neighbour cells, ordered-dither crush, grain, chaos tears
//  PREVIEW  — one pipeline stage at a time inside a scissor box (the signal-flow screens)
// Colour is authored in display space: no colorspace include, and the canvas runs flat + linear.

export const VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

const HASH = /* glsl */ `
float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}`;

const BAYER = /* glsl */ `
float bayer2(vec2 a) { a = floor(a); return fract(dot(a, vec2(0.5, a.y * 0.75))); }
float bayer4(vec2 a) { return bayer2(0.5 * a) * 0.25 + bayer2(a); }
float bayer8(vec2 a) { return bayer4(0.5 * a) * 0.25 + bayer2(a); }
// CRUSH: fewer output levels per channel; the ordered dither threshold hides the steps.
vec3 crush(vec3 c, vec2 cell, float amt) {
  if (amt < 0.005) return c;
  float lv = floor(40.0 - 38.0 * pow(amt, 0.6) + 0.5) - 1.0;
  return floor(c * lv + bayer8(cell)) / lv;
}`;

const FIELD = /* glsl */ `
uniform float uTime;
uniform float uWarp;
uniform float uScale;
uniform float uDetail;
uniform float uHue;
uniform float uSpread;
uniform float uMirror;
uniform float uPolar;
uniform vec3 uPa;
uniform vec3 uPb;
uniform vec3 uPc;
uniform vec3 uPd;
uniform vec4 uStir; // xy: pointer in centred field space, z: strength, w: radius

${HASH}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float a = hash12(i);
  float b = hash12(i + vec2(1.0, 0.0));
  float c = hash12(i + vec2(0.0, 1.0));
  float d = hash12(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

// fbm with a fractional octave count: the last layer fades in, so DETAIL never steps
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  float n = 0.0;
  for (int i = 0; i < 7; i++) {
    float w = clamp(uDetail - float(i), 0.0, 1.0);
    if (w <= 0.0) break;
    v += a * w * vnoise(p);
    n += a * w;
    p = mat2(1.6, 1.2, -1.2, 1.6) * p + vec2(7.31, 3.17);
    a *= 0.5;
  }
  return v / max(n, 0.0001);
}

vec2 fieldSpace(vec2 uv, float aspect) {
  vec2 p = (uv - 0.5) * vec2(aspect, 1.0);
  // stir: a soft swirl and pinch around the pointer
  vec2 d = p - uStir.xy;
  float k = uStir.z * exp(-dot(d, d) / (uStir.w * uStir.w));
  float an = k * 2.4;
  p = uStir.xy + mat2(cos(an), sin(an), -sin(an), cos(an)) * d * (1.0 - 0.3 * k);
  if (uPolar > 0.5) {
    float r = length(p);
    float a = atan(p.y, p.x);
    a = uMirror > 0.5 ? abs(mod(a, 1.0471976) - 0.5235988) * 3.0 : abs(a);
    p = vec2(a * 1.1, r * 2.4);
  } else if (uMirror > 0.5) {
    p.x = abs(p.x);
  }
  return p * uScale;
}

// two-level domain warp; q and r come back out for colour and feedback advection
float field(vec2 p, float t, out vec2 q, out vec2 r) {
  float w = uWarp * 1.6;
  q = vec2(fbm(p + vec2(0.11, 0.07) * t), fbm(p + vec2(5.2, 1.3) - vec2(0.05, 0.09) * t));
  r = vec2(fbm(p + w * q + vec2(1.7, 9.2) + 0.15 * t), fbm(p + w * q + vec2(8.3, 2.8) - 0.126 * t));
  return fbm(p + w * r);
}

vec3 palette(float x) {
  return uPa + uPb * cos(6.2831853 * (uPc * x + uPd + uHue));
}

vec3 shade(float f, vec2 q, vec2 r) {
  float s = smoothstep(0.18, 0.82, f);
  float x = s * uSpread + 0.3 * (q.x - 0.5) * uSpread + 0.15 * (r.y - 0.5);
  vec3 col = palette(x);
  col *= 0.42 + 0.78 * s;
  return clamp(col, 0.0, 1.0);
}`;

export const FIELD_FRAG = /* glsl */ `
uniform sampler2D uPrev;
uniform vec2 uRes;
uniform float uFeed;
uniform float uSpin;
varying vec2 vUv;
${FIELD}
void main() {
  vec2 p = fieldSpace(vUv, uRes.x / uRes.y);
  vec2 q;
  vec2 r;
  float f = field(p, uTime, q, r);
  vec3 col = shade(f, q, r);
  if (uFeed > 0.001) {
    vec2 c = (vUv - 0.5) * (1.0 - 0.014 * uFeed);
    float s = sin(uSpin);
    float co = cos(uSpin);
    c = mat2(co, s, -s, co) * c;
    vec3 prev = texture2D(uPrev, c + 0.5 + (q - 0.5) * 0.008).rgb;
    col = mix(col, max(col, prev), uFeed);
  }
  gl_FragColor = vec4(col, 1.0);
}`;

export const DISPLAY_FRAG = /* glsl */ `
uniform sampler2D uTex;
uniform vec2 uLow;
uniform float uCrush;
uniform float uGrain;
uniform float uTear;
uniform float uFlash;
uniform float uSeed;
uniform float uTearSeed;
varying vec2 vUv;
${HASH}
${BAYER}
void main() {
  vec2 uv = vUv;
  // chaos: bands of the frame slip sideways, channels split
  float band = hash12(vec2(floor(uv.y * 40.0), uTearSeed));
  uv.x = fract(uv.x + uTear * step(0.84, band) * (band - 0.92) * 0.7);
  vec2 cell = floor(uv * uLow);
  vec3 c = texture2D(uTex, (cell + 0.5) / uLow).rgb;
  if (uTear > 0.01) {
    c.r = texture2D(uTex, (cell + vec2(0.5 + 2.0 * uTear, 0.5)) / uLow).r;
    c.b = texture2D(uTex, (cell + vec2(0.5 - 1.0 * uTear, 0.5)) / uLow).b;
  }
  c = crush(c, cell, uCrush);
  c += (hash12(gl_FragCoord.xy + uSeed * 131.7) - 0.5) * uGrain * 0.3;
  c = mix(c, vec3(1.0), uFlash);
  gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
}`;

export const PREVIEW_FRAG = /* glsl */ `
uniform float uStage;
uniform vec2 uOrigin;
uniform vec2 uSlot;
uniform float uPix;
uniform float uFeed;
uniform float uCrush;
uniform float uGrain;
uniform float uSeed;
uniform vec3 uLed;
varying vec2 vUv;
${FIELD}
${BAYER}
void main() {
  vec2 cells = max(floor(uSlot / uPix), vec2(1.0));
  vec2 cell = floor((gl_FragCoord.xy - uOrigin) / uPix);
  vec2 uv = (cell + 0.5) / cells;
  float aspect = uSlot.x / uSlot.y;
  vec2 p = fieldSpace(uv, aspect);
  vec3 col;
  if (uStage < 0.5) {
    // uniforms: the coordinate space every later stage samples (scale, mirror, polar, stir)
    vec2 g = abs(fract(p) - 0.5);
    float line = step(0.42, max(g.x, g.y));
    float dot2 = step(length(fract(p * 2.0) - 0.5), 0.12);
    col = mix(vec3(0.045), uLed, max(line, dot2 * 0.5));
  } else if (uStage < 1.5) {
    col = vec3(smoothstep(0.18, 0.82, fbm(p)));
  } else {
    vec2 q;
    vec2 r;
    float f = field(p, uTime, q, r);
    if (uStage < 2.5) {
      col = vec3(smoothstep(0.18, 0.82, f));
    } else {
      col = shade(f, q, r);
      if (uStage > 3.5 && uFeed > 0.001) {
        // feedback, re-created: the same field a few frames back, zoomed like the real pass
        vec3 acc = col;
        float k = uFeed;
        for (int i = 1; i < 4; i++) {
          vec2 uv2 = (uv - 0.5) * (1.0 + 0.05 * float(i)) + 0.5;
          vec2 q2;
          vec2 r2;
          float f2 = field(fieldSpace(uv2, aspect), uTime - 0.14 * float(i), q2, r2);
          acc = max(acc, shade(f2, q2, r2) * k);
          k *= uFeed;
        }
        col = mix(col, acc, uFeed);
      }
      if (uStage > 4.5) col = crush(col, cell, uCrush);
      if (uStage > 5.5) col += (hash12(gl_FragCoord.xy + uSeed * 131.7) - 0.5) * uGrain * 0.3;
    }
  }
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;
