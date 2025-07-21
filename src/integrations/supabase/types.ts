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
      api_sync_logs: {
        Row: {
          api_id: string
          completed_at: string | null
          error_message: string | null
          id: string
          records_processed: number | null
          started_at: string | null
          status: string
          sync_type: string
        }
        Insert: {
          api_id: string
          completed_at?: string | null
          error_message?: string | null
          id?: string
          records_processed?: number | null
          started_at?: string | null
          status: string
          sync_type: string
        }
        Update: {
          api_id?: string
          completed_at?: string | null
          error_message?: string | null
          id?: string
          records_processed?: number | null
          started_at?: string | null
          status?: string
          sync_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_sync_logs_api_id_fkey"
            columns: ["api_id"]
            isOneToOne: false
            referencedRelation: "external_apis"
            referencedColumns: ["id"]
          },
        ]
      }
      basket_items: {
        Row: {
          basket_id: string
          created_at: string | null
          id: string
          lot_number: number | null
          observations: string | null
          product_id: string
          quantity: number
        }
        Insert: {
          basket_id: string
          created_at?: string | null
          id?: string
          lot_number?: number | null
          observations?: string | null
          product_id: string
          quantity?: number
        }
        Update: {
          basket_id?: string
          created_at?: string | null
          id?: string
          lot_number?: number | null
          observations?: string | null
          product_id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "basket_items_basket_id_fkey"
            columns: ["basket_id"]
            isOneToOne: false
            referencedRelation: "price_baskets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "basket_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
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
      index_values: {
        Row: {
          created_at: string | null
          id: string
          index_id: string
          reference_date: string
          value: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          index_id: string
          reference_date: string
          value: number
        }
        Update: {
          created_at?: string | null
          id?: string
          index_id?: string
          reference_date?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "index_values_index_id_fkey"
            columns: ["index_id"]
            isOneToOne: false
            referencedRelation: "monetary_indexes"
            referencedColumns: ["id"]
          },
        ]
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
          abbreviation: string
          created_at: string | null
          description: string | null
          id: string
          name: string
        }
        Insert: {
          abbreviation: string
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          abbreviation?: string
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
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
      price_corrections: {
        Row: {
          applied_at: string | null
          applied_by: string
          base_date: string
          basket_id: string
          correction_factor: number
          id: string
          index_id: string
          target_date: string
        }
        Insert: {
          applied_at?: string | null
          applied_by: string
          base_date: string
          basket_id: string
          correction_factor: number
          id?: string
          index_id: string
          target_date: string
        }
        Update: {
          applied_at?: string | null
          applied_by?: string
          base_date?: string
          basket_id?: string
          correction_factor?: number
          id?: string
          index_id?: string
          target_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_corrections_basket_id_fkey"
            columns: ["basket_id"]
            isOneToOne: false
            referencedRelation: "price_baskets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_corrections_index_id_fkey"
            columns: ["index_id"]
            isOneToOne: false
            referencedRelation: "monetary_indexes"
            referencedColumns: ["id"]
          },
        ]
      }
      price_records: {
        Row: {
          brand: string | null
          city_id: string | null
          created_at: string | null
          currency: string | null
          document_url: string | null
          id: string
          observations: string | null
          price: number
          product_id: string
          reference_date: string
          source_id: string
          supplier_id: string | null
        }
        Insert: {
          brand?: string | null
          city_id?: string | null
          created_at?: string | null
          currency?: string | null
          document_url?: string | null
          id?: string
          observations?: string | null
          price: number
          product_id: string
          reference_date: string
          source_id: string
          supplier_id?: string | null
        }
        Update: {
          brand?: string | null
          city_id?: string | null
          created_at?: string | null
          currency?: string | null
          document_url?: string | null
          id?: string
          observations?: string | null
          price?: number
          product_id?: string
          reference_date?: string
          source_id?: string
          supplier_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "price_records_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_records_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_records_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "price_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_records_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      price_sources: {
        Row: {
          api_endpoint: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          type: Database["public"]["Enums"]["price_source_type"]
          url: string | null
        }
        Insert: {
          api_endpoint?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          type: Database["public"]["Enums"]["price_source_type"]
          url?: string | null
        }
        Update: {
          api_endpoint?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          type?: Database["public"]["Enums"]["price_source_type"]
          url?: string | null
        }
        Relationships: []
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
      quote_items: {
        Row: {
          anvisa_registration: string | null
          basket_item_id: string
          brand: string | null
          created_at: string | null
          id: string
          observations: string | null
          quote_id: string
          total_price: number | null
          unit_price: number | null
          updated_at: string | null
        }
        Insert: {
          anvisa_registration?: string | null
          basket_item_id: string
          brand?: string | null
          created_at?: string | null
          id?: string
          observations?: string | null
          quote_id: string
          total_price?: number | null
          unit_price?: number | null
          updated_at?: string | null
        }
        Update: {
          anvisa_registration?: string | null
          basket_item_id?: string
          brand?: string | null
          created_at?: string | null
          id?: string
          observations?: string | null
          quote_id?: string
          total_price?: number | null
          unit_price?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_items_basket_item_id_fkey"
            columns: ["basket_item_id"]
            isOneToOne: false
            referencedRelation: "basket_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_items_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "supplier_quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      regions: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
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
      supplier_quote_tokens: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          is_used: boolean | null
          quote_id: string
          token: string
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          is_used?: boolean | null
          quote_id: string
          token: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          is_used?: boolean | null
          quote_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_quote_tokens_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "supplier_quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_quotes: {
        Row: {
          access_token: string | null
          basket_id: string
          created_at: string | null
          digital_signature: string | null
          due_date: string | null
          id: string
          responded_at: string | null
          sent_at: string | null
          signature_certificate: string | null
          status: Database["public"]["Enums"]["quote_status"] | null
          supplier_id: string
          updated_at: string | null
        }
        Insert: {
          access_token?: string | null
          basket_id: string
          created_at?: string | null
          digital_signature?: string | null
          due_date?: string | null
          id?: string
          responded_at?: string | null
          sent_at?: string | null
          signature_certificate?: string | null
          status?: Database["public"]["Enums"]["quote_status"] | null
          supplier_id: string
          updated_at?: string | null
        }
        Update: {
          access_token?: string | null
          basket_id?: string
          created_at?: string | null
          digital_signature?: string | null
          due_date?: string | null
          id?: string
          responded_at?: string | null
          sent_at?: string | null
          signature_certificate?: string | null
          status?: Database["public"]["Enums"]["quote_status"] | null
          supplier_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_quotes_basket_id_fkey"
            columns: ["basket_id"]
            isOneToOne: false
            referencedRelation: "price_baskets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_quotes_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_quote_token: {
        Args: { quote_uuid: string }
        Returns: string
      }
      generate_quote_token: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_current_user_management_unit: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: Database["public"]["Enums"]["user_role"]
      }
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
