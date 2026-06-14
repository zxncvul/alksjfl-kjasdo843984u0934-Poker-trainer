# Simulador preflop 6-max

El simulador es un modo del mismo workspace profesional. Durante la
configuración conserva la matriz como referencia y reparte sus controles
entre los dos paneles laterales. Al iniciar, la mesa 6-max sustituye a la
matriz en la zona central. La biblioteca permanece debajo en ambos estados.
No existe una aplicación separada ni un layout alternativo.

Durante la configuración, las miniaturas de la biblioteca son visibles para
elegir repertorios. Al iniciar la simulación se ocultan para que no sirvan de
chuleta. El botón **"Ver rangos"** mantiene el visor modal detallado del
contexto actual.

Todas las decisiones se evalúan **exclusivamente con los rangos guardados en
los repertorios** (`js/data/ranges.data.js` y `js/data/ranges-extra.data.js`).
No existe ninguna tabla de respuestas paralela.

El motor actual sabe evaluar los nodos `OR` y `VS3BET`. Si la selección de la
biblioteca contiene otros spots, la configuración los marca como no
compatibles y no los cuenta silenciosamente. Una selección formada solo por
spots incompatibles desactiva el inicio; una selección mixta entrena únicamente
los contextos compatibles.

Código: `js/core/simulator-engine.js` (motor + modelo de mesa, sin DOM),
`js/ui/simulator-ui.js` (configuración y coordinación visual) y
`js/ui/simulator/table-view.js` (mesa, cartas y línea de acción).
`app.js` solo delega.

## 0. La mesa

Mesa sobria, sin fieltro ni avatares: una superficie compacta, rectangular
con esquinas amplias y un único borde claro. Los seis asientos integran
posición, stack, ciega/dealer, apuesta, estado y dos cartas: reales para Hero
y reversos técnicos para rivales activos. El centro contiene spot, bote,
cinco cartas comunitarias ocultas y línea de acción. La mesa es autosuficiente:
la antigua tarjeta externa de mano/contexto se eliminó.

Sizings fijos documentados en el motor:
open 2.5bb; 3bet 8bb (9bb desde ciegas, que jugarán OOP); 4bet 22bb; stacks
de 100bb. El bote suma las apuestas visibles, ciegas muertas incluidas. La
mesa se calcula al vuelo con `RT.Simulator.tableState()`: el motor no guarda
estado de mesa aparte.

La vista puede configurarse como **Hero abajo**, rotando visualmente las
posiciones alrededor del jugador como en una mesa online, o como
**posiciones fijas**, manteniendo cada posición en el mismo lugar.
La opción global **Mostrar nombres de posición** oculta UTG/MP/CO/BTN/SB/BB
sin retirar stacks, cartas, ciegas ni acciones.
La opción **Mesa limpia** elimina además los textos secundarios de asiento,
manteniendo la información operativa imprescindible.

### Flujo de feedback

- Un acierto se registra y avanza inmediatamente, sin panel ni mensaje.
- Un error abre una bandeja inferior estable con la acción elegida, la acción
  correcta y una miniatura del rango correcto.
- La revisión dura cuatro segundos y después avanza automáticamente.
- **Pausar revisión** congela el tiempo restante; **Continuar** lo reanuda.
- La bandeja tiene altura reservada para que la mesa no cambie de posición.

Las ciegas se representan como fichas colocadas junto al asiento: una ficha
pequeña para SB y dos fichas mayores para BB, sin etiquetas textuales.

---

## 1. Cómo funciona

Una **situación** es una mano repartida en una posición. Según el tipo de
entrenamiento, la situación tiene una o dos decisiones encadenadas:

```
Mano: AQs · Posición: UTG
1ª decisión — primera acción:        Fold / Open Raise
   (si la mano abre y toca 3bet…)
2ª decisión — CO te hace 3bet:       Fold / Call / 4Bet
```

La secuencia avanza por la **línea correcta**: si la mano está en el rango
de open, puede llegar un 3bet aunque el usuario haya respondido mal (el
fallo ya quedó registrado). Así el entrenamiento sigue siendo realista.

Modos:

- **Realista** — rota las posiciones en orden de mesa (UTG → MP → CO → BTN →
  SB), una mano en cada posición, y vuelve a empezar. Como asientos reales.
  (El antiguo nombre "lineal" sigue aceptándose por compatibilidad.)
- **Aleatorio** — posición y mano al azar dentro de lo configurado.
- **Campaña** — bloques ordenados de 10 manos por posición y resumen final;
  el total lo fija la campaña (10 × posiciones entrenables).

Frecuencia de 3bet (spot completo): off / baja (~25%) / media (~50%) / alta
(~75%) / **realista**. La realista usa una probabilidad aproximada por
posición del abridor (UTG 20% → SB 50%: los opens tardíos reciben más 3bet)
con dos cortafuegos para que la sesión se sienta natural: nunca más de 3
secuencias con 3bet seguidas y, tras 6 opens sin ninguno, se fuerza uno.

**Dealing Coverage** controla el dominio de reparto:

- **Todo**: matriz completa, respetando el nodo de decisión.
- **Solo rango**: únicamente manos activas del rango actual.
- **Solo frontera**: manos cuya vecina ortogonal cambia de clasificación.
- **Solo falladas**: manos con errores históricos; se desactiva sin datos.
- **Personalizado**: filtro pintado en una mini-matriz.

La frontera se calcula desde los propios rangos, no desde listas paralelas.
Si **Priorizar manos falladas** está activo, los errores históricos reciben
mayor peso en sesiones futuras. El peso combina número de fallos y precisión,
tiene límite y conserva la ponderación base por combos. Los datos viven en
`rt:stats:v1`.

## 2. Cómo usa los rangos existentes

