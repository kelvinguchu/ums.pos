"use server";

import {
  eq,
  ilike,
  desc,
  inArray,
  sql,
  getTableColumns,
  isNotNull,
} from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/lib/db";
import {
  meters,
  soldMeters,
  agentInventory,
  agents,
  saleBatches,
  faultyReturns,
  meterPurchaseBatches,
  userProfiles,
} from "@/lib/db/schema";

type MeterRecord = typeof meters.$inferSelect;

let metersCache: string[] | null = null;
const meterDetailsCache = new Map<string, MeterRecord | null>();

type MeterStatus = "in_stock" | "with_agent" | "sold" | "replaced" | "faulty";

type AgentInfo = {
  id: string | null;
  name: string | null;
  location: string | null;
} | null;

type SaleDetails = {
  sold_at: Date | null;
  sold_by: string | null;
  destination: string | null;
  recipient: string | null;
  customer_contact: string | null;
  unit_price: number | string | null;
  batch_id: string | null;
  seller_name?: string | null;
  seller_role?: string | null;
} | null;

type ReplacementDetails = {
  replacement_serial: string | null;
  replacement_date: Date | null;
  replacement_by: string | null;
  replacement_by_role?: string | null;
} | null;

type FaultDetails = {
  returned_at: Date | null;
  returner_name: string | null;
  fault_description: string | null;
  fault_status: string | null;
} | null;

type SuperSearchResult = {
  serial_number: string;
  type: string | null;
  status: MeterStatus;
  agent?: AgentInfo;
  sale_details?: SaleDetails;
  replacement_details?: ReplacementDetails;
  fault_details?: FaultDetails;
};

const statusPriority: Record<MeterStatus, number> = {
  with_agent: 0,
  sold: 1,
  replaced: 1,
  faulty: 2,
  in_stock: 3,
};

type SearchMode = "exact" | "partial";

function mapStockResults(
  stockMeters: Array<{ serial_number: string; type: string | null }>
): SuperSearchResult[] {
  return stockMeters.map((meter) => ({
    serial_number: meter.serial_number,
    type: meter.type,
    status: "in_stock",
  }));
}

function mapAgentResults(
  agentMeters: Array<{
    serial_number: string;
    type: string | null;
    agent: {
      id: string | null;
      name: string | null;
      location: string | null;
    } | null;
  }>
): SuperSearchResult[] {
  return agentMeters.map((meter) => ({
    serial_number: meter.serial_number,
    type: meter.type,
    status: "with_agent",
    agent: meter.agent,
  }));
}

function mapSoldResults(
  soldMetersData: Array<{
    serial_number: string;
    meter_type: string | null;
    sold_at: Date | null;
    sold_by: string | null;
    sold_by_name: string | null;
    sold_by_role: string | null;
    destination: string | null;
    recipient: string | null;
    customer_contact: string | null;
    unit_price: number | string | null;
    batch_id: string | null;
    replacement_serial: string | null;
    replacement_date: Date | null;
    replacement_by: string | null;
    replacement_by_name: string | null;
    replacement_by_role: string | null;
  }>
): SuperSearchResult[] {
  return soldMetersData.map((meter) => {
    const hasReplacement = Boolean(meter.replacement_serial);
    const status: MeterStatus = hasReplacement ? "replaced" : "sold";

    const saleDetails: Exclude<SaleDetails, null> = {
      sold_at: meter.sold_at,
      sold_by: meter.sold_by_name || meter.sold_by || null,
      destination: meter.destination || null,
      recipient: meter.recipient || null,
      customer_contact: meter.customer_contact || null,
      unit_price: meter.unit_price ?? null,
      batch_id: meter.batch_id || null,
      seller_name: meter.sold_by_name || null,
      seller_role: meter.sold_by_role || null,
    };

    const result: SuperSearchResult = {
      serial_number: meter.serial_number,
      type: meter.meter_type,
      status,
      sale_details: saleDetails,
    };

    if (hasReplacement) {
      result.replacement_details = {
        replacement_serial: meter.replacement_serial,
        replacement_date: meter.replacement_date,
        replacement_by:
          meter.replacement_by_name || meter.replacement_by || null,
        replacement_by_role: meter.replacement_by_role || null,
      };
    }

    return result;
  });
}

