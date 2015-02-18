/**
 *      ioBroker.iCal
 *      Copyright 2015, bluefox <bluefox@gmail.com>
 *
 *      Based on ccu.io vader722 adapter.
 *      https://github.com/hobbyquaker/ccu.io/tree/master/adapter/ical
 *
 */


/* jshint -W097 */// jshint strict:false
/*global require */
/*global RRule */
/*global __dirname */
/*jslint node: true */
"use strict";

var utils  = require(__dirname + '/lib/utils'); // Get common adapter utils
var RRule  = require('rrule').RRule;
var ical   = require('ical');

var adapter = utils.adapter({
    name: 'ical',
    ready: function () {
        main();
    }
});

var normal           = ''; // set when ready
var normal2          = ''; // set when ready
var warn             = '<span style="font-weight: bold; color:red"><span class="icalWarn">';
var warn2            = '</span></span><span style="font-weight: normal; color:red"><span class="icalWarn2">';
var prewarn          = '<span style="font-weight: bold; color:orange"><span class="icalPreWarn">';
var prewarn2         = '</span></span><span style="font-weight: normal; color:orange"><span class="icalPreWarn2">';
        
var datesArray       = [];
var events           = [];
var dictionary       = {
    'today':    {'en': 'Today',    'de': 'Heute',  'ru': 'Сегодня'},
    'tomorrow': {'en': 'Tomorrow', 'de': 'Morgen', 'ru': 'Завтра'}
};

function _(text) {
    if (!text) return '';

    if (dictionary[text]) {
        var newText = dictionary[text][adapter.config.language];
        if (newText) {
            return newText;
        } else if (adapter.config.language != 'en') {
            newText = dictionary[text].en;
            if (newText) {
                return newText;
            }
        }
    } else if (!text.match(/_tooltip$/)) {
        console.log('"' + text + '": {"en": "' + text + '", "de": "' + text + '", "ru": "' + text + '"},');
    }
    return text;
}

adapter.on('stateChange', function (id, state) {
    if (!id || !state || state.ack || !state.val) return;

    if (id == adapter.namespace + '.trigger') {
        var content = state.val.split(' ');
        //One time read all calenders
        switch (content[0]) {
            case 'read':
                if (content[1]) {
                    adapter.log.info('reading iCal from URL: "' + content[1] + '"');
                    readOne(content[1]);
                } else {
                    adapter.log.info('reading one time from all callenders');
                    readAll();
                }
                break;

            case 'check':
                if (content[1]) {
                    adapter.log.info('checking "' + content[1] + '"');
                    checkForEvents(content[1]);
                } else {
                    adapter.log.warn('check all events');
                    for (var i = 0; i < adapter.config.events.length; i++) {
                        checkForEvents(adapter.config.events[i].name);
                    }
                }
                break;

            default:
                adapter.log.warn('Unknown command in trigger: "' + state.val + '"');
        }
    }
});

/* Compare the current date against another date.
 *
 * @param b  {Date} the other date
 * @returns   -1 : if this < b
 *             0 : if this === b
 *             1 : if this > b
 *            NaN : if a or b is an illegal date
 */
Date.prototype.compare = function(b) {
    if (b.constructor !== Date) {
        throw "invalid_date";
    }

    return (isFinite(this.valueOf()) && isFinite(b.valueOf()) ?
        (this > b) - (this < b) : NaN
    );
};

