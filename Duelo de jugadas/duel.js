import { initConfig } from './config.js';
import { getSuitColor } from './config.js';

const RANKS = ['2','3','4','5','6','7','8','9','T','J','Q','K','A'];
const SUITS = ['♠','♥','♦','♣'];


let currentDuelWinner = null;
let bestHands = {};

export function startDuelMode() {
  document.getElementById('screen-duel').classList.remove('hidden');
  initConfig();
  generateDuel();

   


}

export function exitDuel() {
  document.getElementById('screen-duel').classList.add('hidden');
  document.getElementById('screen-config')?.classList.remove('hidden');
}

function getWinReason() {
  if (currentDuelWinner === 'split') return 'Empate';
  const winner = bestHands[currentDuelWinner];
  const loserKey = currentDuelWinner === 'hero' ? 'villain' : 'hero';
  const loser = bestHands[loserKey];

  const rankOrder = {
    'high': 1, 'pair': 2, 'twopair': 3, 'trio': 4,
    'straight': 5, 'flush': 6, 'full': 7, 'quads': 8, 'straight-flush': 9
  };

  if (rankOrder[winner.type] > rankOrder[loser.type]) {
    return `${winner.label} contra ${loser.label}`;
  }
  if (winner.type === loser.type) {
  return `${winner.label} gana por kicker`;
}

  return `${winner.label} vence a ${loser.label}`;
}

export function guessWinner(choice) {
  // ⏰ Manejo especial si se acabó el tiempo
  if (choice === 'timeout') {
    const comboGlobal = document.getElementById('combo-global');
    comboGlobal.textContent = '⏰ Tiempo agotado';
    return;
  }

  // 1) Limpiar cualquier highlight y estado previo
  const buttons = document.querySelectorAll('.reveal-btn');
  document.querySelectorAll('.card.highlight')
          .forEach(c => c.classList.remove('highlight'));
  buttons.forEach(b => b.classList.remove('active'));
  const comboGlobal = document.getElementById('combo-global');
  comboGlobal.textContent = '';

  // 2) Evaluar respuesta
  const isCorrect = (choice === 'split' && currentDuelWinner === 'split') || choice === currentDuelWinner;
  const message = `${isCorrect ? '✅' : ''} -> ${getWinReason()}`;
  comboGlobal.textContent = message;

  // 3) Si acierto, generar siguiente duelo, si fallo, esperar nueva interacción
  if (isCorrect) {
    document.dispatchEvent(new Event('duel:end'));
    setTimeout(generateDuel, 1500);
  } else {
  // ❌ Marcar en rojo las cartas ganadoras y perdedoras
  const winnerCards = bestHands[currentDuelWinner]?.cards || [];
  const all = document.querySelectorAll('.card');

  // Remarcar solo las cartas que forman parte de la jugada
  for (const code of winnerCards) {
    const match = Array.from(all).find(el => el.dataset.card === code);
    if (match) match.classList.add('error');
  }
}

}


export function generateDuel() {
  currentDuelWinner = null;
  const deck = buildDeck(); shuffle(deck);
  const hero = [deck.pop(), deck.pop()];
  const villain = [deck.pop(), deck.pop()];
  const board = [deck.pop(), deck.pop(), deck.pop(), deck.pop(), deck.pop()];

  bestHands.hero = getBestHand([...hero, ...board]);
  bestHands.villain = getBestHand([...villain, ...board]);
  const cmp = compareHands(bestHands.hero, bestHands.villain);
  currentDuelWinner = cmp > 0 ? 'hero' : cmp < 0 ? 'villain' : 'split';

  renderHand('hero-hand', hero);
  renderHand('villain-hand', villain);
  renderHand('duel-board', board);
  document.getElementById('combo-global').textContent = '';
  document.querySelectorAll('.card, .reveal-btn')
          .forEach(el => el.classList.remove('highlight','active'));
  document.dispatchEvent(new Event('duel:start'));
  updateSuitColors();
}

function buildDeck() {
  return RANKS.flatMap(r => SUITS.map(s => r + s));
}

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
}

function renderHand(id, cards) {
  const container = document.getElementById(id);
  if (!container) return;
  container.innerHTML = '';
  cards.forEach(card => {
    const d = document.createElement('div');
    d.className = 'card';
    const span = document.createElement('span');
span.className = 'card-content';
span.textContent = `${card[0]}\u202F${card[1]}`;

d.appendChild(span);
    d.dataset.card = card;
    container.appendChild(d);
  });
}

