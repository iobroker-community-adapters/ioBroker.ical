'use strict';

const fs = require('node:fs');
const { newDate } = require('./setupDate');

const fileName = __dirname + '/../data/past.ics';

module.exports.getInstanceConfig = function() {
    return {
        native: {
            daysPreview: 7,
            daysPast: 2,
            fulltime: '',
            replaceDates: false,
            hideYear: true,
            calendars: [
                {
                    name: 'calendar-past',
                    url: fileName,
                    user: '',
                    pass: '',
                    sslignore: 'ignore',
                    color: 'orange'
                }
            ],
            events: []
        }
    };
};

module.exports.setup = function () {
    if (fs.existsSync(fileName)) {
        fs.unlinkSync(fileName);
    }

    // five days ago - outside of the configured past window
    const dOut = newDate().minus({day: 5});

    // yesterday - inside of the configured past window
    const dPast = newDate().minus({day: 1});

    // today
    const dToday = newDate();

    // tomorrow
    const dNext = newDate().plus({day: 1});

    const date = d => d.toFormat('yyyyMMdd');

    let data = fs.readFileSync(__dirname + '/../data/calender_head_template.ics').toString();

    data += 'X-WR-CALNAME:Integration Test Calendar\n';
    data += 'X-WR-TIMEZONE:' + dToday.zoneName + '\n';

    // event with time, already over and outside of the past window
    data += 'BEGIN:VEVENT\n';
    data += 'DTSTART:' + date(dOut) + 'T100000\n';
    data += 'DTEND:' + date(dOut) + 'T110000\n';
    data += 'DTSTAMP:20111213T124028Z\n';
    data += 'UID:8ab00ad3a214f7369e7a95f01@calendarlabs.com\n';
    data += 'CREATED:20111213T123901Z\n';
    data += 'DESCRIPTION:TooOldEvent\n';
    data += 'LAST-MODIFIED:20111213T123901Z\n';
    data += 'LOCATION:\n';
    data += 'SEQUENCE:0\n';
    data += 'STATUS:CONFIRMED\n';
    data += 'SUMMARY:TooOldEvent\n';
    data += 'TRANSP:OPAQUE\n';
    data += 'END:VEVENT\n';

    // fullday event of yesterday
    data += 'BEGIN:VEVENT\n';
    data += 'DTSTART;VALUE=DATE:' + date(dPast) + '\n';
    data += 'DTEND;VALUE=DATE:' + date(dToday) + '\n';
    data += 'DTSTAMP:20111213T124028Z\n';
    data += 'UID:8ab00ad3a214f7369e7a95f02@calendarlabs.com\n';
    data += 'CREATED:20111213T123901Z\n';
    data += 'DESCRIPTION:PastFulldayEvent\n';
    data += 'LAST-MODIFIED:20111213T123901Z\n';
    data += 'LOCATION:\n';
    data += 'SEQUENCE:0\n';
    data += 'STATUS:CONFIRMED\n';
    data += 'SUMMARY:PastFulldayEvent\n';
    data += 'TRANSP:TRANSPARENT\n';
    data += 'END:VEVENT\n';

    // event with time of yesterday, already over but inside of the past window
    data += 'BEGIN:VEVENT\n';
    data += 'DTSTART:' + date(dPast) + 'T100000\n';
    data += 'DTEND:' + date(dPast) + 'T110000\n';
    data += 'DTSTAMP:20111213T124028Z\n';
    data += 'UID:8ab00ad3a214f7369e7a95f03@calendarlabs.com\n';
    data += 'CREATED:20111213T123901Z\n';
    data += 'DESCRIPTION:PastTimedEvent\n';
    data += 'LAST-MODIFIED:20111213T123901Z\n';
    data += 'LOCATION:\n';
    data += 'SEQUENCE:0\n';
    data += 'STATUS:CONFIRMED\n';
    data += 'SUMMARY:PastTimedEvent\n';
    data += 'TRANSP:OPAQUE\n';
    data += 'END:VEVENT\n';

    // event with time of tomorrow
    data += 'BEGIN:VEVENT\n';
    data += 'DTSTART:' + date(dNext) + 'T100000\n';
    data += 'DTEND:' + date(dNext) + 'T110000\n';
    data += 'DTSTAMP:20111213T124028Z\n';
    data += 'UID:8ab00ad3a214f7369e7a95f04@calendarlabs.com\n';
    data += 'CREATED:20111213T123901Z\n';
    data += 'DESCRIPTION:FutureTimedEvent\n';
    data += 'LAST-MODIFIED:20111213T123901Z\n';
    data += 'LOCATION:\n';
    data += 'SEQUENCE:0\n';
    data += 'STATUS:CONFIRMED\n';
    data += 'SUMMARY:FutureTimedEvent\n';
    data += 'TRANSP:OPAQUE\n';
    data += 'END:VEVENT\n';

    data += 'END:VCALENDAR\n';

    fs.writeFileSync(fileName, data);
};
