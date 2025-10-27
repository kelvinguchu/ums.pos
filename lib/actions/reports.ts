"use server";

import { db } from "../db";
import {
  saleBatches,
  meters,
  agentInventory,
  soldMeters,
  faultyReturns,
  meterPurchaseBatches,
  userProfiles,
  agents,
} from "../db/schema";
import type { SaleBatch } from "../db/schema";
import {
  eq,
  gte,
  lte,
  desc,
  count,
  sql,
  inArray,
  isNotNull,
  and,
  sum,
  getTableColumns,
  max,
} from "drizzle-orm";

/**
 * Gets the total count of meters in stock
 */
export async function getMeterCount(): Promise<number> {
  try {
    const [result] = await db.select({ count: count() }).from(meters);

    return result?.count || 0;
  } catch (error) {
    console.error("Error fetching meter count:", error);
    return 0;
  }
}

/**
 * Gets top selling users by total sales amount
 */
export async function getTopSellingUsers(): Promise<
  Array<{ user_name: string; total_sales: string }>
> {
  try {
    const result = await db
      .select({
        user_name: saleBatches.user_name,
        total_sales: sum(saleBatches.total_price),
      })
      .from(saleBatches)
      .groupBy(saleBatches.user_name)
      .orderBy(desc(sum(saleBatches.total_price)))
      .limit(5);

    // Convert null values to "0" and ensure strings
    return result.map((user) => ({
      user_name: user.user_name,
      total_sales: user.total_sales?.toString() || "0",
    }));
  } catch (error) {
    console.error("Error fetching top selling users:", error);
    return [];
  }
}

/**
 * Gets the most selling product by batch amount
 */
export async function getMostSellingProduct(): Promise<string> {
  try {
    const [result] = await db
      .select({
        meter_type: saleBatches.meter_type,
        total_sold: sum(saleBatches.batch_amount),
      })
      .from(saleBatches)
      .groupBy(saleBatches.meter_type)
      .orderBy(desc(sum(saleBatches.batch_amount)))
      .limit(1);

    return result?.meter_type || "";
  } catch (error) {
    console.error("Error fetching most selling product:", error);
    return "";
  }
}

/**
 * Gets earnings aggregated by meter type
 */
export async function getEarningsByMeterType(): Promise<
  Array<{ meter_type: string; total_earnings: number }>
> {
  try {
    const result = await db
      .select({
        meter_type: saleBatches.meter_type,
        total_earnings: sum(saleBatches.total_price).mapWith(Number),
      })
      .from(saleBatches)
      .groupBy(saleBatches.meter_type);

    return result;
  } catch (error) {
    console.error("Error fetching earnings by meter type:", error);
    return [];
  }
}

/**
 * Gets remaining meters count grouped by type
 */
export async function getRemainingMetersByType(): Promise<
  Array<{ type: string; remaining_meters: number }>
> {
  try {
    const result = await db
      .select({
        type: meters.type,
        remaining_meters: count().mapWith(Number),
      })
      .from(meters)
      .groupBy(meters.type);

    return result;
  } catch (error) {
    console.error("Error fetching remaining meters by type:", error);
    return [];
  }
}

/**
 * Gets agent inventory count grouped by meter type
 */
export async function getAgentInventoryCount(): Promise<
  Array<{ type: string; with_agents: number }>
> {
  try {
    const result = await db
      .select({
        type: agentInventory.type,
        with_agents: count().mapWith(Number),
      })
      .from(agentInventory)
      .groupBy(agentInventory.type);

    return result;
  } catch (error) {
    console.error("Error fetching agent inventory count:", error);
    return [];
  }
}

/**
 * Gets customer type counts from sales data
 */
export async function getCustomerTypeCounts(): Promise<
  Array<{ type: string; count: number }>
> {
  try {
    const result = await db
      .select({
        type: sql<string>`${saleBatches.customer_type}`,
        count: count().mapWith(Number),
      })
      .from(saleBatches)
      .where(isNotNull(saleBatches.customer_type))
      .groupBy(saleBatches.customer_type);

    return result.filter((item) => item.type !== null);
  } catch (error) {
    console.error("Error fetching customer type counts:", error);
    return [];
  }
}

/**
 * Gets faulty meters for reporting
 */
export async function getFaultyMeters(): Promise<
  Array<{
    id: string;
    serial_number: string;
    type: string;
    returned_by: string;
    returned_at: Date | null;
    returner_name: string;
    fault_description: string | null;
    status: string | null;
    original_sale_id: string | null;
  }>
