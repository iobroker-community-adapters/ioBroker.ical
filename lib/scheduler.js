'use strict';

/**
 * Real-time event scheduler for iCal adapter
 * Handles state updates at exact event times independent of polling cycles
 *
 * Architecture:
 * - Events cache: In-memory snapshot of calendar events from last sync
 * - Timers: Scheduled transitions to update states at exact event start/end times
 * - Daemon: Continuously evaluates cached events and triggers state updates
 */

/**
 * Real-time event scheduler class
 * Manages event state updates independent of polling cycles
 */
class EventScheduler {
    /**
     * Initialize the EventScheduler
     *
     * @param {object} adapter - The ioBroker adapter instance
     */
    constructor(adapter) {
        this.adapter = adapter;
        this.eventTimers = new Map(); // Store timers for event start/end times
        this.cachedEvents = []; // In-memory cache of parsed events
        this.trackedEventStates = new Map(); // Track which events' states are currently set
        this.stopped = false;
        this.daemon = null;
        this.daemonRunning = false;
        this.setStateCallback = undefined; // Will be set by main adapter
    }

    /**
     * Set the callback function for updating event states
     *
     * @param {Function} callback - Function to call when an event state changes
     */
    setStateCallbackFn(callback) {
        this.setStateCallback = callback;
    }

    /**
     * Start the real-time scheduler daemon
     */
    start() {
        if (this.daemon) {
            return; // Already running
        }

        this.stopped = false;

        // Run daemon every 100ms to check for events that need to be triggered
        this.daemon = setInterval(() => {
            this.evaluateSchedule();
        }, 100);

        this.adapter.log.debug('Real-time scheduler daemon started');
    }

    /**
     * Stop the scheduler daemon and clear all timers
     */
    stop() {
        this.stopped = true;

        if (this.daemon) {
            clearInterval(this.daemon);
            this.daemon = null;
        }

        // Clear all pending timers
        for (const [, timer] of this.eventTimers) {
            clearTimeout(timer.startTimer);
            if (timer.endTimer) {
                clearTimeout(timer.endTimer);
            }
        }
        this.eventTimers.clear();
        this.trackedEventStates.clear();

        this.adapter.log.debug('Real-time scheduler daemon stopped');
    }

    /**
     * Update the cached events snapshot from the latest parsed data
     * This is called after each calendar fetch/parse cycle
     *
     * @param {Array} datesArray - The newly parsed events array
     */
    updateCache(datesArray) {
        this.cachedEvents = datesArray || [];
        this.adapter.log.debug(`Event cache updated with ${this.cachedEvents.length} events`);

        // Clear old timers and reschedule based on new cache
        for (const [, timer] of this.eventTimers) {
            clearTimeout(timer.startTimer);
            if (timer.endTimer) {
                clearTimeout(timer.endTimer);
            }
        }
        this.eventTimers.clear();

        // Reset tracking for new cycle
        this.trackedEventStates.clear();

        // Schedule new timers for all cached events
        this.scheduleEventTimers();
    }

    /**
     * Schedule timers for all cached events
     * Timers will trigger state updates at exact event start/end times
     */
    scheduleEventTimers() {
        const now = new Date();

        for (const event of this.cachedEvents) {
            // Skip events that have already ended
            if (event._end && event._end < now) {
                continue;
            }

            const eventKey = this.getEventKey(event);

            // Schedule start timer if start time is in the future
            if (event._date && event._date > now) {
                const timeUntilStart = event._date.getTime() - now.getTime();

                const startTimer = setTimeout(() => {
                    if (!this.stopped) {
                        this.triggerEventStart(event);
                    }
                }, timeUntilStart);

                const timer = this.eventTimers.get(eventKey) || {};
                timer.startTimer = startTimer;
                this.eventTimers.set(eventKey, timer);

                this.adapter.log.debug(
                    `Scheduled event start: ${event.event} at ${event._date.toISOString()} (in ${Math.floor(timeUntilStart / 1000)}s)`,
                );
            }

            // Schedule end timer if end time is in the future
            if (event._end && event._end > now) {
                const timeUntilEnd = event._end.getTime() - now.getTime();

                const endTimer = setTimeout(() => {
                    if (!this.stopped) {
                        this.triggerEventEnd(event);
                    }
                }, timeUntilEnd);

                const timer = this.eventTimers.get(eventKey) || {};
                timer.endTimer = endTimer;
                this.eventTimers.set(eventKey, timer);

                this.adapter.log.debug(
                    `Scheduled event end: ${event.event} at ${event._end.toISOString()} (in ${Math.floor(timeUntilEnd / 1000)}s)`,
                );
            }
        }
    }

