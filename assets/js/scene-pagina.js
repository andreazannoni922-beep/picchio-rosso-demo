// Accende le scene 3D quando stanno per entrare nello schermo
import { scenaCartoni, scenaIngredienti } from './scena3d.js';

// le lettere del titolo saltano a ogni urto, all'ultimo volano via
function lettere(el) {
  const out = []; el.querySelectorAll('[data-lettere]').forEach(r => { const t = r.textContent; r.textContent = ''; t.split(' ').forEach((w, i, a) => { const b = document.createElement('span'); b.className = 'parola'; [...w].forEach(c => { const s = document.createElement('span'); s.className = 'let'; s.textContent = c; b.appendChild(s); out.push(s); }); r.appendChild(b); if (i < a.length - 1) r.appendChild(document.createTextNode(' ')); }); });
  return out;
}
const accendi = async c => {
  const sez = c.closest('section'), d = c.dataset;
  if (d.scena === 'cartoni') {
    const tit = sez.querySelector('[data-urto]'), ll = tit ? lettere(tit) : [], q = +d.quanti || 3; let via = false;
    const urto = (i, f) => { ll.forEach(s => { const x = (Math.random() - .5) * 46 * f, y = -(30 + Math.random() * 90) * f, r = (Math.random() - .5) * 26 * f; s.animate([{ transform: 'none' }, { transform: `translate(${x}px,${y}px) rotate(${r}deg)`, offset: .34, easing: 'cubic-bezier(.5,0,.8,.4)' }, { transform: 'none' }], { duration: 640 + Math.random() * 180, easing: 'cubic-bezier(.2,.8,.3,1)' }); }); if (i === q - 1 && !via && tit) { via = true; tit.classList.add('spazzato'); ll.forEach(s => { s.style.setProperty('--x', (Math.random() - .5) * 120 + 'vw'); s.style.setProperty('--y', -(40 + Math.random() * 80) + 'svh'); s.style.setProperty('--r', (Math.random() - .5) * 200 + 'deg'); }); } };
    await scenaCartoni(c, sez, { quanti: q, titolo: urto });
    if (tit) addEventListener('scroll', () => { const r = sez.getBoundingClientRect(), p = -r.top / (sez.offsetHeight - innerHeight); if (p < .03 + (q - 1) * (.46 / q) + .06) { via = false; tit.classList.remove('spazzato'); } }, { passive: true });
  }
  if (d.scena === 'ingredienti') await scenaIngredienti(c, c.parentElement.querySelector('img'), [...document.querySelectorAll('[data-ingr]')], sez);
};
document.querySelectorAll('canvas[data-scena]').forEach(c => new IntersectionObserver(([e], o) => { if (e.isIntersecting) { accendi(c); o.disconnect(); } }, { rootMargin: '120% 0px' }).observe(c));
