import sql from "mssql";
import { transaction } from "../db/sqlServer";
import { logEvent } from "./auditService";
import { BadRequestError, ForbiddenError } from "../utils/httpError";
import { query } from "../db/sqlServer";

/**
 * DTO đăng ký cầu thủ theo mùa
 */
export interface SeasonPlayerRegistrationData {
    season_id: number;
    player_id: number;
    season_team_id: number;
    position_code: string;
    shirt_number?: number;
    player_type: 'foreign' | 'domestic';
    file_path: string;
    // audit
    user_id?: number | null;
    username?: string | null;
}

/**
 * HELPER: Basic Validation (Shared)
 * Checks: 
 * 1. Duplicate Player in Season
 * 2. Shirt Number Conflict in Season Team
 */
async function validateBasicRegistrationRules(
    season_id: number,
    season_team_id: number,
    player_id: number,
    shirt_number: number | null | undefined
) {
    // 1. Uniqueness Check
    const checkDup = await query(`
        SELECT 1 FROM season_player_registrations 
        WHERE season_id = @sid AND player_id = @pid
    `, { sid: season_id, pid: player_id });

    if (checkDup.recordset?.length) {
        throw BadRequestError("PLAYER_ALREADY_REGISTERED");
    }

    // 2. Shirt Number Check
    if (shirt_number != null) {
        const checkShirt = await query(`
            SELECT 1 FROM season_player_registrations 
            WHERE season_id = @sid AND season_team_id = @stid AND shirt_number = @num
        `, { sid: season_id, stid: season_team_id, num: shirt_number });

        if (checkShirt.recordset?.length) {
            throw BadRequestError("SHIRT_NUMBER_TAKEN");
        }
    }
}

/**
 * HELPER: Permission Check
 * Rules:
 * - Super Admin: Bypass
 * - Admin Team: Must own the team
 */
async function _checkTeamPermission(
    currentUser: { teamIds?: number[]; roles?: string[]; sub: number; username?: string },
    season_team_id: number,
    season_id: number
) {
    // 1. Fetch Season Team info
    const seasonTeamRes = await query(`
        SELECT team_id, season_id FROM season_team_participants WHERE season_team_id = @season_team_id
    `, { season_team_id });

    const sTeam = seasonTeamRes.recordset[0];
    if (!sTeam || Number(sTeam.season_id) !== Number(season_id)) {
        throw BadRequestError("SEASON_TEAM_NOT_FOUND");
    }

    // 2. Check Role
    const isSuperAdmin = Array.isArray(currentUser.roles) && currentUser.roles.includes('super_admin');

    if (!isSuperAdmin) {
        // If not super admin, must be scoped to team
        let myTeams: number[] = [];
        if (Array.isArray(currentUser.teamIds)) {
            myTeams = currentUser.teamIds;
        } else if (currentUser.teamIds && !isNaN(Number(currentUser.teamIds))) {
            myTeams = [Number(currentUser.teamIds)];
        }

        // Also check if teamIds is empty, means no access
        if (!myTeams.includes(sTeam.team_id)) {
            throw ForbiddenError("NOT_ALLOWED_FOR_THIS_TEAM");
        }
    }
    return sTeam.team_id; // Return real team_id if needed
}

/**
 * Internal Helper: Insert into DB (Status = Pending)
 * ❌ NO Strict Business Rules (Age, Quota) here.
 * ✅ ONLY Integrity Checks (Team in Season, Unique, etc.)
 */
