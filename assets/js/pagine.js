// pagine interne: titoli parola per parola, foto che si aprono, anni che cambiano
gsap.registerPlugin(ScrollTrigger);
document.querySelectorAll('h1.display').forEach(h => gsap.from(PR.parole(h), { yPercent: 110, duration: 1.3, stagger: .06, ease: 'expo.out', delay: .1 }));
document.querySelectorAll('main h2.display').forEach(h => gsap.from(PR.parole(h), { yPercent: 110, duration: 1.1, stagger: .05, ease: 'expo.out', scrollTrigger: { trigger: h, start: 'top 85%' } }));
document.querySelectorAll('.p-eroe .sfondo img').forEach(i => gsap.fromTo(i, { scale: 1.18 }, { scale: 1, duration: 2.2, ease: 'expo.out' }));
gsap.utils.toArray('.cornice').forEach(c => gsap.from(c, { clipPath: 'inset(20% 0 20% 0)', ease: 'none', scrollTrigger: { trigger: c, start: 'top 95%', end: 'top 45%', scrub: true } }));

// storia: il numero grande cambia con il capitolo
const num = document.querySelector('.anni-num');
if (num) {
  let cur = num.querySelector('span');
  document.querySelectorAll('.anno').forEach(a => ScrollTrigger.create({
    trigger: a, start: 'top 55%', end: 'bottom 55%',
    onToggle: s => {
      if (!s.isActive || cur.textContent === a.dataset.n) return;
      const n = document.createElement('span'); n.className = 'prima'; n.textContent = a.dataset.n; num.appendChild(n);
      const vecchio = cur; vecchio.classList.add('via'); setTimeout(() => vecchio.remove(), 700);
      requestAnimationFrame(() => requestAnimationFrame(() => n.classList.remove('prima')));
      cur = n;
    },
  }));
}
