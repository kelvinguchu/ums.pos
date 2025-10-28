"use server";

import { eq, and, sql, desc, inArray, ilike, count } from "drizzle-orm";
import { db } from "../db";
import {
  agents,
  agentInventory,
  agentTransactions,
  meters,
} from "../db/schema";
import { KENYA_COUNTIES, type KenyaCounty } from "../constants/locationData";
import { clearMetersCache } from "./meters";

interface CurrentUser {
  id: string;
  name?: string;
  email?: string;
}

export async function getAgentsList() {
  try {
    // Get agents with their meter counts using LEFT JOIN and GROUP BY
    const agentsData = await db
      .select({
        id: agents.id,
        name: agents.name,
        phone_number: agents.phone_number,
        location: agents.location,
        county: agents.county,
        is_active: agents.is_active,
        created_at: agents.created_at,
        total_meters: count(agentInventory.id),
      })
      .from(agents)
      .leftJoin(agentInventory, eq(agents.id, agentInventory.agent_id))
      .groupBy(
        agents.id,
        agents.name,
        agents.phone_number,
        agents.location,
        agents.county,
        agents.is_active,
        agents.created_at
      )
      .orderBy(desc(agents.created_at));

    return agentsData;
  } catch (error) {
    console.error("Error fetching agents:", error);
    return [];
  }
}

export async function updateAgentStatus(agentId: string, isActive: boolean) {
  try {
    await db
      .update(agents)
      .set({ is_active: isActive })
      .where(eq(agents.id, agentId));

    return true;
  } catch (error) {
    console.error("Error updating agent status:", error);
    throw error;
  }
}

export async function updateAgentDetails(
  agentId: string,
  updates: {
    name?: string;
    phone_number?: string;
    location?: string;
    county?: KenyaCounty;
  }
) {
  try {
    // Validate county if it's being updated
    if (updates.county && !KENYA_COUNTIES.includes(updates.county)) {
      throw new Error("Invalid county selected");
    }

    const [updatedAgent] = await db
      .update(agents)
      .set(updates)
      .where(eq(agents.id, agentId))
      .returning();

    if (!updatedAgent) {
      throw new Error("Agent not found");
    }

    return updatedAgent;
  } catch (error: any) {
    if (error.code === "23505") {
      throw new Error("Phone number already registered to another agent");
    }
    console.error("Error updating agent details:", error);
    throw error;
  }
}

export async function createAgent(agentData: {
  name: string;
  phone_number: string;
  location: string;
  county: KenyaCounty;
}) {
  try {
    // Validate county
    if (!KENYA_COUNTIES.includes(agentData.county)) {
      throw new Error("Invalid county selected");
    }

    const [data] = await db
      .insert(agents)
      .values({
        ...agentData,
        is_active: true,
      })
      .returning();

    return data;
  } catch (error: any) {
    if (error.code === "23505") {
      throw new Error("Phone number already registered");
    }
    console.error("Error creating agent:", error);
    throw error;
  }
}

