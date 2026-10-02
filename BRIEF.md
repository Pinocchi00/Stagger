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
| Vue | De profil, dans une seule arène. Le héros part à gauche, le boss à droite. À partir du lot 6, la caméra est rapprochée et suit le duel. |
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

Les lots 0 à 5 sont terminés. Les lots 6 à 13 sont détaillés dans la section suivante.

## Lots 6 à 13

Ces lots font du prototype un jeu : d'abord ce qui se joue, ensuite ce qui se voit et s'entend. Le lot 6 ajoute aussi les lots 6 à 13 à la liste de `README.md`. Chacun s'envoie avec ce message :

```
Lis BRIEF.md. Réalise uniquement le lot N, décrit dans la section « Lots 6 à 13 ».
N'ajoute rien qui ne figure pas dans le brief.
Mets toutes les valeurs chiffrées dans le fichier de réglages.
À la fin, coche le lot dans README.md et explique-moi comment tester sur téléphone.
```

### Lot 6 : caméra et lisibilité

- **Caméra rapprochée.** Le héros occupe environ un quart de la hauteur de l'écran. La caméra suit le milieu entre le héros et le boss, avec un mouvement adouci. S'ils s'éloignent trop pour tenir à l'écran, elle recule juste assez pour garder les deux.
- **Arène de largeur fixe.** 1 200 unités, avec un mur invisible à chaque bout, quelle que soit la taille de l'écran. Le boss démarre à 500 unités du héros.
- **Pixels à la même taille.** Le héros et le boss sont agrandis par le même facteur entier. Le boss sera moins haut qu'aujourd'hui, mais net.
- **Plus de formes provisoires.** Le rectangle rouge du Fauchage devient un arc clair qui suit la faux pendant 0,15 seconde. Le disque rouge du Sort devient un cercle de runes de la couleur du boss, qui pulse jusqu'à l'explosion. Le rectangle gris de l'attaque du héros disparaît.
- **Attaque à la pose du doigt.** Elle part dès que le doigt touche l'écran. Si le doigt glisse avant le coup, la roulade annule l'attaque et son coût en endurance est rendu.
- **Interface lisible.** Barres deux fois plus hautes. Écran de départ « Touche pour commencer ». En position verticale, le jeu se met en pause et affiche « Tourne ton téléphone ».

Validé quand : sur le téléphone, le héros se lit sans effort et aucune forme provisoire n'apparaît.

### Lot 7 : boss varié et vacillement

Ce lot remplace le comportement décrit dans la section « Le boss ».

- **Il approche toujours.** Il marche vers le héros à toute distance. De loin, il s'arrête parfois pour lancer un Sort, au lieu de les enchaîner sur place.
- **Choix des attaques.** Tirage au hasard avec un poids par attaque, jamais trois fois la même de suite.
- **Portée du héros.** Son attaque passe à 90.
- **Vacillement.** Le boss a une jauge de posture, affichée en trait fin sous sa barre de vie. Chaque coup du héros la remplit d'un cran, le second coup d'un enchaînement d'un cran et demi. Elle se vide d'un cran par seconde après 2 secondes sans coup. À 6 crans, le boss vacille : son attaque est interrompue, il reste sans défense 2 secondes et subit des dégâts multipliés par 1,5. La jauge repart de zéro.

| Attaque | Annonce | Ce qui la distingue |
| --- | --- | --- |
| Fauchage | Élan de 0,6 s | L'attaque actuelle, avec une portée ramenée à 150. |
| Fauchage retardé | Élan tenu 1,1 s, la faux luit en blanc | Il punit la roulade lancée trop tôt. |
| Double fauchage | Élan de 0,6 s, puis second coup 0,45 s après | Le boss se retourne vers le héros avant le second coup. |
| Sort | Incantation de 0,8 s, marque sous le héros | Il peut aussi partir au contact. |
| Pluie de sorts | Incantation de 0,8 s, trois marques à 0,35 s d'écart | Phase 2 seulement. |

Validé quand : en restant au contact trente secondes, on voit au moins trois attaques différentes. Faire vaciller le boss donne envie de recommencer.

### Lot 8 : réglage du combat

Aucune nouveauté. Tu joues sur ton téléphone et tu fais ajuster les valeurs : vie, dégâts, portées, durées d'annonce, ouvertures, posture.

Validé quand : tu bats le boss après plusieurs dizaines de tentatives, et tu peux nommer la cause de chaque mort.

### Lot 9 : monstres personnalisés

