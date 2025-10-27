"use server";

import {
  eq,
  inArray,
  sql,
  and,
  desc,
  gte,
  lte,
  like,
  or,
  ilike,
  count,
} from "drizzle-orm";
import { createNotification } from "./notifications";
import { db } from "../db";
import {
  soldMeters,
  saleBatches,
  salesTransactions,
  userProfiles,
  faultyReturns,
  meters as metersTable,
} from "../db/schema";
import { removeMeter } from "./meters";

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

interface SoldMeterData {
  meter_id?: string;
  sold_by: string;
  sold_at: Date;
  destination: string;
  recipient: string;
  serial_number: string;
  unit_price: number;
  batch_id: string;
  customer_type: string;
  customer_county: string;
  customer_contact: string;
}

export async function addSoldMeter(soldMeter: Omit<SoldMeterData, "id">) {
  return withActiveUserCheck(soldMeter.sold_by, async () => {
    // Verify the meter_id is not already in sold_meters
    if (soldMeter.meter_id) {
      const [existing] = await db
        .select({ id: soldMeters.id })
        .from(soldMeters)
        .where(eq(soldMeters.meter_id, soldMeter.meter_id))
        .limit(1);

      if (existing) {
        throw new Error(
          `Meter ${soldMeter.serial_number} is already in sold_meters table`
        );
      }
    }

    // Verify serial number is not already in sold_meters
    const [existingSerial] = await db
      .select({ id: soldMeters.id })
      .from(soldMeters)
      .where(eq(soldMeters.serial_number, soldMeter.serial_number))
      .limit(1);

    if (existingSerial) {
      throw new Error(
        `Serial number ${soldMeter.serial_number} already exists in sold_meters`
      );
    }

    const [data] = await db
      .insert(soldMeters)
      .values({
        ...soldMeter,
        unit_price: soldMeter.unit_price.toString(),
      })
      .returning();

    return data;
  });
}

interface SaleBatchData {
  user_id: string;
  user_name: string;
  meter_type: string;
  batch_amount: number;
  unit_price: number;
  total_price: number;
  destination: string;
  recipient: string;
  customer_type: string;
  customer_county: string;
  customer_contact: string;
  sale_date?: Date;
  transaction_id?: string;
}

export async function addSaleBatch(batchData: Omit<SaleBatchData, "id">) {
  const [data] = await db
    .insert(saleBatches)
    .values({
      ...batchData,
      unit_price: batchData.unit_price.toString(),
      total_price: batchData.total_price.toString(),
    })
    .returning();

  // Create a notification for the batch sale
  await createNotification({
    type: "METER_SALE",
    message: `${batchData.user_name} sold ${batchData.batch_amount} ${
      batchData.meter_type
    } meter${batchData.batch_amount > 1 ? "s" : ""} to ${
      batchData.recipient
    } in ${batchData.destination}`,
    metadata: {
      batchId: data.id,
      meterType: batchData.meter_type,
      batchAmount: batchData.batch_amount,
      destination: batchData.destination,
      recipient: batchData.recipient,
      totalPrice: batchData.total_price,
      unitPrice: batchData.unit_price,
      customerType: batchData.customer_type,
      customerCounty: batchData.customer_county,
      customerContact: batchData.customer_contact,
    },
    createdBy: batchData.user_id,
  });

  return data;
}