function findStraight(ranks) {
  const idxs = Array.from(new Set(ranks))
    .map(r => RANKS.indexOf(r))
    .sort((a,b) => a - b);
  const ACE_LOW = -1;
if (idxs.includes(12)) idxs.unshift(ACE_LOW)

  for (let i = 0; i <= idxs.length - 5; i++) {
    let seq = [idxs[i]];
    for (let j = i + 1; j < idxs.length && seq.length < 5; j++) {
      if (idxs[j] === seq[seq.length - 1] + 1) seq.push(idxs[j]);
      else if (idxs[j] > seq[seq.length - 1] + 1) break;
    }
    if (seq.length === 5) return seq.map(i => i === -1 ? 'A' : RANKS[i]);
  }
  return null;
}

function compareHands(a, b) {
  const order = ['high','pair','twopair','trio','straight','flush','full','quads','straight-flush'];
  if (a.type !== b.type) return order.indexOf(a.type) - order.indexOf(b.type);
  if (a.primary !== b.primary) return a.primary - b.primary;
  if ((a.secondary||0) !== (b.secondary||0)) return (a.secondary||0) - (b.secondary||0);
  for (let i = 0; i < Math.max(a.kickers.length, b.kickers.length); i++) {
    const ak = a.kickers[i] || 0;
    const bk = b.kickers[i] || 0;
    if (ak !== bk) return ak - bk;
  }
  return 0;
}

function getBestHand(cards) {
  const pool = [...cards];
  const byRank = {}, bySuit = {};
  pool.forEach(c => {
    const r = c[0], s = c[1];
    byRank[r] = (byRank[r]||[]).concat(c);
    bySuit[s] = (bySuit[s]||[]).concat(c);
  });
window.getBestHand = getBestHand;

  // straight-flush (incl. royal)
  for (const s of SUITS) {
    if ((bySuit[s]||[]).length >= 5) {
      const seq = findStraight(bySuit[s].map(c=>c[0]));
      if (seq) {
        const isRoyal = seq.join('') === 'TJQKA';
        const high = isRoyal ? 'A' : seq[4];
        return {
          type: 'straight-flush',
          primary: RANKS.indexOf(high),
          secondary: 0,
          kickers: [],
          label: isRoyal ? 'Royal Flush' : `Escalera de color al ${high}`,
          cards: seq.map(r=>bySuit[s].find(c=>c[0]===r))
        };
      }
    }
  }

  // flush
  for (const s of SUITS) {
    if ((bySuit[s]||[]).length >= 5) {
      const top5 = [...bySuit[s]]
        .sort((a,b)=>RANKS.indexOf(b[0]) - RANKS.indexOf(a[0]))
        .slice(0,5);
      return {
        type: 'flush',
        primary: RANKS.indexOf(top5[0][0]),
        secondary: 0,
        kickers: top5.slice(1).map(c=>RANKS.indexOf(c[0])),
        label: `Color, ${top5[0][0]} high`,
        cards: top5
      };
    }
  }

// straight (sin importar palos)
{
  // 3.1) Extraer todos los rangos de la mano
  const allRanks = cards.map(c => c[0]);

  // 3.2) Invocar findStraight sobre TODOS los rangos
  const straightSeq = findStraight(allRanks);

  if (straightSeq) {
    // 3.3) Determinar si es rueda (A-2-3-4-5)
    const isWheel = straightSeq.join('') === 'A2345';
    const high     = isWheel ? '5' : straightSeq[4];

    // 3.4) Calcular kickers: las tres cartas más altas que no entren en la escalera
    const kickers = pool
      .filter(c => !straightSeq.includes(c[0]))
      .sort((a,b) => RANKS.indexOf(b[0]) - RANKS.indexOf(a[0]))
      .map(c => RANKS.indexOf(c[0]))
      .slice(0,3);

    return {
      type:       'straight',
      primary:    RANKS.indexOf(high),
      secondary:  0,
      kickers,
      label:      `Escalera al ${high}`,
      // 3.5) Reconstruir las cartas que forman la escalera:
      cards:      straightSeq.map(r => pool.find(c => c[0] === r))
    };
  }
}



  // multiples: quads, full, trio, two pair, pair
  const groups = Object.entries(byRank)
    .map(([r, cs])=>({ rank: r, cards: cs }))
    .sort((a,b)=> b.cards.length - a.cards.length || RANKS.indexOf(b.rank) - RANKS.indexOf(a.rank));

  // quads
  if (groups[0].cards.length === 4) {
    const quad = groups[0].cards;
    const kicker = pool
      .filter(c=>!quad.includes(c))
      .sort((a,b)=>RANKS.indexOf(b[0]) - RANKS.indexOf(a[0]))[0];
    return {
      type: 'quads',
      primary: RANKS.indexOf(groups[0].rank),
      secondary: 0,
      kickers: [RANKS.indexOf(kicker[0])],
      label: `Póker de ${groups[0].rank}`,
      cards: [...quad, kicker]
    };
  }

  // full
  if (groups[0].cards.length === 3 && (groups[1]||{}).cards.length >= 2) {
    const three = groups[0].cards;
    const pair = groups[1].cards.slice(0,2);
    return {
      type: 'full',
      primary: RANKS.indexOf(groups[0].rank),
      secondary: RANKS.indexOf(groups[1].rank),
      kickers: [],
      label: `Full de ${groups[0].rank} con ${groups[1].rank}`,
      cards: [...three, ...pair]
    };
  }

  // trio
  if (groups[0].cards.length === 3) {
    const three = groups[0].cards;
    const kickers = pool
      .filter(c=>!three.includes(c))
      .sort((a,b)=>RANKS.indexOf(b[0]) - RANKS.indexOf(a[0]))
      .slice(0,2);
    return {
      type: 'trio',
      primary: RANKS.indexOf(groups[0].rank),
      secondary: 0,
      kickers: kickers.map(c=>RANKS.indexOf(c[0])),
      label: `Trío de ${groups[0].rank}`,
      cards: [...three, ...kickers]
    };
  }

  // two pair
  if (groups[0].cards.length === 2 && (groups[1]||{}).cards.length === 2) {
    const p1 = groups[0].cards;
    const p2 = groups[1].cards;
    const kicker = pool
      .filter(c=>!p1.includes(c) && !p2.includes(c))
      .sort((a,b)=>RANKS.indexOf(b[0]) - RANKS.indexOf(a[0]))[0];
    return {
      type: 'twopair',
      primary: RANKS.indexOf(groups[0].rank),
      secondary: RANKS.indexOf(groups[1].rank),
      kickers: [RANKS.indexOf(kicker[0])],
      label: `Doble par de ${groups[0].rank} y ${groups[1].rank}`,
      cards: [...p1, ...p2, kicker]
    };
  }

  // pair
  if (groups[0].cards.length === 2) {
    const pair = groups[0].cards;
    const kickers = pool
      .filter(c=>!pair.includes(c))
      .sort((a,b)=>RANKS.indexOf(b[0]) - RANKS.indexOf(a[0]))
      .slice(0,3);
    return {
      type: 'pair',
      primary: RANKS.indexOf(groups[0].rank),
      secondary: 0,
      kickers: kickers.map(c=>RANKS.indexOf(c[0])),
      label: `Par de ${groups[0].rank}`,
      cards: [...pair, ...kickers]
    };
  }

  // high card
  const top5 = pool
    .sort((a,b)=>RANKS.indexOf(b[0]) - RANKS.indexOf(a[0]))
    .slice(0,5);
  return {
    type: 'high',
    primary: RANKS.indexOf(top5[0][0]),
    secondary: 0,
    kickers: top5.slice(1).map(c=>RANKS.indexOf(c[0])),
    label: `Carta alta ${top5[0][0]}`,
    cards: top5
  };
}

