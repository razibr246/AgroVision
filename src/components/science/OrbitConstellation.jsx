// World-Class Interactive NASA Earth Observation Fleet & 3D Orbital Constellation Simulator.
// Powered by Three.js WebGL with high-fidelity procedural Earth texturing, atmospheric Rayleigh scattering,
// Keplerian orbital mechanics, volumetric sensor swath beams, and real-time astrodynamic telemetry.
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  Satellite,
  Radio,
  Compass,
  Clock,
  Eye,
  Layers,
  Activity,
  Play,
  Pause,
  Maximize2,
  Zap,
  Globe2,
  Scan,
  Crosshair,
  Radar as RadarIcon,
  Sparkles,
  Camera,
  Target,
  Volume2,
  VolumeX,
  RotateCcw,
  Wind,
  CloudRain,
  Sprout,
  Droplets
} from 'lucide-react';
import { useStore } from '../../store';
import { Card, Tags, Badge } from '../ui';
import { num } from '../../engine/dates';
import { subsolarPoint, circularOrbit, EARTH_SPIN_RAD_S } from '../../engine/sun';
import {
  createEarthSurfaceCanvas,
  createEarthNightCanvas,
  createEarthCloudsCanvas,
  createSpaceSkyboxCanvas,
  createEarthHeightCanvas,
  createEarthNormalCanvas,
  createEarthSpecularCanvas,
  createEarthClimateCanvas,
  geoToPixel
} from './earthTexture';

// True Astrodynamic Constants
const R_EARTH_KM = 6371; // km
const MU_EARTH = 398600.4418; // km^3/s^2 (Earth gravitational parameter)
const EARTH_RADIUS_3D = 5.0; // Three.js unit radius
const SCALE_ALT = 0.85; // Altitude visual scale factor

export const SATELLITE_MISSIONS = [
  {
    id: 'gpm',
    name: 'GPM Core Observatory',
    shortName: 'GPM',
    agency: 'NASA GSFC / JAXA',
    altitudeKm: 407,
    inclinationDeg: 65.0,
    raanDeg: 45.0,
    swathKm: 245,
    revisitHours: 2.5,
    payload: 'DPR (Ku/Ka Radar) + GMI Radiometer',
    spectrum: '13.6–35.5 GHz Microwave & 10–183 GHz',
    color: '#38bdf8', // sky-400
    colorHex: 0x38bdf8,
    paramBn: 'বৃষ্টির তীব্রতা, বর্ষা শুরুর নিশ্চিতকরণ (Rain Onset) ও চরম বর্ষণ',
    paramEn: 'Precipitation rate, monsoon onset confirmation, severe storms',
    appUsageBn: 'রোপণ রাডার (Ropon Radar): বর্ষা শুরুর সংকেত ও আমন ধান রোপণের নিরাপদ সময় নির্ধারণ।',
    appUsageEn: 'Powers Ropon Radar onset rule, checking rain bursts against 25-season station normals.',
    role: 'precipitation',
    sensorType: 'active-radar',
  },
  {
    id: 'smap',
    name: 'NASA SMAP',
    shortName: 'SMAP',
    agency: 'NASA JPL',
    altitudeKm: 685,
    inclinationDeg: 98.1,
    raanDeg: 120.0,
    swathKm: 1000,
    revisitHours: 48,
    payload: 'L-band Radiometer (1.41 GHz) + Conical Reflector',
    spectrum: '1.413 GHz L-Band Passive Microwave',
    color: '#4ade80', // green-400
    colorHex: 0x4ade80,
    paramBn: 'মাটির উপরিভাগের ০–৫ সেমি আর্দ্রতা ও রুট-জোন পানি ঘাটতি',
    paramEn: 'Topsoil (0–5 cm) moisture & root-zone water deficit',
    appUsageBn: 'বোরো ধানের AWD ভেজানো-শুকানো নিরীক্ষণ এবং রবি মৌসুমে সেচের প্রয়োজনীয়তা যাচাই।',
    appUsageEn: 'Calibrates root-zone volumetric wetness (0–100 cm) against FAO-56 daily water balance.',
    role: 'soil-moisture',
    sensorType: 'conical-radiometer',
  },
  {
    id: 'grace',
    name: 'GRACE-FO Tandem',
    shortName: 'GRACE-FO',
    agency: 'NASA JPL / GFZ',
    altitudeKm: 490,
    inclinationDeg: 89.0,
    raanDeg: 210.0,
    swathKm: 300,
    revisitHours: 720,
    payload: 'Twin KBR Microwave + Laser Interferometer (LRI)',
    spectrum: 'Sub-micron inter-satellite gravity ranging',
    color: '#2dd4bf', // teal-400
    colorHex: 0x2dd4bf,
    paramBn: 'ভূগর্ভস্থ গভীর একুইফারের পানি স্তর ও ভর পরিবর্তন',
    paramEn: 'Deep terrestrial groundwater storage & aquifer mass anomaly',
    appUsageBn: 'বরেন্দ্র অঞ্চলের ভূগর্ভস্থ পানির পতন (-৮.৯ সেমি/দশক) পর্যবেক্ষণ ও সেচ সাশ্রয় প্রক্ষেপণ।',
    appUsageEn: 'Monitors Bengal aquifer depletion rate (-8.9 cm/decade under the Barind) to guide crop rotation.',
    role: 'gravity-aquifer',
    sensorType: 'twin-laser',
  },
  {
    id: 'modis',
    name: 'Terra & Aqua MODIS',
    shortName: 'MODIS',
    agency: 'NASA GSFC',
    altitudeKm: 705,
    inclinationDeg: 98.2,
    raanDeg: 300.0,
    swathKm: 2330,
    revisitHours: 24,
    payload: '36-Band Cross-Track Spectroradiometer',
    spectrum: 'Visible, NIR, SWIR, Thermal IR (0.4–14.4 µm)',
    color: '#fb923c', // orange-400
    colorHex: 0xfb923c,
    paramBn: 'NDVI সবুজত্ব এবং মাটির উপরিতলের দিনের তাপমাত্রা (LST)',
    paramEn: 'NDVI vegetative vigor and daytime Land Surface Temperature',
    appUsageBn: '২০০১ থেকে প্রতি রবি মৌসুমে জমির সবুজত্ব ও তাপপ্রবাহে ফসলের চাপ মূল্যায়ন।',
    appUsageEn: 'Supplies 24-year historical NDVI stress cycles and March–May ground heat records.',
    role: 'vegetation-lst',
    sensorType: 'cross-track',
  },
  {
    id: 'landsat',
    name: 'Landsat 8 & 9',
    shortName: 'Landsat',
    agency: 'NASA / USGS',
    altitudeKm: 705,
    inclinationDeg: 98.2,
    raanDeg: 75.0,
    swathKm: 185,
    revisitHours: 192,
    payload: 'OLI-2 (Multispectral) + TIRS-2 (Thermal)',
    spectrum: '30m VNIR/SWIR + 100m Thermal bands',
    color: '#c084fc', // purple-400
    colorHex: 0xc084fc,
    paramBn: '৩০ মিটার সূক্ষ্ম ফসল সবুজত্ব, পার্সেল সীমানা ও বর্ণালী প্রতিফলন',
    paramEn: '30m multispectral parcel reflectance & thermal canopy stress',
    appUsageBn: '১৯টি মডেল খামারের জমির সীমানায় ৪০ বছরের ঐতিহাসিক বায়োমাস ও ফসল রূপান্তর।',
    appUsageEn: 'Provides 40-year multi-decadal historical baseline for field parcel greenness.',
    role: 'highres-optical',
    sensorType: 'pushbroom-optical',
  },
  {
    id: 'sentinel',
    name: 'Sentinel-1 & 2',
    shortName: 'Sentinel',
    agency: 'ESA / Copernicus',
    altitudeKm: 693,
    inclinationDeg: 98.2,
    raanDeg: 165.0,
    swathKm: 250,
    revisitHours: 120,
    payload: 'C-SAR Radar (10m) + MSI Optical (13 Bands)',
    spectrum: '5.4 GHz C-band radar & 10–20m Optical',
    color: '#60a5fa', // blue-400
    colorHex: 0x60a5fa,
    paramBn: 'মেঘ ভেদকারী রাডার ব্যাকস্ক্যাটার ও ১০ মিটার উদ্ভিজ্জ সূচক',
    paramEn: 'Cloud-piercing Synthetic Aperture Radar & 10m multispectral MSI',
    appUsageBn: 'বর্ষায় মেঘের আড়ালে আমন ধানের চারা রোপণ ও প্লাবনের সঠিক বিস্তার পর্যবেক্ষণ।',
    appUsageEn: 'Pierces monsoon cloud decks to verify Aman transplanting and standing floodwater dynamics.',
    role: 'sar-radar',
    sensorType: 'sar-antenna',
  },
  {
    id: 'ecostress',
    name: 'ECOSTRESS (ISS)',
    shortName: 'ECOSTRESS',
    agency: 'NASA JPL / ISS',
    altitudeKm: 415,
    inclinationDeg: 51.6,
    raanDeg: 255.0,
    swathKm: 400,
    revisitHours: 84,
    payload: 'Multispectral Thermal Infrared Radiometer',
    spectrum: '5 Thermal IR bands (8–12.5 µm)',
    color: '#e8a83e', // amber-400
    colorHex: 0xfacc15,
    paramBn: 'উদ্ভিদের বাষ্পীভবন-প্রস্বেদন (ET) ও প্রাক-লক্ষণ পানির সংকট',
    paramEn: 'Diurnal evapotranspiration (ET) flux & early water stress',
    appUsageBn: 'ফসল দৃশ্যত শুকিয়ে যাওয়ার আগেই পাতার তাপ বৃদ্ধি থেকে খরার প্রাথমিক সতর্কবার্তা।',
    appUsageEn: 'Detects diurnal crop water stress and thermal anomalies before visible wilt occurs.',
    role: 'thermal-et',
    sensorType: 'thermal-radiometer',
  },
];

// Target Upazila Coordinates in Bangladesh
const TARGET_POINTS = [
  { id: 'dhamrai', nameBn: 'ধামরাই, ঢাকা', nameEn: 'Dhamrai, Dhaka', lat: 23.92, lon: 90.14 },
  { id: 'godagari', nameBn: 'গোদাগাড়ী, রাজশাহী', nameEn: 'Godagari, Rajshahi', lat: 24.47, lon: 88.33 },
  { id: 'sitakunda', nameBn: 'সীতাকুণ্ড, চট্টগ্রাম', nameEn: 'Sitakunda, Chattogram', lat: 22.62, lon: 91.66 },
  { id: 'dacope', nameBn: 'দাকোপ, খুলনা', nameEn: 'Dacope, Khulna', lat: 22.57, lon: 89.51 },
  { id: 'bakerganj', nameBn: 'বাকেরগঞ্জ, বরিশাল', nameEn: 'Bakerganj, Barishal', lat: 22.55, lon: 90.34 },
  { id: 'galachipa', nameBn: 'গলাচিপা, পটুয়াখালী', nameEn: 'Galachipa, Patuakhali', lat: 22.16, lon: 90.43 },
  { id: 'gowainghat', nameBn: 'গোয়াইনঘাট, সিলেট', nameEn: 'Gowainghat, Sylhet', lat: 25.10, lon: 91.97 },
];

// Dual-layer Atmospheric Rayleigh & Mie Scattering Shaders:
// Outer atmospheric shell drawn on back faces 5.2% above the surface, combining Rayleigh limb scattering,
// ozone twilight reddening along the terminator, sun-directed Mie forward-scattering aureole, and altitude-adaptive scaling.
const ATMOSPHERE_SHELL = 1.052;
export const ATMOSPHERE_VERTEX_SHADER = `
  varying vec3 vNormal;
  varying vec3 vNormalW;
  varying vec3 vPosition;
  varying vec3 vPosW;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
    vec4 w = modelMatrix * vec4(position, 1.0);
    vPosW = w.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const ATMOSPHERE_FRAGMENT_SHADER = `
  varying vec3 vNormal;
  varying vec3 vNormalW;
  varying vec3 vPosition;
  varying vec3 vPosW;
  uniform vec3 color;
  uniform vec3 sunDir;
  uniform float camDist;
  void main() {
    vec3 viewDir = normalize(-vPosition);
    vec3 nw = normalize(vNormalW);
    float limbSin = ${(Math.sqrt(1 - 1 / (ATMOSPHERE_SHELL * ATMOSPHERE_SHELL))).toFixed(4)};
    // Altitude-adaptive horizon falloff: tighter from deep space, broader luminous limb from LEO
    float leoNorm = 1.0 - clamp((camDist - 5.35) / 26.0, 0.0, 1.0);
    float limb = -dot(viewDir, vNormal) / mix(limbSin, limbSin * 1.18, leoNorm);
    float glow = pow(clamp(limb, 0.0, 1.0), mix(1.85, 1.45, leoNorm));

    float NdL = dot(nw, sunDir);
    float sun = smoothstep(-0.34, 0.55, NdL);

    // Dual-wavelength Rayleigh + ozone twilight shift along the grazing terminator limb
    float term = smoothstep(-0.24, 0.02, NdL) * (1.0 - smoothstep(0.02, 0.35, NdL));
    vec3 twilightTint = mix(vec3(0.96, 0.38, 0.14), vec3(0.28, 0.42, 0.95), smoothstep(-0.18, 0.05, -NdL));
    vec3 rayleighTint = mix(color, twilightTint, term * 0.78);

    // Sun-directed Mie forward-scattering aureole (Henyey-Greenstein g = 0.72)
    vec3 viewRay = normalize(vPosW - cameraPosition);
    float cosTheta = clamp(dot(viewRay, sunDir), -1.0, 1.0);
    float g = 0.72;
    float mie = (1.0 - g * g) / pow(max(1.0 + g * g - 2.0 * g * cosTheta, 0.06), 1.5);
    float mieAureole = clamp(mie * 0.14, 0.0, 1.25) * smoothstep(-0.28, 0.25, NdL);

    vec3 outCol = rayleighTint * glow * (0.045 + 1.05 * sun) + vec3(1.0, 0.76, 0.46) * mieAureole * pow(clamp(limb, 0.0, 1.0), 1.25);
    outCol *= mix(0.88, 1.22, leoNorm);
    gl_FragColor = vec4(outCol, 1.0);
  }
