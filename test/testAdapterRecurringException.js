/* jshint -W097 */// jshint strict:false
/*jslint node: true */
var expect = require('chai').expect;
var setup  = require(__dirname + '/lib/setup');
var fs     = require('fs');

var objects = null;
var states  = null;
var onStateChanged = null;
var onObjectChanged = null;
var sendToID = 1;

var adapterShortName = setup.adapterName.substring(setup.adapterName.indexOf('.')+1);
var adapterShortNameLog = adapterShortName + ' Config Normal';

function checkConnectionOfAdapter(cb, counter) {
    counter = counter || 0;
    console.log('Try check #' + counter);
    if (counter > 30) {
        if (cb) cb('Cannot check connection');
        return;
    }

    states.getState('system.adapter.' + adapterShortName + '.0.alive', function (err, state) {
        if (err) console.error(err);
        if (state && state.val) {
            if (cb) cb();
        } else {
            setTimeout(function () {
                checkConnectionOfAdapter(cb, counter + 1);
            }, 1000);
        }
    });
}

function checkValueOfState(id, value, cb, counter) {
    counter = counter || 0;
    if (counter > 20) {
        if (cb) cb('Cannot check value Of State ' + id);
        return;
    }

    states.getState(id, function (err, state) {
        if (err) console.error(err);
        if (value === null && !state) {
            if (cb) cb();
        } else
        if (state && (value === undefined || state.val === value)) {
            if (cb) cb();
        } else {
            setTimeout(function () {
                checkValueOfState(id, value, cb, counter + 1);
            }, 500);
        }
    });
}

function sendTo(target, command, message, callback) {
    onStateChanged = function (id, state) {
        if (id === 'messagebox.system.adapter.test.0') {
            callback(state.message);
        }
    };

    states.pushMessage('system.adapter.' + target, {
        command:    command,
        message:    message,
        from:       'system.adapter.test.0',
        callback: {
            message: message,
            id:      sendToID++,
            ack:     false,
            time:    (new Date()).getTime()
        }
    });
}