    /**
     * Evaluate the schedule to find events that should be triggered now
     * This runs frequently (every 100ms) to catch exact event times
     */
    evaluateSchedule() {
        if (this.daemonRunning) {
            return; // Skip if already evaluating
        }

        this.daemonRunning = true;

        try {
            const now = new Date();

            for (const event of this.cachedEvents) {
                const eventKey = this.getEventKey(event);

                // Check for ongoing events (started but not ended)
                const hasStarted = event._date && event._date <= now;
                const hasEnded = event._end && event._end <= now;

                if (hasStarted && !hasEnded) {
                    // Event is currently ongoing
                    const currentState = this.trackedEventStates.get(eventKey);

                    // Only update if state changed from previous evaluation
                    if (currentState !== true) {
                        this.setEventState(event, true);
                        this.trackedEventStates.set(eventKey, true);
                    }
                } else if (hasEnded) {
                    // Event has ended
                    const currentState = this.trackedEventStates.get(eventKey);

                    // Only update if state changed from previous evaluation
                    if (currentState !== false) {
                        this.setEventState(event, false);
                        this.trackedEventStates.set(eventKey, false);
                    }
                } else {
                    // Event hasn't started yet
                    const currentState = this.trackedEventStates.get(eventKey);

                    // Reset tracking if we haven't started yet
                    if (currentState !== false) {
                        this.trackedEventStates.set(eventKey, false);
                    }
                }
            }
        } catch (error) {
            this.adapter.log.error(`Error in scheduler evaluation: ${error.message}`);
        } finally {
            this.daemonRunning = false;
        }
    }

    /**
     * Trigger actions when an event starts
     *
     * @param {object} event - The event that is starting
     */
    triggerEventStart(event) {
        this.adapter.log.info(`Event started: ${event.event} at ${event._date.toISOString()}`);
        this.setEventState(event, true);
    }

    /**
     * Trigger actions when an event ends
     *
     * @param {object} event - The event that is ending
     */
    triggerEventEnd(event) {
        this.adapter.log.info(`Event ended: ${event.event} at ${event._end.toISOString()}`);
        this.setEventState(event, false);
    }

    /**
     * Set the state for an event based on whether it's active
     * Handles both event indicators and configured trigger states
     *
     * @param {object} event - The event object
     * @param {boolean} active - Whether the event is currently active
     */
    async setEventState(event, active) {
        if (!this.setStateCallback) {
            return;
        }

        try {
            // Call the main adapter's callback to handle the state update
            this.setStateCallback(event, active);
        } catch (error) {
            this.adapter.log.error(`Error setting event state for "${event.event}": ${error.message}`);
        }
    }

    /**
     * Get a unique key for an event
     *
     * @param {object} event - The event object
     * @returns {string} Unique key for the event
     */
    getEventKey(event) {
        // Create a unique key based on event properties
        // Include calName to differentiate same-named events from different calendars
        return `${event._calName}_${event.event}_${event._date.getTime()}_${event._end.getTime()}`;
    }

    /**
     * Get current tracked state for an event
     *
     * @param {object} event - The event object
     * @returns {boolean|null} Current state or null if not tracked
     */
    getEventState(event) {
        const eventKey = this.getEventKey(event);
        return this.trackedEventStates.get(eventKey) || null;
    }

    /**
     * Get number of currently active events
     *
     * @returns {number} Count of active events
     */
    getActiveEventCount() {
        let count = 0;
        for (const state of this.trackedEventStates.values()) {
            if (state === true) {
                count++;
            }
        }
        return count;
    }
}

module.exports = EventScheduler;
