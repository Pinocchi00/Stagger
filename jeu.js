(() => {
const S = SETTINGS;
const canvas = document.getElementById('jeu');
const ctx = canvas.getContext('2d');
const debugEl = document.getElementById('debug');

// ---------- Images ----------
const chemins = {
  attente: 'images/boss-attente.jpg',
  elan: 'images/boss-vive-elan.jpg',
  coup: 'images/boss-vive-coup.jpg',
};
const img = {};
let chargees = 0;
let erreurImage = false;
for (const [nom, src] of Object.entries(chemins)) {
  const i = new Image();
  i.onload = () => { chargees++; if (chargees === Object.keys(chemins).length && etat === 'chargement') etat = 'depart'; };
  i.onerror = () => { erreurImage = true; };
  i.src = src;
  img[nom] = i;
}

// ---------- Affichage ----------
let etat = 'chargement'; // chargement, depart, jeu
let d = 1;
const rect = { x: 0, y: 0, w: 0, h: 0, k: 1 };

function ajuster() {
  d = window.devicePixelRatio || 1;
  canvas.width = Math.round(window.innerWidth * d);
  canvas.height = Math.round(window.innerHeight * d);
  rect.w = Math.min(window.innerWidth, window.innerHeight * S.ratio);
  rect.h = rect.w / S.ratio;
  rect.x = (window.innerWidth - rect.w) / 2;
  rect.y = (window.innerHeight - rect.h) / 2;
  rect.k = rect.w / S.largeurReference;
}
window.addEventListener('resize', ajuster);
ajuster();

const portrait = () => window.innerHeight > window.innerWidth;

// ---------- Temps de jeu ----------
let gt = 0;            // temps de jeu, ms : n'avance ni en pause ni pendant l'arrêt sur image
let derniereImage = performance.now();
let arret = 0;         // arrêt sur image restant, ms

// ---------- Cycle de l'attaque ----------
let phase = 'attente'; // attente, elan, coup
let phaseDebut = 0;
let phaseDuree = 0;
let attaque = null;    // { impact, resultat, tire }

const attenteAlea = () => S.attenteMinMs + Math.random() * (S.attenteMaxMs - S.attenteMinMs);

// ---------- Effets ----------
const fx = { eclatElan: null, flash: null, shake: null, voile: null, zoom: null };
let etincelles = [];

// ---------- Mesures ----------
let serie = 0;
let meilleure = 0;
let derniereLigne = '';

function afficherDebug() {
  if (!S.debug) return;
  debugEl.querySelector('#d-ecart').textContent = derniereLigne;
  debugEl.querySelector('#d-serie').textContent = `Série : ${serie}   Meilleure : ${meilleure}`;
  debugEl.querySelector('#d-decalage').textContent = `Décalage tactile : ${S.decalageTactileMs} ms`;
}
if (S.debug) {
  debugEl.hidden = false;
  debugEl.addEventListener('pointerdown', e => e.stopPropagation());
  debugEl.querySelector('#d-moins').addEventListener('click', () => { S.decalageTactileMs -= S.pasDecalageMs; afficherDebug(); });
  debugEl.querySelector('#d-plus').addEventListener('click', () => { S.decalageTactileMs += S.pasDecalageMs; afficherDebug(); });
  afficherDebug();
}

// ---------- Son ----------
let ac = null;
let tampon = null;
function initAudio() {
  try {
    ac = new (window.AudioContext || window.webkitAudioContext)();
    ac.resume();
    const n = ac.sampleRate * 2;
    tampon = ac.createBuffer(1, n, ac.sampleRate);
    const data = tampon.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1;
  } catch (e) { ac = null; }
}
function ton(type, freq, freqFin, dureeS, volume) {
  const t = ac.currentTime;
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (freqFin) o.frequency.exponentialRampToValueAtTime(freqFin, t + dureeS);
  g.gain.setValueAtTime(volume, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dureeS);
  o.connect(g).connect(ac.destination);
  o.start(t);
  o.stop(t + dureeS);
}
function bruit(dureeS, volume, filtreHz) {
  const t = ac.currentTime;
  const s = ac.createBufferSource();
  const f = ac.createBiquadFilter();
  const g = ac.createGain();
  s.buffer = tampon;
  f.type = 'lowpass';
  f.frequency.value = filtreHz;
  g.gain.setValueAtTime(volume, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dureeS);
  s.connect(f).connect(g).connect(ac.destination);
  s.start(t);
  s.stop(t + dureeS);
}
function jouer(resultat) {
  if (!ac) return;
  const p = S.sons[resultat];
  if (resultat === 'parfaite') {
    for (const f of p.partiels) ton('sine', f, 0, p.dureeS, p.volume / p.partiels.length * 2);
    ton('square', p.partiels[0], 0, p.clicDureeS, p.clicVolume);
  } else if (resultat === 'simple') {
    for (const f of p.freqs) ton('square', f, 0, p.dureeS, p.volume);
    bruit(p.bruitDureeS, p.bruitVolume, p.bruitFiltreHz);
  } else {
    ton('sine', p.freqDebut, p.freqFin, p.dureeS, p.volume);
    bruit(p.bruitDureeS, p.bruitVolume, p.bruitFiltreHz);
  }
}

// ---------- Logique ----------
function classer(ecart) {
  if (ecart >= -S.parfaiteMs && ecart <= S.toleranceApresMs) return 'parfaite';
  if (ecart >= -S.simpleMs && ecart < -S.parfaiteMs) return 'simple';
  return 'ratee';
}

function tirer(res) {
  attaque.tire = true;
  const r = res.r;
  if (r === 'parfaite') {
    fx.flash = { debut: gt, duree: S.eclatParfaiteMs, alpha: S.eclatParfaiteAlpha };
    fx.zoom = { debut: gt, duree: S.zoomParfaiteMs };
    for (let i = 0; i < S.etincellesNombre; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = S.etincellesVitesse * (0.4 + Math.random() * 0.6);
      etincelles.push({ debut: gt, vx: Math.cos(a) * v, vy: Math.sin(a) * v });
    }
    arret = S.arretImageMs;
    serie++;
    if (serie > meilleure) meilleure = serie;
  } else if (r === 'simple') {
    fx.flash = { debut: gt, duree: S.eclatSimpleMs, alpha: S.eclatSimpleAlpha };
    fx.shake = { debut: gt, duree: S.tremblementSimpleMs, amp: S.tremblementSimplePx };
    serie = 0;
  } else {
    fx.shake = { debut: gt, duree: S.tremblementRateMs, amp: S.tremblementRatePx };
    fx.voile = { debut: gt, duree: S.voileRougeMs };
    if (navigator.vibrate) navigator.vibrate(S.vibrationMs);
    serie = 0;
  }
  jouer(r);
  const nom = { parfaite: 'parfaite', simple: 'simple', ratee: 'ratée' }[r];
  if (res.ecart === null) derniereLigne = 'aucun toucher, ratée';
  else {
    const e = Math.round(res.ecart);
    derniereLigne = `${e < 0 ? '−' : '+'}${Math.abs(e)} ms, ${nom}`;
  }
  afficherDebug();
}

function toucher(t) {
  if (etat !== 'jeu' || portrait()) return;
  if (!attaque || attaque.tire || attaque.resultat) return; // un seul toucher par attaque
  const tg = gt + (t - derniereImage);
  const ecart = tg - S.decalageTactileMs - attaque.impact;
  attaque.resultat = { r: classer(ecart), ecart };
  if (gt >= attaque.impact) tirer(attaque.resultat);
}

function avancer(dt) {
  if (arret > 0) { arret -= dt; return; }
  gt += dt;

  if (attaque && !attaque.tire && gt >= attaque.impact) {
    if (attaque.resultat) tirer(attaque.resultat);
    else if (gt >= attaque.impact + Math.min(S.toleranceApresMs + S.decalageTactileMs, S.coupMs)) {
      tirer({ r: 'ratee', ecart: null });
    }
  }

  while (gt >= phaseDebut + phaseDuree) {
    const fin = phaseDebut + phaseDuree;
    if (phase === 'attente') {
      phase = 'elan';
      phaseDuree = S.elanMs;
      attaque = { impact: fin + S.elanMs, resultat: null, tire: false };
      fx.eclatElan = { debut: fin, duree: S.eclatElanMs };
    } else if (phase === 'elan') {
      phase = 'coup';
      phaseDuree = S.coupMs;
    } else {
      phase = 'attente';
      phaseDuree = attenteAlea();
      attaque = null;
    }
    phaseDebut = fin;
  }
}

// ---------- Dessin ----------
function message(texte) {
  ctx.fillStyle = '#8a8a8a';
  ctx.font = `${S.tailleTexteRef * rect.k}px Georgia, serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(texte, window.innerWidth / 2, window.innerHeight / 2);
}

const age = (e) => (e ? (gt - e.debut) / e.duree : 1);

function scene() {
  const { x, y, w, h, k } = rect;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();

  let zoom = 1;
  if (phase === 'elan') zoom = 1 + (S.zoomElan - 1) * Math.min(1, (gt - phaseDebut) / phaseDuree);
  const az = age(fx.zoom);
  if (az < 1) zoom *= 1 + (S.zoomParfaite - 1) * (1 - az);

  let sx = 0, sy = 0;
  const as = age(fx.shake);
  if (as < 1) {
    const a = fx.shake.amp * k * (1 - as);
    sx = (Math.random() * 2 - 1) * a;
    sy = (Math.random() * 2 - 1) * a;
  }

  ctx.save();
  ctx.translate(x + w / 2 + sx, y + h / 2 + sy);
  ctx.scale(zoom, zoom);
  ctx.drawImage(img[phase], -w / 2, -h / 2, w, h);
  ctx.restore();

  // Éclat orange au début de l'élan
  const ae = age(fx.eclatElan);
  if (ae < 1) {
    const cx = x + S.eclatElanX * w, cy = y + S.eclatElanY * h, r = S.eclatElanRayon * w;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    const a = S.eclatElanAlpha * (1 - ae);
    g.addColorStop(0, `rgba(255,120,20,${a})`);
    g.addColorStop(1, 'rgba(255,120,20,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
  }

  // Éclat blanc
  const af = age(fx.flash);
  if (af < 1) {
    ctx.fillStyle = `rgba(255,255,255,${fx.flash.alpha * (1 - af)})`;
    ctx.fillRect(x, y, w, h);
  }

  // Voile rouge
  const av = age(fx.voile);
  if (av < 1) {
    ctx.fillStyle = `rgba(150,0,0,${S.voileRougeAlpha * (1 - av)})`;
    ctx.fillRect(x, y, w, h);
  }

  // Étincelles
  etincelles = etincelles.filter(p => gt - p.debut < S.etincellesDureeMs);
  for (const p of etincelles) {
    const t = (gt - p.debut) / 1000;
    const vie = (gt - p.debut) / S.etincellesDureeMs;
    const px = x + (S.contactX + p.vx * t) * w;
    const py = y + (S.contactY + p.vy * t) * w;
    ctx.fillStyle = vie < 0.5 ? '#fff' : '#f90';
    ctx.globalAlpha = 1 - vie;
    ctx.fillRect(px, py, S.etincellesTaillePx * k, S.etincellesTaillePx * k);
  }
  ctx.globalAlpha = 1;

  ctx.restore();
}

function dessiner() {
  ctx.setTransform(d, 0, 0, d, 0, 0);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
  if (portrait()) message('Tourne ton téléphone');
  else if (etat === 'chargement') message(erreurImage ? 'Image introuvable' : 'Chargement');
  else if (etat === 'depart') message('Touche pour commencer');
  else scene();
}

// ---------- Boucle ----------
const pas = 1000 / S.fps;
let dernierDessin = 0;
function boucle() {
  requestAnimationFrame(boucle);
  const now = performance.now();
  if (now - dernierDessin < pas - 1) return;
  dernierDessin = now;
  const dt = (etat === 'jeu' && !portrait()) ? Math.min(now - derniereImage, S.dtMaxMs) : 0;
  derniereImage = now;
  if (dt > 0) avancer(dt);
  dessiner();
}
requestAnimationFrame(boucle);

// ---------- Entrées ----------
function demarrer() {
  initAudio();
  const el = document.documentElement;
  const demande = el.requestFullscreen || el.webkitRequestFullscreen;
  if (demande && !document.fullscreenElement) {
    Promise.resolve(demande.call(el))
      .then(() => screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape'))
      .catch(() => {});
  }
  gt = 0;
  arret = 0;
  phase = 'attente';
  phaseDebut = 0;
  phaseDuree = attenteAlea();
  attaque = null;
  derniereImage = performance.now();
  etat = 'jeu';
}

function entree(t) {
  if (etat === 'depart') { if (!portrait()) demarrer(); return; }
  toucher(t);
}
window.addEventListener('pointerdown', e => entree(e.timeStamp));
window.addEventListener('keydown', e => {
  if (e.code !== 'Space' || e.repeat) return;
  e.preventDefault();
  entree(e.timeStamp);
});
window.addEventListener('contextmenu', e => e.preventDefault());
})();
