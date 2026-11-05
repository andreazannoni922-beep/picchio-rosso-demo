// Scene 3D del sito: cartoni, pizze, ruota del menù. Girano nel browser e rispondono a mouse e dita.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v)), seg = (p, a, b) => clamp((p - a) / (b - a)), mix = (a, b, t) => a + (b - a) * t;
const io = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const out = t => 1 - Math.pow(1 - t, 3);
const rimbalzo = t => { const n = 7.5625, d = 2.75; if (t < 1 / d) return n * t * t; if (t < 2 / d) return n * (t -= 1.5 / d) * t + .75; if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + .9375; return n * (t -= 2.625 / d) * t + .984375; };
const carica = u => new Promise((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = ko; i.src = u; });
const fermo = matchMedia('(prefers-reduced-motion: reduce)').matches;
const avanza = s => { const r = s.getBoundingClientRect(); return clamp(-r.top / Math.max(1, s.offsetHeight - innerHeight)); };

/* ---------- palco: renderer, luci, trascinamento, disegna solo se si vede ---------- */
class Palco {
  constructor(canvas, { fov = 30, z = 5, ombre = true } = {}) {
    this.c = canvas; this.scena = new THREE.Scene(); this.cam = new THREE.PerspectiveCamera(fov, 1, .1, 60); this.cam.position.z = z;
    this.gl = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
    this.gl.setClearColor(0, 0); this.gl.outputColorSpace = THREE.SRGBColorSpace;
    if (ombre) { this.gl.shadowMap.enabled = true; this.gl.shadowMap.type = THREE.PCFSoftShadowMap; }
    const pm = new THREE.PMREMGenerator(this.gl); this.scena.environment = pm.fromScene(new RoomEnvironment(this.gl), .04).texture; pm.dispose();
    this.scena.environmentIntensity = .5;
    const k = new THREE.DirectionalLight(0xfff0dc, 1.75); k.position.set(-2.4, 4.6, 3.2); this.scena.add(k);
    if (ombre) { k.castShadow = true; k.shadow.mapSize.set(2048, 2048); Object.assign(k.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3, near: .5, far: 16 }); k.shadow.radius = 7; k.shadow.bias = -.0004; }
    this.mx = 0; this.my = 0; this.tx = 0; this.ty = 0; this.yaw = 0; this.vel = 0; this.tiene = false; this.passi = []; this.vivo = false;
    new ResizeObserver(() => this.misura()).observe(canvas); this.misura();
    new IntersectionObserver(([e]) => { const v = e.isIntersecting; if (v && !this.vivo) { this.vivo = true; requestAnimationFrame(t => this.giro(t)); } this.vivo = v; }, { rootMargin: '10% 0px' }).observe(canvas);
    if (matchMedia('(pointer:fine)').matches) addEventListener('pointermove', e => { const r = canvas.getBoundingClientRect(); this.tx = clamp((e.clientX - r.left) / r.width * 2 - 1, -1, 1); this.ty = clamp((e.clientY - r.top) / r.height * 2 - 1, -1, 1); }, { passive: true });
    let xp = 0, mosso = 0;
    canvas.addEventListener('pointerdown', e => { this.tiene = true; xp = e.clientX; mosso = 0; canvas.setPointerCapture(e.pointerId); });
    canvas.addEventListener('pointermove', e => { if (!this.tiene) return; const d = e.clientX - xp; xp = e.clientX; mosso += Math.abs(d); this.vel = d * .007; this.yaw += this.vel; });
    canvas.addEventListener('pointerup', e => { if (!this.tiene) return; this.tiene = false; if (mosso < 6 && this.tocco) this.tocco(e); });
    canvas.addEventListener('pointercancel', () => { this.tiene = false; });
  }
  misura() { const r = this.c.getBoundingClientRect(); if (!r.width) return; this.gl.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); this.gl.setSize(r.width, r.height, false); this.cam.aspect = r.width / r.height; this.cam.updateProjectionMatrix(); this.alza = r.width / r.height < 1; }
  raggio(e, oggetti) { const r = this.c.getBoundingClientRect(), v = new THREE.Vector2((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1), c = new THREE.Raycaster(); c.setFromCamera(v, this.cam); return c.intersectObjects(oggetti, true)[0]; }
  giro(t) { if (!this.vivo) return; requestAnimationFrame(n => this.giro(n)); this.mx += (this.tx - this.mx) * .06; this.my += (this.ty - this.my) * .06; if (!this.tiene) { this.yaw += this.vel; this.vel *= .95; } this.passi.forEach(f => f(t)); this.gl.render(this.scena, this.cam); }
}

