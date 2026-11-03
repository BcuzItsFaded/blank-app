import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { FPS, H, W, SceneData, clamp, durF, lerp, pulse, rand, wobble } from "./lib";
import { Particles, Rain, SoftGlow } from "./fx";
import timings from "./timings.json";

/* Each scene = one storyboard panel (public/keyframes/scene_XX.jpg, 2000 px tall) animated with:
   timed camera (focus point + zoom), parallax particle layers, and 2.5D motion cut from the
   painting itself (swaying hung dolls, lantern flicker, ripples, flashes, water shimmer). */

const PLATE_W = [1302, 1322, 1318, 1294, 1341, 1362, 1358, 1333];
const PH = 2000;
const K = H / PH; // plate height fits the frame at zoom 1

type Fx = {
  shimmer?: number; lantern?: number[][]; lanternFade?: number; mist?: number; fireflies?: number; ripples?: number[][];
  bob?: number; crossGlow?: number[]; reflection?: number[]; sway?: number[][]; leaves?: number; rain?: number;
  eyes?: number[][]; eyesWord?: number; flash?: number[][]; phone?: number[]; whisperMove?: number;
};

/** scene-local frame where word k of the scene's narration (all lines joined) is spoken */
export const wordFrame = (id: number, k: number) => {
  const sc = timings.scenes.find((x) => x.id === id)!;
  const words = sc.lines.flatMap((l) => l.words.map((w) => l.start + w.t0));
  return Math.round((words[Math.min(k, words.length - 1)] - sc.start) * FPS);
};

/** camera keys: [sec, zoom, focusU, focusV] — focus point (normalized plate coords) held at screen centre */
export const camAt = (s: SceneData, f: number) => {
  const k = s.camera as number[][];
  const t = f / FPS;
  let i = 0;
  while (i < k.length - 2 && t > k[i + 1][0]) i++;
  const a = k[i], b = k[Math.min(i + 1, k.length - 1)];
  const p = b[0] > a[0] ? clamp((t - a[0]) / (b[0] - a[0])) : 1;
  const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
  const L = (x: number, y: number) => x + (y - x) * e;
  return { z: L(a[1], b[1]), u: L(a[2], b[2]), v: L(a[3], b[3]) };
};

