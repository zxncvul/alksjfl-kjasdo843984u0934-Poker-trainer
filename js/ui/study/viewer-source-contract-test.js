'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', '..', '..');
const app = fs.readFileSync(path.join(root, 'js/ui/app.js'), 'utf8');
const study = fs.readFileSync(path.join(root, 'js/ui/study/study-ui.js'), 'utf8');
const sequence = fs.readFileSync(
  path.join(root, 'js/ui/study/preflop-sequence-model.js'), 'utf8'
);
const gallery = fs.readFileSync(path.join(root, 'js/ui/range-gallery.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css/styles.css'), 'utf8');

let checks = 0;
function check(condition, message) {
  checks++;
  assert(condition, message);
}

check(
  html.includes('class="matrix-tools-toolbar"') &&
  html.indexOf('id="matrix-action-toolbar"') < html.indexOf('id="matrix-filter-toolbar"') &&
  html.indexOf('id="matrix-filter-toolbar"') < html.indexOf('id="range-gallery"'),
  'Matrix, actions, filters and library keep their order'
);
check(
  html.indexOf('src="js/ui/study/viewer-model.js"') <
    html.indexOf('src="js/ui/study/range-form-model.js"') &&
  html.indexOf('src="js/ui/study/range-form-model.js"') <
    html.indexOf('src="js/ui/study/preflop-sequence-model.js"') &&
  html.indexOf('src="js/ui/study/preflop-sequence-model.js"') <
    html.indexOf('src="js/ui/study/study-ui.js"') &&
  html.indexOf('src="js/ui/study/study-ui.js"') <
    html.indexOf('src="js/ui/app.js"'),
  'Script order respects model dependencies'
);
check(app.indexOf("t.tagName === 'INPUT'") < app.indexOf("ev.key.toLowerCase() === 'k'"),
  'Keyboard shortcuts ignore text inputs');
check(app.includes("!ev.ctrlKey && !ev.metaKey && !ev.altKey"),
  'H does not capture modified browser shortcuts');
check(app.includes("RT.on('favorites:changed'") && app.includes('renderAll();'),
  'Favorites refresh every surface');
check(study.includes('safeExportRangeSnapshot') &&
  study.includes('No se pudo preparar la exportaci'),
  'Snapshot export has a controlled failure path');
check(study.includes("setAttribute('aria-label', title)"),
  'Icon buttons expose accessible names');
check(study.includes('ui.gallerySelection.clear();'),
  'Changing collection clears stale gallery selection');
check(study.includes('DEBUG_VISUALIZER = false') &&
  study.includes("debugVisualizer('sequence:update'"),
  'Diagnostics remain behind a disabled production flag');
check(study.includes("setAttribute('aria-disabled'") &&
  study.includes("dataset.state = heroReturnTarget"),
  'DOM state exposes synchronized disabled and selected metadata');
check(sequence.includes('selectedRivals') &&
  sequence.includes('needsHeroReturnConfirmation'),
  'Sequence model protects conflicts and multiple rivals');
check(gallery.includes('RT.ViewerModel.applyLibraryFilters') &&
  !gallery.includes('matrixFilters'),
  'Library does not inherit matrix filters');
check(gallery.includes('range-card-favorite') && gallery.includes('aria-current'),
  'Gallery cards expose favorite and active state');
check(css.includes('--sequence-hero-disabled') &&
  css.includes('--sequence-rival-disabled'),
  'Hero and Rival own distinct disabled colors');
check(css.includes('.preflop-sequence-actor.is-hero .preflop-position-button:disabled') &&
  css.includes('.preflop-sequence-actor.is-rival .preflop-position-button:disabled'),
  'Disabled position styles stay actor-specific');
check(css.includes('@media (max-width: 1023px)') &&
  css.includes('.range-gallery-track') && css.includes('overflow-x: auto'),
  'Library keeps horizontal responsive scrolling');
check(css.includes('.modal-overlay') && css.includes('z-index: 50'),
  'Modals stay above the workspace');

console.log(`viewer-source-contract: ${checks} checks OK`);
