/**
 * Helper utility to generate clean, standard, and collision-resistant SKUs (Stock Keeping Units).
 */
export function generateAutoSku(name: string = '', productType: string = 'physical'): string {
  const typeMap: Record<string, string> = {
    physical: 'BK',
    custom: 'CUST',
    digital: 'DIG',
    addon: 'ADD',
    bundle: 'BNDL',
  };

  const prefix = typeMap[productType.toLowerCase()] || 'PRD';

  // Clean name into alpha words
  const cleanWords = name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 0 && !['A', 'AN', 'THE', 'AND', 'OF', 'FOR'].includes(w));

  let namePart = '';
  if (cleanWords.length === 0) {
    namePart = 'ITEM';
  } else if (cleanWords.length === 1) {
    namePart = cleanWords[0].slice(0, 6);
  } else {
    // Combine first 2 meaningful words (e.g. SAFARI + ANIM)
    namePart = `${cleanWords[0].slice(0, 4)}-${cleanWords[1].slice(0, 4)}`;
  }

  // 4-digit random number suffix for uniqueness
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);

  return `${prefix}-${namePart}-${randomSuffix}`;
}

/**
 * Generates standard Goods Received Note (GRN) inbound stock reference numbers.
 * Format: GRN-YYYYMMDD-XXXX (e.g. GRN-20260830-4819)
 */
export function generateAutoGrnReference(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);

  return `GRN-${year}${month}${day}-${randomSuffix}`;
}

