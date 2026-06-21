# Auditoria original - Duelo de Jugadas

Fuente revisada: `Duelo de jugadas/`.

## Archivos analizados

- `index.html`
- `duel.js`
- `config.js`
- `identify.js`
- `ranking.js`
- `style.css`
- `manifest.json`

## Funcionalidades detectadas

- Modo duelo Hero vs Villain con board completo.
- Generacion de mazo sin duplicados.
- Eleccion de ganador: Hero, Split u Oponente.
- Evaluacion de mejor mano de 5 cartas para Hero y Villain.
- Comparacion por ranking y kickers.
- Reveal de jugada con highlight de cartas usadas.
- Feedback correcto/incorrecto.
- Temporizadores y modos de memoria compartidos con el proyecto antiguo.
- Pantallas adicionales de identificar jugadas y ranking.

## Logica util migrable

- `generateDuel`.
- `guessWinner`.
- `getBestHand`.
- `compareHands`.
- `revealBest`.
- Construccion de mazo y shuffle.
- Render de cartas como concepto, no como estilos.

## Riesgos del original

- Estilos globales sobre `html` y `body`.
- Dependencias directas de ids globales.
- Uso de querystring y reload para cambiar modos.
- Timers globales y eventos de documento compartidos.
- Service worker y manifest no necesarios dentro del Range Trainer.
- UI antigua incompatible con la estetica actual.

## Decision de integracion

Se migra la logica real como submodulo nativo del Simulador, usando el layout existente del Range Trainer:

- panel izquierdo: navegacion interna y configuracion
- centro: mesa del simulador
- panel derecho: instrucciones, progreso y estadisticas
- galeria inferior: biblioteca actual del Simulador sin cambios

No se migra la app antigua como iframe ni como bloque pegado.
