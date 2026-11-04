// App cucina Picchio Rosso · strumento di lavoro: leggere senza toccare, posizione = stato, colore = guaio, un tocco e si annulla
const DB = 'https://maklwikyknmiqgenntjx.supabase.co', KEY = 'sb_publishable_OAkqzZ8N7XEXzD_NscU10Q_NNhttagn';
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const euro = c => (c / 100).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
const ora = d => new Date(d).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const rpc = async (fn, a = {}) => {
  const r = await fetch(`${DB}/rest/v1/rpc/${fn}`, { method: 'POST', headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify(a) });
  const j = await r.json().catch(() => null);
  if (!r.ok) { const e = new Error((j && j.message) || 'rete'); e.srv = true; throw e; }
  return j;
};
const pref = Object.assign({ suono: true, sveglio: true, tema: 'auto', testo: 'normale' }, JSON.parse(localStorage.getItem('pr-cucina-pref') || '{}'));
const salvaP = () => localStorage.setItem('pr-cucina-pref', JSON.stringify(pref));
let PIN = localStorage.getItem('pr-cucina-pin') || '';
let ordini = [], menu = null, visti = new Set(JSON.parse(localStorage.getItem('pr-cucina-visti') || '[]')), primo = true;
const attesa = new Map();   // azioni in attesa: id → {status, eta, reason, timer}
const errori = new Map();
let bloccoInput = 0;

/* ---------- tema ---------- */
function tema() { const h = new Date().getHours(); const t = pref.tema === 'auto' ? (h >= 17 || h < 6 ? 'sera' : 'giorno') : pref.tema; document.body.dataset.tema = t; document.documentElement.style.setProperty('--scale', pref.testo === 'grande' ? 1.15 : 1); }
tema();

/* ---------- suono ---------- */
let audio;
const ctx = () => { audio = audio || new (window.AudioContext || window.webkitAudioContext)(); if (audio.state === 'suspended') audio.resume(); return audio; };
function campanello() {
  if (!pref.suono) return;
  try {
    const a = ctx(), t = a.currentTime;
    [0, .22].forEach(d => [1760, 2637].forEach((f, k) => {
      const o = a.createOscillator(), g = a.createGain(); o.type = 'sine'; o.frequency.value = f;
      const v = k ? .22 : .5; g.gain.setValueAtTime(0, t + d); g.gain.linearRampToValueAtTime(v, t + d + .002); g.gain.exponentialRampToValueAtTime(.0008, t + d + .6);
      o.connect(g).connect(a.destination); o.start(t + d); o.stop(t + d + .65);
    }));
  } catch (e) {}
  navigator.vibrate && navigator.userActivation?.hasBeenActive && navigator.vibrate([120, 60, 120]);
}
function suonoRete() { if (!pref.suono) return; try { const a = ctx(), t = a.currentTime; [[660, 0], [440, .3]].forEach(([f, d]) => { const o = a.createOscillator(), g = a.createGain(); o.frequency.value = f; g.gain.setValueAtTime(.3, t + d); g.gain.exponentialRampToValueAtTime(.001, t + d + .3); o.connect(g).connect(a.destination); o.start(t + d); o.stop(t + d + .3); }); } catch (e) {} }
function notifica(o) { if (!('Notification' in window) || Notification.permission !== 'granted') return; try { new Notification(`Nuovo ordine ${o.code}`, { body: o.items.map(r => `${r.qty} ${r.name}`).join(', '), tag: o.id, icon: 'icona-192.png', requireInteraction: true }); } catch (e) {} }

/* ---------- avviso con annulla ---------- */
const avv = $('#avv'); let avvT;
function avviso(testo, annulla, durata = 5000) {
  $('span', avv).textContent = testo; const b = $('button', avv), u = $('u', avv);
  b.hidden = !annulla; b.onclick = () => { annulla && annulla(); avv.classList.remove('su'); };
  u.hidden = !annulla; u.getAnimations().forEach(x => x.cancel());
  if (annulla) u.animate([{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }], { duration: durata, easing: 'linear', fill: 'forwards' });
  avv.classList.add('su'); clearTimeout(avvT); avvT = setTimeout(() => avv.classList.remove('su'), durata);
}

/* ---------- PIN ---------- */
let cifre = '';
const disPin = () => $$('.caselle i').forEach((c, i) => c.classList.toggle('p', i < cifre.length));
async function provaPin(p) {
  try {
    if (!await rpc('pr_staff_check', { p_pin: p })) throw new Error('errato');
    PIN = p; localStorage.setItem('pr-cucina-pin', p); $('.pin-msg').textContent = ''; entra();
  } catch (e) {
    const c = $('.caselle'); c.classList.remove('no'); void c.offsetWidth; c.classList.add('no');
    $('.pin-msg').textContent = /tentativi/.test(e.message) ? 'Troppi tentativi. Riprova tra qualche minuto.' : 'PIN errato. Riprova.';
    setTimeout(() => { cifre = ''; disPin(); c.classList.remove('no'); }, 400);
  }
}
const digita = d => { if (d === 'c') cifre = cifre.slice(0, -1); else if (cifre.length < 6) cifre += d; disPin(); if (cifre.length === 6) provaPin(cifre); };
$('#tast-pin').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; try { ctx(); } catch (er) {} digita(b.dataset.k || b.textContent); });
addEventListener('keydown', e => { if ($('#pin').hidden || e.repeat) return; if (/^\d$/.test(e.key)) digita(e.key); if (e.key === 'Backspace') digita('c'); });

/* ---------- avvio ---------- */
let entrato = false, wake;
async function entra() {
  $('#pin').hidden = true; $('#app').hidden = false;
  if (entrato) { caricaO(); caricaM(); return; }
  entrato = true;
  orologio(); setInterval(orologio, 1000);
  await Promise.all([caricaO(), caricaM()]);
  setInterval(caricaO, 5000);
  setInterval(() => document.visibilityState === 'visible' && caricaM(), 30000);
  setInterval(tempoCampanello, 1000);
  try { const sb = window.supabase.createClient(DB, KEY); sb.channel('picchio-cucina').on('broadcast', { event: 'nuovo_ordine' }, () => caricaO()).subscribe(); } catch (e) {}
  sveglia(); disImp(); controllaAudio();
}
function controllaAudio() {
  const f = $('#f-audio'), blocc = pref.suono && !(navigator.userActivation && navigator.userActivation.hasBeenActive) && !(audio && audio.state === 'running');
  f.hidden = !blocc; if (!blocc) return;
  addEventListener('pointerdown', () => { try { ctx(); } catch (e) {} f.hidden = true; }, { once: true, capture: true });
}
async function sveglia() { if (!pref.sveglio || !('wakeLock' in navigator)) return; try { wake = await navigator.wakeLock.request('screen'); } catch (e) {} }
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { sveglia(); caricaO(); } });
function orologio() { $('#ora').textContent = new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }); if (new Date().getSeconds() === 0) { tema(); disBanco(true); } aggiornaRete(); }
function esci(msg) { PIN = ''; cifre = ''; disPin(); localStorage.removeItem('pr-cucina-pin'); $('#app').hidden = true; $('#pin').hidden = false; $('.pin-msg').textContent = msg || ''; }
let ultimoCamp = 0;
function tempoCampanello() { const n = visibili().filter(o => o.status === 'ricevuto'); if (!n.length) return; const vec = Math.max(...n.map(o => Date.now() - new Date(o.created_at))); if (Date.now() - ultimoCamp >= (vec > 120000 ? 4000 : 8000)) { ultimoCamp = Date.now(); campanello(); } }

