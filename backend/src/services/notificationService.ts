import sql from "mssql";
import { getPool } from "../db/sqlServer";

// import { MatchRecord } from "./matchService"; 

interface MatchSummary {
    homeTeamName: string;
    awayTeamName: string;
    homeScore: number | null;
    awayScore: number | null;
}

interface NotificationData {
    userId: number;
    type: string;
    title: string;
    message: string;
    relatedEntity?: string;
    relatedId?: number;
    actionUrl?: string;
}

export class NotificationService {
    /**
     * Create a notification for a user (static method)
     */
    static async createNotification(data: NotificationData): Promise<void> {
        try {
            const pool = await getPool();
            await pool.request()
                .input("userId", sql.Int, data.userId)
                .input("type", sql.NVarChar(50), data.type)
                .input("title", sql.NVarChar(255), data.title)
                .input("message", sql.NVarChar(sql.MAX), data.message)
                .input("relatedEntity", sql.NVarChar(50), data.relatedEntity || null)
                .input("relatedId", sql.Int, data.relatedId || null)
                .input("actionUrl", sql.NVarChar(500), data.actionUrl || null)
                .query(`
                    INSERT INTO notifications 
                    (user_id, type, title, message, related_entity, related_id, action_url, created_at, is_read)
                    VALUES 
                    (@userId, @type, @title, @message, @relatedEntity, @relatedId, @actionUrl, GETDATE(), 0)
                `);
            
            console.log(`[NotificationService] 🔔 Notification sent to user ${data.userId}: ${data.title}`);
        } catch (error) {
            console.error("[NotificationService] Error creating notification:", error);
            // Don't throw - notification failures shouldn't break the main flow
        }
    }

    /**
     * Instance method for creating notification
     */
    async createNotification(
        userId: number,
        type: string,
        title: string,
        message?: string,
        relatedEntity?: string,
        relatedId?: number,
        actionUrl?: string
    ): Promise<void> {
        return NotificationService.createNotification({
            userId,
            type,
            title,
            message: message || title,
            relatedEntity,
            relatedId,
            actionUrl
        });
    }

    /**
     * Send notification to all users with a specific role
     */
    static async notifyByRole(
        role: string,
        type: string,
        title: string,
        message: string,
        relatedEntity?: string,
        relatedId?: number,
        actionUrl?: string
    ): Promise<void> {
        try {
            const pool = await getPool();
            
            // Get all users with the specified role
            const usersResult = await pool.request()
                .input("roleCode", sql.NVarChar(100), role)
                .query(`
                    SELECT DISTINCT ua.user_id
                    FROM user_accounts ua
                    INNER JOIN user_role_assignments ura ON ua.user_id = ura.user_id
                    INNER JOIN roles r ON ura.role_id = r.role_id
                    WHERE r.code = @roleCode AND ua.status = 'active'
                `);

            for (const user of usersResult.recordset) {
                await NotificationService.createNotification({
                    userId: user.user_id,
                    type,
                    title,
                    message,
                    relatedEntity,
                    relatedId,
                    actionUrl
                });
            }

            console.log(`[NotificationService] 🔔 Notification sent to ${usersResult.recordset.length} users with role ${role}`);
        } catch (error) {
            console.error("[NotificationService] Error notifying by role:", error);
        }
    }

    /**
     * Get notifications for a user
     */
    static async getUserNotifications(userId: number, unreadOnly: boolean = false): Promise<any[]> {
        try {
            const pool = await getPool();
            let query = `
                SELECT * FROM notifications 
                WHERE user_id = @userId
            `;
            if (unreadOnly) {
                query += ` AND is_read = 0`;
            }
            query += ` ORDER BY created_at DESC`;

            const result = await pool.request()
                .input("userId", sql.Int, userId)
                .query(query);

            return result.recordset;
        } catch (error) {
            console.error("[NotificationService] Error getting notifications:", error);
            return [];
        }
    }

    /**
     * Mark notification as read
     */
    static async markAsRead(notificationId: number, userId: number): Promise<void> {
        try {
            const pool = await getPool();
            await pool.request()
                .input("notificationId", sql.Int, notificationId)
                .input("userId", sql.Int, userId)
                .query(`
                    UPDATE notifications 
                    SET is_read = 1, read_at = GETDATE()
                    WHERE id = @notificationId AND user_id = @userId
                `);
        } catch (error) {
            console.error("[NotificationService] Error marking as read:", error);
        }
    }

    /**
     * Mark all notifications as read for a user
     */
    static async markAllAsRead(userId: number): Promise<void> {
        try {
            const pool = await getPool();
            await pool.request()
                .input("userId", sql.Int, userId)
                .query(`
                    UPDATE notifications 
                    SET is_read = 1, read_at = GETDATE()
                    WHERE user_id = @userId AND is_read = 0
                `);
        } catch (error) {
            console.error("[NotificationService] Error marking all as read:", error);
        }
    }

    /**
     * Simulate sending a notification to all stakeholders about a match schedule change.
     */
    static async notifyMatchScheduleChange(
        match: any, // MatchRecord
        changes: {
            oldDate?: string; newDate?: string;
            oldStadium?: string; newStadium?: string;
        }
    ): Promise<void> {
        // In a real app, looking up subscribers, sending emails/push notifications, etc.
        console.log(`[NotificationService] 🔔 ALERT: Match ${match.homeTeamName} vs ${match.awayTeamName} changed!`);

        if (changes.newDate) {
            console.log(`[NotificationService] 📅 Date changed from ${changes.oldDate} to ${changes.newDate}`);
        }

        if (changes.newStadium) {
            console.log(`[NotificationService] 🏟️ Stadium moved from ${changes.oldStadium} to ${changes.newStadium}`);
        }

        // Simulate async delay
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    static async notifyMatchResult(match: any): Promise<void> {
        console.log(`[NotificationService] ⚽ RESULT: ${match.homeTeamName} ${match.homeScore} - ${match.awayScore} ${match.awayTeamName}`);
    }
}
