'use strict';

(function (RT) {
  const PREFIX = 'rangeTrainer.mathTrainer.';
  const KEY = PREFIX + 'stats';
  const empty = () => ({
    played: 0, correct: 0, failed: 0, currentStreak: 0, bestStreak: 0,
    totalTimeMs: 0, timedAttempts: 0,
    errorsByCategory: {}, errorsByDifficulty: {}, presets: {}
  });
  const count = value => Number.isFinite(Number(value)) && Number(value) >= 0
    ? Math.floor(Number(value)) : 0;
  function bucket(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    return Object.fromEntries(Object.entries(value)
      .map(([key, value]) => [String(key), count(value)]).filter(([, value]) => value > 0));
  }
  function normalize(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return empty();
    const data = empty();
    data.correct = count(value.correct);
    data.failed = count(value.failed);
    data.played = data.correct + data.failed;
    data.currentStreak = Math.min(count(value.currentStreak), data.correct);
    data.bestStreak = Math.max(data.currentStreak, count(value.bestStreak));
    data.totalTimeMs = count(value.totalTimeMs);
    data.timedAttempts = Math.min(
      data.played,
      count(value.timedAttempts) || (data.totalTimeMs ? data.correct : 0)
    );
    data.errorsByCategory = bucket(value.errorsByCategory);
    data.errorsByDifficulty = bucket(value.errorsByDifficulty);
    const rawPresets = value.presets && typeof value.presets === 'object' &&
      !Array.isArray(value.presets) ? value.presets : {};
    data.presets = Object.fromEntries(Object.entries(rawPresets).map(([id, item]) => {
      const source = item && typeof item === 'object' && !Array.isArray(item) ? item : {};
      const correct = count(source.correct);
      const failed = count(source.failed);
      const currentStreak = Math.min(count(source.currentStreak), correct);
      return [String(id), {
        attempts: correct + failed,
        correct,
        failed,
        currentStreak,
        bestStreak: Math.max(currentStreak, count(source.bestStreak))
      }];
    }));
    return data;
  }
  function create() {
    let data;
    try { data = normalize(JSON.parse(localStorage.getItem(KEY) || 'null')); }
    catch (error) {
      console.warn('[Math Trainer] Estadísticas corruptas; se restablecen.', error);
      data = empty();
    }
    const save = () => {
      try { localStorage.setItem(KEY, JSON.stringify(data)); }
      catch (error) { console.warn('[Math Trainer] No se pudieron guardar estadísticas.', error); }
    };
    const increment = (target, key) => { target[key] = count(target[key]) + 1; };
    return {
      get prefix() { return PREFIX; },
      snapshot() {
        return Object.assign({}, data, {
          accuracy: data.played ? Math.round(data.correct / data.played * 100) : 0,
          averageTimeMs: data.timedAttempts
            ? Math.round(data.totalTimeMs / data.timedAttempts)
            : 0,
          errorsByCategory: Object.assign({}, data.errorsByCategory),
          errorsByDifficulty: Object.assign({}, data.errorsByDifficulty)
        });
      },
      presetSnapshot(id) {
        const item = data.presets[id];
        if (!item) return null;
        return Object.assign({}, item, {
          accuracy: item.attempts ? Math.round(item.correct / item.attempts * 100) : 0
        });
      },
      record(correct, context) {
        data.played++;
        data.totalTimeMs += count(context.timeMs);
        data.timedAttempts++;
        if (correct) {
          data.correct++;
          data.currentStreak++;
          data.bestStreak = Math.max(data.bestStreak, data.currentStreak);
        } else {
          data.failed++;
          data.currentStreak = 0;
          increment(data.errorsByCategory, context.category || 'unknown');
          increment(data.errorsByDifficulty, context.difficulty || 'manual');
        }
        if (context.presetId) {
          const item = data.presets[context.presetId] || {
            attempts: 0, correct: 0, failed: 0, currentStreak: 0, bestStreak: 0
          };
          item.attempts++;
          if (correct) {
            item.correct++;
            item.currentStreak++;
            item.bestStreak = Math.max(item.bestStreak, item.currentStreak);
          } else {
            item.failed++;
            item.currentStreak = 0;
          }
          data.presets[context.presetId] = item;
        }
        save();
      },
      reset() { data = empty(); save(); }
    };
  }
  RT.MathTrainerStats = { create, PREFIX, KEY, normalize };
})(window.RT);
