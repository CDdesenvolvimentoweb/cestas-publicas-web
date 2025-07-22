export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action_type: string
          created_at: string | null
          description: string
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: unknown | null
          metadata: Json | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action_type: string
          created_at?: string | null
          description: string
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string | null
          description?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      catalog_products: {
        Row: {
          category_id: string | null
          code: string
          created_at: string | null
          description: string
          element_code: string | null
          id: string
          is_active: boolean | null
          is_common_object: boolean | null
          measurement_unit_id: string | null
          name: string
          specification: string | null
          tce_code: string | null
          updated_at: string | null
        }
        Insert: {
          category_id?: string | null
          code: string
          created_at?: string | null
          description: string
          element_code?: string | null
          id?: string
          is_active?: boolean | null
          is_common_object?: boolean | null
          measurement_unit_id?: string | null
          name: string
          specification?: string | null
          tce_code?: string | null
          updated_at?: string | null
        }
        Update: {
          category_id?: string | null
          code?: string
          created_at?: string | null
          description?: string
          element_code?: string | null
          id?: string
          is_active?: boolean | null
          is_common_object?: boolean | null
          measurement_unit_id?: string | null
          name?: string
          specification?: string | null
          tce_code?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "catalog_products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalog_products_measurement_unit_id_fkey"
            columns: ["measurement_unit_id"]
            isOneToOne: false
            referencedRelation: "measurement_units"
            referencedColumns: ["id"]
          },
        ]
      }
      cities: {
        Row: {
          created_at: string | null
          ibge_code: string | null
          id: string
          name: string
          state_id: string
        }
        Insert: {
          created_at?: string | null
          ibge_code?: string | null
          id?: string
          name: string
          state_id: string
        }
        Update: {
          created_at?: string | null
          ibge_code?: string | null
          id?: string
          name?: string
          state_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cities_state_id_fkey"
            columns: ["state_id"]
            isOneToOne: false
            referencedRelation: "states"
            referencedColumns: ["id"]
          },
        ]
      }
      external_apis: {
        Row: {
          api_key_required: boolean | null
          base_url: string
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          rate_limit_per_minute: number | null
        }
        Insert: {
          api_key_required?: boolean | null
          base_url: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          rate_limit_per_minute?: number | null
        }
        Update: {
          api_key_required?: boolean | null
          base_url?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          rate_limit_per_minute?: number | null
        }
        Relationships: []
      }
      external_price_integrations: {
        Row: {
          api_key_required: boolean | null
          created_at: string | null
          id: string
          is_active: boolean | null
          last_sync_at: string | null
          rate_limit_per_hour: number | null
          source_name: string
          source_url: string
          sync_frequency_hours: number | null
          updated_at: string | null
        }
        Insert: {
          api_key_required?: boolean | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          rate_limit_per_hour?: number | null
          source_name: string
          source_url: string
          sync_frequency_hours?: number | null
          updated_at?: string | null
        }
        Update: {
          api_key_required?: boolean | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          rate_limit_per_hour?: number | null
          source_name?: string
          source_url?: string
          sync_frequency_hours?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      external_prices: {
        Row: {
          created_at: string | null
          currency: string | null
          date: string
          id: string
          location: string | null
          price: number
          product_id: string
          product_name: string | null
          raw_data: Json | null
          reference: string | null
          source: string
          supplier_name: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          currency?: string | null
          date: string
          id?: string
          location?: string | null
          price: number
          product_id: string
          product_name?: string | null
          raw_data?: Json | null
          reference?: string | null
          source: string
          supplier_name?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          currency?: string | null
          date?: string
          id?: string
          location?: string | null
          price?: number
          product_id?: string
          product_name?: string | null
          raw_data?: Json | null
          reference?: string | null
          source?: string
          supplier_name?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      management_units: {
        Row: {
          address: string | null
          city_id: string
          cnpj: string | null
          created_at: string | null
          email: string | null
          id: string
          is_active: boolean | null
          name: string
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          city_id: string
          cnpj?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          city_id?: string
          cnpj?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "management_units_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      measurement_units: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          symbol: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          symbol: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          symbol?: string
        }
        Relationships: []
      }
      monetary_indexes: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          source_url: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          source_url?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          source_url?: string | null
        }
        Relationships: []
      }
      price_analytics: {
        Row: {
          avg_price: number
          catalog_product_id: string | null
          created_at: string | null
          id: string
          max_price: number
          median_price: number
          min_price: number
          period_end: string
          period_start: string
          price_count: number
          sources: Json | null
          supplier_count: number
        }
        Insert: {
          avg_price: number
          catalog_product_id?: string | null
          created_at?: string | null
          id?: string
          max_price: number
          median_price: number
          min_price: number
          period_end: string
          period_start: string
          price_count: number
          sources?: Json | null
          supplier_count: number
        }
        Update: {
          avg_price?: number
          catalog_product_id?: string | null
          created_at?: string | null
          id?: string
          max_price?: number
          median_price?: number
          min_price?: number
          period_end?: string
          period_start?: string
          price_count?: number
          sources?: Json | null
          supplier_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "price_analytics_catalog_product_id_fkey"
            columns: ["catalog_product_id"]
            isOneToOne: false
            referencedRelation: "catalog_products"
            referencedColumns: ["id"]
          },
        ]
      }
      price_baskets: {
        Row: {
          calculation_type: Database["public"]["Enums"]["basket_calculation_type"]
          created_at: string | null
          created_by: string
          description: string | null
          id: string
          is_finalized: boolean | null
          management_unit_id: string
          name: string
          reference_date: string
          updated_at: string | null
        }
        Insert: {
          calculation_type?: Database["public"]["Enums"]["basket_calculation_type"]
          created_at?: string | null
          created_by: string
          description?: string | null
          id?: string
          is_finalized?: boolean | null
          management_unit_id: string
          name: string
          reference_date: string
          updated_at?: string | null
        }
        Update: {
          calculation_type?: Database["public"]["Enums"]["basket_calculation_type"]
          created_at?: string | null
          created_by?: string
          description?: string | null
          id?: string
          is_finalized?: boolean | null
          management_unit_id?: string
          name?: string
          reference_date?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "price_baskets_management_unit_id_fkey"
            columns: ["management_unit_id"]
            isOneToOne: false
            referencedRelation: "management_units"
            referencedColumns: ["id"]
          },
        ]
      }
      price_history: {
        Row: {
          catalog_product_id: string | null
          created_at: string | null
          document_url: string | null
          id: string
          management_unit_id: string | null
          municipality: string | null
          observations: string | null
          price: number
          quantity: number | null
          reference_date: string
          source_id: string | null
          source_name: string | null
          source_type: string
          state: string | null
          supplier_id: string | null
          unit_price: number | null
          updated_at: string | null
        }
        Insert: {
          catalog_product_id?: string | null
          created_at?: string | null
          document_url?: string | null
          id?: string
          management_unit_id?: string | null
          municipality?: string | null
          observations?: string | null
          price: number
          quantity?: number | null
          reference_date: string
          source_id?: string | null
          source_name?: string | null
          source_type: string
          state?: string | null
          supplier_id?: string | null
          unit_price?: number | null
          updated_at?: string | null
        }
        Update: {
          catalog_product_id?: string | null
          created_at?: string | null
          document_url?: string | null
          id?: string
          management_unit_id?: string | null
          municipality?: string | null
          observations?: string | null
          price?: number
          quantity?: number | null
          reference_date?: string
          source_id?: string | null
          source_name?: string | null
          source_type?: string
          state?: string | null
          supplier_id?: string | null
          unit_price?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "price_history_catalog_product_id_fkey"
            columns: ["catalog_product_id"]
            isOneToOne: false
            referencedRelation: "catalog_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_history_management_unit_id_fkey"
            columns: ["management_unit_id"]
            isOneToOne: false
            referencedRelation: "management_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_history_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      product_categories: {
        Row: {
          code: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          parent_id: string | null
        }
        Insert: {
          code?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          parent_id?: string | null
        }
        Update: {
          code?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          parent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      product_requests: {
        Row: {
          admin_response: string | null
          anvisa_code: string | null
          category_id: string | null
          created_at: string
          description: string | null
          id: string
          justification: string
          management_unit_id: string
          measurement_unit_id: string | null
          product_code: string | null
          product_name: string
          requester_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          specification: string | null
          status: string
          updated_at: string
        }
        Insert: {
          admin_response?: string | null
          anvisa_code?: string | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          justification: string
          management_unit_id: string
          measurement_unit_id?: string | null
          product_code?: string | null
          product_name: string
          requester_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          specification?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          admin_response?: string | null
          anvisa_code?: string | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          justification?: string
          management_unit_id?: string
          measurement_unit_id?: string | null
          product_code?: string | null
          product_name?: string
          requester_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          specification?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_requests_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_requests_management_unit_id_fkey"
            columns: ["management_unit_id"]
            isOneToOne: false
            referencedRelation: "management_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_requests_measurement_unit_id_fkey"
            columns: ["measurement_unit_id"]
            isOneToOne: false
            referencedRelation: "measurement_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          anvisa_code: string | null
          category_id: string
          code: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          measurement_unit_id: string
          name: string
          specification: string | null
          updated_at: string | null
        }
        Insert: {
          anvisa_code?: string | null
          category_id: string
          code?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          measurement_unit_id: string
          name: string
          specification?: string | null
          updated_at?: string | null
        }
        Update: {
          anvisa_code?: string | null
          category_id?: string
          code?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          measurement_unit_id?: string
          name?: string
          specification?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_measurement_unit_id_fkey"
            columns: ["measurement_unit_id"]
            isOneToOne: false
            referencedRelation: "measurement_units"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          cpf: string | null
          created_at: string | null
          full_name: string
          id: string
          is_active: boolean | null
          management_unit_id: string | null
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string | null
        }
        Insert: {
          cpf?: string | null
          created_at?: string | null
          full_name: string
          id: string
          is_active?: boolean | null
          management_unit_id?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
        }
        Update: {
          cpf?: string | null
          created_at?: string | null
          full_name?: string
          id?: string
          is_active?: boolean | null
          management_unit_id?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_profiles_management_unit"
            columns: ["management_unit_id"]
            isOneToOne: false
            referencedRelation: "management_units"
            referencedColumns: ["id"]
          },
        ]
      }
      states: {
        Row: {
          code: string
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          code: string
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          code?: string
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      supplier_quotation_items: {
        Row: {
          basket_item_id: string | null
          created_at: string | null
          delivery_days: number | null
          id: string
          observations: string | null
          quotation_response_id: string | null
          total_price: number
          unit_price: number
        }
        Insert: {
          basket_item_id?: string | null
          created_at?: string | null
          delivery_days?: number | null
          id?: string
          observations?: string | null
          quotation_response_id?: string | null
          total_price: number
          unit_price: number
        }
        Update: {
          basket_item_id?: string | null
          created_at?: string | null
          delivery_days?: number | null
          id?: string
          observations?: string | null
          quotation_response_id?: string | null
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "supplier_quotation_items_basket_item_id_fkey"
            columns: ["basket_item_id"]
            isOneToOne: false
            referencedRelation: "basket_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_quotation_items_quotation_response_id_fkey"
            columns: ["quotation_response_id"]
            isOneToOne: false
            referencedRelation: "supplier_quotation_responses"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_quotation_responses: {
        Row: {
          access_token: string | null
          created_at: string | null
          delivery_days: number | null
          id: string
          observations: string | null
          quotation_id: string | null
          status: string
          submitted_at: string | null
          supplier_id: string | null
          total_value: number | null
        }
        Insert: {
          access_token?: string | null
          created_at?: string | null
          delivery_days?: number | null
          id?: string
          observations?: string | null
          quotation_id?: string | null
          status?: string
          submitted_at?: string | null
          supplier_id?: string | null
          total_value?: number | null
        }
        Update: {
          access_token?: string | null
          created_at?: string | null
          delivery_days?: number | null
          id?: string
          observations?: string | null
          quotation_id?: string | null
          status?: string
          submitted_at?: string | null
          supplier_id?: string | null
          total_value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_quotation_responses_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "supplier_quotations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_quotation_responses_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_quotations: {
        Row: {
          basket_id: string | null
          created_at: string | null
          created_by: string | null
          deadline: string
          emails_sent: number | null
          id: string
          message: string | null
          status: string
          total_suppliers: number | null
          updated_at: string | null
        }
        Insert: {
          basket_id?: string | null
          created_at?: string | null
          created_by?: string | null
          deadline: string
          emails_sent?: number | null
          id?: string
          message?: string | null
          status?: string
          total_suppliers?: number | null
          updated_at?: string | null
        }
        Update: {
          basket_id?: string | null
          created_at?: string | null
          created_by?: string | null
          deadline?: string
          emails_sent?: number | null
          id?: string
          message?: string | null
          status?: string
          total_suppliers?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_quotations_basket_id_fkey"
            columns: ["basket_id"]
            isOneToOne: false
            referencedRelation: "price_baskets"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          city_id: string | null
          cnpj: string
          company_name: string
          created_at: string | null
          email: string
          id: string
          is_active: boolean | null
          municipal_registration: string | null
          phone: string | null
          state_registration: string | null
          trade_name: string | null
          updated_at: string | null
          user_id: string | null
          website: string | null
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          city_id?: string | null
          cnpj: string
          company_name: string
          created_at?: string | null
          email: string
          id?: string
          is_active?: boolean | null
          municipal_registration?: string | null
          phone?: string | null
          state_registration?: string | null
          trade_name?: string | null
          updated_at?: string | null
          user_id?: string | null
          website?: string | null
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          city_id?: string | null
          cnpj?: string
          company_name?: string
          created_at?: string | null
          email?: string
          id?: string
          is_active?: boolean | null
          municipal_registration?: string | null
          phone?: string | null
          state_registration?: string | null
          trade_name?: string | null
          updated_at?: string | null
          user_id?: string | null
          website?: string | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          key: string
          updated_at: string | null
          value: Json
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          key: string
          updated_at?: string | null
          value: Json
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          value?: Json
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      basket_calculation_type: "media" | "mediana" | "menor_preco"
      price_source_type: "fornecedor" | "portal_governo" | "api_externa"
      quote_status: "pendente" | "respondida" | "vencida"
      user_role: "admin" | "servidor" | "fornecedor"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      basket_calculation_type: ["media", "mediana", "menor_preco"],
      price_source_type: ["fornecedor", "portal_governo", "api_externa"],
      quote_status: ["pendente", "respondida", "vencida"],
      user_role: ["admin", "servidor", "fornecedor"],
    },
  },
} as const
