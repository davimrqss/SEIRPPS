CREATE POLICY logos_read_authenticated ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'logos');

CREATE POLICY logos_insert_authorized ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'logos'
  AND (
    (storage.foldername(name))[1] = 'avatars'
    OR private.has_role(auth.uid(), 'admin')
  )
);

CREATE POLICY logos_update_authorized ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'logos'
  AND (
    (storage.foldername(name))[1] = 'avatars'
    OR private.has_role(auth.uid(), 'admin')
  )
)
WITH CHECK (
  bucket_id = 'logos'
  AND (
    (storage.foldername(name))[1] = 'avatars'
    OR private.has_role(auth.uid(), 'admin')
  )
);

CREATE POLICY logos_delete_authorized ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'logos'
  AND (
    (storage.foldername(name))[1] = 'avatars'
    OR private.has_role(auth.uid(), 'admin')
  )
);