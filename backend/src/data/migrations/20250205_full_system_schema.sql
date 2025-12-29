
/* ============================================================
   RULESET GOVERNANCE
   ============================================================ */

CREATE TABLE rulesets (
    ruleset_id          INT             IDENTITY(1,1) PRIMARY KEY,
    name                VARCHAR(255)    NOT NULL UNIQUE,
    version_tag         VARCHAR(64)     NOT NULL,
    description         NVARCHAR(MAX)   NULL,
    is_active           BIT             NOT NULL DEFAULT 0,
    effective_from      DATE            NULL,
    effective_to        DATE            NULL,
    created_by          INT             NOT NULL,
    created_at          DATETIME2       NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_by          INT             NULL,
    updated_at          DATETIME2       NULL,
    CONSTRAINT CK_rulesets_effective CHECK (
        effective_from IS NULL OR effective_to IS NULL OR effective_from <= effective_to
    )
);

CREATE TABLE ruleset_player_constraints (
    constraint_id       INT             IDENTITY(1,1) PRIMARY KEY,
    ruleset_id          INT             NOT NULL REFERENCES rulesets(ruleset_id) ON DELETE CASCADE,
    min_age             TINYINT         NOT NULL CHECK (min_age >= 12),
    max_age             TINYINT         NOT NULL CHECK (max_age >= 16 AND max_age <= 99),
    max_players         TINYINT         NOT NULL CHECK (max_players BETWEEN 11 AND 40),
    max_foreign_players TINYINT         NOT NULL CHECK (max_foreign_players >= 0 AND max_foreign_players <= 22),
    squad_registration_deadline DATE    NULL,
    -- Table-level constraint for cross-column check
    CONSTRAINT CK_ruleset_player_age_range CHECK (max_age > min_age),
    CONSTRAINT CK_ruleset_foreign_limit CHECK (max_foreign_players <= max_players)
);

CREATE TABLE ruleset_scoring_rules (
    scoring_id          INT             IDENTITY(1,1) PRIMARY KEY,
    ruleset_id          INT             NOT NULL REFERENCES rulesets(ruleset_id) ON DELETE CASCADE,
    max_goal_time       TINYINT         NOT NULL CHECK (max_goal_time BETWEEN 30 AND 150),
    accepted_goal_types NVARCHAR(MAX)   NOT NULL -- JSON array of codes (open_play, penalty, etc.)
);

CREATE TABLE ruleset_ranking_rules (
    ranking_id          INT             IDENTITY(1,1) PRIMARY KEY,
    ruleset_id          INT             NOT NULL REFERENCES rulesets(ruleset_id) ON DELETE CASCADE,
    points_for_win      TINYINT         NOT NULL,
    points_for_draw     TINYINT         NOT NULL,
    points_for_loss     TINYINT         NOT NULL,
    tie_breaking_order  NVARCHAR(MAX)   NOT NULL -- JSON array describing priority metrics.
);

CREATE TABLE ruleset_audit_log (
    audit_id            INT             IDENTITY(1,1) PRIMARY KEY,
    ruleset_id          INT             NOT NULL REFERENCES rulesets(ruleset_id) ON DELETE CASCADE,
    action              VARCHAR(64)     NOT NULL, -- e.g. CREATED, UPDATED, PUBLISHED
    actor_id            INT             NOT NULL,
    actor_username      VARCHAR(150)    NOT NULL,
    details             NVARCHAR(MAX)   NULL,
    created_at          DATETIME2       NOT NULL DEFAULT SYSUTCDATETIME()
);

CREATE TABLE season_ruleset_assignments (
    season_ruleset_id   INT             IDENTITY(1,1) PRIMARY KEY,
    season_id           INT             NOT NULL,
    ruleset_id          INT             NOT NULL REFERENCES rulesets(ruleset_id),
    assigned_at         DATETIME2       NOT NULL DEFAULT SYSUTCDATETIME(),
    assigned_by         INT             NOT NULL,
    CONSTRAINT UQ_season_ruleset UNIQUE (season_id)
);

/* ============================================================
   USER ADMINISTRATION
   ============================================================ */

CREATE TABLE user_accounts (
    user_id             INT             IDENTITY(1,1) PRIMARY KEY,
    username            VARCHAR(150)    NOT NULL UNIQUE,
    email               VARCHAR(255)    NOT NULL UNIQUE,
    password_hash       VARBINARY(512)  NOT NULL,
    first_name          NVARCHAR(100)   NOT NULL,
    last_name           NVARCHAR(100)   NOT NULL,
    status              VARCHAR(32)     NOT NULL DEFAULT 'active', -- active, inactive, suspended
    last_login_at       DATETIME2       NULL,
    must_reset_password BIT             NOT NULL DEFAULT 0,
    mfa_enabled         BIT             NOT NULL DEFAULT 0,
    created_at          DATETIME2       NOT NULL DEFAULT SYSUTCDATETIME(),
    created_by          INT             NULL,
    updated_at          DATETIME2       NULL,
    updated_by          INT             NULL
);

