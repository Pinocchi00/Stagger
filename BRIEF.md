# Jeu de boss dark fantasy : brief de la version 1

## Le jeu en bref

Un duel contre un seul boss, pensé pour le téléphone, long et exigeant, avec une arme unique à lui prendre à la fin.

- **Idée centrale :** tout le jeu est un boss. Il n'y a ni petits combats, ni carte, ni histoire à lire.
- **Ce que le joueur vit :** il crée son perso, entre dans l'arène, meurt beaucoup, apprend les attaques, brise la garde du boss, éteint ses cinq queues une à une, puis lui prend son arme.
- **Le filtre pour tout ajout :** est-ce que ça rend la parade ou le boss plus forts ? Sinon, ça n'entre pas.
- **Références :** Infinity Blade pour le duel tactile sans déplacement, Sekiro pour la garde à briser, Elden Ring pour le ton et l'exigence.

Coupé volontairement : déplacement libre, joystick virtuel, menus pendant le combat, butin aléatoire, niveaux d'expérience, pouvoirs gagnés en cours de combat, ennemis secondaires, dialogues au-delà de la réplique d'entrée du boss.

## Décisions fixées

Les 15 minutes sont celles des premières tentatives, pas celles de la victoire : un boss où l'on meurt beaucoup ne se bat pas en un quart d'heure.

| Sujet | Décision |
| --- | --- |
| Plateforme | Navigateur. Téléphone tenu à l'horizontale, jouable aussi sur PC à la souris et au clavier. |
| Technique | HTML, JavaScript et Canvas 2D : rien à installer, ni moteur ni framework. Mise en ligne sur GitHub Pages. 60 images par seconde. Sons produits par le code, sans fichier audio. Le boss et le décor sont des images fournies, que le code enchaîne et anime. |
| Durée | Une victoire sans erreur dure environ 6 minutes. Les 15 premières minutes couvrent l'entrée du boss et les premières tentatives. |
| Difficulté | Exigeante, sans mode facile ni aide. La victoire se mérite sur plusieurs séances de jeu. |
| Mort | Reprise en moins de 2 secondes, sans revoir l'entrée du boss. Aucun point de reprise en cours de combat. |
| Sauvegarde | Le perso créé et le meilleur résultat (nombre de queues éteintes) restent sur l'appareil. |
| Créateur | 7 à 10 minutes, avant le combat, hors des 15 minutes. |
| Style | Peinture sombre en niveaux de gris pour le boss et le décor, fournie en images. Perso en silhouette noire au premier plan. Une seule couleur : la braise des flammes. |
| Langue | Français. |

## Le combat

Le combat est un duel en temps réel, sans déplacement ni menu, joué avec trois gestes sur tout l'écran.

| Geste | Pendant une attaque du boss | Pendant une ouverture |
| --- | --- | --- |
| Toucher | Parade. Parfaite dans les 120 ms avant l'impact, simple dans les 250 ms. | Frappe rapide. |
| Glisser | Esquive dans la direction du geste. Seule réponse aux attaques imparables. | Aucun effet. |
| Appui long | Aucun effet. | Frappe chargée, lâchée au relâchement. Plus forte, mais le boss peut l'interrompre. |

Un échange se déroule ainsi :

1. Le boss annonce une attaque : une queue s'embrase et le corps prend la pose.
2. Le joueur répond avec le bon geste au bon moment.
3. Une parade parfaite entame la garde du boss. Une parade simple protège sans l'entamer. Une erreur coûte un point de vie.
4. Après une série d'attaques, le boss laisse une ouverture d'environ 2 secondes, et le joueur frappe.
5. Quand la garde tombe à zéro, le boss vacille. Le temps ralentit, le perso bondit et tranche la queue suivante.

La garde se lit sur le crâne du boss, qui se fissure à mesure qu'elle baisse. Elle remonte lentement avec le temps, et plus vite quand le joueur est touché.

Valeurs de départ, à régler en jouant : parade parfaite, 12 % de garde ; frappe rapide, 3 % ; frappe chargée, 15 %. Éteindre une queue demande environ une minute d'échanges, soit une dizaine de parades parfaites et de frappes, jamais un seul coup. Toutes les valeurs chiffrées vivent dans un seul fichier de réglages.

## Le boss

