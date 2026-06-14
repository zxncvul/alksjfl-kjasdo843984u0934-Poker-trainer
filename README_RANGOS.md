# README_RANGOS — Cómo ampliar los rangos y las preguntas

Esta guía explica la arquitectura de rangos del Range Trainer y cómo añadir
nuevo contenido **sin tocar ninguna lógica interna**. El contenido declarativo
vive en estos archivos:

| Archivo | Contenido |
|---|---|
| `js/data/ranges.data.js` | Fuentes, catálogo base y repertorios originales |
| `js/data/ranges-extra.data.js` | Repertorios con rival/origen (`vs`) |
| `js/data/questions.data.js` | Plantillas y preguntas del quiz quirúrgico |

El resto del proyecto (`js/core/`, `js/ui/`) **no necesita modificarse nunca**
para añadir contenido. La interfaz se adapta sola: botones, contadores,
ejercicios del quiz de rango y preguntas del quiz quirúrgico se generan a
partir de lo que exista en estos archivos.

---

## 1. Arquitectura en una imagen

```
js/core/hands.js         Utilidades puras: matriz 13×13, combos, filtros de manos.
js/core/range-engine.js  Motor de rangos: registra y consulta lo declarado en data/.
js/core/quiz-engine.js   Motores de quiz (Tipo A: rango completo; Tipo B: quirúrgico).
js/data/ranges.data.js       ← Catálogo y repertorios originales.
js/data/ranges-extra.data.js ← Repertorios adicionales con dimensión `vs`.
js/data/questions.data.js    ← Plantillas y preguntas manuales.
js/ui/grid.js            Matriz (componente tonto, solo pinta lo que le pasan).
js/ui/range-gallery.js   Biblioteca y miniaturas consultando al motor.
js/ui/app.js             Orquestación de modos y selección activa.
```

Principio clave: **los datos son declarativos**. Cada rango es una llamada a
`RT.defineRange(...)`. El motor los indexa y la UI pregunta al motor qué
existe (`availableSpots`, `availableHeroes`, `availableActions`...). Por eso
los botones son condicionales: si un dato no existe, su botón no aparece.

---

## 2. Conceptos

- **Fuente (`source`)**: autor o conjunto de rangos (p. ej. `'david-diaz'`).
- **Spot**: situación preflop (`'OR'`, `'VS3BET'`, ...). Cada spot declara
  qué dimensiones necesita en `dims`:
  - `['hero']` → solo posición del héroe (como OR).
  - `['hero','relative']` → posición + relativa IP/OOP (como VS3BET).
- **Acción**: respuesta posible (`'OR'`, `'CALL'`, `'4BET'`, `'FOLD'`...),
  con etiqueta y color globales.
- **Rango**: lista de manos para una combinación
  `fuente + spot + héroe (+ relativa) + acción`.
- **Manos**: notación estándar — `'AA'` (pareja), `'AKs'` (suited),
  `'AKo'` (offsuit). Siempre con la carta alta primero (`'AKs'`, no `'KAs'`).

Posiciones válidas: `UTG, MP, CO, BTN, SB, BB`. Relativas: `OOP, IP`.

---

## 3. Añadir manos a un rango existente

Busca el `RT.defineRange` correspondiente en `js/data/ranges.data.js` o
`js/data/ranges-extra.data.js` y añade la mano a la lista `hands`. Nada más.

```js
RT.defineRange({
  source: 'david-diaz',
  spot: 'OR',
  hero: 'UTG',
  relative: null,
  action: 'OR',
  hands: [
    'AA', 'KK', /* ... */, 'QJo',
    'T8s'   // ← mano nueva
  ]
});
```

El motor valida cada mano al cargar. Si escribes una mano inválida
(`'KAs'`, `'A1s'`...) verás un aviso en la consola y la mano se ignora,
sin romper la aplicación. Si una misma mano queda asignada a **dos acciones
distintas del mismo contexto**, `RT.Engine.validate()` lo avisa por consola
al arrancar (revisa la consola tras editar datos).

Las consultas de disponibilidad están indexadas por fuente, spot, posición
y relativa. Añadir más rangos aumenta el volumen de datos, pero la interfaz
no vuelve a recorrer el archivo completo para resolver cada selector.

---

## 4. Añadir un rango nuevo (posición nueva en un spot existente)

Una llamada nueva a `RT.defineRange`. Ejemplo: añadir la apertura de BB
(que hoy no existe):

```js
RT.defineRange({
  source: 'david-diaz',
  spot: 'OR',
  hero: 'BB',
  relative: null,        // OR no usa relativa
  action: 'OR',
  hands: ['AA', 'KK', 'QQ', 'AKs', 'AKo']
});
```

