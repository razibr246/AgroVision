// Science page: federated learning for pest-outbreak warnings (engine/federated.js). The protocol is real; the farms
// and seasons are generated DEMO data, and the section says so before any number.
import { useMemo } from 'react';
import { ShieldCheck } from 'lucide-react';
import { useStore } from '../../store';
import { Tags, Note } from '../ui';
import { compareFederated } from '../../engine/federated';
import { num } from '../../engine/dates';

export default function FederatedOutbreak() {
  const { T, s } = useStore();
  const r = useMemo(() => compareFederated(), []);
  const pct = (v) => `${num(100 * v, s.lang, { dp: 0 })}%`;
  const rows = [
    [T('প্রতিটি খামার একা', 'Each farm alone'), r.mean.local, T('শুধু নিজের কয়েকটা মৌসুম', 'Only its own few seasons')],
    [T('ফেডারেটেড (FedAvg + সুরক্ষিত যোগফল)', 'Federated (FedAvg + secure sum)'), r.mean.federated, T('তথ্য খামারেই থাকে', 'Records stay on the farm')],
    [T('ফেডারেটেড + ডিফারেনশিয়াল প্রাইভেসি', 'Federated + differential privacy'), r.mean.dp, T('প্রতিটি হালনাগাদে নয়েজ', 'Noise on every update')],
    [T('সব তথ্য এক জায়গায় (তুলনার জন্য)', 'All records pooled (for comparison)'), r.mean.central, T('গোপনীয়তা নেই', 'No privacy')],
  ];
  return (
    <section id="federated" className="mt-12 scroll-mt-28">
      <h2 className="flex items-center gap-2 text-[24px] font-bold"><ShieldCheck size={20} className="text-primary-700" />{T('তথ্য না দিয়েই একসঙ্গে শেখা: পোকার আক্রমণের সতর্কতা', 'Learning together without sharing records: pest-outbreak warnings')} <Tags list={['DEMO', 'MODEL']} /></h2>
      <Note tone="gold">{T('এখানের খামার আর মৌসুম বানানো নমুনা (DEMO); কোনো আসল খামারের পোকার রেকর্ড এই অ্যাপে নেই। আসল হলো পদ্ধতিটি, যা অফিস চালু করতে পারে।', 'The farms and seasons here are generated sample data (DEMO); no real farm’s pest records are in this app. What is real is the method, which an office could run.')}</Note>
      <p className="mt-3 max-w-3xl text-[15px] leading-7 text-ink/75">{T(`${r.farms.length}টি খামার নিজের ফোনে ছোট একটা মডেল শেখে (গরম-ভেজা দিন, রাতের তাপমাত্রা, বৃষ্টির দিন, জাত)। অফিসে যায় শুধু মডেলের সংখ্যাগুলো, তাও এমনভাবে মুখোশ পরানো যে অফিস কোনো একটা খামারেরটা পড়তে পারে না; কেবল যোগফল মেলে। প্রতিটি মডেল পরীক্ষা হয়েছে প্রতিটি খামারের এমন মৌসুমে যা সে শেখার সময় দেখেনি।`, `${r.farms.length} farms each train a small model on their own phone (warm humid days, night temperature, rainy days, variety). Only the model’s numbers go to the office, masked so the office cannot read any one farm’s, only their sum. Every model is tested on each farm’s seasons it never trained on.`)}</p>
      <div className="mt-4 overflow-x-auto rounded-[22px] border border-border bg-white">
        <table className="w-full min-w-[420px] text-left text-[14px]">
          <thead className="bg-canvas text-[12.5px] text-muted"><tr><th className="px-3 py-2.5 font-semibold">{T('মডেল', 'Model')}</th><th className="px-3 py-2.5 font-semibold">{T('গড় সঠিকতা', 'Mean accuracy')}</th><th className="px-3 py-2.5 font-semibold">{T('গোপনীয়তা', 'Privacy')}</th></tr></thead>
          <tbody>{rows.map(([label, v, note]) => (
            <tr key={label} className="border-t border-border"><td className="px-3 py-2.5 font-semibold">{label}</td><td className="px-3 py-2.5 tabular">{pct(v)}</td><td className="px-3 py-2.5 text-muted">{note}</td></tr>
          ))}</tbody>
        </table>
      </div>
      <p className="mt-3 text-[13px] text-muted">{T(`অফিস শেষ ধাপে প্রথম খামার থেকে যা পেয়েছে: [${r.officeSaw[0].slice(0, 3).map((v) => num(v, 'bn', { dp: 0 })).join(', ')} …], মুখোশ সরানো ছাড়া অর্থহীন।`, `What the office received from farm 1 in the last round: [${r.officeSaw[0].slice(0, 3).map((v) => num(v, 'en', { dp: 0 })).join(', ')} …], meaningless without the masks.`)}</p>
      <p className="mt-1 text-[12.5px] text-muted">McMahan et al. 2017 (FedAvg); Bonawitz et al. 2017 (secure aggregation); McMahan et al. 2018 (DP-FedAvg). {T('পরীক্ষা: src/engine/climateSmart.test.js', 'Tests: src/engine/climateSmart.test.js')}</p>
    </section>
  );
}
