/**
 *      ioBroker.iCal
 *      Copyright 2015-2020, bluefox <dogafox@gmail.com>
 *
 *      Based on ccu.io vader722 adapter.
 *      https://github.com/hobbyquaker/ccu.io/tree/master/adapter/ical
 *
 */

/* jshint -W097 */
/* jshint strict:false */
/* jshint esversion: 6 */
/* jslint node: true */
'use strict';

// Get common adapter utils
const utils       = require('@iobroker/adapter-core');
const RRule       = require('rrule').RRule;
const ical        = require('node-ical');
const ce          = require('cloneextend');
const moment      = require('moment-timezone');
const adapterName = require('./package.json').name.split('.').pop();
let request;
let fs;
let adapter;

function startAdapter(options) {
    options = options || {};

    Object.assign(options,{
        name:  adapterName,
        stateChange:  function (id, state) {
            if (!id || !state || state.ack || !state.val) {
                return;
            }

            if (id === adapter.namespace + '.trigger') {
                const content = state.val.split(' ');
                // One time read all calendars
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

                    // FIXME: checkForEvents not supporting call with only 1 parameter
                    case 'check':
                        if (content[1]) {
                            adapter.log.info('checking "' + content[1] + '"');
                            checkForEvents(content[1]);
                        } else {
                            adapter.log.warn('check all events');
                            for (let i = 0; i < adapter.config.events.length; i++) {
                                checkForEvents(adapter.config.events[i].name);
                            }
                        }
                        break;

                    default:
                        adapter.log.warn('Unknown command in trigger: "' + state.val + '"');
                }
            }
        },
        unload: function (callback) {
            callback();
        },
        ready: function () {
            main();
        }
    });

    adapter = new utils.Adapter(options);

    return adapter;
}

// set when ready
let   normal           = '';
const warn             = '<span style="font-weight: bold; color: red"><span class="icalWarn">';
const prewarn          = '<span style="font-weight: bold; color: orange"><span class="icalPreWarn">';
const preprewarn       = '<span style="font-weight: bold; color: yellow"><span class="icalPrePreWarn">';

let   datesArray       = [];
const events           = [];
const dictionary       = {
    'today':     {'en': 'Today',             'it': 'Oggi',                      'es': 'Hoy',                   'pl': 'Dzisiaj',                   'fr': 'Aujourd\'hui',              'de': 'Heute',            'ru': 'Сегодня',				'nl': 'Vandaag'},
    'tomorrow':  {'en': 'Tomorrow',          'it': 'Domani',                    'es': 'Mañana',                'pl': 'Jutro',                     'fr': 'Demain',                    'de': 'Morgen',           'ru': 'Завтра',				'nl': 'Morgen'},
    'dayafter':  {'en': 'Day After Tomorrow','it': 'Dopodomani',                'es': 'Pasado mañana',         'pl': 'Pojutrze',                  'fr': 'Après demain',              'de': 'Übermorgen',       'ru': 'Послезавтра',			'nl': 'Overmorgen'},
    '3days':     {'en': 'In 3 days',         'it': 'In 3 giorni',               'es': 'En 3 días',             'pl': 'W 3 dni',                   'fr': 'Dans 3 jours',              'de': 'In 3 Tagen',       'ru': 'Через 2 дня',			'nl': 'Over 3 dagen'},
    '4days':     {'en': 'In 4 days',         'it': 'In 4 giorni',               'es': 'En 4 días',             'pl': 'W 4 dni',                   'fr': 'Dans 4 jours',              'de': 'In 4 Tagen',       'ru': 'Через 3 дня',			'nl': 'Over 4 dagen'},
    '5days':     {'en': 'In 5 days',         'it': 'In 5 giorni',               'es': 'En 5 días',             'pl': 'W ciągu 5 dni',             'fr': 'Dans 5 jours',              'de': 'In 5 Tagen',       'ru': 'Через 4 дня',			'nl': 'Over 5 dagen'},
    '6days':     {'en': 'In 6 days',         'it': 'In 6 giorni',               'es': 'En 6 días',             'pl': 'W ciągu 6 dni',             'fr': 'Dans 6 jours',              'de': 'In 6 Tagen',       'ru': 'Через 5 дней',		'nl': 'Over 6 dagen'},
    'oneweek':   {'en': 'In one week',       'it': 'In una settimana',          'es': 'En una semana',         'pl': 'W jeden tydzień',           'fr': 'Dans une semaine',          'de': 'In einer Woche',   'ru': 'Через неделю',		'nl': 'Binnen een week'},
    '1week_left':{'en': 'One week left',     'it': 'Manca una settimana',       'es': 'Queda una semana',      'pl': 'Został jeden tydzień',      'fr': 'Reste une semaine',         'de': 'Noch eine Woche',  'ru': 'Ещё неделя',		    'nl': 'Over een week'},
    '2week_left':{'en': 'Two weeks left',    'it': 'Due settimane rimaste',     'es': 'Dos semanas restantes', 'pl': 'Zostały dwa tygodnie',      'fr': 'Il reste deux semaines',    'de': 'Noch zwei Wochen', 'ru': 'Ещё две недели',		'nl': 'Over twee weken'},
    '3week_left':{'en': 'Three weeks left',  'it': 'Tre settimane rimanenti',   'es': 'Tres semanas quedan',   'pl': 'Pozostały trzy tygodnie',   'fr': 'Trois semaines restantes',  'de': 'Noch drei Wochen', 'ru': 'Ещё три недели',	    'nl': 'Over drie weken'},
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
    if (!text) {
        return '';
    }

    if (dictionary[text]) {
        let newText = dictionary[text][adapter.config.language];
        if (newText) {
            return newText;
        } else if (adapter.config.language !== 'en') {
            newText = dictionary[text].en;
            if (newText) {
                return newText;
            }
        }
    } else if (!text.match(/_tooltip$/)) {
        adapter.log.debug('"' + text + '": {"en": "' + text + '", "de": "' + text + '", "ru": "' + text + '"},');
    }
    return text;
}

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
        throw new Error('invalid_date');
    }

    return (isFinite(this.valueOf()) && isFinite(b.valueOf()) ?
        (this > b) - (this < b) : NaN
    );
};