/* ---------- rete ---------- */
let okRete = Date.now(), ultimoSuonoRete = 0;
function aggiornaRete() {
  const fuori = (Date.now() - okRete) / 1000, f = $('#fascia');
  $('#rete').textContent = fuori > 15 ? 'offline' : 'online';
  if (fuori < 15) { if (!f.hidden) { f.hidden = true; avviso('Rete tornata.'); } return; }
  const m = Math.floor(fuori / 60), s = String(Math.floor(fuori % 60)).padStart(2, '0');
  f.hidden = false; f.classList.toggle('d', fuori > 120);
  f.innerHTML = `<span>Senza rete da ${m}:${s}. I nuovi ordini non arrivano.${fuori > 120 ? ' Controlla il Wi-Fi o rispondi al telefono.' : ''}</span><button data-riprova>Riprova</button>`;
  if (fuori > 120 && Date.now() - ultimoSuonoRete > 30000) { ultimoSuonoRete = Date.now(); suonoRete(); }
}
document.addEventListener('click', e => { if (e.target.closest('[data-riprova]')) caricaO(); });

/* ---------- ordini ---------- */
async function caricaO() {
  if (!PIN) return;
  try {
    const n = await rpc('pr_staff_orders', { p_pin: PIN });
    okRete = Date.now();
    const arr = n.filter(o => !visti.has(o.id));
    arr.forEach(o => visti.add(o.id));
    localStorage.setItem('pr-cucina-visti', JSON.stringify([...visti].slice(-300)));
    ordini = n;
    disBanco(false, primo ? [] : arr.map(o => o.id));
    if (!primo && arr.length) { ultimoCamp = Date.now(); campanello(); arr.forEach(notifica); }
    primo = false;
  } catch (e) { if (/PIN errato/.test(e.message)) return esci('Il PIN è cambiato. Inseriscilo di nuovo.'); if (!e.srv) aggiornaRete(); }
}
// lo stato mostrato tiene conto delle azioni in attesa (annulla 5 secondi)
const vista = o => { const a = attesa.get(o.id); if (!a) return o; const v = { ...o, status: a.status }; if (a.eta) { v.eta_minutes = a.eta; v.accepted_at = o.accepted_at || a.at; } if (a.status === 'in_consegna' || a.status === 'pronto') v.departed_at = o.departed_at || a.at; if (a.reason) v.reject_reason = a.reason; return v; };
const visibili = () => ordini.map(vista);
const promesso = o => o.accepted_at && o.eta_minutes ? new Date(o.accepted_at).getTime() + o.eta_minutes * 60000 : null;
const minDa = t => Math.floor((Date.now() - t) / 60000);

