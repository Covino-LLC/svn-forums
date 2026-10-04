import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  email: text("email").notNull(),
  passwordHash: text("password_hash"),
  tier: integer("tier").notNull().default(1),
  energy: integer("energy").notNull().default(2),
  createdAt: text("created_at").notNull(),
});

export const plants = sqliteTable("plants", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  content: text("content").notNull(),
  biome: text("biome").notNull(), // "plot" | "grove" | "forest" | "biosphere"
  energy: integer("energy").notNull().default(1),
  aiScore: text("ai_score").notNull(), // JSON string
  status: text("status").notNull().default("growing"), // "growing" | "composted"
  createdAt: text("created_at").notNull(),
});

export const contributions = sqliteTable("contributions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  plantId: integer("plant_id").notNull().references(() => plants.id),
  userId: integer("user_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  type: text("type").notNull(), // "join" | "consume" | "expand" | "clarify" | "correct"
  energyTransferred: integer("energy_transferred").notNull().default(0),
  createdAt: text("created_at").notNull(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertPlantSchema = createInsertSchema(plants).omit({ id: true });
export const insertContributionSchema = createInsertSchema(contributions).omit({ id: true });

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Plant = typeof plants.$inferSelect;
export type InsertPlant = z.infer<typeof insertPlantSchema>;
export type Contribution = typeof contributions.$inferSelect;
export type InsertContribution = z.infer<typeof insertContributionSchema>;

// AI Score type for frontend
export interface AIScore {
  logic: number;
  rhetoric: number;
  nostalgia: number;
  emotionalAppeal: number;
  novelty: number;
  verifiability: number;
  scope: number;
  assessment: string;
}
