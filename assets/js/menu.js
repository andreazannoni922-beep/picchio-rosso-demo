// Menù con ordine: categorie → piatto → scheda (formato in scala, impasto, togli, nota) → carrello
const lista = document.querySelector('.m-lista'), catBox = document.querySelector('.m-cat-lista');
const IMPASTI = ['Tradizionale', 'Integrale', 'Cereali'];
const CON_IMPASTO = new Set(['Pizze Classiche', 'Pizze Speciali', 'Pizze Gourmet', 'Le 2.0', 'Le Sfiziose', 'Ruote di Carro', 'Pizze al Metro', 'I Lunghi', 'Strie', 'Calzoni']);
const slug = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-');
let filtro = '';

/* ---------- consegna o ritiro ---------- */
const modoEl = document.getElementById('modo');
const segnaModo = () => { modoEl.dataset.v = PR.modo; modoEl.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b.dataset.modo === PR.modo)); disegnaCarrello(); PR.disegnaCassetto(); };
modoEl.addEventListener('click', e => { const b = e.target.closest('[data-modo]'); if (!b) return; PR.modo = b.dataset.modo; localStorage.setItem('pr-modo', PR.modo); segnaModo(); });

/* ---------- lista ---------- */
function segnaPausa() {
  const f = PR.menu && PR.menu.pausa_fino; let el = document.querySelector('.m-pausa');
  if (!f) { if (el) el.remove(); return; }
  if (!el) { el = document.createElement('div'); el.className = 'm-pausa'; document.querySelector('.m-griglia').before(el); }
  const d = new Date(f), oggi = d.toDateString() === new Date().toDateString();
  el.innerHTML = `<b>Il forno è al massimo.</b><span>Gli ordini online riprendono ${oggi ? 'alle ' + d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : 'domani'}. Per telefono ci siamo: <a href="tel:+3905361753948">0536 175 3948</a>.</span>`;
}
function disegna() {
  segnaPausa();
  const q = filtro.trim().toLowerCase();
  const cats = PR.menu.categories.map(c => ({ ...c, items: c.items.filter(i => !q || (i.name + ' ' + i.descr).toLowerCase().includes(q)) })).filter(c => c.items.length);
  catBox.innerHTML = cats.map(c => `<a href="#c-${slug(c.name)}" data-cat="${slug(c.name)}">${c.name}<small>${c.items.length}</small></a>`).join('');
  if (!cats.length) { lista.innerHTML = `<p class="nessuno">Qui niente. Prova con un altro ingrediente o chiamaci: <a href="tel:+393493838146">${PR.tel}</a>.</p>`; return; }
  lista.innerHTML = cats.map((c, k) => { const cut = TAGLI[c.name]; return `<section class="m-sez" id="c-${slug(c.name)}">
    <div class="m-banda" data-t="${k % 4}"><h2 class="display m-nome">${c.name}</h2>${c.descr ? `<p>${c.descr}</p>` : ''}${cut ? `<img src="img/cut/${cut}.webp" alt="" loading="lazy">` : ''}</div>
    ${c.items.map(voce).join('')}
  </section>`; }).join('');
  spia(); entrate();
}
// righe e bande entrano una volta sola: gli aggiornamenti dalla cucina non le rifanno
const TAGLI = { 'Pizze Classiche': 'margherita', 'Pizze Speciali': 'rossa', 'Pizze Gourmet': 'burrata', 'Le 2.0': 'rossa-nero', 'Le Sfiziose': 'radicchio', 'Ruote di Carro': 'bianca', 'Fritti e Fritture': 'crocche', 'Dolci': 'fritta-nutella' };
const visti = new Set();
let oss = null, ruote = [];
function entrate() {
  if (oss) oss.disconnect();
  oss = new IntersectionObserver(es => es.forEach(e => { if (!e.isIntersecting) return; e.target.classList.add('vista'); visti.add(e.target.id || e.target.parentElement.id); oss.unobserve(e.target); }), { rootMargin: '0px 0px -6% 0px' });
  lista.querySelectorAll('.voce, .m-banda').forEach(el => { const k = el.id || el.parentElement.id; if (filtro || visti.has(k)) el.classList.add('vista'); else oss.observe(el); });
  ruote = [...lista.querySelectorAll('.v-foto, .m-banda img')];
}
if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const gira = () => { const h = innerHeight; for (const f of ruote) { const r = f.getBoundingClientRect(); if (r.bottom > 0 && r.top < h) f.style.transform = `rotate(${(r.top + r.height / 2 - h / 2) * .28}deg)`; } requestAnimationFrame(gira); };
  requestAnimationFrame(gira);
  // apertura: gli ingredienti cadono e la pizza si cuoce
  const pl = document.querySelector('.m-palco'), ti = pl.querySelector('h1'), sq = new Sequenza(document.getElementById('seq-ingr'), { telefono: { cartella: 'media/seq/ingr-t', n: 96 }, schermo: { cartella: 'media/seq/ingr-o', n: 96 } });
  PR.palco(pl, p => {
    sq.vai(Math.min(1, p / .92));
    ti.style.transform = `translate3d(0,${-p * 22}svh,0)`; ti.style.opacity = 1 - Math.min(1, Math.max(0, (p - .35) / .3));
  });
}
function voce(i) {
  const finita = !i.available || i.blocked_by.length;
  const min = Math.min(...i.prices.map(p => p.c)), piuFormati = i.prices.length > 1;
  const f = PR.fotoDi(i.id);
  return `<div class="voce${finita ? ' finita' : ''}" data-id="${i.id}" id="p${i.id}" role="button" tabindex="0" aria-label="${i.name}">
    ${f ? `<img class="v-foto" src="${f}" alt="" loading="lazy">` : '<span class="v-vuota"></span>'}
    <div><div class="v-nome">${i.name}${finita ? `<span class="tag">${!i.available ? 'Finita per stasera' : 'Manca ' + i.blocked_by[0]}</span>` : ''}</div>
      ${i.descr ? `<div class="v-desc">${i.descr}</div>` : ''}
      <div class="v-prezzo">${piuFormati ? '<small>da </small>' : ''}${PR.euro(min)}</div></div>
    <button class="piu" data-veloce="${i.id}" aria-label="Aggiungi ${i.name}">+</button>
  </div>`;
}