function urgenza(o, col) {
  const casa = o.mode === 'consegna';
  if (col === 'nuovi') { const m = minDa(new Date(o.created_at)); return m >= 4 ? 'rosso' : m >= 2 ? 'ambra' : ''; }
  if (col === 'fuori') return '';
  const p = promesso(o); if (!p) return '';
  const r = (p - Date.now()) / 60000;
  if (r < 0) return 'rosso';
  if (col === 'dafare') return r <= (casa ? 15 : 8) ? 'ambra' : '';
  return r <= 5 ? 'ambra' : '';
}
function tempoTxt(o, col) {
  if (col === 'nuovi') return Math.max(0, minDa(new Date(o.created_at))) + '′';
  const p = promesso(o); if (!p) return '';
  const r = Math.ceil((p - Date.now()) / 60000);
  return r < 0 ? '+' + (-r) + '′' : r + '′';
}
const tipo = o => o.mode === 'consegna' ? '<span><i class="ph-fill ph-moped"></i>Consegna</span>' : '<span><i class="ph-bold ph-bag"></i>Ritiro</span>';
const allerg = /allerg|celiac|intoller/i;
function noteOrd(o) { return (o.notes || '').split(' · ').filter(n => n && !n.startsWith('Pagamento:')).join(' · '); }
function vociHTML(o, max = 4) {
  const v = o.items.slice(0, max).map(r => {
    const det = [r.size && r.size !== 'Prezzo' ? r.size : '', r.dough && r.dough !== 'Tradizionale' ? r.dough : ''].filter(Boolean).join(' · ');
    return `<div class="voce${r.name.length > 22 ? ' lungo' : ''}"><b>${r.qty}</b><span>${esc(r.name)}</span>${det ? `<small>${esc(det)}</small>` : ''}${r.note ? `<small class="n">${esc(r.note)}</small>` : ''}</div>`;
  }).join('');
  const piu = o.items.length - max;
  return v + (piu > 0 ? `<p class="altre">+ altre ${piu} voci</p>` : '');
}
// se il cliente ha chiesto un orario, il primo tasto è quell'orario
function minutiSlot(o) { const m = /^(\d{2}):(\d{2})$/.exec(o.slot || ''); if (!m) return null; const d = new Date(); d.setHours(+m[1], +m[2], 0, 0); if (d < Date.now() - 3600000) d.setDate(d.getDate() + 1); return Math.max(1, Math.round((d - Date.now()) / 60000)); }
function tempiHTML(o, pr) { const ms = minutiSlot(o); return `${ms ? `<button class="alle" data-acc="${o.id}" data-m="${ms}">Alle ${esc(o.slot)}</button>` : ''}<div class="tempi">${[20, 30, 40, 60].map(m => `<button data-acc="${o.id}" data-m="${m}" class="${m === pr && !ms ? 'prop' : ''}">${m}</button>`).join('')}</div>`; }
function propTempo() { const aperti = visibili().filter(o => ['accettato', 'in_preparazione'].includes(o.status)).length; return aperti <= 2 ? 20 : aperti <= 5 ? 30 : aperti <= 9 ? 40 : 60; }
function biglietto(o, col, arriva) {
  const u = urgenza(o, col), n = noteOrd(o), a = attesa.get(o.id), er = errori.get(o.id);
  const nota = n ? `<div class="nota">${allerg.test(n) ? '<i class="ph-fill ph-warning"></i>' : ''}<span>${esc(n)}</span></div>` : '';
  const p = promesso(o);
  if (col === 'nuovi') {
    const pr = propTempo(), casa = o.mode === 'consegna';
    return `<article class="big nuovo ${u}${arriva ? ' arriva' : ''}" data-id="${o.id}">
      <div class="testa" data-ap="${o.id}"><div class="r1"><span>${esc(o.code)}</span><span class="tempo">${tempoTxt(o, col)}</span></div><div class="r2">${tipo(o)}<span>${o.slot && o.slot !== 'Prima possibile' ? 'Per le ' + esc(o.slot) : 'Prima possibile'}</span></div></div>
      <div class="voci" data-ap="${o.id}">${vociHTML(o)}</div>${nota}
      <p class="etic">Accetta · ${casa ? 'arriva' : 'pronta'} tra minuti</p>
      ${tempiHTML(o, pr)}
      <button class="rif" data-rif="${o.id}">Rifiuta</button>
    </article>`;
  }
  if (col === 'fuori') {
    const da = o.departed_at ? Math.max(0, minDa(new Date(o.departed_at))) : 0, casa = o.mode === 'consegna', tardi = p && Date.now() - p > 600000;
    return `<article class="big fuori" data-id="${o.id}"><div class="testa" data-ap="${o.id}"><div class="r1"><span>${esc(o.code)}</span></div><div class="r2">${casa ? '<span><i class="ph-fill ph-moped"></i>' : '<span><i class="ph-bold ph-bag"></i>'}<span ${tardi ? 'style="color:var(--dtxt)"' : ''}>da ${da}′</span></span></div></div>
      <div class="az"><button class="t" data-st="consegnato" data-o="${o.id}">${casa ? 'Consegnata' : 'Ritirata'}</button></div></article>`;
  }
  const az = col === 'dafare' ? ['in_preparazione', 'Inforna'] : o.mode === 'consegna' ? ['in_consegna', 'Parte il fattorino'] : ['pronto', 'È pronta'];
  return `<article class="big ${u}" data-id="${o.id}">
    <div class="testa" data-ap="${o.id}"><div class="r1"><span>${esc(o.code)}</span><span class="tempo">${tempoTxt(o, col)}</span></div><div class="r2">${tipo(o)}<span>${p ? ora(p) : ''}</span></div></div>
    <div class="voci" data-ap="${o.id}">${vociHTML(o)}</div>${nota}
    ${er ? `<p class="err">Non salvato. Riprova.</p>` : ''}
    <div class="az"><button class="t" data-st="${az[0]}" data-o="${o.id}">${az[1]}</button></div></article>`;
}
function disBanco(solTempi, nuoviId = []) {
  const oggi = new Date().toDateString(), vis = visibili();
  const per = { nuovi: [], dafare: [], forno: [], fuori: [] }; const chiusi = [];
  vis.forEach(o => { ({ ricevuto: per.nuovi, accettato: per.dafare, in_preparazione: per.forno, in_consegna: per.fuori, pronto: per.fuori }[o.status] || (new Date(o.created_at).toDateString() === oggi ? chiusi : [])).push(o); });
  per.nuovi.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  const pp = (a, b) => (promesso(a) || 0) - (promesso(b) || 0); per.dafare.sort(pp); per.forno.sort(pp);
  per.fuori.sort((a, b) => new Date(a.departed_at || 0) - new Date(b.departed_at || 0));
  const banco = $('#banco');
  // FLIP: ricordo dove stavano i biglietti
  const prima = new Map($$('.big', banco).map(b => [b.dataset.id, b.getBoundingClientRect()]));
  const conti = {}; [...per.dafare, ...per.forno].forEach(o => o.items.forEach(r => { conti[r.name] = (conti[r.name] || 0) + r.qty; }));
  const righeC = Object.entries(conti).sort((a, b) => b[1] - a[1]);
  const pane = {
    nuovi: per.nuovi.map(o => biglietto(o, 'nuovi', nuoviId.includes(o.id))).join('') + (righeC.length ? `<div class="conti"><h3>Da fare stasera</h3>${righeC.map(([n, q]) => `<p><b>${q}</b><span>${esc(n)}</span></p>`).join('')}</div>` : (per.nuovi.length ? '' : `<div class="vuoto">Nessun ordine. Il campanello suona appena ne arriva uno.<div style="margin-top:12px"><div class="due"><button class="t h56" data-prova>Prova il campanello</button><button class="t h56" data-demo>Ordine di prova</button></div></div></div>`)),
    dafare: per.dafare.map(o => biglietto(o, 'dafare')).join(''),
    forno: per.forno.map(o => biglietto(o, 'forno')).join(''),
    fuori: per.fuori.map(o => biglietto(o, 'fuori')).join('') + (chiusi.length ? `<button class="chiusi" data-chiusi><b>Chiusi oggi · ${chiusi.length}</b>${euro(chiusi.filter(o => o.status === 'consegnato').reduce((s, o) => s + o.total_cents, 0))}</button>` : ''),
  };
  if (!$('.col', banco)) banco.innerHTML = [['nuovi', 'Nuovi'], ['dafare', 'Da fare'], ['forno', 'In forno'], ['fuori', 'Fuori']].map(([k, t]) => `<div class="col" data-c="${k}"><h2>${t} <b></b></h2><div class="pila"></div></div>`).join('');
  Object.keys(pane).forEach(k => { const c = $(`[data-c=${k}]`, banco), pl = $('.pila', c); const sc = pl.scrollTop; if (pl.dataset.h !== pane[k]) { pl.innerHTML = pane[k]; pl.dataset.h = pane[k]; pl.scrollTop = sc; } $('h2 b', c).textContent = per[k].length; });
  // FLIP: i biglietti scivolano al posto nuovo
  $$('.big', banco).forEach(b => { const r0 = prima.get(b.dataset.id); if (!r0 || matchMedia('(prefers-reduced-motion:reduce)').matches) return; const r1 = b.getBoundingClientRect(); const dx = r0.left - r1.left, dy = r0.top - r1.top; if (dx || dy) b.animate([{ transform: `translate(${dx}px,${dy}px)` }, { transform: 'none' }], { duration: 240, easing: 'cubic-bezier(.2,0,0,1)' }); });
  const n = per.nuovi.length, nb = $('.nav button[data-v=ordini]'), em = $('em', nb);
  em.hidden = !n; em.textContent = n; nb.classList.toggle('att', !!n);
  document.title = n ? `(${n}) Ordini · Cucina` : 'Cucina · Picchio Rosso';
  const fb = $$('#fasi button b'); fb[0].textContent = n; fb[1].textContent = per.dafare.length + per.forno.length; fb[2].textContent = per.fuori.length;
  window.__chiusi = chiusi;
  disAllarme(per.nuovi);
}

/* ---------- azioni: lo schermo cambia subito, la richiesta parte dopo 5 secondi ---------- */
const FRASI = { accettato: (o, a) => `${o.code} accettato. ${a.eta}′.`, in_preparazione: o => `${o.code} nel forno.`, in_consegna: o => `${o.code} partito.`, pronto: o => `${o.code} pronta.`, consegnato: o => `${o.code} ${o.mode === 'consegna' ? 'consegnata' : 'ritirata'}.`, rifiutato: o => `${o.code} rifiutato.` };
async function invia(id) {
  const a = attesa.get(id); if (!a) return; clearTimeout(a.timer);
  try {
    const o = await rpc('pr_staff_set_status', { p_pin: PIN, p_id: id, p_status: a.status, p_eta: a.eta || null, p_reason: a.reason || null });
    attesa.delete(id); errori.delete(id);
    const i = ordini.findIndex(x => x.id === id); if (i > -1) ordini[i] = o;
    disBanco(); setTimeout(caricaO, 1500);
  } catch (e) { attesa.delete(id); errori.set(id, 1); disBanco(); avviso('Non salvato. Riprova.'); }
}
function azione(id, status, extra = {}) {
  attesa.forEach((_, k) => { if (k !== id) invia(k); });
  const o = ordini.find(x => x.id === id); if (!o) return;
  const a = { status, ...extra, at: new Date().toISOString() };
  a.timer = setTimeout(() => invia(id), 5000);
  attesa.set(id, a); disBanco();
  bloccoInput = Date.now() + 350;
  avviso(extra.frase || FRASI[status](o, a), () => { clearTimeout(a.timer); attesa.delete(id); disBanco(); });
}
addEventListener('pagehide', () => attesa.forEach((a, id) => fetch(`${DB}/rest/v1/rpc/pr_staff_set_status`, { method: 'POST', keepalive: true, headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ p_pin: PIN, p_id: id, p_status: a.status, p_eta: a.eta || null, p_reason: a.reason || null }) })));

