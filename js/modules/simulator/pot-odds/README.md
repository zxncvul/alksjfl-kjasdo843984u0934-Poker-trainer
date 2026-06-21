# Simulator Pot Odds

Modo de mesa de decisión rápida dentro del Simulador. Genera únicamente spots
de **Flop** o **Turn** y pregunta `CALL` o `FOLD`; River queda reservado al
Pot Odds Lab para análisis manual.

## Arquitectura

`pot-odds-simulator-adapter.js` conserva solamente configuración, ronda y
estadísticas del simulador. No implementa evaluador, mazo, outs, equity ni
pot odds. Esas operaciones proceden de `RT.PotOddsTrainerEngine`:

- `generateSimulatorSpot()` genera cartas, street, proyecto y escenario;
- `analyzeSpot()` calcula outs limpias, equity por outs y pot odds;
- `simulatorDecision()` convierte el análisis compartido en CALL/FOLD,
  incluyendo el caso educativo de mano hecha;
- `analyzeBestHand()` y `potMath()` alimentan la vista Lab interna sin crear
  un segundo evaluador ni cálculos duplicados.

Las estadísticas viven separadas en `rt:sim:pot-odds:v1`; las del Pot Odds
Trainer/Lab no se mezclan.

## Puente con Pot Odds Lab

`Abrir Lab` crea una copia privada del spot dentro de `SimulatorPotOdds.state`
y cambia solo la vista interna de `table` a `lab`; la sección superior sigue
siendo Simulador. Reveal, Jugada, outs y Export usan los helpers puros del
motor compartido. Los cambios o revelaciones no escriben sobre la ronda de
mesa ni sobre el estado del Pot Odds Trainer de Math Trainer.

`Volver a mesa` cambia la vista a `table` sin regenerar la ronda: conserva
cartas, respuesta, feedback y estadísticas.

## Presets

Básico flop, Básico turn, OESD, Gutshot, Flush draw, Combo draw, Mano hecha y
Mixto. Los presets ajustan el generador compartido sin alterar Preflop,
Showdown ni Position.

## Prueba aislada

```text
node js/modules/simulator/pot-odds/pot-odds-simulator-test.js
```

La prueba cubre 360 spots para todas las combinaciones de street/tipo,
ausencia de river, cartas únicas, decisión compartida, estadísticas propias y
el viaje Simulator → Lab → Simulator.
