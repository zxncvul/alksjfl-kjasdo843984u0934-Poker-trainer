'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const sandbox = { window: { RT: {} } };
vm.createContext(sandbox);
vm.runInContext(
  fs.readFileSync(path.join(__dirname, 'viewer-model.js'), 'utf8'),
  sandbox,
  { filename: 'viewer-model.js' }
);

const model = sandbox.window.RT.ViewerModel;
let checks = 0;
function assert(condition, message) {
  checks++;
  if (!condition) throw new Error(message);
}

const items = [
  { context: { spot: 'OR', hero: 'UTG', relative: null }, actions: ['OR'] },
  { context: { spot: 'VS_OPEN', hero: 'BB', vs: 'BTN', relative: 'OOP' }, actions: ['CALL', '3BET'] },
  { context: { spot: 'VS3BET', hero: 'BTN', vs: 'BB', relative: 'IP' }, actions: ['CALL', '4BET'] },
  { context: { spot: 'SQUEEZE', hero: 'BB', relative: 'OOP' }, actions: ['SQUEEZE'] },
  { context: { spot: 'LIMP_ROL', hero: 'CO', relative: 'IP' }, actions: ['ROL'] },
  { context: { spot: 'PUSH_CALL_PUSH', hero: 'SB', relative: 'OOP' }, actions: ['JAM'] },
  {
    context: { spot: 'OR', hero: 'BTN', relative: null },
    actions: ['OR'], template: true, tags: ['shortstack']
  }
];
const both = new Set(['IP', 'OOP']);

assert(model.applyLibraryFilters(items, { family: 'or', relatives: both }).length === 2,
  'OR debe filtrar todas las aperturas');
assert(model.applyLibraryFilters(items, { family: 'vs-open', relatives: both }).length === 1,
  'vs Open debe reconocer VS_OPEN');
assert(model.applyLibraryFilters(items, {
  family: 'all', relatives: new Set(['IP'])
}).length === 4, 'IP conserva contextos IP y contextos sin dimensión relativa');
assert(model.applyLibraryFilters(items, { family: '4bet', relatives: both }).length === 1,
  '4Bet debe poder detectarse por acción');
assert(model.applyLibraryFilters(items, { family: 'rol', relatives: both }).length === 1,
  'ROL debe reconocer spot y acción');
assert(model.applyLibraryFilters(items, { family: 'squeeze', relatives: both }).length === 1,
  'Squeeze debe reconocer spot y acción');
assert(model.applyLibraryFilters(items, { family: 'push', relatives: both }).length === 1,
  'Push debe reconocer aliases all-in');
assert(model.applyLibraryFilters(items, { family: 'templates', relatives: both }).length === 1,
  'Plantillas debe depender de la marca template');

const favorite = items[1].context;
assert(model.applyLibraryFilters(items, { family: 'favorites', relatives: both }, {
  isFavorite: context => context === favorite
}).length === 1, 'Favoritos debe usar la dependencia sin tocar el motor');
assert(model.applyLibraryFilters(items, {
  family: 'all', favoritesOnly: true, relatives: both
}, { isFavorite: context => context === favorite }).length === 1,
'favoritesOnly debe ser independiente de la familia visible');
assert(model.applyLibraryFilters(items, {
  family: 'all', query: 'bb btn', relatives: both
}).length === 2, 'La búsqueda debe combinar hero y rival');
assert(model.applyLibraryFilters(items, {
  family: 'all', query: 'btn bb', relatives: both
}).length === 2, 'La búsqueda debe ser independiente del orden de términos');
assert(model.applyLibraryFilters(items, {
  family: 'all', selectedTags: new Set(['shortstack']), relatives: both
}).length === 1, 'Las etiquetas deben filtrar sin tocar la matriz');

const matrixSentinel = { rankFilters: new Set(['Q']), familyFilters: new Set(['pairs']) };
model.applyLibraryFilters(items, { family: 'all', relatives: both });
assert(matrixSentinel.rankFilters.has('Q') && matrixSentinel.familyFilters.has('pairs'),
  'Los filtros de biblioteca no deben mutar los filtros de matriz');

const title = model.buildExportTitle(
  { spot: 'VS_OPEN', hero: 'BB', vs: 'BTN' },
  { spotLabel: 'vs Open', profile: 'Pool', stack: '100bb' }
);
assert(title === 'vs Open - BB vs BTN Pool - 100bb',
  'El título exportado debe ser estable y legible');
assert(model.buildExportTitle(
  { spot: 'OR', hero: 'UTG', vs: null },
  { spotLabel: 'OR', profile: '', stack: '100bb' }
) === 'OR - UTG - 100bb', 'El título sin rival debe omitir separadores vacíos');
assert(model.buildExportTitle(
  { spot: 'VS3BET', hero: 'CO', vs: 'BB' },
  { spotLabel: 'vs 3Bet', stack: '80bb' }
) === 'vs 3Bet - CO vs BB - 80bb', 'El título sin perfil debe seguir siendo válido');

const payload = model.buildExportPayload(
  { spot: 'OR', hero: 'UTG', vs: null, relative: null },
  { collection: 'Mis rangos', percentage: 17, combos: 226 }
);
assert(!JSON.stringify(payload).includes('undefined') && !JSON.stringify(payload).includes('null'),
  'La exportación no debe filtrar undefined/null a la UI');
assert(model.resolveActiveContext(items, 'missing', item => item.spot) === items[0].context,
  'Un contexto eliminado debe caer al primero disponible');

const fakeEngine = {
  availableSpots: source => source === 'empty' ? [] : ['OR', 'VS3BET'],
  spotNeedsRelative: spot => spot === 'VS3BET',
  availableRelatives: () => ['IP', 'OOP'],
  availableHeroes: ({ spot }) => spot === 'OR' ? ['UTG', 'BTN'] : ['CO'],
  spotNeedsVs: spot => spot === 'VS3BET',
  availableVs: () => ['BB']
};
const staleOr = { spot: 'OR', hero: 'CO', relative: 'IP', vs: 'BB' };
model.reconcileContext(fakeEngine, staleOr, 'main');
assert(staleOr.hero === 'UTG' && staleOr.relative === null && staleOr.vs === null,
  'OR debe limpiar rival/relativa y recuperar un hero válido');
const staleVs = { spot: 'VS3BET', hero: 'UTG', relative: null, vs: 'BTN' };
model.reconcileContext(fakeEngine, staleVs, 'main');
assert(staleVs.hero === 'CO' && staleVs.relative === 'IP' && staleVs.vs === 'BB',
  'Un contexto incompleto debe recuperar dimensiones válidas');
const emptyContext = { spot: 'OR', hero: 'UTG', relative: null, vs: null };
model.reconcileContext(fakeEngine, emptyContext, 'empty');
assert(emptyContext.spot === null && emptyContext.hero === null,
  'Una colección vacía debe degradar sin lanzar errores');

console.log(`viewer-model: ${checks} comprobaciones OK`);
