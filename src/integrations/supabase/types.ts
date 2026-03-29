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
      aggregator_purchase_orders: {
        Row: {
          created_at: string
          delivered_at: string | null
          delivered_quantity: number | null
          delivery_notes: string | null
          expected_delivery_date: string | null
          grn_number: string | null
          id: string
          material_type: string
          notes: string | null
          order_date: string
          po_number: string
          quantity: number
          status: string
          supplier_name: string
          supplier_phone: string | null
          supplier_role: string | null
          total_amount: number
          unit: string
          unit_price: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          delivered_at?: string | null
          delivered_quantity?: number | null
          delivery_notes?: string | null
          expected_delivery_date?: string | null
          grn_number?: string | null
          id?: string
          material_type: string
          notes?: string | null
          order_date?: string
          po_number?: string
          quantity?: number
          status?: string
          supplier_name: string
          supplier_phone?: string | null
          supplier_role?: string | null
          total_amount?: number
          unit?: string
          unit_price?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          delivered_at?: string | null
          delivered_quantity?: number | null
          delivery_notes?: string | null
          expected_delivery_date?: string | null
          grn_number?: string | null
          id?: string
          material_type?: string
          notes?: string | null
          order_date?: string
          po_number?: string
          quantity?: number
          status?: string
          supplier_name?: string
          supplier_phone?: string | null
          supplier_role?: string | null
          total_amount?: number
          unit?: string
          unit_price?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      balance_sheet_items: {
        Row: {
          account_name: string
          amount: number
          created_at: string
          id: string
          is_auto: boolean
          notes: string | null
          section: string
          sub_section: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_name: string
          amount?: number
          created_at?: string
          id?: string
          is_auto?: boolean
          notes?: string | null
          section?: string
          sub_section?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_name?: string
          amount?: number
          created_at?: string
          id?: string
          is_auto?: boolean
          notes?: string | null
          section?: string
          sub_section?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      cleanup_exercises: {
        Row: {
          after_photos: string[] | null
          before_photos: string[] | null
          cleanup_date: string
          created_at: string
          during_photos: string[] | null
          end_time: string
          environmental_issues: string | null
          fishing_nets_kg: number | null
          glass_kg: number | null
          hdpe_kg: number | null
          id: string
          lead_organizer: string
          location_lat: number | null
          location_lng: number | null
          location_name: string
          location_type: string
          metal_kg: number | null
          non_recyclable_waste_kg: number
          num_bags: number
          num_partner_orgs: number
          num_volunteers: number
          num_waste_pickers: number
          observations: string | null
          other_materials_kg: number | null
          pet_bottles_kg: number | null
          plastic_waste_kg: number
          recommendations: string | null
          recyclable_waste_kg: number
          sachets_kg: number | null
          start_time: string
          status: string
          title: string
          total_waste_kg: number
          transport_method: string | null
          updated_at: string
          user_id: string
          waste_destination: string | null
          waste_sorted: boolean | null
        }
        Insert: {
          after_photos?: string[] | null
          before_photos?: string[] | null
          cleanup_date: string
          created_at?: string
          during_photos?: string[] | null
          end_time: string
          environmental_issues?: string | null
          fishing_nets_kg?: number | null
          glass_kg?: number | null
          hdpe_kg?: number | null
          id?: string
          lead_organizer: string
          location_lat?: number | null
          location_lng?: number | null
          location_name: string
          location_type?: string
          metal_kg?: number | null
          non_recyclable_waste_kg?: number
          num_bags?: number
          num_partner_orgs?: number
          num_volunteers?: number
          num_waste_pickers?: number
          observations?: string | null
          other_materials_kg?: number | null
          pet_bottles_kg?: number | null
          plastic_waste_kg?: number
          recommendations?: string | null
          recyclable_waste_kg?: number
          sachets_kg?: number | null
          start_time: string
          status?: string
          title: string
          total_waste_kg?: number
          transport_method?: string | null
          updated_at?: string
          user_id: string
          waste_destination?: string | null
          waste_sorted?: boolean | null
        }
        Update: {
          after_photos?: string[] | null
          before_photos?: string[] | null
          cleanup_date?: string
          created_at?: string
          during_photos?: string[] | null
          end_time?: string
          environmental_issues?: string | null
          fishing_nets_kg?: number | null
          glass_kg?: number | null
          hdpe_kg?: number | null
          id?: string
          lead_organizer?: string
          location_lat?: number | null
          location_lng?: number | null
          location_name?: string
          location_type?: string
          metal_kg?: number | null
          non_recyclable_waste_kg?: number
          num_bags?: number
          num_partner_orgs?: number
          num_volunteers?: number
          num_waste_pickers?: number
          observations?: string | null
          other_materials_kg?: number | null
          pet_bottles_kg?: number | null
          plastic_waste_kg?: number
          recommendations?: string | null
          recyclable_waste_kg?: number
          sachets_kg?: number | null
          start_time?: string
          status?: string
          title?: string
          total_waste_kg?: number
          transport_method?: string | null
          updated_at?: string
          user_id?: string
          waste_destination?: string | null
          waste_sorted?: boolean | null
        }
        Relationships: []
      }
      cleanup_participants: {
        Row: {
          cleanup_id: string
          created_at: string
          email: string | null
          full_name: string
          id: string
          notes: string | null
          organization_name: string | null
          phone_number: string | null
          role_title: string | null
        }
        Insert: {
          cleanup_id: string
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          notes?: string | null
          organization_name?: string | null
          phone_number?: string | null
          role_title?: string | null
        }
        Update: {
          cleanup_id?: string
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          notes?: string | null
          organization_name?: string | null
          phone_number?: string | null
          role_title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cleanup_participants_cleanup_id_fkey"
            columns: ["cleanup_id"]
            isOneToOne: false
            referencedRelation: "cleanup_exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      cleanup_partners: {
        Row: {
          cleanup_id: string
          created_at: string
          id: string
          organization_id: string
        }
        Insert: {
          cleanup_id: string
          created_at?: string
          id?: string
          organization_id: string
        }
        Update: {
          cleanup_id?: string
          created_at?: string
          id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cleanup_partners_cleanup_id_fkey"
            columns: ["cleanup_id"]
            isOneToOne: false
            referencedRelation: "cleanup_exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cleanup_partners_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      client_collections: {
        Row: {
          client_email: string | null
          client_name: string
          client_phone: string | null
          collection_date: string
          created_at: string
          id: string
          location_name: string | null
          material_type: string
          notes: string | null
          quantity_kg: number
          status: string
          total_amount: number
          unit_price: number
          updated_at: string
          waste_picker_id: string
        }
        Insert: {
          client_email?: string | null
          client_name: string
          client_phone?: string | null
          collection_date?: string
          created_at?: string
          id?: string
          location_name?: string | null
          material_type: string
          notes?: string | null
          quantity_kg?: number
          status?: string
          total_amount?: number
          unit_price?: number
          updated_at?: string
          waste_picker_id: string
        }
        Update: {
          client_email?: string | null
          client_name?: string
          client_phone?: string | null
          collection_date?: string
          created_at?: string
          id?: string
          location_name?: string | null
          material_type?: string
          notes?: string | null
          quantity_kg?: number
          status?: string
          total_amount?: number
          unit_price?: number
          updated_at?: string
          waste_picker_id?: string
        }
        Relationships: []
      }
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
      customers: {
        Row: {
          category: string
          created_at: string
          email: string | null
          full_name: string
          id: string
          last_transaction_date: string | null
          location: string | null
          notes: string | null
          phone: string | null
          total_revenue: number
          total_transactions: number
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          last_transaction_date?: string | null
          location?: string | null
          notes?: string | null
          phone?: string | null
          total_revenue?: number
          total_transactions?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          last_transaction_date?: string | null
          location?: string | null
          notes?: string | null
          phone?: string | null
          total_revenue?: number
          total_transactions?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      financial_budgets: {
        Row: {
          amount: number
          category_id: string | null
          created_at: string
          id: string
          period_start: string
          period_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          category_id?: string | null
          created_at?: string
          id?: string
          period_start?: string
          period_type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string
          id?: string
          period_start?: string
          period_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_budgets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "financial_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_categories: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          is_system: boolean
          name: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          is_system?: boolean
          name: string
          type?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          is_system?: boolean
          name?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      financial_transactions: {
        Row: {
          amount: number
          category_id: string | null
          created_at: string
          description: string | null
          id: string
          payment_method: string | null
          receipt_url: string | null
          reference_number: string | null
          transaction_date: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          payment_method?: string | null
          receipt_url?: string | null
          reference_number?: string | null
          transaction_date?: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          payment_method?: string | null
          receipt_url?: string | null
          reference_number?: string | null
          transaction_date?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "financial_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      material_transformations: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          status: string
          transformation_date: string
          transformation_type: string
          updated_at: string
          user_id: string
          yield_percentage: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          status?: string
          transformation_date?: string
          transformation_type?: string
          updated_at?: string
          user_id: string
          yield_percentage?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          status?: string
          transformation_date?: string
          transformation_type?: string
          updated_at?: string
          user_id?: string
          yield_percentage?: number | null
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
      pickup_requests: {
        Row: {
          created_at: string
          id: string
          location_name: string | null
          material_type: string
          notes: string | null
          proposed_price_per_kg: number | null
          quantity_kg: number
          responded_at: string | null
          response_notes: string | null
          scheduled_date: string | null
          status: string
          target_role: string
          target_user_id: string
          total_amount: number | null
          updated_at: string
          waste_picker_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          location_name?: string | null
          material_type: string
          notes?: string | null
          proposed_price_per_kg?: number | null
          quantity_kg?: number
          responded_at?: string | null
          response_notes?: string | null
          scheduled_date?: string | null
          status?: string
          target_role?: string
          target_user_id: string
          total_amount?: number | null
          updated_at?: string
          waste_picker_id: string
        }
        Update: {
          created_at?: string
          id?: string
          location_name?: string | null
          material_type?: string
          notes?: string | null
          proposed_price_per_kg?: number | null
          quantity_kg?: number
          responded_at?: string | null
          response_notes?: string | null
          scheduled_date?: string | null
          status?: string
          target_role?: string
          target_user_id?: string
          total_amount?: number | null
          updated_at?: string
          waste_picker_id?: string
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
          area_of_operation: string | null
          avatar_url: string | null
          bank_account_number: string | null
          bank_name: string | null
          company_registration: string | null
          county: string | null
          created_at: string
          daily_capacity_kg: number | null
          date_of_birth: string | null
          email: string | null
          full_name: string
          gender: string | null
          id: string
          industry_sector: string | null
          is_independent: boolean | null
          kra_pin: string | null
          monthly_capacity_kg: number | null
          mpesa_number: string | null
          national_id: string | null
          organization_id: string | null
          payment_method: string | null
          phone_number: string | null
          physical_address: string | null
          social_media_links: Json | null
          sub_county: string | null
          updated_at: string
          user_id: string
          waste_categories: string[] | null
          website: string | null
        }
        Insert: {
          approval_status?: Database["public"]["Enums"]["approval_status"]
          area_of_operation?: string | null
          avatar_url?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          company_registration?: string | null
          county?: string | null
          created_at?: string
          daily_capacity_kg?: number | null
          date_of_birth?: string | null
          email?: string | null
          full_name: string
          gender?: string | null
          id?: string
          industry_sector?: string | null
          is_independent?: boolean | null
          kra_pin?: string | null
          monthly_capacity_kg?: number | null
          mpesa_number?: string | null
          national_id?: string | null
          organization_id?: string | null
          payment_method?: string | null
          phone_number?: string | null
          physical_address?: string | null
          social_media_links?: Json | null
          sub_county?: string | null
          updated_at?: string
          user_id: string
          waste_categories?: string[] | null
          website?: string | null
        }
        Update: {
          approval_status?: Database["public"]["Enums"]["approval_status"]
          area_of_operation?: string | null
          avatar_url?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          company_registration?: string | null
          county?: string | null
          created_at?: string
          daily_capacity_kg?: number | null
          date_of_birth?: string | null
          email?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          industry_sector?: string | null
          is_independent?: boolean | null
          kra_pin?: string | null
          monthly_capacity_kg?: number | null
          mpesa_number?: string | null
          national_id?: string | null
          organization_id?: string | null
          payment_method?: string | null
          phone_number?: string | null
          physical_address?: string | null
          social_media_links?: Json | null
          sub_county?: string | null
          updated_at?: string
          user_id?: string
          waste_categories?: string[] | null
          website?: string | null
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
      subscriptions: {
        Row: {
          created_at: string
          discount_percent: number
          expires_at: string | null
          id: string
          plan_name: string
          plan_tier: string
          price_kes: number
          promo_code: string | null
          started_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          discount_percent?: number
          expires_at?: string | null
          id?: string
          plan_name: string
          plan_tier?: string
          price_kes?: number
          promo_code?: string | null
          started_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          discount_percent?: number
          expires_at?: string | null
          id?: string
          plan_name?: string
          plan_tier?: string
          price_kes?: number
          promo_code?: string | null
          started_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      suppliers: {
        Row: {
          category: string
          contact_person: string | null
          created_at: string
          email: string | null
          id: string
          last_order_date: string | null
          location: string | null
          material_types: string[] | null
          notes: string | null
          payment_terms: string | null
          phone: string | null
          platform_role: string | null
          platform_user_id: string | null
          supplier_name: string
          total_orders: number
          total_spent: number
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          last_order_date?: string | null
          location?: string | null
          material_types?: string[] | null
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          platform_role?: string | null
          platform_user_id?: string | null
          supplier_name: string
          total_orders?: number
          total_spent?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          last_order_date?: string | null
          location?: string | null
          material_types?: string[] | null
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          platform_role?: string | null
          platform_user_id?: string | null
          supplier_name?: string
          total_orders?: number
          total_spent?: number
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
          created_by_user_id: string | null
          creator_role: string
          description: string | null
          duration_minutes: number | null
          id: string
          status: string
          target_roles: string[]
          thumbnail_url: string | null
          title: string
          training_date: string | null
          training_time: string | null
          training_type: string
          updated_at: string
          venue: string | null
        }
        Insert: {
          category?: string
          content_url?: string | null
          created_at?: string
          created_by_user_id?: string | null
          creator_role?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          status?: string
          target_roles?: string[]
          thumbnail_url?: string | null
          title: string
          training_date?: string | null
          training_time?: string | null
          training_type?: string
          updated_at?: string
          venue?: string | null
        }
        Update: {
          category?: string
          content_url?: string | null
          created_at?: string
          created_by_user_id?: string | null
          creator_role?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          status?: string
          target_roles?: string[]
          thumbnail_url?: string | null
          title?: string
          training_date?: string | null
          training_time?: string | null
          training_type?: string
          updated_at?: string
          venue?: string | null
        }
        Relationships: []
      }
      transformation_inputs: {
        Row: {
          created_at: string
          id: string
          material_name: string
          material_type_id: string | null
          quantity: number
          transformation_id: string
          unit: string
        }
        Insert: {
          created_at?: string
          id?: string
          material_name: string
          material_type_id?: string | null
          quantity?: number
          transformation_id: string
          unit?: string
        }
        Update: {
          created_at?: string
          id?: string
          material_name?: string
          material_type_id?: string | null
          quantity?: number
          transformation_id?: string
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "transformation_inputs_material_type_id_fkey"
            columns: ["material_type_id"]
            isOneToOne: false
            referencedRelation: "material_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transformation_inputs_transformation_id_fkey"
            columns: ["transformation_id"]
            isOneToOne: false
            referencedRelation: "material_transformations"
            referencedColumns: ["id"]
          },
        ]
      }
      transformation_outputs: {
        Row: {
          created_at: string
          id: string
          product_id: string | null
          product_name: string
          quantity: number
          transformation_id: string
          unit: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id?: string | null
          product_name: string
          quantity?: number
          transformation_id: string
          unit?: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          transformation_id?: string
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "transformation_outputs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "recycler_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transformation_outputs_transformation_id_fkey"
            columns: ["transformation_id"]
            isOneToOne: false
            referencedRelation: "material_transformations"
            referencedColumns: ["id"]
          },
        ]
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
      can_view_cleanup:
        | {
            Args: {
              _cleanup_id: string
              _cleanup_owner_id: string
              _user_id: string
            }
            Returns: boolean
          }
        | { Args: { _cleanup_id: string; _user_id: string }; Returns: boolean }
      get_platform_stats: { Args: never; Returns: Json }
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
      is_cleanup_owner: {
        Args: { _cleanup_id: string; _user_id: string }
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
