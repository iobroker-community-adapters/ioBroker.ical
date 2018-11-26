/* jshint -W097 */// jshint strict:false
/*jslint node: true */
var chai = require('chai');
chai.use(require('chai-string'));
var expect = chai.expect;
var setup  = require(__dirname + '/lib/setup');
var fs     = require('fs');

var objects = null;
var states  = null;
var lacyStates = {states: null};

var adapterShortName = setup.adapterName.substring(setup.adapterName.indexOf('.')+1);
var adapterShortNameLog = adapterShortName + ' Recurring with invalid Timezones (' + setup.getCurrentTimezoneName() + ')';

function setupIcsFiles() {
    var d2 = new Date();
    d2.setDate(d2.getDate() + 1);
    var m2 = (d2.getMonth() + 1);
    if (m2 < 10) m2 = '0' + m2;
    var day2 = d2.getDate();
    if (day2 < 10) day2 = '0' + day2;

    var d4 = new Date();
    d4.setDate(d4.getDate() + 3);
    var m4 = (d4.getMonth() + 1);
    if (m4 < 10) m4 = '0' + m4;
    var day4 = d4.getDate();
    if (day4 < 10) day4 = '0' + day4;

    var d6 = new Date();
    d6.setDate(d6.getDate() + 5);
    var m6 = (d6.getMonth() + 1);
    if (m6 < 10) m6 = '0' + m6;
    var day6 = d6.getDate();
    if (day6 < 10) day6 = '0' + day6;

    var data = fs.readFileSync(__dirname + '/data/calender_head_template.ics').toString();;
    
    // invalid timezone
    data += 'BEGIN:VTIMEZONE\n';
    data += 'TZID:Europe/Hannover\n';
    data += 'X-LIC-LOCATION:Europe/Hannover\n';
    data += 'BEGIN:DAYLIGHT\n';
    data += 'TZOFFSETFROM:+0100\n';
    data += 'TZOFFSETTO:+0200\n';
    data += 'TZNAME:CEST\n';
    data += 'DTSTART:19700329T020000\n';
    data += 'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU\n';
    data += 'END:DAYLIGHT\n';
    data += 'BEGIN:STANDARD\n';
    data += 'TZOFFSETFROM:+0200\n';
    data += 'TZOFFSETTO:+0100\n';
    data += 'TZNAME:CET\n';
    data += 'DTSTART:19701025T030000\n';
    data += 'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU\n';
    data += 'END:STANDARD\n';
    data += 'END:VTIMEZONE\n';

    // valid timezone
    data += 'BEGIN:VTIMEZONE\n';
    data += 'TZID:W. Europe Standard Time\n';
    data += 'X-LIC-LOCATION:W. Europe Standard Time\n';
    data += 'BEGIN:DAYLIGHT\n';
    data += 'TZOFFSETFROM:+0100\n';
    data += 'TZOFFSETTO:+0200\n';
    data += 'TZNAME:CEST\n';
    data += 'DTSTART:19700329T020000\n';
    data += 'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU\n';
    data += 'END:DAYLIGHT\n';
    data += 'BEGIN:STANDARD\n';
    data += 'TZOFFSETFROM:+0200\n';
    data += 'TZOFFSETTO:+0100\n';
    data += 'TZNAME:CET\n';
    data += 'DTSTART:19701025T030000\n';
    data += 'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU\n';
    data += 'END:STANDARD\n';
    data += 'END:VTIMEZONE\n';

    // valid timezone, but ignored
    data += 'BEGIN:VTIMEZONE\n';
    data += 'TZID:America/Dawson\n';
    data += 'X-LIC-LOCATION:America/Dawson\n';
    data += 'BEGIN:DAYLIGHT\n';
    data += 'TZOFFSETFROM:-0800\n';
    data += 'TZOFFSETTO:-0700\n';
    data += 'TZNAME:PDT\n';
    data += 'DTSTART:19700308T020000\n';
    data += 'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU\n';
    data += 'END:DAYLIGHT\n';
    data += 'BEGIN:STANDARD\n';
    data += 'TZOFFSETFROM:-0700\n';
    data += 'TZOFFSETTO:-0800\n';
    data += 'TZNAME:PST\n';
    data += 'DTSTART:19701101T020000\n';
    data += 'RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU\n';
    data += 'END:STANDARD\n';
    data += 'END:VTIMEZONE\n';

    // event with invalid timezone
    data += 'BEGIN:VEVENT\n';
    data += 'DTSTART;TZID=Europe/Hannover:' + d2.getFullYear() + m2 + day2 + 'T130000\n';
    data += 'DTEND;TZID=Europe/Hannover:' + d2.getFullYear() + m2 + day2 + 'T140000\n';
    data += 'EXDATE;TZID=Europe/Hannover:' + d6.getFullYear() + m6 + day6 + 'T130000\n';
    data += 'RRULE:FREQ=DAILY;INTERVAL=2\n';
    data += 'DTSTAMP:20171227T110728Z\n';
    data += 'UID:2C340B07-5893-4921-B0E5-A5EE82858F01\n';
    data += 'CREATED:20171227T082153Z\n';
    data += 'DESCRIPTION:RecurringTest\n';
    data += 'LAST-MODIFIED:20171227T110650Z\n';
    data += 'LOCATION:\n';
    data += 'SEQUENCE:0\n';
    data += 'STATUS:CONFIRMED\n';
    data += 'SUMMARY:RecurringTest\n';
    data += 'TRANSP:OPAQUE\n';
    data += 'X-APPLE-TRAVEL-ADVISORY-BEHAVIOR:AUTOMATIC\n';
    data += 'END:VEVENT\n';

    // event with no timezone
    data += 'BEGIN:VEVENT\n';
    data += 'DTSTART:' + d4.getFullYear() + m4 + day4 + 'T150000\n';
    data += 'DTEND:' + d4.getFullYear() + m4 + day4 + 'T160000\n';
    data += 'DTSTAMP:20171227T110728Z\n';
    data += 'UID:2C340B07-5893-4921-B0E5-A5EE82858F01\n';
    data += 'RECURRENCE-ID;TZID=Europe/Hannover:' + d4.getFullYear() + m4 + day4 + 'T130000\n';
    data += 'CREATED:20171227T082153Z\n';
    data += 'DESCRIPTION:RecurringTest-Exception\n';
    data += 'LAST-MODIFIED:20171227T082203Z\n';
    data += 'LOCATION:\n';
    data += 'SEQUENCE:0\n';
    data += 'STATUS:CONFIRMED\n';
    data += 'SUMMARY:RecurringTest-Exception\n';
    data += 'TRANSP:OPAQUE\n';
    data += 'X-APPLE-TRAVEL-ADVISORY-BEHAVIOR:AUTOMATIC\n';
    data += 'END:VEVENT\n';

    data += 'END:VCALENDAR\n';
    fs.writeFileSync(__dirname + '/data/recurring_invalid_timezones.ics', data);
}

