'use strict';

(function (RT) {
  function calc(a, op, b) {
    if (op === '+') return a + b;
    if (op === '-') return a - b;
    if (op === '×') return a * b;
    if (op === '÷') return b === 0 ? null : a / b;
    return null;
  }

  function shuffle(values) {
    const copy = values.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function generateNuma(config, maxItems) {
    let numbers = Array.from(config.numbers || []);
    let range = [];
    for (let value = Math.min(config.start, config.end);
      value <= Math.max(config.start, config.end); value++) range.push(value);
    if (config.modes.has('Cipher')) {
      const randomNumber = () => {
        const threeDigits = Math.random() >= .5;
        return Math.floor(Math.random() * (threeDigits ? 900 : 90)) + (threeDigits ? 100 : 10);
      };
      numbers = numbers.map(randomNumber);
      range = range.map(randomNumber);
    }
    const result = [];
    const generationLimit = Number.isFinite(maxItems) && maxItems > 0
      ? Math.floor(maxItems)
      : Number.POSITIVE_INFINITY;
    function build(depth, value, expression) {
      if (result.length >= generationLimit) return;
      if (depth === config.chain - 1) {
        result.push({ type: 'numeric', category: 'numa', question: expression,
          answer: String(value), numericTarget: value });
        return;
      }
      const operands = (depth + 1) % 2 === 0 ? numbers : range;
      config.operations.forEach(op => operands.forEach(next => {
        if (result.length >= generationLimit) return;
        const calculated = calc(value, op, next);
        if (calculated === null || calculated < 0 || !Number.isFinite(calculated)) return;
        build(depth + 1, calculated, `${expression}${op}${next}`);
      }));
    }
    numbers.forEach(number => build(0, number, String(number)));
    return result;
  }

  function generatePoker(config, pokerOps) {
    const result = [];
    config.pokerLevels.forEach(level => {
      const block = pokerOps[level] || {};
      config.operations.forEach(op => (block[op] || []).forEach(expression => {
        const question = expression.split('=')[0].trim();
        const answer = expression.split('=')[1].trim();
        result.push({ type: 'numeric', category: 'numa', dataset: `poker-${level}`,
          question, answer, numericTarget: Number(answer) });
      }));
    });
    return result;
  }

  RT.MathTrainerGenerators = { calc, shuffle, generateNuma, generatePoker };
})(window.RT);
