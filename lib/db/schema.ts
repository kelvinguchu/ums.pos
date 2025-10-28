import {
  pgTable,
  text,
  integer,
  numeric,
  timestamp,
  boolean,
  jsonb,
  pgEnum,
  uuid,
} from "drizzle-orm/pg-core";

// Enums
export const userRoleEnum = pgEnum("user_role", [
  "admin",
  "accountant",
  "user",
]);
export const notificationTypeEnum = pgEnum("notification_type", [
  "METER_SALE",
  "AGENT_ASSIGNMENT",
  "METER_RETURN",
  "FAULTY_METER",
  "SYSTEM_UPDATE",
]);
export const transactionTypeEnum = pgEnum("transaction_type", [
  "assignment",
  "return",
]);
export const meterStatusEnum = pgEnum("meter_status", [
  "active",
  "replaced",
  "faulty",
]);
export const faultyMeterStatusEnum = pgEnum("faulty_meter_status", [
  "pending",
  "repaired",
  "unrepairable",
]);

// User Profiles Table
export const userProfiles = pgTable("user_profiles", {
  id: uuid("id").primaryKey(),
  name: text("name"),
  role: userRoleEnum("role").default("user"),
  is_active: boolean("is_active").default(true),
  push_enabled: boolean("push_enabled").default(false),
});

// Meters Table
export const meters = pgTable("meters", {
  id: uuid("id").defaultRandom().primaryKey(),
  serial_number: text("serial_number").notNull().unique(),
  type: text("type").notNull(),
  added_by: uuid("added_by").notNull(),
  added_at: timestamp("added_at").defaultNow(),
  adder_name: text("adder_name").notNull(),
  batch_id: uuid("batch_id").references(() => meterPurchaseBatches.id),
});

// Agents Table
export const agents = pgTable("agents", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  phone_number: text("phone_number").notNull().unique(),
  location: text("location").notNull(),
  county: text("county").notNull(),
  is_active: boolean("is_active").default(true),
  created_at: timestamp("created_at").defaultNow(),
});

// Agent Inventory Table
export const agentInventory = pgTable("agent_inventory", {
  id: uuid("id").defaultRandom().primaryKey(),
  agent_id: uuid("agent_id")
    .notNull()
    .references(() => agents.id, { onDelete: "cascade" }),
  meter_id: uuid("meter_id").notNull(),
  serial_number: text("serial_number").notNull(),
  type: text("type").notNull(),
  assigned_at: timestamp("assigned_at").defaultNow(),
});

// Agent Transactions Table
export const agentTransactions = pgTable("agent_transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  agent_id: uuid("agent_id").references(() => agents.id, {
    onDelete: "cascade",
  }),
  transaction_type: transactionTypeEnum("transaction_type").notNull(),
  meter_type: text("meter_type").notNull(),
  quantity: integer("quantity").default(1),
  transaction_date: timestamp("transaction_date").defaultNow(),
});

// Sale Batches Table
export const saleBatches = pgTable("sale_batches", {
  id: uuid("id").defaultRandom().primaryKey(),
  user_id: uuid("user_id")
    .notNull()
    .references(() => userProfiles.id),
  user_name: text("user_name").notNull(),
  meter_type: text("meter_type").notNull(),
  batch_amount: integer("batch_amount").notNull(),
  unit_price: numeric("unit_price", { precision: 10, scale: 2 }).notNull(),
  total_price: numeric("total_price", { precision: 10, scale: 2 }).notNull(),
  destination: text("destination").notNull(),
  recipient: text("recipient").notNull(),
  customer_type: text("customer_type"),
  customer_county: text("customer_county"),
  customer_contact: text("customer_contact"),
  sale_date: timestamp("sale_date").defaultNow(),
  transaction_id: uuid("transaction_id").references(() => salesTransactions.id),
  notes: text("notes"),
  note_by: uuid("note_by").references(() => userProfiles.id, {
    onUpdate: "cascade",
    onDelete: "set null",
  }),
});

