import { Router, Response } from "express";
import { requireAuth } from "../middleware/authMiddleware";
import { NotificationService } from "../services/notificationService";
import { AuthenticatedRequest } from "../types";

const router = Router();

/**
 * GET /api/notifications
 * Get current user's notifications
 */
router.get("/", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const unreadOnly = req.query.unread === 'true';
    const notifications = await NotificationService.getUserNotifications(userId, unreadOnly);
    
    res.json({ data: notifications });
  } catch (error: any) {
    console.error("Get notifications error:", error);
    res.status(500).json({ error: "Failed to get notifications" });
  }
});

/**
 * POST /api/notifications/send
 * Send notification (internal use - from referee to admin, etc.)
 */
router.post("/send", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { type, matchId, message, targetRole, targetUserId } = req.body;

    if (targetRole) {
      // Send to all users with the role
      await NotificationService.notifyByRole(
        targetRole,
        type || 'system',
        message || 'Có thông báo mới',
        message || '',
        'match',
        matchId
      );
    } else if (targetUserId) {
      // Send to specific user
      await NotificationService.createNotification({
        userId: targetUserId,
        type: type || 'system',
        title: message || 'Có thông báo mới',
        message: message || '',
        relatedEntity: 'match',
        relatedId: matchId
      });
    }

    res.json({ success: true, message: "Notification sent" });
  } catch (error: any) {
    console.error("Send notification error:", error);
    // Don't fail the request - notifications are optional
    res.json({ success: false, message: "Notification not sent" });
  }
});

/**
 * POST /api/notifications/:id/read
 * Mark notification as read
 */
router.post("/:id/read", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const notificationId = parseInt(req.params.id, 10);
    const userId = req.user?.sub;
    
    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    await NotificationService.markAsRead(notificationId, userId);
    res.json({ success: true });
  } catch (error: any) {
    console.error("Mark as read error:", error);
    res.status(500).json({ error: "Failed to mark notification as read" });
  }
});

/**
 * POST /api/notifications/read-all
 * Mark all notifications as read
 */
router.post("/read-all", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.sub;
    
    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    await NotificationService.markAllAsRead(userId);
    res.json({ success: true });
  } catch (error: any) {
    console.error("Mark all as read error:", error);
    res.status(500).json({ error: "Failed to mark all as read" });
  }
});

export default router;


