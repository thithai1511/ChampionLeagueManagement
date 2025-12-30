import express from "express";
// Trigger restart v4
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
import seasonTeamRegistrationRoutes from "./routes/seasonTeamRegistrationRoutes";
import matchLifecycleRoutes from "./routes/matchLifecycleRoutes";
import newsRoutes from "./routes/newsRoutes";
import mediaRoutes from "./routes/mediaRoutes";
import settingsRoutes from "./routes/settingsRoutes";
import officialRoutes from "./routes/officialRoutes";
import awardsRoutes from "./routes/awardsRoutes";
import disciplineRoutes from "./routes/disciplineRoutes";
import disciplinaryRoutes from "./routes/disciplinaryRoutes";
import publicStandingsRoutes from "./routes/publicStandingsRoutes";
import scheduleRoutes from "./routes/scheduleRoutes";
import lineupValidationRoutes from "./routes/lineupValidationRoutes";
import matchReportRoutes from "./routes/matchReportRoutes";
import matchDetailRoutes from "./routes/matchDetailRoutes";
import matchOfficialRoutes from "./routes/matchOfficialRoutes";
import participationFeeRoutes from "./routes/participationFeeRoutes";
import playerOfMatchRoutes from "./routes/playerOfMatchRoutes";
import stadiumRoutes from "./routes/stadiumRoutes";

const app = express();

app.set("etag", false);
app.use(cors());
// Ensure UTF-8 encoding for all responses
app.use((req, res, next) => {
  res.charset = 'utf-8';
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  next();
});
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
app.use("/api/disciplinary", disciplinaryRoutes); // Disciplinary management
app.use("/api/public/standings", publicStandingsRoutes); // Public standings (no auth)
app.use("/api", seasonTeamRegistrationRoutes); // Team registration workflow
app.use("/api", matchLifecycleRoutes); // Match lifecycle workflow
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

// Match-related routes
app.use("/api/schedule", scheduleRoutes);
app.use("/api/lineup", lineupValidationRoutes);
app.use("/api/match-reports", matchReportRoutes);
app.use("/api/match-details", matchDetailRoutes);
app.use("/api/match-officials", matchOfficialRoutes);
app.use("/api/participation-fees", participationFeeRoutes);
app.use("/api/player-of-match", playerOfMatchRoutes);
app.use("/api/stadiums", stadiumRoutes);

// Sync and Import utilities (keep for future use if needed)
app.use("/api/sync", syncRoutes);
app.use("/api/import", importRoutes);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use(errorHandler);

export default app;
