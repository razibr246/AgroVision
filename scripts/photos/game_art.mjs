// Key art for two game cards on the games hub (src/pages/public/Games.jsx), made with Google's Gemini image model
// (gemini-3-pro-image) from the prompts below, so anyone can see exactly what was asked for. AI illustrations, not
// photographs: the cards label them "AI image".
//   tara-dream    the children's dream game (/kids): the child, Tara the satellite and the two futures of the farm
//   meet-farmers  the farmers' gallery (/people): farmers and their children on stage, each with the weather they fear
// Writes src/assets/images/<name>-{900,1600,2400}.webp (cwebp). Needs GEMINI_API_KEY in .env.local.
//   node scripts/photos/game_art.mjs [name ...]
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = join(ROOT, 'src/assets/images'), TMP = join(ROOT, '.cache/game-art');
mkdirSync(TMP, { recursive: true });
const env = Object.fromEntries(readFileSync(join(ROOT, '.env.local'), 'utf8').split('\n').map((l) => l.match(/^([A-Z_]+)=(.*)$/)).filter(Boolean).map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]));
// Every key in GEMINI_API_KEYS (then GEMINI_API_KEY) is tried, best model first, until one has quota left.
const KEYS = [...new Set([...(env.GEMINI_API_KEYS ?? '').split(','), env.GEMINI_API_KEY].map((k) => k?.trim()).filter(Boolean))];
const MODELS = ['gemini-3-pro-image', 'gemini-3-pro-image-preview', 'gemini-3.1-flash-image', 'gemini-2.5-flash-image'];

const ART = {
  'tara-dream': `A wide cinematic key-art illustration for a children's dream adventure game, rendered as a stylized 3D animated-film still with soft painterly lighting and an original character design.

Subject: a nine-year-old Bangladeshi girl with two short black braids and a cotton nightdress printed with small yellow flowers flies through a moonlit indigo night sky, laughing, holding a glowing butterfly net in which she has just caught a small silver rain cloud. Real child proportions. Flying beside her is Tara, a small friendly Earth-observation satellite: a rounded white-and-silver body, two gold-and-blue solar panels spread like wings, and one round sensor window glowing soft teal like a kind eye; Tara sweeps a gentle fan of teal light down onto the land.

Below them floats a round dream island seen from slightly above: a Bangladeshi village farm with a tin-roofed house, a banana tree, a small pond and a winding river around it. The island shows two futures side by side. The left half is cracked pale-brown dry soil under a dim amber haze with wilting rice. The right half is lush green rice paddy with a soft green cover-crop blanket tucked over the soil and sparkling drops of water. At the island's front edge stand two tall softly glowing doorways, the left one cool grey, the right one warm gold.

Composition: 16:9, the girl and Tara in the upper-left third moving toward the right, the island filling the lower-right two thirds, open sky at the top right. Lighting: cool moonlight from upper left, a warm golden glow spilling from the right-hand doorway, floating sparkles and light volumetric haze. Palette: deep indigo, teal, leaf green and marigold gold, rich but gentle.

No text, no letters, no logos, no watermark.`,

  'meet-farmers': `A wide cinematic key-art render for a 3D game's character gallery, stylized 3D with natural, realistic adult and child proportions (not chibi, not big-headed), warm and dignified.

Setting: a dark theatre stage with a gentle arc of round wooden plinths, each lit by its own soft warm spotlight. On each plinth an adult farmer stands beside their own child (about 7 to 10 years old), both in the everyday farm clothes of their home, holding a real farm tool or crop. Left to right: a Bangladeshi farmer in a checked lungi with a red-and-white gamcha over his shoulder, holding a sickle, with his son; a Bangladeshi woman farmer in a green cotton sari holding a basket of rice, with her daughter; a Sikh farmer from Punjab in a saffron turban holding a sheaf of wheat, with his daughter; a farmer from Sindh in a white shalwar kameez and an Ajrak shawl holding a hoe, with his son; a Nepali woman farmer in a patterned shawl carrying a woven doko basket, with her daughter; a Bhutanese woman in a woven kira with a bundle of red rice, with her son; an older Myanmar farmer in a longyi and a bamboo hat, with his grandson; an American woman farmer in a denim shirt and work cap, with her daughter; a Brazilian farmer in a wide straw hat holding soybean plants, with his daughter; a Spanish woman farmer holding an olive branch, with her daughter.

Above each pair floats a small glowing holographic weather symbol for the danger that farmer fears most: a cyclone swirl, rising flood waves, a blazing heat sun, falling hail, a dust storm, a thunderstorm. Behind the stage, a large softly lit globe shows South Asia, the Americas and Europe.

Composition: 16:9, eye level, the arc of ten pairs spans the whole frame, the middle pairs slightly nearer and larger, faces readable with hopeful, proud smiles. Lighting: warm spotlights from above, cool blue rim light, a little haze in the beams. Rich earthy palette of greens, saffron, indigo and warm wood.

No text, no letters, no logos, no watermark.`,
};

async function generate(name) {
  for (const model of MODELS) for (const [k, key] of KEYS.entries()) {
    const imageConfig = { aspectRatio: '16:9', ...(model.startsWith('gemini-3') ? { imageSize: '2K' } : {}) };
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({ contents: [{ parts: [{ text: ART[name] }] }], generationConfig: { responseModalities: ['IMAGE'], imageConfig } }),
    });
    const j = await r.json().catch(() => ({}));
    const part = r.ok && j.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
    if (part) { console.log(name, `made by ${model} (key ${k + 1} of ${KEYS.length})`); return part; }
    console.log(name, `${model} key ${k + 1}: ${j.error?.status ?? j.candidates?.[0]?.finishReason ?? r.status}`);
  }
  throw new Error(`${name}: no model or key could make it`);
}

async function make(name) {
  const part = await generate(name);
  const src = join(TMP, `${name}.${part.inlineData.mimeType.includes('png') ? 'png' : 'jpg'}`);
  writeFileSync(src, Buffer.from(part.inlineData.data, 'base64'));
  for (const w of [900, 1600, 2400]) execFileSync('cwebp', ['-quiet', '-q', w >= 2400 ? '78' : '82', '-resize', String(w), '0', src, '-o', join(OUT, `${name}-${w}.webp`)]);
  console.log(name, '->', src);
}

for (const name of process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(ART)) await make(name);