/* ---------- materiali del cartone, disegnati ---------- */
function rumore(x, W, H, n, a) { for (let i = 0; i < n; i++) { x.fillStyle = `rgba(${Math.random() < .5 ? '70,44,20' : '255,235,200'},${Math.random() * a})`; x.fillRect(Math.random() * W, Math.random() * H, 4 + Math.random() * 46, 1 + Math.random() * 1.2); } }
function telaKraft(S = 1024) { const c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d'); x.fillStyle = '#a98a68'; x.fillRect(0, 0, S, S); rumore(x, S, S, S * 7, .07); return c; }
function tex(c) { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 12; return t; }
let kit = null;
async function kitCartone() {
  if (kit) return kit;
  const logo = await carica('img/brand/logo-badge.png');
  const S = 2048, c = telaKraft(S), x = c.getContext('2d');
  const g = x.createRadialGradient(S / 2, S / 2, S * .35, S / 2, S / 2, S * .75); g.addColorStop(0, 'rgba(60,34,12,0)'); g.addColorStop(1, 'rgba(60,34,12,.3)'); x.fillStyle = g; x.fillRect(0, 0, S, S);
  for (let i = 0; i < 7; i++) { const a = Math.random() * S, b = Math.random() * S, r = 20 + Math.random() * 60, m = x.createRadialGradient(a, b, 0, a, b, r); m.addColorStop(0, 'rgba(90,56,20,.2)'); m.addColorStop(1, 'rgba(90,56,20,0)'); x.fillStyle = m; x.fillRect(a - r, b - r, r * 2, r * 2); }
  x.globalCompositeOperation = 'multiply'; const L = S * .72; x.drawImage(logo, (S - L) / 2, (S - L) / 2, L, L); x.globalCompositeOperation = 'source-over';
  const lato = document.createElement('canvas'); lato.width = 1024; lato.height = 96; const y = lato.getContext('2d'); y.fillStyle = '#9b7d5c'; y.fillRect(0, 0, 1024, 96); y.fillStyle = 'rgba(70,44,20,.55)'; for (let i = 0; i < 1024; i += 7) y.fillRect(i, 40, 3, 16); y.fillStyle = 'rgba(70,44,20,.3)'; y.fillRect(0, 0, 1024, 3); y.fillRect(0, 93, 1024, 3);
  const carta = map => new THREE.MeshStandardMaterial({ map, roughness: .86, metalness: 0 });
  kit = { kraft: carta(tex(telaKraft())), lid: carta(tex(c)), sid: carta(tex(lato)), grezzo: new THREE.MeshStandardMaterial({ color: 0xb5977a, roughness: .9 }) };
  return kit;
}
const LATO = 1, ALTO = .1, SP = .012;
function fetta(w, h, d, mat) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.castShadow = true; m.receiveShadow = true; return m; }
// un cartone vero: fondo con quattro pareti, coperchio a cerniera con tre alette
function cartone(k) {
  const g = new THREE.Group(), L = LATO, H = ALTO;
  const f = fetta(L, SP, L, k.kraft); f.position.y = SP / 2; g.add(f);
  const xz = [k.kraft, k.kraft, k.grezzo, k.grezzo, k.sid, k.sid], zx = [k.sid, k.sid, k.grezzo, k.grezzo, k.kraft, k.kraft];
  [[0, L / 2, L, SP, xz], [0, -L / 2, L, SP, xz], [L / 2, 0, SP, L, zx], [-L / 2, 0, SP, L, zx]].forEach(([x, z, w, d, mat]) => { const m = fetta(w, H, d, mat); m.position.set(x, H / 2, z); g.add(m); });
  const cer = new THREE.Group(); cer.position.set(0, H + SP * 1.5, -L / 2 - SP); g.add(cer);
  const lid = fetta(L + SP * 3, SP, L + SP * 3, [k.grezzo, k.grezzo, k.lid, k.kraft, k.grezzo, k.grezzo]); lid.position.set(0, 0, L / 2 + SP); cer.add(lid);
  const al = H * .82;
  [[0, L + SP * 2.2, L + SP * 3, SP, xz], [L / 2 + SP * 1.5, L / 2 + SP, SP, L + SP * 3, zx], [-L / 2 - SP * 1.5, L / 2 + SP, SP, L + SP * 3, zx]].forEach(([x, z, w, d, mat]) => { const m = fetta(w, al, d, mat); m.position.set(x, -al / 2, z); cer.add(m); });
  g.userData.cer = cer;
  return g;
}

