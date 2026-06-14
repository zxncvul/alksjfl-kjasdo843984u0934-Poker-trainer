# Grid — Entrenador de memoria visual

Aplicación vanilla (HTML/CSS/JS, sin frameworks ni dependencias de build) para entrenar memoria visual sobre un grid 13×13 de rangos. Funciona abriendo `index.html` directamente en el navegador.

## Estructura del proyecto

```
index.html    Estructura del grid (13×13) y panel de controles
style.css     Todos los estilos (tema, layout, estados, responsive)
script.js     Núcleo: Script Mode, transporte, modos zen/challenge, integración Memory
memory.js     Módulo Memory: estado, generación de rondas, secuencias y validación
robots.txt    Bloquea indexación
```

`script.js` y `memory.js` se cargan en ese orden y se comunican exclusivamente a través de una API explícita sobre `window` (ver "Integración futura").

## Funcionamiento general

La aplicación tiene dos modos principales, conmutables con el botón cerebro de la cabecera:

### Script Mode (por defecto)

- **Click en celda**: bloquea/desbloquea (pinta) la celda; el contador de la cabecera suma combos (parejas ×6, suited ×4, offsuit ×12).
- **Play / Pause / Stop**: tick automático que ilumina celdas aleatorias a la velocidad del display (`01H`–`30H`).
- **Random**: filtra el pool del tick (celdas bloqueadas o no bloqueadas según el modo pintar/borrar).
- **Pintar/Borrar**: decide si el tick automático graba o limpia las celdas que ilumina.
- **Invertir (gota)**: invierte la presentación visual de las celdas bloqueadas.
- **Challenge (diana)**: muestra un objetivo en la cabecera; acertar la celda la bloquea y genera otro objetivo, fallar marca la celda en rojo.
- **Ojo**: bloquea/desbloquea todas las celdas a la vez.
- **Zen**: oculta toda la interfaz salvo el grid (se sale con `Esc` o clic en el overlay).
- **Handle (mano)**: arrastra el panel completo por la pantalla.

#### Patrones (Pair / Z / ◯ / Spiral)

Recorridos deterministas que sustituyen al tick aleatorio mientras están activos. Son mutuamente excluyentes (activar uno apaga los demás) y al cambiar de patrón el transporte se detiene: pulsa **Play** para arrancar el recorrido a la velocidad del display.

- **Pair**: ilumina una celda base (suited u offsuit, alternando en cada ciclo), después su par espejo (`XYs ↔ XYo`; los pocket pairs son su propio par) y vuelve a la base. Respeta el filtro de **Random**.
- **Z (Zigzag)**: serpentea entre dos columnas (o filas) situadas a ±amplitud del centro del grid, bajando por un lado y subiendo por el otro. Subcontroles: amplitud **1–6**, dirección **→/←** y orientación **↕/↔** (solo activos con el patrón encendido). Con **Random** activo, cada pasada elige amplitud, dirección y orientación al azar.
- **◯ (Rings)**: recorre dos vueltas el perímetro de un cuadrado de lado 2–5 colocado al azar en el grid. Con **Random** activo, baraja todas las posiciones y tamaños posibles sin repetición.
- **Spiral**: recorre el grid completo en espiral horaria de fuera hacia dentro y, al llegar al centro, de dentro hacia fuera, alternando indefinidamente. **Stop** reinicia la espiral.

Al entrar en Memory Mode los patrones se desactivan y sus botones quedan deshabilitados; al salir vuelven a estar disponibles.

### Memory Mode

Ejercicios de memoria visual sobre el grid. Configuración:

- **Velocidad** (`01x`–`21x`): tiempo de exposición de cada celda (250 ms a 10 s).
- **Cantidad** (1–50): celdas mostradas por ronda.
- **Área** (1–6 o `M`): zona jugable. 1–6 son cuadrados centrados de lado 3–13; `M` permite seleccionar celdas a mano clicando el grid con el juego parado.
- **Ojo**: muestra/oculta la máscara del área activa y cambia el estilo de las etiquetas para hacerlas más legibles.

