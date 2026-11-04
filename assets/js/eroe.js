// Hero: la pizza vera in 3D davanti al fuoco. Si ribalta flettendosi come pasta e atterra nella foto della sezione dopo.
import * as THREE from 'three';

const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const mix = (a, b, t) => a + (b - a) * t;
const seg = (p, a, b) => clamp((p - a) / (b - a));
const io = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const out = t => 1 - Math.pow(1 - t, 3);
const outBack = t => 1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2);
const fermo = matchMedia('(prefers-reduced-motion: reduce)').matches;

const eroe = $('[data-eroe]'), fisso = $('.eroe-fisso'), fuoco = $('.fuoco'), arrivo = $('.foto-arrivo'), alone = $('.alone'), testa = $('[data-testa]');
const tCotta = $('.t-cotta'), tDal = $('.t-dal'), frasi = $$('.frase');

/* ---------- lenis ---------- */
let lenis;
if (window.Lenis && !fermo) {
  lenis = new Lenis({ lerp: .085, smoothWheel: true });
  const g = t => { lenis.raf(t); requestAnimationFrame(g); }; requestAnimationFrame(g);
}

/* ---------- lettere ---------- */
function spezza(el) {
  const riga = $('[data-riga]', el), txt = riga.textContent; riga.textContent = '';
  const parole = window.innerWidth <= 720 && el === tCotta ? ['Cotta a', 'legna'] : [txt];
  const out = [];
  parole.forEach(p => {
    const ac = document.createElement('span'); ac.className = 'ac';
    [...p].forEach(c => {
      const s = document.createElement('span');
      if (c === ' ') { s.className = 'sp'; ac.appendChild(s); return; }
      s.className = 'l'; s.textContent = c; ac.appendChild(s); out.push(s);
    });
    riga.appendChild(ac);
  });
  return out;
}
const lCotta = spezza(tCotta), lDal = spezza(tDal);

/* ---------- misure ---------- */
const M = { W: 0, H: 0, mob: false, heroD: 0, heroY: 0, midD: 0, midY: 0, arrD: 0, arrX: 0, arrY: 0 };
function adatta(el, largo, alto) {
  el.style.fontSize = '100px';
  const r = el.querySelector('[data-riga]');
  r.style.display = 'inline-block';
  const w = r.getBoundingClientRect().width || 1, h = r.getBoundingClientRect().height || 1;
  const fs = Math.min(100 * largo / w, 100 * alto / h);
  el.style.fontSize = fs + 'px';
  return fs;
}
// la margherita nella foto di arrivo (1800×1350): centro e diametro misurati sulla foto
const FOTO = { w: 1800, h: 1350, cx: .49, cy: .5, d: .64 };
function misura() {
  M.W = fisso.clientWidth; M.H = fisso.clientHeight; M.mob = M.W <= 720;
  const { W, H, mob } = M;
  adatta(tCotta, W * (mob ? .92 : .95), H * (mob ? .34 : .52));
  tCotta.style.top = (mob ? Math.max(96, H * .13) : H * .105) + 'px';
  const fs = adatta(tDal, W * (mob ? .72 : .36), H * .22);
  const tb = tCotta.getBoundingClientRect().height;
  M.heroD = mob ? Math.min(W * .98, H * .5) : Math.min(H * .74, W * .52);
  M.heroY = mob ? H * .66 : H * .615;
  M.midD = mob ? Math.min(W * .74, H * .38) : Math.min(H * .6, W * .4);
  M.midY = mob ? H * .44 : H * .44;
  tDal.style.top = (M.midY + M.midD * .5 + (mob ? 8 : 6)) + 'px';
  // arrivo: stesse regole di object-fit: cover
  const sc = Math.max(W / FOTO.w, H / FOTO.h), iw = FOTO.w * sc, ih = FOTO.h * sc;
  M.arrD = FOTO.d * iw;
  M.arrX = (W - iw) / 2 + FOTO.cx * iw;
  M.arrY = (H - ih) / 2 + FOTO.cy * ih;
  // frasi attorno alla pizza
  const off = M.midD * .5 + (mob ? -6 : Math.min(W * .075, 110));
  frasi.forEach((f, i) => {
    const sx = i % 2 === 0, alta = i < 2;
    f.style.top = mob ? '' : (M.midY + (alta ? -M.midD * .3 : M.midD * .12)) + 'px';
    if (mob) {
      const y = M.midY + M.midD * .5 + fs + (alta ? 24 : 24 + 86);
      f.style.top = y + 'px';
      f.style.left = sx ? 'var(--g)' : ''; f.style.right = sx ? '' : 'var(--g)';
      f.style.textAlign = sx ? 'left' : 'right';
    } else {
      f.style.left = sx ? '' : (W / 2 + off) + 'px';
      f.style.right = sx ? (W / 2 + off) + 'px' : '';
    }
  });
  dimRender();
}

