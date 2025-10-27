import { createClient } from "@supabase/supabase-js";
import {
  KENYA_COUNTIES,
  KenyaCounty,
  CustomerType,
} from "@/lib/constants/locationData";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function checkUserActive(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("user_profiles")
    .select("is_active")
    .eq("id", userId)
    .single();

  if (error || !data) {
    return false;
  }

  return data.is_active;
}

// Create a higher-order function to wrap database actions
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

// Add this new function
export async function getAllMeters() {
  const { data, error } = await supabase.from("meters").select("serial_number");

  if (error) throw error;
  return data?.map((m) => m.serial_number) || [];
}

// Update the checkMeterExists function to use cache
let metersCache: string[] | null = null;

export async function checkMeterExists(serialNumber: string): Promise<boolean> {
  try {
    const normalizedSerial = serialNumber.replace(/^0+/, "").toUpperCase();

    // If cache doesn't exist, fetch and store
    if (!metersCache) {
      metersCache = await getAllMeters();
    }

    // Check in cache
    return metersCache.some(
      (m) => m.replace(/^0+/, "").toUpperCase() === normalizedSerial
    );
  } catch (error) {
    console.error("Error checking meter existence:", error);
    throw error;
  }
}

// Add function to clear cache
export function clearMetersCache() {
  metersCache = null;
}

// Combined addMeters function
export async function addMeters(
  meters: Array<{
    serial_number: string;
    type: string;
    added_by: string;
    added_at: string;
    adder_name: string;
    batch_id?: string;
  }>
) {
  return withActiveUserCheck(meters[0].added_by, async () => {
    const { data, error } = await supabase.from("meters").insert(meters);
    if (error) throw error;
    clearMetersCache(); // Clear cache after successful addition
    return data;
  });
}

export async function signUp(email: string, password: string, role: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        role,
      },
    },
  });
  if (error) throw error;
  return { user: data.user, error: null };
}

export async function signIn(email: string, password: string) {
  try {
    await signOut();

    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (authError) throw authError;

    if (!authData.user) {
      throw new Error("No user data returned");
    }

    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("is_active")
      .eq("id", authData.user.id)
      .single();

    if (profileError) {
      throw new Error("Error fetching user profile");
    }

    if (!profile?.is_active) {
      await signOut();
      throw new Error("ACCOUNT_DEACTIVATED");
    }

    return { user: authData.user, session: authData.session, error: null };
  } catch (error: any) {
    return { user: null, session: null, error };
  }
}

export async function signOut() {
  try {
    // Clear any cached auth state first
    localStorage.removeItem("pos-auth-token");
    sessionStorage.clear();

    // Sign out from supabase
    const { error } = await supabase.auth.signOut();
    if (error) throw error;

    // Clear any remaining supabase storage
    localStorage.removeItem("supabase.auth.token");

    return { error: null };
  } catch (error) {
    console.error("Error during sign out:", error);
    return { error };
  }
}

export async function getCurrentUser() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile, error } = await supabase
    .from("user_profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .single();

  if (error || !profile?.is_active) {
    await signOut();
    return null;
  }

  return { ...user, role: profile.role };
}

export async function createInvitation(
  email: string,
  role: string,
  invitedBy: string
) {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
  const { data, error } = await supabase
    .from("user_invitations")
    .insert({ email, role, invited_by: invitedBy, expires_at: expiresAt });
  if (error) throw error;
  return data;
}

export async function checkInvitation(token: string) {
  const { data, error } = await supabase
    .from("user_invitations")
    .select("*")
    .eq("token", token)
    .eq("is_used", false)
    .gt("expires_at", new Date().toISOString())
    .single();

  if (error) throw error;
  return data;
}

export async function deleteInvitation(email: string) {
  const { error } = await supabase
    .from("user_invitations")
    .delete()
    .eq("email", email);
  if (error) throw error;
}

export async function createUserProfile(userId: string, role: string) {
  const { data, error } = await supabase
    .from("user_profiles")
    .insert({ id: userId, role });
  if (error) throw error;
  return data;
}

function generateToken() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export async function inviteUser(
  email: string,
  role: string,
  invitedBy: string
) {
  const token = generateToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

  // Check if an invitation already exists
  const { data: existingInvitation, error: checkError } = await supabase
    .from("user_invitations")
    .select("*")
    .eq("email", email)
    .single();

  if (checkError && checkError.code !== "PGRST116") {
    // PGRST116 means no rows returned, which is fine
    throw checkError;
  }

  let data;
  if (existingInvitation) {
    // Update existing invitation
    const { data: updatedData, error: updateError } = await supabase
      .from("user_invitations")
      .update({
        role,
        invited_by: invitedBy,
        invited_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        is_used: false,
        token,
      })
      .eq("email", email);

    if (updateError) throw updateError;
    data = updatedData;
  } else {
    // Insert new invitation
    const { data: insertedData, error: insertError } = await supabase
      .from("user_invitations")
      .insert({
        email,
        role,
        invited_by: invitedBy,
        invited_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        is_used: false,
        token,
      });

    if (insertError) throw insertError;
    data = insertedData;
  }

  // Send invitation email using Resend
  const response = await fetch("/api/emails/invite", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      role,
      token,
      signupUrl: `${process.env.NEXT_PUBLIC_APP_URL}/signup?token=${token}`,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error("Failed to send invitation email:", errorData);
    throw new Error(
      `Failed to send invitation email: ${errorData.message || "Unknown error"}`
    );
  }

  return data;
}

export async function markInvitationAsUsed(token: string) {
  const { error } = await supabase
    .from("user_invitations")
    .update({ is_used: true })
    .eq("token", token);

  if (error) throw error;
}

export async function getUserProfile(userId: string) {
  const { data, error } = await supabase
    .from("user_profiles")
    .select("name, role, is_active")
    .eq("id", userId)
    .single();

  if (error) {
    console.error("Error fetching user profile:", error);
    return null;
  }

  return data;
}

export async function getMeterBySerial(serialNumber: string) {
  // Convert the input to uppercase for consistent comparison
  const normalizedSerial = serialNumber.toUpperCase();

  const { data, error } = await supabase
    .from("meters")
    .select("*")
    .eq("serial_number", normalizedSerial) // Use eq for exact matching
    .maybeSingle(); // Use maybeSingle instead of single to handle no results gracefully

  if (error) {
    console.error("Error retrieving meter:", error);
    if (error.code === "PGRST116") {
      // No results found
      return null;
    }
    throw error;
  }

  return data;
}

