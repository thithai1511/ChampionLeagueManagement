/**
 * Timezone utility for GMT+7 (Indochina Time)
 * Provides consistent date/time formatting across the application
 */

const TIMEZONE = 'Asia/Ho_Chi_Minh'; // GMT+7

/**
 * Format date for display (Vietnamese locale, GMT+7)
 * @param {Date|string} date - Date to format
 * @param {Object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date string
 */
export function formatDateGMT7(date, options = {}) {
    const d = date instanceof Date ? date : new Date(date);
    const defaultOptions = {
        timeZone: TIMEZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        ...options
    };

    return d.toLocaleDateString('vi-VN', defaultOptions);
}

/**
 * Format datetime for display (Vietnamese locale, GMT+7)
 * @param {Date|string} date - Date to format
 * @param {Object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted datetime string
 */
export function formatDateTimeGMT7(date, options = {}) {
    const d = date instanceof Date ? date : new Date(date);
    const defaultOptions = {
        timeZone: TIMEZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        ...options
    };

    return d.toLocaleString('vi-VN', defaultOptions);
}

/**
 * Format time only (Vietnamese locale, GMT+7)
 * @param {Date|string} date - Date to format
 * @param {Object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted time string (HH:mm)
 */
export function formatTimeGMT7(date, options = {}) {
    const d = date instanceof Date ? date : new Date(date);
    const defaultOptions = {
        timeZone: TIMEZONE,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        ...options
    };

    return d.toLocaleTimeString('vi-VN', defaultOptions);
}

/**
 * Get current date/time in GMT+7 as ISO string
 * @returns {string} ISO string in GMT+7
 */
export function nowGMT7ISO() {
    return new Date().toLocaleString('en-US', { timeZone: TIMEZONE });
}

/**
 * Format date to YYYY-MM-DD in GMT+7
 * @param {Date|string} date - Date to format
 * @returns {string} Date in YYYY-MM-DD format
 */
export function toDateInputGMT7(date) {
    const d = date instanceof Date ? date : new Date(date);
    const parts = d.toLocaleDateString('en-CA', { timeZone: TIMEZONE }); // en-CA gives YYYY-MM-DD
    return parts;
}

/**
 * Format date to DD/MM/YYYY HH:mm in GMT+7
 * @param {Date|string} date - Date to format  
 * @returns {string} Formatted as DD/MM/YYYY HH:mm
 */
export function formatMatchTimeGMT7(date) {
    if (!date) return '';
    const d = date instanceof Date ? date : new Date(date);

    const day = d.toLocaleDateString('en-GB', { timeZone: TIMEZONE, day: '2-digit' });
    const month = d.toLocaleDateString('en-GB', { timeZone: TIMEZONE, month: '2-digit' });
    const year = d.toLocaleDateString('en-GB', { timeZone: TIMEZONE, year: 'numeric' });
    const time = formatTimeGMT7(d);

    return `${day}/${month}/${year} ${time}`;
}

/**
 * Get today's date in YYYY-MM-DD format (GMT+7)
 * @returns {string} Today's date
 */
export function todayGMT7() {
    return toDateInputGMT7(new Date());
}
