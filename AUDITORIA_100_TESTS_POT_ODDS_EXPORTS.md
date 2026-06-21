# Auditoria 100 Tests Pot Odds Trainer

Fuente: C:/Users/adria/Downloads/bateria_100_tests_pot_odds_trainer.txt
Tests detectados: 100
OK: 95
INVALIDO CONTROLADO: 5
BUG: 0

## TEST 001 · Gutshot pura en flop
- Estado esperado de ejecucion: OK
- Export bruto del Pot Odds Trainer
```text
POT ODDS TRAINER
Modo interno: DRAW_MODE
Hero: 5♦ 9♣
Villain: --
Board: 6♠ 8♥ A♦
Turn: --
River: --
Cartas muertas: 5♦ 9♣ 6♠ 8♥ A♦
Available deck: 47

Bote: 25
Apuesta: 8
Ratio: 4.13:1
Equity necesaria: 19.5%
Mano Hero: Carta alta A
Mano Villain: --

Outs positivas: N/A
Outs negativas: N/A
Outs limpias: 7♠ 7♥ 7♦ 7♣
Outs marginales: 5♠ 5♥ 5♣ 6♥ 6♦ 6♣ 8♠ 8♦ 8♣ 9♠ 9♥ 9♦ A♠ A♥ A♣
Outs brutas: 5♠ 5♥ 5♣ 6♥ 6♦ 6♣ 7♠ 7♥ 7♦ 7♣ 8♠ 8♦ 8♣ 9♠ 9♥ 9♦ A♠ A♥ A♣
Outs utiles decision: 7♠ 7♥ 7♦ 7♣

Equity turn: 8.0%
Equity river: 16.0%
Resultado: FOLD

Desarrollo:
Bote final = 25 + 8 + 8 = 41
Equity necesaria = 8 / 41 = 19.5%
Turn = 4 x 2 = 8.0%
River = 4 x 4 = 16.0%
16.0% < 19.5% => FOLD
```
- Observaciones:
  - cartas muertas detectadas: no
  - duplicados: no
  - modo interno correcto: si
  - calculo por calle correcto: si
  - JUGADA/OUTS/Reveal correcto: si
  - bug encontrado: no

## TEST 002 · OESD básica en flop
- Estado esperado de ejecucion: OK
- Export bruto del Pot Odds Trainer
```text
POT ODDS TRAINER
Modo interno: DRAW_MODE
Hero: 8♣ 9♦
Villain: --
Board: 6♠ 7♥ K♦
Turn: --
River: --
Cartas muertas: 8♣ 9♦ 6♠ 7♥ K♦
Available deck: 47

Bote: 30
Apuesta: 10
Ratio: 4.00:1
Equity necesaria: 20.0%
Mano Hero: Carta alta K
Mano Villain: --

Outs positivas: N/A
Outs negativas: N/A
Outs limpias: 5♠ 5♥ 5♦ 5♣ T♠ T♥ T♦ T♣
Outs marginales: 6♥ 6♦ 6♣ 7♠ 7♦ 7♣ 8♠ 8♥ 8♦ 9♠ 9♥ 9♣ K♠ K♥ K♣
Outs brutas: 5♠ 5♥ 5♦ 5♣ 6♥ 6♦ 6♣ 7♠ 7♦ 7♣ 8♠ 8♥ 8♦ 9♠ 9♥ 9♣ T♠ T♥ T♦ T♣ K♠ K♥ K♣
Outs utiles decision: 5♠ 5♥ 5♦ 5♣ T♠ T♥ T♦ T♣

Equity turn: 16.0%
Equity river: 32.0%
Resultado: CALL

Desarrollo:
Bote final = 30 + 10 + 10 = 50
Equity necesaria = 10 / 50 = 20.0%
Turn = 8 x 2 = 16.0%
River = 8 x 4 = 32.0%
32.0% >= 20.0% => CALL
```
- Observaciones:
  - cartas muertas detectadas: no
  - duplicados: no
  - modo interno correcto: si
  - calculo por calle correcto: si
  - JUGADA/OUTS/Reveal correcto: si
  - bug encontrado: no

## TEST 003 · Flush draw sin Villain
- Estado esperado de ejecucion: OK
- Export bruto del Pot Odds Trainer
```text
POT ODDS TRAINER
Modo interno: DRAW_MODE
Hero: A♣ 7♣
Villain: --
Board: 2♣ 9♣ J♥
Turn: --
River: --
Cartas muertas: A♣ 7♣ 2♣ 9♣ J♥
Available deck: 47

Bote: 40
Apuesta: 15
Ratio: 3.67:1
Equity necesaria: 21.4%
Mano Hero: Carta alta A
Mano Villain: --

Outs positivas: N/A
Outs negativas: N/A
Outs limpias: 3♣ 4♣ 5♣ 6♣ 8♣ T♣ J♣ Q♣ K♣
Outs marginales: 2♠ 2♥ 2♦ 7♠ 7♥ 7♦ 9♠ 9♥ 9♦ J♠ J♦ A♠ A♥ A♦
Outs brutas: 2♠ 2♥ 2♦ 3♣ 4♣ 5♣ 6♣ 7♠ 7♥ 7♦ 8♣ 9♠ 9♥ 9♦ T♣ J♠ J♦ J♣ Q♣ K♣ A♠ A♥ A♦
Outs utiles decision: 3♣ 4♣ 5♣ 6♣ 8♣ T♣ J♣ Q♣ K♣

Equity turn: 18.0%
Equity river: 36.0%
Resultado: CALL

Desarrollo:
Bote final = 40 + 15 + 15 = 70
Equity necesaria = 15 / 70 = 21.4%
Turn = 9 x 2 = 18.0%
River = 9 x 4 = 36.0%
36.0% >= 21.4% => CALL
```
- Observaciones:
  - cartas muertas detectadas: no
  - duplicados: no
  - modo interno correcto: si
  - calculo por calle correcto: si
  - JUGADA/OUTS/Reveal correcto: si
  - bug encontrado: no

## TEST 004 · Combo draw sin Villain
- Estado esperado de ejecucion: OK
- Export bruto del Pot Odds Trainer
```text
POT ODDS TRAINER
Modo interno: DRAW_MODE
Hero: 8♣ 9♣
Villain: --
Board: 6♣ 7♣ 2♥
Turn: --
River: --
Cartas muertas: 8♣ 9♣ 6♣ 7♣ 2♥
Available deck: 47

Bote: 50
Apuesta: 20
Ratio: 3.50:1
Equity necesaria: 22.2%
Mano Hero: Carta alta 9
Mano Villain: --

Outs positivas: N/A
Outs negativas: N/A
Outs limpias: 2♣ 3♣ 4♣ 5♠ 5♥ 5♦ 5♣ T♠ T♥ T♦ T♣ J♣ Q♣ K♣ A♣
Outs marginales: 2♠ 2♦ 6♠ 6♥ 6♦ 7♠ 7♥ 7♦ 8♠ 8♥ 8♦ 9♠ 9♥ 9♦
Outs brutas: 2♠ 2♦ 2♣ 3♣ 4♣ 5♠ 5♥ 5♦ 5♣ 6♠ 6♥ 6♦ 7♠ 7♥ 7♦ 8♠ 8♥ 8♦ 9♠ 9♥ 9♦ T♠ T♥ T♦ T♣ J♣ Q♣ K♣ A♣
Outs utiles decision: 2♣ 3♣ 4♣ 5♠ 5♥ 5♦ 5♣ T♠ T♥ T♦ T♣ J♣ Q♣ K♣ A♣

Equity turn: 30.0%
Equity river: 60.0%
Resultado: CALL

Desarrollo:
Bote final = 50 + 20 + 20 = 90
Equity necesaria = 20 / 90 = 22.2%
Turn = 15 x 2 = 30.0%
River = 15 x 4 = 60.0%
60.0% >= 22.2% => CALL
```
- Observaciones:
  - cartas muertas detectadas: no
  - duplicados: no
  - modo interno correcto: si
  - calculo por calle correcto: si
  - JUGADA/OUTS/Reveal correcto: si
  - bug encontrado: no

## TEST 005 · Par débil trampa
- Estado esperado de ejecucion: OK
- Export bruto del Pot Odds Trainer
```text
POT ODDS TRAINER
Modo interno: DRAW_MODE
Hero: 4♦ 9♠
Villain: --
Board: 2♥ 7♣ Q♦
Turn: --
River: --
Cartas muertas: 4♦ 9♠ 2♥ 7♣ Q♦
Available deck: 47

Bote: 20
Apuesta: 10
Ratio: 3.00:1
Equity necesaria: 25.0%
Mano Hero: Carta alta Q
Mano Villain: --

Outs positivas: N/A
Outs negativas: N/A
Outs limpias: --
Outs marginales: 2♠ 2♦ 2♣ 4♠ 4♥ 4♣ 7♠ 7♥ 7♦ 9♥ 9♦ 9♣ Q♠ Q♥ Q♣
Outs brutas: 2♠ 2♦ 2♣ 4♠ 4♥ 4♣ 7♠ 7♥ 7♦ 9♥ 9♦ 9♣ Q♠ Q♥ Q♣
Outs utiles decision: --

Equity turn: 0.0%
Equity river: 0.0%
Resultado: FOLD

Desarrollo:
Bote final = 20 + 10 + 10 = 40
Equity necesaria = 10 / 40 = 25.0%
Turn = 0 x 2 = 0.0%
River = 0 x 4 = 0.0%
0.0% < 25.0% => FOLD
```
- Observaciones:
  - cartas muertas detectadas: no
  - duplicados: no
  - modo interno correcto: si
  - calculo por calle correcto: si
  - JUGADA/OUTS/Reveal correcto: si
  - bug encontrado: no

## TEST 006 · Overcards sin Villain
- Estado esperado de ejecucion: OK
- Export bruto del Pot Odds Trainer
```text
POT ODDS TRAINER
Modo interno: DRAW_MODE
Hero: A♠ K♦
Villain: --
Board: 2♣ 7♦ Q♥
Turn: --
River: --
Cartas muertas: A♠ K♦ 2♣ 7♦ Q♥
Available deck: 47

Bote: 35
Apuesta: 10
Ratio: 4.50:1
Equity necesaria: 18.2%
Mano Hero: Carta alta A
Mano Villain: --

Outs positivas: N/A
Outs negativas: N/A
Outs limpias: --
Outs marginales: 2♠ 2♥ 2♦ 7♠ 7♥ 7♣ Q♠ Q♦ Q♣ K♠ K♥ K♣ A♥ A♦ A♣
Outs brutas: 2♠ 2♥ 2♦ 7♠ 7♥ 7♣ Q♠ Q♦ Q♣ K♠ K♥ K♣ A♥ A♦ A♣
Outs utiles decision: --

Equity turn: 0.0%
Equity river: 0.0%
Resultado: FOLD

Desarrollo:
Bote final = 35 + 10 + 10 = 55
Equity necesaria = 10 / 55 = 18.2%
Turn = 0 x 2 = 0.0%
River = 0 x 4 = 0.0%
0.0% < 18.2% => FOLD
```
- Observaciones:
  - cartas muertas detectadas: no
  - duplicados: no
  - modo interno correcto: si
  - calculo por calle correcto: si
  - JUGADA/OUTS/Reveal correcto: si
  - bug encontrado: no

## TEST 007 · Doble gutshot
- Estado esperado de ejecucion: OK
- Export bruto del Pot Odds Trainer
```text
POT ODDS TRAINER
Modo interno: DRAW_MODE
Hero: 8♦ J♣
Villain: --
Board: 9♠ T♥ 2♦
Turn: --
River: --
Cartas muertas: 8♦ J♣ 9♠ T♥ 2♦
Available deck: 47

Bote: 32
Apuesta: 11
Ratio: 3.91:1
Equity necesaria: 20.4%
Mano Hero: Carta alta J
Mano Villain: --

Outs positivas: N/A
Outs negativas: N/A
Outs limpias: 7♠ 7♥ 7♦ 7♣ Q♠ Q♥ Q♦ Q♣
Outs marginales: 2♠ 2♥ 2♣ 8♠ 8♥ 8♣ 9♥ 9♦ 9♣ T♠ T♦ T♣ J♠ J♥ J♦
Outs brutas: 2♠ 2♥ 2♣ 7♠ 7♥ 7♦ 7♣ 8♠ 8♥ 8♣ 9♥ 9♦ 9♣ T♠ T♦ T♣ J♠ J♥ J♦ Q♠ Q♥ Q♦ Q♣
Outs utiles decision: 7♠ 7♥ 7♦ 7♣ Q♠ Q♥ Q♦ Q♣

Equity turn: 16.0%
Equity river: 32.0%
Resultado: CALL

Desarrollo:
Bote final = 32 + 11 + 11 = 54
Equity necesaria = 11 / 54 = 20.4%
Turn = 8 x 2 = 16.0%
River = 8 x 4 = 32.0%
32.0% >= 20.4% => CALL
```
- Observaciones:
  - cartas muertas detectadas: no
  - duplicados: no
  - modo interno correcto: si
  - calculo por calle correcto: si
  - JUGADA/OUTS/Reveal correcto: si
  - bug encontrado: no

## TEST 008 · Backdoor flush no cuenta
- Estado esperado de ejecucion: OK
- Export bruto del Pot Odds Trainer
```text
POT ODDS TRAINER
Modo interno: DRAW_MODE
Hero: A♣ K♣
Villain: --
Board: 2♣ 7♦ Q♥
Turn: --
River: --
Cartas muertas: A♣ K♣ 2♣ 7♦ Q♥
Available deck: 47

Bote: 35
Apuesta: 20
Ratio: 2.75:1
Equity necesaria: 26.7%
Mano Hero: Carta alta A
Mano Villain: --

Outs positivas: N/A
Outs negativas: N/A
Outs limpias: --
Outs marginales: 2♠ 2♥ 2♦ 7♠ 7♥ 7♣ Q♠ Q♦ Q♣ K♠ K♥ K♦ A♠ A♥ A♦
Outs brutas: 2♠ 2♥ 2♦ 7♠ 7♥ 7♣ Q♠ Q♦ Q♣ K♠ K♥ K♦ A♠ A♥ A♦
Outs utiles decision: --

Equity turn: 0.0%
Equity river: 0.0%
Resultado: FOLD

Desarrollo:
Bote final = 35 + 20 + 20 = 75
Equity necesaria = 20 / 75 = 26.7%
Turn = 0 x 2 = 0.0%
River = 0 x 4 = 0.0%
0.0% < 26.7% => FOLD
```
- Observaciones:
  - cartas muertas detectadas: no
  - duplicados: no
  - modo interno correcto: si
  - calculo por calle correcto: si
  - JUGADA/OUTS/Reveal correcto: si
  - bug encontrado: no

## TEST 009 · Monotone board sin flush hero
- Estado esperado de ejecucion: OK
- Export bruto del Pot Odds Trainer
```text
POT ODDS TRAINER
Modo interno: DRAW_MODE
Hero: A♦ K♣
Villain: --
Board: 2♠ 7♠ Q♠
Turn: --
River: --
Cartas muertas: A♦ K♣ 2♠ 7♠ Q♠
Available deck: 47

Bote: 38
Apuesta: 13
Ratio: 3.92:1
Equity necesaria: 20.3%
Mano Hero: Carta alta A
Mano Villain: --

Outs positivas: N/A
Outs negativas: N/A
Outs limpias: --
Outs marginales: 2♥ 2♦ 2♣ 7♥ 7♦ 7♣ Q♥ Q♦ Q♣ K♠ K♥ K♦ A♠ A♥ A♣
Outs brutas: 2♥ 2♦ 2♣ 7♥ 7♦ 7♣ Q♥ Q♦ Q♣ K♠ K♥ K♦ A♠ A♥ A♣
Outs utiles decision: --

Equity turn: 0.0%
Equity river: 0.0%
Resultado: FOLD

Desarrollo:
Bote final = 38 + 13 + 13 = 64
Equity necesaria = 13 / 64 = 20.3%
Turn = 0 x 2 = 0.0%
River = 0 x 4 = 0.0%
0.0% < 20.3% => FOLD
```
- Observaciones:
  - cartas muertas detectadas: no
  - duplicados: no
  - modo interno correcto: si
  - calculo por calle correcto: si
  - JUGADA/OUTS/Reveal correcto: si
  - bug encontrado: no

## TEST 010 · Board emparejado con flush draw
- Estado esperado de ejecucion: OK
- Export bruto del Pot Odds Trainer
```text
POT ODDS TRAINER
Modo interno: DRAW_MODE
Hero: A♥ 9♥
Villain: --
Board: 2♥ 2♣ J♥
Turn: --
River: --
Cartas muertas: A♥ 9♥ 2♥ 2♣ J♥
Available deck: 47

Bote: 36
Apuesta: 12
Ratio: 4.00:1
Equity necesaria: 20.0%
Mano Hero: Pareja de 2
Mano Villain: --

Outs positivas: N/A
Outs negativas: N/A
Outs limpias: 3♥ 4♥ 5♥ 6♥ 7♥ 8♥ T♥ Q♥ K♥
Outs marginales: 2♠ 2♦ 9♠ 9♦ 9♣ J♠ J♦ J♣ A♠ A♦ A♣
Outs brutas: 2♠ 2♦ 3♥ 4♥ 5♥ 6♥ 7♥ 8♥ 9♠ 9♦ 9♣ T♥ J♠ J♦ J♣ Q♥ K♥ A♠ A♦ A♣
Outs utiles decision: 3♥ 4♥ 5♥ 6♥ 7♥ 8♥ T♥ Q♥ K♥

Equity turn: 18.0%
Equity river: 36.0%
Resultado: CALL

Desarrollo:
Bote final = 36 + 12 + 12 = 60
Equity necesaria = 12 / 60 = 20.0%
Turn = 9 x 2 = 18.0%
River = 9 x 4 = 36.0%
36.0% >= 20.0% => CALL
```
- Observaciones:
  - cartas muertas detectadas: no
  - duplicados: no
  - modo interno correcto: si
  - calculo por calle correcto: si
  - JUGADA/OUTS/Reveal correcto: si
  - bug encontrado: no

## TEST 011 · Set hecho flop
- Estado esperado de ejecucion: OK
- Export bruto del Pot Odds Trainer
```text
POT ODDS TRAINER
Modo interno: MADE_HAND_MODE
Hero: 9♠ 9♦
Villain: --
Board: 9♣ K♦ 2♥
Turn: --
River: --
Cartas muertas: 9♠ 9♦ 9♣ K♦ 2♥
Available deck: 47

Bote: 45
Apuesta: 20
Ratio: 3.25:1
Equity necesaria: 23.5%
Mano Hero: Trio de 9
Mano Villain: --

Outs positivas: N/A
Outs negativas: N/A
Outs limpias: 2♠ 2♦ 2♣ 9♥ K♠ K♥ K♣
Outs marginales: --
Outs brutas: 2♠ 2♦ 2♣ 9♥ K♠ K♥ K♣
Mejoras posibles: 2♠ 2♦ 2♣ 9♥ K♠ K♥ K♣

Equity turn: N/A
Equity river: N/A
Resultado: MANO HECHA

Desarrollo:
Bote final = 45 + 20 + 20 = 85
Equity necesaria = 20 / 85 = 23.5%
Mano actual = Trio de 9
Mejoras posibles = 2♠ 2♦ 2♣ 9♥ K♠ K♥ K♣
Decision por outs = N/A
```
- Observaciones:
  - cartas muertas detectadas: no
  - duplicados: no
  - modo interno correcto: si
  - calculo por calle correcto: si
  - JUGADA/OUTS/Reveal correcto: si
  - bug encontrado: no

