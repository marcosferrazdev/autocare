'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { formatCurrency, formatMileage, formatDate, formatConsumption } from '@/lib/formatters';
import { MAX_WASH_PHOTOS, TARGET_PHOTO_DATA_URL_LEN, MAX_PHOTO_DATA_URL_LEN } from '@/lib/wash-photos';
import { SchedulesPanel } from '@/components/schedules-panel';
import { InsurancePanel } from '@/components/insurance-panel';
import { FinancingPanel } from '@/components/financing-panel';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';
import {
  BellRing,
  Car,
  Wrench,
  Fuel,
  Settings,
  Calendar,
  Milestone,
  Plus,
  Loader2,
  AlertCircle,
  Edit,
  Save,
  BookOpen,
  CreditCard,
  Trash2,
  ChevronDown,
  ListTodo,
  ExternalLink,
  CheckCircle2,
  Circle,
  Droplets,
  Camera,
  User,
  X,
  ImageIcon,
  ChevronLeft,
  ChevronRight,
  Shield,
  Landmark,
} from 'lucide-react';

const WASH_TYPES = ['Completa', 'Externa', 'Interna', 'Motor', 'Detalhamento', 'Outro'] as const;

const MAX_INPUT_IMAGE_BYTES = 12 * 1024 * 1024; // 12 MB no arquivo original

/**
 * Redimensiona e comprime no cliente (JPEG) para não sobrecarregar o banco.
 * Tenta várias passadas até o data URL ficar ~280 KB (ou no limite rígido).
 */
async function compressImageToDataUrl(file: File): Promise<string> {
  if (file.size > MAX_INPUT_IMAGE_BYTES) {
    throw new Error('Imagem muito grande (máx. 12 MB).');
  }

  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    throw new Error('Não foi possível processar a imagem.');
  }

  let maxWidth = 720;
  let quality = 0.68;
  let dataUrl = '';

  for (let attempt = 0; attempt < 6; attempt++) {
    const scale = Math.min(1, maxWidth / bitmap.width);
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.width = width;
    canvas.height = height;
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);
    dataUrl = canvas.toDataURL('image/jpeg', quality);

    if (dataUrl.length <= TARGET_PHOTO_DATA_URL_LEN) {
      bitmap.close();
      return dataUrl;
    }

    quality = Math.max(0.4, quality - 0.08);
    maxWidth = Math.round(maxWidth * 0.82);
  }

  bitmap.close();

  if (dataUrl.length > MAX_PHOTO_DATA_URL_LEN) {
    throw new Error('Não foi possível comprimir a imagem o suficiente. Tente outra foto.');
  }
  return dataUrl;
}

function getWashPhotos(item: { photos?: string[]; photoData?: string | null }): string[] {
  if (Array.isArray(item.photos)) return item.photos.slice(0, MAX_WASH_PHOTOS);
  return [];
}

interface WebInfo {
  tankCapacity: number | null;
  cityConsumption: number | null;
  highwayConsumption: number | null;
  recommendedOil: string | null;
  tirePressure: string | null;
  tireSize: string | null;
  engineInfo: string | null;
  fuelType: string | null;
  generalNotes: string | null;
  sourceName: string | null;
  sourceUrl: string | null;
}

interface CarDetails {
  id: string;
  brand: string;
  model: string;
  yearManufacture: number;
  yearModel: number;
  plate: string | null;
  color: string | null;
  fuelType: string;
  engine: string | null;
  currentMileage: number;
  nickname: string | null;
  notes: string | null;
  vehicleWebInfo: WebInfo | null;
}

interface LinkThumbnailProps {
  url: string;
}

