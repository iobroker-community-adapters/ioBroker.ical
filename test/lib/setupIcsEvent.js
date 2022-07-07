'use strict';

const fs = require('fs');
const { newDate } = require('./setupDate');

const fileName = __dirname + '/../data/event.ics';

module.exports.getInstanceConfig = function() {
    return {
        native: {
            daysPreview: 2,
            daysPast: 0,
            fulltime: '',
            replaceDates: false,
            hideYear: true,
            calendars: [
                {
                    name: 'calendar-event',
                    url: fileName,
                    user: '',
                    pass: '',
                    sslignore: 'ignore',
                    color: 'red'
                }
            ],
            events: [
                {
                    name: 'EventThreeDays',
                    enabled: true,
                    display: false
                },
                {
                    name: 'Event Now',
                    enabled: true,
                    display: true
                },
                {
                    name: 'EventDisabled',
                    enabled: false,
                    display: true
                },
                {
                    name: 'EventLater',
                    enabled: true,
                    display: true
                },
                {
                    name: 'EventNextDay1',
                    enabled: true,
                    display: true
                },
                {
                    name: 'EventNextDay2',
                    enabled: true,
                    display: true
                },
                {
                    name: 'EventNextDay3',
                    enabled: true,
                    display: true
                }
            ]
        }
    };
};

