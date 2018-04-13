/**
 *      ioBroker.iCal
 *      Copyright 2015-2018, bluefox <dogafox@gmail.com>
 *
 *      Based on ccu.io vader722 adapter.
 *      https://github.com/hobbyquaker/ccu.io/tree/master/adapter/ical
 *
 */

/* jshint -W097 */
/* jshint strict:false */
/* global require */
/* global RRule */
/* global __dirname */
/* jslint node: true */
'use strict';

var utils   = require(__dirname + '/lib/utils'); // Get common adapter utils
var RRule   = require('rrule').RRule;
var ical    = require('node-ical');
var ce      = require('cloneextend');
var request;
var fs;

var adapter = new utils.Adapter({
    name: 'ical',
    ready: function () {
        main();
    }
});

var normal           = ''; // set when ready
var warn             = '<span style="font-weight: bold; color: red"><span class="icalWarn">';
var prewarn          = '<span style="font-weight: bold; color: orange"><span class="icalPreWarn">';
var preprewarn       = '<span style="font-weight: bold; color: yellow"><span class="icalPrePreWarn">';

var datesArray       = [];
var events           = [];
var dictionary       = {
    'today':     {'en': 'Today',             'it': 'Oggi',                      'es': 'Hoy',                   'pl': 'Dzisiaj',                   'fr': 'Aujourd\'hui',              'de': 'Heute',            'ru': 'Сегодня',				'nl': 'Vandaag'},
    'tomorrow':  {'en': 'Tomorrow',          'it': 'Domani',                    'es': 'Mañana',                'pl': 'Jutro',                     'fr': 'Demain',                    'de': 'Morgen',           'ru': 'Завтра',				'nl': 'Morgen'},
    'dayafter':  {'en': 'Day After Tomorrow','it': 'Dopodomani',                'es': 'Pasado mañana',         'pl': 'Pojutrze',                  'fr': 'Après demain',              'de': 'Übermorgen',       'ru': 'Послезавтра',			'nl': 'Overmorgen'},
    '3days':     {'en': 'In 3 days',         'it': 'In 3 giorni',               'es': 'En 3 días',             'pl': 'W 3 dni',                   'fr': 'Dans 3 jours',              'de': 'In 3 Tagen',       'ru': 'Через 2 дня',			'nl': 'Over 3 dagen'},
    '4days':     {'en': 'In 4 days',         'it': 'In 4 giorni',               'es': 'En 4 días',             'pl': 'W 4 dni',                   'fr': 'Dans 4 jours',              'de': 'In 4 Tagen',       'ru': 'Через 3 дня',			'nl': 'Over 4 dagen'},
    '5days':     {'en': 'In 5 days',         'it': 'In 5 giorni',               'es': 'En 5 días',             'pl': 'W ciągu 5 dni',             'fr': 'Dans 5 jours',              'de': 'In 5 Tagen',       'ru': 'Через 4 дня',			'nl': 'Over 5 dagen'},
    '6days':     {'en': 'In 6 days',         'it': 'In 6 giorni',               'es': 'En 6 días',             'pl': "W ciągu 6 dni",             'fr': "Dans 6 jours",              'de': 'In 6 Tagen',       'ru': 'Через 5 дней',		'nl': 'Over 6 dagen'},
    'oneweek':   {'en': 'In one week',       'it': 'In una settimana',          'es': 'En una semana',         'pl': 'W jeden tydzień',           'fr': 'Dans une semaine',          'de': 'In einer Woche',   'ru': 'Через неделю',		'nl': 'Binnen een week'},
    '1week_left':{'en': 'One week left',     'it': 'Manca una settimana',       'es': 'Queda una semana',      'pl': 'Został jeden tydzień',      'fr': 'Reste une semaine',         'de': 'Noch eine Woche',  'ru': 'Ещё неделя',		    'nl': 'Over een week'},
    '2week_left':{'en': 'Two weeks left',    'it': 'Due settimane rimaste',     'es': 'Dos semanas restantes', 'pl': 'Zostały dwa tygodnie',      'fr': 'Il reste deux semaines',    'de': 'Noch zwei Wochen', 'ru': 'Ещё две недели',		'nl': 'Over twee weken'},
    '3week_left':{'en': 'Three weeks left',  'it': 'Tre settimane rimanenti',   'es': 'Tres semanas quedan',   'pl': "Pozostały trzy tygodnie",   'fr': 'Trois semaines restantes',  'de': 'Noch drei Wochen', 'ru': 'Ещё три недели',	    'nl': 'Over drie weken'},
    '4week_left':{'en': 'Four weeks left',   'it': 'Quattro settimane rimaste', 'es': 'Cuatro semanas quedan', 'pl': 'Pozostały cztery tygodnie', 'fr': 'Quatre semaines à gauche',  'de': 'Noch vier Wochen', 'ru': 'Ещё три недели',		'nl': 'Over vier weken'},
    '5week_left':{'en': 'Five weeks left',   'it': 'Cinque settimane rimaste',  'es': 'Quedan cinco semanas',  'pl': 'Pozostało pięć tygodni',    'fr': 'Cinq semaines à gauche',    'de': 'Noch fünf Wochen', 'ru': 'Ещё пять недель',		'nl': 'Over vijf weken'},
    '6week_left':{'en': 'Six weeks left',    'it': 'Sei settimane a sinistra',  'es': 'Seis semanas restantes','pl': 'Pozostało sześć tygodni',   'fr': 'Six semaines à gauche',     'de': 'Noch sechs Wochen','ru': 'Ещё шесть недель',	'nl': 'Over zes weken'},
    'left':      {'en': 'left',              'it': 'sinistra',                  'es': 'izquierda',             'pl': 'lewo',                      'fr': 'la gauche',                 'de': ' ',                'ru': 'осталось',			'nl': 'over'},
    'still':     {'en': ' ',                 'it': '',                          'es': '',                      'pl': '',                          'fr': '',                          'de': 'Noch',             'ru': ' ',					'nl': 'nog'},
    'days':      {'en': 'days',              'it': 'Giorni',                    'es': 'dias',                  'pl': 'dni',                       'fr': 'journées',                  'de': 'Tage',             'ru': 'дней',			'nl': 'dagen'},
    'day':       {'en': 'day',               'it': 'giorno',                    'es': 'día',                   'pl': 'dzień',                     'fr': 'journée',                   'de': 'Tag',              'ru': 'день',				'nl': 'dag'},
    'hours':     {'en': 'hours',             'it': 'ore',                       'es': 'horas',                 'pl': 'godziny',                   'fr': 'heures',                    'de': 'Stunden',          'ru': 'часов',			'nl': 'uren'},
    'hour':      {'en': 'hour',              'it': 'ora',                       'es': 'hora',                  'pl': 'godzina',                   'fr': 'heure',                     'de': 'Stunde',           'ru': 'час',		            'nl': 'uur'}
};

