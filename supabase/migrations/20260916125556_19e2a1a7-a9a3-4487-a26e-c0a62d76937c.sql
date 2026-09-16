ALTER TABLE public.folhas_pagamento
ADD COLUMN data_emissao date;

COMMENT ON COLUMN public.folhas_pagamento.data_emissao IS 'Data de emissão informada manualmente para a folha e sua guia';