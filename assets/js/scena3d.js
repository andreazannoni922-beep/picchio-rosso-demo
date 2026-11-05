// Scene 3D: i cartoni bianchi che cadono e fanno saltare il titolo, gli ingredienti fotografici che cadono sulla pizza vera.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v)), seg = (p, a, b) => clamp((p - a) / (b - a)), mix = (a, b, t) => a + (b - a) * t;
const io = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const out = t => 1 - Math.pow(1 - t, 3);
const rimbalzo = t => { const n = 7.5625, d = 2.75; if (t < 1 / d) return n * t * t; if (t < 2 / d) return n * (t -= 1.5 / d) * t + .75; if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + .9375; return n * (t -= 2.625 / d) * t + .984375; };
const carica = u => new Promise((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = ko; i.src = u; });
const fermo = matchMedia('(prefers-reduced-motion: reduce)').matches;
const avanza = s => { const r = s.getBoundingClientRect(); return clamp(-r.top / Math.max(1, s.offsetHeight - innerHeight)); };
const tex = c => { const t = c instanceof HTMLImageElement ? new THREE.Texture(c) : new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 12; t.needsUpdate = true; return t; };
function sbuffo() { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,.5)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); }

/* ---------- palco ---------- */
class Palco {
  constructor(canvas, { fov = 26, z = 7, ombre = true } = {}) {
    this.c = canvas; this.scena = new THREE.Scene(); this.cam = new THREE.PerspectiveCamera(fov, 1, .1, 60); this.cam.position.z = z;
    this.gl = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
    this.gl.setClearColor(0, 0); this.gl.outputColorSpace = THREE.SRGBColorSpace;
    if (ombre) { this.gl.shadowMap.enabled = true; this.gl.shadowMap.type = THREE.PCFSoftShadowMap; }
    const pm = new THREE.PMREMGenerator(this.gl); this.scena.environment = pm.fromScene(new RoomEnvironment(this.gl), .04).texture; pm.dispose(); this.scena.environmentIntensity = .62;
    const k = new THREE.DirectionalLight(0xfff4e6, 1.7); k.position.set(-2.6, 5, 3); this.scena.add(k);
    if (ombre) { k.castShadow = true; k.shadow.mapSize.set(2048, 2048); Object.assign(k.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3, near: .5, far: 16 }); k.shadow.radius = 8; k.shadow.bias = -.0004; }
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

/* ---------- cartone bianco, costruito ---------- */
function tela(S, base, n, a) { const c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d'); x.fillStyle = base; x.fillRect(0, 0, S, S); for (let i = 0; i < n; i++) { x.fillStyle = `rgba(${Math.random() < .5 ? '120,105,85' : '255,255,255'},${Math.random() * a})`; x.fillRect(Math.random() * S, Math.random() * S, 4 + Math.random() * 40, 1); } return c; }
let kit = null;
async function kitCartone() {
  if (kit) return kit;
  const logo = await carica('img/brand/logo-badge.png'), S = 2048, c = tela(S, '#f4f1ea', S * 5, .05), x = c.getContext('2d');
  const g = x.createRadialGradient(S / 2, S / 2, S * .4, S / 2, S / 2, S * .76); g.addColorStop(0, 'rgba(120,100,70,0)'); g.addColorStop(1, 'rgba(120,100,70,.14)'); x.fillStyle = g; x.fillRect(0, 0, S, S);
  x.globalCompositeOperation = 'multiply'; const L = S * .74; x.drawImage(logo, (S - L) / 2, (S - L) / 2, L, L); x.globalCompositeOperation = 'source-over';
  const lato = document.createElement('canvas'); lato.width = 1024; lato.height = 96; const y = lato.getContext('2d'); y.fillStyle = '#ece8df'; y.fillRect(0, 0, 1024, 96); y.fillStyle = 'rgba(120,105,85,.28)'; for (let i = 0; i < 1024; i += 7) y.fillRect(i, 40, 3, 16);
  const carta = map => new THREE.MeshStandardMaterial({ map, roughness: .88 });
  kit = { bianco: carta(tex(tela(1024, '#f1eee6', 4000, .04))), lid: carta(tex(c)), sid: carta(tex(lato)), bordo: new THREE.MeshStandardMaterial({ color: 0xe9e5db, roughness: .9 }), dentro: carta(tex(tela(1024, '#e8dfca', 5000, .06))) };
  return kit;
}
const LATO = 1, ALTO = .1, SP = .012;
function fetta(w, h, d, mat) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.castShadow = true; m.receiveShadow = true; return m; }
function cartone(k) {
  const g = new THREE.Group(), L = LATO, H = ALTO, f = fetta(L, SP, L, [k.bordo, k.bordo, k.dentro, k.bianco, k.bordo, k.bordo]); f.position.y = SP / 2; g.add(f);
  const xz = [k.bianco, k.bianco, k.bordo, k.bordo, k.sid, k.sid], zx = [k.sid, k.sid, k.bordo, k.bordo, k.bianco, k.bianco];
  [[0, L / 2, L, SP, xz], [0, -L / 2, L, SP, xz], [L / 2, 0, SP, L, zx], [-L / 2, 0, SP, L, zx]].forEach(([x, z, w, d, mat]) => { const m = fetta(w, H, d, mat); m.position.set(x, H / 2, z); g.add(m); });
  const cer = new THREE.Group(); cer.position.set(0, H + SP * 1.5, -L / 2 - SP); g.add(cer);
  const lid = fetta(L + SP * 3, SP, L + SP * 3, [k.bordo, k.bordo, k.lid, k.dentro, k.bordo, k.bordo]); lid.position.set(0, 0, L / 2 + SP); cer.add(lid);
  const al = H * .82;
  [[0, L + SP * 2.2, L + SP * 3, SP, xz], [L / 2 + SP * 1.5, L / 2 + SP, SP, L + SP * 3, zx], [-L / 2 - SP * 1.5, L / 2 + SP, SP, L + SP * 3, zx]].forEach(([x, z, w, d, mat]) => { const m = fetta(w, al, d, mat); m.position.set(x, -al / 2, z); cer.add(m); });
  g.userData.cer = cer; return g;
}

/* ---------- scatoloni: ogni atterraggio scuote la scena e fa saltare le lettere ---------- */
export async function scenaCartoni(canvas, sezione, { quanti = 3, titolo = null, pizzaNome = 'margherita' } = {}) {
  const pal = new Palco(canvas), k = await kitCartone(), G = new THREE.Group(); pal.scena.add(G);
  const pav = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.ShadowMaterial({ opacity: .42 })); pav.rotation.x = -Math.PI / 2; pav.receiveShadow = true; G.add(pav);
  const pile = [], passo = .46 / quanti;
  for (let i = 0; i < quanti; i++) { const c = cartone(k); c.userData.s = { rx: (i % 2 ? -1 : 1) * (.9 + i * .1), rz: (i % 2 ? 1 : -1) * (.6 + i * .1), ry: (i - 1) * 1.1, x: (i % 2 ? 1 : -1) * (.5 + i * .12), yf: i * (ALTO + SP * 3), ri: (i % 2 ? .035 : -.045), toccato: false }; G.add(c); pile.push(c); }
  // la foto vera dentro il cartone in cima
  const cima = pile[quanti - 1], cer = cima.userData.cer, im = await carica(`img/cut/${pizzaNome}.webp`), ph = new THREE.Mesh(new THREE.PlaneGeometry(.93, .93), new THREE.MeshBasicMaterial({ map: tex(im), transparent: true, alphaTest: .4 })); ph.rotation.x = -Math.PI / 2; ph.position.y = SP + .006; cima.add(ph);
  // polvere di farina a ogni urto, vapore all'apertura
  const sb = sbuffo(), polvere = Array.from({ length: 34 }, () => { const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: sb, transparent: true, depthWrite: false, opacity: 0, color: 0xfff6ea })); m.userData = { t: 9 }; G.add(m); return m; });
  const vap = Array.from({ length: 12 }, (_, i) => { const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: sb, transparent: true, depthWrite: false, opacity: 0 })); m.userData = { f: i / 12, x: (Math.random() - .5) * .5, z: (Math.random() - .5) * .5 }; cima.add(m); return m; });
  let scossa = 0, ultimo = 0, apertoA = 0, voglia = null;
  const urto = (i, y, f) => { scossa = Math.min(1, scossa + f); titolo && titolo(i, f); polvere.forEach((m, n) => { if (n % 3 === i % 3 || f > .8) { const a = Math.random() * 6.28, v = .012 + Math.random() * .03; m.userData = { t: 0, vx: Math.cos(a) * v, vz: Math.sin(a) * v, vy: .004 + Math.random() * .008 }; m.position.set(Math.cos(a) * .55, y + .02, Math.sin(a) * .55); } }); };
  const inizioAp = .08 + (quanti - 1) * passo + .24;
  pal.tocco = e => { if (pal.raggio(e, [cima]) && avanza(sezione) > inizioAp - .05) voglia = apertoA > .5 ? 0 : 1; };
  pal.passi.push(now => {
    const p = fermo ? 1 : avanza(sezione), v = pal.alza, dt = Math.min(50, now - ultimo) / 16; ultimo = now;
    pile.forEach((c, i) => {
      const u = c.userData.s, a = seg(p, .03 + i * passo, .03 + i * passo + .24), r = rimbalzo(a), y = mix(5.4 + i * .7, u.yf, r), tum = 1 - out(a);
      c.position.set(u.x * tum, y, (i - 1) * .4 * tum);
      c.rotation.set(u.rx * tum * 2.6, u.ry * tum * 2.4 + u.ri, u.rz * tum * 2.6);
      const giu = a >= .36; if (giu && !u.toccato) { u.toccato = true; urto(i, u.yf, i === quanti - 1 ? 1 : .55); } if (a < .3) u.toccato = false;
    });
    const sc = io(seg(p, inizioAp, inizioAp + .16)), voluto = voglia !== null ? voglia : sc;
    if (voglia !== null && Math.abs(sc - voglia) < .02) voglia = null;
    apertoA += (voluto - apertoA) * .08; cer.rotation.x = -apertoA * 2.02;
    vap.forEach(m => { const t = (now * .00014 + m.userData.f) % 1; m.position.set(m.userData.x + Math.sin(t * 6 + m.userData.f * 9) * .05, .08 + t * 1, m.userData.z); m.scale.setScalar(.2 + t * .55); m.material.opacity = Math.sin(t * Math.PI) * .42 * apertoA; });
    polvere.forEach(m => { const u = m.userData; if (u.t > 1) { m.material.opacity = 0; return; } u.t += .014 * dt; m.position.x += u.vx * dt * (1 - u.t); m.position.z += u.vz * dt * (1 - u.t); m.position.y += u.vy * dt; m.scale.setScalar(.14 + u.t * .7); m.material.opacity = (1 - u.t) * .55; });
    scossa *= Math.pow(.88, dt);
    // la camera parte bassa, gira attorno alla pila e finisce sopra la pizza
    const av = io(seg(p, inizioAp - .08, inizioAp + .2)), caduta = io(seg(p, .02, inizioAp));
    const dist = mix(v ? 10.5 : 7.4, v ? 4.2 : 3.2, av), az = pal.yaw + pal.mx * .2 + mix(-.75, .35, caduta) * (1 - av), el = mix(mix(.28, .62, caduta), 1.34, av) - pal.my * .05;
    const sh = scossa * .05, sx = Math.sin(now * .09) * sh, sy = Math.cos(now * .11) * sh;
    pal.cam.position.set(Math.sin(az) * Math.cos(el) * dist + sx, .3 + Math.sin(el) * dist + sy, Math.cos(az) * Math.cos(el) * dist);
    pal.cam.lookAt(sx * .4, mix(.42, cima.position.y + .02, av), av * .16);
    canvas.style.cursor = pal.tiene ? 'grabbing' : 'grab';
  });
  return pal;
}

