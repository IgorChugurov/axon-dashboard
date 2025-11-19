/**
 * Типы для Supabase Database
 * Обновляйте по мере добавления таблиц
 */

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
          email: string | null;
          first_name: string | null;
          last_name: string | null;
          avatar_url: string | null;
          role: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          first_name?: string | null;
          last_name?: string | null;
          avatar_url?: string | null;
          role?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          first_name?: string | null;
          last_name?: string | null;
          avatar_url?: string | null;
          role?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      admin_roles: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          created_at?: string;
        };
      };
      admins: {
        Row: {
          id: string;
          user_id: string;
          role_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          role_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          role_id?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      projects: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          status: string;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          status?: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          status?: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      entity_definition: {
        Row: {
          id: string;
          name: string;
          url: string;
          description: string | null;
          table_name: string;
          type: string;
          project_id: string;
          create_permission: string;
          read_permission: string;
          update_permission: string;
          delete_permission: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          url: string;
          description?: string | null;
          table_name: string;
          type: string;
          project_id: string;
          create_permission?: string;
          read_permission?: string;
          update_permission?: string;
          delete_permission?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          url?: string;
          description?: string | null;
          table_name?: string;
          type?: string;
          project_id?: string;
          create_permission?: string;
          read_permission?: string;
          update_permission?: string;
          delete_permission?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      field: {
        Row: {
          id: string;
          entity_definition_id: string;
          name: string;
          db_type: string;
          type: string;
          label: string;
          placeholder: string | null;
          description: string | null;
          for_edit_page: boolean;
          for_create_page: boolean;
          required: boolean;
          required_text: string | null;
          for_edit_page_disabled: boolean;
          display_index: number;
          display_in_table: boolean;
          is_option_title_field: boolean;
          searchable: boolean;
          related_entity_definition_id: string | null;
          relation_field_id: string | null;
          is_relation_source: boolean;
          selector_relation_id: string | null;
          default_string_value: string | null;
          default_number_value: number | null;
          default_boolean_value: boolean | null;
          default_date_value: string | null;
          auto_populate: boolean;
          include_in_single_pma: boolean;
          include_in_list_pma: boolean;
          include_in_single_sa: boolean;
          include_in_list_sa: boolean;
          relation_field_name: string | null;
          relation_field_label: string | null;
          foreign_key: string | null;
          foreign_key_value: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          entity_definition_id: string;
          name: string;
          db_type: string;
          type: string;
          label: string;
          placeholder?: string | null;
          description?: string | null;
          for_edit_page?: boolean;
          for_create_page?: boolean;
          required?: boolean;
          required_text?: string | null;
          for_edit_page_disabled?: boolean;
          display_index?: number;
          display_in_table?: boolean;
          is_option_title_field?: boolean;
          searchable?: boolean;
          related_entity_definition_id?: string | null;
          relation_field_id?: string | null;
          is_relation_source?: boolean;
          selector_relation_id?: string | null;
          default_string_value?: string | null;
          default_number_value?: number | null;
          default_boolean_value?: boolean | null;
          default_date_value?: string | null;
          auto_populate?: boolean;
          include_in_single_pma?: boolean;
          include_in_list_pma?: boolean;
          include_in_single_sa?: boolean;
          include_in_list_sa?: boolean;
          relation_field_name?: string | null;
          relation_field_label?: string | null;
          foreign_key?: string | null;
          foreign_key_value?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          entity_definition_id?: string;
          name?: string;
          db_type?: string;
          type?: string;
          label?: string;
          placeholder?: string | null;
          description?: string | null;
          for_edit_page?: boolean;
          for_create_page?: boolean;
          required?: boolean;
          required_text?: string | null;
          for_edit_page_disabled?: boolean;
          display_index?: number;
          display_in_table?: boolean;
          is_option_title_field?: boolean;
          searchable?: boolean;
          related_entity_definition_id?: string | null;
          relation_field_id?: string | null;
          is_relation_source?: boolean;
          selector_relation_id?: string | null;
          default_string_value?: string | null;
          default_number_value?: number | null;
          default_boolean_value?: boolean | null;
          default_date_value?: string | null;
          auto_populate?: boolean;
          include_in_single_pma?: boolean;
          include_in_list_pma?: boolean;
          include_in_single_sa?: boolean;
          include_in_list_sa?: boolean;
          relation_field_name?: string | null;
          relation_field_label?: string | null;
          foreign_key?: string | null;
          foreign_key_value?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      entity_instance: {
        Row: {
          id: string;
          entity_definition_id: string;
          project_id: string;
          data: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          entity_definition_id: string;
          project_id: string;
          data?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          entity_definition_id?: string;
          project_id?: string;
          data?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      entity_relation: {
        Row: {
          id: string;
          source_instance_id: string;
          target_instance_id: string;
          relation_field_id: string;
          reverse_field_id: string | null;
          relation_type: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          source_instance_id: string;
          target_instance_id: string;
          relation_field_id: string;
          reverse_field_id?: string | null;
          relation_type: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          source_instance_id?: string;
          target_instance_id?: string;
          relation_field_id?: string;
          reverse_field_id?: string | null;
          relation_type?: string;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_user_role: {
        Args: {
          user_uuid: string;
        };
        Returns: string;
      };
      is_super_admin: {
        Args: {
          user_uuid: string;
        };
        Returns: boolean;
      };
      is_admin: {
        Args: {
          user_uuid: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
