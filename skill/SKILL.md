---
name: plantview-diagram-link
description: Génère un lien PlantView (/view/<code>) à partir d'une source PlantUML, pour montrer ou partager un diagramme. À utiliser dès qu'un agent doit fournir un lien de diagramme PlantUML. L'encodage ne doit jamais être fabriqué à la main.
---

# PlantView — générer un lien de diagramme

## Quand utiliser cette skill

- L'utilisateur demande de **montrer**, **afficher** ou **partager** un diagramme PlantUML.
- Tu produis toi-même un diagramme PlantUML et veux fournir un lien cliquable.
- Tu reçois une source PlantUML et dois la transformer en URL `/view/…`.

## Règle absolue

**Ne fabrique jamais le code encodé à la main.** L'encodage PlantUML combine une
compression deflate et un alphabet base64 personnalisé : impossible à produire de
tête, et la moindre erreur donne un diagramme illisible. Utilise toujours le script
`scripts/encode.mjs` fourni par le repo.

Le rendu PlantView est 100 % local : n'appelle aucun serveur PlantUML distant
(plantuml.com, planttext.com, kroki…).

## Workflow

1. Écrire la source PlantUML complète, encadrée par `@startuml` / `@enduml`
   (ou `@startmindmap`, `@startgantt`, etc.).
2. L'encoder avec le script, depuis la racine du repo :
   - `pnpm encode` (raccourci), ou `node scripts/encode.mjs` ;
   - entrée par stdin, `--text "…"` ou `--file <path>`.
3. Fournir à l'utilisateur l'URL générée (`http://localhost:5173/view/<code>` par
   défaut). Pour une instance déployée, passer `--base <url>` ou définir
   `PLANTVIEW_BASE_URL`.

## Exemples

```bash
# Depuis stdin (recommandé : pas de quoting fragile)
printf '%s\n' '@startuml' 'Bob -> Alice: Hello!' '@enduml' | pnpm encode

# Depuis un fichier, avec la base de l'instance déployée
node scripts/encode.mjs --file diagram.puml --base https://plantview.example.com

# Uniquement le code (à concaténer soi-même dans /view/<code>)
pnpm encode --file diagram.puml --code-only
```

## Options du script

| Option | Effet |
| --- | --- |
| `--text <source>` | Encode la source passée en argument |
| `--file <path>` | Encode la source lue depuis un fichier |
| stdin | Encode la source pipée (sans option) |
| `--base <url>` | Base de l'URL de sortie (défaut `http://localhost:5173`) |
| `PLANTVIEW_BASE_URL` | Variable d'environnement équivalente à `--base` (priorité au flag) |
| `--code-only` | N'affiche que le code encodé, sans URL |
| `-h`, `--help` | Affiche l'aide |

## Vérification

- La sortie contient `/view/` suivi d'un code ne comportant que
  `[0-9A-Za-z_-]`.
- En cas d'erreur (source vide, fichier introuvable, option inconnue), le script
  sort avec le code 1 et un message clair sur stderr : corrige l'entrée et
  relance, ne contourne pas le script.
