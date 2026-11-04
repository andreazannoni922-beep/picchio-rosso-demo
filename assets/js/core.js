// Picchio Rosso · parti comuni: dati, carrello, testata, menu rosso, cassetto con ordine, piede
const PR = window.PR = {
  url: 'https://maklwikyknmiqgenntjx.supabase.co',
  key: 'sb_publishable_OAkqzZ8N7XEXzD_NscU10Q_NNhttagn',
  tel: '349 383 8146',
};

PR.rpc = async (fn, args = {}) => {
  const r = await fetch(`${PR.url}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { apikey: PR.key, Authorization: `Bearer ${PR.key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
  const j = await r.json().catch(() => null);
  if (!r.ok) throw new Error((j && j.message) || 'Errore di rete');
  return j;
};

PR.euro = c => (c / 100).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

// le foto vere, legate ai piatti del menù
PR.foto = { 1: 'margherita', 76: 'rossa-nero', 83: 'burrata', 63: 'radicchio', 51: 'bianca', 180: 'fritta-nutella', 170: 'fritta-nutella', 179: 'fritta-nutella', 161: 'crocche', 167: 'calzone-fritto' };
PR.fotoDi = id => PR.foto[id] ? `img/cut/${PR.foto[id]}.webp` : null;

/* ---------- menù dal database (con cache) ---------- */
PR.menu = null;
PR.caricaMenu = async (forza) => {
  if (PR.menu && !forza) return PR.menu;
  try {
    PR.menu = await PR.rpc('pr_menu');
    sessionStorage.setItem('pr-menu', JSON.stringify(PR.menu));
  } catch (e) {
    const c = sessionStorage.getItem('pr-menu');
    if (c) PR.menu = JSON.parse(c); else throw e;
  }
  PR.indice = {};
  PR.menu.categories.forEach(c => c.items.forEach(i => { PR.indice[i.id] = { ...i, cat: c.name }; }));
  return PR.menu;
};

/* ---------- realtime (supabase-js caricato a richiesta) ---------- */
PR.sb = () => {
  if (PR._sb) return Promise.resolve(PR._sb);
  return new Promise((ok, ko) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js';
    s.onload = () => { PR._sb = window.supabase.createClient(PR.url, PR.key); ok(PR._sb); };
    s.onerror = ko;
    document.head.appendChild(s);
  });
};
PR.ascolta = async (topic, evento, cb) => {
  try {
    const sb = await PR.sb();
    sb.channel(topic).on('broadcast', { event: evento }, m => cb(m.payload)).subscribe();
  } catch (e) { /* resta il polling */ }
};

/* ---------- carrello ---------- */
const CK = 'pr-carrello';
PR.carrello = JSON.parse(localStorage.getItem(CK) || '[]');
PR.modo = localStorage.getItem('pr-modo') || 'consegna';
const salva = () => { localStorage.setItem(CK, JSON.stringify(PR.carrello)); PR.aggiornaConta(); PR.disegnaCassetto(); document.dispatchEvent(new CustomEvent('pr:carrello')); };
PR.quanti = () => PR.carrello.reduce((s, r) => s + r.qty, 0);
PR.subtotale = () => PR.carrello.reduce((s, r) => s + r.unit * r.qty, 0);
PR.aggiungi = (riga, origine) => {
  const k = [riga.id, riga.size, riga.dough || '', riga.note || ''].join('|');
  const c = PR.carrello.find(r => r.k === k);
  if (c) c.qty += riga.qty || 1; else PR.carrello.push({ ...riga, k, qty: riga.qty || 1 });
  salva();
  if (origine) PR.vola(origine, riga);
  PR.toast(`${riga.name} ${riga.size && riga.size !== 'Prezzo' ? riga.size : ''} nel carrello`, 'Vedi', () => PR.apriCassetto());
};
PR.cambia = (k, d) => {
  const r = PR.carrello.find(x => x.k === k); if (!r) return;
  r.qty += d; if (r.qty <= 0) PR.carrello = PR.carrello.filter(x => x.k !== k);
  salva();
};

// una copia del piatto vola nel carrello
PR.vola = (el, riga) => {
  const dest = document.querySelector('[data-apri-carrello]');
  if (!dest || !el.getBoundingClientRect) return;
  const a = el.getBoundingClientRect(), b = dest.getBoundingClientRect();
  const img = PR.fotoDi(riga.id);
  const d = document.createElement('div');
  d.style.cssText = `position:fixed;z-index:200;left:${a.left + a.width / 2 - 28}px;top:${a.top + a.height / 2 - 28}px;width:56px;height:56px;border-radius:50%;pointer-events:none;background:${img ? `url(${img}) center/contain no-repeat` : 'var(--rosso)'};box-shadow:0 10px 30px rgba(0,0,0,.35)`;
  document.body.appendChild(d);
  const dx = b.left + b.width / 2 - (a.left + a.width / 2), dy = b.top + b.height / 2 - (a.top + a.height / 2);
  d.animate([
    { transform: 'translate(0,0) scale(1)' },
    { transform: `translate(${dx * .5}px,${dy - 120}px) scale(.9)`, offset: .45 },
    { transform: `translate(${dx}px,${dy}px) scale(.2)`, opacity: .4 },
  ], { duration: 820, easing: 'cubic-bezier(.5,0,.3,1)' }).onfinish = () => {
    d.remove();
    const c = document.querySelector('.testa .conta'); if (c) { c.classList.add('salta'); setTimeout(() => c.classList.remove('salta'), 380); }
  };
};

/* ---------- toast ---------- */
PR.toast = (testo, azione, fn) => {
  let t = document.querySelector('.toast');
  if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
  t.innerHTML = `<span>${testo}</span>${azione ? `<button>${azione}</button>` : ''}`;
  if (azione) t.querySelector('button').onclick = () => { t.classList.remove('su'); fn && fn(); };
  requestAnimationFrame(() => t.classList.add('su'));
  clearTimeout(PR._tt); PR._tt = setTimeout(() => t.classList.remove('su'), 3200);
};

const freccia = '';
PR.freccia = freccia;
PR.aggiornaConta = () => { const c = document.querySelector('.testa .conta'); if (c) c.textContent = PR.quanti(); };
document.addEventListener('click', e => { if (e.target.closest('[data-apri-carrello]')) PR.apriCassetto(); });
addEventListener('keydown', e => { if (e.key === 'Escape') PR.chiudiCassetto(); });

/* ---------- cassetto: carrello → dati → ordine ---------- */
document.body.insertAdjacentHTML('beforeend', `<div class="cassetto" aria-hidden="true"><div class="ombra" data-chiudi-cassetto></div><aside class="pannello" role="dialog" aria-label="Il tuo ordine"><header><h3>Il tuo ordine</h3><button class="x" data-chiudi-cassetto aria-label="Chiudi">✕</button></header><div class="corpo" data-lenis-prevent></div><footer></footer></aside></div>`);
const cas = document.querySelector('.cassetto');
let fase = 'carrello';
PR.apriCassetto = () => { fase = 'carrello'; PR.disegnaCassetto(); cas.classList.add('aperto'); cas.setAttribute('aria-hidden', 'false'); PR.lenis && PR.lenis.stop(); };
PR.chiudiCassetto = () => { cas.classList.remove('aperto'); cas.setAttribute('aria-hidden', 'true'); PR.lenis && PR.lenis.start(); };
cas.addEventListener('click', e => { if (e.target.closest('[data-chiudi-cassetto]')) PR.chiudiCassetto(); });

const cliente = () => JSON.parse(localStorage.getItem('pr-cliente') || '{}');
const fasceOrarie = () => {
  const out = [], d = new Date(); d.setMinutes(Math.ceil((d.getMinutes() + 35) / 15) * 15, 0, 0);
  for (let i = 0; i < 12; i++) { out.push(d.toTimeString().slice(0, 5)); d.setMinutes(d.getMinutes() + 15); }
  return out;
};
let scelte = { slot: 'Prima possibile', pag: 'Contanti' };

PR.disegnaCassetto = () => {
  if (!cas) return;
  const corpo = cas.querySelector('.corpo'), piede = cas.querySelector('footer'), h = cas.querySelector('h3');
  const n = PR.quanti(), sub = PR.subtotale(), cons = PR.modo === 'consegna' ? 200 : 0;
  if (fase === 'carrello') {
    h.textContent = 'Il tuo ordine';
    if (!n) {
      corpo.innerHTML = `<div class="vuoto"><div class="display">Ancora niente.</div>La Margherita è sempre una buona idea.</div>`;
      piede.innerHTML = `<a class="btn rosso" href="menu.html">Apri il menù ${freccia}</a>`;
      return;
    }
    corpo.innerHTML = `
      <div class="interruttore" data-v="${PR.modo}" style="margin:6px 0 10px"><i></i>
        <button data-modo="consegna" aria-pressed="${PR.modo === 'consegna'}">A casa<small>con il forno a bordo</small></button>
        <button data-modo="asporto" aria-pressed="${PR.modo === 'asporto'}">Passo io<small>Via Machiavelli 2</small></button>
      </div>
      ${PR.carrello.map(r => `<div class="riga-c">
        <div class="disco" style="${PR.fotoDi(r.id) ? `background-image:url(${PR.fotoDi(r.id)})` : ''}">${PR.fotoDi(r.id) ? '' : r.name[0]}</div>
        <div><b>${r.name}</b><small>${[r.size !== 'Prezzo' ? r.size : '', r.dough, r.note].filter(Boolean).join(' · ')}</small><small>${PR.euro(r.unit * r.qty)}</small></div>
        <div class="qta"><button data-q="${r.k}" data-d="-1" aria-label="Togli uno">−</button><span>${r.qty}</span><button data-q="${r.k}" data-d="1" aria-label="Aggiungi uno">+</button></div>
      </div>`).join('')}`;
    piede.innerHTML = `
      <div class="somma"><span>Subtotale</span><span>${PR.euro(sub)}</span></div>
      <div class="somma"><span>${PR.modo === 'consegna' ? 'Consegna in paese' : 'Ritiro al locale'}</span><span>${cons ? PR.euro(cons) : 'gratis'}</span></div>
      <div class="somma tot"><span>Totale</span><span>${PR.euro(sub + cons)}</span></div>
      <button class="btn rosso" data-avanti>Vai all'ordine · ${PR.euro(sub + cons)} ${freccia}</button>`;
  } else {
    const c = cliente();
    h.textContent = PR.modo === 'consegna' ? 'Dove la portiamo?' : 'Chi passa a prenderla?';
    corpo.innerHTML = `
      <form id="dati" novalidate>
        <div class="titoletto" style="margin-top:4px">Chi sei</div>
        <div class="campo"><label for="f-nome">Nome e cognome</label><input id="f-nome" name="name" autocomplete="name" value="${c.name || ''}" required></div>
        <div class="campo"><label for="f-tel">Telefono</label><input id="f-tel" name="phone" type="tel" autocomplete="tel" inputmode="tel" value="${c.phone || ''}" required><span class="err"></span></div>
        <div class="campo"><label for="f-mail">Email, per seguire l'ordine</label><input id="f-mail" name="email" type="email" autocomplete="email" inputmode="email" value="${c.email || ''}" required></div>
        ${PR.modo === 'consegna' ? `<div class="titoletto">Dove</div>
        <div class="campo"><label for="f-ind">Via, numero e paese</label><input id="f-ind" name="address" autocomplete="street-address" value="${c.address || ''}" placeholder="Via Statale 12, Fiorano" required></div>
        <div class="campo"><label for="f-cit">Citofono, scala, piano</label><input id="f-cit" name="bell" value="${c.bell || ''}"></div>` : ''}
        <div class="titoletto">Quando</div>
        <div class="fasce">${['Prima possibile', ...fasceOrarie()].map(s => `<button type="button" class="scelta" data-slot="${s}" aria-pressed="${scelte.slot === s}">${s}</button>`).join('')}</div>
        <div class="titoletto">Come paghi alla consegna</div>
        <div class="scelte">${['Contanti', 'Carta o bancomat', 'Satispay', 'Buoni pasto'].map(s => `<button type="button" class="scelta" data-pag="${s}" aria-pressed="${scelte.pag === s}">${s}</button>`).join('')}</div>
        <div class="campo" style="margin-top:18px"><label for="f-note">Una nota per noi</label><textarea id="f-note" name="notes" maxlength="200" placeholder="Campanello rotto, chiamate quando siete sotto…"></textarea></div>
      </form>`;
    piede.innerHTML = `
      <div class="somma tot"><span>Totale</span><span>${PR.euro(sub + cons)}</span></div>
      <button class="btn rosso" data-conferma>Conferma l'ordine ${freccia}</button>
      <button class="btn" style="height:40px" data-indietro>Torna al carrello</button>
      <small style="text-align:center;color:var(--ink-2)">Paghi quando arriva. Ti scriviamo appena lo accettiamo.</small>`;
  }
};

cas.addEventListener('click', async e => {
  const q = e.target.closest('[data-q]'); if (q) return PR.cambia(q.dataset.q, +q.dataset.d);
  const m = e.target.closest('[data-modo]'); if (m) { PR.modo = m.dataset.modo; localStorage.setItem('pr-modo', PR.modo); return PR.disegnaCassetto(); }
  if (e.target.closest('[data-avanti]')) { fase = 'dati'; PR.disegnaCassetto(); cas.querySelector('.corpo').scrollTop = 0; return; }
  if (e.target.closest('[data-indietro]')) { fase = 'carrello'; return PR.disegnaCassetto(); }
  const s = e.target.closest('[data-slot]'); if (s) { scelte.slot = s.dataset.slot; cas.querySelectorAll('[data-slot]').forEach(b => b.setAttribute('aria-pressed', b === s)); return; }
  const p = e.target.closest('[data-pag]'); if (p) { scelte.pag = p.dataset.pag; cas.querySelectorAll('[data-pag]').forEach(b => b.setAttribute('aria-pressed', b === p)); return; }
  const b = e.target.closest('[data-conferma]');
  if (b) {
    const f = cas.querySelector('#dati'), d = Object.fromEntries(new FormData(f));
    let ok = true;
    f.querySelectorAll('[required]').forEach(i => { const bad = !i.value.trim() || (i.type === 'email' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(i.value)) || (i.type === 'tel' && i.value.replace(/\D/g, '').length < 8); i.style.borderColor = bad ? 'var(--rosso)' : ''; if (bad) ok = false; });
    if (!ok) return PR.toast('Manca qualcosa: controlla i campi in rosso');
    localStorage.setItem('pr-cliente', JSON.stringify(d));
    b.disabled = true; b.innerHTML = 'Lo mandiamo in cucina…';
    try {
      const r = await PR.rpc('pr_create_order', { p: {
        name: d.name, phone: d.phone, email: d.email, mode: PR.modo,
        address: [d.address, d.bell].filter(Boolean).join(' · '), slot: scelte.slot,
        notes: [`Pagamento: ${scelte.pag}`, d.notes].filter(Boolean).join(' · '),
        items: PR.carrello.map(r => ({ id: r.id, qty: r.qty, size: r.size, dough: r.dough || '', note: r.note || '' })),
      } });
      localStorage.setItem('pr-ultimo', JSON.stringify({ id: r.id, at: Date.now(), righe: PR.carrello }));
      PR.carrello = []; salva();
      location.href = `ordine.html#${r.id}`;
    } catch (err) {
      b.disabled = false; b.innerHTML = `Conferma l'ordine ${freccia}`;
      PR.toast(err.message.includes('sospesi') ? 'Il forno è al massimo: gli ordini online sono in pausa. Chiamaci allo 0536 175 3948.' : err.message.includes('disponibile') ? err.message : 'Non siamo riusciti a inviarlo. Riprova o chiamaci.');
    }
  }
});

/* ---------- parole che salgono ---------- */
PR.parole = el => {
  el.classList.add('parole');
  const walk = n => [...n.childNodes].forEach(c => {
    if (c.nodeType === 3) {
      const f = document.createDocumentFragment();
      c.textContent.split(/(\s+)/).forEach(w => {
        if (!w.trim()) return f.appendChild(document.createTextNode(w));
        const s = document.createElement('span'); s.className = 'p'; s.innerHTML = `<span>${w}</span>`; f.appendChild(s);
      });
      c.replaceWith(f);
    } else if (c.nodeType === 1 && c.tagName !== 'BR') walk(c);
  });
  walk(el);
  return el.querySelectorAll('.p>span');
};

/* ---------- avvio ---------- */
PR.aggiornaConta();
if (window.Lenis && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  PR.lenis = new Lenis({ lerp: .09, smoothWheel: true });
  if (window.gsap && window.ScrollTrigger) {
    PR.lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => PR.lenis.raf(t * 1000)); gsap.ticker.lagSmoothing(0);
  } else { const r = t => { PR.lenis.raf(t); requestAnimationFrame(r); }; requestAnimationFrame(r); }
}
