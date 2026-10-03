'use strict';

const assert = require('node:assert/strict');
const http = require('node:http');
const proxyquire = require('proxyquire');

const calendarFetcher = require('./lib/calendarFetcher');
const { resolvesToPrivateAddress, assertRedirectDestinationAllowed, assertRedirectProtocolAllowed, fetchCalendarUrl } =
    calendarFetcher;

function listen(server) {
    return new Promise((resolve, reject) => {
        server.on('error', reject);
        server.listen(0, '127.0.0.1', () => resolve(server.address().port));
    });
}

function jsonHeaders(location) {
    return {
        get(name) {
            return name.toLowerCase() === 'location' ? location : null;
        },
    };
}

describe('calendarFetcher.resolvesToPrivateAddress', () => {
    it('flags literal loopback/private/link-local addresses as private', async () => {
        for (const ip of ['127.0.0.1', '::1', '0.0.0.0', '10.1.2.3', '192.168.1.5', '172.16.0.1', '172.31.255.255', '169.254.1.1']) {
            assert.equal(await resolvesToPrivateAddress(ip), true, `expected ${ip} to be private`);
        }
    });

    it('does not flag a public-looking literal IP as private', async () => {
        assert.equal(await resolvesToPrivateAddress('93.184.216.34'), false);
    });

    it('flags a hostname that resolves to a private IP as private', async () => {
        const mockedFetcher = proxyquire('./lib/calendarFetcher', {
            'node:dns': {
                promises: {
                    lookup: async () => ({ address: '192.168.1.5' }),
                },
            },
        });
        assert.equal(await mockedFetcher.resolvesToPrivateAddress('internal.example.test'), true);
    });

    it('does not flag a hostname that resolves to a public IP as private', async () => {
        const mockedFetcher = proxyquire('./lib/calendarFetcher', {
            'node:dns': {
                promises: {
                    lookup: async () => ({ address: '93.184.216.34' }),
                },
            },
        });
        assert.equal(await mockedFetcher.resolvesToPrivateAddress('public.example.test'), false);
    });
});

describe('calendarFetcher.assertRedirectDestinationAllowed', () => {
    it('allows a redirect to a private address when the configured URL was already private', async () => {
        await assert.doesNotReject(() => assertRedirectDestinationAllowed('http://192.168.1.5/cal.ics', true));
    });

    it('rejects a redirect to 127.0.0.1 when the configured URL was public', async () => {
        await assert.rejects(
            () => assertRedirectDestinationAllowed('http://127.0.0.1/cal.ics', false),
            /private\/internal address/,
        );
    });

    it('rejects a redirect to a 192.168.x.x address when the configured URL was public', async () => {
        await assert.rejects(
            () => assertRedirectDestinationAllowed('http://192.168.1.5/cal.ics', false),
            /private\/internal address/,
        );
    });

    it('allows a redirect to a public-looking address when the configured URL was public', async () => {
        await assert.doesNotReject(() => assertRedirectDestinationAllowed('http://93.184.216.34/cal.ics', false));
    });
});

describe('calendarFetcher.assertRedirectProtocolAllowed', () => {
    it('rejects a redirect to a non-http(s) scheme', () => {
        assert.throws(
            () => assertRedirectProtocolAllowed('https://example.test/cal.ics', 'file:///etc/passwd'),
            /Invalid redirect protocol/,
        );
    });

    it('rejects an https to http downgrade redirect', () => {
        assert.throws(
            () => assertRedirectProtocolAllowed('https://example.test/cal.ics', 'http://example.test/cal.ics'),
            /HTTPS to HTTP/,
        );
    });

    it('allows an http to https upgrade redirect', () => {
        assert.doesNotThrow(() =>
            assertRedirectProtocolAllowed('http://example.test/cal.ics', 'https://example.test/cal.ics'),
        );
    });
});