lista.addEventListener('click', e => {
  const v = e.target.closest('[data-veloce]');
  if (v) { // un tocco: la scelta più comune, subito nel carrello
    e.stopPropagation();
    const i = PR.indice[+v.dataset.veloce];
    PR.aggiungi({ id: i.id, name: i.name, size: i.prices[0].l, unit: i.prices[0].c, dough: CON_IMPASTO.has(i.cat) ? 'Tradizionale' : '' }, v);
    return;
  }
  const r = e.target.closest('.voce'); if (r && !r.classList.contains('finita')) apriScheda(+r.dataset.id);
});
lista.addEventListener('keydown', e => { if (e.key === 'Enter') { const r = e.target.closest('.voce'); if (r) apriScheda(+r.dataset.id); } });
document.getElementById('cerca').addEventListener('input', e => { filtro = e.target.value; disegna(); });

// la categoria attiva si accende mentre scorri
function spia() {
  const sez = [...lista.querySelectorAll('.m-sez')], link = [...catBox.querySelectorAll('a')];
  const io = new IntersectionObserver(es => es.forEach(en => {
    if (!en.isIntersecting) return;
    link.forEach(a => a.classList.toggle('su', a.dataset.cat === en.target.id.slice(2)));
    const a = catBox.querySelector('a.su'); if (a && innerWidth < 760) catBox.scrollTo({ left: a.offsetLeft - 16, behavior: 'smooth' });
  }), { rootMargin: '-30% 0px -60% 0px' });
  sez.forEach(s => io.observe(s));
}
catBox.addEventListener('click', e => {
  const a = e.target.closest('a'); if (!a) return; e.preventDefault();
  const el = document.querySelector(a.getAttribute('href'));
  PR.lenis ? PR.lenis.scrollTo(el, { offset: innerWidth < 760 ? -190 : -20 }) : el.scrollIntoView({ behavior: 'smooth' });
});