$('#banco').addEventListener('click', e => {
  if (Date.now() < bloccoInput) return;
  const t = e.target;
  const acc = t.closest('[data-acc]'); if (acc) { ultimoCamp = Date.now(); return azione(acc.dataset.acc, 'accettato', { eta: +acc.dataset.m }); }
  const st = t.closest('[data-st]'); if (st) return azione(st.dataset.o, st.dataset.st);
  const rf = t.closest('[data-rif]'); if (rf) return apriRifiuto(rf.dataset.rif);
  if (t.closest('[data-prova]')) return campanello();
  if (t.closest('[data-demo]')) return ordineProva();
  if (t.closest('[data-chiusi]')) return apriChiusi();
  const ap = t.closest('[data-ap]'); if (ap) apriDettaglio(ap.dataset.ap);
});
$('#fasi').addEventListener('click', e => { const b = e.target.closest('[data-f]'); if (!b) return; $('#banco').dataset.fase = b.dataset.f; $$('#fasi button').forEach(x => x.setAttribute('aria-pressed', x === b)); });

/* ---------- pannelli ---------- */
const pann = $('#pann'), velo = $('#velo');
const apri = (html, basso) => { pann.className = 'pann' + (basso ? ' basso' : ''); pann.innerHTML = html; pann.hidden = false; velo.hidden = false; pann.scrollTop = 0; };
const chiudi = () => { pann.hidden = true; velo.hidden = true; };
velo.addEventListener('click', chiudi);
addEventListener('keydown', e => { if (e.key === 'Escape') chiudi(); });
function apriDettaglio(id) {
  const o = visibili().find(x => x.id === id); if (!o) return;
  const casa = o.mode === 'consegna', p = promesso(o), col = { ricevuto: 'nuovi', accettato: 'dafare', in_preparazione: 'forno', in_consegna: 'fuori', pronto: 'fuori' }[o.status];
  const parole = { ricevuto: 'Da accettare', accettato: `Da infornare · ${casa ? 'arriva' : 'pronta'} alle ${p ? ora(p) : ''}`, in_preparazione: `Nel forno · ${casa ? 'arriva' : 'pronta'} alle ${p ? ora(p) : ''}`, in_consegna: `Fuori · partita alle ${o.departed_at ? ora(o.departed_at) : ''}`, pronto: 'Pronta al banco', consegnato: 'Chiuso', rifiutato: 'Rifiutato' }[o.status];
  const az = { accettato: ['in_preparazione', 'Inforna'], in_preparazione: casa ? ['in_consegna', 'Parte il fattorino'] : ['pronto', 'È pronta'], in_consegna: ['consegnato', 'Consegnata'], pronto: ['consegnato', 'Ritirata'] }[o.status];
  const pag = (o.notes || '').split(' · ').find(n => n.startsWith('Pagamento:')), n = noteOrd(o), mailN = { ricevuto: 'Ricevuto', accettato: 'Accettato', partito: 'Partito', pronto: 'Pronta', rifiutato: 'Rifiutato', consegnato: 'Consegnata' };
  const cron = [[o.created_at, 'Ricevuto'], [o.accepted_at, `Accettato ${o.eta_minutes || ''}′`], [o.departed_at, casa ? 'Partita' : 'Pronta'], [o.delivered_at, 'Chiuso'], ...(o.emails || []).map(m => [m.at, `Email: ${mailN[m.kind] || m.kind}`])].filter(r => r[0]).sort((a, b) => new Date(a[0]) - new Date(b[0]));
  apri(`<button class="p-x" data-x>Chiudi</button>
    <div class="d-testa"><span>${esc(o.code)}</span><span>${col ? tempoTxt(o, col) : ''}</span></div>
    <p class="p-s">${parole}</p>
    ${az ? `<button class="t h72 forte" data-st2="${az[0]}" data-o="${id}">${az[1]}</button>` : ''}
    ${o.status === 'ricevuto' ? `<button class="t h56 solo d" data-rif2="${id}">Rifiuta</button>` : ''}
    <div class="blocco">${o.items.map(r => `<div class="d-v"><span>${r.qty} ${esc(r.name)}<small>${[r.size !== 'Prezzo' ? r.size : '', r.dough].filter(Boolean).map(esc).join(' · ')}</small>${r.note ? `<small style="color:var(--wtxt)">${esc(r.note)}</small>` : ''}</span><span>${euro(r.unit_cents * r.qty)}</span></div>`).join('')}
      ${casa ? `<div class="d-v" style="font-weight:500"><span>Consegna</span><span>${euro(200)}</span></div>` : ''}
      <div class="d-tot"><span>Totale</span><span>${euro(o.total_cents)}</span></div>${pag ? `<p class="p-s" style="margin:8px 0 0">${esc(pag)}</p>` : ''}</div>
    ${n ? `<div class="nota" style="margin:8px 0 0">${allerg.test(n) ? '<i class="ph-fill ph-warning"></i>' : ''}<span>${esc(n)}</span></div>` : ''}
    <div class="blocco"><p style="font-size:18px;line-height:24px;font-weight:600">${esc(o.customer_name)}</p>
      <a class="t" style="margin-top:8px" href="tel:${esc(o.phone.replace(/\s/g, ''))}"><i class="ph-bold ph-phone"></i>Chiama ${esc(o.phone)}</a>
      ${casa ? `<p style="margin-top:12px;font-size:18px;line-height:24px">${esc(o.address)}</p><a class="t h56" style="margin-top:8px" target="_blank" rel="noopener" href="https://maps.google.com/?q=${encodeURIComponent(o.address)}"><i class="ph-bold ph-map-pin"></i>Apri in Mappe</a>` : ''}</div>
    <div class="blocco cron">${cron.map(c => `<div>${ora(c[0])} · ${esc(c[1])}</div>`).join('')}</div>
    <div class="blocco altre-az">
      ${p && ['accettato', 'in_preparazione', 'in_consegna', 'pronto'].includes(o.status) ? `<p class="p-s">Sposta l'orario: il cliente lo vede subito</p><div class="sposta">${[5, 10, 15, 20].map(m => `<button data-sp="${id}" data-min="${m}">+${m}′</button>`).join('')}</div>` : ''}
      <button class="t h56" data-print="${id}"><i class="ph-bold ph-printer"></i>Stampa la comanda</button>
      ${INDIETRO(o) ? `<button class="t h56" data-ind="${id}">${INDIETRO(o)[1]}</button>` : ''}
      ${['accettato', 'in_preparazione'].includes(o.status) ? `<button class="t h56 solo d" data-rif2="${id}">Annulla l'ordine</button>` : ''}
    </div>`);
}
// un passo indietro, per l'errore di un tocco: Toast lo chiama Recall
const INDIETRO = o => ({ accettato: ['ricevuto', 'Rimetti tra i nuovi'], in_preparazione: ['accettato', 'Rimetti in Da fare'], in_consegna: ['in_preparazione', 'Rimetti in forno'], pronto: ['in_preparazione', 'Rimetti in forno'], consegnato: [o.mode === 'consegna' ? 'in_consegna' : 'pronto', 'Riapri l\'ordine'], rifiutato: ['ricevuto', 'Riapri l\'ordine'] }[o.status]);
async function sposta(id, min) {
  const manda = m => rpc('pr_staff_sposta', { p_pin: PIN, p_id: id, p_min: m }).then(o => { const i = ordini.findIndex(x => x.id === id); if (i > -1) ordini[i] = o; disBanco(); return o; });
  try { const o = await manda(min); avviso(`${o.code}: nuovo orario ${ora(promesso(o))}.`, () => manda(-min)); } catch (e) { avviso('Non salvato. Riprova.'); }
}
function stampa(id) {
  const o = ordini.find(x => x.id === id); if (!o) return; const casa = o.mode === 'consegna', p = promesso(o), n = noteOrd(o);
  $('#stampa').innerHTML = `<h1>${esc(o.code)}</h1><p><b>${casa ? 'Consegna' : 'Ritiro'}</b>${p ? ' · ' + ora(p) : o.slot ? ' · ' + esc(o.slot) : ''}</p>
    ${o.items.map(r => `<div class="s-r"><b>${r.qty} ${esc(r.name)}</b>${[r.size !== 'Prezzo' ? r.size : '', r.dough].filter(Boolean).map(esc).join(' · ')}${r.note ? `<br><b>${esc(r.note)}</b>` : ''}</div>`).join('')}
    ${n ? `<p class="s-n">${esc(n)}</p>` : ''}<p>${esc(o.customer_name)} · ${esc(o.phone)}</p>${casa ? `<p>${esc(o.address)}</p>` : ''}<p><b>${euro(o.total_cents)}</b> ${esc((o.notes || '').split(' · ').find(x => x.startsWith('Pagamento:')) || '')}</p><p>${ora(o.created_at)}</p>`;
  window.print();
}

/* ---------- allarme a tutto schermo: fuori dal banco o sul telefono l'ordine nuovo copre tutto ---------- */
const dopo = new Set(); let allarmeId = null;
const vistaOrdini = () => $('.vista[data-vista=ordini]').classList.contains('su');
function disAllarme(nuovi) {
  const el = $('#allarme'), serve = !vistaOrdini() || innerWidth < 1080;
  const o = serve ? nuovi.find(x => !dopo.has(x.id)) : null;
  if (!o) { el.hidden = true; allarmeId = null; return; }
  const casa = o.mode === 'consegna', firma = o.id + o.items.length + nuovi.length;
  if (allarmeId === firma) { $('.al-attesa', el).textContent = 'Aspetta da ' + Math.max(0, minDa(new Date(o.created_at))) + '′'; return; }
  allarmeId = firma;
  el.innerHTML = `<div class="al-testa"><div><p class="al-nuovo">Nuovo ordine${nuovi.length > 1 ? ` · altri ${nuovi.length - 1}` : ''}</p><p class="al-cod">${esc(o.code)}</p></div><div class="al-dx"><p class="al-attesa">Aspetta da ${Math.max(0, minDa(new Date(o.created_at)))}′</p>${tipo(o)}<p>${o.slot && o.slot !== 'Prima possibile' ? 'Per le ' + esc(o.slot) : 'Prima possibile'}</p></div></div>
    <div class="al-voci">${vociHTML(o, 8)}${noteOrd(o) ? `<div class="nota">${allerg.test(noteOrd(o)) ? '<i class="ph-fill ph-warning"></i>' : ''}<span>${esc(noteOrd(o))}</span></div>` : ''}</div>
    <div class="al-piede"><p class="etic">Accetta · ${casa ? 'arriva' : 'pronta'} tra minuti</p>${tempiHTML(o, propTempo())}<div class="al-sotto"><button data-rif="${o.id}">Rifiuta</button><button data-dopo="${o.id}">Dopo</button></div></div>`;
  el.hidden = false;
}
$('#allarme').addEventListener('click', e => {
  if (Date.now() < bloccoInput) return;
  const acc = e.target.closest('[data-acc]'); if (acc) { ultimoCamp = Date.now(); allarmeId = null; return azione(acc.dataset.acc, 'accettato', { eta: +acc.dataset.m }); }
  const rf = e.target.closest('[data-rif]'); if (rf) { $('#allarme').hidden = true; allarmeId = null; dopo.add(rf.dataset.rif); return apriRifiuto(rf.dataset.rif); }
  const d = e.target.closest('[data-dopo]'); if (d) { dopo.add(d.dataset.dopo); allarmeId = null; disBanco(); }
});
addEventListener('resize', () => disBanco(true));

/* ---------- pausa: come Uber Eats, il sito smette di accettare ordini ---------- */
let pausaFino = null;
function disPausa() {
  const f = $('#f-pausa'), b = $('#b-pausa'), attiva = pausaFino && new Date(pausaFino) > Date.now();
  f.hidden = !attiva; b.classList.toggle('att', !!attiva); $('span', b).textContent = attiva ? 'In pausa' : 'Pausa';
  if (attiva) { const d = new Date(pausaFino), domani = d.toDateString() !== new Date().toDateString(); f.innerHTML = `<span>Ordini dal sito in pausa fino ${domani ? 'a domani' : 'alle ' + ora(d)}. Il sito lo dice ai clienti.</span><button data-riprendi>Riprendi</button>`; }
}
async function pausa(min) {
  const v = pausaFino;
  try { pausaFino = await rpc('pr_staff_pausa', { p_pin: PIN, p_minuti: min }); disPausa(); avviso(min ? 'Ordini in pausa. Il sito lo mostra subito.' : 'Ordini ripartiti.'); }
  catch (e) { pausaFino = v; avviso('Non salvato. Riprova.'); }
}
function apriPausa() {
  apri(`<p class="p-t">Pausa ordini</p><p class="p-s">Il sito smette di accettare ordini e lo dice ai clienti. Il telefono resta com'è.</p>
    <div class="scelte">${[[15, '15 minuti'], [30, '30 minuti'], [60, '1 ora'], [-1, 'Fino a domani']].map(([m, t]) => `<button data-pa="${m}">${t}</button>`).join('')}</div>
    ${pausaFino && new Date(pausaFino) > Date.now() ? '<button class="t h72 forte" data-pa="0">Riprendi adesso</button>' : ''}<button class="t h56 solo" data-x style="margin-top:8px">Lascia aperto</button>`, true);
}
document.addEventListener('click', e => {
  if (e.target.closest('[data-pausa]')) return apriPausa();
  if (e.target.closest('[data-riprendi]')) return pausa(0);
  if (e.target.closest('#banco [data-demo], #imp [data-demo]')) return;
});

/* ---------- prove per chi guarda la demo ---------- */
async function ordineProva() { try { await rpc('pr_staff_demo_ordine', { p_pin: PIN }); await caricaO(); } catch (e) { avviso(/sospesi/.test(e.message) ? 'Gli ordini sono in pausa: togli prima la pausa.' : 'Ordine di prova non riuscito.'); } }
function apriAzzera() {
  apri(`<p class="p-t">Riporta tutto com'era</p><p class="p-s">Cancella tutti gli ordini e rimette prezzi, piatti e ingredienti come all'inizio. Toglie anche la pausa.</p><div class="due"><button class="t h72" data-x>Lascia così</button><button class="t h72 peric" id="az-ok">Riporta tutto</button></div>`, true);
  $('#az-ok').onclick = async () => { chiudi(); try { await rpc('pr_staff_demo_azzera', { p_pin: PIN }); dopo.clear(); pausaFino = null; disPausa(); await Promise.all([caricaO(), caricaM()]); avviso('Fatto: è tutto come all\'inizio.'); } catch (e) { avviso('Non riuscito. Riprova.'); } };
}
function apriRifiuto(id) {
  const o = ordini.find(x => x.id === id); if (!o) return; let mot = null;
  apri(`<p class="p-t">Rifiuta ${esc(o.code)}</p><p class="p-s">${o.items.map(r => `${r.qty} ${esc(r.name)}`).join(', ')}</p>
    <p>Il cliente legge questo motivo</p>
    <div class="scelte">${['Stasera siamo pieni', 'Fuori dalla zona di consegna', 'Siamo chiusi', 'Un ingrediente è finito'].map(m => `<button data-mot="${m}" aria-pressed="false">${m}</button>`).join('')}</div>
    <div class="due"><a class="t h72" href="tel:${esc(o.phone.replace(/\s/g, ''))}">Chiama il cliente</a><button class="t h72 peric" id="conf-rif" disabled>Rifiuta e avvisa</button></div>
    <button class="t h56 solo" data-x style="margin-top:8px">Torna indietro</button>`, true);
  const c = $('#conf-rif'); c.style.opacity = .5;
  pann.onclick = e => { const b = e.target.closest('[data-mot]'); if (b) { mot = b.dataset.mot; $$('[data-mot]', pann).forEach(x => x.setAttribute('aria-pressed', x === b)); c.disabled = false; c.style.opacity = 1; } if (e.target.closest('#conf-rif') && mot) { chiudi(); pann.onclick = null; azione(id, 'rifiutato', { reason: mot }); } };
}
function apriChiusi() {
  const l = (window.__chiusi || []).slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const tot = l.filter(o => o.status === 'consegnato').reduce((s, o) => s + o.total_cents, 0);
  const ok = l.filter(o => o.status === 'consegnato'), puntuali = ok.filter(o => promesso(o) && new Date(o.delivered_at) <= promesso(o) + 300000).length, conti = {};
  ok.forEach(o => o.items.forEach(r => { conti[r.name] = (conti[r.name] || 0) + r.qty; }));
  const top = Object.entries(conti).sort((a, b) => b[1] - a[1]).slice(0, 3);
  apri(`<button class="p-x" data-x>Chiudi</button><p class="importo sx">${euro(tot)}</p><p class="p-s">Incasso di oggi · ${ok.length} consegnati${l.length - ok.length ? ` · ${l.length - ok.length} rifiutati` : ''}</p>
    ${ok.length ? `<div class="blocco"><div class="d-v"><span>Scontrino medio</span><span>${euro(Math.round(tot / ok.length))}</span></div><div class="d-v"><span>A casa · ritiro</span><span>${ok.filter(o => o.mode === 'consegna').length} · ${ok.filter(o => o.mode !== 'consegna').length}</span></div><div class="d-v"><span>In orario, entro 5′</span><span>${puntuali} su ${ok.length}</span></div>${top.length ? `<div class="d-v"><span>I più chiesti<small>${top.map(([n, q]) => `${q} ${esc(n)}`).join(' · ')}</small></span></div>` : ''}</div>` : ''}
    ${l.map(o => `<div class="d-v riap" data-ap="${o.id}" style="padding:12px 0;border-top:1px solid var(--line)"><span>${esc(o.code)}<small>${ora(o.created_at)} · ${o.status === 'rifiutato' ? 'Rifiutato' : esc(o.customer_name)}</small></span><span>${o.status === 'rifiutato' ? '' : euro(o.total_cents)}</span></div>`).join('')}`);
}
pann.addEventListener('click', e => {
  if (e.target.closest('[data-x]')) return chiudi();
  const s = e.target.closest('[data-st2]'); if (s) { chiudi(); return azione(s.dataset.o, s.dataset.st2); }
  const r = e.target.closest('[data-rif2]'); if (r) return apriRifiuto(r.dataset.rif2);
  const sp = e.target.closest('[data-sp]'); if (sp) { chiudi(); return sposta(sp.dataset.sp, +sp.dataset.min); }
  const pr = e.target.closest('[data-print]'); if (pr) return stampa(pr.dataset.print);
  const ind = e.target.closest('[data-ind]'); if (ind) { const o = visibili().find(x => x.id === ind.dataset.ind), b = INDIETRO(o); chiudi(); dopo.add(o.id); return azione(o.id, b[0], { frase: `${o.code}: tornato indietro.` }); }
  const pa = e.target.closest('[data-pa]'); if (pa) { chiudi(); return pausa(+pa.dataset.pa); }
  const ap = e.target.closest('.riap[data-ap]'); if (ap) return apriDettaglio(ap.dataset.ap);
});

/* ---------- menù ---------- */
let filtroM = 'tutti', catSu = null;
async function caricaM() { try { menu = await rpc('pr_menu'); pausaFino = menu.pausa_fino; disPausa(); indiceUsi(); disMenu(); disIng(); } catch (e) {} }
const trova = id => { for (const c of menu.categories) { const i = c.items.find(x => x.id === id); if (i) return i; } };
function disMenu() {
  if (!menu) return;
  const q = $('#q-menu').value.trim().toLowerCase();
  if (catSu === null) catSu = menu.categories[0].id;
  $('#cats').innerHTML = menu.categories.map(c => { const sp = c.items.filter(i => !i.available || i.blocked_by.length).length; return `<button data-c="${c.id}" class="${c.id === catSu && !q ? 'su' : ''}"><span>${esc(c.name)}</span>${sp ? `<em>${sp}</em>` : ''}</button>`; }).join('');
  const cats = menu.categories.filter(c => q || filtroM === 'spenti' || c.id === catSu);
  let html = '';
  cats.forEach(c => {
    const it = c.items.filter(i => (!q || i.name.toLowerCase().includes(q)) && (filtroM === 'tutti' || !i.available || i.blocked_by.length));
    if (!it.length) return;
    html += `<h3 class="cat-t">${esc(c.name)}</h3>` + it.map(i => {
      const off = !i.available, man = i.blocked_by.length;
      return `<div class="riga${off || man ? ' off' : ''}"><div style="min-width:0"><b>${esc(i.name)}</b><small>${esc(i.descr || '')}</small></div>
        <div class="celle">${i.prices.map((p, k) => `<button class="cella" data-pr="${i.id}" data-k="${k}"><span>${(p.c / 100).toFixed(2).replace('.', ',')}</span>${p.l !== 'Prezzo' ? `<small>${esc(p.l)}</small>` : ''}</button>`).join('')}</div>
        <button class="stato${off ? ' off' : man ? ' manca' : ''}" data-di="${i.id}">${off ? (i.torna_il ? 'Spento fino a domani' : 'Spento') : man ? 'Manca: ' + esc(i.blocked_by[0]) : 'Attivo'}</button></div>`;
    }).join('');
  });
  $('#righe').innerHTML = html || `<div class="vuoto">${q ? `Nessun piatto con "${esc(q)}".` : 'Tutti i piatti sono attivi.'}</div>`;
}
$('#q-menu').addEventListener('input', disMenu);
$('#cats').addEventListener('click', e => { const b = e.target.closest('[data-c]'); if (!b) return; catSu = +b.dataset.c; $('#q-menu').value = ''; disMenu(); $('.menu-d').scrollTop = 0; });
$('#seg-menu').addEventListener('click', e => { const b = e.target.closest('[data-m]'); if (!b) return; filtroM = b.dataset.m; $$('#seg-menu button').forEach(x => x.setAttribute('aria-pressed', x === b)); disMenu(); });
$('#righe').addEventListener('click', async e => {
  const d = e.target.closest('[data-di]');
  if (d) {
    const i = trova(+d.dataset.di); if (i.blocked_by.length && i.available) { vai('ingredienti'); return; }
    if (i.available) return apriSpegni(i);
    const manda = v => rpc('pr_staff_set_item', { p_pin: PIN, p_item: i.id, p_available: v, p_prices: null });
    i.available = true; i.torna_il = null; disMenu();
    try { await manda(true); avviso(`${i.name}: di nuovo attiva.`, async () => { i.available = false; disMenu(); await manda(false); }); } catch (er) { i.available = false; disMenu(); avviso('Non salvato. Riprova.'); }
    return;
  }
  const c = e.target.closest('[data-pr]'); if (c) apriPrezzo(+c.dataset.pr, +c.dataset.k);
});
function apriSpegni(i) {
  apri(`<p class="p-t">Spegni ${esc(i.name)}</p><p class="p-s">Sul sito compare come non disponibile e non si può ordinare.</p>
    <div class="scelte"><button id="sp-sera">Solo stasera<small>Torna da sola domani</small></button><button id="sp-sempre">Finché non la riaccendo</button></div><button class="t h56 solo" data-x>Lascia attiva</button>`, true);
  const fatto = async (via, testo) => { chiudi(); i.available = false; disMenu(); try { await via(); await caricaM(); avviso(testo, async () => { await rpc('pr_staff_set_item', { p_pin: PIN, p_item: i.id, p_available: true, p_prices: null }); caricaM(); }); } catch (e) { i.available = true; disMenu(); avviso('Non salvato. Riprova.'); } };
  $('#sp-sera').onclick = () => fatto(() => rpc('pr_staff_stasera', { p_pin: PIN, p_item: i.id }), `${i.name}: spenta fino a domani.`);
  $('#sp-sempre').onclick = () => fatto(() => rpc('pr_staff_set_item', { p_pin: PIN, p_item: i.id, p_available: false, p_prices: null }), `${i.name}: spenta sul sito.`);
}
function apriPrezzo(id, k) {
  const i = trova(id), p = i.prices[k], ini = p.c; let v = 0;
  apri(`<button class="p-x" data-x>Chiudi</button><p class="p-t">${esc(i.name)}${p.l !== 'Prezzo' ? ' · ' + esc(p.l) : ''}</p><p class="p-s">Ora ${euro(ini)}</p>
    <p class="importo" id="imp-v">${euro(0)}</p><p class="imp-n" id="imp-n">&nbsp;</p>
    <div class="tast" id="tp">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<button>${n}</button>`).join('')}<button data-z="00">00</button><button>0</button><button data-k="c" aria-label="Cancella"><i class="ph-bold ph-backspace"></i></button></div>
    <button class="t h72 forte" id="salva" disabled>Salva</button>`);
  const sv = $('#salva'), upd = () => {
    $('#imp-v').textContent = euro(v); const ok = v >= 50 && v <= 20000, n = $('#imp-n');
    const dv = ini ? (v - ini) / ini : 0;
    if (v && !ok) { n.textContent = 'Prezzo tra 0,50 e 200 €'; n.className = 'imp-n w'; }
    else if (ok && Math.abs(dv) > .3) { n.textContent = `Era ${euro(ini)}: ${dv > 0 ? '+' : ''}${Math.round(dv * 100)}%. Controlla.`; n.className = 'imp-n w'; }
    else { n.innerHTML = '&nbsp;'; n.className = 'imp-n'; }
    const can = ok && v !== ini; sv.disabled = !can; sv.style.opacity = can ? 1 : .4; sv.textContent = can ? `Salva ${euro(v)}` : 'Salva';
  }; upd();
  $('#tp').onclick = e => { const b = e.target.closest('button'); if (!b) return; if (b.dataset.k === 'c') v = Math.floor(v / 10); else { const s = b.dataset.z || b.textContent; v = Math.min(99999, +(String(v) + s)); } upd(); };
  sv.onclick = async () => {
    const prezzi = i.prices.map((x, j) => ({ l: x.l, c: j === k ? v : x.c })), vecchi = i.prices;
    try {
      await rpc('pr_staff_set_item', { p_pin: PIN, p_item: id, p_available: null, p_prices: prezzi });
      i.prices = prezzi; chiudi(); disMenu();
      const cella = $(`.cella[data-pr="${id}"][data-k="${k}"]`); if (cella) { cella.classList.add('salv'); const s = $('small', cella) || cella.appendChild(document.createElement('small')); const t = s.textContent; s.textContent = 'Salvato'; setTimeout(() => { s.textContent = t; cella.classList.remove('salv'); }, 1400); }
      avviso('Già sul sito.', async () => { i.prices = vecchi; disMenu(); await rpc('pr_staff_set_item', { p_pin: PIN, p_item: id, p_available: null, p_prices: vecchi }); });
    } catch (er) { avviso('Non salvato: ' + er.message); }
  };
}

