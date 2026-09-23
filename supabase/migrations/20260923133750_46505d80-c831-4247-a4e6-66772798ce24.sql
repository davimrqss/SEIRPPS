DROP POLICY IF EXISTS "logos_delete_authorized" ON storage.objects;
DROP POLICY IF EXISTS "logos_insert_authorized" ON storage.objects;
DROP POLICY IF EXISTS "logos_read_authenticated" ON storage.objects;
DROP POLICY IF EXISTS "logos_update_authorized" ON storage.objects;

CREATE POLICY "logos_delete_authorized"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'logos'
  AND (
    private.has_role(auth.uid(), 'admin'::public.app_role)
    OR (
      (storage.foldername(name))[1] = 'avatars'
      AND name LIKE ('avatars/' || auth.uid()::text || '-%')
    )
  )
);

CREATE POLICY "logos_insert_authorized"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'logos'
  AND (
    private.has_role(auth.uid(), 'admin'::public.app_role)
    OR (
      (storage.foldername(name))[1] = 'avatars'
      AND name LIKE ('avatars/' || auth.uid()::text || '-%')
    )
  )
);

CREATE POLICY "logos_update_authorized"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'logos'
  AND (
    private.has_role(auth.uid(), 'admin'::public.app_role)
    OR (
      (storage.foldername(name))[1] = 'avatars'
      AND name LIKE ('avatars/' || auth.uid()::text || '-%')
    )
  )
)
WITH CHECK (
  bucket_id = 'logos'
  AND (
    private.has_role(auth.uid(), 'admin'::public.app_role)
    OR (
      (storage.foldername(name))[1] = 'avatars'
      AND name LIKE ('avatars/' || auth.uid()::text || '-%')
    )
  )
);

CREATE POLICY "logos_read_authenticated"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'logos'
  AND (
    private.has_role(auth.uid(), 'admin'::public.app_role)
    OR (
      (storage.foldername(name))[1] = 'avatars'
      AND name LIKE ('avatars/' || auth.uid()::text || '-%')
    )
    OR (storage.foldername(name))[1] = private.get_user_caixa_id(auth.uid())::text
  )
);