/* ---------- scheda ---------- */
const scheda = document.querySelector('.scheda'), sp = scheda.querySelector('.scheda-p');
sp.setAttribute('data-lenis-prevent', '');
let sel = null;
const SCALA = { tonda: [26, 'per 1'], gigante: [46, 'per 2'], '½ metro': [0, 'per 3–4'], normale: [30, 'per 1'] };
function apriScheda(id) {
  const i = PR.indice[id]; if (!i) return;
  const ingr = (i.descr || '').split(',').map(s => s.trim()).filter(s => s && !/^[¼⅓½]/.test(s) && s.length < 32);
  sel = { i, f: 0, imp: CON_IMPASTO.has(i.cat) ? 'Tradizionale' : '', via: new Set(), qty: 1, nota: '' };
  const f = PR.fotoDi(i.id) && PR.fotoDi(i.id);
  const multi = i.prices.length > 1;
  sp.innerHTML = `
    <div class="s-testa">
      <button class="x" data-chiudi-scheda aria-label="Chiudi">✕</button>
      ${f ? `<img class="s-disco" src="${f}" alt="${i.name} vista dall'alto">` : `<div class="s-iniziale">${i.name.replace(/^[^A-Za-zÀ-ú]+/, '')[0]}</div>`}
      <h2 class="display">${i.name}</h2>${i.descr ? `<p>${i.descr}</p>` : ''}
    </div>
    <div class="s-corpo">
      ${multi ? `<div class="titoletto">Quanto la vuoi grande?</div>
      <div class="formati" style="--n:${i.prices.length}">${i.prices.map((p, k) => {
        const [d, chi] = SCALA[p.l] || [30, ''];
        return `<button class="formato" data-f="${k}" aria-pressed="${k === 0}"><span class="forma">${d ? `<i style="width:${d}px;height:${d}px"></i>` : '<i class="metro" style="width:64px;height:22px"></i>'}</span><b>${p.l[0].toUpperCase() + p.l.slice(1)}</b><small>${PR.euro(p.c)}${chi ? ' · ' + chi : ''}</small></button>`;
      }).join('')}</div>` : ''}
      ${sel.imp ? `<div class="titoletto">Che impasto?</div><div class="scelte">${IMPASTI.map(m => `<button class="scelta" data-imp="${m}" aria-pressed="${m === sel.imp}">${m === 'Tradizionale' ? 'Tradizionale 24 ore' : m === 'Integrale' ? 'Integrale 100%' : 'Ai cereali'}</button>`).join('')}</div>` : ''}
      ${ingr.length > 1 ? `<div class="titoletto">Qualcosa da togliere?</div><div class="scelte togli">${ingr.map(g => `<button class="scelta" data-via="${g}" aria-pressed="true">${g}</button>`).join('')}</div>` : ''}
      <div class="titoletto">Una nota per la cucina</div>
      <div class="campo"><input id="s-nota" maxlength="80" placeholder="Ben cotta, tagliata a spicchi…"></div>
      ${abbinamenti(i)}
    </div>
    <div class="s-piede">
      <div class="qta"><button data-sq="-1" aria-label="Meno">−</button><span class="s-q">1</span><button data-sq="1" aria-label="Più">+</button></div>
      <button class="btn rosso" data-metti>Aggiungi · <span class="s-tot"></span></button>
    </div>`;
  totale();
  scheda.classList.add('aperta'); scheda.setAttribute('aria-hidden', 'false'); sp.scrollTop = 0;
  PR.lenis && PR.lenis.stop();
  history.replaceState(null, '', '#p' + id);
}
function abbinamenti(i) {
  if (!CON_IMPASTO.has(i.cat)) return '';
  const l = [161, 167, 179].map(id => PR.indice[id]).filter(x => x && x.available && !x.blocked_by.length);
  if (!l.length) return '';
  return `<div class="titoletto">Ci sta bene anche</div><div class="abbina">${l.map(x => `<button type="button" data-abb="${x.id}"><img src="${PR.fotoDi(x.id)}" alt="" loading="lazy"><b>${x.name}</b><small>${PR.euro(x.prices[0].c)}</small></button>`).join('')}</div>`;
}
function chiudiScheda() { scheda.classList.remove('aperta'); scheda.setAttribute('aria-hidden', 'true'); PR.lenis && PR.lenis.start(); history.replaceState(null, '', location.pathname); }
function totale() {
  const c = sel.i.prices[sel.f].c * sel.qty;
  const el = sp.querySelector('.s-tot'), da = +(el.dataset.v || c);
  el.dataset.v = c;
  const t0 = performance.now();
  const passo = t => { const k = Math.min(1, (t - t0) / 220); el.textContent = PR.euro(Math.round(da + (c - da) * k)); if (k < 1) requestAnimationFrame(passo); };
  requestAnimationFrame(passo);
  sp.querySelector('.s-q').textContent = sel.qty;
}
scheda.addEventListener('click', e => {
  if (e.target.closest('[data-chiudi-scheda]')) return chiudiScheda();
  const f = e.target.closest('[data-f]'); if (f) { sel.f = +f.dataset.f; sp.querySelectorAll('[data-f]').forEach(b => b.setAttribute('aria-pressed', b === f)); return totale(); }
  const m = e.target.closest('[data-imp]'); if (m) { sel.imp = m.dataset.imp; sp.querySelectorAll('[data-imp]').forEach(b => b.setAttribute('aria-pressed', b === m)); return; }
  const v = e.target.closest('[data-via]'); if (v) { const g = v.dataset.via; sel.via.has(g) ? sel.via.delete(g) : sel.via.add(g); v.setAttribute('aria-pressed', !sel.via.has(g)); return; }
  const q = e.target.closest('[data-sq]'); if (q) { sel.qty = Math.max(1, Math.min(20, sel.qty + +q.dataset.sq)); return totale(); }
  const ab = e.target.closest('[data-abb]');
  if (ab) { const x = PR.indice[+ab.dataset.abb]; PR.aggiungi({ id: x.id, name: x.name, size: x.prices[0].l, unit: x.prices[0].c, dough: '' }, ab.querySelector('img')); ab.classList.add('messo'); ab.querySelector('small').textContent = 'Aggiunto'; return; }
  const b = e.target.closest('[data-metti]');
  if (b) {
    const p = sel.i.prices[sel.f];
    const nota = [[...sel.via].map(g => 'senza ' + g.toLowerCase()).join(', '), sp.querySelector('#s-nota').value.trim()].filter(Boolean).join(' · ');
    PR.aggiungi({ id: sel.i.id, name: sel.i.name, size: p.l, unit: p.c, qty: sel.qty, dough: sel.imp, note: nota }, sp.querySelector('.s-disco, .s-iniziale'));
    chiudiScheda();
  }
});
addEventListener('keydown', e => { if (e.key === 'Escape' && scheda.classList.contains('aperta')) chiudiScheda(); });

