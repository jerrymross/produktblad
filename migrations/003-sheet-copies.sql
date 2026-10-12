CREATE TABLE sheet_copies (
  copy_id text PRIMARY KEY REFERENCES sheets(id),
  source_id text NOT NULL REFERENCES sheets(id),
  source_revision int NOT NULL,
  copy_number int NOT NULL CHECK(copy_number IN(1,2)),
  created_by text NOT NULL REFERENCES "user"(id),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE(source_id,copy_number),
  CHECK(copy_id='copy:'||copy_number::text||':'||source_id)
);
ALTER TABLE sheet_copies ENABLE ROW LEVEL SECURITY;
CREATE POLICY copies_read ON sheet_copies FOR SELECT
  USING(EXISTS(SELECT 1 FROM sheets s WHERE s.id=source_id));
-- Runtime roles cannot manufacture extra copy sheets through direct INSERT.
-- The checked SECURITY DEFINER function below creates copies as the table owner.
CREATE POLICY copies_function_only ON sheets AS RESTRICTIVE FOR INSERT
  WITH CHECK(id NOT LIKE 'copy:%');

CREATE FUNCTION create_sheet_copy(target text,expected_revision int) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path FROM CURRENT AS $$
DECLARE source sheets; slot int; new_id text;
BEGIN
  SELECT * INTO source FROM sheets WHERE id=target FOR UPDATE;
  IF current_app_user() IS NULL OR source.id IS NULL OR NOT can_access_school(source.school_id) THEN
    RAISE EXCEPTION 'Du har inte åtkomst till bladet.' USING ERRCODE='42501';
  END IF;
  IF source.school_id='__templates__' OR target LIKE 'copy:%'
    OR NOT EXISTS(SELECT 1 FROM sheet_finalizations WHERE sheet_id=target AND finalized) THEN
    RAISE EXCEPTION 'En kopia kan bara skapas från ett låst originalblad.' USING ERRCODE='22023';
  END IF;
  IF expected_revision IS DISTINCT FROM source.revision OR source.revision<1 THEN
    RAISE EXCEPTION 'Originalets version har ändrats. Öppna bladet igen.' USING ERRCODE='40001';
  END IF;
  SELECT COALESCE(max(copy_number),0)+1 INTO slot FROM sheet_copies WHERE source_id=target;
  IF slot>2 THEN RAISE EXCEPTION 'Det finns redan två kopior av detta blad.' USING ERRCODE='54000'; END IF;
  new_id:='copy:'||slot::text||':'||target;
  INSERT INTO sheets(id,school_id,title,template_version,content,revision,updated_by)
    VALUES(new_id,source.school_id,source.title,source.template_version,source.content,1,current_app_user());
  INSERT INTO sheet_versions(sheet_id,revision,template_version,content,changed_by)
    VALUES(new_id,1,source.template_version,source.content,current_app_user());
  INSERT INTO sheet_copies(copy_id,source_id,source_revision,copy_number,created_by)
    VALUES(new_id,target,source.revision,slot,current_app_user());
  RETURN new_id;
END $$;
REVOKE ALL ON FUNCTION create_sheet_copy(text,int) FROM PUBLIC;
DO $$ BEGIN
  EXECUTE format('ALTER FUNCTION create_sheet_copy(text,int) SET search_path TO %I,pg_temp',current_schema());
END $$;