/* ---------- ingredienti ---------- */
const usi = {};
function indiceUsi() { menu.ingredients.forEach(g => { const n = g.name.toLowerCase(); usi[g.id] = menu.categories.reduce((s, c) => s + c.items.filter(i => (i.descr || '').toLowerCase().includes(n)).length, 0); }); }
function tessera(g) { const b = menu.categories.reduce((s, c) => s + c.items.filter(i => i.blocked_by.includes(g.name)).length, 0); const nm = g.name[0].toUpperCase() + g.name.slice(1); return `<button class="tes${g.available ? '' : ' fin'}" data-ing="${g.id}"><b>${esc(nm)}</b><small>${g.available ? `${usi[g.id] || 0} piatti` : `Finito fino a domani · ${b} piatti`}</small></button>`; }
function disIng() {
  if (!menu) return;
  const q = $('#q-ing').value.trim().toLowerCase(), gs = menu.ingredients;
  if (q) { const r = gs.filter(g => g.name.includes(q)); $('#tessere').innerHTML = r.length ? `<div class="griglia">${r.map(tessera).join('')}</div>` : `<div class="vuoto">Nessun ingrediente con "${esc(q)}".</div>`; return; }
  const fin = gs.filter(g => !g.available), top = gs.filter(g => g.available).slice().sort((a, b) => (usi[b.id] || 0) - (usi[a.id] || 0)).slice(0, 12);
  $('#tessere').innerHTML = (fin.length ? `<h3 class="sez-t">Finiti ora</h3><div class="griglia">${fin.map(tessera).join('')}</div>` : '') + `<h3 class="sez-t">I più usati</h3><div class="griglia">${top.map(tessera).join('')}</div><h3 class="sez-t">Tutti</h3><div class="griglia">${gs.filter(g => g.available).map(tessera).join('')}</div>`;
}
$('#q-ing').addEventListener('input', disIng);
async function setIng(g, v) { g.available = v; disIng(); await rpc('pr_staff_set_ingredient', { p_pin: PIN, p_ing: g.id, p_available: v }); await caricaM(); }
$('#tessere').addEventListener('click', e => {
  const b = e.target.closest('[data-ing]'); if (!b) return;
  const g = menu.ingredients.find(x => x.id === +b.dataset.ing), n = usi[g.id] || 0, nm = g.name[0].toUpperCase() + g.name.slice(1);
  const spegni = () => setIng(g, false).then(() => avviso(`${nm} finito: si spengono ${n} piatti.`, () => setIng(g, true))).catch(() => avviso('Non salvato. Riprova.'));
  if (!g.available) return setIng(g, true).then(() => avviso(`${nm} di nuovo disponibile.`, () => setIng(g, false))).catch(() => avviso('Non salvato. Riprova.'));
  if (n <= 20) return spegni();
  const nomi = []; menu.categories.forEach(c => c.items.forEach(i => { if (nomi.length < 6 && (i.descr || '').toLowerCase().includes(g.name)) nomi.push(i.name); }));
  apri(`<p class="p-t">${esc(nm)} è in ${n} piatti</p><p class="p-s">${nomi.map(esc).join(', ')} e altri.</p><div class="due"><button class="t h72" data-x>Lascia attivo</button><button class="t h72 peric" id="sp">Spegni ${n} piatti</button></div>`, true);
  $('#sp').onclick = () => { chiudi(); spegni(); };
});