## TEST 012 · Full hecho flop
- Estado esperado de ejecucion: OK
- Export bruto del Pot Odds Trainer
```text
POT ODDS TRAINER
Modo interno: MADE_HAND_MODE
Hero: 7♠ 7♦
Villain: --
Board: 7♥ 2♣ 2♦
Turn: --
River: --
Cartas muertas: 7♠ 7♦ 7♥ 2♣ 2♦
Available deck: 47

Bote: 60
Apuesta: 25
Ratio: 3.40:1
Equity necesaria: 22.7%
Mano Hero: Full de 7 con 2
Mano Villain: --

Outs positivas: N/A
Outs negativas: N/A
Outs limpias: 7♣
Outs marginales: --
Outs brutas: 7♣
Mejoras posibles: 7♣

Equity turn: N/A
Equity river: N/A
Resultado: MANO HECHA

Desarrollo:
Bote final = 60 + 25 + 25 = 110
Equity necesaria = 25 / 110 = 22.7%
Mano actual = Full de 7 con 2
Mejoras posibles = 7♣
Decision por outs = N/A
```
- Observaciones:
  - cartas muertas detectadas: no
  - duplicados: no
  - modo interno correcto: si
  - calculo por calle correcto: si
  - JUGADA/OUTS/Reveal correcto: si
  - bug encontrado: no

## TEST 013 · Flush hecho flop
- Estado esperado de ejecucion: OK
- Export bruto del Pot Odds Trainer
```text
POT ODDS TRAINER
Modo interno: MADE_HAND_MODE
Hero: A♠ 9♠
Villain: --
Board: 2♠ 6♠ J♠
Turn: --
River: --
Cartas muertas: A♠ 9♠ 2♠ 6♠ J♠
Available deck: 47

Bote: 70
Apuesta: 30
Ratio: 3.33:1
Equity necesaria: 23.1%
Mano Hero: Color al A
Mano Villain: --

Outs positivas: N/A
Outs negativas: N/A
Outs limpias: --
Outs marginales: --
Outs brutas: --
Mejoras posibles: --

Equity turn: N/A
Equity river: N/A
Resultado: MANO HECHA

Desarrollo:
Bote final = 70 + 30 + 30 = 130
Equity necesaria = 30 / 130 = 23.1%
Mano actual = Color al A
Mejoras posibles = --
Decision por outs = N/A
```
- Observaciones:
  - cartas muertas detectadas: no
  - duplicados: no
  - modo interno correcto: si
  - calculo por calle correcto: si
  - JUGADA/OUTS/Reveal correcto: si
  - bug encontrado: no

## TEST 014 · Straight hecha flop
- Estado esperado de ejecucion: OK
- Export bruto del Pot Odds Trainer
```text
POT ODDS TRAINER
Modo interno: MADE_HAND_MODE
Hero: 8♣ 9♦
Villain: --
Board: 6♠ 7♥ T♣
Turn: --
River: --
Cartas muertas: 8♣ 9♦ 6♠ 7♥ T♣
Available deck: 47

Bote: 80
Apuesta: 40
Ratio: 3.00:1
Equity necesaria: 25.0%
Mano Hero: Escalera al T
Mano Villain: --

Outs positivas: N/A
Outs negativas: N/A
Outs limpias: J♠ J♥ J♦ J♣
Outs marginales: --
Outs brutas: J♠ J♥ J♦ J♣
Mejoras posibles: J♠ J♥ J♦ J♣

Equity turn: N/A
Equity river: N/A
Resultado: MANO HECHA

Desarrollo:
Bote final = 80 + 40 + 40 = 160
Equity necesaria = 40 / 160 = 25.0%
Mano actual = Escalera al T
Mejoras posibles = J♠ J♥ J♦ J♣
Decision por outs = N/A
```
- Observaciones:
  - cartas muertas detectadas: no
  - duplicados: no
  - modo interno correcto: si
  - calculo por calle correcto: si
  - JUGADA/OUTS/Reveal correcto: si
  - bug encontrado: no

## TEST 015 · Doble pareja flop
- Estado esperado de ejecucion: OK
- Export bruto del Pot Odds Trainer
```text
POT ODDS TRAINER
Modo interno: MADE_HAND_MODE
Hero: K♠ Q♠
Villain: --
Board: K♦ Q♥ T♣
Turn: --
River: --
Cartas muertas: K♠ Q♠ K♦ Q♥ T♣
Available deck: 47

Bote: 55
Apuesta: 25
Ratio: 3.20:1
Equity necesaria: 23.8%
Mano Hero: Doble pareja de K y Q
Mano Villain: --

Outs positivas: N/A
Outs negativas: N/A
Outs limpias: Q♦ Q♣ K♥ K♣
Outs marginales: --
Outs brutas: Q♦ Q♣ K♥ K♣
Mejoras posibles: Q♦ Q♣ K♥ K♣

Equity turn: N/A
Equity river: N/A
Resultado: MANO HECHA

Desarrollo:
Bote final = 55 + 25 + 25 = 105
Equity necesaria = 25 / 105 = 23.8%
Mano actual = Doble pareja de K y Q
Mejoras posibles = Q♦ Q♣ K♥ K♣
Decision por outs = N/A
```
- Observaciones:
  - cartas muertas detectadas: no
  - duplicados: no
  - modo interno correcto: si
  - calculo por calle correcto: si
  - JUGADA/OUTS/Reveal correcto: si
  - bug encontrado: no

## TEST 016 · Trips por board
- Estado esperado de ejecucion: OK
- Export bruto del Pot Odds Trainer
```text
POT ODDS TRAINER
Modo interno: MADE_HAND_MODE
Hero: A♠ K♦
Villain: --
Board: 7♣ 7♦ 7♥
Turn: --
River: --
Cartas muertas: A♠ K♦ 7♣ 7♦ 7♥
Available deck: 47

Bote: 28
Apuesta: 9
Ratio: 4.11:1
Equity necesaria: 19.6%
Mano Hero: Trio de 7
Mano Villain: --

Outs positivas: N/A
Outs negativas: N/A
Outs limpias: K♠ K♥ K♣ A♥ A♦ A♣
Outs marginales: 7♠
Outs brutas: 7♠ K♠ K♥ K♣ A♥ A♦ A♣
Mejoras posibles: K♠ K♥ K♣ A♥ A♦ A♣

Equity turn: N/A
Equity river: N/A
Resultado: MANO HECHA

Desarrollo:
Bote final = 28 + 9 + 9 = 46
Equity necesaria = 9 / 46 = 19.6%
Mano actual = Trio de 7
Mejoras posibles = K♠ K♥ K♣ A♥ A♦ A♣
Decision por outs = N/A
```
- Observaciones:
  - cartas muertas detectadas: no
  - duplicados: no
  - modo interno correcto: si
  - calculo por calle correcto: si
  - JUGADA/OUTS/Reveal correcto: si
  - bug encontrado: no

## TEST 017 · Pocket pair sobre board bajo
- Estado esperado de ejecucion: OK
- Export bruto del Pot Odds Trainer
```text
POT ODDS TRAINER
Modo interno: DRAW_MODE
Hero: T♠ T♦
Villain: --
Board: 2♣ 7♦ 8♥
Turn: --
River: --
Cartas muertas: T♠ T♦ 2♣ 7♦ 8♥
Available deck: 47

Bote: 42
Apuesta: 14
Ratio: 4.00:1
Equity necesaria: 20.0%
Mano Hero: Pareja de T
Mano Villain: --

Outs positivas: N/A
Outs negativas: N/A
Outs limpias: --
Outs marginales: 2♠ 2♥ 2♦ 7♠ 7♥ 7♣ 8♠ 8♦ 8♣ T♥ T♣
Outs brutas: 2♠ 2♥ 2♦ 7♠ 7♥ 7♣ 8♠ 8♦ 8♣ T♥ T♣
Outs utiles decision: --

Equity turn: 0.0%
Equity river: 0.0%
Resultado: FOLD

Desarrollo:
Bote final = 42 + 14 + 14 = 70
Equity necesaria = 14 / 70 = 20.0%
Turn = 0 x 2 = 0.0%
River = 0 x 4 = 0.0%
0.0% < 20.0% => FOLD
```
- Observaciones:
  - cartas muertas detectadas: no
  - duplicados: no
  - modo interno correcto: si
  - calculo por calle correcto: si
  - JUGADA/OUTS/Reveal correcto: si
  - bug encontrado: no

## TEST 018 · Top pair con kicker
- Estado esperado de ejecucion: OK
- Export bruto del Pot Odds Trainer
```text
POT ODDS TRAINER
Modo interno: DRAW_MODE
Hero: A♠ Q♦
Villain: --
Board: A♣ 7♦ 2♥
Turn: --
River: --
Cartas muertas: A♠ Q♦ A♣ 7♦ 2♥
Available deck: 47

Bote: 44
Apuesta: 16
Ratio: 3.75:1
Equity necesaria: 21.1%
Mano Hero: Pareja de A
Mano Villain: --

Outs positivas: N/A
Outs negativas: N/A
Outs limpias: --
Outs marginales: 2♠ 2♦ 2♣ 7♠ 7♥ 7♣ Q♠ Q♥ Q♣ A♥ A♦
Outs brutas: 2♠ 2♦ 2♣ 7♠ 7♥ 7♣ Q♠ Q♥ Q♣ A♥ A♦
Outs utiles decision: --

Equity turn: 0.0%
Equity river: 0.0%
Resultado: FOLD

Desarrollo:
Bote final = 44 + 16 + 16 = 76
Equity necesaria = 16 / 76 = 21.1%
Turn = 0 x 2 = 0.0%
River = 0 x 4 = 0.0%
0.0% < 21.1% => FOLD
```
- Observaciones:
  - cartas muertas detectadas: no
  - duplicados: no
  - modo interno correcto: si
  - calculo por calle correcto: si
  - JUGADA/OUTS/Reveal correcto: si
  - bug encontrado: no

## TEST 019 · Two overcards + gutshot
- Estado esperado de ejecucion: OK
- Export bruto del Pot Odds Trainer
```text
POT ODDS TRAINER
Modo interno: DRAW_MODE
Hero: A♠ K♦
Villain: --
Board: Q♣ T♦ 2♥
Turn: --
River: --
Cartas muertas: A♠ K♦ Q♣ T♦ 2♥
Available deck: 47

Bote: 48
Apuesta: 17
Ratio: 3.82:1
Equity necesaria: 20.7%
Mano Hero: Carta alta A
Mano Villain: --

Outs positivas: N/A
Outs negativas: N/A
Outs limpias: J♠ J♥ J♦ J♣
Outs marginales: 2♠ 2♦ 2♣ T♠ T♥ T♣ Q♠ Q♥ Q♦ K♠ K♥ K♣ A♥ A♦ A♣
Outs brutas: 2♠ 2♦ 2♣ T♠ T♥ T♣ J♠ J♥ J♦ J♣ Q♠ Q♥ Q♦ K♠ K♥ K♣ A♥ A♦ A♣
Outs utiles decision: J♠ J♥ J♦ J♣

Equity turn: 8.0%
Equity river: 16.0%
Resultado: FOLD

Desarrollo:
Bote final = 48 + 17 + 17 = 82
Equity necesaria = 17 / 82 = 20.7%
Turn = 4 x 2 = 8.0%
River = 4 x 4 = 16.0%
16.0% < 20.7% => FOLD
```
- Observaciones:
  - cartas muertas detectadas: no
  - duplicados: no
  - modo interno correcto: si
  - calculo por calle correcto: si
  - JUGADA/OUTS/Reveal correcto: si
  - bug encontrado: no

## TEST 020 · OESD con pareja
- Estado esperado de ejecucion: OK
- Export bruto del Pot Odds Trainer
```text
POT ODDS TRAINER
Modo interno: DRAW_MODE
Hero: 8♣ 8♦
Villain: --
Board: 6♠ 7♥ 9♣
Turn: --
River: --
Cartas muertas: 8♣ 8♦ 6♠ 7♥ 9♣
Available deck: 47

Bote: 52
Apuesta: 18
Ratio: 3.89:1
Equity necesaria: 20.5%
Mano Hero: Pareja de 8
Mano Villain: --

Outs positivas: N/A
Outs negativas: N/A
Outs limpias: 5♠ 5♥ 5♦ 5♣ T♠ T♥ T♦ T♣
Outs marginales: 6♥ 6♦ 6♣ 7♠ 7♦ 7♣ 8♠ 8♥ 9♠ 9♥ 9♦
Outs brutas: 5♠ 5♥ 5♦ 5♣ 6♥ 6♦ 6♣ 7♠ 7♦ 7♣ 8♠ 8♥ 9♠ 9♥ 9♦ T♠ T♥ T♦ T♣
Outs utiles decision: 5♠ 5♥ 5♦ 5♣ T♠ T♥ T♦ T♣

Equity turn: 16.0%
Equity river: 32.0%
Resultado: CALL

Desarrollo:
Bote final = 52 + 18 + 18 = 88
Equity necesaria = 18 / 88 = 20.5%
Turn = 8 x 2 = 16.0%
River = 8 x 4 = 32.0%
32.0% >= 20.5% => CALL
```
- Observaciones:
  - cartas muertas detectadas: no
  - duplicados: no
  - modo interno correcto: si
  - calculo por calle correcto: si
  - JUGADA/OUTS/Reveal correcto: si
  - bug encontrado: no

## TEST 021 · Flush draw blocker muerto
- Estado esperado de ejecucion: OK
- Export bruto del Pot Odds Trainer
```text
POT ODDS TRAINER
Modo interno: DRAW_MODE
Hero: A♣ 7♣
Villain: K♣ Q♦
Board: 2♣ 9♣ J♥
Turn: --
River: --
Cartas muertas: A♣ 7♣ 2♣ 9♣ J♥ K♣ Q♦
Available deck: 45

Bote: 40
Apuesta: 15
Ratio: 3.67:1
Equity necesaria: 21.4%
Mano Hero: Carta alta A
Mano Villain: Carta alta K

Outs positivas: 3♣ 4♣ 5♣ 6♣ 8♣ T♣ J♣ Q♣
Outs negativas: --
Outs limpias: 3♣ 4♣ 5♣ 6♣ 8♣ T♣ J♣ Q♣
Outs marginales: 2♠ 2♥ 2♦ 7♠ 7♥ 7♦ 9♠ 9♥ 9♦ J♠ J♦ A♠ A♥ A♦
Outs brutas: 2♠ 2♥ 2♦ 3♣ 4♣ 5♣ 6♣ 7♠ 7♥ 7♦ 8♣ 9♠ 9♥ 9♦ T♣ J♠ J♦ J♣ Q♣ A♠ A♥ A♦
Outs utiles decision: 3♣ 4♣ 5♣ 6♣ 8♣ T♣ J♣ Q♣

Equity turn: 16.0%
Equity river: 32.0%
Resultado: CALL

Desarrollo:
Bote final = 40 + 15 + 15 = 70
Equity necesaria = 15 / 70 = 21.4%
Turn = 8 x 2 = 16.0%
River = 8 x 4 = 32.0%
32.0% >= 21.4% => CALL
```
- Observaciones:
  - cartas muertas detectadas: no
  - duplicados: no
  - modo interno correcto: si
  - calculo por calle correcto: si
  - JUGADA/OUTS/Reveal correcto: si
  - bug encontrado: no

## TEST 022 · OESD con blockers Villain
- Estado esperado de ejecucion: OK
- Export bruto del Pot Odds Trainer
```text
POT ODDS TRAINER
Modo interno: DRAW_MODE
Hero: 8♠ 9♠
Villain: T♦ T♣
Board: 6♥ 7♦ K♣
Turn: --
River: --
Cartas muertas: 8♠ 9♠ 6♥ 7♦ K♣ T♦ T♣
Available deck: 45

Bote: 44
Apuesta: 18
Ratio: 3.44:1
Equity necesaria: 22.5%
Mano Hero: Carta alta K
Mano Villain: Pareja de T

Outs positivas: 5♠ 5♥ 5♦ 5♣ T♠ T♥
Outs negativas: --
Outs limpias: 5♠ 5♥ 5♦ 5♣ T♠ T♥
Outs marginales: 6♠ 6♦ 6♣ 7♠ 7♥ 7♣ 8♥ 8♦ 8♣ 9♥ 9♦ 9♣ K♠ K♥ K♦
Outs brutas: 5♠ 5♥ 5♦ 5♣ 6♠ 6♦ 6♣ 7♠ 7♥ 7♣ 8♥ 8♦ 8♣ 9♥ 9♦ 9♣ T♠ T♥ K♠ K♥ K♦
Outs utiles decision: 5♠ 5♥ 5♦ 5♣ T♠ T♥

Equity turn: 12.0%
Equity river: 24.0%
Resultado: CALL

Desarrollo:
Bote final = 44 + 18 + 18 = 80
Equity necesaria = 18 / 80 = 22.5%
Turn = 6 x 2 = 12.0%
River = 6 x 4 = 24.0%
24.0% >= 22.5% => CALL
```
- Observaciones:
  - cartas muertas detectadas: no
  - duplicados: no
  - modo interno correcto: si
  - calculo por calle correcto: si
  - JUGADA/OUTS/Reveal correcto: si
  - bug encontrado: no

## TEST 023 · Combo draw con blockers
- Estado esperado de ejecucion: OK
- Export bruto del Pot Odds Trainer
```text
POT ODDS TRAINER
Modo interno: DRAW_MODE
Hero: A♣ K♣
Villain: Q♠ Q♥
Board: J♣ T♣ 2♦
Turn: --
River: --
Cartas muertas: A♣ K♣ J♣ T♣ 2♦ Q♠ Q♥
Available deck: 45

Bote: 100
Apuesta: 40
Ratio: 3.50:1
Equity necesaria: 22.2%
Mano Hero: Carta alta A
Mano Villain: Pareja de Q

Outs positivas: 2♣ 3♣ 4♣ 5♣ 6♣ 7♣ 8♣ 9♣ Q♦ Q♣
Outs negativas: --
Outs limpias: 2♣ 3♣ 4♣ 5♣ 6♣ 7♣ 8♣ 9♣ Q♦ Q♣
Outs marginales: 2♠ 2♥ T♠ T♥ T♦ J♠ J♥ J♦ K♠ K♥ K♦ A♠ A♥ A♦
Outs brutas: 2♠ 2♥ 2♣ 3♣ 4♣ 5♣ 6♣ 7♣ 8♣ 9♣ T♠ T♥ T♦ J♠ J♥ J♦ Q♦ Q♣ K♠ K♥ K♦ A♠ A♥ A♦
Outs utiles decision: 2♣ 3♣ 4♣ 5♣ 6♣ 7♣ 8♣ 9♣ Q♦ Q♣

Equity turn: 20.0%
Equity river: 40.0%
Resultado: CALL

Desarrollo:
Bote final = 100 + 40 + 40 = 180
Equity necesaria = 40 / 180 = 22.2%
Turn = 10 x 2 = 20.0%
River = 10 x 4 = 40.0%
40.0% >= 22.2% => CALL
```
- Observaciones:
  - cartas muertas detectadas: no
  - duplicados: no
  - modo interno correcto: si
  - calculo por calle correcto: si
  - JUGADA/OUTS/Reveal correcto: si
  - bug encontrado: no

