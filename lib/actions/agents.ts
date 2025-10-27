"use server";

import { eq, and, sql, desc, inArray, count, ilike } from "drizzle-orm";
import { db } from "../db";
import {
  agents,
  agentInventory,
  agentTransactions,
  meters,
} from "../db/schema";
import { KENYA_COUNTIES, type KenyaCounty } from "../constants/locationData";

interface CurrentUser {
  id: string;
  name?: string;
  email?: string;
}

export async function getAgentsList() {
  try {
    // Optimized: Removed the expensive LEFT JOIN and COUNT
    // Just get the agents directly - much faster!
    const agentsData = await db
      .select({
        id: agents.id,
        name: agents.name,
        phone_number: agents.phone_number,
        location: agents.location,
        county: agents.county,
        is_active: agents.is_active,
        created_at: agents.created_at,
      })
      .from(agents)
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
  try {
    // Verify meters exist and are available
    const meterIds = meterList.map((m) => m.meter_id);
    const [meterCount] = await db
      .select({ count: count() })
      .from(meters)
      .where(inArray(meters.id, meterIds));

    if (meterCount.count !== meterIds.length) {
      throw new Error(
        "One or more meters to be assigned do not exist or are already assigned."
      );
    }

    // Prepare inventory data for insertion
    const inventoryData = meterList.map((meter) => ({
      agent_id: agentId,
      meter_id: meter.meter_id,
      serial_number: meter.serial_number,
      type: meter.type,
    }));

    // Insert meters into agent_inventory
    const insertedInventory = await db
      .insert(agentInventory)
      .values(inventoryData)
      .returning();

    // Create transaction records
    const transactionData = meterList.map((meter) => ({
      agent_id: agentId,
      transaction_type: "assignment" as const,
      meter_type: meter.type,
      quantity: 1,
    }));

    await db.insert(agentTransactions).values(transactionData);

    // Remove assigned meters from meters table
    const meterIdsToDelete = meterList.map((m) => m.meter_id);
    await db.delete(meters).where(inArray(meters.id, meterIdsToDelete));

    return insertedInventory;
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
    // 1. Move meters back to meters table
    const metersToRestore = meterList.map((meter) => ({
      serial_number: meter.serial_number,
      type: meter.type,
      added_by: returnedBy,
      adder_name: returnerName || "Unknown",
    }));

    await db.insert(meters).values(metersToRestore);

    // 2. Remove meters from agent_inventory
    const serialNumbersToDelete = meterList.map((m) => m.serial_number);
    await db
      .delete(agentInventory)
      .where(
        and(
          eq(agentInventory.agent_id, agentId),
          inArray(agentInventory.serial_number, serialNumbersToDelete)
        )
      );

    // 3. Create transaction records
    const transactionData = meterList.map((meter) => ({
      agent_id: agentId,
      transaction_type: "return" as const,
      meter_type: meter.type,
      quantity: 1,
    }));

    await db.insert(agentTransactions).values(transactionData);

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

    console.log(`Successfully removed meter ${meterId} from agent inventory`);
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
    // 1. First, delete all agent transactions
    await db
      .delete(agentTransactions)
      .where(eq(agentTransactions.agent_id, agentId));

    // 2. Get all meters assigned to this agent
    const agentMeters = await db
      .select()
      .from(agentInventory)
      .where(eq(agentInventory.agent_id, agentId));

    if (agentMeters && agentMeters.length > 0) {
      // 3. Handle scanned meters - move them back to meters table
      const metersToRestore = agentMeters
        .filter((meter) => scannedMeters.includes(meter.serial_number))
        .map((meter) => ({
          serial_number: meter.serial_number,
          type: meter.type,
          added_by: currentUser.id,
          adder_name: currentUser.name || currentUser.email || "Unknown",
        }));

      if (metersToRestore.length > 0) {
        await db.insert(meters).values(metersToRestore);
      }

      // 4. Delete all meters from agent_inventory
      await db
        .delete(agentInventory)
        .where(eq(agentInventory.agent_id, agentId));
    }

    // 5. Finally delete the agent
    const [deletedAgent] = await db
      .delete(agents)
      .where(eq(agents.id, agentId))
      .returning();

    if (!deletedAgent) {
      throw new Error("Failed to delete agent");
    }

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
    const whereConditions = searchTerm
      ? ilike(agents.name, `%${searchTerm}%`)
      : undefined;

    // Get grouped transactions with total quantity
    const groupedTransactions = await db
      .select({
        agent_id: agentTransactions.agent_id,
        agent_name: agents.name,
        transaction_type: agentTransactions.transaction_type,
        meter_type: agentTransactions.meter_type,
        transaction_date: agentTransactions.transaction_date,
        total_quantity: sql<number>`sum(${agentTransactions.quantity})`.as(
          "total_quantity"
        ),
        transaction_count: count(agentTransactions.id),
      })
      .from(agentTransactions)
      .leftJoin(agents, eq(agentTransactions.agent_id, agents.id))
      .where(whereConditions)
      .groupBy(
        agentTransactions.agent_id,
        agents.name,
        agentTransactions.transaction_type,
        agentTransactions.meter_type,
        agentTransactions.transaction_date
      )
      .orderBy(desc(agentTransactions.transaction_date));

    // Get total count of grouped transactions
    const total = groupedTransactions.length;

    // Apply pagination to grouped results
    const paginatedTransactions = groupedTransactions.slice(
      offset,
      offset + limit
    );

    return {
      transactions: paginatedTransactions.map((t, index) => ({
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
        totalPages: Math.ceil(total / limit),
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
