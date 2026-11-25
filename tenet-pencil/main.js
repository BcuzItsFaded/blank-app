// Tenet, in a colored-pencil cutaway (Colored-Pencil Science Illustration). One timeline for the whole film.
// three.js builds the world (tree, ground, soil block, roots, worms, stones, mycelium);
// four G-buffer passes (albedo+id / light+depth+normal / hatch direction / anchor+reveal time) are re-drawn
// by a post shader as layered colored-pencil hatching on a paper tooth.
// Anti-swim rule: hatching, tooth-in-pigment and contour wobble are computed in "anchor" coordinates
// (each surface point projected through a fixed reference camera; the camera only translates inside a shot),
// so strokes stick to the things they draw. Only the contour wobble boils: a new drawing every 2 frames, 3 drawings cycled.
// Things are "drawn in" over time: every surface has a reveal time (arev); the post pass builds the four pencil
// layers up stroke by stroke after it, so the cutaway gets coloured in as the camera sinks.
import * as THREE from 'three';

const W = 1920, H = 1080, SS = 1, FPS = 24;  // post runs at 2x, then a 2x2 box downsample
const FILM = 125.6;                          // the whole film; ?from=&to= renders an excerpt (build.sh)
const QS = new URLSearchParams(location.search);
const FROM = +(QS.get('from') || 0), TO = +(QS.get('to') || FILM);
const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.autoClear = false;

// ---------------------------------------------------------------- random & noise (JS)
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const h2 = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
function vn2(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = h2(xi, yi), b = h2(xi + 1, yi), c = h2(xi, yi + 1), d = h2(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
const fbm1 = (x, s = 0) => { let r = 0, a = 0.5, f = 1; for (let i = 0; i < 4; i++) { r += a * (vn2(x * f, s + i * 7.3) - 0.5); f *= 2.1; a *= 0.5; } return r; };
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const ss = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };

// ---------------------------------------------------------------- geometry builder
class Builder {
  constructor() { this.p = []; this.n = []; this.c = []; this.t = []; this.ao = []; this.r = []; this.i = []; this.rv = -100; }
  get vc() { return this.p.length / 3; }
  v(p, n, c, t, ao = 1, rv = this.rv) { this.p.push(p.x, p.y, p.z); this.n.push(n.x, n.y, n.z); this.c.push(c[0], c[1], c[2]); this.t.push(t.x, t.y, t.z); this.ao.push(ao); this.r.push(rv); }
  geo() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('acol', new THREE.Float32BufferAttribute(this.c, 3));
    g.setAttribute('atan', new THREE.Float32BufferAttribute(this.t, 3));
    g.setAttribute('aao', new THREE.Float32BufferAttribute(this.ao, 1));
    g.setAttribute('arev', new THREE.Float32BufferAttribute(this.r, 1));
    g.setIndex(this.i);
    g.computeBoundingSphere();
    return g;
  }
}
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const UP = V(0, 1, 0);

// tube with per-point radius; rfn(i, angle) optional radius multiplier; cfn(i, k) colour
function tube(b, pts, rad, sides, cfn, rfn, aofn, rvfn) {
  const n = pts.length; if (n < 2) return;
  const base = b.vc;
  let T = pts[1].clone().sub(pts[0]).normalize();
  let N = Math.abs(T.y) < 0.9 ? V(0, 1, 0) : V(1, 0, 0);
  N.sub(T.clone().multiplyScalar(N.dot(T))).normalize();
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], c = pts[Math.min(n - 1, i + 1)];
    T = c.clone().sub(a).normalize();
    N.sub(T.clone().multiplyScalar(N.dot(T))).normalize();
    const B = T.clone().cross(N);
    for (let k = 0; k < sides; k++) {
      const ang = k / sides * Math.PI * 2;
      const d = N.clone().multiplyScalar(Math.cos(ang)).add(B.clone().multiplyScalar(Math.sin(ang)));
      const r = rad[i] * (rfn ? rfn(i, ang, d) : 1);
      b.v(pts[i].clone().add(d.clone().multiplyScalar(r)), d, cfn(i, k, d), T, aofn ? aofn(i, d) : 1, rvfn ? rvfn(i) : b.rv);
    }
  }
  for (let i = 0; i < n - 1; i++) for (let k = 0; k < sides; k++) {
    const k2 = (k + 1) % sides, a = base + i * sides + k, b1 = base + i * sides + k2, c = a + sides, d = b1 + sides;
    b.i.push(a, b1, c, b1, d, c);
  }
}
// append a three geometry with matrix + colour (fn of world pos & normal)
function append(b, geo, m, cfn, tan = UP, aofn) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  const pa = g.attributes.position, na = g.attributes.normal;
  const nm = new THREE.Matrix3().getNormalMatrix(m);
  const base = b.vc;
  for (let i = 0; i < pa.count; i++) {
    const p = V(pa.getX(i), pa.getY(i), pa.getZ(i)).applyMatrix4(m);
    const n = V(na.getX(i), na.getY(i), na.getZ(i)).applyMatrix3(nm).normalize();
    b.v(p, n, cfn(p, n), tan, aofn ? aofn(p, n) : 1);
    b.i.push(base + i);
  }
}
function chaikin(pts, rad, it = 1) {
  for (let r = 0; r < it; r++) {
    const P = [pts[0]], R = [rad[0]];
    for (let i = 0; i < pts.length - 1; i++) {
      P.push(pts[i].clone().lerp(pts[i + 1], 0.25), pts[i].clone().lerp(pts[i + 1], 0.75));
      R.push(lerp(rad[i], rad[i + 1], 0.25), lerp(rad[i], rad[i + 1], 0.75));
    }
    P.push(pts[pts.length - 1]); R.push(rad[rad.length - 1]);
    pts = P; rad = R;
  }
  return [pts, rad];
}

