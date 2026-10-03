// Fichier de réglages : toutes les valeurs chiffrées du jeu vivent ici.
// Les valeurs des lots suivants s'y ajoutent au fil des lots.
const SETTINGS = {
  version: 12,                 // change à chaque mise à jour des images, pour que le téléphone les recharge
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
  vie: 110,
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

  // Monstres (lot 9) : tout ce qui définit le boss tient dans une fiche. Pour créer une variante, copier une fiche.
  // bossActif choisit la fiche jouée ; on peut aussi l'essayer sans toucher au code avec  ?monstre=nom  dans le lien.
  bossActif: 'grimalkin',
  bossDepartEcart: 500,       // distance entre le héros et le boss au départ
  bossDebutMs: 1000,          // immobilité au début du combat
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
    annonceFacteur: 0.65,      // durée des élans : le boss annonce ses coups plus vite
    ouvertureMs: 350,         // ouverture après chaque attaque
    secondeLameMs: 140,       // la seconde lame frappe juste après la première
    degatsFacteur: 1.4,
    sortMarqueFacteur: 0.8,   // les marques explosent plus vite
    pluieMarques: 5,          // marques de la Pluie de sorts
    pluieEcartMs: 250,
  },

  // Ruée : le boss se ramasse, fonce sur le héros et frappe à l'arrivée (ça se pare)
  ruee: { annonceMs: 520, vitesse: 1900, depassement: 170, contact: 34, degats: 40, echoMs: 38, echoVieMs: 280, echoAlpha: 0.22 },
  // Bond : le boss recule d'un trait quand le héros est collé à lui
  bond: { seuilEcart: 70, chance: 0.3, chance2: 0.5, distance: 200, ms: 230 },
  // Orbe : attaque magique, un projectile qu'on esquive ou qu'on pare
  orbe: { annonceMs: 700, vitesse: 380, phase2Vitesse: 1.3, degats: 30, rayon: 14, hauteur: 46, phase2Nombre: 3, ecartMs: 260, recupMs: 350,
          particulesParSeconde: 130, couleurs: ['255,190,110', '235,90,28', '130,26,12', '30,10,8'], halo: 34 },
  // Métamorphose : le boss se transforme à la moitié de sa vie
  meta: { ms: 2400, changeMs: 1500, tremblementPx: 4, arretMs: 100, flashMs: 380, explosion: 22 },
  // Mise en scène (lot 12)
  mise: {
    bandes: 0.115,              // hauteur des bandes noires, en part de l'écran
    bandesMs: 220,              // temps qu'elles mettent à arriver ou à partir
    titre: { texte: 'STAGGER', taille: 104, espace: 0.2, couleur: '#d9d1c1', lueur: 'rgba(255,110,40,0.55)',
             invite: 'Touche pour commencer', inviteTaille: 30, pulseHz: 0.7 },
    intro: { ms: 4000, glisseDebut: 500, glisseFin: 2100, retourDebut: 3400, zoom: 0.3,
             releveDebut: 2000, releveMs: 1000, nomDebut: 2300, nomMs: 1600, sonMs: 2000, nomTaille: 64, nomEspace: 0.22 },
    vacille: { ms: 500, facteur: 0.3, zoom: 0.3 },
    fatal: { ms: 1000, facteur: 0.25, zoom: 0.4 },
    meta: { zoom: 0.4, relacheMs: 400 },
    mort: { facteur: 0.4, grisMs: 350, texte: 'MORT', taille: 84 },
    victoire: { statsDebutMs: 1900, texte: 'VICTOIRE', taille: 76, cendresMs: 2200, cendresParSeconde: 150 },
    kicks: { coupDonne: { delta: 0.035, ms: 220 }, attaqueBoss: { delta: -0.03, ms: 480 } },   // zoom avant à chaque coup, léger recul à chaque attaque
  },

  // Respiration du boss, pour qu'il ne soit jamais immobile
  respiration: { hz: 0.9, amplitude: 1.8, ecrasement: 0.012, hz2: 1.5, amplitude2: 3 },

  // Sprites d'impact (planches de 64 x 64), joués image par image
  fxSprite: { largeur: 64, hauteur: 64 },
  fx: { echelle: 1.3, imageMs: 60 },

  // Coup reçu par le héros (lot 2)
  coupRecuMs: 300,            // héros sans contrôle
  coupRecuRecul: 90,          // distance de recul

  // Mort et victoire (lot 2)
  mortMs: 1200,               // de la mort à la reprise, moins de 2 secondes
  victoireAttenteMs: 3200,    // avant de pouvoir relancer après la victoire : le temps de lire les chiffres

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

  // Décor : ruines gothiques d'un temple de veilleurs, la nuit. Les couches sont des images (voir images/decor-*.webp).
  decor: {
    pixelsParUnite: 2,        // résolution des images de décor
    marge: 260,               // débord de chaque côté de l'arène
    couches: [                // du plus lointain au plus proche, derrière le sol
      { img: 'decor-ruine2', parallaxe: 0.015 },
      { img: 'decor-ruine', parallaxe: 0.035 },
      { img: 'decor-colonnes', parallaxe: 0.07 },
    ],
    pres: { img: 'decor-pres', parallaxe: 0.14, bas: 6 },       // tombes, statues, grille, arbre mort : posés sur le sol
    solFond: '#0c0a0e',       // sous les dalles
    lumiere: { rayon: 360, alpha: 0.1, couleur: '200,60,28', aplat: 0.26 },    // sol éclairé par les flammes
    brume: [                  // deux nappes qui dérivent, images tuilées
      { img: 'decor-brume1', vitesse: 7, echelle: 1.1, y: -6, alpha: 0.5, devant: false },
      { img: 'decor-brume2', vitesse: -13, echelle: 1.2, y: 14, alpha: 0.22, devant: true },
    ],
    cendres: { nombre: 56, vx: 18, vy: 24, vent: 8, taille: 1.6, alpha: 0.45, couleur: '#c2bacb' },
    braises: { vxFacteur: 2.2, vyFacteur: 1.3, couleur: '#ff8a2a' }, // la phase 2 transforme les cendres en braises
    premierPlan: { img: 'decor-premier-plan', parallaxe: -0.22, alpha: 0.92, x: 110, bas: 120 },
    vignette: { alpha: 0.66, depart: 0.36 },     // départ : part du rayon où l'assombrissement commence
    halo: { rayon: 200, alpha: 0.07, hauteur: 80, couleur: '190,40,16' }, // derrière le boss
    haloHeros: { rayon: 80, alpha: 0.12, hauteur: 40, couleur: '200,215,235' }, // lueur froide qui détache le héros du décor
    eclair: { ms: 130, alpha: 0.28, couleur: '255,235,220' }, // à l'explosion d'un Sort
    phase2: { rougeAlpha: 0.07 },
  },

  // Lumières (lot 10) : une carte de lumière multiplie l'image (l'ombre ambiante, percée par chaque source),
  // puis une seconde passe ajoute l'éclat des sources. Couleurs en 'r,g,b'.
  lumiere: {
    resolution: 0.5,            // la carte est calculée à demi-résolution : elle est floue, donc douce
    ambiante: '94,102,140',    // le monde sans lumière : bleu nuit
    ambiante2: '150,102,112',   // en phase 2 : la scène vire au rouge
    changementMs: 1500,         // temps du passage d'une ambiance à l'autre
    lueurAlpha: 0.3,            // force de la passe d'éclat
    lune: { x: 0.74, y: 0.2, rayon: 1.05, couleur: '120,142,200', alpha: 0.5, lueur: 0.5 },   // rayon : part de la largeur de l'écran
    heros: { rayon: 120, hauteur: 46, couleur: '120,146,200', alpha: 0.55, lueur: 0.3 },       // lueur froide autour du guerrier
    flammes: { rayon: 140, couleur: '255,130,50', couleur2: '255,160,80', alpha: 0.72, lueur: 0.5, scintillementHz: 9 },
    corps: { rayon: 130, hauteur: 70, couleur: '255,100,44', alpha: 0.22, lueur: 0.1 },       // le boss éclairé par ses flammes
    tete: { rayon: 70, couleur: '255,70,30', alpha: 0.4, lueur: 0.25 },
    orbe: { rayon: 130, couleur: '255,110,40', alpha: 0.9, lueur: 0.8 },
    marque: { rayon: 2.2, couleur: '255,110,40', alpha: 0.9, lueur: 0.6 },                      // rayon : en rayons de la marque
    coupParfait: { rayon: 230, couleur: '255,238,196', alpha: 1, lueur: 1, ms: 240 },
    coupParade: { rayon: 130, couleur: '200,220,255', alpha: 0.6, lueur: 0.6, ms: 150 },
    coupDonne: { rayon: 150, couleur: '255,170,80', alpha: 0.8, lueur: 0.7, ms: 170 },
    coupBloque: { rayon: 90, couleur: '210,220,240', alpha: 0.45, lueur: 0.4, ms: 110 },
    coupRecu: { rayon: 180, couleur: '220,36,28', alpha: 0.85, lueur: 0.6, ms: 240 },
    coupBoss: { rayon: 170, couleur: '236,236,255', alpha: 0.6, lueur: 0.5, ms: 130 },
    explosion: { rayon: 280, couleur: '255,130,56', alpha: 1, lueur: 1, ms: 340 },
    eclairBoost: 1.0,           // l'éclair d'un Sort éclaire tout, brièvement
    rayons: {                   // faisceaux de lune qui tombent des baies de la ruine
      nombre: 6, parallaxe: 0.05, couleur: '176,192,240', alpha: 0.075, largeurHaut: 24, largeurBas: 120,
      hauteur: 330, inclinaison: 170, respirationHz: 0.35,
    },
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
    flamme: { taille: 22, halo: 2.2, haloAlpha: 0.16, haloCouleur: '200,40,14' },  // lueur au bout de la queue
    feu: {                    // la flamme est un jet de particules incandescentes
      parSeconde: 60,         // par queue allumée
      max: 240,
      vie: [480, 950],        // ms
      taille: [4, 9],         // rayon, en unités
      montee: [95, 175],      // unités par seconde
      derive: 22,
      turbulence: 38,
      turbulenceHz: 3.1,
      etalement: 6,
      alpha: 0.34,
      etirement: 1.8,         // les particules sont étirées vers le haut
      couleurs: ['255,196,110', '255,126,30', '210,50,14', '90,18,8'],  // du cœur blanc à la cendre rouge
      couleurs2: ['255,214,130', '255,140,40', '236,64,18', '130,22,10'], // phase 2 : le feu blanchit
    },
    eteinteMs: 450,           // temps que met une flamme à mourir
    fumeeEteinte: 9,         // bouffées de fumée quand une flamme s'éteint
    phase2Facteur: 1.25,      // flammes plus grandes en phase 2
    phase2Ondulation: 1.5,    // et queues plus agitées
    phase2OndulationHz: 1.4,
    vacilleFacteur: 0.55,     // et plus faibles quand il vacille
    braisesParSeconde: 2,     // par queue
    braiseVie: 900,           // ms
    braiseVitesse: 40,
    braisesMax: 90,
    fumeeParSeconde: 1.2,       // par queue
    fumeeVie: 1700,           // ms
    fumeeMonte: 28,
    fumeeTaille: 7,
    fumeeAlpha: 0.4,
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
  arretParadeParfaiteMs: 80,
  arretParadeSimpleMs: 50,
  tremblementParadeParfaiteMs: 200,
  tremblementParadeParfaitePx: 4,
  tremblementParadeSimpleMs: 120,
  tremblementParadeSimplePx: 2,
  contactX: 0.65,             // point de contact devant le héros, en largeurs de héros
  contactY: 0.55,             // hauteur du point de contact, en part de la hauteur du héros
  impactBlanc: {
    parfaiteMs: 70,           // image d'impact : écran blanc, silhouettes noires, étoile et traits
    tenue: 0.7,               // part de la durée où le blanc est plein
    etoilePointes: 14,
    etoileRayon: 38,
    etoileCreux: 0.5,
    etoileContour: 5,
    lignes: 14,
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
  arretCoupRecuMs: 60,        // arrêt sur image quand le héros est touché
  tremblementCoupDonneMs: 120,
  tremblementCoupDonnePx: 2.5,
  tremblementCoupRecuMs: 260,
  tremblementCoupRecuPx: 8,

  // Sons produits par le code (lot 5) : oscillateur { forme, f0, f1 } ou bruit filtré { bruit, hz, filtre }
  sonVolume: 0.65,
  // Ambiance sonore (lot 11) : un vent et un bourdon continus, un tambour, des pas, et un fond qui baisse à chaque coup
  ambiance: {
    fond: 0.9,                  // volume du fond (vent, bourdon, tambour)
    vent: { hz: 520, q: 0.7, gain: 0.17, facteur2: 1.9, hzFacteur2: 1.5, rafaleHz: 0.11, rafaleProfondeur: 0.45 },
    bourdon: { f: 55, gain: 0.2, desaccord: 0.35, filtre: 170, modHz: 0.07, dissonance: 1.4142, dissonanceGain: 0.13 },
    tambour: { periode: 2000, periode2: 1000, volume: 0.6, graveDebut: 112, graveFin: 40, ms: 380 },
    silenceMs: 60,              // fondu vers le silence quand le boss vacille
    retourMs: 450,              // retour du fond après un vacillement
    pasHerosMs: 300,            // écart entre deux pas du héros
    pasBossMs: 560,             // et entre deux pas du boss
    pasBossFacteur2: 0.75,      // il marche plus vite en phase 2
    panoramique: 0.7,           // les sons du boss viennent de son côté de l'écran
    duck: {                     // le fond baisse à chaque coup : niveau atteint, puis retour en ms
      coupDonne: { niveau: 0.42, ms: 300 }, coupRecu: { niveau: 0.22, ms: 560 }, paradeParfaite: { niveau: 0.18, ms: 650 },
      paradeSimple: { niveau: 0.4, ms: 380 }, explosion: { niveau: 0.28, ms: 520 }, fauchage: { niveau: 0.5, ms: 280 },
      coupBloque: { niveau: 0.65, ms: 160 }, mort: { niveau: 0.1, ms: 900 }, metamorphose: { niveau: 0.3, ms: 1400 },
    },
  },
  sons: {
    attaque: [      // le sifflement de la lame
      { bruit: true, filtre: 'highpass', hz: 2500, duree: 0.14, volume: 0.18 },
      { forme: 'sine', f0: 900, f1: 2100, duree: 0.13, volume: 0.05 },
    ],
    esquive: [      // le souffle de l'esquive
      { bruit: true, filtre: 'lowpass', hz: 900, duree: 0.28, volume: 0.24 },
      { forme: 'sine', f0: 320, f1: 120, duree: 0.22, volume: 0.1 },
    ],
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
    entreeBoss: [   // Grimalkin se redresse
      { forme: 'sine', f0: 62, f1: 24, duree: 1.7, volume: 0.85 },
      { bruit: true, filtre: 'lowpass', hz: 520, duree: 1.5, volume: 0.35 },
      { forme: 'sawtooth', f0: 80, f1: 52, duree: 1.3, volume: 0.28, lp: 300, vib: [6, 8] },
    ],
    rale: [      // le râle du boss au début de chaque attaque
      { forme: 'sawtooth', f0: 88, f1: 46, duree: 0.7, volume: 0.34, lp: 320, vib: [7, 6] },
      { bruit: true, filtre: 'lowpass', hz: 380, duree: 0.6, volume: 0.22 },
    ],
    annonceRetarde: [   // élan tenu : un scintillement aigu qui dure, sur un grondement
      { forme: 'sine', f0: 1500, duree: 1.1, volume: 0.1, vib: [6, 28] },
      { forme: 'sawtooth', f0: 110, f1: 150, duree: 1.1, volume: 0.14, lp: 500 },
      { forme: 'square', f0: 2400, duree: 0.03, volume: 0.2 },
    ],
    annonceDouble: [    // deux balayages qui montent, l'un derrière l'autre
      { forme: 'sawtooth', f0: 170, f1: 420, duree: 0.4, volume: 0.1 },
      { forme: 'sawtooth', f0: 170, f1: 420, duree: 0.4, volume: 0.1, retard: 0.42 },
    ],
    annoncePluie: [     // des pulsations de plus en plus aiguës
      { forme: 'sine', f0: 300, duree: 0.26, volume: 0.16 },
      { forme: 'sine', f0: 380, duree: 0.26, volume: 0.16, retard: 0.12 },
      { forme: 'sine', f0: 480, duree: 0.26, volume: 0.16, retard: 0.24 },
      { forme: 'sine', f0: 600, duree: 0.26, volume: 0.16, retard: 0.36 },
      { forme: 'sine', f0: 760, duree: 0.3, volume: 0.16, retard: 0.48 },
    ],
    pasHeros: [
      { bruit: true, filtre: 'lowpass', hz: 700, duree: 0.07, volume: 0.2 },
      { forme: 'sine', f0: 150, f1: 80, duree: 0.09, volume: 0.16 },
    ],
    pasBoss: [
      { forme: 'sine', f0: 72, f1: 28, duree: 0.34, volume: 0.7 },
      { bruit: true, filtre: 'lowpass', hz: 260, duree: 0.24, volume: 0.34 },
    ],
    mort: [{ forme: 'sine', f0: 80, f1: 25, duree: 1.0, volume: 0.5 }],
    victoire: [
      { forme: 'sine', f0: 220, duree: 1.2, volume: 0.25 },
      { forme: 'sine', f0: 330, duree: 1.2, volume: 0.2, retard: 0.15 },
      { forme: 'sine', f0: 440, duree: 1.2, volume: 0.2, retard: 0.3 },
    ],
  },

  // ---- Fiches de monstre ----
  // nom, largeur (zone touchée), echelle (taille du sprite), vie, vitesse (marche), rythme (durée des élans : plus petit = plus rapide),
  // ouvertureMs, poids / poids2 (attaques de la phase 1 et de la phase 2), palette (null : planches telles quelles),
  // effets (lueur de la tête, cendres ou braises du corps, traînée de la lame), flammes (couleurs des cinq flammes, facultatif)
  monstres: {
    grimalkin: {
      nom: 'Grimalkin', largeur: 60, echelle: 1, vie: 400, vitesse: 120, rythme: 1, ouvertureMs: 800,
      poids: { fauchage: 4, retarde: 2, double: 2, sort: 2, pluie: 0, orbe: 2, ruee: 2 },
      poids2: { fauchage: 3, retarde: 2, double: 3, sort: 1, pluie: 3, orbe: 3, ruee: 3 },
      palette: null,
      effets: {
        lueurTete: { couleur: '255,70,30', rayon: 26, alpha: 0.22, pulseHz: 0.9, hauteur: 104 },
        corps: { couleur: '#b4aab0', parSeconde: 4, vie: 1900, montee: 20, braise: false },
        trainee: { couleur: '#ecebf5' },
        phase2: 1.8,
      },
    },
    faucheurCendre: {
      nom: 'Le Faucheur de cendre', largeur: 66, echelle: 1, vie: 600, vitesse: 85, rythme: 1.18, ouvertureMs: 950,
      poids: { fauchage: 5, retarde: 3, double: 2, sort: 1, pluie: 0, orbe: 1, ruee: 1 },
      poids2: { fauchage: 4, retarde: 3, double: 3, sort: 1, pluie: 2, orbe: 2, ruee: 2 },
      palette: {                                  // gris et os
        rampe: ['#0e0d0c', '#242320', '#45423c', '#736d62', '#a69d89', '#d5ccb2'],
        accents: [[255, 80, 20], [255, 210, 120], [255, 150, 60]], tolerance: 90, contraste: [0.05, 0.6],
      },
      effets: {
        lueurTete: { couleur: '210,200,180', rayon: 28, alpha: 0.2, pulseHz: 0.6, hauteur: 104 },
        corps: { couleur: '#a89f93', parSeconde: 7, vie: 2300, montee: 16, braise: false },
        trainee: { couleur: '#d8d2c2' },
        phase2: 1.8,
      },
      flammes: { couleurs: ['236,226,206', '190,176,150', '120,108,92', '50,46,40'], couleurs2: ['255,248,232', '220,206,176', '150,136,112', '70,62,52'] },
    },
    faucheurBraise: {
      nom: 'Le Faucheur de braise', largeur: 54, echelle: 1, vie: 300, vitesse: 165, rythme: 0.85, ouvertureMs: 650,
      poids: { fauchage: 2, retarde: 1, double: 1, sort: 4, pluie: 0, orbe: 4, ruee: 2 },
      poids2: { fauchage: 1, retarde: 1, double: 2, sort: 3, pluie: 5, orbe: 5, ruee: 3 },
      palette: {                                  // noir et rouge
        rampe: ['#040205', '#14070a', '#321014', '#5c1a1a', '#96281f', '#cf4a2e'],
        accents: [[255, 80, 20], [255, 210, 120], [255, 150, 60]], tolerance: 90, contraste: [0.05, 0.6],
      },
      effets: {
        lueurTete: { couleur: '255,40,20', rayon: 30, alpha: 0.3, pulseHz: 1.3, hauteur: 104 },
        corps: { couleur: '#ff7a30', parSeconde: 9, vie: 1500, montee: 34, braise: true },
        trainee: { couleur: '#ff9a70' },
        phase2: 1.8,
      },
      flammes: { couleurs: ['255,170,90', '240,60,28', '170,18,12', '60,6,8'], couleurs2: ['255,210,140', '255,90,40', '200,24,14', '90,10,10'] },
    },
  },

  // Le héros a aussi sa fiche : sa palette peut être repeinte de la même façon (null : planches telles quelles)
  heroFiche: { palette: null },

  // Ombres au sol sous les personnages (lot 9)
  ombre: { alpha: 0.42, largeurHeros: 1.6, largeurBoss: 1.9, aplat: 0.16 },
  // Poussière de l'esquive et étincelles des coups du héros (lot 9)
  poussiere: { nombre: 9, vie: 520, vitesse: 70, taille: 3.2, alpha: 0.45, couleur: '150,140,128' },
  etincelles: { nombre: 7, vie: 320, vitesse: 190, gravite: 520, longueur: 7, couleur: '255,214,150' },
};
