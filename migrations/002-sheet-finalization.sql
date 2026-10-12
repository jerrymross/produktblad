CREATE TABLE sheet_finalizations (
  sheet_id text PRIMARY KEY REFERENCES sheets(id),
  finalized boolean NOT NULL,
  state_version int NOT NULL CHECK(state_version>0),
  changed_by text REFERENCES "user"(id),
  changed_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE sheet_finalization_events (
  sheet_id text REFERENCES sheets(id),
  state_version int NOT NULL,
  finalized boolean NOT NULL,
  revision int NOT NULL,
  changed_by text REFERENCES "user"(id),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY(sheet_id,state_version)
);
ALTER TABLE sheet_finalizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY finalization_read ON sheet_finalizations FOR SELECT
  USING(EXISTS(SELECT 1 FROM sheets s WHERE s.id=sheet_id));
ALTER TABLE sheet_finalization_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY finalization_events_read ON sheet_finalization_events FOR SELECT
  USING(EXISTS(SELECT 1 FROM sheets s WHERE s.id=sheet_id));

CREATE FUNCTION set_sheet_finalization(target text, desired boolean, expected_revision int,
  expected_state int, session_token uuid, confirmed boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path FROM CURRENT AS $$
DECLARE current_sheet sheets; previous sheet_finalizations; next_state int;
BEGIN
  IF current_app_user() IS NULL OR NOT is_central() THEN
    RAISE EXCEPTION 'Endast admin får låsa eller låsa upp blad.' USING ERRCODE='42501';
  END IF;
  SELECT * INTO current_sheet FROM sheets WHERE id=target FOR UPDATE;
  IF current_sheet.id IS NULL THEN RAISE EXCEPTION 'Bladet finns inte.' USING ERRCODE='P0002'; END IF;
  SELECT * INTO previous FROM sheet_finalizations WHERE sheet_id=target;
  IF expected_revision IS DISTINCT FROM current_sheet.revision
    OR expected_state IS DISTINCT FROM COALESCE(previous.state_version,0)
    OR desired IS NOT DISTINCT FROM COALESCE(previous.finalized,false) THEN
    RAISE EXCEPTION 'Bladets version eller låsstatus har ändrats. Läs in senaste status.' USING ERRCODE='40001';
  END IF;
  IF desired IS NULL OR current_sheet.revision<1 THEN
    RAISE EXCEPTION 'Spara bladet innan det låses.' USING ERRCODE='22023';
  END IF;
  IF NOT desired AND confirmed IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Bekräfta upplåsningen först.' USING ERRCODE='22023';
  END IF;
  IF desired AND NOT EXISTS(SELECT 1 FROM editing_locks WHERE sheet_id=target
    AND user_id=current_app_user() AND token=session_token AND expires_at>clock_timestamp()) THEN
    RAISE EXCEPTION 'Öppna bladet för redigering innan du låser det.' USING ERRCODE='40001';
  END IF;
  next_state:=COALESCE(previous.state_version,0)+1;
  INSERT INTO sheet_finalizations(sheet_id,finalized,state_version,changed_by)
    VALUES(target,desired,next_state,current_app_user())
    ON CONFLICT(sheet_id) DO UPDATE SET finalized=EXCLUDED.finalized,
      state_version=EXCLUDED.state_version,changed_by=EXCLUDED.changed_by,changed_at=clock_timestamp();
  INSERT INTO sheet_finalization_events(sheet_id,state_version,finalized,revision,changed_by)
    VALUES(target,next_state,desired,current_sheet.revision,current_app_user());
  IF desired THEN DELETE FROM editing_locks WHERE sheet_id=target; END IF;
END $$;
REVOKE ALL ON FUNCTION set_sheet_finalization(text,boolean,int,int,uuid,boolean) FROM PUBLIC;

-- Protect direct SQL updates too. All operations serialize on the parent sheet.
CREATE FUNCTION guard_finalized_sheet() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path FROM CURRENT AS $$
DECLARE target text;
BEGIN
  IF TG_TABLE_NAME='sheets' THEN target:=OLD.id; ELSE target:=NEW.sheet_id; END IF;
  PERFORM 1 FROM sheets WHERE id=target FOR UPDATE;
  IF EXISTS(SELECT 1 FROM sheet_finalizations WHERE sheet_id=target AND finalized) THEN
    RAISE EXCEPTION 'Bladet är låst av admin.' USING ERRCODE='55000';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION guard_finalized_sheet() FROM PUBLIC;
CREATE TRIGGER protect_finalized_sheet BEFORE UPDATE ON sheets
  FOR EACH ROW EXECUTE FUNCTION guard_finalized_sheet();
CREATE TRIGGER protect_finalized_version BEFORE INSERT ON sheet_versions
  FOR EACH ROW EXECUTE FUNCTION guard_finalized_sheet();
CREATE TRIGGER protect_finalized_editing_lock BEFORE INSERT OR UPDATE ON editing_locks
  FOR EACH ROW EXECUTE FUNCTION guard_finalized_sheet();

-- Put temporary objects last and exclude mutable public objects from resolution.
DO $$ BEGIN
  EXECUTE format('ALTER FUNCTION set_sheet_finalization(text,boolean,int,int,uuid,boolean) SET search_path TO %I,pg_temp',current_schema());
  EXECUTE format('ALTER FUNCTION guard_finalized_sheet() SET search_path TO %I,pg_temp',current_schema());
END $$;
