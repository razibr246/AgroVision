import { useState } from 'react';
import { Store, TrendingUp, TrendingDown, Coins, Sparkles, RefreshCw } from 'lucide-react';
import { useStore } from '../../../store';
import { MARKET_ITEMS, simulateMarketTrade } from '../../../engine/kidsEngine';
import { bnDigits, num } from '../../../engine/dates';

function buildBuyerOffer(item, roundNum) {
  const demandMaunds = (roundNum % 3) + 1; // 1, 2, or 3 maunds
  const demandKg = demandMaunds * 40;
  // Alternate between fair/generous buyers and lowball hagglers
  const isFair = roundNum % 2 === 0;
  const offerTk = isFair
    ? item.fairPriceKg + (roundNum % 4)
    : Math.max(8, item.costKg - (3 + (roundNum % 3)));
  const buyersBn = ['রহিম ব্যাপারী', 'সখিনা আপা (সমবায়)', 'হাটের পাইকার', 'শহরের ক্রেতা'];
  const buyersEn = ['Rahim Trader', 'Sakhina Co-op', 'Haat Wholesaler', 'City Buyer'];
  const idx = roundNum % buyersBn.length;
  return {
    buyer: { bn: buyersBn[idx], en: buyersEn[idx] },
    demandMaunds,
    demandKg,
    offeredPriceTk: offerTk,
    isFairHint: isFair,
  };
}

