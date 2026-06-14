# AUDITORÍA Y CORRECCIONES

Auditoría completa del proyecto de ejercicios de memoria visual del grid, con todos los bugs encontrados, las correcciones aplicadas y las pruebas realizadas.

---

## 1. Bugs encontrados y corregidos

### Críticos (lógica / condiciones de carrera)

**B1 — Bucles de Memory duplicados tras pause/stop → play (condición de carrera).**
`memoryPause()`/`memoryStop()` ponían `state.active = false` pero no resolvían la promesa de la ronda en curso. El bucle antiguo quedaba suspendido en `await roundPromise` para siempre (fuga del frame async) y, al pulsar Play de nuevo, se arrancaba un **segundo** bucle en paralelo: rondas solapadas, validaciones cruzadas y comportamiento errático.
*Corrección:* token de generación (`loopGen`). Cada start/pause/stop incrementa el token; todo bucle cuyo token ya no coincide se aborta en su siguiente checkpoint (incluso a mitad del reveal `showKeep`). Además, `abortPendingRound()` resuelve siempre la promesa pendiente con `'aborted'`, eliminando la fuga.

**B2 — Estilos inline residuales al salir de Memory.**
`applyAreaHighlight()` aplica `backgroundColor`, `border` y `outline` inline a las 169 celdas, pero al salir del modo Memory nunca se limpiaban: Script Mode quedaba con bordes oscuros, contornos de área y restos visuales pegados.
*Corrección:* nueva función `window.memoryClearVisuals()` que restaura todos los estilos inline (incluidos `position`/`overflow` añadidos por las etiquetas); `script.js` la invoca al salir del modo.

**B3 — `window.eyeActive` nunca existía: el Ojo de Memory no tenía efecto real.**
`memory.js` consultaba `window.eyeActive` para decidir el estilo de las etiquetas, pero esa variable no se asignaba en ninguna parte (`script.js` usa la clase `memory-eye-on` en `<body>`). El estilo "ojo activo" de las etiquetas jamás se aplicaba.
*Corrección:* `isEyeOn()` lee la clase `memory-eye-on` (única fuente de verdad). Además `refreshMemoryEyeMask()` ahora re-estiliza las etiquetas visibles al togglear el Ojo.

**B4 — Máscara del Ojo sin CSS.**
`script.js` añadía la clase `mem-eye-lock` a las celdas del pool, pero `style.css` no tenía ninguna regla para esa clase: la máscara era invisible.
*Corrección:* regla `body.memory-invert td.mem-eye-lock` que ilumina el pool activo.

**B5 — `refreshMemoryLabelStyles` definida DENTRO de `addMemLabel`.**
La función global se (re)definía en cada pintado de etiqueta y no existía hasta el primer label; cualquier llamada previa fallaba silenciosamente.
*Corrección:* extraída al nivel del módulo con un helper compartido `styleMemLabel()` (también elimina la duplicación de la lógica de estilos, que estaba copiada dos veces).

**B6 — Máquina de estados del transporte incoherente.**
Los botones Play/Pause/Stop tenían handlers propios que duplicaban la lógica de `setTransportState` y llamaban a `setTransport()` (solo visual) sin actualizar `transportState`. La variable de estado y la UI podían divergir, y la tabla de transiciones `ALLOWED` se evaluaba desde un estado falso.
*Corrección:* los tres botones llaman únicamente a `setTransportState()`, única vía de transición. Se eliminó toda la lógica duplicada.

**B7 — Icono de error (✗) roto por escape CSS inválido.**
`content: "\\f54C"` produce el texto literal `\f54C` en lugar del glifo de Font Awesome.
*Corrección:* `content: "\f54c"`.

**B8 — `applyMemoryState` pintaba el grid de Memory en Script Mode.**
`applyState()` ejecutaba `applyAreaHighlight()` incondicionalmente (también al cargar la página y con Memory apagado), aplicando estilos inline de Memory sobre Script Mode.
*Corrección:* los estilos de área solo se aplican cuando `memoryModeActive` es true.

**B9 — Display de velocidad desincronizado al entrar en Memory.**
Al entrar en Memory el display seguía mostrando el formato Script (`01H`) hasta que algo llamara a `applyState`.
*Corrección:* la entrada al modo invoca `applyMemoryState()` y sincroniza el display (`05x`).

### UX / responsive

**B10 — Cabecera inaccesible (overflow oculto).**
`body { overflow: hidden }` + centrado flex: en pantallas con menos alto que el panel (~1100 px) la cabecera quedaba cortada por arriba **sin posibilidad de scroll**, dejando inalcanzables el botón Memory, el Ojo y el zen.
*Corrección:* centrado seguro (`#main { margin: auto }`) con `overflow: auto`: idéntico aspecto cuando cabe, scroll cuando no.

**B11 — Grid desbordado en móvil.**
Celdas fijas de 40 px → grid de 545 px en pantallas de 390 px.
*Corrección:* en ≤620 px, `--cell: min(40px, calc((100vw - 18px)/13))`: el grid siempre cabe.