// ---------------------------------------------------------------- materials
const SHARED = { uPass: { value: 0 }, uTime: { value: 0 }, uWindT: { value: 0 }, uRefVP: { value: new THREE.Matrix4() }, uOut: { value: new THREE.Vector2(W, H) } };
const VS = /* glsl */`
attribute vec3 acol; attribute vec3 atan; attribute float aao; attribute float arev;
uniform float uWind, uWindT;
varying vec3 vN, vW, vC, vT; varying float vZ, vAO, vRev;
void main(){
  vec4 wp = modelMatrix*vec4(position,1.0);
  if(uWind > 0.5 && wp.z > -9.0 && wp.y > 0.0){   // grass and flowers lean in the wind (time stepped at 12 drawings a second)
    float g = 0.7*sin(uWindT*1.7 + wp.x*0.9 + wp.z*0.6) + 0.3*sin(uWindT*2.9 + wp.x*2.3 - wp.z*1.1);
    wp.x += 0.10*wp.y*wp.y*(0.35 + g);
  }
  vW = wp.xyz; vN = normalize(mat3(modelMatrix)*normal); vC = acol; vT = normalize(mat3(modelMatrix)*atan); vAO = aao; vRev = arev;
  vec4 mv = viewMatrix*wp; vZ = -mv.z;
  gl_Position = projectionMatrix*mv;
}`;
const FS = /* glsl */`
uniform mat4 projectionMatrix;
uniform float uTip, uPass, uId, uKind, uDirMode, uAngle, uOutline, uDens, uAspect, uTime, uDisc, uRevMode, uRevT, uRevD;
uniform vec3 uColor; uniform mat4 uRefVP; uniform vec2 uOut;
varying vec3 vN, vW, vC, vT; varying float vZ, vAO, vRev;
float h31(vec3 p){ p = fract(p*0.3183099+0.1); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float vn3(vec3 x){ vec3 i=floor(x), f=fract(x); f=f*f*(3.0-2.0*f);
  return mix(mix(mix(h31(i),h31(i+vec3(1,0,0)),f.x), mix(h31(i+vec3(0,1,0)),h31(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(h31(i+vec3(0,0,1)),h31(i+vec3(1,0,1)),f.x), mix(h31(i+vec3(0,1,1)),h31(i+vec3(1,1,1)),f.x),f.y), f.z); }
float fbm3(vec3 p){ float s=0.0, a=0.5; for(int i=0;i<4;i++){ s+=a*vn3(p); p=p*2.03+vec3(1.7,9.2,3.1); a*=0.5; } return s; }
vec2 vor3(vec3 p){ vec3 i=floor(p), f=fract(p); float d1=9.0, d2=9.0; float id=0.0;
  for(int z=-1;z<=1;z++) for(int y=-1;y<=1;y++) for(int x=-1;x<=1;x++){
    vec3 g=vec3(x,y,z); vec3 o=vec3(h31(i+g), h31(i+g+11.3), h31(i+g+27.1));
    float d=length(g+o-f); if(d<d1){ d2=d1; d1=d; id=h31(i+g+5.7);} else if(d<d2) d2=d; }
  return vec2(d2-d1, id); }
vec3 albedo(){
  vec3 c = uColor*vC;
  if(uKind==1.0){            // soil: clods, grit, faint banding
    float n = fbm3(vW*vec3(2.2,3.5,2.2));
    c *= 0.78+0.44*n;
    // round grains (sand, dark crumbs, grey grit) on the cut face
    for(int k=0;k<2;k++){
      float sc = k==0 ? 26.0 : 11.0;
      vec2 q = vW.xy*sc + vec2(vW.z*7.0, float(k)*17.0);
      vec2 ci = floor(q), cf = fract(q);
      float hh = h31(vec3(ci, float(k)*3.1));
      vec2 o = 0.32 + 0.36*vec2(h31(vec3(ci,5.0+float(k))), h31(vec3(ci,9.0+float(k))));
      float rr = (0.10 + 0.17*h31(vec3(ci,13.0)))*(k==0?1.0:0.8);
      vec2 dd = (cf - o)*vec2(1.0, 1.25);
      float m = 1.0 - smoothstep(rr*0.75, rr, length(dd));
      if(k==0){ if(hh>0.90) c = mix(c, vec3(0.86,0.72,0.50), 0.75*m); else if(hh<0.08) c = mix(c, c*0.5, m); }
      else if(hh>0.93) c = mix(c, vec3(0.64,0.62,0.60), 0.8*m);
    }
    c *= 0.92+0.08*sin(vW.y*26.0+n*7.0);
  } else if(uKind==2.0){     // bark ridges + moss
    float s = fbm3(vec3(vW.x*7.0, vW.y*0.9, vW.z*7.0));
    c *= 0.72+0.56*s;
    float m = fbm3(vW*2.6+4.0);
    if(m>0.56 && vW.y<1.4) c = mix(c, vec3(0.46,0.56,0.22), smoothstep(0.56,0.64,m)*0.8);
  } else if(uKind==3.0){     // foliage: leaf cells
    vec2 v = vor3(vW*6.5);
    c *= 0.78+0.42*v.y;
    c = mix(c, c*vec3(1.15,1.12,0.7), step(0.82, v.y)*0.6);
    c *= mix(0.62, 1.0, smoothstep(0.02, 0.14, v.x));
  } else if(uKind==4.0){     // ground surface
    c *= 0.82+0.36*fbm3(vW*vec3(1.4,1.0,2.5));
  } else if(uKind==5.0){     // stone: mottling + speckle
    c *= 0.85+0.3*fbm3(vW*9.0);
    if(h31(floor(vW*60.0))>0.94) c*=0.75;
  }
  return clamp(c, 0.0, 1.0);
}
float revealTime(){
  if(uRevMode < 0.5) return vRev;
  // a sweep across the cut face, left to right, with a ragged front
  float x = clamp((vW.x + 6.0)/14.0, 0.0, 1.0);
  return uRevT + uRevD*x + 0.10*(fbm3(vec3(vW.x*1.3, vW.y*2.0, 0.0)) - 0.5);
}
void main(){
  vec3 N = normalize(vN); if(!gl_FrontFacing) N = -N;
  vec3 vn = normalize((viewMatrix*vec4(N,0.0)).xyz);
  float rt = revealTime() + uTip*length(vn.xy);    // uTip: the middle of a root leads its edges → a rounded growing tip
  if(uDisc > 0.5 && uTime < rt) discard;          // not drawn yet: leave what is behind
  if(uPass > 2.5){                                 // pass 3: anchor (reference-camera pixel) + reveal time
    vec4 c = uRefVP*vec4(vW,1.0);
    vec2 px = (c.xy/c.w*0.5 + 0.5)*uOut;
    gl_FragColor = vec4(px, rt, 1.0); return;
  }
  if(uPass < 0.5){ gl_FragColor = vec4(albedo(), uId/255.0); return; }
  if(uPass < 1.5){
    vec3 L = normalize(vec3(-0.5,0.78,0.45));
    float d = dot(N,L);
    float l = 0.30 + 0.12*N.y + 0.66*smoothstep(-0.15, 0.85, d);
    if(uKind==3.0) l *= mix(0.62, 1.0, smoothstep(1.3, 3.4, vW.y));
    if(uKind==6.0) l = 1.0;           // mycelium: never shaded
    l *= vAO;
    gl_FragColor = vec4(clamp(l,0.0,1.0), vZ, vn.xy*0.5+0.5); return;
  }
  // pass 2: hatch direction (doubled angle), outline weight, density
  vec2 fx = vec2(cos(2.0*uAngle), sin(2.0*uAngle));
  vec2 dv = fx;
  if(uDirMode > 0.5 && uDirMode < 1.5){
    vec4 a = projectionMatrix*viewMatrix*vec4(vW,1.0);
    vec4 b = projectionMatrix*viewMatrix*vec4(vW+vT*0.05,1.0);
    vec2 s = (b.xy/b.w - a.xy/a.w)*vec2(uAspect,1.0);
    if(length(s) > 1e-6){ float an = atan(s.y, s.x); dv = vec2(cos(2.0*an), sin(2.0*an)); }
  } else if(uDirMode > 1.5){
    float k = clamp(length(vn.xy)*1.3, 0.0, 1.0);
    float an = atan(vn.y, vn.x) + 1.5708;
    dv = normalize(mix(fx, vec2(cos(2.0*an), sin(2.0*an)), k*0.75) + 1e-4);
  }
  gl_FragColor = vec4(dv*0.5+0.5, uOutline, uDens);
}`;
function mat({ id, kind = 0, color = [1, 1, 1], dir = 0, angle = 0.8, outline = 1, dens = 1, side = THREE.FrontSide, disc = 0, wind = 0, rev = null, tip = 0 }) {
  return new THREE.ShaderMaterial({
    vertexShader: VS, fragmentShader: FS, side,
    uniforms: {
      uPass: SHARED.uPass, uTime: SHARED.uTime, uWindT: SHARED.uWindT, uRefVP: SHARED.uRefVP, uOut: SHARED.uOut,
      uDisc: { value: disc }, uWind: { value: wind }, uTip: { value: tip },
      uRevMode: { value: rev ? 1 : 0 }, uRevT: { value: rev ? rev[0] : 0 }, uRevD: { value: rev ? rev[1] : 0 },
      uId: { value: id }, uKind: { value: kind }, uDirMode: { value: dir },
      uAngle: { value: angle }, uOutline: { value: outline }, uDens: { value: dens },
      uAspect: { value: W / H }, uColor: { value: new THREE.Color(...color) },
    },
  });
}
// ids: 0 sky · 1 hills · 2 ground · 3 grass · 4 trunk · 5 foliage · 6 litter strip · 7 topsoil · 8 subsoil · 9 weathered · 10 bedrock matrix
//      11 roots · 12 worms · 13 stones · 14 bedrock rocks · 15 mycelium · 16 mushrooms · 17 flowers · 18 leaves · 19 far trees · 20 tunnels

// ---------------------------------------------------------------- G-buffer targets
const IW = W * SS, IH = H * SS;
const mkRT = (type, filter) => new THREE.WebGLRenderTarget(IW, IH, { type, minFilter: filter, magFilter: filter, depthBuffer: true, generateMipmaps: false });
const rtA = mkRT(THREE.HalfFloatType, THREE.NearestFilter), rtL = mkRT(THREE.HalfFloatType, THREE.NearestFilter), rtD = mkRT(THREE.HalfFloatType, THREE.NearestFilter);
const rtR = mkRT(THREE.FloatType, THREE.NearestFilter);      // anchor pixel (full float: values up to ~3000 px) + reveal time
const rtP1 = mkRT(THREE.UnsignedByteType, THREE.LinearFilter), rtP2 = mkRT(THREE.UnsignedByteType, THREE.LinearFilter), rtC = mkRT(THREE.UnsignedByteType, THREE.LinearFilter);
const camera = new THREE.PerspectiveCamera(34, W / H, 0.02, 400);
const refCam = new THREE.PerspectiveCamera(34, W / H, 0.02, 400);
const PITCH = -0.06;                          // fixed orientation everywhere: inside a shot the camera only translates (strokes stay anchored)
const CQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(PITCH, 0, 0, 'YXZ'));
const TANP = Math.tan(-PITCH);

function setCamera(v) {
  camera.position.copy(v.pos); camera.quaternion.copy(CQ); camera.updateMatrixWorld(); camera.updateProjectionMatrix();
  refCam.position.copy(v.ref); refCam.quaternion.copy(CQ); refCam.updateMatrixWorld(); refCam.updateProjectionMatrix();
  SHARED.uRefVP.value.multiplyMatrices(refCam.projectionMatrix, refCam.matrixWorldInverse);
}
const proj = (v, cam = camera) => { const p = v.clone().project(cam); return [(p.x * 0.5 + 0.5) * W, (0.5 - p.y * 0.5) * H]; };
const camPos = t => views(t).main.pos;

