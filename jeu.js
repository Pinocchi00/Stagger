(() => {
const S = SETTINGS;
const canvas = document.getElementById('jeu');
const ctx = canvas.getContext('2d');

// ---------- Arène et caméra ----------
// L'arène a une largeur fixe (S.arenaLargeur). La caméra suit le milieu du duel.
let d = 1;                // pixels de l'appareil par pixel CSS
let kui = 1;              // échelle de l'interface
let plans = [];

const boss = { x: 0, w: S.bossLargeur };
const hero = {};
const jeu = { etat: 'depart', t: 0 }; // depart, combat, mort, victoire
const cam = { x: 0, z: 1 };           // z : pixels CSS par unité
let gt = 0;               // temps de jeu, ms : n'avance pas pendant un arrêt sur image
let rt = 0;               // temps réel, ms
let arret = 0;            // arrêt sur image restant, ms
let tremble = null;       // { debut, duree, amp } en temps réel

function impact(arretMs, duree, amp) {
  arret = Math.max(arret, arretMs);
  tremble = { debut: rt, duree, amp };
}

const portrait = () => window.innerHeight > window.innerWidth;

// Zoom où les sprites tombent sur un facteur entier de pixels de l'appareil
function zoomDeBase() {
  const n = Math.max(1, Math.round(window.innerHeight * d * S.heroEcranRatio / S.heroCorpsPx));
  return n / S.echelleSprite / d;
}

function cibleCamera() {
  const W = window.innerWidth;
  const zBase = zoomDeBase();
  const zMin = W / S.arenaLargeur;
  const ecartX = Math.abs(hero.x - boss.x) + 2 * S.camBordUnites;
  return { x: (hero.x + boss.x) / 2, z: Math.max(zMin, Math.min(zBase, W / ecartX)) };
}

function ajuster() {
  d = window.devicePixelRatio || 1;
  canvas.width = Math.round(window.innerWidth * d);
  canvas.height = Math.round(window.innerHeight * d);
  kui = window.innerHeight / S.hauteurInterface;
  if (hero.x !== undefined) { const c = cibleCamera(); cam.x = c.x; cam.z = c.z; }
}

function majCamera(dt) {
  const c = cibleCamera();
  cam.x += (c.x - cam.x) * (1 - Math.exp(-S.camLisseParSeconde * dt / 1000));
  cam.z += (c.z - cam.z) * (1 - Math.exp(-S.camZoomLisseParSeconde * dt / 1000));
}

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
    attaqueId: 0,         // numéro de l'attaque en cours
    attaqueSource: null,  // qui l'a lancée : identifiant du doigt ou 'clavier'
    coutAttaque: 0,       // endurance payée pour l'attaque en cours
    fileSource: null,     // qui a demandé l'attaque enfilée
  });
  Object.assign(boss, {
    x: S.heroDepartX + S.bossDepartEcart,
    dir: -1,
    vie: S.bossVie,
    etat: 'ouverture',    // marche, fauchage, sort, ouverture, vacille
    t: 0,                 // temps passé dans l'état, ms
    duree: S.bossDebutMs, // durée de l'ouverture en cours
    variante: null,       // fauchage : normal, retarde, double. sort : sort, pluie
    prochaine: null,      // attaque choisie pendant la marche
    delaiSort: 0,         // marche avant de lancer un Sort de loin
    frappes: 0,           // coups du Fauchage déjà portés
    retourne: false,      // le double Fauchage s'est-il retourné vers le héros
    marques: [],          // marques du Sort : { x, t0, applique }
    historique: [],       // dernières attaques lancées
    posture: 0,           // en crans
    dernierCoup: -1e9,
    flash: -1e9,
  });
  jeu.etat = 'combat';
  jeu.t = 0;
  const c = cibleCamera();
  cam.x = c.x;
  cam.z = c.z;
}

window.addEventListener('resize', ajuster);
genererFond();
recommencer();
jeu.etat = 'depart';
ajuster();

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

// Retire l'endurance et rend la somme réellement payée
function payer(cout) {
  const paye = Math.min(hero.endurance, cout);
  hero.endurance -= paye;
  hero.derniereAction = gt;
  return paye;
}

