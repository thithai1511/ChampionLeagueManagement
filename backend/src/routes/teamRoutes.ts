import { Router } from "express";
import {
  listTeams,
  getTeamByExternalId,
  updateTeam,
  deleteTeam,
} from "../services/teamService";
import { getInternalSeasons, getInternalStandings } from "../services/seasonService";

const router = Router();

const parseSeason = (value: unknown): string | undefined => {
  if (typeof value !== "string" || !value.trim()) {
    return undefined;
  }
  return value.trim();
};

// GET /teams - List teams from database
router.get("/", async (req, res, next) => {
  try {
    const search = typeof req.query.search === "string" ? req.query.search.trim() : undefined;
    const country = typeof req.query.country === "string" ? req.query.country.trim() : undefined;
    const city = typeof req.query.city === "string" ? req.query.city.trim() : undefined;
    const page = typeof req.query.page === "string" ? parseInt(req.query.page, 10) : 1;
    const limit = typeof req.query.limit === "string" ? parseInt(req.query.limit, 10) : 25;

    const result = await listTeams({
      search,
      country,
      city,
      page,
      limit,
    });

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

// GET /teams/standings - Get standings from database
router.get("/standings", async (req, res, next) => {
  try {
    console.log('[GET /teams/standings] Query params:', req.query);
    const seasonId = typeof req.query.seasonId === "string" ? Number(req.query.seasonId) : undefined;
    const season = typeof req.query.season === "string" ? req.query.season : undefined;
    const standings = await getInternalStandings({ seasonId, season });

    console.log('[GET /teams/standings] Success, returned', standings.table.length, 'teams');
    res.json({ data: standings });
  } catch (error) {
    console.error('[GET /teams/standings] Error:', error);
    next(error);
  }
});

// GET /teams/seasons - Get seasons from internal database
router.get("/seasons", async (req, res, next) => {
  try {
    console.log('[GET /teams/seasons] Called, query:', req.query);
    // Ignore fromYear param for compatibility with frontend
    const seasons = await getInternalSeasons();
    console.log('[GET /teams/seasons] Success, returned', seasons.length, 'seasons');
    res.json({ data: seasons });
  } catch (error) {
    console.error('[GET /teams/seasons] Error:', error);
    next(error);
  }
});

// GET /teams/:teamId - Get team detail from database by external ID
router.get("/:teamId", async (req, res, next) => {
  try {
    console.log('[GET /teams/:teamId] Params:', req.params.teamId);
    const teamId = parseInt(req.params.teamId, 10);
    if (isNaN(teamId)) {
      console.error('[GET /teams/:teamId] Invalid team ID:', req.params.teamId);
      return res.status(400).json({ error: "Invalid team ID" });
    }

    const { getInternalTeamById } = await import("../services/teamService");
    const team = await getInternalTeamById(teamId);

    if (!team) {
      return res.status(404).json({ error: "Team not found" });
    }

    res.json({ data: team });
  } catch (error) {
    next(error);
  }
});

// GET /teams/:teamId/players - Get team squad from database
router.get("/:teamId/players", async (req, res, next) => {
  try {
    const teamId = parseInt(req.params.teamId, 10);
    if (isNaN(teamId)) {
      return res.status(400).json({ error: "Invalid team ID" });
    }

    // Import player service to get players by team
    const { listPlayers } = await import("../services/playerService");
    const players = await listPlayers({
      teamId,
      limit: 100
    });

    res.json({
      data: players.data,
      total: players.total
    });
  } catch (error) {
    next(error);
  }
});

// PUT /teams/:id - Update team (by internal ID)
router.put("/:id", async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid team ID" });
    }

    const updatedTeam = await updateTeam(id, req.body);
    
    if (!updatedTeam) {
      return res.status(404).json({ error: "Team not found" });
    }

    res.json({ data: updatedTeam });
  } catch (error) {
    console.error('[PUT /teams/:id] Error:', error);
    next(error);
  }
});

// DELETE /teams/:id - Delete team (by internal ID)
router.delete("/:id", async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid team ID" });
    }

    const deleted = await deleteTeam(id);
    if (!deleted) {
      return res.status(404).json({ error: "Team not found" });
    }

    res.status(204).send();
  } catch (error: any) {
    // Handle both English and Vietnamese error messages
    if (error.message && (error.message.includes("Cannot delete team") || error.message.includes("Không thể xóa đội bóng"))) {
      return res.status(409).json({ message: error.message });
    }
    next(error);
  }
});

export default router;

