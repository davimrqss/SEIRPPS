DROP POLICY IF EXISTS "Usuarios autenticados veem logos" ON storage.objects;
CREATE POLICY "Usuarios autenticados veem logos"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'logos');

DROP POLICY IF EXISTS "Admins enviam logos" ON storage.objects;
CREATE POLICY "Admins enviam logos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'logos' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins atualizam logos" ON storage.objects;
CREATE POLICY "Admins atualizam logos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'logos' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'logos' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins removem logos" ON storage.objects;
CREATE POLICY "Admins removem logos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'logos' AND public.has_role(auth.uid(), 'admin'));
