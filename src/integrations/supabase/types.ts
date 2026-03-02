export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      collections: {
        Row: {
          batch_id: string
          collected_at: string
          created_at: string
          id: string
          location_lat: number | null
          location_lng: number | null
          location_name: string | null
          material_type_id: string
          notes: string | null
          quantity: number
          user_id: string
        }
        Insert: {
          batch_id?: string
          collected_at?: string
          created_at?: string
          id?: string
          location_lat?: number | null
          location_lng?: number | null
          location_name?: string | null
          material_type_id: string
          notes?: string | null
          quantity: number
          user_id: string
        }
        Update: {
          batch_id?: string
          collected_at?: string
          created_at?: string
          id?: string
          location_lat?: number | null
          location_lng?: number | null
          location_name?: string | null
          material_type_id?: string
          notes?: string | null
          quantity?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collections_material_type_id_fkey"
            columns: ["material_type_id"]
            isOneToOne: false
            referencedRelation: "material_types"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_documents: {
        Row: {
          created_at: string
          document_name: string
          document_type: string
          file_type: string | null
          file_url: string
          id: string
          notes: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          document_name: string
          document_type: string
          file_type?: string | null
          file_url: string
          id?: string
          notes?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          document_name?: string
          document_type?: string
          file_type?: string | null
          file_url?: string
          id?: string
          notes?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      material_types: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          name: string
          price_per_unit: number
          unit: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          price_per_unit?: number
          unit?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          price_per_unit?: number
          unit?: string
          updated_at?: string
        }
        Relationships: []
      }
      ngo_program_documents: {
        Row: {
          created_at: string
          file_type: string | null
          file_url: string
          id: string
          name: string
          ngo_user_id: string
          program_id: string
        }
        Insert: {
          created_at?: string
          file_type?: string | null
          file_url: string
          id?: string
          name: string
          ngo_user_id: string
          program_id: string
        }
        Update: {
          created_at?: string
          file_type?: string | null
          file_url?: string
          id?: string
          name?: string
          ngo_user_id?: string
          program_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ngo_program_documents_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "ngo_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      ngo_programs: {
        Row: {
          budget: number
          county: string | null
          created_at: string
          description: string | null
          end_date: string
          funder: string | null
          id: string
          name: string
          ngo_user_id: string
          recovered_kg: number
          spent: number
          start_date: string
          status: string
          target_kg: number
          updated_at: string
        }
        Insert: {
          budget?: number
          county?: string | null
          created_at?: string
          description?: string | null
          end_date: string
          funder?: string | null
          id?: string
          name: string
          ngo_user_id: string
          recovered_kg?: number
          spent?: number
          start_date: string
          status?: string
          target_kg?: number
          updated_at?: string
        }
        Update: {
          budget?: number
          county?: string | null
          created_at?: string
          description?: string | null
          end_date?: string
          funder?: string | null
          id?: string
          name?: string
          ngo_user_id?: string
          recovered_kg?: number
          spent?: number
          start_date?: string
          status?: string
          target_kg?: number
          updated_at?: string
        }
        Relationships: []
      }
      ngo_sponsorships: {
        Row: {
          amount_allocated: number
          amount_disbursed: number
          community: string | null
          county: string | null
          created_at: string
          fund_type: string
          id: string
          ngo_user_id: string
          notes: string | null
          picker_profile_id: string
          status: string
          updated_at: string
        }
        Insert: {
          amount_allocated?: number
          amount_disbursed?: number
          community?: string | null
          county?: string | null
          created_at?: string
          fund_type?: string
          id?: string
          ngo_user_id: string
          notes?: string | null
          picker_profile_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount_allocated?: number
          amount_disbursed?: number
          community?: string | null
          county?: string | null
          created_at?: string
          fund_type?: string
          id?: string
          ngo_user_id?: string
          notes?: string | null
          picker_profile_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ngo_sponsorships_picker_profile_id_fkey"
            columns: ["picker_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          description: string | null
          id: string
          logo_url: string | null
          name: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          logo_url?: string | null
          name: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          checkout_request_id: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          id: string
          merchant_request_id: string | null
          mpesa_receipt_number: string | null
          phone_number: string
          result_description: string | null
          status: string
          user_id: string
        }
        Insert: {
          amount: number
          checkout_request_id?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          merchant_request_id?: string | null
          mpesa_receipt_number?: string | null
          phone_number: string
          result_description?: string | null
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          checkout_request_id?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          merchant_request_id?: string | null
          mpesa_receipt_number?: string | null
          phone_number?: string
          result_description?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      pickup_schedules: {
        Row: {
          created_at: string
          id: string
          location_lat: number | null
          location_lng: number | null
          location_name: string
          notes: string | null
          scheduled_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          location_lat?: number | null
          location_lng?: number | null
          location_name: string
          notes?: string | null
          scheduled_at: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          location_lat?: number | null
          location_lng?: number | null
          location_name?: string
          notes?: string | null
          scheduled_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      plastic_declarations: {
        Row: {
          created_at: string
          id: string
          material_type: string
          notes: string | null
          period_end: string
          period_start: string
          period_type: string
          quantity_kg: number
          recovery_obligation_kg: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          material_type: string
          notes?: string | null
          period_end: string
          period_start: string
          period_type?: string
          quantity_kg?: number
          recovery_obligation_kg?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          material_type?: string
          notes?: string | null
          period_end?: string
          period_start?: string
          period_type?: string
          quantity_kg?: number
          recovery_obligation_kg?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          approval_status: Database["public"]["Enums"]["approval_status"]
          avatar_url: string | null
          company_registration: string | null
          created_at: string
          date_of_birth: string | null
          email: string | null
          full_name: string
          gender: string | null
          id: string
          is_independent: boolean | null
          national_id: string | null
          organization_id: string | null
          phone_number: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          approval_status?: Database["public"]["Enums"]["approval_status"]
          avatar_url?: string | null
          company_registration?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          full_name: string
          gender?: string | null
          id?: string
          is_independent?: boolean | null
          national_id?: string | null
          organization_id?: string | null
          phone_number?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          approval_status?: Database["public"]["Enums"]["approval_status"]
          avatar_url?: string | null
          company_registration?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          is_independent?: boolean | null
          national_id?: string | null
          organization_id?: string | null
          phone_number?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      program_applications: {
        Row: {
          applicant_name: string
          applicant_role: string
          created_at: string
          id: string
          message: string | null
          program_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          applicant_name: string
          applicant_role: string
          created_at?: string
          id?: string
          message?: string | null
          program_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          applicant_name?: string
          applicant_role?: string
          created_at?: string
          id?: string
          message?: string | null
          program_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_applications_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "ngo_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      recovery_commitments: {
        Row: {
          created_at: string
          funded_amount: number
          id: string
          notes: string | null
          recovered_kg: number
          status: string
          target_aggregator_id: string | null
          target_county: string | null
          target_kg: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          funded_amount?: number
          id?: string
          notes?: string | null
          recovered_kg?: number
          status?: string
          target_aggregator_id?: string | null
          target_county?: string | null
          target_kg?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          funded_amount?: number
          id?: string
          notes?: string | null
          recovered_kg?: number
          status?: string
          target_aggregator_id?: string | null
          target_county?: string | null
          target_kg?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recovery_commitments_target_aggregator_id_fkey"
            columns: ["target_aggregator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      recovery_tracking: {
        Row: {
          collection_id: string
          commitment_id: string
          created_at: string
          id: string
          recycled: boolean
          recycled_at: string | null
          verified: boolean
          verified_at: string | null
        }
        Insert: {
          collection_id: string
          commitment_id: string
          created_at?: string
          id?: string
          recycled?: boolean
          recycled_at?: string | null
          verified?: boolean
          verified_at?: string | null
        }
        Update: {
          collection_id?: string
          commitment_id?: string
          created_at?: string
          id?: string
          recycled?: boolean
          recycled_at?: string | null
          verified?: boolean
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recovery_tracking_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recovery_tracking_commitment_id_fkey"
            columns: ["commitment_id"]
            isOneToOne: false
            referencedRelation: "recovery_commitments"
            referencedColumns: ["id"]
          },
        ]
      }
      recycler_orders: {
        Row: {
          created_at: string
          delivery_date: string | null
          id: string
          material_type: string
          notes: string | null
          order_date: string
          quantity: number
          status: string
          supplier_name: string
          total_amount: number
          unit: string
          unit_price: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          delivery_date?: string | null
          id?: string
          material_type: string
          notes?: string | null
          order_date?: string
          quantity?: number
          status?: string
          supplier_name: string
          total_amount?: number
          unit?: string
          unit_price?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          delivery_date?: string | null
          id?: string
          material_type?: string
          notes?: string | null
          order_date?: string
          quantity?: number
          status?: string
          supplier_name?: string
          total_amount?: number
          unit?: string
          unit_price?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      recycler_products: {
        Row: {
          created_at: string
          description: string | null
          id: string
          material_source: string | null
          name: string
          price_per_unit: number
          status: string
          stock_quantity: number
          unit: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          material_source?: string | null
          name: string
          price_per_unit?: number
          status?: string
          stock_quantity?: number
          unit?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          material_source?: string | null
          name?: string
          price_per_unit?: number
          status?: string
          stock_quantity?: number
          unit?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      training_resources: {
        Row: {
          category: string
          content_url: string | null
          created_at: string
          description: string | null
          duration_minutes: number | null
          id: string
          thumbnail_url: string | null
          title: string
        }
        Insert: {
          category?: string
          content_url?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          thumbnail_url?: string | null
          title: string
        }
        Update: {
          category?: string
          content_url?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          thumbnail_url?: string | null
          title?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "waste_picker"
        | "aggregator"
        | "recycler"
        | "ngo"
        | "corporate"
        | "county_government"
        | "admin"
      approval_status: "pending" | "approved" | "rejected"
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
      app_role: [
        "waste_picker",
        "aggregator",
        "recycler",
        "ngo",
        "corporate",
        "county_government",
        "admin",
      ],
      approval_status: ["pending", "approved", "rejected"],
    },
  },
} as const
