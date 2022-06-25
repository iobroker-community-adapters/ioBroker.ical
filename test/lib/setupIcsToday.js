'use strict';

const fs = require('fs');

module.exports.setup = function () {
    const fileName = __dirname + '/../data/today.ics';
    if (fs.existsSync(fileName)) {
        fs.unlinkSync(fileName);
    }

    const d0 = new Date();
    d0.setDate(d0.getDate() - 1);
    let m0 = d0.getMonth() + 1;
    if (m0 < 10) m0 = '0' + m0;
    let day0 = d0.getDate();
    if (day0 < 10) day0 = '0' + day0;

    const d1 = new Date();
    let m1 = d1.getMonth() + 1;
    if (m1 < 10) m1 = '0' + m1;
    let day1 = d1.getDate();
    if (day1 < 10) day1 = '0' + day1;

    const d2 = new Date();
    d2.setDate(d2.getDate() + 1);
    let m2 = d2.getMonth() + 1;
    if (m2 < 10) m2 = '0' + m2;
    let day2 = d2.getDate();
    if (day2 < 10) day2 = '0' + day2;

    const d3 = new Date();
    d3.setDate(d3.getDate() + 2);
    let m3 = d3.getMonth() + 1;
    if (m3 < 10) m3 = '0' + m3;
    let day3 = d3.getDate();
    if (day3 < 10) day3 = '0' + day3;

    let data = fs.readFileSync(__dirname + '/../data/calender_head_template.ics').toString();

    // Fullday event for 1 day with Trigger "Vacation"
    data += 'BEGIN:VEVENT\n';
    data += 'DTSTART;VALUE=DATE:' + d1.getFullYear() + m1 + day1 + '\n';
    data += 'DTEND;VALUE=DATE:' + d2.getFullYear() + m2 + day2 + '\n';
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
    data += 'DTSTART;VALUE=DATE:' + d1.getFullYear() + m1 + day1 + '\n';
    data += 'DTEND;VALUE=DATE:' + d2.getFullYear() + m2 + day2 + '\n';
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
    data += 'DTSTART;VALUE=DATE:' + d1.getFullYear() + m1 + day1 + '\n';
    data += 'DTEND;VALUE=DATE:' + d3.getFullYear() + m3 + day3 + '\n';
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
    data += 'DTSTART:' + d2.getFullYear() + m2 + day2 + 'T220000\n';
    data += 'DTEND:' + d3.getFullYear() + m3 + day3 + 'T020000\n';
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
    data += 'DTSTART;VALUE=DATE:' + d2.getFullYear() + m2 + day2 + '\n';
    data += 'DTEND;VALUE=DATE:' + d3.getFullYear() + m3 + day3 + '\n';
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
    data += 'DTSTART:' + d0.getFullYear() + m0 + day0 + 'T220000\n';
    data += 'DTEND:' + d3.getFullYear() + m3 + day3 + 'T020000\n';
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
    data += 'DTSTART:' + d2.getFullYear() + m2 + day2 + 'T180000\n';
    data += 'DTEND:' + d2.getFullYear() + m2 + day2 + 'T200000\n';
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
    data += 'DTSTART:' + d2.getFullYear() + m2 + day2 + 'T180000\n';
    data += 'DTEND:' + d2.getFullYear() + m2 + day2 + 'T200000\n';
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
    data += 'DTSTART:' + d2.getFullYear() + m2 + day2 + 'T100000\n';
    data += 'DTEND:' + d2.getFullYear() + m2 + day2 + 'T100000\n';
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
    data += 'DTSTART;TZID=Europe/Berlin:' + d2.getFullYear() + m2 + day2 + 'T193000\n';
    data += 'DTEND;TZID=Europe/Berlin:' + d2.getFullYear() + m2 + day2 + 'T203000\n';
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
    data += 'DTSTART;TZID=Europe/Berlin:' + d1.getFullYear() + m1 + day1 + 'T235800Z\n';
    data += 'DTEND;TZID=Europe/Berlin:' + d1.getFullYear() + m1 + day1 + 'T235900Z\n';
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
    data += 'DTSTART;VALUE=DATE:' + d1.getFullYear() + m1 + day1 + '\n';
    data += 'DTEND;VALUE=DATE:' + d1.getFullYear() + m1 + day1 + '\n';
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
    data += 'DTSTART:' + d1.getFullYear() + m1 + day1 + 'T000000\n';
    data += 'DTEND:' + d1.getFullYear() + m1 + day1 + 'T000000\n';
    data += 'TRANSP:OPAQUE\n';
    data += 'SEQUENCE:4\n';
    data += 'X-MOZ-GENERATION:4\n';
    data += 'END:VEVENT\n';

    data += 'END:VCALENDAR\n';

    fs.writeFileSync(fileName, data);
};
