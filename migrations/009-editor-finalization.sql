CREATE OR REPLACE FUNCTION set_sheet_finalization(target text, desired boolean, expected_revision int,
  expected_state int, session_token uuid, confirmed boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path FROM CURRENT AS $$
DECLARE current_sheet sheets; previous sheet_finalizations; next_state int;
BEGIN
  IF current_app_user() IS NULL OR (desired IS DISTINCT FROM true AND NOT is_central()) THEN
    RAISE EXCEPTION 'Endast admin får låsa upp blad.' USING ERRCODE='42501';
  END IF;
  SELECT * INTO current_sheet FROM sheets WHERE id=target FOR UPDATE;
  IF current_sheet.id IS NULL THEN RAISE EXCEPTION 'Bladet finns inte.' USING ERRCODE='P0002'; END IF;
  IF NOT can_access_school(current_sheet.school_id) THEN RAISE EXCEPTION 'Du har inte åtkomst till skolans blad.' USING ERRCODE='42501'; END IF;
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
CREATE OR REPLACE FUNCTION guard_finalized_sheet() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path FROM CURRENT AS $$
DECLARE target text;
BEGIN
  IF TG_TABLE_NAME='sheets' THEN target:=OLD.id; ELSE target:=NEW.sheet_id; END IF;
  PERFORM 1 FROM sheets WHERE id=target FOR UPDATE;
  IF EXISTS(SELECT 1 FROM sheet_finalizations WHERE sheet_id=target AND finalized) THEN
    RAISE EXCEPTION 'Bladet är låst.' USING ERRCODE='55000';
  END IF;
  RETURN NEW;
END $$;

DO $$ BEGIN
  EXECUTE format('ALTER FUNCTION set_sheet_finalization(text,boolean,int,int,uuid,boolean) SET search_path TO %I,pg_temp',current_schema());
  EXECUTE format('ALTER FUNCTION guard_finalized_sheet() SET search_path TO %I,pg_temp',current_schema());
END $$;
