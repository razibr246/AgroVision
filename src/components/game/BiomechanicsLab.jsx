import { useState, useEffect, useRef } from 'react';
import { Activity, Dumbbell, Flame, Heart, Compass, Layers, ShieldCheck, Play, Pause, RotateCcw, Sparkles, Droplets, Zap, ChevronRight, Eye, Gauge, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useStore } from '../../store';
import { Tags } from '../ui';
import { num, bnDigits } from '../../engine/dates';
import { REGIONS, FARMER_IDS } from '../../game/regions';

// 6 distinct agricultural biomechanical actions with physiological kinematic parameters
const ACTIONS = {
  transplant: {
    id: 'transplant',
    name: { bn: 'ধান রোপণ (Paddy Transplant)', en: 'Paddy Transplanting' },
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
    name: { bn: 'কোদাল কোপানো (Kodal Hoeing)', en: 'Kodal / Hoe Striking' },
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
    name: { bn: 'ন্যাপস্যাক স্প্রেয়ার (Knapsack Spray)', en: 'Knapsack Spraying' },
    desc: {
      bn: 'পিঠে ১৬ কেজির ট্যাংক নিয়ে সোজা হেঁটে স্প্রে: মাধ্যাকর্ষণ কেন্দ্র উপরে ওঠে, কাঁধ ও গোড়ালির ভারসাম্য জরুরি।',
      en: 'Walking with a 16 kg backpack tank: elevated center of gravity, sustained shoulder and ankle stability.',
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
    name: { bn: 'কাঁচি দিয়ে ফসল কাটা (Sickle Reaping)', en: 'Sickle Harvesting' },
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
    name: { bn: 'মাথায় ফসল বহন (Headload Basket)', en: 'Headload Basket Transport' },
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
    name: { bn: 'হাত নিড়ানি দিয়ে আগাছা দমন (Manual Weeding)', en: 'Manual Weeding (Nirani)' },
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

// 3 Bengal delta soil strata with geotechnical parameters
const SOILS = {
  wetland: {
    id: 'wetland',
    name: { bn: 'কাদাময় প্লাবনভূমি পলি (Wetland Mud)', en: 'Puddled Wetland Silt' },
    color: '#3d3024',
    waterContentPct: 42,
    cohesionKPa: 4.5,
    frictionAngleDeg: 12,
    shearStrengthKPa: 8.5,
    penetrationResistanceMPa: 0.35,
    footSinkageCm: 5.2,
    viscousDragFactor: 2.4,
    geology: { bn: 'হোলোসিন পলল ও কাদা', en: 'Holocene alluvial mud' },
  },
  barind: {
    id: 'barind',
    name: { bn: 'বরেন্দ্র শক্ত লাল এঁটেল (Barind Hardpan)', en: 'Barind Compacted Paleosol' },
    color: '#8b3d24',
    waterContentPct: 18,
    cohesionKPa: 28.0,
    frictionAngleDeg: 26,
    shearStrengthKPa: 42.0,
    penetrationResistanceMPa: 2.85,
    footSinkageCm: 0.6,
    viscousDragFactor: 1.0,
    geology: { bn: 'প্লাইস্টোসিন প্রাচীন লাল মাটি (Paleosol)', en: 'Pleistocene weathered paleosol' },
  },
  loam: {
    id: 'loam',
    name: { bn: 'চর ও নদীর বেলে দোআঁশ (Sandy Loam)', en: 'Riverine Sandy Loam' },
    color: '#7a6042',
    waterContentPct: 24,
    cohesionKPa: 12.0,
    frictionAngleDeg: 34,
    shearStrengthKPa: 22.5,
    penetrationResistanceMPa: 1.20,
    footSinkageCm: 1.8,
    viscousDragFactor: 1.3,
    geology: { bn: 'মেঘনা ও তিস্তা বালুময় দোআঁশ', en: 'Meghna & Tista alluvial loam' },
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
  const [isPlaying, setIsPlaying] = useState(true);
  const [time, setTime] = useState(0);

  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);

  const region = REGIONS[farmerId] ?? REGIONS.razib;
  const farmer = region.farmer;
  const isFemale = ['rahima', 'rampyari', 'kinley'].includes(farmerId);
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

  // Animation loop driving the canvas
  useEffect(() => {
    let lastTs = performance.now();
    const loop = (ts) => {
      const dt = Math.min(0.1, Math.max(0, (ts - lastTs) / 1000));
      lastTs = ts;
      if (isPlaying) {
        setTime((prev) => prev + dt * (act.cadence / 22) * effectiveEffort * simSpeed);
      }
      animFrameRef.current = requestAnimationFrame(loop);
    };
    animFrameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [isPlaying, act.cadence, effectiveEffort, simSpeed]);

  // Render canvas frame
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    // Background gradient representing delta agricultural atmosphere
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
    skyGrad.addColorStop(0, '#f8fafc');
    skyGrad.addColorStop(0.5, '#f1f5f9');
    skyGrad.addColorStop(1, '#e2e8f0');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h);

    const groundY = h * 0.72;
    const sinkPx = parseFloat(dynamicSinkage) * 3.4;

    // Draw Soil Strata Profile
    // Stratum 1: Topsoil / Mud
    ctx.fillStyle = soil.color;
    ctx.fillRect(0, groundY, w, 28);

    // Stratum 2: Plough Pan (compacted impervious boundary)
    ctx.fillStyle = '#4a2c16';
    ctx.fillRect(0, groundY + 28, w, 14);

    // Stratum 3: Ancient Paleosol / Subsoil
    ctx.fillStyle = '#2c180e';
    ctx.fillRect(0, groundY + 42, w, h - (groundY + 42));

    // Water puddle sheen if wetland or high moisture
    if (soil.id === 'wetland' || soilMoistureDelta > 5) {
      ctx.fillStyle = 'rgba(56, 189, 248, 0.35)';
      ctx.fillRect(0, groundY - 5, w, 10);
      const rippleRadius = (((time * 18) % 36) + 36) % 36;
      ctx.strokeStyle = `rgba(255, 255, 255, ${Math.max(0, 1 - rippleRadius / 36)})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(w * 0.48, groundY + 2, rippleRadius * 1.6, rippleRadius * 0.45, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Geotechnical failure lines in strata mode
    if (viewMode === 'strata') {
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
      ctx.lineWidth = 1.8;
      ctx.setLineDash([4, 4]);
      // Slip surface circle
      ctx.beginPath();
      ctx.arc(w * 0.48, groundY + sinkPx, sinkPx * 2.2, Math.PI * 0.1, Math.PI * 0.9, false);
      ctx.stroke();
      ctx.setLineDash([]);

      // Pore water pressure arrows
      ctx.fillStyle = '#38bdf8';
      for (let k = -2; k <= 2; k++) {
        const px = w * 0.48 + k * 18;
        const py = groundY + sinkPx + 12;
        ctx.beginPath();
        ctx.moveTo(px, py + 8);
        ctx.lineTo(px, py - 4);
        ctx.lineTo(px - 3, py);
        ctx.moveTo(px, py - 4);
        ctx.lineTo(px + 3, py);
        ctx.stroke();
      }
    }

    // Ground boundary line
    ctx.strokeStyle = '#2d1a0e';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(w, groundY);
    ctx.stroke();

    // Biomechanical Kinematic Rig
    const cycle = Math.sin(time * Math.PI * 2);
    const breathe = Math.sin(time * (currentBreaths / 10));

    const cx = w * 0.48;
    const footY = groundY + sinkPx;

    // Joint positions calculated from inverse kinematics
    const hipOffset = actionId === 'hoe' ? cycle * 8 : actionId === 'basket' ? cycle * 4 : 0;
    const hipY = groundY - 95 + cycle * 4 * (actionId === 'hoe' ? 2.5 : 0.8) + (actionId === 'weeding' ? 28 : 0);
    const hipX = cx + hipOffset;

    // Spine & Thorax
    const spineAngle = (act.torsoFlexion * Math.PI) / 180 + cycle * 0.08;
    const thoraxLen = 48 + breathe * 1.5;
    const thoraxX = hipX - Math.sin(spineAngle) * thoraxLen;
    const thoraxY = hipY - Math.cos(spineAngle) * thoraxLen;

    // Head
    const headX = thoraxX - Math.sin(spineAngle * 0.6) * 22;
    const headY = thoraxY - Math.cos(spineAngle * 0.6) * 22;

    // Legs: Left & Right
    const lKneeX = hipX - 16;
    const lKneeY = hipY + 48 + (actionId === 'sickle' || actionId === 'weeding' ? 22 : 0);
    const rKneeX = hipX + 18;
    const rKneeY = hipY + 46 + (actionId === 'weeding' ? 18 : 0);

    // Stress Color Map helper
    const stressColor = (val) => (val > 85 ? '#ef4444' : val > 65 ? '#f59e0b' : '#10b981');

    // Draw Legs & Feet
    if (viewMode === 'muscles') {
      // Quad / Hamstring Heatmap overlays
      ctx.lineWidth = 12;
      ctx.lineCap = 'round';
      ctx.strokeStyle = stressColor(act.stressProfile.knee * effectiveEffort);
      ctx.beginPath();
      ctx.moveTo(hipX - 4, hipY);
      ctx.lineTo(lKneeX, lKneeY);
      ctx.moveTo(hipX + 4, hipY);
      ctx.lineTo(rKneeX, rKneeY);
      ctx.stroke();

      // Calves
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.moveTo(lKneeX, lKneeY);
      ctx.lineTo(cx - 24, footY);
      ctx.moveTo(rKneeX, rKneeY);
      ctx.lineTo(cx + 18, footY);
      ctx.stroke();
    } else {
      ctx.lineWidth = 6.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Left leg (back)
      ctx.strokeStyle = '#1e3a29';
      ctx.beginPath();
      ctx.moveTo(hipX - 6, hipY);
      ctx.lineTo(lKneeX, lKneeY);
      ctx.lineTo(cx - 24, footY);
      ctx.stroke();

      // Right leg (front)
      ctx.strokeStyle = '#2e5c3e';
      ctx.beginPath();
      ctx.moveTo(hipX + 6, hipY);
      ctx.lineTo(rKneeX, rKneeY);
      ctx.lineTo(cx + 18, footY);
      ctx.stroke();
    }

    // Feet in soil
    ctx.strokeStyle = '#1b3323';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(cx - 28, footY);
    ctx.lineTo(cx - 16, footY);
    ctx.moveTo(cx + 14, footY);
    ctx.lineTo(cx + 28, footY);
    ctx.stroke();

    // Torso / Thoracic cage
    if (viewMode === 'muscles') {
      // Erector Spinae / Back Muscle Heatmap
      ctx.lineWidth = 20;
      ctx.strokeStyle = stressColor(act.stressProfile.lumbar * effectiveEffort);
      ctx.beginPath();
      ctx.moveTo(hipX, hipY);
      ctx.lineTo(thoraxX, thoraxY);
      ctx.stroke();
    } else {
      ctx.strokeStyle = '#22723a';
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.moveTo(hipX, hipY);
      ctx.lineTo(thoraxX, thoraxY);
      ctx.stroke();

      // Thoracic respiration pulse highlight
      ctx.strokeStyle = `rgba(74, 222, 128, ${0.4 + breathe * 0.3})`;
      ctx.lineWidth = 18;
      ctx.beginPath();
      ctx.moveTo(hipX * 0.4 + thoraxX * 0.6, hipY * 0.4 + thoraxY * 0.6);
      ctx.lineTo(thoraxX, thoraxY);
      ctx.stroke();
    }

    // Knapsack Tank if spraying
    if (actionId === 'spray') {
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.roundRect(thoraxX - 22, thoraxY - 10, 18, 38, 5);
      ctx.fill();
      ctx.strokeStyle = '#0369a1';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Spray Lance and droplet cone
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(thoraxX + 10, thoraxY + 15);
      ctx.lineTo(cx + 55, groundY - 20);
      ctx.stroke();

      // Aerosol droplet spray cone
      const sprayGrad = ctx.createRadialGradient(cx + 55, groundY - 20, 2, cx + 80, groundY, 40);
      sprayGrad.addColorStop(0, 'rgba(56, 189, 248, 0.8)');
      sprayGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
      ctx.fillStyle = sprayGrad;
      ctx.beginPath();
      ctx.moveTo(cx + 55, groundY - 20);
      ctx.lineTo(cx + 90, groundY - 8);
      ctx.lineTo(cx + 70, groundY + 12);
      ctx.closePath();
      ctx.fill();
    }

    // Headload Basket if carrying
    if (actionId === 'basket') {
      const basketX = headX;
      const basketY = headY - 20;
      ctx.fillStyle = '#b45309';
      ctx.beginPath();
      ctx.ellipse(basketX, basketY, 26, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      // Straw and golden paddy inside basket
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(basketX, basketY - 4, 18, Math.PI, 0, false);
      ctx.fill();
      // Supporting hands reaching up to basket rim
      ctx.strokeStyle = '#316943';
      ctx.lineWidth = 4.5;
      ctx.beginPath();
      ctx.moveTo(thoraxX, thoraxY + 6);
      ctx.lineTo(headX - 16, basketY);
      ctx.moveTo(thoraxX, thoraxY + 6);
      ctx.lineTo(headX + 16, basketY);
      ctx.stroke();
    }

    // Kodal / Hoe Strike Motion
    if (actionId === 'hoe') {
      const strikeAngle = Math.sin(time * Math.PI * 2);
      const hoeX = cx + 25 + strikeAngle * 25;
      const hoeY = groundY - 5 - Math.max(0, -strikeAngle * 45);

      ctx.strokeStyle = '#b45309';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(thoraxX + 10, thoraxY + 15);
      ctx.lineTo(hoeX, hoeY);
      ctx.stroke();

      ctx.fillStyle = '#64748b';
      ctx.beginPath();
      ctx.rect(hoeX - 4, hoeY - 3, 14, 8);
      ctx.fill();

      if (strikeAngle > 0.85) {
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(hoeX, groundY, 8, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Rice seedlings cluster if transplanting
    if (actionId === 'transplant') {
      ctx.strokeStyle = '#4ade80';
      ctx.lineWidth = 2.5;
      for (let i = -8; i <= 8; i += 4) {
        ctx.beginPath();
        ctx.moveTo(cx + 20 + i, groundY - 5);
        ctx.quadraticCurveTo(cx + 22 + i * 1.5, groundY - 22, cx + 24 + i * 2, groundY - 32);
        ctx.stroke();
      }
    }

    // Sickle Reaping
    if (actionId === 'sickle') {
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(cx + 20, groundY - 12, 14, Math.PI * 0.2, Math.PI * 1.1, false);
      ctx.stroke();
    }

    // Manual Weeding Nirani tool
    if (actionId === 'weeding') {
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx + 18, groundY - 2);
      ctx.lineTo(cx + 30, groundY - 8);
      ctx.stroke();
    }

    // Arms
    if (actionId !== 'basket') {
      ctx.strokeStyle = viewMode === 'muscles' ? stressColor(act.stressProfile.shoulder * effectiveEffort) : '#316943';
      ctx.lineWidth = viewMode === 'muscles' ? 8 : 5.5;
      ctx.beginPath();
      ctx.moveTo(thoraxX, thoraxY + 8);
      const elbowX = (thoraxX + cx + 25) * 0.5 - 10;
      const elbowY = (thoraxY + groundY) * 0.5 - 15;
      ctx.lineTo(elbowX, elbowY);
      ctx.lineTo(cx + 20, actionId === 'transplant' || actionId === 'weeding' ? groundY - 8 : groundY - 35);
      ctx.stroke();
    }

    // Head & Gamcha / Cap
    ctx.fillStyle = '#d97706';
    ctx.beginPath();
    ctx.arc(headX, headY, 13, 0, Math.PI * 2);
    ctx.fill();

    // Gamcha wrap
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.ellipse(headX, headY - 6, 14, 7, -0.2, 0, Math.PI * 2);
    ctx.fill();

    // Joint Protractor Callouts in Kinematics mode
    if (viewMode === 'kinematics') {
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 10px Inter, system-ui, sans-serif';

      // Lumbar Flexion Arc
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(hipX, hipY, 20, -Math.PI * 0.5, -Math.PI * 0.5 + spineAngle, false);
      ctx.stroke();
      ctx.fillText(`${act.torsoFlexion}°`, hipX - 32, hipY - 14);

      // Knee Angle
      ctx.strokeStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(rKneeX, rKneeY, 14, 0, Math.PI * 0.4, false);
      ctx.stroke();
      ctx.fillText(`${act.kneeFlexion}°`, rKneeX + 16, rKneeY + 4);
    }

    // Depth Markers on the right
    ctx.fillStyle = '#ffffff';
    ctx.font = '10px Inter, system-ui, sans-serif';
    ctx.fillText('0 cm', w - 42, groundY - 3);
    ctx.fillText('15 cm (Plough pan)', w - 95, groundY + 24);
    ctx.fillText('30 cm+ (Paleosol)', w - 95, groundY + 54);

    // Sinkage indicator callout line
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1.2;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(cx + 32, groundY);
    ctx.lineTo(cx + 65, groundY);
    ctx.moveTo(cx + 32, footY);
    ctx.lineTo(cx + 65, footY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 11px Inter, system-ui, sans-serif';
    ctx.fillText(`Δz = ${sinkPx > 0 ? dynamicSinkage : '0.0'} cm`, cx + 70, (groundY + footY) * 0.5 + 4);
  }, [time, actionId, soilId, dynamicSinkage, currentBreaths, effectiveEffort, soil, viewMode, soilMoistureDelta, act]);

  return (
    <section className="mt-10 overflow-hidden rounded-[30px] border border-primary-200/80 bg-white/95 p-6 shadow-xl backdrop-blur-md sm:p-8">
      {/* Header & Badges */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-primary-100 text-primary-800 shadow-xs">
            <Activity size={22} className="animate-pulse" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-[22px] font-bold tracking-tight text-ink sm:text-[26px]">
                {T('কৃষক বায়োমেকানিক্স ও মাটির ঘর্ষণ ল্যাব', 'Farmer Biomechanics & Soil Physics Lab')}
              </h2>
              <Tags list={['MODEL', 'RULE']} />
            </div>
            <p className="text-[13px] text-muted">
              {T('৩ডি কাইনেম্যাটিক্স, পেশী স্ট্রেস হিটম্যাপ, ফুসফুস-হৃদযন্ত্র ও মাটির স্ট্র্যাটিগ্রাফি প্রতিরোধ সিমুলেশন',
                 '3D inverse kinematics, muscle strain heatmap, cardiovascular cycle, and soil stratum resistance simulation')}
            </p>
          </div>
        </div>

        {/* View Mode & Speed Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Selector */}
          <div className="flex items-center rounded-full bg-slate-100 p-1 border border-border">
            {[
              ['kinematics', T('স্কেলিটন', 'Skeleton')],
              ['muscles', T('পেশী হিটম্যাপ', 'Muscles')],
              ['strata', T('মাটির প্রতিরোধ', 'Soil Strata')],
            ].map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                aria-pressed={viewMode === mode}
                className={`rounded-full px-3 py-1 text-[11.5px] font-semibold transition ${
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
                className={`rounded-full px-2 py-0.5 text-[11px] font-bold transition ${
                  simSpeed === spd ? 'bg-white text-ink shadow-xs' : 'text-muted hover:text-ink'
                }`}
              >
                {spd}×
              </button>
            ))}
          </div>

          {/* Play / Pause / Reset Controls */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIsPlaying(!isPlaying)}
              className="inline-flex items-center gap-1.5 rounded-full border border-primary-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-primary-800 shadow-xs hover:bg-primary-50 transition-colors"
            >
              {isPlaying ? <Pause size={13} /> : <Play size={13} />}
              <span>{isPlaying ? T('থামান', 'Pause') : T('চালান', 'Play')}</span>
            </button>
            <button
              type="button"
              onClick={() => { setTime(0); setEffortMultiplier(1.0); setSoilMoistureDelta(0); }}
              className="grid h-8 w-8 place-items-center rounded-full border border-border bg-white text-muted hover:text-ink transition-colors"
              title={T('পুনরায় শুরু', 'Reset')}
            >
              <RotateCcw size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Visualizer Canvas on Left, Controls & Metrics on Right */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.25fr_1fr]">
        {/* Left Column: Visualizer Canvas & Overlays */}
        <div className="relative overflow-hidden rounded-[24px] border border-border bg-slate-50 shadow-inner">
          <canvas
            ref={canvasRef}
            className="h-[360px] w-full sm:h-[420px]"
          />

          {/* Action & Soil Title Badge Overlay */}
          <div className="absolute left-4 top-4 flex flex-col gap-1.5 pointer-events-none">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 text-[12px] font-bold text-ink shadow-sm backdrop-blur-md">
              <Dumbbell size={13} className="text-primary-600" />
              {T(act.name.bn, act.name.en)}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 text-[11.5px] font-medium text-muted shadow-sm backdrop-blur-md">
              <Layers size={12} className="text-amber-600" />
              {T(soil.name.bn, soil.name.en)}
            </span>
          </div>

          {/* Bottom Telemetry Strip */}
          <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-white/90 p-2.5 text-[11.5px] font-medium text-ink shadow-sm backdrop-blur-md">
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex items-center gap-1 text-red-700 font-bold">
                <Heart size={13} className="text-red-500 animate-pulse" />
                <span>{T(`হৃদস্পন্দন: ${bnDigits(heartRateBpm)} bpm`, `Heart rate: ${heartRateBpm} bpm`)}</span>
              </span>
              <span className="flex items-center gap-1 text-primary-800">
                <Activity size={13} className="text-primary-600" />
                <span>{T(`শ্বাসক্রিয়া: ${bnDigits(currentBreaths)} বার/মি`, `Respiration: ${currentBreaths} bpm`)}</span>
              </span>
              <span className="flex items-center gap-1 text-amber-900">
                <Flame size={13} className="text-amber-500" />
                <span>{T(`ব্যয়: ${bnDigits(currentKcal)} ক্যালরি/ঘণ্টা`, `Burn: ${currentKcal} kcal/h`)}</span>
              </span>
            </div>
            <span className="tabular text-muted font-semibold">
              {T(`ঘর্ষণ রোধ: ${bnDigits(soil.shearStrengthKPa)} kPa`, `Shear: ${soil.shearStrengthKPa} kPa`)}
            </span>
          </div>
        </div>

        {/* Right Column: Interactive Selectors, Sliders & Physiological Readout */}
        <div className="flex flex-col gap-4">
          {/* Farmer Profile Selector */}
          <div>
            <label className="text-[13px] font-bold text-ink flex items-center justify-between">
              <span>{T('কৃষক প্রোফাইল ও বয়স (Farmer Profile & Physiology)', 'Farmer Profile & Physiology')}</span>
              <span className="text-[11.5px] font-semibold text-primary-700">
                {region.flag ?? '🇧🇩'} {T(farmer.bn, farmer.en)} ({num(farmer.age, lang)} {T('বছর', 'y/o')})
              </span>
            </label>
            <div className="hide-scrollbar mt-1.5 flex gap-1.5 overflow-x-auto pb-1">
              {FARMER_IDS.map((fid) => {
                const reg = REGIONS[fid];
                const fm = reg.farmer;
                const on = farmerId === fid;
                return (
                  <button
                    key={fid}
                    type="button"
                    onClick={() => setFarmerId(fid)}
                    className={`flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-semibold transition active:scale-95 ${
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
              <span>{T('১. কৃষি কাজের শারীরিক ভঙ্গি (Work Kinematics)', '1. Agricultural Activity')}</span>
              <span className="text-[11.5px] font-normal text-muted">{T('৬টি কৃষি কাজ', '6 activities')}</span>
            </label>
            <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
              {Object.values(ACTIONS).map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setActionId(a.id)}
                  className={`flex flex-col items-start rounded-2xl p-2.5 text-left transition-all ${
                    actionId === a.id
                      ? 'border border-primary-500 bg-primary-50/80 shadow-xs ring-2 ring-primary-500/20'
                      : 'border border-border/80 bg-white hover:border-primary-200'
                  }`}
                >
                  <span className={`text-[12px] font-bold line-clamp-1 ${actionId === a.id ? 'text-primary-900' : 'text-ink'}`}>
                    {T(a.name.bn.split(' ')[0], a.name.en.split(' ')[0])}
                  </span>
                  <span className="mt-0.5 text-[10.5px] text-muted line-clamp-1">
                    {T(a.tool.bn, a.tool.en)}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Soil Stratum Selector */}
          <div>
            <label className="text-[13px] font-bold text-ink flex items-center justify-between">
              <span>{T('২. মাটির ভূ-প্রকৃতি (Soil Geotechnical Stratum)', '2. Soil Geotechnical Layer')}</span>
              <span className="text-[11.5px] font-normal text-muted">{T('ডেল্টা স্তর', 'Delta stratum')}</span>
            </label>
            <div className="mt-1.5 grid grid-cols-3 gap-1.5">
              {Object.values(SOILS).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSoilId(s.id)}
                  className={`rounded-2xl p-2 text-center transition-all ${
                    soilId === s.id
                      ? 'border border-amber-600 bg-amber-50/80 shadow-xs ring-2 ring-amber-500/20'
                      : 'border border-border/80 bg-white hover:border-amber-200'
                  }`}
                >
                  <span className="block text-[11.5px] font-bold text-ink">
                    {T(s.name.bn.split(' ')[0], s.name.en.split(' ')[0])}
                  </span>
                  <span className="block text-[10.5px] text-muted tabular">
                    {T(`${bnDigits(s.footSinkageCm)} সেমি দেবে`, `${s.footSinkageCm}cm sink`)}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Effort & Soil Moisture Sliders in Side-by-Side Grid */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <div className="flex items-center justify-between text-[12px] font-bold text-ink">
                <span>{T('শ্রমের তীব্রতা', 'Labor Exertion')}</span>
                <span className="text-primary-700 tabular">{T(`${bnDigits((effortMultiplier * 100).toFixed(0))}%`, `${(effortMultiplier * 100).toFixed(0)}%`)}</span>
              </div>
              <input
                type="range"
                min="0.6"
                max="1.6"
                step="0.1"
                value={effortMultiplier}
                onChange={(e) => setEffortMultiplier(parseFloat(e.target.value))}
                className="mt-1 w-full accent-primary-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-muted">
                <span>{T('হালকা', 'Light')}</span>
                <span>{T('স্বাভাবিক', 'Nominal')}</span>
                <span>{T('কঠিন', 'Heavy')}</span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-[12px] font-bold text-ink">
                <span>{T('কাদামাটির আর্দ্রতা', 'Puddle Moisture')}</span>
                <span className="text-sky-700 tabular">{T(`${soilMoistureDelta > 0 ? '+' : ''}${bnDigits(soilMoistureDelta)}%`, `${soilMoistureDelta > 0 ? '+' : ''}${soilMoistureDelta}%`)}</span>
              </div>
              <input
                type="range"
                min="-10"
                max="20"
                step="5"
                value={soilMoistureDelta}
                onChange={(e) => setSoilMoistureDelta(parseInt(e.target.value, 10))}
                className="mt-1 w-full accent-sky-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-muted">
                <span>{T('শুকনো', 'Firm')}</span>
                <span>{T('স্বাভাবিক', 'Saturated')}</span>
                <span>{T('কাদাময়', 'Slurry')}</span>
              </div>
            </div>
          </div>

          {/* 4 Quantitative Biomechanical Cards */}
          <div className="grid grid-cols-2 gap-2">
            {/* L4/L5 Lumbar Force */}
            <div className="rounded-2xl border border-border bg-slate-50/70 p-2.5">
              <span className="text-[10.5px] font-semibold text-muted uppercase tracking-wider block">
                {T('কোমর টান (L4/L5)', 'Spinal L4/L5 Load')}
              </span>
              <div className="mt-0.5 flex items-baseline gap-1">
                <span className="font-display text-[18px] font-bold text-ink tabular">
                  {T(bnDigits(currentL4L5), currentL4L5.toLocaleString())}
                </span>
                <span className="text-[11px] text-muted">N</span>
              </div>
              <span className={`text-[10px] font-bold block ${currentL4L5 > 2400 ? 'text-amber-700' : 'text-emerald-700'}`}>
                {currentL4L5 > 2400 ? T('সতর্কতা: উচ্চ কোমর টান', 'High disc compression') : T('সহনশীল মাত্রা (NIOSH)', 'Within NIOSH limits')}
              </span>
            </div>

            {/* Metabolic Power Output */}
            <div className="rounded-2xl border border-border bg-slate-50/70 p-2.5">
              <span className="text-[10.5px] font-semibold text-muted uppercase tracking-wider block">
                {T('বিপাকীয় শক্তি (Power)', 'Metabolic Power')}
              </span>
              <div className="mt-0.5 flex items-baseline gap-1">
                <span className="font-display text-[18px] font-bold text-ink tabular">
                  {T(bnDigits(currentWatts), currentWatts)}
                </span>
                <span className="text-[11px] text-muted">Watts</span>
              </div>
              <span className="text-[10px] text-muted block">
                {T(`গতিবেগ: ${bnDigits(toolVelocity)} মি/সে`, `Velocity: ${toolVelocity} m/s`)}
              </span>
            </div>

            {/* Fatigue Endurance Time */}
            <div className="rounded-2xl border border-border bg-slate-50/70 p-2.5">
              <span className="text-[10.5px] font-semibold text-muted uppercase tracking-wider block">
                {T('ক্লান্তি আসার সময়', 'Endurance Limit')}
              </span>
              <div className="mt-0.5 flex items-baseline gap-1">
                <span className="font-display text-[18px] font-bold text-primary-900 tabular">
                  {T(bnDigits(minutesToFatigue), minutesToFatigue)}
                </span>
                <span className="text-[11px] text-muted">{T('মিনিট', 'mins')}</span>
              </div>
              <span className="text-[10px] text-muted block">
                {T(`ঘাম নির্গমন: ${bnDigits(sweatRateMlPerHour)} মিলি/ঘণ্টা`, `Sweat: ${sweatRateMlPerHour} mL/h`)}
              </span>
            </div>

            {/* Soil Foot Sinkage */}
            <div className="rounded-2xl border border-border bg-slate-50/70 p-2.5">
              <span className="text-[10.5px] font-semibold text-muted uppercase tracking-wider block">
                {T('পা দেবে যাওয়ার গভীরতা', 'Foot Sinkage')}
              </span>
              <div className="mt-0.5 flex items-baseline gap-1">
                <span className="font-display text-[18px] font-bold text-ink tabular">
                  {T(bnDigits(dynamicSinkage), dynamicSinkage)}
                </span>
                <span className="text-[11px] text-muted">cm</span>
              </div>
              <span className="text-[10px] text-muted block">
                {T(`সান্দ্রতা ফ্যাক্টর: ${bnDigits(dynamicViscousDrag.toFixed(1))}×`, `Viscous drag: ${dynamicViscousDrag.toFixed(1)}×`)}
              </span>
            </div>
          </div>

          {/* Ergonomic Work-Rest Advisory Banner */}
          <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/80 p-3 text-[12.5px] leading-5 text-emerald-950">
            <p className="flex items-center gap-1.5 font-bold text-emerald-900">
              <ShieldCheck size={15} className="text-emerald-700" />
              {T('এরগনোমিক ও স্বাস্থ্য পরামর্শ (Work-Rest Protocol):', 'Ergonomic & Hydration Protocol:')}
            </p>
            <p className="mt-0.5 text-emerald-900/90">
              {T(
                `প্রতি ${bnDigits(minutesToFatigue > 60 ? 50 : 35)} মিনিট কাজের পর অন্তত ১০ মিনিট ছায়ায় বিশ্রাম নিন এবং ${bnDigits(Math.round(sweatRateMlPerHour * 0.5))} মিলি লবণ-পানি বা স্যালাইন পান করুন।`,
                `Rest in shade for at least 10 minutes every ${minutesToFatigue > 60 ? 50 : 35} minutes of labor and replenish with ${Math.round(sweatRateMlPerHour * 0.5)} mL water/electrolyte.`
              )}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