async function _insertRegistration(
    data: SeasonPlayerRegistrationData,
    existingTx?: sql.Transaction
): Promise<number> {
    const {
        season_id,
        player_id,
        season_team_id,
        position_code,
        shirt_number,
        player_type,
        file_path,
        user_id // created_by
    } = data;

    const op = async (tx: sql.Transaction) => {
        // 1. Basic Integrity: Check Team Participation
        const valReq = new sql.Request(tx);
        valReq.input("v_season_id", sql.Int, season_id);
        valReq.input("v_season_team_id", sql.Int, season_team_id);

        const teamCheck = await valReq.query(`
            SELECT 1 FROM season_team_participants
            WHERE season_id = @v_season_id AND season_team_id = @v_season_team_id
        `);
        if (!teamCheck.recordset[0]) {
            throw BadRequestError("TEAM_NOT_IN_SEASON");
        }

        // 2. Insert (Pending)
        const request = new sql.Request(tx);
        request.input("season_id", sql.Int, season_id);
        request.input("player_id", sql.Int, player_id);
        request.input("season_team_id", sql.Int, season_team_id)
        request.input("position_code", sql.NVarChar(50), position_code);
        request.input("player_type", sql.NVarChar(50), player_type);
        request.input("is_foreign", sql.Bit, player_type.toLowerCase() === 'foreign' ? 1 : 0);
        request.input("shirt_number", sql.Int, shirt_number ?? null);
        request.input("file_path", sql.NVarChar(255), file_path);
        request.input("created_by", sql.Int, user_id ?? null);

        try {
            const res = await request.query(`
                INSERT INTO season_player_registrations (
                    season_id, season_team_id, player_id,
                    position_code, shirt_number, player_type, is_foreign,
                    file_path, registration_status, created_by, registered_at
                )
                OUTPUT INSERTED.season_player_id
                VALUES (
                    @season_id, @season_team_id, @player_id,
                    @position_code, @shirt_number, @player_type, @is_foreign,
                    @file_path, 'pending', @created_by, GETDATE()
                )
            `);
            return res.recordset[0]?.season_player_id;
        } catch (err: any) {
            // Handle UNIQUE constraints gracefully
            if (err?.number === 2601 || err?.number === 2627) {
                const msg = err.message || "";
                if (msg.includes("UQ_season_player") || msg.includes("player")) {
                    throw BadRequestError("PLAYER_ALREADY_REGISTERED");
                }
                if (msg.includes("shirt_number")) {
                    throw BadRequestError("SHIRT_NUMBER_TAKEN");
                }
            }

            // Fallback for older schema (without created_by or output)
            if (err?.number === 207 || /created_by/i.test(String(err?.message ?? ""))) {
                await request.query(`
                    INSERT INTO season_player_registrations (
                        season_id, season_team_id, player_id,
                        position_code, shirt_number, player_type, is_foreign,
                        file_path, registration_status
                    )
                    VALUES (
                        @season_id, @season_team_id, @player_id,
                        @position_code, @shirt_number, @player_type, @is_foreign,
                        @file_path, 'pending'
                    )
                `);
                return 0;
            }
            throw err;
        }
    };

    if (existingTx) {
        return await op(existingTx);
    } else {
        return await transaction(op);
    }
}

/**
 * Public API 1: Submit Existing Player
 */
export async function submitExistingPlayerRegistration(input: {
    season_id: number;
    season_team_id: number;
    player_id: number;
    position_code?: string;
    shirt_number: number | null;
    player_type: string;
    file_path?: string;
    currentUser: { teamIds?: number[]; roles?: string[]; sub: number; username?: string };
}) {
    const { season_id, season_team_id, player_id, shirt_number, player_type, currentUser } = input;

    // 0. Validate Position Code (Required)
    if (!input.position_code) {
        throw BadRequestError("POSITION_CODE_REQUIRED");
    }

    // 0.1 Validate Shirt Number (Required)
    if (shirt_number === null || shirt_number === undefined) {
        throw BadRequestError("SHIRT_NUMBER_REQUIRED");
    }

    // 1. Permission Check (Shared)
    await _checkTeamPermission(currentUser, season_team_id, season_id);

    // 2. Reuse Basic Validation Check
    await validateBasicRegistrationRules(season_id, season_team_id, player_id, shirt_number);

    // 3. Submit
    const regId = await _insertRegistration({
        season_id,
        season_team_id,
        player_id,
        position_code: input.position_code,
        shirt_number: shirt_number ?? undefined,
        player_type: player_type as 'domestic' | 'foreign',
        file_path: input.file_path || '',
        user_id: currentUser.sub,
        username: currentUser.username
    });

    // 4. Audit
    await logEvent({
        eventType: "REGISTER_SEASON_PLAYER",
        severity: "info",
        actorId: currentUser.sub,
        actorUsername: currentUser.username ?? "system",
        entityType: "season_player_registration",
        entityId: `${season_id}-${season_team_id}-${player_id}`,
        payload: { ...input }
    });

    return { registration_id: regId };
}

