# Auditoria Pot Odds Trainer

## Alcance

Auditoria exclusiva del submodulo integrado en Math Trainer: evaluador de
manos, Reveal, seleccion de outs, estado temporal, limpieza y highlights.
No se modificaron los demas entrenadores ni los modulos de rangos.

Ampliacion posterior: modo dual Ejercicio/Laboratorio dentro del mismo
submodulo, sin mover los paneles principales.

Ronda final solicitada en `prompt_final_pot_odds_trainer.txt`: correccion de
cartas muertas, modos internos, manos hechas, River completo, OUTS/JUGADA,
Reveal y Export.

## Bugs encontrados y corregidos

1. Reveal activaba `revealHand` automaticamente. Antes de pulsar una out se
   iluminaba la mano actual, incluyendo cartas de Hero que no explicaban la
   mejora.
2. La UI consumia `bestHand.cards` sin distinguir cartas principales y
   kickers.
3. Faltaba una API unica que entregara nombre, cartas exactas y explicacion.
4. El evaluador no estaba estructurado en el orden canonico completo de poker.
5. Al cerrar Reveal tras una ronda terminada se restauraba la instruccion
   inicial en vez del feedback de acierto o error.
6. `effectiveOuts` se usaba directamente para Pot Odds y contaba parejas
   debiles como outs por el simple cambio de carta alta a pareja.
7. Los estados `correct`, `error` y `missed` no estaban ligados claramente a
   Comprobar; parte del feedback aparecia durante la seleccion.
8. Pot Odds no tenia laboratorio manual integrado; al montar siempre arrancaba
   una ronda.
9. El calculo de equity necesaria usaba una interpretacion incompleta del bote.
   Ahora usa `apuesta / (bote + apuesta + call)`.
10. La ultima iteracion del laboratorio dejaba OUTS, JUGADA y Reveal atados a
    `session.spot`; al no existir ronda activa, las ayudas quedaban
    deshabilitadas.
11. El selector Positivas/Negativas desaparecia del area de mazo/outs en modo
    laboratorio.
12. El calculo desarrollado quedaba sustituido por tarjetas resumidas y no
    aparecia como panel inferior de analisis.
13. El Turn/River temporal de Reveal podia quedar visible al editar el
    laboratorio si se cambiaban cartas despues de explicar una out.
14. `positive + negative` se usaba como si todas las cartas fueran utiles para
    la decision. Esto mezclaba outs negativas con equity valida.
15. Sin Villain se seguian creando positivas/negativas, cuando debian ser no
    aplicables y usarse solo outs limpias.
16. Villain no formaba parte del mazo muerto en todas las rutas; una carta del
    rival podia aparecer como out, Reveal o export.
17. Las manos hechas fuertes podian terminar mostrando FOLD por `0 outs`.
18. River completo seguia calculando equity futura.
19. Los palos del motor estaban en mojibake en una constante interna; eso podia
    romper evaluaciones de full/color/escalera en pruebas directas con Unicode.
20. `MADE_HAND_MODE` seguia exportando matematicas de draw y comparaciones como
    `0.0% < equity necesaria => MANO HECHA`.
21. Hero con mano hecha pero perdiendo contra Villain quedaba oculto como
    `MADE_HAND_MODE`, sin indicar que iba por detras.
22. Dobles parejas, parejas y overcards se mezclaban con outs limpias en vez de
    quedar como outs marginales.
23. En Turn aparecia `Turn = N/A` en el desarrollo, ruido que no corresponde.
24. River final exportaba comparaciones tipo `N/A 22.2% => N/A`.

Reveal ahora solo muestra las outs al activarse. Al pulsar una out correcta
calcula la mano resultante, coloca una copia visual de la carta en Turn o River
y destaca exclusivamente las cinco cartas de la mano final. Una out incorrecta
no crea board temporal ni ilumina una jugada.

El motor separa ahora `raw`, `clean`, `marginal`, `positive`, `negative` y `useful`.
`useful` es la fuente unica para equity de decision: limpias sin Villain,
positivas contra Villain concreto. Una pareja, doble pareja, overcard o mejora
de showdown queda como `marginal`, no como out limpia de Pot Odds.

Se anadieron modos internos:

