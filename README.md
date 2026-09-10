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
pnpm test
pnpm build
```

## Liens pour agents

Un agent doit encoder le diagramme avec le script fourni, jamais à la main :

```bash
echo '@startuml
Bob -> Alice: Hello!
@enduml' | pnpm encode
```

Voir `skill/SKILL.md` (M8) pour le workflow complet.
