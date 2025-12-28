import { Router } from "express";
import { requireAnyPermission, requireAuth, requirePermission } from "../middleware/authMiddleware";
import { upload } from "../middleware/uploadMiddleware";
import * as playerRegistrationController from "../controllers/playerRegistrationController";


const router = Router();

router.get(
  "/season-teams",
  requireAuth,
  requireAnyPermission("manage_teams", "manage_own_player_registrations"),
  playerRegistrationController.listSeasonTeams
);
router.get(
  "/",
  requireAuth,
  requireAnyPermission("approve_player_registrations", "manage_own_player_registrations"),
  playerRegistrationController.list
);

router.post(
  "/",
  requireAuth,
  requireAnyPermission("manage_teams", "manage_own_player_registrations"),
  upload.single("file"),
  playerRegistrationController.create
);




router.put(
  "/:id",
  requireAuth,
  requireAnyPermission("manage_teams", "manage_own_player_registrations"),
  upload.single("file"),
  playerRegistrationController.update
);

router.post(
  "/:id/approve",
  requireAuth,
  requirePermission("approve_player_registrations"),
  playerRegistrationController.approve
);

router.post(
  "/:id/reject",
  requireAuth,
  requirePermission("approve_player_registrations"),
  playerRegistrationController.reject
);

export default router;

