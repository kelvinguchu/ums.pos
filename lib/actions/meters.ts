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

let metersCache: string[] | null = null;

export async function getAllMeters() {
  const data = await db
    .select({ serial_number: meters.serial_number })
    .from(meters);

  return data?.map((m) => m.serial_number) || [];
}

export async function checkMeterExists(serialNumber: string): Promise<boolean> {
  try {
    metersCache ??= await getAllMeters();

    return metersCache.includes(serialNumber);
  } catch (error) {
    console.error("Error checking meter existence:", error);
    throw error;
  }
}

export async function clearMetersCache() {
  metersCache = null;
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
      // 1. Add the meter back to meters table
      await db.insert(meters).values({
        serial_number: meter.serial_number,
        type: meter.type,
        added_by: updatedBy,
        added_at: new Date(),
        adder_name: updaterName,
      });

      // 2. Delete from faulty_returns
      await db.delete(faultyReturns).where(eq(faultyReturns.id, meter.id));

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

    clearMetersCache();
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
  const normalizedSerial = serialNumber.toUpperCase().trim();
  const data = await db
    .select()
    .from(meters)
    .where(eq(meters.serial_number, normalizedSerial))
    .limit(1);

  return data[0] || null;
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

    console.log(
      `Successfully removed meter ${existing.serial_number} (${meterId}) from stock`
    );
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
    const data = await db
      .select({ serial_number: soldMeters.serial_number })
      .from(soldMeters)
      .where(eq(soldMeters.serial_number, normalizedSerial))
      .limit(1);

    return data && data.length > 0;
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
    const data = await db
      .select({ serial_number: agentInventory.serial_number })
      .from(agentInventory)
      .where(eq(agentInventory.serial_number, normalizedSerial))
      .limit(1);

    return data && data.length > 0;
  } catch (error) {
    console.error("Error checking meter in agent_inventory:", error);
    throw error;
  }
}

export async function superSearchMeter(searchTerm: string) {
  if (!searchTerm || searchTerm.trim().length === 0) {
    return [];
  }

  const soldByUser = alias(userProfiles, "soldByUser");

  const replacedByUser = alias(userProfiles, "replacedByUser");

  const [stockMeters, agentMeters, soldMetersData, faultyMeters] =
    await Promise.all([
      // Get meters in stock

      db

        .select({
          serial_number: meters.serial_number,

          type: meters.type,
        })

        .from(meters)

        .where(ilike(meters.serial_number, `%${searchTerm}%`))

        .limit(5), // Get meters with agents

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

        .where(ilike(agentInventory.serial_number, `%${searchTerm}%`))

        .limit(5),

      // Get sold meters with replacements

      db

        .select({
          id: soldMeters.id,

          serial_number: soldMeters.serial_number,

          sold_at: soldMeters.sold_at,

          sold_by: soldMeters.sold_by,

          sold_by_name: soldByUser.name,

          destination: soldMeters.destination,

          recipient: soldMeters.recipient,

          unit_price: soldMeters.unit_price,

          batch_id: soldMeters.batch_id,

          replacement_serial: soldMeters.replacement_serial,

          replacement_date: soldMeters.replacement_date,

          replacement_by: soldMeters.replacement_by,

          replacement_by_name: replacedByUser.name,

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

        .where(ilike(soldMeters.serial_number, `%${searchTerm}%`))

        .limit(5),

      // Get faulty meters

      db

        .select()

        .from(faultyReturns)

        .where(ilike(faultyReturns.serial_number, `%${searchTerm}%`))

        .limit(5),
    ]);

  const transformedResults = [
    ...stockMeters.map((meter) => ({
      serial_number: meter.serial_number,

      type: meter.type,

      status: "in_stock",
    })),

    ...agentMeters.map((meter) => ({
      serial_number: meter.serial_number,

      type: meter.type,

      status: "with_agent",

      agent: meter.agent,
    })),

    ...soldMetersData.map((meter) => ({
      serial_number: meter.serial_number,

      type: meter.meter_type,

      status: meter.replacement_serial ? "replaced" : "sold",

      sale_details: {
        sold_at: meter.sold_at,

        sold_by: meter.sold_by_name || meter.sold_by,

        destination: meter.destination,

        recipient: meter.recipient,

        customer_contact: meter.customer_contact,

        unit_price: meter.unit_price,

        batch_id: meter.batch_id,
      },

      replacement_details: meter.replacement_serial
        ? {
            replacement_serial: meter.replacement_serial,

            replacement_date: meter.replacement_date,

            replacement_by: meter.replacement_by_name || meter.replacement_by,
          }
        : null,
    })),

    ...faultyMeters.map((meter) => ({
      serial_number: meter.serial_number,

      type: meter.type,

      status: "faulty",

      fault_details: {
        returned_at: meter.returned_at,

        returner_name: meter.returner_name,

        fault_description: meter.fault_description,

        fault_status: meter.status,
      },
    })),
  ];

  return transformedResults;
}
