import test from 'node:test';
import assert from 'node:assert/strict';
import { validCountry, applyOp, listBoard } from './abroad.js';

test('the shared abroad board accepts every configured country', () => {
  for (const country of ['india', 'pakistan', 'nepal', 'bhutan', 'myanmar', 'usa', 'brazil', 'spain']) assert.equal(validCountry(country), true);
  assert.equal(validCountry('bangladesh'), false);
});

test('foreign board requests and replies remain per-country records', () => {
  const board = { requests: {}, notices: {} };
  const made = applyOp(board, { op: 'request', topic: 'water', text: 'I need help checking my irrigation turn.' });
  assert.equal(made.error, undefined);
  assert.equal(made.item.topic, 'water');
  const reply = applyOp(board, { op: 'reply', id: made.item.id, text: 'Please confirm the local allocation with the OCA office.' });
  assert.equal(reply.item.reply.text, 'Please confirm the local allocation with the OCA office.');
  assert.equal(listBoard(board).requests.length, 1);
});