/**
 * Revela (o oculta) las mejores cartas de hero/villain,
 * resaltándolas con la clase .highlight y mostrando la etiqueta en combo-global.
 */
export function revealBest(side) {
  const buttons = document.querySelectorAll('.reveal-btn');
  const btn     = document.querySelector(`.reveal-btn[data-side="${side}"]`);
  const wasActive = btn.classList.contains('active');

  // 1) LIMPIAR TODO ESTADO existente
  document.querySelectorAll('.card.highlight')
          .forEach(c => c.classList.remove('highlight'));
  buttons.forEach(b => b.classList.remove('active'));
  document.getElementById('combo-global').textContent = '';

  // 2) toggle off
  if (wasActive) {
  btn.classList.remove('active');
  return;
}

  // 3) resaltar jugada
  btn.classList.add('active');
  let used = new Set();
bestHands[side].cards.forEach(code => {
  const matches = Array.from(document.querySelectorAll(`.card[data-card="${code}"]`))
    .filter(el => !used.has(el));

  if (matches.length > 0) {
    matches[0].classList.add('highlight');
    used.add(matches[0]);
  }
});

  document.getElementById('combo-global').textContent =
    `${side === 'hero' ? 'HERO' : 'OPPONENT'}: ${bestHands[side].label}`;
}


function updateSuitColors() {
  let mode = window.getSuitMode?.() || 'MONO';

  if (mode === 'RAND') {
    const modes = ['RAINBOW', 'PAIRED', 'MONO'];
    mode = modes[Math.floor(Math.random() * modes.length)];
  }

  document.querySelectorAll('.card').forEach(card => {
    const suit = card.textContent?.slice(-1);
    card.style.setProperty('color', getSuitColor(suit, mode), 'important');
  });
}

window.updateSuitColors = updateSuitColors;
