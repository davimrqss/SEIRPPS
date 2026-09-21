CREATE TYPE public.app_role AS ENUM ('admin', 'gestor_financeiro', 'operador', 'fiscal');

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_updated_at_column() TO service_role;

CREATE TABLE public.caixas_previdencia (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  razao_social text,
  empresa text,
  cnpj text UNIQUE,
  email text,
  telefone text,
  endereco text,
  cep text,
  municipio text,
  uf text,
  estado text,
  logo_url text,
  aliquota_servidor numeric(7,4) NOT NULL DEFAULT 11,
  aliquota_patronal numeric(7,4) NOT NULL DEFAULT 13.51,
  aliquota_suplementar numeric(7,4) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.caixas_previdencia TO authenticated;
GRANT ALL ON public.caixas_previdencia TO service_role;
ALTER TABLE public.caixas_previdencia ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  nome text NOT NULL,
  cpf text,
  cargo text,
  caixa_id uuid REFERENCES public.caixas_previdencia(id) ON DELETE SET NULL,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.orgaos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caixa_id uuid NOT NULL REFERENCES public.caixas_previdencia(id) ON DELETE CASCADE,
  nome text NOT NULL,
  cnpj text,
  endereco text,
  cep text,
  municipio text,
  uf text,
  telefone text,
  email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orgaos TO authenticated;
GRANT ALL ON public.orgaos TO service_role;
ALTER TABLE public.orgaos ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.centros_custo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caixa_id uuid NOT NULL REFERENCES public.caixas_previdencia(id) ON DELETE CASCADE,
  orgao_id uuid REFERENCES public.orgaos(id) ON DELETE SET NULL,
  nome text NOT NULL,
  codigo text NOT NULL,
  descricao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (caixa_id, codigo)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.centros_custo TO authenticated;
GRANT ALL ON public.centros_custo TO service_role;
ALTER TABLE public.centros_custo ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.funcionarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  cpf text NOT NULL,
  orgao text NOT NULL,
  cargo text,
  data_nascimento date,
  email text,
  status text NOT NULL DEFAULT 'ativo',
  caixa_id uuid NOT NULL REFERENCES public.caixas_previdencia(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT funcionarios_status_check CHECK (status IN ('ativo', 'inativo'))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.funcionarios TO authenticated;
GRANT ALL ON public.funcionarios TO service_role;
ALTER TABLE public.funcionarios ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.folhas_pagamento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caixa_id uuid NOT NULL REFERENCES public.caixas_previdencia(id) ON DELETE CASCADE,
  centro_custo text NOT NULL,
  codigo_centro_custo text,
  orgao text NOT NULL DEFAULT '',
  mes_referencia text NOT NULL,
  data_emissao date,
  vencimento date NOT NULL,
  num_empregados integer NOT NULL DEFAULT 0,
  grupo_folha text NOT NULL DEFAULT '1 - Normal',
  remuneracao numeric(15,2) NOT NULL DEFAULT 0,
  base_calculo numeric(15,2) NOT NULL DEFAULT 0,
  valor_servidor numeric(15,2) NOT NULL DEFAULT 0,
  valor_patronal numeric(15,2) NOT NULL DEFAULT 0,
  valor_suplementar numeric(15,2) NOT NULL DEFAULT 0,
  salario_maternidade numeric(15,2) NOT NULL DEFAULT 0,
  salario_familia numeric(15,2) NOT NULL DEFAULT 0,
  aux_doenca numeric(15,2) NOT NULL DEFAULT 0,
  juros_multa numeric(15,2) NOT NULL DEFAULT 0,
  aliquota_servidor numeric(7,4) NOT NULL DEFAULT 11,
  aliquota_patronal numeric(7,4) NOT NULL DEFAULT 13.51,
  is_13 boolean NOT NULL DEFAULT false,
  tipo text NOT NULL DEFAULT 'folha',
  paga boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT folhas_pagamento_tipo_check CHECK (tipo IN ('folha', 'servidor', 'patronal'))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.folhas_pagamento TO authenticated;
GRANT ALL ON public.folhas_pagamento TO service_role;
ALTER TABLE public.folhas_pagamento ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.pagamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folha_id uuid NOT NULL REFERENCES public.folhas_pagamento(id) ON DELETE CASCADE,
  valor_pago numeric(15,2) NOT NULL DEFAULT 0,
  valor_recebido numeric(15,2) NOT NULL DEFAULT 0,
  data_pagamento timestamptz NOT NULL DEFAULT now(),
  observacoes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pagamentos TO authenticated;
GRANT ALL ON public.pagamentos TO service_role;
ALTER TABLE public.pagamentos ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.solicitacoes_conta (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tipo text NOT NULL,
  valor_solicitado text,
  mensagem text,
  status text NOT NULL DEFAULT 'pendente',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT solicitacoes_tipo_check CHECK (tipo IN ('email', 'senha')),
  CONSTRAINT solicitacoes_status_check CHECK (status IN ('pendente', 'aprovada', 'rejeitada'))
);
GRANT SELECT, INSERT, UPDATE ON public.solicitacoes_conta TO authenticated;
GRANT ALL ON public.solicitacoes_conta TO service_role;
ALTER TABLE public.solicitacoes_conta ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION private.get_user_caixa_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT caixa_id FROM public.profiles WHERE user_id = _user_id LIMIT 1
$$;

REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.get_user_caixa_id(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.get_user_caixa_id(uuid) TO authenticated, service_role;

CREATE INDEX profiles_caixa_id_idx ON public.profiles(caixa_id);
CREATE INDEX user_roles_user_id_idx ON public.user_roles(user_id);
CREATE INDEX orgaos_caixa_id_idx ON public.orgaos(caixa_id);
CREATE INDEX centros_custo_caixa_id_idx ON public.centros_custo(caixa_id);
CREATE INDEX centros_custo_orgao_id_idx ON public.centros_custo(orgao_id);
CREATE INDEX funcionarios_caixa_id_idx ON public.funcionarios(caixa_id);
CREATE INDEX folhas_pagamento_caixa_id_idx ON public.folhas_pagamento(caixa_id);
CREATE INDEX folhas_pagamento_competencia_idx ON public.folhas_pagamento(caixa_id, mes_referencia, codigo_centro_custo);
CREATE INDEX pagamentos_folha_id_idx ON public.pagamentos(folha_id);
CREATE INDEX solicitacoes_conta_user_id_idx ON public.solicitacoes_conta(user_id);

CREATE TRIGGER update_caixas_updated_at BEFORE UPDATE ON public.caixas_previdencia FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_orgaos_updated_at BEFORE UPDATE ON public.orgaos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_centros_custo_updated_at BEFORE UPDATE ON public.centros_custo FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_funcionarios_updated_at BEFORE UPDATE ON public.funcionarios FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_folhas_updated_at BEFORE UPDATE ON public.folhas_pagamento FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_solicitacoes_updated_at BEFORE UPDATE ON public.solicitacoes_conta FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY caixas_select ON public.caixas_previdencia FOR SELECT TO authenticated
USING (private.has_role(auth.uid(), 'admin') OR id = private.get_user_caixa_id(auth.uid()));
CREATE POLICY caixas_insert ON public.caixas_previdencia FOR INSERT TO authenticated
WITH CHECK (private.has_role(auth.uid(), 'admin'));
CREATE POLICY caixas_update ON public.caixas_previdencia FOR UPDATE TO authenticated
USING (private.has_role(auth.uid(), 'admin')) WITH CHECK (private.has_role(auth.uid(), 'admin'));
CREATE POLICY caixas_delete ON public.caixas_previdencia FOR DELETE TO authenticated
USING (private.has_role(auth.uid(), 'admin'));

CREATE POLICY profiles_select ON public.profiles FOR SELECT TO authenticated
USING (user_id = auth.uid() OR private.has_role(auth.uid(), 'admin'));
CREATE POLICY profiles_insert ON public.profiles FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());
CREATE POLICY profiles_update ON public.profiles FOR UPDATE TO authenticated
USING (user_id = auth.uid() OR private.has_role(auth.uid(), 'admin'))
WITH CHECK (user_id = auth.uid() OR private.has_role(auth.uid(), 'admin'));
CREATE POLICY profiles_delete ON public.profiles FOR DELETE TO authenticated
USING (private.has_role(auth.uid(), 'admin'));

CREATE POLICY roles_select ON public.user_roles FOR SELECT TO authenticated
USING (user_id = auth.uid() OR private.has_role(auth.uid(), 'admin'));

CREATE POLICY orgaos_select ON public.orgaos FOR SELECT TO authenticated
USING (private.has_role(auth.uid(), 'admin') OR caixa_id = private.get_user_caixa_id(auth.uid()));
CREATE POLICY orgaos_insert ON public.orgaos FOR INSERT TO authenticated
WITH CHECK (private.has_role(auth.uid(), 'admin'));
CREATE POLICY orgaos_update ON public.orgaos FOR UPDATE TO authenticated
USING (private.has_role(auth.uid(), 'admin')) WITH CHECK (private.has_role(auth.uid(), 'admin'));
CREATE POLICY orgaos_delete ON public.orgaos FOR DELETE TO authenticated
USING (private.has_role(auth.uid(), 'admin'));

CREATE POLICY centros_select ON public.centros_custo FOR SELECT TO authenticated
USING (private.has_role(auth.uid(), 'admin') OR caixa_id = private.get_user_caixa_id(auth.uid()));
CREATE POLICY centros_insert ON public.centros_custo FOR INSERT TO authenticated
WITH CHECK (private.has_role(auth.uid(), 'admin') OR (caixa_id = private.get_user_caixa_id(auth.uid()) AND private.has_role(auth.uid(), 'gestor_financeiro')));
CREATE POLICY centros_update ON public.centros_custo FOR UPDATE TO authenticated
USING (private.has_role(auth.uid(), 'admin') OR (caixa_id = private.get_user_caixa_id(auth.uid()) AND private.has_role(auth.uid(), 'gestor_financeiro')))
WITH CHECK (private.has_role(auth.uid(), 'admin') OR (caixa_id = private.get_user_caixa_id(auth.uid()) AND private.has_role(auth.uid(), 'gestor_financeiro')));
CREATE POLICY centros_delete ON public.centros_custo FOR DELETE TO authenticated
USING (private.has_role(auth.uid(), 'admin') OR (caixa_id = private.get_user_caixa_id(auth.uid()) AND private.has_role(auth.uid(), 'gestor_financeiro')));

CREATE POLICY funcionarios_select ON public.funcionarios FOR SELECT TO authenticated
USING (private.has_role(auth.uid(), 'admin') OR caixa_id = private.get_user_caixa_id(auth.uid()));
CREATE POLICY funcionarios_insert ON public.funcionarios FOR INSERT TO authenticated
WITH CHECK (private.has_role(auth.uid(), 'admin') OR (caixa_id = private.get_user_caixa_id(auth.uid()) AND (private.has_role(auth.uid(), 'gestor_financeiro') OR private.has_role(auth.uid(), 'operador'))));
CREATE POLICY funcionarios_update ON public.funcionarios FOR UPDATE TO authenticated
USING (private.has_role(auth.uid(), 'admin') OR (caixa_id = private.get_user_caixa_id(auth.uid()) AND (private.has_role(auth.uid(), 'gestor_financeiro') OR private.has_role(auth.uid(), 'operador'))))
WITH CHECK (private.has_role(auth.uid(), 'admin') OR (caixa_id = private.get_user_caixa_id(auth.uid()) AND (private.has_role(auth.uid(), 'gestor_financeiro') OR private.has_role(auth.uid(), 'operador'))));
CREATE POLICY funcionarios_delete ON public.funcionarios FOR DELETE TO authenticated
USING (private.has_role(auth.uid(), 'admin') OR (caixa_id = private.get_user_caixa_id(auth.uid()) AND (private.has_role(auth.uid(), 'gestor_financeiro') OR private.has_role(auth.uid(), 'operador'))));

CREATE POLICY folhas_select ON public.folhas_pagamento FOR SELECT TO authenticated
USING (private.has_role(auth.uid(), 'admin') OR caixa_id = private.get_user_caixa_id(auth.uid()));
CREATE POLICY folhas_insert ON public.folhas_pagamento FOR INSERT TO authenticated
WITH CHECK (private.has_role(auth.uid(), 'admin') OR (caixa_id = private.get_user_caixa_id(auth.uid()) AND (private.has_role(auth.uid(), 'gestor_financeiro') OR private.has_role(auth.uid(), 'operador'))));
CREATE POLICY folhas_update ON public.folhas_pagamento FOR UPDATE TO authenticated
USING (private.has_role(auth.uid(), 'admin') OR (caixa_id = private.get_user_caixa_id(auth.uid()) AND (private.has_role(auth.uid(), 'gestor_financeiro') OR private.has_role(auth.uid(), 'operador'))))
WITH CHECK (private.has_role(auth.uid(), 'admin') OR (caixa_id = private.get_user_caixa_id(auth.uid()) AND (private.has_role(auth.uid(), 'gestor_financeiro') OR private.has_role(auth.uid(), 'operador'))));
CREATE POLICY folhas_delete ON public.folhas_pagamento FOR DELETE TO authenticated
USING (private.has_role(auth.uid(), 'admin') OR (caixa_id = private.get_user_caixa_id(auth.uid()) AND (private.has_role(auth.uid(), 'gestor_financeiro') OR private.has_role(auth.uid(), 'operador'))));

CREATE POLICY pagamentos_select ON public.pagamentos FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.folhas_pagamento f WHERE f.id = folha_id AND (private.has_role(auth.uid(), 'admin') OR f.caixa_id = private.get_user_caixa_id(auth.uid()))));
CREATE POLICY pagamentos_insert ON public.pagamentos FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.folhas_pagamento f WHERE f.id = folha_id AND (private.has_role(auth.uid(), 'admin') OR (f.caixa_id = private.get_user_caixa_id(auth.uid()) AND (private.has_role(auth.uid(), 'gestor_financeiro') OR private.has_role(auth.uid(), 'operador'))))));
CREATE POLICY pagamentos_update ON public.pagamentos FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.folhas_pagamento f WHERE f.id = folha_id AND (private.has_role(auth.uid(), 'admin') OR (f.caixa_id = private.get_user_caixa_id(auth.uid()) AND (private.has_role(auth.uid(), 'gestor_financeiro') OR private.has_role(auth.uid(), 'operador'))))))
WITH CHECK (EXISTS (SELECT 1 FROM public.folhas_pagamento f WHERE f.id = folha_id AND (private.has_role(auth.uid(), 'admin') OR (f.caixa_id = private.get_user_caixa_id(auth.uid()) AND (private.has_role(auth.uid(), 'gestor_financeiro') OR private.has_role(auth.uid(), 'operador'))))));
CREATE POLICY pagamentos_delete ON public.pagamentos FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.folhas_pagamento f WHERE f.id = folha_id AND (private.has_role(auth.uid(), 'admin') OR (f.caixa_id = private.get_user_caixa_id(auth.uid()) AND (private.has_role(auth.uid(), 'gestor_financeiro') OR private.has_role(auth.uid(), 'operador'))))));

CREATE POLICY solicitacoes_insert ON public.solicitacoes_conta FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());
CREATE POLICY solicitacoes_select ON public.solicitacoes_conta FOR SELECT TO authenticated
USING (user_id = auth.uid() OR private.has_role(auth.uid(), 'admin'));
CREATE POLICY solicitacoes_update ON public.solicitacoes_conta FOR UPDATE TO authenticated
USING (private.has_role(auth.uid(), 'admin')) WITH CHECK (private.has_role(auth.uid(), 'admin'));