> {
  try {
    const result = await db
      .select()
      .from(faultyReturns)
      .orderBy(desc(faultyReturns.returned_at));

    return result;
  } catch (error) {
    console.error("Error fetching faulty meters:", error);
    throw error;
  }
}

/**
 * Gets meter replacements for reporting
 */
export async function getMeterReplacements(): Promise<
  Array<{
    id: string;
    serial_number: string;
    recipient: string | null;
    customer_contact: string | null;
    replacement_serial: string | null;
    replacement_date: Date | null;
    replacement_by: string | null;
  }>
> {
  try {
    // Get replacements from sold_meters where replacement_serial is not null
    const replacementsData = await db
      .select({
        id: soldMeters.id,
        serial_number: soldMeters.serial_number,
        recipient: soldMeters.recipient,
        customer_contact: soldMeters.customer_contact,
        replacement_serial: soldMeters.replacement_serial,
        replacement_date: soldMeters.replacement_date,
        replacement_by: soldMeters.replacement_by,
      })
      .from(soldMeters)
      .where(isNotNull(soldMeters.replacement_serial))
      .orderBy(desc(soldMeters.replacement_date));

    if (!replacementsData || replacementsData.length === 0) {
      return [];
    }

    // Get unique user IDs
    const userIds = Array.from(
      new Set(
        replacementsData
          .map((r) => r.replacement_by)
          .filter(Boolean) as string[]
      )
    );

    if (userIds.length === 0) {
      return replacementsData;
    }

    // Fetch user profiles for these IDs
    const userProfilesData = await db
      .select({ id: userProfiles.id, name: userProfiles.name })
      .from(userProfiles)
      .where(inArray(userProfiles.id, userIds));

    // Create a map of user IDs to names
    const userMap: Record<string, string> = {};
    if (userProfilesData) {
      for (const user of userProfilesData) {
        userMap[user.id] = user.name || user.id;
      }
    }

    // Map the data with user names
    return replacementsData.map((replacement) => ({
      ...replacement,
      replacement_by: replacement.replacement_by
        ? userMap[replacement.replacement_by] || replacement.replacement_by
        : null,
    }));
  } catch (error) {
    console.error("Error fetching meter replacements:", error);
    throw error;
  }
}

/**
 * Gets sales data within a date range
 */
export async function getSalesByDateRange(startDate: Date, endDate: Date) {
  try {
    const result = await db
      .select()
      .from(saleBatches)
      .where(
        and(
          gte(saleBatches.sale_date, startDate),
          lte(saleBatches.sale_date, endDate)
        )
      )
      .orderBy(desc(saleBatches.sale_date));

    return result;
  } catch (error) {
    console.error("Error fetching sales by date range:", error);
    throw error;
  }
}

/**
 * Gets detailed sales data with serial numbers for a date range
 */
export async function getDetailedSalesByDateRange(
  startDate: Date,
  endDate: Date
) {
  try {
    // Get all sale batches in the date range
    const batches = await db
      .select()
      .from(saleBatches)
      .where(
        and(
          gte(saleBatches.sale_date, startDate),
          lte(saleBatches.sale_date, endDate)
        )
      )
      .orderBy(desc(saleBatches.sale_date));

    if (batches.length === 0) {
      return [];
    }

    // Get batch IDs
    const batchIds = batches.map((batch) => batch.id);

    // Get all sold meters for these batches
    const meters = await db
      .select({
        batch_id: soldMeters.batch_id,
        serial_number: soldMeters.serial_number,
        recipient: soldMeters.recipient,
        destination: soldMeters.destination,
        customer_type: soldMeters.customer_type,
        customer_county: soldMeters.customer_county,
        customer_contact: soldMeters.customer_contact,
      })
      .from(soldMeters)
      .where(inArray(soldMeters.batch_id, batchIds))
      .orderBy(soldMeters.serial_number);

    // Group meters by batch_id
    const metersByBatch = meters.reduce(
      (acc, meter) => {
        if (!acc[meter.batch_id]) {
          acc[meter.batch_id] = [];
        }
        acc[meter.batch_id].push(meter);
        return acc;
      },
      {} as Record<string, typeof meters>
    );

    // Combine batches with their meters
    return batches.map((batch) => ({
      ...batch,
      meters: metersByBatch[batch.id] || [],
      unit_price: Number(batch.unit_price),
      total_price: Number(batch.total_price),
    }));
  } catch (error) {
    console.error("Error fetching detailed sales by date range:", error);
    throw error;
  }
}

/**
 * Gets detailed sales for today
 */
export async function getDetailedSalesToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return getDetailedSalesByDateRange(today, tomorrow);
}

