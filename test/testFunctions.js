var expect = require('chai').expect;
var setup  = require(__dirname + '/lib/setup');
var fs     = require('fs');

var objects = null;
var states  = null;
var onStateChanged = null;
var onObjectChanged = null;

if (!fs.existsSync(__dirname + '/data/germany_holidays_today.ics')) {
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

    var data = fs.readFileSync(__dirname + '/data/germany_holidays.ics');
    var lines = data.toString().split('\n');
    lines.splice(lines.length - 1, 1);
    data = lines.join('\n');
    data += '\nBEGIN:VEVENT\n';
    data += 'DTSTART;VALUE=DATE:' + d1.getFullYear() + m1 + day1 + '\n';
    data += 'DTEND;VALUE=DATE:' + d2.getFullYear() + m2 + day2 + '\n';
    data += 'DTSTAMP:20111213T124028Z\n';
    data += 'UID:2fb00ad3a214f7369e7a95f56@calendarlabs.com\n';
    data += 'CREATED:20111213T123901Z\n';
    data += 'DESCRIPTION:today event description\n';
    data += 'LAST-MODIFIED:20111213T123901Z\n';
    data += 'LOCATION:\n';
    data += 'SEQUENCE:0\n';
    data += 'STATUS:CONFIRMED\n';
    data += "SUMMARY:today event\n";
    data += 'TRANSP:TRANSPARENT\n';
    data += 'END:VEVENT\n';
    data += 'END:VCALENDAR';
    fs.writeFileSync(__dirname + '/data/germany_holidays_today.ics', data);
}

describe('Test iCal', function() {
    before('Test iCal: Start js-controller', function (_done) {
        this.timeout(600000); // because of first install from npm

        setup.setupController(function () {
            var config = setup.getAdapterConfig();
            // enable adapter
            config.common.enabled  = true;
            config.common.loglevel = 'debug';

            config.native.calendars[0].url = __dirname + '/data/germany_holidays_today.ics';

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