function mapFaultyResults(
  faultyMeters: Array<{
    serial_number: string;
    type: string | null;
    returned_at: Date | null;
    returner_name: string | null;
    fault_description: string | null;
    status: string | null;
  }>
): SuperSearchResult[] {
  return faultyMeters.map((meter) => ({
    serial_number: meter.serial_number,
    type: meter.type,
    status: "faulty",
    fault_details: {
      returned_at: meter.returned_at || null,
      returner_name: meter.returner_name || null,
      fault_description: meter.fault_description || null,
      fault_status: meter.status || null,
    },
  }));
}

function attachFaultDetails(
  target: SuperSearchResult,
  faultDetails?: FaultDetails | undefined
) {
  if (faultDetails) {
    target.fault_details = faultDetails;
  }
}

function shouldReplaceResult(
  existing: SuperSearchResult,
  candidate: SuperSearchResult
) {
  return statusPriority[candidate.status] < statusPriority[existing.status];
}

function mergeResult(
  uniqueResults: Map<string, SuperSearchResult>,
  result: SuperSearchResult
) {
  const normalizedSerial = normalizeSerialNumber(result.serial_number);
  const existing = uniqueResults.get(normalizedSerial);

  if (!existing) {
    uniqueResults.set(normalizedSerial, { ...result });
    return;
  }

  if (result.status === "faulty" && existing.status !== "faulty") {
    attachFaultDetails(existing, result.fault_details ?? undefined);
    return;
  }

  if (existing.status === "faulty" && result.status !== "faulty") {
    const candidate = { ...result };
    if (!candidate.fault_details) {
      attachFaultDetails(candidate, existing.fault_details ?? undefined);
    }
    uniqueResults.set(normalizedSerial, candidate);
    return;
  }

  if (shouldReplaceResult(existing, result)) {
    const candidate = { ...result };
    if (!candidate.fault_details) {
      attachFaultDetails(candidate, existing.fault_details ?? undefined);
    }
    uniqueResults.set(normalizedSerial, candidate);
  }
}

function mergeResults(
  transformedResults: SuperSearchResult[]
): SuperSearchResult[] {
  const uniqueResults = new Map<string, SuperSearchResult>();

  for (const result of transformedResults) {
    mergeResult(uniqueResults, result);
  }

  return Array.from(uniqueResults.values());
}

async function executeSearchQueries(term: string, mode: SearchMode) {
  const useExact = mode === "exact";
  const pattern = `%${term}%`;
  const limit = useExact ? 3 : 5;

  const stockCondition = useExact
    ? eq(meters.serial_number, term)
    : ilike(meters.serial_number, pattern);

  const agentCondition = useExact
    ? eq(agentInventory.serial_number, term)
    : ilike(agentInventory.serial_number, pattern);

  const soldCondition = useExact
    ? eq(soldMeters.serial_number, term)
    : ilike(soldMeters.serial_number, pattern);

  const faultyCondition = useExact
    ? eq(faultyReturns.serial_number, term)
    : ilike(faultyReturns.serial_number, pattern);

  const soldByUser = alias(userProfiles, `${mode}_sold_by_user`);
  const replacedByUser = alias(userProfiles, `${mode}_replaced_by_user`);

  const [stock, agent, sold, faulty] = await Promise.all([
    db
      .select({
        serial_number: meters.serial_number,
        type: meters.type,
      })
      .from(meters)
      .where(stockCondition)
      .limit(limit),

    db
      .select({
        serial_number: agentInventory.serial_number,
        type: agentInventory.type,
        agent: {
          id: agents.id,
          name: agents.name,
          location: agents.location,
        },
      })
      .from(agentInventory)
      .leftJoin(agents, eq(agentInventory.agent_id, agents.id))
      .where(agentCondition)
      .limit(limit),

    db
      .select({
        id: soldMeters.id,
        serial_number: soldMeters.serial_number,
        sold_at: soldMeters.sold_at,
        sold_by: soldMeters.sold_by,
        sold_by_name: soldByUser.name,
        sold_by_role: soldByUser.role,
        destination: soldMeters.destination,
        recipient: soldMeters.recipient,
        unit_price: soldMeters.unit_price,
        batch_id: soldMeters.batch_id,
        replacement_serial: soldMeters.replacement_serial,
        replacement_date: soldMeters.replacement_date,
        replacement_by: soldMeters.replacement_by,
        replacement_by_name: replacedByUser.name,
        replacement_by_role: replacedByUser.role,
        customer_contact: soldMeters.customer_contact,
        meter_type: saleBatches.meter_type,
      })
      .from(soldMeters)
      .leftJoin(saleBatches, eq(soldMeters.batch_id, saleBatches.id))
      .leftJoin(soldByUser, eq(soldMeters.sold_by, soldByUser.id))
      .leftJoin(
        replacedByUser,
        eq(soldMeters.replacement_by, replacedByUser.id)
      )
      .where(soldCondition)
      .limit(limit),

    db
      .select({
        serial_number: faultyReturns.serial_number,
        type: faultyReturns.type,
        returned_at: faultyReturns.returned_at,
        returner_name: faultyReturns.returner_name,
        fault_description: faultyReturns.fault_description,
        status: faultyReturns.status,
      })
      .from(faultyReturns)
      .where(faultyCondition)
      .limit(limit),
  ]);

  return {
    stock,
    agent,
    sold,
    faulty,
  };
}

