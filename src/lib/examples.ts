export interface DiagramExample {
  id: string
  title: string
  description: string
  source: string
}

/** Starter diagrams reused by the home gallery and the editor. */
export const diagramExamples: DiagramExample[] = [
  {
    id: 'sequence',
    title: 'Sequence — render pipeline',
    description: 'How a PlantView link becomes an SVG, fully in the browser.',
    source: `@startuml
actor User
participant "PlantView" as App
participant "PlantUML engine" as Engine
User -> App: Open /view/<code>
App -> App: Decode the URL code
App -> Engine: Render source
Engine --> App: SVG
App --> User: Display diagram
@enduml`,
  },
  {
    id: 'class',
    title: 'Class — domain model',
    description: 'A small class diagram linking a diagram, its link and the viewer.',
    source: `@startuml
class Diagram {
  +source: string
  +render(): Svg
}
class Link {
  +code: string
}
class Viewer {
  +zoom(level: number): void
}
Link --> Diagram
Viewer --> Diagram
@enduml`,
  },
  {
    id: 'activity',
    title: 'Activity — render or fail',
    description: 'The viewer decision flow, including the styled error path.',
    source: `@startuml
start
:Read the diagram code from the URL;
if (Code valid?) then (yes)
  :Render locally with the engine;
  :Display the diagram;
else (no)
  :Show a styled error panel;
endif
stop
@enduml`,
  },
  {
    id: 'usecase',
    title: 'Use case — what users do',
    description: 'The three core actions of the PlantView viewer.',
    source: `@startuml
left to right direction
actor User
usecase "View a diagram" as UC1
usecase "Edit a diagram" as UC2
usecase "Export SVG/PNG" as UC3
User --> UC1
User --> UC2
User --> UC3
@enduml`,
  },
]
