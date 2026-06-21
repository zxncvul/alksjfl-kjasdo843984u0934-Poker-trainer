// ranking.js
const HAND_NAMES = [
  'Alta',       // Carta Alta
  'Pareja',
  'D.Pareja',     // Doble Par
  'Trío',
  'Escalera',      // Escalera
  'Color',
  'Full',
  'Póker',
  'E.Color',   // Escalera de Color
  'Royal' 
];

let currentLeft = '';
let currentRight = '';
let currentWinner = null;

export function startRankingMode() {
  const screen = document.getElementById('screen-duel');
  if (!screen) return;

  screen.classList.remove('hidden');
  screen.classList.add('ranking-mode');

  document.getElementById('combo-global').textContent = '';

  // ⏳ Primero espera a que initConfig() monte el DOM
  import('./config.js').then(m => {
    m.initConfig(); // monta el panel
    // ✅ Luego desactiva todo lo que no se debe tocar
    prepareUIRankingMode();
    generateNewRankingDuel();
  });
}


function prepareUIRankingMode() {
  // 🔒 Desactivar funcionalidad de botones reveal pero mantener visibles
  document.querySelectorAll('.reveal-btn').forEach(btn => {
    btn.classList.add('config-disabled'); // visual desactivado
    btn.style.display = 'inline-block';
    btn.onclick = () => {}; // anula funcionalidad
  });

  // ⚫️ Ocultar contenido de cartas de hands y board
  document.querySelectorAll('#hero-hand .card, #villain-hand .card, #duel-board .card')
    .forEach(card => {
      card.style.color = 'transparent';
      card.style.borderColor = 'transparent';

      const content = card.querySelector('.card-content');
      if (content) {
        content.style.color = 'transparent';
        content.style.opacity = '0';
      }
    });

  // 🟥 SPLIT: mantener visible pero desactivado
  const splitBtn = document.querySelector('.split-btn');
  if (splitBtn) {
    splitBtn.disabled = true;
    splitBtn.classList.add('config-disabled');
    splitBtn.style.display = 'inline-block';
  }

  // ⬅️➡️ Reemplazar texto y comportamiento de OPP y HERO
  const oppBtn  = document.querySelector('.select-btn:nth-child(1)');
  const heroBtn = document.querySelector('.select-btn:nth-child(3)');

  if (oppBtn) {
    oppBtn.textContent = '<';
    oppBtn.disabled = false;
    oppBtn.style.display = 'inline-block';
    oppBtn.onclick = () => validateRankingAnswer('left');
  }

  if (heroBtn) {
    heroBtn.textContent = '>';
    heroBtn.disabled = false;
    heroBtn.style.display = 'inline-block';
    heroBtn.onclick = () => validateRankingAnswer('right');
  }

  // 🔒 Desactivar todo el panel excepto la fila de modos de juego
document.querySelectorAll('#screen-config .config-row:not(.game-mode-row)').forEach(row => {
  row.classList.add('config-disabled');
  row.querySelectorAll('button').forEach(btn => btn.disabled = true);
});

  // 🎮 Asegurar que los botones de cambio de modo sigan activos
  document.querySelectorAll('.game-mode-row button').forEach(btn => {
    btn.disabled = false;
    btn.classList.remove('config-disabled');
  });
}


function generateNewRankingDuel() {
  // Elegir dos jugadas distintas
  do {
    currentLeft = randomHand();
    currentRight = randomHand();
  } while (currentLeft === currentRight);

  currentWinner = determineWinner(currentLeft, currentRight);

  // Mostrar jugadas en el tablero
  const board = document.getElementById('duel-board');
  board.innerHTML = '';
  board.classList.add('ranking-board');

  // Carta izquierda
  const left = document.createElement('div');
  left.className = 'card ranking-card';
  left.innerText = currentLeft;

  // VS en el centro
  const vs = document.createElement('div');
  vs.className = 'vs-label';
  vs.innerText = 'VS';

  // Carta derecha
  const right = document.createElement('div');
  right.className = 'card ranking-card';
  right.innerText = currentRight;

  // Añadir al tablero
  board.appendChild(left);
  board.appendChild(vs);
  board.appendChild(right);
}


function validateRankingAnswer(choice) {
  const correct = (choice === currentWinner);
  const comboText = document.getElementById('combo-global');
  const boardCards = document.querySelectorAll('#duel-board .ranking-card');

  // Limpiar clases previas
  boardCards.forEach(card => card.classList.remove('error'));

  if (correct) {
    comboText.textContent = '';
    generateNewRankingDuel(); // ✅ Pasar al siguiente si acierta
  } else {
    // ❌ Mostrar jugada ganadora y resaltar ambas
    const winnerText = currentWinner === 'left' ? currentLeft : currentRight;
    comboText.textContent = `${winnerText} GANA!`;

    boardCards.forEach(card => {
      card.classList.add('error');
    });

    setTimeout(() => {
      comboText.textContent = '';
      generateNewRankingDuel(); // Avanzar tras fallo
    }, 2500);
  }
}




function randomHand() {
  const idx = Math.floor(Math.random() * HAND_NAMES.length);
  return HAND_NAMES[idx];
}

function determineWinner(left, right) {
  const order = HAND_NAMES;
  const leftIdx = order.indexOf(left);
  const rightIdx = order.indexOf(right);
  if (leftIdx > rightIdx) return 'left';
  if (rightIdx > leftIdx) return 'right';
  return 'tie';
}



export function exitRankingMode() {
  const screen = document.getElementById('screen-duel');
  if (!screen) return;

  // 🔄 Quitar modo ranking visual
  screen.classList.remove('ranking-mode');

  // 🧹 Limpiar board
  const board = document.getElementById('duel-board');
  board.classList.remove('ranking-board');
  board.innerHTML = '';

  // 🧽 Restaurar estilo de cartas
  document.querySelectorAll('#hero-hand .card, #villain-hand .card, #duel-board .card')
    .forEach(card => {
      card.style.color = '';
      card.style.borderColor = '';
      const content = card.querySelector('.card-content');
      if (content) {
        content.style.color = '';
        content.style.opacity = '';
      }
    });

  // 🔁 Botones OPP / HERO / SPLIT
  const btns = document.querySelectorAll('.select-btn, .split-btn');
  btns.forEach(btn => {
    btn.style.display = '';
    btn.disabled = false;
    btn.classList.remove('config-disabled');
    btn.onclick = null;
  });

  // ⬅️ Restaurar textos OPP / HERO
  const oppBtn = document.querySelector('.select-btn:nth-child(1)');
  const heroBtn = document.querySelector('.select-btn:nth-child(3)');
  if (oppBtn) oppBtn.textContent = 'OPP';
  if (heroBtn) heroBtn.textContent = 'HERO';

  // 👁 Restaurar reveal
  document.querySelectorAll('.reveal-btn').forEach(btn => {
    btn.classList.remove('config-disabled');
    btn.onclick = null;
  });

  // ⚙️ Reactivar panel completo
  document.querySelectorAll('.config-disabled').forEach(el => el.classList.remove('config-disabled'));

  document.querySelectorAll('.selector button, .zone-toggle-wrapper button, button[data-suitmode]')
    .forEach(btn => btn.disabled = false);

  // 🔁 Reenlazar revelado (ojitos)
  if (typeof bindTemporaryReveal === 'function') bindTemporaryReveal();

  // 🧹 Limpiar mensaje superior
  document.getElementById('combo-global').textContent = '';
}


