import test from 'node:test';
import assert from 'node:assert/strict';
import { dreamSpeaker, sagaSpeaker, SAGA_SPEAKER } from './voices.js';
import { CHILDREN, WOMEN } from '../game/dream.js';
import { CAST } from '../game/saga.js';
import { SPEAKERS, SPEAKER_GENDER } from '../../api/tts.js';

test('every child in the dream speaks in a voice of their own gender, and every parent too', () => {
  for (const [id, c] of Object.entries(CHILDREN)) {
    const kid = dreamSpeaker('child', { girl: c.girl });
    assert.equal(SPEAKER_GENDER[kid], c.girl ? 'female' : 'male', `${id}'s child ${c.name.en}`);
    const parent = dreamSpeaker('parent', { parentWoman: WOMEN.includes(id) });
    assert.equal(SPEAKER_GENDER[parent], WOMEN.includes(id) ? 'female' : 'male', `${id}'s parent`);
  }
  assert.equal(dreamSpeaker('child', { girl: false }), 'boy'); // Tuhin, Arif, Rafi, Jewel, Ali, Tashi, Min Thu
});

test('every story character has a speaker of the right gender', () => {
  const MEN = ['razib', 'baba', 'sohel'], WOMEN_SAGA = ['dadi', 'mitu', 'nasrin', 'nodi'];
  for (const who of Object.keys(CAST)) {
    assert.ok(Object.hasOwn(SAGA_SPEAKER, who), `${who} has a voice`);
    assert.ok(Object.hasOwn(SPEAKERS, sagaSpeaker(who)), `${who}'s speaker exists in api/tts.js`);
    if (MEN.includes(who)) assert.equal(SPEAKER_GENDER[sagaSpeaker(who)], 'male', who);
    if (WOMEN_SAGA.includes(who)) assert.equal(SPEAKER_GENDER[sagaSpeaker(who)], 'female', who);
  }
});