## TEST 024 · Overcards contra pareja
- Estado esperado de ejecucion: OK
- Export bruto del Pot Odds Trainer
```text
POT ODDS TRAINER
Modo interno: DRAW_MODE
Hero: A♠ K♦
Villain: 8♣ 8♥
Board: 2♣ 7♦ Q♥
Turn: --
River: --
Cartas muertas: A♠ K♦ 2♣ 7♦ Q♥ 8♣ 8♥
Available deck: 45

Bote: 35
Apuesta: 10
Ratio: 4.50:1
Equity necesaria: 18.2%
Mano Hero: Carta alta A
Mano Villain: Pareja de 8

Outs positivas: --
Outs negativas: --
Outs limpias: --
Outs marginales: 2♠ 2♥ 2♦ 7♠ 7♥ 7♣ Q♠ Q♦ Q♣ K♠ K♥ K♣ A♥ A♦ A♣
Outs brutas: 2♠ 2♥ 2♦ 7♠ 7♥ 7♣ Q♠ Q♦ Q♣ K♠ K♥ K♣ A♥ A♦ A♣
Outs utiles decision: --

Equity turn: 0.0%
Equity river: 0.0%
Resultado: FOLD

Desarrollo:
Bote final = 35 + 10 + 10 = 55
Equity necesaria = 10 / 55 = 18.2%
Turn = 0 x 2 = 0.0%
River = 0 x 4 = 0.0%
0.0% < 18.2% => FOLD
```
- Observaciones:
  - cartas muertas detectadas: no
  - duplicados: no
  - modo interno correcto: si
  - calculo por calle correcto: si
  - JUGADA/OUTS/Reveal correcto: si
  - bug encontrado: no

## TEST 025 · Doble pareja va perdiendo vs straight
- Estado esperado de ejecucion: OK
- Export bruto del Pot Odds Trainer
```text
POT ODDS TRAINER
Modo interno: MADE_HAND_BEHIND_MODE
Hero: K♠ Q♠
Villain: A♦ J♦
Board: K♦ Q♥ T♣
Turn: --
River: --
Cartas muertas: K♠ Q♠ K♦ Q♥ T♣ A♦ J♦
Available deck: 45

Bote: 55
Apuesta: 25
Ratio: 3.20:1
Equity necesaria: 23.8%
Mano Hero: Doble pareja de K y Q
Mano Villain: Escalera al A

Outs positivas: Q♦ Q♣ K♥ K♣
Outs negativas: --
Outs limpias: Q♦ Q♣ K♥ K♣
Outs marginales: --
Outs brutas: Q♦ Q♣ K♥ K♣
Outs utiles decision: Q♦ Q♣ K♥ K♣

Equity turn: 8.0%
Equity river: 16.0%
Resultado: FOLD

Desarrollo:
Bote final = 55 + 25 + 25 = 105
Equity necesaria = 25 / 105 = 23.8%
Turn = 4 x 2 = 8.0%
River = 4 x 4 = 16.0%
16.0% < 23.8% => FOLD
Aviso: Hero tiene mano hecha, pero va por detras y busca mejorar.
```
- Observaciones:
  - cartas muertas detectadas: no
  - duplicados: no
  - modo interno correcto: si
  - calculo por calle correcto: si
  - JUGADA/OUTS/Reveal correcto: si
  - bug encontrado: no

## TEST 026 · Set vs overpair
- Estado esperado de ejecucion: OK
- Export bruto del Pot Odds Trainer
```text
POT ODDS TRAINER
Modo interno: MADE_HAND_MODE
Hero: 9♠ 9♦
Villain: A♥ A♣
Board: 9♣ K♦ 2♥
Turn: --
River: --
Cartas muertas: 9♠ 9♦ 9♣ K♦ 2♥ A♥ A♣
Available deck: 45

Bote: 45
Apuesta: 20
Ratio: 3.25:1
Equity necesaria: 23.5%
Mano Hero: Trio de 9
Mano Villain: Pareja de A

Outs positivas: 2♠ 2♦ 2♣ 9♥ K♠ K♥ K♣
Outs negativas: --
Outs limpias: 2♠ 2♦ 2♣ 9♥ K♠ K♥ K♣
Outs marginales: --
Outs brutas: 2♠ 2♦ 2♣ 9♥ K♠ K♥ K♣
Mejoras posibles: 2♠ 2♦ 2♣ 9♥ K♠ K♥ K♣

Equity turn: N/A
Equity river: N/A
Resultado: MANO HECHA

Desarrollo:
Bote final = 45 + 20 + 20 = 85
Equity necesaria = 20 / 85 = 23.5%
Mano actual = Trio de 9
Mejoras posibles = 2♠ 2♦ 2♣ 9♥ K♠ K♥ K♣
Decision por outs = N/A
```
- Observaciones:
  - cartas muertas detectadas: no
  - duplicados: no
  - modo interno correcto: si
  - calculo por calle correcto: si
  - JUGADA/OUTS/Reveal correcto: si
  - bug encontrado: no

## TEST 027 · Full hecho vs trips rival
- Estado esperado de ejecucion: OK
- Export bruto del Pot Odds Trainer
```text
POT ODDS TRAINER
Modo interno: MADE_HAND_MODE
Hero: A♠ A♦
Villain: K♣ Q♣
Board: A♣ K♦ K♥
Turn: --
River: --
Cartas muertas: A♠ A♦ A♣ K♦ K♥ K♣ Q♣
Available deck: 45

Bote: 90
Apuesta: 35
Ratio: 3.57:1
Equity necesaria: 21.9%
Mano Hero: Full de A con K
Mano Villain: Trio de K

Outs positivas: A♥
Outs negativas: --
Outs limpias: A♥
Outs marginales: --
Outs brutas: A♥
Mejoras posibles: A♥

Equity turn: N/A
Equity river: N/A
Resultado: MANO HECHA

Desarrollo:
Bote final = 90 + 35 + 35 = 160
Equity necesaria = 35 / 160 = 21.9%
Mano actual = Full de A con K
Mejoras posibles = A♥
Decision por outs = N/A
```
- Observaciones:
  - cartas muertas detectadas: no
  - duplicados: no
  - modo interno correcto: si
  - calculo por calle correcto: si
  - JUGADA/OUTS/Reveal correcto: si
  - bug encontrado: no

## TEST 028 · Flush hecho vs mano menor
- Estado esperado de ejecucion: OK
- Export bruto del Pot Odds Trainer
```text
POT ODDS TRAINER
Modo interno: MADE_HAND_MODE
Hero: A♠ 9♠
Villain: K♥ Q♥
Board: 2♠ 6♠ J♠
Turn: --
River: --
Cartas muertas: A♠ 9♠ 2♠ 6♠ J♠ K♥ Q♥
Available deck: 45

Bote: 70
Apuesta: 30
Ratio: 3.33:1
Equity necesaria: 23.1%
Mano Hero: Color al A
Mano Villain: Carta alta K

Outs positivas: --
Outs negativas: --
Outs limpias: --
Outs marginales: --
Outs brutas: --
Mejoras posibles: --

Equity turn: N/A
Equity river: N/A
Resultado: MANO HECHA

Desarrollo:
Bote final = 70 + 30 + 30 = 130
Equity necesaria = 30 / 130 = 23.1%
Mano actual = Color al A
Mejoras posibles = --
Decision por outs = N/A
```
- Observaciones:
  - cartas muertas detectadas: no
  - duplicados: no
  - modo interno correcto: si
  - calculo por calle correcto: si
  - JUGADA/OUTS/Reveal correcto: si
  - bug encontrado: no

## TEST 029 · Straight hecho vs overpair
- Estado esperado de ejecucion: OK
- Export bruto del Pot Odds Trainer
```text
POT ODDS TRAINER
Modo interno: MADE_HAND_MODE
Hero: 8♣ 9♦
Villain: A♠ A♥
Board: 6♠ 7♥ T♣
Turn: --
River: --
Cartas muertas: 8♣ 9♦ 6♠ 7♥ T♣ A♠ A♥
Available deck: 45

Bote: 80
Apuesta: 40
Ratio: 3.00:1
Equity necesaria: 25.0%
Mano Hero: Escalera al T
Mano Villain: Pareja de A

Outs positivas: J♠ J♥ J♦ J♣
Outs negativas: --
Outs limpias: J♠ J♥ J♦ J♣
Outs marginales: --
Outs brutas: J♠ J♥ J♦ J♣
Mejoras posibles: J♠ J♥ J♦ J♣

Equity turn: N/A
Equity river: N/A
Resultado: MANO HECHA

Desarrollo:
Bote final = 80 + 40 + 40 = 160
Equity necesaria = 40 / 160 = 25.0%
Mano actual = Escalera al T
Mejoras posibles = J♠ J♥ J♦ J♣
Decision por outs = N/A
```
- Observaciones:
  - cartas muertas detectadas: no
  - duplicados: no
  - modo interno correcto: si
  - calculo por calle correcto: si
  - JUGADA/OUTS/Reveal correcto: si
  - bug encontrado: no

## TEST 030 · Flush draw dominado blocker A
- Estado esperado de ejecucion: OK
- Export bruto del Pot Odds Trainer
```text
POT ODDS TRAINER
Modo interno: DRAW_MODE
Hero: Q♣ 8♣
Villain: A♣ K♦
Board: 2♣ 6♣ J♠
Turn: --
River: --
Cartas muertas: Q♣ 8♣ 2♣ 6♣ J♠ A♣ K♦
Available deck: 45

Bote: 42
Apuesta: 14
Ratio: 4.00:1
Equity necesaria: 20.0%
Mano Hero: Carta alta Q
Mano Villain: Carta alta A

Outs positivas: 3♣ 4♣ 5♣ 7♣ 9♣ T♣ J♣ K♣
Outs negativas: --
Outs limpias: 3♣ 4♣ 5♣ 7♣ 9♣ T♣ J♣ K♣
Outs marginales: 2♠ 2♥ 2♦ 6♠ 6♥ 6♦ 8♠ 8♥ 8♦ J♥ J♦ Q♠ Q♥ Q♦
Outs brutas: 2♠ 2♥ 2♦ 3♣ 4♣ 5♣ 6♠ 6♥ 6♦ 7♣ 8♠ 8♥ 8♦ 9♣ T♣ J♥ J♦ J♣ Q♠ Q♥ Q♦ K♣
Outs utiles decision: 3♣ 4♣ 5♣ 7♣ 9♣ T♣ J♣ K♣

Equity turn: 16.0%
Equity river: 32.0%
Resultado: CALL

Desarrollo:
Bote final = 42 + 14 + 14 = 70
Equity necesaria = 14 / 70 = 20.0%
Turn = 8 x 2 = 16.0%
River = 8 x 4 = 32.0%
32.0% >= 20.0% => CALL
```
- Observaciones:
  - cartas muertas detectadas: no
  - duplicados: no
  - modo interno correcto: si
  - calculo por calle correcto: si
  - JUGADA/OUTS/Reveal correcto: si
  - bug encontrado: no

## TEST 031 · Nut flush draw vs pair
- Estado esperado de ejecucion: OK
- Export bruto del Pot Odds Trainer
```text
POT ODDS TRAINER
Modo interno: DRAW_MODE
Hero: K♦ 4♦
Villain: Q♣ Q♥
Board: A♦ 8♦ 3♠
Turn: --
River: --
Cartas muertas: K♦ 4♦ A♦ 8♦ 3♠ Q♣ Q♥
Available deck: 45

Bote: 48
Apuesta: 16
Ratio: 4.00:1
Equity necesaria: 20.0%
Mano Hero: Carta alta A
Mano Villain: Pareja de Q

Outs positivas: 2♦ 3♦ 5♦ 6♦ 7♦ 9♦ T♦ J♦ Q♦
Outs negativas: --
Outs limpias: 2♦ 3♦ 5♦ 6♦ 7♦ 9♦ T♦ J♦ Q♦
Outs marginales: 3♥ 3♣ 4♠ 4♥ 4♣ 8♠ 8♥ 8♣ K♠ K♥ K♣ A♠ A♥ A♣
Outs brutas: 2♦ 3♥ 3♦ 3♣ 4♠ 4♥ 4♣ 5♦ 6♦ 7♦ 8♠ 8♥ 8♣ 9♦ T♦ J♦ Q♦ K♠ K♥ K♣ A♠ A♥ A♣
Outs utiles decision: 2♦ 3♦ 5♦ 6♦ 7♦ 9♦ T♦ J♦ Q♦

Equity turn: 18.0%
Equity river: 36.0%
Resultado: CALL

Desarrollo:
Bote final = 48 + 16 + 16 = 80
Equity necesaria = 16 / 80 = 20.0%
Turn = 9 x 2 = 18.0%
River = 9 x 4 = 36.0%
36.0% >= 20.0% => CALL
```
- Observaciones:
  - cartas muertas detectadas: no
  - duplicados: no
  - modo interno correcto: si
  - calculo por calle correcto: si
  - JUGADA/OUTS/Reveal correcto: si
  - bug encontrado: no

## TEST 032 · Board emparejado con Villain broadways
- Estado esperado de ejecucion: OK
- Export bruto del Pot Odds Trainer
```text
POT ODDS TRAINER
Modo interno: DRAW_MODE
Hero: A♥ 9♥
Villain: K♠ Q♠
Board: 2♥ 2♣ J♥
Turn: --
River: --
Cartas muertas: A♥ 9♥ 2♥ 2♣ J♥ K♠ Q♠
Available deck: 45

Bote: 36
Apuesta: 12
Ratio: 4.00:1
Equity necesaria: 20.0%
Mano Hero: Pareja de 2
Mano Villain: Pareja de 2

Outs positivas: 3♥ 4♥ 5♥ 6♥ 7♥ 8♥ T♥ Q♥ K♥
Outs negativas: --
Outs limpias: 3♥ 4♥ 5♥ 6♥ 7♥ 8♥ T♥ Q♥ K♥
Outs marginales: 2♠ 2♦ 9♠ 9♦ 9♣ J♠ J♦ J♣ A♠ A♦ A♣
Outs brutas: 2♠ 2♦ 3♥ 4♥ 5♥ 6♥ 7♥ 8♥ 9♠ 9♦ 9♣ T♥ J♠ J♦ J♣ Q♥ K♥ A♠ A♦ A♣
Outs utiles decision: 3♥ 4♥ 5♥ 6♥ 7♥ 8♥ T♥ Q♥ K♥

Equity turn: 18.0%
Equity river: 36.0%
Resultado: CALL

Desarrollo:
Bote final = 36 + 12 + 12 = 60
Equity necesaria = 12 / 60 = 20.0%
Turn = 9 x 2 = 18.0%
River = 9 x 4 = 36.0%
36.0% >= 20.0% => CALL
```
- Observaciones:
  - cartas muertas detectadas: no
  - duplicados: no
  - modo interno correcto: si
  - calculo por calle correcto: si
  - JUGADA/OUTS/Reveal correcto: si
  - bug encontrado: no

## TEST 033 · OESD donde Villain bloquea low end
- Estado esperado de ejecucion: OK
- Export bruto del Pot Odds Trainer
```text
POT ODDS TRAINER
Modo interno: DRAW_MODE
Hero: 4♣ 5♣
Villain: 3♦ 3♠
Board: 6♥ 7♦ K♣
Turn: --
River: --
Cartas muertas: 4♣ 5♣ 6♥ 7♦ K♣ 3♦ 3♠
Available deck: 45

Bote: 40
Apuesta: 12
Ratio: 4.33:1
Equity necesaria: 18.8%
Mano Hero: Carta alta K
Mano Villain: Pareja de 3

Outs positivas: 3♥ 3♣ 8♠ 8♥ 8♦ 8♣
Outs negativas: --
Outs limpias: 3♥ 3♣ 8♠ 8♥ 8♦ 8♣
Outs marginales: 4♠ 4♥ 4♦ 5♠ 5♥ 5♦ 6♠ 6♦ 6♣ 7♠ 7♥ 7♣ K♠ K♥ K♦
Outs brutas: 3♥ 3♣ 4♠ 4♥ 4♦ 5♠ 5♥ 5♦ 6♠ 6♦ 6♣ 7♠ 7♥ 7♣ 8♠ 8♥ 8♦ 8♣ K♠ K♥ K♦
Outs utiles decision: 3♥ 3♣ 8♠ 8♥ 8♦ 8♣

Equity turn: 12.0%
Equity river: 24.0%
Resultado: CALL

Desarrollo:
Bote final = 40 + 12 + 12 = 64
Equity necesaria = 12 / 64 = 18.8%
Turn = 6 x 2 = 12.0%
River = 6 x 4 = 24.0%
24.0% >= 18.8% => CALL
```
- Observaciones:
  - cartas muertas detectadas: no
  - duplicados: no
  - modo interno correcto: si
  - calculo por calle correcto: si
  - JUGADA/OUTS/Reveal correcto: si
  - bug encontrado: no

## TEST 034 · Gutshot con blocker Villain
- Estado esperado de ejecucion: OK
- Export bruto del Pot Odds Trainer
```text
POT ODDS TRAINER
Modo interno: DRAW_MODE
Hero: 5♦ 9♣
Villain: 7♠ A♣
Board: 6♠ 8♥ A♦
Turn: --
River: --
Cartas muertas: 5♦ 9♣ 6♠ 8♥ A♦ 7♠ A♣
Available deck: 45

Bote: 25
Apuesta: 8
Ratio: 4.13:1
Equity necesaria: 19.5%
Mano Hero: Carta alta A
Mano Villain: Pareja de A

Outs positivas: 7♥ 7♦ 7♣
Outs negativas: --
Outs limpias: 7♥ 7♦ 7♣
Outs marginales: 5♠ 5♥ 5♣ 6♥ 6♦ 6♣ 8♠ 8♦ 8♣ 9♠ 9♥ 9♦ A♠ A♥
Outs brutas: 5♠ 5♥ 5♣ 6♥ 6♦ 6♣ 7♥ 7♦ 7♣ 8♠ 8♦ 8♣ 9♠ 9♥ 9♦ A♠ A♥
Outs utiles decision: 7♥ 7♦ 7♣

Equity turn: 6.0%
Equity river: 12.0%
Resultado: FOLD

Desarrollo:
Bote final = 25 + 8 + 8 = 41
Equity necesaria = 8 / 41 = 19.5%
Turn = 3 x 2 = 6.0%
River = 3 x 4 = 12.0%
12.0% < 19.5% => FOLD
```
- Observaciones:
  - cartas muertas detectadas: no
  - duplicados: no
  - modo interno correcto: si
  - calculo por calle correcto: si
  - JUGADA/OUTS/Reveal correcto: si
  - bug encontrado: no

## TEST 035 · Pair draw sucio contra top pair
- Estado esperado de ejecucion: OK
- Export bruto del Pot Odds Trainer
```text
POT ODDS TRAINER
Modo interno: DRAW_MODE
Hero: K♣ J♦
Villain: A♠ Q♠
Board: 2♥ 7♣ Q♦
Turn: --
River: --
Cartas muertas: K♣ J♦ 2♥ 7♣ Q♦ A♠ Q♠
Available deck: 45

Bote: 40
Apuesta: 15
Ratio: 3.67:1
Equity necesaria: 21.4%
Mano Hero: Carta alta K
Mano Villain: Pareja de Q

Outs positivas: --
Outs negativas: --
Outs limpias: --
Outs marginales: 2♠ 2♦ 2♣ 7♠ 7♥ 7♦ J♠ J♥ J♣ Q♥ Q♣ K♠ K♥ K♦
Outs brutas: 2♠ 2♦ 2♣ 7♠ 7♥ 7♦ J♠ J♥ J♣ Q♥ Q♣ K♠ K♥ K♦
Outs utiles decision: --

Equity turn: 0.0%
Equity river: 0.0%
Resultado: FOLD

Desarrollo:
Bote final = 40 + 15 + 15 = 70
Equity necesaria = 15 / 70 = 21.4%
Turn = 0 x 2 = 0.0%
River = 0 x 4 = 0.0%
0.0% < 21.4% => FOLD
```
- Observaciones:
  - cartas muertas detectadas: no
  - duplicados: no
  - modo interno correcto: si
  - calculo por calle correcto: si
  - JUGADA/OUTS/Reveal correcto: si
  - bug encontrado: no

