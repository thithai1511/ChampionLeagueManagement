// Override toLocaleDateString and toLocaleTimeString globally to always use GMT+7
const TIMEZONE = 'Asia/Ho_Chi_Minh';

// Store original methods
const originalLocaleDateString = Date.prototype.toLocaleDateString;
const originalLocaleTimeString = Date.prototype.toLocaleTimeString;
const originalLocaleString = Date.prototype.toLocaleString;

// Override toLocaleDateString
Date.prototype.toLocaleDateString = function (...args) {
    const [locale, options = {}] = args;
    return originalLocaleDateString.call(this, locale || 'vi-VN', {
        ...options,
        timeZone: TIMEZONE
    });
};

// Override toLocaleTimeString  
Date.prototype.toLocaleTimeString = function (...args) {
    const [locale, options = {}] = args;
    return originalLocaleTimeString.call(this, locale || 'vi-VN', {
        ...options,
        timeZone: TIMEZONE
    });
};

// Override toLocaleString
Date.prototype.toLocaleString = function (...args) {
    const [locale, options = {}] = args;
    return originalLocaleString.call(this, locale || 'vi-VN', {
        ...options,
        timeZone: TIMEZONE
    });
};

export default {}; // Empty export to make it a module