- `DRAW_MODE`: proyecto y decision por outs limpias/utiles.
- `MADE_HAND_MODE`: Hero ya tiene mano hecha relevante; no se decide FOLD por
  cero outs futuras y el export muestra `Decision por outs = N/A`.
- `MADE_HAND_BEHIND_MODE`: Hero tiene mano hecha, pero Villain muestra una mano
  superior; se calculan outs reales de mejora y el export avisa que Hero va por
  detras.
- `RIVER_FINAL_MODE`: River completo; no hay equity futura ni formulas
  `outs x 2` o `outs x 4`, solo evaluacion final.

El modo Laboratorio usa `state.lab` separado de `session.spot`. Esto permite
editar Hero, Villain y board sin contaminar ejercicios ni estadisticas.

Correccion final de Laboratorio: OUTS y JUGADA funcionan tambien sin ronda
activa usando el spot construido manualmente; Reveal puede explicar una out del
laboratorio y crear solo una copia visual temporal. Cualquier edicion manual,
random por zona, random spot o limpieza elimina esas ayudas temporales.

## Logica de usedCards

`analyzeBestHand(cards, triggerCard, previousHand)` devuelve:

```js
{
  handName,
  usedCards,
  explanation,
  highlightStrong,
  highlightKicker
}
```

- `usedCards`: cinco cartas exactas de la mejor mano.
- `highlightStrong`: pareja, parejas, trio o poker; para escalera, color, full
  y escalera de color contiene las cinco cartas.
- `highlightKicker`: kickers que completan formalmente la mano.
- `explanation`: out, jugada resultante y cartas utilizadas.

La comparacion usa la identidad completa de cada carta. No se ilumina Hero o
el board por zona ni por compartir solamente el rango.

## Seleccion y estado

- Positivas y negativas son conjuntos independientes y sin duplicados.
- Elegir una carta en la categoria equivocada es error visual y de validacion.
- Antes de Comprobar, una carta elegida usa solo el estado suave `selected`.
- Tras Comprobar, las elegidas correctas usan `correct`, las incorrectas
  `error` y las outs limpias omitidas `missed`.
- Si no hay Villain, positivas/negativas son `N/A` y la decision usa outs
  limpias.
- Si hay Villain, positivas/negativas se calculan contra esa mano concreta,
  excluyendo Hero, Villain, Flop, Turn y River del mazo disponible.
- `session.spot.board` permanece inmutable durante Reveal.
- Ocultar, Siguiente, Stop, cambio de modo y desmontaje eliminan el board
  temporal y todos los highlights derivados.
- En Laboratorio, el mazo vivo deriva de Hero, Villain, Flop, Turn y River.
  Las cartas usadas quedan deshabilitadas y no se pueden duplicar.
- `Export` serializa Hero, Villain, Board, pot odds, outs limpias/brutas,
  equity y desarrollo matematico.

## Pruebas realizadas

- sintaxis de state, engine y UI;
- caso fijo `6s 8h Ad / 5d 9c`: solo los cuatro sietes son outs limpias;
- las parejas de cinco y nueve permanecen solo en outs brutas;
- proyecto de color: nueve outs limpias;
- open-ended: ocho outs limpias;
- pareja debil excluida;
- laboratorio inicia sin ronda activa;
- construccion manual: colocar, impedir duplicados y eliminar carta;
- random por seccion;
- random spot completo con nueve cartas unicas;
- mazo vivo derivado de cartas usadas;
- edicion de Bote/Apuesta y recalculo de `25 + 8 + 8 = 41`;
- export con desarrollo matematico;
- toggle `% / Ratio`;
- ocultar resultado en ejercicio;
- OUTS en laboratorio sin ronda activa;
- JUGADA en laboratorio sin ronda activa;
- Reveal en laboratorio y explicacion de una out valida;
- limpieza de Reveal al colocar, quitar, randomizar o limpiar cartas;
- selector Positivas/Negativas restaurado en la zona de mazo/outs;
- panel inferior de calculo desarrollado restaurado en laboratorio y ejercicio;
- pareja: pareja y tres kickers;
- doble pareja: dos parejas y kicker;
- trio: trio y dos kickers;
- escalera: cinco cartas consecutivas exactas;
- color: las cinco cartas superiores del palo;
- full: trio y pareja;
- poker: cuatro iguales y kicker;
- escalera de color: cinco cartas exactas;
- 100 rondas flop y 100 rondas turn;
- outs sin duplicados y categorias disjuntas;
- clasificacion negativa contra todas las manos rivales legales;
- click en out correcta e incorrecta;
- Reveal ON/OFF repetido;
- Turn y River temporales;
- board real inmutable;
- Siguiente, Stop y desmontaje tras Reveal;
- `git diff --check` sin errores.

