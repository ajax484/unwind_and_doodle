export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: Database["public"]["Enums"]["audit_action"];
          actor_id: string | null;
          after_data: Json | null;
          before_data: Json | null;
          created_at: string;
          entity_id: string;
          entity_type: string;
          id: string;
          organization_id: string;
        };
        Insert: {
          action: Database["public"]["Enums"]["audit_action"];
          actor_id?: string | null;
          after_data?: Json | null;
          before_data?: Json | null;
          created_at?: string;
          entity_id: string;
          entity_type: string;
          id?: string;
          organization_id: string;
        };
        Update: {
          action?: Database["public"]["Enums"]["audit_action"];
          actor_id?: string | null;
          after_data?: Json | null;
          before_data?: Json | null;
          created_at?: string;
          entity_id?: string;
          entity_type?: string;
          id?: string;
          organization_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "audit_logs_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      bundle_items: {
        Row: {
          bundle_product_id: string;
          component_product_id: string;
          created_at: string;
          id: string;
          quantity: number;
        };
        Insert: {
          bundle_product_id: string;
          component_product_id: string;
          created_at?: string;
          id?: string;
          quantity?: number;
        };
        Update: {
          bundle_product_id?: string;
          component_product_id?: string;
          created_at?: string;
          id?: string;
          quantity?: number;
        };
        Relationships: [
          {
            foreignKeyName: "bundle_items_bundle_product_id_fkey";
            columns: ["bundle_product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bundle_items_component_product_id_fkey";
            columns: ["component_product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      cart_items: {
        Row: {
          cart_id: string;
          created_at: string;
          customization_data: Json | null;
          id: string;
          product_id: string;
          quantity: number;
          updated_at: string;
        };
        Insert: {
          cart_id: string;
          created_at?: string;
          customization_data?: Json | null;
          id?: string;
          product_id: string;
          quantity: number;
          updated_at?: string;
        };
        Update: {
          cart_id?: string;
          created_at?: string;
          customization_data?: Json | null;
          id?: string;
          product_id?: string;
          quantity?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cart_items_cart_id_fkey";
            columns: ["cart_id"];
            isOneToOne: false;
            referencedRelation: "carts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cart_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      carts: {
        Row: {
          created_at: string;
          customer_id: string | null;
          expires_at: string | null;
          id: string;
          organization_id: string;
          session_id: string | null;
          status: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          customer_id?: string | null;
          expires_at?: string | null;
          id?: string;
          organization_id: string;
          session_id?: string | null;
          status?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          customer_id?: string | null;
          expires_at?: string | null;
          id?: string;
          organization_id?: string;
          session_id?: string | null;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "carts_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "carts_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      categories: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          organization_id: string;
          slug: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          organization_id: string;
          slug: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          organization_id?: string;
          slug?: string;
        };
        Relationships: [
          {
            foreignKeyName: "categories_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      checkout_sessions: {
        Row: {
          cart_id: string | null;
          created_at: string;
          customer_id: string | null;
          discount_code: string | null;
          discount_id: string | null;
          discount_total: number;
          email: string;
          expires_at: string | null;
          first_name: string | null;
          id: string;
          last_name: string | null;
          location_id: string | null;
          organization_id: string;
          phone: string | null;
          shipping_address: Json;
          shipping_fee: number;
          status: Database["public"]["Enums"]["checkout_status"];
          subtotal: number;
          total: number;
          updated_at: string;
          warehouse_id: string | null;
          whatsapp_number: string | null;
        };
        Insert: {
          cart_id?: string | null;
          created_at?: string;
          customer_id?: string | null;
          discount_code?: string | null;
          discount_id?: string | null;
          discount_total?: number;
          email: string;
          expires_at?: string | null;
          first_name?: string | null;
          id?: string;
          last_name?: string | null;
          location_id?: string | null;
          organization_id: string;
          phone?: string | null;
          shipping_address: Json;
          shipping_fee?: number;
          status?: Database["public"]["Enums"]["checkout_status"];
          subtotal?: number;
          total?: number;
          updated_at?: string;
          warehouse_id?: string | null;
          whatsapp_number?: string | null;
        };
        Update: {
          cart_id?: string | null;
          created_at?: string;
          customer_id?: string | null;
          discount_code?: string | null;
          discount_id?: string | null;
          discount_total?: number;
          email?: string;
          expires_at?: string | null;
          first_name?: string | null;
          id?: string;
          last_name?: string | null;
          location_id?: string | null;
          organization_id?: string;
          phone?: string | null;
          shipping_address?: Json;
          shipping_fee?: number;
          status?: Database["public"]["Enums"]["checkout_status"];
          subtotal?: number;
          total?: number;
          updated_at?: string;
          warehouse_id?: string | null;
          whatsapp_number?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "checkout_sessions_cart_id_fkey";
            columns: ["cart_id"];
            isOneToOne: false;
            referencedRelation: "carts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "checkout_sessions_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "checkout_sessions_discount_id_fkey";
            columns: ["discount_id"];
            isOneToOne: false;
            referencedRelation: "discounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "checkout_sessions_location_id_fkey";
            columns: ["location_id"];
            isOneToOne: false;
            referencedRelation: "locations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "checkout_sessions_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "checkout_sessions_warehouse_id_fkey";
            columns: ["warehouse_id"];
            isOneToOne: false;
            referencedRelation: "warehouses";
            referencedColumns: ["id"];
          },
        ];
      };
      customer_addresses: {
        Row: {
          address_line_1: string;
          address_line_2: string | null;
          created_at: string;
          customer_id: string;
          id: string;
          is_default: boolean;
          lga: string | null;
          location_id: string | null;
          phone: string;
          recipient_name: string;
          state: string;
          updated_at: string;
        };
        Insert: {
          address_line_1: string;
          address_line_2?: string | null;
          created_at?: string;
          customer_id: string;
          id?: string;
          is_default?: boolean;
          lga?: string | null;
          location_id?: string | null;
          phone: string;
          recipient_name: string;
          state: string;
          updated_at?: string;
        };
        Update: {
          address_line_1?: string;
          address_line_2?: string | null;
          created_at?: string;
          customer_id?: string;
          id?: string;
          is_default?: boolean;
          lga?: string | null;
          location_id?: string | null;
          phone?: string;
          recipient_name?: string;
          state?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "customer_addresses_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "customer_addresses_location_id_fkey";
            columns: ["location_id"];
            isOneToOne: false;
            referencedRelation: "locations";
            referencedColumns: ["id"];
          },
        ];
      };
      customers: {
        Row: {
          created_at: string;
          email: string;
          email_marketing_consent: boolean;
          email_verified_at: string | null;
          first_name: string | null;
          id: string;
          last_name: string | null;
          organization_id: string;
          phone: string | null;
          updated_at: string;
          user_id: string | null;
          whatsapp_marketing_consent: boolean;
          whatsapp_number: string | null;
        };
        Insert: {
          created_at?: string;
          email: string;
          email_marketing_consent?: boolean;
          email_verified_at?: string | null;
          first_name?: string | null;
          id?: string;
          last_name?: string | null;
          organization_id: string;
          phone?: string | null;
          updated_at?: string;
          user_id?: string | null;
          whatsapp_marketing_consent?: boolean;
          whatsapp_number?: string | null;
        };
        Update: {
          created_at?: string;
          email?: string;
          email_marketing_consent?: boolean;
          email_verified_at?: string | null;
          first_name?: string | null;
          id?: string;
          last_name?: string | null;
          organization_id?: string;
          phone?: string | null;
          updated_at?: string;
          user_id?: string | null;
          whatsapp_marketing_consent?: boolean;
          whatsapp_number?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "customers_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      customization_assets: {
        Row: {
          created_at: string;
          customization_id: string;
          file_size: number | null;
          id: string;
          mime_type: string | null;
          original_filename: string;
          processed_storage_path: string | null;
          storage_path: string;
        };
        Insert: {
          created_at?: string;
          customization_id: string;
          file_size?: number | null;
          id?: string;
          mime_type?: string | null;
          original_filename: string;
          processed_storage_path?: string | null;
          storage_path: string;
        };
        Update: {
          created_at?: string;
          customization_id?: string;
          file_size?: number | null;
          id?: string;
          mime_type?: string | null;
          original_filename?: string;
          processed_storage_path?: string | null;
          storage_path?: string;
        };
        Relationships: [
          {
            foreignKeyName: "customization_assets_customization_id_fkey";
            columns: ["customization_id"];
            isOneToOne: false;
            referencedRelation: "customizations";
            referencedColumns: ["id"];
          },
        ];
      };
      customizations: {
        Row: {
          completed_at: string | null;
          created_at: string;
          id: string;
          order_item_id: string;
          status: Database["public"]["Enums"]["customization_status"];
        };
        Insert: {
          completed_at?: string | null;
          created_at?: string;
          id?: string;
          order_item_id: string;
          status?: Database["public"]["Enums"]["customization_status"];
        };
        Update: {
          completed_at?: string | null;
          created_at?: string;
          id?: string;
          order_item_id?: string;
          status?: Database["public"]["Enums"]["customization_status"];
        };
        Relationships: [
          {
            foreignKeyName: "customizations_order_item_id_fkey";
            columns: ["order_item_id"];
            isOneToOne: false;
            referencedRelation: "order_items";
            referencedColumns: ["id"];
          },
        ];
      };
      delivery_rates: {
        Row: {
          active: boolean;
          created_at: string;
          id: string;
          location_id: string;
          price: number;
          warehouse_id: string;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          id?: string;
          location_id: string;
          price: number;
          warehouse_id: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          id?: string;
          location_id?: string;
          price?: number;
          warehouse_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "delivery_rates_location_id_fkey";
            columns: ["location_id"];
            isOneToOne: false;
            referencedRelation: "locations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "delivery_rates_warehouse_id_fkey";
            columns: ["warehouse_id"];
            isOneToOne: false;
            referencedRelation: "warehouses";
            referencedColumns: ["id"];
          },
        ];
      };
      discount_categories: {
        Row: {
          category_id: string;
          discount_id: string;
        };
        Insert: {
          category_id: string;
          discount_id: string;
        };
        Update: {
          category_id?: string;
          discount_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "discount_categories_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "discount_categories_discount_id_fkey";
            columns: ["discount_id"];
            isOneToOne: false;
            referencedRelation: "discounts";
            referencedColumns: ["id"];
          },
        ];
      };
      discount_products: {
        Row: {
          discount_id: string;
          product_id: string;
        };
        Insert: {
          discount_id: string;
          product_id: string;
        };
        Update: {
          discount_id?: string;
          product_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "discount_products_discount_id_fkey";
            columns: ["discount_id"];
            isOneToOne: false;
            referencedRelation: "discounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "discount_products_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      discounts: {
        Row: {
          active: boolean;
          code: string;
          created_at: string;
          expires_at: string | null;
          id: string;
          minimum_order_amount: number | null;
          organization_id: string;
          starts_at: string | null;
          type: Database["public"]["Enums"]["discount_type"];
          updated_at: string;
          usage_count: number;
          usage_limit: number | null;
          value: number;
        };
        Insert: {
          active?: boolean;
          code: string;
          created_at?: string;
          expires_at?: string | null;
          id?: string;
          minimum_order_amount?: number | null;
          organization_id: string;
          starts_at?: string | null;
          type: Database["public"]["Enums"]["discount_type"];
          updated_at?: string;
          usage_count?: number;
          usage_limit?: number | null;
          value?: number;
        };
        Update: {
          active?: boolean;
          code?: string;
          created_at?: string;
          expires_at?: string | null;
          id?: string;
          minimum_order_amount?: number | null;
          organization_id?: string;
          starts_at?: string | null;
          type?: Database["public"]["Enums"]["discount_type"];
          updated_at?: string;
          usage_count?: number;
          usage_limit?: number | null;
          value?: number;
        };
        Relationships: [
          {
            foreignKeyName: "discounts_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      domain_events: {
        Row: {
          aggregate_id: string;
          aggregate_type: string;
          created_at: string;
          event_type: string;
          id: string;
          organization_id: string;
          payload: Json;
          processed_at: string | null;
        };
        Insert: {
          aggregate_id: string;
          aggregate_type: string;
          created_at?: string;
          event_type: string;
          id?: string;
          organization_id: string;
          payload: Json;
          processed_at?: string | null;
        };
        Update: {
          aggregate_id?: string;
          aggregate_type?: string;
          created_at?: string;
          event_type?: string;
          id?: string;
          organization_id?: string;
          payload?: Json;
          processed_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "domain_events_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      inventory: {
        Row: {
          id: string;
          product_id: string;
          quantity: number;
          reserved_quantity: number;
          updated_at: string;
          warehouse_id: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          quantity?: number;
          reserved_quantity?: number;
          updated_at?: string;
          warehouse_id: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          quantity?: number;
          reserved_quantity?: number;
          updated_at?: string;
          warehouse_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "inventory_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inventory_warehouse_id_fkey";
            columns: ["warehouse_id"];
            isOneToOne: false;
            referencedRelation: "warehouses";
            referencedColumns: ["id"];
          },
        ];
      };
      inventory_movements: {
        Row: {
          created_at: string;
          id: string;
          movement_type: Database["public"]["Enums"]["inventory_movement_type"];
          note: string | null;
          product_id: string;
          quantity: number;
          reference_id: string | null;
          warehouse_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          movement_type: Database["public"]["Enums"]["inventory_movement_type"];
          note?: string | null;
          product_id: string;
          quantity: number;
          reference_id?: string | null;
          warehouse_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          movement_type?: Database["public"]["Enums"]["inventory_movement_type"];
          note?: string | null;
          product_id?: string;
          quantity?: number;
          reference_id?: string | null;
          warehouse_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "inventory_movements_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inventory_movements_warehouse_id_fkey";
            columns: ["warehouse_id"];
            isOneToOne: false;
            referencedRelation: "warehouses";
            referencedColumns: ["id"];
          },
        ];
      };
      inventory_reservations: {
        Row: {
          committed_at: string | null;
          created_at: string;
          expires_at: string;
          id: string;
          inventory_id: string;
          order_id: string;
          quantity: number;
          released_at: string | null;
          status: Database["public"]["Enums"]["inventory_reservation_status"];
        };
        Insert: {
          committed_at?: string | null;
          created_at?: string;
          expires_at: string;
          id?: string;
          inventory_id: string;
          order_id: string;
          quantity: number;
          released_at?: string | null;
          status?: Database["public"]["Enums"]["inventory_reservation_status"];
        };
        Update: {
          committed_at?: string | null;
          created_at?: string;
          expires_at?: string;
          id?: string;
          inventory_id?: string;
          order_id?: string;
          quantity?: number;
          released_at?: string | null;
          status?: Database["public"]["Enums"]["inventory_reservation_status"];
        };
        Relationships: [
          {
            foreignKeyName: "inventory_reservations_inventory_id_fkey";
            columns: ["inventory_id"];
            isOneToOne: false;
            referencedRelation: "inventory";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inventory_reservations_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      locations: {
        Row: {
          created_at: string;
          id: string;
          lga: string | null;
          name: string;
          organization_id: string;
          state: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          lga?: string | null;
          name: string;
          organization_id: string;
          state: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          lga?: string | null;
          name?: string;
          organization_id?: string;
          state?: string;
        };
        Relationships: [
          {
            foreignKeyName: "locations_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      order_item_addons: {
        Row: {
          addon_product_id: string;
          created_at: string;
          id: string;
          order_item_id: string;
          product_name: string;
          quantity: number;
          sku: string | null;
          total: number;
          unit_price: number;
        };
        Insert: {
          addon_product_id: string;
          created_at?: string;
          id?: string;
          order_item_id: string;
          product_name: string;
          quantity: number;
          sku?: string | null;
          total: number;
          unit_price: number;
        };
        Update: {
          addon_product_id?: string;
          created_at?: string;
          id?: string;
          order_item_id?: string;
          product_name?: string;
          quantity?: number;
          sku?: string | null;
          total?: number;
          unit_price?: number;
        };
        Relationships: [
          {
            foreignKeyName: "order_item_addons_addon_product_id_fkey";
            columns: ["addon_product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_item_addons_order_item_id_fkey";
            columns: ["order_item_id"];
            isOneToOne: false;
            referencedRelation: "order_items";
            referencedColumns: ["id"];
          },
        ];
      };
      order_item_bundle_components: {
        Row: {
          component_product_id: string;
          created_at: string;
          id: string;
          order_item_id: string;
          product_name: string;
          quantity_per_bundle: number;
          sku: string | null;
          total_quantity: number;
          unit_cost_price: number;
        };
        Insert: {
          component_product_id: string;
          created_at?: string;
          id?: string;
          order_item_id: string;
          product_name: string;
          quantity_per_bundle: number;
          sku?: string | null;
          total_quantity: number;
          unit_cost_price?: number;
        };
        Update: {
          component_product_id?: string;
          created_at?: string;
          id?: string;
          order_item_id?: string;
          product_name?: string;
          quantity_per_bundle?: number;
          sku?: string | null;
          total_quantity?: number;
          unit_cost_price?: number;
        };
        Relationships: [
          {
            foreignKeyName: "order_item_bundle_components_order_item_fkey";
            columns: ["order_item_id"];
            isOneToOne: false;
            referencedRelation: "order_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_item_bundle_components_product_fkey";
            columns: ["component_product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      order_items: {
        Row: {
          created_at: string;
          id: string;
          order_id: string;
          product_id: string;
          product_name: string;
          quantity: number;
          sku: string | null;
          total: number;
          unit_price: number;
          warehouse_id: string | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          order_id: string;
          product_id: string;
          product_name: string;
          quantity: number;
          sku?: string | null;
          total: number;
          unit_price: number;
          warehouse_id?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          order_id?: string;
          product_id?: string;
          product_name?: string;
          quantity?: number;
          sku?: string | null;
          total?: number;
          unit_price?: number;
          warehouse_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_warehouse_id_fkey";
            columns: ["warehouse_id"];
            isOneToOne: false;
            referencedRelation: "warehouses";
            referencedColumns: ["id"];
          },
        ];
      };
      order_payment_requests: {
        Row: {
          amount: number;
          cancelled_at: string | null;
          created_at: string;
          created_by: string | null;
          currency: string;
          expires_at: string | null;
          id: string;
          order_id: string;
          organization_id: string;
          paid_at: string | null;
          sent_at: string | null;
          status: string;
          token: string;
          updated_at: string;
        };
        Insert: {
          amount: number;
          cancelled_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          currency?: string;
          expires_at?: string | null;
          id?: string;
          order_id: string;
          organization_id: string;
          paid_at?: string | null;
          sent_at?: string | null;
          status?: string;
          token: string;
          updated_at?: string;
        };
        Update: {
          amount?: number;
          cancelled_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          currency?: string;
          expires_at?: string | null;
          id?: string;
          order_id?: string;
          organization_id?: string;
          paid_at?: string | null;
          sent_at?: string | null;
          status?: string;
          token?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "order_payment_requests_order_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_payment_requests_organization_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      order_status_history: {
        Row: {
          changed_by: string | null;
          created_at: string;
          from_status: Database["public"]["Enums"]["order_status"] | null;
          id: string;
          note: string | null;
          order_id: string;
          to_status: Database["public"]["Enums"]["order_status"];
        };
        Insert: {
          changed_by?: string | null;
          created_at?: string;
          from_status?: Database["public"]["Enums"]["order_status"] | null;
          id?: string;
          note?: string | null;
          order_id: string;
          to_status: Database["public"]["Enums"]["order_status"];
        };
        Update: {
          changed_by?: string | null;
          created_at?: string;
          from_status?: Database["public"]["Enums"]["order_status"] | null;
          id?: string;
          note?: string | null;
          order_id?: string;
          to_status?: Database["public"]["Enums"]["order_status"];
        };
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      orders: {
        Row: {
          cancelled_at: string | null;
          confirmed_at: string | null;
          created_at: string;
          created_by: string | null;
          customer_id: string | null;
          discount_code: string | null;
          discount_id: string | null;
          discount_source: string | null;
          discount_total: number;
          email: string;
          first_name: string | null;
          id: string;
          idempotency_key: string | null;
          last_name: string | null;
          location_id: string | null;
          manual_order_channel: string | null;
          order_number: string;
          order_source: string;
          organization_id: string;
          phone: string | null;
          placed_at: string | null;
          received_at: string | null;
          refunded_at: string | null;
          shipped_at: string | null;
          shipping_address: Json;
          shipping_fee: number;
          status: Database["public"]["Enums"]["order_status"];
          subtotal: number;
          total: number;
          updated_at: string;
          warehouse_id: string | null;
          whatsapp_number: string | null;
        };
        Insert: {
          cancelled_at?: string | null;
          confirmed_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          customer_id?: string | null;
          discount_code?: string | null;
          discount_id?: string | null;
          discount_source?: string | null;
          discount_total?: number;
          email: string;
          first_name?: string | null;
          id?: string;
          idempotency_key?: string | null;
          last_name?: string | null;
          location_id?: string | null;
          manual_order_channel?: string | null;
          order_number: string;
          order_source?: string;
          organization_id: string;
          phone?: string | null;
          placed_at?: string | null;
          received_at?: string | null;
          refunded_at?: string | null;
          shipped_at?: string | null;
          shipping_address: Json;
          shipping_fee?: number;
          status?: Database["public"]["Enums"]["order_status"];
          subtotal?: number;
          total?: number;
          updated_at?: string;
          warehouse_id?: string | null;
          whatsapp_number?: string | null;
        };
        Update: {
          cancelled_at?: string | null;
          confirmed_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          customer_id?: string | null;
          discount_code?: string | null;
          discount_id?: string | null;
          discount_source?: string | null;
          discount_total?: number;
          email?: string;
          first_name?: string | null;
          id?: string;
          idempotency_key?: string | null;
          last_name?: string | null;
          location_id?: string | null;
          manual_order_channel?: string | null;
          order_number?: string;
          order_source?: string;
          organization_id?: string;
          phone?: string | null;
          placed_at?: string | null;
          received_at?: string | null;
          refunded_at?: string | null;
          shipped_at?: string | null;
          shipping_address?: Json;
          shipping_fee?: number;
          status?: Database["public"]["Enums"]["order_status"];
          subtotal?: number;
          total?: number;
          updated_at?: string;
          warehouse_id?: string | null;
          whatsapp_number?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_discount_id_fkey";
            columns: ["discount_id"];
            isOneToOne: false;
            referencedRelation: "discounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_location_id_fkey";
            columns: ["location_id"];
            isOneToOne: false;
            referencedRelation: "locations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_warehouse_id_fkey";
            columns: ["warehouse_id"];
            isOneToOne: false;
            referencedRelation: "warehouses";
            referencedColumns: ["id"];
          },
        ];
      };
      organization_invitations: {
        Row: {
          accepted_at: string | null;
          created_at: string;
          email: string;
          expires_at: string;
          id: string;
          invited_by: string | null;
          organization_id: string;
          role: string;
          token: string;
          updated_at: string;
        };
        Insert: {
          accepted_at?: string | null;
          created_at?: string;
          email: string;
          expires_at: string;
          id?: string;
          invited_by?: string | null;
          organization_id: string;
          role?: string;
          token: string;
          updated_at?: string;
        };
        Update: {
          accepted_at?: string | null;
          created_at?: string;
          email?: string;
          expires_at?: string;
          id?: string;
          invited_by?: string | null;
          organization_id?: string;
          role?: string;
          token?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "organization_invitations_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      organization_members: {
        Row: {
          created_at: string;
          id: string;
          organization_id: string;
          role: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          organization_id: string;
          role?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          organization_id?: string;
          role?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      organizations: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          slug: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          slug: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          slug?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      payments: {
        Row: {
          amount: number;
          created_at: string;
          currency: string;
          id: string;
          metadata: Json | null;
          order_id: string;
          paid_at: string | null;
          provider: string;
          provider_reference: string;
          status: Database["public"]["Enums"]["payment_status"];
        };
        Insert: {
          amount: number;
          created_at?: string;
          currency?: string;
          id?: string;
          metadata?: Json | null;
          order_id: string;
          paid_at?: string | null;
          provider: string;
          provider_reference: string;
          status?: Database["public"]["Enums"]["payment_status"];
        };
        Update: {
          amount?: number;
          created_at?: string;
          currency?: string;
          id?: string;
          metadata?: Json | null;
          order_id?: string;
          paid_at?: string | null;
          provider?: string;
          provider_reference?: string;
          status?: Database["public"]["Enums"]["payment_status"];
        };
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      product_addons: {
        Row: {
          active: boolean;
          addon_product_id: string;
          created_at: string;
          id: string;
          max_quantity: number;
          min_quantity: number;
          parent_product_id: string;
          price_override: number | null;
        };
        Insert: {
          active?: boolean;
          addon_product_id: string;
          created_at?: string;
          id?: string;
          max_quantity?: number;
          min_quantity?: number;
          parent_product_id: string;
          price_override?: number | null;
        };
        Update: {
          active?: boolean;
          addon_product_id?: string;
          created_at?: string;
          id?: string;
          max_quantity?: number;
          min_quantity?: number;
          parent_product_id?: string;
          price_override?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "product_addons_addon_product_id_fkey";
            columns: ["addon_product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_addons_parent_product_id_fkey";
            columns: ["parent_product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      product_categories: {
        Row: {
          category_id: string;
          product_id: string;
        };
        Insert: {
          category_id: string;
          product_id: string;
        };
        Update: {
          category_id?: string;
          product_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_categories_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_categories_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      product_themes: {
        Row: {
          created_at: string;
          product_id: string;
          theme_id: string;
        };
        Insert: {
          created_at?: string;
          product_id: string;
          theme_id: string;
        };
        Update: {
          created_at?: string;
          product_id?: string;
          theme_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_themes_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_themes_theme_id_fkey";
            columns: ["theme_id"];
            isOneToOne: false;
            referencedRelation: "themes";
            referencedColumns: ["id"];
          },
        ];
      };
      themes: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          is_active: boolean;
          name: string;
          organization_id: string;
          slug: string;
          sort_order: number;
          storage_path: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          name: string;
          organization_id: string;
          slug: string;
          sort_order?: number;
          storage_path?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          name?: string;
          organization_id?: string;
          slug?: string;
          sort_order?: number;
          storage_path?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "themes_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      order_item_theme_customizations: {
        Row: {
          cover_name: string | null;
          created_at: string;
          id: string;
          order_item_id: string;
          updated_at: string;
        };
        Insert: {
          cover_name?: string | null;
          created_at?: string;
          id?: string;
          order_item_id: string;
          updated_at?: string;
        };
        Update: {
          cover_name?: string | null;
          created_at?: string;
          id?: string;
          order_item_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "order_item_theme_customizations_order_item_id_fkey";
            columns: ["order_item_id"];
            isOneToOne: true;
            referencedRelation: "order_items";
            referencedColumns: ["id"];
          },
        ];
      };
      order_item_theme_snapshots: {
        Row: {
          created_at: string;
          customization_id: string;
          id: string;
          sort_order: number;
          theme_id: string | null;
          theme_name: string;
        };
        Insert: {
          created_at?: string;
          customization_id: string;
          id?: string;
          sort_order?: number;
          theme_id?: string | null;
          theme_name: string;
        };
        Update: {
          created_at?: string;
          customization_id?: string;
          id?: string;
          sort_order?: number;
          theme_id?: string | null;
          theme_name?: string;
        };
        Relationships: [
          {
            foreignKeyName: "order_item_theme_snapshots_customization_id_fkey";
            columns: ["customization_id"];
            isOneToOne: false;
            referencedRelation: "order_item_theme_customizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_item_theme_snapshots_theme_id_fkey";
            columns: ["theme_id"];
            isOneToOne: false;
            referencedRelation: "themes";
            referencedColumns: ["id"];
          },
        ];
      };
      product_images: {
        Row: {
          alt_text: string | null;
          created_at: string;
          id: string;
          product_id: string;
          sort_order: number;
          storage_path: string;
        };
        Insert: {
          alt_text?: string | null;
          created_at?: string;
          id?: string;
          product_id: string;
          sort_order?: number;
          storage_path: string;
        };
        Update: {
          alt_text?: string | null;
          created_at?: string;
          id?: string;
          product_id?: string;
          sort_order?: number;
          storage_path?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      products: {
        Row: {
          cost_price: number;
          created_at: string;
          description: string | null;
          id: string;
          name: string;
          organization_id: string;
          product_type: Database["public"]["Enums"]["product_type"];
          requires_customization: boolean;
          selling_price: number;
          sku: string | null;
          slug: string;
          status: Database["public"]["Enums"]["product_status"];
          supports_theme_customization: boolean;
          updated_at: string;
        };
        Insert: {
          cost_price?: number;
          created_at?: string;
          description?: string | null;
          id?: string;
          name: string;
          organization_id: string;
          product_type?: Database["public"]["Enums"]["product_type"];
          requires_customization?: boolean;
          selling_price: number;
          sku?: string | null;
          slug: string;
          status?: Database["public"]["Enums"]["product_status"];
          supports_theme_customization?: boolean;
          updated_at?: string;
        };
        Update: {
          cost_price?: number;
          created_at?: string;
          description?: string | null;
          id?: string;
          name?: string;
          organization_id?: string;
          product_type?: Database["public"]["Enums"]["product_type"];
          requires_customization?: boolean;
          selling_price?: number;
          sku?: string | null;
          slug?: string;
          status?: Database["public"]["Enums"]["product_status"];
          supports_theme_customization?: boolean;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "products_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      review_images: {
        Row: {
          created_at: string;
          id: string;
          review_id: string;
          storage_path: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          review_id: string;
          storage_path: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          review_id?: string;
          storage_path?: string;
        };
        Relationships: [
          {
            foreignKeyName: "review_images_review_id_fkey";
            columns: ["review_id"];
            isOneToOne: false;
            referencedRelation: "reviews";
            referencedColumns: ["id"];
          },
        ];
      };
      reviews: {
        Row: {
          body: string | null;
          created_at: string;
          customer_id: string;
          id: string;
          order_id: string;
          product_id: string;
          published_at: string | null;
          rating: number;
          status: Database["public"]["Enums"]["review_status"];
          title: string | null;
        };
        Insert: {
          body?: string | null;
          created_at?: string;
          customer_id: string;
          id?: string;
          order_id: string;
          product_id: string;
          published_at?: string | null;
          rating: number;
          status?: Database["public"]["Enums"]["review_status"];
          title?: string | null;
        };
        Update: {
          body?: string | null;
          created_at?: string;
          customer_id?: string;
          id?: string;
          order_id?: string;
          product_id?: string;
          published_at?: string | null;
          rating?: number;
          status?: Database["public"]["Enums"]["review_status"];
          title?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "reviews_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reviews_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reviews_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      stock_notifications: {
        Row: {
          channel: Database["public"]["Enums"]["stock_notification_channel"];
          created_at: string;
          customer_id: string;
          id: string;
          notified_at: string | null;
          product_id: string;
        };
        Insert: {
          channel: Database["public"]["Enums"]["stock_notification_channel"];
          created_at?: string;
          customer_id: string;
          id?: string;
          notified_at?: string | null;
          product_id: string;
        };
        Update: {
          channel?: Database["public"]["Enums"]["stock_notification_channel"];
          created_at?: string;
          customer_id?: string;
          id?: string;
          notified_at?: string | null;
          product_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "stock_notifications_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stock_notifications_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      stock_receipt_items: {
        Row: {
          cost_price: number;
          id: string;
          product_id: string;
          quantity: number;
          stock_receipt_id: string;
        };
        Insert: {
          cost_price: number;
          id?: string;
          product_id: string;
          quantity: number;
          stock_receipt_id: string;
        };
        Update: {
          cost_price?: number;
          id?: string;
          product_id?: string;
          quantity?: number;
          stock_receipt_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "stock_receipt_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stock_receipt_items_stock_receipt_id_fkey";
            columns: ["stock_receipt_id"];
            isOneToOne: false;
            referencedRelation: "stock_receipts";
            referencedColumns: ["id"];
          },
        ];
      };
      stock_receipts: {
        Row: {
          created_at: string;
          id: string;
          notes: string | null;
          organization_id: string;
          received_at: string;
          reference: string | null;
          warehouse_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          notes?: string | null;
          organization_id: string;
          received_at?: string;
          reference?: string | null;
          warehouse_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          notes?: string | null;
          organization_id?: string;
          received_at?: string;
          reference?: string | null;
          warehouse_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "stock_receipts_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stock_receipts_warehouse_id_fkey";
            columns: ["warehouse_id"];
            isOneToOne: false;
            referencedRelation: "warehouses";
            referencedColumns: ["id"];
          },
        ];
      };
      warehouse_locations: {
        Row: {
          location_id: string;
          warehouse_id: string;
        };
        Insert: {
          location_id: string;
          warehouse_id: string;
        };
        Update: {
          location_id?: string;
          warehouse_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "warehouse_locations_location_id_fkey";
            columns: ["location_id"];
            isOneToOne: false;
            referencedRelation: "locations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "warehouse_locations_warehouse_id_fkey";
            columns: ["warehouse_id"];
            isOneToOne: false;
            referencedRelation: "warehouses";
            referencedColumns: ["id"];
          },
        ];
      };
      warehouses: {
        Row: {
          active: boolean;
          address_line_1: string | null;
          address_line_2: string | null;
          created_at: string;
          id: string;
          lga: string | null;
          name: string;
          organization_id: string;
          state: string | null;
        };
        Insert: {
          active?: boolean;
          address_line_1?: string | null;
          address_line_2?: string | null;
          created_at?: string;
          id?: string;
          lga?: string | null;
          name: string;
          organization_id: string;
          state?: string | null;
        };
        Update: {
          active?: boolean;
          address_line_1?: string | null;
          address_line_2?: string | null;
          created_at?: string;
          id?: string;
          lga?: string | null;
          name?: string;
          organization_id?: string;
          state?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "warehouses_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      cancel_order: {
        Args: { p_actor_id?: string; p_order_id: string; p_reason?: string };
        Returns: undefined;
      };
      change_order_status: {
        Args: {
          p_actor_id?: string;
          p_new_status: Database["public"]["Enums"]["order_status"];
          p_note?: string;
          p_order_id: string;
        };
        Returns: undefined;
      };
      commit_inventory_reservation: {
        Args: { p_reservation_id: string };
        Returns: undefined;
      };
      commit_order_inventory: {
        Args: { p_order_id: string };
        Returns: undefined;
      };
      confirm_payment: {
        Args: {
          p_amount: number;
          p_metadata?: Json;
          p_order_id: string;
          p_provider: string;
          p_provider_reference: string;
        };
        Returns: undefined;
      };
      create_admin_bundle: {
        Args: {
          p_category_ids?: string[];
          p_components?: Json;
          p_cost_price?: number;
          p_description?: string;
          p_images?: Json;
          p_name: string;
          p_org_id: string;
          p_selling_price?: number;
          p_sku?: string;
          p_slug: string;
          p_status?: Database["public"]["Enums"]["product_status"];
        };
        Returns: string;
      };
      create_admin_manual_order: {
        Args: {
          p_customer: Json;
          p_discount_code?: string;
          p_idempotency_key?: string;
          p_items: Json;
          p_location_id?: string;
          p_manual_discount?: Json;
          p_manual_order_channel?: string;
          p_notes?: string;
          p_org_id: string;
          p_shipping_address: Json;
          p_shipping_fee?: number;
          p_warehouse_id?: string;
        };
        Returns: Json;
      };
      create_order: {
        Args: {
          p_customer_id: string;
          p_email: string;
          p_first_name: string;
          p_items: Json;
          p_last_name: string;
          p_location_id: string;
          p_organization_id: string;
          p_phone: string;
          p_shipping_address: Json;
          p_warehouse_id: string;
          p_whatsapp_number: string;
        };
        Returns: string;
      };
      duplicate_admin_bundle: {
        Args: {
          p_bundle_id: string;
          p_new_name: string;
          p_new_sku?: string;
          p_new_slug: string;
          p_org_id: string;
        };
        Returns: string;
      };
      expire_inventory_reservation: {
        Args: { p_reservation_id: string };
        Returns: undefined;
      };
      expire_inventory_reservations: { Args: never; Returns: number };
      get_available_inventory: {
        Args: { p_product_id: string; p_warehouse_id: string };
        Returns: number;
      };
      increment_discount_usage: {
        Args: { p_discount_id: string; p_organization_id: string };
        Returns: boolean;
      };
      is_organization_admin: {
        Args: { target_organization_id: string };
        Returns: boolean;
      };
      is_organization_member: {
        Args: { target_organization_id: string };
        Returns: boolean;
      };
      is_valid_order_transition: {
        Args: {
          p_from: Database["public"]["Enums"]["order_status"];
          p_to: Database["public"]["Enums"]["order_status"];
        };
        Returns: boolean;
      };
      receive_order: { Args: { p_order_id: string }; Returns: undefined };
      refund_order: {
        Args: { p_actor_id?: string; p_order_id: string };
        Returns: undefined;
      };
      release_inventory_reservation: {
        Args: { p_reservation_id: string };
        Returns: undefined;
      };
      release_order_inventory: {
        Args: { p_order_id: string };
        Returns: undefined;
      };
      reserve_inventory: {
        Args: {
          p_expiration_minutes?: number;
          p_inventory_id: string;
          p_order_id: string;
          p_quantity: number;
        };
        Returns: string;
      };
      reserve_order_inventory: {
        Args: { p_order_id: string };
        Returns: undefined;
      };
      ship_order: {
        Args: { p_actor_id?: string; p_order_id: string };
        Returns: undefined;
      };
      update_admin_bundle: {
        Args: {
          p_bundle_id: string;
          p_category_ids?: string[];
          p_components?: Json;
          p_cost_price?: number;
          p_description?: string;
          p_images?: Json;
          p_name: string;
          p_org_id: string;
          p_selling_price?: number;
          p_sku?: string;
          p_slug: string;
          p_status?: Database["public"]["Enums"]["product_status"];
        };
        Returns: string;
      };
    };
    Enums: {
      audit_action: "create" | "update" | "delete";
      checkout_status: "active" | "completed" | "expired" | "abandoned";
      customization_status:
        | "pending"
        | "processing"
        | "completed"
        | "cancelled";
      discount_type: "percentage" | "fixed" | "free_shipping";
      inventory_movement_type:
        | "purchase"
        | "sale"
        | "reservation"
        | "release"
        | "adjustment"
        | "return"
        | "transfer_in"
        | "transfer_out";
      inventory_reservation_status:
        | "active"
        | "committed"
        | "released"
        | "expired";
      order_status:
        | "created"
        | "pending"
        | "confirmed"
        | "shipped"
        | "received"
        | "cancelled"
        | "refunded";
      payment_status: "pending" | "successful" | "failed" | "refunded";
      product_status: "draft" | "published" | "archived";
      product_type: "physical" | "custom" | "bundle";
      review_status: "pending" | "approved" | "rejected";
      stock_notification_channel: "email" | "whatsapp";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      audit_action: ["create", "update", "delete"],
      checkout_status: ["active", "completed", "expired", "abandoned"],
      customization_status: ["pending", "processing", "completed", "cancelled"],
      discount_type: ["percentage", "fixed", "free_shipping"],
      inventory_movement_type: [
        "purchase",
        "sale",
        "reservation",
        "release",
        "adjustment",
        "return",
        "transfer_in",
        "transfer_out",
      ],
      inventory_reservation_status: [
        "active",
        "committed",
        "released",
        "expired",
      ],
      order_status: [
        "created",
        "pending",
        "confirmed",
        "shipped",
        "received",
        "cancelled",
        "refunded",
      ],
      payment_status: ["pending", "successful", "failed", "refunded"],
      product_status: ["draft", "published", "archived"],
      product_type: ["physical", "custom", "bundle"],
      review_status: ["pending", "approved", "rejected"],
      stock_notification_channel: ["email", "whatsapp"],
    },
  },
} as const;

export type OrderStatus = Database['public']['Enums']['order_status'];
export type PaymentStatus = Database['public']['Enums']['payment_status'];
export type ReservationStatus = Database['public']['Enums']['inventory_reservation_status'];
export type DiscountType = Database['public']['Enums']['discount_type'];
export type ProductStatus = Database['public']['Enums']['product_status'];
export type ProductType = Database['public']['Enums']['product_type'];
export type CustomizationStatus = Database['public']['Enums']['customization_status'];
export type AuditAction = Database['public']['Enums']['audit_action'];