Le boss est une créature trop grande pour l'écran : un crâne humain sur un corps de chat dressé sur deux pattes, deux épées, cinq queues en flammes. Il occupe les trois quarts de la hauteur. Il est vu de face, et le joueur est une petite silhouette de dos au premier plan. Il s'appelle Grimalkin, le Veilleur.

Le boss n'est pas animé de façon fluide. Chaque attaque d'épée tient en deux images fixes, l'élan puis le coup, entre lesquelles le code place zooms, flashs et tremblements. Les cinq queues ne figurent sur aucune pose : le code place cinq fois une même image de queue peinte, à partir du contour des épaules, la fait onduler et pose une flamme au bout.

Les cinq queues portent tout le combat :

- **Elles sont sa vie.** Cinq gardes à briser, une queue éteinte à chaque fois. Aucune barre de vie à l'écran.
- **Elles annoncent les attaques.** Chaque queue porte une attaque et s'embrase avant de frapper. Orange : l'attaque se pare. Rouge : elle s'esquive.
- **Elles s'éteignent dans un ordre fixe.** De la queue 1 à la queue 5, et le boss perd à chaque fois l'attaque liée. Le joueur n'a rien à choisir : c'est une scène de mise à mort.
- **Chaque queue perdue accélère le boss** de 8 %.

| Attaque | Source | Signe | Rythme | Réponse |
| --- | --- | --- | --- | --- |
| Taille vive | Épée gauche | Épée levée, éclat orange | Rapide, 0,4 s | Parade |
| Taille lente | Épée droite | Épée levée, temps mort, éclat orange | Retardée, 1,2 s | Parade tardive |
| Fauchage | Queue 1 | Flamme rouge au ras du sol | 0,7 s | Glisser vers le haut |
| Triple fouet | Queue 2 | Flamme orange, trois pulsations | Trois coups rapprochés | Trois parades |
| Colonne de feu | Queue 3 | Flamme rouge, le sol rougit d'un côté | 0,9 s | Glisser du côté opposé |
| Feinte | Queue 4 | Flamme orange qui s'éteint, puis épée | Faux départ, vrai coup 0,5 s après | Attendre, puis parade |
| Ruée | Queue 5 | Les flammes se rejoignent, le boss se ramasse | 1 s puis impact | Parade parfaite ou glisser vers l'arrière |

Le combat a deux phases :

- **Phase 1, cinq et quatre queues.** Les attaques arrivent une par une. Une ouverture suit chaque série de 2 ou 3 attaques.
- **Phase 2, trois queues ou moins.** Les épées s'enflamment, les attaques s'enchaînent par deux, la météo se durcit. Une ouverture suit chaque série de 4 ou 5 attaques.

Les attaques sont écrites comme des données (signe, durée, type, réponse). On en ajoute une, ou un nouveau boss, sans toucher au moteur du combat.

## Le joueur

Le joueur a 4 points de vie et une classe parmi deux. Il ne gagne aucun pouvoir pendant le combat : la récompense est l'arme du boss, prise à la fin.

- **Vie :** 4 points. Éteindre une queue en rend 1. Il n'existe aucun autre soin.
- **Progression :** le joueur gagne avec ses trois gestes, du début à la fin. Ce qui progresse, c'est lui.

| Classe | Ce qui change |
| --- | --- |
| Garde | Parade parfaite plus large, 150 ms. Esquive plus lente à récupérer. |
| Ombre | Une esquive au dernier moment entame la garde comme une parade parfaite. Parade parfaite plus étroite, 90 ms. |

L'arme se prend à la victoire. Quand Grimalkin tombe en cendres, une de ses épées reste plantée dans le sol. Le joueur l'arrache, puis un écran lui est consacré : son nom, sa description, sa silhouette en grand.

- **Nom :** la Dernière Veilleuse.
- **Apparence :** une lame noire, trop longue pour celui qui la porte, parcourue par cinq flammes. Elle remplace l'arme du perso sur sa silhouette.
- **Effet :** la frappe chargée lâche cinq fouets de flamme.
- **Usage :** elle reste dans la sauvegarde. Le joueur peut réaffronter Grimalkin avec elle, et la garder contre les boss suivants.

## Le créateur de perso

Le créateur dure 7 à 10 minutes et chaque choix se voit ou se ressent pendant le combat. Le perso est affiché en direct, animé, dans le décor de l'arène.