## Pruebas ronda final

- bateria de 22 spots del prompt final con aserciones:
  - modo interno esperado;
  - ninguna carta muerta aparece en raw/clean/positive/negative/useful;
  - sin duplicados en outs utiles;
  - TEST 1 solo cuatro sietes como gutshot pura;
  - TEST 11 River completo con `turn=null`, `river=null` y cero outs utiles.
- pruebas interactivas de motor:
  - seleccionar slot vacio en Laboratorio;
  - colocar carta y mantener slot activo;
  - clicar carta colocada para vaciar slot;
  - Reveal ON/OFF;
  - click en out valida con Turn temporal;
  - click en out invalida sin colocar carta;
  - Export con `Modo interno`, Villain `N/A`, cartas muertas y outs limpias;
- Random Spot sin duplicados.

## Pruebas ronda semantica made hand/marginales

- TEST 07: Full hecho en flop entra en `MADE_HAND_MODE`, sin comparacion de
  equity futura y con `Decision por outs = N/A`.
- TEST 09: Color hecho no muestra `0.0% < equity necesaria`.
- TEST 10: Escalera hecha entra en `MADE_HAND_MODE`.
- TEST 11: Hero KQ en KQT contra AJ entra en `MADE_HAND_BEHIND_MODE`, avisa que
  va por detras y calcula outs de mejora.
- TEST 13: A/9 en board emparejado quedan como marginales; limpias conserva el
  flush draw.
- TEST 16: Turn solo muestra `River = outs x 2`, sin `Turn = N/A`.
- TEST 21: Color completado en Turn queda como mano hecha y no decide por outs.
- TEST 22: Escalera completada en Turn queda como mano hecha.
- TEST 30: River final muestra resultado final y `Equity futura = N/A`, sin
  comparacion `N/A =>`.
- TEST 06: A/K contra pareja visible quedan como marginales, no limpias.

## Auditoria bateria 100 tests

Archivo generado:

```text
AUDITORIA_100_TESTS_POT_ODDS_EXPORTS.md
```

Resultado:

- 100 tests detectados.
- 95 tests OK.
- 5 tests `INVALIDO CONTROLADO`.
- 0 bugs pendientes detectados por la auditoria automatica.

Invalidos controlados:

- TEST 079: carta duplicada `Kc` entre Villain y Turn.
- TEST 080: carta duplicada `Kc` entre Hero y Villain.
- TEST 096: carta duplicada `Qs` entre Villain y River.
- TEST 098: River rellenado sin Turn.
- TEST 100: estado completamente vacio.

Validaciones aplicadas por test:

- cartas muertas ausentes en raw/clean/marginal/positive/negative/useful;
- outs utiles y limpias sin duplicados;
- modo interno esperado;
- calculo correcto por calle;
- JUGADA usa cartas reales de Hero/Board;
- OUTS/Reveal no apuntan a cartas muertas;
- invalidos exportados como error controlado.

## Auditoria funcional completa final

Archivo nuevo:

```text
AUDITORIA_FUNCIONAL_COMPLETA_POT_ODDS_TRAINER.md
```

Correcciones finales aplicadas:

- `Random Turn` ya no puede crear una calle posterior con Flop incompleto: si
  falta Flop, lo rellena antes respetando cartas usadas.
- `Random River` ya no puede crear River sin Turn ni sin Flop completo: rellena
  primero las calles previas necesarias.
- `validateLabState()` controla tambien `Turn sin Flop completo` y `River sin
  Flop completo`.
- Se limpiaron textos corruptos visibles en motor/UI sin tocar layout ni
  estetica.

Prueba funcional final:

- Laboratorio, Random, OUTS, JUGADA, Reveal, export, modos internos y ejercicio
  basico.
- Resultado: `RESULT PASS failures=0`.

