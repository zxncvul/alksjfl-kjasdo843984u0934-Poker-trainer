/* ============================================================================
 * quiz-results-ui.js - Revisión y métricas comunes de los quizzes.
 *
 * El módulo recibe callbacks para repintar matriz y panel. Así mantiene el
 * estado de revisión dentro del workspace sin conocer sus nodos privados.
 * ==========================================================================*/
'use strict';

(function (RT) {

  RT.QuizResultsUI = {
    create(ctx) {
      const {
        ui, toolkit, session, rollingAccuracy,
        renderGrid, renderPanel, panelElement
      } = ctx;
      const { el, button, chip, dashPanel, statLine, barRow, sparkline, hint } = toolkit;

      function categoryLabel(id) {
        const category = RT.SurgicalQuiz.getCategories()
          .find(item => item.id === id);
        return category ? category.label : (id || '—');
      }

      function currentReview() {
        if (ui.mode === 'training' && ui.trainingMode === 'range' &&
            RT.RangeQuiz.state.status === 'review') {
          const result = RT.RangeQuiz.state.result;
          return {
            result,
            targetHands: Object.keys(RT.RangeQuiz.current.target),
            groups: [
              ['ok', 'Correctas', result.correct],
              ['wrong', 'Acción equivocada', result.wrongAction],
              ['extra', 'Sobrantes', result.extra],
              ['missing', 'Faltantes', result.missing]
            ]
          };
        }
        if (ui.mode === 'training' && ui.trainingMode === 'questions' &&
            RT.SurgicalQuiz.state.status === 'review') {
          const result = RT.SurgicalQuiz.state.result;
          return {
            result,
            targetHands: Array.from(RT.SurgicalQuiz.current.target),
            groups: [
              ['ok', 'Correctas', result.correct],
              ['extra', 'Sobrantes', result.extra],
              ['missing', 'Faltantes', result.missing]
            ]
          };
        }
        return null;
      }

      function refresh() {
        const panel = panelElement();
        const scrollTop = panel.scrollTop;
        renderGrid();
        renderPanel();
        panel.scrollTop = scrollTop;
      }

      function comboCount(hands) {
        return RT.Hands.comboStats(hands).total;
      }

      function renderControls(panel) {
        const review = currentReview();
        if (!review) return;
        const { result, targetHands, groups } = review;
        const box = el('section', 'review-panel');
        const okCombos = comboCount(result.correct);
        const totalCombos = comboCount(targetHands);
        const percentage = totalCombos
          ? Math.round(okCombos / totalCombos * 100)
          : 0;

        const head = el('div', 'review-head');
        head.appendChild(el(
          'span',
          'review-verdict ' + (result.isPerfect ? 'is-ok' : 'is-fail'),
          result.isPerfect ? 'PERFECTO' : 'CON FALLOS'
        ));
        head.appendChild(el(
          'span', 'review-pct',
          `${percentage}% · ${okCombos}/${totalCombos} combos`
        ));
        box.appendChild(head);

        const chips = el('div', 'review-chips');
        groups.forEach(([key, label, hands]) => {
          if (key !== 'ok' && !hands.length) return;
          chips.appendChild(chip(label, hands.length, key, {
            active: ui.review.focus === key,
            onClick: () => {
              ui.review.focus = ui.review.focus === key ? null : key;
              ui.review.view = 'compare';
              refresh();
            }
          }));
        });
        const errorCount = groups
          .filter(group => group[0] !== 'ok')
          .reduce((total, group) => total + group[2].length, 0);
        if (errorCount && groups.length > 2) {
          chips.appendChild(chip('Solo errores', errorCount, 'wrong', {
            active: ui.review.focus === 'errors',
            onClick: () => {
              ui.review.focus = ui.review.focus === 'errors' ? null : 'errors';
              ui.review.view = 'compare';
              refresh();
            }
          }));
        }
        box.appendChild(chips);

        const views = el('div', 'review-views');
        [
          ['compare', 'Comparar'],
          ['mine', 'Mi respuesta'],
          ['correct', 'Respuesta correcta']
        ].forEach(([view, label]) => {
          views.appendChild(button(label, {
            active: ui.review.view === view,
            onClick: () => {
              ui.review.view = view;
              if (view !== 'compare') ui.review.focus = null;
              refresh();
            }
          }));
        });
        views.appendChild(button('Ver todo', {
          variant: 'btn-ghost',
          disabled: ui.review.focus === null && ui.review.view === 'compare',
          onClick: () => {
            ui.review.focus = null;
            ui.review.view = 'compare';
            refresh();
          }
        }));
        box.appendChild(views);
        panel.appendChild(box);
      }

      function renderInsights(aside, kind) {
        const engineState = kind === 'range'
          ? RT.RangeQuiz.state
          : RT.SurgicalQuiz.state;
        const inSession = engineState.status === 'running' ||
          engineState.status === 'review';

        if (inSession && session.answers.length) {
          const answers = session.answers;
          const correct = answers.filter(answer => answer.perfect).length;
          const averageMs = answers.reduce((total, answer) => total + answer.ms, 0) /
            answers.length;
          aside.appendChild(dashPanel('Sesión', body => {
            body.appendChild(statLine('Respondidas', answers.length));
            body.appendChild(statLine(
              'Precisión', `${Math.round(correct / answers.length * 100)}%`));
            body.appendChild(statLine('Errores', answers.length - correct));
            body.appendChild(statLine('T. medio', `${(averageMs / 1000).toFixed(1)}s`));
            body.appendChild(sparkline(rollingAccuracy(answers)));
          }));

          const failCount = {};
          answers.forEach(answer => {
            (answer.failHands || []).forEach(hand => {
              failCount[hand] = (failCount[hand] || 0) + 1;
            });
          });
          const topFails = Object.keys(failCount)
            .sort((a, b) => failCount[b] - failCount[a])
            .slice(0, 6);
          if (topFails.length) {
            const max = failCount[topFails[0]];
            aside.appendChild(dashPanel('Manos más falladas', body => {
              topFails.forEach(hand => body.appendChild(barRow(
                hand,
                failCount[hand] / max * 100,
                String(failCount[hand]),
                'var(--wrong)'
              )));
            }));
          }

          if (kind === 'surgical') {
            const question = RT.SurgicalQuiz.current;
            if (question) {
              aside.appendChild(dashPanel('Pregunta actual', body => {
                body.appendChild(statLine(
                  'Categoría', categoryLabel(question.category)));
                const action = RT.Engine.getActionDef(question.action);
                body.appendChild(statLine(
                  'Acción', action ? action.label : question.action));
                body.appendChild(statLine('Nivel', question.level));
              }));
            }
            const categoryFails = {};
            answers.forEach(answer => {
              if (!answer.perfect && answer.category) {
                categoryFails[answer.category] =
                  (categoryFails[answer.category] || 0) + 1;
              }
            });
            const categories = Object.keys(categoryFails);
            if (categories.length) {
              const max = Math.max(...categories.map(id => categoryFails[id]));
              aside.appendChild(dashPanel('Errores por categoría', body => {
                categories
                  .sort((a, b) => categoryFails[b] - categoryFails[a])
                  .forEach(id => body.appendChild(barRow(
                    categoryLabel(id),
                    categoryFails[id] / max * 100,
                    String(categoryFails[id]),
                    'var(--wrong)'
                  )));
              }));
            }
          }
          return;
        }

        if (RT.Stats.hasData) {
          const summary = RT.Stats.getSummary();
          aside.appendChild(dashPanel('Histórico', body => {
            body.appendChild(statLine(
              'Acierto global', `${summary.totals.pct}%`));
            body.appendChild(statLine('Respuestas', summary.answered));
          }));
          const rows = kind === 'surgical'
            ? summary.byCategory
            : summary.byPosition;
          if (rows.length) {
            aside.appendChild(dashPanel(
              kind === 'surgical'
                ? 'Acierto por categoría'
                : 'Acierto por posición',
              body => {
                rows.slice(0, 7).forEach(row => body.appendChild(barRow(
                  kind === 'surgical' ? categoryLabel(row.key) : row.key,
                  row.pct === null ? 0 : row.pct,
                  row.pct === null ? '—' : `${row.pct}%`
                )));
              }
            ));
          }
        } else {
          aside.appendChild(dashPanel('Histórico', body => {
            body.appendChild(hint(
              'Completa una sesión para ver métricas aquí.'));
          }));
        }
      }

      return { currentReview, renderControls, renderInsights, refresh };
    }
  };

})(window.RT);
