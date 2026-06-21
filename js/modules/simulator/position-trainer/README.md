# Position Trainer

Modulo interno del Simulador para entrenar posiciones, asientos e IP/OOP sin
mezclar logica con Preflop ni Showdown.

## Estructura

- `position-trainer-engine.js`: genera mesas de 2 a 10 jugadores, roles
  BTN/SB/BB, etiquetas de posicion y preguntas.
- `position-trainer-state.js`: configuracion, ronda activa, estadisticas y
  persistencia local.
- `position-trainer-adapter.js`: ciclo de ronda, temporizador, respuestas y
  feedback.
- `position-trainer-ui.js`: panel izquierdo, mesa, panel derecho, acciones
  moviles y galeria inferior.
- `position-trainer-test.js`: prueba programatica del motor y del flujo.

## Modos

- `posToSeat`: se pregunta una posicion y se pulsa el asiento correcto.
- `seatToPos`: se marca un asiento y se responde que posicion ocupa.
- `seatIp`: se genera una accion preflop y se decide si el asiento marcado
  queda IP u OOP.
- `ipToSeat`: se pregunta quien queda IP u OOP y se pulsa su asiento.
- `actionOrder`: pregunta de forma aleatoria quien habla primero, segundo,
  tercero o en cualquier otro lugar de la secuencia. Alterna entre preflop y
  postflop; en postflop muestra un flop real de tres cartas distintas.
- `mixed`: conserva la configuracion de jugadores, nomenclatura y timer, pero
  elige aleatoriamente uno de los cinco ejercicios en cada ronda nueva.

## Flujo

- En `posToSeat`, todos los asientos activos sirven como respuesta.
- En `seatToPos`, los botones de las posiciones activas son la respuesta.
- En `seatIp`, se responde con `IP` u `OOP`.
- En `ipToSeat`, solo se puede pulsar uno de los dos jugadores que siguen en
  la accion preflop.
- En `actionOrder`, todos los asientos activos pueden ser respuesta. La
  pregunta indica el numero de orden y la mesa alterna de calle en cada ronda.
- En `mixed`, una repeticion conserva el mismo ejercicio para poder revisarlo;
  `Siguiente` y los aciertos generan una nueva ronda con otro ejercicio al
  azar.
- Una respuesta correcta abre automaticamente la siguiente ronda. Un error o
  un tiempo agotado muestra feedback rojo temporal, con pausa, repeticion y
  salto rapido.

La mesa mantiene las tarjetas de asiento completas para que la geometria sea
estable: datos neutros con guiones, dos cartas boca abajo por asiento y un
board central oculto. Se ocultan los nombres de posicion para no regalar la
respuesta. La pregunta usa copia minima y se muestra sobre el board; el tiempo
restante es una cuenta atras discreta en segundos.

## Configuracion y datos

- Jugadores: de 2 a 10.
- Jugadores por ronda: fijos o aleatorios; en aleatorio el motor elige de 2 a
  10 asientos nuevos en cada ronda y es compatible con todos los ejercicios.
- Nomenclatura A: usa `MP` y `MP+1`.
- Nomenclatura B: usa `LJ` y `HJ`.
- Timer: de 3 a 60 segundos por pregunta, activable o desactivable sin
  reemplazar la ronda en curso. Al reactivarlo, el contador reinicia con la
  duracion configurada.

Los cambios de modo, jugadores o nomenclatura preparan una ronda nueva. Las
estadisticas se guardan separadas con el prefijo:

`rangeTrainer.simulator.positionTrainer.*`

## Integracion

Position Trainer se selecciona desde las tabs internas del Simulador:

`Preflop | Showdown | Position`

La galeria inferior muestra los seis modos como accesos rapidos. El panel
izquierdo queda reservado para configuracion avanzada; el panel derecho
muestra las posiciones activas y las estadisticas propias de Position.

## Validacion

```bash
node js/modules/simulator/position-trainer/position-trainer-test.js 5000
```

El test comprueba roles, asientos activos, politicas de controles por modo,
respuestas correctas e incorrectas, feedback, repeticion, IP/OOP, heads-up,
mesas de 2 a 10 jugadores, timer activado/desactivado y liberacion de timers.
