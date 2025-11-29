/**
 * Unified Data Client
 *
 * Provides a dual-mode data layer that uses Supabase when configured,
 * otherwise falls back to JSON file storage.
 */

import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Lazy-load file utilities to avoid issues when they're not needed
async function getFileUtils() {
  const { readJsonFile, writeJsonFile } = await import('@/lib/utils/file');
  return { readJsonFile, writeJsonFile };
}

// Check if Supabase is configured
export function isSupabaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

// Get Supabase client for server-side operations
// Uses service_role key when available to bypass RLS (for API routes)
// Falls back to anon key for read operations
function getSupabaseClient(): SupabaseClient<Database> {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured');
  }

  // Use service_role key for server-side operations (bypasses RLS)
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    key,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

// ============================================
// CUSTOMERS
// ============================================

export type CustomerData = {
  id: string;
  name: string;
  city?: string;
  region?: string;
  slug?: string;
  requiresAuth?: boolean;
  authorizedVendors?: string[];
  logoUrl?: string;
  influenceTier?: 'A' | 'B' | 'C';
  influenceWeight?: number;
  targetPieces?: number;
  targetDollars?: number;
};

let customersCache: CustomerData[] | null = null;

export async function loadCustomers(): Promise<CustomerData[]> {
  if (customersCache) return customersCache;

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseClient();

    // Load customers with their authorized vendors
    type CustomerRow = Database['public']['Tables']['customers']['Row'];
    const { data: customers, error } = await supabase
      .from('customers')
      .select('*')
      .order('name') as { data: CustomerRow[] | null; error: Error | null };

    if (error) throw error;
    if (!customers) return [];

    // Load customer vendors
    const { data: customerVendors } = await supabase
      .from('customer_vendors')
      .select('*') as { data: Array<{ customer_id: string; vendor_id: string }> | null };

    // Map to CustomerData format
    const vendorMap = new Map<string, string[]>();
    if (customerVendors) {
      for (const cv of customerVendors) {
        const vendors = vendorMap.get(cv.customer_id) || [];
        vendors.push(cv.vendor_id);
        vendorMap.set(cv.customer_id, vendors);
      }
    }

    customersCache = customers.map((c) => ({
      id: c.id,
      name: c.name,
      city: c.city || undefined,
      region: c.region || undefined,
      slug: c.slug || undefined,
      requiresAuth: c.requires_auth,
      authorizedVendors: vendorMap.get(c.id) || ['lib-and-co'],
      logoUrl: c.logo_url || undefined,
      influenceTier: c.influence_tier || undefined,
      influenceWeight: c.influence_weight || undefined,
      targetPieces: c.target_pieces || undefined,
      targetDollars: c.target_dollars || undefined,
    }));
  } else {
    const { readJsonFile } = await getFileUtils();
    customersCache = await readJsonFile<CustomerData[]>('data/customershorted.json', []);
  }

  return customersCache;
}

export async function findCustomer(idOrSlug: string): Promise<CustomerData | null> {
  const customers = await loadCustomers();
  return customers.find(
    (c) => c.id.toLowerCase() === idOrSlug.toLowerCase() ||
           c.slug?.toLowerCase() === idOrSlug.toLowerCase()
  ) || null;
}

