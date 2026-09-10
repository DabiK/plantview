# PlantView — instructions agents

## Produit

PlantView est un viewer PlantUML 100 % client : un lien `/view/<code>` (encodage PlantUML standard) affiche un diagramme joliment, sans backend, sans Java, sans appel à un serveur PlantUML distant. Un éditeur minimal existe sur `/edit`.

Les décisions produit sont verrouillées dans [docs/DESIGN.md](docs/DESIGN.md). **Ne pas les re-décider en implémentation.**

## Stack (verrouillée)

- Vite + React + TypeScript strict + Tailwind CSS 4 (plugin `@tailwindcss/vite`)
- `react-router-dom` v7
- Rendu : `@plantuml/core` (TeaVM + Viz.js, licence MIT), copié en assets statiques `public/plantuml/` par `postinstall`, chargé à la demande — **jamais** bundlé dans le chunk principal
- Encodage URL : `plantuml-encoder` (codec PlantUML standard, compatible PlantText/plantuml.com)
- Sanitize SVG : `dompurify`
- Zoom/pan : `react-zoom-pan-pinch`
- Éditeur : CodeMirror 6 via `@uiw/react-codemirror`
- Icônes : `lucide-react`
- Tests : Vitest (unitaire, environnement node) + Playwright (e2e navigateur)
- Gestionnaire de paquets : **pnpm** (jamais npm/yarn)

## Architecture cible

```
src/routes/        Home.tsx, View.tsx, Edit.tsx
src/components/    DiagramCanvas, Toolbar, ErrorPanel, ...
src/lib/           plantuml-encoding.ts, render-plantuml.ts, export.ts, examples.ts, plantuml-language.ts
scripts/           sync-plantuml-assets.mjs, encode.mjs
public/plantuml/   assets moteur (générés par postinstall, gitignorés)
```

## Commandes (definition of done)

Avant de committer, **tout doit passer** :

```bash
pnpm install
pnpm lint
pnpm typecheck   # tsc -b
pnpm test        # vitest run --passWithNoTests
pnpm build
pnpm test:e2e    # Playwright, à partir de M7
```

Ne jamais laisser le build cassé. Une feature n'est pas finie sans test unitaire (Vitest) couvrant le happy path + les cas d'erreur importants. Les features viewer/éditeur sont en plus vérifiées dans le navigateur (MCP chrome-devtools) quand c'est possible.

## Règles

- **Rendu local uniquement** : aucun appel réseau vers plantuml.com, planttext.com, kroki ou autre service de rendu.
- **Compat encodage** : le code d'URL est le codec PlantUML standard. Le décodage normalise les fins de ligne en `\n` (les codes PlantText contiennent des `\r`).
- UI en **anglais** ; identifiants et code en **anglais** ; documentation du repo en **français**.
- TypeScript strict, pas de `any` non justifié, pas de logique métier dans les composants de présentation.
- Une tâche = une issue GitHub. Une seule tâche par itération. Commits atomiques.
- Mettre à jour `progress.txt` et cocher `PRD.md` à chaque itération ; fermer l'issue GitHub correspondante avec `gh issue close <n>`.