function normalizeSerialNumber(serialNumber: string): string {
  return serialNumber.trim().toUpperCase();
}

export async function getAllMeters() {
  const data = await db
    .select({ serial_number: meters.serial_number })
    .from(meters);

  return data?.map((m) => normalizeSerialNumber(m.serial_number)) || [];
}

export async function checkMeterExists(serialNumber: string): Promise<boolean> {
  try {
    metersCache ??= await getAllMeters();
    const normalizedSerial = normalizeSerialNumber(serialNumber);
    return metersCache.includes(normalizedSerial);
  } catch (error) {
    console.error("Error checking meter existence:", error);
    throw error;
  }
}

export async function clearMetersCache() {
  metersCache = null;
  meterDetailsCache.clear();
}

async function checkUserActive(userId: string): Promise<boolean> {
  const [user] = await db
    .select({ is_active: userProfiles.is_active })
    .from(userProfiles)
    .where(eq(userProfiles.id, userId))
    .limit(1);

  return user?.is_active || false;
}

async function withActiveUserCheck<T>(
  userId: string,
  action: () => Promise<T>
): Promise<T> {
  const isActive = await checkUserActive(userId);
  if (!isActive) {
    throw new Error("ACCOUNT_DEACTIVATED");
  }
  return action();
}

export async function updateFaultyMeterStatus(
  meter: {
    id: string;
    serial_number: string;
    type: string;
    status: "repaired" | "unrepairable" | "pending";
  },
  updatedBy: string,
  updaterName: string
) {
  try {
    if (meter.status === "repaired") {
      await db.insert(meters).values({
        serial_number: meter.serial_number,
        type: meter.type,
        added_by: updatedBy,
        added_at: new Date(),
        adder_name: updaterName,
      });

      // 2. Delete from faulty_returns
      await db.delete(faultyReturns).where(eq(faultyReturns.id, meter.id));

      await clearMetersCache();

      return { message: "Meter restored to inventory" };
    } else {
      // Just update the status for pending or unrepairable
      await db
        .update(faultyReturns)
        .set({ status: meter.status })
        .where(eq(faultyReturns.id, meter.id));

      return { message: `Meter marked as ${meter.status}` };
    }
  } catch (error) {
    console.error("Error updating faulty meter status:", error);
    throw error;
  }
}

export async function addMeters(
  metersData: Array<{
    serial_number: string;
    type: string;
    added_by: string;
    added_at: Date;
    adder_name: string;
    batch_id?: string;
  }>
) {
  return withActiveUserCheck(metersData[0].added_by, async () => {
    const data = await db.insert(meters).values(metersData).returning();

    await clearMetersCache();
    return data;
  });
}

