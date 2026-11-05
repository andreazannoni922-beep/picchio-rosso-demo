// Sezioni della home dopo l'hero
(() => {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v)), seg = (p, a, b) => clamp((p - a) / (b - a));
  const io = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2, out = t => 1 - Math.pow(1 - t, 3);
  const fermo = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const av = (el, a = .1) => { const r = el.getBoundingClientRect(); return clamp(-r.top / (el.offsetHeight - innerHeight || 1)); };
  const passi = [];
  const te = $('[data-testa]'), chiare = $$('[data-tono=chiaro]');
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
    let sqP = null; new IntersectionObserver(([e], o) => { if (e.isIntersecting && window.Sequenza) { sqP = new Sequenza($('#seq-pasta', im), { telefono: { cartella: 'media/seq/pasta-t', n: 96 }, schermo: { cartella: 'media/seq/pasta-o', n: 96 } }); o.disconnect(); } }, { rootMargin: '150% 0px' }).observe(im);
    const st = $$('.strati span', im), cl = $('.col-l', im), cr = $('.col-r', im), dd = $$('.impasti-d p', im);
    const li = [...$$('li', cl).map((x, i) => [x, $$('li', cr)[i]])];
    let q = 0;
    ogni(() => {
      const r = im.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) return;
      q += (av(im) - q) * (fermo ? 1 : .1);
      const a = out(seg(q, 0, .22)), H = innerHeight;
      st.forEach((s, i) => { const k = (st.length - 1 - i); s.style.transform = `translate3d(${k * a * 1.1}vmin,${k * a * 1.1}vmin,0)`; });
      if (sqP) sqP.vai(fermo ? .6 : seg(q, .02, .98));
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
      const ap = io(seg(q, 0, .24)), W = innerWidth, H = innerHeight, mob = W < H, bw = mob ? Math.min(.88 * W, .38 * 1.5 * H) : Math.min(.44 * W, .78 * 1.5 * H), bh = bw / 1.5, x0 = mob ? (W - bw) / 2 : W - bw - W * .04, y0 = mob ? H * .11 : (H - bh) / 2, cw = Math.max(W, 1.5 * H);
      po.style.clipPath = `inset(0 calc(${50 * (1 - ap)}% - ${(1 - ap) * 2}px))`;
      an.style.transform = `scale(${1.5 - ap * .5})`;
      const d = io(seg(q, .26, .46));
      // la foto apre in diagonale dall'angolo in alto a destra
      const a = d * 220;
      if (d < 1) ri.style.clipPath = `polygon(100% 0,${Math.max(100 - a, 0)}% 0,${a > 100 ? 0 : 100 - a}% ${a > 100 ? a - 100 : 0}%,${a > 100 ? a - 100 : 100}% ${a > 100 ? 100 : a}%,100% ${Math.min(a, 100)}%)`;
      const st = io(seg(q, .5, .68));
      if (d >= 1) {
        ri.style.clipPath = `inset(${st * y0 / H * 100}% ${st * (W - x0 - bw) / W * 100}% ${st * (H - y0 - bh) / H * 100}% ${st * x0 / W * 100}%)`;
      }
      ii.style.width = cw + 'px';
      ii.style.transform = `translate3d(calc(-50% + ${st * (x0 + bw / 2 - W / 2)}px),calc(-50% + ${st * (y0 + bh / 2 - H / 2)}px),0) scale(${1.14 + st * (bw / cw - 1.14)})`;
      po.style.opacity = st > .02 ? 0 : 1;
      te.style.opacity = seg(q, .56, .64);
      te.style.pointerEvents = st > .8 ? 'auto' : 'none';
      const w = seg(q, .6, .84) * acc.length;
      acc.forEach((p, i) => p.classList.toggle('acc', i < w));
    });
  }

  /* carta: il cartone vero che si apre con lo scroll */
  const cc = $('[data-carta]');
  if (cc) {
    let sq = null, q = 0;
    const c1 = $('.c1', cc), c2 = $('.c2', cc), inf = $('.carta-info', cc);
    new IntersectionObserver(([e], o) => { if (e.isIntersecting && window.Sequenza) { sq = new Sequenza($('#seq-cartone'), { telefono: { cartella: 'media/seq/box-t', n: 96 }, schermo: { cartella: 'media/seq/box-o', n: 96 } }); o.disconnect(); } }, { rootMargin: '150% 0px' }).observe(cc);
    ogni(() => {
      const r = cc.getBoundingClientRect(); if (r.bottom < -80 || r.top > innerHeight + 80) return;
      q += (clamp(-r.top / (cc.offsetHeight - innerHeight)) - q) * (fermo ? 1 : .12);
      if (sq) sq.vai(fermo ? 1 : seg(q, .08, .82));
      const v = io(seg(q, .06, .3)), oriz = innerWidth > innerHeight;
      c1.style.transform = oriz ? `translate3d(${-v * 40}vw,-50%,0)` : `translate3d(0,${-v * 40}svh,0)`;
      c2.style.transform = oriz ? `translate3d(${v * 40}vw,-50%,0)` : `translate3d(0,${v * 40}svh,0)`;
      const a = seg(q, .76, .92); inf.style.opacity = a; inf.style.transform = `translateY(${(1 - a) * 34}px)`; inf.style.visibility = a > .02 ? 'visible' : 'hidden';
    });
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

  /* tra una pagina e l'altra: sipario rosso con la pizza che rotola */
  if (window.gsap && !fermo) {
    const si = document.createElement('div'); si.className = 'sipario'; si.setAttribute('aria-hidden', 'true'); si.innerHTML = '<img src="img/cut/margherita.webp" alt="">'; document.body.appendChild(si);
    const pz = $('img', si);
    if (document.documentElement.classList.contains('arrivo')) {
      gsap.set(si, { clipPath: 'inset(0 0 0 0)' }); document.documentElement.classList.remove('arrivo'); sessionStorage.removeItem('pr-via');
      gsap.timeline().to(pz, { x: '120vw', rotate: 420, duration: .85, ease: 'power3.in' }, 0).to(si, { clipPath: 'inset(0 0 100% 0)', duration: .8, ease: 'expo.inOut' }, .1);
    }
    document.addEventListener('click', e => {
      const a = e.target.closest('a[href]'); if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || a.target) return;
      const u = new URL(a.href, location.href);
      if (u.origin !== location.origin || !u.pathname.endsWith('.html') && u.pathname !== new URL('.', location.href).pathname) return;
      if (u.pathname === location.pathname) return;
      e.preventDefault();
      gsap.killTweensOf([si, pz]);
      gsap.set(pz, { x: '-120vw', rotate: -420 });
      gsap.timeline({ onComplete: () => { try { sessionStorage.setItem('pr-via', '1'); } catch (er) {} location.href = a.href; } })
        .fromTo(si, { clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0% 0 0 0)', duration: .6, ease: 'expo.inOut' }, 0)
        .to(pz, { x: 0, rotate: 0, duration: .7, ease: 'power3.out' }, .05);
    });
    addEventListener('pageshow', e => { if (e.persisted) { gsap.killTweensOf([si, pz]); gsap.set(si, { clipPath: 'inset(0 0 100% 0)' }); } });
  } else document.documentElement.classList.remove('arrivo');

  const adattaNome = () => $$('.piede-nome').forEach(n => { const s = $('span', n); s.style.display = 'inline-block'; n.style.fontSize = '100px'; const w = s.getBoundingClientRect().width; n.style.fontSize = 100 * n.clientWidth / w * .995 + 'px'; s.style.display = 'block'; });
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(adattaNome); adattaNome(); addEventListener('resize', adattaNome);
  $$('.piede-nome').forEach(n => vista(n, e => e.classList.add('su'), { threshold: .2 }));

  const giro = now => { passi.forEach(f => f(now)); requestAnimationFrame(giro); };
  requestAnimationFrame(giro);
})();
