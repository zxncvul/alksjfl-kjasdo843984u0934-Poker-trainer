/* ============================================================================
 * range-quiz-ui.js - Vista completa de Quiz Rango.
 *
 * El motor RT.RangeQuiz mantiene la sesión. Este módulo solo construye sus
 * opciones, pinta el panel y conserva referencias DOM de la ruta caliente.
 * ==========================================================================*/
'use strict';

(function (RT) {

  RT.RangeQuizUI = {
    create(ctx) {
      const {
        ui, hot, toolkit, promptCard, scoreCard,
        selectedContextIds, common, results
      } = ctx;
      const { el, button, group, collapsible, hint } = toolkit;

      function options(extra) {
        const config = ui.rangeQuizConfig;
        const contexts = selectedContextIds();
        const result = common.configOptions(config, ui.source);
        if (contexts.length) {
          result.spots = [];
          result.relatives = [];
          result.heroes = [];
        }
        return Object.assign(result, {
          includeFold: config.includeFold,
          contexts,
          groupBy: common.groupByFromSettings(),
          limit: RT.Settings.get('questionsPerSession') || 0
        }, extra || {});
      }

      function renderBrushBox() {
        if (!hot.brushBox) return;
        const state = RT.RangeQuiz.state;
        const exercise = RT.RangeQuiz.current;
        if (!exercise) return;
        hot.brushBox.innerHTML = '';
        const active = state.brush
          ? RT.Engine.getActionDef(state.brush)
          : null;
        hot.brushBox.appendChild(group(
          `Pincel activo: ${active ? active.label : '—'} · ` +
            `teclas 1-${Math.min(exercise.actions.length, 4)}`,
          exercise.actions.map((actionId, index) => {
            const action = RT.Engine.getActionDef(actionId);
            const control = button(action.label, {
              active: state.brush === actionId,
              key: index < 4 ? String(index + 1) : '',
              onClick: () => RT.RangeQuiz.setBrush(actionId)
            });
            control.style.setProperty('--btn-accent', action.color);
            control.classList.add('btn-action');
            return control;
          })
        ));
      }

      function renderPanel(panel) {
        const state = RT.RangeQuiz.state;
        const config = ui.rangeQuizConfig;

        if (state.status === 'idle' || state.status === 'finished') {
          if (state.status === 'finished') {
            panel.appendChild(scoreCard(
              'Sesión completada',
              state.score,
              state.score.ok + state.score.fail
            ));
          }
          panel.appendChild(hint('Pinta rangos completos de memoria.'));
          panel.appendChild(group('Sesión rápida', [5, 10].map(limit =>
            button(`${limit} ejercicios`, {
              onClick: () => RT.RangeQuiz.start(options({ limit }))
            })
          )));

          common.renderFavoriteStarts(panel, favorite => {
            RT.RangeQuiz.start(options({
              spots: [favorite.spot],
              heroes: [favorite.hero],
              relatives: favorite.relative ? [favorite.relative] : []
            }));
          });

          panel.appendChild(collapsible(
            'range-config', 'Configurar sesión', body => {
              if (ui.gallerySelection.size) {
                body.appendChild(hint(
                  `${ui.gallerySelection.size} repertorio` +
                  `${ui.gallerySelection.size === 1 ? '' : 's'} ` +
                  `seleccionado${ui.gallerySelection.size === 1 ? '' : 's'} ` +
                  'en la biblioteca.'
                ));
              } else {
                common.renderContextConfig(
                  body, config, common.renderPanel);
              }
              body.appendChild(group('Fold', [button(
                config.includeFold ? 'Incluir Fold: sí' : 'Incluir Fold: no',
                {
                  active: config.includeFold,
                  title: 'Si está activo, también hay que pintar las manos de Fold',
                  onClick: () => RT.Settings.set(
                    'includeFold', !config.includeFold)
                }
              )]));
            }
          ));

          const count = RT.RangeQuiz.countExercises(options({ limit: 0 }));
          panel.appendChild(group('', [
            button(
              `Empezar · ${count} ejercicio${count === 1 ? '' : 's'}`,
              {
                variant: 'btn-primary',
                disabled: count === 0,
                onClick: () => RT.RangeQuiz.start(options())
              }
            )
          ]));
          return;
        }

        const exercise = RT.RangeQuiz.current;
        const progress =
          `Ejercicio ${state.index + 1} de ${state.exercises.length}`;

        if (state.status === 'running') {
          let detail = exercise.actions.length > 1
            ? 'Hay varias acciones: pinta cada mano con su acción correcta usando el pincel.'
            : 'Marca todas las manos del rango.';
          if (!exercise.actions.includes('FOLD')) {
            detail += ' Fold no se pinta: lo que dejes sin marcar cuenta como fold.';
          }
          panel.appendChild(promptCard(
            `Pinta el rango completo: ` +
              RT.Engine.describeContext(exercise.context),
            progress,
            detail
          ));
          hot.brushBox = el('div');
          panel.appendChild(hot.brushBox);
          renderBrushBox();
          panel.appendChild(group('', [
            button('Comprobar', {
              variant: 'btn-primary',
              key: 'Enter',
              onClick: () => RT.RangeQuiz.check()
            }),
            button('Borrar todo', {
              variant: 'btn-ghost',
              key: 'R',
              onClick: () => RT.RangeQuiz.clearPaint()
            }),
            button('Salir', {
              variant: 'btn-ghost',
              onClick: () => RT.RangeQuiz.stop()
            })
          ]));
          return;
        }

        panel.appendChild(promptCard(
          RT.Engine.describeContext(exercise.context), progress));
        results.renderControls(panel);
        panel.appendChild(group('', [
          state.result.isPerfect
            ? button('Siguiente →', {
                variant: 'btn-primary',
                key: 'N',
                onClick: () => RT.RangeQuiz.next()
              })
            : button('Reintentar', {
                variant: 'btn-primary',
                key: 'R',
                onClick: () => RT.RangeQuiz.retry()
              }),
          !state.result.isPerfect && button('Siguiente →', {
            key: 'N',
            onClick: () => RT.RangeQuiz.next()
          }),
          button('Salir', {
            variant: 'btn-ghost',
            onClick: () => RT.RangeQuiz.stop()
          })
        ].filter(Boolean)));
      }

      return { options, renderBrushBox, renderPanel };
    }
  };

})(window.RT);
