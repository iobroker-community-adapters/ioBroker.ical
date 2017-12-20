var expect = require('chai').expect;
var setup  = require(__dirname + '/lib/setup');
var fs     = require('fs');

var objects = null;
var states  = null;
var onStateChanged = null;
var onObjectChanged = null;

if (!fs.existsSync(__dirname + '/data/today.ics')) {
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
    d3.setDate(d2.getDate() + 1);
    var m3 = (d3.getMonth() + 1);
    if (m3 < 10) m3 = '0' + m3;
    var day3 = d3.getDate();
    if (day3 < 10) day3 = '0' + day3;

    var data = fs.readFileSync(__dirname + '/data/empty.ics');
    var lines = data.toString().split('\n');
    lines.splice(lines.length - 1, 1);
    data = lines.join('\n');

    // Fullday event for 1 day with Trigger "Vacation"
    data += '\nBEGIN:VEVENT\n';
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
    data += "SUMMARY:today event\n";
    data += 'TRANSP:TRANSPARENT\n';
    data += 'END:VEVENT\n';

    // Fullday event for 2 days with Trigger "Vacation"
    data += '\nBEGIN:VEVENT\n';
    data += 'DTSTART;VALUE=DATE:' + d1.getFullYear() + m1 + day1 + '\n';
    data += 'DTEND;VALUE=DATE:' + d2.getFullYear() + m2 + day3 + '\n';
    data += 'DTSTAMP:20111213T124028Z\n';
    data += 'UID:2fb00ad3a214f7369e7a95f57@calendarlabs.com\n';
    data += 'CREATED:20111213T123901Z\n';
    data += 'DESCRIPTION:MyEvent MyTestEvent\n';
    data += 'LAST-MODIFIED:20111213T123901Z\n';
    data += 'LOCATION:\n';
    data += 'SEQUENCE:0\n';
    data += 'STATUS:CONFIRMED\n';
    data += "SUMMARY:today event\n";
    data += 'TRANSP:TRANSPARENT\n';
    data += 'END:VEVENT\n';

    // event for over 0:00
    data += '\nBEGIN:VEVENT\n';
    data += 'DTSTART;VALUE=DATE:' + d1.getFullYear() + m0 + day0 + 'T220000\n';
    data += 'DTEND;VALUE=DATE:' + d2.getFullYear() + m2 + day2 + 'T020000\n';
    data += 'DTSTAMP:20111213T124028Z\n';
    data += 'UID:2fb00ad3a214f7369e7a95f57@calendarlabs.com\n';
    data += 'CREATED:20111213T123901Z\n';
    data += 'DESCRIPTION:MyEvent MyTestEvent\n';
    data += 'LAST-MODIFIED:20111213T123901Z\n';
    data += 'LOCATION:\n';
    data += 'SEQUENCE:0\n';
    data += 'STATUS:CONFIRMED\n';
    data += "SUMMARY:today event\n";
    data += 'TRANSP:TRANSPARENT\n';
    data += 'END:VEVENT\n';

    data += 'END:VCALENDAR';
    fs.writeFileSync(__dirname + '/data/today.ics', data);
}

describe('Test iCal', function() {
    before('Test iCal: Start js-controller', function (_done) {
        this.timeout(600000); // because of first install from npm

        setup.setupController(function () {
            var config = setup.getAdapterConfig();
            // enable adapter
            config.common.enabled  = true;
            config.common.loglevel = 'debug';

            config.native.calendars[0] = {
                "name": "calendar1",
                "url": __dirname + '/data/germany_holidays.ics',
                "user": "username",
                "pass": "password",
                "sslignore": "ignore",
                "color": "red"
            };
            config.native.calendars[1] = {
                "name": "calendar2",
                "url": __dirname + '/data/today.ics',
                "user": "username",
                "pass": "password",
                "sslignore": "ignore",
                "color": "red"
            };

            config.native.events[0] = {
                "name": "Vacation",
                "enabled": true,
                "display": false
            }
            config.native.events[1] = {
                "name": "MyEvent",
                "enabled": true,
                "display": false
            }
            config.native.events[2] = {
                "name": "TestEvent",
                "enabled": true,
                "display": false
            }
            config.native.events[3] = {
                "name": "MyTestEvent",
                "enabled": false,
                "display": false
            }


            setup.setAdapterConfig(config.common, config.native);

            setup.startController(true, function (id, obj) {
                    if (onObjectChanged) onObjectChanged(id, obj);
                }, function (id, state) {
                    if (onStateChanged) onStateChanged(id, state);
            },
            function (_objects, _states) {
                objects = _objects;
                states  = _states;
                states.subscribe('*');
                _done();
            });
        });
    });

    it('Test iCal: check count of events', function (done) {
        this.timeout(5000);
        setTimeout(function () {
            states.getState('ical.0.data.count', function (err, state) {
                expect(err).to.be.not.ok;
                expect(state.val).to.be.above(0);
                done();
            });
        }, 3000);
    });

    it('Test iCal: data.table', function (done) {
        this.timeout(2000);
        setTimeout(function () {
            states.getState('ical.0.data.table', function (err, state) {
                expect(err).to.be.not.ok;
                expect(state.val[0].event).to.be.equal('today event');
                expect(state.val[0]._section).to.be.equal('today event description');
                expect(state.val[0]._allDay).to.be.true;
                done();
            });
        }, 1000);
    });

    after('Test iCal: Stop js-controller', function (done) {
        this.timeout(6000);

        setup.stopController(function (normalTerminated) {
            console.log('Adapter normal terminated: ' + normalTerminated);
            done();
        });
    });
});
