// Procedural NASA High-Fidelity Earth & Space Texture Generator.
// Generates equirectangular (2:1) photorealistic surface maps, terrain height/bump/normal maps,
// ocean/shelf/inland-river specular masks, planetary climate data layers, cloud layers,
// night-side city lights, and cosmic starfield backgrounds for Three.js WebGL rendering.
//
// When real NASA Blue Marble / VIIRS textures are present in public/textures/,
// those are loaded instead of the procedural canvases for a photorealistic Earth.
import * as THREE from 'three';

const BASE = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '/';

// Attempt to load a real NASA texture from public/textures/<name>.
// Returns a THREE.Texture on success, null on failure (missing file).
export function loadNasaTexture(filename) {
  const url = `${BASE}textures/${filename}`;
  return new Promise((resolve) => {
    const loader = new THREE.TextureLoader();
    loader.load(
      url,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 8;
        resolve(tex);
      },
      undefined,
      () => resolve(null) // file missing or failed — fall back to procedural
    );
  });
}

// Geographic coordinate to Equirectangular Canvas pixel mapper
export function geoToPixel(lat, lon, width, height) {
  const x = ((lon + 180) / 360) * width;
  const y = ((90 - lat) / 180) * height;
  return [x, y];
}

// Catmull-Rom to Cubic Bézier spline drawer for organic, smooth coastlines
export function drawSmoothSplinePolygon(ctx, pts, width, height, close = true) {
  if (!pts || pts.length < 3) return;
  const pixels = pts.map(([lat, lon]) => geoToPixel(lat, lon, width, height));
  const len = pixels.length;

  ctx.beginPath();
  ctx.moveTo(pixels[0][0], pixels[0][1]);

  for (let i = 0; i < len; i++) {
    const p0 = pixels[(i - 1 + len) % len];
    const p1 = pixels[i];
    const p2 = pixels[(i + 1) % len];
    const p3 = pixels[(i + 2) % len];

    const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6;

    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2[0], p2[1]);
  }

  if (close) ctx.closePath();
}

// Major continental and regional boundary coordinates in [lat, lon]
export const CONTINENTS_GEO = {
  // 1. South Asia & Bengal Delta (High Density Precision)
  bengalDelta: [
    [26.6, 88.2], [26.4, 89.8], [25.8, 89.9], [25.2, 92.2], [24.8, 92.5],
    [23.8, 92.1], [22.4, 92.3], [21.4, 92.1], [21.6, 91.8], [21.8, 90.5],
    [22.2, 89.2], [22.5, 89.0], [24.0, 88.0], [25.2, 88.1], [26.2, 88.0],
    [26.6, 88.2]
  ],
  indiaSubcontinent: [
    [24.0, 68.2], [26.5, 68.5], [28.5, 70.0], [32.0, 74.0], [35.5, 76.5],
    [34.5, 78.5], [31.5, 78.5], [29.5, 80.5], [28.5, 84.0], [27.5, 88.0],
    [26.5, 88.0], [24.0, 88.0], [22.0, 89.0], [21.5, 87.0], [19.8, 86.0],
    [17.5, 83.0], [15.5, 80.2], [13.0, 80.2], [10.2, 79.8], [8.1, 77.5],
    [9.5, 76.3], [12.0, 75.0], [15.5, 73.8], [19.0, 72.8], [21.0, 72.5],
    [23.0, 69.5], [24.0, 68.2]
  ],
  sriLanka: [
    [9.8, 80.2], [8.5, 81.3], [6.9, 81.9], [5.9, 80.5], [7.0, 79.8], [9.0, 79.8], [9.8, 80.2]
  ],
  himalayasTibet: [
    [27.0, 88.0], [28.0, 84.0], [29.5, 80.5], [31.5, 78.5], [35.5, 76.5],
    [37.5, 75.0], [39.0, 77.0], [39.0, 92.0], [36.0, 100.0], [32.0, 102.0],
    [28.0, 98.0], [27.5, 92.0], [27.0, 88.0]
  ],
  // 2. Southeast Asia & East Asia
  southeastAsia: [
    [22.0, 92.5], [20.0, 93.0], [16.0, 94.5], [13.0, 98.5], [8.0, 98.3],
    [1.5, 104.0], [6.0, 102.0], [10.0, 105.0], [13.0, 109.0], [18.0, 106.0],
    [21.5, 108.0], [23.0, 106.0], [24.0, 98.0], [22.0, 92.5]
  ],
  indonesiaSumatra: [
    [5.5, 95.3], [2.0, 99.0], [-1.0, 104.0], [-5.5, 106.0], [-5.0, 103.0], [0.0, 98.0], [5.5, 95.3]
  ],
  indonesiaJava: [
    [-6.0, 106.0], [-6.5, 110.0], [-7.2, 114.0], [-8.5, 114.0], [-8.0, 108.0], [-6.8, 105.5], [-6.0, 106.0]
  ],
  indonesiaBorneo: [
    [7.0, 117.0], [4.0, 119.0], [-1.0, 117.0], [-4.0, 115.0], [-3.0, 110.0], [1.0, 109.0], [7.0, 117.0]
  ],
  chinaEastAsia: [
    [22.0, 108.0], [24.0, 118.0], [30.0, 122.0], [35.0, 119.5], [39.0, 118.0],
    [40.0, 124.0], [43.0, 131.0], [50.0, 135.0], [53.0, 125.0], [50.0, 110.0],
    [45.0, 90.0], [40.0, 80.0], [35.0, 85.0], [30.0, 102.0], [24.0, 106.0], [22.0, 108.0]
  ],
  japan: [
    [31.0, 130.5], [34.0, 135.0], [36.0, 140.5], [41.0, 141.0], [45.5, 142.0],
    [43.0, 145.5], [38.0, 141.0], [34.0, 132.0], [31.0, 130.5]
  ],
  // 3. Middle East & Central Asia
  middleEastArabia: [
    [30.0, 32.5], [32.0, 35.0], [30.0, 48.0], [25.0, 56.5], [23.0, 59.0],
    [17.0, 55.0], [12.5, 44.0], [15.0, 42.0], [22.0, 38.5], [28.0, 34.0], [30.0, 32.5]
  ],
  centralAsiaPersia: [
    [30.0, 48.0], [37.0, 49.0], [40.0, 53.0], [42.0, 70.0], [45.0, 80.0],
    [40.0, 80.0], [35.0, 77.0], [30.0, 65.0], [25.0, 60.0], [25.0, 56.5], [30.0, 48.0]
  ],
  // 4. Africa
  africa: [
    [36.0, -5.5], [37.0, 10.0], [32.0, 15.0], [32.0, 32.0], [22.0, 37.0],
    [12.0, 44.0], [11.5, 51.0], [2.0, 46.0], [-10.0, 40.5], [-25.0, 33.0],
    [-34.5, 20.0], [-34.0, 18.0], [-22.0, 14.0], [-5.0, 12.0], [4.5, 8.5],
    [5.0, 1.0], [4.5, -7.5], [12.0, -16.5], [16.0, -16.5], [21.0, -17.0],
    [28.0, -12.0], [35.5, -6.0], [36.0, -5.5]
  ],
  saharaDesert: [
    [32.0, -10.0], [33.0, 10.0], [30.0, 30.0], [22.0, 36.0], [16.0, 34.0],
    [15.0, 15.0], [14.0, -15.0], [24.0, -16.0], [32.0, -10.0]
  ],
  madagascar: [
    [-12.0, 49.5], [-16.0, 50.0], [-25.0, 47.0], [-25.5, 45.0], [-20.0, 44.0], [-14.0, 48.0], [-12.0, 49.5]
  ],
  // 5. Europe & Northern Eurasia
  europe: [
    [36.0, -5.5], [37.0, -9.0], [43.5, -9.0], [44.0, -1.5], [48.0, -4.5],
    [50.0, 1.5], [54.0, 9.0], [58.0, 5.0], [62.0, 5.0], [71.0, 26.0],
    [68.0, 40.0], [65.0, 55.0], [55.0, 60.0], [45.0, 50.0], [42.0, 40.0],
    [40.0, 26.0], [36.5, 22.0], [40.0, 18.0], [37.0, 15.0], [41.0, 14.0],
    [44.0, 8.0], [43.0, 3.0], [36.0, -5.5]
  ],
  britishIsles: [
    [50.0, -5.5], [51.5, 1.5], [55.5, -1.5], [58.5, -3.5], [57.0, -6.0], [54.0, -3.0], [50.0, -5.5]
  ],
  siberiaNorthEurasia: [
    [55.0, 60.0], [65.0, 55.0], [70.0, 70.0], [73.0, 80.0], [77.0, 105.0],
    [72.0, 130.0], [71.0, 150.0], [66.0, 170.0], [60.0, 165.0], [50.0, 140.0],
    [50.0, 110.0], [45.0, 90.0], [42.0, 70.0], [55.0, 60.0]
  ],
  // 6. North America
  northAmerica: [
    [60.0, -165.0], [70.0, -160.0], [71.0, -130.0], [69.0, -95.0], [62.0, -80.0],
    [58.0, -65.0], [48.0, -53.0], [43.0, -66.0], [35.0, -75.0], [25.0, -80.0],
    [29.0, -89.0], [26.0, -97.0], [20.0, -97.0], [16.0, -93.0], [20.0, -105.0],
    [32.0, -117.0], [38.0, -123.0], [48.0, -125.0], [58.0, -136.0], [60.0, -150.0], [60.0, -165.0]
  ],
  greenland: [
    [60.0, -45.0], [65.0, -35.0], [75.0, -20.0], [83.0, -30.0], [80.0, -60.0], [70.0, -55.0], [60.0, -45.0]
  ],
  // 7. Central & South America
  southAmerica: [
    [11.5, -73.0], [10.5, -62.0], [5.0, -51.0], [-5.0, -35.0], [-13.0, -38.5],
    [-23.0, -42.0], [-35.0, -54.0], [-45.0, -65.0], [-55.0, -66.0], [-50.0, -75.0],
    [-40.0, -73.5], [-20.0, -70.0], [-5.0, -81.0], [2.0, -78.0], [8.0, -77.0], [11.5, -73.0]
  ],
  amazonRainforest: [
    [3.0, -60.0], [1.0, -50.0], [-5.0, -48.0], [-10.0, -62.0], [-5.0, -72.0], [2.0, -70.0], [3.0, -60.0]
  ],
  // 8. Australia & Oceania
  australia: [
    [-11.5, 136.0], [-15.0, 145.0], [-24.0, 153.0], [-34.0, 151.0], [-38.0, 145.0],
    [-35.0, 137.0], [-32.0, 128.0], [-35.0, 117.0], [-22.0, 114.0], [-15.0, 124.0], [-11.5, 136.0]
  ],
  newZealand: [
    [-35.0, 173.0], [-38.0, 178.0], [-41.5, 175.0], [-46.5, 168.0], [-44.0, 168.0], [-41.0, 172.0], [-35.0, 173.0]
  ],
  // 9. Antarctica (Southern Ice Sheet)
  antarctica: [
    [-65.0, -180.0], [-70.0, -120.0], [-75.0, -60.0], [-65.0, 0.0],
    [-70.0, 60.0], [-75.0, 120.0], [-65.0, 180.0], [-89.0, 180.0],
    [-89.0, -180.0], [-65.0, -180.0]
  ],
};

