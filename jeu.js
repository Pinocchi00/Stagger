(() => {
const S = SETTINGS;
const canvas = document.getElementById('jeu');
const ctx = canvas.getContext('2d');

// ---------- Arène ----------
// L'arène est large comme l'écran : la hauteur est fixe (S.hauteurArene), la largeur suit l'écran.
let d = 1;
let k = 1;
let largeurArene = 0;
let plans = [];

const boss = { x: 0, w: S.bossLargeur, h: S.heroHauteur * S.bossHauteurHeros };
const hero = {};
const jeu = { etat: 'combat', t: 0 }; // combat, mort, victoire
let gt = 0;               // temps de jeu, ms : n'avance pas pendant un arrêt sur image
let rt = 0;               // temps réel, ms
let arret = 0;            // arrêt sur image restant, ms
let tremble = null;       // { debut, duree, amp } en temps réel

function impact(arretMs, duree, amp) {
  arret = Math.max(arret, arretMs);
  tremble = { debut: rt, duree, amp };
}

function ajuster() {
  d = window.devicePixelRatio || 1;
  canvas.width = Math.round(window.innerWidth * d);
  canvas.height = Math.round(window.innerHeight * d);
  k = window.innerHeight / S.hauteurArene;
  largeurArene = window.innerWidth / k;
  genererFond();
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

// ---------- Son ----------
// Tous les sons sont produits par le code. Ils se débloquent au premier toucher.
let ac = null;
let tampon = null;
function initAudio() {
  if (ac) return;
  try {
    ac = new (window.AudioContext || window.webkitAudioContext)();
    const n = ac.sampleRate * 2;
    tampon = ac.createBuffer(1, n, ac.sampleRate);
    const data = tampon.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1;
  } catch (e) { ac = null; }
  if (ac && ac.resume) ac.resume();
}

// Un son est une liste de composants : un oscillateur (glissant de f0 à f1) ou un bruit filtré
function jouer(nom) {
  if (!ac) return;
  const t0 = ac.currentTime;
  for (const c of S.sons[nom]) {
    const t = t0 + (c.retard || 0);
    const g = ac.createGain();
    g.gain.setValueAtTime(c.volume * S.sonVolume, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + c.duree);
    let src;
    if (c.bruit) {
      src = ac.createBufferSource();
      src.buffer = tampon;
      const f = ac.createBiquadFilter();
      f.type = c.filtre || 'lowpass';
      f.frequency.value = c.hz;
      src.connect(f).connect(g);
    } else {
      src = ac.createOscillator();
      src.type = c.forme;
      src.frequency.setValueAtTime(c.f0, t);
      if (c.f1) src.frequency.exponentialRampToValueAtTime(c.f1, t + c.duree);
      src.connect(g);
    }
    g.connect(ac.destination);
    src.start(t);
    src.stop(t + c.duree);
  }
}

// ---------- Héros ----------
const invulnerable = () => hero.etat === 'roulade' && hero.t < S.rouladeInvulnerableMs;

function payer(cout) {
  hero.endurance = Math.max(0, hero.endurance - cout);
  hero.derniereAction = gt;
}

function lancerAttaque() {
  const n = (hero.derniereAttaqueN === 1 && gt - hero.finAttaque <= S.enchainementMs) ? 2 : 1;
  payer(S.enduranceAttaque);
  jouer('attaque');
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
  jouer('roulade');
  hero.etat = 'roulade';
  hero.t = 0;
  hero.rouladeDir = dir;
  hero.enfile = false;
}

function heroTouche(degats) {
  if (invulnerable()) return;
  hero.vie = Math.max(0, hero.vie - degats);
  impact(S.arretCoupRecuMs, S.tremblementCoupRecuMs, S.tremblementCoupRecuPx);
  jouer('coupRecu');
  hero.etat = 'touche';
  hero.t = 0;
  hero.reculDir = hero.x >= boss.x ? 1 : -1;
  hero.enfile = false;
  if (hero.vie <= 0) { jeu.etat = 'mort'; jeu.t = 0; jouer('mort'); }
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
  initAudio();
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
  initAudio();
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
  impact(S.arretCoupDonneMs, S.tremblementCoupDonneMs, S.tremblementCoupDonnePx);
  jouer('coupDonne');
  if (boss.vie <= 0) { jeu.etat = 'victoire'; jeu.t = 0; jouer('victoire'); }
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
  jouer(etat === 'sort' ? 'annonceSort' : 'annonceFauchage');
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
      jouer('fauchage');
      const [g, dr] = zoneFauchage();
      if (chevauche(heroG(), heroD(), g, dr)) heroTouche(S.fauchageDegats);
    }
    if (boss.t >= S.fauchageAnnonceMs + S.fauchageZoneMs) ouverture();
  } else if (boss.etat === 'sort') {
    if (!boss.marque && boss.t >= S.sortAnnonceMs) boss.marque = { x: hero.x, t0: boss.t };
    if (boss.marque && !boss.applique && boss.t >= boss.marque.t0 + S.sortMarqueMs) {
      boss.applique = true;
      jouer('explosion');
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
  if (arret > 0) { arret -= dt; return; }
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
// ---------- Fond ----------
// Plusieurs plans sombres, dessinés par le code. Les plus lointains bougent le moins quand le héros marche.
function genererFond() {
  let graine = S.fond.graine;
  const alea = () => { graine = (graine + 0x6D2B79F5) | 0; let t = Math.imul(graine ^ (graine >>> 15), 1 | graine); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const marge = S.fond.margeParallaxe;
  plans = S.fond.plans.map(p => {
    const formes = [];
    for (let x = -marge; x < largeurArene + marge; ) {
      const w = p.largeurMin + alea() * (p.largeurMax - p.largeurMin);
      const h = p.hauteurMin + alea() * (p.hauteurMax - p.hauteurMin);
      formes.push({ x, w, h, cassure: alea() });
      x += w + alea() * p.espaceMax;
    }
    return { ...p, formes };
  });
}

function dessinerFond() {
  const g = ctx.createLinearGradient(0, 0, 0, S.solY);
  g.addColorStop(0, S.fond.cielHaut);
  g.addColorStop(1, S.fond.cielBas);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, largeurArene, S.hauteurArene);
  const decalage = hero.x - largeurArene / 2;
  for (const p of plans) {
    ctx.fillStyle = p.couleur;
    const dx = -decalage * p.parallaxe;
    for (const f of p.formes) {
      const x = f.x + dx, base = S.solY;
      ctx.beginPath();
      if (p.type === 'pics') {
        ctx.moveTo(x, base);
        ctx.lineTo(x + f.w * f.cassure, base - f.h);
        ctx.lineTo(x + f.w, base);
      } else {
        // colonne dont le sommet est brisé
        ctx.moveTo(x, base);
        ctx.lineTo(x, base - f.h);
        ctx.lineTo(x + f.w * f.cassure, base - f.h * (1 - p.cassureRatio));
        ctx.lineTo(x + f.w, base - f.h);
        ctx.lineTo(x + f.w, base);
      }
      ctx.closePath();
      ctx.fill();
    }
  }
  ctx.fillStyle = S.fond.sol;
  ctx.fillRect(0, S.solY, largeurArene, S.hauteurArene - S.solY);
}

function barre(x, y, largeur, part, couleur) {
  ctx.fillStyle = '#222';
  ctx.fillRect(x, y, largeur, S.barreHauteur);
  ctx.fillStyle = couleur;
  ctx.fillRect(x, y, largeur * part, S.barreHauteur);
}

// ---------- Sprites ----------
const noms = ['heros-attente', 'heros-course', 'heros-roulade', 'heros-attaque1', 'heros-attaque2', 'heros-touche', 'heros-mort',
  'boss-attente', 'boss-marche', 'boss-fauchage', 'boss-incantation', 'boss-sort', 'boss-touche', 'boss-mort'];
const images = {};
let chargees = 0;
for (const nom of noms) {
  const im = new Image();
  im.onload = () => { chargees++; };
  im.src = `images/${nom}.png`;
  images[nom] = im;
}
const pret = () => chargees === noms.length;

// Image et nombre de vignettes d'une planche
function anim(nom) {
  const im = images[nom];
  const fl = nom.startsWith('heros') ? S.heroSprite.largeur : S.bossSprite.largeur;
  return [im, Math.round(im.width / fl)];
}
const boucle_ = (n) => Math.floor(gt * S.animFps / 1000) % n;
const part = (t, duree, n) => Math.max(0, Math.min(n - 1, Math.floor(t / duree * n)));
const nbFrames = (nom) => anim(nom)[1];

function frameHero() {
  if (jeu.etat === 'mort') return ['heros-mort', part(jeu.t, S.mortMs, nbFrames('heros-mort'))];
  if (hero.etat === 'roulade') return ['heros-roulade', part(hero.t, S.rouladeMs, nbFrames('heros-roulade'))];
  if (hero.etat === 'attaque') {
    const nom = hero.attaqueN === 2 ? 'heros-attaque2' : 'heros-attaque1';
    return [nom, part(hero.t, S.attaqueMs, nbFrames(nom))];
  }
  if (hero.etat === 'touche') return ['heros-touche', 0];
  const nom = jeu.etat === 'combat' && direction() !== 0 ? 'heros-course' : 'heros-attente';
  return [nom, boucle_(nbFrames(nom))];
}

function frameBoss() {
  if (jeu.etat === 'victoire') return ['boss-mort', part(jeu.t, S.bossMortMs, nbFrames('boss-mort'))];
  if (boss.etat === 'fauchage') {
    const n = nbFrames('boss-fauchage'), imp = S.fauchageFrameImpact;
    if (boss.t < S.fauchageAnnonceMs) return ['boss-fauchage', part(boss.t, S.fauchageAnnonceMs, imp)];
    return ['boss-fauchage', imp + part(boss.t - S.fauchageAnnonceMs, S.fauchageZoneMs, n - imp)];
  }
  if (boss.etat === 'sort') {
    const n = nbFrames('boss-incantation');
    return ['boss-incantation', part(boss.t, S.sortAnnonceMs, n)];
  }
  if (gt - boss.flash < S.bossFlashMs) return ['boss-touche', part(gt - boss.flash, S.bossFlashMs, nbFrames('boss-touche'))];
  if (boss.etat === 'marche') return ['boss-marche', boucle_(nbFrames('boss-marche'))];
  return ['boss-attente', boucle_(nbFrames('boss-attente'))];
}

// Dessine la vignette f d'une planche, les pieds posés sur le sol
function dessinerSprite(im, f, x, miroir, sp, pivotX = sp.pivotX) {
  const e = sp.echelle;
  ctx.save();
  ctx.translate(x, S.solY);
  if (miroir) ctx.scale(-1, 1);
  ctx.drawImage(im, f * sp.largeur, 0, sp.largeur, sp.hauteur, -pivotX * e, -sp.pivotY * e, sp.largeur * e, sp.hauteur * e);
  ctx.restore();
}

function dessiner() {
  ctx.setTransform(d * k, 0, 0, d * k, 0, 0);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, largeurArene, S.hauteurArene);
  ctx.save();
  if (tremble && rt - tremble.debut < tremble.duree) {
    const a = tremble.amp * (1 - (rt - tremble.debut) / tremble.duree);
    ctx.translate((Math.random() * 2 - 1) * a, (Math.random() * 2 - 1) * a);
  }
  dessinerFond();
  if (!pret()) { ctx.restore(); return; }
  ctx.imageSmoothingEnabled = false;

  // Marque du Sort
  if (boss.etat === 'sort' && boss.marque) {
    const m = boss.marque;
    const explose = boss.applique;
    ctx.fillStyle = explose ? 'rgba(255,90,60,0.9)' : 'rgba(200,30,30,0.7)';
    ctx.beginPath();
    ctx.ellipse(m.x, S.solY + 14, S.sortRayon, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    const total = S.sortMarqueMs + S.sortExplosionMs;
    const [im, n] = anim('boss-sort');
    const f = Math.min(n - 1, Math.floor((boss.t - m.t0) / total * n));
    dessinerSprite(im, f, m.x, false, S.bossSprite, S.sortPivotX);
  }

  // Boss
  {
    const [nom, f] = frameBoss();
    dessinerSprite(images[nom], f, boss.x, boss.dir > 0, S.bossSprite);
  }

  // Zone du Fauchage
  if (boss.etat === 'fauchage' && boss.t >= S.fauchageAnnonceMs) {
    const [g, dr] = zoneFauchage();
    ctx.fillStyle = 'rgba(200,30,30,0.6)';
    ctx.fillRect(g, S.solY - S.heroHauteur * 1.2, dr - g, S.heroHauteur * 1.2);
  }

  // Héros
  if (hero.etat === 'attaque') {
    const portee = S.attaquePorteeLargeurs * S.heroLargeur;
    const depart = hero.x + hero.dir * S.heroLargeur / 2;
    ctx.fillStyle = 'rgba(230,230,230,0.25)';
    ctx.fillRect(Math.min(depart, depart + hero.dir * portee), S.solY - S.heroHauteur, portee, S.heroHauteur);
  }
  ctx.globalAlpha = invulnerable() ? S.rouladeAlpha : 1;
  {
    const [nom, f] = frameHero();
    const versGauche = hero.etat === 'roulade' ? hero.rouladeDir < 0 : hero.dir < 0;
    dessinerSprite(images[nom], f, hero.x, versGauche, S.heroSprite);
  }
  ctx.globalAlpha = 1;

  ctx.restore();

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
  rt += dt;
  avancer(dt);
  dessiner();
}
requestAnimationFrame(boucle);
})();
