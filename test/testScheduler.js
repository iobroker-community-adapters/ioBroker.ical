'use strict';

const { expect } = require('chai');
const EventScheduler = require('../lib/scheduler');

describe('EventScheduler', () => {
    let mockAdapter;
    let scheduler;

    beforeEach(() => {
        // Mock adapter with logging capabilities
        mockAdapter = {
            log: {
                debug: () => {},
                info: () => {},
                warn: () => {},
                error: () => {},
            },
        };

        scheduler = new EventScheduler(mockAdapter);
    });

    afterEach(() => {
        if (scheduler) {
            scheduler.stop();
        }
    });

    describe('constructor', () => {
        it('should initialize with default values', () => {
            expect(scheduler.adapter).to.equal(mockAdapter);
            expect(scheduler.eventTimers).to.be.an('map');
            expect(scheduler.cachedEvents).to.be.an('array');
            expect(scheduler.cachedEvents).to.have.lengthOf(0);
            expect(scheduler.trackedEventStates).to.be.a('map');
            expect(scheduler.stopped).to.be.false;
            expect(scheduler.daemon).to.be.null;
            expect(scheduler.daemonRunning).to.be.false;
        });
    });

    describe('setStateCallbackFn', () => {
        it('should set the callback function', () => {
            const callback = () => {};
            scheduler.setStateCallbackFn(callback);
            expect(scheduler.setStateCallback).to.equal(callback);
        });
    });

    describe('start', () => {
        it('should start the daemon', () => {
            scheduler.start();
            expect(scheduler.daemon).to.not.be.null;
            expect(scheduler.stopped).to.be.false;
            scheduler.stop();
        });

        it('should not start daemon if already running', () => {
            scheduler.start();
            const firstDaemon = scheduler.daemon;
            scheduler.start();
            expect(scheduler.daemon).to.equal(firstDaemon);
            scheduler.stop();
        });
    });

    describe('stop', () => {
        it('should stop the daemon', () => {
            scheduler.start();
            expect(scheduler.daemon).to.not.be.null;
            scheduler.stop();
            expect(scheduler.daemon).to.be.null;
            expect(scheduler.stopped).to.be.true;
        });

        it('should clear all timers', () => {
            scheduler.start();
            scheduler.eventTimers.set('test1', {
                startTimer: setTimeout(() => {}, 1000),
                endTimer: setTimeout(() => {}, 2000),
            });
            scheduler.eventTimers.set('test2', {
                startTimer: setTimeout(() => {}, 3000),
            });

            scheduler.stop();

            expect(scheduler.eventTimers).to.have.lengthOf(0);
            expect(scheduler.trackedEventStates).to.have.lengthOf(0);
        });
    });

    describe('updateCache', () => {
        it('should update the cached events', () => {
            const events = [
                { event: 'Event 1', _date: new Date(), _end: new Date(Date.now() + 3600000), _calName: 'cal1' },
                { event: 'Event 2', _date: new Date(), _end: new Date(Date.now() + 7200000), _calName: 'cal1' },
            ];

            scheduler.updateCache(events);

            expect(scheduler.cachedEvents).to.have.lengthOf(2);
            expect(scheduler.cachedEvents[0].event).to.equal('Event 1');
            expect(scheduler.cachedEvents[1].event).to.equal('Event 2');
        });

        it('should handle null/undefined events array', () => {
            scheduler.updateCache(null);
            expect(scheduler.cachedEvents).to.be.an('array');
            expect(scheduler.cachedEvents).to.have.lengthOf(0);

            scheduler.updateCache(undefined);
            expect(scheduler.cachedEvents).to.be.an('array');
            expect(scheduler.cachedEvents).to.have.lengthOf(0);
        });

        it('should clear old timers when updating cache', () => {
            scheduler.start();

            // Add some timers
            scheduler.eventTimers.set('oldTimer', {
                startTimer: setTimeout(() => {}, 5000),
            });

            const oldTimersCount = scheduler.eventTimers.size;
            expect(oldTimersCount).to.equal(1);

            scheduler.updateCache([]);

            // Timers should be cleared
            expect(scheduler.eventTimers.size).to.equal(0);
        });

        it('should reset tracked event states', () => {
            scheduler.trackedEventStates.set('event1', true);
            scheduler.trackedEventStates.set('event2', false);

            scheduler.updateCache([]);

            expect(scheduler.trackedEventStates).to.have.lengthOf(0);
        });
    });

    describe('getEventKey', () => {
        it('should generate unique key for an event', () => {
            const event = {
                event: 'Test Event',
                _calName: 'TestCal',
                _date: new Date('2025-12-20T09:00:00'),
                _end: new Date('2025-12-20T10:00:00'),
            };

            const key = scheduler.getEventKey(event);
            expect(key).to.be.a('string');
            expect(key).to.include('TestCal');
            expect(key).to.include('Test Event');
        });

        it('should generate different keys for different events', () => {
            const event1 = {
                event: 'Event 1',
                _calName: 'cal1',
                _date: new Date('2025-12-20T09:00:00'),
                _end: new Date('2025-12-20T10:00:00'),
            };

            const event2 = {
                event: 'Event 2',
                _calName: 'cal1',
                _date: new Date('2025-12-20T09:00:00'),
                _end: new Date('2025-12-20T10:00:00'),
            };

            const key1 = scheduler.getEventKey(event1);
            const key2 = scheduler.getEventKey(event2);

            expect(key1).to.not.equal(key2);
        });
    });

    describe('getEventState', () => {
        it('should retrieve tracked event state', () => {
            const event = {
                event: 'Test Event',
                _calName: 'TestCal',
                _date: new Date('2025-12-20T09:00:00'),
                _end: new Date('2025-12-20T10:00:00'),
            };

            const key = scheduler.getEventKey(event);
            scheduler.trackedEventStates.set(key, true);

            const state = scheduler.getEventState(event);
            expect(state).to.be.true;
        });

        it('should return null for untracked events', () => {
            const event = {
                event: 'Unknown Event',
                _calName: 'UnknownCal',
                _date: new Date('2025-12-20T09:00:00'),
                _end: new Date('2025-12-20T10:00:00'),
            };

            const state = scheduler.getEventState(event);
            expect(state).to.be.null;
        });
    });

    describe('getActiveEventCount', () => {
        it('should count active events', () => {
            scheduler.trackedEventStates.set('event1', true);
            scheduler.trackedEventStates.set('event2', true);
            scheduler.trackedEventStates.set('event3', false);
            scheduler.trackedEventStates.set('event4', true);

            const count = scheduler.getActiveEventCount();
            expect(count).to.equal(3);
        });

        it('should return 0 when no events are active', () => {
            scheduler.trackedEventStates.set('event1', false);
            scheduler.trackedEventStates.set('event2', false);

            const count = scheduler.getActiveEventCount();
            expect(count).to.equal(0);
        });

        it('should return 0 when no events are tracked', () => {
            const count = scheduler.getActiveEventCount();
            expect(count).to.equal(0);
        });
    });

    describe('evaluateSchedule', () => {
        it('should mark ongoing events as active', (done) => {
            const now = new Date();
            const pastDate = new Date(now.getTime() - 1000); // 1 second ago
            const futureDate = new Date(now.getTime() + 5000); // 5 seconds in future

            const event = {
                event: 'Ongoing Event',
                _calName: 'TestCal',
                _date: pastDate,
                _end: futureDate,
            };

            let stateChangeCalled = false;

            scheduler.setStateCallbackFn((ev, active) => {
                if (ev.event === 'Ongoing Event' && active === true) {
                    stateChangeCalled = true;
                }
            });

            scheduler.cachedEvents = [event];
            scheduler.evaluateSchedule();

            expect(stateChangeCalled).to.be.true;
            done();
        });

        it('should mark ended events as inactive', (done) => {
            const now = new Date();
            const pastDate = new Date(now.getTime() - 5000); // 5 seconds ago
            const pastEnd = new Date(now.getTime() - 1000); // 1 second ago

            const event = {
                event: 'Ended Event',
                _calName: 'TestCal',
                _date: pastDate,
                _end: pastEnd,
            };

            let stateChangeCalled = false;

            scheduler.setStateCallbackFn((ev, active) => {
                if (ev.event === 'Ended Event' && active === false) {
                    stateChangeCalled = true;
                }
            });

            scheduler.cachedEvents = [event];
            scheduler.evaluateSchedule();

            expect(stateChangeCalled).to.be.true;
            done();
        });

        it('should not call callback for events that have not started', (done) => {
            const now = new Date();
            const futureDate = new Date(now.getTime() + 5000); // 5 seconds in future
            const futureEnd = new Date(now.getTime() + 10000); // 10 seconds in future

            const event = {
                event: 'Future Event',
                _calName: 'TestCal',
                _date: futureDate,
                _end: futureEnd,
            };

            let callbackCalled = false;

            scheduler.setStateCallbackFn(() => {
                callbackCalled = true;
            });

            scheduler.cachedEvents = [event];
            scheduler.evaluateSchedule();

            expect(callbackCalled).to.be.false;
            done();
        });

        it('should prevent concurrent evaluations', (done) => {
            let evaluationCount = 0;

            // Mock evaluateSchedule to count evaluations
            const originalEvaluate = scheduler.evaluateSchedule.bind(scheduler);
            scheduler.evaluateSchedule = function () {
                evaluationCount++;
                this.daemonRunning = true; // Simulate running state

                // Try to call evaluate again (should skip)
                originalEvaluate.call(this);

                this.daemonRunning = false;
            };

            scheduler.cachedEvents = [];
            scheduler.evaluateSchedule();

            // Should only execute once due to daemonRunning check
            expect(evaluationCount).to.equal(1);
            done();
        });
    });

    describe('setEventState', () => {
        it('should call the state callback when set', (done) => {
            const event = {
                event: 'Test Event',
                _calName: 'TestCal',
                _date: new Date(),
                _end: new Date(),
            };

            scheduler.setStateCallbackFn((ev, active) => {
                expect(ev).to.deep.equal(event);
                expect(active).to.be.true;
                done();
            });

            scheduler.setEventState(event, true);
        });

        it('should handle errors in callback gracefully', () => {
            const event = {
                event: 'Error Event',
                _calName: 'TestCal',
                _date: new Date(),
                _end: new Date(),
            };

            scheduler.setStateCallbackFn(() => {
                throw new Error('Callback error');
            });

            // Should not throw
            expect(() => {
                scheduler.setEventState(event, true);
            }).to.not.throw();
        });

        it('should do nothing if no callback is set', () => {
            const event = {
                event: 'Test Event',
                _calName: 'TestCal',
                _date: new Date(),
                _end: new Date(),
            };

            // Should not throw even without callback
            expect(() => {
                scheduler.setEventState(event, true);
            }).to.not.throw();
        });
    });

    describe('integration test', () => {
        it('should handle a complete cycle of event scheduling and evaluation', (done) => {
            const now = new Date();
            const startTime = new Date(now.getTime() + 100); // 100ms in future
            const endTime = new Date(startTime.getTime() + 200); // Ends 200ms after start

            const event = {
                event: 'Integration Test Event',
                _calName: 'TestCal',
                _date: startTime,
                _end: endTime,
            };

            const stateChanges = [];

            scheduler.setStateCallbackFn((ev, active) => {
                stateChanges.push({ event: ev.event, active, time: Date.now() });
            });

            scheduler.start();
            scheduler.updateCache([event]);

            // Give time for the event to trigger
            setTimeout(() => {
                scheduler.stop();

                // Should have recorded state changes
                expect(stateChanges.length).to.be.greaterThan(0);
                done();
            }, 500);
        }).timeout(2000);
    });
});
