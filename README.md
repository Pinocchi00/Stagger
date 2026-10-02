# Jeu de boss dark fantasy

Un duel contre un seul boss, pensé pour le téléphone. On pare, on esquive, on brise sa garde et on éteint ses cinq queues une à une. À la fin, on lui prend son arme.

Le détail complet du jeu est dans [BRIEF.md](BRIEF.md). C'est la référence du projet.

## Jouer

Lien : https://pinocchi00.github.io/Stagger/

Le jeu se joue dans le navigateur, téléphone tenu à l'horizontale. Il fonctionne aussi sur PC, à la souris et au clavier.

| Geste | Pendant une attaque du boss | Pendant une ouverture |
| --- | --- | --- |
| Toucher | Parade | Frappe rapide |
| Glisser | Esquive dans la direction du geste | Aucun effet |
| Appui long | Aucun effet | Frappe chargée |

## Tester sur téléphone

1. Ouvrir le lien dans le navigateur du téléphone.
2. Tourner le téléphone à l'horizontale.
3. Toucher l'écran une fois : le son ne démarre qu'après ce premier toucher.
4. Après une mise à jour du dépôt, attendre une à deux minutes puis recharger la page. Si rien ne change, ouvrir le lien en navigation privée.

## État des lots

- [x] 0. Mise en place
- [ ] 1. La parade seule
- [ ] 2. Les trois gestes
- [ ] 3. La garde et les queues
- [ ] 4. Phase 2, victoire et arme
- [ ] 5. Les poses du boss
- [ ] 6. Mise en scène
- [ ] 7. Son
- [ ] 8. Créateur
- [ ] 9. Réglage final

## Règles du projet

- **Rien hors du brief.** Ce qui ne figure pas dans `BRIEF.md` n'est pas ajouté.
- **Un lot à la fois.** Un lot n'est commencé que quand le précédent est validé en jouant sur téléphone.
- **Un seul fichier de réglages.** Toutes les valeurs chiffrées y vivent : fenêtres de parade, dégâts, durées, vitesses.
- **Ce README est tenu à jour.** À la fin de chaque lot, la case du lot est cochée et le lien est vérifié.

## Contenu du dépôt

- `BRIEF.md` : le brief complet du jeu.
- `README.md` : cette page.
- `index.html` : la page du jeu, créée au lot 0.
- `images/` : les images du boss et du décor. Pour les lots 1 à 4 : `boss-attente.jpg`, `boss-vive-elan.jpg`, `boss-vive-coup.jpg`.
- `settings.js` : le fichier de réglages, créé au lot 0.

## Technique

HTML, JavaScript et Canvas 2D, sans moteur ni framework. Rien à installer. Mise en ligne sur GitHub Pages.
