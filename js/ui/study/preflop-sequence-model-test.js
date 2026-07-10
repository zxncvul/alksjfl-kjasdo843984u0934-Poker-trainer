'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const sandbox = { window: { RT: {} } };
vm.createContext(sandbox);
['range-form-model.js', 'preflop-sequence-model.js'].forEach(file => {
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, file), 'utf8'),
    sandbox,
    { filename: file }
  );
});

const model = sandbox.window.RT.PreflopSequenceModel;
const rangeModel = sandbox.window.RT.RangeFormModel;
const positions = ['LJ / UTG', 'HJ / MP', 'CO', 'BTN', 'SB', 'BB'];
let checks = 0;
function check(condition, message) {
  checks++;
  assert(condition, message);
}

let state = model.empty('hero');
state = model.setPosition(state, 'hero', 'LJ / UTG', positions);
state = model.setPosition(state, 'rival', 'BTN', positions);
state = model.addAction(state, 'hero', 'open_raise', positions);
check(model.stage(state, positions).actor === 'rival', 'Tras OR debe actuar Rival');
check(model.stage(state, positions).actions.includes('three_bet'), 'Rival debe poder hacer 3Bet');
state = model.addAction(state, 'rival', 'three_bet', positions);
check(model.stage(state, positions).actor === 'hero', 'Tras 3Bet debe responder Hero');
check(model.stage(state, positions).actions.includes('four_bet'), 'Hero debe poder hacer 4Bet');
check(model.needsHeroReturnConfirmation(state, positions),
  'Tras accion agresiva de Rival, Hero debe confirmar su posicion antes de responder');
const blockedResponse = model.addAction(state, 'hero', 'call', positions);
check(blockedResponse.sequence.length === state.sequence.length,
  'Hero no debe poder responder antes de confirmar el cierre de rivales');
state = model.confirmHeroReturn(state, positions);
check(!model.needsHeroReturnConfirmation(state, positions),
  'Confirmar Hero debe habilitar la respuesta');
check(model.availableRivalPositions(state, positions).length === 0,
  'Confirmar Hero debe cerrar rivales pendientes como folds');
const heroFourBetAfterClose = model.addAction(state, 'hero', 'four_bet', positions);
check(model.availableRivalPositions(heroFourBetAfterClose, positions).length === 0,
  'Los rivales cerrados no deben reaparecer tras una nueva accion de Hero');
let detected = model.detect(state);
check(detected.spot === 'Facing 3Bet', 'Debe detectar Facing 3Bet');
check(detected.suggestedSubSpot.includes('LJ / UTG') &&
  detected.suggestedSubSpot.includes('BTN'), 'Debe conservar posiciones en la sugerencia');
state = model.addAction(state, 'hero', 'call', positions);
detected = model.detect(state);
check(detected.complete && detected.subSpot === 'Call vs 3Bet',
  'Call debe completar la respuesta a 3Bet');

let rivalFirst = model.empty('rival');
rivalFirst = model.setPosition(rivalFirst, 'rival', 'LJ / UTG', positions);
rivalFirst = model.setPosition(rivalFirst, 'hero', 'BB', positions);
rivalFirst = model.addAction(rivalFirst, 'rival', 'open_raise', positions);
rivalFirst = model.addAction(rivalFirst, 'hero', 'three_bet', positions);
detected = model.detect(rivalFirst);
check(detected.spot === 'Facing open' && detected.subSpot === '3Bet vs open',
  'Debe detectar Hero 3Bet vs open');

let conflict = model.empty();
conflict = model.setPosition(conflict, 'hero', 'CO', positions);
conflict = model.setPosition(conflict, 'rival', 'CO', positions);
check(conflict.positions.hero === 'CO' && conflict.positions.rival === '',
  'Una posicion bloqueada no debe borrar la seleccion del otro jugador');