/* ---------- la pizza: profilo tornito con la foto vera proiettata dall'alto ---------- */
const cachePizza = new Map();
function rilievo(img, S = 640) {
  const c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0, S, S);
  const a = x.getImageData(0, 0, S, S).data, h = new Float32Array(S * S); for (let i = 0; i < S * S; i++) h[i] = a[i * 4 + 3] < 40 ? 0 : (a[i * 4] * .3 + a[i * 4 + 1] * .59 + a[i * 4 + 2] * .11) / 255;
  const o = x.createImageData(S, S), b = o.data;
  for (let y = 0; y < S; y++) for (let k = 0; k < S; k++) { const nx = (h[y * S + Math.max(k - 1, 0)] - h[y * S + Math.min(k + 1, S - 1)]) * 3, ny = (h[Math.min(y + 1, S - 1) * S + k] - h[Math.max(y - 1, 0) * S + k]) * 3, n = Math.hypot(nx, ny, 1), i = (y * S + k) * 4; b[i] = (nx / n * .5 + .5) * 255; b[i + 1] = (ny / n * .5 + .5) * 255; b[i + 2] = (1 / n * .5 + .5) * 255; b[i + 3] = 255; }
  x.putImageData(o, 0, 0); const t = new THREE.CanvasTexture(c); t.anisotropy = 8; return t;
}
function sottoBruciato() {
  const S = 1024, c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d'); x.fillStyle = '#d9a768'; x.fillRect(0, 0, S, S);
  for (let i = 0; i < 260; i++) { const a = Math.random() * S, b = Math.random() * S, r = 6 + Math.random() * 46, m = x.createRadialGradient(a, b, 0, a, b, r), dk = Math.random() < .55; m.addColorStop(0, dk ? 'rgba(38,20,10,.85)' : 'rgba(150,92,42,.5)'); m.addColorStop(1, 'rgba(120,70,30,0)'); x.fillStyle = m; x.fillRect(a - r, b - r, r * 2, r * 2); }
  return tex(c);
}
let sotto = null;
async function materialePizza(nome) {
  if (cachePizza.has(nome)) return cachePizza.get(nome);
  const img = await carica(`img/cut/${nome}.webp`), S = 1400, c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d');
  x.fillStyle = '#c9975e'; x.fillRect(0, 0, S, S); const w = img.naturalWidth, h = img.naturalHeight, q = S / Math.max(w, h); x.drawImage(img, (S - w * q) / 2, (S - h * q) / 2, w * q, h * q);
  const m = new THREE.MeshStandardMaterial({ map: tex(c), normalMap: rilievo(img), normalScale: new THREE.Vector2(.55, .55), roughness: .82, metalness: 0, color: 0xcfcac4, envMapIntensity: .55 });
  sotto = sotto || new THREE.MeshStandardMaterial({ map: sottoBruciato(), roughness: .92 });
  cachePizza.set(nome, m); return m;
}
const geoPizza = (() => {
  const R = 1, T = .055, CR = .085, A = [], B = [];
  A.push(new THREE.Vector2(.0001, T)); for (let i = 1; i <= 26; i++) A.push(new THREE.Vector2(i / 26 * (R - CR * 1.5), T));
  for (let i = 0; i <= 18; i++) { const a = Math.PI * (i / 18); A.push(new THREE.Vector2(R - CR - Math.cos(a) * CR, T + Math.sin(a) * CR * 1.05 - .004)); }
  A.push(new THREE.Vector2(R * .985, -T * .2));
  B.push(new THREE.Vector2(R * .985, -T * .2)); for (let i = 1; i <= 8; i++) B.push(new THREE.Vector2((1 - i / 8) * R * .985 + .0001, -T * .35));
  const fai = P => { const g = new THREE.LatheGeometry(P, 128), q = g.attributes.position, uv = g.attributes.uv; for (let i = 0; i < q.count; i++) uv.setXY(i, q.getX(i) * .485 + .5, q.getZ(i) * -.485 + .5); g.computeVertexNormals(); return g; };
  return [fai(A.reverse()), fai(B.reverse())];
})();
async function pizza(nome) { const m = await materialePizza(nome), g = new THREE.Group(); geoPizza.forEach((q, i) => { const p = new THREE.Mesh(q, i ? sotto : m); p.castShadow = true; p.receiveShadow = true; g.add(p); }); return g; }
function pavimentoOmbra(y = 0, op = .34) { const m = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.ShadowMaterial({ opacity: op })); m.rotation.x = -Math.PI / 2; m.position.y = y; m.receiveShadow = true; return m; }
function vapore(n = 14) {
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,.32)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c), G = new THREE.Group(), s = Array.from({ length: n }, (_, i) => { const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, opacity: 0 })); m.userData = { f: i / n, x: (Math.random() - .5) * .5, z: (Math.random() - .5) * .5 }; G.add(m); return m; });
  G.userData.vai = (now, forza) => s.forEach(m => { const u = (now * .00012 + m.userData.f) % 1; m.position.set(m.userData.x + Math.sin(u * 6 + m.userData.f * 9) * .05, u * 1.1, m.userData.z); m.scale.setScalar(.22 + u * .6); m.material.opacity = Math.sin(u * Math.PI) * .5 * forza; });
  return G;
}

