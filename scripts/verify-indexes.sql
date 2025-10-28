-- Verify that the serial number indexes exist and get their statistics

-- Check if indexes exist
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE indexname IN (
    'idx_sold_meters_serial_number',
    'idx_agent_inventory_serial_number',
    'idx_meters_serial_number',
    'meters_serial_number_key'  -- This is the unique constraint index
)
ORDER BY tablename, indexname;

-- Get index usage statistics
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan as number_of_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE indexname IN (
    'idx_sold_meters_serial_number',
    'idx_agent_inventory_serial_number', 
    'idx_meters_serial_number',
    'meters_serial_number_key'
)
ORDER BY tablename, indexname;

-- Check table sizes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as indexes_size
FROM pg_tables
WHERE tablename IN ('meters', 'sold_meters', 'agent_inventory')
ORDER BY tablename;
