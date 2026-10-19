-- Soft deletion: snapshots, media, provenance and copy slots remain intact.
CREATE TABLE sheet_trash (
  sheet_id text PRIMARY KEY REFERENCES sheets(id),
  school_id text NOT NULL REFERENCES schools(id),
  deletion_id uuid NOT NULL DEFAULT gen_random_uuid(),
  deleted_by text REFERENCES "user"(id) ON DELETE SET NULL,
  deleted_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
ALTER TABLE sheet_trash ENABLE ROW LEVEL SECURITY;
CREATE POLICY trash_read ON sheet_trash FOR SELECT USING(can_access_school(school_id));

CREATE FUNCTION sheet_in_trash(target text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path FROM CURRENT AS $$
  SELECT EXISTS(SELECT 1 FROM sheet_trash WHERE sheet_id=target)
    OR EXISTS(SELECT 1 FROM sheet_copies c JOIN sheet_trash t ON t.sheet_id=c.source_id WHERE c.copy_id=target)
$$;
CREATE FUNCTION can_trash_sheet(target text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path FROM CURRENT AS $$
  SELECT EXISTS(SELECT 1 FROM sheets s WHERE s.id=target AND s.school_id<>'__templates__'
    AND current_app_user() IS NOT NULL AND can_access_school(s.school_id)
    AND NOT sheet_in_trash(target) AND (is_central()
      OR EXISTS(SELECT 1 FROM added_sheets a WHERE a.sheet_id=target AND a.created_by=current_app_user())
      OR EXISTS(SELECT 1 FROM sheet_copies c WHERE c.copy_id=target AND c.created_by=current_app_user())))
$$;
CREATE POLICY sheets_not_trashed ON sheets AS RESTRICTIVE
  USING(NOT sheet_in_trash(id)) WITH CHECK(NOT sheet_in_trash(id));

CREATE FUNCTION trash_sheet(target text,expected_revision int,confirmed boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path FROM CURRENT AS $$
DECLARE current_sheet sheets;
BEGIN
  SELECT * INTO current_sheet FROM sheets WHERE id=target FOR UPDATE;
  IF NOT can_trash_sheet(target) THEN
    RAISE EXCEPTION 'Du får inte ta bort detta blad.' USING ERRCODE='42501';
  END IF;
  IF confirmed IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Bekräfta borttagningen först.' USING ERRCODE='22023';
  END IF;
  IF expected_revision IS DISTINCT FROM current_sheet.revision THEN
    RAISE EXCEPTION 'Bladet har ändrats. Läs in det igen före borttagning.' USING ERRCODE='40001';
  END IF;
  -- Serialize with saves on copies before hiding them with their original.
  PERFORM 1 FROM sheets WHERE id IN (SELECT copy_id FROM sheet_copies WHERE source_id=target) ORDER BY id FOR UPDATE;
  INSERT INTO sheet_trash(sheet_id,school_id,deleted_by) VALUES(target,current_sheet.school_id,current_app_user());
  DELETE FROM editing_locks WHERE sheet_id=target OR sheet_id IN (SELECT copy_id FROM sheet_copies WHERE source_id=target);
END $$;

CREATE FUNCTION restore_sheet(target text,expected_deletion uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path FROM CURRENT AS $$
DECLARE previous sheet_trash;
BEGIN
  IF current_app_user() IS NULL OR NOT is_central() THEN
    RAISE EXCEPTION 'Endast admin kan återställa blad.' USING ERRCODE='42501';
  END IF;
  PERFORM 1 FROM sheets WHERE id=target FOR UPDATE;
  SELECT * INTO previous FROM sheet_trash WHERE sheet_id=target FOR UPDATE;
  IF previous.sheet_id IS NULL OR previous.deletion_id IS DISTINCT FROM expected_deletion THEN
    RAISE EXCEPTION 'Skräpkorgen har ändrats. Uppdatera listan.' USING ERRCODE='40001';
  END IF;
  IF EXISTS(SELECT 1 FROM sheet_copies c JOIN sheet_trash t ON t.sheet_id=c.source_id WHERE c.copy_id=target) THEN
    RAISE EXCEPTION 'Återställ originalbladet först.' USING ERRCODE='22023';
  END IF;
  DELETE FROM sheet_trash WHERE sheet_id=target;
END $$;

CREATE FUNCTION list_sheet_trash() RETURNS TABLE(id text,school text,title text,"deletedAt" timestamptz,"deletedBy" text,"deletionId" uuid,"copyCount" bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path FROM CURRENT AS $$
BEGIN
  IF current_app_user() IS NULL OR NOT is_central() THEN
    RAISE EXCEPTION 'Endast admin kan öppna skräpkorgen.' USING ERRCODE='42501';
  END IF;
  RETURN QUERY SELECT t.sheet_id,t.school_id,s.title,t.deleted_at,u.name,t.deletion_id,
    (SELECT count(*) FROM sheet_copies c WHERE c.source_id=t.sheet_id)
    FROM sheet_trash t JOIN sheets s ON s.id=t.sheet_id LEFT JOIN "user" u ON u.id=t.deleted_by
    ORDER BY t.deleted_at DESC,t.sheet_id;
END $$;

-- Also protect SECURITY DEFINER operations (copy creation and finalization).
CREATE FUNCTION guard_trashed_sheet() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path FROM CURRENT AS $$
DECLARE target text; source text;
BEGIN
  IF TG_TABLE_NAME='sheets' THEN target:=NEW.id; ELSE target:=NEW.sheet_id; END IF;
  IF TG_TABLE_NAME='sheets' AND TG_OP='INSERT' AND target LIKE 'copy:%' THEN
    source:=substring(target from '^copy:[12]:(.*)$');
    PERFORM 1 FROM sheets WHERE id=source FOR UPDATE;
    IF sheet_in_trash(source) THEN RAISE EXCEPTION 'Originalbladet ligger i skräpkorgen.' USING ERRCODE='55000'; END IF;
  END IF;
  PERFORM 1 FROM sheets WHERE id=target FOR UPDATE;
  IF sheet_in_trash(target) THEN
    RAISE EXCEPTION 'Bladet ligger i skräpkorgen.' USING ERRCODE='55000';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER protect_trashed_sheet BEFORE INSERT OR UPDATE ON sheets FOR EACH ROW EXECUTE FUNCTION guard_trashed_sheet();
CREATE TRIGGER protect_trashed_version BEFORE INSERT ON sheet_versions FOR EACH ROW EXECUTE FUNCTION guard_trashed_sheet();
CREATE TRIGGER protect_trashed_lock BEFORE INSERT OR UPDATE ON editing_locks FOR EACH ROW EXECUTE FUNCTION guard_trashed_sheet();
CREATE TRIGGER protect_trashed_finalization BEFORE INSERT OR UPDATE ON sheet_finalizations FOR EACH ROW EXECUTE FUNCTION guard_trashed_sheet();
REVOKE ALL ON sheet_trash FROM PUBLIC;
REVOKE ALL ON FUNCTION trash_sheet(text,int,boolean),restore_sheet(text,uuid),list_sheet_trash(),guard_trashed_sheet() FROM PUBLIC;
DO $$ DECLARE signature text; BEGIN
  FOREACH signature IN ARRAY ARRAY['sheet_in_trash(text)','can_trash_sheet(text)','trash_sheet(text,int,boolean)','restore_sheet(text,uuid)','list_sheet_trash()','guard_trashed_sheet()'] LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path TO %I,pg_temp',signature,current_schema());
  END LOOP;
END $$;
