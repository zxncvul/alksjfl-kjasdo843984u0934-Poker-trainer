'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..', '..', '..');
const messages = { error: [], warn: [] };
const sandbox = {
  window: {},
  console: {
    log() {},
    info() {},
    error: (...args) => messages.error.push(args.join(' ')),
    warn: (...args) => messages.warn.push(args.join(' '))
  }
};
vm.createContext(sandbox);

function load(relative) {
  vm.runInContext(
    fs.readFileSync(path.join(root, relative), 'utf8'),
    sandbox,
    { filename: relative }
  );
}

load('js/core/hands.js');
sandbox.RT = sandbox.window.RT;
[
  'js/core/range-engine.js',
  'js/data/ranges.data.js',
  'js/data/ranges-extra.data.js',
  'js/ui/study/viewer-model.js',
  'js/ui/study/matrix-tools.js'
].forEach(load);

const RT = sandbox.window.RT;
const problems = RT.Engine.validate();
assert.deepStrictEqual(Array.from(problems), [], 'Los datos de rangos deben validar sin problemas');
assert.deepStrictEqual(messages.error, [], 'La carga no debe registrar errores');

const allHands = new Set(RT.Hands.ALL_HANDS);
const sources = RT.Engine.getSources();
let contextsChecked = 0;
let handsChecked = 0;
const actionIds = new Set(RT.MatrixTools.ACTION_ORDER.map(action => action.id));

const strengthPartitions = { A: new Set(), M: new Set(), B: new Set() };
RT.Hands.ALL_HANDS.forEach(hand => {
  const band = RT.MatrixTools.handStrengthBand(hand);
  assert(strengthPartitions[band], `Banda inválida para ${hand}: ${band}`);
  strengthPartitions[band].add(hand);
});
assert.strictEqual(
  strengthPartitions.A.size + strengthPartitions.M.size + strengthPartitions.B.size,
  RT.Hands.ALL_HANDS.length,
  'A/M/B deben formar una partición exacta de las 169 manos'
);
['A', 'M', 'B'].forEach(removed => {
  const filters = {
    useSubtractiveSelections: true,
    emptyAll: false,
    rankMode: 'subtract',
    textureFilter: 'all',
    familyFilters: new Set(),
    strengthFilters: new Set(['A', 'M', 'B'].filter(value => value !== removed)),
    rankFilters: new Set(RT.Hands.RANKS),
    progress: new Set(),
    selectedActions: new Set(),
    actionFilterActive: false
  };
  const visible = new Set(RT.MatrixTools.applyMatrixFilters(
    RT.Hands.ALL_HANDS, filters, {}, {}
  ));
  RT.Hands.ALL_HANDS.forEach(hand => assert.strictEqual(
    visible.has(hand),
    !strengthPartitions[removed].has(hand),
    `Quitar ${removed} debe afectar únicamente su propia banda (${hand})`
  ));
});

let filterConfigurations = 0;
const strengthSets = [
  ['A'], ['M'], ['B'], ['A', 'M'], ['A', 'B'], ['M', 'B'], ['A', 'M', 'B']
];
const familySets = [null, 'pairs', 'broadway', 'connectors', 'gap1', 'gap2', 'gap3'];
RT.Hands.RANKS.forEach(rank => {
  ['include', 'subtract'].forEach(rankMode => {
    const selectedRanks = rankMode === 'include'
      ? new Set([rank])
      : new Set(RT.Hands.RANKS.filter(value => value !== rank));
    strengthSets.forEach(strengths => {
      ['all', 'suited', 'offsuit', 'none'].forEach(texture => {
        familySets.forEach(family => {
          filterConfigurations++;
          const filters = {
            useSubtractiveSelections: true,
            emptyAll: false,
            rankMode,
            textureFilter: texture,
            familyFilters: new Set(family ? [family] : []),
            strengthFilters: new Set(strengths),
            rankFilters: selectedRanks,
            progress: new Set(),
            selectedActions: new Set(),
            actionFilterActive: false
          };
          const actual = RT.MatrixTools.applyMatrixFilters(
            RT.Hands.ALL_HANDS, filters, {}, {}
          );
          const expected = RT.Hands.ALL_HANDS.filter(hand => {
            const rankMatch = rankMode === 'include'
              ? (hand[0] === rank || hand[1] === rank)
              : (selectedRanks.has(hand[0]) && selectedRanks.has(hand[1]));
            if (!rankMatch) return false;
            if (!strengths.includes(
              RT.MatrixTools.handStrengthBand(hand, selectedRanks, rankMode)
            )) return false;
            if (!RT.Hands.isPair(hand)) {
              if (texture === 'none') return false;
              if (texture === 'suited' && !RT.Hands.isSuited(hand)) return false;
              if (texture === 'offsuit' && !RT.Hands.isOffsuit(hand)) return false;
            }
            return !family || RT.MatrixTools.handMatchesFamily(hand, family);
          });
          assert.deepStrictEqual(
            Array.from(actual),
            Array.from(expected),
            `Combinación incorrecta: ${rank}/${rankMode}/${strengths}/${texture}/${family}`
          );
        });
      });
    });
  });
});

