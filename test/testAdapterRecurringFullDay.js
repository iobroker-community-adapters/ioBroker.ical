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
var adapterShortNameLog = adapterShortName + ' Recurring Fullday (' + setup.getCurrentTimezoneName() + ')';

function setupIcsFiles() {
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

    var data = fs.readFileSync(__dirname + '/data/calender_head_template.ics').toString();;

    data += 'BEGIN:VTIMEZONE\n';
    data += 'TZID:Europe/Berlin\n';
    data += 'X-LIC-LOCATION:Europe/Berlin\n';
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

	data += 'BEGIN:VEVENT\n';
	data += 'DTSTART;VALUE=DATE:' + d1.getFullYear() + m1 + day1 + '\n';
	data += 'DTEND;VALUE=DATE:' + d2.getFullYear() + m2 + day2 + '\n';
	data += 'RRULE:FREQ=WEEKLY;BYDAY=SU,SA\n';
	data += 'DTSTAMP:20181010T062520Z\n';
	data += 'UID:2C340B07-5893-4234-B0E5-A5EE82858F01\n';
	data += 'CREATED:20181008T073122Z\n';
	data += 'DESCRIPTION:WE\n';
	data += 'LAST-MODIFIED:20181008T073122Z\n';
	data += 'LOCATION:\n';
	data += 'SEQUENCE:0\n';
	data += 'STATUS:CONFIRMED\n';
	data += 'SUMMARY:WE\n';
	data += 'TRANSP:TRANSPARENT\n';
	data += 'END:VEVENT\n';

    data += 'END:VCALENDAR\n';
    fs.writeFileSync(__dirname + '/data/recurring_fullday.ics', data);
}

function parseDate(input) {
	  var parts = input.split('.');
	  var date = new Date(new Date().getFullYear(), parts[1]-1, parts[0]);
	  var today = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()).getTime();

	  if(date.getTime() < today) {
		  date = new Date(new Date().getFullYear() + 1, parts[1] - 1, parts[0]);
	  }

	  return date;
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
            config.native.daysPreview = 7;
            config.native.calendars[0] = {
                "name": "calendar1-recurring",
                "url": __dirname + '/data/recurring_fullday.ics',
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
        	var d1 = new Date();
        	var weekend = d1.getDay() == 0 || d1.getDay() == 6;
            expect(err).to.be.not.ok;
            expect(state.val).to.be.equal(weekend ? 1 : 0);
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
            expect(state.val[0].date).to.contains('. 00:00');
            expect(state.val[0].event).to.be.equal('WE');
            expect(state.val[0]._section).to.be.equal('WE');
            expect(state.val[0]._allDay).to.be.true;

            expect(state.val[1].date).to.endsWith('. 00:00-00:00');
            expect(state.val[1].event).to.be.equal('WE');
            expect(state.val[1]._section).to.be.equal('WE');
            expect(state.val[1]._allDay).to.be.true;

            expect([
            	parseDate(state.val[0].date).getDay(),
            	parseDate(state.val[1].date).getDay()
            ]).to.be.an('array').that.includes(0, 6);

            done();
        });
    });

    it('Test ' + adapterShortNameLog + ': data.html', function (done) {
        this.timeout(5000);

        states.getState('ical.0.data.html', function (err, state) {
            expect(err).to.be.not.ok;
            expect(setup.instr(state.val, '<span ')).to.be.equal(setup.instr(state.val, '</span>'));                

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
