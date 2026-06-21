/* ============================================================================
 * ranges-extra.data.js - Rangos adicionales transcritos desde tablas fuente.
 *
 * Mantener separado de ranges.data.js evita modificar los rangos historicos
 * de Open Raise y defensa vs 3Bet. La dimension "vs" identifica al opener.
 * ==========================================================================*/
'use strict';

(function (RT) {
  RT.defineSpot({
    id: 'THREEBET_VS_OPEN',
    label: '3Bet vs Open',
    name: '3Bet vs Open',
    dims: ['hero', 'vs'],
    description: '3Bet contra el open raise de una posicion concreta',
    titleTemplate: '{hero} vs {vs} \u00B7 3Bet'
  });
  RT.defineSpot({
    id: 'BB_DEFENSE_VS_OPEN',
    label: 'BB vs PFR',
    name: 'Defensa BB vs PFR',
    dims: ['hero', 'vs'],
    description: 'Defensa de BB contra el open raise de una posicion concreta',
    titleTemplate: '{hero} vs {vs} \u00B7 Defend vs PFR'
  });
  RT.defineSpot({
    id: 'VS4BET_AFTER_3BET',
    label: 'vs 4Bet',
    name: 'Respuesta vs 4Bet',
    dims: ['hero', 'vs'],
    description: 'Respuesta al 4Bet despues de haber hecho 3Bet',
    titleTemplate: '{hero} vs {vs} \u00B7 Vs 4Bet'
  });

  // Variantes de la paleta principal: cada decisión se reconoce al instante,
  // sin volver a los verdes y amarillos saturados originales.
  RT.defineAction({ id: '3BET_MAIN', label: '3Bet principal', color: '#5f6692' });
  RT.defineAction({ id: '3BET_MIXED', label: '3Bet mixto', color: '#7a729d' });
  RT.defineAction({ id: 'CALL_STANDARD', label: 'Call estandar', color: '#2f6f73' });
  RT.defineAction({ id: 'CALL_MARGINAL', label: 'Call marginal', color: '#5b8580' });
  RT.defineAction({ id: '5BET_STACKOFF', label: '5Bet+ / stack-off', color: '#9a6a66' });
  RT.defineAction({ id: 'CALL_VS_4BET', label: 'Call vs 4Bet', color: '#4a7893' });
  RT.defineAction({ id: 'FOLD_VS_4BET', label: 'Fold vs 4Bet', color: '#46515d' });

  const ranges = [
  {
    "source": "david-diaz",
    "image": "Copia de 3bet MP-CO vs UTG-CO.png",
    "spot": "THREEBET_VS_OPEN",
    "hero": "MP",
    "vs": "UTG",
    "actions": {
      "3BET_MAIN": [
        "AA",
        "AKs",
        "AQs",
        "AJs",
        "ATs",
        "AKo",
        "KK",
        "KQs",
        "KJs",
        "KTs",
        "AQo",
        "QQ",
        "QJs",
        "AJo",
        "JJ",
        "TT",
        "99",
        "88"
      ]
    }
  },
  {
    "source": "david-diaz",
    "image": "Copia de 3bet MP-CO vs UTG-CO.png",
    "spot": "THREEBET_VS_OPEN",
    "hero": "CO",
    "vs": "UTG",
    "actions": {
      "3BET_MAIN": [
        "AA",
        "AKs",
        "AQs",
        "AJs",
        "ATs",
        "AKo",
        "KK",
        "KQs",
        "KJs",
        "KTs",
        "AQo",
        "QQ",
        "QJs",
        "AJo",
        "JJ",
        "JTs",
        "TT",
        "99",
        "88",
        "77"
      ]
    }
  },
  {
    "source": "david-diaz",
    "image": "Copia de 3bet MP-CO vs UTG-CO.png",
    "spot": "THREEBET_VS_OPEN",
    "hero": "CO",
    "vs": "MP",
    "actions": {
      "3BET_MAIN": [
        "AA",
        "AKs",
        "AQs",
        "AJs",
        "ATs",
        "AKo",
        "KK",
        "KQs",
        "KJs",
        "KTs",
        "AQo",
        "KQo",
        "QQ",
        "QJs",
        "AJo",
        "JJ",
        "JTs",
        "TT",
        "99",
        "88",
        "77"
      ]
    }
  },
  {
    "source": "david-diaz",
    "image": "Copia de 3bet BTN vs UTG-MP-CO.png",
    "spot": "THREEBET_VS_OPEN",
    "hero": "BTN",
    "vs": "UTG",
    "actions": {
      "3BET_MAIN": [
        "AA",
        "AKs",
        "AQs",
        "AJs",
        "ATs",
        "AKo",
        "KK",
        "KQs",
        "KJs",
        "KTs",
        "AQo",
        "QQ",
        "QJs",
        "AJo",
        "JJ",
        "JTs",
        "TT",
        "99",
        "88",
        "77"
      ]
    }
  },
  {
    "source": "david-diaz",
    "image": "Copia de 3bet BTN vs UTG-MP-CO.png",
    "spot": "THREEBET_VS_OPEN",
    "hero": "BTN",
    "vs": "MP",
    "actions": {
      "3BET_MAIN": [
        "AA",
        "AKs",
        "AQs",
        "AJs",
        "ATs",
        "AKo",
        "KK",
        "KQs",
        "KJs",
        "KTs",
        "AQo",
        "KQo",
        "QQ",
        "QJs",
        "QTs",
        "AJo",
        "JJ",
        "JTs",
        "TT",
        "99",
        "88",
        "77"
      ]
    }
  },
  {
    "source": "david-diaz",
    "image": "Copia de 3bet BTN vs UTG-MP-CO.png",
    "spot": "THREEBET_VS_OPEN",
    "hero": "BTN",
    "vs": "CO",
    "actions": {
      "3BET_MAIN": [
        "AA",
        "AKs",
        "AQs",
        "AJs",
        "ATs",
        "A9s",
        "A8s",
        "AKo",
        "KK",
        "KQs",
        "KJs",
        "KTs",
        "AQo",
        "KQo",
        "QQ",
        "QJs",
        "QTs",
        "AJo",
        "JJ",
        "JTs",
        "ATo",
        "TT",
        "99",
        "88",
        "77",
        "66",
        "55"
      ]
    }
  },
  {
    "source": "david-diaz",
    "image": "Copia de 3bet SB.png",
    "spot": "THREEBET_VS_OPEN",
    "hero": "SB",
    "vs": "UTG",
    "actions": {
      "3BET_MAIN": [
        "AA",
        "AKs",
        "AQs",
        "AJs",
        "ATs",
        "AKo",
        "KK",
        "KQs",
        "KJs",
        "AQo",
        "QQ",
        "QJs",
        "JJ",
        "TT",
        "99",
        "88"
      ]
    }
  },
  {
    "source": "david-diaz",
    "image": "Copia de 3bet SB.png",
    "spot": "THREEBET_VS_OPEN",
    "hero": "SB",
    "vs": "MP",
    "actions": {
      "3BET_MAIN": [
        "AA",
        "AKs",
        "AQs",
        "AJs",
        "ATs",
        "AKo",
        "KK",
        "KQs",
        "KJs",
        "AQo",
        "QQ",
        "QJs",
        "AJo",
        "JJ",
        "TT",
        "99",
        "88"
      ]
    }
  },
  {
    "source": "david-diaz",
    "image": "Copia de 3bet SB.png",
    "spot": "THREEBET_VS_OPEN",
    "hero": "SB",
    "vs": "CO",
    "actions": {
      "3BET_MAIN": [
        "AA",
        "AKs",
        "AQs",
        "AJs",
        "ATs",
        "AKo",
        "KK",
        "KQs",
        "KJs",
        "KTs",
        "AQo",
        "KQo",
        "QQ",
        "QJs",
        "QTs",
        "AJo",
        "JJ",
        "JTs",
        "TT",
        "99",
        "88",
        "77"
      ]
    }
  },
  {
    "source": "david-diaz",
    "image": "Copia de 3bet SB.png",
    "spot": "THREEBET_VS_OPEN",
    "hero": "SB",
    "vs": "BTN",
    "actions": {
      "3BET_MAIN": [
        "AA",
        "AKs",
        "AQs",
        "AJs",
        "ATs",
        "A9s",
        "A8s",
        "A7s",
        "A6s",
        "A5s",
        "A4s",
        "A3s",
        "A2s",
        "AKo",
        "KK",
        "KQs",
        "KJs",
        "KTs",
        "AQo",
        "KQo",
        "QQ",
        "QJs",
        "QTs",
        "AJo",
        "KJo",
        "QJo",
        "JJ",
        "JTs",
        "ATo",
        "TT",
        "99",
        "88",
        "77",
        "66",
        "55"
      ]
    }
  },
  {
    "source": "david-diaz",
    "image": "Copia de 3bet BB.png",
    "spot": "THREEBET_VS_OPEN",
    "hero": "BB",
    "vs": "UTG",
    "actions": {
      "3BET_MAIN": [
        "AA",
        "AKs",
        "AKo",
        "KK",
        "QQ",
        "JJ"
      ],
      "3BET_MIXED": [
        "AQs",
        "AJs",
        "KQs",
        "TT"
      ]
    }
  },
  {
    "source": "david-diaz",
    "image": "Copia de 3bet BB.png",
    "spot": "THREEBET_VS_OPEN",
    "hero": "BB",
    "vs": "MP",
    "actions": {
      "3BET_MAIN": [
        "AA",
        "AKs",
        "AQs",
        "AKo",
        "KK",
        "QQ",
        "JJ",
        "TT"
      ],
      "3BET_MIXED": [
        "AJs",
        "ATs",
        "KQs"
      ]
    }
  },
  {
    "source": "david-diaz",
    "image": "Copia de 3bet BB.png",
    "spot": "THREEBET_VS_OPEN",
    "hero": "BB",
    "vs": "CO",
    "actions": {
      "3BET_MAIN": [
        "AA",
        "AKs",
        "AQs",
        "AJs",
        "ATs",
        "A9s",
        "A5s",
        "A4s",
        "A3s",
        "AKo",
        "KK",
        "KQs",
        "KJs",
        "QQ",
        "QJs",
        "JJ",
        "JTs",
        "TT",
        "T9s",
        "99",
        "98s"
      ],
      "3BET_MIXED": [
        "KTs",
        "QTs"
      ]
    }
  },
  {
    "source": "david-diaz",
    "image": "Copia de 3bet BB.png",
    "spot": "THREEBET_VS_OPEN",
    "hero": "BB",
    "vs": "BTN",
    "actions": {
      "3BET_MAIN": [
        "AA",
        "AKs",
        "AQs",
        "AJs",
        "ATs",
        "A5s",
        "A4s",
        "A3s",
        "AKo",
        "KK",
        "KQs",
        "KJs",
        "KTs",
        "AQo",
        "QQ",
        "QJs",
        "QTs",
        "JJ",
        "JTs",
        "J9s",
        "TT",
        "T9s",
        "99",
        "98s",
        "88",
        "87s",
        "77",
        "76s"
      ],
      "3BET_MIXED": [
        "A9s",
        "KQo",
        "AJo"
      ]
    }
  },
  {
    "source": "david-diaz",
    "image": "Copia de 3bet BB.png",
    "spot": "THREEBET_VS_OPEN",
    "hero": "BB",
    "vs": "SB",
    "actions": {
      "3BET_MAIN": [
        "AA",
        "AKs",
        "AQs",
        "AJs",
        "ATs",
        "A9s",
        "A5s",
        "A4s",
        "A3s",
        "AKo",
        "KK",
        "KQs",
        "KJs",
        "KTs",
        "AQo",
        "QQ",
        "QJs",
        "QTs",
        "JJ",
        "JTs",
        "TT",
        "T9s",
        "99",
        "98s",
        "88",
        "87s",
        "77",
        "76s",
        "66",
        "65s"
      ],
      "3BET_MIXED": [
        "K4s",
        "K3s",
        "K2s",
        "Q3s",
        "Q2s",
        "A4o",
        "A3o",
        "A2o"
      ]
    }
  },
  {
    "source": "david-diaz",
    "image": "Copia de BB vs PFR 3bb 2.5bb.png",
    "spot": "BB_DEFENSE_VS_OPEN",
    "hero": "BB",
    "vs": "UTG",
    "actions": {
      "3BET_MAIN": [
        "AA",
        "AKs",
        "AKo",
        "KK",
        "QQ",
        "JJ"
      ],
      "3BET_MIXED": [
        "AQs",
        "AJs",
        "KQs",
        "TT"
      ],
      "CALL_STANDARD": [
        "ATs",
        "A9s",
        "A8s",
        "A7s",
        "A6s",
        "A5s",
        "A4s",
        "A3s",
        "A2s",
        "KJs",
        "KTs",
        "K9s",
        "AQo",
        "KQo",
        "QJs",
        "QTs",
        "Q9s",
        "AJo",
        "KJo",
        "QJo",
        "JTs",
        "J9s",
        "ATo",
        "T9s",
        "99",
        "98s",
        "88",
        "87s",
        "77",
        "76s",
        "66",
        "65s",
        "55",
        "54s",
        "44",
        "33",
        "22"
      ],
      "CALL_MARGINAL": [
        "K8s",
        "K7s",
        "K6s",
        "K5s",
        "K4s",
        "K3s",
        "Q8s",
        "J8s",
        "KTo",
        "T8s",
        "T7s",
        "97s",
        "86s",
        "75s",
        "64s",
        "53s",
        "43s"
      ]
    }
  },
  {
    "source": "david-diaz",
    "image": "Copia de BB vs PFR 3bb 2.5bb.png",
    "spot": "BB_DEFENSE_VS_OPEN",
    "hero": "BB",
    "vs": "MP",
    "actions": {
      "3BET_MAIN": [
        "AA",
        "AKs",
        "AQs",
        "AKo",
        "KK",
        "QQ",
        "JJ",
        "TT"
      ],
      "3BET_MIXED": [
        "AJs",
        "ATs",
        "KQs"
      ],
      "CALL_STANDARD": [
        "A9s",
        "A8s",
        "A7s",
        "A6s",
        "A5s",
        "A4s",
        "A3s",
        "A2s",
        "KJs",
        "KTs",
        "K9s",
        "K8s",
        "K7s",
        "AQo",
        "KQo",
        "QJs",
        "QTs",
        "Q9s",
        "AJo",
        "KJo",
        "QJo",
        "JTs",
        "J9s",
        "ATo",
        "T9s",
        "T8s",
        "99",
        "98s",
        "88",
        "87s",
        "77",
        "76s",
        "66",
        "65s",
        "55",
        "54s",
        "44",
        "33",
        "22"
      ],
      "CALL_MARGINAL": [
        "K6s",
        "K5s",
        "K4s",
        "K3s",
        "K2s",
        "Q8s",
        "Q7s",
        "Q6s",
        "J8s",
        "J7s",
        "KTo",
        "QTo",
        "JTo",
        "T7s",
        "A9o",
        "97s",
        "96s",
        "86s",
        "85s",
        "75s",
        "64s",
        "53s",
        "43s"
      ]
    }
  },
  {
    "source": "david-diaz",
    "image": "Copia de BB vs PFR 3bb 2.5bb.png",
    "spot": "BB_DEFENSE_VS_OPEN",
    "hero": "BB",
    "vs": "CO",
    "actions": {
      "3BET_MAIN": [
        "AA",
        "AKs",
        "AQs",
        "AJs",
        "ATs",
        "A9s",
        "A5s",
        "A4s",
        "A3s",
        "AKo",
        "KK",
        "KQs",
        "KJs",
        "QQ",
        "QJs",
        "JJ",
        "JTs",
        "TT",
        "T9s",
        "99",
        "98s"
      ],
      "CALL_STANDARD": [
        "A8s",
        "A7s",
        "A6s",
        "A2s",
        "K9s",
        "K8s",
        "K7s",
        "K6s",
        "K5s",
        "K4s",
        "AQo",
        "KQo",
        "Q9s",
        "Q8s",
        "AJo",
        "KJo",
        "QJo",
        "J9s",
        "J8s",
        "ATo",
        "KTo",
        "JTo",
        "T8s",
        "T7s",
        "97s",
        "88",
        "87s",
        "86s",
        "77",
        "76s",
        "75s",
        "66",
        "65s",
        "64s",
        "55",
        "54s",
        "44",
        "33",
        "22"
      ],
      "3BET_MIXED": [
        "KTs",
        "QTs"
      ],
      "CALL_MARGINAL": [
        "K3s",
        "K2s",
        "Q7s",
        "Q6s",
        "Q5s",
        "Q4s",
        "Q3s",
        "Q2s",
        "J7s",
        "J6s",
        "QTo",
        "T6s",
        "A9o",
        "J9o",
        "T9o",
        "96s",
        "A8o",
        "85s",
        "A7o",
        "74s",
        "63s",
        "A5o",
        "53s",
        "A4o",
        "43s"
      ]
    }
  },
  {
    "source": "david-diaz",
    "image": "Copia de BB vs PFR 3bb 2.5bb.png",
    "spot": "BB_DEFENSE_VS_OPEN",
    "hero": "BB",
    "vs": "BTN",
    "actions": {
      "3BET_MAIN": [
        "AA",
        "AKs",
        "AQs",
        "AJs",
        "ATs",
        "A5s",
        "A4s",
        "A3s",
        "AKo",
        "KK",
        "KQs",
        "KJs",
        "KTs",
        "AQo",
        "QQ",
        "QJs",
        "QTs",
        "JJ",
        "JTs",
        "J9s",
        "TT",
        "T9s",
        "99",
        "98s",
        "88",
        "87s",
        "77",
        "76s"
      ],
      "3BET_MIXED": [
        "A9s",
        "KQo",
        "AJo"
      ],
      "CALL_STANDARD": [
        "A8s",
        "A7s",
        "A6s",
        "A2s",
        "K9s",
        "K8s",
        "K7s",
        "K6s",
        "K5s",
        "K4s",
        "K3s",
        "K2s",
        "Q9s",
        "Q8s",
        "Q7s",
        "Q6s",
        "KJo",
        "QJo",
        "J8s",
        "J7s",
        "ATo",
        "KTo",
        "QTo",
        "JTo",
        "T8s",
        "T7s",
        "A9o",
        "T9o",
        "97s",
        "96s",
        "A8o",
        "86s",
        "A7o",
        "75s",
        "A6o",
        "66",
        "65s",
        "64s",
        "A5o",
        "55",
        "54s",
        "53s",
        "44",
        "33",
        "22"
      ],
      "CALL_MARGINAL": [
        "Q5s",
        "Q4s",
        "Q3s",
        "Q2s",
        "J6s",
        "J5s",
        "J4s",
        "J3s",
        "T6s",
        "K9o",
        "Q9o",
        "J9o",
        "95s",
        "T8o",
        "98o",
        "85s",
        "87o",
        "74s",
        "76o",
        "63s",
        "52s",
        "A4o",
        "43s",
        "42s",
        "A3o",
        "A2o"
      ]
    }
  },
  {
    "source": "david-diaz",
    "image": "Copia de BB vs PFR 3bb 2.5bb.png",
    "spot": "BB_DEFENSE_VS_OPEN",
    "hero": "BB",
    "vs": "SB",
    "actions": {
      "3BET_MAIN": [
        "AA",
        "AKs",
        "AQs",
        "AJs",
        "ATs",
        "A9s",
        "A5s",
        "A4s",
        "A3s",
        "AKo",
        "KK",
        "KQs",
        "KJs",
        "KTs",
        "AQo",
        "QQ",
        "QJs",
        "QTs",
        "JJ",
        "JTs",
        "TT",
        "T9s",
        "99",
        "98s",
        "88",
        "87s",
        "77",
        "76s",
        "66",
        "65s"
      ],
      "CALL_STANDARD": [
        "A8s",
        "A7s",
        "A6s",
        "A2s",
        "K9s",
        "K8s",
        "K7s",
        "K6s",
        "K5s",
        "KQo",
        "Q9s",
        "Q8s",
        "Q7s",
        "Q6s",
        "Q5s",
        "Q4s",
        "AJo",
        "KJo",
        "QJo",
        "J9s",
        "J8s",
        "J7s",
        "J6s",
        "J5s",
        "J4s",
        "J3s",
        "J2s",
        "ATo",
        "KTo",
        "QTo",
        "JTo",
        "T8s",
        "T7s",
        "T6s",
        "T5s",
        "T4s",
        "T3s",
        "A9o",
        "K9o",
        "Q9o",
        "J9o",
        "T9o",
        "97s",
        "96s",
        "95s",
        "94s",
        "93s",
        "A8o",
        "K8o",
        "Q8o",
        "J8o",
        "T8o",
        "98o",
        "86s",
        "85s",
        "84s",
        "83s",
        "A7o",
        "K7o",
        "Q7o",
        "J7o",
        "T7o",
        "97o",
        "87o",
        "75s",
        "74s",
        "73s",
        "A6o",
        "K6o",
        "76o",
        "64s",
        "63s",
        "62s",
        "A5o",
        "K5o",
        "65o",
        "55",
        "54s",
        "53s",
        "52s",
        "54o",
        "44",
        "43s",
        "42s",
        "33",
        "32s",
        "22"
      ],
      "3BET_MIXED": [
        "K4s",
        "K3s",
        "K2s",
        "Q3s",
        "Q2s",
        "A4o",
        "A3o",
        "A2o"
      ],
      "CALL_MARGINAL": [
        "T2s",
        "92s",
        "82s",
        "86o",
        "75o",
        "K4o",
        "64o"
      ]
    }
  },
  {
    "source": "david-diaz",
    "image": "Copia de MP-CO vs 4bet.png",
    "spot": "VS4BET_AFTER_3BET",
    "hero": "MP",
    "vs": "UTG",
    "actions": {
      "5BET_STACKOFF": [
        "AA",
        "KK"
      ],
      "CALL_VS_4BET": [
        "AKs",
        "AQs",
        "AKo",
        "QQ",
        "JJ",
        "TT",
        "99",
        "88"
      ],
      "FOLD_VS_4BET": [
        "AJs",
        "ATs",
        "KQs",
        "KJs",
        "KTs",
        "AQo",
        "QJs",
        "AJo"
      ]
    }
  },
  {
    "source": "david-diaz",
    "image": "Copia de MP-CO vs 4bet.png",
    "spot": "VS4BET_AFTER_3BET",
    "hero": "CO",
    "vs": "UTG",
    "actions": {
      "5BET_STACKOFF": [
        "AA",
        "KK"
      ],
      "CALL_VS_4BET": [
        "AKs",
        "AQs",
        "AKo",
        "QQ",
        "JJ",
        "TT",
        "99",
        "88",
        "77"
      ],
      "FOLD_VS_4BET": [
        "AJs",
        "ATs",
        "KQs",
        "KJs",
        "KTs",
        "AQo",
        "QJs",
        "AJo",
        "JTs"
      ]
    }
  },
  {
    "source": "david-diaz",
    "image": "Copia de MP-CO vs 4bet.png",
    "spot": "VS4BET_AFTER_3BET",
    "hero": "CO",
    "vs": "MP",
    "actions": {
      "5BET_STACKOFF": [
        "AA",
        "KK"
      ],
      "CALL_VS_4BET": [
        "AKs",
        "AQs",
        "AKo",
        "QQ",
        "JJ",
        "TT",
        "99",
        "88",
        "77"
      ],
      "FOLD_VS_4BET": [
        "AJs",
        "ATs",
        "KQs",
        "KJs",
        "KTs",
        "AQo",
        "KQo",
        "QJs",
        "AJo",
        "JTs"
      ]
    }
  },
  {
    "source": "david-diaz",
    "image": "Copia de BTN vs 4bet.png",
    "spot": "VS4BET_AFTER_3BET",
    "hero": "BTN",
    "vs": "UTG",
    "actions": {
      "5BET_STACKOFF": [
        "AA",
        "KK"
      ],
      "CALL_VS_4BET": [
        "AKs",
        "AQs",
        "AKo",
        "QQ",
        "JJ",
        "TT",
        "99",
        "88"
      ],
      "FOLD_VS_4BET": [
        "AJs",
        "ATs",
        "KQs",
        "KJs",
        "KTs",
        "AQo",
        "QJs",
        "AJo",
        "JTs",
        "77"
      ]
    }
  },
  {
    "source": "david-diaz",
    "image": "Copia de BTN vs 4bet.png",
    "spot": "VS4BET_AFTER_3BET",
    "hero": "BTN",
    "vs": "MP",
    "actions": {
      "5BET_STACKOFF": [
        "AA",
        "KK"
      ],
      "CALL_VS_4BET": [
        "AKs",
        "AQs",
        "AKo",
        "QQ",
        "JJ",
        "TT",
        "99",
        "88",
        "77"
      ],
      "FOLD_VS_4BET": [
        "AJs",
        "ATs",
        "KQs",
        "KJs",
        "KTs",
        "AQo",
        "KQo",
        "QJs",
        "QTs",
        "AJo",
        "JTs"
      ]
    }
  },
  {
    "source": "david-diaz",
    "image": "Copia de BTN vs 4bet.png",
    "spot": "VS4BET_AFTER_3BET",
    "hero": "BTN",
    "vs": "CO",
    "actions": {
      "CALL_VS_4BET": [
        "AA",
        "AQs",
        "AJs",
        "AQo",
        "JJ",
        "TT",
        "99",
        "88",
        "77",
        "66",
        "55"
      ],
      "5BET_STACKOFF": [
        "AKs",
        "AKo",
        "KK",
        "QQ"
      ],
      "FOLD_VS_4BET": [
        "ATs",
        "A9s",
        "A8s",
        "KQs",
        "KJs",
        "KTs",
        "KQo",
        "QJs",
        "QTs",
        "AJo",
        "JTs",
        "ATo"
      ]
    }
  },
  {
    "source": "david-diaz",
    "image": "Copia de SB vs 4bet.png",
    "spot": "VS4BET_AFTER_3BET",
    "hero": "SB",
    "vs": "UTG",
    "actions": {
      "5BET_STACKOFF": [
        "AA",
        "KK"
      ],
      "CALL_VS_4BET": [
        "AKs",
        "AKo",
        "QQ",
        "JJ",
        "TT",
        "99",
        "88"
      ],
      "FOLD_VS_4BET": [
        "AQs",
        "AJs",
        "ATs",
        "KQs",
        "KJs",
        "AQo",
        "QJs"
      ]
    }
  },
  {
    "source": "david-diaz",
    "image": "Copia de SB vs 4bet.png",
    "spot": "VS4BET_AFTER_3BET",
    "hero": "SB",
    "vs": "MP",
    "actions": {
      "5BET_STACKOFF": [
        "AA",
        "KK"
      ],
      "CALL_VS_4BET": [
        "AKs",
        "AKo",
        "QQ",
        "JJ",
        "TT",
        "99",
        "88"
      ],
      "FOLD_VS_4BET": [
        "AQs",
        "AJs",
        "ATs",
        "KQs",
        "KJs",
        "AQo",
        "QJs",
        "AJo"
      ]
    }
  },
  {
    "source": "david-diaz",
    "image": "Copia de SB vs 4bet.png",
    "spot": "VS4BET_AFTER_3BET",
    "hero": "SB",
    "vs": "CO",
    "actions": {
      "5BET_STACKOFF": [
        "AA",
        "AKs",
        "KK"
      ],
      "CALL_VS_4BET": [
        "AQs",
        "AKo",
        "QQ",
        "JJ",
        "TT",
        "99",
        "88"
      ],
      "FOLD_VS_4BET": [
        "AJs",
        "ATs",
        "KQs",
        "KJs",
        "KTs",
        "AQo",
        "KQo",
        "QJs",
        "QTs",
        "AJo",
        "JTs",
        "77"
      ]
    }
  },
  {
    "source": "david-diaz",
    "image": "Copia de SB vs 4bet.png",
    "spot": "VS4BET_AFTER_3BET",
    "hero": "SB",
    "vs": "BTN",
    "actions": {
      "5BET_STACKOFF": [
        "AA",
        "AKs",
        "KK"
      ],
      "CALL_VS_4BET": [
        "AQs",
        "AJs",
        "ATs",
        "AKo",
        "KQs",
        "AQo",
        "QQ",
        "JJ",
        "TT",
        "99",
        "88",
        "77",
        "66"
      ],
      "FOLD_VS_4BET": [
        "A9s",
        "A8s",
        "A7s",
        "A6s",
        "A5s",
        "A4s",
        "A3s",
        "A2s",
        "KJs",
        "KTs",
        "KQo",
        "QJs",
        "QTs",
        "AJo",
        "KJo",
        "QJo",
        "JTs",
        "ATo",
        "55"
      ]
    }
  },
  {
    "source": "david-diaz",
    "image": "Copia de BB vs 4bet.png",
    "spot": "VS4BET_AFTER_3BET",
    "hero": "BB",
    "vs": "UTG",
    "actions": {
      "5BET_STACKOFF": [
        "AA"
      ],
      "CALL_VS_4BET": [
        "AKs",
        "AKo",
        "KK",
        "QQ",
        "JJ"
      ],
      "FOLD_VS_4BET": [
        "AQs",
        "AJs",
        "KQs",
        "TT"
      ]
    }
  },
  {
    "source": "david-diaz",
    "image": "Copia de BB vs 4bet.png",
    "spot": "VS4BET_AFTER_3BET",
    "hero": "BB",
    "vs": "MP",
    "actions": {
      "5BET_STACKOFF": [
        "AA"
      ],
      "CALL_VS_4BET": [
        "AKs",
        "AKo",
        "KK",
        "QQ",
        "JJ",
        "TT"
      ],
      "FOLD_VS_4BET": [
        "AQs",
        "AJs",
        "ATs",
        "KQs"
      ]
    }
  },
  {
    "source": "david-diaz",
    "image": "Copia de BB vs 4bet.png",
    "spot": "VS4BET_AFTER_3BET",
    "hero": "BB",
    "vs": "CO",
    "actions": {
      "5BET_STACKOFF": [
        "AA",
        "AKs",
        "KK"
      ],
      "CALL_VS_4BET": [
        "AQs",
        "AJs",
        "AKo",
        "QQ",
        "JJ",
        "TT",
        "99"
      ],
      "FOLD_VS_4BET": [
        "ATs",
        "A9s",
        "A5s",
        "A4s",
        "A3s",
        "KQs",
        "KJs",
        "KTs",
        "QJs",
        "QTs",
        "JTs",
        "T9s",
        "98s"
      ]
    }
  },
  {
    "source": "david-diaz",
    "image": "Copia de BB vs 4bet.png",
    "spot": "VS4BET_AFTER_3BET",
    "hero": "BB",
    "vs": "BTN",
    "actions": {
      "5BET_STACKOFF": [
        "AA",
        "AKs",
        "AKo",
        "KK",
        "QQ"
      ],
      "CALL_VS_4BET": [
        "AQs",
        "AJs",
        "ATs",
        "AQo",
        "JJ",
        "TT",
        "99",
        "88",
        "77"
      ],
      "FOLD_VS_4BET": [
        "A9s",
        "A5s",
        "A4s",
        "A3s",
        "KQs",
        "KJs",
        "KTs",
        "KQo",
        "QJs",
        "QTs",
        "AJo",
        "JTs",
        "J9s",
        "T9s",
        "98s",
        "87s",
        "76s"
      ]
    }
  },
  {
    "source": "david-diaz",
    "image": "Copia de BB vs 4bet.png",
    "spot": "VS4BET_AFTER_3BET",
    "hero": "BB",
    "vs": "SB",
    "actions": {
      "5BET_STACKOFF": [
        "AA",
        "AKs",
        "AKo",
        "KK",
        "QQ"
      ],
      "CALL_VS_4BET": [
        "AQs",
        "AJs",
        "ATs",
        "KQs",
        "AQo",
        "QJs",
        "JJ",
        "TT",
        "99",
        "88",
        "87s",
        "77",
        "76s",
        "66",
        "65s"
      ],
      "FOLD_VS_4BET": [
        "A9s",
        "A5s",
        "A4s",
        "A3s",
        "KJs",
        "KTs",
        "K4s",
        "K3s",
        "K2s",
        "QTs",
        "Q3s",
        "Q2s",
        "JTs",
        "T9s",
        "98s",
        "A4o",
        "A3o",
        "A2o"
      ]
    }
  }
];

  for (const range of ranges) {
    for (const [action, hands] of Object.entries(range.actions)) {
      RT.defineRange({
        source: range.source,
        spot: range.spot,
        hero: range.hero,
        vs: range.vs,
        relative: null,
        action,
        hands
      });
    }
  }

  const actionCells = Object.create(null);
  ranges.forEach(range => Object.entries(range.actions).forEach(([action, hands]) => {
    actionCells[action] = (actionCells[action] || 0) + hands.length;
  }));
  RT.EXTRA_RANGES_DIAGNOSTIC = {
    contexts: ranges.length,
    bySpot: ranges.reduce((acc, range) => {
      acc[range.spot] = (acc[range.spot] || 0) + 1;
      return acc;
    }, Object.create(null)),
    byActionCells: actionCells
  };
  console.info('[RT] Rangos extra cargados', RT.EXTRA_RANGES_DIAGNOSTIC);

})(window.RT);
