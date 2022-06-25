'use strict';

const fs = require('fs');
const { newDate } = require('./setupDate');

module.exports.setup = function () {
    const fileName = __dirname + '/../data/today.ics';
    if (fs.existsSync(fileName)) {
        fs.unlinkSync(fileName);
    }

    // yesterday
    const d0 = newDate().minus({day: 1});
    const m0 = d0.toFormat('MM');
    const day0 = d0.toFormat('dd');

    // today
    const d1 = newDate();
    const m1 = d1.toFormat('MM');
    const day1 = d1.toFormat('dd');

    // tomorrow
    const d2 = newDate().plus({day: 1});
    const m2 = d2.toFormat('MM');
    const day2 = d2.toFormat('dd');

    // after tomorrow
    const d3 = newDate().plus({day: 2});
    const m3 = d3.toFormat('MM');
    const day3 = d3.toFormat('dd');

    let data = fs.readFileSync(__dirname + '/../data/calender_head_template.ics').toString();

    data += 'X-WR-CALNAME:Integration Test Calendar\n';
    data += 'X-WR-TIMEZONE:' + d1.zoneName + '\n';

    // Fullday event for 1 day with Trigger "Vacation"
    data += 'BEGIN:VEVENT\n';
    data += 'DTSTART;VALUE=DATE:' + d1.toFormat('yyyy') + m1 + day1 + '\n';
    data += 'DTEND;VALUE=DATE:' + d2.toFormat('yyyy') + m2 + day2 + '\n';
    data += 'DTSTAMP:20111213T124028Z\n';
    data += 'UID:2fb00ad3a214f7369e7a95f56@calendarlabs.com\n';
    data += 'CREATED:20111213T123901Z\n';
    data += 'DESCRIPTION:Vacation\n';
    data += 'LAST-MODIFIED:20111213T123901Z\n';
    data += 'LOCATION:\n';
    data += 'SEQUENCE:0\n';
    data += 'STATUS:CONFIRMED\n';
    data += 'SUMMARY:Vacation\n';
    data += 'TRANSP:TRANSPARENT\n';
    data += 'END:VEVENT\n';

    // Fullday event for 1 day with Trigger "Vacation"
    data += 'BEGIN:VEVENT\n';
    data += 'DTSTART;VALUE=DATE:' + d1.toFormat('yyyy') + m1 + day1 + '\n';
    data += 'DTEND;VALUE=DATE:' + d2.toFormat('yyyy') + m2 + day2 + '\n';
    data += 'DTSTAMP:20111213T124028Z\n';
    data += 'UID:2fb00ad3a214f7369e7a95f61@calendarlabs.com\n';
    data += 'CREATED:20111213T123901Z\n';
    data += 'DESCRIPTION:Today Event\n';
    data += 'LAST-MODIFIED:20111213T123901Z\n';
    data += 'LOCATION:\n';
    data += 'SEQUENCE:0\n';
    data += 'STATUS:CONFIRMED\n';
    data += 'SUMMARY:Today Event\n';
    data += 'TRANSP:TRANSPARENT\n';
    data += 'END:VEVENT\n';

    // Fullday event for 2 days with Trigger "MyEvent" and "BlaEvent"
    data += 'BEGIN:VEVENT\n';
    data += 'DTSTART;VALUE=DATE:' + d1.toFormat('yyyy') + m1 + day1 + '\n';
    data += 'DTEND;VALUE=DATE:' + d3.toFormat('yyyy') + m3 + day3 + '\n';
    data += 'DTSTAMP:20111213T124028Z\n';
    data += 'UID:2fb00ad3a214f7369e7a95f57@calendarlabs.com\n';
    data += 'CREATED:20111213T123901Z\n';
    data += 'DESCRIPTION:MyEvent BlaEvent\n';
    data += 'LAST-MODIFIED:20111213T123901Z\n';
    data += 'LOCATION:\n';
    data += 'SEQUENCE:0\n';
    data += 'STATUS:CONFIRMED\n';
    data += 'SUMMARY:MyEvent BlaEvent\n';
    data += 'TRANSP:TRANSPARENT\n';
    data += 'END:VEVENT\n';

    // event for over 0:00
    data += 'BEGIN:VEVENT\n';
    data += 'DTSTART:' + d2.toFormat('yyyy') + m2 + day2 + 'T220000\n';
    data += 'DTEND:' + d3.toFormat('yyyy') + m3 + day3 + 'T020000\n';
    data += 'DTSTAMP:20111213T124028Z\n';
    data += 'UID:2fb00ad3a214f7369e7a95f62@calendarlabs.com\n';
    data += 'CREATED:20111213T123901Z\n';
    data += 'DESCRIPTION:OverEvent\n';
    data += 'LAST-MODIFIED:20111213T123901Z\n';
    data += 'LOCATION:\n';
    data += 'SEQUENCE:0\n';
    data += 'STATUS:CONFIRMED\n';
    data += 'SUMMARY:OverEvent\n';
    data += 'TRANSP:TRANSPARENT\n';
    data += 'END:VEVENT\n';

    // event for over 0:00
    data += 'BEGIN:VEVENT\n';
    data += 'DTSTART;VALUE=DATE:' + d2.toFormat('yyyy') + m2 + day2 + '\n';
    data += 'DTEND;VALUE=DATE:' + d3.toFormat('yyyy') + m3 + day3 + '\n';
    data += 'DTSTAMP:20111213T124028Z\n';
    data += 'UID:2fb00ad3a214f7369e7a95f65@calendarlabs.com\n';
    data += 'CREATED:20111213T123901Z\n';
    data += 'DESCRIPTION:MorgenVoll\n';
    data += 'LAST-MODIFIED:20111213T123901Z\n';
    data += 'LOCATION:\n';
    data += 'SEQUENCE:0\n';
    data += 'STATUS:CONFIRMED\n';
    data += 'SUMMARY:MorgenVoll\n';
    data += 'TRANSP:TRANSPARENT\n';
    data += 'END:VEVENT\n';

    // event for over 0:00
    data += 'BEGIN:VEVENT\n';
    data += 'DTSTART:' + d0.toFormat('yyyy') + m0 + day0 + 'T220000\n';
    data += 'DTEND:' + d3.toFormat('yyyy') + m3 + day3 + 'T020000\n';
    data += 'DTSTAMP:20111213T124028Z\n';
    data += 'UID:2fb00ad3a214f7369e7a95f58@calendarlabs.com\n';
    data += 'CREATED:20111213T123901Z\n';
    data += 'DESCRIPTION:TestEvent\n';
    data += 'LAST-MODIFIED:20111213T123901Z\n';
    data += 'LOCATION:Test-Location\n';
    data += 'SEQUENCE:0\n';
    data += 'STATUS:CONFIRMED\n';
    data += 'SUMMARY:TestEvent\n';
    data += 'TRANSP:TRANSPARENT\n';
    data += 'END:VEVENT\n';

    // event for over 0:00
    data += 'BEGIN:VEVENT\n';
    data += 'DTSTART:' + d2.toFormat('yyyy') + m2 + day2 + 'T180000\n';
    data += 'DTEND:' + d2.toFormat('yyyy') + m2 + day2 + 'T200000\n';
    data += 'DTSTAMP:20111213T124028Z\n';
    data += 'UID:2fb00ad3a214f7369e7a95f60@calendarlabs.com\n';
    data += 'CREATED:20111213T123901Z\n';
    data += 'DESCRIPTION:InDayEvent\n';
    data += 'LAST-MODIFIED:20111213T123901Z\n';
    data += 'LOCATION:\n';
    data += 'SEQUENCE:0\n';
    data += 'STATUS:CONFIRMED\n';
    data += 'SUMMARY:InDayEvent\n';
    data += 'TRANSP:TRANSPARENT\n';
    data += 'END:VEVENT\n';

    // event for over 0:00
    data += 'BEGIN:VEVENT\n';
    data += 'DTSTART:' + d2.toFormat('yyyy') + m2 + day2 + 'T180000\n';
    data += 'DTEND:' + d2.toFormat('yyyy') + m2 + day2 + 'T200000\n';
    data += 'DTSTAMP:20111213T124028Z\n';
    data += 'UID:2fb00ad3a214f7369e7a95f63@calendarlabs.com\n';
    data += 'CREATED:20111213T123901Z\n';
    data += 'DESCRIPTION:InDay2\n';
    data += 'LAST-MODIFIED:20111213T123901Z\n';
    data += 'LOCATION:\n';
    data += 'SEQUENCE:0\n';
    data += 'STATUS:CONFIRMED\n';
    data += 'SUMMARY:InDay2\n';
    data += 'TRANSP:TRANSPARENT\n';
    data += 'END:VEVENT\n';

    // Fullday event for 2 days with Trigger "MyEvent" and  "BlaEvent"
    data += 'BEGIN:VEVENT\n';
    data += 'DTSTART:' + d2.toFormat('yyyy') + m2 + day2 + 'T100000\n';
    data += 'DTEND:' + d2.toFormat('yyyy') + m2 + day2 + 'T100000\n';
    data += 'DTSTAMP:20111213T124028Z\n';
    data += 'UID:2fb00ad3a214f7369e7a95f59@calendarlabs.com\n';
    data += 'CREATED:20111213T123901Z\n';
    data += 'DESCRIPTION:Reminder\n';
    data += 'LAST-MODIFIED:20111213T123901Z\n';
    data += 'LOCATION:\n';
    data += 'SEQUENCE:0\n';
    data += 'STATUS:CONFIRMED\n';
    data += 'SUMMARY:Reminder\n';
    data += 'TRANSP:TRANSPARENT\n';
    data += 'END:VEVENT\n';

    data += 'BEGIN:VEVENT\n';
    data += 'CREATED:20160525T175643Z\n';
    data += 'LAST-MODIFIED:20171114T171736Z\n';
    data += 'DTSTAMP:20171114T171736Z\n';
    data += 'UID:7defc9a5-a1c8-419d-a05c-58cf98e83cdb\n';
    data += 'DESCRIPTION:TestUserEvent1\n';
    data += 'SUMMARY:TestUserEvent1\n';
    data += 'DTSTART;TZID=' + d1.zoneName + ':' + d2.toFormat('yyyy') + m2 + day2 + 'T193000\n';
    data += 'DTEND;TZID=' + d1.zoneName + ':' + d2.toFormat('yyyy') + m2 + day2 + 'T203000\n';
    data += 'TRANSP:OPAQUE\n';
    data += 'SEQUENCE:4\n';
    data += 'X-MOZ-GENERATION:4\n';
    data += 'END:VEVENT\n';

    data += 'BEGIN:VEVENT\n';
    data += 'CREATED:20160525T175643Z\n';
    data += 'LAST-MODIFIED:20171114T171736Z\n';
    data += 'DTSTAMP:20171114T171736Z\n';
    data += 'UID:7defc9a5-a1c8-419d-a05c-65cf98e83cdb\n';
    data += 'DESCRIPTION:SameDay\n';
    data += 'SUMMARY:SameDay\n';
    data += 'DTSTART;TZID=' + d1.zoneName + ':' + d1.toFormat('yyyy') + m1 + day1 + 'T235800\n';
    data += 'DTEND;TZID=' + d1.zoneName + ':' + d1.toFormat('yyyy') + m1 + day1 + 'T235900\n';
    data += 'TRANSP:OPAQUE\n';
    data += 'SEQUENCE:4\n';
    data += 'X-MOZ-GENERATION:4\n';
    data += 'END:VEVENT\n';

    // event date with same start and end
    data += 'BEGIN:VEVENT\n';
    data += 'CREATED:20160525T175643Z\n';
    data += 'LAST-MODIFIED:20171114T171736Z\n';
    data += 'DTSTAMP:20171114T171736Z\n';
    data += 'UID:7defc9a5-a1c8-419d-a05c-65cf98483cdb\n';
    data += 'DESCRIPTION:FulldayWithSameDate\n';
    data += 'SUMMARY:FulldayWithSameDate\n';
    data += 'DTSTART;VALUE=DATE:' + d1.toFormat('yyyy') + m1 + day1 + '\n';
    data += 'DTEND;VALUE=DATE:' + d1.toFormat('yyyy') + m1 + day1 + '\n';
    data += 'TRANSP:OPAQUE\n';
    data += 'SEQUENCE:4\n';
    data += 'X-MOZ-GENERATION:4\n';
    data += 'END:VEVENT\n';

    // event date-time with same start and end; already gone
    data += 'BEGIN:VEVENT\n';
    data += 'CREATED:20160525T175643Z\n';
    data += 'LAST-MODIFIED:20171114T171736Z\n';
    data += 'DTSTAMP:20171114T171736Z\n';
    data += 'UID:7defc9a5-a1cd-419d-a05c-65cf98483cdb\n';
    data += 'DESCRIPTION:FulldayWithSameDateTime\n';
    data += 'SUMMARY:FulldayWithSameDateTime\n';
    data += 'DTSTART:' + d1.toFormat('yyyy') + m1 + day1 + 'T000000\n';
    data += 'DTEND:' + d1.toFormat('yyyy') + m1 + day1 + 'T000000\n';
    data += 'TRANSP:OPAQUE\n';
    data += 'SEQUENCE:4\n';
    data += 'X-MOZ-GENERATION:4\n';
    data += 'END:VEVENT\n';

    data += 'END:VCALENDAR\n';

    fs.writeFileSync(fileName, data);
};
