# Auditoría extrema · Pot Odds Simulador

Fecha: 2026-06-21  
Alcance: únicamente `Simulator > Pot Odds`. El Pot Odds Trainer del Math Trainer no se ha modificado.

## Resultado

Estado final: **estable para la lógica cubierta**. La batería extrema completó 10.000 combinaciones completas sin excepciones ni estados corruptos.

| Área | Pruebas reales | Resultado |
| --- | ---: | --- |
| Configuraciones combinadas | 10.000 | OK |
| Spots validados | 20.000 | OK |
| Cálculos Pot Odds | 20.000 | OK |
| Exports tabla + Lab | 20.000 | OK |
| Reveal de mesa | 10.000 | OK |
| Abrir Lab / volver a mesa | 10.000 | OK |
| Next / limpieza de estado | 10.000 | OK |
| Modos de board | 10.000 | OK |
| Render representativo del panel | 250 | OK |
| Temporizador real de 5s | 1 | OK |

Tiempo de la batería extrema: **119.656 ms**.

## Análisis inicial y riesgos detectados

1. El Export de mesa no incluía la configuración activa, por lo que no podía reconstruirse del todo un caso auditado.
2. Abrir el Lab no detenía el temporizador ni las ocultaciones de memoria pendientes; un timeout podía resolver la mesa mientras el usuario analizaba el spot congelado.
3. El selector `Pair` podía combinar un proyecto con un board de tres cartas del mismo rango al reasignar palos. El spot terminaba accidentalmente como mano hecha.
4. Las pruebas visuales puras no deben ejecutarse 10.000 veces: el coste es de DOM/pintado, no de lógica. Se cubren mediante 250 renders representativos y la batería de estado de 10.000 iteraciones.

## Correcciones realizadas

### Export auditable

El Export de mesa incorpora ahora tipo de board, bloqueos, tiempo, memoria, zonas, randomización, cálculos ocultos y `Call amount`, además del spot y de los cálculos ya existentes.

### Limpieza al abrir Lab

`Abrir Lab` detiene el countdown, elimina temporizadores de memoria y limpia las zonas ocultas. El Lab conserva el spot original y `Volver a mesa` no altera sus cartas, bote, apuesta ni respuesta previa.

### Generación segura por palos

Antes de publicar un spot con Rainbow, Pair o Mono, el adaptador descarta candidatos incompatibles con ese patrón de palos o que convierten un proyecto en mano hecha. Se reintenta hasta generar una muestra válida, sin duplicar cartas. Si un filtro fuese excepcionalmente restrictivo, conserva un fallback válido en vez de crear un estado corrupto.

## Runner creado

Archivo: `js/modules/simulator/pot-odds/pot-odds-simulator-extreme-test.js`.

No usa dependencias externas ni clicks del navegador. Carga el motor y el adaptador en un contexto aislado, recorre configuraciones y valida cartas, matemáticas, texto Export, estado del Lab y limpieza entre rondas.

La combinación aleatoria cubre:

- Flop, Turn y calle mixta; nunca se genera river como decisión.
- Tiempo 0/5/10/15/30 y memoria 0/1/2/5/10.
- Zonas Hero/Flop/Turn/River y sus combinaciones.
- Randomización Off/Rnd 1/Rnd 2/Rnd 3.
- Board Random/Rainbow/Pair/Mono.
- Bloqueos de board, escenario, ambos o ninguno.
- Ocultación de Ratio, Necesaria, Turn, River y Resultado.
- Respuesta correcta y respuesta contraria, cuando la ronda es un proyecto.

Las manos hechas quedan correctamente fuera de la puntuación CALL/FOLD; por ello el contador final de respuestas fue 9.664, no 10.000.

## Validaciones aplicadas por spot

- Hero contiene dos cartas; Villain es vacío o tiene dos cartas.
- Board de tres cartas en flop y cuatro en turn; nunca cinco.
- No existen cartas repetidas.
- `finalPot = pot + bet + bet`.
- `needed = bet / finalPot * 100`.
- Proyecto: equity de flop con x4 y turn con x2; decisión igual a la calculada por Pot Odds.
- Mano hecha: decisión `N/A` y cero outs útiles de proyecto.
- Export coincide con street, Hero, board, bote, call amount y configuración activa.

## Lab interno

En 10.000 ciclos se comprobó que recibe Hero, board, bote y apuesta del spot congelado; OUTS, JUGADA, Reveal y Export se ejecutan sin contaminar la mesa; `Volver a mesa` conserva la misma referencia de ronda. El runner usa un estado de Lab aislado, por lo que no navega ni escribe en la sesión del Math Trainer.

## Regresiones

- Pot Odds básico: 360 spots + Lab interno, OK.
- Position Trainer: 108 casos de mesa y 5.000 iteraciones, OK.
- Showdown / Duelo de jugadas: stress de 10.000 iteraciones, OK.
- Sintaxis comprobada para adaptador, UI y runner extremo.

## Responsive, UI y consola

El panel nuevo se renderizó 250 veces con el árbol de controles compacto: selects para configuración, checks para multi-select y botones solamente para acciones. La automatización visual con navegador local no estuvo disponible por una restricción del entorno, por lo que no se reclama una inspección de píxeles real. No hubo excepciones en Node ni durante los renderizados representativos.

## Riesgos pendientes

1. Conviene hacer una pasada visual manual en navegador real para comprobar el panel en anchos móvil/escritorio; la lógica y estructura responsive están cubiertas, pero no la captura visual por la restricción indicada.
2. La expiración real se verificó a 5 segundos. Las duraciones 10/15/30 se validaron en 10.000 cambios de configuración, inicio y limpieza, sin esperar físicamente cada duración para no convertir la auditoría en una ejecución de muchas horas.
3. `Mono` no puede coexistir matemáticamente con un board que necesita repetir el mismo rango tres veces; el generador lo evita para los proyectos. Las manos hechas se mantienen como una categoría separada y no se fuerzan a un patrón imposible.

## Archivos modificados

- `js/modules/simulator/pot-odds/pot-odds-simulator-adapter.js`
- `js/modules/simulator/pot-odds/pot-odds-simulator-extreme-test.js`
- `AUDITORIA_EXTREMA_POT_ODDS_SIMULADOR.md`
