# Grid Trainer

Integración modular de `grid_final (1)` dentro del workspace de Range Trainer.
La referencia funcional son sus archivos `index.html`, `script.js`,
`memory.js` y `style.css`.

## Funcionalidades migradas

### Script Mode

- Grid fijo 13×13 de rangos.
- Selección manual y contador de combos.
- Pintar/borrar mediante el tick automático.
- Velocidad original `01H`–`30H` (1000–200 ms).
- Random con el mismo filtrado por bloqueadas/no bloqueadas.
- Pintar/limpiar todo, Challenge y Zen.
- Challenge puede ejecutarse simultáneamente con Grid libre o cualquier patrón.
- Ojo de etiquetas compartido por Grid y Memory.
- Transporte Play, Pause y Stop.
- Pair, Zigzag, Rings y Spiral.
- Zigzag con amplitud 1–6, dirección y orientación.
- Exclusión mutua de patrones y reinicio de progreso con Stop.

### Memory Mode

- Memoria visual simultánea con verde, azul, rojo y amarillo.
- Cantidad 1–50.
- Velocidad original `01x`–`21x` (250 ms–10 s).
- Áreas centradas 1–6, equivalentes a cuadrados 3×3–13×13.
- Área `M` con selección manual del pool.
- Ojo local para visualizar el área activa.
- SEC hacia delante, inversa y combinada.
- Cambio SEC aplazado cuando hay una ronda activa.
- Validación libre en modo visual y estricta por orden en SEC.
- Bucle continuo de rondas hasta Pause o Stop.
- Feedback de acierto/error y acción Siguiente.
- La cantidad visual representa el total de celdas mostrado, incluso con
  varios colores activos.

## Estructura

- `grid-trainer-state.js`: estado observable, fases y transporte.
- `grid-trainer-presets.js`: catálogo central de los 20 presets oficiales.
- `grid-trainer-engine.js`: lógica de Script, Memory, patrones y validación.
- `grid-trainer-ui.js`: grid y cuatro zonas del workspace.
- `grid-trainer-stats.js`: persistencia estadística.
- `index.js`: composición y registro mediante `RT.Modules.register`.

`app.js` solo entrega los hosts, monta/desmonta el módulo y deriva el teclado.

## Presets oficiales

La galería inferior se genera desde `exercisePresets`, definido una sola vez
en `grid-trainer-presets.js`. Contiene exactamente:

- `Memory 01`–`Memory 10`.
- `Visual 01`–`Visual 10`.

Cada entrada declara `id`, `category`, `level`, `title`, `description`,
`gridSize`, `cellCount`, `mode`, `pattern`, `challengeEnabled`,
`sequenceMode`, `duration`, `difficulty` y `specialEffect`.
Los presets Visual añaden `objective`; su `difficulty` es `null` porque el
catálogo no asigna una dificultad explícita a esa familia.

Los filtros `TODOS`, `MEMORY` y `VISUAL` solo cambian las tarjetas visibles.
Challenge no es una categoría: pertenece a `Visual 06`–`Visual 10`.

Seleccionar una tarjeta prepara la configuración, actualiza ambos paneles,
centra el área exacta `5x5`–`10x10` y marca el preset activo. Nunca inicia
Play automáticamente. Los controles manuales siguen disponibles y pueden
ajustar la configuración cargada; el preset es una capa de acceso rápido, no
un sustituto del panel izquierdo.

Las estadísticas por preset se guardan dentro de
`rangeTrainer.gridTrainer.stats` y permiten mostrar precisión, intentos y
mejor racha en cada tarjeta. Una tarjeta sin rondas muestra `Sin datos`.

### Efectos especiales

Las duraciones exactas, Flash, diagonal, disperso, secuencia directa, inversa
y combinada se aplican en el motor. Los siguientes efectos permanecen como
metadatos internos y se muestran en el panel derecho, pero no alteran todavía
la ronda:

- inversión de contraste o inversión temporal;
- doble fase y reaparición parcial;
- ocultación parcial;
- señuelos suaves;
- presión temporal;
- patrón complejo adicional.

El catálogo no define temporización, selección de señuelos ni reglas de
validación para esos efectos. Implementarlos sin esos datos introduciría una
interpretación ajena a la fuente oficial.

## Flujo de estados

```text
configuring
  -> showing
  -> answering
  -> correct | error
  -> round-finished
  -> showing
```

Script Mode permanece en `showing` mientras el transporte ejecuta un tick o
un patrón. Challenge alterna `answering` con feedback `correct/error`.

## localStorage

Todas las claves usan el prefijo:

```text
rangeTrainer.gridTrainer.*
```

Las estadísticas viven en `rangeTrainer.gridTrainer.stats` e incluyen rondas,
aciertos, fallos, precisión, rachas y errores por modo, tamaño y dificultad.
La carga sanea tipos, contadores y buckets para recuperarse de datos
incompletos o corruptos sin mezclar estadísticas de rangos.

La referencia original no incluye un selector de dificultad ni cambia el
tamaño físico del grid. Para no inventar controles, en Script/Challenge la
dificultad estadística se deriva de `Velocidad Script`; en Memory se deriva de
cantidad, velocidad, área y modo SEC. El tamaño se registra como el área
efectiva (`3x3`–`13x13` o pool manual).

## Añadir ejercicios

1. Añadir el descriptor a `EXERCISES` en `grid-trainer-engine.js`.
2. Implementar la lógica en el motor, usando ids de celda y sin DOM.
3. Exponer solo los comandos necesarios en la API del motor.
4. Añadir sus controles y presentación en `grid-trainer-ui.js`.
5. Mantener el registro y `app.js` sin lógica específica del ejercicio.

## Añadir presets

1. Añadir una entrada declarativa a `exercisePresets`.
2. Usar una categoría existente (`memory` o `visual`).
3. Mapear únicamente patrones, secuencias y efectos definidos por el catálogo.
4. No crear una tarjeta manualmente: filtros, tarjeta y estadísticas se
   generan desde la estructura.
5. Mantener la configuración manual independiente del preset.
