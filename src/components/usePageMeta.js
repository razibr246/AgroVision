// A page's own browser-tab title and search/share description, set while it is open and restored when it closes.
// The site is one page with hash routes, so search engines mostly see the start page; the titles still help sharing
// (link previews read og:title at share time on many apps), bookmarks, browser history and screen-reader users.
import { useEffect, useState } from 'react';
import { PROJECT_NAME } from '../config/brand';

const meta = (sel, attr, name) => {
  let el = document.head.querySelector(sel);
  if (!el) { el = document.createElement('meta'); el.setAttribute(attr, name); document.head.appendChild(el); }
  return el;
};

const readDocLang = () => (typeof document !== 'undefined' && document.documentElement.lang === 'bn' ? 'bn' : 'en');
const pickText = (val, lang) => {
  if (!val) return '';
  if (typeof val === 'string') return val;
  return val[lang] || val.en || val.bn || '';
};

export default function usePageMeta(title, description) {
  const [lang, setLang] = useState(readDocLang);

  useEffect(() => {
    if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') return undefined;
    const sync = () => setLang(readDocLang());
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
    return () => obs.disconnect();
  }, []);

  const titleText = pickText(title, lang);
  const descText = pickText(description, lang);

  useEffect(() => {
    if (!titleText) return undefined;
    const prev = {
      title: document.title,
      desc: document.head.querySelector('meta[name="description"]')?.getAttribute('content'),
      og: document.head.querySelector('meta[property="og:title"]')?.getAttribute('content'),
      ogDesc: document.head.querySelector('meta[property="og:description"]')?.getAttribute('content'),
    };
    document.title = `${titleText} · ${PROJECT_NAME}`;
    meta('meta[property="og:title"]', 'property', 'og:title').setAttribute('content', `${titleText} · ${PROJECT_NAME}`);
    if (descText) {
      meta('meta[name="description"]', 'name', 'description').setAttribute('content', descText);
      meta('meta[property="og:description"]', 'property', 'og:description').setAttribute('content', descText);
    }
    return () => {
      document.title = prev.title;
      if (prev.desc != null) document.head.querySelector('meta[name="description"]')?.setAttribute('content', prev.desc);
      if (prev.og != null) document.head.querySelector('meta[property="og:title"]')?.setAttribute('content', prev.og);
      if (prev.ogDesc != null) document.head.querySelector('meta[property="og:description"]')?.setAttribute('content', prev.ogDesc);
    };
  }, [titleText, descText]);
}
