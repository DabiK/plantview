# PRD — DabiK/plantview

Backlog généré depuis les issues GitHub ouvertes. Chaque item est une tâche.
Coche la case quand la tâche est terminée. Une seule tâche par itération Ralph.

- [x] #4 — M4 — Viewer /view/:code (zoom/pan, dark, export SVG/PNG) (labels: —)

  **Issue #4 — détail complet**
  >
  > ## Contexte
  >
  > Le produit principal : un lien `/view/<code>` ouvre une page plein écran qui affiche le diagramme, sans édition. S'appuie sur M2 (`decodeDiagram`) et M3 (`renderPlantUml`). Style : sobre, élégant, sombre par défaut — c'est la page la plus vue de l'app.
  >
  > ## Changements
  >
  > - `src/routes/View.tsx` + `src/components/DiagramCanvas.tsx`, `src/components/Toolbar.tsx`, `src/components/ErrorPanel.tsx`.
  > - Décodage de `:code` → rendu. États : loading (skeleton animé discret), erreur (carte stylée : message + « Open in editor » vers `/edit/<code>`), succès.
  > - Affichage : SVG sanitizé injecté dans un conteneur `react-zoom-pan-pinch` (zoom molette + boutons, pan au drag, fit-to-view au premier rendu, boutons + / − / fit / reset). Whiteboard discret, hauteur plein écran, chromeless.
  > - Thème : `?dark=0|1` force l'état initial ; sinon localStorage (`plantview:theme`) puis `prefers-color-scheme`. Toggle dans la toolbar. Le rendu moteur utilise `{ dark }`.
  > - `src/lib/export.ts` :
  >   - `downloadSvg(svg, filename)` ;
  >   - `downloadPng(svg, filename, { dark })` — SVG → `Image` (blob URL) → canvas ×2 → `toBlob('image/png')`, fond adapté au thème ; révoquer les object URLs.
  > - `src/lib/examples.ts` : 4 exemples (sequence, class, activity, usecase) `{ id, title, description, source }` — réutilisés par M5/M6.
  > - Toolbar flottante : zoom +/−/fit, dark toggle, Download SVG, Download PNG, Copy link, Edit (→ `/edit/<code>`). Icônes lucide-react, `aria-label` sur chaque bouton, focus visible.
  > - Responsive : toolbar compacte/scrollable sur mobile.
  >
  > ## Acceptance
  >
  > - `pnpm lint && pnpm typecheck && pnpm test && pnpm build` verts.
  > - QA navigateur (MCP chrome-devtools si dispo) : `/view/SoWkIImgAStDuULroazIqBLJSCp9J4wrKl18pSd9L-JbTKZDIm5A0m00` affiche Bob/Alice ; zoom/pan OK ; `?dark=1` change le rendu ; Download PNG produit un fichier non vide ; un code invalide montre l'état d'erreur stylé (pas de crash) ; zéro erreur console.

- [x] #5 — M5 — Éditeur minimal /edit (CodeMirror, preview live, autosave, erreurs stylées, partage) (labels: —)

  **Issue #5 — détail complet**
  >
  > ## Contexte
  >
  > L'éditeur est secondaire mais indispensable pour corriger un diagramme reçu ou en créer un. S'appuie sur M2/M3/M4 (composants, examples.ts, export.ts). Route `/edit/:code?` : le code est optionnel.
  >
  > ## Changements
  >
  > - `src/lib/plantuml-language.ts` : coloration syntaxique PlantUML minimale pour CodeMirror 6 (StreamLanguage maison, ~80 lignes) — directives (`@startuml`, `@enduml`, `!…`), mots-clés (participant, actor, class, interface, note, skinparam, title, alt, loop, activate…), flèches (`->`, `-->`, `..>`, `--`), commentaires (`'` en début de ligne, `/' … '/`), chaînes. Ne pas viser l'exhaustivité.
  > - `src/routes/Edit.tsx` : split view responsive (éditeur + preview ; empilé sur mobile), CodeMirror via `@uiw/react-codemirror` + thème cohérent (dark/light).
  > - Preview live : rendu debouncé 400 ms via `renderPlantUml`, garde « latest request » déjà gérée par M3. Réutiliser `DiagramCanvas` si possible (zoom/pan/export).
  > - Autosave localStorage clé `plantview:draft` = `{ source, updatedAt }`. Au chargement : priorité au `:code` d'URL, sinon brouillon, sinon exemple par défaut.
  > - Synchronisation URL discrète : après édition, `history.replaceState` debouncé vers `/edit/<code>` (pas d'entrées d'historique). Pas de mise à jour live de l'URL en continu.
  > - Bouton « Share / Copy link » : encode la source, copie l'URL absolue `/view/<code>` dans le presse-papiers, feedback visuel (toast/état du bouton). Bouton « View » également.
  > - Erreurs : panneau stylé (pas de crash) avec numéro de ligne issu de `parsePlantUmlError` + lien vers la position si possible ; la preview affiche le dernier rendu valide estompé ou l'état d'erreur — au choix, mais toujours lisible.
  > - Dropdown d'exemples (depuis `src/lib/examples.ts`) pour charger une source.
  > - Indicateur « Saved » discret après autosave.
  >
  > ## Acceptance
  >
  > - `pnpm lint && pnpm typecheck && pnpm test && pnpm build` verts.
  > - QA navigateur : taper du PlantUML met à jour la preview ; recharger la page conserve le brouillon ; « Copy link » produit une URL `/view/<code>` qui affiche le même diagramme ; une syntaxe invalide affiche le panneau d'erreur stylé avec la ligne ; zéro erreur console.
  > - Tests unitaires pour toute logique pure ajoutée (ex. précédence de chargement URL > draft > défaut).

