/**
 * Hubbardton Forge Finish Swatch Mapping
 *
 * Maps finish names to swatch image URLs from Hubbardton Forge
 * or fallback CSS colors for finishes without available images.
 *
 * URL Pattern: /media/samplerequest/{CODE}_{finish-name-lowercase-with-underscores}.jpg
 * Example: /media/samplerequest/07_oil_rubbed_bronze.jpg
 */

export interface FinishSwatch {
  name: string;
  imageUrl?: string; // Hubbardton Forge swatch URL
  color?: string; // Fallback CSS color
  code?: string; // Hubbardton finish code
}

const SWATCH_BASE = 'https://hubbardtonforge.com/media/samplerequest';
const SWATCH_THUMB_BASE = 'https://hubbardtonforge.com/media/attribute/swatch/swatch_thumb/110x90';

/**
 * Constructs swatch URL for a finish from code and name
 */
function getSwatchUrl(code: string, finishName: string): string {
  const slug = finishName.toLowerCase().replace(/\s+/g, '_');
  return `${SWATCH_BASE}/${code}_${slug}.jpg`;
}

/**
 * Constructs thumbnail swatch URL (new format)
 */
function getSwatchThumbUrl(code: string, filename: string): string {
  const firstChar = code.charAt(0);
  const secondChar = code.charAt(1);
  return `${SWATCH_THUMB_BASE}/${firstChar}/${secondChar}/${filename}`;
}

/**
 * Hubbardton Forge finish swatch mapping
 * ✓ = Has photographic swatch URL (verified working)
 * ○ = Fallback color only (no swatch image available)
 */
