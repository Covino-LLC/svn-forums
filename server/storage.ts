import { users, plants, contributions, type User, type InsertUser, type Plant, type InsertPlant, type Contribution, type InsertContribution } from "@shared/schema";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq, desc, and } from "drizzle-orm";

const sqlite = new Database(process.env.SVN_DB_PATH || "svn.db");
const db = drizzle(sqlite);

export interface IStorage {
  // Users
  getUser(id: number): User | undefined;
  getUserByUsername(username: string): User | undefined;
  getAllUsers(): User[];
  createUser(user: InsertUser): User;
  updateUserEnergy(id: number, energy: number): void;

  // Plants
  getPlant(id: number): Plant | undefined;
  getPlantsByBiome(biome: string): Plant[];
  getPlantsByUser(userId: number): Plant[];
  getAllPlants(): Plant[];
  createPlant(plant: InsertPlant): Plant;
  updatePlantEnergy(id: number, energy: number): void;
  updatePlantStatus(id: number, status: string): void;

  // Contributions
  getContributionsByPlant(plantId: number): Contribution[];
  getContributionsByUser(userId: number): Contribution[];
  createContribution(contribution: InsertContribution): Contribution;
}

export class SqliteStorage implements IStorage {
  constructor() {
    // Create tables
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL,
        tier INTEGER NOT NULL DEFAULT 1,
        energy INTEGER NOT NULL DEFAULT 2,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS plants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id),
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        biome TEXT NOT NULL,
        energy INTEGER NOT NULL DEFAULT 1,
        ai_score TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'growing',
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS contributions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        plant_id INTEGER NOT NULL REFERENCES plants(id),
        user_id INTEGER NOT NULL REFERENCES users(id),
        content TEXT NOT NULL,
        type TEXT NOT NULL,
        energy_transferred INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      );
    `);
  }

  getUser(id: number): User | undefined {
    return db.select().from(users).where(eq(users.id, id)).get();
  }

  getUserByUsername(username: string): User | undefined {
    return db.select().from(users).where(eq(users.username, username)).get();
  }

  getAllUsers(): User[] {
    return db.select().from(users).all();
  }

  createUser(user: InsertUser): User {
    return db.insert(users).values(user).returning().get();
  }

  updateUserEnergy(id: number, energy: number): void {
    db.update(users).set({ energy }).where(eq(users.id, id)).run();
  }

  // Plants
  getPlant(id: number): Plant | undefined {
    return db.select().from(plants).where(eq(plants.id, id)).get();
  }

  getPlantsByBiome(biome: string): Plant[] {
    return db.select().from(plants).where(eq(plants.biome, biome)).orderBy(desc(plants.energy)).all();
  }

  getPlantsByUser(userId: number): Plant[] {
    return db.select().from(plants).where(eq(plants.userId, userId)).orderBy(desc(plants.createdAt)).all();
  }

  getAllPlants(): Plant[] {
    return db.select().from(plants).orderBy(desc(plants.energy)).all();
  }

  createPlant(plant: InsertPlant): Plant {
    return db.insert(plants).values(plant).returning().get();
  }

  updatePlantEnergy(id: number, energy: number): void {
    db.update(plants).set({ energy }).where(eq(plants.id, id)).run();
  }

  updatePlantStatus(id: number, status: string): void {
    db.update(plants).set({ status }).where(eq(plants.id, id)).run();
  }

  // Contributions
  getContributionsByPlant(plantId: number): Contribution[] {
    return db.select().from(contributions).where(eq(contributions.plantId, plantId)).orderBy(desc(contributions.createdAt)).all();
  }

  getContributionsByUser(userId: number): Contribution[] {
    return db.select().from(contributions).where(eq(contributions.userId, userId)).orderBy(desc(contributions.createdAt)).all();
  }

  createContribution(contribution: InsertContribution): Contribution {
    return db.insert(contributions).values(contribution).returning().get();
  }
}

export const storage = new SqliteStorage();
