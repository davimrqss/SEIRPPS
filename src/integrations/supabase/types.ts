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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      caixas_previdencia: {
        Row: {
          aliquota_correcao: number
          aliquota_patronal: number
          aliquota_servidor: number
          aliquota_suplementar: number
          cep: string | null
          cnpj: string | null
          created_at: string
          email: string | null
          empresa: string | null
          endereco: string | null
          estado: string | null
          id: string
          indice_correcao: string
          logo_url: string | null
          municipio: string | null
          nome: string
          razao_social: string | null
          telefone: string | null
          uf: string | null
          updated_at: string
        }
        Insert: {
          aliquota_correcao?: number
          aliquota_patronal?: number
          aliquota_servidor?: number
          aliquota_suplementar?: number
          cep?: string | null
          cnpj?: string | null
          created_at?: string
          email?: string | null
          empresa?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          indice_correcao?: string
          logo_url?: string | null
          municipio?: string | null
          nome: string
          razao_social?: string | null
          telefone?: string | null
          uf?: string | null
          updated_at?: string
        }
        Update: {
          aliquota_correcao?: number
          aliquota_patronal?: number
          aliquota_servidor?: number
          aliquota_suplementar?: number
          cep?: string | null
          cnpj?: string | null
          created_at?: string
          email?: string | null
          empresa?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          indice_correcao?: string
          logo_url?: string | null
          municipio?: string | null
          nome?: string
          razao_social?: string | null
          telefone?: string | null
          uf?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      centros_custo: {
        Row: {
          caixa_id: string
          codigo: string
          created_at: string
          descricao: string | null
          id: string
          nome: string
          orgao_id: string | null
          updated_at: string
        }
        Insert: {
          caixa_id: string
          codigo: string
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          orgao_id?: string | null
          updated_at?: string
        }
        Update: {
          caixa_id?: string
          codigo?: string
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          orgao_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "centros_custo_caixa_id_fkey"
            columns: ["caixa_id"]
            isOneToOne: false
            referencedRelation: "caixas_previdencia"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "centros_custo_orgao_id_fkey"
            columns: ["orgao_id"]
            isOneToOne: false
            referencedRelation: "orgaos"
            referencedColumns: ["id"]
          },
        ]
      }
      descricoes_guias: {
        Row: {
          caixa_id: string
          created_at: string
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          caixa_id: string
          created_at?: string
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          caixa_id?: string
          created_at?: string
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "descricoes_guias_caixa_id_fkey"
            columns: ["caixa_id"]
            isOneToOne: false
            referencedRelation: "caixas_previdencia"
            referencedColumns: ["id"]
          },
        ]
      }
      folhas_pagamento: {
        Row: {
          aliquota_correcao_patronal: number
          aliquota_correcao_servidor: number
          aliquota_juros_patronal: number
          aliquota_juros_servidor: number
          aliquota_patronal: number
          aliquota_servidor: number
          aplica_correcao: boolean | null
          aux_doenca: number
          base_calculo: number
          caixa_id: string
          centro_custo: string
          codigo_centro_custo: string | null
          created_at: string
          data_emissao: string | null
          grupo_folha: string
          id: string
          indice_correcao: string | null
          is_13: boolean
          juros_multa: number
          mes_referencia: string
          num_empregados: number
          orgao: string
          orgao_id: string | null
          paga: boolean
          remuneracao: number
          salario_familia: number
          salario_maternidade: number
          tipo: string
          updated_at: string
          valor_patronal: number
          valor_servidor: number
          valor_suplementar: number
          vencimento: string
        }
        Insert: {
          aliquota_correcao_patronal?: number
          aliquota_correcao_servidor?: number
          aliquota_juros_patronal?: number
          aliquota_juros_servidor?: number
          aliquota_patronal?: number
          aliquota_servidor?: number
          aplica_correcao?: boolean | null
          aux_doenca?: number
          base_calculo?: number
          caixa_id: string
          centro_custo: string
          codigo_centro_custo?: string | null
          created_at?: string
          data_emissao?: string | null
          grupo_folha?: string
          id?: string
          indice_correcao?: string | null
          is_13?: boolean
          juros_multa?: number
          mes_referencia: string
          num_empregados?: number
          orgao?: string
          orgao_id?: string | null
          paga?: boolean
          remuneracao?: number
          salario_familia?: number
          salario_maternidade?: number
          tipo?: string
          updated_at?: string
          valor_patronal?: number
          valor_servidor?: number
          valor_suplementar?: number
          vencimento: string
        }
        Update: {
          aliquota_correcao_patronal?: number
          aliquota_correcao_servidor?: number
          aliquota_juros_patronal?: number
          aliquota_juros_servidor?: number
          aliquota_patronal?: number
          aliquota_servidor?: number
          aplica_correcao?: boolean | null
          aux_doenca?: number
          base_calculo?: number
          caixa_id?: string
          centro_custo?: string
          codigo_centro_custo?: string | null
          created_at?: string
          data_emissao?: string | null
          grupo_folha?: string
          id?: string
          indice_correcao?: string | null
          is_13?: boolean
          juros_multa?: number
          mes_referencia?: string
          num_empregados?: number
          orgao?: string
          orgao_id?: string | null
          paga?: boolean
          remuneracao?: number
          salario_familia?: number
          salario_maternidade?: number
          tipo?: string
          updated_at?: string
          valor_patronal?: number
          valor_servidor?: number
          valor_suplementar?: number
          vencimento?: string
        }
        Relationships: [
          {
            foreignKeyName: "folhas_pagamento_caixa_id_fkey"
            columns: ["caixa_id"]
            isOneToOne: false
            referencedRelation: "caixas_previdencia"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "folhas_pagamento_orgao_id_fkey"
            columns: ["orgao_id"]
            isOneToOne: false
            referencedRelation: "orgaos"
            referencedColumns: ["id"]
          },
        ]
      }
      funcionarios: {
        Row: {
          caixa_id: string
          cargo: string | null
          cpf: string
          created_at: string
          data_nascimento: string | null
          email: string | null
          id: string
          nome: string
          orgao: string
          status: string
          updated_at: string
        }
        Insert: {
          caixa_id: string
          cargo?: string | null
          cpf: string
          created_at?: string
          data_nascimento?: string | null
          email?: string | null
          id?: string
          nome: string
          orgao: string
          status?: string
          updated_at?: string
        }
        Update: {
          caixa_id?: string
          cargo?: string | null
          cpf?: string
          created_at?: string
          data_nascimento?: string | null
          email?: string | null
          id?: string
          nome?: string
          orgao?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "funcionarios_caixa_id_fkey"
            columns: ["caixa_id"]
            isOneToOne: false
            referencedRelation: "caixas_previdencia"
            referencedColumns: ["id"]
          },
        ]
      }
      orgaos: {
        Row: {
          caixa_id: string
          cep: string | null
          cnpj: string | null
          created_at: string
          email: string | null
          endereco: string | null
          id: string
          municipio: string | null
          nome: string
          telefone: string | null
          uf: string | null
          updated_at: string
        }
        Insert: {
          caixa_id: string
          cep?: string | null
          cnpj?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          id?: string
          municipio?: string | null
          nome: string
          telefone?: string | null
          uf?: string | null
          updated_at?: string
        }
        Update: {
          caixa_id?: string
          cep?: string | null
          cnpj?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          id?: string
          municipio?: string | null
          nome?: string
          telefone?: string | null
          uf?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orgaos_caixa_id_fkey"
            columns: ["caixa_id"]
            isOneToOne: false
            referencedRelation: "caixas_previdencia"
            referencedColumns: ["id"]
          },
        ]
      }
      pagamentos: {
        Row: {
          created_at: string
          created_by: string | null
          data_pagamento: string
          folha_id: string
          id: string
          natureza: string | null
          observacoes: string | null
          valor_pago: number
          valor_recebido: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data_pagamento?: string
          folha_id: string
          id?: string
          natureza?: string | null
          observacoes?: string | null
          valor_pago?: number
          valor_recebido?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data_pagamento?: string
          folha_id?: string
          id?: string
          natureza?: string | null
          observacoes?: string | null
          valor_pago?: number
          valor_recebido?: number
        }
        Relationships: [
          {
            foreignKeyName: "pagamentos_folha_id_fkey"
            columns: ["folha_id"]
            isOneToOne: false
            referencedRelation: "folhas_pagamento"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          caixa_id: string | null
          cargo: string | null
          cpf: string | null
          created_at: string
          id: string
          nome: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          caixa_id?: string | null
          cargo?: string | null
          cpf?: string | null
          created_at?: string
          id?: string
          nome: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          caixa_id?: string | null
          cargo?: string | null
          cpf?: string | null
          created_at?: string
          id?: string
          nome?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_caixa_id_fkey"
            columns: ["caixa_id"]
            isOneToOne: false
            referencedRelation: "caixas_previdencia"
            referencedColumns: ["id"]
          },
        ]
      }
      solicitacoes_conta: {
        Row: {
          created_at: string
          id: string
          mensagem: string | null
          status: string
          tipo: string
          updated_at: string
          user_id: string
          valor_solicitado: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          mensagem?: string | null
          status?: string
          tipo: string
          updated_at?: string
          user_id: string
          valor_solicitado?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          mensagem?: string | null
          status?: string
          tipo?: string
          updated_at?: string
          user_id?: string
          valor_solicitado?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      [_ in never]: never
    }
    Enums: {
      app_role: "admin" | "gestor_financeiro" | "operador" | "fiscal"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "gestor_financeiro", "operador", "fiscal"],
    },
  },
} as const
