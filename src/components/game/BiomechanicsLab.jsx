import { useState, useEffect, useRef, useMemo } from 'react';
import { Activity, Dumbbell, Flame, Heart, Compass, Layers, ShieldCheck, Play, Pause, RotateCcw, Sparkles, Droplets, Zap, ChevronRight, Eye, Gauge, Clock, AlertTriangle, CheckCircle2, FlaskConical, Atom, ZoomIn, ZoomOut } from 'lucide-react';
import { useStore } from '../../store';
import { Tags } from '../ui';
import { num, bnDigits } from '../../engine/dates';
import { REGIONS, FARMER_IDS } from '../../game/regions';
import { muscleLoads } from '../../game/biomechPose';
import {
  calculateCEC,
  calculateBaseSaturation,
  calculateCarbonPools,
  calculateFossilDieselOffset,
  calculateNetEnvironmentalFootprint,
} from '../../engine/soilChemistry';

// 6 distinct agricultural biomechanical actions with physiological kinematic parameters
const ACTIONS = {
  transplant: {
    id: 'transplant',
    name: { bn: 'ধান রোপণ', en: 'Paddy Transplanting' },
    desc: {
      bn: 'কাদামাটিতে ঝুঁকে ধানের চারা লাগানো: কোমর ও হাঁটুর ওপর দীর্ঘস্থায়ী চাপ, কিন্তু ধীর ও পরিমিত গতি।',
      en: 'Forward crouch planting in mud: continuous lumbar and knee flexion, slow measured gait.',
    },
    torsoFlexion: 44, // degrees forward tilt
    kneeFlexion: 62,  // degrees bent
    cadence: 18,      // plants / min
    l4l5Compression: 1980, // Newtons
    metabolicWatts: 320,   // Watts
    kcalPerHour: 345,
    respirationRate: 24,   // breaths/min
    tool: { bn: 'ধানের চারা গুচ্ছ', en: 'Seedling cluster' },
    toolMassKg: 0.25,
    stressProfile: { lumbar: 82, knee: 74, shoulder: 35, cardiac: 58 },
  },
  hoe: {
    id: 'hoe',
    name: { bn: 'কোদাল কোপানো', en: 'Kodal / Hoe Striking' },
    desc: {
      bn: 'মাটি কোপানো ও আল বাঁধা: ওপর থেকে নিচে গতিশক্তি সঞ্চালন, সর্বোচ্চ পেশী শক্তি ও কম্পন প্রভাব।',
      en: 'Trenching and ridge building: vertical kinetic energy transfer, high muscle impulse and vibration.',
    },
    torsoFlexion: 32,
    kneeFlexion: 38,
    cadence: 26,      // strikes / min
    l4l5Compression: 2540, // Newtons
    metabolicWatts: 440,
    kcalPerHour: 450,
    respirationRate: 32,
    tool: { bn: 'ভারী দেশি কোদাল (৩.২ কেজি)', en: 'Forged iron kodal (3.2 kg)' },
    toolMassKg: 3.2,
    stressProfile: { lumbar: 94, knee: 60, shoulder: 88, cardiac: 84 },
  },
  spray: {
    id: 'spray',
    name: { bn: 'ন্যাপস্যাক স্প্রেয়ার', en: 'Knapsack Spraying' },
    desc: {
      bn: 'পিঠে ১৬ কেজির ট্যাংক নিয়ে সোজা হেঁটে স্প্রে: মাধ্যাকর্ষণ কেন্দ্র উপরে ওঠে, কাঁধ ও গোড়ালির ভারসাম্য জরুরি।',
      en: 'Walking with a 16 kg backpack tank: elevated centre of gravity, sustained shoulder and ankle stability.',
    },
    torsoFlexion: 10,
    kneeFlexion: 20,
    cadence: 52,      // paces / min
    l4l5Compression: 1620,
    metabolicWatts: 280,
    kcalPerHour: 295,
    respirationRate: 22,
    tool: { bn: 'ন্যাপস্যাক প্রেসার স্প্রেয়ার (১৬ লিটার)', en: 'Knapsack sprayer (16 L tank)' },
    toolMassKg: 18.5,
    stressProfile: { lumbar: 58, knee: 48, shoulder: 92, cardiac: 62 },
  },
  sickle: {
    id: 'sickle',
    name: { bn: 'কাঁচি দিয়ে ফসল কাটা', en: 'Sickle Harvesting' },
    desc: {
      bn: 'মাটির কাছাকাছি স্কোয়াট পজিশনে ধান কাটা: গভীর হাঁটু বাঁকানো ও কবজির কাটিং মোশন।',
      en: 'Deep squat reaping close to root crown: extreme knee flexion and rapid repetitive wrist shear.',
    },
    torsoFlexion: 50,
    kneeFlexion: 78,
    cadence: 38,      // sweeps / min
    l4l5Compression: 2220,
    metabolicWatts: 360,
    kcalPerHour: 380,
    respirationRate: 28,
    tool: { bn: 'দাঁতালো ইস্পাত কাঁচি (০.৪৫ কেজি)', en: 'Toothed steel sickle (0.45 kg)' },
    toolMassKg: 0.45,
    stressProfile: { lumbar: 88, knee: 96, shoulder: 65, cardiac: 72 },
  },
  basket: {
    id: 'basket',
    name: { bn: 'মাথায় ফসল বহন', en: 'Headload Basket Transport' },
    desc: {
      bn: 'মাঠে তোলা ফসল খাঁচায় ভরে আইল দিয়ে মাথায় বহন: উল্লম্ব মেরুদণ্ড সংকোচন ও কর্দমাক্ত পথ ব্যালেন্স।',
      en: 'Carrying harvested produce in a bamboo head basket: axial cervical/lumbar compression and bund stability.',
    },
    torsoFlexion: 6,
    kneeFlexion: 24,
    cadence: 48,      // steps / min
    l4l5Compression: 2350,
    metabolicWatts: 390,
    kcalPerHour: 410,
    respirationRate: 26,
    tool: { bn: 'বাঁশের ধানের খাঁচা (২২ কেজি)', en: 'Bamboo harvest basket (22 kg)' },
    toolMassKg: 22.0,
    stressProfile: { lumbar: 78, knee: 82, shoulder: 95, cardiac: 76 },
  },
  weeding: {
    id: 'weeding',
    name: { bn: 'হাত নিড়ানি দিয়ে আগাছা দমন', en: 'Manual Weeding (Nirani)' },
    desc: {
      bn: 'শাকসবজি ও ডাল জমিতে হাঁটু ও গোড়ালিতে বসে নিড়ানি: দীর্ঘস্থায়ী নিতম্ব ও পায়ের পেশীর স্থিতি।',
      en: 'Low squat weeding with a hand scraper in pulse/veg beds: sustained posterior chain endurance.',
    },
    torsoFlexion: 42,
    kneeFlexion: 82,
    cadence: 30,      // weed plucks / min
    l4l5Compression: 1850,
    metabolicWatts: 250,
    kcalPerHour: 260,
    respirationRate: 20,
    tool: { bn: 'দেশি লোহার নিড়ানি (০.৩ কেজি)', en: 'Iron hand nirani (0.3 kg)' },
    toolMassKg: 0.3,
    stressProfile: { lumbar: 80, knee: 92, shoulder: 42, cardiac: 48 },
  },
};

