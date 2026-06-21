# Auditoria funcional completa - Pot Odds Trainer

Fecha: 2026-06-17

Alcance: solo Pot Odds Trainer integrado en Math Trainer y documentacion directa.
No se movio layout, no se cambiaron estilos generales y no se tocaron otros
modulos.

## Checklist funcional

- Laboratorio:
  - slot activo visible desde el primer click;
  - colocar carta desde mazo vivo;
  - quitar carta colocada y devolverla al mazo;
  - bloqueo de duplicados;
  - Hero, Villain, Flop, Turn y River sincronizados;
  - mazo vivo calculado como deck menos cartas usadas;
  - calculos actualizados al cambiar spot;
  - OUTS, JUGADA y Reveal se limpian al cambiar spot;
  - estados invalidos exportados como error controlado.
- Random:
  - Hero, Villain, Flop, Turn, River y Random Spot sin duplicados;
  - Random Turn completa Flop si faltaba;
  - Random River completa Flop y Turn si faltaban;
  - cada random limpia highlights temporales.
- OUTS:
  - usa availableDeck real;
  - no muestra cartas muertas;
  - separa limpias, marginales, brutas, positivas, negativas, utiles de
    decision y mejoras posibles;
  - sin Villain, positivas/negativas son N/A;
  - con Villain, positivas/negativas se calculan contra la mano visible.
- JUGADA:
  - detecta mejor mano de Hero y Villain;
  - ilumina solo cartas usadas por la mejor mano;
  - soporta carta alta, pareja, doble pareja, trio, escalera, color, full,
    poker y escalera de color.
- Reveal:
  - ON muestra outs segun modo;
  - click en out valida crea Turn/River temporal;
  - recalcula mano y explicacion;
  - OFF restaura estado temporal y limpia detalle;
  - Stop, Siguiente, cambio de spot y desmontaje limpian ayudas.
- Calculos:
  - bote final = bote + apuesta + call;
  - equity necesaria = call / bote final;
  - ratio correcto;
  - Flop muestra Turn x2 y River x4;
  - Turn muestra solo River x2;
  - River final no muestra equity futura;
  - mano hecha no compara 0 outs contra equity.
- Ejercicios:
  - carga de spot;
  - seleccion de outs;
  - Positivas/Negativas;
  - CALL/FOLD;
  - Comprobar;
  - Reveal;
  - Siguiente;
  - Stop/reset.
- Responsive basico:
  - no se introdujeron cambios de layout;
  - controles siguen dentro de las mismas superficies del modulo;
  - pendiente inspeccion visual automatizada por bloqueo del navegador en
    sandbox.

## Bugs encontrados

1. `Random Turn` podia crear Turn con Flop incompleto si se usaba desde un
   laboratorio vacio.
2. `Random River` podia crear River sin Turn y sin Flop completo si se usaba
   desde un laboratorio vacio.
3. La validacion de laboratorio detectaba `River sin Turn`, pero no distinguia
   `Turn sin Flop completo` ni `River sin Flop completo`.
4. Quedaban textos con codificacion corrupta en mensajes internos y paneles.

## Bugs corregidos

1. `labRandomSection('turn')` ahora completa Flop antes de elegir Turn cuando
   hace falta.
2. `labRandomSection('river')` ahora completa Flop y Turn antes de elegir River
   cuando hace falta.
3. `validateLabState()` ahora exporta como invalido controlado los estados
   `Turn sin Flop completo` y `River sin Flop completo`.
4. Se sanearon separadores y textos corruptos en motor y UI sin tocar layout ni
   estilos.

## Archivos modificados

- `js/modules/math-trainer/pot-odds-trainer/pot-odds-trainer-engine.js`
- `js/modules/math-trainer/pot-odds-trainer/pot-odds-trainer-ui.js`
- `js/modules/math-trainer/pot-odds-trainer/README.md`
- `AUDITORIA_POT_ODDS_TRAINER.md`
- `AUDITORIA_FUNCIONAL_COMPLETA_POT_ODDS_TRAINER.md`

## Pruebas realizadas

