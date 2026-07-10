/* ============================================================================
 * study-ui.js - Visualizador de rangos.
 *
 * El estado interno conserva el nombre "study" para no romper datos ni rutas
 * antiguas. La interfaz visible se presenta como Visualizador.
 * ==========================================================================*/
'use strict';

(function (RT) {
  const DEBUG_VISUALIZER = false;

  RT.StudyUI = {
    create(ctx) {
      const {
        ui, toolkit, studyContext, rangeAnalytics,
        renderAll, renderPanel
      } = ctx;
      const {
        el, button, selectGroup,
        hint, dashPanel, statLine, barRow
      } = toolkit;

      function debugVisualizer(event, payload) {
        if (!DEBUG_VISUALIZER) return;
        console.debug(`[Visualizador] ${event}`, payload);
      }

      function displayText(raw) {
        const replacements = {
          'Ã¡': 'á',
          'Ã©': 'é',
          'Ã­': 'í',
          'Ã³': 'ó',
          'Ãº': 'ú',
          'Ã±': 'ñ',
          'Ã': 'Á',
          'Ã‰': 'É',
          'Ã': 'Í',
          'Ã“': 'Ó',
          'Ãš': 'Ú',
          'Ã‘': 'Ñ',
          'â‚¬': '€',
          'Â·': '·',
          'â€¦': '…'
        };
        return Object.entries(replacements).reduce(
          (text, [broken, repaired]) => text.split(broken).join(repaired),
          String(raw == null ? '' : raw)
        );
      }

      function ensureViewerDefaults() {
        const state = ui.study;
        if (!ui.collections) {
          ui.collections = {
            active: 'default',
            items: [{ id: 'default', label: 'Mis rangos', source: ui.source }]
          };
        }
        if (!ui.collections.items || !ui.collections.items.length) {
          ui.collections.items = [{ id: 'default', label: 'Mis rangos', source: ui.source }];
        }
        const ids = new Set(ui.collections.items.map(item => item.id));
        const collection = ids.has(state.collection)
          ? state.collection
          : (ids.has(ui.collections.active)
              ? ui.collections.active
              : ui.collections.items[0].id);
        state.collection = collection;
        ui.collections.active = collection;
        if (!state.profile) state.profile = 'pool';
      }

      function reconcileSelection() {
        ensureViewerDefaults();
        RT.ViewerModel.reconcileContext(RT.Engine, ui.study, activeSource());
      }

      function activeSource() {
        ensureViewerDefaults();
        const collection = ui.collections.items.find(item => item.id === ui.collections.active);
        return collection && collection.source != null ? collection.source : ui.source;
      }

      function collectionOptions() {
        ensureViewerDefaults();
        return ui.collections.items.map(collection => ({
          id: collection.id,
          label: collection.label
        }));
      }

      function sanitizeCollectionName(raw) {
        return String(raw || '')
          .replace(/[^\p{L}\p{N}\s]/gu, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 32);
      }

      function personalCollectionOptions(form) {
        const list = Array.isArray(form.personalCollections) && form.personalCollections.length
          ? form.personalCollections
          : ['Colección 1', 'Colección 2'];
        return Array.from(new Set(
          list.map(item => sanitizeCollectionName(item)).filter(Boolean)
        ));
      }

      function collectionChoicesForForm(form) {
        return form.rangeType === 'Personal'
          ? personalCollectionOptions(form).concat('Nueva coleccion')
          : ['Personalizado', 'Estandar'];
      }

      function nextPersonalCollectionName(form) {
        const used = new Set(personalCollectionOptions(form));
        let index = 1;
        while (used.has(`Colección ${index}`)) index += 1;
        return `Colección ${index}`;
      }

      function iconButton(icon, title, onClick) {
        const node = el('button', 'viewer-icon-btn');
        node.type = 'button';
        node.title = title;
        node.setAttribute('aria-label', title);
        node.dataset.help = title;
        node.innerHTML = icon;
        node.addEventListener('click', onClick);
        return node;
      }

      const ICONS = {
        folder: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7.5h6l2 2h10v9.5H3z"/><path d="M3 7.5V5h6l2 2h8v2.5"/></svg>',
        camera: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h4l1.5-2h5L16 8h4v10H4z"/><circle cx="12" cy="13" r="3.5"/></svg>',
        eye: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z"/><circle cx="12" cy="12" r="2.5"/></svg>',
        eyeOff: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18"/><path d="M9.7 5.4A10 10 0 0 1 12 5c6 0 9.5 7 9.5 7a16 16 0 0 1-2.1 3.1M6.2 6.2C3.8 8 2.5 12 2.5 12s3.5 7 9.5 7a10 10 0 0 0 3-.5"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>',
        pencil: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 16.5V20h3.5L18 9.5 14.5 6z"/><path d="M13.5 7l3.5 3.5"/><path d="M12 20h8"/></svg>'
      };

      function openCollectionsModal() {
        const root = el('div', 'viewer-modal-stack');
        root.appendChild(hint(
          'Gestor preparado para colecciones. Por ahora la colección activa usa los rangos locales actuales.'
        ));
        const row = el('div', 'viewer-modal-actions');
        [
          'Crear', 'Renombrar', 'Duplicar', 'Importar',
          'Exportar', 'Eliminar', 'Marcar como default'
        ].forEach(label => row.appendChild(button(label, {
          disabled: true,
          help: `${label}: acción reservada para cuando exista persistencia real de colecciones.`
        })));
        root.appendChild(row);
        RT.Modal.open('Colecciones', root);
      }

      function exportRangeSnapshot() {
        const context = studyContext();
        const root = el('div', 'viewer-modal-stack');
        if (!context) {
          root.appendChild(hint('Completa Spot, Hero y Rival antes de exportar una imagen del rango.'));
          RT.Modal.open('Exportar imagen', root);
          return;
        }
        const analytics = rangeAnalytics(context);
        const collection = collectionOptions().find(item => item.id === ui.study.collection);
        const payload = RT.ViewerModel.buildExportPayload(context, {
          collection: collection ? collection.label : 'Mis rangos',
          spotLabel: (RT.Engine.getSpotDef(context.spot) || {}).label,
          profile: ui.study.profile || 'Pool',
          actions: ui.study.matrixFilters.selectedActions,
          combos: analytics.total,
          percentage: analytics.pct
        });
        root.appendChild(hint(
          'Exportación visual preparada. No hay capturador JPG/PNG real todavía, pero el botón ya queda ubicado y seguro.'
        ));
        [
          ['Título', payload.title],
          ['Colección', payload.collection],
          ['Spot', payload.spot],
          ['Hero', payload.hero || 'Todas'],
          ['Rival', payload.rival || 'Sin rival'],
          ['Perfil', payload.profile || 'Pool'],
          ['IP/OOP', payload.relative || 'Auto'],
          ['Acción visible',
            Array.from(ui.study.matrixFilters.selectedActions).join(' + ') || 'Todas'],
          ['Combos', analytics.total],
          ['Porcentaje', `${analytics.pct.toFixed(1)}%`]
        ].forEach(([label, value]) => root.appendChild(statLine(label, value)));
        RT.Modal.open('Exportar imagen', root);
      }

      function safeExportRangeSnapshot() {
        try {
          exportRangeSnapshot();
        } catch (error) {
          const root = el('div', 'viewer-modal-stack');
          root.appendChild(hint(
            'No se pudo preparar la exportación. La matriz y la sesión siguen intactas.'
          ));
          RT.Modal.open('Exportar imagen', root);
          console.error('Viewer export:', error);
        }
      }

      function openShortcutsModal() {
        const root = el('div', 'viewer-shortcuts-modal');
        [
          ['Ctrl/Cmd+K', 'Buscador'],
          ['H', 'Alternar progreso'],
          ['Esc', 'Cerrar modal']
        ].forEach(([key, label]) => {
          const row = el('div', 'shortcut-row');
          row.appendChild(el('kbd', 'shortcut-key', key));
          row.appendChild(el('span', 'shortcut-label', label));
          root.appendChild(row);
        });
        RT.Modal.open('Atajos de teclado', root);
      }

      function openCommandPalette() {
        const root = el('div', 'viewer-modal-stack');
        const input = el('input', 'viewer-command-input');
        input.type = 'search';
        input.placeholder = 'Buscar rangos, spots o comandos…';
        input.setAttribute('aria-label', input.placeholder);
        const results = el('div', 'viewer-command-results');

        function renderResults() {
          results.innerHTML = '';
          const query = input.value.trim().toLocaleLowerCase('es');
          if (!query) {
            results.appendChild(hint('Prueba “utg or”, “bb btn” o “vs 3bet co”.'));
            return;
          }
          const matches = RT.Engine.getContexts({ source: activeSource() })
            .filter(context => {
              const spot = RT.Engine.getSpotDef(context.spot);
              const haystack = [
                spot ? spot.label : context.spot,
                context.spot,
                context.hero,
                context.vs,
                context.relative
              ].filter(Boolean).join(' ').toLocaleLowerCase('es');
              return query.split(/\s+/).every(token => haystack.includes(token));
            })
            .slice(0, 8);
          if (!matches.length) {
            results.appendChild(hint('No hay rangos que coincidan con la búsqueda.'));
            return;
          }
          matches.forEach(context => results.appendChild(button(
            RT.Engine.describeContext(context),
            {
              variant: 'viewer-command-result',
              onClick: () => {
                ui.study.spot = context.spot;
                ui.study.hero = context.hero;
                ui.study.vs = context.vs;
                ui.study.relative = context.relative;
                reconcileSelection();
                RT.Modal.close();
                renderAll();
              }
            }
          )));
        }

        input.addEventListener('input', renderResults);
        root.appendChild(input);
        root.appendChild(results);
        renderResults();
        RT.Modal.open('Buscador', root);
        requestAnimationFrame(() => input.focus());
      }

      function contextOptions() {
        const state = ui.study;
        const source = activeSource();
        const spots = RT.Engine.availableSpots(source);
        const heroes = state.spot
          ? RT.Engine.availableHeroes({ source, spot: state.spot, relative: state.relative })
          : [];
        const opponents = state.spot && RT.Engine.spotNeedsVs(state.spot)
          ? RT.Engine.availableVs({
              source,
              spot: state.spot,
              hero: state.hero,
              relative: state.relative
            })
          : [];
        return { spots, heroes, opponents };
      }

      const RANGE_FORM_KEY = 'rt:viewer:range-form:v1';
      let rangeFormLoaded = false;
      let rangeFormErrors = [];
      let rangeFormNotice = '';
      let rangeFormDirty = false;
      let viewerSelectId = 0;
      let rangePanelScreen = 'main';
      let rangeAdvancedDirty = { sizes: false, frequencies: false };
      let sequenceSyncInProgress = false;
      let savedSpotPairs = [];

      function formStorage() {
        try { return window.localStorage || null; } catch (_) { return null; }
      }

      function ensureRangeForm() {
        const model = RT.RangeFormModel;
        if (!rangeFormLoaded) {
          rangeFormLoaded = true;
          let stored = null;
          const storage = formStorage();
          if (storage) {
            try { stored = JSON.parse(storage.getItem(RANGE_FORM_KEY) || 'null'); }
            catch (_) { stored = null; }
          }
          const storedForm = stored && stored.form ? stored.form : stored;
          const storedAdvanced = stored && stored.advancedConfig
            ? stored.advancedConfig : null;
          savedSpotPairs = stored && Array.isArray(stored.spotPairs)
            ? stored.spotPairs.filter(item => item && item.spot && item.subSpot)
            : [];
          if (storedForm && typeof storedForm === 'object') {
            storedForm.customSpotPairs = savedSpotPairs;
          }
          ui.study.rangeForm = model.normalize(
            ui.study.rangeForm || storedForm || model.defaults()
          );
          ui.study.preflopSequence = RT.PreflopSequenceModel.normalize(
            ui.study.preflopSequence || (stored && stored.preflopSequence),
            model.positions(ui.study.rangeForm.tableSize)
          );
          ui.study.rangeAdvancedDraft = RT.RangeAdvancedConfig.normalizeDraft(
            ui.study.rangeAdvancedDraft || storedAdvanced
          );
          const context = studyContext();
          if (context && !stored) {
            ui.study.rangeForm.hero = context.hero || ui.study.rangeForm.hero;
            ui.study.rangeForm.rival = context.vs || 'No aplica';
            ui.study.rangeForm.relation = context.relative || 'IP';
            const formSpot = model.formSpotForEngine(context.spot);
            if (formSpot) {
              ui.study.rangeForm.spot = formSpot;
              ui.study.rangeForm.subSpot = model.subSpots(formSpot)[0];
            }
            ui.study.rangeForm = model.normalize(ui.study.rangeForm);
          }
        }
        return ui.study.rangeForm;
      }

      function syncCompatibleContext(form) {
        const source = activeSource();
        const engineSpot = RT.RangeFormModel.engineSpotForForm(form.spot);
        const availableSpots = RT.Engine.availableSpots(source);
        if (engineSpot && availableSpots.includes(engineSpot)) {
          ui.study.spot = engineSpot;
        }
        if (RT.Engine.spotNeedsRelative(ui.study.spot) &&
            ['IP', 'OOP'].includes(form.relation)) {
          const relatives = RT.Engine.availableRelatives({
            source, spot: ui.study.spot
          });
          if (relatives.includes(form.relation)) ui.study.relative = form.relation;
        }
        const heroes = RT.Engine.availableHeroes({
          source, spot: ui.study.spot, relative: ui.study.relative
        });
        const engineHero = RT.RangeFormModel.enginePosition(form.hero);
        if (heroes.includes(engineHero)) ui.study.hero = engineHero;
        if (RT.Engine.spotNeedsVs(ui.study.spot)) {
          const opponents = RT.Engine.availableVs({
            source, spot: ui.study.spot, relative: ui.study.relative,
            hero: ui.study.hero
          });
          const engineRival = RT.RangeFormModel.enginePosition(form.rival);
          if (opponents.includes(engineRival)) ui.study.vs = engineRival;
        }
        reconcileSelection();
      }

      function updateRangeForm(key, value) {
        const current = ensureRangeForm();
        current[key] = value;
        markMiniReplayDirty();
        ui.study.rangeFormTouched = ui.study.rangeFormTouched || {};
        ui.study.rangeFormTouched[key] = true;
        ui.study.rangeForm = RT.RangeFormModel.normalize(current);
        rangeFormErrors = [];
        rangeFormNotice = '';
        rangeFormDirty = true;
        if (!sequenceSyncInProgress && (key === 'spot' || key === 'subSpot')) {
          ui.study.preflopSequence = RT.PreflopSequenceModel.empty(
            ui.study.preflopSequence && ui.study.preflopSequence.order
          );
        }
        if (key === 'tableSize') {
          ui.study.preflopSequence = RT.PreflopSequenceModel.normalize(
            ui.study.preflopSequence,
            RT.RangeFormModel.positions(ui.study.rangeForm.tableSize)
          );
        }
        syncCompatibleContext(ui.study.rangeForm);
        renderAll();
      }

      function spotOptions(form) {
        return Array.from(new Set(
          RT.RangeFormModel.spots(form.multiway).concat(
            savedSpotPairs.map(item => item.spot)
          )
        ));
      }

      function subSpotOptions(form) {
        return Array.from(new Set(
          RT.RangeFormModel.subSpots(form.spot).concat(
            savedSpotPairs
              .filter(item => item.spot === form.spot)
              .map(item => item.subSpot)
          )
        ));
      }

      function updateSequence(next) {
        const form = ensureRangeForm();
        const positions = RT.RangeFormModel.positions(form.tableSize);
        const previous = ui.study.preflopSequence;
        const normalized = RT.PreflopSequenceModel.normalize(next, positions);
        markMiniReplayDirty();
        ui.study.preflopSequence = normalized;
        const selectedRivals = RT.PreflopSequenceModel.selectedRivals(normalized);
        if (normalized.positions.hero) {
          form.hero = normalized.positions.hero;
          ui.study.rangeFormTouched = ui.study.rangeFormTouched || {};
          ui.study.rangeFormTouched.hero = true;
        }
        if (selectedRivals.length) {
          form.rival = normalized.positions.rival;
          ui.study.rangeFormTouched = ui.study.rangeFormTouched || {};
          ui.study.rangeFormTouched.rival = true;
        } else {
          form.rival = 'No aplica';
        }
        const inferredRelation = RT.RangeFormModel.inferRelation(
          normalized.positions.hero,
          normalized.positions.rival,
          form.tableSize
        );
        if (inferredRelation) form.relation = inferredRelation;
        else if (!normalized.positions.hero && !selectedRivals.length) {
          form.relation = 'Auto';
          form.spot = 'Unopened pot';
          form.subSpot = RT.RangeFormModel.subSpots(form.spot)[0];
        }
        const detected = RT.PreflopSequenceModel.detect(normalized);
        if (detected.spot && spotOptions(form).includes(detected.spot)) {
          sequenceSyncInProgress = true;
          form.spot = detected.spot;
          if (detected.complete &&
              RT.RangeFormModel.subSpots(detected.spot).includes(detected.subSpot)) {
            form.subSpot = detected.subSpot;
          } else {
            const valid = RT.RangeFormModel.subSpots(detected.spot);
            if (!valid.includes(form.subSpot)) form.subSpot = valid[0];
          }
          sequenceSyncInProgress = false;
        }
        ui.study.rangeForm = RT.RangeFormModel.normalize(form);
        syncCompatibleContext(ui.study.rangeForm);
        debugVisualizer('sequence:update', {
          previous,
          next: normalized,
          hero: normalized.positions.hero,
          rivals: selectedRivals,
          primaryRival: normalized.positions.rival,
          availablePositions: positions,
          disabledPositions: SEQUENCE_POSITION_SLOTS.filter(label =>
            !sequencePositionSlots(ui.study.rangeForm).some(slot =>
              slot.label === label && slot.enabled
            )
          ),
          detected
        });
        rangeFormDirty = true;
        rangeFormErrors = [];
        rangeFormNotice = '';
        renderAll();
      }

      function ensureAdvancedDraft() {
        ui.study.rangeAdvancedDraft = RT.RangeAdvancedConfig.normalizeDraft(
          ui.study.rangeAdvancedDraft
        );
        return ui.study.rangeAdvancedDraft;
      }

      function updateAdvancedDraft(type, next) {
        ui.study.rangeAdvancedDraft = RT.RangeAdvancedConfig.normalizeDraft(next);
        rangeAdvancedDirty[type] = true;
        rangeFormDirty = true;
      }

      function saveRangeForm() {
        const form = ensureRangeForm();
        rangeFormErrors = RT.RangeFormModel.validate(form);
        const advancedErrors = RT.RangeAdvancedConfig.validate(ensureAdvancedDraft());
        if (advancedErrors.length) {
          rangeFormNotice = advancedErrors[0].message;
          renderPanel();
          return;
        }
        if (rangeFormErrors.length) {
          rangeFormNotice = `Revisa ${rangeFormErrors.length} campo${
            rangeFormErrors.length === 1 ? '' : 's'} obligatorio${
            rangeFormErrors.length === 1 ? '' : 's'}.`;
          renderPanel();
          return;
        }
        const storage = formStorage();
        if (storage) {
          try {
            const nextSpotPairs = Array.from(new Map(
              savedSpotPairs.concat([{ spot: form.spot, subSpot: form.subSpot }])
                .map(item => [`${item.spot}\u0000${item.subSpot}`, item])
            ).values());
            form.customSpotPairs = nextSpotPairs;
            storage.setItem(RANGE_FORM_KEY, JSON.stringify({
              version: 3,
              form,
              advancedConfig: ensureAdvancedDraft(),
              preflopSequence: ui.study.preflopSequence,
              spotPairs: nextSpotPairs
            }));
            savedSpotPairs = nextSpotPairs;
            rangeFormNotice = 'Rango guardado como borrador local.';
            rangeFormDirty = false;
            rangeAdvancedDirty = { sizes: false, frequencies: false };
          } catch (_) {
            rangeFormNotice = 'El navegador no permite guardar este borrador.';
          }
        } else {
          rangeFormNotice = 'Borrador válido; persistencia no disponible.';
        }
        renderPanel();
      }

      const SECTION_ICONS = {
        identity: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="14" rx="2"/><circle cx="9" cy="11" r="2"/><path d="M13 10h4M13 14h4M7 16h4"/></svg>',
        game: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h10l3 5v7a2 2 0 0 1-3 1l-2-2H9l-2 2a2 2 0 0 1-3-1v-7z"/><path d="M8 10v4M6 12h4M16 11h.01M18 13h.01"/></svg>',
        table: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="14" rx="2"/><path d="M4 11h16M10 5v14"/></svg>',
        context: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M5 12h14M5 17h14"/><circle cx="9" cy="7" r="2"/><circle cx="15" cy="12" r="2"/><circle cx="11" cy="17" r="2"/></svg>',
        tournament: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4h8v5a4 4 0 0 1-8 0zM9 20h6M12 13v7"/><path d="M8 6H5v2a3 3 0 0 0 3 3M16 6h3v2a3 3 0 0 1-3 3"/></svg>',
        rival: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3"/><path d="M6 20a6 6 0 0 1 12 0"/><circle cx="18" cy="7" r="3"/></svg>',
        spot: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>',
        action: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 2 5 14h6l-1 8 9-13h-6z"/></svg>'
      };

      function completion(keys, form = ensureRangeForm()) {
        const done = keys.filter(key => {
          if (typeof key === 'function') return key(form);
          return String(form[key] == null ? '' : form[key]).trim() !== '';
        }).length;
        return { done, total: keys.length };
      }

      function formSection(title, icon, progress) {
        const section = el('section', 'viewer-form-section');
        section.dataset.section = title;
        const grid = el('div', 'viewer-form-grid');
        section.appendChild(grid);
        return { section, grid };
      }

      function formDivider() {
        return el('div', 'viewer-form-divider span-12');
      }

      function collectionField(label, key, config = {}) {
        const form = ensureRangeForm();
        ui.study.rangeFormTouched = ui.study.rangeFormTouched || {};
        const wrap = el('div', `viewer-form-field${config.span ? ` ${config.span}` : ''}`);
        if (rangeFormErrors.some(error => error.key === key)) wrap.classList.add('is-invalid');
        if (!config.hideLabel) wrap.appendChild(el('span', 'viewer-form-label', label));

        const shell = el('div', 'viewer-form-select viewer-form-collection-select');
        const trigger = el('button', 'viewer-form-select-trigger');
        trigger.type = 'button';
        trigger.setAttribute('aria-haspopup', 'listbox');
        trigger.setAttribute('aria-expanded', 'false');
        trigger.setAttribute('aria-label', `Abrir ${label}`);

        const copy = el('span', 'viewer-form-select-copy');
        const showInsideLabel = !!config.insideLabel && !ui.study.rangeFormTouched[key];
        copy.appendChild(el(
          'span',
          showInsideLabel ? 'viewer-form-select-placeholder' : 'viewer-form-select-value',
          showInsideLabel ? config.insideLabel : displayText(form[key])
        ));
        trigger.appendChild(copy);
        trigger.appendChild(el('span', 'viewer-form-select-chevron', ''));

        const menu = el('div', 'viewer-form-select-menu viewer-form-collection-menu');
        menu.hidden = true;
        menu.setAttribute('role', 'listbox');
        menu.setAttribute('aria-label', `Opciones de ${label}`);

        const native = el('select', 'viewer-form-control viewer-form-native-select');
        native.disabled = false;

        const closeMenu = () => {
          shell.classList.remove('is-open');
          menu.hidden = true;
          trigger.setAttribute('aria-expanded', 'false');
        };
        const openMenu = () => {
          if (typeof document.querySelectorAll === 'function') {
            document.querySelectorAll('.viewer-form-select.is-open').forEach(node => {
              if (node !== shell) {
                node.classList.remove('is-open');
                const otherMenu = node.querySelector('.viewer-form-select-menu');
                const otherTrigger = node.querySelector('.viewer-form-select-trigger');
                if (otherMenu) otherMenu.hidden = true;
                if (otherTrigger) otherTrigger.setAttribute('aria-expanded', 'false');
              }
            });
          }
          shell.classList.add('is-open');
          menu.hidden = false;
          trigger.setAttribute('aria-expanded', 'true');
        };

        const saveCollections = nextCollections => {
          form.personalCollections = nextCollections;
          ui.study.rangeFormTouched[key] = true;
          rangeFormDirty = true;
          ui.study.rangeForm = RT.RangeFormModel.normalize(form);
          rangeFormNotice = '';
          rangeFormErrors = [];
          renderAll();
        };

        const startRename = (row, currentLabel, index) => {
          row.innerHTML = '';
          const editor = el('div', 'viewer-form-collection-inline-edit');
          const input = el('input', 'viewer-form-control');
          input.type = 'text';
          input.value = currentLabel;
          input.maxLength = 32;
          input.placeholder = 'Nombre de colección';
          const saveButton = el('button', 'viewer-form-collection-inline-save', 'OK');
          saveButton.type = 'button';
          const finish = () => {
            const cleaned = sanitizeCollectionName(input.value);
            if (!cleaned) {
              rangeFormNotice = 'Usa letras, números y espacios para el nombre.';
              renderAll();
              return;
            }
            const next = personalCollectionOptions(form).slice();
            const duplicate = next.some((item, itemIndex) => itemIndex !== index && item === cleaned);
            if (duplicate) {
              rangeFormNotice = 'Ese nombre de colección ya existe.';
              renderAll();
              return;
            }
            const previous = next[index];
            next[index] = cleaned;
            form[key] = form[key] === previous ? cleaned : form[key];
            saveCollections(next);
          };
          input.addEventListener('keydown', event => {
            if (event.key === 'Enter') {
              event.preventDefault();
              finish();
            }
            if (event.key === 'Escape') {
              event.preventDefault();
              renderAll();
            }
          });
          saveButton.addEventListener('click', finish);
          editor.appendChild(input);
          editor.appendChild(saveButton);
          row.appendChild(editor);
          setTimeout(() => {
            if (typeof input.focus === 'function') input.focus();
            if (typeof input.select === 'function') input.select();
          }, 0);
        };

        const choiceRows = () => {
          native.innerHTML = '';
          menu.innerHTML = '';
          const choices = collectionChoicesForForm(form);
          choices.forEach((value, index) => {
            const optionNode = el('option', '', displayText(value));
            optionNode.value = value;
            optionNode.selected = String(form[key]) === String(value);
            native.appendChild(optionNode);

            if (form.rangeType === 'Personal') {
              const row = el(
                'div',
                `viewer-form-collection-option-row${optionNode.selected ? ' is-selected' : ''}`
              );
              const choiceButton = el(
                'button',
                `viewer-form-select-option${optionNode.selected ? ' is-selected' : ''}`,
                displayText(value)
              );
              choiceButton.type = 'button';
              choiceButton.setAttribute('role', 'option');
              choiceButton.setAttribute('aria-selected', String(optionNode.selected));
              choiceButton.addEventListener('click', event => {
                event.preventDefault();
                if (value === 'Nueva coleccion') {
                  const nextName = nextPersonalCollectionName(form);
                  const next = personalCollectionOptions(form).concat(nextName);
                  form[key] = nextName;
                  saveCollections(next);
                  return;
                }
                closeMenu();
                updateRangeForm(key, value);
              });
              row.appendChild(choiceButton);
              if (value !== 'Nueva coleccion') {
                const editButton = el('button', 'viewer-form-collection-edit', '');
                editButton.type = 'button';
                editButton.title = `Renombrar ${value}`;
                editButton.setAttribute('aria-label', `Renombrar ${value}`);
                editButton.innerHTML = ICONS.pencil;
                editButton.addEventListener('click', event => {
                  event.preventDefault();
                  event.stopPropagation();
                  startRename(row, value, index);
                });
                row.appendChild(editButton);
              }
              menu.appendChild(row);
              return;
            }

            const customOption = el(
              'button',
              `viewer-form-select-option${optionNode.selected ? ' is-selected' : ''}`,
              displayText(value)
            );
            customOption.type = 'button';
            customOption.setAttribute('role', 'option');
            customOption.setAttribute('aria-selected', String(optionNode.selected));
            customOption.addEventListener('click', event => {
              event.preventDefault();
              closeMenu();
              updateRangeForm(key, value);
            });
            menu.appendChild(customOption);
          });
        };

        choiceRows();
        trigger.addEventListener('click', event => {
          if (event && typeof event.preventDefault === 'function') event.preventDefault();
          if (menu.hidden) openMenu();
          else closeMenu();
        });
        trigger.addEventListener('keydown', event => {
          if (event.key === 'Escape') closeMenu();
          if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openMenu();
            const selected = menu.querySelector('.is-selected .viewer-form-select-option, .viewer-form-select-option.is-selected');
            const first = menu.querySelector('.viewer-form-select-option');
            if (selected || first) (selected || first).focus();
          }
        });
        wrap.addEventListener('focusout', event => {
          if (typeof wrap.contains === 'function' && !wrap.contains(event.relatedTarget)) closeMenu();
        });

        shell.appendChild(trigger);
        shell.appendChild(menu);
        shell.appendChild(native);
        wrap.appendChild(shell);
        return wrap;
      }

      function formField(label, key, values, config = {}) {
        const form = ensureRangeForm();
        ui.study.rangeFormTouched = ui.study.rangeFormTouched || {};
        const wrap = el('div', `viewer-form-field${config.span ? ` ${config.span}` : ''}`);
        if (rangeFormErrors.some(error => error.key === key)) wrap.classList.add('is-invalid');
        if (config.disabled) wrap.classList.add('is-disabled');
        if (config.disabledReason) wrap.title = config.disabledReason;
        if (!config.hideLabel) wrap.appendChild(el('span', 'viewer-form-label', label));
        const optionLabel = value => typeof config.optionLabel === 'function'
          ? config.optionLabel(value, form)
          : displayText(value);
        const currentValue = () => {
          const raw = typeof config.displayValue === 'function'
            ? config.displayValue(form[key], form)
            : optionLabel(form[key]);
          return String(raw || '');
        };
        let control;
        let controlHost = null;
        if (config.input) {
          control = el('input', 'viewer-form-control');
          control.type = 'text';
          control.value = form[key] || '';
          control.placeholder = config.placeholder || '';
          control.addEventListener('input', () => {
            form[key] = control.value;
            rangeFormErrors = rangeFormErrors.filter(error => error.key !== key);
            rangeFormDirty = true;
          });
          control.addEventListener('change', () => updateRangeForm(key, control.value.trim()));
        } else {
          control = el('select', 'viewer-form-control viewer-form-native-select');
          const selectId = `viewer-select-${++viewerSelectId}`;
          const shell = el('div', 'viewer-form-select');
          const trigger = el('button', 'viewer-form-select-trigger');
          trigger.type = 'button';
          trigger.disabled = !!config.disabled;
          trigger.setAttribute('aria-haspopup', 'listbox');
          trigger.setAttribute('aria-expanded', 'false');
          trigger.setAttribute('aria-controls', selectId);
          trigger.setAttribute('aria-label', `Abrir ${label}`);
          const copy = el('span', 'viewer-form-select-copy');
          const showInsideLabel = !!config.insideLabel && !ui.study.rangeFormTouched[key];
          copy.appendChild(el(
            'span',
            showInsideLabel ? 'viewer-form-select-placeholder' : 'viewer-form-select-value',
            showInsideLabel ? config.insideLabel : currentValue()
          ));
          trigger.appendChild(copy);
          trigger.appendChild(el('span', 'viewer-form-select-chevron', ''));
          const menu = el('div', 'viewer-form-select-menu');
          menu.id = selectId;
          menu.hidden = true;
          menu.setAttribute('role', 'listbox');
          menu.setAttribute('aria-label', `Opciones de ${label}`);
          const closeMenu = () => {
            shell.classList.remove('is-open');
            menu.hidden = true;
            trigger.setAttribute('aria-expanded', 'false');
          };
          const openMenu = () => {
            if (config.disabled) return;
            if (typeof document.querySelectorAll === 'function') {
              document.querySelectorAll('.viewer-form-select.is-open').forEach(node => {
                if (node !== shell) {
                  node.classList.remove('is-open');
                  const otherMenu = node.querySelector('.viewer-form-select-menu');
                  const otherTrigger = node.querySelector('.viewer-form-select-trigger');
                  if (otherMenu) otherMenu.hidden = true;
                  if (otherTrigger) otherTrigger.setAttribute('aria-expanded', 'false');
                }
              });
            }
            shell.classList.add('is-open');
            menu.hidden = false;
            trigger.setAttribute('aria-expanded', 'true');
          };
          (values || []).forEach(value => {
            const optionText = optionLabel(value);
            const optionNode = el('option', '', optionText);
            optionNode.value = value;
            optionNode.selected = String(form[key]) === String(value);
            control.appendChild(optionNode);
            const customOption = el(
              'button',
              `viewer-form-select-option${optionNode.selected ? ' is-selected' : ''}`,
              optionText
            );
            customOption.type = 'button';
            customOption.setAttribute('role', 'option');
            customOption.setAttribute('aria-selected', String(optionNode.selected));
            customOption.addEventListener('click', event => {
              if (event && typeof event.preventDefault === 'function') event.preventDefault();
              closeMenu();
              updateRangeForm(key, value);
            });
            menu.appendChild(customOption);
          });
          control.addEventListener('change', () => updateRangeForm(key, control.value));
          trigger.addEventListener('click', event => {
            if (event && typeof event.preventDefault === 'function') event.preventDefault();
            if (menu.hidden) openMenu();
            else closeMenu();
          });
          trigger.addEventListener('keydown', event => {
            if (event.key === 'Escape') closeMenu();
            if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              openMenu();
              const selected = menu.querySelector('.is-selected');
              const first = menu.querySelector('.viewer-form-select-option');
              if (selected || first) (selected || first).focus();
            }
          });
          wrap.addEventListener('focusout', event => {
            if (typeof wrap.contains === 'function' && !wrap.contains(event.relatedTarget)) closeMenu();
          });
          shell.appendChild(trigger);
          shell.appendChild(menu);
          shell.appendChild(control);
          controlHost = shell;
        }
        control.disabled = !!config.disabled;
        control.title = config.disabled && config.disabledReason
          ? config.disabledReason
          : String(form[key] || '');
        control.setAttribute('aria-label', label);
        control.setAttribute('aria-disabled', String(!!config.disabled));
        wrap.appendChild(controlHost || control);
        return wrap;
      }

      function forcedBetChoiceField(label, value, values, onChange, config = {}) {
        const wrap = el(
          'div',
          `viewer-form-field forced-bet-field${config.span ? ` ${config.span}` : ''}`
        );
        if (config.disabled) wrap.classList.add('is-disabled');
        const shell = el('div', 'viewer-form-select');
        if (config.unitToggle) shell.classList.add('forced-bet-select-with-unit');
        const trigger = el('button', 'viewer-form-select-trigger');
        trigger.type = 'button';
        trigger.disabled = !!config.disabled;
        trigger.setAttribute('aria-haspopup', 'listbox');
        trigger.setAttribute('aria-expanded', 'false');
        trigger.setAttribute('aria-label', `Abrir ${label}`);
        const copy = el('span', 'viewer-form-select-copy');
        if (!config.hideInsideLabel) {
          copy.appendChild(el('span', 'forced-bet-field-label', label));
        }
        copy.appendChild(el(
          'span',
          config.placeholder && value === '—'
            ? 'viewer-form-select-placeholder'
            : 'viewer-form-select-value',
          value || config.placeholder || '—'
        ));
        trigger.appendChild(copy);
        trigger.appendChild(el('span', 'viewer-form-select-chevron', ''));
        const menu = el('div', 'viewer-form-select-menu');
        menu.hidden = true;
        menu.setAttribute('role', 'listbox');
        menu.setAttribute('aria-label', `Opciones de ${label}`);
        const close = () => {
          shell.classList.remove('is-open');
          menu.hidden = true;
          trigger.setAttribute('aria-expanded', 'false');
        };
        (values || []).forEach(option => {
          const optionValue = typeof option === 'object' ? option.value : option;
          const optionLabel = typeof option === 'object' ? option.label : option;
          const selected = String(optionValue) === String(config.selectedValue || value);
          const item = el(
            'button',
            `viewer-form-select-option${selected ? ' is-selected' : ''}`,
            optionLabel
          );
          item.type = 'button';
          item.setAttribute('role', 'option');
          item.setAttribute('aria-selected', String(selected));
          item.addEventListener('click', event => {
            event.preventDefault();
            close();
            onChange(optionValue);
          });
          menu.appendChild(item);
        });
        trigger.addEventListener('click', event => {
          event.preventDefault();
          if (config.disabled) return;
          menu.hidden = !menu.hidden;
          shell.classList.toggle('is-open', !menu.hidden);
          trigger.setAttribute('aria-expanded', String(!menu.hidden));
        });
        trigger.addEventListener('keydown', event => {
          if (event.key === 'Escape') close();
        });
        wrap.addEventListener('focusout', event => {
          if (typeof wrap.contains === 'function' && !wrap.contains(event.relatedTarget)) close();
        });
        if (config.unitToggle) {
          const unitButton = el(
            'button',
            'forced-bet-unit-toggle',
            config.unitToggle.label
          );
          unitButton.type = 'button';
          unitButton.title = config.unitToggle.title || 'Cambiar unidad';
          unitButton.setAttribute('aria-label', unitButton.title);
          unitButton.addEventListener('click', event => {
            event.preventDefault();
            event.stopPropagation();
            config.unitToggle.onClick();
          });
          shell.appendChild(unitButton);
        }
        shell.appendChild(trigger);
        shell.appendChild(menu);
        wrap.appendChild(shell);
        return wrap;
      }

      function updateForcedBetMode(mode) {
        const current = ensureRangeForm();
        current.forcedBetMode = mode;
        ui.study.rangeFormTouched = ui.study.rangeFormTouched || {};
        ui.study.rangeFormTouched.forcedBetMode = true;
        ui.study.rangeForm = RT.RangeFormModel.normalize(current);
        ui.study.forcedBetModalOpen = mode === 'ante_straddle';
        rangeFormErrors = [];
        rangeFormNotice = '';
        rangeFormDirty = true;
        renderAll();
      }

      function setForcedBetSelections(next = {}) {
        const current = ensureRangeForm();
        const anteEnabled = !!next.ante;
        const straddleEnabled = !!next.straddle;
        current.forcedBetMode = anteEnabled && straddleEnabled
          ? 'ante_straddle'
          : anteEnabled
            ? 'ante'
            : straddleEnabled
              ? 'straddle'
              : 'none';
        ui.study.rangeFormTouched = ui.study.rangeFormTouched || {};
        ui.study.rangeFormTouched.forcedBetMode = true;
        ui.study.rangeForm = RT.RangeFormModel.normalize(current);
        rangeFormErrors = [];
        rangeFormNotice = '';
        rangeFormDirty = true;
        renderAll();
      }

      function updateForcedBetConfig(group, key, value) {
        const current = ensureRangeForm();
        current[group] = Object.assign({}, current[group], { [key]: value });
        ui.study.rangeForm = RT.RangeFormModel.normalize(current);
        ui.study.forcedBetModalOpen = true;
        rangeFormErrors = [];
        rangeFormNotice = '';
        rangeFormDirty = true;
        renderAll();
      }

      function updateForcedBetTypeSelection(group, value) {
        const isAnte = group === 'anteConfig';
        const current = ensureRangeForm();
        if (value === 'none') {
          setForcedBetSelections({
            ante: isAnte ? false : current.forcedBetMode === 'ante' || current.forcedBetMode === 'ante_straddle',
            straddle: isAnte ? current.forcedBetMode === 'straddle' || current.forcedBetMode === 'ante_straddle' : false
          });
          ui.study.forcedBetModalOpen = true;
          return;
        }
        current[group] = Object.assign({}, current[group], { type: value });
        current.forcedBetMode = isAnte
          ? (current.forcedBetMode === 'straddle' || current.forcedBetMode === 'ante_straddle'
            ? 'ante_straddle'
            : 'ante')
          : (current.forcedBetMode === 'ante' || current.forcedBetMode === 'ante_straddle'
            ? 'ante_straddle'
            : 'straddle');
        ui.study.rangeForm = RT.RangeFormModel.normalize(current);
        ui.study.forcedBetModalOpen = true;
        rangeFormErrors = [];
        rangeFormNotice = '';
        rangeFormDirty = true;
        renderAll();
      }

      function forcedBetAmountOptions(values, unit) {
        return values.map(value => ({
          value,
          label: RT.RangeFormModel.forcedBetAmountValue(value, unit)
        }));
      }

      function forcedBetUnitToggle(group, unit) {
        const isAnte = group === 'anteConfig';
        const nextUnit = isAnte
          ? (unit === 'bb' ? 'percent' : 'bb')
          : (unit === 'bb' ? 'multiplier' : 'bb');
        return {
          label: unit === 'bb' ? 'BB' : (isAnte ? '%' : '×'),
          title: isAnte
            ? 'Alternar cantidad entre ciegas y porcentaje'
            : 'Alternar cantidad entre ciegas y multiplicador',
          onClick: () => {
            const current = ensureRangeForm();
            current[group] = Object.assign({}, current[group], { unit: nextUnit });
            ui.study.rangeForm = RT.RangeFormModel.normalize(current);
            rangeFormDirty = true;
            renderAll();
          }
        };
      }

      function renderForcedBetFields(context) {
        const model = RT.RangeFormModel;
        const form = ensureRangeForm();
        const tournamentEnabled = model.isTournament(form.game);
        const summary = form.forcedBetMode === 'none'
          ? 'Configurar'
          : model.forcedBetTypeLabel(form);
        const summaryField = forcedBetChoiceField(
          'ANTE / STRAD',
          summary,
          [],
          () => {},
          {
            span: 'span-4',
            selectedValue: form.forcedBetMode,
            placeholder: 'Configurar'
          }
        );
        summaryField.classList.add('forced-bet-summary-field', 'viewer-form-row-break');
        const trigger = summaryField.querySelector('.viewer-form-select-trigger');
        if (trigger) {
          trigger.classList.add('forced-bet-summary-trigger');
          trigger.addEventListener('click', event => {
            event.preventDefault();
            ui.study.forcedBetModalOpen = true;
            renderAll();
          });
        }
        context.grid.appendChild(summaryField);
        const phaseField = formField(
          'FASE', 'phase',
          tournamentEnabled ? model.phases(form.game) : ['General'],
          {
            disabled: !tournamentEnabled,
            disabledReason: 'Disponible en MTT, SNG o Spins.',
            span: 'span-4',
            hideLabel: true,
            insideLabel: 'PHASE'
          }
        );
        phaseField.classList.add('viewer-form-row-break');
        context.grid.appendChild(phaseField);
        const prizeField = formField(
          'PREMIO', 'prize',
          tournamentEnabled ? model.prizes(form.game) : ['General'],
          {
            disabled: !tournamentEnabled,
            disabledReason: 'No aplica para Cash.',
            span: 'span-4',
            hideLabel: true,
            insideLabel: 'PRIZE'
          }
        );
        prizeField.classList.add('viewer-form-row-break');
        context.grid.appendChild(prizeField);
      }

      function renderForcedBetModal(panel) {
        if (!ui.study.forcedBetModalOpen) return;
        const model = RT.RangeFormModel;
        const form = ensureRangeForm();
        const overlay = el('div', 'forced-bet-modal-overlay');
        const modal = el('section', 'forced-bet-modal');
        const anchor = panel.querySelector('.forced-bet-summary-field')
          || panel.querySelector('.viewer-form-section[data-section="IDENTIDAD"]');
        if (anchor) {
          overlay.style.setProperty('--forced-bet-modal-top', `${anchor.offsetTop}px`);
        }
        panel.classList.add('has-forced-bet-modal');
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-label', 'Configurar ante y straddle');
        const close = () => {
          ui.study.forcedBetModalOpen = false;
          if (ui.study.forcedBetModalKeyHandler) {
            document.removeEventListener('keydown', ui.study.forcedBetModalKeyHandler);
            ui.study.forcedBetModalKeyHandler = null;
          }
          panel.classList.remove('has-forced-bet-modal');
          renderAll();
        };
        const onKeydown = event => {
          if (event.key === 'Escape') close();
        };
        const head = el('header', 'forced-bet-modal-head');
        head.appendChild(el('strong', 'forced-bet-modal-title', 'ANTE / STRADDLE'));
        const closeButton = el('button', 'forced-bet-modal-close', '×');
        closeButton.type = 'button';
        closeButton.setAttribute('aria-label', 'Cerrar configuración');
        closeButton.addEventListener('click', close);
        head.appendChild(closeButton);
        modal.appendChild(head);

        const bodyGrid = el('div', 'viewer-form-grid forced-bet-modal-grid');
        const anteEnabled = form.forcedBetMode === 'ante' || form.forcedBetMode === 'ante_straddle';
        const straddleEnabled = form.forcedBetMode === 'straddle' || form.forcedBetMode === 'ante_straddle';

        bodyGrid.appendChild(forcedBetChoiceField(
          'ANTE',
          anteEnabled ? form.anteConfig.type : 'Off',
          [{ value: 'none', label: 'Off' }].concat(
            model.CATALOG.forcedAnteTypes.map(value => ({ value, label: value }))
          ),
          value => updateForcedBetTypeSelection('anteConfig', value),
          {
            span: 'span-6',
            selectedValue: anteEnabled ? form.anteConfig.type : 'none'
          }
        ));
        bodyGrid.appendChild(forcedBetChoiceField(
          'AMOUNT',
          anteEnabled
            ? model.forcedBetAmountValue(form.anteConfig.amount, form.anteConfig.unit)
            : '—',
          forcedBetAmountOptions(
            model.CATALOG.forcedAnteAmounts,
            form.anteConfig.unit
          ),
          value => updateForcedBetConfig('anteConfig', 'amount', value),
          {
            span: 'span-6',
            selectedValue: form.anteConfig.amount,
            disabled: !anteEnabled,
            hideInsideLabel: false,
            unitToggle: anteEnabled
              ? forcedBetUnitToggle('anteConfig', form.anteConfig.unit)
              : null
          }
        ));

        bodyGrid.appendChild(forcedBetChoiceField(
          'STRADDLE',
          straddleEnabled ? form.straddleConfig.type : 'Off',
          [{ value: 'none', label: 'Off' }].concat(
            model.CATALOG.forcedStraddleTypes.map(value => ({ value, label: value }))
          ),
          value => updateForcedBetTypeSelection('straddleConfig', value),
          {
            span: 'span-6',
            selectedValue: straddleEnabled ? form.straddleConfig.type : 'none'
          }
        ));
        bodyGrid.appendChild(forcedBetChoiceField(
          'AMOUNT',
          straddleEnabled
            ? model.forcedBetAmountValue(
              form.straddleConfig.amount,
              form.straddleConfig.unit
            )
            : '—',
          forcedBetAmountOptions(
            model.CATALOG.forcedStraddleAmounts,
            form.straddleConfig.unit
          ),
          value => updateForcedBetConfig('straddleConfig', 'amount', value),
          {
            span: 'span-6',
            selectedValue: form.straddleConfig.amount,
            disabled: !straddleEnabled,
            hideInsideLabel: false,
            unitToggle: straddleEnabled
              ? forcedBetUnitToggle('straddleConfig', form.straddleConfig.unit)
              : null
          }
        ));
        modal.appendChild(bodyGrid);

        const footer = el('footer', 'forced-bet-modal-footer');
        const done = el('button', 'forced-bet-modal-done', 'ACEPTAR');
        done.type = 'button';
        done.addEventListener('click', close);
        footer.appendChild(done);
        modal.appendChild(footer);
        overlay.addEventListener('mousedown', event => {
          if (event.target === overlay) close();
        });
        if (ui.study.forcedBetModalKeyHandler) {
          document.removeEventListener('keydown', ui.study.forcedBetModalKeyHandler);
        }
        ui.study.forcedBetModalKeyHandler = onKeydown;
        document.addEventListener('keydown', ui.study.forcedBetModalKeyHandler);
        overlay.appendChild(modal);
        panel.appendChild(overlay);
      }

      function segmentedField(label, key, options, config = {}) {
        const form = ensureRangeForm();
        const wrap = el(
          'div',
          `viewer-form-field viewer-segment-field${config.span ? ` ${config.span}` : ''}`
        );
        if (config.disabled) wrap.classList.add('is-disabled');
        if (config.disabledReason) wrap.title = config.disabledReason;
        if (!config.hideLabel) wrap.appendChild(el('span', 'viewer-form-label', label));
        const control = el('div', 'viewer-segmented');
        control.setAttribute('role', 'radiogroup');
        control.setAttribute('aria-label', label);
        control.setAttribute('aria-disabled', String(!!config.disabled));
        if (config.title) control.title = config.title;
        options.forEach(option => {
          const active = String(form[key]) === String(option.value);
          const item = button(option.label, {
            active,
            disabled: !!config.disabled,
            variant: 'viewer-segment-option',
            onClick: () => updateRangeForm(key, option.value)
          });
          item.setAttribute('aria-pressed', String(active));
          item.setAttribute('role', 'radio');
          item.setAttribute('aria-checked', String(active));
          item.title = config.disabled && config.disabledReason
            ? config.disabledReason
            : option.label;
          control.appendChild(item);
        });
        wrap.appendChild(control);
        return wrap;
      }

      function booleanField(label, key, config = {}) {
        const form = ensureRangeForm();
        const wrap = el(
          'div',
          `viewer-form-field viewer-bool-field${config.span ? ` ${config.span}` : ''}`
        );
        if (config.disabled) wrap.classList.add('is-disabled');
        if (config.disabledReason) wrap.title = config.disabledReason;
        const active = !!form[key];
        const control = button('', {
          active,
          disabled: !!config.disabled,
          variant: `viewer-form-bool-toggle${active ? ' is-active' : ''}`,
          onClick: () => updateRangeForm(key, !active)
        });
        control.setAttribute('aria-pressed', String(active));
        control.setAttribute('aria-label', label);
        control.setAttribute('aria-disabled', String(!!config.disabled));
        const copy = el('span', 'viewer-form-bool-copy');
        copy.appendChild(el('span', 'viewer-form-bool-label', label));
        copy.appendChild(el('span', 'viewer-form-bool-state', active ? 'ON' : 'OFF'));
        control.appendChild(copy);
        wrap.appendChild(control);
        return wrap;
      }

      function advancedBreadcrumb() {
        const form = ensureRangeForm();
        return [
          form.game || 'Sin game',
          form.stake || 'Sin stake',
          form.tableSize || 'Sin mesa',
          form.hero || 'Sin hero',
          form.spot || 'Sin spot',
          form.stack || 'Sin stack'
        ].map(displayText).join(' · ');
      }

      function canonicalAction(actionId) {
        const id = String(actionId || '').toUpperCase();
        if (id.includes('FOLD')) return 'FOLD';
        if (id.includes('CHECK')) return 'CHECK';
        if (id.includes('CALL')) return 'CALL';
        if (id === 'OR') return 'OR';
        if (id.includes('3BET')) return '3BET';
        if (id.includes('4BET')) return '4BET';
        if (id.includes('5BET')) return '5BETPLUS';
        if (id.includes('ALLIN') || id.includes('SHOVE')) return 'ALLIN';
        if (id.includes('SQUEEZE')) return 'SQUEEZE';
        if (id.includes('REJAM')) return 'REJAM';
        if (id.includes('ROL')) return 'ROL';
        if (id.includes('ISO')) return 'ISO';
        if (id.includes('LIMP')) return 'LIMP';
        return id;
      }

      function activeAdvancedActions() {
        const context = studyContext();
        if (!context) return new Set();
        return new Set(
          RT.Engine.availableActions(context).map(canonicalAction)
        );
      }

      function advancedInput(label, value, config, onCommit) {
        const field = el('label', 'viewer-advanced-field');
        field.appendChild(el('span', 'viewer-advanced-label', label));
        const input = el('input', 'viewer-advanced-input');
        input.type = config.type || 'text';
        input.inputMode = config.inputMode || (input.type === 'number' ? 'decimal' : 'text');
        input.value = value == null ? '' : String(value);
        input.placeholder = config.placeholder || '';
        input.disabled = !!config.disabled;
        if (config.min != null) input.min = String(config.min);
        if (config.max != null) input.max = String(config.max);
        if (config.step != null) input.step = String(config.step);
        input.addEventListener('change', () => onCommit(input.value));
        field.appendChild(input);
        return field;
      }

      function advancedChoice(label, value, options, disabled, onChange) {
        const field = el('div', 'viewer-advanced-field');
        field.appendChild(el('span', 'viewer-advanced-label', label));
        const shell = el('div', 'viewer-form-select viewer-advanced-choice');
        const trigger = el('button', 'viewer-form-select-trigger');
        trigger.type = 'button';
        trigger.disabled = !!disabled;
        trigger.setAttribute('aria-haspopup', 'listbox');
        trigger.setAttribute('aria-expanded', 'false');
        trigger.setAttribute('aria-label', `Abrir ${label}`);
        const current = options.find(option => String(option.value) === String(value));
        trigger.appendChild(el(
          'span', 'viewer-form-select-value', current ? current.label : options[0].label
        ));
        trigger.appendChild(el('span', 'viewer-form-select-chevron', ''));
        const menu = el('div', 'viewer-form-select-menu');
        menu.hidden = true;
        menu.setAttribute('role', 'listbox');
        menu.setAttribute('aria-label', `Opciones de ${label}`);
        const close = () => {
          shell.classList.remove('is-open');
          menu.hidden = true;
          trigger.setAttribute('aria-expanded', 'false');
        };
        options.forEach(option => {
          const selected = String(option.value) === String(value);
          const item = el(
            'button',
            `viewer-form-select-option${selected ? ' is-selected' : ''}`,
            option.label
          );
          item.type = 'button';
          item.setAttribute('role', 'option');
          item.setAttribute('aria-selected', String(selected));
          item.addEventListener('click', () => {
            close();
            onChange(option.value);
          });
          menu.appendChild(item);
        });
        trigger.addEventListener('click', () => {
          if (disabled) return;
          menu.hidden = !menu.hidden;
          shell.classList.toggle('is-open', !menu.hidden);
          trigger.setAttribute('aria-expanded', String(!menu.hidden));
        });
        trigger.addEventListener('keydown', event => {
          if (event.key === 'Escape') close();
        });
        shell.appendChild(trigger);
        shell.appendChild(menu);
        field.appendChild(shell);
        return field;
      }

      function advancedHeader(title) {
        const head = el('header', 'viewer-advanced-head');
        const back = button('← VOLVER', {
          variant: 'viewer-advanced-back',
          onClick: () => {
            rangePanelScreen = 'main';
            renderPanel();
          }
        });
        head.appendChild(back);
        const copy = el('div', 'viewer-advanced-head-copy');
        copy.appendChild(el('strong', 'viewer-advanced-title', title));
        const breadcrumb = el('span', 'viewer-advanced-breadcrumb', advancedBreadcrumb());
        breadcrumb.title = advancedBreadcrumb();
        copy.appendChild(breadcrumb);
        head.appendChild(copy);
        return head;
      }

      function renderSizeControls(action, entry, enabled) {
        const controls = el('div', 'viewer-advanced-controls');
        if (action.kind === 'none') {
          controls.appendChild(el('span', 'viewer-advanced-static', 'Sin size'));
        } else if (action.kind === 'allin') {
          controls.appendChild(el('span', 'viewer-advanced-static is-allin', 'ALL-IN'));
        } else if (action.kind === 'or') {
          controls.appendChild(advancedInput('BB', entry.bb, {
            type: 'number', min: 0, max: 200, step: .1, disabled: !enabled,
            placeholder: '2.5'
          }, raw => {
            updateAdvancedDraft(
              'sizes',
              RT.RangeAdvancedConfig.updateSize(ensureAdvancedDraft(), action.id, 'bb', raw)
            );
          }));
        } else if (action.kind === 'rol') {
          controls.appendChild(advancedInput('BASE BB', entry.baseBb, {
            type: 'number', min: 0, max: 200, step: .1, disabled: !enabled,
            placeholder: '4'
          }, raw => updateAdvancedDraft(
            'sizes',
            RT.RangeAdvancedConfig.updateSize(
              ensureAdvancedDraft(), action.id, 'baseBb', raw
            )
          )));
          controls.appendChild(advancedInput('+BB / LIMP', entry.perLimpBb, {
            type: 'number', min: 0, max: 200, step: .1, disabled: !enabled,
            placeholder: '1'
          }, raw => updateAdvancedDraft(
            'sizes',
            RT.RangeAdvancedConfig.updateSize(
              ensureAdvancedDraft(), action.id, 'perLimpBb', raw
            )
          )));
        } else {
          controls.appendChild(advancedChoice(
            'MULTIPLICADOR',
            entry.multiplier == null ? '' : entry.multiplier,
            [{ label: 'Sin X', value: '' }].concat(
              RT.RangeAdvancedConfig.MULTIPLIERS.map(value => ({
                label: `x${value}`, value
              }))
            ),
            !enabled,
            value => {
              updateAdvancedDraft(
                'sizes',
                RT.RangeAdvancedConfig.updateSize(
                  ensureAdvancedDraft(), action.id, 'multiplier', value
                )
              );
              renderPanel();
            }
          ));
          controls.appendChild(advancedInput('BB', entry.bb, {
            type: 'number', min: 0, max: 200, step: .1, disabled: !enabled,
            placeholder: 'BB'
          }, raw => {
            updateAdvancedDraft(
              'sizes',
              RT.RangeAdvancedConfig.updateSize(ensureAdvancedDraft(), action.id, 'bb', raw)
            );
            renderPanel();
          }));
        }
        return controls;
      }

      function renderFrequencyControls(action, entry, enabled) {
        const controls = el('div', 'viewer-advanced-frequency-controls');
        controls.appendChild(advancedChoice(
          'MÉTODO',
          entry.method,
          RT.RangeAdvancedConfig.METHODS.map(method => ({
            label: method.label, value: method.id
          })),
          !enabled,
          method => {
            updateAdvancedDraft(
              'frequencies',
              RT.RangeAdvancedConfig.setFrequencyMethod(
                ensureAdvancedDraft(), action.id, method
              )
            );
            renderPanel();
          }
        ));
        if (entry.method === 'percent') {
          controls.appendChild(advancedInput('FRECUENCIA %', entry.percent, {
            type: 'number', min: 0, max: 100, step: .1, disabled: !enabled,
            placeholder: '50'
          }, raw => updateAdvancedDraft(
            'frequencies',
            RT.RangeAdvancedConfig.updateFrequency(
              ensureAdvancedDraft(), action.id, 'percent', raw
            )
          )));
        }
        if (entry.method === 'suits') {
          const suits = el('div', 'viewer-advanced-suits');
          [
            ['spade', 'â™ '], ['heart', 'â™¥'], ['diamond', 'â™¦'], ['club', 'â™£']
          ].forEach(([id, symbol]) => {
            const active = entry.suits.includes(id);
            const suit = button(symbol, {
              active,
              disabled: !enabled,
              variant: 'viewer-advanced-suit',
              onClick: () => {
                updateAdvancedDraft(
                  'frequencies',
                  RT.RangeAdvancedConfig.updateFrequency(
                    ensureAdvancedDraft(), action.id, 'suit', id
                  )
                );
                renderPanel();
              }
            });
            suit.setAttribute('aria-pressed', String(active));
            suits.appendChild(suit);
          });
          controls.appendChild(suits);
        }
        if (entry.method === 'parity') {
          const parity = el('div', 'viewer-advanced-parity');
          [['even', 'PAR'], ['odd', 'IMPAR']].forEach(([id, label]) => {
            const active = entry.parity === id;
            const item = button(label, {
              active,
              disabled: !enabled,
              variant: 'viewer-advanced-parity-option',
              onClick: () => {
                updateAdvancedDraft(
                  'frequencies',
                  RT.RangeAdvancedConfig.updateFrequency(
                    ensureAdvancedDraft(), action.id, 'parity', id
                  )
                );
                renderPanel();
              }
            });
            item.setAttribute('role', 'radio');
            item.setAttribute('aria-checked', String(active));
            parity.appendChild(item);
          });
          parity.setAttribute('role', 'radiogroup');
          parity.setAttribute('aria-label', `${action.label} par o impar`);
          controls.appendChild(parity);
        }
        if (entry.method === 'range') {
          controls.appendChild(advancedInput('DESDE', entry.from, {
            type: 'number', min: 0, step: 1, disabled: !enabled
          }, raw => updateAdvancedDraft(
            'frequencies',
            RT.RangeAdvancedConfig.updateFrequency(
              ensureAdvancedDraft(), action.id, 'from', raw
            )
          )));
          controls.appendChild(advancedInput('HASTA', entry.to, {
            type: 'number', min: 0, step: 1, disabled: !enabled
          }, raw => updateAdvancedDraft(
            'frequencies',
            RT.RangeAdvancedConfig.updateFrequency(
              ensureAdvancedDraft(), action.id, 'to', raw
            )
          )));
        }
        if (entry.method === 'custom') {
          controls.appendChild(advancedInput('CONFIGURACIÓN', entry.custom, {
            type: 'text', disabled: !enabled, placeholder: 'Nota breve'
          }, raw => updateAdvancedDraft(
            'frequencies',
            RT.RangeAdvancedConfig.updateFrequency(
              ensureAdvancedDraft(), action.id, 'custom', raw
            )
          )));
        }
        return controls;
      }

      const SEQUENCE_POSITION_SLOTS = Object.freeze([
        'UTG', 'UTG+1', 'UTG+2', 'UTG+3', 'LJ',
        'HJ', 'CO', 'BTN', 'SB', 'BB'
      ]);

      const MINI_SEAT_LAYOUTS = Object.freeze({
        2: [
          { left: '36%', top: '77%', edge: 'bottom' },
          { left: '64%', top: '23%', edge: 'top' }
        ],
        3: [
          { left: '50%', top: '19%', edge: 'top' },
          { left: '76%', top: '76%', edge: 'bottom' },
          { left: '24%', top: '76%', edge: 'bottom' }
        ],
        4: [
          { left: '25%', top: '18%', edge: 'top' },
          { left: '75%', top: '18%', edge: 'top' },
          { left: '75%', top: '82%', edge: 'bottom' },
          { left: '25%', top: '82%', edge: 'bottom' }
        ],
        5: [
          { left: '50%', top: '15%', edge: 'top' },
          { left: '88%', top: '47%', edge: 'right' },
          { left: '70%', top: '82%', edge: 'bottom' },
          { left: '30%', top: '82%', edge: 'bottom' },
          { left: '12%', top: '47%', edge: 'left' }
        ],
        6: [
          { left: '30%', top: '17%', edge: 'top' },
          { left: '70%', top: '17%', edge: 'top' },
          { left: '90%', top: '50%', edge: 'right' },
          { left: '72%', top: '82%', edge: 'bottom' },
          { left: '28%', top: '82%', edge: 'bottom' },
          { left: '10%', top: '50%', edge: 'left' }
        ],
        7: [
          { left: '26%', top: '18%', edge: 'top' },
          { left: '50%', top: '14%', edge: 'top' },
          { left: '74%', top: '18%', edge: 'top' },
          { left: '90%', top: '50%', edge: 'right' },
          { left: '70%', top: '82%', edge: 'bottom' },
          { left: '30%', top: '82%', edge: 'bottom' },
          { left: '10%', top: '50%', edge: 'left' }
        ],
        8: [
          { left: '24%', top: '19%', edge: 'top' },
          { left: '50%', top: '14%', edge: 'top' },
          { left: '76%', top: '19%', edge: 'top' },
          { left: '91%', top: '40%', edge: 'right' },
          { left: '89%', top: '62%', edge: 'right' },
          { left: '70%', top: '82%', edge: 'bottom' },
          { left: '30%', top: '82%', edge: 'bottom' },
          { left: '9%', top: '52%', edge: 'left' }
        ],
        9: [
          { left: '20%', top: '28%', edge: 'top' },
          { left: '38%', top: '18%', edge: 'top' },
          { left: '62%', top: '18%', edge: 'top' },
          { left: '80%', top: '28%', edge: 'top' },
          { left: '91%', top: '51%', edge: 'right' },
          { left: '78%', top: '76%', edge: 'bottom' },
          { left: '50%', top: '84%', edge: 'bottom' },
          { left: '22%', top: '76%', edge: 'bottom' },
          { left: '9%', top: '51%', edge: 'left' }
        ],
        10: [
          { left: '16%', top: '32%', edge: 'top' },
          { left: '34%', top: '21%', edge: 'top' },
          { left: '50%', top: '16%', edge: 'top' },
          { left: '66%', top: '21%', edge: 'top' },
          { left: '84%', top: '32%', edge: 'top' },
          { left: '92%', top: '53%', edge: 'right' },
          { left: '82%', top: '73%', edge: 'bottom' },
          { left: '64%', top: '82%', edge: 'bottom' },
          { left: '36%', top: '82%', edge: 'bottom' },
          { left: '8%', top: '53%', edge: 'left' }
        ]
      });

      function sequencePositionSlots(form) {
        const enabled = RT.RangeFormModel.positions(form.tableSize);
        return SEQUENCE_POSITION_SLOTS.map(label => {
          let value = label;
          if (form.tableSize === '6-max' && label === 'UTG') value = 'LJ / UTG';
          if (form.tableSize === '6-max' && label === 'HJ') value = 'HJ / MP';
          if (form.tableSize === '2-max' && label === 'BTN') value = 'BTN/SB';
          return {
            label,
            value,
            enabled: enabled.includes(value)
          };
        });
      }

      function sequenceActionColor(action) {
        const engineActions = {
          fold: 'FOLD',
          limp: 'OR',
          open_raise: 'OR',
          open_jam: 'ALLIN',
          call: 'CALL',
          three_bet: '3BET',
          jam: 'ALLIN',
          four_bet: '4BET',
          four_bet_jam: 'ALLIN',
          five_bet: '5BETPLUS'
        };
        const definition = RT.Engine.getActionDef(engineActions[action]);
        return definition && definition.color ? definition.color : '#516f8b';
      }

      const SEQUENCE_ACTION_SLOTS = Object.freeze([
        { id: 'call', label: 'CALL', actions: ['call'] },
        { id: 'limp', label: 'LIMP', actions: ['limp'] },
        { id: 'open_raise', label: 'OR', actions: ['open_raise'] },
        { id: 'three_bet', label: '3BET', actions: ['three_bet'] },
        { id: 'four_bet', label: '4BET', actions: ['four_bet'] },
        { id: 'five_bet', label: '5BET+', actions: ['five_bet'] },
        { id: 'all_in', label: 'ALL IN', actions: ['open_jam', 'jam', 'four_bet_jam'] }
      ]);

      function sequenceActionSlotMatch(slot, availableActions) {
        return slot.actions.find(action => availableActions.includes(action)) || '';
      }

      function sequenceActionSlotFallback(slot) {
        return slot.actions[0];
      }

      function setSequenceButtonLabel(node, label) {
        node.textContent = '';
        node.appendChild(el('span', 'preflop-sequence-button-label', label));
      }

      function miniPositionLabel(position) {
        if (position === 'LJ / UTG') return 'UTG';
        if (position === 'HJ / MP') return 'HJ';
        if (position === 'BTN/SB') return 'BTN';
        return String(position || '--').replace(/\s+/g, '');
      }

      function miniActionLabel(action) {
        const labels = {
          fold: 'F',
          limp: 'LIMP',
          open_raise: 'OR',
          open_jam: 'ALL IN',
          call: 'CALL',
          three_bet: '3B',
          jam: 'ALL IN',
          four_bet: '4B',
          four_bet_jam: '4B ALL IN',
          five_bet: '5B+'
        };
        return labels[action] || RT.PreflopSequenceModel.LABELS[action] || '';
      }

      function miniActionLevel(action) {
        return {
          fold: 'fold',
          limp: 'limp',
          open_raise: 'or',
          open_jam: 'jam',
          call: 'call',
          three_bet: 'three-bet',
          jam: 'jam',
          four_bet: 'four-bet',
          four_bet_jam: 'jam',
          five_bet: 'five-bet'
        }[action] || '';
      }

      function miniCommittedLevel(step, previousAggressiveLevel) {
        if (!step || !step.action) return '';
        if (step.action === 'call') return previousAggressiveLevel || 'call';
        return miniActionLevel(step.action);
      }

      function annotateMiniCommitmentLevels(steps) {
        let previousAggressiveLevel = '';
        return (steps || []).map(step => {
          const level = miniCommittedLevel(step, previousAggressiveLevel);
          const annotated = Object.assign({}, step, {
            visualLevel: level
          });
          if (['open_raise', 'open_jam', 'three_bet', 'jam', 'four_bet', 'four_bet_jam', 'five_bet'].includes(step.action)) {
            previousAggressiveLevel = level;
          }
          return annotated;
        });
      }

      function markMiniReplayDirty() {
        ui.study.miniReplay = Object.assign({}, ui.study.miniReplay, {
          manual: false
        });
      }

      function miniSeatRoles(positions) {
        const buttonPosition = positions.includes('BTN')
          ? 'BTN'
          : positions.includes('BTN/SB')
            ? 'BTN/SB'
            : positions[Math.max(0, positions.length - 3)];
        const sbPosition = positions.includes('SB')
          ? 'SB'
          : positions.includes('BTN/SB')
            ? 'BTN/SB'
            : positions[Math.max(0, positions.length - 2)];
        const bbPosition = positions.includes('BB')
          ? 'BB'
          : positions[Math.max(0, positions.length - 1)];
        return {
          dealer: buttonPosition || '',
          sb: sbPosition || '',
          bb: bbPosition || ''
        };
      }

      function miniReplayActionSteps(sequenceState) {
        const steps = [];
        (sequenceState.sequence || []).forEach(step => {
          if (step && step.position && step.action) steps.push(Object.assign({}, step));
        });
        (sequenceState.others || []).forEach(step => {
          if (step && step.position && step.action) steps.push(Object.assign({}, step));
        });
        return steps;
      }

      function miniExpandedSteps(steps) {
        const expanded = [];
        (steps || []).forEach(step => {
          const positions = step.actor === 'rival' &&
            Array.isArray(step.positions) && step.positions.length
            ? step.positions
            : [step.position];
          positions.filter(Boolean).forEach(position => {
            expanded.push(Object.assign({}, step, { position }));
          });
        });
        return expanded;
      }

      function miniReplaySignature(form, sequenceState, steps) {
        return JSON.stringify({
          tableSize: form.tableSize,
          hero: sequenceState.positions && sequenceState.positions.hero,
          rival: sequenceState.positions && sequenceState.positions.rival,
          rivals: RT.PreflopSequenceModel.selectedRivals(sequenceState),
          order: sequenceState.order,
          steps: (steps || []).map(step => ({
            actor: step.actor,
            position: step.position,
            action: step.action,
            size: step.size == null ? null : step.size
          }))
        });
      }

      function miniActionLineFromSteps(steps) {
        const parts = (steps || []).map(step => {
          const positions = step.actor === 'rival' &&
            Array.isArray(step.positions) && step.positions.length
            ? step.positions.map(miniPositionLabel).join('+')
            : miniPositionLabel(step.position);
          const label = miniActionLabel(step.action);
          return `${positions} ${label}`.trim();
        });
        return parts.length ? parts.join(' -> ') : 'Configura Hero y Rival';
      }

      function renderMiniChipCommitment(level, amountBb, extraClass) {
        const stackCounts = {
          'blind-sb': 1,
          'blind-bb': 1,
          limp: 1,
          call: 1,
          or: 2,
          'three-bet': 3,
          'four-bet': 4,
          'five-bet': 5
        };
        if (!level || level === 'fold') return null;
        const wrap = el(
          'span',
          `mini-chip-commitment is-${level}${extraClass ? ` is-${extraClass}` : ''}`
        );
        if (level === 'jam') {
          wrap.appendChild(el('span', 'mini-all-in-strip', 'ALL IN'));
        } else {
          const stacks = stackCounts[level] || 0;
          const chipCount = level === 'blind-sb' ? 1 : 2;
          for (let stackIndex = 0; stackIndex < stacks; stackIndex++) {
            const stack = el('span', 'mini-chip-stack');
            for (let chipIndex = 0; chipIndex < chipCount; chipIndex++) {
              stack.appendChild(el('span', 'mini-chip'));
            }
            wrap.appendChild(stack);
          }
        }
        if (amountBb != null) {
          wrap.appendChild(el('span', 'mini-chip-value', `${amountBb}bb`));
        }
        return wrap;
      }

      function renderMiniSeat(position, point, roles, state, action, meta) {
        const info = meta || {};
        const selectedRivals = RT.PreflopSequenceModel.selectedRivals(state);
        const isHero = state.positions.hero === position;
        const isRival = selectedRivals.includes(position);
        const isPending = info.pendingPositions && info.pendingPositions.has(position);
        const isFolded = info.foldedPositions && info.foldedPositions.has(position);
        const level = action && action.action !== 'fold'
          ? (action.visualLevel || miniActionLevel(action.action))
          : position === roles.sb
            ? 'blind-sb'
            : position === roles.bb
              ? 'blind-bb'
              : '';
        const seat = el(
          'div',
          `mini-seat mini-seat-edge-${point.edge}` +
            (isHero ? ' is-hero' : '') +
            (isRival ? ' is-rival' : '') +
            (isPending ? ' is-pending' : '') +
            (action ? ' is-active' : '') +
            (isFolded || (action && action.action === 'fold') ? ' is-folded' : '')
        );
        seat.style.setProperty('--mini-seat-left', point.left);
        seat.style.setProperty('--mini-seat-top', point.top);
        seat.appendChild(el('span', 'mini-position-label', miniPositionLabel(position)));
        if (isHero) seat.appendChild(el('span', 'mini-seat-badge hero', 'H'));
        else if (isRival) seat.appendChild(el('span', 'mini-seat-badge rival', 'R'));

        const roleBox = el('span', 'mini-seat-roles');
        if (position === roles.dealer) roleBox.appendChild(el('span', 'mini-dealer-button', 'D'));
        if (roleBox.children.length) seat.appendChild(roleBox);

        const commitment = renderMiniChipCommitment(
          level,
          action && action.size,
          action && action.action === 'call' ? 'call' : ''
        );
        if (commitment) seat.appendChild(commitment);
        return seat;
      }

      function renderMiniSpotReplayer(form, sequenceState) {
        const positions = RT.RangeFormModel.positions(form.tableSize);
        const layout = MINI_SEAT_LAYOUTS[positions.length] || MINI_SEAT_LAYOUTS[6];
        const roles = miniSeatRoles(positions);
        const actionSteps = miniReplayActionSteps(sequenceState);
        const allSteps = miniExpandedSteps(actionSteps);
        const signature = miniReplaySignature(form, sequenceState, allSteps);
        const replayState = ui.study.miniReplay && typeof ui.study.miniReplay === 'object'
          ? ui.study.miniReplay
          : {};
        const maxStep = actionSteps.length;
        const storedIndex = Number.isFinite(replayState.index)
          ? Math.max(0, Math.min(maxStep, replayState.index))
          : maxStep;
        const currentIndex = replayState.signature === signature && replayState.manual
          ? storedIndex
          : maxStep;
        ui.study.miniReplay = {
          signature,
          index: currentIndex,
          manual: replayState.signature === signature && replayState.manual
        };
        const visibleActionSteps = actionSteps.slice(0, currentIndex);
        const visibleSteps = annotateMiniCommitmentLevels(miniExpandedSteps(visibleActionSteps));
        const actionsByPosition = new Map();
        const pendingPositions = new Set(
          RT.PreflopSequenceModel.pendingPositions(sequenceState, positions)
        );
        const foldedPositions = new Set(
          RT.PreflopSequenceModel.foldedPositions(sequenceState, positions)
        );
        visibleSteps.forEach(step => {
          actionsByPosition.set(step.position, step);
        });
        const root = el('section', 'mini-spot-replayer');
        const table = el('div', 'mini-table');
        table.appendChild(el('div', 'mini-table-felt'));
        positions.forEach((position, index) => {
          table.appendChild(renderMiniSeat(
            position,
            layout[index] || layout[layout.length - 1],
            roles,
            sequenceState,
            actionsByPosition.get(position),
            { pendingPositions, foldedPositions }
          ));
        });
        const stepper = el('div', 'mini-replay-stepper');
        const previous = button('< Ant', {
          disabled: currentIndex <= 0,
          variant: 'mini-replay-step',
          onClick: () => {
            ui.study.miniReplay = { signature, index: currentIndex - 1, manual: true };
            renderAll();
          }
        });
        previous.title = 'Anterior';
        previous.setAttribute('aria-disabled', String(previous.disabled));
        previous.setAttribute('aria-label', 'Anterior');
        const next = button('Sig >', {
          disabled: currentIndex >= maxStep,
          variant: 'mini-replay-step',
          onClick: () => {
            ui.study.miniReplay = { signature, index: currentIndex + 1, manual: true };
            renderAll();
          }
        });
        next.title = 'Siguiente';
        next.setAttribute('aria-disabled', String(next.disabled));
        next.setAttribute('aria-label', 'Siguiente');
        stepper.appendChild(previous);
        stepper.appendChild(next);
        table.appendChild(stepper);
        root.appendChild(table);
        if (!visibleActionSteps.length) {
          root.appendChild(el('div', 'mini-action-line', miniActionLineFromSteps(visibleActionSteps)));
        }
        return root;
      }

      function renderSequenceActor(actor, form, sequenceState, actionsFirst) {
        const actorLabel = actor === 'hero' ? 'HERO' : 'RIVAL';
        const block = el(
          'div',
          `preflop-sequence-actor is-${actor}${
            actionsFirst ? ' has-actions-first' : ''
          }`
        );
        const positions = RT.RangeFormModel.positions(form.tableSize);
        const positionRow = el('div', 'preflop-sequence-row preflop-position-row');
        positionRow.style.setProperty('--sequence-columns', '5');
        positionRow.setAttribute('aria-label', `Posicion de ${actorLabel}`);
        const next = RT.PreflopSequenceModel.stage(sequenceState, positions);
        const waitingHeroReturn = RT.PreflopSequenceModel.needsHeroReturnConfirmation(
          sequenceState, positions
        );
        const rawActionIds = next.actor === actor
          ? RT.PreflopSequenceModel.availableActionsForActor(sequenceState, actor, positions)
          : [];
        const actionIds = actor === 'hero' && waitingHeroReturn ? [] : rawActionIds;
        const actorHasActionChoice = next.actor === actor &&
          !!sequenceState.positions[actor] &&
          actionIds.some(action => action !== 'fold');
        const eligibleRivals = new Set(
          RT.PreflopSequenceModel.availableRivalPositions(sequenceState, positions)
        );
        const actedRivals = RT.PreflopSequenceModel.actedRivalPositions(sequenceState);
        const selectedRivals = RT.PreflopSequenceModel.selectedRivals(sequenceState);
        sequencePositionSlots(form).forEach(slot => {
          const blockedByOrder = slot.enabled && !RT.PreflopSequenceModel.canSelectPosition(
            sequenceState, actor, slot.value, positions
          );
          const conflict = actor === 'hero'
            ? selectedRivals.includes(slot.value)
            : sequenceState.positions.hero === slot.value;
          const active = actor === 'hero'
            ? sequenceState.positions.hero === slot.value
            : selectedRivals.includes(slot.value);
          const heroReturnTarget = actor === 'hero' && active && waitingHeroReturn;
          const rivalPendingBeforeHeroReturn = actor === 'rival' &&
            waitingHeroReturn &&
            !active &&
            eligibleRivals.has(slot.value);
          const pendingPositionChoice = actor === 'hero'
            ? !sequenceState.positions.hero || heroReturnTarget
            : !active && eligibleRivals.has(slot.value);
          const pending = slot.enabled &&
            !blockedByOrder &&
            !conflict &&
            (next.actor === actor || rivalPendingBeforeHeroReturn) &&
            !actedRivals.has(slot.value) &&
            !actorHasActionChoice &&
            pendingPositionChoice;
          const lockedByActionChoice = active && actorHasActionChoice;
          const blockedByActionChoice = actorHasActionChoice && !heroReturnTarget;
          const blockedByOtherActorTurn = next.actor !== actor && !rivalPendingBeforeHeroReturn;
          const blockedByFlow = actor === 'hero'
            ? !!sequenceState.positions.hero &&
              (sequenceState.positions.hero !== slot.value || next.actor !== 'hero')
            : blockedByOtherActorTurn ||
              (!eligibleRivals.has(slot.value) && !active) ||
              (sequenceState.heroReturnConfirmed === true && next.actor === 'hero' && !active);
          const locked = actor === 'rival' && actedRivals.has(slot.value);
          const disabled = !slot.enabled ||
            blockedByOrder ||
            conflict ||
            blockedByFlow ||
            locked ||
            lockedByActionChoice ||
            blockedByActionChoice;
          const item = button(slot.label, {
            active,
            disabled,
            variant: 'preflop-sequence-button preflop-position-button',
            onClick: () => updateSequence(
              heroReturnTarget
                ? RT.PreflopSequenceModel.confirmHeroReturn(sequenceState, positions)
                : RT.PreflopSequenceModel.setPosition(
                  sequenceState, actor, slot.value, positions
                )
            )
          });
          setSequenceButtonLabel(item, slot.label);
          item.dataset.sequenceActor = actor;
          item.dataset.sequencePosition = slot.value;
          item.dataset.positionEnabled = String(slot.enabled);
          item.dataset.state = heroReturnTarget
              ? 'confirm-hero-return'
            : active
              ? 'selected'
            : locked
              ? 'locked'
            : lockedByActionChoice
              ? 'locked-action-choice'
            : blockedByOrder
              ? 'disabled-order'
            : !slot.enabled
              ? 'disabled-table'
              : conflict
                ? 'disabled-conflict'
              : blockedByFlow
                ? 'disabled-flow'
                : 'available';
          if (pending) item.classList.add('is-pending');
          item.setAttribute('aria-pressed', String(active));
          item.setAttribute(
            'aria-disabled',
            String(disabled)
          );
          if (!slot.enabled) {
            item.title = `${slot.label} no existe en mesa ${form.tableSize}`;
          } else if (blockedByOrder) {
            item.title = `${slot.label} no puede abrir la secuencia`;
          } else if (conflict) {
            item.title = `${slot.label} ya esta asignada al otro jugador`;
          } else if (locked) {
            item.title = `${slot.label} ya actuo en esta secuencia`;
          } else if (heroReturnTarget) {
            item.title = `${slot.label}: pulsa aqui para cerrar rivales restantes como fold y responder`;
          } else if (lockedByActionChoice) {
            item.title = `${slot.label} ya esta fijada. Elige una accion o usa CLEAR para empezar de nuevo.`;
          } else if (blockedByFlow) {
            item.title = `${slot.label} no corresponde al siguiente paso`;
          }
          positionRow.appendChild(item);
        });

        const actionRow = el('div', 'preflop-sequence-row preflop-action-row');
        actionRow.style.setProperty('--sequence-columns', String(SEQUENCE_ACTION_SLOTS.length));
        actionRow.setAttribute('aria-label', `Acciones de ${actorLabel}`);
        const visibleActionIds = actionIds.filter(action => action !== 'fold');
        SEQUENCE_ACTION_SLOTS.forEach(slot => {
          const action = sequenceActionSlotMatch(slot, visibleActionIds);
          const fallbackAction = sequenceActionSlotFallback(slot);
          const enabled = !!action && next.actor === actor && !!sequenceState.positions[actor];
          const item = button(slot.label, {
            active: false,
            disabled: !enabled,
            variant: 'preflop-sequence-button preflop-action-button',
            onClick: () => {
              if (!action) return;
              updateSequence(
                RT.PreflopSequenceModel.addAction(
                  sequenceState, actor, action, positions
                )
              );
            }
          });
          setSequenceButtonLabel(item, slot.label);
          item.dataset.sequenceActor = actor;
          item.dataset.sequenceAction = action || fallbackAction;
          item.dataset.sequenceActionSlot = slot.id;
          item.dataset.state = enabled ? 'available' : 'disabled';
          if (enabled) item.classList.add('is-pending');
          item.setAttribute('aria-pressed', 'false');
          item.setAttribute('aria-disabled', String(!enabled));
          if (!enabled) {
            item.title = next.actor === actor
              ? `${slot.label} no corresponde al siguiente paso`
              : `${slot.label} reservado para mantener la estructura fija`;
          }
          item.style.setProperty(
            '--sequence-action-color',
            sequenceActionColor(action || fallbackAction)
          );
          actionRow.appendChild(item);
        });
        if (actionsFirst) {
          block.appendChild(actionRow);
          block.appendChild(positionRow);
        } else {
          block.appendChild(positionRow);
          block.appendChild(actionRow);
        }
        return block;
      }

      function renderSequenceBuilder(form) {
        const positions = RT.RangeFormModel.positions(form.tableSize);
        const state = RT.PreflopSequenceModel.normalize(
          ui.study.preflopSequence,
          positions
        );
        ui.study.preflopSequence = state;
        const section = el('section', 'preflop-sequence-builder');
        const inferredRelation = RT.RangeFormModel.inferRelation(
          state.positions.hero, state.positions.rival, form.tableSize
        );
        const relationLocked = !!inferredRelation || form.multiway;
        const summary = RT.PreflopSequenceModel.describe(state);
        const display = el('div', 'preflop-sequence-display preflop-sequence-display-top');
        const summaryNode = el('strong', 'preflop-sequence-display-main', summary);
        summaryNode.title = summary;
        display.appendChild(summaryNode);

        const heroTop = state.order === 'hero';
        const currentStage = RT.PreflopSequenceModel.stage(state, positions);
        const stageHasActionChoice = !!currentStage.actor &&
          !!state.positions[currentStage.actor] &&
          RT.PreflopSequenceModel
            .availableActionsForActor(state, currentStage.actor, positions)
            .some(action => action !== 'fold');
        const orderLocked = !!state.sequence.length || stageHasActionChoice;
        const orderWrap = el('div', 'preflop-sequence-order-control');
        orderWrap.classList.add('preflop-sequence-toolbar-button-slot');
        const orderButton = button(heroTop ? 'HERO ARRIBA' : 'HERO ABAJO', {
          active: heroTop,
          disabled: orderLocked,
          variant: 'preflop-sequence-order-button preflop-sequence-order-toggle',
          onClick: () => updateSequence(
            RT.PreflopSequenceModel.setOrder(
              state,
              heroTop ? 'rival' : 'hero',
              positions
            )
          )
        });
        orderButton.setAttribute('aria-pressed', String(heroTop));
        orderButton.setAttribute('aria-disabled', String(orderLocked));
        orderButton.setAttribute('aria-label', 'Cambiar orden visual de Hero');
        if (orderLocked) {
          orderButton.title = 'Bloqueado mientras la secuencia ya tiene acciones. Usa CLEAR para empezar de nuevo.';
        }
        orderWrap.appendChild(orderButton);
        const relationState = ['IP', 'OOP'].includes(form.relation) ? form.relation : 'AUTO';
        const relationWrap = el('div', 'preflop-sequence-order-control');
        relationWrap.classList.add('preflop-sequence-toolbar-button-slot');
        const relationButton = button(
          relationState === 'AUTO' ? 'IP / OOP' : relationState,
          {
            active: relationState !== 'AUTO',
            disabled: relationLocked,
            variant: `preflop-sequence-order-button preflop-sequence-state-${relationState.toLowerCase()}`,
            onClick: () => {
              const next =
                relationState === 'AUTO' ? 'IP' :
                relationState === 'IP' ? 'OOP' : 'Auto';
              updateRangeForm('relation', next);
            }
          }
        );
        relationButton.setAttribute('aria-pressed', String(relationState !== 'AUTO'));
        relationButton.setAttribute('aria-label', 'Cambiar IP u OOP');
        if (relationLocked) {
          relationButton.title = form.multiway
            ? 'No aplica con Multiway = ON.'
            : inferredRelation
              ? `${inferredRelation} detectado por la secuencia actual.`
              : '';
        }
        relationWrap.appendChild(relationButton);
        const actors = el('div', 'preflop-sequence-actors');
        const actorOrder = state.order === 'hero'
          ? ['hero', 'rival']
          : ['rival', 'hero'];
        const clear = button('CLEAR', {
          disabled: !state.sequence.length &&
            !state.positions.hero &&
            !RT.PreflopSequenceModel.selectedRivals(state).length,
          variant: 'preflop-sequence-reset',
          onClick: () => updateSequence(
            RT.PreflopSequenceModel.empty(state.order)
          )
        });
        clear.setAttribute('aria-disabled', String(clear.disabled));
        const controlRow = el('div', 'preflop-sequence-display-row preflop-sequence-center-row');
        controlRow.appendChild(orderWrap);
        controlRow.appendChild(relationWrap);
        controlRow.appendChild(clear);
        actors.appendChild(display);
        actors.appendChild(renderSequenceActor(actorOrder[0], form, state, false));
        actors.appendChild(controlRow);
        actors.appendChild(renderSequenceActor(actorOrder[1], form, state, true));
        section.appendChild(actors);
        section.appendChild(renderMiniSpotReplayer(form, state));
        return section;
      }

      function renderAdvancedScreen(panel, type) {
        const isSizes = type === 'sizes';
        const draft = ensureAdvancedDraft();
        const active = activeAdvancedActions();
        const screen = el('section', 'viewer-advanced-screen');
        screen.appendChild(advancedHeader(isSizes ? 'CONFIG SIZES' : 'CONFIG FRECUENCIAS'));
        const rows = el('div', 'viewer-advanced-rows');
        RT.RangeAdvancedConfig.ACTIONS.forEach(action => {
          const enabled = active.has(action.id);
          const row = el(
            'div',
            `viewer-advanced-row${enabled ? '' : ' is-disabled'}`
          );
          row.setAttribute('aria-disabled', String(!enabled));
          if (!enabled) {
            row.title = `Activa esta acción en el rango para configurar ${
              isSizes ? 'size' : 'frecuencia'
            }`;
          }
          row.appendChild(el('strong', 'viewer-advanced-action', action.label));
          row.appendChild(isSizes
            ? renderSizeControls(action, draft.sizeConfig[action.id], enabled)
            : renderFrequencyControls(
                action, draft.frequencyConfig[action.id], enabled
              ));
          rows.appendChild(row);
        });
        screen.appendChild(rows);
        panel.appendChild(screen);
      }

      function renderPanelView(panel) {
        if (rangePanelScreen === 'sizes' || rangePanelScreen === 'frequencies') {
          renderAdvancedScreen(panel, rangePanelScreen);
          return;
        }
        const model = RT.RangeFormModel;
        const form = ensureRangeForm();

        const head = el('div', 'viewer-form-head');
        const headCopy = el('div', 'viewer-form-head-copy');
        const breadcrumb = [
          form.game || 'Sin game',
          form.stake || 'Sin stake',
          form.tableSize || 'Sin mesa',
          form.hero || 'Sin hero',
          form.spot || 'Sin spot',
          form.stack || 'Sin stack'
        ].map(displayText).join(' · ');
        const breadcrumbNode = el('div', 'viewer-form-subtitle viewer-form-lcd');
        breadcrumbNode.title = breadcrumb;
        const breadcrumbTrack = el('div', 'viewer-form-lcd-track');
        breadcrumbTrack.appendChild(el('span', '', breadcrumb));
        const breadcrumbClone = el('span', '', breadcrumb);
        breadcrumbClone.setAttribute('aria-hidden', 'true');
        breadcrumbTrack.appendChild(breadcrumbClone);
        breadcrumbNode.appendChild(breadcrumbTrack);
        headCopy.appendChild(breadcrumbNode);
        head.appendChild(headCopy);
        const headActions = el('div', 'viewer-form-head-actions');
        headActions.appendChild(iconButton(ICONS.folder, 'Gestionar colecciones', openCollectionsModal));
        headActions.appendChild(iconButton(
          ICONS.camera, 'Exportar rango como JPG/PNG', safeExportRangeSnapshot
        ));
        headActions.appendChild(iconButton(
          ui.showLabels ? ICONS.eye : ICONS.eyeOff,
          ui.showLabels ? 'Ocultar etiquetas de mano' : 'Mostrar etiquetas de mano',
          () => { ui.showLabels = !ui.showLabels; renderAll(); }
        ));
        head.appendChild(headActions);
        panel.appendChild(head);

        const identityProgress = completion(
          ['collection', 'collectionView', 'rangeType', 'betFormat', 'environment', 'subGame', 'stake', 'tableSize', 'model', 'stack', 'stackRelation', 'profile'],
          form
        );
        const identity = formSection('IDENTIDAD', 'identity', identityProgress);
        identity.grid.appendChild(formField(
          'TIPO', 'rangeType', model.CATALOG.rangeTypes, {
            span: 'span-4',
            hideLabel: true
          }
        ));
        identity.grid.appendChild(collectionField(
          'COLECCION', 'collectionView', {
            span: 'span-4',
            hideLabel: true
          }
        ));
        identity.grid.appendChild(formField(
          'ENTORNO', 'environment', model.CATALOG.environments, {
            span: 'span-4',
            hideLabel: true,
            insideLabel: 'ENV'
          }
        ));
        identity.grid.appendChild(formField(
          'FORMATO', 'betFormat', model.CATALOG.betFormats, {
            span: 'span-4',
            hideLabel: true,
            insideLabel: 'FORMAT'
          }
        ));
        identity.grid.appendChild(formField(
          'COLECCION BASE', 'collection', model.CATALOG.collections, {
            span: 'span-4',
            hideLabel: true
          }
        ));
        identity.grid.appendChild(formField(
          'SUB GAME', 'subGame', model.subGames(form.game), {
            span: 'span-4',
            hideLabel: true,
            insideLabel: 'SUB GAME'
          }
        ));
        const forcedBetTopDivider = formDivider();
        forcedBetTopDivider.classList.add('forced-bet-row-divider');
        identity.grid.appendChild(forcedBetTopDivider);
        renderForcedBetFields(identity);
        const forcedBetBottomDivider = formDivider();
        forcedBetBottomDivider.classList.add('forced-bet-row-divider');
        identity.grid.appendChild(forcedBetBottomDivider);
        identity.grid.appendChild(formField(
          form.game === 'Cash' ? 'STAKE' : 'BUY-IN',
          'stake', model.stakes(form.game), {
            span: 'span-4',
            hideLabel: true,
            insideLabel: form.game === 'Cash' ? 'STAKE' : 'BUY-IN'
          }
        ));
        identity.grid.appendChild(formField(
          'MESA', 'tableSize', model.CATALOG.tables, {
            span: 'span-4',
            hideLabel: true,
            insideLabel: 'TABLE',
            optionLabel: value => {
              if (value === '2-max') return 'HU';
              if (value === '4-max') return '4';
              if (value === '5-max') return '5';
              return value;
            }
          }
        ));
        identity.grid.appendChild(formField(
          'MODELO', 'model', model.CATALOG.models, {
            span: 'span-4',
            hideLabel: true,
            insideLabel: 'MODEL'
          }
        ));
        identity.grid.appendChild(formField(
          'STACK', 'stack', model.CATALOG.stacks, {
            span: 'span-4',
            hideLabel: true,
            insideLabel: 'HERO STACK'
          }
        ));
        identity.grid.appendChild(formField(
          'STACK RELATION', 'stackRelation', model.CATALOG.stackRelations, {
            span: 'span-4',
            hideLabel: true,
            insideLabel: 'RELATION'
          }
        ));
        identity.grid.appendChild(formField(
          'PERFIL', 'profile', model.CATALOG.profiles, {
            span: 'span-4',
            hideLabel: true,
            insideLabel: 'RIVAL TYPE'
          }
        ));
        panel.appendChild(identity.section);

        const gameProgress = completion(
          ['game'],
          form
        );
        const game = formSection('JUEGO', 'game', gameProgress);
        const isMyRangesCollection = form.collection === 'Mis rangos';
        if (!isMyRangesCollection) {
          game.grid.appendChild(formField(
            'GAME', 'game', model.CATALOG.games, {
              span: 'span-6',
              hideLabel: true,
              insideLabel: 'GAME'
            }
          ));
        }
        if ((game.grid.children && game.grid.children.length) ||
            (game.grid.childNodes && game.grid.childNodes.length)) {
          panel.appendChild(game.section);
        }

        /* table.grid.appendChild(segmentedField(
          'IP/OOP',
          'relation',
          [
            { label: 'IP', value: 'IP' },
            { label: 'OOP', value: 'OOP' }
          ],
          {
            span: 'span-4',
            hideLabel: true,
            disabled: relationLocked,
            disabledReason: form.multiway
              ? 'No aplica con Multiway = ON.'
              : inferredRelation
                ? `${inferredRelation} detectado por la secuencia actual.`
                : '',
            title: inferredRelation
              ? `${inferredRelation} detectado automáticamente`
              : 'Selecciona IP u OOP'
          }
        ));
        table.grid.appendChild(formField(
          'STACK', 'stack', model.CATALOG.stacks, {
            span: 'span-4',
            hideLabel: true,
            insideLabel: 'STACK'
          }
        ));
        table.grid.appendChild(formField(
          'PERFIL', 'profile', model.CATALOG.profiles, {
            span: 'span-12',
            hideLabel: true,
            insideLabel: 'RIVAL TYPE'
          }
        ));
        panel.appendChild(table.section); */

        const contextProgress = completion([
          value => !!value.forcedBetMode,
          value => !RT.RangeFormModel.isTournament(value.game) || !!value.phase,
          value => !RT.RangeFormModel.isTournament(value.game) || !!value.prize
        ], form);
        renderForcedBetModal(panel);

        panel.appendChild(renderSequenceBuilder(form));

        const footer = el('div', 'viewer-form-footer');
        const progressGroups = [
          identityProgress, gameProgress, contextProgress
        ];
        const validFields = progressGroups.reduce((sum, item) => sum + item.done, 0);
        const totalFields = progressGroups.reduce((sum, item) => sum + item.total, 0);
        const status = el('div', 'viewer-form-status');
        status.appendChild(el(
          'span',
          `viewer-form-status-dot ${rangeFormDirty ? 'is-dirty' : 'is-saved'}`
        ));
        status.appendChild(el(
          'span',
          'viewer-form-status-copy',
          rangeFormDirty ? 'Cambios sin guardar' : 'Guardado'
        ));
        status.appendChild(el(
          'span', 'viewer-form-validity', `${validFields}/${totalFields} válidos`
        ));
        footer.appendChild(status);
        const actions = el('div', 'viewer-form-footer-actions');
        const advancedButton = (label, type) => {
          const control = button(label, {
            variant: 'viewer-form-advanced-btn',
            onClick: () => {
              rangePanelScreen = type;
              renderPanel();
            }
          });
          if (rangeAdvancedDirty[type]) {
            const dot = el('span', 'viewer-form-advanced-dot');
            dot.setAttribute('aria-label', 'Cambios sin guardar');
            control.appendChild(dot);
          }
          return control;
        };
        actions.appendChild(advancedButton('CONF FREQ', 'frequencies'));
        actions.appendChild(advancedButton('CONF SIZES', 'sizes'));
        const save = button('SAVE', {
          variant: 'viewer-form-save',
          onClick: saveRangeForm
        });
        save.title = 'Guardar rango y configuración avanzada';
        actions.appendChild(save);
        footer.appendChild(actions);
        if (rangeFormNotice) {
          const notice = el('span', 'viewer-form-notice', rangeFormNotice);
          notice.setAttribute('role', 'status');
          footer.appendChild(notice);
        }
        panel.appendChild(footer);
      }

      function renderLegacyPanelView(panel) {
        ensureViewerDefaults();
        const state = ui.study;
        const source = activeSource();
        const context = studyContext();
        const opts = contextOptions();

        const toolbar = el('section', 'viewer-toolbar');
        toolbar.appendChild(selectGroup(
          'Colección',
          collectionOptions(),
          state.collection,
          value => {
            state.collection = value || 'default';
            ui.collections.active = state.collection;
            ui.gallerySelection.clear();
            reconcileSelection();
            renderAll();
          }
        ));
        toolbar.appendChild(iconButton(ICONS.folder, 'Gestionar colecciones', openCollectionsModal));
        toolbar.appendChild(iconButton(
          ICONS.camera,
          'Exportar rango como JPG/PNG',
          safeExportRangeSnapshot
        ));
        toolbar.appendChild(iconButton(ui.showLabels ? ICONS.eye : ICONS.eyeOff,
          ui.showLabels ? 'Ocultar etiquetas de mano' : 'Mostrar etiquetas de mano',
          () => {
            ui.showLabels = !ui.showLabels;
            renderAll();
          }
        ));
        panel.appendChild(toolbar);

        const filters = el('section', 'viewer-context-grid');
        filters.appendChild(selectGroup(
          'Spot',
          opts.spots.map(id => ({
            id,
            label: (RT.Engine.getSpotDef(id) || {}).label || id
          })),
          state.spot,
          value => {
            state.spot = value;
            reconcileSelection();
            renderAll();
          }
        ));
        if (!state.spot) {
          panel.appendChild(filters);
          return;
        }

        filters.appendChild(selectGroup(
          'Hero',
          RT.Hands.POSITIONS.map(position => ({
            id: position,
            label: position,
            disabled: !opts.heroes.includes(position)
          })),
          state.hero,
          value => {
            state.hero = value;
            reconcileSelection();
            renderAll();
          }
        ));

        filters.appendChild(selectGroup(
          'Rival',
          [{ id: '', label: 'Sin rival', disabled: RT.Engine.spotNeedsVs(state.spot) }]
            .concat(RT.Hands.POSITIONS.map(position => ({
              id: position,
              label: position,
              disabled: !RT.Engine.spotNeedsVs(state.spot) ||
                !opts.opponents.includes(position)
            })))
            .concat([
              { id: 'multiway', label: 'Multiway', disabled: true },
              { id: 'custom', label: 'Custom', disabled: true }
            ]),
          state.vs || '',
          value => {
            state.vs = value || null;
            reconcileSelection();
            renderAll();
          }
        ));

        filters.appendChild(selectGroup(
          'Perfil',
          [
            ['pool', 'Pool'],
            ['reg', 'Reg'],
            ['fish', 'Fish'],
            ['nit', 'Nit'],
            ['loose', 'Loose'],
            ['aggro', 'Aggro'],
            ['maniac', 'Maniac'],
            ['recreational', 'Recreacional'],
            ['shortstack', 'Shortstack'],
            ['custom', 'Custom']
          ].map(([id, label]) => ({ id, label })),
          state.profile,
          value => {
            state.profile = value || 'pool';
            renderPanel();
          }
        ));

        const relatives = RT.Engine.spotNeedsRelative(state.spot)
          ? RT.Engine.availableRelatives({ source, spot: state.spot })
          : [];
        filters.appendChild(selectGroup(
          'IP/OOP',
          [
            { id: 'auto', label: 'Auto' },
            {
              id: 'IP', label: 'IP',
              disabled: !RT.Engine.spotNeedsRelative(state.spot) || !relatives.includes('IP')
            },
            {
              id: 'OOP', label: 'OOP',
              disabled: !RT.Engine.spotNeedsRelative(state.spot) || !relatives.includes('OOP')
            },
            { id: 'all', label: 'Todos', disabled: true }
          ],
          state.relative || 'auto',
          value => {
            state.relative = value === 'auto' || value === 'all' ? null : value;
            reconcileSelection();
            renderAll();
          }
        ));

        panel.appendChild(filters);

        if (context) {
          const active = el('section', 'viewer-active-context');
          const head = el('div', 'context-head');
          head.appendChild(el('div', 'context-main', RT.Engine.describeContext(context)));
          const isFavorite = RT.Favorites.has(context);
          const favorite = el(
            'button',
            'fav-btn' + (isFavorite ? ' is-fav' : ''),
            isFavorite ? 'â˜…' : '+'
          );
          favorite.type = 'button';
          favorite.title = isFavorite ? 'Quitar de favoritos' : 'Marcar como favorito';
          favorite.setAttribute('aria-label', favorite.title);
          favorite.addEventListener('click', () => {
            RT.Favorites.toggle(context);
          });
          head.appendChild(favorite);
          active.appendChild(head);
          active.appendChild(el(
            'div',
            'context-sub',
            `${state.profile || 'Pool'} · ${
              Array.from(state.matrixFilters.selectedActions).join(' + ') || 'Todas las acciones'}`
          ));
          panel.appendChild(active);
        }
      }

      function spotLabel(id) {
        const spot = RT.Engine.getSpotDef(id);
        return spot ? spot.label : id;
      }

      function renderInsights(aside) {
        const context = studyContext();
        if (!context) return;
        const analytics = rangeAnalytics(context);

        aside.appendChild(dashPanel('Análisis del rango', body => {
          body.appendChild(statLine('Combos', `${analytics.total} / 1326`));
          body.appendChild(statLine(
            'Rango', `${analytics.pct.toFixed(1)}%`));
        }));

        if (Object.keys(analytics.byAction).length) {
          aside.appendChild(dashPanel('Leyenda', body => {
            Object.keys(analytics.byAction).forEach(actionId => {
              const action = RT.Engine.getActionDef(actionId);
              const row = el('div', 'viewer-legend-row');
              const dot = el('span', 'viewer-legend-dot');
              dot.style.backgroundColor = RT.MatrixTools.getActionColor(actionId) ||
                (action ? action.color : '#4c6a86');
              row.appendChild(dot);
              row.appendChild(el('span', '', action ? action.label : actionId));
              body.appendChild(row);
            });
          }));
          aside.appendChild(dashPanel('Distribución por acción', body => {
            Object.keys(analytics.byAction).forEach(actionId => {
              const action = RT.Engine.getActionDef(actionId);
              body.appendChild(barRow(
                action ? action.label : actionId,
                analytics.byAction[actionId] / analytics.total * 100,
                `${analytics.byAction[actionId]} · ` +
                  `${Math.round(analytics.byAction[actionId] / analytics.total * 100)}%`,
                RT.MatrixTools.getActionColor(actionId) || (action ? action.color : null)
              ));
            });
          }));
          aside.appendChild(dashPanel('Familias de manos', body => {
            [
              ['Suited', analytics.fam.suited],
              ['Offsuit', analytics.fam.offsuit],
              ['Parejas', analytics.fam.pairs]
            ].forEach(([label, combos]) => {
              body.appendChild(barRow(
                label,
                analytics.total ? combos / analytics.total * 100 : 0,
                `${combos} · ${analytics.total
                  ? Math.round(combos / analytics.total * 100)
                  : 0}%`
              ));
            });
          }));
        }

        if (RT.Stats.hasData) {
          const summary = RT.Stats.getSummary();
          aside.appendChild(dashPanel('Progreso global', body => {
            body.appendChild(statLine(
              'Acierto', `${summary.totals.pct}%`));
            body.appendChild(statLine('Respuestas', summary.answered));
            if (summary.spotEdge.best) {
              body.appendChild(statLine(
                'Spot fuerte',
                `${spotLabel(summary.spotEdge.best.key)} · ` +
                  `${summary.spotEdge.best.pct}%`
              ));
              body.appendChild(statLine(
                'Spot débil',
                `${spotLabel(summary.spotEdge.worst.key)} · ` +
                  `${summary.spotEdge.worst.pct}%`
              ));
            }
          }));
        }
      }

      return {
        renderPanel: renderPanelView,
        renderInsights,
        reconcileSelection,
        openShortcuts: openShortcutsModal,
        openCommandPalette
      };
    }
  };

})(window.RT);
