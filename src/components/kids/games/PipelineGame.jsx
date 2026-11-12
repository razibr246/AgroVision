import { useState } from 'react';
import { Droplets, RotateCcw, Star, Sparkles } from 'lucide-react';
import { useStore } from '../../../store';
import {
  PIPELINE_LEVELS,
  getPipeOpenings,
  rotatePipeGridCell,
  checkPipelineConnectivity,
} from '../../../engine/kidsEngine';
import { bnDigits, num } from '../../../engine/dates';

function cloneLevelGrid(grid) {
  return grid.map((row) => row.map((cell) => ({ ...cell })));
}

function PipeSvg({ type, rotation, activeWater }) {
  const openings = getPipeOpenings(type, rotation); // [N, E, S, W]
  const stroke = activeWater ? '#0284c7' : '#64748b';

  if (type === 'blocked') {
    return (
      <div className="flex h-full w-full items-center justify-center text-2xl">
        🪨
      </div>
    );
  }

  return (
    <svg viewBox="0 0 64 64" className="h-full w-full">
      {/* Pipe arms */}
      {openings[0] && <line x1="32" y1="32" x2="32" y2="0" stroke={stroke} strokeWidth="14" strokeLinecap="butt" />}
      {openings[1] && <line x1="32" y1="32" x2="64" y2="32" stroke={stroke} strokeWidth="14" strokeLinecap="butt" />}
      {openings[2] && <line x1="32" y1="32" x2="32" y2="64" stroke={stroke} strokeWidth="14" strokeLinecap="butt" />}
      {openings[3] && <line x1="32" y1="32" x2="0" y2="32" stroke={stroke} strokeWidth="14" strokeLinecap="butt" />}
      <circle cx="32" cy="32" r="9" fill={stroke} />
      {type === 'source' && <text x="32" y="38" textAnchor="middle" fontSize="18">🌊</text>}
      {type === 'target' && <text x="32" y="38" textAnchor="middle" fontSize="18">🌾</text>}
    </svg>
  );
}

