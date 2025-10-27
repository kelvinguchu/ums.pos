import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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
        assigned_at: string;
        agent_location: string;
      };
    }
  | {
      serial_number: string;
      type: string;
      status: "sold";
      sale_details: {
        sold_at: string;
        sold_by: string;
        destination: string;
        recipient: string;
        customer_contact: string;
        unit_price: number;
        batch_id: string;
        status: string;
      };
    }
  | {
      serial_number: string;
      type: string;
      status: "replaced";
      sale_details: {
        sold_at: string;
        sold_by: string;
        destination: string;
        recipient: string;
        customer_contact: string;
        unit_price: number;
        batch_id: string;
        status: string;
      };
      replacement_details: {
        replacement_serial: string;
        replacement_date: string;
        replacement_by: string;
      };
    }
  | {
      serial_number: string;
      type: string;
      status: "faulty";
      fault_details?: {
        reported_by: string;
        reported_at: string;
        fault_description: string;
        returned_at?: string;
        returner_name?: string;
        fault_status?: string;
      };
      sale_details?: {
        sold_at: string;
        sold_by: string;
        destination: string;
        recipient: string;
        customer_contact: string;
        unit_price: number;
        batch_id: string;
        status: string;
      };
    };

/**
 * Fetches all meters for CSV export without pagination
 */
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
        let query = supabase.from("meters").select("id, serial_number, type");

        if (filterType && filterType !== "all") {
          query = query.eq("type", filterType);
        }

        if (searchTerm) {
          query = query.ilike("serial_number", `%${searchTerm}%`);
        }

        const { data: stockMeters, error } = await query;

        if (error) {
          console.error("Error fetching stock meters:", error);
        } else if (stockMeters && stockMeters.length > 0) {
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
        let query = supabase.from("agent_inventory").select(`
            id, 
          serial_number, 
            type, 
            assigned_at, 
            agent_id, 
            agents(id, name, phone_number, location)
          `);

        if (filterType && filterType !== "all") {
          query = query.eq("type", filterType);
        }

        if (searchTerm) {
          query = query.ilike("serial_number", `%${searchTerm}%`);
        }

        const { data: agentMeters, error } = await query;

        if (error) {
          console.error("Error fetching agent meters:", error);
        } else if (agentMeters && agentMeters.length > 0) {
          const processedAgentMeters = agentMeters.map((meter) => {
            // Type assertion for agents
            const agentData = meter.agents as any;

            return {
              serial_number: meter.serial_number,
              type: meter.type,
              status: "with_agent" as const,
              agent_details: {
                agent_id: meter.agent_id,
                agent_name: agentData ? agentData.name : "Unknown",
                agent_phone: agentData ? agentData.phone_number : "Unknown",
                assigned_at: meter.assigned_at,
                agent_location: agentData ? agentData.location : "Unknown",
              },
            };
          });

          allMeters = [...allMeters, ...processedAgentMeters];
        }
      } catch (error) {
        console.error("Error in agent meters query:", error);
      }
    }

    // 3. SOLD METERS - Query from sold_meters joined with sale_batches
    if (!filterStatus || filterStatus === "sold") {
      try {
        let query = supabase
          .from("sold_meters")
          .select(
            `
            id, 
          serial_number, 
          sold_by, 
          sold_at, 
          destination, 
          recipient, 
          customer_contact, 
          unit_price, 
          batch_id,
          status,
            sale_batches(meter_type)
        `
          )
          .eq("status", "active");

        if (filterType && filterType !== "all") {
          query = query.eq("sale_batches.meter_type", filterType);
        }

        if (searchTerm) {
          query = query.ilike("serial_number", `%${searchTerm}%`);
        }

        const { data: soldMeters, error } = await query;

        if (error) {
          console.error("Error fetching sold meters:", error);
        } else if (soldMeters && soldMeters.length > 0) {
          // Get user profiles for sold meters
          const userIds = [...new Set(soldMeters.map((m) => m.sold_by))];
          const { data: userProfiles, error: userError } = await supabase
            .from("user_profiles")
            .select("id, name")
            .in("id", userIds);

          if (userError) {
            console.error("Error fetching user profiles:", userError);
          }

          const userMap: Record<string, string> = {};
          if (userProfiles) {
            userProfiles.forEach((user) => {
              userMap[user.id] = user.name;
            });
          }

          const processedSoldMeters = soldMeters.map((meter) => {
            // Type assertion for sale_batches
            const batchData = meter.sale_batches as any;

            return {
              serial_number: meter.serial_number,
              type: batchData ? batchData.meter_type : "Unknown",
              status: "sold" as const,
              sale_details: {
                sold_at: meter.sold_at,
                sold_by: userMap[meter.sold_by] || meter.sold_by,
                destination: meter.destination,
                recipient: meter.recipient,
                customer_contact: meter.customer_contact || "",
                unit_price: meter.unit_price,
                batch_id: meter.batch_id,
                status: meter.status,
              },
            };
          });

          allMeters = [...allMeters, ...processedSoldMeters];
        }
      } catch (error) {
        console.error("Error in sold meters query:", error);
      }
    }

    // 4. REPLACED METERS - Query from sold_meters with status=replaced
    if (!filterStatus || filterStatus === "replaced") {
      try {
        let query = supabase
          .from("sold_meters")
          .select(
            `
            id, 
            serial_number, 
            sold_by, 
            sold_at, 
            destination, 
            recipient, 
            customer_contact, 
            unit_price, 
            batch_id,
            status,
            replacement_serial,
            replacement_date,
            replacement_by,
            sale_batches(meter_type)
          `
          )
          .eq("status", "replaced");

        if (filterType && filterType !== "all") {
          query = query.eq("sale_batches.meter_type", filterType);
        }

        if (searchTerm) {
          query = query.ilike("serial_number", `%${searchTerm}%`);
        }

        const { data: replacedMeters, error } = await query;

        if (error) {
          console.error("Error fetching replaced meters:", error);
        } else if (replacedMeters && replacedMeters.length > 0) {
          // Get user profiles for sold_by and replacement_by
          const userIds = [
            ...new Set([
              ...replacedMeters.map((m) => m.sold_by),
              ...replacedMeters.map((m) => m.replacement_by).filter(Boolean),
            ]),
          ];

          const { data: userProfiles, error: userError } = await supabase
            .from("user_profiles")
            .select("id, name")
            .in("id", userIds);

          if (userError) {
            console.error("Error fetching user profiles:", userError);
          }

          const userMap: Record<string, string> = {};
          if (userProfiles) {
            userProfiles.forEach((user) => {
              userMap[user.id] = user.name;
            });
          }

          const processedReplacedMeters = replacedMeters.map((meter) => {
            // Type assertion for sale_batches
            const batchData = meter.sale_batches as any;

            return {
              serial_number: meter.serial_number,
              type: batchData ? batchData.meter_type : "Unknown",
              status: "replaced" as const,
              sale_details: {
                sold_at: meter.sold_at,
                sold_by: userMap[meter.sold_by] || meter.sold_by,
                destination: meter.destination,
                recipient: meter.recipient,
                customer_contact: meter.customer_contact || "",
                unit_price: meter.unit_price,
                batch_id: meter.batch_id,
                status: meter.status,
              },
              replacement_details: {
                replacement_serial: meter.replacement_serial || "Unknown",
                replacement_date: meter.replacement_date || "Unknown",
                replacement_by:
                  userMap[meter.replacement_by] || meter.replacement_by,
              },
            };
          });

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
        let query = supabase.from("faulty_returns").select(`
            id, 
            serial_number, 
            type, 
            returned_by, 
            returned_at, 
            returner_name, 
            fault_description, 
            status
          `);

        if (filterType && filterType !== "all") {
          query = query.eq("type", filterType);
        }

        if (searchTerm) {
          query = query.ilike("serial_number", `%${searchTerm}%`);
        }

        const { data: faultyMeters, error } = await query;

        if (error) {
          console.error(
            "Error fetching faulty meters from faulty_returns:",
            error
          );
        } else if (faultyMeters && faultyMeters.length > 0) {
          const processedFaultyMeters = faultyMeters.map((meter) => ({
            serial_number: meter.serial_number,
            type: meter.type,
            status: "faulty" as const,
            fault_details: {
              reported_by: meter.returned_by || "",
              reported_at: meter.returned_at || "",
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
        let query = supabase
          .from("sold_meters")
          .select(
            `
            id, 
            serial_number, 
            sold_by, 
            sold_at, 
            destination, 
            recipient, 
            customer_contact, 
            unit_price, 
            batch_id,
            status,
            sale_batches(meter_type)
          `
          )
          .eq("status", "faulty");

        if (filterType && filterType !== "all") {
          query = query.eq("sale_batches.meter_type", filterType);
        }

        if (searchTerm) {
          query = query.ilike("serial_number", `%${searchTerm}%`);
        }

        const { data: faultySoldMeters, error } = await query;

        if (error) {
          console.error(
            "Error fetching faulty meters from sold_meters:",
            error
          );
        } else if (faultySoldMeters && faultySoldMeters.length > 0) {
          // Get user profiles for sold_by
          const userIds = [...new Set(faultySoldMeters.map((m) => m.sold_by))];
          const { data: userProfiles, error: userError } = await supabase
            .from("user_profiles")
            .select("id, name")
            .in("id", userIds);

          if (userError) {
            console.error("Error fetching user profiles:", userError);
          }

          const userMap: Record<string, string> = {};
          if (userProfiles) {
            userProfiles.forEach((user) => {
              userMap[user.id] = user.name;
            });
          }

          const processedFaultySoldMeters = faultySoldMeters.map((meter) => {
            // Type assertion for sale_batches
            const batchData = meter.sale_batches as any;

            return {
              serial_number: meter.serial_number,
              type: batchData ? batchData.meter_type : "Unknown",
              status: "faulty" as const,
              sale_details: {
                sold_at: meter.sold_at,
                sold_by: userMap[meter.sold_by] || meter.sold_by,
                destination: meter.destination,
                recipient: meter.recipient,
                customer_contact: meter.customer_contact || "",
                unit_price: meter.unit_price,
                batch_id: meter.batch_id,
                status: meter.status,
              },
            };
          });

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

/**
 * Creates a sales transaction that can link multiple sale batches together
 */
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
  sale_date: string;
  destination: string;
  recipient: string;
  customer_type: string;
  customer_county: string;
  customer_contact: string;
  total_amount: number;
}) {
  try {
    // Generate a reference number based on the year
    const year = new Date(sale_date).getFullYear();

    // Get the current max reference number for this year
    const { data: lastTransaction, error: queryError } = await supabase
      .from("sales_transactions")
      .select("reference_number")
      .like("reference_number", `SR/${year}/%`)
      .order("reference_number", { ascending: false })
      .limit(1);

    let nextSequence = 1;
    if (!queryError && lastTransaction && lastTransaction.length > 0) {
      // Extract the sequence number part (after last '/')
      const lastRef = lastTransaction[0].reference_number;
      const parts = lastRef.split("/");
      const lastSequence = parseInt(parts[parts.length - 1]);
      if (!isNaN(lastSequence)) {
        nextSequence = lastSequence + 1;
      }
    }

    // Format with leading zeros
    const referenceNumber = `SR/${year}/${nextSequence
      .toString()
      .padStart(5, "0")}`;

    // Create the transaction record
    const { data, error } = await supabase
      .from("sales_transactions")
      .insert({
        user_id,
        user_name,
        sale_date,
        destination,
        recipient,
        customer_type,
        customer_county,
        customer_contact,
        reference_number: referenceNumber,
        total_amount,
      })
      .select()
      .single();

    if (error) {
      // Provide more details about the error
      if (error.code === "42501") {
        throw new Error(
          "Permission denied: You don't have access to create sales transactions"
        );
      } else if (error.code === "PGRST116") {
        throw new Error(
          "Database error: Could not retrieve the created transaction"
        );
      } else {
        throw error;
      }
    }

    if (!data || !data.id) {
      throw new Error("Failed to create sales transaction: No data returned");
    }

    return data;
  } catch (error) {
    throw error;
  }
}

/**
 * Updates a sale batch to link it to a transaction
 */
export async function linkBatchToTransaction(
  batchId: string,
  transactionId: string
) {
  try {
    // Validate inputs
    if (!batchId || !transactionId) {
      throw new Error(
        "Missing required parameters: batch ID or transaction ID"
      );
    }

    // Check if the transaction exists first
    const { data: transactionExists, error: transactionCheckError } =
      await supabase
        .from("sales_transactions")
        .select("id")
        .eq("id", transactionId)
        .single();

    if (transactionCheckError) {
      throw new Error(`Transaction with ID ${transactionId} not found`);
    }

    // Check if the batch exists
    const { data: batchExists, error: batchCheckError } = await supabase
      .from("sale_batches")
      .select("id")
      .eq("id", batchId)
      .single();

    if (batchCheckError) {
      throw new Error(`Batch with ID ${batchId} not found`);
    }

    // Update the batch with the transaction ID - SEPARATED FROM SELECT
    const { error: updateError } = await supabase
      .from("sale_batches")
      .update({ transaction_id: transactionId })
      .eq("id", batchId);

    if (updateError) {
      throw new Error(
        `Failed to link batch to transaction: ${updateError.message}`
      );
    }

    // After successful update, fetch the updated batch data separately
    const { data, error: fetchError } = await supabase
      .from("sale_batches")
      .select("*")
      .eq("id", batchId)
      .single();

    if (fetchError) {
      // Don't throw error here, the update succeeded which is the important part
      return { id: batchId, transaction_id: transactionId }; // Return minimal data
    }

    return data;
  } catch (error) {
    throw error;
  }
}

/**
 * Gets a sales transaction by ID with its associated batches
 */
export async function getSalesTransaction(transactionId: string) {
  try {
    const { data: transaction, error: transactionError } = await supabase
      .from("sales_transactions")
      .select("*")
      .eq("id", transactionId)
      .single();

    if (transactionError) throw transactionError;

    const { data: batches, error: batchesError } = await supabase
      .from("sale_batches")
      .select("*")
      .eq("transaction_id", transactionId);

    if (batchesError) throw batchesError;

    return {
      ...transaction,
      batches: batches || [],
    };
  } catch (error) {
    console.error("Error getting sales transaction:", error);
    throw error;
  }
}

/**
 * Gets all sales transactions with optional filtering and pagination
 */
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
    let query = supabase
      .from("sales_transactions")
      .select("*", { count: "exact" });

    // Apply filters
    if (startDate) {
      query = query.gte("sale_date", startDate);
    }

    if (endDate) {
      query = query.lte("sale_date", endDate);
    }

    if (searchTerm) {
      query = query.or(
        `reference_number.ilike.%${searchTerm}%,recipient.ilike.%${searchTerm}%,destination.ilike.%${searchTerm}%`
      );
    }

    // Add pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    query = query.order("sale_date", { ascending: false }).range(from, to);

    const { data, count, error } = await query;

    if (error) throw error;

    return {
      data: data || [],
      totalCount: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
    };
  } catch (error) {
    console.error("Error getting sales transactions:", error);
    throw error;
  }
}

/**
 * Gets the details of a transaction including all meters sold
 */
export async function getSalesTransactionDetails(transactionId: string) {
  try {
    // First get the transaction
    const { data: transaction, error: transactionError } = await supabase
      .from("sales_transactions")
      .select("*")
      .eq("id", transactionId)
      .single();

    if (transactionError) throw transactionError;

    // Get all batches in this transaction
    const { data: batches, error: batchesError } = await supabase
      .from("sale_batches")
      .select("*")
      .eq("transaction_id", transactionId);

    if (batchesError) throw batchesError;

    // Get all meters from these batches
    const batchIds = batches?.map((batch) => batch.id) || [];

    const { data: meters, error: metersError } = await supabase
      .from("sold_meters")
      .select("*")
      .in("batch_id", batchIds);

    if (metersError) throw metersError;

    // Group meters by batch
    const metersByBatch = (meters || []).reduce((acc, meter) => {
      if (!acc[meter.batch_id]) {
        acc[meter.batch_id] = [];
      }
      acc[meter.batch_id].push(meter);
      return acc;
    }, {} as Record<string, any[]>);

    // Add meters to their respective batches
    const batchesWithMeters = (batches || []).map((batch) => ({
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

/**
 * Gets the transaction reference number for a specific batch
 */
export async function getTransactionReferenceForBatch(batchId: number) {
  try {
    const { data, error } = await supabase
      .from("sale_batches")
      .select("transaction_id")
      .eq("id", batchId)
      .single();

    if (error) throw error;
    if (!data?.transaction_id) return null;

    const { data: transaction, error: transactionError } = await supabase
      .from("sales_transactions")
      .select("reference_number")
      .eq("id", data.transaction_id)
      .single();

    if (transactionError) throw transactionError;
    return transaction?.reference_number || null;
  } catch (error) {
    console.error("Error getting transaction reference for batch:", error);
    return null;
  }
}

/**
 * Gets transaction details by reference number for receipt generation
 */
export async function getTransactionByReferenceNumber(referenceNumber: string) {
  try {
    // Get the transaction
    const { data: transaction, error: transactionError } = await supabase
      .from("sales_transactions")
      .select("*")
      .eq("reference_number", referenceNumber)
      .single();

    if (transactionError) throw transactionError;
    if (!transaction) return null;

    console.log("Found transaction:", transaction.id);

    // Get all batches in this transaction
    const { data: batches, error: batchesError } = await supabase
      .from("sale_batches")
      .select("*")
      .eq("transaction_id", transaction.id);

    if (batchesError) throw batchesError;
    console.log("Found batches:", batches?.length || 0);

    // Get all meters from these batches
    const batchIds = batches?.map((batch) => batch.id) || [];
    if (batchIds.length === 0) {
      console.log("No batch IDs found for transaction");
      return {
        transactionData: transaction,
        meters: [],
        unitPrices: {},
        userName: transaction.user_name || "Unknown",
      };
    }

    console.log("Batch IDs:", batchIds);

    // Try using RPC to get the meters data
    const { data: meters, error: metersError } = await supabase
      .from("sold_meters")
      .select("*")
      .in("batch_id", batchIds);

    if (metersError) {
      console.error("Error fetching meters:", metersError);
      throw metersError;
    }

    console.log("Found meters:", meters?.length || 0);

    // Fallback method if first query returns no results
    let finalMeters = meters || [];
    if (!finalMeters.length) {
      // Try querying each batch ID individually
      for (const batchId of batchIds) {
        const { data: batchMeters } = await supabase
          .from("sold_meters")
          .select("serial_number, batch_id")
          .eq("batch_id", batchId);

        if (batchMeters && batchMeters.length) {
          console.log(
            `Found ${batchMeters.length} meters for batch ${batchId}`
          );
          finalMeters = [...finalMeters, ...batchMeters];
        }
      }
    }

    // Create unit prices map from batches
    const unitPrices: Record<string, string> = {};
    batches?.forEach((batch) => {
      unitPrices[batch.meter_type] = batch.unit_price.toString();
    });

    // Format meters for receipt
    const formattedMeters = finalMeters.map((meter) => {
      const batch = batches?.find((b) => b.id === meter.batch_id);
      return {
        serialNumber: meter.serial_number,
        type: batch?.meter_type || "Unknown",
      };
    });

    // Get user name if not in transaction
    let userName = transaction.user_name;
    if (!userName && transaction.user_id) {
      const { data: user } = await supabase
        .from("user_profiles")
        .select("name")
        .eq("id", transaction.user_id)
        .single();

      userName = user?.name || "Unknown";
    }

    // Collect alternative data if no meters found
    const metersCount =
      batches?.reduce((acc, batch) => acc + batch.batch_amount, 0) || 0;
    if (formattedMeters.length === 0 && metersCount > 0) {
      // Create fake meter data based on batch information
      const syntheticMeters = [];
      for (const batch of batches || []) {
        for (let i = 0; i < batch.batch_amount; i++) {
          syntheticMeters.push({
            serialNumber: `(Not available ${i + 1})`,
            type: batch.meter_type,
          });
        }
      }

      console.log(
        `Created ${syntheticMeters.length} synthetic meter entries based on batch amounts`
      );

      return {
        transactionData: transaction,
        meters: syntheticMeters,
        unitPrices,
        userName,
        isSyntheticData: true,
      };
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