export async function checkMultipleSerialNumbers(
  serialNumbers: string[]
): Promise<string[]> {
  try {
    const data = await db
      .select({ serial_number: meters.serial_number })
      .from(meters)
      .where(inArray(meters.serial_number, serialNumbers));

    return data ? data.map((meter) => meter.serial_number) : [];
  } catch (error) {
    console.error("Error checking serial numbers:", error);
    throw error;
  }
}

export async function getMeterBySerial(serialNumber: string) {
  const normalizedSerial = normalizeSerialNumber(serialNumber);
  if (!normalizedSerial) {
    return null;
  }

  if (meterDetailsCache.has(normalizedSerial)) {
    return meterDetailsCache.get(normalizedSerial) ?? null;
  }

  const [record] = await db
    .select()
    .from(meters)
    .where(eq(meters.serial_number, normalizedSerial))
    .limit(1);

  const result = record ?? null;
  meterDetailsCache.set(normalizedSerial, result);

  return result;
}

export async function removeMeter(meterId: string) {
  try {
    // First verify the meter exists
    const [existing] = await db
      .select({ id: meters.id, serial_number: meters.serial_number })
      .from(meters)
      .where(eq(meters.id, meterId))
      .limit(1);

    if (!existing) {
      throw new Error(`Meter with ID ${meterId} not found in stock`);
    }

    // Delete the meter
    const result = await db
      .delete(meters)
      .where(eq(meters.id, meterId))
      .returning();

    if (!result || result.length === 0) {
      throw new Error(`Failed to delete meter ${meterId} from stock`);
    }

    await clearMetersCache();

    return result[0];
  } catch (error) {
    console.error("Error removing meter:", error);
    throw error;
  }
}

export async function getMeterCount() {
  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(meters);

  return Number(result?.count || 0);
}

export async function getAvailableReplacementMeters(type: string) {
  const data = await db
    .select({
      serial_number: meters.serial_number,
      type: meters.type,
    })
    .from(meters)
    .where(eq(meters.type, type));

  return data;
}

export async function addMeterPurchaseBatch({
  purchaseDate,
  addedBy,
  batchGroups,
}: {
  purchaseDate: Date;
  addedBy: string;
  batchGroups: Array<{
    type: string;
    count: number;
    totalCost: string;
  }>;
}) {
  try {
    const batchPromises = batchGroups.map(async (group) => {
      const [data] = await db
        .insert(meterPurchaseBatches)
        .values({
          meter_type: group.type.toLowerCase(),
          quantity: group.count,
          total_cost: group.totalCost,
          purchase_date: purchaseDate,
          added_by: addedBy,
          batch_number: `PB-${Date.now()}-${group.type.substring(0, 3).toUpperCase()}`,
        })
        .returning();

      return data;
    });

    const batches = await Promise.all(batchPromises);
    return batches[0];
  } catch (error) {
    console.error("Error adding meter purchase batch:", error);
    throw error;
  }
}

export async function getPurchaseBatches() {
  try {
    const meterCounts = db.$with("meter_counts").as(
      db
        .select({
          batch_id: meters.batch_id,
          count: sql<number>`count(${meters.id})`.as("count"),
        })
        .from(meters)
        .where(isNotNull(meters.batch_id))
        .groupBy(meters.batch_id)
    );

    const batches = await db
      .with(meterCounts)
      .select({
        ...getTableColumns(meterPurchaseBatches),
        remaining_meters: meterCounts.count,
        user_name: userProfiles.name,
      })
      .from(meterPurchaseBatches)
      .leftJoin(
        userProfiles,
        eq(meterPurchaseBatches.added_by, userProfiles.id)
      )
      .leftJoin(
        meterCounts,
        eq(sql`${meterPurchaseBatches.id}::text`, meterCounts.batch_id)
      )
      .orderBy(desc(meterPurchaseBatches.created_at));

    return batches.map((batch) => ({
      ...batch,
      remaining_meters: Number(batch.remaining_meters || 0),
      user_profiles: {
        name: batch.user_name || null,
      },
    }));
  } catch (error) {
    console.error("Error fetching purchase batches:", error);
    throw error;
  }
}