/**
 * Gets detailed sales for yesterday
 */
export async function getDetailedSalesYesterday() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);
  const today = new Date(yesterday);
  today.setDate(today.getDate() + 1);

  return getDetailedSalesByDateRange(yesterday, today);
}

/**
 * Gets sales for the current week
 */
export async function getSalesThisWeek() {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setHours(0, 0, 0, 0);
  startOfWeek.setDate(now.getDate() - now.getDay()); // Start from Sunday

  return getSalesByDateRange(startOfWeek, now);
}

/**
 * Gets sales for the current month
 */
export async function getSalesThisMonth() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  return getSalesByDateRange(startOfMonth, now);
}

/**
 * Gets sales for the last X days
 */
export async function getSalesLastXDays(days: number) {
  const now = new Date();
  const startDate = new Date(now);
  startDate.setDate(now.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  return getSalesByDateRange(startDate, now);
}

/**
 * Gets purchase batches with meter counts and user information
 */
export async function getPurchaseBatches(): Promise<
  Array<{
    id: string;
    meter_type: string;
    quantity: number;
    total_cost: string;
    purchase_date: Date | null;
    added_by: string;
    created_at: Date | null;
    batch_number: string;
    remaining_meters: number;
    user_profiles: {
      name: string | null;
    };
  }>
> {
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

/**
 * Interface for aggregated sales data
 */
export interface AggregatedSales {
  totalTransactions: number;
  totalMeters: number;
  totalRevenue: string;
  averagePrice: string;
  byType: {
    [key: string]: {
      count: number;
      revenue: string;
    };
  };
}

/**
 * Aggregates sales data for reporting
 */
export async function aggregateSalesData(
  sales: SaleBatch[]
): Promise<AggregatedSales> {
  const aggregated = sales.reduce(
    (acc, sale) => {
      // Update totals
      acc.totalTransactions++;
      acc.totalMeters += sale.batch_amount;
      acc.totalRevenue = (
        Number.parseFloat(acc.totalRevenue) +
        Number.parseFloat(sale.total_price)
      ).toString();

      // Update by type
      if (!acc.byType[sale.meter_type]) {
        acc.byType[sale.meter_type] = { count: 0, revenue: "0" };
      }
      acc.byType[sale.meter_type].count += sale.batch_amount;
      acc.byType[sale.meter_type].revenue = (
        Number.parseFloat(acc.byType[sale.meter_type].revenue) +
        Number.parseFloat(sale.total_price)
      ).toString();

      return acc;
    },
    {
      totalTransactions: 0,
      totalMeters: 0,
      totalRevenue: "0",
      averagePrice: "0",
      byType: {},
    } as AggregatedSales
  );

  // Calculate average price
  aggregated.averagePrice =
    aggregated.totalMeters > 0
      ? (
          Number.parseFloat(aggregated.totalRevenue) / aggregated.totalMeters
        ).toString()
      : "0";

  return aggregated;
}

/**
 * Gets daily sales summary for dashboard
 */
export async function getDailySalesSummary(days: number = 7): Promise<
  Array<{
    date: string;
    totalSales: string;
    totalMeters: number;
    transactions: number;
  }>
> {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const sales = await getSalesByDateRange(startDate, endDate);

    // Group sales by date
    const salesByDate = sales.reduce(
      (acc, sale) => {
        const date = new Date(sale.sale_date || "").toISOString().split("T")[0];
        if (!acc[date]) {
          acc[date] = {
            totalSales: "0",
            totalMeters: 0,
            transactions: 0,
          };
        }
        acc[date].totalSales = (
          Number.parseFloat(acc[date].totalSales) +
          Number.parseFloat(sale.total_price)
        ).toString();
        acc[date].totalMeters += sale.batch_amount;
        acc[date].transactions++;
        return acc;
      },
      {} as Record<
        string,
        { totalSales: string; totalMeters: number; transactions: number }
      >
    );

    // Convert to array and sort by date
    return Object.entries(salesByDate)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));
  } catch (error) {
    console.error("Error fetching daily sales summary:", error);
    throw error;
  }
}

/**
 * Gets monthly sales trend for the current year
 */
export async function getMonthlySalesTrend(year?: number): Promise<
  Array<{
    month: string;
    totalSales: string;
    totalMeters: number;
    transactions: number;
  }>
