# Arquitectura de Range Trainer

## Math Trainer

Math Trainer vive en `js/modules/math-trainer/` y se registra como
`math-trainer` mediante `RT.Modules`. Reutiliza los cuatro hosts del workspace:
configuración a la izquierda, ejercicio en el centro, progreso a la derecha y
presets en la galería inferior.

El módulo conserva los ocho JSON originales, las operaciones Poker Numbs y la
generación dinámica NUMA. `math-trainer-engine.js` construye pools y controla
sesiones; `math-trainer-generators.js` implementa NUMA/Poker;
`math-trainer-validators.js` evalúa respuestas; `math-trainer-timer.js`
encapsula el único intervalo; `math-trainer-stats.js` persiste bajo
`rangeTrainer.mathTrainer.*`; y `math-trainer-ui.js` presenta toda la
configuración avanzada y los 20 presets.

No comparte estado ni estadísticas con rangos, Simulador o Grid Trainer. Los
datasets se empaquetan como JavaScript para conservar el funcionamiento
offline sin `fetch`, pero los JSON fuente permanecen en el módulo.

## Simulador: Duelo de Jugadas

`js/modules/simulator/duel-hands/` vive como submodulo del Simulador, no como
modulo global de navegacion. `simulator-ui.js` solo alterna entre la vista
preflop existente y `Duelo de Jugadas`; el motor, estado, estadisticas y render
del duelo quedan encapsulados en el submodulo.

La logica migrada reparte Hero, Villain y board completo sin duplicados,
evalua la mejor mano de cinco cartas, compara Hero/Villain/Split y permite
Reveal/Jugada resaltando exclusivamente las cartas usadas. Sus estadisticas
usan `rangeTrainer.simulator.duelHands.*` y no alimentan `RT.Stats` del
simulador preflop.

## Grid Trainer

Grid Trainer vive en `js/modules/grid-trainer/` y se registra mediante
`RT.Modules`. Reutiliza el layout del workspace, pero reemplaza temporalmente
la matriz, ambos paneles y la galería con vistas propias. Al desmontarse,
`app.js` reconstruye la matriz de rangos; no comparte lógica de ejercicio con
Estudio, Entrenamiento ni Simulador.

La generación y validación están en `grid-trainer-engine.js`, la máquina de
estados en `grid-trainer-state.js`, el render en `grid-trainer-ui.js` y la
persistencia en `grid-trainer-stats.js`. Todas sus claves usan el prefijo
`rangeTrainer.gridTrainer.*`.

El grid del módulo es siempre la matriz canónica 13×13. Script Mode conserva
selección, challenge, transporte y patrones; Memory Mode conserva áreas
1–6/M, colores, cantidad, velocidad y SEC directa/inversa/combinada. Las
categorías de dificultad y tamaño usadas por estadísticas son derivadas, no
controles de producto añadidos.

Range Trainer es una aplicación offline en vanilla HTML, CSS y JavaScript.
No necesita compilación, framework ni dependencias en producción. Los scripts
se encapsulan con IIFE y publican APIs dentro del namespace `RT`.

## Estructura actual

```text
js/
  core/
    hands.js
    module-registry.js
    range-engine.js
    quiz-engine.js
    simulator-engine.js
    stats.js
  data/
    ranges.data.js
    ranges-extra.data.js
    questions.data.js
  ui/
    app.js
    components.js
    dialogs.js
    grid.js
    range-gallery.js
    settings.js
    study/
      study-ui.js
    quizzes/
      quiz-common-ui.js
      quiz-results-ui.js
      range-quiz-ui.js
      surgical-quiz-ui.js
      training-ui.js
    simulator/
      table-view.js
    simulator-ui.js
  modules/
    grid-trainer/
    math-trainer/
```

## Responsabilidades

### Core

- `hands.js`: manos, combos, posiciones y bus de eventos.
- `range-engine.js`: registro, validación, índices y consultas de rangos.
- `quiz-engine.js`: estado y evaluación de los dos quizzes.
- `simulator-engine.js`: generación y evaluación del simulador, sin DOM.
- `stats.js`: progreso, falladas y persistencia estadística.
- `module-registry.js`: registro estable para módulos futuros.
- `math-trainer/`: entrenamiento matemático completo, aislado del core de
  rangos.

### Datos

- `ranges.data.js`: repertorios originales.
- `ranges-extra.data.js`: repertorios ampliados.
- `questions.data.js`: categorías y plantillas pedagógicas.

Los datos se registran mediante las APIs de `core`. La interfaz nunca contiene
una copia paralela de una respuesta correcta.

### Interfaz compartida

- `app.js`: arranque, estado global mínimo, navegación, eventos y composición.
- `components.js`: controles DOM reutilizables.
- `grid.js`: matriz principal y actualizaciones unitarias.
- `range-gallery.js`: biblioteca, filtros, miniaturas y multiselección.
- `dialogs.js`: configuración, estadísticas, importación y reset.
- `settings.js`: configuración persistente y favoritos.

### Vistas de modo

- `study/study-ui.js`: panel e insights completos de Estudio.
- `quizzes/range-quiz-ui.js`: configuración, ejercicio y revisión de Quiz Rango.
- `quizzes/surgical-quiz-ui.js`: configuración, falladas, ejercicio y revisión
  de Quiz Quirúrgico.
