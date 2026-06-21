# Auditoria funcional Position Trainer

Fecha: 2026-06-18

## Alcance

Se reviso exclusivamente el modulo `js/modules/simulator/position-trainer/`
y la regresion directa de `js/modules/simulator/duel-hands/`.

## Bugs encontrados

- `seatIp` e `ipToSeat` podian generar una tercera persona viva cuando el rival hacia `CALL`, porque el motor anadia calls extra de forma probabilistica.
- Los asientos activos seguian habilitados aunque el modo se respondiera con botones de posicion o con `IP/OOP`.
- En modos que ocultaban posiciones aparecian etiquetas internas `S1`, `S2`, etc. como sustituto visual.
- `Repetir` generaba una ronda nueva en vez de conservar la misma ronda.
- La barra de acciones global podia mostrar respuestas o `Siguiente` en fases que no correspondian.
- El panel de posiciones activas se veia completamente apagado porque se renderizaba como solo lectura deshabilitada.

## Bugs corregidos

- IP/OOP ahora genera siempre heads-up postflop: un OR, un unico rival con `CALL` o `3BET`, resto `FOLD`.
- Se anadio una politica clara de controles en el motor:
  - `seatCanAnswer(round, seat)`
  - `positionCanAnswer(round, label)`
  - `ipCanAnswer(round)`
  - `liveSeats(round)`
- La UI usa esa politica para habilitar solo las respuestas validas de cada modo.
- Los asientos visuales ya no registran clicks de respuesta si el modo no lo permite.
- Las etiquetas `S1/S2` se eliminaron de los modos ocultos; durante revision se muestran las posiciones reales.
- `Repetir` conserva la ronda actual y reinicia seleccion, feedback y temporizador.
- La barra de acciones global solo muestra `IP/OOP` durante pregunta IP/OOP y `Repetir/Siguiente` durante feedback.
- El test automatico ahora simula respuestas correctas, incorrectas y repeticion de ronda.

## Checklist funcional

- `Posicion -> Asiento`: asientos activos habilitados, posiciones e IP/OOP deshabilitados.
- `Asiento -> Posicion`: mesa visual, botones de posiciones activas habilitados.
- `Asiento -> IP/OOP`: mesa visual, solo `IP` y `OOP` habilitados.
- `IP/OOP -> Asiento`: solo los dos jugadores vivos pueden responder.
- `Siguiente`: genera ronda nueva.
- `Repetir`: conserva la ronda actual.
- `Timeout`: entra en feedback sin bloquear el modulo.
- `2-10 jugadores`: roles BTN/SB/BB y etiquetas validadas.
- `Nomenclatura A/B`: tablas validadas.
- `Heads-up`: BTN/SB y BB validados.

## Pruebas realizadas

- Sintaxis:
  - `position-trainer-engine.js`
  - `position-trainer-adapter.js`
  - `position-trainer-ui.js`
  - `position-trainer-test.js`
- Position Trainer:
  - `node js/modules/simulator/position-trainer/position-trainer-test.js 5000`
  - Resultado: OK, 108 casos de tabla y 5000 iteraciones.
- Showdown:
  - `node js/modules/simulator/duel-hands/duel-hands-test.js`
  - Resultado: OK, 25 smoke, 10000 stress.

## Validacion manual

Se intento abrir el navegador integrado para una comprobacion visual, pero el
entorno devolvio un bloqueo de permisos de Windows al iniciar el proceso del
navegador. No se maquilla como prueba manual completa. La validacion funcional
queda cubierta por los tests programaticos descritos arriba.

## Riesgos pendientes

- Falta una pasada visual real en navegador para confirmar sensacion de click,
contraste de estados y tactilidad en movil.
- El test automatico cubre logica y flujo, pero no detecta overlays visuales
de CSS que solo se vean en navegador.

## Ronda UX 2026-06-19

### Bugs y fricciones detectadas