> {
  try {
    const currentYear = year || new Date().getFullYear();
    const startDate = new Date(currentYear, 0, 1);
    const endDate = new Date(currentYear, 11, 31, 23, 59, 59, 999);

    const sales = await getSalesByDateRange(startDate, endDate);

    // Initialize all months with zero values
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    const monthlyData = monthNames.map((month) => ({
      month,
      totalSales: "0",
      totalMeters: 0,
      transactions: 0,
    }));

    // Group sales by month
    for (const sale of sales) {
      const monthIndex = new Date(sale.sale_date || "").getMonth();
      monthlyData[monthIndex].totalSales = (
        Number.parseFloat(monthlyData[monthIndex].totalSales) +
        Number.parseFloat(sale.total_price)
      ).toString();
      monthlyData[monthIndex].totalMeters += sale.batch_amount;
      monthlyData[monthIndex].transactions++;
    }

    return monthlyData;
  } catch (error) {
    console.error("Error fetching monthly sales trend:", error);
    throw error;
  }
}

/**
 * Gets agent performance metrics
 */
export async function getAgentPerformance(): Promise<
  Array<{
    agent_id: string;
    agent_name: string;
    total_meters: number;
    meter_types: string[];
    last_assigned: Date | null;
  }>
> {
  try {
    const result = await db
      .select({
        agent_id: agents.id,
        agent_name: agents.name,
        total_meters: count(agentInventory.id),
        meter_types: sql<string[]>`array_agg(DISTINCT ${agentInventory.type})`,
        last_assigned: max(agentInventory.assigned_at),
      })
      .from(agents)
      .leftJoin(agentInventory, eq(agents.id, agentInventory.agent_id))
      .groupBy(agents.id, agents.name)
      .orderBy(desc(count(agentInventory.id)));

    return result.map((r) => ({
      ...r,
      agent_id: r.agent_id.toString(),
      total_meters: Number(r.total_meters),
    }));
  } catch (error) {
    console.error("Error fetching agent performance:", error);
    throw error;
  }
}

/**
 * Gets inventory summary for dashboard
 */
export async function getInventorySummary(): Promise<{
  totalInStock: number;
  totalWithAgents: number;
  totalSold: number;
  totalFaulty: number;
  byType: Array<{
    type: string;
    inStock: number;
    withAgents: number;
    sold: number;
    faulty: number;
  }>;
}> {
  try {
    // Get counts from different tables
    const [inStockCount, withAgentsCount, soldCount, faultyCount] =
      await Promise.all([
        db.select({ count: count() }).from(meters),
        db.select({ count: count() }).from(agentInventory),
        db
          .select({ count: count() })
          .from(soldMeters)
          .where(eq(soldMeters.status, "active")),
        db.select({ count: count() }).from(faultyReturns),
      ]);

    // Get type breakdown
    const [stockByType, agentByType, soldByType, faultyByType] =
      await Promise.all([
        db
          .select({
            type: meters.type,
            count: count().mapWith(Number),
          })
          .from(meters)
          .groupBy(meters.type),
        db
          .select({
            type: agentInventory.type,
            count: count().mapWith(Number),
          })
          .from(agentInventory)
          .groupBy(agentInventory.type),
        db
          .select({
            type: saleBatches.meter_type,
            count: count().mapWith(Number),
          })
          .from(soldMeters)
          .leftJoin(saleBatches, eq(soldMeters.batch_id, saleBatches.id))
          .where(
            and(
              eq(soldMeters.status, "active"),
              isNotNull(saleBatches.meter_type)
            )
          )
          .groupBy(saleBatches.meter_type),
        db
          .select({
            type: faultyReturns.type,
            count: count().mapWith(Number),
          })
          .from(faultyReturns)
          .groupBy(faultyReturns.type),
      ]);

    // Create type breakdown map
    const allTypes = new Set([
      ...stockByType.map((t) => t.type),
      ...agentByType.map((t) => t.type),
      ...soldByType.map((t) => t.type as string),
      ...faultyByType.map((t) => t.type),
    ]);

    const byType = Array.from(allTypes)
      .filter(Boolean)
      .map((type) => ({
        type,
        inStock: stockByType.find((t) => t.type === type)?.count || 0,
        withAgents: agentByType.find((t) => t.type === type)?.count || 0,
        sold: soldByType.find((t) => t.type === type)?.count || 0,
        faulty: faultyByType.find((t) => t.type === type)?.count || 0,
      }));

    return {
      totalInStock: inStockCount[0]?.count || 0,
      totalWithAgents: withAgentsCount[0]?.count || 0,
      totalSold: soldCount[0]?.count || 0,
      totalFaulty: faultyCount[0]?.count || 0,
      byType,
    };
  } catch (error) {
    console.error("Error fetching inventory summary:", error);
    throw error;
  }
}