#### Modo no secuencial (SEC apagado)

Se reparten las celdas de la ronda entre los **colores activos** (verde/azul/rojo/amarillo), se muestran todas a la vez y, tras ocultarse, la cabecera indica un color objetivo: hay que marcar las celdas de ese color **en cualquier orden**. Una celda incorrecta termina la ronda.

#### Modo secuencial (SEC encendido)

Las celdas se revelan **una a una** y el orden importa:

- **→ (forward)**: se valida en el mismo orden del reveal.
- **← (backward)**: se valida en orden **inverso** al reveal.
- **→ + ← (combinada)**: dos conjuntos disjuntos; primero se revelan las verdes y luego las rojas. La respuesta correcta es: verdes en su orden y, a continuación, rojas en orden inverso al mostrado.

Siempre hay al menos una flecha activa (la única encendida queda bloqueada). El cambio SEC↔no-SEC con una ronda en curso se **aplaza** hasta que termina la ronda.

#### Ciclo de ronda

`reveal → ocultar → respuesta del usuario → feedback (verde acierto / rojo fallo) → fade-out → nueva ronda`. El bucle continúa hasta Pause/Stop. Stop además limpia el grid y el indicador de la cabecera.

## Lógica secuencial (resumen técnico)

En `memory.js`:

- `startRound()` baraja el pool del área (`memoryGetPool`), toma `count` celdas y construye `state.roundSeq` con la **respuesta esperada** según el modo (mismo orden, invertida, o concatenación verdes+rojas-invertidas).
- El listener de click del grid valida: en SEC compara contra `roundSeq[0]` (orden estricto); en no-SEC busca pertenencia (orden libre).
- `loop(gen)` encadena rondas. Usa un **token de generación** (`loopGen`): pause/stop/start incrementan el token y cualquier bucle antiguo se aborta en su siguiente checkpoint, lo que impide bucles duplicados y promesas colgadas.

## Configuración rápida

| Control | Rango | Modo |
|---|---|---|
| Velocidad | 01H–30H (1000→200 ms) | Script |
| Velocidad | 01x–21x (250 ms→10 s) | Memory |
| Cantidad | 01–50 | Memory |
| Área | 1–6, M | Memory |
| Orden | →, ←, ambos | Memory SEC |
| Colores | verde/azul/rojo/amarillo | Memory no-SEC |

## Integración futura como módulo

`memory.js` está autocontenido: todo su estado vive en un closure y solo expone esta API (consumida por `script.js`, que también funciona si `memory.js` no carga):

```js
window.memoryState              // estado observable (lectura)
window.applyMemoryState()       // re-render de la UI de Memory
window.startMemorySequence()    // arranca el bucle de rondas
window.memoryPause()            // pausa (aborta la ronda en curso)
window.memoryStop()             // detiene y limpia
window.memoryGetPool()          // pool de celdas del área activa
window.memoryClearVisuals()     // limpia estilos inline al salir del modo
window.refreshMemoryLabelStyles() // re-estiliza etiquetas según el Ojo
```

Y `script.js` expone hacia Memory:

```js
window.refreshMemoryEyeMask()   // recalcula la máscara del Ojo de Memory
window.memoryModeActive         // flag de modo activo
window.disableScriptPaint       // bloquea el pintado de Script
```

Para integrarlo en otra aplicación basta con: (1) montar un grid con celdas `td[data-label]` dentro de `#range-table` (o adaptar los selectores de cabecera de `memory.js`), (2) cargar `memory.js` y (3) conducirlo mediante la API anterior. Como siguiente paso natural, ambos archivos pueden convertirse en ES modules envolviendo cada uno en un factory que reciba sus referencias DOM.

## Requisitos

Ninguno. Navegador moderno (Chrome/Firefox/Safari/Edge). Las fuentes e iconos se cargan desde CDN; sin conexión la app sigue funcionando con fuentes del sistema.
