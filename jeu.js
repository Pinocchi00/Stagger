(() => {
const S = SETTINGS;
// La fiche du monstre : celle de bossActif, ou celle du lien (?monstre=nom) pour l'essayer sans toucher au code
const choixLien = new URLSearchParams((window.location && window.location.search) || '').get('monstre');
const M = S.monstres[choixLien && S.monstres[choixLien] ? choixLien : S.bossActif];
const canvas = document.getElementById('jeu');
const ctx = canvas.getContext('2d');

// ---------- Arène et caméra ----------
// L'arène a une largeur fixe (S.arenaLargeur). La caméra suit le milieu du duel.
let d = 1;                // pixels de l'appareil par pixel CSS
let kui = 1;              // échelle de l'interface
let cendres = [];         // cendres, ou braises en phase 2, dans l'image
let braises = [];         // braises qui montent des flammes : { x, y, vx, vy, t0 }
let souffles = [];        // buée du héros essoufflé : { x, y, vx, vy, t0 }
let fumees = [];          // fumée noire au-dessus des flammes : { x, y, vx, vy, t0 }
let feux = [];            // particules de feu des flammes : { x, y, vx, vy, t0, vie, s, ph }
let spritesFeu = {};      // taches lumineuses précalculées : f1 (phase 1), f2 (phase 2), o (orbes)
let projectiles = [];     // orbes du boss : { x, y, vx, t0 }
let particules = [];      // cendres du corps, poussière, étincelles : { type, x, y, vx, vy, t0, vie }
let echos = [];           // images rémanentes du boss pendant ses fentes : { x, dir, nom, f, t0 }
let fxListe = [];         // sprites d'impact en cours : { nom, x, y, miroir, t0 }
let lumieresTemps = [];   // lumières brèves : { x, y, regle, t0 }
let cartes = null;        // cartes de lumière : { ambiante, lueur }
let ambianceT = 0;        // 0 : ambiance de la phase 1, 1 : phase 2
let flashMeta = -1e9;
let ralenti = null;       // ralenti en cours : { t0, ms, facteur }, en temps réel
let scene = null;         // scène de caméra en cours : { type, t0, ms, zoom }
let kicks = [];           // petits à-coups de zoom : { delta, t0, ms }
let bandes = 0;           // bandes noires : 0 absentes, 1 en place
let introFaite = false;   // l'entrée du boss n'a lieu qu'à la première tentative
let essaiDebut = 0;       // début du combat en cours, en temps réel
let morts = 0;            // morts depuis le début de la partie
let stats = null;         // chiffres affichés à la victoire     // instant du flash de la métamorphose
let spriteFumee = null;   // tache de fumée douce
let eclair = -1e9;        // instant du dernier éclair, en temps réel

const boss = { x: 0, w: M.largeur };
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

// Enveloppe 0 -> 1 -> 0 : monte en `montee` ms, redescend sur les `descente` dernières ms
function enveloppe(age, ms, montee, descente) {
  if (age < 0 || age > ms) return 0;
  return Math.max(0, Math.min(1, age / montee, (ms - age) / descente));
}

function cibleCamera() {
  const W = window.innerWidth;
  const zBase = zoomDeBase();
  const zMin = W / S.arenaLargeur;
  const ecartX = Math.abs(hero.x - boss.x) + 2 * S.camBordUnites;
  const milieu = (hero.x + boss.x) / 2;
  let x = milieu, z = Math.max(zMin, Math.min(zBase, W / ecartX));
  const I = S.mise.intro;
  if (jeu.etat === 'intro') {
    // la caméra part du héros, glisse jusqu'au boss, puis revient au milieu du duel
    const f = Math.max(0, Math.min(1, (jeu.t - I.glisseDebut) / (I.glisseFin - I.glisseDebut)));
    const retour = Math.max(0, Math.min(1, (jeu.t - I.retourDebut) / (I.ms - I.retourDebut)));
    const e = f * f * (3 - 2 * f);
    const sur = hero.x + (boss.x - hero.x) * e;
    x = sur + (milieu - sur) * retour;
    z = Math.max(zMin, zBase * (1 + I.zoom * e * (1 - retour)));
  } else if (scene) {
    const w = scene.type === 'meta' ? enveloppe(rt - scene.t0, scene.ms, 220, S.mise.meta.relacheMs) : enveloppe(rt - scene.t0, scene.ms, 120, 160);
    x = milieu + (boss.x - milieu) * w;
    z *= 1 + scene.zoom * w;
  }
  return { x, z };
}

// Petit zoom (delta > 0 : on s'approche) qui s'efface en ms
function kickCamera(delta, ms) {
  kicks.push({ delta, t0: rt, ms });
  if (kicks.length > 8) kicks.shift();
}

// Ralenti : le temps du monde passe à `facteur` pendant ms, puis reprend en douceur
function echelleTemps() {
  if (!ralenti) return 1;
  const age = rt - ralenti.t0;
  if (age >= ralenti.ms) { ralenti = null; return 1; }
  const retour = Math.max(0, Math.min(1, (age - (ralenti.ms - 160)) / 160));
  return ralenti.facteur + (1 - ralenti.facteur) * retour;
}

function ajuster() {
  d = window.devicePixelRatio || 1;
  canvas.width = Math.round(window.innerWidth * d);
  canvas.height = Math.round(window.innerHeight * d);
  canvas.style.width = window.innerWidth + 'px';   // même taille que le dessin : rien n'est écrasé
  canvas.style.height = window.innerHeight + 'px';
  kui = window.innerHeight / S.hauteurInterface;
  genererCendres();
  creerCartes();
  if (hero.x !== undefined) { const c = cibleCamera(); cam.x = c.x; cam.z = c.z; }
}

function majCamera(dt) {
  const c = cibleCamera();
  const vif = scene && rt - scene.t0 < scene.ms ? 4 : 1;   // pendant une scène, la caméra obéit plus vite
  cam.x += (c.x - cam.x) * (1 - Math.exp(-S.camLisseParSeconde * vif * dt / 1000));
  cam.z += (c.z - cam.z) * (1 - Math.exp(-S.camZoomLisseParSeconde * vif * dt / 1000));
}

function recommencer() {
  Object.assign(hero, {
    x: S.heroDepartX,
    dir: 1,               // il regarde toujours le boss
    etat: 'libre',        // libre, esquive, attaque, touche
    t: 0,                 // temps passé dans l'état, ms
    esquiveDir: 1,
    reculDir: 1,
    attaqueN: 1,
    frappe: false,        // le coup de l'attaque en cours a-t-il eu lieu
    enfile: false,        // une attaque a été demandée pendant celle-ci
    derniereAttaqueN: 0,
    finAttaque: -1e9,
    vie: S.vie,
    endurance: S.enduranceMax,
    derniereAction: -1e9,
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
    vie: M.vie,
    phase: 1,             // 1 ou 2 : la métamorphose fait passer à la phase 2
    fa: 1,                // facteur de durée des élans de l'attaque en cours
    dash: null,           // fente de la ruée : { de, vers, t0, dernierEcho }
    applique: false,      // le coup de la ruée a-t-il eu lieu
    tirs: 0,              // orbes déjà lancées
    etat: 'ouverture',    // marche, fauchage, sort, orbe, ruee, bond, ouverture, vacille, meta
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
    eteintes: 0,          // flammes éteintes par des parades
    eteintesT: [],        // instant où chaque queue s'est éteinte, en temps réel
    dernierCoup: -1e9,
    flash: -1e9,
  });
  projectiles = [];
  echos = [];
  fxListe = [];
  particules = [];
  lumieresTemps = [];
  ambianceT = 0;
  jeu.etat = 'combat';
  jeu.t = 0;
  jeu.treel = 0;
  ralenti = null;
  scene = null;
  kicks = [];
  essaiDebut = rt;
  const c = cibleCamera();
  cam.x = c.x;
  cam.z = c.z;
}

window.addEventListener('resize', ajuster);
creerSpritesFeu();
recommencer();
jeu.etat = 'depart';
ajuster();

// ---------- Son ----------
// Tous les sons sont produits par le code. Ils se débloquent au premier toucher.
let ac = null;
let tampon = null;
let sortie = null;        // sortie générale
let fondBus = null;       // vent, bourdon et tambour passent par ici : il baisse à chaque coup
let ambiance = null;      // nœuds continus : vent, bourdon
let prochainTambour = 0;
let pasHerosT = 0, pasBossT = 0;
let silenceAudio = 1;     // 1 : le fond joue ; 0 : silence complet

function initAudio() {
  if (ac) return;
  try {
    ac = new (window.AudioContext || window.webkitAudioContext)();
    const n = ac.sampleRate * 2;
    tampon = ac.createBuffer(1, n, ac.sampleRate);
    const data = tampon.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1;
    sortie = ac.createGain();
    // un compresseur de sécurité : quand tout sonne ensemble, ça ne sature pas
    const compresseur = ac.createDynamicsCompressor();
    compresseur.threshold.value = -16;
    compresseur.ratio.value = 5;
    compresseur.attack.value = 0.004;
    compresseur.release.value = 0.2;
    sortie.connect(compresseur);
    compresseur.connect(ac.destination);
    fondBus = ac.createGain();
    fondBus.gain.value = S.ambiance.fond;
    fondBus.connect(sortie);
    creerAmbiance();
  } catch (e) { ac = null; }
  if (ac && ac.resume) ac.resume();
}

// Le vent (bruit filtré, qui souffle par rafales) et le bourdon grave (deux lames désaccordées et un sous-grave)
function creerAmbiance() {
  const A = S.ambiance, noeuds = {};
  const vent = ac.createBufferSource();
  vent.buffer = tampon;
  vent.loop = true;
  noeuds.ventFiltre = ac.createBiquadFilter();
  noeuds.ventFiltre.type = 'bandpass';
  noeuds.ventFiltre.frequency.value = A.vent.hz;
  noeuds.ventFiltre.Q.value = A.vent.q;
  noeuds.ventGain = ac.createGain();
  noeuds.ventGain.gain.value = 0;
  vent.connect(noeuds.ventFiltre).connect(noeuds.ventGain).connect(fondBus);
  vent.start();

  noeuds.bourdonFiltre = ac.createBiquadFilter();
  noeuds.bourdonFiltre.type = 'lowpass';
  noeuds.bourdonFiltre.frequency.value = A.bourdon.filtre;
  noeuds.bourdonGain = ac.createGain();
  noeuds.bourdonGain.gain.value = 0;
  noeuds.bourdonFiltre.connect(noeuds.bourdonGain).connect(fondBus);
  for (const [type, f, v] of [['sawtooth', A.bourdon.f, 0.5], ['sawtooth', A.bourdon.f + A.bourdon.desaccord, 0.5], ['sine', A.bourdon.f / 2, 0.9]]) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type;
    o.frequency.value = f;
    g.gain.value = v;
    o.connect(g).connect(noeuds.bourdonFiltre);
    o.start();
  }
  // la note dissonante de la phase 2 : un triton au-dessus du bourdon
  noeuds.dissoFiltre = ac.createBiquadFilter();
  noeuds.dissoFiltre.type = 'lowpass';
  noeuds.dissoFiltre.frequency.value = 340;
  noeuds.dissoGain = ac.createGain();
  noeuds.dissoGain.gain.value = 0;
  const od = ac.createOscillator();
  od.type = 'sawtooth';
  od.frequency.value = A.bourdon.f * A.bourdon.dissonance;
  od.connect(noeuds.dissoFiltre).connect(noeuds.dissoGain).connect(fondBus);
  od.start();
  ambiance = noeuds;
}

// Le fond baisse brièvement pour que le coup ressorte
function abaisserFond(nom) {
  const D = S.ambiance.duck[nom];
  if (!D || !fondBus) return;
  const t = ac.currentTime, g = fondBus.gain;
  g.cancelScheduledValues(t);
  g.setTargetAtTime(S.ambiance.fond * D.niveau, t, 0.012);
  g.setTargetAtTime(S.ambiance.fond, t + 0.05, D.ms / 1000 / 3);
}

function panoramique(x) {
  return Math.max(-1, Math.min(1, (x - cam.x) * cam.z / (window.innerWidth / 2))) * S.ambiance.panoramique;
}

// Un son est une liste de composants : un oscillateur (glissant de f0 à f1, filtre lp, vibrato vib) ou un bruit filtré.
// x : position dans le monde, pour placer le son à gauche ou à droite.
function jouer(nom, x) {
  if (!ac) return;
  const t0 = ac.currentTime;
  const pan = x === undefined || !ac.createStereoPanner ? null : panoramique(x);
  abaisserFond(nom);
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
      if (c.vib) {
        const lfo = ac.createOscillator(), lg = ac.createGain();
        lfo.frequency.value = c.vib[0];
        lg.gain.value = c.vib[1];
        lfo.connect(lg).connect(src.frequency);
        lfo.start(t);
        lfo.stop(t + c.duree);
      }
      if (c.lp) {
        const f = ac.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.value = c.lp;
        src.connect(f).connect(g);
      } else src.connect(g);
    }
    if (pan !== null) {
      const p = ac.createStereoPanner();
      p.pan.value = pan;
      g.connect(p);
      p.connect(sortie);
    } else g.connect(sortie);
    src.start(t);
    src.stop(t + c.duree);
  }
}

