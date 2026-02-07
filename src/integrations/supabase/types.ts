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
      chat_messages: {
        Row: {
          attachments: Json | null
          chat_id: string
          created_at: string
          event_id: string
          id: string
          sender: string
          sent_at: string
          text: string | null
        }
        Insert: {
          attachments?: Json | null
          chat_id: string
          created_at?: string
          event_id: string
          id?: string
          sender?: string
          sent_at?: string
          text?: string | null
        }
        Update: {
          attachments?: Json | null
          chat_id?: string
          created_at?: string
          event_id?: string
          id?: string
          sender?: string
          sent_at?: string
          text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["chat_id"]
          },
        ]
      }
      chats: {
        Row: {
          chat_id: string
          client_name: string
          created_at: string
          id: string
          is_read: boolean
          last_message_at: string | null
          last_message_text: string | null
          product_name: string
          product_nm_id: number | null
          reply_sign: string | null
          updated_at: string
        }
        Insert: {
          chat_id: string
          client_name?: string
          created_at?: string
          id?: string
          is_read?: boolean
          last_message_at?: string | null
          last_message_text?: string | null
          product_name?: string
          product_nm_id?: number | null
          reply_sign?: string | null
          updated_at?: string
        }
        Update: {
          chat_id?: string
          client_name?: string
          created_at?: string
          id?: string
          is_read?: boolean
          last_message_at?: string | null
          last_message_text?: string | null
          product_name?: string
          product_nm_id?: number | null
          reply_sign?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          ai_draft: string | null
          author_name: string
          created_date: string
          fetched_at: string
          has_video: boolean
          id: string
          photo_links: Json | null
          product_article: string
          product_name: string
          rating: number
          sent_answer: string | null
          status: string
          text: string | null
          updated_at: string
          wb_id: string
        }
        Insert: {
          ai_draft?: string | null
          author_name?: string
          created_date?: string
          fetched_at?: string
          has_video?: boolean
          id?: string
          photo_links?: Json | null
          product_article?: string
          product_name?: string
          rating: number
          sent_answer?: string | null
          status?: string
          text?: string | null
          updated_at?: string
          wb_id: string
        }
        Update: {
          ai_draft?: string | null
          author_name?: string
          created_date?: string
          fetched_at?: string
          has_video?: boolean
          id?: string
          photo_links?: Json | null
          product_article?: string
          product_name?: string
          rating?: number
          sent_answer?: string | null
          status?: string
          text?: string | null
          updated_at?: string
          wb_id?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          ai_prompt_template: string
          auto_reply_enabled: boolean
          id: string
          last_sync_at: string | null
          reply_modes: Json
          wb_api_key: string | null
        }
        Insert: {
          ai_prompt_template?: string
          auto_reply_enabled?: boolean
          id?: string
          last_sync_at?: string | null
          reply_modes?: Json
          wb_api_key?: string | null
        }
        Update: {
          ai_prompt_template?: string
          auto_reply_enabled?: boolean
          id?: string
          last_sync_at?: string | null
          reply_modes?: Json
          wb_api_key?: string | null
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
      [_ in never]: never
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
    Enums: {},
  },
} as const
