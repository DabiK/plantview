# PRD — DabiK/plantview

Backlog généré depuis les issues GitHub ouvertes. Chaque item est une tâche.
Coche la case quand la tâche est terminée. Une seule tâche par itération Ralph.

- [x] #1 — M1 — Scaffold Vite + React + TS + Tailwind 4 + structure de base (labels: —)

  **Issue #1 — détail complet**
  > ## Contexte
  >
  > Repo vide : seuls README.md, AGENTS.md, docs/DESIGN.md et .gitignore existent. Aucun package.json. Cette issue crée le squelette de l'app. **Lire AGENTS.md et docs/DESIGN.md avant de commencer** : les décisions techniques sont verrouillées. Le dossier de travail est le repo ; tout chemin hors repo doit passer par `mktemp -d`.
  >
  > ## Changements
  >
  > 1. Scaffolder le template Vite React-TS dans un dossier temporaire **vide**, sans interaction :
  >
  >    ```bash
  >    TMP=$(mktemp -d)
  >    (cd "$TMP" && pnpm dlx create-vite@latest . --template react-ts)
  >    ```
  >
  >    Copier ensuite les fichiers du template dans le repo (package.json, tsconfig*.json, vite.config.ts, index.html, src/, eslint.config.js) **sans écraser** README.md, AGENTS.md, docs/ ni .gitignore (fusionner .gitignore si le template en a un). Supprimer le dossier temporaire.
  >
  > 2. Dépendances :
  >    - `pnpm add react-router-dom @plantuml/core plantuml-encoder dompurify react-zoom-pan-pinch @uiw/react-codemirror lucide-react`
  >    - `pnpm add -D tailwindcss @tailwindcss/vite @types/plantuml-encoder vitest`
  > 3. Tailwind 4 : plugin `@tailwindcss/vite` dans `vite.config.ts` ; `src/index.css` = `@import "tailwindcss";` + reset de base.
  > 4. Scripts package.json : `dev`, `build` (`tsc -b && vite build`), `preview`, `lint` (eslint), `typecheck` (`tsc -b`), `test` (`vitest run --passWithNoTests`).
  > 5. Structure : `src/routes/`, `src/components/`, `src/lib/` ; router react-router dans `src/main.tsx` + `src/App.tsx` avec 3 routes placeholder : `/` (Home), `/view/:code` (View), `/edit/:code?` (Edit). Pas de logique métier.
  > 6. Vérifier que `node_modules/`, `dist/`, `public/plantuml/`, `.ralph/` restent ignorés (`git status --short` propre hors fichiers voulus).
  >
  > ## Acceptance
  >
  > - `pnpm install && pnpm lint && pnpm typecheck && pnpm test && pnpm build` passent.
  > - `pnpm dev` sert l'app ; `/`, `/view/abc`, `/edit/abc` répondent sans erreur console.
  > - Un seul commit atomique.

- [x] #2 — M2 — Codec d'URL PlantUML (décoder/encoder) + tests (labels: —)

  **Issue #2 — détail complet**
  >
  > ## Contexte
  >
  > L'app lit un diagramme depuis l'URL au format PlantUML standard (deflate + alphabet base64 custom), compatible PlantText/plantuml.com. Code de référence (doit donner le diagramme « Bob -> Alice: Hello! ») :
  >
  > `SoWkIImgAStDuULroazIqBLJSCp9J4wrKl18pSd9L-JbTKZDIm5A0m00`
  >
  > Piège connu : `plantuml-encoder` décode ce code avec des `\r` (parfois doublés) — la sortie doit être normalisée en `\n`. Re-encoder le texte normalisé donne un code différent mais équivalent (le rendu est identique) : ne pas tester l'égalité octet-à-octet avec le code d'origine.
  >
  > ## Changements
  >
  > - `src/lib/plantuml-encoding.ts` :
  >   - `decodeDiagram(input: string): string` — accepte un code brut ou une URL complète (`https://…/png/<code>`, `/svg/`, `/txt/`, query string) et extrait le code ; décode via `plantuml-encoder` ; normalise `\r\n`/`\r` → `\n` ; lève `DiagramDecodeError` si le code est invalide/vide.
  >   - `encodeDiagram(source: string): string` — via `plantuml-encoder`.
  >   - `extractDiagramCode(input: string): string` — helper d'extraction (utile à M6).
  > - Tests `src/lib/plantuml-encoding.test.ts` (Vitest, env node) :
  >   1. décode le code de référence → les lignes non vides (trim) après normalisation sont exactement `['@startuml', 'Bob -> Alice: Hello!', '@enduml']` ;
  >   2. décode une URL complète PlantText → même résultat ;
  >   3. round-trip texte : `decodeDiagram(encodeDiagram(src)) === src` pour une source ASCII **et** une source avec accents (`é`, `à`) ;
  >   4. code invalide → `DiagramDecodeError` (pas de crash).
  >
  > ## Acceptance
  >
  > - `pnpm lint && pnpm typecheck && pnpm test && pnpm build` verts.
  > - Les 4 cas de test ci-dessus passent. Un seul commit atomique.

