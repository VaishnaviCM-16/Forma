import { createObject, pointInObject } from '../src/domain/model';

const count = Number(process.env.BENCH_OBJECTS ?? 10_000);
const objects = Array.from({ length: count }, (_, index) => createObject('rectangle', index % 1000, Math.floor(index / 1000)));
const start = performance.now();
let hits = 0;
for (let sample = 0; sample < 100; sample++) {
  const point = { x: (sample * 97) % 1000, y: (sample * 53) % 250 };
  for (const object of objects) if (pointInObject(point, object)) hits++;
}
const elapsed = performance.now() - start;
console.log(JSON.stringify({ workload: 'axis-aligned hit tests', objects: count, pointerSamples: 100, operations: count * 100, hits, elapsedMs: Math.round(elapsed * 100) / 100, operationsPerSecond: Math.round(count * 100_000 / Math.max(elapsed, 1)), note: 'Geometry throughput only; not a Canvas rendering or 60 FPS benchmark.' }, null, 2));