## TEST 036 · Flush draw pero Villain set
- Estado esperado de ejecucion: OK
- Export bruto del Pot Odds Trainer
```text
POT ODDS TRAINER
Modo interno: DRAW_MODE
Hero: A♦ J♦
Villain: 8♣ 8♥
Board: 2♦ 8♦ K♠
Turn: --
River: --
Cartas muertas: A♦ J♦ 2♦ 8♦ K♠ 8♣ 8♥
Available deck: 45

Bote: 65
Apuesta: 25
Ratio: 3.60:1
Equity necesaria: 21.7%
Mano Hero: Carta alta A
Mano Villain: Trio de 8

Outs positivas: 3♦ 4♦ 5♦ 6♦ 7♦ 9♦ T♦ Q♦
Outs negativas: K♦
Outs limpias: 3♦ 4♦ 5♦ 6♦ 7♦ 9♦ T♦ Q♦ K♦
Outs marginales: 2♠ 2♥ 2♣ 8♠ J♠ J♥ J♣ K♥ K♣ A♠ A♥ A♣
Outs brutas: 2♠ 2♥ 2♣ 3♦ 4♦ 5♦ 6♦ 7♦ 8♠ 9♦ T♦ J♠ J♥ J♣ Q♦ K♥ K♦ K♣ A♠ A♥ A♣
Outs utiles decision: 3♦ 4♦ 5♦ 6♦ 7♦ 9♦ T♦ Q♦

Equity turn: 16.0%
Equity river: 32.0%
Resultado: CALL

Desarrollo:
Bote final = 65 + 25 + 25 = 115
Equity necesaria = 25 / 115 = 21.7%
Turn = 8 x 2 = 16.0%
River = 8 x 4 = 32.0%
32.0% >= 21.7% => CALL
```
- Observaciones:
  - cartas muertas detectadas: no
  - duplicados: no
  - modo interno correcto: si
  - calculo por calle correcto: si
  - JUGADA/OUTS/Reveal correcto: si
  - bug encontrado: no

## TEST 037 · Straight draw vs made flush board
- Estado esperado de ejecucion: OK
- Export bruto del Pot Odds Trainer
```text
POT ODDS TRAINER
Modo interno: MADE_HAND_BEHIND_MODE
Hero: 8♣ 9♦
Villain: A♠ K♠
Board: 6♠ 7♠ T♠
Turn: --
River: --
Cartas muertas: 8♣ 9♦ 6♠ 7♠ T♠ A♠ K♠
Available deck: 45

Bote: 75
Apuesta: 30
Ratio: 3.50:1
Equity necesaria: 22.2%
Mano Hero: Escalera al T
Mano Villain: Color al A

Outs positivas: --
Outs negativas: J♠ J♥ J♦ J♣
Outs limpias: J♠ J♥ J♦ J♣
Outs marginales: --
Outs brutas: J♠ J♥ J♦ J♣
Outs utiles decision: --

Equity turn: 0.0%
Equity river: 0.0%
Resultado: FOLD

Desarrollo:
Bote final = 75 + 30 + 30 = 135
Equity necesaria = 30 / 135 = 22.2%
Turn = 0 x 2 = 0.0%
River = 0 x 4 = 0.0%
0.0% < 22.2% => FOLD
Aviso: Hero tiene mano hecha, pero va por detras y busca mejorar.
```
- Observaciones:
  - cartas muertas detectadas: no
  - duplicados: no
  - modo interno correcto: si
  - calculo por calle correcto: si
  - JUGADA/OUTS/Reveal correcto: si
  - bug encontrado: no

## TEST 038 · Open-ended con suited blockers
- Estado esperado de ejecucion: OK
- Export bruto del Pot Odds Trainer
```text
POT ODDS TRAINER
Modo interno: DRAW_MODE
Hero: J♥ Q♥
Villain: K♥ A♣
Board: 9♠ T♦ 2♥
Turn: --
River: --
Cartas muertas: J♥ Q♥ 9♠ T♦ 2♥ K♥ A♣
Available deck: 45

Bote: 39
Apuesta: 13
Ratio: 4.00:1
Equity necesaria: 20.0%
Mano Hero: Carta alta Q
Mano Villain: Carta alta A

Outs positivas: 8♠ 8♥ 8♦ 8♣ K♠ K♦ K♣
Outs negativas: --
Outs limpias: 8♠ 8♥ 8♦ 8♣ K♠ K♦ K♣
Outs marginales: 2♠ 2♦ 2♣ 9♥ 9♦ 9♣ T♠ T♥ T♣ J♠ J♦ J♣ Q♠ Q♦ Q♣
Outs brutas: 2♠ 2♦ 2♣ 8♠ 8♥ 8♦ 8♣ 9♥ 9♦ 9♣ T♠ T♥ T♣ J♠ J♦ J♣ Q♠ Q♦ Q♣ K♠ K♦ K♣
Outs utiles decision: 8♠ 8♥ 8♦ 8♣ K♠ K♦ K♣

Equity turn: 14.0%
Equity river: 28.0%
Resultado: CALL

Desarrollo:
Bote final = 39 + 13 + 13 = 65
Equity necesaria = 13 / 65 = 20.0%
Turn = 7 x 2 = 14.0%
River = 7 x 4 = 28.0%
28.0% >= 20.0% => CALL
```
- Observaciones:
  - cartas muertas detectadas: no
  - duplicados: no
  - modo interno correcto: si
  - calculo por calle correcto: si
  - JUGADA/OUTS/Reveal correcto: si
  - bug encontrado: no

## TEST 039 · Trips board vs pocket pair
- Estado esperado de ejecucion: OK
- Export bruto del Pot Odds Trainer
```text
POT ODDS TRAINER
Modo interno: MADE_HAND_MODE
Hero: A♠ A♦
Villain: K♣ Q♣
Board: 7♣ 7♦ 7♥
Turn: --
River: --
Cartas muertas: A♠ A♦ 7♣ 7♦ 7♥ K♣ Q♣
Available deck: 45

Bote: 58
Apuesta: 22
Ratio: 3.64:1
Equity necesaria: 21.6%
Mano Hero: Full de 7 con A
Mano Villain: Trio de 7

Outs positivas: A♥ A♣
Outs negativas: --
Outs limpias: A♥ A♣
Outs marginales: 7♠
Outs brutas: 7♠ A♥ A♣
Mejoras posibles: A♥ A♣

Equity turn: N/A
Equity river: N/A
Resultado: MANO HECHA

Desarrollo:
Bote final = 58 + 22 + 22 = 102
Equity necesaria = 22 / 102 = 21.6%
Mano actual = Full de 7 con A
Mejoras posibles = A♥ A♣
Decision por outs = N/A
```
- Observaciones:
  - cartas muertas detectadas: no
  - duplicados: no
  - modo interno correcto: si
  - calculo por calle correcto: si
  - JUGADA/OUTS/Reveal correcto: si
  - bug encontrado: no

## TEST 040 · Bottom set vs flush draw Villain
- Estado esperado de ejecucion: OK
- Export bruto del Pot Odds Trainer
```text
POT ODDS TRAINER
Modo interno: MADE_HAND_MODE
Hero: 2♠ 2♦
Villain: A♣ K♣
Board: 2♥ 9♣ J♣
Turn: --
River: --
Cartas muertas: 2♠ 2♦ 2♥ 9♣ J♣ A♣ K♣
Available deck: 45

Bote: 64
Apuesta: 24
Ratio: 3.67:1
Equity necesaria: 21.4%
Mano Hero: Trio de 2
Mano Villain: Carta alta A

Outs positivas: 2♣ 9♠ 9♥ 9♦ J♠ J♥ J♦
Outs negativas: --
Outs limpias: 2♣ 9♠ 9♥ 9♦ J♠ J♥ J♦
Outs marginales: --
Outs brutas: 2♣ 9♠ 9♥ 9♦ J♠ J♥ J♦
Mejoras posibles: 2♣ 9♠ 9♥ 9♦ J♠ J♥ J♦

Equity turn: N/A
Equity river: N/A
Resultado: MANO HECHA

Desarrollo:
Bote final = 64 + 24 + 24 = 112
Equity necesaria = 24 / 112 = 21.4%
Mano actual = Trio de 2
Mejoras posibles = 2♣ 9♠ 9♥ 9♦ J♠ J♥ J♦
Decision por outs = N/A
```
- Observaciones:
  - cartas muertas detectadas: no
  - duplicados: no
  - modo interno correcto: si
  - calculo por calle correcto: si
  - JUGADA/OUTS/Reveal correcto: si
  - bug encontrado: no

## TEST 041 · Gutshot en turn
- Estado esperado de ejecucion: OK
- Export bruto del Pot Odds Trainer
```text
POT ODDS TRAINER
Modo interno: DRAW_MODE
Hero: 5♦ 9♣
Villain: --
Board: 6♠ 8♥ A♦
Turn: K♣
River: --
Cartas muertas: 5♦ 9♣ 6♠ 8♥ A♦ K♣
Available deck: 46

Bote: 25
Apuesta: 8
Ratio: 4.13:1
Equity necesaria: 19.5%
Mano Hero: Carta alta A
Mano Villain: --

Outs positivas: N/A
Outs negativas: N/A
Outs limpias: 7♠ 7♥ 7♦ 7♣
Outs marginales: 5♠ 5♥ 5♣ 6♥ 6♦ 6♣ 8♠ 8♦ 8♣ 9♠ 9♥ 9♦ K♠ K♥ K♦ A♠ A♥ A♣
Outs brutas: 5♠ 5♥ 5♣ 6♥ 6♦ 6♣ 7♠ 7♥ 7♦ 7♣ 8♠ 8♦ 8♣ 9♠ 9♥ 9♦ K♠ K♥ K♦ A♠ A♥ A♣
Outs utiles decision: 7♠ 7♥ 7♦ 7♣

Equity turn: N/A
Equity river: 8.0%
Resultado: FOLD

Desarrollo:
Bote final = 25 + 8 + 8 = 41
Equity necesaria = 8 / 41 = 19.5%
River = 4 x 2 = 8.0%
8.0% < 19.5% => FOLD
```
- Observaciones:
  - cartas muertas detectadas: no
  - duplicados: no
  - modo interno correcto: si
  - calculo por calle correcto: si
  - JUGADA/OUTS/Reveal correcto: si
  - bug encontrado: no

## TEST 042 · OESD en turn
- Estado esperado de ejecucion: OK
- Export bruto del Pot Odds Trainer
```text
POT ODDS TRAINER
Modo interno: DRAW_MODE
Hero: 8♣ 9♦
Villain: --
Board: 6♠ 7♥ K♦
Turn: 2♣
River: --
Cartas muertas: 8♣ 9♦ 6♠ 7♥ K♦ 2♣
Available deck: 46

Bote: 30
Apuesta: 12
Ratio: 3.50:1
Equity necesaria: 22.2%
Mano Hero: Carta alta K
Mano Villain: --

Outs positivas: N/A
Outs negativas: N/A
Outs limpias: 5♠ 5♥ 5♦ 5♣ T♠ T♥ T♦ T♣
Outs marginales: 2♠ 2♥ 2♦ 6♥ 6♦ 6♣ 7♠ 7♦ 7♣ 8♠ 8♥ 8♦ 9♠ 9♥ 9♣ K♠ K♥ K♣
Outs brutas: 2♠ 2♥ 2♦ 5♠ 5♥ 5♦ 5♣ 6♥ 6♦ 6♣ 7♠ 7♦ 7♣ 8♠ 8♥ 8♦ 9♠ 9♥ 9♣ T♠ T♥ T♦ T♣ K♠ K♥ K♣
Outs utiles decision: 5♠ 5♥ 5♦ 5♣ T♠ T♥ T♦ T♣

Equity turn: N/A
Equity river: 16.0%
Resultado: FOLD

Desarrollo:
Bote final = 30 + 12 + 12 = 54
Equity necesaria = 12 / 54 = 22.2%
River = 8 x 2 = 16.0%
16.0% < 22.2% => FOLD
```
- Observaciones:
  - cartas muertas detectadas: no
  - duplicados: no
  - modo interno correcto: si
  - calculo por calle correcto: si
  - JUGADA/OUTS/Reveal correcto: si
  - bug encontrado: no

## TEST 043 · Flush draw en turn
- Estado esperado de ejecucion: OK
- Export bruto del Pot Odds Trainer
```text
POT ODDS TRAINER
Modo interno: DRAW_MODE
Hero: A♣ 7♣
Villain: --
Board: 2♣ 9♣ J♥
Turn: K♦
River: --
Cartas muertas: A♣ 7♣ 2♣ 9♣ J♥ K♦
Available deck: 46

Bote: 40
Apuesta: 15
Ratio: 3.67:1
Equity necesaria: 21.4%
Mano Hero: Carta alta A
Mano Villain: --

Outs positivas: N/A
Outs negativas: N/A
Outs limpias: 3♣ 4♣ 5♣ 6♣ 8♣ T♣ J♣ Q♣ K♣
Outs marginales: 2♠ 2♥ 2♦ 7♠ 7♥ 7♦ 9♠ 9♥ 9♦ J♠ J♦ K♠ K♥ A♠ A♥ A♦
Outs brutas: 2♠ 2♥ 2♦ 3♣ 4♣ 5♣ 6♣ 7♠ 7♥ 7♦ 8♣ 9♠ 9♥ 9♦ T♣ J♠ J♦ J♣ Q♣ K♠ K♥ K♣ A♠ A♥ A♦
Outs utiles decision: 3♣ 4♣ 5♣ 6♣ 8♣ T♣ J♣ Q♣ K♣

Equity turn: N/A
Equity river: 18.0%
Resultado: FOLD

Desarrollo:
Bote final = 40 + 15 + 15 = 70
Equity necesaria = 15 / 70 = 21.4%
River = 9 x 2 = 18.0%
18.0% < 21.4% => FOLD
```
- Observaciones:
  - cartas muertas detectadas: no
  - duplicados: no
  - modo interno correcto: si
  - calculo por calle correcto: si
  - JUGADA/OUTS/Reveal correcto: si
  - bug encontrado: no

## TEST 044 · Combo draw en turn
- Estado esperado de ejecucion: OK
- Export bruto del Pot Odds Trainer
```text
POT ODDS TRAINER
Modo interno: DRAW_MODE
Hero: 8♣ 9♣
Villain: --
Board: 6♣ 7♣ 2♥
Turn: K♠
River: --
Cartas muertas: 8♣ 9♣ 6♣ 7♣ 2♥ K♠
Available deck: 46

Bote: 50
Apuesta: 20
Ratio: 3.50:1
Equity necesaria: 22.2%
Mano Hero: Carta alta K
Mano Villain: --

Outs positivas: N/A
Outs negativas: N/A
Outs limpias: 2♣ 3♣ 4♣ 5♠ 5♥ 5♦ 5♣ T♠ T♥ T♦ T♣ J♣ Q♣ K♣ A♣
Outs marginales: 2♠ 2♦ 6♠ 6♥ 6♦ 7♠ 7♥ 7♦ 8♠ 8♥ 8♦ 9♠ 9♥ 9♦ K♥ K♦
Outs brutas: 2♠ 2♦ 2♣ 3♣ 4♣ 5♠ 5♥ 5♦ 5♣ 6♠ 6♥ 6♦ 7♠ 7♥ 7♦ 8♠ 8♥ 8♦ 9♠ 9♥ 9♦ T♠ T♥ T♦ T♣ J♣ Q♣ K♥ K♦ K♣ A♣
Outs utiles decision: 2♣ 3♣ 4♣ 5♠ 5♥ 5♦ 5♣ T♠ T♥ T♦ T♣ J♣ Q♣ K♣ A♣

Equity turn: N/A
Equity river: 30.0%
Resultado: CALL

Desarrollo:
Bote final = 50 + 20 + 20 = 90
Equity necesaria = 20 / 90 = 22.2%
River = 15 x 2 = 30.0%
30.0% >= 22.2% => CALL
```
- Observaciones:
  - cartas muertas detectadas: no
  - duplicados: no
  - modo interno correcto: si
  - calculo por calle correcto: si
  - JUGADA/OUTS/Reveal correcto: si
  - bug encontrado: no

## TEST 045 · Proyecto muerto turn
- Estado esperado de ejecucion: OK
- Export bruto del Pot Odds Trainer
```text
POT ODDS TRAINER
Modo interno: DRAW_MODE
Hero: A♣ K♣
Villain: --
Board: 2♣ 7♦ Q♥
Turn: 3♠
River: --
Cartas muertas: A♣ K♣ 2♣ 7♦ Q♥ 3♠
Available deck: 46

Bote: 35
Apuesta: 20
Ratio: 2.75:1
Equity necesaria: 26.7%
Mano Hero: Carta alta A
Mano Villain: --

Outs positivas: N/A
Outs negativas: N/A
Outs limpias: --
Outs marginales: 2♠ 2♥ 2♦ 3♥ 3♦ 3♣ 7♠ 7♥ 7♣ Q♠ Q♦ Q♣ K♠ K♥ K♦ A♠ A♥ A♦
Outs brutas: 2♠ 2♥ 2♦ 3♥ 3♦ 3♣ 7♠ 7♥ 7♣ Q♠ Q♦ Q♣ K♠ K♥ K♦ A♠ A♥ A♦
Outs utiles decision: --

Equity turn: N/A
Equity river: 0.0%
Resultado: FOLD

Desarrollo:
Bote final = 35 + 20 + 20 = 75
Equity necesaria = 20 / 75 = 26.7%
River = 0 x 2 = 0.0%
0.0% < 26.7% => FOLD
```
- Observaciones:
  - cartas muertas detectadas: no
  - duplicados: no
  - modo interno correcto: si
  - calculo por calle correcto: si
  - JUGADA/OUTS/Reveal correcto: si
  - bug encontrado: no

## TEST 046 · Color completado turn
- Estado esperado de ejecucion: OK
- Export bruto del Pot Odds Trainer
```text
POT ODDS TRAINER
Modo interno: MADE_HAND_MODE
Hero: A♣ 7♣
Villain: --
Board: 2♣ 9♣ J♥
Turn: K♣
River: --
Cartas muertas: A♣ 7♣ 2♣ 9♣ J♥ K♣
Available deck: 46

Bote: 40
Apuesta: 20
Ratio: 3.00:1
Equity necesaria: 25.0%
Mano Hero: Color al A
Mano Villain: --

Outs positivas: N/A
Outs negativas: N/A
Outs limpias: --
Outs marginales: --
Outs brutas: --
Mejoras posibles: --

Equity turn: N/A
Equity river: N/A
Resultado: MANO HECHA

Desarrollo:
Bote final = 40 + 20 + 20 = 80
Equity necesaria = 20 / 80 = 25.0%
Mano actual = Color al A
Mejoras posibles = --
Decision por outs = N/A
```
- Observaciones:
  - cartas muertas detectadas: no
  - duplicados: no
  - modo interno correcto: si
  - calculo por calle correcto: si
  - JUGADA/OUTS/Reveal correcto: si
  - bug encontrado: no