let multipleRivals = model.empty();
multipleRivals = model.setPosition(multipleRivals, 'hero', 'CO', positions);
multipleRivals = model.setPosition(multipleRivals, 'rival', 'BTN', positions);
multipleRivals = model.setPosition(multipleRivals, 'rival', 'SB', positions);
check(
  multipleRivals.rivalPositions.join(',') === 'BTN,SB' &&
    multipleRivals.positions.rival === 'SB',
  'Rival debe admitir varias posiciones y conservar una principal'
);
multipleRivals = model.setPosition(multipleRivals, 'rival', 'BTN', positions);
check(
  multipleRivals.rivalPositions.join(',') === 'BTN,SB' &&
    multipleRivals.positions.rival === 'BTN',
  'Una posicion rival ya seleccionada no debe alternar estados fuera del flujo guiado'
);

const fiveMax = ['HJ', 'CO', 'BTN', 'SB', 'BB'];
const resized = model.normalize(state, fiveMax);
check(!resized.positions.hero && resized.sequence.length === 0,
  'Cambiar TABLE debe limpiar posiciones y pasos incompatibles');

const switched = model.setOrder(rivalFirst, 'hero', positions);
check(switched.order === 'hero' && switched.sequence.length === 0,
  'Cambiar actor inicial debe limpiar una secuencia incompatible');

let shove = model.empty('rival');
shove = model.setPosition(shove, 'rival', 'BTN', positions);
shove = model.setPosition(shove, 'hero', 'BB', positions);
shove = model.addAction(shove, 'rival', 'open_jam', positions);
check(model.stage(shove, positions).actor === 'hero' &&
  model.stage(shove, positions).actions.join(',') === 'call',
  'Un open jam debe ofrecer solo Call como accion navegable');

const corrupt = model.normalize({
  order: '???',
  positions: { hero: 'Mars', rival: 'BB' },
  sequence: [{ actor: 'other', position: 'Mars', action: 'teleport' }]
}, positions);
check(corrupt.order === 'hero' && corrupt.positions.hero === '' &&
  corrupt.positions.rival === 'BB' && corrupt.sequence.length === 0,
  'El estado corrupto debe recuperarse de forma segura');

check(model.stage(null, positions).actor === 'hero',
  'Stage debe recuperarse de un estado ausente');
const blockedHero = model.setPosition(multipleRivals, 'hero', 'SB', positions);
check(blockedHero.positions.hero === 'CO' &&
  blockedHero.rivalPositions.join(',') === 'BTN,SB',
'Hero no debe poder ocupar una posicion rival seleccionada');

const blockedFirstHeroBb = model.setPosition(model.empty('hero'), 'hero', 'BB', positions);
check(blockedFirstHeroBb.positions.hero === '',
  'BB no debe poder abrir la secuencia como Hero');
let heroFirstWithBbRival = model.setPosition(model.empty('hero'), 'hero', 'CO', positions);
heroFirstWithBbRival = model.setPosition(heroFirstWithBbRival, 'rival', 'BB', positions);
check(heroFirstWithBbRival.rivalPositions.includes('BB'),
  'BB si debe poder ser Rival cuando Hero abre primero');
const blockedFirstRivalBb = model.setPosition(model.empty('rival'), 'rival', 'BB', positions);
check(blockedFirstRivalBb.rivalPositions.length === 0,
  'BB no debe poder abrir la secuencia como Rival');
let rivalFirstWithHeroBb = model.setPosition(model.empty('rival'), 'rival', 'CO', positions);
rivalFirstWithHeroBb = model.setPosition(rivalFirstWithHeroBb, 'hero', 'BB', positions);
check(rivalFirstWithHeroBb.positions.hero === 'BB',
  'BB si debe poder ser Hero cuando responde a Rival');

let callChain = model.empty('hero');
callChain = model.setPosition(callChain, 'hero', 'LJ / UTG', positions);
callChain = model.addAction(callChain, 'hero', 'open_raise', positions);
callChain = model.setPosition(callChain, 'rival', 'BTN', positions);
check(model.availableActionsForActor(callChain, 'rival', positions).includes('call'),
  'CALL frente a OR debe existir si quedan rivales detras');