export async function updateMeterPurchaseBatch(
  serialNumbers: string[],
  batchId: string
) {
  try {
    await db
      .update(meters)
      .set({ batch_id: batchId })
      .where(inArray(meters.serial_number, serialNumbers));
  } catch (error) {
    console.error("Error updating meter batch IDs:", error);
    throw error;
  }
}

export async function checkMeterExistsInSoldMeters(
  serialNumber: string
): Promise<boolean> {
  try {
    const normalizedSerial = serialNumber.replace(/^0+/, "").toUpperCase();
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(soldMeters)
      .where(eq(soldMeters.serial_number, normalizedSerial))
      .limit(1);

    return Number(result?.count || 0) > 0;
  } catch (error) {
    console.error("Error checking meter in sold_meters:", error);
    throw error;
  }
}

export async function checkMeterExistsInAgentInventory(
  serialNumber: string
): Promise<boolean> {
  try {
    const normalizedSerial = serialNumber.replace(/^0+/, "").toUpperCase();
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(agentInventory)
      .where(eq(agentInventory.serial_number, normalizedSerial))
      .limit(1);

    return Number(result?.count || 0) > 0;
  } catch (error) {
    console.error("Error checking meter in agent_inventory:", error);
    throw error;
  }
}

// Combined check function for better performance (single query instead of two)
export async function checkMeterExistsAnywhere(serialNumber: string): Promise<{
  existsInSold: boolean;
  existsInAgent: boolean;
  existsInStock: boolean;
}> {
  try {
    const startTime = performance.now();
    const normalizedSerial = serialNumber.replace(/^0+/, "").toUpperCase();

    console.log(
      `[checkMeterExistsAnywhere] Checking serial: ${normalizedSerial}`
    );

    // Use raw SQL for the combined EXISTS query
    const result = await db.execute<{
      exists_in_sold: boolean;
      exists_in_agent: boolean;
      exists_in_stock: boolean;
    }>(sql`
      SELECT 
        EXISTS(SELECT 1 FROM ${soldMeters} WHERE ${soldMeters.serial_number} = ${normalizedSerial}) as exists_in_sold,
        EXISTS(SELECT 1 FROM ${agentInventory} WHERE ${agentInventory.serial_number} = ${normalizedSerial}) as exists_in_agent,
        EXISTS(SELECT 1 FROM ${meters} WHERE ${meters.serial_number} = ${normalizedSerial}) as exists_in_stock
    `);

    const endTime = performance.now();
    const duration = endTime - startTime;

    console.log(
      `[checkMeterExistsAnywhere] Query completed in ${duration.toFixed(2)}ms`
    );
    console.log(`[checkMeterExistsAnywhere] Raw result:`, result);

    const row = result[0];
    console.log(`[checkMeterExistsAnywhere] First row:`, row);

    const response = {
      existsInSold: row?.exists_in_sold || false,
      existsInAgent: row?.exists_in_agent || false,
      existsInStock: row?.exists_in_stock || false,
    };

    console.log(`[checkMeterExistsAnywhere] Response:`, response);

    return response;
  } catch (error) {
    console.error("Error checking meter existence:", error);
    throw error;
  }
}

export async function superSearchMeter(searchTerm: string) {
  if (!searchTerm || searchTerm.trim().length === 0) {
    return [];
  }

  const normalizedTerm = normalizeSerialNumber(searchTerm);

  const exactData = await executeSearchQueries(normalizedTerm, "exact");

  const exactResults = [
    ...mapStockResults(exactData.stock),
    ...mapAgentResults(exactData.agent),
    ...mapSoldResults(exactData.sold),
    ...mapFaultyResults(exactData.faulty),
  ];

  if (exactResults.length > 0 || normalizedTerm.length < 3) {
    return mergeResults(exactResults);
  }

  const partialData = await executeSearchQueries(normalizedTerm, "partial");

  const partialResults = [
    ...mapStockResults(partialData.stock),
    ...mapAgentResults(partialData.agent),
    ...mapSoldResults(partialData.sold),
    ...mapFaultyResults(partialData.faulty),
  ];

  return mergeResults([...exactResults, ...partialResults]);
}
