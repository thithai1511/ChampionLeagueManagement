-- Create player_of_match table for MVP tracking
-- Run this in SSMS after selecting ChampionLeagueManagement database

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'player_of_match')
BEGIN
    CREATE TABLE player_of_match (
        pom_id INT IDENTITY(1,1) PRIMARY KEY,
        match_id INT NOT NULL,
        player_id INT NOT NULL,
        team_id INT NOT NULL,
        selected_by_method VARCHAR(20) NOT NULL 
            CHECK (selected_by_method IN ('referee', 'team_captain', 'fan_vote', 'statistics')),
        votes_count INT NULL,
        rating DECIMAL(3,1) NULL CHECK (rating >= 0 AND rating <= 10),
        selected_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        
        CONSTRAINT FK_player_of_match_match FOREIGN KEY (match_id) REFERENCES matches(match_id) ON DELETE CASCADE,
        CONSTRAINT FK_player_of_match_player FOREIGN KEY (player_id) REFERENCES players(player_id),
        CONSTRAINT FK_player_of_match_team FOREIGN KEY (team_id) REFERENCES teams(team_id),
        CONSTRAINT UQ_player_of_match_per_match UNIQUE (match_id)
    );

    CREATE INDEX IX_player_of_match_player ON player_of_match(player_id);
    CREATE INDEX IX_player_of_match_team ON player_of_match(team_id);
    CREATE INDEX IX_player_of_match_match ON player_of_match(match_id);

    PRINT 'Created player_of_match table';
END
ELSE
BEGIN
    PRINT 'Table player_of_match already exists';
END
