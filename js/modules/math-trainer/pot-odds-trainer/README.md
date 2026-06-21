# Pot Odds Trainer

Subseccion independiente del modulo Math Trainer. Migra la logica funcional
del proyecto `pot odds trainer/` sin cargar su HTML, sus fuentes ni sus estilos
globales.

## Funcionalidades migradas

- generacion de proyectos OESD, gutshot, color y proyectos combinados;
- seleccion de outs positivas y negativas;
- separacion entre outs brutas y outs limpias para Pot Odds;
- evaluacion y comparacion de manos;
- Duel Odds con decision CALL/FOLD;
- Identify con validacion de cartas;
- Ranking con tolerancia de `0.5%`;
- calculo de equity para turn y river;
- pot odds, ratio y equity minima;
- Reveal educativo de solucion, proyecto y mano;
- pistas diferenciadas para outs acertadas, erroneas y no seleccionadas;
- explicacion interactiva de cada out correcta, con Turn/River temporal;
- iluminacion exclusiva de las cinco cartas usadas por la mejor jugada;
- separacion visual entre nucleo de la jugada y kickers;
- teclado numerico con porcentaje y ratio;
- countdown, memoria por zonas, bloqueo de board y escenario;
- modos de palos y calles Flop, Turn o mixto;
- modo Laboratorio manual con Hero, Villain, Flop, Turn y River;
- mazo vivo sin duplicados;
- random por seccion y random spot completo;
- export de spot, modo interno, cartas muertas, outs y desarrollo matematico;
- estadisticas independientes.

La navegacion antigua basada en `reload()` y cambios de URL, los listeners
globales y los selectores directos sobre `document` no se migran. El adaptador
controla montaje, desmontaje y teclado dentro del host de Math Trainer.

## Limitaciones pendientes

El editor libre de cartas/enunciado y la copia textual al portapapeles del
proyecto original no se exponen en esta primera integracion. Ambas utilidades
estan fuertemente acopladas al DOM global y a `navigator.clipboard`; se han
dejado fuera para no introducir listeners globales ni permisos laterales en el
Range Trainer. El motor ya concentra la evaluacion necesaria para migrarlas
despues sin duplicar la logica del juego.

## Estructura

```text
pot-odds-trainer/
  pot-odds-trainer-state.js    estado y localStorage
  pot-odds-trainer-engine.js   generacion, evaluator y validacion
  pot-odds-trainer-ui.js       cuatro superficies del workspace
  pot-odds-trainer-adapter.js  pestañas Math/Pot Odds
  README.md
```

## Estado y persistencia

Las rondas usan las fases `ready`, `question`, `correct` y `error`. Cada ronda
se registra una sola vez. Los temporizadores se destruyen al cambiar de
subseccion o salir de Math Trainer.

`Reveal` usa `session.revealDetail` como estado efimero. Al pulsar una out
correcta, el motor crea una copia del board, coloca la carta en Turn o River y
recalcula la mejor mano sin modificar `session.spot`. Ocultar Reveal, avanzar,
detener o desmontar el submodulo elimina por completo ese estado temporal.

El evaluador expone `analyzeBestHand(cards, triggerCard, previousHand)`. Devuelve
`handName`, `usedCards`, `highlightStrong`, `highlightKicker` y `explanation`.
`usedCards` contiene exactamente las cinco cartas de la mano final. Reveal no
ilumina Hero ni el board hasta que se pulsa una out correcta; el boton JUGADA
sigue permitiendo consultar por separado la mejor mano actual.

El motor separa tres modos internos:

- `DRAW_MODE`: Hero no tiene una mano hecha relevante y la decision puede usar
  outs limpias/equity aproximada.
- `MADE_HAND_MODE`: Hero ya tiene doble pareja, trio, escalera, color, full,
  poker o escalera de color. El resultado muestra la mano hecha y las mejoras
  futuras solo como informacion secundaria; no convierte `0 outs` en FOLD.
- `MADE_HAND_BEHIND_MODE`: Hero tiene mano hecha, pero Villain muestra una mano
  superior. En este caso se vuelve a calcular con outs reales de mejora y se
  indica claramente que Hero va por detras.
- `RIVER_FINAL_MODE`: River colocado. No hay equity futura, ni formulas
  `outs x 2` o `outs x 4`; se muestra evaluacion final.

El mazo disponible se calcula siempre como:

```text
availableDeck = deck - Hero - Villain - Flop - Turn - River
```

Ninguna carta muerta puede aparecer como out, Reveal, export, random o carta
seleccionable.

## Outs limpias, marginales y brutas

`effectiveOuts(hero, board, villain)` conserva las outs brutas: cualquier carta
disponible que
mejora tecnicamente la categoria de Hero, ignorando mejoras solo de kicker.

`cleanOuts(hero, board, rawOuts, villain)` aplica la definicion usada por Pot Odds:

- la carta debe formar parte de las cinco cartas finales;
- debe completar gutshot, OESD, flush draw, combo draw, full draw, quads draw,
  escalera, color, full, poker o escalera de color;
- la mano final debe usar materialmente una carta de Hero;
- dobles parejas, parejas, overcards y mejoras de showdown quedan fuera de
  limpias y pasan a marginales.

La regla explicita de flush draw limpio es:

