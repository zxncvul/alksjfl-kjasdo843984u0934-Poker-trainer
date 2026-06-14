# Auditoría y correcciones

Fecha: 13 de junio de 2026.

## Alcance

Se revisaron `index.html`, estilos, datos declarativos, motores, persistencia,
vistas modulares, biblioteca, diálogos, workspace y documentación. No se
modificaron rangos ni reglas de entrenamiento.

## Bugs encontrados y corregidos

- El registro de módulos validaba un `id` recortado pero guardaba el original.
  Un módulo con espacios podía quedar registrado con una identidad distinta.
  Registro y consulta usan ahora el mismo identificador normalizado.
- Resetear estadísticas desde configuración o desde el diálogo de estadísticas
  dejaba temporalmente métricas y heatmap antiguos en pantalla. El workspace
  se vuelve a renderizar inmediatamente y elimina cualquier heatmap sin datos.
- La biblioteca permite seleccionar repertorios que el simulador actual aún no
  sabe evaluar (`3Bet vs Open`, `BB vs PFR`, `vs 4Bet`). Antes podían contarse
  como participantes aunque el motor los ignorase. Ahora se filtran de forma
  explícita, se muestra un aviso y el inicio se desactiva si no queda ningún
  contexto compatible.
- En ventanas de portátil, los paneles laterales `sticky` podían superponerse
  a la cabecera de la biblioteca al hacer scroll y bloquear sus botones. En
  escritorio permanecen ahora dentro de su fila alineada y no invaden la
  galería inferior.
- Las acciones masivas `Seleccionar visibles` y `Limpiar` solo repintaban la
  biblioteca. Los paneles de configuración conservaban el recuento anterior
  hasta otro evento. Ahora refrescan el workspace completo y la selección se
  aplica inmediatamente a quizzes y simulador.
- Se eliminó una rama visual inalcanzable del simulador y se corrigieron
  comentarios que todavía describían el layout anterior.

## Validaciones defensivas comprobadas

- Inicio con selección vacía o contextos inválidos en ambos quizzes y simulador.
- Rangos vacíos, acciones desconocidas y preguntas sin respuesta.
- Configuración, favoritos, estadísticas y simulador con JSON corrupto,
  valores parciales y claves antiguas.
- Importación parcial de progreso y saneado de valores fuera de catálogo.
- Selección del simulador formada solo por spots incompatibles y selección
  mixta compatible/incompatible.

## Rendimiento y escalabilidad

- Las rutas de pintado actualizan una celda y sus contadores sin reconstruir
  todo el workspace.
- Los contextos de biblioteca y sus análisis se cachean por fuente.
- Las tarjetas ocultas durante entrenamiento no crean sus 169 miniceldas.
- El ajuste de altura de escritorio se agrupa con `requestAnimationFrame`.
- Filtros de biblioteca y ejercicios se derivan de los datos, sin categorías
  vacías ni listas duplicadas en la UI.

## Pruebas realizadas

- Sintaxis de todos los JavaScript y carga completa de los 22 scripts.
- Validación del motor: 48 contextos, cero rangos solapados o inválidos.
- Todos los contextos generan ejercicio de Quiz Rango y preguntas quirúrgicas.
- Sesiones del simulador OR, defensa, spot completo y campaña.
- Arranque limpio, Estudio, ambos quizzes, Simulador y cambios rápidos de modo.
- Biblioteca, filtros automáticos, multiselección y scroll horizontal.
- Visor de rangos, estadísticas, falladas, reset y configuración.
- Ocultación de respuestas: miniaturas visibles en configuración y ocultas
  solo al iniciar; matriz principal limpia antes de responder.
- Tarjetas uniformes: `150 x 198 px` en escritorio y `126 x 172 px` en móvil.
- Layout 1440x900: panel izquierdo, matriz y panel derecho entre `y=62` y
  `y=782`, exactamente 720 px de alto.
- Portátil 1366x650: matriz sin compresión vertical ni overflow horizontal.
- Móvil 390x844: ancho de documento 390 px, sin desbordamiento horizontal.
- Consola del navegador sin errores en los recorridos finales.

## Archivos modificados en esta auditoría

- `js/core/module-registry.js`
- `js/ui/app.js`
- `js/ui/dialogs.js`
- `js/ui/range-gallery.js`
- `js/ui/simulator-ui.js`
- `css/styles.css`
- `README_ARQUITECTURA.md`
- `README_MODULOS.md`
- `README_RANGOS.md`
- `README_SIMULADOR.md`
- `README_CONFIG.md`
- `AUDITORIA_CORRECCIONES.md`

## Riesgos y deuda técnica restante

- `simulator-ui.js` sigue siendo el archivo visual más grande. Conviene dividir
  configuración, visor y paneles cuando exista una suite permanente de tests.
- En estudio/configuración cada tarjeta visible usa una mini matriz de 169
  nodos. Con cientos de repertorios será recomendable virtualizar la fila o
  renderizar miniaturas en canvas.
- Los identificadores de falladas del simulador no incluyen `source`. Antes de
  soportar varias fuentes activas habrá que versionar ese formato.
- Los ejercicios de rango completo alimentan estadísticas y heatmap, pero no
  tienen todavía un flujo propio de repaso persistente.
- No existe una suite automatizada dentro del repositorio. La regresión se
  ejecuta externamente contra la aplicación servida.

## Mejora de simulador y filtros - 13 de junio de 2026

- Mesa rectangular compacta, centrada y sin doble franja.
- Cartas, stack, posición, ciegas, bote, spot y línea integrados en la mesa.
- Opción persistente para ocultar nombres de posición.
- Filtros de cartas en dos filas; familias y heatmap en una.
- Toggles IP/OOP derivados de `relative`.
- Dealing Coverage: todo, rango, frontera, falladas y personalizado.
- Precisión e intentos por mano visibles en heatmap.
- Peso adaptativo persistente para errores históricos, limitado y opcional.
