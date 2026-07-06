'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useCar } from '@/components/providers/car-provider';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { formatDate, formatMileage } from '@/lib/formatters';
import { resolveCityUF, normalizeCityName, UF_NAMES } from '@/lib/br-cities';
import {
  Map as MapIcon,
  MapPin,
  Trophy,
  Loader2,
  Fuel,
  Info,
  Plus,
  Route,
  ArrowRight,
  Edit,
  Trash2,
  X,
  Calendar,
} from 'lucide-react';

/** Tile grid do Brasil: fallback quando a malha do IBGE não carrega. */
const UF_TILES: Record<string, { col: number; row: number }> = {
  RR: { col: 2, row: 0 }, AP: { col: 4, row: 0 },
  AM: { col: 1, row: 1 }, PA: { col: 3, row: 1 }, MA: { col: 5, row: 1 }, CE: { col: 7, row: 1 }, RN: { col: 8, row: 1 },
  AC: { col: 0, row: 2 }, RO: { col: 2, row: 2 }, TO: { col: 4, row: 2 }, PI: { col: 6, row: 2 }, PB: { col: 8, row: 2 },
  MT: { col: 3, row: 3 }, BA: { col: 5, row: 3 }, PE: { col: 7, row: 3 }, AL: { col: 8, row: 3 },
  MS: { col: 3, row: 4 }, GO: { col: 4, row: 4 }, DF: { col: 5, row: 4 }, SE: { col: 7, row: 4 },
  SP: { col: 4, row: 5 }, MG: { col: 5, row: 5 }, ES: { col: 6, row: 5 },
  PR: { col: 3, row: 6 }, RJ: { col: 5, row: 6 },
  SC: { col: 3, row: 7 },
  RS: { col: 2, row: 8 },
};

/** Código IBGE → sigla da UF (a malha do IBGE identifica estados por codarea). */
const IBGE_TO_UF: Record<string, string> = {
  '11': 'RO', '12': 'AC', '13': 'AM', '14': 'RR', '15': 'PA', '16': 'AP', '17': 'TO',
  '21': 'MA', '22': 'PI', '23': 'CE', '24': 'RN', '25': 'PB', '26': 'PE', '27': 'AL',
  '28': 'SE', '29': 'BA',
  '31': 'MG', '32': 'ES', '33': 'RJ', '35': 'SP',
  '41': 'PR', '42': 'SC', '43': 'RS',
  '50': 'MS', '51': 'MT', '52': 'GO', '53': 'DF',
};

const IBGE_MESH_URL =
  'https://servicodados.ibge.gov.br/api/v3/malhas/paises/BR?intrarregiao=UF&qualidade=minima&formato=application/vnd.geo+json';

const MAP_CACHE_KEY = 'rodanexo_br_map_v2';
const MAP_WIDTH = 560;

interface StatePath {
  uf: string;
  d: string;
}

interface MapBounds {
  minLon: number;
  maxLon: number;
  minLat: number;
  maxLat: number;
}

interface BrazilMapData {
  width: number;
  height: number;
  paths: StatePath[];
  bounds: MapBounds;
}

/** Projeta a malha GeoJSON do IBGE (lon/lat) para paths SVG com projeção equiretangular. */
function buildBrazilMap(geojson: {
  features: { properties: { codarea: string }; geometry: { type: string; coordinates: unknown } }[];
}): BrazilMapData {
  type Ring = [number, number][];
  const polygonsOf = (geometry: { type: string; coordinates: unknown }): Ring[][] =>
    geometry.type === 'Polygon'
      ? [geometry.coordinates as Ring[]]
      : (geometry.coordinates as Ring[][]);

  let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity;
  for (const feature of geojson.features) {
    for (const polygon of polygonsOf(feature.geometry)) {
      for (const ring of polygon) {
        for (const [lon, lat] of ring) {
          if (lon < minLon) minLon = lon;
          if (lon > maxLon) maxLon = lon;
          if (lat < minLat) minLat = lat;
          if (lat > maxLat) maxLat = lat;
        }
      }
    }
  }

  const lonSpan = maxLon - minLon;
  const latSpan = maxLat - minLat;
  const height = Math.round(MAP_WIDTH * (latSpan / lonSpan));

  const px = (lon: number) => (((lon - minLon) / lonSpan) * MAP_WIDTH).toFixed(1);
  const py = (lat: number) => (((maxLat - lat) / latSpan) * height).toFixed(1);

  const paths: StatePath[] = [];
  for (const feature of geojson.features) {
    const uf = IBGE_TO_UF[feature.properties.codarea];
    if (!uf) continue;
    let d = '';
    for (const polygon of polygonsOf(feature.geometry)) {
      for (const ring of polygon) {
        d += ring
          .map(([lon, lat], i) => `${i === 0 ? 'M' : 'L'}${px(lon)},${py(lat)}`)
          .join('');
        d += 'Z';
      }
    }
    paths.push({ uf, d });
  }

  return { width: MAP_WIDTH, height, paths, bounds: { minLon, maxLon, minLat, maxLat } };
}