// ---------------------------------------------------------------- overlay canvases: paper (tags, slips), graphite, coloured pencil
const tagC = document.createElement('canvas'), inkC = document.createElement('canvas'), colC = document.createElement('canvas'), OC = document.createElement('canvas');
for (const c of [tagC, inkC, colC, OC]) { c.width = W; c.height = H; }
const tg = tagC.getContext('2d'), ik = inkC.getContext('2d'), cl = colC.getContext('2d'), octx = OC.getContext('2d');
const tagT = new THREE.CanvasTexture(tagC), inkT = new THREE.CanvasTexture(inkC), colT = new THREE.CanvasTexture(colC);
const FONT = 'WK';
let GLY = null, BOIL = 0;
const hsh = (a, b = 0, c = 0) => h2(a * 1.731 + c * 0.377, b * 2.113 + c * 1.913);
const plen = P => { let L = 0; for (let i = 1; i < P.length; i++) L += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); return L; };
function textLayout(s, size, seed, o = {}) {
  const { jit = 1 } = o;
  ik.save(); ik.font = `${size}px ${FONT}`;
  const ch = [...s], ws = ch.map(c => ik.measureText(c).width); ik.restore();
  const R = mulberry(seed), rr = () => R() * 2 - 1;
  let cx = 0, L = 0; const chars = [], G = GLY.WK;
  ch.forEach((c, i) => {
    const dy = rr() * jit * size * 0.025, r = rr() * jit * 0.035;
    const sk = (G.g[c] || []).map(a => { const P = []; for (let j = 0; j < a.length; j += 2) P.push([a[j] * size, a[j + 1] * size]); return P; });
    const len = sk.map(plen).reduce((a, b) => a + b, 0) + sk.length * size * 0.12;
    chars.push({ c, ox: cx, dy, r, sk, len, L0: L }); L += len; cx += ws[i];
  });
  return { s, size, chars, L, hw: G.hw * size, tot: cx };
}
function textDraw(T, x, y, prog, alpha = 1) {   // write T at (x, y) (left, baseline) along its glyph skeletons up to prog
  const target = prog * T.L; if (target <= 0) return;
  ik.save(); ik.translate(x, y); ik.globalAlpha = alpha;
  ik.font = `${T.size}px ${FONT}`; ik.fillStyle = '#000'; ik.textBaseline = 'alphabetic';
  for (const C of T.chars) {
    if (C.L0 >= target) break;
    const part = target - C.L0;
    ik.save(); ik.translate(C.ox, C.dy); ik.rotate(C.r);
    if (part >= C.len || !C.sk.length) { ik.fillText(C.c, 0, 0); ik.restore(); continue; }
    const m = ik.getTransform();
    octx.setTransform(1, 0, 0, 1, 0, 0); octx.clearRect(0, 0, W, H);
    octx.setTransform(m); octx.font = ik.font; octx.fillStyle = '#000'; octx.textBaseline = 'alphabetic';
    octx.fillText(C.c, 0, 0);
    octx.globalCompositeOperation = 'destination-in'; octx.lineCap = 'round'; octx.lineJoin = 'round'; octx.lineWidth = T.hw * 2.9 + 1.5; octx.strokeStyle = '#000';
    let left = part; octx.beginPath();
    for (let k = 0; k < C.sk.length && left > 0; k++) {
      const P = C.sk[k]; octx.moveTo(P[0][0], P[0][1]); if (P.length === 1) octx.lineTo(P[0][0] + 0.1, P[0][1]);
      for (let j = 1; j < P.length && left > 0; j++) {
        const d = Math.hypot(P[j][0] - P[j - 1][0], P[j][1] - P[j - 1][1]);
        if (d <= left) { octx.lineTo(P[j][0], P[j][1]); left -= d; }
        else { const u = left / d; octx.lineTo(P[j - 1][0] + (P[j][0] - P[j - 1][0]) * u, P[j - 1][1] + (P[j][1] - P[j - 1][1]) * u); left = 0; }
      }
      left -= T.size * 0.12;
    }
    octx.stroke(); octx.globalCompositeOperation = 'source-over';
    ik.restore(); ik.save(); ik.setTransform(1, 0, 0, 1, 0, 0); ik.globalAlpha = alpha; ik.drawImage(OC, 0, 0); ik.restore();
  }
  ik.restore();
}
// a pencil line: fixed jitter per point (seeded) + a small boil (3 drawings); drawn up to prog of its length
function pline(c, pts, prog, w, seed, alpha = 1, col = '#000', dash = null) {
  if (prog <= 0 || pts.length < 2) return;
  const L = plen(pts);
  for (let pass = 0; pass < 2; pass++) {
    c.save(); c.globalAlpha = alpha * (pass ? 0.8 : 1); c.strokeStyle = col; c.lineWidth = w * (pass ? 0.65 : 1); c.lineCap = 'round'; c.lineJoin = 'round';
    if (dash) c.setLineDash(dash);
    c.beginPath(); let rem = prog * L;
    for (let i = 0; i < pts.length; i++) {
      const jx = (hsh(seed, i, pass) - 0.5) * 1.3 + (hsh(seed + 7, i, BOIL + 3 * pass) - 0.5) * 0.7;
      const jy = (hsh(seed + 3, i, pass) - 0.5) * 1.3 + (hsh(seed + 11, i, BOIL + 3 * pass) - 0.5) * 0.7;
      let [x, y] = pts[i];
      if (i) {
        const d = Math.hypot(x - pts[i - 1][0], y - pts[i - 1][1]);
        if (d > rem) { const u = rem / d; x = pts[i - 1][0] + (x - pts[i - 1][0]) * u; y = pts[i - 1][1] + (y - pts[i - 1][1]) * u; c.lineTo(x + jx, y + jy); break; }
        rem -= d; c.lineTo(x + jx, y + jy);
      } else c.moveTo(x + jx, y + jy);
    }
    c.stroke(); c.restore();
  }
}
const curve = (x0, y0, x1, y1, bend, n = 24) => {
  const pts = [], mx = (x0 + x1) / 2 - (y1 - y0) * bend, my = (y0 + y1) / 2 + (x1 - x0) * bend;
  for (let i = 0; i <= n; i++) { const s = i / n, a = (1 - s) * (1 - s), b = 2 * s * (1 - s), c = s * s; pts.push([a * x0 + b * mx + c * x1, a * y0 + b * my + c * y1]); }
  return pts;
};
const seg = (t, a, d) => clamp((t - a) / d, 0, 1);

