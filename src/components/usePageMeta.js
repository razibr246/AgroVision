// A page's own browser-tab title and search/share description, set while it is open and restored when it closes.
// The site is one page with hash routes, so search engines mostly see the start page; the titles still help sharing
// (link previews read og:title at share time on many apps), bookmarks, browser history and screen-reader users.
import { useEffect } from 'react';
import { PROJECT_NAME } from '../config/brand';

const meta = (sel, attr, name) => {
  let el = document.head.querySelector(sel);
  if (!el) { el = document.createElement('meta'); el.setAttribute(attr, name); document.head.appendChild(el); }
  return el;
};

export default function usePageMeta(title, description) {
  useEffect(() => {
    if (!title) return undefined;
    const prev = { title: document.title, desc: document.head.querySelector('meta[name="description"]')?.getAttribute('content'), og: document.head.querySelector('meta[property="og:title"]')?.getAttribute('content') };
    document.title = `${title} · ${PROJECT_NAME}`;
    meta('meta[property="og:title"]', 'property', 'og:title').setAttribute('content', `${title} · ${PROJECT_NAME}`);
    if (description) {
      meta('meta[name="description"]', 'name', 'description').setAttribute('content', description);
      meta('meta[property="og:description"]', 'property', 'og:description').setAttribute('content', description);
    }
    return () => {
      document.title = prev.title;
      if (prev.desc != null) document.head.querySelector('meta[name="description"]')?.setAttribute('content', prev.desc);
      if (prev.og != null) document.head.querySelector('meta[property="og:title"]')?.setAttribute('content', prev.og);
    };
  }, [title, description]);
}
