# Jeu de boss dark fantasy : brief de la version 1

## Le jeu en bref

Un combat de boss en 2D vu de profil, sur téléphone : un héros qui court, roule et frappe, contre un seul boss qui tue vite.

- **Idée centrale :** tout le jeu est un boss, dans une seule arène de la largeur de l'écran.
- **Ce que le joueur fait :** il lit l'annonce d'une attaque, roule au travers ou recule, frappe pendant l'ouverture, et surveille son endurance.
- **Ce qui le rend exigeant :** le héros meurt en trois coups, et chaque roulade ou frappe coûte de l'endurance.
- **Références :** Blasphemous, Salt and Sanctuary et Hollow Knight pour le combat de profil.
- **Le filtre pour tout ajout :** est-ce que ça rend le duel plus lisible ou plus tendu ? Sinon, ça n'entre pas.

## Décisions fixées

| Sujet | Décision |
| --- | --- |
| Support | Téléphone tenu à l'horizontale, dans le navigateur. Jouable au clavier sur PC pour tester. |
| Technique | HTML, JavaScript et Canvas 2D, sans moteur ni framework. Mise en ligne sur GitHub Pages. 60 images par seconde. |
| Vue | De profil. Une seule arène fixe, large comme l'écran, sans défilement. Le héros part à gauche, le boss à droite. |
| Visuel | Version de base en formes simples dessinées par le code. Ensuite, sprites gratuits en pixel art. |
| Coût | Zéro. Uniquement des packs gratuits, utilisables dans un projet commercial. |
| Difficulté | Exigeante, sans mode facile. On meurt beaucoup avant de gagner. |
| Mort | Reprise du combat en moins de 2 secondes. |
| Réglages | Toutes les valeurs chiffrées vivent dans un seul fichier de réglages. |
| Langue | Français. |

## Le héros

Le héros se joue à deux pouces, sans bouton affiché : le pouce gauche déplace, le pouce droit agit.

| Geste | Zone de l'écran | Action |
| --- | --- | --- |
| Glisser et maintenir | Moitié gauche | Marche vers la gauche ou la droite. Le point où le pouce se pose sert de centre. |
| Toucher | Moitié droite | Attaque. Un second toucher juste après enchaîne une deuxième attaque. |
| Glisser | Moitié droite | Roulade dans la direction du geste. |

Au clavier, pour tester sur PC : flèches pour marcher, espace pour attaquer, Maj pour rouler.

- **Vie :** 100 points.
- **Endurance :** 100 points. Une attaque en coûte 20, une roulade 30. Elle remonte de 40 points par seconde après une demi-seconde sans action. À zéro, ni attaque ni roulade.
- **Roulade :** 0,5 seconde, sur trois largeurs de héros. Le héros est invulnérable pendant les 0,3 premières secondes et peut traverser le boss.
- **Attaque :** 0,35 seconde, 10 points de dégâts, portée d'une largeur et demie de héros. La deuxième attaque de l'enchaînement fait 14 points.
- **Coup reçu :** le héros recule et reste 0,3 seconde sans contrôle.
- **Orientation :** le héros regarde toujours le boss.

Ce sont des valeurs de départ, à régler en jouant.

## Le boss

Le boss a 400 points de vie, deux attaques et une seconde phase à mi-vie. Son nom reste à choisir.

| Attaque | Annonce | Effet | Réponse |
| --- | --- | --- | --- |
| Fauchage | Il lève son arme pendant 0,6 s. | Il frappe toute la zone devant lui. 35 points de dégâts. | Rouler au travers, ou reculer hors de portée. |
| Sort | Il incante pendant 0,8 s. Une marque apparaît au sol sous le héros. | La marque explose 0,7 s après son apparition. 30 points de dégâts. | Quitter la marque en marchant ou en roulant. |

Il marche vers le héros. À portée, il lance le Fauchage. À distance, il lance le Sort. Après chaque attaque, il reste immobile 0,8 seconde : c'est l'ouverture pour frapper.

- **Phase 1, au-dessus de la moitié de sa vie.** Une attaque à la fois.
- **Phase 2, en dessous.** Il marche 30 % plus vite, lance trois Sorts à la suite, et enchaîne parfois un Fauchage juste après un Sort. L'ouverture tombe à 0,5 seconde.

