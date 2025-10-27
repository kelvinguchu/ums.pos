"use server";

import { eq, ilike, and, inArray, sql, desc } from "drizzle-orm";
import { db } from "../db";
import {
  meters,
  soldMeters,
  agentInventory,
  agents,
  saleBatches,
  faultyReturns,
  userProfiles,
} from "../db/schema";

// Update the MeterWithStatus type to match our implementation
export type MeterWithStatus =
  | { serial_number: string; type: string; status: "in_stock" }
  | {
      serial_number: string;
      type: string;
      status: "with_agent";
      agent_details: {
        agent_id: string;
        agent_name: string;
        agent_phone: string;
        assigned_at: Date;
        agent_location: string;
      };
    }
  | {
      serial_number: string;
      type: string;
      status: "sold";
      sale_details: {
        sold_at: Date;
        sold_by: string;
        destination: string;
        recipient: string;
        customer_contact: string;
        unit_price: string;
        batch_id: string;
        status: string;
      };
    }
  | {
      serial_number: string;
      type: string;
      status: "replaced";
      sale_details: {
        sold_at: Date;
        sold_by: string;
        destination: string;
        recipient: string;
        customer_contact: string;
        unit_price: string;
        batch_id: string;
        status: string;
      };
      replacement_details: {
        replacement_serial: string;
        replacement_date: Date;
        replacement_by: string;
      };
    }
  | {
      serial_number: string;
      type: string;
      status: "faulty";
      fault_details?: {
        reported_by: string;
        reported_at: Date;
        fault_description: string;
        returned_at?: Date;
        returner_name?: string;
        fault_status?: string;
      };
      sale_details?: {
        sold_at: Date;
        sold_by: string;
        destination: string;
        recipient: string;
        customer_contact: string;
        unit_price: string;
        batch_id: string;
        status: string;
      };
    };

/**
 * Fetches all meters for CSV export without pagination
 */