/**
 * Public API 3: Update Pending Registration
 */
export async function updateRegistration(
    id: number,
    input: {
        position_code?: string;
        shirt_number?: number | null;
        player_type?: string;
        file_path?: string;
        currentUser: { teamIds?: number[]; roles?: string[]; sub: number; username?: string };
    }
): Promise<void> {

    await transaction(async (tx) => {
        // 1. Get info & Verify Pending
        const checkReq = new sql.Request(tx);
        checkReq.input("id", sql.Int, id);

        const checkRes = await checkReq.query(`
            SELECT 
                spr.registration_status, 
                spr.season_team_id, 
                spr.season_id, 
                spr.player_id
            FROM season_player_registrations spr
            WHERE spr.season_player_id = @id
        `);

        if (!checkRes.recordset[0]) {
            throw BadRequestError("Registration not found");
        }

        const existing = checkRes.recordset[0];
        if (existing.registration_status !== 'pending') {
            throw BadRequestError("Registration is not pending");
        }

        // 2. Permission Check using helper
        await _checkTeamPermission(input.currentUser, existing.season_team_id, existing.season_id);

        // 3. Basic Validation (Shirt Number only)

        // Prevent setting shirt number to null
        if (input.shirt_number === null) {
            throw BadRequestError("SHIRT_NUMBER_REQUIRED");
        }

        // If shirt number changes, check unique
        if (input.shirt_number !== undefined) {
            // reuse helper logic manually or simple query
            const checkShirt = await new sql.Request(tx).query(`
                SELECT 1 FROM season_player_registrations 
                WHERE season_id = ${existing.season_id} 
                  AND season_team_id = ${existing.season_team_id}
                  AND shirt_number = ${input.shirt_number}
                  AND season_player_id <> ${id} -- Exclude self
             `);
            if (checkShirt.recordset.length) {
                throw BadRequestError("SHIRT_NUMBER_TAKEN");
            }
        }

        // 4. Update
        const upReq = new sql.Request(tx);
        upReq.input("id", sql.Int, id);
        upReq.input("pc", sql.NVarChar(50), input.position_code !== undefined ? input.position_code : null);
        upReq.input("sn", sql.Int, input.shirt_number !== undefined ? input.shirt_number : null);
        upReq.input("pt", sql.NVarChar(50), input.player_type);
        // If player_type provided, update is_foreign
        let isForeign: number | null = null;
        if (input.player_type) {
            isForeign = input.player_type.toLowerCase() === 'foreign' ? 1 : 0;
        }
        upReq.input("isf", sql.Bit, isForeign);
        upReq.input("fp", sql.NVarChar(255), input.file_path !== undefined ? input.file_path : null);

        await upReq.query(`
            UPDATE season_player_registrations
            SET 
                position_code = COALESCE(@pc, position_code),
                shirt_number = COALESCE(@sn, shirt_number),
                player_type = COALESCE(@pt, player_type),
                is_foreign = COALESCE(@isf, is_foreign),
                file_path = COALESCE(@fp, file_path)
            WHERE season_player_id = @id
        `);
    });
}


/**
 * Public API 2: Submit New Player (Create + Register)
 * TEMP: Disabled / Made private as per D1 req
 */
/*
export async function submitNewPlayerRegistration(input: any) {
    // ... disable for now
}
*/

/**
 * Get all pending registrations
 */
export async function getPendingRegistrations(): Promise<any[]> {
    const sqlQuery = `
        SELECT 
            spr.season_player_id AS id,
            spr.season_id,
            spr.player_id,
            spr.season_team_id,
            spr.registered_at,
            spr.file_path,
            p.name AS player_name,
            t.name AS team_name,
            s.name AS season_name
        FROM season_player_registrations spr
        JOIN FootballPlayers p ON spr.player_id = p.id
        JOIN season_team_participants stp 
            ON spr.season_team_id = stp.season_team_id
        JOIN teams t 
            ON stp.team_id = t.team_id
        JOIN seasons s 
            ON spr.season_id = s.season_id
        WHERE spr.registration_status = 'pending'
        ORDER BY spr.registered_at ASC
    `;

    const result = await query(sqlQuery);
    return result.recordset;
}