export async function removeMeter(meterId: string) {
  const { error } = await supabase.from("meters").delete().eq("id", meterId);

  if (error) {
    console.error("Error removing meter:", error);
    throw error;
  }
}

// Update the interface for sold meter data
interface SoldMeterData {
  meter_id: string;
  sold_by: string;
  sold_at: string;
  destination: string;
  recipient: string;
  serial_number: string;
  unit_price: number;
  batch_id: string;
  customer_type: CustomerType;
  customer_county: KenyaCounty;
  customer_contact: string;
}

export async function addSoldMeter(soldMeter: SoldMeterData) {
  return withActiveUserCheck(soldMeter.sold_by, async () => {
    const { data, error } = await supabase
      .from("sold_meters")
      .insert(soldMeter);
    if (error) throw error;
    return data;
  });
}

export async function createUser(
  email: string,
  password: string,
  role: string,
  name: string
) {
  const response = await fetch("/api/create-user", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, role, name }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }

  return await response.json();
}

export async function insertUserProfile(
  userId: string,
  role: string,
  name: string
) {
  const { error } = await supabase.from("user_profiles").insert({
    id: userId,
    role,
    is_active: true,
    name,
  });

  if (error) throw error;
}

export async function getUsersList() {
  const { data: users, error } = await supabase
    .from("user_profiles")
    .select("id, name, role, is_active")
    .order("id", { ascending: true });

  if (error) {
    console.error("Error fetching users:", error);
    return [];
  }

  return users.map((user) => ({
    id: user.id,
    name: user.name || "N/A",
    role: user.role || "user",
    isActive: user.is_active,
  }));
}

// Update the interface for batch data
interface SaleBatchData {
  user_id: string;
  user_name: string;
  meter_type: string;
  batch_amount: number;
  unit_price: number;
  total_price: number;
  destination: string;
  recipient: string;
  customer_type: CustomerType;
  customer_county: KenyaCounty;
  customer_contact: string;
  sale_date?: string;
  transaction_id?: string;
}

