-- Migration: Consolidate project vergabe fields into a single `data` JSONB column
-- Run as a single atomic transaction. On failure → automatic ROLLBACK.

BEGIN;

-- 1. Add new columns
ALTER TABLE projects ADD COLUMN IF NOT EXISTS data jsonb DEFAULT '{}'::jsonb;
ALTER TABLE _projects_v ADD COLUMN IF NOT EXISTS version_data jsonb DEFAULT '{}'::jsonb;

-- 2. Backfill: Copy existing data into the JSON column
UPDATE projects SET data = jsonb_strip_nulls(jsonb_build_object(
  'vergaberecht', vergaberecht::text,
  'verfahrensart', verfahrensart,
  'auftragsart', auftragsart::text,
  'cpvCode', cpv_code,
  'schaetzwert', schaetzwert,
  'oberschwelle', oberschwelle,
  'termine', termine,
  'auftraggeber', auftraggeber,
  'notizen', notizen,
  'settings', jsonb_build_object(
    'defaultCategory', settings_default_category::text,
    'requireApproval', settings_require_approval,
    'autoTagging', settings_auto_tagging
  )
));

UPDATE _projects_v SET version_data = jsonb_strip_nulls(jsonb_build_object(
  'vergaberecht', version_vergaberecht::text,
  'verfahrensart', version_verfahrensart,
  'auftragsart', version_auftragsart::text,
  'cpvCode', version_cpv_code,
  'schaetzwert', version_schaetzwert,
  'oberschwelle', version_oberschwelle,
  'termine', version_termine,
  'auftraggeber', version_auftraggeber,
  'notizen', version_notizen,
  'settings', jsonb_build_object(
    'defaultCategory', version_settings_default_category::text,
    'requireApproval', version_settings_require_approval,
    'autoTagging', version_settings_auto_tagging
  )
));

-- 3. Verification: Count check
DO $$
DECLARE
  total INT; backfilled INT;
BEGIN
  SELECT count(*) INTO total FROM projects;
  SELECT count(*) INTO backfilled FROM projects WHERE data IS NOT NULL AND data != '{}'::jsonb;
  IF total > 0 AND backfilled = 0 THEN
    RAISE EXCEPTION 'Backfill verification failed: % rows, 0 backfilled', total;
  END IF;
END $$;

-- 4. Drop old columns (projects)
ALTER TABLE projects
  DROP COLUMN IF EXISTS vergaberecht,
  DROP COLUMN IF EXISTS verfahrensart,
  DROP COLUMN IF EXISTS auftragsart,
  DROP COLUMN IF EXISTS cpv_code,
  DROP COLUMN IF EXISTS schaetzwert,
  DROP COLUMN IF EXISTS oberschwelle,
  DROP COLUMN IF EXISTS termine,
  DROP COLUMN IF EXISTS auftraggeber,
  DROP COLUMN IF EXISTS notizen,
  DROP COLUMN IF EXISTS settings_default_category,
  DROP COLUMN IF EXISTS settings_require_approval,
  DROP COLUMN IF EXISTS settings_auto_tagging;

-- 5. Drop old columns (_projects_v)
ALTER TABLE _projects_v
  DROP COLUMN IF EXISTS version_vergaberecht,
  DROP COLUMN IF EXISTS version_verfahrensart,
  DROP COLUMN IF EXISTS version_auftragsart,
  DROP COLUMN IF EXISTS version_cpv_code,
  DROP COLUMN IF EXISTS version_schaetzwert,
  DROP COLUMN IF EXISTS version_oberschwelle,
  DROP COLUMN IF EXISTS version_termine,
  DROP COLUMN IF EXISTS version_auftraggeber,
  DROP COLUMN IF EXISTS version_notizen,
  DROP COLUMN IF EXISTS version_settings_default_category,
  DROP COLUMN IF EXISTS version_settings_require_approval,
  DROP COLUMN IF EXISTS version_settings_auto_tagging;

-- 6. Drop helper tables
DROP TABLE IF EXISTS _projects_v_version_settings_allowed_file_types;
DROP TABLE IF EXISTS projects_settings_allowed_file_types;

-- 7. Drop orphaned enum types
DROP TYPE IF EXISTS enum_projects_vergaberecht;
DROP TYPE IF EXISTS enum_projects_auftragsart;
DROP TYPE IF EXISTS enum_projects_settings_default_category;
DROP TYPE IF EXISTS enum__projects_v_version_vergaberecht;
DROP TYPE IF EXISTS enum__projects_v_version_auftragsart;
DROP TYPE IF EXISTS enum__projects_v_version_settings_default_category;

COMMIT;
