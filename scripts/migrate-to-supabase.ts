/**
 * Migration Script: JSON to Supabase
 *
 * This script migrates data from local JSON files to Supabase.
 * Run with: npx ts-node --skip-project scripts/migrate-to-supabase.ts
 *
 * Required env vars:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const dataDir = path.join(process.cwd(), 'data');

function readJson<T>(filename: string): T {
  const filePath = path.join(dataDir, filename);
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content);
}

async function migrateVendors() {
  console.log('Migrating vendors...');
  const vendors = readJson<Array<{
    id: string;
    name: string;
    displayName: string;
    logoUrl?: string;
    description?: string;
    active: boolean;
  }>>('vendors.json');

  for (const vendor of vendors) {
    const { error } = await supabase.from('vendors').upsert({
      id: vendor.id,
      name: vendor.name,
      display_name: vendor.displayName,
      logo_url: vendor.logoUrl,
      description: vendor.description,
      active: vendor.active,
    });
    if (error) console.error(`Error migrating vendor ${vendor.id}:`, error);
  }
  console.log(`  Migrated ${vendors.length} vendors`);
}

async function migrateCustomers() {
  console.log('Migrating customers...');
  const customers = readJson<Array<{
    id: string;
    name: string;
    city?: string;
    region?: string;
    slug?: string;
    requiresAuth?: boolean;
    authorizedVendors?: string[];
    logoUrl?: string;
    influenceTier?: string;
    influenceWeight?: number;
    targetPieces?: number;
    targetDollars?: number;
  }>>('customershorted.json');

  for (const customer of customers) {
    const { error } = await supabase.from('customers').upsert({
      id: customer.id,
      name: customer.name,
      city: customer.city,
      region: customer.region,
      slug: customer.slug,
      requires_auth: customer.requiresAuth ?? false,
      logo_url: customer.logoUrl,
      influence_tier: customer.influenceTier,
      influence_weight: customer.influenceWeight,
      target_pieces: customer.targetPieces,
      target_dollars: customer.targetDollars,
    });
    if (error) console.error(`Error migrating customer ${customer.id}:`, error);

    // Migrate authorized vendors
    if (customer.authorizedVendors?.length) {
      for (const vendorId of customer.authorizedVendors) {
        const { error: cvError } = await supabase.from('customer_vendors').upsert({
          customer_id: customer.id,
          vendor_id: vendorId,
        });
        if (cvError && !cvError.message.includes('duplicate')) {
          console.error(`Error linking customer ${customer.id} to vendor ${vendorId}:`, cvError);
        }
      }
    }
  }
  console.log(`  Migrated ${customers.length} customers`);
}

async function migrateSelections() {
  console.log('Migrating selections...');
  const selections = readJson<Array<{
    id: string;
    customerId: string;
    name: string;
    status: string;
    source?: string;
    vendor?: string;
    isPublished: boolean;
    isVisibleToCustomer?: boolean;
    version: number;
    marketCycle?: { year: number; month: string };
    sourceEventId?: string;
    sourceYear?: number;
    marketMonth?: string;
    items: Array<{
      sku: string;
      name: string;
      imageUrl?: string;
      qty: number;
      displayQty?: number;
      backupQty?: number;
      unitList: number;
      programDisc?: number;
      netUnit: number;
      extendedNet: number;
      notes?: string;
      tags?: string[];
      collection?: string;
      year?: number;
      configuration?: unknown;
    }>;
    metadata?: unknown;
    createdAt: string;
    updatedAt: string;
  }>>('selections.json');

  let count = 0;
  for (const selection of selections) {
    const { error } = await supabase.from('selections').upsert({
      id: selection.id,
      customer_id: selection.customerId,
      name: selection.name,
      status: selection.status,
      source: selection.source,
      vendor_id: selection.vendor,
      is_published: selection.isPublished,
      is_visible_to_customer: selection.isVisibleToCustomer ?? false,
      version: selection.version,
      market_cycle_year: selection.marketCycle?.year || selection.sourceYear,
      market_cycle_month: selection.marketCycle?.month || selection.marketMonth,
      source_event_id: selection.sourceEventId,
      source_year: selection.sourceYear,
      metadata: selection.metadata,
      created_at: selection.createdAt,
      updated_at: selection.updatedAt,
    });
    if (error) {
      console.error(`Error migrating selection ${selection.id}:`, error);
      continue;
    }

    // Delete existing items
    await supabase.from('selection_items').delete().eq('selection_id', selection.id);

    // Insert items
    if (selection.items?.length) {
      const items = selection.items.map((item, index) => ({
        selection_id: selection.id,
        sku: item.sku,
        name: item.name,
        image_url: item.imageUrl,
        qty: item.qty,
        display_qty: item.displayQty || 0,
        backup_qty: item.backupQty || 0,
        unit_list: item.unitList,
        program_disc: item.programDisc || 0,
        net_unit: item.netUnit,
        extended_net: item.extendedNet,
        notes: item.notes,
        tags: item.tags,
        collection: item.collection,
        year: item.year,
        configuration: item.configuration,
        sort_order: index,
      }));

      const { error: itemError } = await supabase.from('selection_items').insert(items);
      if (itemError) console.error(`Error migrating items for selection ${selection.id}:`, itemError);
    }
    count++;
  }
  console.log(`  Migrated ${count} selections`);
}

async function migrateSettings() {
  console.log('Migrating settings...');
  try {
    const settings = readJson<{
      currentMarketCycle: { year: number; month: string };
      updatedAt: string;
    }>('settings.json');

    const { error } = await supabase.from('settings').upsert({
      id: 'global',
      current_market_cycle_year: settings.currentMarketCycle.year,
      current_market_cycle_month: settings.currentMarketCycle.month,
      updated_at: settings.updatedAt,
    });
    if (error) console.error('Error migrating settings:', error);
    console.log('  Migrated settings');
  } catch (e) {
    console.log('  No settings.json found, skipping');
  }
}

async function migratePromotions() {
  console.log('Migrating promotions...');
  try {
    const promotions = readJson<Array<{
      id: string;
      name: string;
      vendor?: string;
      active?: boolean;
      skuTiers?: unknown;
      dollarTiers?: unknown;
      inventoryIncentive?: unknown;
      portableIncentive?: unknown;
      summaryTitle?: string;
      summaryBody?: string;
      headlineBenefit?: string;
      summaryBullets?: string[];
      pdfUrl?: string;
      termsAndConditions?: string;
      createdAt?: string;
      updatedAt?: string;
    }>>('promotions.json');

    for (const promo of promotions) {
      // Skip promotion configs (those with customerId or presentations)
      if ('customerId' in promo || 'presentations' in promo) continue;

      const { error } = await supabase.from('promotions').upsert({
        id: promo.id,
        vendor_id: promo.vendor,
        name: promo.name,
        active: promo.active ?? true,
        sku_tiers: promo.skuTiers,
        dollar_tiers: promo.dollarTiers,
        inventory_incentive: promo.inventoryIncentive,
        portable_incentive: promo.portableIncentive,
        summary_title: promo.summaryTitle,
        summary_body: promo.summaryBody,
        headline_benefit: promo.headlineBenefit,
        summary_bullets: promo.summaryBullets,
        pdf_url: promo.pdfUrl,
        terms_and_conditions: promo.termsAndConditions,
        created_at: promo.createdAt,
        updated_at: promo.updatedAt,
      });
      if (error) console.error(`Error migrating promotion ${promo.id}:`, error);
    }
    console.log('  Migrated promotions');
  } catch (e) {
    console.log('  No promotions.json found, skipping');
  }
}

async function migrateProducts() {
  console.log('Migrating products from LibSpecs.json...');
  try {
    const specs = readJson<Array<Record<string, string | number>>>('LibSpecs.json');

    let count = 0;
    const batchSize = 100;
    const products: Array<{
      sku: string;
      name: string;
      vendor_id: string;
      collection_name: string | null;
      year: number | null;
      list_price: number | null;
      specifications: unknown;
    }> = [];

    for (const spec of specs) {
      const sku = String(spec['Item Number'] || spec['sku'] || '').trim();
      if (!sku) continue;

      products.push({
        sku,
        name: String(spec['Product Description'] || spec['name'] || sku),
        vendor_id: 'lib-and-co',
        collection_name: spec['Collection'] ? String(spec['Collection']) : null,
        year: spec['Year'] ? Number(spec['Year']) : null,
        list_price: spec[' CAD WSP '] ? Number(spec[' CAD WSP ']) : null,
        specifications: spec,
      });

      if (products.length >= batchSize) {
        const { error } = await supabase.from('products').upsert(products);
        if (error) console.error('Error inserting products batch:', error);
        count += products.length;
        products.length = 0;
        process.stdout.write(`\r  Migrated ${count} products...`);
      }
    }

    // Insert remaining products
    if (products.length > 0) {
      const { error } = await supabase.from('products').upsert(products);
      if (error) console.error('Error inserting final products batch:', error);
      count += products.length;
    }

    console.log(`\n  Migrated ${count} products`);
  } catch (e) {
    console.log('  No LibSpecs.json found, skipping products');
  }
}

async function main() {
  console.log('Starting migration to Supabase...\n');

  await migrateVendors();
  await migrateCustomers();
  await migrateSelections();
  await migrateSettings();
  await migratePromotions();
  await migrateProducts();

  console.log('\nMigration complete!');
}

main().catch(console.error);