function lancerAttaque(source) {
  const n = (hero.derniereAttaqueN === 1 && gt - hero.finAttaque <= S.enchainementMs) ? 2 : 1;
  hero.coutAttaque = payer(S.enduranceAttaque);
  hero.attaqueId++;
  hero.attaqueSource = source;
  jouer('attaque');
  hero.etat = 'attaque';
  hero.t = 0;
  hero.attaqueN = n;
  hero.frappe = false;
  hero.enfile = false;
}

function attaquer(source) {
  if (jeu.etat !== 'combat' || hero.endurance <= 0 || hero.etat === 'roulade' || hero.etat === 'touche') return;
  if (hero.etat === 'attaque') { hero.enfile = true; hero.fileSource = source; return; }
  lancerAttaque(source);
}

// Un glissé avant le coup annule l'attaque posée par ce doigt et rend son endurance
function annulerAttaque(source) {
  if (hero.etat === 'attaque' && hero.attaqueSource === source && !hero.frappe) {
    hero.endurance = Math.min(S.enduranceMax, hero.endurance + hero.coutAttaque);
    hero.etat = 'libre';
    hero.t = 0;
  } else if (hero.enfile && hero.fileSource === source) {
    hero.enfile = false;
  }
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

function demarrer() {
  if (jeu.etat !== 'depart' || portrait()) return false;
  jeu.etat = 'combat';
  jeu.t = 0;
  return true;
}

window.addEventListener('pointerdown', e => {
  initAudio();
  if (demarrer()) return;
  if (touches.has(e.pointerId)) return;
  const cote = e.clientX < window.innerWidth / 2 ? 'gauche' : 'droite';
  if (cote === 'gauche' && marcheTactile() !== null) return; // un seul pouce gauche
  touches.set(e.pointerId, { cote, x0: e.clientX, y0: e.clientY, x: e.clientX, fait: false });
  if (cote === 'droite' && !portrait()) attaquer(e.pointerId); // l'attaque part dès la pose du doigt
});
window.addEventListener('pointermove', e => {
  const p = touches.get(e.pointerId);
  if (!p) return;
  p.x = e.clientX;
  if (p.cote === 'droite' && !p.fait && Math.abs(p.x - p.x0) >= S.glisserMinPx) {
    p.fait = true;
    annulerAttaque(e.pointerId);
    rouler(Math.sign(p.x - p.x0));
  }
});
function relacher(e) {
  touches.delete(e.pointerId);
}
window.addEventListener('pointerup', e => { relancer(); relacher(e); });
window.addEventListener('pointercancel', relacher);

window.addEventListener('keydown', e => {
  if (['ArrowLeft', 'ArrowRight', 'Space', 'ShiftLeft', 'ShiftRight'].includes(e.code)) e.preventDefault();
  initAudio();
  if (e.repeat) return;
  clavier.add(e.code);
  if (demarrer()) return;
  relancer();
  if (e.code === 'Space') attaquer('clavier');
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
  const depart = hero.x + hero.dir * S.heroLargeur / 2;
  const fin = depart + hero.dir * S.attaquePortee;
  if (!chevauche(Math.min(depart, fin), Math.max(depart, fin), boss.x - boss.w / 2, boss.x + boss.w / 2)) return;
  const vacille = boss.etat === 'vacille';
  const degats = (hero.attaqueN === 2 ? S.attaque2Degats : S.attaqueDegats) * (vacille ? S.vacilleDegatsFacteur : 1);
  boss.vie = Math.max(0, boss.vie - degats);
  boss.flash = gt;
  boss.dernierCoup = gt;
  if (!vacille) {
    boss.posture += hero.attaqueN === 2 ? S.postureCoup2 : S.postureCoup;
    if (boss.posture >= S.postureMax) vaciller();
  }
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
      if (hero.enfile && hero.endurance > 0) lancerAttaque(hero.fileSource);
      hero.enfile = false;
    }
  }

  hero.x = Math.max(S.heroLargeur / 2, Math.min(S.arenaLargeur - S.heroLargeur / 2, hero.x));
  if (hero.etat !== 'roulade') sortirDuBoss();

  if (gt - hero.derniereAction >= S.enduranceRegenDelaiMs) {
    hero.endurance = Math.min(S.enduranceMax, hero.endurance + S.enduranceRegenParSeconde * dt / 1000);
  }
}

