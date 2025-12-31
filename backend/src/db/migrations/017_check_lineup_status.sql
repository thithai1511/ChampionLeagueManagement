/*
  Query để kiểm tra tình trạng lineup của các trận đã có kết quả
  Mục đích: Xem có trận nào thiếu lineup không
*/

SET NOCOUNT ON;

PRINT '=== KIỂM TRA TÌNH TRẠNG LINEUP ===';
PRINT '';

-- Tìm các trận đã có kết quả nhưng thiếu lineup
SELECT 
    m.match_id,
    m.season_id,
    s.name AS season_name,
    m.home_score,
    m.away_score,
    m.status AS match_status,
    -- Đếm lineup cho home team
    (SELECT COUNT(*) 
     FROM match_lineups ml 
     WHERE ml.match_id = m.match_id 
       AND ml.season_team_id = m.home_season_team_id
       AND ml.team_type = 'home') AS home_lineup_count,
    -- Đếm lineup cho away team
    (SELECT COUNT(*) 
     FROM match_lineups ml 
     WHERE ml.match_id = m.match_id 
       AND ml.season_team_id = m.away_season_team_id
       AND ml.team_type = 'away') AS away_lineup_count,
    -- Kiểm tra approval_status
    (SELECT TOP 1 approval_status 
     FROM match_lineups ml 
     WHERE ml.match_id = m.match_id 
       AND ml.team_type = 'home'
     ORDER BY ml.lineup_id DESC) AS home_approval_status,
    (SELECT TOP 1 approval_status 
     FROM match_lineups ml 
     WHERE ml.match_id = m.match_id 
       AND ml.team_type = 'away'
     ORDER BY ml.lineup_id DESC) AS away_approval_status,
    -- Đếm events
    (SELECT COUNT(DISTINCT season_player_id) 
     FROM match_events me 
     WHERE me.match_id = m.match_id 
       AND me.season_team_id = m.home_season_team_id) AS home_events_count,
    (SELECT COUNT(DISTINCT season_player_id) 
     FROM match_events me 
     WHERE me.match_id = m.match_id 
       AND me.season_team_id = m.away_season_team_id) AS away_events_count,
    -- Đếm player_match_stats
    (SELECT COUNT(DISTINCT season_player_id) 
     FROM player_match_stats pms 
     WHERE pms.match_id = m.match_id 
       AND EXISTS (
           SELECT 1 FROM season_player_registrations spr 
           WHERE spr.season_player_id = pms.season_player_id 
             AND spr.season_team_id = m.home_season_team_id
       )) AS home_stats_count,
    (SELECT COUNT(DISTINCT season_player_id) 
     FROM player_match_stats pms 
     WHERE pms.match_id = m.match_id 
       AND EXISTS (
           SELECT 1 FROM season_player_registrations spr 
           WHERE spr.season_player_id = pms.season_player_id 
             AND spr.season_team_id = m.away_season_team_id
       )) AS away_stats_count
FROM matches m
LEFT JOIN seasons s ON m.season_id = s.season_id
WHERE m.home_score IS NOT NULL 
  AND m.away_score IS NOT NULL
  AND (
      -- Thiếu lineup cho home team
      NOT EXISTS (
          SELECT 1 FROM match_lineups ml 
          WHERE ml.match_id = m.match_id 
            AND ml.season_team_id = m.home_season_team_id
            AND ml.team_type = 'home'
      )
      OR
      -- Thiếu lineup cho away team
      NOT EXISTS (
          SELECT 1 FROM match_lineups ml 
          WHERE ml.match_id = m.match_id 
            AND ml.season_team_id = m.away_season_team_id
            AND ml.team_type = 'away'
      )
  )
ORDER BY m.season_id, m.match_id;

PRINT '';
PRINT '=== TỔNG KẾT ===';
WITH MatchLineupStatus AS (
    SELECT 
        m.match_id,
        CASE WHEN home_ml.lineup_id IS NOT NULL THEN 1 ELSE 0 END AS has_home_lineup,
        CASE WHEN away_ml.lineup_id IS NOT NULL THEN 1 ELSE 0 END AS has_away_lineup
    FROM matches m
    LEFT JOIN (
        SELECT DISTINCT match_id, season_team_id, lineup_id
        FROM match_lineups
        WHERE team_type = 'home'
    ) home_ml ON m.match_id = home_ml.match_id 
        AND m.home_season_team_id = home_ml.season_team_id
    LEFT JOIN (
        SELECT DISTINCT match_id, season_team_id, lineup_id
        FROM match_lineups
        WHERE team_type = 'away'
    ) away_ml ON m.match_id = away_ml.match_id 
        AND m.away_season_team_id = away_ml.season_team_id
    WHERE m.home_score IS NOT NULL 
      AND m.away_score IS NOT NULL
)
SELECT 
    COUNT(*) AS tong_tran_co_ket_qua,
    SUM(CASE WHEN has_home_lineup = 1 AND has_away_lineup = 1 THEN 1 ELSE 0 END) AS tran_co_day_du_lineup,
    SUM(CASE WHEN has_home_lineup = 0 OR has_away_lineup = 0 THEN 1 ELSE 0 END) AS tran_thieu_lineup
FROM MatchLineupStatus;

GO