// labels (few, on purpose): each knows its anchor, its times and how it leaves
const POST_FS = /* glsl */`
uniform sampler2D tA, tL, tD, tR, tFoc; uniform vec2 uRes, uRdC; uniform float uSS, uTime, uBoil, uRdT, uRdK;
varying vec2 vUv;
float h21(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
vec2 h22(vec2 p){ float n = h21(p); return vec2(n, h21(p+n*17.31+3.7)); }
float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(h21(i),h21(i+vec2(1,0)),f.x), mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x), f.y); }
float fbm(vec2 p){ float s=0.0, a=0.5; for(int i=0;i<4;i++){ s+=a*vn(p); p=p*2.03+17.1; a*=0.5; } return s; }
// paper tooth: fine grain + laid fibres + soft cockling
float tooth(vec2 p){
  float a = vn(p*0.68);
  vec2 q = mat2(0.94,-0.34,0.34,0.94)*p;
  float b = vn(q*vec2(0.11,0.85));
  float c = vn(p*0.23+3.1);
  return clamp(0.48*a + 0.3*b + 0.22*c, 0.0, 1.0);
}
float cov(float pr, float t){ return smoothstep(t-0.17, t+0.17, pr); }
float ramp(float e, float a, float b){ return clamp((e-a)/(b-a), 0.0, 1.0); }
// one pencil layer: patches of short parallel strokes, each patch slightly re-angled.
// amt (0..1) = how much of the layer has been drawn so far: each stroke has its own turn.
float hatch(vec2 p, float ang, float sp, float cs, float seed, float jit, float amt){
  if(amt <= 0.0) return 0.0;
  vec2 g = floor(p/cs); float acc = 0.0;
  for(int j=-1;j<=1;j++) for(int i=-1;i<=1;i++){
    vec2 c = g + vec2(float(i), float(j)); vec2 h = h22(c + seed*7.13);
    vec2 ctr = (c + 0.15 + 0.7*h)*cs;
    float a0 = ang + (h.x-0.5)*jit;
    vec2 d = vec2(cos(a0), sin(a0)), n = vec2(-d.y, d.x);
    vec2 q = p - ctr; float u = dot(q,d), v = dot(q,n);
    v += u*u*(h.y-0.5)*0.006;
    float w = 1.0 - smoothstep(cs*0.45, cs*0.92, length(q));
    float k = floor(v/sp), f = fract(v/sp);
    float r = h21(vec2(k, dot(c, vec2(7.0,13.0)) + seed));
    float r2 = h21(vec2(k*1.7 + seed, c.x - c.y*3.0));
    if(amt < 1.0){ float turn = h21(vec2(k*0.61 + seed*3.3, dot(c, vec2(3.1, 5.7)))); w *= step(turn, amt); }
    float L = cs*(0.75 + 0.7*r);
    float uu = u - (r2-0.5)*cs*0.7;
    float taper = smoothstep(-L*0.5, -L*0.5 + L*0.2, uu) * (1.0 - smoothstep(L*0.5 - L*0.3, L*0.5, uu));
    float hw = sp*(0.26 + 0.2*r2);
    float dd = abs(f-0.5)*sp;
    float prof = 1.0 - smoothstep(hw-0.55, hw+0.55, dd);
    float press = (0.72 + 0.28*r) * (0.85 + 0.15*sin(uu*0.08 + r*6.0));
    acc = max(acc, w*prof*taper*press);
  }
  return acc;
}
vec4 gA(vec2 uv){ return texture2D(tA, uv); }
void main(){
  vec2 p = gl_FragCoord.xy / uSS;              // output-pixel coordinates (y up), fixed to the screen
  vec4 A = gA(vUv), Lb = texture2D(tL, vUv), Db = texture2D(tD, vUv), Rb = texture2D(tR, vUv);
  float id = floor(A.a*255.0 + 0.5);
  vec3 alb = A.rgb; float light = Lb.r, vz = Lb.g;
  float ang = atan(Db.g*2.0-1.0, Db.r*2.0-1.0)*0.5;
  float ow = Db.b, dens = Db.a;
  float yN = vUv.y;
  vec2 pa = p; float ev = 100.0;                // anchor coords (strokes stick to surfaces) and time since this surface was drawn
  if(id > 0.5){ pa = Rb.rg; ev = uTime - Rb.b; }
  if(uRdT > -50.0) ev = min(ev, uTime - (uRdT + uRdK*length(p - uRdC)));   // a fresh drawing (the magnifier) spreads out from its centre
  float fo = texture2D(tFoc, vec2((id + 0.5)/32.0, 0.5)).r;            // focus: 1 = fully drawn, lower = a light wash behind
  // things that grow in (roots, worms, stones, hyphae, leaves) arrive already half coloured and finish fast,
  // so the growing tip never reads as a blank white stick on the soil
  if(id > 10.5 && id < 21.5 && id != 14.0 && id != 16.0 && id != 17.0 && id != 19.0) ev = ev*2.2 + 0.32;
  if(id < 0.5){                                 // sky: loose blue wash, clouds left as paper
    float cl = smoothstep(0.52, 0.72, fbm(p*vec2(0.0032, 0.008) + vec2(2.0, 5.0)));
    alb = mix(vec3(0.70,0.83,0.90), vec3(0.42,0.63,0.86), smoothstep(0.72, 1.0, yN));
    alb = mix(alb, vec3(0.97,0.96,0.93), cl*0.85);
    light = 0.93; ang = 0.32; ow = 0.0; dens = 0.85*(1.0 - cl*0.75); vz = 0.0;
  }
  float t = tooth(pa);
  alb = mix(mix(vec3(dot(alb, vec3(0.333))), alb, 0.6)*0.35 + vec3(0.62), alb, mix(0.25, 1.0, fo));
  dens *= mix(0.55, 1.0, fo);
  float lum = dot(alb, vec3(0.299, 0.587, 0.114));
  float dark = clamp(1.0 - light, 0.0, 1.0);
  float fog = smoothstep(22.0, 150.0, vz)*0.6;
  vec3 paper = vec3(0.972, 0.955, 0.918) * (0.965 + 0.035*fbm(p*0.006));
  alb = mix(alb, vec3(0.74, 0.82, 0.84), fog*0.35);
  dark *= 1.0 - fog*0.6;
  vec3 pig = clamp(sqrt(alb/paper), 0.0, 1.0);
  vec3 col = paper;
  float hi = smoothstep(0.78, 0.98, light);
  // how far each of the four layers has been drawn on this surface
  float r0 = ramp(ev, 0.0, 0.42), r1 = ramp(ev, 0.10, 0.62)*mix(0.6, 1.0, fo), r2 = ramp(ev, 0.30, 0.90)*fo, r3 = ramp(ev, 0.50, 1.15)*fo*fo;
  vec2 bq = mat2(0.8,-0.6,0.6,0.8)*pa;
  float g0 = smoothstep(0.0, 0.14, r0*1.2 - vn(bq*vec2(0.03, 0.11)));
  // L0 underlayer: soft side-of-the-lead fill
  float c0 = cov((0.52 + 0.28*(1.0-lum) - 0.22*hi) * dens * (1.0 - 0.25*fog), t) * g0;
  col *= mix(vec3(1.0), pig, c0);
  // L1 local colour, strokes along the hatch direction
  float h1 = hatch(pa, ang, 4.4, 40.0, 1.0, 0.55, r1);
  float c1 = cov(h1 * (0.82 + 0.4*(1.0-lum) - 0.25*hi) * dens * (1.0 - 0.35*fog), t*0.92);
  col *= mix(vec3(1.0), pig, c1);
  // L2 shading: cross strokes in a darker, cooler version of the colour
  vec3 sh = clamp(alb*alb*vec3(0.95, 0.92, 1.08) + vec3(0.0, 0.0, 0.03), 0.0, 1.0);
  float h2 = hatch(pa, ang + 1.0, 3.8, 34.0, 2.0, 0.6, r2);
  float c2 = cov(h2 * smoothstep(0.1, 0.6, dark) * 1.3 * dens, t);
  col *= mix(vec3(1.0), sqrt(sh), c2);
  // L3 deepest accents: sepia/indigo, a third angle
  float h3 = hatch(pa, ang - 0.55, 3.2, 26.0, 3.0, 0.4, r3);
  float c3 = cov(h3 * smoothstep(0.42, 0.85, dark) * 1.15 * dens, t*1.05);
  col *= mix(vec3(1.0), mix(vec3(0.46, 0.36, 0.34), vec3(0.36, 0.38, 0.5), 0.35), c3);

  // contour lines: id / depth / normal breaks, sampled through a wobble anchored to the surface,
  // plus a small boil (a new drawing every 2 frames, 3 drawings cycled)
  vec2 px = 1.0/uRes;
  vec2 bo = vec2(uBoil*3.7, uBoil*1.9);
  vec2 wob = (vec2(vn(pa*0.045), vn(pa*0.045 + 9.3)) - 0.5) * 2.0 + (vec2(vn(pa*0.07 + bo), vn(pa*0.07 + 5.1 + bo)) - 0.5) * 1.5;
  vec2 uv0 = vUv + wob*uSS*px;
  vec4 A0 = gA(uv0), L0 = texture2D(tL, uv0); float ow0 = texture2D(tD, uv0).b;
  float id0 = floor(A0.a*255.0 + 0.5);
  float e = 0.0;
  for(int k=0;k<4;k++){
    vec2 o = k==0 ? vec2(1,0) : k==1 ? vec2(-1,0) : k==2 ? vec2(0,1) : vec2(0,-1);
    vec2 uv1 = uv0 + o*1.25*uSS*px;
    vec4 A1 = gA(uv1), L1 = texture2D(tL, uv1); float ow1 = texture2D(tD, uv1).b;
    float id1 = floor(A1.a*255.0 + 0.5);
    float de = step(0.5, abs(id1 - id0));
    float z0 = max(L0.g, 1e-3), z1 = max(L1.g, 1e-3);
    if(id0 < 0.5) z0 = 400.0; if(id1 < 0.5) z1 = 400.0;
    de = max(de, smoothstep(0.012, 0.035, abs(z1 - z0)/min(z0, z1)));
    de = max(de, 0.6*smoothstep(0.35, 0.75, length(L1.ba - L0.ba)*2.0));
    float wgt = (z1 < z0) ? ow1 : ow0;     // the nearer surface owns the line
    e = max(e, de * wgt);
  }
  // lines appear with their surface; soil horizons are pencilled in faintly from the start
  float ev0 = id0 > 0.5 ? uTime - texture2D(tR, uv0).b : 100.0;
  if(uRdT > -50.0) ev0 = min(ev0, uTime - (uRdT + uRdK*length(p - uRdC)) + 0.1);
  float fo0 = texture2D(tFoc, vec2((id0 + 0.5)/32.0, 0.5)).r;
  float lg = smoothstep(0.0, 0.12, ramp(ev0, -0.05, 0.3)*1.15 - vn(pa*0.035 + 2.0));
  if(id0 > 5.5 && id0 < 10.5) lg = max(lg, 0.4);
  e *= lg * (1.0 - fog*0.55) * mix(0.3, 1.0, fo0);
  vec3 lineCol = mix(alb*0.32, vec3(0.20, 0.14, 0.11), 0.55);
  float lc = cov(e * (0.62 + 0.38*vn(pa*0.11 + 4.0)), t*0.72);
  col *= mix(vec3(1.0), lineCol, lc*0.82);

  float lu = dot(col, vec3(0.299, 0.587, 0.114));
  col = clamp(mix(vec3(lu), col, 1.12), 0.0, 1.0);
  gl_FragColor = vec4(col, 1.0);
}`;
const COMP_FS = /* glsl */`
uniform sampler2D tV1, tV2, tTag, tInk, tCol; uniform vec4 uIris; uniform vec2 uLabOff; uniform float uSS, uLabS;
varying vec2 vUv;
float h21(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(h21(i),h21(i+vec2(1,0)),f.x), mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x), f.y); }
float tooth(vec2 p){
  float a = vn(p*0.68); vec2 q = mat2(0.94,-0.34,0.34,0.94)*p; float b = vn(q*vec2(0.11,0.85)); float c = vn(p*0.23+3.1);
  return clamp(0.48*a + 0.3*b + 0.22*c, 0.0, 1.0);
}
float cov(float pr, float t){ return smoothstep(t-0.17, t+0.17, pr); }
void main(){
  vec2 p = gl_FragCoord.xy / uSS;                         // output pixels, y up
  vec3 col = texture2D(tV1, vUv).rgb;
  if(uIris.w > 0.5){                                      // the magnifier: inside the ring, the other view
    vec2 c = vec2(uIris.x, ${H}.0 - uIris.y);
    float d = length(p - c);
    col = mix(texture2D(tV2, vUv).rgb, col, smoothstep(uIris.z - 0.8, uIris.z + 0.8, d));
  }
  vec2 pl = p*uLabS + uLabOff; float tl = tooth(pl);
  // coloured pencil (amber path), paper (tags, slips, halos), graphite (writing, lines)
  vec4 cc = texture2D(tCol, vUv);
  if(cc.a > 0.0) col *= mix(vec3(1.0), cc.rgb/max(cc.a, 1e-3), cc.a*(0.75 + 0.25*cov(0.85, tl)));
  float tag = texture2D(tTag, vUv).a, ink = texture2D(tInk, vUv).a;
  if(tag + ink > 0.0){
    vec3 tp = vec3(0.975, 0.95, 0.88) * (0.955 + 0.045*tl);
    col = mix(col, tp, tag);
    col *= mix(vec3(1.0), vec3(0.22, 0.17, 0.14), ink * (0.82 + 0.18*cov(0.8, tl*0.6)));
  }
  gl_FragColor = vec4(col, 1.0);
}`;
const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
const qScene = new THREE.Scene(); qScene.add(quad);
const qCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const QVS = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const focData = new Float32Array(32 * 4), focTex = new THREE.DataTexture(focData, 32, 1, THREE.RGBAFormat, THREE.FloatType);
focTex.minFilter = focTex.magFilter = THREE.NearestFilter;
const postMat = new THREE.ShaderMaterial({
  vertexShader: QVS, fragmentShader: POST_FS,
  uniforms: { tA: { value: rtA.texture }, tL: { value: rtL.texture }, tD: { value: rtD.texture }, tR: { value: rtR.texture }, tFoc: { value: focTex },
    uRes: { value: new THREE.Vector2(IW, IH) }, uSS: { value: SS }, uTime: SHARED.uTime, uBoil: { value: 0 },
    uRdT: { value: -100 }, uRdC: { value: new THREE.Vector2() }, uRdK: { value: 0 } },
});
const compMat = new THREE.ShaderMaterial({
  vertexShader: QVS, fragmentShader: COMP_FS,
  uniforms: { tV1: { value: rtP1.texture }, tV2: { value: rtP2.texture }, tTag: { value: tagT }, tInk: { value: inkT }, tCol: { value: colT },
    uIris: { value: new THREE.Vector4() }, uLabOff: { value: new THREE.Vector2() }, uLabS: { value: 1 }, uSS: { value: SS } },
});
const downMat = new THREE.ShaderMaterial({
  vertexShader: QVS, uniforms: { tP: { value: rtC.texture }, uPx: { value: new THREE.Vector2(1 / IW, 1 / IH) } },
  fragmentShader: `uniform sampler2D tP; uniform vec2 uPx; varying vec2 vUv;
  void main(){ vec3 c = texture2D(tP, vUv).rgb*0.5 + 0.125*(texture2D(tP, vUv+vec2(uPx.x*1.5,0.)).rgb + texture2D(tP, vUv-vec2(uPx.x*1.5,0.)).rgb + texture2D(tP, vUv+vec2(0.,uPx.y*1.5)).rgb + texture2D(tP, vUv-vec2(0.,uPx.y*1.5)).rgb);
  gl_FragColor = vec4(c, 1.0); }`,
});

