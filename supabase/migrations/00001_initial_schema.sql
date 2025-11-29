-- Curated Presentation Database Schema
-- Run this in Supabase SQL Editor to create all tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- VENDORS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS vendors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  logo_url TEXT,
  description TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CUSTOMERS TABLE (Dealers)
-- ============================================
CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT,
  region TEXT,
  slug TEXT UNIQUE,
  requires_auth BOOLEAN DEFAULT false,
  logo_url TEXT,
  influence_tier TEXT CHECK (influence_tier IN ('A', 'B', 'C')),
  influence_weight NUMERIC,
  target_pieces INTEGER,
  target_dollars NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customer authorized vendors (many-to-many)
CREATE TABLE IF NOT EXISTS customer_vendors (
  customer_id TEXT REFERENCES customers(id) ON DELETE CASCADE,
  vendor_id TEXT REFERENCES vendors(id) ON DELETE CASCADE,
  PRIMARY KEY (customer_id, vendor_id)
);

-- ============================================
-- PRODUCTS TABLE (Unified Catalog)
-- ============================================
CREATE TABLE IF NOT EXISTS products (
  sku TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  vendor_id TEXT REFERENCES vendors(id),
  collection_name TEXT,
  year INTEGER,
  list_price NUMERIC, -- WSP price
  map_price NUMERIC,
  description TEXT,
  image_url TEXT,
  finish TEXT,
  base_item_code TEXT,
  is_configurable BOOLEAN DEFAULT false,
  specifications JSONB, -- Flexible specs storage
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_vendor ON products(vendor_id);
CREATE INDEX IF NOT EXISTS idx_products_collection ON products(collection_name);
CREATE INDEX IF NOT EXISTS idx_products_year ON products(year);

-- Product variants (for configurable products)
CREATE TABLE IF NOT EXISTS product_variants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_sku TEXT REFERENCES products(sku) ON DELETE CASCADE,
  variant_sku TEXT NOT NULL,
  option_combination JSONB NOT NULL, -- {"finish": "07", "accent": "84"}
  price_override NUMERIC,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_variants_product ON product_variants(product_sku);

-- Configurator options (for products like Hubbardton)
CREATE TABLE IF NOT EXISTS configurator_options (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_sku TEXT REFERENCES products(sku) ON DELETE CASCADE,
  option_name TEXT NOT NULL, -- "Finish", "Accent Finish", "Glass"
  option_type TEXT NOT NULL, -- "swatch", "dropdown", etc.
  values JSONB NOT NULL, -- Array of {code, name, swatch_url}
  required BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_config_options_product ON configurator_options(product_sku);

-- ============================================
-- SELECTIONS TABLE (Customer Product Picks)
-- ============================================
CREATE TABLE IF NOT EXISTS selections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id TEXT REFERENCES customers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('snapshot', 'working', 'archived')),
  source TEXT CHECK (source IN ('manual', 'dallas')),
  vendor_id TEXT REFERENCES vendors(id),
  is_published BOOLEAN DEFAULT false,
  is_visible_to_customer BOOLEAN DEFAULT false,
  version INTEGER DEFAULT 1,
  market_cycle_year INTEGER,
  market_cycle_month TEXT CHECK (market_cycle_month IN ('January', 'June')),
  source_event_id TEXT,
  source_year INTEGER,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,
  updated_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_selections_customer ON selections(customer_id);
CREATE INDEX IF NOT EXISTS idx_selections_vendor ON selections(vendor_id);
CREATE INDEX IF NOT EXISTS idx_selections_status ON selections(status);
CREATE INDEX IF NOT EXISTS idx_selections_market_cycle ON selections(market_cycle_year, market_cycle_month);

-- Selection items (line items in a selection)
CREATE TABLE IF NOT EXISTS selection_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  selection_id UUID REFERENCES selections(id) ON DELETE CASCADE,
  sku TEXT NOT NULL,
  name TEXT NOT NULL,
  image_url TEXT,
  qty INTEGER DEFAULT 0,
  display_qty INTEGER DEFAULT 0,
  backup_qty INTEGER DEFAULT 0,
  unit_list NUMERIC, -- WSP price
  program_disc NUMERIC DEFAULT 0, -- 0-1 discount
  net_unit NUMERIC,
  extended_net NUMERIC,
  notes TEXT,
  tags TEXT[],
  collection TEXT,
  year INTEGER,
  configuration JSONB, -- {baseItemCode, variantSku, options, productName}
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_selection_items_selection ON selection_items(selection_id);
CREATE INDEX IF NOT EXISTS idx_selection_items_sku ON selection_items(sku);

-- ============================================
-- PROMOTIONS TABLE (Incentive Programs)
-- ============================================
CREATE TABLE IF NOT EXISTS promotions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor_id TEXT REFERENCES vendors(id),
  name TEXT NOT NULL,
  description TEXT,
  active BOOLEAN DEFAULT true,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  sku_tiers JSONB, -- [{minQty, discount, name}]
  dollar_tiers JSONB, -- [{minAmount, discount, name}]
  inventory_incentive JSONB, -- {enabled, displayQtyThreshold, backupDiscountPercent}
  portable_incentive JSONB, -- {enabled, discountPercent, skuPrefixes[]}
  summary_title TEXT,
  summary_body TEXT,
  headline_benefit TEXT,
  summary_bullets TEXT[],
  pdf_url TEXT,
  terms_and_conditions TEXT,
  uploaded_promotion_url TEXT,
  uploaded_promotion_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_promotions_vendor ON promotions(vendor_id);
CREATE INDEX IF NOT EXISTS idx_promotions_active ON promotions(active);

-- ============================================
-- PROMOTION CONFIGS (Per-customer presentation setup)
-- ============================================
CREATE TABLE IF NOT EXISTS promotion_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id TEXT REFERENCES customers(id) ON DELETE CASCADE,
  vendor_id TEXT REFERENCES vendors(id),
  name TEXT NOT NULL,
  market_cycle_year INTEGER,
  market_cycle_month TEXT CHECK (market_cycle_month IN ('January', 'June')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_promo_configs_customer ON promotion_configs(customer_id);
CREATE INDEX IF NOT EXISTS idx_promo_configs_vendor ON promotion_configs(vendor_id);

-- Presentations (multiple per promotion config)
CREATE TABLE IF NOT EXISTS presentations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  promotion_config_id UUID REFERENCES promotion_configs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  presentation_items JSONB, -- Array of item configs
  collections JSONB, -- Array of collection selections
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_presentations_config ON presentations(promotion_config_id);

-- ============================================
-- COLLECTION MEDIA
-- ============================================
CREATE TABLE IF NOT EXISTS collection_media (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor_id TEXT REFERENCES vendors(id),
  collection_name TEXT NOT NULL,
  media_type TEXT CHECK (media_type IN ('youtube', 'mp4', 'photos', 'immersive-slideshow')),
  youtube_url TEXT,
  youtube_start_time INTEGER,
  mp4_url TEXT,
  mp4_start_time INTEGER,
  photos JSONB, -- Array of photo URLs
  immersive_config JSONB, -- Slideshow configuration
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(vendor_id, collection_name)
);

CREATE INDEX IF NOT EXISTS idx_collection_media_vendor ON collection_media(vendor_id);

-- ============================================
-- APP SETTINGS
-- ============================================
CREATE TABLE IF NOT EXISTS settings (
  id TEXT PRIMARY KEY DEFAULT 'global',
  current_market_cycle_year INTEGER,
  current_market_cycle_month TEXT CHECK (current_market_cycle_month IN ('January', 'June')),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- DISPLAYS (Display unit tracking)
-- ============================================
CREATE TABLE IF NOT EXISTS displays (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id TEXT REFERENCES customers(id) ON DELETE CASCADE,
  sku TEXT NOT NULL,
  installed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_displays_customer ON displays(customer_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS) Policies
-- ============================================

-- Enable RLS on all tables
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE configurator_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE selections ENABLE ROW LEVEL SECURITY;
ALTER TABLE selection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotion_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE presentations ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE displays ENABLE ROW LEVEL SECURITY;

-- Public read access for catalog data
CREATE POLICY "Public read vendors" ON vendors FOR SELECT USING (true);
CREATE POLICY "Public read products" ON products FOR SELECT USING (true);
CREATE POLICY "Public read product_variants" ON product_variants FOR SELECT USING (true);
CREATE POLICY "Public read configurator_options" ON configurator_options FOR SELECT USING (true);
CREATE POLICY "Public read collection_media" ON collection_media FOR SELECT USING (true);
CREATE POLICY "Public read promotions" ON promotions FOR SELECT USING (active = true);
CREATE POLICY "Public read settings" ON settings FOR SELECT USING (true);

-- Customer data policies (authenticated or service role)
CREATE POLICY "Service role customers" ON customers FOR ALL USING (true);
CREATE POLICY "Service role customer_vendors" ON customer_vendors FOR ALL USING (true);
CREATE POLICY "Service role selections" ON selections FOR ALL USING (true);
CREATE POLICY "Service role selection_items" ON selection_items FOR ALL USING (true);
CREATE POLICY "Service role promotion_configs" ON promotion_configs FOR ALL USING (true);
CREATE POLICY "Service role presentations" ON presentations FOR ALL USING (true);
CREATE POLICY "Service role displays" ON displays FOR ALL USING (true);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at
CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON vendors FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_selections_updated_at BEFORE UPDATE ON selections FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_selection_items_updated_at BEFORE UPDATE ON selection_items FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_promotions_updated_at BEFORE UPDATE ON promotions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_promotion_configs_updated_at BEFORE UPDATE ON promotion_configs FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_presentations_updated_at BEFORE UPDATE ON presentations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_collection_media_updated_at BEFORE UPDATE ON collection_media FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_displays_updated_at BEFORE UPDATE ON displays FOR EACH ROW EXECUTE FUNCTION update_updated_at();