// Global Megacities and Bengal Delta Clusters for Night City Lights
export const NIGHT_CITIES = [
  // Bengal Delta / Bangladesh Core
  { name: 'Dhaka', lat: 23.81, lon: 90.41, pop: 10, color: '#fef08a' },
  { name: 'Chittagong', lat: 22.35, lon: 91.78, pop: 8, color: '#fde047' },
  { name: 'Sylhet', lat: 24.89, lon: 91.86, pop: 6, color: '#fde047' },
  { name: 'Rajshahi', lat: 24.37, lon: 88.60, pop: 6, color: '#fde047' },
  { name: 'Khulna', lat: 22.84, lon: 89.54, pop: 6, color: '#fde047' },
  { name: 'Barisal', lat: 22.70, lon: 90.35, pop: 5, color: '#fde047' },
  { name: 'Rangpur', lat: 25.74, lon: 89.27, pop: 5, color: '#fde047' },
  // India & South Asia
  { name: 'Kolkata', lat: 22.57, lon: 88.36, pop: 9, color: '#fef08a' },
  { name: 'Delhi', lat: 28.61, lon: 77.20, pop: 10, color: '#ffffff' },
  { name: 'Mumbai', lat: 19.07, lon: 72.87, pop: 10, color: '#fef08a' },
  { name: 'Bangalore', lat: 12.97, lon: 77.59, pop: 8, color: '#fde047' },
  { name: 'Chennai', lat: 13.08, lon: 80.27, pop: 8, color: '#fde047' },
  { name: 'Hyderabad', lat: 17.38, lon: 78.48, pop: 8, color: '#fde047' },
  { name: 'Lahore', lat: 31.52, lon: 74.35, pop: 8, color: '#fde047' },
  { name: 'Karachi', lat: 24.86, lon: 67.00, pop: 9, color: '#fde047' },
  // Middle East & East Asia
  { name: 'Dubai', lat: 25.20, lon: 55.27, pop: 9, color: '#ffffff' },
  { name: 'Riyadh', lat: 24.71, lon: 46.67, pop: 7, color: '#fbbf24' },
  { name: 'Tokyo', lat: 35.67, lon: 139.65, pop: 10, color: '#ffffff' },
  { name: 'Shanghai', lat: 31.23, lon: 121.47, pop: 10, color: '#ffffff' },
  { name: 'Beijing', lat: 39.90, lon: 116.40, pop: 9, color: '#fde047' },
  { name: 'Guangzhou', lat: 23.12, lon: 113.26, pop: 9, color: '#fde047' },
  { name: 'Hong Kong', lat: 22.31, lon: 114.16, pop: 9, color: '#ffffff' },
  { name: 'Singapore', lat: 1.35, lon: 103.81, pop: 9, color: '#ffffff' },
  { name: 'Bangkok', lat: 13.75, lon: 100.50, pop: 8, color: '#fde047' },
  // Europe
  { name: 'London', lat: 51.50, lon: -0.12, pop: 9, color: '#fbbf24' },
  { name: 'Paris', lat: 48.85, lon: 2.35, pop: 9, color: '#fbbf24' },
  { name: 'Berlin', lat: 52.52, lon: 13.40, pop: 7, color: '#fbbf24' },
  { name: 'Moscow', lat: 55.75, lon: 37.61, pop: 8, color: '#fbbf24' },
  // Americas
  { name: 'New York', lat: 40.71, lon: -74.00, pop: 10, color: '#ffffff' },
  { name: 'Chicago', lat: 41.87, lon: -87.62, pop: 8, color: '#fde047' },
  { name: 'Los Angeles', lat: 34.05, lon: -118.24, pop: 9, color: '#fde047' },
  { name: 'São Paulo', lat: -23.55, lon: -46.63, pop: 9, color: '#fbbf24' },
  { name: 'Buenos Aires', lat: -34.60, lon: -58.38, pop: 7, color: '#fbbf24' },
];

/**
 * 1. Generate Photorealistic Earth Daytime Diffuse & Specular Canvas
 */
