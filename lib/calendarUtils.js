'use strict';

/**
 * Calculate the end of the preview window.
 *
 * The window always ends at the end of the last preview day (23:59:59.999 local time),
 * not at the current time of that day. With 0 preview days the window ends tonight,
 * so events later today are still recognized (e.g. for the "later" states).
 *
 * @param {Date} now current date and time
 * @param {number|string} daysPreview configured preview days
 * @returns {Date} end of the preview window
 */
function getPreviewEnd(now, daysPreview) {
    const end = new Date(now.getTime());
    end.setDate(end.getDate() + (parseInt(daysPreview, 10) || 0));
    end.setHours(23, 59, 59, 999);
    return end;
}

/**
 * Normalize a calendar URL.
 *
 * Calendar apps (e.g. Apple iCloud) share calendars as `webcal://` or `webcals://` links.
 * These are plain HTTPS downloads, so they are converted to `https://`.
 * Everything else is returned unchanged (also local file names).
 *
 * @param {string} urlOrFile configured URL or file name
 * @returns {string} URL usable for an HTTP(S) request or the unchanged file name
 */
function normalizeCalendarUrl(urlOrFile) {
    const value = (urlOrFile || '').trim();
    return value.replace(/^webcals?:\/\//i, 'https://');
}

/**
 * Check if the configured source is a remote URL (and not a file).
 *
 * @param {string} urlOrFile configured URL or file name (already normalized)
 * @returns {boolean} true for http:// and https:// URLs
 */
function isRemoteUrl(urlOrFile) {
    return /^https?:\/\//i.test(urlOrFile || '');
}

module.exports = {
    getPreviewEnd,
    normalizeCalendarUrl,
    isRemoteUrl,
};