sources.forEach(source => {
  const contexts = RT.Engine.getContexts({ source: source.id });
  assert(contexts.length > 0, `La fuente ${source.id} debe tener contextos`);
  contexts.forEach(context => {
    contextsChecked++;
    assert(RT.Engine.isContextComplete(context), 'Todo contexto catalogado debe ser completo');
    const actions = RT.Engine.availableActions(context);
    assert(actions.length > 0, 'Todo contexto visible debe tener acciones');
    const map = RT.Engine.getActionMap(context);
    const entries = Object.entries(map);
    assert(entries.length > 0, 'Todo contexto visible debe tener manos');
    entries.forEach(([hand, action]) => {
      handsChecked++;
      assert(allHands.has(hand), `Mano inválida en el mapa: ${hand}`);
      assert(actions.includes(action), `Acción no disponible en el contexto: ${action}`);
    });
    const expectedActionConcepts = new Set(actions
      .map(action => RT.MatrixTools.normalizeActionCode(action))
      .filter(action => actionIds.has(action)));
    const enabledActions = new Set(
      RT.MatrixTools.getEnabledActionsForSpot(context.spot, actions)
    );
    assert.deepStrictEqual(
      Array.from(enabledActions).sort(),
      Array.from(expectedActionConcepts).sort(),
      'La barra debe habilitar exactamente las acciones presentes en el contexto'
    );
    enabledActions.forEach(selectedAction => {
      const actionFilters = {
        useSubtractiveSelections: true,
        emptyAll: false,
        rankMode: 'subtract',
        textureFilter: 'all',
        familyFilters: new Set(),
        strengthFilters: new Set(['A', 'M', 'B']),
        rankFilters: new Set(RT.Hands.RANKS),
        progress: new Set(),
        selectedActions: new Set([selectedAction]),
        actionFilterActive: true
      };
      const actionHands = RT.MatrixTools.applyMatrixFilters(
        Object.keys(map), actionFilters, map, {}
      );
      assert(actionHands.length > 0, `La acción ${selectedAction} debe tener manos`);
      assert(actionHands.every(hand =>
        RT.MatrixTools.actionMatches(selectedAction, map[hand])),
      `La acción ${selectedAction} no debe filtrar manos de otra acción`);
    });

    const description = RT.Engine.describeContext(context);
    assert(description && !/undefined|null/i.test(description),
      'La descripción del contexto debe ser legible');

    const payload = RT.ViewerModel.buildExportPayload(context, {
      collection: source.label,
      spotLabel: (RT.Engine.getSpotDef(context.spot) || {}).label,
      profile: 'Pool',
      actions,
      combos: entries.reduce((sum, [hand]) => sum + RT.Hands.comboCount(hand), 0),
      percentage: 1
    });
    assert(!/undefined|null/i.test(JSON.stringify(payload)),
      'La exportación de cualquier contexto debe estar saneada');

    const filters = {
      useSubtractiveSelections: true,
      emptyAll: false,
      rankMode: 'subtract',
      textureFilter: 'all',
      familyFilters: new Set(),
      strengthFilters: new Set(['A', 'M', 'B']),
      rankFilters: new Set(RT.Hands.RANKS),
      progress: new Set(),
      selectedActions: new Set(
        RT.MatrixTools.getEnabledActionsForSpot(context.spot, actions)
      ),
      actionFilterActive: true
    };
    const visible = RT.MatrixTools.applyMatrixFilters(
      Object.keys(map), filters, map, {}
    );
    assert(visible.length === Object.keys(map).length,
      'El estado inicial de filtros no debe ocultar manos del rango');
  });
});

assert(contextsChecked >= 40, 'La auditoría debe cubrir el catálogo completo');
assert(handsChecked > 1000, 'La auditoría debe cubrir suficientes manos reales');

const catalog = RT.Engine.getContexts({ source: sources[0].id })
  .map(context => ({ context, actions: RT.Engine.availableActions(context) }));
RT.ViewerModel.LIBRARY_FILTERS.forEach(filter => {
  const result = RT.ViewerModel.applyLibraryFilters(catalog, {
    family: filter.id,
    relatives: new Set(['IP', 'OOP'])
  }, { isFavorite: () => false });
  assert(Array.isArray(result), `El filtro ${filter.id} debe devolver una lista`);
});

console.log(
  `viewer-data-audit: ${contextsChecked} contextos, ${handsChecked} asignaciones y ` +
  `${filterConfigurations} configuraciones OK`
);
