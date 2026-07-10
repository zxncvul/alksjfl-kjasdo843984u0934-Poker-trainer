'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const sandbox = { window: { RT: {} } };
vm.createContext(sandbox);
vm.runInContext(
  fs.readFileSync(path.join(__dirname, 'range-form-model.js'), 'utf8'),
  sandbox,
  { filename: 'range-form-model.js' }
);

const model = sandbox.window.RT.RangeFormModel;
let checks = 0;
function check(condition, message) {
  checks++;
  assert(condition, message);
}

const initial = model.defaults();
check(model.validate(initial).length === 0, 'Defaults must validate');
check(!model.validate(initial).some(error => error.key === 'name'),
  'Name stays optional because its field was removed');
check(model.validate(Object.assign({}, initial, { rangeType: '' }))
  .some(error => error.key === 'rangeType'), 'Range type must be required');
check(model.validate(Object.assign({}, initial, {
  game: 'HU', tableSize: '6-max'
})).some(error => error.key === 'tableSize'), 'HU must reject non-HU tables');
check(model.validate(Object.assign({}, initial, {
  forcedBetMode: 'ante',
  anteConfig: { type: '', amount: '1bb / 100%', unit: 'bb' }
})).some(error => error.key === 'anteConfig'), 'Ante needs a valid type and amount');
check(model.validate(Object.assign({}, initial, {
  forcedBetMode: 'straddle',
  straddleConfig: { type: '', amount: '2bb / x2', unit: 'bb' }
})).some(error => error.key === 'straddleConfig'),
'Straddle needs a valid type and amount');

const recovered = model.normalize({
  collection: '???', game: '???', tableSize: '20-max',
  action: '???', profile: 7, multiway: 'yes'
});
check(recovered.collection === 'Mis rangos' && recovered.game === 'Cash' &&
  recovered.tableSize === '6-max' && recovered.action === 'Fold' &&
  recovered.profile === 'General' && recovered.multiway === false,
'Corrupt drafts must recover safe values');

model.CATALOG.games.forEach(game => {
  const normalized = model.normalize({ game });
  check(model.subGames(game).includes(normalized.subGame), `${game}: sub game`);
  check(model.stakes(game).includes(normalized.stake), `${game}: stake`);
  if (game === 'HU') check(normalized.tableSize === '2-max', 'HU forces 2-max');
  if (model.isTournament(game)) {
    check(model.phases(game).includes(normalized.phase), `${game}: phase`);
    check(model.prizes(game).includes(normalized.prize), `${game}: prize`);
  }
});

const multiway = model.normalize({
  multiway: true, spot: 'Unopened pot', relation: 'IP'
});
check(multiway.multiwayMode === 'MULTIWAY' && multiway.multiway,
  'Legacy multiway boolean must migrate to MULTIWAY mode');
check(model.spots(true).includes(multiway.spot), 'Multiway uses its spot catalog');
check(model.subSpots(multiway.spot).includes(multiway.subSpot),
  'Sub spot follows spot');

const custom = model.normalize({
  customSpotPairs: [{ spot: 'Mi spot', subSpot: 'Mi secuencia' }],
  spot: 'Mi spot',
  subSpot: 'Mi secuencia'
});
check(custom.spot === 'Mi spot' && custom.subSpot === 'Mi secuencia',
  'Custom spot pairs survive normalization');

check(model.normalize({
  game: 'MTT', environment: 'Online', straddle: true
}).straddle, 'Explicit straddle configuration survives game changes');
check(model.showExploit('Fish') && !model.showExploit('Reg'),
  'Exploit availability follows rival profile');
check(model.normalize({ profile: 'Reg', exploit: 'Vs whale' }).exploit === 'No aplica',
  'Non-recreational profiles clear exploit');
check(model.normalize({ action: 'Fold', size: '3bb' }).size.startsWith('Sin tama'),
  'Fold clears size');
check(model.actionNeedsSize('3Bet') && !model.actionNeedsSize('Check'),
  'Size availability follows action');
check(model.inferRelation('BTN', 'BB', '6-max') === 'IP' &&
  model.inferRelation('SB', 'BTN', '6-max') === 'OOP',
  'IP/OOP is inferred from positions');
check(model.normalize({
  tableSize: '6-max', hero: 'SB', rival: 'BTN', relation: 'IP'
}).relation === 'OOP', 'Inferred relation overrides contradictory manual state');
check(model.engineSpotForForm('Unopened pot') === 'OR' &&
  model.formSpotForEngine('VS4BET_AFTER_3BET') === 'Facing 4Bet',
  'Form and engine spot mappings remain reversible');
check(model.positions('10-max').length === 10,
  '10-max exposes exactly ten unique positions');
check(new Set(model.positions('10-max')).size === 10,
  '10-max cannot contain duplicated positions');

let combinations = 0;
model.CATALOG.games.forEach(game => {
  model.CATALOG.environments.forEach(environment => {
    [false, true].forEach(multiwayState => {
      ['none', 'ante', 'straddle', 'ante_straddle'].forEach(forcedBetMode => {
        model.CATALOG.profiles.forEach(profile => {
          combinations++;
          const value = model.normalize({
            game, environment, multiway: multiwayState, forcedBetMode, profile
          });
          check(model.subGames(game).includes(value.subGame), 'Valid sub game');
          check(model.stakes(game).includes(value.stake), 'Valid stake');
          check(model.positions(value.tableSize).includes(value.hero), 'Valid hero');
          check(model.spots(value.multiway).includes(value.spot), 'Valid spot');
          check(model.subSpots(value.spot).includes(value.subSpot), 'Valid sub spot');
          check(value.ante === ['ante', 'ante_straddle'].includes(value.forcedBetMode),
            'Ante flag matches forced bet mode');
          check(value.straddle === ['straddle', 'ante_straddle'].includes(value.forcedBetMode),
            'Straddle flag matches forced bet mode');
        });
      });
    });
  });
});

console.log(`range-form-model: ${checks} checks and ${combinations} combinations OK`);
