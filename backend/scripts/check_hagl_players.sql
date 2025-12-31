
SELECT 
    t.name AS TeamName, 
    st.season_team_id, 
    COUNT(spr.season_player_id) AS PlayerCount,
    SUM(CASE WHEN spr.position_code = 'GK' THEN 1 ELSE 0 END) AS GK_Count,
    SUM(CASE WHEN spr.position_code IN ('CB', 'LB', 'RB', 'DF') THEN 1 ELSE 0 END) AS Def_Count,
    SUM(CASE WHEN spr.position_code IN ('CM', 'CDM', 'CAM', 'LM', 'RM', 'MF') THEN 1 ELSE 0 END) AS Mid_Count,
    SUM(CASE WHEN spr.position_code IN ('ST', 'CF', 'LW', 'RW', 'FW') THEN 1 ELSE 0 END) AS Fwd_Count
FROM teams t
JOIN season_team_participants st ON t.team_id = st.team_id
LEFT JOIN season_player_registrations spr ON st.season_team_id = spr.season_team_id
WHERE t.name LIKE '%Hoàng Anh Gia Lai%' OR t.name LIKE '%HAGL%'
GROUP BY t.name, st.season_team_id;
