// Crea la tua pizza: formato, base, tutta uguale o metà e metà. I prezzi veri li ricalcola il database a ogni ordine.
(async () => {
  const sez = document.getElementById('crea'); if (!sez) return;
  const IMPASTI = [['Tradizionale', 'Tradizionale 24 ore'], ['Integrale', 'Integrale 100%'], ['Cereali', 'Ai cereali']];
  const FOTO = { rossa: 'img/cut/margherita.webp', bianca: 'img/cut/bianca.webp' };
  const BASI = { rossa: ['Rossa', 'Pelati e fior di latte'], bianca: ['Bianca', 'Fior di latte'] };
  const CHI = { tonda: 'per uno', gigante: 'per due', '½ metro': 'per tre o quattro' };
  const s = { f: 0, base: 'rossa', meta: false, lato: 'a', a: new Set(), b: new Set(), imp: 'Tradizionale', qty: 1, g: 0 };
  const MAX = 8;
  let L = null, voci = new Map();
  const $ = q => sez.querySelector(q), $$ = q => [...sez.querySelectorAll(q)];
  const prima = t => t[0].toUpperCase() + t.slice(1);
  const formato = () => L.formati[s.f];
  const quota = v => { const t = L.tariffe[formato().l]; return v.premium ? t.p : t.n; };
  const prezzo = () => {
    let c = formato().c;
    const somma = set => [...set].reduce((t, id) => t + quota(voci.get(id)), 0);
    return s.meta ? c + [...s.a, ...s.b].reduce((t, id) => t + Math.floor(quota(voci.get(id)) / 2), 0) : c + somma(s.a);
  };

  function pizza() {
    const t = $('.cr-tavolo'); t.dataset.f = formato().l === '½ metro' ? 'metro' : formato().l; t.dataset.meta = s.meta; t.dataset.lato = s.lato;
    $$('.cr-tavolo img').forEach(i => { if (!i.src.endsWith(FOTO[s.base])) i.src = FOTO[s.base]; });
    const riga = (set, fin) => { const n = [...set].map(id => voci.get(id).name); return n.length ? n.map(x => `<span>${prima(x)}</span>`).join('') : `<em>${fin}</em>`; };
    const pa = $('.cr-p-a'), pb = $('.cr-p-b');
    const ha = riga(s.a, s.meta ? 'Solo base' : BASI[s.base][1]), hb = riga(s.b, 'Solo base');
    if (pa.dataset.h !== ha) { nuoveParole(pa, ha); pa.dataset.h = ha; }
    pb.hidden = !s.meta; if (s.meta && pb.dataset.h !== hb) { nuoveParole(pb, hb); pb.dataset.h = hb; }
    $('.cr-parole').dataset.meta = s.meta;
    pa.classList.toggle('su', s.meta && s.lato === 'a'); pb.classList.toggle('su', s.meta && s.lato === 'b');
  }
  function nuoveParole(el, html) {
    const vecchie = new Set([...el.querySelectorAll('span')].map(x => x.textContent));
    el.innerHTML = html;
    el.querySelectorAll('span').forEach(x => { if (!vecchie.has(x.textContent)) x.classList.add('entra'); });
  }
  function totale() {
    const el = $('.cr-tot'), c = prezzo() * s.qty, da = +(el.dataset.v || c); el.dataset.v = c;
    const t0 = performance.now();
    const passo = t => { const k = Math.min(1, (t - t0) / 260), e = 1 - (1 - k) ** 3; el.textContent = PR.euro(Math.round(da + (c - da) * e)); if (k < 1) requestAnimationFrame(passo); };
    requestAnimationFrame(passo);
    $('.cr-q').textContent = s.qty;
  }
  function chip(v) {
    const dentro = s[s.lato].has(v.id), altra = s.meta && s[s.lato === 'a' ? 'b' : 'a'].has(v.id);
    const q = s.meta ? Math.floor(quota(v) / 2) : quota(v);
    return `<button type="button" class="cr-ci${v.available ? '' : ' fin'}" data-v="${v.id}" aria-pressed="${dentro}" ${v.available ? '' : 'disabled'}><b>${prima(v.name)}</b><small>${v.available ? (altra ? 'sull\'altra metà · ' : '') + '+' + PR.euro(q) : 'finito stasera'}</small></button>`;
  }
  function ingredienti() {
    $('.cr-gruppi').innerHTML = L.gruppi.map((g, k) => `<button type="button" data-g="${k}" aria-pressed="${k === s.g}">${g.nome}</button>`).join('');
    $('.cr-chips').innerHTML = L.gruppi[s.g].voci.map(chip).join('');
  }
  function scelte() {
    $$('[data-fm]').forEach(b => b.setAttribute('aria-pressed', +b.dataset.fm === s.f));
    $$('[data-base]').forEach(b => b.setAttribute('aria-pressed', b.dataset.base === s.base));
    $$('[data-mm]').forEach(b => b.setAttribute('aria-pressed', (b.dataset.mm === '1') === s.meta));
    $$('[data-imp]').forEach(b => b.setAttribute('aria-pressed', b.dataset.imp === s.imp));
    $$('[data-lato]').forEach(b => b.setAttribute('aria-pressed', b.dataset.lato === s.lato));
    $('.cr-lati').hidden = !s.meta;
    $('.cr-qui').textContent = s.meta ? (s.lato === 'a' ? 'Cosa ci metti sulla prima metà?' : 'E sull\'altra metà?') : 'Cosa ci metti sopra?';
  }
  const tutto = () => { scelte(); ingredienti(); pizza(); totale(); };

  function descrizione() {
    const nomi = set => [...set].map(id => voci.get(id).name).join(', ');
    const b = BASI[s.base][0];
    if (s.meta) return `${b} · Metà ${nomi(s.a) || 'solo base'} · Metà ${nomi(s.b) || 'solo base'}`;
    return s.a.size ? `${b} · ${nomi(s.a)}` : b;
  }

  sez.addEventListener('click', e => {
    const t = e.target;
    const fm = t.closest('[data-fm]'); if (fm) { s.f = +fm.dataset.fm; return tutto(); }
    const ba = t.closest('[data-base]'); if (ba) { s.base = ba.dataset.base; return tutto(); }
    const mm = t.closest('[data-mm]'); if (mm) { s.meta = mm.dataset.mm === '1'; if (!s.meta) { s.b.clear(); s.lato = 'a'; } return tutto(); }
    const la = t.closest('[data-lato]'); if (la) { s.lato = la.dataset.lato; return tutto(); }
    const g = t.closest('[data-g]'); if (g) { s.g = +g.dataset.g; return ingredienti(); }
    const im = t.closest('[data-imp]'); if (im) { s.imp = im.dataset.imp; return scelte(); }
    const v = t.closest('[data-v]');
    if (v) {
      const id = +v.dataset.v, set = s[s.lato];
      if (set.has(id)) set.delete(id);
      else if (set.size >= MAX) return PR.toast(`Al massimo ${MAX} ingredienti${s.meta ? ' per metà' : ''}`);
      else set.add(id);
      return tutto();
    }
    const q = t.closest('[data-cq2]'); if (q) { s.qty = Math.max(1, Math.min(20, s.qty + +q.dataset.cq2)); return totale(); }
    if (t.closest('[data-cr-metti]')) {
      const nota = $('#cr-nota').value.trim(), d = descrizione();
      PR.aggiungi({ id: 1, name: 'La tua pizza', size: formato().l, unit: prezzo(), qty: s.qty, dough: s.imp, note: [d, nota].filter(Boolean).join(' · '), nota,
        crea: { base: s.base, a: [...s.a], ...(s.meta ? { b: [...s.b] } : {}) } }, $('.cr-tavolo'));
      s.a.clear(); s.b.clear(); s.qty = 1; s.lato = 'a'; $('#cr-nota').value = ''; tutto();
    }
  });

  try { L = await PR.rpc('pr_crea_listino'); }
  catch (e) { sez.hidden = true; return; }
  L.gruppi.forEach(g => g.voci.forEach(v => voci.set(v.id, v)));
  $('.cr-formati').innerHTML = L.formati.map((p, k) => `<button type="button" data-fm="${k}"><span class="cr-sagoma ${p.l === '½ metro' ? 'lunga' : ''}" style="--d:${p.l === 'tonda' ? 26 : 40}px"></span><b>${prima(p.l)}</b><small>${CHI[p.l] || ''}</small><em>da ${PR.euro(p.c)}</em></button>`).join('');
  $('.cr-basi').innerHTML = Object.entries(BASI).map(([k, [n, d]]) => `<button type="button" data-base="${k}"><b>${n}</b><small>${d}</small></button>`).join('');
  $('.cr-impasti').innerHTML = IMPASTI.map(([k, n]) => `<button type="button" data-imp="${k}">${n}</button>`).join('');
  sez.classList.add('pronta');
  tutto();

  // la cucina finisce un ingrediente: qui si spegne da solo
  const aggiorna = async () => {
    try {
      const n = await PR.rpc('pr_crea_listino'); L.gruppi = n.gruppi; L.tariffe = n.tariffe; L.formati = n.formati;
      voci = new Map(); L.gruppi.forEach(g => g.voci.forEach(v => voci.set(v.id, v)));
      [s.a, s.b].forEach(set => [...set].forEach(id => { const v = voci.get(id); if (!v || !v.available) { set.delete(id); PR.toast(`${v ? prima(v.name) : 'Un ingrediente'} è appena finito: l'abbiamo tolto`); } }));
      tutto();
    } catch (e) {}
  };
  PR.ascolta('picchio-menu', 'menu', aggiorna);
  setInterval(() => document.visibilityState === 'visible' && aggiorna(), 30000);

  // dalla home si arriva dritti qui
  document.addEventListener('click', e => { const a = e.target.closest('a[href="#crea"]'); if (!a) return; e.preventDefault(); e.stopPropagation(); if (a.dataset.meta) { s.meta = true; s.f = L.formati.findIndex(p => p.l === '½ metro'); tutto(); } PR.lenis ? PR.lenis.scrollTo(sez, { offset: -10 }) : sez.scrollIntoView({ behavior: 'smooth' }); }, true);
  if (location.hash === '#crea') {
    const vai = () => { const y = sez.getBoundingClientRect().top + scrollY; PR.lenis ? PR.lenis.scrollTo(y, { immediate: true, force: true }) : scrollTo(0, y); };
    addEventListener('load', () => setTimeout(vai, 60)); setTimeout(vai, 500);
  }
})();
