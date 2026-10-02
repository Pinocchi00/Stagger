// Fichier de réglages : toutes les valeurs chiffrées du jeu vivent ici.
// Les valeurs des lots suivants s'y ajoutent au fil des lots.
const SETTINGS = {
  fps: 60,
  dtMaxMs: 100,               // plus long pas de temps accepté entre deux images

  // Arène (lot 1) : unités de jeu, la hauteur de l'arène vaut hauteurArene
  hauteurArene: 720,
  solY: 600,                  // hauteur du sol, mesurée depuis le haut

  // Héros (lot 1)
  heroLargeur: 40,
  heroHauteur: 80,
  heroDepartX: 160,           // position de départ, depuis la gauche
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
  rouladeAplatiRatio: 0.5,    // hauteur du héros pendant la roulade
  rouladeAlpha: 0.45,         // opacité du héros tant qu'il est invulnérable

  // Attaque (lot 1)
  attaqueMs: 350,
  attaqueDegats: 10,
  attaque2Degats: 14,
  attaquePorteeLargeurs: 1.5, // en largeurs de héros
  attaqueImpactRatio: 0.5,    // moment du coup dans l'attaque, en part de sa durée
  enchainementMs: 300,        // temps après une attaque pour enchaîner la deuxième

  // Mannequin (lot 1)
  mannequinLargeur: 70,
  mannequinHauteurHeros: 3,   // hauteur, en hauteurs de héros
  mannequinDepartDroite: 160, // distance entre son bord droit et le bord de l'écran
  mannequinFlashMs: 120,

  // Commandes tactiles (lot 1)
  zoneMortePx: 12,            // glissement minimal du pouce gauche pour marcher
  glisserMinPx: 40,           // glissement minimal du pouce droit pour rouler
  toucherMaxMs: 250,          // durée maximale d'un toucher pour compter comme attaque

  // Affichage (lot 1)
  barreLargeur: 220,
  barreHauteur: 14,
  barreMarge: 16,
  barreEspace: 8,
};
