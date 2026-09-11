<div align="center">

# PlantView

**Un lien. Ton diagramme PlantUML. Zéro backend.**

Viewer PlantUML 100 % navigateur : rendu local par le moteur officiel, liens encodés compatibles
PlantText / plantuml.com, éditeur minimal, historique local, nœuds déplaçables et exports SVG/PNG.

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white&style=flat-square)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white&style=flat-square)](https://vite.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white&style=flat-square)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white&style=flat-square)](https://tailwindcss.com)
[![PlantUML](https://img.shields.io/badge/PlantUML-100%25_local-1B1B1B?style=flat-square)](https://plantuml.com)
[![pnpm](https://img.shields.io/badge/pnpm-only-F69220?logo=pnpm&logoColor=white&style=flat-square)](https://pnpm.io)

</div>

PlantView affiche un diagramme PlantUML **entièrement dans le navigateur** : pas de serveur Java,
pas de backend, et **aucun appel à un service PlantUML distant** (plantuml.com, PlantText, Kroki…).
Le diagramme voyage dans l'URL sous forme de code PlantUML standard, donc les liens restent
compatibles avec l'écosystème PlantText dans les deux sens.

> **Exemple** : `https://ton-instance/view/SoWkIImgAStDuULroazIqBLJSCp9J4wrKl18pSd9L-JbTKZDIm5A0m00`
> affiche « Bob → Alice: Hello! ».

## Sommaire

- [Fonctionnalités](#fonctionnalités)
- [Comment ça marche](#comment-ça-marche)
- [Démarrage rapide](#démarrage-rapide)
- [Routes & paramètres](#routes--paramètres)
- [Liens pour agents](#liens-pour-agents)
- [Installer la skill de l'agent](#installer-la-skill-de-lagent)
- [Déploiement](#déploiement)
- [Architecture](#architecture)
- [Limites v1](#limites-v1)
- [Qualité](#qualité)
- [Crédits](#crédits)

## Fonctionnalités

| Fonction | Détail |
| --- | --- |
| **Viewer plein écran** | Zoom/pan, fit-to-view, dark mode (`?dark=1`), copie du lien, accès direct à l'édition |
| **Rendu 100 % local** | Moteur officiel `@plantuml/core` (TeaVM + Viz.js, licence MIT) chargé à la demande — aucun serveur |
| **Liens compatibles PlantText** | Encodage PlantUML standard (deflate + alphabet base64 personnalisé) |
| **Exports** | SVG et PNG (canvas ×2), fond adapté au thème |
| **Éditeur minimal** | CodeMirror 6, preview live debouncée, autosave local, erreurs de syntaxe stylées, partage en un clic |
| **Historique local** | Page `/history` : les diagrammes ouverts s'enregistrent dans `localStorage` (dédupliqués, cap 50) — jamais envoyés au réseau |
| **Adjust layout** | Déplacement manuel des nœuds avec ré-ancrage des arêtes (diagrammes « graphe ») |
| **Style par défaut** | Un rendu soigné injecté au rendu, dark et light, sans thème à configurer |
| **SPA statique** | Déployable sur n'importe quel hébergeur statique, deep links via rewrites |

## Comment ça marche

```text
source PlantUML ──► deflate + alphabet PlantUML ──► /view/<code> ──► décodage local ──► SVG
      │                                                                                  │
      └────────────────────────── l'URL est le diagramme ────────────────────────────────┘
```

L'URL est le seul transport : pas de base de données, pas de session, pas de compte.
Copie le lien, il fonctionne partout où l'instance est servie.

## Démarrage rapide

**Prérequis** : Node.js ≥ 20 et [pnpm](https://pnpm.io).

```bash
pnpm install    # installe les deps + copie le moteur PlantUML (~7,5 Mo) dans public/plantuml/
pnpm dev        # http://localhost:5173
```

Build de production et prévisualisation :

```bash
pnpm build      # typecheck + build → dist/
pnpm preview    # sert dist/ localement
```

Lancer les tests :

```bash
pnpm test                        # unitaires (Vitest)
pnpm exec playwright install chromium   # une seule fois
pnpm test:e2e                    # e2e navigateur (Playwright, headless)
```

## Routes & paramètres

| Route | Rôle |
| --- | --- |
| `/` | Accueil : coller une source PlantUML, un code encodé ou une URL PlantText/PlantUML |
| `/view/:code` | Viewer plein écran — le produit principal |
| `/edit/:code?` | Éditeur minimal (CodeMirror + preview live) |
| `/history` | Historique local des diagrammes ouverts |

| Paramètre | Effet |
| --- | --- |
| `?dark=1` / `?dark=0` | Force le thème sombre / clair au chargement (sinon préférence système mémorisée) |

## Liens pour agents

Un agent **ne doit jamais fabriquer l'encodage à la main** (deflate + alphabet personnalisé :
impossible à produire fiablement de tête). Le repo fournit un script dédié :

```bash
printf '%s\n' '@startuml' 'Bob -> Alice: Hello!' '@enduml' | pnpm encode
# → http://localhost:5173/view/SoWkIImgAStDuNBAJrBGjLDmpCbCJhLIy4ZDoSbNv798pKi1IG80
```

| Option | Effet |
| --- | --- |
| `--text <source>` | Encode la source passée en argument |
| `--file <path>` | Encode la source lue depuis un fichier |
| stdin | Encode la source pipée (sans option) |
| `--base <url>` | Base de l'URL de sortie (défaut `http://localhost:5173`) |
| `PLANTVIEW_BASE_URL` | Même chose en variable d'environnement (le flag `--base` gagne) |
| `--code-only` | N'affiche que le code encodé, sans URL |

**L'URL est paramétrable** : pointe `--base` / `PLANTVIEW_BASE_URL` vers ton instance déployée —
c'est la seule configuration nécessaire, l'app elle-même est agnostique de son hébergement
(elle utilise des routes relatives).

```bash
export PLANTVIEW_BASE_URL="https://plantview.example.com"
printf '%s\n' '@startuml' 'A -> B: demo' '@enduml' | pnpm encode
# → https://plantview.example.com/view/<code>
```

## Installer la skill de l'agent

Le repo embarque une skill prête à l'emploi : [`skill/SKILL.md`](skill/SKILL.md)
(nom : `plantview-diagram-link`). Elle apprend à un agent quand et comment générer un lien
PlantView, avec la règle absolue « jamais d'encodage à la main ».

**Installation** — copie le fichier dans le dossier de skills de ton agent :

```bash
# OpenCode (global)
mkdir -p ~/.config/opencode/skills/plantview-diagram-link
cp skill/SKILL.md ~/.config/opencode/skills/plantview-diagram-link/SKILL.md

# OpenCode (projet)          → .opencode/skills/plantview-diagram-link/SKILL.md
# Claude Code / skills externes → ~/.claude/skills/plantview-diagram-link/SKILL.md
#                                (ou ~/.agents/skills/… selon ton outil)
```

**Prérequis de la skill** :

1. Un clone de ce repo avec `pnpm install` (le script `scripts/encode.mjs` utilise
   `plantuml-encoder`) ;
2. `PLANTVIEW_BASE_URL` défini vers ton instance (sinon `http://localhost:5173` par défaut).

Redémarre ton agent après l'installation pour qu'il charge la nouvelle skill.

## Déploiement

PlantView est une SPA **100 % statique** : `pnpm build` produit `dist/`, à servir avec un
**fallback vers `index.html`** pour les deep links.

| Cible | Config fournie |
| --- | --- |
| Vercel | `vercel.json` (rewrite `/(.*)` → `/index.html`) |
| Netlify | `netlify.toml` + `public/_redirects` (`/* /index.html 200`) |
| Autre | Rewrite des routes inconnues vers `/index.html` (200) |

Les assets `/assets/*` (app) et `/plantuml/*` (moteur, copié au `postinstall`) sont servis tels quels.

## Architecture

| Couche | Choix |
| --- | --- |
| App | Vite 7 + React 19 + TypeScript strict + Tailwind CSS 4 |
| Routage | `react-router-dom` 7 |
| Rendu diagramme | `@plantuml/core` (TeaVM + Viz.js), assets statiques chargés à la demande |
| Encodage | `plantuml-encoder` (codec PlantUML standard) |
| Sécurité SVG | `dompurify` (sanitize avant injection DOM) |
| Zoom/pan | `react-zoom-pan-pinch` |
| Éditeur | CodeMirror 6 via `@uiw/react-codemirror` |
| Tests | Vitest (unitaire) + Playwright (e2e navigateur) |

```text
src/routes/        Home · View · Edit · History
src/components/    DiagramCanvas · Toolbar · ErrorPanel
src/lib/           plantuml-encoding · render-plantuml · default-style · svg-drag
                   export · history · examples · plantuml-language
scripts/           sync-plantuml-assets.mjs (postinstall) · encode.mjs (CLI agents)
public/plantuml/   moteur copié au postinstall (gitignoré)
skill/             skill agent « plantview-diagram-link »
```

Les décisions produit sont documentées dans [`docs/DESIGN.md`](docs/DESIGN.md) et les conventions
de développement dans [`AGENTS.md`](AGENTS.md).

## Limites v1

- **Pas d'URL image embarquable** (`<img src="…">` dans un README ou Slack) : le rendu est
  côté client, donc un lien PlantView s'ouvre dans le navigateur. Pour partager une image,
  utilise l'export SVG/PNG.
- **Adjust layout** : pas de re-layout ni de redimensionnement des clusters ; les positions
  ajustées ne sont pas encodées dans l'URL (session + export uniquement) ; désactivé sur les
  diagrammes sequence, timing, activity et mindmap.
- Les erreurs de syntaxe PlantUML sont rendues par le moteur dans le diagramme : l'éditeur les
  présente dans un panneau stylé avec la ligne concernée.

## Qualité

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm test:e2e
```

Tests unitaires (Vitest) pour la logique pure — codec, rendu, style, drag, historique —
et tests e2e (Playwright) pour le parcours viewer, éditeur, historique et drag.

## Crédits

- [PlantUML](https://plantuml.com) par Arnaud Roques — moteur compilé en JavaScript
  via TeaVM et publié en npm sous [`@plantuml/core`](https://www.npmjs.com/package/@plantuml/core) (MIT).
- Layout Graphviz via [Viz.js](https://github.com/mdaines/viz-js).
- Encodage URL : [`plantuml-encoder`](https://github.com/markushedvall/plantuml-encoder).