// Sales Transactions Table
export const salesTransactions = pgTable("sales_transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  user_id: text("user_id").notNull(),
  user_name: text("user_name").notNull(),
  sale_date: timestamp("sale_date").defaultNow(),
  destination: text("destination").notNull(),
  recipient: text("recipient").notNull(),
  customer_type: text("customer_type"),
  customer_county: text("customer_county"),
  customer_contact: text("customer_contact"),
  reference_number: text("reference_number").unique().notNull(),
  total_amount: numeric("total_amount", { precision: 10, scale: 2 }).notNull(),
});

// Sold Meters Table
export const soldMeters = pgTable("sold_meters", {
  id: uuid("id").defaultRandom().primaryKey(),
  meter_id: text("meter_id"),
  serial_number: text("serial_number").notNull(),
  sold_by: text("sold_by").notNull(),
  sold_at: timestamp("sold_at").defaultNow(),
  destination: text("destination").notNull(),
  recipient: text("recipient").notNull(),
  customer_type: text("customer_type"),
  customer_county: text("customer_county"),
  customer_contact: text("customer_contact"),
  unit_price: numeric("unit_price", { precision: 10, scale: 2 }).notNull(),
  batch_id: text("batch_id")
    .notNull()
    .references(() => saleBatches.id, { onDelete: "cascade" }),
  status: meterStatusEnum("status").default("active"),
  replacement_serial: text("replacement_serial"),
  replacement_date: timestamp("replacement_date"),
  replacement_by: text("replacement_by"),
});

// Faulty Returns Table
export const faultyReturns = pgTable("faulty_returns", {
  id: uuid("id").defaultRandom().primaryKey(),
  serial_number: text("serial_number").notNull(),
  type: text("type").notNull(),
  returned_by: text("returned_by").notNull(),
  returned_at: timestamp("returned_at").defaultNow(),
  returner_name: text("returner_name").notNull(),
  fault_description: text("fault_description"),
  status: faultyMeterStatusEnum("status").default("pending"),
  original_sale_id: text("original_sale_id").references(() => soldMeters.id, {
    onDelete: "cascade",
  }),
});

// Notifications Table
export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  type: notificationTypeEnum("type").notNull(),
  message: text("message").notNull(),
  metadata: jsonb("metadata"),
  created_by: uuid("created_by"),
  created_at: timestamp("created_at").defaultNow(),
  is_read: boolean("is_read").default(false),
  read_by: text("read_by").array(),
});

// Meter Purchase Batches Table
export const meterPurchaseBatches = pgTable("meter_purchase_batches", {
  id: uuid("id").defaultRandom().primaryKey(),
  meter_type: text("meter_type").notNull(),
  quantity: integer("quantity").notNull(),
  total_cost: numeric("total_cost", { precision: 10, scale: 2 }).notNull(),
  purchase_date: timestamp("purchase_date").defaultNow(),
  added_by: uuid("added_by"),
  created_at: timestamp("created_at").defaultNow(),
  batch_number: text("batch_number").unique().notNull(),
});

// Export types for use in the application
export type UserProfile = typeof userProfiles.$inferSelect;
export type NewUserProfile = typeof userProfiles.$inferInsert;
export type Meter = typeof meters.$inferSelect;
export type NewMeter = typeof meters.$inferInsert;
export type Agent = typeof agents.$inferSelect;
export type NewAgent = typeof agents.$inferInsert;
export type AgentInventoryItem = typeof agentInventory.$inferSelect;
export type NewAgentInventoryItem = typeof agentInventory.$inferInsert;
export type AgentTransaction = typeof agentTransactions.$inferSelect;
export type NewAgentTransaction = typeof agentTransactions.$inferInsert;
export type SaleBatch = typeof saleBatches.$inferSelect;
export type NewSaleBatch = typeof saleBatches.$inferInsert;
export type SalesTransaction = typeof salesTransactions.$inferSelect;
export type NewSalesTransaction = typeof salesTransactions.$inferInsert;
export type SoldMeter = typeof soldMeters.$inferSelect;
export type NewSoldMeter = typeof soldMeters.$inferInsert;
export type FaultyReturn = typeof faultyReturns.$inferSelect;
export type NewFaultyReturn = typeof faultyReturns.$inferInsert;
export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
export type MeterPurchaseBatch = typeof meterPurchaseBatches.$inferSelect;
export type NewMeterPurchaseBatch = typeof meterPurchaseBatches.$inferInsert;
