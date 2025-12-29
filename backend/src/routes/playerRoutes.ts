import { Router } from "express";
import { z } from "zod";
import {
  deletePlayer,
  getPlayerById,
  listPlayers,
  syncPlayersFromUpstream,
  updatePlayer,
} from "../services/playerService";

const router = Router();

const listPlayersQuerySchema = z.object({
  search: z.string().trim().optional(),
  teamId: z
    .string()
    .trim()
    .transform((value) => (value ? Number(value) : undefined))
    .pipe(z.number().int().positive().optional())
    .optional(),
  position: z.string().trim().optional(),
  nationality: z.string().trim().optional(),
  season: z.string().trim().optional(),
  page: z
    .string()
    .trim()
    .transform((value) => (value ? Number(value) : undefined))
    .pipe(z.number().int().positive().optional())
    .optional(),
  limit: z
    .string()
    .trim()
    .transform((value) => (value ? Number(value) : undefined))
    .pipe(z.number().int().positive().optional())
    .optional(),
});

router.get("/", async (req, res, next) => {
  try {
    const filters = listPlayersQuerySchema.parse(req.query);
    const result = await listPlayers(filters);
    res.json({
      data: result.data,
      total: result.total,
      pagination: {
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    next(error);
  }
});

const syncQuerySchema = z.object({
  season: z.string().trim().optional(),
});

router.post("/sync", async (req, res, next) => {
  try {
    // syncPlayersFromUpstream is deprecated - Football* tables removed
    const summary = await syncPlayersFromUpstream();
    res.status(202).json({
      message: "Sync feature is deprecated - Football* tables removed",
      meta: summary,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: "Invalid player id" });
    }
    const player = await getPlayerById(id);
    if (!player) {
      return res.status(404).json({ message: "Player not found" });
    }
    res.json({ data: player });
  } catch (error) {
    next(error);
  }
});

const updateSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  position: z.string().trim().max(80).nullable().optional(),
  nationality: z.string().trim().max(120).nullable().optional(),
  shirtNumber: z.number().int().min(0).max(99).nullable().optional(),
  season: z.string().trim().max(32).nullable().optional(),
});

router.put("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: "Invalid player id" });
    }
    const updatePayload = updateSchema.parse(req.body ?? {});
    
    // Map old field names to new UpdatePlayerInput properties
    const updateInput: Parameters<typeof updatePlayer>[1] = {};
    if (updatePayload.name) updateInput.fullName = updatePayload.name;
    if (updatePayload.position) updateInput.preferredPosition = updatePayload.position;
    if (updatePayload.nationality) updateInput.nationality = updatePayload.nationality;
    
    const updated = await updatePlayer(id, updateInput);
    if (!updated) {
      return res.status(404).json({ message: "Player not found" });
    }
    res.json({ data: updated });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: "Invalid player id" });
    }
    const deleted = await deletePlayer(id);
    if (!deleted) {
      return res.status(404).json({ message: "Player not found" });
    }
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;


