// Which voice speaks for each character (the speakers of api/tts.js), so a man is heard in a man's voice and a woman or
// girl in a woman's. Pure; checked against the characters' data in voices.test.js.

// The children's dream (game/dream.js): the parent is the mother or the father, the child a boy or a girl.
export function dreamSpeaker(who, { girl = false, parentWoman = false } = {}) {
  if (who === 'parent') return parentWoman ? 'mother' : 'father';
  if (who === 'child') return girl ? 'girl' : 'boy';
  if (who === 'tara' || who === 'frog') return who;
  return 'agent';
}

// The story campaign (game/saga.js CAST).
export const SAGA_SPEAKER = {
  razib: 'youngman', // 30
  baba: 'oldman', // 64
  dadi: 'oldwoman', // 82
  mitu: 'teengirl', // 15
  nasrin: 'agent', // the union's woman officer: the designed Bangladeshi woman's voice
  sohel: 'cousin', // a young man
  nodi: 'youngwoman', // 18
  narrator: 'agent',
};
export const sagaSpeaker = (who) => SAGA_SPEAKER[who] ?? 'agent';