export async function updateCustomer(
  customerId: string,
  updates: Partial<Omit<CustomerData, 'id'>>
): Promise<CustomerData> {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseClient();
    type CustomerRow = Database['public']['Tables']['customers']['Row'];

    // Convert to database format
    const dbUpdates: Record<string, unknown> = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.city !== undefined) dbUpdates.city = updates.city;
    if (updates.region !== undefined) dbUpdates.region = updates.region;
    if (updates.slug !== undefined) dbUpdates.slug = updates.slug;
    if (updates.requiresAuth !== undefined) dbUpdates.requires_auth = updates.requiresAuth;
    if (updates.logoUrl !== undefined) dbUpdates.logo_url = updates.logoUrl;
    if (updates.influenceTier !== undefined) dbUpdates.influence_tier = updates.influenceTier;
    if (updates.influenceWeight !== undefined) dbUpdates.influence_weight = updates.influenceWeight;
    if (updates.targetPieces !== undefined) dbUpdates.target_pieces = updates.targetPieces;
    if (updates.targetDollars !== undefined) dbUpdates.target_dollars = updates.targetDollars;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('customers')
      .update(dbUpdates)
      .eq('id', customerId)
      .select()
      .single() as { data: CustomerRow | null; error: Error | null };

    if (error) throw error;
    if (!data) throw new Error('Customer not found');

    // Update authorized vendors if provided
    if (updates.authorizedVendors) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('customer_vendors').delete().eq('customer_id', customerId);

      const vendorInserts = updates.authorizedVendors.map((vendorId) => ({
        customer_id: customerId,
        vendor_id: vendorId,
      }));

      if (vendorInserts.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any).from('customer_vendors').insert(vendorInserts);
      }
    }

    // Clear cache
    customersCache = null;

    return {
      id: data.id,
      name: data.name,
      city: data.city || undefined,
      region: data.region || undefined,
      slug: data.slug || undefined,
      requiresAuth: data.requires_auth,
      authorizedVendors: updates.authorizedVendors || ['lib-and-co'],
      logoUrl: data.logo_url || undefined,
      influenceTier: data.influence_tier || undefined,
      influenceWeight: data.influence_weight || undefined,
      targetPieces: data.target_pieces || undefined,
      targetDollars: data.target_dollars || undefined,
    };
  } else {
    // JSON fallback
    const { readJsonFile, writeJsonFile } = await getFileUtils();
    const customers = await readJsonFile<CustomerData[]>('data/customershorted.json', []);
    const index = customers.findIndex((c) => c.id === customerId);

    if (index === -1) throw new Error(`Customer ${customerId} not found`);

    customers[index] = { ...customers[index], ...updates };
    await writeJsonFile('data/customershorted.json', customers);
    customersCache = null;

    return customers[index];
  }
}

export function resetCustomersCache() {
  customersCache = null;
}

// ============================================
// VENDORS
// ============================================

export type VendorData = {
  id: string;
  name: string;
  displayName: string;
  logoUrl?: string;
  description?: string;
  active: boolean;
};

let vendorsCache: VendorData[] | null = null;

export async function loadVendors(): Promise<VendorData[]> {
  if (vendorsCache) return vendorsCache;

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseClient();
    type VendorRow = Database['public']['Tables']['vendors']['Row'];
    const { data, error } = await supabase
      .from('vendors')
      .select('*')
      .eq('active', true)
      .order('name') as { data: VendorRow[] | null; error: Error | null };

    if (error) throw error;
    if (!data) return [];

    vendorsCache = data.map((v) => ({
      id: v.id,
      name: v.name,
      displayName: v.display_name,
      logoUrl: v.logo_url || undefined,
      description: v.description || undefined,
      active: v.active,
    }));
  } else {
    const { readJsonFile } = await getFileUtils();
    vendorsCache = await readJsonFile<VendorData[]>('data/vendors.json', []);
  }

  return vendorsCache;
}

// ============================================
// PRODUCTS
// ============================================

export type ProductData = {
  sku: string;
  name: string;
  vendor?: string;
  collectionName?: string;
  year?: number;
  list: number; // WSP price
  mapPrice?: number;
  image?: string;
  finish?: string;
  baseItemCode?: string;
  isConfigurable?: boolean;
  specifications?: Record<string, unknown>;
};

export async function loadProducts(vendor?: string): Promise<ProductData[]> {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseClient();
    type ProductRow = Database['public']['Tables']['products']['Row'];

    let query = supabase.from('products').select('*');
    if (vendor) {
      query = query.eq('vendor_id', vendor);
    }

    const { data, error } = await query as { data: ProductRow[] | null; error: Error | null };
    if (error) throw error;
    if (!data) return [];

    return data.map((p) => ({
      sku: p.sku,
      name: p.name,
      vendor: p.vendor_id || undefined,
      collectionName: p.collection_name || undefined,
      year: p.year || undefined,
      list: p.list_price || 0,
      mapPrice: p.map_price || undefined,
      image: p.image_url || undefined,
      finish: p.finish || undefined,
      baseItemCode: p.base_item_code || undefined,
      isConfigurable: p.is_configurable,
      specifications: p.specifications as Record<string, unknown> || undefined,
    }));
  } else {
    // Fall back to existing catalog loading (handled by loadCatalog.ts)
    return [];
  }
}

// ============================================
// SELECTIONS
// ============================================

