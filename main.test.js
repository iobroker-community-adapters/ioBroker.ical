'use strict';

const assert = require('node:assert/strict');
const cloneEvent = require('./lib/cloneEvent');

describe('cloneEvent', () => {
    it('copies top-level event properties without cloning parser-owned values', () => {
        const parserDictionary = Object.assign(Object.create(null), { language: 'en' });
        const rrule = { between: () => [] };
        const event = {
            summary: { val: 'Test event', params: parserDictionary },
            start: new Date('2026-07-20T08:00:00.000Z'),
            end: new Date('2026-07-20T09:00:00.000Z'),
            rrule,
        };

        const copy = cloneEvent(event);

        assert.notStrictEqual(copy, event);
        assert.strictEqual(copy.summary, event.summary);
        assert.strictEqual(copy.rrule, rrule);

        copy.start = new Date('2026-07-27T08:00:00.000Z');
        copy.end = new Date('2026-07-27T09:00:00.000Z');

        assert.equal(event.start.toISOString(), '2026-07-20T08:00:00.000Z');
        assert.equal(event.end.toISOString(), '2026-07-20T09:00:00.000Z');
    });
});

const { getPreviewEnd, normalizeCalendarUrl, isRemoteUrl } = require('./lib/calendarUtils');

describe('calendarUtils', () => {
    describe('getPreviewEnd', () => {
        it('ends today at 23:59:59.999 with 0 preview days (#754)', () => {
            const now = new Date(2026, 10, 21, 10, 30, 0);
            const end = getPreviewEnd(now, 0);
            assert.equal(end.getFullYear(), 2026);
            assert.equal(end.getMonth(), 10);
            assert.equal(end.getDate(), 21);
            assert.equal(end.getHours(), 23);
            assert.equal(end.getMinutes(), 59);
            assert.equal(end.getSeconds(), 59);
            assert.equal(end.getMilliseconds(), 999);
            // an event later today must be inside the window
            assert.ok(new Date(2026, 10, 21, 22, 0, 0) < end);
        });

        it('includes the whole last preview day', () => {
            const now = new Date(2026, 10, 21, 18, 0, 0);
            const end = getPreviewEnd(now, '7');
            assert.equal(end.getDate(), 28);
            assert.equal(end.getHours(), 23);
            assert.ok(new Date(2026, 10, 28, 20, 0, 0) < end);
            assert.ok(new Date(2026, 10, 29, 0, 0, 0) > end);
        });

        it('handles month change and invalid values', () => {
            const now = new Date(2026, 11, 30, 12, 0, 0);
            assert.equal(getPreviewEnd(now, 3).getMonth(), 0);
            assert.equal(getPreviewEnd(now, 3).getDate(), 2);
            assert.equal(getPreviewEnd(now, '').getDate(), 30);
            assert.equal(now.getHours(), 12, 'input date must not be changed');
        });
    });

    describe('normalizeCalendarUrl / isRemoteUrl', () => {
        it('converts webcal:// and webcals:// to https:// (#604)', () => {
            assert.equal(
                normalizeCalendarUrl('webcal://p01-caldav.icloud.com/published/2/abc'),
                'https://p01-caldav.icloud.com/published/2/abc',
            );
            assert.equal(normalizeCalendarUrl('WEBCALS://example.com/cal.ics'), 'https://example.com/cal.ics');
            assert.ok(isRemoteUrl(normalizeCalendarUrl('webcal://example.com/cal.ics')));
        });

        it('keeps http(s) URLs and file names unchanged', () => {
            assert.equal(normalizeCalendarUrl('https://example.com/a.ics'), 'https://example.com/a.ics');
            assert.equal(normalizeCalendarUrl('http://example.com/a.ics'), 'http://example.com/a.ics');
            assert.equal(normalizeCalendarUrl('/opt/iobroker/cal.ics'), '/opt/iobroker/cal.ics');
            assert.equal(normalizeCalendarUrl(' https://example.com/a.ics '), 'https://example.com/a.ics');
            assert.ok(isRemoteUrl('HTTPS://example.com/a.ics'));
            assert.ok(!isRemoteUrl('/opt/iobroker/cal.ics'));
            assert.ok(!isRemoteUrl('holidays.ics'));
        });
    });
});
