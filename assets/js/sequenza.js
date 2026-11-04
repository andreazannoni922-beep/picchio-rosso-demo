// Sequenza di fotogrammi su canvas legata allo scroll: su iPhone è l'unico modo fluido di scorrere una ripresa.
// new Sequenza(canvas, { telefono: {cartella, n}, schermo: {cartella, n} }).vai(0..1)
class Sequenza {
  constructor(canvas, opz) {
    this.c = canvas; this.x = canvas.getContext('2d', { alpha: false });
    const o = innerWidth / innerHeight < 1 ? opz.telefono : opz.schermo;
    this.n = o.n; this.dir = o.cartella; this.img = new Array(o.n); this.i = -1; this.p = 0; this.pronto = false;
    addEventListener('resize', () => this.misura()); this.misura();
    // prima ogni 8°, poi ogni 4°, poi il resto: si vede subito qualcosa e si raffina
    const ordine = [], visto = new Set();
    [8, 4, 2, 1].forEach(s => { for (let k = 0; k < this.n; k += s) if (!visto.has(k)) { visto.add(k); ordine.push(k); } });
    if (!visto.has(this.n - 1)) ordine.splice(1, 0, this.n - 1);
    this.coda = ordine; for (let k = 0; k < 8; k++) this.prossimo();
  }
  prossimo() {
    const k = this.coda.shift(); if (k === undefined) return;
    const im = new Image(); im.decoding = 'async';
    im.onload = () => { this.img[k] = im; this.pronto = true; if (this.i < 0 || Math.round(this.p * (this.n - 1)) === k || !this.img[this.i]) this.disegna(true); this.prossimo(); };
    im.onerror = () => this.prossimo();
    im.src = `${this.dir}/${String(k + 1).padStart(3, '0')}.webp`;
  }
  misura() { const r = this.c.getBoundingClientRect(), d = Math.min(devicePixelRatio || 1, 2); this.c.width = Math.round(r.width * d); this.c.height = Math.round(r.height * d); this.i = -1; this.disegna(true); }
  vicino(k) { for (let d = 0; d < this.n; d++) { if (this.img[k - d]) return k - d; if (this.img[k + d]) return k + d; } return -1; }
  vai(p) { this.p = p; this.disegna(false); }
  disegna(forza) {
    const k = this.vicino(Math.round(this.p * (this.n - 1))); if (k < 0 || (k === this.i && !forza)) return;
    this.i = k; const im = this.img[k], W = this.c.width, H = this.c.height, s = Math.max(W / im.naturalWidth, H / im.naturalHeight), w = im.naturalWidth * s, h = im.naturalHeight * s;
    this.x.drawImage(im, (W - w) / 2, (H - h) / 2, w, h);
  }
}
window.Sequenza = Sequenza;