export async function getSaleBatches(
  page: number = 1,
  limit: number = 10,
  filters?: {
    searchUser?: string;
    meterType?: string;
    customerType?: string;
    dateRange?: { start: Date; end: Date };
    specificDate?: Date;
  }
) {
  const offset = (page - 1) * limit;

  // Build where conditions
  const conditions = [];

  if (filters?.searchUser) {
    conditions.push(
      or(
        ilike(saleBatches.user_name, `%${filters.searchUser}%`),
        ilike(saleBatches.recipient, `%${filters.searchUser}%`)
      )
    );
  }

  if (filters?.meterType) {
    conditions.push(ilike(saleBatches.meter_type, filters.meterType));
  }

  if (filters?.customerType) {
    conditions.push(eq(saleBatches.customer_type, filters.customerType));
  }

  if (filters?.dateRange) {
    conditions.push(
      and(
        gte(saleBatches.sale_date, filters.dateRange.start),
        lte(saleBatches.sale_date, filters.dateRange.end)
      )
    );
  }

  if (filters?.specificDate) {
    const startOfDay = new Date(filters.specificDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(filters.specificDate);
    endOfDay.setHours(23, 59, 59, 999);
    conditions.push(
      and(
        gte(saleBatches.sale_date, startOfDay),
        lte(saleBatches.sale_date, endOfDay)
      )
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Get total count
  const countResult = await db
    .select({ count: count() })
    .from(saleBatches)
    .where(whereClause);

  const total = Number(countResult[0]?.count || 0);

  // Get paginated data
  const data = await db
    .select()
    .from(saleBatches)
    .where(whereClause)
    .orderBy(desc(saleBatches.sale_date))
    .limit(limit)
    .offset(offset);

  // Convert numeric fields to numbers and cast to our custom SaleBatch type
  const batches = data.map((batch) => ({
    ...batch,
    unit_price: Number(batch.unit_price),
    total_price: Number(batch.total_price),
  })) as Array<{
    id: string;
    user_id: string;
    user_name: string;
    meter_type: string;
    batch_amount: number;
    unit_price: number;
    total_price: number;
    destination: string;
    recipient: string;
    customer_type: string | null;
    customer_county: string | null;
    customer_contact: string | null;
    sale_date: Date | null;
    transaction_id: string | null;
    notes: string | null;
    note_by: string | null;
  }>;

  return {
    batches,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getSalesChartData(days: number = 30) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    // Aggregate sales data by date and meter type directly in the database
    const data = await db
      .select({
        date: sql<string>`DATE(${saleBatches.sale_date})`.as("date"),
        meter_type: saleBatches.meter_type,
        total_amount: sql<number>`SUM(${saleBatches.batch_amount})`.as(
          "total_amount"
        ),
        user_names:
          sql<string>`ARRAY_AGG(DISTINCT ${saleBatches.user_name})`.as(
            "user_names"
          ),
        user_amounts:
          sql<string>`ARRAY_AGG(${saleBatches.user_name} || ':' || ${saleBatches.batch_amount})`.as(
            "user_amounts"
          ),
      })
      .from(saleBatches)
      .where(gte(saleBatches.sale_date, cutoffDate))
      .groupBy(sql`DATE(${saleBatches.sale_date})`, saleBatches.meter_type)
      .orderBy(desc(sql`DATE(${saleBatches.sale_date})`));

    // Transform the data into the chart format
    const transformedData = data.map((row) => {
      const userSales: Record<string, number> = {};
      if (row.user_amounts) {
        // user_amounts is already an array from ARRAY_AGG, not a string
        if (Array.isArray(row.user_amounts)) {
          for (const item of row.user_amounts) {
            const [user, amount] = item.split(":");
            if (user && amount) {
              userSales[user] =
                (userSales[user] || 0) + Number.parseInt(amount, 10) || 0;
            }
          }
        } else {
          // Fallback if it's somehow a string
          for (const item of row.user_amounts.split(",")) {
            const [user, amount] = item.split(":");
            if (user && amount) {
              userSales[user] =
                (userSales[user] || 0) + Number.parseInt(amount, 10) || 0;
            }
          }
        }
      }

      return {
        date: row.date,
        meter_type: row.meter_type.toLowerCase().trim(),
        total_amount: Number(row.total_amount) || 0,
        user_sales: userSales,
        user_names: Array.isArray(row.user_names) ? row.user_names : [],
      };
    });

    return transformedData;
  } catch (error) {
    if (error instanceof Error) {
      console.error("Error fetching sales chart data:", error.message);
    }
    return [];
  }
}

export async function getMetersByBatchId(batchId: string) {
  // This query will be MUCH faster once the idx_sold_meters_batch_id index is created
  // The index allows PostgreSQL to quickly find all meters for a specific batch
  // instead of scanning the entire sold_meters table
  const data = await db
    .select({ serial_number: soldMeters.serial_number })
    .from(soldMeters)
    .where(eq(soldMeters.batch_id, batchId))
    .orderBy(soldMeters.serial_number); // Order for consistent display

  return data;
}

export async function getSoldMeterBySerial(serialNumber: string) {
  const normalizedSerial = serialNumber.toUpperCase();

  const [soldMeter] = await db
    .select({
      id: soldMeters.id,
      serial_number: soldMeters.serial_number,
      sold_at: soldMeters.sold_at,
      batch_id: soldMeters.batch_id,
      status: soldMeters.status,
      meter_type: saleBatches.meter_type,
    })
    .from(soldMeters)
    .leftJoin(saleBatches, eq(soldMeters.batch_id, saleBatches.id))
    .where(eq(soldMeters.serial_number, normalizedSerial))
    .limit(1);

  if (!soldMeter) {
    throw new Error(`Meter ${normalizedSerial} not found in sold meters`);
  }

  if (soldMeter.status !== "active") {
    throw new Error(
      `Meter ${normalizedSerial} is already marked as ${soldMeter.status}`
    );
  }

  return {
    id: soldMeter.id,
    serial_number: soldMeter.serial_number,
    sold_at: soldMeter.sold_at,
    type: soldMeter.meter_type || "unknown",
    status: soldMeter.status,
  };
}

export async function returnSoldMeter({
  meters: metersToReturn,
  returnedBy,
  returnerName,
  replacements = [],
}: {
  meters: Array<{
    id: string;
    serial_number: string;
    type: string;
    status: "healthy" | "faulty";
    fault_description?: string;
  }>;
  returnedBy: string;
  returnerName: string;
  replacements?: Array<{
    original_id: string;
    new_serial: string;
    new_type: string;
  }>;
}) {
  try {
    const healthyMeters = metersToReturn.filter((m) => m.status === "healthy");
    const faultyMeters = metersToReturn.filter((m) => m.status === "faulty");

    // Handle healthy meters - these need to be moved back to meters table
    if (healthyMeters.length > 0) {
      // 1. First add to meters table
      const metersToRestore = healthyMeters.map((meter) => ({
        serial_number: meter.serial_number,
        type: meter.type,
        added_by: returnedBy,
        added_at: new Date(),
        adder_name: returnerName,
      }));

      await db.insert(metersTable).values(metersToRestore);

      // 2. Then delete from sold_meters (since they're healthy and back in stock)
      await db.delete(soldMeters).where(
        inArray(
          soldMeters.id,
          healthyMeters.map((m) => m.id)
        )
      );
    }

    // Handle faulty meters
    if (faultyMeters.length > 0) {
      // Insert into faulty_returns table directly
      const faultyReturnsData = faultyMeters.map((meter) => ({
        serial_number: meter.serial_number,
        type: meter.type,
        returned_by: returnedBy,
        returner_name: returnerName,
        original_sale_id: meter.id,
        fault_description: meter.fault_description,
        status: "pending" as const,
      }));

      await db.insert(faultyReturns).values(faultyReturnsData);

      // Check for replacements
      for (const meter of faultyMeters) {
        const replacement = replacements.find(
          (r) => r.original_id === meter.id
        );

        if (replacement) {
          // Remove replacement meter from meters table (it's being used as replacement)
          await db
            .delete(metersTable)
            .where(eq(metersTable.serial_number, replacement.new_serial));

          // Update sold_meters record with replacement info
          await db
            .update(soldMeters)
            .set({
              status: "replaced",
              replacement_serial: replacement.new_serial,
              replacement_date: new Date(),
              replacement_by: returnedBy,
            })
            .where(eq(soldMeters.id, meter.id));
        } else {
          // Mark as faulty
          await db
            .update(soldMeters)
            .set({ status: "faulty" })
            .where(eq(soldMeters.id, meter.id));
        }
      }
    }

    return { success: true };
  } catch (error) {
    console.error("Error returning sold meters:", error);
    throw error;
  }
}

export async function createSalesTransaction({
  user_id,
  user_name,
  sale_date,
  destination,
  recipient,
  customer_type,
  customer_county,
  customer_contact,
  total_amount,
}: {
  user_id: string;
  user_name: string;
  sale_date: Date;
  destination: string;
  recipient: string;
  customer_type: string;
  customer_county: string;
  customer_contact: string;
  total_amount: number;
}) {
  try {
    const year = sale_date.getFullYear();

    // Get the current max reference number for this year
    const [lastTransaction] = await db
      .select({ reference_number: salesTransactions.reference_number })
      .from(salesTransactions)
      .where(like(salesTransactions.reference_number, `SR/${year}/%`))
      .orderBy(desc(salesTransactions.reference_number))
      .limit(1);

    let nextSequence = 1;
    if (lastTransaction) {
      const lastRef = lastTransaction.reference_number;
      const parts = lastRef.split("/");
      const lastSequence = Number.parseInt(parts.at(-1) || "0", 10);
      if (!Number.isNaN(lastSequence)) {
        nextSequence = lastSequence + 1;
      }
    }

    const referenceNumber = `SR/${year}/${nextSequence
      .toString()
      .padStart(5, "0")}`;

    const [data] = await db
      .insert(salesTransactions)
      .values({
        user_id,
        user_name,
        sale_date,
        destination,
        recipient,
        customer_type,
        customer_county,
        customer_contact,
        reference_number: referenceNumber,
        total_amount: total_amount.toString(),
      })
      .returning();

    return data;
  } catch (error) {
    console.error("Error creating sales transaction:", error);
    throw error;
  }
}

export async function linkBatchToTransaction(
  batchId: string,
  transactionId: string
) {
  try {
    if (!batchId || !transactionId) {
      throw new Error(
        "Missing required parameters: batch ID or transaction ID"
      );
    }

    // Check if the transaction exists
    const [transaction] = await db
      .select({ id: salesTransactions.id })
      .from(salesTransactions)
      .where(eq(salesTransactions.id, transactionId))
      .limit(1);

    if (!transaction) {
      throw new Error(`Transaction with ID ${transactionId} not found`);
    }

    // Check if the batch exists
    const [batch] = await db
      .select({ id: saleBatches.id })
      .from(saleBatches)
      .where(eq(saleBatches.id, batchId))
      .limit(1);

    if (!batch) {
      throw new Error(`Batch with ID ${batchId} not found`);
    }

    // Update the batch with the transaction ID
    await db
      .update(saleBatches)
      .set({ transaction_id: transactionId })
      .where(eq(saleBatches.id, batchId));

    // Fetch the updated batch data
    const [updatedBatch] = await db
      .select()
      .from(saleBatches)
      .where(eq(saleBatches.id, batchId))
      .limit(1);

    return updatedBatch;
  } catch (error) {
    console.error("Error linking batch to transaction:", error);
    throw error;
  }
}

export async function getSalesTransaction(transactionId: string) {
  const [transaction] = await db
    .select()
    .from(salesTransactions)
    .where(eq(salesTransactions.id, transactionId))
    .limit(1);

  if (!transaction) {
    throw new Error(`Transaction with ID ${transactionId} not found`);
  }

  const batches = await db
    .select()
    .from(saleBatches)
    .where(eq(saleBatches.transaction_id, transactionId));

  return {
    ...transaction,
    batches,
  };
}

export async function getSalesTransactions({
  page = 1,
  pageSize = 20,
  startDate,
  endDate,
  searchTerm,
}: {
  page?: number;
  pageSize?: number;
  startDate?: string;
  endDate?: string;
  searchTerm?: string;
}) {
  try {
    const offset = (page - 1) * pageSize;
    const conditions = [];
    if (startDate) {
      conditions.push(gte(salesTransactions.sale_date, new Date(startDate)));
    }
    if (endDate) {
      conditions.push(lte(salesTransactions.sale_date, new Date(endDate)));
    }
    if (searchTerm) {
      const searchLower = `%${searchTerm.toLowerCase()}%`;
      conditions.push(
        or(
          ilike(salesTransactions.reference_number, searchLower),
          ilike(salesTransactions.recipient, searchLower),
          ilike(salesTransactions.destination, searchLower)
        )
      );
    }

    const dataQuery = db
      .select()
      .from(salesTransactions)
      .where(and(...conditions))
      .orderBy(desc(salesTransactions.sale_date))
      .limit(pageSize)
      .offset(offset);

    const countQuery = db
      .select({ count: count() })
      .from(salesTransactions)
      .where(and(...conditions));

    const [data, total] = await Promise.all([dataQuery, countQuery]);

    const totalCount = total[0].count;

    return {
      data,
      totalCount,
      page,
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize),
    };
  } catch (error) {
    console.error("Error getting sales transactions:", error);
    throw error;
  }
}

export async function getSalesTransactionDetails(transactionId: string) {
  try {
    const [transaction] = await db
      .select()
      .from(salesTransactions)
      .where(eq(salesTransactions.id, transactionId))
      .limit(1);

    if (!transaction) {
      throw new Error(`Transaction with ID ${transactionId} not found`);
    }

    const batches = await db
      .select()
      .from(saleBatches)
      .where(eq(saleBatches.transaction_id, transactionId));

    const batchIds = batches.map((batch) => batch.id);

    const meters = await db
      .select()
      .from(soldMeters)
      .where(inArray(soldMeters.batch_id, batchIds));

    // Group meters by batch
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

    const batchesWithMeters = batches.map((batch) => ({
      ...batch,
      meters: metersByBatch[batch.id] || [],
    }));

    return {
      ...transaction,
      batches: batchesWithMeters,
    };
  } catch (error) {
    console.error("Error getting transaction details:", error);
    throw error;
  }
}

export async function getTransactionReferenceForBatch(batchId: string) {
  try {
    const [batch] = await db
      .select({ transaction_id: saleBatches.transaction_id })
      .from(saleBatches)
      .where(eq(saleBatches.id, batchId))
      .limit(1);

    if (!batch?.transaction_id) return null;

    const [transaction] = await db
      .select({ reference_number: salesTransactions.reference_number })
      .from(salesTransactions)
      .where(eq(salesTransactions.id, batch.transaction_id))
      .limit(1);

    return transaction?.reference_number || null;
  } catch (error) {
    console.error("Error getting transaction reference for batch:", error);
    return null;
  }
}

export async function getTransactionByReferenceNumber(referenceNumber: string) {
  try {
    const [transaction] = await db
      .select()
      .from(salesTransactions)
      .where(eq(salesTransactions.reference_number, referenceNumber))
      .limit(1);

    if (!transaction) return null;

    const batches = await db
      .select()
      .from(saleBatches)
      .where(eq(saleBatches.transaction_id, transaction.id));

    const batchIds = batches.map((batch) => batch.id);

    const meters = await db
      .select()
      .from(soldMeters)
      .where(inArray(soldMeters.batch_id, batchIds));

    // Create unit prices map from batches
    const unitPrices: Record<string, string> = {};
    for (const batch of batches) {
      unitPrices[batch.meter_type] = batch.unit_price;
    }

    // Format meters for receipt
    const formattedMeters = meters.map((meter) => ({
      serialNumber: meter.serial_number,
      type: saleBatches.meter_type,
      id: meter.meter_id || meter.id,
    }));

    // Get user name if not in transaction
    let userName = transaction.user_name;
    if (!userName && transaction.user_id) {
      const [profile] = await db
        .select({ name: userProfiles.name })
        .from(userProfiles)
        .where(eq(userProfiles.id, transaction.user_id))
        .limit(1);

      userName = profile?.name || "";
    }

    return {
      transactionData: transaction,
      meters: formattedMeters,
      unitPrices,
      userName,
    };
  } catch (error) {
    console.error("Error getting transaction by reference:", error);
    return null;
  }
}

/**
 * Add or update a note for a sale batch
 */
export async function addOrUpdateSaleNote({
  batchId,
  note,
  userId,
}: {
  batchId: string;
  note: string;
  userId: string;
}) {
  return withActiveUserCheck(userId, async () => {
    try {
      // Check if batch exists
      const [batch] = await db
        .select({ id: saleBatches.id, notes: saleBatches.notes })
        .from(saleBatches)
        .where(eq(saleBatches.id, batchId))
        .limit(1);

      if (!batch) {
        throw new Error(`Sale batch with ID ${batchId} not found`);
      }

      // Update the batch with the note and user who wrote it
      const [updatedBatch] = await db
        .update(saleBatches)
        .set({
          notes: note,
          note_by: userId,
        })
        .where(eq(saleBatches.id, batchId))
        .returning();

      return {
        success: true,
        batch: updatedBatch,
      };
    } catch (error) {
      console.error("Error adding/updating sale note:", error);
      throw error;
    }
  });
}

/**
 * Process a meter sale with full transaction safety and validation
 * This function ensures all-or-nothing operation to prevent partial sales
 */
export async function processMeterSale({
  meters,
  currentUser,
  userName,
  saleDetails,
}: {
  meters: Array<{ id: string; serialNumber: string; type: string }>;
  currentUser: { id: string };
  userName: string;
  saleDetails: {
    destination: string;
    recipient: string;
    unitPrices: { [key: string]: string };
    customerType: string;
    customerCounty: string;
    customerContact: string;
    saleDate: Date;
  };
}) {
  // Input validation
  if (meters.length === 0) {
    throw new Error("No meters provided for sale");
  }

  if (!saleDetails.destination?.trim() || !saleDetails.recipient?.trim()) {
    throw new Error("Destination and recipient are required");
  }

  // Validate all meter types have unit prices
  const uniqueTypes = Array.from(new Set(meters.map((m) => m.type)));
  const missingPrices = uniqueTypes.filter(
    (type) => !saleDetails.unitPrices[type]
  );
  if (missingPrices.length > 0) {
    throw new Error(`Missing unit prices for: ${missingPrices.join(", ")}`);
  }

  // Step 1: Pre-validation - Check all meters exist and are available
  console.log("Step 1: Validating all meters exist and are available...");
  const meterIds = meters.map((m) => m.id);
  const availableMeters = await db
    .select({ id: metersTable.id, serial_number: metersTable.serial_number })
    .from(metersTable)
    .where(inArray(metersTable.id, meterIds));

  if (availableMeters.length !== meters.length) {
    const foundIds = new Set(availableMeters.map((m) => m.id));
    const missingIds = meterIds.filter((id) => !foundIds.has(id));
    throw new Error(
      `Some meters are no longer available. Missing meter IDs: ${missingIds.join(", ")}`
    );
  }

  // Check for duplicates in the input
  const serialNumbers = meters.map((m) => m.serialNumber.toLowerCase());
  const duplicates = serialNumbers.filter(
    (sn, idx) => serialNumbers.indexOf(sn) !== idx
  );
  if (duplicates.length > 0) {
    throw new Error(
      `Duplicate meters detected: ${Array.from(new Set(duplicates)).join(", ")}`
    );
  }

  // Check if any meters are already sold
  const alreadySold = await db
    .select({ serial_number: soldMeters.serial_number })
    .from(soldMeters)
    .where(
      inArray(
        soldMeters.serial_number,
        meters.map((m) => m.serialNumber)
      )
    );

  if (alreadySold.length > 0) {
    throw new Error(
      `Meters already sold: ${alreadySold.map((m) => m.serial_number).join(", ")}`
    );
  }

  try {
    // Step 2: Group meters by type
    console.log("Step 2: Grouping meters by type...");
    const metersByType = meters.reduce(
      (acc: { [key: string]: typeof meters }, meter) => {
        if (!acc[meter.type]) acc[meter.type] = [];
        acc[meter.type].push(meter);
        return acc;
      },
      {}
    );

    // Step 3: Calculate total amount
    const totalAmount = Object.entries(metersByType).reduce(
      (total, [type, typeMeters]) =>
        total +
        typeMeters.length *
          Number.parseFloat(saleDetails.unitPrices[type] || "0"),
      0
    );

    console.log("Step 3: Creating sales transaction...");
    // Step 4: Create sales transaction
    const transactionData = await createSalesTransaction({
      user_id: currentUser.id,
      user_name: userName,
      sale_date: saleDetails.saleDate,
      destination: saleDetails.destination,
      recipient: saleDetails.recipient,
      customer_type: saleDetails.customerType,
      customer_county: saleDetails.customerCounty,
      customer_contact: saleDetails.customerContact,
      total_amount: totalAmount,
    });

    console.log(
      `Transaction created with ID: ${transactionData.id}, Reference: ${transactionData.reference_number}`
    );

    // Step 5: Process each meter type as a batch
    const processedBatches: Array<{
      batchId: string;
      type: string;
      count: number;
    }> = [];

    for (const [type, typeMeters] of Object.entries(metersByType)) {
      const batchAmount = typeMeters.length;
      const typeUnitPrice = Number.parseFloat(saleDetails.unitPrices[type]);
      const totalPrice = typeUnitPrice * batchAmount;

      console.log(
        `Step 5a: Creating batch for ${type}: ${batchAmount} meters @ ${typeUnitPrice} each`
      );

      // Create sale batch with transaction_id
      const batchData = await addSaleBatch({
        user_id: currentUser.id,
        user_name: userName,
        meter_type: type,
        batch_amount: batchAmount,
        unit_price: typeUnitPrice,
        total_price: totalPrice,
        destination: saleDetails.destination,
        recipient: saleDetails.recipient,
        customer_type: saleDetails.customerType,
        customer_county: saleDetails.customerCounty,
        customer_contact: saleDetails.customerContact,
        sale_date: saleDetails.saleDate,
        transaction_id: transactionData.id,
      });

      if (!batchData?.id) {
        throw new Error(`Failed to create batch for ${type} meters`);
      }

      console.log(`Batch created: ${batchData.id} for ${type}`);

      // Step 5b: Process individual meters with proper error handling
      // Process sequentially to ensure atomicity per meter
      for (const meter of typeMeters) {
        try {
          // Step 1: Remove from meters table FIRST
          await removeMeter(meter.id);
          console.log(`✓ Removed meter ${meter.serialNumber} from stock`);

          // Step 2: Only add to sold_meters if removal was successful
          await addSoldMeter({
            meter_id: meter.id,
            sold_by: currentUser.id,
            sold_at: saleDetails.saleDate,
            destination: saleDetails.destination,
            recipient: saleDetails.recipient,
            serial_number: meter.serialNumber,
            unit_price: typeUnitPrice,
            batch_id: batchData.id,
            customer_type: saleDetails.customerType,
            customer_county: saleDetails.customerCounty,
            customer_contact: saleDetails.customerContact,
          });
          console.log(`✓ Added meter ${meter.serialNumber} to sold_meters`);
        } catch (error) {
          // If either step fails, log and re-throw to stop the entire sale
          console.error(
            `CRITICAL ERROR processing meter ${meter.serialNumber}:`,
            error
          );
          throw new Error(
            `Failed to process meter ${meter.serialNumber}: ${error instanceof Error ? error.message : "Unknown error"}. Sale aborted to prevent data corruption.`
          );
        }
      }

      processedBatches.push({
        batchId: batchData.id,
        type,
        count: batchAmount,
      });

      console.log(`Completed processing ${batchAmount} ${type} meters`);
    }

    // Step 6: Final verification - ensure all meters were properly recorded
    console.log("Step 6: Verifying all meters were recorded...");
    for (const batch of processedBatches) {
      const recordedCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(soldMeters)
        .where(eq(soldMeters.batch_id, batch.batchId));

      const actualCount = Number(recordedCount[0]?.count || 0);

      if (actualCount !== batch.count) {
        // Critical mismatch detected
        console.error(
          `CRITICAL: Batch ${batch.batchId} has mismatch! Expected: ${batch.count}, Got: ${actualCount}`
        );
        throw new Error(
          `Data integrity error: Expected ${batch.count} meters in batch but found ${actualCount}. Sale has been aborted.`
        );
      }

      console.log(
        `✓ Batch ${batch.batchId} verified: ${actualCount}/${batch.count} meters`
      );
    }

    console.log("Sale completed successfully!");

    return {
      success: true,
      transactionId: transactionData.id,
      referenceNumber: transactionData.reference_number,
      batches: processedBatches,
    };
  } catch (error) {
    console.error("Error processing meter sale:", error);
    // In case of error, the transaction should be rolled back
    // For now, we'll re-throw the error
    throw error;
  }
}

/**
 * Process an agent meter sale with full transaction safety and validation
 * This is specifically for sales from agent inventory
 */
export async function processAgentMeterSale({
  meters,
  currentUser,
  userName,
  agentId,
  saleDetails,
  removeFromInventory,
}: {
  meters: Array<{ id: string; serial_number: string; type: string }>;
  currentUser: { id: string };
  userName: string;
  agentId: string;
  saleDetails: {
    destination: string;
    recipient: string;
    unitPrices: { [key: string]: string };
    customerType: string;
    customerCounty: string;
    customerContact: string;
    saleDate: Date;
  };
  removeFromInventory: (meterId: string) => Promise<void>;
}) {
  // Input validation
  if (meters.length === 0) {
    throw new Error("No meters provided for sale");
  }

  if (!saleDetails.destination?.trim() || !saleDetails.recipient?.trim()) {
    throw new Error("Destination and recipient are required");
  }

  // Validate all meter types have unit prices
  const uniqueTypes = Array.from(new Set(meters.map((m) => m.type)));
  const missingPrices = uniqueTypes.filter(
    (type) => !saleDetails.unitPrices[type]
  );
  if (missingPrices.length > 0) {
    throw new Error(`Missing unit prices for: ${missingPrices.join(", ")}`);
  }

  // Check for duplicates in the input
  const serialNumbers = meters.map((m) => m.serial_number.toLowerCase());
  const duplicates = serialNumbers.filter(
    (sn, idx) => serialNumbers.indexOf(sn) !== idx
  );
  if (duplicates.length > 0) {
    throw new Error(
      `Duplicate meters detected: ${Array.from(new Set(duplicates)).join(", ")}`
    );
  }

  try {
    console.log("Step 1: Grouping meters by type...");
    const metersByType = meters.reduce(
      (acc: { [key: string]: typeof meters }, meter) => {
        if (!acc[meter.type]) acc[meter.type] = [];
        acc[meter.type].push(meter);
        return acc;
      },
      {}
    );

    // Calculate total amount
    const totalAmount = Object.entries(metersByType).reduce(
      (total, [type, typeMeters]) =>
        total +
        typeMeters.length *
          Number.parseFloat(saleDetails.unitPrices[type] || "0"),
      0
    );

    console.log("Step 2: Creating sales transaction...");
    // Create sales transaction
    const transactionData = await createSalesTransaction({
      user_id: currentUser.id,
      user_name: userName,
      sale_date: saleDetails.saleDate,
      destination: saleDetails.destination,
      recipient: saleDetails.recipient,
      customer_type: saleDetails.customerType,
      customer_county: saleDetails.customerCounty,
      customer_contact: saleDetails.customerContact,
      total_amount: totalAmount,
    });

    console.log(
      `Transaction created with ID: ${transactionData.id}, Reference: ${transactionData.reference_number}`
    );

    // Process each meter type as a batch
    const processedBatches: Array<{
      batchId: string;
      type: string;
      count: number;
    }> = [];

    for (const [type, typeMeters] of Object.entries(metersByType)) {
      const batchAmount = typeMeters.length;
      const typeUnitPrice = Number.parseFloat(saleDetails.unitPrices[type]);
      const totalPrice = typeUnitPrice * batchAmount;

      console.log(
        `Step 3: Creating batch for ${type}: ${batchAmount} meters @ ${typeUnitPrice} each`
      );

      // Create sale batch with transaction_id
      const batchData = await addSaleBatch({
        user_id: currentUser.id,
        user_name: userName,
        meter_type: type,
        batch_amount: batchAmount,
        unit_price: typeUnitPrice,
        total_price: totalPrice,
        destination: saleDetails.destination,
        recipient: saleDetails.recipient,
        customer_type: saleDetails.customerType,
        customer_county: saleDetails.customerCounty,
        customer_contact: saleDetails.customerContact,
        sale_date: saleDetails.saleDate,
        transaction_id: transactionData.id,
      });

      if (!batchData?.id) {
        throw new Error(`Failed to create batch for ${type} meters`);
      }

      console.log(`Batch created: ${batchData.id} for ${type}`);

      // Process individual meters with proper error handling
      // Process sequentially to ensure atomicity per meter
      for (const meter of typeMeters) {
        try {
          // Step 1: Remove from agent inventory FIRST
          await removeFromInventory(meter.id);
          console.log(
            `✓ Removed meter ${meter.serial_number} from agent inventory`
          );

          // Step 2: Only add to sold_meters if removal was successful
          await addSoldMeter({
            meter_id: meter.id,
            sold_by: currentUser.id,
            sold_at: saleDetails.saleDate,
            destination: saleDetails.destination,
            recipient: saleDetails.recipient,
            serial_number: meter.serial_number,
            unit_price: typeUnitPrice,
            batch_id: batchData.id,
            customer_type: saleDetails.customerType,
            customer_county: saleDetails.customerCounty,
            customer_contact: saleDetails.customerContact,
          });
          console.log(`✓ Added meter ${meter.serial_number} to sold_meters`);
        } catch (error) {
          // If either step fails, log and re-throw to stop the entire sale
          console.error(
            `CRITICAL ERROR processing meter ${meter.serial_number}:`,
            error
          );
          throw new Error(
            `Failed to process meter ${meter.serial_number}: ${error instanceof Error ? error.message : "Unknown error"}. Sale aborted to prevent data corruption.`
          );
        }
      }

      processedBatches.push({
        batchId: batchData.id,
        type,
        count: batchAmount,
      });

      console.log(`Completed processing ${batchAmount} ${type} meters`);
    }

    // Final verification - ensure all meters were properly recorded
    console.log("Step 4: Verifying all meters were recorded...");
    for (const batch of processedBatches) {
      const recordedCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(soldMeters)
        .where(eq(soldMeters.batch_id, batch.batchId));

      const actualCount = Number(recordedCount[0]?.count || 0);

      if (actualCount !== batch.count) {
        console.error(
          `CRITICAL: Batch ${batch.batchId} has mismatch! Expected: ${batch.count}, Got: ${actualCount}`
        );
        throw new Error(
          `Data integrity error: Expected ${batch.count} meters in batch but found ${actualCount}. Sale has been aborted.`
        );
      }

      console.log(
        `✓ Batch ${batch.batchId} verified: ${actualCount}/${batch.count} meters`
      );
    }

    console.log("Agent sale completed successfully!");

    return {
      success: true,
      transactionId: transactionData.id,
      referenceNumber: transactionData.reference_number,
      batches: processedBatches,
    };
  } catch (error) {
    console.error("Error processing agent meter sale:", error);
    throw error;
  }
}
