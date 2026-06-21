# Módulo Math Trainer

Consulta la documentación funcional completa en
[`README_MATH_TRAINER.md`](../../../README_MATH_TRAINER.md).

El punto público es `index.js`; registra `math-trainer` en `RT.Modules` y
compone estado, motor, estadísticas e interfaz. Ningún archivo del módulo
depende de lógica privada de rangos, Grid Trainer o Simulador.

Los presets son accesos rápidos declarativos. La configuración manual conserva
todos los modos y datasets del proyecto original y sigue disponible después de
cargar cualquier preset.

El motor fija un snapshot al iniciar cada sesión, bloquea envíos duplicados y
mantiene una fase propia para el repaso de fallos. Las flashcards vuelven a
ocultar su respuesta en cada intento.

NUMA admite cadenas de 2 a 12 operaciones. Cuando se selecciona el pool
completo, una estimación superior a 50.000 combinaciones se rechaza antes de
generar para evitar bloquear la interfaz; basta reducir cadena, rango o números.

La persistencia usa `rangeTrainer.mathTrainer.stats`. El tiempo medio incluye
todos los intentos cronometrados y la carga sanea datos vacíos, antiguos o
corruptos.

La auditoría funcional está documentada en
[`AUDITORIA_MATH_TRAINER.md`](../../../AUDITORIA_MATH_TRAINER.md).

## Pot Odds Trainer

Math Trainer contiene una segunda pestaña interna, `Pot Odds Trainer`, montada
en los mismos cuatro hosts del workspace. Es un submodulo aislado con estado,
motor, interfaz, adaptador y estadisticas propios.

La migracion conserva Outs Basicos, Duel Odds, evaluacion de manos, Identify,
Ranking, Reveal, teclado numerico, memoria, countdown y bloqueos. No reutiliza
los estilos globales, fuentes, recargas ni listeners globales del proyecto
original.

Consulta su documentacion en
[`pot-odds-trainer/README.md`](pot-odds-trainer/README.md).
