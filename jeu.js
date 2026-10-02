(() => {
const S = SETTINGS;
const canvas = document.getElementById('jeu');
const ctx = canvas.getContext('2d');

// ---------- Arène ----------
// L'arène est large comme l'écran : la hauteur est fixe (S.hauteurArene), la largeur suit l'écran.
let d = 1;
let k = 1;
let largeurArene = 0;

const mannequin = { x: 0, w: S.mannequinLargeur, h: S.heroHauteur * S.mannequinHauteurHeros, flash: -1e9 };

function ajuster() {
  d = window.devicePixelRatio || 1;
  canvas.width = Math.round(window.innerWidth * d);
  canvas.height = Math.round(window.innerHeight * d);
  k = window.innerHeight / S.hauteurArene;
  largeurArene = window.innerWidth / k;
  mannequin.x = largeurArene - S.mannequinDepartDroite - mannequin.w / 2;
}
window.addEventListener('resize', ajuster);
ajuster();

// ---------- Héros ----------
const hero = {
  x: S.heroDepartX,
  dir: 1,                 // il regarde toujours le mannequin
  etat: 'libre',          // libre, roulade, attaque
  t: 0,                   // temps passé dans l'état, ms
  rouladeDir: 1,
  attaqueN: 1,
  frappe: false,          // le coup de l'attaque en cours a-t-il eu lieu
  enfile: false,          // une attaque a été demandée pendant celle-ci
  derniereAttaqueN: 0,
  finAttaque: -1e9,
  vie: S.vie,
  endurance: S.enduranceMax,
  derniereAction: -1e9,
};
let gt = 0;               // temps de jeu, ms

function payer(cout) {
  hero.endurance = Math.max(0, hero.endurance - cout);
  hero.derniereAction = gt;
}

function lancerAttaque() {
  const n = (hero.derniereAttaqueN === 1 && gt - hero.finAttaque <= S.enchainementMs) ? 2 : 1;
  payer(S.enduranceAttaque);
  hero.etat = 'attaque';
  hero.t = 0;
  hero.attaqueN = n;
  hero.frappe = false;
  hero.enfile = false;
}

function attaquer() {
  if (hero.endurance <= 0 || hero.etat === 'roulade') return;
  if (hero.etat === 'attaque') { hero.enfile = true; return; }
  lancerAttaque();
}

function rouler(dir) {
  if (hero.endurance <= 0 || hero.etat === 'roulade') return;
  payer(S.enduranceRoulade);
  hero.etat = 'roulade';
  hero.t = 0;
  hero.rouladeDir = dir;
  hero.enfile = false;
}

// ---------- Commandes ----------
const touches = new Map(); // id -> { cote, x0, y0, t0, x, fait }
const clavier = new Set();

function marcheTactile() {
  for (const p of touches.values()) {
    if (p.cote !== 'gauche') continue;
    const dx = p.x - p.x0;
    return Math.abs(dx) < S.zoneMortePx ? 0 : Math.sign(dx);
  }
  return null;
}

function direction() {
  const t = marcheTactile();
  if (t !== null) return t;
  return (clavier.has('ArrowRight') ? 1 : 0) - (clavier.has('ArrowLeft') ? 1 : 0);
}

window.addEventListener('pointerdown', e => {
  if (touches.has(e.pointerId)) return;
  const cote = e.clientX < window.innerWidth / 2 ? 'gauche' : 'droite';
  if (cote === 'gauche' && marcheTactile() !== null) return; // un seul pouce gauche
  touches.set(e.pointerId, { cote, x0: e.clientX, y0: e.clientY, t0: e.timeStamp, x: e.clientX, fait: false });
});
window.addEventListener('pointermove', e => {
  const p = touches.get(e.pointerId);
  if (!p) return;
  p.x = e.clientX;
  if (p.cote === 'droite' && !p.fait && Math.abs(p.x - p.x0) >= S.glisserMinPx) {
    p.fait = true;
    rouler(Math.sign(p.x - p.x0));
  }
});
function relacher(e) {
  const p = touches.get(e.pointerId);
  if (!p) return;
  touches.delete(e.pointerId);
  if (e.type === 'pointerup' && p.cote === 'droite' && !p.fait && e.timeStamp - p.t0 <= S.toucherMaxMs) attaquer();
}
window.addEventListener('pointerup', relacher);
window.addEventListener('pointercancel', relacher);

window.addEventListener('keydown', e => {
  if (['ArrowLeft', 'ArrowRight', 'Space', 'ShiftLeft', 'ShiftRight'].includes(e.code)) e.preventDefault();
  if (e.repeat) return;
  clavier.add(e.code);
  if (e.code === 'Space') attaquer();
  if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') rouler(direction() || hero.dir);
});
window.addEventListener('keyup', e => clavier.delete(e.code));
window.addEventListener('blur', () => { clavier.clear(); touches.clear(); });
window.addEventListener('contextmenu', e => e.preventDefault());

// ---------- Mise à jour ----------
function chevauche(a1, a2, b1, b2) { return a1 < b2 && b1 < a2; }

function sortirDuMannequin() {
  const demi = S.heroLargeur / 2;
  const g = mannequin.x - mannequin.w / 2, dr = mannequin.x + mannequin.w / 2;
  if (!chevauche(hero.x - demi, hero.x + demi, g, dr)) return;
  hero.x = hero.x < mannequin.x ? g - demi : dr + demi;
}

function frapper() {
  const portee = S.attaquePorteeLargeurs * S.heroLargeur;
  const depart = hero.x + hero.dir * S.heroLargeur / 2;
  const fin = depart + hero.dir * portee;
  const g = mannequin.x - mannequin.w / 2, dr = mannequin.x + mannequin.w / 2;
  if (chevauche(Math.min(depart, fin), Math.max(depart, fin), g, dr)) mannequin.flash = gt;
}

function avancer(dt) {
  gt += dt;
  hero.dir = mannequin.x >= hero.x ? 1 : -1;
  hero.t += dt;

  if (hero.etat === 'libre') {
    hero.x += direction() * S.vitesseMarche * dt / 1000;
  } else if (hero.etat === 'roulade') {
    hero.x += hero.rouladeDir * S.rouladeLargeurs * S.heroLargeur * dt / S.rouladeMs;
    if (hero.t >= S.rouladeMs) { hero.etat = 'libre'; hero.t = 0; }
  } else {
    if (!hero.frappe && hero.t >= S.attaqueMs * S.attaqueImpactRatio) { hero.frappe = true; frapper(); }
    if (hero.t >= S.attaqueMs) {
      hero.derniereAttaqueN = hero.attaqueN;
      hero.finAttaque = gt;
      hero.etat = 'libre';
      hero.t = 0;
      if (hero.enfile && hero.endurance > 0) lancerAttaque();
      hero.enfile = false;
    }
  }

  hero.x = Math.max(S.heroLargeur / 2, Math.min(largeurArene - S.heroLargeur / 2, hero.x));
  if (hero.etat !== 'roulade') sortirDuMannequin();

  if (gt - hero.derniereAction >= S.enduranceRegenDelaiMs) {
    hero.endurance = Math.min(S.enduranceMax, hero.endurance + S.enduranceRegenParSeconde * dt / 1000);
  }
}

// ---------- Dessin ----------
function barre(x, y, part, couleur) {
  ctx.fillStyle = '#222';
  ctx.fillRect(x, y, S.barreLargeur, S.barreHauteur);
  ctx.fillStyle = couleur;
  ctx.fillRect(x, y, S.barreLargeur * part, S.barreHauteur);
}

function dessiner() {
  ctx.setTransform(d * k, 0, 0, d * k, 0, 0);
  ctx.fillStyle = '#0e0e12';
  ctx.fillRect(0, 0, largeurArene, S.hauteurArene);
  ctx.fillStyle = '#1b1b21';
  ctx.fillRect(0, S.solY, largeurArene, S.hauteurArene - S.solY);

  // Mannequin
  const mf = gt - mannequin.flash < S.mannequinFlashMs;
  ctx.fillStyle = mf ? '#d9d9d9' : '#2a2a31';
  ctx.fillRect(mannequin.x - mannequin.w / 2, S.solY - mannequin.h, mannequin.w, mannequin.h);

  // Héros
  const roule = hero.etat === 'roulade';
  const h = roule ? S.heroHauteur * S.rouladeAplatiRatio : S.heroHauteur;
  const invulnerable = roule && hero.t < S.rouladeInvulnerableMs;
  if (hero.etat === 'attaque') {
    const portee = S.attaquePorteeLargeurs * S.heroLargeur;
    const depart = hero.x + hero.dir * S.heroLargeur / 2;
    ctx.fillStyle = 'rgba(230,230,230,0.25)';
    ctx.fillRect(Math.min(depart, depart + hero.dir * portee), S.solY - S.heroHauteur, portee, S.heroHauteur);
  }
  ctx.globalAlpha = invulnerable ? S.rouladeAlpha : 1;
  ctx.fillStyle = '#e6e6e6';
  ctx.fillRect(hero.x - S.heroLargeur / 2, S.solY - h, S.heroLargeur, h);
  ctx.globalAlpha = 1;

  // Vie et endurance du héros, en haut à gauche
  barre(S.barreMarge, S.barreMarge, hero.vie / S.vie, '#a33');
  barre(S.barreMarge, S.barreMarge + S.barreHauteur + S.barreEspace, hero.endurance / S.enduranceMax, '#4a8');
}

// ---------- Boucle ----------
const pas = 1000 / S.fps;
let dernierDessin = 0;
let precedent = performance.now();
function boucle(now) {
  requestAnimationFrame(boucle);
  if (now - dernierDessin < pas - 1) return;
  dernierDessin = now;
  const dt = Math.min(now - precedent, S.dtMaxMs);
  precedent = now;
  avancer(dt);
  dessiner();
}
requestAnimationFrame(boucle);
})();
