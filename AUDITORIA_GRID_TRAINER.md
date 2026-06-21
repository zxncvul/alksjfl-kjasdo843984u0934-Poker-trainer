# Auditoría del Grid Trainer

## Alcance

Auditoría limitada al módulo `js/modules/grid-trainer/`, sus estilos
específicos, el registro modular y la conexión imprescindible con la app.
No se modificaron Estudio, Entrenamiento, Simulador, Biblioteca ni rangos.

## Bugs encontrados y corregidos

- Estadísticas corruptas: valores no numéricos, buckets nulos o strings podían
  producir `NaN`, datos falsos y errores al registrar un fallo.
- Memory visual: con `Cantidad` menor que el número de colores activos se
  mostraban más celdas que las solicitadas.
- Pintar todo: el estado del botón quedaba activo después de quitar una celda
  manualmente o mediante reproducción.
- Challenge: el contador visible de ronda permanecía en cero.
- Challenge con patrón: ambos funcionaban simultáneamente, pero la galería solo
  mostraba Challenge como activo.
- SEC pendiente: pausar, detener, cambiar de modo o pedir la ronda siguiente
  podía dejar el cambio pendiente bloqueado.
- Estadística de tamaño manual: un pool de cinco celdas se registraba como
  `5x5`; ahora se registra como `5 manual`.
- Contexto estadístico de Memory: cambiar parámetros durante una ronda podía
  atribuir el resultado a la configuración posterior.
- Challenge aceptaba clics durante los 500 ms de feedback. Un doble clic podía
  registrar un acierto y un fallo, o dos fallos, en una sola interacción.
- Pause no cancelaba el temporizador de feedback de Challenge y podía volver a
  dejar el módulo en `answering` mientras el transporte seguía pausado.
- Siguiente durante el feedback podía conservar un temporizador antiguo y
  mostrar instrucciones para un objetivo distinto del objetivo vigente.
- Challenge con Random + Pintar y las 169 celdas seleccionadas generaba el
  objetivo `–`, creando una ronda imposible.
- La dificultad de Script/Challenge dependía de parámetros internos de Memory,
  aunque no hubiera cambiado ningún ajuste de Grid.
- Seleccionar Challenge o un patrón desde la galería con el transporte parado
  podía dejar un objetivo válido en fase `configuring`.

## Lógicas poco sólidas detectadas

- La persistencia confiaba directamente en la estructura de `localStorage`.
- `allLocked` duplicaba información de `locked` sin resincronizarse.
- El reparto visual usaba un mínimo de una celda por color y rompía el total.
- El cambio SEC pendiente solo se resolvía al finalizar una ronda o con Stop.
- Challenge y patrón son capas compatibles, pero la UI los trataba como una
  selección exclusiva.
- La fase de feedback de Challenge no actuaba como bloqueo de entrada.
- El temporizador de feedback no estaba cancelado por todas las transiciones.
- La dificultad estadística tenía una dependencia oculta entre modos.

## Correcciones realizadas

- Normalización estricta de contadores, rachas y buckets estadísticos.
- Valores de contexto seguros al registrar errores.
- Reparto de `Cantidad` como total real entre colores activos.
- Sincronización automática de Pintar todo con el conjunto seleccionado.
- Incremento de ronda al generar un objetivo Challenge.
- Marcado simultáneo de Challenge y patrón en la galería.
- Aplicación segura del cambio SEC pendiente tras abortar una ronda.
- Snapshot del contexto estadístico al iniciar cada ronda Memory.
- Etiqueta correcta para el tamaño de pools manuales.
- Bloqueo de clics de Challenge fuera de la fase `answering`.
- Cancelación del feedback al pausar o solicitar una ronda nueva.
- Limpieza de marcas erróneas antes de un nuevo objetivo manual.
- Fallback seguro a celdas válidas si el filtro Random agota el pool.
- Dificultad de Script/Challenge derivada únicamente de `Velocidad Script`.
- Challenge permanece en `answering` al activarlo o combinarlo con un patrón
  desde la galería mientras el transporte está parado.

## Regresiones descartadas

- Grid libre conserva selección manual, Pintar todo y reproducción automática.
- Challenge y Challenge + Pair/Zigzag/Rings/Spiral avanzan simultáneamente.
- Memory visual conserva cantidad total con uno o varios colores.
- SEC directa, inversa y combinada mantienen orden y validación estricta.
- Pause, Stop, Siguiente y cambios Grid/Memory no dejan rondas o timers vivos.
- El ojo cambia icono, estado y visibilidad de etiquetas en Grid y Memory.
- Los cambios de configuración durante Memory no alteran el contexto
  estadístico capturado al inicio de la ronda.

## Archivos modificados

- `js/modules/grid-trainer/grid-trainer-engine.js`
- `js/modules/grid-trainer/grid-trainer-ui.js`
- `js/modules/grid-trainer/grid-trainer-stats.js`
- `js/modules/grid-trainer/README.md`
- `README_MODULOS.md`
- `AUDITORIA_GRID_TRAINER.md`

## Pruebas realizadas

- Apertura y montaje de Grid Trainer.
- Grid libre: selección y Pintar todo.
- Challenge: acierto, fallo, siguiente objetivo y contador de ronda.
- Challenge simultáneo con Pair, Zigzag, Rings y Spiral.
- Cambio de velocidad durante Play.
- Cambio Grid/Memory durante Play sin doble ejecución.
- Memory visual con uno y cuatro colores.
- Secuencia directa, inversa y combinada.
- Acierto, fallo, Pause, Stop y Siguiente.
- Cambio de velocidad, cantidad y área.
- Área manual y enfoque de área.
- Ojo de etiquetas en Grid y Memory.
- SEC pendiente seguido de Pause.
- Doble clic y spam de clics durante feedback de Challenge.
- Pause y Siguiente durante feedback de Challenge.
- Challenge con Random + Pintar y pool agotado.
- Selección de Challenge y patrones desde la galería con transporte parado.
- Inicio, Pause y Stop repetidos; espera posterior para detectar timers vivos.
- Cambio rápido Grid/Memory y salida/reentrada repetida del módulo.
- Cambio de parámetros durante una ronda y verificación del snapshot.
- Pool insuficiente en secuencia combinada.
- `localStorage` vacío, JSON inválido y estructura de versión anterior.
- Estadísticas, precisión, rachas y buckets de error.
- Persistencia con estructura corrupta y JSON inválido.
- Escritorio `1440x900`.
- Móvil `390x844`, sin overflow horizontal global.
- Consola sin errores.

## Riesgos pendientes

- La secuencia combinada conserva el comportamiento original: si el área no
  contiene suficientes celdas disjuntas, completa desde el grid total.
- No existe un selector independiente de dificultad en la referencia. La
  dificultad estadística continúa siendo derivada: velocidad en
  Script/Challenge y configuración de ronda en Memory.
- Si el navegador bloquea o agota `localStorage`, el módulo sigue funcionando,
  pero las estadísticas de esa sesión no pueden persistirse.

## Deuda técnica restante

- La UI reconstruye las cuatro zonas en cada notificación, también durante los
  ticks rápidos de Script. A la velocidad máxima probada no produjo errores ni
  bloqueos, pero podría optimizarse con renderizado parcial en una futura tarea.
- El estado conserva `invertLock` y su comando de motor por compatibilidad,
  aunque el botón se retiró de la interfaz por decisión de producto.
- Los estilos específicos incluyen una capa antigua seguida de overrides
  actuales. Consolidarla sería un refactor visual, no una corrección segura
  para esta auditoría.