## TEST 047 · Escalera completada turn
- Estado esperado de ejecucion: OK
- Export bruto del Pot Odds Trainer
```text
POT ODDS TRAINER
Modo interno: MADE_HAND_MODE
Hero: 8♣ 9♦
Villain: --
Board: 6♠ 7♥ K♦
Turn: T♣
River: --
Cartas muertas: 8♣ 9♦ 6♠ 7♥ K♦ T♣
Available deck: 46

Bote: 50
Apuesta: 20
Ratio: 3.50:1
Equity necesaria: 22.2%
Mano Hero: Escalera al T
Mano Villain: --

Outs positivas: N/A
Outs negativas: N/A
Outs limpias: J♠ J♥ J♦ J♣
Outs marginales: --
Outs brutas: J♠ J♥ J♦ J♣
Mejoras posibles: J♠ J♥ J♦ J♣

Equity turn: N/A
Equity river: N/A
Resultado: MANO HECHA

Desarrollo:
Bote final = 50 + 20 + 20 = 90
Equity necesaria = 20 / 90 = 22.2%
Mano actual = Escalera al T
Mejoras posibles = J♠ J♥ J♦ J♣
Decision por outs = N/A
```
- Observaciones:
  - cartas muertas detectadas: no
  - duplicados: no
  - modo interno correcto: si
  - calculo por calle correcto: si
  - JUGADA/OUTS/Reveal correcto: si
  - bug encontrado: no

## TEST 048 · Set en turn
- Estado esperado de ejecucion: OK
- Export bruto del Pot Odds Trainer
```text
POT ODDS TRAINER
Modo interno: MADE_HAND_MODE
Hero: 9♠ 9♦
Villain: --
Board: 9♣ K♦ 2♥
Turn: A♠
River: --
Cartas muertas: 9♠ 9♦ 9♣ K♦ 2♥ A♠
Available deck: 46

Bote: 45
Apuesta: 20
Ratio: 3.25:1
Equity necesaria: 23.5%
Mano Hero: Trio de 9
Mano Villain: --

Outs positivas: N/A
Outs negativas: N/A
Outs limpias: 2♠ 2♦ 2♣ 9♥ K♠ K♥ K♣ A♥ A♦ A♣
Outs marginales: --
Outs brutas: 2♠ 2♦ 2♣ 9♥ K♠ K♥ K♣ A♥ A♦ A♣
Mejoras posibles: 2♠ 2♦ 2♣ 9♥ K♠ K♥ K♣ A♥ A♦ A♣

Equity turn: N/A
Equity river: N/A
Resultado: MANO HECHA

Desarrollo:
Bote final = 45 + 20 + 20 = 85
Equity necesaria = 20 / 85 = 23.5%
Mano actual = Trio de 9
Mejoras posibles = 2♠ 2♦ 2♣ 9♥ K♠ K♥ K♣ A♥ A♦ A♣
Decision por outs = N/A
```
- Observaciones:
  - cartas muertas detectadas: no
  - duplicados: no
  - modo interno correcto: si
  - calculo por calle correcto: si
  - JUGADA/OUTS/Reveal correcto: si
  - bug encontrado: no

## TEST 049 · Doble pareja en turn
- Estado esperado de ejecucion: OK
- Export bruto del Pot Odds Trainer
```text
POT ODDS TRAINER
Modo interno: MADE_HAND_MODE
Hero: K♠ Q♠
Villain: --
Board: K♦ Q♥ T♣
Turn: 2♠
River: --
Cartas muertas: K♠ Q♠ K♦ Q♥ T♣ 2♠
Available deck: 46

Bote: 55
Apuesta: 25
Ratio: 3.20:1
Equity necesaria: 23.8%
Mano Hero: Doble pareja de K y Q
Mano Villain: --

Outs positivas: N/A
Outs negativas: N/A
Outs limpias: Q♦ Q♣ K♥ K♣
Outs marginales: --
Outs brutas: Q♦ Q♣ K♥ K♣
Mejoras posibles: Q♦ Q♣ K♥ K♣

Equity turn: N/A
Equity river: N/A
Resultado: MANO HECHA

Desarrollo:
Bote final = 55 + 25 + 25 = 105
Equity necesaria = 25 / 105 = 23.8%
Mano actual = Doble pareja de K y Q
Mejoras posibles = Q♦ Q♣ K♥ K♣
Decision por outs = N/A
```
- Observaciones:
  - cartas muertas detectadas: no
  - duplicados: no
  - modo interno correcto: si
  - calculo por calle correcto: si
  - JUGADA/OUTS/Reveal correcto: si
  - bug encontrado: no

## TEST 050 · Board pair turn crea trips
- Estado esperado de ejecucion: OK
- Export bruto del Pot Odds Trainer
```text
POT ODDS TRAINER
Modo interno: MADE_HAND_MODE
Hero: A♠ 2♦
Villain: --
Board: 2♣ 7♦ Q♥
Turn: 2♥
River: --
Cartas muertas: A♠ 2♦ 2♣ 7♦ Q♥ 2♥
Available deck: 46

Bote: 46
Apuesta: 18
Ratio: 3.56:1
Equity necesaria: 22.0%
Mano Hero: Trio de 2
Mano Villain: --

Outs positivas: N/A
Outs negativas: N/A
Outs limpias: 2♠ 7♠ 7♥ 7♣ Q♠ Q♦ Q♣ A♥ A♦ A♣
Outs marginales: --
Outs brutas: 2♠ 7♠ 7♥ 7♣ Q♠ Q♦ Q♣ A♥ A♦ A♣
Mejoras posibles: 2♠ 7♠ 7♥ 7♣ Q♠ Q♦ Q♣ A♥ A♦ A♣

Equity turn: N/A
Equity river: N/A
Resultado: MANO HECHA

Desarrollo:
Bote final = 46 + 18 + 18 = 82
Equity necesaria = 18 / 82 = 22.0%
Mano actual = Trio de 2
Mejoras posibles = 2♠ 7♠ 7♥ 7♣ Q♠ Q♦ Q♣ A♥ A♦ A♣
Decision por outs = N/A
```
- Observaciones:
  - cartas muertas detectadas: no
  - duplicados: no
  - modo interno correcto: si
  - calculo por calle correcto: si
  - JUGADA/OUTS/Reveal correcto: si
  - bug encontrado: no

## TEST 051 · Turn completa board pair peligroso
- Estado esperado de ejecucion: OK
- Export bruto del Pot Odds Trainer
```text
POT ODDS TRAINER
Modo interno: MADE_HAND_MODE
Hero: A♦ J♦
Villain: --
Board: 2♦ 2♠ 8♦
Turn: Q♦
River: --
Cartas muertas: A♦ J♦ 2♦ 2♠ 8♦ Q♦
Available deck: 46

Bote: 64
Apuesta: 22
Ratio: 3.91:1
Equity necesaria: 20.4%
Mano Hero: Color al A
Mano Villain: --

Outs positivas: N/A
Outs negativas: N/A
Outs limpias: --
Outs marginales: --
Outs brutas: --
Mejoras posibles: --

Equity turn: N/A
Equity river: N/A
Resultado: MANO HECHA

Desarrollo:
Bote final = 64 + 22 + 22 = 108
Equity necesaria = 22 / 108 = 20.4%
Mano actual = Color al A
Mejoras posibles = --
Decision por outs = N/A
```
- Observaciones:
  - cartas muertas detectadas: no
  - duplicados: no
  - modo interno correcto: si
  - calculo por calle correcto: si
  - JUGADA/OUTS/Reveal correcto: si
  - bug encontrado: no

## TEST 052 · Turn empareja board con flush draw
- Estado esperado de ejecucion: OK
- Export bruto del Pot Odds Trainer
```text
POT ODDS TRAINER
Modo interno: MADE_HAND_MODE
Hero: A♥ 9♥
Villain: --
Board: 2♥ 2♣ J♥
Turn: J♦
River: --
Cartas muertas: A♥ 9♥ 2♥ 2♣ J♥ J♦
Available deck: 46

Bote: 38
Apuesta: 14
Ratio: 3.71:1
Equity necesaria: 21.2%
Mano Hero: Doble pareja de J y 2
Mano Villain: --

Outs positivas: N/A
Outs negativas: N/A
Outs limpias: 3♥ 4♥ 5♥ 6♥ 7♥ 8♥ T♥ Q♥ K♥
Outs marginales: 2♠ 2♦ 9♠ 9♦ 9♣ J♠ J♣ A♠ A♦ A♣
Outs brutas: 2♠ 2♦ 3♥ 4♥ 5♥ 6♥ 7♥ 8♥ 9♠ 9♦ 9♣ T♥ J♠ J♣ Q♥ K♥ A♠ A♦ A♣
Mejoras posibles: 3♥ 4♥ 5♥ 6♥ 7♥ 8♥ T♥ Q♥ K♥

Equity turn: N/A
Equity river: N/A
Resultado: MANO HECHA

Desarrollo:
Bote final = 38 + 14 + 14 = 66
Equity necesaria = 14 / 66 = 21.2%
Mano actual = Doble pareja de J y 2
Mejoras posibles = 3♥ 4♥ 5♥ 6♥ 7♥ 8♥ T♥ Q♥ K♥
Decision por outs = N/A
```
- Observaciones:
  - cartas muertas detectadas: no
  - duplicados: no
  - modo interno correcto: si
  - calculo por calle correcto: si
  - JUGADA/OUTS/Reveal correcto: si
  - bug encontrado: no

## TEST 053 · Turn da second pair
- Estado esperado de ejecucion: OK
- Export bruto del Pot Odds Trainer
```text
POT ODDS TRAINER
Modo interno: DRAW_MODE
Hero: A♠ K♦
Villain: --
Board: 2♣ 7♦ Q♥
Turn: K♣
River: --
Cartas muertas: A♠ K♦ 2♣ 7♦ Q♥ K♣
Available deck: 46

Bote: 36
Apuesta: 12
Ratio: 4.00:1
Equity necesaria: 20.0%
Mano Hero: Pareja de K
Mano Villain: --

Outs positivas: N/A
Outs negativas: N/A
Outs limpias: --
Outs marginales: 2♠ 2♥ 2♦ 7♠ 7♥ 7♣ Q♠ Q♦ Q♣ K♠ K♥ A♥ A♦ A♣
Outs brutas: 2♠ 2♥ 2♦ 7♠ 7♥ 7♣ Q♠ Q♦ Q♣ K♠ K♥ A♥ A♦ A♣
Outs utiles decision: --

Equity turn: N/A
Equity river: 0.0%
Resultado: FOLD

Desarrollo:
Bote final = 36 + 12 + 12 = 60
Equity necesaria = 12 / 60 = 20.0%
River = 0 x 2 = 0.0%
0.0% < 20.0% => FOLD
```
- Observaciones:
  - cartas muertas detectadas: no
  - duplicados: no
  - modo interno correcto: si
  - calculo por calle correcto: si
  - JUGADA/OUTS/Reveal correcto: si
  - bug encontrado: no

## TEST 054 · Turn abre combo draw
- Estado esperado de ejecucion: OK
- Export bruto del Pot Odds Trainer
```text
POT ODDS TRAINER
Modo interno: DRAW_MODE
Hero: Q♣ J♣
Villain: --
Board: 9♣ 2♦ 3♥
Turn: T♣
River: --
Cartas muertas: Q♣ J♣ 9♣ 2♦ 3♥ T♣
Available deck: 46

Bote: 48
Apuesta: 18
Ratio: 3.67:1
Equity necesaria: 21.4%
Mano Hero: Carta alta Q
Mano Villain: --

Outs positivas: N/A
Outs negativas: N/A
Outs limpias: 2♣ 3♣ 4♣ 5♣ 6♣ 7♣ 8♠ 8♥ 8♦ 8♣ K♠ K♥ K♦ K♣ A♣
Outs marginales: 2♠ 2♥ 3♠ 3♦ 9♠ 9♥ 9♦ T♠ T♥ T♦ J♠ J♥ J♦ Q♠ Q♥ Q♦
Outs brutas: 2♠ 2♥ 2♣ 3♠ 3♦ 3♣ 4♣ 5♣ 6♣ 7♣ 8♠ 8♥ 8♦ 8♣ 9♠ 9♥ 9♦ T♠ T♥ T♦ J♠ J♥ J♦ Q♠ Q♥ Q♦ K♠ K♥ K♦ K♣ A♣
Outs utiles decision: 2♣ 3♣ 4♣ 5♣ 6♣ 7♣ 8♠ 8♥ 8♦ 8♣ K♠ K♥ K♦ K♣ A♣

Equity turn: N/A
Equity river: 30.0%
Resultado: CALL

Desarrollo:
Bote final = 48 + 18 + 18 = 84
Equity necesaria = 18 / 84 = 21.4%
River = 15 x 2 = 30.0%
30.0% >= 21.4% => CALL
```
- Observaciones:
  - cartas muertas detectadas: no
  - duplicados: no
  - modo interno correcto: si
  - calculo por calle correcto: si
  - JUGADA/OUTS/Reveal correcto: si
  - bug encontrado: no

## TEST 055 · Turn mata flush draw
- Estado esperado de ejecucion: OK
- Export bruto del Pot Odds Trainer
```text
POT ODDS TRAINER
Modo interno: DRAW_MODE
Hero: A♣ 7♣
Villain: --
Board: 2♣ 9♣ J♥
Turn: J♦
River: --
Cartas muertas: A♣ 7♣ 2♣ 9♣ J♥ J♦
Available deck: 46

Bote: 44
Apuesta: 18
Ratio: 3.44:1
Equity necesaria: 22.5%
Mano Hero: Pareja de J
Mano Villain: --

Outs positivas: N/A
Outs negativas: N/A
Outs limpias: 3♣ 4♣ 5♣ 6♣ 8♣ T♣ J♣ Q♣ K♣
Outs marginales: 2♠ 2♥ 2♦ 7♠ 7♥ 7♦ 9♠ 9♥ 9♦ J♠ A♠ A♥ A♦
Outs brutas: 2♠ 2♥ 2♦ 3♣ 4♣ 5♣ 6♣ 7♠ 7♥ 7♦ 8♣ 9♠ 9♥ 9♦ T♣ J♠ J♣ Q♣ K♣ A♠ A♥ A♦
Outs utiles decision: 3♣ 4♣ 5♣ 6♣ 8♣ T♣ J♣ Q♣ K♣

Equity turn: N/A
Equity river: 18.0%
Resultado: FOLD

Desarrollo:
Bote final = 44 + 18 + 18 = 80
Equity necesaria = 18 / 80 = 22.5%
River = 9 x 2 = 18.0%
18.0% < 22.5% => FOLD
```
- Observaciones:
  - cartas muertas detectadas: no
  - duplicados: no
  - modo interno correcto: si
  - calculo por calle correcto: si
  - JUGADA/OUTS/Reveal correcto: si
  - bug encontrado: no

## TEST 056 · Turn completa low straight
- Estado esperado de ejecucion: OK
- Export bruto del Pot Odds Trainer
```text
POT ODDS TRAINER
Modo interno: MADE_HAND_MODE
Hero: 4♣ 5♦
Villain: --
Board: 2♠ 3♥ K♦
Turn: A♣
River: --
Cartas muertas: 4♣ 5♦ 2♠ 3♥ K♦ A♣
Available deck: 46

Bote: 30
Apuesta: 10
Ratio: 4.00:1
Equity necesaria: 20.0%
Mano Hero: Escalera al 5
Mano Villain: --

Outs positivas: N/A
Outs negativas: N/A
Outs limpias: 6♠ 6♥ 6♦ 6♣
Outs marginales: --
Outs brutas: 6♠ 6♥ 6♦ 6♣
Mejoras posibles: 6♠ 6♥ 6♦ 6♣

Equity turn: N/A
Equity river: N/A
Resultado: MANO HECHA

Desarrollo:
Bote final = 30 + 10 + 10 = 50
Equity necesaria = 10 / 50 = 20.0%
Mano actual = Escalera al 5
Mejoras posibles = 6♠ 6♥ 6♦ 6♣
Decision por outs = N/A
```
- Observaciones:
  - cartas muertas detectadas: no
  - duplicados: no
  - modo interno correcto: si
  - calculo por calle correcto: si
  - JUGADA/OUTS/Reveal correcto: si
  - bug encontrado: no

## TEST 057 · Turn trae fourth suit no flush
- Estado esperado de ejecucion: OK
- Export bruto del Pot Odds Trainer
```text
POT ODDS TRAINER
Modo interno: DRAW_MODE
Hero: A♣ K♦
Villain: --
Board: 2♠ 7♠ Q♠
Turn: 3♠
River: --
Cartas muertas: A♣ K♦ 2♠ 7♠ Q♠ 3♠
Available deck: 46

Bote: 45
Apuesta: 15
Ratio: 4.00:1
Equity necesaria: 20.0%
Mano Hero: Carta alta A
Mano Villain: --

Outs positivas: N/A
Outs negativas: N/A
Outs limpias: --
Outs marginales: 2♥ 2♦ 2♣ 3♥ 3♦ 3♣ 4♠ 5♠ 6♠ 7♥ 7♦ 7♣ 8♠ 9♠ T♠ J♠ Q♥ Q♦ Q♣ K♠ K♥ K♣ A♠ A♥ A♦
Outs brutas: 2♥ 2♦ 2♣ 3♥ 3♦ 3♣ 4♠ 5♠ 6♠ 7♥ 7♦ 7♣ 8♠ 9♠ T♠ J♠ Q♥ Q♦ Q♣ K♠ K♥ K♣ A♠ A♥ A♦
Outs utiles decision: --

Equity turn: N/A
Equity river: 0.0%
Resultado: FOLD

Desarrollo:
Bote final = 45 + 15 + 15 = 75
Equity necesaria = 15 / 75 = 20.0%
River = 0 x 2 = 0.0%
0.0% < 20.0% => FOLD
```
- Observaciones:
  - cartas muertas detectadas: no
  - duplicados: no
  - modo interno correcto: si
  - calculo por calle correcto: si
  - JUGADA/OUTS/Reveal correcto: si
  - bug encontrado: no

## TEST 058 · Turn trae pair board con set
- Estado esperado de ejecucion: OK
- Export bruto del Pot Odds Trainer
```text
POT ODDS TRAINER
Modo interno: MADE_HAND_MODE
Hero: 9♠ 9♦
Villain: --
Board: 9♣ K♦ 2♥
Turn: K♣
River: --
Cartas muertas: 9♠ 9♦ 9♣ K♦ 2♥ K♣
Available deck: 46

Bote: 55
Apuesta: 20
Ratio: 3.75:1
Equity necesaria: 21.1%
Mano Hero: Full de 9 con K
Mano Villain: --

Outs positivas: N/A
Outs negativas: N/A
Outs limpias: 9♥ K♠ K♥
Outs marginales: --
Outs brutas: 9♥ K♠ K♥
Mejoras posibles: 9♥ K♠ K♥

Equity turn: N/A
Equity river: N/A
Resultado: MANO HECHA

Desarrollo:
Bote final = 55 + 20 + 20 = 95
Equity necesaria = 20 / 95 = 21.1%
Mano actual = Full de 9 con K
Mejoras posibles = 9♥ K♠ K♥
Decision por outs = N/A
```
- Observaciones:
  - cartas muertas detectadas: no
  - duplicados: no
  - modo interno correcto: si
  - calculo por calle correcto: si
  - JUGADA/OUTS/Reveal correcto: si
  - bug encontrado: no

