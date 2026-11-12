import test from 'node:test';
import assert from 'node:assert/strict';
import { loadSharedPlans, sendSharedPlan } from './sharedPlans.js';
import { loadMessages, postMessage } from './sharedMessages.js';

const response = (status, error) => new Response(JSON.stringify({ error }), {
  status,
  headers: { 'Content-Type': 'application/json' },
});

test('shared stores stop retrying after explicit disabled responses', async () => {
  const originalFetch = globalThis.fetch;
  let planCalls = 0, messageCalls = 0;
  globalThis.fetch = async (url) => {
    if (String(url).includes('/api/plans')) {
      planCalls++;
      if (planCalls === 1) return response(503, 'temporary service unavailable');
      if (planCalls === 2) return new Response(JSON.stringify({ plans: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
      return response(503, 'persistent plan storage is disabled until authenticated access exists');
    }
    messageCalls++;
    return response(503, 'persistent message storage is disabled until authenticated access exists');
  };

  try {
    assert.equal((await loadSharedPlans()).reason, 'unreachable');
    assert.equal((await loadSharedPlans()).status, 'live', 'retry transient errors');
    assert.equal((await loadSharedPlans()).reason, 'unconfigured');
    assert.equal((await loadSharedPlans()).reason, 'unconfigured');
    assert.equal(await sendSharedPlan({}), false);
    assert.equal(planCalls, 3, 'retry transient errors, but stop after storage is explicitly disabled');

    assert.equal(await loadMessages('farmer'), null);
    assert.equal(await loadMessages('farmer'), null);
    assert.equal(await postMessage({}), false);
    assert.equal(messageCalls, 1, 'stop polling and posting after storage is explicitly disabled');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
