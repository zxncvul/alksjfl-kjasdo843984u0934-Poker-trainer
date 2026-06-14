# Hoja de ruta del simulador

> **El simulador preflop básico YA ESTÁ IMPLEMENTADO** (open raise y defensa
> vs 3bet, modos realista, aleatorio y campaña): ver `README_SIMULADOR.md` y los módulos
> `js/core/simulator-engine.js` + `js/ui/simulator-ui.js`.
>
> Este documento conserva la guía de diseño para las AMPLIACIONES futuras
> (cold call, squeeze, defensa BB vs steal, limp/iso, stacks, sizings) y el
> formato de escenarios manuales, de modo que crezcan sobre la misma
> arquitectura sin romperla.

## 1. Qué está ya preparado

### 1.1 La respuesta correcta ya existe: `RT.Engine.getActionMap(ctx)`

Para cualquier contexto completo devuelve el mapa mano → acción:

```js
const ctx = { source: 'david-diaz', spot: 'VS3BET', hero: 'CO', relative: 'IP' };
const map = RT.Engine.getActionMap(ctx);
// map['AA'] === '4BET', map['QQ'] === 'CALL', map['66'] === 'FOLD', ...
```

Esto **es** el árbol de decisión del simulador: dada una situación y una
mano concreta, la respuesta correcta es `map[mano]`. Si una mano no aparece
en el mapa de un spot de defensa, significa que no estaba en el rango previo
(en VS3BET, una mano fuera del mapa nunca llegó a abrirse) — el generador de
escenarios debe repartir solo manos presentes en el mapa.

### 1.2 Enumerar situaciones posibles

Las mismas consultas que usan los quizzes sirven para generar escenarios:

```js
RT.Engine.availableSpots(source)                    // ['OR','VS3BET',...]
RT.Engine.spotNeedsRelative(spot)                   // true/false
RT.Engine.availableRelatives({source, spot})        // ['OOP','IP']
RT.Engine.availableHeroes({source, spot, relative}) // ['UTG','MP',...]
RT.Engine.availableActions(ctx)                     // acciones reales del contexto
RT.Engine.describeContext(ctx)                      // texto humano del contexto
```

En `js/core/quiz-engine.js`, la función `buildQuestionPool()` es el modelo a
imitar: recorre spots → relativas → héroes con esas consultas y descarta lo
vacío. Un `buildScenarioPool()` del simulador sería análogo (ver §3).

### 1.3 Manos y combos: `RT.Hands`

- `RT.Hands.ALL_HANDS`, `RT.Hands.MATRIX` — universo de manos.
- `RT.Hands.comboCount(h)` — 6/4/12 combos por mano. Útil para **muestrear
  manos ponderadas por combos** (que 'AKo' salga 3 veces más que 'AKs'),
  imprescindible para que el simulador reparta de forma realista.
- `RT.Hands.matchesFilter / filterHands` — por si el simulador permite
  practicar solo una familia ("solo parejas", "solo Ax").

### 1.4 Patrón de motor de quiz

`RT.SurgicalQuiz` y `RT.RangeQuiz` (en `js/core/quiz-engine.js`) muestran el
patrón a seguir: máquina de estados pura (`idle/running/review/finished`),
estado legible desde fuera, métodos de transición y eventos
`RT.emit('xxx:changed')` para que la UI re-renderice. El comentario
"PUNTO DE INTEGRACIÓN FUTURO" de la cabecera de ese archivo marca el sitio.

### 1.5 UI lista para un modo más

- Las tabs de modo viven en `index.html` (`#mode-tabs`) y `js/ui/app.js`
  (`setMode`, `renderPanel`): añadir un modo = una tab + una rama de render.
- Los componentes de panel (`button`, `group`, `promptCard`, `scoreCard`,
  `chip`) y los botones de acción coloreados (`.btn-action` con
  `--btn-accent`) son exactamente lo que necesita la botonera
  fold/call/3bet/4bet del simulador.
- `RT.Grid.render(viewModel)` puede resaltar la mano repartida
  (p. ej. con `colors` o `selected`) sin tocar el componente.

---

## 2. Qué NO debe modificarse

Para no romper compatibilidad con los modos existentes:

- **`js/core/hands.js`** — utilidades puras compartidas por todo. Añadir
  funciones es seguro; cambiar las existentes no.
- **`js/core/range-engine.js`** — la API de consulta (`getRange`,
  `getActionMap`, `available*`, `defineRange`...) es el contrato de toda la
  aplicación.
- **El formato de `js/data/ranges.data.js`** — el simulador debe *consumir*
  los rangos tal cual; nunca exigir campos nuevos obligatorios. Si necesita
  metadatos (p. ej. tamaños de stack), añádelos como propiedades opcionales:
  los motores actuales ignoran las propiedades que no conocen.
