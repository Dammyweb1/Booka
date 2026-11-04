export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      businesses: {
        Row: {
          id: string
          owner_id: string
          slug: string
          name: string
          business_type: 'Barbing' | 'Hairdressing' | 'Spa'
          owner_first_name: string
          owner_last_name: string
          address: string
          city: string
          phone: string
          created_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          slug?: string
          name: string
          business_type: 'Barbing' | 'Hairdressing' | 'Spa'
          owner_first_name: string
          owner_last_name: string
          address: string
          city: string
          phone: string
          created_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          slug?: string
          name?: string
          business_type?: 'Barbing' | 'Hairdressing' | 'Spa'
          owner_first_name?: string
          owner_last_name?: string
          address?: string
          city?: string
          phone?: string
          created_at?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          id: string
          business_id: string
          name: string
          duration_minutes: number
          price_naira: number
          tone: 'gold' | 'teal' | 'rose'
          active: boolean
          image_path: string | null
          created_at: string
        }
        Insert: {
          id?: string
          business_id: string
          name: string
          duration_minutes: number
          price_naira: number
          tone?: 'gold' | 'teal' | 'rose'
          active?: boolean
          image_path?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          business_id?: string
          name?: string
          duration_minutes?: number
          price_naira?: number
          tone?: 'gold' | 'teal' | 'rose'
          active?: boolean
          image_path?: string | null
          created_at?: string
        }
        Relationships: []
      }
      bookings: {
        Row: {
          id: string
          business_id: string
          service_id: string | null
          customer_name: string
          customer_email: string
          customer_phone: string
          starts_at: string
          status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          business_id: string
          service_id?: string | null
          customer_name: string
          customer_email: string
          customer_phone: string
          starts_at: string
          status?: 'pending' | 'confirmed' | 'completed' | 'cancelled'
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          business_id?: string
          service_id?: string | null
          customer_name?: string
          customer_email?: string
          customer_phone?: string
          starts_at?: string
          status?: 'pending' | 'confirmed' | 'completed' | 'cancelled'
          notes?: string | null
          created_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          id: string
          booking_id: string
          business_id: string
          service_id: string | null
          service_name: string
          customer_name: string
          customer_email: string
          amount_naira: number
          status: 'awaiting_payment' | 'initialized' | 'success' | 'failed' | 'abandoned'
          provider: 'paystack'
          paystack_reference: string
          paystack_access_code: string | null
          authorization_url: string | null
          channel: string | null
          transaction_id: string | null
          paid_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          booking_id: string
          business_id: string
          service_id?: string | null
          service_name: string
          customer_name: string
          customer_email: string
          amount_naira: number
          status?: 'awaiting_payment' | 'initialized' | 'success' | 'failed' | 'abandoned'
          provider?: 'paystack'
          paystack_reference: string
          paystack_access_code?: string | null
          authorization_url?: string | null
          channel?: string | null
          transaction_id?: string | null
          paid_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          booking_id?: string
          business_id?: string
          service_id?: string | null
          service_name?: string
          customer_name?: string
          customer_email?: string
          amount_naira?: number
          status?: 'awaiting_payment' | 'initialized' | 'success' | 'failed' | 'abandoned'
          provider?: 'paystack'
          paystack_reference?: string
          paystack_access_code?: string | null
          authorization_url?: string | null
          channel?: string | null
          transaction_id?: string | null
          paid_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      create_public_booking: {
        Args: {
          p_business_id: string
          p_service_id: string
          p_customer_name: string
          p_customer_email: string
          p_customer_phone: string
          p_starts_at: string
          p_notes?: string | null
        }
        Returns: string
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
