# Math Trainer

Math Trainer integra el proyecto de referencia `math trainer/` como módulo
independiente del Range Trainer. Mantiene su potencia completa mediante dos
vías complementarias:

- 20 presets para empezar a practicar con pocos clics.
- configuración avanzada para acceder a todos los datasets, modos y filtros.

## Capacidades

- NUMA con suma, resta, multiplicación, división y cadenas configurables.
- Poker Numbs en niveles Basic, Med, High y Advance.
- Random, Mirror, Surges, Fugues y Cipher.
- Pot Odds por outs, calle, porcentaje, odds y conversiones.
- Equity práctica, teórica e inversa.
- SPR práctico, teoría, interpretación, manos y ejemplos.
- cronómetro, contrarreloj, repetición de fallos e historial de sesión.
- teclado Numa para ejercicios numéricos.
- flashcards con `Sabía` y `Repetir`, sin teclado numérico.

## Datasets

Los ocho JSON originales se conservan en
`js/modules/math-trainer/data/`. Para que la aplicación siga funcionando
offline al abrir `index.html`, su contenido se empaqueta también en
`math-trainer-datasets.js`.

| Dataset | Preguntas |
| --- | ---: |
| Pot Odds | 240 |
| Equity práctica | 224 |
| Equity teoría/inversa | 32 |
| SPR práctico | 180 |
| SPR interpretación | 8 |
| SPR ejemplos | 6 |
| SPR manos | 8 |
| SPR teoría | 8 |

Poker Numbs conserva además sus 136 operaciones embebidas originales.
NUMA genera ejercicios dinámicamente a partir de la configuración.

## Presets

`math-trainer-presets.js` declara una única colección central con:

- `Pot Odds 01`–`Pot Odds 05`.
- `Equity 01`–`Equity 05`.
- `SPR 01`–`SPR 05`.
- `Numa 01`–`Numa 05`.

Los filtros `TODOS`, `POT ODDS`, `EQUITY`, `SPR` y `NUMA` solo cambian la
galería visible. Seleccionar una tarjeta carga sus parámetros, pero no inicia
la sesión. Cualquier control puede modificarse después; al hacerlo, la sesión
pasa a considerarse configuración manual.

Para añadir un preset, se agrega un descriptor a
`math-trainer-presets.js`. La interfaz, el filtro, el estado activo y las
estadísticas de tarjeta se generan automáticamente.

## Flujo

```text
configuring -> ready -> question
question -> correct | error -> question
cola principal agotada -> review -> question
sin pendientes -> finished
contrarreloj agotada -> timeout
```

Los errores se añaden a una cola de repaso. En Fugues, la operación se muestra
durante el intervalo configurado y el teclado se habilita solo después de
ocultarla. `stop`, cambio de categoría y desmontaje cancelan intervalos y
respuestas diferidas.

## Estadísticas

La persistencia usa exclusivamente:

```text
rangeTrainer.mathTrainer.*
```

Actualmente los datos viven en `rangeTrainer.mathTrainer.stats` e incluyen
ejercicios, aciertos, errores, precisión, racha actual, mejor racha, tiempo
medio, errores por categoría, errores por dificultad y métricas por preset.
La categoría, dificultad y preset se fijan al iniciar cada sesión para evitar
que un ajuste posterior cambie su atribución. La carga sanea datos
incompletos, antiguos o corruptos.

## Estructura

```text
js/modules/math-trainer/
  index.js
  math-trainer-state.js
  math-trainer-engine.js
  math-trainer-generators.js
  math-trainer-validators.js
  math-trainer-timer.js
  math-trainer-stats.js
  math-trainer-presets.js
  math-trainer-datasets.js
  math-trainer-ui.js
  data/*.json
```

`app.js` solo monta, desmonta y deriva el teclado. El módulo no usa
`reload()`, no oculta elementos globales y no publica estado adicional en
`window`.

## Añadir ejercicios

1. Incorporar el JSON original a `data/`.
2. Añadirlo al empaquetado offline de `math-trainer-datasets.js`.
3. Transformar sus entradas en el pool correspondiente dentro del motor.
4. Mantener respuestas y filtros fuera de la interfaz.
5. Añadir una prueba de pool vacío, acierto, error y repaso.