export async function assignMetersToAgent({
  agentId,
  meters: meterList,
  assignedBy,
}: {
  agentId: string;
  meters: Array<{
    meter_id: string;
    serial_number: string;
    type: string;
  }>;
  assignedBy: string;
}) {
  if (!agentId?.trim()) {
    throw new Error("Agent ID is required");
  }

  if (meterList.length === 0) {
    throw new Error("No meters provided for assignment");
  }

  const meterIdSet = new Set<string>();
  const duplicateIds = new Set<string>();
  const serialSet = new Set<string>();
  const duplicateSerials = new Set<string>();

  for (const meter of meterList) {
    if (meterIdSet.has(meter.meter_id)) {
      duplicateIds.add(meter.meter_id);
    } else {
      meterIdSet.add(meter.meter_id);
    }

    const normalizedSerial = meter.serial_number.trim().toUpperCase();
    if (serialSet.has(normalizedSerial)) {
      duplicateSerials.add(normalizedSerial);
    } else {
      serialSet.add(normalizedSerial);
    }
  }

  if (duplicateIds.size > 0) {
    throw new Error(
      `Duplicate meter IDs detected: ${Array.from(duplicateIds).join(", ")}`
    );
  }

  if (duplicateSerials.size > 0) {
    throw new Error(
      `Duplicate serial numbers detected: ${Array.from(duplicateSerials).join(", ")}`
    );
  }

  try {
    const result = await db.transaction(async (tx) => {
      const meterIds = meterList.map((m) => m.meter_id);

      const availableMeters = await tx
        .select({
          id: meters.id,
          serial_number: meters.serial_number,
          type: meters.type,
        })
        .from(meters)
        .where(inArray(meters.id, meterIds));

      if (availableMeters.length !== meterList.length) {
        const foundIds = new Set(availableMeters.map((m) => m.id));
        const missingIds = meterIds.filter((id) => !foundIds.has(id));
        throw new Error(
          `Some meters are no longer available for assignment. Missing IDs: ${missingIds.join(", ")}`
        );
      }

      const inventoryPayload = availableMeters.map((meter) => ({
        agent_id: agentId,
        meter_id: meter.id,
        serial_number: meter.serial_number,
        type: meter.type,
      }));

      const insertedInventory = await tx
        .insert(agentInventory)
        .values(inventoryPayload)
        .returning();

      const typeCounts = new Map<string, number>();
      for (const meter of availableMeters) {
        typeCounts.set(meter.type, (typeCounts.get(meter.type) ?? 0) + 1);
      }

      const transactionsPayload = Array.from(typeCounts.entries()).map(
        ([type, quantity]) => ({
          agent_id: agentId,
          transaction_type: "assignment" as const,
          meter_type: type,
          quantity,
        })
      );

      if (transactionsPayload.length > 0) {
        await tx.insert(agentTransactions).values(transactionsPayload);
      }

      const removedMeters = await tx
        .delete(meters)
        .where(inArray(meters.id, meterIds))
        .returning({ id: meters.id });

      if (removedMeters.length !== meterList.length) {
        throw new Error(
          "Failed to remove all meters from stock during assignment"
        );
      }

      return insertedInventory;
    });

    await clearMetersCache();

    return result;
  } catch (error) {
    console.error("Error assigning meters to agent:", error);
    throw error;
  }
}

export async function getAgentInventory(agentId: string) {
  try {
    const data = await db
      .select()
      .from(agentInventory)
      .where(eq(agentInventory.agent_id, agentId))
      .orderBy(desc(agentInventory.assigned_at));

    return data;
  } catch (error) {
    console.error("Error fetching agent inventory:", error);
    throw error;
  }
}

export async function getAgentInventoryBySerial(
  serialNumber: string,
  agentId: string
) {
  try {
    const normalizedSerial = serialNumber.toUpperCase();

    const [data] = await db
      .select()
      .from(agentInventory)
      .where(
        and(
          eq(agentInventory.agent_id, agentId),
          ilike(agentInventory.serial_number, normalizedSerial)
        )
      )
      .limit(1);

    return data;
  } catch (error) {
    console.error("Error retrieving meter from agent inventory:", error);
    throw error;
  }
}

export async function returnMetersFromAgent({
  agentId,
  meters: meterList,
  returnedBy,
  returnerName,
}: {
  agentId: string;
  meters: Array<{
    meter_id: string;
    serial_number: string;
    type: string;
  }>;
  returnedBy: string;
  returnerName: string;
}) {
  try {
    await db.transaction(async (tx) => {
      const metersToRestore = meterList.map((meter) => ({
        serial_number: meter.serial_number,
        type: meter.type,
        added_by: returnedBy,
        adder_name: returnerName || "Unknown",
      }));

      if (metersToRestore.length > 0) {
        await tx.insert(meters).values(metersToRestore);
      }

      const serialNumbersToDelete = meterList.map((m) => m.serial_number);

      if (serialNumbersToDelete.length > 0) {
        await tx
          .delete(agentInventory)
          .where(
            and(
              eq(agentInventory.agent_id, agentId),
              inArray(agentInventory.serial_number, serialNumbersToDelete)
            )
          );
      }

      if (meterList.length > 0) {
        const transactionData = meterList.map((meter) => ({
          agent_id: agentId,
          transaction_type: "return" as const,
          meter_type: meter.type,
          quantity: 1,
        }));

        await tx.insert(agentTransactions).values(transactionData);
      }
    });

    return { success: true };
  } catch (error) {
    console.error("Error returning meters from agent:", error);
    throw error;
  }
}