export async function getAllMetersWithStatus(
  page: number = 1,
  pageSize: number = 20,
  filterStatus?: string,
  filterType?: string,
  searchTerm?: string
): Promise<{ meters: MeterWithStatus[]; totalCount: number }> {
  try {
    const offset = (page - 1) * pageSize;
    let allMeters: MeterWithStatus[] = [];
    let totalCount = 0;

    // For each status, get filtered data and count
    const statuses = ["in_stock", "with_agent", "sold", "replaced", "faulty"];

    for (const status of statuses) {
      if (filterStatus && filterStatus !== "all" && filterStatus !== status) {
        continue;
      }

      let statusMeters: any[] = [];
      let statusCount = 0;

      switch (status) {
        case "in_stock": {
          const stockQuery = db.select().from(meters);
          let stockWhereConditions = [];

          if (filterType && filterType !== "all") {
            stockWhereConditions.push(eq(meters.type, filterType));
          }
          if (searchTerm) {
            stockWhereConditions.push(
              ilike(meters.serial_number, `%${searchTerm}%`)
            );
          }

          if (stockWhereConditions.length > 0) {
            stockQuery.where(and(...stockWhereConditions));
          }

          // Get count
          statusCount = await db
            .select({ count: sql<number>`count(*)` })
            .from(meters)
            .where(
              stockWhereConditions.length > 0
                ? and(...stockWhereConditions)
                : undefined
            )
            .then((result) => result[0]?.count || 0);

          // Get paginated data
          statusMeters = await stockQuery
            .orderBy(desc(meters.added_at))
            .limit(pageSize)
            .offset(offset);

          allMeters.push(
            ...statusMeters.map((meter) => ({
              serial_number: meter.serial_number,
              type: meter.type,
              status: "in_stock" as const,
            }))
          );
          break;
        }

        case "with_agent": {
          const agentQuery = db
            .select({
              id: agentInventory.id,
              serial_number: agentInventory.serial_number,
              type: agentInventory.type,
              assigned_at: agentInventory.assigned_at,
              agent_id: agentInventory.agent_id,
              agent_name: agents.name,
              agent_phone: agents.phone_number,
              agent_location: agents.location,
            })
            .from(agentInventory)
            .leftJoin(agents, eq(agentInventory.agent_id, agents.id));

          let agentWhereConditions = [];
          if (filterType && filterType !== "all") {
            agentWhereConditions.push(eq(agentInventory.type, filterType));
          }
          if (searchTerm) {
            agentWhereConditions.push(
              ilike(agentInventory.serial_number, `%${searchTerm}%`)
            );
          }

          if (agentWhereConditions.length > 0) {
            agentQuery.where(and(...agentWhereConditions));
          }

          // Get count
          statusCount = await db
            .select({ count: sql<number>`count(*)` })
            .from(agentInventory)
            .leftJoin(agents, eq(agentInventory.agent_id, agents.id))
            .where(
              agentWhereConditions.length > 0
                ? and(...agentWhereConditions)
                : undefined
            )
            .then((result) => result[0]?.count || 0);

          // Get paginated data
          statusMeters = await agentQuery
            .orderBy(desc(agentInventory.assigned_at))
            .limit(pageSize)
            .offset(offset);

          allMeters.push(
            ...statusMeters.map((meter) => ({
              serial_number: meter.serial_number,
              type: meter.type,
              status: "with_agent" as const,
              agent_details: {
                agent_id: meter.agent_id || "",
                agent_name: meter.agent_name || "Unknown",
                agent_phone: meter.agent_phone || "Unknown",
                assigned_at: meter.assigned_at || new Date(),
                agent_location: meter.agent_location || "Unknown",
              },
            }))
          );
          break;
        }

        case "sold": {
          const soldQuery = db
            .select({
              id: soldMeters.id,
              serial_number: soldMeters.serial_number,
              sold_by: soldMeters.sold_by,
              sold_at: soldMeters.sold_at,
              destination: soldMeters.destination,
              recipient: soldMeters.recipient,
              customer_contact: soldMeters.customer_contact,
              unit_price: soldMeters.unit_price,
              batch_id: soldMeters.batch_id,
              status: soldMeters.status,
              meter_type: saleBatches.meter_type,
            })
            .from(soldMeters)
            .leftJoin(saleBatches, eq(soldMeters.batch_id, saleBatches.id));

          let soldWhereConditions = [eq(soldMeters.status, "active")];
          if (filterType && filterType !== "all") {
            soldWhereConditions.push(eq(saleBatches.meter_type, filterType));
          }
          if (searchTerm) {
            soldWhereConditions.push(
              ilike(soldMeters.serial_number, `%${searchTerm}%`)
            );
          }

          if (soldWhereConditions.length > 0) {
            soldQuery.where(and(...soldWhereConditions));
          }

          // Get count
          statusCount = await db
            .select({ count: sql<number>`count(*)` })
            .from(soldMeters)
            .leftJoin(saleBatches, eq(soldMeters.batch_id, saleBatches.id))
            .where(and(...soldWhereConditions))
            .then((result) => result[0]?.count || 0);

          // Get paginated data
          statusMeters = await soldQuery
            .orderBy(desc(soldMeters.sold_at))
            .limit(pageSize)
            .offset(offset);

          // Get user profiles for sold meters
          const userIds = Array.from(
            new Set(statusMeters.map((m) => m.sold_by))
          );
          const userProfilesData = await db
            .select({ id: userProfiles.id, name: userProfiles.name })
            .from(userProfiles)
            .where(inArray(userProfiles.id, userIds));

          const userMap: Record<string, string> = {};
          if (userProfilesData) {
            for (const user of userProfilesData) {
              userMap[user.id] = user.name || "Unknown";
            }
          }

          allMeters.push(
            ...statusMeters.map((meter) => ({
              serial_number: meter.serial_number,
              type: meter.meter_type || "Unknown",
              status: "sold" as const,
              sale_details: {
                sold_at: meter.sold_at || new Date(),
                sold_by: userMap[meter.sold_by] || meter.sold_by,
                destination: meter.destination || "",
                recipient: meter.recipient || "",
                customer_contact: meter.customer_contact || "",
                unit_price: meter.unit_price || "0",
                batch_id: meter.batch_id || "",
                status: meter.status || "active",
              },
            }))
          );
          break;
        }

        case "replaced": {
          const replacedQuery = db
            .select({
              id: soldMeters.id,
              serial_number: soldMeters.serial_number,
              sold_by: soldMeters.sold_by,
              sold_at: soldMeters.sold_at,
              destination: soldMeters.destination,
              recipient: soldMeters.recipient,
              customer_contact: soldMeters.customer_contact,
              unit_price: soldMeters.unit_price,
              batch_id: soldMeters.batch_id,
              status: soldMeters.status,
              replacement_serial: soldMeters.replacement_serial,
              replacement_date: soldMeters.replacement_date,
              replacement_by: soldMeters.replacement_by,
              meter_type: saleBatches.meter_type,
            })
            .from(soldMeters)
            .leftJoin(saleBatches, eq(soldMeters.batch_id, saleBatches.id));

          let replacedWhereConditions = [eq(soldMeters.status, "replaced")];
          if (filterType && filterType !== "all") {
            replacedWhereConditions.push(
              eq(saleBatches.meter_type, filterType)
            );
          }
          if (searchTerm) {
            replacedWhereConditions.push(
              ilike(soldMeters.serial_number, `%${searchTerm}%`)
            );
          }

          if (replacedWhereConditions.length > 0) {
            replacedQuery.where(and(...replacedWhereConditions));
          }

          // Get count
          statusCount = await db
            .select({ count: sql<number>`count(*)` })
            .from(soldMeters)
            .leftJoin(saleBatches, eq(soldMeters.batch_id, saleBatches.id))
            .where(and(...replacedWhereConditions))
            .then((result) => result[0]?.count || 0);

          // Get paginated data
          statusMeters = await replacedQuery
            .orderBy(desc(soldMeters.sold_at))
            .limit(pageSize)
            .offset(offset);

          // Get user profiles
          const replacedUserIds = Array.from(
            new Set([
              ...statusMeters.map((m) => m.sold_by),
              ...(statusMeters
                .map((m) => m.replacement_by)
                .filter(Boolean) as string[]),
            ])
          );

          const replacedUserProfilesData = await db
            .select({ id: userProfiles.id, name: userProfiles.name })
            .from(userProfiles)
            .where(inArray(userProfiles.id, replacedUserIds));

          const replacedUserMap: Record<string, string> = {};
          if (replacedUserProfilesData) {
            for (const user of replacedUserProfilesData) {
              replacedUserMap[user.id] = user.name || "Unknown";
            }
          }

          allMeters.push(
            ...statusMeters.map((meter) => ({
              serial_number: meter.serial_number,
              type: meter.meter_type || "Unknown",
              status: "replaced" as const,
              sale_details: {
                sold_at: meter.sold_at || new Date(),
                sold_by: replacedUserMap[meter.sold_by] || meter.sold_by,
                destination: meter.destination || "",
                recipient: meter.recipient || "",
                customer_contact: meter.customer_contact || "",
                unit_price: meter.unit_price || "0",
                batch_id: meter.batch_id || "",
                status: meter.status || "replaced",
              },
              replacement_details: {
                replacement_serial: meter.replacement_serial || "Unknown",
                replacement_date: meter.replacement_date || new Date(),
                replacement_by: meter.replacement_by
                  ? replacedUserMap[meter.replacement_by] ||
                    meter.replacement_by
                  : "Unknown",
              },
            }))
          );
          break;
        }

        case "faulty": {
          // Query faulty_returns table
          const faultyQuery = db.select().from(faultyReturns);
          let faultyWhereConditions = [];

          if (filterType && filterType !== "all") {
            faultyWhereConditions.push(eq(faultyReturns.type, filterType));
          }
          if (searchTerm) {
            faultyWhereConditions.push(
              ilike(faultyReturns.serial_number, `%${searchTerm}%`)
            );
          }

          if (faultyWhereConditions.length > 0) {
            faultyQuery.where(and(...faultyWhereConditions));
          }

          // Get count
          statusCount = await db
            .select({ count: sql<number>`count(*)` })
            .from(faultyReturns)
            .where(
              faultyWhereConditions.length > 0
                ? and(...faultyWhereConditions)
                : undefined
            )
            .then((result) => result[0]?.count || 0);

          // Get paginated data
          statusMeters = await faultyQuery
            .orderBy(desc(faultyReturns.returned_at))
            .limit(pageSize)
            .offset(offset);

          allMeters.push(
            ...statusMeters.map((meter) => ({
              serial_number: meter.serial_number,
              type: meter.type,
              status: "faulty" as const,
              fault_details: {
                reported_by: meter.returned_by || "",
                reported_at: meter.returned_at || new Date(),
                fault_description: meter.fault_description || "",
                returner_name: meter.returner_name || "",
                fault_status: meter.status || "pending",
              },
            }))
          );

          // Also query sold_meters with status=faulty
          const faultySoldQuery = db
            .select({
              id: soldMeters.id,
              serial_number: soldMeters.serial_number,
              sold_by: soldMeters.sold_by,
              sold_at: soldMeters.sold_at,
              destination: soldMeters.destination,
              recipient: soldMeters.recipient,
              customer_contact: soldMeters.customer_contact,
              unit_price: soldMeters.unit_price,
              batch_id: soldMeters.batch_id,
              status: soldMeters.status,
              meter_type: saleBatches.meter_type,
            })
            .from(soldMeters)
            .leftJoin(saleBatches, eq(soldMeters.batch_id, saleBatches.id));

          let faultySoldWhereConditions = [eq(soldMeters.status, "faulty")];
          if (filterType && filterType !== "all") {
            faultySoldWhereConditions.push(
              eq(saleBatches.meter_type, filterType)
            );
          }
          if (searchTerm) {
            faultySoldWhereConditions.push(
              ilike(soldMeters.serial_number, `%${searchTerm}%`)
            );
          }

          if (faultySoldWhereConditions.length > 0) {
            faultySoldQuery.where(and(...faultySoldWhereConditions));
          }

          // Get count for faulty sold meters
          const faultySoldCount = await db
            .select({ count: sql<number>`count(*)` })
            .from(soldMeters)
            .leftJoin(saleBatches, eq(soldMeters.batch_id, saleBatches.id))
            .where(and(...faultySoldWhereConditions))
            .then((result) => result[0]?.count || 0);

          statusCount += faultySoldCount;

          // Get paginated data
          const faultySoldMeters = await faultySoldQuery
            .orderBy(desc(soldMeters.sold_at))
            .limit(pageSize)
            .offset(offset);

          // Get user profiles for faulty sold meters
          const faultySoldUserIds = Array.from(
            new Set(faultySoldMeters.map((m) => m.sold_by))
          );
          const faultySoldUserProfilesData = await db
            .select({ id: userProfiles.id, name: userProfiles.name })
            .from(userProfiles)
            .where(inArray(userProfiles.id, faultySoldUserIds));

          const faultySoldUserMap: Record<string, string> = {};
          if (faultySoldUserProfilesData) {
            for (const user of faultySoldUserProfilesData) {
              faultySoldUserMap[user.id] = user.name || "Unknown";
            }
          }

          allMeters.push(
            ...faultySoldMeters.map((meter) => ({
              serial_number: meter.serial_number,
              type: meter.meter_type || "Unknown",
              status: "faulty" as const,
              sale_details: {
                sold_at: meter.sold_at || new Date(),
                sold_by: faultySoldUserMap[meter.sold_by] || meter.sold_by,
                destination: meter.destination || "",
                recipient: meter.recipient || "",
                customer_contact: meter.customer_contact || "",
                unit_price: meter.unit_price || "0",
                batch_id: meter.batch_id || "",
                status: meter.status || "faulty",
              },
            }))
          );
          break;
        }
      }

      totalCount += statusCount;
    }

    // Apply pagination to combined results
    const totalMeters = allMeters.length;
    const paginatedMeters = allMeters.slice(offset, offset + pageSize);

    return {
      meters: paginatedMeters,
      totalCount: filterStatus ? totalCount : totalMeters,
    };
  } catch (error) {
    console.error("Error fetching meters with status:", error);
    return {
      meters: [],
      totalCount: 0,
    };
  }
}

