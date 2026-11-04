// pagine interne: ogni palco è legato allo scroll, stessa grammatica della home
(() => {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v)), seg = (p, a, b) => clamp((p - a) / (b - a));
  const io = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2, out = t => 1 - Math.pow(1 - t, 3);
  const fermo = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const stadi = [], sempre = [];
  const palco = (el, fn) => { if (el) stadi.push({ el, fn }); };
  const giro = () => {
    for (const { el, fn } of stadi) {
      const r = el.getBoundingClientRect();
      if (r.bottom < -80 || r.top > innerHeight + 80) continue;
      fn(clamp(-r.top / Math.max(1, el.offsetHeight - innerHeight)), r);
    }
    sempre.forEach(f => f());
    requestAnimationFrame(giro);
  };
  PR.palco = palco;

  /* titoli: parole che salgono */
  if (window.gsap && !fermo) {
    $$('h1[data-sale] .riga>span').forEach((s, i) => gsap.from(s, { yPercent: 112, duration: 1.3, delay: .15 + i * .09, ease: 'expo.out' }));
    $$('[data-parole]').forEach(h => {
      const w = PR.parole(h);
      gsap.set(w, { yPercent: 112 });
      new IntersectionObserver(([e], o) => { if (e.isIntersecting) { gsap.to(w, { yPercent: 0, duration: 1.1, stagger: .05, ease: 'expo.out' }); o.disconnect(); } }, { threshold: .15 }).observe(h);
    });
  }

  if (!fermo) {
    /* storia · apertura: il video si stringe, le righe si separano */
    const se = $('.s-eroe');
    if (se) {
      const fo = $('.fondo', se), rr = $$('h1 .riga', se), so = $('.sotto', se), sq = new Sequenza($('#seq-pala'), { telefono: { cartella: 'media/seq/pala-t', n: 96 }, schermo: { cartella: 'media/seq/pala-o', n: 96 } });
      palco(se, p => {
        sq.vai(seg(p, .02, .8));
        const k = io(seg(p, .72, 1));
        fo.style.transform = `scale(${1 + k * .06})`;
        rr.forEach((r, i) => { const t = io(seg(p, .04, .4)); r.style.transform = `translate3d(${(i % 2 ? 1 : -1) * t * 110}vw,0,0)`; });
        so.style.opacity = 1 - seg(p, .05, .3);
      });
    }

    /* storia · capitoli: si scorre di lato, la pizza rotola lungo la strada */
    const an = $('.anni');
    if (an) {
      const na = $('.anni-nastro', an), ru = $('.anni-ruota', an), cc = $$('.capitolo', an), con = $('[data-conta]', an);
      palco(an, p => {
        const W = cc[0].offsetWidth, t = p * (cc.length - 1), i0 = Math.min(cc.length - 2, Math.floor(t)), f = t - i0, liscio = f * f * f * (f * (6 * f - 15) + 10); // ogni capitolo si ferma
        const x = (i0 + liscio) * W, d = ru.offsetWidth, tot = x / ((cc.length - 1) * W);
        na.style.transform = `translate3d(${-x}px,0,0)`;
        const rx = tot * (W - d);
        ru.style.transform = `translate3d(${rx}px,0,0) rotate(${rx / (d / 2) * 57.3}deg)`;
        cc.forEach((c, i) => {
          const l = (i * W - x) / W; // 1 = appena fuori a destra, 0 = in scena, -1 = uscito
          $('.cap-n', c).style.transform = `translate3d(${l * 38}vw,0,0)`;
          const im = $('.cap-f img', c); if (im) im.style.transform = `translate3d(${l * -9}%,0,0) scale(1.22)`;
        });
        if (con) { const k = seg(x / W, 1.35, 2); const n = Math.round(2 + k * 8); con.textContent = k >= 1 ? '10+' : String(n); }
      });
    }

    /* storia · trofei: scorrono davanti al titolo fermo, a velocità diverse */
    const tr = $('.trofei');
    if (tr) { const ff = $$('figure', tr); palco(tr, (p, r) => { ff.forEach((f, i) => { f.style.transform = `translate3d(0,${(i ? -1 : 1) * (r.top * .05)}px,0)`; }); }); }

    /* storia · tre impasti: uno alla volta, la pizza gira */
    const te = $('.tre');
    if (te) {
      const ii = $$('.impasto', te), pz = $('.tre-pizza', te); let cur = -1;
      palco(te, p => {
        const n = Math.min(ii.length - 1, Math.floor(p * ii.length));
        if (n !== cur) { cur = n; ii.forEach((x, i) => x.classList.toggle('su', i === n)); }
        pz.style.transform = `rotate(${p * 400}deg)`;
      });
    }

    /* aziende · apertura: la foto si allarga fino a riempire lo schermo */
    const ae = $('.a-eroe');
    if (ae) {
      const fo = $('.a-foto', ae), rr = $$('h1 .riga', ae), so = $('.a-sotto', ae), sq = new Sequenza($('#seq-casse'), { telefono: { cartella: 'media/seq/casse-t', n: 96 }, schermo: { cartella: 'media/seq/casse-o', n: 96 } });
      palco(ae, p => {
        sq.vai(seg(p, .02, .76));
        const k = io(seg(p, .03, .3)), mob = innerWidth <= 760;
        fo.style.setProperty('--scuro', (seg(p, .72, .88) * .6).toFixed(3));
        rr[0].style.transform = `translate3d(0,${-k * 40}svh,0)`;
        rr[1].style.transform = `translate3d(0,${k * 40}svh,0)`;
        const a = seg(p, .76, .9); so.style.opacity = a; so.style.visibility = a > .02 ? 'visible' : 'hidden';
        so.style.transform = mob ? `translateY(${(1 - a) * 40}px)` : `translateY(calc(-50% + ${(1 - a) * 40}px))`;
      });
    }

    /* aziende · vantaggi: fogli che si impilano, quello sotto arretra */
    const ff = $$('.foglio');
    ff.forEach((f, i) => {
      const d = $('.foglio-d', f), nx = ff[i + 1], im = $('img', f), cir = $$('.circuiti span', f);
      sempre.push(() => {
          const r = f.getBoundingClientRect();
          const su = nx ? clamp(1 - nx.getBoundingClientRect().top / innerHeight) : 0;
          if (su >= 1) return;
          d.style.transform = su ? `scale(${1 - su * .08}) translate3d(0,${su * 3}svh,0)` : 'none';
          d.style.filter = su ? `brightness(${1 - su * .45})` : 'none';
          const en = clamp(1 - r.top / innerHeight);
          if (im) im.style.transform = `rotate(${(en + su) * 150 - 150}deg) scale(${.72 + out(en) * .28})`;
          cir.forEach((c, k) => { c.style.transform = `translate3d(${(1 - out(clamp(en * 1.5 - k * .1))) * 34}vw,0,0)`; });
      });
    });

    /* aziende · la telefonata: il titolo si accende, poi la pizza fa la strada */
    const pa = $('.passaggi');
    if (pa) {
      const w = PR.parole($('h2', pa)), pi = $('.pista', pa), li = $('i', pi), ru = $('img', pi), st = $$('.passaggio', pa);
      palco(pa, p => {
        w.forEach((s, i) => s.classList.toggle('su', seg(p, 0, .34) * (w.length + .5) > i));
        const k = seg(p, .36, .96), L = pi.offsetWidth, d = ru.offsetWidth, x = k * (L - d);
        li.style.transform = `scaleX(${k})`;
        ru.style.transform = `translate3d(${x}px,0,0) rotate(${x / (d / 2) * 57.3}deg)`;
        st.forEach((s, i) => s.classList.toggle('su', k > .03 + i * .32));
      });
    }

    /* contatti · la mappa si apre dal punto */
    const dv = $('.dove');
    if (dv) {
      const ma = $('.dove-mappa', dv), h2 = $('h2', dv), vai = $('.dove-vai', dv);
      palco(dv, p => {
        const k = io(seg(p, .05, .78));
        ma.style.clipPath = `circle(${6 + k * 130}vmax at 50% 50%)`;
        h2.style.opacity = 1 - seg(p, .35, .62);
        h2.style.transform = `translateY(-50%) scale(${1 + k * .35})`;
        dv.classList.toggle('libera', p > .8);
        const a = seg(p, .78, .92); vai.style.opacity = a; vai.style.visibility = a > .02 ? 'visible' : 'hidden';
      });
    }

    /* continua con: la pizza attraversa lo schermo */
    const pr = $('.prossima');
    if (pr) { const im = $('img', pr); palco(pr, (p, r) => { const k = clamp(1 - r.top / innerHeight), d = im.offsetWidth, W = pr.offsetWidth, x = Math.min(W - d * 1.04, -d + k * (W + d) * 1.1); im.style.transform = `translate3d(${x}px,0,0) rotate(${x / (d / 2) * 57.3}deg)`; }); }
  }

  /* contatti: aperti o chiusi, adesso */
  const st = $('[data-stato]');
  if (st) {
    const FEST = ['1/1', '6/1', '25/4', '1/5', '2/6', '15/8', '1/11', '8/12', '25/12', '26/12'];
    const fasce = d => d.getDay() === 0 || FEST.includes(`${d.getDate()}/${d.getMonth() + 1}`) ? [[18, 24]] : [[12, 14], [18, 24]];
    const scrivi = () => {
      const a = new Date(), h = a.getHours() + a.getMinutes() / 60, ff = fasce(a), ora = ff.find(([x, y]) => h >= x && h < y), poi = ff.find(([x]) => h < x);
      const dom = new Date(a); dom.setDate(a.getDate() + 1);
      st.textContent = ora ? `Forno acceso. Aperti fino alle ${ora[1]}.` : poi ? `Il forno riapre alle ${poi[0]}.` : `Il forno riapre domani alle ${fasce(dom)[0][0]}.`;
      const oggi = $('[data-oggi]'); if (oggi) oggi.classList.toggle('oggi', ff.length === 2);
      const fe = $('[data-festa]'); if (fe) fe.classList.toggle('oggi', ff.length === 1);
    };
    scrivi(); setInterval(scrivi, 60000);
  }

  requestAnimationFrame(giro);
})();
