# Módulos futuros

Convención para añadir Math Mode, Position Trainer, Sopa de Escaleras,
Memory Grid y otros modos sin hacer crecer `app.js`.

## Estructura

Crear únicamente los archivos necesarios:

```text
js/modules/<module-id>/
  index.js
  README.md
  engine.js      # opcional, lógica sin DOM
  ui.js          # opcional, vista completa
  config.js      # opcional
  styles.css     # opcional
```

Ubicaciones previstas:

```text
js/modules/math-mode/
js/modules/position-trainer/
js/modules/sopa-escaleras/
js/modules/memory-grid/
```

No se crean carpetas vacías antes de implementar el módulo.

## Registro

`index.js` es el punto público:

```js
(function registerModule(RT) {
  'use strict';

  RT.Modules.register({
    id: 'math-mode',
    label: 'Math Mode',
    mount(host, services) {},
    unmount() {}
  });
})(window.RT);
```

El identificador es ASCII, estable y único. El registro elimina espacios
exteriores, usa la identidad normalizada en `register/get` y rechaza
duplicados.

## Patrón de vista

Las vistas existentes marcan el patrón:

```js
RT.ExampleUI = {
  create(ctx) {
    function renderPanel(panel) {}
    function renderInsights(aside) {}
    return { renderPanel, renderInsights };
  }
};
```

El contexto debe pasar dependencias explícitas:

```js
{
  ui,
  toolkit: RT.UI.create(...),
  renderAll,
  renderPanel,
  selectedContextIds,
  services: {
    engine: RT.Engine,
    stats: RT.Stats,
    settings: RT.Settings
  }
}
```

No crear globals nuevos ni importar estado privado de `app.js`.

## Reglas

- `engine.js` no conoce DOM.
- `ui.js` no contiene respuestas.
- `index.js` conecta engine y UI.
- Los listeners propios se retiran en `unmount`.
- Persistencia versionada: `rt:<module>:v1`.
- Los estilos usan una clase raíz del módulo.
- Un módulo no modifica directamente vistas existentes.

## Integración con navegación

Cuando se implemente el primer módulo futuro, crear
`js/ui/modules/module-host.js`. Ese host debe:

1. leer `RT.Modules.list()`;
2. crear las entradas de navegación;
3. desmontar el modo anterior;
4. montar el nuevo dentro del workspace;
5. pasar matriz, galería, paneles y servicios necesarios.

Math Mode, Sopa de Escaleras, Memory Grid y Position Trainer se conectarán
todos mediante ese host. No se añadirá un bloque condicional independiente
por módulo dentro de `app.js`.

## Nuevos quizzes

Usar como referencia:

- `range-quiz-ui.js`: vista de rango completo;
- `surgical-quiz-ui.js`: vista de preguntas;
- `quiz-common-ui.js`: configuración común;
- `quiz-results-ui.js`: revisión y métricas.

Un quiz nuevo debe tener un motor con estados claros y una vista completa. Si
comparte resultados, ampliar la API de `QuizResultsUI` en lugar de copiarla.

## Nuevos simuladores

Separar generación, evaluación y presentación. Componentes visuales con ciclo
propio deben salir a `ui/simulator/`, como `table-view.js`.

## Regla para proteger app.js

`app.js` puede:

- inicializar servicios;
- cambiar de modo;
- coordinar eventos;
- elegir qué vista renderizar;
- mantener estado global mínimo.

## Variantes de entrenamiento

`js/ui/quizzes/training-ui.js` es el contenedor de Rango completo y Preguntas
individuales. Una futura variante que entrene el mismo conocimiento debe
integrarse en ese selector, manteniendo una sola pestaña de Entrenamiento.

Las vistas especializadas conservan motores y estado propios. El contenedor
solo selecciona la vista, evita sesiones simultáneas y mantiene compartidos
la matriz, los paneles y la biblioteca.

No puede contener la implementación completa de un modo. Si una nueva
función necesita panel, estado o ciclo propios, debe crearse como módulo.