export default function MarketGame({ onRecordActivity, fx }) {
  const { s, T, L } = useStore();
  const [selectedItemId, setSelectedItemId] = useState(MARKET_ITEMS[0].id);
  const [roundNum, setRoundNum] = useState(0);
  const [sessionProfit, setSessionProfit] = useState(0);
  const [dealsCount, setDealsCount] = useState(0);
  const [resultCard, setResultCard] = useState(null);

  const item = MARKET_ITEMS.find((x) => x.id === selectedItemId) || MARKET_ITEMS[0];
  const offer = buildBuyerOffer(item, roundNum);
  const preview = simulateMarketTrade({
    demandKg: offer.demandKg,
    offeredPriceTk: offer.offeredPriceTk,
    costKg: item.costKg,
  });

  const handleDecision = (decision) => {
    if (decision === 'sell') {
      if (preview.isProfitable) {
        fx?.('cheer');
        const nextProfit = sessionProfit + preview.profit;
        setSessionProfit(nextProfit);
        setDealsCount((d) => d + 1);
        onRecordActivity?.({
          xpDelta: 25,
          miniGamePatch: {
            marketTrades: 1,
            marketBestProfit: preview.profit,
          },
          flags: { marketProfit: preview.profit },
        });
        setResultCard({
          good: true,
          title: T('চমৎকার লাভজনক বিক্রি!', 'Smart Profitable Sale!'),
          text: L(preview.summary),
          xp: 25,
        });
      } else {
        fx?.('sad');
        setResultCard({
          good: false,
          title: T('আরে! লোকসানে বিক্রি হয়ে যেত!', 'Careful! That Deal Lost Money!'),
          text: `${L(preview.summary)} ${T(
            `ন্যায্য দাম প্রায় ৳${bnDigits(item.fairPriceKg)}/কেজি।`,
            `Fair market price is around Tk ${item.fairPriceKg}/kg.`
          )}`,
          xp: 5,
        });
        onRecordActivity?.({ xpDelta: 5 });
      }
    } else {
      // Wait / Negotiate
      if (!preview.isProfitable) {
        fx?.('ting');
        onRecordActivity?.({ xpDelta: 15 });
        setResultCard({
          good: true,
          title: T('বুদ্ধিমানের কাজ! সস্তা দাম ফিরিয়ে দিয়েছ!', 'Smart Move! Rejected Unfair Price!'),
          text: T(
            `উৎপাদন খরচ ছিল ৳${bnDigits(item.costKg)}/কেজি—ক্রেতা দিয়েছিল মাত্র ৳${bnDigits(offer.offeredPriceTk)}/কেজি! অপেক্ষা করায় ক্ষতি বাঁচল।`,
            `Production cost was Tk ${item.costKg}/kg while offer was only Tk ${offer.offeredPriceTk}/kg. Waiting saved you from a loss!`
          ),
          xp: 15,
        });
      } else {
        fx?.('pop');
        setResultCard({
          good: false,
          title: T('আহা! ভালো লাভের ক্রেতা চলে গেল!', 'Missed a Fair Offer!'),
          text: T(
            `এই ক্রেতা প্রতি কেজিতে ৳${bnDigits(offer.offeredPriceTk)} দিতে রাজি ছিল (খরচ ৳${bnDigits(item.costKg)})। পরের ক্রেতাকে দেখো!`,
            `This buyer offered Tk ${offer.offeredPriceTk}/kg above your Tk ${item.costKg} cost! Watch the next buyer closely.`
          ),
          xp: 0,
        });
      }
    }
  };

  const nextCustomer = () => {
    setResultCard(null);
    setRoundNum((r) => r + 1);
  };

  return (
    <div className="space-y-4" data-testid="kids-game-market">
      {/* Educational banner + Session Ledger */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-violet-200 bg-gradient-to-br from-violet-50 to-amber-50 p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-2xl shadow-xs">
            <Store className="h-6 w-6 text-violet-600" />
          </span>
          <div>
            <h3 className="text-lg font-extrabold text-slate-900">
              {T('তারার ফার্মার্স মার্কেট (হাট)', 'Tara’s Farmer’s Market (Haat)')}
            </h3>
            <p className="text-xs text-slate-600">
              {T(
                '১ মন = ৪০ কেজি। খরচ আর বিক্রির দাম মিলিয়ে লাভ হলেই বিক্রি করো!',
                '1 Maund = 40 kg. Compare revenue vs production cost before sealing the deal!'
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="rounded-2xl bg-white px-3.5 py-2 text-xs font-extrabold text-emerald-700 shadow-xs tabular">
            <Coins className="mr-1 inline h-4 w-4 text-amber-500" />
            {T(`আজকের লাভ: ৳${bnDigits(sessionProfit)}`, `Session Profit: Tk ${sessionProfit}`)}
          </div>
          <div className="rounded-2xl bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-xs tabular">
            {T(`বিক্রি: ${bnDigits(dealsCount)}`, `Deals: ${dealsCount}`)}
          </div>
        </div>
      </div>

      {/* Crop Stall Selector */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {MARKET_ITEMS.map((it) => {
          const active = it.id === item.id;
          return (
            <button
              key={it.id}
              type="button"
              onClick={() => {
                setSelectedItemId(it.id);
                setResultCard(null);
              }}
              className={`min-h-12 rounded-2xl border-2 p-3 text-left transition active:scale-95 ${
                active
                  ? 'border-violet-600 bg-violet-50 shadow-xs'
                  : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-2xl">{it.icon}</span>
                <span className="text-xs font-extrabold text-slate-900 sm:text-sm">{L(it.name)}</span>
              </div>
              <p className="mt-1 text-[11px] font-semibold text-slate-600 tabular">
                {T(`খরচ: ৳${bnDigits(it.costKg)}/কেজি`, `Cost: Tk ${it.costKg}/kg`)}
              </p>
            </button>
          );
        })}
      </div>

      {/* Buyer Offer & Trade Calculator Card */}
      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <span className="text-xs font-bold uppercase tracking-wide text-violet-700">
              {T('ক্রেতার প্রস্তাব', 'Customer Offer')}
            </span>
            <h4 className="text-base font-extrabold text-slate-900">
              🧑🏽‍🌾 {L(offer.buyer)}
            </h4>
          </div>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-extrabold text-amber-900 tabular">
            {T(
              `${bnDigits(offer.demandMaunds)} মন (${bnDigits(offer.demandKg)} কেজি) চাই`,
              `Wants ${offer.demandMaunds} Maund (${offer.demandKg} kg)`
            )}
          </span>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-slate-50 p-3">
            <div className="text-xs font-semibold text-slate-500">{T('তোমার উৎপাদন খরচ', 'Your Farm Cost')}</div>
            <div className="mt-1 text-lg font-extrabold text-slate-900 tabular">
              ৳{s.lang === 'bn' ? bnDigits(preview.cost) : preview.cost}
            </div>
            <div className="text-[11px] text-slate-500 tabular">
              ({num(item.costKg, s.lang)} × {num(offer.demandKg, s.lang)} kg)
            </div>
          </div>

          <div className="rounded-2xl bg-sky-50 p-3">
            <div className="text-xs font-semibold text-sky-700">{T('ক্রেতার প্রস্তাবিত আয়', 'Offered Revenue')}</div>
            <div className="mt-1 text-lg font-extrabold text-sky-900 tabular">
              ৳{s.lang === 'bn' ? bnDigits(preview.revenue) : preview.revenue}
            </div>
            <div className="text-[11px] text-sky-700 tabular">
              ({num(offer.offeredPriceTk, s.lang)} × {num(offer.demandKg, s.lang)} kg)
            </div>
          </div>

          <div className="rounded-2xl bg-amber-50 p-3">
            <div className="text-xs font-semibold text-amber-800">{T('বাজারের ন্যায্য দাম', 'Fair Benchmark Price')}</div>
            <div className="mt-1 text-lg font-extrabold text-amber-900 tabular">
              ৳{s.lang === 'bn' ? bnDigits(item.fairPriceKg) : item.fairPriceKg}/{T('কেজি', 'kg')}
            </div>
            <div className="text-[11px] text-amber-700">
              {T('লাভ = আয় − খরচ', 'Profit = Revenue − Cost')}
            </div>
          </div>
        </div>

        {!resultCard ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              data-testid="market-sell-btn"
              onClick={() => handleDecision('sell')}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 text-sm font-extrabold text-white shadow-sm hover:bg-emerald-700 active:scale-95"
            >
              <TrendingUp className="h-4 w-4" />
              <span>{T('এই দামে বিক্রি করো!', 'Accept & Sell!')}</span>
            </button>
            <button
              type="button"
              data-testid="market-reject-btn"
              onClick={() => handleDecision('reject')}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border-2 border-amber-500 bg-white px-4 text-sm font-extrabold text-amber-900 hover:bg-amber-50 active:scale-95"
            >
              <TrendingDown className="h-4 w-4" />
              <span>{T('না, ন্যায্য দামের অপেক্ষা করো', 'Decline & Wait')}</span>
            </button>
          </div>
        ) : (
          <div
            className={`mt-4 space-y-3 rounded-2xl border p-4 ${
              resultCard.good ? 'border-emerald-300 bg-emerald-50' : 'border-rose-200 bg-rose-50'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h5 className="font-extrabold text-slate-900">{resultCard.title}</h5>
              {resultCard.xp > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-extrabold text-emerald-700">
                  <Sparkles className="h-3.5 w-3.5" />+{num(resultCard.xp, s.lang)} XP
                </span>
              )}
            </div>
            <p className="text-xs leading-relaxed text-slate-700 sm:text-sm">{resultCard.text}</p>
            <button
              type="button"
              onClick={nextCustomer}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 text-sm font-extrabold text-white hover:bg-slate-800"
            >
              <RefreshCw className="h-4 w-4" />
              <span>{T('পরবর্তী ক্রেতা ডাকো', 'Next Buyer')}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
