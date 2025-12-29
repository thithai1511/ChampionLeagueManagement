/**
 * Timezone utility for GMT+7 (Indochina Time)
 * Provides consistent date/time formatting across the application
 */

// GMT+7 offset in milliseconds
const GMT7_OFFSET_MS = 7 * 60 * 60 * 1000;

/**
 * Convert any date to GMT+7
 * @param {Date|string} date - Date object or ISO string
 * @returns {Date} Date adjusted to GMT+7
 */
export function toGMT7(date) {
    const d = date instanceof Date ? date : new Date(date);
    const utcTime = d.getTime() + (d.getTimezoneOffset() * 60000);
    return new Date(utcTime + GMT7_OFFSET_MS);
}

/**
 * Get current time in GMT+7
 * @returns {Date} Current date/time in GMT+7
 */
export function nowGMT7() {
    return toGMT7(new Date());
}

/**
 * Format date to ISO string in GMT+7
 * @param {Date|string} date - Date to format
 * @returns {string} ISO string in GMT+7
 */
export function toISOGMT7(date) {
    const gmt7Date = toGMT7(date);
    return gmt7Date.toISOString();
}

/**
 * Format date for display (Vietnamese locale, GMT+7)
 * @param {Date|string} date - Date to format
 * @param {Object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date string
 */
export function formatDateGMT7(date, options = {}) {
    const gmt7Date = toGMT7(date);
    const defaultOptions = {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        ...options
    };

    return gmt7Date.toLocaleDateString('vi-VN', defaultOptions);
}

/**
 * Format datetime for display (Vietnamese locale, GMT+7)
 * @param {Date|string} date - Date to format
 * @param {Object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted datetime string
 */
export function formatDateTimeGMT7(date, options = {}) {
    const gmt7Date = toGMT7(date);
    const defaultOptions = {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        ...options
    };

    return gmt7Date.toLocaleString('vi-VN', defaultOptions);
}

/**
 * Format time only (Vietnamese locale, GMT+7)
 * @param {Date|string} date - Date to format
 * @param {Object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted time string
 */
export function formatTimeGMT7(date, options = {}) {
    const gmt7Date = toGMT7(date);
    const defaultOptions = {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        ...options
    };

    return gmt7Date.toLocaleTimeString('vi-VN', defaultOptions);
}

/**
 * Get today's date in GMT+7 (date only, no time)
 * @returns {string} Date in YYYY-MM-DD format
 */
export function todayGMT7() {
    return formatDateGMT7(new Date(), { year: 'numeric', month: '2-digit', day: '2-digit' })
        .split('/')
        .reverse()
        .join('-');
}

/**
 * Parse a date string and return GMT+7 Date object
 * @param {string} dateString - Date string to parse
 * @returns {Date} Parsed date in GMT+7
 */
export function parseDateGMT7(dateString) {
    return toGMT7(new Date(dateString));
}
