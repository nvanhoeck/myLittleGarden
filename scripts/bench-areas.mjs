/**
 * Benchmarks the area-first layout: layoutAreas + plantCountOf + the canvas view model for a
 * 1500 x 2000 cm component with 10 catalog plants (ratio 1 each).
 * It compiles nothing itself: it imports the JS build in .bench-js/.
 *
 * Usage: node scripts/build-domain-js.mjs && node --jitless scripts/bench-areas.mjs
 * Gate: < 1 s per run under --jitless (and < 50 ms with the JIT).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { performance } from 'node:perf_hooks';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const build = (name) => pathToFileURL(join(root, '.bench-js', name)).href;
const { layoutAreas } = await import(build('AreaLayout.mjs'));
const { plantCountOf } = await import(build('AreaGrid.mjs'));
const { buildAreaCanvas } = await import(build('areaCanvasViewModel.mjs'));
const { relationsFromCatalog } = await import(build('PlantRelations.mjs'));

const catalog = JSON.parse(readFileSync(join(root, 'src', 'data', 'plants.json'), 'utf8')).plants;
const ids = ['tomaat', 'sla', 'wortel', 'basilicum', 'boerenkool', 'radijs', 'ui', 'spinazie', 'courgette', 'struikboon'];
const plants = ids.map((id) => {
  const plant = catalog.find((p) => p.id === id);
  if (!plant) throw new Error(`Plant ${id} not in the catalog`);
  return plant;
});

const layer = { shape: 'rectangle', widthCm: 1500, lengthCm: 2000 };
const request = {
  layers: [layer],
  fixed: [],
  plantings: plants.map((p) => ({ plantingId: `planting-${p.id}`, plantId: p.id, ratio: 1, traits: p })),
  relations: relationsFromCatalog(catalog),
};

const relations = relationsFromCatalog(catalog);
const traitsOf = (plantingId) => request.plantings.find((p) => p.plantingId === plantingId).traits;

function run() {
  const start = performance.now();
  const result = layoutAreas(request);
  let plantTotal = 0;
  for (const area of result.areas) {
    plantTotal += plantCountOf(area, request.plantings.find((p) => p.plantingId === area.plantingId).traits, layer) ?? 0;
  }
  const data = result.areas.map((a) => ({ id: `area-${a.plantingId}`, plantingId: a.plantingId, plantId: traitsOf(a.plantingId).id, pieces: a.pieces ?? [a] }));
  const view = buildAreaCanvas({
    own: data, carried: [], layer, plantOf: (id) => plants.find((p) => p.id === id), nameOf: (id) => id,
    relations, carriedLabelOf: () => '', t: (key) => key,
  });
  return { ms: performance.now() - start, views: view.areas.length, areas: result.areas.length, plants: plantTotal };
}

const first = run();
const timings = Array.from({ length: 20 }, () => run().ms).sort((a, b) => a - b);
const jitless = process.execArgv.includes('--jitless');
console.log(`mode: ${jitless ? 'jitless' : 'jit'}`);
console.log(`areas: ${first.areas}, canvas views: ${first.views}, plants counted: ${first.plants}`);
console.log(`first run: ${first.ms.toFixed(2)} ms, median of 20: ${timings[10].toFixed(2)} ms, max: ${timings[19].toFixed(2)} ms`);
const limitMs = jitless ? 1000 : 50;
if (first.ms >= limitMs) {
  console.error(`FAIL: first run ${first.ms.toFixed(2)} ms >= ${limitMs} ms`);
  process.exitCode = 1;
}