function checkiCal(url, calName, cb) {
    // Call library function
    ical.fromURL(url, {}, function (err, data) {
        if (err) adapter.log.warn("Error Reading from URL: " + err.toString());

        /*if (!data) {
            data = ical.parseFile(__dirname + '/demo.isc');
        }*/
        
        if (data) {
            adapter.log.info("processing URL: " + calName + " " + url);
            var realnow    = new Date();
            var today      = new Date();
            today.setHours(0,0,0,0);
            var endpreview = new Date();
            endpreview.setDate(endpreview.getDate() + parseInt(adapter.config.daysPreview, 10));

            // Now2 1 Sekunde  zurück für Vergleich von ganztägigen Terminen in RRule
            var now2 = new Date();
            // Uhzeit nullen
            now2.setHours(0,0,0,0);
            // Datum 1 Sec zurück wegen Ganztätigen Terminen um 00:00 Uhr
            now2.setSeconds(now2.getSeconds() - 1);

            for (var k in data) {
                var ev = data[k];

                // es interessieren nur Termine mit einer Summary und nur Einträge vom Typ VEVENT
                if ((ev.summary != undefined) && (ev.type == "VEVENT")) {
                    // aha, it is RRULE in the event --> process it
                    if (ev.rrule != undefined) {
                        var options = RRule.parseString(ev.rrule.toString());
                        options.dtstart = ev.start;
                        var rule = new RRule(options);
                        adapter.log.debug("RRule event:" + ev.summary + " " + ev.start.toString() + " " + endpreview.toString() + " now:" + today + " now2:" + now2 +  " " + rule.toText());
                        var dates = rule.between(now2, endpreview);

                        // event innerhalb des Zeitfensters
                        if (dates.length > 0) {
                            for (var i = 0; i < dates.length; i++) {
                                // Datum ersetzen für jeden einzelnen Termin in RRule
                                // TODO: funktioniert nur mit Terminen innerhalb eines Tages, da auch das EndDate ersetzt wird
                                ev.start.setDate(dates[i].getDate());
                                ev.start.setMonth(dates[i].getMonth());
                                ev.start.setFullYear(dates[i].getFullYear());

                                ev.end.setDate(dates[i].getDate());
                                ev.end.setMonth(dates[i].getMonth());
                                ev.end.setFullYear(dates[i].getFullYear());

                                // process event
                                if (ev.exdate) {
                                    // Wenn es exdate
                                    if (ev.exdate != today) {
                                        checkDates(ev, endpreview, today, realnow, " rrule ", calName);
                                    }
                                } else {
                                    checkDates(ev, endpreview, today, realnow, " rrule ", calName);
                                }
                            }
                        } else {
                            adapter.log.debug("no RRule events inside the time interval");
                        }
                    } else {
                        // No RRule event
                        checkDates(ev, endpreview, today, realnow, " ", calName);
                    }
                }
            }
        }
        // Ready with processing
        cb(calName);
    });
}

function checkDates(ev, endpreview, today, realnow, rule, calName) {
    var fullday = false;
    var reason;
    var date;

    // Check ob ganztägig
    // Für Outlook schauen ob ev.summary eventuell Unterparameter enthält
    if (ev.summary.hasOwnProperty('val')) {
        //Ja, also reason auslesen
        reason = ev.summary.val;
    } else {
        //Nein
        reason = ev.summary;
    }

    // If not start point => ignore it
    if (ev.start == undefined) return;

    // If full day
    if (ev.start.getHours()   == "0" &&
        ev.start.getMinutes() == "0" &&
        ev.start.getSeconds() == "0" &&
        ev.end.getHours()     == "0" &&
        ev.end.getMinutes()   == "0" &&
        ev.end.getSeconds()   == "0" ) {
        fullday = true;
    }
    
    // Full day
    if (fullday) {
        //Terminstart >= today  && < previewzeit  oder endzeitpunkt > today && < previewzeit ---> anzeigen
        if ((ev.start < endpreview && ev.start >= today) || (ev.end > today && ev.end <= endpreview)) {
            // check only full day events
            if (checkForEvents(reason, today, ev, true, realnow)) {
                date = formatDate(ev.start, true);

                insertSorted(datesArray, {
                    date:     date.text,
                    event:    reason,
                    _class:  'ical_' + calName + ' ' + date._class,
                    _date:    new Date(ev.start.getTime()),
                    _calName: calName
                });
                adapter.log.debug("Event (full day) added : " + JSON.stringify(rule) + " " + reason + " at " + date.text);
            } else {
                adapter.log.debug("Event (full day) does not displayed, because belongs to hidden user events: " + reason);
            }
        } else {
            // filtered out, because does not belongs to specified time interval
            adapter.log.debug("Event (full day) " + JSON.stringify(rule) + ' ' +  reason + " at " + ev.start.toString() + " filtered out, because does not belongs to specified time interval");
        }
    } else {
        // Event with time
        // Start time >= today && Start time < preview time && End time >= now
        if ((ev.start >= today && ev.start < endpreview && ev.end >= realnow) || (ev.end >= realnow && ev.end <= endpreview) ) {
            // Add to list only if not hidden
            if (checkForEvents(reason, today, ev, false, realnow)) {
                date = formatDate(ev.start, true);

                insertSorted(datesArray, {
                    date:     date.text,
                    event:    reason,
                    _class:   'ical_' + calName + ' ' + date._class,
                    _date:    new Date(ev.start.getTime()),
                    _calName: calName
                });

                adapter.log.debug("Event with time added: " + JSON.stringify(rule) + " " + reason + " at " + date.text);
            } else {
                adapter.log.debug("Event does not displayed, because belongs to hidden user events: " + reason);
            }
        } else {
            // filtered out, because does not belongs to specified time interval
            adapter.log.debug("Event " + JSON.stringify(rule) + ' ' + reason + " at " + ev.start.toString() + " filtered out, because does not belongs to specified time interval");
        }
    }
}