/* ---------- three ---------- */
let gl, scena, cam, radice, tilt, giro, spin, uni = { uBend: { value: 0 } }, fuocoL, ok = false;
const R = 500, SP = 30;
try {
  gl = new THREE.WebGLRenderer({ canvas: $('#pizza'), alpha: true, antialias: true, powerPreference: 'high-performance' });
  gl.setClearColor(0, 0);
  gl.outputColorSpace = THREE.SRGBColorSpace;
  gl.toneMapping = THREE.NoToneMapping;
  scena = new THREE.Scene();
  cam = new THREE.PerspectiveCamera(26, 1, 10, 8000);
  ok = true;
} catch (e) { document.documentElement.classList.add('no-gl'); }

function dimRender() {
  if (!ok) return;
  const { W, H } = M;
  gl.setPixelRatio(Math.min(devicePixelRatio || 1, W <= 720 ? 2 : 2));
  gl.setSize(W, H, false);
  cam.aspect = W / H;
  cam.position.z = (H / 2) / Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
  cam.updateProjectionMatrix();
}

// rilievo: dalla foto ricavo una mappa di normali, così il fuoco lavora su bordi, basilico e bruciature
function mappaRilievo(img, S = 640) {
  const c = document.createElement('canvas'); c.width = c.height = S;
  const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0, S, S);
  const d = x.getImageData(0, 0, S, S), a = d.data, h = new Float32Array(S * S);
  for (let i = 0; i < S * S; i++) h[i] = a[i * 4 + 3] < 40 ? 0 : (a[i * 4] * .3 + a[i * 4 + 1] * .59 + a[i * 4 + 2] * .11) / 255;
  const o = x.createImageData(S, S), b = o.data;
  for (let y = 0; y < S; y++) for (let k = 0; k < S; k++) {
    const l = h[y * S + Math.max(k - 1, 0)], r = h[y * S + Math.min(k + 1, S - 1)], u = h[Math.max(y - 1, 0) * S + k], w = h[Math.min(y + 1, S - 1) * S + k];
    let nx = (l - r) * 3.2, ny = (w - u) * 3.2; const nz = 1, n = Math.hypot(nx, ny, nz);
    const i = (y * S + k) * 4;
    b[i] = (nx / n * .5 + .5) * 255; b[i + 1] = (ny / n * .5 + .5) * 255; b[i + 2] = (nz / n * .5 + .5) * 255; b[i + 3] = 255;
  }
  x.putImageData(o, 0, 0);
  const t = new THREE.CanvasTexture(c); t.anisotropy = 8; return t;
}
function materiale(map, norm, segno, tinta) {
  const m = new THREE.MeshStandardMaterial({ map, normalMap: norm || null, normalScale: new THREE.Vector2(.9, .9), roughness: .78, metalness: 0, alphaTest: .5, alphaToCoverage: true, color: tinta || 0xffffff, side: tinta ? THREE.DoubleSide : THREE.FrontSide });
  m.onBeforeCompile = s => {
    s.uniforms.uBend = uni.uBend;
    s.uniforms.uSegno = { value: segno };
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nuniform float uBend; uniform float uSegno;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        float rr = dot(position.xy, position.xy) / ${(R * R).toFixed(1)};
        transformed.z += uSegno * uBend * ${(R * .42).toFixed(1)} * (rr - .35 + .35 * sin(position.x * .006 + position.y * .002) * rr);`);
  };
  return m;
}
const carica = u => new Promise((ok_, ko) => new THREE.TextureLoader().load(u, t => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = gl.capabilities.getMaxAnisotropy(); ok_(t); }, undefined, ko));

async function montaPizza() {
  const [fr, re] = await Promise.all([carica('img/cut/margherita.webp'), carica('img/cut/radicchio.webp')]);
  const nf = mappaRilievo(fr.image), nr = mappaRilievo(re.image);
  const geo = new THREE.PlaneGeometry(R * 2, R * 2, 72, 72);
  radice = new THREE.Group(); tilt = new THREE.Group(); giro = new THREE.Group(); spin = new THREE.Group();
  radice.add(tilt); tilt.add(giro); giro.add(spin);
  const a = new THREE.Mesh(geo, materiale(fr, nf, 1)); a.position.z = SP / 2; spin.add(a);
  const b = new THREE.Mesh(geo, materiale(re, nr, -1)); b.rotation.y = Math.PI; b.position.z = -SP / 2; spin.add(b);
  // lo spessore della pasta: fette interne color cornicione, arrotondate verso il bordo
  const N = 9;
  for (let i = 1; i < N; i++) {
    const k = i / N * 2 - 1, q = 1 - .018 * k * k;
    const f = new THREE.Mesh(geo, materiale(fr, null, 1, 0xc98f5a));
    f.position.z = k * SP / 2; f.scale.setScalar(.985 * q); spin.add(f);
  }
  scena.add(radice);
  scena.add(new THREE.AmbientLight(0xfff1e0, 2.5));
  const key = new THREE.DirectionalLight(0xfff4e6, 1.15); key.position.set(-.25, .55, 1); scena.add(key);
  fuocoL = new THREE.PointLight(0xff7a2e, 0, 0, 0); scena.add(fuocoL);
  const r2 = new THREE.DirectionalLight(0xff9a55, .5); r2.position.set(.9, -.5, .3); scena.add(r2);
  document.documentElement.classList.add('gl-pronto');
}

/* ---------- mouse e scroll ---------- */
const mouse = { tx: 0, ty: 0, x: 0, y: 0 };
if (!fermo && matchMedia('(pointer:fine)').matches) addEventListener('pointermove', e => { mouse.tx = e.clientX / innerWidth * 2 - 1; mouse.ty = e.clientY / innerHeight * 2 - 1; });
let voluto = 0, p = 0, angPrima = 0, ingresso = -1, t0 = 0, bend = 0;
const misuraScroll = () => { const r = eroe.getBoundingClientRect(); voluto = clamp(-r.top / (eroe.offsetHeight - innerHeight)); };
addEventListener('scroll', misuraScroll, { passive: true });

function lettereCotta(tIn, pOut) {
  const n = lCotta.length;
  lCotta.forEach((s, i) => {
    const seg_ = i % 2 ? 1 : -1;
    const a = out(clamp((tIn - .12 - i * .028) / .62));
    const b = io(seg((pOut), .04 + i * .007, .27 + i * .007));
    const cx = i - (n - 1) / 2;
    const x = (1 - a) * (cx * -6) + b * (cx * 46 + seg_ * 26);
    const y = (1 - a) * 72 - b * 260;
    const rx = (1 - a) * -62 + b * -38;
    const rz = (1 - a) * seg_ * 6 + b * seg_ * (10 + Math.abs(cx) * 2);
    const yU = y;
    s.style.transform = `translate3d(${x}px,${yU}%,0) rotateX(${rx}deg) rotateZ(${rz}deg)`;
    s.style.opacity = clamp(a * 1.6) * (1 - clamp((b - .55) / .45));
  });
}
function lettereDal(pv) {
  const n = lDal.length;
  lDal.forEach((s, i) => {
    const a = outBack(seg(pv, .36 + i * .008, .5 + i * .008));
    const b = io(seg(pv, .72, .8));
    s.style.transform = `translate3d(0,${(1 - a) * 130 - b * 60}%,0) rotateX(${(1 - a) * -58}deg)`;
    s.style.opacity = seg(pv, .36 + i * .008, .42 + i * .008) * (1 - b);
  });
}

function fotogramma(now) {
  requestAnimationFrame(fotogramma);
  p += (voluto - p) * (fermo ? 1 : .09); if (Math.abs(voluto - p) < .00008) p = voluto;
  if (p >= 1 && voluto >= 1 && document.hidden) return;
  const tIn = ingresso < 0 ? 0 : fermo ? 2 : (now - ingresso) / 1500;
  lettereCotta(tIn, p); lettereDal(p);
  frasi.forEach((f, i) => {
    const a = out(seg(p, .47 + i * .022, .58 + i * .022)), b = io(seg(p, .7, .76));
    const dir = i % 2 ? 1 : -1;
    f.style.opacity = a * (1 - b);
    f.style.transform = `translateX(${(1 - a) * dir * 40 + b * dir * 30}px)`;
    const l = f.querySelector('i'); if (l) l.style.transform = `scaleX(${out(seg(p, .52 + i * .022, .62 + i * .022))})`;
  });
  // il forno: la camera avanza piano verso il fuoco
  const zoom = 1.04 + io(seg(p, 0, .9)) * .34 + (now * .00001) % .0001;
  const sc = 1 - .5 * seg(p, .86, .97);
  fuoco.style.transform = `scale(${zoom}) translateY(${-seg(p, 0, .9) * 2.6}%)`;
  fuoco.style.filter = `brightness(${mix(1.02, .72, seg(p, .3, .9)) * (.96 + Math.sin(now * .004) * .02 + Math.sin(now * .0113) * .02)}) saturate(1.12) contrast(1.06)`;
  arrivo.style.opacity = io(seg(p, .925, .985));
  alone.style.opacity = (1 - seg(p, .82, .94)) * (ingresso < 0 ? 0 : clamp(tIn * 1.2));
  testa.classList.toggle('via', false);
  if (ok && radice) {
    const { W, H } = M;
    // arrivo: dall'alto, con un leggero rimbalzo
    const a = fermo ? 1 : outBack(clamp((tIn - .05) / .95));
    const drop = (1 - a) * (-H * .95);
    // scala e posizione lungo il film
    const s1 = io(seg(p, .08, .44)), s2 = io(seg(p, .74, .96));
    const D = mix(mix(M.heroD, M.midD, s1), M.arrD, s2);
    const cy = mix(mix(M.heroY, M.midY, s1), M.arrY, s2);
    const cx = mix(W / 2, M.arrX, s2);
    radice.position.set(cx - W / 2, H / 2 - cy - drop, 0);
    radice.scale.setScalar(D / (R * 2) * (1 + .03 * Math.sin(p * Math.PI)));
    // i due ribaltamenti
    const f1 = io(seg(p, .1, .44)), f2 = io(seg(p, .72, .93));
    const ang = (f1 + f2) * Math.PI;
    giro.rotation.y = ang;
    giro.rotation.x = Math.sin(f1 * Math.PI) * -.46 + Math.sin(f2 * Math.PI) * .34;
    giro.rotation.z = Math.sin(f1 * Math.PI) * .16 - Math.sin(f2 * Math.PI) * .12;
    // la pasta si flette con la velocità del ribaltamento
    const vel = ang - angPrima; angPrima = ang;
    bend += ((clamp(vel * 18, -.7, .7) * (1 - s2 * .5)) - bend) * .12;
    uni.uBend.value = bend + Math.sin(now * .0016) * .006;
    // rotazione lenta sul piatto: sparisce all'arrivo, per combaciare con la foto
    const lenta = (1 - s2) * (now * .00006 + p * 1.6);
    spin.rotation.z = lenta + (1 - a) * 1.4;
    // il mouse inclina la pizza
    mouse.x += (mouse.tx - mouse.x) * .05; mouse.y += (mouse.ty - mouse.y) * .05;
    const lib = 1 - s2;
    tilt.rotation.y = mouse.x * .2 * lib;
    tilt.rotation.x = mouse.y * .15 * lib + (1 - a) * -.7 - .05 * lib * (1 - s1);
    tilt.position.y = Math.sin(now * .0009) * 5 * lib;
    // il fuoco illumina da sinistra e sfarfalla
    const fl = 1.15 + Math.sin(now * .007) * .22 + Math.sin(now * .0173) * .16 + Math.sin(now * .031) * .08;
    fuocoL.position.set(-W * .5, -H * .05, 620);
    fuocoL.intensity = fl * 1.25 * (1 - s2);
    alone.style.transform = `translate3d(0,${cy}px,0) scale(${D / Math.min(W, H) * 1.05})`;
    gl.domElement.style.opacity = 1 - seg(p, .972, .992);
    gl.render(scena, cam);
  }
}

misura();
addEventListener('resize', misura);
(document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(() => { misura(); });
(ok ? montaPizza() : Promise.resolve()).catch(() => document.documentElement.classList.add('no-gl')).finally(() => {
  ingresso = performance.now(); misuraScroll(); requestAnimationFrame(fotogramma);
});

/* ---------- storie bloccate ---------- */
const st = $('[data-storie]');
if (st) {
  const slides = $$('.storia', st), bott = $$('.progressi button', st), n = slides.length;
  const righe = slides.map(s => $$('.r>span', s)), extra = slides.map(s => [$('p', s), $('a', s)]);
  let q = 0;
  const giroS = () => {
    requestAnimationFrame(giroS);
    const r = st.getBoundingClientRect(), v = clamp(-r.top / (st.offsetHeight - innerHeight));
    q += (v - q) * (fermo ? 1 : .1);
    slides.forEach((s, i) => {
      const a = i / n, b = (i + 1) / n;
      const ap = i === 0 ? 1 : io(seg(q, a - .1, a + .04));
      s.style.clipPath = i === 0 ? 'inset(0)' : `inset(${(1 - ap) * 100}% 0 0 0)`;
      const img = $('img', s), locale = seg(q, a - .1, b);
      img.style.transform = `scale(${i === 0 ? 1 + q * n * .1 : 1.14 - locale * .1})`;
      // i testi entrano solo dopo: sulla prima scena serve la foto pulita per il passaggio dall'hero
      const ing = i === 0 ? out(seg(q, .012, .1)) : out(seg(q, a - .03, a + .08));
      const usc = i === n - 1 ? 0 : io(seg(q, b - .1, b - .03));
      righe[i].forEach((l, k) => { l.style.transform = `translateY(${(1 - out(clamp(ing * 1.5 - k * .22))) * 112 - usc * 40}%)`; });
      extra[i].forEach(e => { if (e) e.style.opacity = clamp(ing * 2 - .6) * (1 - usc); });
      bott[i].classList.toggle('su', q >= a - .02 && q < b - .02 || (i === n - 1 && q >= b - .02));
      $('i', bott[i]).style.transform = `scaleX(${seg(q, a, b)})`;
    });
    $('.progressi', st).style.opacity = out(seg(q, .012, .1));
  };
  giroS();
  bott.forEach((b, i) => b.addEventListener('click', () => { const y = st.offsetTop + (st.offsetHeight - innerHeight) * ((i + .25) / n); lenis ? lenis.scrollTo(y, { duration: 1.6 }) : scrollTo(0, y); }));
}
