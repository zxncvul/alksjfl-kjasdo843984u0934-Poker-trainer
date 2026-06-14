/* ============================================================================
 * surgical-quiz-ui.js - Vista de preguntas individuales.
 *
 * RT.SurgicalQuiz conserva la generación y evaluación. Esta vista configura
 * contextos y limita las manos objetivo mediante filtros combinables.
 * ==========================================================================*/
'use strict';

(function (RT) {

  RT.SurgicalQuizUI = {
    create(ctx) {
      const {
        ui, hot, toolkit, promptCard, scoreCard,
        selectedContextIds, common, results
      } = ctx;
      const { el, button, group, collapsible, hint } = toolkit;

      const ACTION_GROUPS = [
        { id: 'fold', label: 'Fold', matches: id => id === 'FOLD' || id.startsWith('FOLD_') },
        { id: 'call', label: 'Call', matches: id => id === 'CALL' || id.startsWith('CALL_') },
        { id: 'or', label: 'OR', matches: id => id === 'OR' },
        { id: '3bet', label: '3Bet', matches: id => id === '3BET' || id.startsWith('3BET_') },
        { id: '4bet', label: '4Bet', matches: id => id === '4BET' }
      ];

      function actionsInData() {
        const available = new Set();
        RT.Engine.getContexts({ source: ui.source }).forEach(context => {
          RT.Engine.availableActions(context)
            .forEach(action => available.add(action));
        });
        return available;
      }

      function availableActionGroups() {
        const available = actionsInData();
        return ACTION_GROUPS.filter(groupDef =>
          Array.from(available).some(groupDef.matches));
      }

      function expandedActions(selectedGroups) {
        if (!selectedGroups || !selectedGroups.size) return [];
        const available = actionsInData();
        return Array.from(available).filter(actionId =>
          ACTION_GROUPS.some(groupDef =>
            selectedGroups.has(groupDef.id) && groupDef.matches(actionId)));
      }

      function options(extra) {
        const config = ui.surgicalConfig;
        const contexts = selectedContextIds();
        const result = common.configOptions(config, ui.source);
        if (contexts.length) {
          result.spots = [];
          result.relatives = [];
          result.heroes = [];
        }
        return Object.assign(result, {
          actions: expandedActions(config.actionGroups),
          levels: Array.from(config.levels),
          handFilter: {
            ranks: Array.from(config.ranks),
            families: Array.from(config.families)
          },
          contexts,
          groupBy: common.groupByFromSettings(),
          limit: RT.Settings.get('questionsPerSession') || 0,
          requeueFails: RT.Settings.get('repeatUntilMastered')
        }, extra || {});
      }

      function filterBadge(config) {
        const count = config.ranks.size + config.families.size +
          config.actionGroups.size + config.levels.size;
        return count ? `${count} filtros` : '';
      }

      function filterGrid(title, items, selected, className) {
        const wrap = el('div', `training-filter ${className || ''}`.trim());
        wrap.appendChild(el('div', 'panel-group-title', title));
        const controls = el('div', 'training-filter-grid');
        items.forEach(item => {
          controls.appendChild(button(item.label, {
            active: selected.has(item.id),
            onClick: () => {
              if (selected.has(item.id)) selected.delete(item.id);
              else selected.add(item.id);
              common.renderPanel();
            }
          }));
        });
        wrap.appendChild(controls);
        return wrap;
      }

      function renderFailedTraining(panel) {
        const failed = RT.Stats.getFailedIds({})
          .filter(id => !id.startsWith('sim@') && !id.startsWith('range@'));
        if (!failed.length) return;
        const dimensions = RT.Stats.getFailedDims({
          excludePrefixes: ['sim@', 'range@']
        });

        panel.appendChild(collapsible(
          'surgical-failed', 'Repasar falladas', body => {
            const base = {
              source: ui.source,
              actions: ['FOLD'].concat(
                RT.Engine.getActionsCatalog().map(action => action.id))
            };

            function startIds(filters) {
              let ids = RT.Stats.getFailedIds(filters)
                .filter(id =>
                  !id.startsWith('sim@') && !id.startsWith('range@'));
              if (filters.mode === 'recent') ids = ids.slice(0, 25);
              if (!RT.SurgicalQuiz.startFromIds(base, ids)) {
                body.appendChild(hint(
                  'No se pudieron reconstruir esas preguntas.'));
              }
            }

            body.appendChild(group('', [
              button(`Recientes (${Math.min(failed.length, 25)})`, {
                onClick: () => startIds({ mode: 'recent' })
              }),
              button('Más falladas', {
                onClick: () => startIds({ mode: 'frequent' })
              })
            ]));
            if (dimensions.heroes.length > 1) {
              body.appendChild(group(
                'Por posición',
                dimensions.heroes.map(hero => button(hero, {
                  onClick: () => startIds({ mode: 'recent', hero })
                }))
              ));
            }
            if (dimensions.actions.length > 1) {
              body.appendChild(group(
                'Por acción',
                dimensions.actions.map(actionId => {
                  const action = RT.Engine.getActionDef(actionId);
                  return button(action ? action.label : actionId, {
                    onClick: () => startIds({
                      mode: 'recent', action: actionId
                    })
                  });
                })
              ));
            }
          },
          { badge: String(failed.length) }
        ));
      }

      function renderSetup(panel, state, config) {
        if (state.status === 'finished') {
          panel.appendChild(scoreCard(
            state.isFailRun
              ? 'Repaso de fallos completado'
              : 'Sesión completada',
            state.score,
            state.pool.length
          ));
          if (state.failedQuestions.length) {
            panel.appendChild(group('', [
              button(
                `Repasar ${state.failedQuestions.length} fallo` +
                  `${state.failedQuestions.length === 1 ? '' : 's'}`,
                {
                  variant: 'btn-primary',
                  onClick: () => RT.SurgicalQuiz.startFailRun()
                }
              )
            ]));
          }
        }

        panel.appendChild(hint(
          'Construye el conjunto exacto de manos que quieres entrenar.'));
        panel.appendChild(group('Sesión rápida', [10, 25, 50].map(limit =>
          button(`${limit} preguntas`, {
            onClick: () => RT.SurgicalQuiz.start(options({ limit }))
          })
        )));

        common.renderFavoriteStarts(panel, favorite => {
          RT.SurgicalQuiz.start(options({
            spots: [favorite.spot],
            heroes: [favorite.hero],
            relatives: favorite.relative ? [favorite.relative] : []
          }));
        });
        renderFailedTraining(panel);

        panel.appendChild(collapsible(
          'surgical-what', 'Qué entrenar', body => {
            body.appendChild(filterGrid(
              'Por carta',
              RT.Hands.RANKS.map(rank => ({ id: rank, label: rank })),
              config.ranks,
              'is-ranks'
            ));
            body.appendChild(filterGrid(
              'Familias',
              [
                { id: 'suited', label: 'Suited' },
                { id: 'offsuit', label: 'Offsuit' },
                { id: 'pair', label: 'Parejas' },
                { id: 'connector', label: 'Conectores' }
              ],
              config.families,
              'is-families'
            ));
            body.appendChild(filterGrid(
              'Acciones',
              availableActionGroups(),
              config.actionGroups,
              'is-actions'
            ));
            body.appendChild(filterGrid(
              'Nivel',
              [
                { id: 1, label: 'Básico' },
                { id: 2, label: 'Medio' },
                { id: 3, label: 'Avanzado' }
              ],
              config.levels,
              'is-levels'
            ));
          },
          { badge: filterBadge(config) }
        ));

        panel.appendChild(collapsible(
          'surgical-where', 'Dónde entrenar', body => {
            if (ui.gallerySelection.size) {
              body.appendChild(hint(
                `${ui.gallerySelection.size} repertorio` +
                `${ui.gallerySelection.size === 1 ? '' : 's'} ` +
                `seleccionado${ui.gallerySelection.size === 1 ? '' : 's'} ` +
                'en la biblioteca.'
              ));
            } else {
              common.renderContextConfig(body, config, common.renderPanel);
            }
          }
        ));

        const count = RT.SurgicalQuiz.countQuestions(options({ limit: 0 }));
        panel.appendChild(group('', [
          button(
            `Empezar · ${count} pregunta${count === 1 ? '' : 's'}`,
            {
              variant: 'btn-primary',
              disabled: count === 0,
              onClick: () => RT.SurgicalQuiz.start(options())
            }
          )
        ]));
      }

      function renderPanel(panel) {
        const state = RT.SurgicalQuiz.state;
        const config = ui.surgicalConfig;

        if (state.status === 'idle' || state.status === 'finished') {
          renderSetup(panel, state, config);
          return;
        }

        const question = RT.SurgicalQuiz.current;
        const progress = `Pregunta ${state.index + 1} de ${state.pool.length}`;
        if (state.status === 'running') {
          panel.appendChild(promptCard(
            question.text,
            progress,
            'Selecciona las manos en la matriz.'
          ));
          hot.surgicalCheckBtn = button('Comprobar', {
            variant: 'btn-primary',
            key: 'Enter',
            disabled: state.selected.size === 0,
            onClick: () => RT.SurgicalQuiz.check()
          });
          panel.appendChild(group('', [
            hot.surgicalCheckBtn,
            button('Salir', {
              variant: 'btn-ghost',
              onClick: () => RT.SurgicalQuiz.stop()
            })
          ]));
          return;
        }

        panel.appendChild(promptCard(question.text, progress));
        common.renderMetaCard(panel, question.meta);
        results.renderControls(panel);
        panel.appendChild(group('', [
          button('Siguiente →', {
            variant: 'btn-primary',
            key: 'N',
            onClick: () => RT.SurgicalQuiz.next()
          }),
          button('Salir', {
            variant: 'btn-ghost',
            onClick: () => RT.SurgicalQuiz.stop()
          })
        ]));
      }

      return { options, renderPanel, renderFailedTraining };
    }
  };

})(window.RT);