// Écart entre le bord du boss et le bord du héros, négatif s'ils se chevauchent
const ecart = () => Math.abs(hero.x - boss.x) - boss.w / 2 - S.heroLargeur / 2;

const phase2 = () => boss.vie <= S.bossVie * S.phase2Seuil;

// Tirage au hasard pondéré, jamais plus de S.repetitionMax fois la même attaque de suite
function choisirAttaque() {
  const h = boss.historique;
  const repete = h.length >= S.repetitionMax && h.slice(-S.repetitionMax).every(n => n === h[h.length - 1]) ? h[h.length - 1] : null;
  const choix = Object.keys(S.poids).filter(n => n !== repete && (n !== 'pluie' || phase2()));
  let tirage = Math.random() * choix.reduce((somme, n) => somme + S.poids[n], 0);
  let nom = choix[choix.length - 1];
  for (const n of choix) { tirage -= S.poids[n]; if (tirage < 0) { nom = n; break; } }
  h.push(nom);
  if (h.length > S.repetitionMax) h.shift();
  return nom;
}

function entrerMarche() {
  boss.etat = 'marche';
  boss.t = 0;
  boss.prochaine = choisirAttaque();
  boss.delaiSort = S.sortLoinMinMs + Math.random() * (S.sortLoinMaxMs - S.sortLoinMinMs);
}

function lancerBoss(nom) {
  const fauchage = nom === 'fauchage' || nom === 'retarde' || nom === 'double';
  jouer(fauchage ? 'annonceFauchage' : 'annonceSort');
  boss.etat = fauchage ? 'fauchage' : 'sort';
  boss.variante = nom === 'fauchage' ? 'normal' : nom;
  boss.t = 0;
  boss.frappes = 0;
  boss.retourne = false;
  boss.marques = [];
}

function ouverture() {
  boss.etat = 'ouverture';
  boss.t = 0;
  boss.duree = phase2() ? S.phase2OuvertureMs : S.bossOuvertureMs;
}

// Le coup du héros qui remplit la posture interrompt l'attaque en cours
function vaciller() {
  boss.etat = 'vacille';
  boss.t = 0;
  boss.posture = 0;
  boss.marques = [];
  boss.frappes = 0;
}

// Instants, depuis le début de l'attaque, où le Fauchage frappe
function tempsFrappes() {
  if (boss.variante === 'retarde') return [S.fauchageRetardeMs];
  if (boss.variante === 'double') return [S.fauchageAnnonceMs, S.fauchageAnnonceMs + S.doubleDelaiMs];
  return [S.fauchageAnnonceMs];
}

function zoneFauchage() {
  const depart = boss.x + boss.dir * boss.w / 2;
  const fin = depart + boss.dir * S.fauchagePortee;
  return [Math.min(depart, fin), Math.max(depart, fin)];
}

