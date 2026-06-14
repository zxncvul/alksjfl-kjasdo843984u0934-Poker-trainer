/* ============================================================================
 * quiz-common-ui.js - Controles compartidos por las vistas de quiz.
 *
 * Contrato de create(ctx):
 *   ctx.ui           Estado visual del workspace.
 *   ctx.toolkit      Componentes DOM compartidos.
 *   ctx.renderPanel  Refresco ligero del panel izquierdo.
 *
 * No conserva respuestas ni estado de sesión. Solo traduce configuración
 * visual a las opciones públicas que consumen los motores.
 * ==========================================================================*/
'use strict';

(function (RT) {

  RT.QuizCommonUI = {
    create(ctx) {
      const { ui, toolkit, renderPanel } = ctx;
      const { el, button, multiSelectGroup, collapsible } = toolkit;

      function configOptions(config, source) {
        const options = {
          source,
          spots: Array.from(config.spots),
          relatives: Array.from(config.relatives),
          heroes: Array.from(config.heroes)
        };
        if (config.actions) options.actions = Array.from(config.actions);
        if (config.categories) options.categories = Array.from(config.categories);
        if (config.kinds) options.kinds = Array.from(config.kinds);
        return options;
      }

      function groupByFromSettings() {
        const dimensions = [];
        if (!RT.Settings.get('mixSpots')) dimensions.push('spot');
        if (!RT.Settings.get('mixPositions')) dimensions.push('hero');
        if (!RT.Settings.get('mixActions')) dimensions.push('action');
        return dimensions;
      }

      function renderContextConfig(panel, config, onChange) {
        const source = ui.source;
        const spotOptions = RT.Engine.availableSpots(source)
          .map(id => ({ id, label: RT.Engine.getSpotDef(id).label }));
        panel.appendChild(multiSelectGroup(
          'Situaciones', spotOptions, config.spots, onChange));

        const relevantSpots = config.spots.size
          ? Array.from(config.spots)
          : spotOptions.map(option => option.id);
        const relatives = new Set();
        relevantSpots.forEach(spot => {
          if (RT.Engine.spotNeedsRelative(spot)) {
            RT.Engine.availableRelatives({ source, spot })
              .forEach(relative => relatives.add(relative));
          }
        });
        if (relatives.size) {
          panel.appendChild(multiSelectGroup(
            'Posición relativa',
            RT.Hands.RELATIVES
              .filter(relative => relatives.has(relative))
              .map(relative => ({ id: relative, label: relative })),
            config.relatives,
            onChange
          ));
        }

        const heroes = new Set();
        relevantSpots.forEach(spot => {
          const spotRelatives = RT.Engine.spotNeedsRelative(spot)
            ? (config.relatives.size
                ? Array.from(config.relatives)
                : RT.Engine.availableRelatives({ source, spot }))
            : [null];
          spotRelatives.forEach(relative => {
            RT.Engine.availableHeroes({ source, spot, relative })
              .forEach(hero => heroes.add(hero));
          });
        });
        panel.appendChild(multiSelectGroup(
          'Posiciones',
          RT.Hands.POSITIONS
            .filter(position => heroes.has(position))
            .map(position => ({ id: position, label: position })),
          config.heroes,
          onChange
        ));
      }

      function renderFavoriteStarts(panel, onStart) {
        const favorites = RT.Favorites.list();
        if (!favorites.length) return;
        panel.appendChild(collapsible('quiz-favs', 'Entrenar un favorito', body => {
          const row = el('div', 'btn-row');
          favorites.forEach(favorite => {
            const context = {
              source: ui.source,
              spot: favorite.spot,
              hero: favorite.hero,
              relative: favorite.relative,
              vs: favorite.vs || null
            };
            row.appendChild(button('★ ' + RT.Engine.describeContext(context), {
              onClick: () => onStart(favorite)
            }));
          });
          body.appendChild(row);
        }, { badge: String(favorites.length) }));
      }

      function renderMetaCard(panel, meta) {
        if (!meta) return;
        const card = el('div', 'meta-card');
        const rows = [
          ['Explicación', meta.explanation],
          ['Concepto', meta.concept],
          ['Observaciones', meta.observations],
          ['Errores frecuentes', meta.commonErrors]
        ].filter(row => row[1]);
        if (!rows.length) return;
        rows.forEach(([label, text]) => {
          card.appendChild(el('div', 'meta-label', label));
          card.appendChild(el('div', 'meta-text', text));
        });
        panel.appendChild(card);
      }

      return {
        configOptions,
        groupByFromSettings,
        renderContextConfig,
        renderFavoriteStarts,
        renderMetaCard,
        renderPanel
      };
    }
  };

})(window.RT);
