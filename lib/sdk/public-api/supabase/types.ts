/**
 * Типы для Supabase Database
 * Автономные типы для SDK - не зависят от внешних модулей
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
          enable_sign_in: boolean;
          enable_sign_up: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          status?: string;
          created_by?: string | null;
          enable_sign_in?: boolean;
          enable_sign_up?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          status?: string;
          created_by?: string | null;
          enable_sign_in?: boolean;
          enable_sign_up?: boolean;
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
          title_section_0: string | null;
          title_section_1: string | null;
          title_section_2: string | null;
          title_section_3: string | null;
          ui_config: Json | null;
          enable_pagination: boolean;
          page_size: number;
          enable_filters: boolean;
          max_file_size_mb: number | null;
          max_files_count: number | null;
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
          title_section_0?: string | null;
          title_section_1?: string | null;
          title_section_2?: string | null;
          title_section_3?: string | null;
          ui_config?: Json | null;
          enable_pagination?: boolean;
          page_size?: number;
          enable_filters?: boolean;
          max_file_size_mb?: number | null;
          max_files_count?: number | null;
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
          title_section_0?: string | null;
          title_section_1?: string | null;
          title_section_2?: string | null;
          title_section_3?: string | null;
          ui_config?: Json | null;
          enable_pagination?: boolean;
          page_size?: number;
          enable_filters?: boolean;
          max_file_size_mb?: number | null;
          max_files_count?: number | null;
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
          section_index: number | null;
          is_option_title_field: boolean;
          searchable: boolean;
          filterable_in_list: boolean;
          options: Json | null;
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
          type_field_name: string | null;
          options_field_name: string | null;
          accept_file_types: string | null;
          max_file_size: number | null;
          max_files: number | null;
          storage_bucket: string | null;
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
          section_index?: number | null;
          is_option_title_field?: boolean;
          searchable?: boolean;
          filterable_in_list?: boolean;
          options?: Json | null;
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
          type_field_name?: string | null;
          options_field_name?: string | null;
          accept_file_types?: string | null;
          max_file_size?: number | null;
          max_files?: number | null;
          storage_bucket?: string | null;
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
          section_index?: number | null;
          is_option_title_field?: boolean;
          searchable?: boolean;
          filterable_in_list?: boolean;
          options?: Json | null;
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
          type_field_name?: string | null;
          options_field_name?: string | null;
          accept_file_types?: string | null;
          max_file_size?: number | null;
          max_files?: number | null;
          storage_bucket?: string | null;
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
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          entity_definition_id: string;
          project_id: string;
          data?: Json;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          entity_definition_id?: string;
          project_id?: string;
          data?: Json;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      entity_file: {
        Row: {
          id: string;
          entity_instance_id: string;
          field_id: string | null;
          file_url: string;
          file_path: string;
          file_name: string;
          file_size: number;
          file_type: string;
          storage_bucket: string;
          uploaded_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          entity_instance_id: string;
          field_id?: string | null;
          file_url: string;
          file_path: string;
          file_name: string;
          file_size: number;
          file_type: string;
          storage_bucket?: string;
          uploaded_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          entity_instance_id?: string;
          field_id?: string | null;
          file_url?: string;
          file_path?: string;
          file_name?: string;
          file_size?: number;
          file_type?: string;
          storage_bucket?: string;
          uploaded_by?: string | null;
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
      environments: {
        Row: {
          id: string;
          project_id: string;
          key: string;
          type: "string" | "number" | "boolean" | "select";
          value: Json | null;
          options: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          key: string;
          type: "string" | "number" | "boolean" | "select";
          value?: Json | null;
          options?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          key?: string;
          type?: "string" | "number" | "boolean" | "select";
          value?: Json | null;
          options?: Json;
          created_at?: string;
          updated_at?: string;
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
      search_entity_instances: {
        Args: {
          p_entity_definition_id: string;
          p_project_id: string;
          p_search_term: string;
          p_search_fields?: string[];
          p_limit?: number;
          p_offset?: number;
        };
        Returns: Array<{
          id: string;
          entity_definition_id: string;
          project_id: string;
          data: Json;
          created_at: string;
          updated_at: string;
          total_count: number;
        }>;
      };
      get_related_instances: {
        Args: {
          p_source_instance_ids: string[];
          p_relation_field_ids: string[];
        };
        Returns: Array<{
          source_instance_id: string;
          relation_field_id: string;
          target_instance_id: string;
          target_entity_definition_id: string;
          target_project_id: string;
          target_data: Json;
          target_created_at: string;
          target_updated_at: string;
        }>;
      };
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