// 4 Bengal delta soil strata with geotechnical, chemical & fossil carbon parameters
const SOILS = {
  wetland: {
    id: 'wetland',
    name: { bn: 'কাদাময় প্লাবনভূমি পলি', en: 'Puddled Wetland Silt' },
    color: '#3d3024',
    waterContentPct: 42,
    cohesionKPa: 4.5,
    frictionAngleDeg: 12,
    shearStrengthKPa: 8.5,
    penetrationResistanceMPa: 0.35,
    footSinkageCm: 5.2,
    viscousDragFactor: 2.4,
    omPct: 2.2,
    clayPct: 35,
    ph: 6.4,
    landform: 'alluvium',
    geology: { bn: 'হোলোসিন প্লাবন পলল ও পলিমাটি', en: 'Holocene alluvial mud & silt' },
  },
  barind: {
    id: 'barind',
    name: { bn: 'বরেন্দ্র শক্ত লাল এঁটেল', en: 'Barind Compacted Paleosol' },
    color: '#8b3d24',
    waterContentPct: 18,
    cohesionKPa: 28.0,
    frictionAngleDeg: 26,
    shearStrengthKPa: 42.0,
    penetrationResistanceMPa: 2.85,
    footSinkageCm: 0.6,
    viscousDragFactor: 1.0,
    omPct: 1.1,
    clayPct: 42,
    ph: 5.2,
    landform: 'barind',
    geology: { bn: 'প্লাইস্টোসিন প্রাচীন লাল মাটি (মধুপুর)', en: 'Pleistocene weathered paleosol' },
  },
  loam: {
    id: 'loam',
    name: { bn: 'চর ও নদীর বেলে দোআঁশ', en: 'Riverine Sandy Loam' },
    color: '#7a6042',
    waterContentPct: 24,
    cohesionKPa: 12.0,
    frictionAngleDeg: 34,
    shearStrengthKPa: 22.5,
    penetrationResistanceMPa: 1.20,
    footSinkageCm: 1.8,
    viscousDragFactor: 1.3,
    omPct: 1.6,
    clayPct: 20,
    ph: 6.8,
    landform: 'alluvium',
    geology: { bn: 'মেঘনা ও তিস্তা বালুময় দোআঁশ', en: 'Meghna & Tista alluvial loam' },
  },
  peat: {
    id: 'peat',
    name: { bn: 'উপকূলীয় পিট ও গভীর জীবাশ্ম স্তর', en: 'Coastal Peat & Deep Fossil Strata' },
    color: '#221914',
    waterContentPct: 62,
    cohesionKPa: 6.8,
    frictionAngleDeg: 16,
    shearStrengthKPa: 12.0,
    penetrationResistanceMPa: 0.48,
    footSinkageCm: 6.8,
    viscousDragFactor: 2.8,
    omPct: 8.5,
    clayPct: 38,
    ph: 5.1,
    landform: 'peat',
    geology: { bn: 'হোলোসিন উপকূলীয় ম্যানগ্রোভ পিট ও গভীর অবক্ষয়হীন জীবাশ্ম কার্বন স্তর', en: 'Holocene coastal mangrove peat & pro-delta fossil carbon' },
  },
};

