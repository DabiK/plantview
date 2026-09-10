# PlantView — décisions produit (verrouillées)

Issues du grilling initial. **Ne pas re-décider ces points pendant l'implémentation.**

## Encodage / URL

- Format : codec PlantUML standard (deflate + alphabet base64 custom) via `plantuml-encoder`. Compatible PlantText/plantuml.com dans les deux sens. **Pas de base64 brut.**
- Exemple de référence : `SoWkIImgAStDuULroazIqBLJSCp9J4wrKl18pSd9L-JbTKZDIm5A0m00` → diagramme « Bob -> Alice: Hello! ».
- `decodeDiagram` accepte un code brut ou une URL complète (extrait le dernier segment) et normalise les fins de ligne en `\n`. Un code invalide lève une erreur propre.
- Les agents génèrent les liens via `scripts/encode.mjs` (M8) — jamais à la main.

## Rendu

- 100 % navigateur avec `@plantuml/core`, lazy-loadé. Aucun backend, aucun serveur distant.
- Le SVG moteur est sanitizé (DOMPurify) avant injection DOM.
- Dark mode : `{ dark: true }` au rendu ; `?dark=1|0` force l'état initial, sinon préférence système/localStorage. Toggle en UI.

## Routes

- `/view/:code` : viewer plein écran chromeless = **produit principal** (zoom/pan, exports, toggle dark, copier le lien, bouton « Edit »).
- `/edit/:code?` : éditeur minimal (preview live debouncée, autosave localStorage, exemples, erreurs de syntaxe stylées avec ligne, bouton partage).
- `/` : accueil (coller texte brut / URL / code encodé, galerie d'exemples, section agents).
- Param : `?dark=0|1` uniquement.

## Non-goals v1

- Pas de backend ni de vraie URL image embarquable (`<img src="…">` depuis un README/Slack) — v2 éventuelle.
- Pas de comptes, pas de collaboration, pas de multi-diagrammes par URL.
- Pas de drag-resize des panneaux ni de synchronisation live de l'URL pendant l'édition (bouton « Share » + `replaceState` discret uniquement).

## Export

- SVG : téléchargement du SVG sanitizé.
- PNG : SVG → `Image` → canvas (×2) → `toBlob`, fond adapté au thème.