- Hero + board visible tienen exactamente cuatro cartas del mismo palo;
- al menos una de esas cartas del palo pertenece a Hero;
- queda Turn o River por venir;
- las outs son las cartas disponibles de ese palo, excluyendo Hero, Villain,
  Flop, Turn y River.

No se considera flush draw limpio un backdoor de solo tres cartas del palo ni
un board monotono sin carta de ese palo en Hero.

`marginalOuts(hero, board, rawOuts, cleanCards, villain)` conserva mejoras
tecnicas que ayudan en showdown pero no son outs limpias de Pot Odds:
overcards, parejas, dobles parejas y mejoras similares.

Si no hay Villain, `positive` y `negative` son `N/A` y la decision usa solo
`clean/useful`. Si hay Villain, `positive` son las outs limpias que ganan contra
esa mano concreta y `negative` son las limpias que no bastan contra esa mano.
La equity de decision usa `useful`: limpias sin Villain, positivas con Villain.
En `MADE_HAND_MODE`, `useful` queda vacio y el export renombra la seccion como
`Mejoras posibles`. Las brutas se conservan en `spot.outs.raw` para diagnostico
y no se mezclan con el entrenamiento.

## Controles de ayuda

- `OUTS`: muestra exclusivamente las outs limpias, sin iluminar Hero ni board.
- `JUGADA`: muestra las cinco cartas exactas de la mejor mano actual. Las
  cartas principales y los kickers tienen intensidad distinta.
- `Reveal`: muestra las outs limpias y permite pulsarlas para crear un
  Turn/River temporal, recalcular la mano y explicar sus `usedCards`.

OUTS y JUGADA son independientes. Reveal limpia su estado al ocultarse,
avanzar, detener, cambiar de ejercicio o desmontar la subseccion.

## Modo Ejercicio y modo Laboratorio

El submodulo es dual:

- `Ejercicio`: usa `session.spot`, mantiene los cuatro modos originales y
  conserva la validacion de respuestas.
- `Laboratorio`: se muestra cuando `session.spot` es `null`. Usa `state.lab`
  para construir spots manuales sin iniciar una ronda.

Ambos modos comparten la misma plantilla central:

- barra superior con acciones globales (`Random Spot`, `Export`, `Limpiar`,
  `OUTS`, `JUGADA`, `Reveal` y `Siguiente`);
- columna izquierda para spot, cartas y desarrollo matematico;
- columna derecha para equity resumida y teclado; en laboratorio el teclado
  sirve para editar campos tecnicos como Bote y Apuesta;
- bloque inferior amplio para mazo/seleccion de outs;
- barra final de decision con `CALL`, `FOLD` y `Comprobar` o `Comenzar`.

En Laboratorio:

- clic en un hueco selecciona el slot activo;
- el hueco activo queda resaltado de forma sutil para indicar donde caera la
  siguiente carta;
- clic en una carta colocada la elimina;
- clic en una carta del mazo vivo la coloca en el slot activo;
- tras colocar una carta, el slot activo se mantiene para poder probar varias
  cartas sobre la misma posicion sin saltar automaticamente;
- las cartas usadas quedan deshabilitadas en el mazo;
- `Random Spot` rellena Hero, Villain, Flop, Turn y River sin duplicados;
- los dados pequenos rellenan su seccion respetando cartas usadas; si se usa
  `Random Turn` o `Random River` desde un board incompleto, el motor completa
  antes las calles previas necesarias para no crear estados incoherentes;
- Bote y Apuesta son editables y recalculan ratio, equity necesaria, outs,
  accion recomendada y export.
- OUTS, JUGADA y Reveal tambien pueden usarse sin ronda activa sobre el spot
  manual construido en el laboratorio.
- `Export` valida el estado manual antes de calcular. Duplicados, cartas
  invalidas, flop incompleto, turn sin flop completo, river sin turn, river sin
  flop completo, Hero/Villain incompletos o estado vacio se exportan como
  `Entrada invalida controlada` en vez de romper el modulo o calcular con
  basura.

El calculo usa:

```text
Bote final = bote + apuesta + call
Equity necesaria = apuesta / bote final
Ratio = (bote + apuesta) / apuesta
```

El selector `% / Ratio` cambia la lectura tecnica y se incluye en el export.
Cuando se muestra `%`, la UI usa `Equity por outs` para dejar claro que es una
aproximacion por outs limpias/proyecto, no la equity real total de la mano.
Los campos ocultables de ejercicio (`ratio`, `needed`, `turn`, `river`,
`result`) permiten forzar calculo mental sin cambiar la ronda.

El panel inferior conserva el desarrollo completo de Pot Odds, outs limpias,
equity aproximada y decision. Las tarjetas compactas de resumen no sustituyen
ese calculo paso a paso.

La persistencia usa exclusivamente:

```text
rangeTrainer.mathTrainer.potOddsTrainer.stats
```

El objeto guarda rondas, aciertos, fallos, racha actual, mejor racha y errores
por modo. Una entrada vacia, antigua o corrupta se normaliza sin bloquear el
modulo.

## Integracion visual

Los estilos viven bajo clases `pot-odds-trainer-*` dentro de
`css/styles.css`. No se importan `style.css`, `cssImplementar.css` ni las
fuentes del proyecto original. Escritorio usa los paneles izquierdo, central,
derecho e inferior del Range Trainer; en movil las superficies pasan a una
columna sin usar `100vw`, `fixed` ni reglas globales.
