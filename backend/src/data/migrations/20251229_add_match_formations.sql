CREATE TABLE match_formations (
    match_formation_id INT IDENTITY(1,1) PRIMARY KEY,
    match_id INT NOT NULL REFERENCES matches(match_id) ON DELETE CASCADE,
    season_team_id INT NOT NULL REFERENCES season_team_participants(season_team_id),
    formation VARCHAR(20) NOT NULL, -- e.g. '4-4-2', '4-3-3'
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NULL,
    CONSTRAINT UQ_match_formation_team UNIQUE (match_id, season_team_id)
);
GO
