'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const sandbox = { window: { RT: {} } };
vm.createContext(sandbox);
vm.runInContext(
  fs.readFileSync(path.join(__dirname, 'range-advanced-config.js'), 'utf8'),
  sandbox,
  { filename: 'range-advanced-config.js' }
);

const model = sandbox.window.RT.RangeAdvancedConfig;
const draft = model.defaults();

assert.strictEqual(model.ACTIONS.length, 13);
assert.strictEqual(Object.keys(draft.sizeConfig).length, 13);
assert.strictEqual(Object.keys(draft.frequencyConfig).length, 13);
assert.strictEqual(model.number('2,5', 0, 200), 2.5);
assert.strictEqual(model.number('-1', 0, 200), null);
assert.strictEqual(model.number('Infinity', 0, 200), null);
assert.strictEqual(model.number('<script>', 0, 200), null);

let next = model.updateSize(draft, '3BET', 'multiplier', '3');
next = model.updateSize(next, '3BET', 'bb', '12.5');
assert.strictEqual(next.sizeConfig['3BET'].bb, 12.5);
assert.strictEqual(next.sizeConfig['3BET'].multiplier, null);
next = model.updateSize(next, '3BET', 'multiplier', '2.5');
assert.strictEqual(next.sizeConfig['3BET'].bb, null);
assert.strictEqual(next.sizeConfig['3BET'].multiplier, 2.5);

next = model.setFrequencyMethod(next, 'CALL', 'suits');
next = model.updateFrequency(next, 'CALL', 'suit', 'spade');
next = model.updateFrequency(next, 'CALL', 'suit', 'heart');
assert.deepStrictEqual(Array.from(next.frequencyConfig.CALL.suits), ['spade', 'heart']);
next = model.updateFrequency(next, 'CALL', 'parity', 'odd');
assert.strictEqual(next.frequencyConfig.CALL.parity, 'odd');
assert.strictEqual(next.frequencyConfig.CALL.suits.length, 0);
next = model.setFrequencyMethod(next, 'CALL', 'range');
next = model.updateFrequency(next, 'CALL', 'from', '20');
next = model.updateFrequency(next, 'CALL', 'to', '10');
assert.strictEqual(model.validate(next).length, 1);

next = model.setFrequencyMethod(next, 'CALL', 'custom');
next = model.updateFrequency(next, 'CALL', 'custom', '<script>alert(1)</script>');
assert(!/[<>]/.test(next.frequencyConfig.CALL.custom));

console.log('range-advanced-config: normalización y exclusiones correctas');