/* ---------- navigazione ---------- */
function vai(v) { $$('.nav button').forEach(b => { const on = b.dataset.v === v; b.toggleAttribute('aria-current', on); if (on) b.setAttribute('aria-current', 'true'); const i = $('i', b); i.className = (on ? 'ph-fill ' : 'ph-bold ') + i.className.split(' ').find(c => c.startsWith('ph-') && c !== 'ph-fill' && c !== 'ph-bold'); }); $$('.vista').forEach(s => s.classList.toggle('su', s.dataset.vista === v)); if (v !== 'ordini') caricaM(); if (v === 'impostazioni') disImp(); disBanco(true); }
$('.nav').addEventListener('click', e => { const b = e.target.closest('[data-v]'); if (b) vai(b.dataset.v); });

/* ---------- impostazioni ---------- */
async function disImp() {
  const notif = !('Notification' in window) ? 'Su iPhone aggiungi prima l’app alla schermata Home.' : Notification.permission === 'granted' ? 'Attive.' : Notification.permission === 'denied' ? 'Bloccate nelle impostazioni del browser.' : 'Non ancora attive.';
  let mail = '—'; try { mail = (await rpc('pr_staff_mail_status', { p_pin: PIN })).configured ? 'Attive: partono da sole a ogni passaggio.' : 'Da collegare: manca il collegamento Gmail.'; } catch (e) {}
  const op = (k, val, lab) => `<button data-p="${k}" data-val="${val}" aria-pressed="${pref[k] === val}">${lab}</button>`;
  $('#imp').innerHTML = `<h3>Suono</h3>
    <div class="ir"><div><b>Campanello</b><small>Il volume si regola dal dispositivo: alzalo al massimo durante il servizio.</small></div><div class="az">${op('suono', true, 'Attivo')}${op('suono', false, 'Spento')}<button data-prova>Prova</button></div></div>
    <h3>Schermo</h3>
    <div class="ir"><b>Tema</b><div class="az">${op('tema', 'auto', 'Automatico')}${op('tema', 'sera', 'Sera')}${op('tema', 'giorno', 'Giorno')}</div></div>
    <div class="ir"><b>Testo</b><div class="az">${op('testo', 'normale', 'Normale')}${op('testo', 'grande', 'Grande')}</div></div>
    <div class="ir"><b>Schermo sempre acceso</b><div class="az">${op('sveglio', true, 'Sì')}${op('sveglio', false, 'No')}</div></div>
    <h3>Notifiche</h3>
    <div class="ir"><div><b>Sul dispositivo</b><small>${notif}</small></div><div class="az"><button data-notif>Attiva</button></div></div>
    <h3>Clienti</h3>
    <div class="ir"><div><b>Email</b><small>${mail}</small></div></div>
    <div class="ir"><div><b>Il sito</b></div><div class="az"><a href="../menu.html" target="_blank">Apri il sito</a></div></div>
    <h3>Prova</h3>
    <div class="ir"><div><b>Ordine di prova</b><small>Arriva come un ordine vero, con il campanello. Non scrive a nessuno.</small></div><div class="az"><button data-demo>Manda</button></div></div>
    <div class="ir"><div><b>Riporta tutto com'era</b><small>Cancella gli ordini e rimette prezzi e disponibilità di partenza.</small></div><div class="az"><button data-azzera>Riporta</button></div></div>
    <div style="height:48px"></div>
    <button class="t solo d" data-esci>Esci</button>`;
}
$('#imp').addEventListener('click', async e => {
  const p = e.target.closest('[data-p]');
  if (p) { const k = p.dataset.p; let v = p.dataset.val; if (v === 'true') v = true; if (v === 'false') v = false; pref[k] = v; salvaP(); tema(); if (k === 'sveglio') v ? sveglia() : wake && wake.release(); disImp(); disBanco(); return; }
  if (e.target.closest('[data-prova]')) { campanello(); notifica({ id: 'prova', code: 'Prova', items: [{ qty: 1, name: 'Margherita' }] }); }
  if (e.target.closest('[data-notif]') && 'Notification' in window) { await Notification.requestPermission(); disImp(); }
  if (e.target.closest('[data-esci]')) esci('');
  if (e.target.closest('[data-demo]')) { ordineProva(); avviso('Ordine di prova in arrivo.'); }
  if (e.target.closest('[data-azzera]')) apriAzzera();
});
document.addEventListener('click', e => { if (e.target.closest('#banco [data-prova]')) return; });

if (PIN) rpc('pr_staff_check', { p_pin: PIN }).then(ok => ok ? entra() : esci('')).catch(() => entra());
