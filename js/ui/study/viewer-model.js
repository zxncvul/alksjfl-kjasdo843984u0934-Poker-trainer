/* Estado y utilidades puras compartidas por biblioteca y Visualizador. */
'use strict';

(function (RT) {
  const LIBRARY_FILTERS = Object.freeze([
    { id: 'all', label: 'Todos' },
    { id: 'or', label: 'OR' },
    { id: 'vs-open', label: 'vs Open' },
    { id: 'vs-3bet', label: 'vs 3Bet' },
    { id: 'rol', label: 'ROL' },
    { id: 'squeeze', label: 'Squeeze' },
    { id: '4bet', label: '4Bet' },
    { id: 'push', label: 'Push' },
    { id: 'favorites', label: 'Favoritos' },
    { id: 'templates', label: 'Plantillas' }
  ]);

  function text(value) {
    return value == null ? '' : String(value).trim();
  }

  function matchesFamily(item, family, dependencies) {
    if (!item || !item.context || family === 'all') return !!item;
    const context = item.context;
    const spot = text(context.spot).toUpperCase();
    const actions = (item.actions || []).map(action => text(action).toUpperCase());
    if (family === 'or') return spot === 'OR';
    if (family === 'vs-open') return spot.includes('VS_OPEN');
    if (family === 'vs-3bet') return spot === 'VS3BET' || spot.includes('VS_3BET');
    if (family === 'rol') return spot.includes('ROL') || actions.includes('ROL');
    if (family === 'squeeze') return spot.includes('SQUEEZE') || actions.includes('SQUEEZE');
    if (family === '4bet') return spot.includes('4BET') || actions.some(action => action.includes('4BET'));
    if (family === 'push') {
      return spot.includes('PUSH') ||
        actions.some(action => ['PUSH', 'JAM', 'ALLIN', 'ALL_IN'].includes(action));
    }
    if (family === 'favorites') {
      return !!dependencies && typeof dependencies.isFavorite === 'function' &&
        dependencies.isFavorite(context);
    }
    if (family === 'templates') return item.template === true;
    return true;
  }

  function applyLibraryFilters(items, filters, dependencies) {
    const state = filters || {};
    const relatives = state.relatives instanceof Set
      ? state.relatives : new Set(state.relatives || ['IP', 'OOP']);
    const selectedTags = state.selectedTags instanceof Set
      ? state.selectedTags : new Set(state.selectedTags || []);
    const query = text(state.query).toLocaleLowerCase('es');
    return (items || []).filter(item => {
      if (!matchesFamily(item, state.family || 'all', dependencies)) return false;
      if (state.favoritesOnly && (!dependencies ||
          typeof dependencies.isFavorite !== 'function' ||
          !dependencies.isFavorite(item.context))) return false;
      const relative = item.context && item.context.relative;
      if (relative && !relatives.has(relative)) return false;
      if (selectedTags.size) {
        const tags = new Set((item.tags || []).map(tag => text(tag).toLocaleLowerCase('es')));
        if (!Array.from(selectedTags).every(tag =>
          tags.has(text(tag).toLocaleLowerCase('es')))) return false;
      }
      if (query) {
        const haystack = [
          item.context && item.context.spot,
          item.context && item.context.hero,
          item.context && item.context.vs,
          relative,
          ...(item.actions || [])
        ].map(text).join(' ').toLocaleLowerCase('es');
        if (!query.split(/\s+/).every(token => haystack.includes(token))) return false;
      }
      return true;
    });
  }

  function buildExportTitle(context, options) {
    const ctx = context || {};
    const opts = options || {};
    const spot = text(opts.spotLabel || ctx.spot);
    const hero = text(ctx.hero);
    const rival = text(ctx.vs);
    const profile = text(opts.profile);
    const stack = text(opts.stack || '100bb');
    const subject = rival
      ? [hero, 'vs', rival, profile].filter(Boolean).join(' ')
      : hero;
    return [spot, subject, stack].filter(Boolean).join(' - ') || 'Rango preflop';
  }

  function buildExportPayload(context, options) {
    const title = buildExportTitle(context, options);
    const payload = {
      title,
      collection: text(options && options.collection) || 'Mis rangos',
      spot: text(context && context.spot),
      hero: text(context && context.hero),
      rival: text(context && context.vs),
      profile: text(options && options.profile),
      relative: text(context && context.relative),
      actions: Array.from((options && options.actions) || []).map(text).filter(Boolean),
      combos: Number.isFinite(options && options.combos) ? options.combos : 0,
      percentage: Number.isFinite(options && options.percentage) ? options.percentage : 0
    };
    return payload;
  }

  function resolveActiveContext(items, wantedId, getId) {
    const list = items || [];
    if (!list.length) return null;
    const found = list.find(item => getId(item.context) === wantedId);
    return (found || list[0]).context;
  }

  function reconcileContext(engine, state, source) {
    const spots = engine.availableSpots(source);
    if (!spots.includes(state.spot)) state.spot = spots[0] || null;
    if (!state.spot) {
      state.relative = null;
      state.hero = null;
      state.vs = null;
      return state;
    }

    if (engine.spotNeedsRelative(state.spot)) {
      const relatives = engine.availableRelatives({ source, spot: state.spot });
      if (!relatives.includes(state.relative)) state.relative = relatives[0] || null;
    } else {
      state.relative = null;
    }

    const heroes = engine.availableHeroes({
      source, spot: state.spot, relative: state.relative
    });
    if (!heroes.includes(state.hero)) state.hero = heroes[0] || null;

    if (engine.spotNeedsVs(state.spot)) {
      const opponents = engine.availableVs({
        source,
        spot: state.spot,
        hero: state.hero,
        relative: state.relative
      });
      if (!opponents.includes(state.vs)) state.vs = opponents[0] || null;
    } else {
      state.vs = null;
    }
    return state;
  }

  RT.ViewerModel = {
    LIBRARY_FILTERS,
    applyLibraryFilters,
    buildExportTitle,
    buildExportPayload,
    resolveActiveContext,
    reconcileContext
  };
})(window.RT);
