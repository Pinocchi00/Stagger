# Jeu de boss dark fantasy

Un combat de boss en 2D vu de profil, sur téléphone. Un héros qui court, roule et frappe, contre un seul boss qui tue vite.

Le détail complet du jeu est dans [BRIEF.md](BRIEF.md). C'est la référence du projet.

## Jouer

Lien : https://pinocchi00.github.io/Stagger/

Le jeu se joue dans le navigateur, téléphone tenu à l'horizontale.

| Geste | Zone de l'écran | Action |
| --- | --- | --- |
| Glisser et maintenir | Moitié gauche | Marcher |
| Toucher | Moitié droite | Attaquer, et parer si le coup d'épée tombe au moment de celui du boss |
| Glisser | Moitié droite | Esquiver : un déplacement rapide sur le côté |

**Les deux phases.** Grimalkin porte cinq queues enflammées. Tant qu'une flamme brûle, ses coups ne l'atteignent pas : chaque parade en éteint une, et il faut les cinq pour pouvoir le blesser. Les cinq éteintes, la moitié de sa vie peut tomber. À la moitié, il se métamorphose : ses flammes se rallument, une seconde lame apparaît, il frappe deux fois plus vite, et il faut de nouveau parer cinq fois avant de finir le combat.

Au clavier, pour tester sur PC : flèches pour marcher, espace pour attaquer (et parer), Maj pour esquiver.

## Tester sur téléphone

1. Ouvrir le lien dans le navigateur du téléphone.
2. Tourner le téléphone à l'horizontale.
3. Toucher l'écran une fois : le jeu passe en plein écran et reste à l'horizontale (Android). Sur iPhone, le navigateur ne le permet pas : ouvrir le menu Partager, puis « Sur l'écran d'accueil », et lancer le jeu depuis l'icône.
4. Après une mise à jour du dépôt, attendre une à deux minutes puis recharger la page. Si rien ne change, ouvrir le lien en navigation privée.

## État des lots

- [x] 0. Mise en place
- [x] 1. Le héros
- [x] 2. Le boss
- [x] 3. Phase 2 et réglage
- [x] 4. Les sprites
- [x] 5. Décor, effets et son
- [x] 6. Caméra et lisibilité
- [x] 7. Boss varié et vacillement
- [ ] 8. Réglage du combat
- [ ] 9. Monstres personnalisés
- [ ] 10. Environnement
- [ ] 11. Ambiance sonore
- [ ] 12. Mise en scène
- [ ] 13. Réglage final

## Règles du projet

- **Rien hors du brief.** Ce qui ne figure pas dans `BRIEF.md` n'est pas ajouté.
- **Un lot à la fois.** Un lot n'est commencé que quand le précédent est validé en jouant sur téléphone.
- **Un seul fichier de réglages.** Toutes les valeurs chiffrées y vivent : vie, endurance, dégâts, durées, vitesses.
- **Ce README est tenu à jour.** À la fin de chaque lot, la case du lot est cochée et le lien est vérifié.

## Technique

HTML, JavaScript et Canvas 2D, sans moteur ni framework. Rien à installer. Mise en ligne sur GitHub Pages.

## Crédits

- Héros : [Fantasy Knight](https://aamatniekss.itch.io/fantasy-knight-free-pixelart-animated-character), d'aamatniekss.
- Boss : [Bringer of Death](https://clembod.itch.io/bringer-of-death-free), de Clembod.