export async function getAllMetersForExport(
  filterStatus?: string,
  filterType?: string | null,
  searchTerm?: string
): Promise<MeterWithStatus[]> {
  try {
    let allMeters: MeterWithStatus[] = [];

    // 1. STOCK METERS - Query from meters table
    if (!filterStatus || filterStatus === "in_stock") {
      try {
        let stockMeters: any[] = [];

        if (filterType && filterType !== "all") {
          if (searchTerm) {
            stockMeters = await db
              .select()
              .from(meters)
              .where(
                and(
                  eq(meters.type, filterType),
                  ilike(meters.serial_number, `%${searchTerm}%`)
                )
              );
          } else {
            stockMeters = await db
              .select()
              .from(meters)
              .where(eq(meters.type, filterType));
          }
        } else if (searchTerm) {
          stockMeters = await db
            .select()
            .from(meters)
            .where(ilike(meters.serial_number, `%${searchTerm}%`));
        } else {
          stockMeters = await db.select().from(meters);
        }

        if (stockMeters && stockMeters.length > 0) {
          const processedStockMeters = stockMeters.map((meter) => ({
            serial_number: meter.serial_number,
            type: meter.type,
            status: "in_stock" as const,
          }));

          allMeters = [...allMeters, ...processedStockMeters];
        }
      } catch (error) {
        console.error("Error in stock meters query:", error);
      }
    }

    // 2. AGENT METERS - Query from agent_inventory joined with agents
    if (!filterStatus || filterStatus === "with_agent") {
      try {
        let agentMeters: any[] = [];

        if (filterType && filterType !== "all") {
          if (searchTerm) {
            agentMeters = await db
              .select({
                id: agentInventory.id,
                serial_number: agentInventory.serial_number,
                type: agentInventory.type,
                assigned_at: agentInventory.assigned_at,
                agent_id: agentInventory.agent_id,
                agent_name: agents.name,
                agent_phone: agents.phone_number,
                agent_location: agents.location,
              })
              .from(agentInventory)
              .leftJoin(agents, eq(agentInventory.agent_id, agents.id))
              .where(
                and(
                  eq(agentInventory.type, filterType),
                  ilike(agentInventory.serial_number, `%${searchTerm}%`)
                )
              );
          } else {
            agentMeters = await db
              .select({
                id: agentInventory.id,
                serial_number: agentInventory.serial_number,
                type: agentInventory.type,
                assigned_at: agentInventory.assigned_at,
                agent_id: agentInventory.agent_id,
                agent_name: agents.name,
                agent_phone: agents.phone_number,
                agent_location: agents.location,
              })
              .from(agentInventory)
              .leftJoin(agents, eq(agentInventory.agent_id, agents.id))
              .where(eq(agentInventory.type, filterType));
          }
        } else if (searchTerm) {
          agentMeters = await db
            .select({
              id: agentInventory.id,
              serial_number: agentInventory.serial_number,
              type: agentInventory.type,
              assigned_at: agentInventory.assigned_at,
              agent_id: agentInventory.agent_id,
              agent_name: agents.name,
              agent_phone: agents.phone_number,
              agent_location: agents.location,
            })
            .from(agentInventory)
            .leftJoin(agents, eq(agentInventory.agent_id, agents.id))
            .where(ilike(agentInventory.serial_number, `%${searchTerm}%`));
        } else {
          agentMeters = await db
            .select({
              id: agentInventory.id,
              serial_number: agentInventory.serial_number,
              type: agentInventory.type,
              assigned_at: agentInventory.assigned_at,
              agent_id: agentInventory.agent_id,
              agent_name: agents.name,
              agent_phone: agents.phone_number,
              agent_location: agents.location,
            })
            .from(agentInventory)
            .leftJoin(agents, eq(agentInventory.agent_id, agents.id));
        }

        if (agentMeters && agentMeters.length > 0) {
          const processedAgentMeters = agentMeters.map((meter) => ({
            serial_number: meter.serial_number,
            type: meter.type,
            status: "with_agent" as const,
            agent_details: {
              agent_id: meter.agent_id || "",
              agent_name: meter.agent_name || "Unknown",
              agent_phone: meter.agent_phone || "Unknown",
              assigned_at: meter.assigned_at || new Date(),
              agent_location: meter.agent_location || "Unknown",
            },
          }));

          allMeters = [...allMeters, ...processedAgentMeters];
        }
      } catch (error) {
        console.error("Error in agent meters query:", error);
      }
    }

    // 3. SOLD METERS - Query from sold_meters joined with sale_batches
    if (!filterStatus || filterStatus === "sold") {
      try {
        let soldMetersData: any[] = [];

        if (filterType && filterType !== "all") {
          if (searchTerm) {
            soldMetersData = await db
              .select({
                id: soldMeters.id,
                serial_number: soldMeters.serial_number,
                sold_by: soldMeters.sold_by,
                sold_at: soldMeters.sold_at,
                destination: soldMeters.destination,
                recipient: soldMeters.recipient,
                customer_contact: soldMeters.customer_contact,
                unit_price: soldMeters.unit_price,
                batch_id: soldMeters.batch_id,
                status: soldMeters.status,
                meter_type: saleBatches.meter_type,
              })
              .from(soldMeters)
              .leftJoin(saleBatches, eq(soldMeters.batch_id, saleBatches.id))
              .where(
                and(
                  eq(soldMeters.status, "active"),
                  eq(saleBatches.meter_type, filterType),
                  ilike(soldMeters.serial_number, `%${searchTerm}%`)
                )
              );
          } else {
            soldMetersData = await db
              .select({
                id: soldMeters.id,
                serial_number: soldMeters.serial_number,
                sold_by: soldMeters.sold_by,
                sold_at: soldMeters.sold_at,
                destination: soldMeters.destination,
                recipient: soldMeters.recipient,
                customer_contact: soldMeters.customer_contact,
                unit_price: soldMeters.unit_price,
                batch_id: soldMeters.batch_id,
                status: soldMeters.status,
                meter_type: saleBatches.meter_type,
              })
              .from(soldMeters)
              .leftJoin(saleBatches, eq(soldMeters.batch_id, saleBatches.id))
              .where(
                and(
                  eq(soldMeters.status, "active"),
                  eq(saleBatches.meter_type, filterType)
                )
              );
          }
        } else if (searchTerm) {
          soldMetersData = await db
            .select({
              id: soldMeters.id,
              serial_number: soldMeters.serial_number,
              sold_by: soldMeters.sold_by,
              sold_at: soldMeters.sold_at,
              destination: soldMeters.destination,
              recipient: soldMeters.recipient,
              customer_contact: soldMeters.customer_contact,
              unit_price: soldMeters.unit_price,
              batch_id: soldMeters.batch_id,
              status: soldMeters.status,
              meter_type: saleBatches.meter_type,
            })
            .from(soldMeters)
            .leftJoin(saleBatches, eq(soldMeters.batch_id, saleBatches.id))
            .where(
              and(
                eq(soldMeters.status, "active"),
                ilike(soldMeters.serial_number, `%${searchTerm}%`)
              )
            );
        } else {
          soldMetersData = await db
            .select({
              id: soldMeters.id,
              serial_number: soldMeters.serial_number,
              sold_by: soldMeters.sold_by,
              sold_at: soldMeters.sold_at,
              destination: soldMeters.destination,
              recipient: soldMeters.recipient,
              customer_contact: soldMeters.customer_contact,
              unit_price: soldMeters.unit_price,
              batch_id: soldMeters.batch_id,
              status: soldMeters.status,
              meter_type: saleBatches.meter_type,
            })
            .from(soldMeters)
            .leftJoin(saleBatches, eq(soldMeters.batch_id, saleBatches.id))
            .where(eq(soldMeters.status, "active"));
        }

        if (soldMetersData && soldMetersData.length > 0) {
          // Get user profiles for sold meters
          const userIds = Array.from(
            new Set(soldMetersData.map((m) => m.sold_by))
          );

          const userProfilesData = await db
            .select({ id: userProfiles.id, name: userProfiles.name })
            .from(userProfiles)
            .where(inArray(userProfiles.id, userIds));

          const userMap: Record<string, string> = {};
          if (userProfilesData) {
            for (const user of userProfilesData) {
              userMap[user.id] = user.name || "Unknown";
            }
          }

          const processedSoldMeters = soldMetersData.map((meter) => ({
            serial_number: meter.serial_number,
            type: meter.meter_type || "Unknown",
            status: "sold" as const,
            sale_details: {
              sold_at: meter.sold_at || new Date(),
              sold_by: userMap[meter.sold_by] || meter.sold_by,
              destination: meter.destination || "",
              recipient: meter.recipient || "",
              customer_contact: meter.customer_contact || "",
              unit_price: meter.unit_price || "0",
              batch_id: meter.batch_id || "",
              status: meter.status || "active",
            },
          }));

          allMeters = [...allMeters, ...processedSoldMeters];
        }
      } catch (error) {
        console.error("Error in sold meters query:", error);
      }
    }

    // 4. REPLACED METERS - Query from sold_meters with status=replaced
    if (!filterStatus || filterStatus === "replaced") {
      try {
        let replacedMeters: any[] = [];

        if (filterType && filterType !== "all") {
          if (searchTerm) {
            replacedMeters = await db
              .select({
                id: soldMeters.id,
                serial_number: soldMeters.serial_number,
                sold_by: soldMeters.sold_by,
                sold_at: soldMeters.sold_at,
                destination: soldMeters.destination,
                recipient: soldMeters.recipient,
                customer_contact: soldMeters.customer_contact,
                unit_price: soldMeters.unit_price,
                batch_id: soldMeters.batch_id,
                status: soldMeters.status,
                replacement_serial: soldMeters.replacement_serial,
                replacement_date: soldMeters.replacement_date,
                replacement_by: soldMeters.replacement_by,
                meter_type: saleBatches.meter_type,
              })
              .from(soldMeters)
              .leftJoin(saleBatches, eq(soldMeters.batch_id, saleBatches.id))
              .where(
                and(
                  eq(soldMeters.status, "replaced"),
                  eq(saleBatches.meter_type, filterType),
                  ilike(soldMeters.serial_number, `%${searchTerm}%`)
                )
              );
          } else {
            replacedMeters = await db
              .select({
                id: soldMeters.id,
                serial_number: soldMeters.serial_number,
                sold_by: soldMeters.sold_by,
                sold_at: soldMeters.sold_at,
                destination: soldMeters.destination,
                recipient: soldMeters.recipient,
                customer_contact: soldMeters.customer_contact,
                unit_price: soldMeters.unit_price,
                batch_id: soldMeters.batch_id,
                status: soldMeters.status,
                replacement_serial: soldMeters.replacement_serial,
                replacement_date: soldMeters.replacement_date,
                replacement_by: soldMeters.replacement_by,
                meter_type: saleBatches.meter_type,
              })
              .from(soldMeters)
              .leftJoin(saleBatches, eq(soldMeters.batch_id, saleBatches.id))
              .where(
                and(
                  eq(soldMeters.status, "replaced"),
                  eq(saleBatches.meter_type, filterType)
                )
              );
          }
        } else if (searchTerm) {
          replacedMeters = await db
            .select({
              id: soldMeters.id,
              serial_number: soldMeters.serial_number,
              sold_by: soldMeters.sold_by,
              sold_at: soldMeters.sold_at,
              destination: soldMeters.destination,
              recipient: soldMeters.recipient,
              customer_contact: soldMeters.customer_contact,
              unit_price: soldMeters.unit_price,
              batch_id: soldMeters.batch_id,
              status: soldMeters.status,
              replacement_serial: soldMeters.replacement_serial,
              replacement_date: soldMeters.replacement_date,
              replacement_by: soldMeters.replacement_by,
              meter_type: saleBatches.meter_type,
            })
            .from(soldMeters)
            .leftJoin(saleBatches, eq(soldMeters.batch_id, saleBatches.id))
            .where(
              and(
                eq(soldMeters.status, "replaced"),
                ilike(soldMeters.serial_number, `%${searchTerm}%`)
              )
            );
        } else {
          replacedMeters = await db
            .select({
              id: soldMeters.id,
              serial_number: soldMeters.serial_number,
              sold_by: soldMeters.sold_by,
              sold_at: soldMeters.sold_at,
              destination: soldMeters.destination,
              recipient: soldMeters.recipient,
              customer_contact: soldMeters.customer_contact,
              unit_price: soldMeters.unit_price,
              batch_id: soldMeters.batch_id,
              status: soldMeters.status,
              replacement_serial: soldMeters.replacement_serial,
              replacement_date: soldMeters.replacement_date,
              replacement_by: soldMeters.replacement_by,
              meter_type: saleBatches.meter_type,
            })
            .from(soldMeters)
            .leftJoin(saleBatches, eq(soldMeters.batch_id, saleBatches.id))
            .where(eq(soldMeters.status, "replaced"));
        }

        if (replacedMeters && replacedMeters.length > 0) {
          // Get user profiles for sold_by and replacement_by
          const userIds = Array.from(
            new Set([
              ...replacedMeters.map((m) => m.sold_by),
              ...(replacedMeters
                .map((m) => m.replacement_by)
                .filter(Boolean) as string[]),
            ])
          );

          const userProfilesData = await db
            .select({ id: userProfiles.id, name: userProfiles.name })
            .from(userProfiles)
            .where(inArray(userProfiles.id, userIds));

          const userMap: Record<string, string> = {};
          if (userProfilesData) {
            for (const user of userProfilesData) {
              userMap[user.id] = user.name || "Unknown";
            }
          }

          const processedReplacedMeters = replacedMeters.map((meter) => ({
            serial_number: meter.serial_number,
            type: meter.meter_type || "Unknown",
            status: "replaced" as const,
            sale_details: {
              sold_at: meter.sold_at || new Date(),
              sold_by: userMap[meter.sold_by] || meter.sold_by,
              destination: meter.destination || "",
              recipient: meter.recipient || "",
              customer_contact: meter.customer_contact || "",
              unit_price: meter.unit_price || "0",
              batch_id: meter.batch_id || "",
              status: meter.status || "replaced",
            },
            replacement_details: {
              replacement_serial: meter.replacement_serial || "Unknown",
              replacement_date: meter.replacement_date || new Date(),
              replacement_by: meter.replacement_by
                ? userMap[meter.replacement_by] || meter.replacement_by
                : "Unknown",
            },
          }));

          allMeters = [...allMeters, ...processedReplacedMeters];
        }
      } catch (error) {
        console.error("Error in replaced meters query:", error);
      }
    }

    // 5. FAULTY METERS - Query from both faulty_returns and sold_meters with status=faulty
    if (!filterStatus || filterStatus === "faulty") {
      // 5.1 First query faulty_returns table
      try {
        let faultyMeters: any[] = [];

        if (filterType && filterType !== "all") {
          if (searchTerm) {
            faultyMeters = await db
              .select()
              .from(faultyReturns)
              .where(
                and(
                  eq(faultyReturns.type, filterType),
                  ilike(faultyReturns.serial_number, `%${searchTerm}%`)
                )
              );
          } else {
            faultyMeters = await db
              .select()
              .from(faultyReturns)
              .where(eq(faultyReturns.type, filterType));
          }
        } else if (searchTerm) {
          faultyMeters = await db
            .select()
            .from(faultyReturns)
            .where(ilike(faultyReturns.serial_number, `%${searchTerm}%`));
        } else {
          faultyMeters = await db.select().from(faultyReturns);
        }

        if (faultyMeters && faultyMeters.length > 0) {
          const processedFaultyMeters = faultyMeters.map((meter) => ({
            serial_number: meter.serial_number,
            type: meter.type,
            status: "faulty" as const,
            fault_details: {
              reported_by: meter.returned_by || "",
              reported_at: meter.returned_at || new Date(),
              fault_description: meter.fault_description || "",
              returner_name: meter.returner_name || "",
              fault_status: meter.status || "pending",
            },
          }));

          allMeters = [...allMeters, ...processedFaultyMeters];
        }
      } catch (error) {
        console.error("Error in faulty_returns query:", error);
      }

      // 5.2 Then query sold_meters with status=faulty
      try {
        let faultySoldMeters: any[] = [];

        if (filterType && filterType !== "all") {
          if (searchTerm) {
            faultySoldMeters = await db
              .select({
                id: soldMeters.id,
                serial_number: soldMeters.serial_number,
                sold_by: soldMeters.sold_by,
                sold_at: soldMeters.sold_at,
                destination: soldMeters.destination,
                recipient: soldMeters.recipient,
                customer_contact: soldMeters.customer_contact,
                unit_price: soldMeters.unit_price,
                batch_id: soldMeters.batch_id,
                status: soldMeters.status,
                meter_type: saleBatches.meter_type,
              })
              .from(soldMeters)
              .leftJoin(saleBatches, eq(soldMeters.batch_id, saleBatches.id))
              .where(
                and(
                  eq(soldMeters.status, "faulty"),
                  eq(saleBatches.meter_type, filterType),
                  ilike(soldMeters.serial_number, `%${searchTerm}%`)
                )
              );
          } else {
            faultySoldMeters = await db
              .select({
                id: soldMeters.id,
                serial_number: soldMeters.serial_number,
                sold_by: soldMeters.sold_by,
                sold_at: soldMeters.sold_at,
                destination: soldMeters.destination,
                recipient: soldMeters.recipient,
                customer_contact: soldMeters.customer_contact,
                unit_price: soldMeters.unit_price,
                batch_id: soldMeters.batch_id,
                status: soldMeters.status,
                meter_type: saleBatches.meter_type,
              })
              .from(soldMeters)
              .leftJoin(saleBatches, eq(soldMeters.batch_id, saleBatches.id))
              .where(
                and(
                  eq(soldMeters.status, "faulty"),
                  eq(saleBatches.meter_type, filterType)
                )
              );
          }
        } else if (searchTerm) {
          faultySoldMeters = await db
            .select({
              id: soldMeters.id,
              serial_number: soldMeters.serial_number,
              sold_by: soldMeters.sold_by,
              sold_at: soldMeters.sold_at,
              destination: soldMeters.destination,
              recipient: soldMeters.recipient,
              customer_contact: soldMeters.customer_contact,
              unit_price: soldMeters.unit_price,
              batch_id: soldMeters.batch_id,
              status: soldMeters.status,
              meter_type: saleBatches.meter_type,
            })
            .from(soldMeters)
            .leftJoin(saleBatches, eq(soldMeters.batch_id, saleBatches.id))
            .where(
              and(
                eq(soldMeters.status, "faulty"),
                ilike(soldMeters.serial_number, `%${searchTerm}%`)
              )
            );
        } else {
          faultySoldMeters = await db
            .select({
              id: soldMeters.id,
              serial_number: soldMeters.serial_number,
              sold_by: soldMeters.sold_by,
              sold_at: soldMeters.sold_at,
              destination: soldMeters.destination,
              recipient: soldMeters.recipient,
              customer_contact: soldMeters.customer_contact,
              unit_price: soldMeters.unit_price,
              batch_id: soldMeters.batch_id,
              status: soldMeters.status,
              meter_type: saleBatches.meter_type,
            })
            .from(soldMeters)
            .leftJoin(saleBatches, eq(soldMeters.batch_id, saleBatches.id))
            .where(eq(soldMeters.status, "faulty"));
        }

        if (faultySoldMeters && faultySoldMeters.length > 0) {
          // Get user profiles for sold_by
          const userIds = Array.from(
            new Set(faultySoldMeters.map((m) => m.sold_by))
          );

          const userProfilesData = await db
            .select({ id: userProfiles.id, name: userProfiles.name })
            .from(userProfiles)
            .where(inArray(userProfiles.id, userIds));

          const userMap: Record<string, string> = {};
          if (userProfilesData) {
            for (const user of userProfilesData) {
              userMap[user.id] = user.name || "Unknown";
            }
          }

          const processedFaultySoldMeters = faultySoldMeters.map((meter) => ({
            serial_number: meter.serial_number,
            type: meter.meter_type || "Unknown",
            status: "faulty" as const,
            sale_details: {
              sold_at: meter.sold_at || new Date(),
              sold_by: userMap[meter.sold_by] || meter.sold_by,
              destination: meter.destination || "",
              recipient: meter.recipient || "",
              customer_contact: meter.customer_contact || "",
              unit_price: meter.unit_price || "0",
              batch_id: meter.batch_id || "",
              status: meter.status || "faulty",
            },
          }));

          allMeters = [...allMeters, ...processedFaultySoldMeters];
        }
      } catch (error) {
        console.error("Error in faulty sold_meters query:", error);
      }
    }

    return allMeters;
  } catch (error) {
    console.error("Error fetching all meters for export:", error);
    return [];
  }
}
