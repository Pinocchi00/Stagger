# Lot 1 : la parade seule

Cette fiche précise le lot 1 de `BRIEF.md`. En cas de doute, le brief fait foi.

## Objectif

Le boss lance une seule attaque en boucle, la Taille vive, et le joueur la pare d'un toucher. Le lot sert à régler une seule chose : la sensation de la parade sur téléphone.

## Message à envoyer à l'agent

```
Lis BRIEF.md puis LOT-1.md. Réalise uniquement le lot 1, tel que LOT-1.md le décrit.
N'ajoute rien qui ne figure pas dans ces deux fichiers.
Mets toutes les valeurs chiffrées dans le fichier de réglages.
À la fin, coche le lot 1 dans README.md et explique-moi comment tester sur téléphone.
```

## Affichage

- Un canvas en plein écran, au format 16:9, centré, avec des bandes noires si l'écran a un autre format.
- En position verticale, le jeu se met en pause et affiche « Tourne ton téléphone ».
- Les trois images sont chargées avant le début : `images/boss-attente.jpg`, `images/boss-vive-elan.jpg`, `images/boss-vive-coup.jpg`.
- Chaque image remplit tout le canvas. Elles ont le même cadre et le même décor, donc on passe de l'une à l'autre sans fondu.
- Un écran de départ affiche « Touche pour commencer ». Ce premier toucher lance le jeu et débloque le son.

## Cycle de l'attaque

Le boss répète ce cycle sans fin :

1. **Attente.** Image `boss-attente`. Durée tirée au hasard entre `attenteMinMs` et `attenteMaxMs`, pour qu'on ne puisse pas parer au rythme.
2. **Élan.** Image `boss-vive-elan`, pendant `elanMs`. Un éclat orange bref marque le début. L'image zoome légèrement pendant toute la durée.
3. **Impact.** À la fin de l'élan, l'image passe à `boss-vive-coup`. C'est l'instant de référence pour juger la parade.
4. **Retour.** L'image du coup reste `coupMs`, puis le cycle reprend à l'attente.

## La parade

- Un toucher n'importe où sur l'écran est une parade. Sur PC : clic ou barre d'espace.
- Le jeu compare l'instant du toucher à l'instant de l'impact, après avoir retiré `decalageTactileMs` pour compenser le retard de l'écran.
- **Parfaite :** le toucher tombe dans les `parfaiteMs` avant l'impact, ou jusqu'à `toleranceApresMs` après.
- **Simple :** le toucher tombe dans les `simpleMs` avant l'impact.
- **Ratée :** aucun toucher dans ces fenêtres.
- Un seul toucher compte par attaque. Un toucher trop tôt pendant l'élan est perdu, et l'attaque est ratée. Marteler l'écran ne doit jamais marcher.
- Un toucher pendant l'attente ne fait rien et ne pénalise pas.

## Retours selon le résultat

| Résultat | Image | Écran | Son provisoire |
| --- | --- | --- | --- |
| Parfaite | Arrêt sur image de `arretImageMs` sur l'impact | Éclat blanc bref, étincelles au point de contact, léger zoom | Tintement métallique aigu, avec une courte résonance |
| Simple | Pas d'arrêt | Petit éclat, léger tremblement | Choc métallique mat, plus grave |
| Ratée | Pas d'arrêt | Tremblement fort, voile rouge de `voileRougeMs`, vibration si l'appareil le permet | Impact sourd et grave |

Les trois sons sont produits par le code, avec l'audio du navigateur. Ils sont provisoires : le lot 7 les remplacera.

## Affichage de réglage

Un petit texte discret, dans un coin, affiché tant que `debug` vaut vrai :

- l'écart du dernier toucher par rapport à l'impact, en millisecondes, avec son résultat (exemple : « −85 ms, simple ») ;
- la série de parades parfaites en cours et la meilleure série ;
- la valeur actuelle de `decalageTactileMs`, avec deux boutons « − » et « + » pour la changer par pas de 10 ms sans toucher au code.

Ces boutons sont la seule zone de l'écran qui ne déclenche pas de parade.

## Fichier de réglages

Toutes ces valeurs vivent dans le fichier de réglages créé au lot 0.

| Nom | Valeur de départ | Rôle |
| --- | --- | --- |
| `attenteMinMs` | 800 | Attente la plus courte entre deux attaques |
| `attenteMaxMs` | 1600 | Attente la plus longue |
| `elanMs` | 400 | Durée de l'élan avant l'impact |
| `coupMs` | 350 | Durée d'affichage de l'image du coup |
| `parfaiteMs` | 120 | Fenêtre de la parade parfaite avant l'impact |
| `simpleMs` | 250 | Fenêtre de la parade simple avant l'impact |
| `toleranceApresMs` | 30 | Marge acceptée après l'impact pour une parfaite |
| `decalageTactileMs` | 40 | Compensation du retard de l'écran tactile |
| `arretImageMs` | 80 | Arrêt sur image d'une parade parfaite |
| `voileRougeMs` | 150 | Durée du voile rouge d'un coup encaissé |
| `tremblementSimplePx` | 4 | Amplitude du tremblement d'une parade simple |
| `tremblementRatePx` | 14 | Amplitude du tremblement d'un coup encaissé |
| `zoomElan` | 1.04 | Zoom atteint à la fin de l'élan |
| `debug` | vrai | Affichage de réglage |

## Interdit dans ce lot

Points de vie, mort, garde du boss, queues, flammes, esquive, frappes, ouvertures, autres attaques, musique, menus, créateur de perso, sauvegarde. La boucle est infinie et sans enjeu : on ne règle que la parade.

## Validé quand

- Parer dix fois de suite donne envie de continuer.
- Une parade parfaite se distingue d'une simple sans regarder l'affichage de réglage, à l'œil et à l'oreille.
- L'écart affiché est proche de zéro quand on a le sentiment de parer pile au bon moment. Sinon, `decalageTactileMs` est à ajuster.
- Marteler l'écran fait rater l'attaque.
- Le lien GitHub Pages fonctionne sur le téléphone, à l'horizontale, son compris.