module.exports.setup = function () {
    if (fs.existsSync(fileName)) {
        fs.unlinkSync(fileName);
    }

    const now = newDate();

    const last5Min = now.minus({minute: 5});
    const next5Min = now.plus({minute: 5});
    const next10Min = now.plus({minute: 10});
    const next11Min = now.plus({minute: 11});

    const nextDay = now.plus({day: 1}).set({ hour: 0, minute: 0, second: 0 });
    const nextDay1 = nextDay.plus({day: 1});
    const nextDay2 = nextDay.plus({day: 2});
    const nextDay3 = nextDay.plus({day: 3});
    const nextDay4 = nextDay.plus({day: 4});
    const nextDay5 = nextDay.plus({day: 5});
    const yesterday = nextDay.minus({day: 1});

    const last5MinT = last5Min.toFormat('yyyyMMdd\'T\'HHmmss');
    const next5MinT = next5Min.toFormat('yyyyMMdd\'T\'HHmmss');
    const next10MinT = next10Min.toFormat('yyyyMMdd\'T\'HHmmss');
    const next11MinT = next11Min.toFormat('yyyyMMdd\'T\'HHmmss');
    const nextDayT = nextDay.toFormat('yyyyMMdd');
    const nextDayT1 = nextDay1.toFormat('yyyyMMdd');
    const nextDayT2 = nextDay2.toFormat('yyyyMMdd');
    const nextDayT3 = nextDay3.toFormat('yyyyMMdd');
    const nextDayT4 = nextDay4.toFormat('yyyyMMdd');
    const nextDayT5 = nextDay5.toFormat('yyyyMMdd');
    const yesterdayT = yesterday.toFormat('yyyyMMdd');

    let data = fs.readFileSync(__dirname + '/../data/calender_head_template.ics').toString();

    data += 'X-WR-CALNAME:Integration Test Calendar\n';
    data += 'X-WR-TIMEZONE:' + now.zoneName + '\n';

    // EventThreeDays
    data += 'BEGIN:VEVENT\n';
    data += 'DTSTART;VALUE=DATE:' + yesterdayT + '\n';
    data += 'DTEND;VALUE=DATE:' + nextDayT1 + '\n';
    data += 'DTSTAMP:20111213T124028Z\n';
    data += 'UID:2fb00ad3a214f7369e7a95f5261@calendarlabs.com\n';
    data += 'CREATED:20111213T123901Z\n';
    data += 'DESCRIPTION:EventThreeDays\n';
    data += 'LAST-MODIFIED:20111213T123901Z\n';
    data += 'LOCATION:\n';
    data += 'SEQUENCE:0\n';
    data += 'STATUS:CONFIRMED\n';
    data += 'SUMMARY:EventThreeDays\n';
    data += 'TRANSP:TRANSPARENT\n';
    data += 'END:VEVENT\n';

    // Event Now (space will be trimmed, because it's an invalid character)
    data += 'BEGIN:VEVENT\n';
    data += 'DTSTART:' + last5MinT + '\n';
    data += 'DTEND:' + next5MinT + '\n';
    data += 'DTSTAMP:20111213T124028Z\n';
    data += 'UID:2fb00ad3a214f7369e7a95f561@calendarlabs.com\n';
    data += 'CREATED:20111213T123901Z\n';
    data += 'DESCRIPTION:Event Now\n';
    data += 'LAST-MODIFIED:20111213T123901Z\n';
    data += 'LOCATION:\n';
    data += 'SEQUENCE:0\n';
    data += 'STATUS:CONFIRMED\n';
    data += 'SUMMARY:Event Now\n';
    data += 'TRANSP:TRANSPARENT\n';
    data += 'END:VEVENT\n';

    // EventDisabled
    data += 'BEGIN:VEVENT\n';
    data += 'DTSTART:' + last5MinT + '\n';
    data += 'DTEND:' + next5MinT + '\n';
    data += 'DTSTAMP:20111213T124028Z\n';
    data += 'UID:2fb00ad3a214f7369e7a95f562@calendarlabs.com\n';
    data += 'CREATED:20111213T123901Z\n';
    data += 'DESCRIPTION:EventDisabled\n';
    data += 'LAST-MODIFIED:20111213T123901Z\n';
    data += 'LOCATION:\n';
    data += 'SEQUENCE:0\n';
    data += 'STATUS:CONFIRMED\n';
    data += 'SUMMARY:EventDisabled\n';
    data += 'TRANSP:TRANSPARENT\n';
    data += 'END:VEVENT\n';

    // EventLater
    data += 'BEGIN:VEVENT\n';
    data += 'DTSTART:' + next10MinT + '\n';
    data += 'DTEND:' + next11MinT + '\n';
    data += 'DTSTAMP:20111213T124028Z\n';
    data += 'UID:2fb00ad3a214f7369e7a95f563@calendarlabs.com\n';
    data += 'CREATED:20111213T123901Z\n';
    data += 'DESCRIPTION:EventLater\n';
    data += 'LAST-MODIFIED:20111213T123901Z\n';
    data += 'LOCATION:\n';
    data += 'SEQUENCE:0\n';
    data += 'STATUS:CONFIRMED\n';
    data += 'SUMMARY:EventLater\n';
    data += 'TRANSP:TRANSPARENT\n';
    data += 'END:VEVENT\n';

    // EventNextDay1
    data += 'BEGIN:VEVENT\n';
    data += 'DTSTART;VALUE=DATE:' + nextDayT + '\n';
    data += 'DTEND;VALUE=DATE:' + nextDayT1 + '\n';
    data += 'DTSTAMP:20111213T124028Z\n';
    data += 'UID:2fb00ad3a214f7369e7a95f642@calendarlabs.com\n';
    data += 'CREATED:20111213T123901Z\n';
    data += 'DESCRIPTION:EventNextDay1\n';
    data += 'LAST-MODIFIED:20111213T123901Z\n';
    data += 'LOCATION:\n';
    data += 'SEQUENCE:0\n';
    data += 'STATUS:CONFIRMED\n';
    data += 'SUMMARY:EventNextDay1\n';
    data += 'TRANSP:TRANSPARENT\n';
    data += 'END:VEVENT\n';

    // EventNextDay2
    data += 'BEGIN:VEVENT\n';
    data += 'DTSTART;VALUE=DATE:' + nextDayT1 + '\n';
    data += 'DTEND;VALUE=DATE:' + nextDayT2 + '\n';
    data += 'DTSTAMP:20111213T124028Z\n';
    data += 'UID:2fb00ad3a214f7369e7a95f625@calendarlabs.com\n';
    data += 'CREATED:20111213T123901Z\n';
    data += 'DESCRIPTION:EventNextDay2\n';
    data += 'LAST-MODIFIED:20111213T123901Z\n';
    data += 'LOCATION:\n';
    data += 'SEQUENCE:0\n';
    data += 'STATUS:CONFIRMED\n';
    data += 'SUMMARY:EventNextDay2\n';
    data += 'TRANSP:TRANSPARENT\n';
    data += 'END:VEVENT\n';

    // EventNextDay3
    data += 'BEGIN:VEVENT\n';
    data += 'DTSTART;VALUE=DATE:' + nextDayT2 + '\n';
    data += 'DTEND;VALUE=DATE:' + nextDayT3 + '\n';
    data += 'DTSTAMP:20111213T124028Z\n';
    data += 'UID:2fb00ad3a214f7369e7a95f626@calendarlabs.com\n';
    data += 'CREATED:20111213T123901Z\n';
    data += 'DESCRIPTION:EventNextDay3\n';
    data += 'LAST-MODIFIED:20111213T123901Z\n';
    data += 'LOCATION:\n';
    data += 'SEQUENCE:0\n';
    data += 'STATUS:CONFIRMED\n';
    data += 'SUMMARY:EventNextDay3\n';
    data += 'TRANSP:TRANSPARENT\n';
    data += 'END:VEVENT\n';

    data += 'END:VCALENDAR\n';

    fs.writeFileSync(fileName, data);
};