/* ---------- gli scatoloni: cadono piano con lo scroll, si impilano, quello in cima si apre ---------- */
export async function scenaCartoni(canvas, sezione, { quanti = 3, pizzaNome = 'margherita' } = {}) {
  const pal = new Palco(canvas, { fov: 26, z: 7 }), k = await kitCartone();
  const G = new THREE.Group(); pal.scena.add(G); G.add(pavimentoOmbra(0));
  const pile = [];
  for (let i = 0; i < quanti; i++) {
    const c = cartone(k); c.userData.s = { rx: (i % 2 ? -1 : 1) * (.7 + i * .12), rz: (i % 2 ? 1 : -1) * (.5 + i * .1), ry: (i - 1) * .9, x: (i - (quanti - 1) / 2) * .9, yf: i * (ALTO + SP * 3), ri: (i % 2 ? .03 : -.04) }; G.add(c); pile.push(c);
  }
  const cima = pile[quanti - 1], cer = cima.userData.cer, pz = await pizza(pizzaNome); pz.scale.setScalar(.455); pz.position.y = SP + .05 * .455 + .012; cima.add(pz);
  const vap = vapore(); vap.position.y = .1; cima.add(vap);
  let apertoA = 0, voglia = null;
  pal.tocco = e => { const h = pal.raggio(e, [cima]); if (h && avanza(sezione) > .55) voglia = apertoA > .5 ? 0 : 1; };
  pal.passi.push(now => {
    const p = fermo ? 1 : avanza(sezione), v = pal.alza;
    pile.forEach((c, i) => {
      const u = c.userData.s, a = seg(p, .02 + i * .13, .28 + i * .13), r = rimbalzo(a), y = mix(5.2 + i * .8, u.yf, r), tum = 1 - out(a);
      c.position.set(u.x * tum * (v ? .4 : 1), y, (i - 1) * .3 * tum);
      c.rotation.set(u.rx * tum * 2.2, u.ry * tum * 2 + u.ri, u.rz * tum * 2.2);
    });
    const sc = io(seg(p, .62, .86)), voluto = voglia !== null ? voglia : sc;
    if (voglia !== null && Math.abs(sc - voglia) < .02) voglia = null;
    apertoA += (voluto - apertoA) * .09; cer.rotation.x = -apertoA * 1.95; vap.userData.vai(now, apertoA);
    // la camera scende verso il cartone mentre si apre
    const av = io(seg(p, .5, .9)), dist = (v ? 9.2 : 6.2) - av * (v ? 2.4 : 1.6);
    const az = pal.yaw + pal.mx * .22 - .28 + av * .28, el = mix(.5, .95, av) - pal.my * .08;
    pal.cam.position.set(Math.sin(az) * Math.cos(el) * dist, .25 + Math.sin(el) * dist, Math.cos(az) * Math.cos(el) * dist);
    pal.cam.lookAt(0, mix(.5, .15, av), 0);
    canvas.style.cursor = pal.tiene ? 'grabbing' : 'grab';
  });
  return pal;
}