// Un coup de tambour grave, planifié à l'instant quand
function tambour(quand) {
  const T = S.ambiance.tambour, d = T.ms / 1000;
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(T.graveDebut, quand);
  o.frequency.exponentialRampToValueAtTime(T.graveFin, quand + d);
  g.gain.setValueAtTime(T.volume, quand);
  g.gain.exponentialRampToValueAtTime(0.0001, quand + d);
  o.connect(g).connect(fondBus);
  o.start(quand);
  o.stop(quand + d);
  const b = ac.createBufferSource(), f = ac.createBiquadFilter(), gb = ac.createGain();
  b.buffer = tampon;
  f.type = 'lowpass';
  f.frequency.value = 240;
  gb.gain.setValueAtTime(T.volume * 0.5, quand);
  gb.gain.exponentialRampToValueAtTime(0.0001, quand + 0.12);
  b.connect(f).connect(gb).connect(fondBus);
  b.start(quand);
  b.stop(quand + 0.12);
}

// Chaque image : réglage du vent, du bourdon, du tambour, et des pas
function majAudio(dt) {
  if (!ac || !ambiance) return;
  const A = S.ambiance, t = ac.currentTime, p2 = phase2();
  const vacille = boss.etat === 'vacille';
  const muet = vacille || jeu.etat === 'victoire' || jeu.etat === 'mort' || portrait();
  // silence complet pendant le vacillement : fondu très court, retour plus lent
  silenceAudio += ((muet ? 0 : 1) - silenceAudio) * Math.min(1, dt / (muet ? A.silenceMs : A.retourMs));
  const s = silenceAudio;
  const rafale = 1 + A.vent.rafaleProfondeur * Math.sin(rt / 1000 * Math.PI * 2 * A.vent.rafaleHz) * Math.sin(rt / 2300);
  ambiance.ventGain.gain.setTargetAtTime(A.vent.gain * (p2 ? A.vent.facteur2 : 1) * rafale * s, t, 0.25);
  ambiance.ventFiltre.frequency.setTargetAtTime(A.vent.hz * (p2 ? A.vent.hzFacteur2 : 1) * (1 + 0.3 * Math.sin(rt / 3100)), t, 0.4);
  const respire = 1 + 0.18 * Math.sin(rt / 1000 * Math.PI * 2 * A.bourdon.modHz);
  ambiance.bourdonGain.gain.setTargetAtTime(A.bourdon.gain * respire * s, t, 0.3);
  ambiance.bourdonFiltre.frequency.setTargetAtTime(A.bourdon.filtre * (1 + 0.25 * Math.sin(rt / 4300)), t, 0.4);
  ambiance.dissoGain.gain.setTargetAtTime(p2 ? A.bourdon.dissonanceGain * s * (0.75 + 0.25 * Math.sin(rt / 700)) : 0, t, 0.6);

  // le tambour : un coup toutes les 2 s, deux fois plus vite en phase 2, rien tant que le combat n'a pas commencé
  if (jeu.etat === 'combat' && !muet) {
    const periode = (p2 ? A.tambour.periode2 : A.tambour.periode) / 1000;
    if (prochainTambour < t) prochainTambour = t + 0.15;
    while (prochainTambour < t + 0.12) { tambour(prochainTambour); prochainTambour += periode; }
  } else prochainTambour = t + 0.2;

  // les pas
  if (jeu.etat === 'combat') {
    if (hero.etat === 'libre' && direction() !== 0) {
      pasHerosT += dt;
      if (pasHerosT >= A.pasHerosMs) { pasHerosT = 0; jouer('pasHeros', hero.x); }
    } else pasHerosT = A.pasHerosMs * 0.6;
    if (boss.etat === 'marche') {
      pasBossT += dt;
      if (pasBossT >= A.pasBossMs * (p2 ? A.pasBossFacteur2 : 1)) { pasBossT = 0; jouer('pasBoss', boss.x); }
    } else pasBossT = A.pasBossMs * 0.5;
  }
}

// ---------- Héros ----------
const invulnerable = () => hero.etat === 'esquive' && hero.t < S.esquiveInvulnerableMs;

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
  if (jeu.etat !== 'combat' || hero.endurance <= 0 || hero.etat === 'esquive' || hero.etat === 'touche') return;
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

function esquiver(dir) {
  if (jeu.etat !== 'combat' || hero.endurance <= 0 || hero.etat === 'esquive' || hero.etat === 'touche') return;
  payer(S.enduranceEsquive);
  poussiere(hero.x, dir);
  jouer('esquive');
  hero.etat = 'esquive';
  hero.t = 0;
  hero.esquiveDir = dir;
  hero.enfile = false;
}

function heroTouche(degats) {
  if (invulnerable()) return;
  hero.vie = Math.max(0, hero.vie - degats);
  if (hero.vie <= 0) { morts++; ralenti = { t0: rt, ms: S.mortMs, facteur: S.mise.mort.facteur }; }
  lumiereBreve('coupRecu', hero.x, S.solY - S.heroHauteur * 0.55);
  lancerFx('fx-degat-heros', hero.x, S.solY - S.heroHauteur * 0.55, boss.x > hero.x);
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

// ---- Sprites d'impact ----
function lancerFx(nom, x, y, miroir) {
  fxListe.push({ nom, x, y, miroir, t0: rt });
}

// ---- Parade ----
let blanc = null;         // dernier impact de parade : { debut, type, x, y, etoile, lignes }

// Une parade éteint une flamme, de la première queue à la dernière
function eteindreFlamme() {
  if (boss.eteintes >= S.queues.nombre) return;
  const i = boss.eteintes++;
  boss.eteintesT[i] = rt;
  const pts = geometrieQueues()[i], bout = pts[pts.length - 1], Q = S.queues;
  for (let k = 0; k < Q.fumeeEteinte; k++) {
    fumees.push({ x: bout[0] + (Math.random() - 0.5) * 14, y: bout[1] - Math.random() * 18, vx: (Math.random() - 0.5) * 30, vy: -Q.fumeeMonte * (0.8 + Math.random()), t0: rt - Math.random() * 200 });
  }
  jouer('flammeEteinte');
}

// Le coup du boss est-il paré ? Le coup d'épée du héros doit tomber au même moment :
// l'impact de sa lame (au milieu de l'attaque) à moins de S.paradeParfaiteMs / 2 de celui du boss pour une parade parfaite,
// à moins de S.paradeSimpleMs / 2 pour une parade simple.
function resultatParade() {
  if (hero.etat !== 'attaque') return null;
  const ecart = Math.abs(hero.t - S.attaqueMs * S.attaqueImpactRatio);
  if (ecart <= S.paradeParfaiteMs / 2) return 'parfaite';
  if (ecart <= S.paradeSimpleMs / 2) return 'simple';
  return null;
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
    lignes: Array.from({ length: type === 'parfaite' ? B.lignes : type === 'bloque' ? B.bloqueEtincelles : B.etincelles }, () => [Math.random() * Math.PI * 2, Math.random()]),
  };
}

function heroParade(type) {
  creerImpact(type);
  lumiereBreve(type === 'parfaite' ? 'coupParfait' : 'coupParade', hero.x + hero.dir * S.heroLargeur * S.contactX, S.solY - S.heroHauteur * S.contactY);
  lancerFx(type === 'parfaite' ? 'fx-parade-parfaite' : 'fx-parade-simple', hero.x + hero.dir * S.heroLargeur * S.contactX, S.solY - S.heroHauteur * S.contactY, hero.dir < 0);
  eteindreFlamme();
  if (type === 'parfaite') {
    boss.dernierCoup = gt;
    boss.posture += S.postureParadeParfaite;
    if (boss.posture >= S.postureMax) vaciller();
    impact(S.arretParadeParfaiteMs, S.tremblementParadeParfaiteMs, S.tremblementParadeParfaitePx);
    jouer('paradeParfaite');
  } else {
    payer(S.enduranceParadeSimple);
    hero.etat = 'touche';
    hero.t = 0;
    hero.enfile = false;
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
  if (jeu.etat === 'victoire' && jeu.treel >= S.victoireAttenteMs) recommencer();
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
  jeu.t = 0;
  jeu.treel = 0;
  jeu.sonEntree = false;
  if (introFaite) { jeu.etat = 'combat'; essaiDebut = rt; }
  else { jeu.etat = 'intro'; introFaite = true; }   // l'entrée du boss n'a lieu qu'à la première tentative
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
    esquiver(Math.sign(p.x - p.x0));
  }
});
function relacher(e) {
  touches.delete(e.pointerId);
}
window.addEventListener('pointerup', e => { pleinEcran(); relancer(); relacher(e); });
window.addEventListener('pointercancel', relacher);

window.addEventListener('keydown', e => {
  if (['ArrowLeft', 'ArrowRight', 'Space', 'ShiftLeft', 'ShiftRight'].includes(e.code)) e.preventDefault();
  initAudio();
  pleinEcran();
  if (e.repeat) return;
  clavier.add(e.code);
  if (demarrer()) return;
  relancer();
  if (e.code === 'Space') attaquer('clavier');
  if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') esquiver(direction() || hero.dir);
});
window.addEventListener('keyup', e => clavier.delete(e.code));
window.addEventListener('blur', () => { clavier.clear(); touches.clear(); });
window.addEventListener('contextmenu', e => e.preventDefault());
// Le son se tait quand la page passe en arrière-plan
document.addEventListener('visibilitychange', () => {
  if (!ac) return;
  if (document.hidden) ac.suspend(); else ac.resume();
});