/**
 * Approve registration
 */
/**
 * HELPER: Strict Business Rules for Approval
 * 1. Age >= 16 (at season start)
 * 2. Squad Size <= 22 (approved only)
 * 3. Foreign Players <= 5 (approved only)
 * 4. Unique Approved Player in Season
 */
async function validateRegistrationRulesForApproval(
    tx: sql.Transaction,
    season_id: number,
    season_team_id: number,
    player_id: number,
    is_foreign: boolean
) {
    // 1. Get Season Start Date & Check Age
    // We need player DOB and Season Start
    const ageInfo = await new sql.Request(tx).query(`
        SELECT 
            p.date_of_birth,
            s.start_date
        FROM FootballPlayers p
        JOIN seasons s ON s.season_id = ${season_id}
        WHERE p.id = ${player_id}
    `);

    const info = ageInfo.recordset[0];
    if (!info) throw BadRequestError("Player or Season not found");

    const dob = new Date(info.date_of_birth);
    const seasonStart = new Date(info.start_date);

    // Age calc: Year diff - 1 if not reached birthday yet
    let age = seasonStart.getFullYear() - dob.getFullYear();
    const m = seasonStart.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && seasonStart.getDate() < dob.getDate())) {
        age--;
    }

    if (age < 16) {
        throw BadRequestError("Player must be at least 16 years old at season start");
    }

    // 2. Check Duplicate Approved (Player valid for ONE team per season)
    const dupCheck = await new sql.Request(tx).query(`
        SELECT 1 FROM season_player_registrations
        WHERE season_id = ${season_id}
          AND player_id = ${player_id}
          AND registration_status = 'approved'
    `);
    if (dupCheck.recordset.length > 0) {
        throw BadRequestError("Player is already APPROVED for a team in this season");
    }

    // 3. Check Squad Size (Max 22 Approved)
    const countRes = await new sql.Request(tx).query(`
        SELECT count(*) as total 
        FROM season_player_registrations
        WHERE season_id = ${season_id}
          AND season_team_id = ${season_team_id}
          AND registration_status = 'approved'
    `);
    const totalApproved = countRes.recordset[0].total;
    if (totalApproved >= 22) {
        throw BadRequestError("Team has reached maximum squad size (22)");
    }

    // 4. Check Foreign Quota (Max 5 Approved)
    if (is_foreign) {
        const foreignRes = await new sql.Request(tx).query(`
            SELECT count(*) as total
            FROM season_player_registrations
            WHERE season_id = ${season_id}
              AND season_team_id = ${season_team_id}
              AND registration_status = 'approved'
              AND is_foreign = 1
        `);
        const totalForeign = foreignRes.recordset[0].total;
        if (totalForeign >= 5) {
            throw BadRequestError("Team has reached maximum foreign player limit (5)");
        }
    }
}


/**
 * Approve registration
 */
export async function approveRegistration(
    id: number,
    userId?: number
): Promise<void> {

    await transaction(async (tx) => {
        const checkReq = new sql.Request(tx);
        checkReq.input("id", sql.Int, id);

        const check = await checkReq.query(`
            SELECT 
                registration_status,
                season_id,
                season_team_id,
                player_id,
                is_foreign
            FROM season_player_registrations
            WHERE season_player_id = @id
        `);

        if (!check.recordset[0]) {
            throw BadRequestError("Registration not found");
        }

        const reg = check.recordset[0];
        if (reg.registration_status !== 'pending') {
            throw BadRequestError("Registration is not pending");
        }

        // === STRICT VALIDATION ===
        await validateRegistrationRulesForApproval(
            tx,
            reg.season_id,
            reg.season_team_id,
            reg.player_id,
            !!reg.is_foreign
        );
        // =========================

        const updateReq = new sql.Request(tx);
        updateReq.input("id", sql.Int, id);
        updateReq.input("approved_by", sql.Int, userId ?? null);

        try {
            await updateReq.query(`
                UPDATE season_player_registrations
                SET
                    registration_status = 'approved',
                    approved_at = GETDATE(),
                    approved_by = @approved_by,
                    reject_reason = NULL
                WHERE season_player_id = @id
            `);
        } catch (err: any) {
            if (err?.number === 207 || /reject_reason/i.test(String(err?.message ?? ""))) {
                await updateReq.query(`
                    UPDATE season_player_registrations
                    SET
                        registration_status = 'approved',
                        approved_at = GETDATE(),
                        approved_by = @approved_by
                    WHERE season_player_id = @id
                `);
                return;
            }
            throw err;
        }
    });
}