1. **Lignée, 3 au choix.** Elle change la silhouette de base et une règle.
    - Humain : 5 points de vie au lieu de 4.
    - Cendreux : éteindre une queue rend 2 points de vie au lieu de 1.
    - Décharné : 3 points de vie, mais la garde du boss remonte deux fois moins vite.
2. **Classe, 2 au choix.** Garde ou Ombre.
3. **Origine, 4 au choix.** Un court texte, et une phrase différente du boss à l'entrée selon l'origine. Aucun effet chiffré. Exemples : déserteur, fossoyeur, pèlerin, bourreau.
4. **Apparence, 8 réglages.** Taille, carrure, longueur des bras, posture, tête (nue, capuche, heaume, couronne brisée), cornes, cape, arme (épée, hache, lance, faux).
5. **Nom.**
6. **Scène de fin.** Le perso marche vers l'arène, son nom s'affiche, le boss se lève.

Les curseurs vont loin : on doit pouvoir faire une silhouette absurde. Les noms de lignées sont provisoires. Le perso est assemblé à partir de pièces fournies en images, toutes en silhouette noire : corps, têtes, cornes, capes, armes. Les curseurs les étirent et les déplacent.

## Mise en scène et son

L'effet cinéma vient du rythme : un effet à la fois, placé sur un moment précis.

| Moment | Effet |
| --- | --- |
| Parade parfaite | Arrêt sur image de 80 ms, éclat blanc, étincelles, léger zoom. |
| Coup encaissé | Tremblement d'écran, voile rouge de 150 ms, vibration du téléphone si l'appareil le permet. |
| Garde brisée | Ralenti, bandes noires en haut et en bas, zoom sur le crâne, son coupé une demi-seconde. |
| Queue éteinte | La flamme s'étouffe dans un souffle. La scène s'assombrit d'un cran. |
| Passage en phase 2 | Les épées s'enflamment, le vent forcit, les cendres deviennent des braises. |
| Dernière queue | La musique s'arrête. Il reste le vent et les impacts. |
| Mort | Fondu au noir en 1 seconde sur les mots « La veille continue », puis reprise immédiate. |
| Victoire | Le boss s'effondre en cendres. Une épée reste plantée dans le sol, et le joueur la prend. |

- **Lumière :** elle vient des queues. Moins le boss en a, plus la scène est sombre.
- **Décor :** une image peinte de ruines dans la brume, identique derrière toutes les poses, et une caméra qui bouge légèrement en permanence.
- **Météo :** une seule, des cendres poussées par le vent.
- **Son :** chaque attaque a un signe sonore, pour qu'on puisse parer à l'oreille. Tout le son est produit par le code, selon la section « Sons et musique ».

## Les lots

Tout est écrit d'avance, mais un lot n'est envoyé que quand le précédent est validé en jouant. Envoyés d'un bloc, les lots donnent un jeu large et creux.

Ce brief va dans le dépôt sous le nom `BRIEF.md`. Chaque lot s'envoie avec ce message :

```
Lis BRIEF.md. Réalise uniquement le lot N, décrit dans la section « Les lots ».
N'ajoute rien qui ne figure pas dans le brief.
Mets toutes les valeurs chiffrées dans le fichier de réglages.
À la fin, explique-moi comment tester sur téléphone.
```

