-- Normalize core table names to snake_case plural, matching the rest of the schema.
-- ALTER TABLE ... RENAME is metadata-only in Postgres: data, indexes,
-- foreign keys and defaults are preserved. FK constraints and index names
-- keep their historical names, which is harmless.
ALTER TABLE "Project" RENAME TO "projects";
ALTER TABLE "Message" RENAME TO "messages";
ALTER TABLE "Fragment" RENAME TO "fragments";
ALTER TABLE "BuildJob" RENAME TO "build_jobs";
