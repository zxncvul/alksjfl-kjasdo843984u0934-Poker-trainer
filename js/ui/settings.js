/* ============================================================================
 * settings.js — CONFIGURACIÓN, FAVORITOS Y MODALES
 * ============================================================================
 * Tres piezas de infraestructura de UI, separadas de app.js:
 *
 *   RT.Settings  — preferencias del usuario, persistidas en localStorage.
 *                  Aplica los ajustes visuales como clases/variables CSS en
 *                  <body> y emite 'settings:changed' para que app.js
 *                  re-renderice lo que dependa de ellas.
 *   RT.Favorites — contextos favoritos (spot+posición+relativa) persistidos.
 *   RT.Modal     — modal genérico (config, estadísticas...). ESC y clic en
 *                  el fondo lo cierran.
 *
 * Todo funciona sin localStorage (modo privado): simplemente no persiste.
 * ==========================================================================*/
'use strict';

(function (RT) {

  function storage() {
    try { return window.localStorage || null; } catch (_) { return null; }
  }

  /* ========================================================================
   * RT.Settings
   * ======================================================================*/
  const SETTINGS_KEY = 'rt:settings:v1';
  const LEGACY_SETTINGS_KEYS = ['rt:settings'];

  const DEFAULTS = {
    /* Quiz */
    includeFold: false,        // quiz de rango: exigir pintar también Fold
    autoSolution: false,       // al fallar, mostrar la respuesta correcta
    autoAdvance: false,        // tras acertar, pasar solo a la siguiente
    autoAdvanceSecs: 2,        // segundos del auto-avance
    repeatUntilMastered: false,// reencolar falladas hasta acertarlas
    difficulty: 'media',       // 'basica' | 'media' | 'avanzada' (nivel por defecto)
    questionsPerSession: 0,    // 0 = sin límite

    /* Visual */
    gridSize: 'm',             // 's' | 'm' | 'l'
    textSize: 'm',             // 's' | 'm' | 'l'
    compact: false,            // modo móvil compacto
    showCombos: true,          // contadores de combos en barra y botones
    showPercents: true,        // % del total de combos en la barra de estado
    showPositionNames: true,   // nombres de posición en la mesa
    cleanTable: false,         // mesa sin nombres ni textos secundarios
    intensity: 'alta',         // 'alta' | 'media' | 'suave' (color de la matriz)
    theme: 'tactico',          // 'tactico' | 'contraste'

    /* Entrenamiento */
    mixSpots: true,            // barajar entre spots (off = agrupar por spot)
    mixPositions: true,        // off = agrupar por posición
    mixActions: true,          // off = agrupar por acción
    weightFailedHands: true    // priorizar errores históricos al repartir
  };

  let settings = Object.assign({}, DEFAULTS);

  /** Valores permitidos por clave (saneado de localStorage corrupto). */
  const ENUMS = {
    difficulty: ['basica', 'media', 'avanzada'],
    gridSize: ['s', 'm', 'l'],
    textSize: ['s', 'm', 'l'],
    intensity: ['alta', 'media', 'suave'],
    theme: ['tactico', 'contraste']
  };
  const NUMBER_VALUES = {
    autoAdvanceSecs: [1, 2, 3, 5],
    questionsPerSession: [0, 10, 25, 50]
  };

  /** Sanea un objeto de configuración campo a campo contra DEFAULTS. */
  function sanitizeSettings(raw) {
    const clean = Object.assign({}, DEFAULTS);
    if (!raw || typeof raw !== 'object') return clean;
    for (const key of Object.keys(DEFAULTS)) {
      const v = raw[key];
      const def = DEFAULTS[key];
      if (typeof def === 'boolean') {
        if (typeof v === 'boolean') clean[key] = v;
      } else if (typeof def === 'number') {
        if (typeof v === 'number' && isFinite(v) &&
            (!NUMBER_VALUES[key] || NUMBER_VALUES[key].includes(v))) clean[key] = v;
      } else if (ENUMS[key]) {
        if (ENUMS[key].includes(v)) clean[key] = v;
      }
    }
    return clean;
  }

  function loadSettings() {
    const ls = storage();
    if (!ls) return;
    try {
      let raw = ls.getItem(SETTINGS_KEY);
      if (!raw) {
        for (const legacyKey of LEGACY_SETTINGS_KEYS) {
          raw = ls.getItem(legacyKey);
          if (raw) break;
        }
      }
      if (raw) {
        settings = sanitizeSettings(JSON.parse(raw));
        saveSettings();
      }
    } catch (err) {
      console.warn('[RT.Settings] Configuración guardada ilegible; valores por defecto:', err);
      settings = Object.assign({}, DEFAULTS);
      saveSettings();
    }
  }

  function saveSettings() {
    const ls = storage();
    if (!ls) return;
    try { ls.setItem(SETTINGS_KEY, JSON.stringify(settings)); }
    catch (err) { console.warn('[RT.Settings] No se pudo guardar la configuración:', err); }
  }

  /** Dificultad acumulativa → niveles preseleccionados en el quiz quirúrgico:
   *  básica solo nivel 1; media añade el 2; avanzada incluye también el 3. */
  function difficultyLevels(d) {
    if (d === 'basica') return [1];
    if (d === 'avanzada') return [1, 2, 3];
    return [1, 2];
  }

  const INTENSITY_PCT = { alta: 100, media: 82, suave: 65 };
  const GRID_MAX = { s: '520px', m: '720px', l: '920px' };
  const TEXT_PX = { s: '14px', m: '15px', l: '16.5px' };

  /** Vuelca los ajustes visuales al DOM (clases y variables en body/raíz). */
  function applyVisual() {
    const body = document.body;
    if (!body) return;
    body.classList.toggle('is-compact', !!settings.compact);
    body.classList.toggle('hide-position-names', !settings.showPositionNames);
    body.classList.toggle('sim-clean-table', !!settings.cleanTable);
    body.dataset.theme = settings.theme;
    const root = document.documentElement;
    root.style.setProperty('--grid-max', GRID_MAX[settings.gridSize] || GRID_MAX.m);
    root.style.setProperty('--base-font', TEXT_PX[settings.textSize] || TEXT_PX.m);
    root.style.setProperty('--cell-intensity', String(INTENSITY_PCT[settings.intensity] || 100));
  }

  RT.Settings = {
    get all() { return Object.assign({}, settings); },
    get(key) { return settings[key]; },
    set(key, value) {
      if (!Object.prototype.hasOwnProperty.call(DEFAULTS, key)) return false;
      const next = sanitizeSettings(Object.assign({}, settings, { [key]: value }));
      settings[key] = next[key];
      saveSettings();
      applyVisual();
      RT.emit('settings:changed', { key, value: settings[key] });
      return true;
    },
    difficultyLevels() { return difficultyLevels(settings.difficulty); },
    resetConfig() {
      settings = Object.assign({}, DEFAULTS);
      saveSettings();
      applyVisual();
      RT.emit('settings:changed', { key: '*' });
    },
    applyVisual
  };

  /* ========================================================================
   * RT.Favorites — contextos favoritos.
   * ======================================================================*/
  const FAVS_KEY = 'rt:favs:v1';
  const LEGACY_FAVS_KEYS = ['rt:favs'];
  let favs = [];

  function favKey(ctx) {
    return `${ctx.spot}|${ctx.hero}|${ctx.relative || '-'}|${ctx.vs || '-'}`;
  }

  function sanitizeFavs(list) {
    if (!Array.isArray(list)) return [];
    const sources = RT.Engine.getSources();
    const seen = new Set();
    const clean = [];
    for (const f of list) {
      if (!f || typeof f !== 'object' || !RT.Hands.POSITIONS.includes(f.hero)) continue;
      const spot = RT.Engine.getSpotDef(f.spot);
      if (!spot) continue;
      const relative = spot.dims.includes('relative')
        ? (RT.Hands.RELATIVES.includes(f.relative) ? f.relative : null)
        : null;
      const vs = spot.dims.includes('vs')
        ? (RT.Hands.POSITIONS.includes(f.vs) ? f.vs : null)
        : null;
      if (spot.dims.includes('relative') && !relative) continue;
      if (spot.dims.includes('vs') && !vs) continue;
      const valid = sources.some(source => RT.Engine.availableActions({
        source: source.id, spot: spot.id, hero: f.hero, relative, vs
      }).length > 0);
      if (!valid) continue;
      const item = { spot: spot.id, hero: f.hero, relative, vs };
      const key = favKey(item);
      if (!seen.has(key)) { seen.add(key); clean.push(item); }
    }
    return clean;
  }

  function loadFavs() {
    const ls = storage();
    if (!ls) return;
    try {
      let stored = ls.getItem(FAVS_KEY);
      if (!stored) {
        for (const legacyKey of LEGACY_FAVS_KEYS) {
          stored = ls.getItem(legacyKey);
          if (stored) break;
        }
      }
      const raw = JSON.parse(stored || '[]');
      favs = sanitizeFavs(raw);
      saveFavs();
    } catch (err) {
      console.warn('[RT.Favorites] Favoritos guardados ilegibles; se limpian:', err);
      favs = [];
      saveFavs();
    }
  }

  function saveFavs() {
    const ls = storage();
    if (!ls) return;
    try { ls.setItem(FAVS_KEY, JSON.stringify(favs)); } catch (_) { /* sin persistencia */ }
  }

  RT.Favorites = {
    list() { return favs.slice(); },
    has(ctx) { const k = favKey(ctx); return favs.some(f => favKey(f) === k); },
    toggle(ctx) {
      const k = favKey(ctx);
      const i = favs.findIndex(f => favKey(f) === k);
      if (i >= 0) favs.splice(i, 1);
      else favs.push({
        spot: ctx.spot, hero: ctx.hero,
        relative: ctx.relative || null, vs: ctx.vs || null
      });
      saveFavs();
      RT.emit('favorites:changed');
      return i < 0;
    },
    /** Sustituye la lista completa (importación de progreso). */
    replace(list) {
      favs = sanitizeFavs(list);
      saveFavs();
      RT.emit('favorites:changed');
    }
  };

  /* ========================================================================
   * RT.Modal — modal único reutilizable.
   * ======================================================================*/
  let overlay = null;

  function ensureOverlay() {
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.addEventListener('click', (ev) => {
      if (ev.target === overlay) RT.Modal.close();
    });
    const box = document.createElement('div');
    box.className = 'modal';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    return overlay;
  }

  RT.Modal = {
    get isOpen() { return !!overlay && overlay.classList.contains('is-open'); },
    /** Abre el modal con un título y un nodo de contenido. */
    open(title, contentEl, { variant = '' } = {}) {
      const ov = ensureOverlay();
      const box = ov.firstChild;
      box.className = 'modal' + (variant ? ' ' + variant : '');
      box.innerHTML = '';
      const head = document.createElement('div');
      head.className = 'modal-head';
      const h = document.createElement('h2');
      h.textContent = title;
      const closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.className = 'modal-close';
      closeBtn.setAttribute('aria-label', 'Cerrar');
      closeBtn.textContent = '✕';
      closeBtn.addEventListener('click', () => RT.Modal.close());
      head.appendChild(h);
      head.appendChild(closeBtn);
      box.appendChild(head);
      const body = document.createElement('div');
      body.className = 'modal-body';
      body.appendChild(contentEl);
      box.appendChild(body);
      ov.classList.add('is-open');
      document.body.classList.add('has-modal');
    },
    close() {
      if (!overlay) return;
      overlay.classList.remove('is-open');
      document.body.classList.remove('has-modal');
    }
  };

  /* ========================================================================
   * Exportar / importar progreso completo (config + estadísticas + favoritos)
   * ======================================================================*/
  RT.Progress = {
    exportJSON() {
      return JSON.stringify({
        version: 1,
        exportedAt: new Date().toISOString(),
        settings,
        favorites: favs,
        stats: JSON.parse(RT.Stats.exportJSON()).stats
      }, null, 2);
    },
    importJSON(text) {
      const data = JSON.parse(text);
      if (!data || typeof data !== 'object') throw new Error('JSON inválido');
      if (!data.settings && !data.favorites && !data.stats) {
        throw new Error('Formato de progreso no reconocido');
      }
      if (data.stats && typeof data.stats !== 'object') {
        throw new Error('Estadísticas inválidas');
      }
      if (data.settings) {
        settings = sanitizeSettings(data.settings);
        saveSettings();
        applyVisual();
      }
      if (data.favorites) RT.Favorites.replace(data.favorites);
      if (data.stats) RT.Stats.importJSON(JSON.stringify({ version: 1, stats: data.stats }));
      RT.emit('settings:changed', { key: '*' });
    }
  };

  loadSettings();
  loadFavs();
  // applyVisual se invoca desde app.js en boot (body ya disponible).

})(window.RT);
