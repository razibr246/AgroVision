#!/usr/bin/env node
// Everything the Colab notebook (notebooks/agros_colab_training.ipynb) trains and tests on, in notebooks/data/:
//   harvest_table.csv          the harvest model's own table (train_harvest_model.mjs --export): REAL FAOSTAT labels,
//                              NASA POWER clues, and twelve months of weather per crop-year for deep models
//   chakra_chunks.json         the Chakra knowledge base's retrieval chunks (id, category, title, Bangla, English)
//   chakra_retrieval_eval.json the hand-written retrieval questions (scripts/build/chakra_retrieval_eval.json)
// npm run colab:data   (re-run after npm run train:chakra or data:harvest so the notebook sees the same data as the app)
import { readFileSync } from 'node:fs';
import { writeFile, mkdir, copyFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = path.join(ROOT, 'notebooks', 'data');
await mkdir(OUT, { recursive: true });

execFileSync(process.execPath, [path.join(ROOT, 'scripts/build/train_harvest_model.mjs'), '--export', OUT], { stdio: 'inherit' });

const kb = JSON.parse(readFileSync(path.join(ROOT, 'src/data/models/chakra_knowledge_base.json')));
const chunks = kb.rag.chunks.map(({ id, cat, title, bn, en }) => ({ id, cat, title, bn, en }));
await writeFile(path.join(OUT, 'chakra_chunks.json'), JSON.stringify({ generatedAt: kb.generatedAt, chunks }) + '\n');
await copyFile(path.join(ROOT, 'scripts/build/chakra_retrieval_eval.json'), path.join(OUT, 'chakra_retrieval_eval.json'));
console.log(`exported ${chunks.length} knowledge-base chunks and the retrieval questions to notebooks/data/`);
