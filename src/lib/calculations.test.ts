/** Auto-teste: node --experimental-strip-types src/lib/calculations.test.ts */
import assert from 'node:assert/strict';
import { calculateFuelConsumptions, calculateAverageConsumption } from './calculations.ts';

const fill = (mileage: number, liters: number, fullTank = true) => ({ mileage, liters, fullTank });
const exato = (value: number) => ({ value, estimated: false });
const est = (value: number) => ({ value, estimated: true });

// cheio -> cheio: km rodados / litros que repuseram o tanque
assert.deepEqual(calculateFuelConsumptions([fill(1000, 40), fill(1400, 40)]), [null, exato(10)]);

// parcial no meio herda o km/L do trecho (500 km / 50 L)
assert.deepEqual(
  calculateFuelConsumptions([fill(1000, 40), fill(1200, 20, false), fill(1500, 30)]),
  [null, exato(10), exato(10)]
);

// fora de trecho vira estimativa: km desde o anterior / litros do anterior
assert.deepEqual(
  calculateFuelConsumptions([fill(1000, 40, false), fill(1400, 20, false), fill(1600, 30, false)]),
  [null, est(10), est(10)]
);

// parcial depois do último cheio é estimado até o próximo cheio fechar o trecho
assert.deepEqual(
  calculateFuelConsumptions([fill(1000, 40), fill(1400, 40), fill(1700, 25, false)]),
  [null, exato(10), est(7.5)]
);

// média ponderada: (400 + 100) km / (40 + 20) L = 8,33 (média das médias daria 7,5)
assert.deepEqual(calculateAverageConsumption([fill(1000, 30), fill(1400, 40), fill(1500, 20)]), exato(8.33));

// ordem de entrada não importa
assert.deepEqual(calculateAverageConsumption([fill(1500, 20), fill(1000, 30), fill(1400, 40)]), exato(8.33));

// sem tanque cheio: (1600 - 1000) km / (40 + 20) L, o último ainda não foi gasto
assert.deepEqual(
  calculateAverageConsumption([fill(1000, 40, false), fill(1400, 20, false), fill(1600, 30, false)]),
  est(10)
);

// dados insuficientes
assert.equal(calculateAverageConsumption([fill(1000, 30)]), null);
assert.equal(calculateAverageConsumption([]), null);

console.log('ok');
