#!/usr/bin/env node
// Search NASA's Open Data Portal (https://data.nasa.gov/), the catalogue of NASA datasets, for a topic, and print
// each match with where its data is actually hosted. data.nasa.gov holds descriptions and links, not the data itself;
// use it to find the right dataset, then write a fetch script for the host it points to (and add it to
// docs/DATA_SOURCES.md).
//
//   npm run find:nasa -- soil moisture
//   npm run find:nasa -- "land surface temperature" --rows 20
//   npm run find:nasa -- rainfall --json        # machine-readable, for agents and scripts
//
// API: CKAN action API, https://data.nasa.gov/api/3/action/package_search (no key needed). It can be slow.

const API = 'https://data.nasa.gov/api/3/action/package_search';

export async function searchNasa(q, { rows = 10, timeoutMs = 90_000 } = {}) {
  const url = `${API}?${new URLSearchParams({ q, rows: String(rows) })}`;
  const r = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
  if (!r.ok) throw new Error(`data.nasa.gov answered ${r.status}`);
  const j = await r.json();
  if (!j.success) throw new Error('data.nasa.gov search failed');
  return {
    url,
    count: j.result.count,
    results: j.result.results.map((d) => ({
      title: d.title,
      page: `https://data.nasa.gov/dataset/${d.name}`,
      publisher: d.organization?.title ?? null,
      modified: d.metadata_modified?.slice(0, 10) ?? null,
      notes: (d.notes ?? '').replace(/\s+/g, ' ').slice(0, 240),
      links: (d.resources ?? []).map((x) => ({ name: x.name || x.format || 'link', format: x.format || null, url: x.url })).filter((x) => x.url),
    })),
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const json = args.includes('--json');
  const ri = args.indexOf('--rows');
  const rows = ri > -1 ? Number(args[ri + 1]) : 10;
  const q = args.filter((a, i) => !a.startsWith('--') && !(ri > -1 && i === ri + 1)).join(' ').trim();
  if (!q) { console.error('Usage: npm run find:nasa -- <words> [--rows N] [--json]'); process.exit(2); }
  try {
    const res = await searchNasa(q, { rows });
    if (json) { console.log(JSON.stringify(res, null, 2)); process.exit(0); }
    console.log(`${res.count} datasets on data.nasa.gov for "${q}" (showing ${res.results.length})\n`);
    for (const d of res.results) {
      console.log(`• ${d.title}${d.publisher ? `  [${d.publisher}]` : ''}${d.modified ? `  updated ${d.modified}` : ''}`);
      console.log(`  ${d.page}`);
      if (d.notes) console.log(`  ${d.notes}`);
      for (const l of d.links.slice(0, 4)) console.log(`  → ${l.name}${l.format ? ` (${l.format})` : ''}: ${l.url}`);
      console.log('');
    }
  } catch (e) {
    console.error(`Could not search data.nasa.gov: ${e.message}`);
    process.exit(1);
  }
}
