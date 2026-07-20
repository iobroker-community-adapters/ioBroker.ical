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
