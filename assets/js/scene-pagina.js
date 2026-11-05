// Accende le scene 3D della pagina quando stanno per entrare nello schermo
import { scenaCartoni, scenaPizza, scenaRuota } from './scena3d.js';

const accendi = async c => {
  const sez = c.closest('section') || c.parentElement, d = c.dataset;
  try {
    if (d.scena === 'cartoni') await scenaCartoni(c, sez, { quanti: +d.quanti || 3 });
    if (d.scena === 'pizza') await scenaPizza(c, sez, { nome: d.nome, inclina: +d.inclina || .95, ingredienti: d.ingredienti ? [...document.querySelectorAll('[data-ingr]')] : null });
    if (d.scena === 'ruota') await scenaRuota(c, sez, JSON.parse(d.voci));
    c.classList.add('accesa');
  } catch (e) { c.closest('[data-riserva]')?.classList.add('senza-3d'); }
};
document.querySelectorAll('canvas[data-scena]').forEach(c => new IntersectionObserver(([e], o) => { if (e.isIntersecting) { accendi(c); o.disconnect(); } }, { rootMargin: '120% 0px' }).observe(c));
