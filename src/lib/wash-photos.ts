/** Máximo de fotos por lavagem. */
export const MAX_WASH_PHOTOS = 3;

/** Tamanho alvo do data URL após compressão (~210 KB de imagem). */
export const TARGET_PHOTO_DATA_URL_LEN = 280_000;

/** Limite rígido por foto no servidor (data URL). */
export const MAX_PHOTO_DATA_URL_LEN = 400_000;

/**
 * Lê o campo photoData do banco:
 * - JSON array de data URLs (formato novo)
 * - um único data URL (formato antigo)
 */
export function parseWashPhotos(photoData: string | null | undefined): string[] {
  if (!photoData) return [];
  const trimmed = photoData.trim();
  if (!trimmed) return [];

  if (trimmed.startsWith('[')) {
    try {
      const arr = JSON.parse(trimmed) as unknown;
      if (!Array.isArray(arr)) return [];
      return arr
        .filter((x): x is string => typeof x === 'string' && x.startsWith('data:image/'))
        .slice(0, MAX_WASH_PHOTOS);
    } catch {
      return [];
    }
  }

  if (trimmed.startsWith('data:image/')) {
    return [trimmed];
  }

  return [];
}

/** Serializa até 3 fotos para gravar em photoData (Text). */
export function serializeWashPhotos(photos: string[] | null | undefined): string | null {
  if (!photos || photos.length === 0) return null;
  const cleaned = photos
    .filter((p) => typeof p === 'string' && p.startsWith('data:image/'))
    .slice(0, MAX_WASH_PHOTOS);
  if (cleaned.length === 0) return null;
  return JSON.stringify(cleaned);
}
