ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'fiscal';

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;

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

CREATE POLICY "Admins can manage orgaos" ON public.orgaos FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view orgaos of their caixa" ON public.orgaos FOR SELECT TO authenticated
USING (caixa_id = public.get_user_caixa_id(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_orgaos_updated_at BEFORE UPDATE ON public.orgaos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.centros_custo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caixa_id uuid NOT NULL REFERENCES public.caixas_previdencia(id) ON DELETE CASCADE,
  orgao_id uuid REFERENCES public.orgaos(id) ON DELETE SET NULL,
  nome text NOT NULL,
  codigo text NOT NULL,
  descricao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.centros_custo TO authenticated;
GRANT ALL ON public.centros_custo TO service_role;
ALTER TABLE public.centros_custo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage centros_custo" ON public.centros_custo FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Gestores can manage centros_custo of their caixa" ON public.centros_custo FOR ALL TO authenticated
USING (caixa_id = public.get_user_caixa_id(auth.uid()) AND public.has_role(auth.uid(), 'gestor_financeiro'))
WITH CHECK (caixa_id = public.get_user_caixa_id(auth.uid()) AND public.has_role(auth.uid(), 'gestor_financeiro'));

CREATE POLICY "Users can view centros_custo of their caixa" ON public.centros_custo FOR SELECT TO authenticated
USING (caixa_id = public.get_user_caixa_id(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_centros_custo_updated_at BEFORE UPDATE ON public.centros_custo
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.solicitacoes_conta (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo text NOT NULL,
  valor_solicitado text,
  mensagem text,
  status text NOT NULL DEFAULT 'pendente',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.solicitacoes_conta TO authenticated;
GRANT ALL ON public.solicitacoes_conta TO service_role;
ALTER TABLE public.solicitacoes_conta ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create own solicitacoes" ON public.solicitacoes_conta FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view own solicitacoes" ON public.solicitacoes_conta FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update solicitacoes" ON public.solicitacoes_conta FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_solicitacoes_updated_at BEFORE UPDATE ON public.solicitacoes_conta
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();