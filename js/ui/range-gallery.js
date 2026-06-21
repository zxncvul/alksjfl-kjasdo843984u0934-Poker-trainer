/* ============================================================================
 * range-gallery.js - Biblioteca visual y selector de contextos.
 *
 * Es responsable de catálogo, filtros, multiselección, miniaturas y scroll.
 * No conoce paneles ni quizzes: recibe el estado del workspace y callbacks
 * mínimos. Esta frontera permite reutilizar la biblioteca en módulos futuros.
 * ==========================================================================*/
'use strict';

(function (RT) {

  RT.RangeGallery = {
    create(options) {
      const {
        ui, root, toolkit, rangeAnalytics, colorOf, onContextSelected, renderAll
      } = options;
      const { el, button, hint } = toolkit;
      const contextsCache = new Map();

      function contextId(context) {
        return RT.Engine.contextId(context);
      }

      function contexts() {
        if (contextsCache.has(ui.source)) return contextsCache.get(ui.source);
        const items = RT.Engine.getContexts({ source: ui.source })
          .map(context => ({ context, actions: RT.Engine.availableActions(context) }))
          .filter(item => item.actions.length);
        contextsCache.set(ui.source, items);
        return items;
      }

      function selectedContexts() {
        return contexts()
          .map(item => item.context)
          .filter(context => ui.gallerySelection.has(contextId(context)));
      }

      function selectedIds() {
        return selectedContexts().map(contextId);
      }

      function tag(label) {
        return String(label || '').trim().toLocaleLowerCase('es');
      }

      function itemTags(item) {
        const spot = RT.Engine.getSpotDef(item.context.spot);
        return new Set([tag(spot ? spot.label : item.context.spot)]);
      }

      function categories(items) {
        const found = new Map();
        items.forEach(item => {
          const spot = RT.Engine.getSpotDef(item.context.spot);
          const label = spot ? spot.label : item.context.spot;
          const id = tag(label);
          if (id && !found.has(id)) found.set(id, { id, label });
        });
        return Array.from(found.values());
      }

      function miniGrid(context, revealRange) {
        const grid = el('div', 'gallery-mini-grid' + (revealRange ? '' : ' is-concealed'));
        grid.setAttribute('aria-hidden', 'true');
        if (!revealRange) return grid;
        const map = RT.Engine.getActionMap(context);
        for (let row = 0; row < 13; row++) {
          for (let column = 0; column < 13; column++) {
            const hand = RT.Hands.MATRIX[row][column];
            const cell = el('span', 'gallery-mini-cell');
            if (map[hand]) {
              cell.style.setProperty('--cell-color', colorOf(map[hand]));
              cell.classList.add('is-filled');
            }
            grid.appendChild(cell);
          }
        }
        return grid;
      }

      function revealsRanges() {
        if (ui.mode === 'study') return true;
        if (ui.mode === 'training' && ui.trainingMode === 'range') {
          return ['idle', 'finished'].includes(RT.RangeQuiz.state.status);
        }
        if (ui.mode === 'training' && ui.trainingMode === 'questions') {
          return ['idle', 'finished'].includes(RT.SurgicalQuiz.state.status);
        }
        return ['idle', 'finished'].includes(RT.Simulator.state.status);
      }

      function selectContext(context) {
        ui.study.spot = context.spot;
        ui.study.relative = context.relative;
        ui.study.hero = context.hero;
        ui.study.vs = context.vs;
        ui.study.highlightAction = null;
        ui.study.heatmap = null;
        onContextSelected(context);
      }

      function toggleContext(context) {
        const id = contextId(context);
        if (ui.gallerySelection.has(id)) ui.gallerySelection.delete(id);
        else ui.gallerySelection.add(id);
        selectContext(context);
      }

      function visibleItems(items) {
        const byCategory = ui.galleryFilter === 'all'
          ? items
          : items.filter(item => itemTags(item).has(ui.galleryFilter));
        const hasRelativeDimension = items.some(item => item.context.relative);
        if (!hasRelativeDimension || ui.galleryRelatives.size === 2) return byCategory;
        return byCategory.filter(item =>
          !item.context.relative || ui.galleryRelatives.has(item.context.relative));
      }

      function render() {
        if (!root) return;
        root.innerHTML = '';
        root.hidden = false;

        const items = contexts();
        const filterCategories = categories(items);
        if (ui.galleryFilter !== 'all' &&
            !filterCategories.some(category => category.id === ui.galleryFilter)) {
          ui.galleryFilter = 'all';
        }

        const head = el('div', 'range-gallery-head');
        const heading = el('div', 'range-gallery-heading');
        heading.appendChild(el('span', 'range-gallery-kicker', 'Biblioteca de rangos'));
        heading.appendChild(el('span', 'range-gallery-count',
          `${ui.gallerySelection.size} seleccionados · ${items.length} contextos`));
        head.appendChild(heading);

        const filters = el('div', 'range-gallery-filters');
        [{ id: 'all', label: 'Todos' }].concat(filterCategories).forEach(category => {
          filters.appendChild(button(category.label, {
            active: ui.galleryFilter === category.id,
            variant: 'range-filter-btn',
            help: `Muestra los rangos relacionados con ${category.label}.`,
            onClick: () => {
              ui.galleryFilter = category.id;
              ui.galleryScroll = 0;
              render();
            }
          }));
        });
        head.appendChild(filters);

        if (items.some(item => item.context.relative)) {
          const relativeFilters = el('div', 'range-gallery-relative-filters');
          ['IP', 'OOP'].forEach(relative => {
            relativeFilters.appendChild(button(relative, {
              active: ui.galleryRelatives.has(relative),
              variant: 'range-filter-btn',
              help: `Muestra u oculta los repertorios ${relative}.`,
              onClick: () => {
                if (ui.galleryRelatives.has(relative)) {
                  if (ui.galleryRelatives.size === 1) return;
                  ui.galleryRelatives.delete(relative);
                } else {
                  ui.galleryRelatives.add(relative);
                }
                ui.galleryScroll = 0;
                renderAll();
              }
            }));
          });
          head.appendChild(relativeFilters);
        }

        const actions = el('div', 'range-gallery-actions');
        if (ui.mode === 'study' || ui.mode === 'training') {
          const labelsButton = el('button', 'icon-btn range-gallery-eye-btn' +
            (ui.showLabels ? '' : ' is-active'));
          labelsButton.type = 'button';
          labelsButton.title = ui.showLabels
            ? 'Ocultar etiquetas de mano'
            : 'Mostrar etiquetas de mano';
          labelsButton.setAttribute('aria-label', labelsButton.title);
          labelsButton.setAttribute('aria-pressed', String(!ui.showLabels));
          labelsButton.innerHTML = ui.showLabels
            ? '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>'
            : '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.9 17.9A10.7 10.7 0 0 1 12 20C5 20 1 12 1 12a18.2 18.2 0 0 1 5.1-5.9M9.9 4.2A10.7 10.7 0 0 1 12 4c7 0 11 8 11 8a18.6 18.6 0 0 1-2.2 3.2M3 3l18 18"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>';
          labelsButton.addEventListener('click', () => {
            ui.showLabels = !ui.showLabels;
            renderAll();
          });
          actions.appendChild(labelsButton);
        }
        actions.appendChild(button('Seleccionar visibles', {
          variant: 'btn-ghost range-filter-btn',
          onClick: () => {
            visibleItems(items).forEach(item =>
              ui.gallerySelection.add(contextId(item.context)));
            renderAll();
          }
        }));
        actions.appendChild(button('Limpiar', {
          variant: 'btn-ghost range-filter-btn',
          disabled: ui.gallerySelection.size === 0,
          onClick: () => {
            ui.gallerySelection.clear();
            renderAll();
          }
        }));
        head.appendChild(actions);
        root.appendChild(head);

        const track = el('div', 'range-gallery-track');
        const revealRange = revealsRanges();
        const visible = visibleItems(items);

        visible.forEach(item => {
          const context = item.context;
          const analytics = rangeAnalytics(context);
          const active = ui.study.spot === context.spot &&
            ui.study.hero === context.hero &&
            ui.study.relative === context.relative &&
            ui.study.vs === context.vs;
          const selected = ui.gallerySelection.has(contextId(context));
          const card = el('button', 'range-card' +
            (active ? ' is-active' : '') + (selected ? ' is-selected' : ''));
          card.type = 'button';
          card.dataset.help = `Carga ${RT.Engine.describeContext(context)} en el visualizador principal.`;
          card.setAttribute('aria-pressed', String(selected));
          if (active) card.setAttribute('aria-current', 'true');
          card.addEventListener('click', () => {
            ui.galleryScroll = track.scrollLeft;
            if (ui.mode === 'study') {
              const id = contextId(context);
              if (ui.gallerySelection.has(id)) ui.gallerySelection.delete(id);
              else ui.gallerySelection.add(id);
              selectContext(context);
            } else {
              toggleContext(context);
            }
          });

          const cardHead = el('div', 'range-card-head');
          cardHead.appendChild(el('strong', 'range-card-title',
            RT.Engine.describeContext(context)));
          const activeLabel = el('span', 'range-card-active',
            active ? 'Activo' : (selected ? 'Sel.' : ''));
          activeLabel.hidden = !active && !selected;
          cardHead.appendChild(activeLabel);
          card.appendChild(cardHead);
          card.appendChild(miniGrid(context, revealRange));

          const metrics = el('div', 'range-card-metrics');
          metrics.appendChild(el('strong', '', `${analytics.pct.toFixed(1)}%`));
          metrics.appendChild(el('span', '', `${analytics.total} combos`));
          card.appendChild(metrics);
          track.appendChild(card);
        });

        if (!visible.length) track.appendChild(hint('No hay rangos para este filtro.'));
        wireScroll(track);
        root.appendChild(track);
        track.classList.add('is-restoring');
        track.scrollLeft = ui.galleryScroll;
        requestAnimationFrame(() => track.classList.remove('is-restoring'));
      }

      function wireScroll(track) {
        track.addEventListener('wheel', event => {
          if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
          if (track.scrollWidth <= track.clientWidth) return;
          const before = track.scrollLeft;
          track.scrollLeft += event.deltaY;
          if (track.scrollLeft !== before) event.preventDefault();
        }, { passive: false });

        let pointerDown = false;
        let dragging = false;
        let originX = 0;
        let originScroll = 0;
        let activePointer = null;

        track.addEventListener('pointerdown', event => {
          if (event.button !== 0) return;
          pointerDown = true;
          dragging = false;
          activePointer = event.pointerId;
          originX = event.clientX;
          originScroll = track.scrollLeft;
        });
        track.addEventListener('pointermove', event => {
          if (!pointerDown || event.pointerId !== activePointer) return;
          if (!dragging && Math.abs(event.clientX - originX) > 6) {
            dragging = true;
            track.classList.add('is-dragging');
            track.setPointerCapture(event.pointerId);
          }
          if (!dragging) return;
          track.scrollLeft = originScroll - (event.clientX - originX);
          event.preventDefault();
        });
        const stop = event => {
          if (!pointerDown || event.pointerId !== activePointer) return;
          const wasDragging = dragging;
          pointerDown = false;
          dragging = false;
          activePointer = null;
          track.classList.remove('is-dragging');
          if (track.hasPointerCapture(event.pointerId)) {
            track.releasePointerCapture(event.pointerId);
          }
          if (wasDragging) {
            track.dataset.suppressClick = 'true';
            setTimeout(() => { delete track.dataset.suppressClick; }, 0);
          }
        };
        track.addEventListener('pointerup', stop);
        track.addEventListener('pointercancel', stop);
        track.addEventListener('click', event => {
          if (!track.dataset.suppressClick) return;
          event.preventDefault();
          event.stopPropagation();
        }, true);
        track.addEventListener('scroll', () => {
          ui.galleryScroll = track.scrollLeft;
        }, { passive: true });
      }

      return {
        render, contextId, contexts, selectedContexts, selectedIds, selectContext
      };
    }
  };

})(window.RT);