- [ ] #3 — M3 — Rendu PlantUML 100 % local (@plantuml/core) lazy-loadé + sanitize (labels: —)

  **Issue #3 — détail complet**
  >
  > ## Contexte
  >
  > Décision verrouillée (docs/DESIGN.md) : rendu 100 % navigateur, aucun serveur distant. Moteur officiel `@plantuml/core` (TeaVM + Viz.js, MIT). Le package contient : `plantuml.js` (module ES autonome, 3,8 Mo), `viz-global.js` (script classique global `Viz`, 1,4 Mo), et des ressources optionnelles `emoji.js`, `openiconic.js`, `themes.js` référencées par URL relative. `plantuml.js` ne doit jamais être bundlé par Vite : il est servi en statique et chargé à la demande.
  >
  > ## Changements
  >
  > 1. `scripts/sync-plantuml-assets.mjs` : copie `plantuml.js`, `viz-global.js`, `emoji.js`, `openiconic.js`, `themes.js` depuis `node_modules/@plantuml/core/` vers `public/plantuml/` (créer le dossier). Ajouter `"postinstall": "node scripts/sync-plantuml-assets.mjs"` dans package.json (`public/plantuml/` est gitignoré).
  > 2. `src/lib/render-plantuml.ts` :
  >    - `renderPlantUml(source: string, opts?: { dark?: boolean }): Promise<string>` → SVG sanitizé.
  >    - Charge `/plantuml/viz-global.js` **une seule fois** via une balise `<script>` classique (promesse singleton, rejeter proprement en cas d'échec de chargement), puis `await import(/* @vite-ignore */ '/plantuml/plantuml.js')`.
  >    - Appelle `renderToString(lines, onSuccess, onError, { dark })` avec `lines = source.split(/\r\n|\n|\r/)`.
  >    - Garde « latest request » : si un nouveau rendu arrive avant que l'ancien ne réponde, ignorer la réponse périmée (pas de flash de vieux SVG).
  >    - Sanitize avec DOMPurify (`USE_PROFILES: { svg: true, svgFilters: true }`), conserver `xmlns`/`viewBox`.
  >    - `PlantUmlRenderError` avec le message moteur ; `parsePlantUmlError(message)` exporté, qui extrait le numéro de ligne (`/Error line (\d+)/i`) et un message court.
  >    - Aucun import statique de `@plantuml/core` ailleurs dans le code.
  > 3. Tests unitaires `src/lib/render-plantuml.test.ts` : `parsePlantUmlError` (avec/sans ligne), gestion d'un rejet de chargement (au moins un test sur la logique pure).
  >
  > ## Acceptance
  >
  > - `pnpm lint && pnpm typecheck && pnpm test && pnpm build` verts.
  > - Après `pnpm build` : `dist/plantuml/plantuml.js` et `dist/plantuml/viz-global.js` existent, et aucun JS de `dist/assets/` ne dépasse ~1 Mo (le moteur n'est pas inliné).
  > - Vérification navigateur (`pnpm dev` + MCP chrome-devtools si dispo, sinon au minimum via la console) : rendre `@startuml\nBob -> Alice: Hello!\n@enduml` produit un SVG contenant « Bob » et « Alice », sans erreur console.

- [ ] #4 — M4 — Viewer /view/:code (zoom/pan, dark, export SVG/PNG) (labels: —)

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

- [ ] #5 — M5 — Éditeur minimal /edit (CodeMirror, preview live, autosave, erreurs stylées, partage) (labels: —)

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
