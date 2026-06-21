# Duelo de Jugadas

Submodulo interno del Simulador. Integra la logica util del proyecto original `Duelo de jugadas` sin migrar su layout, estilos globales, PWA ni dependencias de DOM global.

## Estructura

- `duel-hands-engine.js`: mazo, generacion de rondas, evaluador de mejores 5 cartas, comparacion Hero/Villain y etiquetas de cartas.
- `duel-hands-state.js`: estado de ronda, configuracion y estadisticas en `rangeTrainer.simulator.duelHands.stats`.
- `duel-hands-adapter.js`: acciones publicas del modulo, respuesta, reveal, nueva ronda y persistencia de estadisticas.
- `duel-hands-ui.js`: renderizado dentro del layout del Simulador y paneles laterales.

## Flujo

1. El usuario entra en Simulador y selecciona `Duelo de Jugadas`.
2. El modulo genera Hero, Villain y board completo con posiciones distintas.
3. El usuario responde `Hero`, `Split` o `Villain`.
4. El feedback registra estadisticas propias y puede revelar la jugada ganadora.
5. `Jugada Hero`, `Jugada Villain` y `Reveal ganador` resaltan solo las cinco cartas exactas de la mejor mano evaluada.

## Configuracion

El panel izquierdo permite fijar posicion de Hero y Villain o dejarlas en aleatorio. Si ambas posiciones fijas coinciden, la otra se devuelve a aleatorio para evitar estados invalidos.

La mesa reutiliza las mismas chapas visuales del Simulador preflop:
`sim-seat-marker is-dealer`, `sim-seat-marker is-blind` y `sim-blind-chip`.
Dealer se coloca en BTN, SB en SB y BB en BB en cada nuevo duelo.

### Matriz de jugadas

El panel izquierdo usa una unica matriz por jugada. Cada fila tiene:

- `H`: esa jugada puede aparecer en Hero, pero no en Villain.
- `V`: esa jugada puede aparecer en Villain, pero no en Hero.
- `All`: esa jugada puede aparecer en cualquiera de los dos.
- `X`: esa jugada queda excluida para ambos.

La seleccion es exclusiva por fila:

- `X` limpia `H`, `V` y `All`.
- `H`, `V` o `All` limpian `X`.
- Al seleccionar `H`, `V` o `All`, esa opcion queda como unica activa en la fila.

Tipos disponibles:

`Carta alta`, `Pareja`, `Doble pareja`, `Trio`, `Escalera`, `Color`,
`Full house`, `Poker`, `Escalera de color` y `Split`.

Los pesos ya no se editan manualmente. El modulo reparte automaticamente la
densidad efectiva entre las jugadas permitidas para cada lado. Si Hero tiene
cuatro jugadas disponibles, Hero reparte entre esas cuatro; si Villain tiene
siete, Villain reparte entre esas siete. El panel derecho muestra esa
distribucion preparada para el siguiente duelo.

Los cambios de matriz, posicion o color no modifican la mano actual. Se aplican
al siguiente `Nuevo duelo` o al avance automatico tras responder. Si no se
encuentra un spot tras `MAX_ATTEMPTS`, se genera un duelo aleatorio valido y se
muestra un aviso suave.

Cuando todas las jugadas estan en `All`, la distribucion se considera neutra y
no fuerza una jugada rara concreta. En cuanto se cambia un lado o se excluye una
fila, el generador aplica la densidad elegida.

### Presets de dificultad

En modo Showdown la galeria inferior de rangos se sustituye por `Dificultad
Showdown`, una galeria horizontal de 10 tarjetas:

1. Basico
2. Parejas
3. Escalera
4. Color
5. Full
6. Monstruos
7. Completo
8. Splits
9. Atencion
10. Infierno

Cada tarjeta carga una matriz `H / V / All / X` y un modo de color. La tarjeta
activa queda marcada. Si el usuario modifica manualmente la matriz o el modo de
color despues de cargarla, se marca como `Editado`.

Los presets son configuracion pendiente: al pulsar una tarjeta no cambia la mano
que ya esta sobre la mesa. La nueva matriz y el nuevo modo de color se usan en
el siguiente duelo. Preflop y el resto del simulador mantienen la biblioteca de
rangos normal.

## Mesa, reveal y color

Hero permanece en un asiento fisico fijo. Lo que rota es la etiqueta de posicion
asignada a cada asiento. Los asientos que no son Hero ni Villain se muestran
apagados como jugadores foldeados, reutilizando `sim-seat.is-folded`.

Los botones `Jugada Hero`, `Jugada Villain` y `Reveal ganador` se sustituyen por
ojos integrados en la mesa:

- ojo de Hero: muestra/oculta la jugada de Hero, sus cartas usadas y el nombre de la jugada bajo el asiento.
- ojo de Villain: muestra/oculta la jugada de Villain, sus cartas usadas y el nombre de la jugada bajo el asiento.
- ojo del board: muestra/oculta la jugada ganadora.

El boton `Export` se mantiene como accion discreta dentro de la mesa.

El selector `Color cartas` solo afecta a la representacion visual:

- `Monocolor`: todas las cartas en azul.
- `4 colores`: picas azul, corazones rojo, diamantes verde y treboles blanco.
- `Bicolor`: corazones/diamantes rojos y picas/treboles azules.
- `Random atencion`: cada carta recibe rojo, blanco, verde o azul al generarse la mano.

El modo random guarda el color visual en la ronda, por lo que no cambia en cada render.
Cambiar el modo de color mientras hay una mano en curso solo prepara la proxima
mano; la mano actual conserva el modo y colores con los que fue generada.

## Export

El boton `Export` copia texto plano con modo activo, preset/color de la mano,
preset/color pendiente, densidad de la mano, posiciones, Dealer/SB/BB, cartas,
board, ganador, jugadas, tipos, cartas usadas, valores de desempate, respuesta
del usuario, split y explicacion. Funciona antes o despues de responder y tras
Reveal/Jugada.

## Estadisticas

Prefijo propio:

`rangeTrainer.simulator.duelHands.*`

Actualmente se guarda un objeto en:

`rangeTrainer.simulator.duelHands.stats`

Incluye manos jugadas, aciertos, errores, precision, racha, mejor racha, errores por tipo de mano y errores por posicion. En el panel derecho se presenta en formato compacto de 3 columnas.

## Origen migrado

Del proyecto original se conserva:

- generacion de duelo Hero vs Villain
- board completo
- eleccion de ganador Hero / Villain / Split
- evaluacion de manos
- comparacion de jugadas
- reveal de cartas usadas
- feedback correcto/incorrecto
- filtro ponderado de jugadas dentro de la integracion nativa

No se migran estilos globales, service worker, manifest, reload por querystring ni pantallas fullscreen antiguas.
