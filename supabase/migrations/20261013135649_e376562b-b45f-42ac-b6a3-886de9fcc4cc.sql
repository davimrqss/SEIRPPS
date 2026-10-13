BEGIN;
LOCK TABLE public.funcionarios IN ACCESS EXCLUSIVE MODE;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.funcionarios LIMIT 1) THEN
    RAISE EXCEPTION 'Limpeza cancelada: funcionarios possui registros.';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname IN ('public','private') AND p.prosrc ILIKE '%funcionarios%') THEN
    RAISE EXCEPTION 'Limpeza cancelada: uma funcao ainda referencia funcionarios.';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename <> 'funcionarios' AND (coalesce(qual,'') || coalesce(with_check,'')) ILIKE '%funcionarios%') THEN
    RAISE EXCEPTION 'Limpeza cancelada: uma politica externa referencia funcionarios.';
  END IF;
END $$;
DROP TABLE public.funcionarios RESTRICT;
COMMIT;