| Decisión | Contexto consultado | Respuesta correcta |
|---|---|---|
| Open raise | `{spot:'OR', hero}` | `'OR'` si la mano está en `getRange(ctx,'OR')`; si no, `'FOLD'` |
| Defensa vs 3bet | `{spot:'VS3BET', hero, relative}` | `getActionMap(ctx)[mano]`; si la mano no está en ningún rango **o** está en el rango FOLD explícito → `'FOLD'` |

**El fold se infiere, nunca se inventa**: solo dentro de un contexto cuyo
rango de defensa existe. Si el contexto no tiene rangos, la situación
directamente no se genera (ver §4).

En "solo defensa vs 3bet", la mano inicial se reparte **del propio rango OR
del héroe**: al nodo de 3bet solo llegan manos que abriste. El reparto se
pondera por número de combos (una pareja sale con peso 6, una suited 4, una
offsuit 12), como en la realidad.

## 3. Cómo se elige el villano y la posición relativa

El villano del 3bet debe actuar **después** del héroe en el orden preflop.
La posición relativa postflop del héroe se deriva de los asientos:

- Villano en ciegas (SB/BB) → héroe **IP**… salvo héroe SB vs BB → **OOP**.
- Villano con asiento posterior no-ciega → héroe **OOP**.

Solo se eligen villanos cuyo contexto `VS3BET` exista en los datos
(`isContextComplete` + `availableActions`). Con los rangos actuales:
BTN solo recibe 3bet de las ciegas (juega IP, que es justo el único rango
BTN que existe) y SB solo de BB (OOP). La coherencia entre mesa y datos se
valida en los tests.

## 4. Validación: situaciones imposibles

Antes de generar nada, el motor calcula las **posiciones entrenables**:

- "Solo open raise" / "Spot completo" → posiciones con rango OR.
- "Solo defensa" → posiciones con al menos un villano válido.
- Se intersecan con las posiciones elegidas por el usuario.

Si el resultado es vacío, `Simulator.start()` devuelve `false` y la UI
muestra un aviso sobrio. Un 3bet solo aparece si hay rango de defensa para
ese héroe; si no lo hay, la mano simplemente termina tras el open.

## 5. Filtro de manos iniciales

Desplegable "Filtro de manos iniciales" → **Editar en la matriz**: la matriz
se vuelve interactiva y se pintan las manos que pueden repartirse (no es la
respuesta, solo el reparto). Botones: usar filtro sí/no, toda la matriz,
limpiar, y "usar rango OR de las posiciones elegidas".

El filtro se interseca con la base del nodo (en defensa, con el rango OR).
La intersección es estricta: nunca se reparte una mano fuera del filtro. Si
ninguna posición elegida conserva manos posibles, la sesión no comienza y
la interfaz muestra un aviso para revisar la configuración.
Persiste en localStorage (`rt:simfilter:v1`), igual que la configuración del
simulador (`rt:sim:v1`). Dealing Coverage persiste dentro de esa configuración.

Las claves antiguas `rt:sim` y `rt:simfilter` se migran automáticamente. Una
configuración corrupta o parcial nunca impide arrancar la aplicación.

## 6. Feedback y estadísticas

Tras decidir: tarjeta compacta con CORRECTO/INCORRECTO, tu acción (si
difiere), la correcta y el rango usado, más **Siguiente** y **Repetir
situación** cuando hay fallo (la repetición cuenta como decisión nueva:
acertarla salda deuda en falladas). "Ver rango" abre el visor con la mano
marcada sobre el mapa de acciones. Historial breve de las últimas
decisiones; al terminar, resumen con %, errores por posición y por acción.

Atajos de teclado: `1-4` decidir · `N` siguiente · `R` repetir tras fallo ·
`V` ver rangos · `Esc` cierra el visor.

Cada decisión se registra en `RT.Stats` (el mismo sistema que los quizzes)
con qid reconstruible:

```
sim@{spot}/{hero}/{relative|-}/{mano}     p.ej.  sim@VS3BET/CO/OOP/KQs
```

Las falladas del simulador se repasan desde el propio simulador ("Repasar
falladas del simulador", que reconstruye cada decisión desde su qid). El
repaso de falladas del quiz quirúrgico las excluye: misma base de datos,
cero duplicación, cada modo repasa lo suyo.

## 7. Cómo añadir spots compatibles

El simulador no tiene respuestas propias: añadir contextos `OR` o `VS3BET`
amplía automáticamente sus situaciones. Ejemplo copiable: para que MP pueda
recibir 3bet de BTN (héroe OOP) basta con que exista el rango:

```js
// js/data/ranges.data.js
RT.defineRange({
  source: 'david-diaz',
  spot: 'VS3BET',
  hero: 'MP',
  relative: 'OOP',
  action: 'CALL',          // y/o '4BET', 'FOLD'
  hands: ['QQ', 'JJ', 'AQs', /* … */]
});
```

A partir de ahí, `validVillains('MP')` incluirá BTN automáticamente y el
simulador empezará a generar esa secuencia. Un spot nuevo queda disponible en
estudio y quizzes al declararlo. Para que participe también en el simulador
hace falta implementar su secuencia en el motor; hasta entonces la UI lo
identifica como no compatible.

**Qué necesita una situación para generarse**:

1. Rango OR del héroe (para open raise / spot completo), o
2. contexto VS3BET completo (`hero` + `relative`) con al menos una acción,
3. y al menos una mano posible tras aplicar el filtro (con fallback a la base).

## 8. Extensiones previstas

Cold call, squeeze, defensa BB vs steal, limp/iso, stacks y sizings están
**documentados pero no implementados**: ver `README_SIMULADOR_FUTURO.md`
(hoja de ruta y formato de escenarios manuales).