// ---------- Mise à jour ----------
function chevauche(a1, a2, b1, b2) { return a1 < b2 && b1 < a2; }

const heroG = () => hero.x - S.heroLargeur / 2;
const heroD = () => hero.x + S.heroLargeur / 2;

function sortirDuBoss() {
  const g = boss.x - boss.w / 2, dr = boss.x + boss.w / 2;
  if (!chevauche(heroG(), heroD(), g, dr)) return;
  hero.x = hero.x < boss.x ? g - S.heroLargeur / 2 : dr + S.heroLargeur / 2;
}

// Palier sous lequel la vie du boss ne peut pas descendre tant que ses cinq flammes ne sont pas éteintes
function plancherVie() {
  const milieu = M.vie * (1 - S.phase1Part);
  const eteintes = boss.eteintes >= S.queues.nombre;
  if (boss.phase === 1) return eteintes ? milieu : M.vie;
  return eteintes ? 0 : milieu;
}

function frapperBoss() {
  const depart = hero.x + hero.dir * S.heroLargeur / 2;
  const fin = depart + hero.dir * S.attaquePortee;
  if (!chevauche(Math.min(depart, fin), Math.max(depart, fin), boss.x - boss.w / 2, boss.x + boss.w / 2)) return;
  const vacille = boss.etat === 'vacille';
  const degats = (hero.attaqueN === 2 ? S.attaque2Degats : S.attaqueDegats) * (vacille ? S.vacilleDegatsFacteur : 1);
  const plancher = plancherVie();
  const bloque = boss.vie <= plancher || boss.etat === 'meta';
  boss.vie = Math.max(plancher, boss.vie - degats);
  boss.flash = gt;
  boss.dernierCoup = gt;
  if (!vacille && boss.etat !== 'meta') {
    boss.posture += hero.attaqueN === 2 ? S.postureCoup2 : S.postureCoup;
    if (boss.posture >= S.postureMax) vaciller();
  }
  const cx = hero.x + hero.dir * (S.heroLargeur / 2 + S.attaquePortee * 0.7), cy = S.solY - S.heroHauteur * 0.9;
  etincelles(cx, cy, hero.dir);
  lumiereBreve(bloque ? 'coupBloque' : 'coupDonne', cx, cy);
  if (bloque) {
    lancerFx('fx-bloque', cx, cy, hero.dir < 0);
    jouer('coupBloque');
    impact(0, S.tremblementCoupDonneMs, S.tremblementCoupDonnePx * 0.4);
    return;
  }
  lancerFx('fx-degat-boss', cx, cy, hero.dir < 0);
  impact(S.arretCoupDonneMs, S.tremblementCoupDonneMs, S.tremblementCoupDonnePx);
  jouer('coupDonne');
  if (boss.phase === 1 && boss.vie <= M.vie * (1 - S.phase1Part)) { metamorphoser(); return; }
  kickCamera(S.mise.kicks.coupDonne.delta, S.mise.kicks.coupDonne.ms);
  if (boss.vie <= 0) {
    // coup fatal : ralenti, zoom sur le boss, son coupé
    const F = S.mise.fatal;
    ralenti = { t0: rt, ms: F.ms, facteur: F.facteur };
    scene = { type: 'fatal', t0: rt, ms: F.ms, zoom: F.zoom };
    stats = { temps: rt - essaiDebut, essais: morts + 1 };
    jeu.etat = 'victoire';
    jeu.t = 0;
    jeu.treel = 0;
  }
}