export function createEarthSurfaceCanvas(width = 2048, height = 1024) {
  const canvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
  if (!canvas) return null;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // --- 1. Deep Ocean Realistic Bathymetry Gradient ---
  const oceanGrad = ctx.createLinearGradient(0, 0, 0, height);
  oceanGrad.addColorStop(0.0, '#020b18'); // Arctic Ocean deep obsidian indigo
  oceanGrad.addColorStop(0.18, '#061a38'); // North Atlantic / North Pacific
  oceanGrad.addColorStop(0.5, '#0a2e5c'); // Tropical equatorial deep sapphire
  oceanGrad.addColorStop(0.82, '#061a38'); // Southern Ocean
  oceanGrad.addColorStop(1.0, '#020b18'); // Antarctic Ocean abyss
  ctx.fillStyle = oceanGrad;
  ctx.fillRect(0, 0, width, height);

  // Subtle oceanic current circulation lines (Gulf Stream, Kuroshio, Equatorial Currents)
  ctx.fillStyle = 'rgba(14, 116, 144, 0.18)';
  for (let y = height * 0.25; y <= height * 0.75; y += height * 0.12) {
    ctx.fillRect(0, y, width, height * 0.04);
  }

  // --- 2. Luminous Continental Shelves (Turquoise Coral & Shallow Sea Halos) ---
  ctx.shadowColor = '#06b6d4'; // cyan-500
  ctx.shadowBlur = width * 0.016;
  ctx.fillStyle = '#0891b2'; // cyan-600
  ctx.strokeStyle = '#22d3ee'; // cyan-400
  ctx.lineWidth = width * 0.005;

  Object.values(CONTINENTS_GEO).forEach((pts) => {
    drawSmoothSplinePolygon(ctx, pts, width, height, true);
    ctx.fill();
    ctx.stroke();
  });

  // Reset shadow for crisp landmass definition
  ctx.shadowBlur = 0;

  // --- 3. Biome Landmass Rendering ---
  const fillBiome = (pts, baseColor, accentColor = null, accentPts = null) => {
    ctx.fillStyle = baseColor;
    drawSmoothSplinePolygon(ctx, pts, width, height, true);
    ctx.fill();

    if (accentColor && accentPts) {
      ctx.fillStyle = accentColor;
      drawSmoothSplinePolygon(ctx, accentPts, width, height, true);
      ctx.fill();
    }
  };

  // Africa (Savanna Green + Golden Sahara Sand)
  fillBiome(CONTINENTS_GEO.africa, '#1e3a1f', '#d97706', CONTINENTS_GEO.saharaDesert);
  fillBiome(CONTINENTS_GEO.madagascar, '#14532d');

  // Middle East & Arabia (Glistening Golden-Red Sands)
  fillBiome(CONTINENTS_GEO.middleEastArabia, '#d97706');
  fillBiome(CONTINENTS_GEO.centralAsiaPersia, '#b45309');

  // Europe & British Isles (Fertile Emerald & Olive Forests)
  fillBiome(CONTINENTS_GEO.europe, '#15803d');
  fillBiome(CONTINENTS_GEO.britishIsles, '#16a34a');

  // Northern Eurasia & Siberia (Taiga Deep Evergreen)
  fillBiome(CONTINENTS_GEO.siberiaNorthEurasia, '#14532d');

  // East Asia & Southeast Asia (Subtropical Rainforests & Farmlands)
  fillBiome(CONTINENTS_GEO.chinaEastAsia, '#166534');
  fillBiome(CONTINENTS_GEO.japan, '#15803d');
  fillBiome(CONTINENTS_GEO.southeastAsia, '#14532d');
  fillBiome(CONTINENTS_GEO.indonesiaSumatra, '#0f481c');
  fillBiome(CONTINENTS_GEO.indonesiaJava, '#0f481c');
  fillBiome(CONTINENTS_GEO.indonesiaBorneo, '#093614');

  // Americas (Forests, Great Plains, Amazon Basin)
  fillBiome(CONTINENTS_GEO.northAmerica, '#166534');
  fillBiome(CONTINENTS_GEO.greenland, '#f8fafc'); // Arctic Ice Cap
  fillBiome(CONTINENTS_GEO.southAmerica, '#14532d', '#052e16', CONTINENTS_GEO.amazonRainforest);

  // Australia (Red Outback Sands & Coastal Green Fringe)
  fillBiome(CONTINENTS_GEO.australia, '#c2410c');
  fillBiome(CONTINENTS_GEO.newZealand, '#15803d');

  // Antarctica (Pristine Glacial Ice Sheet)
  fillBiome(CONTINENTS_GEO.antarctica, '#f8fafc');

  // --- 4. Indian Subcontinent & Majestic Himalayas ---
  // Fertile Indo-Gangetic Plains & Deccan Plateau
  fillBiome(CONTINENTS_GEO.indiaSubcontinent, '#15803d');
  fillBiome(CONTINENTS_GEO.sriLanka, '#166534');

  // Rocky Himalayan Mountain Spine & Tibetan Plateau (highland arid stone/ochre steppe gradient)
  ctx.save();
  drawSmoothSplinePolygon(ctx, CONTINENTS_GEO.himalayasTibet, width, height, true);
  ctx.clip();
  const [tibW, tibN] = geoToPixel(39.0, 75.0, width, height);
  const [tibE, tibS] = geoToPixel(27.0, 102.0, width, height);
  const tibGrad = ctx.createLinearGradient(tibW, tibN, tibE, tibS);
  tibGrad.addColorStop(0.0, '#7f6e59');
  tibGrad.addColorStop(0.45, '#998266');
  tibGrad.addColorStop(0.8, '#6e6556');
  tibGrad.addColorStop(1.0, '#4d5d44');
  ctx.fillStyle = tibGrad;
  ctx.fillRect(tibW - 20, tibN - 20, (tibE - tibW) + 40, (tibS - tibN) + 40);

  // Soft highland texture patches across Tibet & Kunlun / Pamir ridges
  const tibDomes = [
    [35.2, 76.2, 2.8, 'rgba(186, 174, 158, 0.36)'],
    [33.5, 84.5, 4.4, 'rgba(168, 142, 108, 0.42)'],
    [32.2, 91.5, 3.8, 'rgba(148, 130, 102, 0.38)'],
    [30.2, 96.5, 3.2, 'rgba(116, 118, 92, 0.35)'],
  ];
  tibDomes.forEach(([lat, lon, radDeg, col]) => {
    const [dx, dy] = geoToPixel(lat, lon, width, height);
    const rr = (radDeg / 180.0) * height * 1.15;
    const dg = ctx.createRadialGradient(dx, dy, 0, dx, dy, rr);
    dg.addColorStop(0.0, col);
    dg.addColorStop(1.0, 'rgba(153, 130, 102, 0)');
    ctx.fillStyle = dg;
    ctx.beginPath();
    ctx.arc(dx, dy, rr, 0, Math.PI * 2);
    ctx.fill();
  });

  // Feathered Alpine Snow Caps along Karakoram & Main Himalayan Crest
  const snowArc = [
    [36.0, 74.8], [34.2, 76.5], [32.0, 78.2], [30.2, 80.5],
    [28.8, 83.8], [27.95, 86.9], [27.7, 88.8], [28.2, 94.5], [29.0, 97.5],
  ];
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.shadowColor = 'rgba(241, 245, 249, 0.72)';
  ctx.shadowBlur = width * 0.0045;
  ctx.strokeStyle = 'rgba(232, 238, 244, 0.48)';
  ctx.lineWidth = width * 0.0042;
  ctx.beginPath();
  snowArc.forEach(([lat, lon], idx) => {
    const [sx, sy] = geoToPixel(lat, lon, width, height);
    if (idx === 0) ctx.moveTo(sx, sy);
    else ctx.lineTo(sx, sy);
  });
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(248, 250, 252, 0.78)';
  ctx.lineWidth = width * 0.0017;
  ctx.stroke();
  ctx.restore();

  // --- 5. High-Resolution Bengal Delta Jewel (Bangladesh) ---
  // Lush monsoon floodplain in radiant emerald
  ctx.fillStyle = '#16a34a'; // emerald-600
  drawSmoothSplinePolygon(ctx, CONTINENTS_GEO.bengalDelta, width, height, true);
  ctx.fill();

  // Sundarbans Mangrove Forest (World Heritage Mangrove Fringe)
  ctx.fillStyle = '#022c22'; // deep mangrove viridian
  const [sdX1, sdY1] = geoToPixel(21.7, 88.8, width, height);
  const [sdX2, sdY2] = geoToPixel(22.4, 90.4, width, height);
  ctx.fillRect(sdX1, sdY1, sdX2 - sdX1, (sdY2 - sdY1) * 0.85);

  // Mighty Bengal River Confluence (Padma, Jamuna, Meghna)
  ctx.strokeStyle = '#38bdf8'; // Sky-400 river blue
  ctx.lineWidth = width * 0.0018;
  ctx.beginPath();
  const [padmaX, padmaY] = geoToPixel(25.0, 88.2, width, height);
  const [confX, confY] = geoToPixel(23.75, 90.2, width, height);
  const [estX, estY] = geoToPixel(22.1, 90.8, width, height);
  ctx.moveTo(padmaX, padmaY);
  ctx.lineTo(confX, confY);
  ctx.lineTo(estX, estY);
  ctx.stroke();

  // Famous Bengal Delta Turquoise Sediment Plume (Spilling into the Bay of Bengal)
  const plumeGrad = ctx.createRadialGradient(estX, estY, 2, estX, estY + height * 0.06, height * 0.09);
  plumeGrad.addColorStop(0.0, 'rgba(45, 212, 191, 0.75)'); // vibrant teal
  plumeGrad.addColorStop(0.45, 'rgba(13, 148, 136, 0.4)');
  plumeGrad.addColorStop(1.0, 'rgba(10, 46, 92, 0)');
  ctx.fillStyle = plumeGrad;
  ctx.beginPath();
  ctx.arc(estX, estY + height * 0.035, height * 0.07, 0, Math.PI * 2);
  ctx.fill();

  // --- 6. Natural Fractal Noise for Micro-Topography Texture ---
  ctx.fillStyle = 'rgba(255, 255, 255, 0.035)';
  for (let i = 0; i < 5000; i++) {
    const rx = (Math.sin(i * 12.9898) * 43758.5453) % 1;
    const ry = (Math.cos(i * 78.233) * 43758.5453) % 1;
    const px = Math.abs(rx) * width;
    const py = Math.abs(ry) * height;
    ctx.fillRect(px, py, 2, 2);
  }

  return canvas;
}