- **Fiche de monstre.** Tout ce qui définit le boss tient dans une fiche du fichier de réglages : nom, taille, vie, vitesse, palette, effets, liste des attaques avec leur poids. Créer une variante revient à copier une fiche. Un réglage `bossActif` choisit la fiche jouée.
- **Deux fiches livrées.** « Le Faucheur de cendre », lent et endurant, en gris et os. « Le Faucheur de braise », plus rapide et plus fragile, en noir et rouge, qui lance davantage de sorts.
- **Palette repeinte par le code.** Au chargement, le code repeint les planches du héros et du boss : désaturation, puis remplacement des couleurs listées dans la fiche. Une couleur d'accent par personnage est préservée.
- **Effets attachés au boss.** Une lueur qui pulse au niveau de la tête. Des cendres ou des braises qui montent de son corps. Une traînée derrière la faux. Tout s'intensifie en phase 2.
- **Effets attachés au héros.** De la poussière au départ et à la fin de la roulade. Des étincelles à l'impact de ses coups.
- **Ombres au sol** sous le héros et sous le boss.

Validé quand : le héros et le boss semblent venir du même jeu, et changer de fiche change le monstre sans toucher au code.

### Lot 10 : environnement

- **Cinq plans.** Un ciel avec un astre voilé. Une ruine immense au loin. Des colonnes et des arches brisées. Des tombes et des grilles près du sol. Des silhouettes floues et très sombres au premier plan, devant les personnages.
- **Sol.** Des dalles fissurées, plus claires autour des personnages.
- **Brume.** Deux nappes translucides qui dérivent à des vitesses différentes.
- **Météo.** Des cendres qui tombent en biais, poussées par le vent.
- **Lumière.** Les bords de l'écran sont assombris. Un halo se tient derrière le boss. Un éclair bref éclaire la scène à l'explosion d'un Sort.
- **Phase 2.** Le vent forcit, les cendres deviennent des braises, la scène vire légèrement au rouge.

Validé quand : une capture d'écran prise au hasard donne envie de savoir ce qu'est ce jeu.

### Lot 11 : ambiance sonore

Tous les sons restent produits par le code.

- **Fond.** Un vent continu et un bourdon grave, qui varient lentement.
- **Musique.** En phase 1, un tambour lent sur le bourdon. En phase 2, un tambour deux fois plus rapide et une note dissonante. Silence complet pendant le vacillement.
- **Héros.** Ses pas, le souffle de la roulade, le sifflement de la lame.
- **Boss.** Des pas lourds, un râle au début de chaque attaque, un son d'annonce différent par attaque.
- **Impacts.** Le fond baisse brièvement à chaque coup, pour que l'impact ressorte.

Validé quand : les yeux fermés, on reconnaît chaque attaque et le passage en phase 2.

### Lot 12 : mise en scène

- **Écran titre.** Le nom du jeu, STAGGER, et « Touche pour commencer ».
- **Entrée du boss.** À la première tentative seulement : bandes noires, la caméra glisse du héros au boss, le boss se redresse, son nom s'affiche. La scène dure 4 secondes et se passe d'un toucher.
- **Vacillement.** Ralenti d'une demi-seconde, zoom sur le boss, bandes noires.
- **Passage en phase 2.** Le combat se fige 1,5 seconde : zoom sur le boss, tremblement, la météo bascule.
- **Coup fatal.** Ralenti d'une seconde, zoom, son coupé.
- **Mort du héros.** Ralenti, l'image perd ses couleurs, le mot MORT apparaît. La reprise reste sous les 2 secondes.
- **Victoire.** Le boss tombe en cendres, silence, puis le temps du combat et le nombre de tentatives s'affichent.
- **Caméra vivante.** Léger zoom à chaque coup donné, léger recul à chaque attaque du boss.

Validé quand : quelqu'un qui regarde par-dessus ton épaule veut essayer.

### Lot 13 : réglage final

Aucune nouveauté. Les effets, les sons et la mise en scène ont changé le rythme : les valeurs du combat sont reprises une dernière fois.

Validé quand : le combat est aussi lisible qu'au lot 8, avec tout l'habillage.

## Plus tard

Ces idées sont mises de côté jusqu'à ce que le combat de base soit bon.

- **Le créateur de perso.** Avec un sprite tout fait, on ne peut changer que sa teinte, pas sa forme.
- **L'arme prise au boss.** Elle demande un jeu d'animations du héros par arme.
- **Une parade ou un blocage,** si le pack du héros en contient l'animation.
- **Une fiole de soin.**
- **D'autres boss,** avec d'autres packs gratuits.
- **Le boss peint, animé par vidéo.** Une piste à tester à part, sans bloquer le reste.
- **Des packs payants,** plus cohérents entre héros, boss et décor.