function getICal(urlOrFile, user, pass, sslignore, calName, cb) {
    // Is it file or URL
    if (!urlOrFile.match(/^https?:\/\//)) {
        fs = fs || require('fs');
        if (!fs.existsSync(urlOrFile)) {
            cb && cb('File does not exist: "' + urlOrFile + '"');
        } else {
            try {
                const data = fs.readFileSync(urlOrFile);
                cb && cb(null, data.toString());
            } catch (e) {
                cb && cb('Cannot read file "' + urlOrFile + '": ' + e);
            }
        }

    } else {
        request = request || require('request');
        // Find out whether SSL certificate errors shall be ignored
        const options = {
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
        request(options, (err, r, _data) => {
            if (err || !_data) {
                adapter.log.warn('Error reading from URL "' + urlOrFile + '": ' + ((err && err.code === 'ENOTFOUND') ? 'address not found!' : err));
                cb && cb(err || 'Cannot read URL: "' + urlOrFile + '"');
            } else {
                cb && cb(null, _data);
            }
        });
    }
}

function checkICal(urlOrFile, user, pass, sslignore, calName, filter, cb) {
    if (typeof user === 'function') {
        cb = user;
        user = undefined;
    }
    getICal(urlOrFile, user, pass, sslignore, calName, (err, _data) => {
        if (err || !_data) {
            adapter.log.warn('Error reading "' + urlOrFile + '": ' + err);
            cb(calName);
            return;
        }

        adapter.log.debug('File read successfully ' + urlOrFile);

        try {
            ical.parseICS(_data, (err, data) => {
                if (data) {
                    adapter.log.info('processing URL: ' + calName + ' ' + urlOrFile);
                    adapter.log.debug(JSON.stringify(data));
                    const realnow    = new Date();
                    const today      = new Date();
                    today.setHours(0, 0, 0, 0);
                    const endpreview = new Date();
                    endpreview.setDate(endpreview.getDate() + parseInt(adapter.config.daysPreview, 10));

                    const now2 = new Date();

                    // clear time
                    now2.setHours(0, 0, 0, 0);

                    setImmediate(() =>
                        processData(data, realnow, today, endpreview, now2, calName, filter, cb));
                } else {
                    // Ready with processing
                    cb(calName);
                }
            });
        } catch (e) {
            adapter.log.error('Cannot parse ics file: ' + e);
        }
    });
}

function getTimezoneOffset(date) {
    let offset = 0;
    const zone = moment.tz.zone(moment.tz.guess());
    if(zone && date) {
        offset = zone.utcOffset(date.getTime());
        adapter.log.debug('use offset ' + offset + ' for ' + date);
    } else {
        adapter.log.warn('no current timzone found: {zone:' + moment.tz.guess() + ', date: ' + date + '}');
    }

    return offset;
}

function addOffset(time, offset) {
    return new Date(time.getTime() + (offset * 60 * 1000));
}

function processData(data, realnow, today, endpreview, now2, calName, filter, cb) {
    let processedEntries = 0;
    // TODO: next line unused - remove or use?
    let defaultTimezone;
    for (const k in data) {
        const ev = data[k];
        delete data[k];

        // only events with summary and a start date are interesting
        if ((ev.summary !== undefined) && (ev.type === 'VEVENT') && ev.start && ev.start instanceof Date) {
            adapter.log.debug('ev:' + JSON.stringify(ev));
            if (!ev.end) {
                ev.end = ce.clone(ev.start);
                if (!ev.start.getHours() && !ev.start.getMinutes() && !ev.start.getSeconds()) {
                    ev.end.setDate(ev.end.getDate() + 1);
                }
            }
            // aha, it is RRULE in the event --> process it
            if (ev.rrule !== undefined) {
                const eventLength = ev.end.getTime() - ev.start.getTime();

                const options = RRule.parseString(ev.rrule.toString());
                // convert times temporary to UTC
                options.dtstart = addOffset(ev.start, -getTimezoneOffset(ev.start));
                if (options.until) {
                    options.until = addOffset(options.until, -getTimezoneOffset(options.until));
                }
                adapter.log.debug('options:' + JSON.stringify(options));

                const rule = new RRule(options);

                let now3 = new Date(now2.getTime() - eventLength);
                if (now2 < now3) {
                    now3 = now2;
                }
                adapter.log.debug('RRule event:' + ev.summary + '; start:' + ev.start.toString() + '; endpreview:' + endpreview.toString() + '; today:' + today + '; now2:' + now2 + '; now3:' + now3 + '; rule:' + JSON.stringify(rule));

                let dates = [];
                try {
                    dates = rule.between(now3, endpreview, true);
                } catch(e) {
                    adapter.log.error('Issue detected in RRule, event ignored; Please forward debug information to iobroker.ical developer: ' + e.stack + '\n' +
                        'RRule object: ' + JSON.stringify(rule) + '\n' +
                        'now3: ' + now3 + '\n' +
                        'endpreview: ' + endpreview + '\n' +
                        'string: ' + ev.rrule.toString() + '\n' +
                        'options: '+ JSON.stringify(options)
                    );
                }

                adapter.log.debug('dates:' + JSON.stringify(dates));
                // event within the time window
                if (dates.length > 0) {
                    for (let i = 0; i < dates.length; i++) {
                        // use deep-copy otherwise setDate etc. overwrites data from different events
                        let ev2 = ce.clone(ev);

                        // replace date & time for each event in RRule
                        // convert time back to local times
                        const start = dates[i];
                        ev2.start = addOffset(start, getTimezoneOffset(start));

                        // Set end date based on length in ms
                        const end = new Date(start.getTime() + eventLength);
                        ev2.end = addOffset(end, getTimezoneOffset(end));

                        adapter.log.debug('   ' + i + ': Event (' + JSON.stringify(ev2.exdate) + '):' + ev2.start.toString() + ' ' + ev2.end.toString());

                        // we have to check if there is an exdate array
                        // which defines dates that - if matched - should
                        // be excluded.
                        let checkDate = true;
                        if(ev2.exdate) {
                            for(const d in ev2.exdate) {
                                const dd = new Date(ev2.exdate[d]);
                                if (dd.getTime() === ev2.start.getTime()) {
                                    checkDate = false;
                                    adapter.log.debug('   ' + i + ': sort out');
                                    break;
                                }
                            }
                        }
                        if (checkDate && ev.recurrences) {
                            for(const dOri in ev.recurrences) {
                                const d = new Date(dOri);
                                if (d.getTime() === ev2.start.getTime()) {
                                    ev2 = ce.clone(ev.recurrences[dOri]);
                                    adapter.log.debug('   ' + i + ': different recurring found replaced with Event:' + ev2.start + ' ' + ev2.end);
                                }
                            }
                        }

                        if (checkDate) {
                            checkDates(ev2, endpreview, today, realnow, ' rrule ', calName, filter);
                        }
                    }
                } else {
                    adapter.log.debug('no RRule events inside the time interval');
                }
            } else {
                // No RRule event
                checkDates(ev, endpreview, today, realnow, ' ', calName, filter);
            }
        }

        if (++processedEntries > 100) {
            break;
        }
    }
    if (!Object.keys(data).length) {
        cb(calName);
    } else {
        setImmediate(() =>
            processData(data, realnow, today, endpreview, now2, calName, filter, cb));
    }
}

function checkDates(ev, endpreview, today, realnow, rule, calName, filter) {
    let fullDay = false;
    let reason;
    let date;

    // chech if sub parameter exists for outlook
    if (Object.prototype.hasOwnProperty.call(ev.summary, 'val')) {
        // yes -> read reason
        reason = ev.summary.val;
    } else {
        // no
        reason = ev.summary;
    }

    const location = ev.location || '';

    // If not start point => ignore it
    if (!ev.start || !ev.start instanceof Date) {
        return;
    }

    // If not end point => assume 0:0:0 event and set to same as start
    ev.end = ev.end || ev.start;
    if (!ev.end || !ev.end instanceof Date) {
        return;
    }

    // If full day
    if (!ev.start.getHours() &&
        !ev.start.getMinutes() &&
        !ev.start.getSeconds() &&
        !ev.end.getHours() &&
        !ev.end.getMinutes() &&
        !ev.end.getSeconds()
    ) {
        // interpreted as one day; RFC says end date must be after start date
        if (ev.end.getTime() === ev.start.getTime() && ev.datetype === 'date') {
            ev.end.setDate(ev.end.getDate() + 1);
        }
        if (ev.end.getTime() !== ev.start.getTime()) {
            fullDay = true;
        }
    }

    // If force Fullday is set
    if (adapter.config.forceFullday && !fullDay) {
        fullDay = true;
        ev.start.setMinutes(0);
        ev.start.setSeconds(0);
        ev.start.setHours(0);
        ev.end.setDate(ev.end.getDate() + 1);
        ev.end.setHours(0);
        ev.end.setMinutes(0);
        ev.end.setSeconds(0);
    }

    if (filter) {
        const content = 'SUMMARY:' + reason + '\nDESCRIPTION:' + ev.description + '\nLOCATION:'+ location;
        filter = new RegExp(filter.source, filter.flags);
        if(filter.test(content)) {
            adapter.log.debug('Event filtered using ' + filter + ' by content: ' + content);

            return;
        }
    }

    // Full day
    if (fullDay) {
        // event start >= today  && < previewtime  or end > today && < previewtime ---> display
        if ((ev.start < endpreview && ev.start >= today) || (ev.end > today && ev.end <= endpreview) || (ev.start < today && ev.end > today)) {
            // check only full day events
            if (checkForEvents(reason, today, ev, realnow)) {
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
                    location: location,
                    // add additional Objects, so iobroker.occ can use it
                    _calName: calName,
                    _calColor: adapter.config.calendars.find(x => x.name === calName).color
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
            if (checkForEvents(reason, today, ev, realnow)) {
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
                    location: location,
                    // add additional Objects, so iobroker.occ can use it
                    _calName: calName,
                    _calColor: adapter.config.calendars.find(x => x.name === calName).color
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
    const result = {
        prefix: normal,
        suffix: '</span>' + (adapter.config.colorize ? '</span>' : '')
    };
    const cmpDate = new Date(date.getTime());
    cmpDate.setHours(0, 0, 0, 0);

    calName = calName.replace(' ', '_');

    // colorize if needed
    if (adapter.config.colorize) {
        // today
        if (cmpDate.compare(today) === 0) {
            result.prefix = warn;
            // If configured every calendar has own color
            if (adapter.config.everyCalOneColor) {
                result.suffix += '<span style="font-weight:normal' + (col ? (';color:' + col) : '' ) + '">';
            } else {
                result.suffix += '<span style="font-weight:normal;color:red">';
            }
            result.suffix += '<span class="icalWarn2 iCal-' + calName + '2">';
        } else
        // tomorrow
        if (cmpDate.compare(tomorrow) === 0) {
            result.prefix = prewarn;
            // If configured every calendar has own color
            if (adapter.config.everyCalOneColor) {
                result.suffix += '<span style="font-weight: normal' + (col ? ('; color:' + col) : '') + '">';
            } else {
                result.suffix += '<span style="font-weight: normal; color: orange">';
            }
            result.suffix += "<span class='icalPreWarn2 iCal-" + calName + "2'>";
        } else
        // day after tomorrow
        if (cmpDate.compare(dayafter) === 0) {
            result.prefix = preprewarn;
            // If configured every calendar has own color
            if (adapter.config.everyCalOneColor) {
                result.suffix += '<span style="font-weight: normal' + (col ? ('; color:' + col) : '') + '">';
            } else {
                result.suffix += '<span style="font-weight: normal; color: yellow">';
            }
            result.suffix += "<span class='icalPrePreWarn2 iCal-" + calName + "2'>";
        } else
        // start time is in the past
        if (cmpDate.compare(today) === -1) {
            result.prefix = normal;
            // If configured every calendar has own color
            if (adapter.config.everyCalOneColor) {
                result.suffix += '<span style="font-weight: normal' + (col ? ('; color:' + col) : '') + '">';
            } else {
                result.suffix += '<span style="font-weight: normal' + (adapter.config.defColor ? ('; color:' + adapter.config.defColor) : '') + '">';
            }
            result.suffix += "<span class='icalNormal2 iCal-" + calName + "2'>";
        } else {
            // If configured every calendar has own color
            if (adapter.config.everyCalOneColor) {
                result.suffix += '<span style="font-weight: normal' + (col ? ('; color:' + col) : '') + '">';
            } else {
                result.suffix += '<span style="font-weight: normal' + (adapter.config.defColor ? ('; color:' + adapter.config.defColor) : '') + '">';
            }
            result.suffix += "<span class='icalNormal2 iCal-" + calName + "2'>";
        }
    }
    result.prefix = result.prefix.substring(0, result.prefix.length - 2);
    result.prefix += ' iCal-' + calName + '">';
    return result;
}

function checkForEvents(reason, today, event, realnow) {
    const oneDay = 24 * 60 * 60 * 1000;
    // show unknown events
    let result = true;

    // check if event exists in table
    for (let i = 0; i < events.length; i++) {
        const ev = events[i];
        if (reason.includes(ev.name)) {
            // check if event should shown
            result = ev.display;
            adapter.log.debug('found event in table: ' + ev.name);

            // If full day event
            // Follow processing only if event is today
            if (
                ((!ev.type || ev.type === 'today') && event.end.getTime() > today.getTime() + (ev.day * oneDay) && event.start.getTime() < today.getTime() + (ev.day * oneDay) + oneDay) ||
                (ev.type === 'now' && event.start <= realnow && realnow <= event.end) ||
                (ev.type === 'later' && event.start > realnow && event.start.getTime() < today.getTime() + oneDay)
            ) {
                adapter.log.debug((ev.type ? ev.type : 'day ' + ev.day) + ' Event with time: '  + event.start + ' ' + realnow + ' ' + event.end);

                // If yet processed
                if (ev.processed) {
                    // nothing to do
                    adapter.log.debug('Event ' + ev.name + ' yet processed');
                } else {
                    // Process event
                    ev.processed = true;
                    if (!ev.state) {
                        ev.state = true;
                        const name = 'events.' + ev.day + '.' + (ev.type ? ev.type + '.' : '') + shrinkStateName(ev.name);
                        adapter.log.info('Set ' + name + ' to true');
                        adapter.setState(name, {val: true, ack: true}, () =>
                            ev.id && setState(ev.id, ev.on));
                    }
                }
            }
        }
    }
    return result;
}

function initEvent(name, display, day, type, id, on, off, callback) {
    const obj = {
        name,
        processed: false,
        state:     null,
        display,
        day,
        type
    };

    if (type === 'now' && id) {
        obj.id = id;
        obj.off = off;
        obj.on = on;
    }

    events.push(obj);

    const stateName = 'events.' + day + '.' + (type ? type + '.' : '') + shrinkStateName(name);

    adapter.getState(stateName, (err, state) => {
        if (err || !state) {
            obj.state = false;
            adapter.setState(stateName, {val: false, ack: true}, () =>
                setState(id, off, () => callback && callback(name)));
        } else {
            obj.state = state.val;
            callback && callback(name);
        }
    });
}

function removeNameSpace(id) {
    const re = new RegExp(adapter.namespace + '*\.', 'g');
    return id.replace(re, '');
}

function shrinkStateName(v) {
    let n = v.replace(/[\s."`'*,\\?<>[\];:]+/g, '');
    if ((!n && typeof n != 'number') || 0 === n.length) {
        n = 'onlySpecialCharacters';
    }
    return n;
}

// Create new user events and remove existing, but deleted in config
function syncUserEvents(callback) {
    let count = 0;
    const days = parseInt(adapter.config.daysPreview, 10) + 1;

    // Read all actual events
    adapter.getStatesOf('', 'events', (err, states) => {
        const toAdd = [];
        const toDel = [];

        if (states) {
            // Add "to delete" all existing events
            for (let j = 0; j < states.length; j++) {
                toDel.push({id: removeNameSpace(states[j]._id), name: states[j].common.name});
            }
        }

        // Add "to add" all configured events
        for (let i = 0; i < adapter.config.events.length; i++) {
            for (let day = 0; day < days; day++) {
                const name = adapter.config.events[i].name;
                if (!day) {
                    toAdd.push({id: 'events.' + day + '.later.' + shrinkStateName(name), name: name});
                    toAdd.push({id: 'events.' + day + '.today.' + shrinkStateName(name), name: name});
                    toAdd.push({id: 'events.' + day + '.now.' + shrinkStateName(name), name: name});
                } else {
                    toAdd.push({id: 'events.' + day + '.' + shrinkStateName(name), name: name});
                }
            }
        }

        if (states) {
            function removeFromToDel(day, name) {
                const pos_ = toDel.indexOf(toDel.find(x => x.id === 'events.' + day + '.' + name));
                if (pos_ !== -1) {
                    toDel.splice(pos_, 1);
                }
            }

            for (let j = 0; j < states.length; j++) {
                for (let i = 0; i < adapter.config.events.length; i++) {
                    for (let day = 0; day < days; day++) {
                        if (states[j].common.name === adapter.config.events[i].name) {
                            // remove it from "toDel"
                            const name = shrinkStateName(adapter.config.events[i].name);
                            if (!day) {
                                removeFromToDel(day + '.today', name);
                                removeFromToDel(day + '.now', name);
                                removeFromToDel(day + '.later', name);
                            } else {
                                removeFromToDel(day, name);
                            }
                        }
                    }
                }
            }

            function removeFromToAdd(name) {
                const pos_ = toAdd.indexOf(toAdd.find(x => x.id === name));
                if (pos_ !== -1) {
                    toAdd.splice(pos_, 1);
                }
            }

            for (let day = 0; day < days; day++) {
                for (let i = 0; i < adapter.config.events.length; i++) {
                    for (let j = 0; j < states.length; j++) {
                        const event = adapter.config.events[i];
                        const name = shrinkStateName(event.name);
                        if (states[j].common.name === event.name &&
                            ((day > 0 && removeNameSpace(states[j]._id) === 'events.' + day + '.' + name) ||
                                (!day && (
                                    removeNameSpace(states[j]._id) === 'events.' + day + '.today.' + name ||
                                    removeNameSpace(states[j]._id) === 'events.' + day + '.now.' + name ||
                                    removeNameSpace(states[j]._id) === 'events.' + day + '.later.' + name
                                )))
                        ) {
                            if (event.enabled === 'true') {
                                event.enabled = true;
                            }
                            if (event.enabled === 'false') {
                                event.enabled = false;
                            }
                            if (event.display === 'true') {
                                event.display = true;
                            }
                            if (event.display === 'false') {
                                event.display = false;
                            }

                            // if settings does not changed
                            if (states[j].native.enabled == event.enabled &&
                                states[j].native.display == event.display) {
                                // remove it from "toAdd"
                                removeFromToAdd(removeNameSpace(states[j]._id));
                            }
                        }
                    }
                }
            }
        }

        // Add states
        for (let i = 0; i < toAdd.length; i++) {
            for (let j = 0; j < adapter.config.events.length; j++) {
                const configItem = adapter.config.events[j];
                if (configItem.name === toAdd[i].name) {
                    if (configItem.enabled === 'true')  {
                        configItem.enabled = true;
                    }
                    if (configItem.enabled === 'false') {
                        configItem.enabled = false;
                    }
                    if (configItem.display === 'true')  {
                        configItem.display = true;
                    }
                    if (configItem.display === 'false') {
                        configItem.display = false;
                    }

                    // Add or update state
                    adapter.setObject(toAdd[i].id,
                        {
                            type: 'state',
                            common: {
                                name: toAdd[i].name,
                                type: 'boolean',
                                role: 'indicator'
                            },
                            native: {
                                enabled: configItem.enabled,
                                display: configItem.display
                            }
                        },
                        (err, id) => adapter.log.info('Event "' + id.id + '" created')
                    );
                }
            }
        }

        // Remove states
        for (let i = 0; i < toDel.length; i++) {
            adapter.delObject(toDel[i].id);
            adapter.delState(toDel[i].id);
        }

        for (let day = 0; day < days; day++) {
            for (let i = 0; i < adapter.config.events.length; i++) {
                const event = adapter.config.events[i];
                // If event enabled add it to list
                if (event.enabled) {
                    if (!day) {
                        count += 3;
                        initEvent(event.name, event.display, 0, 'today', null, null, null, () => !--count && callback());
                        initEvent(event.name, event.display, 0, 'now',   null, null, null, () => !--count && callback());
                        initEvent(event.name, event.display, 0, 'later', null, null, null, () => !--count && callback());
                    } else {
                        count++;
                        initEvent(event.name, event.display, day, null, null, null, null, () => !--count && callback());
                    }
                }
            }
        }

        !count && callback();
    });
}

function buildFilter(filter, filterregex) {
    let ret = null;
    let prep = '';
    if (filterregex === 'true' || filterregex === true) {
        prep = filter;
    } else {
        const list = (filter || '').split(';');
        for (let i = 0; i < list.length; i++) {
            const item = list[i].trim();
            if(!item) {
                continue;
            }
            if(prep) {
                prep += '|';
            }
            prep += '(' + item + ')';
        }
        if(prep) {
            prep = '/' + prep + '/g';
        }
    }

    if (prep) {
        try {
            const s = prep.split('/');
            ret = new RegExp(s[1], s[2]);
        } catch (e) {
            adapter.log.error('invalid filter: ' + prep);
        }
    }

    return ret;
}

// Read all calendar
function readAll() {
    datesArray = [];
    let count = 0;

    // Set all events as not processed
    for (let j = 0; j < events.length; j++) {
        events[j].processed = false;
    }

    if (adapter.config.calendars) {
        // add own instance, needed if calendars are quickly readed
        for (let i = 0; i < adapter.config.calendars.length; i++) {
            if (adapter.config.calendars[i].url) {
                count++;
                adapter.log.debug('reading calendar from URL: ' + adapter.config.calendars[i].url + ', color: ' + adapter.config.calendars[i].color);
                checkICal(
                    adapter.config.calendars[i].url,
                    adapter.config.calendars[i].user,
                    adapter.config.calendars[i].pass,
                    adapter.config.calendars[i].sslignore,
                    adapter.config.calendars[i].name,
                    buildFilter(adapter.config.calendars[i].filter, adapter.config.calendars[i].filterregex), () => {
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
    checkICal(url, () =>
        displayDates());
}

function formatDate(_date, _end, withTime, fullDay) {
    let day   = _date.getDate();
    let month = _date.getMonth() + 1;
    let year  = _date.getFullYear();

    const endday   = _end.getDate();
    const endmonth = _end.getMonth() + 1;
    const endyear  = _end.getFullYear();
    let _time = '';
    const alreadyStarted = _date < new Date();

    if (withTime) {
        let hours   = _date.getHours();
        let minutes = _date.getMinutes();

        if (adapter.config.fulltime && fullDay) {
            _time = ' ' + adapter.config.fulltime;
        } else {
            if (!alreadyStarted) {
                if (adapter.config.dataPaddingWithZeros) {
                    if (hours < 10) {
                        hours   = '0' + hours.toString();
                    }
                }
                if (minutes < 10) {
                    minutes = '0' + minutes.toString();
                }
                _time = ' ' + hours + ':' + minutes;
            }
            let timeDiff = _end.getTime() - _date.getTime();
            if (timeDiff === 0 && hours === 0 && minutes === 0) {
                _time = ' ';
            } else if (timeDiff > 0) {
                if (!alreadyStarted) {
                    _time += '-';
                } else {
                    _time += ' ';
                }

                let endHours = _end.getHours();
                let endMinutes = _end.getMinutes();
                if (adapter.config.dataPaddingWithZeros && endHours < 10) {
                    endHours = '0' + endHours.toString();
                }
                if (endMinutes < 10) {
                    endMinutes = '0' + endMinutes.toString();
                }
                _time += endHours + ':' + endMinutes;

                const startDayEnd = new Date();
                startDayEnd.setFullYear(_date.getFullYear());
                startDayEnd.setMonth(_date.getMonth());
                startDayEnd.setDate(_date.getDate() + 1);
                startDayEnd.setHours(0, 0, 0, 0);

                // end is next day
                if (_end > startDayEnd) {
                    const start = new Date();
                    if (!alreadyStarted) {
                        start.setDate(_date.getDate());
                        start.setMonth(_date.getMonth());
                        start.setFullYear(_date.getFullYear());
                    }
                    start.setHours(0, 0, 1, 0);
                    const fullTimeDiff = timeDiff;
                    timeDiff = _end.getTime() - start.getTime();
                    adapter.log.debug('    time difference: ' + timeDiff + ' (' + _date + '-' + _end + ' / ' + start + ') --> ' + (timeDiff / (24*60*60*1000)));
                    if (fullTimeDiff >= 24 * 60 * 60 * 1000) {
                        _time += '+' + Math.floor(timeDiff / (24 * 60 * 60 * 1000));
                    }
                } else if (adapter.config.replaceDates && _end.getHours() === 0 && _end.getMinutes() === 0) {
                    _time = ' ';
                }
            }
        }
    }
    let _class = '';
    const d = new Date();
    d.setHours(0,0,0,0);
    const d2 = new Date();
    d2.setDate(d.getDate() + 1);
    let todayOnly = false;
    if (day      === d.getDate() &&
        month    === (d.getMonth() + 1) &&
        year     === d.getFullYear() &&
        endday   === d2.getDate() &&
        endmonth === (d2.getMonth() + 1) &&
        endyear  === d2.getFullYear() &&
        fullDay) {
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
            if (_class === 'ical_today')    {
                return {text: ((alreadyStarted && !todayOnly) ? '&#8594; ' : '') + _('today')    + _time, _class: _class};
            }
            if (_class === 'ical_tomorrow') {
                return {text: (alreadyStarted ? '&#8594; ' : '') + _('tomorrow') + _time, _class: _class};
            }
            if (_class === 'ical_dayafter') {
                return {text: (alreadyStarted ? '&#8594; ' : '') + _('dayafter') + _time, _class: _class};
            }
            if (_class === 'ical_3days')    {
                return {text: (alreadyStarted ? '&#8594; ' : '') + _('3days')    + _time, _class: _class};
            }
            if (_class === 'ical_4days')    {
                return {text: (alreadyStarted ? '&#8594; ' : '') + _('4days')    + _time, _class: _class};
            }
            if (_class === 'ical_5days')    {
                return {text: (alreadyStarted ? '&#8594; ' : '') + _('5days')    + _time, _class: _class};
            }
            if (_class === 'ical_6days')    {
                return {text: (alreadyStarted ? '&#8594; ' : '') + _('6days')    + _time, _class: _class};
            }
            if (_class === 'ical_oneweek')  {
                return {text: (alreadyStarted ? '&#8594; ' : '') + _('oneweek')  + _time, _class: _class};
            }
        }
    } else {
        // check if date is in the past and if so we show the end time instead
        _class = 'ical_today';
        let daysleft = Math.round((_end - new Date())/(1000 * 60 * 60 * 24));
        const hoursleft = Math.round((_end - new Date())/(1000 * 60 * 60));

        adapter.log.debug(`    time difference: ${daysleft}/${hoursleft} (${_date}-${_end})`);
        if (adapter.config.forceFullday && daysleft < 1) {
            daysleft = 1;
        }

        let text;
        if (adapter.config.replaceDates) {
            const _left = (_('left') !== ' ' ? ' ' + _('left') : '');
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
                    const c = daysleft % 10;
                    const cc = Math.floor(daysleft / 10) % 10;
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
                    const c = hoursleft % 10;
                    const cc = Math.floor(hoursleft / 10) % 10;
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
                if (day < 10)   {
                    day   = '0' + day.toString();
                }
                if (month < 10) {
                    month = '0' + month.toString();
                }
            }

            text = '&#8594; ' + day + '.' + month + '.';
            if (!adapter.config.hideYear) {
                text += year;
            }

            if (withTime) {
                if (adapter.config.fulltime && fullDay) {
                    text += ' ' + adapter.config.fulltime;
                } else {
                    let endhours   = _end.getHours();
                    let endminutes = _end.getMinutes();
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
        if (day < 10)   {
            day   = '0' + day.toString();
        }
        if (month < 10) {
            month = '0' + month.toString();
        }
    }

    return {
        text:   day + '.' + month + ((adapter.config.hideYear) ? '.' : '.' + year) + _time,
        _class: _class
    };
}

function setState(id, val, cb) {
    if (!id) {
        return cb & cb();
    }
    adapter.getForeignObject(id, (err, obj) => {
        if (!err && obj) {
            // convert value
            if (obj.common) {
                if (val === 'null' || val === null || val === undefined) {
                    val = null;
                } else {
                    if (obj.common.type === 'boolean') {
                        val = val === true || val === 'true' || val === 1  || val === '1';
                    } else if (obj.common.type === 'number') {
                        val = parseFloat(val);
                    } else if (obj.common.type === 'string') {
                        val = val.toString();
                    }
                }
            }

            adapter.setForeignState(id, val, true, cb);
        } else {
            cb && cb();
        }
    });
}

// Show event as text
function displayDates() {
    let count = 4;
    const retFunc = function () {
        !--count && setTimeout(() => adapter.stop(), 5000);
    };

    let todayEventCounter = 0;
    let tomorrowEventCounter = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const oneDay = 24 * 60 * 60 * 1000;
    const tomorrow = new Date(today.getTime() + oneDay);
    const dayAfterTomorrow = new Date(tomorrow.getTime() + oneDay);

    if (datesArray.length) {
        for (let t = 0; t < datesArray.length; t++) {
            if (datesArray[t]._end.getTime() > today.getTime() && datesArray[t]._date.getTime() < tomorrow.getTime()) {
                todayEventCounter++;
            }
            if (datesArray[t]._end.getTime() > tomorrow.getTime() && datesArray[t]._date.getTime() < dayAfterTomorrow.getTime()) {
                tomorrowEventCounter++;
            }
        }

        adapter.setState('data.table', {val: datesArray, ack: true}, retFunc);
        adapter.setState('data.html',  {val: brSeparatedList(datesArray), ack: true}, retFunc);
        adapter.setState('data.text',  {val: crlfSeparatedList(datesArray), ack: true}, retFunc);
    } else {
        adapter.setState('data.table', {val: [], ack: true}, retFunc);
        adapter.setState('data.html',  {val: '', ack: true}, retFunc);
        adapter.setState('data.text',  {val: '', ack: true}, retFunc);
    }
    adapter.setState('data.count', {val: todayEventCounter, ack: true}, retFunc);
    adapter.setState('data.countTomorrow', {val: tomorrowEventCounter, ack: true}, retFunc);

    // set not processed events to false
    for (let j = 0; j < events.length; j++) {
        if (!events[j].processed && events[j].state) {
            const ev = events[j];
            count++;
            ev.state = false;
            // Set to false
            const name = 'events.' + ev.day + '.' + (ev.type ? ev.type + '.' : '') + shrinkStateName(ev.name);
            adapter.log.info('Set ' + name + ' to false');
            adapter.setState(name, {val: false, ack: true}, () =>
                setState(ev.id, ev.off, retFunc));
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
                for (let i = 0; i < arr.length - 1; i++){
                    if (arr[i]._date <= element._date && element._date < arr[i + 1]._date) {
                        arr.splice(i + 1, 0, element);
                        element = null;
                        break;
                    }
                }
                if (element) {
                    arr.push(element);
                }
            }
        }
    }
}

function brSeparatedList(datesArray) {
    let text     = '';
    const today    = new Date();
    const tomorrow = new Date();
    const dayAfter = new Date();
    today.setHours(0, 0, 0, 0);
    tomorrow.setDate(today.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    dayAfter.setDate(today.getDate() + 2);
    dayAfter.setHours(0, 0, 0, 0);

    for (let i = 0; i < datesArray.length; i++) {
        const date = formatDate(datesArray[i]._date, datesArray[i]._end, true, datesArray[i]._allDay);
        let color = adapter.config.defColor;

        for (let j = 0; j < adapter.config.calendars.length; j++) {
            if (adapter.config.calendars[j].name === datesArray[i]._calName) {
                color = adapter.config.calendars[j].color;
                break;
            }
        }

        const xfix = colorizeDates(datesArray[i]._date, today, tomorrow, dayAfter, color, datesArray[i]._calName);

        if (text) {
            text += '<br/>\n';
        }
        text += xfix.prefix + date.text + xfix.suffix + ' ' + datesArray[i].event + '</span>' + (adapter.config.colorize ? '</span>' : '');
    }

    return text;
}

function crlfSeparatedList(datesArray) {
    let text     = '';
    const today    = new Date();
    const tomorrow = new Date();
    const dayafter = new Date();
    today.setHours(0, 0, 0, 0);
    tomorrow.setDate(today.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    dayafter.setDate(today.getDate() + 2);
    dayafter.setHours(0, 0, 0, 0);

    for (let i = 0; i < datesArray.length; i++) {
        const date = formatDate(datesArray[i]._date, datesArray[i]._end, true, datesArray[i]._allDay);
        let color = adapter.config.defColor;
        for (let j = 0; j < adapter.config.calendars.length; j++) {
            // TODO why doing all this stuff and then its unused?
            if (adapter.config.calendars[j].name === datesArray[i]._calName) {
                color = adapter.config.calendars[j].color;
                break;
            }
        }

        if (text) {
            text += '\n';
        }
        text += date.text + ' ' + datesArray[i].event + ' ' + datesArray[i].location;
    }

    return text;
}

function main() {
    normal  = '<span style="font-weight: bold' + (adapter.config.defColor ? ('; color: ' + adapter.config.defColor) : '') + '"><span class="icalNormal">';

    adapter.config.language = adapter.config.language || 'en';

    syncUserEvents(readAll);
}

// If started as allInOne/compact mode => return function to create instance
if (module && module.parent) {
    module.exports = startAdapter;
} else {
    // or start the instance directly
    startAdapter();
}
