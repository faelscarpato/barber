export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15";
  };
  public: {
    Tables: {
      appointment_status_history: {
        Row: {
          appointment_id: string;
          changed_by: string | null;
          created_at: string;
          from_status: Database["public"]["Enums"]["appointment_status"] | null;
          id: string;
          to_status: Database["public"]["Enums"]["appointment_status"];
        };
        Insert: {
          appointment_id: string;
          changed_by?: string | null;
          created_at?: string;
          from_status?: Database["public"]["Enums"]["appointment_status"] | null;
          id?: string;
          to_status: Database["public"]["Enums"]["appointment_status"];
        };
        Update: {
          appointment_id?: string;
          changed_by?: string | null;
          created_at?: string;
          from_status?: Database["public"]["Enums"]["appointment_status"] | null;
          id?: string;
          to_status?: Database["public"]["Enums"]["appointment_status"];
        };
        Relationships: [
          {
            foreignKeyName: "appointment_status_history_appointment_id_fkey";
            columns: ["appointment_id"];
            isOneToOne: false;
            referencedRelation: "appointments";
            referencedColumns: ["id"];
          },
        ];
      };
      appointments: {
        Row: {
          barber_id: string;
          barber_reminder_sent_at: string | null;
          client_id: string;
          created_at: string;
          ends_at: string;
          id: string;
          notes: string;
          paid_cents: number;
          payment_status: Database["public"]["Enums"]["payment_status"];
          price_cents: number;
          reminder_sent_at: string | null;
          service_id: string;
          source: string;
          starts_at: string;
          status: Database["public"]["Enums"]["appointment_status"];
          updated_at: string;
        };
        Insert: {
          barber_id: string;
          barber_reminder_sent_at?: string | null;
          client_id: string;
          created_at?: string;
          ends_at: string;
          id?: string;
          notes?: string;
          paid_cents?: number;
          payment_status?: Database["public"]["Enums"]["payment_status"];
          price_cents?: number;
          reminder_sent_at?: string | null;
          service_id: string;
          source?: string;
          starts_at: string;
          status?: Database["public"]["Enums"]["appointment_status"];
          updated_at?: string;
        };
        Update: {
          barber_id?: string;
          barber_reminder_sent_at?: string | null;
          client_id?: string;
          created_at?: string;
          ends_at?: string;
          id?: string;
          notes?: string;
          paid_cents?: number;
          payment_status?: Database["public"]["Enums"]["payment_status"];
          price_cents?: number;
          reminder_sent_at?: string | null;
          service_id?: string;
          source?: string;
          starts_at?: string;
          status?: Database["public"]["Enums"]["appointment_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "appointments_barber_id_fkey";
            columns: ["barber_id"];
            isOneToOne: false;
            referencedRelation: "barbers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "appointments_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "appointments_service_id_fkey";
            columns: ["service_id"];
            isOneToOne: false;
            referencedRelation: "services";
            referencedColumns: ["id"];
          },
        ];
      };
      automation_settings: {
        Row: {
          barber_notify_phone: string;
          created_at: string;
          daily_agenda_hour: number;
          id: string;
          notify_barber_on_create: boolean;
          notify_client_on_create: boolean;
          notify_on_cancel: boolean;
          notify_on_payment: boolean;
          provider: string;
          reminder_barber_daily_enabled: boolean;
          reminder_barber_enabled: boolean;
          reminder_client_enabled: boolean;
          reminder_lead_minutes: number;
          updated_at: string;
        };
        Insert: {
          barber_notify_phone?: string;
          created_at?: string;
          daily_agenda_hour?: number;
          id?: string;
          notify_barber_on_create?: boolean;
          notify_client_on_create?: boolean;
          notify_on_cancel?: boolean;
          notify_on_payment?: boolean;
          provider?: string;
          reminder_barber_daily_enabled?: boolean;
          reminder_barber_enabled?: boolean;
          reminder_client_enabled?: boolean;
          reminder_lead_minutes?: number;
          updated_at?: string;
        };
        Update: {
          barber_notify_phone?: string;
          created_at?: string;
          daily_agenda_hour?: number;
          id?: string;
          notify_barber_on_create?: boolean;
          notify_client_on_create?: boolean;
          notify_on_cancel?: boolean;
          notify_on_payment?: boolean;
          provider?: string;
          reminder_barber_daily_enabled?: boolean;
          reminder_barber_enabled?: boolean;
          reminder_client_enabled?: boolean;
          reminder_lead_minutes?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      barber_services: {
        Row: {
          barber_id: string;
          service_id: string;
        };
        Insert: {
          barber_id: string;
          service_id: string;
        };
        Update: {
          barber_id?: string;
          service_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "barber_services_barber_id_fkey";
            columns: ["barber_id"];
            isOneToOne: false;
            referencedRelation: "barbers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "barber_services_service_id_fkey";
            columns: ["service_id"];
            isOneToOne: false;
            referencedRelation: "services";
            referencedColumns: ["id"];
          },
        ];
      };
      barbers: {
        Row: {
          active: boolean;
          bio: string | null;
          created_at: string;
          id: string;
          name: string;
          phone: string | null;
          photo_url: string | null;
          profile_id: string | null;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          bio?: string | null;
          created_at?: string;
          id?: string;
          name: string;
          phone?: string | null;
          photo_url?: string | null;
          profile_id?: string | null;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          bio?: string | null;
          created_at?: string;
          id?: string;
          name?: string;
          phone?: string | null;
          photo_url?: string | null;
          profile_id?: string | null;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "barbers_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      blocked_dates: {
        Row: {
          barber_id: string | null;
          block_date: string;
          created_at: string;
          end_time: string | null;
          id: string;
          reason: string;
          start_time: string | null;
        };
        Insert: {
          barber_id?: string | null;
          block_date: string;
          created_at?: string;
          end_time?: string | null;
          id?: string;
          reason?: string;
          start_time?: string | null;
        };
        Update: {
          barber_id?: string | null;
          block_date?: string;
          created_at?: string;
          end_time?: string | null;
          id?: string;
          reason?: string;
          start_time?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "blocked_dates_barber_id_fkey";
            columns: ["barber_id"];
            isOneToOne: false;
            referencedRelation: "barbers";
            referencedColumns: ["id"];
          },
        ];
      };
      business_settings: {
        Row: {
          address_line: string;
          cancellation_policy: string;
          city: string;
          created_at: string;
          id: string;
          instagram_url: string | null;
          logo_url: string | null;
          maps_url: string | null;
          max_advance_days: number;
          min_lead_minutes: number;
          name: string;
          opening_hours_text: string;
          review_url: string | null;
          slot_step_minutes: number;
          tagline: string;
          updated_at: string;
          whatsapp_phone: string;
        };
        Insert: {
          address_line?: string;
          cancellation_policy?: string;
          city?: string;
          created_at?: string;
          id?: string;
          instagram_url?: string | null;
          logo_url?: string | null;
          maps_url?: string | null;
          max_advance_days?: number;
          min_lead_minutes?: number;
          name: string;
          opening_hours_text?: string;
          review_url?: string | null;
          slot_step_minutes?: number;
          tagline?: string;
          updated_at?: string;
          whatsapp_phone?: string;
        };
        Update: {
          address_line?: string;
          cancellation_policy?: string;
          city?: string;
          created_at?: string;
          id?: string;
          instagram_url?: string | null;
          logo_url?: string | null;
          maps_url?: string | null;
          max_advance_days?: number;
          min_lead_minutes?: number;
          name?: string;
          opening_hours_text?: string;
          review_url?: string | null;
          slot_step_minutes?: number;
          tagline?: string;
          updated_at?: string;
          whatsapp_phone?: string;
        };
        Relationships: [];
      };
      clients: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          notes: string;
          phone: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          notes?: string;
          phone: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          notes?: string;
          phone?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      payments: {
        Row: {
          amount_cents: number;
          appointment_id: string;
          created_at: string;
          created_by: string | null;
          id: string;
          method: Database["public"]["Enums"]["payment_method"];
          notes: string;
          paid_at: string;
        };
        Insert: {
          amount_cents: number;
          appointment_id: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          method: Database["public"]["Enums"]["payment_method"];
          notes?: string;
          paid_at?: string;
        };
        Update: {
          amount_cents?: number;
          appointment_id?: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          method?: Database["public"]["Enums"]["payment_method"];
          notes?: string;
          paid_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payments_appointment_id_fkey";
            columns: ["appointment_id"];
            isOneToOne: false;
            referencedRelation: "appointments";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          full_name: string;
          id: string;
          phone: string | null;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          full_name?: string;
          id: string;
          phone?: string | null;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          full_name?: string;
          id?: string;
          phone?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      services: {
        Row: {
          active: boolean;
          created_at: string;
          description: string;
          duration_minutes: number;
          id: string;
          name: string;
          price_cents: number;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          description?: string;
          duration_minutes: number;
          id?: string;
          name: string;
          price_cents: number;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          description?: string;
          duration_minutes?: number;
          id?: string;
          name?: string;
          price_cents?: number;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
      whatsapp_logs: {
        Row: {
          appointment_id: string | null;
          body: string;
          created_at: string;
          error: string | null;
          id: string;
          provider: string;
          status: string;
          template_key: string;
          to_phone: string;
        };
        Insert: {
          appointment_id?: string | null;
          body: string;
          created_at?: string;
          error?: string | null;
          id?: string;
          provider?: string;
          status?: string;
          template_key: string;
          to_phone: string;
        };
        Update: {
          appointment_id?: string | null;
          body?: string;
          created_at?: string;
          error?: string | null;
          id?: string;
          provider?: string;
          status?: string;
          template_key?: string;
          to_phone?: string;
        };
        Relationships: [
          {
            foreignKeyName: "whatsapp_logs_appointment_id_fkey";
            columns: ["appointment_id"];
            isOneToOne: false;
            referencedRelation: "appointments";
            referencedColumns: ["id"];
          },
        ];
      };
      whatsapp_templates: {
        Row: {
          body: string;
          created_at: string;
          enabled: boolean;
          id: string;
          key: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          body: string;
          created_at?: string;
          enabled?: boolean;
          id?: string;
          key: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          enabled?: boolean;
          id?: string;
          key?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      working_hours: {
        Row: {
          active: boolean;
          barber_id: string;
          break_end: string | null;
          break_start: string | null;
          created_at: string;
          end_time: string;
          id: string;
          start_time: string;
          updated_at: string;
          weekday: number;
        };
        Insert: {
          active?: boolean;
          barber_id: string;
          break_end?: string | null;
          break_start?: string | null;
          created_at?: string;
          end_time: string;
          id?: string;
          start_time: string;
          updated_at?: string;
          weekday: number;
        };
        Update: {
          active?: boolean;
          barber_id?: string;
          break_end?: string | null;
          break_start?: string | null;
          created_at?: string;
          end_time?: string;
          id?: string;
          start_time?: string;
          updated_at?: string;
          weekday?: number;
        };
        Relationships: [
          {
            foreignKeyName: "working_hours_barber_id_fkey";
            columns: ["barber_id"];
            isOneToOne: false;
            referencedRelation: "barbers";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      is_staff: { Args: { _user_id: string }; Returns: boolean };
    };
    Enums: {
      app_role: "admin" | "barber";
      appointment_status: "scheduled" | "confirmed" | "completed" | "cancelled" | "no_show";
      payment_method: "pix" | "cash" | "card";
      payment_status: "pending" | "partial" | "paid";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "barber"],
      appointment_status: ["scheduled", "confirmed", "completed", "cancelled", "no_show"],
      payment_method: ["pix", "cash", "card"],
      payment_status: ["pending", "partial", "paid"],
    },
  },
} as const;
