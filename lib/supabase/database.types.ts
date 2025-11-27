// This file will be auto-generated from Supabase
// For now, we'll define basic types

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
      profiles: {
        Row: {
          id: string;
          username: string;
          role: "super_admin" | "branch_admin" | "staff";
          branch_id: string | null;
          full_name: string;
          phone: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["profiles"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
      };
      branches: {
        Row: {
          id: string;
          name: string;
          address: string;
          phone: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["branches"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["branches"]["Insert"]>;
      };
      customers: {
        Row: {
          id: string;
          name: string;
          phone: string;
          email: string | null;
          address: string | null;
          id_proof_url: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["customers"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["customers"]["Insert"]>;
      };
      orders: {
        Row: {
          id: string;
          branch_id: string;
          staff_id: string;
          customer_id: string;
          invoice_number: string;
          start_date: string;
          end_date: string;
          status: "active" | "pending_return" | "completed";
          total_amount: number;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["orders"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["orders"]["Insert"]>;
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          photo_url: string;
          product_name: string | null;
          quantity: number;
          price_per_day: number;
          days: number;
          line_total: number;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["order_items"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["order_items"]["Insert"]>;
      };
    };
  };
}