callChain = model.addAction(callChain, 'rival', 'call', positions);
check(model.stage(callChain, positions).actor === 'rival',
  'Tras Call de Rival, Hero no debe quedar habilitado todavia');
check(model.availableRivalPositions(callChain, positions).join(',') === 'SB,BB',
  'Tras Call de BTN, solo SB y BB deben seguir vivos; HJ/CO se entienden foldeados');
callChain = model.setPosition(callChain, 'rival', 'SB', positions);
callChain = model.addAction(callChain, 'rival', 'three_bet', positions);
check(model.stage(callChain, positions).actor === 'hero',
  'Tras caller y 3Bet, la decision debe volver a Hero');
check(model.needsHeroReturnConfirmation(callChain, positions),
  'Hero debe poder cerrar rivales o anadir BB tras 3Bet de SB');
check(model.pendingPositions(callChain, positions).join(',') === 'LJ / UTG,BB',
  'Al volver a Hero deben parpadear Hero y los rivales restantes aun disponibles');
callChain = model.confirmHeroReturn(callChain, positions);
check(model.foldedPositions(callChain, positions).includes('HJ / MP'),
  'Las posiciones saltadas entre Hero y Rival deben atenuarse como folds');

let skippedRivals = model.empty('hero');
skippedRivals = model.setPosition(skippedRivals, 'hero', 'LJ / UTG', positions);
skippedRivals = model.addAction(skippedRivals, 'hero', 'open_raise', positions);
skippedRivals = model.setPosition(skippedRivals, 'rival', 'BTN', positions);
skippedRivals = model.addAction(skippedRivals, 'rival', 'three_bet', positions);
check(model.availableRivalPositions(skippedRivals, positions).join(',') === 'SB,BB',
  'Cuando BTN responde, HJ y CO ya no deben volver a activarse como rivales pendientes');
check(model.pendingPositions(skippedRivals, positions).join(',') === 'LJ / UTG,SB,BB',
  'El cierre debe permitir responder con Hero o elegir solo rivales posteriores al agresor');

let rivalFirstLimpChain = model.empty('rival');
rivalFirstLimpChain = model.setPosition(rivalFirstLimpChain, 'hero', 'BTN', positions);
rivalFirstLimpChain = model.setPosition(rivalFirstLimpChain, 'rival', 'LJ / UTG', positions);
rivalFirstLimpChain = model.addAction(rivalFirstLimpChain, 'rival', 'limp', positions);
check(model.availableRivalPositions(rivalFirstLimpChain, positions).join(',') === 'HJ / MP,CO',
  'En rival-first solo deben quedar posiciones posteriores al limper y anteriores a Hero');
rivalFirstLimpChain = model.setPosition(rivalFirstLimpChain, 'rival', 'CO', positions);
rivalFirstLimpChain = model.addAction(rivalFirstLimpChain, 'rival', 'limp', positions);
check(model.availableRivalPositions(rivalFirstLimpChain, positions).length === 0,
  'Si CO limpea antes de Hero BTN, HJ queda saltado como fold y ya no se reabre');

let lastRival = model.empty('hero');
lastRival = model.setPosition(lastRival, 'hero', 'SB', positions);
lastRival = model.addAction(lastRival, 'hero', 'open_raise', positions);
lastRival = model.setPosition(lastRival, 'rival', 'BB', positions);
check(!model.availableActionsForActor(lastRival, 'rival', positions).includes('call'),
  'CALL no debe aparecer si seria terminal y no queda nadie detras');