/* ---------- ingredienti: fotografie vere che cadono sulla foto vera della pizza ---------- */
const INGR = { basilico: ['img/ingr/basilico.webp', .3], pomodoro: ['img/ingr/pomodorino.webp', .19], mozzarella: ['img/ingr/mozzarella.webp', .3] };
export async function scenaIngredienti(canvas, imgPizza, bottoni, sezione) {
  const pal = new Palco(canvas, { fov: 30, z: 1, ombre: false }), S = new THREE.Group(); pal.scena.add(S);
  pal.scena.environment = null; const LATI = 1.6, tn = Math.tan(15 * Math.PI / 180); pal.cam.position.z = LATI / tn;
  const mappe = {}; const mappa = async n => mappe[n] || (mappe[n] = tex(await carica(INGR[n][0])));
  const om = sbuffo(), caduti = [];
  async function fai(n) {
    const t = await mappa(n), lato = INGR[n][1] * (.85 + Math.random() * .35), g = new THREE.Group();
    const omb = new THREE.Mesh(new THREE.PlaneGeometry(lato * 1.25, lato * 1.25), new THREE.MeshBasicMaterial({ map: om, color: 0x1a0a04, transparent: true, opacity: 0, depthWrite: false })); g.add(omb);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(lato, lato), new THREE.MeshBasicMaterial({ map: t, transparent: true, alphaTest: .25 })); g.add(m);
    const a = Math.random() * 6.28, r = Math.sqrt(Math.random()) * .74; g.position.set(Math.cos(a) * r, Math.sin(a) * r, 0); g.rotation.z = Math.random() * 6.28;
    g.userData = { z: 3.4 + Math.random() * .8, v: 0, posato: false, m, omb, gira: (Math.random() - .5) * .28, tilt: Math.random() * 2 }; S.add(g); caduti.push(g);
  }
  bottoni.forEach(b => b.addEventListener('click', () => { const n = b.dataset.ingr; if (n === 'via') { caduti.splice(0).forEach(o => S.remove(o)); return; } for (let i = 0; i < 4; i++) setTimeout(() => fai(n), i * 110); }));
  let ang = 0;
  pal.passi.push(() => {
    const entra = fermo ? 1 : clamp(1 - sezione.getBoundingClientRect().top / innerHeight, 0, 1.6);
    ang = pal.yaw * .9 + entra * 1.3 + performance.now() * .00004; S.rotation.z = -ang;
    imgPizza.style.transform = `rotate(${ang}rad) scale(${.92 + out(clamp(entra)) * .08})`;
    pal.cam.position.x = pal.mx * .04; pal.cam.position.y = -pal.my * .04; pal.cam.lookAt(0, 0, 0);
    caduti.forEach(g => { const u = g.userData; if (!u.posato) { u.v -= .0052; u.z += u.v; if (u.z <= .01) { u.z = .01; if (Math.abs(u.v) > .03) u.v *= -.28; else u.posato = true; } u.tilt *= .95; g.rotation.z += u.gira * Math.min(1, u.z); } g.position.z = u.z; u.m.rotation.x = u.tilt; u.omb.position.set(.012 + u.z * .1, -.02 - u.z * .1, -.002); u.omb.material.opacity = .55 * clamp(1 - u.z / 2.2); });
  });
  return pal;
}