## Correccion deteccion de proyectos y equity por outs

Problemas revisados:

- En laboratorio se reporto un caso de flush draw que podia acabar presentado
  como `Sin proyecto limpio`.
- La UI hablaba de `Equity` en sitios donde realmente se muestra equity
  aproximada por outs limpias.
- El bloque `RESULTADO` podia montarse visualmente sobre `MAZO VIVO` por una
  linea sin wrap y campos superiores demasiado altos.

Correcciones aplicadas:

- `cleanOuts()` incluye ahora una regla explicita de flush draw limpio:
  Hero + board visible deben sumar exactamente cuatro cartas del mismo palo,
  al menos una debe estar en Hero y debe quedar calle por venir.
- Las outs de flush draw salen de `availableDeck`, excluyendo siempre cartas
  muertas.
- En modo `%`, la UI etiqueta el campo como `Equity por outs`; en modo `Ratio`,
  muestra ratio real.
- El export renombra `Equity turn/river` a `Equity por outs turn/river`.
- CSS especifico de Pot Odds compacta los campos superiores y permite wrap en
  `RESULTADO` para evitar solape con el mazo.

Tests ejecutados:

- TEST A: Jc 5h / 4c Tc 3c -> `Flush Draw`, 9 limpias.
- TEST B: Jd 4h / 5h 7h Kd -> `Sin proyecto limpio`, 0 limpias.
- TEST C: Ac 7c / 2c 9c Jh -> `Flush Draw`, 9 limpias.
- TEST D: Ac 7c / 2c 9c Jh / Kd -> `Flush Draw`, 9 limpias, solo River x2.
- TEST E: Ad Kc / 2s 7s Qs -> `Sin proyecto limpio`, 0 limpias.
- TEST F: As Kc / 2s 7s Qs -> `Flush Draw`, 9 limpias.
- Straight checks:
  - gutshot real -> 4 limpias;
  - OESD real -> 8 limpias;
  - runner-runner sin proyecto inmediato -> 0 limpias.
- Resultado: `RESULT PASS failures=0`.

## Auditoria final de bugs completa

Problemas reales encontrados y corregidos:

- Los campos de equity del ejercicio mostraban sufijo `%`, pero el parser
  interpretaba `18` como ratio `18:1` en vez de `18%`. Ahora los ratios solo se
  interpretan cuando el texto incluye `:`.
- El parser rechazaba `0` como equity valida. Eso rompia respuestas correctas
  en spots sin proyecto limpio con `0.0%`. Ahora `0` y `0%` son entradas
  validas.
- `labPlaceCard()` aceptaba cartas invalidas si se llamaba desde codigo, aunque
  la UI normal solo ofrece cartas del mazo. Ahora valida formato antes de
  colocar.

Pruebas finales ejecutadas:

- parseo `18`, `18%`, `18,5`, `0` y `4:1`;
- colocar/quitar cartas en laboratorio;
- bloqueo de cartas invalidas y duplicadas;
- Random River con calles previas coherentes;
- flush draw, backdoor, flush en Turn, gutshot, OESD y runner-runner;
- made hand behind;
- river final;
- Reveal ON/OFF;
- OUTS y JUGADA limpiadas al cambiar slot;
- export invalido controlado;
- validacion de ejercicio correcto con numeros sin `%`;
- estadisticas sin doble registro;
- render simulado sin mojibake;
- etiquetas `Equity por outs` y `Ratio`;
- resultado final: `RESULT PASS failures=0`.

## Riesgos pendientes

- El navegador integrado fue bloqueado por el sandbox de Windows, por lo que
  no se pudo automatizar la inspeccion visual de escritorio y movil.
- La clasificacion con Villain compara contra la mano concreta visible. No se
  implemento una equity exhaustiva contra rangos porque queda fuera del alcance.
- La equity conserva la aproximacion heredada por numero de outs. No se cambio
  por enumeracion exhaustiva porque queda fuera de esta correccion.

## Deuda tecnica restante

- Algunos textos antiguos del motor presentan problemas de codificacion en
  ciertas consolas. No se hizo una conversion masiva para evitar cambios fuera
  del alcance.
- Una futura suite DOM permitiria verificar automaticamente las clases CSS y
  capturas responsive, ademas de las pruebas actuales del motor.
