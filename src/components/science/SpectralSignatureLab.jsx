// Interactive Remote Sensing & Multispectral Signature Laboratory.
// Visualizes the physics of electromagnetic reflectance (VNIR / SWIR), the "Red Edge",
// and step-by-step live mathematical derivation of NDVI and NDWI vegetation health indices.
import { useState, useMemo } from 'react';
import {
  Sun,
  Leaf,
  Droplets,
  Layers,
  Sparkles,
  Activity,
  Calculator,
  ChevronRight,
  Info,
  Sliders,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { useStore } from '../../store';
import { Card, Tags, Badge } from '../ui';
import { num, bnDigits } from '../../engine/dates';

// Standardized Spectral Reflectance Curves (% reflectance across wavelength nm)
// Sampled at 12 representative wavelengths from Visible to SWIR
const WAVELENGTHS = [
  { nm: 440, bn: 'কোস্টাল নীল', en: 'Coastal Blue', band: 'S2 B1 / L8 B1' },
  { nm: 490, bn: 'নীল', en: 'Blue', band: 'S2 B2 / L8 B2' },
  { nm: 560, bn: 'সবুজ', en: 'Green', band: 'S2 B3 / L8 B3' },
  { nm: 665, bn: 'লাল', en: 'Red', band: 'S2 B4 / L8 B4' },
  { nm: 705, bn: 'রেড এজ ১', en: 'Red Edge 1', band: 'S2 B5' },
  { nm: 740, bn: 'রেড এজ ২', en: 'Red Edge 2', band: 'S2 B6' },
  { nm: 783, bn: 'রেড এজ ৩', en: 'Red Edge 3', band: 'S2 B7' },
  { nm: 842, bn: 'নিয়ার-ইনফ্রারেড (সংকীর্ণ)', en: 'NIR (Narrow)', band: 'S2 B8A / L8 B5' },
  { nm: 945, bn: 'জলীয় বাষ্প', en: 'Water Vapour', band: 'S2 B9' },
  { nm: 1375, bn: 'সিরাস মেঘ', en: 'Cirrus', band: 'S2 B10' },
  { nm: 1610, bn: 'SWIR-1', en: 'SWIR-1', band: 'S2 B11 / L8 B6' },
  { nm: 2190, bn: 'SWIR-2', en: 'SWIR-2', band: 'S2 B12 / L8 B7' },
];

const TARGET_SIGNATURES = [
  {
    id: 'healthy_rice',
    shortLabel: { bn: 'সুস্থ বোরো ধান', en: 'HEALTHY RICE' },
    nameBn: 'সুস্থ বোরো ধান (সবুজ ক্যানোপি)',
    nameEn: 'Healthy Boro Rice (Dense Green Canopy)',
    color: '#16a34a',
    curve: [3, 4, 9, 3.5, 16, 38, 46, 48, 44, 6, 22, 10], // typical dense green crop canopy (USGS splib07, Jensen 2007)
    redReflectance: 5.2,
    nirReflectance: 84.1,
    swirReflectance: 38.0,
    chlorophyllStateBn: 'উচ্চ ক্লোরোফিল (লাল আলো ৯৫% শোষণ); স্পঞ্জি মেসোফিলের কারণে নিয়ার-ইনফ্রারেড (NIR) ব্যাপক প্রতিফলন।',
    chlorophyllStateEn: 'High chlorophyll (absorbs ~95% of red photons); spongy mesophyll cell structure strongly scatters NIR light.',
    healthVerdictBn: 'সর্বোচ্চ বৃদ্ধি ও স্বাস্থ্যকর দানা গঠন (বোরো মৌসুম)',
    healthVerdictEn: 'Optimum vegetative biomass & grain filling stage',
    badgeTone: 'green',
  },
  {
    id: 'stressed_mustard',
    shortLabel: { bn: 'চাপগ্রস্ত সরিষা', en: 'STRESSED MUSTARD' },
    nameBn: 'চাপগ্রস্ত রবি সরিষা (খরা ও গরমের তাপ)',
    nameEn: 'Stressed Rabi Mustard (Drought & Heat Stress)',
    color: '#ea580c',
    curve: [7, 9, 15, 13, 22, 29, 33, 35, 32, 8, 32, 22], // chlorophyll loss: red up, NIR plateau down, SWIR up as leaves dry
    redReflectance: 24.0,
    nirReflectance: 45.0,
    swirReflectance: 56.0,
    chlorophyllStateBn: 'ক্লোরোফিল ক্ষয়প্রাপ্ত ও পানি শূন্যতা; লাল আলোর প্রতিফলন বেড়ে গেছে এবং ভেতরের কোষ ভাঙায় NIR প্রতিফলন কমে গেছে।',
    chlorophyllStateEn: 'Chlorophyll degradation and cellular dehydration; red reflectance rises and NIR scattering collapses.',
    healthVerdictBn: 'মার্চ মাসের গরমে ও পানি সংকটে ফলন হ্রাস ঝুঁকি',
    healthVerdictEn: 'High yield loss risk due to high heat & soil moisture deficit',
    badgeTone: 'amber',
  },
  {
    id: 'bare_soil',
    shortLabel: { bn: 'অনাবৃত মাটি', en: 'BARE SOIL' },
    nameBn: 'অনাবৃত দোআঁশ মাটি (ফসল বোনার আগে)',
    nameEn: 'Bare Loam Soil (Pre-sowing tilled field)',
    color: '#854d0e',
    curve: [10, 13, 17, 21, 23, 25, 27, 29, 26, 22, 36, 32],
    redReflectance: 21.0,
    nirReflectance: 29.0,
    swirReflectance: 36.0,
    chlorophyllStateBn: 'কোনো উদ্ভিজ্জ কোষ বা ক্লোরোফিল নেই; বর্ণালী জুড়ে ধীরে ধীরে সমভাবে প্রতিফলন বৃদ্ধি পায়।',
    chlorophyllStateEn: 'Zero cellular structure or chlorophyll absorption; monotonic gradual slope across the spectrum.',
    healthVerdictBn: 'অনাবৃত জমি (জৈব পদার্থ ও আর্দ্রতার উপর নির্ভর করে)',
    healthVerdictEn: 'Unvegetated ground (governed by soil organic matter & moisture)',
    badgeTone: 'slate',
  },
  {
    id: 'floodwater',
    shortLabel: { bn: 'প্লাবন পানি', en: 'FLOODWATER' },
    nameBn: 'আমন প্লাবন ও পরিষ্কার পানি',
    nameEn: 'Standing Floodwater / Waterlogged Field',
    color: '#0284c7',
    curve: [6, 8, 10, 8, 6, 3, 2, 1.5, 0.6, 0.1, 0.1, 0.05], // silty floodwater: green-red peak from sediment, near zero beyond 900 nm
    redReflectance: 3.0,
    nirReflectance: 0.5,
    swirReflectance: 0.1,
    chlorophyllStateBn: 'পানি দৃশ্যমান নীল-সবুজ কিছুটা প্রতিফলিত করে, কিন্তু নিয়ার-ইনফ্রারেড (NIR) ও SWIR প্রায় ১০০% সম্পূর্ণ শোষণ করে নেয়।',
    chlorophyllStateEn: 'Water slightly reflects blue/green but near-completely absorbs NIR and SWIR wavelengths.',
    healthVerdictBn: 'প্লাবিত জলমগ্ন জমি (আমন রোপণ অথবা বর্ষার বন্যা)',
    healthVerdictEn: 'Submerged field condition (favourable for Aman paddy or flood)',
    badgeTone: 'blue',
  },
];

export default function SpectralSignatureLab() {
  const { s, T, L } = useStore();
  const lang = s.lang;

  const [activeTargetId, setActiveTargetId] = useState('healthy_rice');
  const [selectedProbeIndex, setSelectedProbeIndex] = useState(7); // default on NIR 842 nm
  const [chlorophyllSlider, setChlorophyllSlider] = useState(85); // 0-100%

  const activeTarget = useMemo(
    () => TARGET_SIGNATURES.find((t) => t.id === activeTargetId) ?? TARGET_SIGNATURES[0],
    [activeTargetId]
  );

  // Dynamic adjusted reflectance based on chlorophyll slider
  const dynamicCurve = useMemo(() => {
    if (activeTarget.id !== 'healthy_rice' && activeTarget.id !== 'stressed_mustard') {
      return activeTarget.curve;
    }
    const factor = chlorophyllSlider / 100;
    const r1 = (x) => Math.round(x * 10) / 10;
    return activeTarget.curve.map((val, idx) => {
      // Visible bands (440–665 nm): more chlorophyll absorbs more blue and red light
      if (idx <= 3) return Math.max(2, r1(val * (1.8 - factor * 1.2)));
      // Red edge (705 nm) moves half as much; the NIR plateau (740–945 nm) rises with leaf area and cell structure
      if (idx === 4) return r1(val * (0.75 + factor * 0.3));
      if (idx >= 5 && idx <= 8) return Math.min(60, r1(val * (0.5 + factor * 0.6)));
      return val;
    });
  }, [activeTarget, chlorophyllSlider]);

  const redVal = dynamicCurve[3];
  const nirVal = dynamicCurve[7];
  const swirVal = dynamicCurve[10];

  // Mathematical Index Derivations
  const ndvi = useMemo(() => {
    const denom = nirVal + redVal;
    if (denom === 0) return 0;
    return (nirVal - redVal) / denom;
  }, [nirVal, redVal]);

  const ndwi = useMemo(() => {
    const denom = nirVal + swirVal;
    if (denom === 0) return 0;
    return (nirVal - swirVal) / denom;
  }, [nirVal, swirVal]);

  const probe = WAVELENGTHS[selectedProbeIndex];
  const probeVal = dynamicCurve[selectedProbeIndex];

  return (
    <Card className="mt-8 overflow-hidden border-border bg-gradient-to-br from-white via-primary-50/20 to-sky-50/30 p-5 sm:p-7 shadow-sm">
      {/* Header Block */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-100 text-primary-800 ring-1 ring-primary-500/20">
              <Sun size={20} className="text-paddy-500" />
            </span>
            <h2 className="text-[20px] font-bold tracking-tight text-ink sm:text-[24px]">
              {T('মাল্টি-স্পেকট্রাল বর্ণালী ও এনডিভিআই (NDVI) ল্যাবরেটরি', 'Multispectral Spectral Signature & NDVI Physics Lab')}
            </h2>
          </div>
          <p className="mt-1.5 text-[14px] leading-relaxed text-ink/75">
            {T(
              'মহাকাশের সেন্সর কীভাবে ফসল, মাটি ও পানির পার্থক্য চেনে? সূর্যরশ্মির তরঙ্গদৈর্ঘ্য, পাতার ভেতরের স্পঞ্জি কোষের প্রতিফলন, "রেড এজ" উল্লম্ফন এবং এনডিভিআই গণনার বাস্তব গাণিতিক সূত্রের প্রতিটি ধাপ পরীক্ষা করুন।',
              'How satellite sensors distinguish green crops, dry soil, and floodwater: explore electromagnetic reflectance, chlorophyll absorption, the structural "Red Edge", and live step-by-step NDVI calculation.'
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone="green">{T('বায়োফিজিক্যাল পদার্থবিজ্ঞান', 'Biophysical Physics')}</Badge>
          <Tags list={['SAT', 'RULE']} />
        </div>
      </div>

      {/* Target Selector Buttons */}
      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {TARGET_SIGNATURES.map((t) => {
          const isSelected = t.id === activeTargetId;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTargetId(t.id)}
              className={`flex flex-col rounded-2xl border p-3 text-left transition-all duration-200 cursor-pointer ${
                isSelected
                  ? 'border-primary-600 bg-white shadow-md ring-2 ring-primary-500/20'
                  : 'border-border bg-white/70 hover:border-primary-300 hover:bg-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: t.color }} />
                {isSelected && <CheckCircle2 size={15} className="text-primary-700" />}
              </div>
              <span className="mt-2 text-[14px] font-bold text-ink leading-snug">
                {lang === 'bn' ? t.nameBn : t.nameEn}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Interactive Chart & Spectral Curve */}
      <div className="mt-6 rounded-2xl border border-border/80 bg-white p-4 sm:p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: activeTarget.color }} />
            <h3 className="text-[16.5px] font-bold text-ink">
              {lang === 'bn' ? activeTarget.nameBn : activeTarget.nameEn} — {T('প্রতিফলন কার্ভ (%)', 'Reflectance Signature (%)')}
            </h3>
          </div>
          <div className="flex items-center gap-3 text-[12.5px] text-muted">
            <span className="flex items-center gap-1">
              <span className="h-2 w-4 rounded-sm bg-red-500 inline-block" /> {T('লাল আলো (৬৬৫ nm)', 'Red 665nm')}
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-4 rounded-sm bg-primary-500 inline-block" /> {T('নিয়ার-ইনফ্রারেড (NIR ৮৪২ nm)', 'NIR 842nm')}
            </span>
          </div>
        </div>

        {/* SVG Spectral Graph Visualizer */}
        <div className="mt-4 relative h-[220px] sm:h-[260px] w-full">
          <svg className="w-full h-full overflow-visible" viewBox="0 0 700 240" preserveAspectRatio="none" role="img" aria-label={T('বর্ণালী প্রতিফলন লেখচিত্র', 'Spectral reflectance chart')}>
            {/* Background Spectrum Gradient Bands */}
            <defs>
              <linearGradient id="spectrumLight" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.15" /> {/* Blue */}
                <stop offset="25%" stopColor="#22c55e" stopOpacity="0.15" /> {/* Green */}
                <stop offset="40%" stopColor="#ef4444" stopOpacity="0.15" /> {/* Red */}
                <stop offset="55%" stopColor="#84cc16" stopOpacity="0.1" /> {/* Red Edge */}
                <stop offset="70%" stopColor="#10b981" stopOpacity="0.2" /> {/* NIR */}
                <stop offset="100%" stopColor="#6366f1" stopOpacity="0.1" /> {/* SWIR */}
              </linearGradient>
            </defs>

            <rect x="50" y="10" width="630" height="190" fill="url(#spectrumLight)" rx="8" />

            {/* Grid Lines */}
            {[0, 15, 30, 45, 60].map((pct) => {
              const y = 200 - (pct / 60) * 190;
              return (
                <g key={pct}>
                  <line x1="50" y1={y} x2="680" y2={y} stroke="#e3eadf" strokeDasharray="3 3" />
                  <text x="40" y={y + 4} textAnchor="end" fill="#7b8c80" fontSize="10" fontFamily="monospace">
                    {num(pct, lang)}%
                  </text>
                </g>
              );
            })}

            {/* Wavelength Column Ticks */}
            {WAVELENGTHS.map((wl, i) => {
              const x = 50 + (i / (WAVELENGTHS.length - 1)) * 630;
              return (
                <g key={wl.nm}>
                  <line x1={x} y1="200" x2={x} y2="206" stroke="#8a9a8e" />
                  <text x={x} y="222" textAnchor="middle" fill="#526458" fontSize="10.5" fontFamily="monospace">
                    {lang === 'bn' ? bnDigits(wl.nm) : wl.nm}
                  </text>
                </g>
              );
            })}

            {/* The Continuous Reflectance Path Curve */}
            {(() => {
              const points = dynamicCurve.map((val, i) => {
                const x = 50 + (i / (WAVELENGTHS.length - 1)) * 630;
                const y = 200 - (Math.min(val, 60) / 60) * 190;
                return `${x},${y}`;
              });
              const pathD = `M ${points.join(' L ')}`;

              return (
                <>
                  {/* Shaded Area Below Curve */}
                  <path
                    d={`M 50,200 L ${points.join(' L ')} L 680,200 Z`}
                    fill={activeTarget.color}
                    fillOpacity="0.12"
                  />
                  {/* Thick Line */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke={activeTarget.color}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {/* Markers on Key Bands */}
                  {dynamicCurve.map((val, i) => {
                    const x = 50 + (i / (WAVELENGTHS.length - 1)) * 630;
                    const y = 200 - (Math.min(val, 60) / 60) * 190;
                    const isProbe = i === selectedProbeIndex;
                    const isRedBand = i === 3;
                    const isNirBand = i === 7;

                    return (
                      <g key={i} onClick={() => setSelectedProbeIndex(i)} className="cursor-pointer">
                        <circle
                          cx={x}
                          cy={y}
                          r={isProbe ? 7 : isRedBand || isNirBand ? 5.5 : 4}
                          fill={isRedBand ? '#ef4444' : isNirBand ? '#10b981' : activeTarget.color}
                          stroke="#ffffff"
                          strokeWidth={isProbe ? 2.5 : 1.5}
                        />
                        {(isRedBand || isNirBand || isProbe) && (
                          <text
                            x={x}
                            y={y - 10}
                            textAnchor="middle"
                            fill="#13261b"
                            fontSize="11"
                            fontWeight="bold"
                            fontFamily="monospace"
                          >
                            {num(val, lang, { dp: 1 })}%
                          </text>
                        )}
                      </g>
                    );
                  })}
                </>
              );
            })()}

            {/* Red Edge Annotation Bracket (between Red 665nm and NIR 842nm) */}
            {activeTarget.id === 'healthy_rice' && (
              <g>
                <line x1="150" y1="40" x2="400" y2="40" stroke="#16a34a" strokeWidth="1.5" strokeDasharray="4 2" />
                <text x="275" y="32" textAnchor="middle" fill="#15803d" fontSize="11" fontWeight="bold">
                  {T('রেড এজ (Red Edge) উল্লম্ফন ↑', 'The "Red Edge" Steep Rise ↑')}
                </text>
              </g>
            )}
          </svg>
        </div>

        {/* Selected Spectral Band Probe Info Bar */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-canvas p-3 border border-border">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-100 text-sky-800 text-[12.5px] font-bold">
              λ
            </span>
            <div>
              <span className="text-[12.5px] text-muted">{T('নির্বাচিত তরঙ্গদৈর্ঘ্য ব্যান্ড:', 'Selected Band Probe:')}</span>
              <span className="ml-1.5 text-[14px] font-bold text-ink font-mono">
                {lang === 'bn' ? bnDigits(probe.nm) : probe.nm} nm — {L(probe)} ({probe.band})
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[12.5px] text-muted">{T('প্রতিফলন:', 'Reflectance:')}</span>
            <span className="rounded-lg bg-white px-2.5 py-0.5 text-[14px] font-bold font-mono text-ink border border-border shadow-2xs">
              {num(probeVal, lang, { dp: 1 })}%
            </span>
          </div>
        </div>

        {/* Leaf Chlorophyll Vigor Interactive Slider (Only for vegetation targets) */}
        {(activeTarget.id === 'healthy_rice' || activeTarget.id === 'stressed_mustard') && (
          <div className="mt-4 rounded-xl bg-primary-50/60 p-3.5 border border-primary-200">
            <div className="flex items-center justify-between">
              <label htmlFor="chloro-slider" className="text-[14px] font-bold text-primary-950 flex items-center gap-1.5">
                <Leaf size={15} className="text-primary-700" />
                {T('পাতার ক্লোরোফিল ও ক্যানোপি ঘনত্ব পরীক্ষা:', 'Adjust Leaf Chlorophyll & Canopy Density:')}
              </label>
              <span className="font-mono text-[14px] font-bold text-primary-800">{num(chlorophyllSlider, lang)}%</span>
            </div>
            <input
              id="chloro-slider"
              type="range"
              min="15"
              max="100"
              value={chlorophyllSlider}
              onChange={(e) => setChlorophyllSlider(Number(e.target.value))}
              className="mt-2 w-full accent-primary-600 cursor-pointer"
            />
            <p className="mt-1 text-[12.5px] text-primary-900/80">
              {T(
                'স্লাইডারটি নাড়িয়ে দেখুন: পাতা যত সুস্থ হয়, লাল আলো (Red) শোষণ তত বাড়ে এবং নিয়ার-ইনফ্রারেড (NIR) প্রতিফলন লাফিয়ে ওঠে।',
                'Slide to observe live dynamics: healthier leaves absorb more Red light while spongy cell layers scatter NIR light.'
              )}
            </p>
          </div>
        )}
      </div>

      {/* Step-by-Step Mathematical NDVI Computation HUD */}
      <div className="mt-6 rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50/80 via-white to-primary-50/50 p-5 shadow-xs">
        <div className="flex items-center gap-2 border-b border-sky-100 pb-3">
          <Calculator size={18} className="text-sky-700" />
          <h3 className="text-[16.5px] font-bold text-ink">
            {T('বাস্তব গাণিতিক সূত্র: উপগ্রহ থেকে এনডিভিআই (NDVI) গণনা', 'Live Satellite Math: NDVI Formula Derivation')}
          </h3>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* NDVI Mathematical Breakdown */}
          <div className="rounded-xl border border-border bg-white p-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[12.5px] font-bold uppercase tracking-wider text-primary-800">
                {T('নর্মালাইজড ডিফারেন্স ভেজিটেশন ইনডেক্স (NDVI)', 'Normalised Difference Vegetation Index')}
              </span>
              <Badge tone={activeTarget.badgeTone}>{L(activeTarget.shortLabel)}</Badge>
            </div>

            {/* Formula Presentation */}
            <div className="mt-3 rounded-xl bg-primary-950 p-3.5 text-center text-white font-mono shadow-inner">
              <div className="text-[15px] font-bold text-primary-400">
                NDVI = (NIR − Red) / (NIR + Red)
              </div>
              <div className="mt-1 text-[14px] text-primary-100">
                = ({num(nirVal, lang, { dp: 1 })}% − {num(redVal, lang, { dp: 1 })}%) / ({num(nirVal, lang, { dp: 1 })}% + {num(redVal, lang, { dp: 1 })}%)
              </div>
              <div className="mt-1 text-[14px] text-primary-100">
                = {lang === 'bn' ? bnDigits((nirVal - redVal).toFixed(1)) : (nirVal - redVal).toFixed(1)} / {lang === 'bn' ? bnDigits((nirVal + redVal).toFixed(1)) : (nirVal + redVal).toFixed(1)}
              </div>
              <div className="mt-2 text-[24px] font-extrabold text-paddy-300 tracking-wider">
                = {lang === 'bn' ? bnDigits(ndvi >= 0 ? `+${ndvi.toFixed(2)}` : ndvi.toFixed(2)) : (ndvi >= 0 ? `+${ndvi.toFixed(2)}` : ndvi.toFixed(2))}
              </div>
            </div>

            {/* Metric Interpretation Meter */}
            <div className="mt-3">
              <div className="flex items-center justify-between text-[12.5px] text-muted font-mono">
                <span>{T('−১.০ (পানি/মেঘ)', '−1.0 (Water/Cloud)')}</span>
                <span>{T('০.০ (খালি মাটি)', '0.0 (Bare Soil)')}</span>
                <span>{T('+১.০ (ঘন সবুজ ফসল)', '+1.0 (Dense Crop)')}</span>
              </div>
              <div className="mt-1 h-3 w-full rounded-full bg-gradient-to-r from-sky-500 via-paddy-100 to-primary-600 relative overflow-hidden shadow-inner">
                {/* Pointer indicator */}
                <div
                  className="absolute top-0 bottom-0 w-2.5 bg-black rounded-full ring-2 ring-white transition-all duration-300"
                  style={{ left: `${Math.max(0, Math.min(100, ((ndvi + 1) / 2) * 100))}%` }}
                />
              </div>
            </div>
          </div>

          {/* NDWI Water Index & Biophysical Interpretation */}
          <div className="rounded-xl border border-border bg-white p-4 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[12.5px] font-bold uppercase tracking-wider text-sky-800">
                  {T('নর্মালাইজড ডিফারেন্স ওয়াটার ইনডেক্স (NDWI)', 'Normalised Difference Water Index (NDWI)')}
                </span>
                <span className="text-[11px] font-mono text-muted">{T('গাও (১৯৯৬)', 'Gao (1996)')}</span>
              </div>

              <div className="mt-2.5 rounded-lg bg-sky-50 p-2.5 text-center font-mono text-[14px] text-sky-900 border border-sky-100">
                NDWI = (NIR − SWIR) / (NIR + SWIR) = <span className="font-bold text-[15px]">{lang === 'bn' ? bnDigits(ndwi >= 0 ? `+${ndwi.toFixed(2)}` : ndwi.toFixed(2)) : (ndwi >= 0 ? `+${ndwi.toFixed(2)}` : ndwi.toFixed(2))}</span>
              </div>

              <div className="mt-3 text-[14px] leading-relaxed text-ink/80">
                <div className="font-bold text-ink flex items-center gap-1.5">
                  <Activity size={14} className="text-primary-700" />
                  {T('উদ্ভিজ্জ অবস্থা ও মাটির তাৎপর্য:', 'Biophysical State Interpretation:')}
                </div>
                <p className="mt-1 text-ink/75">
                  {lang === 'bn' ? activeTarget.chlorophyllStateBn : activeTarget.chlorophyllStateEn}
                </p>
              </div>
            </div>

            <div className="mt-3 rounded-lg bg-canvas p-2.5 text-[12.5px] text-ink border border-border">
              <span className="font-semibold text-ink">{T('মাঠপর্যায়ের রায়:', 'Field Verdict:')}</span>{' '}
              {lang === 'bn' ? activeTarget.healthVerdictBn : activeTarget.healthVerdictEn}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
