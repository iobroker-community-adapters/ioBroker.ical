'use strict';

const fs = require('node:fs');
const { newDate } = require('./setupDate');

const fileName = __dirname + '/../data/filter_regex.ics';

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
                    name: 'calendar-filter-regex',
                    url: fileName,
                    user: '',
                    pass: '',
                    sslignore: 'ignore',
                    color: 'red',
                    filter: '/(SUMMARY:.*)\\s*(DESCRIPTION:.*)\\s*(LOCATION:(?!Test-Filter-Location-4).*)/',
                    filterregex: true
                }
            ],
            events: [
                {
                    name: 'Vacation',
                    enabled: true,
                    display: false
                }
            ]
        }
    };
};

module.exports.setup = function () {
    if (fs.existsSync(fileName)) {
        fs.unlinkSync(fileName);
    }

    // tomorrow
    const d = newDate().plus({day: 1});
    const m = d.toFormat('MM');
    const day = d.toFormat('dd');

    let data = fs.readFileSync(__dirname + '/../data/calender_head_template.ics').toString();

    data += 'X-WR-CALNAME:Integration Test Calendar\n';
    data += 'X-WR-TIMEZONE:' + d.zoneName + '\n';

    // filtered by description
    data += 'BEGIN:VEVENT\n';
    data += 'CLASS:PUBLIC\n';
    data += 'DTEND;VALUE=DATE:' + d.toFormat('yyyy') + m + day + '\n';
    data += 'DTSTAMP:20181011T171553Z\n';
    data += 'DTSTART;VALUE=DATE:' + d.toFormat('yyyy') + m + day + '\n';
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
    data += 'DTEND;VALUE=DATE:' + d.toFormat('yyyy') + m + day + '\n';
    data += 'DTSTAMP:20181012T150122Z\n';
    data += 'DTSTART;VALUE=DATE:' + d.toFormat('yyyy') + m + day + '\n';
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
    data += 'DTEND;VALUE=DATE:' + d.toFormat('yyyy') + m + day + '\n';
    data += 'DTSTAMP:20181012T150122Z\n';
    data += 'DTSTART;VALUE=DATE:' + d.toFormat('yyyy') + m + day + '\n';
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
    data += 'DTEND;VALUE=DATE:' + d.toFormat('yyyy') + m + day + '\n';
    data += 'DTSTAMP:20181012T150122Z\n';
    data += 'DTSTART;VALUE=DATE:' + d.toFormat('yyyy') + m + day + '\n';
    data += 'PRIORITY:5\n';
    data += 'SEQUENCE:0\n';
    data += 'DESCRIPTION:Test-Filter-Description-4\n';
    data += 'LOCATION:Test-Filter-Location-4\n';
    data += 'SUMMARY:Test-Filter-Summary-4\n';
    data += 'TRANSP:TRANSPARENT\n';
    data += 'UID:ec1cbf54-1aae-44bc-8c23-b27668f2be30\n';
    data += 'END:VEVENT\n';

    data += 'END:VCALENDAR\n';

    fs.writeFileSync(fileName, data);
};