export type SelectionData = {
  id: string;
  customerId: string;
  name: string;
  status: 'snapshot' | 'working' | 'archived';
  source?: 'manual' | 'dallas';
  vendor?: string;
  isPublished: boolean;
  isVisibleToCustomer?: boolean;
  version: number;
  marketCycle?: { year: number; month: 'January' | 'June' };
  sourceEventId?: string;
  sourceYear?: number;
  marketMonth?: 'January' | 'June';
  items: SelectionItemData[];
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type SelectionItemData = {
  id?: string;
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
  configuration?: {
    baseItemCode: string;
    variantSku?: string;
    options: Record<string, string>;
    productName: string;
  };
};

type SelectionWithItems = Database['public']['Tables']['selections']['Row'] & {
  selection_items: Database['public']['Tables']['selection_items']['Row'][];
};

export async function loadSelections(): Promise<SelectionData[]> {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseClient();

    // Load selections with items
    const { data: selections, error } = await supabase
      .from('selections')
      .select(`
        *,
        selection_items (*)
      `)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    if (!selections) return [];

    return (selections as unknown as SelectionWithItems[]).map((s) => ({
      id: s.id,
      customerId: s.customer_id,
      name: s.name,
      status: s.status,
      source: s.source || undefined,
      vendor: s.vendor_id || undefined,
      isPublished: s.is_published,
      isVisibleToCustomer: s.is_visible_to_customer,
      version: s.version,
      marketCycle: s.market_cycle_year && s.market_cycle_month
        ? { year: s.market_cycle_year, month: s.market_cycle_month }
        : undefined,
      sourceEventId: s.source_event_id || undefined,
      sourceYear: s.source_year || undefined,
      marketMonth: s.market_cycle_month || undefined,
      items: (s.selection_items || []).map((item) => ({
        id: item.id,
        sku: item.sku,
        name: item.name,
        imageUrl: item.image_url || undefined,
        qty: item.qty,
        displayQty: item.display_qty || undefined,
        backupQty: item.backup_qty || undefined,
        unitList: item.unit_list || 0,
        programDisc: item.program_disc || undefined,
        netUnit: item.net_unit || 0,
        extendedNet: item.extended_net || 0,
        notes: item.notes || undefined,
        tags: item.tags || undefined,
        collection: item.collection || undefined,
        year: item.year || undefined,
        configuration: item.configuration as SelectionItemData['configuration'] || undefined,
      })),
      metadata: s.metadata as Record<string, unknown> || undefined,
      createdAt: s.created_at,
      updatedAt: s.updated_at,
    }));
  } else {
    // Fall back to JSON - defer to existing store.ts implementation
    const { readJsonFile } = await getFileUtils();
    return await readJsonFile<SelectionData[]>('data/selections.json', []);
  }
}

export async function saveSelection(selection: SelectionData): Promise<void> {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseClient();

    // Insert/update selection
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: selectionError } = await (supabase as any)
      .from('selections')
      .upsert({
        id: selection.id,
        customer_id: selection.customerId,
        name: selection.name,
        status: selection.status,
        source: selection.source,
        vendor_id: selection.vendor,
        is_published: selection.isPublished,
        is_visible_to_customer: selection.isVisibleToCustomer,
        version: selection.version,
        market_cycle_year: selection.marketCycle?.year,
        market_cycle_month: selection.marketCycle?.month,
        source_event_id: selection.sourceEventId,
        source_year: selection.sourceYear,
        metadata: selection.metadata,
        created_at: selection.createdAt,
        updated_at: selection.updatedAt,
      });

    if (selectionError) throw selectionError;

    // Delete existing items and insert new ones
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('selection_items').delete().eq('selection_id', selection.id);

    if (selection.items.length > 0) {
      const itemsToInsert = selection.items.map((item, index) => ({
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

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: itemsError } = await (supabase as any)
        .from('selection_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;
    }
  } else {
    // JSON fallback - load all, update, save
    const { readJsonFile, writeJsonFile } = await getFileUtils();
    const selections = await readJsonFile<SelectionData[]>('data/selections.json', []);
    const index = selections.findIndex((s) => s.id === selection.id);

    if (index >= 0) {
      selections[index] = selection;
    } else {
      selections.push(selection);
    }

    await writeJsonFile('data/selections.json', selections);
  }
}

export async function deleteSelection(selectionId: string): Promise<void> {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from('selections').delete().eq('id', selectionId);
    if (error) throw error;
  } else {
    const { readJsonFile, writeJsonFile } = await getFileUtils();
    const selections = await readJsonFile<SelectionData[]>('data/selections.json', []);
    const filtered = selections.filter((s) => s.id !== selectionId);
    await writeJsonFile('data/selections.json', filtered);
  }
}

