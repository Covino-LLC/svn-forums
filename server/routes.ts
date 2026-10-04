import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import type { AIScore } from "@shared/schema";
import { scorePlant, evaluatePlant } from "./scoring/alpha-omega-lens";
import { evaluationInputSchema } from "./scoring/schema";
import { clearSession, clientIp, hashPassword, publicUser, rateLimit, requireUser, sessionUser, setSession, verifyPassword } from "./auth";

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

  // ===== ACCOUNTS =====
  const perIp = (max: number, windowMs: number) => rateLimit(max, windowMs, clientIp);
  const perUser = (max: number, windowMs: number) => rateLimit(max, windowMs, (req) => String(req.user!.id));

  app.get("/api/auth/me", (req, res) => {
    const user = sessionUser(req);
    // Own email is returned to its owner only; the hash never leaves the server.
    res.json(user ? { ...publicUser(user), email: user.email } : null);
  });

  app.post("/api/auth/signup", perIp(5, 3600_000), (req, res) => {
    if (readOnly) return res.status(403).json({ message: "Signups are closed." });
    const { username, email, password } = req.body ?? {};
    if (typeof username !== "string" || !/^[A-Za-z0-9_]{3,24}$/.test(username))
      return res.status(400).json({ message: "Username must be 3-24 letters, numbers or underscores." });
    if (typeof email !== "string" || email.length > 254 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
      return res.status(400).json({ message: "Enter a valid email address." });
    if (typeof password !== "string" || password.length < 8 || password.length > 128)
      return res.status(400).json({ message: "Password must be 8 to 128 characters." });
    if (storage.getUserByUsername(username) || storage.getUserByEmail(email))
      return res.status(409).json({ message: "That username or email is already registered." });
    const user = storage.createUser({
      username,
      email,
      passwordHash: hashPassword(password),
      tier: 1,
      energy: 2,
      createdAt: new Date().toISOString(),
    });
    setSession(res, user.id);
    res.json({ ...publicUser(user), email: user.email });
  });

  app.post("/api/auth/login", perIp(10, 900_000), (req, res) => {
    const { username, password } = req.body ?? {};
    const user = typeof username === "string" ? storage.getUserByUsername(username) : undefined;
    // Same message for unknown user and wrong password.
    if (!user || typeof password !== "string" || !verifyPassword(password, user.passwordHash))
      return res.status(401).json({ message: "Wrong username or password." });
    setSession(res, user.id);
    res.json({ ...publicUser(user), email: user.email });
  });

  app.post("/api/auth/logout", (_req, res) => {
    clearSession(res);
    res.json({ ok: true });
  });

  app.get("/api/users", (_req, res) => {
    res.json(storage.getAllUsers().map(publicUser));
  });

  app.get("/api/users/:id", (req, res) => {
    const user = storage.getUser(parseInt(req.params.id));
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(publicUser(user));
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

  app.post("/api/plants", requireUser, perUser(20, 3600_000), async (req, res) => {
    const { title, content, biome } = req.body ?? {};
    const userId = req.user!.id;
    if (typeof title !== "string" || !title.trim() || title.length > 200)
      return res.status(400).json({ message: "Title is required (200 characters max)." });
    if (typeof content !== "string" || !content.trim() || content.length > 10000)
      return res.status(400).json({ message: "Content is required (10,000 characters max)." });

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

  app.post("/api/contributions", requireUser, perUser(60, 3600_000), async (req, res) => {
    const { plantId, content, type } = req.body ?? {};
    const userId = req.user!.id;
    if (typeof content !== "string" || !content.trim() || content.length > 5000)
      return res.status(400).json({ message: "Content is required (5,000 characters max)." });

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

    res.json({ contribution, user: updatedUser && { ...publicUser(updatedUser), email: updatedUser.email }, plant: updatedPlant });
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
  app.post("/api/evaluate", requireUser, perUser(10, 3600_000), async (req, res) => {
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