// ---------------------------------------------------------------- render
function pass(n, rt, clear) {
  SHARED.uPass.value = n;
  renderer.setRenderTarget(rt);
  renderer.setClearColor(new THREE.Color(clear[0], clear[1], clear[2]), clear[3]);
  renderer.clear(true, true, true);
  renderer.render(scene, camera);
}
function renderView(v, out) {
  setCamera(v);
  const hide = v.hide || [];
  for (const o of scene.children) if (!o.userData.grain) o.visible = !hide.includes(o.material.uniforms.uId.value);
  focData.fill(1); for (const [k, f] of Object.entries(v.focus || {})) focData[+k * 4] = f;
  focTex.needsUpdate = true;
  const rd = v.redraw; postMat.uniforms.uRdT.value = rd ? rd.t : -100;
  if (rd) { postMat.uniforms.uRdC.value.set(rd.cx, H - rd.cy); postMat.uniforms.uRdK.value = rd.k; }
  pass(0, rtA, [0, 0, 0, 0]);
  pass(1, rtL, [1, 400, 0.5, 0.5]);
  pass(2, rtD, [Math.cos(0.64) * 0.5 + 0.5, Math.sin(0.64) * 0.5 + 0.5, 0, 0.6]);
  pass(3, rtR, [0, 0, -100, 0]);
  const dbg = QS.get('dbg');
  if (dbg) { quad.material = downMat; downMat.uniforms.tP.value = [rtA, rtL, rtD, rtR][+dbg].texture; renderer.setRenderTarget(out); renderer.render(qScene, qCam); downMat.uniforms.tP.value = rtC.texture; return; }
  quad.material = postMat; renderer.setRenderTarget(out); renderer.render(qScene, qCam);
}
function labelTooth(v) {                      // paper tooth for overlay marks: the page plane seen by the reference vs the current camera
  setCamera(v);
  const P0 = V(camera.position.x, camera.position.y, 0.3), P1 = P0.clone().add(V(1, 1, 0));
  const a0 = P0.clone().project(refCam), b0 = P0.clone().project(camera), a1 = P1.clone().project(refCam), b1 = P1.clone().project(camera);
  const sc = (a1.x - a0.x) / (b1.x - b0.x);
  compMat.uniforms.uLabS.value = sc;
  compMat.uniforms.uLabOff.value.set((a0.x * 0.5 + 0.5) * W - sc * (b0.x * 0.5 + 0.5) * W, (a0.y * 0.5 + 0.5) * H - sc * (b0.y * 0.5 + 0.5) * H);
}
// ================================================================ THE SCENE: Tenet, as a colored-pencil cutaway (see TREATMENT.md)
// Every drawn-in object gets a reveal time (its arev); the post pass draws its four pencil layers after that.
// Accents are the only colours that carry meaning: amber = the orange trinket; cobalt = inverted things; red = the Algorithm.
const scene = new THREE.Scene();
const add = (geo, m) => { const o = new THREE.Mesh(geo, m); o.frustumCulled = false; scene.add(o); return o; };
const REF0 = V(0, 0.4, 16.4);                     // the one reference camera: every anchor is projected through it
const AMBER = '#E8A21E', COBALT = '#2B5FB3', RED = '#C8302A';

// ---------------------------------------------------------------- timing: every visual is keyed to a narration line
let S = [], D = [];                                // start / duration of each narration line (film seconds)
const Lt = (i, f) => S[i - 1] + f * (D[i - 1] + 0.3);   // i = 1..15, f = 0..1 through that line
const LEND = i => S[i - 1] + D[i - 1] + 0.3;
const TITLE_T = [0.2, 3.6];

// ---------------------------------------------------------------- geometry helpers
function addGeo(b, geo, pos = V(0, 0, 0), rot = [0, 0, 0], sc = [1, 1, 1], cfn = () => [1, 1, 1]) {
  const m = new THREE.Matrix4().compose(pos, new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)), new THREE.Vector3(...sc));
  append(b, geo, m, cfn, UP);
}
const box = (b, x0, x1, y0, y1, z0, z1) => addGeo(b, new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), V((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2));
const cyl = (b, p, rt, rb, h, rot = [0, 0, 0]) => addGeo(b, new THREE.CylinderGeometry(rt, rb, h, 12), p, rot);
const sph = (b, p, r) => addGeo(b, new THREE.SphereGeometry(r, 14, 10), p);
function group(b, id, kind, color, rev = null, extra = {}) {
  return add(b.geo(), mat(Object.assign({ id, kind, color, disc: 1, rev }, extra)));
}
// a stand-in figure: a silhouette, no likeness. raise = 0..1 arm raised; lean = small tilt
function figure(b, x, z, s = 1, o = {}) {
  const raise = o.raise || 0, lean = o.lean || 0;
  const g = new THREE.Group();
  const p = (y, pos, rot, geo) => { const m = new THREE.Matrix4().compose(V(x + pos[0] * s, y + pos[1] * s, z + pos[2] * s), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)), new THREE.Vector3(s, s, s)); append(b, geo, m, () => [1, 1, 1], UP); };
  p(0, [0, 0.16, 0], [0, lean, 0], new THREE.SphereGeometry(0.16, 14, 10));                         // head
  p(0, [0, 0.95, 0], [0, 0, lean * 0.6], new THREE.CylinderGeometry(0.2, 0.27, 0.9, 12));           // torso
  for (const sd of [-1, 1]) {
    p(0, [sd * 0.31, 0.95, 0], [0, 0, sd * (0.12 - raise * 0.5)], new THREE.CylinderGeometry(0.065, 0.065, 0.78, 8));  // arms
    if (raise > 0 && sd > 0) p(0, [0.31 + 0.2 * raise, 1.42 + 0.34 * raise, 0], [0, 0, -0.9 * raise], new THREE.CylinderGeometry(0.06, 0.06, 0.6, 8));
    p(0, [sd * 0.13, 0.42, 0], [0, 0, sd * 0.04], new THREE.CylinderGeometry(0.09, 0.08, 0.88, 8)); // legs
  }
  return g;
}
// one stand-in figure as its own drawn object (id = its outline)
function drawFigure(id, x, z, s, t0, o = {}) { const b = new Builder(); b.rv = t0; figure(b, x, z, s, o); return group(b, id, 0, o.color || [0.07, 0.06, 0.06], null, { dir: 1 }); }
// a soil horizon: a slab between two wavy edges, seen from the front (cut face at z = 0); swept left to right
function slab(id, color, top, bot, t0, dur) {
  const NX = 90, b = new Builder(); b.rv = -100;
  for (let i = 0; i <= NX; i++) {
    const x = X0 + (X1 - X0) * i / NX;
    b.v(V(x, top(x), 0), V(0, 0, 1), [1, 1, 1], V(1, 0, 0), 1, t0 + dur * (x - X0) / (X1 - X0));
    b.v(V(x, bot(x), 0), V(0, 0, 1), [1, 1, 1], V(1, 0, 0), 1, t0 + dur * (x - X0) / (X1 - X0));
  }
  for (let i = 0; i < NX; i++) { const a = 2 * i, bb = a + 1, c = a + 2, d = a + 3; b.i.push(a, bb, c, bb, d, c); }
  return add(b.geo(), mat({ id, kind: 1, color, disc: 1, rev: [t0, dur] }));
}
const X0 = -10, X1 = 10;
const topsoil = x => 0.0 - 0.02 * (0.5 + 0.5 * Math.sin(x * 0.9));
const subsoil = x => -0.7 + 0.12 * Math.sin(x * 0.55 + 1.0);
const weathered = x => -2.5 + 0.18 * Math.sin(x * 0.4 + 2.0);
const bedrock = x => -3.7 + 0.14 * Math.sin(x * 0.3 + 0.5);
const BOTTOM = x => -4.6;