- La mesa mostraba demasiada informacion auxiliar durante la pregunta.
- El timer estaba en la zona inferior y competia con los botones de respuesta.
- Los asientos mostraban nombres de posicion y podian regalar parte del ejercicio.
- El panel izquierdo duplicaba los modos que ya existen en la galeria inferior.
- El asistente de Position heredaba atajos genericos del Simulador/Preflop.
- El feedback de error quedaba pesado y exigia accion manual para avanzar.

### Correcciones aplicadas

- Timer movido a una linea azul dentro de la mesa, con anchura decreciente.
- Preguntas compactas: `¿UTG?`, `¿Posicion?`, `¿IP u OOP?`, `¿IP?`/`¿OOP?`.
- Eliminados nombre de modo y detalle bajo la pregunta central.
- Eliminados nombres de posicion visibles en asientos.
- Resaltado mas intenso para asiento objetivo, asientos clicables y botones de respuesta.
- Panel izquierdo reducido a configuracion; los modos se eligen desde tarjetas inferiores.
- Posiciones activas movidas al panel derecho.
- Estadisticas del panel derecho limitadas a Position Trainer.
- Asistente de Position sin bloque de atajos genericos.
- En acierto se avanza automaticamente; en error aparece aviso rojo temporal con pausa, repetir y siguiente.

### Validacion requerida

- Repetir test automatico de Position con 5000 iteraciones.
- Repetir regresion de Showdown.
- Validacion visual real pendiente si el entorno permite navegador.

## Ronda visual 2026-06-19

### Bugs encontrados

- Los asientos ocultaban por completo posicion, stack, cartas y accion; al
  alternar ejercicios quedaban como tarjetas vacias y rompian la lectura de
  mesa.
- El board no estaba representado durante el ejercicio, con lo que la mesa no
  conservaba la misma estructura visual que Preflop y Showdown.
- El temporizador era una barra que podia confundirse con el borde de la mesa
  y no entregaba una lectura inmediata del tiempo restante.
- Position seguia mostrando el bloque generico de resumen y atajos del
  Simulador, aunque no es parte del entrenamiento de posiciones.
- La copia de las tarjetas inferiores era demasiado descriptiva del modulo y
  poco accionable para empezar cada ejercicio.

### Correcciones aplicadas

- Cada asiento conserva una tarjeta completa y estable: `--`, `-- bb`, dos
  cartas boca abajo y `--` como accion neutra. Las acciones reales solo se
  muestran en los ejercicios IP/OOP cuando son necesarias.
- Se anadio un board central de cinco cartas boca abajo.
- La pregunta se compacto y se coloca sobre el board; el temporizador ahora es
  una cuenta atras en segundos, sin barra ni solapamiento con los asientos.
- Se elimino el resumen/atajos general del panel izquierdo al abrir Position.
- Las cuatro tarjetas inferiores indican de forma breve que debe hacer el
  usuario en cada modo.
- Se ajustaron los asientos y cartas ocultas para mantener proporciones en
  mesas de hasta 10 jugadores y en movil.

### Pruebas de esta ronda

- Sintaxis correcta de `app.js`, `simulator-ui.js` y todos los archivos de
  Position Trainer.
- `position-trainer-test.js 5000`: 108 combinaciones de mesa y 5000 rondas
  aleatorias sin fallo.
- Regresion de Showdown: 25 smoke y 10000 stress sin fallo.
- Se intento una comprobacion visual automatizada. El navegador integrado fue
  bloqueado por permisos de Windows y el runtime local no dispone de la
  dependencia completa para Playwright; no se declara como validacion visual
  completa.

### Riesgos pendientes

- Falta una pasada manual en navegador para validar el espaciado exacto de las
  tarjetas de 8 a 10 jugadores en pantalla pequena.
- La auditoria automatica valida reglas, timer, respuestas y transiciones; no
  puede detectar por si sola un solapamiento puramente visual de CSS.

## Modos adicionales 2026-06-19

