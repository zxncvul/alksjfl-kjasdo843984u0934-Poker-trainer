# Módulos

## Módulo implementado: Math Trainer

`js/modules/math-trainer/` integra el proyecto `math trainer/` con estado,
motor, generadores, validadores, temporizador, estadísticas, presets, datasets
y vista propios. Conserva NUMA, Poker Numbs, los cinco modos especiales, Pot
Odds, todas las variantes de Equity y SPR, cronómetro, contrarreloj, repaso,
historial, flashcards y teclado Numa.

La galería contiene 20 presets declarativos, cinco por familia. No sustituyen
la configuración avanzada. La persistencia usa exclusivamente
`rangeTrainer.mathTrainer.*`.

La auditoría completa, correcciones de estados, temporizadores, validación,
repaso y casos límite NUMA están documentadas en
`AUDITORIA_MATH_TRAINER.md`.

La estructura y los 706 ejercicios JSON detectados están documentados en
`README_MATH_TRAINER.md`.

## Submodulo implementado: Duelo de Jugadas en Simulador

`js/modules/simulator/duel-hands/` integra el proyecto original
`Duelo de jugadas/` como subseccion interna del Simulador. El simulador preflop
permanece intacto y la navegacion del panel izquierdo permite alternar entre
`Preflop`, `Showdown` y `Position`.

El submodulo conserva la generacion Hero vs Villain, board completo, eleccion
Hero/Split/Villain, comparacion de manos, feedback y Reveal/Jugada. La
evaluacion devuelve siempre las cinco cartas exactas de la mejor mano, de modo
que los highlights no marcan cartas irrelevantes.

La persistencia de estadisticas usa el prefijo propio
`rangeTrainer.simulator.duelHands.*` y no se mezcla con rangos, Grid Trainer,
Math Trainer ni el simulador preflop.

## Submodulo implementado: Position Trainer en Simulador

`js/modules/simulator/position-trainer/` integra Position Trainer como tercera
herramienta interna del Simulador. Entrena posicion-asiento, asiento-posicion,
asiento-IP/OOP e IP/OOP-asiento con mesas de 2 a 10 jugadores, nomenclatura A/B,
timer, estadisticas y galeria propia.

La logica se mantiene en motor, estado, adaptador y UI separados. `app.js` y
`simulator-ui.js` solo orquestan la seleccion de herramienta, el render del
panel, la mesa, el asistente y la galeria inferior. La persistencia usa el
prefijo `rangeTrainer.simulator.positionTrainer.*`.

### Subseccion Pot Odds Trainer

`js/modules/math-trainer/pot-odds-trainer/` integra el proyecto
`pot odds trainer/` como pestaña interna de Math Trainer. Usa los mismos hosts
de panel, ejercicio, analisis y galeria, pero mantiene estado y persistencia
independientes bajo `rangeTrainer.mathTrainer.potOddsTrainer.*`.

Conserva generacion de proyectos, outs, Duel Odds, evaluador de manos,
Identify, Ranking, Reveal, teclado, memoria, countdown y bloqueos. El adaptador
desmonta timers y listeners al cambiar entre `Math Trainer` y
`Pot Odds Trainer`; `app.js` no contiene logica del nuevo trainer.

## Módulo implementado: Grid Trainer

`js/modules/grid-trainer/` es la primera implementación completa del registro
de módulos. Conserva motor, estado, interfaz y estadísticas separados:

La auditoría funcional y sus casos de validación están documentados en
`AUDITORIA_GRID_TRAINER.md`.

```text
js/modules/grid-trainer/
  index.js
  grid-trainer-engine.js
  grid-trainer-ui.js
  grid-trainer-state.js
  grid-trainer-stats.js
  README.md
```

`app.js` solo monta o desmonta el módulo registrado y le entrega los cuatro
hosts del workspace. La generación, los patrones, la validación, los controles
y la persistencia permanecen dentro del módulo.

Grid Trainer mantiene el grid original 13×13 y sus dos modos internos
Script/Memory. No introduce selectores de dificultad ni de tamaño físico: las
áreas 1–6/M, velocidades, cantidad, colores, órdenes y patrones proceden de
`grid_final (1)`.