// accent helpers (coloured pencil, drawn over the picture on the overlay): project world points with the main camera
function scrPts(P) { return P.map(v => proj(v, camera)); }
function arcPts(c0, r, a0, a1, z = 0, n = 40) { const P = []; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; P.push(V(c0.x + Math.cos(a) * r, c0.y + Math.sin(a) * r, z)); } return P; }
function polyCurve(P, n = 30) { const out = []; for (let i = 0; i < n; i++) { const u = i / (n - 1) * (P.length - 1), k = Math.min(P.length - 2, Math.floor(u)), f = u - k; out.push(P[k].clone().lerp(P[k + 1], f)); } return out; }

// ---------------------------------------------------------------- the world: built once, every object drawn in at its time
let WORLD = {};
function buildWorld() {
  // soil horizons: topsoil, subsoil, weathered, bedrock (blue-grey)
  slab(7, [0.30, 0.19, 0.11], topsoil, subsoil, Lt(2, 0.00), 2.2);
  slab(8, [0.74, 0.46, 0.23], subsoil, weathered, Lt(2, 0.12), 2.2);
  slab(9, [0.70, 0.55, 0.36], weathered, bedrock, Lt(2, 0.24), 2.2);
  slab(10, [0.44, 0.49, 0.58], bedrock, BOTTOM, Lt(2, 0.34), 2.2);
  // ground surface strip along the top edge (grass)
  { const b = new Builder(); b.rv = Lt(2, 0.0); const NX = 90;
    for (let i = 0; i <= NX; i++) { const x = X0 + (X1 - X0) * i / NX; b.v(V(x, 0.0, 0), V(0, 0, 1), [1, 1, 1], V(1, 0, 0), 1, Lt(2, 0.0) + 2.2 * (x - X0) / (X1 - X0)); b.v(V(x, topsoil(x) - 0.02, 0), V(0, 0, 1), [1, 1, 1], V(1, 0, 0), 1, Lt(2, 0.0) + 2.2 * (x - X0) / (X1 - X0)); }
    for (let i = 0; i < NX; i++) { const a = 2 * i, bb = a + 1, c = a + 2, d = a + 3; b.i.push(a, bb, c, bb, d, c); }
    add(b.geo(), mat({ id: 2, kind: 4, color: [0.55, 0.67, 0.27], disc: 1, rev: [Lt(2, 0.0), 2.2] })); }
  // the opera house (fictional), above ground, behind the cut
  { const b = new Builder(); b.rv = Lt(2, 0.36);
    box(b, -4.5, 4.5, 0, 3.0, -9.5, -7.0); box(b, -5.2, 5.2, 3.0, 3.4, -9.9, -6.6);
    for (let i = 0; i < 8; i++) cyl(b, V(-3.9 + i * 1.1, 1.5, -6.6), 0.13, 0.13, 3.0);
    box(b, -2.4, 2.4, 3.4, 4.6, -8.6, -7.7); cyl(b, V(0, 5.0, -8.2), 0.04, 0.04, 1.0);
    group(b, 13, 5, [0.92, 0.88, 0.80], null); }
  // the masked stand-in soldier with the orange trinket
  WORLD.soldier = drawFigure(18, -1.8, -1.2, 1.0, Lt(2, 0.6), { raise: 1, color: [0.07, 0.06, 0.06] });
  // trinket: a small object in the figure's hand, in amber (accent 1)
  { const b = new Builder(); b.rv = Lt(2, 0.7); sph(b, V(-1.25, 1.55, -1.2), 0.1); WORLD.trinket = group(b, 19, 0, [0.95, 0.62, 0.15], null); }
  // the bullet: a grain on a thread (drawn, not glowing), moves backward into the gun barrel
  makeGrain(Lt(2, 0.72), Lt(2, 0.95), [V(-4.0, 1.1, -7.2), V(-0.9, 1.1, -1.2)]);   // the bullet flies backward: wall -> gun
  // loyalty test: a table with a lever, in a magnifier (inner view)
  { const b = new Builder(); b.rv = Lt(3, 0.15); const X = -4.3; box(b, X - 1.2, X + 1.2, -0.45, -0.35, -1.0, 1.0); cyl(b, V(X, -0.1, 0), 0.07, 0.07, 0.6); cyl(b, V(X + 0.42, 0.45, 0), 0.04, 0.04, 0.5, [0, 0, 0.6]); box(b, X - 0.9, X - 0.5, -0.45, -0.34, -0.9, -0.6);
    group(b, 13, 5, [0.78, 0.74, 0.70], null); }
  WORLD.loyalty = drawFigure(21, -4.3, -0.8, 1.0, Lt(3, 0.5), { raise: 0.3 });
  // inversion: the stone in the soil (its entropy arrow is the cobalt overlay)
  { const b = new Builder(); b.rv = Lt(4, 0.1); sph(b, V(-6.5, -2.2, 0.25), 0.55); sph(b, V(-5.6, -2.9, 0.25), 0.36); WORLD.stone = group(b, 14, 5, [0.62, 0.62, 0.66], null); }
  // Sator's vault below ground, with gold (ochre) and a figure inside (stand-in)
  { const b = new Builder(); b.rv = Lt(5, 0.12); box(b, 2.8, 7.8, -3.0, -1.4, 0.04, 0.6); group(b, 22, 1, [0.20, 0.16, 0.14], null, { dir: 1 });
    const g = new Builder(); g.rv = Lt(5, 0.2); for (let i = 0; i < 6; i++) box(g, 3.2 + (i % 3) * 1.3, 4.1 + (i % 3) * 1.3, -2.9 + Math.floor(i / 3) * 0.45, -2.6 + Math.floor(i / 3) * 0.45, 0.1, 0.45); group(g, 23, 5, [0.90, 0.72, 0.36], null); }
  WORLD.sator = drawFigure(21, 5.3, 0.2, 0.55, Lt(5, 0.3), { raise: 0 });
  // the Algorithm: nine rings around a core, drawn one at a time (red accent overlay)
  WORLD.rings = [];
  for (let i = 0; i < 9; i++) { const b = new Builder(); b.rv = Lt(6, 0.05 + i * 0.07); const r = 0.7 + i * 0.24; const P = []; for (let k = 0; k <= 48; k++) { const a = k / 48 * Math.PI * 2; P.push(V(-1.2 + Math.cos(a) * r, -2.4 + Math.sin(a) * r, 0.25)); }
    const [pp, rr] = chaikin(P, P.map(() => 0.035), 1); tube(b, pp, rr, 6, () => [1, 1, 1], null, null, null); WORLD.rings.push(group(b, 17, 5, [0.55, 0.36, 0.30], null)); }
  { const b = new Builder(); b.rv = Lt(6, 0.0); sph(b, V(-1.2, -2.4, 0.25), 0.28); group(b, 17, 5, [0.32, 0.30, 0.34], null); }
  // Neil and Kat: two stand-in figures step in beside the agent
  WORLD.neil = drawFigure(24, -2.8, 0.6, 0.95, Lt(7, 0.1), { lean: 0.05 });
  WORLD.kat = drawFigure(26, 2.6, 0.7, 0.95, Lt(7, 0.3), { lean: -0.05 });
  // the freeport warehouse (cutaway) and the falling aircraft (stylised, no livery)
  { const b = new Builder(); b.rv = Lt(8, 0.0); box(b, 3.0, 7.5, 0.0, 2.6, -3.0, -1.0); box(b, 3.0, 7.5, 2.6, 2.75, -3.0, -1.0); group(b, 27, 5, [0.82, 0.78, 0.70], null); }
  WORLD.plane = (() => { const b = new Builder(); b.rv = Lt(8, 0.1); cyl(b, V(0, 0, 0), 0.22, 0.22, 3.2, [0, 0, Math.PI / 2]); box(b, -0.3, 0.3, -0.05, 0.05, -1.5, 1.5); box(b, -0.5, 0.5, -0.02, 0.02, -2.0, 2.0); return group(b, 28, 5, [0.92, 0.92, 0.94], null); })();
  // the highway (flat road cutaway) and the cars
  { const b = new Builder(); b.rv = Lt(9, 0.0); box(b, -10, 10, -0.06, 0.02, -6.5, -5.2); group(b, 25, 5, [0.36, 0.36, 0.40], null); }
  WORLD.cars = [0, 1, 2].map(i => { const b = new Builder(); b.rv = Lt(9, 0.05); box(b, -0.5, 0.5, 0.0, 0.25, -6.2, -5.6); return group(b, 25, 5, [0.20 + 0.1 * i, 0.22, 0.26], null); });
  WORLD.sator9 = drawFigure(21, -4.2, -5.0, 1.0, Lt(9, 0.0), {});
  makeGrain(Lt(9, 0.55), Lt(9, 0.8), [V(3.6, 1.0, -5.0), V(-4.2, 1.0, -5.0)]);   // the inverted bullet: Kat -> Sator
  WORLD.kat9 = drawFigure(26, 3.6, -5.0, 1.0, Lt(9, 0.0), {});
  // the turnstile (in the magnifier): a post, three arms
  { const b = new Builder(); b.rv = Lt(10, 0.0); cyl(b, V(-5, 0.8, -2), 0.12, 0.12, 1.6); for (let k = 0; k < 3; k++) { const a = k * 2.094; cyl(b, V(-5 + Math.cos(a) * 0.5, 0.8, -2 + Math.sin(a) * 0.5), 0.05, 0.05, 1.0, [Math.PI / 2, 0, a]); } group(b, 29, 5, [0.70, 0.72, 0.76], null); }
  WORLD.pass1 = drawFigure(21, -5.6, -2.0, 0.7, Lt(10, 0.1), {}); WORLD.pass2 = drawFigure(24, -4.4, -2.0, 0.7, Lt(10, 0.1), {});
  // the yacht (hull, floating on a blue-grey sea) and the sea
  { const b = new Builder(); b.rv = Lt(11, 0.05); box(b, 2.5, 6.5, 0.0, 0.5, -3.6, -2.4); box(b, 3.4, 5.6, 0.5, 1.0, -3.4, -2.6); box(b, 5.4, 5.7, 0.9, 2.6, -3.1, -2.9); group(b, 30, 5, [0.92, 0.90, 0.86], null); }
  WORLD.sator11 = drawFigure(21, 4.4, -3.0, 0.6, Lt(11, 0.15), { raise: 0.5 });
  // the Stalsk-12 dome (a concrete dome in section) on the ground, to the left
  { const b = new Builder(); b.rv = Lt(11, 0.3); const DG = new THREE.SphereGeometry(3.0, 26, 14, 0, Math.PI * 2, 0, Math.PI / 2); addGeo(b, DG, V(-6, 0, -2.0), [0, 0, 0]); group(b, 32, 5, [0.78, 0.76, 0.70], null); }
  // the pincer's soldiers: forward (red accent) from the left, inverted (cobalt accent) from the right; all stand-ins
  WORLD.fwd = [0, 1, 2].map(i => drawFigure(33, -10 + i * 0.6, -1.2 + i * 0.35, 0.8, Lt(12, 0.1), {}));
  WORLD.inv = [0, 1, 2].map(i => drawFigure(34, 9 - i * 0.6, -1.2 + i * 0.35, 0.8, Lt(12, 0.1), {}));
  // the inverted soldier who takes the bullet, in front of the agent
  WORLD.saviour = drawFigure(34, 0.6, 0.5, 0.95, Lt(13, 0.4), { raise: 0 });
  // the algorithm is pulled out of the dome: its rings (WORLD.rings) lift on Lt(13, .2..0.5)
  // the trinket on Neil's bag
  { const b = new Builder(); b.rv = Lt(14, 0.0); box(b, -3.6, -2.2, 0.8, 1.6, 0.4, 0.9); WORLD.bag = group(b, 35, 5, [0.25, 0.20, 0.16], null); }
  { const b = new Builder(); b.rv = Lt(14, 0.0); sph(b, V(-2.9, 1.0, 0.95), 0.1); WORLD.trinket2 = group(b, 19, 0, [0.95, 0.62, 0.15], null); }
}