function majHero(dt) {
  hero.dir = boss.x >= hero.x ? 1 : -1;
  if (boss.etat === 'meta' && !boss.metaFait) return;   // le combat se fige
  hero.t += dt;

  if (hero.etat === 'libre') {
    hero.x += direction() * S.vitesseMarche * dt / 1000;
  } else if (hero.etat === 'esquive') {
    hero.x += hero.esquiveDir * S.esquiveLargeurs * S.heroLargeur * dt / S.esquiveMs;
    if (hero.t >= S.esquiveMs) { hero.etat = 'libre'; hero.t = 0; poussiere(hero.x, hero.esquiveDir); }
  } else if (hero.etat === 'touche') {
    hero.x += hero.reculDir * hero.reculDist * dt / hero.reculMs;
    if (hero.t >= hero.reculMs) { hero.etat = 'libre'; hero.t = 0; }
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
  if (hero.etat !== 'esquive' && !(boss.etat === 'ruee' && boss.dash)) sortirDuBoss();

  if (gt - hero.derniereAction >= S.enduranceRegenDelaiMs) {
    hero.endurance = Math.min(S.enduranceMax, hero.endurance + S.enduranceRegenParSeconde * dt / 1000);
  }
}

// Écart entre le bord du boss et le bord du héros, négatif s'ils se chevauchent
const ecart = () => Math.abs(hero.x - boss.x) - boss.w / 2 - S.heroLargeur / 2;

const phase2 = () => boss.phase === 2;
const facteurAnnonce = () => M.rythme * (phase2() ? S.phase2.annonceFacteur : 1);
const facteurDegats = () => (phase2() ? S.phase2.degatsFacteur : 1);

// Tirage au hasard pondéré, jamais plus de S.repetitionMax fois la même attaque de suite
function choisirAttaque() {
  const poids = phase2() ? M.poids2 : M.poids;
  const h = boss.historique;
  const repete = h.length >= S.repetitionMax && h.slice(-S.repetitionMax).every(n => n === h[h.length - 1]) ? h[h.length - 1] : null;
  const choix = Object.keys(poids).filter(n => n !== repete && poids[n] > 0);
  let tirage = Math.random() * choix.reduce((somme, n) => somme + poids[n], 0);
  let nom = choix[choix.length - 1];
  for (const n of choix) { tirage -= poids[n]; if (tirage < 0) { nom = n; break; } }
  h.push(nom);
  if (h.length > S.repetitionMax) h.shift();
  return nom;
}

function entrerMarche() {
  boss.etat = 'marche';
  boss.t = 0;
  boss.prochaine = choisirAttaque();
  boss.delaiSort = S.sortLoinMinMs + Math.random() * (S.sortLoinMaxMs - S.sortLoinMinMs);
  const b = S.bond;
  if (ecart() < b.seuilEcart && Math.random() < (phase2() ? b.chance2 : b.chance)) lancerBond();
}

// Le boss recule d'un trait, face au héros
function lancerBond() {
  const sens = hero.x >= boss.x ? -1 : 1;
  const place = sens < 0 ? boss.x - boss.w / 2 : S.arenaLargeur - boss.w / 2 - boss.x;
  if (place < 60) return;
  boss.etat = 'bond';
  boss.t = 0;
  boss.dir = hero.x >= boss.x ? 1 : -1;
  boss.dash = { de: boss.x, vers: boss.x + sens * Math.min(S.bond.distance, place), t0: 0, dernierEcho: -1e9 };
  jouer('bond', boss.x);
}

const ATTAQUES_FAUCHAGE = ['fauchage', 'retarde', 'double'];
const ATTAQUES_A_DISTANCE = ['sort', 'pluie', 'orbe', 'ruee'];

function lancerBoss(nom) {
  const fauchage = ATTAQUES_FAUCHAGE.includes(nom);
  jouer('rale', boss.x);
  jouer({ fauchage: 'annonceFauchage', retarde: 'annonceRetarde', double: 'annonceDouble', sort: 'annonceSort', pluie: 'annoncePluie', orbe: 'annonceOrbe', ruee: 'annonceRuee' }[nom], boss.x);
  boss.etat = fauchage ? 'fauchage' : nom === 'ruee' ? 'ruee' : nom === 'orbe' ? 'orbe' : 'sort';
  boss.variante = nom === 'fauchage' ? 'normal' : nom;
  boss.fa = facteurAnnonce();
  kickCamera(S.mise.kicks.attaqueBoss.delta, S.mise.kicks.attaqueBoss.ms);
  boss.t = 0;
  boss.frappes = 0;
  boss.retourne = false;
  boss.marques = [];
  boss.tirs = 0;
  boss.dash = null;
  boss.applique = false;
  boss.dir = hero.x >= boss.x ? 1 : -1;
}

function ouverture() {
  boss.etat = 'ouverture';
  boss.t = 0;
  boss.duree = phase2() ? S.phase2.ouvertureMs : M.ouvertureMs;
  boss.dash = null;
}

// Le coup du héros qui remplit la posture interrompt l'attaque en cours
function vaciller() {
  const V = S.mise.vacille;
  ralenti = { t0: rt, ms: V.ms, facteur: V.facteur };
  scene = { type: 'vacille', t0: rt, ms: V.ms, zoom: V.zoom };
  boss.etat = 'vacille';
  boss.t = 0;
  boss.posture = 0;
  boss.marques = [];
  boss.frappes = 0;
  boss.dash = null;
}

// À la moitié de sa vie, le boss se métamorphose : ses flammes se rallument, une seconde lame apparaît
function metamorphoser() {
  scene = { type: 'meta', t0: rt, ms: S.meta.changeMs + S.mise.meta.relacheMs, zoom: S.mise.meta.zoom };
  boss.etat = 'meta';
  boss.t = 0;
  boss.marques = [];
  boss.frappes = 0;
  boss.dash = null;
  boss.posture = 0;
  boss.metaFait = false;
  projectiles = [];
  jouer('metamorphose');
  impact(S.meta.arretMs, S.meta.ms, S.meta.tremblementPx);
}

// Instants, depuis le début de l'attaque, où le Fauchage frappe : en phase 2, la seconde lame suit la première
function tempsFrappes() {
  const A = S.fauchageAnnonceMs * boss.fa;
  let t = [A];
  if (boss.variante === 'retarde') t = [S.fauchageRetardeMs * boss.fa];
  else if (boss.variante === 'double') t = [A, A + S.doubleDelaiMs * boss.fa];
  if (phase2()) t = t.flatMap(x => [x, x + S.phase2.secondeLameMs]);
  return t;
}

function zoneFauchage() {
  const depart = boss.x + boss.dir * boss.w / 2;
  const fin = depart + boss.dir * S.fauchagePortee;
  return [Math.min(depart, fin), Math.max(depart, fin)];
}

// Le coup du boss tombe sur le héros : paré, ou subi
function coupDuBoss(degats) {
  const [g, dr] = zoneFauchage();
  lumiereBreve('coupBoss', boss.x + boss.dir * (boss.w / 2 + S.fauchagePortee * 0.6), S.solY - 55);
  if (!chevauche(heroG(), heroD(), g, dr)) return;
  const parade = resultatParade();
  if (parade) heroParade(parade);
  else heroTouche(degats * facteurDegats());
}

function echo() {
  const [nom, f] = frameBoss();
  echos.push({ x: boss.x, dir: boss.dir, nom, f, t0: rt });
}

function majProjectiles(dt) {
  for (const p of projectiles) {
    p.x += p.vx * dt / 1000;
    if (Math.abs(p.x - hero.x) < S.heroLargeur / 2 + S.orbe.rayon && !invulnerable()) {
      p.mort = true;
      const parade = resultatParade();
      if (parade) heroParade(parade);
      else heroTouche(S.orbe.degats * facteurDegats());
    }
  }
  projectiles = projectiles.filter(p => !p.mort && p.x > -150 && p.x < S.arenaLargeur + 150);
}

function majBoss(dt) {
  boss.t += dt;
  if (gt - boss.dernierCoup >= S.postureDelaiMs) {
    boss.posture = Math.max(0, boss.posture - S.postureVidageParSeconde * dt / 1000);
  }

  if (boss.etat === 'ouverture' && boss.t >= boss.duree) entrerMarche();
  if (boss.etat === 'vacille' && boss.t >= S.vacilleMs) entrerMarche();

  if (boss.etat === 'meta') {
    if (!boss.metaFait && boss.t >= S.meta.changeMs) {
      boss.metaFait = true;
      boss.phase = 2;
      boss.eteintes = 0;
      boss.eteintesT = [];
      flashMeta = rt;
      eclair = rt;
      explosionFlammes();
    }
    if (boss.t >= S.meta.ms) entrerMarche();
  } else if (boss.etat === 'bond') {
    const p = Math.min(1, boss.t / S.bond.ms);
    boss.x = boss.dash.de + (boss.dash.vers - boss.dash.de) * (1 - (1 - p) * (1 - p));
    if (boss.t - boss.dash.dernierEcho >= S.ruee.echoMs) { echo(); boss.dash.dernierEcho = boss.t; }
    if (p >= 1) entrerMarche();
  } else if (boss.etat === 'marche') {
    // Il approche toujours ; les attaques à distance partent après un temps de marche, ou au contact
    boss.dir = hero.x >= boss.x ? 1 : -1;
    const adistance = ATTAQUES_A_DISTANCE.includes(boss.prochaine);
    if (ecart() <= S.fauchagePortee || (adistance && boss.t >= boss.delaiSort)) lancerBoss(boss.prochaine);
    else boss.x += boss.dir * M.vitesse * (phase2() ? S.phase2.vitesseFacteur : 1) * dt / 1000;
  } else if (boss.etat === 'fauchage') {
    const temps = tempsFrappes();
    while (boss.frappes < temps.length && boss.t >= temps[boss.frappes]) {
      boss.frappes++;
      jouer('fauchage', boss.x);
      coupDuBoss(S.fauchageDegats);
    }
    // Le double Fauchage se retourne vers le héros avant le second coup
    if (boss.variante === 'double' && !boss.retourne && boss.t >= temps[phase2() ? 1 : 0] + S.fauchageZoneMs) {
      boss.retourne = true;
      boss.dir = hero.x >= boss.x ? 1 : -1;
    }
    if (boss.t >= temps[temps.length - 1] + S.fauchageZoneMs) ouverture();
  } else if (boss.etat === 'ruee') {
    const R = S.ruee, A = R.annonceMs * boss.fa;
    if (!boss.dash && boss.t >= A) {
      // la ruée traverse l'arène : elle dépasse le héros et file jusqu'à l'autre côté
      boss.dir = hero.x >= boss.x ? 1 : -1;
      const vers = Math.max(boss.w / 2 + 20, Math.min(S.arenaLargeur - boss.w / 2 - 20, hero.x + boss.dir * R.depassement));
      boss.dash = { de: boss.x, vers, t0: boss.t, ms: Math.max(220, Math.abs(vers - boss.x) / R.vitesse * 1000), dernierEcho: -1e9 };
      jouer('ruee', boss.x);
    }
    if (boss.dash) {
      const d = boss.dash, p = Math.min(1, (boss.t - d.t0) / d.ms);
      boss.x = d.de + (d.vers - d.de) * p;
      if (p < 1 && boss.t - d.dernierEcho >= R.echoMs) { echo(); d.dernierEcho = boss.t; }
      // en passant sur le héros : paré, il s'arrête net ; esquivé, il file derrière lui ; sinon il frappe
      if (!boss.applique && p < 1 && Math.abs(hero.x - boss.x) <= boss.w / 2 + S.heroLargeur / 2 + R.contact) {
        boss.applique = true;
        if (!invulnerable()) {
          const parade = resultatParade();
          if (parade) { heroParade(parade); d.vers = boss.x; d.ms = boss.t - d.t0 + 1; }
          else heroTouche(R.degats * facteurDegats());
        }
      }
      if (p >= 1 && !d.fini) {
        d.fini = true;
        boss.dir = hero.x >= boss.x ? 1 : -1;
      }
      if (d.fini && boss.t >= d.t0 + d.ms + S.fauchageZoneMs * 2) ouverture();
    }
  } else if (boss.etat === 'orbe') {
    const O = S.orbe, A = O.annonceMs * boss.fa, nb = phase2() ? O.phase2Nombre : 1;
    while (boss.tirs < nb && boss.t >= A + boss.tirs * O.ecartMs) {
      boss.tirs++;
      projectiles.push({ x: boss.x + boss.dir * (boss.w / 2 + 12), y: S.solY - O.hauteur, vx: boss.dir * O.vitesse * (phase2() ? O.phase2Vitesse : 1), t0: rt });
      jouer('orbeLancee', boss.x);
    }
    if (boss.tirs >= nb && boss.t >= A + (nb - 1) * O.ecartMs + O.recupMs) ouverture();
  } else if (boss.etat === 'sort') {
    const P = S.phase2, pluie = boss.variante === 'pluie';
    const nb = pluie ? P.pluieMarques : 1, ecartMarques = pluie ? P.pluieEcartMs : 0;
    const SA = S.sortAnnonceMs * boss.fa, delai = S.sortMarqueMs * (phase2() ? P.sortMarqueFacteur : 1);
    while (boss.marques.length < nb && boss.t >= SA + boss.marques.length * ecartMarques) {
      boss.marques.push({ x: hero.x, t0: SA + boss.marques.length * ecartMarques, applique: false, delai });
    }
    for (const m of boss.marques) {
      if (!m.applique && boss.t >= m.t0 + m.delai) {
        m.applique = true;
        eclair = rt;
        lumiereBreve('explosion', m.x, S.solY - 30);
        jouer('explosion', m.x);
        if (chevauche(heroG(), heroD(), m.x - S.sortRayon, m.x + S.sortRayon)) heroTouche(S.sortDegats * facteurDegats());
      }
    }
    const derniere = boss.marques[boss.marques.length - 1];
    if (boss.marques.length === nb && boss.t >= derniere.t0 + derniere.delai + S.sortExplosionMs) ouverture();
  }

  boss.x = Math.max(boss.w / 2, Math.min(S.arenaLargeur - boss.w / 2, boss.x));
}

function avancer(dt) {
  if (arret > 0) { arret -= dt; return; }
  const reel = dt;
  dt *= echelleTemps();
  gt += dt;
  if (jeu.etat !== 'combat') {
    jeu.t += dt;
    jeu.treel += reel;
    if (jeu.etat === 'mort' && jeu.treel >= S.mortMs) recommencer();
    if (jeu.etat === 'intro') {
      if (!jeu.sonEntree && jeu.t >= S.mise.intro.sonMs) { jeu.sonEntree = true; jouer('entreeBoss', boss.x); jouer('rale', boss.x); }
      if (jeu.t >= S.mise.intro.ms) { jeu.etat = 'combat'; jeu.t = 0; essaiDebut = rt; }
    }
    return;
  }
  majHero(dt);
  if (jeu.etat === 'combat') majBoss(dt);
  if (jeu.etat === 'combat') majProjectiles(dt);
}

// ---------- Dessin ----------
// ---------- Décor ----------
// Ruines d'un temple de veilleurs, la nuit : tout est dessiné par le code, plan par plan.

function genererCendres() {
  cendres = [];
  for (let i = 0; i < S.decor.cendres.nombre; i++) {
    cendres.push({ x: Math.random() * window.innerWidth, y: Math.random() * window.innerHeight, v: 0.5 + Math.random(), p: Math.random() * 6.28 });
  }
}

// ---- Flammes et queues de Grimalkin ----
// Facteur commun à toutes les flammes : phase 2, vacillement, mort
function facteurFlammes() {
  const Q = S.queues;
  let f = phase2() ? Q.phase2Facteur : 1;
  if (boss.etat === 'vacille') f *= Q.vacilleFacteur;
  if (jeu.etat === 'victoire') f *= Math.max(0, 1 - jeu.t / S.bossMortMs);
  if (boss.etat === 'meta' && boss.t < S.meta.changeMs) f *= 0.5 + 1.5 * boss.t / S.meta.changeMs;   // les flammes s'emballent
  return f;
}

// 1 pour une flamme allumée, 0 pour une flamme éteinte, avec un fondu
function fondu(i) {
  const t = boss.eteintesT[i];
  return t === undefined ? 1 : Math.max(0, 1 - (rt - t) / S.queues.eteinteMs);
}

// Lumière du boss : elle vient des flammes, moins il en a, plus la scène est sombre
function intensiteFlammes() {
  let allumees = 0;
  for (let i = 0; i < S.queues.nombre; i++) allumees += fondu(i);
  return facteurFlammes() * (0.12 + 0.88 * allumees / S.queues.nombre);
}

// Points de chaque queue, du dos du boss jusqu'à la flamme
function geometrieQueues() {
  const Q = S.queues, e = S.echelleSprite, t = rt / 1000;
  const agit = phase2() ? Q.phase2Ondulation : 1, hzFacteur = phase2() ? Q.phase2OndulationHz : 1;
  const bx = boss.x - boss.dir * Q.baseDx * e, by = S.solY + Q.baseDy * e;
  const queues = [];
  for (let i = 0; i < Q.nombre; i++) {
    const ang = Q.angles[i] * Math.PI / 180;
    const vx = -boss.dir * Math.cos(ang), vy = -Math.sin(ang);
    const L = Q.longueur * (1 + Q.longueurVariation * (((i * 7) % 5) / 2 - 1));
    const pts = [];
    for (let k = 0; k <= Q.segments; k++) {
      const s = k / Q.segments;
      const o = Math.sin(t * Math.PI * 2 * Q.ondulationHz * hzFacteur - s * 3.2 + i * 1.7) * Q.ondulation * agit * s;
      pts.push([bx + vx * L * s - vy * o, by + vy * L * s + vx * o]);
    }
    queues.push(pts);
  }
  return queues;
}

// Lueur au bout de la queue ; le corps de la flamme est fait des particules de feu
function dessinerLueurFlamme(x, y, taille) {
  const F = S.queues.flamme;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const R = taille * F.halo;
  const g = ctx.createRadialGradient(x, y, 0, x, y, R);
  g.addColorStop(0, `rgba(${F.haloCouleur},${F.haloAlpha})`);
  g.addColorStop(1, `rgba(${F.haloCouleur},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(x - R, y - R, R * 2, R * 2);
  ctx.restore();
}

function creerSpritesFeu() {
  const fabriquer = (couleurs) => couleurs.map(c => {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 64;
    const g = cv.getContext('2d');
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, `rgba(${c},1)`);
    gr.addColorStop(0.45, `rgba(${c},0.5)`);
    gr.addColorStop(1, `rgba(${c},0)`);
    g.fillStyle = gr;
    g.fillRect(0, 0, 64, 64);
    return cv;
  });
  const fl = M.flammes || S.queues.feu;
  spritesFeu = { f1: fabriquer(fl.couleurs), f2: fabriquer(fl.couleurs2), o: fabriquer(S.orbe.couleurs) };
  spriteFumee = document.createElement('canvas');
  spriteFumee.width = spriteFumee.height = 64;
  const g = spriteFumee.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(26,20,22,1)');
  gr.addColorStop(1, 'rgba(26,20,22,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 64, 64);
}

// Chaque particule passe du cœur blanc au rouge sombre en montant : c'est ce qui fait la flamme
function dessinerFeux() {
  const F = S.queues.feu;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const p of feux) {
    const a = (rt - p.t0) / p.vie;
    if (a < 0 || a >= 1) continue;
    const s = p.s * (1 - 0.7 * a);
    ctx.globalAlpha = F.alpha * (1 - a * a);
    const jeuSprites = spritesFeu[p.pal || 'f1'], n = jeuSprites.length;
    ctx.drawImage(jeuSprites[Math.min(n - 1, Math.floor(a * n))], p.x - s, p.y - s * F.etirement, s * 2, s * 2 * F.etirement);
  }
  ctx.restore();
}

function dessinerQueues() {
  const Q = S.queues, f = facteurFlammes();
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
    const bout = pts[n], fi = f * fondu(i);
    if (fi > 0.02) dessinerLueurFlamme(bout[0], bout[1], Q.flamme.taille * fi);
    else if (jeu.etat !== 'victoire') {   // queue éteinte : une braise qui couve
      ctx.fillStyle = `rgba(190,40,10,${0.35 + 0.25 * Math.sin(rt / 300 + i)})`;
      ctx.beginPath();
      ctx.arc(bout[0], bout[1], 2.6, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  dessinerFeux();
}

// ---- Particules, mises à jour à chaque image ----
// Les cinq flammes jaillissent d'un coup, à la métamorphose
function explosionFlammes() {
  const F = S.queues.feu;
  for (const pts of geometrieQueues()) {
    const bout = pts[pts.length - 1];
    for (let k = 0; k < S.meta.explosion; k++) {
      feux.push({ x: bout[0], y: bout[1], vx: (Math.random() - 0.5) * 240, vy: -60 - Math.random() * 200, t0: rt, vie: 500 + Math.random() * 600,
        s: 7 + Math.random() * 9, ph: Math.random() * 6.28, pal: 'f2' });
    }
    for (let k = 0; k < 10; k++) {
      fumees.push({ x: bout[0], y: bout[1] - Math.random() * 20, vx: (Math.random() - 0.5) * 60, vy: -S.queues.fumeeMonte * (1 + Math.random()), t0: rt });
    }
  }
}

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

  const F = Q.feu, tire = (p) => p[0] + Math.random() * (p[1] - p[0]);
  if (jeu.etat !== 'depart') {
    geometrieQueues().forEach((pts, i) => {
      const fi = facteurFlammes() * fondu(i), bout = pts[pts.length - 1];
      if (fi < 0.03) return;
      for (let reste = F.parSeconde * fi * dt / 1000; reste > 0; reste--) {
        if (Math.random() < Math.min(1, reste) && feux.length < F.max) {
          feux.push({ x: bout[0] + (Math.random() - 0.5) * F.etalement, y: bout[1], vx: (Math.random() - 0.5) * F.derive,
            vy: -tire(F.montee), t0: rt, vie: tire(F.vie), s: tire(F.taille) * fi, ph: Math.random() * 6.28, pal: phase2() ? 'f2' : 'f1' });
        }
      }
      if (Math.random() < Q.braisesParSeconde * fi * dt / 1000 && braises.length < Q.braisesMax) {
        braises.push({ x: bout[0], y: bout[1], vx: (Math.random() - 0.5) * Q.braiseVitesse, vy: -Q.braiseVitesse * (0.5 + Math.random()), t0: rt });
      }
      if (Math.random() < Q.fumeeParSeconde * fi * dt / 1000 && fumees.length < Q.fumeeMax) {
        fumees.push({ x: bout[0], y: bout[1] - Q.flamme.taille * fi * 0.9, vx: (Math.random() - 0.3) * 14, vy: -Q.fumeeMonte * (0.6 + Math.random() * 0.6), t0: rt });
      }
    });
  }
  for (const p of projectiles) {
    for (let reste = S.orbe.particulesParSeconde * dt / 1000; reste > 0; reste--) {
      if (Math.random() < Math.min(1, reste) && feux.length < F.max) {
        feux.push({ x: p.x + (Math.random() - 0.5) * 8, y: p.y + (Math.random() - 0.5) * 8, vx: -p.vx * 0.08 + (Math.random() - 0.5) * 40,
          vy: (Math.random() - 0.5) * 60, t0: rt, vie: 260 + Math.random() * 260, s: 5 + Math.random() * 6, ph: Math.random() * 6.28, pal: 'o' });
      }
    }
  }
  feux = feux.filter(p => rt - p.t0 < p.vie);
  for (const p of feux) {
    p.x += (p.vx + Math.sin(rt / 1000 * Math.PI * 2 * F.turbulenceHz + p.ph) * F.turbulence) * dt / 1000;
    p.y += p.vy * dt / 1000;
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
// Le ciel est une image peinte, calée en haut de l'écran et agrandie pour le couvrir
function dessinerCiel() {
  const W = window.innerWidth, H = window.innerHeight, im = images['decor-ciel'];
  const k = Math.max(W / im.width, H / im.height);
  ctx.drawImage(im, (W - im.width * k) / 2, 0, im.width * k, im.height * k);
}

// Une couche du décor : l'image pose sa base sur la ligne du sol, les plus lointaines bougent le moins
function dessinerCouche(nom, parallaxe, cx, decalage = 0) {
  const D = S.decor, im = images[nom];
  const w = im.width / D.pixelsParUnite, h = im.height / D.pixelsParUnite;
  ctx.drawImage(im, -D.marge - (cx - S.arenaLargeur / 2) * parallaxe, S.solY + decalage - h, w, h);
}

function dessinerSol() {
  const D = S.decor, im = images['decor-sol'];
  const w = im.width / D.pixelsParUnite, h = im.height / D.pixelsParUnite;
  ctx.drawImage(im, -D.marge, S.solY, w, h);
  ctx.fillStyle = D.solFond;
  ctx.fillRect(-D.marge, S.solY + h - 1, w, S.hauteurInterface * 4);
  // Le sol est plus clair autour des personnages, la lumière vient des flammes
  const L = D.lumiere, lx = (hero.x + boss.x) / 2;
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

// Nappes de brume : une image tuilée qui défile
function dessinerBrume(devant) {
  const D = S.decor, x0 = -D.marge, x1 = S.arenaLargeur + D.marge;
  for (const n of D.brume) {
    if (n.devant !== devant) continue;
    const im = images[n.img];
    const w = im.width / D.pixelsParUnite * n.echelle, h = im.height / D.pixelsParUnite * n.echelle;
    const dec = (((rt / 1000 * n.vitesse) % w) + w) % w;
    ctx.globalAlpha = n.alpha;
    for (let x = x0 - w + dec; x < x1; x += w - 2) ctx.drawImage(im, x, S.solY + n.y - h / 2, w, h);
  }
  ctx.globalAlpha = 1;
}

// Masses très sombres et floues au premier plan, devant les personnages, aux deux bouts de l'arène
function dessinerPremierPlan(cx) {
  const D = S.decor, F = D.premierPlan, im = images[F.img];
  const w = im.width / D.pixelsParUnite, h = im.height / D.pixelsParUnite, off = -(cx - S.arenaLargeur / 2) * F.parallaxe;
  const y = S.solY + F.bas - h;
  ctx.globalAlpha = F.alpha;
  ctx.drawImage(im, -F.x + off, y, w, h);
  ctx.save();
  ctx.translate(S.arenaLargeur + F.x + off, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(im, 0, y, w, h);
  ctx.restore();
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
  if (blanc.type === 'bloque') {   // coup sur un boss protégé : seulement des étincelles
    if (age >= B.bloqueMs) return 0;
    ctx.save();
    ctx.globalAlpha = 1 - age / B.bloqueMs;
    ctx.strokeStyle = '#fff0c8';
    ctx.lineWidth = 2;
    for (const [a, v] of blanc.lignes) {
      ctx.beginPath();
      ctx.moveTo(blanc.x + Math.cos(a) * B.bloqueRayon * 0.4, blanc.y + Math.sin(a) * B.bloqueRayon * 0.4);
      ctx.lineTo(blanc.x + Math.cos(a) * B.bloqueRayon * (0.8 + v * 1.2), blanc.y + Math.sin(a) * B.bloqueRayon * (0.8 + v * 1.2));
      ctx.stroke();
    }
    ctx.restore();
    return 0;
  }
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
    dessinerSilhouette(nomH, fh, hero.x, hero.etat === 'esquive' ? hero.esquiveDir < 0 : hero.dir < 0, S.heroSprite);
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
    const t = Q.fumeeTaille * (0.7 + a * 1.8);
    ctx.globalAlpha = Q.fumeeAlpha * (1 - a);
    ctx.drawImage(spriteFumee, p.x - t, p.y - t, t * 2, t * 2);
    ctx.globalAlpha = 1;
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
  const fm = (rt - flashMeta) / S.meta.flashMs;
  if (fm >= 0 && fm < 1) {
    ctx.fillStyle = `rgba(255,244,230,${1 - fm})`;
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
const noms = ['heros-attente', 'heros-course', 'heros-esquive', 'heros-attaque1', 'heros-attaque2', 'heros-touche', 'heros-mort',
  'boss-attente', 'boss-marche', 'boss-fauchage', 'boss-incantation', 'boss-sort', 'boss-touche', 'boss-mort',
  'boss2-attente', 'boss2-marche', 'boss2-fauchage', 'boss2-incantation', 'boss2-touche', 'boss2-mort',
  'fx-parade-parfaite', 'fx-parade-simple', 'fx-degat-heros', 'fx-degat-boss', 'fx-bloque',
  'decor-ciel', 'decor-ruine2', 'decor-ruine', 'decor-colonnes', 'decor-pres', 'decor-sol', 'decor-brume1', 'decor-brume2', 'decor-premier-plan'];
const images = {};
let chargees = 0;
let repeint = false;      // les planches ont été repeintes d'après la fiche
for (const nom of noms) {
  const im = new Image();
  im.onload = () => { chargees++; if (chargees === noms.length) repeindreTout(); };
  im.src = `images/${nom}.${nom.startsWith('decor') ? 'webp' : 'png'}?v=${S.version}`;
  images[nom] = im;
}
const pret = () => repeint;

// Repeint une planche : désaturation, puis remplacement par la rampe de la fiche ; les couleurs d'accent restent
function repeindre(im, pal) {
  const cv = document.createElement('canvas');
  cv.width = im.width;
  cv.height = im.height;
  const g = cv.getContext('2d');
  g.drawImage(im, 0, 0);
  const img = g.getImageData(0, 0, cv.width, cv.height), px = img.data;
  const rampe = pal.rampe.map(c => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]);
  const [lo, hi] = pal.contraste, tol2 = pal.tolerance * pal.tolerance;
  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] === 0) continue;
    const r = px[i], gg = px[i + 1], b = px[i + 2];
    let accent = false;
    for (const a of pal.accents) {
      const dr = r - a[0], dg = gg - a[1], db = b - a[2];
      if (dr * dr + dg * dg + db * db < tol2) { accent = true; break; }
    }
    if (accent) continue;
    const lum = (0.299 * r + 0.587 * gg + 0.114 * b) / 255;
    const t = Math.max(0, Math.min(1, (lum - lo) / (hi - lo))) * (rampe.length - 1);
    const k = Math.min(rampe.length - 2, Math.floor(t)), f = t - k;
    for (let c = 0; c < 3; c++) px[i + c] = rampe[k][c] + (rampe[k + 1][c] - rampe[k][c]) * f;
  }
  g.putImageData(img, 0, 0);
  return cv;
}

function repeindreTout() {
  for (const nom of noms) {
    const estBoss = nom.startsWith('boss') && nom !== 'boss-sort';
    const pal = estBoss ? M.palette : nom.startsWith('heros') ? S.heroFiche.palette : null;
    if (pal) images[nom] = repeindre(images[nom], pal);
  }
  repeint = true;
}

// Image et nombre de vignettes d'une planche
function anim(nom) {
  const im = images[nom];
  const fl = nom.startsWith('heros') ? S.heroSprite.largeur : nom.startsWith('fx') ? S.fxSprite.largeur : S.bossSprite.largeur;
  return [im, Math.round(im.width / fl)];
}
const boucle_ = (n) => Math.floor(gt * S.animFps / 1000) % n;
const part = (t, duree, n) => Math.max(0, Math.min(n - 1, Math.floor(t / duree * n)));
const nbFrames = (nom) => anim(nom)[1];

function frameHero() {
  if (jeu.etat === 'mort') return ['heros-mort', part(jeu.t, S.mortMs, nbFrames('heros-mort'))];
  if (hero.etat === 'esquive') return ['heros-esquive', part(hero.t, S.esquiveMs, nbFrames('heros-esquive'))];
  if (hero.etat === 'attaque') {
    const nom = hero.attaqueN === 2 ? 'heros-attaque2' : 'heros-attaque1';
    return [nom, part(hero.t, S.attaqueMs, nbFrames(nom))];
  }
  if (hero.etat === 'touche') return ['heros-touche', 0];
  const nom = jeu.etat === 'combat' && direction() !== 0 ? 'heros-course' : 'heros-attente';
  return [nom, boucle_(nbFrames(nom))];
}

// Planches du boss : la phase 2 a les siennes (fourrure roussie, deux lames)
function prefixeBoss() {
  return boss.phase === 2 && !(boss.etat === 'meta' && boss.t < S.meta.changeMs) ? 'boss2' : 'boss';
}

function frameBoss() {
  const pre = prefixeBoss();
  const nom = (n) => pre + '-' + n;
  const imp = S.fauchageFrameImpact, Z = S.fauchageZoneMs;
  if (jeu.etat === 'victoire') return [nom('mort'), part(jeu.t, S.bossMortMs, nbFrames(nom('mort')))];
  if (jeu.etat === 'intro') {          // le boss se redresse : courbé, puis les bras se lèvent, puis il se tient droit
    const I = S.mise.intro;
    if (jeu.t < I.releveDebut) return [nom('touche'), 1];
    if (jeu.t < I.releveDebut + I.releveMs) return [nom('incantation'), part(jeu.t - I.releveDebut, I.releveMs, nbFrames(nom('incantation')))];
    return [nom('attente'), boucle_(nbFrames(nom('attente')))];
  }
  if (boss.etat === 'meta') {
    if (boss.t < S.meta.changeMs) return [nom('touche'), boucle_(nbFrames(nom('touche')))];
    return [nom('incantation'), part(boss.t - S.meta.changeMs, S.meta.ms - S.meta.changeMs, nbFrames(nom('incantation')))];
  }
  if (boss.etat === 'vacille') return [nom('touche'), boucle_(nbFrames(nom('touche')))];
  if (boss.etat === 'fauchage') {
    const n = nbFrames(nom('fauchage')), T = tempsFrappes(), t = boss.t;
    let k = -1;
    for (let i = 0; i < T.length; i++) if (t >= T[i]) k = i;
    if (k >= 0 && t < T[k] + Z) return [nom('fauchage'), imp + part(t - T[k], Z, n - imp)];   // le coup
    if (k + 1 < T.length) {                                                                      // l'élan, ou l'élan tenu
      const debut = k >= 0 ? T[k] + Z : 0;
      const duree = k < 0 && boss.variante === 'retarde' ? S.fauchageAnnonceMs * boss.fa : T[k + 1] - debut;
      const local = t - debut;
      return [nom('fauchage'), local >= duree ? imp - 1 : part(local, duree, imp)];
    }
    return [nom('fauchage'), n - 1];
  }
  if (boss.etat === 'ruee') {
    const n = nbFrames(nom('fauchage')), R = S.ruee;
    if (!boss.dash) return [nom('fauchage'), part(boss.t, R.annonceMs * boss.fa, imp - 1)];   // il se ramasse, lames en arrière
    const fin = boss.dash.t0 + boss.dash.ms;
    if (boss.t < fin) return [nom('fauchage'), imp + 1];                                        // la fente, buste penché
    return [nom('fauchage'), imp + part(boss.t - fin, Z, n - imp)];
  }
  if (boss.etat === 'orbe') return [nom('incantation'), part(boss.t, S.orbe.annonceMs * boss.fa, nbFrames(nom('incantation')))];
  if (boss.etat === 'sort') return [nom('incantation'), part(boss.t, S.sortAnnonceMs * boss.fa, nbFrames(nom('incantation')))];
  if (gt - boss.flash < S.bossFlashMs) return [nom('touche'), part(gt - boss.flash, S.bossFlashMs, nbFrames(nom('touche')))];
  if (boss.etat === 'marche' || boss.etat === 'bond') return [nom('marche'), boucle_(nbFrames(nom('marche')))];
  return [nom('attente'), boucle_(nbFrames(nom('attente')))];
}

// Dessine la vignette f d'une planche, les pieds posés sur le sol
function dessinerSprite(im, f, x, miroir, sp, pivotX = sp.pivotX) {
  const e = S.echelleSprite * (sp === S.bossSprite ? M.echelle : 1);
  ctx.save();
  ctx.translate(x, S.solY);
  if (miroir) ctx.scale(-1, 1);
  ctx.drawImage(im, f * sp.largeur, 0, sp.largeur, sp.hauteur, -pivotX * e, -sp.pivotY * e, sp.largeur * e, sp.hauteur * e);
  ctx.restore();
}

// Les lames luisent en blanc pendant l'élan tenu du Fauchage retardé
function dessinerLueur() {
  if (boss.etat !== 'fauchage' || boss.variante !== 'retarde') return;
  const A = S.fauchageAnnonceMs * boss.fa, R = S.fauchageRetardeMs * boss.fa;
  if (boss.t < A || boss.t >= R) return;
  const l = S.lueurFaux, e = S.echelleSprite;
  const x = boss.x - boss.dir * l.dx * e, y = S.solY + l.dy * e;
  const pulse = 0.6 + 0.4 * Math.sin(boss.t / 1000 * Math.PI * 2 * l.pulseHz);
  const g = ctx.createRadialGradient(x, y, 0, x, y, l.rayon);
  g.addColorStop(0, `rgba(255,255,255,${l.alpha * pulse})`);
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - l.rayon, y - l.rayon, l.rayon * 2, l.rayon * 2);
}

// Le coup affiché en ce moment : { debut, k } (k : numéro du coup, la seconde lame frappe en sens inverse)
function frappeCourante() {
  const Z = S.fauchageZoneMs;
  if (boss.etat === 'fauchage') {
    const T = tempsFrappes();
    let k = -1;
    for (let i = 0; i < T.length; i++) if (boss.t >= T[i]) k = i;
    if (k >= 0 && boss.t < T[k] + Z) return { debut: T[k], k };
  }
  return null;
}

// Arc clair qui suit la lame pendant le coup
function dessinerArc() {
  const frappe = frappeCourante();
  if (!frappe) return;
  const p = Math.min(1, (boss.t - frappe.debut) / S.fauchageZoneMs);
  const rad = Math.PI / 180;
  const sens = frappe.k % 2 ? -1 : 1;                 // la seconde lame balaie de bas en haut
  const debutA = sens > 0 ? S.arcDebutDeg : S.arcFinDeg, finA = sens > 0 ? S.arcFinDeg : S.arcDebutDeg;
  const tete = debutA + (finA - debutA) * p;
  const queue = sens > 0 ? Math.max(debutA, tete - S.arcQueueDeg) : Math.min(debutA, tete + S.arcQueueDeg);
  const cx = boss.x, cy = S.solY - S.arcCentreHauteur;
  const rayon = S.fauchagePortee + boss.w / 2;
  ctx.save();
  ctx.beginPath();
  ctx.rect(-S.decor.marge, -S.hauteurInterface * 4, S.arenaLargeur + 2 * S.decor.marge, S.hauteurInterface * 4 + S.solY);
  ctx.clip();
  ctx.strokeStyle = M.effets.trainee.couleur;
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
  const frac = Math.min(1, t / m.delai);
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

// Images rémanentes du boss pendant ses fentes
// ---- Lumières ----
function creerCartes() {
  const k = S.lumiere.resolution, w = Math.max(2, Math.round(window.innerWidth * k)), h = Math.max(2, Math.round(window.innerHeight * k));
  const faire = () => { const c = document.createElement('canvas'); c.width = w; c.height = h; return { c, g: c.getContext('2d') }; };
  cartes = { ambiante: faire(), lueur: faire(), k };
}

// Une lumière brève, posée dans le monde : elle s'éteint en S.lumiere[regle].ms
function lumiereBreve(regle, x, y) {
  lumieresTemps.push({ x, y, regle, t0: rt });
}

function melange(a, b, t) {
  const A = a.split(',').map(Number), B = b.split(',').map(Number);
  return A.map((v, i) => Math.round(v + (B[i] - v) * t));
}

// Fabrique la carte de lumière, puis la pose sur l'image : multiplication (ombre), puis éclat additif
function dessinerLumieres(cx) {
  if (!cartes) return;
  const W = window.innerWidth, H = window.innerHeight, z = cam.z, L = S.lumiere, k = cartes.k;
  const A = cartes.ambiante.g, E = cartes.lueur.g;
  const sx = (x) => (W / 2 + (x - cx) * z) * k, sy = (y) => (H * S.solEcranRatio + (y - S.solY) * z) * k;
  // ambiance : bleu nuit, rouge en phase 2, éclairée d'un coup par l'éclair d'un Sort
  const cible = phase2() ? 1 : 0;
  ambianceT += (cible - ambianceT) * Math.min(1, 16 / L.changementMs * 60 / 60);
  const ea = (rt - eclair) / S.decor.eclair.ms;
  const boost = ea >= 0 && ea < 1 ? (1 - ea) * L.eclairBoost : 0;
  const amb = melange(L.ambiante, L.ambiante2, ambianceT).map(v => Math.min(255, Math.round(v + boost * (255 - v) * 0.7)));
  A.globalCompositeOperation = 'source-over';
  A.fillStyle = `rgb(${amb[0]},${amb[1]},${amb[2]})`;
  A.fillRect(0, 0, cartes.ambiante.c.width, cartes.ambiante.c.height);
  E.fillStyle = '#000';
  E.fillRect(0, 0, cartes.lueur.c.width, cartes.lueur.c.height);
  A.globalCompositeOperation = 'lighter';
  E.globalCompositeOperation = 'lighter';

  const source = (x, y, rayon, couleur, alpha, lueur) => {
    const r = rayon * z * k;
    if (r < 1 || alpha <= 0.01) return;
    for (const [g, a] of [[A, alpha], [E, alpha * lueur]]) {
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, `rgba(${couleur},${Math.min(1, a)})`);
      gr.addColorStop(0.45, `rgba(${couleur},${Math.min(1, a) * 0.38})`);
      gr.addColorStop(1, `rgba(${couleur},0)`);
      g.fillStyle = gr;
      g.fillRect(x - r, y - r, r * 2, r * 2);
    }
  };

  // la lune : une grande lumière froide venue d'en haut à droite
  const m = L.lune, mx = W * m.x * k, my = H * m.y * k, mr = W * m.rayon * k;
  for (const [g, a] of [[A, m.alpha], [E, m.alpha * m.lueur]]) {
    const gr = g.createRadialGradient(mx, my, 0, mx, my, mr);
    gr.addColorStop(0, `rgba(${m.couleur},${a})`);
    gr.addColorStop(1, `rgba(${m.couleur},0)`);
    g.fillStyle = gr;
    g.fillRect(0, 0, cartes.ambiante.c.width, cartes.ambiante.c.height);
  }
  // le guerrier garde une lueur froide : il reste lisible
  source(sx(hero.x), sy(S.solY - L.heros.hauteur), L.heros.rayon, L.heros.couleur, L.heros.alpha, L.heros.lueur);

  // le boss et ses flammes
  if (jeu.etat !== 'victoire' || jeu.t < S.bossMortMs) {
    const fg = facteurFlammes();
    const F = L.flammes, scint = (i) => 0.78 + 0.22 * Math.sin(rt / 1000 * Math.PI * 2 * F.scintillementHz + i * 1.9) + 0.06 * Math.sin(rt / 90 + i);
    geometrieQueues().forEach((pts, i) => {
      const fi = fg * fondu(i);
      if (fi < 0.03) return;
      const bout = pts[pts.length - 1];
      source(sx(bout[0]), sy(bout[1] - 8), F.rayon * Math.min(1.5, fi), phase2() ? F.couleur2 : F.couleur, F.alpha * scint(i), F.lueur);
    });
    const lum = intensiteFlammes();
    source(sx(boss.x), sy(S.solY - L.corps.hauteur * M.echelle), L.corps.rayon * M.echelle, L.corps.couleur, L.corps.alpha * Math.min(1.4, lum * 1.4), L.corps.lueur);
    source(sx(boss.x), sy(S.solY - M.effets.lueurTete.hauteur * M.echelle), L.tete.rayon, M.effets.lueurTete.couleur, L.tete.alpha * (0.7 + 0.3 * Math.sin(rt / 1000 * Math.PI * 2 * M.effets.lueurTete.pulseHz)), L.tete.lueur);
  }
  // orbes et marques du Sort
  for (const p of projectiles) source(sx(p.x), sy(p.y), L.orbe.rayon, L.orbe.couleur, L.orbe.alpha, L.orbe.lueur);
  for (const mq of boss.marques) {
    const t = boss.t - mq.t0, f = mq.applique ? 1 : Math.min(1, 0.25 + 0.75 * t / mq.delai);
    source(sx(mq.x), sy(S.solY - 8), S.sortRayon * L.marque.rayon, L.marque.couleur, L.marque.alpha * f, L.marque.lueur);
  }
  // lumières brèves : impacts, coups, explosions
  lumieresTemps = lumieresTemps.filter(l => rt - l.t0 < L[l.regle].ms);
  for (const l of lumieresTemps) {
    const R = L[l.regle], a = 1 - (rt - l.t0) / R.ms;
    source(sx(l.x), sy(l.y), R.rayon, R.couleur, R.alpha * a, R.lueur);
  }

  // pose : l'ombre multiplie l'image, l'éclat s'ajoute
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.drawImage(cartes.ambiante.c, 0, 0, W, H);
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = L.lueurAlpha;
  ctx.drawImage(cartes.lueur.c, 0, 0, W, H);
  ctx.restore();
}

// Faisceaux de lune qui tombent des baies : de la lumière dans l'air, qui respire doucement
function dessinerRayons(cx) {
  const R = S.lumiere.rayons;
  const off = -(cx - S.arenaLargeur / 2) * R.parallaxe;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < R.nombre; i++) {
    const xb = -120 + (S.arenaLargeur + 240) * (i + 0.5) / R.nombre + off;   // pied du faisceau
    const xh = xb + R.inclinaison;                                           // sommet : plus à droite, vers la lune
    const yb = S.solY + 8, yh = S.solY - R.hauteur;
    const vie = 0.7 + 0.3 * Math.sin(rt / 1000 * Math.PI * 2 * R.respirationHz + i * 1.3);
    const g = ctx.createLinearGradient(xh, yh, xb, yb);
    g.addColorStop(0, `rgba(${R.couleur},${R.alpha * vie})`);
    g.addColorStop(1, `rgba(${R.couleur},0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(xh - R.largeurHaut / 2, yh);
    ctx.lineTo(xh + R.largeurHaut / 2, yh);
    ctx.lineTo(xb + R.largeurBas / 2, yb);
    ctx.lineTo(xb - R.largeurBas / 2, yb);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

// Ombre douce sous un personnage, posée sur les dalles
function dessinerOmbre(x, largeur) {
  const O = S.ombre, rx = largeur / 2;
  ctx.save();
  ctx.translate(x, S.solY + 3);
  ctx.scale(1, O.aplat);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  g.addColorStop(0, `rgba(0,0,0,${O.alpha})`);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(-rx, -rx, rx * 2, rx * 2);
  ctx.restore();
}

// Lueur qui pulse au niveau de la tête du boss, plus vive en phase 2
function dessinerLueurTete() {
  if (jeu.etat === 'victoire') return;
  const E = M.effets, L = E.lueurTete, f = phase2() ? E.phase2 : 1;
  const pulse = 0.65 + 0.35 * Math.sin(rt / 1000 * Math.PI * 2 * L.pulseHz * (phase2() ? 1.5 : 1));
  const x = boss.x, y = S.solY - L.hauteur * M.echelle;
  const R = L.rayon * f;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(x, y, 0, x, y, R * 2.4);
  g.addColorStop(0, `rgba(${L.couleur},${L.alpha * pulse * Math.min(1.6, f)})`);
  g.addColorStop(1, `rgba(${L.couleur},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(x - R * 2.4, y - R * 2.4, R * 4.8, R * 4.8);
  ctx.restore();
}

// Particules du lot 9 : cendres ou braises du corps du boss, poussière de l'esquive, étincelles des coups

function poussiere(x, sens) {
  const P = S.poussiere;
  for (let k = 0; k < P.nombre; k++) {
    particules.push({ type: 'poussiere', x: x + (Math.random() - 0.5) * 16, y: S.solY - 2 - Math.random() * 5,
      vx: -sens * P.vitesse * (0.3 + Math.random()) , vy: -10 - Math.random() * 26, t0: rt, vie: P.vie * (0.6 + Math.random() * 0.6) });
  }
}

function etincelles(x, y, sens) {
  const E = S.etincelles;
  for (let k = 0; k < E.nombre; k++) {
    const a = (Math.random() - 0.5) * 2.2 - (sens > 0 ? 0 : Math.PI) * 0;
    particules.push({ type: 'etincelle', x, y, vx: (-sens) * Math.cos(a) * E.vitesse * (0.4 + Math.random()), vy: Math.sin(a) * E.vitesse * (0.8 + Math.random()) - 40,
      t0: rt, vie: E.vie * (0.6 + Math.random() * 0.7) });
  }
}

function majParticules(dt) {
  const E = M.effets.corps, f = phase2() ? M.effets.phase2 : 1;
  if (jeu.etat === 'combat' && boss.etat !== 'meta' && particules.length < 220) {
    for (let reste = E.parSeconde * f * dt / 1000; reste > 0; reste--) {
      if (Math.random() < Math.min(1, reste)) {
        particules.push({ type: 'corps', x: boss.x + (Math.random() - 0.5) * boss.w * 1.2, y: S.solY - 18 - Math.random() * 100 * M.echelle,
          vx: (Math.random() - 0.5) * 12, vy: -E.montee * (0.6 + Math.random() * 0.8), t0: rt, vie: E.vie * (0.6 + Math.random() * 0.7) });
      }
    }
  }
  if (jeu.etat === 'victoire' && jeu.treel < S.mise.victoire.cendresMs && particules.length < 400) {
    for (let reste = S.mise.victoire.cendresParSeconde * dt / 1000; reste > 0; reste--) {
      if (Math.random() < Math.min(1, reste)) {
        particules.push({ type: 'cendreMort', x: boss.x + (Math.random() - 0.5) * boss.w * 1.6, y: S.solY - 8 - Math.random() * 120 * M.echelle,
          vx: (Math.random() - 0.5) * 40, vy: -20 - Math.random() * 40, t0: rt, vie: 1300 + Math.random() * 1200 });
      }
    }
  }
  particules = particules.filter(p => rt - p.t0 < p.vie);
  for (const p of particules) {
    p.x += p.vx * dt / 1000;
    p.y += p.vy * dt / 1000;
    if (p.type === 'etincelle') p.vy += S.etincelles.gravite * dt / 1000;
  }
}

function dessinerParticules() {
  const C = M.effets.corps, P = S.poussiere, E = S.etincelles;
  for (const p of particules) {
    const a = 1 - (rt - p.t0) / p.vie;
    if (p.type === 'poussiere') {
      ctx.fillStyle = `rgba(${P.couleur},${P.alpha * a})`;
      const t = P.taille * (1.6 - a);
      ctx.fillRect(p.x - t, p.y - t, t * 2, t * 2);
    } else if (p.type === 'cendreMort') {
      ctx.fillStyle = `rgba(150,142,134,${0.8 * a})`;
      ctx.fillRect(p.x, p.y, 2.6, 2.6);
    } else if (p.type === 'etincelle') {
      ctx.strokeStyle = `rgba(${E.couleur},${a})`;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - p.vx * 0.03, p.y - p.vy * 0.03);
      ctx.stroke();
    } else {
      ctx.globalAlpha = a * (C.braise ? 0.95 : 0.5);
      ctx.fillStyle = C.couleur;
      ctx.fillRect(p.x, p.y, 2, 2);
      ctx.globalAlpha = 1;
    }
  }
}

function dessinerEchos() {
  echos = echos.filter(e => rt - e.t0 < S.ruee.echoVieMs);
  for (const e of echos) {
    ctx.globalAlpha = S.ruee.echoAlpha * (1 - (rt - e.t0) / S.ruee.echoVieMs);
    dessinerSprite(images[e.nom], e.f, e.x, e.dir > 0, S.bossSprite);
  }
  ctx.globalAlpha = 1;
}

// Orbes magiques : un noyau noir cerclé de braise, une traînée de feu et de fumée
function dessinerProjectiles() {
  const O = S.orbe;
  for (const p of projectiles) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, O.halo);
    g.addColorStop(0, 'rgba(210,70,20,0.42)');
    g.addColorStop(1, 'rgba(120,20,8,0)');
    ctx.fillStyle = g;
    ctx.fillRect(p.x - O.halo, p.y - O.halo, O.halo * 2, O.halo * 2);
    ctx.restore();
    ctx.fillStyle = '#060304';
    ctx.beginPath();
    ctx.arc(p.x, p.y, O.rayon * 0.85, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,128,40,0.9)';
    ctx.lineWidth = 2.4;
    ctx.stroke();
  }
}

// Sprites d'impact : une image toutes les S.fx.imageMs, pour un rendu saccadé
function dessinerFx() {
  fxListe = fxListe.filter(f => {
    const [, n] = anim(f.nom);
    return Math.floor((rt - f.t0) / S.fx.imageMs) < n;
  });
  const e = S.fx.echelle, sp = S.fxSprite;
  for (const f of fxListe) {
    const [im, n] = anim(f.nom);
    const i = Math.min(n - 1, Math.floor((rt - f.t0) / S.fx.imageMs));
    ctx.save();
    ctx.translate(f.x, f.y);
    if (f.miroir) ctx.scale(-1, 1);
    ctx.drawImage(im, i * sp.largeur, 0, sp.largeur, sp.hauteur, -sp.largeur * e / 2, -sp.hauteur * e / 2, sp.largeur * e, sp.hauteur * e);
    ctx.restore();
  }
}

function respiration() {
  if (jeu.etat === 'victoire') return { dy: 0, ey: 1 };
  const R = S.respiration, p2 = phase2();
  const s = Math.sin(rt / 1000 * Math.PI * 2 * (p2 ? R.hz2 : R.hz));
  return { dy: -(p2 ? R.amplitude2 : R.amplitude) * (0.5 + 0.5 * s), ey: 1 + R.ecrasement * s };
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
  let kick = 1;
  for (const k of kicks) kick *= 1 + k.delta * Math.max(0, 1 - (rt - k.t0) / k.ms);
  const z = cam.z * kick;
  const demi = W / z / 2;
  const cx = S.arenaLargeur <= demi * 2 ? S.arenaLargeur / 2 : Math.max(demi, Math.min(S.arenaLargeur - demi, cam.x));
  ctx.save();
  ctx.setTransform(d * z, 0, 0, d * z, d * (W / 2 - cx * z), d * (H * S.solEcranRatio - S.solY * z));
  if (tremble && rt - tremble.debut < tremble.duree) {
    const a = tremble.amp * (1 - (rt - tremble.debut) / tremble.duree);
    ctx.translate((Math.random() * 2 - 1) * a, (Math.random() * 2 - 1) * a);
  }
  ctx.imageSmoothingEnabled = false;
  for (const c of S.decor.couches) dessinerCouche(c.img, c.parallaxe, cx);
  dessinerSol();
  dessinerRayons(cx);
  dessinerCouche(S.decor.pres.img, S.decor.pres.parallaxe, cx, S.decor.pres.bas);
  dessinerBrume(false);
  dessinerHalo();

  for (const m of boss.marques) {
    dessinerRunes(m);
    const total = m.delai + S.sortExplosionMs;
    const [im, n] = anim('boss-sort');
    const f = Math.max(0, Math.min(n - 1, Math.floor((boss.t - m.t0) / total * n)));
    dessinerSprite(im, f, m.x, false, S.bossSprite, S.sortPivotX);
  }

  dessinerOmbre(boss.x, boss.w * S.ombre.largeurBoss * M.echelle * 2);
  dessinerOmbre(hero.x, S.heroLargeur * S.ombre.largeurHeros * 1.6);
  dessinerEchos();
  dessinerQueues();
  const [nomB, fb] = frameBoss();
  const rp = respiration();
  ctx.save();
  ctx.translate(boss.x, S.solY + rp.dy);
  ctx.scale(1, rp.ey);
  ctx.translate(-boss.x, -S.solY);
  dessinerSprite(images[nomB], fb, boss.x, boss.dir > 0, S.bossSprite);
  ctx.restore();
  dessinerLueurTete();
  dessinerLueur();
  dessinerArc();

  dessinerHaloHeros();

  // Le héros à bout d'endurance s'efface et vacille
  const epuise = hero.endurance <= 0 && jeu.etat === 'combat';
  ctx.globalAlpha = invulnerable() ? S.esquiveAlpha : epuise ? S.signaux.epuiseAlpha : 1;
  const [nomH, fh] = frameHero();
  ctx.save();
  if (epuise) ctx.translate(Math.sin(rt / 1000 * Math.PI * 2 * S.signaux.epuiseHz) * S.signaux.epuiseBalancement, 0);
  dessinerSprite(images[nomH], fh, hero.x, hero.etat === 'esquive' ? hero.esquiveDir < 0 : hero.dir < 0, S.heroSprite);
  ctx.restore();
  ctx.globalAlpha = 1;

  dessinerProjectiles();
  dessinerFx();
  dessinerParticules();
  dessinerParticulesMonde();
  dessinerBrume(true);
  dessinerPremierPlan(cx);
  const imageBlanche = dessinerImpactBlanc();
  ctx.restore();

  // Couches posées sur l'image, en pixels de l'écran
  ctx.setTransform(d, 0, 0, d, 0, 0);
  dessinerLumieres(cx);
  if (!imageBlanche) dessinerAtmosphere();

  // Bandes noires : entrée du boss, vacillement, métamorphose, coup fatal
  const veutBandes = jeu.etat === 'intro' ? (jeu.t < S.mise.intro.ms - 350 ? 1 : 0) : (scene && rt - scene.t0 < scene.ms ? 1 : 0);
  bandes += (veutBandes - bandes) * 0.2;
  if (bandes > 0.01) {
    ctx.fillStyle = '#000';
    const hb = H * S.mise.bandes * bandes;
    ctx.fillRect(0, 0, W, hb);
    ctx.fillRect(0, H - hb, W, hb);
  }

  // Mort du héros : l'image perd ses couleurs
  if (jeu.etat === 'mort') {
    ctx.save();
    ctx.globalCompositeOperation = 'saturation';
    ctx.globalAlpha = Math.min(1, jeu.treel / S.mise.mort.grisMs);
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  // Interface : seule la vie du boss est affichée, la vie et l'endurance du héros se lisent dans l'image
  ctx.setTransform(d * kui, 0, 0, d * kui, 0, 0);
  const wi = W / kui, hi = H / kui;
  const bx = (wi - S.bossBarreLargeur) / 2;
  const by = hi - S.bossBarreBas;
  if (jeu.etat !== 'intro' && jeu.etat !== 'depart') {
    ctx.fillStyle = '#bbb';
    ctx.font = `${S.nomTaille}px Georgia, serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText(M.nom, bx, by - S.barreEspace / 2);
    barre(bx, by, S.bossBarreLargeur, boss.vie / M.vie, '#a33');
    ctx.fillStyle = '#000';
    ctx.fillRect(bx + S.bossBarreLargeur * (1 - S.phase1Part) - 1.5, by - 4, 3, S.barreHauteur + 8);
    ctx.fillStyle = S.postureCouleur;
    ctx.fillRect(bx, by + S.barreHauteur + S.barreEspace / 2, S.bossBarreLargeur * Math.min(1, boss.posture / S.postureMax), S.postureHauteur);
  }

  ctx.setTransform(d, 0, 0, d, 0, 0);
  if (jeu.etat === 'depart') dessinerTitre();
  if (jeu.etat === 'intro') dessinerNomBoss();
  if (jeu.etat === 'mort') {
    ctx.fillStyle = `rgba(0,0,0,${Math.min(1, jeu.treel / S.mortMs) * 0.9})`;
    ctx.fillRect(0, 0, W, H);
    texteEspace(S.mise.mort.texte, W / 2, H / 2, S.mise.mort.taille * kui, '#b8a8a0', 0.3, Math.min(1, jeu.treel / 300));
  }
  if (jeu.etat === 'victoire' && jeu.treel >= S.mise.victoire.statsDebutMs) dessinerStatsVictoire();
}

// Texte aux lettres espacées, centré en (x, y)
function texteEspace(texte, x, y, taille, couleur, espace, alpha = 1, lueur = null) {
  ctx.save();
  ctx.font = `bold ${taille}px Georgia, serif`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  const largeurs = [...texte].map(c => ctx.measureText(c).width + taille * espace);
  let total = largeurs.reduce((a, b) => a + b, 0) - taille * espace;
  let cx = x - total / 2;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = couleur;
  if (lueur) { ctx.shadowColor = lueur; ctx.shadowBlur = taille * 0.35; }
  [...texte].forEach((c, i) => { ctx.fillText(c, cx, y); cx += largeurs[i]; });
  ctx.restore();
}

function dessinerTitre() {
  const W = window.innerWidth, H = window.innerHeight, T = S.mise.titre;
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(0, 0, W, H);
  texteEspace(T.texte, W / 2, H * 0.36, T.taille * kui, T.couleur, T.espace, 1, T.lueur);
  const pulse = 0.55 + 0.45 * Math.sin(rt / 1000 * Math.PI * 2 * T.pulseHz);
  texteEspace(T.invite, W / 2, H * 0.72, T.inviteTaille * kui, '#c9c1b2', 0.08, pulse);
}

// Le nom du boss s'affiche pendant son entrée, entre les bandes noires
function dessinerNomBoss() {
  const W = window.innerWidth, H = window.innerHeight, I = S.mise.intro;
  const a = enveloppe(jeu.t - I.nomDebut, I.nomMs, 400, 400);
  if (a <= 0) return;
  texteEspace(M.nom.toUpperCase(), W / 2, H * (1 - S.mise.bandes * 2.2), I.nomTaille * kui, '#d9d1c1', I.nomEspace, a, 'rgba(200,40,20,0.6)');
}

function formatTemps(ms) {
  const t = Math.round(ms / 100) / 10, m = Math.floor(t / 60), s = (t - m * 60).toFixed(1);
  return `${m}:${s.padStart(4, '0')}`;
}

// Victoire : le boss est en cendres, le silence tombe, puis les chiffres s'affichent
function dessinerStatsVictoire() {
  const W = window.innerWidth, H = window.innerHeight, V = S.mise.victoire;
  const a = Math.min(1, (jeu.treel - V.statsDebutMs) / 600);
  ctx.fillStyle = `rgba(0,0,0,${0.55 * a})`;
  ctx.fillRect(0, 0, W, H);
  texteEspace(V.texte, W / 2, H * 0.4, V.taille * kui, '#d9d1c1', 0.22, a, 'rgba(255,110,40,0.5)');
  texteEspace(`Temps ${formatTemps(stats.temps)}`, W / 2, H * 0.58, 30 * kui, '#c9c1b2', 0.08, a);
  texteEspace(`Tentatives ${stats.essais}`, W / 2, H * 0.67, 30 * kui, '#c9c1b2', 0.08, a);
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
    majParticules(dt);
    majAudio(dt);
  } else majAudio(dt);
  dessiner();
}
requestAnimationFrame(boucle);
})();