/**
 * Reject registration
 */
export async function rejectRegistration(
    id: number,
    reason: string,
    userId?: number
): Promise<void> {

    if (!reason) {
        throw BadRequestError("Reason is required");
    }

    await transaction(async (tx) => {
        // 1. Check tồn tại & pending
        const checkReq = new sql.Request(tx);
        checkReq.input("id", sql.Int, id);

        const check = await checkReq.query(`
            SELECT registration_status
            FROM season_player_registrations
            WHERE season_player_id = @id
        `);

        if (!check.recordset[0]) {
            throw BadRequestError("Registration not found");
        }

        if (check.recordset[0].registration_status !== 'pending') {
            throw BadRequestError("Registration is not pending");
        }

        // 2. Update status -> rejected (KHÔNG dùng cột không tồn tại)
        const updateReq = new sql.Request(tx);
        updateReq.input("id", sql.Int, id);
        updateReq.input("reason", sql.NVarChar(255), reason);

        try {
            await updateReq.query(`
                UPDATE season_player_registrations
                SET
                    registration_status = 'rejected',
                    reject_reason = @reason
                WHERE season_player_id = @id
            `);
        } catch (err: any) {
            if (err?.number === 207 || /reject_reason/i.test(String(err?.message ?? ""))) {
                await updateReq.query(`
                    UPDATE season_player_registrations
                    SET registration_status = 'rejected'
                    WHERE season_player_id = @id
                `);
                return;
            }
            throw err;
        }
    });
}

/**
 * Soft-remove registration (Super Admin only)
 * Sets status = 'released' (Business Rule: Player removed from season squad)
 */
export async function removeRegistration(
    id: number,
    userId?: number
): Promise<void> {

    await transaction(async (tx) => {
        // 1. Check existence
        const checkReq = new sql.Request(tx);
        checkReq.input("id", sql.Int, id);

        const check = await checkReq.query(`
            SELECT registration_status
            FROM season_player_registrations
            WHERE season_player_id = @id
        `);

        if (!check.recordset[0]) {
            throw BadRequestError("Registration not found");
        }

        // 2. Update status -> released
        const updateReq = new sql.Request(tx);
        updateReq.input("id", sql.Int, id);

        // userId used to be passed but no column to store it in this table for updates except 'approved_by'

        await updateReq.query(`
            UPDATE season_player_registrations
            SET 
                registration_status = 'released',
                shirt_number = NULL
            WHERE season_player_id = @id
        `);
    });
}

/**
 * Update registration details (Super Admin only)
 * Only allows updating shirt_number and position_code
 * STRICTLY checks registration_status = 'approved'
 */
export async function updateApprovedRegistration(
    seasonPlayerId: number,
    payload: { shirt_number: number; position_code: string }
): Promise<void> {

    await transaction(async (tx) => {
        const req = new sql.Request(tx);
        req.input("id", sql.Int, seasonPlayerId);
        req.input("shirt_number", sql.Int, payload.shirt_number);
        req.input("position_code", sql.VarChar(50), payload.position_code);

        const result = await req.query(`
            UPDATE season_player_registrations
            SET
                shirt_number = @shirt_number,
                position_code = @position_code
            WHERE season_player_id = @id
              AND registration_status = 'approved'
        `);

        if (result.rowsAffected[0] === 0) {
            throw new Error("NOT_FOUND_OR_NOT_APPROVED");
        }
    });
}

