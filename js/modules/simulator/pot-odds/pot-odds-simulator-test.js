'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '../../../..');
const storage = new Map();

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
function load(file) {
  vm.runInThisContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), { filename: file });
}
global.window = {
  RT: { emit() {}, on() {} },
  localStorage: {
    getItem(key) { return storage.get(key) || null; },
    setItem(key, value) { storage.set(key, String(value)); },
    removeItem(key) { storage.delete(key); }
  }
};
global.localStorage = window.localStorage;
load('js/modules/math-trainer/pot-odds-trainer/pot-odds-trainer-state.js');
load('js/modules/math-trainer/pot-odds-trainer/pot-odds-trainer-engine.js');
load('js/modules/simulator/pot-odds/pot-odds-simulator-adapter.js');

const pot = window.RT.SimulatorPotOdds;
assert(typeof pot.stop === 'function', 'Pot Odds no expone stop para cambiar de pestaÃ±a');
pot.setConfig('count', 0);
['flop', 'turn', 'mixed'].forEach(street => {
  ['mixed', 'oesd', 'gutshot', 'flush', 'combo', 'made-hand'].forEach(kind => {
    pot.setConfig('street', street);
    pot.setConfig('kind', kind);
    for (let index = 0; index < 20; index++) {
      assert(pot.next(), 'No se generó un spot');
      const round = pot.state.round;
      assert(round.board.length === (round.street === 'turn' ? 4 : 3), 'Street incoherente');
      assert(round.board.length < 5, 'El simulador generó River');
      assert(new Set(round.hero.concat(round.board)).size === round.hero.length + round.board.length,
        'Cartas duplicadas');
      assert(round.analysis.math.finalPot === round.scenario.pot + round.scenario.bet * 2,
        'Bote final incoherente');
      assert(Math.abs(round.analysis.math.needed -
        round.scenario.bet / round.analysis.math.finalPot * 100) < 0.0001,
      'Equity necesaria incoherente');
      if (round.analysis.mode === 'MADE_HAND_MODE') {
        assert(round.expectedDecision === 'N/A', 'La mano hecha no debe puntuar CALL/FOLD por outs');
      } else {
        assert(['CALL', 'FOLD'].includes(round.expectedDecision), 'Decisión inválida');
        assert(round.expectedDecision === round.analysis.math.action, 'Decisión distinta a Pot Odds');
      }
    }
  });
});

// Configuración compacta del Simulador: cada select/check modifica su propio
// estado, sin depender del Pot Odds Trainer de Math.
pot.setConfig('countdown', 10);
pot.setConfig('memoryDuration', 2);
pot.setConfig('memoryRandomCount', 2);
pot.setConfig('suitMode', 'rainbow');
pot.toggleConfigSet('memoryZones', 'hero');
pot.toggleConfigSet('memoryZones', 'flop');
pot.toggleConfigSet('hiddenFields', 'needed');
pot.toggleConfigSet('hiddenFields', 'result');
assert(pot.state.config.countdown === 10 && pot.state.config.memoryDuration === 2,
  'Tiempo o memoria no se guardan en el Simulador');
assert(pot.state.config.memoryZones.has('hero') && pot.state.config.memoryZones.has('flop'),
  'Las zonas de memoria no se actualizan');
assert(pot.state.config.hiddenFields.has('needed') && pot.state.config.hiddenFields.has('result'),
  'Las ayudas visibles no se actualizan');
pot.setConfig('street', 'flop');
pot.setConfig('kind', 'mixed');
assert(pot.next(), 'No genera spot con board rainbow');
assert(new Set(pot.state.round.board.slice(0, 3).map(card => card[1])).size === 3,
  'El tipo de board rainbow no se aplica');
pot.setConfig('suitMode', 'mono');
assert(pot.next(), 'No genera spot con board mono');
assert(new Set(pot.state.round.board.slice(0, 3).map(card => card[1])).size === 1,
  'El tipo de board mono no se aplica');
assert(pot.toggleReveal(), 'Reveal no se activa en la mesa del Simulador');
assert(pot.state.aids.reveal, 'Reveal no conserva su estado');
pot.toggleReveal();
assert(!pot.state.aids.reveal, 'Reveal no se puede ocultar');
pot.setConfig('suitMode', 'random');
pot.setConfig('boardLocked', true);
pot.setConfig('scenarioLocked', true);
pot.setConfig('street', 'flop');
assert(pot.next(), 'No genera el primer spot bloqueado');
const lockedRound = pot.state.round;
assert(pot.next(), 'No genera el segundo spot bloqueado');
assert(pot.state.round.hero.join('|') === lockedRound.hero.join('|') &&
  pot.state.round.board.join('|') === lockedRound.board.join('|'), 'El bloqueo de board no conserva las cartas');
assert(pot.state.round.scenario.pot === lockedRound.scenario.pot &&
  pot.state.round.scenario.bet === lockedRound.scenario.bet, 'El bloqueo de escenario no conserva el precio');
