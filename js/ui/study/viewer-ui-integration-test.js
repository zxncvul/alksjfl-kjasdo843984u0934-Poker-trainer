'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

class FakeNode {
  constructor(tag, className = '', text = '') {
    this.tagName = tag.toUpperCase();
    this.className = className;
    this.textContent = text;
    this.children = [];
    this.listeners = {};
    this.dataset = {};
    this.style = { setProperty(name, value) { this[name] = value; } };
    this.attributes = {};
    this.value = '';
    this.disabled = false;
    this.hidden = false;
    this.classList = {
      add: name => {
        const classes = new Set(this.className.split(/\s+/).filter(Boolean));
        classes.add(name);
        this.className = Array.from(classes).join(' ');
      },
      remove: name => {
        this.className = this.className.split(/\s+/)
          .filter(item => item && item !== name).join(' ');
      },
      toggle: (name, force) => {
        const has = this.className.split(/\s+/).includes(name);
        if (force === true || (!has && force !== false)) this.classList.add(name);
        else if (has) this.classList.remove(name);
      }
    };
  }
  appendChild(child) { this.children.push(child); return child; }
  addEventListener(type, handler) { this.listeners[type] = handler; }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  contains(node) { return this === node || descendants(this).includes(node); }
  querySelector(selector) {
    const targets = String(selector).split(',').map(item =>
      item.trim().split(/\s+/).pop().replace(/^\./, '')
    );
    return descendants(this).slice(1).find(node =>
      targets.some(target =>
        String(node.className || '').split(/\s+/).includes(target)
      )
    ) || null;
  }
  set innerHTML(value) { if (value === '') this.children = []; }
  get innerHTML() { return ''; }
  focus() { this.focused = true; }
  select() { this.selectedText = true; }
}

function element(tag, className, text) {
  return new FakeNode(tag, className, text);
}
function button(label, config = {}) {
  const node = element('button', `btn ${config.variant || ''}`.trim(), label);
  node.disabled = !!config.disabled;
  if (config.active) node.classList.add('is-active');
  if (config.onClick) node.addEventListener('click', config.onClick);
  return node;
}
function selectGroup(title, items, value, onChange) {
  const node = element('div', 'panel-group');
  node.titleText = title;
  node.items = items;
  node.value = value;
  node.onChange = onChange;
  return node;
}
function hint(text) { return element('p', 'panel-hint', text); }
function statLine(label, value) {
  const node = element('div', 'stat-line');
  node.label = label;
  node.value = String(value);
  return node;
}
function dashPanel(title, build) {
  const node = element('section', 'dash-panel');
  const body = element('div', 'dash-body');
  build(body);
  node.appendChild(body);
  return node;
}
function barRow(label) { return element('div', 'bar-row', label); }
function descendants(node) {
  return [node].concat(...node.children.map(descendants));
}

const enginePositions = ['UTG', 'MP', 'CO', 'BTN', 'SB', 'BB'];
const ui = {
  source: 'source-a',
  showLabels: true,
  gallerySelection: new Set(),
  collections: {
    active: 'a',
    items: [{ id: 'a', label: 'Mis rangos', source: 'source-a' }]
  },
  study: {
    collection: 'a', spot: 'OR', hero: 'UTG', relative: null, vs: null,
    profile: 'pool',
    matrixFilters: { selectedActions: new Set(['OR']) }
  }
};