`;

// Real Earth + Fallback Procedural Earth Shader (WebGL 1.0 / 2.0 compatible without extensions):
// Supports tangent-space normal/bump terrain relief with oblique-sun orographic shadows,
// dedicated ocean/shelf/inland-river specular mask, dual-wavelength Rayleigh + ozone twilight terminator,
// inner horizon Rayleigh/Mie rim haze, and interactive planetary climate data overlays.
export const EARTH_VERTEX_SHADER = `
  varying vec2 vUv;
  varying vec3 vNormalW;
  varying vec3 vTangentW;
  varying vec3 vBitangentW;
  varying vec3 vPosW;
  void main() {
    vUv = uv;
    // Analytic continuous tangent frame on unit sphere (+East, +North) without polar jumps
    vec3 objT = length(normal.xz) > 1e-4 ? normalize(vec3(normal.z, 0.0, -normal.x)) : vec3(1.0, 0.0, 0.0);
    vec3 objB = normalize(cross(normal, objT));
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vTangentW = normalize(mat3(modelMatrix) * objT);
    vBitangentW = normalize(mat3(modelMatrix) * objB);
    vec4 w = modelMatrix * vec4(position, 1.0);
    vPosW = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;

// Cloud cover from either a true-colour NASA VIIRS mosaic or a transparent procedural alpha cloud canvas.
const CLOUD_ALPHA_GLSL = `
  uniform float uProceduralClouds;
  float cloudAlpha(vec2 uv) {
    vec4 c = texture2D(cloudMap, uv);
    vec3 d = texture2D(dayMap, uv).rgb;
    float mn = min(min(c.r, c.g), c.b);
    float mx = max(max(c.r, c.g), c.b);
    float a = smoothstep(0.30, 0.74, mn) * (1.0 - smoothstep(0.05, 0.18, mx - mn));
    float ice = smoothstep(0.30, 0.55, min(min(d.r, d.g), d.b));
    float nasaAlpha = a * (1.0 - ice);
    return mix(nasaAlpha, c.a, uProceduralClouds);
  }
`;

export const EARTH_FRAGMENT_SHADER = `
  uniform sampler2D dayMap;
  uniform sampler2D nightMap;
  uniform sampler2D cloudMap;
  uniform sampler2D bumpMap;
  uniform sampler2D normalMap;
  uniform sampler2D specularMap;
  uniform sampler2D climateMap;
  uniform vec3 sunDir;
  uniform float cloudOffset;
  uniform float camDist;
  uniform float uTime;
  uniform float uProceduralEarth;
  uniform float uClimateLayer;
  uniform float uPrecipIntensity;
  uniform float uNdviWave;
  uniform float uSoilMoisture;
  varying vec2 vUv;
  varying vec3 vNormalW;
  varying vec3 vTangentW;
  varying vec3 vBitangentW;
  varying vec3 vPosW;
  ${CLOUD_ALPHA_GLSL}
  void main() {
    vec3 N = normalize(vNormalW);
    vec3 T = normalize(vTangentW);
    vec3 B = normalize(vBitangentW);
    vec3 V = normalize(cameraPosition - vPosW);
    float NdL = dot(N, sunDir);
    float dayAmt = smoothstep(-0.14, 0.18, NdL);
    float nightAmt = 1.0 - smoothstep(-0.18, 0.04, NdL);

    vec3 day = texture2D(dayMap, vUv).rgb;
    float lum = dot(day, vec3(0.2126, 0.7152, 0.0722));

    // Dedicated specular land/ocean/continental-shelf/inland-river mask (F11)
    vec3 specTex = texture2D(specularMap, vUv).rgb;
    float procShelf = clamp((specTex.b - specTex.r) * 5.0, 0.0, 1.0);
    float riverSignal = clamp((specTex.g - specTex.r) * 5.2, 0.0, 1.0);
    float procOcean = clamp((specTex.r - 0.18) * 1.35, 0.0, 1.0);

    // When real NASA Blue Marble is active (uProceduralEarth = 0), classify ocean & shallow coastal shelves
    // directly from true satellite colorimetry so islands & coastlines match accurately without polygon bleed
    float blueOverOther = smoothstep(-0.004, 0.028, day.b - max(day.r, day.g * 0.96));
    float darkMarine = 1.0 - smoothstep(0.032, 0.145, lum);
    float shallowCoastal = blueOverOther * (1.0 - smoothstep(0.08, 0.28, lum)) * (1.0 - smoothstep(0.055, 0.14, day.r));
    float nasaOcean = clamp(max(blueOverOther * (0.42 + 0.58 * darkMarine), shallowCoastal * 0.85), 0.0, 1.0);
    float snowIce = smoothstep(0.32, 0.58, min(min(day.r, day.g), day.b));

    float oceanWater = mix(nasaOcean, procOcean, uProceduralEarth);
    float shelfSignal = mix(max(procShelf * nasaOcean, shallowCoastal * 0.9), procShelf, uProceduralEarth);
    float activeRiver = riverSignal * (1.0 - snowIce) * mix(0.62, 1.0, uProceduralEarth);
    float waterSpecMask = clamp(max(oceanWater * mix(0.96, 0.82, shelfSignal), activeRiver * 0.85), 0.0, 1.0);
    float landMask = clamp(1.0 - oceanWater * (1.0 - activeRiver * 0.4), 0.0, 1.0);

    // Smooth terrain relief normal/bump mapping & oblique-sun orographic shadows (F10)
    vec3 mapN = texture2D(normalMap, vUv).xyz * 2.0 - 1.0;
    float normalStrength = mix(0.88, 0.06, oceanWater * (1.0 - activeRiver));
    vec3 bumpedN = normalize(T * (mapN.x * normalStrength) + B * (mapN.y * normalStrength) + N * max(mapN.z, 0.32));
    float bumpedNdL = max(dot(bumpedN, sunDir), 0.0);

    // Smooth horizon step relief shadow across Himalayas & continental cordilleras under oblique sunlight
    float elevCenter = texture2D(bumpMap, vUv).r;
    vec2 sunStepUv = vec2(dot(sunDir, T), dot(sunDir, B)) * 0.0028;
    float elevS1 = texture2D(bumpMap, vUv + sunStepUv).r;
    float elevS2 = texture2D(bumpMap, vUv + sunStepUv * 2.2).r;
    float elevS3 = texture2D(bumpMap, vUv + sunStepUv * 3.8).r;
    float maxHorizon = max(elevS1, max(elevS2, elevS3));
    float obliqueWeight = smoothstep(0.0, 0.08, NdL) * (1.0 - smoothstep(0.34, 0.74, NdL));
    float reliefShadow = clamp((maxHorizon - elevCenter - 0.025) * 2.4, 0.0, 0.34) * obliqueWeight * landMask;

    // Cloud shadow, cast slightly away from the sun
    float shadow = cloudAlpha(vUv + vec2(cloudOffset, 0.0) + sunDir.xz * 0.0015);
    float diffuseTerm = mix(max(NdL, 0.0), bumpedNdL, landMask * 0.82);

    // Dual-wavelength Rayleigh + Chappuis Ozone atmospheric transmittance near the terminator (F12)
    float pathLen = clamp((0.34 - NdL) / 0.48, 0.0, 1.0);
    vec3 rayleighFilter = exp(-vec3(0.22, 0.68, 1.85) * pathLen * 1.45);
    vec3 ozoneFilter = exp(-vec3(0.10, 0.42, 0.04) * pow(pathLen, 1.6));
    vec3 sunTint = mix(vec3(1.0), rayleighFilter * ozoneFilter * 1.18, smoothstep(0.32, -0.08, NdL));

    vec3 dayCol = day * (0.032 + 1.24 * diffuseTerm * sunTint * (1.0 - reliefShadow)) * (1.0 - 0.36 * shadow);

    // Sun glint on open ocean, Bay of Bengal continental shelf, and inland rivers (F11)
    vec3 waterN = normalize(mix(N, bumpedN, 0.16));
    vec3 H = normalize(sunDir + V);
    float specBase = max(dot(waterN, H), 0.0);
    float glintTight = pow(specBase, 145.0) * 0.82;
    float glintBroad = pow(specBase, 26.0) * 0.13;
    vec3 glintTint = mix(vec3(1.0, 0.94, 0.84), vec3(0.76, 0.98, 0.95), shelfSignal);
    glintTint = mix(glintTint, vec3(1.0, 0.90, 0.64), activeRiver);
    dayCol += glintTint * (glintTight + glintBroad) * waterSpecMask * dayAmt * (1.0 - 0.82 * shadow);

    // Dual-wavelength twilight horizon light belt (golden-crimson horizon -> cobalt-indigo ozone dusk) (F12)
    float twilightLow = smoothstep(-0.14, 0.02, NdL) * (1.0 - smoothstep(0.02, 0.24, NdL));
    float twilightHigh = smoothstep(-0.22, -0.05, NdL) * (1.0 - smoothstep(-0.04, 0.14, NdL));
    vec3 twilightGlow = vec3(0.96, 0.36, 0.08) * twilightLow * 0.18 + vec3(0.22, 0.32, 0.72) * twilightHigh * 0.11;

    // City lights cleanly emerging on the night hemisphere, dimmed under clouds
    vec3 night = texture2D(nightMap, vUv).rgb;
    float city = smoothstep(0.035, 0.45, night.r - night.b * 0.35);
    vec3 nightCol = (night * 0.78 * (1.0 - 0.5 * shadow) + vec3(1.0, 0.72, 0.38) * city * 1.75 * (1.0 - 0.72 * shadow)) * nightAmt;

    vec3 col = mix(nightCol, dayCol, dayAmt) + twilightGlow;

    // Interactive 3D Planetary Climate Data Layers (F16)
    if (uClimateLayer > 0.5) {
      vec3 clim = texture2D(climateMap, vUv).rgb;
      if (uClimateLayer < 1.5) {
        // Layer 1: GPM IMERG Precipitation Heatglow
        float rainPulse = 0.72 + 0.28 * sin(vUv.x * 42.0 - uTime * 1.6 + vUv.y * 22.0);
        float precip = clamp(clim.r * uPrecipIntensity * rainPulse, 0.0, 1.35);
        vec3 precipPal = mix(vec3(0.04, 0.36, 0.82), vec3(0.18, 0.88, 0.96), smoothstep(0.15, 0.55, precip));
        precipPal = mix(precipPal, vec3(0.95, 0.35, 0.88), smoothstep(0.55, 1.05, precip));
        float mask = smoothstep(0.12, 0.85, precip);
        col = mix(col * 0.78, col * 0.45 + precipPal * (0.55 + 0.55 * precip), mask * 0.82);
      } else if (uClimateLayer < 2.5) {
        // Layer 2: MODIS NDVI Biosphere Greenness Wave
        float wave = 0.76 + 0.24 * sin(vUv.y * 14.0 - uNdviWave * 6.2831853 + vUv.x * 4.5);
        float ndvi = clamp(clim.g * wave, 0.0, 1.0) * landMask;
        vec3 ndviCol = mix(vec3(0.68, 0.38, 0.14), vec3(0.16, 0.68, 0.28), smoothstep(0.15, 0.55, ndvi));
        ndviCol = mix(ndviCol, vec3(0.45, 0.96, 0.36), smoothstep(0.55, 0.92, ndvi));
        col = mix(col * 0.82, col * 0.42 + ndviCol * 0.85, landMask * 0.72);
      } else {
        // Layer 3: SMAP / GRACE Soil Moisture & Aquifer Anomalies
        float moist = clamp(clim.b * uSoilMoisture, 0.0, 1.2) * landMask;
        vec3 deficitCol = vec3(0.96, 0.34, 0.12);
        vec3 balancedCol = vec3(0.84, 0.72, 0.24);
        vec3 wetCol = vec3(0.08, 0.82, 0.92);
        vec3 soilPal = mix(deficitCol, balancedCol, smoothstep(0.10, 0.45, moist));
        soilPal = mix(soilPal, wetCol, smoothstep(0.45, 0.88, moist));
        col = mix(col * 0.82, col * 0.40 + soilPal * 0.82, landMask * 0.75);
      }
    }

    // Inner Horizon Rim Haze & Sun-Directed Mie Forward Scatter (F13)
    float leoNorm = 1.0 - clamp((camDist - 5.35) / 26.0, 0.0, 1.0);
    float fres = pow(1.0 - max(dot(N, V), 0.0), mix(3.2, 2.5, leoNorm));
    vec3 rimDayCol = vec3(0.26, 0.54, 1.0);
    vec3 rimTermCol = vec3(0.95, 0.42, 0.18);
    vec3 rimCol = mix(rimDayCol, rimTermCol, twilightLow * 0.85);

    vec3 viewRay = normalize(vPosW - cameraPosition);
    float cosTheta = clamp(dot(viewRay, sunDir), -1.0, 1.0);
    float gMie = 0.70;
    float mieFwd = (1.0 - gMie * gMie) / pow(max(1.0 + gMie * gMie - 2.0 * gMie * cosTheta, 0.08), 1.5);
    float mieRim = clamp(mieFwd * 0.10, 0.0, 0.75) * fres * smoothstep(-0.30, 0.30, NdL);

    col += rimCol * fres * mix(0.48, 0.72, leoNorm) * smoothstep(-0.28, 0.45, NdL);
    col += vec3(1.0, 0.78, 0.48) * mieRim;

    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export const CLOUD_FRAGMENT_SHADER = `
  uniform sampler2D dayMap;
  uniform sampler2D cloudMap;
  uniform vec3 sunDir;
  uniform float cloudOffset;
  varying vec2 vUv;
  varying vec3 vNormalW;
  varying vec3 vPosW;
  ${CLOUD_ALPHA_GLSL}
  void main() {
    vec3 N = normalize(vNormalW);
    float NdL = dot(N, sunDir);
    float a = cloudAlpha(vUv + vec2(cloudOffset, 0.0));
    float lit = 0.015 + 1.15 * smoothstep(-0.08, 0.6, NdL);
    float twilight = smoothstep(-0.14, 0.02, NdL) * (1.0 - smoothstep(0.02, 0.28, NdL));
    vec3 col = vec3(0.97, 0.98, 1.0) * lit + vec3(0.75, 0.28, 0.07) * twilight * 0.42;
    gl_FragColor = vec4(col, a * 0.92);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

// Loaded once and kept: the scene is rebuilt whenever the mission or controls change.
let realEarthTextures = null;
function loadRealEarthTextures() {
  if (!realEarthTextures) {
    const base = `${import.meta.env.BASE_URL}textures/earth/`;
    const loader = new THREE.TextureLoader();
    const one = (name) => loader.loadAsync(`${base}${name}.jpg`).then((t) => {
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 8;
      return t;
    });
    realEarthTextures = Promise.all([one('day'), one('night'), one('clouds')])
      .then(([day, night, clouds]) => ({ day, night, clouds }))
      .catch((err) => {
        realEarthTextures = null; // try again next time; the drawn globe stays meanwhile
        throw err;
      });
  }
  return realEarthTextures;
}

// Helper: Convert Geographic Coordinates (Lat, Lon) to 3D Cartesian Vector
function latLonToVector3(lat, lon, radius) {
  const latRad = (lat * Math.PI) / 180;
  const lonRad = (lon * Math.PI) / 180;
  const theta = lonRad + Math.PI;
  const phi = Math.PI / 2 - latRad;

  const x = -radius * Math.cos(theta) * Math.sin(phi);
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(theta) * Math.sin(phi);
  return new THREE.Vector3(x, y, z);
}

// Build 3D Bay of Bengal Cyclone Wind & Wave Vector Streamlines (F17)
function buildBengalCycloneStreamlines(earthRadius) {
  const group = new THREE.Group();
  const eyeLat = 19.3;
  const eyeLon = 89.6;
  const streamCount = 12;
  const steps = 40;
  const paths = [];
  const lineDisposables = [];

  for (let s = 0; s < streamCount; s++) {
    const baseAngle = (s / streamCount) * Math.PI * 2 + 0.18;
    const isDeltaFeeder = s % 3 !== 2;
    const outerRadius = 7.4 + (s % 3) * 1.1;
    const innerRadius = 1.9 + (s % 2) * 0.45; // keep eyewall ring open so vectors swirl cleanly
    const pts = [];
    const colors = [];

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      // Counterclockwise cyclonic spiral inflow in Bay of Bengal -> Sundarbans & Meghna delta coast
      const rDeg = outerRadius * (1 - t * (1 - innerRadius / outerRadius));
      const theta = baseAngle + t * Math.PI * 1.25;
      const deltaPull = isDeltaFeeder ? Math.pow(t, 1.9) * 3.1 : Math.pow(t, 2.3) * 1.35;
      const lat = eyeLat + Math.sin(theta) * rDeg * 0.72 + deltaPull;
      const lon = eyeLon + Math.cos(theta) * rDeg * 0.86 + Math.sin(t * 2.1) * 0.28;
      pts.push(latLonToVector3(lat, lon, earthRadius * (1.016 + 0.009 * Math.sin(t * Math.PI))));

      // Gradient from deep cyan inflow -> teal coastal wave -> warm amber coastal surge arm
      const c = new THREE.Color();
      if (t < 0.45) {
        c.setRGB(0.20, 0.76, 0.96); // sky-400
      } else if (t < 0.8) {
        c.setRGB(0.16, 0.84, 0.72); // teal-400
      } else {
        c.setRGB(0.96, 0.56, 0.22); // orange-400 eyewall / surge
      }
      colors.push(c.r, c.g, c.b);
    }

    paths.push(pts);
    const geom = new THREE.BufferGeometry().setFromPoints(pts);
    geom.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    const mat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.28,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    group.add(new THREE.Line(geom, mat));
    lineDisposables.push(geom, mat);
  }

  // Animated flowing vector particles along streamlines
  const particlesPerPath = 14;
  const totalParticles = streamCount * particlesPerPath;
  const positions = new Float32Array(totalParticles * 3);
  const pColors = new Float32Array(totalParticles * 3);
  const pAlphas = new Float32Array(totalParticles);
  const pMeta = [];

  for (let s = 0; s < streamCount; s++) {
    for (let k = 0; k < particlesPerPath; k++) {
      const idx = s * particlesPerPath + k;
      pMeta.push({
        pathIdx: s,
        phase: (k / particlesPerPath + (s * 0.083)) % 1,
        speed: 0.26 + (s % 4) * 0.04,
      });
      pAlphas[idx] = 1.0;
    }
  }

  const particleGeom = new THREE.BufferGeometry();
  particleGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  particleGeom.setAttribute('aColor', new THREE.BufferAttribute(pColors, 3));
  particleGeom.setAttribute('aAlpha', new THREE.BufferAttribute(pAlphas, 1));

  const particleMat = new THREE.ShaderMaterial({
    vertexShader: `
      attribute vec3 aColor;
      attribute float aAlpha;
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        vColor = aColor;
        vAlpha = aAlpha;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = clamp(20.0 / max(-mvPosition.z, 1.0), 2.2, 5.4);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        vec2 c = gl_PointCoord - vec2(0.5);
        float d = dot(c, c);
        if (d > 0.25) discard;
        float glow = exp(-d * 11.0);
        gl_FragColor = vec4(vColor, glow * vAlpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const pointsMesh = new THREE.Points(particleGeom, particleMat);
  group.add(pointsMesh);

  const tmpPos = new THREE.Vector3();
  const update = (simTimeSec) => {
    const posAttr = particleGeom.attributes.position;
    const colAttr = particleGeom.attributes.aColor;
    const alphaAttr = particleGeom.attributes.aAlpha;

    const safeTime = Number.isFinite(simTimeSec) ? simTimeSec : 0;
    for (let i = 0; i < totalParticles; i++) {
      const meta = pMeta[i];
      const path = paths[meta.pathIdx];
      // Normalise t to [0, 1) even when safeTime is negative or non-finite
      const raw = meta.phase + safeTime * meta.speed;
      const t = ((raw % 1) + 1) % 1;
      const fIdx = t * (path.length - 1);
      const i0 = Math.max(0, Math.min(path.length - 1, Math.floor(fIdx)));
      const i1 = Math.min(path.length - 1, i0 + 1);
      const frac = fIdx - i0;
      tmpPos.lerpVectors(path[i0], path[i1], frac);

      posAttr.array[i * 3] = tmpPos.x;
      posAttr.array[i * 3 + 1] = tmpPos.y;
      posAttr.array[i * 3 + 2] = tmpPos.z;

      // Color gradient: ocean cyan -> teal surge -> amber cyclone core
      colAttr.array[i * 3] = 0.2 + 0.76 * Math.pow(t, 1.8);
      colAttr.array[i * 3 + 1] = 0.78 - 0.16 * t;
      colAttr.array[i * 3 + 2] = 0.94 - 0.70 * Math.pow(t, 1.6);

      // Smooth fade-in and fade-out at trajectory endpoints without blowing out eyewall
      alphaAttr.array[i] = Math.sin(t * Math.PI) * 0.85;
    }

    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
    alphaAttr.needsUpdate = true;
  };

  update(0);
  return {
    group,
    update,
    dispose: () => {
      lineDisposables.forEach((d) => d.dispose());
      particleGeom.dispose();
      particleMat.dispose();
    },
  };
}

// Synthesize High-Tech Audio Telemetry Chime
function playTelemetryChime(freq = 880) {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.45, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.07, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.24);
  } catch {}
}

export const PLANETARY_DATA_LAYERS = [
  {
    id: 0,
    bn: 'প্রাকৃতিক পৃথিবী',
    en: 'Natural Earth',
    gradient: '',
    lowBn: '',
    highBn: '',
    lowEn: '',
    highEn: '',
  },
  {
    id: 1,
    bn: 'জিপিএম বৃষ্টিপাত',
    en: 'GPM Precip',
    gradient: 'from-blue-600 via-cyan-400 to-fuchsia-400',
    lowBn: 'হালকা',
    highBn: 'মৌসুমি ঝড় (মিমি/ঘণ্টা)',
    lowEn: 'Trace',
    highEn: 'Monsoon (mm/h)',
  },
  {
    id: 2,
    bn: 'মোডিস সবুজ (NDVI)',
    en: 'MODIS NDVI',
    gradient: 'from-amber-700 via-lime-500 to-emerald-400',
    lowBn: 'শুষ্ক ভূমি',
    highBn: 'সবুজ শস্য তরঙ্গ',
    lowEn: 'Arid',
    highEn: 'Crop peak',
  },
  {
    id: 3,
    bn: 'স্ম্যাপ/গ্রেস আর্দ্রতা',
    en: 'SMAP/GRACE Soil',
    gradient: 'from-orange-500 via-amber-300 to-cyan-400',
    lowBn: 'ভূগর্ভস্থ ঘাটতি',
    highBn: 'আর্দ্র বদ্বীপ',
    lowEn: 'Aquifer deficit',
    highEn: 'Wet delta',
  },
];

export default function OrbitConstellation() {
  const { s, T, L, upazila } = useStore();
  const lang = s.lang;

  const [activeSatId, setActiveSatId] = useState('gpm');
  const [isPlaying, setIsPlaying] = useState(true);
  const [warpSpeed, setWarpSpeed] = useState(5); // 1x, 5x, 20x
  const [cameraMode, setCameraMode] = useState('free'); // 'free' | 'follow' | 'deltaFocus'
  const [viewMode, setViewMode] = useState('globe3d'); // 'globe3d' | 'radarScope'
  const [webglSupported, setWebglSupported] = useState(true);
  const [showSwath, setShowSwath] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [climateLayer, setClimateLayer] = useState(0); // 0: Natural, 1: GPM Precip, 2: MODIS NDVI, 3: SMAP/GRACE Soil Moisture
  const [layerIntensity, setLayerIntensity] = useState(1.0);
  const [showWindStreams, setShowWindStreams] = useState(true);
  const [pulseCount, setPulseCount] = useState(0);
  const [inSwathLock, setInSwathLock] = useState(false);
  const [telemetryTime, setTelemetryTime] = useState(Date.now());
  const [earthCloudsDate, setEarthCloudsDate] = useState(null);
  useEffect(() => {
    let live = true;
    fetch(`${import.meta.env.BASE_URL}textures/earth/meta.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((m) => { if (live && m?.cloudsDate) setEarthCloudsDate(m.cloudsDate); })
      .catch(() => {});
    return () => { live = false; };
  }, []);

  const containerRef = useRef(null);
  const canvas2dRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const controlsRef = useRef(null);
  const animFrameRef = useRef(null);

  // References to 3D scene objects
  const earthMeshRef = useRef(null);
  const cloudsMeshRef = useRef(null);
  const satellitesGroupRef = useRef({});
  const beamMeshRef = useRef(null);
  const swathDecalRef = useRef(null);
  const pulseRingsRef = useRef([]);
  const radarSweepAngleRef = useRef(0);
  const simAngleRef = useRef(0);
  const simClockRef = useRef(null);
  const recenterRef = useRef(false);

  const activeMission = useMemo(
    () => SATELLITE_MISSIONS.find((m) => m.id === activeSatId) ?? SATELLITE_MISSIONS[0],
    [activeSatId]
  );

  // Astrodynamic orbital calculations
  const physics = useMemo(() => {
    const r = R_EARTH_KM + activeMission.altitudeKm;
    const v = Math.sqrt(MU_EARTH / r); // km/s
    const periodSec = 2 * Math.PI * Math.sqrt(Math.pow(r, 3) / MU_EARTH);
    const periodMin = periodSec / 60;
    const dopplerMaxKHz = ((v / 300000) * 14.0 * 1e6) / 1000;
    return {
      radiusKm: r,
      velocityKmS: v,
      periodMin,
      revolutionsPerDay: (24 * 60) / periodMin,
      dopplerKHz: dopplerMaxKHz,
    };
  }, [activeMission]);

  // Trigger high-energy sensory microwave pulse
  const triggerPulse = useCallback(() => {
    setPulseCount((c) => c + 1);
    if (soundEnabled) playTelemetryChime(784);

    // Add pulse ring to 3D scene
    if (sceneRef.current && earthMeshRef.current) {
      const ringGeom = new THREE.RingGeometry(0.1, 0.25, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: activeMission.colorHex,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.95,
      });
      const ring = new THREE.Mesh(ringGeom, ringMat);

      // Place ring at Bengal Delta
      const deltaPos = latLonToVector3(23.92, 90.14, EARTH_RADIUS_3D * 1.02);
      ring.position.copy(deltaPos);
      ring.lookAt(0, 0, 0);
      earthMeshRef.current.add(ring);

      pulseRingsRef.current.push({
        mesh: ring,
        scale: 1,
        opacity: 1,
      });
    }
  }, [activeMission, soundEnabled]);

  // The scene is built once; the loop reads the current controls from here, so switching mission, speed or camera
  // eases the running scene instead of tearing it down and starting again.
  // Keep `cameraMode` synchronized explicitly so intermediate telemetry re-renders never override an active user detach.
  const liveRef = useRef({ cameraMode });
  liveRef.current.activeSatId = activeSatId;
  liveRef.current.isPlaying = isPlaying;
  liveRef.current.warpSpeed = warpSpeed;
  liveRef.current.showSwath = showSwath;
  liveRef.current.activeMission = activeMission;
  liveRef.current.climateLayer = climateLayer;
  liveRef.current.layerIntensity = layerIntensity;
  liveRef.current.showWindStreams = showWindStreams;
  useEffect(() => {
    liveRef.current.cameraMode = cameraMode;
  }, [cameraMode]);

  // =========================================================================
  // Initialize Three.js 3D WebGL Scene
  // =========================================================================
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 450;

    // 1. Scene & Camera Setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.05, 1000);
    camera.position.set(0, 5.8, 12.2);
    cameraRef.current = camera;

    // 2. High-Performance Antialiased WebGL Renderer
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;
      renderer.domElement.style.touchAction = 'none';
      container.innerHTML = '';
      container.appendChild(renderer.domElement);
      rendererRef.current = renderer;
    } catch (err) {
      console.warn('WebGL initialization failed, falling back to 2D holographic tactical scope:', err);
      setWebglSupported(false);
      return;
    }

    // 3. Smooth Damped Orbit Controls & Touch Velocity Smoothing (F14)
    let controls = null;
    try {
      controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.04;
      controls.minDistance = 5.35; // LEO closeup
      controls.maxDistance = 36.0; // Deep space
      controls.enablePan = false;
      controls.zoomToCursor = false;
      controls.minPolarAngle = 0.08;
      controls.maxPolarAngle = Math.PI - 0.08;
      controls.rotateSpeed = 0.65;
      controls.zoomSpeed = 0.85;
      controls.touches = {
        ONE: THREE.TOUCH.ROTATE,
        TWO: THREE.TOUCH.DOLLY_ROTATE,
      };
      controlsRef.current = controls;
    } catch (err) {
      console.warn('OrbitControls init warning:', err);
    }

    const reducedMotion = typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    // 4. Lighting Rig
    // Sun Directional Light (creates dramatic day/night terminator across globe)
    const sunLight = new THREE.DirectionalLight(0xfffaed, 2.8);
    sunLight.position.set(-24, 10, 18);
    scene.add(sunLight);

    // Deep space celestial fill light
    const ambientLight = new THREE.AmbientLight(0x10261a, 0.55);
    scene.add(ambientLight);

    // 5. Deep Cosmic Starry Skybox Background
    const skyboxCanvas = createSpaceSkyboxCanvas(2048, 1024);
    let skyboxTex = null;
    if (skyboxCanvas) {
      skyboxTex = new THREE.CanvasTexture(skyboxCanvas);
      skyboxTex.colorSpace = THREE.SRGBColorSpace;
      scene.background = skyboxTex;
    } else {
      scene.background = new THREE.Color(0x03110b);
    }

    // 6. Realistic 3D Earth Sphere, Terrain Maps & Dual-Layer Atmospheric Shell (F10, F11, F12, F13, F16)
    const earthGroup = new THREE.Group();
    // Earth's spin axis is the scene's y axis, shared with the orbit planes; the 23.44° tilt shows as the sun's
    // declination, which moves the day-night line with the season.
    scene.add(earthGroup);

    const makeGlobeTex = (canvas, isColor = false) => {
      if (!canvas) return null;
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = isColor ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.anisotropy = 4;
      return tex;
    };

    const earthSurfaceCanvas = createEarthSurfaceCanvas(2048, 1024);
    const earthNightCanvas = createEarthNightCanvas(2048, 1024);
    const cloudsCanvas = createEarthCloudsCanvas(2048, 1024);
    const heightCanvas = createEarthHeightCanvas(1024, 512);
    const normalCanvas = createEarthNormalCanvas(1024, 512, heightCanvas, 2.0);
    const specularCanvas = createEarthSpecularCanvas(2048, 1024);
    const climateCanvas = createEarthClimateCanvas(1024, 512);

    let earthTex = makeGlobeTex(earthSurfaceCanvas, true);
    let nightTex = makeGlobeTex(earthNightCanvas, true);
    let cloudsTex = makeGlobeTex(cloudsCanvas, true);
    const bumpTex = makeGlobeTex(heightCanvas, false);
    const normalTex = makeGlobeTex(normalCanvas, false);
    const specularTex = makeGlobeTex(specularCanvas, false);
    const climateTex = makeGlobeTex(climateCanvas, false);

    const sunDirWorld = sunLight.position.clone().normalize();
    const commonUniforms = {
      dayMap: { value: earthTex },
      cloudMap: { value: cloudsTex },
      sunDir: { value: sunDirWorld },
      cloudOffset: { value: 0 },
      uProceduralClouds: { value: 1.0 },
    };
    const earthUniforms = {
      ...commonUniforms,
      nightMap: { value: nightTex },
      bumpMap: { value: bumpTex },
      normalMap: { value: normalTex },
      specularMap: { value: specularTex },
      climateMap: { value: climateTex },
      camDist: { value: camera.position.length() },
      uTime: { value: 0 },
      uProceduralEarth: { value: 1.0 },
      uClimateLayer: { value: liveRef.current.climateLayer || 0 },
      uPrecipIntensity: { value: 1.0 },
      uNdviWave: { value: 0.0 },
      uSoilMoisture: { value: 1.0 },
    };

    const earthGeom = new THREE.SphereGeometry(EARTH_RADIUS_3D, 72, 72);
    const earthMat = new THREE.ShaderMaterial({
      vertexShader: EARTH_VERTEX_SHADER,
      fragmentShader: EARTH_FRAGMENT_SHADER,
      uniforms: earthUniforms,
    });
    const earthMesh = new THREE.Mesh(earthGeom, earthMat);
    earthMesh.rotation.y = Math.PI - 0.22; // Face Bengal Delta & South Asia directly toward camera on start
    earthGroup.add(earthMesh);
    earthMeshRef.current = earthMesh;

    // B. Atmospheric Cloud Layer (Rotating Sphere)
    const cloudsGeom = new THREE.SphereGeometry(EARTH_RADIUS_3D * 1.014, 64, 64);
    const cloudsMat = new THREE.ShaderMaterial({
      vertexShader: EARTH_VERTEX_SHADER,
      fragmentShader: CLOUD_FRAGMENT_SHADER,
      uniforms: commonUniforms,
      transparent: true,
      depthWrite: false,
    });
    const cloudsMesh = new THREE.Mesh(cloudsGeom, cloudsMat);
    cloudsMesh.rotation.y = Math.PI - 0.22;
    earthGroup.add(cloudsMesh);
    cloudsMeshRef.current = cloudsMesh;

    // C. Outer Atmospheric Rayleigh & Mie Scattering Glow Shell
    const atmosGeom = new THREE.SphereGeometry(EARTH_RADIUS_3D * ATMOSPHERE_SHELL, 64, 64);
    const atmosUniforms = {
      color: { value: new THREE.Color(0x5aa9ff) },
      sunDir: { value: sunDirWorld },
      camDist: { value: camera.position.length() },
    };
    const atmosMat = new THREE.ShaderMaterial({
      vertexShader: ATMOSPHERE_VERTEX_SHADER,
      fragmentShader: ATMOSPHERE_FRAGMENT_SHADER,
      uniforms: atmosUniforms,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
    });
    const atmosMesh = new THREE.Mesh(atmosGeom, atmosMat);
    earthGroup.add(atmosMesh);

    // D. Animated Bay of Bengal Cyclone Wind & Wave Vector Particle Streamlines (F17)
    const cycloneStreams = buildBengalCycloneStreamlines(EARTH_RADIUS_3D);
    cycloneStreams.group.visible = liveRef.current.showWindStreams;
    earthMesh.add(cycloneStreams.group);

    // Swap the procedural day/night/cloud maps for real NASA Blue/Black Marble + VIIRS clouds once loaded,
    // preserving terrain bump/normal, specular mask, climate overlays, and dual-layer atmosphere seamlessly.
    let disposed = false;
    let realEarth = null;
    loadRealEarthTextures()
      .then(({ day, night, clouds }) => {
        if (disposed) {
          day.dispose();
          night.dispose();
          clouds.dispose();
          return;
        }
        [day, night, clouds].forEach((t) => {
          t.wrapS = THREE.RepeatWrapping;
          t.wrapT = THREE.ClampToEdgeWrapping;
        });
        const oldEarthTex = earthTex;
        const oldNightTex = nightTex;
        const oldCloudsTex = cloudsTex;
        earthTex = day;
        nightTex = night;
        cloudsTex = clouds;
        commonUniforms.dayMap.value = day;
        earthUniforms.nightMap.value = night;
        commonUniforms.cloudMap.value = clouds;
        commonUniforms.uProceduralClouds.value = 0.0;
        earthUniforms.uProceduralEarth.value = 0.0;
        if (oldEarthTex) oldEarthTex.dispose();
        if (oldNightTex) oldNightTex.dispose();
        if (oldCloudsTex) oldCloudsTex.dispose();
        cloudsMesh.scale.setScalar(1.006 / 1.014); // real clouds sit ~10 km up, just above the ground
        cloudsMesh.rotation.y = earthMesh.rotation.y;
        sunLight.intensity = 3.2; // the satellites are still lit by the standard lights
        realEarth = { common: commonUniforms };
      })
      .catch((err) => console.warn('NASA Earth textures not loaded, keeping the drawn globe:', err));

    // D. Bengal Delta 3D Holographic Marker
    const deltaMarkerGroup = new THREE.Group();
    const deltaPos = latLonToVector3(23.92, 90.14, EARTH_RADIUS_3D);
    deltaMarkerGroup.position.copy(deltaPos);

    // Glowing Target Ring
    const markerRingGeom = new THREE.RingGeometry(0.08, 0.15, 24);
    const markerRingMat = new THREE.MeshBasicMaterial({
      color: 0x7cc06a,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
    });
    const markerRing = new THREE.Mesh(markerRingGeom, markerRingMat);
    markerRing.lookAt(0, 0, 0);
    deltaMarkerGroup.add(markerRing);

    // Telemetry Uplink Beam Cylinder aligned radially along surface normal at Bengal Delta
    const uplinkGeom = new THREE.CylinderGeometry(0.02, 0.02, 1.2, 12);
    const uplinkMat = new THREE.MeshBasicMaterial({
      color: 0xe8a83e,
      transparent: true,
      opacity: 0.65,
    });
    const uplinkMesh = new THREE.Mesh(uplinkGeom, uplinkMat);
    const deltaNorm = deltaPos.clone().normalize();
    uplinkMesh.position.copy(deltaNorm).multiplyScalar(0.6);
    uplinkMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), deltaNorm);
    deltaMarkerGroup.add(uplinkMesh);

    earthMesh.add(deltaMarkerGroup);

    // 7. Build 3D Keplerian Orbital Tracks & High-Tech Satellite Models
    const satDict = {};

    SATELLITE_MISSIONS.forEach((sat) => {
      const satGroup = new THREE.Group();
      scene.add(satGroup);

      const rOrbit = EARTH_RADIUS_3D + (sat.altitudeKm / R_EARTH_KM) * EARTH_RADIUS_3D * SCALE_ALT;

      // Orbit Plane Orientation Group
      const orbitPlane = new THREE.Group();
      orbitPlane.rotation.order = 'YXZ'; // tilt by the inclination first, then swing the node round by the RAAN
      orbitPlane.rotation.y = THREE.MathUtils.degToRad(sat.raanDeg);
      orbitPlane.rotation.x = THREE.MathUtils.degToRad(sat.inclinationDeg);
      satGroup.add(orbitPlane);

      // A. Orbital Track Tube / Ellipse Curve
      const curvePoints = [];
      const segments = 96;
      for (let i = 0; i <= segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        curvePoints.push(new THREE.Vector3(Math.cos(theta) * rOrbit, 0, Math.sin(theta) * rOrbit));
      }
      const orbitGeom = new THREE.BufferGeometry().setFromPoints(curvePoints);
      const orbitMat = new THREE.LineBasicMaterial({
        color: sat.colorHex,
        transparent: true,
        opacity: sat.id === liveRef.current.activeSatId ? 0.85 : 0.22,
        linewidth: sat.id === liveRef.current.activeSatId ? 2 : 1,
      });
      const orbitLine = new THREE.Line(orbitGeom, orbitMat);
      orbitPlane.add(orbitLine);

      // B. 3D Satellite Spacecraft Model
      const spacecraft = new THREE.Group();
      orbitPlane.add(spacecraft);

      // Central Satellite Bus (Gold Foil MLI Insulation)
      const busGeom = new THREE.BoxGeometry(0.22, 0.24, 0.22);
      const busMat = new THREE.MeshStandardMaterial({
        color: 0xd4af37, // gold foil
        metalness: 0.9,
        roughness: 0.2,
      });
      const busMesh = new THREE.Mesh(busGeom, busMat);
      spacecraft.add(busMesh);

      // Dual Articulated Solar Array Panels (Photovoltaic Blue)
      const solarGeom = new THREE.BoxGeometry(0.85, 0.015, 0.24);
      const solarMat = new THREE.MeshStandardMaterial({
        color: 0x1e3a8a, // deep blue solar cells
        metalness: 0.6,
        roughness: 0.25,
      });
      const solarMesh = new THREE.Mesh(solarGeom, solarMat);
      spacecraft.add(solarMesh);

      // Instrument Payload (Mission specific details)
      if (sat.id === 'smap') {
        // Rotating Conical Mesh Reflector Dish
        const dishGeom = new THREE.ConeGeometry(0.35, 0.14, 24, 1, true);
        const dishMat = new THREE.MeshStandardMaterial({
          color: 0xe8a83e,
          wireframe: true,
          metalness: 0.8,
        });
        const dish = new THREE.Mesh(dishGeom, dishMat);
        dish.position.set(0, -0.28, 0);
        dish.rotation.x = Math.PI * 0.65;
        spacecraft.add(dish);
      } else if (sat.id === 'gpm') {
        // High-Gain Parabolic Weather Radar Dish
        const dishGeom = new THREE.SphereGeometry(0.12, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.45);
        const dishMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.7 });
        const dish = new THREE.Mesh(dishGeom, dishMat);
        dish.position.set(0, -0.2, 0);
        dish.rotation.x = Math.PI;
        spacecraft.add(dish);
      } else if (sat.id === 'sentinel') {
        // Planar C-band SAR Radar Antenna Array
        const sarGeom = new THREE.BoxGeometry(1.2, 0.02, 0.16);
        const sarMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8 });
        const sar = new THREE.Mesh(sarGeom, sarMat);
        sar.position.set(0, -0.18, 0);
        spacecraft.add(sar);
      } else {
        // General Optical / Thermal Radiometer Sensor Aperture
        const lensGeom = new THREE.CylinderGeometry(0.06, 0.06, 0.12, 16);
        const lensMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.95 });
        const lens = new THREE.Mesh(lensGeom, lensMat);
        lens.position.set(0, -0.16, 0);
        spacecraft.add(lens);
      }

      // Glowing Position Beacon / Telemetry Glow
      const beaconGeom = new THREE.SphereGeometry(0.08, 16, 16);
      const beaconMat = new THREE.MeshBasicMaterial({ color: sat.colorHex });
      const beacon = new THREE.Mesh(beaconGeom, beaconMat);
      spacecraft.add(beacon);

      satDict[sat.id] = {
        group: satGroup,
        orbitPlane,
        orbitLine,
        orbitMat,
        spacecraft,
        rOrbit,
        meanMotion: circularOrbit(sat.altitudeKm).meanMotion, // rad/s, Kepler: sqrt(mu / r^3)
        phase: THREE.MathUtils.degToRad(sat.raanDeg * 2.3),
      };
    });

    satellitesGroupRef.current = satDict;

    // 8. Volumetric Holographic Sensor Beam Cone (Pyramid / Frustum)
    const beamGeom = new THREE.ConeGeometry(0.65, 1.8, 16, 1, true);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0x7cc06a,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
    const beamMesh = new THREE.Mesh(beamGeom, beamMat);
    beamMesh.visible = liveRef.current.showSwath;
    scene.add(beamMesh);
    beamMeshRef.current = beamMesh;

    // 9. Window Resize Handler
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // =========================================================================
    // Main 3D Render & Astrodynamic Simulation Loop
    // =========================================================================
    let lastTime = performance.now();
    // One simulated UTC clock drives everything: it starts at the real time now, and 1x runs 60 s of orbit a second.
    const SIM_SECONDS_PER_SECOND = 60;
    let simMs = Date.now();
    const simStartMs = simMs;
    const sunHoriz = new THREE.Vector2(sunLight.position.x, sunLight.position.z).normalize();
    const sunAzimuth = Math.atan2(-sunHoriz.y, sunHoriz.x);
    // Place the sun over its real subsolar point and turn the Earth to the matching hour
    const placeSun = () => {
      const s = subsolarPoint(simMs);
      const dec = THREE.MathUtils.degToRad(s.lat);
      sunDirWorld.set(Math.cos(dec) * sunHoriz.x, Math.sin(dec), Math.cos(dec) * sunHoriz.y);
      sunLight.position.copy(sunDirWorld).multiplyScalar(30);
      earthMesh.rotation.y = sunAzimuth - THREE.MathUtils.degToRad(s.lon);
      if (realEarth) cloudsMesh.rotation.y = earthMesh.rotation.y;
    };
    placeSun();
    let speed = 0; // eased toward the chosen warp (0 when paused), so the planet spins up and slows down smoothly
    // Opening fly-in from deep space, until the viewer takes the controls
    let intro = 0;
    const introFrom = new THREE.Vector3(-6, 11, 30);
    // End the fly-in looking at Bangladesh, wherever the hour has turned it, with the whole planet and its orbits in view
    const bdNow = latLonToVector3(23.92, 90.14, 1).applyEuler(earthMesh.rotation);
    const bdDir = new THREE.Vector3(bdNow.x, 0, bdNow.z).normalize();
    const sunH = new THREE.Vector3(sunHoriz.x, 0, sunHoriz.y);
    // At night there, swing part way toward the sun so the day-night line is in the opening view
    const fromSun = bdDir.angleTo(sunH);
    const VIEW_FROM_SUN = THREE.MathUtils.degToRad(72); // dawn or dusk line just right of centre, day beyond it
    if (fromSun > VIEW_FROM_SUN) {
      const side = Math.sign(new THREE.Vector3().crossVectors(bdDir, sunH).y) || 1;
      bdDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), side * (fromSun - VIEW_FROM_SUN));
    }
    const introTo = bdDir.multiplyScalar(14.4).setY(6.6);
    camera.position.copy(introFrom);

    // Interruption-safe gesture tracking & touch velocity smoothing (F14, F15)
    let userInteracting = false;
    const touchState = {
      activeId: null,
      lastX: 0,
      lastY: 0,
      lastT: 0,
      vx: 0, // smoothed rad/s around Y (azimuth)
      vy: 0, // smoothed rad/s polar
      momentumTheta: 0,
      momentumPhi: 0,
      pointerCount: 0,
    };

    const onUserControlStart = () => {
      intro = 1;
      userInteracting = true;
      recenterRef.current = false;
      touchState.momentumTheta = 0;
      touchState.momentumPhi = 0;
      if (liveRef.current.cameraMode !== 'free') {
        liveRef.current.cameraMode = 'free';
        setCameraMode('free');
      }
    };
    const onUserControlEnd = () => {
      userInteracting = false;
    };
    if (controls) {
      controls.addEventListener('start', onUserControlStart);
      controls.addEventListener('end', onUserControlEnd);
    }

    const domEl = renderer.domElement;
    const onTouchPointerDown = (e) => {
      if (e.pointerType !== 'touch') return;
      touchState.pointerCount += 1;
      touchState.momentumTheta = 0;
      touchState.momentumPhi = 0;
      if (touchState.pointerCount === 1) {
        touchState.activeId = e.pointerId;
        touchState.lastX = e.clientX;
        touchState.lastY = e.clientY;
        touchState.lastT = performance.now();
        touchState.vx = 0;
        touchState.vy = 0;
      } else {
        touchState.activeId = null;
      }
    };
    const onTouchPointerMove = (e) => {
      if (e.pointerType !== 'touch' || e.pointerId !== touchState.activeId || touchState.pointerCount !== 1) return;
      const now = performance.now();
      const dtTouch = Math.max((now - touchState.lastT) / 1000, 0.004);
      const dx = e.clientX - touchState.lastX;
      const dy = e.clientY - touchState.lastY;
      const h = Math.max(domEl.clientHeight || 400, 1);
      const speedScale = controls ? controls.rotateSpeed : 0.65;
      const instVx = -((2 * Math.PI * dx * speedScale) / h) / dtTouch;
      const instVy = -((2 * Math.PI * dy * speedScale) / h) / dtTouch;
      touchState.vx = touchState.vx * 0.65 + instVx * 0.35;
      touchState.vy = touchState.vy * 0.65 + instVy * 0.35;
      touchState.lastX = e.clientX;
      touchState.lastY = e.clientY;
      touchState.lastT = now;
    };
    const onTouchPointerUp = (e) => {
      if (e.pointerType !== 'touch') return;
      touchState.pointerCount = Math.max(0, touchState.pointerCount - 1);
      if (e.pointerId === touchState.activeId && touchState.pointerCount === 0 && !reducedMotion) {
        const ageMs = performance.now() - touchState.lastT;
        if (ageMs < 90) {
          // Gentle smoothed touch momentum coast after finger flick lift
          touchState.momentumTheta = THREE.MathUtils.clamp(touchState.vx * 0.22, -1.8, 1.8);
          touchState.momentumPhi = THREE.MathUtils.clamp(touchState.vy * 0.22, -1.4, 1.4);
        }
      }
      if (touchState.pointerCount === 0) touchState.activeId = null;
    };
    domEl.addEventListener('pointerdown', onTouchPointerDown);
    domEl.addEventListener('pointermove', onTouchPointerMove);
    domEl.addEventListener('pointerup', onTouchPointerUp);
    domEl.addEventListener('pointercancel', onTouchPointerUp);

    const originVec = new THREE.Vector3(0, 0, 0);
    const tmpSpherical = new THREE.Spherical();
    const tmpOffset = new THREE.Vector3();
    let streamClock = 0;

    const animate = (currentTime) => {
      animFrameRef.current = requestAnimationFrame(animate);

      const dt = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;
      const {
        activeSatId,
        isPlaying,
        warpSpeed,
        cameraMode,
        showSwath,
        activeMission,
        climateLayer: activeClimateLayer,
        layerIntensity: activeLayerIntensity,
        showWindStreams: windVisible,
      } = liveRef.current;
      const ease = (r) => 1 - Math.pow(1 - r, dt * 60); // per-frame lerp rate made frame-rate independent
      speed += ((isPlaying ? warpSpeed : 0) - speed) * (1 - Math.exp(-dt * 2.5));

      if (intro < 1) {
        intro = Math.min(1, intro + dt / 3.2);
        const k = 1 - Math.pow(1 - intro, 3);
        if (cameraMode === 'free' && !userInteracting) camera.position.lerpVectors(introFrom, introTo, k);
      }

      if (speed > 0.001) {
        const simDt = dt * speed * SIM_SECONDS_PER_SECOND;
        simMs += simDt * 1000;
        simAngleRef.current += dt * (speed * 0.18); // the 2D scope's pass animation
        radarSweepAngleRef.current += dt * 2.5 * Math.min(1, speed);
        placeSun(); // the Earth turns under a sun fixed in this view: one solar day per 86 400 simulated seconds
        if (realEarth) {
          // Real clouds ride with the ground they were photographed over, drifting east at about 10 m/s
          realEarth.common.cloudOffset.value = (realEarth.common.cloudOffset.value + simDt * (10 / 40075e3)) % 1;
        } else {
          // Procedural clouds slowly drift eastward across the globe
          commonUniforms.cloudOffset.value = (commonUniforms.cloudOffset.value + dt * 0.004 * Math.min(speed, 4)) % 1;
        }
      }
      if (simClockRef.current && Math.floor(currentTime / 250) !== Math.floor((currentTime - dt * 1000) / 250)) {
        simClockRef.current.textContent = `${new Date(simMs).toISOString().slice(11, 16)} UTC · ×${Math.round(speed * SIM_SECONDS_PER_SECOND)}`;
      }

      // Update climate layer shader uniforms & Bay of Bengal wind/wave streamlines (F16, F17)
      const camDistVal = camera.position.length();
      earthUniforms.camDist.value = camDistVal;
      atmosUniforms.camDist.value = camDistVal;
      earthUniforms.uTime.value = currentTime * 0.001;
      earthUniforms.uClimateLayer.value = activeClimateLayer;
      earthUniforms.uPrecipIntensity.value = activeLayerIntensity;
      earthUniforms.uNdviWave.value = ((currentTime * 0.00018 * activeLayerIntensity) % 1);
      earthUniforms.uSoilMoisture.value = activeLayerIntensity;

      cycloneStreams.group.visible = windVisible;
      if (windVisible && !reducedMotion) {
        streamClock += dt * (isPlaying ? Math.min(1 + speed * 0.08, 2.2) : 0.45);
        cycloneStreams.update(streamClock);
      }

      // Update positions for all 7 satellites
      let activeSpacecraftWorldPos = new THREE.Vector3();
      let activeOrbitAngle = 0;
      const simSec = (simMs - simStartMs) / 1000;

      Object.entries(satDict).forEach(([id, satObj]) => {
        const isCurrent = id === activeSatId;
        // Inertial orbit: each satellite at its own Kepler mean motion; the Earth turns beneath it 15.6x slower for GPM
        const angle = satObj.phase + satObj.meanMotion * simSec;
        const sx = Math.cos(angle) * satObj.rOrbit;
        const sz = -Math.sin(angle) * satObj.rOrbit; // prograde: counter-clockwise seen from above the North Pole

        satObj.spacecraft.position.set(sx, 0, sz);

        // Nadir pointing: Satellite instruments face Earth center
        satObj.spacecraft.lookAt(0, 0, 0);

        // Update active mission track highlighting
        if (satObj.orbitMat) {
          satObj.orbitMat.opacity += ((isCurrent ? 0.95 : 0.18) - satObj.orbitMat.opacity) * ease(0.12);
          satObj.orbitMat.color.setHex(isCurrent ? SATELLITE_MISSIONS.find(m => m.id === id).colorHex : 0xffffff);
        }

        if (isCurrent) {
          satObj.spacecraft.getWorldPosition(activeSpacecraftWorldPos);
          activeOrbitAngle = angle;
        }
      });

      // Update Volumetric Sensor Swath Beam
      if (beamMeshRef.current && activeSpacecraftWorldPos.length() > 0) {
        beamMeshRef.current.visible = showSwath;
        beamMeshRef.current.material.color.setHex(activeMission.colorHex);

        const groundTarget = activeSpacecraftWorldPos.clone().normalize().multiplyScalar(EARTH_RADIUS_3D);
        const beamCenter = activeSpacecraftWorldPos.clone().lerp(groundTarget, 0.5);
        beamMeshRef.current.position.copy(beamCenter);

        const beamLength = activeSpacecraftWorldPos.distanceTo(groundTarget);
        beamMeshRef.current.scale.set(
          (activeMission.swathKm / 1000) * 1.2,
          beamLength / 1.8,
          (activeMission.swathKm / 1000) * 1.2
        );
        beamMeshRef.current.quaternion.setFromUnitVectors(
          new THREE.Vector3(0, 1, 0),
          groundTarget.clone().sub(activeSpacecraftWorldPos).normalize()
        );

        // Check if satellite ground track intercepts Bengal Delta
        const deltaWorld = latLonToVector3(23.92, 90.14, EARTH_RADIUS_3D);
        if (earthMeshRef.current) {
          deltaWorld.applyEuler(earthMeshRef.current.rotation);
        }
        const distToDelta = groundTarget.distanceTo(deltaWorld);
        const swathThreshold = (activeMission.swathKm / R_EARTH_KM) * EARTH_RADIUS_3D * 1.2;
        const nextLock = distToDelta < Math.max(0.7, swathThreshold);
        setInSwathLock((prev) => (prev === nextLock ? prev : nextLock));
      }

      // Expand & Fade Active Sensory Microwave Pulse Shockwaves
      for (let i = pulseRingsRef.current.length - 1; i >= 0; i--) {
        const ring = pulseRingsRef.current[i];
        ring.scale += dt * 3.5;
        ring.opacity -= dt * 0.45;
        ring.mesh.scale.set(ring.scale, ring.scale, ring.scale);
        ring.mesh.material.opacity = Math.max(0, ring.opacity);

        if (ring.opacity <= 0) {
          ring.mesh.removeFromParent();
          ring.mesh.geometry.dispose();
          ring.mesh.material.dispose();
          pulseRingsRef.current.splice(i, 1);
        }
      }

      // Altitude-adaptive rotation precision for crisp LEO closeups vs deep space panning (F14)
      if (controls) {
        const altFrac = THREE.MathUtils.clamp((camDistVal - 5.35) / 18.0, 0, 1);
        controls.rotateSpeed = 0.24 + altFrac * 0.44;
      }

      // Apply residual smoothed touch gesture momentum in 'free' mode (F14)
      if (
        cameraMode === 'free'
        && !userInteracting
        && controls
        && (Math.abs(touchState.momentumTheta) > 0.002 || Math.abs(touchState.momentumPhi) > 0.002)
      ) {
        tmpOffset.copy(camera.position).sub(controls.target);
        tmpSpherical.setFromVector3(tmpOffset);
        tmpSpherical.theta += touchState.momentumTheta * dt;
        tmpSpherical.phi = THREE.MathUtils.clamp(
          tmpSpherical.phi + touchState.momentumPhi * dt,
          controls.minPolarAngle,
          controls.maxPolarAngle
        );
        tmpOffset.setFromSpherical(tmpSpherical);
        camera.position.copy(controls.target).add(tmpOffset);
        const decay = Math.exp(-dt * 4.2);
        touchState.momentumTheta *= decay;
        touchState.momentumPhi *= decay;
      }

      // Interruption-Safe Camera Director Mode Transitions (F15)
      // Always keep controls.target centered at originVec so minDistance = 5.35 protects Earth uniformly
      // and detaching into 'free' mode never introduces post-release pivot drift.
      if (!userInteracting && controls) {
        if (cameraMode === 'follow' && activeSpacecraftWorldPos.length() > 0) {
          const satObj = satDict[activeSatId];
          const behindDir = new THREE.Vector3(Math.sin(activeOrbitAngle), 0, Math.cos(activeOrbitAngle));
          const orbitUp = new THREE.Vector3(0, 1, 0);
          if (satObj?.orbitPlane) {
            behindDir.applyQuaternion(satObj.orbitPlane.quaternion);
            orbitUp.applyQuaternion(satObj.orbitPlane.quaternion);
          }
          // Chase Cam safely outside minDistance (5.35) framing spacecraft + curved Earth horizon
          const camTargetPos = activeSpacecraftWorldPos
            .clone()
            .normalize()
            .multiplyScalar(11.0)
            .addScaledVector(behindDir, 2.6)
            .addScaledVector(orbitUp, 1.1);
          camera.position.lerp(camTargetPos, ease(0.055));
          if (controls.target.lengthSq() > 1e-6) {
            controls.target.lerp(originVec, ease(0.14));
          }
        } else if (cameraMode === 'deltaFocus') {
          // Focus on Bengal Delta with Earth center as orbit pivot (distance = 8.6 > 5.35 -> zero jitter)
          const deltaWorld = latLonToVector3(23.92, 90.14, EARTH_RADIUS_3D);
          if (earthMeshRef.current) {
            deltaWorld.applyEuler(earthMeshRef.current.rotation);
          }
          const camTargetPos = deltaWorld.clone().normalize().multiplyScalar(8.6);
          camera.position.lerp(camTargetPos, ease(0.055));
          if (controls.target.lengthSq() > 1e-6) {
            controls.target.lerp(originVec, ease(0.14));
          }
        } else if (recenterRef.current && controls.target.lengthSq() > 1e-5) {
          controls.target.lerp(originVec, ease(0.1));
          if (controls.target.lengthSq() <= 1e-5) {
            controls.target.copy(originVec);
            recenterRef.current = false;
          }
        }
      }

      if (controls) controls.update();
      // Safety floor so no transition ever clips inside Earth shell
      if (camera.position.length() < 5.35) {
        camera.position.setLength(5.35);
      }
      renderer.render(scene, camera);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      disposed = true;
      if (controls) {
        controls.removeEventListener('start', onUserControlStart);
        controls.removeEventListener('end', onUserControlEnd);
        controls.dispose();
      }
      domEl.removeEventListener('pointerdown', onTouchPointerDown);
      domEl.removeEventListener('pointermove', onTouchPointerMove);
      domEl.removeEventListener('pointerup', onTouchPointerUp);
      domEl.removeEventListener('pointercancel', onTouchPointerUp);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', handleResize);
      earthGeom.dispose();
      earthMat.dispose();
      cloudsGeom.dispose();
      cloudsMat.dispose();
      atmosGeom.dispose();
      atmosMat.dispose();
      beamGeom.dispose();
      beamMat.dispose();
      markerRingGeom.dispose();
      markerRingMat.dispose();
      uplinkGeom.dispose();
      uplinkMat.dispose();
      cycloneStreams.dispose();
      [skyboxTex, earthTex, nightTex, cloudsTex, bumpTex, normalTex, specularTex, climateTex].forEach((t) => {
        if (t) t.dispose();
      });
      if (renderer) renderer.dispose();
      if (container) container.innerHTML = '';
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // =========================================================================
  // 2D Tactical Radar Scope Canvas Renderer (Bengal Intercept Mode)
  // =========================================================================
  useEffect(() => {
    if (viewMode !== 'radarScope' && webglSupported) return;

    const canvas = canvas2dRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reducedMotion = typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    let anim2d = 0;
    const renderScope = () => {
      if (!reducedMotion) {
        anim2d = requestAnimationFrame(renderScope);
      }

      const dpr = window.devicePixelRatio || 1;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }
      ctx.save();
      ctx.scale(dpr, dpr);

      // Deep Space Radar Scope Canvas
      ctx.fillStyle = '#030d08';
      ctx.fillRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;
      const radarRadius = Math.min(width, height) * 0.42;

      // Concentric Distance Rings (100km, 250km, 500km)
      ctx.strokeStyle = 'rgba(98,160,79, 0.25)';
      ctx.lineWidth = 1;
      [0.25, 0.5, 0.75, 1.0].forEach((fraction) => {
        ctx.beginPath();
        ctx.arc(centerX, centerY, radarRadius * fraction, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = 'rgba(124,192,106, 0.65)';
        ctx.font = '10px monospace';
        ctx.fillText(`${Math.round(fraction * 500)} km`, centerX + 6, centerY - radarRadius * fraction + 12);
      });

      // Azimuth Crosshairs
      ctx.strokeStyle = 'rgba(98,160,79, 0.35)';
      ctx.beginPath();
      ctx.moveTo(centerX - radarRadius, centerY);
      ctx.lineTo(centerX + radarRadius, centerY);
      ctx.moveTo(centerX, centerY - radarRadius);
      ctx.lineTo(centerX, centerY + radarRadius);
      ctx.stroke();

      // Rotating Radar Beam Sweep Cone
      if (!reducedMotion) radarSweepAngleRef.current += 0.035;
      const sweepAngle = radarSweepAngleRef.current;
      const sweepGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radarRadius);
      sweepGrad.addColorStop(0, 'rgba(124,192,106, 0.4)');
      sweepGrad.addColorStop(1, 'rgba(98,160,79, 0)');
      ctx.fillStyle = sweepGrad;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radarRadius, sweepAngle, sweepAngle + 0.45);
      ctx.closePath();
      ctx.fill();

      // Target Upazila Intercept Points
      TARGET_POINTS.forEach((target) => {
        const px = centerX + (target.lon - 90.14) * (radarRadius * 0.38);
        const py = centerY - (target.lat - 23.92) * (radarRadius * 0.38);

        const isCurrent = upazila?.id === target.id;
        ctx.fillStyle = isCurrent ? '#e8a83e' : 'rgba(124,192,106, 0.85)';
        ctx.beginPath();
        ctx.arc(px, py, isCurrent ? 5.5 : 3.5, 0, Math.PI * 2);
        ctx.fill();

        if (isCurrent) {
          ctx.strokeStyle = '#e8a83e';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(px, py, 10, 0, Math.PI * 2);
          ctx.stroke();
        }

        ctx.fillStyle = isCurrent ? '#ffffff' : 'rgba(255, 255, 255, 0.65)';
        ctx.font = isCurrent ? 'bold 11px system-ui' : '10px system-ui';
        ctx.fillText(lang === 'bn' ? target.nameBn.split(',')[0] : target.nameEn.split(',')[0], px + 8, py + 3);
      });

      // Active Satellite Swath Passing Through Bengal Scope
      const passOffset = ((simAngleRef.current * 45) % (radarRadius * 2.2)) - radarRadius * 1.1;
      const swathWidth = (activeMission.swathKm / 500) * radarRadius * 0.45;

      ctx.fillStyle = 'rgba(124,192,106, 0.18)';
      ctx.fillRect(centerX + passOffset - swathWidth / 2, centerY - radarRadius * 0.85, swathWidth, radarRadius * 1.7);

      ctx.strokeStyle = activeMission.color;
      ctx.lineWidth = 2;
      ctx.strokeRect(centerX + passOffset - swathWidth / 2, centerY - radarRadius * 0.85, swathWidth, radarRadius * 1.7);

      // Satellite Blip
      ctx.fillStyle = activeMission.color;
      ctx.beginPath();
      ctx.arc(centerX + passOffset, centerY - radarRadius * 0.35, 7, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px monospace';
      ctx.fillText(`SAT: ${activeMission.shortName}`, centerX + passOffset + 12, centerY - radarRadius * 0.35 + 4);

      ctx.restore();
    };

    anim2d = requestAnimationFrame(renderScope);
    return () => cancelAnimationFrame(anim2d);
  }, [viewMode, activeMission, upazila, lang]);

  return (
    <div className="mt-8 overflow-hidden rounded-[28px] border border-primary-900 bg-gradient-to-b from-[#0a1f15] via-primary-950/80 to-[#061209] p-0 text-white shadow-2xl">
      {/* Header Deck: Title, Real-Time Physics Formula, & Status Badges */}
      <div className="relative border-b border-white/10 p-5 sm:p-6 bg-primary-950/70 backdrop-blur-md">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-400/20 text-primary-300 ring-1 ring-primary-300/40 shadow-[0_0_20px_rgba(124,192,106,0.35)]">
                <Satellite size={22} className="animate-pulse" />
              </span>
              <div>
                <h2 className="text-[20px] font-bold tracking-tight text-white sm:text-[24px]">
                  {T('যে উপগ্রহগুলোর তথ্য অ্যাপে আছে: কক্ষপথের সিমুলেশন', 'The satellites behind the data: a simulation of their orbits')}
                </h2>
                <p className="mt-0.5 text-[12.5px] font-mono text-primary-200/90 tracking-wider">
                  SIMULATED ORBITS // v = √(GM/r) // EACH MISSION'S PUBLISHED ALTITUDE AND INCLINATION
                </p>
              </div>
            </div>
            <p className="mt-2.5 text-[14px] leading-relaxed text-primary-50/80">
              {T(
                'অ্যাপের তথ্য যে ৭টি উপগ্রহ মিশন থেকে আসে, তাদের প্রকাশিত উচ্চতা ও কক্ষপথের ঢাল থেকে বানানো একটি সিমুলেশন। এটি উপগ্রহগুলোর এই মুহূর্তের আসল অবস্থান নয়। মাউস বা আঙুল দিয়ে গোলকটি ঘুরিয়ে ও জুম করে দেখুন।',
                'A 3D simulation of the 7 NASA and partner missions whose data the app uses, built from each mission\'s published altitude and inclination. It is not where the satellites are right now. Drag to rotate and zoom.'
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="blue" dot>{T('সিমুলেশন', 'Simulation')}</Badge>
            <Tags list={['SAT', 'MODEL', 'ASTRODYNAMICS']} />
          </div>
          {earthCloudsDate && (
            <p className="w-full text-[11px] text-primary-100/65">
              {T(
                `পৃথিবীর ছবি: NASA Blue Marble (দিন), VIIRS Black Marble (রাতের আলো), VIIRS মেঘ ${earthCloudsDate}, NASA GIBS থেকে`,
                `Earth: NASA Blue Marble (day), VIIRS Black Marble (night lights), VIIRS clouds of ${earthCloudsDate}, via NASA GIBS`
              )}
            </p>
          )}
        </div>

        {/* 7 Satellite Mission Selector Tabs */}
        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {SATELLITE_MISSIONS.map((sat) => {
            const isSelected = sat.id === activeSatId;
            return (
              <button
                key={sat.id}
                type="button"
                onClick={() => {
                  setActiveSatId(sat.id);
                  triggerPulse();
                }}
                className={`group relative flex flex-col items-center justify-center rounded-xl border p-2.5 text-center transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? 'border-primary-300 bg-primary-950/90 shadow-[0_0_20px_rgba(124,192,106,0.4)] ring-2 ring-primary-300/60 scale-[1.02]'
                    : 'border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full animate-ping" style={{ backgroundColor: sat.color }} />
                  <span className="text-[14px] font-bold text-white tracking-wide">{sat.shortName}</span>
                </div>
                <span className="mt-0.5 text-[11px] font-mono text-primary-50/80">{sat.altitudeKm} km</span>
                <span className="text-[11px] text-primary-100/65 line-clamp-1">{sat.agency.split('/')[0]}</span>
              </button>
            );
          })}
        </div>

        {/* Planetary Data Layer Overlay Controls (F16) */}
        <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2.5 border-t border-white/10 pt-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 inline-flex items-center gap-1 text-[11.5px] font-mono uppercase tracking-wider text-primary-200/80">
              <Layers size={13} className="text-primary-300" />
              {T('উপগ্রহ স্তর:', 'Data Layer:')}
            </span>
            {PLANETARY_DATA_LAYERS.map((layer) => {
              const active = climateLayer === layer.id;
              const Icon = layer.id === 1 ? CloudRain : layer.id === 2 ? Sprout : layer.id === 3 ? Droplets : Globe2;
              return (
                <button
                  key={layer.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    setClimateLayer(layer.id);
                    setViewMode('globe3d');
                  }}
                  className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-[12px] font-medium transition cursor-pointer ${
                    active
                      ? 'border-primary-300/70 bg-primary-500/25 text-white shadow-[0_0_12px_rgba(124,192,106,0.28)]'
                      : 'border-white/10 bg-white/5 text-primary-100/70 hover:border-white/25 hover:text-white'
                  }`}
                >
                  <Icon size={13} className={active ? 'text-primary-300' : 'text-primary-200/70'} />
                  <span>{T(layer.bn, layer.en)}</span>
                </button>
              );
            })}
          </div>

          {climateLayer > 0 && (
            <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-2.5 py-1 text-[11.5px] font-mono text-primary-100/85">
              <span>{T('মাত্রা:', 'Gain:')}</span>
              <input
                type="range"
                min="0.4"
                max="1.5"
                step="0.05"
                value={layerIntensity}
                onChange={(e) => setLayerIntensity(parseFloat(e.target.value))}
                aria-label={T('ডেটা স্তরের তীব্রতা', 'Climate data layer intensity')}
                className="h-1.5 w-20 cursor-pointer accent-primary-400"
              />
              <span className="w-8 text-right tabular-nums text-primary-200">{layerIntensity.toFixed(2)}×</span>
            </label>
          )}
        </div>
      </div>

      {/* Main Interactive 3D WebGL / Canvas Container */}
      <div className="relative h-[430px] sm:h-[465px] lg:h-[495px] w-full overflow-hidden bg-black select-none">
        {/* 3D WebGL Globe Container */}
        <div
          ref={containerRef}
          className={`h-full w-full cursor-grab active:cursor-grabbing transition-opacity duration-300 ${
            viewMode === 'globe3d' && webglSupported ? 'opacity-100 block' : 'opacity-0 hidden pointer-events-none'
          }`}
        />

        {/* Tactical 2D Radar Scope Canvas (Over Bangladesh) */}
        <div
          className={`h-full w-full transition-opacity duration-300 ${
            viewMode === 'radarScope' || !webglSupported ? 'opacity-100 block' : 'opacity-0 hidden'
          }`}
        >
          <canvas ref={canvas2dRef} className="h-full w-full block" />
        </div>

        {/* Futuristic Aerospace Heads-Up Display (HUD) in Corners */}
        <div className="pointer-events-none absolute top-2.5 left-2.5 sm:top-4 sm:left-4 z-20 flex flex-col gap-2 max-w-[192px] sm:max-w-none">
          {/* Active Mission Telemetry HUD */}
          <div className="rounded-xl sm:rounded-2xl border border-primary-300/30 bg-primary-950/85 p-2 sm:p-3.5 backdrop-blur-xl shadow-lg font-mono text-[10px] sm:text-[11px] text-primary-50/90">
            <div className="flex items-center gap-1.5 sm:gap-2 border-b border-white/10 pb-1 sm:pb-1.5">
              <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-primary-300 animate-pulse shrink-0" />
              <span className="font-bold text-primary-300 text-[11px] sm:text-[12.5px] truncate">{activeMission.shortName}</span>
              <span className="hidden sm:inline text-primary-200/50">·</span>
              <span className="hidden sm:inline text-primary-100/65">{activeMission.agency}</span>
            </div>
            <div className="mt-1.5 sm:mt-2 space-y-0.5 sm:space-y-1">
              <div className="flex justify-between gap-2 sm:gap-4">
                <span className="text-primary-100/65">{T('উচ্চতা:', 'ALT:')}</span>
                <span className="font-bold text-white">{activeMission.altitudeKm} km</span>
              </div>
              <div className="flex justify-between gap-2 sm:gap-4">
                <span className="text-primary-100/65">{T('বেগ:', 'VEL:')}</span>
                <span className="font-bold text-primary-200">
                  {physics.velocityKmS.toFixed(2)} km/s
                </span>
              </div>
              <div className="flex justify-between gap-2 sm:gap-4">
                <span className="text-primary-100/65">{T('ঢাল:', 'INC:')}</span>
                <span className="font-bold text-white">{activeMission.inclinationDeg}°</span>
              </div>
              <div className="hidden sm:flex justify-between gap-4">
                <span className="text-primary-100/65">{T('আবর্তন কাল:', 'PERIOD:')}</span>
                <span className="font-bold text-paddy-300">
                  {physics.periodMin.toFixed(1)} min ({physics.revolutionsPerDay.toFixed(1)} revs/day)
                </span>
              </div>
              <div className="hidden sm:flex justify-between gap-4">
                <span className="text-primary-100/65">{T('ডপলার শিফট:', 'DOPPLER Δf:')}</span>
                <span className="font-bold text-primary-200">±{physics.dopplerKHz.toFixed(1)} kHz</span>
              </div>
            </div>
          </div>
        </div>

        {/* Target Coverage Lock HUD (Top Right) */}
        <div className="pointer-events-none absolute top-2.5 right-2.5 sm:top-4 sm:right-4 z-20 max-w-[146px] sm:max-w-none">
          <div
            className={`rounded-xl sm:rounded-2xl border p-2 sm:p-3.5 backdrop-blur-xl shadow-lg font-mono text-[10px] sm:text-[11px] transition-all duration-300 ${
              inSwathLock
                ? 'border-primary-300/60 bg-primary-950/85 text-primary-100 shadow-[0_0_25px_rgba(124,192,106,0.3)]'
                : 'border-white/15 bg-primary-950/80 text-primary-50/80'
            }`}
          >
            <div className="flex items-center gap-1 sm:gap-1.5 font-bold">
              <Target size={13} className={`shrink-0 ${inSwathLock ? 'text-primary-300 animate-spin' : 'text-primary-300'}`} />
              <span className="truncate">{T('ফোকাস: বাংলাদেশ', 'TARGET: DELTA')}</span>
            </div>
            <div className="mt-0.5 sm:mt-1 text-[9.5px] sm:text-[11px] text-primary-100/65 truncate">
              23.92°N · 90.14°E
            </div>
            <div className="mt-1 sm:mt-1.5 font-bold flex items-center gap-1">
              <span
                className={`h-1.5 w-1.5 sm:h-2 sm:w-2 shrink-0 rounded-full ${
                  inSwathLock ? 'bg-primary-300 animate-ping' : 'bg-paddy-300'
                }`}
              />
              <span className={`truncate ${inSwathLock ? 'text-primary-200' : 'text-paddy-300'}`}>
                {inSwathLock
                  ? T('সক্রিয় লক', 'SWATH LOCKED')
                  : T('পর্যবেক্ষণ পাস', 'ORBIT PASS')}
              </span>
            </div>
          </div>
        </div>

        {/* Active Climate Layer Scale Legend (F16) — anchored safely below Top-Right HUD, never clipped by wrapped bottom controls */}
        {climateLayer > 0 && viewMode === 'globe3d' && webglSupported && (() => {
          const activeLayerMeta = PLANETARY_DATA_LAYERS[climateLayer];
          if (!activeLayerMeta) return null;
          return (
            <div className="pointer-events-none hidden sm:flex absolute top-[124px] right-4 z-20 flex-col gap-1 rounded-xl border border-white/15 bg-primary-950/85 px-3 py-2 backdrop-blur-md shadow-lg font-mono text-[10.5px] text-primary-50/90">
              <div className="flex items-center justify-between gap-3">
                <span className="font-semibold text-primary-200">{T(activeLayerMeta.bn, activeLayerMeta.en)}</span>
                <span className="text-primary-100/65">{layerIntensity.toFixed(1)}×</span>
              </div>
              <div className={`h-1.5 w-44 rounded-full bg-gradient-to-r ${activeLayerMeta.gradient}`} />
              <div className="flex justify-between gap-2 text-[10px] text-primary-100/70">
                <span>{T(activeLayerMeta.lowBn, activeLayerMeta.lowEn)}</span>
                <span>{T(activeLayerMeta.highBn, activeLayerMeta.highEn)}</span>
              </div>
            </div>
          );
        })()}

        {/* Interactive Floating Control Deck (Bottom Bar) */}
        <div className="absolute bottom-3 inset-x-3 sm:inset-x-6 z-30 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-primary-950/90 p-2 sm:p-2.5 backdrop-blur-xl border border-white/20 shadow-2xl">
          {/* Left: Simulation Play / Pause / Speed Warp */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => setIsPlaying(!isPlaying)}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-400/20 text-primary-300 hover:bg-primary-400/30 transition cursor-pointer"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause size={17} /> : <Play size={17} />}
            </button>

            <div className="flex items-center rounded-xl bg-primary-950/70 p-1 border border-white/10 text-[11px] font-mono">
              <span className="px-1.5 text-primary-100/65">{T('গতি:', 'Warp:')}</span>
              {[1, 5, 20].map((speed) => (
                <button
                  key={speed}
                  type="button"
                  onClick={() => setWarpSpeed(speed)}
                  className={`rounded-lg px-2 py-0.5 transition cursor-pointer ${
                    warpSpeed === speed ? 'bg-primary-400 text-white font-bold' : 'text-primary-100/65 hover:text-white'
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>
            <span
              ref={simClockRef}
              className="hidden sm:inline rounded-lg border border-white/10 bg-primary-950/70 px-2 py-1 font-mono text-[11px] tabular-nums text-paddy-300"
              title={T('সিমুলেশনের ঘড়ি: সূর্যের অবস্থান ও দিন-রাত এই সময়ের', 'Simulation clock: the sun and day-night line are for this time')}
            />

            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`flex h-9 w-9 items-center justify-center rounded-xl border transition cursor-pointer ${
                soundEnabled
                  ? 'border-primary-400/40 bg-primary-400/20 text-primary-300'
                  : 'border-white/10 bg-white/5 text-primary-100/65'
              }`}
              title={soundEnabled ? 'Mute' : 'Audio On'}
            >
              {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>
          </div>

          {/* Center: Camera Director View Modes */}
          <div className="flex items-center gap-1 rounded-xl bg-primary-950/70 p-1 border border-white/10 text-[12.5px]">
            <button
              type="button"
              onClick={() => {
                recenterRef.current = true;
                setViewMode('globe3d');
                setCameraMode('free');
              }}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2 sm:px-2.5 py-1 transition cursor-pointer ${
                viewMode === 'globe3d' && cameraMode === 'free'
                  ? 'bg-primary-700 text-white font-semibold shadow-xs'
                  : 'text-primary-100/65 hover:text-white'
              }`}
            >
              <Globe2 size={13} />
              <span className="hidden sm:inline">{T('মুক্ত ৩ডি মহাকাশ', 'Free 3D Orbit')}</span>
              <span className="sm:hidden">3D</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setViewMode('globe3d');
                setCameraMode('follow');
              }}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2 sm:px-2.5 py-1 transition cursor-pointer ${
                viewMode === 'globe3d' && cameraMode === 'follow'
                  ? 'bg-sky-600 text-white font-semibold shadow-xs'
                  : 'text-primary-100/65 hover:text-white'
              }`}
            >
              <Camera size={13} />
              <span className="hidden sm:inline">{T('উপগ্রহ চেজ ক্যামেরা', 'Follow Satellite')}</span>
              <span className="sm:hidden">{T('চেজ', 'Follow')}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setViewMode('globe3d');
                setCameraMode('deltaFocus');
              }}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2 sm:px-2.5 py-1 transition cursor-pointer ${
                viewMode === 'globe3d' && cameraMode === 'deltaFocus'
                  ? 'bg-primary-600 text-white font-semibold shadow-xs'
                  : 'text-primary-100/65 hover:text-white'
              }`}
            >
              <Target size={13} />
              <span className="hidden sm:inline">{T('বাংলাদেশ ফোকাস', 'Focus Delta')}</span>
              <span className="sm:hidden">{T('বাংলাদেশ', 'Delta')}</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('radarScope')}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2 sm:px-2.5 py-1 transition cursor-pointer ${
                viewMode === 'radarScope'
                  ? 'bg-paddy-500 text-white font-semibold shadow-xs'
                  : 'text-primary-100/65 hover:text-white'
              }`}
            >
              <RadarIcon size={13} />
              <span className="hidden sm:inline">{T('রাডার স্কোপ', 'Radar Scope')}</span>
              <span className="sm:hidden">{T('স্কোপ', 'Scope')}</span>
            </button>
          </div>

          {/* Right: Swath Beam, Bay Wind Flow & Fire Pulse Action */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => setShowWindStreams(!showWindStreams)}
              aria-pressed={showWindStreams}
              aria-label={T('বঙ্গোপসাগরের ঘূর্ণি ও বায়ুপ্রবাহ দেখান/লুকান', 'Toggle Bay of Bengal cyclone wind & wave flow')}
              title={T('বঙ্গোপসাগরের ঘূর্ণি ও বায়ুপ্রবাহ দেখান/লুকান', 'Toggle Bay of Bengal cyclone wind & wave flow')}
              className={`flex items-center gap-1 whitespace-nowrap rounded-xl px-2.5 py-1.5 text-[12px] sm:text-[12.5px] font-semibold border transition cursor-pointer ${
                showWindStreams
                  ? 'border-sky-300/50 bg-sky-400/20 text-sky-200'
                  : 'border-white/10 bg-white/5 text-primary-100/65'
              }`}
            >
              <Wind size={13} />
              <span className="hidden sm:inline">{T('বায়ুপ্রবাহ', 'Wind Flow')}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowSwath(!showSwath)}
              className={`flex items-center gap-1 whitespace-nowrap rounded-xl px-2.5 py-1.5 text-[12px] sm:text-[12.5px] font-semibold border transition cursor-pointer ${
                showSwath
                  ? 'border-primary-300/50 bg-primary-400/20 text-primary-200'
                  : 'border-white/10 bg-white/5 text-primary-100/65'
              }`}
            >
              <Scan size={13} />
              <span className="sm:hidden">{T('সোয়াথ', 'Swath')}</span>
              <span className="hidden sm:inline">{T('সোয়াথ আলো', 'Swath')}</span>
            </button>

            <button
              type="button"
              onClick={triggerPulse}
              className="btn-gloss flex items-center gap-1.5 whitespace-nowrap rounded-xl px-2.5 sm:px-3 py-1.5 text-[12px] sm:text-[12.5px] font-semibold text-white shadow-md active:scale-95 cursor-pointer bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-400 hover:to-primary-400"
            >
              <Zap size={14} className="text-paddy-300 animate-bounce shrink-0" />
              <span className="sm:hidden">{T('পালস', 'Pulse')}</span>
              <span className="hidden sm:inline">{T('রাডার পালস পাঠান', 'Fire Sensor Pulse')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Selected Mission Detailed Blueprint Card & Biophysical Science Application */}
      <div className="p-5 sm:p-6 bg-primary-950/80 border-t border-white/10">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[12.5px] font-mono uppercase tracking-wider text-primary-300 font-bold">
                {activeMission.agency}
              </span>
              <span className="text-primary-200/50">·</span>
              <span className="text-[12.5px] font-mono text-primary-300">{activeMission.sensorType.toUpperCase()}</span>
            </div>
            <h3 className="font-display text-[24px] font-bold text-white mt-0.5">{activeMission.name}</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-xl border border-primary-300/30 bg-primary-400/10 px-3 py-1 text-[14px] font-mono text-primary-200 font-bold">
              {activeMission.inclinationDeg}° {T('কক্ষপথের ঢাল', 'Inclination')}
            </span>
            <span className="rounded-xl border border-primary-300/30 bg-primary-400/10 px-3 py-1 text-[14px] font-mono text-primary-200 font-bold">
              {physics.velocityKmS.toFixed(2)} km/s
            </span>
          </div>
        </div>

        {/* 4 Telemetry Spec Metric Tiles */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 text-[14px]">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3.5 hover:border-primary-300/40 transition">
            <div className="text-[12.5px] font-semibold text-primary-100/65 flex items-center gap-1">
              <Compass size={13} className="text-primary-300" />
              {T('কক্ষপথের উচ্চতা', 'Orbital Altitude')}
            </div>
            <div className="mt-1 font-display text-[20px] font-bold text-white font-mono">
              {num(activeMission.altitudeKm, lang)} <span className="text-[12.5px] font-normal text-primary-100/65">km</span>
            </div>
            <div className="text-[11px] text-primary-100/65">{T('লো আর্থ অরবিট (LEO)', 'Low Earth Orbit (LEO)')}</div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-3.5 hover:border-primary-300/40 transition">
            <div className="text-[12.5px] font-semibold text-primary-100/65 flex items-center gap-1">
              <Eye size={13} className="text-primary-300" />
              {T('সোয়াথ স্ক্যান প্রস্থ', 'Swath Width')}
            </div>
            <div className="mt-1 font-display text-[20px] font-bold text-white font-mono">
              {num(activeMission.swathKm, lang)} <span className="text-[12.5px] font-normal text-primary-100/65">km</span>
            </div>
            <div className="text-[11px] text-primary-100/65">{T('এক পাসে ভূমি কাভারেজ', 'Single pass coverage')}</div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-3.5 hover:border-paddy-300/40 transition">
            <div className="text-[12.5px] font-semibold text-primary-100/65 flex items-center gap-1">
              <Clock size={13} className="text-paddy-300" />
              {T('কক্ষপথ আবর্তন সময়', 'Orbital Period')}
            </div>
            <div className="mt-1 font-display text-[20px] font-bold text-white font-mono">
              {num(Math.round(physics.periodMin), lang)} <span className="text-[12.5px] font-normal text-primary-100/65">{T('মিনিট', 'min')}</span>
            </div>
            <div className="text-[11px] text-primary-100/65">{T('দিনে প্রায় ১৫.৫ বার পৃথিবী ভ্রমণ', '15.5 revs / day')}</div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-3.5 hover:border-clay-300/40 transition">
            <div className="text-[12.5px] font-semibold text-primary-100/65 flex items-center gap-1">
              <Radio size={13} className="text-clay-300" />
              {T('পুনরাবৃত্তি ও পাস', 'Revisit Cadence')}
            </div>
            <div className="mt-1 font-bold text-white font-mono text-[20px]">
              {activeMission.revisitHours} {T('ঘণ্টা', 'hours')}
            </div>
            <div className="text-[11px] text-primary-100/65">{T('বাংলাদেশ অঞ্চলে পাস', 'Overpass rate')}</div>
          </div>
        </div>

        {/* Sensor Payload & Biophysical Integration Details */}
        <div className="mt-4 rounded-2xl border border-white/10 bg-primary-950/60 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-[14px] font-bold text-white flex items-center gap-1.5">
              <Layers size={15} className="text-primary-300" />
              {T('বৈজ্ঞানিক পেলোড ও বর্ণালী ব্যান্ড:', 'Scientific Payload & Spectrum:')}
            </div>
            <span className="font-mono text-[12.5px] text-primary-200 bg-primary-950/80 border border-primary-800/60 px-2.5 py-0.5 rounded-md">
              {activeMission.spectrum}
            </span>
          </div>
          <p className="mt-1.5 font-mono text-[14px] text-primary-50/90 bg-white/5 p-2.5 rounded-xl border border-white/10">
            {activeMission.payload}
          </p>

          <div className="mt-3.5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-[14px]">
            <div className="p-3.5 rounded-xl bg-primary-950/60 border border-primary-800/50">
              <span className="font-semibold text-primary-100 block flex items-center gap-1.5">
                <Activity size={14} className="text-primary-300" />
                {T('পরিমাপ্য ভৌত প্যারামিটার:', 'Biophysical Parameter:')}
              </span>
              <span className="text-primary-50/80 mt-1 block leading-relaxed">
                {lang === 'bn' ? activeMission.paramBn : activeMission.paramEn}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-primary-950/60 border border-primary-800/50">
              <span className="font-semibold text-primary-100 block flex items-center gap-1.5">
                <Sparkles size={14} className="text-primary-300" />
                {T('এগ্রোসে বাস্তব প্রয়োগ:', 'Application in Agros:')}
              </span>
              <span className="text-primary-50/80 mt-1 block leading-relaxed">
                {lang === 'bn' ? activeMission.appUsageBn : activeMission.appUsageEn}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
