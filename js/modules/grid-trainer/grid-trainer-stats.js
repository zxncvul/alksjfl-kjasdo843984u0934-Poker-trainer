'use strict';

(function (RT) {
  const PREFIX = 'rangeTrainer.gridTrainer.';
  const KEY = PREFIX + 'stats';

  function emptyStats() {
    return {
      rounds: 0,
      correct: 0,
      failed: 0,
      currentStreak: 0,
      bestStreak: 0,
      errorsByMode: {},
      errorsBySize: {},
      errorsByDifficulty: {},
      presets: {}
    };
  }

  function safeCount(value) {
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? Math.floor(number) : 0;
  }

  function safeBucket(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    return Object.fromEntries(Object.entries(value)
      .filter(([key]) => String(key).trim())
      .map(([key, count]) => [String(key), safeCount(count)])
      .filter(([, count]) => count > 0));
  }

  function normalizeStats(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return emptyStats();
    const correct = safeCount(value.correct);
    const failed = safeCount(value.failed);
    const currentStreak = Math.min(safeCount(value.currentStreak), correct);
    return {
      rounds: correct + failed,
      correct,
      failed,
      currentStreak,
      bestStreak: Math.max(currentStreak, safeCount(value.bestStreak)),
      errorsByMode: safeBucket(value.errorsByMode),
      errorsBySize: safeBucket(value.errorsBySize),
      errorsByDifficulty: safeBucket(value.errorsByDifficulty),
      presets: normalizePresetStats(value.presets)
    };
  }

  function normalizePresetStats(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    return Object.fromEntries(Object.entries(value).flatMap(([id, raw]) => {
      if (!id || !raw || typeof raw !== 'object' || Array.isArray(raw)) return [];
      const correct = safeCount(raw.correct);
      const failed = safeCount(raw.failed);
      const currentStreak = Math.min(safeCount(raw.currentStreak), correct);
      return [[String(id), {
        attempts: correct + failed,
        correct,
        failed,
        currentStreak,
        bestStreak: Math.max(currentStreak, safeCount(raw.bestStreak))
      }]];
    }));
  }

  function safeLoad() {
    try {
      const parsed = JSON.parse(localStorage.getItem(KEY) || 'null');
      return normalizeStats(parsed);
    } catch (err) {
      console.warn('[Grid Trainer] No se pudieron leer las estadísticas.', err);
      return emptyStats();
    }
  }

  function create() {
    let data = safeLoad();

    function save() {
      try {
        localStorage.setItem(KEY, JSON.stringify(data));
      } catch (err) {
        console.warn('[Grid Trainer] No se pudieron guardar las estadísticas.', err);
      }
    }

    function increment(bucket, key) {
      bucket[key] = (bucket[key] || 0) + 1;
    }

    return {
      get prefix() { return PREFIX; },
      snapshot() {
        return Object.assign({}, data, {
          accuracy: data.rounds ? Math.round(data.correct / data.rounds * 100) : 0,
          errorsByMode: Object.assign({}, data.errorsByMode),
          errorsBySize: Object.assign({}, data.errorsBySize),
          errorsByDifficulty: Object.assign({}, data.errorsByDifficulty),
          presets: normalizePresetStats(data.presets)
        });
      },
      presetSnapshot(id) {
        const item = data.presets[String(id)] || null;
        if (!item) return null;
        return Object.assign({}, item, {
          accuracy: item.attempts ? Math.round(item.correct / item.attempts * 100) : 0
        });
      },
      record(result, context) {
        const details = context && typeof context === 'object' ? context : {};
        data.rounds++;
        if (result === 'correct') {
          data.correct++;
          data.currentStreak++;
          data.bestStreak = Math.max(data.bestStreak, data.currentStreak);
        } else {
          data.failed++;
          data.currentStreak = 0;
          increment(data.errorsByMode, String(details.mode || 'unknown'));
          increment(data.errorsBySize, String(details.size || 'unknown'));
          increment(data.errorsByDifficulty, String(details.difficulty || 'unknown'));
        }
        if (details.presetId) {
          const id = String(details.presetId);
          const preset = data.presets[id] || {
            attempts: 0,
            correct: 0,
            failed: 0,
            currentStreak: 0,
            bestStreak: 0
          };
          preset.attempts++;
          if (result === 'correct') {
            preset.correct++;
            preset.currentStreak++;
            preset.bestStreak = Math.max(preset.bestStreak, preset.currentStreak);
          } else {
            preset.failed++;
            preset.currentStreak = 0;
          }
          data.presets[id] = preset;
        }
        save();
      },
      reset() {
        data = emptyStats();
        save();
      }
    };
  }

  RT.GridTrainerStats = { create, PREFIX, KEY, normalizeStats };
})(window.RT);
