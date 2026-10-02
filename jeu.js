(() => {
const S = SETTINGS;
const canvas = document.getElementById('jeu');
const ctx = canvas.getContext('2d');

// ---------- Arène et caméra ----------
// L'arène a une largeur fixe (S.arenaLargeur). La caméra suit le milieu du duel.
let d = 1;                // pixels de l'appareil par pixel CSS
let kui = 1;              // échelle de l'interface
let decor = null;         // formes du décor, tirées une fois
let cendres = [];         // cendres, ou braises en phase 2, dans l'image
let braises = [];         // braises qui montent des flammes : { x, y, vx, vy, t0 }
let souffles = [];        // buée du héros essoufflé : { x, y, vx, vy, t0 }
let fumees = [];          // fumée noire au-dessus des flammes : { x, y, vx, vy, t0 }
let eclair = -1e9;        // instant du dernier éclair, en temps réel

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
  genererCendres();
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
    paradeAt: -1e9,       // instant du toucher de parade
    finParade: -1e9,
    reculMs: S.coupRecuMs,
    reculDist: S.coupRecuRecul,
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
genererDecor();
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
  if (jeu.etat !== 'combat' || hero.endurance <= 0 || hero.etat === 'roulade' || hero.etat === 'touche' || hero.etat === 'parade') return;
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
  if (jeu.etat !== 'combat' || hero.endurance <= 0 || hero.etat === 'roulade' || hero.etat === 'touche' || hero.etat === 'parade') return;
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
  hero.reculMs = S.coupRecuMs;
  hero.reculDist = S.coupRecuRecul;
  hero.enfile = false;
  if (hero.vie <= 0) { jeu.etat = 'mort'; jeu.t = 0; jouer('mort'); }
}

// ---- Parade ----
let blanc = null;         // dernier impact de parade : { debut, type, x, y, etoile, lignes }

function parer() {
  if (jeu.etat !== 'combat' || hero.endurance <= 0) return;
  if (hero.etat !== 'libre' && hero.etat !== 'attaque') return;
  if (gt - hero.finParade < S.paradeRecupMs) return;
  payer(S.enduranceParade);
  hero.etat = 'parade';
  hero.t = 0;
  hero.paradeAt = gt;
  hero.enfile = false;
}

// Le coup du boss est-il paré ? Le toucher doit tomber dans les dernières S.paradeSimpleMs avant l'impact
function resultatParade() {
  if (hero.etat !== 'parade') return null;
  const avant = gt - hero.paradeAt;
  if (avant > S.paradeSimpleMs) return null;
  return avant <= S.paradeParfaiteMs ? 'parfaite' : 'simple';
}

function creerImpact(type) {
  const B = S.impactBlanc;
  const pointes = type === 'parfaite' ? B.etoilePointes : B.simplePointes;
  blanc = {
    debut: rt,
    type,
    x: hero.x + hero.dir * S.heroLargeur * S.contactX,
    y: S.solY - S.heroHauteur * S.contactY,
    etoile: Array.from({ length: pointes * 2 }, () => 0.8 + Math.random() * 0.4),
    lignes: Array.from({ length: type === 'parfaite' ? B.lignes : B.etincelles }, () => [Math.random() * Math.PI * 2, Math.random()]),
  };
}

function heroParade(type) {
  creerImpact(type);
  hero.finParade = gt;
  hero.t = 0;
  if (type === 'parfaite') {
    hero.etat = 'libre';
    boss.dernierCoup = gt;
    boss.posture += S.postureParadeParfaite;
    if (boss.posture >= S.postureMax) vaciller();
    impact(S.arretParadeParfaiteMs, S.tremblementParadeParfaiteMs, S.tremblementParadeParfaitePx);
    jouer('paradeParfaite');
  } else {
    payer(S.enduranceParadeSimple);
    hero.etat = 'touche';
    hero.reculDir = hero.x >= boss.x ? 1 : -1;
    hero.reculMs = S.paradeSimpleReculMs;
    hero.reculDist = S.paradeSimpleRecul;
    impact(S.arretParadeSimpleMs, S.tremblementParadeSimpleMs, S.tremblementParadeSimplePx);
    jouer('paradeSimple');
  }
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

// Plein écran et écran à l'horizontale, demandés au premier geste : les navigateurs l'exigent.
// (Sur iPhone, le navigateur ne le permet pas : il faut ajouter le jeu à l'écran d'accueil.)
let essaisPleinEcran = 0;
function pleinEcran() {
  if (essaisPleinEcran >= 2 || document.fullscreenElement || document.webkitFullscreenElement) return;
  const el = document.documentElement;
  const demande = el.requestFullscreen || el.webkitRequestFullscreen;
  if (!demande) return;
  essaisPleinEcran++;
  Promise.resolve(demande.call(el))
    .then(() => (screen.orientation && screen.orientation.lock ? screen.orientation.lock('landscape') : null))
    .catch(() => {});
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
  touches.set(e.pointerId, { cote, x0: e.clientX, y0: e.clientY, t0: e.timeStamp, x: e.clientX, depl: 0, fait: false });
  if (cote === 'droite' && !portrait()) attaquer(e.pointerId); // l'attaque part dès la pose du doigt
});
window.addEventListener('pointermove', e => {
  const p = touches.get(e.pointerId);
  if (!p) return;
  p.x = e.clientX;
  p.depl = Math.max(p.depl, Math.abs(p.x - p.x0));
  if (p.cote === 'droite' && !p.fait && Math.abs(p.x - p.x0) >= S.glisserMinPx) {
    p.fait = true;
    annulerAttaque(e.pointerId);
    rouler(Math.sign(p.x - p.x0));
  }
});
function relacher(e) {
  const p = touches.get(e.pointerId);
  touches.delete(e.pointerId);
  // Un toucher bref et immobile à gauche est une parade
  if (p && e.type === 'pointerup' && p.cote === 'gauche' && p.depl < S.zoneMortePx && e.timeStamp - p.t0 <= S.paradeToucherMaxMs) parer();
}
window.addEventListener('pointerup', e => { pleinEcran(); relancer(); relacher(e); });
window.addEventListener('pointercancel', relacher);

window.addEventListener('keydown', e => {
  if (['ArrowLeft', 'ArrowRight', 'Space', 'ShiftLeft', 'ShiftRight', 'KeyX'].includes(e.code)) e.preventDefault();
  initAudio();
  pleinEcran();
  if (e.repeat) return;
  clavier.add(e.code);
  if (demarrer()) return;
  relancer();
  if (e.code === 'Space') attaquer('clavier');
  if (e.code === 'KeyX') parer();
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
    hero.x += hero.reculDir * hero.reculDist * dt / hero.reculMs;
    if (hero.t >= hero.reculMs) { hero.etat = 'libre'; hero.t = 0; }
  } else if (hero.etat === 'parade') {
    if (hero.t >= S.paradeMs) { hero.etat = 'libre'; hero.t = 0; hero.finParade = gt; }
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
      if (chevauche(heroG(), heroD(), g, dr)) {
        const parade = resultatParade();
        if (parade) heroParade(parade);
        else heroTouche(S.fauchageDegats);
      }
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
        eclair = rt;
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
// ---------- Décor ----------
// Ruines d'un temple de veilleurs, la nuit : tout est dessiné par le code, plan par plan.

function rng(graine) {
  let g = graine;
  return () => {
    g = (g + 0x6D2B79F5) | 0;
    let t = Math.imul(g ^ (g >>> 15), 1 | g);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function genererDecor() {
  const D = S.decor, a = rng(D.graine);
  const tire = (p) => p[0] + a() * (p[1] - p[0]);
  const x0 = -D.marge, x1 = S.arenaLargeur + D.marge;
  const rangee = (c) => {
    const liste = [];
    for (let x = x0; x < x1; ) {
      const e = { x, w: tire(c.largeur), h: tire(c.hauteur), casse: a() < c.casseProba ? a() : -1, arc: a() < c.arcProba };
      liste.push(e);
      x += e.w + tire(c.ecart);
    }
    return liste;
  };
  const P = D.pres, pres = [];
  for (let x = x0; x < x1; ) {
    const t = a();
    if (t < P.statueProba) {
      pres.push({ type: 'statue', x, w: P.statueTaille * 0.6 });
      x += P.statueTaille * 0.6;
    } else if (t < P.statueProba + P.tombeProba) {
      const w = tire(P.tombeLargeur);
      pres.push({ type: 'tombe', x, w, h: tire(P.tombeHauteur) });
      x += w;
    } else {
      pres.push({ type: 'grille', x, w: P.grilleLargeur });
      x += P.grilleLargeur;
    }
    x += tire(P.ecart);
  }
  const fissures = [];
  for (let i = 0; i < D.sol.fissures; i++) {
    const pts = [];
    let px = x0 + a() * (x1 - x0), py = 8 + a() * 110;
    for (let k = 0; k < 4; k++) { pts.push([px, py]); px += (a() - 0.5) * D.sol.fissureLongueur; py += a() * 14; }
    fissures.push(pts);
  }
  decor = { lointain: rangee(D.ruine), colonnes: rangee(D.colonnes), pres, fissures };
}

function genererCendres() {
  cendres = [];
  for (let i = 0; i < S.decor.cendres.nombre; i++) {
    cendres.push({ x: Math.random() * window.innerWidth, y: Math.random() * window.innerHeight, v: 0.5 + Math.random(), p: Math.random() * 6.28 });
  }
}

// ---- Flammes et queues de Grimalkin ----
function intensiteFlammes() {
  const Q = S.queues;
  let f = phase2() ? Q.phase2Facteur : 1;
  if (boss.etat === 'vacille') f *= Q.vacilleFacteur;
  if (jeu.etat === 'victoire') f *= Math.max(0, 1 - jeu.t / S.bossMortMs);
  return f;
}

// Points de chaque queue, du dos du boss jusqu'à la flamme
function geometrieQueues() {
  const Q = S.queues, e = S.echelleSprite, t = rt / 1000;
  const bx = boss.x - boss.dir * Q.baseDx * e, by = S.solY + Q.baseDy * e;
  const queues = [];
  for (let i = 0; i < Q.nombre; i++) {
    const ang = Q.angles[i] * Math.PI / 180;
    const vx = -boss.dir * Math.cos(ang), vy = -Math.sin(ang);
    const L = Q.longueur * (1 + Q.longueurVariation * (((i * 7) % 5) / 2 - 1));
    const pts = [];
    for (let k = 0; k <= Q.segments; k++) {
      const s = k / Q.segments;
      const o = Math.sin(t * Math.PI * 2 * Q.ondulationHz - s * 3.2 + i * 1.7) * Q.ondulation * s;
      pts.push([bx + vx * L * s - vy * o, by + vy * L * s + vx * o]);
    }
    queues.push(pts);
  }
  return queues;
}

// Flamme sombre et déchiquetée : plusieurs langues qui se tordent, du rouge noir à l'or pâle
function dessinerFlamme(x, y, taille, graine) {
  const F = S.queues.flamme, t = rt / 1000;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const R = taille * F.halo;
  const g = ctx.createRadialGradient(x, y, 0, x, y, R);
  g.addColorStop(0, `rgba(${F.haloCouleur},${F.haloAlpha})`);
  g.addColorStop(1, `rgba(${F.haloCouleur},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(x - R, y - R, R * 2, R * 2);
  ctx.restore();
  F.couches.forEach((couleur, c) => {
    const echelle = 1 - c * 0.24;
    ctx.fillStyle = couleur;
    for (let i = 0; i < F.langues; i++) {
      const u = i / (F.langues - 1) - 0.5;                   // -0.5 à 0.5 : position de la langue
      const graineI = graine * 3.1 + i * 1.9 + c * 0.7;
      const tremble = Math.sin(t * Math.PI * 2 * F.scintillementHz + graineI);
      const h = taille * echelle * (1.15 - Math.abs(u) * 0.9) * (1 + 0.28 * tremble);
      const cx = x + u * taille * 0.9 * echelle + Math.sin(t * 7 + graineI) * taille * 0.1;
      const pointe = cx + Math.sin(t * Math.PI * 2 * F.scintillementHz * 0.6 + graineI) * taille * 0.3 + u * taille * 0.5;
      const w = taille * F.largeur * echelle;
      ctx.beginPath();
      ctx.moveTo(cx - w, y);
      ctx.quadraticCurveTo(cx - w * 0.9, y - h * 0.5, pointe, y - h);
      ctx.quadraticCurveTo(cx + w * 0.8, y - h * 0.45, cx + w, y);
      ctx.quadraticCurveTo(cx, y + w * 0.5, cx - w, y);
      ctx.fill();
    }
  });
}

function dessinerQueues() {
  const Q = S.queues, f = intensiteFlammes();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  geometrieQueues().forEach((pts, i) => {
    const n = pts.length - 1;
    // échine carbonisée
    for (let k = 1; k <= n; k++) {
      const s = k / n;
      ctx.strokeStyle = Q.couleur;
      ctx.lineWidth = Q.epaisseur * (1 - 0.62 * s);
      ctx.beginPath();
      ctx.moveTo(pts[k - 1][0], pts[k - 1][1]);
      ctx.lineTo(pts[k][0], pts[k][1]);
      ctx.stroke();
    }
    // vertèbres, de plus en plus fines
    for (let k = 1; k < n; k++) {
      const s = k / n;
      const dx = pts[k + 1][0] - pts[k - 1][0], dy = pts[k + 1][1] - pts[k - 1][1];
      ctx.fillStyle = Q.os;
      ctx.strokeStyle = Q.osContour;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(pts[k][0], pts[k][1], Q.vertebre * (1 - 0.55 * s), Q.vertebre * (1 - 0.55 * s) * 0.6, Math.atan2(dy, dx), 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    // la braise court dans l'échine, vers la flamme
    ctx.strokeStyle = `rgba(${Q.braiseFissure},${0.75 * f})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    const debut = Math.floor(n * Q.braiseFissureDebut);
    ctx.moveTo(pts[debut][0], pts[debut][1]);
    for (let k = debut + 1; k <= n; k++) ctx.lineTo(pts[k][0], pts[k][1]);
    ctx.stroke();
    const bout = pts[n];
    if (f > 0.02) dessinerFlamme(bout[0], bout[1], Q.flamme.taille * f, i);
  });
}

// ---- Particules, mises à jour à chaque image ----
function majEffets(dt) {
  const Q = S.queues, G = S.signaux, c = S.decor.cendres, b = S.decor.braises;
  const vent = phase2() ? b.vxFacteur : 1, chute = phase2() ? b.vyFacteur : 1;
  const W = window.innerWidth, H = window.innerHeight;
  for (const p of cendres) {
    p.x += (c.vx * vent * p.v + Math.sin(rt / 900 + p.p) * c.vent) * dt / 1000 * kui;
    p.y += c.vy * chute * p.v * dt / 1000 * kui;
    if (p.x > W) p.x -= W;
    if (p.x < 0) p.x += W;
    if (p.y > H) { p.y -= H; p.x = Math.random() * W; }
  }

  const f = intensiteFlammes();
  if (jeu.etat !== 'depart' && f > 0.05) {
    for (const pts of geometrieQueues()) {
      if (Math.random() < Q.braisesParSeconde * f * dt / 1000 && braises.length < Q.braisesMax) {
        const bout = pts[pts.length - 1];
        braises.push({ x: bout[0], y: bout[1], vx: (Math.random() - 0.5) * Q.braiseVitesse, vy: -Q.braiseVitesse * (0.5 + Math.random()), t0: rt });
      }
      if (Math.random() < Q.fumeeParSeconde * f * dt / 1000 && fumees.length < Q.fumeeMax) {
        const bout = pts[pts.length - 1];
        fumees.push({ x: bout[0], y: bout[1] - Q.flamme.taille * f * 0.6, vx: (Math.random() - 0.3) * 14, vy: -Q.fumeeMonte * (0.6 + Math.random() * 0.6), t0: rt });
      }
    }
  }
  braises = braises.filter(p => rt - p.t0 < Q.braiseVie);
  fumees = fumees.filter(p => rt - p.t0 < Q.fumeeVie);
  for (const p of fumees) { p.x += p.vx * dt / 1000; p.y += p.vy * dt / 1000; }
  for (const p of braises) { p.x += p.vx * dt / 1000; p.y += p.vy * dt / 1000; }

  // Le héros à bout de souffle laisse échapper de la buée
  const reste = hero.endurance / S.enduranceMax;
  if (jeu.etat === 'combat' && reste < G.enduranceSeuil) {
    const taux = (1 - reste / G.enduranceSeuil) * G.souffleMaxParSeconde;
    if (Math.random() < taux * dt / 1000 && souffles.length < G.soufflesMax) {
      souffles.push({ x: hero.x + hero.dir * 8, y: S.solY - S.heroHauteur * 0.9, vx: hero.dir * (8 + Math.random() * 10), vy: -G.souffleMontee * (0.5 + Math.random()), t0: rt });
    }
  }
  souffles = souffles.filter(p => rt - p.t0 < G.souffleVie);
  for (const p of souffles) { p.x += p.vx * dt / 1000; p.y += p.vy * dt / 1000; }
}

// ---- Dessin du décor ----
function dessinerCiel() {
  const W = window.innerWidth, H = window.innerHeight, C = S.decor.ciel;
  const g = ctx.createLinearGradient(0, 0, 0, H * S.solEcranRatio);
  g.addColorStop(0, C.haut);
  g.addColorStop(1, C.bas);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  const mx = W * C.lune.x, my = H * C.lune.y, R = C.lune.halo * kui;
  const h = ctx.createRadialGradient(mx, my, 0, mx, my, R);
  h.addColorStop(0, `rgba(${C.lune.haloCouleur},${C.lune.haloAlpha})`);
  h.addColorStop(1, `rgba(${C.lune.haloCouleur},0)`);
  ctx.fillStyle = h;
  ctx.fillRect(mx - R, my - R, R * 2, R * 2);
  ctx.fillStyle = C.lune.couleur;
  ctx.beginPath();
  ctx.arc(mx, my, C.lune.rayon * kui, 0, Math.PI * 2);
  ctx.fill();
  for (const n of C.nuages) {   // nuages sombres qui voilent la lune
    ctx.fillStyle = `rgba(14,12,20,${n.alpha})`;
    ctx.beginPath();
    ctx.ellipse(W * n.x, H * n.y, n.largeur * kui / 2, n.hauteur * kui / 2, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function dessinerRangee(liste, c) {
  ctx.fillStyle = c.couleur;
  ctx.strokeStyle = c.couleur;
  ctx.lineWidth = c.arcEpaisseur;
  const base = S.solY;
  for (let i = 0; i < liste.length; i++) {
    const e = liste[i], haut = base - e.h;
    ctx.beginPath();
    ctx.moveTo(e.x, base);
    if (e.casse >= 0) {   // sommet brisé
      ctx.lineTo(e.x, haut + e.h * 0.12 * e.casse);
      ctx.lineTo(e.x + e.w * 0.35, haut + e.h * 0.05);
      ctx.lineTo(e.x + e.w * 0.6, haut + e.h * (0.1 + 0.1 * e.casse));
      ctx.lineTo(e.x + e.w, haut);
    } else {
      ctx.lineTo(e.x, haut);
      ctx.lineTo(e.x + e.w, haut);
    }
    ctx.lineTo(e.x + e.w, base);
    ctx.closePath();
    ctx.fill();
    if (e.casse < 0) ctx.fillRect(e.x - 5, haut - 8, e.w + 10, 8);   // chapiteau
    const n = liste[i + 1];
    if (e.arc && n && e.casse < 0 && n.casse < 0) {
      const ya = Math.min(haut, base - n.h) + 6, xa = e.x + e.w;
      ctx.beginPath();
      ctx.moveTo(xa, ya);
      ctx.quadraticCurveTo((xa + n.x) / 2, ya - (n.x - xa) * 0.35, n.x, ya);
      ctx.stroke();
    }
  }
}

function dessinerPres() {
  const P = S.decor.pres, base = S.solY + 4;
  ctx.fillStyle = P.couleur;
  ctx.strokeStyle = P.couleur;
  for (const e of decor.pres) {
    if (e.type === 'tombe') {
      ctx.beginPath();
      ctx.moveTo(e.x, base);
      ctx.lineTo(e.x, base - e.h + e.w / 2);
      ctx.arc(e.x + e.w / 2, base - e.h + e.w / 2, e.w / 2, Math.PI, 0);
      ctx.lineTo(e.x + e.w, base);
      ctx.closePath();
      ctx.fill();
    } else if (e.type === 'grille') {
      const n = P.grilleBarres, gh = P.grilleHauteur, pas = e.w / (n - 1);
      for (let i = 0; i < n; i++) {
        const x = e.x + i * pas;
        ctx.fillRect(x - 1.5, base - gh, 3, gh);
        ctx.beginPath();
        ctx.moveTo(x - 3.5, base - gh);
        ctx.lineTo(x, base - gh - 10);
        ctx.lineTo(x + 3.5, base - gh);
        ctx.fill();
      }
      ctx.fillRect(e.x, base - gh * 0.75, e.w, 3);
      ctx.fillRect(e.x, base - gh * 0.25, e.w, 3);
    } else {   // statue de chat assis
      const s = P.statueTaille, cx = e.x + e.w / 2;
      ctx.fillRect(cx - s * 0.32, base - s * 0.12, s * 0.64, s * 0.12);
      ctx.beginPath();
      ctx.ellipse(cx, base - s * 0.38, s * 0.2, s * 0.28, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx, base - s * 0.74, s * 0.15, 0, Math.PI * 2);
      ctx.fill();
      for (const sg of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(cx + sg * s * 0.16, base - s * 0.78);
        ctx.lineTo(cx + sg * s * 0.13, base - s * 0.95);
        ctx.lineTo(cx + sg * s * 0.03, base - s * 0.86);
        ctx.fill();
      }
      ctx.lineWidth = s * 0.08;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(cx + s * 0.18, base - s * 0.18);
      ctx.quadraticCurveTo(cx + s * 0.42, base - s * 0.12, cx + s * 0.34, base - s * 0.34);
      ctx.stroke();
    }
  }
}

function dessinerSol() {
  const D = S.decor, G = D.sol, x0 = -D.marge, w = S.arenaLargeur + 2 * D.marge, prof = S.hauteurInterface * 4;
  ctx.fillStyle = G.couleur;
  ctx.fillRect(x0, S.solY, w, prof);
  ctx.strokeStyle = G.jointCouleur;
  ctx.lineWidth = 2;
  const lim = [0, ...G.joints, G.joints[G.joints.length - 1] + 200];
  for (let b = 0; b < lim.length - 1; b++) {
    if (b > 0) {
      ctx.beginPath();
      ctx.moveTo(x0, S.solY + lim[b]);
      ctx.lineTo(x0 + w, S.solY + lim[b]);
      ctx.stroke();
    }
    const pas = G.jointEcart * (1 + G.jointEvase * b);
    for (let x = x0 + (b % 2 ? pas / 2 : 0); x < x0 + w; x += pas) {
      ctx.beginPath();
      ctx.moveTo(x, S.solY + lim[b]);
      ctx.lineTo(x, S.solY + lim[b + 1]);
      ctx.stroke();
    }
  }
  ctx.lineWidth = 1.5;
  for (const pts of decor.fissures) {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], S.solY + pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], S.solY + pts[i][1]);
    ctx.stroke();
  }
  // Le sol est plus clair autour des personnages, la lumière vient des flammes
  const L = G.lumiere, lx = (hero.x + boss.x) / 2;
  ctx.save();
  ctx.translate(lx, S.solY + 24);
  ctx.scale(1, L.aplat);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, L.rayon);
  g.addColorStop(0, `rgba(${L.couleur},${L.alpha * (0.4 + 0.6 * intensiteFlammes())})`);
  g.addColorStop(1, `rgba(${L.couleur},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(-L.rayon, -L.rayon, L.rayon * 2, L.rayon * 2);
  ctx.restore();
}

function dessinerBrume(devant) {
  const D = S.decor, x0 = -D.marge, x1 = S.arenaLargeur + D.marge;
  for (const n of D.brume) {
    if (n.devant !== devant) continue;
    const periode = n.largeur * 0.8;
    const decalage = (((rt / 1000 * n.vitesse) % periode) + periode) % periode;
    for (let x = x0 - n.largeur + decalage; x < x1 + n.largeur; x += periode) {
      ctx.save();
      ctx.translate(x, S.solY + n.y);
      ctx.scale(1, n.hauteur / n.largeur);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, n.largeur / 2);
      g.addColorStop(0, `rgba(${D.brumeCouleur},${n.alpha})`);
      g.addColorStop(1, `rgba(${D.brumeCouleur},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(-n.largeur / 2, -n.largeur / 2, n.largeur, n.largeur);
      ctx.restore();
    }
  }
}

// Silhouettes très sombres au premier plan, devant les personnages, aux deux bouts de l'arène
function dessinerPremierPlan(cx) {
  const F = S.decor.premierPlan, off = -(cx - S.arenaLargeur / 2) * F.parallaxe;
  const haut = S.solY - S.hauteurInterface * 2, bas = S.solY + S.hauteurInterface * 2;
  ctx.globalAlpha = F.alpha;
  for (const cote of [-1, 1]) {
    const bord = cote < 0 ? F.x + off : S.arenaLargeur - F.x + off;       // bord intérieur du pilier
    const dehors = bord - cote * F.largeur;
    ctx.fillStyle = F.couleur;
    ctx.fillRect(Math.min(bord, dehors) - (cote < 0 ? 400 : 0), haut, F.largeur + 400, bas - haut);
    const g = ctx.createLinearGradient(bord, 0, bord + cote * F.fondu, 0);
    g.addColorStop(0, F.couleur);
    g.addColorStop(1, 'rgba(2,2,4,0)');
    ctx.fillStyle = g;
    ctx.fillRect(Math.min(bord, bord + cote * F.fondu), haut, F.fondu, bas - haut);
  }
  ctx.globalAlpha = 1;
}

function dessinerHalo() {
  const H = S.decor.halo, f = intensiteFlammes();
  if (f < 0.02) return;
  const y = S.solY - H.hauteur;
  const g = ctx.createRadialGradient(boss.x, y, 0, boss.x, y, H.rayon);
  g.addColorStop(0, `rgba(${H.couleur},${H.alpha * f})`);
  g.addColorStop(1, `rgba(${H.couleur},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(boss.x - H.rayon, y - H.rayon, H.rayon * 2, H.rayon * 2);
}

function dessinerHaloHeros() {
  const H = S.decor.haloHeros, y = S.solY - H.hauteur;
  const g = ctx.createRadialGradient(hero.x, y, 0, hero.x, y, H.rayon);
  g.addColorStop(0, `rgba(${H.couleur},${H.alpha})`);
  g.addColorStop(1, `rgba(${H.couleur},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(hero.x - H.rayon, y - H.rayon, H.rayon * 2, H.rayon * 2);
}

// Silhouette noire d'une vignette, pour l'image d'impact
const silhouettes = {};
function dessinerSilhouette(nom, f, x, miroir, sp) {
  const cle = sp === S.bossSprite ? 'boss' : 'heros';
  if (!silhouettes[cle]) silhouettes[cle] = document.createElement('canvas');
  const c = silhouettes[cle], g = c.getContext('2d');
  c.width = sp.largeur;
  c.height = sp.hauteur;
  g.clearRect(0, 0, c.width, c.height);
  g.drawImage(images[nom], f * sp.largeur, 0, sp.largeur, sp.hauteur, 0, 0, sp.largeur, sp.hauteur);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = '#000';
  g.fillRect(0, 0, c.width, c.height);
  dessinerSprite(c, 0, x, miroir, sp);
}

function etoile(b, rayon, creux, contour, remplissage) {
  const n = b.etoile.length;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const a = i * Math.PI * 2 / n - Math.PI / 2;
    const r = rayon * b.etoile[i] * (i % 2 ? creux : 1);
    ctx[i ? 'lineTo' : 'moveTo'](b.x + Math.cos(a) * r, b.y + Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fillStyle = remplissage;
  ctx.fill();
  if (contour) {
    ctx.lineWidth = contour;
    ctx.lineJoin = 'miter';
    ctx.strokeStyle = '#000';
    ctx.stroke();
  }
}

// Parade parfaite : image d'impact de dessin animé, écran blanc, silhouettes noires, étoile et traits.
// Parade simple : voile blanc léger, petite étoile et étincelles.
function dessinerImpactBlanc() {
  if (!blanc) return 0;
  const B = S.impactBlanc, age = rt - blanc.debut, parfaite = blanc.type === 'parfaite';
  const duree = parfaite ? B.parfaiteMs : B.simpleMs;
  if (age >= duree) return 0;
  const p = age / duree;
  ctx.save();
  if (parfaite) {
    const alpha = p < B.tenue ? 1 : 1 - (p - B.tenue) / (1 - B.tenue);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#fff';
    ctx.fillRect(-5000, -5000, 10000, 10000);
    ctx.strokeStyle = '#000';
    ctx.lineCap = 'round';
    for (const [a, v] of blanc.lignes) {
      const r0 = B.etoileRayon * B.lignesMin, r1 = B.etoileRayon * (B.lignesMin + (B.lignesMax - B.lignesMin) * v);
      ctx.lineWidth = B.lignesEpaisseur * (0.5 + v);
      ctx.beginPath();
      ctx.moveTo(blanc.x + Math.cos(a) * r0, blanc.y + Math.sin(a) * r0);
      ctx.lineTo(blanc.x + Math.cos(a) * r1, blanc.y + Math.sin(a) * r1);
      ctx.stroke();
    }
    etoile(blanc, B.etoileRayon, B.etoileCreux, B.etoileContour, '#fff');
    const [nomB, fb] = frameBoss();
    dessinerSilhouette(nomB, fb, boss.x, boss.dir > 0, S.bossSprite);
    const [nomH, fh] = frameHero();
    dessinerSilhouette(nomH, fh, hero.x, hero.etat === 'roulade' ? hero.rouladeDir < 0 : hero.dir < 0, S.heroSprite);
  } else {
    ctx.globalAlpha = 1 - p;
    ctx.fillStyle = `rgba(255,255,255,${B.simpleAlpha})`;
    ctx.fillRect(-5000, -5000, 10000, 10000);
    etoile(blanc, B.simpleRayon, B.etoileCreux, 0, '#fff6d8');
    ctx.strokeStyle = '#fff6d8';
    ctx.lineWidth = 2;
    for (const [a, v] of blanc.lignes) {
      ctx.beginPath();
      ctx.moveTo(blanc.x + Math.cos(a) * B.simpleRayon * 0.8, blanc.y + Math.sin(a) * B.simpleRayon * 0.8);
      ctx.lineTo(blanc.x + Math.cos(a) * B.simpleRayon * (1.2 + v * 1.4), blanc.y + Math.sin(a) * B.simpleRayon * (1.2 + v * 1.4));
      ctx.stroke();
    }
  }
  ctx.restore();
  return parfaite ? 1 : 0;
}

function dessinerParticulesMonde() {
  const Q = S.queues, G = S.signaux;
  for (const p of fumees) {
    const a = (rt - p.t0) / Q.fumeeVie;
    ctx.fillStyle = `rgba(14,10,12,${Q.fumeeAlpha * (1 - a)})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, Q.fumeeTaille * (0.7 + a * 1.8), 0, Math.PI * 2);
    ctx.fill();
  }
  for (const p of braises) {
    const a = 1 - (rt - p.t0) / Q.braiseVie;
    ctx.fillStyle = `rgba(255,${Math.round(120 + 100 * a)},50,${a})`;
    ctx.fillRect(p.x - 1.5, p.y - 1.5, 3, 3);
  }
  for (const p of souffles) {
    const a = (rt - p.t0) / G.souffleVie;
    ctx.fillStyle = `rgba(230,235,245,${0.38 * (1 - a)})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, G.souffleTaille * (1 + a * 1.6), 0, Math.PI * 2);
    ctx.fill();
  }
}

function velours(couleur, alpha, depart) {
  const W = window.innerWidth, H = window.innerHeight;
  const R = Math.hypot(W, H) / 2;
  const g = ctx.createRadialGradient(W / 2, H / 2, R * depart, W / 2, H / 2, R);
  g.addColorStop(0, `rgba(${couleur},0)`);
  g.addColorStop(1, `rgba(${couleur},${alpha})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

// Couches posées sur toute l'image : cendres, teinte de la phase 2, éclair, bords sombres et rouges
function dessinerAtmosphere() {
  const W = window.innerWidth, H = window.innerHeight, c = S.decor.cendres, G = S.signaux;
  const ember = phase2();
  ctx.fillStyle = ember ? S.decor.braises.couleur : c.couleur;
  for (const p of cendres) {
    ctx.globalAlpha = c.alpha * (ember ? 0.7 + 0.3 * Math.sin(rt / 200 + p.p) : 1) * Math.min(1, p.v);
    const t = c.taille * kui * p.v;
    ctx.fillRect(p.x, p.y, t, t);
  }
  ctx.globalAlpha = 1;

  if (ember) {
    ctx.fillStyle = `rgba(150,15,0,${S.decor.phase2.rougeAlpha})`;
    ctx.fillRect(0, 0, W, H);
  }
  const E = S.decor.eclair, ea = (rt - eclair) / E.ms;
  if (ea >= 0 && ea < 1) {
    ctx.fillStyle = `rgba(${E.couleur},${E.alpha * (1 - ea)})`;
    ctx.fillRect(0, 0, W, H);
  }
  velours('0,0,0', S.decor.vignette.alpha, S.decor.vignette.depart);

  // La vie du héros se lit sur le bord de l'écran : de plus en plus rouge, puis qui pulse
  const vie = hero.vie / S.vie;
  let rouge = Math.pow(1 - vie, 1.5) * G.vignetteRougeMax;
  if (vie < G.vieSeuilPouls && jeu.etat === 'combat') rouge *= 0.7 + 0.3 * (0.5 + 0.5 * Math.sin(rt / 1000 * Math.PI * 2 * G.poulsHz));
  if (rouge > 0.01) velours('150,0,12', rouge, 0.2);
}

function barre(x, y, largeur, part, couleur) {
  ctx.fillStyle = '#222';
  ctx.fillRect(x, y, largeur, S.barreHauteur);
  ctx.fillStyle = couleur;
  ctx.fillRect(x, y, largeur * part, S.barreHauteur);
}

// ---------- Sprites ----------
const noms = ['heros-attente', 'heros-course', 'heros-roulade', 'heros-attaque1', 'heros-attaque2', 'heros-touche', 'heros-mort', 'heros-parade',
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
  if (hero.etat === 'parade') return ['heros-parade', 0];
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
  ctx.rect(-S.decor.marge, -S.hauteurInterface * 4, S.arenaLargeur + 2 * S.decor.marge, S.hauteurInterface * 4 + S.solY);
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
  const decale = (p, f) => { ctx.save(); ctx.translate(-(cx - S.arenaLargeur / 2) * p, 0); f(); ctx.restore(); };
  decale(S.decor.ruine.parallaxe, () => dessinerRangee(decor.lointain, S.decor.ruine));
  decale(S.decor.colonnes.parallaxe, () => dessinerRangee(decor.colonnes, S.decor.colonnes));
  dessinerSol();
  decale(S.decor.pres.parallaxe, dessinerPres);
  dessinerBrume(false);
  dessinerHalo();

  for (const m of boss.marques) {
    dessinerRunes(m);
    const total = S.sortMarqueMs + S.sortExplosionMs;
    const [im, n] = anim('boss-sort');
    const f = Math.max(0, Math.min(n - 1, Math.floor((boss.t - m.t0) / total * n)));
    dessinerSprite(im, f, m.x, false, S.bossSprite, S.sortPivotX);
  }

  dessinerQueues();
  const [nomB, fb] = frameBoss();
  dessinerSprite(images[nomB], fb, boss.x, boss.dir > 0, S.bossSprite);
  dessinerLueur();
  dessinerArc();

  dessinerHaloHeros();

  // Le héros à bout d'endurance s'efface et vacille
  const epuise = hero.endurance <= 0 && jeu.etat === 'combat';
  ctx.globalAlpha = invulnerable() ? S.rouladeAlpha : epuise ? S.signaux.epuiseAlpha : 1;
  const [nomH, fh] = frameHero();
  ctx.save();
  if (epuise) ctx.translate(Math.sin(rt / 1000 * Math.PI * 2 * S.signaux.epuiseHz) * S.signaux.epuiseBalancement, 0);
  dessinerSprite(images[nomH], fh, hero.x, hero.etat === 'roulade' ? hero.rouladeDir < 0 : hero.dir < 0, S.heroSprite);
  ctx.restore();
  ctx.globalAlpha = 1;

  dessinerParticulesMonde();
  dessinerBrume(true);
  dessinerPremierPlan(cx);
  const imageBlanche = dessinerImpactBlanc();
  ctx.restore();

  // Couches posées sur l'image, en pixels de l'écran
  ctx.setTransform(d, 0, 0, d, 0, 0);
  if (!imageBlanche) dessinerAtmosphere();

  // Interface : seule la vie du boss est affichée, la vie et l'endurance du héros se lisent dans l'image
  ctx.setTransform(d * kui, 0, 0, d * kui, 0, 0);
  const wi = W / kui, hi = H / kui;
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
    majEffets(dt);
  }
  dessiner();
}
requestAnimationFrame(boucle);
})();
