-- Performance optimization indexes for slow queries
-- Run this script to add missing indexes that will dramatically improve query performance

-- ============================================================================
-- CRITICAL: Index for sold_meters.batch_id
-- This is used heavily in getMetersByBatchId() which is called when viewing sale details
-- Without this index, PostgreSQL does a full table scan on sold_meters
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_sold_meters_batch_id 
ON public.sold_meters USING btree (batch_id);

-- ============================================================================
-- Additional helpful indexes for common queries
-- ============================================================================

-- Index for sold_meters serial number lookups (used in returns and searches)
CREATE INDEX IF NOT EXISTS idx_sold_meters_serial_number 
ON public.sold_meters USING btree (serial_number);

-- Index for sold_meters status queries (filtering active/faulty/replaced meters)
CREATE INDEX IF NOT EXISTS idx_sold_meters_status 
ON public.sold_meters USING btree (status);

-- Composite index for batch_id + status (even faster for filtered queries)
CREATE INDEX IF NOT EXISTS idx_sold_meters_batch_id_status 
ON public.sold_meters USING btree (batch_id, status);

-- Index for agents.is_active (speeds up filtering active agents)
CREATE INDEX IF NOT EXISTS idx_agents_is_active 
ON public.agents USING btree (is_active);

-- Index for sale_batches.sale_date (speeds up date range queries)
CREATE INDEX IF NOT EXISTS idx_sale_batches_sale_date 
ON public.sale_batches USING btree (sale_date DESC);

-- Index for sale_batches.user_id (speeds up user sales queries)
CREATE INDEX IF NOT EXISTS idx_sale_batches_user_id 
ON public.sale_batches USING btree (user_id);

-- ============================================================================
-- Verification queries - Run these to check if indexes were created
-- ============================================================================

-- Check all indexes on sold_meters table
SELECT 
    indexname, 
    indexdef 
FROM pg_indexes 
WHERE tablename = 'sold_meters' 
ORDER BY indexname;

-- Check all indexes on agents table
SELECT 
    indexname, 
    indexdef 
FROM pg_indexes 
WHERE tablename = 'agents' 
ORDER BY indexname;

-- Check all indexes on sale_batches table
SELECT 
    indexname, 
    indexdef 
FROM pg_indexes 
WHERE tablename = 'sale_batches' 
ORDER BY indexname;

-- ============================================================================
-- Performance testing - Run EXPLAIN ANALYZE to see the improvement
-- ============================================================================

-- Test query for getMetersByBatchId (replace 'your-batch-id' with actual UUID)
-- EXPLAIN ANALYZE
-- SELECT serial_number 
-- FROM sold_meters 
-- WHERE batch_id = 'your-batch-id';

-- Test query for getAgentsList
-- EXPLAIN ANALYZE
-- SELECT 
--     a.id, a.name, a.phone_number, a.location, a.county, 
--     a.is_active, a.created_at, COUNT(ai.id) as total_meters
-- FROM agents a
-- LEFT JOIN agent_inventory ai ON a.id = ai.agent_id
-- GROUP BY a.id, a.name, a.phone_number, a.location, a.county, a.is_active, a.created_at
-- ORDER BY a.created_at DESC;
