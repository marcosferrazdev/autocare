'use client';

import React, { useState } from 'react';
import { Camera, Loader2, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import { MAX_PHOTOS, TARGET_PHOTO_DATA_URL_LEN, MAX_PHOTO_DATA_URL_LEN } from '@/lib/photos';

const MAX_INPUT_IMAGE_BYTES = 12 * 1024 * 1024; // 12 MB no arquivo original

/**
 * Redimensiona e comprime no cliente (JPEG) para não sobrecarregar o banco.
 * Tenta várias passadas até o data URL ficar ~280 KB (ou no limite rígido).
 */
export async function compressImageToDataUrl(file: File): Promise<string> {
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

/**
 * Grade de anexos de imagem (opcional) usada nos formulários de lavagem,
 * manutenção, abastecimento e lembretes.
 */
export function PhotoPicker({
  photos,
  onChange,
  label = 'Fotos',
  hint,
}: {
  photos: string[];
  onChange: (photos: string[]) => void;
  label?: string;
  hint?: string;
}) {
  const { toast } = useToast();
  const [compressing, setCompressing] = useState(false);

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length === 0) return;

    const slotsLeft = MAX_PHOTOS - photos.length;
    if (slotsLeft <= 0) {
      toast(`Máximo de ${MAX_PHOTOS} fotos.`);
      return;
    }

    const toProcess = files.slice(0, slotsLeft);
    if (files.length > slotsLeft) {
      toast(`Só é possível adicionar mais ${slotsLeft} foto(s) (máx. ${MAX_PHOTOS}).`);
    }

    try {
      setCompressing(true);
      const compressed: string[] = [];
      for (const file of toProcess) {
        if (!file.type.startsWith('image/')) {
          toast(`Arquivo ignorado (não é imagem): ${file.name}`);
          continue;
        }
        try {
          compressed.push(await compressImageToDataUrl(file));
        } catch (err) {
          console.error(err);
          toast((err as Error)?.message || `Falha ao comprimir ${file.name}`);
        }
      }
      if (compressed.length > 0) {
        onChange([...photos, ...compressed].slice(0, MAX_PHOTOS));
      }
    } finally {
      setCompressing(false);
    }
  };

  return (
    <div>
      <label className="block text-xxs font-bold text-slate-600 uppercase mb-1.5 tracking-wider">
        {label}{' '}
        <span className="text-slate-400 normal-case font-medium">(opcional, máx. {MAX_PHOTOS})</span>
      </label>
      <p className="text-[10px] text-slate-400 font-medium mb-2 leading-relaxed">
        {hint || 'Imagens grandes são redimensionadas e comprimidas no celular/PC antes de salvar (~720px, JPEG).'}
      </p>
      <div className="grid grid-cols-3 gap-2">
        {photos.map((src, index) => (
          <div key={index} className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
            <img src={src} alt={`Foto ${index + 1}`} className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => onChange(photos.filter((_, i) => i !== index))}
              className="absolute top-1 right-1 p-1 rounded-full bg-slate-900/70 text-white hover:bg-red-600 transition-all"
              title="Remover foto"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        {photos.length < MAX_PHOTOS && (
          <label className="aspect-square flex flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 hover:border-cyan-400 hover:bg-cyan-50/30 cursor-pointer transition-all">
            {compressing ? (
              <Loader2 className="h-5 w-5 text-cyan-600 animate-spin" />
            ) : (
              <>
                <Camera className="h-5 w-5 text-slate-400" />
                <span className="text-[9px] font-bold text-slate-500 text-center px-1">
                  {photos.length === 0 ? 'Adicionar' : 'Mais'}
                </span>
              </>
            )}
            <input
              type="file"
              accept="image/*"
              multiple
              capture="environment"
              className="hidden"
              disabled={compressing}
              onChange={handleFiles}
            />
          </label>
        )}
      </div>
    </div>
  );
}

/** Miniatura clicável que abre o visualizador. Não renderiza nada sem fotos. */
export function PhotoThumb({
  photos,
  size = 'w-20 h-20',
  className = '',
}: {
  photos: string[];
  size?: string;
  className?: string;
}) {
  const [gallery, setGallery] = useState<number | null>(null);

  if (photos.length === 0) return null;

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setGallery(0);
        }}
        className={`relative ${size} rounded-lg overflow-hidden border border-slate-200 shrink-0 bg-slate-50 hover:border-cyan-400 transition-all ${className}`}
        title={photos.length > 1 ? `Ver ${photos.length} fotos` : 'Ver foto'}
      >
        <img src={photos[0]} alt="Foto anexada" className="w-full h-full object-cover" />
        {photos.length > 1 && (
          <span className="absolute bottom-0.5 right-0.5 text-[9px] font-bold bg-slate-900/75 text-white px-1 py-0.5 rounded">
            +{photos.length - 1}
          </span>
        )}
      </button>

      {gallery !== null && (
        <div
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[90] flex flex-col"
          onClick={() => setGallery(null)}
        >
          <div className="flex items-center justify-end shrink-0 p-4">
            <button
              type="button"
              className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20"
              onClick={() => setGallery(null)}
              title="Fechar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 min-h-0 flex items-center justify-center px-4 pb-2">
            <img
              src={photos[gallery]}
              alt={`Foto ${gallery + 1}`}
              className="max-w-full max-h-full rounded-lg shadow-2xl object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {photos.length > 1 ? (
            <div
              className="shrink-0 flex items-center justify-center gap-4 px-4 pb-6 pt-3"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className="p-2.5 rounded-full bg-white/15 text-white hover:bg-white/25 transition-colors"
                onClick={() => setGallery((g) => ((g ?? 0) - 1 + photos.length) % photos.length)}
                title="Foto anterior"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <p className="text-xs font-semibold text-white/90 min-w-[3rem] text-center tabular-nums">
                {gallery + 1} / {photos.length}
              </p>
              <button
                type="button"
                className="p-2.5 rounded-full bg-white/15 text-white hover:bg-white/25 transition-colors"
                onClick={() => setGallery((g) => ((g ?? 0) + 1) % photos.length)}
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
    </>
  );
}