Automáticamente:
- El botón **BB** se activa en el modo estudio.
- Aparece una tarjeta nueva en la biblioteca.
- Aparece un ejercicio nuevo en el quiz de rango completo.
- Se generan las preguntas quirúrgicas con respuesta no vacía para BB.

---

## 5. Añadir un spot nuevo

Dos pasos, dentro del archivo de datos que corresponda:

**Paso 1 — declarar el spot** (junto a los demás `RT.defineSpot`):

```js
RT.defineSpot({
  id: 'VS4BET',
  label: 'vs 4Bet',            // texto del botón
  name: 'Vs 4Bet',             // texto en frases ("...vs 4Bet desde UTG")
  dims: ['hero', 'relative'],  // qué necesita para quedar definido
  description: 'Defensa tras 3betear y recibir 4bet'
});
```

**Paso 2 — definir sus rangos**, uno por acción:

```js
RT.defineRange({
  source: 'david-diaz', spot: 'VS4BET', hero: 'BTN', relative: 'IP',
  action: 'CALL',
  hands: ['QQ', 'JJ', 'AQs', 'AKo']
});

RT.defineRange({
  source: 'david-diaz', spot: 'VS4BET', hero: 'BTN', relative: 'IP',
  action: '5BETPLUS',
  hands: ['AA', 'KK', 'AKs']
});

RT.defineRange({
  source: 'david-diaz', spot: 'VS4BET', hero: 'BTN', relative: 'IP',
  action: 'FOLD',
  hands: ['TT', '99', 'AQo', 'AJs']
});
```

El botón "vs 4Bet" aparece solo, con únicamente BTN/IP activos.

> Consejo: en spots de defensa conviene incluir el rango de FOLD para que la
> matriz de estudio muestre el árbol completo de decisiones. El quiz
> quirúrgico ignora FOLD por defecto (ver §8).

---

## 6. Añadir una acción nueva

Si la acción ya existe en el catálogo (FOLD, CALL, OR, 3BET, 4BET, 5BETPLUS,
ALLIN), basta con usarla en un `defineRange`. Si es nueva, declárala primero:

```js
RT.defineAction({ id: 'LIMP', label: 'Limp', color: '#4a90d9' });
```

El orden de las llamadas `defineAction` define el orden visual de la leyenda
y los pinceles.

---

## 7. Añadir una fuente nueva (otro autor / otro sistema de rangos)

```js
RT.defineSource({ id: 'mi-sistema-2026', label: 'Mi sistema 2026' });

RT.defineRange({
  source: 'mi-sistema-2026',
  spot: 'OR', hero: 'BTN', relative: null, action: 'OR',
  hands: ['AA', 'KK', /* ... */]
});
```

La aplicación usa hoy la primera fuente definida (el arranque en
`js/ui/range-gallery.js` y `js/ui/app.js` ya están preparados para un futuro selector de fuente: solo
habría que añadir el botón, el estado `ui.source` ya existe).

---

## 8. Preguntas del quiz quirúrgico

Hay dos mecanismos, ambos en `js/data/questions.data.js`.

### 8.0 Categorías

Cada plantilla/pregunta pertenece a una **categoría** (Ax, Kx, Parejas...).
El usuario filtra por categorías al configurar el quiz, así que el quiz es
dirigido: se entrena exactamente lo que se elige. Las categorías se declaran
una vez y los botones de configuración salen solos (una categoría sin
contenido no genera botón):

```js
RT.defineQuestionCategory({ id: 'gappers', label: 'Gappers' });
```

### 8.1 Plantillas (lo normal — escala sola)

Una plantilla define una *familia de manos* mediante un filtro. El motor la
expande automáticamente sobre **todos los contextos y acciones disponibles**
y descarta las combinaciones cuya respuesta sería vacía. Al añadir rangos
nuevos, las preguntas aparecen solas.

```js
RT.defineQuestionTemplate({
  id: 'broadways-suited',     // único en todo el archivo
  category: 'broadway',       // ver §8.0
  text: 'broadways suited',   // se inserta en la frase generada
  filter: {
    suited: true,
    custom: h => 'AKQJT'.includes(h[0]) && 'AKQJT'.includes(h[1])
  }
});
```

Genera preguntas como: *"¿Qué broadways suited pagamos (Call) vs 3Bet desde
CO en posición?"* — una por cada contexto/acción con respuesta no vacía.

Campos opcionales de cada plantilla o pregunta manual:

- `level: 1|2|3` — dificultad (1 básico, 2 medio, 3 avanzado; sin declarar
  cuenta como 2). El usuario filtra por niveles en la configuración del quiz
  y la opción "Dificultad" de Configuración preselecciona niveles de forma
  acumulativa (básica=1, media=1-2, avanzada=1-2-3).
