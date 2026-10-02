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

  // Boss (lot 2)
  bossNom: 'Le Boss',         // son nom reste à choisir
  bossVie: 400,
  bossLargeur: 70,
  bossHauteurHeros: 3,        // hauteur, en hauteurs de héros
  bossDepartDroite: 160,      // distance entre son bord droit et le bord de l'écran
  bossVitesse: 120,           // marche, unités par seconde
  bossDebutMs: 1000,          // immobilité au début du combat
  bossOuvertureMs: 800,       // immobilité après chaque attaque : l'ouverture
  bossDistanceSort: 400,      // au-delà de cet écart, il lance le Sort
  bossFlashMs: 120,           // éclat quand il est touché

  // Fauchage (lot 2)
  fauchageAnnonceMs: 600,
  fauchageDegats: 35,
  fauchagePortee: 220,        // zone frappée devant lui, depuis son bord
  fauchageZoneMs: 150,        // durée d'affichage de la zone rouge

  // Sort (lot 2)
  sortAnnonceMs: 800,
  sortMarqueMs: 700,          // délai entre l'apparition de la marque et l'explosion
  sortDegats: 30,
  sortRayon: 90,              // demi-largeur de la marque au sol
  sortExplosionMs: 150,       // durée d'affichage de l'explosion

  // Phase 2 (lot 3)
  phase2Seuil: 0.5,           // part de vie du boss sous laquelle la phase 2 commence
  phase2VitesseFacteur: 1.3,  // marche 30 % plus vite
  phase2Sorts: 3,             // Sorts lancés à la suite
  phase2FauchageChance: 0.3,  // chance d'un Fauchage juste après la série de Sorts
  phase2OuvertureMs: 500,     // ouverture après chaque série

  // Coup reçu par le héros (lot 2)
  coupRecuMs: 300,            // héros sans contrôle
  coupRecuRecul: 90,          // distance de recul

  // Mort et victoire (lot 2)
  mortMs: 1200,               // de la mort à la reprise, moins de 2 secondes
  victoireAttenteMs: 800,     // avant de pouvoir relancer après la victoire

  // Sprites (lot 4) : taille d'une vignette, point d'appui au sol, échelle
  heroSprite: { largeur: 120, hauteur: 80, pivotX: 55, pivotY: 80, echelle: 2.16 },
  bossSprite: { largeur: 140, hauteur: 93, pivotX: 106, pivotY: 92, echelle: 4.4 },
  sortPivotX: 68,             // point d'appui de l'effet du Sort
  animFps: 10,                // images par seconde des animations en boucle
  fauchageFrameImpact: 4,     // vignette du Fauchage qui tombe sur l'impact
  bossMortMs: 1000,           // animation de mort du boss

  // Commandes tactiles (lot 1)
  zoneMortePx: 12,            // glissement minimal du pouce gauche pour marcher
  glisserMinPx: 40,           // glissement minimal du pouce droit pour rouler
  toucherMaxMs: 250,          // durée maximale d'un toucher pour compter comme attaque

  // Affichage (lot 1)
  barreLargeur: 220,
  barreHauteur: 14,
  barreMarge: 16,
  barreEspace: 8,
  bossBarreLargeur: 520,
  bossBarreBas: 44,           // distance entre la barre du boss et le bas de l'écran
  texteTaille: 48,
  nomTaille: 18,
};