let heroOpenJam = model.empty('hero');
heroOpenJam = model.setPosition(heroOpenJam, 'hero', 'SB', positions);
heroOpenJam = model.addAction(heroOpenJam, 'hero', 'open_jam', positions);
heroOpenJam = model.setPosition(heroOpenJam, 'rival', 'BB', positions);
check(model.stage(heroOpenJam, positions).actor === null &&
  model.stage(heroOpenJam, positions).actions.length === 0,
  'Hero open jam debe cerrar el flujo tras seleccionar Rival sin mostrar Call/Fold terminal');

let fourBetFlow = model.empty('hero');
fourBetFlow = model.setPosition(fourBetFlow, 'hero', 'CO', positions);
fourBetFlow = model.addAction(fourBetFlow, 'hero', 'open_raise', positions);
fourBetFlow = model.setPosition(fourBetFlow, 'rival', 'BTN', positions);
fourBetFlow = model.addAction(fourBetFlow, 'rival', 'three_bet', positions);
fourBetFlow = model.confirmHeroReturn(fourBetFlow, positions);
fourBetFlow = model.addAction(fourBetFlow, 'hero', 'four_bet', positions);
check(model.stage(fourBetFlow, positions).actor === 'rival' &&
  model.stage(fourBetFlow, positions).actions.includes('five_bet'),
  'Tras Hero 4Bet, Rival debe poder responder con acciones superiores');

const tables = rangeModel.CATALOG.tables.map(table => rangeModel.positions(table));
tables.forEach(tablePositions => {
  tablePositions.forEach(hero => {
    let candidate = model.setPosition(model.empty('hero'), 'hero', hero, tablePositions);
    check(candidate.positions.hero === (hero === 'BB' ? '' : hero),
      `${hero} debe respetar si puede abrir como Hero`);
    tablePositions.filter(position => position !== hero).forEach(rival => {
      candidate = model.setPosition(candidate, 'rival', rival, tablePositions);
      check(candidate.rivalPositions.includes(rival),
        `${rival} debe poder sumarse como Rival frente a ${hero}`);
    });
    if (candidate.positions.hero) {
      check(!candidate.rivalPositions.includes(hero),
        `${hero} nunca puede quedar simultaneamente en Rival`);
    }
  });
});

[
  ['hero', 'open_raise'],
  ['hero', 'open_jam']
].forEach(([actor, action]) => {
  let branch = model.empty(actor);
  branch = model.setPosition(branch, 'hero', positions[0], positions);
  branch = model.setPosition(branch, 'rival', positions[1], positions);
  const next = model.addAction(branch, actor, action, positions);
  check(next.sequence.length === 1 && next.sequence[0].action === action,
    `${action} debe ser aceptada en su etapa valida`);
});
['fold', 'limp'].forEach(action => {
  let branch = model.empty('hero');
  branch = model.setPosition(branch, 'hero', positions[0], positions);
  const next = model.addAction(branch, 'hero', action, positions);
  check(next.sequence.length === 0,
    `${action} no debe ser aceptada como apertura de Hero`);
});

let exploredBranches = 0;
function explore(state, tablePositions, depth = 0) {
  if (model.needsHeroReturnConfirmation(state, tablePositions)) {
    explore(model.confirmHeroReturn(state, tablePositions), tablePositions, depth + 1);
    return;
  }
  const next = model.stage(state, tablePositions);
  if (!next.actor || depth >= 6) {
    model.detect(state);
    model.describe(state);
    exploredBranches++;
    return;
  }
  next.actions.forEach(action => {
    const advanced = model.addAction(state, next.actor, action, tablePositions);
    if (advanced.sequence.length === state.sequence.length + 1) {
      explore(advanced, tablePositions, depth + 1);
    }
  });
}
['hero', 'rival'].forEach(order => {
  let branch = model.empty(order);
  branch = model.setPosition(branch, 'hero', positions[0], positions);
  branch = model.setPosition(branch, 'rival', positions[1], positions);
  explore(branch, positions);
});
check(exploredBranches >= 5, 'Action audit must explore the main guided branches');

console.log(
  `Preflop sequence model: ${checks} checks and ${exploredBranches} branches OK`
);
