/* eslint-disable @typescript-eslint/no-explicit-any */
// Transform functions for data normalization

import { Transform } from './mapping-types';

export function applyTransforms(value: any, transforms: Transform[]): any {
  if (value === null || value === undefined) {
    return value;
  }

  return transforms.reduce((val, transform) => {
    return applyTransform(val, transform);
  }, value);
}

export function applyTransform(value: any, transform: Transform): any {
  switch (transform.type) {
    case 'trim':
      return String(value).trim();

    case 'uppercase':
      return String(value).toUpperCase();

    case 'lowercase':
      return String(value).toLowerCase();

    case 'number':
      return parseNumber(value);

    case 'strip_units':
      return stripUnits(value);

    case 'remove_commas':
      return String(value).replace(/,/g, '');

    case 'regex':
      if (transform.pattern) {
        const regex = new RegExp(transform.pattern, 'g');
        return String(value).replace(regex, transform.replacement || '');
      }
      return value;

    default:
      return value;
  }
}

function parseNumber(value: any): number {
  if (typeof value === 'number') {
    return value;
  }

  // Remove common non-numeric characters
  const cleaned = String(value)
    .replace(/[,$\s]/g, '') // Remove commas, dollar signs, spaces
    .replace(/\s*(in|cm|mm|ft|lb|kg|oz)$/i, ''); // Remove units at end

  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

function stripUnits(value: any): string {
  return String(value)
    .replace(/\s*(in|cm|mm|ft|m|lb|kg|oz|g)$/i, '')
    .trim();
}

export function normalizeStatus(value: any): 'active' | 'discontinued' | 'archived' {
  const str = String(value).toLowerCase().trim();

  // Active variations
  if (str === 'active' || str === 'a' || str === '1' || str === 'true' || str === 'yes') {
    return 'active';
  }

  // Discontinued variations
  if (
    str === 'discontinued' ||
    str === 'd' ||
    str === 'disc' ||
    str === 'inactive' ||
    str === '0' ||
    str === 'false' ||
    str === 'no'
  ) {
    return 'discontinued';
  }

  // Archived variations
  if (str === 'archived' || str === 'archive' || str === 'arch') {
    return 'archived';
  }

  // Default to active
  return 'active';
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special chars
    .replace(/[\s_-]+/g, '-') // Replace spaces/underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

// Unit conversion utilities
export function convertToInches(value: number, unit: string): number {
  const unitLower = unit.toLowerCase();

  switch (unitLower) {
    case 'cm':
      return value / 2.54;
    case 'mm':
      return value / 25.4;
    case 'ft':
    case 'feet':
      return value * 12;
    case 'm':
    case 'meter':
    case 'meters':
      return value * 39.3701;
    case 'in':
    case 'inch':
    case 'inches':
    default:
      return value;
  }
}

export function detectAndConvertUnits(value: string | number): { value: number; unit: string } {
  if (typeof value === 'number') {
    return { value, unit: 'unknown' };
  }

  const str = String(value).trim();
  const match = str.match(/^([\d.]+)\s*([a-z]+)?$/i);

  if (!match) {
    return { value: parseNumber(str), unit: 'unknown' };
  }

  const numValue = parseFloat(match[1]);
  const unit = match[2] || 'unknown';

  return {
    value: convertToInches(numValue, unit),
    unit,
  };
}

// Inference helpers for auto-transforms
export function inferTransforms(columnName: string, sampleValues: any[]): Transform[] {
  const transforms: Transform[] = [];
  const nameLower = columnName.toLowerCase();

  // Always trim strings
  if (sampleValues.some((v) => typeof v === 'string' && v !== v.trim())) {
    transforms.push({ type: 'trim' });
  }

  // Detect price columns (remove commas, convert to number)
  if (
    nameLower.includes('price') ||
    nameLower.includes('cost') ||
    nameLower.includes('msrp') ||
    nameLower.includes('list')
  ) {
    transforms.push({ type: 'remove_commas' });
    transforms.push({ type: 'number' });
  }

  // Detect dimension columns (strip units, convert to number)
  if (
    nameLower.includes('width') ||
    nameLower.includes('height') ||
    nameLower.includes('depth') ||
    nameLower.includes('length') ||
    nameLower.includes('diameter')
  ) {
    transforms.push({ type: 'strip_units' });
    transforms.push({ type: 'number' });
  }

  // Detect weight columns
  if (nameLower.includes('weight')) {
    transforms.push({ type: 'strip_units' });
    transforms.push({ type: 'number' });
  }

  return transforms;
}