// ---------------------------------------------------------------- camera (translations only, fixed pitch: the strokes stay anchored)
const KF = [];                                       // [t, x, y, z] keys for the main camera
function camAt(t) {
  const K = [
    [0, 0, 0.4, 16.4],
    [Lt(4, 0.0), 0, 0.4, 16.4], [Lt(4, 0.9), 0, -1.6, 15.2],
    [Lt(5, 0.0), -1, -1.6, 15.0], [Lt(5, 0.9), 2, -1.0, 14.2],
    [Lt(6, 0.0), 0, -0.8, 14.8], [Lt(6, 0.9), 0, -0.4, 17.0],
    [Lt(7, 0.0), 0, -0.2, 17.0], [Lt(7, 0.9), 0, 0.2, 16.4],
    [Lt(8, 0.0), 2, 0.4, 16.4], [Lt(8, 0.9), -3, 0.4, 16.4],
    [Lt(9, 0.0), -4, 0.4, 16.4], [Lt(9, 0.9), 4, 0.4, 16.4],
    [Lt(11, 0.0), 0, 0.4, 16.4], [Lt(11, 0.9), 1, -1.2, 15.6],
    [Lt(12, 0.0), 0, -0.4, 16.0], [Lt(12, 0.9), 0, -0.4, 16.2],
    [Lt(13, 0.0), 0, -0.4, 16.2], [Lt(13, 0.9), 0, -0.4, 16.4],
    [Lt(15, 0.0), 0, -0.4, 16.4], [Lt(15, 0.7), 0, 0.2, 20.5], [1e9, 0, 0.2, 20.5]];
  if (t <= K[0][0]) return V(K[0][1], K[0][2], K[0][3]);
  for (let i = 0; i < K.length - 1; i++) {
    const [t0, x0, y0, z0] = K[i], [t1, x1, y1, z1] = K[i + 1];
    if (t >= t0 && t <= t1) { const u = ss(seg(t, t0, Math.max(1e-3, t1 - t0))); return V(lerp(x0, x1, u), lerp(y0, y1, u), lerp(z0, z1, u)); }
  }
  const L = K[K.length - 1]; return V(L[1], L[2], L[3]);
}
const camPosAt = t => { const p = camAt(t); return V(p.x, p.y - 0.4, p.z); };   // composition: ground line at mid-frame
// magnifiers (iris): a pencilled circle grows around a detail; inside it the inset view (closer, anchored at its own scale)
const IRIS_DEF = () => [
  { t0: Lt(3, 0.3), t1: Lt(3, 0.85), cx: 960, cy: 520, r: 380, pos: V(-4.3, 0.8, 4.2) },
  { t0: Lt(10, 0.2), t1: Lt(10, 0.85), cx: 620, cy: 560, r: 420, pos: V(-5, 1.2, 4.2) },
  { t0: Lt(14, 0.2), t1: Lt(14, 0.9), cx: 900, cy: 600, r: 380, pos: V(-2.9, 1.6, 4.6) },
];
function irisAt(t) {
  for (const I of IRIS_DEF()) if (t >= I.t0 && t <= I.t1 + 0.2) { const k = ss(seg(t, I.t0, 0.4)) * (1 - ss(seg(t, I.t1, 0.2))); return { ...I, rad: I.r * k }; }
  return null;
}
// the wash and the un-drawing: a thing that is undone (inverted and lost) loses its focus, becoming a light pale outline
const FOCUS_DEF = () => [   // [id, t0, t1, from, to]  (focus 1 = fully drawn)
  [14, Lt(4, 0.8), Lt(4, 1.0), 1, 0.25],
  [26, Lt(9, 0.8), Lt(9, 1.0), 1, 0.2],
  [34, Lt(13, 0.75), Lt(13, 0.95), 1, 0.2],
];
function focusAt(t) {
  const f = {};
  for (const [id, t0, t1, a, b] of FOCUS_DEF()) if (t >= t0) f[id] = lerp(a, b, ss(seg(t, t0, t1 - t0)));
  return f;
}
function views(t) {
  const main = { pos: camPosAt(t), ref: REF0, focus: focusAt(t), hide: [] };
  const I = irisAt(t);
  let inset = null, iris = null;
  if (I) { inset = { pos: I.pos, ref: I.pos, focus: main.focus, hide: [] }; iris = { cx: I.cx, cy: I.cy, r: I.rad, inner: 1 }; }
  return { main, inset, iris };
}

// ---------------------------------------------------------------- moving grains: the backward bullet, the inverted bullet
const GRAIN = [];
function grainPath(t, t0, t1, P) {              // u: 0..1 along P; a backward grain runs P reversed
  const u = clamp((t - t0) / (t1 - t0), 0, 1); return P.length ? polyCurve(P, 40)[Math.round(u * 39)] : V(0, 0, 0);
}
function placeGrains(t) {
  // each grain: [mesh, t0, t1, P] (P is the path in the order it travels in film time)
  for (const G of GRAIN) { const p = grainPath(t, G.t0, G.t1, G.P); G.mesh.position.copy(p); G.mesh.visible = t >= G.t0 && t <= G.t1 + 0.05; }
}
function makeGrain(t0, t1, P) { const b = new Builder(); b.rv = t0 - 1; sph(b, V(0, 0, 0), 0.075); const m = group(b, 16, 0, [0.20, 0.18, 0.16], null); m.userData.grain = true; GRAIN.push({ mesh: m, t0, t1, P }); return m; }
// the grain's pencil trail and the accents are drawn on the overlay (see drawOverlay)
const TRAILS = [];   // [t0, t1, pts (world), colour, width, reverse]

