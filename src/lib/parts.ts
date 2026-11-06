/**
 * Catálogo de peças: junta as peças listadas nas manutenções (e, quando a manutenção
 * não lista peça, o serviço da descrição) e classifica cada uma para cor e modelo 3D.
 */

/** Modelos 3D desenhados em código no visualizador. */
export type PartModel =
  | 'oil'
  | 'filter'
  | 'airFilter'
  | 'brake'
  | 'tire'
  | 'shock'
  | 'battery'
  | 'sparkPlug'
  | 'bulb'
  | 'radiator'
  | 'belt'
  | 'gear';

export type PartCategoryId =
  | 'oleo'
  | 'freios'
  | 'pneus'
  | 'suspensao'
  | 'eletrica'
  | 'arrefecimento'
  | 'motor'
  | 'outros';

export const PART_CATEGORIES: { id: PartCategoryId; name: string; color: string }[] = [
  { id: 'oleo', name: 'Óleo e filtros', color: '#e39a1d' },
  { id: 'freios', name: 'Freios', color: '#d0452c' },
  { id: 'pneus', name: 'Pneus e rodas', color: '#4a525c' },
  { id: 'suspensao', name: 'Suspensão', color: '#8a7be8' },
  { id: 'eletrica', name: 'Elétrica', color: '#3a5fe0' },
  { id: 'arrefecimento', name: 'Arrefecimento', color: '#14a3a8' },
  { id: 'motor', name: 'Motor e correias', color: '#12a06a' },
  { id: 'outros', name: 'Outros', color: '#6b737d' },
];

// Primeira regra que casa vence; o texto chega sem acento e em minúsculas
const RULES: { re: RegExp; category: PartCategoryId; model: PartModel }[] = [
  { re: /filtro.*\b(ar|cabine|combustivel|ar-condicionado)\b/, category: 'oleo', model: 'airFilter' },
  { re: /filtro/, category: 'oleo', model: 'filter' },
  { re: /oleo|lubrific|\b\d{1,2}w-?\d{2}\b/, category: 'oleo', model: 'oil' },
  { re: /pastilha|disco|freio|lona|tambor|pinca|cilindro mestre/, category: 'freios', model: 'brake' },
  { re: /pneu|roda|calota|alinhamento|balanceamento|calibragem|camara de ar/, category: 'pneus', model: 'tire' },
  { re: /amortecedor|mola|bandeja|pivo|bieleta|coxim|suspens|batente|bucha|terminal de direcao/, category: 'suspensao', model: 'shock' },
  { re: /bateria/, category: 'eletrica', model: 'battery' },
  { re: /\bvelas?\b|cabo de vela|bobina/, category: 'eletrica', model: 'sparkPlug' },
  { re: /lampada|farol|lanterna|\bled\b|pisca/, category: 'eletrica', model: 'bulb' },
  { re: /alternador|motor de partida|eletric|fusivel|chicote|sensor|rele/, category: 'eletrica', model: 'battery' },
  { re: /radiador|aditivo|arrefec|bomba d.?agua|termostat|mangueira|reservatorio|ventoinha/, category: 'arrefecimento', model: 'radiator' },
  { re: /correia|tensor|polia|corrente de comando/, category: 'motor', model: 'belt' },
  { re: /junta|pistao|motor|cabecote|retentor|embreagem|injetor|bico/, category: 'motor', model: 'gear' },
];

export function normalizeText(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Categoria e modelo 3D pelo nome; sem acerto, tenta o tipo da manutenção. */
export function classifyPart(name: string, maintenanceType?: string): { category: PartCategoryId; model: PartModel } {
  for (const text of [name, maintenanceType ?? '']) {
    const norm = normalizeText(text);
    if (!norm) continue;
    const rule = RULES.find((r) => r.re.test(norm));
    if (rule) return { category: rule.category, model: rule.model };
  }
  return { category: 'outros', model: 'gear' };
}

export interface MaintenanceForParts {
  id: string;
  date: string;
  mileage: number;
  type: string;
  workshop: string | null;
  description: string;
  totalCost: number;
  parts?: { id: string; name: string; brand: string | null; quantity: number; unitPrice: number; totalPrice: number }[];
}

export interface PartOccurrence {
  maintenanceId: string;
  date: string;
  mileage: number;
  workshop: string | null;
  description: string;
  brand: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface PartGroup {
  key: string;
  name: string;
  /** peça listada na manutenção, ou serviço tirado da descrição (manutenção sem peças) */
  kind: 'peca' | 'servico';
  category: PartCategoryId;
  model: PartModel;
  brands: string[];
  occurrences: PartOccurrence[];
  totalSpent: number;
  totalQuantity: number;
  lastDate: string;
  lastMileage: number;
}

export function buildPartGroups(maintenances: MaintenanceForParts[]): PartGroup[] {
  const groups = new Map<string, PartGroup>();

  const add = (kind: PartGroup['kind'], name: string, maintenanceType: string, occ: PartOccurrence) => {
    const key = `${kind}:${normalizeText(name)}`;
    let group = groups.get(key);
    if (!group) {
      group = {
        key,
        name: name.trim(),
        kind,
        ...classifyPart(name, maintenanceType),
        brands: [],
        occurrences: [],
        totalSpent: 0,
        totalQuantity: 0,
        lastDate: occ.date,
        lastMileage: occ.mileage,
      };
      groups.set(key, group);
    }
    group.occurrences.push(occ);
    group.totalSpent += occ.totalPrice;
    group.totalQuantity += occ.quantity;
    if (occ.brand && !group.brands.includes(occ.brand)) group.brands.push(occ.brand);
    if (new Date(occ.date) >= new Date(group.lastDate)) {
      group.lastDate = occ.date;
      group.lastMileage = occ.mileage;
      group.name = name.trim(); // vale a grafia mais recente
    }
  };

  for (const m of maintenances) {
    const base = { maintenanceId: m.id, date: m.date, mileage: m.mileage, workshop: m.workshop, description: m.description };
    if (m.parts && m.parts.length > 0) {
      for (const p of m.parts) {
        add('peca', p.name, m.type, { ...base, brand: p.brand, quantity: p.quantity, unitPrice: p.unitPrice, totalPrice: p.totalPrice });
      }
    } else if (m.description.trim()) {
      add('servico', m.description, m.type, { ...base, brand: null, quantity: 1, unitPrice: m.totalCost, totalPrice: m.totalCost });
    }
  }

  for (const g of groups.values()) {
    g.occurrences.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    g.totalSpent = Number(g.totalSpent.toFixed(2));
  }
  return [...groups.values()].sort((a, b) => new Date(b.lastDate).getTime() - new Date(a.lastDate).getTime());
}

/** Até duas iniciais do nome: "Filtro de óleo" → "FO". */
export function partInitials(name: string): string {
  const words = name.split(/\s+/).filter((w) => w.length > 2 || /^\d/.test(w));
  const picked = (words.length > 0 ? words : name.split(/\s+/)).slice(0, 2);
  return picked.map((w) => w[0]?.toUpperCase() ?? '').join('');
}
