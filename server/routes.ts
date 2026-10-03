import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import type { AIScore } from "@shared/schema";
import { scorePlant, evaluatePlant } from "./scoring/alpha-omega-lens";
import { evaluationInputSchema } from "./scoring/schema";

export async function registerRoutes(server: Server, app: Express) {
  // ===== USERS =====
  // ===== READ-ONLY PREVIEW =====
  // With SVN_READ_ONLY=true the Proving Grounds can be read but not changed.
  // Planting, joining and consuming stay closed until per-session human
  // verification exists (one verified human per action; no bots).
  const readOnly = process.env.SVN_READ_ONLY === "true";
  app.get("/api/config", (_req, res) => res.json({ readOnly }));
  if (readOnly) {
    app.post(["/api/plants", "/api/contributions", "/api/evaluate"], (_req, res) => {
      res.status(403).json({
        message:
          "The Proving Grounds is in read-only preview. Planting and joining open once human verification is live.",
      });
    });
  }

  app.get("/api/users", (_req, res) => {
    const allUsers = storage.getAllUsers();
    res.json(allUsers);
  });

  app.get("/api/users/:id", (req, res) => {
    const user = storage.getUser(parseInt(req.params.id));
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  });

  // ===== PLANTS =====
  app.get("/api/plants", (_req, res) => {
    const allPlants = storage.getAllPlants();
    res.json(allPlants);
  });

  app.get("/api/plants/biome/:biome", (req, res) => {
    const plantsInBiome = storage.getPlantsByBiome(req.params.biome);
    res.json(plantsInBiome);
  });

  app.get("/api/plants/user/:userId", (req, res) => {
    const userPlants = storage.getPlantsByUser(parseInt(req.params.userId));
    res.json(userPlants);
  });

  app.get("/api/plants/:id", (req, res) => {
    const plant = storage.getPlant(parseInt(req.params.id));
    if (!plant) return res.status(404).json({ message: "Plant not found" });
    res.json(plant);
  });

  app.post("/api/plants", async (req, res) => {
    const { userId, title, content, biome } = req.body;

    // Biome planting costs
    const biomeCosts: Record<string, number> = { plot: 1, grove: 2, forest: 3, biosphere: 5 };
    const cost = biomeCosts[biome] || 1;

    const user = storage.getUser(userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.energy < cost) return res.status(400).json({ message: "Not enough energy to plant in this biome" });

    // Generate AI score — uses LLM (Alpha-Omega Lens) if OPENAI_API_KEY is set, heuristic fallback otherwise
    const aiScore = await scorePlant(content, { plantType: "seed" });

    // Deduct energy from user
    storage.updateUserEnergy(userId, user.energy - cost);

    // Create plant with initial energy based on content quality
    const initialEnergy = Math.max(1, aiScore.logic - aiScore.rhetoric + 2);

    const plant = storage.createPlant({
      userId,
      title,
      content,
      biome,
      energy: initialEnergy,
      aiScore: JSON.stringify(aiScore),
      status: "growing",
      createdAt: new Date().toISOString(),
    });

    res.json(plant);
  });

  // ===== CONTRIBUTIONS =====
  app.get("/api/contributions/plant/:plantId", (req, res) => {
    const contribs = storage.getContributionsByPlant(parseInt(req.params.plantId));
    res.json(contribs);
  });

  app.get("/api/contributions/user/:userId", (req, res) => {
    const contribs = storage.getContributionsByUser(parseInt(req.params.userId));
    res.json(contribs);
  });

  app.post("/api/contributions", async (req, res) => {
    const { plantId, userId, content, type } = req.body;

    const user = storage.getUser(userId);
    const plant = storage.getPlant(plantId);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (!plant) return res.status(404).json({ message: "Plant not found" });

    let energyTransferred = 0;
    let userEnergyChange = 0;
    let plantEnergyChange = 0;

    switch (type) {
      case "join":
      case "expand":
      case "clarify":
        // Costs 1 energy, adds 1 to plant
        if (user.energy < 1) return res.status(400).json({ message: "Not enough energy" });
        energyTransferred = 1;
        userEnergyChange = -1;
        plantEnergyChange = 1;
        break;

      case "consume": {
        // Costs 2 energy
        if (user.energy < 2) return res.status(400).json({ message: "Not enough energy to consume" });
        const aiScore: AIScore = JSON.parse(plant.aiScore);
        if (aiScore.rhetoric > aiScore.logic) {
          // Weak plant — consumer gains 3 energy, plant loses 2
          userEnergyChange = 1; // net: -2 + 3 = +1
          plantEnergyChange = -2;
          energyTransferred = -2;
        } else {
          // Strong plant — consumer loses 2, gains nothing
          userEnergyChange = -2;
          plantEnergyChange = 0;
          energyTransferred = 0;
        }
        break;
      }

      case "correct":
        // Costs 1, no energy transfer
        if (user.energy < 1) return res.status(400).json({ message: "Not enough energy" });
        userEnergyChange = -1;
        energyTransferred = 0;
        break;

      default:
        return res.status(400).json({ message: "Invalid contribution type" });
    }

    // Apply energy changes
    storage.updateUserEnergy(userId, user.energy + userEnergyChange);

    const newPlantEnergy = plant.energy + plantEnergyChange;
    storage.updatePlantEnergy(plantId, Math.max(0, newPlantEnergy));

    // If plant hits 0, compost it
    if (newPlantEnergy <= 0) {
      storage.updatePlantStatus(plantId, "composted");
    }

    const contribution = storage.createContribution({
      plantId,
      userId,
      content,
      type,
      energyTransferred,
      createdAt: new Date().toISOString(),
    });

    // Return updated user and plant
    const updatedUser = storage.getUser(userId);
    const updatedPlant = storage.getPlant(plantId);

    res.json({ contribution, user: updatedUser, plant: updatedPlant });
  });

  // ===== ALPHA-OMEGA LENS EVALUATION =====

  /**
   * POST /api/evaluate
   *
   * Evaluate plant text using the Alpha-Omega Lens (LLM-powered).
   * Returns the full structured evaluation with 7-dimension scores,
   * assessment, rhetoric/logic markers, and consumability flag.
   *
   * Requires OPENAI_API_KEY to be set.
   */
  app.post("/api/evaluate", async (req, res) => {
    try {
      if (!process.env.OPENAI_API_KEY) {
        return res.status(503).json({
          message:
            "Alpha-Omega Lens is not available. OPENAI_API_KEY is not configured. " +
            "The proving grounds are using heuristic scoring as a fallback.",
        });
      }

      const parseResult = evaluationInputSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          message: "Invalid evaluation input",
          errors: parseResult.error.flatten().fieldErrors,
        });
      }

      const result = await evaluatePlant(parseResult.data);
      res.json(result);
    } catch (error) {
      console.error("Evaluation failed:", error);
      res.status(500).json({
        message:
          error instanceof Error
            ? error.message
            : "Alpha-Omega Lens evaluation failed unexpectedly",
      });
    }
  });
}