// ============================================
// SETTINGS
// ============================================

export type SettingsData = {
  currentMarketCycle: { year: number; month: 'January' | 'June' };
  updatedAt: string;
};

export async function loadSettings(): Promise<SettingsData> {
  const defaults: SettingsData = {
    currentMarketCycle: { year: 2026, month: 'January' },
    updatedAt: new Date().toISOString(),
  };

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseClient();
    type SettingsRow = Database['public']['Tables']['settings']['Row'];
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .eq('id', 'global')
      .single() as { data: SettingsRow | null; error: Error | null };

    if (error || !data) return defaults;

    return {
      currentMarketCycle: {
        year: data.current_market_cycle_year || 2026,
        month: data.current_market_cycle_month || 'January',
      },
      updatedAt: data.updated_at,
    };
  } else {
    const { readJsonFile } = await getFileUtils();
    return await readJsonFile<SettingsData>('data/settings.json', defaults);
  }
}

export async function saveSettings(settings: SettingsData): Promise<void> {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('settings').upsert({
      id: 'global',
      current_market_cycle_year: settings.currentMarketCycle.year,
      current_market_cycle_month: settings.currentMarketCycle.month,
      updated_at: settings.updatedAt,
    });
  } else {
    const { writeJsonFile } = await getFileUtils();
    await writeJsonFile('data/settings.json', settings);
  }
}

// ============================================
// PROMOTIONS
// ============================================

export type PromotionData = {
  id: string;
  vendorId?: string;
  name: string;
  description?: string;
  active: boolean;
  startDate?: string;
  endDate?: string;
  skuTiers?: Array<{ minQty: number; discount: number; name?: string }>;
  dollarTiers?: Array<{ minAmount: number; discount: number; name?: string }>;
  inventoryIncentive?: { enabled: boolean; displayQtyThreshold: number; backupDiscountPercent: number };
  portableIncentive?: { enabled: boolean; discountPercent: number; skuPrefixes: string[] };
  summaryTitle?: string;
  summaryBody?: string;
  headlineBenefit?: string;
  summaryBullets?: string[];
  pdfUrl?: string;
  termsAndConditions?: string;
  createdAt: string;
  updatedAt: string;
};

export async function loadPromotions(): Promise<PromotionData[]> {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseClient();
    type PromotionRow = Database['public']['Tables']['promotions']['Row'];
    const { data, error } = await supabase
      .from('promotions')
      .select('*')
      .eq('active', true) as { data: PromotionRow[] | null; error: Error | null };

    if (error) throw error;
    if (!data) return [];

    return data.map((p) => ({
      id: p.id,
      vendorId: p.vendor_id || undefined,
      name: p.name,
      description: p.description || undefined,
      active: p.active,
      startDate: p.start_date || undefined,
      endDate: p.end_date || undefined,
      skuTiers: p.sku_tiers as PromotionData['skuTiers'],
      dollarTiers: p.dollar_tiers as PromotionData['dollarTiers'],
      inventoryIncentive: p.inventory_incentive as PromotionData['inventoryIncentive'],
      portableIncentive: p.portable_incentive as PromotionData['portableIncentive'],
      summaryTitle: p.summary_title || undefined,
      summaryBody: p.summary_body || undefined,
      headlineBenefit: p.headline_benefit || undefined,
      summaryBullets: p.summary_bullets || undefined,
      pdfUrl: p.pdf_url || undefined,
      termsAndConditions: p.terms_and_conditions || undefined,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    }));
  } else {
    const { readJsonFile } = await getFileUtils();
    return await readJsonFile<PromotionData[]>('data/promotions.json', []);
  }
}

// ============================================
// EXPORT UTILITY
// ============================================

export const dataClient = {
  isSupabaseConfigured,
  customers: {
    load: loadCustomers,
    find: findCustomer,
    update: updateCustomer,
    resetCache: resetCustomersCache,
  },
  vendors: {
    load: loadVendors,
  },
  products: {
    load: loadProducts,
  },
  selections: {
    load: loadSelections,
    save: saveSelection,
    delete: deleteSelection,
  },
  settings: {
    load: loadSettings,
    save: saveSettings,
  },
  promotions: {
    load: loadPromotions,
  },
};

export default dataClient;