## TEST 059 · Turn counterfeits two pair
- Estado esperado de ejecucion: OK
- Export bruto del Pot Odds Trainer
```text
POT ODDS TRAINER
Modo interno: MADE_HAND_MODE
Hero: K♠ Q♠
Villain: --
Board: K♦ Q♥ T♣
Turn: T♦
River: --
Cartas muertas: K♠ Q♠ K♦ Q♥ T♣ T♦
Available deck: 46

Bote: 60
Apuesta: 24
Ratio: 3.50:1
Equity necesaria: 22.2%
Mano Hero: Doble pareja de K y Q
Mano Villain: --

Outs positivas: N/A
Outs negativas: N/A
Outs limpias: T♠ T♥ Q♦ Q♣ K♥ K♣
Outs marginales: --
Outs brutas: T♠ T♥ Q♦ Q♣ K♥ K♣
Mejoras posibles: T♠ T♥ Q♦ Q♣ K♥ K♣

Equity turn: N/A
Equity river: N/A
Resultado: MANO HECHA

Desarrollo:
Bote final = 60 + 24 + 24 = 108
Equity necesaria = 24 / 108 = 22.2%
Mano actual = Doble pareja de K y Q
Mejoras posibles = T♠ T♥ Q♦ Q♣ K♥ K♣
Decision por outs = N/A
```
- Observaciones:
  - cartas muertas detectadas: no
  - duplicados: no
  - modo interno correcto: si
  - calculo por calle correcto: si
  - JUGADA/OUTS/Reveal correcto: si
  - bug encontrado: no

## TEST 060 · Turn gives quads
- Estado esperado de ejecucion: OK
- Export bruto del Pot Odds Trainer
```text
POT ODDS TRAINER
Modo interno: MADE_HAND_MODE
Hero: 7♠ 7♦
Villain: --
Board: 7♥ 2♣ 2♦
Turn: 7♣
River: --
Cartas muertas: 7♠ 7♦ 7♥ 2♣ 2♦ 7♣
Available deck: 46

Bote: 80
Apuesta: 30
Ratio: 3.67:1
Equity necesaria: 21.4%
Mano Hero: Poker de 7
Mano Villain: --

Outs positivas: N/A
Outs negativas: N/A
Outs limpias: --
Outs marginales: --
Outs brutas: --
Mejoras posibles: --

Equity turn: N/A
Equity river: N/A
Resultado: MANO HECHA

Desarrollo:
Bote final = 80 + 30 + 30 = 140
Equity necesaria = 30 / 140 = 21.4%
Mano actual = Poker de 7
Mejoras posibles = --
Decision por outs = N/A
```
- Observaciones:
  - cartas muertas detectadas: no
  - duplicados: no
  - modo interno correcto: si
  - calculo por calle correcto: si
  - JUGADA/OUTS/Reveal correcto: si
  - bug encontrado: no

## TEST 061 · Turn one-card straight board
- Estado esperado de ejecucion: OK
- Export bruto del Pot Odds Trainer
```text
POT ODDS TRAINER
Modo interno: MADE_HAND_MODE
Hero: A♣ K♦
Villain: --
Board: Q♠ J♥ T♣
Turn: 2♦
River: --
Cartas muertas: A♣ K♦ Q♠ J♥ T♣ 2♦
Available deck: 46

Bote: 72
Apuesta: 28
Ratio: 3.57:1
Equity necesaria: 21.9%
Mano Hero: Escalera al A
Mano Villain: --

Outs positivas: N/A
Outs negativas: N/A
Outs limpias: --
Outs marginales: --
Outs brutas: --
Mejoras posibles: --

Equity turn: N/A
Equity river: N/A
Resultado: MANO HECHA

Desarrollo:
Bote final = 72 + 28 + 28 = 128
Equity necesaria = 28 / 128 = 21.9%
Mano actual = Escalera al A
Mejoras posibles = --
Decision por outs = N/A
```
- Observaciones:
  - cartas muertas detectadas: no
  - duplicados: no
  - modo interno correcto: si
  - calculo por calle correcto: si
  - JUGADA/OUTS/Reveal correcto: si
  - bug encontrado: no

## TEST 062 · Turn improves to top two
- Estado esperado de ejecucion: OK
- Export bruto del Pot Odds Trainer
```text
POT ODDS TRAINER
Modo interno: MADE_HAND_MODE
Hero: A♠ K♠
Villain: --
Board: A♦ 7♣ 2♥
Turn: K♦
River: --
Cartas muertas: A♠ K♠ A♦ 7♣ 2♥ K♦
Available deck: 46

Bote: 50
Apuesta: 20
Ratio: 3.50:1
Equity necesaria: 22.2%
Mano Hero: Doble pareja de A y K
Mano Villain: --

Outs positivas: N/A
Outs negativas: N/A
Outs limpias: K♥ K♣ A♥ A♣
Outs marginales: --
Outs brutas: K♥ K♣ A♥ A♣
Mejoras posibles: K♥ K♣ A♥ A♣

Equity turn: N/A
Equity river: N/A
Resultado: MANO HECHA

Desarrollo:
Bote final = 50 + 20 + 20 = 90
Equity necesaria = 20 / 90 = 22.2%
Mano actual = Doble pareja de A y K
Mejoras posibles = K♥ K♣ A♥ A♣
Decision por outs = N/A
```
- Observaciones:
  - cartas muertas detectadas: no
  - duplicados: no
  - modo interno correcto: si
  - calculo por calle correcto: si
  - JUGADA/OUTS/Reveal correcto: si
  - bug encontrado: no

## TEST 063 · Turn creates full for Hero
- Estado esperado de ejecucion: OK
- Export bruto del Pot Odds Trainer
```text
POT ODDS TRAINER
Modo interno: MADE_HAND_MODE
Hero: A♠ A♦
Villain: --
Board: A♣ K♦ K♥
Turn: K♠
River: --
Cartas muertas: A♠ A♦ A♣ K♦ K♥ K♠
Available deck: 46

Bote: 95
Apuesta: 35
Ratio: 3.71:1
Equity necesaria: 21.2%
Mano Hero: Full de A con K
Mano Villain: --

Outs positivas: N/A
Outs negativas: N/A
Outs limpias: A♥
Outs marginales: K♣
Outs brutas: K♣ A♥
Mejoras posibles: A♥

Equity turn: N/A
Equity river: N/A
Resultado: MANO HECHA

Desarrollo:
Bote final = 95 + 35 + 35 = 165
Equity necesaria = 35 / 165 = 21.2%
Mano actual = Full de A con K
Mejoras posibles = A♥
Decision por outs = N/A
```
- Observaciones:
  - cartas muertas detectadas: no
  - duplicados: no
  - modo interno correcto: si
  - calculo por calle correcto: si
  - JUGADA/OUTS/Reveal correcto: si
  - bug encontrado: no

## TEST 064 · Turn possible straight flush draw
- Estado esperado de ejecucion: OK
- Export bruto del Pot Odds Trainer
```text
POT ODDS TRAINER
Modo interno: MADE_HAND_MODE
Hero: 8♣ 9♣
Villain: --
Board: 6♣ 7♣ K♦
Turn: T♣
River: --
Cartas muertas: 8♣ 9♣ 6♣ 7♣ K♦ T♣
Available deck: 46

Bote: 90
Apuesta: 40
Ratio: 3.25:1
Equity necesaria: 23.5%
Mano Hero: Escalera de color al T
Mano Villain: --

Outs positivas: N/A
Outs negativas: N/A
Outs limpias: J♣
Outs marginales: --
Outs brutas: J♣
Mejoras posibles: J♣

Equity turn: N/A
Equity river: N/A
Resultado: MANO HECHA

Desarrollo:
Bote final = 90 + 40 + 40 = 170
Equity necesaria = 40 / 170 = 23.5%
Mano actual = Escalera de color al T
Mejoras posibles = J♣
Decision por outs = N/A
```
- Observaciones:
  - cartas muertas detectadas: no
  - duplicados: no
  - modo interno correcto: si
  - calculo por calle correcto: si
  - JUGADA/OUTS/Reveal correcto: si
  - bug encontrado: no

## TEST 065 · Turn gutshot with pair
- Estado esperado de ejecucion: OK
- Export bruto del Pot Odds Trainer
```text
POT ODDS TRAINER
Modo interno: DRAW_MODE
Hero: J♣ T♦
Villain: --
Board: Q♠ 9♥ 2♣
Turn: T♣
River: --
Cartas muertas: J♣ T♦ Q♠ 9♥ 2♣ T♣
Available deck: 46

Bote: 33
Apuesta: 11
Ratio: 4.00:1
Equity necesaria: 20.0%
Mano Hero: Pareja de T
Mano Villain: --

Outs positivas: N/A
Outs negativas: N/A
Outs limpias: 8♠ 8♥ 8♦ 8♣ K♠ K♥ K♦ K♣
Outs marginales: 2♠ 2♥ 2♦ 9♠ 9♦ 9♣ T♠ T♥ J♠ J♥ J♦ Q♥ Q♦ Q♣
Outs brutas: 2♠ 2♥ 2♦ 8♠ 8♥ 8♦ 8♣ 9♠ 9♦ 9♣ T♠ T♥ J♠ J♥ J♦ Q♥ Q♦ Q♣ K♠ K♥ K♦ K♣
Outs utiles decision: 8♠ 8♥ 8♦ 8♣ K♠ K♥ K♦ K♣

Equity turn: N/A
Equity river: 16.0%
Resultado: FOLD

Desarrollo:
Bote final = 33 + 11 + 11 = 55
Equity necesaria = 11 / 55 = 20.0%
River = 8 x 2 = 16.0%
16.0% < 20.0% => FOLD
```
- Observaciones:
  - cartas muertas detectadas: no
  - duplicados: no
  - modo interno correcto: si
  - calculo por calle correcto: si
  - JUGADA/OUTS/Reveal correcto: si
  - bug encontrado: no

## TEST 066 · Gutshot turn blocker Villain
- Estado esperado de ejecucion: OK
- Export bruto del Pot Odds Trainer
```text
POT ODDS TRAINER
Modo interno: DRAW_MODE
Hero: 5♦ 9♣
Villain: 7♣ A♠
Board: 6♠ 8♥ A♦
Turn: K♣
River: --
Cartas muertas: 5♦ 9♣ 6♠ 8♥ A♦ K♣ 7♣ A♠
Available deck: 44

Bote: 25
Apuesta: 8
Ratio: 4.13:1
Equity necesaria: 19.5%
Mano Hero: Carta alta A
Mano Villain: Pareja de A

Outs positivas: 7♠ 7♥ 7♦
Outs negativas: --
Outs limpias: 7♠ 7♥ 7♦
Outs marginales: 5♠ 5♥ 5♣ 6♥ 6♦ 6♣ 8♠ 8♦ 8♣ 9♠ 9♥ 9♦ K♠ K♥ K♦ A♥ A♣
Outs brutas: 5♠ 5♥ 5♣ 6♥ 6♦ 6♣ 7♠ 7♥ 7♦ 8♠ 8♦ 8♣ 9♠ 9♥ 9♦ K♠ K♥ K♦ A♥ A♣
Outs utiles decision: 7♠ 7♥ 7♦

Equity turn: N/A
Equity river: 6.0%
Resultado: FOLD

Desarrollo:
Bote final = 25 + 8 + 8 = 41
Equity necesaria = 8 / 41 = 19.5%
River = 3 x 2 = 6.0%
6.0% < 19.5% => FOLD
```
- Observaciones:
  - cartas muertas detectadas: no
  - duplicados: no
  - modo interno correcto: si
  - calculo por calle correcto: si
  - JUGADA/OUTS/Reveal correcto: si
  - bug encontrado: no

## TEST 067 · OESD turn blockers Villain
- Estado esperado de ejecucion: OK
- Export bruto del Pot Odds Trainer
```text
POT ODDS TRAINER
Modo interno: DRAW_MODE
Hero: 8♠ 9♠
Villain: T♦ T♣
Board: 6♥ 7♦ K♣
Turn: 2♠
River: --
Cartas muertas: 8♠ 9♠ 6♥ 7♦ K♣ 2♠ T♦ T♣
Available deck: 44

Bote: 44
Apuesta: 18
Ratio: 3.44:1
Equity necesaria: 22.5%
Mano Hero: Carta alta K
Mano Villain: Pareja de T

Outs positivas: 5♠ 5♥ 5♦ 5♣ T♠ T♥
Outs negativas: --
Outs limpias: 5♠ 5♥ 5♦ 5♣ T♠ T♥
Outs marginales: 2♥ 2♦ 2♣ 6♠ 6♦ 6♣ 7♠ 7♥ 7♣ 8♥ 8♦ 8♣ 9♥ 9♦ 9♣ K♠ K♥ K♦
Outs brutas: 2♥ 2♦ 2♣ 5♠ 5♥ 5♦ 5♣ 6♠ 6♦ 6♣ 7♠ 7♥ 7♣ 8♥ 8♦ 8♣ 9♥ 9♦ 9♣ T♠ T♥ K♠ K♥ K♦
Outs utiles decision: 5♠ 5♥ 5♦ 5♣ T♠ T♥

Equity turn: N/A
Equity river: 12.0%
Resultado: FOLD

Desarrollo:
Bote final = 44 + 18 + 18 = 80
Equity necesaria = 18 / 80 = 22.5%
River = 6 x 2 = 12.0%
12.0% < 22.5% => FOLD
```
- Observaciones:
  - cartas muertas detectadas: no
  - duplicados: no
  - modo interno correcto: si
  - calculo por calle correcto: si
  - JUGADA/OUTS/Reveal correcto: si
  - bug encontrado: no

## TEST 068 · Flush turn blocker Villain
- Estado esperado de ejecucion: OK
- Export bruto del Pot Odds Trainer
```text
POT ODDS TRAINER
Modo interno: DRAW_MODE
Hero: A♣ 7♣
Villain: K♣ Q♦
Board: 2♣ 9♣ J♥
Turn: K♦
River: --
Cartas muertas: A♣ 7♣ 2♣ 9♣ J♥ K♦ K♣ Q♦
Available deck: 44

Bote: 40
Apuesta: 15
Ratio: 3.67:1
Equity necesaria: 21.4%
Mano Hero: Carta alta A
Mano Villain: Pareja de K

Outs positivas: 3♣ 4♣ 5♣ 6♣ 8♣ T♣ J♣ Q♣
Outs negativas: --
Outs limpias: 3♣ 4♣ 5♣ 6♣ 8♣ T♣ J♣ Q♣
Outs marginales: 2♠ 2♥ 2♦ 7♠ 7♥ 7♦ 9♠ 9♥ 9♦ J♠ J♦ K♠ K♥ A♠ A♥ A♦
Outs brutas: 2♠ 2♥ 2♦ 3♣ 4♣ 5♣ 6♣ 7♠ 7♥ 7♦ 8♣ 9♠ 9♥ 9♦ T♣ J♠ J♦ J♣ Q♣ K♠ K♥ A♠ A♥ A♦
Outs utiles decision: 3♣ 4♣ 5♣ 6♣ 8♣ T♣ J♣ Q♣

Equity turn: N/A
Equity river: 16.0%
Resultado: FOLD

Desarrollo:
Bote final = 40 + 15 + 15 = 70
Equity necesaria = 15 / 70 = 21.4%
River = 8 x 2 = 16.0%
16.0% < 21.4% => FOLD
```
- Observaciones:
  - cartas muertas detectadas: no
  - duplicados: no
  - modo interno correcto: si
  - calculo por calle correcto: si
  - JUGADA/OUTS/Reveal correcto: si
  - bug encontrado: no

## TEST 069 · Combo turn Villain blockers
- Estado esperado de ejecucion: OK
- Export bruto del Pot Odds Trainer
```text
POT ODDS TRAINER
Modo interno: DRAW_MODE
Hero: A♣ K♣
Villain: Q♠ Q♥
Board: J♣ T♣ 2♦
Turn: 7♠
River: --
Cartas muertas: A♣ K♣ J♣ T♣ 2♦ 7♠ Q♠ Q♥
Available deck: 44

Bote: 100
Apuesta: 40
Ratio: 3.50:1
Equity necesaria: 22.2%
Mano Hero: Carta alta A
Mano Villain: Pareja de Q

Outs positivas: 2♣ 3♣ 4♣ 5♣ 6♣ 7♣ 8♣ 9♣ Q♦ Q♣
Outs negativas: --
Outs limpias: 2♣ 3♣ 4♣ 5♣ 6♣ 7♣ 8♣ 9♣ Q♦ Q♣
Outs marginales: 2♠ 2♥ 7♥ 7♦ T♠ T♥ T♦ J♠ J♥ J♦ K♠ K♥ K♦ A♠ A♥ A♦
Outs brutas: 2♠ 2♥ 2♣ 3♣ 4♣ 5♣ 6♣ 7♥ 7♦ 7♣ 8♣ 9♣ T♠ T♥ T♦ J♠ J♥ J♦ Q♦ Q♣ K♠ K♥ K♦ A♠ A♥ A♦
Outs utiles decision: 2♣ 3♣ 4♣ 5♣ 6♣ 7♣ 8♣ 9♣ Q♦ Q♣

Equity turn: N/A
Equity river: 20.0%
Resultado: FOLD

Desarrollo:
Bote final = 100 + 40 + 40 = 180
Equity necesaria = 40 / 180 = 22.2%
River = 10 x 2 = 20.0%
20.0% < 22.2% => FOLD
```
- Observaciones:
  - cartas muertas detectadas: no
  - duplicados: no
  - modo interno correcto: si
  - calculo por calle correcto: si
  - JUGADA/OUTS/Reveal correcto: si
  - bug encontrado: no

## TEST 070 · Made flush turn vs set
- Estado esperado de ejecucion: OK
- Export bruto del Pot Odds Trainer
```text
POT ODDS TRAINER
Modo interno: MADE_HAND_MODE
Hero: A♦ J♦
Villain: K♣ K♥
Board: 2♦ 2♠ 8♦
Turn: Q♦
River: --
Cartas muertas: A♦ J♦ 2♦ 2♠ 8♦ Q♦ K♣ K♥
Available deck: 44

Bote: 64
Apuesta: 22
Ratio: 3.91:1
Equity necesaria: 20.4%
Mano Hero: Color al A
Mano Villain: Doble pareja de K y 2

Outs positivas: --
Outs negativas: --
Outs limpias: --
Outs marginales: --
Outs brutas: --
Mejoras posibles: --

Equity turn: N/A
Equity river: N/A
Resultado: MANO HECHA

Desarrollo:
Bote final = 64 + 22 + 22 = 108
Equity necesaria = 22 / 108 = 20.4%
Mano actual = Color al A
Mejoras posibles = --
Decision por outs = N/A
```
- Observaciones:
  - cartas muertas detectadas: no
  - duplicados: no
  - modo interno correcto: si
  - calculo por calle correcto: si
  - JUGADA/OUTS/Reveal correcto: si
  - bug encontrado: no

## TEST 071 · Straight made turn but Villain flush draw
- Estado esperado de ejecucion: OK
- Export bruto del Pot Odds Trainer
```text
POT ODDS TRAINER
Modo interno: MADE_HAND_MODE
Hero: 8♣ 9♦
Villain: A♣ K♣
Board: 6♣ 7♥ K♦
Turn: T♣
River: --
Cartas muertas: 8♣ 9♦ 6♣ 7♥ K♦ T♣ A♣ K♣
Available deck: 44

Bote: 70
Apuesta: 25
Ratio: 3.80:1
Equity necesaria: 20.8%
Mano Hero: Escalera al T
Mano Villain: Pareja de K

Outs positivas: J♠ J♥ J♦
Outs negativas: J♣
Outs limpias: J♠ J♥ J♦ J♣
Outs marginales: --
Outs brutas: J♠ J♥ J♦ J♣
Mejoras posibles: J♠ J♥ J♦ J♣

Equity turn: N/A
Equity river: N/A
Resultado: MANO HECHA

Desarrollo:
Bote final = 70 + 25 + 25 = 120
Equity necesaria = 25 / 120 = 20.8%
Mano actual = Escalera al T
Mejoras posibles = J♠ J♥ J♦ J♣
Decision por outs = N/A
```
- Observaciones:
  - cartas muertas detectadas: no
  - duplicados: no
  - modo interno correcto: si
  - calculo por calle correcto: si
  - JUGADA/OUTS/Reveal correcto: si
  - bug encontrado: no

