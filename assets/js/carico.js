// Preloader: la pizza si disegna mentre la pagina carica. Vale anche tra una pagina e l'altra.
(() => {
  const el = document.querySelector('.carico'); if (!el) return;
  const fermo = matchMedia('(prefers-reduced-motion: reduce)').matches, t0 = performance.now();
  let voluto = .08, c = 0, fine = false, finito = false;
  const quanti = () => { const im = [...document.images].filter(i => !i.loading || i.loading !== 'lazy'), ok = im.filter(i => i.complete).length; return im.length ? ok / im.length : 0; };
  const giro = () => {
    if (finito) return;
    if (!fine) voluto = Math.max(voluto, .08 + quanti() * .72);
    const min = fermo ? 1 : (performance.now() - t0) / 900; // si vede sempre disegnare
    c += (Math.min(fine ? 1 : voluto, min) - c) * .1; el.style.setProperty('--c', c.toFixed(4));
    if (fine && c > .985) { finito = true; el.classList.add('via'); setTimeout(() => { el.style.display = 'none'; }, 1100); return; }
    requestAnimationFrame(giro);
  };
  requestAnimationFrame(giro);
  addEventListener('load', () => { fine = true; });
  setTimeout(() => { fine = true; }, 5000);
  addEventListener('pageshow', e => { if (e.persisted) { el.classList.add('via'); el.style.display = 'none'; finito = true; } });
  // cambio pagina: il telo sale e la pizza è già pronta a ridisegnarsi
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href]'); if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || a.target || fermo) return;
    const u = new URL(a.href, location.href); if (u.origin !== location.origin || u.pathname === location.pathname) return;
    if (!/\.html$|\/$/.test(u.pathname)) return;
    e.preventDefault(); finito = true; el.style.display = ''; el.style.setProperty('--c', 0); el.classList.remove('via'); el.classList.add('sale');
    setTimeout(() => { location.href = a.href; }, 620);
  });
})();