let renderAllCalls = 0;
const Engine = {
  availableSpots: () => ['OR', 'THREEBET_VS_OPEN', 'VS3BET', 'VS4BET_AFTER_3BET'],
  spotNeedsRelative: spot => spot !== 'OR',
  availableRelatives: () => ['IP', 'OOP'],
  availableHeroes: () => enginePositions,
  spotNeedsVs: spot => spot !== 'OR',
  availableVs: () => enginePositions,
  getSpotDef: spot => ({ id: spot, label: spot }),
  describeContext: context => `${context.hero} - ${context.spot}`,
  getContexts: ({ source }) => [
    { source, spot: 'OR', hero: 'UTG', relative: null, vs: null }
  ],
  getActionDef: id => ({
    id,
    label: id,
    color: {
      FOLD: '#3c4651', CALL: '#2f6f73', OR: '#386a93',
      '3BET': '#5f6692', '4BET': '#826489',
      '5BETPLUS': '#9a6a66', ALLIN: '#a35c62'
    }[id] || '#456'
  })
};
const RT = {
  Engine,
  Hands: { POSITIONS: enginePositions },
  Favorites: { has: () => false, toggle() {} },
  Modal: { open() {}, close() {} },
  MatrixTools: { getActionColor: () => '#456' },
  Stats: { hasData: false }
};
const sandbox = {
  window: { RT },
  console,
  document: { querySelectorAll: () => [] },
  requestAnimationFrame: callback => { callback(); return 1; },
  setTimeout: callback => { callback(); return 1; }
};
vm.createContext(sandbox);
for (const file of [
  'viewer-model.js', 'range-form-model.js', 'preflop-sequence-model.js',
  'range-advanced-config.js', 'study-ui.js'
]) {
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, file), 'utf8'),
    sandbox,
    { filename: file }
  );
}

function studyContext() {
  return {
    source: ui.source, spot: ui.study.spot, hero: ui.study.hero,
    relative: ui.study.relative, vs: ui.study.vs
  };
}
const component = RT.StudyUI.create({
  ui,
  toolkit: { el: element, button, selectGroup, hint, dashPanel, statLine, barRow },
  studyContext,
  rangeAnalytics: () => ({
    total: 100, pct: 7.5, byAction: { OR: 100 },
    fam: { suited: 20, offsuit: 50, pairs: 30 }
  }),
  renderAll: () => { renderAllCalls++; },
  renderPanel: () => {}
});

function render() {
  const panel = element('aside', 'panel');
  component.renderPanel(panel);
  return panel;
}
function byAria(root, label) {
  return descendants(root).find(node => node.attributes['aria-label'] === label);
}
function positionButton(root, actor, position) {
  return descendants(root).find(node =>
    node.dataset.sequenceActor === actor &&
    node.dataset.sequencePosition === position
  );
}
function actionButton(root, actor, action) {
  return descendants(root).find(node =>
    node.dataset.sequenceActor === actor &&
    node.dataset.sequenceAction === action
  );
}
function hasClass(node, className) {
  return String(node && node.className || '').split(/\s+/).includes(className);
}
function miniSeatPoints(root) {
  return descendants(root)
    .filter(node => hasClass(node, 'mini-seat'))
    .map(node => ({
      label: descendants(node).find(child => hasClass(child, 'mini-position-label'))?.textContent || '',
      left: Number.parseFloat(node.style['--mini-seat-left']),
      top: Number.parseFloat(node.style['--mini-seat-top'])
    }));
}
function click(node) {
  assert(node, 'Expected control');
  assert.strictEqual(node.disabled, false, 'Control must be enabled');
  assert(node.listeners.click, 'Control needs a click handler');
  node.listeners.click({ preventDefault() {}, stopPropagation() {} });
}

let panel = render();
let mini = descendants(panel).find(node => hasClass(node, 'mini-spot-replayer'));
assert(mini, 'Mini replayer must render inside the visualizer panel');
assert.strictEqual(
  descendants(mini).filter(node => hasClass(node, 'mini-seat')).length,
  6,
  'Mini replayer must render the active table seats'
);
assert(descendants(mini).some(node => hasClass(node, 'mini-replay-step')),
  'Mini replayer must render local stepper controls');
let miniTable = descendants(mini).find(node => hasClass(node, 'mini-table'));
assert(descendants(miniTable).some(node => hasClass(node, 'mini-replay-stepper')),
  'Mini replay stepper must live inside the mini table');
