'use strict';

/**
 * Copy an iCalendar event before changing occurrence-specific top-level properties.
 *
 * A shallow copy is intentional. Values created by node-ical, such as RRule instances,
 * must retain their prototypes. Some parser-owned dictionaries also deliberately have
 * a null prototype and cannot be processed by clone utilities that call
 * `value.hasOwnProperty()`.
 *
 * @template {Record<string, unknown>} T
 * @param {T} event event returned by node-ical
 * @returns {T} event copy
 */
function cloneEvent(event) {
    return { ...event };
}

module.exports = cloneEvent;
