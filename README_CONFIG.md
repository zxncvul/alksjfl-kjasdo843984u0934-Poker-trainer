# Configuración, progreso y entrenamiento dirigido

Guía de las funciones de personalización y seguimiento de Range Trainer.
Todo se guarda **localmente en tu navegador** (localStorage): no hay cuentas
ni servidores, y la app sigue funcionando 100% offline abriendo `index.html`.

| Qué | Dónde se guarda |
|---|---|
| Configuración | `rt:settings:v1` |
| Estadísticas e historial de falladas | `rt:stats:v1` |
| Favoritos | `rt:favs:v1` |
| Configuración del simulador | `rt:sim:v1` |
| Filtro de manos iniciales del simulador | `rt:simfilter:v1` |

Si el navegador bloquea localStorage (modo privado), todo funciona igual
durante la sesión; simplemente no persiste al cerrar.

Las claves antiguas sin sufijo de versión (`rt:settings`, `rt:stats`,
`rt:favs`, `rt:sim`, `rt:simfilter`) se migran automáticamente cuando no
existe todavía su equivalente `:v1`. Los JSON corruptos, campos parciales y
valores fuera de catálogo se sustituyen por valores seguros.

---

## 1. Configuración (botón ⚙ de la cabecera)

### Quiz

| Opción | Efecto |
|---|---|
| Incluir Fold | En el quiz de rango completo, también hay que pintar las manos de Fold. |
| Mostrar solución al fallar | Al comprobar con fallos, la matriz salta directamente a la vista "Respuesta correcta". |
| Auto avanzar al acertar | Tras una respuesta perfecta, pasa sola a la siguiente pregunta. |
| Tiempo de auto avance | 1–5 segundos de espera antes de avanzar. |
| Repetir hasta dominar | Cada pregunta fallada vuelve al final de la cola hasta que la aciertes. |
| Dificultad por defecto | Preselecciona los niveles del quiz quirúrgico de forma acumulativa: básica = nivel 1, media = 1‑2, avanzada = 1‑2‑3. Siempre puedes ajustar los niveles a mano en "Qué entrenar". |
| Preguntas por sesión | Límite por defecto de cada sesión (sin límite / 10 / 25 / 50). |

### Visual

| Opción | Efecto |
|---|---|
| Tamaño de la matriz | Pequeña / media / grande (máximo en escritorio; en móvil siempre ocupa el ancho). |
| Tamaño del texto | Escala toda la tipografía. |
| Modo móvil compacto | Menos márgenes y paneles más bajos: más pantalla para la matriz. Pensado para estudiar largo desde el móvil. |
| Mostrar combos / porcentajes | Contadores de la barra de estado y de los selectores de acción. |
| Mostrar nombres de posición | Muestra u oculta UTG/MP/CO/BTN/SB/BB en la mesa sin ocultar stacks, cartas, ciegas ni acciones. |
| Mesa limpia | Oculta posiciones y textos secundarios de los asientos; conserva cartas, stacks, pot, marcadores y secuencia de acciones. |
| Intensidad de colores | Alta / media / suave: cuánto saturan los colores de acción la matriz. |
| Tema | Oscuro táctico (por defecto) o alto contraste (negro puro, bordes y texto más duros). |

### Entrenamiento

Mezclar **spots / posiciones / acciones**: encendidos, las preguntas van
barajadas (recomendado). Con un toggle apagado, la sesión se **agrupa** por
esa dimensión: por ejemplo, con "Mezclar posiciones" apagado harás todas las
preguntas de UTG seguidas, luego MP, etc.

**Priorizar manos falladas** eleva de forma limitada la frecuencia de manos
con errores históricos en el simulador. No cambia la respuesta correcta ni
el rango: solo pondera el reparto futuro.

### Datos

- **Exportar progreso (JSON)** — descarga un único archivo con configuración,
  estadísticas y favoritos.
- **Importar progreso** — restaura ese archivo (en otro navegador u
  ordenador, por ejemplo).
- **Resetear estadísticas / configuración** — con confirmación previa. El
  reset de configuración también restaura el simulador y limpia su filtro
  personalizado. El reset de estadísticas actualiza inmediatamente paneles,
  heatmap y métricas abiertas.

Ejemplo del archivo exportado:

```json
{
  "version": 1,
  "exportedAt": "2026-06-11T18:00:00.000Z",
  "settings": { "includeFold": false, "theme": "tactico", ... },
  "favorites": [ { "spot": "VS3BET", "hero": "CO", "relative": "IP" } ],
  "stats": { "totals": { "ok": 41, "fail": 9 }, ... }
}
```

---

## 1b. Modo analista (escritorio) y modo compacto (móvil)

La interfaz se comporta distinto según el ancho de pantalla:

- **Escritorio (≥1024px)** — estación de análisis: tres columnas
  (controles · zona central · panel de análisis) con todo visible de un
  vistazo. En estudio y quizzes la zona central contiene la matriz. Durante
  una simulación activa contiene la mesa 6-max. La configuración del
  simulador se distribuye entre los paneles laterales para evitar contenido
  duplicado debajo del workspace. El visor de rangos incluye el desglose de
  combos por acción.
