ALTER TABLE public.folhas_pagamento
  DROP CONSTRAINT IF EXISTS folhas_pagamento_tipo_check;

ALTER TABLE public.folhas_pagamento
  ADD CONSTRAINT folhas_pagamento_tipo_check
  CHECK (tipo IN ('folha', 'servidor', 'patronal'));

ALTER TABLE public.folhas_pagamento
  ALTER COLUMN tipo SET DEFAULT 'folha';