function LinkThumbnail({ url }: LinkThumbnailProps) {
  const [imageUrl, setImageUrl] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    if (!url) {
      setLoading(false);
      return;
    }

    let active = true;
    const fetchPreview = async () => {
      try {
        setLoading(true);
        setError(false);
        console.log('[LinkThumbnail] Fetching preview for:', url);
        const encodedUrl = encodeURIComponent(url);
        const res = await fetch(`/api/upgrades/preview?url=${encodedUrl}`);
        if (!res.ok) {
          console.error('[LinkThumbnail] Fetch failed. Status:', res.status);
          throw new Error();
        }
        const data = await res.json();
        console.log('[LinkThumbnail] Preview data received:', data);
        if (active) {
          setImageUrl(data.imageUrl);
        }
      } catch (err) {
        console.error('[LinkThumbnail] Error fetching preview:', err);
        if (active) {
          setError(true);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchPreview();
    return () => {
      active = false;
    };
  }, [url]);

  if (loading) {
    return (
      <div className="w-14 h-14 rounded-lg bg-slate-100 animate-pulse border border-slate-200/60 shrink-0 self-start mt-0.5" />
    );
  }

  if (error || !imageUrl) {
    return null;
  }

  const normalizedUrl = url.startsWith('http://') || url.startsWith('https://')
    ? url
    : `https://${url}`;

  return (
    <a
      href={normalizedUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="shrink-0 group relative self-start mt-0.5 block"
      title="Abrir link de compra"
    >
      <div className="w-14 h-14 rounded-lg overflow-hidden border border-slate-200 group-hover:border-blue-500 transition-all duration-200 bg-slate-50 flex items-center justify-center">
        <img
          src={imageUrl}
          alt="Preview"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
          onError={() => {
            console.error('[LinkThumbnail] Browser failed to load image URL:', imageUrl);
            setError(true);
          }}
        />
      </div>
    </a>
  );
}

export default function CarDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const [car, setCar] = useState<CarDetails | null>(null);
  const [maintenances, setMaintenances] = useState<any[]>([]);
  const [fuelRecords, setFuelRecords] = useState<any[]>([]);
  const [upgrades, setUpgrades] = useState<any[]>([]);
  const [washRecords, setWashRecords] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [searchingWeb, setSearchingWeb] = useState(false);
  const [editingWebInfo, setEditingWebInfo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Aba ativa sincronizada com ?tab= (sidenav e deep-link)
  type CarTab = 'historico' | 'upgrades' | 'lembretes' | 'lavadas' | 'seguro' | 'financiamento';
  const tabFromUrl = searchParams.get('tab');
  const activeTab: CarTab =
    tabFromUrl === 'lembretes' ||
    tabFromUrl === 'upgrades' ||
    tabFromUrl === 'lavadas' ||
    tabFromUrl === 'seguro' ||
    tabFromUrl === 'financiamento' ||
    tabFromUrl === 'historico'
      ? tabFromUrl
      : 'historico';

  const setActiveTab = (tab: CarTab) => {
    const base = `/cars/${id}`;
    if (tab === 'historico') {
      router.replace(base, { scroll: false });
    } else {
      router.replace(`${base}?tab=${tab}`, { scroll: false });
    }
  };
  const [sortBy, setSortBy] = useState<'recent' | 'priority' | 'price-asc' | 'price-desc' | 'alphabetical'>('recent');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [submittingUpgrade, setSubmittingUpgrade] = useState(false);
  const [editingUpgrade, setEditingUpgrade] = useState<any | null>(null);
  const [upgradeForm, setUpgradeForm] = useState({
    name: '',
    description: '',
    estimatedValue: '',
    purchaseLink: '',
    status: 'Pendente' as 'Pendente' | 'Concluido',
    priority: 'Média' as 'Baixa' | 'Média' | 'Alta',
  });

  // Lavagens
  const [showWashModal, setShowWashModal] = useState(false);
  const [submittingWash, setSubmittingWash] = useState(false);
  const [editingWash, setEditingWash] = useState<any | null>(null);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [compressingPhoto, setCompressingPhoto] = useState(false);
  const [viewGallery, setViewGallery] = useState<{ photos: string[]; index: number } | null>(null);
  const [washForm, setWashForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    mileage: '',
    selfWash: false,
    carWashName: '',
    price: '',
    washType: 'Completa' as string,
    notes: '',
  });

  // Estados do formulário de informação técnica (sugestões da web)
  const [webInfoForm, setWebInfoForm] = useState<Partial<WebInfo>>({});

  // Controle de expansão do histórico de manutenção
  const [expandedMaintenances, setExpandedMaintenances] = useState<Record<string, boolean>>({});

  const toggleMaintenanceExpand = (maintId: string) => {
    setExpandedMaintenances(prev => ({
      ...prev,
      [maintId]: !prev[maintId],
    }));
  };

  const handleOpenAddUpgrade = () => {
    setEditingUpgrade(null);
    setUpgradeForm({
      name: '',
      description: '',
      estimatedValue: '',
      purchaseLink: '',
      status: 'Pendente',
      priority: 'Média',
    });
    setShowUpgradeModal(true);
  };

  const handleOpenEditUpgrade = (item: any) => {
    setEditingUpgrade(item);
    setUpgradeForm({
      name: item.name,
      description: item.description || '',
      estimatedValue: item.estimatedValue !== null && item.estimatedValue !== undefined ? String(item.estimatedValue) : '',
      purchaseLink: item.purchaseLink || '',
      status: item.status || 'Pendente',
      priority: item.priority || 'Média',
    });
    setShowUpgradeModal(true);
  };

  const handleSaveUpgrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!upgradeForm.name.trim()) return;

    try {
      setSubmittingUpgrade(true);
      setError(null);

      const payload = {
        name: upgradeForm.name,
        description: upgradeForm.description || null,
        estimatedValue: upgradeForm.estimatedValue ? Number(upgradeForm.estimatedValue) : null,
        purchaseLink: upgradeForm.purchaseLink || null,
        status: upgradeForm.status,
        priority: upgradeForm.priority,
      };

      if (editingUpgrade) {
        const res = await fetch(`/api/upgrades/${editingUpgrade.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('Falha ao atualizar item.');
        const updated = await res.json();
        setUpgrades(prev => prev.map(item => item.id === editingUpgrade.id ? updated : item));
      } else {
        const res = await fetch(`/api/cars/${id}/upgrades`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('Falha ao cadastrar item.');
        const created = await res.json();
        setUpgrades(prev => [created, ...prev]);
      }

      setShowUpgradeModal(false);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro ao salvar item.');
    } finally {
      setSubmittingUpgrade(false);
    }
  };

  const handleToggleUpgradeStatus = async (item: any) => {
    try {
      const nextStatus = item.status === 'Pendente' ? 'Concluido' : 'Pendente';
      setUpgrades(prev => prev.map(u => u.id === item.id ? { ...u, status: nextStatus } : u));

      const res = await fetch(`/api/upgrades/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (!res.ok) {
        setUpgrades(prev => prev.map(u => u.id === item.id ? item : u));
        throw new Error('Falha ao alterar status.');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro ao alterar status.');
    }
  };

  const handleDeleteUpgrade = async (upgradeId: string) => {
    const ok = await confirm({
      title: 'Excluir melhoria',
      message: 'Tem certeza que deseja excluir esta melhoria? Esta ação não pode ser desfeita.',
    });
    if (!ok) return;

    try {
      setError(null);
      const res = await fetch(`/api/upgrades/${upgradeId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        throw new Error('Erro ao excluir item.');
      }
      setUpgrades(prev => prev.filter(u => u.id !== upgradeId));
      toast('Melhoria excluída.');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro ao excluir item.');
    }
  };

  const emptyWashForm = () => ({
    date: new Date().toISOString().slice(0, 10),
    mileage: car?.currentMileage != null ? String(car.currentMileage) : '',
    selfWash: false,
    carWashName: '',
    price: '',
    washType: 'Completa',
    notes: '',
  });

  const handleOpenAddWash = () => {
    setEditingWash(null);
    setWashForm(emptyWashForm());
    setPhotoPreviews([]);
    setShowWashModal(true);
  };

  const handleOpenEditWash = (item: any) => {
    setEditingWash(item);
    setWashForm({
      date: item.date ? new Date(item.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      mileage: item.mileage != null ? String(item.mileage) : '',
      selfWash: Boolean(item.selfWash),
      carWashName: item.carWashName || '',
      price: item.price != null ? String(item.price) : '',
      washType: item.washType || 'Completa',
      notes: item.notes || '',
    });
    setPhotoPreviews(getWashPhotos(item));
    setShowWashModal(true);
  };

  const handleWashPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length === 0) return;

    const slotsLeft = MAX_WASH_PHOTOS - photoPreviews.length;
    if (slotsLeft <= 0) {
      toast(`Máximo de ${MAX_WASH_PHOTOS} fotos por lavagem.`);
      return;
    }

    const toProcess = files.slice(0, slotsLeft);
    if (files.length > slotsLeft) {
      toast(`Só é possível adicionar mais ${slotsLeft} foto(s) (máx. ${MAX_WASH_PHOTOS}).`);
    }

    try {
      setCompressingPhoto(true);
      const compressed: string[] = [];
      for (const file of toProcess) {
        if (!file.type.startsWith('image/')) {
          toast(`Arquivo ignorado (não é imagem): ${file.name}`);
          continue;
        }
        try {
          compressed.push(await compressImageToDataUrl(file));
        } catch (err: any) {
          console.error(err);
          toast(err?.message || `Falha ao comprimir ${file.name}`);
        }
      }
      if (compressed.length > 0) {
        setPhotoPreviews((prev) => [...prev, ...compressed].slice(0, MAX_WASH_PHOTOS));
      }
    } finally {
      setCompressingPhoto(false);
    }
  };

  const handleRemoveWashPhotoAt = (index: number) => {
    setPhotoPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveWash = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!washForm.selfWash && !washForm.carWashName.trim()) {
      toast('Informe o lava-jato ou marque que você lavou.');
      return;
    }

    try {
      setSubmittingWash(true);
      setError(null);

      const payload: Record<string, unknown> = {
        date: washForm.date,
        mileage: washForm.mileage ? Number(washForm.mileage) : null,
        selfWash: washForm.selfWash,
        carWashName: washForm.selfWash ? null : washForm.carWashName.trim(),
        price: washForm.price ? Number(washForm.price) : 0,
        washType: washForm.washType || null,
        notes: washForm.notes || null,
        photos: photoPreviews,
      };

      if (editingWash) {
        const res = await fetch(`/api/wash-records/${editingWash.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Falha ao atualizar lavagem.');
        }
        const updated = await res.json();
        setWashRecords(prev => prev.map(item => (item.id === editingWash.id ? updated : item)));
        toast('Lavagem atualizada.');
      } else {
        const res = await fetch(`/api/cars/${id}/wash-records`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Falha ao registrar lavagem.');
        }
        const created = await res.json();
        setWashRecords(prev => [created, ...prev]);
        toast('Lavagem registrada.');
      }

      setShowWashModal(false);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro ao salvar lavagem.');
    } finally {
      setSubmittingWash(false);
    }
  };

  const handleDeleteWash = async (washId: string) => {
    const ok = await confirm({
      title: 'Excluir lavagem',
      message: 'Tem certeza que deseja excluir este registro de lavagem? Esta ação não pode ser desfeita.',
    });
    if (!ok) return;

    try {
      setError(null);
      const res = await fetch(`/api/wash-records/${washId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Erro ao excluir lavagem.');
      setWashRecords(prev => prev.filter(w => w.id !== washId));
      toast('Lavagem excluída.');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro ao excluir lavagem.');
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Carregar carro
      const carRes = await fetch(`/api/cars/${id}`);
      if (!carRes.ok) throw new Error('Falha ao carregar veículo.');
      const carData = await carRes.json();
      setCar(carData);

      if (carData.vehicleWebInfo) {
        setWebInfoForm(carData.vehicleWebInfo);
      }

      // Carregar manutenções
      const maintRes = await fetch(`/api/cars/${id}/maintenances`);
      if (maintRes.ok) {
        const maintData = await maintRes.json();
        setMaintenances(maintData);
      }

      // Carregar abastecimentos
      const fuelRes = await fetch(`/api/cars/${id}/fuel-records`);
      if (fuelRes.ok) {
        const fuelData = await fuelRes.json();
        setFuelRecords(fuelData);
      }

      // Carregar melhorias / wishlist
      const upgradesRes = await fetch(`/api/cars/${id}/upgrades`);
      if (upgradesRes.ok) {
        const upgradesData = await upgradesRes.json();
        setUpgrades(upgradesData);
      }

      // Carregar lavagens
      const washRes = await fetch(`/api/cars/${id}/wash-records`);
      if (washRes.ok) {
        const washData = await washRes.json();
        setWashRecords(washData);
      }

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro ao carregar detalhes do veículo.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

  const handleDeleteMaintenance = async (maintId: string) => {
    const ok = await confirm({
      title: 'Excluir manutenção',
      message: 'Tem certeza que deseja excluir esta manutenção? Esta ação não pode ser desfeita.',
    });
    if (!ok) return;

    try {
      setError(null);
      const res = await fetch(`/api/maintenances/${maintId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Erro ao excluir manutenção.');
      }
      setMaintenances(prev => prev.filter(m => m.id !== maintId));
      toast('Manutenção excluída.');
    } catch (err: any) {
      setError(err.message || 'Erro ao excluir manutenção.');
    }
  };

  const handleDeleteFuelRecord = async (fuelId: string) => {
    const ok = await confirm({
      title: 'Excluir abastecimento',
      message: 'Tem certeza que deseja excluir este abastecimento? Esta ação não pode ser desfeita.',
    });
    if (!ok) return;

    try {
      setError(null);
      const res = await fetch(`/api/fuel-records/${fuelId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Erro ao excluir abastecimento.');
      }
      setFuelRecords(prev => prev.filter(f => f.id !== fuelId));
      toast('Abastecimento excluído.');
    } catch (err: any) {
      setError(err.message || 'Erro ao excluir abastecimento.');
    }
  };

  // Função para buscar dados do veículo na web
  const handleWebSearch = async () => {
    try {
      setSearchingWeb(true);
      setError(null);

      const res = await fetch(`/api/cars/${id}/search-web-info`, {
        method: 'POST',
      });

      if (!res.ok) {
        throw new Error('Não foi possível encontrar informações na web. Tente preencher manualmente.');
      }

      const suggestion = await res.json();
      setWebInfoForm(suggestion);
      setEditingWebInfo(true); // Abre o formulário para confirmação
    } catch (err: any) {
      setError(err.message || 'Erro ao buscar dados na web.');
    } finally {
      setSearchingWeb(false);
    }
  };

  // Função para salvar as informações técnicas (sugestões editadas)
  const handleSaveWebInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`/api/cars/${id}/web-info`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webInfoForm),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Erro ao salvar informações técnicas.');
      }

      const savedInfo = await res.json();
      setCar(prev => prev ? { ...prev, vehicleWebInfo: savedInfo } : null);
      setEditingWebInfo(false);
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar informações técnicas.');
    } finally {
      setLoading(false);
    }
  };

  const handleClearWebInfo = () => {
    setWebInfoForm(car?.vehicleWebInfo || {});
    setEditingWebInfo(false);
  };

  if (loading && !car) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error && !car) {
    return (
      <div className="p-4 bg-red-50 text-red-700 border border-red-100 rounded-md flex items-center gap-3">
        <AlertCircle className="h-5 w-5" />
        <span>{error}</span>
      </div>
    );
  }

  if (!car) return null;

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-4 overflow-hidden">
      {/* Back & Title Header — fixo */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            {car.nickname || `${car.brand} ${car.model}`}
          </h1>
          <p className="text-slate-500 text-sm">
            {car.brand} {car.model} • {car.yearManufacture}/{car.yearModel} {car.plate ? `• Placa: ${car.plate}` : ''}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/cars/${car.id}/edit`}
            className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold px-4 py-2.5 rounded-md text-xs transition-all shadow-sm flex items-center gap-1.5"
          >
            <Settings className="h-4 w-4" /> Editar Cadastro
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 border border-red-100 rounded-md flex items-center gap-3 text-sm shrink-0">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Tabs Selector — fixo; só scroll horizontal se precisar */}
      <div className="border-b border-slate-200 shrink-0">
        <div
          className="flex flex-nowrap items-center gap-0 overflow-x-auto overflow-y-hidden overscroll-x-contain"
          style={{ scrollbarWidth: 'thin' }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('historico')}
            className={`inline-flex items-center gap-2 px-4 sm:px-5 py-3 text-xs font-bold whitespace-nowrap transition-all border-b-2 -mb-px shrink-0 ${activeTab === 'historico'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
          >
            <BookOpen className="h-4 w-4 shrink-0" />
            Histórico Geral
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('upgrades')}
            className={`inline-flex items-center gap-2 px-4 sm:px-5 py-3 text-xs font-bold whitespace-nowrap transition-all border-b-2 -mb-px shrink-0 ${activeTab === 'upgrades'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
          >
            <ListTodo className="h-4 w-4 shrink-0" />
            Melhorias & Projetos
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('lavadas')}
            className={`inline-flex items-center gap-2 px-4 sm:px-5 py-3 text-xs font-bold whitespace-nowrap transition-all border-b-2 -mb-px shrink-0 ${activeTab === 'lavadas'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
          >
            <Droplets className="h-4 w-4 shrink-0" />
            Lavadas
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('seguro')}
            className={`inline-flex items-center gap-2 px-4 sm:px-5 py-3 text-xs font-bold whitespace-nowrap transition-all border-b-2 -mb-px shrink-0 ${activeTab === 'seguro'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
          >
            <Shield className="h-4 w-4 shrink-0" />
            Seguro
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('financiamento')}
            className={`inline-flex items-center gap-2 px-4 sm:px-5 py-3 text-xs font-bold whitespace-nowrap transition-all border-b-2 -mb-px shrink-0 ${activeTab === 'financiamento'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
          >
            <Landmark className="h-4 w-4 shrink-0" />
            Financiamento
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('lembretes')}
            className={`inline-flex items-center gap-2 px-4 sm:px-5 py-3 text-xs font-bold whitespace-nowrap transition-all border-b-2 -mb-px shrink-0 ${activeTab === 'lembretes'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
          >
            <BellRing className="h-4 w-4 shrink-0" />
            Lembretes
          </button>
        </div>
      </div>

      {/* Conteúdo das abas — título/abas fixos; rolagem nos cards (no mobile o bloco pode rolar se faltar altura) */}
      <div className="flex-1 min-h-0 overflow-y-auto lg:overflow-hidden">
      {activeTab === 'historico' ? (
        /* Main Grid: Maintenances and Fuel Records Lists side-by-side */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-auto lg:h-full min-h-0">
          {/* Maintenances List */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 flex flex-col min-h-[280px] h-[min(55dvh,520px)] lg:h-full lg:min-h-0 overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4 shrink-0">
              <div className="flex items-center gap-2">
                <Wrench className="h-5 w-5 text-blue-600" />
                <h2 className="font-bold text-slate-800 text-sm">Histórico de Manutenções</h2>
              </div>
              <Link
                href={`/cars/${car.id}/maintenances/new`}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-0.5"
              >
                <Plus className="h-3.5 w-3.5" /> Adicionar
              </Link>
            </div>

            {loading ? (
              <div className="space-y-3 animate-pulse flex-1 min-h-0 overflow-y-auto">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="py-3 flex justify-between items-center border-b border-slate-50 last:border-0 gap-3">
                    <div className="min-w-0 space-y-2 w-full">
                      <div className="flex items-center gap-2">
                        <div className="h-4 bg-slate-200 rounded w-1/2"></div>
                        <div className="h-4 bg-slate-100 rounded w-16"></div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="h-3 bg-slate-100 rounded w-20"></div>
                        <div className="h-3 bg-slate-100 rounded w-24"></div>
                      </div>
                    </div>
                    <div className="h-5 bg-slate-200 rounded w-16 shrink-0"></div>
                  </div>
                ))}
              </div>
            ) : maintenances.length === 0 ? (
              <div className="py-6 text-center text-slate-400 italic text-xs flex-1">
                Nenhuma manutenção registrada para este carro.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 flex-1 min-h-0 overflow-y-auto overscroll-contain pr-1">
                {maintenances.map((m) => {
                  const isExpanded = !!expandedMaintenances[m.id];
                  const hasDetails = (m.parts && m.parts.length > 0) || m.notes || m.laborCost > 0;

                  return (
                    <div key={m.id} className="py-3 border-b border-slate-100 last:border-0">
                      <div className="flex justify-between items-start text-xs gap-3">
                        <div
                          onClick={() => hasDetails && toggleMaintenanceExpand(m.id)}
                          className={`min-w-0 flex gap-2.5 ${hasDetails ? 'cursor-pointer hover:opacity-85 select-none' : ''}`}
                        >
                          {hasDetails && (
                            <ChevronDown
                              className={`h-4 w-4 text-slate-400 mt-0.5 shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-180 text-blue-600' : ''}`}
                            />
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-slate-800 truncate block max-w-[200px] sm:max-w-xs">{m.description}</span>
                              <span className="text-xxs px-2 py-0.5 rounded bg-slate-100 text-slate-600 uppercase font-semibold shrink-0">
                                {m.type}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-slate-400 mt-1 flex-wrap">
                              <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {formatDate(m.date)}</span>
                              <span className="flex items-center gap-1"><Milestone className="h-3 w-3" /> {formatMileage(m.mileage)}</span>
                              {m.workshop && <span className="truncate">Oficina: {m.workshop}</span>}
                              <span className="flex items-center gap-1 shrink-0">
                                <CreditCard className="h-3.5 w-3.5" />{' '}
                                {m.paymentMethod === 'À vista' || !m.paymentMethod ? (
                                  'À vista'
                                ) : m.installmentCount && m.installmentValue ? (
                                  `${m.installmentCount}x de ${formatCurrency(m.installmentValue)}`
                                ) : (
                                  m.paymentMethod
                                )}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          <div className="text-right">
                            <span className="font-bold text-slate-800 block">{formatCurrency(m.totalCost)}</span>
                            {m.discount && m.discount > 0 ? (
                              <span className="text-xxs text-emerald-600 font-semibold block">
                                -{formatCurrency(m.discount)} desc.
                              </span>
                            ) : null}
                          </div>
                          <div className="flex items-center gap-2 print:hidden">
                            <Link
                              href={`/cars/${car.id}/maintenances/${m.id}/edit`}
                              className="p-1 hover:bg-slate-100 text-slate-400 hover:text-blue-600 rounded transition-all"
                              title="Editar manutenção"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Link>
                            <button
                              onClick={() => handleDeleteMaintenance(m.id)}
                              className="p-1 hover:bg-slate-100 text-slate-400 hover:text-red-600 rounded transition-all"
                              title="Excluir manutenção"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Collapsible details panel */}
                      {isExpanded && hasDetails && (
                        <div className="mt-3 ml-6.5 p-3.5 bg-slate-50 border border-slate-100 rounded-md space-y-3 animate-fade-in text-[11px]">
                          {/* Peças Substituídas */}
                          {m.parts && m.parts.length > 0 ? (
                            <div>
                              <p className="font-bold text-slate-400 text-[9px] uppercase tracking-wider mb-2">Peças Substituídas</p>
                              <div className="space-y-1.5 pl-1">
                                {m.parts.map((p: any) => (
                                  <div key={p.id} className="flex justify-between items-center text-slate-700">
                                    <span>
                                      <span className="font-bold text-slate-900">{p.quantity}x</span> {p.name}{' '}
                                      {p.brand && <span className="text-slate-400">({p.brand})</span>}
                                    </span>
                                    <span className="font-medium text-slate-600">{formatCurrency(p.totalPrice)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : null}

                          {/* Detalhe de Custos */}
                          <div className="flex justify-between items-center text-[10px] text-slate-500 pt-2 border-t border-slate-200/60">
                            <span>Mão de Obra:</span>
                            <span className="font-medium">{formatCurrency(m.laborCost)}</span>
                          </div>

                          {/* Observações */}
                          {m.notes && (
                            <div className="pt-2 border-t border-slate-200/60">
                              <p className="font-bold text-slate-400 text-[9px] uppercase tracking-wider mb-1">Observações</p>
                              <p className="text-slate-600 italic leading-relaxed whitespace-pre-wrap">{m.notes}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Fuel Records List */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 flex flex-col min-h-[280px] h-[min(55dvh,520px)] lg:h-full lg:min-h-0 overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4 shrink-0">
              <div className="flex items-center gap-2">
                <Fuel className="h-5 w-5 text-emerald-600" />
                <h2 className="font-bold text-slate-800 text-sm">Histórico de Abastecimentos</h2>
              </div>
              <Link
                href={`/cars/${car.id}/fuel-records/new`}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-0.5"
              >
                <Plus className="h-3.5 w-3.5" /> Adicionar
              </Link>
            </div>

            {loading ? (
              <div className="space-y-3 animate-pulse flex-1 min-h-0 overflow-y-auto">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="py-3 flex justify-between items-center border-b border-slate-50 last:border-0 gap-3">
                    <div className="min-w-0 space-y-2 w-full">
                      <div className="flex items-center gap-2">
                        <div className="h-4 bg-slate-200 rounded w-1/3"></div>
                        <div className="h-4 bg-slate-100 rounded w-20"></div>
                        <div className="h-4 bg-slate-100 rounded w-14"></div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="h-3 bg-slate-100 rounded w-20"></div>
                        <div className="h-3 bg-slate-100 rounded w-24"></div>
                      </div>
                    </div>
                    <div className="h-5 bg-slate-200 rounded w-16 shrink-0"></div>
                  </div>
                ))}
              </div>
            ) : fuelRecords.length === 0 ? (
              <div className="py-6 text-center text-slate-400 italic text-xs flex-1">
                Nenhum abastecimento registrado para este carro.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 flex-1 min-h-0 overflow-y-auto overscroll-contain pr-1">
                {fuelRecords.map((f) => (
                  <div key={f.id} className="py-3 flex justify-between items-start text-xs gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800">
                          {f.liters.toFixed(2)} L de {f.fuelType}
                        </span>
                        {f.fullTank && (
                          <span className="text-xxs px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100 font-semibold">
                            Tanque Cheio
                          </span>
                        )}
                        {f.consumptionKmPerLiter && (
                          <span className="text-xxs px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-100 font-bold">
                            {formatConsumption(f.consumptionKmPerLiter)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-slate-400 mt-1 flex-wrap">
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {formatDate(f.date)}</span>
                        <span className="flex items-center gap-1"><Milestone className="h-3 w-3" /> {formatMileage(f.mileage)}</span>
                        {f.gasStation && <span className="truncate">{f.gasStation}</span>}
                        <span className="flex items-center gap-1 shrink-0">
                          <CreditCard className="h-3.5 w-3.5" />{' '}
                          {f.paymentMethod === 'À vista' || !f.paymentMethod ? (
                            'À vista'
                          ) : f.installmentCount && f.installmentValue ? (
                            `${f.installmentCount}x de ${formatCurrency(f.installmentValue)}`
                          ) : (
                            f.paymentMethod
                          )}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className="font-bold text-slate-800 block">{formatCurrency(f.totalPrice)}</span>
                      <div className="flex items-center gap-2 print:hidden">
                        <Link
                          href={`/cars/${car.id}/fuel-records/${f.id}/edit`}
                          className="p-1 hover:bg-slate-100 text-slate-400 hover:text-emerald-600 rounded transition-all"
                          title="Editar abastecimento"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Link>
                        <button
                          onClick={() => handleDeleteFuelRecord(f.id)}
                          className="p-1 hover:bg-slate-100 text-slate-400 hover:text-red-600 rounded transition-all"
                          title="Excluir abastecimento"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : activeTab === 'lembretes' ? (
        /* Lembretes de Manutenção Tab View */
        <div className="h-full min-h-0">
          <SchedulesPanel carId={car.id} fillHeight />
        </div>
      ) : activeTab === 'seguro' ? (
        <div className="h-full min-h-0">
          <InsurancePanel carId={car.id} fillHeight />
        </div>
      ) : activeTab === 'financiamento' ? (
        <div className="h-full min-h-0">
          <FinancingPanel carId={car.id} fillHeight />
        </div>
      ) : activeTab === 'lavadas' ? (
        /* Lavagens Tab View */
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 flex flex-col h-full min-h-0 overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3 gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <Droplets className="h-5 w-5 text-cyan-600" />
              <div>
                <h2 className="font-bold text-slate-800 text-sm">Histórico de Lavagens</h2>
                {washRecords.length > 0 && (
                  <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                    Total gasto:{' '}
                    <span className="text-slate-700 font-bold">
                      {formatCurrency(washRecords.reduce((s, w) => s + (w.price || 0), 0))}
                    </span>
                    {' · '}
                    {washRecords.length} registro{washRecords.length !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={handleOpenAddWash}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-lg text-[12px] transition-all shadow flex items-center gap-1 hover:shadow-md shrink-0"
            >
              <Plus className="h-4 w-4" /> Registrar Lavagem
            </button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pulse flex-1 min-h-0 overflow-y-auto mt-4">
              {[1, 2, 3].map((n) => (
                <div key={n} className="p-4 border border-slate-200 rounded-md flex gap-3 bg-white shadow-sm">
                  <div className="w-20 h-20 rounded-lg bg-slate-100 shrink-0" />
                  <div className="flex-1 space-y-2 mt-1">
                    <div className="h-3.5 bg-slate-200 rounded w-1/3" />
                    <div className="h-3 bg-slate-100 rounded w-1/2" />
                    <div className="h-3 bg-slate-100 rounded w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : washRecords.length === 0 ? (
            <div className="py-12 text-center text-slate-400 italic text-xs space-y-2 flex-1">
              <Droplets className="h-10 w-10 text-slate-200 mx-auto" />
              <p>Nenhuma lavagem registrada para este carro.</p>
              <p className="text-[10px] font-medium text-slate-400/80">
                Registre quando lavou o veículo, se foi você ou um lava-jato, o valor e uma foto se quiser.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 content-start flex-1 min-h-0 overflow-y-auto overscroll-contain mt-4 pr-1">
              {washRecords.map((w) => (
                <div
                  key={w.id}
                  className="p-4 border border-slate-200 rounded-md flex gap-3 items-start bg-white shadow-sm hover:border-slate-300 transition-all"
                >
                  {(() => {
                    const photos = getWashPhotos(w);
                    if (photos.length === 0) {
                      return (
                        <div className="w-20 h-20 rounded-lg border border-dashed border-slate-200 bg-slate-50 flex items-center justify-center shrink-0">
                          <ImageIcon className="h-6 w-6 text-slate-300" />
                        </div>
                      );
                    }
                    return (
                      <button
                        type="button"
                        onClick={() => setViewGallery({ photos, index: 0 })}
                        className="relative w-20 h-20 rounded-lg overflow-hidden border border-slate-200 shrink-0 bg-slate-50 hover:border-cyan-400 transition-all"
                        title={photos.length > 1 ? `Ver ${photos.length} fotos` : 'Ver foto'}
                      >
                        <img src={photos[0]} alt="Foto da lavagem" className="w-full h-full object-cover" />
                        {photos.length > 1 && (
                          <span className="absolute bottom-1 right-1 text-[9px] font-bold bg-slate-900/75 text-white px-1.5 py-0.5 rounded">
                            +{photos.length - 1}
                          </span>
                        )}
                      </button>
                    );
                  })()}

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {w.selfWash ? (
                        <span className="text-[9px] px-2 py-0.5 rounded font-bold uppercase bg-violet-50 text-violet-700 border border-violet-100 flex items-center gap-1">
                          <User className="h-3 w-3" /> Eu lavei
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-slate-800 truncate">
                          {w.carWashName || 'Lava-jato'}
                        </span>
                      )}
                      {w.washType && (
                        <span className="text-[9px] px-2 py-0.5 rounded font-bold uppercase bg-cyan-50 text-cyan-700 border border-cyan-100">
                          {w.washType}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-[10px] text-slate-400 font-semibold flex-wrap pt-0.5">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> {formatDate(w.date)}
                      </span>
                      {w.mileage != null && (
                        <span className="flex items-center gap-1">
                          <Milestone className="h-3 w-3" /> {formatMileage(w.mileage)}
                        </span>
                      )}
                    </div>

                    {w.notes && (
                      <p className="text-[11px] text-slate-500 font-medium leading-relaxed line-clamp-2">
                        {w.notes}
                      </p>
                    )}

                    <div className="pt-1">
                      <span className="text-sm font-extrabold text-slate-900">
                        {w.price > 0 ? formatCurrency(w.price) : 'Grátis / próprio'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 self-start print:hidden">
                    <button
                      onClick={() => handleOpenEditWash(w)}
                      className="p-1 hover:bg-slate-100 text-slate-400 hover:text-blue-600 rounded transition-all"
                      title="Editar lavagem"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteWash(w.id)}
                      className="p-1 hover:bg-slate-100 text-slate-400 hover:text-red-600 rounded transition-all"
                      title="Excluir lavagem"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Upgrades / Wishlist Tab View */
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 flex flex-col h-full min-h-0 overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3 gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <ListTodo className="h-5 w-5 text-blue-600" />
              <h2 className="font-bold text-slate-800 text-sm">Lista de Melhorias, Reformas e Compras</h2>
            </div>
            <div className="flex items-center gap-3.5 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider shrink-0">Ordenar por:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-bold text-slate-700 cursor-pointer focus:outline-none focus:border-blue-500"
                >
                  <option value="recent">Mais Recentes</option>
                  <option value="priority">Prioridade (Alta → Baixa)</option>
                  <option value="price-asc">Valor (Menor → Maior)</option>
                  <option value="price-desc">Valor (Maior → Menor)</option>
                  <option value="alphabetical">Nome (A-Z)</option>
                </select>
              </div>
              <button
                onClick={handleOpenAddUpgrade}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-lg text-[12px] transition-all shadow flex items-center gap-1 hover:shadow-md shrink-0"
              >
                <Plus className="h-4 w-4" /> Adicionar Item
              </button>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pulse flex-1 min-h-0 overflow-y-auto mt-4">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="p-4 border border-slate-200 rounded-md flex gap-3 items-start bg-white shadow-sm">
                  {/* Checkbox Skeleton */}
                  <div className="h-5 w-5 rounded-full bg-slate-200 shrink-0 mt-0.5" />
                  
                  {/* Thumbnail Image Skeleton */}
                  <div className="w-14 h-14 rounded-lg bg-slate-100 border border-slate-200/60 shrink-0 mt-0.5" />

                  {/* Text Details Skeleton */}
                  <div className="min-w-0 flex-1 space-y-2 mt-1">
                    <div className="flex gap-2 items-center">
                      <div className="h-3.5 bg-slate-200 rounded w-1/3" />
                      <div className="h-4 bg-slate-100 rounded w-14" />
                    </div>
                    <div className="h-3 bg-slate-100 rounded w-3/4" />
                    <div className="flex gap-2">
                      <div className="h-3 bg-slate-100 rounded w-16" />
                      <div className="h-3 bg-slate-100 rounded w-20" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : upgrades.length === 0 ? (
            <div className="py-12 text-center text-slate-400 italic text-xs space-y-2 flex-1">
              <ListTodo className="h-10 w-10 text-slate-200 mx-auto" />
              <p>Nenhuma melhoria ou reforma cadastrada para este carro.</p>
              <p className="text-[10px] font-medium text-slate-400/80">Registre itens que você gostaria de comprar ou reformar no seu veículo para mantê-los sob controle.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 content-start flex-1 min-h-0 overflow-y-auto overscroll-contain mt-4 pr-1">
              {(() => {
                const sortedUpgrades = [...upgrades].sort((a, b) => {
                  if (sortBy === 'recent') {
                    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
                  }
                  if (sortBy === 'priority') {
                    const priorityOrder = { 'Alta': 3, 'Média': 2, 'Baixa': 1 };
                    const pA = priorityOrder[a.priority as 'Alta' | 'Média' | 'Baixa'] || 2;
                    const pB = priorityOrder[b.priority as 'Alta' | 'Média' | 'Baixa'] || 2;
                    if (pA !== pB) {
                      return pB - pA; // High priority first
                    }
                    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
                  }
                  if (sortBy === 'price-asc') {
                    const valA = a.estimatedValue ?? Infinity;
                    const valB = b.estimatedValue ?? Infinity;
                    if (valA !== valB) return valA - valB;
                    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
                  }
                  if (sortBy === 'price-desc') {
                    const valA = a.estimatedValue ?? -Infinity;
                    const valB = b.estimatedValue ?? -Infinity;
                    if (valA !== valB) return valB - valA;
                    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
                  }
                  if (sortBy === 'alphabetical') {
                    return a.name.localeCompare(b.name);
                  }
                  return 0;
                });

                return sortedUpgrades.map((item) => (
                  <div
                    key={item.id}
                    className={`p-4 border rounded-md flex gap-3 items-start transition-all relative ${item.status === 'Concluido'
                      ? 'bg-slate-50/60 border-slate-200 opacity-75'
                      : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
                      }`}
                  >
                    {/* Status Toggle Button */}
                    <button
                      onClick={() => handleToggleUpgradeStatus(item)}
                      className="p-0.5 hover:bg-slate-100 rounded-full transition-all shrink-0 mt-0.5"
                      title={item.status === 'Pendente' ? 'Marcar como Concluído' : 'Marcar como Pendente'}
                    >
                      {item.status === 'Concluido' ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-600 fill-emerald-50" />
                      ) : (
                        <Circle className="h-5 w-5 text-slate-400" />
                      )}
                    </button>

                    {item.purchaseLink && (
                      <LinkThumbnail url={item.purchaseLink} />
                    )}

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-bold ${item.status === 'Concluido' ? 'text-slate-500 line-through' : 'text-slate-800'
                          }`}>
                          {item.name}
                        </span>
                        <span className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase ${item.status === 'Concluido'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                          : 'bg-amber-50 text-amber-700 border border-amber-100'
                          }`}>
                          {item.status === 'Concluido' ? 'Concluído' : 'Pendente'}
                        </span>
                        <span className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase border ${
                          item.priority === 'Alta'
                            ? 'bg-rose-50 text-rose-700 border-rose-100'
                            : item.priority === 'Baixa'
                            ? 'bg-slate-50 text-slate-600 border-slate-200/60'
                            : 'bg-blue-50 text-blue-700 border-blue-100'
                        }`}>
                          {item.priority || 'Média'}
                        </span>
                      </div>

                      {item.description && (
                        <p className={`text-[11px] leading-relaxed ${item.status === 'Concluido' ? 'text-slate-400/80 italic' : 'text-slate-500 font-medium'
                          }`}>
                          {item.description}
                        </p>
                      )}

                      <div className="flex items-center gap-3.5 text-[10px] text-slate-400 font-semibold pt-1">
                        {item.estimatedValue !== null && item.estimatedValue !== undefined && (
                          <span className="text-slate-600 font-bold bg-slate-100 px-2 py-0.5 rounded-md">
                            Est: {formatCurrency(item.estimatedValue)}
                          </span>
                        )}
                        {item.purchaseLink && (
                          <a
                            href={item.purchaseLink.startsWith('http') ? item.purchaseLink : `https://${item.purchaseLink}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-700 flex items-center gap-0.5 hover:underline"
                          >
                            <ExternalLink className="h-3 w-3" /> Link de Compra
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Actions (Edit / Delete) */}
                    <div className="flex items-center gap-1.5 shrink-0 self-start print:hidden">
                      <button
                        onClick={() => handleOpenEditUpgrade(item)}
                        className="p-1 hover:bg-slate-100 text-slate-400 hover:text-blue-600 rounded transition-all"
                        title="Editar item"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteUpgrade(item.id)}
                        className="p-1 hover:bg-slate-100 text-slate-400 hover:text-red-600 rounded transition-all"
                        title="Excluir item"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ));
              })()}
            </div>
          )}
        </div>
      )}
      </div>

      {/* Upgrade Create/Edit Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-lg shadow-xl max-w-md w-full p-6 space-y-4 animate-scale-in">
            <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
              <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                {editingUpgrade ? 'Editar Item de Melhoria' : 'Adicionar Item de Melhoria'}
              </h3>
              <button
                type="button"
                disabled={submittingUpgrade}
                onClick={() => setShowUpgradeModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Fechar
              </button>
            </div>

            <form onSubmit={handleSaveUpgrade} className="space-y-4 text-xs font-semibold text-slate-700">
              <div>
                <label className="block text-xxs font-bold text-slate-600 uppercase mb-1 tracking-wider">Nome do Item / Reforma *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Central Multimídia, Pintar Rodas"
                  className="w-full bg-slate-50 border border-slate-200 rounded-md px-3.5 py-2 focus:outline-none focus:border-blue-500 focus:bg-white text-slate-900 font-bold"
                  value={upgradeForm.name}
                  onChange={(e) => setUpgradeForm(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-xxs font-bold text-slate-600 uppercase mb-1 tracking-wider">Descrição / Observações</label>
                <textarea
                  rows={2}
                  placeholder="Ex: Modelo XYZ com Carplay sem fio"
                  className="w-full bg-slate-50 border border-slate-200 rounded-md px-3.5 py-2 focus:outline-none focus:border-blue-500 focus:bg-white text-slate-900 font-medium resize-none"
                  value={upgradeForm.description}
                  onChange={(e) => setUpgradeForm(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xxs font-bold text-slate-600 uppercase mb-1 tracking-wider">Valor (R$)</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="Ex: 850.00"
                    className="w-full bg-slate-50 border border-slate-200 rounded-md px-2.5 py-2 focus:outline-none focus:border-blue-500 focus:bg-white text-slate-900 font-bold"
                    value={upgradeForm.estimatedValue}
                    onChange={(e) => setUpgradeForm(prev => ({ ...prev, estimatedValue: e.target.value }))}
                    onFocus={(e) => e.target.select()}
                  />
                </div>

                <div>
                  <label className="block text-xxs font-bold text-slate-600 uppercase mb-1 tracking-wider">Prioridade</label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 rounded-md px-2 py-2 focus:outline-none focus:border-blue-500 focus:bg-white text-slate-900 font-bold cursor-pointer"
                    value={upgradeForm.priority}
                    onChange={(e) => setUpgradeForm(prev => ({ ...prev, priority: e.target.value as any }))}
                  >
                    <option value="Baixa">Baixa</option>
                    <option value="Média">Média</option>
                    <option value="Alta">Alta</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xxs font-bold text-slate-600 uppercase mb-1 tracking-wider">Status</label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 rounded-md px-2 py-2 focus:outline-none focus:border-blue-500 focus:bg-white text-slate-900 font-bold cursor-pointer"
                    value={upgradeForm.status}
                    onChange={(e) => setUpgradeForm(prev => ({ ...prev, status: e.target.value as any }))}
                  >
                    <option value="Pendente">Pendente</option>
                    <option value="Concluido">Concluído</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xxs font-bold text-slate-600 uppercase mb-1 tracking-wider">Link de Compra (URL opcional)</label>
                <input
                  type="text"
                  placeholder="Ex: www.mercadolivre.com.br/..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-md px-3.5 py-2 focus:outline-none focus:border-blue-500 focus:bg-white text-slate-900 font-medium"
                  value={upgradeForm.purchaseLink}
                  onChange={(e) => setUpgradeForm(prev => ({ ...prev, purchaseLink: e.target.value }))}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  disabled={submittingUpgrade}
                  onClick={() => setShowUpgradeModal(false)}
                  className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold px-4 py-2 rounded-lg text-xxs transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingUpgrade}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg text-xxs transition-all shadow flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submittingUpgrade ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    'Salvar'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Wash Create/Edit Modal */}
      {showWashModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-lg shadow-xl max-w-md w-full p-6 space-y-4 animate-scale-in max-h-[90vh] overflow-y-auto">
            <div className="border-b border-slate-100 pb-3 flex justify-between items-center sticky top-0 bg-white z-10">
              <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                {editingWash ? 'Editar Lavagem' : 'Registrar Lavagem'}
              </h3>
              <button
                type="button"
                disabled={submittingWash}
                onClick={() => setShowWashModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Fechar
              </button>
            </div>

            <form onSubmit={handleSaveWash} className="space-y-4 text-xs font-semibold text-slate-700">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xxs font-bold text-slate-600 uppercase mb-1 tracking-wider">Data *</label>
                  <input
                    type="date"
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:border-blue-500 focus:bg-white text-slate-900 font-bold"
                    value={washForm.date}
                    onChange={(e) => setWashForm(prev => ({ ...prev, date: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xxs font-bold text-slate-600 uppercase mb-1 tracking-wider">Km</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="Opcional"
                    className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:border-blue-500 focus:bg-white text-slate-900 font-bold"
                    value={washForm.mileage}
                    onChange={(e) => setWashForm(prev => ({ ...prev, mileage: e.target.value }))}
                    onFocus={(e) => e.target.select()}
                  />
                </div>
              </div>

              <label className="flex items-center gap-2.5 p-3 rounded-md border border-slate-200 bg-slate-50 cursor-pointer hover:border-violet-300 transition-all">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                  checked={washForm.selfWash}
                  onChange={(e) =>
                    setWashForm(prev => ({
                      ...prev,
                      selfWash: e.target.checked,
                      carWashName: e.target.checked ? '' : prev.carWashName,
                    }))
                  }
                />
                <div>
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-violet-600" /> Eu lavei o carro
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">Marque se a lavagem foi feita por você</span>
                </div>
              </label>

              {!washForm.selfWash && (
                <div>
                  <label className="block text-xxs font-bold text-slate-600 uppercase mb-1 tracking-wider">Lava-jato *</label>
                  <input
                    type="text"
                    required={!washForm.selfWash}
                    placeholder="Ex: Lava Rápido do Zé"
                    className="w-full bg-slate-50 border border-slate-200 rounded-md px-3.5 py-2 focus:outline-none focus:border-blue-500 focus:bg-white text-slate-900 font-bold"
                    value={washForm.carWashName}
                    onChange={(e) => setWashForm(prev => ({ ...prev, carWashName: e.target.value }))}
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xxs font-bold text-slate-600 uppercase mb-1 tracking-wider">Tipo</label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 rounded-md px-2 py-2 focus:outline-none focus:border-blue-500 focus:bg-white text-slate-900 font-bold cursor-pointer"
                    value={washForm.washType}
                    onChange={(e) => setWashForm(prev => ({ ...prev, washType: e.target.value }))}
                  >
                    {WASH_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xxs font-bold text-slate-600 uppercase mb-1 tracking-wider">Preço (R$)</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder={washForm.selfWash ? '0 se grátis' : 'Ex: 45.00'}
                    className="w-full bg-slate-50 border border-slate-200 rounded-md px-2.5 py-2 focus:outline-none focus:border-blue-500 focus:bg-white text-slate-900 font-bold"
                    value={washForm.price}
                    onChange={(e) => setWashForm(prev => ({ ...prev, price: e.target.value }))}
                    onFocus={(e) => e.target.select()}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xxs font-bold text-slate-600 uppercase mb-1 tracking-wider">Observações</label>
                <textarea
                  rows={2}
                  placeholder="Ex: Incluiu cera / machine wash"
                  className="w-full bg-slate-50 border border-slate-200 rounded-md px-3.5 py-2 focus:outline-none focus:border-blue-500 focus:bg-white text-slate-900 font-medium resize-none"
                  value={washForm.notes}
                  onChange={(e) => setWashForm(prev => ({ ...prev, notes: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-xxs font-bold text-slate-600 uppercase mb-1.5 tracking-wider">
                  Fotos{' '}
                  <span className="text-slate-400 normal-case font-medium">
                    (opcional, máx. {MAX_WASH_PHOTOS})
                  </span>
                </label>
                <p className="text-[10px] text-slate-400 font-medium mb-2 leading-relaxed">
                  Imagens grandes são redimensionadas e comprimidas no celular/PC antes de salvar (~720px, JPEG).
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {photoPreviews.map((src, index) => (
                    <div key={index} className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                      <img src={src} alt={`Foto ${index + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemoveWashPhotoAt(index)}
                        className="absolute top-1 right-1 p-1 rounded-full bg-slate-900/70 text-white hover:bg-red-600 transition-all"
                        title="Remover foto"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  {photoPreviews.length < MAX_WASH_PHOTOS && (
                    <label className="aspect-square flex flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 hover:border-cyan-400 hover:bg-cyan-50/30 cursor-pointer transition-all">
                      {compressingPhoto ? (
                        <Loader2 className="h-5 w-5 text-cyan-600 animate-spin" />
                      ) : (
                        <>
                          <Camera className="h-5 w-5 text-slate-400" />
                          <span className="text-[9px] font-bold text-slate-500 text-center px-1">
                            {photoPreviews.length === 0 ? 'Adicionar' : 'Mais'}
                          </span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        capture="environment"
                        className="hidden"
                        disabled={compressingPhoto}
                        onChange={handleWashPhotoChange}
                      />
                    </label>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  disabled={submittingWash}
                  onClick={() => setShowWashModal(false)}
                  className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold px-4 py-2 rounded-lg text-xxs transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingWash}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg text-xxs transition-all shadow flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submittingWash ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    'Salvar'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Photo lightbox (até 3 fotos) — navegação abaixo da imagem, sem sobrepor a foto */}
      {viewGallery && viewGallery.photos.length > 0 && (
        <div
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[60] flex flex-col"
          onClick={() => setViewGallery(null)}
        >
          <div className="flex items-center justify-end shrink-0 p-4">
            <button
              type="button"
              className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20"
              onClick={() => setViewGallery(null)}
              title="Fechar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div
            className="flex-1 min-h-0 flex items-center justify-center px-4 pb-2"
            onClick={() => setViewGallery(null)}
          >
            <img
              src={viewGallery.photos[viewGallery.index]}
              alt={`Foto ${viewGallery.index + 1} da lavagem`}
              className="max-w-full max-h-full rounded-lg shadow-2xl object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {viewGallery.photos.length > 1 ? (
            <div
              className="shrink-0 flex items-center justify-center gap-4 px-4 pb-6 pt-3"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className="p-2.5 rounded-full bg-white/15 text-white hover:bg-white/25 transition-colors"
                onClick={() =>
                  setViewGallery((g) =>
                    g
                      ? { ...g, index: (g.index - 1 + g.photos.length) % g.photos.length }
                      : g
                  )
                }
                title="Foto anterior"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <p className="text-xs font-semibold text-white/90 min-w-[3rem] text-center tabular-nums">
                {viewGallery.index + 1} / {viewGallery.photos.length}
              </p>
              <button
                type="button"
                className="p-2.5 rounded-full bg-white/15 text-white hover:bg-white/25 transition-colors"
                onClick={() =>
                  setViewGallery((g) =>
                    g ? { ...g, index: (g.index + 1) % g.photos.length } : g
                  )
                }
                title="Próxima foto"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          ) : (
            <div className="shrink-0 pb-6" />
          )}
        </div>
      )}
    </div>
  );
}