- Los motores `RT.RangeQuiz` y `RT.SurgicalQuiz` — el simulador es un motor
  nuevo, no una modificación de estos.

---

## 3. Estructura futura de escenarios (documentada, no implementada)

Cuando se implemente el simulador, los escenarios manuales se declararán en
un archivo nuevo `js/data/scenarios.data.js` con este formato (mismo estilo
declarativo que `defineRange`; las propiedades extra no rompen los motores
actuales porque solo leen las que conocen):

```js
RT.defineScenario({
  id: 'vs3bet-co-ip-001',
  source: 'david-diaz',

  // Situación
  spot: 'VS3BET',
  hero: 'CO',              // posición del héroe
  villain: 'BTN',          // posición del villano que actúa
  relative: 'IP',          // derivable de hero/villain; explícito por claridad

  // Condiciones de mesa
  effectiveStack: 100,     // stack efectivo en BB
  sizing: '3x',            // tamaño de la acción del villano
  prevAction: 'CO abre 2.5bb, BTN 3betea a 8bb',  // historia previa

  // Pregunta concreta (si falta `hand`, el motor reparte una mano del
  // actionMap ponderada por combos — escenario "generativo")
  hand: 'KQs',
  correctAction: 'CALL',   // si falta, se resuelve con getActionMap(ctx)[hand]

  // Pedagogía
  explanation: 'KQs domina los bluffs del 3bet de BTN y juega bien IP.',
  difficulty: 2,           // 1 fácil · 2 media · 3 difícil
  tags: ['defensa', 'broadway', '100bb']
});
```

Reglas de diseño ya acordadas para esa fase:

- `correctAction` opcional: si no se da, la verdad sale de
  `RT.Engine.getActionMap(ctx)[hand]` — un solo origen de verdad, sin
  duplicar rangos en los escenarios.
- Los escenarios **generativos** (sin `hand`) cubren volumen; los manuales
  (con `hand` + `explanation`) cubren los puntos didácticos finos.
- `difficulty` y `tags` permitirán filtrar sesiones igual que hoy se filtra
  por categorías en el quiz quirúrgico (reutilizar `multiSelectGroup`).
- `effectiveStack`, `sizing` y `prevAction` son texto/números informativos
  en esta fase: se muestran en el enunciado. Si algún día los rangos
  dependen del stack, se añadirá una dimensión más al spot (`dims`), no un
  formato nuevo.

## 4. Esqueleto recomendado

**Archivo nuevo: `js/core/simulator-engine.js`** (cargar en `index.html`
después de `quiz-engine.js`):

```js
(function (RT) {
  'use strict';

  // 1. Generar escenarios (análogo a buildQuestionPool):
  //    recorrer contextos disponibles y muestrear una mano del actionMap,
  //    ponderada por RT.Hands.comboCount.
  function buildScenarioPool(options) {
    // { context, hand, correctAction, options: RT.Engine.availableActions(ctx) }
  }

  // 2. Máquina de estados (copiar el patrón de RT.SurgicalQuiz):
  //    idle → running → (answer) → review → next → ... → finished
  //    answer(actionId): correcta si actionId === actionMap[hand].
  //    Registrar fallos para repaso, igual que failedQuestions.

  // 3. Notificar: RT.emit('simulator:changed').

  RT.Simulator = { /* state, start, answer, next, stop */ };
})(window.RT);
```

**En la UI (`js/ui/app.js`):**

1. Tab nueva en `index.html`: `<button data-mode="simulator">Simulador</button>`.
2. Rama `renderSimulatorPanel(panel)` en `renderPanel()`:
   configuración (reutilizar `renderContextConfig`), carta de situación
   (`promptCard`), botonera de acciones del contexto (`.btn-action`),
   marcador (`scoreCard`).
3. Rama en `buildGridViewModel()` para resaltar la mano repartida en la
   matriz (no interactiva).
4. `RT.on('simulator:changed', renderAll)` en `boot()` y parada del motor
   en `setMode()` (igual que los otros dos quizzes).

Con esto el simulador hereda gratis: botones condicionales, contadores de
combos, responsive, tema visual y cualquier rango que se añada en el futuro
a `ranges.data.js`.

---

## 5. Ideas de evolución compatibles

- **Escenarios narrados**: `describeContext(ctx)` ya da el texto base
  ("vs 3Bet · CO · IP"); se puede enriquecer sin tocar el motor.
- **Estadísticas por mano/contexto**: el estado del simulador puede acumular
  resultados; persistirlos (localStorage) es una capa aparte que no afecta
  a los motores.
- **Pesos por mano**: si algún día los rangos llevan frecuencias
  (p. ej. `weights: { 'A5s': 0.5 }`), añádelo como propiedad opcional del
  `defineRange` y trátalo solo en el simulador; el resto de la app seguirá
  funcionando sin cambios.
