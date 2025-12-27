-- Migration: 002_add_missing_features.sql
-- Description: Add tables for season invitations, stadiums, match officials, match reports, player of match, and related tables

-- Season Invitations Table
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'season_invitations')
BEGIN
    CREATE TABLE season_invitations (
        invitation_id INT PRIMARY KEY IDENTITY(1,1),
        season_id INT NOT NULL,
        team_id INT NOT NULL,
        invited_by_user_id INT NOT NULL,
        sent_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        response_status NVARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (response_status IN ('pending', 'accepted', 'rejected', 'expired')),
        response_date DATETIME2 NULL,
        response_notes NVARCHAR(MAX) NULL,
        deadline DATETIME2 NOT NULL,
        created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        FOREIGN KEY (season_id) REFERENCES seasons(season_id),
        FOREIGN KEY (team_id) REFERENCES teams(team_id),
        FOREIGN KEY (invited_by_user_id) REFERENCES users(user_id)
    );
    
    CREATE INDEX idx_season_invitations_season_id ON season_invitations(season_id);
    CREATE INDEX idx_season_invitations_team_id ON season_invitations(team_id);
    CREATE INDEX idx_season_invitations_status ON season_invitations(response_status);
END;

-- Stadiums Table
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'stadiums')
BEGIN
    CREATE TABLE stadiums (
        stadium_id INT PRIMARY KEY IDENTITY(1,1),
        name NVARCHAR(255) NOT NULL,
        location NVARCHAR(255) NOT NULL,
        city NVARCHAR(100) NOT NULL,
        capacity INT NOT NULL,
        country NVARCHAR(100) NOT NULL,
        surface_type NVARCHAR(50) DEFAULT 'grass',
        year_built INT NULL,
        team_id INT NULL,
        managed_by_user_id INT NULL,
        is_active BIT NOT NULL DEFAULT 1,
        created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        updated_at DATETIME2 NULL,
        FOREIGN KEY (team_id) REFERENCES teams(team_id),
        FOREIGN KEY (managed_by_user_id) REFERENCES users(user_id)
    );
    
    CREATE INDEX idx_stadiums_team_id ON stadiums(team_id);
    CREATE INDEX idx_stadiums_city ON stadiums(city);
    CREATE INDEX idx_stadiums_country ON stadiums(country);
    CREATE INDEX idx_stadiums_is_active ON stadiums(is_active);
END;

-- Match Official Assignments Table
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'match_official_assignments')
BEGIN
    CREATE TABLE match_official_assignments (
        assignment_id INT PRIMARY KEY IDENTITY(1,1),
        match_id INT NOT NULL,
        official_id INT NOT NULL,
        official_role NVARCHAR(50) NOT NULL CHECK (official_role IN ('referee', 'assistant_referee', 'fourth_official', 'video_assistant_referee')),
        assigned_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        assigned_by_user_id INT NOT NULL,
        is_confirmed BIT NOT NULL DEFAULT 0,
        confirmed_at DATETIME2 NULL,
        confirmation_notes NVARCHAR(MAX) NULL,
        created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        FOREIGN KEY (match_id) REFERENCES matches(match_id),
        FOREIGN KEY (official_id) REFERENCES officials(official_id),
        FOREIGN KEY (assigned_by_user_id) REFERENCES users(user_id)
    );
    
    CREATE INDEX idx_match_official_assignments_match_id ON match_official_assignments(match_id);
    CREATE INDEX idx_match_official_assignments_official_id ON match_official_assignments(official_id);
    CREATE INDEX idx_match_official_assignments_is_confirmed ON match_official_assignments(is_confirmed);
END;

-- Match Reports Table
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'match_reports')
BEGIN
    CREATE TABLE match_reports (
        report_id INT PRIMARY KEY IDENTITY(1,1),
        match_id INT NOT NULL,
        reported_by_user_id INT NOT NULL,
        attendance INT NULL,
        weather_condition NVARCHAR(100) NULL,
        match_summary NVARCHAR(MAX) NULL,
        incidents NVARCHAR(MAX) NULL,
        injuries_reported NVARCHAR(MAX) NULL,
        referee_notes NVARCHAR(MAX) NULL,
        submitted_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        updated_at DATETIME2 NULL,
        FOREIGN KEY (match_id) REFERENCES matches(match_id),
        FOREIGN KEY (reported_by_user_id) REFERENCES users(user_id),
        UNIQUE (match_id)
    );
    
    CREATE INDEX idx_match_reports_match_id ON match_reports(match_id);
    CREATE INDEX idx_match_reports_reported_by_user_id ON match_reports(reported_by_user_id);