| Lot | Contenu | Validé quand |
| --- | --- | --- |
| 0. Mise en place | Dépôt GitHub, `index.html` qui affiche un écran noir en plein écran à l'horizontale, `README.md`, `BRIEF.md`, fichier de réglages, mise en ligne sur GitHub Pages. | Le lien GitHub Pages s'ouvre sur ton téléphone. |
| 1. La parade seule | Le boss, avec ses trois premières images (attente, élan, coup), lance une seule attaque en boucle, la Taille vive. Toucher pour parer : parfaite, simple, ratée. Arrêt sur image, éclat, tremblement, trois sons provisoires. | Parer dix fois de suite donne envie de continuer. Le retard tactile est réglé sur ton téléphone. |
| 2. Les trois gestes | Esquive, frappe rapide, frappe chargée, ouvertures. Ajout de la Taille lente et du Fauchage. Vie du joueur, mort, reprise immédiate. | Les trois gestes ne se confondent jamais. Après une mort, on rejoue en moins de 2 secondes. |
| 3. La garde et les queues | Garde du boss, vacillement, queue tranchée dans l'ordre, les cinq attaques de queue, accélération. | Un combat se joue de la première à la cinquième queue sans blocage. |
| 4. Phase 2, victoire et arme | La phase 2, la victoire, la scène de l'épée, l'écran de l'arme, sa sauvegarde, le combat rejouable avec elle. | La victoire donne envie de montrer l'arme à quelqu'un. |
| 5. Les poses du boss | Toutes les images de poses, l'enchaînement de chaque attaque, les cinq queues animées et leurs flammes, le crâne qui se fissure, la lumière liée aux queues. | Chaque attaque se reconnaît à l'œil avant de frapper, son coupé. |
| 6. Mise en scène | Tous les effets du tableau, la météo, la caméra, l'entrée du boss. | Quelqu'un qui regarde par-dessus ton épaule veut essayer. |
| 7. Son | Tous les sons et les deux musiques de la section « Sons et musique », produits par le code. | Les attaques parables se parent les yeux fermés. |
| 8. Créateur | Les six étapes, l'aperçu animé, les effets des lignées et des classes, les textes, la sauvegarde. | Créer un perso prend 7 à 10 minutes sans temps mort. |
| 9. Réglage final | Aucune nouveauté. Les valeurs sont ajustées jusqu'à la bonne difficulté. | Tu bats le boss, mais pas avant plusieurs dizaines de tentatives. |

Les lots 1 à 4 n'utilisent que les trois premières images du boss : le combat doit être bon avant que tu produises les autres. Compte une séance par lot, et davantage pour les lots 1, 5 et 9, qui sont surtout du réglage.

Le `README.md` du lot 0 tient en une page : le jeu en trois lignes, le lien pour jouer, la façon de tester sur téléphone, l'état de chaque lot, et la règle « rien hors du brief ». Il est mis à jour à la fin de chaque lot. Un lot peut avoir une fiche détaillée, `LOT-N.md`, déposée dans le dépôt : elle précise le brief sans le contredire.

## Images à produire

Une trentaine d'images, dont onze pour le boss. Les trois premières suffisent pour les lots 1 à 4. Elles sont dans le dossier `images` du dépôt : `boss-attente.jpg`, `boss-vive-elan.jpg` et `boss-vive-coup.jpg`.

| Groupe | Images | Nombre |
| --- | --- | --- |
| Boss, épées | Attente. Élan et coup de la Taille vive. Élan et coup de la Taille lente. | 5 |
| Boss, corps | Ruée : ramassé, puis lancé. Une pose penchée, bras écartés, pour les quatre attaques de queue. | 3 |
| Boss, moments | Entrée, vacillement, mort. | 3 |
| Décor | La même scène, sans la créature. | 1 |
| Arme | La Dernière Veilleuse, seule, sur fond neutre. | 1 |
| Perso | Pièces en silhouette noire : 3 corps, 4 têtes, 3 cornes, 3 capes, 4 armes. | 17 |

Les attaques de queue n'ont pas d'image de coup : le code anime lui-même les queues et leurs flammes. S'y ajoute une image de queue peinte seule, sur fond neutre, que le code réutilise cinq fois. La Feinte réutilise les images des épées.

- **Toujours repartir de l'image de base.** Une pose tirée d'une autre pose accumule les écarts.
- **Même cadre, même décor.** Seule la pose change.
- **Aucune queue sur les images.**
- **Un élan se reconnaît au premier coup d'œil.** La pose est exagérée, quitte à paraître théâtrale.
- **Chaque image est comparée à la base** avant d'entrer dans le jeu : même tête, même pelage, mêmes épées.

Consigne pour une pose, avec l'image de base jointe :

```
Same creature, same style, same framing and background. Change only the pose: [the pose]. Exaggerated, clearly readable. No tail.
```

Consigne pour le décor seul :

```
Same image, same style and framing. Remove the creature entirely and fill in the ruins and fog behind it.
```

## Textes

Tous les textes du jeu tiennent ici. Ils sont courts : un boss se raconte par ce qu'il fait.

**Le boss.** Grimalkin, le Veilleur. Un chat de temple resté au chevet de son maître mort. Il a veillé si longtemps qu'il porte aujourd'hui son crâne et ses épées. Ses cinq queues sont les veilleuses du mort : tant qu'une brûle, la veille continue.

