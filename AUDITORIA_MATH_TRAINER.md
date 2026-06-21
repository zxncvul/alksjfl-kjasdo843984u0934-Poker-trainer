# Auditoría Math Trainer

Fecha: 15 de junio de 2026.

## Alcance

Auditoría exclusiva de `js/modules/math-trainer/`, sus ocho JSON, los 20
presets, estilos específicos, persistencia y conexión mínima con el registro
de módulos. No se modificó la lógica de rangos, Estudio, Entrenamiento,
Simulador, Biblioteca ni Grid Trainer.

Se revisaron Pot Odds, Equity práctica/teórica/inversa, SPR práctico y sus
flashcards, NUMA, Poker Numbs, Random, Mirror, Surges, Fugues, Cipher, keypad,
cronómetro, contrarreloj, repaso de fallos, historial y estadísticas.

## Bugs encontrados y corregidos

1. **Respuesta registrada varias veces.** Durante los 350 ms de feedback,
   Enter o un doble clic podían validar de nuevo el mismo ejercicio, duplicar
   estadísticas y añadir varias copias a la cola de fallos. Cada intento queda
   ahora bloqueado hasta que se presenta la siguiente pregunta.
2. **Respuesta vacía aceptada como cero.** `Number('')` convertía una entrada
   vacía en `0`. Los ejercicios con resultado cero exigen una respuesta real.
3. **Cronómetro perdido al detener o terminar.** El temporizador devolvía cero
   en cuanto dejaba de estar activo. Ahora conserva tiempo transcurrido y
   tiempo restante al parar, finalizar o agotar la contrarreloj.
4. **Configuración viva contaminando el reloj.** La pantalla consultaba los
   toggles actuales aunque la sesión ya tuviera un snapshot. Durante una ronda
   usa exclusivamente la configuración fijada al inicio.
5. **Fase de repaso anulada.** El motor asignaba `review` y acto seguido la
   sustituía por `question`. El ejercicio repetido conserva ahora la fase
   `review` y sus instrucciones correspondientes.
6. **Flashcard repetida ya revelada.** Al volver un fallo a la cola, la vista
   podía reconocer el mismo objeto y mostrar directamente su respuesta. Cada
   intento de flashcard vuelve a comenzar oculto.
7. **Reinicio dependiente de estado residual.** El reinicio reutilizaba de
   forma implícita contexto estadístico y pool original. Ambos se conservan
   ahora explícitamente junto con el snapshot de sesión.
8. **Generación NUMA dependiente de configuración externa.** El límite de
   generación leía el tamaño vivo en lugar del snapshot. Ahora todo el pool se
   construye desde la configuración fijada al comenzar.
9. **Pool NUMA capaz de bloquear la interfaz.** `Todos`, rangos amplios y una
   cadena extrema podían crear un producto cartesiano exponencial o desbordar
   la recursión. La cadena válida queda entre 2 y 12 y los pools completos por
   encima de 50.000 combinaciones se rechazan antes de generar.
10. **Tiempo medio incompleto.** Solo sumaba la duración de aciertos. Ahora
    representa todos los intentos cronometrados; los datos antiguos se migran
    usando los aciertos como contador histórico disponible.

## Lógicas revisadas y descartadas

- Los 20 presets aplican categoría y configuración sin iniciar la sesión.
- Modificar controles después de un preset lo convierte en configuración
  manual sin alterar el snapshot de una sesión ya iniciada.
- Categoría, dificultad y preset estadístico quedan fijados al inicio.
- Los fallos vuelven al final y no se mezclan con la cola principal.
- `Stop`, cambio de categoría, cambio de módulo y desmontaje cancelan timers y
  callbacks diferidos.
- Las flashcards usan `Mostrar respuesta`, `Sabía` y `Repetir`; no muestran
  keypad.
- Fugues bloquea la entrada durante la exposición y la habilita después.
- No existen peticiones JSON en ejecución: los datos están empaquetados para
  uso offline, por lo que no hay errores silenciosos de `fetch`.
- La persistencia solo usa `rangeTrainer.mathTrainer.stats`.

## Archivos modificados

- `js/modules/math-trainer/math-trainer-state.js`
- `js/modules/math-trainer/math-trainer-engine.js`
- `js/modules/math-trainer/math-trainer-timer.js`
- `js/modules/math-trainer/math-trainer-validators.js`
- `js/modules/math-trainer/math-trainer-stats.js`
- `js/modules/math-trainer/math-trainer-ui.js`
- `js/modules/math-trainer/README.md`
- `README_MODULOS.md`
- `AUDITORIA_MATH_TRAINER.md`

No fue necesario modificar `module-registry.js`, `app.js`, datasets, presets
ni estilos.

## Pruebas realizadas

- Sintaxis de los 10 archivos JavaScript del módulo.
- Igualdad exacta entre los ocho JSON originales y el empaquetado offline:
  Pot Odds 240, Equity práctica 224, Equity teoría/inversa 32, SPR práctico
  180 y 30 flashcards SPR.
- Construcción no vacía de los 20 presets.
- Filtros y aplicación declarativa de las cuatro familias.
- Pot Odds con porcentaje, odds, tres calles y conversiones.
- Equity práctica, teoría, ratio, porcentaje e inversa.
- SPR práctico y flashcards de teoría, interpretación, manos y ejemplos.
- NUMA con las cuatro operaciones, Poker Numbs, Random, Mirror, Surges,
  Fugues y Cipher.
- Acierto, error, doble envío, entrada vacía, cola de repaso y finalización.
- Flashcard `Sabía`/`Repetir` y nueva ocultación al repetir.
- Cronómetro detenido, contrarreloj agotada y valor final congelado.
- Estadísticas, precisión, rachas, errores por categoría/dificultad, tiempo
  medio y métricas por preset.
- `localStorage` vacío, corrupto y estructura antigua.
- Montaje, render, keypad de 18 teclas, desmontaje y remontaje sin listeners
  acumulados.
- Rechazo preventivo de pool NUMA exponencial.
- Revisión estática de los breakpoints de escritorio, tableta y móvil, sin
  anchos mínimos activos por debajo de 1024 px.

## Riesgos pendientes

- El navegador integrado no pudo iniciarse por una restricción del entorno de
  Windows. No se realizó una pasada visual automatizada real ni captura móvil;
  responsive y ausencia de overflow se comprobaron de forma estructural.
- Los datos están duplicados entre `data/*.json` y
  `math-trainer-datasets.js`; una actualización futura debe regenerar ambos.
- Para estadísticas antiguas no existía contador de intentos cronometrados.
  La migración conserva el total previo y lo atribuye a los aciertos, que era
  el único denominador histórico fiable.

## Deuda técnica restante

- No existe todavía una suite DOM/browser permanente para Math Trainer.
- El módulo sigue el patrón global `window.RT` del proyecto; reemplazarlo
  exigiría una migración transversal fuera del alcance de esta auditoría.
- La estimación del pool NUMA es deliberadamente conservadora: cuenta
  combinaciones máximas antes de descartar resultados negativos o divisiones
  inválidas.