/**
 * 2. Generate Night-Side City Lights Texture Canvas (Emissive Glow)
 */
export function createEarthNightCanvas(width = 2048, height = 1024) {
  const canvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
  if (!canvas) return null;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Solid black space background for night side
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, width, height);

  // Render City Lights as Luminous Golden Stars with Radial Falloff
  NIGHT_CITIES.forEach((city) => {
    const [cx, cy] = geoToPixel(city.lat, city.lon, width, height);
    const radius = (city.pop / 10) * (width * 0.014) + 2.5;

    // Glowing golden halo
    const glow = ctx.createRadialGradient(cx, cy, 0.5, cx, cy, radius);
    glow.addColorStop(0, '#ffffff'); // bright incandescent core
    glow.addColorStop(0.2, city.color || '#fef08a');
    glow.addColorStop(0.6, 'rgba(245, 158, 11, 0.45)');
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
  });

  // Highway Network Threads between Major Clusters in South Asia
  ctx.strokeStyle = 'rgba(251, 191, 36, 0.4)'; // amber-400
  ctx.lineWidth = 1.2;
  const connectCities = (c1, c2) => {
    const cityA = NIGHT_CITIES.find(c => c.name === c1);
    const cityB = NIGHT_CITIES.find(c => c.name === c2);
    if (!cityA || !cityB) return;
    const [x1, y1] = geoToPixel(cityA.lat, cityA.lon, width, height);
    const [x2, y2] = geoToPixel(cityB.lat, cityB.lon, width, height);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  };

  // Golden highway corridors in Bengal Delta & India
  connectCities('Dhaka', 'Chittagong');
  connectCities('Dhaka', 'Sylhet');
  connectCities('Dhaka', 'Rajshahi');
  connectCities('Dhaka', 'Khulna');
  connectCities('Dhaka', 'Kolkata');
  connectCities('Kolkata', 'Delhi');
  connectCities('Delhi', 'Lahore');
  connectCities('Delhi', 'Mumbai');
  connectCities('Mumbai', 'Bangalore');
  connectCities('Bangalore', 'Chennai');

  return canvas;
}

/**
 * 3. Generate Realistic Atmospheric Clouds Canvas (Translucent Swirls)
 */
export function createEarthCloudsCanvas(width = 2048, height = 1024) {
  const canvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
  if (!canvas) return null;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.clearRect(0, 0, width, height);

  // Cloud drawing helper with soft feathered radial falloff
  const drawCloudCluster = (lat, lon, rX, rY, opacity = 0.6) => {
    const [cx, cy] = geoToPixel(lat, lon, width, height);
    const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, rX);
    grad.addColorStop(0, `rgba(255, 255, 255, ${opacity})`);
    grad.addColorStop(0.5, `rgba(240, 248, 255, ${opacity * 0.6})`);
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rX, rY, 0.2, 0, Math.PI * 2);
    ctx.fill();
  };

  // 1. Equatorial Intertropical Convergence Zone (ITCZ) Cloud Belt
  for (let lon = -180; lon <= 180; lon += 14) {
    const latOffset = Math.sin((lon * Math.PI) / 60) * 5;
    drawCloudCluster(5 + latOffset, lon, width * 0.045, height * 0.025, 0.6);
  }

  // 2. Tropical Cyclone Monsoon Spiral over the Bay of Bengal
  const [cycX, cycY] = geoToPixel(18.5, 88.5, width, height);
  for (let a = 0; a < Math.PI * 4; a += 0.25) {
    const r = (a / (Math.PI * 4)) * (width * 0.04);
    const px = cycX + Math.cos(a) * r * 1.5;
    const py = cycY + Math.sin(a) * r * 0.8;
    ctx.fillStyle = `rgba(255, 255, 255, ${0.75 - a * 0.04})`;
    ctx.beginPath();
    ctx.arc(px, py, (width * 0.009) + a * 1.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // 3. Mid-latitude Cyclonic Weather Fronts (North Atlantic, Pacific, Roaring Forties)
  for (let lon = -160; lon <= 160; lon += 24) {
    drawCloudCluster(48 + Math.cos(lon) * 6, lon, width * 0.055, height * 0.03, 0.5);
    drawCloudCluster(-52 + Math.sin(lon) * 5, lon, width * 0.065, height * 0.025, 0.55);
  }

  return canvas;
}

/**
 * 4. Generate Deep Cosmic Starfield Environment Texture
 */
export function createSpaceSkyboxCanvas(width = 2048, height = 1024) {
  const canvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
  if (!canvas) return null;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Ultra-deep space cosmic gradient
  const spaceGrad = ctx.createRadialGradient(width * 0.5, height * 0.5, 50, width * 0.5, height * 0.5, width * 0.8);
  spaceGrad.addColorStop(0, '#040d16');
  spaceGrad.addColorStop(0.6, '#020617');
  spaceGrad.addColorStop(1, '#000000');
  ctx.fillStyle = spaceGrad;
  ctx.fillRect(0, 0, width, height);

  // Milky Way Galactic Dust Clouds
  const milkyGrad = ctx.createLinearGradient(0, 0, width, height);
  milkyGrad.addColorStop(0.2, 'rgba(56, 189, 248, 0)');
  milkyGrad.addColorStop(0.45, 'rgba(56, 189, 248, 0.05)');
  milkyGrad.addColorStop(0.55, 'rgba(168, 85, 247, 0.05)');
  milkyGrad.addColorStop(0.8, 'rgba(236, 72, 153, 0)');
  ctx.fillStyle = milkyGrad;
  ctx.fillRect(0, 0, width, height);

  // Distant Stars with Spectral Color Variety (Blue, Gold, White)
  const starColors = ['#ffffff', '#bae6fd', '#fef08a', '#fbcfe8'];
  for (let i = 0; i < 1800; i++) {
    const sx = Math.random() * width;
    const sy = Math.random() * height;
    const sRad = Math.random() < 0.92 ? 0.85 : Math.random() * 2.2 + 1;
    const sColor = starColors[Math.floor(Math.random() * starColors.length)];

    ctx.fillStyle = sColor;
    ctx.beginPath();
    ctx.arc(sx, sy, sRad, 0, Math.PI * 2);
    ctx.fill();

    // Occasional twinkling diffraction spikes
    if (sRad > 2.0) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(sx - 6, sy);
      ctx.lineTo(sx + 6, sy);
      ctx.moveTo(sx, sy - 6);
      ctx.lineTo(sx, sy + 6);
      ctx.stroke();
    }
  }

  return canvas;
}