**B12 — Filas de botones desbordadas en móvil (570 px).**
`grid-template-columns: repeat(6, minmax(82px, auto))` forzaba 570 px de ancho mínimo.
*Corrección:* en móvil, columnas fluidas `repeat(6, minmax(0, 1fr))` con padding reducido.

**B13 — Contador de la cabecera desbordado en móvil.**
`#combo-counter` con `white-space: nowrap` imponía ~470 px de ancho mínimo a la cabecera.
*Corrección:* en móvil la cabecera permite salto de línea y el contador se compacta.

**B14 — Drag handle fuera de pantalla / solapado en móvil.**
Posicionado con `left: 380px` absoluto: en móvil quedaba fuera del viewport o encima del botón Memory.
*Corrección:* en ≤620 px fluye en línea dentro de la cabecera (`position: static`).

**B15 — Display de área mostraba `0M`.**
`padStart(2,'0')` sobre `'M'`.
*Corrección:* el área manual se muestra como ` M`.

**B16 — Cursor de edición manual sin estilo.**
La clase `manual-edit` se toggleaba pero no tenía CSS.
*Corrección:* `cursor: pointer` sobre las celdas en edición manual.

### Robustez / validaciones defensivas

**B17 — Sin guardas DOM en memory.js.** `gridTable`, `quizTarget`, botones y displays se usaban sin comprobar existencia: cualquier id ausente rompía todo el módulo. *Corrección:* todas las referencias son opcionales; si falta el grid, el módulo se desactiva con un aviso en consola sin romper Script Mode.

**B18 — Ronda no-secuencial podía quedarse colgada con pool insuficiente.** Si todos los grupos de color quedaban vacíos, `nonEmpty` era `[]` y `roundSeq` quedaba indefinida con `inQuiz=true`. *Corrección:* ronda vacía → se salta sin bloquear el bucle.

**B19 — Desbordes de índice en `applyAreaHighlight`/`memoryGetPool`.** Los límites del área no se recortaban al tamaño real de la matriz. *Corrección:* clamps con `Math.max/Math.min` y comprobación de celda existente.

**B20 — Challenge y Memory simultáneos.** Entrar en Memory con Challenge activo dejaba el botón diana encendido y la clase `quiz-active` puesta. *Corrección:* la entrada a Memory desactiva Challenge limpiamente.

**B21 — Stop en Script no limpiaba errores.** Las marcas `wrong` sobrevivían al Stop. *Corrección:* Stop limpia highlights y errores.

**B22 — `robots.txt` sin salto de línea final y con CRLF mezclado.** Normalizado.

---

## 2. Mejoras y limpieza

- **Lógica duplicada eliminada**: los handlers de Play/Pause/Stop, los dos bloques idénticos de estilos de etiqueta, los cuatro bloques copy-paste de resolución de ronda (ahora `finishRound()`), los SVG on/off duplicados (ahora factories parametrizadas por color) y la tabla `pulseTime` de 21 `case` (ahora una fórmula equivalente).
- **Dos listeners de click sobre el grid unificados en uno** (edición manual + respuesta de ronda), con la prioridad explícita y documentada.
- **Código muerto eliminado** en `script.js`: variables de patrones nunca usadas (`zigMode`, `ringSequence`, `spiralSeq`, `pairStep`, etc.) y referencias a botones sin lógica asociada (los botones de la UI se mantienen intactos para futuras funciones).
- **Estilos inline de `index.html` movidos a `style.css`** (el propio comentario original lo pedía) y el bloque `.zig-bg` incompleto del CSS completado con esas reglas.
- **Constantes nombradas** (`LAST_CLICK_LINGER`, `FADE_MS`, `SPEED_MIN/MAX`, `COUNT_MIN/MAX`, `AREA_VALUES`) en lugar de números mágicos repetidos.
- **Comentarios profesionales** en generación de rondas, validación, gestión de estado, transporte y puntos de integración; sin comentar obviedades.
- **`'use strict'`** en ambos módulos.

## 3. Estructura modular

- `memory.js`: estado cerrado en closure; **API pública explícita** (`memoryState`, `applyMemoryState`, `startMemorySequence`, `memoryPause`, `memoryStop`, `memoryGetPool`, `memoryClearVisuals`, `refreshMemoryLabelStyles`).
- `script.js`: consume solo esa API (con stubs seguros si memory.js no carga) y expone `refreshMemoryEyeMask` + flags de modo.
- `computeMemoryPool` de script.js ahora **delega en `memoryGetPool`** (antes había dos implementaciones paralelas del mismo cálculo que podían divergir), con fallback si el módulo no está.
- Sin variables globales nuevas; las existentes quedan documentadas como contrato entre módulos.

## 4. Patrones (Pair / Zigzag / Rings / Spiral) — implementados