function majBoss(dt) {
  boss.t += dt;
  if (gt - boss.dernierCoup >= S.postureDelaiMs) {
    boss.posture = Math.max(0, boss.posture - S.postureVidageParSeconde * dt / 1000);
  }

  if (boss.etat === 'ouverture' && boss.t >= boss.duree) entrerMarche();
  if (boss.etat === 'vacille' && boss.t >= S.vacilleMs) entrerMarche();

  if (boss.etat === 'marche') {
    // Il approche toujours ; un Sort peut partir de loin ou au contact
    boss.dir = hero.x >= boss.x ? 1 : -1;
    const sortileges = boss.prochaine === 'sort' || boss.prochaine === 'pluie';
    if (ecart() <= S.fauchagePortee || (sortileges && boss.t >= boss.delaiSort)) lancerBoss(boss.prochaine);
    else boss.x += boss.dir * S.bossVitesse * (phase2() ? S.phase2VitesseFacteur : 1) * dt / 1000;
  } else if (boss.etat === 'fauchage') {
    const temps = tempsFrappes();
    while (boss.frappes < temps.length && boss.t >= temps[boss.frappes]) {
      boss.frappes++;
      jouer('fauchage');
      const [g, dr] = zoneFauchage();
      if (chevauche(heroG(), heroD(), g, dr)) heroTouche(S.fauchageDegats);
    }
    // Le double Fauchage se retourne vers le héros avant le second coup
    if (boss.variante === 'double' && !boss.retourne && boss.t >= temps[0] + S.fauchageZoneMs) {
      boss.retourne = true;
      boss.dir = hero.x >= boss.x ? 1 : -1;
    }
    if (boss.t >= temps[temps.length - 1] + S.fauchageZoneMs) ouverture();
  } else if (boss.etat === 'sort') {
    const nb = boss.variante === 'pluie' ? S.pluieMarques : 1;
    while (boss.marques.length < nb && boss.t >= S.sortAnnonceMs + boss.marques.length * S.pluieEcartMs) {
      boss.marques.push({ x: hero.x, t0: S.sortAnnonceMs + boss.marques.length * S.pluieEcartMs, applique: false });
    }
    for (const m of boss.marques) {
      if (!m.applique && boss.t >= m.t0 + S.sortMarqueMs) {
        m.applique = true;
        jouer('explosion');
        if (chevauche(heroG(), heroD(), m.x - S.sortRayon, m.x + S.sortRayon)) heroTouche(S.sortDegats);
      }
    }
    const derniere = boss.marques[boss.marques.length - 1];
    if (boss.marques.length === nb && boss.t >= derniere.t0 + S.sortMarqueMs + S.sortExplosionMs) ouverture();
  }

  boss.x = Math.max(boss.w / 2, Math.min(S.arenaLargeur - boss.w / 2, boss.x));
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
    for (let x = -marge; x < S.arenaLargeur + marge; ) {
      const w = p.largeurMin + alea() * (p.largeurMax - p.largeurMin);
      const h = p.hauteurMin + alea() * (p.hauteurMax - p.hauteurMin);
      formes.push({ x, w, h, cassure: alea() });
      x += w + alea() * p.espaceMax;
    }
    return { ...p, formes };
  });
}

// Ciel en coordonnées d'écran, puis plans et sol dans le monde
function dessinerCiel() {
  const g = ctx.createLinearGradient(0, 0, 0, window.innerHeight * S.solEcranRatio);
  g.addColorStop(0, S.fond.cielHaut);
  g.addColorStop(1, S.fond.cielBas);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
}

function dessinerPlans(cx) {
  const decalage = cx - S.arenaLargeur / 2;
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
  ctx.fillRect(-S.fond.margeParallaxe, S.solY, S.arenaLargeur + 2 * S.fond.margeParallaxe, S.hauteurInterface * 4);
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
  if (boss.etat === 'vacille') return ['boss-touche', boucle_(nbFrames('boss-touche'))];
  if (boss.etat === 'fauchage') {
    const n = nbFrames('boss-fauchage'), imp = S.fauchageFrameImpact, A = S.fauchageAnnonceMs, Z = S.fauchageZoneMs, t = boss.t;
    const coup = (debut) => imp + part(t - debut, Z, n - imp);
    if (boss.variante === 'retarde') {
      if (t < A) return ['boss-fauchage', part(t, A, imp)];
      if (t < S.fauchageRetardeMs) return ['boss-fauchage', imp - 1]; // l'élan est tenu
      return ['boss-fauchage', coup(S.fauchageRetardeMs)];
    }
    if (boss.variante === 'double') {
      const s2 = A + S.doubleDelaiMs;
      if (t < A) return ['boss-fauchage', part(t, A, imp)];
      if (t < A + Z) return ['boss-fauchage', coup(A)];
      if (t < s2) return ['boss-fauchage', part(t - A - Z, s2 - A - Z, imp)]; // second élan
      return ['boss-fauchage', coup(s2)];
    }
    if (t < A) return ['boss-fauchage', part(t, A, imp)];
    return ['boss-fauchage', coup(A)];
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
  const e = S.echelleSprite;
  ctx.save();
  ctx.translate(x, S.solY);
  if (miroir) ctx.scale(-1, 1);
  ctx.drawImage(im, f * sp.largeur, 0, sp.largeur, sp.hauteur, -pivotX * e, -sp.pivotY * e, sp.largeur * e, sp.hauteur * e);
  ctx.restore();
}

// La faux luit en blanc pendant l'élan tenu du Fauchage retardé
function dessinerLueur() {
  if (boss.etat !== 'fauchage' || boss.variante !== 'retarde') return;
  if (boss.t < S.fauchageAnnonceMs || boss.t >= S.fauchageRetardeMs) return;
  const l = S.lueurFaux, e = S.echelleSprite;
  const x = boss.x - boss.dir * l.dx * e, y = S.solY + l.dy * e;
  const pulse = 0.6 + 0.4 * Math.sin(boss.t / 1000 * Math.PI * 2 * l.pulseHz);
  const g = ctx.createRadialGradient(x, y, 0, x, y, l.rayon);
  g.addColorStop(0, `rgba(255,255,255,${l.alpha * pulse})`);
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - l.rayon, y - l.rayon, l.rayon * 2, l.rayon * 2);
}