// Major global orogenic mountain chains in [lat, lon] with peak elevation weight (0..1)
export const MOUNTAIN_SPINES_GEO = [
  // Himalayas & Karakoram / Pamir / Hindu Kush (high relief across South Asia border)
  { weight: 1.0, width: 0.015, pts: [[35.8, 76.5], [35.2, 74.5], [34.1, 77.6], [31.5, 78.6], [29.6, 80.7], [28.5, 84.0], [27.98, 86.92], [27.7, 88.15], [27.5, 91.5], [28.3, 95.6], [28.8, 97.6]] },
  { weight: 0.92, width: 0.013, pts: [[38.6, 72.5], [37.2, 74.8], [35.8, 76.5], [36.0, 71.0], [34.4, 68.4]] },
  // Kunlun Shan & Tian Shan (Tibetan northern & central Asian rims)
  { weight: 0.82, width: 0.014, pts: [[37.0, 77.2], [36.5, 84.0], [36.0, 92.0], [35.2, 99.5]] },
  { weight: 0.78, width: 0.012, pts: [[41.2, 74.8], [42.4, 81.8], [43.0, 89.5], [43.2, 94.5]] },
  // Shillong / Meghalaya Plateau & Chittagong / Arakan Yoma Hills flanking Bangladesh
  { weight: 0.65, width: 0.009, pts: [[25.4, 90.2], [25.3, 92.4], [24.8, 93.4]] },
  { weight: 0.62, width: 0.010, pts: [[24.8, 93.4], [22.9, 92.4], [20.5, 93.6], [17.5, 94.5]] },
  // Western Ghats & Deccan Escarpment
  { weight: 0.55, width: 0.010, pts: [[20.5, 73.5], [15.5, 74.2], [10.8, 77.0]] },
  // Zagros, Caucasus, Alps, Pyrenees
  { weight: 0.72, width: 0.011, pts: [[36.0, 45.2], [32.5, 49.5], [29.2, 52.8], [27.2, 56.0]] },
  { weight: 0.76, width: 0.009, pts: [[43.4, 40.2], [42.5, 44.5], [41.2, 48.2]] },
  { weight: 0.80, width: 0.010, pts: [[44.2, 6.8], [46.1, 8.2], [46.8, 11.4], [47.2, 15.0]] },
  // Ethiopian Highlands, East African Rift & Atlas
  { weight: 0.72, width: 0.012, pts: [[13.2, 38.2], [9.5, 39.5], [5.5, 37.8], [1.0, 35.5], [-3.2, 37.3], [-9.5, 34.0]] },
  { weight: 0.60, width: 0.010, pts: [[31.2, -7.8], [33.5, -4.0], [35.2, 1.5]] },
  // Andes Cordillera
  { weight: 0.96, width: 0.014, pts: [[10.0, -73.0], [2.0, -77.5], [-9.0, -77.0], [-18.0, -69.5], [-26.0, -68.5], [-34.0, -70.0], [-45.0, -72.8], [-52.0, -73.5]] },
  // North American Cordillera (Rockies, Alaska, Sierra Madre)
  { weight: 0.86, width: 0.015, pts: [[63.0, -151.0], [60.0, -138.0], [54.0, -124.0], [46.0, -114.0], [40.0, -106.0], [34.0, -106.5], [24.0, -103.5], [18.5, -97.5]] },
  // Urals & Scandinavian Mountains
  { weight: 0.50, width: 0.009, pts: [[67.5, 62.0], [60.5, 59.2], [53.0, 58.0]] },
  { weight: 0.56, width: 0.010, pts: [[68.5, 18.0], [64.0, 12.5], [60.8, 7.8]] },
];

// Major global river networks & Bengal Delta distributaries in [lat, lon]
export const RIVERS_GEO = [
  // Bengal Delta (Padma / Ganges, Jamuna / Brahmaputra, Meghna / Surma, Hooghly)
  { width: 0.0022, pts: [[29.9, 78.2], [27.2, 79.6], [25.4, 83.0], [25.2, 87.6], [24.3, 88.6], [23.75, 90.2], [22.8, 90.6], [21.95, 90.9]] },
  { width: 0.0022, pts: [[29.3, 89.0], [29.1, 94.4], [27.5, 94.8], [26.2, 91.5], [25.8, 89.8], [24.5, 89.7], [23.75, 90.2]] },
  { width: 0.0018, pts: [[25.1, 92.2], [24.6, 91.4], [23.6, 90.75], [22.5, 90.8]] },
  { width: 0.0015, pts: [[24.5, 88.1], [23.4, 88.4], [22.57, 88.36], [21.65, 88.1]] },
  { width: 0.0014, pts: [[22.8, 89.5], [22.2, 89.5], [21.8, 89.4]] },
  // Indus, Irrawaddy, Mekong, Yangtze, Yellow
  { width: 0.0016, pts: [[35.5, 74.5], [32.0, 71.0], [28.0, 69.0], [24.1, 67.6]] },
  { width: 0.0016, pts: [[25.8, 97.5], [21.2, 95.0], [16.5, 95.4]] },
  { width: 0.0016, pts: [[22.5, 100.5], [17.6, 104.2], [12.5, 105.0], [9.8, 106.2]] },
  { width: 0.0018, pts: [[30.5, 104.0], [30.6, 114.2], [31.4, 121.6]] },
  { width: 0.0015, pts: [[36.0, 103.8], [40.2, 110.0], [34.8, 114.0], [37.7, 119.0]] },
  // Nile, Congo, Niger
  { width: 0.0018, pts: [[0.5, 33.0], [15.6, 32.5], [25.8, 32.6], [31.2, 30.8]] },
  { width: 0.0018, pts: [[0.8, 24.5], [-4.3, 15.3], [-6.0, 12.3]] },
  { width: 0.0015, pts: [[13.5, -5.0], [16.5, -2.5], [12.0, 3.0], [5.0, 6.2]] },
  // Amazon, Parana, Mississippi, Danube
  { width: 0.0022, pts: [[-4.0, -73.2], [-3.1, -60.0], [-1.8, -53.5], [-0.4, -49.5]] },
  { width: 0.0016, pts: [[-19.5, -57.5], [-27.5, -58.8], [-34.4, -58.4]] },
  { width: 0.0017, pts: [[45.0, -93.2], [38.6, -90.2], [32.3, -90.9], [29.1, -89.2]] },
  { width: 0.0013, pts: [[48.2, 16.4], [45.0, 20.5], [45.2, 29.6]] },
];

// Helper to draw an open smooth Catmull-Rom polyline for mountain ridges and rivers
function drawSmoothPolyline(ctx, pts, width, height) {
  if (!pts || pts.length < 2) return;
  const pixels = pts.map(([lat, lon]) => geoToPixel(lat, lon, width, height));
  ctx.beginPath();
  ctx.moveTo(pixels[0][0], pixels[0][1]);
  if (pixels.length === 2) {
    ctx.lineTo(pixels[1][0], pixels[1][1]);
    return;
  }
  for (let i = 0; i < pixels.length - 1; i++) {
    const p0 = pixels[Math.max(0, i - 1)];
    const p1 = pixels[i];
    const p2 = pixels[i + 1];
    const p3 = pixels[Math.min(pixels.length - 1, i + 2)];
    const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6;
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2[0], p2[1]);
  }
}

