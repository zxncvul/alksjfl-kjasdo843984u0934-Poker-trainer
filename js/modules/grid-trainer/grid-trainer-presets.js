'use strict';

(function (RT) {
  const exercisePresets = Object.freeze([
    {
      id: 'memory-01', category: 'memory', level: 1,
      title: 'Memory 01', description: 'Pulso básico',
      gridSize: 5, cellCount: 3, mode: 'memory', pattern: null,
      challengeEnabled: false, sequenceMode: 'free', duration: 1500,
      difficulty: 'Muy fácil', specialEffect: []
    },
    {
      id: 'memory-02', category: 'memory', level: 2,
      title: 'Memory 02', description: 'Bloque corto',
      gridSize: 5, cellCount: 4, mode: 'memory', pattern: null,
      challengeEnabled: false, sequenceMode: 'free', duration: 1200,
      difficulty: 'Fácil', specialEffect: []
    },
    {
      id: 'memory-03', category: 'memory', level: 3,
      title: 'Memory 03', description: 'Diagonal',
      gridSize: 6, cellCount: 5, mode: 'memory', pattern: 'diagonal',
      challengeEnabled: false, sequenceMode: 'free', duration: 1100,
      difficulty: 'Fácil', specialEffect: []
    },
    {
      id: 'memory-04', category: 'memory', level: 4,
      title: 'Memory 04', description: 'Ruptura',
      gridSize: 6, cellCount: 6, mode: 'memory', pattern: 'dispersed',
      challengeEnabled: false, sequenceMode: 'free', duration: 1000,
      difficulty: 'Media', specialEffect: []
    },
    {
      id: 'memory-05', category: 'memory', level: 5,
      title: 'Memory 05', description: 'Forward',
      gridSize: 7, cellCount: 6, mode: 'memory', pattern: null,
      challengeEnabled: false, sequenceMode: 'forward', duration: 1000,
      difficulty: 'Media', specialEffect: []
    },
    {
      id: 'memory-06', category: 'memory', level: 6,
      title: 'Memory 06', description: 'Backward',
      gridSize: 7, cellCount: 7, mode: 'memory', pattern: null,
      challengeEnabled: false, sequenceMode: 'backward', duration: 900,
      difficulty: 'Media-Alta', specialEffect: []
    },
    {
      id: 'memory-07', category: 'memory', level: 7,
      title: 'Memory 07', description: 'Flash',
      gridSize: 8, cellCount: 8, mode: 'memory', pattern: null,
      challengeEnabled: false, sequenceMode: 'free', duration: 700,
      difficulty: 'Alta', specialEffect: ['flash']
    },
    {
      id: 'memory-08', category: 'memory', level: 8,
      title: 'Memory 08', description: 'Inversión',
      gridSize: 8, cellCount: 9, mode: 'memory', pattern: null,
      challengeEnabled: false, sequenceMode: 'free', duration: 800,
      difficulty: 'Alta', specialEffect: ['contrast-inversion']
    },
    {
      id: 'memory-09', category: 'memory', level: 9,
      title: 'Memory 09', description: 'Doble fase',
      gridSize: 9, cellCount: 10, mode: 'memory', pattern: null,
      challengeEnabled: false, sequenceMode: 'free', duration: [700, 400],
      difficulty: 'Muy alta', specialEffect: ['double-phase', 'partial-reappearance']
    },
    {
      id: 'memory-10', category: 'memory', level: 10,
      title: 'Memory 10', description: 'Caos controlado',
      gridSize: 10, cellCount: 12, mode: 'memory', pattern: 'complex',
      challengeEnabled: false, sequenceMode: 'combined', duration: 550,
      difficulty: 'Extrema',
      specialEffect: ['soft-decoys', 'complex-pattern']
    },
    {
      id: 'visual-01', category: 'visual', level: 1,
      title: 'Visual 01', description: 'Grid libre',
      gridSize: 5, cellCount: null, mode: 'script', pattern: null,
      challengeEnabled: false, sequenceMode: null, duration: null,
      difficulty: null, objective: 'Familiarización', specialEffect: []
    },
    {
      id: 'visual-02', category: 'visual', level: 2,
      title: 'Visual 02', description: 'Cantidad exacta',
      gridSize: 5, cellCount: null, mode: 'script', pattern: null,
      challengeEnabled: false, sequenceMode: null, duration: null,
      difficulty: null, objective: 'Seleccionar cantidad exacta', specialEffect: []
    },
    {
      id: 'visual-03', category: 'visual', level: 3,
      title: 'Visual 03', description: 'Pintar todo',
      gridSize: 6, cellCount: null, mode: 'script', pattern: null,
      challengeEnabled: false, sequenceMode: null, duration: null,
      difficulty: null, objective: 'Completar patrón', specialEffect: []
    },
    {
      id: 'visual-04', category: 'visual', level: 4,
      title: 'Visual 04', description: 'Pair',
      gridSize: 6, cellCount: null, mode: 'script', pattern: 'pair',
      challengeEnabled: false, sequenceMode: null, duration: null,
      difficulty: null, objective: 'Simetrías', specialEffect: []
    },
    {
      id: 'visual-05', category: 'visual', level: 5,
      title: 'Visual 05', description: 'Zigzag',
      gridSize: 7, cellCount: null, mode: 'script', pattern: 'zig',
      challengeEnabled: false, sequenceMode: null, duration: null,
      difficulty: null, objective: 'Trayectorias', specialEffect: []
    },
    {
      id: 'visual-06', category: 'visual', level: 6,
      title: 'Visual 06', description: 'Challenge básico',
      gridSize: 7, cellCount: null, mode: 'script', pattern: null,
      challengeEnabled: true, sequenceMode: null, duration: null,
      difficulty: null, objective: 'Identificar manos objetivo', specialEffect: []
    },
    {
      id: 'visual-07', category: 'visual', level: 7,
      title: 'Visual 07', description: 'Challenge Rings',
      gridSize: 8, cellCount: null, mode: 'script', pattern: 'ring',
      challengeEnabled: true, sequenceMode: null, duration: null,
      difficulty: null, objective: 'Lectura periférica', specialEffect: []
    },
    {
      id: 'visual-08', category: 'visual', level: 8,
      title: 'Visual 08', description: 'Challenge Spiral',
      gridSize: 8, cellCount: null, mode: 'script', pattern: 'spiral',
      challengeEnabled: true, sequenceMode: null, duration: null,
      difficulty: null, objective: 'Seguimiento visual', specialEffect: []
    },
    {
      id: 'visual-09', category: 'visual', level: 9,
      title: 'Visual 09', description: 'Challenge Inversión',
      gridSize: 9, cellCount: null, mode: 'script', pattern: null,
      challengeEnabled: true, sequenceMode: null, duration: null,
      difficulty: null, objective: 'Reconocimiento bajo interferencia',
      specialEffect: ['temporary-inversion']
    },
    {
      id: 'visual-10', category: 'visual', level: 10,
      title: 'Visual 10', description: 'Challenge Presión',
      gridSize: 10, cellCount: null, mode: 'script', pattern: null,
      challengeEnabled: true, sequenceMode: null, duration: null,
      difficulty: null, objective: 'Máxima precisión bajo presión',
      specialEffect: ['partial-hiding', 'brief-inversion', 'soft-decoys', 'time-pressure']
    }
  ]);

  const byId = new Map(exercisePresets.map(preset => [preset.id, preset]));

  RT.GridTrainerPresets = {
    exercisePresets,
    get(id) {
      return byId.get(id) || null;
    }
  };
})(window.RT);