export const HUBBARDTON_FINISH_SWATCHES: Record<string, FinishSwatch> = {
  // === METAL FINISHES WITH PHOTOGRAPHIC SWATCHES ===
  // These finishes have verified working image URLs (scraped and confirmed)

  'Bronze': {
    name: 'Bronze',
    code: '05',
    imageUrl: getSwatchUrl('05', 'Bronze'),
    color: '#6b4423',
  },
  'Dark Smoke': {
    name: 'Dark Smoke',
    code: '07',
    imageUrl: getSwatchUrl('07', 'Dark Smoke'),
    color: '#3d3d3d',
  },
  'Black': {
    name: 'Black',
    code: '10',
    imageUrl: getSwatchUrl('10', 'Black'),
    color: '#1a1a1a',
  },
  'Oil Rubbed Bronze': {
    name: 'Oil Rubbed Bronze',
    code: '14',
    imageUrl: getSwatchUrl('14', 'Oil Rubbed Bronze'),
    color: '#4a3728',
  },
  'Natural Iron': {
    name: 'Natural Iron',
    code: '20',
    imageUrl: getSwatchUrl('20', 'Natural Iron'),
    color: '#4a4a4a',
  },
  'Soft Gold': {
    name: 'Soft Gold',
    code: '84',
    imageUrl: getSwatchUrl('84', 'Soft Gold'),
    color: '#b8924f',
  },
  'Sterling': {
    name: 'Sterling',
    code: '85',
    imageUrl: getSwatchUrl('85', 'Sterling'),
    color: '#c0c0c0',
  },
  'Clear Steel': {
    name: 'Clear Steel',
    code: '44',
    imageUrl: getSwatchThumbUrl('44', '44_clear_steel.jpg'),
    color: '#a8a8a8',
  },

  // === METAL FINISHES WITH COLOR FALLBACKS ONLY ===
  // These finishes don't have swatch images available

  'Burnished Steel': {
    name: 'Burnished Steel',
    code: '03',
    color: '#52565e',
  },
  'Coastal Bronze': {
    name: 'Coastal Bronze',
    code: '33',
    color: '#3b2f2a',
  },
  'Forged Iron': {
    name: 'Forged Iron',
    code: '23',
    color: '#3c3c3c',
  },
  'Opaque Natural Iron': {
    name: 'Opaque Natural Iron',
    code: '97',
    color: '#5a5a5a',
  },
  'Mahogany': {
    name: 'Mahogany',
    code: '22',
    color: '#4e2f1f',
  },
  'Gold': {
    name: 'Gold',
    code: '88',
    color: '#d4af37',
  },
  'Brass': {
    name: 'Brass',
    code: '86',
    color: '#b5a642',
  },
  'Vintage Brass': {
    name: 'Vintage Brass',
    code: '87',
    color: '#9d8853',
  },
  'Modern Brass': {
    name: 'Modern Brass',
    code: '86',
    imageUrl: getSwatchThumbUrl('86', '86_modern_brass_1.jpg'),
    color: '#c5a572',
  },
  'Ink': {
    name: 'Ink',
    code: '89',
    imageUrl: getSwatchThumbUrl('89', '89_ink.jpg'),
    color: '#1c1c1c',
  },
  'Vintage Platinum': {
    name: 'Vintage Platinum',
    code: '82',
    imageUrl: getSwatchThumbUrl('82', '82-2.jpg'),
    color: '#8a8a8a',
  },
  'Platinum': {
    name: 'Platinum',
    code: '24',
    color: '#9c9c9c',
  },
  'Soft Silver': {
    name: 'Soft Silver',
    code: '90',
    color: '#b8b8b8',
  },
  'Brushed Nickel': {
    name: 'Brushed Nickel',
    code: '92',
    color: '#a8a8a8',
  },
  'Polished Nickel': {
    name: 'Polished Nickel',
    code: '94',
    color: '#bebebe',
  },
  'Burnished Copper': {
    name: 'Burnished Copper',
    code: '95',
    color: '#b87333',
  },
  'Translucent Bronze': {
    name: 'Translucent Bronze',
    code: '26',
    color: '#8b6f47',
  },
  'Translucent Burnished Steel': {
    name: 'Translucent Burnished Steel',
    code: '27',
    color: '#6b7280',
  },

  // === ACCENT FINISHES (Glass, Shades, Materials) ===
  // V2 NOTE: These accent materials may not have dedicated CDN swatches.
  // For 100% visual consistency, we use color-based representations until
  // photographic swatches become available.

  // Glass Colors
  'Clear': {
    name: 'Clear',
    code: 'CG',
    color: 'rgba(255, 255, 255, 0.1)',
    // imageUrl: Future enhancement - add when available
  },
  'Frosted': {
    name: 'Frosted',
    code: 'FG',
    color: '#f0f0f0',
  },
  'Amber': {
    name: 'Amber',
    code: 'AG',
    color: '#ffbf00',
  },
  'Smoke': {
    name: 'Smoke',
    code: 'SG',
    color: '#6b6b6b',
  },
  'Bronze Glass': {
    name: 'Bronze Glass',
    code: 'BG',
    color: '#8b6f47',
  },

  // Fabric/Shade Colors
  'White': {
    name: 'White',
    code: '02',
    imageUrl: getSwatchThumbUrl('02', '02_white_1.jpg'),
    color: '#ffffff',
  },
  'Ivory': {
    name: 'Ivory',
    code: 'IV',
    color: '#fffff0',
  },
  'Natural Linen': {
    name: 'Natural Linen',
    code: 'NL',
    color: '#faf0e6',
  },
  'Doeskin Suede': {
    name: 'Doeskin Suede',
    code: 'DS',
    color: '#d2b48c',
  },

  // Stone/Natural Materials
  'Alabaster': {
    name: 'Alabaster',
    code: 'AL',
    color: '#f2e8dc',
  },
  'Onyx': {
    name: 'Onyx',
    code: 'ON',
    color: '#353839',
  },
};

/**
 * Get finish swatch data by finish name
 * Returns undefined if finish is not found
 */
export function getFinishSwatch(finishName: string): FinishSwatch | undefined {
  // Try exact match first
  if (HUBBARDTON_FINISH_SWATCHES[finishName]) {
    return HUBBARDTON_FINISH_SWATCHES[finishName];
  }

  // Try case-insensitive match
  const normalizedName = finishName.toLowerCase().trim();
  const entry = Object.entries(HUBBARDTON_FINISH_SWATCHES).find(
    ([key]) => key.toLowerCase() === normalizedName
  );

  return entry ? entry[1] : undefined;
}

/**
 * Generate a fallback color for unknown finishes
 * Uses a hash of the finish name to generate a consistent color
 */
export function getFallbackColor(finishName: string): string {
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < finishName.length; i++) {
    hash = finishName.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Convert to hex color (muted palette)
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 20%, 45%)`;
}
