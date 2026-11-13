// Home page voice card: the questions a farmer can simply say, typed out one after another over a live-looking
// waveform, ending on the step that matters most: nothing is sent without the farmer's own "yes". It shows the way of
// asking, not answers, so no figure here is made up.
import { useEffect, useState } from 'react';
import { Mic, Check, X } from 'lucide-react';
import { useStore } from '../../store';

const ASKS = [
  { bn: 'এবার রবিতে কী লাগাব?', en: 'What should I plant this Rabi?' },
  { bn: 'আজ কি সেচ লাগবে?', en: 'Do I need to water today?' },
  { bn: 'ধানের পাতায় বাদামি দাগ পড়েছে', en: 'Brown spots on the rice leaves' },
  { bn: 'কর্মকর্তাকে জানাও', en: 'Tell the officer' },
];

export default function VoiceAskDemo() {
  const { T, L } = useStore();
  const [k, setK] = useState(0);
  const [n, setN] = useState(0);
  const text = L(ASKS[k]);
  const last = k === ASKS.length - 1;
  const typed = n >= [...text].length;

  // type the question letter by letter, hold it, then move on (the last one waits on the "yes" step)
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { setN(999); return undefined; }
    const chars = [...text].length;
    const t = n < chars ? setTimeout(() => setN(n + 1), 55) : setTimeout(() => { setK((k + 1) % ASKS.length); setN(0); }, last ? 3200 : 1700);
    return () => clearTimeout(t);
  }, [n, k, text, last]);

  return (
    <div className="voice-ask relative flex min-h-[222px] flex-col justify-center overflow-hidden rounded-2xl border border-primary-900/10 bg-[#0b2015] p-5 text-white">
      <div className="voice-ask-aura pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="relative flex items-center gap-3">
        <span className="voice-mic relative grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary-500 text-white">
          <Mic size={20} />
        </span>
        <div className="flex h-12 flex-1 items-center justify-between overflow-hidden" aria-hidden="true">
          {Array.from({ length: 44 }, (_, i) => (
            <span key={i} className={`voice-bar ${typed ? 'is-idle' : ''}`} style={{ '--i': i, '--h': `${18 + Math.round((Math.sin((i / 43) * Math.PI) ** 1.4) * 70) + ((i * 37) % 16)}%` }} />
          ))}
        </div>
      </div>
      <p className="relative mt-4 min-h-[30px] text-[20px] font-semibold text-primary-50" aria-live="polite">
        <span className="text-paddy-300">“</span>{[...text].slice(0, n).join('')}{!typed && <span className="voice-caret">|</span>}{typed && <span className="text-paddy-300">”</span>}
      </p>
      <div className={`mt-2 flex items-center gap-2 text-[12.5px] transition-opacity duration-300 ${last && typed ? 'opacity-100' : 'opacity-0'}`}>
        <span className="text-primary-100/75">{T('পাঠাব?', 'Send it?')}</span>
        <span className="inline-flex items-center gap-1 rounded-full bg-primary-500 px-2.5 py-0.5 font-bold"><Check size={13} />{T('হ্যাঁ', 'Yes')}</span>
        <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-0.5"><X size={13} />{T('না', 'No')}</span>
      </div>
    </div>
  );
}