function colorizeDates(date, today, tomorrow, col) {
    var result = {
        prefix: normal,
        suffix: normal2
    };
    date.setHours(0,0,0,0);

    // Colorieren wenn gewünscht
    if (adapter.config.colorize) {
        // today
        if (date.compare(today) == 0) {
            result.prefix = warn;
            result.suffix = warn2;
        } else
        // tomorrow
        if (date.compare(tomorrow) == 0) {
            result.prefix = prewarn;
            result.suffix = prewarn2;
        } else
        // start time is in the past
        if (date.compare(today) == -1) {
            result.prefix = normal;
            result.suffix = normal2;
        }
    } else {
        // If configured every calendar has own color
        if (adapter.config.everyCalOneColor) {
            result.prefix = '<span style=\"font-weight:bold;color:' + col + '\">' + "<span class='icalNormal'>";
            result.suffix = "</span></span>" + '<span style=\"font-weight:normal;color:' + col + '\">' + "<span class='icalNormal2'>";
        }
    }
    return result;
}

function checkForEvents(reason, today, event, fullday, realnow) {
    // show unknown events
    var result = true;

    // Schauen ob es ein Event in der Tabelle gibt
    for (var i = 0; i < events.length; i++) {
        if (reason.indexOf(events[i].name) != -1) {
            // auslesen ob das Event angezeigt werden soll
            result = events[i].display;
            adapter.log.debug('found event in table: ' + events[i].name);

            // If full day event
            // Follow processing only if event is today
            if ((fullday  && (event.start <= today)   && (today   <= event.end)) || // full day
                (!fullday && (event.start <= realnow) && (realnow <= event.end))) { // with time
                if (fullday) {
                    adapter.log.debug('Event (full day): ' + event.start + " " + today   + " " + event.end);
                } else {
                    adapter.log.debug('Event with time: '  + event.start + " " + realnow + " " + event.end);
                }

                // If yet processed
                if (events[i].processed) {
                    // nothing to do
                    adapter.log.debug('Event ' + events[i].name + ' yet processed');
                } else {
                    // Process event
                    events[i].processed = true;
                    if (!events[i].state) {
                        events[i].state = true;
                        adapter.log.info('Set events.' + events[i].name + ' to true');
                        adapter.setState('events.' + events[i].name, {val: events[i].state, ack: true});
                    }
                }
            }
            break;
        }
    }
    return result;
}

function initEvent(name, display, callback) {
    var obj = {
        name:      name,
        processed: false,
        state:     null,
        display:   display
    };

    events.push(obj);

    adapter.getState('events.' + name, function (err, state) {
        if (err || !state) {
            obj.state = false;
            adapter.setState('events.' + name, {val: obj.state, ack: true});
        } else {
            obj.state = state.val;
        }
        if (callback) callback(name);
    });
}

