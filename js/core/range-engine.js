/* ============================================================================
 * range-engine.js — MOTOR DE RANGOS (registro + consultas)
 * ============================================================================
 * El motor mantiene un registro indexado de todo lo declarado en
 * js/data/ranges.data.js mediante RT.defineSource / defineSpot /
 * defineAction / defineRange.
 *
 * RESPONSABILIDADES
 *   1. Registrar y validar definiciones de rangos.
 *   2. Responder consultas de DISPONIBILIDAD: qué spots, posiciones,
 *      relativas y acciones existen para un contexto dado. La interfaz usa
 *      estas consultas para los botones condicionales: si algo no existe en
 *      los datos, su botón nunca aparece activo.
 *   3. Resolver rangos: getRange(ctx) → manos; getActionMap(ctx) → mapa
 *      mano → acción para pintar la matriz.
 *
 * El motor NO toca el DOM. El simulador consume esta misma capa: un escenario
 * se evalúa preguntando getActionMap({source, spot, hero, relative}).
 * ==========================================================================*/
'use strict';

(function (RT) {

  const H = () => RT.Hands; // Acceso diferido por orden de carga.

  /* ------------------------------------------------------------------------
   * Almacenes internos.
   * ----------------------------------------------------------------------*/
  const sources = [];            // [{id,label}]
  const spots   = [];            // [{id,label,name,dims,description}]
  const actions = [];            // [{id,label,color}]
  const ranges  = [];            // [{source,spot,hero,relative,vs,action,hands:Set}]
  const spotsBySource = new Map();
  const contexts = new Map();

  /** Clave única de contexto para indexado rápido. */
  function key(source, spot, hero, relative, vs) {
    return `${source}|${spot}|${hero}|${relative || '-'}|${vs || '-'}`;
  }

  function contextId(ctx) {
    return `${ctx.spot}|${ctx.hero}|${ctx.relative || '-'}|${ctx.vs || '-'}`;
  }

  /** Índice clave-de-contexto → { action → Set<mano> } */
  const byContext = new Map();

  function addToIndex(index, indexKey, value) {
    if (!index.has(indexKey)) index.set(indexKey, new Set());
    index.get(indexKey).add(value);
  }

  /* ------------------------------------------------------------------------
   * API de definición (usada por js/data/ranges.data.js).
   * ----------------------------------------------------------------------*/

  /* Las funciones define* NUNCA lanzan: un dato mal escrito se avisa por
     consola y se ignora, de modo que el resto del archivo de datos cargue y
     la aplicación siga funcionando. La auditoría completa la hace validate(). */

  function dataError(msg) { console.error('[RT datos] ' + msg); }

  RT.defineSource = function (def) {
    if (!def || typeof def.id !== 'string' || !def.id.trim()) return dataError('defineSource: falta id válido');
    if (sources.some(s => s.id === def.id)) return dataError(`defineSource: id duplicado "${def.id}"`);
    sources.push({ id: def.id, label: def.label || def.id });
  };

  RT.defineSpot = function (def) {
    if (!def || typeof def.id !== 'string' || !def.id.trim()) return dataError('defineSpot: falta id válido');
    if (spots.some(s => s.id === def.id)) return dataError(`defineSpot: id duplicado "${def.id}"`);
    if (def.dims !== undefined && (!Array.isArray(def.dims) ||
        def.dims.some(d => !['hero', 'relative', 'vs'].includes(d)))) {
      return dataError(`defineSpot: dims inválidas en "${def.id}"`);
    }
    spots.push({
      id: def.id,
      label: def.label || def.id,
      name: def.name || def.id,
      dims: def.dims || ['hero'],
      description: def.description || '',
      titleTemplate: def.titleTemplate || ''
    });
  };

  RT.defineAction = function (def) {
    if (!def || typeof def.id !== 'string' || !def.id.trim()) return dataError('defineAction: falta id válido');
    if (actions.some(a => a.id === def.id)) return dataError(`defineAction: id duplicado "${def.id}"`);
    actions.push({ id: def.id, label: def.label || def.id, color: def.color || '#888' });
  };

  /**
   * Registra un rango. Valida manos contra la matriz canónica y avisa por
   * consola de cualquier mano mal escrita (sin romper la aplicación).
   */
  RT.defineRange = function (def) {
    const required = ['source', 'spot', 'hero', 'action', 'hands'];
    for (const k of required) {
      if (!def || def[k] === undefined) {
        return dataError(`defineRange: falta "${k}" en ${def ? JSON.stringify({ spot: def.spot, hero: def.hero, action: def.action }) : 'definición vacía'}`);
      }
    }
    if (!RT.Hands.POSITIONS.includes(def.hero)) {
      return dataError(`defineRange: posición desconocida "${def.hero}" en ${def.spot}`);
    }
    if (!Array.isArray(def.hands)) {
      return dataError(`defineRange: "hands" debe ser un array en ${def.spot}/${def.hero}`);
    }
    if (def.relative && !RT.Hands.RELATIVES.includes(def.relative)) {
      return dataError(`defineRange: relativa desconocida "${def.relative}" en ${def.spot}/${def.hero}`);
    }
    if (def.vs && !RT.Hands.POSITIONS.includes(def.vs)) {
      return dataError(`defineRange: rival desconocido "${def.vs}" en ${def.spot}/${def.hero}`);
    }
    if (!sources.some(s => s.id === def.source)) {
      return dataError(`defineRange: fuente desconocida "${def.source}" en ${def.spot}/${def.hero}`);
    }
    const spotDef = spots.find(s => s.id === def.spot);
    if (!spotDef) return dataError(`defineRange: spot desconocido "${def.spot}" en ${def.hero}`);
    if (!actions.some(a => a.id === def.action)) {
      return dataError(`defineRange: acción desconocida "${def.action}" en ${def.spot}/${def.hero}`);
    }
    if (spotDef.dims.includes('relative') && !def.relative) {
      return dataError(`defineRange: falta "relative" en ${def.spot}/${def.hero}`);
    }
    if (!spotDef.dims.includes('relative') && def.relative) {
      return dataError(`defineRange: "${def.spot}" no usa relative (${def.hero}/${def.relative})`);
    }
    if (spotDef.dims.includes('vs') && !def.vs) {
      return dataError(`defineRange: falta "vs" en ${def.spot}/${def.hero}`);
    }
    if (!spotDef.dims.includes('vs') && def.vs) {
      return dataError(`defineRange: "${def.spot}" no usa vs (${def.hero}/${def.vs})`);
    }
    if (def.vs && def.vs === def.hero) {
      return dataError(`defineRange: hero y vs no pueden coincidir en ${def.spot}/${def.hero}`);
    }
    const valid = new Set();
    for (const h of def.hands) {
      if (RT.Hands.ALL_HANDS.includes(h)) valid.add(h);
      else console.warn(`[RT] Mano inválida ignorada en ${def.spot}/${def.hero}: "${h}"`);
    }
    if (!valid.size) {
      return dataError(`defineRange: rango vacío en ${def.spot}/${def.hero} (${def.action})`);
    }
    const entry = {
      source: def.source,
      spot: def.spot,
      hero: def.hero,
      relative: def.relative || null,
      vs: def.vs || null,
      action: def.action,
      hands: valid
    };
    ranges.push(entry);

    const k = key(entry.source, entry.spot, entry.hero, entry.relative, entry.vs);
    if (!byContext.has(k)) byContext.set(k, Object.create(null));
    const bucket = byContext.get(k);
    if (bucket[entry.action]) {
      // Fusionar si se define dos veces (permite repartir datos en archivos).
      for (const h of valid) bucket[entry.action].add(h);
    } else {
      bucket[entry.action] = valid;
    }

    addToIndex(spotsBySource, entry.source, entry.spot);
    if (!contexts.has(k)) {
      contexts.set(k, {
        source: entry.source,
        spot: entry.spot,
        hero: entry.hero,
        relative: entry.relative,
        vs: entry.vs
      });
    }
  };

  /* ------------------------------------------------------------------------
   * Consultas de catálogo.
   * ----------------------------------------------------------------------*/

  function getSources() { return sources.slice(); }
  function getSpotsCatalog() { return spots.slice(); }
  function getActionsCatalog() { return actions.slice(); }
  function getSpotDef(spotId) { return spots.find(s => s.id === spotId) || null; }
  function getActionDef(actionId) { return actions.find(a => a.id === actionId) || null; }

  /* ------------------------------------------------------------------------
   * Consultas de disponibilidad (botones condicionales).
   *
   * Todas reciben un contexto parcial { source, spot?, hero?, relative? } y
   * devuelven SOLO valores con datos reales, en orden canónico.
   * ----------------------------------------------------------------------*/

  /** Spots con al menos un rango para la fuente. */
  function availableSpots(source) {
    const found = spotsBySource.get(source) || new Set();
    return spots.filter(s => found.has(s.id)).map(s => s.id);
  }

  function getContexts(filter) {
    filter = filter || {};
    return Array.from(contexts.values())
      .filter(ctx =>
        (filter.source == null || ctx.source === filter.source) &&
        (filter.spot == null || ctx.spot === filter.spot) &&
        (filter.hero == null || ctx.hero === filter.hero) &&
        (filter.relative == null || ctx.relative === filter.relative) &&
        (filter.vs == null || ctx.vs === filter.vs))
      .map(ctx => Object.assign({}, ctx));
  }

  /** Posiciones de héroe con datos para (source, spot[, relative]). */
  function availableHeroes(ctx) {
    const found = new Set(getContexts(ctx).map(item => item.hero));
    return H().POSITIONS.filter(p => found.has(p));
  }

  /** Relativas (OOP/IP) con datos para (source, spot[, hero]). */
  function availableRelatives(ctx) {
    const found = new Set(getContexts(ctx).map(item => item.relative).filter(Boolean));
    return H().RELATIVES.filter(rel => found.has(rel));
  }

  function availableVs(ctx) {
    const found = new Set(getContexts(ctx).map(item => item.vs).filter(Boolean));
    return H().POSITIONS.filter(position => found.has(position));
  }

  /** Acciones con datos para un contexto completo. */
  function availableActions(ctx) {
    const bucket = byContext.get(key(ctx.source, ctx.spot, ctx.hero, ctx.relative, ctx.vs));
    if (!bucket) return [];
    return actions.filter(a => bucket[a.id] && bucket[a.id].size > 0).map(a => a.id);
  }

  /** ¿El spot necesita dimensión relativa (IP/OOP)? */
  function spotNeedsRelative(spotId) {
    const def = getSpotDef(spotId);
    return !!def && def.dims.includes('relative');
  }

  function spotNeedsVs(spotId) {
    const def = getSpotDef(spotId);
    return !!def && def.dims.includes('vs');
  }

  /** ¿El contexto está completo (todas las dimensiones del spot cubiertas)? */
  function isContextComplete(ctx) {
    if (!ctx.source || !ctx.spot) return false;
    if (!sources.some(s => s.id === ctx.source)) return false;
    const def = getSpotDef(ctx.spot);
    if (!def) return false;
    if (def.dims.includes('hero') && !H().POSITIONS.includes(ctx.hero)) return false;
    if (def.dims.includes('relative') && !H().RELATIVES.includes(ctx.relative)) return false;
    if (!def.dims.includes('relative') && ctx.relative != null) return false;
    if (def.dims.includes('vs') && !H().POSITIONS.includes(ctx.vs)) return false;
    if (!def.dims.includes('vs') && ctx.vs != null) return false;
    return true;
  }

  /* ------------------------------------------------------------------------
   * Resolución de rangos.
   * ----------------------------------------------------------------------*/

  /**
   * Manos de una acción concreta en un contexto completo.
   * @returns {string[]} lista ordenada según la matriz.
   */
  function getRange(ctx, action) {
    const bucket = byContext.get(key(ctx.source, ctx.spot, ctx.hero, ctx.relative, ctx.vs));
    if (!bucket || !bucket[action]) return [];
    return H().ALL_HANDS.filter(h => bucket[action].has(h));
  }

  /**
   * Mapa mano → acción para un contexto completo (todas las acciones).
   * Si una mano aparece en varias acciones, gana la primera según el orden
   * del catálogo de acciones (no debería ocurrir con datos coherentes).
   * @returns {Object<string,string>}
   */
  function getActionMap(ctx) {
    const bucket = byContext.get(key(ctx.source, ctx.spot, ctx.hero, ctx.relative, ctx.vs));
    const map = Object.create(null);
    if (!bucket) return map;
    for (const a of actions) {
      const set = bucket[a.id];
      if (!set) continue;
      for (const h of set) if (!map[h]) map[h] = a.id;
    }
    return map;
  }

  /**
   * Etiqueta humana de un contexto, p. ej. "UTG · vs 3Bet · OOP".
   * Centralizada aquí para que toda la interfaz la muestre igual.
   */
  function describeContext(ctx) {
    const spotDef = getSpotDef(ctx.spot);
    if (spotDef && spotDef.titleTemplate) {
      return spotDef.titleTemplate
        .replaceAll('{hero}', ctx.hero || '')
        .replaceAll('{vs}', ctx.vs || '')
        .replaceAll('{relative}', ctx.relative || '');
    }
    const parts = [ctx.hero, spotDef ? spotDef.label : ctx.spot];
    if (ctx.relative) parts.push(ctx.relative);
    return parts.filter(Boolean).join(' · ');
  }

  /* ------------------------------------------------------------------------
   * Validación global (se ejecuta una vez al arrancar, ver app.js).
   * Detecta solapes de manos entre acciones del mismo contexto.
   * ----------------------------------------------------------------------*/
  function validate() {
    const problems = [];

    // 1) Solapes: una mano no puede estar en dos acciones del mismo contexto.
    for (const [k, bucket] of byContext) {
      const seen = new Map();
      for (const actionId of Object.keys(bucket)) {
        for (const h of bucket[actionId]) {
          if (seen.has(h)) problems.push(`solape — ${k}: "${h}" en ${seen.get(h)} y ${actionId}`);
          else seen.set(h, actionId);
        }
      }
    }

    // 2) Referencias: cada rango debe apuntar a fuente/spot/acción definidos.
    const srcIds = new Set(sources.map(s => s.id));
    const spotIds = new Set(spots.map(s => s.id));
    const actIds = new Set(actions.map(a => a.id));
    for (const r of ranges) {
      const where = `${r.spot}/${r.hero}${r.relative ? '/' + r.relative : ''}${r.vs ? '/vs-' + r.vs : ''}`;
      if (!srcIds.has(r.source)) problems.push(`fuente desconocida — "${r.source}" en ${where}`);
      if (!spotIds.has(r.spot)) problems.push(`spot desconocido — "${r.spot}" en ${where}`);
      if (!actIds.has(r.action)) problems.push(`acción desconocida — "${r.action}" en ${where}`);
      if (r.hands.size === 0) problems.push(`rango vacío — ${where} (${r.action}): sin manos válidas`);
      const spotDef = getSpotDef(r.spot);
      if (spotDef && spotDef.dims.includes('relative') && !r.relative) {
        problems.push(`falta "relative" — ${where} (${r.action}): el spot lo exige`);
      }
    }

    for (const r of ranges) {
      const spotDef = getSpotDef(r.spot);
      if (spotDef && spotDef.dims.includes('vs') && !r.vs) {
        problems.push(`falta "vs" - ${r.spot}/${r.hero} (${r.action}): el spot lo exige`);
      }
    }

    // 3) Defensa vs 3bet: solo puede contener manos abiertas por Hero.
    for (const r of ranges.filter(r => r.spot === 'VS3BET')) {
      const open = new Set(getRange(
        { source: r.source, spot: 'OR', hero: r.hero, relative: null }, 'OR'));
      for (const h of r.hands) {
        if (!open.has(h)) {
          problems.push(`secuencia imposible — VS3BET/${r.hero}/${r.relative}: "${h}" no está en su rango OR`);
        }
      }
    }

    if (problems.length) {
      console.warn(`[RT] Auditoría de rangos: ${problems.length} problema(s):\n` + problems.join('\n'));
    }
    return problems;
  }

  /* ------------------------------------------------------------------------
   * Exportar API pública.
   * ----------------------------------------------------------------------*/
  RT.Engine = {
    getSources, getSpotsCatalog, getActionsCatalog, getSpotDef, getActionDef,
    getContexts, contextId,
    availableSpots, availableHeroes, availableRelatives, availableVs, availableActions,
    spotNeedsRelative, spotNeedsVs, isContextComplete,
    getRange, getActionMap, describeContext, validate
  };

})(window.RT);