- `explanation`, `concept`, `observations`, `commonErrors` — campos
  pedagógicos. La arquitectura está preparada: si existen, la revisión los
  muestra en una tarjeta; si no, no ocupan espacio. (Aún sin rellenar.)

Opciones de sesión que aceptan los motores (`SurgicalQuiz.start` /
`RangeQuiz.start`): `limit` (nº de preguntas: sesiones rápidas), `groupBy`
(['spot','hero','action']: agrupar en vez de mezclar), `requeueFails`
(repetir hasta dominar) y `SurgicalQuiz.startFromIds(opciones, ids)` para el
repaso dirigido de falladas que alimenta `RT.Stats`.

Además de por categoría, el usuario puede filtrar las preguntas por **tipo de
mano** (suited/offsuit, según el `filter` de cada plantilla) y por **acción**
(Call, 4Bet...), todo desde la pantalla de configuración sin tocar código.

**Filtros disponibles** (se combinan con AND; ver `RT.Hands.matchesFilter`):

| Clave | Tipo | Significado |
|---|---|---|
| `pair` | bool | Parejas (true) o excluirlas (false) |
| `suited` | bool | Manos suited |
| `offsuit` | bool | Manos offsuit |
| `connector` | bool | Conectores (AK excluido a propósito, como en el sistema original) |
| `rank` | string | La mano contiene esa carta (`'A'` → todas las Ax) |
| `ranks` | array | La mano contiene alguna de esas cartas |
| `custom` | función | `h => bool` para cualquier condición especial |

### 8.2 Preguntas manuales (control total)

Para una pregunta concreta con contexto y acción fijos:

```js
RT.defineQuestion({
  id: 'axs-call-utg-oop',
  category: 'ax',
  text: '¿Qué Ax suited pagamos un 3bet desde UTG fuera de posición?',
  context: { spot: 'VS3BET', hero: 'UTG', relative: 'OOP' },
  action: 'CALL',
  filter: { suited: true, rank: 'A', pair: false }
});
```

Si la respuesta resultara vacía, la pregunta se descarta del pool
automáticamente (nunca se pregunta algo sin respuesta).

### 8.3 FOLD en los quizzes

Por defecto, el quiz quirúrgico excluye la acción FOLD ("¿qué tiramos?"
suele ser ruido); el usuario puede incluirla seleccionándola en el filtro de
acciones. En el quiz de rango completo, lo no pintado cuenta como fold; el
interruptor "Incluir Fold" de su configuración exige pintar también el rango
de fold.

---

## 9. Categorías, etiquetas y metadatos futuros

- Las **categorías de preguntas** se declaran con `RT.defineQuestionCategory`
  y se asignan con el campo `category` (ver §8.0). Los botones del quiz
  salen del catálogo: cero cambios de UI.
- Las **familias** se expresan como filtros (`pair`, `suited`,
  `connector`, `rank`, `custom`...). Añadir una familia nueva = añadir una
  plantilla con su filtro.
- Tanto spots, como acciones, fuentes, rangos y plantillas admiten
  **propiedades extra** sin romper nada (el motor solo lee las que conoce).
  Puedes añadir desde ya metadatos como `notes`, `videoUrl`, `updatedAt`...
  y explotarlos más adelante desde la UI.

---

## 10. Contextos con rival u opener

Los repertorios que dependen de la posicion rival usan `dims: ['hero', 'vs']`.
La identidad completa es `source + spot + hero + relative + vs`, por lo que
`CO vs UTG` y `CO vs MP` nunca se sobrescriben. Los rangos antiguos, sin
`vs`, siguen siendo compatibles.

Los rangos adicionales viven en `js/data/ranges-extra.data.js` para mantener
intactos Open Raise y vs 3Bet IP/OOP.

```js
RT.defineRange({
  source: 'david-diaz',
  spot: 'THREEBET_VS_OPEN',
  hero: 'CO',
  vs: 'UTG',
  relative: null,
  action: '3BET_MAIN',
  hands: ['AA', 'KK', 'AKs']
});
```

Para anadir otro matchup futuro solo hay que declarar sus acciones con el
mismo `spot`, `hero` y `vs`. La biblioteca y ambos quizzes lo descubren de
forma automatica.

## 11. Checklist tras editar datos

1. Abre la aplicación y mira la **consola** (F12): el motor avisa de manos
   inválidas, duplicados y solapes mano↔acción (`RT.Engine.validate()`).
2. Comprueba en modo **Estudio** que el nuevo botón aparece y pinta bien.
3. Comprueba que la tarjeta aparece en la biblioteca y que su categoría se
   genera automáticamente.
4. Comprueba el contador de ejercicios/preguntas en ambos quizzes
   (el nuevo contenido debe sumar).

No hay paso de compilación: guarda el archivo y recarga la página.