Convención para añadir Position Trainer, Sopa de Escaleras y otros
modos sin hacer crecer `app.js`.

## Estructura

Crear únicamente los archivos necesarios:

```text
js/modules/<module-id>/
  index.js
  README.md
  engine.js      # opcional, lógica sin DOM
  ui.js          # opcional, vista completa
  config.js      # opcional
  styles.css     # opcional
```

Ubicaciones previstas o implementadas:

```text
js/modules/math-trainer/       # implementado
js/modules/position-trainer/
js/modules/sopa-escaleras/
```

No se crean carpetas vacías antes de implementar el módulo.

## Registro

`index.js` es el punto público:

```js
(function registerModule(RT) {
  'use strict';

  RT.Modules.register({
    id: 'math-mode',
    label: 'Math Mode',
    mount(host, services) {},
    unmount() {}
  });
})(window.RT);
```

El identificador es ASCII, estable y único. El registro elimina espacios
exteriores, usa la identidad normalizada en `register/get` y rechaza
duplicados.

## Patrón de vista

Las vistas existentes marcan el patrón:

```js
RT.ExampleUI = {
  create(ctx) {
    function renderPanel(panel) {}
    function renderInsights(aside) {}
    return { renderPanel, renderInsights };
  }
};
```

El contexto debe pasar dependencias explícitas:

```js
{
  ui,
  toolkit: RT.UI.create(...),
  renderAll,
  renderPanel,
  selectedContextIds,
  services: {
    engine: RT.Engine,
    stats: RT.Stats,
    settings: RT.Settings
  }
}
```

No crear globals nuevos ni importar estado privado de `app.js`.

## Reglas

- `engine.js` no conoce DOM.
- `ui.js` no contiene respuestas.
- `index.js` conecta engine y UI.
- Los listeners propios se retiran en `unmount`.
- Persistencia con namespace propio. Grid Trainer usa el prefijo contractual
  `rangeTrainer.gridTrainer.*`.
- Los estilos usan una clase raíz del módulo.
- Un módulo no modifica directamente vistas existentes.

## Integración con navegación

Grid Trainer es el primer módulo montado en el workspace. Un futuro
`js/ui/modules/module-host.js` generalizará este montaje y deberá:

1. leer `RT.Modules.list()`;
2. crear las entradas de navegación;
3. desmontar el modo anterior;
4. montar el nuevo dentro del workspace;
5. pasar matriz, galería, paneles y servicios necesarios.

Math Trainer, Sopa de Escaleras y Position Trainer se conectan
todos mediante ese host. No se añadirá un bloque condicional independiente
por módulo dentro de `app.js`.

## Nuevos quizzes

Usar como referencia:

- `range-quiz-ui.js`: vista de rango completo;
- `surgical-quiz-ui.js`: vista de preguntas;
- `quiz-common-ui.js`: configuración común;
- `quiz-results-ui.js`: revisión y métricas.

Un quiz nuevo debe tener un motor con estados claros y una vista completa. Si
comparte resultados, ampliar la API de `QuizResultsUI` en lugar de copiarla.

## Nuevos simuladores

Separar generación, evaluación y presentación. Componentes visuales con ciclo
propio deben salir a `ui/simulator/`, como `table-view.js`.

## Regla para proteger app.js

`app.js` puede:

- inicializar servicios;
- cambiar de modo;
- coordinar eventos;
- elegir qué vista renderizar;
- mantener estado global mínimo.

## Variantes de entrenamiento

`js/ui/quizzes/training-ui.js` es el contenedor de Rango completo y Preguntas
individuales. Una futura variante que entrene el mismo conocimiento debe
integrarse en ese selector, manteniendo una sola pestaña de Entrenamiento.

Las vistas especializadas conservan motores y estado propios. El contenedor
solo selecciona la vista, evita sesiones simultáneas y mantiene compartidos
la matriz, los paneles y la biblioteca.

No puede contener la implementación completa de un modo. Si una nueva
función necesita panel, estado o ciclo propios, debe crearse como módulo.
