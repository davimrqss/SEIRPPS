CREATE TABLE public.descricoes_guias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caixa_id uuid NOT NULL REFERENCES public.caixas_previdencia(id) ON DELETE CASCADE,
  nome text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT descricoes_guias_caixa_nome_key UNIQUE (caixa_id, nome)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.descricoes_guias TO authenticated;
GRANT ALL ON public.descricoes_guias TO service_role;

ALTER TABLE public.descricoes_guias ENABLE ROW LEVEL SECURITY;

CREATE POLICY descricoes_guias_select
ON public.descricoes_guias FOR SELECT TO authenticated
USING (
  private.has_role(auth.uid(), 'admin'::public.app_role)
  OR caixa_id = private.get_user_caixa_id(auth.uid())
);

CREATE POLICY descricoes_guias_insert
ON public.descricoes_guias FOR INSERT TO authenticated
WITH CHECK (
  private.has_role(auth.uid(), 'admin'::public.app_role)
  OR (
    caixa_id = private.get_user_caixa_id(auth.uid())
    AND (
      private.has_role(auth.uid(), 'gestor_financeiro'::public.app_role)
      OR private.has_role(auth.uid(), 'operador'::public.app_role)
    )
  )
);

CREATE POLICY descricoes_guias_update
ON public.descricoes_guias FOR UPDATE TO authenticated
USING (
  private.has_role(auth.uid(), 'admin'::public.app_role)
  OR (
    caixa_id = private.get_user_caixa_id(auth.uid())
    AND private.has_role(auth.uid(), 'gestor_financeiro'::public.app_role)
  )
)
WITH CHECK (
  private.has_role(auth.uid(), 'admin'::public.app_role)
  OR (
    caixa_id = private.get_user_caixa_id(auth.uid())
    AND private.has_role(auth.uid(), 'gestor_financeiro'::public.app_role)
  )
);

CREATE POLICY descricoes_guias_delete
ON public.descricoes_guias FOR DELETE TO authenticated
USING (
  private.has_role(auth.uid(), 'admin'::public.app_role)
  OR (
    caixa_id = private.get_user_caixa_id(auth.uid())
    AND private.has_role(auth.uid(), 'gestor_financeiro'::public.app_role)
  )
);

CREATE TRIGGER update_descricoes_guias_updated_at
BEFORE UPDATE ON public.descricoes_guias
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.caixas_previdencia
  ADD COLUMN indice_correcao text NOT NULL DEFAULT 'INPC';

ALTER TABLE public.folhas_pagamento
  ADD COLUMN orgao_id uuid REFERENCES public.orgaos(id) ON DELETE SET NULL,
  ADD COLUMN aliquota_juros_servidor numeric NOT NULL DEFAULT 0,
  ADD COLUMN aliquota_juros_patronal numeric NOT NULL DEFAULT 0,
  ADD COLUMN aliquota_correcao_servidor numeric NOT NULL DEFAULT 0,
  ADD COLUMN aliquota_correcao_patronal numeric NOT NULL DEFAULT 0;

ALTER TABLE public.pagamentos
  ADD COLUMN natureza text;

ALTER TABLE public.pagamentos
  ADD CONSTRAINT pagamentos_natureza_check
  CHECK (natureza IS NULL OR natureza IN ('servidor', 'patronal'));

CREATE INDEX idx_descricoes_guias_caixa_nome ON public.descricoes_guias (caixa_id, nome);
CREATE INDEX idx_folhas_pagamento_caixa_mes_orgao ON public.folhas_pagamento (caixa_id, mes_referencia, orgao_id);
CREATE INDEX idx_pagamentos_folha_natureza ON public.pagamentos (folha_id, natureza);