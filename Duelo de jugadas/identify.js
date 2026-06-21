// identify.js

let identifyDeck = [];

const HAND_NAMES = [
  'Pareja', 'D.Pareja',
  'Trío', 'Escalera', 'Color',
  'Full', 'Póker', 'E.Color', 'Royal', 'Alta'
];

let currentBoard = [];
let currentCorrect = '';

export function startIdentifyMode() {
  const screen = document.getElementById('screen-duel');
  if (!screen) return;
    import('./config.js').then(m => m.initConfig());


  screen.classList.remove('hidden');
  screen.classList.add('identify-mode');

  // Preparar interfaz
  prepareUIIdentifyMode();
  generateIdentifyBoard();
  document.querySelector('[data-mode="disorder"]')?.addEventListener('click', () => {
  if (document.getElementById('screen-duel')?.classList.contains('identify-mode')) {
    shuffleCurrentBoardVisual();
  }
});

}

function prepareUIIdentifyMode() {
  const board = document.getElementById('duel-board');
  if (!document.getElementById('duel-wrapper')) {
    const wrapper = document.createElement('div');
    wrapper.id = 'duel-wrapper';
    board.parentNode.insertBefore(wrapper, board);
    wrapper.appendChild(board);
  }
  // 1. Ocultar Hero y Villain
  document.getElementById('hero-hand').style.display = 'none';
  document.getElementById('villain-hand').style.display = 'none';

  // 2. Desactivar ojitos y botones OPP/SPLIT/HERO
  document.querySelectorAll('.reveal-btn, .select-btn, .split-btn')
    .forEach(btn => {
      btn.classList.add('config-disabled');
      btn.disabled = true;
    });

  // 3. Añadir capa de botones si no existe
  if (!document.getElementById('identify-buttons')) {
    const container = document.createElement('div');
    container.id = 'identify-buttons';
    container.className = 'identify-buttons';

    HAND_NAMES.forEach(name => {
      const btn = document.createElement('button');
      btn.className = 'identify-btn';
      if (name === 'Alta') btn.classList.add('full-row'); // ← AQUI
      btn.textContent = name;
      btn.onclick = () => validateIdentifyAnswer(name);
      container.appendChild(btn);
    });

    document.getElementById('duel-wrapper').appendChild(container);

  }

  document.getElementById('combo-global').textContent = '';
}

function nextIdentifyHand() {
  if (identifyDeck.length === 0) {
    identifyDeck = [...HAND_NAMES].sort(() => Math.random() - 0.5);
  }
  return identifyDeck.pop();
}


function generateBoardForHand(handName) {
  const R = ['2','3','4','5','6','7','8','9','T','J','Q','K','A'];
  const S = ['♠','♥','♦','♣'];

  const randomSuit = () => S[Math.floor(Math.random() * S.length)];
  const randomRank = () => R[Math.floor(Math.random() * R.length)];
  const shuffle = arr => arr.sort(() => Math.random() - 0.5);

  switch (handName) {
    case 'Alta': {
      const ranks = shuffle(R).slice(0, 5);
      return ranks.map(r => r + randomSuit());
    }

    case 'Pareja': {
      const rank = randomRank();
      const suits = shuffle(S).slice(0, 2);
      const others = shuffle(R.filter(r => r !== rank)).slice(0, 3);
      return [
        rank + suits[0],
        rank + suits[1],
        ...others.map(r => r + randomSuit())
      ];
    }

    case 'D.Pareja': {
      const [r1, r2, r3] = shuffle(R);
      return [
        r1 + '♠', r1 + '♥',
        r2 + '♦', r2 + '♣',
        r3 + randomSuit()
      ];
    }

    case 'Trío': {
      const rank = randomRank();
      const suits = shuffle(S).slice(0, 3);
      const kickers = shuffle(R.filter(r => r !== rank)).slice(0, 2);
      return [
        rank + suits[0],
        rank + suits[1],
        rank + suits[2],
        ...kickers.map(r => r + randomSuit())
      ];
    }

    case 'Escalera': {
      const start = Math.floor(Math.random() * 9); // 0 a 8
      const ranks = R.slice(start, start + 5);
      return ranks.map(r => r + randomSuit());
    }

    case 'Color': {
      const suit = randomSuit();
      return shuffle(R).slice(0, 5).map(r => r + suit);
    }

    case 'Full': {
      const [r1, r2] = shuffle(R);
      return [
        r1 + '♠', r1 + '♥', r1 + '♦',
        r2 + '♣', r2 + '♥'
      ];
    }

    case 'Póker': {
      const rank = randomRank();
      const suits = ['♠', '♥', '♦', '♣'];
      const kicker = R.find(r => r !== rank);
      return [
        rank + suits[0], rank + suits[1], rank + suits[2], rank + suits[3],
        kicker + randomSuit()
      ];
    }

    case 'E.Color': {
      const suit = randomSuit();
      const start = Math.floor(Math.random() * 9); // 0 a 8
      const ranks = R.slice(start, start + 5);
      return ranks.map(r => r + suit);
    }

    case 'Royal': {
      const suit = randomSuit();
      const ranks = ['T', 'J', 'Q', 'K', 'A'];
      return ranks.map(r => r + suit);
    }

    default: {
      // Fallback seguro: alta
      return shuffle(R).slice(0, 5).map(r => r + randomSuit());
    }
  }
}