// Create new user events and remove existing, but deleted in config
function syncUserEvents(callback) {
    var count = 0;

    // Read all actual events
    adapter.getStatesOf('', 'events', function (err, states) {
        var toAdd = [];
        var toDel = [];

        if (states) {
            // Add "to delete" all existing events
            for (var j = 0; j < states.length; j++) {
                toDel.push(states[j].common.name);
            }
        }

        // Add "to add" all configured events
        for (var i = 0; i < adapter.config.events.length; i++) {
            toAdd.push(adapter.config.events[i].name);
        }

        if (states) {
            for (j = 0; j < states.length; j++) {
                for (i = 0; i < adapter.config.events.length; i++) {
                    if (states[j].common.name == adapter.config.events[i].name) {
                        // remove it from "toDel"
                        var pos = toDel.indexOf(adapter.config.events[i].name);
                        if (pos != -1) toDel.splice(pos, 1);
                        break;
                    }
                }
            }

            for (i = 0; i < adapter.config.events.length; i++) {
                for (j = 0; j < states.length; j++) {
                    if (states[j].common.name == adapter.config.events[i].name) {
                        if (adapter.config.events[i].enabled === 'true')  adapter.config.events[i].enabled = true;
                        if (adapter.config.events[i].enabled === 'false') adapter.config.events[i].enabled = false;
                        if (adapter.config.events[i].display === 'true')  adapter.config.events[i].display = true;
                        if (adapter.config.events[i].display === 'false') adapter.config.events[i].display = false;

                        // if settings does not changed
                        if (states[j].native.enabled == adapter.config.events[i].enabled &&
                            states[j].native.display == adapter.config.events[i].display) {
                            // remove it from "toAdd"
                            var pos_ = toAdd.indexOf(adapter.config.events[i].name);
                            if (pos_ != -1) toAdd.splice(pos_, 1);
                        }
                    }
                }
            }
        }

        // Add states
        for (i = 0; i < toAdd.length; i++) {
            for (j = 0; j < adapter.config.events.length; j++) {
                if (adapter.config.events[j].name == toAdd[i]) {
                    if (adapter.config.events[j].enabled === 'true')  adapter.config.events[j].enabled = true;
                    if (adapter.config.events[j].enabled === 'false') adapter.config.events[j].enabled = false;
                    if (adapter.config.events[j].display === 'true')  adapter.config.events[j].display = true;
                    if (adapter.config.events[j].display === 'false') adapter.config.events[j].display = false;

                    // Add or update state
                    adapter.setObject('events.' + toAdd[i], {
                        type: 'state',
                        common: {
                            name: toAdd[i],
                            type: 'boolean',
                            role: 'indicator'
                        },
                        native: {
                            "enabled": adapter.config.events[j].enabled,
                            "display": adapter.config.events[j].display
                        }
                    }, function (id) {
                        adapter.log.info(id.id + ' created');
                    });
                    break;
                }
            }
        }
        
        // Remove states
        for (i = 0; i < toDel.length; i++) {
            adapter.delObject('events.' + toDel[i]);
            adapter.delState('events.' + toDel[i]);
        }

        for (i = 0; i < adapter.config.events.length; i++) {
            // If event enabled add it to list
            if (adapter.config.events[i].enabled) {
                count++;
                initEvent(adapter.config.events[i].name, adapter.config.events[i].display, function () {
                    count--;
                    if (!count) callback();
                });
            }
        }

        if (!count) callback();
    });
}

// Read all calendar
function readAll() {
    datesArray = [];
    var count = 0;

    // Set all events as not processed
    for (var j = 0; j < events.length; j++) {
        events[j].processed = false;
    }

    if (adapter.config.calendars) {
        // eigene Instanz hinzufügen, falls die Kalender schnell abgearbeitet werden
        for (var i = 0; i < adapter.config.calendars.length; i++) {
            if (adapter.config.calendars[i].url) {
                count++;
                adapter.log.debug("reading calendar from URL: " + adapter.config.calendars[i].url + ", color: " + adapter.config.calendars[i].url.color);
                checkiCal(adapter.config.calendars[i].url, adapter.config.calendars[i].name, function () {
                    count--;
                    // If all calendars are processed
                    if (!count) {
                        adapter.log.debug("displaying dates because of callback");
                        displayDates();
                    }
                });
            }
        }
    }

    // If nothing to process => show it
    if (!count) {
        adapter.log.debug("displaying dates");
        displayDates();
    }

}

// Read one calendar
function readOne(url) {
    datesArray = [];
    checkiCal(url, '', function () {
        displayDates();
    });
}

function formatDate(_date, withTime) {
    var day   = _date.getDate();
    var month = _date.getMonth() + 1;
    var year  = _date.getFullYear();
    var _time = '';

    if (withTime) {
        var hours   = _date.getHours();
        var minutes = _date.getMinutes();

        if (adapter.config.fulltime && !hours && !minutes) {
            _time = ' ' + adapter.config.fulltime;
        } else {
            if (hours < 10)   hours   = '0' + hours.toString();
            if (minutes < 10) minutes = '0' + minutes.toString();
            _time = ' ' + hours + ':' + minutes;
        }
    }
    var _class = '';
    var d = new Date();
    if (day   == d.getDate() &&
        month == (d.getMonth() + 1) &&
        year  == d.getFullYear()) {
        _class = 'ical_today';
    }

    d.setDate(d.getDate() + 1);

    if (day   == d.getDate() &&
        month == (d.getMonth() + 1) &&
        year  == d.getFullYear()) {
        _class = 'ical_tomorrow';
    }

    if (adapter.config.replaceDates) {
        if (_class == 'ical_today')    return {text: _('today')    + _time, _class: _class};
        if (_class == 'ical_tomorrow') return {text: _('tomorrow') + _time, _class: _class};
    }

    if (adapter.config.dataPaddingWithZeros) {
        if (day < 10)   day   = '0' + day.toString();
        if (month < 10) month = '0' + month.toString();
    }

    return {
        text:   day + '.' + month + '.' + year + _time,
        _class: _class
    };
}