/* ---------- pizza che gira: si trascina, segue il mouse, sul pulsante cadono gli ingredienti ---------- */
function fogliaBasilico() {
  const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'); x.fillStyle = '#3f8a2f'; x.fillRect(0, 0, 256, 256); x.strokeStyle = 'rgba(190,230,130,.55)'; x.lineWidth = 3; x.beginPath(); x.moveTo(128, 0); x.lineTo(128, 256); for (let i = 20; i < 240; i += 34) { x.moveTo(128, i); x.lineTo(20, i - 26); x.moveTo(128, i); x.lineTo(236, i - 26); } x.stroke();
  const f = new THREE.Shape(); f.moveTo(0, -1); f.bezierCurveTo(.75, -.7, .78, .35, 0, 1); f.bezierCurveTo(-.78, .35, -.75, -.7, 0, -1);
  const g = new THREE.ShapeGeometry(f, 18), q = g.attributes.position, uv = g.attributes.uv; for (let i = 0; i < q.count; i++) { const a = q.getX(i), b = q.getY(i); uv.setXY(i, a * .5 + .5, b * .5 + .5); q.setZ(i, a * a * .28 - b * b * .1); } g.computeVertexNormals();
  return new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: tex(c), roughness: .42, side: THREE.DoubleSide }));
}
function pomodorino() { const g = new THREE.Group(), m = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 24), new THREE.MeshStandardMaterial({ color: 0xc8261a, roughness: .2 })); m.scale.y = .86; g.add(m); const s = new THREE.Mesh(new THREE.ConeGeometry(.28, .22, 5), new THREE.MeshStandardMaterial({ color: 0x4d7a2c, roughness: .7 })); s.position.y = .88; g.add(s); return g; }
function fiorDiLatte() { const g = new THREE.IcosahedronGeometry(1, 4), q = g.attributes.position; for (let i = 0; i < q.count; i++) { const a = q.getX(i), b = q.getY(i), z = q.getZ(i), k = 1 + Math.sin(a * 5 + z * 3) * .1 + Math.sin(b * 7 + a * 4) * .07; q.setXYZ(i, a * k, b * k * .62, z * k); } g.computeVertexNormals(); return new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0xf6f1e4, roughness: .46 })); }
const INGR = { basilico: [fogliaBasilico, .13], pomodoro: [pomodorino, .07], mozzarella: [fiorDiLatte, .1] };
export async function scenaPizza(canvas, sezione, { nome = 'burrata', ingredienti = null, inclina = .95, riempie = .8 } = {}) {
  const pal = new Palco(canvas, { fov: 26, z: 5.4 });
  const T = new THREE.Group(), S = new THREE.Group(); pal.scena.add(T); T.add(S);
  S.add(await pizza(nome));
  pal.scena.add(pavimentoOmbra(-.42, .26));
  const caduti = [];
  function fai(n) {
    const [crea, sc] = INGR[n], o = crea(); o.scale.setScalar(sc * (.85 + Math.random() * .3)); o.traverse(m => { if (m.isMesh) m.castShadow = true; });
    const a = Math.random() * 6.28, r = Math.sqrt(Math.random()) * .72; o.userData = { y: 2.4 + Math.random(), v: 0, s: (Math.random() - .5) * .3, fine: .09 + Math.random() * .03, posato: false };
    o.position.set(Math.cos(a) * r, o.userData.y, Math.sin(a) * r); o.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6); S.add(o); caduti.push(o);
  }
  if (ingredienti) ingredienti.forEach(b => b.addEventListener('click', () => { const n = b.dataset.ingr; if (n === 'via') { caduti.splice(0).forEach(o => S.remove(o)); return; } for (let i = 0; i < 4; i++) setTimeout(() => fai(n), i * 90); }));
  pal.passi.push(now => {
    const q = fermo ? .5 : clamp(1 - sezione.getBoundingClientRect().top / innerHeight, 0, 2);
    if (!pal.tiene && Math.abs(pal.vel) < .004) pal.vel += .0002;
    S.rotation.y = pal.yaw + q * 1.1;
    T.rotation.x = inclina + pal.my * .22 + .03 * Math.sin(now * .001);
    T.rotation.z = -pal.mx * .22 + .05;
    T.position.y = Math.sin(now * .0012) * .018 + .12;
    const tn = Math.tan(13 * Math.PI / 180), fit = (2 / riempie) / (2 * tn * Math.min(1, pal.cam.aspect)); pal.cam.position.set(0, 0, fit); pal.cam.lookAt(0, 0, 0);
    caduti.forEach(o => { const u = o.userData; if (u.posato) return; u.v -= .0032; u.y += u.v; if (u.y <= u.fine) { u.y = u.fine; if (Math.abs(u.v) > .012) u.v *= -.32; else { u.posato = true; u.v = 0; } } o.position.y = u.y; o.rotation.x += u.s; o.rotation.z += u.s * .7; });
    canvas.style.cursor = pal.tiene ? 'grabbing' : 'grab';
  });
  return pal;
}

