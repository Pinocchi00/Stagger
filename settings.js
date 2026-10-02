// Fichier de réglages : toutes les valeurs chiffrées du jeu vivent ici.
// Les valeurs des lots suivants s'y ajoutent au fil des lots.
const SETTINGS = {
  version: 6,                 // change à chaque mise à jour des images, pour que le téléphone les recharge
  fps: 60,
  dtMaxMs: 100,               // plus long pas de temps accepté entre deux images

  // Arène (lots 1 et 6) : unités de jeu
  arenaLargeur: 1200,         // largeur fixe, avec un mur invisible à chaque bout
  solY: 600,                  // hauteur du sol dans le monde, mesurée depuis le haut
  hauteurInterface: 720,      // hauteur de référence des barres et des textes

  // Héros (lot 1)
  heroLargeur: 40,
  heroHauteur: 80,
  heroDepartX: 350,           // position de départ, depuis la gauche
  vie: 100,
  vitesseMarche: 260,         // unités par seconde

  // Endurance (lot 1)
  enduranceMax: 150,
  enduranceAttaque: 20,
  enduranceEsquive: 30,
  enduranceRegenParSeconde: 60,
  enduranceRegenDelaiMs: 400, // temps sans action avant que l'endurance remonte

  // Esquive : un déplacement rapide sur le côté
  esquiveMs: 280,
  esquiveLargeurs: 3.5,       // distance, en largeurs de héros
  esquiveInvulnerableMs: 200,
  esquiveAlpha: 0.45,         // opacité du héros tant qu'il est invulnérable

  // Attaque (lot 1)
  attaqueMs: 350,
  attaqueDegats: 10,
  attaque2Degats: 14,
  attaquePortee: 90,          // devant le héros, depuis son bord
  attaqueImpactRatio: 0.5,    // moment du coup dans l'attaque, en part de sa durée
  enchainementMs: 300,        // temps après une attaque pour enchaîner la deuxième

  // Boss (lot 2)
  bossNom: 'Grimalkin',
  bossVie: 400,
  bossLargeur: 60,
  bossDepartEcart: 500,       // distance entre le héros et le boss au départ
  bossVitesse: 120,           // marche, unités par seconde
  bossDebutMs: 1000,          // immobilité au début du combat
  bossOuvertureMs: 800,       // immobilité après chaque attaque : l'ouverture
  bossFlashMs: 120,           // éclat quand il est touché

  // Fauchage (lot 2)
  fauchageAnnonceMs: 600,
  fauchageDegats: 35,
  fauchagePortee: 150,        // zone frappée devant lui, depuis son bord
  fauchageZoneMs: 150,        // durée d'affichage de la zone rouge

  // Sort (lot 2)
  sortAnnonceMs: 800,
  sortMarqueMs: 700,          // délai entre l'apparition de la marque et l'explosion
  sortDegats: 30,
  sortRayon: 90,              // demi-largeur de la marque au sol
  sortExplosionMs: 150,       // durée d'affichage de l'explosion

  // Variantes d'attaque et choix du boss (lot 7)
  fauchageRetardeMs: 1100,    // élan tenu avant le coup du Fauchage retardé
  doubleDelaiMs: 450,         // délai entre les deux coups du double Fauchage
  sortLoinMinMs: 600,         // marche avant de lancer un Sort de loin, au plus court
  sortLoinMaxMs: 1800,        // et au plus long
  poids: { fauchage: 4, retarde: 2, double: 2, sort: 2, pluie: 0, orbe: 2, ruee: 2 },   // phase 1
  poids2: { fauchage: 3, retarde: 2, double: 3, sort: 1, pluie: 3, orbe: 3, ruee: 3 },  // phase 2
  repetitionMax: 2,           // jamais plus de deux fois la même attaque de suite
  lueurFaux: { dx: 23, dy: -56, rayon: 45, alpha: 0.9, pulseHz: 6 }, // lueur du Fauchage retardé

  // Posture et vacillement (lot 7)
  postureMax: 6,              // crans avant que le boss vacille
  postureCoup: 1,             // cran par coup du héros
  postureCoup2: 1.5,          // cran pour le second coup d'un enchaînement
  postureDelaiMs: 2000,       // sans coup avant que la posture se vide
  postureVidageParSeconde: 1,
  vacilleMs: 2000,            // le boss reste sans défense
  vacilleDegatsFacteur: 1.5,  // dégâts subis pendant le vacillement
  postureHauteur: 4,          // trait fin sous la barre de vie
  postureCouleur: '#e0c060',

  // Phase 2 (lot 3)
  // Les deux phases : chacune demande de parer cinq coups (cinq flammes) avant de pouvoir blesser le boss.
  phase1Part: 0.5,            // part de la vie que fait perdre la phase 1
  phase2: {                   // la phase 2 est bien plus dure
    vitesseFacteur: 1.7,      // marche
    annonceFacteur: 0.6,      // durée des élans : le boss annonce ses coups plus vite
    ouvertureMs: 350,         // ouverture après chaque attaque
    secondeLameMs: 140,       // la seconde lame frappe juste après la première
    degatsFacteur: 1.5,
    sortMarqueFacteur: 0.8,   // les marques explosent plus vite
    pluieMarques: 5,          // marques de la Pluie de sorts
    pluieEcartMs: 250,
  },

  // Ruée : le boss se ramasse, fonce sur le héros et frappe à l'arrivée (ça se pare)
  ruee: { annonceMs: 520, dashMs: 240, distanceMax: 420, arret: 70, degats: 40, echoMs: 38, echoVieMs: 280, echoAlpha: 0.4 },
  // Bond : le boss recule d'un trait quand le héros est collé à lui
  bond: { seuilEcart: 70, chance: 0.3, chance2: 0.5, distance: 200, ms: 230 },
  // Orbe : attaque magique, un projectile qu'on esquive ou qu'on pare
  orbe: { annonceMs: 700, vitesse: 380, phase2Vitesse: 1.3, degats: 30, rayon: 14, hauteur: 46, phase2Nombre: 3, ecartMs: 260, recupMs: 350,
          particulesParSeconde: 130, couleurs: ['235,225,255', '170,130,255', '100,60,210', '40,20,100'], halo: 46 },
  // Métamorphose : le boss se transforme à la moitié de sa vie
  meta: { ms: 3400, changeMs: 1500, tremblementPx: 7, arretMs: 140, flashMs: 500, explosion: 46 },
  // Respiration du boss, pour qu'il ne soit jamais immobile
  respiration: { hz: 0.9, amplitude: 1.8, ecrasement: 0.012, hz2: 1.5, amplitude2: 3 },

  // Sprites d'impact (planches de 64 x 64), joués image par image
  fxSprite: { largeur: 64, hauteur: 64 },
  fx: { echelle: 2.2, imageMs: 70 },

  // Coup reçu par le héros (lot 2)
  coupRecuMs: 300,            // héros sans contrôle
  coupRecuRecul: 90,          // distance de recul

  // Mort et victoire (lot 2)
  mortMs: 1200,               // de la mort à la reprise, moins de 2 secondes
  victoireAttenteMs: 800,     // avant de pouvoir relancer après la victoire

  // Sprites (lot 4) : taille d'une vignette, point d'appui au sol, échelle
  heroSprite: { largeur: 120, hauteur: 80, pivotX: 55, pivotY: 80 },
  bossSprite: { largeur: 140, hauteur: 93, pivotX: 106, pivotY: 92 },
  echelleSprite: 2.16,        // unités par pixel de sprite, la même pour le héros et le boss
  sortPivotX: 68,             // point d'appui de l'effet du Sort
  animFps: 10,                // images par seconde des animations en boucle
  fauchageFrameImpact: 4,     // vignette du Fauchage qui tombe sur l'impact
  bossMortMs: 1000,           // animation de mort du boss

  // Commandes tactiles (lot 1)
  zoneMortePx: 12,            // glissement minimal du pouce gauche pour marcher
  glisserMinPx: 40,           // glissement minimal du pouce droit pour esquiver

  // Affichage (lot 1)
  barreHauteur: 28,           // deux fois plus hautes (lot 6)
  barreEspace: 8,
  bossBarreLargeur: 520,
  bossBarreBas: 64,           // distance entre la barre du boss et le bas de l'écran
  texteTaille: 48,
  nomTaille: 18,

  // Caméra (lot 6)
  heroCorpsPx: 37,            // hauteur du corps du héros dans sa planche, en pixels de sprite
  heroEcranRatio: 0.25,       // part de la hauteur de l'écran occupée par le héros
  solEcranRatio: 0.82,        // position du sol à l'écran, en part de la hauteur
  camLisseParSeconde: 5,      // vitesse de rattrapage de la caméra
  camZoomLisseParSeconde: 3,  // vitesse du recul de la caméra
  camBordUnites: 80,          // marge gardée de chaque côté des deux personnages

  // Arc du Fauchage (lot 6)
  arcCouleur: '#ecebf5',
  arcCentreHauteur: 55,       // hauteur du centre de l'arc au-dessus du sol
  arcDebutDeg: -50,           // angle de départ, mesuré depuis l'horizontale devant le boss
  arcFinDeg: 15,
  arcQueueDeg: 40,            // longueur de la traînée
  arcRayonVertical: 100,      // hauteur de l'arc, plus basse que sa portée
  arcEpaisseur: 10,
  arcSegments: 14,

  // Cercle de runes du Sort (lot 6)
  runesCouleur: '#e07a2a',
  runesCouleurVive: '#ffd9a0',
  runesAplat: 0.28,           // hauteur du cercle, en part de sa largeur
  runesNombre: 12,
  runesTaille: 14,            // taille d'une rune
  runesTourParSeconde: 0.15,
  runesPulseHz: 2,            // pulsations par seconde au début
  runesPulseAccel: 4,         // pulsations ajoutées par seconde à l'approche de l'explosion
  runesEpaisseur: 3,

  // Décor : ruines d'un temple de veilleurs, la nuit. Plans du plus lointain au plus proche.
  decor: {
    graine: 11,
    marge: 260,               // débord de chaque côté de l'arène
    ciel: {
      haut: '#040307', bas: '#190d13',
      lune: { x: 0.74, y: 0.2, rayon: 30, couleur: '#b9a79d', halo: 170, haloAlpha: 0.2, haloCouleur: '170,60,50' }, // x, y : part de l'écran
      nuages: [
        { x: 0.6, y: 0.19, largeur: 300, hauteur: 26, alpha: 0.55 },
        { x: 0.82, y: 0.25, largeur: 220, hauteur: 20, alpha: 0.45 },
      ],
    },
    ruine: {                  // la ruine immense, au loin
      parallaxe: 0.03, couleur: '#19151f',
      ecart: [90, 150], largeur: [26, 42], hauteur: [190, 270], casseProba: 0.45, arcProba: 0.65, arcEpaisseur: 15,
    },
    colonnes: {               // colonnes et arches brisées
      parallaxe: 0.07, couleur: '#110f16',
      ecart: [150, 300], largeur: [34, 54], hauteur: [130, 210], casseProba: 0.7, arcProba: 0.4, arcEpaisseur: 12,
    },
    pres: {                   // tombes, grilles et statues de chats, près du sol
      parallaxe: 0.14, couleur: '#0a090e',
      ecart: [30, 110], tombeProba: 0.5, statueProba: 0.18,
      tombeLargeur: [22, 34], tombeHauteur: [30, 58],
      statueTaille: 62, grilleLargeur: 96, grilleHauteur: 50, grilleBarres: 8,
    },
    sol: {
      couleur: '#1c1a21', jointCouleur: '#0f0e13',
      joints: [14, 36, 70, 125], // profondeur des joints horizontaux, sous la ligne du sol
      jointEcart: 70,           // écart des joints verticaux à la ligne du sol
      jointEvase: 0.7,          // élargissement avec la profondeur
      fissures: 16, fissureLongueur: 46,
      lumiere: { rayon: 360, alpha: 0.2, couleur: '200,60,28', aplat: 0.26 },
    },
    brume: [
      { vitesse: 7, hauteur: 70, largeur: 560, y: -8, alpha: 0.11, devant: false },
      { vitesse: -13, hauteur: 46, largeur: 430, y: 16, alpha: 0.08, devant: true },
    ],
    brumeCouleur: '150,140,165',
    cendres: { nombre: 70, vx: 18, vy: 24, vent: 8, taille: 1.8, alpha: 0.55, couleur: '#c2bacb' },
    braises: { vxFacteur: 2.2, vyFacteur: 1.3, couleur: '#ff8a2a' }, // la phase 2 transforme les cendres en braises
    premierPlan: { parallaxe: -0.22, couleur: '#020204', alpha: 0.93, largeur: 80, fondu: 130, x: 30 },
    vignette: { alpha: 0.72, depart: 0.34 },     // départ : part du rayon où l'assombrissement commence
    halo: { rayon: 230, alpha: 0.26, hauteur: 80, couleur: '190,40,16' }, // derrière le boss
    haloHeros: { rayon: 90, alpha: 0.14, hauteur: 40, couleur: '225,215,195' }, // lueur pâle qui détache le héros du décor
    eclair: { ms: 150, alpha: 0.5, couleur: '255,235,220' }, // à l'explosion d'un Sort
    phase2: { rougeAlpha: 0.09 },
  },

  // Les cinq queues de Grimalkin : des échines d'os calcinées, des flammes sombres au bout
  queues: {
    nombre: 5,
    baseDx: 9,                // départ de la queue derrière le dos, en pixels de sprite
    baseDy: -29,              // hauteur du départ au-dessus du sol, en pixels de sprite
    angles: [28, 56, 84, 112, 138], // degrés au-dessus de l'horizontale arrière
    longueur: 104,            // unités
    longueurVariation: 0.16,  // écart de longueur d'une queue à l'autre
    epaisseur: 8,
    ondulation: 17,
    ondulationHz: 1.7,
    couleur: '#100b0b',       // chair carbonisée
    os: '#6a604f',            // vertèbres
    osContour: '#1d1713',
    vertebre: 4.2,            // demi-longueur d'une vertèbre à la base
    braiseFissure: '255,80,18', // la braise qui court dans l'échine, vers la pointe
    braiseFissureDebut: 0.45, // part de la queue où elle commence
    segments: 18,
    flamme: { taille: 27, halo: 2.6, haloAlpha: 0.3, haloCouleur: '200,40,14' },  // lueur au bout de la queue
    feu: {                    // la flamme est un jet de particules incandescentes
      parSeconde: 110,         // par queue allumée
      max: 420,
      vie: [480, 950],        // ms
      taille: [4, 9],         // rayon, en unités
      montee: [95, 175],      // unités par seconde
      derive: 22,
      turbulence: 38,
      turbulenceHz: 3.1,
      etalement: 6,
      alpha: 0.42,
      etirement: 1.8,         // les particules sont étirées vers le haut
      couleurs: ['255,196,110', '255,126,30', '210,50,14', '90,18,8'],  // du cœur blanc à la cendre rouge
      couleurs2: ['255,214,130', '255,140,40', '236,64,18', '130,22,10'], // phase 2 : le feu blanchit
    },
    eteinteMs: 450,           // temps que met une flamme à mourir
    fumeeEteinte: 22,         // bouffées de fumée quand une flamme s'éteint
    phase2Facteur: 1.25,      // flammes plus grandes en phase 2
    phase2Ondulation: 1.5,    // et queues plus agitées
    phase2OndulationHz: 1.4,
    vacilleFacteur: 0.55,     // et plus faibles quand il vacille
    braisesParSeconde: 5,     // par queue
    braiseVie: 900,           // ms
    braiseVitesse: 40,
    braisesMax: 90,
    fumeeParSeconde: 3,       // par queue
    fumeeVie: 1700,           // ms
    fumeeMonte: 28,
    fumeeTaille: 7,
    fumeeAlpha: 0.55,
    fumeeMax: 60,
  },

  // Vie et endurance du héros, rendues par l'image plutôt que par des barres
  signaux: {
    vieSeuilPouls: 0.4,       // sous cette part de vie, le bord de l'écran pulse
    vignetteRougeMax: 0.62,
    poulsHz: 1.3,
    enduranceSeuil: 0.5,      // sous cette part d'endurance, le héros s'essouffle
    souffleMaxParSeconde: 7,
    souffleVie: 700,          // ms
    souffleTaille: 5,
    souffleMontee: 22,
    epuiseAlpha: 0.72,        // opacité du héros à bout de souffle
    epuiseBalancement: 1.6,   // amplitude de son balancement, en unités
    epuiseHz: 3.2,
    soufflesMax: 40,
  },

  // Parade : un coup d'épée au bon moment, quand l'impact de la lame tombe avec celui du boss
  paradeParfaiteMs: 200,      // parfaite : écart total toléré entre les deux impacts (la moitié de chaque côté)
  paradeSimpleMs: 520,        // simple : écart total toléré, ici toute la durée de l'attaque
  enduranceParadeSimple: 20,  // la parade simple use en plus l'endurance
  paradeSimpleRecul: 40,
  paradeSimpleReculMs: 150,
  postureParadeParfaite: 1.5, // crans de posture infligés au boss par une parade parfaite
  arretParadeParfaiteMs: 120,
  arretParadeSimpleMs: 50,
  tremblementParadeParfaiteMs: 200,
  tremblementParadeParfaitePx: 9,
  tremblementParadeSimpleMs: 120,
  tremblementParadeSimplePx: 4,
  contactX: 0.65,             // point de contact devant le héros, en largeurs de héros
  contactY: 0.55,             // hauteur du point de contact, en part de la hauteur du héros
  impactBlanc: {
    parfaiteMs: 120,          // image d'impact : écran blanc, silhouettes noires, étoile et traits
    tenue: 0.7,               // part de la durée où le blanc est plein
    etoilePointes: 14,
    etoileRayon: 62,
    etoileCreux: 0.5,
    etoileContour: 5,
    lignes: 22,
    lignesMin: 1.15,          // début des traits, en rayons de l'étoile
    lignesMax: 3.6,
    lignesEpaisseur: 4,
    bloqueMs: 80,             // coup du héros sur un boss protégé : quelques étincelles
    bloqueRayon: 20,
    bloqueEtincelles: 8,
    simpleMs: 90,             // impact léger : voile blanc, petite étoile et étincelles
    simpleAlpha: 0.4,
    simplePointes: 9,
    simpleRayon: 30,
    etincelles: 10,
  },

  // Impacts (lot 5)
  arretCoupDonneMs: 50,       // arrêt sur image quand le héros touche le boss
  arretCoupRecuMs: 90,        // arrêt sur image quand le héros est touché
  tremblementCoupDonneMs: 120,
  tremblementCoupDonnePx: 5,
  tremblementCoupRecuMs: 260,
  tremblementCoupRecuPx: 16,

  // Sons produits par le code (lot 5) : oscillateur { forme, f0, f1 } ou bruit filtré { bruit, hz, filtre }
  sonVolume: 0.65,
  sons: {
    attaque: [{ bruit: true, filtre: 'highpass', hz: 2500, duree: 0.12, volume: 0.18 }],
    esquive: [{ bruit: true, filtre: 'lowpass', hz: 700, duree: 0.25, volume: 0.2 }],
    coupDonne: [
      { forme: 'square', f0: 260, f1: 90, duree: 0.1, volume: 0.25 },
      { bruit: true, filtre: 'lowpass', hz: 2200, duree: 0.08, volume: 0.25 },
    ],
    coupRecu: [
      { forme: 'sine', f0: 110, f1: 40, duree: 0.3, volume: 0.6 },
      { bruit: true, filtre: 'lowpass', hz: 500, duree: 0.3, volume: 0.35 },
    ],
    annonceFauchage: [{ forme: 'sawtooth', f0: 180, f1: 420, duree: 0.55, volume: 0.1 }],
    annonceSort: [
      { forme: 'sine', f0: 140, f1: 300, duree: 0.8, volume: 0.2 },
      { forme: 'sine', f0: 146, f1: 310, duree: 0.8, volume: 0.2 },
    ],
    fauchage: [
      { bruit: true, filtre: 'bandpass', hz: 1200, duree: 0.2, volume: 0.4 },
      { forme: 'sawtooth', f0: 500, f1: 120, duree: 0.2, volume: 0.15 },
    ],
    explosion: [
      { forme: 'sine', f0: 90, f1: 30, duree: 0.5, volume: 0.6 },
      { bruit: true, filtre: 'lowpass', hz: 900, duree: 0.45, volume: 0.45 },
    ],
    paradeParfaite: [
      { forme: 'sine', f0: 130, f1: 36, duree: 0.55, volume: 0.9 },                       // choc grave
      { bruit: true, filtre: 'highpass', hz: 1400, duree: 0.14, volume: 0.55 },           // métal qui crisse
      { forme: 'sine', f0: 1900, duree: 0.9, volume: 0.32 },                              // résonance de la lame
      { forme: 'sine', f0: 2850, duree: 0.7, volume: 0.22 },
      { forme: 'sine', f0: 4300, duree: 0.5, volume: 0.15 },
      { forme: 'square', f0: 2100, duree: 0.02, volume: 0.45 },                           // claquement sec
      { forme: 'triangle', f0: 640, f1: 600, duree: 0.6, volume: 0.2, retard: 0.02 },
    ],
    paradeSimple: [
      { forme: 'sine', f0: 160, f1: 50, duree: 0.35, volume: 0.8 },
      { forme: 'square', f0: 420, f1: 360, duree: 0.18, volume: 0.24 },
      { forme: 'square', f0: 630, f1: 520, duree: 0.16, volume: 0.18 },
      { bruit: true, filtre: 'bandpass', hz: 900, duree: 0.12, volume: 0.45 },
    ],
    flammeEteinte: [
      { bruit: true, filtre: 'lowpass', hz: 1600, duree: 0.6, volume: 0.4 },              // souffle
      { forme: 'sine', f0: 320, f1: 55, duree: 0.5, volume: 0.3 },
    ],
    coupBloque: [
      { forme: 'square', f0: 980, f1: 700, duree: 0.07, volume: 0.2 },
      { bruit: true, filtre: 'highpass', hz: 3000, duree: 0.06, volume: 0.32 },
    ],
    annonceRuee: [
      { forme: 'sawtooth', f0: 70, f1: 210, duree: 0.5, volume: 0.25 },
      { bruit: true, filtre: 'lowpass', hz: 420, duree: 0.5, volume: 0.22 },
    ],
    ruee: [
      { bruit: true, filtre: 'bandpass', hz: 800, duree: 0.28, volume: 0.55 },
      { forme: 'sine', f0: 230, f1: 60, duree: 0.28, volume: 0.45 },
    ],
    bond: [{ bruit: true, filtre: 'highpass', hz: 1800, duree: 0.16, volume: 0.32 }],
    annonceOrbe: [
      { forme: 'triangle', f0: 200, f1: 520, duree: 0.7, volume: 0.22 },
      { forme: 'sine', f0: 206, f1: 534, duree: 0.7, volume: 0.2 },
    ],
    orbeLancee: [
      { bruit: true, filtre: 'bandpass', hz: 1400, duree: 0.3, volume: 0.42 },
      { forme: 'sine', f0: 320, f1: 120, duree: 0.3, volume: 0.35 },
    ],
    metamorphose: [
      { forme: 'sine', f0: 55, f1: 28, duree: 2.4, volume: 0.9 },
      { bruit: true, filtre: 'lowpass', hz: 600, duree: 2.2, volume: 0.5 },
      { forme: 'sawtooth', f0: 90, f1: 220, duree: 1.6, volume: 0.22 },
      { forme: 'sine', f0: 70, f1: 24, duree: 0.9, volume: 0.95, retard: 1.5 },
      { bruit: true, filtre: 'highpass', hz: 1500, duree: 0.7, volume: 0.5, retard: 1.5 },
    ],
    mort: [{ forme: 'sine', f0: 80, f1: 25, duree: 1.0, volume: 0.5 }],
    victoire: [
      { forme: 'sine', f0: 220, duree: 1.2, volume: 0.25 },
      { forme: 'sine', f0: 330, duree: 1.2, volume: 0.2, retard: 0.15 },
      { forme: 'sine', f0: 440, duree: 1.2, volume: 0.2, retard: 0.3 },
    ],
  },
};
