// Hero: la ripresa della pizza che si ribalta davanti al forno, fotogramma per fotogramma con lo scroll. Poi si apre a cerchio sulla foto dopo.
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const seg = (p, a, b) => clamp((p - a) / (b - a));
const io = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const out = t => 1 - Math.pow(1 - t, 3);
const outBack = t => 1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2);
const fermo = matchMedia('(prefers-reduced-motion: reduce)').matches;

const eroe = $('[data-eroe]'), fisso = $('.eroe-fisso'), arrivo = $('.foto-arrivo');
const tCotta = $('.t-cotta'), tDal = $('.t-dal');

/* ---------- lenis ---------- */
let lenis;
if (window.Lenis && !fermo) {
  lenis = new Lenis({ lerp: .085, smoothWheel: true });
  const g = t => { lenis.raf(t); requestAnimationFrame(g); }; requestAnimationFrame(g);
}

/* ---------- lettere ---------- */
function spezza(el) {
  const riga = $('[data-riga]', el), txt = riga.textContent; riga.textContent = '';
  const out_ = [], ac = document.createElement('span'); ac.className = 'ac';
  [...txt].forEach(c => {
    const s = document.createElement('span');
    if (c === ' ') { s.className = 'sp'; ac.appendChild(s); return; }
    s.className = 'l'; s.textContent = c; ac.appendChild(s); out_.push(s);
  });
  riga.appendChild(ac);
  return out_;
}
const lCotta = spezza(tCotta), lDal = spezza(tDal);
function adatta(el, largo, alto) {
  el.style.fontSize = '100px';
  const r = el.querySelector('[data-riga]'); r.style.display = 'inline-block';
  const w = r.getBoundingClientRect().width || 1, h = r.getBoundingClientRect().height || 1;
  el.style.fontSize = Math.min(100 * largo / w, 100 * alto / h) + 'px';
}
// i titoli stanno sul pavimento del forno, sotto la pizza
function misura() {
  const W = fisso.clientWidth, H = fisso.clientHeight, v = W / H < 1;
  [tCotta, tDal].forEach(t => { adatta(t, W * .94, H * (v ? .17 : .3)); t.style.top = 'auto'; t.style.bottom = (v ? H * .035 : H * .03) + 'px'; });
}

/* ---------- sequenza e scroll ---------- */
const seq = new Sequenza($('#seq-eroe'), { telefono: { cartella: 'media/seq/hero-t', n: 96 }, schermo: { cartella: 'media/seq/hero-o', n: 96 } });
let voluto = 0, p = 0, t0 = 0;
const misuraScroll = () => { const r = eroe.getBoundingClientRect(); voluto = clamp(-r.top / (eroe.offsetHeight - innerHeight)); };
addEventListener('scroll', misuraScroll, { passive: true });

function fotogramma(now) {
  requestAnimationFrame(fotogramma);
  p += (voluto - p) * (fermo ? 1 : .12); if (Math.abs(voluto - p) < .00008) p = voluto;
  const tIn = fermo ? 2 : (now - t0) / 1400;
  seq.vai(fermo ? 0 : seg(p, .03, .84));
  const n = lCotta.length;
  lCotta.forEach((s, i) => {
    const dir = i % 2 ? 1 : -1, cx = i - (n - 1) / 2, a = out(clamp((tIn - .05 - i * .028) / .62)), b = io(seg(p, .02 + i * .006, .2 + i * .006));
    s.style.transform = `translate3d(${b * (cx * 30 + dir * 18)}px,${(1 - a) * 80 + b * 120}%,0) rotateX(${(1 - a) * -60 + b * 40}deg)`;
    s.style.opacity = clamp(a * 1.6) * (1 - clamp((b - .5) / .5));
  });
  lDal.forEach((s, i) => {
    const a = outBack(seg(p, .62 + i * .008, .76 + i * .008)), b = io(seg(p, .82, .88));
    s.style.transform = `translate3d(0,${(1 - a) * 120 + b * 110}%,0) rotateX(${(1 - a) * -58}deg)`;
    s.style.opacity = seg(p, .62 + i * .008, .68 + i * .008) * (1 - b);
  });
  // la foto dopo si apre a cerchio dalla pizza: arriva identica alla prima scena, nessuno stacco
  const k = io(seg(p, .82, .97));
  arrivo.style.clipPath = `circle(${k * 125}vmax at 50% 46%)`;
  arrivo.style.visibility = k > 0 ? 'visible' : 'hidden';
}

misura();
addEventListener('resize', misura);
(document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(misura);
misuraScroll(); requestAnimationFrame(now => { t0 = now; fotogramma(now); });

/* ---------- storie bloccate ---------- */
const st = $('[data-storie]');
if (st) {
  const slides = $$('.storia', st), n = slides.length;
  const righe = slides.map(s => $$('.r>span', s)), extra = slides.map(s => [$('p', s), $('a', s)]);
  let q = 0;
  const giroS = () => {
    requestAnimationFrame(giroS);
    const r = st.getBoundingClientRect(), v = clamp(-r.top / (st.offsetHeight - innerHeight));
    q += (v - q) * (fermo ? 1 : .1);
    slides.forEach((s, i) => {
      const a = i / n, b = (i + 1) / n;
      const ap = i === 0 ? 1 : io(seg(q, a - .1, a + .04));
      s.style.clipPath = i === 0 ? 'none' : `circle(${ap * 120}vmax at 50% 50%)`;
      const img = $('img', s), locale = seg(q, a - .1, b);
      img.style.transform = `scale(${i === 0 ? 1 + q * n * .1 : 1.14 - locale * .1})`;
      // i testi entrano solo dopo: sulla prima scena serve la foto pulita per il passaggio dall'hero
      const ing = i === 0 ? out(seg(q, .012, .1)) : out(seg(q, a - .03, a + .08));
      const usc = i === n - 1 ? 0 : io(seg(q, b - .1, b - .03));
      righe[i].forEach((l, k) => { l.style.transform = `translateY(${(1 - out(clamp(ing * 1.5 - k * .22))) * 112 - usc * 40}%)`; });
      extra[i].forEach(e => { if (e) e.style.opacity = clamp(ing * 2 - .6) * (1 - usc); });
    });
  };
  giroS();
}