/* ---------- ruota del menù: pizze intere in 3D su un arco, si girano trascinando o scorrendo ---------- */
export async function scenaRuota(canvas, sezione, voci) {
  const pal = new Palco(canvas, { fov: 28, z: 7, ombre: false });
  const W = new THREE.Group(); pal.scena.add(W); const R = 2.3, n = voci.length, mesh = [];
  for (let i = 0; i < n; i++) { const h = new THREE.Group(), p = await pizza(voci[i].nome); p.rotation.x = Math.PI / 2 - .35; h.add(p); h.userData = { voce: voci[i], lift: 0 }; W.add(h); mesh.push(h); }
  let hov = null; const su = o => { while (o && !o.userData.voce) o = o.parent; return o; };
  canvas.addEventListener('pointermove', e => { if (!matchMedia('(pointer:fine)').matches) return; const h = pal.raggio(e, mesh); hov = h ? su(h.object) : null; canvas.style.cursor = hov ? 'pointer' : 'grab'; });
  canvas.addEventListener('pointerleave', () => { hov = null; });
  pal.tocco = e => { const h = pal.raggio(e, mesh); if (h) document.getElementById('p' + su(h.object).userData.voce.id)?.click(); };
  pal.passi.push(() => {
    const p = fermo ? 0 : avanza(sezione), v = pal.alza, ang = p * 1.5 + pal.yaw * .5;
    W.position.set(v ? 0 : 1.55, v ? -.55 : -.05, -R);
    mesh.forEach((h, i) => {
      const a = i / n * Math.PI * 2 + ang; h.position.set(Math.sin(a) * R, Math.cos(a) * .32, Math.cos(a) * R);
      h.userData.lift += ((hov === h ? 1 : 0) - h.userData.lift) * .1;
      h.scale.setScalar((v ? .66 : .78) * (1 + h.userData.lift * .08));
      h.rotation.set(pal.my * .12, pal.mx * .22 - Math.sin(a) * .55, 0);
    });
    pal.cam.position.set(pal.mx * .2, pal.my * -.1, 7); pal.cam.lookAt(0, 0, 0);
  });
  return pal;
}
