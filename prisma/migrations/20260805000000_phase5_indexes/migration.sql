-- Phase 5: Database Optimization — Add missing indexes
-- Generated: 2026-08-05
-- Each index is created on whichever table name exists at this point in the
-- history: PascalCase before 20260921000000_snake_case_core_tables, snake_case
-- after it. Fresh databases replay the full history, so the name must be checked.

DO $$
DECLARE
  rec record;
BEGIN
  FOR rec IN
    SELECT * FROM (VALUES
      ('Message', 'messages', 'Message_conversationId_createdAt_idx', '"conversationId", "createdAt"'),
      ('Message', 'messages', 'Message_projectId_createdAt_idx', '"projectId", "createdAt"'),
      ('Message', 'messages', 'Message_status_idx', '"status"'),
      ('BuildJob', 'build_jobs', 'BuildJob_projectId_createdAt_idx', '"projectId", "createdAt"'),
      ('BuildJob', 'build_jobs', 'BuildJob_projectId_status_idx', '"projectId", "status"'),
      ('BuildJob', 'build_jobs', 'BuildJob_status_createdAt_idx', '"status", "createdAt"'),
      ('TokenUsage', 'token_usage', 'TokenUsage_endpoint_createdAt_idx', '"endpoint", "createdAt"'),
      ('UserAuditLog', 'user_audit_logs', 'UserAuditLog_event_createdAt_idx', '"event", "createdAt"')
    ) AS t(old_name, new_name, idx_name, cols)
  LOOP
    IF to_regclass(format('public.%I', rec.old_name)) IS NOT NULL THEN
      EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (%s)', rec.idx_name, rec.old_name, rec.cols);
    ELSIF to_regclass(format('public.%I', rec.new_name)) IS NOT NULL THEN
      EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (%s)', rec.idx_name, rec.new_name, rec.cols);
    END IF;
  END LOOP;
END $$;
