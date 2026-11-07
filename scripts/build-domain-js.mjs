/**
 * Transpiles the planning domain (src/domain/planning/*.ts, tests excluded)
 * to plain ES modules in .bench-js/, so it can run without type stripping,
 * e.g. under `node --jitless` to approximate Hermes on a phone.
 * Relative imports within the folder are rewritten from `./X.ts` to `./X.mjs`.
 *
 * Usage: node scripts/build-domain-js.mjs && node --jitless scripts/bench-areas.mjs
 */
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const sourceDir = join(root, 'src', 'domain', 'planning');
const outDir = join(root, '.bench-js');

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const sources = readdirSync(sourceDir).filter((name) => name.endsWith('.ts') && !name.endsWith('.test.ts'));
for (const name of sources) {
  const source = readFileSync(join(sourceDir, name), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    fileName: name,
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  });
  const rewritten = outputText.replace(/(from\s+['"])\.\/([\w.-]+?)(?:\.ts)?(['"])/g, '$1./$2.mjs$3');
  writeFileSync(join(outDir, name.replace(/\.ts$/, '.mjs')), rewritten, 'utf8');
}
console.log(`Transpiled ${sources.length} modules to ${outDir}`);
