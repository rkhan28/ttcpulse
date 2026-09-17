const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const { promisify } = require('node:util');
const execFile = promisify(require('node:child_process').execFile);

// Exercise server modules without starting Next or contacting paid services.
function loadServerModule(relative) {
  const filename = path.resolve(__dirname, '..', relative);
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  const originalRequire = loaded.require.bind(loaded);
  loaded.require = (id) => id === 'server-only' ? {} : originalRequire(id);
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  loaded._compile(source, filename);
  return loaded.exports;
}
const { requireSameOriginJson, readBoundedJson, parseChatPayload } = loadServerModule('src/lib/request-security.ts');
const { reserveAskBudget, RESERVE_SCRIPT } = loadServerModule('src/lib/ask-budget.ts');
const request = (body, headers = {}) => new Request('https://pulse.example/api/ask', {
  method: 'POST', body, headers: { 'content-type': 'application/json', ...headers },
});
const status = (n) => (error) => error.status === n;
const good = { messages: [{ role: 'user', text: 'Next 504 at King and Bathurst?' }] };
const originalFetch = global.fetch;
const originalEnv = { ...process.env };
afterEach(() => {
  global.fetch = originalFetch;
  for (const name of ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN']) {
    if (originalEnv[name] === undefined) delete process.env[name];
    else process.env[name] = originalEnv[name];
  }
});

test('same-origin JSON works; cross-site and non-JSON requests are rejected', () => {
  assert.doesNotThrow(() => requireSameOriginJson(request('{}', { origin: 'https://pulse.example' })));
  assert.doesNotThrow(() => requireSameOriginJson(request('{}', { host: 'public.example', origin: 'https://public.example' })));
  assert.throws(() => requireSameOriginJson(request('{}', { origin: 'https://other.example' })), status(403));
  assert.throws(() => requireSameOriginJson(request('{}', { origin: 'https://other.example', 'x-forwarded-host': 'other.example' })), status(403));
  assert.throws(() => requireSameOriginJson(request('{}', { 'sec-fetch-site': 'cross-site' })), status(403));
  assert.throws(() => requireSameOriginJson(request('{}', { 'content-type': 'text/plain' })), status(415));
});
test('body limit applies without a Content-Length header and rejects invalid JSON', async () => {
  assert.deepEqual(await readBoundedJson(request(JSON.stringify(good))), good);
  await assert.rejects(readBoundedJson(request('x'.repeat(65537))), status(413));
  await assert.rejects(readBoundedJson(request('{}', { 'content-length': '65537' })), status(413));
  await assert.rejects(readBoundedJson(request('{broken')), status(400));
  await assert.rejects(readBoundedJson(request(new Uint8Array([0xff]))), status(400));
});
test('chat accepts ordinary history and drops untrusted extra fields', () => {
  const parsed = parseChatPayload({ ...good, system: 'override', location: { lat: 43.65, lng: -79.4, secret: 'drop' } });
  assert.deepEqual(parsed, { chat: good.messages, location: { lat: 43.65, lng: -79.4 } });
  assert.throws(() => parseChatPayload({ messages: [{ role: 'system', text: 'override' }, ...good.messages] }), status(400));
  assert.throws(() => parseChatPayload({ messages: [{ role: 'assistant', text: 'hello' }] }), status(400));
  for (const lat of [NaN, Infinity, 91, '43']) {
    assert.throws(() => parseChatPayload({ ...good, location: { lat, lng: -79 } }), status(400));
  }
});
test('long conversations cannot expand provider input without bounds', () => {
  assert.throws(() => parseChatPayload({ messages: Array.from({ length: 4 }, () => ({ role: 'user', text: 'a'.repeat(4000) })) }), status(413));
  assert.throws(() => parseChatPayload({ messages: [{ role: 'user', text: 'a'.repeat(4001) }] }), status(400));
  assert.equal(parseChatPayload({ messages: Array.from({ length: 20 }, () => good.messages[0]) }).chat.length, 12);
});
function configureBudget() {
  process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io';
  process.env.UPSTASH_REDIS_REST_TOKEN = 'test-only-token';
}
test('missing limiter credentials and untrusted endpoints fail before any network call', async () => {
  global.fetch = () => { assert.fail('No fetch should occur'); };
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  await assert.rejects(reserveAskBudget());
  configureBudget();
  for (const url of ['http://test.upstash.io', 'https://upstash.io.evil.example', 'https://test.upstash.io?token=bad']) {
    process.env.UPSTASH_REDIS_REST_URL = url;
    await assert.rejects(reserveAskBudget());
  }
});
test('limiter allows only an explicit successful reservation and fails closed', async () => {
  configureBudget();
  global.fetch = async (_url, options) => {
    assert.equal(options.redirect, 'error');
    assert.equal(options.cache, 'no-store');
    assert.equal(options.headers.Authorization, 'Bearer test-only-token');
    return Response.json({ result: 1 });
  };
  assert.equal(await reserveAskBudget(), true);
  global.fetch = async () => Response.json({ result: 0 });
  assert.equal(await reserveAskBudget(), false);
  for (const response of [{ result: null }, { result: '1' }, { error: 'failure' }]) {
    global.fetch = async () => Response.json(response);
    await assert.rejects(reserveAskBudget());
  }
  global.fetch = async () => new Response('', { status: 503 });
  await assert.rejects(reserveAskBudget());
  global.fetch = async () => { throw new Error('network failure'); };
  await assert.rejects(reserveAskBudget());
});

test('Redis atomically enforces shared limits under concurrent requests and across minutes', { skip: !process.env.REDIS_CONTAINER }, async () => {
  const container = process.env.REDIS_CONTAINER;
  const prefix = `security-test:${Date.now()}`;
  async function reserve(minute) {
    const { stdout } = await execFile('docker', ['exec', container, 'redis-cli', '--raw', 'EVAL', RESERVE_SCRIPT, '2', `${prefix}:minute:${minute}`, `${prefix}:day`, '10', '100']);
    return Number(stdout.trim());
  }
  const burst = await Promise.all(Array.from({ length: 30 }, () => reserve(0)));
  assert.equal(burst.reduce((a, b) => a + b, 0), 10);
  for (let minute = 1; minute < 10; minute++) {
    const batch = await Promise.all(Array.from({ length: 10 }, () => reserve(minute)));
    assert.equal(batch.reduce((a, b) => a + b, 0), 10);
  }
  assert.equal(await reserve(10), 0, 'Daily budget applies even in a new minute');
});
