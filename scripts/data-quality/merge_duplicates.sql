CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS data_quality_merge_audit (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  entity text NOT NULL,
  primary_id text NOT NULL,
  duplicate_id text NOT NULL,
  merged_at timestamptz NOT NULL DEFAULT now(),
  notes text
);

CREATE OR REPLACE PROCEDURE merge_user_duplicate(primary_user_id uuid, duplicate_user_id uuid)
LANGUAGE plpgsql
AS $$
DECLARE
  record_row record;
BEGIN
  FOR record_row IN
    SELECT
      conrelid::regclass AS table_name,
      attname AS column_name
    FROM pg_constraint
    JOIN pg_attribute ON pg_attribute.attnum = ANY (pg_constraint.conkey)
      AND pg_attribute.attrelid = pg_constraint.conrelid
    WHERE confrelid = '"User"'::regclass
      AND contype = 'f'
  LOOP
    EXECUTE format('UPDATE %s SET %I = $1 WHERE %I = $2', record_row.table_name, record_row.column_name, record_row.column_name)
    USING primary_user_id, duplicate_user_id;
  END LOOP;

  DELETE FROM "User" WHERE id = duplicate_user_id;

  INSERT INTO data_quality_merge_audit (entity, primary_id, duplicate_id, notes)
  VALUES ('User', primary_user_id::text, duplicate_user_id::text, 'Merged via stored procedure');
END;
$$;

CREATE OR REPLACE PROCEDURE merge_property_duplicate(primary_property_id integer, duplicate_property_id integer)
LANGUAGE plpgsql
AS $$
DECLARE
  record_row record;
BEGIN
  FOR record_row IN
    SELECT
      conrelid::regclass AS table_name,
      attname AS column_name
    FROM pg_constraint
    JOIN pg_attribute ON pg_attribute.attnum = ANY (pg_constraint.conkey)
      AND pg_attribute.attrelid = pg_constraint.conrelid
    WHERE confrelid = '"Property"'::regclass
      AND contype = 'f'
  LOOP
    EXECUTE format('UPDATE %s SET %I = $1 WHERE %I = $2', record_row.table_name, record_row.column_name, record_row.column_name)
    USING primary_property_id, duplicate_property_id;
  END LOOP;

  DELETE FROM "Property" WHERE id = duplicate_property_id;

  INSERT INTO data_quality_merge_audit (entity, primary_id, duplicate_id, notes)
  VALUES ('Property', primary_property_id::text, duplicate_property_id::text, 'Merged via stored procedure');
END;
$$;
