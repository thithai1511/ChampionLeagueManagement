-- Create player_suspensions table for disciplinary system
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[player_suspensions]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[player_suspensions](
        [suspension_id] [int] IDENTITY(1,1) NOT NULL,
        [season_id] [int] NOT NULL,
        [season_player_id] [int] NOT NULL,
        [season_team_id] [int] NOT NULL,
        [reason] [nvarchar](50) NOT NULL, -- 'RED_CARD', 'TWO_YELLOW_CARDS', 'DISCIPLINARY_ACTION'
        [trigger_match_id] [int] NULL, -- The match where the card(s) occurred
        [matches_banned] [int] DEFAULT 1,
        [start_match_id] [int] NULL, -- The first match of the suspension
        [served_matches] [int] DEFAULT 0,
        [status] [nvarchar](20) DEFAULT 'active', -- 'active', 'served', 'archived'
        [notes] [nvarchar](max) NULL,
        [created_at] [datetime] DEFAULT GETDATE(),
        [updated_at] [datetime] DEFAULT GETDATE(),
        CONSTRAINT [PK_player_suspensions] PRIMARY KEY CLUSTERED ([suspension_id] ASC)
    );

    ALTER TABLE [dbo].[player_suspensions]  WITH CHECK ADD  CONSTRAINT [FK_player_suspensions_seasons] FOREIGN KEY([season_id])
    REFERENCES [dbo].[seasons] ([season_id]);

    ALTER TABLE [dbo].[player_suspensions]  WITH CHECK ADD  CONSTRAINT [FK_player_suspensions_season_player_registrations] FOREIGN KEY([season_player_id])
    REFERENCES [dbo].[season_player_registrations] ([season_player_id]);

    ALTER TABLE [dbo].[player_suspensions]  WITH CHECK ADD  CONSTRAINT [FK_player_suspensions_season_team_participants] FOREIGN KEY([season_team_id])
    REFERENCES [dbo].[season_team_participants] ([season_team_id]);

    ALTER TABLE [dbo].[player_suspensions]  WITH CHECK ADD  CONSTRAINT [FK_player_suspensions_matches_trigger] FOREIGN KEY([trigger_match_id])
    REFERENCES [dbo].[matches] ([match_id]);

    ALTER TABLE [dbo].[player_suspensions]  WITH CHECK ADD  CONSTRAINT [FK_player_suspensions_matches_start] FOREIGN KEY([start_match_id])
    REFERENCES [dbo].[matches] ([match_id]);

    PRINT 'Created player_suspensions table successfully.';
END
ELSE
BEGIN
    PRINT 'player_suspensions table already exists.';
END
