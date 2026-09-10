# PlantView

Viewer PlantUML 100 % navigateur. Un lien encodé ouvre un diagramme affiché proprement (zoom/pan, dark mode, export SVG/PNG), avec un éditeur minimal. Aucun backend, aucun appel à un serveur PlantUML distant.

## Routes

| Route | Rôle |
| --- | --- |
| `/` | Accueil : coller un diagramme, un code encodé ou une URL PlantText/PlantUML |
| `/view/:code` | Viewer plein écran (produit principal) |
| `/edit/:code?` | Éditeur minimal (CodeMirror + preview live) |

`code` = encodage PlantUML standard (deflate + alphabet base64 custom), compatible PlantText / plantuml.com. Paramètre optionnel : `?dark=0|1`.

## Développement

```bash
pnpm install     # installe les deps et copie le moteur PlantUML dans public/plantuml (postinstall)
pnpm dev         # http://localhost:5173
pnpm lint
pnpm typecheck
pnpm test        # tests unitaires Vitest
pnpm test:e2e    # tests navigateur Playwright (chromium headless)
pnpm build       # tsc -b + vite build → dist/
pnpm preview     # sert le build local
```

Les tests e2e nécessitent une installation unique du navigateur :

```bash
pnpm exec playwright install chromium
```

## Déploiement

PlantView est une SPA 100 % statique : `pnpm build` produit le dossier `dist/` (aucun serveur applicatif). Il suffit de servir ce dossier avec un **fallback vers `index.html`** pour que les deep links (`/view/:code`, `/edit/:code`) fonctionnent au rechargement. Les assets `/assets/*` et le moteur `/plantuml/*` sont servis directement.

- **Vercel** : `vercel.json` (rewrite `/(.*)` → `/index.html`).
- **Netlify** : `netlify.toml` (build `pnpm build`, publish `dist`, redirect 200) + `public/_redirects` embarqué dans `dist/`.
- **Autre hébergeur statique** : configurer un rewrite de toute route inconnue vers `/index.html` (200).

## Limitation v1

Purement client, sans backend : il n'existe **pas d'URL image embarquable** (`<img src="…">`) utilisable dans un README ou Slack. Un lien PlantView s'ouvre dans le navigateur, voilà tout ; l'export SVG/PNG reste la solution pour partager une image. Voir `docs/DESIGN.md`.

## Liens pour agents

Un agent doit encoder le diagramme avec le script fourni, jamais à la main
(deflate + alphabet base64 personnalisé : impossible à produire de tête) :

```bash
printf '%s\n' '@startuml' 'Bob -> Alice: Hello!' '@enduml' | pnpm encode
# → http://localhost:5173/view/SoWkIImgAStDuNBAJrBGjLDmpCbCJhLIy4ZDoSbNv798pKi1IG80
```

Le script lit la source par stdin, `--text "…"` ou `--file <path>`. La base de
l'URL est `http://localhost:5173` par défaut, modifiable via `--base <url>` ou
`PLANTVIEW_BASE_URL` ; `--code-only` n'affiche que le code encodé. En cas
d'entrée invalide, il sort en erreur (code 1) avec un message clair.

Voir [`skill/SKILL.md`](skill/SKILL.md) pour le workflow complet des agents.