## TEST 072 · Two pair behind turn
- Estado esperado de ejecucion: OK
- Export bruto del Pot Odds Trainer
```text
POT ODDS TRAINER
Modo interno: MADE_HAND_BEHIND_MODE
Hero: K♠ Q♠
Villain: A♦ J♦
Board: K♦ Q♥ T♣
Turn: 2♠
River: --
Cartas muertas: K♠ Q♠ K♦ Q♥ T♣ 2♠ A♦ J♦
Available deck: 44

Bote: 55
Apuesta: 25
Ratio: 3.20:1
Equity necesaria: 23.8%
Mano Hero: Doble pareja de K y Q
Mano Villain: Escalera al A

Outs positivas: Q♦ Q♣ K♥ K♣
Outs negativas: --
Outs limpias: Q♦ Q♣ K♥ K♣
Outs marginales: --
Outs brutas: Q♦ Q♣ K♥ K♣
Outs utiles decision: Q♦ Q♣ K♥ K♣

Equity turn: N/A
Equity river: 8.0%
Resultado: FOLD

Desarrollo:
Bote final = 55 + 25 + 25 = 105
Equity necesaria = 25 / 105 = 23.8%
River = 4 x 2 = 8.0%
8.0% < 23.8% => FOLD
Aviso: Hero tiene mano hecha, pero va por detras y busca mejorar.
```
- Observaciones:
  - cartas muertas detectadas: no
  - duplicados: no
  - modo interno correcto: si
  - calculo por calle correcto: si
  - JUGADA/OUTS/Reveal correcto: si
  - bug encontrado: no

## TEST 073 · Set turn vs made straight Villain
- Estado esperado de ejecucion: OK
- Export bruto del Pot Odds Trainer
```text
POT ODDS TRAINER
Modo interno: MADE_HAND_BEHIND_MODE
Hero: 9♠ 9♦
Villain: Q♣ J♣
Board: 9♣ K♦ T♥
Turn: 2♠
River: --
Cartas muertas: 9♠ 9♦ 9♣ K♦ T♥ 2♠ Q♣ J♣
Available deck: 44

Bote: 70
Apuesta: 30
Ratio: 3.33:1
Equity necesaria: 23.1%
Mano Hero: Trio de 9
Mano Villain: Escalera al K

Outs positivas: 2♥ 2♦ 2♣ 9♥ T♠ T♦ T♣ K♠ K♥ K♣
Outs negativas: --
Outs limpias: 2♥ 2♦ 2♣ 9♥ T♠ T♦ T♣ K♠ K♥ K♣
Outs marginales: --
Outs brutas: 2♥ 2♦ 2♣ 9♥ T♠ T♦ T♣ K♠ K♥ K♣
Outs utiles decision: 2♥ 2♦ 2♣ 9♥ T♠ T♦ T♣ K♠ K♥ K♣

Equity turn: N/A
Equity river: 20.0%
Resultado: FOLD

Desarrollo:
Bote final = 70 + 30 + 30 = 130
Equity necesaria = 30 / 130 = 23.1%
River = 10 x 2 = 20.0%
20.0% < 23.1% => FOLD
Aviso: Hero tiene mano hecha, pero va por detras y busca mejorar.
```
- Observaciones:
  - cartas muertas detectadas: no
  - duplicados: no
  - modo interno correcto: si
  - calculo por calle correcto: si
  - JUGADA/OUTS/Reveal correcto: si
  - bug encontrado: no

## TEST 074 · Flush draw turn dominated blocker
- Estado esperado de ejecucion: OK
- Export bruto del Pot Odds Trainer
```text
POT ODDS TRAINER
Modo interno: DRAW_MODE
Hero: Q♣ 8♣
Villain: A♣ K♦
Board: 2♣ 6♣ J♠
Turn: 3♦
River: --
Cartas muertas: Q♣ 8♣ 2♣ 6♣ J♠ 3♦ A♣ K♦
Available deck: 44

Bote: 42
Apuesta: 14
Ratio: 4.00:1
Equity necesaria: 20.0%
Mano Hero: Carta alta Q
Mano Villain: Carta alta A

Outs positivas: 3♣ 4♣ 5♣ 7♣ 9♣ T♣ J♣ K♣
Outs negativas: --
Outs limpias: 3♣ 4♣ 5♣ 7♣ 9♣ T♣ J♣ K♣
Outs marginales: 2♠ 2♥ 2♦ 3♠ 3♥ 6♠ 6♥ 6♦ 8♠ 8♥ 8♦ J♥ J♦ Q♠ Q♥ Q♦
Outs brutas: 2♠ 2♥ 2♦ 3♠ 3♥ 3♣ 4♣ 5♣ 6♠ 6♥ 6♦ 7♣ 8♠ 8♥ 8♦ 9♣ T♣ J♥ J♦ J♣ Q♠ Q♥ Q♦ K♣
Outs utiles decision: 3♣ 4♣ 5♣ 7♣ 9♣ T♣ J♣ K♣

Equity turn: N/A
Equity river: 16.0%
Resultado: FOLD

Desarrollo:
Bote final = 42 + 14 + 14 = 70
Equity necesaria = 14 / 70 = 20.0%
River = 8 x 2 = 16.0%
16.0% < 20.0% => FOLD
```
- Observaciones:
  - cartas muertas detectadas: no
  - duplicados: no
  - modo interno correcto: si
  - calculo por calle correcto: si
  - JUGADA/OUTS/Reveal correcto: si
  - bug encontrado: no

## TEST 075 · Overcards turn vs pair
- Estado esperado de ejecucion: OK
- Export bruto del Pot Odds Trainer
```text
POT ODDS TRAINER
Modo interno: DRAW_MODE
Hero: A♠ K♦
Villain: 8♣ 8♥
Board: 2♣ 7♦ Q♥
Turn: 3♦
River: --
Cartas muertas: A♠ K♦ 2♣ 7♦ Q♥ 3♦ 8♣ 8♥
Available deck: 44

Bote: 35
Apuesta: 10
Ratio: 4.50:1
Equity necesaria: 18.2%
Mano Hero: Carta alta A
Mano Villain: Pareja de 8

Outs positivas: --
Outs negativas: --
Outs limpias: --
Outs marginales: 2♠ 2♥ 2♦ 3♠ 3♥ 3♣ 7♠ 7♥ 7♣ Q♠ Q♦ Q♣ K♠ K♥ K♣ A♥ A♦ A♣
Outs brutas: 2♠ 2♥ 2♦ 3♠ 3♥ 3♣ 7♠ 7♥ 7♣ Q♠ Q♦ Q♣ K♠ K♥ K♣ A♥ A♦ A♣
Outs utiles decision: --

Equity turn: N/A
Equity river: 0.0%
Resultado: FOLD

Desarrollo:
Bote final = 35 + 10 + 10 = 55
Equity necesaria = 10 / 55 = 18.2%
River = 0 x 2 = 0.0%
0.0% < 18.2% => FOLD
```
- Observaciones:
  - cartas muertas detectadas: no
  - duplicados: no
  - modo interno correcto: si
  - calculo por calle correcto: si
  - JUGADA/OUTS/Reveal correcto: si
  - bug encontrado: no

## TEST 076 · Top pair turn vs overpair
- Estado esperado de ejecucion: OK
- Export bruto del Pot Odds Trainer
```text
POT ODDS TRAINER
Modo interno: DRAW_MODE
Hero: A♠ Q♦
Villain: K♣ K♥
Board: A♣ 7♦ 2♥
Turn: 3♠
River: --
Cartas muertas: A♠ Q♦ A♣ 7♦ 2♥ 3♠ K♣ K♥
Available deck: 44

Bote: 60
Apuesta: 25
Ratio: 3.40:1
Equity necesaria: 22.7%
Mano Hero: Pareja de A
Mano Villain: Pareja de K

Outs positivas: --
Outs negativas: --
Outs limpias: --
Outs marginales: 2♠ 2♦ 2♣ 3♥ 3♦ 3♣ 7♠ 7♥ 7♣ Q♠ Q♥ Q♣ A♥ A♦
Outs brutas: 2♠ 2♦ 2♣ 3♥ 3♦ 3♣ 7♠ 7♥ 7♣ Q♠ Q♥ Q♣ A♥ A♦
Outs utiles decision: --

Equity turn: N/A
Equity river: 0.0%
Resultado: FOLD

Desarrollo:
Bote final = 60 + 25 + 25 = 110
Equity necesaria = 25 / 110 = 22.7%
River = 0 x 2 = 0.0%
0.0% < 22.7% => FOLD
```
- Observaciones:
  - cartas muertas detectadas: no
  - duplicados: no
  - modo interno correcto: si
  - calculo por calle correcto: si
  - JUGADA/OUTS/Reveal correcto: si
  - bug encontrado: no

## TEST 077 · Flush completed turn but paired board Villain set
- Estado esperado de ejecucion: OK
- Export bruto del Pot Odds Trainer
```text
POT ODDS TRAINER
Modo interno: MADE_HAND_BEHIND_MODE
Hero: A♥ 9♥
Villain: J♣ J♦
Board: 2♥ 2♣ J♥
Turn: K♥
River: --
Cartas muertas: A♥ 9♥ 2♥ 2♣ J♥ K♥ J♣ J♦
Available deck: 44

Bote: 85
Apuesta: 35
Ratio: 3.43:1
Equity necesaria: 22.6%
Mano Hero: Color al A
Mano Villain: Full de J con 2

Outs positivas: --
Outs negativas: --
Outs limpias: --
Outs marginales: --
Outs brutas: --
Outs utiles decision: --

Equity turn: N/A
Equity river: 0.0%
Resultado: FOLD

Desarrollo:
Bote final = 85 + 35 + 35 = 155
Equity necesaria = 35 / 155 = 22.6%
River = 0 x 2 = 0.0%
0.0% < 22.6% => FOLD
Aviso: Hero tiene mano hecha, pero va por detras y busca mejorar.
```
- Observaciones:
  - cartas muertas detectadas: no
  - duplicados: no
  - modo interno correcto: si
  - calculo por calle correcto: si
  - JUGADA/OUTS/Reveal correcto: si
  - bug encontrado: no

## TEST 078 · Straight completed turn but Villain higher straight
- Estado esperado de ejecucion: OK
- Export bruto del Pot Odds Trainer
```text
POT ODDS TRAINER
Modo interno: MADE_HAND_MODE
Hero: 8♣ 9♦
Villain: J♠ Q♠
Board: 6♠ 7♥ T♣
Turn: K♦
River: --
Cartas muertas: 8♣ 9♦ 6♠ 7♥ T♣ K♦ J♠ Q♠
Available deck: 44

Bote: 90
Apuesta: 40
Ratio: 3.25:1
Equity necesaria: 23.5%
Mano Hero: Escalera al T
Mano Villain: Carta alta K

Outs positivas: J♥ J♦ J♣
Outs negativas: --
Outs limpias: J♥ J♦ J♣
Outs marginales: --
Outs brutas: J♥ J♦ J♣
Mejoras posibles: J♥ J♦ J♣

Equity turn: N/A
Equity river: N/A
Resultado: MANO HECHA

Desarrollo:
Bote final = 90 + 40 + 40 = 170
Equity necesaria = 40 / 170 = 23.5%
Mano actual = Escalera al T
Mejoras posibles = J♥ J♦ J♣
Decision por outs = N/A
```
- Observaciones:
  - cartas muertas detectadas: no
  - duplicados: no
  - modo interno correcto: si
  - calculo por calle correcto: si
  - JUGADA/OUTS/Reveal correcto: si
  - bug encontrado: no

## TEST 079 · Set becomes full turn vs Villain flush
- Estado esperado de ejecucion: INVALIDO CONTROLADO
- Export bruto del Pot Odds Trainer
```text
POT ODDS TRAINER
Entrada invalida controlada: Cartas duplicadas: K♣
Hero: 9♠ 9♦
Villain: A♣ K♣
Flop: 9♣ K♦ 2♥
Turn: K♣
River: --
Bote: 100
Apuesta: 40
```
- Observaciones:
  - cartas muertas detectadas: no
  - duplicados: no
  - modo interno correcto: si
  - calculo por calle correcto: si
  - JUGADA/OUTS/Reveal correcto: si
  - bug encontrado: Cartas duplicadas: K♣

## TEST 080 · Duplicate stress invalid dead overlap
- Estado esperado de ejecucion: INVALIDO CONTROLADO
- Export bruto del Pot Odds Trainer
```text
POT ODDS TRAINER
Entrada invalida controlada: Cartas duplicadas: K♣
Hero: A♣ K♣
Villain: K♣ Q♦
Flop: 2♣ 9♣ J♥
Turn: K♦
River: --
Bote: 40
Apuesta: 15
```
- Observaciones:
  - cartas muertas detectadas: no
  - duplicados: no
  - modo interno correcto: si
  - calculo por calle correcto: si
  - JUGADA/OUTS/Reveal correcto: si
  - bug encontrado: Cartas duplicadas: K♣

## TEST 081 · Wheel draw turn with blocker
- Estado esperado de ejecucion: OK
- Export bruto del Pot Odds Trainer
```text
POT ODDS TRAINER
Modo interno: DRAW_MODE
Hero: 4♣ 5♣
Villain: A♠ 3♦
Board: 2♥ K♣ Q♠
Turn: 6♦
River: --
Cartas muertas: 4♣ 5♣ 2♥ K♣ Q♠ 6♦ A♠ 3♦
Available deck: 44

Bote: 45
Apuesta: 15
Ratio: 4.00:1
Equity necesaria: 20.0%
Mano Hero: Carta alta K
Mano Villain: Carta alta A

Outs positivas: 3♠ 3♥ 3♣
Outs negativas: --
Outs limpias: 3♠ 3♥ 3♣
Outs marginales: 2♠ 2♦ 2♣ 4♠ 4♥ 4♦ 5♠ 5♥ 5♦ 6♠ 6♥ 6♣ Q♥ Q♦ Q♣ K♠ K♥ K♦
Outs brutas: 2♠ 2♦ 2♣ 3♠ 3♥ 3♣ 4♠ 4♥ 4♦ 5♠ 5♥ 5♦ 6♠ 6♥ 6♣ Q♥ Q♦ Q♣ K♠ K♥ K♦
Outs utiles decision: 3♠ 3♥ 3♣

Equity turn: N/A
Equity river: 6.0%
Resultado: FOLD

Desarrollo:
Bote final = 45 + 15 + 15 = 75
Equity necesaria = 15 / 75 = 20.0%
River = 3 x 2 = 6.0%
6.0% < 20.0% => FOLD
```
- Observaciones:
  - cartas muertas detectadas: no
  - duplicados: no
  - modo interno correcto: si
  - calculo por calle correcto: si
  - JUGADA/OUTS/Reveal correcto: si
  - bug encontrado: no

## TEST 082 · Board four-to-straight turn
- Estado esperado de ejecucion: OK
- Export bruto del Pot Odds Trainer
```text
POT ODDS TRAINER
Modo interno: DRAW_MODE
Hero: A♠ K♦
Villain: J♣ T♦
Board: Q♠ 9♥ 2♣
Turn: 8♣
River: --
Cartas muertas: A♠ K♦ Q♠ 9♥ 2♣ 8♣ J♣ T♦
Available deck: 44

Bote: 66
Apuesta: 24
Ratio: 3.75:1
Equity necesaria: 21.1%
Mano Hero: Carta alta A
Mano Villain: Escalera al Q

Outs positivas: --
Outs negativas: --
Outs limpias: --
Outs marginales: 2♠ 2♥ 2♦ 8♠ 8♥ 8♦ 9♠ 9♦ 9♣ Q♥ Q♦ Q♣ K♠ K♥ K♣ A♥ A♦ A♣
Outs brutas: 2♠ 2♥ 2♦ 8♠ 8♥ 8♦ 9♠ 9♦ 9♣ Q♥ Q♦ Q♣ K♠ K♥ K♣ A♥ A♦ A♣
Outs utiles decision: --

Equity turn: N/A
Equity river: 0.0%
Resultado: FOLD

Desarrollo:
Bote final = 66 + 24 + 24 = 114
Equity necesaria = 24 / 114 = 21.1%
River = 0 x 2 = 0.0%
0.0% < 21.1% => FOLD
```
- Observaciones:
  - cartas muertas detectadas: no
  - duplicados: no
  - modo interno correcto: si
  - calculo por calle correcto: si
  - JUGADA/OUTS/Reveal correcto: si
  - bug encontrado: no

## TEST 083 · Paired board full draw turn
- Estado esperado de ejecucion: OK
- Export bruto del Pot Odds Trainer
```text
POT ODDS TRAINER
Modo interno: MADE_HAND_MODE
Hero: A♠ A♦
Villain: K♣ Q♣
Board: A♣ K♦ 2♥
Turn: K♥
River: --
Cartas muertas: A♠ A♦ A♣ K♦ 2♥ K♥ K♣ Q♣
Available deck: 44

Bote: 88
Apuesta: 33
Ratio: 3.67:1
Equity necesaria: 21.4%
Mano Hero: Full de A con K
Mano Villain: Trio de K

Outs positivas: A♥
Outs negativas: --
Outs limpias: A♥
Outs marginales: --
Outs brutas: A♥
Mejoras posibles: A♥

Equity turn: N/A
Equity river: N/A
Resultado: MANO HECHA

Desarrollo:
Bote final = 88 + 33 + 33 = 154
Equity necesaria = 33 / 154 = 21.4%
Mano actual = Full de A con K
Mejoras posibles = A♥
Decision por outs = N/A
```
- Observaciones:
  - cartas muertas detectadas: no
  - duplicados: no
  - modo interno correcto: si
  - calculo por calle correcto: si
  - JUGADA/OUTS/Reveal correcto: si
  - bug encontrado: no

## TEST 084 · Low flush made turn vs higher club blocker
- Estado esperado de ejecucion: OK
- Export bruto del Pot Odds Trainer
```text
POT ODDS TRAINER
Modo interno: MADE_HAND_MODE
Hero: 7♣ 8♣
Villain: A♣ K♦
Board: 2♣ 6♣ J♠
Turn: 3♣
River: --
Cartas muertas: 7♣ 8♣ 2♣ 6♣ J♠ 3♣ A♣ K♦
Available deck: 44

Bote: 62
Apuesta: 22
Ratio: 3.82:1
Equity necesaria: 20.8%
Mano Hero: Color al 8
Mano Villain: Carta alta A

Outs positivas: --
Outs negativas: 9♣ T♣ J♣ Q♣ K♣
Outs limpias: 9♣ T♣ J♣ Q♣ K♣
Outs marginales: --
Outs brutas: 9♣ T♣ J♣ Q♣ K♣
Mejoras posibles: 9♣ T♣ J♣ Q♣ K♣

Equity turn: N/A
Equity river: N/A
Resultado: MANO HECHA

Desarrollo:
Bote final = 62 + 22 + 22 = 106
Equity necesaria = 22 / 106 = 20.8%
Mano actual = Color al 8
Mejoras posibles = 9♣ T♣ J♣ Q♣ K♣
Decision por outs = N/A
```
- Observaciones:
  - cartas muertas detectadas: no
  - duplicados: no
  - modo interno correcto: si
  - calculo por calle correcto: si
  - JUGADA/OUTS/Reveal correcto: si
  - bug encontrado: no