// Arc clair qui suit la faux pendant la frappe du Fauchage
function dessinerArc() {
  if (boss.etat !== 'fauchage') return;
  const temps = tempsFrappes();
  const debut = temps.filter(x => boss.t >= x).pop();
  if (debut === undefined || boss.t >= debut + S.fauchageZoneMs) return;
  const p = Math.min(1, (boss.t - debut) / S.fauchageZoneMs);
  const rad = Math.PI / 180;
  const tete = S.arcDebutDeg + (S.arcFinDeg - S.arcDebutDeg) * p;
  const queue = Math.max(S.arcDebutDeg, tete - S.arcQueueDeg);
  const cx = boss.x, cy = S.solY - S.arcCentreHauteur;
  const rayon = S.fauchagePortee + boss.w / 2;
  ctx.save();
  ctx.beginPath();
  ctx.rect(-S.fond.margeParallaxe, -S.hauteurInterface * 4, S.arenaLargeur + 2 * S.fond.margeParallaxe, S.hauteurInterface * 4 + S.solY);
  ctx.clip();
  ctx.strokeStyle = S.arcCouleur;
  ctx.lineCap = 'round';
  const n = S.arcSegments;
  for (let i = 0; i < n; i++) {
    const a0 = queue + (tete - queue) * i / n, a1 = queue + (tete - queue) * (i + 1) / n;
    const u = (i + 1) / n; // 0 à la queue, 1 à la tête
    ctx.globalAlpha = u;
    ctx.lineWidth = S.arcEpaisseur * u;
    ctx.beginPath();
    ctx.moveTo(cx + boss.dir * rayon * Math.cos(a0 * rad), cy + S.arcRayonVertical * Math.sin(a0 * rad));
    ctx.lineTo(cx + boss.dir * rayon * Math.cos(a1 * rad), cy + S.arcRayonVertical * Math.sin(a1 * rad));
    ctx.stroke();
  }
  ctx.restore();
}

