DROP POLICY IF EXISTS logos_insert_authorized ON storage.objects;
CREATE POLICY logos_insert_authorized ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'logos' AND owner_id = (SELECT auth.uid())::text AND (
    private.has_role((SELECT auth.uid()), 'admin'::app_role)
    OR ((storage.foldername(name))[1] = 'avatars' AND name LIKE ('avatars/' || (SELECT auth.uid())::text || '-%'))
  )
);