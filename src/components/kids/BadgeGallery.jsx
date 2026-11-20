import { useEffect, useRef } from 'react';
import { Award, Download, Lock, CheckCircle2 } from 'lucide-react';
import { useStore } from '../../store';
import { KIDS_BADGES } from '../../data/kidsData';
import { calculateLevelFromXp } from '../../engine/kidsEngine';
import { CHILDREN } from '../../game/dream';
import { bnDigits } from '../../engine/dates';

export default function BadgeGallery({ profile }) {
  const { s, T, L } = useStore();
  const canvasRef = useRef(null);
  const owned = new Set(profile.badges || []);
  const badgeList = Object.values(KIDS_BADGES);
  const lvlInfo = calculateLevelFromXp(profile.xp);
  const learnerName =
    profile.learnerName?.trim() ||
    L(CHILDREN[profile.avatarId]?.name) ||
    T('তারার খামার চ্যাম্পিয়ন', 'Tara’s Farm Champion');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Background cream parchment
    ctx.fillStyle = '#fefce8';
    ctx.fillRect(0, 0, w, h);

    // Decorative green & gold borders
    ctx.strokeStyle = '#059669';
    ctx.lineWidth = 14;
    ctx.strokeRect(24, 24, w - 48, h - 48);

    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 4;
    ctx.strokeRect(44, 44, w - 88, h - 88);

    // Top banner
    ctx.fillStyle = '#065f46';
    ctx.font = 'bold 34px "Inter Variable", "Kohinoor Bangla", "Noto Sans Bengali Variable", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      s.lang === 'bn' ? 'AgroVision শিশু বিভাগ — তারা আর স্বপ্নের মাঠ' : 'AgroVision Kids — Tara and the Dream Fields',
      w / 2,
      118
    );

    ctx.fillStyle = '#b45309';
    ctx.font = 'bold 26px "Inter Variable", "Kohinoor Bangla", "Noto Sans Bengali Variable", system-ui, sans-serif';
    ctx.fillText(
      s.lang === 'bn' ? 'অর্জন ও কৃষিবিজ্ঞান সনদপত্র' : 'CERTIFICATE OF YOUNG AGRONOMIST',
      w / 2,
      166
    );

    // Learner Name
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 50px "Inter Variable", "Kohinoor Bangla", "Noto Sans Bengali Variable", system-ui, sans-serif';
    ctx.fillText(learnerName, w / 2, 265);

    // Divider
    ctx.strokeStyle = '#d1fae5';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(220, 290);
    ctx.lineTo(w - 220, 290);
    ctx.stroke();

    // Stats line
    ctx.fillStyle = '#334155';
    ctx.font = '600 24px "Inter Variable", "Kohinoor Bangla", "Noto Sans Bengali Variable", system-ui, sans-serif';
    const statLine =
      s.lang === 'bn'
        ? `স্তর ${bnDigits(lvlInfo.level)} (${lvlInfo.title.bn})  •  মোট XP: ${bnDigits(profile.xp)}  •  ব্যাজ: ${bnDigits(owned.size)}/${bnDigits(badgeList.length)}`
        : `Level ${lvlInfo.level} (${lvlInfo.title.en})  •  Total XP: ${profile.xp}  •  Badges: ${owned.size}/${badgeList.length}`;
    ctx.fillText(statLine, w / 2, 345);

    // Earned badges icons row
    const earnedBadges = badgeList.filter((b) => owned.has(b.id));
    ctx.font = '38px system-ui, sans-serif';
    if (earnedBadges.length > 0) {
      const iconsStr = earnedBadges.map((b) => b.icon).join('   ');
      ctx.fillText(iconsStr, w / 2, 425);
    } else {
      ctx.fillStyle = '#64748b';
      ctx.font = 'italic 20px "Inter Variable", "Kohinoor Bangla", "Noto Sans Bengali Variable", system-ui, sans-serif';
      ctx.fillText(
        s.lang === 'bn' ? 'মিশন ও সায়েন্স ল্যাব খেলে ব্যাজ সংগ্রহ করো!' : 'Play Missions & Science Labs to collect badges!',
        w / 2,
        425
      );
    }

    // Footer signatures
    ctx.fillStyle = '#047857';
    ctx.font = 'bold 20px "Inter Variable", "Kohinoor Bangla", "Noto Sans Bengali Variable", system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(
      s.lang === 'bn' ? '🛰️ তারা উপগ্রহ ও AgroVision' : '🛰️ Tara Satellite & AgroVision',
      96,
      h - 88
    );

    ctx.textAlign = 'right';
    const formattedDate = new Date().toLocaleDateString(s.lang === 'bn' ? 'bn-BD' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    ctx.fillText(s.lang === 'bn' ? bnDigits(formattedDate) : formattedDate, w - 96, h - 88);
  }, [profile.xp, profile.badges, profile.learnerName, profile.avatarId, s.lang, learnerName, lvlInfo.level, lvlInfo.title.bn, lvlInfo.title.en, owned.size, badgeList.length]);

  const downloadCertificate = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `agrovision-kids-certificate-${Date.now()}.png`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 sm:text-xl">
            {T('অর্জিত ব্যাজ ও সনদপত্র', 'Badges & Young Agronomist Certificate')}
          </h2>
          <p className="text-xs text-slate-600 sm:text-sm">
            {T(
              `তুমি এখন পর্যন্ত ${bnDigits(owned.size)} / ${bnDigits(badgeList.length)}টি ব্যাজ জিতেছ!`,
              `You have unlocked ${owned.size} of ${badgeList.length} achievement badges!`
            )}
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3.5 py-1.5 text-sm font-extrabold text-amber-900 tabular">
          <Award className="h-4 w-4" />
          {s.lang === 'bn' ? `${bnDigits(owned.size)}/${bnDigits(badgeList.length)}` : `${owned.size}/${badgeList.length}`}
        </span>
      </div>

      {/* 12 Badges Grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {badgeList.map((b) => {
          const unlocked = owned.has(b.id);
          return (
            <div
              key={b.id}
              data-testid={`kids-badge-${b.id}`}
              className={`rounded-3xl border p-4 transition ${
                unlocked
                  ? 'border-amber-300 bg-gradient-to-br from-amber-50 to-white shadow-sm'
                  : 'border-slate-200 bg-slate-50/80 opacity-80'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl ${
                    unlocked ? 'bg-amber-100 shadow-xs' : 'bg-slate-200 grayscale'
                  }`}
                >
                  {b.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-extrabold text-slate-900">
                      {L(b.title)}
                    </h3>
                    {unlocked ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                    ) : (
                      <Lock className="h-4 w-4 shrink-0 text-slate-400" />
                    )}
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-slate-700">
                    {unlocked ? L(b.desc) : L(b.criteria)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Certificate Preview & PNG Download */}
      <div className="rounded-3xl border border-emerald-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base font-extrabold text-slate-900">
            {T('তোমার প্রিন্টযোগ্য সনদপত্র', 'Your Printable AgroVision Certificate')}
          </h3>
          <button
            type="button"
            onClick={downloadCertificate}
            className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-emerald-600 px-5 text-sm font-extrabold text-white shadow-sm hover:bg-emerald-700 active:scale-95"
          >
            <Download className="h-4 w-4" />
            <span>{T('PNG সনদ ডাউনলোড করো', 'Download PNG Certificate')}</span>
          </button>
        </div>
        <canvas
          ref={canvasRef}
          width={1000}
          height={580}
          className="w-full rounded-2xl border border-slate-200 bg-amber-50"
        />
      </div>
    </div>
  );
}
