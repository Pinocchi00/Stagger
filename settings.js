// Fichier de réglages : toutes les valeurs chiffrées du jeu vivent ici.
// Les valeurs des lots suivants s'y ajoutent au fil des lots.
const SETTINGS = {
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
  enduranceMax: 100,
  enduranceAttaque: 20,
  enduranceRoulade: 30,
  enduranceRegenParSeconde: 40,
  enduranceRegenDelaiMs: 500, // temps sans action avant que l'endurance remonte

  // Roulade (lot 1)
  rouladeMs: 500,
  rouladeLargeurs: 3,         // distance, en largeurs de héros
  rouladeInvulnerableMs: 300,
  rouladeAlpha: 0.45,         // opacité du héros tant qu'il est invulnérable

  // Attaque (lot 1)
  attaqueMs: 350,
  attaqueDegats: 10,
  attaque2Degats: 14,
  attaquePortee: 90,          // devant le héros, depuis son bord
  attaqueImpactRatio: 0.5,    // moment du coup dans l'attaque, en part de sa durée
  enchainementMs: 300,        // temps après une attaque pour enchaîner la deuxième

  // Boss (lot 2)
  bossNom: 'Le Boss',         // son nom reste à choisir
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
  pluieMarques: 3,            // marques de la Pluie de sorts
  pluieEcartMs: 350,          // écart entre deux marques
  sortLoinMinMs: 600,         // marche avant de lancer un Sort de loin, au plus court
  sortLoinMaxMs: 1800,        // et au plus long
  poids: { fauchage: 4, retarde: 2, double: 2, sort: 2, pluie: 2 }, // la Pluie ne sort qu'en phase 2
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
  phase2Seuil: 0.5,           // part de vie du boss sous laquelle la phase 2 commence
  phase2VitesseFacteur: 1.3,  // marche 30 % plus vite
  phase2OuvertureMs: 500,     // ouverture après chaque série

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
  glisserMinPx: 40,           // glissement minimal du pouce droit pour rouler

  // Affichage (lot 1)
  barreLargeur: 220,
  barreHauteur: 28,           // deux fois plus hautes (lot 6)
  barreMarge: 16,
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
  runesCouleur: '#a070e0',
  runesCouleurVive: '#e0ccff',
  runesAplat: 0.28,           // hauteur du cercle, en part de sa largeur
  runesNombre: 12,
  runesTaille: 14,            // taille d'une rune
  runesTourParSeconde: 0.15,
  runesPulseHz: 2,            // pulsations par seconde au début
  runesPulseAccel: 4,         // pulsations ajoutées par seconde à l'approche de l'explosion
  runesEpaisseur: 3,

  // Fond (lot 5) : plans sombres du plus lointain au plus proche
  fond: {
    graine: 7,
    margeParallaxe: 200,
    cielHaut: '#07070a',
    cielBas: '#16141a',
    sol: '#1b1b21',
    plans: [
      { type: 'pics', parallaxe: 0.02, couleur: '#121218', largeurMin: 180, largeurMax: 380, hauteurMin: 160, hauteurMax: 340, espaceMax: 60 },
      { type: 'colonnes', parallaxe: 0.05, couleur: '#0e0e13', largeurMin: 40, largeurMax: 90, hauteurMin: 120, hauteurMax: 300, espaceMax: 220, cassureRatio: 0.18 },
      { type: 'colonnes', parallaxe: 0.1, couleur: '#08080b', largeurMin: 60, largeurMax: 120, hauteurMin: 200, hauteurMax: 420, espaceMax: 480, cassureRatio: 0.12 },
    ],
  },

  // Impacts (lot 5)
  arretCoupDonneMs: 50,       // arrêt sur image quand le héros touche le boss
  arretCoupRecuMs: 90,        // arrêt sur image quand le héros est touché
  tremblementCoupDonneMs: 120,
  tremblementCoupDonnePx: 5,
  tremblementCoupRecuMs: 260,
  tremblementCoupRecuPx: 16,

  // Sons produits par le code (lot 5) : oscillateur { forme, f0, f1 } ou bruit filtré { bruit, hz, filtre }
  sonVolume: 0.5,
  sons: {
    attaque: [{ bruit: true, filtre: 'highpass', hz: 2500, duree: 0.12, volume: 0.18 }],
    roulade: [{ bruit: true, filtre: 'lowpass', hz: 700, duree: 0.25, volume: 0.2 }],
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
    mort: [{ forme: 'sine', f0: 80, f1: 25, duree: 1.0, volume: 0.5 }],
    victoire: [
      { forme: 'sine', f0: 220, duree: 1.2, volume: 0.25 },
      { forme: 'sine', f0: 330, duree: 1.2, volume: 0.2, retard: 0.15 },
      { forme: 'sine', f0: 440, duree: 1.2, volume: 0.2, retard: 0.3 },
    ],
  },
};