| Origine | Texte du créateur | Réplique de Grimalkin à l'entrée |
| --- | --- | --- |
| Déserteur | Tu as quitté le rang la nuit où la ville a brûlé. Depuis, tu marches vers tout ce qui brûle encore. | « Tu as fui un feu. Celui-ci ne te laissera pas partir. » |
| Fossoyeur | Tu as mis une ville entière en terre, un corps après l'autre. Il en reste un que personne n'a pu enterrer. | « Tu viens pour lui. Il n'est pas à enterrer. » |
| Pèlerin | On t'a promis qu'au bout de la route, quelqu'un répondrait. Tu marches depuis onze ans. | « Onze ans de route pour une réponse. La voici : non. » |
| Bourreau | Tu as tranché sur ordre, sans jamais demander pourquoi. Le dernier ordre portait ton nom, et tu es parti avant l'aube. | « Tu connais le poids d'une lame. J'en ai deux. » |

| Choix | Texte |
| --- | --- |
| Humain | Ni béni ni maudit. Il tient debout par habitude. |
| Cendreux | Né d'un bûcher qui n'a pas fini son travail. Le feu le reconnaît. |
| Décharné | Il ne reste de lui que l'essentiel. Ce qui ne plie plus casse. |
| Garde | Il attend le coup et le renvoie. |
| Ombre | Il n'est jamais là où tombe la lame. |

| Écran | Texte |
| --- | --- |
| Mort | La veille continue. |
| Victoire | La veille est finie. |
| Arme | La Dernière Veilleuse. Épée d'un maître mort, que son chat a portée à sa place. Cinq flammes courent le long de la lame. Elles ne s'éteindront plus. |

## Sons et musique

Tout le son est produit par le code, avec l'audio du navigateur et sans aucun fichier. Le rendu sera sec et sombre, pas orchestral. Chaque son reste remplaçable plus tard par un vrai fichier.

| Son | Description pour le code |
| --- | --- |
| Parade parfaite | Tintement métallique aigu et bref, avec une résonance d'une demi-seconde. |
| Parade simple | Choc métallique mat, plus grave, sans résonance. |
| Coup encaissé | Impact sourd et grave, suivi d'un souffle de bruit. |
| Frappe rapide | Sifflement bref qui monte. |
| Frappe chargée | Grondement qui monte pendant l'appui, impact lourd au relâchement. |
| Garde brisée | Craquement sec, puis une note très grave qui s'éteint en 2 secondes. |
| Queue qui s'embrase, orange | Souffle de flamme clair qui monte. |
| Queue qui s'embrase, rouge | Souffle de flamme rauque et grave, nettement différent du premier. |
| Queue éteinte | Souffle coupé net, puis une demi-seconde de silence. |
| Vent | Bruit continu et filtré, qui forcit en phase 2. |
| Musique, phase 1 | Bourdon grave tenu et tambour lent, un coup toutes les 2 secondes. |
| Musique, phase 2 | Le même bourdon, une seconde note dissonante au-dessus, tambour deux fois plus rapide. |
| Écran de l'arme | Une seule note claire et longue, la première du jeu. |

Le son démarre au premier toucher de l'écran : les navigateurs l'imposent sur téléphone.

## Ton travail et celui de François

Les textes et les sons sont écrits plus haut. Il te reste les images à produire et le réglage, qui ne se trouve qu'en jouant.

- [ ] Créer le dépôt GitHub et y déposer ce brief sous le nom `BRIEF.md`.
- [ ] Jouer chaque lot sur ton téléphone avant d'envoyer le suivant.
- [ ] Ajuster les valeurs du fichier de réglages, surtout aux lots 1, 5 et 9.
- [ ] Relire les textes et changer ce qui ne sonne pas comme toi. Produire les images de la section « Images à produire », en vérifiant chaque pose.

Deux points fragiles :

- **La parade au tactile.** Si le lot 1 n'est pas bon, rien de ce qui suit ne le rattrapera.
- **La cohérence des images.** Chaque pose doit montrer la même créature dans le même cadre. Une image qui dérive est refaite avant d'entrer dans le jeu.

Ce qui est laissé volontairement à François, pour qu'il reprenne le projet :

- un deuxième boss, écrit en données sur le même moteur ;
- les sous-classes ;
- d'autres lignées et origines ;
- une arme à prendre sur chaque nouveau boss ;
- de nouvelles arènes et météos.
