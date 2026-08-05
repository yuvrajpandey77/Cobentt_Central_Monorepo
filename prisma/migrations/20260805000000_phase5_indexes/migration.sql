-- Phase 5: Database Optimization — Add missing indexes
-- Generated: 2026-08-05

-- Message table: optimize conversation listing and project message queries
CREATE INDEX IF NOT EXISTS "Message_conversationId_createdAt_idx" ON "Message"("conversationId", "createdAt");
CREATE INDEX IF NOT EXISTS "Message_projectId_createdAt_idx" ON "Message"("projectId", "createdAt");
CREATE INDEX IF NOT EXISTS "Message_status_idx" ON "Message"("status");

-- BuildJob table: optimize project build job listing and status checks
CREATE INDEX IF NOT EXISTS "BuildJob_projectId_createdAt_idx" ON "BuildJob"("projectId", "createdAt");
CREATE INDEX IF NOT EXISTS "BuildJob_projectId_status_idx" ON "BuildJob"("projectId", "status");
CREATE INDEX IF NOT EXISTS "BuildJob_status_createdAt_idx" ON "BuildJob"("status", "createdAt");

-- TokenUsage table: optimize endpoint analytics queries
CREATE INDEX IF NOT EXISTS "TokenUsage_endpoint_createdAt_idx" ON "TokenUsage"("endpoint", "createdAt");

-- UserAuditLog table: optimize event filtering queries
CREATE INDEX IF NOT EXISTS "UserAuditLog_event_createdAt_idx" ON "UserAuditLog"("event", "createdAt");
