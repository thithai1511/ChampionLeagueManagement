export const generateICS = (matches) => {
    if (!matches || matches.length === 0) return '';

    const formatDate = (date) => {
        return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    let icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//ChampionLeagueManagement//NONSGML v1.0//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH'
    ];

    matches.forEach(match => {
        // Ensure we have a valid date
        if (!match.date || !match.time) return;

        // Parse date and time
        // match.date is "YYYY-MM-DD", match.time is "HH:mm"
        const startDateTime = new Date(`${match.date}T${match.time}:00`);
        const endDateTime = new Date(startDateTime.getTime() + (105 * 60 * 1000)); // Approx 1h 45m match duration

        const now = new Date();

        icsContent.push('BEGIN:VEVENT');
        icsContent.push(`UID:match-${match.id}@championleague.com`);
        icsContent.push(`DTSTAMP:${formatDate(now)}`);
        icsContent.push(`DTSTART:${formatDate(startDateTime)}`);
        icsContent.push(`DTEND:${formatDate(endDateTime)}`);
        icsContent.push(`SUMMARY:${match.homeTeam.name} vs ${match.awayTeam.name}`);
        icsContent.push(`DESCRIPTION:Giải Bóng Đá Việt Nam - ${match.matchday ? 'Matchday ' + match.matchday : 'Fixture'}\\nVenue: ${match.venue}`);
        icsContent.push(`LOCATION:${match.venue}`);
        icsContent.push('STATUS:CONFIRMED');
        icsContent.push('END:VEVENT');
    });

    icsContent.push('END:VCALENDAR');

    return icsContent.join('\r\n');
};

export const downloadICS = (matches, filename = 'fixtures.ics') => {
    const content = generateICS(matches);
    if (!content) return;

    const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