CREATE TABLE roles (
    role_id             INT             IDENTITY(1,1) PRIMARY KEY,
    code                VARCHAR(100)    NOT NULL UNIQUE, -- e.g. super_admin, match_official
    name                NVARCHAR(150)   NOT NULL,
    description         NVARCHAR(512)   NULL,
    is_system_role      BIT             NOT NULL DEFAULT 0
);

CREATE TABLE permissions (
    permission_id       INT             IDENTITY(1,1) PRIMARY KEY,
    code                VARCHAR(150)    NOT NULL UNIQUE,
    name                NVARCHAR(150)   NOT NULL,
    description         NVARCHAR(512)   NULL
);

CREATE TABLE role_permissions (
    role_id             INT             NOT NULL REFERENCES roles(role_id) ON DELETE CASCADE,
    permission_id       INT             NOT NULL REFERENCES permissions(permission_id) ON DELETE CASCADE,
    CONSTRAINT PK_role_permissions PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE user_role_assignments (
    user_id             INT             NOT NULL REFERENCES user_accounts(user_id) ON DELETE CASCADE,
    role_id             INT             NOT NULL REFERENCES roles(role_id) ON DELETE CASCADE,
    assigned_at         DATETIME2       NOT NULL DEFAULT SYSUTCDATETIME(),
    assigned_by         INT             NOT NULL,
    CONSTRAINT PK_user_role_assignments PRIMARY KEY (user_id, role_id)
);

CREATE TABLE user_session_lockouts (
    user_id             INT             NOT NULL REFERENCES user_accounts(user_id) ON DELETE CASCADE,
    locked_until        DATETIME2       NOT NULL,
    failed_attempts     TINYINT         NOT NULL DEFAULT 0,
    CONSTRAINT PK_user_session_lockouts PRIMARY KEY (user_id)
);

/* ============================================================
   AUDIT TRAIL
   ============================================================ */

CREATE TABLE audit_events (
    audit_event_id      BIGINT          IDENTITY(1,1) PRIMARY KEY,
    event_type          VARCHAR(100)    NOT NULL,        -- domain event name
    severity            VARCHAR(32)     NOT NULL,        -- info, warning, critical
    actor_id            INT             NULL,
    actor_username      VARCHAR(150)    NULL,
    actor_role          VARCHAR(100)    NULL,
    entity_type         VARCHAR(100)    NOT NULL,        -- e.g. RULESET, MATCH, USER
    entity_id           VARCHAR(100)    NOT NULL,
    correlation_id      UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    payload             NVARCHAR(MAX)   NULL,            -- JSON snapshot of relevant data
    metadata            NVARCHAR(MAX)   NULL,            -- extra context (IP, device, etc.)
    created_at          DATETIME2       NOT NULL DEFAULT SYSUTCDATETIME()
);

CREATE INDEX IX_audit_events_entity ON audit_events (entity_type, entity_id, created_at DESC);
CREATE INDEX IX_audit_events_actor ON audit_events (actor_id, created_at DESC);
CREATE INDEX IX_audit_events_severity ON audit_events (severity, created_at DESC);

/* ============================================================
   CORE REFERENCE TABLES (tournaments, seasons, teams, stadiums, players, officials)
   ============================================================ */
CREATE TABLE tournaments (
    tournament_id INT IDENTITY(1,1) PRIMARY KEY,
    code VARCHAR(64) NOT NULL UNIQUE,
    name NVARCHAR(255) NOT NULL,
    description NVARCHAR(MAX) NULL,
    organizer NVARCHAR(255) NULL,
    founded_year SMALLINT NULL CHECK (founded_year BETWEEN 1900 AND 2100),
    region NVARCHAR(150) NULL,
    is_active BIT NOT NULL DEFAULT 1,
    created_by INT NULL REFERENCES user_accounts(user_id),
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_by INT NULL REFERENCES user_accounts(user_id),
    updated_at DATETIME2 NULL
);
GO

CREATE TABLE seasons (
    season_id INT IDENTITY(1,1) PRIMARY KEY,
    tournament_id INT NOT NULL REFERENCES tournaments(tournament_id),
    ruleset_id INT NOT NULL REFERENCES rulesets(ruleset_id),
    name NVARCHAR(255) NOT NULL,
    code VARCHAR(64) NOT NULL UNIQUE,
    description NVARCHAR(MAX) NULL,
    start_date DATE NOT NULL,
    end_date DATE NULL,
    participation_fee DECIMAL(14,2) NOT NULL CHECK (participation_fee >= 0),
    max_teams TINYINT NOT NULL DEFAULT 10 CHECK (max_teams = 10),
    expected_rounds TINYINT NOT NULL DEFAULT 18 CHECK (expected_rounds = 18),
    status VARCHAR(32) NOT NULL DEFAULT 'draft',
    invitation_opened_at DATETIME2 NULL,
    registration_deadline DATETIME2 NULL,
    created_by INT NOT NULL REFERENCES user_accounts(user_id),
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_by INT NULL REFERENCES user_accounts(user_id),
    updated_at DATETIME2 NULL,
    CONSTRAINT CK_seasons_status CHECK (status IN ('draft','inviting','registering','scheduled','in_progress','completed','archived')),
    CONSTRAINT CK_seasons_dates CHECK (end_date IS NULL OR end_date >= start_date),
    CONSTRAINT UQ_seasons_tournament_name UNIQUE (tournament_id, name)
);
GO

CREATE TABLE season_status_history (
    season_status_history_id BIGINT IDENTITY(1,1) PRIMARY KEY,
    season_id INT NOT NULL REFERENCES seasons(season_id) ON DELETE CASCADE,
    from_status VARCHAR(32) NULL,
    to_status VARCHAR(32) NOT NULL,
    changed_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    changed_by INT NOT NULL REFERENCES user_accounts(user_id),
    note NVARCHAR(512) NULL
);
GO

CREATE TABLE stadiums (
    stadium_id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(255) NOT NULL,
    city NVARCHAR(150) NOT NULL,
    province NVARCHAR(150) NULL,
    address NVARCHAR(255) NULL,
    capacity INT NOT NULL CHECK (capacity >= 0),
    surface_type VARCHAR(64) NULL,
    rating_stars TINYINT NULL CHECK (rating_stars BETWEEN 0 AND 5),
    owner NVARCHAR(255) NULL,
    contact_phone VARCHAR(32) NULL,
    is_certified BIT NOT NULL DEFAULT 0,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    created_by INT NULL REFERENCES user_accounts(user_id),
    updated_at DATETIME2 NULL,
    updated_by INT NULL REFERENCES user_accounts(user_id)
);
GO

CREATE TABLE teams (
    team_id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(255) NOT NULL,
    short_name VARCHAR(50) NULL,
    code VARCHAR(32) NULL UNIQUE,
    governing_body NVARCHAR(255) NULL,
    city NVARCHAR(150) NULL,
    country NVARCHAR(100) NULL,
    home_stadium_id INT NULL REFERENCES stadiums(stadium_id),
    founded_year SMALLINT NULL CHECK (founded_year BETWEEN 1900 AND 2100),
    description NVARCHAR(MAX) NULL,
    home_kit_description NVARCHAR(255) NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'active',
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    created_by INT NULL REFERENCES user_accounts(user_id),
    updated_at DATETIME2 NULL,
    updated_by INT NULL REFERENCES user_accounts(user_id),
    CONSTRAINT CK_teams_status CHECK (status IN ('active','inactive','suspended')),
    CONSTRAINT UQ_teams_name UNIQUE (name)
);
GO

CREATE TABLE team_kits (
    kit_id INT IDENTITY(1,1) PRIMARY KEY,
    team_id INT NOT NULL REFERENCES teams(team_id) ON DELETE CASCADE,
    season_id INT NULL REFERENCES seasons(season_id) ON DELETE CASCADE,
    kit_type VARCHAR(32) NOT NULL,
    primary_color VARCHAR(32) NULL,
    secondary_color VARCHAR(32) NULL,
    pattern_description NVARCHAR(255) NULL,
    registered_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT CK_team_kits_type CHECK (kit_type IN ('home','away','third','goalkeeper')),
    CONSTRAINT UQ_team_kits UNIQUE (team_id, season_id, kit_type)
);
GO

CREATE TABLE players (
    player_id INT IDENTITY(1,1) PRIMARY KEY,
    full_name NVARCHAR(255) NOT NULL,
    display_name NVARCHAR(150) NULL,
    date_of_birth DATE NOT NULL,
    place_of_birth NVARCHAR(150) NULL,
    nationality NVARCHAR(100) NOT NULL,
    preferred_position VARCHAR(50) NULL,
    secondary_position VARCHAR(50) NULL,
    height_cm TINYINT NULL CHECK (height_cm BETWEEN 120 AND 220),
    weight_kg TINYINT NULL CHECK (weight_kg BETWEEN 40 AND 150),
    biography NVARCHAR(MAX) NULL,
    dominant_foot VARCHAR(12) NULL CHECK (dominant_foot IN ('left','right','both')),
    current_team_id INT NULL REFERENCES teams(team_id),
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    created_by INT NULL REFERENCES user_accounts(user_id),
    updated_at DATETIME2 NULL,
    updated_by INT NULL REFERENCES user_accounts(user_id)
);
GO

CREATE TABLE officials (
    official_id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NULL REFERENCES user_accounts(user_id),
    full_name NVARCHAR(255) NOT NULL,
    role_specialty VARCHAR(32) NOT NULL,
    license_number VARCHAR(50) NULL,
    federation_level NVARCHAR(100) NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'active',
    notes NVARCHAR(512) NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NULL,
    CONSTRAINT CK_officials_role CHECK (role_specialty IN ('referee','assistant','fourth_official','match_commissioner','supervisor','var','other')),
    CONSTRAINT CK_officials_status CHECK (status IN ('active','inactive','suspended'))
);
GO

/* ============================================================
   RULESET EXTENSIONS & GOVERNANCE DATA
   ============================================================ */
CREATE TABLE ruleset_goal_types (
    goal_type_id INT IDENTITY(1,1) PRIMARY KEY,
    ruleset_id INT NOT NULL REFERENCES rulesets(ruleset_id) ON DELETE CASCADE,
    code VARCHAR(32) NOT NULL,
    name NVARCHAR(100) NOT NULL,
    description NVARCHAR(255) NULL,
    minute_min TINYINT NOT NULL DEFAULT 0 CHECK (minute_min BETWEEN 0 AND 120),
    minute_max TINYINT NOT NULL DEFAULT 90 CHECK (minute_max BETWEEN 0 AND 150),
    is_active BIT NOT NULL DEFAULT 1,
    CONSTRAINT CK_ruleset_goal_types_window CHECK (minute_min <= minute_max),
    CONSTRAINT UQ_ruleset_goal_type UNIQUE (ruleset_id, code)
);
GO

CREATE TABLE ruleset_team_requirements (
    team_requirement_id INT IDENTITY(1,1) PRIMARY KEY,
    ruleset_id INT NOT NULL REFERENCES rulesets(ruleset_id) ON DELETE CASCADE,
    min_registered_players TINYINT NOT NULL,
    min_goalkeepers TINYINT NOT NULL,
    max_foreign_on_match_sheet TINYINT NOT NULL,
    min_stadium_capacity INT NOT NULL,
    min_stadium_rating TINYINT NOT NULL,
    notes NVARCHAR(255) NULL,
    CONSTRAINT CK_ruleset_team_requirements CHECK (
        min_registered_players >= 11 AND
        min_goalkeepers >= 1 AND
        max_foreign_on_match_sheet >= 0 AND
        min_stadium_capacity >= 0 AND
        min_stadium_rating BETWEEN 0 AND 5
    ),
    CONSTRAINT UQ_ruleset_team_requirements UNIQUE (ruleset_id)
);
GO

CREATE TABLE ruleset_match_constraints (
    match_constraint_id INT IDENTITY(1,1) PRIMARY KEY,
    ruleset_id INT NOT NULL REFERENCES rulesets(ruleset_id) ON DELETE CASCADE,
    total_rounds TINYINT NOT NULL,
    teams_per_season TINYINT NOT NULL,
    home_away_balance BIT NOT NULL DEFAULT 1,
    max_matches_per_day TINYINT NULL,
    min_rest_days TINYINT NULL,
    notes NVARCHAR(255) NULL,
    CONSTRAINT CK_ruleset_match_constraints CHECK (
        total_rounds BETWEEN 1 AND 60 AND
        teams_per_season BETWEEN 2 AND 32
    ),
    CONSTRAINT UQ_ruleset_match_constraints UNIQUE (ruleset_id)
);
GO



/* ============================================================
   TEAM INVITATIONS, REGISTRATIONS & ROSTERS
   ============================================================ */
CREATE TABLE season_invitations (
    invitation_id INT IDENTITY(1,1) PRIMARY KEY,
    season_id INT NOT NULL REFERENCES seasons(season_id) ON DELETE CASCADE,
    team_id INT NOT NULL REFERENCES teams(team_id),
    invite_type VARCHAR(32) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    invited_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    response_deadline DATETIME2 NOT NULL,
    responded_at DATETIME2 NULL,
    response_notes NVARCHAR(512) NULL,
    invited_by INT NOT NULL REFERENCES user_accounts(user_id),
    responded_by INT NULL REFERENCES user_accounts(user_id),
    replacement_for_id INT NULL REFERENCES season_invitations(invitation_id),
    CONSTRAINT CK_season_invitations_type CHECK (invite_type IN ('retained','promoted','replacement')),
    CONSTRAINT CK_season_invitations_status CHECK (status IN ('pending','accepted','declined','expired','rescinded','replaced')),
    CONSTRAINT CK_season_invitations_deadline CHECK (DATEDIFF(DAY, invited_at, response_deadline) BETWEEN 0 AND 14),
    CONSTRAINT UQ_season_invitation UNIQUE (season_id, team_id)
);
GO

CREATE TABLE season_team_registrations (
    registration_id INT IDENTITY(1,1) PRIMARY KEY,
    season_id INT NOT NULL REFERENCES seasons(season_id) ON DELETE CASCADE,
    team_id INT NOT NULL REFERENCES teams(team_id),
    invitation_id INT NULL REFERENCES season_invitations(invitation_id),
    fee_status VARCHAR(32) NOT NULL DEFAULT 'unpaid',
    registration_status VARCHAR(32) NOT NULL DEFAULT 'draft',
    submitted_at DATETIME2 NULL,
    reviewed_at DATETIME2 NULL,
    reviewed_by INT NULL REFERENCES user_accounts(user_id),
    review_notes NVARCHAR(1000) NULL,
    governing_body NVARCHAR(255) NULL,
    city NVARCHAR(150) NULL,
    home_stadium_name NVARCHAR(255) NOT NULL,
    home_stadium_capacity INT NOT NULL,
    home_stadium_rating TINYINT NOT NULL,
    kit_description NVARCHAR(255) NULL,
    squad_size TINYINT NOT NULL,
    foreign_player_count TINYINT NOT NULL,
    dossier_url NVARCHAR(500) NULL,
    notes NVARCHAR(1000) NULL,
    CONSTRAINT CK_season_team_reg_fee_status CHECK (fee_status IN ('unpaid','pending','paid','waived')),
    CONSTRAINT CK_season_team_reg_status CHECK (registration_status IN ('draft','submitted','under_review','approved','rejected','needs_resubmission')),
    CONSTRAINT CK_season_team_reg_capacity CHECK (home_stadium_capacity >= 10000),
    CONSTRAINT CK_season_team_reg_rating CHECK (home_stadium_rating >= 2),
    CONSTRAINT CK_season_team_reg_squad CHECK (squad_size BETWEEN 16 AND 22),
    CONSTRAINT CK_season_team_reg_foreign CHECK (foreign_player_count BETWEEN 0 AND 5 AND foreign_player_count <= squad_size),
    CONSTRAINT UQ_season_team_registration UNIQUE (season_id, team_id)
);
GO

CREATE TABLE season_team_participants (
    season_team_id INT IDENTITY(1,1) PRIMARY KEY,
    season_id INT NOT NULL REFERENCES seasons(season_id) ON DELETE CASCADE,
    team_id INT NOT NULL REFERENCES teams(team_id),
    registration_id INT NULL REFERENCES season_team_registrations(registration_id),
    seed_number TINYINT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    joined_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT CK_season_team_participants_status CHECK (status IN ('pending','active','eliminated','withdrawn')),
    CONSTRAINT CK_season_team_participants_seed CHECK (seed_number IS NULL OR seed_number BETWEEN 1 AND 20),
    CONSTRAINT UQ_season_team UNIQUE (season_id, team_id),
    CONSTRAINT UQ_season_team_pair UNIQUE (season_id, season_team_id)
);
GO

CREATE TABLE season_player_registrations (
    season_player_id INT IDENTITY(1,1) PRIMARY KEY,
    season_id INT NOT NULL REFERENCES seasons(season_id) ON DELETE CASCADE,
    season_team_id INT NOT NULL REFERENCES season_team_participants(season_team_id),
    player_id INT NOT NULL REFERENCES players(player_id),
    registration_status VARCHAR(32) NOT NULL DEFAULT 'pending',
    player_type VARCHAR(32) NOT NULL,
    is_foreign BIT NOT NULL DEFAULT 0,
    shirt_number TINYINT NULL CHECK (shirt_number BETWEEN 1 AND 99),
    position_code VARCHAR(32) NULL,
    age_on_season_start TINYINT NOT NULL CHECK (age_on_season_start BETWEEN 16 AND 40),
    height_cm TINYINT NULL CHECK (height_cm BETWEEN 120 AND 220),
    weight_kg TINYINT NULL CHECK (weight_kg BETWEEN 40 AND 150),
    biography NVARCHAR(MAX) NULL,
    notes NVARCHAR(500) NULL,
    registered_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    approved_at DATETIME2 NULL,
    approved_by INT NULL REFERENCES user_accounts(user_id),
    CONSTRAINT CK_season_player_reg_status CHECK (registration_status IN ('pending','approved','rejected','released')),
    CONSTRAINT CK_season_player_reg_type CHECK (player_type IN ('domestic','foreign','u21','u23','other')),
    CONSTRAINT UQ_season_player UNIQUE (season_id, player_id),
    CONSTRAINT UQ_season_player_number UNIQUE (season_team_id, shirt_number),
    CONSTRAINT UQ_season_player_pair UNIQUE (season_id, season_player_id),
    CONSTRAINT FK_season_player_team_season FOREIGN KEY (season_id, season_team_id) REFERENCES season_team_participants(season_id, season_team_id)
);
GO

CREATE INDEX IX_season_invitations_status ON season_invitations (season_id, status);
GO
CREATE INDEX IX_season_team_reg_status ON season_team_registrations (season_id, registration_status);
GO
CREATE INDEX IX_season_player_reg_team ON season_player_registrations (season_id, season_team_id, registration_status);
GO
/* ============================================================
   COMPETITION STRUCTURE (rounds, fixtures, matches)
   ============================================================ */
CREATE TABLE season_rounds (
    round_id INT IDENTITY(1,1) PRIMARY KEY,
    season_id INT NOT NULL REFERENCES seasons(season_id) ON DELETE CASCADE,
    round_number TINYINT NOT NULL,
    name NVARCHAR(100) NOT NULL,
    start_date DATE NULL,
    end_date DATE NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'planned',
    CONSTRAINT CK_season_round_number CHECK (round_number BETWEEN 1 AND 18),
    CONSTRAINT CK_season_round_status CHECK (status IN ('planned','locked','completed')),
    CONSTRAINT UQ_season_round UNIQUE (season_id, round_number),
    CONSTRAINT UQ_season_round_pair UNIQUE (season_id, round_id)
);
GO

CREATE TABLE matches (
    match_id INT IDENTITY(1,1) PRIMARY KEY,
    season_id INT NOT NULL REFERENCES seasons(season_id) ON DELETE CASCADE,
    round_id INT NOT NULL REFERENCES season_rounds(round_id),
    matchday_number TINYINT NOT NULL CHECK (matchday_number BETWEEN 1 AND 18),
    home_season_team_id INT NOT NULL REFERENCES season_team_participants(season_team_id),
    away_season_team_id INT NOT NULL REFERENCES season_team_participants(season_team_id),
    stadium_id INT NOT NULL REFERENCES stadiums(stadium_id),
    ruleset_id INT NOT NULL REFERENCES rulesets(ruleset_id),
    scheduled_kickoff DATETIME2 NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'scheduled',
    home_score TINYINT NULL CHECK (home_score BETWEEN 0 AND 99),
    away_score TINYINT NULL CHECK (away_score BETWEEN 0 AND 99),
    attendance INT NULL CHECK (attendance IS NULL OR attendance >= 0),
    winner_season_team_id INT NULL REFERENCES season_team_participants(season_team_id),
    match_code VARCHAR(50) NULL UNIQUE,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NULL,
    CONSTRAINT CK_matches_status CHECK (status IN ('scheduled','in_progress','completed','postponed','cancelled','awarded')),
    CONSTRAINT CK_matches_home_away CHECK (home_season_team_id <> away_season_team_id),
    CONSTRAINT FK_matches_season_round FOREIGN KEY (season_id, round_id) REFERENCES season_rounds(season_id, round_id),
    CONSTRAINT FK_matches_season_home FOREIGN KEY (season_id, home_season_team_id) REFERENCES season_team_participants(season_id, season_team_id),
    CONSTRAINT FK_matches_season_away FOREIGN KEY (season_id, away_season_team_id) REFERENCES season_team_participants(season_id, season_team_id),
    CONSTRAINT FK_matches_season_winner FOREIGN KEY (season_id, winner_season_team_id) REFERENCES season_team_participants(season_id, season_team_id),
    CONSTRAINT UQ_matches_match_season UNIQUE (match_id, season_id),
    CONSTRAINT UQ_matches_season_match UNIQUE (season_id, match_id),
    CONSTRAINT UQ_matches_ruleset UNIQUE (match_id, ruleset_id)
);
GO

CREATE INDEX IX_matches_season_round ON matches (season_id, round_id, matchday_number);
GO
CREATE INDEX IX_matches_status ON matches (season_id, status);
GO
/* ============================================================
   MATCH OPERATIONS (lineups, events, reports, per-match stats)
   ============================================================ */
CREATE TABLE match_lineups (
    lineup_id INT IDENTITY(1,1) PRIMARY KEY,
    match_id INT NOT NULL REFERENCES matches(match_id) ON DELETE CASCADE,
    season_id INT NOT NULL REFERENCES seasons(season_id),
    season_team_id INT NOT NULL REFERENCES season_team_participants(season_team_id),
    submitted_by INT NOT NULL REFERENCES user_accounts(user_id),
    submitted_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    formation VARCHAR(20) NULL,
    kit_description NVARCHAR(255) NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    reviewed_by INT NULL REFERENCES user_accounts(user_id),
    reviewed_at DATETIME2 NULL,
    review_notes NVARCHAR(512) NULL,
    squad_size TINYINT NOT NULL DEFAULT 16,
    starting_players_count TINYINT NOT NULL DEFAULT 11,
    bench_players_count TINYINT NOT NULL DEFAULT 5,
    notes NVARCHAR(512) NULL,
    CONSTRAINT CK_match_lineups_status CHECK (status IN ('pending','approved','rejected')),
    CONSTRAINT CK_match_lineups_counts CHECK (
        squad_size = starting_players_count + bench_players_count AND
        starting_players_count = 11 AND
        bench_players_count = 5
    ),
    CONSTRAINT FK_match_lineups_match_season FOREIGN KEY (match_id, season_id) REFERENCES matches(match_id, season_id),
    CONSTRAINT FK_match_lineups_team_season FOREIGN KEY (season_id, season_team_id) REFERENCES season_team_participants(season_id, season_team_id),
    CONSTRAINT UQ_match_lineup UNIQUE (match_id, season_team_id),
    CONSTRAINT UQ_match_lineup_season UNIQUE (lineup_id, season_id)
);
GO

CREATE TABLE match_lineup_players (
    lineup_player_id INT IDENTITY(1,1) PRIMARY KEY,
    lineup_id INT NOT NULL REFERENCES match_lineups(lineup_id) ON DELETE CASCADE,
    season_id INT NOT NULL REFERENCES seasons(season_id),
    season_player_id INT NOT NULL REFERENCES season_player_registrations(season_player_id),
    role_code VARCHAR(16) NOT NULL,
    position_code VARCHAR(32) NULL,
    shirt_number TINYINT NULL CHECK (shirt_number BETWEEN 0 AND 99),
    is_captain BIT NOT NULL DEFAULT 0,
    order_number TINYINT NULL CHECK (order_number BETWEEN 1 AND 25),
    notes NVARCHAR(255) NULL,
    CONSTRAINT CK_match_lineup_players_role CHECK (role_code IN ('starter','substitute')),
    CONSTRAINT FK_match_lineup_players_lineup FOREIGN KEY (lineup_id, season_id) REFERENCES match_lineups(lineup_id, season_id),
    CONSTRAINT FK_match_lineup_players_player FOREIGN KEY (season_id, season_player_id) REFERENCES season_player_registrations(season_id, season_player_id),
    CONSTRAINT UQ_match_lineup_player UNIQUE (lineup_id, season_player_id),
    CONSTRAINT UQ_match_lineup_order UNIQUE (lineup_id, order_number)
);
GO

CREATE TABLE match_team_statistics (
    match_team_stat_id BIGINT IDENTITY(1,1) PRIMARY KEY,
    match_id INT NOT NULL REFERENCES matches(match_id) ON DELETE CASCADE,
    season_id INT NOT NULL REFERENCES seasons(season_id),
    season_team_id INT NOT NULL REFERENCES season_team_participants(season_team_id),
    shots_total TINYINT NULL,
    shots_on_target TINYINT NULL,
    fouls_committed TINYINT NULL,
    offsides TINYINT NULL,
    corners TINYINT NULL,
    possession_percent DECIMAL(5,2) NULL,
    passes_completed SMALLINT NULL,
    custom_metrics NVARCHAR(MAX) NULL,
    CONSTRAINT CK_match_team_stats_possession CHECK (possession_percent IS NULL OR (possession_percent BETWEEN 0 AND 100)),
    CONSTRAINT CK_match_team_stats_shots CHECK (shots_total IS NULL OR shots_on_target IS NULL OR shots_on_target <= shots_total),
    CONSTRAINT FK_match_team_stats_match FOREIGN KEY (match_id, season_id) REFERENCES matches(match_id, season_id),
    CONSTRAINT FK_match_team_stats_team FOREIGN KEY (season_id, season_team_id) REFERENCES season_team_participants(season_id, season_team_id),
    CONSTRAINT UQ_match_team_stats UNIQUE (match_id, season_team_id)
);
GO

CREATE TABLE match_events (
    match_event_id BIGINT IDENTITY(1,1) PRIMARY KEY,
    match_id INT NOT NULL REFERENCES matches(match_id) ON DELETE CASCADE,
    season_id INT NOT NULL REFERENCES seasons(season_id),
    season_team_id INT NOT NULL REFERENCES season_team_participants(season_team_id),
    season_player_id INT NULL REFERENCES season_player_registrations(season_player_id),
    related_season_player_id INT NULL REFERENCES season_player_registrations(season_player_id),
    ruleset_id INT NOT NULL REFERENCES rulesets(ruleset_id),
    event_type VARCHAR(32) NOT NULL,
    event_minute TINYINT NOT NULL,
    stoppage_time TINYINT NULL,
    goal_type_code VARCHAR(32) NULL,
    card_type VARCHAR(16) NULL,
    description NVARCHAR(512) NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT CK_match_events_type CHECK (event_type IN ('GOAL','ASSIST','CARD','SUBSTITUTION','OWN_GOAL','OTHER')),
    CONSTRAINT CK_match_events_minute CHECK (event_minute BETWEEN 0 AND 90),
    CONSTRAINT CK_match_events_stoppage CHECK (stoppage_time IS NULL OR stoppage_time BETWEEN 0 AND 10),
    CONSTRAINT CK_match_events_card CHECK (
        (event_type = 'CARD' AND card_type IN ('YELLOW','RED','SECOND_YELLOW')) OR
        (event_type <> 'CARD' AND card_type IS NULL)
    ),
    CONSTRAINT CK_match_events_goal_type CHECK (
        (event_type = 'GOAL' AND goal_type_code IS NOT NULL) OR
        (event_type <> 'GOAL' AND goal_type_code IS NULL)
    ),
    CONSTRAINT FK_match_events_match_season FOREIGN KEY (match_id, season_id) REFERENCES matches(match_id, season_id),
    CONSTRAINT FK_match_events_match_ruleset FOREIGN KEY (match_id, ruleset_id) REFERENCES matches(match_id, ruleset_id),
    CONSTRAINT FK_match_events_team FOREIGN KEY (season_id, season_team_id) REFERENCES season_team_participants(season_id, season_team_id),
    CONSTRAINT FK_match_events_player FOREIGN KEY (season_id, season_player_id) REFERENCES season_player_registrations(season_id, season_player_id),
    CONSTRAINT FK_match_events_related_player FOREIGN KEY (season_id, related_season_player_id) REFERENCES season_player_registrations(season_id, season_player_id),
);
GO

CREATE INDEX IX_match_events_type ON match_events (match_id, event_type, event_minute);
GO
CREATE INDEX IX_match_events_player_type ON match_events (season_player_id, event_type);
GO

CREATE TABLE player_match_stats (
    player_match_stat_id BIGINT IDENTITY(1,1) PRIMARY KEY,
    match_id INT NOT NULL REFERENCES matches(match_id) ON DELETE CASCADE,
    season_id INT NOT NULL REFERENCES seasons(season_id),
    season_player_id INT NOT NULL REFERENCES season_player_registrations(season_player_id),
    minutes_played TINYINT NULL CHECK (minutes_played BETWEEN 0 AND 120),
    goals TINYINT NOT NULL DEFAULT 0,
    assists TINYINT NOT NULL DEFAULT 0,
    shots TINYINT NOT NULL DEFAULT 0,
    shots_on_target TINYINT NOT NULL DEFAULT 0,
    yellow_cards TINYINT NOT NULL DEFAULT 0 CHECK (yellow_cards BETWEEN 0 AND 2),
    red_cards TINYINT NOT NULL DEFAULT 0 CHECK (red_cards BETWEEN 0 AND 1),
    player_of_match BIT NOT NULL DEFAULT 0,
    is_starting BIT NOT NULL DEFAULT 0,
    notes NVARCHAR(512) NULL,
    CONSTRAINT CK_player_match_stats_shots CHECK (shots_on_target <= shots),
    CONSTRAINT FK_player_match_stats_match FOREIGN KEY (match_id, season_id) REFERENCES matches(match_id, season_id),
    CONSTRAINT FK_player_match_stats_player FOREIGN KEY (season_id, season_player_id) REFERENCES season_player_registrations(season_id, season_player_id),
    CONSTRAINT UQ_player_match_stats UNIQUE (match_id, season_player_id)
);
GO

CREATE INDEX IX_player_match_stats_player ON player_match_stats (season_player_id);
GO

CREATE TABLE match_reports (
    match_report_id INT IDENTITY(1,1) PRIMARY KEY,
    match_id INT NOT NULL REFERENCES matches(match_id) ON DELETE CASCADE,
    season_id INT NOT NULL REFERENCES seasons(season_id),
    reporting_official_id INT NULL REFERENCES officials(official_id),
    submitted_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    home_score TINYINT NOT NULL CHECK (home_score BETWEEN 0 AND 99),
    away_score TINYINT NOT NULL CHECK (away_score BETWEEN 0 AND 99),
    player_of_match_id INT NULL REFERENCES season_player_registrations(season_player_id),
    weather NVARCHAR(100) NULL,
    attendance INT NULL CHECK (attendance IS NULL OR attendance >= 0),
    additional_notes NVARCHAR(MAX) NULL,
    approved_by INT NULL REFERENCES user_accounts(user_id),
    approved_at DATETIME2 NULL,
    CONSTRAINT FK_match_reports_match FOREIGN KEY (match_id, season_id) REFERENCES matches(match_id, season_id),
    CONSTRAINT FK_match_reports_player FOREIGN KEY (season_id, player_of_match_id) REFERENCES season_player_registrations(season_id, season_player_id),
    CONSTRAINT UQ_match_reports_match UNIQUE (match_id)
);
GO

/* ============================================================
   STATISTICS, REPORTING & DISCIPLINARY SUPPORT
   ============================================================ */
CREATE TABLE season_team_statistics (
    season_team_stat_id BIGINT IDENTITY(1,1) PRIMARY KEY,
    season_id INT NOT NULL REFERENCES seasons(season_id) ON DELETE CASCADE,
    season_team_id INT NOT NULL REFERENCES season_team_participants(season_team_id),
    matches_played TINYINT NOT NULL DEFAULT 0,
    wins TINYINT NOT NULL DEFAULT 0,
    draws TINYINT NOT NULL DEFAULT 0,
    losses TINYINT NOT NULL DEFAULT 0,
    goals_for TINYINT NOT NULL DEFAULT 0,
    goals_against TINYINT NOT NULL DEFAULT 0,
    goal_difference AS (goals_for - goals_against) PERSISTED,
    points TINYINT NOT NULL DEFAULT 0,
    current_rank TINYINT NULL,
    last_updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT CK_season_team_stats_balance CHECK (wins + draws + losses = matches_played),
    CONSTRAINT UQ_season_team_stats UNIQUE (season_team_id),
    CONSTRAINT FK_season_team_stats_team FOREIGN KEY (season_id, season_team_id) REFERENCES season_team_participants(season_id, season_team_id)
);
GO

CREATE INDEX IX_season_team_statistics_rank ON season_team_statistics (season_id, points DESC, goal_difference DESC);
GO

/* ============================================================
   OFFICIALS & MATCH ASSIGNMENTS
   ============================================================ */
CREATE TABLE match_official_assignments (
    match_official_assignment_id INT IDENTITY(1,1) PRIMARY KEY,
    match_id INT NOT NULL REFERENCES matches(match_id) ON DELETE CASCADE,
    official_id INT NOT NULL REFERENCES officials(official_id),
    role_code VARCHAR(32) NOT NULL,
    assigned_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    assigned_by INT NOT NULL REFERENCES user_accounts(user_id),
    notes NVARCHAR(255) NULL,
    CONSTRAINT CK_match_official_role CHECK (role_code IN ('referee','assistant_1','assistant_2','fourth_official','match_commissioner','video_assistant')),
    CONSTRAINT UQ_match_official_role UNIQUE (match_id, role_code),
    CONSTRAINT UQ_match_official_per_match UNIQUE (match_id, official_id)
);
GO



