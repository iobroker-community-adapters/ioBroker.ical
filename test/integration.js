'use strict';

const path = require('path');
const { tests, IntegrationTestHarness } = require('@iobroker/testing');
const setupIcsToday = require(__dirname + '/lib/setupIcsToday');
const chai = require('chai');
chai.use(require('chai-string'));
const expect = chai.expect;

// Run integration tests - See https://github.com/ioBroker/testing for a detailed explanation and further options
tests.integration(path.join(__dirname, '..'), {
    allowedExitCodes: [11],
    defineAdditionalTests({ suite }) {

        suite('Test Today', getHarness => {
            /**
             * @type {IntegrationTestHarness}
             */
            let harness;
            before(() => {
                setupIcsToday.setup();
                harness = getHarness();

                harness.changeAdapterConfig(harness.adapterName, {
                    native: {
                        daysPreview: 7,
                        daysPast: 0,
                        colorize: true,
                        fulltime: '',
                        replaceDates: false,
                        hideYear: true,
                        calendars: [
                            /*
                            {
                                name: 'calendar1-holiday',
                                url: __dirname + '/data/germany_holidays.ics',
                                user: 'username',
                                pass: 'password',
                                sslignore: 'ignore',
                                color: 'red'
                            },
                            */
                            {
                                name: 'calendar-today',
                                url: __dirname + '/data/today.ics',
                                user: 'username',
                                pass: 'password',
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
            });

            it('Test Events and data table', function (done) {
                this.timeout(60000);

                harness.startAdapterAndWait()
                    .then(() => {
                        expect(harness.isAdapterRunning()).to.be.true;
                        expect(harness.isControllerRunning()).to.be.true;

                        // Wait for adapter stop
                        return new Promise(resolve => {
                            harness.on('stateChange', async (id, state) => {
                                if (
                                    id === `system.adapter.${harness.adapterName}.0.alive` &&
                                    state &&
                                    state.val === false
                                ) {
                                    setTimeout(() => {
                                        resolve(harness.adapterExit);
                                    }, 2000);
                                }
                            });
                        });
                    })
                    .then(async (exitCode) => {
                        // expect(exitCode).to.equal(11);

                        const stateDataCount = await harness.states.getStateAsync(`${harness.adapterName}.0.data.count`);
                        expect(stateDataCount.val).to.be.equal(4);

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

                        expect(dataTableObj[4].event).to.be.equal('MorgenVoll');
                        expect(dataTableObj[4]._section).to.be.equal('MorgenVoll');
                        expect(dataTableObj[4].date).to.endsWith('. 00:00-00:00');
                        expect(dataTableObj[4]._allDay).to.be.true;

                        expect(dataTableObj[5].event).to.be.equal('SameDay');
                        expect(dataTableObj[5]._section).to.be.equal('SameDay');
                        expect(dataTableObj[5].date).to.endsWith('59');
                        // expect(dataTableObj[5].date).to.endsWith('. 23:58-23:59'); TZ Conversion, TODO
                        expect(dataTableObj[5]._allDay).to.be.false;

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

                        done();
                    });
            });
        });

    }
});