- [ ] #6 — M6 — Page d'accueil / (coller un input, galerie d'exemples, section agents) (labels: —)

  **Issue #6 — détail complet**
  >
  > ## Contexte
  >
  > Point d'entrée humain : coller quelque chose et voir le diagramme. S'appuie sur M2 (codec) et `src/lib/examples.ts` (M4).
  >
  > ## Changements
  >
  > - `src/lib/parse-diagram-input.ts` : `parseDiagramInput(input: string): { kind: 'source', source: string } | { kind: 'code', code: string } | { kind: 'empty' }` :
  >   - source PlantUML brut (contient `@startuml`/`@startmindmap`/etc.) → `source` ;
  >   - URL complète PlantText/PlantUML (`…/png/<code>`, `/svg/`, `/txt/`, avec ou sans query) → `code` extrait ;
  >   - code encodé seul (alphabet du codec, longueur plausible) → `code` ;
  >   - sinon → traiter comme source (l'utilisateur colle souvent un fragment sans `@startuml`).
  >   - Tests unitaires Vitest pour les 4 cas.
  > - `src/routes/Home.tsx` : hero + zone de collage (textarea/input) + bouton « View » → si `source`, encoder puis naviguer vers `/view/<code>` ; si `code`, naviguer directement. Message d'erreur inline si vide. Support Entrée (⌘/Ctrl+Entrée pour textarea).
  > - Galerie : grille de cartes d'exemples (titre + description + mini-aperçu si simple) depuis `examples.ts`, chaque carte → `/view/<code>` du source de l'exemple.
  > - Section « For agents » courte : format d'URL (codec PlantUML standard), exemple de lien, et mention du script `pnpm encode` (livré en M8) — texte simple, pas de dépendance à M8.
  > - Layout clair, responsive, cohérent avec le viewer (dark/light).
  >
  > ## Acceptance
  >
  > - `pnpm lint && pnpm typecheck && pnpm test && pnpm build` verts (tests de `parseDiagramInput` inclus).
  > - QA navigateur : coller un PlantUML brut → viewer affiche le diagramme ; coller l'URL PlantText de référence → viewer affiche Bob/Alice ; cliquer une carte d'exemple → viewer OK ; zéro erreur console.

- [ ] #7 — M7 — E2E Playwright + configs de déploiement SPA + doc finale (labels: —)

  **Issue #7 — détail complet**
  >
  > ## Contexte
  >
  > Dernière étape fonctionnelle : verrouiller le parcours principal par des tests navigateur et rendre le repo déployable en statique.
  >
  > ## Changements
  >
  > 1. Playwright :
  >    - `pnpm add -D @playwright/test` ; `pnpm exec playwright install chromium` (si le téléchargement échoue, documenter dans progress.txt et adapter).
  >    - `playwright.config.ts` : `webServer` = `pnpm dev` sur le port 5173, `baseURL http://localhost:5173`, reporter list, headless.
  >    - Script package.json : `"test:e2e": "playwright test"`.
  >    - Tests `e2e/` :
  >      a. `/` rend la home et les cartes d'exemples pointent vers `/view/…` ;
  >      b. `/view/SoWkIImgAStDuULroazIqBLJSCp9J4wrKl18pSd9L-JbTKZDIm5A0m00` → le SVG contient « Bob » et « Alice » ;
  >      c. `?dark=1` applique le thème sombre (classe/attribut observable) ;
  >      d. `/edit` : saisir un petit diagramme → la preview se met à jour ;
  >      e. code invalide → état d'erreur stylé visible.
  > 2. Déploiement statique SPA (deep links) :
  >    - `vercel.json` : rewrite `/(.*)` → `/index.html` ;
  >    - `netlify.toml` : redirect `/*` → `/index.html` 200 ;
  >    - `public/_redirects` : `/* /index.html 200`.
  > 3. README final : routes, dev, build, déploiement, et la limitation assumée (v1 client-only : pas d'image embarquable dans un README/Slack).
  >
  > ## Acceptance
  >
  > - `pnpm test:e2e` vert headless + `pnpm lint && pnpm typecheck && pnpm test && pnpm build` verts.
  > - Les 3 configs de déploiement existent. README à jour.

- [ ] #8 — M8 — Script d'encodage + skill agent pour générer les liens (labels: —)

  **Issue #8 — détail complet**
  >
  > ## Contexte
  >
  > Use case principal : un agent (LLM) doit générer un lien `/view/<code>` affichable, sans jamais fabriquer l'encodage à la main (deflate + alphabet custom : impossible à produire de tête, source d'erreurs). On fournit un script fiable + une skill pour les agents.
  >
  > ## Changements
  >
  > 1. `scripts/encode.mjs` (ESM, importe `plantuml-encoder`) :
  >    - Entrée : stdin, `--file <path>`, ou `--text "…"` ;
  >    - `--base <url>` ou env `PLANTVIEW_BASE_URL` (défaut `http://localhost:5173`) ;
  >    - Sortie par défaut : URL complète `<base>/view/<code>` ; flag `--code-only` pour n'afficher que le code ;
  >    - Gérer les erreurs proprement (exit 1, message clair) ; support de `--help`.
  >    - Script npm : `"encode": "node scripts/encode.mjs"`.
  > 2. Test unitaire Vitest qui exécute le script (spawn `node scripts/encode.mjs --text …` ou via stdin) et vérifie : la sortie contient `/view/`, et `decodeDiagram(<code extrait>)` redonne la source normalisée (pas d'égalité avec un code PlantText tiers).
  > 3. `skill/SKILL.md` : skill agent autonome — quand l'utilisateur veut montrer un diagramme PlantUML, générer la source, l'encoder **avec le script** (`pnpm encode` ou `node scripts/encode.mjs`), puis fournir l'URL `/view/…`. Interdiction explicite de fabriquer l'encodage à la main ; exemples d'usage `echo … | pnpm encode`.
  > 4. README : section « For agents » complétée avec l'usage exact du script.
  >
  > ## Acceptance
  >
  > - `printf '@startuml\nBob -> Alice: Hello!\n@enduml\n' | pnpm encode` produit une URL `/view/<code>` dont le décodage redonne la source.
  > - `pnpm lint && pnpm typecheck && pnpm test && pnpm build` verts ; `skill/SKILL.md` présent et cohérent avec la commande réelle.

- [ ] #9 — M9 — Style par défaut soigné du rendu (design injecté, pas de thèmes) (labels: —)

  **Issue #9 — détail complet**
  >
  > ## Contexte
  >
  > Décision produit : pas de système de thèmes multiples. Un **seul style par défaut** doit donner un rendu soigné et cohérent (nodes, edges, textes) sans jamais toucher à la source de l'utilisateur. Le style doit se retrouver dans les exports SVG/PNG.
  >
  > ## Changements
  >
  > - `src/lib/default-style.ts` : bloc PlantUML `<style>` (moteur de style intégré) couvrant les sélecteurs principaux : `root`, `node`, `edge`, `participant`, `actor`, `boundary`, `control`, `entity`, `component`, `usecase`, `class`, `interface`… + `skinparam` de secours pour les types non couverts par le moteur de style (ex. activity, state). Deux variantes : dark et light.
  > - Injection dans `renderPlantUml` : insérer le bloc juste après la première directive `@start…`. Règle de précédence : notre bloc est inséré AVANT le contenu utilisateur → un `skinparam`/style explicite de l'utilisateur gagne toujours.
  > - Police : utiliser une pile de polices système propre cohérente avec l'UI.
  > - Vérifier sur les 4 types d'exemples (sequence, class, activity, usecase) en dark et light : lisibilité, flèches, labels, clusters. Si un type rend mal avec `<style>`, compléter avec des `skinparam`.
  > - Tests unitaires : fonction d'injection (`injectDefaultStyle(source, { dark })`) — source avec/sans `@startuml`, source avec style utilisateur existant (ne pas casser).
  >
  > ## Acceptance
  >
  > - Rendu visuellement cohérent sur les 4 exemples (captures chrome-devtools dark + light).
  > - Export SVG/PNG contient le style (le SVG affiché et le SVG exporté sont identiques).
  > - `pnpm lint && pnpm typecheck && pnpm test && pnpm build` verts.

- [ ] #10 — M10 — Historique local des diagrammes ouverts (localStorage) (labels: —)

  **Issue #10 — détail complet**
  >
  > ## Contexte
  >
  > Quand on ouvre `/view/<code>` (venir d'un lien est le flux principal), le diagramme doit être retrouvable facilement sans recopier d'URL. Tout est local (localStorage), aucun backend.
  >
  > ## Changements
  >
  > - `src/lib/history.ts` :
  >   - clé `plantview:history` : tableau `{ code, title, viewedAt }`, **dédupliqué par `code`** (un re-open remonte l'entrée), max **50** (les plus anciens sortent), plus récent en premier.
  >   - `addToHistory(code, title)`, `listHistory()`, `removeFromHistory(code)`, `clearHistory()`.
  >   - Parsing défensif + try/catch (JSON corrompu → reset ; quota/mode privé → no-op silencieux, jamais d'erreur bloquante).
  >   - `extractTitle(source)` : directive `title …`, sinon première ligne utile, sinon `code.slice(0, 12) + '…'`.
  > - Enregistrement : dans `View` après décodage réussi (titre dérivé de la source décodée) ; aussi lors de l'action « View » depuis l'éditeur.
  > - UI : route `/history` — liste des entrées (titre, date relative, code tronqué) avec actions : ouvrir, copier le lien, supprimer, tout effacer ; état vide soigné ; responsive. Liens d'accès depuis la home et la toolbar du viewer.
  > - Le rendu ne doit JAMAIS échouer si localStorage est indisponible.
  >
  > ## Acceptance
  >
  > - Ouvrir deux fois la même URL ne crée pas de doublon (une seule entrée, remontée en tête).
  > - Recharger le navigateur conserve l'historique ; « Clear all » vide tout ; suppression unitaire OK.
  > - Tests unitaires : dédup, cap 50, JSON corrompu → reset sûr, extraction de titre.
  > - QA navigateur : ouvrir un lien → home → History → réouverture du même diagramme ; zéro erreur console.

- [ ] #11 — M11 — Déplacer les nœuds (drag) dans le viewer (labels: —)

  **Issue #11 — détail complet**
  >
  > ## Contexte
  >
  > Pouvoir ajuster manuellement la position des nœuds après le layout PlantUML/Graphviz, pour peaufiner un diagramme avant export. Le rendu reste le SVG PlantUML : **pas de re-layout**, on manipule le SVG rendu (translation des nœuds + ré-ancrage des edges connectés).
  >
  > ## Périmètre / limites (à documenter dans le README)
  >
  > - Supporté : diagrammes « graphe » (class, component, deployment, usecase, object) où les éléments sont des nœuds reliés par des edges.
  > - Exclu : sequence, timing (déplacer des lignes de vie/colonnes n'a pas de sens) → drag désactivé.
  > - Les exports SVG/PNG reflètent les positions courantes.
  >
  > ## Changements
  >
  > - **Spike obligatoire d'abord** (résultat documenté dans progress.txt) : rendre un exemple class et un exemple component avec le moteur local, inspecter la structure SVG réelle (groupes `<g>` des entités, ids/classes, paths des edges, labels, clusters) et confirmer une stratégie d'identification nœud/edge robuste. **Si la structure ne permet pas un ré-ancrage propre, le documenter et s'arrêter là** (pas de bricolage) — proposer alors l'alternative la plus proche (ex. bouton qui re-render avec d'autres options de layout) et terminer l'issue.
  > - `src/lib/svg-drag.ts` :
  >   - identification des groupes « nœud » (heuristique testée sur les exemples) et des edges connectés ;
  >   - au drag : translation du groupe nœud + ré-ancrage des extrémités des paths d'edges (premier/dernier point) en conservant les waypoints intermédiaires ;
  >   - pointer events, curseur grab/grabbing, pas de sélection de texte pendant le drag.
  > - `src/components/DiagramCanvas.tsx` : mode « Adjust » activable via la toolbar (icône move), désactivé par défaut ; pendant le drag, court-circuiter le pan de react-zoom-pan-pinch ; bouton « Reset layout » qui restaure le SVG d'origine.
  > - Tests unitaires : maths d'extraction/reconstruction de path pour le ré-ancrage.
  >
  > ## Acceptance
  >
  > - Class diagram : déplacer un nœud déplace proprement ses edges (pointes attachées), zéro erreur console ; « Reset layout » restaure le rendu initial.
  > - Sequence diagram : drag inactif, rien ne casse.
  > - Export SVG/PNG contient les positions déplacées.
  > - `pnpm lint && pnpm typecheck && pnpm test && pnpm build` verts + QA navigateur.
