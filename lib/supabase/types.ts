export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      vendors: {
        Row: {
          id: string;
          name: string;
          display_name: string;
          logo_url: string | null;
          description: string | null;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name: string;
          display_name: string;
          logo_url?: string | null;
          description?: string | null;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          display_name?: string;
          logo_url?: string | null;
          description?: string | null;
          active?: boolean;
          updated_at?: string;
        };
      };
      customers: {
        Row: {
          id: string;
          name: string;
          city: string | null;
          region: string | null;
          slug: string | null;
          requires_auth: boolean;
          logo_url: string | null;
          influence_tier: 'A' | 'B' | 'C' | null;
          influence_weight: number | null;
          target_pieces: number | null;
          target_dollars: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name: string;
          city?: string | null;
          region?: string | null;
          slug?: string | null;
          requires_auth?: boolean;
          logo_url?: string | null;
          influence_tier?: 'A' | 'B' | 'C' | null;
          influence_weight?: number | null;
          target_pieces?: number | null;
          target_dollars?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          city?: string | null;
          region?: string | null;
          slug?: string | null;
          requires_auth?: boolean;
          logo_url?: string | null;
          influence_tier?: 'A' | 'B' | 'C' | null;
          influence_weight?: number | null;
          target_pieces?: number | null;
          target_dollars?: number | null;
          updated_at?: string;
        };
      };
      customer_vendors: {
        Row: {
          customer_id: string;
          vendor_id: string;
        };
        Insert: {
          customer_id: string;
          vendor_id: string;
        };
        Update: {
          customer_id?: string;
          vendor_id?: string;
        };
      };
      products: {
        Row: {
          sku: string;
          name: string;
          vendor_id: string | null;
          collection_name: string | null;
          year: number | null;
          list_price: number | null;
          map_price: number | null;
          description: string | null;
          image_url: string | null;
          finish: string | null;
          base_item_code: string | null;
          is_configurable: boolean;
          specifications: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          sku: string;
          name: string;
          vendor_id?: string | null;
          collection_name?: string | null;
          year?: number | null;
          list_price?: number | null;
          map_price?: number | null;
          description?: string | null;
          image_url?: string | null;
          finish?: string | null;
          base_item_code?: string | null;
          is_configurable?: boolean;
          specifications?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          sku?: string;
          name?: string;
          vendor_id?: string | null;
          collection_name?: string | null;
          year?: number | null;
          list_price?: number | null;
          map_price?: number | null;
          description?: string | null;
          image_url?: string | null;
          finish?: string | null;
          base_item_code?: string | null;
          is_configurable?: boolean;
          specifications?: Json | null;
          updated_at?: string;
        };
      };
      product_variants: {
        Row: {
          id: string;
          product_sku: string;
          variant_sku: string;
          option_combination: Json;
          price_override: number | null;
          image_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_sku: string;
          variant_sku: string;
          option_combination: Json;
          price_override?: number | null;
          image_url?: string | null;
          created_at?: string;
        };
        Update: {
          product_sku?: string;
          variant_sku?: string;
          option_combination?: Json;
          price_override?: number | null;
          image_url?: string | null;
        };
      };
      configurator_options: {
        Row: {
          id: string;
          product_sku: string;
          option_name: string;
          option_type: string;
          values: Json;
          required: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_sku: string;
          option_name: string;
          option_type: string;
          values: Json;
          required?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          product_sku?: string;
          option_name?: string;
          option_type?: string;
          values?: Json;
          required?: boolean;
          sort_order?: number;
        };
      };
      selections: {
        Row: {
          id: string;
          customer_id: string;
          name: string;
          status: 'snapshot' | 'working' | 'archived';
          source: 'manual' | 'dallas' | null;
          vendor_id: string | null;
          is_published: boolean;
          is_visible_to_customer: boolean;
          version: number;
          market_cycle_year: number | null;
          market_cycle_month: 'January' | 'June' | null;
          source_event_id: string | null;
          source_year: number | null;
          metadata: Json | null;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          updated_by: string | null;
        };
        Insert: {
          id?: string;
          customer_id: string;
          name: string;
          status: 'snapshot' | 'working' | 'archived';
          source?: 'manual' | 'dallas' | null;
          vendor_id?: string | null;
          is_published?: boolean;
          is_visible_to_customer?: boolean;
          version?: number;
          market_cycle_year?: number | null;
          market_cycle_month?: 'January' | 'June' | null;
          source_event_id?: string | null;
          source_year?: number | null;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          updated_by?: string | null;
        };
        Update: {
          customer_id?: string;
          name?: string;
          status?: 'snapshot' | 'working' | 'archived';
          source?: 'manual' | 'dallas' | null;
          vendor_id?: string | null;
          is_published?: boolean;
          is_visible_to_customer?: boolean;
          version?: number;
          market_cycle_year?: number | null;
          market_cycle_month?: 'January' | 'June' | null;
          source_event_id?: string | null;
          source_year?: number | null;
          metadata?: Json | null;
          updated_at?: string;
          updated_by?: string | null;
        };
      };
      selection_items: {
        Row: {
          id: string;
          selection_id: string;
          sku: string;
          name: string;
          image_url: string | null;
          qty: number;
          display_qty: number;
          backup_qty: number;
          unit_list: number | null;
          program_disc: number;
          net_unit: number | null;
          extended_net: number | null;
          notes: string | null;
          tags: string[] | null;
          collection: string | null;
          year: number | null;
          configuration: Json | null;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          selection_id: string;
          sku: string;
          name: string;
          image_url?: string | null;
          qty?: number;
          display_qty?: number;
          backup_qty?: number;
          unit_list?: number | null;
          program_disc?: number;
          net_unit?: number | null;
          extended_net?: number | null;
          notes?: string | null;
          tags?: string[] | null;
          collection?: string | null;
          year?: number | null;
          configuration?: Json | null;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          selection_id?: string;
          sku?: string;
          name?: string;
          image_url?: string | null;
          qty?: number;
          display_qty?: number;
          backup_qty?: number;
          unit_list?: number | null;
          program_disc?: number;
          net_unit?: number | null;
          extended_net?: number | null;
          notes?: string | null;
          tags?: string[] | null;
          collection?: string | null;
          year?: number | null;
          configuration?: Json | null;
          sort_order?: number;
          updated_at?: string;
        };
      };
      promotions: {
        Row: {
          id: string;
          vendor_id: string | null;
          name: string;
          description: string | null;
          active: boolean;
          start_date: string | null;
          end_date: string | null;
          sku_tiers: Json | null;
          dollar_tiers: Json | null;
          inventory_incentive: Json | null;
          portable_incentive: Json | null;
          summary_title: string | null;
          summary_body: string | null;
          headline_benefit: string | null;
          summary_bullets: string[] | null;
          pdf_url: string | null;
          terms_and_conditions: string | null;
          uploaded_promotion_url: string | null;
          uploaded_promotion_type: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          vendor_id?: string | null;
          name: string;
          description?: string | null;
          active?: boolean;
          start_date?: string | null;
          end_date?: string | null;
          sku_tiers?: Json | null;
          dollar_tiers?: Json | null;
          inventory_incentive?: Json | null;
          portable_incentive?: Json | null;
          summary_title?: string | null;
          summary_body?: string | null;
          headline_benefit?: string | null;
          summary_bullets?: string[] | null;
          pdf_url?: string | null;
          terms_and_conditions?: string | null;
          uploaded_promotion_url?: string | null;
          uploaded_promotion_type?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          vendor_id?: string | null;
          name?: string;
          description?: string | null;
          active?: boolean;
          start_date?: string | null;
          end_date?: string | null;
          sku_tiers?: Json | null;
          dollar_tiers?: Json | null;
          inventory_incentive?: Json | null;
          portable_incentive?: Json | null;
          summary_title?: string | null;
          summary_body?: string | null;
          headline_benefit?: string | null;
          summary_bullets?: string[] | null;
          pdf_url?: string | null;
          terms_and_conditions?: string | null;
          uploaded_promotion_url?: string | null;
          uploaded_promotion_type?: string | null;
          updated_at?: string;
        };
      };
      promotion_configs: {
        Row: {
          id: string;
          customer_id: string;
          vendor_id: string | null;
          name: string;
          market_cycle_year: number | null;
          market_cycle_month: 'January' | 'June' | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          customer_id: string;
          vendor_id?: string | null;
          name: string;
          market_cycle_year?: number | null;
          market_cycle_month?: 'January' | 'June' | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          customer_id?: string;
          vendor_id?: string | null;
          name?: string;
          market_cycle_year?: number | null;
          market_cycle_month?: 'January' | 'June' | null;
          updated_at?: string;
        };
      };
      presentations: {
        Row: {
          id: string;
          promotion_config_id: string;
          name: string;
          is_active: boolean;
          presentation_items: Json | null;
          collections: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          promotion_config_id: string;
          name: string;
          is_active?: boolean;
          presentation_items?: Json | null;
          collections?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          promotion_config_id?: string;
          name?: string;
          is_active?: boolean;
          presentation_items?: Json | null;
          collections?: Json | null;
          updated_at?: string;
        };
      };
      collection_media: {
        Row: {
          id: string;
          vendor_id: string | null;
          collection_name: string;
          media_type: 'youtube' | 'mp4' | 'photos' | 'immersive-slideshow' | null;
          youtube_url: string | null;
          youtube_start_time: number | null;
          mp4_url: string | null;
          mp4_start_time: number | null;
          photos: Json | null;
          immersive_config: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          vendor_id?: string | null;
          collection_name: string;
          media_type?: 'youtube' | 'mp4' | 'photos' | 'immersive-slideshow' | null;
          youtube_url?: string | null;
          youtube_start_time?: number | null;
          mp4_url?: string | null;
          mp4_start_time?: number | null;
          photos?: Json | null;
          immersive_config?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          vendor_id?: string | null;
          collection_name?: string;
          media_type?: 'youtube' | 'mp4' | 'photos' | 'immersive-slideshow' | null;
          youtube_url?: string | null;
          youtube_start_time?: number | null;
          mp4_url?: string | null;
          mp4_start_time?: number | null;
          photos?: Json | null;
          immersive_config?: Json | null;
          updated_at?: string;
        };
      };
      settings: {
        Row: {
          id: string;
          current_market_cycle_year: number | null;
          current_market_cycle_month: 'January' | 'June' | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          current_market_cycle_year?: number | null;
          current_market_cycle_month?: 'January' | 'June' | null;
          updated_at?: string;
        };
        Update: {
          current_market_cycle_year?: number | null;
          current_market_cycle_month?: 'January' | 'June' | null;
          updated_at?: string;
        };
      };
      displays: {
        Row: {
          id: string;
          customer_id: string;
          sku: string;
          installed_at: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          customer_id: string;
          sku: string;
          installed_at?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          customer_id?: string;
          sku?: string;
          installed_at?: string | null;
          notes?: string | null;
          updated_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

// Convenience types for common operations
export type Vendor = Database['public']['Tables']['vendors']['Row'];
export type Customer = Database['public']['Tables']['customers']['Row'];
export type Product = Database['public']['Tables']['products']['Row'];
export type Selection = Database['public']['Tables']['selections']['Row'];
export type SelectionItem = Database['public']['Tables']['selection_items']['Row'];
export type Promotion = Database['public']['Tables']['promotions']['Row'];
export type PromotionConfig = Database['public']['Tables']['promotion_configs']['Row'];
export type Presentation = Database['public']['Tables']['presentations']['Row'];
export type CollectionMedia = Database['public']['Tables']['collection_media']['Row'];
export type Settings = Database['public']['Tables']['settings']['Row'];
export type Display = Database['public']['Tables']['displays']['Row'];
