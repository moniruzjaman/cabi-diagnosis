import fs from 'fs';
import path from 'path';

// ─────────────────────────────────────────────────────────────────────────────
// DEPRECATED — superseded by scripts/sync_agrichem.mjs (single command:
// `node scripts/sync_agrichem.mjs`). Kept only for historical reference.
//
// This script used to transpile the AgriChem TypeScript data files into
// plain-JS copies under src/data/. Those copies went stale and were removed;
// the MoA registry search in App.jsx now consumes the synced TS sources via
// src/data/pesticideRegistry.js → src/agrichem/data/all_pesticides.ts.
// ─────────────────────────────────────────────────────────────────────────────

const SRC_DIR = path.resolve('../AgriChem-Guide-Pest-Control-Database/src/data');
const DEST_DIR = path.resolve('src/data');

console.warn(
  '⚠️  import_agrichem_data.mjs is DEPRECATED. Use: node scripts/sync_agrichem.mjs\n' +
    '   (This legacy script would re-create stale JS duplicates of the database.\n' +
    '    Aborting without writing anything.)'
);
process.exit(1);

// 1. Process all_pesticides.ts -> all_pesticides.js
console.log('Processing all_pesticides.ts...');
let pesticidesRaw = fs.readFileSync(path.join(SRC_DIR, 'all_pesticides.ts'), 'utf-8');
// Strip TS types
pesticidesRaw = pesticidesRaw.replace(/export type PesticideType =[\s\S]*?export interface PesticideProduct \{[\s\S]*?\}/, '');
pesticidesRaw = pesticidesRaw.replace(/: ReadonlyArray<PesticideProduct>/g, '');
pesticidesRaw = pesticidesRaw.replace(/as PesticideType/g, '');
fs.writeFileSync(path.join(DEST_DIR, 'all_pesticides.js'), pesticidesRaw);
console.log('Saved all_pesticides.js');

// 2. Process moaData.ts -> moaData_full.js
console.log('Processing moaData.ts...');
let moaRaw = fs.readFileSync(path.join(SRC_DIR, 'moaData.ts'), 'utf-8');
moaRaw = moaRaw.replace(/import \{ MoAClassification \} from '\.\.\/types';/, '');
moaRaw = moaRaw.replace(/: MoAClassification\[\]/g, '');
fs.writeFileSync(path.join(DEST_DIR, 'moaData_full.js'), moaRaw);
console.log('Saved moaData_full.js');

console.log('Data conversion complete.');