// Show event as text
function displayDates() {
    var count = 0;
    if (datesArray.length) {
        var todayEventcounter = 0;
        for (var t = 0; t < datesArray.length; t++) {
            if (datesArray[t]._class.indexOf('ical_today') != -1) todayEventcounter++;
        }

        count += 3;
        adapter.setState('data.count', {val: todayEventcounter,           ack: true}, function () {
            if (!--count) {
                setTimeout(function() {
                    adapter.stop();
                }, 5000);
            }
        });
        adapter.setState('data.table', {val: datesArray,                  ack: true}, function () {
            if (!--count) {
                setTimeout(function() {
                    adapter.stop();
                }, 5000);
            }
        });
        adapter.setState('data.html',  {val: brSeparatedList(datesArray), ack: true}, function () {
            if (!--count) {
                setTimeout(function() {
                    adapter.stop();
                }, 5000);
            }
        });
    } else {
        count += 3;
        adapter.setState('data.count', {val: 0,  ack: true}, function () {
            if (!--count) {
                setTimeout(function() {
                    adapter.stop();
                }, 5000);
            }
        });
        adapter.setState('data.table', {val: [], ack: true}, function () {
            if (!--count) {
                setTimeout(function() {
                    adapter.stop();
                }, 5000);
            }
        });
        adapter.setState('data.html',  {val: '', ack: true}, function () {
            if (!--count) {
                setTimeout(function() {
                    adapter.stop();
                }, 5000);
            }
        });
    }

    // set not processed events to false
    for (var j = 0; j < events.length; j++) {
        if (!events[j].processed && events[j].state) {
            count++;
            events[j].state = false;
            // Set to false
            adapter.setState('events.' + events[j].name, {val: events[j].event, ack: true}, function () {
                if (!--count) {
                    setTimeout(function() {
                        adapter.stop();
                    }, 5000);
                }
            });
        }
    }
}

function insertSorted(arr, element) {
    if (!arr.length) {
        arr.push(element);
    } else {
        if (arr[0]._date > element._date) {
            arr.unshift(element);
        } else if (arr[arr.length - 1]._date < element._date) {
            arr.push(element);
        } else {
            if (arr.length == 1) {
                arr.push(element);
            } else {
                for (var i = 0; i < arr.length - 1; i++){
                    if (arr[i]._date <= element._date && element._date < arr[i + 1]._date) {
                        arr.splice(i + 1, 0, element);
                        element = null;
                        break;
                    }
                }
                if (element)
                    arr.push(element);
            }
        }
    }
}

function brSeparatedList(arr) {
    var text     = '';
    var today    = new Date();
    var tomorrow = new Date();
    today.setHours(0,0,0,0);
    tomorrow.setDate(today.getDate() + 1);
    tomorrow.setHours(0,0,0,0);

    for (var i = 0; i < datesArray.length; i++) {
        var date = formatDate(datesArray[i]._date, true);
        var color = adapter.config.defColor;
        for (var j = 0; j < adapter.config.calendars.length; j++) {
            if (adapter.config.calendars[j].name == datesArray[i]._calName) {
                color = adapter.config.calendars[j].color;
                break;
            }
        }

        var xfix = colorizeDates(datesArray[i]._date, today, tomorrow, color);

        if (text) text += '<br/>\n';
        text += xfix.prefix + date.text + xfix.suffix + ' ' + datesArray[i].event + '</span></span>';
    }

    return text;
}

function main() {
    normal  = '<span style="font-weight: bold; color:' + adapter.config.defColor + '"><span class="icalNormal">';
    normal2 = '</span></span><span style="font-weight: normal; color:' + adapter.config.defColor + '"><span class="icalNormal2">';
    
    adapter.config.language = adapter.config.language || 'en';

    syncUserEvents(readAll);

    setTimeout(function () {
        adapter.log.info('force terminating after 4 minutes');
        adapter.stop();
    }, 240000);
}