export default function BiomechanicsLab({ initialFarmer = 'razib' }) {
  const { T, s } = useStore();
  const lang = s.lang;

  const [farmerId, setFarmerId] = useState(initialFarmer);
  const [actionId, setActionId] = useState('transplant');
  const [soilId, setSoilId] = useState('wetland');
  const [effortMultiplier, setEffortMultiplier] = useState(1.0);
  const [soilMoistureDelta, setSoilMoistureDelta] = useState(0); // -10% to +20% moisture
  const [simSpeed, setSimSpeed] = useState(1.0); // 0.25x, 0.5x, 1x, 1.5x
  const [viewMode, setViewMode] = useState('kinematics'); // kinematics | muscles | strata
  const reducedMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  const [isPlaying, setIsPlaying] = useState(!reducedMotion); // with reduced motion the farmer waits for Play
  const [camView, setCamView] = useState('side');
  const [lab3d, setLab3d] = useState({ loading: true, real: false, error: false });

  const hostRef = useRef(null);
  const overlayRef = useRef(null);
  const chartRef = useRef(null);
  const apiRef = useRef(null);

  const region = REGIONS[farmerId] ?? REGIONS.razib;
  const farmer = region.farmer;
  const isFemale = ['rahima'].includes(farmerId);
  const ageFactor = farmer.age > 45 ? 1 + (farmer.age - 45) * 0.009 : 1;

  const act = ACTIONS[actionId] ?? ACTIONS.transplant;
  const soil = SOILS[soilId] ?? SOILS.wetland;

  // Effective biomechanics adjusted for effort, farmer age/gender, and dynamic soil moisture
  const effectiveEffort = effortMultiplier;
  const moistureFactor = 1 + (soilMoistureDelta / 100) * 1.5;
  const dynamicSinkage = (soil.footSinkageCm * Math.sqrt(effectiveEffort) * moistureFactor).toFixed(1);
  const dynamicViscousDrag = soil.viscousDragFactor * (1 + Math.max(0, soilMoistureDelta / 100) * 0.8);

  const currentL4L5 = Math.round(act.l4l5Compression * effectiveEffort * ageFactor * (1 + (dynamicViscousDrag - 1) * 0.15));
  const currentKcal = Math.round(act.kcalPerHour * effectiveEffort * (isFemale ? 0.92 : 1.0) * (1 + (dynamicViscousDrag - 1) * 0.22));
  const currentWatts = Math.round(act.metabolicWatts * effectiveEffort * dynamicViscousDrag);
  const currentBreaths = Math.round(act.respirationRate * Math.sqrt(effectiveEffort) * (dynamicViscousDrag > 1.5 ? 1.12 : 1.0));
  const heartRateBpm = Math.min(185, Math.round(68 + (currentWatts / 450) * 88 + (effectiveEffort - 1) * 22 + (farmer.age > 50 ? 5 : 0)));

  // Fatigue and hydration metrics
  const sweatRateMlPerHour = Math.round(450 * (currentWatts / 300) * (1 + (effectiveEffort - 1) * 0.5));
  const minutesToFatigue = Math.max(15, Math.round(130 / (Math.pow(effectiveEffort, 1.6) * (dynamicViscousDrag > 1.8 ? 1.3 : 1.0) * ageFactor)));

  // Tool impact or kinetic momentum
  const toolVelocity = (2.2 * effectiveEffort).toFixed(1);
  const kineticEnergy = (0.5 * act.toolMassKg * Math.pow(parseFloat(toolVelocity), 2)).toFixed(1);

  // Subterranean Soil Chemistry, Carbon Fractions & Environmental Offsets
  const soilOM = Math.max(0.5, (soil.omPct || 1.8) + (soilMoistureDelta > 0 ? 0.3 : 0));
  const soilClay = soil.clayPct || 28;
  const soilPH = soil.ph || 6.2;
  const soilLandform = soil.id === 'peat' ? 'peat' : soil.id === 'barind' ? 'barind' : 'alluvium';

  const cecValue = useMemo(() => calculateCEC({ clayPct: soilClay, omPct: soilOM, ph: soilPH }), [soilClay, soilOM, soilPH]);
  const baseSat = useMemo(() => calculateBaseSaturation({ cec: cecValue, ph: soilPH, landform: soilLandform }), [cecValue, soilPH, soilLandform]);
  const carbonPools = useMemo(() => calculateCarbonPools({
    totalCarbonTHa: soil.id === 'peat' ? 52 : soil.id === 'barind' ? 32 : 24,
    landform: soilLandform,
    clayPct: soilClay,
  }), [soil.id, soilLandform, soilClay]);
  const dieselOffset = useMemo(() => calculateFossilDieselOffset({
    waterSavedMm: soil.id === 'peat' ? 80 : soil.id === 'barind' ? 160 : 120,
    areaBigha: 1,
  }), [soil.id]);
  const netFootprint = useMemo(() => calculateNetEnvironmentalFootprint({
    icbmDeltaC: soil.id === 'peat' ? 0.65 : soil.id === 'barind' ? 0.35 : 0.48,
    ch4AvoidedKg: soil.id === 'wetland' ? 22 : 14,
    waterSavedMm: soil.id === 'peat' ? 80 : 140,
    areaBigha: 1,
  }), [soil.id]);

  // The 3D scene (biomech3d.js, three.js): loaded only when the lab comes near the screen, one renderer, freed on unmount
  const lookOf = (id) => (REGIONS[id] ?? REGIONS.razib).farmer.look;
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;
    let api = null, gone = false;
    const start = () => {
      import('./biomech3d.js').then(({ createBiomechLab }) => {
        if (gone) return;
        try {
          api = createBiomechLab(host, overlayRef.current, chartRef.current, { onStatus: (st) => !gone && setLab3d((o) => ({ ...o, ...st })) });
          apiRef.current = api;
          api.setFarmer(lookOf(farmerId));
          setLab3d((o) => ({ ...o, ready: Date.now() }));
        } catch (e) {
          setLab3d({ loading: false, real: false, error: true });
        }
      }).catch(() => !gone && setLab3d({ loading: false, real: false, error: true }));
    };
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { io.disconnect(); start(); } }, { rootMargin: '400px' });
    io.observe(host);
    return () => { gone = true; io.disconnect(); api?.dispose(); apiRef.current = null; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { apiRef.current?.setFarmer(lookOf(farmerId)); }, [farmerId, lab3d.ready]); // eslint-disable-line react-hooks/exhaustive-deps

  // each view opens on the camera that shows it best; the user can still drag or pick another
  useEffect(() => {
    const v = { kinematics: 'side', muscles: 'back', strata: 'section', geochem: 'deep' }[viewMode] ?? 'side';
    setCamView(v); apiRef.current?.setView(v);
  }, [viewMode, lab3d.ready]);

  const fmt = (v) => num(v, lang);
  const cm = (v) => (lang === 'bn' ? `${bnDigits(v)} সেমি` : `${v} cm`);
  const overlayLabels = {
    trunk: T('কাণ্ড', 'Trunk'), hip: T('নিতম্ব', 'Hip'), knee: T('হাঁটু', 'Knee'),
    depth: [T('০ সেমি', '0 cm'), T(`${bnDigits(15)} সেমি (প্লাও প্যান)`, '15 cm (Plough pan)'), T(`${bnDigits(40)} সেমি (হিউমাস)`, '40 cm (Humus)'), T(`${bnDigits(72)} সেমি+ (জীবাশ্ম স্তর)`, '72 cm+ (Paleosol & Fossil)')],
    depthGeo: [T(`০ সেমি (সক্রিয় C ${bnDigits(carbonPools.labile.pct)}%)`, `0 cm (Labile C ${carbonPools.labile.pct}%)`), T(`${bnDigits(15)} সেমি (প্লাও প্যান)`, '15 cm (Plough pan)'), T(`৪০ সেমি (হিউমাস ${bnDigits(carbonPools.humus.pct)}%)`, `40 cm (Humus ${carbonPools.humus.pct}%)`), T(`৭২ সেমি+ (জীবাশ্ম C ${bnDigits(carbonPools.fossilPaleosol.pct)}%)`, `72 cm+ (Fossil C ${carbonPools.fossilPaleosol.pct}%)`)],
    dz: `Δz = ${cm(dynamicSinkage)}`,
    lumbar: T('কোমর (L4/L5)', 'Lumbar'), kneeR: T('হাঁটু ও ঊরু', 'Knees & thighs'), shoulder: T('কাঁধ', 'Shoulders'), cardiac: T('হৃদ্‌যন্ত্র', 'Cardiac'),
    legend: T('মডেলের পেশী-চাপ', 'Model muscle load'),
    bulb: T('চাপ-বাল্ব: পাঠ্যবইয়ের ছবি', 'Stress bulb: textbook picture'),
    weight: T(`ওজন + ${bnDigits(act.toolMassKg)} কেজি`, `Weight + ${act.toolMassKg} kg`),
    reaction: T('মাটির প্রতিক্রিয়া', 'Soil reaction'),
    drag: T(`কাদার টান ${bnDigits(dynamicViscousDrag.toFixed(1))}×`, `Mud drag ${dynamicViscousDrag.toFixed(1)}×`),
    shear: T(`মাটির ঘর্ষণ রোধ: ${bnDigits(soil.shearStrengthKPa)} kPa`, `Shear: ${soil.shearStrengthKPa} kPa`),
    cohesion: T(`সংসক্তি ${bnDigits(soil.cohesionKPa)} kPa · ঘর্ষণ কোণ ${bnDigits(soil.frictionAngleDeg)}°`, `Cohesion ${soil.cohesionKPa} kPa · friction ${soil.frictionAngleDeg}°`),
    penetration: T(`প্রবেশ প্রতিরোধ ${bnDigits(soil.penetrationResistanceMPa)} MPa`, `Penetration ${soil.penetrationResistanceMPa} MPa`),
    cec: T(`CEC ${bnDigits(cecValue)} cmol(+)/kg · BS ${bnDigits(baseSat.baseSaturationPct)}%`, `CEC ${cecValue} cmol(+)/kg · BS ${baseSat.baseSaturationPct}%`),
    fossil: T(`জীবাশ্ম কার্বন ${bnDigits(carbonPools.fossilPaleosol.tHa)} টন/হেক্টর`, `Fossil C ${carbonPools.fossilPaleosol.tHa} t C/ha`),
    chartAxis: T('শেষ ৮ সেকেন্ড · ড্যাশ = মডেলের কোণ', 'last 8 s · dashed = model angle'),
  };
  const labelsKey = JSON.stringify(overlayLabels);
  useEffect(() => {
    apiRef.current?.setParams({
      action: actionId, soilId, soilColor: soil.color, sink: parseFloat(dynamicSinkage) / 100, moist: soilMoistureDelta,
      effort: effectiveEffort, simSpeed, playing: isPlaying, mode: viewMode, water: soil.id === 'wetland' || soilMoistureDelta > 5,
      cadence: act.cadence, loads: muscleLoads(act.stressProfile, effectiveEffort), model: { trunk: act.torsoFlexion, knee: act.kneeFlexion },
      kinetic: parseFloat(kineticEnergy), penetration: soil.penetrationResistanceMPa, drag: dynamicViscousDrag, labels: overlayLabels, fmt,
    });
  }, [actionId, soilId, dynamicSinkage, soilMoistureDelta, effectiveEffort, simSpeed, isPlaying, viewMode, lab3d.ready, labelsKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const pickView = (v) => { setCamView(v); apiRef.current?.setView(v); };

  return (
    <section className="mt-10 overflow-hidden rounded-[30px] border border-primary-200/80 bg-white/95 p-6 shadow-xl backdrop-blur-md sm:p-8">
      {/* Header & Badges */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-border/70 pb-5">
        <div className="flex items-start sm:items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary-100 text-primary-800 shadow-xs">
            <Activity size={24} className="animate-pulse" />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-[22px] font-bold tracking-tight text-ink sm:text-[26px]">
                {T('কৃষক বায়োমেকানিক্স ও মাটির ঘর্ষণ ল্যাব', 'Farmer Biomechanics & Soil Physics Lab')}
              </h2>
              <Tags list={['MODEL', 'RULE']} />
            </div>
            <p className="mt-0.5 text-[13.5px] text-muted">
              {T('৩ডি কৃষকের কাজের ভঙ্গি, পেশী স্ট্রেস হিটম্যাপ, ফুসফুস-হৃদযন্ত্র ও মাটির স্ট্র্যাটিগ্রাফি প্রতিরোধ সিমুলেশন',
                 '3D farm-work poses, muscle strain heatmap, cardiovascular cycle, and soil stratum resistance simulation')}
            </p>
          </div>
        </div>

        {/* View Mode & Speed Controls */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 shrink-0">
          {/* View Mode Selector */}
          <div className="flex items-center rounded-full bg-slate-100 p-1 border border-border">
            {[
              ['kinematics', T('স্কেলিটন', 'Skeleton')],
              ['muscles', T('পেশী হিটম্যাপ', 'Muscles')],
              ['strata', T('মাটির প্রতিরোধ', 'Soil Strata')],
              ['geochem', T('ভূ-রসায়ন ও জীবাশ্ম', 'Geochem & Fossil')],
            ].map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                aria-pressed={viewMode === mode}
                className={`rounded-full px-3 py-1 text-[11.5px] font-semibold transition cursor-pointer ${
                  viewMode === mode ? 'bg-primary-900 text-white shadow-xs' : 'text-ink/70 hover:text-ink'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Speed Pills */}
          <div className="flex items-center rounded-full bg-slate-100 p-1 border border-border">
            {[0.25, 0.5, 1.0, 1.5].map((spd) => (
              <button
                key={spd}
                type="button"
                onClick={() => setSimSpeed(spd)}
                aria-pressed={simSpeed === spd}
                className={`rounded-full px-2 py-0.5 text-[11px] font-bold transition cursor-pointer ${
                  simSpeed === spd ? 'bg-white text-ink shadow-xs' : 'text-muted hover:text-ink'
                }`}
              >
                {num(spd, lang, { dp: 2 })}×
              </button>
            ))}
          </div>

          {/* Play / Pause / Reset Controls */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIsPlaying(!isPlaying)}
              aria-pressed={!isPlaying}
              className="inline-flex items-center gap-1.5 rounded-full border border-primary-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-primary-800 shadow-xs hover:bg-primary-50 transition-colors cursor-pointer"
            >
              {isPlaying ? <Pause size={13} /> : <Play size={13} />}
              <span>{isPlaying ? T('থামান', 'Pause') : T('চালান', 'Play')}</span>
            </button>
            <button
              type="button"
              onClick={() => { setEffortMultiplier(1.0); setSoilMoistureDelta(0); apiRef.current?.reset(); }}
              aria-label={T('পুনরায় শুরু', 'Reset')}
              className="grid h-8 w-8 place-items-center rounded-full border border-border bg-white text-muted hover:text-ink transition-colors cursor-pointer"
              title={T('পুনরায় শুরু', 'Reset')}
            >
              <RotateCcw size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* The 3D lab: a real farmer at work on a cut-away block of the chosen soil (biomech3d.js) */}
      <div className="mt-6 w-full min-w-0">
        <div
          ref={hostRef}
          className="relative w-full overflow-hidden rounded-[26px] border border-border/90 shadow-inner h-[400px] sm:h-[480px] lg:h-[540px]"
          style={{ background: 'radial-gradient(120% 90% at 50% 0%, #f7fbff 0%, #e3edf3 55%, #cfdbe0 100%)' }}
          role="img"
          aria-label={T(`${act.name.bn}: ${farmer.bn}, ${soil.name.bn} মাটিতে, ত্রিমাত্রিক অ্যানিমেশন`, `${act.name.en}: ${farmer.en} on ${soil.name.en}, 3D animation`)}
        >
          <canvas ref={overlayRef} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true" />

          {/* Action & Soil Title Badge Overlay */}
          <div className="absolute left-3 top-3 sm:left-4 sm:top-4 flex flex-col gap-1.5 pointer-events-none" style={{ marginTop: viewMode === 'strata' || viewMode === 'geochem' ? 84 : 0, transition: 'margin 300ms' }}>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-[12.5px] font-bold text-ink shadow-sm backdrop-blur-md border border-black/5">
              <Dumbbell size={14} className="text-primary-600" />
              {T(act.name.bn, act.name.en)}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-[12px] font-medium text-muted shadow-sm backdrop-blur-md border border-black/5">
              <Layers size={13} className="text-amber-600" />
              {T(soil.name.bn, soil.name.en)}
            </span>
          </div>

          {/* Camera presets and zoom */}
          <div className="absolute right-3 top-3 flex flex-col items-end gap-1.5">
            <div className="flex flex-wrap justify-end gap-1 rounded-2xl bg-white/90 p-1 shadow-sm backdrop-blur-md border border-black/5" role="group" aria-label={T('ক্যামেরা', 'Camera')}>
              {[
                ['side', T('পাশ', 'Side')],
                ['three', T('কোণ', '3/4')],
                ['back', T('পেছন', 'Back')],
                ['close', T('কাছে', 'Close')],
                ['section', T('মাটির নিচে', 'Section')],
              ].map(([v, lbl]) => (
                <button key={v} type="button" onClick={() => pickView(v)} aria-pressed={camView === v}
                  className={`rounded-xl px-2 py-1 text-[11px] font-semibold transition cursor-pointer ${camView === v ? 'bg-primary-900 text-white' : 'text-ink/70 hover:text-ink'}`}>
                  {lbl}
                </button>
              ))}
            </div>
            <div className="flex gap-1">
              <button type="button" onClick={() => apiRef.current?.zoom(0.82)} aria-label={T('কাছে আনুন', 'Zoom in')} className="grid h-8 w-8 place-items-center rounded-full bg-white/90 text-ink shadow-sm border border-black/5 cursor-pointer hover:bg-white"><ZoomIn size={14} /></button>
              <button type="button" onClick={() => apiRef.current?.zoom(1.22)} aria-label={T('দূরে নিন', 'Zoom out')} className="grid h-8 w-8 place-items-center rounded-full bg-white/90 text-ink shadow-sm border border-black/5 cursor-pointer hover:bg-white"><ZoomOut size={14} /></button>
            </div>
          </div>

          {/* status, honesty note and drag hint */}
          {(lab3d.loading || lab3d.error) && (
            <div className="absolute inset-0 grid place-items-center pointer-events-none">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/95 px-4 py-2 text-[12.5px] font-semibold text-ink shadow-md">
                {lab3d.error ? <AlertTriangle size={15} className="text-amber-600" /> : <Sparkles size={15} className="animate-pulse text-primary-600" />}
                {lab3d.error ? T('এই ব্রাউজারে ৩ডি চালানো গেল না; নিচের সংখ্যাগুলো ঠিক আছে।', '3D could not start in this browser; the numbers below still hold.') : T('৩ডি কৃষক আসছেন…', 'Loading the 3D farmer…')}
              </span>
            </div>
          )}
          <div className="absolute bottom-3 inset-x-3 flex flex-wrap items-end justify-between gap-2 pointer-events-none">
            <span className="rounded-xl bg-white/90 px-2.5 py-1 text-[10.5px] leading-4 text-muted shadow-sm border border-black/5 max-w-[78%]" style={{ marginLeft: viewMode === 'muscles' ? 'auto' : 0 }}>
              {T('ভঙ্গি একটি অ্যানিমেশন; কোণগুলো চলমান শরীর থেকে মাপা, সংখ্যাগুলো মডেলের অনুমান।', 'The pose is an animation; angles are measured on the moving body, numbers are model estimates.')}
              {' '}{lab3d.real ? T('শরীর: খেলার নমুনা চরিত্রের MakeHuman মডেল।', 'Body: MakeHuman model of a sample game character.') : ''}
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-black/45 px-2.5 py-1 text-[10.5px] font-medium text-white">
              <Compass size={12} />{T('টেনে ঘোরান', 'Drag to orbit')}
            </span>
          </div>
        </div>

        {/* Live readouts: joint angles measured on the animated body, and the model's numbers as gauges */}
        <div className="mt-3 grid gap-3 lg:grid-cols-[1.4fr_1fr]">
          <div className="rounded-2xl border border-border/80 bg-white p-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11.5px] font-bold text-ink">
              <span className="flex items-center gap-1.5"><Activity size={13} className="text-primary-600" />{T('চলমান শরীরের কোণ', 'Angles on the moving body')}</span>
              <span className="flex flex-wrap items-center gap-2.5 font-semibold text-[10.5px]">
                <span className="flex items-center gap-1"><i className="inline-block h-1 w-3 rounded bg-[#2563eb]" />{T('কাণ্ড', 'Trunk')}</span>
                <span className="flex items-center gap-1"><i className="inline-block h-1 w-3 rounded bg-[#7c3aed]" />{T('নিতম্ব', 'Hip')}</span>
                <span className="flex items-center gap-1"><i className="inline-block h-1 w-3 rounded bg-[#059669]" />{T('হাঁটু', 'Knee')}</span>
                <span className="text-muted font-medium">{T(`মডেল: কাণ্ড ${bnDigits(act.torsoFlexion)}°, হাঁটু ${bnDigits(act.kneeFlexion)}°`, `Model: trunk ${act.torsoFlexion}°, knee ${act.kneeFlexion}°`)}</span>
                <Tags list={['MODEL']} />
              </span>
            </div>
            <canvas ref={chartRef} className="mt-1.5 block h-[112px] w-full" aria-label={T('কাণ্ড, নিতম্ব ও হাঁটুর কোণের চলমান রেখাচিত্র', 'Live chart of trunk, hip and knee angles')} role="img" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { v: currentL4L5, max: 3400, unit: 'N', label: T('কোমর টান L4/L5', 'L4/L5 load'), sub: T('NIOSH সীমা ৩৪০০ N', 'NIOSH limit 3400 N'), warn: currentL4L5 > 2400 },
              { v: heartRateBpm, max: 185, unit: T('/মি', 'bpm'), label: T('হৃদস্পন্দন', 'Heart rate'), sub: T('মডেলের সর্বোচ্চ ১৮৫', 'model cap 185'), warn: heartRateBpm > 160 },
              { v: currentWatts, max: 900, unit: T('ওয়াট', 'W'), label: T('বিপাকীয় শক্তি', 'Metabolic power'), sub: T(`${bnDigits(currentKcal)} ক্যালরি/ঘণ্টা`, `${currentKcal} kcal/h`), warn: currentWatts > 600 },
            ].map((g) => {
              const f = Math.min(1, g.v / g.max), C = 2 * Math.PI * 30;
              return (
                <div key={g.label} className="flex flex-col items-center rounded-2xl border border-border/80 bg-white p-2 text-center">
                  <svg viewBox="0 0 72 72" className="h-[64px] w-[64px]" aria-hidden="true">
                    <circle cx="36" cy="36" r="30" fill="none" stroke="#e2e8f0" strokeWidth="7" />
                    <circle cx="36" cy="36" r="30" fill="none" stroke={g.warn ? '#d97706' : '#16a34a'} strokeWidth="7" strokeLinecap="round"
                      strokeDasharray={C} strokeDashoffset={C * (1 - f)} transform="rotate(-90 36 36)" style={{ transition: reducedMotion ? 'none' : 'stroke-dashoffset 700ms ease, stroke 300ms' }} />
                    <text x="36" y="40" textAnchor="middle" fontSize="13" fontWeight="800" fill="#0f172a">{num(g.v, lang)}</text>
                  </svg>
                  <span className="text-[10.5px] font-bold text-ink leading-tight">{g.label} <span className="text-muted font-semibold">({g.unit})</span></span>
                  <span className="text-[9.5px] text-muted leading-tight">{g.sub}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Telemetry strip */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2.5 rounded-2xl bg-slate-50 p-3 text-[12px] font-medium text-ink border border-border/70">
          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            <span className="flex items-center gap-1.5 text-red-700 font-bold">
              <Heart size={15} className="text-red-500 animate-pulse" />
              <span>{T(`হৃদস্পন্দন: ${bnDigits(heartRateBpm)}/মিনিট`, `Heart rate: ${heartRateBpm} bpm`)}</span>
            </span>
            <span className="flex items-center gap-1.5 text-primary-800 font-bold">
              <Activity size={15} className="text-primary-600" />
              <span>{T(`শ্বাসক্রিয়া: ${bnDigits(currentBreaths)} বার/মি`, `Respiration: ${currentBreaths} bpm`)}</span>
            </span>
            <span className="flex items-center gap-1.5 text-amber-900 font-bold">
              <Flame size={15} className="text-amber-500" />
              <span>{T(`শক্তি ব্যয়: ${bnDigits(currentKcal)} ক্যালরি/ঘণ্টা`, `Burn: ${currentKcal} kcal/h`)}</span>
            </span>
          </div>
          <span className="flex items-center gap-2 tabular text-ink/75 font-bold">
            {T(`মাটির ঘর্ষণ রোধ: ${bnDigits(soil.shearStrengthKPa)} kPa`, `Shear: ${soil.shearStrengthKPa} kPa`)}
            <Tags list={['MODEL', 'RULE']} />
          </span>
        </div>
      </div>

      {/* Main 2-Column Deck: Interactive Controls on Left, Quantitative Diagnostics on Right */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Left Column: Interactive Selectors & Environmental Physics Sliders */}
        <div className="flex flex-col gap-5 min-w-0">
          {/* Farmer Profile Selector */}
          <div>
            <label className="text-[13px] font-bold text-ink flex items-center justify-between">
              <span>{T('কৃষক প্রোফাইল ও বয়স', 'Farmer Profile & Physiology')}</span>
              <span className="text-[11.5px] font-semibold text-primary-700">
                {region.flag ?? '🇧🇩'} {T(farmer.bn, farmer.en)} ({num(farmer.age, lang)} {T('বছর', 'y/o')})
              </span>
            </label>
            <div className="hide-scrollbar mt-2 flex gap-1.5 overflow-x-auto pb-1.5">
              {FARMER_IDS.map((fid) => {
                const reg = REGIONS[fid];
                const fm = reg.farmer;
                const on = farmerId === fid;
                return (
                  <button
                    key={fid}
                    type="button"
                    onClick={() => setFarmerId(fid)}
                    className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold transition active:scale-95 cursor-pointer ${
                      on
                        ? 'bg-primary-800 text-white shadow-xs ring-2 ring-primary-500'
                        : 'border border-border/80 bg-white text-ink/75 hover:border-primary-300'
                    }`}
                  >
                    <span>{reg.flag ?? '🇧🇩'}</span>
                    <span>{T(fm.bn.split(' ')[0], fm.en.split(' ')[0])}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Selector Pills (6 Actions) */}
          <div>
            <label className="text-[13px] font-bold text-ink flex items-center justify-between">
              <span>{T('১. কৃষি কাজের শারীরিক ভঙ্গি', '1. Agricultural Activity')}</span>
              <span className="text-[11.5px] font-normal text-muted">{T('৬টি কৃষি কাজ', '6 activities')}</span>
            </label>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {Object.values(ACTIONS).map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setActionId(a.id)}
                  className={`flex flex-col items-start rounded-2xl p-3 text-left transition-all cursor-pointer ${
                    actionId === a.id
                      ? 'border border-primary-500 bg-primary-50/80 shadow-xs ring-2 ring-primary-500/20'
                      : 'border border-border/80 bg-white hover:border-primary-200'
                  }`}
                >
                  <span className={`text-[13px] font-bold line-clamp-1 ${actionId === a.id ? 'text-primary-900' : 'text-ink'}`}>
                    {T(a.name.bn.split(' ')[0], a.name.en.split(' ')[0])}
                  </span>
                  <span className="mt-1 text-[11px] text-muted line-clamp-1">
                    {T(a.tool.bn, a.tool.en)}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Soil Stratum Selector (4 Delta Soils) */}
          <div>
            <label className="text-[13px] font-bold text-ink flex items-center justify-between">
              <span>{T('২. মাটির ভূ-প্রকৃতি', '2. Soil Geotechnical Layer')}</span>
              <span className="text-[11.5px] font-normal text-muted">{T('ডেল্টা স্তর', 'Delta stratum')}</span>
            </label>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {Object.values(SOILS).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSoilId(s.id)}
                  className={`rounded-2xl p-2.5 text-center transition-all cursor-pointer ${
                    soilId === s.id
                      ? 'border border-amber-600 bg-amber-50/80 shadow-xs ring-2 ring-amber-500/20'
                      : 'border border-border/80 bg-white hover:border-amber-200'
                  }`}
                >
                  <span className="block text-[12px] font-bold text-ink">
                    {T(s.name.bn.split(' ')[0], s.name.en.split(' ')[0])}
                  </span>
                  <span className="block text-[10.5px] text-muted tabular mt-0.5">
                    {T(`${bnDigits(s.footSinkageCm)} সেমি দেবে`, `${s.footSinkageCm} cm sink`)}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Effort & Soil Moisture Sliders in Side-by-Side Grid */}
          <div className="grid gap-4 sm:grid-cols-2 rounded-2xl border border-border/80 bg-slate-50/60 p-4">
            <div>
              <div className="flex items-center justify-between text-[12.5px] font-bold text-ink">
                <span>{T('শ্রমের তীব্রতা', 'Labour Exertion')}</span>
                <span className="text-primary-700 tabular font-black">{num(Math.round(effortMultiplier * 100), lang)}%</span>
              </div>
              <input
                type="range"
                min="0.6"
                max="1.6"
                step="0.1"
                value={effortMultiplier}
                onChange={(e) => setEffortMultiplier(parseFloat(e.target.value))}
                aria-label={T('শ্রমের তীব্রতা', 'Labour Exertion')}
                className="mt-2 w-full accent-primary-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10.5px] text-muted mt-1 font-medium">
                <span>{T('হালকা', 'Light')}</span>
                <span>{T('স্বাভাবিক', 'Nominal')}</span>
                <span>{T('কঠিন', 'Heavy')}</span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-[12.5px] font-bold text-ink">
                <span>{T('কাদামাটির আর্দ্রতা', 'Puddle Moisture')}</span>
                <span className="text-sky-700 tabular font-black">{T(`${soilMoistureDelta > 0 ? '+' : ''}${bnDigits(soilMoistureDelta)}%`, `${soilMoistureDelta > 0 ? '+' : ''}${soilMoistureDelta}%`)}</span>
              </div>
              <input
                type="range"
                min="-10"
                max="20"
                step="5"
                value={soilMoistureDelta}
                onChange={(e) => setSoilMoistureDelta(parseInt(e.target.value, 10))}
                aria-label={T('কাদামাটির আর্দ্রতা', 'Puddle Moisture')}
                className="mt-2 w-full accent-sky-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10.5px] text-muted mt-1 font-medium">
                <span>{T('শুকনো', 'Firm')}</span>
                <span>{T('স্বাভাবিক', 'Saturated')}</span>
                <span>{T('কাদাময়', 'Slurry')}</span>
              </div>
            </div>
          </div>

          {/* Ergonomic Work-Rest Advisory Banner */}
          <div className="rounded-2xl border border-emerald-200/90 bg-emerald-50/80 p-3.5 text-[12.5px] leading-5 text-emerald-950">
            <p className="flex items-center gap-1.5 font-bold text-emerald-900">
              <ShieldCheck size={16} className="text-emerald-700" />
              {T('এরগনোমিক ও স্বাস্থ্য পরামর্শ:', 'Ergonomic & Hydration Protocol:')}
            </p>
            <p className="mt-1 text-emerald-900/90">
              {T(
                `প্রতি ${bnDigits(minutesToFatigue > 60 ? 50 : 35)} মিনিট কাজের পর অন্তত ১০ মিনিট ছায়ায় বিশ্রাম নিন এবং ${bnDigits(Math.round(sweatRateMlPerHour * 0.5))} মিলি লবণ-পানি বা স্যালাইন পান করুন।`,
                `Rest in shade for at least 10 minutes every ${minutesToFatigue > 60 ? 50 : 35} minutes of labour and replenish with ${Math.round(sweatRateMlPerHour * 0.5)} mL water/electrolyte.`
              )}
            </p>
          </div>
        </div>

        {/* Right Column: Physiological Diagnostics, Biomechanical Metrics & Deep Geochemistry */}
        <div className="flex flex-col gap-4 min-w-0">
          {/* 4 Quantitative Biomechanical Cards */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* L4/L5 Lumbar Force */}
            <div className="rounded-2xl border border-border bg-slate-50/70 p-3">
              <span className="text-[11px] font-bold text-muted uppercase tracking-wider block">
                {T('কোমর টান (L4/L5)', 'Spinal L4/L5 Load')}
              </span>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="font-display text-[22px] font-black text-ink tabular">
                  {T(bnDigits(currentL4L5), currentL4L5.toLocaleString('en-US'))}
                </span>
                <span className="text-[12px] font-bold text-muted">N</span>
              </div>
              <span className={`text-[10.5px] font-bold block mt-0.5 ${currentL4L5 > 2400 ? 'text-amber-700' : 'text-emerald-700'}`}>
                {currentL4L5 > 2400 ? T('সতর্কতা: উচ্চ কোমর টান', 'High disc compression') : T('সহনশীল মাত্রা (NIOSH)', 'Within NIOSH limits')}
              </span>
            </div>

            {/* Metabolic Power Output */}
            <div className="rounded-2xl border border-border bg-slate-50/70 p-3">
              <span className="text-[11px] font-bold text-muted uppercase tracking-wider block">
                {T('বিপাকীয় শক্তি', 'Metabolic Power')}
              </span>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="font-display text-[22px] font-black text-ink tabular">
                  {T(bnDigits(currentWatts), currentWatts)}
                </span>
                <span className="text-[12px] font-bold text-muted">{T('ওয়াট', 'Watts')}</span>
              </div>
              <span className="text-[10.5px] text-muted block mt-0.5">
                {T(`গতিবেগ: ${bnDigits(toolVelocity)} মি/সে`, `Velocity: ${toolVelocity} m/s`)}
              </span>
            </div>

            {/* Fatigue Endurance Time */}
            <div className="rounded-2xl border border-border bg-slate-50/70 p-3">
              <span className="text-[11px] font-bold text-muted uppercase tracking-wider block">
                {T('ক্লান্তি আসার সময়', 'Endurance Limit')}
              </span>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="font-display text-[22px] font-black text-primary-900 tabular">
                  {T(bnDigits(minutesToFatigue), minutesToFatigue)}
                </span>
                <span className="text-[12px] font-bold text-muted">{T('মিনিট', 'mins')}</span>
              </div>
              <span className="text-[10.5px] text-muted block mt-0.5">
                {T(`ঘাম নির্গমন: ${bnDigits(sweatRateMlPerHour)} মিলি/ঘণ্টা`, `Sweat: ${sweatRateMlPerHour} mL/h`)}
              </span>
            </div>

            {/* Soil Foot Sinkage */}
            <div className="rounded-2xl border border-border bg-slate-50/70 p-3">
              <span className="text-[11px] font-bold text-muted uppercase tracking-wider block">
                {T('পা দেবে যাওয়ার গভীরতা', 'Foot Sinkage')}
              </span>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="font-display text-[22px] font-black text-ink tabular">
                  {num(dynamicSinkage, lang, { dp: 1 })}
                </span>
                <span className="text-[12px] font-bold text-muted">{T('সেমি', 'cm')}</span>
              </div>
              <span className="text-[10.5px] text-muted block mt-0.5">
                {T(`সান্দ্রতা ফ্যাক্টর: ${bnDigits(dynamicViscousDrag.toFixed(1))}×`, `Viscous drag: ${dynamicViscousDrag.toFixed(1)}×`)}
              </span>
            </div>
          </div>

          {/* Subterranean Geochemistry & Fossil Carbon Horizon Panel */}
          <div className="rounded-2xl border border-amber-900/20 bg-gradient-to-br from-amber-50/70 via-slate-50/80 to-emerald-50/60 p-4 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-amber-100 text-amber-900">
                  <FlaskConical size={16} />
                </span>
                <div>
                  <h4 className="text-[13.5px] font-bold text-ink">
                    {T('ভূ-রসায়ন ও মাটির গভীর জীবাশ্ম কার্বন স্তর', 'Soil Geochemistry & Deep Fossil Carbon Horizon')}
                  </h4>
                  <p className="text-[11px] text-muted">
                    {T(
                      `ভূতাত্ত্বিক গঠন: ${soil.geology.bn} • pH: ${bnDigits(soilPH)} • এঁটেল: ${bnDigits(soilClay)}%`,
                      `Geology: ${soil.geology.en} • pH: ${soilPH} • Clay: ${soilClay}%`
                    )}
                  </p>
                </div>
              </div>
              <Tags list={['MODEL', 'RULE']} />
            </div>

            {/* 4 Quantitative Geochemistry & Fossil Metric Cards */}
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {/* CEC */}
              <div className="rounded-xl border border-border/80 bg-white/90 p-2.5">
                <span className="text-[10px] font-semibold text-muted uppercase tracking-wider block">
                  {T('ক্যাটায়ন বিনিময় (CEC)', 'Cation Exchange (CEC)')}
                </span>
                <div className="mt-0.5 flex items-baseline gap-1">
                  <span className="font-display text-[16.5px] font-bold text-ink tabular">
                    {T(bnDigits(cecValue), cecValue)}
                  </span>
                  <span className="text-[9.5px] text-muted">cmol(+)/kg</span>
                </div>
                <span className={`text-[9.5px] font-bold block ${cecValue > 25 ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {cecValue > 25 ? T('উচ্চ উর্বর ধারণক্ষমতা', 'High nutrient retention') : T('মাঝারি বিনিময় ক্ষমতা', 'Moderate retention')}
                </span>
              </div>

              {/* Base Saturation */}
              <div className="rounded-xl border border-border/80 bg-white/90 p-2.5">
                <span className="text-[10px] font-semibold text-muted uppercase tracking-wider block">
                  {T('ক্ষারীয় সম্পৃক্তি (BS%)', 'Base Saturation (BS%)')}
                </span>
                <div className="mt-0.5 flex items-baseline gap-1">
                  <span className="font-display text-[16.5px] font-bold text-ink tabular">
                    {T(bnDigits(baseSat.baseSaturationPct), baseSat.baseSaturationPct)}%
                  </span>
                </div>
                <span className="text-[9px] text-muted block tabular truncate">
                  Ca: {num(baseSat.caCmol, lang, { dp: 1 })} | Mg: {num(baseSat.mgCmol, lang, { dp: 1 })} | K: {num(baseSat.kCmol, lang, { dp: 1 })}
                </span>
              </div>

              {/* Fossil Paleosol Carbon */}
              <div className="rounded-xl border border-border/80 bg-white/90 p-2.5">
                <span className="text-[10px] font-semibold text-muted uppercase tracking-wider block">
                  {T('গভীর জীবাশ্ম কার্বন', 'Fossil/Paleosol C')}
                </span>
                <div className="mt-0.5 flex items-baseline gap-1">
                  <span className="font-display text-[16.5px] font-bold text-amber-950 tabular">
                    {T(bnDigits(carbonPools.fossilPaleosol.tHa), carbonPools.fossilPaleosol.tHa)}
                  </span>
                  <span className="text-[9.5px] text-muted">{T('টন কার্বন/হেক্টর', 't C/ha')}</span>
                </div>
                <span className="text-[9px] text-amber-800 font-medium block">
                  {T(`${bnDigits(carbonPools.fossilPaleosol.pct)}% অবক্ষয়হীন জীবাশ্ম স্তর`, `${carbonPools.fossilPaleosol.pct}% recalcitrant pool`)}
                </span>
              </div>

              {/* Avoided Diesel Emissions */}
              <div className="rounded-xl border border-border/80 bg-white/90 p-2.5">
                <span className="text-[10px] font-semibold text-muted uppercase tracking-wider block">
                  {T('ডিজেল নির্গমন হ্রাস', 'Avoided Diesel CO₂')}
                </span>
                <div className="mt-0.5 flex items-baseline gap-1">
                  <span className="font-display text-[16.5px] font-bold text-emerald-800 tabular">
                    {T(bnDigits(dieselOffset.avoidedCo2Kg), dieselOffset.avoidedCo2Kg)}
                  </span>
                  <span className="text-[9.5px] text-muted">{T('কেজি CO₂', 'kg CO₂')}</span>
                </div>
                <span className="text-[9px] text-emerald-700 font-medium block">
                  {T(`${bnDigits(dieselOffset.dieselLitersSaved)} লিটার তেল সাশ্রয়`, `${dieselOffset.dieselLitersSaved} L diesel saved`)}
                </span>
              </div>
            </div>

            {/* Subterranean 3-Pool Carbon Stratum Breakdown Bar */}
            <div className="mt-2.5 rounded-xl bg-white/85 p-2.5 border border-border/60">
              <div className="flex items-center justify-between text-[11px] font-bold text-ink mb-1.5">
                <span className="flex items-center gap-1.5">
                  <Layers size={12} className="text-amber-800" />
                  {T('ভূগর্ভস্থ ৩-স্তর কার্বন বিভাজন', 'Subterranean 3-Pool SOC Fractionation Profile')}
                </span>
                <span className="text-muted tabular text-[10.5px]">{T(`মোট: ${bnDigits(carbonPools.totalTHa)} টন কার্বন/হেক্টর`, `Total: ${carbonPools.totalTHa} t C/ha`)}</span>
              </div>

              {/* Progress bar split into 3 fractions */}
              <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  style={{ width: `${carbonPools.labile.pct}%` }}
                  className="bg-emerald-500 transition-all duration-300"
                  title={T(`সক্রিয় বায়ো-কার্বন: ${bnDigits(carbonPools.labile.pct)}%`, `Labile: ${carbonPools.labile.pct}%`)}
                />
                <div
                  style={{ width: `${carbonPools.humus.pct}%` }}
                  className="bg-amber-700 transition-all duration-300"
                  title={T(`স্থিতিশীল হিউমাস: ${bnDigits(carbonPools.humus.pct)}%`, `Humus: ${carbonPools.humus.pct}%`)}
                />
                <div
                  style={{ width: `${carbonPools.fossilPaleosol.pct}%` }}
                  className="bg-stone-900 transition-all duration-300"
                  title={T(`গভীর জীবাশ্ম স্তর: ${bnDigits(carbonPools.fossilPaleosol.pct)}%`, `Fossil Paleosol: ${carbonPools.fossilPaleosol.pct}%`)}
                />
              </div>

              <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-1.5 text-[10px]">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block shrink-0" />
                  <span className="text-ink font-medium">
                    {T(`সক্রিয় কার্বন (${bnDigits(carbonPools.labile.pct)}%): ১-২ বছর`, `Labile (${carbonPools.labile.pct}%): 1-2 yr`)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-amber-700 inline-block shrink-0" />
                  <span className="text-ink font-medium">
                    {T(`স্থিতিশীল হিউমাস (${bnDigits(carbonPools.humus.pct)}%): ২০-৫০ বছর`, `Humus (${carbonPools.humus.pct}%): 20-50 yr`)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-stone-900 inline-block shrink-0" />
                  <span className="text-ink font-medium">
                    {T(`জীবাশ্ম স্তর (${bnDigits(carbonPools.fossilPaleosol.pct)}%): ৫০০-২০০০+ বছর`, `Fossil (${carbonPools.fossilPaleosol.pct}%): 500-2000+ yr`)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