En el zip original los botones de patrones existían en la UI pero sin lógica (placeholders con el comentario "dejamos firma mínima para no romper"). El usuario aportó posteriormente una versión anterior de `script.js` que sí contenía la implementación; esa lógica se ha **portado e integrado** en el refactor con las siguientes garantías adicionales:

- **Zigzag (Z):** serpentea entre dos columnas (o filas) a ±amplitud del centro, ida y vuelta. Subcontroles de amplitud (1–6), dirección (→/←) y orientación (↕/↔) operativos y deshabilitados cuando el patrón está apagado. Con Random activo, cada pasada aleatoriza amplitud/dirección/orientación. La amplitud se acota al grid (`clamp`) para no salirse con amp 6.
- **Rings (◯):** recorre dos vueltas el perímetro de un cuadrado de lado 2–5 colocado al azar, cerrando en la celda inicial; evita repetir el mismo tamaño dos veces seguidas. Con Random activo, baraja todas las combinaciones posibles sin repetición (Fisher–Yates).
- **Spiral:** recorrido completo del grid en espiral horaria fuera→dentro y, al terminar, dentro→fuera, alternando. Stop reinicia la espiral al inicio (fuera→dentro).
- **Pair:** ciclo de 3 ticks — celda base (suited u offsuit según turno) → su par espejo (XYs↔XYo; los pocket pairs son su propio par) → de nuevo la base; alterna el tipo de base en cada ciclo. Respeta el pool de Random/lápiz.
- **Exclusión mutua centralizada** (`togglePattern`): activar un patrón desactiva los demás y detiene el transporte vía `setTransportState(STOP)` (en la versión aportada cada handler repetía la limpieza a mano y usaba el transporte legado).
- **Integración con Memory Mode:** al entrar en Memory los patrones se desactivan y sus botones se deshabilitan (`setPatternButtonsDisabled`); al salir se rehabilitan. Dentro de Memory los handlers ignoran los clicks.
- **Stop:** reinicia el progreso de todos los patrones (`resetPatternProgress`) sin desactivarlos.
- Guardas DOM (`?.`) en todos los accesos; los patrones no rompen si falta algún botón en el HTML.

Cobertura de test: 34 checks automatizados específicos de patrones (activación, subcontroles del zigzag, exclusión mutua, secuencias de cada patrón, reinicio tras Stop, bloqueo en Memory y reactivación al salir), todos en verde, más regresión completa de Script y Memory.

## 5. Riesgos pendientes (conocidos y aceptados)

- Fuentes e iconos vía CDN: sin conexión se usa la fuente del sistema y el icono ✗ de error no se renderiza (no afecta a la funcionalidad).
- La API entre módulos sigue viviendo en `window` por compatibilidad; la migración a ES modules queda descrita en el README como siguiente paso.

## 6. Archivos modificados

| Archivo | Cambio |
|---|---|
| `script.js` | Refactor completo: transporte unificado, limpieza de modo, código muerto fuera, guardas DOM |
| `memory.js` | Refactor completo: token de generación, abort de rondas, fix del Ojo, validaciones defensivas |
| `style.css` | Fix glifo error, responsive móvil (grid/filas/cabecera/handle), centrado seguro, máscara del Ojo, estilos zig movidos |
| `index.html` | Bloque `<style>` inline movido a style.css |
| `robots.txt` | Normalizado |
| `README.md` | Nuevo |
| `AUDITORIA_CORRECCIONES.md` | Nuevo (este documento) |

## 6. Pruebas realizadas

Suite automatizada con Chromium headless (63 comprobaciones, todas en verde) + pasada específica de móvil (390×844):

- **Inicio limpio**: 169 celdas, consola sin errores JS.
- **Script Mode**: click manual (bloquear/desbloquear), contador de combos (parejas/suited/offsuit), play/pause/stop, tick automático, cambio de velocidad, challenge (acierto, fallo, salida limpia), zen (entrada, salida con Esc).
- **Memory no secuencial**: configuración de velocidad/cantidad/área (incluido wrap 6→M→1), selección manual de celdas, ronda completa con validación en orden libre, fallo inmediato al clicar celda incorrecta, encadenado automático de rondas.
- **Memory secuencial**: forward (validación en orden, fallo por orden incorrecto), backward (validación inversa), combinada (4 celdas, 2 conjuntos disjuntos, validación verdes→rojas-invertidas), flechas con bloqueo de la única activa.
- **Robustez**: pause durante el reveal, stop durante el reveal, play posterior sin bucles duplicados (`roundSeq` coherente); cambio de SEC durante ejecución aplazado y aplicado al fin de ronda.
- **Ojo de Memory**: máscara sobre el pool, limpieza al apagar.
- **Cambio de modo**: salida de Memory sin estilos inline residuales, SEC re-deshabilitado, display de velocidad restaurado, Script operativo después.
- **Responsive móvil**: grid, handle y filas dentro del viewport (sin scroll horizontal), click de celda y ronda de Memory completa en móvil.
- **Consola**: cero errores JS en todo el recorrido.
