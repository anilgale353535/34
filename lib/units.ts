export type UnitType = 'adet' | 'kg' | 'lt' | 'mt' | 'kutu' | 'paket';

export const UNITS: Record<UnitType, { label: string; decimal: boolean }> = {
  adet: { label: 'Adet', decimal: false },
  kg: { label: 'Kilogram', decimal: true },
  lt: { label: 'Litre', decimal: true },
  mt: { label: 'Metre', decimal: true },
  kutu: { label: 'Kutu', decimal: false },
  paket: { label: 'Paket', decimal: false }
} as const;

// Birim türünü normalize et (büyük/küçük harf duyarsız)
export const normalizeUnit = (unit: string): UnitType | null => {
  const normalized = unit.toLowerCase();
  return Object.keys(UNITS).includes(normalized) ? normalized as UnitType : null;
};

// Birim etiketini getir
export const getUnitLabel = (unit: string): string => {
  const normalizedUnit = normalizeUnit(unit);
  return normalizedUnit ? UNITS[normalizedUnit].label : unit;
}; 