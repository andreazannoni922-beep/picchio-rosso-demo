// Sezioni della home dopo l'hero
(() => {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v)), seg = (p, a, b) => clamp((p - a) / (b - a));
  const io = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2, out = t => 1 - Math.pow(1 - t, 3);
  const fermo = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const av = (el, a = .1) => { const r = el.getBoundingClientRect(); return clamp(-r.top / (el.offsetHeight - innerHeight || 1)); };
  const passi = [];
  const ogni = f => passi.push(f);
  const vista = (el, fn, opz = { threshold: .25 }) => new IntersectionObserver((es, o) => es.forEach(e => { if (e.isIntersecting) { fn(e.target); o.unobserve(e.target); } }), opz).observe(el);
  const parole = el => { const t = el.textContent.trim().split(/\s+/); el.innerHTML = t.map(w => `<span class="p">${w}</span>`).join(' '); return $$('.p', el); };

  /* titoli a righe che salgono */
  $$('.rosso h2').forEach(h => { const rr = $$('.r>span', h); if (window.gsap) { gsap.set(rr, { yPercent: 110 }); vista(h, () => gsap.to(rr, { yPercent: 0, duration: 1.2, stagger: .1, ease: 'expo.out' })); } });
  if (window.gsap) $$('.finale h2, .mezzodi-t h2, .domande h2').forEach(h => { gsap.from(h, { y: 60, opacity: 0, duration: 1.2, ease: 'expo.out', paused: true }); vista(h, () => gsap.fromTo(h, { y: 60, opacity: 0 }, { y: 0, opacity: 1, duration: 1.2, ease: 'expo.out' })); });

  /* rosso: pizza che rotola dentro con lo scroll, attratta dal cursore, ombra che si stacca */
  const ro = $('[data-rosso]');
  if (ro) {
    const pz = $('.rosso-pizza', ro), im = $('img', pz), sc = $('.scintille', ro);
    let s = 7; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    sc.innerHTML = Array.from({ length: 16 }, () => { const d = 2.5 + rnd() * 2.5; return `<i style="left:${rnd() * 100}%;top:${rnd() * 100}%;width:${d}px;height:${d}px;--d:${2.4 + rnd() * 3.6}s;--r:-${rnd() * 5}s"></i>`; }).join('');
    const m = { tx: 0, ty: 0, x: 0, y: 0, at: 0 };
    ro.addEventListener('pointermove', e => { const r = pz.getBoundingClientRect(); m.tx = (e.clientX - (r.left + r.width / 2)) * .05; m.ty = (e.clientY - (r.top + r.height / 2)) * .05; m.at = performance.now(); });
    ogni(now => {
      const r = ro.getBoundingClientRect(); if (r.bottom < -100 || r.top > innerHeight + 100) return;
      const v = clamp(1 - r.top / innerHeight), w = clamp(-r.top / r.height);
      if (now - m.at > 2600) { m.tx = 0; m.ty = 0; }
      m.x += (m.tx - m.x) * .05; m.y += (m.ty - m.y) * .05;
      const inn = out(v);
      pz.style.transform = `translate3d(${(1 - inn) * 60 + m.x}vw,${m.y * .1}vh,0)`.replace(`${(1 - inn) * 60 + m.x}vw`, `calc(${(1 - inn) * 60}vw + ${m.x}px)`).replace(`${m.y * .1}vh`, `${m.y + w * -60}px`);
      im.style.transform = `rotate(${(1 - inn) * 150 + w * 40}deg)`;
      const lift = 1 + Math.hypot(m.x, m.y) * .02;
      pz.style.setProperty('--sx', (-12 * lift) + 'px'); pz.style.setProperty('--sy', (30 * lift) + 'px');
    });
  }

  /* impasti: gli strati si aprono, la pizza gira, le colonne convergono, tre stazioni */
  const im = $('[data-impasti]');
  if (im) {
    const st = $$('.strati span', im), pz = $('.impasti-pizza', im), cl = $('.col-l', im), cr = $('.col-r', im), dd = $$('.impasti-d p', im);
    const li = [...$$('li', cl).map((x, i) => [x, $$('li', cr)[i]])];
    let q = 0;
    ogni(() => {
      const r = im.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) return;
      q += (av(im) - q) * (fermo ? 1 : .1);
      const a = out(seg(q, 0, .22)), H = innerHeight;
      st.forEach((s, i) => { const k = (st.length - 1 - i); s.style.transform = `translate3d(${k * a * 1.1}vmin,${k * a * 1.1}vmin,0)`; });
      pz.style.transform = `rotate(${q * 220}deg) scale(${.9 + a * .1})`;
      cl.style.transform = `translate3d(${(1 - a) * -24}vw,-50%,0)`.replace('-50%', innerWidth > 760 ? '-50%' : '0');
      cr.style.transform = `translate3d(${(1 - a) * 24}vw,-50%,0)`.replace('-50%', innerWidth > 760 ? '-50%' : '0');
      const k = Math.min(2, Math.floor(seg(q, .12, .98) * 3));
      li.forEach((c, i) => c.forEach(x => x.classList.toggle('su', i === k)));
      dd.forEach((d, i) => d.classList.toggle('su', i === k && a > .4));
    });
  }

  /* cancello: una linea rossa si apre sul 2014, la foto entra in diagonale e si stringe, la frase si accende */
  const ca = $('[data-cancello]');
  if (ca) {
    const po = $('.porta', ca), an = $('.porta-anno', ca), ri = $('.ritratto', ca), ii = $('img', ri), te = $('.storia-testo', ca), acc = parole($('[data-accendi]', ca));
    let q = 0;
    ogni(() => {
      const r = ca.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) return;
      q += (av(ca) - q) * (fermo ? 1 : .1);
      const ap = io(seg(q, 0, .24)), mob = innerWidth <= 760;
      po.style.clipPath = `inset(0 calc(${50 * (1 - ap)}% - ${(1 - ap) * 2}px))`;
      an.style.transform = `scale(${1.5 - ap * .5})`;
      const d = io(seg(q, .26, .46));
      // la foto apre in diagonale dall'angolo in alto a destra
      const a = d * 220;
      if (d < 1) ri.style.clipPath = `polygon(100% 0,${Math.max(100 - a, 0)}% 0,${a > 100 ? 0 : 100 - a}% ${a > 100 ? a - 100 : 0}%,${a > 100 ? a - 100 : 100}% ${a > 100 ? 100 : a}%,100% ${Math.min(a, 100)}%)`;
      const st = io(seg(q, .5, .68));
      if (d >= 1) {
        ri.style.clipPath = mob ? `inset(${st * 7}% ${st * 6}% ${st * 56}% ${st * 6}%)` : `inset(${st * 9}% ${st * 4}% ${st * 9}% ${st * 54}%)`;
      }
      ii.style.transform = mob ? `translate3d(${st * -2}%,${st * -7}%,0) scale(${1.14 - seg(q, .26, 1) * .14})` : `translateX(${st * 27}%) scale(${1.14 - seg(q, .26, 1) * .14})`;
      po.style.opacity = st > .02 ? 0 : 1;
      te.style.opacity = seg(q, .56, .64);
      te.style.pointerEvents = st > .8 ? 'auto' : 'none';
      const w = seg(q, .6, .84) * acc.length;
      acc.forEach((p, i) => p.classList.toggle('acc', i < w));
    });
  }

  /* carta: il calore scioglie la carta e scopre la tavola; il titolo è inchiostro sulla carta */
  const cc = $('[data-carta]');
  if (cc) {
    const tv = $('.carta-tela', cc), x = tv.getContext('2d'), M = document.createElement('canvas'), mx = M.getContext('2d');
    let W, H, D, fs, vivo = false, last = null, auto = -1;
    const RID = .25;
    const dim = () => {
      D = Math.min(devicePixelRatio || 1, 1.5); W = cc.clientWidth; H = cc.clientHeight;
      tv.width = W * D; tv.height = H * D; M.width = W * RID; M.height = H * RID;
      x.font = `900 100px 'Sofia Sans Extra Condensed'`;
      const lungo = W <= 760 ? 'Ancora calda.' : 'Ancora calda.';
      fs = Math.min(W * .94 / (x.measureText(lungo.toUpperCase()).width / 100), H * .36);
    };
    const timbro = (px, py, r) => {
      const n = 7;
      for (let i = 0; i < n; i++) {
        const a = Math.random() * 6.28, d = Math.random() * r * .7;
        const g = mx.createRadialGradient(0, 0, 0, 0, 0, 1); g.addColorStop(0, 'rgba(0,0,0,.95)'); g.addColorStop(.72, 'rgba(0,0,0,.72)'); g.addColorStop(1, 'rgba(0,0,0,0)');
        mx.save(); mx.translate((px + Math.cos(a) * d) * RID, (py + Math.sin(a) * d) * RID); mx.scale(r * RID * (.5 + Math.random() * .5), r * RID * (.5 + Math.random() * .5)); mx.fillStyle = g; mx.beginPath(); mx.arc(0, 0, 1, 0, 6.3); mx.fill(); mx.restore();
      }
    };
    cc.addEventListener('pointermove', e => {
      const r = cc.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top;
      const v = last ? Math.hypot(px - last[0], py - last[1]) : 0;
      const b = Math.min(W, H) * .1 + Math.min(v, 60) * 1.5;
      if (last) { const st = Math.max(1, Math.floor(v / 20)); for (let i = 1; i <= st; i++) timbro(last[0] + (px - last[0]) * i / st, last[1] + (py - last[1]) * i / st, b); } else timbro(px, py, b);
      last = [px, py];
    });
    cc.addEventListener('pointerleave', () => last = null);
    const T = document.createElement('canvas'), tx = T.getContext('2d');
    const disegna = now => {
      if (!vivo) return;
      if (auto > 0) { const k = (now - auto) / 2600; if (k < 1) timbro(W * (-.05 + k * 1.1), H * (.46 + Math.sin(k * 6) * .16), Math.min(W, H) * .12); else auto = -2; }
      // la carta si richiude piano
      mx.globalCompositeOperation = 'destination-out'; mx.fillStyle = 'rgba(0,0,0,.014)'; mx.fillRect(0, 0, M.width, M.height); mx.globalCompositeOperation = 'source-over';
      const P = W * D, Q = H * D;
      x.globalCompositeOperation = 'source-over'; x.clearRect(0, 0, P, Q);
      x.fillStyle = '#f4ead9'; x.fillRect(0, 0, P, Q);
      x.fillStyle = '#120b08'; x.textBaseline = 'top'; x.textAlign = 'center';
      x.font = `900 ${fs * D}px 'Sofia Sans Extra Condensed'`;
      const y0 = (W <= 760 ? H * .14 : H * .1) * D, lh = fs * D * .84;
      x.fillText('A CASA.', P / 2, y0); x.fillText('ANCORA CALDA.', P / 2, y0 + lh);
      // alone bruciato attorno al buco
      if (T.width !== P) { T.width = P; T.height = Q; }
      tx.clearRect(0, 0, P, Q); tx.globalCompositeOperation = 'source-over'; tx.filter = 'none';
      tx.imageSmoothingEnabled = true; tx.drawImage(M, -P * .006, -Q * .006, P * 1.012, Q * 1.012);
      tx.globalCompositeOperation = 'source-in'; tx.fillStyle = '#3a1a08'; tx.fillRect(0, 0, P, Q);
      x.globalCompositeOperation = 'source-atop'; x.globalAlpha = .9; x.drawImage(T, 0, 0); x.globalAlpha = 1;
      x.globalCompositeOperation = 'destination-out';
      x.imageSmoothingEnabled = true; x.drawImage(M, 0, 0, P, Q); x.drawImage(M, 0, 0, P, Q);
      x.globalCompositeOperation = 'source-over';
    };
    ogni(disegna);
    const ini = () => { dim(); };
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(ini); ini(); addEventListener('resize', dim);
    new IntersectionObserver(([e]) => { vivo = e.isIntersecting; if (vivo && auto === -1 && !matchMedia('(pointer:fine)').matches) auto = performance.now(); }, { threshold: .15 }).observe(cc);
  }

  /* roba buona: le parole si mettono a fuoco; i fornitori scorrono solo se scorri */
  $$('[data-fuoco]').forEach(el => { const w = parole(el); vista(el, () => w.forEach((p, i) => setTimeout(() => p.classList.add('acc'), i * 60))); });
  const fo = $('[data-fornitori]');
  if (fo) { const fi = $('.fila', fo); ogni(() => { const r = fo.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) return; fi.style.transform = `translate3d(${-((innerHeight - r.top) * .35)}px,0,0)`; }); }

  /* 12:00 */
  const me = $('[data-mezzodi]');
  if (me) { vista(me, e => e.classList.add('aperto'), { threshold: .35 }); const o = $('.ora', me); ogni(() => { const r = me.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) return; o.style.backgroundPosition = `50% ${50 + (r.top / innerHeight) * 30}%`; }); }

  /* finale */
  const fi = $('[data-finale]');
  if (fi) { const im2 = $('img', fi); ogni(() => { const r = fi.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) return; im2.style.transform = `translate3d(0,${r.top * -.09}px,0)`; }); }

  /* testata: colore sulle sezioni chiare, sparisce scendendo */
  const te = $('[data-testa]'), chiare = $$('[data-tono=chiaro]');
  let yP = 0;
  ogni(() => {
    te.classList.toggle('su-chiaro', chiare.some(s => { const r = s.getBoundingClientRect(); return r.top < 40 && r.bottom > 40; }));
    const y = scrollY, eroe = $('[data-eroe]'), fin = eroe ? eroe.offsetHeight - innerHeight : 0;
    if (y > fin + 200 && y > yP + 3) te.classList.add('via'); else if (y < yP - 3 || y <= fin + 200) te.classList.remove('via');
    yP = y;
  });

  /* menu: marea rossa, pizza che rotola, voci lettera per lettera */
  const ma = $('[data-marea]');
  if (ma && window.gsap) {
    const li = $$('.marea-l a', ma), pi = $('.marea-p', ma);
    li.forEach(a => { a.innerHTML = [...a.textContent].map(c => `<span>${c === ' ' ? '&nbsp;' : c}</span>`).join(''); });
    const apri = () => {
      ma.classList.add('su'); ma.inert = false;
      gsap.timeline()
        .to($('.marea-f', ma), { clipPath: 'circle(150% at calc(100% - 60px) 40px)', duration: 1, ease: 'expo.inOut' })
        .fromTo(pi, { x: '60vw', rotate: 200, opacity: 1 }, { x: 0, rotate: 0, duration: 1.4, ease: 'expo.out' }, '-=.55')
        .fromTo($$('.marea-l a span', ma), { yPercent: 110 }, { yPercent: 0, duration: .9, stagger: .012, ease: 'expo.out' }, '-=1.3')
        .to([$('.marea-b', ma), $('.marea-x', ma)], { opacity: 1, duration: .5 }, '-=.6');
    };
    const chiudi = () => {
      gsap.timeline({ onComplete: () => { ma.classList.remove('su'); ma.inert = true; } })
        .to([$('.marea-b', ma), $('.marea-x', ma)], { opacity: 0, duration: .2 })
        .to(pi, { x: '60vw', rotate: 200, duration: .7, ease: 'power3.in' }, 0)
        .to($$('.marea-l a span', ma), { yPercent: -110, duration: .4, stagger: .004, ease: 'power3.in' }, 0)
        .to($('.marea-f', ma), { clipPath: 'circle(0% at calc(100% - 60px) 40px)', duration: .8, ease: 'expo.inOut' }, .15);
    };
    document.addEventListener('click', e => { if (e.target.closest('[data-apri-menu]')) apri(); if (e.target.closest('[data-chiudi-menu]')) chiudi(); });
    addEventListener('keydown', e => { if (e.key === 'Escape' && ma.classList.contains('su')) chiudi(); });
    li.forEach(a => a.addEventListener('mouseenter', () => { pi.src = `img/cut/${a.dataset.cut}.webp`; gsap.fromTo(pi, { rotate: -40 }, { rotate: 0, duration: .9, ease: 'expo.out' }); }));
  }

  const giro = now => { passi.forEach(f => f(now)); requestAnimationFrame(giro); };
  requestAnimationFrame(giro);
})();
