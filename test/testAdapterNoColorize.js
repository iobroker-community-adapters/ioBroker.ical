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
var adapterShortNameLog = adapterShortName + ' Config No Colorize (' + setup.getCurrentTimezoneName() + ')';

var d1 = new Date();
d1.setDate(d1.getDate() + 1);
var m1 = (d1.getMonth() + 1);
if (m1 < 10) m1 = '0' + m1;
var day1 = d1.getDate();
if (day1 < 10) day1 = '0' + day1;

var d2 = new Date();
d2.setDate(d2.getDate() + 2);
var m2 = (d2.getMonth() + 1);
if (m2 < 10) m2 = '0' + m2;
var day2 = d2.getDate();
if (day2 < 10) day2 = '0' + day2;

function setupIcsFiles() {
	var dn1 = new Date();
	dn1.setDate(dn1.getDate() - 4);
	dn1.setMonth(dn1.getMonth() - 4);
	var mn1 = (dn1.getMonth() + 1);
	if (mn1 < 10) mn1 = '0' + mn1;
	var dayn1 = dn1.getDate();
	if (dayn1 < 10) dayn1 = '0' + dayn1;

	var dn2 = new Date();
	dn2.setDate(dn2.getDate() - 4);
	dn2.setMonth(dn2.getMonth() - 4);
	var mn2 = (dn2.getMonth() + 1);
	if (mn2 < 10) mn2 = '0' + mn2;
	var dayn2 = dn2.getDate();
	if (dayn2 < 10) dayn2 = '0' + dayn2;

	var data = fs.readFileSync(__dirname + '/data/calender_head_template.ics').toString();

    // past event
    data += 'BEGIN:VEVENT\n';
    data += 'CLASS:PUBLIC\n';
    data += 'DESCRIPTION:  \\n\n';
    data += 'DTEND;VALUE=DATE:' + dn2.getFullYear() + mn2 + dayn2 + '\n';
    data += 'DTSTAMP:20181011T171553Z\n';
    data += 'DTSTART;VALUE=DATE:' + dn1.getFullYear() + mn1 + dayn1 + '\n';
    data += 'PRIORITY:5\n';
    data += 'RRULE:FREQ=YEARLY;BYMONTH=' + (dn1.getMonth() + 1) + ';BYMONTHDAY=' + dn1.getDate() + '\n';
    data += 'SEQUENCE:0\n';
    data += 'SUMMARY:Jarno Geburtstag\n';
    data += 'TRANSP:TRANSPARENT\n';
    data += 'UID:e920175b-fd11-42db-b961-6b7960f20f74\n';
    data += 'X-MICROSOFT-CDO-BUSYSTATUS:FREE\n';
    data += 'X-RADICALE-NAME:e920175b-fd11-42db-b961-6b7960f20f74.ics\n';
    data += 'END:VEVENT\n';

    // recurring event
    data += 'BEGIN:VEVENT\n';
    data += 'CLASS:PUBLIC\n';
    data += 'DTEND;VALUE=DATE:' + d2.getFullYear() + m2 + day2 + '\n';
    data += 'DTSTAMP:20181012T150122Z\n';
    data += 'DTSTART;VALUE=DATE:' + d1.getFullYear() + m1 + day1 + '\n';
    data += 'PRIORITY:5\n';
    data += 'RRULE:FREQ=YEARLY;BYMONTH=' + (d1.getMonth() + 1) + ';BYMONTHDAY=' + d1.getDate() + '\n';
    data += 'SEQUENCE:0\n';
    data += 'SUMMARY:Test jährlich wiederholen\n';
    data += 'TRANSP:TRANSPARENT\n';
    data += 'UID:ec1cbf54-1aae-44bc-8c23-b27668f2be32\n';
    data += 'X-MICROSOFT-CDO-BUSYSTATUS:FREE\n';
    data += 'BEGIN:VALARM\n';
    data += 'ACTION:DISPLAY\n';
    data += 'DESCRIPTION:This is an event reminder\n';
    data += 'TRIGGER:-PT12H\n';
    data += 'X-RADICALE-NAME:ec1cbf54-1aae-44bc-8c23-b27668f2be32.ics\n';
    data += 'END:VALARM\n';
    data += 'X-RADICALE-NAME:ec1cbf54-1aae-44bc-8c23-b27668f2be32.ics\n';
    data += 'END:VEVENT\n';

    data += 'END:VCALENDAR\n';
    fs.writeFileSync(__dirname + '/data/recurring_without_timezones.ics', data);
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
            config.native.colorize = false;
            config.native.calendars[0] = {
                "name": "calendar1-recurring",
                "url": __dirname + '/data/recurring_without_timezones.ics',
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
            expect(state.val[0].date).to.be.equal(day1 + '.' + m1 + '. 00:00-00:00');
            expect(state.val[0].event).to.be.equal('Test jährlich wiederholen');
            expect(state.val[0]._section).to.be.equal(undefined);
            expect(state.val[0]._allDay).to.be.true;

            done();
        });
    });

    it('Test ' + adapterShortNameLog + ': data.html', function (done) {
        this.timeout(5000);

        states.getState('ical.0.data.html', function (err, state) {
            expect(err).to.be.not.ok;
            expect(state.val).to.have.entriesCount('<span ', 2);
            expect(state.val).to.have.entriesCount('</span>', 2);

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
