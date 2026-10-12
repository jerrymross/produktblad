CREATE TABLE portal_permission_versions (portal_sub text PRIMARY KEY, revision int NOT NULL DEFAULT 0);
CREATE TABLE portal_management_nonces (jti text PRIMARY KEY, expires_at timestamptz NOT NULL);
CREATE TABLE portal_permission_audit (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), actor_id text NOT NULL REFERENCES "user"(id), portal_sub text NOT NULL,
  action text NOT NULL, before_state jsonb NOT NULL, after_state jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now());

CREATE FUNCTION portal_permission_profile(subject text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO __SCHEMA__,pg_temp AS $$
DECLARE local_id text; result jsonb;
BEGIN
  IF NOT is_central() THEN RAISE EXCEPTION 'Produktblad-admin krävs' USING ERRCODE='42501'; END IF;
  SELECT user_id INTO local_id FROM portal_identities WHERE portal_sub=subject;
  SELECT jsonb_build_object('localId',local_id,'linked',local_id IS NOT NULL,
    'role',CASE WHEN EXISTS(SELECT 1 FROM central_roles WHERE user_id=local_id) THEN 'admin' ELSE 'user' END,
    'schools',COALESCE((SELECT jsonb_agg(school_id ORDER BY school_id) FROM school_memberships WHERE user_id=local_id),'[]'::jsonb),
    'revision',COALESCE((SELECT revision FROM portal_permission_versions WHERE portal_sub=subject),0),
    'canRelink',local_id IS NULL OR (
      NOT EXISTS(SELECT 1 FROM central_roles WHERE user_id=local_id) AND NOT EXISTS(SELECT 1 FROM school_memberships WHERE user_id=local_id)
      AND NOT EXISTS(SELECT 1 FROM sheets WHERE updated_by=local_id) AND NOT EXISTS(SELECT 1 FROM sheet_versions WHERE changed_by=local_id)
      AND NOT EXISTS(SELECT 1 FROM editing_locks WHERE user_id=local_id))) INTO result;
  RETURN result;
END $$;

CREATE FUNCTION portal_management_nonce(nonce text, expiry bigint) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO __SCHEMA__,pg_temp AS $$
BEGIN
  IF NOT is_central() OR expiry<=extract(epoch FROM now()) OR expiry>extract(epoch FROM now())+65 THEN RETURN false; END IF;
  DELETE FROM portal_management_nonces WHERE expires_at<=now();
  INSERT INTO portal_management_nonces VALUES(nonce,to_timestamp(expiry)) ON CONFLICT DO NOTHING;
  RETURN FOUND;
END $$;

CREATE FUNCTION portal_set_permissions(subject text, display_name text, desired_role text, school_ids text[], expected_revision int, confirmed_admin boolean) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO __SCHEMA__,pg_temp AS $$
DECLARE local_id text; previous jsonb; result jsonb;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('portal-management'));
  IF NOT is_central() THEN RAISE EXCEPTION 'Produktblad-admin krävs' USING ERRCODE='42501'; END IF;
  previous:=portal_permission_profile(subject);
  IF (previous->>'revision')::int<>expected_revision THEN RAISE EXCEPTION 'Åtkomsten har ändrats. Läs in den igen' USING ERRCODE='40001'; END IF;
  IF desired_role NOT IN ('user','admin') OR school_ids IS NULL OR EXISTS(SELECT 1 FROM unnest(school_ids) chosen(id) WHERE chosen.id='__templates__' OR NOT EXISTS(SELECT 1 FROM schools WHERE schools.id=chosen.id))
    OR (desired_role='admin' AND (NOT confirmed_admin OR cardinality(school_ids)>0)) THEN RAISE EXCEPTION 'Ogiltig roll, skola eller adminbekräftelse' USING ERRCODE='22023'; END IF;
  local_id:=portal_new_identity(subject,display_name);
  IF local_id=current_app_user() AND desired_role<>'admin' THEN RAISE EXCEPTION 'Du kan inte ta bort din egen Produktblad-adminroll' USING ERRCODE='42501'; END IF;
  IF desired_role='admin' THEN INSERT INTO central_roles VALUES(local_id) ON CONFLICT DO NOTHING;
  ELSE DELETE FROM central_roles WHERE user_id=local_id; END IF;
  DELETE FROM school_memberships WHERE user_id=local_id;
  INSERT INTO school_memberships SELECT local_id,id FROM (SELECT DISTINCT unnest(school_ids) id) selected;
  IF desired_role<>'admin' THEN DELETE FROM editing_locks l USING sheets s WHERE l.user_id=local_id AND l.sheet_id=s.id AND NOT(s.school_id=ANY(school_ids)); END IF;
  INSERT INTO portal_permission_versions VALUES(subject,expected_revision+1) ON CONFLICT(portal_sub) DO UPDATE SET revision=excluded.revision;
  result:=portal_permission_profile(subject);
  INSERT INTO portal_permission_audit(actor_id,portal_sub,action,before_state,after_state) VALUES(current_app_user(),subject,'permissions',previous,result);
  RETURN result;
END $$;

CREATE FUNCTION portal_link_identity(subject text, chosen_user text, expected_revision int, confirmed boolean) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO __SCHEMA__,pg_temp AS $$
DECLARE previous jsonb; result jsonb;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('portal-management'));
  IF NOT is_central() THEN RAISE EXCEPTION 'Produktblad-admin krävs' USING ERRCODE='42501'; END IF;
  previous:=portal_permission_profile(subject);
  IF (previous->>'revision')::int<>expected_revision THEN RAISE EXCEPTION 'Kontokopplingen har ändrats. Läs in den igen' USING ERRCODE='40001'; END IF;
  IF NOT confirmed OR NOT(previous->>'canRelink')::boolean THEN RAISE EXCEPTION 'Kopplingen kräver uttrycklig bekräftelse och ett konto utan egen åtkomst eller historik' USING ERRCODE='42501'; END IF;
  IF NOT EXISTS(SELECT 1 FROM "user" WHERE id=chosen_user) OR EXISTS(SELECT 1 FROM portal_identities WHERE user_id=chosen_user AND portal_sub<>subject) THEN
    RAISE EXCEPTION 'Det valda kontot saknas eller är redan kopplat' USING ERRCODE='22023'; END IF;
  INSERT INTO portal_identities(portal_sub,user_id) VALUES(subject,chosen_user) ON CONFLICT(portal_sub) DO UPDATE SET user_id=excluded.user_id;
  INSERT INTO portal_permission_versions VALUES(subject,expected_revision+1) ON CONFLICT(portal_sub) DO UPDATE SET revision=excluded.revision;
  result:=portal_permission_profile(subject);
  INSERT INTO portal_permission_audit(actor_id,portal_sub,action,before_state,after_state) VALUES(current_app_user(),subject,'link',previous,result);
  RETURN result;
END $$;

REVOKE ALL ON FUNCTION portal_permission_profile(text),portal_management_nonce(text,bigint),portal_set_permissions(text,text,text,text[],int,boolean),portal_link_identity(text,text,int,boolean) FROM PUBLIC;
ALTER TABLE portal_permission_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY portal_audit_admin_read ON portal_permission_audit FOR SELECT USING(is_central());
