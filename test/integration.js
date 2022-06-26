'use strict';

const path = require('path');
const { tests, IntegrationTestHarness } = require('@iobroker/testing');
const chai = require('chai');
chai.use(require('chai-string'));
const expect = chai.expect;

const setupIcsToday = require(__dirname + '/lib/setupIcsToday');
const setupIcsEvent = require(__dirname + '/lib/setupIcsEvent');
const setupIcsFilter = require(__dirname + '/lib/setupIcsFilter');

// Run integration tests - See https://github.com/ioBroker/testing for a detailed explanation and further options
tests.integration(path.join(__dirname, '..'), {
    allowedExitCodes: [11],
    defineAdditionalTests({ suite }) {

        suite('Test Today', getHarness => {
            /**
             * @type {IntegrationTestHarness}
             */
            let harness;
            before(async function () {
                this.timeout(60000);

                setupIcsToday.setup();
                harness = getHarness();

                harness.changeAdapterConfig(harness.adapterName, {
                    native: {
                        daysPreview: 7,
                        daysPast: 0,
                        fulltime: '',
                        replaceDates: false,
                        hideYear: true,
                        calendars: [
                            {
                                name: 'calendar-today',
                                url: __dirname + '/data/today.ics',
                                user: '',
                                pass: '',
                                sslignore: 'ignore',
                                color: 'orange'
                            }
                        ],
                        events: [
                            {
                                name: 'Vacation',
                                enabled: true,
                                display: false
                            },
                            {
                                name: 'MyEvent',
                                enabled: true,
                                display: true
                            },
                            {
                                name: 'TestEvent',
                                enabled: true,
                                display: true
                            },
                            {
                                name: 'InDayEvent',
                                enabled: true,
                                display: false
                            }
                        ]
                    }
                });

                return new Promise(resolve => {
                    harness.startAdapterAndWait()
                        .then(() => {
                            expect(harness.isAdapterRunning()).to.be.true;
                            expect(harness.isControllerRunning()).to.be.true;

                            // Wait for adapter stop
                            harness.on('stateChange', async (id, state) => {
                                if (
                                    id === `system.adapter.${harness.adapterName}.0.alive` &&
                                    state &&
                                    state.val === false
                                ) {
                                    setTimeout(() => {
                                        resolve();
                                    }, 2000);
                                }
                            });
                        });
                });
            });

            it('Check event count', async function () {

                /*
                    * TestEvent
                    * MyEvent BlaEvent
                    * FulldayWithSameDate
                    * Today Event
                    * SameDay
                */
                const stateDataCount = await harness.states.getStateAsync(`${harness.adapterName}.0.data.count`);
                expect(stateDataCount.val).to.be.equal(5);

                /*
                    * TestEvent
                    * MyEvent BlaEvent
                    * MorgenVoll
                    * Reminder
                    * InDay2
                    * TestUserEvent1
                    * OverEvent
                */
                const stateDataCountTomorrow = await harness.states.getStateAsync(`${harness.adapterName}.0.data.countTomorrow`);
                expect(stateDataCountTomorrow.val).to.be.equal(7);

            });

            it('Check data table', async function () {

                const stateVacationEventToday = await harness.states.getStateAsync(`${harness.adapterName}.0.events.0.today.Vacation`);
                expect(stateVacationEventToday.val).to.be.true;

                const stateMyEventToday = await harness.states.getStateAsync(`${harness.adapterName}.0.events.0.today.MyEvent`);
                expect(stateMyEventToday.val).to.be.true;

                const stateTestEventToday = await harness.states.getStateAsync(`${harness.adapterName}.0.events.0.today.TestEvent`);
                expect(stateTestEventToday.val).to.be.true;

                const stateInDayEventToday = await harness.states.getStateAsync(`${harness.adapterName}.0.events.0.today.InDayEvent`);
                expect(stateInDayEventToday.val).to.be.false;

                const stateDataTable = await harness.states.getStateAsync(`${harness.adapterName}.0.data.table`);
                const dataTableObj = JSON.parse(stateDataTable.val);

                expect(dataTableObj[0].event).to.be.equal('TestEvent');
                expect(dataTableObj[0]._section).to.be.equal('TestEvent');
                expect(dataTableObj[0].date).to.startsWith('&#8594; ');
                expect(dataTableObj[0].date).to.endsWith('. 02:00');
                expect(dataTableObj[0]._allDay).to.be.false;
                expect(dataTableObj[0].location).to.be.equal('Test-Location');

                expect(dataTableObj[1].event).to.be.equal('Today Event');
                expect(dataTableObj[1]._section).to.be.equal('Today Event');
                expect(dataTableObj[1].date).to.not.have.string('&#8594; ');
                expect(dataTableObj[1].date).to.endsWith('. 00:00');
                expect(dataTableObj[1]._allDay).to.be.true;

                expect(dataTableObj[2].event).to.be.equal('MyEvent BlaEvent');
                expect(dataTableObj[2]._section).to.be.equal('MyEvent BlaEvent');
                expect(dataTableObj[2].date).to.startsWith('&#8594; ');
                expect(dataTableObj[2].date).to.endsWith('. 00:00');
                expect(dataTableObj[2]._allDay).to.be.true;

                expect(dataTableObj[3].event).to.be.equal('FulldayWithSameDate');
                expect(dataTableObj[3]._section).to.be.equal('FulldayWithSameDate');
                expect(dataTableObj[3].date).to.endsWith('. 00:00');
                expect(dataTableObj[3]._allDay).to.be.true;

                expect(dataTableObj[4].event).to.be.equal('SameDay');
                expect(dataTableObj[4]._section).to.be.equal('SameDay');
                expect(dataTableObj[4].date).to.endsWith('59');
                // expect(dataTableObj[4].date).to.endsWith('. 23:58-23:59'); TZ Conversion, TODO
                expect(dataTableObj[4]._allDay).to.be.false;

                expect(dataTableObj[5].event).to.be.equal('MorgenVoll');
                expect(dataTableObj[5]._section).to.be.equal('MorgenVoll');
                expect(dataTableObj[5].date).to.endsWith('. 00:00-00:00');
                expect(dataTableObj[5]._allDay).to.be.true;

                expect(dataTableObj[6].event).to.be.equal('Reminder');
                expect(dataTableObj[6]._section).to.be.equal('Reminder');
                expect(dataTableObj[6].date).to.endsWith('. 10:00');
                expect(dataTableObj[6]._allDay).to.be.false;

                expect(dataTableObj[7].event).to.be.equal('InDay2');
                expect(dataTableObj[7]._section).to.be.equal('InDay2');
                expect(dataTableObj[7].date).to.endsWith('. 18:00-20:00');
                expect(dataTableObj[7]._allDay).to.be.false;

                expect(dataTableObj[8].event).to.be.equal('TestUserEvent1');
                expect(dataTableObj[8]._section).to.be.equal('TestUserEvent1');
                expect(dataTableObj[8].date).to.endsWith(':30');
                //expect(dataTableObj[8].date).to.endsWith('. 19:30-20:30'); TZ Conversion, TODO
                expect(dataTableObj[8]._allDay).to.be.false;

                expect(dataTableObj[9].event).to.be.equal('OverEvent');
                expect(dataTableObj[9]._section).to.be.equal('OverEvent');
                expect(dataTableObj[9].date).to.endsWith('. 22:00-02:00');
                expect(dataTableObj[9].date).to.not.have.string('+1');
                expect(dataTableObj[9]._allDay).to.be.false;

            });
        });

        suite('Test Event', getHarness => {
            /**
             * @type {IntegrationTestHarness}
             */
            let harness;
            before(async function () {
                this.timeout(60000);

                setupIcsEvent.setup();
                harness = getHarness();

                harness.changeAdapterConfig(harness.adapterName, {
                    native: {
                        daysPreview: 2,
                        daysPast: 0,
                        fulltime: '',
                        replaceDates: false,
                        hideYear: true,
                        calendars: [
                            {
                                name: 'calendar-event',
                                url: __dirname + '/data/event.ics',
                                user: '',
                                pass: '',
                                sslignore: 'ignore',
                                color: 'red'
                            }
                        ],
                        events: [
                            {
                                name: 'EventThreeDays',
                                enabled: true,
                                display: false
                            },
                            {
                                name: 'Event Now',
                                enabled: true,
                                display: true
                            },
                            {
                                name: 'EventDisabled',
                                enabled: false,
                                display: true
                            },
                            {
                                name: 'EventLater',
                                enabled: true,
                                display: true
                            },
                            {
                                name: 'EventNextDay1',
                                enabled: true,
                                display: true
                            },
                            {
                                name: 'EventNextDay2',
                                enabled: true,
                                display: true
                            },
                            {
                                name: 'EventNextDay3',
                                enabled: true,
                                display: true
                            }
                        ]
                    }
                });

                return new Promise(resolve => {
                    harness.startAdapterAndWait()
                        .then(() => {
                            expect(harness.isAdapterRunning()).to.be.true;
                            expect(harness.isControllerRunning()).to.be.true;

                            // Wait for adapter stop
                            harness.on('stateChange', async (id, state) => {
                                if (
                                    id === `system.adapter.${harness.adapterName}.0.alive` &&
                                    state &&
                                    state.val === false
                                ) {
                                    setTimeout(() => {
                                        resolve();
                                    }, 2000);
                                }
                            });
                        });
                });
            });

            it('Check event count', async function () {

                const stateDataCount = await harness.states.getStateAsync(`${harness.adapterName}.0.data.count`);
                expect(stateDataCount.val).to.be.equal(3);

                const stateDataCountTomorrow = await harness.states.getStateAsync(`${harness.adapterName}.0.data.countTomorrow`);
                expect(stateDataCountTomorrow.val).to.be.equal(1);

            });

            const eventTests = [
                {name: 'ical.0.events.0.later.EventThreeDays', value: false},
                {name: 'ical.0.events.0.today.EventThreeDays', value: true},
                {name: 'ical.0.events.0.now.EventThreeDays', value: true},
                {name: 'ical.0.events.1.EventThreeDays', value: true},
                {name: 'ical.0.events.2.EventThreeDays', value: false},
                {name: 'ical.0.events.0.later.EventNow', value: false},
                {name: 'ical.0.events.0.today.EventNow', value: true},
                {name: 'ical.0.events.0.now.EventNow', value: true},
                {name: 'ical.0.events.1.EventNow', value: false},
                {name: 'ical.0.events.2.EventNow', value: false},
                {name: 'ical.0.events.0.later.EventDisabled', value: undefined},
                {name: 'ical.0.events.0.today.EventDisabled', value: undefined},
                {name: 'ical.0.events.0.now.EventDisabled', value: undefined},
                {name: 'ical.0.events.1.EventDisabled', value: undefined},
                {name: 'ical.0.events.2.EventDisabled', value: undefined},
                {name: 'ical.0.events.0.later.EventLater', value: true},
                {name: 'ical.0.events.0.today.EventLater', value: true},
                {name: 'ical.0.events.0.now.EventLater', value: false},
                {name: 'ical.0.events.1.EventLater', value: false},
                {name: 'ical.0.events.2.EventLater', value: false},
                {name: 'ical.0.events.0.later.EventNextDay1', value: false},
                {name: 'ical.0.events.0.today.EventNextDay1', value: false},
                {name: 'ical.0.events.0.now.EventNextDay1', value: false},
                {name: 'ical.0.events.1.EventNextDay1', value: true},
                {name: 'ical.0.events.2.EventNextDay1', value: false},
                {name: 'ical.0.events.0.later.EventNextDay2', value: false},
                {name: 'ical.0.events.0.today.EventNextDay2', value: false},
                {name: 'ical.0.events.0.now.EventNextDay2', value: false},
                {name: 'ical.0.events.1.EventNextDay2', value: false},
                {name: 'ical.0.events.2.EventNextDay2', value: true},
                {name: 'ical.0.events.0.later.EventNextDay3', value: false},
                {name: 'ical.0.events.0.today.EventNextDay3', value: false},
                {name: 'ical.0.events.0.now.EventNextDay3', value: false},
                {name: 'ical.0.events.1.EventNextDay3', value: false},
                {name: 'ical.0.events.2.EventNextDay3', value: false}
            ];

            for (let t = 0; t < eventTests.length; t++) {
                it(`Checking event "${eventTests[t].name}"`, function (done) {

                    harness.states.getState(eventTests[t].name, function (err, state) {
                        expect(err).to.be.not.ok;
                        if (eventTests[t].value === undefined) {
                            expect(state).to.be.null;
                        } else {
                            expect(state.val).to.be.equals(eventTests[t].value);
                        }

                        done();
                    });

                });
            }
        });

        suite('Test Filter', getHarness => {
            /**
             * @type {IntegrationTestHarness}
             */
            let harness;
            before(async function () {
                this.timeout(60000);

                setupIcsFilter.setup();
                harness = getHarness();

                harness.changeAdapterConfig(harness.adapterName, {
                    native: {
                        daysPreview: 2,
                        daysPast: 0,
                        fulltime: '',
                        replaceDates: false,
                        hideYear: true,
                        calendars: [
                            {
                                name: 'calendar-filter',
                                url: __dirname + '/data/filter.ics',
                                user: '',
                                pass: '',
                                sslignore: 'ignore',
                                color: 'red',
                                filter: 'Description-1;Summary-2 ;Location-3',
                                filterregex: false
                            }
                        ],
                        events: [
                            {
                                name: 'Vacation',
                                enabled: true,
                                display: false
                            }
                        ]
                    }
                });

                return new Promise(resolve => {
                    harness.startAdapterAndWait()
                        .then(() => {
                            expect(harness.isAdapterRunning()).to.be.true;
                            expect(harness.isControllerRunning()).to.be.true;

                            // Wait for adapter stop
                            harness.on('stateChange', async (id, state) => {
                                if (
                                    id === `system.adapter.${harness.adapterName}.0.alive` &&
                                    state &&
                                    state.val === false
                                ) {
                                    setTimeout(() => {
                                        resolve();
                                    }, 2000);
                                }
                            });
                        });
                });
            });

            it('Check event count', async function () {

                const stateDataCount = await harness.states.getStateAsync(`${harness.adapterName}.0.data.count`);
                expect(stateDataCount.val).to.be.equal(0);

                const stateDataCountTomorrow = await harness.states.getStateAsync(`${harness.adapterName}.0.data.countTomorrow`);
                expect(stateDataCountTomorrow.val).to.be.equal(1);

            });

            it('Check data table', async function () {

                const stateDataTable = await harness.states.getStateAsync(`${harness.adapterName}.0.data.table`);
                const dataTableObj = JSON.parse(stateDataTable.val);

                expect(dataTableObj[0].event).to.be.equal('Test-Filter-Summary-4');
                expect(dataTableObj[0]._section).to.be.equal('Test-Filter-Description-4');
                expect(dataTableObj[0].location).to.be.equal('Test-Filter-Location-4');

            });
        });
    }
});