// Cercle de runes au sol, qui pulse de plus en plus vite jusqu'à l'explosion
function dessinerRunes(m) {
  const t = boss.t - m.t0;
  const frac = Math.min(1, t / S.sortMarqueMs);
  const explose = m.applique;
  const pulse = explose ? 1 : 0.5 + 0.5 * Math.sin(t / 1000 * Math.PI * 2 * (S.runesPulseHz + S.runesPulseAccel * frac));
  const rx = S.sortRayon * (1 + 0.06 * pulse), ry = rx * S.runesAplat;
  const couleur = explose ? S.runesCouleurVive : S.runesCouleur;
  ctx.save();
  ctx.translate(m.x, S.solY);
  ctx.strokeStyle = couleur;
  ctx.fillStyle = couleur;
  ctx.lineWidth = S.runesEpaisseur;
  ctx.globalAlpha = 0.45 + 0.55 * pulse;
  ctx.beginPath();
  ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(0, 0, rx * 0.72, ry * 0.72, 0, 0, Math.PI * 2);
  ctx.stroke();
  if (explose) {
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  const tour = t / 1000 * S.runesTourParSeconde * Math.PI * 2;
  for (let i = 0; i < S.runesNombre; i++) {
    const a = tour + i * Math.PI * 2 / S.runesNombre;
    const x = Math.cos(a) * rx * 0.86, y = Math.sin(a) * ry * 0.86;
    const u = S.runesTaille;
    ctx.beginPath();
    if (i % 3 === 0) { ctx.moveTo(x, y - u * 0.5); ctx.lineTo(x, y + u * 0.5); }
    else if (i % 3 === 1) { ctx.moveTo(x - u * 0.4, y - u * 0.4); ctx.lineTo(x, y + u * 0.4); ctx.lineTo(x + u * 0.4, y - u * 0.4); }
    else { ctx.moveTo(x - u * 0.4, y); ctx.lineTo(x + u * 0.4, y); ctx.moveTo(x, y - u * 0.4); ctx.lineTo(x, y + u * 0.2); }
    ctx.stroke();
  }
  ctx.restore();
}

function texteCentre(texte, taille) {
  ctx.fillStyle = '#ccc';
  ctx.font = `${taille}px Georgia, serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(texte, window.innerWidth / 2, window.innerHeight / 2);
}

function dessiner() {
  const W = window.innerWidth, H = window.innerHeight;
  ctx.setTransform(d, 0, 0, d, 0, 0);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  if (portrait()) {
    texteCentre('Tourne ton téléphone', Math.min(S.texteTaille * kui, W * 0.09));
    return;
  }
  dessinerCiel();
  if (!pret()) return;

  // Monde, vu par la caméra
  const z = cam.z;
  const demi = W / z / 2;
  const cx = S.arenaLargeur <= demi * 2 ? S.arenaLargeur / 2 : Math.max(demi, Math.min(S.arenaLargeur - demi, cam.x));
  ctx.save();
  ctx.setTransform(d * z, 0, 0, d * z, d * (W / 2 - cx * z), d * (H * S.solEcranRatio - S.solY * z));
  if (tremble && rt - tremble.debut < tremble.duree) {
    const a = tremble.amp * (1 - (rt - tremble.debut) / tremble.duree);
    ctx.translate((Math.random() * 2 - 1) * a, (Math.random() * 2 - 1) * a);
  }
  ctx.imageSmoothingEnabled = false;
  dessinerPlans(cx);

  for (const m of boss.marques) {
    dessinerRunes(m);
    const total = S.sortMarqueMs + S.sortExplosionMs;
    const [im, n] = anim('boss-sort');
    const f = Math.max(0, Math.min(n - 1, Math.floor((boss.t - m.t0) / total * n)));
    dessinerSprite(im, f, m.x, false, S.bossSprite, S.sortPivotX);
  }

  const [nomB, fb] = frameBoss();
  dessinerSprite(images[nomB], fb, boss.x, boss.dir > 0, S.bossSprite);
  dessinerLueur();
  dessinerArc();

  ctx.globalAlpha = invulnerable() ? S.rouladeAlpha : 1;
  const [nomH, fh] = frameHero();
  dessinerSprite(images[nomH], fh, hero.x, hero.etat === 'roulade' ? hero.rouladeDir < 0 : hero.dir < 0, S.heroSprite);
  ctx.globalAlpha = 1;
  ctx.restore();

  // Interface, en unités de référence
  ctx.setTransform(d * kui, 0, 0, d * kui, 0, 0);
  const wi = W / kui, hi = H / kui;
  barre(S.barreMarge, S.barreMarge, S.barreLargeur, hero.vie / S.vie, '#a33');
  barre(S.barreMarge, S.barreMarge + S.barreHauteur + S.barreEspace, S.barreLargeur, hero.endurance / S.enduranceMax, '#4a8');

  const bx = (wi - S.bossBarreLargeur) / 2;
  const by = hi - S.bossBarreBas;
  ctx.fillStyle = '#bbb';
  ctx.font = `${S.nomTaille}px Georgia, serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';
  ctx.fillText(S.bossNom, bx, by - S.barreEspace / 2);
  barre(bx, by, S.bossBarreLargeur, boss.vie / S.bossVie, '#a33');
  ctx.fillStyle = S.postureCouleur;
  ctx.fillRect(bx, by + S.barreHauteur + S.barreEspace / 2, S.bossBarreLargeur * Math.min(1, boss.posture / S.postureMax), S.postureHauteur);

  // Départ, mort et victoire
  if (jeu.etat !== 'combat') {
    const mort = jeu.etat === 'mort';
    ctx.fillStyle = `rgba(0,0,0,${mort ? Math.min(1, jeu.t / S.mortMs) : 0.6})`;
    ctx.fillRect(0, 0, wi, hi);
    ctx.setTransform(d, 0, 0, d, 0, 0);
    texteCentre(jeu.etat === 'depart' ? 'Touche pour commencer' : mort ? 'Mort' : 'Victoire', S.texteTaille * kui);
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
  if (!portrait()) {
    rt += dt;
    avancer(dt);
    majCamera(dt);
  }
  dessiner();
}
requestAnimationFrame(boucle);
})();