function setupIcsFiles() {
    if (!fs.existsSync(__dirname + '/data/recurring.ics')) {
        var d2 = new Date();
        d2.setDate(d2.getDate() + 1);
        var m2 = (d2.getMonth() + 1);
        if (m2 < 10) m2 = '0' + m2;
        var day2 = d2.getDate();
        if (day2 < 10) day2 = '0' + day2;

        var d4 = new Date();
        d4.setDate(d2.getDate() + 2);
        var m4 = (d4.getMonth() + 1);
        if (m4 < 10) m4 = '0' + m4;
        var day4 = d4.getDate();
        if (day4 < 10) day4 = '0' + day4;

        var d6 = new Date();
        d6.setDate(d6.getDate() + 2);
        var m6 = (d6.getMonth() + 1);
        if (m6 < 10) m6 = '0' + m6;
        var day6 = d4.getDate();
        if (day6 < 10) day6 = '0' + day6;

        var data = fs.readFileSync(__dirname + '/data/empty.ics');
        var lines = data.toString().split('\n');
        lines.splice(lines.length - 1, 1);
        data = lines.join('\n');

        data += '\nBEGIN:VEVENT\n';
        data += 'DTSTART;TZID=Europe/Berlin:' + d2.getFullYear() + m2 + day2 + 'T130000\n';
        data += 'DTEND;TZID=Europe/Berlin:' + d2.getFullYear() + m2 + day2 + 'T140000\n';
        data += 'EXDATE;TZID=Europe/Berlin:' + d6.getFullYear() + m6 + day6 + 'T130000\n';
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

        data += 'BEGIN:VEVENT\n';
        data += 'DTSTART;TZID=Europe/Berlin:' + d4.getFullYear() + m4 + day4 + 'T150000\n';
        data += 'DTEND;TZID=Europe/Berlin:' + d4.getFullYear() + m4 + day4 + 'T160000\n';
        data += 'DTSTAMP:20171227T110728Z\n';
        data += 'UID:2C340B07-5893-4921-B0E5-A5EE82858F01\n';
        data += 'RECURRENCE-ID;TZID=Europe/Berlin:' + d4.getFullYear() + m4 + day4 + 'T130000\n';
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

        data += 'END:VCALENDAR';
        fs.writeFileSync(__dirname + '/data/recurring.ics', data);
    }
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
            config.native.calendars[0] = {
                "name": "calendar1",
                "url": __dirname + '/data/recurring.ics',
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
                    if (onStateChanged) onStateChanged(id, state);
                },
                function (_objects, _states) {
                    objects = _objects;
                    states  = _states;
                    _done();
                });
        });
    });

    it('Test ' + adapterShortNameLog + ' adapter: Check if adapter started', function (done) {
        this.timeout(60000);
        checkConnectionOfAdapter(function (res) {
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
        setTimeout(function () {
            states.getState('ical.0.data.count', function (err, state) {
                expect(err).to.be.not.ok;
                expect(state.val).to.be.equal(3);
                done();
            });
        }, 3000);
    });

    it('Test ' + adapterShortNameLog + ': event Vacation', function (done) {
        this.timeout(5000);
        setTimeout(function () {
            states.getState('ical.0.events.Vacation', function (err, state) {
                expect(err).to.be.not.ok;
                expect(state.val).to.be.false;
                done();
            });
        }, 3000);
    });

    it('Test ' + adapterShortNameLog + ': event MyEvent', function (done) {
        this.timeout(5000);
        setTimeout(function () {
            states.getState('ical.0.events.MyEvent', function (err, state) {
                expect(err).to.be.not.ok;
                expect(state.val).to.be.false;
                done();
            });
        }, 3000);
    });

    it('Test ' + adapterShortNameLog + ': event TestEvent', function (done) {
        this.timeout(5000);
        setTimeout(function () {
            states.getState('ical.0.events.TestEvent', function (err, state) {
                expect(err).to.be.not.ok;
                expect(state.val).to.be.false;
                done();
            });
        }, 3000);
    });

    it('Test ' + adapterShortNameLog + ': event InDayEvent', function (done) {
        this.timeout(5000);
        setTimeout(function () {
            states.getState('ical.0.events.InDayEvent', function (err, state) {
                expect(err).to.be.not.ok;
                expect(state.val).to.be.false;
                done();
            });
        }, 3000);
    });

    it('Test ' + adapterShortNameLog + ': data.table', function (done) {
        this.timeout(2000);
        setTimeout(function () {
            states.getState('ical.0.data.table', function (err, state) {
                expect(err).to.be.not.ok;
                expect(state.val[0].date.indexOf('&#8594; ')).to.be.equal(0);
                expect(state.val[0].date.indexOf('. 02:00')).to.be.equal(13);
                expect(state.val[0].event).to.be.equal('TestEvent');
                expect(state.val[0]._section).to.be.equal('TestEvent');
                expect(state.val[0]._allDay).to.be.false;

                expect(state.val[1].date.indexOf('&#8594; ')).to.be.equal(0);
                expect(state.val[1].date.indexOf('. 00:00')).to.be.equal(13);
                expect(state.val[1].event).to.be.equal('Today Event');
                expect(state.val[1]._section).to.be.equal('Today Event');
                expect(state.val[1]._allDay).to.be.true;

                expect(state.val[2].date.indexOf('&#8594; ')).to.be.equal(0);
                expect(state.val[2].date.indexOf('. 00:00')).to.be.equal(13);
                expect(state.val[2].event).to.be.equal('MyEvent BlaEvent');
                expect(state.val[2]._section).to.be.equal('MyEvent BlaEvent');
                expect(state.val[2]._allDay).to.be.true;

                expect(state.val[3].date.indexOf('. 00:00')).to.be.equal(5);
                expect(state.val[3].event).to.be.equal('MorgenVoll');
                expect(state.val[3]._section).to.be.equal('MorgenVoll');
                expect(state.val[3]._allDay).to.be.true;

                expect(state.val[4].date.indexOf('. 10:00')).to.be.equal(5);
                expect(state.val[4].event).to.be.equal('Reminder');
                expect(state.val[4]._section).to.be.equal('Reminder');
                expect(state.val[4]._allDay).to.be.false;

                expect(state.val[5].date.indexOf('. 18:00-20:00')).to.be.equal(5);
                expect(state.val[5].event).to.be.equal('InDay2');
                expect(state.val[5]._section).to.be.equal('InDay2');
                expect(state.val[5]._allDay).to.be.false;

                expect(state.val[6].date.indexOf('. 19:30-20:30')).to.be.equal(5);
                expect(state.val[6].event).to.be.equal('TestUserEvent1');
                expect(state.val[6]._section).to.be.equal('TestUserEvent1');
                expect(state.val[6]._allDay).to.be.false;

                expect(state.val[7].date.indexOf('. 22:00-02:00+1')).to.be.equal(5);
                expect(state.val[7].event).to.be.equal('OverEvent');
                expect(state.val[7]._section).to.be.equal('OverEvent');
                expect(state.val[7]._allDay).to.be.false;

                done();
            });
        }, 1000);
    });

    after('Test ' + adapterShortNameLog + ' adapter: Stop js-controller', function (done) {
        this.timeout(10000);

        setup.stopController(function (normalTerminated) {
            console.log('Adapter normal terminated: ' + normalTerminated);
            done();
        });
    });
});