## TEST 085 · Combo draw turn with board pair
- Estado esperado de ejecucion: OK
- Export bruto del Pot Odds Trainer
```text
POT ODDS TRAINER
Modo interno: MADE_HAND_MODE
Hero: J♣ T♣
Villain: A♦ A♥
Board: 9♣ 9♦ Q♠
Turn: 8♣
River: --
Cartas muertas: J♣ T♣ 9♣ 9♦ Q♠ 8♣ A♦ A♥
Available deck: 44

Bote: 75
Apuesta: 30
Ratio: 3.50:1
Equity necesaria: 22.2%
Mano Hero: Escalera al Q
Mano Villain: Doble pareja de A y 9

Outs positivas: 2♣ 3♣ 4♣ 5♣ 6♣ 7♣ Q♣ K♠ K♥ K♦ K♣
Outs negativas: A♣
Outs limpias: 2♣ 3♣ 4♣ 5♣ 6♣ 7♣ Q♣ K♠ K♥ K♦ K♣ A♣
Outs marginales: --
Outs brutas: 2♣ 3♣ 4♣ 5♣ 6♣ 7♣ Q♣ K♠ K♥ K♦ K♣ A♣
Mejoras posibles: 2♣ 3♣ 4♣ 5♣ 6♣ 7♣ Q♣ K♠ K♥ K♦ K♣ A♣

Equity turn: N/A
Equity river: N/A
Resultado: MANO HECHA

Desarrollo:
Bote final = 75 + 30 + 30 = 135
Equity necesaria = 30 / 135 = 22.2%
Mano actual = Escalera al Q
Mejoras posibles = 2♣ 3♣ 4♣ 5♣ 6♣ 7♣ Q♣ K♠ K♥ K♦ K♣ A♣
Decision por outs = N/A
```
- Observaciones:
  - cartas muertas detectadas: no
  - duplicados: no
  - modo interno correcto: si
  - calculo por calle correcto: si
  - JUGADA/OUTS/Reveal correcto: si
  - bug encontrado: no

## TEST 086 · River completo straight Hero
- Estado esperado de ejecucion: OK
- Export bruto del Pot Odds Trainer
```text
POT ODDS TRAINER
Modo interno: RIVER_FINAL_MODE
Hero: A♣ K♣
Villain: Q♠ Q♥
Board: J♣ T♣ 2♦
Turn: 7♠
River: Q♦
Cartas muertas: A♣ K♣ J♣ T♣ 2♦ 7♠ Q♦ Q♠ Q♥
Available deck: 43

Bote: 100
Apuesta: 40
Ratio: 3.50:1
Equity necesaria: 22.2%
Mano Hero: Escalera al A
Mano Villain: Trio de Q

Outs positivas: --
Outs negativas: --
Outs limpias: --
Outs marginales: --
Outs brutas: --
Outs utiles decision: --

Equity turn: N/A
Equity river: N/A
Resultado: Hero gana

Desarrollo:
Bote final = 100 + 40 + 40 = 180
Equity necesaria = 40 / 180 = 22.2%
Mano final Hero = Escalera al A
Mano final Villain = Trio de Q
Resultado final = Hero gana
Equity futura = N/A
```
- Observaciones:
  - cartas muertas detectadas: no
  - duplicados: no
  - modo interno correcto: si
  - calculo por calle correcto: si
  - JUGADA/OUTS/Reveal correcto: si
  - bug encontrado: no

## TEST 087 · River completo flush Hero
- Estado esperado de ejecucion: OK
- Export bruto del Pot Odds Trainer
```text
POT ODDS TRAINER
Modo interno: RIVER_FINAL_MODE
Hero: A♠ 9♠
Villain: K♥ Q♥
Board: 2♠ 6♠ J♠
Turn: 3♦
River: 4♣
Cartas muertas: A♠ 9♠ 2♠ 6♠ J♠ 3♦ 4♣ K♥ Q♥
Available deck: 43

Bote: 70
Apuesta: 30
Ratio: 3.33:1
Equity necesaria: 23.1%
Mano Hero: Color al A
Mano Villain: Carta alta K

Outs positivas: --
Outs negativas: --
Outs limpias: --
Outs marginales: --
Outs brutas: --
Outs utiles decision: --

Equity turn: N/A
Equity river: N/A
Resultado: Hero gana

Desarrollo:
Bote final = 70 + 30 + 30 = 130
Equity necesaria = 30 / 130 = 23.1%
Mano final Hero = Color al A
Mano final Villain = Carta alta K
Resultado final = Hero gana
Equity futura = N/A
```
- Observaciones:
  - cartas muertas detectadas: no
  - duplicados: no
  - modo interno correcto: si
  - calculo por calle correcto: si
  - JUGADA/OUTS/Reveal correcto: si
  - bug encontrado: no

## TEST 088 · River completo full Hero
- Estado esperado de ejecucion: OK
- Export bruto del Pot Odds Trainer
```text
POT ODDS TRAINER
Modo interno: RIVER_FINAL_MODE
Hero: 7♠ 7♦
Villain: A♣ K♣
Board: 7♥ 2♣ 2♦
Turn: K♦
River: 3♠
Cartas muertas: 7♠ 7♦ 7♥ 2♣ 2♦ K♦ 3♠ A♣ K♣
Available deck: 43

Bote: 60
Apuesta: 25
Ratio: 3.40:1
Equity necesaria: 22.7%
Mano Hero: Full de 7 con 2
Mano Villain: Doble pareja de K y 2

Outs positivas: --
Outs negativas: --
Outs limpias: --
Outs marginales: --
Outs brutas: --
Outs utiles decision: --

Equity turn: N/A
Equity river: N/A
Resultado: Hero gana

Desarrollo:
Bote final = 60 + 25 + 25 = 110
Equity necesaria = 25 / 110 = 22.7%
Mano final Hero = Full de 7 con 2
Mano final Villain = Doble pareja de K y 2
Resultado final = Hero gana
Equity futura = N/A
```
- Observaciones:
  - cartas muertas detectadas: no
  - duplicados: no
  - modo interno correcto: si
  - calculo por calle correcto: si
  - JUGADA/OUTS/Reveal correcto: si
  - bug encontrado: no

## TEST 089 · River completo Villain improves
- Estado esperado de ejecucion: OK
- Export bruto del Pot Odds Trainer
```text
POT ODDS TRAINER
Modo interno: RIVER_FINAL_MODE
Hero: K♠ Q♠
Villain: A♦ J♦
Board: K♦ Q♥ T♣
Turn: 2♠
River: 9♦
Cartas muertas: K♠ Q♠ K♦ Q♥ T♣ 2♠ 9♦ A♦ J♦
Available deck: 43

Bote: 55
Apuesta: 25
Ratio: 3.20:1
Equity necesaria: 23.8%
Mano Hero: Doble pareja de K y Q
Mano Villain: Escalera al A

Outs positivas: --
Outs negativas: --
Outs limpias: --
Outs marginales: --
Outs brutas: --
Outs utiles decision: --

Equity turn: N/A
Equity river: N/A
Resultado: Villain gana

Desarrollo:
Bote final = 55 + 25 + 25 = 105
Equity necesaria = 25 / 105 = 23.8%
Mano final Hero = Doble pareja de K y Q
Mano final Villain = Escalera al A
Resultado final = Villain gana
Equity futura = N/A
```
- Observaciones:
  - cartas muertas detectadas: no
  - duplicados: no
  - modo interno correcto: si
  - calculo por calle correcto: si
  - JUGADA/OUTS/Reveal correcto: si
  - bug encontrado: no

## TEST 090 · River completes board flush no Hero suit
- Estado esperado de ejecucion: OK
- Export bruto del Pot Odds Trainer
```text
POT ODDS TRAINER
Modo interno: RIVER_FINAL_MODE
Hero: A♦ K♣
Villain: 8♠ 8♥
Board: 2♠ 7♠ Q♠
Turn: 3♠
River: 4♠
Cartas muertas: A♦ K♣ 2♠ 7♠ Q♠ 3♠ 4♠ 8♠ 8♥
Available deck: 43

Bote: 38
Apuesta: 13
Ratio: 3.92:1
Equity necesaria: 20.3%
Mano Hero: Color al Q
Mano Villain: Color al Q

Outs positivas: --
Outs negativas: --
Outs limpias: --
Outs marginales: --
Outs brutas: --
Outs utiles decision: --

Equity turn: N/A
Equity river: N/A
Resultado: Villain gana

Desarrollo:
Bote final = 38 + 13 + 13 = 64
Equity necesaria = 13 / 64 = 20.3%
Mano final Hero = Color al Q
Mano final Villain = Color al Q
Resultado final = Villain gana
Equity futura = N/A
```
- Observaciones:
  - cartas muertas detectadas: no
  - duplicados: no
  - modo interno correcto: si
  - calculo por calle correcto: si
  - JUGADA/OUTS/Reveal correcto: si
  - bug encontrado: no

## TEST 091 · River quads board
- Estado esperado de ejecucion: OK
- Export bruto del Pot Odds Trainer
```text
POT ODDS TRAINER
Modo interno: RIVER_FINAL_MODE
Hero: A♠ K♦
Villain: Q♣ J♣
Board: 7♣ 7♦ 7♥
Turn: 7♠
River: 2♦
Cartas muertas: A♠ K♦ 7♣ 7♦ 7♥ 7♠ 2♦ Q♣ J♣
Available deck: 43

Bote: 58
Apuesta: 22
Ratio: 3.64:1
Equity necesaria: 21.6%
Mano Hero: Poker de 7
Mano Villain: Poker de 7

Outs positivas: --
Outs negativas: --
Outs limpias: --
Outs marginales: --
Outs brutas: --
Outs utiles decision: --

Equity turn: N/A
Equity river: N/A
Resultado: Hero gana

Desarrollo:
Bote final = 58 + 22 + 22 = 102
Equity necesaria = 22 / 102 = 21.6%
Mano final Hero = Poker de 7
Mano final Villain = Poker de 7
Resultado final = Hero gana
Equity futura = N/A
```
- Observaciones:
  - cartas muertas detectadas: no
  - duplicados: no
  - modo interno correcto: si
  - calculo por calle correcto: si
  - JUGADA/OUTS/Reveal correcto: si
  - bug encontrado: no

## TEST 092 · River full on board
- Estado esperado de ejecucion: OK
- Export bruto del Pot Odds Trainer
```text
POT ODDS TRAINER
Modo interno: RIVER_FINAL_MODE
Hero: A♠ K♦
Villain: Q♣ J♣
Board: 7♣ 7♦ K♥
Turn: K♠
River: 7♥
Cartas muertas: A♠ K♦ 7♣ 7♦ K♥ K♠ 7♥ Q♣ J♣
Available deck: 43

Bote: 58
Apuesta: 22
Ratio: 3.64:1
Equity necesaria: 21.6%
Mano Hero: Full de K con 7
Mano Villain: Full de 7 con K

Outs positivas: --
Outs negativas: --
Outs limpias: --
Outs marginales: --
Outs brutas: --
Outs utiles decision: --

Equity turn: N/A
Equity river: N/A
Resultado: Hero gana

Desarrollo:
Bote final = 58 + 22 + 22 = 102
Equity necesaria = 22 / 102 = 21.6%
Mano final Hero = Full de K con 7
Mano final Villain = Full de 7 con K
Resultado final = Hero gana
Equity futura = N/A
```
- Observaciones:
  - cartas muertas detectadas: no
  - duplicados: no
  - modo interno correcto: si
  - calculo por calle correcto: si
  - JUGADA/OUTS/Reveal correcto: si
  - bug encontrado: no

## TEST 093 · River straight on board
- Estado esperado de ejecucion: OK
- Export bruto del Pot Odds Trainer
```text
POT ODDS TRAINER
Modo interno: RIVER_FINAL_MODE
Hero: A♠ 2♦
Villain: K♣ Q♣
Board: 6♠ 7♥ 8♣
Turn: 9♦
River: T♠
Cartas muertas: A♠ 2♦ 6♠ 7♥ 8♣ 9♦ T♠ K♣ Q♣
Available deck: 43

Bote: 44
Apuesta: 16
Ratio: 3.75:1
Equity necesaria: 21.1%
Mano Hero: Escalera al T
Mano Villain: Escalera al T

Outs positivas: --
Outs negativas: --
Outs limpias: --
Outs marginales: --
Outs brutas: --
Outs utiles decision: --

Equity turn: N/A
Equity river: N/A
Resultado: Empate

Desarrollo:
Bote final = 44 + 16 + 16 = 76
Equity necesaria = 16 / 76 = 21.1%
Mano final Hero = Escalera al T
Mano final Villain = Escalera al T
Resultado final = Empate
Equity futura = N/A
```
- Observaciones:
  - cartas muertas detectadas: no
  - duplicados: no
  - modo interno correcto: si
  - calculo por calle correcto: si
  - JUGADA/OUTS/Reveal correcto: si
  - bug encontrado: no

## TEST 094 · River flush vs full
- Estado esperado de ejecucion: OK
- Export bruto del Pot Odds Trainer
```text
POT ODDS TRAINER
Modo interno: RIVER_FINAL_MODE
Hero: A♥ 9♥
Villain: J♣ J♦
Board: 2♥ 2♣ J♥
Turn: K♥
River: 3♥
Cartas muertas: A♥ 9♥ 2♥ 2♣ J♥ K♥ 3♥ J♣ J♦
Available deck: 43

Bote: 85
Apuesta: 35
Ratio: 3.43:1
Equity necesaria: 22.6%
Mano Hero: Color al A
Mano Villain: Full de J con 2

Outs positivas: --
Outs negativas: --
Outs limpias: --
Outs marginales: --
Outs brutas: --
Outs utiles decision: --

Equity turn: N/A
Equity river: N/A
Resultado: Villain gana

Desarrollo:
Bote final = 85 + 35 + 35 = 155
Equity necesaria = 35 / 155 = 22.6%
Mano final Hero = Color al A
Mano final Villain = Full de J con 2
Resultado final = Villain gana
Equity futura = N/A
```
- Observaciones:
  - cartas muertas detectadas: no
  - duplicados: no
  - modo interno correcto: si
  - calculo por calle correcto: si
  - JUGADA/OUTS/Reveal correcto: si
  - bug encontrado: no

## TEST 095 · River straight flush possibility
- Estado esperado de ejecucion: OK
- Export bruto del Pot Odds Trainer
```text
POT ODDS TRAINER
Modo interno: RIVER_FINAL_MODE
Hero: 8♣ 9♣
Villain: A♦ A♥
Board: 6♣ 7♣ K♦
Turn: T♣
River: 2♠
Cartas muertas: 8♣ 9♣ 6♣ 7♣ K♦ T♣ 2♠ A♦ A♥
Available deck: 43

Bote: 120
Apuesta: 50
Ratio: 3.40:1
Equity necesaria: 22.7%
Mano Hero: Escalera de color al T
Mano Villain: Pareja de A

Outs positivas: --
Outs negativas: --
Outs limpias: --
Outs marginales: --
Outs brutas: --
Outs utiles decision: --

Equity turn: N/A
Equity river: N/A
Resultado: Hero gana

Desarrollo:
Bote final = 120 + 50 + 50 = 220
Equity necesaria = 50 / 220 = 22.7%
Mano final Hero = Escalera de color al T
Mano final Villain = Pareja de A
Resultado final = Hero gana
Equity futura = N/A
```
- Observaciones:
  - cartas muertas detectadas: no
  - duplicados: no
  - modo interno correcto: si
  - calculo por calle correcto: si
  - JUGADA/OUTS/Reveal correcto: si
  - bug encontrado: no

## TEST 096 · River duplicate invalid overlap
- Estado esperado de ejecucion: INVALIDO CONTROLADO
- Export bruto del Pot Odds Trainer
```text
POT ODDS TRAINER
Entrada invalida controlada: Cartas duplicadas: Q♠
Hero: A♣ K♣
Villain: Q♠ Q♥
Flop: J♣ T♣ 2♦
Turn: 7♠
River: Q♠
Bote: 100
Apuesta: 40
```
- Observaciones:
  - cartas muertas detectadas: no
  - duplicados: no
  - modo interno correcto: si
  - calculo por calle correcto: si
  - JUGADA/OUTS/Reveal correcto: si
  - bug encontrado: Cartas duplicadas: Q♠

## TEST 097 · Empty Villain river final
- Estado esperado de ejecucion: OK
- Export bruto del Pot Odds Trainer
```text
POT ODDS TRAINER
Modo interno: RIVER_FINAL_MODE
Hero: 8♣ 9♦
Villain: --
Board: 6♠ 7♥ T♣
Turn: 2♦
River: 3♥
Cartas muertas: 8♣ 9♦ 6♠ 7♥ T♣ 2♦ 3♥
Available deck: 45

Bote: 80
Apuesta: 40
Ratio: 3.00:1
Equity necesaria: 25.0%
Mano Hero: Escalera al T
Mano Villain: --

Outs positivas: N/A
Outs negativas: N/A
Outs limpias: --
Outs marginales: --
Outs brutas: --
Outs utiles decision: --

Equity turn: N/A
Equity river: N/A
Resultado: Sin Villain

Desarrollo:
Bote final = 80 + 40 + 40 = 160
Equity necesaria = 40 / 160 = 25.0%
Mano final Hero = Escalera al T
Mano final Villain = --
Resultado final = Sin Villain
Equity futura = N/A
```
- Observaciones:
  - cartas muertas detectadas: no
  - duplicados: no
  - modo interno correcto: si
  - calculo por calle correcto: si
  - JUGADA/OUTS/Reveal correcto: si
  - bug encontrado: no

## TEST 098 · No turn but river filled invalid state
- Estado esperado de ejecucion: INVALIDO CONTROLADO
- Export bruto del Pot Odds Trainer
```text
POT ODDS TRAINER
Entrada invalida controlada: River sin Turn
Hero: 8♣ 9♦
Villain: --
Flop: 6♠ 7♥ T♣
Turn: --
River: 3♥
Bote: 80
Apuesta: 40
```
- Observaciones:
  - cartas muertas detectadas: no
  - duplicados: no
  - modo interno correcto: si
  - calculo por calle correcto: si
  - JUGADA/OUTS/Reveal correcto: si
  - bug encontrado: River sin Turn

## TEST 099 · Only flop incomplete board
- Estado esperado de ejecucion: OK
- Export bruto del Pot Odds Trainer
```text
POT ODDS TRAINER
Modo interno: DRAW_MODE
Hero: A♣ K♣
Villain: Q♠ Q♥
Board: --
Turn: --
River: --
Cartas muertas: A♣ K♣ Q♠ Q♥
Available deck: 48

Bote: 100
Apuesta: 40
Ratio: 3.50:1
Equity necesaria: 22.2%
Mano Hero: --
Mano Villain: --

Outs positivas: --
Outs negativas: --
Outs limpias: --
Outs marginales: --
Outs brutas: --
Outs utiles decision: --

Equity turn: 0.0%
Equity river: 0.0%
Resultado: FOLD

Desarrollo:
Bote final = 100 + 40 + 40 = 180
Equity necesaria = 40 / 180 = 22.2%
Turn = 0 x 2 = 0.0%
River = 0 x 2 = 0.0%
0.0% < 22.2% => FOLD
```
- Observaciones:
  - cartas muertas detectadas: no
  - duplicados: no
  - modo interno correcto: si
  - calculo por calle correcto: si
  - JUGADA/OUTS/Reveal correcto: si
  - bug encontrado: no

## TEST 100 · All empty stress
- Estado esperado de ejecucion: INVALIDO CONTROLADO
- Export bruto del Pot Odds Trainer
```text
POT ODDS TRAINER
Entrada invalida controlada: Estado vacio
Hero: --
Villain: --
Flop: --
Turn: --
River: --
Bote: 25
Apuesta: 8
```
- Observaciones:
  - cartas muertas detectadas: no
  - duplicados: no
  - modo interno correcto: si
  - calculo por calle correcto: si
  - JUGADA/OUTS/Reveal correcto: si
  - bug encontrado: Estado vacio