- Sintaxis:
  - `pot-odds-trainer-state.js`
  - `pot-odds-trainer-engine.js`
  - `pot-odds-trainer-ui.js`
  - `pot-odds-trainer-adapter.js`
- Smoke funcional de motor:
  - slot activo tras click;
  - colocar carta;
  - quitar carta y devolver al mazo;
  - bloqueo de duplicado;
  - Random Turn;
  - Random River;
  - Random Spot;
  - export de laboratorio vacio;
  - export de River sin Turn;
  - export de Turn sin Flop completo;
  - gutshot pura con solo cuatro sietes;
  - sin Villain con positivas/negativas N/A;
  - availableDeck excluyendo Hero y Board;
  - MADE_HAND_BEHIND_MODE;
  - MADE_HAND_MODE sin decision por outs;
  - RIVER_FINAL_MODE sin equity futura;
  - Reveal ON/OFF;
  - click en out valida con carta temporal;
  - JUGADA;
  - limpieza de ayudas al cambiar spot;
  - modo ejercicio;
  - Stop limpiando ejercicio y Reveal.
- Resultado del smoke:
  - `RESULT PASS failures=0`.

## Regresiones descartadas

- No aparecen textos `Turn = N/A`.
- No aparece comparacion `N/A 22.2% => N/A`.
- Made hand no muestra `0.0% < equity necesaria => MANO HECHA`.
- Sin Villain no inventa positivas/negativas.
- Cartas muertas no entran en availableDeck.
- Reveal OFF elimina `revealDetail`.
- Stop elimina spot activo y ayudas.

## Riesgos pendientes

- No se ejecuto una inspeccion visual automatizada en navegador por bloqueo del
  entorno. No hubo cambios de layout ni CSS en esta ronda.
- La equity sigue usando aproximacion por outs heredada, no enumeracion
  exhaustiva contra rangos.
- Villain visible se evalua como mano concreta, no como rango.
- Algunas pruebas son de motor/estado y no sustituyen una futura suite DOM para
  verificar clases visuales responsive.

## Limitaciones conocidas

- Los estados manuales invalidos se controlan en export y analisis, pero el
  laboratorio permite construirlos temporalmente mientras el usuario edita.
- Las outs marginales se conservan para diagnostico, pero no entran en outs
  limpias salvo decision explicita documentada.

## Correccion quirurgica UI / estado visual

Fecha: 2026-06-17

Cambios aplicados:

- Eliminados restos mojibake en UI del laboratorio: random por seccion usa
  `Rnd` y los campos ocultos muestran `OCULTO`.
- El campo superior cambia de etiqueta segun el selector:
  - modo `%`: `Equity necesaria`;
  - modo `Ratio`: `Ratio`.
- En `MADE_HAND_MODE`, el bloque deja de presentarse como proyecto:
  - titulo `MANO HECHA`;
  - linea `Mano hecha: ...`;
  - linea `Mejoras posibles: ...`;
  - linea `Decision por outs: N/A`.
- En `MADE_HAND_MODE` y `RIVER_FINAL_MODE`, los botones `Positivas` y
  `Negativas` quedan deshabilitados con ayuda `N/A en este modo`.
- El resultado inferior evita separadores corruptos y muestra una lectura
  separada: mano hecha, decision por outs y mejoras posibles.
- El panel derecho muestra `Mano hecha` y `Mejoras posibles` cuando aplica, en
  vez de forzar `Proyecto`.

Pruebas especificas:

- Render simulado sin mojibake en grid/insights.
- Bote 25 / Apuesta 80:
  - en modo `%`, el campo superior muestra `Equity necesaria` y no `Ratio
    43.2%`;
  - en modo `Ratio`, muestra `Ratio 1.31:1`.
- MADE_HAND_MODE con Hero K/Q en K/Q/T:
  - muestra `MANO HECHA`;
  - muestra `Decision por outs: N/A`;
  - deshabilita `Positivas` y `Negativas`.
- Reveal ON/OFF limpia `revealDetail`.
- Resultado: `RESULT PASS failures=0`.
