/* Configuración avanzada local de sizes y frecuencias del editor de rangos. */
'use strict';

(function (RT) {
  const ACTIONS = Object.freeze([
    { id: 'FOLD', label: 'Fold', kind: 'none' },
    { id: 'CHECK', label: 'Check', kind: 'none' },
    { id: 'CALL', label: 'Call', kind: 'none' },
    { id: 'LIMP', label: 'Limp', kind: 'none' },
    { id: 'OR', label: 'OR', kind: 'or' },
    { id: 'ROL', label: 'ROL', kind: 'rol' },
    { id: 'ISO', label: 'ISO', kind: 'mixed' },
    { id: '3BET', label: '3Bet', kind: 'mixed' },
    { id: '4BET', label: '4Bet', kind: 'mixed' },
    { id: '5BETPLUS', label: '5Bet+', kind: 'mixed' },
    { id: 'SQUEEZE', label: 'Squeeze', kind: 'mixed' },
    { id: 'REJAM', label: 'Rejam', kind: 'mixed' },
    { id: 'ALLIN', label: 'All-in', kind: 'allin' }
  ]);
  const MULTIPLIERS = Object.freeze([
    1, 1.5, 2, 2.2, 2.5, 3, 3.5, 4, 4.5, 5, 6, 7, 8, 9, 10
  ]);
  const METHODS = Object.freeze([
    { id: 'none', label: 'Sin frecuencia' },
    { id: 'percent', label: 'Por %' },
    { id: 'suits', label: 'Por palos' },
    { id: 'parity', label: 'Par / Impar' },
    { id: 'range', label: 'Por rango' },
    { id: 'custom', label: 'Custom' }
  ]);
  const SUITS = Object.freeze(['spade', 'heart', 'diamond', 'club']);
  const PARITIES = Object.freeze(['even', 'odd']);

  function number(value, min, max) {
    if (value == null || String(value).trim() === '') return null;
    const normalized = String(value).trim().replace(',', '.');
    if (!/^\d+(?:\.\d+)?$/.test(normalized)) return null;
    const parsed = Number(normalized);
    if (!Number.isFinite(parsed) || parsed < min || parsed > max) return null;
    return Math.round(parsed * 100) / 100;
  }

  function text(value) {
    return String(value == null ? '' : value)
      .replace(/[<>{}[\]\\`]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 120);
  }

  function sizeEntry(source) {
    const value = source || {};
    return {
      bb: number(value.bb, 0, 200),
      multiplier: MULTIPLIERS.includes(Number(value.multiplier))
        ? Number(value.multiplier) : null,
      baseBb: number(value.baseBb, 0, 200),
      perLimpBb: number(value.perLimpBb, 0, 200)
    };
  }

  function frequencyEntry(source) {
    const value = source || {};
    const method = METHODS.some(item => item.id === value.method) ? value.method : 'none';
    const from = number(value.from, 0, 1000000);
    const to = number(value.to, 0, 1000000);
    return {
      method,
      percent: number(value.percent, 0, 100),
      suits: Array.from(new Set(Array.isArray(value.suits)
        ? value.suits.filter(suit => SUITS.includes(suit)) : [])),
      parity: PARITIES.includes(value.parity) ? value.parity : null,
      from,
      to,
      custom: text(value.custom)
    };
  }

  function defaults() {
    const sizeConfig = {};
    const frequencyConfig = {};
    ACTIONS.forEach(action => {
      sizeConfig[action.id] = sizeEntry();
      frequencyConfig[action.id] = frequencyEntry();
    });
    return { sizeConfig, frequencyConfig };
  }

  function normalizeDraft(source) {
    const clean = defaults();
    const raw = source || {};
    ACTIONS.forEach(action => {
      clean.sizeConfig[action.id] = sizeEntry(
        raw.sizeConfig && raw.sizeConfig[action.id]
      );
      clean.frequencyConfig[action.id] = frequencyEntry(
        raw.frequencyConfig && raw.frequencyConfig[action.id]
      );
    });
    return clean;
  }

  function updateSize(draft, actionId, field, rawValue) {
    const next = normalizeDraft(draft);
    const entry = next.sizeConfig[actionId];
    if (!entry) return next;
    if (field === 'multiplier') {
      const value = number(rawValue, 1, 10);
      entry.multiplier = MULTIPLIERS.includes(value) ? value : null;
      if (entry.multiplier != null) entry.bb = null;
    } else if (field === 'bb') {
      entry.bb = number(rawValue, 0, 200);
      if (entry.bb != null) entry.multiplier = null;
    } else if (field === 'baseBb' || field === 'perLimpBb') {
      entry[field] = number(rawValue, 0, 200);
    }
    return next;
  }

  function setFrequencyMethod(draft, actionId, method) {
    const next = normalizeDraft(draft);
    if (!next.frequencyConfig[actionId]) return next;
    next.frequencyConfig[actionId] = frequencyEntry({ method });
    return next;
  }

  function updateFrequency(draft, actionId, field, rawValue) {
    const next = normalizeDraft(draft);
    const entry = next.frequencyConfig[actionId];
    if (!entry) return next;
    if (field === 'percent') entry.percent = number(rawValue, 0, 100);
    if (field === 'custom') entry.custom = text(rawValue);
    if (field === 'parity') {
      entry.parity = PARITIES.includes(rawValue) ? rawValue : null;
      entry.suits = [];
      entry.from = null;
      entry.to = null;
    }
    if (field === 'suit' && SUITS.includes(rawValue)) {
      const selected = new Set(entry.suits);
      if (selected.has(rawValue)) selected.delete(rawValue);
      else selected.add(rawValue);
      entry.suits = Array.from(selected);
      entry.parity = null;
      entry.from = null;
      entry.to = null;
    }
    if (field === 'from' || field === 'to') {
      entry[field] = number(rawValue, 0, 1000000);
      entry.suits = [];
      entry.parity = null;
    }
    return next;
  }

  function validate(draft) {
    const clean = normalizeDraft(draft);
    const errors = [];
    ACTIONS.forEach(action => {
      const size = clean.sizeConfig[action.id];
      if (size.bb != null && size.multiplier != null) {
        errors.push({ action: action.id, field: 'size', message: 'BB y X son excluyentes.' });
      }
      const frequency = clean.frequencyConfig[action.id];
      if (frequency.method === 'range' && frequency.from != null &&
          frequency.to != null && frequency.from > frequency.to) {
        errors.push({ action: action.id, field: 'range', message: 'Desde debe ser menor o igual que Hasta.' });
      }
    });
    return errors;
  }

  RT.RangeAdvancedConfig = Object.freeze({
    ACTIONS, MULTIPLIERS, METHODS, SUITS, PARITIES,
    defaults, normalizeDraft, updateSize, setFrequencyMethod,
    updateFrequency, validate, number, text
  });
})(window.RT = window.RT || {});
