CREATE TABLE schools (id text PRIMARY KEY, contact_defaults jsonb NOT NULL DEFAULT '{}');
CREATE TABLE central_roles (user_id text PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE);
CREATE TABLE school_memberships (user_id text REFERENCES "user"(id) ON DELETE CASCADE, school_id text REFERENCES schools(id), PRIMARY KEY(user_id,school_id));
CREATE FUNCTION current_app_user() RETURNS text LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('app.user_id', true),'') $$;
CREATE FUNCTION is_central() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path FROM CURRENT AS $$ SELECT EXISTS(SELECT 1 FROM central_roles WHERE user_id=current_app_user()) $$;
CREATE FUNCTION can_access_school(school text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path FROM CURRENT AS $$ SELECT is_central() OR EXISTS(SELECT 1 FROM school_memberships WHERE user_id=current_app_user() AND school_id=school) $$;
CREATE TABLE media (id uuid PRIMARY KEY, school_id text REFERENCES schools(id), mime text NOT NULL, bytes bytea NOT NULL CHECK(octet_length(bytes)<=2000000), created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE library_images (education text, slot int CHECK(slot IN (1,2)), media_id uuid REFERENCES media(id), name text NOT NULL, updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(education,slot));
CREATE TABLE sheets (id text PRIMARY KEY, school_id text NOT NULL REFERENCES schools(id), title text NOT NULL, template_version text NOT NULL, content jsonb NOT NULL, revision int NOT NULL DEFAULT 0, updated_at timestamptz NOT NULL DEFAULT now(), updated_by text REFERENCES "user"(id));
CREATE TABLE sheet_versions (sheet_id text REFERENCES sheets(id), revision int NOT NULL, template_version text NOT NULL, content jsonb NOT NULL, changed_by text REFERENCES "user"(id), created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(sheet_id,revision));
CREATE TABLE editing_locks (sheet_id text PRIMARY KEY REFERENCES sheets(id), user_id text NOT NULL REFERENCES "user"(id), token uuid NOT NULL, expires_at timestamptz NOT NULL);
CREATE TABLE invitations (id uuid PRIMARY KEY, token_hash text UNIQUE NOT NULL, email text NOT NULL, central boolean NOT NULL DEFAULT false, school_ids text[] NOT NULL DEFAULT '{}', expires_at timestamptz NOT NULL DEFAULT now()+interval '7 days', used_at timestamptz);
CREATE TABLE schema_migrations (version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now());

ALTER TABLE sheets ENABLE ROW LEVEL SECURITY;
CREATE POLICY sheets_scope ON sheets USING(can_access_school(school_id)) WITH CHECK(can_access_school(school_id));
ALTER TABLE sheet_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY versions_scope ON sheet_versions USING(EXISTS(SELECT 1 FROM sheets s WHERE s.id=sheet_id)) WITH CHECK(EXISTS(SELECT 1 FROM sheets s WHERE s.id=sheet_id));
ALTER TABLE editing_locks ENABLE ROW LEVEL SECURITY;
CREATE POLICY locks_scope ON editing_locks USING(EXISTS(SELECT 1 FROM sheets s WHERE s.id=sheet_id)) WITH CHECK(EXISTS(SELECT 1 FROM sheets s WHERE s.id=sheet_id) AND user_id=current_app_user());
ALTER TABLE media ENABLE ROW LEVEL SECURITY;
CREATE POLICY media_scope ON media USING((school_id IS NULL AND current_app_user() IS NOT NULL) OR can_access_school(school_id)) WITH CHECK((school_id IS NULL AND is_central()) OR can_access_school(school_id));
ALTER TABLE library_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY library_read ON library_images FOR SELECT USING(current_app_user() IS NOT NULL);
CREATE POLICY library_write ON library_images FOR ALL USING(is_central()) WITH CHECK(is_central());
ALTER TABLE central_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY central_read ON central_roles FOR SELECT USING(user_id=current_app_user() OR is_central());
ALTER TABLE school_memberships ENABLE ROW LEVEL SECURITY;
CREATE POLICY membership_read ON school_memberships FOR SELECT USING(user_id=current_app_user() OR is_central());

CREATE FUNCTION accept_invitation(token text, new_user text, expected_email text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path FROM CURRENT AS $$
DECLARE invite invitations;
BEGIN
  SELECT * INTO invite FROM invitations WHERE token_hash=token AND email=expected_email AND used_at IS NULL AND expires_at>now() FOR UPDATE;
  IF invite.id IS NULL OR NOT EXISTS(SELECT 1 FROM "user" WHERE id=new_user AND email=expected_email) THEN RAISE EXCEPTION 'Invalid invitation'; END IF;
  IF invite.central THEN INSERT INTO central_roles VALUES(new_user) ON CONFLICT DO NOTHING; END IF;
  INSERT INTO school_memberships SELECT new_user,unnest(invite.school_ids) ON CONFLICT DO NOTHING;
  UPDATE invitations SET used_at=now() WHERE id=invite.id;
END $$;
REVOKE ALL ON FUNCTION accept_invitation(text,text,text) FROM PUBLIC;
