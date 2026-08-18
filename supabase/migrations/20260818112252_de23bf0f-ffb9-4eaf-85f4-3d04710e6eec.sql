-- 1) Novos campos da caixa (dados da guia + logo)
ALTER TABLE public.caixas_previdencia
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS estado text,
  ADD COLUMN IF NOT EXISTS empresa text,
  ADD COLUMN IF NOT EXISTS cep text,
  ADD COLUMN IF NOT EXISTS municipio text,
  ADD COLUMN IF NOT EXISTS uf text,
  ADD COLUMN IF NOT EXISTS aliquota_servidor numeric NOT NULL DEFAULT 11,
  ADD COLUMN IF NOT EXISTS aliquota_patronal numeric NOT NULL DEFAULT 13.51,
  ADD COLUMN IF NOT EXISTS aliquota_suplementar numeric NOT NULL DEFAULT 0;

-- 2) Campos extras da folha usados na guia
ALTER TABLE public.folhas_pagamento
  ADD COLUMN IF NOT EXISTS codigo_centro_custo text,
  ADD COLUMN IF NOT EXISTS num_empregados integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS grupo_folha text NOT NULL DEFAULT '1 - Normal',
  ADD COLUMN IF NOT EXISTS valor_suplementar numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS salario_maternidade numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS salario_familia numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS aux_doenca numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS juros_multa numeric NOT NULL DEFAULT 0;

-- 3) Admins podem operar em qualquer caixa (troca de caixa)
DROP POLICY IF EXISTS "Users can view folhas of their caixa" ON public.folhas_pagamento;
CREATE POLICY "Users can view folhas of their caixa"
ON public.folhas_pagamento FOR SELECT TO authenticated
USING (caixa_id = public.get_user_caixa_id(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins and gestores can manage folhas" ON public.folhas_pagamento;
CREATE POLICY "Admins and gestores can manage folhas"
ON public.folhas_pagamento FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR (caixa_id = public.get_user_caixa_id(auth.uid()) AND public.has_role(auth.uid(), 'gestor_financeiro'))
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR (caixa_id = public.get_user_caixa_id(auth.uid()) AND public.has_role(auth.uid(), 'gestor_financeiro'))
);

DROP POLICY IF EXISTS "Users can view funcionarios of their caixa" ON public.funcionarios;
CREATE POLICY "Users can view funcionarios of their caixa"
ON public.funcionarios FOR SELECT TO authenticated
USING (caixa_id = public.get_user_caixa_id(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can manage funcionarios" ON public.funcionarios;
CREATE POLICY "Admins can manage funcionarios"
ON public.funcionarios FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users can view pagamentos of their caixa" ON public.pagamentos;
CREATE POLICY "Users can view pagamentos of their caixa"
ON public.pagamentos FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (SELECT 1 FROM public.folhas_pagamento f WHERE f.id = pagamentos.folha_id AND f.caixa_id = public.get_user_caixa_id(auth.uid()))
);

DROP POLICY IF EXISTS "Admins and gestores can manage pagamentos" ON public.pagamentos;
CREATE POLICY "Admins and gestores can manage pagamentos"
ON public.pagamentos FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR (public.has_role(auth.uid(), 'gestor_financeiro') AND EXISTS (SELECT 1 FROM public.folhas_pagamento f WHERE f.id = pagamentos.folha_id AND f.caixa_id = public.get_user_caixa_id(auth.uid())))
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR (public.has_role(auth.uid(), 'gestor_financeiro') AND EXISTS (SELECT 1 FROM public.folhas_pagamento f WHERE f.id = pagamentos.folha_id AND f.caixa_id = public.get_user_caixa_id(auth.uid())))
);

-- 4) Admins podem ver/editar perfis (gestão de usuários)
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can manage profiles" ON public.profiles;
CREATE POLICY "Admins can manage profiles"
ON public.profiles FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