- **Formato compacto (<1024px)** — una columna, desplegables plegables,
  barra inferior fija. La información detallada vive dentro del panel.

La biblioteca horizontal permanece disponible en todos los modos. Sus
miniaturas son visibles durante la configuración y al terminar una sesión;
se ocultan mientras hay un ejercicio activo o en revisión para evitar que
funcionen como chuleta.

Cuando existen contextos con metadato `relative`, la biblioteca muestra solo
dos toggles: **IP** y **OOP**. Ambos activos muestran todo; uno solo filtra
esa relativa. Los contextos sin dimensión relativa, como OR, permanecen
visibles. Los toggles no aparecen si los datos no contienen IP/OOP.

En Estudio, los filtros de carta usan una rejilla máxima de dos filas. Las
familias usan abreviaturas (`S`, `O`, `PP`, `SC`) en una sola línea y el
heatmap usa `Off`, `Fallos` y `Acierto`, también en una línea.

La UI compartida se divide entre `js/ui/components.js`,
`js/ui/range-gallery.js`, `js/ui/dialogs.js`, las vistas completas de
`js/ui/study/` y `js/ui/quizzes/`, y los componentes del simulador.
`app.js` coordina estas piezas y no contiene la implementación completa de
ningún modo.

Las métricas de sesión (tiempos incluidos) son de presentación: se calculan
en memoria durante la sesión y no alteran la lógica de entrenamiento ni el
formato del progreso guardado.

## 2. Estadísticas (botón 📊 de la cabecera)

Cada vez que compruebas una respuesta en cualquier quiz se registra el
resultado. El panel muestra:

- **Porcentaje global** con aciertos y errores totales.
- Desglose con barra de progreso **por posición, acción, spot y categoría**.
- **Mejor y peor categoría** y **spot más fuerte y más débil** (solo cuando
  hay un mínimo de 3 respuestas en esa dimensión, para no sacar conclusiones
  de una sola pregunta).

En el quiz de rango completo el resultado se registra por contexto (sin
acción ni categoría); en el quirúrgico se registra todo.

---

## 3. Heatmap de progreso (modo Estudio)

En el panel de Estudio, sección "Heatmap de progreso" (aparece en cuanto hay
datos):

- **Más falladas** — calor rojo sobre las manos que más veces han estado
  implicadas en un fallo (faltantes, sobrantes o con acción equivocada).
- **Más dominadas** — calor verde sobre las manos respondidas bien y sin
  tropiezos.

Todo directamente sobre la matriz, sin listas. La intensidad es relativa a
tu mano más fallada/dominada.

Cada celda con historial muestra también precisión e intentos en formato
compacto (`63% · 27`) y expone el detalle completo al pasar el cursor.

---

## 4. Favoritos

En Estudio, la estrella (☆/★) junto al contexto marca esa combinación
**spot + posición + relativa** como favorita. Los favoritos aparecen:

- En Estudio → "Favoritos": saltar a ese contexto con un clic.
- En ambos quizzes → "Entrenar un favorito": arranca una sesión limitada a
  ese contexto con un clic.

---

## 5. Sistema de repaso de falladas

> Las decisiones falladas en el **Simulador** se guardan en el mismo índice
> pero se repasan desde el propio simulador (sección "Repasar falladas del
> simulador"); el repaso del quiz quirúrgico las excluye automáticamente.


Cada pregunta fallada queda en un índice persistente con su contador y su
fecha. **Acertarla resta deuda**: cuando la aciertas tantas veces como la
fallaste, sale del índice.

Los ejercicios de rango completo alimentan estadísticas y heatmaps, pero no
se mezclan en el repaso de preguntas quirúrgicas.

En el quiz quirúrgico, la sección "Repasar falladas" ofrece:

- **Recientes** — las últimas falladas (máximo 25).
- **Más falladas** — ordenadas por número de fallos.
- **Por posición / por acción** — solo aparecen los botones de dimensiones
  con falladas guardadas.

El repaso se reconstruye sobre el pool completo de preguntas (ignora los
filtros que tengas configurados), así una fallada de ayer aparece aunque hoy
estés entrenando otra cosa. Combínalo con "Repetir hasta dominar" para
machacar fallos.

---

## 6. Sesiones rápidas

En la pantalla inicial de cada quiz:

- Quiz quirúrgico: **10 / 25 / 50 preguntas**.
- Quiz de rango completo: **5 / 10 ejercicios**.

Un clic y dentro, usando los filtros que tengas configurados en ese momento.

---

## 7. Atajos de teclado

| Tecla | Acción |
|---|---|
| `Enter` | Comprobar la respuesta actual |
| `N` | Siguiente pregunta (en revisión) |
| `R` | Reintentar (revisión) / borrar lo pintado (quiz de rango en curso) |
| `Esc` | Cerrar el modal abierto |
| `1`‑`4` | Seleccionar pincel de acción (quiz de rango) |

Los atajos se ignoran mientras escribes en un campo o hay un select activo.