assert.strictEqual(
  descendants(mini).filter(node => hasClass(node, 'mini-blind-badge')).length,
  0,
  'Mini replayer must not render extra SB/BB circles; chip commitments are enough'
);
assert.strictEqual(
  descendants(panel).filter(node =>
    String(node.className).includes('preflop-position-button')
  ).length,
  20,
  'Hero and Rival must always render ten positions each'
);
['hero', 'rival'].forEach(actor => {
  const actorButtons = descendants(panel).filter(node =>
    node.dataset.sequenceActor === actor && node.dataset.sequencePosition
  );
  const expectedEnabled = actor === 'hero' ? 5 : 0;
  assert.strictEqual(actorButtons.filter(node => !node.disabled).length, expectedEnabled,
    `${actor}: 6-max must enable valid positions for its sequence role`);
  assert.strictEqual(actorButtons.filter(node => node.disabled).length, 10 - expectedEnabled,
    `${actor}: 6-max must disable unavailable positions`);
  actorButtons.forEach(node => {
    assert.strictEqual(node.attributes['aria-disabled'], String(node.disabled));
    assert(['available', 'disabled-table', 'disabled-order', 'disabled-flow'].includes(node.dataset.state));
  });
});
assert(positionButton(panel, 'hero', 'BB').disabled &&
  positionButton(panel, 'hero', 'BB').dataset.state === 'disabled-order',
  'Hero cannot start a sequence from BB');
assert(positionButton(panel, 'rival', 'BB').disabled,
  'Rival positions stay disabled until Hero has acted');

click(positionButton(panel, 'hero', 'CO'));
assert.strictEqual(ui.study.rangeForm.hero, 'CO',
  'Visual Hero must synchronize the range form');
panel = render();
assert(positionButton(panel, 'hero', 'CO').disabled,
  'Hero position must lock while Hero action buttons are being chosen');
assert(positionButton(panel, 'rival', 'BTN').disabled,
  'Rival positions must stay disabled while Hero action buttons are open');
const rivalConflict = positionButton(panel, 'rival', 'CO');
assert(rivalConflict.disabled && rivalConflict.dataset.state === 'disabled-conflict',
  'Hero position must be blocked for Rival');

click(actionButton(panel, 'hero', 'open_raise'));
panel = render();
click(positionButton(panel, 'rival', 'BTN'));
panel = render();
assert(positionButton(panel, 'rival', 'BTN').disabled,
  'Selected Rival position must lock while Rival action buttons are being chosen');
assert(positionButton(panel, 'rival', 'SB').disabled,
  'Other Rival positions must stay disabled while Rival action buttons are open');
const rivalCall = actionButton(panel, 'rival', 'call');
assert(rivalCall && !rivalCall.disabled, 'Rival Call must be available when more players remain');
click(rivalCall);
panel = render();
assert(positionButton(panel, 'hero', 'CO').disabled,
  'Hero must not be enabled immediately after a non-terminal Rival Call');
click(positionButton(panel, 'rival', 'SB'));
panel = render();
assert.deepStrictEqual(
  Array.from(ui.study.preflopSequence.rivalPositions),
  ['BTN', 'SB'],
  'Rival chain must preserve caller and selected aggressor'
);
assert.strictEqual(ui.study.rangeForm.rival, 'SB',
  'Most recent rival is the primary query context');

panel = render();
const threeBet = actionButton(panel, 'rival', 'three_bet');
assert(threeBet && !threeBet.disabled, 'Rival 3Bet must be available after Hero OR');
click(threeBet);
assert.strictEqual(ui.study.rangeForm.spot, 'Facing 3Bet');
assert(RT.RangeFormModel.subSpots('Facing 3Bet').includes(
  ui.study.rangeForm.subSpot
), 'Incomplete sequence must keep a valid pending sub spot');
panel = render();
assert(actionButton(panel, 'hero', 'call').disabled,
  'Hero response actions must stay disabled until Hero confirms the return');
assert(!positionButton(panel, 'hero', 'CO').disabled &&
  positionButton(panel, 'hero', 'CO').dataset.state === 'confirm-hero-return',
  'Selected Hero position must become the explicit return confirmation');
assert(!positionButton(panel, 'rival', 'BB').disabled &&
  hasClass(positionButton(panel, 'rival', 'BB'), 'is-pending'),
  'Unacted Rival positions must blink while Hero can still keep adding rivals');
mini = descendants(panel).find(node => hasClass(node, 'mini-spot-replayer'));
const pendingSeatLabels = descendants(mini)
  .filter(node => hasClass(node, 'mini-seat') && hasClass(node, 'is-pending'))
  .map(node => descendants(node).find(child => hasClass(child, 'mini-position-label'))?.textContent || '');
assert(pendingSeatLabels.includes('CO') && pendingSeatLabels.includes('BB'),
  'Mini replayer must blink both the returning Hero seat and remaining live Rival seats');
