// Single source of truth for the product's name and brand copy.
// Change PROJECT_NAME here and every logo, title, footer, page heading and the HTML <title>/meta update.
// (vite.config.js reads this file to fill %PROJECT_NAME% and %PROJECT_DESCRIPTION% in index.html.)

export const PROJECT_NAME = 'AgroVision';
export const PROJECT_TEAM = 'BRM AstraX Team';

// The logo sets "Agro" in the primary ink and "Vision" in the accent colour.
export const PROJECT_NAME_PARTS = { main: 'Agro', accent: 'Vision', space: false };

export const PROJECT_TAGLINE = {
  bn: 'এই রবিতে কী লাগাবেন, পরের মৌসুমে কী — জমির পাশে থেকে হিসাব',
  en: 'What to plant this Rabi and what comes next — worked out for your own field',
};

export const PROJECT_DESCRIPTION =
  `${PROJECT_NAME} helps smallholder farmers and agriculture officers across all seven divisions of Bangladesh and international benchmarks decide whether to keep, adjust or shift crops, using 25 seasons of NASA climate data, local soil, crop needs and the farmer’s own priorities.`;

export const PROJECT_REGION = { bn: 'বাংলাদেশের ৭ বিভাগ ও আন্তর্জাতিক মানদণ্ড', en: 'Bangladesh (7 divisions) and international benchmarks' };
export const PROJECT_EVENT = { bn: 'নাসা স্পেস অ্যাপস ২০২৬', en: 'NASA Space Apps 2026' };

// Storage key prefix derived from the name, so a rename does not mix old saved demo state.
export const STORAGE_PREFIX = PROJECT_NAME.toLowerCase().replace(/[^a-z0-9]+/g, '-');
