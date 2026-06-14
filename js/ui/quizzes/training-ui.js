/* ============================================================================
 * training-ui.js - Contenedor único para los dos formatos de entrenamiento.
 *
 * Los motores y sus vistas siguen siendo independientes. Este módulo solo
 * mantiene estable el workspace y permite cambiar el formato dentro de la
 * misma sección de navegación.
 * ==========================================================================*/
'use strict';

(function (RT) {

  RT.TrainingUI = {
    create(ctx) {
      const {
        ui, toolkit, rangeQuizUI, surgicalQuizUI, onModeChange
      } = ctx;
      const { el, button } = toolkit;

      function renderModeSelector(panel) {
        const wrap = el('section', 'training-mode-selector');
        wrap.appendChild(el('div', 'panel-group-title', 'Tipo de entrenamiento'));
        const controls = el('div', 'training-mode-grid');
        [
          ['range', 'Rango completo'],
          ['questions', 'Preguntas individuales']
        ].forEach(([id, label]) => {
          controls.appendChild(button(label, {
            active: ui.trainingMode === id,
            onClick: () => onModeChange(id)
          }));
        });
        wrap.appendChild(controls);
        panel.appendChild(wrap);
      }

      function renderPanel(panel) {
        renderModeSelector(panel);
        if (ui.trainingMode === 'range') rangeQuizUI.renderPanel(panel);
        else surgicalQuizUI.renderPanel(panel);
      }

      return { renderPanel, renderModeSelector };
    }
  };

})(window.RT);
