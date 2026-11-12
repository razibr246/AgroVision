// Science Page Mission Control Telemetry Header HUD.
// Displays live simulated satellite link status, orbital telemetry clock,
// target upazila coordinates, and instant navigation chips for NASA judges.
import { useState, useEffect } from 'react';
import {
  Satellite,
  Radio,
  Clock,
  Compass,
  Zap,
  Activity,
  Layers,
  Sparkles,
  ChevronDown
} from 'lucide-react';
import { useStore } from '../../store';
import { Badge } from '../ui';
import { bnDigits } from '../../engine/dates';

export default function ScienceMissionHUD() {
  const { s, T, L, upazila } = useStore();
  const lang = s.lang;

  const [utcTime, setUtcTime] = useState('');
  const [bstTime, setBstTime] = useState('');

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const utcString = now.toUTCString().split(' ')[4] + ' UTC';
      const bstHours = (now.getUTCHours() + 6) % 24;
      const bstMinutes = String(now.getUTCMinutes()).padStart(2, '0');
      const bstSeconds = String(now.getUTCSeconds()).padStart(2, '0');
      const bstString = `${String(bstHours).padStart(2, '0')}:${bstMinutes}:${bstSeconds} BST`;

      setUtcTime(utcString);
      setBstTime(lang === 'bn' ? bnDigits(bstString) : bstString);
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, [lang]);

  return (
    <div className="mt-6 rounded-2xl border border-sky-300/30 bg-gradient-to-r from-primary-950 via-primary-950 to-primary-950 p-3.5 sm:p-4 text-white shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Constellation Live Link Status */}
        <div className="flex items-center gap-3">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-primary-500" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[14px] font-bold tracking-wide text-white font-mono">
                NASA EO MISSION CONTROL
              </span>
              <span className="rounded bg-sky-500/20 px-1.5 py-0.5 text-[11px] font-mono text-sky-300 border border-sky-300/30">
                7 MISSIONS IN THE DATA
              </span>
            </div>
            <div className="text-[12.5px] font-mono text-muted">
              GPM · SMAP · GRACE-FO · MODIS · LANDSAT 8/9 · SENTINEL-1/2 · ECOSTRESS
            </div>
          </div>
        </div>

        {/* Live Clocks & Target Upazila */}
        <div className="flex flex-wrap items-center gap-2 text-[12.5px] font-mono">
          <div className="rounded-xl border border-white/10 bg-white/5 px-2.5 py-1 text-primary-100">
            <span className="text-muted mr-1.5">{T('ঘড়ি:', 'TIME:')}</span>
            <span className="text-primary-400 font-bold">{bstTime || '06:00:00 BST'}</span>
            <span className="text-muted ml-1.5">({utcTime || '00:00:00 UTC'})</span>
          </div>

          <div className="rounded-xl border border-sky-300/20 bg-sky-500/10 px-2.5 py-1 text-sky-200">
            <span className="text-sky-300 mr-1.5">TARGET:</span>
            <span className="font-bold text-white">
              {upazila ? upazila.name.en.toUpperCase() : 'DHAMRAI, DHAKA'}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Jump Telemetry Strip */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-white/10 pt-2.5 text-[12.5px]">
        <span className="text-muted mr-1 font-mono text-[11px]">{T('সরাসরি ল্যাব:', 'JUMP TO LAB:')}</span>
        <a
          href="#constellation"
          className="rounded-lg bg-white/10 px-2.5 py-1 text-sky-300 hover:bg-sky-500/20 hover:text-white transition flex items-center gap-1"
        >
          <Satellite size={13} />
          {T('কক্ষপথ সিমুলেটর', 'Orbital Sim')}
        </a>
        <a
          href="#spectral"
          className="rounded-lg bg-white/10 px-2.5 py-1 text-primary-300 hover:bg-primary-500/20 hover:text-white transition flex items-center gap-1"
        >
          <Sparkles size={13} />
          {T('বর্ণালী ও NDVI ল্যাব', 'Spectral Lab')}
        </a>
        <a
          href="#multiscale"
          className="rounded-lg bg-white/10 px-2.5 py-1 text-paddy-300 hover:bg-paddy-500/20 hover:text-white transition flex items-center gap-1"
        >
          <Layers size={13} />
          {T('স্থানিক রেজোলিউশন (৫০কিমি → ১০মি)', 'Resolution (50km→10m)')}
        </a>
        <a
          href="#geochemistry"
          className="rounded-lg bg-white/10 px-2.5 py-1 text-sky-300 hover:bg-sky-500/20 hover:text-white transition flex items-center gap-1"
        >
          <Activity size={13} />
          {T('মৃত্তিকা রসায়ন ও কার্বন', 'Soil Carbon')}
        </a>
        <a
          href="#ml"
          className="rounded-lg bg-white/10 px-2.5 py-1 text-clay-300 hover:bg-clay-500/20 hover:text-white transition flex items-center gap-1"
        >
          <Zap size={13} />
          {T('মেশিন লার্নিং (AUC)', 'Stress ML')}
        </a>
      </div>
    </div>
  );
}