// ---------------------------------------------------------------- text & overlay: labels, title, subtitles, accents
const LABELS = [];   // [text, x, y, t0, t1, size]
const TITLE = { en: 'WHAT IF TIME ITSELF WAS THE WEAPON?', t0: TITLE_T[0], t1: TITLE_T[1] };
let SUBS = [], EVEN = [];
function drawTag(text, x, y, t0, t1, size, prog) {
  const T = textLayout(text, size, 40 + text.length);
  const pad = size * 0.45, w = T.tot + pad * 2, h = size * 1.7;
  const a = ss(seg(prog, 0, 0.25));
  tg.save(); tg.globalAlpha = a; tg.fillStyle = '#f7f1e2'; tg.strokeStyle = 'rgba(40,30,20,.35)'; tg.lineWidth = 2;
  tg.fillRect(x - w / 2, y - h / 2, w, h); tg.strokeRect(x - w / 2 + 1, y - h / 2 + 1, w - 2, h - 2); tg.restore();
  textDraw(T, x - T.tot / 2, y + size * 0.36, ss(seg(prog, 0.2, 0.7)), 1);
}
function drawOverlay(t, ir) {
  for (const c of [tg, ik, cl]) { c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, W, H); }
  setCamera(views(t).main);
  // title: pencilled in the sky, stroke by stroke, then underlined
  if (t >= TITLE.t0 && t < TITLE.t1 + 1.6) { const T = textLayout(TITLE.en, 58, 3); const pr = ss(seg(t, TITLE.t0, TITLE.t1 - TITLE.t0)); const fade = 1 - ss(seg(t, TITLE.t1, 1.4));
    textDraw(T, W / 2 - T.tot / 2, 150, pr, fade); pline(ik, [[W / 2 - T.tot / 2, 176], [W / 2 + T.tot / 2, 182]], ss(seg(t, TITLE.t0 + 1.8, 1.2)) * fade, 3, 5, 0.8 * fade, '#33241C'); }
  // subtitles: a cream slip, bottom left, wiped on (read, not drawn)
  for (const s of SUBS) if (t >= s.t0 && t < s.t1) {
    const lines = wrapText(s.en, 62), lh = 50, h = lines.length * lh + 34;
    tg.fillStyle = '#f5efdf'; tg.fillRect(40, H - 60 - h, 1180, h);
    ik.save(); ik.font = `40px ${FONT}`; ik.fillStyle = '#2a1e16'; ik.textBaseline = 'middle';
    lines.forEach((ln, i) => ik.fillText(ln, 62, H - 60 - h + 17 + lh / 2 + i * lh)); ik.restore();
  }
  // labels: one per shot, paper tags with handwriting
  for (const L of LABELS) if (t >= L[3] && t <= L[4]) drawTag(L[0], L[1], L[2], L[3], L[4], L[5], seg(t, L[3], 0.9));
  // accents (coloured pencil on the overlay): amber trinket ring; cobalt inversion arrows; red Algorithm rings
  const trinketScr = proj(V(-1.25, 1.55, -1.2), camera);
  if (t >= Lt(2, 0.85)) pline(cl, arcPts(V(trinketScr[0], trinketScr[1], 0), 26, 0, Math.PI * 2, 0, 40).map(p => [p.x, p.y]), ss(seg(t, Lt(2, 0.85), 0.6)), 6, 11, 0.9, AMBER);
  if (t >= Lt(14, 0.35)) { const p2 = proj(V(-2.9, 1.0, 0.95), camera); pline(cl, arcPts(V(p2[0], p2[1], 0), 24, 0, Math.PI * 2, 0, 40).map(p => [p.x, p.y]), ss(seg(t, Lt(14, 0.35), 0.6)), 6, 12, 0.9, AMBER); }
  // the inversion arrow on the stone (cobalt), drawn then undrawn
  if (t >= Lt(4, 0.35) && t < Lt(4, 0.75)) { const a = [proj(V(-7.8, -1.6, 0.3), camera), proj(V(-5.2, -2.2, 0.3), camera)]; pline(cl, [a[1], a[0]], ss(seg(t, Lt(4, 0.35), 0.6)), 6, 13, 0.9, COBALT); }
  if (t >= Lt(4, 0.75) && t < Lt(4, 1.0)) { const a = [proj(V(-7.8, -1.6, 0.3), camera), proj(V(-5.2, -2.2, 0.3), camera)]; pline(cl, [a[1], a[0]], 1 - ss(seg(t, Lt(4, 0.75), 0.25)), 6, 13, 0.9 * (1 - ss(seg(t, Lt(4, 0.75), 0.25))), COBALT); }
  // the cobalt arrows from the future into the vault (Lt 5)
  if (t >= Lt(5, 0.4)) for (let i = 0; i < 4; i++) { const x = 3.5 + i * 1.1; const p0 = proj(V(x, -4.2, 0.3), camera), p1 = proj(V(x, -2.9, 0.3), camera); pline(cl, [p0, p1], ss(seg(t, Lt(5, 0.4) + i * 0.12, 0.5)), 6, 20 + i, 0.9, COBALT); }
  // the Algorithm's rings: red, drawn with each ring
  for (let i = 0; i < 9; i++) { const t0 = Lt(6, 0.05 + i * 0.07); if (t < t0) break; const r = 0.7 + i * 0.24; const P = arcPts(V(-1.2, -2.4, 0.25), r, 0, Math.PI * 2, 0, 56).map(p => { const q = proj(p, camera); return [q[0], q[1]]; }); pline(cl, P, ss(seg(t, t0, 0.8)), 4.5, 30 + i, 0.85, RED); }
  // pincer fronts: red (forward) from the left, cobalt (inverted) from the right
  if (t >= Lt(12, 0.1)) { const pa = proj(V(-6.0, -1.0, 0.3), camera), pb = proj(V(-2.0, -1.0, 0.3), camera); pline(cl, [pa, pb], ss(seg(t, Lt(12, 0.1), 0.8)), 6, 40, 0.9, RED); const qa = proj(V(8, -1.0, 0.3), camera), qb = proj(V(-1.5, -1.0, 0.3), camera); pline(cl, [qa, qb], ss(seg(t, Lt(12, 0.1), 0.8)), 6, 41, 0.9, COBALT); }
  // the dead man's switch: a cobalt dashed path from the yacht to the dome
  if (t >= Lt(11, 0.4)) { const a = proj(V(4.5, -0.2, -3.5), camera), b = proj(V(-6, 2.4, -2.0), camera); pline(cl, [a, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - 80], b], ss(seg(t, Lt(11, 0.4), 1.0)), 4, 50, 0.9, COBALT, [14, 10]); }
  // the trinket's last layer: the amber on the bag, with its tag
  // iris: a pencilled circle around the magnifier
  if (ir) { const pts = []; for (let k = 0; k <= 64; k++) { const a = k / 64 * Math.PI * 2; pts.push([ir.cx + Math.cos(a) * ir.r, ir.cy + Math.sin(a) * ir.r]); } pline(ik, pts, 1, 4, 77, 0.9, '#33241C'); }
  tagT.needsUpdate = true; inkT.needsUpdate = true; colT.needsUpdate = true;
}
function wrapText(s, n) { const out = []; let cur = ''; for (const w of s.split(' ')) { if ((cur + ' ' + w).trim().length > n && cur) { out.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); } if (cur) out.push(cur); return out; }
// labels and subtitles are set up from the narration (see boot)
function setupLabels() {
  LABELS.push(['NEIL', 380, 760, Lt(7, 0.45), Lt(7, 0.95), 34]);
  LABELS.push(['KAT', 1380, 760, Lt(7, 0.5), Lt(7, 0.95), 34]);
  LABELS.push(['THE TRINKET', 980, 240, Lt(2, 0.9), Lt(2, 1.0) + 2.0, 34]);
  LABELS.push(['THE ALGORITHM · 9 PARTS', 780, 330, Lt(6, 0.3), Lt(6, 0.98), 32]);
  LABELS.push(['THE FOUNDER', 960, 230, Lt(15, 0.5), 1e9, 40]);
}

// ---------------------------------------------------------------- render (the film's frame)
function renderFilm(t) {
  const f = Math.round(t * FPS); BOIL = Math.floor(f / 2) % 3;
  postMat.uniforms.uBoil.value = BOIL;
  const tt = t;
  SHARED.uTime.value = tt;
  SHARED.uWindT.value = Math.floor(t * 12) / 12;
  placeGrains(t);
  const vs = views(t);
  renderView(vs.main, rtP1);
  if (vs.inset) renderView(vs.inset, rtP2);
  const ir = vs.iris;
  compMat.uniforms.uIris.value.set(ir ? ir.cx : 0, ir ? ir.cy : 0, ir ? ir.r : 0, ir && ir.inner && vs.inset ? 1 : 0);
  drawOverlay(tt, ir);
  labelTooth(ir && ir.inner ? vs.inset : vs.main);
  quad.material = compMat; renderer.setRenderTarget(rtC); renderer.render(qScene, qCam);
  quad.material = downMat; downMat.uniforms.tP.value = rtC.texture; renderer.setRenderTarget(null); renderer.render(qScene, qCam);
  setCamera(vs.main);
}
window.DUR = FILM;
window.render = (t) => renderFilm(t);
window.TEXTS = () => [];
(async () => {
  try { await document.fonts.load(`40px ${FONT}`, 'Tenet'); } catch (e) { }
  GLY = await (await fetch('glyphs.json')).json();
  const VOL = await (await fetch('voice/lines.json')).json(); const DURS = await (await fetch('out/voice/dur.json')).json();
  let t = 0.35; for (const l of VOL) { S.push(t); D.push(DURS[l.id]); t += DURS[l.id] + 0.3; }
  SUBS = VOL.map((l, i) => ({ t0: S[i] - 0.1, t1: S[i] + D[i] + 0.25, en: l.text0 || l.text }));
  buildWorld();
  setupLabels();
  window.FILMEV = [];
  renderFilm(0);
  window.READY = true;
})();

