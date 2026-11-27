// The Chakra agent finds the right knowledge-base passage for hand-written farmer questions
// (scripts/build/chakra_retrieval_eval.json). The counts below are a floor measured on the BM25 retriever: a rebuild of
// the knowledge base (npm run train:chakra) or a change to searchRAG that finds fewer fails here. When a better
// retriever passes more, raise the floor; when a question fails, add more questions rather than tuning to this list.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { searchRAG } from './chakraLLM.js';

const evalSet = JSON.parse(readFileSync(new URL('../../scripts/build/chakra_retrieval_eval.json', import.meta.url)));
const kb = JSON.parse(readFileSync(new URL('../data/models/chakra_knowledge_base.json', import.meta.url)));
const FLOOR = { hit1: 34, hit3: 38 };

test('every retrieval question names exactly one passage', () => {
  for (const q of evalSet.questions) {
    const n = kb.rag.chunks.filter((c) => c.title.includes(q.expect)).length;
    assert.equal(n, 1, `${q.expect}: ${n} passages`);
  }
});

test(`BM25 finds the right passage first for at least ${FLOOR.hit1}, in the top three for at least ${FLOOR.hit3}`, () => {
  let hit1 = 0, hit3 = 0;
  for (const q of evalSet.questions) {
    const r = searchRAG(q.q, { topK: 3 });
    const titles = (r.results ?? r).map((c) => (c.chunk ?? c).title);
    if (titles[0]?.includes(q.expect)) hit1++;
    if (titles.some((t) => t?.includes(q.expect))) hit3++;
  }
  assert.ok(hit1 >= FLOOR.hit1, `hit@1 ${hit1}/${evalSet.questions.length}`);
  assert.ok(hit3 >= FLOOR.hit3, `hit@3 ${hit3}/${evalSet.questions.length}`);
});