click(positionButton(panel, 'hero', 'CO'));
panel = render();
assert(!actionButton(panel, 'hero', 'call').disabled &&
  !actionButton(panel, 'hero', 'four_bet').disabled,
  'Hero response actions must unlock after confirming Hero return');
assert(positionButton(panel, 'rival', 'BB').disabled &&
  positionButton(panel, 'rival', 'BB').dataset.state === 'disabled-flow',
  'Unassigned Rival positions must close as folds after Hero confirms return');
mini = descendants(panel).find(node => hasClass(node, 'mini-spot-replayer'));
assert(descendants(mini).some(node => hasClass(node, 'hero') && node.textContent === 'H'),
  'Mini replayer must mark Hero with H');
assert(descendants(mini).some(node => hasClass(node, 'rival') && node.textContent === 'R'),
  'Mini replayer must mark Rival with R');
assert(descendants(mini).some(node => hasClass(node, 'is-or')),
  'Mini replayer must show OR chip commitment');
assert(descendants(mini).some(node => hasClass(node, 'is-call')),
  'Mini replayer must show Call chip commitment');
const callCommitment = descendants(mini).find(node => hasClass(node, 'is-call'));
assert(callCommitment && hasClass(callCommitment, 'is-or'),
  'A Call facing OR must inherit OR-sized chip stacks while remaining tagged as Call');
assert.strictEqual(
  descendants(callCommitment).filter(node => hasClass(node, 'mini-chip-stack')).length,
  2,
  'A Call facing OR must render two chip stacks'
);
assert(descendants(mini).some(node => hasClass(node, 'is-three-bet')),
  'Mini replayer must show 3Bet chip commitment');
const threeBetCommitment = descendants(mini).find(node => hasClass(node, 'is-three-bet'));
assert.strictEqual(
  descendants(threeBetCommitment).filter(node => hasClass(node, 'mini-chip-stack')).length,
  3,
  'Mini replayer must render 3Bet as three chip stacks'
);
assert.strictEqual(
  descendants(mini).filter(node => hasClass(node, 'mini-seat-action')).length,
  0,
  'Mini replayer must not print action labels next to seats; chips are the signal'
);
assert.strictEqual(
  descendants(mini).filter(node => hasClass(node, 'mini-action-line')).length,
  0,
  'Mini replayer must not print action text under the table once chips are visible'
);
let previousMiniStep = descendants(mini).find(node =>
  hasClass(node, 'mini-replay-step') && node.attributes['aria-label'] === 'Anterior'
);
let nextMiniStep = descendants(mini).find(node =>
  hasClass(node, 'mini-replay-step') && node.attributes['aria-label'] === 'Siguiente'
);
assert(previousMiniStep && !previousMiniStep.disabled,
  'Mini replay previous step must be enabled after actions');
assert(nextMiniStep && nextMiniStep.disabled,
  'Mini replay next step must be disabled on the last step');
click(previousMiniStep);
panel = render();
mini = descendants(panel).find(node => hasClass(node, 'mini-spot-replayer'));
assert(descendants(mini).some(node => hasClass(node, 'is-or')) &&
  !descendants(mini).some(node => hasClass(node, 'is-three-bet')),
  'Mini replay previous step must show only chip commitments up to that step');
nextMiniStep = descendants(mini).find(node =>
  hasClass(node, 'mini-replay-step') && node.attributes['aria-label'] === 'Siguiente'
);
click(nextMiniStep);
panel = render();
mini = descendants(panel).find(node => hasClass(node, 'mini-spot-replayer'));
assert(descendants(mini).some(node => hasClass(node, 'is-three-bet')) &&
  !descendants(mini).some(node => hasClass(node, 'mini-action-line')),
  'Mini replay next step must restore the latest chip state without action text');
const summary = descendants(panel).find(node =>
  node.className === 'preflop-sequence-display-main'
);
assert(summary.textContent.includes('Hero CO') &&
  summary.textContent.includes('Rival BTN') &&
  summary.textContent.includes('Rival SB'),
'Sequence text must show every selected rival position');

