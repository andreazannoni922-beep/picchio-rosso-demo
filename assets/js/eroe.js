// Hero: solo il forno e il titolo. Scorrendo si entra nel fuoco.
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const seg = (p, a, b) => clamp((p - a) / (b - a));
const io = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const out = t => 1 - Math.pow(1 - t, 3);
const fermo = matchMedia('(prefers-reduced-motion: reduce)').matches;
const eroe = $('[data-eroe]'), fisso = $('.eroe-fisso'), arrivo = $('.foto-arrivo'), fuoco = $('.fuoco'), tCotta = $('.t-cotta');

let lenis;
if (window.Lenis && !fermo) { lenis = new Lenis({ lerp: .085, smoothWheel: true }); const g = t => { lenis.raf(t); requestAnimationFrame(g); }; requestAnimationFrame(g); }

const riga = $('[data-riga]', tCotta), parole = innerWidth < innerHeight ? ['Cotta', 'a legna'] : [riga.textContent]; riga.textContent = '';
const ll = [];
parole.forEach(p => { const ac = document.createElement('span'); ac.className = 'ac'; [...p].forEach(c => { const s = document.createElement('span'); if (c === ' ') { s.className = 'sp'; ac.appendChild(s); return; } s.className = 'l'; s.textContent = c; ac.appendChild(s); ll.push(s); }); riga.appendChild(ac); });
function misura() {
  const W = fisso.clientWidth, H = fisso.clientHeight, v = W < H, r = riga; tCotta.style.fontSize = '100px'; r.style.display = 'inline-block';
  const b = r.getBoundingClientRect(); tCotta.style.fontSize = Math.min(100 * W * (v ? .88 : .9) / b.width, 100 * H * (v ? .36 : .46) / b.height) + 'px';
  tCotta.style.top = 'auto'; tCotta.style.bottom = (v ? H * .05 : H * .03) + 'px';
}
let voluto = 0, p = 0, t0 = 0;
const misuraScroll = () => { const r = eroe.getBoundingClientRect(); voluto = clamp(-r.top / (eroe.offsetHeight - innerHeight)); };
addEventListener('scroll', misuraScroll, { passive: true });
function fotogramma(now) {
  requestAnimationFrame(fotogramma);
  p += (voluto - p) * (fermo ? 1 : .1); if (Math.abs(voluto - p) < .00008) p = voluto;
  const tIn = fermo ? 2 : (now - t0) / 1500, n = ll.length;
  fuoco.style.transform = `scale(${1.02 + io(seg(p, 0, .8)) * .75})`;
  ll.forEach((s, i) => {
    const dir = i % 2 ? 1 : -1, cx = i - (n - 1) / 2, a = out(clamp((tIn - .28 - i * .03) / .7)), b = io(seg(p, .04 + Math.abs(cx) * .012, .62));
    s.style.transform = `translate3d(${b * cx * 70}px,${(1 - a) * 90 + b * dir * 24}%,${b * 500}px) rotateX(${(1 - a) * -60}deg)`;
    s.style.opacity = clamp(a * 1.6) * (1 - seg(b, .55, 1));
  });
  const sf = $('.storie-fisso'); if (sf) sf.style.visibility = $('[data-storie]').getBoundingClientRect().top > 1 ? 'hidden' : 'visible';
  const k = io(seg(p, .7, .97)); arrivo.style.clipPath = `circle(${k * 125}vmax at 50% 50%)`; arrivo.style.visibility = k > 0 ? 'visible' : 'hidden';
}
misura(); addEventListener('resize', misura);
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
