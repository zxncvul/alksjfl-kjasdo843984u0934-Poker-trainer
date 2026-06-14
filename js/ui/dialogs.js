/* ============================================================================
 * dialogs.js - Configuración, estadísticas e importación/exportación.
 *
 * Centraliza los diálogos globales. No mantiene estado propio: Settings,
 * Stats y Progress siguen siendo las fuentes de verdad.
 * ==========================================================================*/
'use strict';

(function (RT) {

  RT.Dialogs = {
    create(options) {
      const { toolkit, renderAll } = options;
      const { el, button, group, hint, selectGroup } = toolkit;

      function settingToggle(label, key) {
        return button(`${label}: ${RT.Settings.get(key) ? 'sí' : 'no'}`, {
          active: !!RT.Settings.get(key),
          onClick: () => {
            RT.Settings.set(key, !RT.Settings.get(key));
            openConfig();
          }
        });
      }

      function settingSelect(label, key, items) {
        return selectGroup(label, items, RT.Settings.get(key), value => {
          const numeric = items.some(item => typeof item.id === 'number');
          RT.Settings.set(key, numeric ? Number(value) : value);
          openConfig();
        });
      }

      function openConfig() {
        const root = el('div', 'config-root');

        const quiz = el('div', 'config-section');
        quiz.appendChild(el('h3', 'config-title', 'Quiz'));
        quiz.appendChild(group('', [
          settingToggle('Incluir Fold (quiz de rango)', 'includeFold'),
          settingToggle('Mostrar solución al fallar', 'autoSolution'),
          settingToggle('Auto avanzar al acertar', 'autoAdvance'),
          settingToggle('Repetir hasta dominar', 'repeatUntilMastered')
        ]));
        if (RT.Settings.get('autoAdvance')) {
          quiz.appendChild(settingSelect('Tiempo de auto avance', 'autoAdvanceSecs',
            [1, 2, 3, 5].map(value => ({
              id: value, label: `${value} segundo${value === 1 ? '' : 's'}`
            }))));
        }
        quiz.appendChild(settingSelect('Dificultad por defecto', 'difficulty', [
          { id: 'basica', label: 'Básica' },
          { id: 'media', label: 'Media' },
          { id: 'avanzada', label: 'Avanzada' }
        ]));
        quiz.appendChild(settingSelect('Preguntas por sesión', 'questionsPerSession', [
          { id: 0, label: 'Sin límite' }, { id: 10, label: '10' },
          { id: 25, label: '25' }, { id: 50, label: '50' }
        ]));
        root.appendChild(quiz);

        const visual = el('div', 'config-section');
        visual.appendChild(el('h3', 'config-title', 'Visual'));
        visual.appendChild(settingSelect('Tamaño de la matriz', 'gridSize', [
          { id: 's', label: 'Pequeña' }, { id: 'm', label: 'Media' },
          { id: 'l', label: 'Grande' }
        ]));
        visual.appendChild(settingSelect('Tamaño del texto', 'textSize', [
          { id: 's', label: 'Pequeño' }, { id: 'm', label: 'Medio' },
          { id: 'l', label: 'Grande' }
        ]));
        visual.appendChild(settingSelect('Intensidad de colores', 'intensity', [
          { id: 'alta', label: 'Alta' }, { id: 'media', label: 'Media' },
          { id: 'suave', label: 'Suave' }
        ]));
        visual.appendChild(settingSelect('Tema', 'theme', [
          { id: 'tactico', label: 'Oscuro táctico' },
          { id: 'contraste', label: 'Alto contraste' }
        ]));
        visual.appendChild(group('', [
          settingToggle('Modo móvil compacto', 'compact'),
          settingToggle('Mostrar combos', 'showCombos'),
          settingToggle('Mostrar porcentajes', 'showPercents'),
          settingToggle('Mostrar nombres de posición', 'showPositionNames'),
          settingToggle('Mesa limpia', 'cleanTable')
        ]));
        root.appendChild(visual);

        const training = el('div', 'config-section');
        training.appendChild(el('h3', 'config-title', 'Entrenamiento'));
        training.appendChild(hint(
          'Con un toggle apagado, las preguntas se agrupan por esa dimensión en vez de mezclarse.'
        ));
        training.appendChild(group('', [
          settingToggle('Mezclar spots', 'mixSpots'),
          settingToggle('Mezclar posiciones', 'mixPositions'),
          settingToggle('Mezclar acciones', 'mixActions'),
          settingToggle('Priorizar manos falladas', 'weightFailedHands')
        ]));
        root.appendChild(training);

        const data = el('div', 'config-section');
        data.appendChild(el('h3', 'config-title', 'Datos'));
        const notice = el('div', 'inline-notice');
        notice.hidden = true;
        notice.setAttribute('role', 'status');
        notice.setAttribute('aria-live', 'polite');
        data.appendChild(notice);
        data.appendChild(group('', [
          button('Exportar progreso (JSON)', { onClick: exportProgress }),
          button('Importar progreso', { onClick: () => importProgress(notice) }),
          button('Resetear estadísticas', {
            variant: 'btn-ghost',
            onClick: () => {
              if (confirm('¿Borrar todas las estadísticas y el historial de falladas?')) {
                RT.Stats.reset();
                renderAll();
                openConfig();
              }
            }
          }),
          button('Resetear configuración', {
            variant: 'btn-ghost',
            onClick: () => {
              if (!confirm('¿Restaurar toda la configuración por defecto, incluido el simulador?')) return;
              RT.Settings.resetConfig();
              RT.SimUI.resetConfig();
              renderAll();
              openConfig();
            }
          })
        ]));
        root.appendChild(data);
        RT.Modal.open('Configuración', root);
      }

      function exportProgress() {
        const blob = new Blob([RT.Progress.exportJSON()], { type: 'application/json' });
        const anchor = document.createElement('a');
        anchor.href = URL.createObjectURL(blob);
        anchor.download = 'range-trainer-progreso.json';
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        setTimeout(() => URL.revokeObjectURL(anchor.href), 5000);
      }

      function importProgress(notice) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json,.json';
        input.addEventListener('change', () => {
          const file = input.files && input.files[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = () => {
            try {
              RT.Progress.importJSON(String(reader.result));
              openConfig();
            } catch (error) {
              notice.textContent = 'No se pudo importar el archivo: ' + error.message;
              notice.classList.add('is-warning');
              notice.hidden = false;
            }
          };
          reader.readAsText(file);
        });
        input.click();
      }

      function spotLabel(id) {
        const definition = RT.Engine.getSpotDef(id);
        return definition ? definition.label : id;
      }

      function categoryLabel(id) {
        const category = RT.SurgicalQuiz.getCategories().find(item => item.id === id);
        return category
          ? category.label
          : (id === null || id === 'null' ? 'Rango completo' : id);
      }

      function statsTable(root, title, rows, labelFor) {
        if (!rows.length) return;
        const section = el('div', 'stats-section');
        section.appendChild(el('h3', 'config-title', title));
        rows.forEach(item => {
          const row = el('div', 'stats-row');
          row.appendChild(el('span', 'stats-key', labelFor(item.key)));
          const track = el('span', 'stats-bar');
          const fill = el('span', 'stats-bar-fill');
          fill.style.width = (item.pct === null ? 0 : item.pct) + '%';
          track.appendChild(fill);
          row.appendChild(track);
          row.appendChild(el('span', 'stats-val',
            item.pct === null ? '—' : `${item.pct}% · ${item.ok}/${item.ok + item.fail}`));
          section.appendChild(row);
        });
        root.appendChild(section);
      }

      function openStats() {
        const root = el('div', 'stats-root');
        const summary = RT.Stats.getSummary();
        if (!summary.answered) {
          root.appendChild(hint('Todavía no hay datos: completa algún quiz y vuelve.'));
          RT.Modal.open('Estadísticas', root);
          return;
        }

        const head = el('div', 'stats-head');
        head.appendChild(el('div', 'stats-big', `${summary.totals.pct}%`));
        head.appendChild(el('div', 'stats-big-sub',
          `${summary.totals.ok} aciertos · ${summary.totals.fail} errores · ${summary.answered} respuestas`));
        root.appendChild(head);

        const edges = [];
        if (summary.categoryEdge.best) {
          edges.push(`Mejor categoría: ${categoryLabel(summary.categoryEdge.best.key)} (${summary.categoryEdge.best.pct}%)`);
          edges.push(`Peor categoría: ${categoryLabel(summary.categoryEdge.worst.key)} (${summary.categoryEdge.worst.pct}%)`);
        }
        if (summary.spotEdge.best) {
          edges.push(`Spot más fuerte: ${spotLabel(summary.spotEdge.best.key)} (${summary.spotEdge.best.pct}%)`);
          edges.push(`Spot más débil: ${spotLabel(summary.spotEdge.worst.key)} (${summary.spotEdge.worst.pct}%)`);
        }
        if (edges.length) {
          const card = el('div', 'stats-edges');
          edges.forEach(text => card.appendChild(el('div', 'stats-edge', text)));
          root.appendChild(card);
        }

        statsTable(root, 'Por posición', summary.byPosition, key => key);
        statsTable(root, 'Por acción', summary.byAction, key => {
          const action = RT.Engine.getActionDef(key);
          return action ? action.label : key;
        });
        statsTable(root, 'Por spot', summary.bySpot, spotLabel);
        statsTable(root, 'Por categoría', summary.byCategory, categoryLabel);
        root.appendChild(group('', [
          button('Resetear estadísticas', {
            variant: 'btn-ghost',
            onClick: () => {
              if (confirm('¿Borrar todas las estadísticas?')) {
                RT.Stats.reset();
                renderAll();
                RT.Modal.close();
              }
            }
          })
        ]));
        RT.Modal.open('Estadísticas', root);
      }

      return { openConfig, openStats };
    }
  };

})(window.RT);
