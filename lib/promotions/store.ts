/**
 * Promotion Data Store
 *
 * Handles CRUD operations for promotions
 * Uses JSON file for storage in dev/demo mode
 */

import fs from 'fs';
import path from 'path';
import { Promotion, CreatePromotionInput, UpdatePromotionInput, PromotionTier } from './types';

const PROMOTIONS_FILE = path.join(process.cwd(), 'data', 'promotions.json');

/**
 * Generate a unique ID for a promotion or tier
 */
function generateId(): string {
  return `promo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Load all promotions from file
 */
export async function loadPromotions(): Promise<Promotion[]> {
  try {
    if (!fs.existsSync(PROMOTIONS_FILE)) {
      // Create empty file if it doesn't exist
      await savePromotions([]);
      return [];
    }

    const data = fs.readFileSync(PROMOTIONS_FILE, 'utf-8');
    return JSON.parse(data) as Promotion[];
  } catch (error) {
    console.error('Error loading promotions:', error);
    return [];
  }
}

/**
 * Save promotions to file
 */
async function savePromotions(promotions: Promotion[]): Promise<void> {
  try {
    const dataDir = path.dirname(PROMOTIONS_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    fs.writeFileSync(PROMOTIONS_FILE, JSON.stringify(promotions, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error saving promotions:', error);
    throw new Error('Failed to save promotions');
  }
}

/**
 * Get a promotion by ID
 */
export async function getPromotion(id: string): Promise<Promotion | null> {
  const promotions = await loadPromotions();
  return promotions.find((p) => p.id === id) || null;
}

/**
 * Get the currently active promotion
 * @param vendor - Optional vendor ID to filter by
 */
export async function getActivePromotion(vendor?: string): Promise<Promotion | null> {
  const promotions = await loadPromotions();
  const now = new Date();

  // Find active promotion within date range (if specified)
  const activePromotion = promotions.find((p) => {
    if (!p.active) return false;

    // Filter by vendor if specified
    if (vendor && p.vendor && p.vendor !== vendor) return false;

    // Check date range if specified
    if (p.startDate && new Date(p.startDate) > now) return false;
    if (p.endDate && new Date(p.endDate) < now) return false;

    return true;
  });

  return activePromotion || null;
}

/**
 * Create a new promotion
 */
export async function createPromotion(input: CreatePromotionInput): Promise<Promotion> {
  const promotions = await loadPromotions();

  // Generate IDs for tiers
  const skuTiers: PromotionTier[] = input.skuTiers.map((tier) => ({
    ...tier,
    id: generateId(),
  }));

  const dollarTiers: PromotionTier[] = input.dollarTiers.map((tier) => ({
    ...tier,
    id: generateId(),
  }));

  const newPromotion: Promotion = {
    id: generateId(),
    name: input.name,
    vendor: input.vendor,
    description: input.description,
    active: input.active,
    startDate: input.startDate,
    endDate: input.endDate,
    skuTiers,
    dollarTiers,
    inventoryIncentive: input.inventoryIncentive,
    portableIncentive: input.portableIncentive,
    summaryTitle: input.summaryTitle,
    summaryBody: input.summaryBody,
    headlineBenefit: input.headlineBenefit,
    summaryBullets: input.summaryBullets,
    pdfUrl: input.pdfUrl,
    termsAndConditions: input.termsAndConditions,
    uploadedPromotionUrl: (input as Record<string, unknown>).uploadedPromotionUrl as string | undefined,
    uploadedPromotionType: (input as Record<string, unknown>).uploadedPromotionType as string | undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  promotions.push(newPromotion);
  await savePromotions(promotions);

  return newPromotion;
}

/**
 * Update an existing promotion
 */
export async function updatePromotion(input: UpdatePromotionInput): Promise<Promotion> {
  const promotions = await loadPromotions();
  const index = promotions.findIndex((p) => p.id === input.id);

  if (index === -1) {
    throw new Error(`Promotion with ID ${input.id} not found`);
  }

  const existing = promotions[index];

  // Update tiers if provided
  let skuTiers = existing.skuTiers;
  if (input.skuTiers) {
    skuTiers = input.skuTiers.map((tier) => ({
      ...tier,
      id: 'id' in tier ? (tier as PromotionTier).id : generateId(),
    }));
  }

  let dollarTiers = existing.dollarTiers;
  if (input.dollarTiers) {
    dollarTiers = input.dollarTiers.map((tier) => ({
      ...tier,
      id: 'id' in tier ? (tier as PromotionTier).id : generateId(),
    }));
  }

  const updated: Promotion = {
    ...existing,
    ...input,
    skuTiers,
    dollarTiers,
    updatedAt: new Date().toISOString(),
  };

  promotions[index] = updated;
  await savePromotions(promotions);

  return updated;
}

/**
 * Delete a promotion
 */
export async function deletePromotion(id: string): Promise<boolean> {
  const promotions = await loadPromotions();
  const filtered = promotions.filter((p) => p.id !== id);

  if (filtered.length === promotions.length) {
    return false; // Nothing was deleted
  }

  await savePromotions(filtered);
  return true;
}

/**
 * Toggle promotion active status
 */
export async function togglePromotionActive(id: string): Promise<Promotion> {
  const promotion = await getPromotion(id);
  if (!promotion) {
    throw new Error(`Promotion with ID ${id} not found`);
  }

  return await updatePromotion({
    id,
    active: !promotion.active,
  });
}
