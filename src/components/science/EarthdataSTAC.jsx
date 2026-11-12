// Live NASA CMR-STAC metadata discovery. This is separate from the committed datasets used by the app's models.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Terminal, Database, Copy, Check, Search } from 'lucide-react';
import { useStore } from '../../store';
import { num } from '../../engine/dates';
import { Tags } from '../ui';
import { UPAZILAS } from '../../data/upazilas';

const COLLECTIONS = [
  {
    id: 'HLSL30_2.0',
    name: 'HLS Landsat (HLSL30_2.0)',
    endpoint: 'https://cmr.earthdata.nasa.gov/stac/LPCLOUD',
  },
  {
    id: 'MOD13Q1_061',
    name: 'Terra MODIS NDVI (MOD13Q1_061)',
    endpoint: 'https://cmr.earthdata.nasa.gov/stac/LPCLOUD',
  },
  {
    id: 'SPL4SMGP_008',
    name: 'NASA SMAP L4 Root Wetness (SPL4SMGP_008)',
    endpoint: 'https://cmr.earthdata.nasa.gov/stac/NSIDC_CPRD',
  },
];

export default function EarthdataSTAC() {
  const { s, T, L } = useStore();
  const [selectedUpz, setSelectedUpz] = useState('godagari');
  const [selectedColl, setSelectedColl] = useState(COLLECTIONS[0].id);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [queryError, setQueryError] = useState('');
  const activeRequest = useRef(null);
  useEffect(() => () => {
    activeRequest.current?.abort();
    activeRequest.current = null;
  }, []);

  const upz = UPAZILAS[selectedUpz] || UPAZILAS.godagari;
  const coll = COLLECTIONS.find((c) => c.id === selectedColl) || COLLECTIONS[0];

  // The upazila's own box (UPAZILAS bounds, [[south, west], [north, east]]) as a STAC bbox: west, south, east, north
  const [[south, west], [north, east]] = upz.bounds;
  const bbox = [west, south, east, north];

  const dateRange = useMemo(() => {
    const end = new Date();
    const start = new Date(end.getTime() - 90 * 864e5);
    return `${start.toISOString()}/${end.toISOString()}`;
  }, []);

  const queryBody = {
    collections: [coll.id], bbox, datetime: dateRange,
    sortby: [{ field: 'datetime', direction: 'desc' }], limit: 5,
  };
  const curlSnippet = `curl -X POST "${coll.endpoint}/search" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(queryBody, null, 2)}'`;

  const runQuery = async () => {
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    setLoading(true);
    setQueryError('');
    setResult(null);
    try {
      const response = await fetch(`${coll.endpoint}/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/geo+json, application/json' },
        body: JSON.stringify(queryBody),
        signal: controller.signal,
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.description || body?.errors?.join(', ') || `NASA CMR returned HTTP ${response.status}`);
      if (activeRequest.current === controller) setResult({ status: response.status, fetchedAt: new Date().toISOString(), body });
    } catch (error) {
      if (error?.name !== 'AbortError' && activeRequest.current === controller) {
        setQueryError(error?.message || T('কোয়েরি সম্পন্ন করা যায়নি।', 'The query could not be completed.'));
      }
    } finally {
      if (activeRequest.current === controller) {
        activeRequest.current = null;
        setLoading(false);
      }
    }
  };

  const resetQuery = () => {
    activeRequest.current?.abort();
    activeRequest.current = null;
    setLoading(false);
    setResult(null);
    setQueryError('');
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(curlSnippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section id="stac-console" className="mt-12 scroll-mt-28">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-clay-100 px-3 py-0.5 text-[12.5px] font-bold text-clay-700">
            <Terminal size={13} className="text-clay-700" />
            {T('নাসা CMR-STAC মেটাডাটা অনুসন্ধান', 'NASA CMR-STAC metadata search')}
          </span>
          <h2 className="mt-1 flex items-center gap-2 text-[24px] font-bold text-ink">
            <Database size={22} className="text-primary-700" />
            {T('উপগ্রহ ডেটা ক্যাটালগে লাইভ অনুসন্ধান', 'Live search of satellite data catalogues')}
          </h2>
        </div>
        <Tags list={['SAT', 'MODEL', 'RECORD']} />
      </div>

      <p className="mt-2 max-w-3xl text-[15px] leading-7 text-ink/75">
        {T(
          'উপজেলা ও ডেটাসেট বেছে নিয়ে NASA CMR-STAC-এ মেটাডাটার লাইভ অনুসন্ধান চালান। এই অনুসন্ধান কেবল ক্যাটালগে থাকা দৃশ্যমান পণ্যের তথ্য দেখায়; ডেটা ফাইল খুলতে NASA Earthdata Login লাগতে পারে। অ্যাপের হিসাব এই কোয়েরি থেকে লাইভ ডেটা নেয় না—ব্যবহৃত ডেটা ও সীমা তথ্য-রেজিস্টারে দেখুন।',
          'Choose an upazila and dataset to run a live metadata search in NASA CMR-STAC. This searches catalogue metadata only; downloading data assets may require NASA Earthdata Login. The app does not pull live values from this query; its data and limits are listed in the data register.'
        )}
      </p>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px]">
        <a href="https://github.com/nasa/cmr-stac/blob/master/docs/usage/usage.md" target="_blank" rel="noreferrer" className="font-semibold text-primary-800 underline decoration-primary-300 underline-offset-2 hover:text-primary-950">
          {T('NASA CMR-STAC ব্যবহারের নথি', 'NASA CMR-STAC usage documentation')}
        </a>
        <a href="https://cmr.earthdata.nasa.gov/stac" target="_blank" rel="noreferrer" className="font-semibold text-primary-800 underline decoration-primary-300 underline-offset-2 hover:text-primary-950">
          {T('NASA CMR-STAC ক্যাটালগ', 'NASA CMR-STAC catalog')}
        </a>
      </div>

      {/* Selectors Bar */}
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {/* Upazila Selector */}
        <div className="rounded-2xl border border-border bg-white p-3.5 shadow-xs">
          <label htmlFor="cmr-upazila" className="text-[12.5px] font-bold uppercase tracking-wider text-muted block mb-1.5">
            {T('লক্ষ্য উপজেলা ও ভৌগোলিক বাউন্ডারি (BBox)', 'Target Upazila & Geodetic BBox')}
          </label>
          <select
            id="cmr-upazila"
            value={selectedUpz}
            onChange={(e) => { resetQuery(); setSelectedUpz(e.target.value); }}
            className="w-full rounded-xl border border-border bg-canvas px-3 py-2 text-[14px] font-semibold text-ink focus:border-primary-500 focus:outline-none"
          >
            {Object.values(UPAZILAS).map((u) => {
              const lat = (u.bounds[0][0] + u.bounds[1][0]) / 2;
              const lon = (u.bounds[0][1] + u.bounds[1][1]) / 2;
              return (
                <option key={u.id} value={u.id}>
                  {L(u.name)} — {num(lat, s.lang, { dp: 2 })}°N, {num(lon, s.lang, { dp: 2 })}°E
                </option>
              );
            })}
          </select>
        </div>

        {/* Collection Selector */}
        <div className="rounded-2xl border border-border bg-white p-3.5 shadow-xs">
          <label htmlFor="cmr-collection" className="text-[12.5px] font-bold uppercase tracking-wider text-muted block mb-1.5">
            {T('নাসা CMR কালেকশন (Collection ID)', 'NASA CMR collection ID')}
          </label>
          <select
            id="cmr-collection"
            value={selectedColl}
            onChange={(e) => { resetQuery(); setSelectedColl(e.target.value); }}
            className="w-full rounded-xl border border-border bg-canvas px-3 py-2 text-[14px] font-semibold text-ink focus:border-primary-500 focus:outline-none"
          >
            {COLLECTIONS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={runQuery}
          disabled={loading}
          aria-busy={loading}
          className="inline-flex items-center gap-2 rounded-xl bg-primary-800 px-4 py-2.5 text-[14px] font-semibold text-white transition hover:bg-primary-900 disabled:cursor-wait disabled:opacity-60"
        >
          <Search size={16} />
          {loading ? T('খোঁজা হচ্ছে…', 'Searching NASA CMR…') : T('লাইভ অনুসন্ধান চালান', 'Run live search')}
        </button>
        <span className="text-[12.5px] text-muted">{T('নির্বাচিত উপজেলা · সাম্প্রতিক ৯০ দিন · সর্বোচ্চ ৫টি ফল', 'Selected upazila · most recent 90 days · up to 5 results')}</span>
      </div>
      {queryError && (
        <p role="alert" className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-[14px] text-rose-900">
          {T('NASA CMR অনুসন্ধান ব্যর্থ:', 'NASA CMR search failed:')} {queryError}
        </p>
      )}
      {result && (
        <p role="status" className="mt-3 rounded-xl border border-sky-200 bg-sky-50 px-3.5 py-2.5 text-[14px] text-sky-900">
          {result.body?.features?.length
            ? T(`NASA CMR থেকে ${num(result.body.features.length, 'bn')}টি ক্যাটালগ রেকর্ড এসেছে।`, `${result.body.features.length} catalogue record(s) returned by NASA CMR.`)
            : T('এই স্থান ও সময়সীমায় কোনো ক্যাটালগ রেকর্ড মেলেনি।', 'No catalogue records matched this place and time range.')}
        </p>
      )}

      {/* Code Console & JSON Terminal */}
      <div className="mt-4 overflow-hidden rounded-3xl border border-primary-900 bg-primary-950 text-primary-100 shadow-lg">
        {/* Console Header */}
        <div className="flex items-center justify-between border-b border-primary-900 bg-primary-950/90 px-4 py-3 text-[12.5px]">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-red-500/80 inline-block" />
            <span className="h-3 w-3 rounded-full bg-paddy-500/80 inline-block" />
            <span className="h-3 w-3 rounded-full bg-primary-500/80 inline-block" />
            <span className="ml-2 font-mono text-muted">POST {coll.endpoint}/search</span>
          </div>
          <button
            type="button"
            onClick={copyCode}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary-950 px-3 py-1 font-mono text-[12.5px] font-medium text-primary-100 hover:bg-primary-950 transition"
          >
            {copied ? <Check size={13} className="text-primary-400" /> : <Copy size={13} />}
            {copied ? T('কপি হয়েছে!', 'Copied!') : T('cURL কপি করুন', 'Copy cURL')}
          </button>
        </div>

        {/* Console Body */}
        <div className="p-4 sm:p-5 font-mono text-[12.5px] leading-6 overflow-x-auto max-h-[380px] custom-scrollbar">
          <div className="text-primary-400 font-semibold">// {T('১. সমতুল্য CMR-STAC অনুসন্ধান অনুরোধ:', '1. Equivalent CMR-STAC search request:')}</div>
          <pre className="text-primary-100 whitespace-pre-wrap">{curlSnippet}</pre>

          <div className="mt-4 text-sky-300 font-semibold">
            // {result
              ? T(`২. NASA CMR উত্তর · HTTP ${num(result.status, 'bn')} · ${num(result.body?.features?.length ?? 0, 'bn')}টি আইটেম · ${result.fetchedAt}`, `2. NASA CMR response · HTTP ${result.status} · ${result.body?.features?.length ?? 0} item(s) · ${result.fetchedAt}`)
              : T('২. অনুসন্ধান চালালে লাইভ উত্তর এখানে দেখাবে', '2. Live response appears here after you run the search')}
          </div>
          <pre className="text-muted whitespace-pre-wrap">
            {result
              ? JSON.stringify(result.body, null, 2)
              : queryError || T('এখনো কোনো অনুরোধ পাঠানো হয়নি।', 'No request has been sent yet.')}
          </pre>
        </div>
      </div>
    </section>
  );
}