function generateIdentifyBoard() {
  // 1. Elegir una jugada al azar
  const target = nextIdentifyHand();

  // 2. Generar un board que produzca exactamente esa jugada
  currentBoard = generateBoardForHand(target);
  currentCorrect = target;

  // 3. Detectar si se debe desordenar visualmente
  // 3. Detectar si el botón de modo RNG (disorder) está activo
const disorderBtn = document.querySelector('[data-mode="disorder"]');
const isDisordered = disorderBtn?.classList.contains('active');
const visualBoard = isDisordered
  ? [...currentBoard].sort(() => Math.random() - 0.5)
  : currentBoard.slice();


  // 4. Pintar el board
  const board = document.getElementById('duel-board');
  board.innerHTML = '';
  visualBoard.forEach(card => {
    const el = document.createElement('div');
    el.className = 'card';
    el.dataset.card = card;

    const span = document.createElement('span');
    span.className = 'card-content';
    span.textContent = `${card[0]}\u202F${card[1]}`;

    el.appendChild(span);
    board.appendChild(el);
  });

  // 5. Limpiar feedback
  const resultText = document.getElementById('combo-global');
  resultText.textContent = '';
  resultText.style.color = '#29a847';
}


function validateIdentifyAnswer(choice) {
  const resultText = document.getElementById('combo-global');
  const boardCards = document.querySelectorAll('#duel-board .card');

  // Limpiar errores previos
  boardCards.forEach(c => c.classList.remove('error'));

  const isCorrect = choice === currentCorrect;


  if (isCorrect) {
    generateIdentifyBoard(); // ✅ pasa directamente a la siguiente
  } else {
    // ❌ Marcar todas las cartas en rojo
    boardCards.forEach(c => c.classList.add('error'));

    // Mostrar jugada correcta en verde
    resultText.textContent = currentCorrect;
    resultText.style.color = '#29a847';

    setTimeout(() => {
      // Limpiar texto y colores
      resultText.textContent = '';
      generateIdentifyBoard();
    }, 2500);
  }
}

function shuffleCurrentBoardVisual() {
  const board = document.getElementById('duel-board');
  if (!board || currentBoard.length !== 5) return;

  const disorderBtn = document.querySelector('[data-mode="disorder"]');
  const isDisordered = disorderBtn?.classList.contains('active');
  const visualBoard = isDisordered
    ? [...currentBoard].sort(() => Math.random() - 0.5)
    : currentBoard.slice(); // volver al orden original si se desactiva

  board.innerHTML = '';
  visualBoard.forEach(card => {
    const el = document.createElement('div');
    el.className = 'card';
    el.dataset.card = card;

    const span = document.createElement('span');
    span.className = 'card-content';
    span.textContent = `${card[0]}\u202F${card[1]}`;

    el.appendChild(span);
    board.appendChild(el);
  });
}



function buildDeck() {
  const RANKS = ['2','3','4','5','6','7','8','9','T','J','Q','K','A'];
  const SUITS = ['♠','♥','♦','♣'];
  return RANKS.flatMap(r => SUITS.map(s => r + s));
}

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
}

// Usa getBestHand de duel.js si está cargado globalmente
function getBestHand(cards) {
  if (typeof window.getBestHand === 'function') return window.getBestHand(cards);
  return { label: 'Desconocido' };
}

export function exitIdentifyMode() {
  const screen = document.getElementById('screen-duel');
  if (!screen) return;

  screen.classList.remove('identify-mode');
  document.getElementById('hero-hand').style.display = '';
  document.getElementById('villain-hand').style.display = '';
  document.getElementById('duel-board').innerHTML = '';
  document.getElementById('combo-global').textContent = '';

  // Restaurar botones
  document.querySelectorAll('.reveal-btn, .select-btn, .split-btn')
    .forEach(btn => {
      btn.disabled = false;
      btn.classList.remove('config-disabled');
    });

  // Ocultar los botones de jugada
  const layer = document.getElementById('identify-buttons');
  if (layer) layer.remove();
}