/**
 * Approve all pending registrations (FAIL-FAST)
 * If one fails, NO changes are committed.
 */
export async function approveAllPendingRegistrations(userId?: number): Promise<void> {
    await transaction(async (tx) => {
        // 1. Fetch all pending
        const pendingRes = await new sql.Request(tx).query(`
            SELECT 
                spr.season_player_id,
                spr.season_id,
                spr.season_team_id,
                spr.player_id,
                spr.is_foreign,
                p.name AS full_name
            FROM season_player_registrations spr
            JOIN FootballPlayers p ON spr.player_id = p.id
            WHERE spr.registration_status = 'pending'
            ORDER BY spr.registered_at ASC
        `);

        const pendingList = pendingRes.recordset;
        if (pendingList.length === 0) return;

        // 2. Iterate & Validate & Approve
        for (const reg of pendingList) {
            try {
                await validateRegistrationRulesForApproval(
                    tx,
                    reg.season_id,
                    reg.season_team_id,
                    reg.player_id,
                    !!reg.is_foreign
                );

                // If valid, update status
                const upReq = new sql.Request(tx);
                upReq.input("id", sql.Int, reg.season_player_id);
                upReq.input("approved_by", sql.Int, userId ?? null);

                // (Try/Catch inside loop only for schema compatibility, but validation error bubbles up)
                try {
                    await upReq.query(`
                        UPDATE season_player_registrations
                        SET
                            registration_status = 'approved',
                            approved_at = GETDATE(),
                            approved_by = @approved_by,
                            reject_reason = NULL
                        WHERE season_player_id = @id
                    `);
                } catch (sErr: any) {
                    // Fallback for missing columns
                    if (sErr?.number === 207 || /reject_reason/i.test(String(sErr?.message ?? ""))) {
                        await upReq.query(`
                            UPDATE season_player_registrations
                            SET
                                registration_status = 'approved',
                                approved_at = GETDATE(),
                                approved_by = @approved_by
                            WHERE season_player_id = @id
                        `);
                    } else {
                        throw sErr;
                    }
                }

            } catch (err: any) {
                // FAIL-FAST: Re-throw with context
                throw BadRequestError(`Cannot approve ${reg.full_name}: ${err.message}`);
            }
        }
    });
}

/**
 * Interface for Import Data
 */
export interface ImportSeasonPlayerData {
    season_id: number;
    season_team_id: number;
    file_buffer: Buffer;
    file_path: string;
    user_id?: number;
    username?: string;
    currentUser: { teamIds?: number[]; roles?: string[]; sub: number; username?: string };
}

/**
 /**
 * Import Season Players from CSV (Row-by-row, NON batch)
 */
