const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

const stops = [
  { id: 'A1', name: 'Dufferin St at Bloor St West', lat: 43.66, lon: -79.44 },
  { id: 'A2', name: 'Dufferin St at Bloor St West', lat: 43.661, lon: -79.441 },
  { id: 'B1', name: 'King St at Bathurst St', lat: 43.644, lon: -79.402 },
  { id: 'C1', name: 'Union Station', lat: 43.645, lon: -79.38 },
];
const routes = { '504': { short: '504', type: 0 }, '1': { short: '1', type: 1 } };

function loadStaticModule() {
  const filename = path.resolve(__dirname, '..', 'src/lib/gtfs-static.ts');
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  const originalRequire = loaded.require.bind(loaded);
  loaded.require = (id) => {
    if (id === 'server-only') return {};
    if (id === '@/data/ttc-stops.json') return stops;
    if (id === '@/data/ttc-routes.json') return routes;
    return originalRequire(id);
  };
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  loaded._compile(source, filename);
  return loaded.exports;
}

const { resolveStopIds, searchStops, geocodePlace, routeMode } = loadStaticModule();

test('blank stop names never resolve to unrelated stop IDs', () => {
  assert.deepEqual(resolveStopIds(''), []);
  assert.deepEqual(resolveStopIds(' \t\n '), []);
});

test('exact names resolve all platforms and intersection queries still work', () => {
  assert.deepEqual(resolveStopIds('DUFFERIN ST AT BLOOR ST WEST'), ['A1', 'A2']);
  assert.deepEqual(resolveStopIds('Dufferin and Bloor'), ['A1', 'A2']);
  assert.deepEqual(resolveStopIds('King & Bathurst'), ['B1']);
  assert.deepEqual(resolveStopIds('Not a TTC stop'), []);
});

test('search, geocoding and route classification preserve expected behavior', () => {
  assert.deepEqual(searchStops('  '), []);
  assert.equal(searchStops('Union')[0].name, 'Union Station');
  assert.equal(geocodePlace('King and Bathurst').name, 'King St at Bathurst St');
  assert.equal(routeMode('504'), 'streetcar');
  assert.equal(routeMode('1'), 'subway');
  assert.equal(routeMode('unknown'), undefined);
});