/**
 * 5. Generate Smooth Orographic Terrain Elevation / Bump Heightmap Canvas
 *    Uses layered soft radial massif domes along tectonic ridges (zero hard stroke edges or cross-spurs)
 *    so WebGL tangent-space normals & oblique shadows sculpt realistic relief over Blue Marble.
 */
export function createEarthHeightCanvas(width = 2048, height = 1024) {
  const canvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
  if (!canvas) return null;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  // Deep ocean bathymetric floor
  ctx.fillStyle = '#080808';
  ctx.fillRect(0, 0, width, height);

  const paintSoftDome = (cx, cy, rad, peakAlpha, rgbVal = 255) => {
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
    grad.addColorStop(0, `rgba(${rgbVal}, ${rgbVal}, ${rgbVal}, ${peakAlpha})`);
    grad.addColorStop(0.45, `rgba(${rgbVal}, ${rgbVal}, ${rgbVal}, ${peakAlpha * 0.5})`);
    grad.addColorStop(1, `rgba(${rgbVal}, ${rgbVal}, ${rgbVal}, 0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, rad, 0, Math.PI * 2);
    ctx.fill();
  };

  // Subtle soft mid-ocean ridges (broad Gaussian brush, zero hard stroke artifacts)
  for (let i = 0; i <= 18; i++) {
    const t = i / 18;
    const lat = 62 - t * 114;
    const lon = -26 - Math.sin(t * Math.PI * 1.4) * 19 + t * 16;
    const [mx, my] = geoToPixel(lat, lon, width, height);
    paintSoftDome(mx, my, width * 0.015, 0.14, 46);
  }

  // Soft continental shelf & margin slope (gradual bathymetric rise up to coastline)
  ctx.shadowColor = '#343434';
  ctx.shadowBlur = width * 0.016;
  ctx.fillStyle = '#3c3c3c';
  Object.values(CONTINENTS_GEO).forEach((pts) => {
    drawSmoothSplinePolygon(ctx, pts, width, height, true);
    ctx.fill();
  });
  ctx.shadowBlur = 0;

  // Base continental landmass plains & broad elevated basins
  const fillElev = (pts, hex, blurFrac = 0.005) => {
    ctx.shadowColor = hex;
    ctx.shadowBlur = width * blurFrac;
    ctx.fillStyle = hex;
    drawSmoothSplinePolygon(ctx, pts, width, height, true);
    ctx.fill();
    ctx.shadowBlur = 0;
  };

  Object.entries(CONTINENTS_GEO).forEach(([key, pts]) => {
    if (key === 'himalayasTibet') return;
    if (key === 'bengalDelta') {
      fillElev(pts, '#525252', 0.006); // low-lying alluvial Bengal Delta
    } else if (key === 'antarctica' || key === 'greenland') {
      fillElev(pts, '#adadad', 0.009); // elevated continental ice sheets
    } else if (key === 'centralAsiaPersia' || key === 'middleEastArabia') {
      fillElev(pts, '#808080', 0.008); // elevated arid plateaus
    } else {
      fillElev(pts, '#626262', 0.006);
    }
  });

  // Tibetan Plateau broad high-elevation massif dome
  fillElev(CONTINENTS_GEO.himalayasTibet, '#b8b8b8', 0.022);

  // Deccan, Tibetan, Iranian, African & Intermountain broad plateau domes
  const broadDomes = [
    [16.5, 77.2, 0.036, 0.22, 148],
    [32.5, 88.5, 0.056, 0.38, 202],
    [35.0, 54.0, 0.042, 0.22, 162],
    [-14.5, 24.0, 0.055, 0.18, 138],
    [40.0, -108.5, 0.048, 0.22, 162],
  ];
  broadDomes.forEach(([lat, lon, rF, a, v]) => {
    const [dx, dy] = geoToPixel(lat, lon, width, height);
    paintSoftDome(dx, dy, width * rF, a, v);
  });

  // Major Orogenic Mountain Chains sculpted smoothly from densely sampled radial massifs
  MOUNTAIN_SPINES_GEO.forEach((range, rIdx) => {
    const pts = range.pts;
    const baseR = range.width * width;
    for (let i = 0; i < pts.length - 1; i++) {
      const [lat0, lon0] = pts[i];
      const [lat1, lon1] = pts[i + 1];
      const [x0, y0] = geoToPixel(lat0, lon0, width, height);
      const [x1, y1] = geoToPixel(lat1, lon1, width, height);
      const segPx = Math.hypot(x1 - x0, y1 - y0);
      const steps = Math.max(4, Math.ceil(segPx / Math.max(2.5, baseR * 0.28)));
      const nx = segPx > 1e-3 ? -(y1 - y0) / segPx : 0;
      const ny = segPx > 1e-3 ? (x1 - x0) / segPx : 1;

      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const cx = x0 + (x1 - x0) * t;
        const cy = y0 + (y1 - y0) * t;
        const seed = rIdx * 31.7 + i * 7.3 + s * 1.91;
        const jitter = Math.sin(seed * 3.13) * baseR * 0.22;
        const crestScale = 0.82 + 0.34 * Math.abs(Math.cos(seed * 1.7));

        // 1. Broad foothill slope ramp
        paintSoftDome(cx + nx * jitter * 0.4, cy + ny * jitter * 0.4, baseR * 1.55 * crestScale, 0.12 * range.weight, 208);
        // 2. Main ridge massif
        paintSoftDome(cx + nx * jitter, cy + ny * jitter, baseR * 0.72 * crestScale, 0.18 * range.weight, 242);
        // 3. Staggered natural side massif lobes (organic hills/valleys, zero stick spurs)
        if (s % 2 === 0) {
          const lobeSide = ((i + s) % 2 === 0 ? 1 : -1) * baseR * (0.48 + 0.22 * Math.abs(Math.sin(seed * 4.7)));
          paintSoftDome(cx + nx * lobeSide, cy + ny * lobeSide, baseR * 0.56, 0.1 * range.weight, 222);
        }
      }
    }
  });

  // Gentle soft river valley alluvial depressions (feathered falloff, zero dark stroke scars)
  RIVERS_GEO.forEach((rv) => {
    for (let i = 0; i < rv.pts.length - 1; i++) {
      const [x0, y0] = geoToPixel(rv.pts[i][0], rv.pts[i][1], width, height);
      const [x1, y1] = geoToPixel(rv.pts[i + 1][0], rv.pts[i + 1][1], width, height);
      const segPx = Math.hypot(x1 - x0, y1 - y0);
      const steps = Math.max(3, Math.ceil(segPx / Math.max(4, rv.width * width * 1.8)));
      const rad = Math.max(3, rv.width * width * 2.2);
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        paintSoftDome(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, rad, 0.06, 52);
      }
    }
  });

  // Subtle multi-scale continental terrain undulation (soft micro-domes, zero hard pixel grain)
  for (let i = 0; i < 450; i++) {
    const rx = Math.abs((Math.sin(i * 19.137 + 0.31) * 43758.5453) % 1);
    const ry = Math.abs((Math.cos(i * 91.731 + 0.17) * 29431.7123) % 1);
    const rad = 2.5 + (i % 5) * 1.8;
    paintSoftDome(rx * width, ry * height, rad, 0.03, i % 2 === 0 ? 245 : 44);
  }

  return canvas;
}

// Alias for explicit bump naming convention
export function createEarthBumpCanvas(width = 2048, height = 1024) {
  return createEarthHeightCanvas(width, height);
}

/**
 * 6. Generate Tangent-Space Normal Map Canvas from Heightmap via Seamless 3x3 Sobel Filter
 *    Compatible with standard WebGL 1.0 / 2.0 shaders without derivative extensions.
 */
export function createEarthNormalCanvas(width = 2048, height = 1024, sourceHeightCanvas = null, strength = 2.0) {
  const canvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
  if (!canvas) return null;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const heightCanvas = sourceHeightCanvas || createEarthHeightCanvas(width, height);
  if (!heightCanvas) return null;
  const hCtx = heightCanvas.getContext('2d', { willReadFrequently: true });
  if (!hCtx) return null;

  const srcW = heightCanvas.width;
  const srcH = heightCanvas.height;
  const srcData = hCtx.getImageData(0, 0, srcW, srcH).data;
  const outImg = ctx.createImageData(width, height);
  const dst = outImg.data;

  // Read height [0..1] from source canvas (resampling cleanly if dimensions differ)
  const sampleH = (x, y) => {
    const wx = ((x % width) + width) % width;
    const cy = y < 0 ? 0 : y >= height ? height - 1 : y;
    const sx = srcW === width ? wx : Math.min(srcW - 1, Math.floor((wx * srcW) / width));
    const sy = srcH === height ? cy : Math.min(srcH - 1, Math.floor((cy * srcH) / height));
    return srcData[(sy * srcW + sx) * 4] / 255;
  };

  for (let y = 0; y < height; y++) {
    const yUp = y > 0 ? y - 1 : 0;
    const yDn = y < height - 1 ? y + 1 : height - 1;
    const latRad = (0.5 - (y + 0.5) / height) * Math.PI;
    const eastScale = 1 / Math.max(0.32, Math.cos(latRad));
    const rowOff = y * width;

    for (let x = 0; x < width; x++) {
      const xL = x > 0 ? x - 1 : width - 1;
      const xR = x < width - 1 ? x + 1 : 0;

      const tl = sampleH(xL, yUp);
      const t = sampleH(x, yUp);
      const tr = sampleH(xR, yUp);
      const l = sampleH(xL, y);
      const r = sampleH(xR, y);
      const bl = sampleH(xL, yDn);
      const b = sampleH(x, yDn);
      const br = sampleH(xR, yDn);

      // 3x3 Sobel slopes: +x = East (+T), +y = South (-B)
      const dX = ((tr + 2 * r + br) - (tl + 2 * l + bl)) * eastScale;
      const dY = (bl + 2 * b + br) - (tl + 2 * t + tr);

      // Tangent space (T=East, B=North, N=Up):
      // nx = -dH/du, ny = +dH/dy_canvas, nz = 1
      let nx = -dX * strength;
      let ny = dY * strength;
      let nz = 1.0;
      const invLen = 1 / Math.sqrt(nx * nx + ny * ny + nz * nz);
      nx *= invLen;
      ny *= invLen;
      nz *= invLen;

      const idx = (rowOff + x) * 4;
      dst[idx] = Math.max(0, Math.min(255, Math.round((nx * 0.5 + 0.5) * 255)));
      dst[idx + 1] = Math.max(0, Math.min(255, Math.round((ny * 0.5 + 0.5) * 255)));
      dst[idx + 2] = Math.max(0, Math.min(255, Math.round((nz * 0.5 + 0.5) * 255)));
      dst[idx + 3] = 255;
    }
  }

  ctx.putImageData(outImg, 0, 0);
  return canvas;
}

/**
 * 7. Generate Dedicated Specular Mask Canvas:
 *    - Deep oceans (high crisp specular sun glint, R=G=B ~ 235)
 *    - Continental shelves & Bay of Bengal shallow waters (distinct B-R boost for turquoise-warm coastal glint)
 *    - Dry land / deserts / mountains (near-zero matte specular ~ 8)
 *    - Polar ice & glaciers (soft matte-sheen ~ 58)
 *    - Inland rivers & Bengal Delta estuaries (distinct G-R boost for fine specular glint threads)
 */
export function createEarthSpecularCanvas(width = 2048, height = 1024) {
  const canvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
  if (!canvas) return null;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // 1. Deep Open Ocean (high crisp specular mask)
  ctx.fillStyle = 'rgb(235, 235, 235)';
  ctx.fillRect(0, 0, width, height);

  // 2. Continental Shelf Waters (soft transition band around coastlines)
  ctx.shadowColor = 'rgb(185, 205, 240)';
  ctx.shadowBlur = width * 0.016;
  ctx.fillStyle = 'rgb(185, 205, 240)';
  ctx.strokeStyle = 'rgb(175, 200, 242)';
  ctx.lineWidth = width * 0.008;
  Object.values(CONTINENTS_GEO).forEach((pts) => {
    drawSmoothSplinePolygon(ctx, pts, width, height, true);
    ctx.fill();
    ctx.stroke();
  });
  ctx.shadowBlur = 0;

  // Extra Bay of Bengal shallow continental shelf & Sunda Shelf prominence
  const [bobX, bobY] = geoToPixel(20.5, 90.0, width, height);
  const bobShelf = ctx.createRadialGradient(bobX, bobY, width * 0.005, bobX, bobY + height * 0.04, width * 0.036);
  bobShelf.addColorStop(0, 'rgb(178, 206, 245)');
  bobShelf.addColorStop(0.6, 'rgb(198, 214, 240)');
  bobShelf.addColorStop(1, 'rgba(235, 235, 235, 0)');
  ctx.fillStyle = bobShelf;
  ctx.beginPath();
  ctx.arc(bobX, bobY + height * 0.02, width * 0.036, 0, Math.PI * 2);
  ctx.fill();

  // 3. Dry Landmasses (low matte specular, crisp coastline mask)
  Object.entries(CONTINENTS_GEO).forEach(([key, pts]) => {
    if (key === 'antarctica' || key === 'greenland') {
      ctx.fillStyle = 'rgb(56, 60, 68)'; // snow/ice satin sheen
    } else if (key === 'bengalDelta') {
      ctx.fillStyle = 'rgb(26, 36, 36)'; // moist floodplain soil
    } else {
      ctx.fillStyle = 'rgb(8, 8, 8)'; // dry land / forest / desert
    }
    drawSmoothSplinePolygon(ctx, pts, width, height, true);
    ctx.fill();
  });

  // 4. Inland Lakes & Major Seas (Caspian, Aral, Victoria, Great Lakes, Baikal)
  const lakes = [
    [41.5, 50.8, 0.012, 0.022],
    [45.0, 59.8, 0.007, 0.008],
    [-1.2, 33.2, 0.006, 0.006],
    [45.5, -85.0, 0.015, 0.008],
    [53.5, 108.0, 0.009, 0.004],
  ];
  ctx.fillStyle = 'rgb(165, 228, 235)';
  lakes.forEach(([lat, lon, rxF, ryF]) => {
    const [lx, ly] = geoToPixel(lat, lon, width, height);
    ctx.beginPath();
    ctx.ellipse(lx, ly, width * rxF, height * ryF, 0.2, 0, Math.PI * 2);
    ctx.fill();
  });

  // 5. Inland Rivers & Bengal Delta Distributaries (encoded with distinct G-R highlight)
  ctx.strokeStyle = 'rgb(154, 230, 228)';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  RIVERS_GEO.forEach((rv) => {
    ctx.lineWidth = Math.max(1.1, rv.width * width * 0.88);
    drawSmoothPolyline(ctx, rv.pts, width, height);
    ctx.stroke();
  });

  return canvas;
}

/**
 * 8. Generate Global Planetary Climate Data Layer Canvas (orthogonal R/G/B channel synthesis):
 *    - Red (R): GPM IMERG Precipitation & Monsoon Belt Climatology
 *    - Green (G): MODIS NDVI Vegetative Greenness & Cropland Vigor
 *    - Blue (B): SMAP / GRACE Root-Zone Moisture & Aquifer Depletion Anomaly
 *      (128 = neutral, >165 = wet delta / haor surplus, <80 = arid / Barind-NW India groundwater depletion)
 */
export function createEarthClimateCanvas(width = 1024, height = 512) {
  if (typeof document === 'undefined') return null;
  const makeBuf = (fillStyle) => {
    const c = document.createElement('canvas');
    c.width = width;
    c.height = height;
    const x = c.getContext('2d', { willReadFrequently: true });
    if (!x) return null;
    x.fillStyle = fillStyle;
    x.fillRect(0, 0, width, height);
    return { c, x };
  };

  const out = makeBuf('rgb(0, 0, 128)');
  const chR = makeBuf('rgb(28, 28, 28)');
  const chG = makeBuf('rgb(0, 0, 0)');
  const chB = makeBuf('rgb(128, 128, 128)');
  if (!out || !chR || !chG || !chB) return null;

  const drawRadialGray = (ctx, lat, lon, rFrac, val, alpha = 1, mode = 'source-over') => {
    const [cx, cy] = geoToPixel(lat, lon, width, height);
    const rad = width * rFrac;
    ctx.save();
    ctx.globalCompositeOperation = mode;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
    grad.addColorStop(0, `rgba(${val}, ${val}, ${val}, ${alpha})`);
    grad.addColorStop(0.55, `rgba(${val}, ${val}, ${val}, ${alpha * 0.48})`);
    grad.addColorStop(1, `rgba(${val}, ${val}, ${val}, 0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, rad, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  // --- 1. R-channel: GPM IMERG ITCZ & Monsoon Rainfall Corridors ---
  for (let lon = -180; lon < 180; lon += 16) {
    const lat = 5 + Math.sin((lon * Math.PI) / 65) * 4.5;
    drawRadialGray(chR.x, lat, lon, 0.082, 168, 0.56, 'lighter');
  }
  drawRadialGray(chR.x, 21.5, 90.5, 0.088, 238, 0.85, 'lighter'); // Bay of Bengal -> Bengal Delta monsoon
  drawRadialGray(chR.x, 25.2, 91.8, 0.056, 252, 0.82, 'lighter'); // Meghalaya / Sylhet orographic peak
  drawRadialGray(chR.x, 15.8, 74.0, 0.050, 188, 0.65, 'lighter'); // Western Ghats
  drawRadialGray(chR.x, 14.0, 97.5, 0.065, 206, 0.68, 'lighter'); // Myanmar / Andaman
  drawRadialGray(chR.x, -2.0, 112.0, 0.080, 205, 0.68, 'lighter'); // Maritime Continent
  drawRadialGray(chR.x, -3.0, -60.0, 0.095, 212, 0.72, 'lighter'); // Amazonia
  drawRadialGray(chR.x, 2.0, 20.0, 0.075, 188, 0.62, 'lighter');   // Congo Basin
  // Subtropical rain-shadow dryness (Sahara, Arabia, Tibet) without touching NDVI/SMAP
  drawRadialGray(chR.x, 24.0, 13.0, 0.11, 12, 0.72, 'source-over');
  drawRadialGray(chR.x, 24.0, 46.0, 0.075, 14, 0.72, 'source-over');
  drawRadialGray(chR.x, 34.0, 86.0, 0.048, 42, 0.55, 'source-over');

  // --- 2. G-channel: MODIS NDVI Vegetative Greenness & Cropland Vigor ---
  // Note: Shader masks NDVI by real/procedural landMask, so ocean overlap is naturally clipped.
  const paintG = (pts, val) => {
    chG.x.fillStyle = `rgb(${val}, ${val}, ${val})`;
    drawSmoothSplinePolygon(chG.x, pts, width, height, true);
    chG.x.fill();
  };
  paintG(CONTINENTS_GEO.indiaSubcontinent, 158);
  paintG(CONTINENTS_GEO.southeastAsia, 212);
  paintG(CONTINENTS_GEO.indonesiaSumatra, 226);
  paintG(CONTINENTS_GEO.indonesiaJava, 218);
  paintG(CONTINENTS_GEO.indonesiaBorneo, 236);
  paintG(CONTINENTS_GEO.chinaEastAsia, 152);
  paintG(CONTINENTS_GEO.europe, 168);
  paintG(CONTINENTS_GEO.britishIsles, 190);
  paintG(CONTINENTS_GEO.northAmerica, 148);
  paintG(CONTINENTS_GEO.southAmerica, 165);
  paintG(CONTINENTS_GEO.africa, 118);
  paintG(CONTINENTS_GEO.madagascar, 168);
  paintG(CONTINENTS_GEO.australia, 74);
  paintG(CONTINENTS_GEO.middleEastArabia, 32);
  paintG(CONTINENTS_GEO.centralAsiaPersia, 54);
  paintG(CONTINENTS_GEO.himalayasTibet, 52);
  paintG(CONTINENTS_GEO.amazonRainforest, 246);
  paintG(CONTINENTS_GEO.bengalDelta, 240);
  // Sahara / Outback low-NDVI desert attenuation
  drawRadialGray(chG.x, 23.5, 13.0, 0.115, 22, 0.85, 'source-over');
  drawRadialGray(chG.x, -24.5, 134.0, 0.068, 38, 0.78, 'source-over');
  drawRadialGray(chG.x, 27.5, 71.0, 0.028, 56, 0.65, 'source-over'); // Thar Desert

  // --- 3. B-channel: SMAP / GRACE Soil Moisture & Aquifer Depletion Anomaly ---
  const paintB = (pts, val) => {
    chB.x.fillStyle = `rgb(${val}, ${val}, ${val})`;
    drawSmoothSplinePolygon(chB.x, pts, width, height, true);
    chB.x.fill();
  };
  paintB(CONTINENTS_GEO.indiaSubcontinent, 112);
  paintB(CONTINENTS_GEO.southeastAsia, 182);
  paintB(CONTINENTS_GEO.indonesiaSumatra, 196);
  paintB(CONTINENTS_GEO.indonesiaJava, 188);
  paintB(CONTINENTS_GEO.indonesiaBorneo, 206);
  paintB(CONTINENTS_GEO.chinaEastAsia, 138);
  paintB(CONTINENTS_GEO.europe, 154);
  paintB(CONTINENTS_GEO.britishIsles, 178);
  paintB(CONTINENTS_GEO.northAmerica, 132);
  paintB(CONTINENTS_GEO.southAmerica, 150);
  paintB(CONTINENTS_GEO.africa, 108);
  paintB(CONTINENTS_GEO.australia, 72);
  paintB(CONTINENTS_GEO.middleEastArabia, 32);
  paintB(CONTINENTS_GEO.centralAsiaPersia, 54);
  paintB(CONTINENTS_GEO.amazonRainforest, 214);
  paintB(CONTINENTS_GEO.bengalDelta, 222);
  // Wet haor/delta core vs Barind & Indo-Gangetic groundwater depletion stress
  drawRadialGray(chB.x, 23.1, 90.7, 0.030, 242, 0.88, 'source-over'); // Meghna/Delta floodplain surplus
  drawRadialGray(chB.x, 24.7, 88.3, 0.014, 48, 0.78, 'source-over');  // Barind Tract (Godagari) aquifer stress
  drawRadialGray(chB.x, 30.2, 75.5, 0.036, 36, 0.82, 'source-over');  // NW India / Punjab GRACE hotspot
  drawRadialGray(chB.x, 23.5, 13.0, 0.115, 24, 0.86, 'source-over');  // Sahara arid core
  drawRadialGray(chB.x, -24.5, 134.0, 0.068, 36, 0.80, 'source-over'); // Australian Outback

  // Merge pure R, G, B channels into output ImageData without any channel cross-talk
  const rData = chR.x.getImageData(0, 0, width, height).data;
  const gData = chG.x.getImageData(0, 0, width, height).data;
  const bData = chB.x.getImageData(0, 0, width, height).data;
  const outImg = out.x.createImageData(width, height);
  const dst = outImg.data;
  const len = width * height * 4;
  for (let i = 0; i < len; i += 4) {
    dst[i] = rData[i];
    dst[i + 1] = gData[i + 1];
    dst[i + 2] = bData[i + 2];
    dst[i + 3] = 255;
  }
  out.x.putImageData(outImg, 0, 0);
  return out.c;
}
