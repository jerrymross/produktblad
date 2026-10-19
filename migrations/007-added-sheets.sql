CREATE TABLE added_sheets (
  sheet_id text PRIMARY KEY REFERENCES sheets(id),
  school_id text NOT NULL REFERENCES schools(id),
  program text NOT NULL CHECK(program IN ('Komvux','AF','AF RUB')),
  title text NOT NULL CHECK(length(trim(title)) BETWEEN 1 AND 150),
  created_by text REFERENCES "user"(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
ALTER TABLE added_sheets ENABLE ROW LEVEL SECURITY;
CREATE POLICY added_read ON added_sheets FOR SELECT USING(can_access_school(school_id));
CREATE POLICY added_function_only ON sheets AS RESTRICTIVE FOR INSERT WITH CHECK(id NOT LIKE 'new:%');
CREATE POLICY added_school_immutable ON sheets AS RESTRICTIVE FOR UPDATE
  USING(true) WITH CHECK(id NOT LIKE 'new:%' OR EXISTS(
    SELECT 1 FROM added_sheets a WHERE a.sheet_id=id AND a.school_id=sheets.school_id AND a.title=sheets.title));

CREATE FUNCTION create_added_sheet(request_id uuid,school text,form text,heading text,initial jsonb,version text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path FROM CURRENT AS $$
DECLARE new_id text := 'new:'||request_id::text; previous added_sheets;
BEGIN
  IF current_app_user() IS NULL OR NOT can_access_school(school) OR school LIKE '\_\_%'
    OR NOT EXISTS(SELECT 1 FROM schools WHERE id=school) THEN
    RAISE EXCEPTION 'Du har inte åtkomst till den valda skolan.' USING ERRCODE='42501';
  END IF;
  IF request_id IS NULL OR form NOT IN ('Komvux','AF','AF RUB') OR form IS NULL
    OR heading IS NULL OR length(trim(heading)) NOT BETWEEN 1 AND 150 THEN
    RAISE EXCEPTION 'Välj utbildningsform och ange ett namn.' USING ERRCODE='22023';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext(new_id));
  SELECT * INTO previous FROM added_sheets WHERE sheet_id=new_id;
  IF FOUND THEN
    IF previous.created_by IS DISTINCT FROM current_app_user() OR previous.school_id<>school
      OR previous.program<>form OR previous.title<>heading THEN
      RAISE EXCEPTION 'Förfrågan har redan använts. Öppna formuläret igen.' USING ERRCODE='40001';
    END IF;
    RETURN new_id;
  END IF;
  INSERT INTO sheets(id,school_id,title,template_version,content,updated_by)
    VALUES(new_id,school,heading,version,initial,current_app_user());
  INSERT INTO added_sheets(sheet_id,school_id,program,title,created_by)
    VALUES(new_id,school,form,heading,current_app_user());
  RETURN new_id;
END $$;
REVOKE ALL ON added_sheets FROM PUBLIC;
REVOKE ALL ON FUNCTION create_added_sheet(uuid,text,text,text,jsonb,text) FROM PUBLIC;
DO $$ BEGIN
  EXECUTE format('ALTER FUNCTION create_added_sheet(uuid,text,text,text,jsonb,text) SET search_path TO %I,pg_temp',current_schema());
END $$;
