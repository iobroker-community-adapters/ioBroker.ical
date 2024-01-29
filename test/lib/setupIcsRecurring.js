'use strict';

const fs = require('fs');
const { DateTime } = require('luxon');

const fileName = __dirname + '/../data/recurring.ics';

module.exports.getInstanceConfig = function() {
    return {
        native: {
            daysPreview: 364,
            daysPast: 0,
            fulltime: '',
            replaceDates: false,
            hideYear: true,
            calendars: [
                {
                    name: 'calendar-recurring',
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

    const d0 = DateTime.local(2021, 3, 17); // Wendnesday
    const m0 = d0.toFormat('MM');
    const day0 = d0.toFormat('dd');

    let data = fs.readFileSync(__dirname + '/../data/calender_head_template.ics').toString();

    data += 'X-WR-CALNAME:Integration Test Calendar\n';
    data += 'X-WR-TIMEZONE:' + d0.zoneName + '\n';

    data += 'BEGIN:VEVENT\n';
    data += 'CREATED:20231226T123051Z\n';
    data += 'DTSTAMP:20231226T123142Z\n';
    data += 'LAST-MODIFIED:20231226T123142Z\n';
    data += 'SEQUENCE:0\n';
    data += 'UID:0c876b6e-67aa-43ca-908a-78998c459c75\n';
    data += 'DTSTART:' + d0.toFormat('yyyy') + m0 + day0 + 'T060000\n';
    data += 'DTEND:' + d0.toFormat('yyyy') + m0 + day0 + 'T080000\n';
    data += 'STATUS:CONFIRMED\n';
    data += 'SUMMARY:everyTwoWeeks\n';
    data += 'RRULE:FREQ=WEEKLY;INTERVAL=2;BYDAY=WE\n';
    data += 'END:VEVENT\n';

    data += 'END:VCALENDAR\n';

    fs.writeFileSync(fileName, data);
};
