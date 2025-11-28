export const FINISH_COLORS: Record<string, string> = {
  // Hubbardton Forge finishes
  'Black': '#000000',
  'Bronze': '#8B4513',
  'Dark Smoke': '#2F2F2F',
  'Ink': '#1A1A2E',
  'Modern Brass': '#B5A642',
  'Natural Iron': '#5A5A5A',
  'Oil Rubbed Bronze': '#4A3728',
  'Soft Gold': '#D4AF37',
  'Sterling': '#C0C0C0',
  'Vintage Platinum': '#9B9B9B',
  'White': '#FFFFFF',

  // Add more finishes as needed for other vendors
};

export function getFinishColor(finishName: string): string | null {
  return FINISH_COLORS[finishName] || null;
}
