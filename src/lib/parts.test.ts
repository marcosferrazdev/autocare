/** Auto-teste: node --experimental-strip-types src/lib/parts.test.ts */
import assert from 'node:assert/strict';
import { buildPartGroups, classifyPart, partInitials } from './parts.ts';

// classificação pelo nome, com acento e caixa misturados
assert.deepEqual(classifyPart('Filtro de Óleo'), { category: 'oleo', model: 'filter' });
assert.deepEqual(classifyPart('Filtro de ar do motor'), { category: 'oleo', model: 'airFilter' });
assert.deepEqual(classifyPart('Óleo 5W40 sintético'), { category: 'oleo', model: 'oil' });
assert.deepEqual(classifyPart('Pastilha de freio dianteira'), { category: 'freios', model: 'brake' });
assert.deepEqual(classifyPart('Pneu 185/60 R15'), { category: 'pneus', model: 'tire' });
assert.deepEqual(classifyPart('Amortecedor traseiro'), { category: 'suspensao', model: 'shock' });
assert.deepEqual(classifyPart('Bateria 60Ah'), { category: 'eletrica', model: 'battery' });
assert.deepEqual(classifyPart('Jogo de velas'), { category: 'eletrica', model: 'sparkPlug' });
assert.deepEqual(classifyPart('Correia dentada'), { category: 'motor', model: 'belt' });
// nome genérico cai no tipo da manutenção; nada casa → outros
assert.deepEqual(classifyPart('Kit completo', 'Arrefecimento'), { category: 'arrefecimento', model: 'radiator' });
assert.deepEqual(classifyPart('Parafuso'), { category: 'outros', model: 'gear' });

const m = (id: string, date: string, mileage: number, parts: { name: string; brand?: string; qty?: number; price: number }[], description = 'Serviço', totalCost = 0) => ({
  id, date, mileage, type: 'Preventiva', workshop: null, description, totalCost,
  parts: parts.map((p, i) => ({ id: `${id}-${i}`, name: p.name, brand: p.brand ?? null, quantity: p.qty ?? 1, unitPrice: p.price, totalPrice: p.price * (p.qty ?? 1) })),
});

const groups = buildPartGroups([
  m('a', '2026-01-10', 30000, [{ name: 'Filtro de óleo', brand: 'Mann', price: 40 }, { name: 'Óleo 5W40', qty: 4, price: 50 }]),
  m('b', '2026-06-10', 40000, [{ name: 'filtro de oleo', brand: 'Tecfil', price: 45 }]),
  m('c', '2026-07-01', 41000, [], 'Alinhamento e balanceamento', 140),
]);

// mesma peça com grafia diferente vira um grupo só, com a grafia mais recente
const filtro = groups.find((g) => g.key === 'peca:filtro de oleo')!;
assert.equal(filtro.occurrences.length, 2);
assert.equal(filtro.totalSpent, 85);
assert.equal(filtro.name, 'filtro de oleo');
assert.deepEqual(filtro.brands, ['Mann', 'Tecfil']);
assert.equal(filtro.lastMileage, 40000);

// quantidade soma; manutenção sem peças entra como serviço pela descrição
assert.equal(groups.find((g) => g.key === 'peca:oleo 5w40')!.totalQuantity, 4);
const servico = groups.find((g) => g.kind === 'servico')!;
assert.equal(servico.name, 'Alinhamento e balanceamento');
assert.equal(servico.category, 'pneus');
assert.equal(servico.totalSpent, 140);

// ordem: mais recente primeiro
assert.equal(groups[0].kind, 'servico');

assert.equal(partInitials('Filtro de óleo'), 'FÓ');
assert.equal(partInitials('Óleo 5W40 sintético'), 'Ó5');

console.log('ok');
