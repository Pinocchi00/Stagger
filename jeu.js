(() => {
const S = SETTINGS;
const canvas = document.getElementById('jeu');
const ctx = canvas.getContext('2d');

// ---------- Arène ----------
// L'arène est large comme l'écran : la hauteur est fixe (S.hauteurArene), la largeur suit l'écran.
let d = 1;
let k = 1;
let largeurArene = 0;

const boss = { x: 0, w: S.bossLargeur, h: S.heroHauteur * S.bossHauteurHeros };
const hero = {};
const jeu = { etat: 'combat', t: 0 }; // combat, mort, victoire
let gt = 0;               // temps de jeu, ms

function ajuster() {
  d = window.devicePixelRatio || 1;
  canvas.width = Math.round(window.innerWidth * d);
  canvas.height = Math.round(window.innerHeight * d);
  k = window.innerHeight / S.hauteurArene;
  largeurArene = window.innerWidth / k;
  if (jeu.etat === 'combat' && boss.etat === 'ouverture' && boss.attaque === 'debut') boss.x = positionBoss();
}
const positionBoss = () => largeurArene - S.bossDepartDroite - boss.w / 2;

function recommencer() {
  Object.assign(hero, {
    x: S.heroDepartX,
    dir: 1,               // il regarde toujours le boss
    etat: 'libre',        // libre, roulade, attaque, touche
    t: 0,                 // temps passé dans l'état, ms
    rouladeDir: 1,
    reculDir: 1,
    attaqueN: 1,
    frappe: false,        // le coup de l'attaque en cours a-t-il eu lieu
    enfile: false,        // une attaque a été demandée pendant celle-ci
    derniereAttaqueN: 0,
    finAttaque: -1e9,
    vie: S.vie,
    endurance: S.enduranceMax,
    derniereAction: -1e9,
  });
  Object.assign(boss, {
    x: positionBoss(),
    dir: -1,
    vie: S.bossVie,
    etat: 'ouverture',    // marche, fauchage, sort, ouverture
    attaque: 'debut',
    t: 0,
    duree: S.bossDebutMs, // durée de l'ouverture en cours
    applique: false,      // les dégâts de l'attaque en cours ont-ils été infligés
    marque: null,         // marque du Sort : { x, t0 }
    sortsRestants: 0,     // Sorts à enchaîner après celui en cours (phase 2)
    flash: -1e9,
  });
  jeu.etat = 'combat';
  jeu.t = 0;
}

window.addEventListener('resize', ajuster);
ajuster();
recommencer();

// ---------- Héros ----------
const invulnerable = () => hero.etat === 'roulade' && hero.t < S.rouladeInvulnerableMs;

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
  if (jeu.etat !== 'combat' || hero.endurance <= 0 || hero.etat === 'roulade' || hero.etat === 'touche') return;
  if (hero.etat === 'attaque') { hero.enfile = true; return; }
  lancerAttaque();
}

function rouler(dir) {
  if (jeu.etat !== 'combat' || hero.endurance <= 0 || hero.etat === 'roulade' || hero.etat === 'touche') return;
  payer(S.enduranceRoulade);
  hero.etat = 'roulade';
  hero.t = 0;
  hero.rouladeDir = dir;
  hero.enfile = false;
}

function heroTouche(degats) {
  if (invulnerable()) return;
  hero.vie = Math.max(0, hero.vie - degats);
  hero.etat = 'touche';
  hero.t = 0;
  hero.reculDir = hero.x >= boss.x ? 1 : -1;
  hero.enfile = false;
  if (hero.vie <= 0) { jeu.etat = 'mort'; jeu.t = 0; }
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

function relancer() {
  if (jeu.etat === 'victoire' && jeu.t >= S.victoireAttenteMs) recommencer();
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
window.addEventListener('pointerup', e => { relancer(); relacher(e); });
window.addEventListener('pointercancel', relacher);

window.addEventListener('keydown', e => {
  if (['ArrowLeft', 'ArrowRight', 'Space', 'ShiftLeft', 'ShiftRight'].includes(e.code)) e.preventDefault();
  if (e.repeat) return;
  clavier.add(e.code);
  relancer();
  if (e.code === 'Space') attaquer();
  if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') rouler(direction() || hero.dir);
});
window.addEventListener('keyup', e => clavier.delete(e.code));
window.addEventListener('blur', () => { clavier.clear(); touches.clear(); });
window.addEventListener('contextmenu', e => e.preventDefault());

// ---------- Mise à jour ----------
function chevauche(a1, a2, b1, b2) { return a1 < b2 && b1 < a2; }

const heroG = () => hero.x - S.heroLargeur / 2;
const heroD = () => hero.x + S.heroLargeur / 2;

function sortirDuBoss() {
  const g = boss.x - boss.w / 2, dr = boss.x + boss.w / 2;
  if (!chevauche(heroG(), heroD(), g, dr)) return;
  hero.x = hero.x < boss.x ? g - S.heroLargeur / 2 : dr + S.heroLargeur / 2;
}

function frapperBoss() {
  const portee = S.attaquePorteeLargeurs * S.heroLargeur;
  const depart = hero.x + hero.dir * S.heroLargeur / 2;
  const fin = depart + hero.dir * portee;
  if (!chevauche(Math.min(depart, fin), Math.max(depart, fin), boss.x - boss.w / 2, boss.x + boss.w / 2)) return;
  boss.vie = Math.max(0, boss.vie - (hero.attaqueN === 2 ? S.attaque2Degats : S.attaqueDegats));
  boss.flash = gt;
  if (boss.vie <= 0) { jeu.etat = 'victoire'; jeu.t = 0; }
}

function majHero(dt) {
  hero.dir = boss.x >= hero.x ? 1 : -1;
  hero.t += dt;

  if (hero.etat === 'libre') {
    hero.x += direction() * S.vitesseMarche * dt / 1000;
  } else if (hero.etat === 'roulade') {
    hero.x += hero.rouladeDir * S.rouladeLargeurs * S.heroLargeur * dt / S.rouladeMs;
    if (hero.t >= S.rouladeMs) { hero.etat = 'libre'; hero.t = 0; }
  } else if (hero.etat === 'touche') {
    hero.x += hero.reculDir * S.coupRecuRecul * dt / S.coupRecuMs;
    if (hero.t >= S.coupRecuMs) { hero.etat = 'libre'; hero.t = 0; }
  } else {
    if (!hero.frappe && hero.t >= S.attaqueMs * S.attaqueImpactRatio) { hero.frappe = true; frapperBoss(); }
    if (hero.t >= S.attaqueMs && jeu.etat === 'combat') {
      hero.derniereAttaqueN = hero.attaqueN;
      hero.finAttaque = gt;
      hero.etat = 'libre';
      hero.t = 0;
      if (hero.enfile && hero.endurance > 0) lancerAttaque();
      hero.enfile = false;
    }
  }

  hero.x = Math.max(S.heroLargeur / 2, Math.min(largeurArene - S.heroLargeur / 2, hero.x));
  if (hero.etat !== 'roulade') sortirDuBoss();

  if (gt - hero.derniereAction >= S.enduranceRegenDelaiMs) {
    hero.endurance = Math.min(S.enduranceMax, hero.endurance + S.enduranceRegenParSeconde * dt / 1000);
  }
}

// Écart entre le bord du boss et le bord du héros, négatif s'ils se chevauchent
const ecart = () => Math.abs(hero.x - boss.x) - boss.w / 2 - S.heroLargeur / 2;

const phase2 = () => boss.vie <= S.bossVie * S.phase2Seuil;

function lancerBoss(etat) {
  boss.etat = etat;
  boss.attaque = etat;
  boss.t = 0;
  boss.applique = false;
  boss.marque = null;
}

function ouverture() {
  boss.etat = 'ouverture';
  boss.t = 0;
  boss.duree = phase2() ? S.phase2OuvertureMs : S.bossOuvertureMs;
}

function zoneFauchage() {
  const depart = boss.x + boss.dir * boss.w / 2;
  const fin = depart + boss.dir * S.fauchagePortee;
  return [Math.min(depart, fin), Math.max(depart, fin)];
}

function majBoss(dt) {
  boss.t += dt;

  if (boss.etat === 'ouverture') {
    if (boss.t >= boss.duree) boss.etat = 'marche';
  }
  if (boss.etat === 'marche') {
    boss.dir = hero.x >= boss.x ? 1 : -1;
    const e = ecart();
    if (e > S.bossDistanceSort) { boss.sortsRestants = phase2() ? S.phase2Sorts - 1 : 0; lancerBoss('sort'); }
    else if (e <= S.fauchagePortee) lancerBoss('fauchage');
    else boss.x += boss.dir * S.bossVitesse * (phase2() ? S.phase2VitesseFacteur : 1) * dt / 1000;
  } else if (boss.etat === 'fauchage') {
    if (!boss.applique && boss.t >= S.fauchageAnnonceMs) {
      boss.applique = true;
      const [g, dr] = zoneFauchage();
      if (chevauche(heroG(), heroD(), g, dr)) heroTouche(S.fauchageDegats);
    }
    if (boss.t >= S.fauchageAnnonceMs + S.fauchageZoneMs) ouverture();
  } else if (boss.etat === 'sort') {
    if (!boss.marque && boss.t >= S.sortAnnonceMs) boss.marque = { x: hero.x, t0: boss.t };
    if (boss.marque && !boss.applique && boss.t >= boss.marque.t0 + S.sortMarqueMs) {
      boss.applique = true;
      if (chevauche(heroG(), heroD(), boss.marque.x - S.sortRayon, boss.marque.x + S.sortRayon)) heroTouche(S.sortDegats);
    }
    if (boss.applique && boss.t >= boss.marque.t0 + S.sortMarqueMs + S.sortExplosionMs) {
      if (boss.sortsRestants > 0) { boss.sortsRestants--; lancerBoss('sort'); }
      else if (phase2() && Math.random() < S.phase2FauchageChance) {
        boss.dir = hero.x >= boss.x ? 1 : -1;
        lancerBoss('fauchage');
      } else ouverture();
    }
  }

  boss.x = Math.max(boss.w / 2, Math.min(largeurArene - boss.w / 2, boss.x));
}

function avancer(dt) {
  gt += dt;
  if (jeu.etat !== 'combat') {
    jeu.t += dt;
    if (jeu.etat === 'mort' && jeu.t >= S.mortMs) recommencer();
    return;
  }
  majHero(dt);
  if (jeu.etat === 'combat') majBoss(dt);
}

// ---------- Dessin ----------
function barre(x, y, largeur, part, couleur) {
  ctx.fillStyle = '#222';
  ctx.fillRect(x, y, largeur, S.barreHauteur);
  ctx.fillStyle = couleur;
  ctx.fillRect(x, y, largeur * part, S.barreHauteur);
}

function dessiner() {
  ctx.setTransform(d * k, 0, 0, d * k, 0, 0);
  ctx.fillStyle = '#0e0e12';
  ctx.fillRect(0, 0, largeurArene, S.hauteurArene);
  ctx.fillStyle = '#1b1b21';
  ctx.fillRect(0, S.solY, largeurArene, S.hauteurArene - S.solY);

  // Marque du Sort
  if (boss.etat === 'sort' && boss.marque) {
    const m = boss.marque;
    const explose = boss.applique;
    ctx.fillStyle = explose ? 'rgba(255,90,60,0.9)' : 'rgba(200,30,30,0.7)';
    if (explose) ctx.fillRect(m.x - S.sortRayon, S.solY - S.hauteurArene, S.sortRayon * 2, S.hauteurArene);
    ctx.beginPath();
    ctx.ellipse(m.x, S.solY + 14, S.sortRayon, 10, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Boss
  const annonce = (boss.etat === 'fauchage' && boss.t < S.fauchageAnnonceMs) ||
                  (boss.etat === 'sort' && boss.t < S.sortAnnonceMs);
  let couleur = '#2a2a31';
  if (annonce && Math.floor(boss.t / S.clignoteMs) % 2 === 0) couleur = '#e8761a';
  if (gt - boss.flash < S.bossFlashMs) couleur = '#d9d9d9';
  ctx.fillStyle = couleur;
  ctx.fillRect(boss.x - boss.w / 2, S.solY - boss.h, boss.w, boss.h);

  // Zone du Fauchage
  if (boss.etat === 'fauchage' && boss.t >= S.fauchageAnnonceMs) {
    const [g, dr] = zoneFauchage();
    ctx.fillStyle = 'rgba(200,30,30,0.6)';
    ctx.fillRect(g, S.solY - S.heroHauteur * 1.2, dr - g, S.heroHauteur * 1.2);
  }

  // Héros
  const roule = hero.etat === 'roulade';
  const h = roule ? S.heroHauteur * S.rouladeAplatiRatio : S.heroHauteur;
  if (hero.etat === 'attaque') {
    const portee = S.attaquePorteeLargeurs * S.heroLargeur;
    const depart = hero.x + hero.dir * S.heroLargeur / 2;
    ctx.fillStyle = 'rgba(230,230,230,0.25)';
    ctx.fillRect(Math.min(depart, depart + hero.dir * portee), S.solY - S.heroHauteur, portee, S.heroHauteur);
  }
  ctx.globalAlpha = invulnerable() ? S.rouladeAlpha : 1;
  ctx.fillStyle = '#e6e6e6';
  ctx.fillRect(hero.x - S.heroLargeur / 2, S.solY - h, S.heroLargeur, h);
  ctx.globalAlpha = 1;

  // Vie et endurance du héros, en haut à gauche
  barre(S.barreMarge, S.barreMarge, S.barreLargeur, hero.vie / S.vie, '#a33');
  barre(S.barreMarge, S.barreMarge + S.barreHauteur + S.barreEspace, S.barreLargeur, hero.endurance / S.enduranceMax, '#4a8');

  // Vie du boss, en bas, avec son nom
  const bx = (largeurArene - S.bossBarreLargeur) / 2;
  const by = S.hauteurArene - S.bossBarreBas;
  ctx.fillStyle = '#bbb';
  ctx.font = `${S.nomTaille}px Georgia, serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';
  ctx.fillText(S.bossNom, bx, by - S.barreEspace / 2);
  barre(bx, by, S.bossBarreLargeur, boss.vie / S.bossVie, '#a33');

  // Mort et victoire
  if (jeu.etat !== 'combat') {
    const mort = jeu.etat === 'mort';
    ctx.fillStyle = `rgba(0,0,0,${mort ? Math.min(1, jeu.t / S.mortMs) : 0.6})`;
    ctx.fillRect(0, 0, largeurArene, S.hauteurArene);
    ctx.fillStyle = '#ccc';
    ctx.font = `${S.texteTaille}px Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(mort ? 'Mort' : 'Victoire', largeurArene / 2, S.hauteurArene / 2);
  }
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
