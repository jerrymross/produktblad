CREATE TABLE portal_identities (
  portal_sub text PRIMARY KEY,
  user_id text UNIQUE NOT NULL REFERENCES "user"(id),
  linked_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE portal_transactions (
  cookie_hash text PRIMARY KEY,
  state_hash text NOT NULL,
  verifier text NOT NULL,
  return_to text NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT now()+interval '5 minutes'
);
CREATE TABLE portal_sessions (
  cookie_hash text PRIMARY KEY,
  portal_sub text NOT NULL REFERENCES portal_identities(portal_sub),
  access_token text NOT NULL,
  expires_at timestamptz NOT NULL
);
-- No client or ordinary app operation can link existing accounts or grant roles.
CREATE FUNCTION portal_new_identity(subject text, display_name text) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path FROM CURRENT AS $$
DECLARE local_id text;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('portal:' || subject));
  SELECT user_id INTO local_id FROM portal_identities WHERE portal_sub=subject;
  IF local_id IS NOT NULL THEN RETURN local_id; END IF;
  local_id := gen_random_uuid()::text;
  -- Synthetic address avoids email-based linking and password/invitation collisions.
  INSERT INTO "user"(id,name,email,"emailVerified","createdAt","updatedAt")
  VALUES(local_id,left(display_name,100),'portal-' || local_id || '@identity.invalid',false,now(),now());
  INSERT INTO portal_identities(portal_sub,user_id) VALUES(subject,local_id);
  RETURN local_id;
END $$;
REVOKE ALL ON FUNCTION portal_new_identity(text,text) FROM PUBLIC;

CREATE FUNCTION portal_accept_invitation(token text, local_user text, verified_email text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path FROM CURRENT AS $$
DECLARE invite invitations;
BEGIN
  IF local_user IS DISTINCT FROM current_app_user() OR NOT EXISTS(SELECT 1 FROM portal_identities WHERE user_id=local_user) THEN RAISE EXCEPTION 'Invalid identity'; END IF;
  SELECT * INTO invite FROM invitations WHERE token_hash=token AND lower(email)=lower(verified_email) AND used_at IS NULL AND expires_at>now() FOR UPDATE;
  IF invite.id IS NULL THEN RAISE EXCEPTION 'Invalid invitation'; END IF;
  IF invite.central THEN INSERT INTO central_roles VALUES(local_user) ON CONFLICT DO NOTHING; END IF;
  INSERT INTO school_memberships SELECT local_user,unnest(invite.school_ids) ON CONFLICT DO NOTHING;
  UPDATE invitations SET used_at=now() WHERE id=invite.id;
END $$;
REVOKE ALL ON FUNCTION portal_accept_invitation(text,text,text) FROM PUBLIC;
