import { Router } from "express";
import { upload } from "../middleware/uploadMiddleware";
import * as registrationController from "../controllers/seasonPlayerRegistrationController";
import * as queryController from "../controllers/seasonPlayerQueryController";
// Import auth middleware if needed, e.g., checkAuth or verifyToken from internal middleware
// import { authenticate } from "../middleware/authMiddleware";

const router = Router();

// Route: POST /api/season-players/register
// Add authentication middleware if this route should be protected (likely yes)
// router.post("/register", authenticate, upload.single("file"), registrationController.register);

// For now, based on user request "Create route", I will add it.
// Assuming we might want basic auth? Use request: "logAuditEvent(user_id...)", so auth is implied.
// Checking app.ts or auth library used.
// Based on "middleware/authMiddleware.ts" existing:
import { requireAuth, requirePermission } from "../middleware/authMiddleware";

// Query Routes (season-players)
router.get("/approved", requireAuth, queryController.listApprovedSeasonPlayers);
router.get("/my-team/approved", requireAuth, queryController.listMyTeamApprovedSeasonPlayers);

router.get("/pending", requireAuth, requirePermission("approve_player_registrations"), registrationController.listPending);
router.post("/:id/approve", requireAuth, requirePermission("approve_player_registrations"), registrationController.approve);
router.post("/:id/reject", requireAuth, requirePermission("approve_player_registrations"), registrationController.reject);
router.delete("/:id", requireAuth, requirePermission("manage_rulesets"), registrationController.remove);
router.put("/:id", requireAuth, requirePermission("manage_rulesets"), registrationController.update);

import { requireAnyPermission } from "../middleware/authMiddleware";

router.post(
    "/register",
    requireAuth,
    requireAnyPermission(
        "manage_own_player_registrations",
        "manage_teams" // cho super admin
    ),
    upload.single("file"),
    registrationController.register
);


export default router;
