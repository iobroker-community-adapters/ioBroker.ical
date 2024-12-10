'use strict';

const ical = require('node-ical');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const https = require('node:https');
const os = require('node:os');

const utils = require('@iobroker/adapter-core');
const adapterName = require('./package.json').name.split('.').pop();

const RRule = require('rrule').RRule;
const ce = require('cloneextend');
const axios = require('axios');

let adapter;
let stopped = false;
let killTimeout = null;

function startAdapter(options) {
    options = options || {};

    Object.assign(options, {
        name: adapterName,
        unload: function (callback) {
            stopped = true;
            callback();
        },
        ready: function () {
            main();
        },
    });

    adapter = new utils.Adapter(options);

    return adapter;
}

// set when ready
let normal = '';
const warn = '<span style="font-weight: bold; color: red"><span class="icalWarn">';
const prewarn = '<span style="font-weight: bold; color: orange"><span class="icalPreWarn">';
const preprewarn = '<span style="font-weight: bold; color: yellow"><span class="icalPrePreWarn">';

let datesArray = [];
const events = [];
const dictionary = {
    today: {
        en: 'Today',
        it: 'Oggi',
        es: 'Hoy',
        pl: 'Dzisiaj',
        fr: "Aujourd'hui",
        de: 'Heute',
        ru: 'Сегодня',
        nl: 'Vandaag',
    },
    tomorrow: {
        en: 'Tomorrow',
        it: 'Domani',
        es: 'Mañana',
        pl: 'Jutro',
        fr: 'Demain',
        de: 'Morgen',
        ru: 'Завтра',
        nl: 'Morgen',
    },
    dayafter: {
        en: 'Day After Tomorrow',
        it: 'Dopodomani',
        es: 'Pasado mañana',
        pl: 'Pojutrze',
        fr: 'Après demain',
        de: 'Übermorgen',
        ru: 'Послезавтра',
        nl: 'Overmorgen',
    },
    '3days': {
        en: 'In 3 days',
        it: 'In 3 giorni',
        es: 'En 3 días',
        pl: 'W 3 dni',
        fr: 'Dans 3 jours',
        de: 'In 3 Tagen',
        ru: 'Через 2 дня',
        nl: 'Over 3 dagen',
    },
    '4days': {
        en: 'In 4 days',
        it: 'In 4 giorni',
        es: 'En 4 días',
        pl: 'W 4 dni',
        fr: 'Dans 4 jours',
        de: 'In 4 Tagen',
        ru: 'Через 3 дня',
        nl: 'Over 4 dagen',
    },
    '5days': {
        en: 'In 5 days',
        it: 'In 5 giorni',
        es: 'En 5 días',
        pl: 'W ciągu 5 dni',
        fr: 'Dans 5 jours',
        de: 'In 5 Tagen',
        ru: 'Через 4 дня',
        nl: 'Over 5 dagen',
    },
    '6days': {
        en: 'In 6 days',
        it: 'In 6 giorni',
        es: 'En 6 días',
        pl: 'W ciągu 6 dni',
        fr: 'Dans 6 jours',
        de: 'In 6 Tagen',
        ru: 'Через 5 дней',
        nl: 'Over 6 dagen',
    },
    oneweek: {
        en: 'In one week',
        it: 'In una settimana',
        es: 'En una semana',
        pl: 'W jeden tydzień',
        fr: 'Dans une semaine',
        de: 'In einer Woche',
        ru: 'Через неделю',
        nl: 'Binnen een week',
    },
    '1week_left': {
        en: 'One week left',
        it: 'Manca una settimana',
        es: 'Queda una semana',
        pl: 'Został jeden tydzień',
        fr: 'Reste une semaine',
        de: 'Noch eine Woche',
        ru: 'Ещё неделя',
        nl: 'Over een week',
    },
    '2week_left': {
        en: 'Two weeks left',
        it: 'Due settimane rimaste',
        es: 'Dos semanas restantes',
        pl: 'Zostały dwa tygodnie',
        fr: 'Il reste deux semaines',
        de: 'Noch zwei Wochen',
        ru: 'Ещё две недели',
        nl: 'Over twee weken',
    },
    '3week_left': {
        en: 'Three weeks left',
        it: 'Tre settimane rimanenti',
        es: 'Tres semanas quedan',
        pl: 'Pozostały trzy tygodnie',
        fr: 'Trois semaines restantes',
        de: 'Noch drei Wochen',
        ru: 'Ещё три недели',
        nl: 'Over drie weken',
    },
    '4week_left': {
        en: 'Four weeks left',
        it: 'Quattro settimane rimaste',
        es: 'Cuatro semanas quedan',
        pl: 'Pozostały cztery tygodnie',
        fr: 'Quatre semaines à gauche',
        de: 'Noch vier Wochen',
        ru: 'Ещё три недели',
        nl: 'Over vier weken',
    },
    '5week_left': {
        en: 'Five weeks left',
        it: 'Cinque settimane rimaste',
        es: 'Quedan cinco semanas',
        pl: 'Pozostało pięć tygodni',
        fr: 'Cinq semaines à gauche',
        de: 'Noch fünf Wochen',
        ru: 'Ещё пять недель',
        nl: 'Over vijf weken',
    },
    '6week_left': {
        en: 'Six weeks left',
        it: 'Sei settimane a sinistra',
        es: 'Seis semanas restantes',
        pl: 'Pozostało sześć tygodni',
        fr: 'Six semaines à gauche',
        de: 'Noch sechs Wochen',
        ru: 'Ещё шесть недель',
        nl: 'Over zes weken',
    },
    left: {
        en: 'left',
        it: 'sinistra',
        es: 'izquierda',
        pl: 'lewo',
        fr: 'la gauche',
        de: ' ',
        ru: 'осталось',
        nl: 'over',
    },
    still: { en: ' ', it: '', es: '', pl: '', fr: '', de: 'Noch', ru: ' ', nl: 'nog' },
    days: { en: 'days', it: 'Giorni', es: 'dias', pl: 'dni', fr: 'journées', de: 'Tage', ru: 'дней', nl: 'dagen' },
    day: { en: 'day', it: 'giorno', es: 'día', pl: 'dzień', fr: 'journée', de: 'Tag', ru: 'день', nl: 'dag' },
    hours: { en: 'hours', it: 'ore', es: 'horas', pl: 'godziny', fr: 'heures', de: 'Stunden', ru: 'часов', nl: 'uren' },
    hour: { en: 'hour', it: 'ora', es: 'hora', pl: 'godzina', fr: 'heure', de: 'Stunde', ru: 'час', nl: 'uur' },
    minute: {
        en: 'minute',
        it: 'minuto',
        es: 'minuto',
        pl: 'minuta',
        fr: 'minute',
        de: 'Minute',
        ru: 'минута',
        nl: 'minuut',
    },
    minutes: {
        en: 'minutes',
        it: 'minuti',
        es: 'minutos',
        pl: 'minutos',
        fr: 'minutes',
        de: 'Minuten',
        ru: 'минуты',
        nl: 'minuten',
    },
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
        adapter.log.debug(`"${text}": {"en": "${text}", "de": "${text}", "ru": "${text}"},`);
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
Date.prototype.compare = function (b) {
    if (b.constructor !== Date) {
        throw new Error('invalid_date');
    }

    return isFinite(this.valueOf()) && isFinite(b.valueOf()) ? (this > b) - (this < b) : NaN;
};

async function getICal(urlOrFile, user, pass, sslignore, calName, cb) {
    // Is it file or URL
    if (!urlOrFile.match(/^https?:\/\//)) {
        const ioFileExists = await adapter.fileExistsAsync(adapter.namespace, urlOrFile);
        if (ioFileExists) {
            try {
                const ioFile = await adapter.readFileAsync(adapter.namespace, urlOrFile);
                cb(null, ioFile.file.toString());
            } catch (e) {
                cb && cb(`Cannot read ioBroker file "${urlOrFile}": ${e}`);
            }
        } else if (!fs.existsSync(urlOrFile)) {
            cb && cb(`File does not exist: "${urlOrFile}"`);
        } else {
            try {
                const data = fs.readFileSync(urlOrFile);
                cb && cb(null, data.toString());
            } catch (e) {
                cb && cb(`Cannot read file "${urlOrFile}": ${e}`);
            }
        }
    } else {
        // Find out whether SSL certificate errors shall be ignored
        const options = {
            method: 'get',
            url: urlOrFile,
        };

        if (adapter.config.customUserAgentEnabled && adapter.config.customUserAgent) {
            options.headers = {
                'User-Agent': adapter.config.customUserAgent,
            };
        }

        if (sslignore === 'ignore' || sslignore === 'true' || sslignore === true) {
            options.httpsAgent = new https.Agent({
                rejectUnauthorized: false,
            });
        }

        if (user) {
            options.auth = {
                username: user,
                password: pass,
            };
        }

        const calHash = crypto
            .createHash('md5')
            .update(user + pass + urlOrFile)
            .digest('hex');
        const cachedFilename = path.join(os.tmpdir(), `iob-${calHash}.ics`);

        axios(options)
            .then(function (response) {
                if (response.data) {
                    try {
                        fs.writeFileSync(cachedFilename, response.data, 'utf-8');
                        adapter.log.debug(
                            `Successfully cached content for calendar "${urlOrFile}" as ${cachedFilename}`,
                        );
                    } catch {
                        // Ignore
                    }

                    cb && cb(null, response.data);
                } else {
                    cb && cb(`Error reading from URL "${urlOrFile}": Received no data`);
                }
            })
            .catch(error => {
                let cachedContent;
                let cachedDate;

                if (error.response) {
                    // The request was made and the server responded with a status code
                    // that falls out of the range of 2xx
                    adapter.log.warn(`Error reading from URL "${urlOrFile}": ${error.response.status}`);
                } else if (error.request) {
                    // The request was made but no response was received
                    // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
                    // http.ClientRequest in node.js
                    adapter.log.warn(`Error reading from URL "${urlOrFile}"`);
                } else {
                    // Something happened in setting up the request that triggered an Error
                    adapter.log.warn(`Error reading from URL "${urlOrFile}": ${error.message}`);
                }

                try {
                    if (fs.existsSync(cachedFilename)) {
                        cachedContent = fs.readFileSync(cachedFilename, 'utf-8');
                        const stat = fs.statSync(cachedFilename);
                        cachedDate = stat.mtime;
                    }
                } catch (err) {
                    adapter.log.info(`Cannot read cached calendar file for "${urlOrFile}": ${err.message}`);
                }

                if (!cachedContent) {
                    return cb && cb(`Cannot read URL: "${urlOrFile}"`);
                }

                adapter.log.info(`Use cached File content for "${urlOrFile}" from ${cachedDate}`);
                cb && cb(null, cachedContent);
            });
    }
}

function checkICal(urlOrFile, user, pass, sslignore, calName, filter, cb) {
    if (stopped) {
        return;
    }
    if (typeof user === 'function') {
        cb = user;
        user = undefined;
    }
    getICal(urlOrFile, user, pass, sslignore, calName, (err, _data) => {
        if (stopped) {
            return;
        }
        if (err || !_data) {
            adapter.log.warn(`Error reading "${urlOrFile}": ${err}`);
            cb(err, calName);
            return;
        }

        adapter.log.debug(`File read successfully ${urlOrFile}`);

        try {
            ical.parseICS(_data, (err, data) => {
                if (stopped) {
                    return;
                }
                if (data) {
                    adapter.log.info(`processing URL: ${calName} ${urlOrFile}`);
                    adapter.log.debug(JSON.stringify(data));
                    const realnow = new Date();

                    const startpreview = new Date();
                    startpreview.setDate(startpreview.getDate() - parseInt(adapter.config.daysPast, 10));
                    startpreview.setHours(0, 0, 0, 0);

                    adapter.log.debug(`checkICal: startpreview - ${startpreview}`);

                    const endpreview = new Date();
                    endpreview.setDate(endpreview.getDate() + parseInt(adapter.config.daysPreview, 10));

                    adapter.log.debug(`checkICal: endpreview - ${endpreview}`);

                    const now2 = new Date();

                    // clear time
                    now2.setHours(0, 0, 0, 0);

                    setImmediate(() => processData(data, realnow, startpreview, endpreview, now2, calName, filter, cb));
                } else {
                    // Ready with processing
                    cb(null, calName);
                }
            });
        } catch (e) {
            adapter.log.error(`Cannot parse ics file: ${e}`);
            cb(err, calName);
        }
    });
}

function addOffset(time, offset) {
    return new Date(time.getTime() + offset * 60 * 1000);
}

function treatAsUTC(date) {
    const result = new Date(date);
    result.setMinutes(result.getMinutes() - result.getTimezoneOffset());
    return result;
}

async function processData(data, realnow, startpreview, endpreview, now2, calName, filter, cb) {
    if (stopped) {
        return;
    }
    let processedEntries = 0;
    for (const k in data) {
        const ev = data[k];
        delete data[k];

        // only events with summary and a start date are interesting
        if (ev.summary !== undefined && ev.type === 'VEVENT' && ev.start && ev.start instanceof Date) {
            adapter.log.debug(`ev[${k}]: ${JSON.stringify(ev)}`);
            if (!ev.end || !(ev.end instanceof Date)) {
                ev.end = new Date(ev.start.getTime());
                if (ev.start.getHours() === 0 && ev.start.getMinutes() === 0 && ev.start.getSeconds() === 0) {
                    ev.end.setDate(ev.end.getDate() + 1);
                }
            }
            // aha, it is RRULE in the event --> process it
            if (ev.rrule !== undefined) {
                let eventLength = treatAsUTC(ev.end.getTime()) - treatAsUTC(ev.start.getTime());
                if (ev.datetype === 'date') {
                    // If "whole day event" correct the eventlength to full days
                    const calcStart = new Date(ev.start.getTime());
                    calcStart.setHours(0, 0, 0, 0);
                    let calcEnd = new Date(ev.end.getTime());
                    if (calcEnd.getHours() === 0 && calcEnd.getMinutes() === 0 && calcEnd.getSeconds() === 0) {
                        // if end id 0:0:0 then it is considered exclusive, so reduce by 1s
                        calcEnd = new Date(ev.end.getTime());
                        calcEnd.setDate(calcEnd.getDate() - 1);
                        adapter.log.debug(`Adjust enddate to exclude 0:0:0 for eventlength`);
                    }
                    calcEnd.setHours(23, 59, 59, 0);
                    eventLength = treatAsUTC(calcEnd.getTime()) - treatAsUTC(calcStart.getTime());
                    eventLength = Math.ceil(eventLength / (24 * 60 * 60 * 1000)) * 24 * 60 * 60 * 1000;
                    adapter.log.debug(
                        `Calculated Date Eventlength = ${eventLength} (${eventLength / (24 * 60 * 60 * 1000)} days) for ${calcStart.toString()} - ${calcEnd.toString()}`,
                    );
                }

                const options = RRule.parseString(ev.rrule.toString());

                // the following workaround an issue in rule.between() later on where
                // the time comparison between dtstart and until does not seem to work
                // if both are not in the same DST zone (e.g. dtstart=2021-09-21T15:00:00.000Z
                // until=2021-11-09T15:59:59.000Z) so that an event is still considered as TODAY
                // even thought it ends one second before the next scheduled one.
                if (options.until !== undefined && options.dtstart !== undefined) {
                    options.until = addOffset(
                        options.until,
                        options.dtstart.getTimezoneOffset() - options.until.getTimezoneOffset(),
                    );
                }
                adapter.log.debug(`options: ${JSON.stringify(options)}`);

                const rule = new RRule(options);

                let now3 = new Date(now2.getTime() - eventLength);
                if (now2 < now3) {
                    now3 = now2;
                }
                if (startpreview < now3) {
                    now3 = startpreview;
                }
                adapter.log.debug(
                    `RRule event:${ev.summary}; start:${ev.start.toString()}; endpreview:${endpreview.toString()}; startpreview:${startpreview.toString()}; now2:${now2.toString()}; now3:${now3.toString()}; rule:${JSON.stringify(rule)}`,
                );

                let dates = [];
                try {
                    dates = rule.between(now3, endpreview, true);
                } catch (e) {
                    adapter.log
                        .error(`Issue detected in RRule, event ignored; Please forward debug information to iobroker.ical developer: ${e.stack}
RRule object: ${JSON.stringify(rule)}
now3: ${now3}
endpreview: ${endpreview}
string: ${ev.rrule.toString()}
options: ${JSON.stringify(options)}`);
                }

                adapter.log.debug(`dates: ${JSON.stringify(dates)}`);
                // event within the time window
                if (dates.length > 0) {
                    for (let i = 0; i < dates.length; i++) {
                        // use deep-copy otherwise setDate etc. overwrites data from different events
                        let ev2 = ce.clone(ev);

                        // we have to move the start time of our clone
                        // to a time relative to the timezone of the start time
                        // so that re-currence events are setup correctly and
                        // that the later exdate check will match correctly.
                        ev2.start = dates[i];
                        if (ev.datetype === 'date') {
                            // make sure to set the time to 00:00:00 so that
                            // this event will be recognized as a date event
                            ev2.start.setHours(0, 0, 0, 0);
                        } else if (ev.datetype === 'date-time') {
                            // rrule only knows about local time but stores the
                            // datetime in zulu (Z) UTC time strings. Thus we need
                            // to convert it to local time carrying objects, thus
                            // add the ev2.start tz offset
                            ev2.start = addOffset(ev2.start, ev2.start.getTimezoneOffset());
                        }

                        // Set end date based on length in ms
                        ev2.end = new Date(ev2.start.getTime() + eventLength);
                        if (ev2.start.getTimezoneOffset() !== ev2.end.getTimezoneOffset()) {
                            // DST difference, we need to correct it
                            ev2.end = addOffset(ev2.end, ev2.end.getTimezoneOffset() - ev2.start.getTimezoneOffset());
                        }

                        // we have to check if there is an exdate array
                        // which defines dates that - if matched - should
                        // be excluded.
                        let checkDate = true;
                        if (ev2.exdate) {
                            adapter.log.debug(
                                `   ${i}: Event (exdate: ${JSON.stringify(Object.keys(ev2.exdate))}): ${ev2.start.toString()} ${ev2.end.toString()}`,
                            );
                            for (const d in ev2.exdate) {
                                const dd = new Date(ev2.exdate[d]);
                                if (dd.getTime() === ev2.start.getTime()) {
                                    checkDate = false;
                                    adapter.log.debug(`   ${i}: exclude ${dd.toString()}`);
                                    break;
                                }
                            }
                        } else {
                            adapter.log.debug(
                                `   ${i}: Event (NO exdate): ${ev2.start.toString()} ${ev2.end.toString()}`,
                            );
                        }

                        if (checkDate && ev.recurrences) {
                            for (const dOri in ev.recurrences) {
                                const recurEvent = ev.recurrences[dOri];
                                if (recurEvent.recurrenceid.getTime() === ev2.start.getTime()) {
                                    ev2 = ce.clone(recurEvent);
                                    adapter.log.debug(
                                        `   ${i}: different recurring found replaced with Event:${ev2.start} ${ev2.end}`,
                                    );
                                }
                            }
                        }

                        if (checkDate) {
                            await checkDates(ev2, endpreview, startpreview, realnow, ' rrule ', calName, filter);
                        }
                    }
                } else {
                    adapter.log.debug('no RRule events inside the time interval');
                }
            } else {
                adapter.log.debug(
                    `Single event: ${ev.summary}; start:${ev.start}; end:${ev.end}; endpreview:${endpreview}; startpreview:${startpreview}; realnow:${realnow}`,
                );
                // No RRule event
                await checkDates(ev, endpreview, startpreview, realnow, ' ', calName, filter);
            }
        }

        if (++processedEntries > 100) {
            break;
        }
    }
    if (!Object.keys(data).length) {
        cb(null, calName);
    } else {
        setImmediate(() => processData(data, realnow, startpreview, endpreview, now2, calName, filter, cb));
    }
}

async function checkDates(ev, endpreview, startpreview, realnow, rule, calName, filter) {
    let fullDay = false;
    let isPrivate;
    let reason;
    let date;

    // chech if sub parameter exists for outlook
    if (
        Object.prototype.hasOwnProperty.call(ev, 'summary') &&
        Object.prototype.hasOwnProperty.call(ev.summary, 'val')
    ) {
        // yes -> read reason
        reason = ev.summary.val || '';
    } else {
        // no
        reason = ev.summary || '';
    }

    const location = ev.location || '';

    // check if sub parameter 'class' exists and contains PRIVATE
    isPrivate = Object.prototype.hasOwnProperty.call(ev, 'class') && ev.class === 'PRIVATE';

    // If not start point => ignore it
    if (!ev.start || !(ev.start instanceof Date)) {
        return;
    }

    // If not end point => assume 0:0:0 event and set to same as start
    ev.end = ev.end?.getTime() ? new Date(ev.end.getTime()) : new Date(ev.start.getTime());
    if (!ev.end || !(ev.end instanceof Date)) {
        return;
    }

    // If full day
    if (
        ev.start.getHours() === 0 &&
        ev.start.getMinutes() === 0 &&
        ev.start.getSeconds() === 0 &&
        ev.end.getHours() === 0 &&
        ev.end.getMinutes() === 0 &&
        ev.end.getSeconds() === 0
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
        const content = `SUMMARY:${reason}
DESCRIPTION:${ev.description}
LOCATION:${location}`;
        filter = new RegExp(filter.source, filter.flags);
        if (filter.test(content)) {
            adapter.log.debug(`Event filtered using ${filter} by content: ${content}`);

            return;
        }
    }

    // Full day
    if (fullDay) {
        adapter.log.debug(`Event (full day) processing. Start: ${ev.start} End: ${ev.end}`);

        // event start >= startpreview  && < previewtime  or end > startpreview && < previewtime ---> display
        if (
            (ev.start < endpreview && ev.start >= startpreview) ||
            (ev.end > startpreview && ev.end <= endpreview) ||
            (ev.start < realnow && ev.end > realnow)
        ) {
            // check only full day events
            if (await checkForEvents(reason, ev, realnow)) {
                date = formatDate(ev.start, ev.end, true, true);

                insertSorted(datesArray, {
                    date: date.text,
                    event: reason,
                    _class: `ical_${calName} ${date._class}`,
                    _date: new Date(ev.start.getTime()),
                    // add additional Objects, so iobroker.occ can use it
                    _end: new Date(ev.end.getTime()),
                    _section: ev.description,
                    _IDID: ev.uid,
                    _allDay: true,
                    _private: isPrivate,
                    _rule: rule,
                    location: location,
                    // add additional Objects, so iobroker.occ can use it
                    _calName: calName,
                    _calColor: adapter.config.calendars.find(x => x.name === calName).color,
                    _object: ev,
                });

                adapter.log.debug(`Event (full day) added : ${JSON.stringify(rule)} ${reason} at ${date.text}`);
            } else {
                adapter.log.debug(`Event (full day) not displayed, because belongs to hidden user events: ${reason}`);
            }
        } else {
            // filtered out, because does not belongs to specified time interval
            adapter.log.debug(
                `Event (full day) ${JSON.stringify(rule)} ${reason} at ${ev.start.toString()} filtered out, does not belong to specified time interval`,
            );
        }
    } else {
        adapter.log.debug(`Event (time) processing. Start: ${ev.start} End: ${ev.end}`);

        // Event with time
        // Start time >= startpreview && Start time < preview time && End time >= now
        if (
            (ev.start >= startpreview && ev.start < endpreview && ev.end >= realnow) ||
            (ev.end >= realnow && ev.end <= endpreview) ||
            (ev.start < realnow && ev.end > realnow)
        ) {
            // Add to list only if not hidden
            if (await checkForEvents(reason, ev, realnow)) {
                date = formatDate(ev.start, ev.end, true, false);

                insertSorted(datesArray, {
                    date: date.text,
                    event: reason,
                    _class: `ical_${calName} ${date._class}`,
                    _date: new Date(ev.start.getTime()),
                    // add additional Objects, so iobroker.occ can use it
                    _end: new Date(ev.end.getTime()),
                    _section: ev.description,
                    _IDID: ev.uid,
                    _allDay: false,
                    _private: isPrivate,
                    _rule: rule,
                    location: location,
                    // add additional Objects, so iobroker.occ can use it
                    _calName: calName,
                    _calColor: adapter.config.calendars.find(x => x.name === calName).color,
                    _object: ev,
                });

                adapter.log.debug(`Event with time added: ${JSON.stringify(rule)} ${reason} at ${date.text}`);
            } else {
                adapter.log.debug(`Event does not displayed, because belongs to hidden user events: ${reason}`);
            }
        } else {
            // filtered out, because does not belongs to specified time interval
            adapter.log.debug(
                `Event ${JSON.stringify(rule)} ${reason} at ${ev.start.toString()} filtered out, because does not belongs to specified time interval`,
            );
        }
    }
}

function colorizeDates(date, today, tomorrow, dayafter, col, calName) {
    const result = {
        prefix: normal,
        suffix: `</span>${adapter.config.colorize ? '</span>' : ''}`,
    };
    const cmpDate = new Date(date.getTime());
    cmpDate.setHours(0, 0, 0, 0);

    calName = (calName || '').replace(' ', '_');

    // colorize if needed
    if (adapter.config.colorize) {
        // today
        if (cmpDate.compare(today) <= 0) {
            result.prefix = warn;
            // If configured every calendar has own color
            if (adapter.config.everyCalOneColor) {
                result.suffix += `<span style="font-weight:normal${col ? `;color:${col}` : ''}">`;
            } else {
                result.suffix += '<span style="font-weight:normal;color:red">';
            }
            result.suffix += `<span class="icalWarn2 iCal-${calName}2">`;
        } else if (cmpDate.compare(tomorrow) === 0) {
            // tomorrow
            result.prefix = prewarn;
            // If configured every calendar has own color
            if (adapter.config.everyCalOneColor) {
                result.suffix += `<span style="font-weight: normal${col ? `; color:${col}` : ''}">`;
            } else {
                result.suffix += '<span style="font-weight: normal; color: orange">';
            }
            result.suffix += `<span class='icalPreWarn2 iCal-${calName}2'>`;
        } else if (cmpDate.compare(dayafter) === 0) {
            // day after tomorrow
            result.prefix = preprewarn;
            // If configured every calendar has own color
            if (adapter.config.everyCalOneColor) {
                result.suffix += `<span style="font-weight: normal${col ? `; color:${col}` : ''}">`;
            } else {
                result.suffix += '<span style="font-weight: normal; color: yellow">';
            }
            result.suffix += `<span class='icalPrePreWarn2 iCal-${calName}2'>`;
        } else if (cmpDate.compare(today) === -1) {
            // start time is in the past
            result.prefix = normal;
            // If configured every calendar has own color
            if (adapter.config.everyCalOneColor) {
                result.suffix += `<span style="font-weight: normal${col ? `; color:${col}` : ''}">`;
            } else {
                result.suffix += `<span style="font-weight: normal${adapter.config.defColor ? `; color:${adapter.config.defColor}` : ''}">`;
            }
            result.suffix += `<span class='icalNormal2 iCal-${calName}2'>`;
        } else {
            // If configured every calendar has own color
            if (adapter.config.everyCalOneColor) {
                result.suffix += `<span style="font-weight: normal${col ? `; color:${col}` : ''}">`;
            } else {
                result.suffix += `<span style="font-weight: normal${adapter.config.defColor ? `; color:${adapter.config.defColor}` : ''}">`;
            }
            result.suffix += `<span class='icalNormal2 iCal-${calName}2'>`;
        }
    }
    result.prefix = result.prefix.substring(0, result.prefix.length - 2);
    result.prefix += ` iCal-${calName}">`;
    return result;
}

async function checkForEvents(reason, event, realnow) {
    const ignoreCaseInEventname = adapter.config.ignoreCaseInEventname;
    const exactMatchInEventname = adapter.config.exactMatchInEventname;
    // show unknown events
    let result = true;
    let today = new Date(realnow.getTime());
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today.getTime());
    tomorrow.setDate(today.getDate() + 1);

    // check if event exists in table
    for (let i = 0; i < events.length; i++) {
        const ev = events[i];
        let evFound = false;
        if (exactMatchInEventname) {
            // calendar entry must be exactly the same as the event
            if (reason === ev.name || (ignoreCaseInEventname && reason.toLowerCase() === ev.name.toLowerCase())) {
                evFound = true;
            }
        } else {
            // event is included in the calendar entry
            if (
                reason.includes(ev.name) ||
                (ignoreCaseInEventname && reason.toLowerCase().includes(ev.name.toLowerCase()))
            ) {
                evFound = true;
            }
        }
        if (evFound) {
            // check if event should shown
            result = ev.display;
            adapter.log.debug(`found event in table: ${ev.name}, day=${ev.day}`);

            const inXDays = new Date(today.getTime());
            inXDays.setDate(today.getDate() + ev.day);
            const inXDaysPlusOne = new Date(today.getTime());
            inXDaysPlusOne.setDate(today.getDate() + ev.day + 1);
            // If full day event
            // Follow processing only if event is today
            if (
                ((!ev.type || ev.type === 'today') &&
                    event.end.getTime() > inXDays.getTime() &&
                    event.start.getTime() < inXDaysPlusOne.getTime()) ||
                (ev.type === 'now' && event.start <= realnow && realnow <= event.end) ||
                (ev.type === 'later' && event.start > realnow && event.start.getTime() < tomorrow.getTime())
            ) {
                adapter.log.debug(
                    `${ev.type ? ev.type : `day ${ev.day}`} Event with time: ${event.start} ${realnow} ${event.end}`,
                );

                // If yet processed
                if (ev.processed) {
                    // nothing to do
                    adapter.log.debug(`Event ${ev.name} already processed`);
                } else {
                    adapter.log.debug(
                        `Checking event ${ev.day} ${ev.type}  ${ev.name} = ${ev.processed}, state = ${ev.state}`,
                    );
                    // Process event
                    ev.processed = true;
                    if (!ev.state) {
                        ev.state = true;
                        const name = `events.${ev.day}.${ev.type ? `${ev.type}.` : ''}${shrinkStateName(ev.name)}`;
                        adapter.log.info(`Set ${name} to true`);
                        await adapter.setStateAsync(name, { val: true, ack: true });
                        if (ev.id) {
                            await setState(ev.id, ev.on, ev.ack);
                        }
                    }
                }
            }
        }
    }
    return result;
}

function initEvent(name, display, day, type, id, on, off, ack, callback) {
    const obj = {
        name,
        processed: false,
        state: null,
        display,
        day,
        type,
    };

    if (type === 'now' && id) {
        obj.id = id;
        obj.off = off;
        obj.on = on;

        if (typeof ack !== 'boolean') {
            // backward compatibility
            ack = true;
        } else {
            ack = !!ack;
        }

        obj.ack = ack;
    }

    events.push(obj);

    const stateName = `events.${day}.${type ? `${type}.` : ''}${shrinkStateName(name)}`;

    adapter.getState(stateName, async (err, state) => {
        if (err || !state) {
            obj.state = false;
            await adapter.setStateAsync(stateName, { val: false, ack: true });
            await setState(id, off, ack);
            callback && callback(name);
        } else {
            obj.state = state.val;
            callback && callback(name);
        }
    });
}

function removeNameSpace(id) {
    const re = new RegExp(`${adapter.namespace}*.`, 'g');
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
    adapter.getStatesOf('', 'events', async (err, states) => {
        if (stopped) {
            return;
        }
        const toAdd = [];
        const toDel = [];

        if (states) {
            // Add "to delete" all existing events
            for (let j = 0; j < states.length; j++) {
                toDel.push({ id: removeNameSpace(states[j]._id), name: states[j].common.name });
            }
        }

        // Add "to add" all configured events
        for (let i = 0; i < adapter.config.events.length; i++) {
            for (let day = 0; day < days; day++) {
                const name = adapter.config.events[i].name;
                if (!day) {
                    toAdd.push({ id: `events.${day}.later.${shrinkStateName(name)}`, name: name });
                    toAdd.push({ id: `events.${day}.today.${shrinkStateName(name)}`, name: name });
                    toAdd.push({ id: `events.${day}.now.${shrinkStateName(name)}`, name: name });
                } else {
                    toAdd.push({ id: `events.${day}.${shrinkStateName(name)}`, name: name });
                }
            }
        }

        if (states) {
            function removeFromToDel(day, name) {
                const pos_ = toDel.indexOf(toDel.find(x => x.id === `events.${day}.${name}`));
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
                                removeFromToDel(`${day}.today`, name);
                                removeFromToDel(`${day}.now`, name);
                                removeFromToDel(`${day}.later`, name);
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
                        if (
                            states[j].common.name === event.name &&
                            ((day > 0 && removeNameSpace(states[j]._id) === `events.${day}.${name}`) ||
                                (!day &&
                                    (removeNameSpace(states[j]._id) === `events.${day}.today.${name}` ||
                                        removeNameSpace(states[j]._id) === `events.${day}.now.${name}` ||
                                        removeNameSpace(states[j]._id) === `events.${day}.later.${name}`)))
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
                            if (
                                states[j].native &&
                                states[j].native.enabled === event.enabled &&
                                states[j].native.display === event.display
                            ) {
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
                    if (configItem.enabled === 'true') {
                        configItem.enabled = true;
                    }
                    if (configItem.enabled === 'false') {
                        configItem.enabled = false;
                    }
                    if (configItem.display === 'true') {
                        configItem.display = true;
                    }
                    if (configItem.display === 'false') {
                        configItem.display = false;
                    }

                    // Add or update state
                    try {
                        const id = await adapter.setObjectAsync(toAdd[i].id, {
                            type: 'state',
                            common: {
                                name: toAdd[i].name,
                                type: 'boolean',
                                role: 'indicator',
                            },
                            native: {
                                enabled: configItem.enabled,
                                display: configItem.display,
                            },
                        });
                        adapter.log.info(`Event "${id.id}" created`);
                    } catch (err) {
                        adapter.log.warn(`Event "${toAdd[i].id}" could ne be created: ${err}`);
                    }
                }
            }
        }

        // Remove states
        for (let i = 0; i < toDel.length; i++) {
            await adapter.delObjectAsync(toDel[i].id);
            await adapter.delStateAsync(toDel[i].id);
        }

        for (let day = 0; day < days; day++) {
            for (let i = 0; i < adapter.config.events.length; i++) {
                const event = adapter.config.events[i];
                // If event enabled add it to list
                if (event.enabled) {
                    if (!day) {
                        count += 3;
                        initEvent(
                            event.name,
                            event.display,
                            0,
                            'today',
                            null,
                            null,
                            null,
                            null,
                            () => !--count && callback(),
                        );
                        initEvent(
                            event.name,
                            event.display,
                            0,
                            'now',
                            event.id,
                            event.on,
                            event.off,
                            event.ack,
                            () => !--count && callback(),
                        );
                        initEvent(
                            event.name,
                            event.display,
                            0,
                            'later',
                            null,
                            null,
                            null,
                            null,
                            () => !--count && callback(),
                        );
                    } else {
                        count++;
                        initEvent(
                            event.name,
                            event.display,
                            day,
                            null,
                            null,
                            null,
                            null,
                            null,
                            () => !--count && callback(),
                        );
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
            if (!item) {
                continue;
            }
            if (prep) {
                prep += '|';
            }
            prep += `(${item})`;
        }
        if (prep) {
            prep = `/${prep}/g`;
        }
    }

    if (prep) {
        try {
            const s = prep.split('/');
            ret = new RegExp(s[1], s[2]);
        } catch {
            adapter.log.error(`invalid filter: ${prep}`);
        }
    }

    return ret;
}

// Read all calendar
function readAll() {
    datesArray = [];
    let count = 0;
    let errCnt = 0;

    // Set all events as not processed
    for (let j = 0; j < events.length; j++) {
        events[j].processed = false;
    }

    if (adapter.config.calendars) {
        // add own instance, needed if calendars are quickly read
        for (let i = 0; i < adapter.config.calendars.length; i++) {
            if (adapter.config.calendars[i].url) {
                count++;
                adapter.log.debug(
                    `reading calendar from URL: ${adapter.config.calendars[i].url}, color: ${adapter.config.calendars[i].color}`,
                );
                checkICal(
                    adapter.config.calendars[i].url,
                    adapter.config.calendars[i].user,
                    adapter.config.calendars[i].pass,
                    adapter.config.calendars[i].sslignore,
                    adapter.config.calendars[i].name,
                    buildFilter(adapter.config.calendars[i].filter, adapter.config.calendars[i].filterregex),
                    err => {
                        if (err) {
                            errCnt++;
                        }
                        // If all calendars are processed
                        if (!--count) {
                            if (errCnt === adapter.config.calendars.length) {
                                adapter.log.info('All calenders could not be processed, Do not clean up events');
                                killTimeout && clearTimeout(killTimeout);
                                killTimeout = setTimeout(() => {
                                    killTimeout = null;
                                    adapter.stop();
                                }, 5000);
                                return;
                            }
                            adapter.log.debug('displaying dates because of callback');
                            displayDates();
                        }
                    },
                );
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
    checkICal(url, err => {
        if (err) {
            adapter.log.info('Calender could not be processed, Do not clean up events.');
            killTimeout && clearTimeout(killTimeout);
            killTimeout = setTimeout(() => {
                killTimeout = null;
                adapter.stop();
            }, 5000);
            return;
        }
        displayDates();
    });
}

function formatDate(_date, _end, withTime, fullDay) {
    let day = _date.getDate();
    let month = _date.getMonth() + 1;
    let year = _date.getFullYear();

    const endday = _end.getDate();
    const endmonth = _end.getMonth() + 1;
    const endyear = _end.getFullYear();
    let _time = '';
    const now = new Date();
    const alreadyStarted = _date < now && _end > now;
    const arrowAlreadyStarted = adapter.config.arrowAlreadyStarted;

    if (withTime) {
        let hours = _date.getHours();
        let minutes = _date.getMinutes();

        if (adapter.config.fulltime && fullDay) {
            _time = ` ${adapter.config.fulltime}`;
        } else {
            if (!alreadyStarted) {
                if (adapter.config.dataPaddingWithZeros) {
                    if (hours < 10) {
                        hours = `0${hours.toString()}`;
                    }
                }
                if (minutes < 10) {
                    minutes = `0${minutes.toString()}`;
                }
                _time = ` ${hours}:${minutes}`;
            }
            let timeDiff = treatAsUTC(_end.getTime()) - treatAsUTC(_date.getTime());
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
                    endHours = `0${endHours.toString()}`;
                }
                if (endMinutes < 10) {
                    endMinutes = `0${endMinutes.toString()}`;
                }
                _time += `${endHours}:${endMinutes}`;

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
                    timeDiff = treatAsUTC(_end.getTime()) - treatAsUTC(start.getTime());
                    adapter.log.debug(
                        `    time difference: ${timeDiff} (${_date}-${_end} / ${start}) --> ${timeDiff / (24 * 60 * 60 * 1000)}`,
                    );
                    if (fullTimeDiff >= 24 * 60 * 60 * 1000) {
                        _time += `+${Math.floor(timeDiff / (24 * 60 * 60 * 1000))}`;
                    }
                } else if (adapter.config.replaceDates && _end.getHours() === 0 && _end.getMinutes() === 0) {
                    _time = ' ';
                }
            }
        }
    }
    let _class = '';
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    const d2 = new Date();
    d2.setDate(d.getDate() + 1);
    let todayOnly = false;
    if (
        day === d.getDate() &&
        month === d.getMonth() + 1 &&
        year === d.getFullYear() &&
        endday === d2.getDate() &&
        endmonth === d2.getMonth() + 1 &&
        endyear === d2.getFullYear() &&
        fullDay
    ) {
        todayOnly = true;
    }
    adapter.log.debug(`    todayOnly = ${todayOnly}: (${_date}-${_end}), alreadyStarted=${alreadyStarted}`);

    if (todayOnly || !alreadyStarted || (!arrowAlreadyStarted && !adapter.config.replaceDates)) {
        if (alreadyStarted) {
            _class = 'ical_today';
        }

        if (day === d.getDate() && month === d.getMonth() + 1 && year === d.getFullYear()) {
            _class = 'ical_today';
        }

        d.setDate(d.getDate() + 1);
        if (day === d.getDate() && month === d.getMonth() + 1 && year === d.getFullYear()) {
            _class = 'ical_tomorrow';
        }

        d.setDate(d.getDate() + 1);
        if (day === d.getDate() && month === d.getMonth() + 1 && year === d.getFullYear()) {
            _class = 'ical_dayafter';
        }

        d.setDate(d.getDate() + 1);
        if (day === d.getDate() && month === d.getMonth() + 1 && year === d.getFullYear()) {
            _class = 'ical_3days';
        }

        d.setDate(d.getDate() + 1);
        if (day === d.getDate() && month === d.getMonth() + 1 && year === d.getFullYear()) {
            _class = 'ical_4days';
        }

        d.setDate(d.getDate() + 1);
        if (day === d.getDate() && month === d.getMonth() + 1 && year === d.getFullYear()) {
            _class = 'ical_5days';
        }

        d.setDate(d.getDate() + 1);
        if (day === d.getDate() && month === d.getMonth() + 1 && year === d.getFullYear()) {
            _class = 'ical_6days';
        }

        d.setDate(d.getDate() + 1);
        if (day === d.getDate() && month === d.getMonth() + 1 && year === d.getFullYear()) {
            _class = 'ical_oneweek';
        }
        if (adapter.config.replaceDates) {
            if (_class === 'ical_today') {
                return {
                    text: `${arrowAlreadyStarted && alreadyStarted && !todayOnly ? '&#8594; ' : ''}${_('today')}${_time}`,
                    _class: _class,
                };
            }
            if (_class === 'ical_tomorrow') {
                return {
                    text: `${arrowAlreadyStarted && alreadyStarted ? '&#8594; ' : ''}${_('tomorrow')}${_time}`,
                    _class: _class,
                };
            }
            if (_class === 'ical_dayafter') {
                return {
                    text: `${arrowAlreadyStarted && alreadyStarted ? '&#8594; ' : ''}${_('dayafter')}${_time}`,
                    _class: _class,
                };
            }
            if (_class === 'ical_3days') {
                return {
                    text: `${arrowAlreadyStarted && alreadyStarted ? '&#8594; ' : ''}${_('3days')}${_time}`,
                    _class: _class,
                };
            }
            if (_class === 'ical_4days') {
                return {
                    text: `${arrowAlreadyStarted && alreadyStarted ? '&#8594; ' : ''}${_('4days')}${_time}`,
                    _class: _class,
                };
            }
            if (_class === 'ical_5days') {
                return {
                    text: `${arrowAlreadyStarted && alreadyStarted ? '&#8594; ' : ''}${_('5days')}${_time}`,
                    _class: _class,
                };
            }
            if (_class === 'ical_6days') {
                return {
                    text: `${arrowAlreadyStarted && alreadyStarted ? '&#8594; ' : ''}${_('6days')}${_time}`,
                    _class: _class,
                };
            }
            if (_class === 'ical_oneweek') {
                return {
                    text: `${arrowAlreadyStarted && alreadyStarted ? '&#8594; ' : ''}${_('oneweek')}${_time}`,
                    _class: _class,
                };
            }
        }
    } else {
        // check if date is in the past and if so we show the end time instead
        _class = 'ical_today';
        const dateDiff = treatAsUTC(_end.getTime()) - treatAsUTC(Date.now());
        let daysleft = Math.round(dateDiff / (1000 * 60 * 60 * 24));
        const hoursleft = Math.round(dateDiff / (1000 * 60 * 60));
        const minutesleft = Math.round(dateDiff / (1000 * 60));

        adapter.log.debug(`    time difference: ${daysleft}/${hoursleft}/${minutesleft} (${_date}-${_end})`);
        if (adapter.config.forceFullday && daysleft < 1) {
            daysleft = 1;
        }

        let text;
        if (adapter.config.replaceDates) {
            const _left = _('left') !== ' ' ? ` ${_('left')}` : '';
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
                        text = `${_('still') !== ' ' ? _('still') : ''} ${daysleft} ${_('day')}${_left}`;
                    } else if (cc > 1 && (c > 1 || c < 5)) {
                        text = `${_('still') !== ' ' ? _('still') : ''} ${daysleft} дня${_left}`;
                    } else {
                        text = `${_('still') !== ' ' ? _('still') : ''} ${daysleft} ${_('days')}${_left}`;
                    }
                } else {
                    text = `${_('still') !== ' ' ? _('still') : ''} ${daysleft} ${daysleft === 1 ? _('day') : _('days')}${_left}`;
                }
            } else if (hoursleft >= 1) {
                if (adapter.config.language === 'ru') {
                    const c = hoursleft % 10;
                    const cc = Math.floor(hoursleft / 10) % 10;
                    if (hoursleft === 1) {
                        text = `${_('still') !== ' ' ? _('still') : ''} ${hoursleft} ${_('hour')}${_left}`;
                    } else if (cc !== 1 && (c > 1 || c < 5)) {
                        text = `${_('still') !== ' ' ? _('still') : ''} ${hoursleft} часа${_left}`;
                    } else {
                        text = `${_('still') !== ' ' ? _('still') : ''} ${hoursleft} ${_('hours')}${_left}`;
                    }
                } else {
                    text = `${_('still') !== ' ' ? _('still') : ''} ${hoursleft} ${hoursleft === 1 ? _('hour') : _('hours')}${_left}`;
                }
            } else {
                //if (adapter.config.language === 'ru') {
                // Todo: Russian
                //} else {
                text = `${_('still') !== ' ' ? _('still') : ''} ${minutesleft} ${minutesleft === 1 ? _('minute') : _('minutes')}${_left}`;
                //}
            }
        } else {
            if (_end.getHours() === 0 && _end.getMinutes() === 0 && _end.getSeconds() === 0 && fullDay) {
                const secondBeforeEnd = new Date(_end.getTime());
                secondBeforeEnd.setSeconds(secondBeforeEnd.getSeconds() - 1);
                day = secondBeforeEnd.getDate();
                month = secondBeforeEnd.getMonth() + 1;
                year = secondBeforeEnd.getFullYear();
                adapter.log.debug(`Adjust enddate to exclude 0:0:0 end: ${secondBeforeEnd.toString()}`);
            } else {
                day = _end.getDate();
                month = _end.getMonth() + 1;
                year = _end.getFullYear();
            }

            if (adapter.config.dataPaddingWithZeros) {
                if (day < 10) {
                    day = `0${day.toString()}`;
                }
                if (month < 10) {
                    month = `0${month.toString()}`;
                }
            }

            text = `${arrowAlreadyStarted ? '&#8594; ' : ''}${day}.${month}.`;
            if (!adapter.config.hideYear) {
                text += year;
            }

            if (withTime) {
                if (adapter.config.fulltime && fullDay) {
                    text += ` ${adapter.config.fulltime}`;
                } else {
                    let endhours = _end.getHours();
                    let endminutes = _end.getMinutes();
                    if (adapter.config.dataPaddingWithZeros) {
                        if (endhours < 10) {
                            endhours = `0${endhours.toString()}`;
                        }
                    }
                    if (endminutes < 10) {
                        endminutes = `0${endminutes.toString()}`;
                    }
                    text += ` ${endhours}:${endminutes}`;
                }
            }
        }

        return { text: text, _class: _class };
    }

    if (adapter.config.dataPaddingWithZeros) {
        if (day < 10) {
            day = `0${day.toString()}`;
        }
        if (month < 10) {
            month = `0${month.toString()}`;
        }
    }

    return {
        text: `${day}.${month}${adapter.config.hideYear ? '.' : `.${year}`}${_time}`,
        _class: _class,
    };
}

async function setState(id, val, ack, cb) {
    if (id) {
        try {
            const obj = await adapter.getForeignObjectAsync(id);
            if (obj) {
                // convert value
                if (obj.common) {
                    if (val === 'null' || val === null || val === undefined) {
                        val = null;
                    } else {
                        if (obj.common.type === 'boolean') {
                            val = val === true || val === 'true' || val === 1 || val === '1';
                        } else if (obj.common.type === 'number') {
                            val = parseFloat(val);
                        } else if (obj.common.type === 'string') {
                            val = val.toString();
                        }
                    }
                }

                adapter.log.info(`Set ${id} to ${val} with ack=${ack}`);
                await adapter.setForeignStateAsync(id, val, ack);
            }
        } catch {
            // Ignore error
        }
    }
    cb && cb();
}

// Show event as text
async function displayDates() {
    if (stopped) {
        return;
    }

    let todayEventCounter = 0;
    let tomorrowEventCounter = 0;
    let yesterdayEventCounter = 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTime = today.getTime();

    const tomorrow = new Date(todayTime);
    tomorrow.setDate(today.getDate() + 1);
    const yesterday = new Date(todayTime);
    yesterday.setDate(today.getDate() - 1);

    const dayAfterTomorrow = new Date(todayTime);
    dayAfterTomorrow.setDate(today.getDate() + 2);
    //const dayBeforeYesterday = new Date(yesterday.getTime() - oneDay);

    if (datesArray.length) {
        for (let t = 0; t < datesArray.length; t++) {
            if (datesArray[t]._end.getTime() > todayTime && datesArray[t]._date.getTime() < tomorrow.getTime()) {
                adapter.log.debug(`displayDates: TODAY     - ${datesArray[t].event} (${datesArray[t]._date})`);
                todayEventCounter++;
            }
            if (
                datesArray[t]._end.getTime() > tomorrow.getTime() &&
                datesArray[t]._date.getTime() < dayAfterTomorrow.getTime()
            ) {
                adapter.log.debug(`displayDates: TOMORROW  - ${datesArray[t].event} (${datesArray[t]._date})`);
                tomorrowEventCounter++;
            }
            if (datesArray[t]._end.getTime() > yesterday.getTime() && datesArray[t]._date.getTime() < todayTime) {
                adapter.log.debug(`displayDates: YESTERDAY - ${datesArray[t].event} (${datesArray[t]._date})`);
                yesterdayEventCounter++;
            }
        }

        adapter.log.debug(`Dates array (data.table): ${JSON.stringify(datesArray)}`);

        await adapter.setStateAsync('data.table', { val: JSON.stringify(datesArray), ack: true });
        await adapter.setStateAsync('data.html', { val: brSeparatedList(datesArray), ack: true });
        await adapter.setStateAsync('data.text', { val: crlfSeparatedList(datesArray), ack: true });
    } else {
        await adapter.setStateAsync('data.table', { val: '[]', ack: true });
        await adapter.setStateAsync('data.html', { val: '', ack: true });
        await adapter.setStateAsync('data.text', { val: '', ack: true });
    }

    await adapter.setStateAsync('data.count', { val: todayEventCounter, ack: true });
    await adapter.setStateAsync('data.countTomorrow', { val: tomorrowEventCounter, ack: true });
    await adapter.setStateAsync('data.countYesterday', { val: yesterdayEventCounter, ack: true });

    // set not processed events to false
    for (let j = 0; j < events.length; j++) {
        adapter.log.debug(
            `Checking unprocessed event ${events[j].day} ${events[j].type} ${events[j].name} = ${events[j].processed}, state = ${events[j].state}`,
        );
        if (!events[j].processed && events[j].state) {
            const ev = events[j];
            ev.state = false;
            // Set to false
            const name = `events.${ev.day}.${ev.type ? `${ev.type}.` : ''}${shrinkStateName(ev.name)}`;
            adapter.log.info(`Set ${name} to false`);
            await adapter.setStateAsync(name, { val: false, ack: true });
            await setState(ev.id, ev.off, ev.ack);
        }
    }

    killTimeout && clearTimeout(killTimeout);
    killTimeout = setTimeout(() => {
        killTimeout = null;
        adapter.stop();
    }, 5000);
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
                for (let i = 0; i < arr.length - 1; i++) {
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
    let text = '';
    const today = new Date();
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

        let apptmBlock = '';
        let apptmColor = color;

        if (datesArray[i]._object && datesArray[i]._object['color'] !== undefined) {
            apptmColor = datesArray[i]._object['color'];
        }

        if (adapter.config.addColorBox) {
            apptmBlock = `<span style="background: ${apptmColor};">&nbsp;&nbsp;&nbsp;&nbsp;</span>&nbsp;`;
        }

        const xfix = colorizeDates(datesArray[i]._date, today, tomorrow, dayAfter, color, datesArray[i]._calName);

        if (text) {
            text += '<br/>\n';
        }
        text += `${xfix.prefix + apptmBlock + date.text + xfix.suffix} ${datesArray[i].event}</span>${adapter.config.colorize ? '</span>' : ''}`;
    }

    return text;
}

function crlfSeparatedList(datesArray) {
    let text = '';
    const today = new Date();
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
        text += `${date.text} ${datesArray[i].event} ${datesArray[i].location}`;
    }

    return text;
}

function main() {
    normal = `<span style="font-weight: bold${adapter.config.defColor ? `; color: ${adapter.config.defColor}` : ''}"><span class="icalNormal">`;

    adapter.config.language = adapter.config.language || 'en';
    adapter.config.daysPast = parseInt(adapter.config.daysPast) || 0;

    const helpFilePath = '/UPLOAD_FILES_HERE.txt';
    adapter.fileExistsAsync(adapter.namespace, helpFilePath).then(fileExists => {
        if (!fileExists) {
            adapter.writeFileAsync(adapter.namespace, helpFilePath, 'Place your *.ics files in this directory');
        }
    });

    adapter.delObjectAsync('trigger'); // removed deprecated subscribe state (created in previous versions)

    syncUserEvents(readAll);
}

// If started as allInOne/compact mode => return function to create instance
if (module && module.parent) {
    module.exports = startAdapter;
} else {
    // or start the instance directly
    startAdapter();
}