click(actionButton(panel, 'hero', 'four_bet'));
panel = render();
assert(positionButton(panel, 'rival', 'BB').disabled &&
  positionButton(panel, 'rival', 'SB').disabled,
  'Closed Rival positions must stay unavailable on the next Rival decision');

const reset = descendants(panel).find(node =>
  String(node.className).includes('preflop-sequence-reset')
);
const resetAfterJam = descendants(panel).find(node =>
  String(node.className).includes('preflop-sequence-reset')
);
click(resetAfterJam);
assert.strictEqual(ui.study.preflopSequence.sequence.length, 0);
assert.strictEqual(ui.study.preflopSequence.positions.hero, '');
assert.strictEqual(ui.study.preflopSequence.rivalPositions.length, 0);
assert.strictEqual(ui.study.rangeForm.rival, 'No aplica');
assert.strictEqual(ui.study.rangeForm.spot, 'Unopened pot');

panel = render();
click(positionButton(panel, 'hero', 'CO'));
panel = render();
click(actionButton(panel, 'hero', 'open_jam'));
panel = render();
mini = descendants(panel).find(node => hasClass(node, 'mini-spot-replayer'));
const jamCommitment = descendants(mini).find(node => hasClass(node, 'is-jam'));
assert(jamCommitment, 'Mini replayer must show an All In commitment for jam actions');
assert(descendants(jamCommitment).some(node =>
  hasClass(node, 'mini-all-in-strip') && node.textContent === 'ALL IN'
), 'Mini replayer must render jam as an ALL IN strip');
assert.strictEqual(
  descendants(jamCommitment).filter(node => hasClass(node, 'mini-chip-stack')).length,
  0,
  'Mini replayer must not render jam as chip stacks'
);

click(reset);
assert.strictEqual(ui.study.preflopSequence.sequence.length, 0);

panel = render();
const table = byAria(panel, 'MESA');
table.value = '2-max';
table.listeners.change();
panel = render();
['hero', 'rival'].forEach(actor => {
  const actorButtons = descendants(panel).filter(node =>
    node.dataset.sequenceActor === actor && node.dataset.sequencePosition
  );
  const expectedEnabled = actor === 'hero' ? 1 : 0;
  assert.strictEqual(actorButtons.filter(node => !node.disabled).length, expectedEnabled,
    `${actor}: HU enables valid positions for its sequence role`);
});
['5-max', '6-max', '8-max', '9-max', '10-max'].forEach(tableSize => {
  const tableControl = byAria(panel, 'MESA');
  tableControl.value = tableSize;
  tableControl.listeners.change();
  panel = render();
  const tableMini = descendants(panel).find(node => hasClass(node, 'mini-spot-replayer'));
  const expected = Number(tableSize.split('-')[0]);
  assert.strictEqual(
    descendants(tableMini).filter(node => hasClass(node, 'mini-seat')).length,
    expected,
    `Mini replayer must render ${expected} seats for ${tableSize}`
  );
  assert(descendants(tableMini).some(node => hasClass(node, 'mini-table-felt')),
    `${tableSize}: mini table felt must exist`);
  assert(descendants(tableMini).some(node => hasClass(node, 'mini-replay-stepper')),
    `${tableSize}: mini stepper must remain visible`);
  const points = miniSeatPoints(tableMini);
  assert.strictEqual(
    new Set(points.map(point => `${point.left}:${point.top}`)).size,
    expected,
    `${tableSize}: mini seats must use unique coordinates`
  );
  assert(points.some(point => point.left <= 12),
    `${tableSize}: mini layout must keep a clear left rail seat`);
  assert(points.some(point => point.left >= 88),
    `${tableSize}: mini layout must keep a clear right rail seat`);
  assert(points.some(point => point.top <= 32),
    `${tableSize}: mini layout must keep top arc seats`);
  assert(points.some(point => point.top >= 76),
    `${tableSize}: mini layout must keep bottom arc seats`);
});
const finalTable = byAria(panel, 'MESA');
finalTable.value = '2-max';
finalTable.listeners.change();
panel = render();
assert.strictEqual(positionButton(panel, 'hero', 'UTG').disabled, true,
  'Unavailable positions cannot become interactive');
assert(renderAllCalls >= 6, 'State changes must refresh the visualizer');

console.log('viewer-ui-integration: sequence, query sync, reset and table states OK');
