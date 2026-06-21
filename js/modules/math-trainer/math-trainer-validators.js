'use strict';

(function (RT) {
  const normalize = value => String(value ?? '').trim().replace(/\s+/g, '').toUpperCase();
  function numeric(value) {
    const normalized = String(value ?? '').trim().replace(',', '.');
    if (!normalized) return null;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }
  function validate(item, value) {
    if (!item) return false;
    if (item.numericTarget !== undefined && item.numericTarget !== null) {
      const parsed = numeric(value);
      if (parsed === null) return false;
      const decimals = Number.isFinite(item.decimals) ? item.decimals : 6;
      const multiplier = 10 ** decimals;
      return Math.round(parsed * multiplier) ===
        Math.round(Number(item.numericTarget) * multiplier);
    }
    const answers = item.accept && item.accept.length ? item.accept : [item.answer];
    return answers.map(normalize).includes(normalize(value));
  }
  RT.MathTrainerValidators = { validate, normalize, numeric };
})(window.RT);
