'use strict';

(function (RT) {
  const presets = [
    ['pot-odds-01', 'pot-odds', 1, 'Pot Odds 01', 'Primeros outs', 'Fácil',
      { outs: [1,2,3,4,5], domains: ['raw_percent'], streets: ['flop_turn'], conversion: false, sessionSize: 5 }],
    ['pot-odds-02', 'pot-odds', 2, 'Pot Odds 02', 'Dos calles', 'Fácil',
      { outs: [1,2,3,4,5,6,7,8,9,10], domains: ['raw_percent'], streets: ['flop_turn','turn_river'], conversion: false, sessionSize: 20 }],
    ['pot-odds-03', 'pot-odds', 3, 'Pot Odds 03', 'Porcentaje y odds', 'Media',
      { outs: [1,2,3,4,5,6,7,8,9,10], domains: ['raw_percent','raw_odds'], streets: ['flop_turn','turn_river'], conversion: false, sessionSize: 30 }],
    ['pot-odds-04', 'pot-odds', 4, 'Pot Odds 04', 'Conversiones', 'Alta',
      { outs: Array.from({length:15},(_,i)=>i+1), domains: ['raw_percent','raw_odds'], streets: ['flop_turn','turn_river','flop_river'], conversion: true, sessionSize: 40 }],
    ['pot-odds-05', 'pot-odds', 5, 'Pot Odds 05', 'Pool completo', 'Experta',
      { outs: Array.from({length:20},(_,i)=>i+1), domains: ['raw_percent','raw_odds'], streets: ['flop_turn','turn_river','flop_river'], conversion: true, sessionSize: 0 }],

    ['equity-01', 'equity', 1, 'Equity 01', 'Teoría directa', 'Fácil',
      { practical: false, theory: true, theoryFormats: ['percent'], theoryTypes: ['eq'], sessionSize: 8 }],
    ['equity-02', 'equity', 2, 'Equity 02', 'Relación práctica', 'Fácil',
      { practical: true, theory: false, practicalTypes: ['relacion'], ranges: ['2-10'], bets: ['1/4','1/3','1/2'], sessionSize: 15 }],
    ['equity-03', 'equity', 3, 'Equity 03', 'Relación y equity', 'Media',
      { practical: true, theory: false, practicalTypes: ['relacion','equity'], ranges: ['2-10','12-30'], bets: ['1/4','1/3','1/2','2/3','3/4'], sessionSize: 30 }],
    ['equity-04', 'equity', 4, 'Equity 04', 'Teoría inversa', 'Alta',
      { practical: false, theory: true, theoryFormats: ['percent','ratio'], theoryTypes: ['eq','ratio','viceversa_eq','viceversa_ratio'], sessionSize: 24 }],
    ['equity-05', 'equity', 5, 'Equity 05', 'Pool completo', 'Experta',
      { practical: true, theory: true, practicalTypes: ['relacion','equity'], ranges: ['2-10','12-30','35-50'], bets: ['1/4','1/3','1/2','2/3','3/4','1x','1.5x','2x'], theoryFormats: ['percent','ratio'], theoryTypes: ['eq','ratio','viceversa_eq','viceversa_ratio'], sessionSize: 0 }],

    ['spr-01', 'spr', 1, 'SPR 01', 'Teoría y claves', 'Fácil',
      { practical: false, flashcards: ['teoria','interpretacion'], sessionSize: 16 }],
    ['spr-02', 'spr', 2, 'SPR 02', 'Cálculo básico', 'Fácil',
      { practical: true, stacks: ['15-35'], pots: ['2-10'], flashcards: [], sessionSize: 20 }],
    ['spr-03', 'spr', 3, 'SPR 03', 'Spots y manos', 'Media',
      { practical: true, stacks: ['15-35','40-60'], pots: ['2-10','12-30'], flashcards: ['ejemplos','manos'], sessionSize: 30 }],
    ['spr-04', 'spr', 4, 'SPR 04', 'Interpretación mixta', 'Alta',
      { practical: true, stacks: ['15-35','40-60','70-100'], pots: ['2-10','12-30'], flashcards: ['interpretacion','manos','teoria'], sessionSize: 40 }],
    ['spr-05', 'spr', 5, 'SPR 05', 'Pool completo', 'Experta',
      { practical: true, stacks: ['15-35','40-60','70-100'], pots: ['2-10','12-30','35-50'], flashcards: ['interpretacion','ejemplos','manos','teoria'], sessionSize: 0 }],

    ['numa-01', 'numa', 1, 'Numa 01', 'Suma y resta', 'Fácil',
      { operations: ['+','-'], numbers: [1,2,3,4,5], start: 1, end: 5, chain: 2, pokerLevels: [], modes: ['Random'], sessionSize: 20 }],
    ['numa-02', 'numa', 2, 'Numa 02', 'Operaciones completas', 'Media',
      { operations: ['+','-','×','÷'], numbers: [2,3,5,10], start: 1, end: 10, chain: 2, pokerLevels: [1], modes: ['Random'], sessionSize: 30 }],
    ['numa-03', 'numa', 3, 'Numa 03', 'Mirror y Poker Numbs', 'Alta',
      { operations: ['+','-','×','÷'], numbers: [2,3,4,5,6,8,10], start: 1, end: 10, chain: 2, pokerLevels: [1,2], modes: ['Random','Mirror'], sessionSize: 40 }],
    ['numa-04', 'numa', 4, 'Numa 04', 'Surges y Fugues', 'Muy alta',
      { operations: ['+','-','×','÷'], numbers: [2,3,5,7,10,12], start: 1, end: 15, chain: 2, pokerLevels: [2,3], modes: ['Surges','Fugues'], fuguesSpeed: '3H', sessionSize: 40 }],
    ['numa-05', 'numa', 5, 'Numa 05', 'Cipher avanzado', 'Experta',
      { operations: ['+','-','×','÷'], numbers: [2,3,5,10], start: 1, end: 10, chain: 3, pokerLevels: [3,4], modes: ['Random','Mirror','Cipher','Fugues'], fuguesSpeed: '2H', sessionSize: 50 }]
  ].map(([id, category, level, title, description, difficulty, config]) =>
    Object.freeze({ id, category, level, title, description, difficulty, config: Object.freeze(config) }));

  const byId = new Map(presets.map(preset => [preset.id, preset]));
  RT.MathTrainerPresets = {
    presets: Object.freeze(presets),
    get(id) { return byId.get(id) || null; }
  };
})(window.RT);