### Funcionalidad incorporada

- `Orden de accion`: pregunta por cualquier lugar de la secuencia de accion y
  alterna aleatoriamente entre preflop y postflop. En postflop genera un flop
  real de tres cartas distintas.
- `Mixto`: en cada ronda nueva elige al azar uno de los cinco ejercicios
  disponibles. Repetir conserva la ronda para revisar el error.

Se anadio `Jugadores por ronda -> Aleatorio`. Al activarlo, cada ronda elige
de 2 a 10 jugadores antes de construir roles, etiquetas, orden y respuestas.

El ejercicio existente `IP/OOP -> Asiento` ya cubre quien queda con posicion
despues de una apertura, por lo que se mantiene como ejercicio independiente y
tambien entra en Mixto.

### Validacion adicional

- La prueba automatica ahora verifica el orden de accion preflop/postflop,
  flops sin cartas repetidas, jugadores aleatorios y 300 rondas mixtas antes
  de la bateria principal.
- La bateria de 10000 iteraciones confirma que Mixto recorre los seis modos,
  conserva origen de configuracion, no habilita respuestas incorrectas y no
  rompe los roles BTN/SB/BB ni IP/OOP.

## Auditoria final 2026-06-20

### Bug corregido

- El control de duracion no permitia desactivar el temporizador. Aunque se
  ajustara a otro valor, cada pregunta seguia armando un `setInterval` y podia
  terminar por tiempo. Se incorpora `timerEnabled`, persistido de forma
  compatible con configuraciones previas: las configuraciones antiguas quedan
  activadas por defecto.

### Comportamiento verificado

- Apagar el timer cancela el intervalo, deja la ronda y la seleccion intactas
  y elimina la cuenta atras visible.
- Encenderlo durante una pregunta conserva la misma ronda y reinicia la cuenta
  con la duracion configurada.
- Ajustar la duracion con el timer apagado no lo reactiva.
- `Stop`, respuesta correcta, error, repeticion, siguiente y cambio de ronda
  siguen liberando los timers antes de crear otro.
- Las tarjetas de ejercicios usan altura fija y resumen estable para evitar
  saltos cuando cambia la cantidad de jugadores o el estado del temporizador.

### Rendimiento y mantenimiento

- El motor genera una ronda en tiempo lineal respecto a un maximo de diez
  asientos. El mazo de flop se baraja solo para `Orden de accion` postflop.
- La UI recrea solo la mesa y el panel de Position cuando cambia el estado;
  cada asiento pertenece al render vigente y no acumula listeners.
- No se han detectado intervalos vivos tras `Stop` ni transiciones que dejen
  una ronda en fase `question` sin politica de respuesta valida en la bateria
  automatica.

### Pruebas ejecutadas

- Sintaxis: `position-trainer-state.js`, `position-trainer-adapter.js`,
  `position-trainer-ui.js` y `position-trainer-test.js` sin errores.
- Bateria Position: 108 combinaciones de mesa y 50.000 rondas aleatorias,
  incluidas nomenclaturas A/B, 2-10 jugadores, jugadores aleatorios, todos
  los modos, respuestas correctas/incorrectas y ciclo de feedback.
- Timer: activacion, desactivacion, cambio de duracion, continuidad de ronda,
  `Stop` y ausencia de intervalos/timeouts huerfanos comprobados dentro del
  test.
- Persistencia: una configuracion o estadistica local corrupta vuelve a los
  valores seguros por defecto, sin impedir iniciar una ronda.
- Regresion directa de Showdown: smoke de 25 manos y stress de 10.000 manos
  superados.

La bateria de 50.000 rondas completo en aproximadamente 2,4 segundos en el
runtime local, sin crecimiento de timers ni degradacion apreciable. El coste
del motor queda acotado por un maximo de diez asientos y un flop de tres cartas.

La comprobacion visual real sigue pendiente del navegador, bloqueado en este
entorno por permisos de Windows.
