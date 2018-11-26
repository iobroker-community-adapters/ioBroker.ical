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
var adapterShortNameLog = adapterShortName + ' Config Replace Fulltime (' + setup.getCurrentTimezoneName() + ')';

function setupIcsFiles() {
    var d0 = new Date();
    d0.setDate(d0.getDate() - 1);
    var m0 = (d0.getMonth() + 1);
    if (m0 < 10) m0 = '0' + m0;
    var day0 = d0.getDate();
    if (day0 < 10) day0 = '0' + day0;

    var d1 = new Date();
    var m1 = (d1.getMonth() + 1);
    if (m1 < 10) m1 = '0' + m1;
    var day1 = d1.getDate();
    if (day1 < 10) day1 = '0' + day1;

    var d2 = new Date();
    d2.setDate(d2.getDate() + 1);
    var m2 = (d2.getMonth() + 1);
    if (m2 < 10) m2 = '0' + m2;
    var day2 = d2.getDate();
    if (day2 < 10) day2 = '0' + day2;

    var d3 = new Date();
    d3.setDate(d3.getDate() + 2);
    var m3 = (d3.getMonth() + 1);
    if (m3 < 10) m3 = '0' + m3;
    var day3 = d3.getDate();
    if (day3 < 10) day3 = '0' + day3;

    var data = fs.readFileSync(__dirname + '/data/calender_head_template.ics').toString();

    // Fullday event for 1 day with Trigger "Vacation"
    data += 'BEGIN:VEVENT\n';
    data += 'DTSTART;VALUE=DATE:' + d1.getFullYear() + m1 + day1 + '\n';
    data += 'DTEND;VALUE=DATE:' + d2.getFullYear() + m2 + day2 + '\n';
    data += 'DTSTAMP:20111213T124028Z\n';
    data += 'UID:2fb00ad3a214f7369e7a95f56@calendarlabs.com\n';
    data += 'CREATED:20111213T123901Z\n';
    data += 'DESCRIPTION:Vacation\n';
    data += 'LAST-MODIFIED:20111213T123901Z\n';
    data += 'LOCATION:\n';
    data += 'SEQUENCE:0\n';
    data += 'STATUS:CONFIRMED\n';
    data += "SUMMARY:Vacation\n";
    data += 'TRANSP:TRANSPARENT\n';
    data += 'END:VEVENT\n';

    // Fullday event for 1 day with Trigger "Vacation"
    data += 'BEGIN:VEVENT\n';
    data += 'DTSTART;VALUE=DATE:' + d1.getFullYear() + m1 + day1 + '\n';
    data += 'DTEND;VALUE=DATE:' + d2.getFullYear() + m2 + day2 + '\n';
    data += 'DTSTAMP:20111213T124028Z\n';
    data += 'UID:2fb00ad3a214f7369e7a95f61@calendarlabs.com\n';
    data += 'CREATED:20111213T123901Z\n';
    data += 'DESCRIPTION:Today Event\n';
    data += 'LAST-MODIFIED:20111213T123901Z\n';
    data += 'LOCATION:\n';
    data += 'SEQUENCE:0\n';
    data += 'STATUS:CONFIRMED\n';
    data += "SUMMARY:Today Event\n";
    data += 'TRANSP:TRANSPARENT\n';
    data += 'END:VEVENT\n';

    // Fullday event for 2 days with Trigger "MyEvent" and  "BlaEvent"
    data += 'BEGIN:VEVENT\n';
    data += 'DTSTART;VALUE=DATE:' + d1.getFullYear() + m1 + day1 + '\n';
    data += 'DTEND;VALUE=DATE:' + d3.getFullYear() + m3 + day3 + '\n';
    data += 'DTSTAMP:20111213T124028Z\n';
    data += 'UID:2fb00ad3a214f7369e7a95f57@calendarlabs.com\n';
    data += 'CREATED:20111213T123901Z\n';
    data += 'DESCRIPTION:MyEvent BlaEvent\n';
    data += 'LAST-MODIFIED:20111213T123901Z\n';
    data += 'LOCATION:\n';
    data += 'SEQUENCE:0\n';
    data += 'STATUS:CONFIRMED\n';
    data += "SUMMARY:MyEvent BlaEvent\n";
    data += 'TRANSP:TRANSPARENT\n';
    data += 'END:VEVENT\n';

    // event for over 0:00
    data += 'BEGIN:VEVENT\n';
    data += 'DTSTART:' + d2.getFullYear() + m2 + day2 + 'T220000\n';
    data += 'DTEND:' + d3.getFullYear() + m3 + day3 + 'T020000\n';
    data += 'DTSTAMP:20111213T124028Z\n';
    data += 'UID:2fb00ad3a214f7369e7a95f62@calendarlabs.com\n';
    data += 'CREATED:20111213T123901Z\n';
    data += 'DESCRIPTION:OverEvent\n';
    data += 'LAST-MODIFIED:20111213T123901Z\n';
    data += 'LOCATION:\n';
    data += 'SEQUENCE:0\n';
    data += 'STATUS:CONFIRMED\n';
    data += "SUMMARY:OverEvent\n";
    data += 'TRANSP:TRANSPARENT\n';
    data += 'END:VEVENT\n';

    // event for over 0:00
    data += 'BEGIN:VEVENT\n';
    data += 'DTSTART;VALUE=DATE:' + d2.getFullYear() + m2 + day2 + '\n';
    data += 'DTEND;VALUE=DATE:' + d3.getFullYear() + m3 + day3 + '\n';
    data += 'DTSTAMP:20111213T124028Z\n';
    data += 'UID:2fb00ad3a214f7369e7a95f65@calendarlabs.com\n';
    data += 'CREATED:20111213T123901Z\n';
    data += 'DESCRIPTION:MorgenVoll\n';
    data += 'LAST-MODIFIED:20111213T123901Z\n';
    data += 'LOCATION:\n';
    data += 'SEQUENCE:0\n';
    data += 'STATUS:CONFIRMED\n';
    data += "SUMMARY:MorgenVoll\n";
    data += 'TRANSP:TRANSPARENT\n';
    data += 'END:VEVENT\n';

    // event for over 0:00
    data += 'BEGIN:VEVENT\n';
    data += 'DTSTART:' + d0.getFullYear() + m0 + day0 + 'T220000\n';
    data += 'DTEND:' + d3.getFullYear() + m3 + day3 + 'T020000\n';
    data += 'DTSTAMP:20111213T124028Z\n';
    data += 'UID:2fb00ad3a214f7369e7a95f58@calendarlabs.com\n';
    data += 'CREATED:20111213T123901Z\n';
    data += 'DESCRIPTION:TestEvent\n';
    data += 'LAST-MODIFIED:20111213T123901Z\n';
    data += 'LOCATION:\n';
    data += 'SEQUENCE:0\n';
    data += 'STATUS:CONFIRMED\n';
    data += "SUMMARY:TestEvent\n";
    data += 'TRANSP:TRANSPARENT\n';
    data += 'END:VEVENT\n';

    // event for over 0:00
    data += 'BEGIN:VEVENT\n';
    data += 'DTSTART:' + d2.getFullYear() + m2 + day2 + 'T180000\n';
    data += 'DTEND:' + d2.getFullYear() + m2 + day2 + 'T200000\n';
    data += 'DTSTAMP:20111213T124028Z\n';
    data += 'UID:2fb00ad3a214f7369e7a95f60@calendarlabs.com\n';
    data += 'CREATED:20111213T123901Z\n';
    data += 'DESCRIPTION:InDayEvent\n';
    data += 'LAST-MODIFIED:20111213T123901Z\n';
    data += 'LOCATION:\n';
    data += 'SEQUENCE:0\n';
    data += 'STATUS:CONFIRMED\n';
    data += "SUMMARY:InDayEvent\n";
    data += 'TRANSP:TRANSPARENT\n';
    data += 'END:VEVENT\n';

    // event for over 0:00
    data += 'BEGIN:VEVENT\n';
    data += 'DTSTART:' + d2.getFullYear() + m2 + day2 + 'T180000\n';
    data += 'DTEND:' + d2.getFullYear() + m2 + day2 + 'T200000\n';
    data += 'DTSTAMP:20111213T124028Z\n';
    data += 'UID:2fb00ad3a214f7369e7a95f63@calendarlabs.com\n';
    data += 'CREATED:20111213T123901Z\n';
    data += 'DESCRIPTION:InDay2\n';
    data += 'LAST-MODIFIED:20111213T123901Z\n';
    data += 'LOCATION:\n';
    data += 'SEQUENCE:0\n';
    data += 'STATUS:CONFIRMED\n';
    data += "SUMMARY:InDay2\n";
    data += 'TRANSP:TRANSPARENT\n';
    data += 'END:VEVENT\n';

    // Fullday event for 2 days with Trigger "MyEvent" and  "BlaEvent"
    data += 'BEGIN:VEVENT\n';
    data += 'DTSTART:' + d2.getFullYear() + m2 + day2 + 'T100000\n';
    data += 'DTEND:' + d2.getFullYear() + m2 + day2 + 'T100000\n';
    data += 'DTSTAMP:20111213T124028Z\n';
    data += 'UID:2fb00ad3a214f7369e7a95f59@calendarlabs.com\n';
    data += 'CREATED:20111213T123901Z\n';
    data += 'DESCRIPTION:Reminder\n';
    data += 'LAST-MODIFIED:20111213T123901Z\n';
    data += 'LOCATION:\n';
    data += 'SEQUENCE:0\n';
    data += 'STATUS:CONFIRMED\n';
    data += "SUMMARY:Reminder\n";
    data += 'TRANSP:TRANSPARENT\n';
    data += 'END:VEVENT\n';

    data += 'BEGIN:VEVENT\n';
    data += 'CREATED:20160525T175643Z\n';
    data += 'LAST-MODIFIED:20171114T171736Z\n';
    data += 'DTSTAMP:20171114T171736Z\n';
    data += 'UID:7defc9a5-a1c8-419d-a05c-58cf98e83cdb\n';
    data += 'DESCRIPTION:TestUserEvent1\n';
    data += 'SUMMARY:TestUserEvent1\n';
    data += 'DTSTART;TZID=Europe/Berlin:' + d2.getFullYear() + m2 + day2 + 'T193000\n';
    data += 'DTEND;TZID=Europe/Berlin:' + d2.getFullYear() + m2 + day2 + 'T203000\n';
    data += 'TRANSP:OPAQUE\n';
    data += 'SEQUENCE:4\n';
    data += 'X-MOZ-GENERATION:4\n';
    data += 'END:VEVENT\n';

    data += 'BEGIN:VEVENT\n';
    data += 'CREATED:20160525T175643Z\n';
    data += 'LAST-MODIFIED:20171114T171736Z\n';
    data += 'DTSTAMP:20171114T171736Z\n';
    data += 'UID:7defc9a5-a1c8-419d-a05c-65cf98e83cdb\n';
    data += 'DESCRIPTION:SameDay\n';
    data += 'SUMMARY:SameDay\n';
    data += 'DTSTART;TZID=Europe/Berlin:' + d1.getFullYear() + m1 + day1 + 'T235800\n';
    data += 'DTEND;TZID=Europe/Berlin:' + d1.getFullYear() + m1 + day1 + 'T235900\n';
    data += 'TRANSP:OPAQUE\n';
    data += 'SEQUENCE:4\n';
    data += 'X-MOZ-GENERATION:4\n';
    data += 'END:VEVENT\n';

    data += 'END:VCALENDAR\n';
    fs.writeFileSync(__dirname + '/data/fulltime_replace.ics', data);
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

            config.native.fulltime = " ganzer Tag";
            config.native.forceFullday = false;
            config.native.replaceDates = false;
            config.native.dataPaddingWithZeros = false;
            config.native.calendars[0] = {
                "name": "calendar-holiday",
                "url": __dirname + '/data/germany_holidays.ics',
                "user": "username",
                "pass": "password",
                "sslignore": "ignore",
                "color": "red"
            };
            config.native.calendars[1] = {
                "name": "calendar-today",
                "url": __dirname + '/data/fulltime_replace.ics',
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
            expect(state.val).to.be.equal(4);
            done();
        });
    });

    it('Test ' + adapterShortNameLog + ': event Vacation', function (done) {
        this.timeout(5000);

        states.getState('ical.0.events.0.today.Vacation', function (err, state) {
            expect(err).to.be.not.ok;
            expect(state.val).to.be.true;
            done();
        });
    });

    it('Test ' + adapterShortNameLog + ': event MyEvent', function (done) {
        this.timeout(5000);

        states.getState('ical.0.events.0.today.MyEvent', function (err, state) {
            expect(err).to.be.not.ok;
            expect(state.val).to.be.true;
            done();
        });
    });

    it('Test ' + adapterShortNameLog + ': event TestEvent', function (done) {
        this.timeout(5000);

        states.getState('ical.0.events.0.today.TestEvent', function (err, state) {
            expect(err).to.be.not.ok;
            expect(state.val).to.be.true;
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
            expect(state.val[0].date).to.startsWith('&#8594; ');
            expect(state.val[0].date).to.endsWith(' 2:00');
            expect(state.val[0].event).to.be.equal('TestEvent');
            expect(state.val[0]._section).to.be.equal('TestEvent');
            expect(state.val[0]._allDay).to.be.false;

            expect(state.val[1].date).to.not.have.string('&#8594; ');
            expect(state.val[1].date).to.endsWith('  ganzer Tag');
            expect(state.val[1].event).to.be.equal('Today Event');
            expect(state.val[1]._section).to.be.equal('Today Event');
            expect(state.val[1]._allDay).to.be.true;

            expect(state.val[2].date).to.startsWith('&#8594; ');
            expect(state.val[2].date).to.endsWith('  ganzer Tag');
            expect(state.val[2].event).to.be.equal('MyEvent BlaEvent');
            expect(state.val[2]._section).to.be.equal('MyEvent BlaEvent');
            expect(state.val[2]._allDay).to.be.true;

            expect(state.val[3].date).to.endsWith(' 23:58-23:59');
            expect(state.val[3].event).to.be.equal('SameDay');
            expect(state.val[3]._section).to.be.equal('SameDay');
            expect(state.val[3]._allDay).to.be.false;

            expect(state.val[4].date).to.endsWith('  ganzer Tag');
            expect(state.val[4].event).to.be.equal('MorgenVoll');
            expect(state.val[4]._section).to.be.equal('MorgenVoll');
            expect(state.val[4]._allDay).to.be.true;

            expect(state.val[5].date).to.endsWith(' 10:00');
            expect(state.val[5].event).to.be.equal('Reminder');
            expect(state.val[5]._section).to.be.equal('Reminder');
            expect(state.val[5]._allDay).to.be.false;

            expect(state.val[6].date).to.endsWith(' 18:00-20:00');
            expect(state.val[6].event).to.be.equal('InDay2');
            expect(state.val[6]._section).to.be.equal('InDay2');
            expect(state.val[6]._allDay).to.be.false;

            expect(state.val[7].date).to.endsWith(' 19:30-20:30');
            expect(state.val[7].event).to.be.equal('TestUserEvent1');
            expect(state.val[7]._section).to.be.equal('TestUserEvent1');
            expect(state.val[7]._allDay).to.be.false;

            expect(state.val[8].date).to.endsWith(' 22:00-2:00');
            expect(state.val[8].event).to.be.equal('OverEvent');
            expect(state.val[8]._section).to.be.equal('OverEvent');
            expect(state.val[8]._allDay).to.be.false;

            done();
        });
    });

    it('Test ' + adapterShortNameLog + ': data.html', function (done) {
        this.timeout(5000);

        states.getState('ical.0.data.html', function (err, state) {
            expect(err).to.be.not.ok;
            expect(state.val).to.have.entriesCount('<span ', 36);
            expect(state.val).to.have.entriesCount('</span>', 36);

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
