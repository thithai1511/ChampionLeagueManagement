export const DETAILED_POSITIONS = [
    'Goalkeeper',
    'Centre-Back',
    'Left-Back',
    'Right-Back',
    'Defence', // Generic Defence if in DB
    'Defensive Midfield',
    'Central Midfield',
    'Attacking Midfield',
    'Left Midfield',
    'Right Midfield',
    'Midfield', // Generic Midfield if in DB
    'Centre-Forward',
    'Second Striker', // WAIT, User said "Remove any extra positions not in DB... Second Striker". User list:
    /*
    Goalkeeper
    Centre-Back
    Midfield
    Defence
    Offence    <-- User listed this
    Central Midfield
    Centre-Forward
    Right-Back
    Right Winger
    Left Winger
    Attacking Midfield
    Left-Back
    Defensive Midfield
    Right Midfield
    Left Midfield
    */
];

// Re-defining based on User List exactly
export const DB_POSITIONS = [
    'Goalkeeper',
    'Centre-Back',
    'Right-Back',
    'Left-Back',
    'Defence',

    'Defensive Midfield',
    'Central Midfield',
    'Attacking Midfield',
    'Right Midfield',
    'Left Midfield',
    'Midfield',

    'Centre-Forward',
    'Right Winger',
    'Left Winger',
    'Offence'
];

export const POSITION_GROUPS_LIST = [
    'Goalkeeper',
    'Defence',
    'Midfield',
    'Forward' // User said "Forward" in Point 4 list. (Goalkeeper, Defence, Midfield, Forward).
];

export const mapPositionToGroup = (detailedPos) => {
    if (!detailedPos) return 'Midfield';
    const p = detailedPos.trim();

    // Goalkeeper
    if (p === 'Goalkeeper') return 'Goalkeeper';

    // Defence
    if (['Centre-Back', 'Right-Back', 'Left-Back', 'Defence'].includes(p)) return 'Defence';

    // Midfield
    if (['Defensive Midfield', 'Central Midfield', 'Attacking Midfield', 'Right Midfield', 'Left Midfield', 'Midfield'].includes(p)) return 'Midfield';

    // Forward (Analysis: Forward, Offence, Winger)
    if (['Centre-Forward', 'Right Winger', 'Left Winger', 'Offence'].includes(p)) return 'Forward';

    return 'Midfield'; // Default
};
