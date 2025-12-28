import express from "express";
import "express-async-errors";
import cors from "cors";
import morgan from "morgan";
import path from "path";

import authRoutes from "./routes/authRoutes";
import userRoutes from "./routes/userRoutes";
import roleRoutes from "./routes/roleRoutes";
import permissionRoutes from "./routes/permissionRoutes";
import rulesetRoutes from "./routes/rulesetRoutes";
import seasonRoutes from "./routes/seasonRoutes";
import auditRoutes from "./routes/auditRoutes";
import teamRoutes from "./routes/teamRoutes";
import { errorHandler } from "./middleware/errorHandler";
import leaderboardRoutes from "./routes/leaderboardRoutes";
import statsRoutes from "./routes/statsRoutes";
import playerRoutes from "./routes/playerRoutes";
import matchRoutes from "./routes/matchRoutes";
import syncRoutes from "./routes/syncRoutes";
import importRoutes from "./routes/importRoutes";
import internalTeamRoutes from "./routes/internalTeamRoutes";
import internalPlayerRoutes from "./routes/internalPlayerRoutes";
import playerRegistrationRoutes from "./routes/playerRegistrationRoutes";
import adminStandingsRoutes from "./routes/adminStandingsRoutes";
import seasonRegistrationRoutes from "./routes/seasonRegistrationRoutes";
import seasonPlayerRoutes from "./routes/seasonPlayerRoutes";
import seasonInvitationRoutes from "./routes/seasonInvitationRoutes";
import newsRoutes from "./routes/newsRoutes";
import mediaRoutes from "./routes/mediaRoutes";
import settingsRoutes from "./routes/settingsRoutes";
import officialRoutes from "./routes/officialRoutes";
import awardsRoutes from "./routes/awardsRoutes";
import disciplineRoutes from "./routes/disciplineRoutes";

const app = express();

app.set("etag", false);
app.use(cors());
app.use(express.json());
if ((process.env.NODE_ENV ?? "development") !== "test") {
  app.use(morgan("dev"));
}

// Serve uploaded files (PDFs, media) when referenced by the frontend.
app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/roles", roleRoutes);
app.use("/api/permissions", permissionRoutes);
app.use("/api/rulesets", rulesetRoutes);
// IMPORTANT: Mount specific season sub-routes BEFORE generic seasonRoutes
// to prevent /:id from matching /:seasonId/awards or /:seasonId/discipline
app.use("/api/seasons", awardsRoutes);
app.use("/api/seasons", disciplineRoutes);
app.use("/api/seasons", seasonInvitationRoutes);
app.use("/api/seasons", seasonRoutes);
app.use("/api/audit-events", auditRoutes);
app.use("/api/season-players", seasonRegistrationRoutes);
app.use("/api", seasonPlayerRoutes);
// Use internal database for teams and players (Champions League data already imported)
app.use("/api/teams", internalTeamRoutes);
app.use("/api/players/registrations", playerRegistrationRoutes);
app.use("/api/players", internalPlayerRoutes);

// Old routes (Football-Data.org API) - commented out, can be removed later
// app.use("/api/teams", teamRoutes);
// app.use("/api/players", playerRoutes);

app.use("/api/leaderboard", leaderboardRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/matches", matchRoutes);
app.use("/api/news", newsRoutes);
app.use("/api/media", mediaRoutes);
app.use("/api/settings", settingsRoutes);

// Admin routes
app.use("/api/admin/standings", adminStandingsRoutes);
app.use("/api/officials", officialRoutes);

// Sync and Import utilities (keep for future use if needed)
app.use("/api/sync", syncRoutes);
app.use("/api/import", importRoutes);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use(errorHandler);

export default app;