/* ---------- carrello sempre aperto (desktop) + barra (mobile) ---------- */
const colonna = document.querySelector('.m-carrello'), barra = document.querySelector('.barra-ordine');
function disegnaCarrello() {
  const n = PR.quanti(), sub = PR.subtotale(), cons = PR.modo === 'consegna' ? 200 : 0;
  barra.hidden = !n;
  barra.querySelector('.b-n').textContent = `${n} ${n === 1 ? 'piatto' : 'piatti'}`;
  barra.querySelector('.b-t').textContent = PR.euro(sub + cons);
  if (!n) { colonna.innerHTML = `<h3>Il tuo ordine</h3><p style="color:var(--ink-2)">Ancora niente qui. La Margherita è sempre una buona idea.</p>`; return; }
  colonna.innerHTML = `<h3>Il tuo ordine</h3>
    ${PR.carrello.map(r => `<div class="riga-c"><div class="disco" style="${PR.fotoDi(r.id) ? `background-image:url(${PR.fotoDi(r.id)})` : ''}">${PR.fotoDi(r.id) ? '' : r.name[0]}</div>
      <div><b>${r.name}</b><small>${[r.size !== 'Prezzo' ? r.size : '', r.dough, r.note].filter(Boolean).join(' · ')}</small><small>${PR.euro(r.unit * r.qty)}</small></div>
      <div class="qta"><button data-cq="${r.k}" data-d="-1" aria-label="Togli uno">−</button><span>${r.qty}</span><button data-cq="${r.k}" data-d="1" aria-label="Aggiungi uno">+</button></div></div>`).join('')}
    <div class="somma"><span>Subtotale</span><span>${PR.euro(sub)}</span></div>
    <div class="somma"><span>${cons ? 'Consegna in paese' : 'Ritiro'}</span><span>${cons ? PR.euro(cons) : 'gratis'}</span></div>
    <div class="somma tot"><span>Totale</span><span>${PR.euro(sub + cons)}</span></div>
    <button class="btn rosso" data-apri-carrello>Vai all'ordine ${PR.freccia}</button>`;
}
colonna.addEventListener('click', e => { const q = e.target.closest('[data-cq]'); if (q) PR.cambia(q.dataset.cq, +q.dataset.d); });
document.addEventListener('pr:carrello', disegnaCarrello);

/* ---------- avvio + aggiornamenti dalla cucina ---------- */
async function carica(forza) {
  try { await PR.caricaMenu(forza); disegna(); }
  catch (e) { lista.innerHTML = `<p class="nessuno">Il menù non si è caricato. Ricarica la pagina o chiamaci: ${PR.tel}.</p>`; }
}
carica().then(() => {
  segnaModo();
  const h = location.hash.match(/^#p(\d+)/); if (h) setTimeout(() => { document.getElementById('p' + h[1])?.scrollIntoView({ block: 'center' }); apriScheda(+h[1]); }, 200);
});
// quando la cucina cambia un prezzo o finisce un ingrediente, il menù si aggiorna da solo
PR.ascolta('picchio-menu', 'menu', () => carica(true).then(() => PR.toast('Il menù è appena stato aggiornato dalla cucina')));
setInterval(() => document.visibilityState === 'visible' && carica(true), 30000);