describe('Test ' + adapterShortNameLog + ' adapter', function() {
    before('Test ' + adapterShortNameLog + ' adapter: Start js-controller', function (_done) {
        this.timeout(600000); // because of first install from npm

        setupIcsFiles();

        setup.setupController(function () {
            var config = setup.getAdapterConfig();
            // enable adapter
            config.common.enabled  = true;
            config.common.loglevel = 'silly';

            config.native.fulltime = "";
            config.native.forceFullday = false;
            config.native.replaceDates = false;
            config.native.hideYear = true;
            config.native.daysPreview = 8;
            config.native.calendars[0] = {
                "name": "calendar1-recurring",
                "url": __dirname + '/data/recurring_invalid_timezones.ics',
                "user": "username",
                "pass": "password",
                "sslignore": "ignore",
                "color": "red"
            };

            config.native.events[0] = {
                "name": "Vacation",
                "enabled": true,
                "display": false
            };
            config.native.events[1] = {
                "name": "MyEvent",
                "enabled": true,
                "display": true
            };
            config.native.events[2] = {
                "name": "TestEvent",
                "enabled": true,
                "display": true
            };
            config.native.events[3] = {
                "name": "InDayEvent",
                "enabled": true,
                "display": false
            };

            setup.setAdapterConfig(config.common, config.native);

            setup.startController(true, function(id, obj) {}, function (id, state) {
                },
                function (_objects, _states) {
                    objects = _objects;
                    states  = _states;
                    lacyStates.states = states;
                    _done();
                });
        });
    });

    it('Test ' + adapterShortNameLog + ' adapter: Check if adapter started', function (done) {
        this.timeout(60000);
        setup.checkAdapterStartedAndFinished(lacyStates, function (res) {
            if (res) console.log(res);
            expect(res).not.to.be.equal('Cannot check connection');
            objects.setObject('system.adapter.test.0', {
                    common: {
                    },
                    type: 'instance'
                },
                function () {
                    states.subscribeMessage('system.adapter.test.0');

                    done();
                });
        });
    });

    it('Test ' + adapterShortNameLog + ': check count of events', function (done) {
        this.timeout(5000);

        states.getState('ical.0.data.count', function (err, state) {
            expect(err).to.be.not.ok;
            expect(state.val).to.be.equal(0);
            done();
        });
    });

    it('Test ' + adapterShortNameLog + ': event Vacation', function (done) {
        this.timeout(5000);

        states.getState('ical.0.events.0.today.Vacation', function (err, state) {
            expect(err).to.be.not.ok;
            expect(state.val).to.be.false;
            done();
        });
    });

    it('Test ' + adapterShortNameLog + ': event MyEvent', function (done) {
        this.timeout(5000);

        states.getState('ical.0.events.0.today.MyEvent', function (err, state) {
            expect(err).to.be.not.ok;
            expect(state.val).to.be.false;
            done();
        });
    });

    it('Test ' + adapterShortNameLog + ': event TestEvent', function (done) {
        this.timeout(5000);

        states.getState('ical.0.events.0.today.TestEvent', function (err, state) {
            expect(err).to.be.not.ok;
            expect(state.val).to.be.false;
            done();
        });
    });

    it('Test ' + adapterShortNameLog + ': event InDayEvent', function (done) {
        this.timeout(5000);

        states.getState('ical.0.events.0.today.InDayEvent', function (err, state) {
            expect(err).to.be.not.ok;
            expect(state.val).to.be.false;
            done();
        });
    });

    it('Test ' + adapterShortNameLog + ': data.table', function (done) {
        this.timeout(5000);

        states.getState('ical.0.data.table', function (err, state) {
            expect(err).to.be.not.ok;
            expect(state.val[0].date).to.endsWith('. 13:00-14:00');
            expect(state.val[0].event).to.be.equal('RecurringTest');
            expect(state.val[0]._section).to.be.equal('RecurringTest');
            expect(state.val[0]._allDay).to.be.false;

            expect(state.val[1].date).to.endsWith('. 15:00-16:00');
            expect(state.val[1].event).to.be.equal('RecurringTest-Exception');
            expect(state.val[1]._section).to.be.equal('RecurringTest-Exception');
            expect(state.val[1]._allDay).to.be.false;

            expect(state.val[2].date).to.endsWith('. 13:00-14:00');
            expect(state.val[2].event).to.be.equal('RecurringTest');
            expect(state.val[2]._section).to.be.equal('RecurringTest');
            expect(state.val[2]._allDay).to.be.false;

            done();
        });
    });

    it('Test ' + adapterShortNameLog + ': data.html', function (done) {
        this.timeout(5000);

        states.getState('ical.0.data.html', function (err, state) {
            expect(err).to.be.not.ok;
            expect(state.val).to.have.entriesCount('<span ', 12);
            expect(state.val).to.have.entriesCount('</span>', 12);

            done();
        });
    });

    after('Test ' + adapterShortNameLog + ' adapter: Stop js-controller', function (done) {
        this.timeout(10000);

        setup.stopController(function (normalTerminated) {
            console.log('Adapter normal terminated: ' + normalTerminated);
            done();
        });
    });
});
