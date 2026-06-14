/* ============================================================================
 * components.js - Toolkit DOM compartido por las interfaces del workspace.
 *
 * No conoce motores ni estado de entrenamiento. Recibe únicamente el Set que
 * conserva desplegables abiertos y un callback para refrescar el panel.
 * Los módulos futuros deben reutilizar esta API en vez de añadir helpers a
 * app.js.
 * ==========================================================================*/
'use strict';

(function (RT) {

  function defaultHelpText(label) {
    const clean = String(label).replace(/\s+/g, ' ').trim();
    const known = [
      [/comprobar/i, 'Compara tu respuesta con el rango correcto y abre la revisión.'],
      [/siguiente/i, 'Avanza al siguiente ejercicio de la sesión.'],
      [/reintentar|repetir/i, 'Reinicia el ejercicio actual para resolverlo de nuevo.'],
      [/borrar|limpiar/i, 'Elimina la selección actual sin cambiar de ejercicio.'],
      [/salir/i, 'Finaliza la sesión activa y vuelve a la configuración del modo.'],
      [/empezar|ejercicios|preguntas/i, 'Inicia una sesión con la configuración y los filtros actuales.'],
      [/heatmap|falladas|dominadas/i, 'Proyecta el progreso histórico directamente sobre la matriz.'],
      [/rango/i, 'Abre o aplica una vista relacionada con el rango actual.'],
      [/fold/i, 'Descarta la mano en el contexto actual.'],
      [/call/i, 'Continúa igualando la subida existente.'],
      [/open|(^|\s)or(\s|$)/i, 'Abre la acción preflop desde la posición actual.'],
      [/3bet/i, 'Resube frente a una apertura previa.'],
      [/4bet/i, 'Resube frente a un 3Bet previo.']
    ];
    const match = known.find(([pattern]) => pattern.test(clean));
    return match ? match[1] : `Activa "${clean}" dentro de la pantalla actual.`;
  }

  RT.UI = {
    create(options) {
      const openSections = options.openSections;
      const invalidatePanel = options.invalidatePanel;
      const helpTextFor = options.helpTextFor || defaultHelpText;

      function el(tag, className, text) {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text != null) node.textContent = text;
        return node;
      }

      function button(label, config = {}) {
        const {
          onClick, active = false, disabled = false, variant = '',
          title = '', help = '', key = ''
        } = config;
        const node = el('button', 'btn' + (variant ? ' ' + variant : ''), label);
        node.type = 'button';
        if (active) node.classList.add('is-active');
        node.disabled = !!disabled;
        if (title) node.title = title;
        node.dataset.help = help || title || helpTextFor(label);
        if (key) node.appendChild(el('span', 'key-hint', key));
        if (onClick) node.addEventListener('click', onClick);
        return node;
      }

      function group(titleText, buttons, extraClass) {
        const wrap = el('div', 'panel-group' + (extraClass ? ' ' + extraClass : ''));
        if (titleText) wrap.appendChild(el('div', 'panel-group-title', titleText));
        const row = el('div', 'btn-row');
        buttons.forEach(item => row.appendChild(item));
        wrap.appendChild(row);
        return wrap;
      }

      function selectGroup(titleText, items, value, onChange, config = {}) {
        const wrap = el('div', 'panel-group');
        if (titleText) wrap.appendChild(el('div', 'panel-group-title', titleText));
        const select = el('select', 'select');
        select.dataset.help = `Cambia ${(titleText || 'la selección').toLowerCase()} sin abandonar la pantalla actual.`;
        if (config.placeholder) {
          const placeholder = el('option', '', config.placeholder);
          placeholder.value = '';
          placeholder.disabled = true;
          if (value == null) placeholder.selected = true;
          select.appendChild(placeholder);
        }
        items.forEach(item => {
          const option = el('option', '', item.label);
          option.value = item.id;
          option.disabled = !!item.disabled;
          if (String(value) === String(item.id)) option.selected = true;
          select.appendChild(option);
        });
        select.addEventListener('change', () => onChange(select.value));
        wrap.appendChild(select);
        return wrap;
      }

      function multiSelectGroup(titleText, items, selected, onChange) {
        return group(titleText, items.map(item => button(item.label, {
          active: selected.has(item.id),
          disabled: item.disabled,
          onClick: () => {
            if (selected.has(item.id)) selected.delete(item.id);
            else selected.add(item.id);
            onChange();
          }
        })));
      }

      function collapsible(id, titleText, buildContent, config = {}) {
        const open = openSections.has(id);
        const wrap = el('div', 'collapsible' + (open ? ' is-open' : ''));
        const head = el('button', 'collapsible-head');
        head.type = 'button';
        head.dataset.help = `Muestra u oculta los controles de ${titleText.toLowerCase()}.`;
        head.setAttribute('aria-expanded', String(open));
        head.appendChild(el('span', 'collapsible-title', titleText));
        if (config.badge) head.appendChild(el('span', 'collapsible-badge', config.badge));
        head.appendChild(el('span', 'collapsible-arrow', open ? '▾' : '▸'));
        head.addEventListener('click', () => {
          if (openSections.has(id)) openSections.delete(id);
          else openSections.add(id);
          invalidatePanel();
        });
        wrap.appendChild(head);
        const body = el('div', 'collapsible-body');
        buildContent(body);
        wrap.appendChild(body);
        return wrap;
      }

      function chip(label, count, kind, config = {}) {
        const node = el(config.onClick ? 'button' : 'span', 'chip chip-' + kind);
        if (config.onClick) {
          node.type = 'button';
          node.addEventListener('click', config.onClick);
        }
        if (config.active) node.classList.add('is-active');
        node.appendChild(el('span', 'chip-label', label));
        node.appendChild(el('span', 'chip-count', String(count)));
        return node;
      }

      function hint(text) {
        return el('p', 'panel-hint', text);
      }

      function dashPanel(titleText, buildBody) {
        const panel = el('section', 'dash-panel');
        panel.dataset.help = `Resumen de ${titleText.toLowerCase()} para interpretar la sesión de un vistazo.`;
        panel.appendChild(el('h3', 'dash-title', titleText));
        const body = el('div', 'dash-body');
        buildBody(body);
        panel.appendChild(body);
        return panel;
      }

      function statLine(label, value) {
        const row = el('div', 'stat-line');
        row.dataset.help = `${label}: indicador calculado a partir del rango o de la sesión actual.`;
        row.appendChild(el('span', 'stat-label', label));
        row.appendChild(el('span', 'stat-value', String(value)));
        return row;
      }

      function barRow(label, pct, valueText, color) {
        const row = el('div', 'bar-row');
        row.dataset.help = `${label}: distribución relativa dentro de los datos visibles.`;
        row.appendChild(el('span', 'bar-label', label));
        const track = el('span', 'bar-track');
        const fill = el('span', 'bar-fill');
        fill.style.width = Math.max(0, Math.min(100, pct)) + '%';
        if (color) fill.style.background = color;
        track.appendChild(fill);
        row.appendChild(track);
        row.appendChild(el('span', 'bar-value', valueText));
        return row;
      }

      function sparkline(values, config = {}) {
        const height = config.height || 26;
        const width = 120;
        const box = el('div', 'sparkline');
        if (values.length < 2) {
          box.appendChild(el('span', 'stat-label', '—'));
          return box;
        }
        const min = Math.min(...values);
        const max = Math.max(...values);
        const span = (max - min) || 1;
        const points = values.map((value, index) =>
          `${(index / (values.length - 1) * width).toFixed(1)},` +
          `${(height - 3 - (value - min) / span * (height - 6)).toFixed(1)}`
        ).join(' ');
        box.innerHTML = `<svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true">` +
          `<polyline points="${points}" fill="none" stroke="var(--accent-hi)" stroke-width="1.5"/></svg>`;
        return box;
      }

      return {
        el, button, group, selectGroup, multiSelectGroup, collapsible,
        chip, hint, dashPanel, statLine, barRow, sparkline, helpTextFor
      };
    }
  };

})(window.RT);