describe('calendarFetcher.fetchCalendarUrl (real sockets, sslignore path)', () => {
    let servers = [];

    afterEach(() => {
        for (const server of servers) {
            server.close();
        }
        servers = [];
    });

    it('fetches a directly configured private (127.0.0.1) calendar URL without being blocked', async () => {
        const server = http.createServer((req, res) => {
            res.writeHead(200);
            res.end('CALENDAR-BODY');
        });
        servers.push(server);
        const port = await listen(server);

        const body = await fetchCalendarUrl(`http://127.0.0.1:${port}/cal.ics`, { sslignore: 'ignore' });
        assert.equal(body, 'CALENDAR-BODY');
    });

    it('allows a configured private calendar to redirect to another private target', async () => {
        const target = http.createServer((req, res) => {
            res.writeHead(200);
            res.end('REDIRECTED-BODY');
        });
        servers.push(target);
        const targetPort = await listen(target);

        const entry = http.createServer((req, res) => {
            res.writeHead(302, { Location: `http://127.0.0.1:${targetPort}/cal.ics` });
            res.end();
        });
        servers.push(entry);
        const entryPort = await listen(entry);

        const body = await fetchCalendarUrl(`http://127.0.0.1:${entryPort}/cal.ics`, { sslignore: 'ignore' });
        assert.equal(body, 'REDIRECTED-BODY');
    });

    it('rejects a redirect to a non-http(s) scheme even for a private configured URL', async () => {
        const entry = http.createServer((req, res) => {
            res.writeHead(302, { Location: 'file:///etc/passwd' });
            res.end();
        });
        servers.push(entry);
        const entryPort = await listen(entry);

        await assert.rejects(
            () => fetchCalendarUrl(`http://127.0.0.1:${entryPort}/cal.ics`, { sslignore: 'ignore' }),
            /Invalid redirect protocol/,
        );
    });
});

describe('calendarFetcher.fetchCalendarUrl (injected fetchImpl, default path)', () => {
    it('follows a public to public redirect and returns the final body', async () => {
        const calls = [];
        const fetchImpl = async url => {
            calls.push(url);
            if (url === 'http://93.184.216.34/cal.ics') {
                return {
                    status: 302,
                    ok: false,
                    headers: jsonHeaders('http://93.184.216.35/cal.ics'),
                };
            }
            return {
                status: 200,
                ok: true,
                headers: jsonHeaders(null),
                text: async () => 'FINAL-BODY',
            };
        };

        const body = await fetchCalendarUrl('http://93.184.216.34/cal.ics', { fetchImpl });
        assert.equal(body, 'FINAL-BODY');
        assert.deepEqual(calls, ['http://93.184.216.34/cal.ics', 'http://93.184.216.35/cal.ics']);
    });

    it('rejects a public configured URL redirecting to 127.0.0.1', async () => {
        const fetchImpl = async () => ({
            status: 302,
            ok: false,
            headers: jsonHeaders('http://127.0.0.1/secret'),
        });

        await assert.rejects(
            () => fetchCalendarUrl('http://93.184.216.34/cal.ics', { fetchImpl }),
            /private\/internal address/,
        );
    });

    it('rejects a public configured URL redirecting to a 192.168.x.x address', async () => {
        const fetchImpl = async () => ({
            status: 302,
            ok: false,
            headers: jsonHeaders('http://192.168.1.5/secret'),
        });

        await assert.rejects(
            () => fetchCalendarUrl('http://93.184.216.34/cal.ics', { fetchImpl }),
            /private\/internal address/,
        );
    });

    it('surfaces a non-ok final response as an error', async () => {
        const fetchImpl = async () => ({
            status: 404,
            statusText: 'Not Found',
            ok: false,
            headers: jsonHeaders(null),
        });

        await assert.rejects(
            () => fetchCalendarUrl('http://93.184.216.34/cal.ics', { fetchImpl }),
            /HTTP 404/,
        );
    });
});