Sa barre de vie est en bas de l'écran, avec son nom. La vie et l'endurance du héros sont en haut à gauche.

## Version de base, puis sprites

La version de base n'utilise aucune image : le code dessine tout en formes simples, pour régler le combat avant de l'habiller. Elle ne sera pas belle, et ce n'est pas son rôle : elle se juge avec les mains.

- **Héros :** un rectangle clair.
- **Boss :** un rectangle sombre, trois fois plus haut que le héros.
- **Annonces :** le boss clignote en orange pendant l'élan. La zone frappée s'affiche en rouge. La marque du Sort est un disque rouge au sol.
- **Roulade :** le rectangle du héros s'aplatit et devient translucide tant qu'il est invulnérable.

Les sprites arrivent au lot 4. Les deux packs sont gratuits et autorisés dans un projet commercial, d'après leur page au 2 octobre 2026.

| Rôle | Pack | Animations |
| --- | --- | --- |
| Héros | [Fantasy Knight](https://aamatniekss.itch.io/fantasy-knight-free-pixelart-animated-character), d'aamatniekss | Roulade (12 images), attaque 1 (4), attaque 2 (6), attaque accroupie (4). Le reste de la liste est à vérifier en ouvrant le pack. |
| Boss | [Bringer of Death](https://clembod.itch.io/bringer-of-death-free), de Clembod | Attente (8), marche (8), attaque (10), incantation (9), sort (16), coup reçu (3), mort (10). |

Les durées du combat restent celles du fichier de réglages. Les animations sont calées dessus, jamais l'inverse.

## Les lots

Un lot n'est envoyé que quand le précédent est validé en jouant sur le téléphone. Chaque lot s'envoie avec ce message :

```
Lis BRIEF.md. Réalise uniquement le lot N, décrit dans la section « Les lots ».
N'ajoute rien qui ne figure pas dans le brief.
Mets toutes les valeurs chiffrées dans le fichier de réglages.
À la fin, coche le lot dans README.md et explique-moi comment tester sur téléphone.
```

| Lot | Contenu | Validé quand |
| --- | --- | --- |
| 0. Mise en place | Dépôt, `index.html` avec un canvas plein écran à l'horizontale, `README.md`, fichier de réglages, mise en ligne sur GitHub Pages. | Le lien s'ouvre sur ton téléphone. |
| 1. Le héros | L'arène, le héros en rectangle, la marche, la roulade avec invulnérabilité, les deux attaques, l'endurance, les commandes tactiles et clavier. Un mannequin immobile sert de cible. | Marcher, rouler et frapper répondent au pouce sans jamais se confondre. |
| 2. Le boss | Le boss en rectangle, sa marche, le Fauchage et le Sort avec leurs annonces, les barres de vie, la mort avec reprise immédiate, la victoire. | Un combat complet se joue de bout en bout, et chaque mort paraît méritée. |
| 3. Phase 2 et réglage | La phase 2. Aucune autre nouveauté : les valeurs sont ajustées jusqu'à la bonne difficulté. | Tu bats le boss, mais pas avant plusieurs dizaines de tentatives. |
| 4. Les sprites | Les deux packs gratuits remplacent les rectangles, calés sur les durées du fichier de réglages. | Chaque attaque du boss se reconnaît à son animation avant de frapper. |
| 5. Décor, effets et son | Un fond sombre en plusieurs plans, arrêt sur image et tremblement à l'impact, sons produits par le code. | Quelqu'un qui regarde par-dessus ton épaule veut essayer. |

Compte une séance par lot. Les lots 1 et 3 sont surtout du réglage.

## Plus tard

Ces idées sont mises de côté jusqu'à ce que le combat de base soit bon.

- **Le créateur de perso.** Avec un sprite tout fait, on ne peut changer que sa teinte, pas sa forme.
- **L'arme prise au boss.** Elle demande un jeu d'animations du héros par arme.
- **Une parade ou un blocage,** si le pack du héros en contient l'animation.
- **Une fiole de soin.**
- **D'autres boss,** avec d'autres packs gratuits.
- **Le boss peint, animé par vidéo.** Une piste à tester à part, sans bloquer le reste.
- **Des packs payants,** plus cohérents entre héros, boss et décor.