END;

-- Player of Match Table
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'player_of_match')
BEGIN
    CREATE TABLE player_of_match (
        pom_id INT PRIMARY KEY IDENTITY(1,1),
        match_id INT NOT NULL,
        player_id INT NOT NULL,
        team_id INT NOT NULL,
        selected_by_method NVARCHAR(50) NOT NULL CHECK (selected_by_method IN ('referee', 'team_captain', 'fan_vote', 'statistics')),
        votes_count INT NULL,
        rating DECIMAL(3,1) NULL,
        selected_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        FOREIGN KEY (match_id) REFERENCES matches(match_id),
        FOREIGN KEY (player_id) REFERENCES players(player_id),
        FOREIGN KEY (team_id) REFERENCES teams(team_id),
        UNIQUE (match_id)
    );
    
    CREATE INDEX idx_player_of_match_match_id ON player_of_match(match_id);
    CREATE INDEX idx_player_of_match_player_id ON player_of_match(player_id);
    CREATE INDEX idx_player_of_match_team_id ON player_of_match(team_id);
END;

-- Player of Match Votes Table (for fan voting)
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'player_of_match_votes')
BEGIN
    CREATE TABLE player_of_match_votes (
        vote_id INT PRIMARY KEY IDENTITY(1,1),
        match_id INT NOT NULL,
        player_id INT NOT NULL,
        voter_user_id INT NULL,
        voter_ip NVARCHAR(50) NULL,
        voted_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        FOREIGN KEY (match_id) REFERENCES matches(match_id),
        FOREIGN KEY (player_id) REFERENCES players(player_id),
        FOREIGN KEY (voter_user_id) REFERENCES users(user_id)
    );
    
    CREATE INDEX idx_player_of_match_votes_match_id ON player_of_match_votes(match_id);
    CREATE INDEX idx_player_of_match_votes_player_id ON player_of_match_votes(player_id);
END;

-- Participation Fees Table
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'participation_fees')
BEGIN
    CREATE TABLE participation_fees (
        fee_id INT PRIMARY KEY IDENTITY(1,1),
        season_id INT NOT NULL,
        team_id INT NOT NULL,
        fee_amount DECIMAL(15,2) NOT NULL,
        currency NVARCHAR(10) NOT NULL DEFAULT 'VND',
        due_date DATETIME2 NOT NULL,
        paid_at DATETIME2 NULL,
        is_paid BIT NOT NULL DEFAULT 0,
        payment_method NVARCHAR(100) NULL,
        payment_reference NVARCHAR(255) NULL,
        created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        FOREIGN KEY (season_id) REFERENCES seasons(season_id),
        FOREIGN KEY (team_id) REFERENCES teams(team_id),
        UNIQUE (season_id, team_id)
    );
    
    CREATE INDEX idx_participation_fees_season_id ON participation_fees(season_id);
    CREATE INDEX idx_participation_fees_team_id ON participation_fees(team_id);
    CREATE INDEX idx_participation_fees_is_paid ON participation_fees(is_paid);
END;

-- Add column to matches table if not exists (for stadium)
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'matches' AND COLUMN_NAME = 'stadium_id')
BEGIN
    ALTER TABLE matches ADD stadium_id INT NULL;
    ALTER TABLE matches ADD CONSTRAINT fk_matches_stadium_id FOREIGN KEY (stadium_id) REFERENCES stadiums(stadium_id);
    CREATE INDEX idx_matches_stadium_id ON matches(stadium_id);
END;

-- Add is_foreign column to players table if not exists
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'players' AND COLUMN_NAME = 'is_foreign')
BEGIN
    ALTER TABLE players ADD is_foreign BIT NOT NULL DEFAULT 0;
    CREATE INDEX idx_players_is_foreign ON players(is_foreign);
END;

-- Add height and weight columns to players table if not exists
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'players' AND COLUMN_NAME = 'height_cm')
BEGIN
    ALTER TABLE players ADD height_cm INT NULL;
END;

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'players' AND COLUMN_NAME = 'weight_kg')
BEGIN
    ALTER TABLE players ADD weight_kg INT NULL;
END;

-- Add round column to matches table if not exists
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'matches' AND COLUMN_NAME = 'round')
BEGIN
    ALTER TABLE matches ADD round INT NULL;
    CREATE INDEX idx_matches_round ON matches(round);
END;
