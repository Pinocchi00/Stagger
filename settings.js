// Fichier de réglages : toutes les valeurs chiffrées du jeu vivent ici.
// Les valeurs des lots suivants s'y ajoutent au fil des lots.
const SETTINGS = {
  fps: 60,

  // Affichage (lot 1)
  ratio: 16 / 9,            // format du jeu, bandes noires autour
  largeurReference: 1280,   // largeur à laquelle les valeurs en px sont exprimées
  tailleTexteRef: 36,       // taille des messages d'écran, en px de référence
  dtMaxMs: 100,             // plus long pas de temps accepté entre deux images

  // Cycle de la Taille vive (lot 1)
  attenteMinMs: 800,
  attenteMaxMs: 1600,
  elanMs: 400,
  coupMs: 350,

  // Parade (lot 1)
  parfaiteMs: 120,
  simpleMs: 250,
  toleranceApresMs: 30,
  decalageTactileMs: 40,
  pasDecalageMs: 10,        // pas des boutons « − » et « + »

  // Retours (lot 1)
  arretImageMs: 80,
  voileRougeMs: 150,
  tremblementSimplePx: 4,
  tremblementRatePx: 14,
  tremblementSimpleMs: 200,
  tremblementRateMs: 300,
  zoomElan: 1.04,
  zoomParfaite: 1.05,
  zoomParfaiteMs: 250,
  vibrationMs: 60,

  // Éclats (lot 1)
  eclatElanMs: 150,
  eclatElanAlpha: 0.6,
  eclatElanX: 0.57,         // position de l'épée levée, en part de l'image
  eclatElanY: 0.1,
  eclatElanRayon: 0.35,     // en part de la largeur
  eclatParfaiteMs: 140,
  eclatParfaiteAlpha: 0.8,
  eclatSimpleMs: 100,
  eclatSimpleAlpha: 0.3,
  voileRougeAlpha: 0.5,

  // Étincelles de la parade parfaite (lot 1)
  contactX: 0.5,            // point de contact, en part de l'image
  contactY: 0.6,
  etincellesNombre: 24,
  etincellesVitesse: 0.9,   // en largeurs d'image par seconde
  etincellesDureeMs: 400,
  etincellesTaillePx: 3,

  // Sons provisoires, remplacés au lot 7 (lot 1)
  sons: {
    parfaite: { partiels: [2100, 3150, 4720], dureeS: 0.55, volume: 0.22, clicDureeS: 0.02, clicVolume: 0.3 },
    simple: { freqs: [520, 780], dureeS: 0.12, volume: 0.15, bruitDureeS: 0.05, bruitVolume: 0.2, bruitFiltreHz: 1800 },
    ratee: { freqDebut: 90, freqFin: 40, dureeS: 0.3, volume: 0.5, bruitDureeS: 0.35, bruitVolume: 0.3, bruitFiltreHz: 500 },
  },

  debug: true,              // affichage de réglage
};
