-- Migration 022: Create notifications table
-- For in-app notifications between referee and admin

PRINT 'Creating notifications table...';
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'notifications')
BEGIN
    CREATE TABLE notifications (
        id INT IDENTITY(1,1) PRIMARY KEY,
        user_id INT NOT NULL,
        type NVARCHAR(50) NOT NULL, -- 'report_submitted', 'report_reviewed', etc.
        title NVARCHAR(255) NOT NULL,
        message NVARCHAR(MAX) NULL,
        related_entity NVARCHAR(50) NULL, -- 'match', 'report', etc.
        related_id INT NULL,
        action_url NVARCHAR(500) NULL,
        is_read BIT NOT NULL DEFAULT 0,
        read_at DATETIME2 NULL,
        created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        
        CONSTRAINT FK_notifications_user FOREIGN KEY (user_id) 
            REFERENCES user_accounts(user_id) ON DELETE CASCADE
    );
    
    CREATE INDEX IX_notifications_user_unread ON notifications(user_id, is_read, created_at DESC);
    CREATE INDEX IX_notifications_created ON notifications(created_at DESC);
    
    PRINT 'notifications table created successfully';
END
ELSE
BEGIN
    PRINT 'notifications table already exists';
END
GO

PRINT 'Migration 022 completed successfully!';
GO