export async function addSaleBatch(batchData: SaleBatchData) {
  const { data, error } = await supabase
    .from("sale_batches")
    .insert(batchData)
    .select()
    .single();

  if (error) {
    throw error;
  }

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

export async function getSaleBatches() {
  const { data, error } = await supabase
    .from("sale_batches")
    .select("*")
    .order("sale_date", { ascending: false });

  if (error) {
    console.error("Error fetching sale batches:", error);
    throw error;
  }

  return data;
}

export async function getMeterCount() {
  const { count, error } = await supabase
    .from("meters")
    .select("*", { count: "exact", head: true });

  if (error) {
    console.error("Error fetching meter count:", error);
    return 0;
  }

  return count || 0;
}

export async function getTopSellingUsers() {
  const { data, error } = await supabase
    .from("sale_batches")
    .select("user_name, total_price")
    .order("total_price", { ascending: false })
    .limit(5);

  if (error) {
    console.error("Error fetching top selling users:", error);
    return [];
  }

  return data.map((item) => ({
    user_name: item.user_name,
    total_sales: item.total_price,
  }));
}

export async function getMostSellingProduct() {
  const { data, error } = await supabase
    .from("sale_batches")
    .select("meter_type, batch_amount")
    .order("batch_amount", { ascending: false })
    .limit(1);

  if (error) {
    console.error("Error fetching most selling product:", error);
    return "";
  }

  return data[0]?.meter_type || "";
}

export async function getEarningsByMeterType() {
  const { data, error } = await supabase
    .from("sale_batches")
    .select("meter_type, total_price");

  if (error) {
    console.error("Error fetching earnings by meter type:", error);
    return [];
  }

  const earningsByType: { [key: string]: number } = {};
  data.forEach((item) => {
    if (earningsByType[item.meter_type]) {
      earningsByType[item.meter_type] += item.total_price;
    } else {
      earningsByType[item.meter_type] = item.total_price;
    }
  });

  return Object.entries(earningsByType).map(([meter_type, total_earnings]) => ({
    meter_type,
    total_earnings,
  }));
}

export async function getRemainingMetersByType() {
  try {
    const { data, error } = await supabase.from("meters").select("type");

    if (error) {
      console.error("Error fetching remaining meters by type:", error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    const meterCounts: { [key: string]: number } = {};
    data.forEach((meter) => {
      if (meter.type in meterCounts) {
        meterCounts[meter.type]++;
      } else {
        meterCounts[meter.type] = 1;
      }
    });

    const remainingMeters = Object.entries(meterCounts).map(
      ([type, count]) => ({
        type,
        remaining_meters: count,
      })
    );

    return remainingMeters;
  } catch (error) {
    console.error("Unexpected error in getRemainingMetersByType:", error);
    return [];
  }
}

export async function updateUserProfile(
  userId: string,
  updates: {
    name?: string;
    role?: string;
    is_active?: boolean;
  }
) {
  const { data, error } = await supabase
    .from("user_profiles")
    .update(updates)
    .eq("id", userId)
    .select()
    .single();

  if (error) {
    console.error("Error updating user profile:", error);
    throw error;
  }

  return data;
}

export async function deleteUserProfile(userId: string) {
  const { error: profileError } = await supabase
    .from("user_profiles")
    .delete()
    .eq("id", userId);

  if (profileError) {
    console.error("Error deleting user profile:", profileError);
    throw profileError;
  }

  const response = await fetch("/api/delete-user", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }

  return true;
}

export async function getMetersByBatchId(batchId: number) {
  const { data, error } = await supabase
    .from("sold_meters")
    .select("serial_number")
    .eq("batch_id", batchId);

  if (error) {
    console.error("Error fetching meters by batch ID:", error);
    throw error;
  }

  return data;
}

export async function getAgentsList() {
  const { data: agents, error } = await supabase
    .from("agents")
    .select(
      `
      *,
      agent_inventory(count)
    `
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching agents:", error);
    return [];
  }

  return agents.map((agent) => ({
    id: agent.id,
    name: agent.name,
    phone_number: agent.phone_number,
    location: agent.location,
    county: agent.county,
    is_active: agent.is_active,
    total_meters: agent.agent_inventory?.[0]?.count || 0,
  }));
}

export async function updateAgentStatus(agentId: string, isActive: boolean) {
  const { error } = await supabase
    .from("agents")
    .update({ is_active: isActive })
    .eq("id", agentId);

  if (error) throw error;
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
  // Validate county if it's being updated
  if (updates.county && !KENYA_COUNTIES.includes(updates.county)) {
    throw new Error("Invalid county selected");
  }

  const { error } = await supabase
    .from("agents")
    .update({
      name: updates.name,
      phone_number: updates.phone_number,
      location: updates.location,
      county: updates.county,
    })
    .eq("id", agentId);

  if (error) {
    if (error.code === "23505") {
      throw new Error("Phone number already registered to another agent");
    }
    throw error;
  }
}

export async function createAgent(agentData: {
  name: string;
  phone_number: string;
  location: string;
  county: KenyaCounty;
}) {
  // Validate county
  if (!KENYA_COUNTIES.includes(agentData.county)) {
    throw new Error("Invalid county selected");
  }

  const { data, error } = await supabase
    .from("agents")
    .insert({
      ...agentData,
      is_active: true,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("Phone number already registered");
    }
    throw error;
  }

  return data;
}

// Add this new function
export async function assignMetersToAgent({
  agentId,
  meters,
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
    const { data: meterData, error: meterError } = await supabase
      .from("meters")
      .select("*")
      .in(
        "id",
        meters.map((m) => m.meter_id)
      );

    if (meterError) throw meterError;

    // Verify agent_inventory table structure
    const { data: tableInfo, error: tableError } = await supabase
      .from("agent_inventory")
      .select("*")
      .limit(1);

    // Prepare inventory data for insertion
    const inventoryData = meters.map((meter) => ({
      agent_id: agentId,
      meter_id: meter.meter_id,
      serial_number: meter.serial_number,
      type: meter.type,
      assigned_at: new Date().toISOString(),
    }));

    // Insert meters into agent_inventory
    const { data: insertedInventory, error: inventoryError } = await supabase
      .from("agent_inventory")
      .insert(inventoryData)
      .select();

    if (inventoryError) throw inventoryError;

    // Verify successful insertion
    const { data: verifyData, error: verifyError } = await supabase
      .from("agent_inventory")
      .select("*")
      .eq("agent_id", agentId)
      .in(
        "meter_id",
        meters.map((m) => m.meter_id)
      );

    // Create transaction records
    const { error: transactionError } = await supabase
      .from("agent_transactions")
      .insert(
        meters.map((meter) => ({
          agent_id: agentId,
          transaction_type: "assignment",
          meter_type: meter.type,
          quantity: 1,
          transaction_date: new Date().toISOString(),
        }))
      );

    if (transactionError) throw transactionError;

    // Remove assigned meters from meters table
    const { error: deleteError } = await supabase
      .from("meters")
      .delete()
      .in(
        "id",
        meters.map((m) => m.meter_id)
      );

    if (deleteError) throw deleteError;

    return insertedInventory;
  } catch (error) {
    throw error;
  }
}

export async function getAgentInventory(agentId: string) {
  const { data, error } = await supabase
    .from("agent_inventory")
    .select("*")
    .eq("agent_id", agentId)
    .order("assigned_at", { ascending: false });

  if (error) {
    console.error("Error fetching agent inventory:", error);
    throw error;
  }

  return data;
}

export async function removeFromAgentInventory(meterId: string) {
  // Remove meter from agent's inventory
  const { error } = await supabase
    .from("agent_inventory")
    .delete()
    .eq("id", meterId);

  if (error) throw error;
}

export async function deleteAgent(
  agentId: string,
  currentUser: any,
  scannedMeters: string[] = [],
  unscannedMeters: string[] = []
) {
  try {
    // 1. First, delete all agent transactions
    const { error: transactionError } = await supabase
      .from("agent_transactions")
      .delete()
      .eq("agent_id", agentId);

    if (transactionError) throw transactionError;

    // 2. Get all meters assigned to this agent
    const { data: agentMeters, error: inventoryError } = await supabase
      .from("agent_inventory")
      .select("*")
      .eq("agent_id", agentId);

    if (inventoryError) throw inventoryError;

    if (agentMeters && agentMeters.length > 0) {
      // 3. Handle scanned meters - move them back to meters table
      const metersToRestore = agentMeters
        .filter((meter) => scannedMeters.includes(meter.serial_number))
        .map((meter) => ({
          serial_number: meter.serial_number,
          type: meter.type,
          added_by: currentUser.id,
          added_at: new Date().toISOString(),
          adder_name: currentUser.name || currentUser.email,
        }));

      if (metersToRestore.length > 0) {
        const { error: restoreError } = await supabase
          .from("meters")
          .insert(metersToRestore);

        if (restoreError) throw restoreError;
      }

      // 4. Delete all meters from agent_inventory
      const { error: deleteInventoryError } = await supabase
        .from("agent_inventory")
        .delete()
        .eq("agent_id", agentId);

      if (deleteInventoryError) throw deleteInventoryError;
    }

    // 5. Finally delete the agent
    const { error: deleteAgentError } = await supabase
      .from("agents")
      .delete()
      .eq("id", agentId);

    if (deleteAgentError) throw deleteAgentError;

    return {
      restoredCount: scannedMeters.length,
      deletedCount: unscannedMeters.length,
    };
  } catch (error) {
    console.error("Error in deleteAgent:", error);
    throw error;
  }
}

export async function superSearchMeter(searchTerm: string) {
  if (!searchTerm || searchTerm.length < 0) return [];

  // Run all queries in parallel using Promise.all
  const [
    { data: results, error },
    { data: agentMeters },
    { data: soldMeters },
    { data: faultyMeters },
  ] = await Promise.all([
    // Get meters in stock
    supabase
      .from("meters")
      .select("serial_number, type")
      .ilike("serial_number", `%${searchTerm}%`)
      .limit(5),

    // Get meters with agents
    supabase
      .from("agent_inventory")
      .select(
        `
        serial_number,
        type,
        agents (
          id,
          name,
          location
        )
      `
      )
      .ilike("serial_number", `%${searchTerm}%`)
      .limit(5),

    // Get sold meters with replacements
    supabase
      .from("sold_meters")
      .select(
        `
        id,
        serial_number,
        sold_at,
        sold_by,
        destination,
        recipient,
        unit_price,
        batch_id,
        replacement_serial,
        replacement_date,
        replacement_by,
        customer_contact
      `
      )
      .ilike("serial_number", `%${searchTerm}%`)
      .limit(5),

    // Get faulty meters
    supabase
      .from("faulty_returns")
      .select(
        `
        id,
        serial_number,
        type,
        returned_by,
        returned_at,
        returner_name,
        fault_description,
        status,
        original_sale_id
      `
      )
      .ilike("serial_number", `%${searchTerm}%`)
      .limit(5),
  ]);

  if (error) throw error;

  // Get user profiles for sold meters in parallel with data transformation
  const userProfilesPromise = soldMeters?.length
    ? supabase
        .from("user_profiles")
        .select("id, name")
        .in("id", [...new Set(soldMeters.map((m) => m.sold_by))])
    : Promise.resolve({ data: [] });

  // Start transforming the data while waiting for user profiles
  const transformedResults = [
    ...(results?.map((meter) => ({
      serial_number: meter.serial_number,
      type: meter.type,
      status: "in_stock",
    })) || []),
    ...(agentMeters?.map((meter) => ({
      serial_number: meter.serial_number,
      type: meter.type,
      status: "with_agent",
      agent: meter.agents,
    })) || []),
  ];

  // Wait for user profiles and complete the transformation
  const { data: userProfiles } = await userProfilesPromise;

  const userMap = (userProfiles || []).reduce(
    (acc, user) => {
      acc[user.id] = user.name;
      return acc;
    },
    {} as { [key: string]: string }
  );

  return [
    ...transformedResults,
    ...(soldMeters?.map((meter) => ({
      serial_number: meter.serial_number,
      status: meter.replacement_serial ? "replaced" : "sold",
      sale_details: {
        sold_at: meter.sold_at,
        sold_by: userMap[meter.sold_by] || meter.sold_by,
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
            replacement_by: meter.replacement_by,
          }
        : null,
    })) || []),
    ...(faultyMeters?.map((meter) => ({
      serial_number: meter.serial_number,
      type: meter.type,
      status: "faulty",
      fault_details: {
        returned_at: meter.returned_at,
        returner_name: meter.returner_name,
        fault_description: meter.fault_description,
        fault_status: meter.status,
      },
    })) || []),
  ];
}

// Create a new notification
export async function createNotification({
  type,
  message,
  metadata,
  createdBy,
}: {
  type: string;
  message: string;
  metadata?: any;
  createdBy: string;
}) {
  const { data, error } = await supabase
    .from("notifications")
    .insert({
      type,
      message,
      metadata,
      created_by: createdBy,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating notification:", error);
    throw error;
  }

  return data;
}

// Fetch notifications for a user
export async function getNotifications(
  userId: string,
  limit: number = 5,
  lastId?: string | null
) {
  let query = supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (lastId) {
    query = query.lt("id", lastId); // Get notifications with ID less than lastId
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

// Mark a notification as read
export async function markNotificationAsRead(
  notificationId: string,
  userId: string
) {
  // First get the current notification
  const { data: notification } = await supabase
    .from("notifications")
    .select("read_by")
    .eq("id", notificationId)
    .single();

  // Create new read_by array with the userId
  const readBy = Array.isArray(notification?.read_by)
    ? notification.read_by
    : [];
  if (!readBy.includes(userId)) {
    readBy.push(userId);
  }

  // Update the notification
  const { error } = await supabase
    .from("notifications")
    .update({
      read_by: readBy,
      // Only mark as globally read if all users have read it
      is_read: false,
    })
    .eq("id", notificationId);

  if (error) {
    console.error("Error marking notification as read:", error);
    throw error;
  }
}

// Mark all notifications as read
export async function markAllNotificationsAsRead(userId: string) {
  try {
    // Get all unread notifications for this user
    const { data: notifications, error: fetchError } = await supabase
      .from("notifications")
      .select("id, read_by")
      .not("read_by", "cs", `{${userId}}`); // Get notifications where user hasn't read

    if (fetchError) throw fetchError;
    if (!notifications || notifications.length === 0) return;

    // Update each notification
    const updates = notifications.map((notification) => {
      const readBy = notification.read_by || [];

      // Update the is_read flag based on whether this is the last user to read
      const updatedReadBy = [...new Set([...readBy, userId])];

      return supabase
        .from("notifications")
        .update({
          read_by: updatedReadBy,
          is_read: true,
        })
        .eq("id", notification.id);
    });

    await Promise.all(updates);

    return { success: true };
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    throw error;
  }
}

// Subscribe to new notifications
export function subscribeToNotifications(
  callback: (notification: any) => void
) {
  return supabase
    .channel("notifications")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
      },
      (payload) => {
        callback(payload.new);
      }
    )
    .subscribe();
}

export async function checkMultipleSerialNumbers(
  serialNumbers: string[]
): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from("meters")
      .select("serial_number")
      .in("serial_number", serialNumbers);

    if (error) {
      console.error("Error checking serial numbers:", error);
      throw error;
    }

    // Return array of existing serial numbers
    return data ? data.map((meter) => meter.serial_number) : [];
  } catch (error) {
    console.error("Error checking serial numbers:", error);
    throw error;
  }
}

// Add this new function after getRemainingMetersByType
export async function getAgentInventoryCount() {
  try {
    const { data, error } = await supabase
      .from("agent_inventory")
      .select("type");

    if (error) {
      console.error("Error fetching agent inventory count:", error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    const meterCounts: { [key: string]: number } = {};
    data.forEach((meter) => {
      if (meter.type in meterCounts) {
        meterCounts[meter.type]++;
      } else {
        meterCounts[meter.type] = 1;
      }
    });

    const agentInventory = Object.entries(meterCounts).map(([type, count]) => ({
      type,
      with_agents: count,
    }));

    return agentInventory;
  } catch (error) {
    console.error("Unexpected error in getAgentInventoryCount:", error);
    return [];
  }
}

export async function getCustomerTypeCounts() {
  try {
    const { data, error } = await supabase
      .from("sale_batches")
      .select("customer_type")
      .not("customer_type", "is", null);

    if (error) throw error;

    // Count occurrences of each customer type
    const typeCounts: { [key: string]: number } = {};
    data.forEach((item) => {
      const type = item.customer_type;
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });

    // Transform to required format
    return Object.entries(typeCounts).map(([type, count]) => ({
      type,
      count,
    }));
  } catch (error) {
    console.error("Error fetching customer type counts:", error);
    return [];
  }
}

export async function getAgentInventoryBySerial(
  serialNumber: string,
  agentId: string
) {
  // Convert the input to uppercase for consistent comparison
  const normalizedSerial = serialNumber.toUpperCase();

  const { data, error } = await supabase
    .from("agent_inventory")
    .select("*")
    .eq("agent_id", agentId)
    .eq("serial_number", normalizedSerial) // Use eq for exact matching
    .maybeSingle(); // Use maybeSingle instead of single to handle no results gracefully

  if (error) {
    console.error("Error retrieving meter from agent inventory:", error);
    throw error;
  }

  return data;
}

export async function returnMetersFromAgent({
  agentId,
  meters,
  returnedBy,
  returnerName,
}: {
  agentId: string;
  meters: Array<{ meter_id: string; serial_number: string; type: string }>;
  returnedBy: string;
  returnerName: string;
}) {
  try {
    // 1. Move meters back to meters table
    const metersToRestore = meters.map((meter) => ({
      serial_number: meter.serial_number,
      type: meter.type,
      added_by: returnedBy,
      added_at: new Date().toISOString(),
      adder_name: returnerName,
    }));

    const { error: restoreError } = await supabase
      .from("meters")
      .insert(metersToRestore);

    if (restoreError) {
      console.error("Error restoring meters:", restoreError);
      throw restoreError;
    }

    // 2. Remove meters from agent_inventory
    const { error: removeError } = await supabase
      .from("agent_inventory")
      .delete()
      .eq("agent_id", agentId)
      .in(
        "serial_number",
        meters.map((m) => m.serial_number)
      );

    if (removeError) {
      console.error("Error removing from agent inventory:", removeError);
      throw removeError;
    }

    // 3. Create transaction records - update to match your schema
    const { error: transactionRecordError } = await supabase
      .from("agent_transactions")
      .insert(
        meters.map((meter) => ({
          agent_id: agentId,
          transaction_type: "return",
          meter_type: meter.type,
          quantity: 1,
          transaction_date: new Date().toISOString(),
        }))
      );

    if (transactionRecordError) {
      console.error(
        "Error creating transaction records:",
        transactionRecordError
      );
      throw transactionRecordError;
    }

    // If all operations succeed, return success
    return { success: true };
  } catch (error) {
    console.error("Error returning meters:", error);
    throw error;
  }
}

export async function getSoldMeterBySerial(serialNumber: string) {
  const normalizedSerial = serialNumber.toUpperCase();

  // First get the meter with its sale batch details
  const { data: soldMeter, error: soldMeterError } = await supabase
    .from("sold_meters")
    .select(
      `
      id,
      serial_number,
      sold_at,
      batch_id,
      status,
      sale_batches (
        meter_type
      )
    `
    )
    .eq("serial_number", normalizedSerial)
    .single();

  if (soldMeterError) {
    if (soldMeterError.code === "PGRST116") {
      throw new Error(`Meter ${normalizedSerial} not found in sold meters`);
    }
    throw soldMeterError;
  }

  if (!soldMeter) {
    throw new Error(`Meter ${normalizedSerial} not found in sold meters`);
  }

  // Check meter status
  if (soldMeter.status !== "active") {
    throw new Error(
      `Meter ${normalizedSerial} is already marked as ${soldMeter.status}`
    );
  }

  // Get the meter type from the sale batch
  const { data: saleBatch, error: saleBatchError } = await supabase
    .from("sale_batches")
    .select("meter_type")
    .eq("id", soldMeter.batch_id)
    .single();

  if (saleBatchError) {
    throw new Error(`Failed to retrieve meter type for ${normalizedSerial}`);
  }

  // Return combined data
  return {
    id: soldMeter.id,
    serial_number: soldMeter.serial_number,
    sold_at: soldMeter.sold_at,
    type: saleBatch.meter_type,
    status: soldMeter.status,
  };
}

export async function returnSoldMeter({
  meters,
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
    // Separate healthy and faulty meters
    const healthyMeters = meters.filter((m) => m.status === "healthy");
    const faultyMeters = meters.filter((m) => m.status === "faulty");

    // Handle healthy meters
    if (healthyMeters.length > 0) {
      // 1. First add to meters table
      const metersToRestore = healthyMeters.map((meter) => ({
        serial_number: meter.serial_number,
        type: meter.type,
        added_by: returnedBy,
        added_at: new Date().toISOString(),
        adder_name: returnerName,
      }));

      const { error: restoreError } = await supabase
        .from("meters")
        .insert(metersToRestore);

      if (restoreError) throw restoreError;

      // 2. Then delete from sold_meters (since they're healthy and back in stock)
      const { error: deleteError } = await supabase
        .from("sold_meters")
        .delete()
        .in(
          "id",
          healthyMeters.map((m) => m.id)
        );

      if (deleteError) throw deleteError;
    }

    // Handle faulty meters
    if (faultyMeters.length > 0) {
      for (const meter of faultyMeters) {
        // 1. Create faulty return record
        const { error: faultyError } = await supabase
          .from("faulty_returns")
          .insert({
            serial_number: meter.serial_number,
            type: meter.type,
            returned_by: returnedBy,
            returner_name: returnerName,
            original_sale_id: meter.id,
            fault_description: meter.fault_description,
            status: "pending",
          });
        if (faultyError) throw faultyError;

        // Check if a replacement is provided for this meter
        const replacement = replacements.find(
          (r) => r.original_id === meter.id
        );

        if (replacement) {
          // Remove replacement meter from meters table
          const { error: removeError } = await supabase
            .from("meters")
            .delete()
            .eq("serial_number", replacement.new_serial);
          if (removeError) throw removeError;

          // Update sold_meters record with replacement info in one update
          const { error: updateError } = await supabase
            .from("sold_meters")
            .update({
              status: "replaced",
              replacement_serial: replacement.new_serial,
              replacement_date: new Date().toISOString(),
              replacement_by: returnedBy,
            })
            .eq("id", meter.id);
          if (updateError) throw updateError;
        } else {
          // Update sold_meters record to mark as faulty
          const { error: updateError } = await supabase
            .from("sold_meters")
            .update({ status: "faulty" })
            .eq("id", meter.id);
          if (updateError) throw updateError;
        }
      }
    }

    return { success: true };
  } catch (error) {
    console.error("Error returning sold meters:", error);
    throw error;
  }
}

// Add function to get available meters for replacement
export async function getAvailableReplacementMeters(type: string) {
  const { data, error } = await supabase
    .from("meters")
    .select("serial_number, type")
    .eq("type", type);

  if (error) throw error;
  return data;
}

// Add these functions after the existing ones

// Function to add a meter purchase batch
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
    // Create a batch record for each meter type
    const batchPromises = batchGroups.map(async (group) => {
      const { data, error } = await supabase
        .from("meter_purchase_batches")
        .insert({
          meter_type: group.type.toLowerCase(),
          quantity: group.count,
          total_cost: parseFloat(group.totalCost),
          purchase_date: purchaseDate.toISOString(),
          added_by: addedBy,
          created_at: new Date().toISOString(),
          batch_number: `PB-${Date.now()}-${group.type
            .substring(0, 3)
            .toUpperCase()}`,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    });

    const batches = await Promise.all(batchPromises);
    return batches[0]; // Return the first batch for reference
  } catch (error) {
    console.error("Error adding meter purchase batch:", error);
    throw error;
  }
}

// Function to get purchase batches
export async function getPurchaseBatches() {
  try {
    // Get batches with their meter counts using the exact SQL approach
    const { data: batchesWithCounts, error: batchError } = await supabase
      .from("meter_purchase_batches")
      .select(
        `
        *,
        meters!left (
          id
        )
      `
      )
      .order("created_at", { ascending: false });

    if (batchError) {
      throw new Error(`Error fetching purchase batches: ${batchError.message}`);
    }

    if (!batchesWithCounts) return [];

    // Get user profiles
    const userIds = [
      ...new Set(batchesWithCounts.map((batch) => batch.added_by)),
    ];
    const { data: userProfiles, error: userError } = await supabase
      .from("user_profiles")
      .select("id, name")
      .in("id", userIds);

    if (userError) {
      throw new Error(`Error fetching user profiles: ${userError.message}`);
    }

    // Create user map
    const userMap = (userProfiles || []).reduce(
      (acc, user) => {
        acc[user.id] = user.name;
        return acc;
      },
      {} as { [key: string]: string }
    );

    // Transform the data to match our needs
    return batchesWithCounts.map((batch) => ({
      ...batch,
      remaining_meters: batch.meters?.length || 0,
      user_profiles: {
        name: userMap[batch.added_by] || null,
      },
    }));
  } catch (error) {
    console.error("Error fetching purchase batches:", error);
    throw error;
  }
}

// Function to update meters with their purchase batch ID
export async function updateMeterPurchaseBatch(
  serialNumbers: string[],
  batchId: string
) {
  try {
    const { error } = await supabase
      .from("meters")
      .update({ batch_id: batchId })
      .in("serial_number", serialNumbers);

    if (error) throw error;
  } catch (error) {
    console.error("Error updating meter batch IDs:", error);
    throw error;
  }
}

// Toggle push notifications for a user
export async function togglePushNotifications(
  userId: string,
  enabled: boolean
) {
  try {
    const { data, error } = await supabase
      .from("user_profiles")
      .update({ push_enabled: enabled })
      .eq("id", userId)
      .select()
      .single();

    if (error) throw error;

    // Return the actual status from the database
    return data?.push_enabled === true;
  } catch (error) {
    console.error("Error toggling push notifications:", error);
    throw error;
  }
}

// Get user's push notification status
export async function getPushNotificationStatus(userId: string) {
  try {
    const { data, error } = await supabase
      .from("user_profiles")
      .select("push_enabled")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Error getting push notification status:", error);
      return false;
    }

    // Explicitly return boolean
    return data?.push_enabled === true;
  } catch (error) {
    console.error("Error getting push notification status:", error);
    return false;
  }
}

// Function to get faulty meters
export async function getFaultyMeters() {
  try {
    const { data, error } = await supabase
      .from("faulty_returns")
      .select(
        `
        id,
        serial_number,
        type,
        returned_by,
        returned_at,
        returner_name,
        fault_description,
        status,
        original_sale_id
      `
      )
      .order("returned_at", { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error fetching faulty meters:", error);
    throw error;
  }
}

// Function to get meter replacements
export async function getMeterReplacements() {
  try {
    // First get the replacements data
    const { data: replacementsData, error: replacementsError } = await supabase
      .from("sold_meters")
      .select(
        `
        id,
        serial_number,
        recipient,
        customer_contact,
        replacement_serial,
        replacement_date,
        replacement_by
      `
      )
      .not("replacement_serial", "is", null)
      .order("replacement_date", { ascending: false });

    if (replacementsError) throw replacementsError;

    if (!replacementsData) return [];

    // Get unique user IDs
    const userIds = [...new Set(replacementsData.map((r) => r.replacement_by))];

    // Fetch user profiles for these IDs
    const { data: userProfiles, error: userError } = await supabase
      .from("user_profiles")
      .select("id, name")
      .in("id", userIds);

    if (userError) {
      throw new Error(`Error fetching user profiles: ${userError.message}`);
    }

    // Create a map of user IDs to names
    const userMap = (userProfiles || []).reduce(
      (acc, user) => {
        acc[user.id] = user.name;
        return acc;
      },
      {} as { [key: string]: string }
    );

    // Map the data with user names
    return replacementsData.map((replacement) => ({
      id: replacement.id,
      serial_number: replacement.serial_number,
      recipient: replacement.recipient,
      customer_contact: replacement.customer_contact,
      replacement_serial: replacement.replacement_serial,
      replacement_date: replacement.replacement_date,
      replacement_by:
        userMap[replacement.replacement_by] || replacement.replacement_by,
    }));
  } catch (error) {
    console.error("Error fetching meter replacements:", error);
    throw error;
  }
}

// Function to update faulty meter status
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
      const { error: restoreError } = await supabase.from("meters").insert({
        serial_number: meter.serial_number,
        type: meter.type,
        added_by: updatedBy,
        added_at: new Date().toISOString(),
        adder_name: updaterName,
      });

      if (restoreError) throw restoreError;

      // 2. Delete from faulty_returns
      const { error: deleteError } = await supabase
        .from("faulty_returns")
        .delete()
        .eq("id", meter.id);

      if (deleteError) throw deleteError;

      return { message: "Meter restored to inventory" };
    } else {
      // Just update the status for pending or unrepairable
      const { error: updateError } = await supabase
        .from("faulty_returns")
        .update({ status: meter.status })
        .eq("id", meter.id);

      if (updateError) throw updateError;

      return { message: `Meter marked as ${meter.status}` };
    }
  } catch (error) {
    console.error("Error updating faulty meter status:", error);
    throw error;
  }
}

export async function changePassword(userId: string, newPassword: string) {
  try {
    // First check if password meets requirements
    if (newPassword.length < 6) {
      throw new Error("Password must be at least 6 characters long");
    }

    // Use updateUser for self password change instead of admin API
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) throw error;

    // Force sign out after password change
    await signOut();

    return { success: true };
  } catch (error: any) {
    console.error("Error changing password:", error);
    throw new Error(error.message || "Failed to change password");
  }
}

// Add this new function
export async function getUnreadNotificationsCount(userId: string) {
  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .not("read_by", "cs", `{${userId}}`); // Get count of notifications where user hasn't read

  if (error) {
    console.error("Error getting unread notifications count:", error);
    return 0;
  }

  return count || 0;
}

export async function checkMeterExistsInSoldMeters(
  serialNumber: string
): Promise<boolean> {
  try {
    const normalizedSerial = serialNumber.replace(/^0+/, "").toUpperCase();

    const { data, error } = await supabase
      .from("sold_meters")
      .select("serial_number")
      .eq("serial_number", normalizedSerial);

    if (error) throw error;
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

    const { data, error } = await supabase
      .from("agent_inventory")
      .select("serial_number")
      .eq("serial_number", normalizedSerial);

    if (error) throw error;
    return data && data.length > 0;
  } catch (error) {
    console.error("Error checking meter in agent_inventory:", error);
    throw error;
  }
}

// Add new time-based query functions
export async function getSalesByDateRange(startDate: Date, endDate: Date) {
  try {
    const { data, error } = await supabase
      .from("sale_batches")
      .select("*")
      .gte("sale_date", startDate.toISOString())
      .lte("sale_date", endDate.toISOString())
      .order("sale_date", { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching sales by date range:", error);
    throw error;
  }
}

export async function getSalesThisWeek() {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setHours(0, 0, 0, 0);
  startOfWeek.setDate(now.getDate() - now.getDay()); // Start from Sunday

  return getSalesByDateRange(startOfWeek, now);
}

export async function getSalesThisMonth() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  return getSalesByDateRange(startOfMonth, now);
}

export async function getSalesLastXDays(days: number) {
  const now = new Date();
  const startDate = new Date(now);
  startDate.setDate(now.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  return getSalesByDateRange(startDate, now);
}

// Add helper function to aggregate sales data
export interface AggregatedSales {
  totalTransactions: number;
  totalMeters: number;
  totalRevenue: number;
  averagePrice: number;
  byType: {
    [key: string]: {
      count: number;
      revenue: number;
    };
  };
}

export function aggregateSalesData(sales: any[]): AggregatedSales {
  const aggregated = sales.reduce(
    (acc, sale) => {
      // Update totals
      acc.totalTransactions++;
      acc.totalMeters += sale.batch_amount;
      acc.totalRevenue += sale.total_price;

      // Update by type
      if (!acc.byType[sale.meter_type]) {
        acc.byType[sale.meter_type] = { count: 0, revenue: 0 };
      }
      acc.byType[sale.meter_type].count += sale.batch_amount;
      acc.byType[sale.meter_type].revenue += sale.total_price;

      return acc;
    },
    {
      totalTransactions: 0,
      totalMeters: 0,
      totalRevenue: 0,
      averagePrice: 0,
      byType: {},
    } as AggregatedSales
  );

  // Calculate average price
  aggregated.averagePrice =
    aggregated.totalMeters > 0
      ? aggregated.totalRevenue / aggregated.totalMeters
      : 0;

  return aggregated;
}

export interface MeterWithStatus {
  serial_number: string;
  type: string;
  status: "in_stock" | "with_agent" | "sold" | "faulty" | "replaced";
  agent_details?: {
    agent_id: string;
    agent_name: string;
    agent_phone: string;
    assigned_at: string;
    agent_location: string;
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
  fault_details?: {
    returned_at: string;
    returner_name: string;
    fault_description: string;
    fault_status: string;
  };
  replacement_details?: {
    replacement_serial: string;
    replacement_date: string;
    replacement_by: string;
  };
}

interface StockMeter {
  id: string;
  serial_number: string;
  type: string;
}

interface AgentMeter {
  id: string;
  serial_number: string;
  type: string;
  agent_id: string;
  assigned_at: string;
  agents: {
    id: string;
    name: string;
    location: string;
    phone_number: string;
  };
}

interface SoldMeter {
  id: string;
  serial_number: string;
  type?: string;
  sold_at: string;
  sold_by: string;
  destination: string;
  recipient: string;
  unit_price: number;
  batch_id: string;
  replacement_serial?: string;
  replacement_date?: string;
  replacement_by?: string;
  customer_contact: string;
  status: string;
}

interface FaultyMeter {
  id: string;
  serial_number: string;
  type: string;
  returned_by: string;
  returned_at: string;
  returner_name: string;
  fault_description: string;
  status: string;
  original_sale_id: string;
}

export async function getAllMetersWithStatus(
  page: number = 1,
  pageSize: number = 20,
  filterStatus?: string,
  filterType?: string,
  searchTerm?: string
): Promise<{ meters: MeterWithStatus[]; totalCount: number }> {
  try {
    // Calculate offset based on page and pageSize
    const offset = (page - 1) * pageSize;

    // Prepare queries for each meter status

    let stockMetersQuery = supabase
      .from("meters")
      .select("id, serial_number, type", { count: "exact" });

    let agentMetersQuery = supabase.from("agent_inventory").select(
      `
        id, serial_number, type, agent_id, assigned_at,
        agents (
          id,
          name,
          phone_number,
          location
        )
      `,
      { count: "exact" }
    );

    let soldMetersQuery = supabase.from("sold_meters").select(
      `
        id,
        serial_number,
        sold_at,
        sold_by,
        destination,
        recipient,
        unit_price,
        batch_id,
        replacement_serial,
        replacement_date,
        replacement_by,
        customer_contact,
        status
      `,
      { count: "exact" }
    );

    let faultyMetersQuery = supabase.from("faulty_returns").select(
      `
        id,
        serial_number,
        type,
        returned_by,
        returned_at,
        returner_name,
        fault_description,
        status,
        original_sale_id
      `,
      { count: "exact" }
    );

    // Apply filters if provided
    if (searchTerm) {
      const searchPattern = `%${searchTerm}%`;
      stockMetersQuery = stockMetersQuery.ilike("serial_number", searchPattern);
      agentMetersQuery = agentMetersQuery.ilike("serial_number", searchPattern);
      soldMetersQuery = soldMetersQuery.ilike("serial_number", searchPattern);
      faultyMetersQuery = faultyMetersQuery.ilike(
        "serial_number",
        searchPattern
      );
    }

    if (filterType) {
      stockMetersQuery = stockMetersQuery.eq("type", filterType);
      agentMetersQuery = agentMetersQuery.eq("type", filterType);
      faultyMetersQuery = faultyMetersQuery.eq("type", filterType);

      // First get batch IDs for the specified meter type
      const { data: batchIds, error: batchError } = await supabase
        .from("sale_batches")
        .select("id")
        .eq("meter_type", filterType);

      if (batchError) {
        console.error("Error fetching batch IDs:", batchError);
      }

      if (batchIds && batchIds.length > 0) {
        const batchIdArray = batchIds.map((b) => b.id);
        soldMetersQuery = soldMetersQuery.in("batch_id", batchIdArray);
      } else {
        soldMetersQuery = soldMetersQuery.eq(
          "batch_id",
          "no_results_placeholder"
        );
      }
    }

    // Execute only the queries needed based on filterStatus
    const queries = [];
    const queryTypes = []; // Track query types to match with results

    if (!filterStatus || filterStatus === "in_stock") {
      queries.push(stockMetersQuery.range(offset, offset + pageSize - 1));
      queryTypes.push("stock");
    }

    if (!filterStatus || filterStatus === "with_agent") {
      queries.push(agentMetersQuery.range(offset, offset + pageSize - 1));
      queryTypes.push("agent");
    }

    if (!filterStatus || filterStatus === "sold") {
      queries.push(
        soldMetersQuery
          .eq("status", "active")
          .order("sold_at", { ascending: false })
          .range(offset, offset + pageSize - 1)
      );
      queryTypes.push("sold");
    }

    if (!filterStatus || filterStatus === "replaced") {
      queries.push(
        soldMetersQuery
          .eq("status", "replaced")
          .order("sold_at", { ascending: false })
          .range(offset, offset + pageSize - 1)
      );
      queryTypes.push("replaced");
    }

    if (!filterStatus || filterStatus === "faulty") {
      queries.push(faultyMetersQuery.range(offset, offset + pageSize - 1));
      queryTypes.push("faulty_returns");

      queries.push(
        soldMetersQuery
          .eq("status", "faulty")
          .order("sold_at", { ascending: false })
          .range(offset, offset + pageSize - 1)
      );
      queryTypes.push("faulty_sold");
    }

    // Execute all queries in parallel
    const results = await Promise.all(queries);

    // Process results
    let allMeters: MeterWithStatus[] = [];
    let totalCount = 0;
    let resultIndex = 0;

    // Helper function to get user profiles
    const getUserProfiles = async (userIds: string[]) => {
      const { data: userProfiles, error: userError } = await supabase
        .from("user_profiles")
        .select("id, name")
        .in("id", userIds);

      if (userError) {
        console.error("Error fetching user profiles:", userError);
        return {};
      }

      return (userProfiles || []).reduce(
        (acc, user) => {
          acc[user.id] = user.name;
          return acc;
        },
        {} as { [key: string]: string }
      );
    };

    // Helper function to get batch data
    const getBatchData = async (batchIds: string[]) => {
      const { data: batchData, error: batchError } = await supabase
        .from("sale_batches")
        .select("id, meter_type")
        .in("id", batchIds);

      if (batchError) {
        console.error("Error fetching batch data:", batchError);
        return {};
      }

      return (batchData || []).reduce(
        (acc, batch) => {
          acc[batch.id] = batch.meter_type;
          return acc;
        },
        {} as { [key: string]: string }
      );
    };

    // Process each result based on query type
    for (let i = 0; i < results.length; i++) {
      const queryType = queryTypes[i];
      const { data, count, error } = results[i] || {};

      if (error) {
        console.error(`Error in ${queryType} query:`, error);
        continue;
      }

      if (!data || data.length === 0) {
        continue;
      }

      switch (queryType) {
        case "stock":
          allMeters = [
            ...allMeters,
            ...(data as StockMeter[]).map((meter) => ({
              serial_number: meter.serial_number,
              type: meter.type,
              status: "in_stock" as const,
            })),
          ];
          totalCount += count || 0;
          break;

        case "agent":
          allMeters = [
            ...allMeters,
            ...(data as AgentMeter[]).map((meter) => {
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
            }),
          ];
          totalCount += count || 0;
          break;

        case "sold":
          {
            const soldMeters = data as SoldMeter[];
            const userIds = [...new Set(soldMeters.map((m) => m.sold_by))];
            const userMap = await getUserProfiles(userIds);

            const batchIds = [...new Set(soldMeters.map((m) => m.batch_id))];
            const batchTypeMap = await getBatchData(batchIds);

            const processedSoldMeters = soldMeters.map((meter) => {
              const meterType = batchTypeMap[meter.batch_id] || "unknown";
              return {
                serial_number: meter.serial_number,
                type: meterType,
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
            totalCount += count || 0;
          }
          break;

        case "replaced":
          {
            const replacedMeters = data as SoldMeter[];

            // Get unique user IDs for both sold_by and replacement_by
            const userIds = [
              ...new Set([
                ...replacedMeters.map((m) => m.sold_by),
                ...replacedMeters
                  .filter((m) => m.replacement_by)
                  .map((m) => m.replacement_by as string),
              ]),
            ];

            const userMap = await getUserProfiles(userIds);

            const batchIds = [
              ...new Set(replacedMeters.map((m) => m.batch_id)),
            ];
            const batchTypeMap = await getBatchData(batchIds);

            const processedReplacedMeters = replacedMeters.map((meter) => {
              const meterType = batchTypeMap[meter.batch_id] || "unknown";
              return {
                serial_number: meter.serial_number,
                type: meterType,
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
                  replacement_by: meter.replacement_by
                    ? userMap[meter.replacement_by] || meter.replacement_by
                    : "Unknown",
                },
              };
            });

            allMeters = [...allMeters, ...processedReplacedMeters];
            totalCount += count || 0;
          }
          break;

        case "faulty_returns":
          {
            const faultyMeters = data as FaultyMeter[];

            const processedFaultyMeters = faultyMeters.map((meter) => ({
              serial_number: meter.serial_number,
              type: meter.type,
              status: "faulty" as const,
              fault_details: {
                returned_at: meter.returned_at,
                returner_name: meter.returner_name,
                fault_description: meter.fault_description,
                fault_status: meter.status,
              },
            }));

            allMeters = [...allMeters, ...processedFaultyMeters];
            totalCount += count || 0;
          }
          break;

        case "faulty_sold":
          {
            const faultySoldMeters = data as SoldMeter[];

            if (faultySoldMeters.length > 0) {
              const userIds = [
                ...new Set(faultySoldMeters.map((m) => m.sold_by)),
              ];
              const userMap = await getUserProfiles(userIds);

              const batchIds = [
                ...new Set(faultySoldMeters.map((m) => m.batch_id)),
              ];
              const batchTypeMap = await getBatchData(batchIds);

              const processedFaultySoldMeters = faultySoldMeters.map(
                (meter) => {
                  const meterType = batchTypeMap[meter.batch_id] || "unknown";
                  return {
                    serial_number: meter.serial_number,
                    type: meterType,
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
                }
              );

              allMeters = [...allMeters, ...processedFaultySoldMeters];
              totalCount += count || 0;
            }
          }
          break;
      }
    }

    // Sort by serial number
    allMeters.sort((a, b) => a.serial_number.localeCompare(b.serial_number));

    // Return paginated results
    return {
      meters: allMeters.slice(0, pageSize),
      totalCount,
    };
  } catch (error) {
    console.error("Error fetching all meters with status:", error);
    throw error;
  }
}