pot.setConfig('boardLocked', false);
pot.setConfig('scenarioLocked', false);
pot.setConfig('countdown', 0);
pot.setConfig('memoryDuration', 0);
pot.setConfig('memoryRandomCount', 0);
pot.toggleConfigSet('memoryZones', 'hero');
pot.toggleConfigSet('memoryZones', 'flop');
pot.toggleConfigSet('hiddenFields', 'needed');
pot.toggleConfigSet('hiddenFields', 'result');

pot.setConfig('street', 'flop');
pot.setConfig('kind', 'flush');
pot.next();
const original = pot.state.round;
const answer = original.expectedDecision === 'CALL' ? 'FOLD' : 'CALL';
pot.answer(answer);
assert(pot.openLab(), 'No abrió el Lab interno');
assert(pot.state.lab.view === 'lab', 'El Lab no quedó activo dentro del simulador');
assert(pot.state.lab.spot.hero.join('|') === original.hero.join('|'), 'Hero no se precargó');
assert(pot.state.lab.spot.board.join('|') === original.board.join('|'), 'Board no se precargó');
assert(pot.state.lab.spot.scenario.pot === original.scenario.pot, 'Bote no se precargó');
pot.toggleLabOuts();
pot.toggleLabHand();
assert(pot.labState.session.revealOuts && pot.labState.session.revealHand,
  'OUTS o JUGADA no cambian el estado del Lab');
pot.toggleLabReveal();
assert(pot.labState.session.revealOuts && !pot.labState.session.revealHand,
  'Reveal no sincroniza las ayudas del Lab');
pot.labSetScenario('pot', '100');
pot.labSetScenario('bet', '25');
assert(pot.labState.lab.scenario.pot === 100 && pot.labState.lab.scenario.bet === 25,
  'No se actualizan Bote y Apuesta dentro del Lab');
pot.labSetSelectionMode('negative');
pot.labSetDisplayMode('ratio');
assert(pot.labState.session.activeSelection === 'negative', 'No cambia el selector de outs');
assert(pot.labState.config.displayMode === 'ratio', 'No cambia el modo de lectura');
const dead = new Set(pot.labAnalysis().outs.deadCards);
const replacement = ['A\u2660', 'K\u2660', 'Q\u2660', 'J\u2660', 'T\u2660', '9\u2660']
  .find(card => !dead.has(card));
pot.labSelectSlot('turn', 0);
pot.labPlaceCard(replacement);
assert(pot.labState.lab.turn[0] === replacement, 'No se puede editar una carta del Lab');
pot.toggleLabReveal();
const revealCard = pot.labAnalysis().outs.useful[0] || replacement;
assert(pot.labExplainCard(revealCard), 'Reveal no explica una carta del mazo');
assert(pot.labState.session.revealDetail && pot.labState.session.revealDetail.card === revealCard,
  'Reveal no guarda el detalle de la carta');
assert(typeof pot.exportRound() === 'string', 'Export no devuelve texto');
assert(pot.state.exportNotice, 'Export no confirma su estado');
pot.labClear();
assert(pot.labState.lab.hero.every(card => card === null), 'Limpiar no restablece el Lab');
assert(!pot.state.lab.revealOuts && !pot.state.lab.revealHand, 'Limpiar no restablece las ayudas internas');
assert(pot.closeLab(), 'No volvió a la mesa');
assert(pot.state.lab.view === 'table', 'No cerró la vista Lab');
assert(pot.state.round === original && pot.state.answer === answer, 'La mesa perdió el spot o respuesta');

assert(pot.openLab(), 'No reabrio el Lab interno');
assert(pot.state.lab.spot.board.join('|') === original.board.join('|'), 'Al reabrir no conserva la mesa original');
assert(pot.closeLab(), 'No cerro el Lab al reabrir');

pot.setConfig('street', 'flop');
pot.setConfig('kind', 'made-hand');
assert(pot.next(), 'No genero el spot de mano hecha');
assert(pot.state.round.expectedDecision === 'N/A', 'Mano hecha recibe una falsa decisión CALL/FOLD');
assert(!pot.answer('CALL'), 'Se puede puntuar CALL en una mano hecha');
assert(pot.openLab(), 'No abrio mano hecha en el Lab');
assert(pot.labAnalysis().mode === 'MADE_HAND_MODE', 'La mano hecha no conserva su modo');
assert(pot.exportRound().includes('Decision por outs: N/A - mano hecha'), 'Export de mano hecha no explica N/A');
assert(pot.closeLab(), 'No cerro el Lab de mano hecha');
pot.setConfig('street', 'turn');
pot.setConfig('kind', 'flush');
assert(pot.next(), 'No genero el spot de turn');
assert(pot.openLab(), 'No abrio turn en el Lab');
assert(pot.labState.lab.turn[0], 'El turn no se precargo en el Lab');
assert(pot.closeLab(), 'No cerro el Lab de turn');

console.log(JSON.stringify({ ok: true, generated: 360, internalLab: true }));
