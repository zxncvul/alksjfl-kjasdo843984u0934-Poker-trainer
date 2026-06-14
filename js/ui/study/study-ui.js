/* ============================================================================
 * study-ui.js - Vista completa del modo Estudio.
 *
 * create(ctx) recibe estado visual, toolkit y callbacks del workspace. El
 * módulo consulta RT.Engine/Stats/Favorites, pero no controla navegación ni
 * conserva una segunda copia del contexto activo.
 * ==========================================================================*/
'use strict';

(function (RT) {

  RT.StudyUI = {
    create(ctx) {
      const {
        ui, toolkit, studyContext, rangeAnalytics,
        renderAll, renderPanel
      } = ctx;
      const {
        el, button, group, selectGroup, multiSelectGroup,
        collapsible, hint, dashPanel, statLine, barRow
      } = toolkit;

      function reconcileSelection() {
        const state = ui.study;
        const source = ui.source;
        state.highlightAction = null;
        if (!state.spot) return;

        if (RT.Engine.spotNeedsRelative(state.spot)) {
          const relatives = RT.Engine.availableRelatives({
            source, spot: state.spot
          });
          if (!relatives.includes(state.relative)) {
            state.relative = relatives[0] || null;
          }
        } else {
          state.relative = null;
        }

        const heroes = RT.Engine.availableHeroes({
          source, spot: state.spot, relative: state.relative
        });
        if (!heroes.includes(state.hero)) state.hero = heroes[0] || null;

        if (RT.Engine.spotNeedsVs(state.spot)) {
          const opponents = RT.Engine.availableVs({
            source,
            spot: state.spot,
            hero: state.hero,
            relative: state.relative
          });
          if (!opponents.includes(state.vs)) state.vs = opponents[0] || null;
        } else {
          state.vs = null;
        }
      }

      function renderPanelView(panel) {
        const state = ui.study;
        const source = ui.source;
        const context = studyContext();
        const summary = el('div', 'context-card');
        const head = el('div', 'context-head');

        if (context) {
          head.appendChild(el(
            'div', 'context-main', RT.Engine.describeContext(context)));
          const favorite = el(
            'button',
            'fav-btn' + (RT.Favorites.has(context) ? ' is-fav' : ''),
            RT.Favorites.has(context) ? '★' : '☆'
          );
          favorite.type = 'button';
          favorite.title = 'Marcar como favorito';
          favorite.addEventListener('click', () => {
            RT.Favorites.toggle(context);
            renderPanel();
          });
          head.appendChild(favorite);
          summary.appendChild(head);

          const spot = RT.Engine.getSpotDef(context.spot);
          const detail = state.heatmap
            ? (state.heatmap === 'fails'
                ? 'Heatmap: manos más falladas'
                : 'Heatmap: manos más dominadas')
            : (spot ? spot.description : context.spot) +
              (state.highlightAction
                ? ` · Solo ${RT.Engine.getActionDef(state.highlightAction).label}`
                : ' · Todas las acciones');
          summary.appendChild(el('div', 'context-sub', detail));
        } else {
          head.appendChild(el('div', 'context-main', 'Contexto incompleto'));
          summary.appendChild(head);
          summary.appendChild(el(
            'div', 'context-sub',
            'Elige situación y posición para ver el rango.'
          ));
        }
        panel.appendChild(summary);

        const spots = RT.Engine.availableSpots(source);
        panel.appendChild(selectGroup(
          'Situación',
          spots.map(id => ({ id, label: RT.Engine.getSpotDef(id).label })),
          state.spot,
          value => {
            state.spot = value;
            reconcileSelection();
            renderAll();
          }
        ));
        if (!state.spot) return;

        if (RT.Engine.spotNeedsRelative(state.spot)) {
          const relatives = RT.Engine.availableRelatives({
            source, spot: state.spot
          });
          panel.appendChild(selectGroup(
            'Posición relativa',
            relatives.map(relative => ({
              id: relative,
              label: relative === 'IP'
                ? 'IP · en posición'
                : 'OOP · fuera de posición'
            })),
            state.relative,
            value => {
              state.relative = value;
              reconcileSelection();
              renderAll();
            }
          ));
        }

        const heroes = RT.Engine.availableHeroes({
          source, spot: state.spot, relative: state.relative
        });
        panel.appendChild(selectGroup(
          'Tu posición',
          RT.Hands.POSITIONS.map(position => ({
            id: position,
            label: position,
            disabled: !heroes.includes(position)
          })),
          state.hero,
          value => {
            state.hero = value;
            reconcileSelection();
            renderAll();
          }
        ));

        if (RT.Engine.spotNeedsVs(state.spot)) {
          const opponents = RT.Engine.availableVs({
            source,
            spot: state.spot,
            hero: state.hero,
            relative: state.relative
          });
          panel.appendChild(selectGroup(
            'Rival / opener',
            opponents.map(position => ({ id: position, label: position })),
            state.vs,
            value => {
              state.vs = value;
              renderAll();
            }
          ));
        }
        if (!context) return;

        const actionOptions = [{ id: '', label: 'Todas las acciones' }];
        RT.Engine.availableActions(context).forEach(actionId => {
          const action = RT.Engine.getActionDef(actionId);
          const stats = RT.Hands.comboStats(
            RT.Engine.getRange(context, actionId));
          actionOptions.push({
            id: actionId,
            label: action.label + (RT.Settings.get('showCombos')
              ? ` · ${stats.total} combos`
              : '')
          });
        });
        panel.appendChild(selectGroup(
          'Acción',
          actionOptions,
          state.highlightAction || '',
          value => {
            state.highlightAction = value || null;
            state.heatmap = null;
            renderAll();
          }
        ));

        const favorites = RT.Favorites.list();
        if (favorites.length) {
          panel.appendChild(collapsible('study-favs', 'Favoritos', body => {
            const row = el('div', 'btn-row');
            favorites.forEach(favorite => {
              const favoriteContext = {
                source,
                spot: favorite.spot,
                hero: favorite.hero,
                relative: favorite.relative,
                vs: favorite.vs || null
              };
              row.appendChild(button(
                RT.Engine.describeContext(favoriteContext),
                {
                  onClick: () => {
                    state.spot = favorite.spot;
                    state.relative = favorite.relative;
                    state.hero = favorite.hero;
                    state.vs = favorite.vs || null;
                    state.highlightAction = null;
                    state.heatmap = null;
                    renderAll();
                  }
                }
              ));
            });
            body.appendChild(row);
          }, { badge: String(favorites.length) }));
        }

        panel.appendChild(collapsible(
          'study-filters', 'Filtros de manos', body => {
            const filters = state.filters;
            body.appendChild(group(
              'Por carta',
              RT.Hands.RANKS.map(rank => button(rank, {
                active: filters.ranks.has(rank),
                help: `Filtra manos que contienen ${rank}.`,
                onClick: () => {
                  if (filters.ranks.has(rank)) filters.ranks.delete(rank);
                  else filters.ranks.add(rank);
                  renderAll();
                }
              })),
              'study-rank-filters'
            ));
            const toggles = [
              ['suited', 'S', 'Suited'],
              ['offsuit', 'O', 'Offsuit'],
              ['pair', 'PP', 'Parejas'],
              ['connector', 'SC', 'Suited connectors']
            ].map(([key, label, title]) => button(label, {
              active: filters[key],
              title,
              onClick: () => {
                filters[key] = !filters[key];
                renderAll();
              }
            }));
            toggles.push(button('×', {
              variant: 'btn-ghost',
              title: 'Limpiar familias',
              onClick: () => {
                filters.ranks.clear();
                filters.suited = false;
                filters.offsuit = false;
                filters.pair = false;
                filters.connector = false;
                renderAll();
              }
            }));
            body.appendChild(group('Familias', toggles, 'study-family-filters'));
          }
        ));

        if (RT.Stats.hasData) {
          panel.appendChild(collapsible(
            'study-heatmap', 'Heatmap de progreso', body => {
              body.appendChild(hint(
                'Calor directamente sobre la matriz: sin listas.'));
              body.appendChild(group('', [
                button('Off', {
                  active: !state.heatmap,
                  onClick: () => {
                    state.heatmap = null;
                    renderAll();
                  }
                }),
                button('Fallos', {
                  active: state.heatmap === 'fails',
                  onClick: () => {
                    state.heatmap = 'fails';
                    renderAll();
                  }
                }),
                button('Acierto', {
                  active: state.heatmap === 'mastery',
                  onClick: () => {
                    state.heatmap = 'mastery';
                    renderAll();
                  }
                })
              ], 'study-heatmap-filters'));
            },
            { badge: state.heatmap ? 'ON' : '' }
          ));
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
          aside.appendChild(dashPanel('Distribución por acción', body => {
            Object.keys(analytics.byAction).forEach(actionId => {
              const action = RT.Engine.getActionDef(actionId);
              body.appendChild(barRow(
                action ? action.label : actionId,
                analytics.byAction[actionId] / analytics.total * 100,
                `${analytics.byAction[actionId]} · ` +
                  `${Math.round(analytics.byAction[actionId] / analytics.total * 100)}%`,
                action ? action.color : null
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
        reconcileSelection
      };
    }
  };

})(window.RT);
