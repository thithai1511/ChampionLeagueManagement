import sql from "mssql";
import { db } from "../db";

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
     * Create a notification for a user
     */
    static async createNotification(data: NotificationData): Promise<void> {
        try {
            const pool = await db.getPool();
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
