/* jshint -W097 */// jshint strict:false
/*jslint node: true */
var chai = require('chai');
chai.use(require('chai-string'));
var expect = chai.expect;
var setup  = require(__dirname + '/lib/setup');
var util  = require(__dirname + '/lib/testUtil');
var fs     = require('fs');

var objects = null;
var states  = null;
var lacyStates = {states: null};

var adapterShortName = setup.adapterName.substring(setup.adapterName.indexOf('.')+1);
var adapterShortNameLog = adapterShortName + ' Filter with RegEx (' + util.getCurrentTimezoneName() + ')';

function setupIcsFiles() {
	var d = new Date();
	d.setDate(d.getDate() + 1);
	var m = (d.getMonth() + 1);
	if (m < 10) m = '0' + m;
	var day = d.getDate();
	if (day < 10) day = '0' + day;

	var data = fs.readFileSync(__dirname + '/data/calender_head_template.ics').toString();

    // filtered by description
    data += 'BEGIN:VEVENT\n';
    data += 'CLASS:PUBLIC\n';
    data += 'DTEND;VALUE=DATE:' + d.getFullYear() + m + day + '\n';
    data += 'DTSTAMP:20181011T171553Z\n';
    data += 'DTSTART;VALUE=DATE:' + d.getFullYear() + m + day + '\n';
    data += 'PRIORITY:5\n';
    data += 'SEQUENCE:0\n';
    data += 'DESCRIPTION:Test-Filter-Description-1\n';
    data += 'LOCATION:Test-Filter-Location-1\n';
    data += 'SUMMARY:Test-Filter-Summary-1\n';
    data += 'TRANSP:TRANSPARENT\n';
    data += 'UID:e920175b-fd11-42db-b961-6b7960f20f73\n';
    data += 'END:VEVENT\n';

    // filtered by location
    data += 'BEGIN:VEVENT\n';
    data += 'CLASS:PUBLIC\n';
    data += 'DTEND;VALUE=DATE:' + d.getFullYear() + m + day + '\n';
    data += 'DTSTAMP:20181012T150122Z\n';
    data += 'DTSTART;VALUE=DATE:' + d.getFullYear() + m + day + '\n';
    data += 'PRIORITY:5\n';
    data += 'SEQUENCE:0\n';
    data += 'DESCRIPTION:Test-Filter-Description-2\n';
    data += 'LOCATION:Test-Filter-Location-2\n';
    data += 'SUMMARY:Test-Filter-Summary-2\n';
    data += 'TRANSP:TRANSPARENT\n';
    data += 'UID:ec1cbf54-1aae-44bc-8c23-b27668f2be31\n';
    data += 'END:VEVENT\n';

    // filtered by summary
    data += 'BEGIN:VEVENT\n';
    data += 'CLASS:PUBLIC\n';
    data += 'DTEND;VALUE=DATE:' + d.getFullYear() + m + day + '\n';
    data += 'DTSTAMP:20181012T150122Z\n';
    data += 'DTSTART;VALUE=DATE:' + d.getFullYear() + m + day + '\n';
    data += 'PRIORITY:5\n';
    data += 'SEQUENCE:0\n';
    data += 'DESCRIPTION:Test-Filter-Description-3\n';
    data += 'LOCATION:Test-Filter-Location-3\n';
    data += 'SUMMARY:Test-Filter-Summary-3\n';
    data += 'TRANSP:TRANSPARENT\n';
    data += 'UID:ec1cbf54-1aae-44bc-8c23-b27668f2be3a\n';
    data += 'END:VEVENT\n';

    // no filter
    data += 'BEGIN:VEVENT\n';
    data += 'CLASS:PUBLIC\n';
    data += 'DTEND;VALUE=DATE:' + d.getFullYear() + m + day + '\n';
    data += 'DTSTAMP:20181012T150122Z\n';
    data += 'DTSTART;VALUE=DATE:' + d.getFullYear() + m + day + '\n';
    data += 'PRIORITY:5\n';
    data += 'SEQUENCE:0\n';
    data += 'DESCRIPTION:Test-Filter-Description-4\n';
    data += 'LOCATION:Test-Filter-Location-4\n';
    data += 'SUMMARY:Test-Filter-Summary-4\n';
    data += 'TRANSP:TRANSPARENT\n';
    data += 'UID:ec1cbf54-1aae-44bc-8c23-b27668f2be30\n';
    data += 'END:VEVENT\n';

    data += 'END:VCALENDAR\n';
    fs.writeFileSync(__dirname + '/data/calender_filter_regex.ics', data);
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
            config.native.daysPreview = 3;
            config.native.colorize = false;
            config.native.calendars[0] = {
                "name": "calendar1-recurring",
                "url": __dirname + '/data/calender_filter_regex.ics',
                "user": "username",
                "pass": "password",
                "sslignore": "ignore",
                "color": "red",
                "filter": '/(SUMMARY:.*)\\s*(DESCRIPTION:.*)\\s*(LOCATION:(?!Test-Filter-Location-4).*)/',
                "filterregex": true
            };

            config.native.events[0] = {
                "name": "Vacation",
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
        util.checkAdapterStartedAndFinished(lacyStates, function (res) {
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

    it('Test ' + adapterShortNameLog + ': data.table', function (done) {
        this.timeout(5000);

        states.getState('ical.0.data.table', function (err, state) {
            expect(err).to.be.not.ok;
            expect(state.val.length).to.be.equal(1);
            expect(state.val[0].event).to.be.equal('Test-Filter-Summary-4');
            expect(state.val[0]._section).to.be.equal('Test-Filter-Description-4');
            expect(state.val[0].location).to.be.equal('Test-Filter-Location-4');

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
