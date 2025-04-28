import { pgTable, text, serial, integer, boolean, date, timestamp, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User types
export const userRoles = ["manager", "customer"] as const;
export type UserRole = typeof userRoles[number];

// User schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  phone: text("phone").notNull(),
  name: text("name").notNull(),
  email: text("email"),
  role: text("role").$type<UserRole>().notNull(),
  isFirstLogin: boolean("is_first_login").notNull().default(true),
  managerId: integer("manager_id"), // The ID of the manager who created this customer (null for managers)
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

// Chit group schema
export const chitGroups = pgTable("chit_groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  value: integer("value").notNull(), // Total amount of the chit
  duration: integer("duration").notNull(), // Number of months
  membersCount: integer("members_count").notNull(), // Number of members
  startDate: date("start_date").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: integer("created_by").notNull(), // Manager who created this group
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertChitGroupSchema = createInsertSchema(chitGroups).omit({
  id: true,
  createdAt: true,
  createdBy: true, // This will be set by the server based on authenticated user
});

// Chit group member schema (connects users to chit groups)
export const chitGroupMembers = pgTable("chit_group_members", {
  id: serial("id").primaryKey(),
  chitGroupId: integer("chit_group_id").notNull(),
  userId: integer("user_id").notNull(),
  joinDate: date("join_date").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertChitGroupMemberSchema = createInsertSchema(chitGroupMembers).omit({
  id: true,
  createdAt: true,
});

// Auction schema
export const auctions = pgTable("auctions", {
  id: serial("id").primaryKey(),
  chitGroupId: integer("chit_group_id").notNull(),
  auctionDate: date("auction_date").notNull(),
  winnerUserId: integer("winner_user_id"),
  winningBid: doublePrecision("winning_bid"),
  status: text("status").notNull(), // 'scheduled', 'completed', 'cancelled'
  monthNumber: integer("month_number").notNull(), // Which month of the chit cycle
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAuctionSchema = createInsertSchema(auctions).omit({
  id: true,
  createdAt: true,
});

// Bid schema
export const bids = pgTable("bids", {
  id: serial("id").primaryKey(),
  auctionId: integer("auction_id").notNull(),
  userId: integer("user_id").notNull(),
  bidAmount: doublePrecision("bid_amount").notNull(),
  bidTime: timestamp("bid_time").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertBidSchema = createInsertSchema(bids).omit({
  id: true,
  bidTime: true,
  createdAt: true,
});

// Payment schema
export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  chitGroupId: integer("chit_group_id").notNull(),
  userId: integer("user_id").notNull(),
  amount: doublePrecision("amount").notNull(),
  paymentDate: date("payment_date").notNull(),
  monthNumber: integer("month_number").notNull(), // Which month of the chit cycle
  status: text("status").notNull(), // 'paid', 'pending', 'overdue'
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true,
});

// Notification schema
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  type: text("type").notNull(), // 'payment', 'auction', 'general'
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  isRead: true,
  createdAt: true,
});

// Export types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type ChitGroup = typeof chitGroups.$inferSelect;
export type InsertChitGroup = z.infer<typeof insertChitGroupSchema>;

export type ChitGroupMember = typeof chitGroupMembers.$inferSelect;
export type InsertChitGroupMember = z.infer<typeof insertChitGroupMemberSchema>;

export type Auction = typeof auctions.$inferSelect;
export type InsertAuction = z.infer<typeof insertAuctionSchema>;

export type Bid = typeof bids.$inferSelect;
export type InsertBid = z.infer<typeof insertBidSchema>;

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

// Create auth schemas for login
export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export type LoginCredentials = z.infer<typeof loginSchema>;