export const PlateScene: React.FC<{ s: SceneData; f: number; extraZoom?: number; shake?: number }> = ({ s, f, extraZoom = 1, shake = 0 }) => {
  const i = s.id - 1;
  const pw = PLATE_W[i];
  const fx = s.fx as Fx;
  const c = camAt(s, f);
  const z = c.z * extraZoom;
  const dw = pw * K * z, dh = H * z;
  // keep the painting covering the frame
  const hu = W / 2 / dw, hv = H / 2 / dh;
  const u = clamp(c.u, hu, 1 - hu), v = clamp(c.v, hv, 1 - hv);
  const bob = fx.bob ? Math.sin(f / 22) * 6 : 0;
  const left = W / 2 - dw * u + wobble(f, s.id, 0.9) * shake;
  const top = H / 2 - dh * v + bob + wobble(f, s.id + 3, 1.1) * shake;
  // parallax: offset relative to the scene's first frame, for the foreground layers
  const c0 = camAt(s, 0);
  const dw0 = pw * K * c0.z, dh0 = H * c0.z;
  const ox = left - (W / 2 - dw0 * clamp(c0.u, W / 2 / dw0, 1 - W / 2 / dw0));
  const oy = top - (H / 2 - dh0 * clamp(c0.v, H / 2 / dh0, 1 - H / 2 / dh0));
  const src = staticFile(`keyframes/scene_${String(s.id).padStart(2, "0")}.jpg`);
  const P = (uu: number, vv: number) => [uu * pw, vv * PH] as const;
  const T = f / FPS;

  return (
    <AbsoluteFill style={{ background: "#0a0610", overflow: "hidden" }}>
      <div style={{ position: "absolute", left, top, width: dw, height: dh, transform: fx.bob ? `rotate(${Math.sin(f / 26) * 0.35}deg)` : undefined }}>
        <Img src={src} style={{ width: "100%", height: "100%", display: "block" }} />
        <svg viewBox={`0 0 ${pw} ${PH}`} preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
          <defs>
            <radialGradient id={`feather-${s.id}`}><stop offset="0.6" stopColor="#fff" /><stop offset="1" stopColor="#000" /></radialGradient>
          </defs>

          {/* water shimmer: moving light glints on the canal */}
          {fx.shimmer !== undefined && Array.from({ length: 34 }, (_, k) => {
            const r = rand(k + s.id * 100);
            const y = fx.shimmer! * PH + r() * (PH * (1 - fx.shimmer!));
            const x = (r() * pw + f * (0.8 + r()) * (r() > 0.5 ? 1 : -1) + pw) % pw;
            const len = 30 + r() * 90;
            return <line key={k} x1={x} y1={y} x2={x + len} y2={y} stroke={r() > 0.5 ? "#ffe6a8" : "#e8d8ff"} strokeWidth={3 + r() * 3} strokeLinecap="round" opacity={0.08 + 0.3 * pulse(f, 20 + r() * 30, r() * 60)} />;
          })}

          {/* 2.5D sway: a piece of the painting (hung doll) rotates around its rope, feathered edges */}
          {fx.sway?.map(([x0, y0, x1, y1, pu, pv, amp, per], k) => {
            const [px, py] = P(pu, pv);
            const a = Math.sin((T / per) * Math.PI * 2) * Math.min(amp, 1.3);
            const id = `sw-${s.id}-${k}`;
            return (
              <g key={k}>
                <defs>
                  <mask id={id} maskUnits="userSpaceOnUse">
                    <ellipse cx={((x0 + x1) / 2) * pw} cy={((y0 + y1) / 2) * PH} rx={((x1 - x0) / 2) * pw} ry={((y1 - y0) / 2) * PH} fill={`url(#feather-${s.id})`} />
                  </mask>
                </defs>
                <g transform={`rotate(${a} ${px} ${py})`}>
                  <image href={src} x={0} y={0} width={pw} height={PH} mask={`url(#${id})`} preserveAspectRatio="none" />
                </g>
              </g>
            );
          })}

          {/* lantern / window glow flicker */}
          {fx.lantern?.map(([lu, lv], k) => {
            const [lx, ly] = P(lu, lv);
            const fade = fx.lanternFade !== undefined ? 1 - clamp((T - fx.lanternFade) / 2.5) * 0.75 : 1;
            const fl = (0.75 + 0.25 * Math.sin(f * 1.3 + k) * Math.sin(f * 0.47)) * fade;
            return <g key={k} style={{ mixBlendMode: "screen" }}><SoftGlow cx={lx} cy={ly} rx={260} ry={240} color="#ffb850" opacity={0.55 * fl} /><SoftGlow cx={lx} cy={ly} rx={70} ry={70} color="#fff0b0" opacity={0.7 * fl} /></g>;
          })}

          {/* paddle ripples */}
          {fx.ripples?.map(([ru, rv], k) => {
            const [rx, ry] = P(ru, rv);
            return Array.from({ length: 3 }, (_, j) => {
              const p = ((T + j * 0.6) % 1.7) / 1.7;
              return <ellipse key={`${k}-${j}`} cx={rx} cy={ry} rx={40 + p * 260} ry={10 + p * 60} fill="none" stroke="#e8e0ff" strokeWidth={5 * (1 - p)} opacity={0.6 * (1 - p)} />;
            });
          })}

          {/* the cross: faint pale glow + rippling reflection */}
          {fx.crossGlow && <SoftGlow cx={fx.crossGlow[0] * pw} cy={fx.crossGlow[1] * PH} rx={170} ry={210} color="#f4f0ff" opacity={0.18 + 0.12 * pulse(f, 60)} />}
          {fx.reflection && Array.from({ length: 7 }, (_, k) => {
            const [qx, qy] = P(fx.reflection![0], fx.reflection![1]);
            const y = qy - 120 + k * 40;
            const w = 60 + 30 * Math.sin(f / 11 + k);
            return <line key={k} x1={qx - w} y1={y} x2={qx + w} y2={y} stroke="#f4f0ff" strokeWidth={4} opacity={0.12 + 0.12 * pulse(f, 13, k * 5)} />;
          })}

          {/* "staring eyes": glints appear on the big doll's eyes as the word lands */}
          {fx.eyes && (() => {
            const at = wordFrame(s.id, fx.eyesWord ?? 0);
            const o = lerp(f, 0, 1, at - 4, at + 6);
            return fx.eyes.map(([eu, ev], k) => {
              const [ex, ey] = P(eu, ev);
              return <g key={k} opacity={o}><SoftGlow cx={ex} cy={ey} rx={46} ry={46} color="#ffe8f0" opacity={0.55} /><circle cx={ex + 6} cy={ey - 6} r={7} fill="#fff" /></g>;
            });
          })()}

          {/* camera flashes / phone glow */}
          {fx.flash?.map(([qu, qv, at], k) => {
            const d = T - at; if (d < 0 || d > 0.5) return null;
            const o = d < 0.06 ? 1 : Math.max(0, 1 - (d - 0.06) / 0.4);
            const [qx, qy] = P(qu, qv);
            return <g key={k}><SoftGlow cx={qx} cy={qy} rx={700} ry={700} color="#ffffff" opacity={0.85 * o} /></g>;
          })}
          {fx.phone && <SoftGlow cx={fx.phone[0] * pw} cy={fx.phone[1] * PH} rx={130} ry={180} color="#cfe8ff" opacity={0.35 + 0.15 * pulse(f, 25)} />}
        </svg>
      </div>

      {/* parallax layers in screen space (move faster than the painting) */}
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        {fx.mist !== undefined && (
          <g transform={`translate(${ox * 1.25} ${oy * 1.25})`}>
            {Array.from({ length: 6 }, (_, k) => {
              const r = rand(k + 70 + s.id);
              const x = ((r() * 1600 + f * (0.6 + r() * 0.8)) % 1800) - 400;
              return <SoftGlow key={k} cx={x} cy={fx.mist! * H + (r() - 0.5) * 260} rx={420 + r() * 300} ry={90 + r() * 60} color="#d8c8f0" opacity={0.16 + 0.06 * r()} />;
            })}
          </g>
        )}
        {fx.fireflies && <g transform={`translate(${ox * 1.4} ${oy * 1.4})`}><Particles f={f} n={fx.fireflies} seed={s.id * 7} kind="firefly" region={[0, H * 0.25, W, H * 0.85]} /></g>}
        {fx.leaves && <g transform={`translate(${ox * 1.6} ${oy * 1.6})`}><Particles f={f} n={fx.leaves} seed={s.id * 9} kind="leaf" /></g>}
        {fx.rain && <g transform={`translate(${ox * 1.5} ${oy * 1.5})`}><Rain f={f} n={190} opacity={0.4} angle={10} /></g>}
        <g transform={`translate(${ox * 1.8} ${oy * 1.8})`}><Particles f={f} n={26} seed={s.id * 11} kind="dust" /></g>
      </svg>
      {/* full-frame flash for camera flashes */}
      {fx.flash?.map(([, , at], k) => {
        const d = T - at; if (d < 0 || d > 0.25) return null;
        return <AbsoluteFill key={k} style={{ background: "#fff", opacity: 0.35 * (1 - d / 0.25) }} />;
      })}
    </AbsoluteFill>
  );
};

export const sceneLen = durF;
