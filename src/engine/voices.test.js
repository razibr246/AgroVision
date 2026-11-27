import test from 'node:test';
import assert from 'node:assert/strict';
import { dreamSpeaker } from './voices.js';
import { CHILDREN, WOMEN } from '../game/dream.js';
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