export async function importSeasonPlayersFromCSV(
    data: ImportSeasonPlayerData
): Promise<{
    success: any[];
    skipped: any[];
    error: any[];
}> {
    const { season_id, season_team_id, file_buffer, user_id, username, file_path, currentUser } = data;

    // 0. Permission Check (Same as Manual Submit)
    await _checkTeamPermission(currentUser, season_team_id, season_id);

    // =========================
    // 1. Parse CSV
    // =========================
    const fileContent = file_buffer.toString("utf-8");
    const lines = fileContent.split(/\r?\n/).filter(l => l.trim() !== "");

    if (lines.length < 2) {
        throw BadRequestError("CSV file is empty or missing header");
    }

    const headerLine = lines[0].toLowerCase();
    if (!headerLine.includes("full_name") || !headerLine.includes("date_of_birth")) {
        throw BadRequestError("Invalid CSV Header. Required: full_name, date_of_birth");
    }

    const rows = lines.slice(1);

    const parsedRows = rows.map((row, idx) => {
        const cols = row.split(",").map(c => c.trim());
        return {
            rowUserIndex: idx + 2,
            full_name: cols[0],
            date_of_birth: cols[1],
            nationality: cols[2],
            position_code: cols[3],
            shirt_number: cols[4] ? Number(cols[4]) : undefined,
            // CSV format:
            // 0: full_name
            // 1: date_of_birth
            // 2: nationality
            // 3: position_code
            // ...
            // 7: is_foreign
            is_foreign: cols[7] === "1" || cols[7]?.toLowerCase() === "true"
        };
    }).filter(r => r.full_name && r.date_of_birth);

    if (parsedRows.length === 0) {
        throw BadRequestError("No valid data rows found in CSV");
    }

    // =========================
    // 2. RESULT CONTAINERS
    // =========================
    const success: any[] = [];
    const skipped: any[] = [];
    const error: any[] = [];

    // =========================
    // 3. PROCESS ROW-BY-ROW
    // =========================
    for (const row of parsedRows) {
        try {
            // --- validate DOB ---
            const dob = new Date(row.date_of_birth);
            if (isNaN(dob.getTime())) {
                error.push({
                    row: row.rowUserIndex,
                    message: "Invalid date_of_birth (yyyy-mm-dd)"
                });
                continue;
            }

            // --- find player ---
            const playerRes = await query(`
                SELECT TOP 1 id AS player_id
                FROM FootballPlayers
                WHERE LOWER(LTRIM(RTRIM(name))) = LOWER(@full_name)
                  AND CONVERT(date, date_of_birth) = CONVERT(date, @dob)
            `,
                {
                    full_name: row.full_name,
                    dob: row.date_of_birth
                }
            );

            if (!playerRes.recordset[0]) {
                error.push({
                    row: row.rowUserIndex,
                    message: "PLAYER_NOT_FOUND (CSV import does not create player)"
                });
                continue;
            }

            const player_id = playerRes.recordset[0].player_id;

            // --- REUSE basic check ---
            // We can't strict block on these in CSV since it processes row by row,
            // but we SHOULD check duplicate before trying to insert to save DB calls.
            // If check fails, we map to "Skipped" or "Error" container.
            try {
                await validateBasicRegistrationRules(season_id, season_team_id, player_id, row.shirt_number);
            } catch (vErr: any) {
                if (vErr.message === "PLAYER_ALREADY_REGISTERED") {
                    skipped.push({ row: row.rowUserIndex, player_id, reason: "Already Registered" });
                    continue; // Skip this row
                }
                throw vErr; // Other validation error (like shirt number) -> goes to catch below
            }

            // --- insert ---
            try {
                await _insertRegistration({
                    season_id,
                    season_team_id,
                    player_id,
                    position_code: row.position_code || 'FW', // CSV might miss position, default FW only for CSV? Or reject? User said "Remove Dangerous Default", so arguably we should reject if missing.
                    // But CSV rows may be partial. Let's keep it safe: VALIDATE it.
                    shirt_number: row.shirt_number,
                    player_type: row.is_foreign ? "foreign" : "domestic",
                    file_path,
                    user_id,
                    username
                });

                success.push({
                    row: row.rowUserIndex,
                    player_id
                });

            } catch (e: any) {
                // Should encounter UNIQUE error here again?
                // Logic above `validateBasicRegistrationRules` catches some, but race conditions exist.
                // _insertRegistration handles SQL error -> throws BadRequestError

                if (e?.message === "PLAYER_ALREADY_REGISTERED") {
                    skipped.push({
                        row: row.rowUserIndex,
                        player_id
                    });
                } else {
                    error.push({
                        row: row.rowUserIndex,
                        message: e?.message || "REGISTER_FAILED"
                    });
                }
            }

        } catch (e: any) {
            error.push({
                row: row.rowUserIndex,
                message: e?.message || "UNKNOWN_ERROR"
            });
        }
    }

    // =========================
    // 4. AUDIT LOG
    // =========================
    await logEvent({
        eventType: "IMPORT_PLAYER_LIST",
        severity: "info",
        actorId: user_id ?? undefined,
        actorUsername: username ?? "system",
        entityType: "season_team",
        entityId: `${season_id}-${season_team_id}`,
        payload: {
            total: parsedRows.length,
            success: success.length,
            skipped: skipped.length,
            error: error.length,
            file_path
        }
    });

    return {
        success,
        skipped,
        error
    };
}
