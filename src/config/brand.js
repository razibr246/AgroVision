// Single source of truth for the product's name and brand copy.
// Change PROJECT_NAME here and every logo, title, footer, page heading and the HTML <title>/meta update.
// (vite.config.js reads this file to fill %PROJECT_NAME% and %PROJECT_DESCRIPTION% in index.html.)

export const PROJECT_NAME = 'Agros';
export const PROJECT_TEAM = 'BRM AstraX Team';

// The logo sets "Agro" in the primary ink and "s" in the accent colour.
export const PROJECT_NAME_PARTS = { main: 'Agro', accent: 's', space: false };

export const PROJECT_TAGLINE = {
  bn: 'এই রবিতে কী লাগাবেন, পরের মৌসুমে কী — জমির পাশে থেকে হিসাব',
  en: 'What to plant this Rabi and what comes next — worked out for your own field',
};

// Used for the meta description and link previews: keep it under about 155 characters so search results show it whole.
export const PROJECT_DESCRIPTION =
  `Climate-smart crop advice for Bangladesh’s farmers and agriculture officers: what to plant, when to water and what weather is coming, from NASA Earth data.`;

export const PROJECT_REGION = { bn: 'বাংলাদেশের ৭ বিভাগ', en: 'Bangladesh, all seven divisions' };
export const PROJECT_EVENT = { bn: 'নাসা স্পেস অ্যাপস ২০২৬', en: 'NASA Space Apps 2026' };

// Storage key prefix derived from the name, so a rename does not mix old saved demo state.
export const STORAGE_PREFIX = PROJECT_NAME.toLowerCase().replace(/[^a-z0-9]+/g, '-');