export default function PipelineGame({ onRecordActivity, fx }) {
  const { s, T, L } = useStore();
  const [levelIdx, setLevelIdx] = useState(0);
  const currentLevel = PIPELINE_LEVELS[levelIdx] || PIPELINE_LEVELS[0];
  const [grid, setGrid] = useState(() => cloneLevelGrid(currentLevel.grid));
  const [moves, setMoves] = useState(0);
  const [solvedIds, setSolvedIds] = useState([]);

  const connectivity = checkPipelineConnectivity({
    grid,
    moves,
    par: currentLevel.par,
  });
  const reachedSet = new Set(connectivity.reachedCells || []);

  const selectLevel = (idx) => {
    fx?.('pop');
    const lvl = PIPELINE_LEVELS[idx] || PIPELINE_LEVELS[0];
    setLevelIdx(idx);
    setGrid(cloneLevelGrid(lvl.grid));
    setMoves(0);
  };

  const tapCell = (r, c) => {
    const cell = grid[r][c];
    if (cell.locked || cell.type === 'source' || cell.type === 'target' || cell.type === 'blocked') {
      return;
    }
    fx?.('splash');
    const nextGrid = rotatePipeGridCell(grid, r, c);
    const nextMoves = moves + 1;
    setGrid(nextGrid);
    setMoves(nextMoves);

    const check = checkPipelineConnectivity({
      grid: nextGrid,
      moves: nextMoves,
      par: currentLevel.par,
    });
    if (check.isConnected && !solvedIds.includes(currentLevel.id)) {
      fx?.('cheer');
      setSolvedIds((prev) => [...prev, currentLevel.id]);
      onRecordActivity?.({
        xpDelta: 55,
        miniGamePatch: { pipelinesSolved: 1 },
        flags: { completedFloodMission: true },
      });
    }
  };

  return (
    <div className="space-y-4" data-testid="kids-game-pipeline">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-3xl border border-sky-200 bg-gradient-to-br from-sky-50 to-cyan-50 p-4">
        <div>
          <h3 className="text-lg font-extrabold text-slate-900">
            {T('সেচের পাইপলাইন ধাঁধা (AWD জল-পথ)', 'Water Pipeline Puzzle (AWD Flow)')}
          </h3>
          <p className="text-xs text-slate-600">
            {T(
              'প্রতিটি পাইপ ঘুরিয়ে (ট্যাপ করে) খাল (🌊) থেকে ফসলের ক্ষেতে (🌾) পানি পৌঁছে দাও!',
              'Tap pipes to rotate and build a continuous path from canal (🌊) to paddy field (🌾)!'
            )}
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-extrabold tabular">
          <span className="rounded-2xl bg-white px-3 py-1.5 text-sky-900 shadow-xs">
            {T(`চাল: ${bnDigits(moves)} / লক্ষ্য ${bnDigits(currentLevel.par)}`, `Moves: ${moves} / Par ${currentLevel.par}`)}
          </span>
          <button
            type="button"
            onClick={() => selectLevel(levelIdx)}
            className="inline-flex min-h-10 items-center gap-1 rounded-2xl bg-white px-3 py-1.5 text-slate-700 shadow-xs hover:bg-slate-50"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>{T('আবার', 'Reset')}</span>
          </button>
        </div>
      </div>

      {/* Level Selector Tabs */}
      <div className="flex flex-wrap gap-2">
        {PIPELINE_LEVELS.map((lvl, idx) => (
          <button
            key={lvl.id}
            type="button"
            onClick={() => selectLevel(idx)}
            className={`min-h-12 rounded-2xl border px-3.5 py-2 text-xs font-extrabold transition ${
              idx === levelIdx
                ? 'border-sky-600 bg-sky-600 text-white shadow-xs'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-sky-50'
            }`}
          >
            {L(lvl.title)}
          </button>
        ))}
      </div>

      {/* Grid Canvas */}
      <div className="flex flex-col items-center rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div
          className="grid gap-2 rounded-2xl bg-emerald-50 p-3"
          style={{
            gridTemplateColumns: `repeat(${grid[0].length}, minmax(60px, 78px))`,
          }}
        >
          {grid.map((row, r) =>
            row.map((cell, c) => {
              const key = `${r},${c}`;
              const hasWater = reachedSet.has(key);
              const isLocked = cell.locked || cell.type === 'blocked';
              return (
                <button
                  key={key}
                  type="button"
                  data-testid={`pipe-cell-${r}-${c}`}
                  onClick={() => tapCell(r, c)}
                  disabled={isLocked}
                  aria-label={`Row ${r + 1} Col ${c + 1} ${cell.type}`}
                  className={`aspect-square min-h-14 w-full rounded-xl border-2 p-1 transition active:scale-95 ${
                    hasWater
                      ? 'border-sky-400 bg-sky-100/90 shadow-xs'
                      : isLocked
                        ? 'border-slate-200 bg-slate-100'
                        : 'border-amber-200 bg-white hover:border-sky-400'
                  }`}
                >
                  <PipeSvg type={cell.type} rotation={cell.rotation} activeWater={hasWater} />
                </button>
              );
            })
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-xs font-bold">
          <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-3 py-1 text-sky-900 tabular">
            <Droplets className="h-4 w-4 text-sky-600" />
            {T(`পানি পৌঁছেছে: ${num(connectivity.flowPercent, s.lang)}%`, `Flow Reach: ${connectivity.flowPercent}%`)}
          </span>
        </div>

        {connectivity.isConnected && (
          <div className="mt-4 w-full max-w-md space-y-2 rounded-2xl border-2 border-emerald-400 bg-emerald-50 p-4 text-center">
            <div className="flex items-center justify-center gap-1">
              {[1, 2, 3].map((st) => (
                <Star
                  key={st}
                  className={`h-6 w-6 ${st <= connectivity.stars ? 'fill-amber-400 text-amber-500' : 'text-slate-300'}`}
                />
              ))}
            </div>
            <p className="text-sm font-extrabold text-emerald-950">
              <Sparkles className="mr-1 inline h-4 w-4 text-emerald-600" />
              {T('দারুণ! ক্ষেতে সেচের পানি পৌঁছে গেছে! +৫৫ XP', 'Connected! Water reached the rice field! +55 XP')}
            </p>
            {levelIdx + 1 < PIPELINE_LEVELS.length && (
              <button
                type="button"
                onClick={() => selectLevel(levelIdx + 1)}
                className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-emerald-600 px-5 text-sm font-extrabold text-white hover:bg-emerald-700"
              >
                {T('পরবর্তী ধাপ খেলো', 'Next Pipeline Level')}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