export async function removeFromAgentInventory(meterId: string) {
  try {
    // First, verify the meter exists in agent inventory
    const [existing] = await db
      .select({ id: agentInventory.id })
      .from(agentInventory)
      .where(eq(agentInventory.id, meterId))
      .limit(1);

    if (!existing) {
      throw new Error(`Meter with ID ${meterId} not found in agent inventory`);
    }

    // Delete the meter from agent inventory
    const result = await db
      .delete(agentInventory)
      .where(eq(agentInventory.id, meterId))
      .returning();

    if (!result || result.length === 0) {
      throw new Error(`Failed to delete meter ${meterId} from agent inventory`);
    }

    return result[0];
  } catch (error) {
    console.error("Error removing from agent inventory:", error);
    throw error;
  }
}

export async function deleteAgent(
  agentId: string,
  currentUser: CurrentUser,
  scannedMeters: string[] = [],
  unscannedMeters: string[] = []
) {
  try {
    await db.transaction(async (tx) => {
      await tx
        .delete(agentTransactions)
        .where(eq(agentTransactions.agent_id, agentId));

      const agentMeters = await tx
        .select()
        .from(agentInventory)
        .where(eq(agentInventory.agent_id, agentId));

      if (agentMeters.length > 0) {
        const metersToRestore = agentMeters
          .filter((meter) => scannedMeters.includes(meter.serial_number))
          .map((meter) => ({
            serial_number: meter.serial_number,
            type: meter.type,
            added_by: currentUser.id,
            adder_name: currentUser.name || currentUser.email || "Unknown",
          }));

        if (metersToRestore.length > 0) {
          await tx.insert(meters).values(metersToRestore);
        }

        await tx
          .delete(agentInventory)
          .where(eq(agentInventory.agent_id, agentId));
      }

      const [deletedAgent] = await tx
        .delete(agents)
        .where(eq(agents.id, agentId))
        .returning();

      if (!deletedAgent) {
        throw new Error("Failed to delete agent");
      }
    });

    return {
      restoredCount: scannedMeters.length,
      deletedCount: unscannedMeters.length,
    };
  } catch (error) {
    console.error("Error in deleteAgent:", error);
    throw error;
  }
}

export async function getAgentInventoryCount() {
  try {
    const data = await db
      .select({
        type: agentInventory.type,
        count: sql<number>`count(*)`.as("count"),
      })
      .from(agentInventory)
      .groupBy(agentInventory.type);

    return data.map((item) => ({
      type: item.type,
      with_agents: Number(item.count),
    }));
  } catch (error) {
    console.error("Error fetching agent inventory count:", error);
    return [];
  }
}

export async function getAgentTransactions(
  page: number = 1,
  limit: number = 10,
  searchTerm: string = ""
) {
  try {
    const offset = (page - 1) * limit;

    // Build the where conditions
    const whereClause = searchTerm
      ? ilike(agents.name, `%${searchTerm}%`)
      : undefined;

    // Use a subquery so we only aggregate once and leverage a window function for total rows.
    const aggregated = db
      .select({
        agent_id: agentTransactions.agent_id,
        agent_name: agents.name,
        transaction_type: agentTransactions.transaction_type,
        meter_type: agentTransactions.meter_type,
        transaction_date: agentTransactions.transaction_date,
        total_quantity: sql<number>`sum(${agentTransactions.quantity})`.as(
          "total_quantity"
        ),
        row_count: sql<number>`count(*) over ()`.as("row_count"),
      })
      .from(agentTransactions)
      .leftJoin(agents, eq(agentTransactions.agent_id, agents.id))
      .where(whereClause)
      .groupBy(
        agentTransactions.agent_id,
        agents.name,
        agentTransactions.transaction_type,
        agentTransactions.meter_type,
        agentTransactions.transaction_date
      )
      .as("aggregated_agent_transactions");

    const pagedResults = await db
      .select()
      .from(aggregated)
      .orderBy(desc(aggregated.transaction_date))
      .limit(limit)
      .offset(offset);

    const total = pagedResults[0]?.row_count ?? 0;

    return {
      transactions: pagedResults.map((t, index) => ({
        id: `${t.agent_id}-${new Date(t.transaction_date!).getTime()}-${t.transaction_type}-${t.meter_type}-${offset + index}`,
        agent_id: t.agent_id,
        agent_name: t.agent_name,
        transaction_type: t.transaction_type,
        meter_type: t.meter_type,
        quantity: Number(t.total_quantity),
        transaction_date: t.transaction_date,
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: total ? Math.ceil(total / limit) : 0,
      },
    };
  } catch (error) {
    console.error("Error fetching agent transactions:", error);
    return {
      transactions: [],
      pagination: {
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      },
    };
  }
}
