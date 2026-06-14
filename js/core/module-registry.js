/* ============================================================================
 * module-registry.js - Convención mínima para modos futuros.
 *
 * Un módulo registra metadatos y callbacks, pero no altera navegación ni DOM
 * por sí mismo. app.js decidirá cuándo montar/desmontar el módulo. Esta capa
 * evita que cada modo futuro añada condicionales dispersos por el proyecto.
 * ==========================================================================*/
'use strict';

(function (RT) {
  const modules = new Map();

  RT.Modules = {
    register(definition) {
      if (!definition || typeof definition.id !== 'string' || !definition.id.trim()) {
        throw new Error('RT.Modules.register necesita un id válido.');
      }
      const id = definition.id.trim();
      if (modules.has(id)) {
        throw new Error(`Módulo duplicado: "${id}".`);
      }
      const module = Object.freeze({
        id,
        label: typeof definition.label === 'string' && definition.label.trim()
          ? definition.label.trim()
          : id,
        mount: typeof definition.mount === 'function' ? definition.mount : null,
        unmount: typeof definition.unmount === 'function' ? definition.unmount : null,
        handleKey: typeof definition.handleKey === 'function' ? definition.handleKey : null
      });
      modules.set(id, module);
      RT.emit('modules:changed', module);
      return module;
    },

    get(id) {
      const normalizedId = typeof id === 'string' ? id.trim() : '';
      return normalizedId ? modules.get(normalizedId) || null : null;
    },

    list() {
      return Array.from(modules.values());
    }
  };

})(window.RT);
