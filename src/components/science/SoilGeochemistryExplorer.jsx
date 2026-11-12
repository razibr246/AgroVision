import { useState, useMemo } from 'react';
import { FlaskConical, Atom, Droplets, Fuel, Sparkles, Layers, ShieldCheck, ChevronRight, Info, AlertTriangle, ArrowRight } from 'lucide-react';
import { useStore } from '../../store';
import { Tags } from '../ui';
import { num, bnDigits } from '../../engine/dates';
import {
  calculateCEC,
  calculateBaseSaturation,
  calculateCarbonPools,
  calculateFossilDieselOffset,
  calculateNetEnvironmentalFootprint,
} from '../../engine/soilChemistry';

export default function SoilGeochemistryExplorer() {
  const { T, s } = useStore();
  const lang = s.lang;

  // Interactive state parameters
  const [clayPct, setClayPct] = useState(28); // %
  const [omPct, setOmPct] = useState(1.4);    // %
  const [pH, setPH] = useState(6.2);          // pH units
  const [isBarind, setIsBarind] = useState(false); // Pleistocene terrace vs active alluvium
  const [bighas, setBighas] = useState(3);     // bigha land area
  const [cropType, setCropType] = useState('mustard'); // 'mustard' | 'lentil' | 'boro'

  // Computed Geochemical & Physical Dynamics
  const cec = useMemo(
    () => calculateCEC({ clayPct, omPct, ph: pH }),
    [clayPct, omPct, pH]
  );

  const landform = isBarind ? 'barind' : 'alluvium';

  const bsResult = useMemo(
    () => calculateBaseSaturation({ cec, ph: pH, landform }),
    [cec, pH, landform]
  );

  // Bulk density estimate based on organic matter and clay
  const bulkDensityGcm3 = (1.55 - 0.05 * omPct - 0.002 * clayPct).toFixed(2);
  // Estimate total SOC in 0-30cm (t C/ha) = (OM / 1.724) * bulkDensity * 30
  const totalSOC_t_ha = Math.max(10, Math.round((omPct / 1.724) * parseFloat(bulkDensityGcm3) * 30));

  const carbonPools = useMemo(
    () => calculateCarbonPools({ totalCarbonTHa: totalSOC_t_ha, landform, clayPct }),
    [totalSOC_t_ha, landform, clayPct]
  );

  // Water savings relative to flooded Boro (approx mm saved per bigha)
  // Mustard: 180 mm saved
  // Lentil: 220 mm saved
  // Boro AWD: 70 mm saved
  const waterSavedMm = cropType === 'mustard' ? 180 : cropType === 'lentil' ? 220 : 70;

  const dieselOffset = useMemo(
    () => calculateFossilDieselOffset({ waterSavedMm, areaBigha: bighas }),
    [waterSavedMm, bighas]
  );

  const netFootprint = useMemo(
    () =>
      calculateNetEnvironmentalFootprint({
        icbmDeltaC: cropType === 'lentil' ? 0.65 : cropType === 'mustard' ? 0.45 : 0.15,
        ch4AvoidedKg: cropType === 'boro' ? 6 : 22,
        waterSavedMm,
        areaBigha: bighas,
      }),
    [cropType, waterSavedMm, bighas]
  );

  return (
    <section id="geochemistry" className="mt-12 scroll-mt-28 overflow-hidden rounded-[30px] border border-primary-200/90 bg-white/95 p-6 shadow-xl backdrop-blur-md sm:p-9">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-primary-100 text-primary-800 shadow-xs">
            <FlaskConical size={22} className="text-primary-700" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-[20px] font-bold tracking-tight text-ink sm:text-[24px]">
                {T('মাটির রসায়ন, জৈব কার্বন ও ডিজেল সাশ্রয়',
                   'Soil chemistry, organic carbon and diesel saved')}
              </h2>
              <Tags list={['MODEL', 'RULE']} />
            </div>
            <p className="text-[14px] text-muted">
              {T('ক্যাটায়ন বিনিময় ক্ষমতা (CEC), বেস স্যাচুরেশন, মাটির কার্বনের তিন ভাগ (ICBM ও RothC) ও কম সেচে বাঁচা ডিজেল',
                 'Cation exchange capacity (CEC), base saturation, soil carbon in three pools (ICBM and RothC), and the diesel saved by pumping less')}
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid: Controls on Left, Real-time Computation Results on Right */}
      <div className="mt-7 grid gap-8 lg:grid-cols-[1.1fr_1.3fr]">
        {/* Left Column: Interactive Geochemical & Agronomic Sliders */}
        <div className="flex flex-col gap-5 rounded-[24px] border border-border/80 bg-canvas/60 p-5">
          <h3 className="flex items-center gap-2 text-[15px] font-bold text-ink">
            <Atom size={17} className="text-primary-700" />
            {T('রাসায়নিক ও ভৌত প্যারামিটার নির্বাচন করুন', 'Adjust Geochemical & Physical Inputs')}
          </h3>

          {/* Crop Mode Switch */}
          <div>
            <label className="text-[12.5px] font-bold text-ink block mb-1.5">
              {T('ফসল নির্বাচন (টানা বোরোর বদলে)', 'Target Rabi Crop')}
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: 'mustard', bn: 'সরিষা', en: 'Mustard' },
                { id: 'lentil', bn: 'মসুর ডাল', en: 'Lentil' },
                { id: 'boro', bn: 'বোরো (AWD)', en: 'Boro AWD' },
              ].map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCropType(c.id)}
                  className={`rounded-xl py-2 px-1 text-center text-[12.5px] font-bold transition-all ${
                    cropType === c.id
                      ? 'border border-primary-600 bg-primary-600 text-white shadow-xs'
                      : 'border border-border bg-white text-ink hover:border-primary-300'
                  }`}
                >
                  {T(c.bn, c.en)}
                </button>
              ))}
            </div>
          </div>

          {/* Landform Switch: Barind Pleistocene vs Active Floodplain */}
          <div>
            <label className="text-[12.5px] font-bold text-ink block mb-1.5">
              {T('ভূমির ভূতাত্ত্বিক গঠন', 'Geological Formation')}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIsBarind(false)}
                className={`rounded-xl py-2 px-2.5 text-left text-[12.5px] font-bold transition-all ${
                  !isBarind
                    ? 'border border-primary-600 bg-primary-50 text-primary-900 shadow-xs ring-1 ring-primary-500/30'
                    : 'border border-border bg-white text-muted hover:border-primary-300'
                }`}
              >
                <span>{T('সক্রিয় প্লাবনভূমি পলি', 'Active Alluvial Plain')}</span>
                <span className="block text-[11px] font-normal text-muted">{T('ইল্লাইট ও স্মেকটাইট কাদা', 'Illite / Smectite rich')}</span>
              </button>
              <button
                type="button"
                onClick={() => setIsBarind(true)}
                className={`rounded-xl py-2 px-2.5 text-left text-[12.5px] font-bold transition-all ${
                  isBarind
                    ? 'border border-paddy-500 bg-paddy-50 text-paddy-700 shadow-xs ring-1 ring-paddy-500/30'
                    : 'border border-border bg-white text-muted hover:border-paddy-300'
                }`}
              >
                <span>{T('বরেন্দ্র প্রাচীন লাল মাটি', 'Barind Paleosol')}</span>
                <span className="block text-[11px] font-normal text-muted">{T('প্লাইস্টোসিন প্রাচীন মৃত্তিকা', 'Pleistocene weathered')}</span>
              </button>
            </div>
          </div>

          {/* Clay Content Slider */}
          <div>
            <div className="flex items-center justify-between text-[12.5px] font-bold text-ink">
              <span>{T('মাটির এঁটেল বা কাদার ভাগ (%)', 'Clay Fraction')}</span>
              <span className="text-primary-700 tabular">{T(`${bnDigits(clayPct)}%`, `${clayPct}%`)}</span>
            </div>
            <input
              type="range"
              min="5"
              max="65"
              step="1"
              value={clayPct}
              onChange={(e) => setClayPct(parseInt(e.target.value, 10))}
              className="mt-1.5 w-full accent-primary-600 cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-muted">
              <span>{T('বেলে দোআঁশ (৫%)', 'Sandy (5%)')}</span>
              <span>{T('পলি দোআঁশ (২৮%)', 'Loam (28%)')}</span>
              <span>{T('বরেন্দ্র ভারী এঁটেল (৬৫%)', 'Barind Heavy Clay (65%)')}</span>
            </div>
          </div>

          {/* Soil Organic Matter Slider */}
          <div>
            <div className="flex items-center justify-between text-[12.5px] font-bold text-ink">
              <span>{T('জৈব পদার্থ (%)', 'Organic Matter (OM %)')}</span>
              <span className="text-primary-700 tabular">{T(`${bnDigits(omPct.toFixed(1))}%`, `${omPct.toFixed(1)}%`)}</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="4.5"
              step="0.1"
              value={omPct}
              onChange={(e) => setOmPct(parseFloat(e.target.value))}
              className="mt-1.5 w-full accent-primary-600 cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-muted">
              <span>{T('অবনমিত মাটি (০.৫%)', 'Degraded (0.5%)')}</span>
              <span>{T('জাতীয় গড় (১.৪%)', 'National Avg (1.4%)')}</span>
              <span>{T('উর্বর আদর্শ মাটি (৪.৫%)', 'High Tilth (4.5%)')}</span>
            </div>
          </div>

          {/* Soil pH Slider */}
          <div>
            <div className="flex items-center justify-between text-[12.5px] font-bold text-ink">
              <span>{T('মাটির অম্লত্ব / ক্ষারত্ব (pH)', 'Soil pH Level')}</span>
              <span className="text-paddy-700 tabular">{T(bnDigits(pH.toFixed(1)), pH.toFixed(1))}</span>
            </div>
            <input
              type="range"
              min="4.5"
              max="8.5"
              step="0.1"
              value={pH}
              onChange={(e) => setPH(parseFloat(e.target.value))}
              className="mt-1.5 w-full accent-paddy-500 cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-muted">
              <span>{T('তীব্র অম্লীয় (৪.৫)', 'Acidic (4.5)')}</span>
              <span>{T('নিরপেক্ষ আদর্শ (৬.৫–৭.০)', 'Neutral (6.5–7.0)')}</span>
              <span>{T('ক্ষারীয় (৮.৫)', 'Alkaline (8.5)')}</span>
            </div>
          </div>

          {/* Land Area Slider */}
          <div className="pt-1 border-t border-border/60">
            <div className="flex items-center justify-between text-[12.5px] font-bold text-ink">
              <span>{T('জমির পরিমাণ', 'Field Size')}</span>
              <span className="text-primary-800 tabular">{T(`${bnDigits(bighas)} বিঘা`, `${bighas} bigha`)}</span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              step="1"
              value={bighas}
              onChange={(e) => setBighas(parseInt(e.target.value, 10))}
              className="mt-1 w-full accent-primary-700 cursor-pointer"
            />
          </div>
        </div>

        {/* Right Column: Real-time Geochemical & Environmental Results */}
        <div className="flex flex-col gap-5">
          {/* 1. CEC & Base Saturation Section */}
          <div className="rounded-[24px] border border-border bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[12.5px] font-bold uppercase tracking-wider text-muted block">
                  {T('ক্যাটায়ন বিনিময় ক্ষমতা (CEC)', 'Cation Exchange Capacity (CEC)')}
                </span>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="font-display text-[24px] font-bold text-primary-950 tabular">
                    {T(bnDigits(cec.toFixed(1)), cec.toFixed(1))}
                  </span>
                  <span className="text-[14px] font-semibold text-muted">cmol(+)/kg</span>
                </div>
              </div>

              {/* Base Saturation Pill */}
              <div className="text-right">
                <span className="text-[11px] font-semibold text-muted block">{T('বেস স্যাচুরেশন', 'Base Saturation')}</span>
                <span className="font-display text-[20px] font-bold text-primary-800 tabular">
                  {T(`${bnDigits(bsResult.baseSaturationPct.toFixed(0))}%`, `${bsResult.baseSaturationPct.toFixed(0)}%`)}
                </span>
              </div>
            </div>

            {/* Base Saturation Progress Bar */}
            <div className="mt-3">
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-canvas flex">
                <div
                  className="bg-primary-500 transition-all duration-300"
                  style={{ width: `${Math.min(100, bsResult.baseSaturationPct)}%` }}
                  title={T('বিনিময়যোগ্য ক্ষারীয় ক্যাটায়ন (Ca²⁺, Mg²⁺, K⁺, Na⁺)', 'Exchangeable Base Cations (Ca2+, Mg2+, K+, Na+)')}
                />
                <div
                  className="bg-paddy-300 transition-all duration-300"
                  style={{ width: `${Math.max(0, 100 - bsResult.baseSaturationPct)}%` }}
                  title={T('বিনিময়যোগ্য অম্লীয় ক্যাটায়ন (H⁺, Al³⁺)', 'Exchangeable Acid Cations (H+, Al3+)')}
                />
              </div>
              <div className="mt-1.5 flex justify-between text-[11px] text-muted">
                <span className="text-primary-700 font-medium">
                  {T(`ক্ষারীয় পুষ্টি ক্যাটায়ন (Ca²⁺, Mg²⁺, K⁺): ${bnDigits(bsResult.totalBasesCmol.toFixed(1))} cmol`,
                     `Base cations (Ca, Mg, K): ${bsResult.totalBasesCmol.toFixed(1)} cmol`)}
                </span>
                <span className="text-paddy-700 font-medium">
                  {T(`অম্লীয় ক্যাটায়ন (H⁺/Al³⁺): ${bnDigits(bsResult.acidityCmol.toFixed(1))} cmol`,
                     `Acid cations (H/Al): ${bsResult.acidityCmol.toFixed(1)} cmol`)}
                </span>
              </div>
            </div>

            <p className="mt-3 text-[12.5px] leading-relaxed text-ink/75 border-t border-border/60 pt-2.5">
              {T(
                `মাটির বাফারিং ক্ষমতা: ${bsResult.baseSaturationPct > 70 ? 'শক্তিশালী — ইউরিয়া সারের অম্লীয় প্রভাব সহজে প্রশমিত হয়।' : 'মাঝারি — অম্লত্ব রোধে জৈব সার ও ডলোমাইট প্রয়োগ উপকারী।'} পেডোট্রান্সফার সূত্র: CEC = ০.৪২×কাদা% + ২.১×জৈবপদার্থ% + pH-নির্ভর চার্জ।`,
                `Buffering capacity: ${bsResult.baseSaturationPct > 70 ? 'High — effectively neutralises nitrification acidity from urea.' : 'Moderate — organic amendments or agricultural lime beneficial.'} Pedotransfer: CEC = 0.42×Clay% + 2.1×OM% + pH-dependent charge.`
              )}
            </p>
          </div>

          {/* 2. Three-Pool Soil Carbon & Ancient Paleosol Stratum */}
          <div className="rounded-[24px] border border-paddy-100/90 bg-paddy-50/40 p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[12.5px] font-bold uppercase tracking-wider text-paddy-700 block">
                  {T('মাটির জৈব কার্বনের ভাণ্ডার', 'Soil organic carbon stock')}
                </span>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="font-display text-[24px] font-bold text-paddy-700 tabular">
                    {T(`${bnDigits(totalSOC_t_ha)} টন C/হেক্টর`, `${totalSOC_t_ha} t C/ha`)}
                  </span>
                  <span className="text-[12.5px] text-muted">{T('(০-৩০ সেমি স্তর)', '(0-30 cm stratum)')}</span>
                </div>
              </div>
              <span className="rounded-full bg-paddy-100/70 px-2.5 py-1 text-[12.5px] font-bold text-paddy-700">
                {T('ICBM ২ পুল + RothC নিষ্ক্রিয়', 'ICBM 2-pool + RothC inert')}
              </span>
            </div>

            {/* 3-Pool Visual Partition */}
            <div className="mt-3.5 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl border border-primary-200 bg-white p-2.5">
                <span className="block text-[11px] font-bold text-primary-800">{T('নতুন কার্বন (ICBM)', 'Young pool (ICBM)')}</span>
                <span className="font-display block text-[16.5px] font-bold text-primary-950 tabular mt-0.5">
                  {T(`${bnDigits(carbonPools.labile.tHa.toFixed(1))} টন`, `${carbonPools.labile.tHa.toFixed(1)} t`)}
                </span>
                <span className="block text-[11px] text-muted">{T(`গড় আয়ু ~${bnDigits(carbonPools.labile.residenceYears)} বছর`, `~${carbonPools.labile.residenceYears} yr residence`)}</span>
              </div>
              <div className="rounded-xl border border-sky-200 bg-white p-2.5">
                <span className="block text-[11px] font-bold text-sky-800">{T('পুরোনো কার্বন (ICBM)', 'Old pool (ICBM)')}</span>
                <span className="font-display block text-[16.5px] font-bold text-sky-900 tabular mt-0.5">
                  {T(`${bnDigits(carbonPools.humus.tHa.toFixed(1))} টন`, `${carbonPools.humus.tHa.toFixed(1)} t`)}
                </span>
                <span className="block text-[11px] text-muted">{T(`গড় আয়ু ~${bnDigits(carbonPools.humus.residenceYears)} বছর`, `~${carbonPools.humus.residenceYears} yr residence`)}</span>
              </div>
              <div className="rounded-xl border border-paddy-300 bg-paddy-100/60 p-2.5">
                <span className="block text-[11px] font-bold text-paddy-700">{T('নিষ্ক্রিয় কার্বন (RothC IOM)', 'Inert pool (RothC IOM)')}</span>
                <span className="font-display block text-[16.5px] font-bold text-paddy-700 tabular mt-0.5">
                  {T(`${bnDigits(carbonPools.inert.tHa.toFixed(1))} টন`, `${carbonPools.inert.tHa.toFixed(1)} t`)}
                </span>
                <span className="block text-[11px] text-paddy-700 font-semibold">{T('শতাব্দী থেকে হাজার বছর', 'centuries to millennia')}</span>
              </div>
            </div>

            <p className="mt-3 text-[12.5px] leading-relaxed text-paddy-700/80">
              {T(
                `ফসলচক্র বদলালে নড়ে প্রায় পুরোটাই পুরোনো আর নতুন কার্বন (${bnDigits(100 - carbonPools.inert.pct)}%)। নিষ্ক্রিয় অংশ (${bnDigits(carbonPools.inert.pct)}%) ফ্যালুন ও সহকর্মী (১৯৯৮)-এর সূত্রে: IOM = ০.০৪৯ × SOC^১.১৩৯। আয়ু মডেলের মান তাপমাত্রায়; বাংলাদেশের গরমে দুটোই দ্রুত ঘোরে।${carbonPools.mineralSoilOnly ? ' এই সূত্র খনিজ মাটির জন্য, পিট মাটিতে শুধু আন্দাজ।' : ''}`,
                `A change of rotation moves the young and old pools (${100 - carbonPools.inert.pct}% here). The inert part (${carbonPools.inert.pct}%) follows Falloon et al. (1998): IOM = 0.049 × SOC^1.139. Residence times are at the model's reference climate; Bangladesh's heat turns both faster.${carbonPools.mineralSoilOnly ? ' The equation was fitted on mineral soils, so for peat it is only a guide.' : ''}`
              )}
            </p>
          </div>

          {/* 3. Avoided Fossil Fuel Diesel Pumping Displacement */}
          <div className="rounded-[24px] border border-sky-200/90 bg-sky-50/50 p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[12.5px] font-bold uppercase tracking-wider text-sky-900 block">
                  {T('জীবাশ্ম ডিজেল সাশ্রয় ও বায়ুমণ্ডলীয় কার্বন নিঃসরণ হ্রাস', 'Avoided Fossil Diesel & Pumping Emission Offset')}
                </span>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="font-display text-[24px] font-bold text-sky-900 tabular">
                    {T(`${bnDigits(dieselOffset.dieselLitersSaved.toFixed(1))} লিটার ডিজেল`, `${dieselOffset.dieselLitersSaved.toFixed(1)} L Diesel`)}
                  </span>
                </div>
              </div>
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-sky-200/80 text-sky-900">
                <Fuel size={20} />
              </span>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 text-[12.5px]">
              <div className="rounded-xl bg-white p-2.5 border border-sky-100">
                <span className="text-muted block text-[11px]">{T('সরাসরি CO₂ নিঃসরণ রোধ', 'Fossil CO₂ Avoided')}</span>
                <span className="font-display text-[16.5px] font-bold text-sky-900 tabular">
                  {T(`${bnDigits(dieselOffset.avoidedCo2Kg.toFixed(1))} কেজি`, `${dieselOffset.avoidedCo2Kg.toFixed(1)} kg`)}
                </span>
              </div>
              <div className="rounded-xl bg-white p-2.5 border border-sky-100">
                <span className="text-muted block text-[11px]">{T('জ্বালানি খরচ সাশ্রয়', 'Fuel Cost Saved')}</span>
                <span className="font-display text-[16.5px] font-bold text-sky-900 tabular">
                  {T(`৳${num(dieselOffset.dieselCostSavedBdt, 'bn')}`, `BDT ${num(dieselOffset.dieselCostSavedBdt, 'en')}`)}
                </span>
              </div>
            </div>

            <div className="mt-2.5 pt-2 border-t border-sky-200/60 flex items-center justify-between text-[12.5px] text-sky-900 font-medium">
              <span>{T('মোট সার্বিক জলবায়ু প্রশমন (মিথেন + মাটি কার্বন + ডিজেল):', 'Net Climate Mitigation (CH₄ + SOC + Diesel):')}</span>
              <span className="font-bold text-primary-800 tabular">
                {T(`${num(netFootprint.netClimateMitigationCo2eKg, 'bn')} কেজি CO₂e`, `${num(netFootprint.netClimateMitigationCo2eKg, 'en')} kg CO₂e`)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