/** Projeta lat/lon para coordenadas do SVG (mesma projeção do mapa). */
function projectPoint(lat: number, lon: number, map: BrazilMapData): { x: number; y: number } {
  const { minLon, maxLon, minLat, maxLat } = map.bounds;
  return {
    x: ((lon - minLon) / (maxLon - minLon)) * map.width,
    y: ((maxLat - lat) / (maxLat - minLat)) * map.height,
  };
}

/** Resultado de geocodificação por cidade (null = tentou e não achou). */
interface GeoEntry {
  lat: number | null;
  lon: number | null;
  uf: string | null;
}

const GEO_CACHE_KEY = 'rodanexo_geo_v1';

function loadGeoCache(): Record<string, GeoEntry> {
  try {
    return JSON.parse(localStorage.getItem(GEO_CACHE_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveGeoCache(cache: Record<string, GeoEntry>) {
  try {
    localStorage.setItem(GEO_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // sem espaço: paciência, geocodifica de novo na próxima
  }
}

/**
 * Geocodifica cidades via Nominatim (OpenStreetMap) — grátis, sem chave.
 * Sequencial com ~1,1s entre chamadas para respeitar o rate limit; resultados
 * (inclusive negativos) ficam em cache local, então cada cidade só é buscada uma vez.
 */
async function geocodeCity(label: string, uf: string | null): Promise<GeoEntry> {
  const query = encodeURIComponent(`${label}, ${uf ? `${UF_NAMES[uf]}, ` : ''}Brasil`);
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${query}&format=jsonv2&addressdetails=1&limit=1&countrycodes=br`
  );
  if (!res.ok) throw new Error('Nominatim indisponível');
  const results = await res.json();
  if (!Array.isArray(results) || results.length === 0) {
    return { lat: null, lon: null, uf: null };
  }
  const hit = results[0];
  const iso: string | undefined = hit.address?.['ISO3166-2-lvl4'];
  return {
    lat: parseFloat(hit.lat),
    lon: parseFloat(hit.lon),
    uf: iso && iso.startsWith('BR-') ? iso.slice(3) : null,
  };
}

/** Carrega a malha do IBGE (com cache local) e devolve os paths projetados. */
function useBrazilMap() {
  const [map, setMap] = useState<BrazilMapData | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    try {
      const cached = localStorage.getItem(MAP_CACHE_KEY);
      if (cached) {
        setMap(JSON.parse(cached));
        return;
      }
    } catch {
      // cache corrompido: segue para o fetch
    }

    let active = true;
    fetch(IBGE_MESH_URL)
      .then((res) => {
        if (!res.ok) throw new Error('IBGE indisponível');
        return res.json();
      })
      .then((geojson) => {
        if (!active) return;
        const data = buildBrazilMap(geojson);
        setMap(data);
        try {
          localStorage.setItem(MAP_CACHE_KEY, JSON.stringify(data));
        } catch {
          // localStorage cheio: sem cache, sem problema
        }
      })
      .catch(() => {
        if (active) setFailed(true);
      });

    return () => {
      active = false;
    };
  }, []);

  return { map, failed };
}

interface CityConquest {
  label: string;
  uf: string | null;
  visits: number;
  lastDate: string;
}

interface Trip {
  id: string;
  carId: string;
  title: string;
  originCity: string;
  destinationCity: string;
  startDate: string;
  endDate: string | null;
  startMileage: number | null;
  endMileage: number | null;
  notes: string | null;
}

interface TripFormState {
  carId: string;
  title: string;
  originCity: string;
  destinationCity: string;
  startDate: string;
  endDate: string;
  startMileage: string;
  endMileage: string;
  notes: string;
}

const emptyTripForm = (carId: string): TripFormState => ({
  carId,
  title: '',
  originCity: '',
  destinationCity: '',
  startDate: '',
  endDate: '',
  startMileage: '',
  endMileage: '',
  notes: '',
});

export default function TripsPage() {
  const { cars, selectedCarId, loading: carsLoading } = useCar();
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const [cities, setCities] = useState<CityConquest[] | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [reloadKey, setReloadKey] = useState(0);
  const [geo, setGeo] = useState<Record<string, GeoEntry>>(() =>
    typeof window !== 'undefined' ? loadGeoCache() : {}
  );
  const { map, failed: mapFailed } = useBrazilMap();

  // Modal de registro/edição de viagem
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Trip | null>(null);
  const [form, setForm] = useState<TripFormState>(emptyTripForm(''));
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Geocodifica cidades ainda não resolvidas (uma a uma, com cache local)
  useEffect(() => {
    if (!cities || cities.length === 0) return;

    const pending = cities.filter((c) => loadGeoCache()[normalizeCityName(c.label)] === undefined);
    if (pending.length === 0) return;

    let active = true;
    (async () => {
      const cache = loadGeoCache();
      for (const city of pending) {
        if (!active) return;
        const key = normalizeCityName(city.label);
        if (cache[key] !== undefined) continue;
        try {
          cache[key] = await geocodeCity(city.label, city.uf);
        } catch {
          // rede/serviço falhou: não grava negativo, tenta na próxima visita
          break;
        }
        saveGeoCache(cache);
        if (active) setGeo({ ...cache });
        // Rate limit do Nominatim: 1 requisição por segundo
        await new Promise((resolve) => setTimeout(resolve, 1100));
      }
    })();

    return () => {
      active = false;
    };
  }, [cities]);

  useEffect(() => {
    if (carsLoading) return;
    if (cars.length === 0) {
      setCities([]);
      return;
    }

    let active = true;
    (async () => {
      try {
        // Conquistas são do usuário: agrega abastecimentos e viagens de todos os carros
        const [fuelResponses, tripResponses] = await Promise.all([
          Promise.all(
            cars.map((car) =>
              fetch(`/api/cars/${car.id}/fuel-records`).then((res) => (res.ok ? res.json() : []))
            )
          ),
          Promise.all(
            cars.map((car) =>
              fetch(`/api/cars/${car.id}/trips`).then((res) => (res.ok ? res.json() : []))
            )
          ),
        ]);

        const byCity = new Map<string, CityConquest>();
        const addVisit = (rawCity: string, date: string) => {
          if (!rawCity || !rawCity.trim()) return;
          const { city, uf } = resolveCityUF(rawCity);
          const key = `${city.toLowerCase()}|${uf ?? '?'}`;
          const existing = byCity.get(key);
          if (existing) {
            existing.visits += 1;
            if (date > existing.lastDate) existing.lastDate = date;
          } else {
            byCity.set(key, { label: city, uf, visits: 1, lastDate: date });
          }
        };

        for (const records of fuelResponses) {
          for (const record of records) {
            addVisit(record.city, record.date);
          }
        }

        const allTrips: Trip[] = tripResponses.flat();
        for (const trip of allTrips) {
          addVisit(trip.originCity, trip.startDate);
          addVisit(trip.destinationCity, trip.endDate || trip.startDate);
        }

        if (active) {
          setTrips(allTrips.sort((a, b) => (a.startDate < b.startDate ? 1 : -1)));
          setCities([...byCity.values()].sort((a, b) => b.visits - a.visits));
        }
      } catch (err) {
        console.error(err);
        if (active) setCities([]);
      }
    })();

    return () => {
      active = false;
    };
  }, [cars, carsLoading, reloadKey]);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyTripForm(selectedCarId || cars[0]?.id || ''));
    setFormError(null);
    setShowModal(true);
  };

  const openEdit = (trip: Trip) => {
    setEditing(trip);
    setForm({
      carId: trip.carId,
      title: trip.title,
      originCity: trip.originCity,
      destinationCity: trip.destinationCity,
      startDate: trip.startDate.slice(0, 10),
      endDate: trip.endDate ? trip.endDate.slice(0, 10) : '',
      startMileage: trip.startMileage !== null ? String(trip.startMileage) : '',
      endMileage: trip.endMileage !== null ? String(trip.endMileage) : '',
      notes: trip.notes || '',
    });
    setFormError(null);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const payload = {
      title: form.title,
      originCity: form.originCity,
      destinationCity: form.destinationCity,
      startDate: form.startDate,
      endDate: form.endDate || null,
      startMileage: form.startMileage ? Number(form.startMileage) : null,
      endMileage: form.endMileage ? Number(form.endMileage) : null,
      notes: form.notes || null,
    };

    try {
      setSubmitting(true);
      const res = editing
        ? await fetch(`/api/trips/${editing.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch(`/api/cars/${form.carId}/trips`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

      if (!res.ok) {
        const errData = await res.json();
        const details = errData.details
          ? Object.values(errData.details as Record<string, string[]>).flat()[0]
          : null;
        throw new Error(details || errData.error || 'Erro ao salvar viagem.');
      }

      toast(editing ? 'Viagem atualizada!' : 'Viagem registrada! Mapa atualizado.');
      setShowModal(false);
      setReloadKey((k) => k + 1);
    } catch (err: any) {
      setFormError(err.message || 'Erro ao salvar viagem.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (trip: Trip) => {
    const ok = await confirm({
      title: 'Excluir viagem',
      message: `Excluir "${trip.title}"? As cidades desta viagem deixam de contar no mapa.`,
    });
    if (!ok) return;

    try {
      const res = await fetch(`/api/trips/${trip.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Erro ao excluir viagem.');
      toast('Viagem excluída.');
      setReloadKey((k) => k + 1);
    } catch (err: any) {
      toast(err.message || 'Erro ao excluir viagem.', 'error');
    }
  };

  if (carsLoading || cities === null) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Enriquece com geocodificação: UF (dicionário → geocoder) + coordenadas para os pins
  const enriched = cities.map((c) => {
    const entry = geo[normalizeCityName(c.label)];
    return {
      ...c,
      uf: c.uf ?? entry?.uf ?? null,
      lat: entry?.lat ?? null,
      lon: entry?.lon ?? null,
      geoPending: entry === undefined,
    };
  });

  const mapped = enriched.filter((c) => c.uf !== null);
  // "Sem estado" só depois que o geocoder tentou e falhou
  const unmapped = enriched.filter((c) => c.uf === null && !c.geoPending);
  const pendingCount = enriched.filter((c) => c.geoPending).length;

  const conqueredUFs = new Set(mapped.map((c) => c.uf as string));
  const totalVisits = cities.reduce((sum, c) => sum + c.visits, 0);

  const citiesByUF = mapped.reduce<Record<string, (typeof enriched)[number][]>>((acc, c) => {
    const uf = c.uf as string;
    (acc[uf] = acc[uf] || []).push(c);
    return acc;
  }, {});

  const pins = enriched.filter((c) => c.lat !== null && c.lon !== null);

  const conqueredList = [...conqueredUFs].sort(
    (a, b) => citiesByUF[b].length - citiesByUF[a].length
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Viagens</h1>
          <p className="text-slate-500 text-sm">
            Registre suas viagens e abasteça pelo caminho: cada cidade pinta o mapa.
          </p>
        </div>
        {cars.length > 0 && (
          <button
            onClick={openAdd}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2.5 rounded-md text-xs transition-all shadow-md hover:shadow-lg flex items-center gap-1.5 self-start"
          >
            <Plus className="h-4 w-4" /> Registrar Viagem
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 bg-white border border-slate-200 rounded-lg divide-x divide-y lg:divide-y-0 divide-slate-100 overflow-hidden">
        <div className="p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-[0.15em]">Estados</p>
            <Trophy className="h-3.5 w-3.5 text-slate-300" />
          </div>
          <p className="text-2xl font-bold text-slate-900 tracking-tight">
            {conqueredUFs.size}<span className="text-sm text-slate-400 font-semibold"> / 27</span>
          </p>
          <div className="h-1 bg-slate-100 rounded-full overflow-hidden mt-2.5 max-w-[120px]">
            <div
              className="h-full rounded-full bg-blue-600"
              style={{ width: `${(conqueredUFs.size / 27) * 100}%` }}
            />
          </div>
        </div>
        <div className="p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-[0.15em]">Cidades</p>
            <MapPin className="h-3.5 w-3.5 text-slate-300" />
          </div>
          <p className="text-2xl font-bold text-slate-900 tracking-tight">{cities.length}</p>
          <p className="text-xxs text-slate-400 mt-1.5">lugares diferentes</p>
        </div>
        <div className="p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-[0.15em]">Viagens</p>
            <Route className="h-3.5 w-3.5 text-slate-300" />
          </div>
          <p className="text-2xl font-bold text-slate-900 tracking-tight">{trips.length}</p>
          <p className="text-xxs text-slate-400 mt-1.5">registradas por você</p>
        </div>
        <div className="p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-[0.15em]">Passagens</p>
            <Fuel className="h-3.5 w-3.5 text-slate-300" />
          </div>
          <p className="text-2xl font-bold text-slate-900 tracking-tight">{totalVisits}</p>
          <p className="text-xxs text-slate-400 mt-1.5">viagens + abastecimentos</p>
        </div>
      </div>

      {cities.length === 0 ? (
        /* Empty state */
        <div className="bg-white p-12 rounded-lg border border-slate-200 text-center max-w-lg mx-auto">
          <MapIcon className="h-12 w-12 text-slate-200 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-slate-800 mb-2">Seu mapa ainda está em branco</h2>
          <p className="text-slate-500 text-sm leading-relaxed mb-6">
            Registre uma <strong>viagem</strong> aqui, ou preencha o campo <strong>Cidade</strong>{' '}
            nos abastecimentos. Cada cidade nova vira uma conquista e pinta o estado no mapa.
          </p>
          {cars.length > 0 ? (
            <button
              onClick={openAdd}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-md transition-all shadow-md hover:shadow-lg inline-flex items-center gap-2 text-sm"
            >
              <Plus className="h-4 w-4" /> Registrar Minha Primeira Viagem
            </button>
          ) : (
            <Link
              href="/cars/new"
              className="text-blue-600 hover:text-blue-700 font-bold text-sm hover:underline"
            >
              Cadastre um veículo primeiro →
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
          {/* Mapa do Brasil (malha oficial IBGE; tile grid como fallback) */}
          <div className="lg:col-span-3 bg-white border border-slate-200 rounded-lg p-6">
            <h3 className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-[0.15em] mb-5">
              Território Conquistado
            </h3>

            {map ? (
              <svg
                viewBox={`0 0 ${map.width} ${map.height}`}
                className="w-full max-w-xl mx-auto block"
                role="img"
                aria-label="Mapa do Brasil com estados visitados destacados"
              >
                {map.paths.map(({ uf, d }) => {
                  const conquered = conqueredUFs.has(uf);
                  const ufCities = citiesByUF[uf] || [];
                  return (
                    <path
                      key={uf}
                      d={d}
                      className={`transition-colors ${
                        conquered
                          ? 'fill-blue-600 hover:fill-blue-500'
                          : 'fill-slate-100 hover:fill-slate-200'
                      }`}
                      stroke="#ffffff"
                      strokeWidth={1}
                      strokeLinejoin="round"
                    >
                      <title>
                        {conquered
                          ? `${UF_NAMES[uf]} — ${ufCities.length} cidade${ufCities.length > 1 ? 's' : ''}: ${ufCities.map((c) => c.label).join(', ')}`
                          : UF_NAMES[uf]}
                      </title>
                    </path>
                  );
                })}

                {/* Pins das cidades geocodificadas (anel branco para leitura sobre o azul) */}
                {pins.map((c) => {
                  const { x, y } = projectPoint(c.lat as number, c.lon as number, map);
                  return (
                    <g key={c.label} className="cursor-pointer">
                      <circle cx={x} cy={y} r={9} fill="transparent">
                        <title>{`${c.label}${c.uf ? ` (${c.uf})` : ''} — ${c.visits} passagem${c.visits > 1 ? 's' : ''}, última em ${formatDate(c.lastDate)}`}</title>
                      </circle>
                      <circle
                        cx={x}
                        cy={y}
                        r={4}
                        className="fill-amber-400 hover:fill-amber-300 transition-colors pointer-events-none"
                        stroke="#ffffff"
                        strokeWidth={1.5}
                      />
                    </g>
                  );
                })}
              </svg>
            ) : mapFailed ? (
              /* Fallback: tile grid */
              <div
                className="grid gap-1.5 max-w-md mx-auto"
                style={{ gridTemplateColumns: 'repeat(9, minmax(0, 1fr))' }}
              >
                {Object.entries(UF_TILES).map(([uf, pos]) => {
                  const conquered = conqueredUFs.has(uf);
                  const ufCities = citiesByUF[uf] || [];
                  return (
                    <div
                      key={uf}
                      title={
                        conquered
                          ? `${UF_NAMES[uf]} — ${ufCities.map((c) => c.label).join(', ')}`
                          : UF_NAMES[uf]
                      }
                      className={`aspect-square rounded flex items-center justify-center text-[0.6rem] font-bold transition-all cursor-default select-none ${
                        conquered
                          ? 'bg-blue-600 text-white shadow-sm hover:bg-blue-500 hover:scale-105'
                          : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                      }`}
                      style={{ gridColumnStart: pos.col + 1, gridRowStart: pos.row + 1 }}
                    >
                      {uf}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              </div>
            )}

            <div className="flex items-center justify-center gap-5 mt-5 text-xxs text-slate-400 flex-wrap">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-blue-600" /> conquistado
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400 border border-white shadow-sm" /> cidade visitada
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-slate-100 border border-slate-200" /> ainda não
              </span>
              {pendingCount > 0 && (
                <span className="flex items-center gap-1.5 text-blue-500">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  localizando {pendingCount} cidade{pendingCount > 1 ? 's' : ''}...
                </span>
              )}
            </div>
          </div>

          {/* Lista de conquistas por estado */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white border border-slate-200 rounded-lg p-5">
              <h3 className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-[0.15em] mb-4">
                Diário de Bordo
              </h3>
              {conqueredList.length === 0 ? (
                <p className="text-xs text-slate-400 italic">
                  Nenhuma cidade reconhecida ainda.
                </p>
              ) : (
                <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
                  {conqueredList.map((uf) => (
                    <div key={uf}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[0.6rem] font-bold bg-slate-950 text-white rounded px-1.5 py-0.5">
                          {uf}
                        </span>
                        <span className="text-xs font-bold text-slate-700">{UF_NAMES[uf]}</span>
                      </div>
                      <div className="space-y-1.5 pl-1">
                        {citiesByUF[uf]
                          .sort((a, b) => b.visits - a.visits)
                          .map((c) => (
                            <div
                              key={c.label}
                              className="flex items-center justify-between gap-3 text-xs"
                            >
                              <span className="flex items-center gap-1.5 text-slate-600 min-w-0">
                                <MapPin className="h-3 w-3 text-blue-500 shrink-0" />
                                <span className="truncate">{c.label}</span>
                              </span>
                              <span className="text-slate-400 shrink-0 text-xxs">
                                {c.visits}x • {formatDate(c.lastDate)}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Minhas viagens */}
            <div className="bg-white border border-slate-200 rounded-lg p-5">
              <h3 className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-[0.15em] mb-4">
                Minhas Viagens
              </h3>
              {trips.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-xs text-slate-400 mb-3">
                    Nenhuma viagem registrada ainda.
                  </p>
                  <button
                    onClick={openAdd}
                    className="text-blue-600 hover:text-blue-700 font-bold text-xs hover:underline"
                  >
                    Registrar minha primeira viagem →
                  </button>
                </div>
              ) : (
                <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                  {trips.map((trip) => {
                    const car = cars.find((c) => c.id === trip.carId);
                    const distance =
                      trip.startMileage !== null && trip.endMileage !== null
                        ? trip.endMileage - trip.startMileage
                        : null;
                    return (
                      <div
                        key={trip.id}
                        className="border border-slate-200 rounded-md p-3.5 hover:shadow-sm transition-all"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-800 truncate">{trip.title}</p>
                            <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1 flex-wrap">
                              <span className="truncate">{trip.originCity}</span>
                              <ArrowRight className="h-3 w-3 text-blue-500 shrink-0" />
                              <span className="truncate">{trip.destinationCity}</span>
                            </p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => openEdit(trip)}
                              className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-blue-600 rounded transition-all"
                              title="Editar viagem"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(trip)}
                              className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-red-600 rounded transition-all"
                              title="Excluir viagem"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 mt-2 text-xxs text-slate-400 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(trip.startDate)}
                            {trip.endDate && ` → ${formatDate(trip.endDate)}`}
                          </span>
                          {distance !== null && distance > 0 && (
                            <span className="font-semibold text-slate-500">{formatMileage(distance)} rodados</span>
                          )}
                          {car && (
                            <span className="truncate">{car.nickname || `${car.brand} ${car.model}`}</span>
                          )}
                        </div>
                        {trip.notes && (
                          <p className="text-xxs text-slate-400 italic mt-1.5 line-clamp-2">{trip.notes}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Cidades não reconhecidas */}
            {unmapped.length > 0 && (
              <div className="bg-amber-50/70 border border-amber-100 rounded-lg p-4">
                <div className="flex items-start gap-2.5">
                  <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-amber-800 mb-1">
                      {unmapped.length} cidade{unmapped.length > 1 ? 's' : ''} que não conseguimos localizar
                    </p>
                    <p className="text-xxs text-amber-700/80 leading-relaxed mb-2">
                      Verifique a grafia no registro do abastecimento, ou escreva no formato{' '}
                      <strong>Cidade - UF</strong> (ex: &quot;Penedo - AL&quot;) para ajudar.
                    </p>
                    <p className="text-xxs text-amber-700 font-medium">
                      {unmapped.map((c) => c.label).join(' • ')}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de registro/edição de viagem */}
      {showModal && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white rounded-lg shadow-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-slate-900 text-base">
                {editing ? 'Editar Viagem' : 'Registrar Viagem'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 hover:bg-slate-100 rounded-md text-slate-400 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              {!editing && cars.length > 1 && (
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Veículo *</label>
                  <select
                    value={form.carId}
                    onChange={(e) => setForm((f) => ({ ...f, carId: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-md px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                  >
                    {cars.map((car) => (
                      <option key={car.id} value={car.id}>
                        {car.nickname || `${car.brand} ${car.model}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Nome da viagem *</label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Ex: Férias na Bahia, Trabalho em SP..."
                  maxLength={100}
                  className="w-full bg-slate-50 border border-slate-200 rounded-md px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Saindo de *</label>
                  <input
                    type="text"
                    required
                    value={form.originCity}
                    onChange={(e) => setForm((f) => ({ ...f, originCity: e.target.value }))}
                    placeholder="Ex: Belo Horizonte"
                    className="w-full bg-slate-50 border border-slate-200 rounded-md px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Indo para *</label>
                  <input
                    type="text"
                    required
                    value={form.destinationCity}
                    onChange={(e) => setForm((f) => ({ ...f, destinationCity: e.target.value }))}
                    placeholder="Ex: Porto Seguro"
                    className="w-full bg-slate-50 border border-slate-200 rounded-md px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Início *</label>
                  <input
                    type="date"
                    required
                    value={form.startDate}
                    onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-md px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Fim (opcional)</label>
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-md px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Km na saída</label>
                  <input
                    type="number"
                    min="0"
                    value={form.startMileage}
                    onChange={(e) => setForm((f) => ({ ...f, startMileage: e.target.value }))}
                    placeholder="Ex: 45200"
                    className="w-full bg-slate-50 border border-slate-200 rounded-md px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Km na chegada</label>
                  <input
                    type="number"
                    min="0"
                    value={form.endMileage}
                    onChange={(e) => setForm((f) => ({ ...f, endMileage: e.target.value }))}
                    placeholder="Ex: 46450"
                    className="w-full bg-slate-50 border border-slate-200 rounded-md px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Observações</label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Ex: Paradas em Governador Valadares e Teixeira de Freitas"
                  className="w-full bg-slate-50 border border-slate-200 rounded-md px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 resize-none"
                />
              </div>

              {formError && (
                <div className="p-3 bg-red-50 text-red-700 border border-red-100 rounded-md text-xs">
                  {formError}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 rounded-md text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-md text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-sm disabled:opacity-60 flex items-center gap-2"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editing ? 'Salvar Alterações' : 'Registrar Viagem'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