function _(text) {
    if (!text) return '';

    if (dictionary[text]) {
        var newText = dictionary[text][adapter.config.language];
        if (newText) {
            return newText;
        } else if (adapter.config.language !== 'en') {
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

    if (id === adapter.namespace + '.trigger') {
        var content = state.val.split(' ');
        //One time read all calendars
        switch (content[0]) {
            case 'read':
                if (content[1]) {
                    adapter.log.info('reading iCal from URL: "' + content[1] + '"');
                    readOne(content[1]);
                } else {
                    adapter.log.info('reading one time from all calendars');
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
        throw 'invalid_date';
    }

    return (isFinite(this.valueOf()) && isFinite(b.valueOf()) ?
        (this > b) - (this < b) : NaN
    );
};

function getiCal(urlOrFile, user, pass, sslignore, calName, cb) {
    // Is it file or URL
    if (!urlOrFile.match(/^https?:\/\//)) {
        fs = fs || require('fs');
        if (!fs.existsSync(urlOrFile)) {
            cb && cb('File does not exist: "' + urlOrFile + '"');
        } else {
            try {
                var data = fs.readFileSync(urlOrFile);
                cb && cb(null, data.toString());
            } catch (e) {
                cb && cb('Cannot read file "' + urlOrFile + '": ' + e);
            }
        }

    } else {
        request = request || require('request');
        // Find out whether SSL certificate errors shall be ignored
        var options = {
            uri: urlOrFile
        };

        if (sslignore === 'ignore' || sslignore === 'true' || sslignore === true) {
            options.rejectUnauthorized = false;
        }

        if (user) {
            options.auth = {
                user: user,
                pass: pass,
                sendImmediately: true
            };
        }

        // Call library function with the "auth object" and credentials provided
        request(options, function (err, r, _data) {
            if (err || !_data) {
                adapter.log.warn('Error reading from URL "' + urlOrFile + '": ' + ((err && err.code === 'ENOTFOUND') ? 'address not found!' : err));
                cb && cb(err || 'Cannot read URL: "' + urlOrFile + '"');
            } else {
                cb && cb(null, _data);
            }
        });
    }
}

function checkiCal(urlOrFile, user, pass, sslignore, calName, cb) {
    if (typeof user === 'function') {
        cb = user;
        user = undefined;
    }
    getiCal(urlOrFile, user, pass, sslignore, calName, function (err, _data) {
        if (err || !_data) {
            adapter.log.warn('Error reading "' + urlOrFile + '": ' + err);
            cb(calName);
            return;
        }

        adapter.log.debug('File read successfully ' + urlOrFile);

        // Remove from file empty lines
        var lines = _data.split(/[\n\r]/g);
        for (var t = lines.length - 1; t >= 0; t--) {
            if (!lines[t]) lines.splice(t, 1);
        }

        var data;
        try {
            data = ical.parseICS(lines.join('\r\n'), function(err, data) {
                if (data) {
                    adapter.log.info('processing URL: ' + calName + ' ' + urlOrFile);
                    adapter.log.debug(JSON.stringify(data));
                    var realnow    = new Date();
                    var today      = new Date();
                    today.setHours(0, 0, 0, 0);
                    var endpreview = new Date();
                    endpreview.setDate(endpreview.getDate() + parseInt(adapter.config.daysPreview, 10));

                    // Now2 1 Sekunde  zurück für Vergleich von ganztägigen Terminen in RRule
                    var now2 = new Date();

                    // Uhzeit nullen
                    now2.setHours(0, 0, 0, 0);

                    // Datum 1 Sec zurück wegen Ganztätigen Terminen um 00:00 Uhr
                    //now2.setSeconds(now2.getSeconds() - 1);
                    setImmediate(function() {
                        processData(data, realnow, today, endpreview, now2, calName, cb);
                    });
                }
                else {
                    // Ready with processing
                    cb(calName);
                }
            });
        } catch (e) {
            adapter.log.error('Cannot parse ics file: ' + e);
        }
    });
}

function processData(data, realnow, today, endpreview, now2, calName, cb) {
    var processedEntries = 0;
    for (var k in data) {
        var ev = data[k];
        delete data[k];

        // es interessieren nur Termine mit einer Summary und nur Einträge vom Typ VEVENT
        if ((ev.summary !== undefined) && (ev.type === 'VEVENT')) {

            if (!ev.end) {
                ev.end = ev.start;
                if (!ev.start.getHours() && !ev.start.getMinutes() && !ev.start.getSeconds()) {
                    ev.end.setDate(ev.end.getDate() + 1);
                }
            }
            // aha, it is RRULE in the event --> process it
            if (ev.rrule !== undefined) {
                var options = RRule.parseString(ev.rrule.toString());
                options.dtstart = ev.start;
                var rule = new RRule(options);

                var eventLength = ev.end.getTime() - ev.start.getTime();
                var now3 = new Date(now2.getTime() - eventLength);
                if (now2 < now3) now3 = now2;
                adapter.log.debug('RRule event:' + ev.summary + ' ' + ev.start.toString() + ' ' + endpreview.toString() + ' now:' + today + ' now2:' + now2 + ' now3:' + now3 + ' ' + rule.toText());
                var dates = rule.between(now3, endpreview, true);
                adapter.log.debug(JSON.stringify(options));
                adapter.log.debug(JSON.stringify(ev));
                adapter.log.debug(JSON.stringify(dates));
                // event innerhalb des Zeitfensters
                if (dates.length > 0) {
                    for (var i = 0; i < dates.length; i++) {
                        // ein deep-copy clone anlegen da ansonsten das setDate&co
                        // die daten eines anderes Eintrages überschreiben
                        var ev2 = ce.clone(ev);

                        // Datum ersetzen für jeden einzelnen Termin in RRule
                        ev2.start.setDate(dates[i].getDate());
                        ev2.start.setMonth(dates[i].getMonth());
                        ev2.start.setFullYear(dates[i].getFullYear());

                        ev2.end = new Date(ev2.start.getTime() + eventLength); // Set end date based on length in ms

                        adapter.log.debug('   ' + i + ': Event (' + JSON.stringify(ev2.exdate) + '):' + ev2.start.toString() + ' ' + ev2.end.toString());

                        // we have to check if there is an exdate array
                        // which defines dates that - if matched - should
                        // be excluded.
                        var checkDate = true;
                        if(ev2.exdate) {
                            for(var d in ev2.exdate) {
                                d = new Date(d);
                                if(d.getTime() === ev2.start.getTime())
                                {
                                    checkDate = false;
                                    adapter.log.debug('   ' + i + ': sort out');
                                    break;
                                }
                            }
                        }
                        if (checkDate && ev.recurrences) {
                            for(var dOri in ev.recurrences) {
                                var d = new Date(dOri);
                                if(d.getTime() === ev2.start.getTime()) {
                                    adapter.log.debug(' FOUND DIFFERENT RECURRING!! ' + JSON.stringify(ev.recurrences[dOri]));
                                }
                            }
                        }

                        if (checkDate) {
                            checkDates(ev2, endpreview, today, realnow, ' rrule ', calName);
                        }
                    }
                } else {
                    adapter.log.debug('no RRule events inside the time interval');
                }
            } else {
                // No RRule event
                checkDates(ev, endpreview, today, realnow, ' ', calName);
            }
        }

        if (++processedEntries > 100) {
            break;
        }
    }
    if (!Object.keys(data).length) {
        cb(calName);
        return;
    }
    else {
        setImmediate(function() {
            processData(data, realnow, today, endpreview, now2, calName, cb);
        });
    }
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
    if (!ev.start) return;

    // If not end point => assume 0:0:0 event and set to same as start
    if (!ev.end) ev.end = ev.start;

    // If full day
    if (!ev.start.getHours()   &&
        !ev.start.getMinutes() &&
        !ev.start.getSeconds() &&
        !ev.end.getHours()     &&
        !ev.end.getMinutes()   &&
        !ev.end.getSeconds()   &&
        ev.end.getTime() !== ev.start.getTime()
    ) {
        fullday = true;
    }

    // If force Fullday is set
    if (adapter.config.forceFullday && !fullday) {
        fullday = true;
        ev.start.setMinutes(0);
        ev.start.setSeconds(0);
        ev.start.setHours(0);
        ev.end.setDate(ev.end.getDate() + 1);
        ev.end.setHours(0);
        ev.end.setMinutes(0);
        ev.end.setSeconds(0);
    }

    // Full day
    if (fullday) {
        //Terminstart >= today  && < previewzeit  oder endzeitpunkt > today && < previewzeit ---> anzeigen
        if ((ev.start < endpreview && ev.start >= today) || (ev.end > today && ev.end <= endpreview) || (ev.start < today && ev.end > today)) {
            // check only full day events
            if (checkForEvents(reason, today, ev, true, realnow)) {
                date = formatDate(ev.start, ev.end, true, true);

                insertSorted(datesArray, {
                    date:     date.text,
                    event:    reason,
                    _class:   'ical_' + calName + ' ' + date._class,
                    _date:    new Date(ev.start.getTime()),
                    // add additional Objects, so iobroker.occ can use it
                    _end:     new Date(ev.end.getTime()),
                    _section: ev.description,
                    _IDID:    ev.uid,
                    _allDay:  true,
                    _rule:    rule,
                    location: ev.location ? ev.location : '',
                    // add additional Objects, so iobroker.occ can use it
                    _calName: calName
                });

                adapter.log.debug('Event (full day) added : ' + JSON.stringify(rule) + ' ' + reason + ' at ' + date.text);
            } else {
                adapter.log.debug('Event (full day) does not displayed, because belongs to hidden user events: ' + reason);
            }
        } else {
            // filtered out, because does not belongs to specified time interval
            adapter.log.debug('Event (full day) ' + JSON.stringify(rule) + ' ' +  reason + ' at ' + ev.start.toString() + ' filtered out, because does not belongs to specified time interval');
        }
    } else {
        // Event with time
        // Start time >= today && Start time < preview time && End time >= now
        if ((ev.start >= today && ev.start < endpreview && ev.end >= realnow) || (ev.end >= realnow && ev.end <= endpreview) || (ev.start < realnow && ev.end > realnow)) {
            // Add to list only if not hidden
            if (checkForEvents(reason, today, ev, false, realnow)) {
                date = formatDate(ev.start, ev.end, true, false);

                insertSorted(datesArray, {
                    date:     date.text,
                    event:    reason,
                    _class:   'ical_' + calName + ' ' + date._class,
                    _date:    new Date(ev.start.getTime()),
                    // add additional Objects, so iobroker.occ can use it
                    _end:     new Date(ev.end.getTime()),
                    _section: ev.description,
                    _IDID:    ev.uid,
                    _allDay:  false,
                    _rule:    rule,
                    location: ev.location ? ev.location : '',
                    // add additional Objects, so iobroker.occ can use it
                    _calName: calName
                });
                adapter.log.debug('Event with time added: ' + JSON.stringify(rule) + ' ' + reason + ' at ' + date.text);
            } else {
                adapter.log.debug('Event does not displayed, because belongs to hidden user events: ' + reason);
            }
        } else {
            // filtered out, because does not belongs to specified time interval
            adapter.log.debug('Event ' + JSON.stringify(rule) + ' ' + reason + ' at ' + ev.start.toString() + ' filtered out, because does not belongs to specified time interval');
        }
    }
}

function colorizeDates(date, today, tomorrow, dayafter, col, calName) {
    var result = {
        prefix: normal,
        suffix: "</span></span>"
    };
    var cmpDate = new Date(date.getTime());
    cmpDate.setHours(0,0,0,0);

    calName = calName.replace(' ', '_');

    // Colorieren wenn gewünscht
    if (adapter.config.colorize) {
        // today
        if (cmpDate.compare(today) === 0) {
            result.prefix = warn;
            // If configured every calendar has own color
            if (adapter.config.everyCalOneColor) {
                result.suffix += '<span style=\"font-weight:normal;color:' + col + '\">';
            } else {
                result.suffix += '<span style=\"font-weight:normal;color:red\">';
            }
            result.suffix += "<span class='icalWarn2 iCal-" + calName + "2'>";
        } else
        // tomorrow
        if (cmpDate.compare(tomorrow) === 0) {
            result.prefix = prewarn;
            // If configured every calendar has own color
            if (adapter.config.everyCalOneColor) {
                result.suffix += '<span style=\"font-weight: normal; color:' + col + '\">';
            } else {
                result.suffix += '<span style=\"font-weight: normal; color: orange\">';
            }
            result.suffix += "<span class='icalPreWarn2 iCal-" + calName + "2'>";
        } else
        // day after tomorrow
        if (cmpDate.compare(dayafter) === 0) {
            result.prefix = preprewarn;
            // If configured every calendar has own color
            if (adapter.config.everyCalOneColor) {
                result.suffix += '<span style=\"font-weight: normal; color: ' + col + '\">';
            } else {
                result.suffix += '<span style=\"font-weight: normal; color: yellow\">';
            }
            result.suffix += "<span class='icalPrePreWarn2 iCal-" + calName + "2'>";
        } else
        // start time is in the past
        if (cmpDate.compare(today) === -1) {
            result.prefix = normal;
            // If configured every calendar has own color
            if (adapter.config.everyCalOneColor) {
                result.suffix += '<span style=\"font-weight: normal; color: ' + col + '\">';
            } else {
                result.suffix += '<span style=\"font-weight: normal; color: ' + adapter.config.defColor + '\">';
            }
            result.suffix += "<span class='icalNormal2 iCal-" + calName + "2'>";
        } else {
            // If configured every calendar has own color
            if (adapter.config.everyCalOneColor) {
                result.suffix += '<span style=\"font-weight: normal; color: ' + col + '\">';
            } else {
                result.suffix += '<span style=\"font-weight: normal; color: ' + adapter.config.defColor + '\">';
            }
            result.suffix += "<span class='icalNormal2 iCal-" + calName + "2'>";
        }
    }
    result.prefix = result.prefix.substring(0, result.prefix.length - 2);
    result.prefix += " iCal-" + calName + '">';
    return result;
}

function checkForEvents(reason, today, event, fullday, realnow) {
    // show unknown events
    var result = true;

    // Schauen ob es ein Event in der Tabelle gibt
    for (var i = 0; i < events.length; i++) {
        if (reason.indexOf(events[i].name) !== -1) {
            // auslesen ob das Event angezeigt werden soll
            result = events[i].display;
            adapter.log.debug('found event in table: ' + events[i].name);

            // If full day event
            // Follow processing only if event is today
            if ((fullday  && (event.start <= today)   && (today   <= event.end)) || // full day
                (!fullday && (event.start <= realnow) && (realnow <= event.end))) { // with time
                if (fullday) {
                    adapter.log.debug('Event (full day): ' + event.start + ' ' + today   + ' ' + event.end);
                } else {
                    adapter.log.debug('Event with time: '  + event.start + ' ' + realnow + ' ' + event.end);
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
            //break;
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
                    if (states[j].common.name === adapter.config.events[i].name) {
                        // remove it from "toDel"
                        var pos = toDel.indexOf(adapter.config.events[i].name);
                        if (pos !== -1) toDel.splice(pos, 1);
                        break;
                    }
                }
            }

            for (i = 0; i < adapter.config.events.length; i++) {
                for (j = 0; j < states.length; j++) {
                    if (states[j].common.name === adapter.config.events[i].name) {
                        if (adapter.config.events[i].enabled === 'true')  adapter.config.events[i].enabled = true;
                        if (adapter.config.events[i].enabled === 'false') adapter.config.events[i].enabled = false;
                        if (adapter.config.events[i].display === 'true')  adapter.config.events[i].display = true;
                        if (adapter.config.events[i].display === 'false') adapter.config.events[i].display = false;

                        // if settings does not changed
                        if (states[j].native.enabled == adapter.config.events[i].enabled &&
                            states[j].native.display == adapter.config.events[i].display) {
                            // remove it from "toAdd"
                            var pos_ = toAdd.indexOf(adapter.config.events[i].name);
                            if (pos_ !== -1) toAdd.splice(pos_, 1);
                        }
                    }
                }
            }
        }

        // Add states
        for (i = 0; i < toAdd.length; i++) {
            for (j = 0; j < adapter.config.events.length; j++) {
                if (adapter.config.events[j].name === toAdd[i]) {
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
                            enabled: adapter.config.events[j].enabled,
                            display: adapter.config.events[j].display
                        }
                    }, function (err, id) {
                        adapter.log.info('Event "' + id.id + '" created');
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
                adapter.log.debug('reading calendar from URL: ' + adapter.config.calendars[i].url + ', color: ' + adapter.config.calendars[i].url.color);
                checkiCal(
                    adapter.config.calendars[i].url,
                    adapter.config.calendars[i].user,
                    adapter.config.calendars[i].pass,
                    adapter.config.calendars[i].sslignore,
                    adapter.config.calendars[i].name,
                    function () {
                        // If all calendars are processed
                        if (!--count) {
                            adapter.log.debug('displaying dates because of callback');
                            displayDates();
                        }
                    });
            }
        }
    }

    // If nothing to process => show it
    if (!count) {
        adapter.log.debug('displaying dates');
        displayDates();
    }
}

// Read one calendar
function readOne(url) {
    datesArray = [];
    checkiCal(url, function () {
        displayDates();
    });
}

function formatDate(_date, _end, withTime, fullday) {
    var day   = _date.getDate();
    var month = _date.getMonth() + 1;
    var year  = _date.getFullYear();
    var endday   = _end.getDate();
    var endmonth = _end.getMonth() + 1;
    var endyear  = _end.getFullYear();
    var _time = '';
    var alreadyStarted = (_date < new Date());

    if (withTime) {
        var hours   = _date.getHours();
        var minutes = _date.getMinutes();

        if (adapter.config.fulltime && fullday) {
            _time = ' ' + adapter.config.fulltime;
        } else {
            if (!alreadyStarted) {
                if (adapter.config.dataPaddingWithZeros) {
                    if (hours < 10) hours   = '0' + hours.toString();
                }
                if (minutes < 10) minutes = '0' + minutes.toString();
                _time = ' ' + hours + ':' + minutes;
            }
            var timeDiff = _end.getTime() - _date.getTime();
            if (timeDiff === 0 && hours === 0 && minutes === 0) {
                _time = ' ';
            }
            else if (timeDiff > 0) {
                if (!alreadyStarted) {
                    _time += '-';
                }
                else {
                    _time += ' ';
                }

                var endhours = _end.getHours();
                var endminutes = _end.getMinutes();
                if (adapter.config.dataPaddingWithZeros) {
                    if (endhours < 10) endhours   = '0' + endhours.toString();
                }
                if (endminutes < 10) endminutes = '0' + endminutes.toString();
                _time += endhours + ':' + endminutes;

                var startDayEnd = new Date();
                startDayEnd.setFullYear(_date.getFullYear());
                startDayEnd.setMonth(_date.getMonth());
                startDayEnd.setDate(_date.getDate() + 1);
                startDayEnd.setHours(0,0,0,0);
                if (_end > startDayEnd) { // end is next day
                    var start = new Date();
                    if (!alreadyStarted) {
                        start.setDate(_date.getDate());
                        start.setMonth(_date.getMonth());
                        start.setFullYear(_date.getFullYear());
                    }
                    start.setHours(0,0,1,0);
                    var fullTimeDiff = timeDiff;
                    timeDiff = _end.getTime() - start.getTime();
                    adapter.log.debug('    time difference: ' + timeDiff + ' (' + _date + '-' + _end + ' / ' + start + ') --> ' + (timeDiff / (24*60*60*1000)));
                    if (fullTimeDiff >= 24*60*60*1000) {
                        _time += '+' + Math.floor(timeDiff / (24*60*60*1000));
                    }
                }
                else if (adapter.config.replaceDates && _end.getHours() === 0 && _end.getMinutes() === 0) {
                    _time = ' ';
                }
            }
        }
    }
    var _class = '';
    var d = new Date();
    d.setHours(0,0,0,0);
    var d2 = new Date();
    d2.setDate(d.getDate() + 1);
    var todayOnly = false;
    if (day      === d.getDate() &&
        month    === (d.getMonth() + 1) &&
        year     === d.getFullYear() &&
        endday   === d2.getDate() &&
        endmonth === (d2.getMonth() + 1) &&
        endyear  === d2.getFullYear() &&
        fullday) {
            todayOnly = true;
    }
    adapter.log.debug('    todayOnly = ' + todayOnly + ': (' + _date + '-' + _end + '), alreadyStarted=' + alreadyStarted);

    if (todayOnly || !alreadyStarted) {
        if (day   === d.getDate() &&
            month === (d.getMonth() + 1) &&
            year  === d.getFullYear()) {
            _class = 'ical_today';
        }

        d.setDate(d.getDate() + 1);
        if (day   === d.getDate() &&
            month === (d.getMonth() + 1) &&
            year  === d.getFullYear()) {
            _class = 'ical_tomorrow';
        }

        d.setDate(d.getDate() + 1);
        if (day   === d.getDate() &&
            month === (d.getMonth() + 1) &&
            year  === d.getFullYear()) {
            _class = 'ical_dayafter';
        }

        d.setDate(d.getDate() + 1);
        if (day   === d.getDate() &&
            month === (d.getMonth() + 1) &&
            year  === d.getFullYear()) {
            _class = 'ical_3days';
        }

        d.setDate(d.getDate() + 1);
        if (day   === d.getDate() &&
            month === (d.getMonth() + 1) &&
            year  === d.getFullYear()) {
            _class = 'ical_4days';
        }

        d.setDate(d.getDate() + 1);
        if (day   === d.getDate() &&
            month === (d.getMonth() + 1) &&
            year  === d.getFullYear()) {
            _class = 'ical_5days';
        }

        d.setDate(d.getDate() + 1);
        if (day   === d.getDate() &&
            month === (d.getMonth() + 1) &&
            year  === d.getFullYear()) {
            _class = 'ical_6days';
        }

        d.setDate(d.getDate() + 1);
        if (day   === d.getDate() &&
            month === (d.getMonth() + 1) &&
            year  === d.getFullYear()) {
            _class = 'ical_oneweek';
        }
        if (adapter.config.replaceDates) {
            if (_class === 'ical_today')    return {text: ((alreadyStarted && !todayOnly) ? '&#8594; ' : '') + _('today')    + _time, _class: _class};
            if (_class === 'ical_tomorrow') return {text: (alreadyStarted ? '&#8594; ' : '') + _('tomorrow') + _time, _class: _class};
            if (_class === 'ical_dayafter') return {text: (alreadyStarted ? '&#8594; ' : '') + _('dayafter') + _time, _class: _class};
            if (_class === 'ical_3days')    return {text: (alreadyStarted ? '&#8594; ' : '') + _('3days')    + _time, _class: _class};
            if (_class === 'ical_4days')    return {text: (alreadyStarted ? '&#8594; ' : '') + _('4days')    + _time, _class: _class};
            if (_class === 'ical_5days')    return {text: (alreadyStarted ? '&#8594; ' : '') + _('5days')    + _time, _class: _class};
            if (_class === 'ical_6days')    return {text: (alreadyStarted ? '&#8594; ' : '') + _('6days')    + _time, _class: _class};
            if (_class === 'ical_oneweek')  return {text: (alreadyStarted ? '&#8594; ' : '') + _('oneweek')  + _time, _class: _class};
        }
    }
    else {
        // check if date is in the past and if so we show the end time instead
        _class = 'ical_today';
        var daysleft = Math.round((_end - new Date())/(1000*60*60*24));
        var hoursleft = Math.round((_end - new Date())/(1000*60*60));
        adapter.log.debug('    time difference: ' + daysleft + '/' + hoursleft + ' (' + _date + '-' + _end + ' / ' + start + ') --> ' + (timeDiff / (24*60*60*1000)));
        if (adapter.config.forceFullday && daysleft < 1) daysleft = 1;

        if (adapter.config.replaceDates) {
            var _left = (_('left') !== ' ' ? ' ' + _('left') : '');
            var text;
            if (daysleft === 42) {
                text = _('6week_left');
            } else if (daysleft === 35) {
                text = _('5week_left');
            } else if (daysleft === 28) {
                text = _('4week_left');
            } else if (daysleft === 21) {
                text = _('3week_left');
            } else if (daysleft === 14) {
                text = _('2week_left');
            } else if (daysleft === 7) {
                text = _('1week_left');
            } else if (daysleft >= 1) {
                if (adapter.config.language === 'ru') {
                    var c = daysleft % 10;
                    var cc = Math.floor(daysleft / 10) % 10;
                    if (daysleft === 1) {
                        text = (_('still') !== ' ' ? _('still') : '') + ' ' + daysleft  + ' ' + _('day') + _left;
                    } else if (cc > 1 && (c > 1 || c < 5)) {
                        text = (_('still') !== ' ' ? _('still') : '') + ' ' + daysleft  + ' ' + 'дня' + _left;
                    } else {
                        text = (_('still') !== ' ' ? _('still') : '') + ' ' + daysleft  + ' ' + _('days') + _left;
                    }
                } else {
                    text = (_('still') !== ' ' ? _('still') : '') + ' ' + daysleft  + ' ' + (daysleft  === 1 ? _('day') : _('days')) + _left;
                }
            } else {
                if (adapter.config.language === 'ru') {
                    var c = hoursleft % 10;
                    var cc = Math.floor(hoursleft / 10) % 10;
                    if (hoursleft === 1) {
                        text = (_('still') !== ' ' ? _('still') : '') + ' ' + hoursleft  + ' ' + _('hour') + _left;
                    } else if (cc !== 1 && (c > 1 || c < 5)) {
                        text = (_('still') !== ' ' ? _('still') : '') + ' ' + hoursleft  + ' ' + 'часа' + _left;
                    } else {
                        text = (_('still') !== ' ' ? _('still') : '') + ' ' + hoursleft  + ' ' + _('hours') + _left;
                    }
                } else {
                    text = (_('still') !== ' ' ? _('still') : '') + ' ' + hoursleft + ' ' + (hoursleft === 1 ? _('hour') : _('hours')) + _left;
                }
            }
        } else {
            day   = _end.getDate();
            month = _end.getMonth() + 1;
            year  = _end.getFullYear();

            if (adapter.config.dataPaddingWithZeros) {
                if (day < 10)   day   = '0' + day.toString();
                if (month < 10) month = '0' + month.toString();
            }

            text = '&#8594; ' + day + '.' + month + '.';
            if (!adapter.config.hideYear) {
                text += year;
            }

            if (withTime) {
                if (adapter.config.fulltime && fullday) {
                    text += ' ' + adapter.config.fulltime;
                }
                else {
                    var endhours   = _end.getHours();
                    var endminutes = _end.getMinutes();
                    if (adapter.config.dataPaddingWithZeros) {
                        if (endhours < 10)   {
                            endhours   = '0' + endhours.toString();
                        }
                    }
                    if (endminutes < 10) {
                        endminutes = '0' + endminutes.toString();
                    }
                    text += ' ' + endhours + ':' + endminutes;
                }
            }
        }

        return {text: text, _class: _class};
    }

    if (adapter.config.dataPaddingWithZeros) {
        if (day < 10)   day   = '0' + day.toString();
        if (month < 10) month = '0' + month.toString();
    }

    return {
        text:   day + '.' + month + ((adapter.config.hideYear) ? '.' : '.' + year) + _time,
        _class: _class
    };
}

// Show event as text
function displayDates() {
    var count = 0;
    if (datesArray.length) {
        var todayEventcounter = 0;
        for (var t = 0; t < datesArray.length; t++) {
            if (datesArray[t]._class.indexOf('ical_today') !== -1) todayEventcounter++;
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
            adapter.setState('events.' + events[j].name, {val: events[j].state, ack: true}, function () {
                if (!--count) {
                    setTimeout(function () {
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
            if (arr.length === 1) {
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

function brSeparatedList(datesArray) {
    var text     = '';
    var today    = new Date();
    var tomorrow = new Date();
    var dayafter = new Date();
    today.setHours(0,0,0,0);
    tomorrow.setDate(today.getDate() + 1);
    tomorrow.setHours(0,0,0,0);
    dayafter.setDate(today.getDate() + 2);
    dayafter.setHours(0,0,0,0);

    for (var i = 0; i < datesArray.length; i++) {
        var date = formatDate(datesArray[i]._date, datesArray[i]._end, true, datesArray[i]._allDay);
        var color = adapter.config.defColor;
        for (var j = 0; j < adapter.config.calendars.length; j++) {
            if (adapter.config.calendars[j].name === datesArray[i]._calName) {
                color = adapter.config.calendars[j].color;
                break;
            }
        }

        var xfix = colorizeDates(datesArray[i]._date, today, tomorrow, dayafter, color, datesArray[i]._calName);

        if (text) text += '<br/>\n';
        text += xfix.prefix + date.text + xfix.suffix + ' ' + datesArray[i].event + '</span></span>';
    }

    return text;
}

function main() {
    normal  = '<span style="font-weight: bold; color: ' + adapter.config.defColor + '"><span class="icalNormal">';

    adapter.config.language = adapter.config.language || 'en';

    syncUserEvents(readAll);

/*    setTimeout(function () {
        adapter.log.info('force terminating after 4 minutes');
        adapter.stop();
    }, 240000);*/
}