- `quizzes/quiz-common-ui.js`: configuración de contextos, favoritos y metadatos
  compartidos por los quizzes.
- `quizzes/quiz-results-ui.js`: comparación de respuestas y métricas laterales.
- `simulator-ui.js`: configuración y coordinación visual del simulador.
- `simulator/table-view.js`: mesa, cartas y línea de acción.

`table-view.js` es dueño de toda la información situada dentro de la mesa:
asientos, cartas, stacks, ciegas, apuestas, bote, spot y línea. Los paneles
laterales conservan instrucciones y métricas, pero no duplican ese contexto.

`app.js` no debe volver a implementar vistas completas. Actualmente queda por
debajo de 1200 líneas y actúa como orquestador.

## Contrato de las vistas

Cada vista expone una fábrica:

```js
const view = RT.StudyUI.create(ctx);
view.renderPanel(panel);
view.renderInsights(aside);
```

`ctx` agrupa únicamente dependencias explícitas:

- `ui`: estado visual compartido;
- `toolkit`: componentes DOM;
- callbacks de render como `renderAll` o `renderPanel`;
- selectores pequeños como `studyContext` o `selectedContextIds`;
- módulos compartidos como `QuizCommonUI` y `QuizResultsUI`.

Las vistas pueden consultar APIs públicas `RT.Engine`, `RT.Settings`,
`RT.Stats` y los motores, pero no crean globals ni acceden a variables
privadas de otros archivos.

## Flujo de render

```text
evento de usuario o motor
  -> app.js decide render completo o actualización caliente
  -> app.js selecciona vista según ui.mode
  -> vista renderiza panel/insights con ctx
  -> Grid y RangeGallery conservan sus ciclos independientes
```

Las rutas calientes `rangequiz:hand`, `rangequiz:brush` y `surgical:hand`
siguen evitando reconstruir todo el DOM durante el pintado.

## Flujo de datos

```text
data/*.js
  -> RT.Engine
  -> quiz-engine / simulator-engine
  -> RT.emit(...)
  -> app.js
  -> vista especializada
```

Los motores mantienen el estado de entrenamiento. Las vistas solo envían
comandos y presentan ese estado.

`RT.Stats.getHandPerformance()` es la API común para precisión, intentos y
peso adaptativo por mano. El simulador la consume únicamente durante el
reparto; la evaluación continúa dependiendo exclusivamente de `RT.Engine`.

El registro de módulos normaliza identificadores y etiquetas al entrar. Las
consultas usan la misma identidad normalizada, evitando módulos inaccesibles
por espacios accidentales.

## Cómo añadir un modo

1. Crear su motor sin DOM si necesita lógica propia.
2. Crear una vista completa con `create(ctx)`.
3. Exponer `renderPanel`, `renderInsights` y otros métodos públicos mínimos.
4. Registrar el módulo mediante `RT.Modules.register`.
5. Reutilizar el punto de montaje de módulos del workspace.
6. Mantener matriz, galería y paneles mediante servicios del workspace.

Ubicación prevista:

- Math Trainer: `js/modules/math-trainer/` (implementado)
- Sopa de Escaleras: `js/modules/sopa-escaleras/`
- Grid Trainer: `js/modules/grid-trainer/` (implementado)
- Position Trainer: `js/modules/position-trainer/`

Estos módulos no deben añadir condicionales internos a las vistas actuales.

## Invariantes

1. Las respuestas proceden de rangos registrados.
2. La identidad completa incluye rival/origen cuando corresponde.
3. Los quizzes no revelan respuestas antes de comprobar.
4. Las miniaturas se ocultan solo durante un ejercicio activo.
5. Los resultados viven en paneles laterales.
6. Una categoría vacía no aparece.
7. La página no desborda horizontalmente; la biblioteca sí puede hacerlo.
8. El simulador solo acepta contextos que su motor sabe evaluar y explica los
   seleccionados que todavía no son compatibles.
9. Los filtros IP/OOP se derivan de `context.relative`; no existen listas
   paralelas de spots.
10. Dealing Coverage limita el dominio de reparto, pero nunca modifica la
    acción correcta ni los rangos declarativos.

## Archivos sensibles

No tocar salvo necesidad real:

- `core/hands.js`
- `core/range-engine.js`
- `core/quiz-engine.js`
- `core/simulator-engine.js`
- `data/ranges*.data.js`
- `index.html`, porque el orden de scripts es contractual.

Una nueva función de producto debe vivir en su módulo. `app.js` solo conecta,
selecciona modo, coordina eventos y pasa servicios.

## Entrenamiento unificado

La navegación pública expone un único modo `training`. El formato activo vive
en `ui.trainingMode`:

- `range`: reconstrucción de repertorios completos con `RT.RangeQuiz`;
- `questions`: preguntas individuales con `RT.SurgicalQuiz`.

`TrainingUI` monta una de las dos vistas sin duplicar layout, galería ni
paneles. Cambiar de formato detiene de forma segura la sesión anterior y
conserva la multiselección de repertorios.

Las preguntas individuales aceptan un `handFilter` opcional con cartas y
familias. Se aplica como intersección final sobre las plantillas existentes;
sin filtro, el comportamiento previo permanece idéntico.
