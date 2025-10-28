-- Add indexes to improve serial number lookup performance
-- These indexes will drastically speed up the checkMeterExistsInSoldMeters and checkMeterExistsInAgentInventory queries

-- Index for sold_meters.serial_number
CREATE INDEX IF NOT EXISTS idx_sold_meters_serial_number 
ON public.sold_meters USING btree (serial_number);

-- Index for agent_inventory.serial_number  
CREATE INDEX IF NOT EXISTS idx_agent_inventory_serial_number 
ON public.agent_inventory USING btree (serial_number);

-- Index for meters.serial_number (if not already covered by unique constraint)
-- The unique constraint already creates an index, but adding this for completeness
CREATE INDEX IF NOT EXISTS idx_meters_serial_number 
ON public.meters USING btree (serial_number);

-- Analyze tables to update statistics
ANALYZE public.sold_meters;
ANALYZE public.agent_inventory;
ANALYZE public.meters;
