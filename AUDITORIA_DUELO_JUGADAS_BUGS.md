# Auditoria Duel de Jugadas

Fecha: 2026-06-18

Alcance: solo Duelo de Jugadas / Showdown dentro del Simulador:

- `js/modules/simulator/duel-hands/duel-hands-engine.js`
- `js/modules/simulator/duel-hands/duel-hands-adapter.js`
- `js/modules/simulator/duel-hands/duel-hands-test.js`
- estilos directos `.sim-duel-*` en `css/styles.css`

No se redisenio el layout, no se tocaron otros modulos funcionales y no se creo proyecto nuevo.

## Semantica final de matriz

Cada fila representa una jugada:

- Escalera de color
- Poker
- Full house
- Color
- Escalera
- Trio
- Doble pareja
- Pareja
- Carta alta
- Split

Estados:

- `H`: la jugada puede aparecer en Hero y no en Villain.
- `V`: la jugada puede aparecer en Villain y no en Hero.
- `All`: la jugada puede aparecer en cualquiera de los dos.
- `X`: la jugada queda excluida para ambos.

Los pesos manuales ya no se editan. El adaptador reparte internamente el peso de cada grupo activo para mantener densidad automatica. El test valida la regla estricta H/V/All/X por resultado generado.

## Bugs encontrados

1. `X` podia quedar como una configuracion imposible.
   Si todas las jugadas posibles de Hero o Villain quedaban excluidas, el motor podia caer en fallback aleatorio y romper la expectativa de X.

2. El motor rellenaba internamente un lado vacio con todas las jugadas.
   Esto hacia que una matriz corrupta o imposible pudiera terminar ignorando exclusiones.

3. El export mostraba los estados como nombres internos (`hero`, `villain`, `both`) en vez de la semantica visible del usuario (`H`, `V`, `All`, `X`).

4. La columna X tenia un hover azul heredado de los radios normales.
   Visualmente podia parecer parte del grupo azul aunque fuese exclusion.

5. El arnes anterior validaba 100 manos y no cubria configuraciones aleatorias de matriz ni la regla "cambio aplica en el siguiente duelo".

## Bugs corregidos

- Se elimino el relleno automatico de `heroAllowed` / `villainAllowed` en el motor.
- Se marca una matriz imposible cuando Hero o Villain no tienen ninguna jugada permitida.
- El adaptador bloquea cambios de matriz que dejarian a Hero o Villain sin ninguna jugada posible.
- `X` desactiva H/V/All y H/V/All desactivan X por fila.
- El export ahora refleja la matriz como `H`, `V`, `All` o `X`.
- La columna X usa rojo oscuro en reposo y rojo activo cuando esta seleccionada.
- El hover de X permanece en la familia roja y no vuelve a azul.
- El test automatizado ahora ejecuta 10.000 iteraciones consecutivas limpias.

## Metodo de testeo

Comando ejecutado:

```powershell
& 'C:\Users\adria\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' js/modules/simulator/duel-hands/duel-hands-test.js
```

Resultado:

```json
{
  "ok": true,
  "result": {
    "smokeStreak": 25,
    "smokeAttempts": 25,
    "stressStreak": 10000,
    "stressIterations": 10000,
    "handsPlayed": 50
  }
}
```

## Validacion automatica

En cada iteracion del stress test:

- Se muta una matriz aleatoria H/V/All/X valida.
- Se cambia posicion y modo de color sin regenerar la mano actual.
- Se confirma que la mano actual no cambia hasta `nextRound`.
- Se genera el siguiente duelo.
- Se valida Hero con 2 cartas.
- Se valida Villain con 2 cartas.
- Se valida board con 5 cartas.
- Se valida ausencia de duplicados.
- Se valida Hero/Villain en posiciones distintas.
- Se recalcula ranking de Hero y Villain desde cartas reales.
- Se recalcula ganador y split desde el evaluador.
- Se valida que Hero no recibe jugadas `V` o `X`.
- Se valida que Villain no recibe jugadas `H` o `X`.
- Se valida que `Split` no aparece si esta en `X`.
- Se valida export contra estado interno.
- Se valida Reveal/Jugada con cartas usadas reales.

## Rankings cubiertos

Casos fijos:

- Carta alta
- Pareja
- Doble pareja
- Trio
- Escalera
- Escalera baja A2345
- Color
- Full house
- Poker
- Escalera de color
- Kicker
- Split por board

## Export

El export se valida contra:

- Modo activo
- Matriz de jugadas H/V/All/X
- Posiciones Hero/Villain
- Dealer/SB/BB
- Cartas Hero
- Cartas Villain
- Board
- Ganador
- Split
- Jugada Hero
- Jugada Villain
- Cartas usadas reales
- Respuesta pendiente o respondida

Ejemplo parcial validado:

```txt
DUELO DE JUGADAS
Modo activo: both
Densidad de jugadas:
- Carta alta: X
- Pareja: H
- Doble pareja: V
- Trio: All
```

## Archivos modificados

- `js/modules/simulator/duel-hands/duel-hands-engine.js`
- `js/modules/simulator/duel-hands/duel-hands-adapter.js`
- `js/modules/simulator/duel-hands/duel-hands-test.js`
- `css/styles.css`
- `AUDITORIA_DUELO_JUGADAS_BUGS.md`

## Riesgos pendientes

- La prueba automatizada valida logica, estado y export desde los modulos reales, pero no sustituye una inspeccion visual manual completa en navegador.
- Las configuraciones extremadamente restrictivas pueden requerir fallback de densidad si se usan como objetivo exacto; el stress test valida la regla fuerte de permisos H/V/All/X.
- El evaluador productivo se usa tambien para recalcular manos aleatorias; por eso se mantienen casos fijos de ranking como control independiente.
